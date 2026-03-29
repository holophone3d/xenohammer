/**
 * Level and wave definitions ported from C++ GameManager.cpp create_wave / init_level.
 *
 * C++ wave type mapping (create_wave):
 *   wave_type 0 → LIGHTFIGHTER (10 armor)
 *   wave_type 1 → HEAVYFIGHTER (30 armor) — NOT gunship!
 *   wave_type 3 → Frigate (capital ship, fixed at 300,-300)
 *   wave_type 4 → Boss (capital ship, fixed at 245,-600)
 *
 * Gunships are ONLY spawned randomly (30% chance per wave, create_wave line 579).
 */

export type EnemyType = 'lightfighter' | 'fighterb' | 'gunship' | 'frigate';

export interface WaveDefinition {
    time: number;       // seconds into level when wave spawns
    type: EnemyType;
    count: number;
    startX: number;
    startY: number;
}

export interface LevelDefinition {
    duration: number;   // seconds
    waves: WaveDefinition[];
    hasBoss: boolean;
}

// C++ wave_type → EnemyType (matches create_wave logic, NOT enemy type constants)
function waveTypeToEnemy(waveType: number): EnemyType {
    switch (waveType) {
        case 0: return 'lightfighter';  // wave_type 0 → LIGHTFIGHTER
        case 1: return 'fighterb';      // wave_type 1 → HEAVYFIGHTER
        case 3: return 'frigate';       // wave_type 3 → Frigate capital ship
        default: return 'lightfighter';
    }
}

// Level 1: 95s, ALL light fighters (C++ GameManager.cpp:625-674, level==0)
// 49 waves, all type 0. Gunships appear randomly (30% per wave).
function buildLevel1(): LevelDefinition {
    const waves: WaveDefinition[] = [];
    // Exact C++ wave data: [time_s, wave_type, count_base, startX]
    const waveData: [number, number, number, number][] = [
        [5,  0, 3, 0],
        [6,  0, 3, 200],
        [9,  0, 3, 225],
        [9,  0, 3, 25],
        [14, 0, 5, 500],
        [14, 0, 5, 75],
        [16, 0, 4, 75],
        [20, 0, 4, 0],
        [21, 0, 6, 405],
        [22, 0, 3, 50],
        [23, 0, 3, 300],
        [24, 0, 4, 480],
        [25, 0, 5, 25],
        [25, 0, 5, 425],
        [28, 0, 3, 250],
        [28, 0, 4, 50],
        [30, 0, 3, 0],
        [32, 0, 4, 450],
        [32, 0, 3, 40],
        [36, 0, 4, 200],
        [38, 0, 3, 0],
        [38, 0, 3, 250],
        [38, 0, 3, 500],
        [42, 0, 4, 250],
        [45, 0, 5, 100],
        [45, 0, 3, 200],
        [45, 0, 5, 300],
        [47, 0, 4, 250],
        [47, 0, 3, 220],
        [50, 0, 2, 220],
        [51, 0, 3, 500],
        [55, 0, 4, 100],
        [58, 0, 4, 150],
        [58, 0, 4, 300],
        [60, 0, 3, 0],
        [60, 0, 3, 600],
        [65, 0, 4, 440],
        [65, 0, 4, 0],
        [70, 0, 4, 300],
        [72, 0, 3, 500],
        [77, 0, 4, 100],
        [77, 0, 4, 300],
        [77, 0, 5, 200],
        [79, 0, 6, 500],
        [79, 0, 4, 300],
        [79, 0, 6, 50],
        [85, 0, 4, 50],
        [85, 0, 4, 250],
        [85, 0, 4, 450],
    ];
    for (const [time, wt, count, x] of waveData) {
        waves.push({ time, type: waveTypeToEnemy(wt), count, startX: x, startY: 0 });
    }
    return { duration: 95, waves, hasBoss: false };
}

