/**
 * Frigate-class capital ship (Type 3) with destructible components.
 *
 * Faithfully ported from C++ Frigate.cpp + FrigateAI.cpp + TurretAI.cpp.
 *
 * Component Layout (offsets from body top-left):
 *   Body (0,0) 96×144, Nose (0,112) 96×128, Wings (±62,5) 96×128,
 *   Turrets (−47,37) and (79,37) 64×64 each.
 *
 * Damage propagation:
 *   Turrets → Wings → Body (each gate must be destroyed first).
 *
 * FrigateAI states: ENTERING → STRAFING ↔ CHARGING ↔ RETREATING → RUNAWAY
 * Turret AI: NORMAL type — tracks player, turns at 65ms/frame, fires when aligned.
 * Nose weapon: ENEMYCANNON fires straight down when |shipX - playerX| < 64.
 */

import { Sprite, AssetLoader } from '../engine';
import { Rect, Collider, PLAY_AREA_W, PLAY_AREA_H } from './Collision';
import { Projectile } from './Projectile';
import { VELOCITY_DIVISOR } from '../data/ships';
import { generateImageMask } from './maskUtil';

// --- FrigateAI constants (from FrigateAI.h) ---
const FAI_MAX_SPEED = 6;
const FAI_DRAG = 0.95;
const FAI_ACCEL = 0.2;
const FAI_ACCEL_RATE = 100;     // ms between physics ticks
const FAI_FIRE_RATE = 3000;     // ms between nose cannon shots
const FAI_DESIRED_Y = 25;       // preferred hover Y
const FAI_SIT_TIME = 3078;      // ms in each state before transition
const FAI_SCREEN_TIME = 60000;  // runs away after 60s on screen

// --- TurretAI constants (from TurretAI.h) ---
const TURRET_TURN_RATE = 65;    // ms between turret frame changes
const TURRET_FIRE_RATE = 3000;  // ms between turret shots

// --- Sprite dimensions (actual PNG sizes) ---
const BODY_WIDTH = 96;
const BODY_HEIGHT = 144;
const NOSE_W = 96;
const NOSE_H = 128;
const WING_W = 96;
const WING_H = 128;
const TURRET_W = 64;
const TURRET_H = 64;

const TURRET_SPRITE_FRAMES = 33; // Turret00–Turret32 (32 is destroyed)

// --- AI state enum ---
enum FrigateAIState {
    ENTERING_SCREEN,
    SITTING,
    CHARGING,
    STRAFING,
    RETREATING,
    RUNAWAY,
}

export interface FrigateComponent {
    name: string;
    offsetX: number;
    offsetY: number;
    armor: number;
    maxArmor: number;
    alive: boolean;
    damageable: boolean;
    sprite: HTMLImageElement | null;
    destroyedSprite: HTMLImageElement | null;
    width: number;
    height: number;
    /** 1-bit alpha mask for pixel-level collision. */
    mask: Uint8Array | null;
}

interface FrigateTurret extends FrigateComponent {
    turretFrame: number;         // current sprite frame (0-31, 32=destroyed)
    lastTurnTime: number;        // ms timestamp of last frame change
    lastFireTime: number;        // ms timestamp of last shot
    turretInit: boolean;         // first Think() hasn't run yet
    turretSprites: HTMLImageElement[];
    turretMasks: (Uint8Array | null)[];   // per-frame masks for rotating turret
}

function makeComponent(
    name: string,
    offsetX: number, offsetY: number,
    armor: number, w: number, h: number,
    damageable: boolean,
): FrigateComponent {
    return {
        name, offsetX, offsetY,
        armor, maxArmor: armor,
        alive: true, damageable,
        sprite: null, destroyedSprite: null,
        width: w, height: h,
        mask: null,
    };
}

export class CapitalShip {
    x: number;
    y: number;
    alive = true;
    justDied = false; // set true on the frame the body dies, consumed by GameManager

    body: FrigateComponent;
    nose: FrigateComponent;
    rightWing: FrigateComponent;
    leftWing: FrigateComponent;
    rightTurret: FrigateTurret;
    leftTurret: FrigateTurret;

    private pendingProjectiles: Projectile[] = [];
    private pendingFireSounds: { sound: string; volume: number }[] = [];
    private assets: AssetLoader | null = null;
    // Component destruction events for GameManager (sound + explosions)
    pendingComponentDestructions: Array<{ x: number; y: number }> = [];
    // Per-frame cache for getComponentRects()
    private _compRectsCache: Array<{ component: FrigateComponent; rect: Rect; collider: Collider }> = [];
    private _compRectsDirty = true;

