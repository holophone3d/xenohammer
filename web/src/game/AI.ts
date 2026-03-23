/**
 * AI behaviors ported from the C++ source.
 * Each AI updates an enemy's velocity and firing state per tick.
 *
 * Movement values are in px/tick where 1 tick = 1/60s (fixed timestep).
 * dt is passed in seconds; multiply by 60 to get ticks.
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
// 5 states: ENTERING → TARGETING → FLYBY → SCATTER → RUNAWAY
// Speed 10 px/tick, turn rate ~0.1 rad/tick, fire during FLYBY within 200px

export class LightFighterAI implements AIBehavior {
    state = LFAIState.EnteringScreen;
    private stateTimer = 0;
    private angle = Math.PI / 2; // facing down initially
    private scatterAngle = 0;

    private static readonly TURN_RATE = 0.1; // rad/tick
    private static readonly FIRE_RANGE = 200;
    private static readonly FACING_THRESHOLD = 15 * (Math.PI / 180); // ~15°
    private static readonly SCATTER_DURATION = 1.0; // seconds

    update(enemy: Enemy, playerX: number, playerY: number, dt: number): void {
        this.stateTimer += dt;
        const speed = enemy.config.speed; // 10 px/tick
        const ticks = dt * 60;
        const dx = playerX - enemy.x;
        const dy = playerY - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const targetAngle = Math.atan2(dy, dx);

        enemy.wantsFire = false;

        switch (this.state) {
            case LFAIState.EnteringScreen:
                // Fly downward onto screen
                this.angle = Math.PI / 2;
                enemy.vx = 0;
                enemy.vy = speed;
                if (enemy.y > 100 + Math.random() * 100) {
                    this.state = LFAIState.Targeting;
                    this.stateTimer = 0;
                }
                break;

            case LFAIState.Targeting: {
                // Turn toward player
                this.turnToward(targetAngle, ticks);
                enemy.vx = Math.cos(this.angle) * speed;
                enemy.vy = Math.sin(this.angle) * speed;

                // Transition to FLYBY when facing player
                const angleDiff = Math.abs(this.normalizeAngle(targetAngle - this.angle));
                if (angleDiff < LightFighterAI.FACING_THRESHOLD) {
                    this.state = LFAIState.FlyBy;
                    this.stateTimer = 0;
                }
                break;
            }

            case LFAIState.FlyBy:
                // Fly past player, firing weapons when in range
                enemy.vx = Math.cos(this.angle) * speed;
                enemy.vy = Math.sin(this.angle) * speed;
                enemy.wantsFire = dist < LightFighterAI.FIRE_RANGE;

                // Transition to SCATTER when past player
                if (enemy.y > playerY + 50) {
                    this.state = LFAIState.Scatter;
                    this.stateTimer = 0;
                    // Random scatter direction (break away)
                    this.scatterAngle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
                }
                break;

            case LFAIState.Scatter:
                // Break away with random vector
                this.angle = this.scatterAngle;
                enemy.vx = Math.cos(this.angle) * speed;
                enemy.vy = Math.sin(this.angle) * speed;
                enemy.wantsFire = false;

                if (this.stateTimer > LightFighterAI.SCATTER_DURATION) {
                    this.state = LFAIState.RunAway;
                    this.stateTimer = 0;
                }
                break;

            case LFAIState.RunAway:
                // Exit screen upward
                this.angle = -Math.PI / 2;
                enemy.vx = 0;
                enemy.vy = -speed;
                enemy.wantsFire = false;
                if (enemy.y < -64) {
                    enemy.alive = false;
                }
                break;

            default:
                this.state = LFAIState.EnteringScreen;
        }

        enemy.angle = this.angle;
    }

    private turnToward(target: number, ticks: number): void {
        let diff = this.normalizeAngle(target - this.angle);
        const maxTurn = LightFighterAI.TURN_RATE * ticks;
        if (Math.abs(diff) > maxTurn) {
            diff = diff > 0 ? maxTurn : -maxTurn;
        }
        this.angle = this.normalizeAngle(this.angle + diff);
    }

    private normalizeAngle(a: number): number {
        while (a > Math.PI) a -= 2 * Math.PI;
        while (a < -Math.PI) a += 2 * Math.PI;
        return a;
    }
}

// --- Fighter B AI (horizontal sweeps, 2 passes then runaway) ---
// 4 states: ENTERING → RIGHT ↔ LEFT → RUNAWAY
// Speed 12 px/tick horizontally, slight downward drift

export class FighterBAI implements AIBehavior {
    state = FBAIState.EnteringScreen;
    private stateTimer = 0;
    private passes = 0;
    private readonly maxPasses = 2;

    update(enemy: Enemy, playerX: number, _playerY: number, dt: number): void {
        this.stateTimer += dt;
        const speed = enemy.config.speed; // 12 px/tick
        const dx = playerX - enemy.x;

        enemy.wantsFire = false;

        switch (this.state) {
            case FBAIState.EnteringScreen:
                enemy.vy = speed;
                enemy.vx = 0;
                if (enemy.y > 60) {
                    this.state = dx > 0 ? FBAIState.Right : FBAIState.Left;
                    this.stateTimer = 0;
                }
                break;

            case FBAIState.Right:
                enemy.vx = speed;
                enemy.vy = speed * 0.15;
                enemy.wantsFire = true;
                enemy.angle = 0; // facing right

                if (enemy.x > PLAY_AREA_W - 50) {
                    this.passes++;
                    if (this.passes >= this.maxPasses) {
                        this.state = FBAIState.RunAway;
                    } else {
                        this.state = FBAIState.Left;
                    }
                    this.stateTimer = 0;
                }
                break;

            case FBAIState.Left:
                enemy.vx = -speed;
                enemy.vy = speed * 0.15;
                enemy.wantsFire = true;
                enemy.angle = Math.PI; // facing left

                if (enemy.x < 50) {
                    this.passes++;
                    if (this.passes >= this.maxPasses) {
                        this.state = FBAIState.RunAway;
                    } else {
                        this.state = FBAIState.Right;
                    }
                    this.stateTimer = 0;
                }
                break;

            case FBAIState.RunAway:
                enemy.vy = -speed * 1.5;
                enemy.vx = 0;
                enemy.wantsFire = false;
                enemy.angle = -Math.PI / 2;
                if (enemy.y < -64) {
                    enemy.alive = false;
                }
                break;

            default:
                this.state = FBAIState.EnteringScreen;
        }

        // Force runaway if off bottom of screen
        if (enemy.y > PLAY_AREA_H - 30 && this.state !== FBAIState.RunAway) {
            this.state = FBAIState.RunAway;
        }

        // Update angle from velocity for non-explicit states
        if (this.state === FBAIState.EnteringScreen) {
            enemy.angle = Math.PI / 2;
        }
    }
}

// --- Gunship AI (drag-based physics, burst fire, 3 passes) ---
// 4 states: ENTERING → FLYBY_RIGHT ↔ FLYBY_LEFT → RUNAWAY
// Drag 0.9/tick, accel 1.571 px/tick², max speed 9 px/tick
// Burst: fire for 600ms, pause for 2400ms (3000ms cycle)
// Fire rate during burst: 600ms between shots, dual cannons alternate

export class GunshipAI implements AIBehavior {
    state = GSAIState.EnteringScreen;
    private stateTimer = 0;
    private passes = 0;
    private burstTimer = 0;
    private readonly maxPasses = 3;
    private nextCannon = 0; // alternates 0/1 for dual cannons

    private static readonly DRAG = 0.9;
    private static readonly ACCEL = 1.571; // px/tick²
    private static readonly MAX_SPEED = 9;
    private static readonly BURST_FIRE_WINDOW = 600; // ms
    private static readonly BURST_CYCLE = 3000; // ms

    update(enemy: Enemy, playerX: number, _playerY: number, dt: number): void {
        this.stateTimer += dt;
        this.burstTimer += dt * 1000;
        if (this.burstTimer >= GunshipAI.BURST_CYCLE) {
            this.burstTimer -= GunshipAI.BURST_CYCLE;
        }

        const ticks = dt * 60;
        const drag = Math.pow(GunshipAI.DRAG, ticks);

        enemy.wantsFire = false;

        switch (this.state) {
            case GSAIState.EnteringScreen:
                // Enter from top, accelerate downward
                enemy.vy += GunshipAI.ACCEL * ticks * 0.5;
                enemy.vx *= drag;
                enemy.vy *= drag;
                this.clampSpeed(enemy);

                if (enemy.y > 80) {
                    this.state = playerX > enemy.x ? GSAIState.FlyByRight : GSAIState.FlyByLeft;
                    this.stateTimer = 0;
                }
                break;

            case GSAIState.FlyByRight:
                // Accelerate right with slight downward drift
                enemy.vx += GunshipAI.ACCEL * ticks;
                enemy.vy += GunshipAI.ACCEL * ticks * 0.2;
                enemy.vx *= drag;
                enemy.vy *= drag;
                this.clampSpeed(enemy);

                // Burst fire logic
                enemy.wantsFire = this.burstTimer < GunshipAI.BURST_FIRE_WINDOW;

                if (enemy.x > PLAY_AREA_W - 60) {
                    this.passes++;
                    this.state = this.passes >= this.maxPasses
                        ? GSAIState.RunAwayRight
                        : GSAIState.FlyByLeft;
                    this.stateTimer = 0;
                }
                break;

            case GSAIState.FlyByLeft:
                // Accelerate left with slight downward drift
                enemy.vx -= GunshipAI.ACCEL * ticks;
                enemy.vy += GunshipAI.ACCEL * ticks * 0.2;
                enemy.vx *= drag;
                enemy.vy *= drag;
                this.clampSpeed(enemy);

                // Burst fire logic
                enemy.wantsFire = this.burstTimer < GunshipAI.BURST_FIRE_WINDOW;

                if (enemy.x < 60) {
                    this.passes++;
                    this.state = this.passes >= this.maxPasses
                        ? GSAIState.RunAwayLeft
                        : GSAIState.FlyByRight;
                    this.stateTimer = 0;
                }
                break;

            case GSAIState.RunAwayLeft:
                enemy.vx -= GunshipAI.ACCEL * ticks;
                enemy.vy -= GunshipAI.ACCEL * ticks * 0.5;
                enemy.vx *= drag;
                enemy.vy *= drag;
                enemy.wantsFire = false;
                if (enemy.x < -96) enemy.alive = false;
                break;

            case GSAIState.RunAwayRight:
                enemy.vx += GunshipAI.ACCEL * ticks;
                enemy.vy -= GunshipAI.ACCEL * ticks * 0.5;
                enemy.vx *= drag;
                enemy.vy *= drag;
                enemy.wantsFire = false;
                if (enemy.x > PLAY_AREA_W + 96) enemy.alive = false;
                break;

            default:
                this.state = GSAIState.EnteringScreen;
        }

        // Angle derived from velocity for 17-frame sprite
        enemy.angle = Math.atan2(enemy.vy, enemy.vx);
    }

    /** Get which cannon index should fire next, then alternate */
    getNextCannon(): number {
        const idx = this.nextCannon;
        this.nextCannon = (this.nextCannon + 1) % 2;
        return idx;
    }

    private clampSpeed(enemy: Enemy): void {
        const spd = Math.sqrt(enemy.vx * enemy.vx + enemy.vy * enemy.vy);
        if (spd > GunshipAI.MAX_SPEED) {
            const scale = GunshipAI.MAX_SPEED / spd;
            enemy.vx *= scale;
            enemy.vy *= scale;
        }
    }
}

