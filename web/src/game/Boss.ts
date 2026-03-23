/**
 * Boss fight (Type 4)  multi-component ship with destructible nodes,
 * animated orbs, gun turrets on platforms, shield, and destruction sequence.
 *
 * Spec Section 8  full layout:
 *   Center node + center orb (cosmetic)
 *   4 outer nodes (500,000 HP structural) + 4 outer orbs (500 HP, damageable)
 *   8 platforms (LEFT/RIGHT/DOWN), 8 outer turrets, 6 U-turrets
 *   Shield (1000 HP) protects center while any outer node lives
 *
 * Destruction order:
 *   Destroy all 4 outer orbs  their parent nodes collapse 
 *   center becomes vulnerable  defeat.
 */

import { Sprite, AssetLoader } from '../engine';
import { Rect, PLAY_AREA_W, PLAY_AREA_H } from './Collision';
import { Weapon } from './Weapon';
import { Projectile } from './Projectile';
import { Explosion, ChainExplosion } from './Explosion';

// --- Boss constants (Spec 8) ---
const BOSS_START_X = 245;
const BOSS_START_Y = -600;
const BOSS_HOVER_Y = 40;
const BOSS_DESCENT_SPEED = 40;   // px/s
const BOSS_WAIT_TIME = 110_000;  // ms  boss appears 110s into level
const BOSS_MUSIC_TIME = 96_000;  // ms  music triggers at 96s
const BOSS_SHIELDS = 1000;

const ORB_FRAME_COUNT = 33;      // orb00orb32
const ORB_ANIM_SPEED = 60;       // ms per frame
const TURRET_SPRITE_FRAMES = 33; // Turret00Turret32

// Center armor by difficulty
const CENTER_ARMOR: Record<number, number> = {
    0: 800,    // Easy
    1: 1000,   // Normal
    2: 1200,   // Hard
    3: 2000,   // Nightmare
};

// Center orb offset from center node
const CENTER_ORB_OFFSET = { x: 48, y: 48 };

// Outer node positions relative to boss origin
const OUTER_NODE_DEFS = [
    { id: 0, offsetX: -213, offsetY: 111 },   // upper-left
    { id: 1, offsetX:  -65, offsetY: 259 },   // lower-left
    { id: 2, offsetX:   97, offsetY: 259 },   // lower-right
    { id: 3, offsetX:  245, offsetY: 111 },   // upper-right
] as const;

const OUTER_NODE_ARMOR = 500_000;
const OUTER_ORB_ARMOR = 500;
const OUTER_ORB_OFFSET = { x: 32, y: 31 };
const OUTER_ORB_START_FRAMES = [5, 25, 10, 15];

// Platform definitions (8 platforms, 2 per node)
type PlatformType = 'LEFT' | 'RIGHT' | 'DOWN';
interface PlatformDef {
    type: PlatformType;
    nodeIndex: number;
    offsetX: number;
    offsetY: number;
}

const PLATFORM_DEFS: PlatformDef[] = [
    { type: 'LEFT',  nodeIndex: 0, offsetX: -51, offsetY: 23  },
    { type: 'LEFT',  nodeIndex: 1, offsetX: -51, offsetY: 23  },
    { type: 'RIGHT', nodeIndex: 2, offsetX: 101, offsetY: 24  },
    { type: 'RIGHT', nodeIndex: 3, offsetX: 101, offsetY: 24  },
    { type: 'DOWN',  nodeIndex: 0, offsetX:  25, offsetY: 100 },
    { type: 'DOWN',  nodeIndex: 1, offsetX:  25, offsetY: 100 },
    { type: 'DOWN',  nodeIndex: 2, offsetX:  25, offsetY: 100 },
    { type: 'DOWN',  nodeIndex: 3, offsetX:  25, offsetY: 100 },
];

// Turret AI
type TurretAIType = 'sweeping' | 'random';
interface TurretCfg { aiType: TurretAIType; aiParam: number }

const OUTER_TURRET_CONFIGS: TurretCfg[] = [
    { aiType: 'sweeping', aiParam: 60   },
    { aiType: 'random',   aiParam: 2000 },
    { aiType: 'random',   aiParam: 2000 },
    { aiType: 'sweeping', aiParam: 60   },
    { aiType: 'random',   aiParam: 2000 },
    { aiType: 'random',   aiParam: 2000 },
    { aiType: 'random',   aiParam: 2000 },
    { aiType: 'random',   aiParam: 2000 },
];