    // --- FrigateAI state (ported from FrigateAI.cpp) ---
    private aiState = FrigateAIState.ENTERING_SCREEN;
    /** Velocity — public for explosion trail system */
    vx = 0;
    vy = FAI_MAX_SPEED;  // start descending at max speed
    private accelAccum = 0;      // accumulated ms for physics ticks
    private lastAccelTime = 0;
    private lastNoseFireTime = 0;
    private lastTransitionTime = 0;
    private createdTime = -1;
    private xerr = 0;
    private yerr = 0;
    private isRunningAway = false;

    constructor(x: number, y = -300) {
        this.x = x;
        this.y = y;

        // Components per C++ Frigate.cpp constructor
        this.body      = makeComponent('Body',       0,    0,  900, BODY_WIDTH, BODY_HEIGHT, false);
        this.nose      = makeComponent('Nose',       0,  112,  900, NOSE_W, NOSE_H, true);
        this.rightWing = makeComponent('RightWing', -62,   5,  300, WING_W, WING_H, false);
        this.leftWing  = makeComponent('LeftWing',   62,   5,  300, WING_W, WING_H, false);

        this.rightTurret = {
            ...makeComponent('RightTurret', -47, 37, 600, TURRET_W, TURRET_H, true),
            turretFrame: 0,
            lastTurnTime: 0,
            lastFireTime: 0,
            turretInit: true,
            turretSprites: [],
            turretMasks: [],
        };

        this.leftTurret = {
            ...makeComponent('LeftTurret', 79, 37, 600, TURRET_W, TURRET_H, true),
            turretFrame: 0,
            lastTurnTime: 0,
            lastFireTime: 0,
            turretInit: true,
            turretSprites: [],
            turretMasks: [],
        };
    }

    /** Load sprites from the asset loader. */
    loadSprites(assets: AssetLoader): void {
        this.assets = assets;
        const tryImg = (id: string): HTMLImageElement | null => {
            try { return assets.getImage(id); } catch { return null; }
        };

        this.body.sprite            = tryImg('CapShipBody');
        this.nose.sprite            = tryImg('CapShipNose');
        this.nose.destroyedSprite   = tryImg('CapShipNoseDest');
        // C++ swaps sprite names: CapShipRtTemplate loads CapShipLt sprite (and vice versa)
        // rightWing at offset (-62) = screen left → uses CapShipLt art
        // leftWing at offset (62) = screen right → uses CapShipRt art
        this.rightWing.sprite         = tryImg('CapShipLt');
        this.rightWing.destroyedSprite = tryImg('CapShipLtDest');
        this.leftWing.sprite          = tryImg('CapShipRt');
        this.leftWing.destroyedSprite  = tryImg('CapShipRtDest');

        // Turret animated frames (Turret00–Turret31 = directional, Turret32 = destroyed)
        const turretFrames: HTMLImageElement[] = [];
        for (let i = 0; i < TURRET_SPRITE_FRAMES; i++) {
            const img = tryImg(`Turret${i.toString().padStart(2, '0')}`);
            if (img) turretFrames.push(img);
        }
        this.rightTurret.turretSprites = turretFrames;
        this.leftTurret.turretSprites  = turretFrames;

        // Generate turret per-frame masks
        const turretMasks = turretFrames.map(f => generateImageMask(f));
        this.rightTurret.turretMasks = turretMasks;
        this.leftTurret.turretMasks  = turretMasks;

        const destroyedTurret = tryImg('Turret32');
        this.rightTurret.destroyedSprite = destroyedTurret;
        this.leftTurret.destroyedSprite  = destroyedTurret;

        // Generate per-component alpha masks for pixel-level collision
        for (const comp of this.allComponents()) {
            if (comp.sprite) {
                comp.mask = generateImageMask(comp.sprite);
            }
        }
    }

    // ---------------------------------------------------------------
    // Damage propagation
    // ---------------------------------------------------------------

