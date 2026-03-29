/**
 * Player ship — keyboard-controlled movement, 5 weapon slots, power management.
 * Speeds are in px/frame, applied once per fixed 60 fps tick.
 */

import { Input, Sprite, AssetLoader } from '../engine';
import {
    PLAYER_SHIP, PLAYER_START, PLAYER_WEAPON_SLOTS, WEAPONS,
    POWER_MULTIPLIERS, SHIELD_REGEN_INTERVAL, SHIELD_REGEN_DELAY,
    VELOCITY_DIVISOR,
} from '../data/ships';
import { Rect, clampToPlayArea } from './Collision';
import { Weapon } from './Weapon';
import { Projectile } from './Projectile';
import { PowerPlant } from './PowerPlant';

export class Player {
    x: number;
    y: number;
    armor: number;
    maxArmor: number;
    shields: number;
    maxShields: number;
    speed: number;
    sprite: Sprite | null = null;
    weapons: Weapon[];
    powerPlant: PowerPlant;
    alive = true;
    kills = 0;
    godMode = false;

    private lastHitTime = 0;
    private lastRegenTime = 0;
    private lastFireAll = 0;         // unified 150ms fire gate (C++ PlayerShip.cpp)
    private spriteFrame = 8;
    private shieldTexture: HTMLImageElement | null = null;

    constructor() {
        this.x = PLAYER_START.x;
        this.y = PLAYER_START.y;
        this.armor = PLAYER_SHIP.armor;
        this.maxArmor = PLAYER_SHIP.armor;
        this.shields = PLAYER_SHIP.shields;
        this.maxShields = PLAYER_SHIP.shields;
        this.speed = PLAYER_SHIP.speed;
        this.weapons = PLAYER_WEAPON_SLOTS.map(
            slot => new Weapon(slot.type, WEAPONS[slot.type], slot.offsetX, slot.offsetY, slot.defaultAngle),
        );
        this.powerPlant = new PowerPlant();
    }

    /** Reset combat state for a new level, preserving PowerPlant upgrades */
    resetForLevel(): void {
        this.x = PLAYER_START.x;
        this.y = PLAYER_START.y;
        this.armor = this.maxArmor;
        this.shields = this.maxShields;
        this.alive = true;
        this.lastHitTime = 0;
        this.lastRegenTime = 0;
        this.spriteFrame = 8;
        // Reset weapon fire timers
        for (const w of this.weapons) {
            w.lastFired = 0;
        }
    }

    getRect(): Rect {
        const w = this.sprite ? this.sprite.width : 48;
        const h = this.sprite ? this.sprite.height : 48;
        return { x: this.x, y: this.y, w, h };
    }

    update(dt: number, input: Input, now: number): void {
        if (!this.alive) return;

        // Power setting switches
        if (input.isKeyPressed(Input.KEY_Q)) this.powerPlant.selectSetting(0);
        if (input.isKeyPressed(Input.KEY_W)) this.powerPlant.selectSetting(1);
        if (input.isKeyPressed(Input.KEY_E)) this.powerPlant.selectSetting(2);

        // Movement — base speed + engine bonus, px/frame
        const currentSpeed = this.speed + this.powerPlant.getEngineSpeedBonus();

        let mx = 0;
        let my = 0;
        if (input.isKeyDown(Input.LEFT)) mx -= 1;
        if (input.isKeyDown(Input.RIGHT)) mx += 1;
        if (input.isKeyDown(Input.UP)) my -= 1;
        if (input.isKeyDown(Input.DOWN)) my += 1;

        // Normalize diagonal movement
        if (mx !== 0 && my !== 0) {
            const inv = 1 / Math.SQRT2;
            mx *= inv;
            my *= inv;
        }

        const moveScale = dt * 1000 / VELOCITY_DIVISOR;
        this.x += mx * currentSpeed * moveScale;
        this.y += my * currentSpeed * moveScale;

        // Clamp to play area
        const w = this.sprite ? this.sprite.width : 48;
        const h = this.sprite ? this.sprite.height : 48;
        const clamped = clampToPlayArea(this.x, this.y, w, h);
        this.x = clamped.x;
        this.y = clamped.y;

        // Sprite frame: moving right → frame decreases (toward 0), left → increases (toward 16)
        // Matches original C++ PlayerShip.cpp: hori_axis>0 → curr_frame--, hori_axis<0 → curr_frame++
        if (mx > 0) {
            if (this.spriteFrame > 0) this.spriteFrame--;
        } else if (mx < 0) {
            if (this.spriteFrame < 16) this.spriteFrame++;
        } else {
            if (this.spriteFrame < 8) this.spriteFrame++;
            else if (this.spriteFrame > 8) this.spriteFrame--;
        }
        if (this.sprite) {
            this.sprite.currentFrame = this.spriteFrame;
        }

        // Shield regeneration — timer-based, every 150 ms, after 2 s damage delay
        if (now - this.lastHitTime > SHIELD_REGEN_DELAY && this.shields < this.maxShields) {
            if (now - this.lastRegenTime >= SHIELD_REGEN_INTERVAL) {
                this.lastRegenTime = now;
                const regenAmount = this.powerPlant.getShieldRegenMultiplier();
                this.shields = Math.min(this.maxShields, this.shields + regenAmount);
            }
        }
    }