// U-component offsets (cosmetic / non-damageable)
const U_DEFS = [
    { offsetX: -174, offsetY: -404, armor: 500 },
    { offsetX:  192, offsetY: -401, armor: 500 },
];

// --- Enums / Interfaces ---

export enum BossState {
    Waiting,
    Entering,
    Normal,
    Morph1,
    Morph2,
    Final,
    Dying,
    Dead,
}

export interface BossComponent {
    name: string;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
    armor: number;
    maxArmor: number;
    destroyed: boolean;
    damageable: boolean;
    width: number;
    height: number;
    sprite: Sprite | null;
    destroyedSprite: Sprite | null;
}

interface BossTurret {
    platformIndex: number;
    weapon: Weapon;
    fireTimer: number;
    fireRate: number;
    turretAngle: number;
    aiType: TurretAIType;
    aiParam: number;
    sweepAngle: number;
    sweepDirection: number;
    destroyed: boolean;
    turretSprites: HTMLImageElement[];
}

// --- Helpers ---

function makeComp(
    name: string,
    offX: number, offY: number,
    armor: number, w: number, h: number,
    damageable: boolean,
): BossComponent {
    return {
        name, x: 0, y: 0,
        offsetX: offX, offsetY: offY,
        armor, maxArmor: armor,
        destroyed: false, damageable,
        width: w, height: h,
        sprite: null, destroyedSprite: null,
    };
}

// =====================================================================
// Boss class
// =====================================================================

export class Boss {
    x: number;
    y: number;
    alive = true;
    state: BossState = BossState.Waiting;
    musicTriggered = false;

    // --- Components ---
    centerNode: BossComponent;
    outerNodes: BossComponent[];     // 4
    outerOrbs: BossComponent[];      // 4 (damageable targets)
    platforms: BossComponent[];      // 8
    uComponents: BossComponent[];    // 2 (cosmetic)

    // --- Turrets ---
    outerTurrets: BossTurret[];      // 8 (one per platform)

    // --- Orb animations ---
    private centerOrbSprite: Sprite | null = null;
    private outerOrbSprites: Sprite[] = [];  // one per outer orb

    // --- Shield ---
    shieldActive = true;
    private shields: number;
    private maxShields: number;

    // --- Internal ---
    private difficulty: number;
    private stateTimer = 0;
    private levelTimeMs = 0;        // fed from outside
    private deathExplosion: ChainExplosion;
    private hitFlashTimer = 0;
    private pendingProjectiles: Projectile[] = [];

    constructor(difficulty = 1) {
        this.difficulty = difficulty;
        this.x = BOSS_START_X;
        this.y = BOSS_START_Y;
        this.shields = BOSS_SHIELDS;
        this.maxShields = BOSS_SHIELDS;

        // Center node
        const cArmor = CENTER_ARMOR[difficulty] ?? 1000;
        this.centerNode = makeComp('CenterNode', 0, 0, cArmor, 96, 96, false);

        // 4 outer nodes (structural, extremely high HP, not directly targetable)
        this.outerNodes = OUTER_NODE_DEFS.map((d, i) =>
            makeComp(`OuterNode${i}`, d.offsetX, d.offsetY, OUTER_NODE_ARMOR, 64, 64, false),
        );

        // 4 outer orbs (the actual damageable targets)
        this.outerOrbs = OUTER_NODE_DEFS.map((d, i) =>
            makeComp(
                `OuterOrb${i}`,
                d.offsetX + OUTER_ORB_OFFSET.x,
                d.offsetY + OUTER_ORB_OFFSET.y,
                OUTER_ORB_ARMOR, 32, 32, true,
            ),
        );

        // 8 platforms
        this.platforms = PLATFORM_DEFS.map((d, i) =>
            makeComp(`Platform${i}`, 0, 0, 10, 48, 16, false),
        );

        // 2 U-components (cosmetic)
        this.uComponents = U_DEFS.map((d, i) =>
            makeComp(`U${i}`, d.offsetX, d.offsetY, d.armor, 64, 64, false),
        );

        // 8 outer turrets (one per platform)
        this.outerTurrets = OUTER_TURRET_CONFIGS.map((cfg, i) => ({
            platformIndex: i,
            weapon: Weapon.createEnemyWeapon('enemyBlast', 0, 0),
            fireTimer: Math.random() * 2000,
            fireRate: cfg.aiType === 'sweeping' ? 800 : cfg.aiParam,
            turretAngle: 180,
            aiType: cfg.aiType,
            aiParam: cfg.aiParam,
            sweepAngle: 90,
            sweepDirection: i % 2 === 0 ? 1 : -1,
            destroyed: false,
            turretSprites: [],
        }));

        this.deathExplosion = new ChainExplosion();
    }