    private updateDamageableFlags(): void {
        this.rightTurret.damageable = this.rightTurret.alive;
        this.leftTurret.damageable  = this.leftTurret.alive;

        // Wings become damageable only when their turret is destroyed
        // C++: if(CapShipRtTurret->get_damageable()==false && CapShipRt->get_curr_frame()==0)
        //        CapShipRt->set_damageable(true);
        this.rightWing.damageable = !this.rightTurret.alive && this.rightWing.alive;
        this.leftWing.damageable  = !this.leftTurret.alive  && this.leftWing.alive;

        // Body is damageable only after both wings are destroyed
        this.body.damageable = !this.rightWing.alive && !this.leftWing.alive && this.body.alive;
    }

    private allComponents(): FrigateComponent[] {
        return [this.body, this.rightWing, this.leftWing, this.nose,
                this.rightTurret, this.leftTurret];
    }

    // ---------------------------------------------------------------
    // TurretAI — NORMAL type (from TurretAI.cpp)
    // ---------------------------------------------------------------

    /**
     * Calculate heading frame (0-31) from turret to player.
     * Frame 0 = pointing DOWN, 8 = RIGHT, 16 = UP, 24 = LEFT.
     * Ported from TurretAI::CalculateHeading().
     */
    private calculateHeading(playerX: number, playerY: number, turretX: number, turretY: number): number {
        const dx = playerX - turretX;
        const dy = -(playerY - turretY); // invert Y for math convention
        let angle: number;
        if (Math.abs(dx) > 0.01) {
            angle = Math.atan(dy / dx);
        } else {
            angle = Math.atan(dy / 0.01);
        }
        if (dx < 0) angle += Math.PI;
        angle += 2 * Math.PI; // ensure positive
        let heading = Math.floor((angle + 0.0982) / 0.19635);
        heading = (heading + 8) % 32;
        return heading;
    }

    private updateTurretAI(
        turret: FrigateTurret, playerX: number, playerY: number, now: number,
    ): { fire: boolean; frame: number } {
        if (turret.turretInit) {
            turret.turretInit = false;
            turret.lastTurnTime = now;
            turret.lastFireTime = now;
            return { fire: false, frame: turret.turretFrame };
        }

        const tx = this.x + turret.offsetX + turret.width / 2;
        const ty = this.y + turret.offsetY + turret.height / 2;
        const desiredHeading = this.calculateHeading(playerX, playerY, tx, ty);

        if (turret.turretFrame === desiredHeading) {
            // Aimed at player — check fire cooldown
            if (now - turret.lastFireTime < TURRET_FIRE_RATE) {
                turret.lastTurnTime = now;
                return { fire: false, frame: turret.turretFrame };
            }
            turret.lastFireTime = now;
            return { fire: true, frame: turret.turretFrame };
        }

        // Not aimed — turn toward desired heading (shortest path, 1 frame per TURRET_TURN_RATE)
        if (now - turret.lastTurnTime >= TURRET_TURN_RATE) {
            turret.lastTurnTime = now;
            const cur = turret.turretFrame;
            const target = desiredHeading;
            // Shortest-path turning around the 32-frame circle
            if (Math.abs(cur - (target + 32)) < Math.abs(cur - target)) {
                turret.turretFrame = (cur + 1) % 32;
            } else if (Math.abs((cur + 32) - target) < Math.abs(cur - target)) {
                turret.turretFrame = (cur - 1 + 32) % 32;
            } else if (target > cur) {
                turret.turretFrame = (cur + 1) % 32;
            } else {
                turret.turretFrame = (cur - 1 + 32) % 32;
            }
        }
        return { fire: false, frame: turret.turretFrame };
    }

    /**
     * Fire a turret projectile based on turret frame direction.
     * C++ formula: rad = (frame-8)/32 * 2π; offset = cos/sin * 24; velocity = offset/2
     * C++ weapon offsets: turret1=(-31,53), turret2=(95,53) relative to frigate position.
     */
    private fireTurret(turret: FrigateTurret, weaponOffsetX: number, weaponOffsetY: number): void {
        const frame = turret.turretFrame;
        const rad = ((frame - 8) / 32) * 2 * Math.PI;
        const xOff = Math.cos(rad) * 24;
        const yOff = Math.sin(rad) * -24;

        // C++: fire(get_x() + x_off, get_y() + y_off, ...) then weapon adds offset
        const spawnX = this.x + weaponOffsetX + xOff;
        const spawnY = this.y + weaponOffsetY + yOff;

        // Build sprite (ENEMYBLASTER, power_cell_2=4 → frame index 3)
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

        // C++ ENEMYBLASTER Projectile constructor: dx = _dx * 2, dy = _dy * 2
        // Turret passes (xOff/2, yOff/2) → doubled = (xOff, yOff)
        // C++ damage: 3 * ENEMY_DAMAGE_1(5) * power_MUX(pc2=4 → 3.0) = 45
        const proj = new Projectile(
            spawnX, spawnY,
            xOff, yOff,
            45, 'enemy', sprite, 'enemyBlast',
        );
        this.pendingProjectiles.push(proj);

        // C++: Sound::playEnemyLightFighterFire() for ENEMYBLASTER
        this.pendingFireSounds.push({ sound: 'AlienWeapon5', volume: 1.0 });
    }

