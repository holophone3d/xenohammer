/**
 * Boss fight — multi-component ship with destructible nodes, orb animations,
 * gun turrets on platforms, and a dramatic destruction sequence.
 *
 * Layout (from game-constants.json boss):
 *   - Central node (main hull) with center orb
 *   - Left outer node (node 1) and right outer node (node 4)
 *   - Platforms connecting nodes (LEFT, RIGHT, DOWN types)
 *   - Gun turrets on platforms that track and fire at the player
 *   - Shield active while outer nodes are intact
 *
 * Destruction order: destroy outer nodes → central node becomes vulnerable → defeat.
 */

import { Sprite, AssetLoader } from '../engine';
import { Rect, PLAY_AREA_W, PLAY_AREA_H } from './Collision';
import { Weapon } from './Weapon';
import { Projectile } from './Projectile';
import { Explosion, ChainExplosion } from './Explosion';
import { WEAPONS } from '../data/ships';

// --- Boss constants from game-constants.json ---
const BOSS_START_X = 245;
const BOSS_START_Y = -600;
const BOSS_HOVER_Y = 40;       // target Y when fully entered
const BOSS_DESCENT_SPEED = 40;  // pixels per second during entrance
const BOSS_ARMOR = 1000;
const BOSS_SHIELDS = 1000;
const ORB_FRAME_COUNT = 32;
const ORB_ANIM_SPEED = 60;     // ms per orb frame

// Difficulty armor adjustments for center node
const DIFFICULTY_ARMOR_BONUS: Record<number, number> = {
    0: -200,  // Easy
    1: 0,     // Normal
    2: 200,   // Hard
    3: 1000,  // Nightmare
};

// Outer node offsets from game-constants
const LEFT_NODE_OFFSET = { x: -213, y: 111 };
const RIGHT_NODE_OFFSET = { x: 245, y: 111 };

// Center orb offset
const CENTER_ORB_OFFSET = { x: 48, y: 48 };

// Orb offsets relative to their parent node
const ORB_NODE_OFFSET = { x: 32, y: 31 };

// Platform definitions (offset from parent node)
const PLATFORM_DEFS = [
    { type: 'LEFT'  as const, nodeId: 'left',  offsetX: -51, offsetY: 23 },
    { type: 'RIGHT' as const, nodeId: 'right', offsetX: 101, offsetY: 24 },
    { type: 'DOWN'  as const, nodeId: 'left',  offsetX: 25,  offsetY: 100 },
    { type: 'DOWN'  as const, nodeId: 'right', offsetX: 25,  offsetY: 100 },
];

// Turret AI types
type TurretAIType = 'sweeping' | 'random';

const TURRET_CONFIGS: Array<{ aiType: TurretAIType; aiParam: number }> = [
    { aiType: 'sweeping', aiParam: 60 },
    { aiType: 'random',   aiParam: 2000 },
    { aiType: 'random',   aiParam: 2000 },
    { aiType: 'sweeping', aiParam: 60 },
];

// --- Boss State ---
enum BossState {
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
    x: number;
    y: number;
    armor: number;
    maxArmor: number;
    destroyed: boolean;
    sprite: Sprite | null;
    destroyedSprite: Sprite | null;
    width: number;
    height: number;
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
}

function makeNode(armor: number, width: number, height: number): BossComponent {
    return {
        x: 0, y: 0,
        armor, maxArmor: armor,
        destroyed: false,
        sprite: null, destroyedSprite: null,
        width, height,
    };
}

export class Boss {
    x: number;
    y: number;
    centralNode: BossComponent;
    leftNode: BossComponent;
    rightNode: BossComponent;
    turrets: BossTurret[];
    platforms: BossComponent[];
    orbs: Sprite[];
    shieldActive = true;
    alive = true;

    private state: BossState = BossState.Entering;
    private shields: number;
    private maxShields: number;
    private difficulty: number;
    private stateTimer = 0;
    private deathExplosion: ChainExplosion;
    private hitFlashTimer = 0;
    private orbStartFrames = [5, 25, 10, 15]; // from game-constants