    // ---------------------------------------------------------------
    // Sprite loading
    // ---------------------------------------------------------------

    loadSprites(assets: AssetLoader): void {
        const tryImg = (id: string): HTMLImageElement | null => {
            try { return assets.getImage(id); } catch { return null; }
        };
        const trySprite = (id: string): Sprite | null => {
            const img = tryImg(id);
            return img ? new Sprite([img], 100) : null;
        };

        this.centerNode.sprite = trySprite('boss_center');
        this.centerNode.destroyedSprite = trySprite('boss_center_destroyed');

        // Outer nodes
        for (const node of this.outerNodes) {
            node.sprite = trySprite('boss_node');
            node.destroyedSprite = trySprite('boss_node_destroyed');
        }

        // Platforms
        const platSpriteMap: Record<PlatformType, string> = {
            LEFT: 'BossLeftPlatform', RIGHT: 'BossRightPlatform', DOWN: 'BossDownPlatform',
        };
        for (let i = 0; i < this.platforms.length; i++) {
            const def = PLATFORM_DEFS[i];
            this.platforms[i].sprite = trySprite(platSpriteMap[def.type]);
        }

        // U-components
        const uSprites = ['BossLeftU', 'BossRightU'];
        for (let i = 0; i < this.uComponents.length; i++) {
            this.uComponents[i].sprite = trySprite(uSprites[i]);
        }

        // Orb animation frames (orb00-orb32, shared across all orbs)
        const orbFrames: HTMLImageElement[] = [];
        try {
            for (let i = 0; i < ORB_FRAME_COUNT; i++) {
                const img = assets.getImage(`orb${i.toString().padStart(2, '0')}`);
                orbFrames.push(img);
            }
        } catch { /* orb frames not available */ }

        if (orbFrames.length > 0) {
            // Center orb - start frame 0
            this.centerOrbSprite = new Sprite(orbFrames, ORB_ANIM_SPEED);
            this.centerOrbSprite.currentFrame = 0;

            // Outer orbs - staggered start frames
            for (let i = 0; i < 4; i++) {
                const orb = new Sprite(orbFrames, ORB_ANIM_SPEED);
                orb.currentFrame = (OUTER_ORB_START_FRAMES[i] ?? 0) % ORB_FRAME_COUNT;
                this.outerOrbSprites.push(orb);
            }
        }

        // Turret sprites (Turret00-Turret32)
        const turretFrames: HTMLImageElement[] = [];
        for (let i = 0; i < TURRET_SPRITE_FRAMES; i++) {
            const img = tryImg(`Turret${i.toString().padStart(2, '0')}`);
            if (img) turretFrames.push(img);
        }
        for (const t of this.outerTurrets) {
            t.turretSprites = turretFrames;
        }
    }

    // ---------------------------------------------------------------
    // Update
    // ---------------------------------------------------------------

    update(dt: number, playerX: number, playerY: number, now: number, levelTimeMs: number): void {
        this.levelTimeMs = levelTimeMs;
        this.pendingProjectiles = [];

        if (this.state === BossState.Dead) return;

        if (this.state === BossState.Dying) {
            this.deathExplosion.update(dt, null);
            if (this.deathExplosion.finished) {
                this.alive = false;
                this.state = BossState.Dead;
            }
            return;
        }

        this.stateTimer += dt;
        this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);