    /**
     * Fire nose cannon straight down. Only when nose is alive.
     * C++ fires at velocity (0, FAI_MAX_SPEED).
     */
    private fireNose(): void {
        if (!this.nose.alive) return;
        const spawnX = this.x + 32;
        const spawnY = this.y + 212;

        // C++ ENEMYCANNON uses enemy_9 sprite (32×64 elongated bolt), not the round burst
        let sprite: Sprite | null = null;
        if (this.assets) {
            try {
                const img = this.assets.getImage('enemy_9');
                sprite = new Sprite([img], 100);
                sprite.loop = false;
            } catch { /* no sprite */ }
        }

        // C++ ENEMYCANNON Projectile constructor: hardcodes dx=0, dy=21 (ignores passed args!)
        // C++ damage: 4 * ENEMY_DAMAGE_1(5) * power_MUX(pc2=8 → 8.0) = 160
        const proj = new Projectile(
            spawnX, spawnY,
            0, 21,
            160, 'enemy', sprite, 'enemyCannon',
        );
        this.pendingProjectiles.push(proj);

        // C++: Sound::playEnemyGunShipFire() at half volume for ENEMYCANNON
        this.pendingFireSounds.push({ sound: 'AlienWeapon1', volume: 0.5 });
    }

    // ---------------------------------------------------------------
    // FrigateAI state machine (from FrigateAI.cpp)
    // ---------------------------------------------------------------

    private accel(xAccel: number, yAccel: number, now: number): void {
        // C++ applies acceleration + drag every FAI_ACCEL_RATE ms
        if (now - this.lastAccelTime > FAI_ACCEL_RATE * 2) {
            this.lastAccelTime = now - FAI_ACCEL_RATE * 2;
        }
        if (now - this.lastAccelTime > FAI_ACCEL_RATE) {
            this.lastAccelTime += FAI_ACCEL_RATE;
            this.vx += xAccel;
            this.vy += yAccel;
            this.vx *= FAI_DRAG;
            this.vy *= FAI_DRAG;
        }
    }

    /** Vertical acceleration toward FAI_DESIRED_Y (shared by multiple states). */
    private accelToDesiredY(enemyY: number): number {
        if (enemyY > FAI_DESIRED_Y + 30) return -FAI_ACCEL;
        if (enemyY < FAI_DESIRED_Y - 30) return FAI_ACCEL;
        if (Math.abs(this.vy) > 0.25) return -FAI_ACCEL * Math.sign(this.vy);
        return 0;
    }