// --- Turret AI (track player angle, two modes: SWEEPING and RANDOM) ---

export type TurretMode = 'sweeping' | 'random';

export class TurretAI implements AIBehavior {
    private fireTimer = 0;
    fireRate: number;
    mode: TurretMode;
    private sweepSpeed: number; // deg/s for sweeping mode
    private sweepAngle = 0;

    constructor(mode: TurretMode = 'random', param = 2000) {
        this.mode = mode;
        if (mode === 'sweeping') {
            this.sweepSpeed = param; // degrees per second
            this.fireRate = 500;
        } else {
            this.sweepSpeed = 0;
            this.fireRate = param; // ms between shots
        }
    }

    update(enemy: Enemy, playerX: number, playerY: number, dt: number): void {
        this.fireTimer += dt * 1000;
        enemy.wantsFire = false;

        const dx = playerX - enemy.x;
        const dy = playerY - enemy.y;

        if (this.mode === 'sweeping') {
            // Rotate at fixed speed, fire periodically
            this.sweepAngle += this.sweepSpeed * dt;
            this.sweepAngle %= 360;
            enemy.turretAngle = this.sweepAngle;
        } else {
            // Track player angle
            enemy.turretAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        }

        if (this.fireTimer >= this.fireRate) {
            enemy.wantsFire = true;
            this.fireTimer = 0;
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
