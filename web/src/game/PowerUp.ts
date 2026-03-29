/**
 * Power-up collectibles — dropped by destroyed enemies.
 * Types: armor (+50), shield (+50), weapon (+500 score).
 * Section 10.5 of SPEC.md.
 */

import { AssetLoader } from '../engine';
import { VELOCITY_DIVISOR } from '../data/ships';
import { Rect, Collider, PLAY_AREA_H } from './Collision';

export type PowerUpType = 'armor' | 'shield' | 'weapon';

const POWERUP_W = 30;
const POWERUP_H = 16;
const DRIFT_SPEED = 2;           // 2 px/tick downward
const BOB_AMPLITUDE = 3;
const BOB_FREQUENCY = 3;

const ARMOR_RESTORE = 50;
const SHIELD_RESTORE = 50;
const WEAPON_SCORE_BONUS = 500;

export class PowerUp {
    x: number;
    y: number;
    type: PowerUpType;
    active = true;
    private baseX: number;
    private bobTimer = 0;
    private sprite: HTMLImageElement | null = null;

    constructor(x: number, y: number, type: PowerUpType, assets?: AssetLoader | null) {
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.type = type;

        if (assets) {
            try { this.sprite = assets.getImage('powerup'); } catch { /* not available */ }
        }
    }

    update(dt: number): void {
        if (!this.active) return;

        // Gentle downward drift (time-scaled like all game objects)
        this.y += DRIFT_SPEED * dt * 1000 / VELOCITY_DIVISOR;

        // Slight horizontal bob (sin wave)
        this.bobTimer += dt * BOB_FREQUENCY;
        this.x = this.baseX + Math.sin(this.bobTimer) * BOB_AMPLITUDE;

        if (this.y > PLAY_AREA_H + 32) {
            this.active = false;
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (!this.active) return;

        // Draw sprite first
        if (this.sprite) {
            ctx.drawImage(this.sprite, this.x, this.y);
        } else {
            switch (this.type) {
                case 'armor': ctx.fillStyle = '#0f0'; break;
                case 'shield': ctx.fillStyle = '#00f'; break;
                case 'weapon': ctx.fillStyle = '#ff0'; break;
            }
            ctx.fillRect(this.x, this.y, POWERUP_W, POWERUP_H);
        }

        // Green glow on top (C++ GL_Handler.cpp:554-582)
        // C++ stretches Particle.bmp onto a rect (±50×±30 = 100×60px quad),
        // creating an elliptical glow matching the rectangular powerup shape.
        // glColor4f(0,1,0,0.7), additive blend (GL_SRC_ALPHA, GL_ONE).
        {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            // Use scale transform to stretch a circular gradient into an ellipse
            const gcx = this.x + POWERUP_W / 2;  // center of sprite
            const gcy = this.y + POWERUP_H / 2;
            const rx = 35, ry = 20;    // half the C++ quad (50×30), trimmed for visible glow
            ctx.translate(gcx, gcy);
            ctx.scale(rx / ry, 1);     // stretch horizontally to match rectangular shape
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
            grad.addColorStop(0, 'rgba(0,255,0,0.7)');
            grad.addColorStop(0.3, 'rgba(0,255,0,0.5)');
            grad.addColorStop(0.6, 'rgba(0,255,0,0.2)');
            grad.addColorStop(1.0, 'rgba(0,255,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(-ry * (rx / ry), -ry, ry * 2 * (rx / ry), ry * 2);
            ctx.restore();
        }
    }

    getRect(): Rect {
        return { x: this.x, y: this.y, w: POWERUP_W, h: POWERUP_H };
    }

    getCollider(): Collider {
        return { x: this.x, y: this.y, w: POWERUP_W, h: POWERUP_H, mask: null };
    }

    getArmorRestore(): number {
        return this.type === 'armor' ? ARMOR_RESTORE : 0;
    }

    getShieldRestore(): number {
        return this.type === 'shield' ? SHIELD_RESTORE : 0;
    }

    getScoreBonus(): number {
        return this.type === 'weapon' ? WEAPON_SCORE_BONUS : 0;
    }

    /**
     * Try to drop a power-up based on random chance.
     * Returns PowerUp or null based on the roll.
     */
    static tryDrop(x: number, y: number, dropChance: number, assets?: AssetLoader | null): PowerUp | null {
        if (Math.random() >= dropChance) return null;
        const types: PowerUpType[] = ['armor', 'shield', 'weapon'];
        const type = types[Math.floor(Math.random() * types.length)];
        return new PowerUp(x, y, type, assets);
    }
}
