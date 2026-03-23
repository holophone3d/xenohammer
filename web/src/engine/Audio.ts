/**
 * Audio manager: Web Audio API for sound effects, HTML5 Audio for music.
 */

export interface SoundInstance {
    stop(): void;
    isPlaying(): boolean;
    setVolume(vol: number): void;
}

export class AudioManager {
    private audioCtx: AudioContext | null = null;
    private sounds: Map<string, AudioBuffer> = new Map();
    private music: HTMLAudioElement | null = null;
    private musicVolume = 0.5;
    private sfxVolume = 0.7;

    constructor() {
        // AudioContext is created lazily to comply with autoplay policies
    }

    private ensureContext(): AudioContext {
        if (!this.audioCtx) {
            this.audioCtx = new AudioContext();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    }

    /** Load a sound effect into memory for low-latency playback. */
    async loadSound(id: string, url: string): Promise<void> {
        const ctx = this.ensureContext();
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        this.sounds.set(id, audioBuffer);
    }

    /** Play a loaded sound effect. Returns a handle to stop it. */
    playSound(id: string, loop = false): SoundInstance {
        const buffer = this.sounds.get(id);
        if (!buffer) {
            console.warn(`Sound "${id}" not loaded`);
            return AudioManager.nullInstance();
        }

        const ctx = this.ensureContext();
        const source = ctx.createBufferSource();
        const gainNode = ctx.createGain();

        source.buffer = buffer;
        source.loop = loop;
        gainNode.gain.value = this.sfxVolume;

        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);

        let playing = true;
        source.onended = () => { playing = false; };

        return {
            stop() {
                if (playing) {
                    source.stop();
                    playing = false;
                }
            },
            isPlaying() {
                return playing;
            },
            setVolume(vol: number) {
                gainNode.gain.value = Math.max(0, Math.min(1, vol));
            }
        };
    }

    /** Load a music track (streamed via HTML5 Audio). */
    async loadMusic(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.src = url;
            audio.volume = this.musicVolume;
            audio.addEventListener('canplaythrough', () => resolve(), { once: true });
            audio.addEventListener('error', () => reject(new Error(`Failed to load music: ${url}`)), { once: true });
            this.music = audio;
        });
    }

    playMusic(loop = true): void {
        if (!this.music) return;
        this.music.loop = loop;
        this.music.volume = this.musicVolume;
        this.music.play().catch(() => {
            // Autoplay blocked — will start on first user interaction
        });
    }

    stopMusic(): void {
        if (!this.music) return;
        this.music.pause();
        this.music.currentTime = 0;
    }

    setMusicVolume(vol: number): void {
        this.musicVolume = Math.max(0, Math.min(1, vol));
        if (this.music) {
            this.music.volume = this.musicVolume;
        }
    }

    setSfxVolume(vol: number): void {
        this.sfxVolume = Math.max(0, Math.min(1, vol));
    }

    private static nullInstance(): SoundInstance {
        return {
            stop() { /* noop */ },
            isPlaying() { return false; },
            setVolume() { /* noop */ }
        };
    }
}
