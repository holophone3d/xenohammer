/**
 * Frigate-class capital ship (Type 3) with destructible components.
 *
 * Spec Section 7 — Component Layout:
 *   Body (0,0) 900 HP, Nose (0,112) 900 HP, Wings (±62,5) 300 HP,
 *   Turrets (−47,37) and (79,37) 600 HP each.
 *
 * Damage propagation:
 *   Turrets → Wings → Body (each gate must be destroyed first).
 *
 * Turret AI: track player, fire ENEMYBLASTER every 3000ms.
 * Nose weapon: ENEMYCANNON at offset (32, 212) from body.
 */

import { Sprite, AssetLoader } from '../engine';
import { Rect, PLAY_AREA_W, PLAY_AREA_H } from './Collision';
import { Weapon } from './Weapon';
import { Projectile } from './Projectile';

// --- Frigate constants (Spec §7) ---
const SCROLL_SPEED = 60;       // ~1 px/tick at 60fps → 60 px/s
const HOVER_Y = 100;           // stop descending at this Y
const NOSE_FIRE_RATE = 3000;   // ms between nose cannon shots

const BODY_WIDTH = 96;
const BODY_HEIGHT = 128;

const TURRET_SPRITE_FRAMES = 33; // Turret00–Turret32

// --- Component dimensions (approximate sprite sizes) ---
const NOSE_W = 64;
const NOSE_H = 48;
const WING_W = 48;
const WING_H = 64;
const TURRET_W = 32;
const TURRET_H = 32;

export interface FrigateComponent {
    name: string;
    offsetX: number;
    offsetY: number;
    armor: number;
    maxArmor: number;
    alive: boolean;
    damageable: boolean;
    sprite: HTMLImageElement | null;
    destroyedSprite: HTMLImageElement | null;
    width: number;
    height: number;
}

interface FrigateTurret extends FrigateComponent {
    weapon: Weapon;
    fireTimer: number;
    fireRate: number;
    turretAngle: number;
    turretSprites: HTMLImageElement[];
}

function makeComponent(
    name: string,
    offsetX: number, offsetY: number,
    armor: number, w: number, h: number,
    damageable: boolean,
): FrigateComponent {
    return {
        name, offsetX, offsetY,
        armor, maxArmor: armor,
        alive: true, damageable,
        sprite: null, destroyedSprite: null,
        width: w, height: h,
    };
}

export class CapitalShip {
    x: number;
    y: number;
    alive = true;

    body: FrigateComponent;
    nose: FrigateComponent;
    rightWing: FrigateComponent;
    leftWing: FrigateComponent;
    rightTurret: FrigateTurret;
    leftTurret: FrigateTurret;

    private noseWeapon: Weapon;
    private noseFireTimer = 0;
    private descending = true;
    private pendingProjectiles: Projectile[] = [];

    constructor(x: number, y = -300) {
        this.x = x;
        this.y = y;

        // Components per Spec §7
        this.body      = makeComponent('Body',       0,    0,  900, BODY_WIDTH, BODY_HEIGHT, false);
        this.nose      = makeComponent('Nose',       0,  112,  900, NOSE_W, NOSE_H, true);
        this.rightWing = makeComponent('RightWing', -62,   5,  300, WING_W, WING_H, false);
        this.leftWing  = makeComponent('LeftWing',   62,   5,  300, WING_W, WING_H, false);

        this.rightTurret = {
            ...makeComponent('RightTurret', -47, 37, 600, TURRET_W, TURRET_H, true),
            weapon: Weapon.createEnemyWeapon('enemyBlast', -31, 53),
            fireTimer: 0,
            fireRate: 3000,
            turretAngle: 180,
            turretSprites: [],
        };

        this.leftTurret = {
            ...makeComponent('LeftTurret', 79, 37, 600, TURRET_W, TURRET_H, true),
            weapon: Weapon.createEnemyWeapon('enemyBlast', 95, 53),
            fireTimer: 1500, // stagger
            fireRate: 3000,
            turretAngle: 180,
            turretSprites: [],
        };

        // Nose cannon (ENEMYCANNON at offset 32,212 from body)
        this.noseWeapon = Weapon.createEnemyWeapon('enemyCannon', 32, 212);
    }

