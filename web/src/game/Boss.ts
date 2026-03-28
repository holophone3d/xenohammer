/**
 * Boss fight — multi-component ship rewritten from C++ Boss.cpp.
 *
 * Layout (all offsets relative to boss origin):
 *   CenterNode (160×160) at (0,0)
 *   CenterOrb (64×64) at (48,48) — cosmetic until Final phase
 *   4 OuterNodes (128×128) — upper-left, lower-left, lower-right, upper-right
 *   4 OuterOrbs (64×64) — damageable targets on each outer node
 *   8 Platforms (80×80) — 2 per outer node (side + down)
 *   8 OuterTurrets (64×64) — one per platform, frame-based TurretAI
 *   3 Connectors — sprites linking adjacent nodes
 *   2 U-components (144×288) — start off-screen, animate in during morph
 *   6 U-turrets (64×64) — 3 per U, only active in Final state
 *   BossShield (256×256) — sprite at (-48,-48), 50000 HP
 *
 * State machine (from C++):
 *   WAITING → ENTERING → NORMAL → (all 4 orbs dead) → MORPH1 → MORPH2 → FINAL → DYING → DEAD
 */

import { Sprite, AssetLoader } from '../engine';
import { Rect, PLAY_AREA_W, PLAY_AREA_H } from './Collision';
import { Projectile } from './Projectile';
import { Explosion, ChainExplosion } from './Explosion';

// --- Constants from C++ Boss.cpp ---
const BOSS_START_X = 245;
const BOSS_START_Y = -600;
const BOSS_HOVER_Y = -50;           // C++: boss stops at y=-50
const BOSS_DESCENT_SPEED = 50;      // px/s — tuned for feel (C++ literal is 10px/s but too slow)
const BOSS_WAIT_TIME = 110_000;     // ms before boss enters
const BOSS_MUSIC_TIME = 96_000;     // ms before boss music starts
const MORPH_TICK_MS = 10;           // ms per 1px morph step — tuned for feel (C++ literal is 100ms)

const ORB_FRAME_COUNT = 32;         // orb00–orb31 (C++ uses % 32, frame 32 never shown)
const ORB_ANIM_SPEED = 60;          // ms per frame
const TURRET_FRAME_COUNT = 33;      // Turret00–Turret32
const TURRET_TURN_RATE = 65;        // ms between frame changes

// Outer node positions relative to boss origin
const NODE_OFFSETS = [
    { x: -213, y: 111 },  // 0: upper-left
    { x:  -65, y: 259 },  // 1: lower-left
    { x:   97, y: 259 },  // 2: lower-right
    { x:  245, y: 111 },  // 3: upper-right
];

// U-component base positions
const LEFTU_X = -94, LEFTU_Y = -68;
const RIGHTU_X = 112, RIGHTU_Y = -65;

// Center orb offset from boss origin
const CENTER_ORB_OFFSET = { x: 48, y: 48 };
const OUTER_ORB_OFFSET = { x: 32, y: 31 };
const OUTER_ORB_START_FRAMES = [5, 25, 10, 15];

// Platform defs: absolute offsets from boss origin
type PlatformType = 'LEFT' | 'RIGHT' | 'DOWN';
interface PlatformDef {
    type: PlatformType;
    nodeIndex: number;
    offsetX: number;
    offsetY: number;
}
const PLATFORM_DEFS: PlatformDef[] = [
    { type: 'LEFT',  nodeIndex: 0, offsetX: -213 - 51, offsetY: 111 + 23  },
    { type: 'LEFT',  nodeIndex: 1, offsetX:  -65 - 51, offsetY: 259 + 23  },
    { type: 'RIGHT', nodeIndex: 2, offsetX:   97 + 101, offsetY: 259 + 24 },
    { type: 'RIGHT', nodeIndex: 3, offsetX:  245 + 101, offsetY: 111 + 24 },
    { type: 'DOWN',  nodeIndex: 0, offsetX: -213 + 25, offsetY: 111 + 100 },
    { type: 'DOWN',  nodeIndex: 1, offsetX:  -65 + 25, offsetY: 259 + 100 },
    { type: 'DOWN',  nodeIndex: 2, offsetX:   97 + 25, offsetY: 259 + 100 },
    { type: 'DOWN',  nodeIndex: 3, offsetX:  245 + 25, offsetY: 111 + 100 },
];

// Turret offsets: platform position + 8 (centers 64×64 turret on 80×80 platform)
const TURRET_OFFSET = 8;

// Connector positions (absolute offsets from boss origin)
const CONNECTOR_DEFS = [
    { type: 'UL', offsetX: (-213 + -65) / 2,          offsetY: (111 + 259) / 2 },
    { type: 'H',  offsetX: (-65 + 97) / 2 + 64 - 32,  offsetY: (259 + 259) / 2 + 48 },
    { type: 'UR', offsetX: (97 + 245) / 2,            offsetY: (259 + 111) / 2 },
];

// TurretAI types (matching C++ TurretAI.h)
const enum TurretAIType { NORMAL, FIXED, SWEEPING, RANDOM }

// OuterTurret AI configs (from C++ Boss.cpp)
const OUTER_TURRET_AI: { type: TurretAIType; fireRate: number }[] = [
    { type: TurretAIType.SWEEPING, fireRate: 60 },
    { type: TurretAIType.RANDOM,   fireRate: 2000 },
    { type: TurretAIType.RANDOM,   fireRate: 2000 },
    { type: TurretAIType.SWEEPING, fireRate: 60 },
    { type: TurretAIType.RANDOM,   fireRate: 2000 },
    { type: TurretAIType.RANDOM,   fireRate: 2000 },
    { type: TurretAIType.RANDOM,   fireRate: 2000 },
    { type: TurretAIType.RANDOM,   fireRate: 2000 },
];

// U-turret AI configs
const U_TURRET_AI: { type: TurretAIType; fireRate: number }[] = [
    { type: TurretAIType.SWEEPING, fireRate: 30 },
    { type: TurretAIType.NORMAL,   fireRate: 500 },
    { type: TurretAIType.SWEEPING, fireRate: 60 },
    { type: TurretAIType.SWEEPING, fireRate: 30 },
    { type: TurretAIType.NORMAL,   fireRate: 500 },
    { type: TurretAIType.SWEEPING, fireRate: 60 },
];

// U-turret offsets (absolute from boss origin, same as C++)
const U_TURRET_OFFSETS = [
    { x: LEFTU_X - 80 + 46,  y: LEFTU_Y - 336 + 214 },  // 0
    { x: LEFTU_X - 80 + 15,  y: LEFTU_Y - 336 + 173 },  // 1
    { x: LEFTU_X - 80 + 15,  y: LEFTU_Y - 336 + 122 },  // 2
    { x: RIGHTU_X + 80 + 32, y: RIGHTU_Y - 336 + 212 },  // 3
    { x: RIGHTU_X + 80 + 60, y: RIGHTU_Y - 336 + 171 },  // 4
    { x: RIGHTU_X + 80 + 60, y: RIGHTU_Y - 336 + 120 },  // 5
];

// Orb-to-connector mapping: when orb i dies, which connectors to destroy
const ORB_CONNECTOR_MAP: number[][] = [
    [0],    // orb 0 → connector 0
    [0, 1], // orb 1 → connectors 0, 1
    [1, 2], // orb 2 → connectors 1, 2
    [2],    // orb 3 → connector 2
];

// --- Enums / Interfaces ---

export enum BossState {
    Waiting,
    Entering,
    Normal,
    Morph1,   // U-pieces moving down
    Morph2,   // U-pieces moving down + inward
    Final,    // Center vulnerable, U-turrets active
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
    collisionMask: Uint8Array | null;
    maskWidth: number;
    maskHeight: number;
}

// C++ weapon.ready_to_fire(): BLASTER_DELAY / power_MUX(cell1) = 100 / 1.5 ≈ 67ms
// Boss turrets have power_cell_1=1 (default), so multiplier is 1.5×
const BOSS_TURRET_WEAPON_DELAY = 67; // ms — independent of AI fireRate

// Frame-based turret AI state (matching C++ TurretAI)
interface BossTurretAI {
    frame: number;           // current turret frame 0-31
    type: TurretAIType;
    fireRate: number;        // ms between shots (AI-level cooldown)
    lastTurnMs: number;      // last turn timestamp (ms)
    lastFireMs: number;      // last AI fire timestamp (ms)
    lastWeaponFireMs: number; // last actual projectile creation (weapon cooldown)
    sweepState: number;      // 0=waiting, 1=sweeping (for SWEEPING type)
    turnTarget: number;      // target frame for DoTurn
    destroyed: boolean;
    offsetX: number;         // offset from boss origin
    offsetY: number;
    armor: number;           // C++: starts at 600+Hp
    maxArmor: number;
    comp: BossComponent;     // collision component for this turret
}

