/**
 * Particle system — port of TParticleClass from the C++ engine.
 * Supports per-particle colors, fading, velocity, and optional gravity wells.
 */

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    fade: number;
    r: number;
    g: number;
    b: number;
    active: boolean;
    hasGravity: boolean;
    originX: number;
    originY: number;
}

export interface ParticleOptions {
    color?: { r: number; g: number; b: number };
    speed?: number;
    life?: number;
    fade?: number;
    gravity?: boolean;
    /** Constant gravity force on X axis (pixels/s²). */
    gravityX?: number;
    /** Constant gravity force on Y axis (pixels/s²). */
    gravityY?: number;
    /** Angular spread in radians (default: 2π for omnidirectional). */
    spread?: number;
    /** Base direction in radians (default: 0, up). */
    direction?: number;
    /** Additional velocity added after angle-based calculation (px/s). */
    baseVx?: number;
    /** Additional velocity added after angle-based calculation (px/s). */
    baseVy?: number;
}

export class ParticleSystem {
    particles: Particle[];
    maxParticles: number;
    /** Constant acceleration applied to particles with hasGravity. */
    gravityX: number;
    gravityY: number;

    constructor(maxParticles = 1000) {
        this.maxParticles = maxParticles;
        this.gravityX = 0;
        this.gravityY = 0;
        this.particles = [];
        for (let i = 0; i < maxParticles; i++) {
            this.particles.push(ParticleSystem.createDead());
        }
    }

    private static createDead(): Particle {
        return {
            x: 0, y: 0,
            vx: 0, vy: 0,
            life: 0, fade: 0,
            r: 1, g: 1, b: 1,
            active: false,
            hasGravity: false,
            originX: 0, originY: 0
        };
    }

    /** Emit particles at a position. */
    emit(x: number, y: number, count: number, options: ParticleOptions = {}): void {
        const speed = options.speed ?? 80;
        const life = options.life ?? 1.0;
        const fade = options.fade ?? 1.0;
        const r = options.color?.r ?? 1;
        const g = options.color?.g ?? 0.8;
        const b = options.color?.b ?? 0.2;
        const hasGravity = options.gravity ?? false;
        const spread = options.spread ?? Math.PI * 2;
        const direction = options.direction ?? 0;

        let emitted = 0;
        for (let i = 0; i < this.maxParticles && emitted < count; i++) {
            const p = this.particles[i];
            if (p.active) continue;

            const angle = direction + (Math.random() - 0.5) * spread;
            const spd = speed * (0.5 + Math.random() * 0.5);

            p.x = x;
            p.y = y;
            p.originX = x;
            p.originY = y;
            p.vx = Math.sin(angle) * spd + (options.baseVx ?? 0);
            p.vy = -Math.cos(angle) * spd + (options.baseVy ?? 0);
            p.life = life;
            p.fade = fade;
            p.r = r;
            p.g = g;
            p.b = b;
            p.active = true;
            p.hasGravity = hasGravity;

            if (options.gravityX !== undefined || options.gravityY !== undefined) {
                this.gravityX = options.gravityX ?? this.gravityX;
                this.gravityY = options.gravityY ?? this.gravityY;
            }

            emitted++;
        }
    }

    /** Advance all active particles by dt seconds. */
    update(dt: number): void {
        for (let i = 0; i < this.maxParticles; i++) {
            const p = this.particles[i];
            if (!p.active) continue;

            // Apply gravity acceleration
            if (p.hasGravity) {
                p.vx += this.gravityX * dt;
                p.vy += this.gravityY * dt;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= p.fade * dt;

            if (p.life <= 0) {
                p.active = false;
            }
        }
    }

    /** Pre-rendered glow textures, keyed by quantized RGB.
     *  Avoids creating a CanvasGradient per particle per frame (massive GC pressure on iOS). */
    private static glowCache = new Map<number, HTMLCanvasElement>();
    private static GLOW_SIZE = 32;

    private static getGlowTexture(r: number, g: number, b: number): HTMLCanvasElement {
        const qr = Math.round(r * 7);
        const qg = Math.round(g * 7);
        const qb = Math.round(b * 7);
        const key = (qr << 8) | (qg << 4) | qb;
        let tex = ParticleSystem.glowCache.get(key);
        if (tex) return tex;

        const S = ParticleSystem.GLOW_SIZE;
        tex = document.createElement('canvas');
        tex.width = S; tex.height = S;
        const gc = tex.getContext('2d')!;
        const half = S / 2;
        const ri = Math.round((qr / 7) * 255);
        const gi = Math.round((qg / 7) * 255);
        const bi = Math.round((qb / 7) * 255);
        const grad = gc.createRadialGradient(half, half, 0, half, half, half);
        grad.addColorStop(0, `rgba(${ri},${gi},${bi},1)`);
        grad.addColorStop(0.3, `rgba(${ri},${gi},${bi},0.6)`);
        grad.addColorStop(0.7, `rgba(${ri},${gi},${bi},0.15)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        gc.fillStyle = grad;
        gc.fillRect(0, 0, S, S);
        ParticleSystem.glowCache.set(key, tex);
        return tex;
    }

    /** Render all active particles with additive blending glow.
     * C++ renders each as a 33×33 textured quad (Particle.bmp)
     * with glColor4f(r,g,b,life) and additive blending.
     * Uses pre-rendered glow textures (drawImage) instead of per-particle gradients. */
    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const half = ParticleSystem.GLOW_SIZE / 2;

        for (let i = 0; i < this.maxParticles; i++) {
            const p = this.particles[i];
            if (!p.active) continue;

            ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
            const tex = ParticleSystem.getGlowTexture(p.r, p.g, p.b);
            ctx.drawImage(tex, (p.x - half) | 0, (p.y - half) | 0);
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    /** Deactivate all particles. */
    clear(): void {
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles[i].active = false;
        }
    }

    /** Count of currently active particles. */
    activeCount(): number {
        let n = 0;
        for (let i = 0; i < this.maxParticles; i++) {
            if (this.particles[i].active) n++;
        }
        return n;
    }
}
