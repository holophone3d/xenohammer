/**
 * Projectile — position, velocity, damage, homing, bounds checking.
 * Velocities are in px/frame, applied once per fixed-rate tick.
 */

import { Sprite } from '../engine';
import { VELOCITY_DIVISOR } from '../data/ships';
import { Rect, isOutOfBounds } from './Collision';

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

    homing = false;
    homingTrackDist = 64;
    homingMinDist = 16;
    homingSpeed = 20;
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

    update(dt: number, targetX?: number, targetY?: number): void {
        if (!this.alive) return;

        // Homing guidance — only after 50px traveled
        if (this.homing && this.distanceTraveled > 50 &&
            targetX !== undefined && targetY !== undefined) {
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > this.homingMinDist && dist < this.homingTrackDist) {
                const angle = Math.atan2(dy, dx);
                this.vx = Math.cos(angle) * this.homingSpeed;
                this.vy = Math.sin(angle) * this.homingSpeed;
            }
        }

        // Move (time-scaled: velocity × dt_ms / 32, matching original ClanLib show())
        const moveScale = dt * 1000 / VELOCITY_DIVISOR;
        this.x += this.vx * moveScale;
        this.y += this.vy * moveScale;

        // Track distance for homing activation
        this.distanceTraveled += Math.sqrt(this.vx * this.vx + this.vy * this.vy) * moveScale;

        // Sprite frame is set once at creation (power level), NOT animated

        // Kill if out of bounds (64px margin)
        if (isOutOfBounds(this.x, this.y)) {
            this.alive = false;
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (!this.alive) return;

        if (this.sprite) {
            // Additive glow behind sprite — color by weapon type
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            // Enemy projectiles: fixed glow size; player projectiles: scale with sprite
            const baseSize = (this.owner === 'enemy') ? 27 : this.width;
            const glowSize = baseSize * 1.5;
            let glowColor: string;
            switch (this.weaponType) {
                case 'blaster':    glowColor = 'rgba(0,255,51,0.25)'; break;   // green
                case 'turret':     glowColor = 'rgba(0,255,128,0.25)'; break;  // cyan-green
                case 'missile':    glowColor = 'rgba(0,0,255,0.3)'; break;     // blue
                case 'enemyBlast': glowColor = 'rgba(255,80,0,0.25)'; break;   // orange-red
                case 'enemyCannon': glowColor = 'rgba(255,0,0,0.25)'; break;   // red
                default:           glowColor = 'rgba(0,255,51,0.25)'; break;
            }
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
            grad.addColorStop(0, glowColor);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(cx - glowSize, cy - glowSize, glowSize * 2, glowSize * 2);
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