function makeComp(
    name: string, offX: number, offY: number,
    armor: number, w: number, h: number, damageable: boolean,
): BossComponent {
    return {
        name, x: 0, y: 0, offsetX: offX, offsetY: offY,
        armor, maxArmor: armor, destroyed: false, damageable,
        width: w, height: h, sprite: null, destroyedSprite: null,
        collisionMask: null, maskWidth: 0, maskHeight: 0,
    };
}

/**
 * Build a 1-byte-per-pixel collision mask from a sprite image.
 * 0 = transparent (alpha < 128 or magenta), 1 = opaque.
 * Matches C++ frameMask generation (magenta = transparent marker).
 */
function buildCollisionMask(img: HTMLImageElement): { mask: Uint8Array; w: number; h: number } | null {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w === 0 || h === 0) return null;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < mask.length; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        const a = data[i * 4 + 3];
        // Magenta (R>200, G<50, B>200) is the C++ transparency marker
        const isMagenta = r > 200 && g < 50 && b > 200;
        mask[i] = (a > 128 && !isMagenta) ? 1 : 0;
    }
    return { mask, w, h };
}

/** Apply a built mask to a BossComponent */
function applyMask(comp: BossComponent, img: HTMLImageElement | null): void {
    if (!img) return;
    const result = buildCollisionMask(img);
    if (result) {
        comp.collisionMask = result.mask;
        comp.maskWidth = result.w;
        comp.maskHeight = result.h;
    }
}

function makeTurretAI(
    type: TurretAIType, fireRate: number, offX: number, offY: number,
    armor: number,
): BossTurretAI {
    const comp = makeComp('Turret', offX, offY, armor, 64, 64, true);
    return {
        frame: 0, type, fireRate,
        lastTurnMs: 0, lastFireMs: 0, lastWeaponFireMs: 0,
        sweepState: 0, turnTarget: 0,
        destroyed: false, offsetX: offX, offsetY: offY,
        armor, maxArmor: armor, comp,
    };
}

/** C++ TurretAI::CalculateHeading — frame-based heading from turret to target */
function calculateHeading(
    playerX: number, playerY: number, enemyX: number, enemyY: number,
): number {
    const xoffset = playerX - enemyX;
    const yoffset = (playerY - enemyY) * -1;
    let targetRad: number;
    if (Math.abs(xoffset) > 0.01)
        targetRad = Math.atan(yoffset / xoffset);
    else
        targetRad = Math.atan(yoffset / 0.01);
    if (xoffset < 0) targetRad += Math.PI;
    targetRad += 2 * Math.PI;
    let heading = Math.floor((targetRad + 0.0982) / 0.19635);
    heading = (heading + 8) % 32;
    return heading;
}