// Level 2: 95s, light fighters + heavy fighters + 1 frigate (C++ level==1, lines 681-720)
// Gunships only appear randomly.
function buildLevel2(): LevelDefinition {
    const waves: WaveDefinition[] = [];
    const waveData: [number, number, number, number][] = [
        [5,  0, 5, 0],
        [6,  0, 2, 600],
        [9,  0, 6, 600],
        [13, 0, 3, 0],
        [15, 0, 6, 600],
        [18, 0, 4, 0],
        [18, 0, 4, 600],
        [21, 0, 6, 600],
        [25, 0, 3, 0],
        // FRIGATE at time 28
        [28, 3, 1, 300],
        [30, 1, 4, 0],
        [30, 1, 4, 600],
        // Regular units again
        [42, 0, 3, 0],
        [42, 0, 3, 600],
        [50, 0, 3, 0],
        [50, 0, 3, 600],
        [56, 1, 4, 0],
        [56, 1, 4, 600],
        [59, 1, 4, 0],
        [59, 1, 4, 600],
        [66, 0, 3, 0],
        [66, 1, 5, 300],
        [66, 0, 3, 600],
        [72, 1, 4, 0],
        [72, 0, 3, 300],
        [72, 1, 4, 600],
        [76, 0, 8, 300],
        [76, 1, 10, 0],
        [76, 1, 10, 600],
        [79, 1, 2, 0],
        [79, 0, 2, 100],
        [79, 1, 2, 200],
        [79, 1, 2, 300],
        [79, 0, 2, 400],
        [79, 1, 2, 500],
        [85, 1, 4, 50],
        [85, 1, 4, 250],
        [85, 1, 4, 450],
    ];
    for (const [time, wt, count, x] of waveData) {
        waves.push({ time, type: waveTypeToEnemy(wt), count, startX: x, startY: 0 });
    }
    return { duration: 95, waves, hasBoss: false };
}

// Level 3: 600s (10 min), boss fight + support waves (C++ level==2, lines 723-783)
// Boss spawned at level start (245, -600), enters at 92s (C++ was 110s, tightened for 60fps feel).
function buildLevel3(): LevelDefinition {
    const waves: WaveDefinition[] = [];
    const waveData: [number, number, number, number][] = [
        [5,  1, 4, 0],
        [5,  0, 4, 100],
        [5,  1, 8, 200],
        [5,  1, 8, 300],
        [5,  0, 4, 400],
        [5,  1, 4, 500],
        [8,  1, 5, 300],
        [10, 1, 4, 100],
        [12, 1, 5, 250],
        [15, 1, 9, 0],
        [15, 0, 2, 100],
        [15, 1, 9, 200],
        [15, 1, 2, 300],
        [15, 0, 9, 400],
        [15, 1, 2, 500],
        [20, 1, 4, 500],
        [22, 0, 6, 500],
        [24, 1, 7, 500],
        [28, 0, 8, 500],
        [30, 1, 9, 0],
        [30, 0, 8, 100],
        [30, 1, 7, 200],
        [30, 1, 7, 300],
        [30, 0, 8, 400],
        [30, 1, 9, 500],
        [34, 1, 3, 500],
        [34, 1, 3, 500],
        [38, 1, 6, 500],
        [42, 1, 9, 500],
        [45, 1, 4, 0],
        [45, 0, 4, 100],
        [50, 1, 6, 200],
        [50, 1, 6, 300],
        [60, 0, 5, 400],
        [60, 1, 5, 500],
        [66, 0, 3, 0],
        [66, 1, 5, 300],
        [66, 0, 3, 600],
        [72, 1, 4, 0],
        [72, 0, 3, 300],
        [72, 1, 4, 600],
        [76, 0, 8, 300],
        [76, 1, 10, 0],
        [76, 1, 10, 600],
        [79, 1, 2, 0],
        [79, 0, 2, 100],
        [79, 1, 2, 200],
        [79, 1, 2, 300],
        [79, 0, 2, 400],
        [79, 1, 2, 500],
        [85, 1, 4, 50],
        [85, 1, 4, 250],
        [85, 1, 4, 450],
    ];
    for (const [time, wt, count, x] of waveData) {
        waves.push({ time, type: waveTypeToEnemy(wt), count, startX: x, startY: 0 });
    }
    return { duration: 600, waves, hasBoss: true };
}

export const LEVELS: LevelDefinition[] = [
    buildLevel1(),
    buildLevel2(),
    buildLevel3(),
];

/** Difficulty wave count modifiers (C++ num_ships: -2, 0, 2, 5) */
export const DIFFICULTY_WAVE_MODIFIERS: Record<number, number> = {
    0: -2, // Easy
    1: 0,  // Normal
    2: 2,  // Hard
    3: 5,  // Nightmare
};
