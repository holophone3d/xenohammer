/**
 * Weapon system — fire rate limiting, projectile creation.
 * Velocities are in px/frame. Damage = baseDamage × powerMultiplier.
 */

import { Sprite, AssetLoader } from '../engine';
import { WeaponConfig, WEAPONS, TURRET_VELOCITY_TABLE } from '../data/ships';
import { Projectile, ProjectileOwner } from './Projectile';

export type WeaponType = 'blaster' | 'turret' | 'missile' | 'enemyBlast' | 'enemyCannon';

export class Weapon {
    type: WeaponType;
    damage: number;
    fireRate: number;
    projectileSpeed: number;
    angle: number;
    defaultAngle: number;
    powerMultiplier = 1;
    powerCell2 = 1;  // raw cell2 value for sprite frame selection (frame = cell2 - 1)
    spritePrefix: string;
    spriteFrames: number;
    offsetX: number;
    offsetY: number;
    owner: ProjectileOwner;
    lastFired = 0;
    enabled = true;

    // Homing config (for missiles)
    private homingEnabled = false;
    private homingTrackDist = 64;
    private homingMinDist = 16;
    private homingSpeed = 20;

    // Enemy velocity passthrough (for enemyBlast)
    private _enemyVx = 0;
    private _enemyVy = 0;

    constructor(
        type: WeaponType,
        config: WeaponConfig,
        offsetX: number,
        offsetY: number,
        angle = 0,
        owner: ProjectileOwner = 'player',
    ) {
        this.type = type;
        this.damage = config.damage;
        this.fireRate = config.fireRate;
        this.projectileSpeed = config.projectileSpeed;
        this.spritePrefix = config.spritePrefix;
        this.spriteFrames = config.frameCount;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.angle = angle;
        this.defaultAngle = angle;
        this.owner = owner;

        if (config.homing) {
            this.homingEnabled = true;
            this.homingTrackDist = config.homingTrackDist ?? 64;
            this.homingMinDist = config.homingMinDist ?? 16;
            this.homingSpeed = config.homingSpeed ?? 20;
        }
    }

    canFire(now: number): boolean {
        if (!this.enabled) return false;
        return now - this.lastFired >= this.fireRate;
    }

    fire(x: number, y: number, now: number, assets: AssetLoader | null): Projectile | null {
        if (!this.canFire(now)) return null;
        this.lastFired = now;

        const spawnX = x + this.offsetX;
        const spawnY = y + this.offsetY;

        let vx: number;
        let vy: number;

        if (this.type === 'turret') {
            // Turret: discrete 8-angle velocity table from original Projectile.cpp
            const snapAngle = ((Math.round(this.angle / 45) * 45) % 360 + 360) % 360;
            const entry = TURRET_VELOCITY_TABLE[snapAngle];
            if (entry) {
                vx = entry.dx;
                vy = entry.dy;
            } else {
                vx = 0;
                vy = -29;
            }
        } else if (this.type === 'blaster' || this.type === 'missile') {
            vx = 0;
            vy = -this.projectileSpeed;
        } else if (this.type === 'enemyCannon') {
            // Gunship cannon: fixed straight down per original
            vx = 0;
            vy = 21;
        } else {
            // enemyBlast: velocity set by caller via setEnemyVelocity()
            vx = this._enemyVx * 2;
            vy = this._enemyVy * 2;
        }

        // Build sprite if assets available
        let sprite: Sprite | null = null;
        if (assets) {
            try {
                const frames: HTMLImageElement[] = [];
                for (let i = 0; i < this.spriteFrames; i++) {
                    // Weapon sprites are 1-indexed, no padding: blaster_1, turret_1, torp_1, enemy_1
                    const id = `${this.spritePrefix}${i + 1}`;
                    frames.push(assets.getImage(id));
                }
                sprite = new Sprite(frames, 100);
            } catch {
                // Sprite frames not loaded
            }
        }

        // Set sprite frame based on power cell 2 (frame = cell2 - 1)
        // Each frame is a progressively larger/more powerful projectile sprite
        if (sprite) {
            const frameIdx = Math.max(0, Math.min(this.powerCell2 - 1, this.spriteFrames - 1));
            sprite.setFrame(frameIdx);
            sprite.loop = false;
        }

        const actualDamage = this.damage * this.powerMultiplier * this.powerCell2;
        const proj = new Projectile(spawnX, spawnY, vx, vy, actualDamage, this.owner, sprite, this.type);

        if (this.homingEnabled) {
            proj.homing = true;
            proj.homingTrackDist = this.homingTrackDist;
            proj.homingMinDist = this.homingMinDist;
            proj.homingSpeed = this.homingSpeed;
        }

        return proj;
    }

    /** Set enemy ship velocity for enemyBlast projectiles (2× ship vel). */
    setEnemyVelocity(vx: number, vy: number): void {
        this._enemyVx = vx;
        this._enemyVy = vy;
    }

    /** Rotate turret angle by delta degrees */
    rotateAngle(delta: number): void {
        this.angle = ((this.angle + delta) % 360 + 360) % 360;
    }

    resetAngle(): void {
        this.angle = this.defaultAngle;
    }

    static createPlayerWeapons(): Weapon[] {
        return [
            new Weapon('blaster', WEAPONS.blaster, 22, -12, 0),
            new Weapon('turret', WEAPONS.turret, -1, -5, 135),
            new Weapon('turret', WEAPONS.turret, 44, -5, 45),
            new Weapon('missile', WEAPONS.missile, 13, 0, 0),
            new Weapon('missile', WEAPONS.missile, 30, 0, 0),
        ];
    }

    static createEnemyWeapon(weaponType: 'enemyBlast' | 'enemyCannon', offsetX: number, offsetY: number): Weapon {
        const config = weaponType === 'enemyCannon' ? WEAPONS.enemyCannon : WEAPONS.enemyBlast;
        return new Weapon(weaponType, config, offsetX, offsetY, 0, 'enemy');
    }
}
