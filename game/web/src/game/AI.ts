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
// Fire rate: 400ms (C++ LF_FIRE_RATE)

// --- Light Fighter AI (C++ LightFighterAI.cpp — frame-based heading, 32-frame system) ---
// 5 states: ENTERING → FLYBY → TARGETING → SCATTER → (67% FLYBY / 33% RUNAWAY)
// Speed 10 px/tick, 32-frame heading, turn rate: 60ms per frame increment
// C++ reference: LightFighterAI.cpp, LightFighterAI.h

export class LightFighterAI implements AIBehavior {
    state = LFAIState.EnteringScreen;
    private headingFrame = 24; // 0-31 directional (24=down initial)
    private turnTarget = 0;
    private turnAccum = 0; // ms for turn timing
    private ticCount = 0; // state timer in ms
    private fireTimer = 0;
    private readonly wavePosition: number;

    private static readonly SPEED = 10; // C++ LF_SPEED
    private static readonly FIRE_RATE = 400; // ms (C++ LF_FIRE_RATE)
    private static readonly TURN_RATE = 60; // ms per frame turn (C++ LF_TURNRATE)
    // C++ uses LF_SCREEN_WIDTH=800 for boundary/heading calcs
    private static readonly SCREEN_W = 800;
    private static readonly SCREEN_H = 600;

    constructor(wavePosition = 0) {
        this.wavePosition = wavePosition;
        this.headingFrame = 24; // facing down
        // C++ stagger: 300 + wavePosition * 410ms
        this.ticCount = 300 + wavePosition * 410;
    }

    update(enemy: Enemy, playerX: number, playerY: number, dt: number): void {
        const dtMs = dt * 1000;
        this.fireTimer += dtMs;
        const speed = LightFighterAI.SPEED;

        enemy.wantsFire = false;

        switch (this.state) {
            case LFAIState.EnteringScreen:
                // Fly straight down, no turning, timer counts down
                this.ticCount -= dtMs;
                if (this.ticCount < 0) {
                    this.state = LFAIState.FlyBy;
                    // Choose turn direction based on X position
                    if (enemy.x < LightFighterAI.SCREEN_W / 2) {
                        this.turnTarget = (8 + 25) % 32; // = 1 (slightly right of up)
                    } else {
                        this.turnTarget = ((-8 + 25) % 32 + 32) % 32; // = 17
                    }
                    this.turnAccum = 0;
                    this.ticCount = 1600; // 1.6s flyby
                }
                break;

            case LFAIState.FlyBy:
                // Turn toward corner target, fire when facing player
                this.doTurn(dtMs);

                // Fire if facing player and cooldown expired
                {
                    const playerHeading = LightFighterAI.calculateHeading(playerX, playerY, enemy.x, enemy.y);
                    if (playerHeading === this.headingFrame && this.fireTimer >= LightFighterAI.FIRE_RATE) {
                        enemy.wantsFire = true;
                        this.fireTimer = 0;
                    }
                }

                this.ticCount -= dtMs;
                if (this.ticCount < 0) {
                    this.state = LFAIState.Targeting;
                    this.ticCount = 0;
                }
                break;

            case LFAIState.Targeting:
                // Continuously turn toward player, fire + scatter when aligned
                this.turnTarget = LightFighterAI.calculateHeading(playerX, playerY, enemy.x, enemy.y);
                this.doTurn(dtMs);

                if (this.turnTarget === this.headingFrame) {
                    // Check player within half-screen bounds
                    if (Math.abs(playerX - enemy.x) < LightFighterAI.SCREEN_W / 2 &&
                        Math.abs(playerY - enemy.y) < LightFighterAI.SCREEN_H / 2) {
                        enemy.wantsFire = true;
                        this.fireTimer = 0;
                        this.state = LFAIState.Scatter;
                        this.ticCount = 1200; // 1.2s scatter
                    }
                }
                break;

            case LFAIState.Scatter:
                // Scatter perpendicular to player based on wave position
                {
                    const scatterTarget = LightFighterAI.calculateHeading(playerX, playerY, enemy.x, enemy.y);
                    if (this.wavePosition % 2 === 0) {
                        this.turnTarget = ((scatterTarget - 8) % 32 + 32) % 32; // 90° CCW
                    } else {
                        this.turnTarget = ((scatterTarget + 8) % 32 + 32) % 32; // 90° CW
                    }
                }
                this.doTurn(dtMs);

                this.ticCount -= dtMs;
                if (this.ticCount < 0) {
                    // 33% runaway, 67% back to flyby
                    if (Math.random() < 0.333) {
                        this.state = LFAIState.RunAway;
                    } else {
                        this.state = LFAIState.FlyBy;
                        // Corner targeting: away from player
                        if (playerX > LightFighterAI.SCREEN_W / 2) {
                            this.turnTarget = LightFighterAI.calculateHeading(0, 0, enemy.x, enemy.y);
                        } else {
                            this.turnTarget = LightFighterAI.calculateHeading(LightFighterAI.SCREEN_W, 0, enemy.x, enemy.y);
                        }
                        this.ticCount = 2000; // 2s flyby
                    }
                }
                break;

            case LFAIState.RunAway:
                // Head toward nearest screen edge with wave-position variation
                if (enemy.x < LightFighterAI.SCREEN_W / 2) {
                    this.turnTarget = ((16 + (this.wavePosition % 7) - 3) % 32 + 32) % 32;
                } else {
                    this.turnTarget = ((32 + (this.wavePosition % 7) - 3) % 32 + 32) % 32;
                }
                this.doTurn(dtMs);

                if (enemy.y < -64 || enemy.x < -64 || enemy.x > PLAY_AREA_W + 64) {
                    enemy.alive = false;
                }
                break;

            default:
                this.state = LFAIState.EnteringScreen;
        }

        // Movement: frame-based heading (same as FighterB)
        const rad = this.headingFrame * 0.19635; // 11.25° in radians
        enemy.vx = Math.cos(rad) * speed;
        enemy.vy = -Math.sin(rad) * speed; // negative Y for screen coords
        enemy.angle = Math.atan2(enemy.vy, enemy.vx);
    }

