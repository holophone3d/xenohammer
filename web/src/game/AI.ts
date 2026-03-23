/**
 * AI behaviors ported from the C++ source.
 * Each AI updates an enemy's velocity and firing state per frame.
 */

import type { Enemy } from './Enemy';
import { PLAY_AREA_W, PLAY_AREA_H } from './Collision';

// --- AI State Enums ---

export enum LFAIState {
    None,
    EnteringScreen,
    Targeting,
    FlyBy,
    Scatter,
    RunAway,
}

export enum FBAIState {
    None,
    EnteringScreen,
    Right,
    Left,
    RunAway,
}

export enum GSAIState {
    None,
    EnteringScreen,
    FlyByRight,
    FlyByLeft,
    RunAwayLeft,
    RunAwayRight,
}

// --- AI Interface ---

export interface AIBehavior {
    update(enemy: Enemy, playerX: number, playerY: number, dt: number): void;
}

// --- Light Fighter AI ---

export class LightFighterAI implements AIBehavior {
    state = LFAIState.EnteringScreen;
    private stateTimer = 0;

    update(enemy: Enemy, playerX: number, playerY: number, dt: number): void {
        this.stateTimer += dt;
        const dx = playerX - enemy.x;
        const dy = playerY - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        switch (this.state) {
            case LFAIState.EnteringScreen:
                // Fly downward onto screen
                enemy.vy = enemy.config.speed;
                enemy.vx = 0;
                if (enemy.y > 50) {
                    this.state = LFAIState.Targeting;
                    this.stateTimer = 0;
                }
                break;

            case LFAIState.Targeting:
                // Approach player
                if (dist > 0) {
                    enemy.vx = (dx / dist) * enemy.config.speed;
                    enemy.vy = (dy / dist) * enemy.config.speed;
                }
                enemy.wantsFire = dist < 300;

                if (dist < 80) {
                    this.state = LFAIState.Scatter;
                    this.stateTimer = 0;
                } else if (this.stateTimer > 4) {
                    this.state = LFAIState.FlyBy;
                    this.stateTimer = 0;
                }
                break;

            case LFAIState.FlyBy:
                // Fly past player, then retarget
                enemy.vy = enemy.config.speed * 1.2;
                enemy.vx = dx > 0 ? enemy.config.speed * 0.5 : -enemy.config.speed * 0.5;
                enemy.wantsFire = Math.abs(dx) < 50;

                if (this.stateTimer > 2) {
                    this.state = LFAIState.Targeting;
                    this.stateTimer = 0;
                }
                break;

            case LFAIState.Scatter:
                // Evade when too close
                if (dist > 0) {
                    enemy.vx = -(dx / dist) * enemy.config.speed * 1.5;
                    enemy.vy = -(dy / dist) * enemy.config.speed * 1.5;
                }
                enemy.wantsFire = false;

                if (this.stateTimer > 1.5) {
                    this.state = LFAIState.Targeting;
                    this.stateTimer = 0;
                }
                break;

            case LFAIState.RunAway:
                // Flee off screen
                enemy.vy = -enemy.config.speed * 1.5;
                enemy.vx = 0;
                enemy.wantsFire = false;
                if (enemy.y < -64) {
                    enemy.alive = false;
                }
                break;

            default:
                this.state = LFAIState.EnteringScreen;
        }

        // Run away if badly damaged
        if (enemy.armor < enemy.config.armor * 0.2 && this.state !== LFAIState.RunAway) {
            this.state = LFAIState.RunAway;
        }
    }
}

// --- Fighter B AI (more aggressive, tighter pursuit) ---

export class FighterBAI implements AIBehavior {
    state = FBAIState.EnteringScreen;
    private stateTimer = 0;

    update(enemy: Enemy, playerX: number, playerY: number, dt: number): void {
        this.stateTimer += dt;
        const dx = playerX - enemy.x;

        switch (this.state) {
            case FBAIState.EnteringScreen:
                enemy.vy = enemy.config.speed;
                enemy.vx = 0;
                if (enemy.y > 60) {
                    this.state = dx > 0 ? FBAIState.Right : FBAIState.Left;
                    this.stateTimer = 0;
                }
                break;

            case FBAIState.Right:
                enemy.vx = enemy.config.speed;
                enemy.vy = enemy.config.speed * 0.3;
                enemy.wantsFire = Math.abs(enemy.x - playerX) < 60;
                if (enemy.x > PLAY_AREA_W - 50 || this.stateTimer > 3) {
                    this.state = FBAIState.Left;
                    this.stateTimer = 0;
                }
                break;

            case FBAIState.Left:
                enemy.vx = -enemy.config.speed;
                enemy.vy = enemy.config.speed * 0.3;
                enemy.wantsFire = Math.abs(enemy.x - playerX) < 60;
                if (enemy.x < 50 || this.stateTimer > 3) {
                    this.state = FBAIState.Right;
                    this.stateTimer = 0;
                }
                break;

            case FBAIState.RunAway:
                enemy.vy = -enemy.config.speed * 1.5;
                enemy.vx = 0;
                enemy.wantsFire = false;
                if (enemy.y < -64) {
                    enemy.alive = false;
                }
                break;

            default:
                this.state = FBAIState.EnteringScreen;
        }

        if (enemy.y > PLAY_AREA_H - 30) {
            this.state = FBAIState.RunAway;
        }
    }
}