    constructor(difficulty = 1) {
        this.difficulty = difficulty;
        this.x = BOSS_START_X;
        this.y = BOSS_START_Y;
        this.shields = BOSS_SHIELDS;
        this.maxShields = BOSS_SHIELDS;

        // Central node with difficulty-scaled armor
        const centerArmor = BOSS_ARMOR + (DIFFICULTY_ARMOR_BONUS[difficulty] ?? 0);
        this.centralNode = makeNode(centerArmor, 96, 96);

        // Outer nodes — 500 HP each (orb armor from constants)
        this.leftNode = makeNode(500, 64, 64);
        this.rightNode = makeNode(500, 64, 64);

        // Platforms connecting nodes
        this.platforms = PLATFORM_DEFS.map(() => makeNode(10, 48, 16));

        // Gun turrets on platforms
        this.turrets = TURRET_CONFIGS.map((cfg, i) => ({
            platformIndex: i,
            weapon: Weapon.createEnemyWeapon('enemyBlast', 0, 0),
            fireTimer: Math.random() * 2000, // stagger initial timers
            fireRate: cfg.aiType === 'sweeping' ? 800 : cfg.aiParam,
            turretAngle: 180,
            aiType: cfg.aiType,
            aiParam: cfg.aiParam,
            sweepAngle: 90,
            sweepDirection: i % 2 === 0 ? 1 : -1,
            destroyed: false,
        }));

        // Orb animation sprites (will be populated by loadSprites)
        this.orbs = [];

        this.deathExplosion = new ChainExplosion();
    }

    /** Load all boss sprites from the asset loader. */
    loadSprites(assets: AssetLoader): void {
        const tryLoadSingle = (id: string): Sprite | null => {
            try {
                return new Sprite([assets.getImage(id)], 100);
            } catch {
                return null;
            }
        };

        this.centralNode.sprite = tryLoadSingle('boss_center');
        this.centralNode.destroyedSprite = tryLoadSingle('boss_center_destroyed');
        this.leftNode.sprite = tryLoadSingle('boss_node_left');
        this.leftNode.destroyedSprite = tryLoadSingle('boss_node_left_destroyed');
        this.rightNode.sprite = tryLoadSingle('boss_node_right');
        this.rightNode.destroyedSprite = tryLoadSingle('boss_node_right_destroyed');

        for (const plat of this.platforms) {
            plat.sprite = tryLoadSingle('boss_platform');
            plat.destroyedSprite = tryLoadSingle('boss_platform_destroyed');
        }

        // Load orb animation frames (32 frames shared across all orbs)
        try {
            const orbFrames: HTMLImageElement[] = [];
            for (let i = 0; i < ORB_FRAME_COUNT; i++) {
                orbFrames.push(assets.getImage(`bossorb${i.toString().padStart(2, '0')}`));
            }
            // Create one orb sprite per node (center, left, right) with staggered start frames
            const startFrames = [0, this.orbStartFrames[0], this.orbStartFrames[3]];
            for (const startFrame of startFrames) {
                const orb = new Sprite(orbFrames, ORB_ANIM_SPEED);
                orb.currentFrame = startFrame % ORB_FRAME_COUNT;
                this.orbs.push(orb);
            }
        } catch {
            // Orb frames not available
        }
    }

    update(dt: number, playerX: number, playerY: number): Projectile[] {
        if (!this.alive) {
            this.deathExplosion.update(dt, null);
            return [];
        }

        this.stateTimer += dt;
        this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);

        const projectiles: Projectile[] = [];

        switch (this.state) {
            case BossState.Entering:
                this.updateEntering(dt);
                break;
            case BossState.Normal:
            case BossState.Morph1:
            case BossState.Morph2:
            case BossState.Final:
                this.updateCombat(dt, playerX, playerY, projectiles);
                break;
            case BossState.Dying:
                this.updateDying(dt);
                break;
        }

        // Update orb animations
        for (const orb of this.orbs) {
            orb.update(dt * 1000);
        }

        // Update component world positions
        this.updateComponentPositions();

        // Shield is active only while at least one outer node is intact
        this.shieldActive = !this.leftNode.destroyed || !this.rightNode.destroyed;