    /** C++ DoTurn: turn one heading frame per TURN_RATE ms toward target */
    private doTurn(dtMs: number): void {
        if (this.headingFrame === this.turnTarget) return;

        this.turnAccum += dtMs;
        while (this.turnAccum >= LightFighterAI.TURN_RATE && this.headingFrame !== this.turnTarget) {
            this.turnAccum -= LightFighterAI.TURN_RATE;
            const diff = ((this.turnTarget - this.headingFrame) % 32 + 32) % 32;
            if (diff <= 16) {
                this.headingFrame = (this.headingFrame + 1) % 32;
            } else {
                this.headingFrame = (this.headingFrame - 1 + 32) % 32;
            }
        }
    }

    /** C++ CalculateHeading: convert target position to 0-31 heading frame */
    static calculateHeading(px: number, py: number, ex: number, ey: number): number {
        const dx = px - ex;
        const dy = -(py - ey); // flip Y for math coords
        let angle = Math.atan2(dy, dx);
        if (angle < 0) angle += 2 * Math.PI;
        return Math.floor((angle + 0.0982) / 0.19635) % 32;
    }
}

// --- Fighter B AI (frame-based heading, 32-frame directional movement) ---
// 4 states: ENTERING → RIGHT ↔ LEFT → RUNAWAY
// Speed 12 px/tick, heading-based movement, fires only when facing player
// Turn rate: 1 frame per 60ms (FBAI_TURNRATE), fire rate: 1000ms
// C++ reference: FighterBAI.cpp — no pass counting, runaway toward nearest edge

export class FighterBAI implements AIBehavior {
    state = FBAIState.EnteringScreen;
    private headingFrame = 24; // 0-31 directional frame (24=down, 0=right, 8=up, 16=left)
    private turnTarget = 24;
    private turnAccum = 0; // accumulated ms for turn timing
    private fireTimer = 0;
    private readonly runawayVariation: number; // ±3 frame offset for runaway direction

    private static readonly TURN_RATE = 60; // ms per frame turn (C++ FBAI_TURNRATE)
    private static readonly FIRE_RATE = 1000; // ms (C++ FBAI_FIRE_RATE)
    // C++ uses LF_SCREEN_WIDTH=800 for runaway midpoint, scale to play area
    private static readonly SCREEN_MID_X = PLAY_AREA_W / 2;

    constructor() {
        // C++ uses (m_nWavePosition % 7) - 3 for runaway variation
        this.runawayVariation = Math.floor(Math.random() * 7) - 3;
    }