    /** Load sprites from the asset loader using spec sprite names. */
    loadSprites(assets: AssetLoader): void {
        const tryImg = (id: string): HTMLImageElement | null => {
            try { return assets.getImage(id); } catch { return null; }
        };

        this.body.sprite            = tryImg('CapShipBody');
        this.nose.sprite            = tryImg('CapShipNose');
        this.nose.destroyedSprite   = tryImg('CapShipNoseDest');
        this.leftWing.sprite        = tryImg('CapShipLt');
        this.leftWing.destroyedSprite  = tryImg('CapShipLtDest');
        this.rightWing.sprite       = tryImg('CapShipRt');
        this.rightWing.destroyedSprite = tryImg('CapShipRtDest');

        // Turret animated frames (Turret00–Turret32)
        const turretFrames: HTMLImageElement[] = [];
        for (let i = 0; i < TURRET_SPRITE_FRAMES; i++) {
            const img = tryImg(`Turret${i.toString().padStart(2, '0')}`);
            if (img) turretFrames.push(img);
        }
        this.rightTurret.turretSprites = turretFrames;
        this.leftTurret.turretSprites  = turretFrames;

        // Turret destroyed = frame 32
        const destroyedTurret = tryImg('Turret32');
        this.rightTurret.destroyedSprite = destroyedTurret;
        this.leftTurret.destroyedSprite  = destroyedTurret;
    }

    // --- Damage propagation helpers ---

    /** Recalculate which components are damageable based on destruction state. */
    private updateDamageableFlags(): void {
        // Turrets are always damageable while alive
        this.rightTurret.damageable = this.rightTurret.alive;
        this.leftTurret.damageable  = this.leftTurret.alive;

        // Wings become damageable only after their turret is destroyed
        this.rightWing.damageable = !this.rightTurret.alive && this.rightWing.alive;
        this.leftWing.damageable  = !this.leftTurret.alive  && this.leftWing.alive;

        // Body is damageable only after both wings are destroyed
        this.body.damageable = !this.rightWing.alive && !this.leftWing.alive && this.body.alive;
    }

    /** All components in draw/iteration order. */
    private allComponents(): FrigateComponent[] {
        return [this.body, this.rightWing, this.leftWing, this.nose,
                this.rightTurret, this.leftTurret];
    }

    // --- Core update ---

    update(dt: number, playerX: number, playerY: number, now: number): void {
        if (!this.alive) return;

        this.pendingProjectiles = [];
        this.updateDamageableFlags();

        // Movement: descend until hover Y
        if (this.descending) {
            this.y += SCROLL_SPEED * dt;
            if (this.y >= HOVER_Y) {
                this.y = HOVER_Y;
                this.descending = false;
            }
        }

        // Update turrets
        this.updateTurret(this.rightTurret, dt, playerX, playerY, now);
        this.updateTurret(this.leftTurret,  dt, playerX, playerY, now);

        // Nose cannon fires if nose alive
        if (this.nose.alive) {
            this.noseFireTimer += dt * 1000;
            if (this.noseFireTimer >= NOSE_FIRE_RATE) {
                this.noseFireTimer = 0;
                // Nose fires straight down
                this.noseWeapon.angle = 180;
                const proj = this.noseWeapon.fire(this.x, this.y, now, null);
                if (proj) this.pendingProjectiles.push(proj);
            }
        }

        // Check alive: body HP <= 0 means defeat
        if (this.body.armor <= 0) {
            this.body.alive = false;
            this.alive = false;
        }

        // Remove if scrolled way off-screen
        if (this.y > PLAY_AREA_H + 300) {
            this.alive = false;
        }
    }

