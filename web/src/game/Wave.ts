/**
 * Wave spawning manager — tracks timed wave definitions for the current level.
 * Spawns enemies at the right times and detects level completion.
 *
 * C++ spawn formula (GameManager.cpp create_wave):
 *   X = startX + i          (ships barely offset horizontally)
 *   Y = -(i * 64)           (staggered 64px apart vertically, starting above screen)
 *   Plus 30% chance of random gunship per wave (at startX, -128)
 */

import { LEVELS, DIFFICULTY_WAVE_MODIFIERS } from '../data/levels';
import type { WaveDefinition } from '../data/levels';
import { Enemy } from './Enemy';
import { CapitalShip } from './CapitalShip';

export interface WaveSpawnResult {
    enemies: Enemy[];
    capitalShips: CapitalShip[];
}

export class WaveManager {
    private levelIndex = 0;
    private spawnedWaves: Set<number> = new Set();
    private allWavesSpawned = false;
    private _result: WaveSpawnResult = { enemies: [], capitalShips: [] };
    levelTimer = 0;

    /** Reset for a new level */
    startLevel(levelIndex: number): void {
        this.levelIndex = levelIndex;
        this.levelTimer = 0;
        this.spawnedWaves.clear();
        this.allWavesSpawned = false;
    }

    /** Mark all waves as already spawned (used by debug boss spawn) */
    suppressAllWaves(): void {
        const level = LEVELS[this.levelIndex];
        if (level) {
            for (let i = 0; i < level.waves.length; i++) {
                this.spawnedWaves.add(i);
            }
        }
        this.allWavesSpawned = true;
    }

    /** Update timer, return any enemies/capital ships that should spawn this frame */
    update(dt: number, difficulty: number): WaveSpawnResult {
        this.levelTimer += dt;
        const level = LEVELS[this.levelIndex];
        if (!level) { this._result.enemies.length = 0; this._result.capitalShips.length = 0; return this._result; }

        const result = this._result;
        result.enemies.length = 0;
        result.capitalShips.length = 0;
        const modifier = DIFFICULTY_WAVE_MODIFIERS[difficulty] ?? 0;

        for (let i = 0; i < level.waves.length; i++) {
            if (this.spawnedWaves.has(i)) continue;

            const wave = level.waves[i];
            if (this.levelTimer >= wave.time) {
                this.spawnedWaves.add(i);
                const spawned = this.spawnWave(wave, modifier);
                result.enemies.push(...spawned.enemies);
                result.capitalShips.push(...spawned.capitalShips);
            }
        }

        if (this.spawnedWaves.size >= level.waves.length) {
            this.allWavesSpawned = true;
        }

        return result;
    }

    private spawnWave(wave: WaveDefinition, difficultyMod: number): WaveSpawnResult {
        const result: WaveSpawnResult = { enemies: [], capitalShips: [] };

        // Frigate: spawn as CapitalShip at fixed position (C++ always uses 300, -300)
        if (wave.type === 'frigate') {
            result.capitalShips.push(new CapitalShip(300, -300));
            // Still 30% chance of random gunship
            if (Math.random() > 0.7) {
                result.enemies.push(Enemy.createGunship(wave.startX, -128));
            }
            return result;
        }

        // Regular fighters: spawn with C++ formula
        const count = Math.max(1, wave.count + difficultyMod);
        for (let i = 0; i < count; i++) {
            const x = wave.startX + i;        // C++: _x + i
            const y = -(i * 64);              // C++: -(i*64)
            result.enemies.push(Enemy.createByType(wave.type, x, y, i));
        }

        // 30% chance of random gunship per wave (C++ line 579)
        if (Math.random() > 0.7) {
            result.enemies.push(Enemy.createGunship(wave.startX, -128));
        }

        return result;
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