    update(enemy: Enemy, playerX: number, playerY: number, dt: number): void {
        const dtMs = dt * 1000;
        this.fireTimer += dtMs;
        const speed = enemy.config.speed; // 12 px/tick

        // C++ calculates heading to player for fire check BEFORE state switch
        const dirToPlayer = FighterBAI.calculateHeading(playerX, playerY, enemy.x, enemy.y);

        // C++ fires only when current heading frame matches player direction
        enemy.wantsFire = false;
        if (this.headingFrame === dirToPlayer &&
            this.fireTimer >= FighterBAI.FIRE_RATE &&
            this.state !== FBAIState.EnteringScreen &&
            this.state !== FBAIState.RunAway) {
            enemy.wantsFire = true;
            this.fireTimer = 0;
        }

        switch (this.state) {
            case FBAIState.EnteringScreen:
                // Fly straight down (frame 24)
                enemy.wantsFire = false;
                if (enemy.y > 0) {
                    this.state = playerX > enemy.x ? FBAIState.Right : FBAIState.Left;
                }
                break;

            case FBAIState.Left:
                this.turnTarget = 17; // slightly past left (C++ FBAI_LEFT target)
                if (enemy.x < 100) this.state = FBAIState.Right; // C++ edge trigger
                if (enemy.y > 500) this.state = FBAIState.RunAway; // C++ y>500
                this.doTurn(dtMs);
                break;

            case FBAIState.Right:
                this.turnTarget = 31; // slightly past right (C++ FBAI_RIGHT target)
                if (enemy.x > 500) this.state = FBAIState.Left; // C++ edge trigger
                if (enemy.y > 500) this.state = FBAIState.RunAway; // C++ y>500
                this.doTurn(dtMs);
                break;

            case FBAIState.RunAway:
                enemy.wantsFire = false;
                // C++ heads toward closest side with wave-position variation
                if (enemy.x < FighterBAI.SCREEN_MID_X) {
                    this.turnTarget = ((16 + this.runawayVariation) % 32 + 32) % 32;
                } else {
                    this.turnTarget = ((32 + this.runawayVariation) % 32 + 32) % 32;
                }
                this.doTurn(dtMs);
                // Exit when off screen
                if (enemy.y < -64 || enemy.x < -64 || enemy.x > PLAY_AREA_W + 64) {
                    enemy.alive = false;
                }
                break;

            default:
                this.state = FBAIState.EnteringScreen;
        }

        // C++ derives velocity from heading frame: rad = frame * 11.25° * π/180
        const rad = this.headingFrame * 0.19635; // 11.25° in radians
        enemy.vx = Math.cos(rad) * speed;
        enemy.vy = -Math.sin(rad) * speed;

        // Set angle for sprite frame rendering
        enemy.angle = Math.atan2(enemy.vy, enemy.vx);
    }

    /** C++ DoTurn: turn one heading frame per TURN_RATE ms toward target */
    private doTurn(dtMs: number): void {
        if (this.headingFrame === this.turnTarget) return;

        this.turnAccum += dtMs;
        while (this.turnAccum >= FighterBAI.TURN_RATE && this.headingFrame !== this.turnTarget) {
            this.turnAccum -= FighterBAI.TURN_RATE;
            // Shortest-path turn on 32-frame circle
            const diff = ((this.turnTarget - this.headingFrame) % 32 + 32) % 32;
            if (diff <= 16) {
                this.headingFrame = (this.headingFrame + 1) % 32;
            } else {
                this.headingFrame = (this.headingFrame - 1 + 32) % 32;
            }
        }
    }

    /** C++ CalculateHeading: convert player position to 0-31 heading frame */
    static calculateHeading(px: number, py: number, ex: number, ey: number): number {
        const dx = px - ex;
        const dy = -(py - ey); // flip Y for math coords
        let angle = Math.atan2(dy, dx);
        if (angle < 0) angle += 2 * Math.PI;
        // Each frame = 11.25° = 0.19635 rad, add half-frame (0.0982) for rounding
        return Math.floor((angle + 0.0982) / 0.19635) % 32;
    }
}

// --- Gunship AI (drag-based physics, burst fire with 64px alignment) ---
// 4 states: ENTERING → FLYBY_RIGHT ↔ FLYBY_LEFT → RUNAWAY
// Drag 0.9/tick, accel (14/0.9)-14 ≈ 1.556, max speed 9 px/tick
// Burst: fire for 600ms window every 3000ms cycle, ONLY when |playerX-enemyX| < 64
// C++ reference: GunshipAI.cpp, GunshipAI.h

export class GunshipAI implements AIBehavior {
    state = GSAIState.EnteringScreen;
    private passes = 0;
    private burstTimer = 0;
    private readonly maxPasses = 3; // C++ GS_MAX_PASSES

