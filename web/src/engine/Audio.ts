/**
 * Audio manager: Web Audio API for sound effects, HTML5 Audio for music.
 * Supports multiple named music tracks and tracking of active sound instances.
 */

export interface SoundInstance {
    stop(): void;
    isPlaying(): boolean;
    setVolume(vol: number): void;
}

export class AudioManager {
    private audioCtx: AudioContext | null = null;
    private sounds: Map<string, AudioBuffer> = new Map();
    private _musicBuffers: Map<string, AudioBuffer> = new Map();
    private _musicSources: Map<string, { source: AudioBufferSourceNode; gain: GainNode }> = new Map();
    private activeSounds: SoundInstance[] = [];
    private musicVolume = 0.5;
    private sfxVolume = 0.7;
    private _userInteracted = false;
    private _pendingResumes: (() => void)[] = [];

    constructor() {
        // Listen for first user interaction to unlock audio
        const unlock = () => {
            this._userInteracted = true;
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            // Resume any pending music
            for (const fn of this._pendingResumes) fn();
            this._pendingResumes = [];
            document.removeEventListener('click', unlock);
            document.removeEventListener('keydown', unlock);
        };
        document.addEventListener('click', unlock, { once: false });
        document.addEventListener('keydown', unlock, { once: false });
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
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            // Defer AudioContext creation — store raw buffer, decode on first play
            const ctx = this.ensureContext();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            this.sounds.set(id, audioBuffer);
        } catch {
            // Sound loading failed — skip silently
        }
    }

    /** Play a loaded sound effect. Returns a handle to stop it. */
    playSound(id: string, loop = false, volumeScale = 1.0): SoundInstance {
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
        gainNode.gain.value = this.sfxVolume * volumeScale;

        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);

        let playing = true;
        const instance: SoundInstance = {
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

        source.onended = () => { playing = false; };
        this.activeSounds.push(instance);

        return instance;
    }

    /** Load a named music track via Web Audio API (supports OGG in all contexts). */
    async loadMusic(id: string, url: string): Promise<void> {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const ctx = this.ensureContext();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            this._musicBuffers.set(id, audioBuffer);
        } catch (e) {
            console.warn(`Music "${id}" load failed:`, e);
        }
    }

    /** Play a named music track via Web Audio API. */
    playMusic(id: string, loop = true, volume?: number): void {
        const buffer = this._musicBuffers.get(id);
        if (!buffer) {
            console.warn(`Music "${id}" not loaded`);
            return;
        }
        const doPlay = () => {
            // Stop any currently playing music source for this id
            const existing = this._musicSources.get(id);
            if (existing) {
                try { existing.source.stop(); } catch { /* already stopped */ }
            }
            const ctx = this.ensureContext();
            const source = ctx.createBufferSource();
            const gainNode = ctx.createGain();
            source.buffer = buffer;
            source.loop = loop;
            gainNode.gain.value = volume !== undefined ? Math.max(0, Math.min(1, volume)) : this.musicVolume;
            source.connect(gainNode);
            gainNode.connect(ctx.destination);
            source.start(0);
            this._musicSources.set(id, { source, gain: gainNode });
        };
        if (this._userInteracted) {
            doPlay();
        } else {
            this._pendingResumes.push(doPlay);
        }
    }

    /** Stop a specific music track, or all tracks if no id provided. */
    stopMusic(id?: string): void {
        if (id !== undefined) {
            const entry = this._musicSources.get(id);
            if (entry) {
                try { entry.source.stop(); } catch { /* already stopped */ }
                this._musicSources.delete(id);
            }
        } else {
            for (const [key, entry] of this._musicSources) {
                try { entry.source.stop(); } catch { /* already stopped */ }
                this._musicSources.delete(key);
            }
        }
    }

    /** Stop all active sound effect instances. */
    stopAllSounds(): void {
        for (const instance of this.activeSounds) {
            if (instance.isPlaying()) {
                instance.stop();
            }
        }
        this.activeSounds = [];
    }

    setMusicVolume(vol: number): void {
        this.musicVolume = Math.max(0, Math.min(1, vol));
        for (const entry of this._musicSources.values()) {
            entry.gain.gain.value = this.musicVolume;
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