    private updateTurret(
        turret: FrigateTurret, dt: number,
        playerX: number, playerY: number, now: number,
    ): void {
        if (!turret.alive) return;

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
            turret.weapon.angle = turret.turretAngle + 90;
            const proj = turret.weapon.fire(tx, ty, now, null);
            if (proj) this.pendingProjectiles.push(proj);
        }
    }

    /** Return projectiles generated during the last update. */
    getProjectiles(): Projectile[] {
        return this.pendingProjectiles;
    }

    // --- Damage ---

    /**
     * Apply damage at a world hit position.
     * Finds the closest damageable component overlapping (hitX, hitY) and applies damage.
     * Returns the component that was hit, or null.
     */
    takeDamage(hitX: number, hitY: number, damage: number): FrigateComponent | null {
        this.updateDamageableFlags();

        // Find which damageable component the hit overlaps
        let best: FrigateComponent | null = null;
        let bestDist = Infinity;

        for (const comp of this.allComponents()) {
            if (!comp.alive || !comp.damageable) continue;

            const cx = this.x + comp.offsetX;
            const cy = this.y + comp.offsetY;

            if (hitX >= cx && hitX <= cx + comp.width &&
                hitY >= cy && hitY <= cy + comp.height) {
                const dist = Math.abs(hitX - (cx + comp.width / 2)) +
                             Math.abs(hitY - (cy + comp.height / 2));
                if (dist < bestDist) {
                    bestDist = dist;
                    best = comp;
                }
            }
        }

        if (!best) return null;

        best.armor -= damage;
        if (best.armor <= 0) {
            best.armor = 0;
            best.alive = false;
        }

        this.updateDamageableFlags();
        return best;
    }

    // --- Collision ---

    /** Return collision rects for all alive & damageable components. */
    getComponentRects(): Array<{ component: FrigateComponent; rect: Rect }> {
        this.updateDamageableFlags();
        const results: Array<{ component: FrigateComponent; rect: Rect }> = [];
        for (const comp of this.allComponents()) {
            if (!comp.alive) continue;
            results.push({
                component: comp,
                rect: {
                    x: this.x + comp.offsetX,
                    y: this.y + comp.offsetY,
                    w: comp.width,
                    h: comp.height,
                },
            });
        }
        return results;
    }

    isAlive(): boolean {
        return this.alive;
    }

    getCenter(): { x: number; y: number } {
        return { x: this.x + BODY_WIDTH / 2, y: this.y + BODY_HEIGHT / 2 };
    }

    // --- Rendering ---

    render(ctx: CanvasRenderingContext2D): void {
        if (!this.alive) return;

        // Draw body
        this.drawSprite(ctx, this.body, '#555');

        // Draw wings (show destroyed variant when dead)
        this.drawSprite(ctx, this.rightWing, '#666');
        this.drawSprite(ctx, this.leftWing,  '#666');

        // Draw nose
        this.drawSprite(ctx, this.nose, '#777');

        // Draw turrets
        this.drawTurret(ctx, this.rightTurret);
        this.drawTurret(ctx, this.leftTurret);
    }

    private drawSprite(
        ctx: CanvasRenderingContext2D,
        comp: FrigateComponent,
        fallback: string,
    ): void {
        const wx = this.x + comp.offsetX;
        const wy = this.y + comp.offsetY;

        if (!comp.alive && comp.destroyedSprite) {
            ctx.drawImage(comp.destroyedSprite, wx, wy);
        } else if (!comp.alive) {
            ctx.fillStyle = '#333';
            ctx.fillRect(wx, wy, comp.width, comp.height);
        } else if (comp.sprite) {
            ctx.drawImage(comp.sprite, wx, wy);
        } else {
            ctx.fillStyle = fallback;
            ctx.fillRect(wx, wy, comp.width, comp.height);
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 1;
            ctx.strokeRect(wx, wy, comp.width, comp.height);
        }

        // Armor bar when damaged and alive
        if (comp.alive && comp.armor < comp.maxArmor) {
            const barW = comp.width;
            const fill = comp.armor / comp.maxArmor;
            ctx.fillStyle = '#300';
            ctx.fillRect(wx, wy - 5, barW, 3);
            ctx.fillStyle = fill > 0.5 ? '#0f0' : fill > 0.25 ? '#ff0' : '#f00';
            ctx.fillRect(wx, wy - 5, barW * fill, 3);
        }
    }

    private drawTurret(ctx: CanvasRenderingContext2D, turret: FrigateTurret): void {
        const wx = this.x + turret.offsetX;
        const wy = this.y + turret.offsetY;

        if (!turret.alive) {
            if (turret.destroyedSprite) {
                ctx.drawImage(turret.destroyedSprite, wx, wy);
            } else {
                ctx.fillStyle = '#333';
                ctx.fillRect(wx, wy, turret.width, turret.height);
            }
            return;
        }

        // Pick turret frame based on angle (33 frames over 360°)
        if (turret.turretSprites.length > 0) {
            let angle = turret.turretAngle % 360;
            if (angle < 0) angle += 360;
            const frameIdx = Math.round(angle / 360 * 32) % turret.turretSprites.length;
            ctx.drawImage(turret.turretSprites[frameIdx], wx, wy);
        } else {
            // Fallback: draw base + barrel line
            ctx.fillStyle = '#a44';
            ctx.beginPath();
            ctx.arc(wx + turret.width / 2, wy + turret.height / 2, 8, 0, Math.PI * 2);
            ctx.fill();

            const rad = turret.turretAngle * (Math.PI / 180);
            ctx.strokeStyle = '#f88';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(wx + turret.width / 2, wy + turret.height / 2);
            ctx.lineTo(
                wx + turret.width / 2 + Math.cos(rad) * 16,
                wy + turret.height / 2 + Math.sin(rad) * 16,
            );
            ctx.stroke();
        }
    }
}
