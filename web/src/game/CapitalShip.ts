/**
 * Frigate-class capital ship with destructible components.
 * Body, nose, wings, and turrets — each independently destroyable.
 * Turrets use TurretAI to track and fire at the player.
 *
 * Component offsets and armor values from game-constants.json capital_ships.frigate.
 */

import { Sprite, AssetLoader } from '../engine';
import { Rect, PLAY_AREA_W, PLAY_AREA_H } from './Collision';
import { Weapon } from './Weapon';
import { Projectile } from './Projectile';
import { WEAPONS } from '../data/ships';

// --- Frigate constants from game-constants.json ---
const FRIGATE_ARMOR = 900;
const FRIGATE_SHIELDS = 500;
const FRIGATE_SPEED = 0.4; // slow descent (multiplied by dt*60)

const BODY_WIDTH = 96;
const BODY_HEIGHT = 128;

// Component layout relative to ship center
const COMPONENT_DEFS = {
    nose:        { offsetX: 0,    offsetY: 112, armor: 900, width: 64, height: 48 },
    leftWing:    { offsetX: 62,   offsetY: 5,   armor: 300, width: 48, height: 64 },
    rightWing:   { offsetX: -62,  offsetY: 5,   armor: 300, width: 48, height: 64 },
    leftTurret:  { offsetX: 79,   offsetY: 37,  armor: 600, width: 32, height: 32, weaponX: 95, weaponY: 53, fireRate: 3000 },
    rightTurret: { offsetX: -47,  offsetY: 37,  armor: 600, width: 32, height: 32, weaponX: -31, weaponY: 53, fireRate: 3000 },
} as const;

// Nose weapon
const NOSE_WEAPON_X = 32;
const NOSE_WEAPON_Y = 212;

export interface ShipComponent {
    name: string;
    offsetX: number;
    offsetY: number;
    armor: number;
    maxArmor: number;
    destroyed: boolean;
    width: number;
    height: number;
    sprite: Sprite | null;
    destroyedSprite: Sprite | null;
}

interface Turret extends ShipComponent {
    weapon: Weapon;
    fireTimer: number;
    fireRate: number;
    turretAngle: number;
}

function makeComponent(name: string, def: { offsetX: number; offsetY: number; armor: number; width: number; height: number }): ShipComponent {
    return {
        name,
        offsetX: def.offsetX,
        offsetY: def.offsetY,
        armor: def.armor,
        maxArmor: def.armor,
        destroyed: false,
        width: def.width,
        height: def.height,
        sprite: null,
        destroyedSprite: null,
    };
}

function makeTurret(
    name: string,
    def: { offsetX: number; offsetY: number; armor: number; width: number; height: number; weaponX: number; weaponY: number; fireRate: number },
): Turret {
    return {
        ...makeComponent(name, def),
        weapon: Weapon.createEnemyWeapon('enemyBlast', def.weaponX, def.weaponY),
        fireTimer: 0,
        fireRate: def.fireRate,
        turretAngle: 180, // default: aim downward
    };
}

export class CapitalShip {
    x: number;
    y: number;
    body: ShipComponent;
    nose: ShipComponent;
    leftWing: ShipComponent;
    rightWing: ShipComponent;
    turrets: Turret[];
    alive = true;
    speed: number;
    shields: number;
    maxShields: number;

    private bodySprite: Sprite | null = null;
    private bodyDestroyedSprite: Sprite | null = null;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.speed = FRIGATE_SPEED;
        this.shields = FRIGATE_SHIELDS;
        this.maxShields = FRIGATE_SHIELDS;

        this.body = makeComponent('Body', {
            offsetX: 0, offsetY: 0,
            armor: FRIGATE_ARMOR, width: BODY_WIDTH, height: BODY_HEIGHT,
        });
        this.nose = makeComponent('Nose', COMPONENT_DEFS.nose);
        this.leftWing = makeComponent('LeftWing', COMPONENT_DEFS.leftWing);
        this.rightWing = makeComponent('RightWing', COMPONENT_DEFS.rightWing);

        this.turrets = [
            makeTurret('LeftTurret', COMPONENT_DEFS.leftTurret),
            makeTurret('RightTurret', COMPONENT_DEFS.rightTurret),
        ];

