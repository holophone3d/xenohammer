/**
 * Projectile — position, velocity, damage, homing, bounds checking.
 * Velocities are in px/frame, applied once per fixed-rate tick.
 */

import { Sprite } from '../engine';
import { Rect, isOutOfBounds } from './Collision';

export type ProjectileOwner = 'player' | 'enemy';

export class Projectile {
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    owner: ProjectileOwner;
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
    ) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.owner = owner;
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

        // Move (px/frame, applied once per tick)
        this.x += this.vx;
        this.y += this.vy;

        // Track distance for homing activation
        this.distanceTraveled += Math.sqrt(this.vx * this.vx + this.vy * this.vy);

        // Animate sprite
        if (this.sprite) {
            this.sprite.update(dt * 1000);
        }

        // Kill if out of bounds (64px margin)
        if (isOutOfBounds(this.x, this.y)) {
            this.alive = false;
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (!this.alive) return;

        if (this.sprite) {
            this.sprite.drawAt(ctx, this.x, this.y);
        } else {
            ctx.fillStyle = this.owner === 'player' ? '#0f0' : '#f00';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}
