/**
 * Power-up collectibles — dropped by destroyed enemies.
 * Types: armor (+50), shield (+50), weapon (+500 score).
 * Section 10.5 of SPEC.md.
 */

import { AssetLoader } from '../engine';
import { VELOCITY_DIVISOR } from '../data/ships';
import { Rect, PLAY_AREA_H } from './Collision';

export type PowerUpType = 'armor' | 'shield' | 'weapon';

const POWERUP_SIZE = 16;
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

        // Green glow using Particle texture (C++ GL_Handler.cpp:554-582)
        // C++: center at (x+18, y+10), quad ±50×±30 = 100×60px, additive blend
        if (this.glowSprite) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.7;
            // Tint green by drawing into an offscreen canvas (or just draw the white particle — additive makes it glow)
            // The particle texture is white, so we colorize it green
            const gw = 100, gh = 60;
            const gx = this.x + 18 - gw / 2;
            const gy = this.y + 10 - gh / 2;
            // Draw particle stretched to glow size, tinted green via a temp canvas
            if (!PowerUp._glowCanvas) {
                PowerUp._glowCanvas = document.createElement('canvas');
                PowerUp._glowCanvas.width = 100;
                PowerUp._glowCanvas.height = 60;
            }
            const gc = PowerUp._glowCanvas.getContext('2d')!;
            gc.clearRect(0, 0, 100, 60);
            gc.drawImage(this.glowSprite, 0, 0, 100, 60);
            gc.globalCompositeOperation = 'source-in';
            gc.fillStyle = '#0f0';
            gc.fillRect(0, 0, 100, 60);
            gc.globalCompositeOperation = 'source-over';
            ctx.drawImage(PowerUp._glowCanvas, gx, gy);
            ctx.restore();
        }

        if (this.sprite) {
            ctx.drawImage(this.sprite, this.x, this.y);
        } else {
            switch (this.type) {
                case 'armor': ctx.fillStyle = '#0f0'; break;
                case 'shield': ctx.fillStyle = '#00f'; break;
                case 'weapon': ctx.fillStyle = '#ff0'; break;
            }
            ctx.fillRect(this.x, this.y, POWERUP_SIZE, POWERUP_SIZE);
        }
    }

    private static _glowCanvas: HTMLCanvasElement | null = null;

    getRect(): Rect {
        return { x: this.x, y: this.y, w: POWERUP_SIZE, h: POWERUP_SIZE };
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