    /** Fire all weapons if Space is held. Returns new projectiles.
     * C++ uses a unified 150ms gate: all weapons are attempted every 150ms,
     * then each weapon applies its own per-weapon rate (blaster 100ms, turret 250ms, missile 1000ms).
     * The 150ms gate effectively caps the blaster to 150ms minimum between shots. */
    tryFire(input: Input, now: number, assets: AssetLoader | null): Projectile[] {
        if (!this.alive || !input.isKeyDown(Input.SPACE)) return [];

        // Unified 150ms fire gate (C++ PlayerShip.cpp line 60)
        if (now - this.lastFireAll < 150) return [];
        this.lastFireAll = now;

        const projectiles: Projectile[] = [];
        const s = this.powerPlant.getSetting();

        // C++: damage multiplier = get_power_MUX(WEAPON_POWER) based on cell2
        // C++: fire rate divisor = get_power_MUX(WEAPON_RATE) based on cell1
        // C++: sprite frame = power_cell_2 - 1
        const cell1Values = [
            s.blasterCell1,
            s.leftTurretCell1,
            s.rightTurretCell1,
            s.leftMissileCell1,
            s.rightMissileCell1,
        ];
        const cell2Values = [
            s.blasterCell2,
            s.leftTurretCell2,
            s.rightTurretCell2,
            s.leftMissileCell2,
            s.rightMissileCell2,
        ];

        // Apply turret angles from customization settings
        this.weapons[1].angle = s.leftTurretAngle;
        this.weapons[2].angle = s.rightTurretAngle;

        for (let i = 0; i < this.weapons.length; i++) {
            const weapon = this.weapons[i];
            weapon.powerCell1 = cell1Values[i];
            weapon.powerCell2 = cell2Values[i];
            const proj = weapon.fire(this.x, this.y, now, assets);
            if (proj) projectiles.push(proj);
        }

        return projectiles;
    }

    takeDamage(amount: number, now: number): void {
        if (this.godMode) return;
        this.lastHitTime = now;

        if (this.shields > 0) {
            const absorbed = Math.min(this.shields, amount);
            this.shields -= absorbed;
            amount -= absorbed;
        }
        this.armor -= amount;
        if (this.armor <= 0) {
            this.armor = 0;
            this.alive = false;
        }
    }

    /** Load 17 sprite frames (PlayerSprite00–PlayerSprite16) */
    loadSprite(assets: AssetLoader): void {
        try {
            const frames: HTMLImageElement[] = [];
            for (let i = 0; i < 17; i++) {
                const id = `PlayerSprite${i.toString().padStart(2, '0')}`;
                frames.push(assets.getImage(id));
            }
            this.sprite = new Sprite(frames, 100);
            this.sprite.currentFrame = 8;
        } catch {
            // Sprite frames not available
        }
        try { this.shieldTexture = assets.getImage('Shield'); } catch { /* not available */ }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (!this.alive) return;

        // Draw sprite first, then shield on top (additive-style)
        if (this.sprite) {
            this.sprite.drawAt(ctx, this.x, this.y);
        } else {
            ctx.fillStyle = '#0f0';
            ctx.fillRect(this.x, this.y, 48, 48);
        }

        // Shield bubble — Shield.png texture with additive blending
        // C++: glColor4f(0.3, 0.6, 0.9, shields/300), GL_SRC_ALPHA/GL_ONE
        // Center at (x+38, y+24), quad ±64.5×±44.5 = 129×89px
        if (this.shields > 0) {
            const cx = this.x + 38;
            const cy = this.y + 24;
            const hw = 64.5, hh = 44.5;
            const shieldAlpha = Math.min(1.0, this.shields / this.maxShields);

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = shieldAlpha;

            if (this.shieldTexture) {
                // Shield.png is black bg + white ring. Multiply-tint to blue,
                // then additive blend makes black invisible and ring glow blue.
                if (!Player._shieldCanvas) {
                    Player._shieldCanvas = document.createElement('canvas');
                    Player._shieldCanvas.width = 129;
                    Player._shieldCanvas.height = 89;
                }
                const sc = Player._shieldCanvas.getContext('2d')!;
                sc.clearRect(0, 0, 129, 89);
                sc.drawImage(this.shieldTexture, 0, 0, 129, 89);
                sc.globalCompositeOperation = 'multiply';
                sc.fillStyle = 'rgb(77,153,230)';
                sc.fillRect(0, 0, 129, 89);
                sc.globalCompositeOperation = 'source-over';
                ctx.drawImage(Player._shieldCanvas, cx - hw, cy - hh);
            } else {
                ctx.fillStyle = `rgba(77,153,230,0.5)`;
                ctx.beginPath();
                ctx.ellipse(cx, cy, hw, hh, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    private static _shieldCanvas: HTMLCanvasElement | null = null;

    /** Emit engine flame particles. Call from GameManager each frame.
     * C++: make_engine(x+38, y+47, intensity=0.4)
     * Particle.bmp textured 33×33 quad, additive blending
     * Angle: 175+rand(10)°, Speed: ~0 (rnd()/20), Color: R=1.0, G/B=rand(0-2)
     * Fade: 0.003-0.103 per frame → 0.18-6.18 per second
     * Life starts at intensity (0.4), NOT 1.0 */
    emitEngineFlame(particles: import('../engine').ParticleSystem): void {
        if (!this.alive) return;
        const tempVal = Math.random() * 2; // C++ allows > 1.0 — additive blend handles overbright
        const angleDeg = 175 + Math.random() * 10; // ~downward with slight spread
        const angleRad = (angleDeg * Math.PI) / 180;
        const fadePerSec = 2.5 + Math.random() * 3.0; // 2.5-5.5/s → lifetime 0.07-0.16s
        particles.emit(this.x + 38, this.y + 47, 1, {
            color: { r: 1.0, g: tempVal, b: tempVal },
            speed: 80 + Math.random() * 60,  // 80-140 px/s — blasts out the back
            life: 0.4,   // C++ intensity = 0.4f (max alpha)
            fade: fadePerSec,
            direction: angleRad,
            spread: 0,
        });
    }
}