    private runAI(playerX: number, playerY: number, now: number): { fire: boolean; runAway: boolean } {
        const enemyX = this.x;
        const enemyY = this.y;
        let bFire = false;
        let bRunAway = false;

        if (this.createdTime < 0) this.createdTime = now;

        // After 60s on screen, run away
        if (now - this.createdTime > FAI_SCREEN_TIME) {
            this.aiState = FrigateAIState.RUNAWAY;
        }

        // Nose fire: only when within 64px x-alignment with player
        if (Math.abs(enemyX - playerX) < 64) {
            if (now - this.lastNoseFireTime > FAI_FIRE_RATE) {
                this.lastNoseFireTime = now;
                bFire = true;
            }
        }

        let xtemp: number, ytemp: number, d: number;

        switch (this.aiState) {
            case FrigateAIState.ENTERING_SCREEN:
                // Decelerate when close to desired Y
                if (FAI_DESIRED_Y - enemyY < 50) {
                    this.accel(0, -FAI_ACCEL, now);
                }
                // Transition when nearly stopped vertically
                if (this.vy < 0.2) {
                    this.aiState = FrigateAIState.STRAFING;
                    this.lastTransitionTime = now;
                }
                break;

            case FrigateAIState.SITTING:
                ytemp = this.accelToDesiredY(enemyY);
                // Decelerate horizontally toward 0
                if (Math.abs(this.vx) > 0.25) {
                    xtemp = -FAI_ACCEL * Math.sign(this.vx);
                } else {
                    xtemp = 0;
                }
                this.accel(xtemp, ytemp, now);

                if (now - this.lastTransitionTime > FAI_SIT_TIME) {
                    this.lastTransitionTime = now;
                    // Randomly pick CHARGING or STRAFING
                    this.aiState = Math.random() < 0.5 ? FrigateAIState.CHARGING : FrigateAIState.STRAFING;
                }
                break;

            case FrigateAIState.CHARGING:
                // Accelerate directly toward player at 4× accel
                xtemp = playerX - enemyX;
                ytemp = playerY - enemyY;
                d = Math.sqrt(xtemp * xtemp + ytemp * ytemp);
                if (d > 0.01) {
                    xtemp = (xtemp / d) * FAI_ACCEL * 4;
                    ytemp = (ytemp / d) * FAI_ACCEL * 4;
                } else {
                    xtemp = 0;
                    ytemp = 0;
                }
                this.accel(xtemp, ytemp, now);

                if (now - this.lastTransitionTime > FAI_SIT_TIME / 3) {
                    this.lastTransitionTime += FAI_SIT_TIME / 3;
                    this.aiState = FrigateAIState.RETREATING;
                }
                break;

            case FrigateAIState.STRAFING:
                // Hold desired Y, strafe horizontally toward player
                ytemp = this.accelToDesiredY(enemyY);
                if (playerX > enemyX + 32) {
                    xtemp = FAI_ACCEL;
                } else if (playerX < enemyX - 32) {
                    xtemp = -FAI_ACCEL;
                } else if (Math.abs(this.vx) > 0.25) {
                    xtemp = -FAI_ACCEL * Math.sign(this.vx);
                } else {
                    xtemp = 0;
                }
                this.accel(xtemp, ytemp, now);

                if (now - this.lastTransitionTime > FAI_SIT_TIME) {
                    this.lastTransitionTime = now;
                    // C++ always goes to CHARGING here (rand()%2 == 0 ? CHARGING : CHARGING)
                    this.aiState = FrigateAIState.CHARGING;
                }
                break;

            case FrigateAIState.RETREATING:
                // Hold desired Y, retreat to center (x=300-360)
                ytemp = this.accelToDesiredY(enemyY);
                if (enemyX > 360) {
                    xtemp = -FAI_ACCEL;
                } else if (enemyX < 300) {
                    xtemp = FAI_ACCEL;
                } else if (Math.abs(this.vx) > 0.25) {
                    xtemp = -FAI_ACCEL * Math.sign(this.vx);
                } else {
                    xtemp = 0;
                }
                this.accel(xtemp * 2, ytemp * 2, now);

                if (now - this.lastTransitionTime > FAI_SIT_TIME) {
                    this.lastTransitionTime += FAI_SIT_TIME;
                    this.aiState = Math.random() < 0.5 ? FrigateAIState.CHARGING : FrigateAIState.STRAFING;
                }
                break;

            case FrigateAIState.RUNAWAY:
                this.accel(0, FAI_ACCEL * 2, now);
                bRunAway = true;
                bFire = false;
                break;
        }

        return { fire: bFire, runAway: bRunAway };
    }

    // ---------------------------------------------------------------
    // Core update
    // ---------------------------------------------------------------

