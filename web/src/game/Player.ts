/**
 * Player ship — keyboard-controlled movement, 5 weapon slots, power management.
 * Speeds are in px/frame, applied once per fixed 60 fps tick.
 */

import { Input, Sprite, AssetLoader } from '../engine';
import {
    PLAYER_SHIP, PLAYER_START, PLAYER_WEAPON_SLOTS, WEAPONS,
    POWER_MULTIPLIERS, SHIELD_REGEN_INTERVAL, SHIELD_REGEN_DELAY,
    VELOCITY_DIVISOR,
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

    /** Reset combat state for a new level, preserving PowerPlant upgrades */
    resetForLevel(): void {
        this.x = PLAYER_START.x;
        this.y = PLAYER_START.y;
        this.armor = this.maxArmor;
        this.shields = this.maxShields;
        this.alive = true;
        this.lastHitTime = 0;
        this.lastRegenTime = 0;
        this.spriteFrame = 8;
        // Reset weapon fire timers
        for (const w of this.weapons) {
            w.lastFired = 0;
        }
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

        const moveScale = dt * 1000 / VELOCITY_DIVISOR;
        this.x += mx * currentSpeed * moveScale;
        this.y += my * currentSpeed * moveScale;

        // Clamp to play area
        const w = this.sprite ? this.sprite.width : 48;
        const h = this.sprite ? this.sprite.height : 48;
        const clamped = clampToPlayArea(this.x, this.y, w, h);
        this.x = clamped.x;
        this.y = clamped.y;

        // Sprite frame: moving right → frame decreases (toward 0), left → increases (toward 16)
        // Matches original C++ PlayerShip.cpp: hori_axis>0 → curr_frame--, hori_axis<0 → curr_frame++
        if (mx > 0) {
            if (this.spriteFrame > 0) this.spriteFrame--;
        } else if (mx < 0) {
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

        // Draw sprite first, then shield on top (additive-style)
        if (this.sprite) {
            this.sprite.drawAt(ctx, this.x, this.y);
        } else {
            ctx.fillStyle = '#0f0';
            ctx.fillRect(this.x, this.y, 48, 48);
        }

        // Shield bubble — additive-blended radial gradient mimicking GL_SRC_ALPHA,GL_ONE
        // Original: Shield.bmp texture with glColor4f(0.3,0.6,0.9, shields/300)
        if (this.shields > 0) {
            const cx = this.x + 38;
            const cy = this.y - 24 + 44.5;
            const rx = 64.5;
            const ry = 44.5;
            const shieldAlpha = Math.min(1, this.shields / this.maxShields);

            ctx.save();
            ctx.globalCompositeOperation = 'lighter'; // additive blending

            // Radial gradient: bright center fading to transparent edge
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
            grad.addColorStop(0, `rgba(77,153,230,${0.5 * shieldAlpha})`);
            grad.addColorStop(0.4, `rgba(77,153,230,${0.35 * shieldAlpha})`);
            grad.addColorStop(0.7, `rgba(60,130,210,${0.2 * shieldAlpha})`);
            grad.addColorStop(1, `rgba(40,100,180,0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
            ctx.fill();

            // Second pass — brighter inner core for glow punch
            const grad2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx * 0.5);
            grad2.addColorStop(0, `rgba(150,200,255,${0.3 * shieldAlpha})`);
            grad2.addColorStop(1, 'rgba(77,153,230,0)');
            ctx.fillStyle = grad2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx * 0.6, ry * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    }

    /** Emit engine flame particles. Call from GameManager each frame. */
    emitEngineFlame(particles: import('../engine').ParticleSystem): void {
        if (!this.alive) return;
        const gVal = Math.random() * 0.4;
        particles.emit(this.x + 38, this.y + 47, 1, {
            color: { r: 1.0, g: gVal, b: gVal },
            speed: 15 + Math.random() * 10,
            life: 0.05 + Math.random() * 0.1,
            fade: 8,
            direction: Math.PI * 0.97,
            spread: 0.3,
        });
    }
}