    private static readonly DRAG = 0.9; // C++ GS_DRAG
    private static readonly ACCEL = (14 / 0.9) - 14; // C++ GS_ACCEL ≈ 1.556
    private static readonly MAX_SPEED = 9; // C++ GS_MAXSPEED
    private static readonly BURST_FIRE_WINDOW = 600; // ms (C++ GS_FIRE_RATE as window)
    private static readonly BURST_CYCLE = 3000; // ms (C++ GS_BURST_RATE)
    private static readonly FIRE_RANGE = 64; // px horizontal alignment (C++ GS_FIRERANGE)

    update(enemy: Enemy, playerX: number, _playerY: number, dt: number): void {
        this.burstTimer += dt * 1000;
        if (this.burstTimer >= GunshipAI.BURST_CYCLE) {
            this.burstTimer -= GunshipAI.BURST_CYCLE;
        }

        const ticks = dt * 60;
        const drag = Math.pow(GunshipAI.DRAG, ticks);
        // C++ fire range check: only fire when horizontally aligned within 64px
        const aligned = Math.abs(playerX - enemy.x) < GunshipAI.FIRE_RANGE;
        const inBurst = this.burstTimer < GunshipAI.BURST_FIRE_WINDOW;

        enemy.wantsFire = false;

        switch (this.state) {
            case GSAIState.EnteringScreen:
                // C++ enters at constant max speed downward, transitions at y >= 16
                enemy.vy = GunshipAI.MAX_SPEED;
                enemy.vx *= drag;

                if (enemy.y >= 16) {
                    this.passes++;
                    this.state = playerX > enemy.x ? GSAIState.FlyByRight : GSAIState.FlyByLeft;
                    this.burstTimer = 0;
                }
                break;

            case GSAIState.FlyByRight:
                // C++ accelerates right; decelerates vertically until vy <= 1
                enemy.vx += GunshipAI.ACCEL * ticks;
                if (enemy.vy > 1) {
                    enemy.vy -= GunshipAI.ACCEL * ticks;
                }
                enemy.vx *= drag;
                enemy.vy *= drag;
                this.clampSpeed(enemy);

                // C++ fires during burst window ONLY when aligned (GS_FIRERANGE=64)
                if (aligned && inBurst) enemy.wantsFire = true;

                // C++ edge: x > GS_SCREEN_WIDTH - GS_SCREEN_WIDTH/4 (proportional to play area)
                if (enemy.x > PLAY_AREA_W - PLAY_AREA_W / 4) {
                    this.passes++;
                    this.state = this.passes > this.maxPasses
                        ? GSAIState.RunAwayLeft
                        : GSAIState.FlyByLeft;
                }
                break;

            case GSAIState.FlyByLeft:
                // C++ accelerates left; decelerates vertically until vy <= 1
                enemy.vx -= GunshipAI.ACCEL * ticks;
                if (enemy.vy > 1) {
                    enemy.vy -= GunshipAI.ACCEL * ticks;
                }
                enemy.vx *= drag;
                enemy.vy *= drag;
                this.clampSpeed(enemy);

                if (aligned && inBurst) enemy.wantsFire = true;

                // C++ edge: x < GS_SCREEN_WIDTH/4
                if (enemy.x < PLAY_AREA_W / 4) {
                    this.passes++;
                    this.state = this.passes > this.maxPasses
                        ? GSAIState.RunAwayRight
                        : GSAIState.FlyByRight;
                }
                break;

            case GSAIState.RunAwayLeft:
                // C++ RUNAWAY_LEFT: accelerate LEFT + DOWN (exits bottom-left)
                enemy.vx -= GunshipAI.ACCEL * ticks;
                enemy.vy += GunshipAI.ACCEL * ticks;
                enemy.vx *= drag;
                enemy.vy *= drag;
                // C++ gunship fires during runaway too if aligned
                if (aligned && inBurst) enemy.wantsFire = true;
                if (enemy.x < -96) enemy.alive = false;
                break;

            case GSAIState.RunAwayRight:
                // C++ RUNAWAY_RIGHT: accelerate RIGHT + DOWN (exits bottom-right)
                enemy.vx += GunshipAI.ACCEL * ticks;
                enemy.vy += GunshipAI.ACCEL * ticks;
                enemy.vx *= drag;
                enemy.vy *= drag;
                if (aligned && inBurst) enemy.wantsFire = true;
                if (enemy.x > PLAY_AREA_W + 96) enemy.alive = false;
                break;

            default:
                this.state = GSAIState.EnteringScreen;
        }

        // Angle derived from velocity for 17-frame sprite
        enemy.angle = Math.atan2(enemy.vy, enemy.vx);
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
