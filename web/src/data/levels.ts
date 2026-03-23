/**
 * Level and wave definitions extracted from game-constants.json.
 * Enemy types: 0 = lightfighter, 1 = gunship, 2 = fighterb, 3 = frigate.
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

function typeIdToEnemy(id: number): EnemyType {
    switch (id) {
        case 0: return 'lightfighter';
        case 1: return 'gunship';
        case 2: return 'fighterb';
        case 3: return 'frigate';
        default: return 'lightfighter';
    }
}

// Level 1: 95s, light fighters + gunships, 45 waves
function buildLevel1(): LevelDefinition {
    const waves: WaveDefinition[] = [];
    const waveData: [number, number, number, number, number][] = [
        //  time, type, count, x, y
        [5, 0, 3, 0, 0],
        [6, 0, 3, 200, 0],
        [8, 0, 3, 400, 0],
        [10, 0, 2, 100, 0],
        [12, 0, 3, 300, 0],
        [14, 0, 2, 500, 0],
        [16, 1, 1, 250, 0],
        [18, 0, 3, 0, 0],
        [20, 0, 3, 400, 0],
        [22, 0, 4, 200, 0],
        [24, 1, 1, 100, 0],
        [26, 0, 3, 350, 0],
        [28, 0, 3, 50, 0],
        [30, 0, 4, 250, 0],
        [32, 1, 1, 450, 0],
        [34, 0, 3, 150, 0],
        [36, 0, 3, 500, 0],
        [38, 0, 4, 0, 0],
        [40, 0, 3, 300, 0],
        [42, 1, 1, 200, 0],
        [44, 0, 4, 100, 0],
        [46, 0, 3, 400, 0],
        [48, 0, 3, 50, 0],
        [50, 1, 1, 350, 0],
        [52, 0, 4, 200, 0],
        [54, 0, 3, 500, 0],
        [56, 0, 3, 0, 0],
        [58, 1, 1, 250, 0],
        [60, 0, 4, 150, 0],
        [62, 0, 3, 400, 0],
        [64, 0, 3, 300, 0],
        [66, 1, 1, 100, 0],
        [68, 0, 4, 50, 0],
        [70, 0, 3, 450, 0],
        [72, 0, 3, 200, 0],
        [74, 1, 1, 350, 0],
        [76, 0, 4, 0, 0],
        [78, 0, 3, 500, 0],
        [80, 0, 3, 100, 0],
        [81, 0, 3, 250, 0],
        [82, 1, 1, 400, 0],
        [83, 0, 4, 150, 0],
        [84, 0, 3, 350, 0],
        [85, 0, 4, 450, 0],
    ];
    for (const [time, type, count, x, y] of waveData) {
        waves.push({ time, type: typeIdToEnemy(type), count, startX: x, startY: y });
    }
    return { duration: 95, waves, hasBoss: false };
}

// Level 2: 95s, frigates + mixed enemies, 32 waves
function buildLevel2(): LevelDefinition {
    const waves: WaveDefinition[] = [];
    const waveData: [number, number, number, number, number][] = [
        [5, 0, 5, 0, 0],
        [7, 0, 4, 300, 0],
        [9, 2, 3, 100, 0],
        [11, 0, 4, 400, 0],
        [13, 2, 3, 200, 0],
        [15, 1, 1, 350, 0],
        [17, 0, 5, 50, 0],
        [19, 2, 4, 450, 0],
        [21, 0, 4, 150, 0],
        [23, 1, 1, 250, 0],
        [25, 2, 3, 500, 0],
        [27, 0, 5, 0, 0],
        [28, 3, 1, 300, -300],
        [30, 2, 4, 0, 0],
        [33, 0, 5, 200, 0],
        [36, 2, 4, 400, 0],
        [39, 1, 1, 100, 0],
        [42, 0, 5, 350, 0],
        [45, 2, 3, 50, 0],
        [48, 3, 1, 250, -300],
        [51, 0, 5, 450, 0],
        [54, 2, 4, 150, 0],
        [57, 1, 1, 300, 0],
        [60, 0, 5, 0, 0],
        [63, 2, 3, 500, 0],
        [66, 1, 1, 200, 0],
        [70, 0, 5, 100, 0],
        [74, 2, 4, 350, 0],
        [78, 3, 1, 150, -300],
        [82, 0, 5, 400, 0],
        [86, 2, 3, 250, 0],
        [90, 1, 1, 50, 0],
    ];
    for (const [time, type, count, x, y] of waveData) {
        waves.push({ time, type: typeIdToEnemy(type), count, startX: x, startY: y });
    }
    return { duration: 95, waves, hasBoss: false };
}

// Level 3: 600s (10 min), boss fight with fighter support waves
function buildLevel3(): LevelDefinition {
    const waves: WaveDefinition[] = [];
    const waveData: [number, number, number, number, number][] = [
        [5, 2, 6, 0, 0],
        [15, 2, 4, 400, 0],
        [25, 0, 5, 200, 0],
        [35, 2, 6, 100, 0],
        [50, 0, 5, 350, 0],
        [65, 2, 4, 0, 0],
        [80, 0, 5, 500, 0],
        [100, 2, 6, 150, 0],
        [120, 0, 5, 300, 0],
        [140, 2, 4, 450, 0],
        [160, 0, 5, 50, 0],
        [180, 2, 6, 250, 0],
        [200, 0, 5, 400, 0],
        [220, 2, 4, 100, 0],
        [240, 0, 5, 350, 0],
        [270, 2, 6, 0, 0],
        [300, 0, 5, 200, 0],
        [330, 2, 4, 500, 0],
        [360, 0, 5, 150, 0],
        [390, 2, 6, 300, 0],
        [420, 0, 5, 450, 0],
        [450, 2, 4, 50, 0],
        [480, 0, 5, 250, 0],
        [510, 2, 6, 400, 0],
        [540, 0, 5, 100, 0],
        [560, 2, 4, 350, 0],
        [580, 0, 5, 0, 0],
    ];
    for (const [time, type, count, x, y] of waveData) {
        waves.push({ time, type: typeIdToEnemy(type), count, startX: x, startY: y });
    }
    return { duration: 600, waves, hasBoss: true };
}

export const LEVELS: LevelDefinition[] = [
    buildLevel1(),
    buildLevel2(),
    buildLevel3(),
];

/** Difficulty wave count modifiers */
export const DIFFICULTY_WAVE_MODIFIERS: Record<number, number> = {
    0: -2, // Easy
    1: 0,  // Normal
    2: 2,  // Hard
    3: 5,  // Nightmare
};
