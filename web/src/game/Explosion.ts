/**
 * Explosion animation system — small (fighter) and big (capital/boss) variants.
 * Uses 16-frame sprite sheets with configurable timing.
 * Supports chain explosions for boss destruction sequences.
 */

import { Sprite, AssetLoader } from '../engine';

const SMALL_FRAME_COUNT = 16;
const BIG_FRAME_COUNT = 16;
const FRAME_INTERVAL_MS = 20; // from game-constants: 20ms per frame

export class Explosion {
    x: number;
    y: number;
    sprite: Sprite | null = null;
    currentFrame = 0;
    frameTimer = 0;
    frameInterval: number;
    finished = false;
    big: boolean;
    private frameCount: number;
    private fallbackSize: number;

    constructor(x: number, y: number, big = false) {
        this.x = x;
        this.y = y;
        this.big = big;
        this.frameCount = big ? BIG_FRAME_COUNT : SMALL_FRAME_COUNT;
        this.frameInterval = FRAME_INTERVAL_MS;
        this.fallbackSize = big ? 64 : 32;
    }

    /** Load sprite frames from the asset loader. Call after construction. */
    loadSprite(assets: AssetLoader): void {
        const prefix = this.big ? 'bigexplosion' : 'explosion';
        try {
            const frames: HTMLImageElement[] = [];
            for (let i = 0; i < this.frameCount; i++) {
                const id = `${prefix}${i.toString().padStart(2, '0')}`;
                frames.push(assets.getImage(id));
            }
            this.sprite = new Sprite(frames, this.frameInterval);
            this.sprite.loop = false;
        } catch {
            // Sprite frames not available — will use fallback rendering
        }
    }

    update(dt: number): void {
        if (this.finished) return;

        if (this.sprite) {
            this.sprite.update(dt * 1000);
            if (this.sprite.isFinished()) {
                this.finished = true;
            }
        } else {
            // Fallback frame advance without sprites
            this.frameTimer += dt * 1000;
            while (this.frameTimer >= this.frameInterval) {
                this.frameTimer -= this.frameInterval;
                this.currentFrame++;
                if (this.currentFrame >= this.frameCount) {
                    this.finished = true;
                    return;
                }
            }
        }
    }

    render(ctx: CanvasRenderingContext2D): void {
        if (this.finished) return;

        if (this.sprite) {
            this.sprite.drawAt(ctx, this.x - this.sprite.width / 2, this.y - this.sprite.height / 2);
        } else {
            // Procedural fallback — expanding fireball
            const progress = this.currentFrame / this.frameCount;
            const radius = this.fallbackSize * (0.3 + progress * 0.7);
            const alpha = 1.0 - progress;

            // Outer glow
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 100, 0, ${alpha * 0.4})`;
            ctx.fill();

            // Core
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 100, ${alpha * 0.8})`;
            ctx.fill();

            // Hot center
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius * 0.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();
        }
    }
}

/**
 * Manages a chain explosion sequence — staggered explosions across an area.
 * Used for boss destruction.
 */
export class ChainExplosion {
    private explosions: Explosion[] = [];
    private pending: Array<{ x: number; y: number; delay: number; big: boolean }> = [];
    private timer = 0;
    finished = false;

    /**
     * Queue a series of chain explosions centered around (cx, cy).
     * @param cx Center X
     * @param cy Center Y
     * @param radius Spread radius
     * @param count Number of explosions in the chain
     * @param duration Total time for the chain in seconds
     */
    start(cx: number, cy: number, radius: number, count: number, duration: number): void {
        this.explosions = [];
        this.pending = [];
        this.timer = 0;
        this.finished = false;

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius;
            this.pending.push({
                x: cx + Math.cos(angle) * dist,
                y: cy + Math.sin(angle) * dist,
                delay: (i / count) * duration,
                big: Math.random() > 0.5,
            });
        }
        // Sort by delay so we can process in order
        this.pending.sort((a, b) => a.delay - b.delay);
    }

    update(dt: number, assets: AssetLoader | null): void {
        if (this.finished) return;

        this.timer += dt;

        // Spawn pending explosions whose delay has elapsed
        while (this.pending.length > 0 && this.pending[0].delay <= this.timer) {
            const p = this.pending.shift()!;
            const exp = new Explosion(p.x, p.y, p.big);
            if (assets) exp.loadSprite(assets);
            this.explosions.push(exp);
        }

        // Update active explosions
        for (const exp of this.explosions) {
            exp.update(dt);
        }

        // Remove finished explosions
        this.explosions = this.explosions.filter(e => !e.finished);

        // Chain is finished when no pending and no active explosions remain
        if (this.pending.length === 0 && this.explosions.length === 0) {
            this.finished = true;
        }
    }

    render(ctx: CanvasRenderingContext2D): void {
        for (const exp of this.explosions) {
            exp.render(ctx);
        }
    }
}
