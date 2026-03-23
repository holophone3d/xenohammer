/**
 * Weapon system — fire rate limiting, projectile creation.
 * Velocities are in px/frame. Damage = baseDamage × powerMultiplier.
 */

import { Sprite, AssetLoader } from '../engine';
import { WeaponConfig, WEAPONS, TURRET_SPEEDS } from '../data/ships';
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
            // Turret: angle-dependent speed and direction
            const snapAngle = Math.round(this.angle / 45) * 45 % 360;
            const speed = TURRET_SPEEDS[snapAngle] ?? this.projectileSpeed;
            const rad = this.angle * (Math.PI / 180);
            vx = Math.sin(rad) * speed;
            vy = -Math.cos(rad) * speed;
        } else if (this.type === 'blaster' || this.type === 'missile') {
            // Blaster / Missile: straight up
            vx = 0;
            vy = -this.projectileSpeed;
        } else {
            // Enemy weapons: use angle (180° = straight down)
            const rad = this.angle * (Math.PI / 180);
            vx = Math.sin(rad) * this.projectileSpeed;
            vy = -Math.cos(rad) * this.projectileSpeed;
        }

        // Build sprite if assets available
        let sprite: Sprite | null = null;
        if (assets) {
            try {
                const frames: HTMLImageElement[] = [];
                for (let i = 0; i < this.spriteFrames; i++) {
                    const id = `${this.spritePrefix}${i.toString().padStart(2, '0')}`;
                    frames.push(assets.getImage(id));
                }
                sprite = new Sprite(frames, 100);
            } catch {
                // Sprite frames not loaded
            }
        }

        const actualDamage = this.damage * this.powerMultiplier;
        const proj = new Projectile(spawnX, spawnY, vx, vy, actualDamage, this.owner, sprite);

        if (this.homingEnabled) {
            proj.homing = true;
            proj.homingTrackDist = this.homingTrackDist;
            proj.homingMinDist = this.homingMinDist;
            proj.homingSpeed = this.homingSpeed;
        }

        return proj;
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
        return new Weapon(weaponType, config, offsetX, offsetY, 180, 'enemy');
    }
}
