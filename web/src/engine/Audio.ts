/**
 * Audio manager using HTML5 Audio elements.
 * Safari fully supports this API  Web Audio decodeAudioData fails on Safari
 * for many formats. HTML Audio is universally reliable.
 * 
 * SFX: Pre-load Audio elements, clone for overlapping playback.
 * Music: Single Audio element per track with loop support.
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
