/**
 * Hybrid audio manager: Web Audio API for SFX, HTML5 Audio for music.
 *
 * Web Audio gives us sample-accurate looping (no MP3 gap), low latency,
 * and proper mixing. HTML5 Audio streams music efficiently.
 *
 * iOS Safari quirk: the media session stays locked until an original
 * (non-cloned) HTMLAudioElement.play() fires in a user-gesture call stack.
 * Call primeIOSAudio() on the first user tap to unlock both HTML5 Audio
 * and Web Audio for the rest of the page session.
 */

export interface SoundInstance {
    stop(): void;
    isPlaying(): boolean;
    setVolume(vol: number): void;
}

export class AudioManager {
    // Web Audio for SFX
    private ctx: AudioContext | null = null;
    private sfxBuffers: Map<string, AudioBuffer> = new Map();
    private sfxGain!: GainNode;

    // HTML5 Audio for music (streaming)
    private musicElements: Map<string, HTMLAudioElement> = new Map();

    private activeSounds: SoundInstance[] = [];
    private musicVolume = 0.5;
    private sfxVolume = 0.7;
    private iosPrimed = false;

    private ensureContext(): AudioContext {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.ctx.destination);
        }
        return this.ctx;
    }

    /**
     * Unlock the iOS media session by briefly playing a real preloaded
     * music element. Also resumes the AudioContext. Must be called
     * synchronously from a user gesture (touch/click).
     */
    primeIOSAudio(): void {
        if (this.iosPrimed) return;
        this.iosPrimed = true;

        // Always resume AudioContext on first gesture (needed for all browsers)
        const ctx = this.ensureContext();
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }

        // iOS-specific: play a real HTML5 Audio music element to unlock media session
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        if (!isIOS) return;

        const music = this.musicElements.values().next().value as HTMLAudioElement | undefined;
        if (!music) {
            console.warn('[Audio] primeIOSAudio: no music loaded yet');
            this.iosPrimed = false;
            return;
        }

        const savedVolume = music.volume;
        const savedTime = music.currentTime;
        const savedLoop = music.loop;

        music.volume = 0.001;
        music.loop = false;

        music.play().then(() => {
            setTimeout(() => {
                music.pause();
                music.currentTime = savedTime;
                music.volume = savedVolume;
                music.loop = savedLoop;
                console.log('[Audio] iOS media session primed');
            }, 50);
        }).catch(e => {
            console.warn('[Audio] iOS prime failed:', e);
            music.volume = savedVolume;
            music.loop = savedLoop;
            this.iosPrimed = false;
        });
    }

    /** Load a sound effect into a Web Audio buffer. */
    async loadSound(id: string, url: string): Promise<void> {
        try {
            const ctx = this.ensureContext();
            const resp = await fetch(url);
            const arrayBuf = await resp.arrayBuffer();
            const audioBuf = await ctx.decodeAudioData(arrayBuf);
            this.sfxBuffers.set(id, audioBuf);
        } catch (e) {
            console.warn(`Sound "${id}" load failed:`, e);
        }
    }

    /** Play a loaded sound effect via Web Audio. */
    playSound(id: string, loop = false, volumeScale = 1.0): SoundInstance {
        const buffer = this.sfxBuffers.get(id);
        if (!buffer || !this.ctx) return AudioManager.nullInstance();

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;

        // Per-sound volume via a gain node
        const gain = this.ctx.createGain();
        gain.gain.value = Math.min(1, this.sfxVolume * volumeScale);
        source.connect(gain);
        gain.connect(this.sfxGain);

        let playing = true;
        source.onended = () => { playing = false; };
        source.start(0);

        const inst: SoundInstance = {
            stop() {
                if (playing) {
                    try { source.stop(); } catch { /* already stopped */ }
                    playing = false;
                }
            },
            isPlaying() { return playing; },
            setVolume(vol: number) {
                gain.gain.value = Math.max(0, Math.min(1, vol));
            }
        };

        this.activeSounds.push(inst);
        return inst;
    }

    /** Load a music track as HTML5 Audio (streaming). */
    async loadMusic(id: string, url: string): Promise<void> {
        try {
            const audio = new Audio(url);
            audio.preload = 'auto';
            await new Promise<void>((resolve, reject) => {
                audio.oncanplaythrough = () => resolve();
                audio.onerror = () => reject(new Error(`Failed to load ${url}`));
                audio.load();
            });
            audio.volume = this.musicVolume;
            this.musicElements.set(id, audio);
        } catch (e) {
            console.warn(`Music "${id}" load failed:`, e);
        }
    }

    /** Play a named music track via HTML5 Audio. */
    playMusic(id: string, loop = true, volume?: number): void {
        const audio = this.musicElements.get(id);
        if (!audio) {
            console.warn(`Music "${id}" not loaded`);
            return;
        }
        audio.loop = loop;
        audio.volume = volume !== undefined ? Math.max(0, Math.min(1, volume)) : this.musicVolume;
        audio.currentTime = 0;
        audio.play().catch(e => console.warn(`Music "${id}" play failed:`, e));
    }

    /** Stop a specific music track, or all tracks if no id provided. */
    stopMusic(id?: string): void {
        if (id !== undefined) {
            const audio = this.musicElements.get(id);
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        } else {
            for (const audio of this.musicElements.values()) {
                audio.pause();
                audio.currentTime = 0;
            }
        }
    }

    /** Stop all active sound effect instances. */
    stopAllSounds(): void {
        for (const inst of this.activeSounds) {
            if (inst.isPlaying()) inst.stop();
        }
        this.activeSounds = [];
    }

    setMusicVolume(vol: number): void {
        this.musicVolume = Math.max(0, Math.min(1, vol));
        for (const audio of this.musicElements.values()) {
            audio.volume = this.musicVolume;
        }
    }

    setSfxVolume(vol: number): void {
        this.sfxVolume = Math.max(0, Math.min(1, vol));
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxVolume;
        }
    }

    private static nullInstance(): SoundInstance {
        return { stop() {}, isPlaying() { return false; }, setVolume() {} };
    }
}