    update(dt: number, playerX: number, playerY: number, now: number): void {
        if (!this.alive) return;

        this._compRectsDirty = true;
        this.pendingProjectiles = [];
        this.pendingFireSounds = [];
        this.updateDamageableFlags();

        // Run FrigateAI state machine
        const aiResult = this.runAI(playerX, playerY, now);
        this.isRunningAway = aiResult.runAway;

        // Apply velocity with jitter correction (C++ sub-pixel accumulation)
        let outputVx: number, outputVy: number;
        this.xerr += this.vx - Math.floor(this.vx);
        if (this.xerr > 1) {
            this.xerr -= 1;
            outputVx = Math.ceil(this.vx);
        } else {
            outputVx = Math.floor(this.vx);
        }
        this.yerr += this.vy - Math.floor(this.vy);
        if (this.yerr > 1) {
            this.yerr -= 1;
            outputVy = Math.ceil(this.vy);
        } else {
            outputVy = Math.floor(this.vy);
        }

        // Move with VELOCITY_DIVISOR scaling (matches C++ show())
        const moveScale = dt * 1000 / VELOCITY_DIVISOR;
        this.x += outputVx * moveScale;
        this.y += outputVy * moveScale;

        // Update turrets (NORMAL TurretAI)
        if (this.rightTurret.alive) {
            const rt = this.updateTurretAI(this.rightTurret, playerX, playerY, now);
            this.rightTurret.turretFrame = rt.frame;
            if (rt.fire) this.fireTurret(this.rightTurret, -31, 53);
        }
        if (this.leftTurret.alive) {
            const lt = this.updateTurretAI(this.leftTurret, playerX, playerY, now);
            this.leftTurret.turretFrame = lt.frame;
            if (lt.fire) this.fireTurret(this.leftTurret, 95, 53);
        }

        // Nose cannon fires when AI says fire
        if (aiResult.fire) {
            this.fireNose();
        }

        // Check alive: body HP <= 0 means defeat
        if (this.body.armor <= 0) {
            this.body.alive = false;
            this.alive = false;
            this.justDied = true;
        }

        // Remove if running away and off-screen
        if (this.isRunningAway && this.y > PLAY_AREA_H) {
            this.alive = false;
        }
    }

    /** Return projectiles generated during the last update. */
    getProjectiles(): Projectile[] {
        return this.pendingProjectiles;
    }

    /** Return fire sounds generated during the last update. */
    getFireSounds(): { sound: string; volume: number }[] {
        return this.pendingFireSounds;
    }

    // ---------------------------------------------------------------
    // Damage
    // ---------------------------------------------------------------

    takeDamage(hitX: number, hitY: number, damage: number): FrigateComponent | null {
        this.updateDamageableFlags();

        let best: FrigateComponent | null = null;
        let bestDist = Infinity;

        for (const comp of this.allComponents()) {
            if (!comp.alive || !comp.damageable) continue;

            const cx = this.x + comp.offsetX;
            const cy = this.y + comp.offsetY;

            if (hitX >= cx && hitX <= cx + comp.width &&
                hitY >= cy && hitY <= cy + comp.height) {
                const dist = Math.abs(hitX - (cx + comp.width / 2)) +
                             Math.abs(hitY - (cy + comp.height / 2));
                if (dist < bestDist) {
                    bestDist = dist;
                    best = comp;
                }
            }
        }

        if (!best) return null;

        const wasAlive = best.alive;
        best.armor -= damage;
        if (best.armor <= 0) {
            best.armor = 0;
            best.alive = false;
        }

        // C++ ShipComponent::destroy_ship() — explosion + sound on component death
        if (wasAlive && !best.alive) {
            const cx = this.x + best.offsetX + best.width / 2;
            const cy = this.y + best.offsetY + best.height / 2;
            this.pendingComponentDestructions.push({ x: cx, y: cy });
        }

        this.updateDamageableFlags();
        return best;
    }

    // ---------------------------------------------------------------
    // Collision
    // ---------------------------------------------------------------

    getComponentRects(): Array<{ component: FrigateComponent; rect: Rect; collider: Collider }> {
        this.updateDamageableFlags();
        if (!this._compRectsDirty) return this._compRectsCache;
        this._compRectsDirty = false;

        const results = this._compRectsCache;
        results.length = 0;
        for (const comp of this.allComponents()) {
            if (!comp.alive) continue;
            const cx = this.x + comp.offsetX;
            const cy = this.y + comp.offsetY;
            // Use per-frame mask for turrets (they rotate), static mask for others
            let mask = comp.mask;
            const turret = comp as FrigateTurret;
            if (turret.turretMasks && turret.turretMasks.length > 0) {
                const fi = turret.turretFrame % Math.min(32, turret.turretMasks.length);
                mask = turret.turretMasks[fi] ?? mask;
            }
            results.push({
                component: comp,
                rect: { x: cx, y: cy, w: comp.width, h: comp.height },
                collider: { x: cx, y: cy, w: comp.width, h: comp.height, mask },
            });
        }
        return results;
    }

    isAlive(): boolean {
        return this.alive;
    }

