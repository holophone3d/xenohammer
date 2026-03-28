/**
 * Audio manager: Web Audio API for sound effects and music.
 * Safari-compatible: defers AudioContext creation and audio decoding
 * until the first user gesture to satisfy autoplay policies.
 */

export interface SoundInstance {
    stop(): void;
    isPlaying(): boolean;
    setVolume(vol: number): void;
}

export class AudioManager {
    private audioCtx: AudioContext | null = null;
    // Raw ArrayBuffers stored before user gesture; decoded on unlock
    private rawBuffers: Map<string, ArrayBuffer> = new Map();
    private sounds: Map<string, AudioBuffer> = new Map();
    private rawMusicBuffers: Map<string, ArrayBuffer> = new Map();
    private _musicBuffers: Map<string, AudioBuffer> = new Map();
    private _musicSources: Map<string, { source: AudioBufferSourceNode; gain: GainNode }> = new Map();
    private activeSounds: SoundInstance[] = [];
    private musicVolume = 0.5;
    private sfxVolume = 0.7;
    private _unlocked = false;
    private _pendingPlays: (() => void)[] = [];

    constructor() {
        const unlock = async () => {
            if (this._unlocked) return;
            this._unlocked = true;

            // Create AudioContext inside user gesture — required by Safari
            if (!this.audioCtx) {
                this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            if (this.audioCtx.state === 'suspended') {
                await this.audioCtx.resume();
            }

            // Decode all buffered audio now that context is active
            await this.decodeAllPending();

            // Fire any pending play calls
            for (const fn of this._pendingPlays) fn();
            this._pendingPlays = [];

            document.removeEventListener('click', unlock);
            document.removeEventListener('keydown', unlock);
            document.removeEventListener('touchstart', unlock);
        };
        document.addEventListener('click', unlock);
        document.addEventListener('keydown', unlock);
        document.addEventListener('touchstart', unlock);
    }

    private async decodeAllPending(): Promise<void> {
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        // Decode SFX
        for (const [id, raw] of this.rawBuffers) {
            if (!this.sounds.has(id)) {
                try {
                    const buf = await ctx.decodeAudioData(raw);
                    this.sounds.set(id, buf);
                } catch (e) {
                    console.warn(`SFX decode failed: ${id}`, e);
                }
            }
        }
        this.rawBuffers.clear();

        // Decode music
        for (const [id, raw] of this.rawMusicBuffers) {
            if (!this._musicBuffers.has(id)) {
                try {
                    const buf = await ctx.decodeAudioData(raw);
                    this._musicBuffers.set(id, buf);
                } catch (e) {
                    console.warn(`Music decode failed: ${id}`, e);
                }
            }
        }
        this.rawMusicBuffers.clear();
    }

    private getContext(): AudioContext | null {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    }

    /** Fetch and store a sound effect. Decoded on first user gesture. */
    async loadSound(id: string, url: string): Promise<void> {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();

            if (this._unlocked && this.audioCtx) {
                const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
                this.sounds.set(id, audioBuffer);
            } else {
                this.rawBuffers.set(id, arrayBuffer);
            }
        } catch {
            // Sound loading failed — skip silently
        }
    }

    /** Play a loaded sound effect. Returns a handle to stop it. */
    playSound(id: string, loop = false, volumeScale = 1.0): SoundInstance {
        const buffer = this.sounds.get(id);
        const ctx = this.getContext();
        if (!buffer || !ctx) {
            return AudioManager.nullInstance();
        }

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

    /** Fetch and store a music track. Decoded on first user gesture. */
    async loadMusic(id: string, url: string): Promise<void> {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();

            if (this._unlocked && this.audioCtx) {
                const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
                this._musicBuffers.set(id, audioBuffer);
            } else {
                this.rawMusicBuffers.set(id, arrayBuffer);
            }
        } catch (e) {
            console.warn(`Music "${id}" load failed:`, e);
        }
    }

    /** Play a named music track. */
    playMusic(id: string, loop = true, volume?: number): void {
        const doPlay = () => {
            const buffer = this._musicBuffers.get(id);
            const ctx = this.getContext();
            if (!buffer || !ctx) {
                console.warn(`Music "${id}" not ready`);
                return;
            }
            // Stop any currently playing source for this id
            const existing = this._musicSources.get(id);
            if (existing) {
                try { existing.source.stop(); } catch { /* already stopped */ }
            }
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
        if (this._unlocked) {
            doPlay();
        } else {
            this._pendingPlays.push(doPlay);
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
