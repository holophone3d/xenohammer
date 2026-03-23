/**
 * Ship and weapon configurations derived from game-constants.json.
 */

export interface ShipConfig {
    armor: number;
    shields: number;
    speed: number;
    frameCount: number;
    spritePrefix: string;
    weaponOffsets: { x: number; y: number }[];
    fireRate: number;
    powerUpDropChance: number;
    explosionType: 'small' | 'large';
}

export const PLAYER_SHIP: ShipConfig = {
    armor: 300,
    shields: 300,
    speed: 7,
    frameCount: 17,
    spritePrefix: 'player',
    weaponOffsets: [
        { x: 22, y: -12 },   // nose blaster
        { x: -1, y: -5 },    // left turret
        { x: 44, y: -5 },    // right turret
        { x: 13, y: 0 },     // left missile
        { x: 30, y: 0 },     // right missile
    ],
    fireRate: 100,
    powerUpDropChance: 0,
    explosionType: 'large',
};

export const PLAYER_START = { x: 287, y: 300 };
export const PLAYER_SPEED_INCREMENT = 2;
export const PLAYER_MAX_ENGINE_POWER = 5;

export const LIGHT_FIGHTER: ShipConfig = {
    armor: 10,
    shields: 0,
    speed: 10,
    frameCount: 32,
    spritePrefix: 'lightfighter',
    weaponOffsets: [{ x: 16, y: 16 }],
    fireRate: 400,
    powerUpDropChance: 0.05,
    explosionType: 'small',
};

export const FIGHTER_B: ShipConfig = {
    armor: 30,
    shields: 0,
    speed: 12,
    frameCount: 32,
    spritePrefix: 'fighterb',
    weaponOffsets: [{ x: 16, y: 16 }],
    fireRate: 1000,
    powerUpDropChance: 0.10,
    explosionType: 'small',
};

export const GUNSHIP: ShipConfig = {
    armor: 100,
    shields: 0,
    speed: 9,
    frameCount: 17,
    spritePrefix: 'gunship',
    weaponOffsets: [
        { x: 11, y: 51 },
        { x: 85, y: 51 },
    ],
    fireRate: 600,
    powerUpDropChance: 0.25,
    explosionType: 'large',
};

export const FRIGATE_CONFIG = {
    armor: 900,
    shields: 500,
    components: [
        { name: 'Nose', offset: { x: 0, y: 112 }, armor: 900, damageable: true, weaponOffset: { x: 32, y: 212 } },
        { name: 'RightWing', offset: { x: -62, y: 5 }, armor: 300, damageable: false },
        { name: 'LeftWing', offset: { x: 62, y: 5 }, armor: 300, damageable: false },
        { name: 'RightTurret', offset: { x: -47, y: 37 }, armor: 600, damageable: true, weaponOffset: { x: -31, y: 53 }, aiFireRate: 3000 },
        { name: 'LeftTurret', offset: { x: 79, y: 37 }, armor: 600, damageable: true, weaponOffset: { x: 95, y: 53 }, aiFireRate: 3000 },
    ],
};

// --- Weapon configs ---

export interface WeaponConfig {
    damage: number;
    fireRate: number;
    projectileSpeed: number;
    spritePrefix: string;
    frameCount: number;
    homing?: boolean;
    homingTrackDist?: number;
    homingMinDist?: number;
    homingSpeed?: number;
}

export const WEAPONS = {
    blaster: {
        damage: 6,
        fireRate: 100,
        projectileSpeed: 27,
        spritePrefix: 'blaster',
        frameCount: 5,
    } as WeaponConfig,

    turret: {
        damage: 4,
        fireRate: 250,
        projectileSpeed: 29,
        spritePrefix: 'turret',
        frameCount: 5,
    } as WeaponConfig,

    missile: {
        damage: 10,
        fireRate: 1000,
        projectileSpeed: 17,
        spritePrefix: 'missile',
        frameCount: 5,
        homing: true,
        homingTrackDist: 64,
        homingMinDist: 16,
        homingSpeed: 20,
    } as WeaponConfig,

    enemyBlast: {
        damage: 15,
        fireRate: 100,
        projectileSpeed: 20,
        spritePrefix: 'enemyblast',
        frameCount: 8,
    } as WeaponConfig,

    enemyCannon: {
        damage: 20,
        fireRate: 250,
        projectileSpeed: 21,
        spritePrefix: 'enemycannon',
        frameCount: 8,
    } as WeaponConfig,
};

/** Turret speeds by angle (0-360 in 45° steps) */
export const TURRET_SPEEDS: Record<number, number> = {
    0: 29, 45: 20, 90: 29, 135: 20,
    180: 29, 225: 20, 270: 29, 315: 20,
};

/** Power cell multipliers for weapon damage/rate */
export const POWER_MULTIPLIERS: Record<number, number> = {
    0: 1.0, 1: 1.5, 2: 2.0, 3: 2.5, 4: 3.0, 5: 5.0,
};

/** Player weapon slot definitions matching the C++ source */
export const PLAYER_WEAPON_SLOTS = [
    { name: 'Nose Blaster', type: 'blaster' as const, offsetX: 22, offsetY: -12, defaultAngle: 0 },
    { name: 'Left Turret', type: 'turret' as const, offsetX: -1, offsetY: -5, defaultAngle: 135 },
    { name: 'Right Turret', type: 'turret' as const, offsetX: 44, offsetY: -5, defaultAngle: 45 },
    { name: 'Left Missile', type: 'missile' as const, offsetX: 13, offsetY: 0, defaultAngle: 0 },
    { name: 'Right Missile', type: 'missile' as const, offsetX: 30, offsetY: 0, defaultAngle: 0 },
];

// --- Scoring ---

export const ENEMY_SCORES: Record<string, number> = {
    lightfighter: 100,
    fighterb: 250,
    gunship: 500,
    frigate: 2000,
    boss: 10000,
};

// --- Rankings ---

export const RANKINGS = [
    { rank: 'TEST PILOT', minKills: 0 },
    { rank: 'AIRMAN', minKills: 20 },
    { rank: 'SERGEANT', minKills: 42 },
    { rank: 'LIEUTENANT', minKills: 66 },
    { rank: 'CAPTAIN', minKills: 98 },
    { rank: 'MAJOR', minKills: 135 },
    { rank: 'COLONEL', minKills: 182 },
    { rank: 'GENERAL', minKills: 245 },
    { rank: 'HERO', minKills: 295 },
    { rank: 'SAVIOR', minKills: 350 },
    { rank: 'GOD', minKills: 420 },
    { rank: 'PONDEROSA', minKills: 666 },
];
