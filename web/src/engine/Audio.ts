/**
 * Hybrid audio manager: Web Audio API for SFX, HTML5 Audio for music.
 *
 * Web Audio gives us sample-accurate looping (no MP3 gap), low latency,
 * and proper mixing. HTML5 Audio streams music efficiently.
 *
 * iOS Safari: the media session stays locked until an original (non-cloned)
 * HTMLAudioElement.play() fires inside a user-gesture call stack.
 * We self-arm a document-level touchstart/click handler that runs the
 * primer directly in the gesture context — no game-loop delay.
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

    // Web Audio music buffers for gapless looping
    private musicBuffers: Map<string, AudioBuffer> = new Map();
    private musicSource: AudioBufferSourceNode | null = null;
    private musicGain: GainNode | null = null;
    private activeMusicId: string | null = null;
    private musicStartCtxTime = 0;   // ctx.currentTime when source started
    private musicStartOffset = 0;    // offset into buffer (for resume)
    private musicLoop = true;
    private musicPaused = false;

    private activeSounds: SoundInstance[] = [];
    private musicVolume = 0.5;
    private sfxVolume = 0.7;
    private iosPrimed = false;
    private contextResumed = false;

    constructor() {
        this.armGestureUnlock();
    }

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
     * Self-arming gesture unlock. Registers document-level touchstart/click
     * handlers (capture phase) that fire directly in the user gesture
     * context — necessary for iOS audio.play() to succeed.
     * Keeps listening until both AudioContext is resumed and iOS media
     * session is primed (or not iOS).
     */
    private armGestureUnlock(): void {
        const events = ['touchstart', 'click'] as const;

        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        const handler = () => {
            // 1. Resume AudioContext (all browsers)
            if (!this.contextResumed) {
                const ctx = this.ensureContext();
                if (ctx.state === 'suspended') {
                    ctx.resume().catch(() => {});
                }
                this.contextResumed = true;
            }

            // 2. iOS: play+pause a real music element
            if (isIOS && !this.iosPrimed) {
                const music = this.musicElements.values().next().value as
                    HTMLAudioElement | undefined;
                if (!music) return; // Music not loaded yet — keep listening

                this.iosPrimed = true;
                const sv = music.volume, st = music.currentTime, sl = music.loop;
                music.volume = 0.001;
                music.loop = false;

                music.play().then(() => {
                    setTimeout(() => {
                        music.pause();
                        music.currentTime = st;
                        music.volume = sv;
                        music.loop = sl;
                        console.log('[Audio] iOS media session primed');
                    }, 50);
                }).catch(() => {
                    this.iosPrimed = false; // retry on next gesture
                });
            }

            // Remove listeners once fully unlocked
            if (this.contextResumed && (!isIOS || this.iosPrimed)) {
                events.forEach(e =>
                    document.removeEventListener(e, handler, true));
            }
        };

        // Capture phase — fires before any other handlers
        events.forEach(e =>
            document.addEventListener(e, handler, true));
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

        // iOS Safari can re-suspend — always try to resume
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }

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

    /**
     * Play a looping sound with crossfade to eliminate the pop at loop boundaries.
     * Instead of source.loop=true, we schedule overlapping buffer sources with
     * a short gain crossfade at each seam.
     */
    playSoundLoopCrossfade(id: string, volumeScale = 1.0, fadeDuration = 0.05): SoundInstance {
        const buffer = this.sfxBuffers.get(id);
        if (!buffer || !this.ctx) return AudioManager.nullInstance();

        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }

        const ctx = this.ctx;
        const masterGain = ctx.createGain();
        masterGain.gain.value = Math.min(1, this.sfxVolume * volumeScale);
        masterGain.connect(this.sfxGain);

        let playing = true;
        let currentSource: AudioBufferSourceNode | null = null;
        let nextScheduled = false;
        let scheduleTimer: number | null = null;

        const scheduleNext = (startTime: number) => {
            if (!playing) return;
            const src = ctx.createBufferSource();
            src.buffer = buffer;

            // Per-iteration gain for fade-in/fade-out
            const iterGain = ctx.createGain();
            src.connect(iterGain);
            iterGain.connect(masterGain);

            // Fade in at start
            iterGain.gain.setValueAtTime(0, startTime);
            iterGain.gain.linearRampToValueAtTime(1, startTime + fadeDuration);

            // Fade out at end
            const fadeOutTime = startTime + buffer.duration - fadeDuration;
            if (fadeOutTime > startTime + fadeDuration) {
                iterGain.gain.setValueAtTime(1, fadeOutTime);
                iterGain.gain.linearRampToValueAtTime(0, startTime + buffer.duration);
            }

            src.start(startTime);
            src.stop(startTime + buffer.duration + 0.01);
            currentSource = src;
            nextScheduled = false;

            // Schedule the next iteration before this one ends (overlap by fadeDuration)
            const nextStart = startTime + buffer.duration - fadeDuration;
            const msUntilSchedule = (nextStart - ctx.currentTime - 0.5) * 1000;
            scheduleTimer = window.setTimeout(() => {
                if (playing) {
                    scheduleNext(nextStart);
                }
            }, Math.max(100, msUntilSchedule));
        };

        scheduleNext(ctx.currentTime);

        const inst: SoundInstance = {
            stop() {
                if (playing) {
                    playing = false;
                    if (scheduleTimer !== null) clearTimeout(scheduleTimer);
                    if (currentSource) {
                        try { currentSource.stop(); } catch { /* ok */ }
                    }
                    masterGain.disconnect();
                }
            },
            isPlaying() { return playing; },
            setVolume(vol: number) {
                masterGain.gain.value = Math.max(0, Math.min(1, vol));
            }
        };

        this.activeSounds.push(inst);
        return inst;
    }

    /** Load a music track as both HTML5 Audio (iOS primer) and Web Audio buffer (gapless loop). */
    async loadMusic(id: string, url: string): Promise<void> {
        try {
            // HTML5 Audio — needed for iOS media session priming
            const audio = new Audio(url);
            audio.preload = 'auto';
            await new Promise<void>((resolve, reject) => {
                audio.oncanplaythrough = () => resolve();
                audio.onerror = () => reject(new Error(`Failed to load ${url}`));
                audio.load();
            });
            audio.volume = this.musicVolume;
            this.musicElements.set(id, audio);

            // Web Audio buffer — gapless looping, no MP3 encoder gap
            try {
                const ctx = this.ensureContext();
                const resp = await fetch(url);
                const arrayBuf = await resp.arrayBuffer();
                const audioBuf = await ctx.decodeAudioData(arrayBuf);
                this.musicBuffers.set(id, audioBuf);
            } catch (e) {
                console.warn(`Music "${id}" Web Audio buffer load failed, will use HTML5 fallback:`, e);
            }
        } catch (e) {
            console.warn(`Music "${id}" load failed:`, e);
        }
    }

    /** Play a named music track. Uses Web Audio for gapless looping, HTML5 Audio as fallback. */
    playMusic(id: string, loop = true, volume?: number): void {
        this.stopMusicSource();
        this.musicPaused = false;
        const vol = volume !== undefined ? Math.max(0, Math.min(1, volume)) : this.musicVolume;

        // Prefer Web Audio buffer for gapless looping
        const buffer = this.musicBuffers.get(id);
        const ctx = this.ctx;
        if (buffer && ctx) {
            // iOS Safari can re-suspend the AudioContext — always resume before playing
            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }
            try {
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.loop = loop;
                const gain = ctx.createGain();
                gain.gain.value = vol;
                source.connect(gain);
                gain.connect(ctx.destination);
                source.start(0);
                this.musicSource = source;
                this.musicGain = gain;
                this.activeMusicId = id;
                this.musicLoop = loop;
                this.musicStartCtxTime = ctx.currentTime;
                this.musicStartOffset = 0;
                return;
            } catch (e) {
                console.warn(`Music "${id}" Web Audio play failed, falling back to HTML5:`, e);
            }
        }

        // Fallback: HTML5 Audio
        const audio = this.musicElements.get(id);
        if (!audio) {
            console.warn(`Music "${id}" not loaded`);
            return;
        }
        audio.loop = loop;
        audio.volume = vol;
        audio.currentTime = 0;
        audio.play().catch(e => console.warn(`Music "${id}" play failed:`, e));
        this.activeMusicId = id;
    }

    /** Stop the currently playing Web Audio music source. */
    private stopMusicSource(): void {
        if (this.musicSource) {
            try { this.musicSource.stop(); } catch { /* already stopped */ }
            this.musicSource.disconnect();
            this.musicSource = null;
        }
        if (this.musicGain) {
            this.musicGain.disconnect();
            this.musicGain = null;
        }
    }

    /** Stop a specific music track, or all tracks if no id provided. */
    stopMusic(id?: string): void {
        // Stop Web Audio source
        this.stopMusicSource();
        this.activeMusicId = null;

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

    /** Pause music — stops the source and remembers playback position. */
    pauseMusic(): void {
        if (this.musicPaused) return;
        this.musicPaused = true;

        // Web Audio: calculate current offset into the buffer, then stop
        if (this.musicSource && this.ctx && this.activeMusicId) {
            const buffer = this.musicBuffers.get(this.activeMusicId);
            if (buffer) {
                const elapsed = this.ctx.currentTime - this.musicStartCtxTime + this.musicStartOffset;
                this.musicStartOffset = elapsed % buffer.duration;
            }
            this.stopMusicSource();
        }

        // HTML5 fallback
        if (this.activeMusicId) {
            const audio = this.musicElements.get(this.activeMusicId);
            if (audio && !audio.paused) audio.pause();
        }
    }

    /** Resume music from where it was paused. */
    resumeMusic(): void {
        if (!this.musicPaused) return;
        this.musicPaused = false;

        if (!this.activeMusicId) return;

        // Web Audio: recreate source and start from saved offset
        const buffer = this.musicBuffers.get(this.activeMusicId);
        const ctx = this.ctx;
        if (buffer && ctx) {
            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }
            try {
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.loop = this.musicLoop;
                const gain = ctx.createGain();
                gain.gain.value = this.musicVolume;
                source.connect(gain);
                gain.connect(ctx.destination);
                source.start(0, this.musicStartOffset);
                this.musicSource = source;
                this.musicGain = gain;
                this.musicStartCtxTime = ctx.currentTime;
                return;
            } catch { /* fall through to HTML5 */ }
        }

        // HTML5 fallback
        const audio = this.musicElements.get(this.activeMusicId);
        if (audio && audio.paused) audio.play().catch(() => {});
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
        // Update Web Audio music gain
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicVolume;
        }
        // Update HTML5 fallback elements
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
