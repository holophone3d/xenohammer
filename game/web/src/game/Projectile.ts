/**
 * Projectile — position, velocity, damage, homing, bounds checking.
 * Velocities are in px/frame, applied once per fixed-rate tick.
 */

import { Sprite } from '../engine';
import { VELOCITY_DIVISOR } from '../data/ships';
import { Rect, Collider, isOutOfBounds } from './Collision';

export type ProjectileOwner = 'player' | 'enemy';

/** A live object that a homing missile can lock onto. */
export interface HomingTarget {
    readonly centerX: number;
    readonly centerY: number;
    readonly threat: number;   // higher = more dangerous (turrets > orbs > fighters)
    isAlive(): boolean;
}

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
    homingSpeed = 20;
    distanceTraveled = 0;
    homingArmed = false;          // true once 50px traveled
    homingTarget: HomingTarget | null = null;  // locked-on target
    /** Once within 48px of target, tracking stops permanently to prevent oscillation */
    private homingTracking = true;

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

    /** Returns true if this missile needs a (new) target assignment. */
    needsTarget(): boolean {
        if (!this.homing || !this.homingArmed) return false;
        return !this.homingTarget || !this.homingTarget.isAlive();
    }

    update(dt: number): void {
        if (!this.alive) return;
        this.prevX = this.x;
        this.prevY = this.y;

        const moveScale = dt * 1000 / VELOCITY_DIVISOR;

        // Track distance for homing arm
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.distanceTraveled += speed * moveScale;
        if (this.homing && !this.homingArmed && this.distanceTraveled > 50) {
            this.homingArmed = true;
        }

        // Homing guidance — C++ direct vector normalization (no gradual turning)
        const t = this.homingTarget;
        if (this.homing && this.homingArmed && t && t.isAlive()) {
            if (this.homingTracking) {
                const dx = t.centerX - this.x;
                const dy = t.centerY - this.y;
                const hyp = Math.sqrt(dx * dx + dy * dy);

                // Close-range: stop tracking permanently to prevent oscillation (C++ trak=64)
                if (hyp <= 48) {
                    this.homingTracking = false;
                } else {
                    // Snap velocity directly toward target at homing speed
                    this.vx = (dx * this.homingSpeed) / hyp;
                    this.vy = (dy * this.homingSpeed) / hyp;
                }
            }
            // When not tracking, missile keeps last velocity (flies straight through target)
        }

        // Move
        this.x += this.vx * moveScale;
        this.y += this.vy * moveScale;

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
