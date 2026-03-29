/**
 * Projectile — position, velocity, damage, homing, bounds checking.
 * Velocities are in px/frame, applied once per fixed-rate tick.
 */

import { Sprite } from '../engine';
import { VELOCITY_DIVISOR } from '../data/ships';
import { Rect, Collider, isOutOfBounds } from './Collision';

export type ProjectileOwner = 'player' | 'enemy';

export class Projectile {
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    owner: ProjectileOwner;
    weaponType: 'blaster' | 'turret' | 'missile' | 'enemyBlast' | 'enemyCannon';
    alive = true;
    width: number;
    height: number;
    sprite: Sprite | null;

    prevX: number;
    prevY: number;

    homing = false;
    homingTrackDist = 64;
    homingMinDist = 16;
    homingSpeed = 20;
    homingTurnRate = 3.0; // radians/sec — how fast it can steer
    distanceTraveled = 0;

    constructor(
        x: number, y: number,
        vx: number, vy: number,
        damage: number,
        owner: ProjectileOwner,
        sprite: Sprite | null = null,
        weaponType: 'blaster' | 'turret' | 'missile' | 'enemyBlast' | 'enemyCannon' = 'blaster',
    ) {
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.owner = owner;
        this.weaponType = weaponType;
        this.sprite = sprite;
        this.width = sprite ? sprite.width : 4;
        this.height = sprite ? sprite.height : 4;
    }

    getRect(): Rect {
        return { x: this.x, y: this.y, w: this.width, h: this.height };
    }

    getCollider(): Collider {
        return {
            x: this.x, y: this.y, w: this.width, h: this.height,
            mask: this.sprite?.getCurrentMask() ?? null,
        };
    }

    update(dt: number, targetX?: number, targetY?: number): void {
        if (!this.alive) return;
        this.prevX = this.x;
        this.prevY = this.y;

        // Homing guidance— continuous steering after 50px traveled
        if (this.homing && this.distanceTraveled > 50 &&
            targetX !== undefined && targetY !== undefined) {
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > this.homingMinDist) {
                // Current heading angle
                const curAngle = Math.atan2(this.vy, this.vx);
                // Desired angle toward target
                const desiredAngle = Math.atan2(dy, dx);
                // Shortest angular difference
                let diff = desiredAngle - curAngle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                // Clamp turn by turn rate
                const maxTurn = this.homingTurnRate * dt;
                const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
                const newAngle = curAngle + turn;
                // Maintain current speed
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || this.homingSpeed;
                this.vx = Math.cos(newAngle) * speed;
                this.vy = Math.sin(newAngle) * speed;
            }
        }

        // Move (time-scaled: velocity × dt_ms / 32, matching original ClanLib show())
        const moveScale = dt * 1000 / VELOCITY_DIVISOR;
        this.x += this.vx * moveScale;
        this.y += this.vy * moveScale;

        // Track distance for homing activation
        this.distanceTraveled += Math.sqrt(this.vx * this.vx + this.vy * this.vy) * moveScale;

        // Sprite frame is set once at creation (power level), NOT animated

        // Kill if out of bounds (C++: zero margin)
        if (isOutOfBounds(this.x, this.y)) {
            this.alive = false;
        }
    }

    /** Pre-rendered glow textures per weapon type (avoids gradient creation per frame). */
    private static glowTextures = new Map<string, HTMLCanvasElement>();
    private static GLOW_TEX_SIZE = 64;

    private static getGlowTexture(weaponType: string): HTMLCanvasElement {
        let tex = Projectile.glowTextures.get(weaponType);
        if (tex) return tex;

        const S = Projectile.GLOW_TEX_SIZE;
        tex = document.createElement('canvas');
        tex.width = S; tex.height = S;
        const gc = tex.getContext('2d')!;
        const half = S / 2;

        let color: string;
        switch (weaponType) {
            case 'blaster':     color = 'rgba(0,255,51,'; break;
            case 'turret':      color = 'rgba(0,255,128,'; break;
            case 'missile':     color = 'rgba(0,0,255,'; break;
            case 'enemyBlast':  color = 'rgba(255,51,0,'; break;
            case 'enemyCannon': color = 'rgba(255,51,0,'; break;
            default:            color = 'rgba(0,255,51,'; break;
        }
        const alpha = weaponType === 'enemyBlast' || weaponType === 'enemyCannon' ? 0.6 : 0.5;
        const grad = gc.createRadialGradient(half, half, 0, half, half, half);
        grad.addColorStop(0, `${color}${alpha})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        gc.fillStyle = grad;
        gc.fillRect(0, 0, S, S);
        Projectile.glowTextures.set(weaponType, tex);
        return tex;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (!this.alive) return;

        if (this.sprite) {
            // C++ GL_Handler.cpp: additive blending (GL_SRC_ALPHA, GL_ONE) with
            // per-type color quads. Player alpha=0.7, enemy alpha=0.9.
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const baseSize = Math.max(this.width, this.height);
            const glowSize = baseSize * 1.5;
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const tex = Projectile.getGlowTexture(this.weaponType);
            ctx.drawImage(tex, (cx - glowSize) | 0, (cy - glowSize) | 0, glowSize * 2, glowSize * 2);
            ctx.restore();

            this.sprite.drawAt(ctx, this.x, this.y);
        } else {
            // Fallback: colored rect with weapon-type color
            let color: string;
            switch (this.weaponType) {
                case 'blaster':    color = '#00ff33'; break;
                case 'turret':     color = '#00ff80'; break;
                case 'missile':    color = '#0000ff'; break;
                case 'enemyBlast': color = '#ff5500'; break;
                case 'enemyCannon': color = '#ff0000'; break;
                default:           color = this.owner === 'player' ? '#0f0' : '#f00';
            }
            ctx.fillStyle = color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}