        // Stagger initial fire timers so turrets don't all fire simultaneously
        this.turrets[0].fireTimer = 0;
        this.turrets[1].fireTimer = 1500;
    }

    /** Load sprite frames from asset loader. */
    loadSprites(assets: AssetLoader): void {
        const tryLoad = (prefix: string): Sprite | null => {
            try {
                const img = assets.getImage(prefix);
                return new Sprite([img], 100);
            } catch {
                return null;
            }
        };

        this.bodySprite = tryLoad('frigate_body');
        this.bodyDestroyedSprite = tryLoad('frigate_body_destroyed');
        this.nose.sprite = tryLoad('frigate_nose');
        this.nose.destroyedSprite = tryLoad('frigate_nose_destroyed');
        this.leftWing.sprite = tryLoad('frigate_lwing');
        this.leftWing.destroyedSprite = tryLoad('frigate_lwing_destroyed');
        this.rightWing.sprite = tryLoad('frigate_rwing');
        this.rightWing.destroyedSprite = tryLoad('frigate_rwing_destroyed');
        for (const t of this.turrets) {
            t.sprite = tryLoad(`frigate_turret`);
            t.destroyedSprite = tryLoad('frigate_turret_destroyed');
        }
    }

    /** Get all components for iteration */
    private allComponents(): ShipComponent[] {
        return [this.body, this.nose, this.leftWing, this.rightWing, ...this.turrets];
    }

    update(dt: number, playerX: number, playerY: number): Projectile[] {
        if (!this.alive) return [];

        // Slow descent
        this.y += this.speed * dt * 60;

        // Update turrets: aim at player and fire
        const projectiles: Projectile[] = [];
        const now = performance.now();

        for (const turret of this.turrets) {
            if (turret.destroyed) continue;

            // Calculate turret world position
            const tx = this.x + turret.offsetX;
            const ty = this.y + turret.offsetY;

            // Track player angle
            const dx = playerX - tx;
            const dy = playerY - ty;
            turret.turretAngle = Math.atan2(dy, dx) * (180 / Math.PI);

            // Fire on timer
            turret.fireTimer += dt * 1000;
            if (turret.fireTimer >= turret.fireRate) {
                turret.fireTimer = 0;

                // Set weapon angle and fire
                turret.weapon.angle = turret.turretAngle + 90; // weapon angle convention
                const proj = turret.weapon.fire(tx, ty, now, 'enemy', 1.0, null);
                if (proj) {
                    projectiles.push(proj);
                }
            }
        }

        // Nose weapon fires periodically if nose is intact
        if (!this.nose.destroyed) {
            // Simple periodic fire from nose cannon (re-use first turret timing)
        }

        // Check if all damageable components are destroyed
        const allDestroyed = this.nose.destroyed &&
            this.turrets.every(t => t.destroyed) &&
            this.body.armor <= 0;

        if (allDestroyed) {
            this.alive = false;
        }

        // Die if off-screen
        if (this.y > PLAY_AREA_H + 300) {
            this.alive = false;
        }

        return projectiles;
    }

    render(ctx: CanvasRenderingContext2D): void {
        if (!this.alive) return;

        // Draw body
        this.drawComponent(ctx, this.body, this.bodySprite, this.bodyDestroyedSprite, '#555');

        // Draw wings
        this.drawComponent(ctx, this.leftWing, this.leftWing.sprite, this.leftWing.destroyedSprite, '#666');
        this.drawComponent(ctx, this.rightWing, this.rightWing.sprite, this.rightWing.destroyedSprite, '#666');

        // Draw nose
        this.drawComponent(ctx, this.nose, this.nose.sprite, this.nose.destroyedSprite, '#777');

        // Draw turrets
        for (const turret of this.turrets) {
            this.drawComponent(ctx, turret, turret.sprite, turret.destroyedSprite, '#f00');

            // Draw turret barrel direction indicator
            if (!turret.destroyed) {
                const tx = this.x + turret.offsetX + turret.width / 2;
                const ty = this.y + turret.offsetY + turret.height / 2;
                const rad = turret.turretAngle * (Math.PI / 180);
                const barrelLen = 16;
                ctx.strokeStyle = '#f88';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(tx + Math.cos(rad) * barrelLen, ty + Math.sin(rad) * barrelLen);
                ctx.stroke();
            }
        }

        // Shield visual effect
        if (this.shields > 0) {
            const shieldAlpha = Math.min(0.3, (this.shields / this.maxShields) * 0.3);
            ctx.save();
            ctx.globalAlpha = shieldAlpha;
            ctx.strokeStyle = '#0af';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(
                this.x + BODY_WIDTH / 2,
                this.y + BODY_HEIGHT / 2,
                BODY_WIDTH * 1.2,
                BODY_HEIGHT * 0.9,
                0, 0, Math.PI * 2,
            );
            ctx.stroke();
            ctx.restore();
        }
    }

    private drawComponent(
        ctx: CanvasRenderingContext2D,
        comp: ShipComponent,
        sprite: Sprite | null,
        destroyedSprite: Sprite | null,
        fallbackColor: string,
    ): void {
        const wx = this.x + comp.offsetX;
        const wy = this.y + comp.offsetY;

        if (comp.destroyed) {
            if (destroyedSprite) {
                destroyedSprite.drawAt(ctx, wx, wy);
            } else {
                // Destroyed fallback — darker, with damage marks
                ctx.fillStyle = '#333';
                ctx.fillRect(wx, wy, comp.width, comp.height);
                ctx.strokeStyle = '#600';
                ctx.lineWidth = 1;
                // Damage cracks
                for (let i = 0; i < 3; i++) {
                    const cx = wx + Math.random() * comp.width;
                    const cy = wy + Math.random() * comp.height;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + (Math.random() - 0.5) * 10, cy + (Math.random() - 0.5) * 10);
                    ctx.stroke();
                }
            }
        } else {
            if (sprite) {
                sprite.drawAt(ctx, wx, wy);
            } else {
                ctx.fillStyle = fallbackColor;
                ctx.fillRect(wx, wy, comp.width, comp.height);
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 1;
                ctx.strokeRect(wx, wy, comp.width, comp.height);
            }

            // Damage indicator bar
            if (comp.armor < comp.maxArmor) {
                const barW = comp.width;
                const barH = 3;
                const barX = wx;
                const barY = wy - 5;
                const fill = comp.armor / comp.maxArmor;
                ctx.fillStyle = '#300';
                ctx.fillRect(barX, barY, barW, barH);
                ctx.fillStyle = fill > 0.5 ? '#0f0' : fill > 0.25 ? '#ff0' : '#f00';
                ctx.fillRect(barX, barY, barW * fill, barH);
            }
        }
    }

    /** Apply damage to a specific component. Returns true if the component was just destroyed. */
    damageComponent(component: ShipComponent, damage: number): boolean {
        if (component.destroyed) return false;

        // Shields absorb damage first (for the whole ship)
        if (this.shields > 0) {
            const absorbed = Math.min(this.shields, damage);
            this.shields -= absorbed;
            damage -= absorbed;
        }

        if (damage <= 0) return false;

        component.armor -= damage;
        if (component.armor <= 0) {
            component.armor = 0;
            component.destroyed = true;
            return true;
        }
        return false;
    }

    /** Get collision rectangles for all non-destroyed components. */
    getCollisionRects(): Array<{ rect: Rect; component: ShipComponent }> {
        const results: Array<{ rect: Rect; component: ShipComponent }> = [];
        for (const comp of this.allComponents()) {
            if (comp.destroyed) continue;
            results.push({
                rect: {
                    x: this.x + comp.offsetX,
                    y: this.y + comp.offsetY,
                    w: comp.width,
                    h: comp.height,
                },
                component: comp,
            });
        }
        return results;
    }

    /** Check if the ship is fully defeated. */
    isDefeated(): boolean {
        return !this.alive;
    }

    /** Get center position for explosion spawning. */
    getCenter(): { x: number; y: number } {
        return {
            x: this.x + BODY_WIDTH / 2,
            y: this.y + BODY_HEIGHT / 2,
        };
    }
}