        switch (this.state) {
            case BossState.Waiting:
                if (levelTimeMs >= BOSS_WAIT_TIME) {
                    this.state = BossState.Entering;
                    this.stateTimer = 0;
                }
                return; // invisible - don't update positions or fire

            case BossState.Entering:
                this.y += BOSS_DESCENT_SPEED * dt;
                if (this.y >= BOSS_HOVER_Y) {
                    this.y = BOSS_HOVER_Y;
                    this.state = BossState.Normal;
                    this.stateTimer = 0;
                }
                break;

            case BossState.Normal:
            case BossState.Morph1:
            case BossState.Morph2:
            case BossState.Final:
                this.updateCombat(dt, playerX, playerY, now);
                break;
        }

        // Update orb animations
        if (this.centerOrbSprite) this.centerOrbSprite.update(dt * 1000);
        for (const orb of this.outerOrbSprites) orb.update(dt * 1000);

        this.updateComponentPositions();
        this.updateShieldState();
    }

    /** Whether boss music should start playing (96s into level). */
    shouldTriggerMusic(): boolean {
        if (this.musicTriggered) return false;
        if (this.levelTimeMs >= BOSS_MUSIC_TIME) {
            this.musicTriggered = true;
            return true;
        }
        return false;
    }

    // ---------------------------------------------------------------
    // Combat update
    // ---------------------------------------------------------------

    private updateCombat(dt: number, playerX: number, playerY: number, now: number): void {
        // Gentle hover bob
        const bob = Math.sin(this.stateTimer * 0.5) * 3;
        this.y = BOSS_HOVER_Y + bob;

        // Check morph state transitions
        const destroyedCount = this.outerOrbs.filter(o => o.destroyed).length;
        if (destroyedCount >= 4 && this.state !== BossState.Final) {
            this.state = BossState.Final;
            this.centerNode.damageable = true;
            this.stateTimer = 0;
        } else if (destroyedCount >= 2 && this.state === BossState.Normal) {
            this.state = BossState.Morph1;
            this.stateTimer = 0;
        } else if (destroyedCount >= 3 && this.state === BossState.Morph1) {
            this.state = BossState.Morph2;
            this.stateTimer = 0;
        }

        // Fire rate multiplier by phase
        const fireRateMul = this.state === BossState.Final  ? 0.5 :
                            this.state === BossState.Morph2 ? 0.6 :
                            this.state === BossState.Morph1 ? 0.75 : 1.0;

        // Update outer turrets
        for (const turret of this.outerTurrets) {
            if (turret.destroyed) continue;

            // Destroy turret if parent node's orb is destroyed
            const parentNodeIdx = PLATFORM_DEFS[turret.platformIndex]?.nodeIndex ?? 0;
            if (this.outerOrbs[parentNodeIdx]?.destroyed) {
                turret.destroyed = true;
                continue;
            }

            const plat = this.platforms[turret.platformIndex];
            const tx = plat.x + plat.width / 2;
            const ty = plat.y + plat.height / 2;

            // AI aiming
            if (turret.aiType === 'sweeping') {
                turret.sweepAngle += turret.sweepDirection * turret.aiParam * dt;
                if (turret.sweepAngle > 270 || turret.sweepAngle < 90) {
                    turret.sweepDirection *= -1;
                }
                turret.turretAngle = turret.sweepAngle;
            } else {
                const dx = playerX - tx;
                const dy = playerY - ty;
                turret.turretAngle = Math.atan2(dy, dx) * (180 / Math.PI);
            }

            // Fire
            turret.fireTimer += dt * 1000;
            const effectiveRate = turret.fireRate * fireRateMul;
            if (turret.fireTimer >= effectiveRate) {
                turret.fireTimer = 0;
                turret.weapon.angle = turret.turretAngle + 90;
                const proj = turret.weapon.fire(tx, ty, now, null);
                if (proj) this.pendingProjectiles.push(proj);
            }
        }
    }

    // ---------------------------------------------------------------
    // Component positions
    // ---------------------------------------------------------------

    private updateComponentPositions(): void {
        // Center node at boss origin
        this.centerNode.x = this.x;
        this.centerNode.y = this.y;

        // Outer nodes
        for (const node of this.outerNodes) {
            node.x = this.x + node.offsetX;
            node.y = this.y + node.offsetY;
        }

        // Outer orbs
        for (const orb of this.outerOrbs) {
            orb.x = this.x + orb.offsetX;
            orb.y = this.y + orb.offsetY;
        }

        // Platforms - offset from their parent outer node
        for (let i = 0; i < this.platforms.length; i++) {
            const def = PLATFORM_DEFS[i];
            const parentNode = this.outerNodes[def.nodeIndex];
            this.platforms[i].x = parentNode.x + def.offsetX;
            this.platforms[i].y = parentNode.y + def.offsetY;
        }

        // U-components
        for (const u of this.uComponents) {
            u.x = this.x + u.offsetX;
            u.y = this.y + u.offsetY;
        }
    }

    private updateShieldState(): void {
        this.shieldActive = this.outerOrbs.some(o => !o.destroyed);
        if (!this.shieldActive) {
            this.centerNode.damageable = true;
        }
    }

    // ---------------------------------------------------------------
    // Damage
    // ---------------------------------------------------------------

    /**
     * Apply damage by hit position. Finds the closest damageable component
     * overlapping (hitX, hitY) and applies damage with shield/propagation rules.
     */
    takeDamage(hitX: number, hitY: number, damage: number): void {
        if (this.state === BossState.Waiting || this.state === BossState.Entering ||
            this.state === BossState.Dying  || this.state === BossState.Dead) return;

        // Find hit component
        const comp = this.findHitComponent(hitX, hitY);
        if (!comp) return;

        // Shield absorbs damage to center node while active
        if (comp === this.centerNode && this.shieldActive) {
            if (this.shields > 0) {
                const absorbed = Math.min(this.shields, damage);
                this.shields -= absorbed;
                damage -= absorbed;
            }
            if (this.shieldActive) return; // center protected
        }

        comp.armor -= damage;
        this.hitFlashTimer = 0.1;

        if (comp.armor <= 0) {
            comp.armor = 0;
            comp.destroyed = true;

            // If an outer orb is destroyed, collapse its parent node
            const orbIdx = this.outerOrbs.indexOf(comp);
            if (orbIdx >= 0 && this.outerNodes[orbIdx]) {
                this.outerNodes[orbIdx].destroyed = true;
                // Destroy associated turrets
                for (const turret of this.outerTurrets) {
                    const ni = PLATFORM_DEFS[turret.platformIndex]?.nodeIndex;
                    if (ni === orbIdx) turret.destroyed = true;
                }
            }

            // Center node destroyed -> death sequence
            if (comp === this.centerNode) {
                this.beginDeathSequence();
            }
        }
    }

    private findHitComponent(hitX: number, hitY: number): BossComponent | null {
        // Check damageable components: outer orbs first, then center node
        const candidates = [...this.outerOrbs, this.centerNode];
        let best: BossComponent | null = null;
        let bestDist = Infinity;

        for (const comp of candidates) {
            if (comp.destroyed || !comp.damageable) continue;
            if (hitX >= comp.x && hitX <= comp.x + comp.width &&
                hitY >= comp.y && hitY <= comp.y + comp.height) {
                const dist = Math.abs(hitX - (comp.x + comp.width / 2)) +
                             Math.abs(hitY - (comp.y + comp.height / 2));
                if (dist < bestDist) {
                    bestDist = dist;
                    best = comp;
                }
            }
        }
        return best;
    }

    private beginDeathSequence(): void {
        this.state = BossState.Dying;
        this.stateTimer = 0;
        const cx = this.centerNode.x + this.centerNode.width / 2;
        const cy = this.centerNode.y + this.centerNode.height / 2;
        // 30 explosions over 3 seconds, 200px radius, 50% big/small
        this.deathExplosion.start(cx, cy, 200, 30, 3.0);
    }

    // ---------------------------------------------------------------
    // Projectiles
    // ---------------------------------------------------------------

    getProjectiles(): Projectile[] {
        return this.pendingProjectiles;
    }

    // ---------------------------------------------------------------
    // Collision
    // ---------------------------------------------------------------

    /** Return collision rects for all alive components (used for projectile hit-testing). */
    getComponentRects(): Array<{ rect: Rect; component: BossComponent }> {
        if (this.state === BossState.Waiting || this.state === BossState.Entering ||
            this.state === BossState.Dying  || this.state === BossState.Dead) {
            return [];
        }

        const results: Array<{ rect: Rect; component: BossComponent }> = [];

        // Include damageable components (outer orbs, center node when vulnerable)
        const comps = [
            ...this.outerOrbs,
            this.centerNode,
            ...this.outerNodes,
            ...this.platforms,
        ];

        for (const comp of comps) {
            if (comp.destroyed) continue;
            results.push({
                component: comp,
                rect: { x: comp.x, y: comp.y, w: comp.width, h: comp.height },
            });
        }
        return results;
    }

    // ---------------------------------------------------------------
    // State queries
    // ---------------------------------------------------------------

    isDefeated(): boolean {
        return this.state === BossState.Dead;
    }

    isEntering(): boolean {
        return this.state === BossState.Entering;
    }

    isVisible(): boolean {
        return this.state !== BossState.Waiting;
    }

    getCenter(): { x: number; y: number } {
        return {
            x: this.centerNode.x + this.centerNode.width / 2,
            y: this.centerNode.y + this.centerNode.height / 2,
        };
    }

    // ---------------------------------------------------------------
    // Rendering
    // ---------------------------------------------------------------

    draw(ctx: CanvasRenderingContext2D, _assets: AssetLoader | null): void {
        // Death explosions render even after boss body disappears
        if (this.state === BossState.Dying || this.state === BossState.Dead) {
            this.deathExplosion.draw(ctx);
            if (this.state === BossState.Dead) return;
            return; // don't draw boss body during death
        }

        // Invisible during wait
        if (this.state === BossState.Waiting) return;

        // Connectors from center to outer nodes
        this.drawConnectors(ctx);

        // U-components
        for (const u of this.uComponents) this.drawComp(ctx, u, '#446');

        // Platforms
        for (const p of this.platforms) this.drawComp(ctx, p, '#444');

        // Outer nodes
        for (const n of this.outerNodes) this.drawComp(ctx, n, '#688');

        // Center node
        this.drawComp(ctx, this.centerNode, '#889');

        // Center orb
        if (!this.centerNode.destroyed) {
            const ox = this.centerNode.x + CENTER_ORB_OFFSET.x;
            const oy = this.centerNode.y + CENTER_ORB_OFFSET.y;
            if (this.centerOrbSprite) {
                this.centerOrbSprite.drawAt(ctx, ox, oy);
            } else {
                this.drawFallbackOrb(ctx, ox, oy, 0);
            }
        }

        // Outer orbs
        for (let i = 0; i < this.outerOrbs.length; i++) {
            const orb = this.outerOrbs[i];
            if (orb.destroyed) continue;
            if (i < this.outerOrbSprites.length) {
                this.outerOrbSprites[i].drawAt(ctx, orb.x, orb.y);
            } else {
                this.drawFallbackOrb(ctx, orb.x, orb.y, i + 1);
            }

            // Armor bar for outer orbs
            if (orb.armor < orb.maxArmor) {
                const fill = orb.armor / orb.maxArmor;
                ctx.fillStyle = '#300';
                ctx.fillRect(orb.x, orb.y - 6, orb.width, 3);
                ctx.fillStyle = fill > 0.5 ? '#0f0' : fill > 0.25 ? '#ff0' : '#f00';
                ctx.fillRect(orb.x, orb.y - 6, orb.width * fill, 3);
            }
        }

        // Turrets
        this.drawTurrets(ctx);

        // Shield
        if (this.shieldActive && this.shields > 0) this.drawShield(ctx);

        // Hit flash
        if (this.hitFlashTimer > 0) {
            ctx.save();
            ctx.globalAlpha = this.hitFlashTimer * 2;
            ctx.fillStyle = '#fff';
            ctx.fillRect(
                this.centerNode.x, this.centerNode.y,
                this.centerNode.width, this.centerNode.height,
            );
            ctx.restore();
        }
    }

    /** Legacy alias for render. */
    render(ctx: CanvasRenderingContext2D): void {
        this.draw(ctx, null);
    }

    // --- Draw helpers ---

    private drawComp(ctx: CanvasRenderingContext2D, comp: BossComponent, color: string): void {
        if (comp.destroyed) {
            if (comp.destroyedSprite) {
                comp.destroyedSprite.drawAt(ctx, comp.x, comp.y);
            } else {
                ctx.fillStyle = '#222';
                ctx.fillRect(comp.x, comp.y, comp.width, comp.height);
            }
            return;
        }

        if (comp.sprite) {
            comp.sprite.drawAt(ctx, comp.x, comp.y);
        } else {
            ctx.fillStyle = color;
            ctx.fillRect(comp.x, comp.y, comp.width, comp.height);
            ctx.strokeStyle = '#aaa';
            ctx.lineWidth = 1;
            ctx.strokeRect(comp.x, comp.y, comp.width, comp.height);
        }

        // Armor bar for large damageable components
        if (comp.damageable && comp.maxArmor > 50 && comp.armor < comp.maxArmor) {
            const fill = comp.armor / comp.maxArmor;
            ctx.fillStyle = '#300';
            ctx.fillRect(comp.x, comp.y - 6, comp.width, 3);
            ctx.fillStyle = fill > 0.5 ? '#0f0' : fill > 0.25 ? '#ff0' : '#f00';
            ctx.fillRect(comp.x, comp.y - 6, comp.width * fill, 3);
        }
    }

    private drawConnectors(ctx: CanvasRenderingContext2D): void {
        const cx = this.centerNode.x + this.centerNode.width / 2;
        const cy = this.centerNode.y + this.centerNode.height / 2;

        for (const node of this.outerNodes) {
            const nx = node.x + node.width / 2;
            const ny = node.y + node.height / 2;
            ctx.strokeStyle = node.destroyed ? '#300' : '#556';
            ctx.lineWidth = node.destroyed ? 1 : 3;
            ctx.setLineDash(node.destroyed ? [4, 4] : []);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(nx, ny);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    private drawFallbackOrb(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number): void {
        const pulse = 0.5 + Math.sin(this.stateTimer * 4 + idx * 2) * 0.5;
        const radius = 12 + pulse * 4;
        const gradient = ctx.createRadialGradient(ox, oy, 0, ox, oy, radius);
        gradient.addColorStop(0, `rgba(0, 255, 255, ${0.8 * pulse})`);
        gradient.addColorStop(0.5, `rgba(0, 128, 255, ${0.4 * pulse})`);
        gradient.addColorStop(1, 'rgba(0, 0, 128, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(ox, oy, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    private drawTurrets(ctx: CanvasRenderingContext2D): void {
        for (const turret of this.outerTurrets) {
            if (turret.destroyed) continue;

            const plat = this.platforms[turret.platformIndex];
            const tx = plat.x + plat.width / 2;
            const ty = plat.y + plat.height / 2;

            // Sprite-based turret
            if (turret.turretSprites.length > 0) {
                let angle = turret.turretAngle % 360;
                if (angle < 0) angle += 360;
                const frameIdx = Math.round(angle / 360 * 32) % turret.turretSprites.length;
                ctx.drawImage(turret.turretSprites[frameIdx], tx - 16, ty - 16);
            } else {
                // Fallback
                ctx.fillStyle = '#a44';
                ctx.beginPath();
                ctx.arc(tx, ty, 8, 0, Math.PI * 2);
                ctx.fill();

                const rad = turret.turretAngle * (Math.PI / 180);
                ctx.strokeStyle = '#f66';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(tx, ty);
                ctx.lineTo(tx + Math.cos(rad) * 14, ty + Math.sin(rad) * 14);
                ctx.stroke();
            }
        }
    }

    private drawShield(ctx: CanvasRenderingContext2D): void {
        const shieldAlpha = Math.min(0.25, (this.shields / this.maxShields) * 0.25);
        const pulse = 0.7 + Math.sin(this.stateTimer * 2) * 0.3;

        ctx.save();
        ctx.globalAlpha = shieldAlpha * pulse;

        const cx = this.centerNode.x + this.centerNode.width / 2;
        const cy = this.centerNode.y + this.centerNode.height / 2;

        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 280, 200, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = shieldAlpha * pulse * 0.3;
        ctx.fillStyle = '#048';
        ctx.fill();

        ctx.restore();
    }
}