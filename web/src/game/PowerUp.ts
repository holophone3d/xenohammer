/**
 * Power-up collectibles — dropped by destroyed enemies.
 * Types: armor (+50), shield (+50), weapon (+500 score).
 * Section 10.5 of SPEC.md.
 */

import { AssetLoader } from '../engine';
import { VELOCITY_DIVISOR } from '../data/ships';
import { Rect, PLAY_AREA_H } from './Collision';

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
    private glowSprite: HTMLImageElement | null = null;

    constructor(x: number, y: number, type: PowerUpType, assets?: AssetLoader | null) {
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.type = type;

        if (assets) {
            try { this.sprite = assets.getImage('powerup'); } catch { /* not available */ }
            try { this.glowSprite = assets.getImage('Particle'); } catch { /* not available */ }
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

        // Green glow on top (C++ GL_Handler.cpp:554-582, drawn as GL overlay)
        // C++ uses Particle.bmp textured quad, additive blend, glColor4f(0,1,0,0.7)
        // Powerup sprite is 30×16px. Glow centered on sprite.
        if (this.glowSprite) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.7;
            const gw = 70, gh = 50;
            const gcx = this.x + POWERUP_W / 2;   // center of 30px-wide sprite
            const gcy = this.y + POWERUP_H / 2;   // center of 16px-tall sprite
            if (!PowerUp._glowCanvas) {
                PowerUp._glowCanvas = document.createElement('canvas');
            }
            const cv = PowerUp._glowCanvas;
            if (cv.width !== gw || cv.height !== gh) {
                cv.width = gw;
                cv.height = gh;
            }
            const gc = cv.getContext('2d')!;
            gc.clearRect(0, 0, gw, gh);
            gc.drawImage(this.glowSprite, 0, 0, gw, gh);
            gc.globalCompositeOperation = 'multiply';
            gc.fillStyle = '#0f0';
            gc.fillRect(0, 0, gw, gh);
            gc.globalCompositeOperation = 'source-over';
            ctx.drawImage(cv, gcx - gw / 2, gcy - gh / 2);
            ctx.restore();
        }
    }

    private static _glowCanvas: HTMLCanvasElement | null = null;

    getRect(): Rect {
        return { x: this.x, y: this.y, w: POWERUP_W, h: POWERUP_H };
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
