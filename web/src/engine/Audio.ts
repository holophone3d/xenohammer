/**
 * Audio manager using HTML5 Audio elements.
 *
 * iOS Safari quirk: the browser's media session stays locked until an
 * original (non-cloned) HTMLAudioElement.play() is called inside a
 * user-gesture call stack. Silent buffers and cloned elements do NOT
 * unlock the session — it must be a real preloaded music element that
 * is played then paused. After that, all audio (HTML5 and Web Audio)
 * works for the rest of the page session.
 *
 * Call primeIOSAudio() synchronously from the first meaningful user
 * gesture (e.g. "Start Game" click) to activate the media session.
 */

export interface SoundInstance {
    stop(): void;
    isPlaying(): boolean;
    setVolume(vol: number): void;
}

export class AudioManager {
    private sounds: Map<string, HTMLAudioElement> = new Map();
    private musicElements: Map<string, HTMLAudioElement> = new Map();
    private activeSounds: SoundInstance[] = [];
    private musicVolume = 0.5;
    private sfxVolume = 0.7;
    private iosPrimed = false;

    /**
     * Unlock the iOS media session by briefly playing a real preloaded
     * music element. Must be called synchronously from a user gesture
     * (touch/click handler). Safe to call multiple times — only the
     * first call has any effect.
     */
    primeIOSAudio(): void {
        if (this.iosPrimed) return;
        this.iosPrimed = true;

        // Grab any loaded music element (original, not cloned)
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
            // Pause after a short delay — iOS needs at least one audio
            // frame to actually activate the media session
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

    /** Load a sound effect for low-latency playback. */
    async loadSound(id: string, url: string): Promise<void> {
        try {
            const audio = new Audio(url);
            audio.preload = 'auto';
            await new Promise<void>((resolve, reject) => {
                audio.oncanplaythrough = () => resolve();
                audio.onerror = () => reject(new Error(`Failed to load ${url}`));
                audio.load();
            });
            this.sounds.set(id, audio);
        } catch (e) {
            console.warn(`Sound "${id}" load failed:`, e);
        }
    }

    /** Play a loaded sound effect. Returns a handle to stop it. */
    playSound(id: string, loop = false, volumeScale = 1.0): SoundInstance {
        const template = this.sounds.get(id);
        if (!template) return AudioManager.nullInstance();

        // Clone so overlapping plays don't cut each other off
        const audio = template.cloneNode(true) as HTMLAudioElement;
        audio.volume = Math.min(1, this.sfxVolume * volumeScale);
        audio.loop = loop;

        let playing = true;
        audio.onended = () => { playing = false; };
        audio.onerror = () => { playing = false; };

        const inst: SoundInstance = {
            stop() {
                if (playing) {
                    audio.pause();
                    audio.currentTime = 0;
                    playing = false;
                }
            },
            isPlaying() { return playing; },
            setVolume(vol: number) {
                audio.volume = Math.max(0, Math.min(1, vol));
            }
        };

        audio.play().catch(() => { playing = false; });
        this.activeSounds.push(inst);
        return inst;
    }

    /** Load a music track. */
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

    /** Play a named music track. */
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
    }

    private static nullInstance(): SoundInstance {
        return { stop() {}, isPlaying() { return false; }, setVolume() {} };
    }
}
