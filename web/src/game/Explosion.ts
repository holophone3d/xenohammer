/**
 * Explosion animation system — Section 15 of SPEC.md.
 * Small: 16 frames (SmallExp000–SmallExp015, 3-digit padding)
 * Big:   16 frames (BigExp00–BigExp15, 2-digit padding)
 * Frame interval: 20ms (~50fps). Non-looping (play once then finished).
 */

import { AssetLoader } from '../engine';
import { VELOCITY_DIVISOR } from '../data/ships';

const FRAME_COUNT = 16;
const FRAME_INTERVAL_MS = 20;

export class Explosion {
    x: number;
    y: number;
    type: 'small' | 'big';
    private frames: HTMLImageElement[];
    private currentFrame: number;
    private frameTimer = 0;
    private _finished = false;
    private fallbackSize: number;
    // C++ trail physics: velocity + gravity
    private vx: number;
    private vy: number;
    private gravity: number;

    constructor(
        x: number, y: number, type: 'small' | 'big', frames: HTMLImageElement[],
        vx = 0, vy = 0, gravity = 0, frameDelay = 0,
    ) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.frames = frames;
        this.fallbackSize = type === 'big' ? 64 : 32;
        this.vx = vx;
        this.vy = vy;
        this.gravity = gravity;
        // C++ negative frame = delay before animation starts
        this.currentFrame = -frameDelay;
    }

    update(dt: number): void {
        if (this._finished) return;

        // Move along trajectory — uses VELOCITY_DIVISOR scaling to match C++ show()
        const dtMs = dt * 1000;
        if (this.vx !== 0 || this.vy !== 0) {
            const moveScale = dtMs / VELOCITY_DIVISOR;
            this.x += this.vx * moveScale;
            this.y += this.vy * moveScale;
            this.vy += this.gravity * moveScale;
        }

        this.frameTimer += dtMs;
        while (this.frameTimer >= FRAME_INTERVAL_MS) {
            this.frameTimer -= FRAME_INTERVAL_MS;
            this.currentFrame++;
            if (this.currentFrame >= (this.frames.length || FRAME_COUNT)) {
                this._finished = true;
                return;
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (this._finished || this.currentFrame < 0) return;

        // Additive glow behind explosion — C++ uses glColor4f(5,2,0,0.15) with additive blend.
        // The overbright color (5.0 red) creates intense hot-core glow with additive blending.
        const frameIdx = Math.max(0, this.currentFrame);
        const progress = frameIdx / (this.frames.length || FRAME_COUNT);
        const glowAlpha = 0.25 * (1 - progress * 0.7);
        if (glowAlpha > 0.01) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            // Glow radius scales with explosion size — larger than the sprite for bloom
            const glowR = this.fallbackSize * (0.8 + progress * 0.6);
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowR);
            grad.addColorStop(0, `rgba(255,220,80,${glowAlpha * 3})`);
            grad.addColorStop(0.3, `rgba(255,140,0,${glowAlpha * 1.5})`);
            grad.addColorStop(0.6, `rgba(255,60,0,${glowAlpha * 0.5})`);
            grad.addColorStop(1, 'rgba(255,20,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(this.x - glowR, this.y - glowR, glowR * 2, glowR * 2);
            ctx.restore();
        }

        if (this.frames.length > 0 && frameIdx < this.frames.length) {
            const img = this.frames[frameIdx];
            ctx.drawImage(img, this.x - img.width / 2, this.y - img.height / 2);
        } else {
            // Fallback: expanding orange circle with additive glow
            const radius = this.fallbackSize * (0.3 + progress * 0.7);
            const alpha = 1.0 - progress;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius);
            grad.addColorStop(0, `rgba(255,200,50,${alpha})`);
            grad.addColorStop(0.4, `rgba(255,130,0,${alpha * 0.7})`);
            grad.addColorStop(1, `rgba(255,50,0,0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    isFinished(): boolean {
        return this._finished;
    }

    /** Load explosion frames from the asset loader. */
    static loadFrames(assets: AssetLoader, type: 'small' | 'big'): HTMLImageElement[] {
        const frames: HTMLImageElement[] = [];
        try {
            for (let i = 0; i < FRAME_COUNT; i++) {
                const id = type === 'small'
                    ? `SmallExp${i.toString().padStart(3, '0')}`
                    : `BigExp${i.toString().padStart(2, '0')}`;
                frames.push(assets.getImage(id));
            }
        } catch {
            // Frames not available — fallback rendering will be used
        }
        return frames;
    }
}

/**
 * Chain explosion sequence for boss destruction.
 * 30 explosions over 3 seconds, random positions within 200px radius.
 * Each explosion: 50% chance big vs small.
 */
export class ChainExplosion {
    private explosions: Explosion[] = [];
    private pending: Array<{ x: number; y: number; delay: number; type: 'small' | 'big' }> = [];
    private timer = 0;
    finished = false;
    private smallFrames: HTMLImageElement[] = [];
    private bigFrames: HTMLImageElement[] = [];
    private framesLoaded = false;

    start(cx: number, cy: number, radius = 200, count = 30, duration = 3.0): void {
        this.explosions = [];
        this.pending = [];
        this.timer = 0;
        this.finished = false;
        this.framesLoaded = false;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius;
            this.pending.push({
                x: cx + Math.cos(angle) * dist,
                y: cy + Math.sin(angle) * dist,
                delay: (i / count) * duration,
                type: Math.random() < 0.5 ? 'big' : 'small',
            });
        }
        this.pending.sort((a, b) => a.delay - b.delay);
    }

    update(dt: number, assets: AssetLoader | null): void {
        if (this.finished) return;

        if (!this.framesLoaded && assets) {
            this.smallFrames = Explosion.loadFrames(assets, 'small');
            this.bigFrames = Explosion.loadFrames(assets, 'big');
            this.framesLoaded = true;
        }

        this.timer += dt;

        // Spawn pending explosions whose delay has elapsed
        while (this.pending.length > 0 && this.pending[0].delay <= this.timer) {
            const p = this.pending.shift()!;
            const frames = p.type === 'big' ? this.bigFrames : this.smallFrames;
            this.explosions.push(new Explosion(p.x, p.y, p.type, frames));
        }

        for (const exp of this.explosions) {
            exp.update(dt);
        }

        this.explosions = this.explosions.filter(e => !e.isFinished());

        if (this.pending.length === 0 && this.explosions.length === 0) {
            this.finished = true;
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        for (const exp of this.explosions) {
            exp.draw(ctx);
        }
        ctx.restore();
    }
}