/** C++ TurretAI shortest-path turning logic */
function doShortestTurn(currentFrame: number, desiredFrame: number): number {
    if (currentFrame === desiredFrame) return currentFrame;
    let f = currentFrame;
    if (Math.abs(f - (desiredFrame + 32)) < Math.abs(f - desiredFrame)) {
        f++;
    } else if (Math.abs((f + 32) - desiredFrame) < Math.abs(f - desiredFrame)) {
        f--;
        if (f < 0) f += 32;
    } else {
        if (desiredFrame > f) f++;
        else f--;
    }
    return ((f % 32) + 32) % 32;
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
    centerNode: BossComponent;         // 160×160
    outerNodes: BossComponent[];       // 4 × 128×128
    outerOrbs: BossComponent[];        // 4 × 64×64 (damageable)
    centerOrb: BossComponent;          // 64×64 (damageable in Final)
    platforms: BossComponent[];        // 8 × 80×80
    connectors: BossComponent[];       // 3 (UL 128×128, H 64×32, UR 128×128)
    uComponents: BossComponent[];      // 2 × 144×288
    bossShield: BossComponent;         // 256×256, 50000 HP

    // --- Turret AI ---
    outerTurretAIs: BossTurretAI[];    // 8
    uTurretAIs: BossTurretAI[];        // 6

    // --- Orb animations ---
    private centerOrbSprite: Sprite | null = null;
    private outerOrbSprites: Sprite[] = [];

    // --- Shield ---
    shieldActive = true;

    // --- Internal ---
    private difficulty: number;
    private hpOffset: number;
    private stateTimer = 0;
    private levelTimeMs = 0;
    private nowMs = 0;
    private deathExplosion: ChainExplosion;
    private deathTimer = 0;
    private hitFlashTimer = 0;
    private pendingProjectiles: Projectile[] = [];
    private orbCount = 4;
    private turretSprites: HTMLImageElement[] = [];
    private assets: AssetLoader | null = null;
    private morphTickAccum = 0;

    // Track initial turret AI tick
    private turretAIInitialized = false;

    private hitFlashComp: BossComponent | null = null; // which component was hit
    // Component explosions (spawned when turrets/orbs/nodes destroyed)
    private componentExplosions: Explosion[] = [];
    private smallExpFrames: HTMLImageElement[] = [];
    private bigExpFrames: HTMLImageElement[] = [];
    // Particle emission requests for GameManager
    private pendingParticleEmits: Array<{ x: number; y: number; count: number }> = [];
    // Sound requests for GameManager (C++: Sound::playExplosionSound() on component destruction)
    private pendingSoundEmits: string[] = [];

    // C++ GL_Handler pulsing alpha values
    private warningAlpha = 1.0;
    private warningAlphaUp = false;
    private bossAlpha = 0.3;
    private bossAlphaUp = true;

    // Boss shield texture (same Shield.png as player, tinted purple)
    private shieldTexture: HTMLImageElement | null = null;
    private static _shieldCanvas: HTMLCanvasElement | null = null;

    constructor(difficulty = 1) {
        this.difficulty = difficulty;
        this.hpOffset = difficulty === 0 ? -200 : difficulty === 2 ? 200 : difficulty === 3 ? 1000 : 0;
        this.x = BOSS_START_X;
        this.y = BOSS_START_Y;

        const hp = this.hpOffset;

        // Center node: 160×160, not damageable until Final
        this.centerNode = makeComp('CenterNode', 0, 0, 1000 + hp, 160, 160, false);

        // Center orb: 64×64, not damageable until Final (win condition target)
        this.centerOrb = makeComp('CenterOrb', CENTER_ORB_OFFSET.x, CENTER_ORB_OFFSET.y,
            1000 + hp, 64, 64, false);

        // 4 outer nodes: 128×128, structural
        this.outerNodes = NODE_OFFSETS.map((n, i) =>
            makeComp(`OuterNode${i}`, n.x, n.y, 500_000, 128, 128, false));

        // 4 outer orbs: 64×64, damageable
        this.outerOrbs = NODE_OFFSETS.map((n, i) =>
            makeComp(`OuterOrb${i}`, n.x + OUTER_ORB_OFFSET.x, n.y + OUTER_ORB_OFFSET.y,
                500 + hp, 64, 64, true));

        // 8 platforms: 80×80
        this.platforms = PLATFORM_DEFS.map((d, i) =>
            makeComp(`Platform${i}`, d.offsetX, d.offsetY, 10, 80, 80, false));

        // 3 connectors
        const connSizes = [
            { w: 128, h: 128 }, // UL
            { w: 64,  h: 32  }, // H
            { w: 128, h: 128 }, // UR
        ];
        this.connectors = CONNECTOR_DEFS.map((c, i) =>
            makeComp(`Connector${i}`, c.offsetX, c.offsetY,
                10000, connSizes[i].w, connSizes[i].h, true));

        // 2 U-components: 144×288, start off-screen
        this.uComponents = [
            makeComp('LeftU',  LEFTU_X - 80,  LEFTU_Y - 336, 500 + hp, 144, 288, false),
            makeComp('RightU', RIGHTU_X + 80, RIGHTU_Y - 336, 500 + hp, 144, 288, false),
        ];

        // Boss shield: 256×256, 50000 HP
        this.bossShield = makeComp('BossShield', -48, -48, 50000, 256, 256, true);

        // 8 outer turret AIs (C++: armor=600+Hp)
        const turretArmor = 600 + hp;
        this.outerTurretAIs = OUTER_TURRET_AI.map((cfg, i) =>
            makeTurretAI(cfg.type, cfg.fireRate,
                PLATFORM_DEFS[i].offsetX + TURRET_OFFSET,
                PLATFORM_DEFS[i].offsetY + TURRET_OFFSET, turretArmor));

        // 6 U-turret AIs
        this.uTurretAIs = U_TURRET_AI.map((cfg, i) =>
            makeTurretAI(cfg.type, cfg.fireRate,
                U_TURRET_OFFSETS[i].x, U_TURRET_OFFSETS[i].y, turretArmor));

        this.deathExplosion = new ChainExplosion();

        // Initialize component positions so they're correct on the first render frame
        this.updateComponentPositions();
    }

    // ---------------------------------------------------------------
    // Sprite loading
    // ---------------------------------------------------------------

    loadSprites(assets: AssetLoader): void {
        this.assets = assets;
        const tryImg = (id: string): HTMLImageElement | null => {
            try { return assets.getImage(id); } catch { return null; }
        };
        const trySprite = (id: string): Sprite | null => {
            const img = tryImg(id);
            return img ? new Sprite([img], 100) : null;
        };

        // Center node
        this.centerNode.sprite = trySprite('BossNode1');
        this.centerNode.destroyedSprite = trySprite('BossNode1Destroyed');

        // Outer nodes (BossNode2, no destroyed sprite in C++)
        for (const node of this.outerNodes) {
            node.sprite = trySprite('BossNode2');
        }

        // Platforms
        const platSpriteMap: Record<PlatformType, string> = {
            LEFT: 'BossLeftPlatform', RIGHT: 'BossRightPlatform', DOWN: 'BossDownPlatform',
        };
        for (let i = 0; i < this.platforms.length; i++) {
            this.platforms[i].sprite = trySprite(platSpriteMap[PLATFORM_DEFS[i].type]);
        }

        // Connectors
        const connNames = ['ConnectorUL', 'ConnectorH', 'ConnectorUR'];
        const connRedNames = ['ConnectorULRED', 'ConnectorHRED', 'ConnectorURRED'];
        for (let i = 0; i < this.connectors.length; i++) {
            this.connectors[i].sprite = trySprite(connNames[i]);
            this.connectors[i].destroyedSprite = trySprite(connRedNames[i]);
        }

        // U-components
        this.uComponents[0].sprite = trySprite('BossLeftU');
        this.uComponents[1].sprite = trySprite('BossRightU');

        // Boss shield
        this.bossShield.sprite = trySprite('bossShield');

        // Orb animation frames (orb00–orb32)
        const orbFrames: HTMLImageElement[] = [];
        try {
            for (let i = 0; i < ORB_FRAME_COUNT; i++) {
                orbFrames.push(assets.getImage(`orb${i.toString().padStart(2, '0')}`));
            }
        } catch { /* not available */ }

        if (orbFrames.length > 0) {
            this.centerOrbSprite = new Sprite(orbFrames, ORB_ANIM_SPEED);
            this.centerOrbSprite.currentFrame = 0;
            for (let i = 0; i < 4; i++) {
                const orb = new Sprite(orbFrames, ORB_ANIM_SPEED);
                orb.currentFrame = OUTER_ORB_START_FRAMES[i] % ORB_FRAME_COUNT;
                this.outerOrbSprites.push(orb);
            }
        }

        // Turret sprites (Turret00–Turret32)
        this.turretSprites = [];
        for (let i = 0; i < TURRET_FRAME_COUNT; i++) {
            const img = tryImg(`Turret${i.toString().padStart(2, '0')}`);
            if (img) this.turretSprites.push(img);
        }

        // Explosion sprite frames
        this.smallExpFrames = Explosion.loadFrames(assets, 'small');
        this.bigExpFrames = Explosion.loadFrames(assets, 'big');

        // Build collision masks from sprite images (C++ frameMask equivalent)
        this.buildCollisionMasks(tryImg);

        // Load shield texture (same Shield.png used by player, tinted purple for boss)
        try { this.shieldTexture = assets.getImage('Shield'); } catch { /* not available */ }
    }

    /** Generate per-pixel collision masks for all boss components */
    private buildCollisionMasks(tryImg: (id: string) => HTMLImageElement | null): void {
        // Static structural components
        applyMask(this.centerNode, tryImg('BossNode1'));
        for (const node of this.outerNodes) applyMask(node, tryImg('BossNode2'));

        // Platforms — match sprite by type from PLATFORM_DEFS
        const platMaskMap: Record<string, string> = {
            LEFT: 'BossLeftPlatform', RIGHT: 'BossRightPlatform', DOWN: 'BossDownPlatform',
        };
        for (let i = 0; i < this.platforms.length; i++) {
            applyMask(this.platforms[i], tryImg(platMaskMap[PLATFORM_DEFS[i].type]));
        }
        applyMask(this.connectors[0], tryImg('ConnectorUL'));
        applyMask(this.connectors[1], tryImg('ConnectorH'));
        applyMask(this.connectors[2], tryImg('ConnectorUR'));
        applyMask(this.bossShield, tryImg('bossShield'));

        // U-components
        applyMask(this.uComponents[0], tryImg('BossLeftU'));
        applyMask(this.uComponents[1], tryImg('BossRightU'));

        // Orbs — use frame 0 (all frames are similar circular shapes)
        const orbImg = tryImg('orb00');
        if (orbImg) {
            applyMask(this.centerOrb, orbImg);
            for (const orb of this.outerOrbs) applyMask(orb, orbImg);
        }

        // Turrets — use frame 0 (64x64, small enough that mask helps but isn't critical)
        const turretImg = tryImg('Turret00');
        if (turretImg) {
            for (const ai of this.outerTurretAIs) applyMask(ai.comp, turretImg);
            for (const ai of this.uTurretAIs) applyMask(ai.comp, turretImg);
        }
    }

    // ---------------------------------------------------------------
    // Update
    // ---------------------------------------------------------------

    update(dt: number, playerX: number, playerY: number, now: number, levelTimeMs: number): void {
        this.levelTimeMs = levelTimeMs;
        this.nowMs = now;
        this.pendingProjectiles = [];

        if (this.state === BossState.Dead) return;

        if (this.state === BossState.Dying) {
            this.deathExplosion.update(dt, this.assets);
            this.updateComponentExplosions(dt);
            this.deathTimer += dt;

            // C++ GameManager: random explosions for 10 seconds (first 10 of 11-sec window)
            // 40% chance per frame of MakeExplosions at random position across boss
            // 2% chance per frame of destroy_orb (5 explosion clusters)
            const framesThisTick = Math.max(1, Math.round(dt * 60));
            if (this.deathTimer < 10.0) {
                for (let f = 0; f < framesThisTick; f++) {
                    if (Math.random() > 0.6) {
                        const ex = this.x - 100 + Math.random() * 300;
                        const ey = this.y + Math.random() * 150;
                        this.spawnExplosion(ex, ey, 'big');
                    }
                    if (Math.random() > 0.98) {
                        // destroy_orb: 5 explosion clusters at random position
                        const ox = this.x - 100 + Math.random() * 300;
                        const oy = this.y + Math.random() * 150;
                        for (const [dx, dy] of [[32,32],[96,32],[62,32],[96,62],[32,62]]) {
                            this.spawnExplosion(ox + dx, oy + dy, 'big');
                        }
                    }
                }
            }

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
                return;

            case BossState.Entering:
                this.y += BOSS_DESCENT_SPEED * dt;
                if (this.y >= BOSS_HOVER_Y) {
                    this.y = BOSS_HOVER_Y;
                    this.state = BossState.Normal;
                    this.stateTimer = 0;
                }
                break;

            case BossState.Normal:
            case BossState.Final:
                this.updateCombat(dt, playerX, playerY);
                break;

            case BossState.Morph1:
            case BossState.Morph2:
                this.updateMorph(dt);
                this.updateTurretFiring(dt, playerX, playerY);
                break;
        }

        // Animate orbs
        if (this.centerOrbSprite && !this.centerOrb.destroyed) {
            this.centerOrbSprite.update(dt * 1000);
        }
        for (let i = 0; i < this.outerOrbSprites.length; i++) {
            if (!this.outerOrbs[i].destroyed) {
                this.outerOrbSprites[i].update(dt * 1000);
            }
        }

        // Update pulsing alpha values (C++ GL_Handler per-frame update)
        // warningAlpha: slow decrease 0.01/frame, fast increase 0.1/frame (0.3–1.0)
        // bossAlpha: symmetric 0.01/frame both ways (0.1–0.6)
        // Normalize to ~60fps equivalent: multiply by dt*60
        const frameFactor = dt * 60;
        if (!this.warningAlphaUp) {
            this.warningAlpha -= 0.01 * frameFactor;
            if (this.warningAlpha < 0.3) this.warningAlphaUp = true;
        } else {
            this.warningAlpha += 0.1 * frameFactor;
            if (this.warningAlpha > 1.0) { this.warningAlpha = 1.0; this.warningAlphaUp = false; }
        }
        if (!this.bossAlphaUp) {
            this.bossAlpha -= 0.01 * frameFactor;
            if (this.bossAlpha < 0.1) this.bossAlphaUp = true;
        } else {
            this.bossAlpha += 0.01 * frameFactor;
            if (this.bossAlpha > 0.6) { this.bossAlpha = 0.6; this.bossAlphaUp = false; }
        }

        this.updateComponentPositions();
        this.updateShieldState();
        this.handleOrbDestruction();
        this.updateComponentExplosions(dt);
    }

    shouldTriggerMusic(): boolean {
        if (this.musicTriggered) return false;
        if (this.levelTimeMs >= BOSS_MUSIC_TIME) {
            this.musicTriggered = true;
            return true;
        }
        return false;
    }

    // ---------------------------------------------------------------
    // Combat
    // ---------------------------------------------------------------

    private updateCombat(dt: number, playerX: number, playerY: number): void {
        // Gentle hover bob
        const bob = Math.sin(this.stateTimer * 0.5) * 3;
        this.y = BOSS_HOVER_Y + bob;

        // Check morph transition: ALL 4 outer orbs destroyed → MORPH1
        if (this.state === BossState.Normal && this.orbCount <= 0) {
            this.state = BossState.Morph1;
            this.morphTickAccum = 0;
            this.stateTimer = 0;
        }

        this.updateTurretFiring(dt, playerX, playerY);
    }

    private updateTurretFiring(dt: number, playerX: number, playerY: number): void {
        // Initialize turret AI timestamps on first frame
        if (!this.turretAIInitialized) {
            this.turretAIInitialized = true;
            const t = this.nowMs;
            for (const ai of this.outerTurretAIs) {
                ai.lastTurnMs = t;
                ai.lastFireMs = t;
                ai.lastWeaponFireMs = t;
            }
            for (const ai of this.uTurretAIs) {
                ai.lastTurnMs = t;
                ai.lastFireMs = t;
                ai.lastWeaponFireMs = t;
            }
        }

        // Outer turrets (active in Normal, Morph, Final)
        if (this.state !== BossState.Entering) {
            for (let i = 0; i < 8; i++) {
                const ai = this.outerTurretAIs[i];
                if (ai.destroyed) continue;
                // C++: turret position = boss + turret_offset + 16 (not center)
                const tx = this.x + ai.offsetX + 16;
                const ty = this.y + ai.offsetY + 16;
                const result = this.runTurretAI(ai, playerX, playerY, tx, ty);
                if (result.fire) {
                    // C++ weapon.ready_to_fire() — separate cooldown from AI
                    if (this.nowMs - ai.lastWeaponFireMs >= BOSS_TURRET_WEAPON_DELAY) {
                        ai.lastWeaponFireMs = this.nowMs;
                        this.fireTurret(ai.frame, tx, ty);
                    }
                }
            }
        }

        // U-turrets (only active in Final)
        if (this.state === BossState.Final) {
            for (let i = 0; i < 6; i++) {
                const ai = this.uTurretAIs[i];
                if (ai.destroyed) continue;
                const tx = this.x + ai.offsetX + 16;
                const ty = this.y + ai.offsetY + 16;
                const result = this.runTurretAI(ai, playerX, playerY, tx, ty);
                if (result.fire) {
                    // C++ weapon.ready_to_fire() — separate cooldown from AI
                    if (this.nowMs - ai.lastWeaponFireMs >= BOSS_TURRET_WEAPON_DELAY) {
                        ai.lastWeaponFireMs = this.nowMs;
                        this.fireTurret(ai.frame, tx, ty);
                    }
                }
            }
        }
    }

    // ---------------------------------------------------------------
    // TurretAI (C++ port)
    // ---------------------------------------------------------------

    private runTurretAI(
        ai: BossTurretAI, playerX: number, playerY: number,
        turretX: number, turretY: number,
    ): { fire: boolean } {
        const tic = this.nowMs;
        const desiredHeading = calculateHeading(playerX, playerY, turretX, turretY);

        switch (ai.type) {
            case TurretAIType.NORMAL:
            case TurretAIType.RANDOM: {
                if (ai.frame === desiredHeading) {
                    // Aimed at player — try to fire
                    if (tic - ai.lastFireMs < ai.fireRate) {
                        ai.lastTurnMs = tic;
                        return { fire: false };
                    }
                    if (ai.type === TurretAIType.NORMAL)
                        ai.lastFireMs = tic;
                    else
                        ai.lastFireMs = tic - Math.floor(Math.random() * 500);
                    return { fire: true };
                }
                // Turn toward player
                if (tic - ai.lastTurnMs >= TURRET_TURN_RATE) {
                    ai.lastTurnMs = tic;
                    ai.frame = doShortestTurn(ai.frame, desiredHeading);
                }
                return { fire: false };
            }

            case TurretAIType.SWEEPING: {
                if (ai.sweepState === 0) {
                    // Waiting: turn to heading - 5
                    const target = ((desiredHeading - 5) + 32) % 32;
                    ai.turnTarget = target;
                    // DoTurn
                    if (ai.frame !== ai.turnTarget && tic - ai.lastTurnMs >= TURRET_TURN_RATE) {
                        ai.lastTurnMs += TURRET_TURN_RATE;
                        ai.frame = doShortestTurn(ai.frame, ai.turnTarget);
                    }
                    // Wait 3000ms then sweep
                    if (tic - ai.lastFireMs > 3000) {
                        ai.lastFireMs = tic;
                        ai.lastTurnMs = tic;
                        ai.sweepState = 1;
                    }
                    return { fire: false };
                } else {
                    // Sweeping: advance frame and fire
                    let fire = false;
                    if (tic - ai.lastFireMs >= ai.fireRate) {
                        fire = true;
                        ai.frame = (ai.frame + 1) % 32;
                        ai.lastFireMs += ai.fireRate;
                    }
                    // Stop sweep at heading + 5
                    if (ai.frame === (desiredHeading + 5) % 32) {
                        ai.sweepState = 0;
                        ai.lastFireMs = tic;
                        ai.lastTurnMs = tic;
                    }
                    return { fire };
                }
            }

            case TurretAIType.FIXED: {
                if (ai.frame === desiredHeading) {
                    if (tic - ai.lastFireMs < ai.fireRate) {
                        ai.lastTurnMs = tic;
                        return { fire: false };
                    }
                    ai.lastFireMs = tic;
                    return { fire: true };
                }
                return { fire: false };
            }
        }
        return { fire: false };
    }

    // ---------------------------------------------------------------
    // Fire turret projectile (C++ Boss::FireTurret)
    // ---------------------------------------------------------------

    private fireTurret(frame: number, turretCenterX: number, turretCenterY: number): void {
        const rad = ((frame - 8) / 32) * 2 * Math.PI;
        const xOff = Math.cos(rad) * 24;
        const yOff = Math.sin(rad) * -24;

        const spawnX = turretCenterX + xOff;
        const spawnY = turretCenterY + yOff;

        let sprite: Sprite | null = null;
        if (this.assets) {
            try {
                const frames: HTMLImageElement[] = [];
                for (let i = 0; i < 8; i++) {
                    frames.push(this.assets.getImage(`enemy_${i + 1}`));
                }
                sprite = new Sprite(frames, 100);
                sprite.setFrame(Math.min(3, frames.length - 1));
                sprite.loop = false;
            } catch { /* no sprite */ }
        }

        // C++ ENEMYBLASTER: fire(x+xOff, y+yOff, xOff/2, yOff/2)
        // Projectile constructor doubles: dx=_dx*2, dy=_dy*2 → actual = (xOff, yOff)
        // C++ damage: 3 * ENEMY_DAMAGE_1(5) * power_MUX(pc2=4 → 3.0) = 45
        const proj = new Projectile(
            spawnX, spawnY,
            xOff, yOff,
            45, 'enemy', sprite, 'enemyBlast',
        );
        this.pendingSoundEmits.push('AlienWeapon1');
        this.pendingProjectiles.push(proj);
    }

    // ---------------------------------------------------------------
    // Morph animation (C++ BOSS_MORPH1 / BOSS_MORPH2)
    // ---------------------------------------------------------------

    private updateMorph(dt: number): void {
        const bob = Math.sin(this.stateTimer * 0.5) * 3;
        this.y = BOSS_HOVER_Y + bob;

        // Move U-pieces at MORPH_TICK_MS per pixel step
        this.morphTickAccum += dt * 1000;
        while (this.morphTickAccum >= MORPH_TICK_MS) {
            this.morphTickAccum -= MORPH_TICK_MS;

            if (this.state === BossState.Morph1) {
                // Move U-pieces straight down
                this.uComponents[0].offsetY += 1;
                this.uComponents[1].offsetY += 1;
                for (const ai of this.uTurretAIs) ai.offsetY += 1;

                // Transition when LeftU reaches LEFTU_Y - 80 = -148
                if (this.uComponents[0].offsetY >= LEFTU_Y - 80) {
                    this.state = BossState.Morph2;
                }
            } else if (this.state === BossState.Morph2) {
                // Move U-pieces down + inward
                this.uComponents[0].offsetY += 1;
                this.uComponents[0].offsetX += 1;
                this.uComponents[1].offsetY += 1;
                this.uComponents[1].offsetX -= 1;
                for (let i = 0; i < 6; i++) {
                    this.uTurretAIs[i].offsetY += 1;
                    if (i < 3) this.uTurretAIs[i].offsetX += 1;
                    else this.uTurretAIs[i].offsetX -= 1;
                }

                // Transition when LeftU reaches LEFTU_Y = -68
                if (this.uComponents[0].offsetY >= LEFTU_Y) {
                    this.state = BossState.Final;
                    this.centerNode.damageable = true;
                    this.centerOrb.damageable = true;
                    this.stateTimer = 0;
                }
            }
        }
    }

    // ---------------------------------------------------------------
    // Component positions
    // ---------------------------------------------------------------

    private updateComponentPositions(): void {
        this.centerNode.x = this.x + this.centerNode.offsetX;
        this.centerNode.y = this.y + this.centerNode.offsetY;

        this.centerOrb.x = this.x + this.centerOrb.offsetX;
        this.centerOrb.y = this.y + this.centerOrb.offsetY;

        for (const node of this.outerNodes) {
            node.x = this.x + node.offsetX;
            node.y = this.y + node.offsetY;
        }
        for (const orb of this.outerOrbs) {
            orb.x = this.x + orb.offsetX;
            orb.y = this.y + orb.offsetY;
        }
        for (const plat of this.platforms) {
            plat.x = this.x + plat.offsetX;
            plat.y = this.y + plat.offsetY;
        }
        for (const conn of this.connectors) {
            conn.x = this.x + conn.offsetX;
            conn.y = this.y + conn.offsetY;
        }
        for (const u of this.uComponents) {
            u.x = this.x + u.offsetX;
            u.y = this.y + u.offsetY;
        }
        this.bossShield.x = this.x + this.bossShield.offsetX;
        this.bossShield.y = this.y + this.bossShield.offsetY;

        // Update turret component positions for collision
        for (const ai of this.outerTurretAIs) {
            ai.comp.x = this.x + ai.offsetX;
            ai.comp.y = this.y + ai.offsetY;
            ai.comp.destroyed = ai.destroyed;
        }
        for (const ai of this.uTurretAIs) {
            ai.comp.x = this.x + ai.offsetX;
            ai.comp.y = this.y + ai.offsetY;
            ai.comp.destroyed = ai.destroyed;
        }
    }

    private updateShieldState(): void {
        this.shieldActive = this.orbCount > 0;
    }

    // ---------------------------------------------------------------
    // Orb destruction handling (C++ Boss::update component destruction)
    // ---------------------------------------------------------------

    private handleOrbDestruction(): void {
        for (let i = 0; i < 4; i++) {
            const orb = this.outerOrbs[i];
            if (!orb.destroyed || !this.outerNodes[i] || this.outerNodes[i].destroyed) continue;

            // Orb just destroyed — cascade destruction
            this.outerNodes[i].destroyed = true;

            // Destroy turrets i and i+4 (C++: set_visible(false), set_damageable(false))
            this.outerTurretAIs[i].destroyed = true;
            this.outerTurretAIs[i].comp.destroyed = true;
            this.outerTurretAIs[i].comp.damageable = false;
            if (i + 4 < 8) {
                this.outerTurretAIs[i + 4].destroyed = true;
                this.outerTurretAIs[i + 4].comp.destroyed = true;
                this.outerTurretAIs[i + 4].comp.damageable = false;
            }

            // Destroy platforms i and i+4
            this.platforms[i].destroyed = true;
            if (i + 4 < 8) this.platforms[i + 4].destroyed = true;

            // Destroy adjacent connectors (C++: set_visible(false), set_damageable(false))
            for (const ci of ORB_CONNECTOR_MAP[i]) {
                if (ci < this.connectors.length) {
                    this.connectors[ci].destroyed = true;
                    this.connectors[ci].damageable = false;
                }
            }

            this.orbCount--;

            // C++ destroy_ship(): 9 calls to MakeExplosions at node position
            const nx = this.outerNodes[i].x;
            const ny = this.outerNodes[i].y;
            const nodeExpOffsets = [
                [32,32],[32,96],[96,32],[96,96],[62,32],
                [62,96],[96,62],[32,62],[62,62],
            ];
            for (const [ox, oy] of nodeExpOffsets) {
                this.spawnExplosion(nx + ox, ny + oy, 'big');
            }
        }

        // When all orbs gone, destroy boss shield
        if (this.orbCount <= 0 && !this.bossShield.destroyed) {
            this.bossShield.destroyed = true;
        }

        // CenterOrb destroyed → death sequence
        if (this.centerOrb.destroyed && this.state !== BossState.Dying && this.state !== BossState.Dead) {
            this.beginDeathSequence();
        }
    }

    // ---------------------------------------------------------------
    // Damage
    // ---------------------------------------------------------------

    /**
     * Apply damage from a projectile hit. Returns true if the hit was accepted
     * (opaque pixel collision), false if it missed (transparent area).
     */
    takeDamage(hitX: number, hitY: number, damage: number): boolean {
        if (this.state === BossState.Waiting ||
            this.state === BossState.Dying  || this.state === BossState.Dead) return false;

        const comp = this.findHitComponent(hitX, hitY);
        if (!comp) return false;

        // Boss shield component absorbs hits (bullet explodes on contact)
        if (comp === this.bossShield) {
            if (!this.shieldActive) {
                this.bossShield.armor -= damage;
                if (this.bossShield.armor <= 0) {
                    this.bossShield.armor = 0;
                    this.bossShield.destroyed = true;
                }
            }
            this.hitFlashTimer = 0.1;
            this.hitFlashComp = comp;
            return true;
        }

        // When shield is active, ALL internal components are protected.
        // Only outer orbs and outer turrets (outside the shield) can be damaged.
        if (this.shieldActive) {
            const isOuterOrb = this.outerOrbs.includes(comp);
            const isOuterTurret = this.outerTurretAIs.some(ai => ai.comp === comp);
            if (!isOuterOrb && !isOuterTurret) {
                return true; // bullet explodes but no damage to internal component
            }
        }

        comp.armor -= damage;
        this.hitFlashTimer = 0.1;
        this.hitFlashComp = comp;

        if (comp.armor <= 0) {
            comp.armor = 0;
            comp.destroyed = true;

            // Spawn explosion at destroyed component center
            const cx = comp.x + comp.width / 2;
            const cy = comp.y + comp.height / 2;
            this.spawnExplosion(cx, cy, 'big');

            // Sync turret component destruction back to AI
            for (const ai of this.outerTurretAIs) {
                if (ai.comp === comp) { ai.destroyed = true; break; }
            }
            for (const ai of this.uTurretAIs) {
                if (ai.comp === comp) { ai.destroyed = true; break; }
            }
        }
        return true;
    }

    /**
     * Sprite-level collision detection with priority ordering.
     * Shield is checked FIRST (highest priority) — its sprite mask has a
     * transparent center so bullets pass through to internal components.
     * Uses per-pixel collision masks built from sprite images (C++ frameMask
     * equivalent) instead of bounding-box-only checks.
     */
    private findHitComponent(hitX: number, hitY: number): BossComponent | null {
        // Sprite-level check: AABB broadphase then pixel mask verification
        const check = (comp: BossComponent): boolean => {
            if (comp.destroyed || !comp.damageable) return false;
            // AABB broadphase
            if (hitX < comp.x || hitX > comp.x + comp.width ||
                hitY < comp.y || hitY > comp.y + comp.height) return false;
            // Sprite mask check — if no mask, fall back to AABB (accept hit)
            if (!comp.collisionMask) return true;
            // Convert to mask-local coordinates (scale if mask size differs from component)
            const localX = Math.floor((hitX - comp.x) * comp.maskWidth / comp.width);
            const localY = Math.floor((hitY - comp.y) * comp.maskHeight / comp.height);
            if (localX < 0 || localX >= comp.maskWidth ||
                localY < 0 || localY >= comp.maskHeight) return false;
            return comp.collisionMask[localY * comp.maskWidth + localX] > 0;
        };

        // 1. Boss shield — HIGHEST PRIORITY
        //    When shield is active, treat as solid circle (sprite has transparent center)
        if (!this.bossShield.destroyed && this.bossShield.damageable) {
            const inAABB = hitX >= this.bossShield.x && hitX <= this.bossShield.x + this.bossShield.width &&
                           hitY >= this.bossShield.y && hitY <= this.bossShield.y + this.bossShield.height;
            if (inAABB && this.shieldActive) {
                // Solid circle check — radius = half width (128px)
                const cx = this.bossShield.x + this.bossShield.width / 2;
                const cy = this.bossShield.y + this.bossShield.height / 2;
                const dx = hitX - cx, dy = hitY - cy;
                const r = this.bossShield.width / 2;
                if (dx * dx + dy * dy <= r * r) return this.bossShield;
            } else if (check(this.bossShield)) {
                return this.bossShield;
            }
        }

        // 2. Center orb (64x64 win condition)
        if (check(this.centerOrb)) return this.centerOrb;
        // 3. Center node (160x160 — only damageable in Final)
        if (check(this.centerNode)) return this.centerNode;
        // 4. Outer orbs (64x64 each)
        for (const orb of this.outerOrbs) {
            if (check(orb)) return orb;
        }
        // 5. Outer turrets (64x64 each)
        for (const ai of this.outerTurretAIs) {
            if (!ai.destroyed && check(ai.comp)) return ai.comp;
        }
        // 6. Connectors
        for (const conn of this.connectors) {
            if (check(conn)) return conn;
        }
        // 7. U-turrets (on the arms — always damageable, arms themselves are not)
        for (const ai of this.uTurretAIs) {
            if (!ai.destroyed && check(ai.comp)) return ai.comp;
        }

        return null;
    }

    private beginDeathSequence(): void {
        this.state = BossState.Dying;
        this.stateTimer = 0;
        this.deathTimer = 0;

        // Destroy all U-turrets (C++: set_damageable(false), destroyed frame)
        for (const ai of this.uTurretAIs) {
            ai.destroyed = true;
            ai.comp.destroyed = true;
            ai.comp.damageable = false;
            const tx = this.x + ai.offsetX + 32;
            const ty = this.y + ai.offsetY + 32;
            this.spawnExplosion(tx, ty, 'big');
        }

        // Stop all outer turrets firing (mark destroyed so they show destroyed sprite)
        for (const ai of this.outerTurretAIs) {
            if (!ai.destroyed) {
                ai.destroyed = true;
                ai.comp.destroyed = true;
                ai.comp.damageable = false;
            }
        }

        // Mark center node as destroyed (swaps to node1Dest sprite)
        this.centerNode.destroyed = true;
        this.centerNode.damageable = false;

        const cx = this.centerNode.x + this.centerNode.width / 2;
        const cy = this.centerNode.y + this.centerNode.height / 2;
        this.deathExplosion.start(cx, cy, 250, 40, 11.0);
    }

    // ---------------------------------------------------------------
    // Projectiles & Collision
    // ---------------------------------------------------------------

    getProjectiles(): Projectile[] {
        return this.pendingProjectiles;
    }

    /** Returns and clears pending particle emission requests for GameManager */
    getParticleEmits(): Array<{ x: number; y: number; count: number }> {
        const emits = this.pendingParticleEmits;
        this.pendingParticleEmits = [];
        return emits;
    }

    getSoundEmits(): string[] {
        const sounds = this.pendingSoundEmits;
        this.pendingSoundEmits = [];
        return sounds;
    }

    getComponentRects(): Array<{ rect: Rect; component: BossComponent }> {
        if (this.state === BossState.Waiting ||
            this.state === BossState.Dying  || this.state === BossState.Dead) {
            return [];
        }

        const results: Array<{ rect: Rect; component: BossComponent }> = [];
        const addComp = (comp: BossComponent) => {
            if (comp.destroyed) return;
            results.push({ component: comp, rect: { x: comp.x, y: comp.y, w: comp.width, h: comp.height } });
        };

        // Damageable targets first
        addComp(this.centerOrb);
        addComp(this.centerNode);
        for (const orb of this.outerOrbs) addComp(orb);
        for (const ai of this.outerTurretAIs) addComp(ai.comp);
        for (const node of this.outerNodes) addComp(node);
        for (const plat of this.platforms) addComp(plat);
        for (const conn of this.connectors) addComp(conn);
        // U-turrets only collidable in Final state
        if (this.state === BossState.Final) {
            for (const ai of this.uTurretAIs) addComp(ai.comp);
        }
        addComp(this.bossShield);

        return results;
    }

    // ---------------------------------------------------------------
    // State queries
    // ---------------------------------------------------------------

    isDefeated(): boolean { return this.state === BossState.Dead; }
    isEntering(): boolean { return this.state === BossState.Entering; }
    isVisible(): boolean { return this.state !== BossState.Waiting; }

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
        if (this.state === BossState.Dead) return;
        if (this.state === BossState.Waiting) return;

        // Back to front: connectors → U-components → platforms → nodes → orbs → turrets → shield

        // Connectors
        for (const conn of this.connectors) {
            if (!conn.destroyed) this.drawComp(ctx, conn, '#556');
        }

        // U-components (visible during morph/final/dying)
        if (this.state === BossState.Morph1 || this.state === BossState.Morph2 ||
            this.state === BossState.Final || this.state === BossState.Dying) {
            for (const u of this.uComponents) this.drawComp(ctx, u, '#446');
        }

        // Platforms
        for (const p of this.platforms) {
            if (!p.destroyed) this.drawComp(ctx, p, '#444');
        }

        // Outer nodes
        for (const n of this.outerNodes) {
            if (!n.destroyed) this.drawComp(ctx, n, '#688');
        }

        // Center node
        this.drawComp(ctx, this.centerNode, '#889');

        // Energy beam effects (glowing orbs, connector beams, glowy bars)
        this.drawEnergyEffects(ctx);

        // Center orb
        if (!this.centerOrb.destroyed) {
            const ox = this.centerOrb.x;
            const oy = this.centerOrb.y;
            if (this.centerOrbSprite) {
                this.centerOrbSprite.drawAt(ctx, ox, oy);
            } else {
                this.drawFallbackOrb(ctx, ox + 32, oy + 32, 0);
            }
        }

        // Outer orbs
        for (let i = 0; i < this.outerOrbs.length; i++) {
            const orb = this.outerOrbs[i];
            if (orb.destroyed) continue;
            if (i < this.outerOrbSprites.length) {
                this.outerOrbSprites[i].drawAt(ctx, orb.x, orb.y);
            } else {
                this.drawFallbackOrb(ctx, orb.x + 32, orb.y + 32, i + 1);
            }

            // Armor bar — not in original C++ (removed)
            }

        // Outer turrets
        this.drawTurretSet(ctx, this.outerTurretAIs);

        // U-turrets (visible in morph/final/dying states)
        if (this.state === BossState.Morph1 || this.state === BossState.Morph2 ||
            this.state === BossState.Final || this.state === BossState.Dying) {
            this.drawTurretSet(ctx, this.uTurretAIs);
        }

        // Boss shield — rendered via drawEnergyEffects() as additive purple glow
        // (C++ uses OpenGL textured quad with additive blending, not a sprite)

        // Hit flash — subtle glow at hit component center (not a white rectangle)
        if (this.hitFlashTimer > 0 && this.hitFlashComp) {
            const hc = this.hitFlashComp;
            const hcx = hc.x + hc.width / 2;
            const hcy = hc.y + hc.height / 2;
            const flashR = Math.max(hc.width, hc.height) * 0.4;
            const flashA = this.hitFlashTimer * 4;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const grad = ctx.createRadialGradient(hcx, hcy, 0, hcx, hcy, flashR);
            grad.addColorStop(0, `rgba(255,255,255,${flashA})`);
            grad.addColorStop(0.5, `rgba(255,200,100,${flashA * 0.5})`);
            grad.addColorStop(1, 'rgba(255,100,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(hcx - flashR, hcy - flashR, flashR * 2, flashR * 2);
            ctx.restore();
        }

        // Component explosions (on top of everything)
        this.drawComponentExplosions(ctx);

        // Death explosion chain (on top of everything during Dying state)
        if (this.state === BossState.Dying) {
            this.deathExplosion.draw(ctx);
        }
    }

    render(ctx: CanvasRenderingContext2D): void {
        this.draw(ctx, null);
    }

    // --- Draw helpers ---

    private drawComp(ctx: CanvasRenderingContext2D, comp: BossComponent, color: string): void {
        if (comp.destroyed) {
            // C++ center node swaps to destroyed sprite (node1Dest); others vanish
            if (comp.destroyedSprite) {
                comp.destroyedSprite.drawAt(ctx, comp.x, comp.y);
                return;
            }
            return;
        }
        if (comp.sprite) {
            comp.sprite.drawAt(ctx, comp.x, comp.y);
        } else {
            ctx.fillStyle = color;
            ctx.fillRect(comp.x, comp.y, comp.width, comp.height);
        }
    }

    // --- Component explosion helpers ---

    /**
     * C++ MakeExplosions(): 1 big center + 5 trails × 4 small = 21 explosions.
     * Trail velocity determines SPAWN POSITIONS (parabolic arc).
     * After spawning, particles inherit source velocity (boss dx/dy ≈ 0).
     */
    private spawnExplosion(x: number, y: number, _type: 'small' | 'big'): void {
        // C++: Sound::playExplosionSound() on every component destruction
        this.pendingSoundEmits.push('ExploMini1');

        // Big center explosion (C++: at SourceX-48, SourceY-48, velocity=dx/4)
        this.componentExplosions.push(
            new Explosion(x, y, 'big', this.bigExpFrames));

        // 5 trails with parabolic arc spawn positions (C++ TRAIL_COUNT=5, TRAIL_LENGTH=4)
        const TRAIL_COUNT = 5;
        const TRAIL_LENGTH = 4;
        const EXPLOSION_SIZE = 32;
        const GRAVITY = EXPLOSION_SIZE / 16; // 2.0

        for (let trail = 0; trail < TRAIL_COUNT; trail++) {
            const dir = Math.random() * Math.PI * 2;
            const speed = (Math.random() + 0.5) * (EXPLOSION_SIZE / 4); // 4-12
            let tvx = speed * Math.cos(dir);
            let tvy = -speed * Math.sin(dir);
            let px = x;
            let py = y;

            for (let t = 0; t < TRAIL_LENGTH; t++) {
                // Trail position is pre-calculated along parabolic arc
                px += tvx;
                py += tvy;
                tvy += GRAVITY;
                const delay = t * 2; // C++: -explosionnum*2 frame stagger
                // C++: explosion velocity = source_dx/2 (boss is hovering, so ~0)
                this.componentExplosions.push(
                    new Explosion(px, py, 'small', this.smallExpFrames, 0, 0, 0, delay));
            }
        }

        // Emit particles for visual richness
        this.pendingParticleEmits.push({ x, y, count: 20 });
    }

    private updateComponentExplosions(dt: number): void {
        for (const exp of this.componentExplosions) exp.update(dt);
        this.componentExplosions = this.componentExplosions.filter(e => !e.isFinished());
    }

    private drawComponentExplosions(ctx: CanvasRenderingContext2D): void {
        for (const exp of this.componentExplosions) exp.draw(ctx);
    }

    private drawFallbackOrb(ctx: CanvasRenderingContext2D, cx: number, cy: number, idx: number): void {
        const pulse = 0.5 + Math.sin(this.stateTimer * 4 + idx * 2) * 0.5;
        const radius = 16 + pulse * 6;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, `rgba(0, 255, 255, ${0.8 * pulse})`);
        gradient.addColorStop(0.5, `rgba(0, 128, 255, ${0.4 * pulse})`);
        gradient.addColorStop(1, 'rgba(0, 0, 128, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * C++ GL_Handler energy effects: glowing orbs, connector beams, shield glow,
     * connector points, glowy bars, and U-arm red lights. All use alpha-blended
     * additive-style rendering with pulsing warningAlpha and bossAlpha values.
     */
    private drawEnergyEffects(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter'; // additive blending like OpenGL

        const bx = this.x;
        const by = this.y;

        // --- Boss shield (C++: Shield.bmp, purple (0.4,0.15,1.0), orbCount/4 alpha, 130×115 at center+80) ---
        if (this.orbCount > 0 && !this.bossShield.destroyed) {
            const shieldAlpha = this.orbCount / 4;
            const scx = bx + 80;
            const scy = by + 80;
            const shw = 130, shh = 115;

            if (this.shieldTexture) {
                // Same approach as player shield: multiply-tint texture to purple
                if (!Boss._shieldCanvas) {
                    Boss._shieldCanvas = document.createElement('canvas');
                    Boss._shieldCanvas.width = shw * 2;
                    Boss._shieldCanvas.height = shh * 2;
                }
                const sc = Boss._shieldCanvas.getContext('2d')!;
                sc.clearRect(0, 0, shw * 2, shh * 2);
                sc.drawImage(this.shieldTexture, 0, 0, shw * 2, shh * 2);
                sc.globalCompositeOperation = 'multiply';
                sc.fillStyle = 'rgb(102,38,255)'; // C++: (0.4, 0.15, 1.0)
                sc.fillRect(0, 0, shw * 2, shh * 2);
                sc.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = shieldAlpha;
                ctx.drawImage(Boss._shieldCanvas, scx - shw, scy - shh);
                ctx.globalAlpha = 1.0;
            } else {
                this.drawGlow(ctx, scx, scy, shw, shh, 0.4, 0.15, 1.0, shieldAlpha);
            }
        }

        // --- Central red glowing orb (C++: 90×90 at center+80, bossAlpha) ---
        this.drawGlow(ctx, bx + 80, by + 80, 90, 90, 1.0, 0.0, 0.0, this.bossAlpha);

        // --- 4 outer node glowing orbs (C++: red 90×90, bossAlpha, only when orb visible) ---
        for (let i = 0; i < 4; i++) {
            if (this.outerOrbs[i].destroyed) continue;
            const nx = bx + NODE_OFFSETS[i].x + 64;
            const ny = by + NODE_OFFSETS[i].y + 64;
            this.drawGlow(ctx, nx, ny, 90, 90, 1.0, 0.0, 0.0, this.bossAlpha);
        }

        // --- Center connector points (C++: white 30×30, warningAlpha) ---
        // These anchor at the center node edges pointing toward each connector
        const cnLeft  = this.connectors[0]; // UL connector
        const cnHoriz = this.connectors[1]; // H connector
        const cnRight = this.connectors[2]; // UR connector

        // Center platform edge points — aligned with connector directions
        const cp1x = bx + 12, cp1y = by + 148;   // left edge of center node → UL connector
        const cp2x = bx + 148, cp2y = by + 148;  // right edge of center node → UR connector

        if (!this.outerOrbs[0].destroyed || !this.outerOrbs[1].destroyed) {
            this.drawGlow(ctx, cp1x, cp1y, 30, 30, 1.0, 1.0, 1.0, this.warningAlpha);
        }
        if (!this.outerOrbs[2].destroyed || !this.outerOrbs[3].destroyed) {
            this.drawGlow(ctx, cp2x, cp2y, 30, 30, 1.0, 1.0, 1.0, this.warningAlpha);
        }

        // --- Energy beams: center → through connectors → to outer orbs ---
        // These represent shield power flowing from center to outer orbs via the structural connectors.
        const beamAlpha = this.warningAlpha * 0.5;

        // Center → UL connector center → outer orb 0
        if (!this.outerOrbs[0].destroyed) {
            const orbX = this.outerOrbs[0].x + 32;
            const orbY = this.outerOrbs[0].y + 32;
            const connCX = cnLeft.destroyed ? orbX : cnLeft.x + cnLeft.width / 2;
            const connCY = cnLeft.destroyed ? orbY : cnLeft.y + cnLeft.height / 2;
            this.drawBeam(ctx, cp1x, cp1y, connCX, connCY, 40, 0.4, 0.15, 1.0, beamAlpha);
            if (!cnLeft.destroyed) {
                this.drawBeam(ctx, connCX, connCY, orbX, orbY, 35, 0.4, 0.15, 1.0, beamAlpha * 0.8);
            }
        }
        // Center → UL connector center → outer orb 1
        if (!this.outerOrbs[1].destroyed) {
            const orbX = this.outerOrbs[1].x + 32;
            const orbY = this.outerOrbs[1].y + 32;
            const connCX = cnLeft.destroyed ? orbX : cnLeft.x + cnLeft.width / 2;
            const connCY = cnLeft.destroyed ? orbY : cnLeft.y + cnLeft.height / 2;
            this.drawBeam(ctx, cp1x, cp1y, connCX, connCY, 40, 0.4, 0.15, 1.0, beamAlpha);
            if (!cnLeft.destroyed) {
                this.drawBeam(ctx, connCX, connCY, orbX, orbY, 35, 0.4, 0.15, 1.0, beamAlpha * 0.8);
            }
        }
        // Center → UR connector center → outer orb 2
        if (!this.outerOrbs[2].destroyed) {
            const orbX = this.outerOrbs[2].x + 32;
            const orbY = this.outerOrbs[2].y + 32;
            const connCX = cnRight.destroyed ? orbX : cnRight.x + cnRight.width / 2;
            const connCY = cnRight.destroyed ? orbY : cnRight.y + cnRight.height / 2;
            this.drawBeam(ctx, cp2x, cp2y, connCX, connCY, 40, 0.4, 0.15, 1.0, beamAlpha);
            if (!cnRight.destroyed) {
                this.drawBeam(ctx, connCX, connCY, orbX, orbY, 35, 0.4, 0.15, 1.0, beamAlpha * 0.8);
            }
        }
        // Center → UR connector center → outer orb 3
        if (!this.outerOrbs[3].destroyed) {
            const orbX = this.outerOrbs[3].x + 32;
            const orbY = this.outerOrbs[3].y + 32;
            const connCX = cnRight.destroyed ? orbX : cnRight.x + cnRight.width / 2;
            const connCY = cnRight.destroyed ? orbY : cnRight.y + cnRight.height / 2;
            this.drawBeam(ctx, cp2x, cp2y, connCX, connCY, 40, 0.4, 0.15, 1.0, beamAlpha);
            if (!cnRight.destroyed) {
                this.drawBeam(ctx, connCX, connCY, orbX, orbY, 35, 0.4, 0.15, 1.0, beamAlpha * 0.8);
            }
        }

        // --- Connector center glow points (white, where energy passes through) ---
        if (!cnLeft.destroyed && (!this.outerOrbs[0].destroyed || !this.outerOrbs[1].destroyed)) {
            this.drawGlow(ctx, cnLeft.x + cnLeft.width / 2, cnLeft.y + cnLeft.height / 2, 25, 25, 1.0, 1.0, 1.0, this.warningAlpha);
        }
        if (!cnRight.destroyed && (!this.outerOrbs[2].destroyed || !this.outerOrbs[3].destroyed)) {
            this.drawGlow(ctx, cnRight.x + cnRight.width / 2, cnRight.y + cnRight.height / 2, 25, 25, 1.0, 1.0, 1.0, this.warningAlpha);
        }
        // H connector glow (bottom, between orbs 1-2)
        if (!cnHoriz.destroyed && !this.outerOrbs[1].destroyed && !this.outerOrbs[2].destroyed) {
            this.drawGlow(ctx, cnHoriz.x + cnHoriz.width / 2, cnHoriz.y + cnHoriz.height / 2, 20, 20, 1.0, 1.0, 1.0, this.warningAlpha);
        }

        // --- Outer orb connector points (white glow at each living orb) ---
        for (let i = 0; i < 4; i++) {
            if (!this.outerOrbs[i].destroyed) {
                this.drawGlow(ctx, this.outerOrbs[i].x + 32, this.outerOrbs[i].y + 32, 25, 25, 1.0, 1.0, 1.0, this.warningAlpha);
            }
        }

        // --- 3 glowy bars between node pairs (blue energy flowing along structural connectors) ---
        // Left bar: Node0→Node1 (along UL connector)
        if (!this.outerOrbs[0].destroyed && !this.outerOrbs[1].destroyed) {
            const orbA = this.outerOrbs[0], orbB = this.outerOrbs[1];
            this.drawBeam(ctx, orbA.x + 32, orbA.y + 32, orbB.x + 32, orbB.y + 32, 50, 0.0, 0.0, 1.0, this.bossAlpha);
        }
        // Right bar: Node3→Node2 (along UR connector)
        if (!this.outerOrbs[2].destroyed && !this.outerOrbs[3].destroyed) {
            const orbA = this.outerOrbs[3], orbB = this.outerOrbs[2];
            this.drawBeam(ctx, orbA.x + 32, orbA.y + 32, orbB.x + 32, orbB.y + 32, 50, 0.0, 0.0, 1.0, this.bossAlpha);
        }
        // Center bar: Node1→Node2 (along H connector)
        if (!this.outerOrbs[1].destroyed && !this.outerOrbs[2].destroyed) {
            const orbA = this.outerOrbs[1], orbB = this.outerOrbs[2];
            this.drawBeam(ctx, orbA.x + 32, orbA.y + 32, orbB.x + 32, orbB.y + 32, 25, 0.0, 0.0, 1.0, this.bossAlpha);
        }

        // --- U-arm red lights (C++: red 20×20, bossAlpha, only when all orbs destroyed) ---
        // C++ draws one light per arm: LeftU at x+96, RightU at x+43 (asymmetric — mirror images)
        if (this.orbCount <= 0) {
            this.drawGlow(ctx, this.uComponents[0].x + 96, this.uComponents[0].y + 281, 20, 20, 1.0, 0.0, 0.0, this.bossAlpha);
            this.drawGlow(ctx, this.uComponents[1].x + 43, this.uComponents[1].y + 281, 20, 20, 1.0, 0.0, 0.0, this.bossAlpha);
        }

        ctx.restore();
    }

    /** Draw a radial glow at a point (replicates OpenGL textured quad with radial falloff) */
    private drawGlow(
        ctx: CanvasRenderingContext2D,
        cx: number, cy: number, rx: number, ry: number,
        r: number, g: number, b: number, a: number,
    ): void {
        if (a <= 0) return;
        ctx.save();
        // Scale to ellipse if rx != ry
        ctx.translate(cx, cy);
        ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
        const radius = Math.max(rx, ry);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        const color = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)}`;
        gradient.addColorStop(0, `${color},${a})`);
        gradient.addColorStop(0.4, `${color},${a * 0.6})`);
        gradient.addColorStop(1, `${color},0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /**
     * Draw an energy beam matching C++ createTriangleStrip with bar.bmp texture.
     * Uses a layered approach: wide soft outer glow + brighter narrow core + endpoint glows.
     */
    private drawBeam(
        ctx: CanvasRenderingContext2D,
        x1: number, y1: number, x2: number, y2: number,
        ox: number, r: number, g: number, b: number, a: number,
        oy?: number,
    ): void {
        if (a <= 0) return;
        const offy = oy ?? ox;

        const color = `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)}`;

        ctx.save();
        ctx.globalAlpha = a;

        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 1) {
            const px = -dy / len, py = dx / len;

            // Wide soft outer glow (full offset width)
            const hw = ox * 0.7;
            ctx.beginPath();
            ctx.moveTo(x1 + px * hw, y1 + py * hw);
            ctx.lineTo(x2 + px * hw, y2 + py * hw);
            ctx.lineTo(x2 - px * hw, y2 - py * hw);
            ctx.lineTo(x1 - px * hw, y1 - py * hw);
            ctx.closePath();
            ctx.fillStyle = `${color},0.15)`;
            ctx.fill();

            // Brighter narrow core
            const cw = ox * 0.25;
            ctx.beginPath();
            ctx.moveTo(x1 + px * cw, y1 + py * cw);
            ctx.lineTo(x2 + px * cw, y2 + py * cw);
            ctx.lineTo(x2 - px * cw, y2 - py * cw);
            ctx.lineTo(x1 - px * cw, y1 - py * cw);
            ctx.closePath();
            ctx.fillStyle = `${color},0.5)`;
            ctx.fill();
        }

        // Endpoint glows
        const glowR = Math.max(ox, offy) * 0.7;
        for (const [gx, gy] of [[x1, y1], [x2, y2]]) {
            const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, glowR);
            glow.addColorStop(0, `${color},0.5)`);
            glow.addColorStop(0.5, `${color},0.15)`);
            glow.addColorStop(1, `${color},0)`);
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(gx, gy, glowR, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
    }

    private drawTurretSet(ctx: CanvasRenderingContext2D, turrets: BossTurretAI[]): void {
        for (let idx = 0; idx < turrets.length; idx++) {
            const ai = turrets[idx];

            // If platform destroyed, turret is fully hidden (C++: set_visible(false) on cascade)
            if (turrets === this.outerTurretAIs && this.platforms[idx]?.destroyed) continue;

            const tx = this.x + ai.offsetX;
            const ty = this.y + ai.offsetY;

            if (ai.destroyed) {
                // Turret destroyed but platform still alive → show destroyed sprite (frame 32)
                if (this.turretSprites.length >= 33) {
                    ctx.drawImage(this.turretSprites[32], tx, ty);
                }
                continue;
            }

            if (this.turretSprites.length >= 32) {
                const frameIdx = Math.max(0, Math.min(31, ai.frame));
                ctx.drawImage(this.turretSprites[frameIdx], tx, ty);
            } else {
                // Fallback circle + barrel
                const cx = tx + 32, cy = ty + 32;
                ctx.fillStyle = '#a44';
                ctx.beginPath();
                ctx.arc(cx, cy, 10, 0, Math.PI * 2);
                ctx.fill();
                const rad = ((ai.frame - 8) / 32) * 2 * Math.PI;
                ctx.strokeStyle = '#f66';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(rad) * 16, cy + Math.sin(rad) * -16);
                ctx.stroke();
            }
        }
    }
}