    getCenter(): { x: number; y: number } {
        return { x: this.x + BODY_WIDTH / 2, y: this.y + BODY_HEIGHT / 2 };
    }

    /** Return homing-targetable positions with priority (1=weapon, 2=passive). */
    getHomingTargets(): { x: number; y: number; priority: number }[] {
        const targets: { x: number; y: number; priority: number }[] = [];
        this.appendHomingTargets(targets);
        return targets;
    }

    /** Append homing targets directly into caller's array (avoids intermediate allocation). */
    appendHomingTargets(targets: { x: number; y: number; priority: number }[]): void {
        const add = (c: FrigateComponent, pri: number) => {
            if (c.alive && c.damageable) {
                targets.push({
                    x: this.x + c.offsetX + c.width / 2,
                    y: this.y + c.offsetY + c.height / 2,
                    priority: pri,
                });
            }
        };
        // Priority 1: turrets (weapons)
        add(this.rightTurret, 1);
        add(this.leftTurret, 1);
        // Priority 2: structural
        add(this.rightWing, 2);
        add(this.leftWing, 2);
        add(this.nose, 2);
        add(this.body, 2);
    }

    /**
     * Get explosion points for death sequence (from C++ Frigate::destroy_ship()).
     * Returns 8 explosion positions relative to world coordinates.
     */
    getExplosionPoints(): Array<{ x: number; y: number }> {
        return [
            { x: this.x + 20,  y: this.y + 18 },
            { x: this.x + 77,  y: this.y + 18 },
            { x: this.x + 45,  y: this.y + 45 },
            { x: this.x + 48,  y: this.y + 8 },   // width/2 ≈ 48
            { x: this.x + 47,  y: this.y + 91 },
            { x: this.x + 46,  y: this.y + 142 },
            { x: this.x + 46,  y: this.y + 110 },
            { x: this.x - 20,  y: this.y + 50 },
        ];
    }

    // ---------------------------------------------------------------
    // Rendering
    // ---------------------------------------------------------------

    render(ctx: CanvasRenderingContext2D): void {
        if (!this.alive) return;

        // Draw order: wings behind body, body, nose, turrets on top
        this.drawSprite(ctx, this.rightWing, '#666');
        this.drawSprite(ctx, this.leftWing,  '#666');
        this.drawSprite(ctx, this.body, '#555');
        this.drawSprite(ctx, this.nose, '#777');
        this.drawTurret(ctx, this.rightTurret);
        this.drawTurret(ctx, this.leftTurret);
    }

    private drawSprite(
        ctx: CanvasRenderingContext2D,
        comp: FrigateComponent,
        fallback: string,
    ): void {
        const wx = this.x + comp.offsetX;
        const wy = this.y + comp.offsetY;

        if (!comp.alive && comp.destroyedSprite) {
            ctx.drawImage(comp.destroyedSprite, wx, wy);
        } else if (!comp.alive) {
            // Don't draw a rectangle for destroyed components
            return;
        } else if (comp.sprite) {
            ctx.drawImage(comp.sprite, wx, wy);
        } else {
            ctx.fillStyle = fallback;
            ctx.fillRect(wx, wy, comp.width, comp.height);
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 1;
            ctx.strokeRect(wx, wy, comp.width, comp.height);
        }
    }

    private drawTurret(ctx: CanvasRenderingContext2D, turret: FrigateTurret): void {
        const wx = this.x + turret.offsetX;
        const wy = this.y + turret.offsetY;

        if (!turret.alive) {
            if (turret.destroyedSprite) {
                ctx.drawImage(turret.destroyedSprite, wx, wy);
            }
            return;
        }

        // Draw turret at current frame
        if (turret.turretSprites.length > 0) {
            const frameIdx = turret.turretFrame % Math.min(32, turret.turretSprites.length);
            ctx.drawImage(turret.turretSprites[frameIdx], wx, wy);
        } else {
            // Fallback: circle + barrel
            const cx = wx + turret.width / 2;
            const cy = wy + turret.height / 2;
            ctx.fillStyle = '#a44';
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.fill();
            // Draw barrel in turret frame direction
            const rad = ((turret.turretFrame - 8) / 32) * 2 * Math.PI;
            const barrelX = Math.cos(rad) * 20;
            const barrelY = Math.sin(rad) * -20;
            ctx.strokeStyle = '#f88';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + barrelX, cy + barrelY);
            ctx.stroke();
        }
    }
}
