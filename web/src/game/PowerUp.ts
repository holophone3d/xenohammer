/**
 * Power-up collectibles — dropped by destroyed enemies.
 * Types: health (restores armor), shield (restores shields), weapon (boosts damage).
 */

import { Sprite, AssetLoader } from '../engine';
import { Rect, PLAY_AREA_H } from './Collision';

export type PowerUpType = 'health' | 'shield' | 'weapon';

const POWERUP_SPEED = 1.5;        // base descent speed (multiplied by dt*60)
const POWERUP_SIZE = 16;          // fallback collision/render size
const HEALTH_RESTORE = 50;        // armor points restored
const SHIELD_RESTORE = 75;        // shield points restored
const WEAPON_BOOST_DURATION = 10; // seconds of boosted damage

/** Weights for random type selection */
const TYPE_WEIGHTS: Array<{ type: PowerUpType; weight: number }> = [
    { type: 'health', weight: 0.45 },
    { type: 'shield', weight: 0.35 },
    { type: 'weapon', weight: 0.20 },
];

export class PowerUp {
    x: number;
    y: number;
    type: PowerUpType;
    sprite: Sprite | null = null;
    active = true;
    speed: number;

    private bobTimer = 0;
    private bobAmplitude = 2;
    private baseX: number;

    constructor(x: number, y: number, type: PowerUpType) {
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.type = type;
        this.speed = POWERUP_SPEED;
    }

    /** Load sprite from asset loader. Call after construction. */
    loadSprite(assets: AssetLoader): void {
        const prefix = `powerup_${this.type}`;
        try {
            const img = assets.getImage(prefix);
            this.sprite = new Sprite([img], 100);
        } catch {
            // Single-frame fallback; try numbered frames
            try {
                const frames: HTMLImageElement[] = [];
                for (let i = 0; i < 4; i++) {
                    frames.push(assets.getImage(`${prefix}${i.toString().padStart(2, '0')}`));
                }
                this.sprite = new Sprite(frames, 150);
            } catch {
                // No sprite available
            }
        }
    }

    update(dt: number): void {
        if (!this.active) return;

        // Drift downward
        this.y += this.speed * dt * 60;

        // Gentle horizontal bob
        this.bobTimer += dt * 3;
        this.x = this.baseX + Math.sin(this.bobTimer) * this.bobAmplitude;

        // Animate sprite
        if (this.sprite) {
            this.sprite.update(dt * 1000);
        }

        // Deactivate if off-screen
        if (this.y > PLAY_AREA_H + 32) {
            this.active = false;
        }
    }

    render(ctx: CanvasRenderingContext2D): void {
        if (!this.active) return;

        if (this.sprite) {
            this.sprite.drawAt(ctx, this.x, this.y);
        } else {
            // Fallback colored diamond
            const cx = this.x + POWERUP_SIZE / 2;
            const cy = this.y + POWERUP_SIZE / 2;
            const half = POWERUP_SIZE / 2;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(cx, cy - half);
            ctx.lineTo(cx + half, cy);
            ctx.lineTo(cx, cy + half);
            ctx.lineTo(cx - half, cy);
            ctx.closePath();

            switch (this.type) {
                case 'health':
                    ctx.fillStyle = '#0f0';
                    break;
                case 'shield':
                    ctx.fillStyle = '#00f';
                    break;
                case 'weapon':
                    ctx.fillStyle = '#ff0';
                    break;
            }
            ctx.fill();

            // Label
            ctx.fillStyle = '#fff';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.type[0].toUpperCase(), cx, cy + 3);
            ctx.restore();
        }
    }

    getRect(): Rect {
        const w = this.sprite ? this.sprite.width : POWERUP_SIZE;
        const h = this.sprite ? this.sprite.height : POWERUP_SIZE;
        return { x: this.x, y: this.y, w, h };
    }

    /** Get the effect value of this power-up */
    getHealthRestore(): number {
        return this.type === 'health' ? HEALTH_RESTORE : 0;
    }

    getShieldRestore(): number {
        return this.type === 'shield' ? SHIELD_RESTORE : 0;
    }

    getWeaponBoostDuration(): number {
        return this.type === 'weapon' ? WEAPON_BOOST_DURATION : 0;
    }

    /** Randomly choose a power-up type based on weighted distribution. */
    static randomType(): PowerUpType {
        const roll = Math.random();
        let cumulative = 0;
        for (const entry of TYPE_WEIGHTS) {
            cumulative += entry.weight;
            if (roll <= cumulative) return entry.type;
        }
        return 'health';
    }

    /** Check if a power-up should drop based on enemy drop chance. */
    static shouldDrop(dropChance: number): boolean {
        return Math.random() < dropChance;
    }

    /**
     * Create a power-up at the given position with a random type.
     * Returns null if the drop chance fails.
     */
    static trySpawn(x: number, y: number, dropChance: number, assets: AssetLoader | null): PowerUp | null {
        if (!PowerUp.shouldDrop(dropChance)) return null;
        const pu = new PowerUp(x, y, PowerUp.randomType());
        if (assets) pu.loadSprite(assets);
        return pu;
    }
}
