/**
 * Enemy ship — base class with variant factories for LightFighter, FighterB, Gunship.
 *
 * Stats per SPEC.md §6:
 *   LightFighter: 10 armor, 0 shields, speed 10, 32 frames, fire 400ms, 100pts
 *   FighterB:     30 armor, 0 shields, speed 12, 32 frames, fire 1000ms, 250pts
 *   Gunship:     100 armor, 0 shields, max speed 9, 17 frames, fire 600ms, 500pts
 */

import { Sprite, AssetLoader } from '../engine';
import { ShipConfig, LIGHT_FIGHTER, FIGHTER_B, GUNSHIP, VELOCITY_DIVISOR } from '../data/ships';
import type { EnemyType } from '../data/levels';
import { Rect } from './Collision';
import { Weapon } from './Weapon';
import { Projectile } from './Projectile';
import { AIBehavior, LightFighterAI, FighterBAI, GunshipAI } from './AI';

export class Enemy {
    x: number;
    y: number;
    vx = 0;
    vy = 0;
    armor: number;
    shields: number;
    config: ShipConfig;
    type: EnemyType;
    sprite: Sprite | null = null;
    weapons: Weapon[] = [];
    ai: AIBehavior;
    alive = true;
    wantsFire = false;
    /** Heading angle in radians (used by AI to set direction) */
    angle = 0;
    turretAngle = 0;

    /** Default dimensions if sprite not loaded */
    private defaultWidth: number;
    private defaultHeight: number;

    get width(): number {
        return this.sprite ? this.sprite.width : this.defaultWidth;
    }

    get height(): number {
        return this.sprite ? this.sprite.height : this.defaultHeight;
    }

    constructor(
        x: number,
        y: number,
        config: ShipConfig,
        type: EnemyType,
        ai: AIBehavior,
        defaultWidth = 32,
        defaultHeight = 32,
    ) {
        this.x = x;
        this.y = y;
        this.config = config;
        this.type = type;
        this.armor = config.armor;
        this.shields = config.shields;
        this.ai = ai;
        this.defaultWidth = defaultWidth;
        this.defaultHeight = defaultHeight;

        // Create weapons from config offsets
        for (const offset of config.weaponOffsets) {
            const weaponType = type === 'gunship' ? 'enemyCannon' as const : 'enemyBlast' as const;
            this.weapons.push(Weapon.createEnemyWeapon(weaponType, offset.x, offset.y));
        }
    }

    getRect(): Rect {
        return { x: this.x, y: this.y, w: this.width, h: this.height };
    }

    update(dt: number, playerX: number, playerY: number): void {
        if (!this.alive) return;

        // Delegate movement/state to AI
        this.ai.update(this, playerX, playerY, dt);

        // Apply velocity (time-scaled: velocity × dt_ms / 32, matching original ClanLib show())
        const moveScale = dt * 1000 / VELOCITY_DIVISOR;
        this.x += this.vx * moveScale;
        this.y += this.vy * moveScale;

        // Update sprite frame based on heading angle
        this.updateSpriteFrame();
    }

    private updateSpriteFrame(): void {
        if (!this.sprite || this.sprite.frames.length <= 1) return;

        if (this.config.frameCount === 32) {
            // 32 directional frames: frame 0=RIGHT, 8=UP, 16=LEFT, 24=DOWN
            // this.angle is screen-coords atan2(dy,dx): 0=right, π/2=down, -π/2=up
            // Negate to convert to math convention, then map to [0,31]
            const raw = Math.round(-this.angle * 16 / Math.PI);
            this.sprite.currentFrame = ((raw % 32) + 32) % 32;
        } else if (this.config.frameCount === 17) {
            // 17-frame gunship: frame 8=straight, frame 0=banked right, frame 16=banked left
            // Matches original GunshipAI: RIGHT accel → frame--, LEFT accel → frame++
            const maxSpeed = this.config.speed || 9;
            const bankRatio = Math.max(-1, Math.min(1, this.vx / maxSpeed));
            // Negative vx (going left) → higher frame (left bank)
            this.sprite.currentFrame = Math.round(8 - bankRatio * 8);
            this.sprite.currentFrame = Math.max(0, Math.min(16, this.sprite.currentFrame));
        }
    }

    /** Attempt to fire weapons, returning spawned projectiles. */
    tryFire(now: number, assets: AssetLoader | null): Projectile[] {
        if (!this.wantsFire || !this.alive) return [];

        const projectiles: Projectile[] = [];

        // Pass ship velocity to enemy weapons (enemyBlast uses 2× ship vel)
        for (const weapon of this.weapons) {
            weapon.setEnemyVelocity(this.vx, this.vy);
        }

        // C++ fires ALL weapons simultaneously (gunship fires both cannons at once)
        for (const weapon of this.weapons) {
            const proj = weapon.fire(this.x, this.y, now, assets);
            if (proj) projectiles.push(proj);
        }
        return projectiles;
    }

    takeDamage(amount: number): void {
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

    /** Load sprite frames from assets using config.spritePrefix + zero-padded frame numbers */
    loadSprite(assets: AssetLoader): void {
        try {
            const frames: HTMLImageElement[] = [];
            for (let i = 0; i < this.config.frameCount; i++) {
                const id = `${this.config.spritePrefix}${i.toString().padStart(2, '0')}`;
                frames.push(assets.getImage(id));
            }
            this.sprite = new Sprite(frames, 100);
        } catch {
            // Sprite frames not available — fallback to colored rect
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (!this.alive) return;
        if (this.sprite) {
            this.sprite.drawAt(ctx, this.x, this.y);
        } else {
            ctx.fillStyle = '#f44';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    // --- Factory methods ---

    /** Light Fighter: 10 armor, speed 10, 32 frames, enemyBlaster, ~32px */
    static createLightFighter(x: number, y: number): Enemy {
        return new Enemy(x, y, LIGHT_FIGHTER, 'lightfighter', new LightFighterAI(), 32, 32);
    }

    /** Heavy Fighter: 30 armor, speed 12, 32 frames, enemyBlaster, ~32px */
    static createFighterB(x: number, y: number): Enemy {
        return new Enemy(x, y, FIGHTER_B, 'fighterb', new FighterBAI(), 32, 32);
    }

    /** Gunship: 100 armor, max speed 9, 17 frames, dual enemyCannons, ~64px */
    static createGunship(x: number, y: number): Enemy {
        return new Enemy(x, y, GUNSHIP, 'gunship', new GunshipAI(), 64, 64);
    }

    static createByType(type: EnemyType, x: number, y: number): Enemy {
        switch (type) {
            case 'lightfighter': return Enemy.createLightFighter(x, y);
            case 'fighterb': return Enemy.createFighterB(x, y);
            case 'gunship': return Enemy.createGunship(x, y);
            case 'frigate': return Enemy.createGunship(x, y); // frigate uses gunship as base for now
        }
    }
}
