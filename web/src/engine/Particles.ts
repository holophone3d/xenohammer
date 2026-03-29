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

    /** Render all active particles with additive blending glow.
     * C++ renders each as a 33×33 textured quad (Particle.bmp)
     * with glColor4f(r,g,b,life) and additive blending.
     * The texture is a soft circular glow — we approximate with a radial gradient. */
    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < this.maxParticles; i++) {
            const p = this.particles[i];
            if (!p.active) continue;

            const alpha = Math.max(0, Math.min(1, p.life));
            const r = Math.min(255, Math.round(p.r * 255));
            const g = Math.min(255, Math.round(p.g * 255));
            const b = Math.min(255, Math.round(p.b * 255));

            // C++ 33×33 textured quad (±16.5px). Use 14px radius for visible glow core.
            const radius = 14;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
            grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
            grad.addColorStop(0.3, `rgba(${r},${g},${b},${alpha * 0.6})`);
            grad.addColorStop(0.7, `rgba(${r},${g},${b},${alpha * 0.15})`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
        }

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
