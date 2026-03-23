/**
 * Player ship — keyboard-controlled movement, 5 weapon slots, power management.
 * Speeds are in px/frame, applied once per fixed 60 fps tick.
 */

import { Input, Sprite, AssetLoader } from '../engine';
import {
    PLAYER_SHIP, PLAYER_START, PLAYER_WEAPON_SLOTS, WEAPONS,
    POWER_MULTIPLIERS, SHIELD_REGEN_INTERVAL, SHIELD_REGEN_DELAY,
} from '../data/ships';
import { Rect, clampToPlayArea } from './Collision';
import { Weapon } from './Weapon';
import { Projectile } from './Projectile';
import { PowerPlant } from './PowerPlant';

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
    private lastRegenTime = 0;
    private spriteFrame = 8;

    constructor() {
        this.x = PLAYER_START.x;
        this.y = PLAYER_START.y;
        this.armor = PLAYER_SHIP.armor;
        this.maxArmor = PLAYER_SHIP.armor;
        this.shields = PLAYER_SHIP.shields;
        this.maxShields = PLAYER_SHIP.shields;
        this.speed = PLAYER_SHIP.speed;
        this.weapons = PLAYER_WEAPON_SLOTS.map(
            slot => new Weapon(slot.type, WEAPONS[slot.type], slot.offsetX, slot.offsetY, slot.defaultAngle),
        );
        this.powerPlant = new PowerPlant();
    }

    getRect(): Rect {
        const w = this.sprite ? this.sprite.width : 48;
        const h = this.sprite ? this.sprite.height : 48;
        return { x: this.x, y: this.y, w, h };
    }

    update(dt: number, input: Input, now: number): void {
        if (!this.alive) return;

        // Power setting switches
        if (input.isKeyPressed(Input.KEY_Q)) this.powerPlant.selectSetting(0);
        if (input.isKeyPressed(Input.KEY_W)) this.powerPlant.selectSetting(1);
        if (input.isKeyPressed(Input.KEY_E)) this.powerPlant.selectSetting(2);

        // Movement — base speed + engine bonus, px/frame
        const currentSpeed = this.speed + this.powerPlant.getEngineSpeedBonus();

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

        this.x += mx * currentSpeed;
        this.y += my * currentSpeed;

        // Clamp to play area
        const w = this.sprite ? this.sprite.width : 48;
        const h = this.sprite ? this.sprite.height : 48;
        const clamped = clampToPlayArea(this.x, this.y, w, h);
        this.x = clamped.x;
        this.y = clamped.y;

        // Sprite frame: bank left (<8), straight (8), bank right (>8), 1 step per tick
        if (mx < 0) {
            if (this.spriteFrame > 0) this.spriteFrame--;
        } else if (mx > 0) {
            if (this.spriteFrame < 16) this.spriteFrame++;
        } else {
            if (this.spriteFrame < 8) this.spriteFrame++;
            else if (this.spriteFrame > 8) this.spriteFrame--;
        }
        if (this.sprite) {
            this.sprite.currentFrame = this.spriteFrame;
        }

        // Shield regeneration — timer-based, every 150 ms, after 2 s damage delay
        if (now - this.lastHitTime > SHIELD_REGEN_DELAY && this.shields < this.maxShields) {
            if (now - this.lastRegenTime >= SHIELD_REGEN_INTERVAL) {
                this.lastRegenTime = now;
                const regenAmount = this.powerPlant.getShieldRegenMultiplier();
                this.shields = Math.min(this.maxShields, this.shields + regenAmount);
            }
        }
    }

    /** Fire all weapons if Space is held. Returns new projectiles. */
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
            weapon.powerMultiplier = multipliers[i];
            const proj = weapon.fire(this.x, this.y, now, assets);
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

    /** Load 17 sprite frames (PlayerSprite00–PlayerSprite16) */
    loadSprite(assets: AssetLoader): void {
        try {
            const frames: HTMLImageElement[] = [];
            for (let i = 0; i < 17; i++) {
                const id = `PlayerSprite${i.toString().padStart(2, '0')}`;
                frames.push(assets.getImage(id));
            }
            this.sprite = new Sprite(frames, 100);
            this.sprite.currentFrame = 8;
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
