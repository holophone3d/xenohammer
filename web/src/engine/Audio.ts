/**
 * Audio manager using Web Audio API for both SFX and music.
 * 
 * Safari compatibility: AudioContext is created eagerly but starts suspended.
 * decodeAudioData() works on suspended contexts in all browsers.
 * On first user gesture we call resume() to unlock playback.
 * Any play calls before unlock are queued and fired after resume.
 */

export interface SoundInstance {
    stop(): void;
    isPlaying(): boolean;
    setVolume(vol: number): void;
}

export class AudioManager {
    private audioCtx: AudioContext;
    private sounds: Map<string, AudioBuffer> = new Map();
    private _musicBuffers: Map<string, AudioBuffer> = new Map();
    private _musicSources: Map<string, { source: AudioBufferSourceNode; gain: GainNode }> = new Map();
    private activeSounds: SoundInstance[] = [];
    private musicVolume = 0.5;
    private sfxVolume = 0.7;
    private _unlocked = false;
    private _pendingPlays: (() => void)[] = [];

    constructor() {
        // Create context eagerly  will be suspended until user gesture
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

        const unlock = () => {
            if (this._unlocked) return;
            this._unlocked = true;

            // Resume the suspended context inside user gesture
            this.audioCtx.resume().then(() => {
                // Fire any queued play calls
                for (const fn of this._pendingPlays) fn();
                this._pendingPlays = [];
            });

            document.removeEventListener('click', unlock, true);
            document.removeEventListener('keydown', unlock, true);
            document.removeEventListener('touchstart', unlock, true);
        };
        // Use capture phase to fire before game click handlers
        document.addEventListener('click', unlock, true);
        document.addEventListener('keydown', unlock, true);
        document.addEventListener('touchstart', unlock, true);
    }

    /** Load a sound effect  decodes immediately (works on suspended context). */
    async loadSound(id: string, url: string): Promise<void> {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
            this.sounds.set(id, audioBuffer);
        } catch (e) {
            console.warn(`Sound "${id}" load failed:`, e);
        }
    }

    /** Play a loaded sound effect. Returns a handle to stop it. */
    playSound(id: string, loop = false, volumeScale = 1.0): SoundInstance {
        const buffer = this.sounds.get(id);
        if (!buffer) return AudioManager.nullInstance();

        const inst = AudioManager.makeInstance();

        const play = () => {
            const source = this.audioCtx.createBufferSource();
            const gainNode = this.audioCtx.createGain();
            source.buffer = buffer;
            source.loop = loop;
            gainNode.gain.value = this.sfxVolume * volumeScale;
            source.connect(gainNode);
            gainNode.connect(this.audioCtx.destination);
            source.start(0);
            source.onended = () => { inst._playing = false; };
            inst._source = source;
            inst._gain = gainNode;
            inst._playing = true;
        };

        if (this._unlocked) {
            play();
        } else {
            this._pendingPlays.push(play);
        }

        this.activeSounds.push(inst);
        return inst;
    }

    /** Load a music track  decodes immediately. */
    async loadMusic(id: string, url: string): Promise<void> {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
            this._musicBuffers.set(id, audioBuffer);
        } catch (e) {
            console.warn(`Music "${id}" load failed:`, e);
        }
    }

    /** Play a named music track. */
    playMusic(id: string, loop = true, volume?: number): void {
        const buffer = this._musicBuffers.get(id);
        if (!buffer) {
            console.warn(`Music "${id}" not loaded`);
            return;
        }
        const doPlay = () => {
            const existing = this._musicSources.get(id);
            if (existing) {
                try { existing.source.stop(); } catch { /* already stopped */ }
            }
            const source = this.audioCtx.createBufferSource();
            const gainNode = this.audioCtx.createGain();
            source.buffer = buffer;
            source.loop = loop;
            gainNode.gain.value = volume !== undefined ? Math.max(0, Math.min(1, volume)) : this.musicVolume;
            source.connect(gainNode);
            gainNode.connect(this.audioCtx.destination);
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
            if (instance.isPlaying()) instance.stop();
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

    private static makeInstance(): SoundInstance & { _source?: AudioBufferSourceNode; _gain?: GainNode; _playing: boolean } {
        const inst = {
            _source: undefined as AudioBufferSourceNode | undefined,
            _gain: undefined as GainNode | undefined,
            _playing: false,
            stop() {
                if (inst._playing && inst._source) {
                    try { inst._source.stop(); } catch { /* already stopped */ }
                    inst._playing = false;
                }
            },
            isPlaying() { return inst._playing; },
            setVolume(vol: number) {
                if (inst._gain) inst._gain.gain.value = Math.max(0, Math.min(1, vol));
            }
        };
        return inst;
    }

    private static nullInstance(): SoundInstance {
        return { stop() {}, isPlaying() { return false; }, setVolume() {} };
    }
}
