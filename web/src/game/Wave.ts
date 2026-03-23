/**
 * Wave spawning manager — tracks timed wave definitions for the current level.
 * Spawns enemies at the right times and detects level completion.
 */

import { LEVELS, DIFFICULTY_WAVE_MODIFIERS } from '../data/levels';
import type { WaveDefinition } from '../data/levels';
import { Enemy } from './Enemy';

export class WaveManager {
    private levelIndex = 0;
    private spawnedWaves: Set<number> = new Set();
    private allWavesSpawned = false;
    levelTimer = 0;

    /** Reset for a new level */
    startLevel(levelIndex: number): void {
        this.levelIndex = levelIndex;
        this.levelTimer = 0;
        this.spawnedWaves.clear();
        this.allWavesSpawned = false;
    }

    /** Update timer, return any enemies that should spawn this frame */
    update(dt: number, difficulty: number): Enemy[] {
        this.levelTimer += dt;
        const level = LEVELS[this.levelIndex];
        if (!level) return [];

        const spawned: Enemy[] = [];
        const modifier = DIFFICULTY_WAVE_MODIFIERS[difficulty] ?? 0;

        for (let i = 0; i < level.waves.length; i++) {
            if (this.spawnedWaves.has(i)) continue;

            const wave = level.waves[i];
            if (this.levelTimer >= wave.time) {
                this.spawnedWaves.add(i);
                const enemies = this.spawnWave(wave, modifier);
                spawned.push(...enemies);
            }
        }

        if (this.spawnedWaves.size >= level.waves.length) {
            this.allWavesSpawned = true;
        }

        return spawned;
    }

    private spawnWave(wave: WaveDefinition, difficultyMod: number): Enemy[] {
        const count = Math.max(1, wave.count + difficultyMod);
        const enemies: Enemy[] = [];
        const waveOffset = 64; // spacing between ships in a wave

        for (let i = 0; i < count; i++) {
            const x = wave.startX + i * waveOffset;
            const y = wave.startY - i * 16; // stagger entry
            enemies.push(Enemy.createByType(wave.type, x, y));
        }

        return enemies;
    }

    /** Level is complete when all waves spawned and all enemies dead */
    isLevelComplete(enemyCount: number): boolean {
        return this.allWavesSpawned && enemyCount === 0;
    }

    getLevelDuration(): number {
        return LEVELS[this.levelIndex]?.duration ?? 95;
    }

    getLevelTimer(): number {
        return this.levelTimer;
    }

    /** Check if time has run out */
    isTimeUp(): boolean {
        return this.levelTimer >= this.getLevelDuration();
    }
}
