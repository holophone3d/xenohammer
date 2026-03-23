/**
 * Weapon system — fire rate limiting, projectile creation, power draw.
 */

import { Sprite, AssetLoader } from '../engine';
import { WEAPONS, WeaponConfig, TURRET_SPEEDS } from '../data/ships';
import { Projectile, ProjectileOwner, ProjectileType } from './Projectile';

export class Weapon {
    config: WeaponConfig;
    type: ProjectileType;
    offsetX: number;
    offsetY: number;
    angle: number;          // degrees (0 = up, 90 = right, etc.)
    defaultAngle: number;
    lastFireTime = 0;
    enabled = true;

    constructor(
        type: ProjectileType,
        config: WeaponConfig,
        offsetX: number,
        offsetY: number,
        angle = 0,
    ) {
        this.type = type;
        this.config = config;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.angle = angle;
        this.defaultAngle = angle;
    }

    canFire(now: number, powerMultiplier: number): boolean {
        if (!this.enabled) return false;
        const effectiveRate = this.config.fireRate / powerMultiplier;
        return now - this.lastFireTime >= effectiveRate;
    }

    fire(
        shipX: number,
        shipY: number,
        now: number,
        owner: ProjectileOwner,
        powerMultiplier: number,
        assets: AssetLoader | null,
    ): Projectile | null {
        if (!this.canFire(now, powerMultiplier)) return null;
        this.lastFireTime = now;

        const spawnX = shipX + this.offsetX;
        const spawnY = shipY + this.offsetY;

        // Calculate velocity based on angle
        const rad = (this.angle - 90) * (Math.PI / 180);
        let speed = this.config.projectileSpeed;

        // Turrets have angle-dependent speed
        if (this.type === 'turret') {
            const snapAngle = Math.round(this.angle / 45) * 45 % 360;
            speed = TURRET_SPEEDS[snapAngle] ?? this.config.projectileSpeed;
        }

        const vx = Math.cos(rad) * speed;
        const vy = Math.sin(rad) * speed;

        // Build sprite if assets available
        let sprite: Sprite | null = null;
        if (assets) {
            try {
                const frames: HTMLImageElement[] = [];
                for (let i = 0; i < this.config.frameCount; i++) {
                    const id = `${this.config.spritePrefix}${i.toString().padStart(2, '0')}`;
                    frames.push(assets.getImage(id));
                }
                sprite = new Sprite(frames, 100);
            } catch {
                // Sprite frames not loaded — fallback to colored rect
            }
        }

        const damage = this.config.damage * powerMultiplier;
        const proj = new Projectile(spawnX, spawnY, vx, vy, damage, owner, this.type, sprite);

        // Set homing properties for missiles
        if (this.config.homing) {
            proj.homing = true;
            proj.homingTrackDist = this.config.homingTrackDist ?? 64;
            proj.homingMinDist = this.config.homingMinDist ?? 16;
            proj.homingSpeed = this.config.homingSpeed ?? 20;
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
        return new Weapon(weaponType, config, offsetX, offsetY, 180);
    }
}