        return projectiles;
    }

    private updateEntering(dt: number): void {
        this.y += BOSS_DESCENT_SPEED * dt;
        if (this.y >= BOSS_HOVER_Y) {
            this.y = BOSS_HOVER_Y;
            this.state = BossState.Normal;
            this.stateTimer = 0;
        }
    }

    private updateCombat(dt: number, playerX: number, playerY: number, projectiles: Projectile[]): void {
        // Gentle hover bob
        const bob = Math.sin(this.stateTimer * 0.5) * 3;
        this.y = BOSS_HOVER_Y + bob;

        // Morph states — more aggressive as nodes are destroyed
        if (this.leftNode.destroyed && this.rightNode.destroyed && this.state !== BossState.Final) {
            this.state = BossState.Final;
            this.stateTimer = 0;
        } else if ((this.leftNode.destroyed || this.rightNode.destroyed) && this.state === BossState.Normal) {
            this.state = BossState.Morph1;
            this.stateTimer = 0;
        }

        // Fire rate increases in later phases
        const fireRateMultiplier = this.state === BossState.Final ? 0.5 :
                                    this.state === BossState.Morph1 ? 0.75 : 1.0;

        // Update turrets
        const now = performance.now();
        for (const turret of this.turrets) {
            if (turret.destroyed) continue;

            // Check if parent node is destroyed
            const parentNode = this.getParentNode(turret.platformIndex);
            if (parentNode && parentNode.destroyed) {
                turret.destroyed = true;
                continue;
            }

            // Get turret world position from platform
            const platComp = this.platforms[turret.platformIndex];
            const tx = platComp.x + platComp.width / 2;
            const ty = platComp.y + platComp.height / 2;

            // AI-based aiming
            if (turret.aiType === 'sweeping') {
                // Sweep back and forth
                turret.sweepAngle += turret.sweepDirection * turret.aiParam * dt;
                if (turret.sweepAngle > 270 || turret.sweepAngle < 90) {
                    turret.sweepDirection *= -1;
                }
                turret.turretAngle = turret.sweepAngle;
            } else {
                // Track player
                const dx = playerX - tx;
                const dy = playerY - ty;
                turret.turretAngle = Math.atan2(dy, dx) * (180 / Math.PI);
            }

            // Fire
            turret.fireTimer += dt * 1000;
            const effectiveRate = turret.fireRate * fireRateMultiplier;
            if (turret.fireTimer >= effectiveRate) {
                turret.fireTimer = 0;

                turret.weapon.angle = turret.turretAngle + 90;
                const proj = turret.weapon.fire(tx, ty, now, 'enemy', 1.0, null);
                if (proj) {
                    projectiles.push(proj);
                }
            }
        }
    }

    private updateDying(dt: number): void {
        this.deathExplosion.update(dt, null);
        if (this.deathExplosion.finished) {
            this.alive = false;
            this.state = BossState.Dead;
        }
    }

    private getParentNode(platformIndex: number): BossComponent | null {
        const def = PLATFORM_DEFS[platformIndex];
        if (!def) return null;
        return def.nodeId === 'left' ? this.leftNode : this.rightNode;
    }

    private updateComponentPositions(): void {
        // Central node — at boss origin
        this.centralNode.x = this.x;
        this.centralNode.y = this.y;

        // Outer nodes — offset from boss origin
        this.leftNode.x = this.x + LEFT_NODE_OFFSET.x;
        this.leftNode.y = this.y + LEFT_NODE_OFFSET.y;
        this.rightNode.x = this.x + RIGHT_NODE_OFFSET.x;
        this.rightNode.y = this.y + RIGHT_NODE_OFFSET.y;

        // Platforms — offset from their parent node
        for (let i = 0; i < this.platforms.length; i++) {
            const def = PLATFORM_DEFS[i];
            const parentNode = def.nodeId === 'left' ? this.leftNode : this.rightNode;
            this.platforms[i].x = parentNode.x + def.offsetX;
            this.platforms[i].y = parentNode.y + def.offsetY;
        }
    }

    render(ctx: CanvasRenderingContext2D): void {
        // Render death explosion even when not alive
        if (this.state === BossState.Dying || this.state === BossState.Dead) {
            this.deathExplosion.render(ctx);
            if (this.state === BossState.Dead) return;
        }

        if (this.state === BossState.Dying) return;

        // Draw connectors between central node and outer nodes
        this.drawConnectors(ctx);

        // Draw platforms
        for (const plat of this.platforms) {
            this.drawNode(ctx, plat, '#444');
        }

        // Draw outer nodes
        this.drawNode(ctx, this.leftNode, '#688');
        this.drawNode(ctx, this.rightNode, '#688');

        // Draw central node
        this.drawNode(ctx, this.centralNode, '#889');

        // Draw orbs on nodes
        this.drawOrbs(ctx);

        // Draw turrets
        this.drawTurrets(ctx);

        // Draw shield
        if (this.shieldActive && this.shields > 0) {
            this.drawShield(ctx);
        }

        // Hit flash overlay
        if (this.hitFlashTimer > 0) {
            ctx.save();
            ctx.globalAlpha = this.hitFlashTimer * 2;
            ctx.fillStyle = '#fff';
            ctx.fillRect(this.centralNode.x, this.centralNode.y,
                this.centralNode.width, this.centralNode.height);
            ctx.restore();
        }
    }

    private drawNode(ctx: CanvasRenderingContext2D, node: BossComponent, color: string): void {
        if (node.destroyed) {
            if (node.destroyedSprite) {
                node.destroyedSprite.drawAt(ctx, node.x, node.y);
            } else {
                ctx.fillStyle = '#222';
                ctx.fillRect(node.x, node.y, node.width, node.height);
                // Damage cracks
                ctx.strokeStyle = '#500';
                ctx.lineWidth = 1;
                for (let i = 0; i < 4; i++) {
                    ctx.beginPath();
                    ctx.moveTo(node.x + Math.random() * node.width, node.y);
                    ctx.lineTo(node.x + Math.random() * node.width, node.y + node.height);
                    ctx.stroke();
                }
            }
        } else {
            if (node.sprite) {
                node.sprite.drawAt(ctx, node.x, node.y);
            } else {
                ctx.fillStyle = color;
                ctx.fillRect(node.x, node.y, node.width, node.height);
                ctx.strokeStyle = '#aaa';
                ctx.lineWidth = 1;
                ctx.strokeRect(node.x, node.y, node.width, node.height);
            }

            // Armor bar for large components
            if (node.maxArmor > 50 && node.armor < node.maxArmor) {
                const barW = node.width;
                const barH = 3;
                const barX = node.x;
                const barY = node.y - 6;
                const fill = node.armor / node.maxArmor;
                ctx.fillStyle = '#300';
                ctx.fillRect(barX, barY, barW, barH);
                ctx.fillStyle = fill > 0.5 ? '#0f0' : fill > 0.25 ? '#ff0' : '#f00';
                ctx.fillRect(barX, barY, barW * fill, barH);
            }
        }
    }

    private drawConnectors(ctx: CanvasRenderingContext2D): void {
        const cx = this.centralNode.x + this.centralNode.width / 2;
        const cy = this.centralNode.y + this.centralNode.height / 2;

        const nodes = [this.leftNode, this.rightNode];
        for (const node of nodes) {
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

    private drawOrbs(ctx: CanvasRenderingContext2D): void {
        const orbPositions = [
            { node: this.centralNode, offX: CENTER_ORB_OFFSET.x, offY: CENTER_ORB_OFFSET.y },
            { node: this.leftNode,    offX: ORB_NODE_OFFSET.x,   offY: ORB_NODE_OFFSET.y },
            { node: this.rightNode,   offX: ORB_NODE_OFFSET.x,   offY: ORB_NODE_OFFSET.y },
        ];

        for (let i = 0; i < orbPositions.length; i++) {
            const pos = orbPositions[i];
            if (pos.node.destroyed) continue;

            const ox = pos.node.x + pos.offX;
            const oy = pos.node.y + pos.offY;

            if (i < this.orbs.length) {
                this.orbs[i].drawAt(ctx, ox, oy);
            } else {
                // Fallback animated orb
                const pulse = 0.5 + Math.sin(this.stateTimer * 4 + i * 2) * 0.5;
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
        }
    }

    private drawTurrets(ctx: CanvasRenderingContext2D): void {
        for (const turret of this.turrets) {
            if (turret.destroyed) continue;

            const plat = this.platforms[turret.platformIndex];
            const tx = plat.x + plat.width / 2;
            const ty = plat.y + plat.height / 2;

            // Turret base
            ctx.fillStyle = '#a44';
            ctx.beginPath();
            ctx.arc(tx, ty, 8, 0, Math.PI * 2);
            ctx.fill();

            // Turret barrel
            const rad = turret.turretAngle * (Math.PI / 180);
            const barrelLen = 14;
            ctx.strokeStyle = '#f66';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + Math.cos(rad) * barrelLen, ty + Math.sin(rad) * barrelLen);
            ctx.stroke();
        }
    }

    private drawShield(ctx: CanvasRenderingContext2D): void {
        const shieldAlpha = Math.min(0.25, (this.shields / this.maxShields) * 0.25);
        const pulse = 0.7 + Math.sin(this.stateTimer * 2) * 0.3;

        ctx.save();
        ctx.globalAlpha = shieldAlpha * pulse;

        // Large ellipse covering the entire boss structure
        const cx = this.centralNode.x + this.centralNode.width / 2;
        const cy = this.centralNode.y + this.centralNode.height / 2;
        const radiusX = 280;
        const radiusY = 150;

        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glow
        ctx.globalAlpha = shieldAlpha * pulse * 0.3;
        ctx.fillStyle = '#048';
        ctx.fill();

        ctx.restore();
    }

    /** Apply damage to a specific component. */
    takeDamage(component: BossComponent, damage: number): void {
        if (component.destroyed) return;

        // Shield absorbs damage to central node when outer nodes still alive
        if (component === this.centralNode && this.shieldActive) {
            if (this.shields > 0) {
                const absorbed = Math.min(this.shields, damage);
                this.shields -= absorbed;
                damage -= absorbed;
            }
            // Central node is protected — cannot take direct armor damage while shield active
            if (this.shieldActive) return;
        }

        component.armor -= damage;
        this.hitFlashTimer = 0.1;

        if (component.armor <= 0) {
            component.armor = 0;
            component.destroyed = true;

            // Destroying an outer node also destroys its platform turrets
            if (component === this.leftNode || component === this.rightNode) {
                for (let i = 0; i < this.turrets.length; i++) {
                    const parentNode = this.getParentNode(this.turrets[i].platformIndex);
                    if (parentNode === component) {
                        this.turrets[i].destroyed = true;
                    }
                }
            }

            // Check if boss should begin death sequence
            if (component === this.centralNode) {
                this.beginDeathSequence();
            }
        }
    }

    private beginDeathSequence(): void {
        this.state = BossState.Dying;
        const cx = this.centralNode.x + this.centralNode.width / 2;
        const cy = this.centralNode.y + this.centralNode.height / 2;
        this.deathExplosion.start(cx, cy, 200, 30, 3.0);
    }

    /** Get collision rectangles for all active components. */
    getCollisionRects(): Array<{ rect: Rect; component: BossComponent }> {
        if (this.state === BossState.Entering || this.state === BossState.Dying ||
            this.state === BossState.Dead) {
            return [];
        }

        const results: Array<{ rect: Rect; component: BossComponent }> = [];
        const components = [this.centralNode, this.leftNode, this.rightNode, ...this.platforms];

        for (const comp of components) {
            if (comp.destroyed) continue;
            results.push({
                rect: { x: comp.x, y: comp.y, w: comp.width, h: comp.height },
                component: comp,
            });
        }
        return results;
    }

    /** Whether the boss has been completely defeated. */
    isDefeated(): boolean {
        return this.state === BossState.Dead;
    }

    /** Whether the boss is still in its entrance sequence. */
    isEntering(): boolean {
        return this.state === BossState.Entering;
    }

    /** Get center position for effects. */
    getCenter(): { x: number; y: number } {
        return {
            x: this.centralNode.x + this.centralNode.width / 2,
            y: this.centralNode.y + this.centralNode.height / 2,
        };
    }
}
