/**
 * Projectile types: blaster, turret bullet, missile, enemy blast/cannon.
 * Handles position, velocity, damage, animation frames, homing, and bounds.
 */

import { Sprite } from '../engine';
import { Rect, isOutOfBounds } from './Collision';

export type ProjectileOwner = 'player' | 'enemy';
export type ProjectileType = 'blaster' | 'turret' | 'missile' | 'enemyBlast' | 'enemyCannon';

export class Projectile {
    x: number;
    y: number;
    vx: number;
    vy: number;
    damage: number;
    owner: ProjectileOwner;
    type: ProjectileType;
    sprite: Sprite | null;
    alive = true;

    // Homing missile fields
    homing = false;
    homingTrackDist = 64;
    homingMinDist = 16;
    homingSpeed = 20;

    private width: number;
    private height: number;

    constructor(
        x: number, y: number,
        vx: number, vy: number,
        damage: number,
        owner: ProjectileOwner,
        type: ProjectileType,
        sprite: Sprite | null,
    ) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.owner = owner;
        this.type = type;
        this.sprite = sprite;
        this.width = sprite ? sprite.width : 4;
        this.height = sprite ? sprite.height : 4;
    }

    getRect(): Rect {
        return { x: this.x, y: this.y, w: this.width, h: this.height };
    }

    update(dt: number, targetX?: number, targetY?: number): void {
        if (!this.alive) return;

        // Homing guidance toward target
        if (this.homing && targetX !== undefined && targetY !== undefined) {
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > this.homingMinDist && dist < this.homingTrackDist * 10) {
                const nx = dx / dist;
                const ny = dy / dist;
                this.vx += nx * this.homingSpeed * dt * 60;
                this.vy += ny * this.homingSpeed * dt * 60;

                // Clamp to max homing speed
                const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (currentSpeed > this.homingSpeed) {
                    this.vx = (this.vx / currentSpeed) * this.homingSpeed;
                    this.vy = (this.vy / currentSpeed) * this.homingSpeed;
                }
            }
        }

        this.x += this.vx * dt * 60;
        this.y += this.vy * dt * 60;

        // Animate sprite
        if (this.sprite) {
            this.sprite.update(dt * 1000);
        }

        // Kill if out of bounds
        if (isOutOfBounds(this.getRect())) {
            this.alive = false;
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (!this.alive) return;

        if (this.sprite) {
            this.sprite.drawAt(ctx, this.x, this.y);
        } else {
            // Fallback colored rectangle
            ctx.fillStyle = this.owner === 'player' ? '#0f0' : '#f00';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}