// --- Gunship AI (slower, sustained fire, multiple passes) ---

export class GunshipAI implements AIBehavior {
    state = GSAIState.EnteringScreen;
    private stateTimer = 0;
    private passes = 0;
    private burstTimer = 0;
    private readonly maxPasses = 3;

    update(enemy: Enemy, playerX: number, _playerY: number, dt: number): void {
        this.stateTimer += dt;
        this.burstTimer += dt * 1000;

        switch (this.state) {
            case GSAIState.EnteringScreen:
                enemy.vy = enemy.config.speed * 0.5;
                enemy.vx = 0;
                if (enemy.y > 80) {
                    this.state = playerX > enemy.x ? GSAIState.FlyByRight : GSAIState.FlyByLeft;
                    this.stateTimer = 0;
                }
                break;

            case GSAIState.FlyByRight:
                enemy.vx = enemy.config.speed * 0.7;
                enemy.vy = enemy.config.speed * 0.2;
                enemy.wantsFire = this.burstTimer > 3000;
                if (this.burstTimer > 3600) this.burstTimer = 0;
                if (enemy.x > PLAY_AREA_W - 60 || this.stateTimer > 5) {
                    this.passes++;
                    this.state = this.passes >= this.maxPasses
                        ? GSAIState.RunAwayRight
                        : GSAIState.FlyByLeft;
                    this.stateTimer = 0;
                }
                break;

            case GSAIState.FlyByLeft:
                enemy.vx = -enemy.config.speed * 0.7;
                enemy.vy = enemy.config.speed * 0.2;
                enemy.wantsFire = this.burstTimer > 3000;
                if (this.burstTimer > 3600) this.burstTimer = 0;
                if (enemy.x < 60 || this.stateTimer > 5) {
                    this.passes++;
                    this.state = this.passes >= this.maxPasses
                        ? GSAIState.RunAwayLeft
                        : GSAIState.FlyByRight;
                    this.stateTimer = 0;
                }
                break;

            case GSAIState.RunAwayLeft:
                enemy.vx = -enemy.config.speed;
                enemy.vy = -enemy.config.speed * 0.5;
                enemy.wantsFire = false;
                if (enemy.x < -64) enemy.alive = false;
                break;

            case GSAIState.RunAwayRight:
                enemy.vx = enemy.config.speed;
                enemy.vy = -enemy.config.speed * 0.5;
                enemy.wantsFire = false;
                if (enemy.x > PLAY_AREA_W + 64) enemy.alive = false;
                break;

            default:
                this.state = GSAIState.EnteringScreen;
        }
    }
}

// --- Turret AI (track player angle, fire when aligned) ---

export class TurretAI implements AIBehavior {
    private fireTimer = 0;
    fireRate: number;

    constructor(fireRate = 3000) {
        this.fireRate = fireRate;
    }

    update(enemy: Enemy, playerX: number, playerY: number, dt: number): void {
        this.fireTimer += dt * 1000;

        const dx = playerX - enemy.x;
        const dy = playerY - enemy.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        // Set turret angle
        enemy.turretAngle = angle;

        // Fire when timer exceeds rate
        if (this.fireTimer >= this.fireRate) {
            enemy.wantsFire = true;
            this.fireTimer = 0;
        } else {
            enemy.wantsFire = false;
        }
    }
}

// --- Homing AI (missile guidance toward nearest target) ---

export class HomingAI implements AIBehavior {
    update(enemy: Enemy, playerX: number, playerY: number, _dt: number): void {
        const dx = playerX - enemy.x;
        const dy = playerY - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 16) {
            enemy.vx = (dx / dist) * enemy.config.speed;
            enemy.vy = (dy / dist) * enemy.config.speed;
        }
        enemy.wantsFire = false;
    }
}
