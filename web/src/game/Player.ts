/**
 * Player ship — keyboard-controlled movement, 5 weapon slots, power management.
 */

import { Input, Sprite, AssetLoader } from '../engine';
import { PLAYER_SHIP, PLAYER_START, PLAYER_SPEED_INCREMENT, PLAYER_MAX_ENGINE_POWER } from '../data/ships';
import { Rect, clampToPlayArea } from './Collision';
import { Weapon } from './Weapon';
import { Projectile } from './Projectile';
import { PowerPlant } from './PowerPlant';

const SHIELD_REGEN_RATE = 5; // per second base
const SHIELD_REGEN_DELAY = 2000; // ms after last hit before regen starts

export class Player {
    x: number;
    y: number;
    armor: number;
    maxArmor: number;
    shields: number;
    maxShields: number;
    speed: number;
    sprite: Sprite | null = null;
    weapons: Weapon[];
    powerPlant: PowerPlant;
    alive = true;
    kills = 0;

    private lastHitTime = 0;

    constructor() {
        this.x = PLAYER_START.x;
        this.y = PLAYER_START.y;
        this.armor = PLAYER_SHIP.armor;
        this.maxArmor = PLAYER_SHIP.armor;
        this.shields = PLAYER_SHIP.shields;
        this.maxShields = PLAYER_SHIP.shields;
        this.speed = PLAYER_SHIP.speed;
        this.weapons = Weapon.createPlayerWeapons();
        this.powerPlant = new PowerPlant();
    }

    getRect(): Rect {
        const w = this.sprite ? this.sprite.width : 48;
        const h = this.sprite ? this.sprite.height : 48;
        return { x: this.x, y: this.y, w, h };
    }

    update(dt: number, input: Input, now: number): void {
        if (!this.alive) return;

        // --- Power setting switches ---
        if (input.isKeyPressed(Input.KEY_Q)) this.powerPlant.selectSetting(0);
        if (input.isKeyPressed(Input.KEY_W)) this.powerPlant.selectSetting(1);
        if (input.isKeyPressed(Input.KEY_E)) this.powerPlant.selectSetting(2);

        // --- Movement ---
        const engineBonus = Math.min(
            this.powerPlant.getEngineSpeedBonus(),
            PLAYER_SPEED_INCREMENT * PLAYER_MAX_ENGINE_POWER,
        );
        const currentSpeed = (this.speed + engineBonus) * 60; // pixels per second

        let mx = 0;
        let my = 0;
        if (input.isKeyDown(Input.LEFT)) mx -= 1;
        if (input.isKeyDown(Input.RIGHT)) mx += 1;
        if (input.isKeyDown(Input.UP)) my -= 1;
        if (input.isKeyDown(Input.DOWN)) my += 1;

        // Normalize diagonal movement
        if (mx !== 0 && my !== 0) {
            const inv = 1 / Math.SQRT2;
            mx *= inv;
            my *= inv;
        }

        this.x += mx * currentSpeed * dt;
        this.y += my * currentSpeed * dt;

        // Clamp to play area
        const w = this.sprite ? this.sprite.width : 48;
        const h = this.sprite ? this.sprite.height : 48;
        const clamped = clampToPlayArea(this.x, this.y, w, h);
        this.x = clamped.x;
        this.y = clamped.y;

        // --- Shield regeneration ---
        if (now - this.lastHitTime > SHIELD_REGEN_DELAY && this.shields < this.maxShields) {
            const regenRate = SHIELD_REGEN_RATE * this.powerPlant.getShieldRegenMultiplier();
            this.shields = Math.min(this.maxShields, this.shields + regenRate * dt);
        }

        // --- Update sprite ---
        if (this.sprite) {
            // Pick directional frame based on movement
            if (mx === 0 && my === 0) {
                // Center frame
                this.sprite.currentFrame = 0;
            } else {
                const angle = Math.atan2(my, mx);
                const normalizedAngle = ((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2);
                this.sprite.currentFrame = Math.floor(normalizedAngle * PLAYER_SHIP.frameCount) % PLAYER_SHIP.frameCount;
            }
        }
    }

    /** Fire all weapons if space is held. Returns new projectiles. */
    tryFire(input: Input, now: number, assets: AssetLoader | null): Projectile[] {
        if (!this.alive || !input.isKeyDown(Input.SPACE)) return [];

        const projectiles: Projectile[] = [];
        const multipliers = [
            this.powerPlant.getBlasterMultiplier(),
            this.powerPlant.getLeftTurretMultiplier(),
            this.powerPlant.getRightTurretMultiplier(),
            this.powerPlant.getLeftMissileMultiplier(),
            this.powerPlant.getRightMissileMultiplier(),
        ];

        for (let i = 0; i < this.weapons.length; i++) {
            const weapon = this.weapons[i];
            const proj = weapon.fire(this.x, this.y, now, 'player', multipliers[i], assets);
            if (proj) projectiles.push(proj);
        }

        return projectiles;
    }

    takeDamage(amount: number, now: number): void {
        this.lastHitTime = now;

        if (this.shields > 0) {
            const absorbed = Math.min(this.shields, amount);
            this.shields -= absorbed;
            amount -= absorbed;
        }
        this.armor -= amount;
        if (this.armor <= 0) {
            this.armor = 0;
            this.alive = false;
        }
    }

    /** Load sprite frames from assets */
    loadSprite(assets: AssetLoader): void {
        try {
            const frames: HTMLImageElement[] = [];
            for (let i = 0; i < PLAYER_SHIP.frameCount; i++) {
                const id = `${PLAYER_SHIP.spritePrefix}${i.toString().padStart(2, '0')}`;
                frames.push(assets.getImage(id));
            }
            this.sprite = new Sprite(frames, 100);
        } catch {
            // Sprite frames not available
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (!this.alive) return;
        if (this.sprite) {
            this.sprite.drawAt(ctx, this.x, this.y);
        } else {
            ctx.fillStyle = '#0f0';
            ctx.fillRect(this.x, this.y, 48, 48);
        }
    }
}
