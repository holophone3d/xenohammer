/**
 * Enemy ship — base class with variant factories for LightFighter, FighterB, Gunship.
 */

import { Sprite, AssetLoader } from '../engine';
import { ShipConfig, LIGHT_FIGHTER, FIGHTER_B, GUNSHIP } from '../data/ships';
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
    turretAngle = 0;
    private animTimer = 0;

    constructor(
        x: number,
        y: number,
        config: ShipConfig,
        type: EnemyType,
        ai: AIBehavior,
    ) {
        this.x = x;
        this.y = y;
        this.config = config;
        this.type = type;
        this.armor = config.armor;
        this.shields = config.shields;
        this.ai = ai;

        // Create weapons from config offsets
        for (const offset of config.weaponOffsets) {
            const weaponType = type === 'gunship' ? 'enemyCannon' as const : 'enemyBlast' as const;
            this.weapons.push(Weapon.createEnemyWeapon(weaponType, offset.x, offset.y));
        }
    }

    getRect(): Rect {
        const w = this.sprite ? this.sprite.width : 32;
        const h = this.sprite ? this.sprite.height : 32;
        return { x: this.x, y: this.y, w, h };
    }

    update(dt: number, playerX: number, playerY: number): void {
        if (!this.alive) return;

        this.ai.update(this, playerX, playerY, dt);

        this.x += this.vx * dt * 60;
        this.y += this.vy * dt * 60;

        // Animate sprite frame based on movement direction
        this.animTimer += dt * 1000;
        if (this.sprite && this.animTimer > 100) {
            this.animTimer = 0;
            this.updateSpriteFrame();
        }
    }

    private updateSpriteFrame(): void {
        if (!this.sprite || this.sprite.frames.length <= 1) return;

        // Pick frame based on heading angle (32 or 17 directional frames)
        const angle = Math.atan2(this.vy, this.vx);
        const normalizedAngle = ((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2);
        const frameIndex = Math.floor(normalizedAngle * this.config.frameCount) % this.config.frameCount;
        this.sprite.currentFrame = frameIndex;
    }

    /** Attempt to fire all weapons, returning spawned projectiles. */
    tryFire(now: number, assets: AssetLoader | null): Projectile[] {
        if (!this.wantsFire || !this.alive) return [];

        const projectiles: Projectile[] = [];
        for (const weapon of this.weapons) {
            const proj = weapon.fire(this.x, this.y, now, 'enemy', 1.0, assets);
            if (proj) {
                projectiles.push(proj);
            }
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

    /** Load sprite frames from assets */
    loadSprite(assets: AssetLoader): void {
        try {
            const frames: HTMLImageElement[] = [];
            for (let i = 0; i < this.config.frameCount; i++) {
                const id = `${this.config.spritePrefix}${i.toString().padStart(2, '0')}`;
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
            ctx.fillStyle = '#f44';
            ctx.fillRect(this.x, this.y, 32, 32);
        }
    }

    // --- Factory methods ---

    static createLightFighter(x: number, y: number): Enemy {
        return new Enemy(x, y, LIGHT_FIGHTER, 'lightfighter', new LightFighterAI());
    }

    static createFighterB(x: number, y: number): Enemy {
        return new Enemy(x, y, FIGHTER_B, 'fighterb', new FighterBAI());
    }

    static createGunship(x: number, y: number): Enemy {
        return new Enemy(x, y, GUNSHIP, 'gunship', new GunshipAI());
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
