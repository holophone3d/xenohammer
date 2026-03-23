/**
 * GameManager — main game state machine and orchestrator.
 */

import { GameCanvas, Input, AudioManager, AssetLoader, ParticleSystem, SoundInstance } from '../engine';
import { LEVELS } from '../data/levels';
import { ENEMY_SCORES, RANKINGS } from '../data/ships';
import { rectsOverlap, PLAY_AREA_W, PLAY_AREA_H } from './Collision';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';
import { StarField } from './StarField';
import { HUD } from './HUD';
import { WaveManager } from './Wave';
import { CapitalShip } from './CapitalShip';
import { Boss, BossState } from './Boss';
import { Explosion, ChainExplosion } from './Explosion';
import { PowerUp } from './PowerUp';

export enum GameState {
    Loading,
    StartScreen,
    ReadyRoom,
    Playing,
    LevelComplete,
    GameOver,
    Victory,
    OptionsMenu,
    BriefingSubmenu,
    Backstory,
    LevelBriefing,
    ShipSpecs,
    DifficultyScreen,
    ShipCustomization,
}

export class GameManager {
    state: GameState = GameState.Loading;
    canvas: GameCanvas;
    input: Input;
    audio: AudioManager;
    assets: AssetLoader;
    particles: ParticleSystem;

    level = 0;
    difficulty = 1;
    score = 0;

    player: Player | null = null;
    enemies: Enemy[] = [];
    projectiles: Projectile[] = [];
    capitalShips: CapitalShip[] = [];
    boss: Boss | null = null;
    gameExplosions: Explosion[] = [];
    gamePowerUps: PowerUp[] = [];

    private starField: StarField;
    private hud: HUD;
    private waveManager: WaveManager;
    private stateTimer = 0;
    private now = 0;
    private started = false;
    private levelBriefed = 0;
    private musicPlaying = '';
    private engineSound: SoundInstance | null = null;
    private smallExpFrames: HTMLImageElement[] = [];
    private bigExpFrames: HTMLImageElement[] = [];
    private levelAnimFrames: HTMLImageElement[][] = []; // per-level animation frames
    private briefingScrollY = 0;
    private briefingScrollStart = 0;
    private menuHoverIndex = -1;  // tracks which menu button is hovered
    private optionsSaveTooltip = '';  // tooltip for save/load feedback
    private optionsSaveTooltipTimer = 0;
    private custSelectedSystem: number = -1; // -1=none, 0=noseBlaster, 1=leftTurret, 2=rightTurret, 3=leftMissile, 4=rightMissile, 5=engine
    private custHoverSystem: number = -1;
    private custStatusMsg = '';
    private custStatusTimer = 0;

    constructor(canvasId: string) {
        this.canvas = new GameCanvas(canvasId);
        this.input = new Input(this.canvas.canvas);
        this.audio = new AudioManager();
        this.assets = new AssetLoader();
        this.particles = new ParticleSystem(500);
        this.starField = new StarField();
        this.hud = new HUD();
        this.waveManager = new WaveManager();
    }

    async init(): Promise<void> {
        this.state = GameState.Loading;

        // Load manifest (all graphics)
        try {
            await this.assets.loadManifest('/assets/manifest.json', '/assets');
        } catch (e) {
            console.warn('Failed to load manifest, continuing without assets:', e);
        }

        // Load sounds
        const soundFiles = [
            ['Space', 'sounds/Space.wav'],
            ['PlayerGun1', 'sounds/PlayerGun1.wav'],
            ['PlayerGun2', 'sounds/PlayerGun2.wav'],
            ['newFire', 'sounds/newFire.wav'],
            ['AlienWeapon1', 'sounds/AlienWeapon1.wav'],
            ['AlienWeapon5', 'sounds/AlienWeapon5.wav'],
            ['ExploMini1', 'sounds/ExploMini1.wav'],
            ['CoinCollected', 'sounds/CoinCollected.wav'],
            ['ShipEngine', 'sounds/ShipEngine.wav'],
            ['MenuChange', 'sounds/MenuChange.wav'],
            ['MenuSelect', 'sounds/MenuSelect.wav'],
        ];
        for (const [id, path] of soundFiles) {
            try { await this.audio.loadSound(id, `/assets/${path}`); } catch { /* skip */ }
        }

        // Load music tracks (original only uses Level2.ogg + bossTEST.ogg)
        const musicFiles = [
            ['Level2', 'sounds/Level2.ogg'],
            ['bossTEST', 'sounds/bossTEST.ogg'],
        ];
        for (const [id, path] of musicFiles) {
            try { await this.audio.loadMusic(id, `/assets/${path}`); } catch { /* skip */ }
        }
        // BossNear1 is a sound effect, not music
        try { await this.audio.loadSound('BossNear1', '/assets/sounds/BossNear1.wav'); } catch { /* skip */ }

        // Cache explosion frames
        this.smallExpFrames = Explosion.loadFrames(this.assets, 'small');
        this.bigExpFrames = Explosion.loadFrames(this.assets, 'big');

        // Cache level intro animation frames
        this.loadLevelAnimFrames();

        // Load HUD and starfield sprites
        this.hud.loadSprites(this.assets);
        this.starField.loadSprites(this.assets);

        // Create player early so customization screen can access PowerPlant
        this.player = new Player();
        this.player.loadSprite(this.assets);

        this.state = GameState.StartScreen;
    }

    /** Load pre-rendered level intro animation frames (level_anim_1–8 etc.) */
    private loadLevelAnimFrames(): void {
        // Level 1: level_anim_1 through level_anim_8
        const l1: HTMLImageElement[] = [];
        for (let i = 1; i <= 8; i++) {
            try { l1.push(this.assets.getImage(`level_anim_${i}`)); } catch { break; }
        }
        // Level 2: level_anim_1 through level_anim_7 + level_anim_2_start
        const l2: HTMLImageElement[] = [];
        for (let i = 1; i <= 7; i++) {
            try { l2.push(this.assets.getImage(`level_anim_${i}`)); } catch { break; }
        }
        try { l2.push(this.assets.getImage('level_anim_2_start')); } catch { /* skip */ }
        // Level 3: level_anim_1 through level_anim_7 + level_anim_3_start
        const l3: HTMLImageElement[] = [];
        for (let i = 1; i <= 7; i++) {
            try { l3.push(this.assets.getImage(`level_anim_${i}`)); } catch { break; }
        }
        try { l3.push(this.assets.getImage('level_anim_3_start')); } catch { /* skip */ }
        this.levelAnimFrames = [l1, l2, l3];
    }

    update(dt: number): void {
        dt = Math.min(dt, 0.1);
        this.now = performance.now();

        switch (this.state) {
            case GameState.Loading:
                break;
            case GameState.StartScreen:
                this.updateStartScreen();
                break;
            case GameState.ReadyRoom:
                this.updateReadyRoom();
                break;
            case GameState.Playing:
                this.updatePlaying(dt);
                break;
            case GameState.LevelComplete:
                this.updateLevelComplete(dt);
                break;
            case GameState.GameOver:
                this.updateGameOver(dt);
                break;
            case GameState.Victory:
                this.updateVictory();
                break;
            case GameState.OptionsMenu:
                this.updateOptionsMenu();
                break;
            case GameState.BriefingSubmenu:
                this.updateBriefingSubmenu();
                break;
            case GameState.Backstory:
                this.updateBackstory();
                break;
            case GameState.LevelBriefing:
                this.updateLevelBriefingScreen();
                break;
            case GameState.ShipSpecs:
                this.updateShipSpecs();
                break;
            case GameState.DifficultyScreen:
                this.updateDifficultyScreen();
                break;
            case GameState.ShipCustomization:
                this.updateShipCustomization();
                break;
        }

        this.input.endFrame();
    }

    render(): void {
        this.canvas.clear();

        switch (this.state) {
            case GameState.Loading:
                this.renderLoading();
                break;
            case GameState.StartScreen:
                this.renderStartScreen();
                break;
            case GameState.ReadyRoom:
                this.renderReadyRoom();
                break;
            case GameState.Playing:
                this.renderPlaying();
                break;
            case GameState.LevelComplete:
                this.renderLevelComplete();
                break;
            case GameState.GameOver:
                this.renderGameOver();
                break;
            case GameState.Victory:
                this.renderVictory();
                break;
            case GameState.OptionsMenu:
                this.renderOptionsMenu();
                break;
            case GameState.BriefingSubmenu:
                this.renderBriefingSubmenu();
                break;
            case GameState.Backstory:
                this.renderBackstory();
                break;
            case GameState.LevelBriefing:
                this.renderLevelBriefingScreen();
                break;
            case GameState.ShipSpecs:
                this.renderShipSpecs();
                break;
            case GameState.DifficultyScreen:
                this.renderDifficultyScreen();
                break;
            case GameState.ShipCustomization:
                this.renderShipCustomization();
                break;
        }
    }

    // ========== State: Loading ==========

    private renderLoading(): void {
        const ctx = this.canvas.ctx;
        ctx.fillStyle = '#0f0';
        ctx.font = '24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('XENOHAMMER Loading...', 400, 300);
        const progress = this.assets.getProgress();
        ctx.fillStyle = '#333';
        ctx.fillRect(250, 330, 300, 20);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(250, 330, 300 * progress, 20);
        ctx.textAlign = 'left';
    }

    // ========== State: StartScreen ==========

    private updateStartScreen(): void {
        if (this.started) {
            this.state = GameState.ReadyRoom;
            return;
        }
        if (this.input.isMousePressed() ||
            this.input.isKeyPressed(Input.SPACE) ||
            this.input.isKeyPressed(Input.ENTER)) {
            try { this.audio.playSound('Space', true); } catch { /* skip */ }
            this.started = true;
            this.state = GameState.ReadyRoom;
        }
    }

    private renderStartScreen(): void {
        const ctx = this.canvas.ctx;
        const splash = this.assets.tryGetImage('XenoStart');
        if (splash) {
            ctx.drawImage(splash, 0, 0, 800, 600);
        } else {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 800, 600);
            ctx.fillStyle = '#0f0';
            ctx.font = '32px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('XENOHAMMER', 400, 280);
        }
        ctx.fillStyle = '#0f0';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Start Game', 400, 580);
        ctx.textAlign = 'left';
    }

    // ========== State: ReadyRoom ==========

    private updateReadyRoom(): void {
        const mouse = this.input.getMousePos();
        const mx = mouse.x;
        const my = mouse.y;

        if (this.input.isMousePressed()) {
            // Left zone: Ship Customization
            if (mx >= 10 && mx <= 218 && my >= 260 && my <= 380) {
                try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
                this.state = GameState.ShipCustomization;
            }
            // Center zone: Briefing & Options
            if (mx >= 200 && mx <= 400 && my >= 185 && my <= 218) {
                try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
                this.state = GameState.OptionsMenu;
            }
            // Right zone: Launch
            if (mx >= 601 && mx <= 800 && my >= 0 && my <= 540) {
                try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
                this.startLevel(this.level);
            }
        }

        // Difficulty selection: 1-4
        if (this.input.isKeyPressed('1')) this.difficulty = 0;
        if (this.input.isKeyPressed('2')) this.difficulty = 1;
        if (this.input.isKeyPressed('3')) this.difficulty = 2;
        if (this.input.isKeyPressed('4')) this.difficulty = 3;
    }

    private renderReadyRoom(): void {
        const ctx = this.canvas.ctx;
        // Background: room_GUI (NOT room_screen overlay — that's only for Options_GUI)
        const bg = this.assets.tryGetImage('room');
        if (bg) {
            ctx.drawImage(bg, 0, 0, 800, 600);
        } else {
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 0, 800, 600);
        }

        const mouse = this.input.getMousePos();
        const mx = mouse.x;
        const my = mouse.y;

        // Determine hover zone
        const inLeft = mx >= 10 && mx <= 218 && my >= 260 && my <= 380;
        const inCenter = mx >= 200 && mx <= 400 && my >= 185 && my <= 218;
        const inRight = mx >= 601 && mx <= 800 && my >= 0 && my <= 540;

        // Zone hover labels (appear on hover)
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        if (inLeft) {
            ctx.fillStyle = '#0f0';
            ctx.fillText('Ship Customization', 114, 340);
        }
        if (inCenter) {
            ctx.fillStyle = '#0f0';
            ctx.fillText('Briefing Area and Options', 300, 206);
        }
        if (inRight) {
            ctx.fillStyle = '#0f0';
            ctx.fillText('Launch', 600, 270);
        }

        // Notification labels
        if (this.levelBriefed <= this.level) {
            ctx.font = '12px monospace';
            ctx.fillStyle = '#0f0';
            ctx.fillText('New Level Briefing Available!', 300, 206 - (inCenter ? 16 : 0));
        }

        // Bottom tooltip bar — black background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 550, 800, 50);

        // Dynamic tooltip text
        ctx.font = '14px monospace';
        ctx.fillStyle = '#0f0';
        ctx.textAlign = 'center';

        let tooltip = 'Click on a screen or the door opening';

        if (inLeft) {
            tooltip = 'Click here to customize your ship.';
        } else if (inCenter) {
            tooltip = 'Click here to See Briefings, Save, Load, or Quit';
        } else if (inRight) {
            if (this.level === 0 && this.levelBriefed < 1) {
                tooltip = 'Recon has new info see the level briefing.';
            } else if (this.level === 0) {
                tooltip = 'Launch into the Outer Earth Sector';
            } else if (this.level === 1 && this.levelBriefed < 2) {
                tooltip = 'Recon has new info see the level briefing.';
            } else if (this.level === 1) {
                tooltip = 'Penetrate the Outer Defense Matrix';
            } else if (this.level === 2 && this.levelBriefed < 3) {
                tooltip = 'Recon has new info see the level briefing.';
            } else if (this.level === 2) {
                tooltip = 'Destroy the Nexus Core';
            } else {
                tooltip = 'You Have Completed the Mission!';
            }
        }

        ctx.fillText(tooltip, 400, 580);
        ctx.textAlign = 'left';
    }

    // ========== State: Playing ==========

    private startLevel(levelIndex: number): void {
        this.level = levelIndex;

        // Reset player combat state but preserve PowerPlant (upgrades/RU persist)
        if (this.player) {
            this.player.resetForLevel();
        } else {
            this.player = new Player();
            this.player.loadSprite(this.assets);
        }
        this.enemies = [];
        this.projectiles = [];
        this.gameExplosions = [];
        this.gamePowerUps = [];
        this.capitalShips = [];
        this.boss = null;
        this.stateTimer = 0;
        this.particles.clear();
        this.waveManager.startLevel(levelIndex);

        // Spawn boss for levels with hasBoss
        const levelDef = LEVELS[levelIndex];
        if (levelDef?.hasBoss) {
            this.boss = new Boss(this.difficulty);
            this.boss.loadSprites(this.assets);
        }

        // Start level music — original uses Level2.ogg for ALL levels
        this.audio.stopMusic();
        try { this.audio.playMusic('Level2', true); this.musicPlaying = 'Level2'; } catch { /* skip */ }

        // Start engine sound at low volume (original used ~10%)
        try {
            this.engineSound = this.audio.playSound('ShipEngine', true);
            this.engineSound.setVolume(0.1);
        } catch { this.engineSound = null; }

        this.state = GameState.Playing;
    }

    private updatePlaying(dt: number): void {
        this.stateTimer += dt;

        // Update starfield
        this.starField.update(dt);

        // Update player
        if (this.player && this.player.alive) {
            this.player.update(dt, this.input, this.now);
            this.player.emitEngineFlame(this.particles);
            const playerProj = this.player.tryFire(this.input, this.now, this.assets);
            this.projectiles.push(...playerProj);
        }

        // Spawn waves
        const newEnemies = this.waveManager.update(dt, this.difficulty);
        for (const enemy of newEnemies) {
            try { enemy.loadSprite(this.assets); } catch { /* skip */ }
            this.enemies.push(enemy);
        }

        // Update enemies
        const playerX = this.player?.x ?? 300;
        const playerY = this.player?.y ?? 300;

        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            enemy.update(dt, playerX, playerY);
            const enemyProj = enemy.tryFire(this.now, this.assets);
            this.projectiles.push(...enemyProj);
        }

        // Update capital ships
        for (const ship of this.capitalShips) {
            if (!ship.isAlive()) continue;
            ship.update(dt, playerX, playerY, this.now);
            const shipProj = ship.getProjectiles();
            this.projectiles.push(...shipProj);
        }

        // Update boss
        if (this.boss && this.boss.alive) {
            const levelTimeMs = this.stateTimer * 1000;
            this.boss.update(dt, playerX, playerY, this.now, levelTimeMs);

            if (this.boss.shouldTriggerMusic() && !this.boss.musicTriggered) {
                this.boss.musicTriggered = true;
                try { this.audio.playSound('BossNear1'); } catch { /* skip */ }
                // Switch to boss music (original: stops Level2, plays bossTEST)
                this.audio.stopMusic();
                try { this.audio.playMusic('bossTEST', true); this.musicPlaying = 'bossTEST'; } catch { /* skip */ }
            }

            const bossProj = this.boss.getProjectiles();
            this.projectiles.push(...bossProj);
        }

        // Update projectiles with homing target finding
        for (const proj of this.projectiles) {
            if (proj.homing && proj.owner === 'player' && this.enemies.length > 0) {
                let nearestDist = Infinity;
                let nearestX = 0;
                let nearestY = 0;
                for (const e of this.enemies) {
                    if (!e.alive) continue;
                    const dx = e.x - proj.x;
                    const dy = e.y - proj.y;
                    const d = dx * dx + dy * dy;
                    if (d < nearestDist) {
                        nearestDist = d;
                        nearestX = e.x;
                        nearestY = e.y;
                    }
                }
                proj.update(dt, nearestX, nearestY);
            } else {
                proj.update(dt);
            }
        }

        // Update explosions
        for (const exp of this.gameExplosions) {
            exp.update(dt);
        }
        this.gameExplosions = this.gameExplosions.filter(e => !e.isFinished());

        // Update power-ups
        for (const pu of this.gamePowerUps) {
            if (pu.active) pu.update(dt);
        }
        this.gamePowerUps = this.gamePowerUps.filter(p => p.active);

        // Update particles
        this.particles.update(dt);

        // Collision detection
        this.checkCollisions();

        // Cleanup dead entities
        this.enemies = this.enemies.filter(e => e.alive);
        this.projectiles = this.projectiles.filter(p => p.alive);

        // Check game over
        if (this.player && !this.player.alive) {
            this.stopGameplaySounds();
            this.state = GameState.GameOver;
            this.stateTimer = 0;
            return;
        }

        // Check level complete
        const levelDef = LEVELS[this.level];
        if (levelDef?.hasBoss) {
            if (this.boss && this.boss.isDefeated()) {
                this.stopGameplaySounds();
                if (this.level >= LEVELS.length - 1) {
                    this.state = GameState.Victory;
                } else {
                    this.state = GameState.LevelComplete;
                }
                this.stateTimer = 0;
            }
        } else {
            if (this.waveManager.isTimeUp()) {
                this.stopGameplaySounds();
                if (this.level >= LEVELS.length - 1) {
                    this.state = GameState.Victory;
                } else {
                    this.state = GameState.LevelComplete;
                }
                this.stateTimer = 0;
            }
        }
    }

    private checkCollisions(): void {
        if (!this.player || !this.player.alive) return;
        const playerRect = this.player.getRect();

        // 1. Enemy projectiles vs player
        for (const proj of this.projectiles) {
            if (!proj.alive || proj.owner !== 'enemy') continue;
            if (rectsOverlap(proj.getRect(), playerRect)) {
                this.player!.takeDamage(proj.damage, this.now);
                proj.alive = false;
                this.particles.emit(proj.x, proj.y, 8, {
                    color: { r: 1, g: 0.3, b: 0.3 }, speed: 40, life: 0.3,
                });
            }
        }

        // 2. Player projectiles vs enemies
        for (const proj of this.projectiles) {
            if (!proj.alive || proj.owner !== 'player') continue;
            for (const enemy of this.enemies) {
                if (!enemy.alive) continue;
                if (rectsOverlap(proj.getRect(), enemy.getRect())) {
                    enemy.takeDamage(proj.damage);
                    proj.alive = false;
                    this.particles.emit(proj.x, proj.y, 6, {
                        color: { r: 1, g: 0.8, b: 0.2 }, speed: 50, life: 0.3,
                    });
                    if (!enemy.alive) this.onEnemyKilled(enemy);
                    break;
                }
            }
        }

        // 3. Player projectiles vs capital ship and boss components
        for (const proj of this.projectiles) {
            if (!proj.alive || proj.owner !== 'player') continue;
            for (const ship of this.capitalShips) {
                if (!ship.isAlive()) continue;
                for (const { component, rect } of ship.getComponentRects()) {
                    if (!component.damageable || !component.alive) continue;
                    if (rectsOverlap(proj.getRect(), rect)) {
                        ship.takeDamage(proj.x, proj.y, proj.damage);
                        proj.alive = false;
                        this.particles.emit(proj.x, proj.y, 6, {
                            color: { r: 1, g: 0.8, b: 0.2 }, speed: 50, life: 0.3,
                        });
                        break;
                    }
                }
            }
            if (proj.alive && this.boss && this.boss.alive) {
                for (const { component, rect } of this.boss.getComponentRects()) {
                    if (!component.damageable || component.destroyed) continue;
                    if (rectsOverlap(proj.getRect(), rect)) {
                        this.boss.takeDamage(proj.x, proj.y, proj.damage);
                        proj.alive = false;
                        this.particles.emit(proj.x, proj.y, 6, {
                            color: { r: 1, g: 0.8, b: 0.2 }, speed: 50, life: 0.3,
                        });
                        break;
                    }
                }
            }
        }

        // 4. Player vs enemies (ram damage)
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            if (rectsOverlap(playerRect, enemy.getRect())) {
                this.player!.takeDamage(20, this.now);
                enemy.takeDamage(50);
                if (!enemy.alive) this.onEnemyKilled(enemy);
            }
        }

        // 5. Player vs power-ups
        for (const pu of this.gamePowerUps) {
            if (!pu.active) continue;
            if (rectsOverlap(playerRect, pu.getRect())) {
                pu.active = false;
                this.applyPowerUp(pu);
                try { this.audio.playSound('CoinCollected'); } catch { /* skip */ }
            }
        }
    }

    private onEnemyKilled(enemy: Enemy): void {
        this.score += ENEMY_SCORES[enemy.type] ?? 100;
        if (this.player) this.player.kills++;

        const frames = enemy.config.explosionType === 'large' ? this.bigExpFrames : this.smallExpFrames;
        this.gameExplosions.push(new Explosion(enemy.x, enemy.y,
            enemy.config.explosionType === 'large' ? 'big' : 'small', frames));

        const count = enemy.config.explosionType === 'large' ? 30 : 15;
        this.particles.emit(enemy.x + 16, enemy.y + 16, count, {
            color: { r: 1, g: 0.6, b: 0.1 }, speed: 100, life: 0.8, fade: 1.5,
        });

        try { this.audio.playSound('ExploMini1'); } catch { /* skip */ }

        const pu = PowerUp.tryDrop(enemy.x, enemy.y, enemy.config.powerUpDropChance, this.assets);
        if (pu) this.gamePowerUps.push(pu);
    }

    private applyPowerUp(pu: PowerUp): void {
        if (!this.player) return;
        const armorRestore = pu.getArmorRestore();
        if (armorRestore > 0) {
            this.player.armor = Math.min(this.player.maxArmor, this.player.armor + armorRestore);
        }
        const shieldRestore = pu.getShieldRestore();
        if (shieldRestore > 0) {
            this.player.shields = Math.min(this.player.maxShields, this.player.shields + shieldRestore);
        }
        const scoreBonus = pu.getScoreBonus();
        if (scoreBonus > 0) {
            this.score += scoreBonus;
        }
    }

    private stopGameplaySounds(): void {
        if (this.engineSound) {
            this.engineSound.stop();
            this.engineSound = null;
        }
        this.audio.stopMusic();
        this.musicPlaying = '';
    }

    private renderPlaying(): void {
        const ctx = this.canvas.ctx;

        // Starfield background
        this.starField.draw(ctx);

        // Clip to play area
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, PLAY_AREA_W, PLAY_AREA_H);
        ctx.clip();

        // Capital ships
        for (const ship of this.capitalShips) {
            ship.render(ctx);
        }

        // Boss
        if (this.boss && this.boss.isVisible()) {
            this.boss.draw(ctx, this.assets);
        }

        // Power-ups
        for (const pu of this.gamePowerUps) {
            if (pu.active) pu.draw(ctx);
        }

        // Enemies
        for (const enemy of this.enemies) {
            if (enemy.alive) enemy.draw(ctx);
        }

        // Player
        if (this.player && this.player.alive) {
            this.player.draw(ctx);
        }

        // Projectiles
        for (const proj of this.projectiles) {
            if (proj.alive) proj.draw(ctx);
        }

        // Explosions
        for (const exp of this.gameExplosions) {
            exp.draw(ctx);
        }

        // Particles
        this.particles.draw(ctx);

        ctx.restore();

        // HUD
        const timeRemaining = Math.max(0,
            this.waveManager.getLevelDuration() - this.waveManager.getLevelTimer());
        this.hud.draw(ctx, this.player, this.score, this.level,
            timeRemaining, this.player?.kills ?? 0);

        // Level start animation overlay — sprite frames at 100ms each, from 600ms to 4000ms
        if (this.stateTimer < 4 && this.stateTimer > 0.6) {
            const frames = this.levelAnimFrames[this.level] ?? [];
            if (frames.length > 0) {
                const elapsed = this.stateTimer - 0.6;
                const frameIndex = Math.min(Math.floor(elapsed / 0.1), frames.length - 1);
                const frame = frames[frameIndex];
                if (frame) {
                    ctx.drawImage(frame, 253, 200);
                }
            } else {
                // Fallback: text-based level title
                ctx.save();
                ctx.textAlign = 'center';
                ctx.font = '28px monospace';
                ctx.fillStyle = '#0f0';
                const alpha = Math.min(1, (this.stateTimer - 0.6) / 0.5);
                ctx.globalAlpha = alpha;
                ctx.fillText(`LEVEL ${this.level + 1}`, PLAY_AREA_W / 2, 280);
                ctx.globalAlpha = 1;
                ctx.textAlign = 'left';
                ctx.restore();
            }
        }

        // Level end text overlay (last 5 seconds)
        const levelDuration = this.waveManager.getLevelDuration();
        const levelTimer = this.waveManager.getLevelTimer();
        if (levelDuration - levelTimer <= 5 && levelDuration - levelTimer > 0) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.font = '24px monospace';
            ctx.fillStyle = '#ff0';
            ctx.fillText(`END OF LEVEL ${this.level + 1}`, PLAY_AREA_W / 2, 300);
            ctx.textAlign = 'left';
            ctx.restore();
        }
    }

    // ========== State: LevelComplete ==========

    private updateLevelComplete(dt: number): void {
        this.stateTimer += dt;
        this.starField.update(dt);
        if (this.stateTimer >= 5) {
            this.level++;
            this.state = GameState.ReadyRoom;
        }
    }

    private renderLevelComplete(): void {
        this.starField.draw(this.canvas.ctx);
        const ctx = this.canvas.ctx;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0f0';
        ctx.font = '28px monospace';
        ctx.fillText(`END OF LEVEL ${this.level + 1}`, 400, 280);
        ctx.fillStyle = '#fff';
        ctx.font = '16px monospace';
        ctx.fillText(`Score: ${this.score}`, 400, 330);
        ctx.textAlign = 'left';
    }

    // ========== State: GameOver ==========

    private updateGameOver(dt: number): void {
        this.stateTimer += dt;
        if (this.stateTimer >= 4) {
            this.score = 0;
            this.level = 0;
            this.state = this.started ? GameState.ReadyRoom : GameState.StartScreen;
        }
    }

    private renderGameOver(): void {
        const ctx = this.canvas.ctx;
        const img = this.assets.tryGetImage('game_over');
        if (img) {
            ctx.drawImage(img, 0, 0, 800, 600);
        } else {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 800, 600);
            ctx.textAlign = 'center';
            ctx.fillStyle = '#f00';
            ctx.font = '32px monospace';
            ctx.fillText('GAME OVER', 400, 280);
            ctx.fillStyle = '#fff';
            ctx.font = '16px monospace';
            ctx.fillText(`Final Score: ${this.score}`, 400, 330);
            ctx.textAlign = 'left';
        }
    }

    // ========== State: Victory ==========

    private updateVictory(): void {
        this.starField.update(1 / 60);
        if (this.input.isKeyPressed(Input.ENTER) || this.input.isKeyPressed(Input.SPACE)) {
            this.score = 0;
            this.level = 0;
            this.state = GameState.ReadyRoom;
        }
    }

    private renderVictory(): void {
        const ctx = this.canvas.ctx;
        const img = this.assets.tryGetImage('aftermath');
        if (img) {
            ctx.drawImage(img, 0, 0, 800, 600);
        } else {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 800, 600);
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd700';
        ctx.font = '32px monospace';
        ctx.fillText('VICTORY!', 400, 120);

        ctx.fillStyle = '#fff';
        ctx.font = '16px monospace';
        ctx.fillText(`Final Score: ${this.score}`, 400, 280);
        if (this.player) {
            ctx.fillText(`Kills: ${this.player.kills}`, 400, 310);
            ctx.fillStyle = '#0f0';
            ctx.fillText(`Rank: ${this.getRank(this.player.kills)}`, 400, 340);
        }

        ctx.fillStyle = '#aaa';
        ctx.font = '14px monospace';
        ctx.fillText('Press ENTER or SPACE to continue', 400, 420);
        ctx.textAlign = 'left';
    }

    private getRank(kills: number): string {
        let rank = RANKINGS[0]?.rank ?? 'PILOT';
        for (const r of RANKINGS) {
            if (kills >= r.minKills) rank = r.rank;
        }
        return rank;
    }

    // ========== Helper: drawMenuButton ==========

    private drawMenuButton(ctx: CanvasRenderingContext2D, text: string, yCenter: number, mouseY: number, mouseX: number): boolean {
        const inButton = mouseX >= 200 && mouseX <= 600 && mouseY >= yCenter - 33 && mouseY <= yCenter;
        ctx.fillStyle = inButton ? 'rgb(70,85,70)' : 'rgb(51,64,51)';
        ctx.fillRect(200, yCenter - 33, 400, 33);
        ctx.fillStyle = '#0f0';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, 400, yCenter - 10);
        ctx.textAlign = 'left';
        return inButton;
    }

    private drawCrtOverlay(ctx: CanvasRenderingContext2D): void {
        const overlay = this.assets.tryGetImage('room_screen');
        if (overlay) {
            ctx.drawImage(overlay, 0, 0, 800, 600);
        } else {
            ctx.fillStyle = '#0a1a0a';
            ctx.fillRect(0, 0, 800, 600);
        }
    }

    private drawMenuTooltipBar(ctx: CanvasRenderingContext2D, text: string): void {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 550, 800, 50);
        ctx.fillStyle = '#0f0';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, 400, 580);
        ctx.textAlign = 'left';
    }

    // ========== State: OptionsMenu ==========

    private updateOptionsMenu(): void {
        if (this.input.isKeyPressed('Escape')) {
            this.state = GameState.ReadyRoom;
            return;
        }

        if (this.optionsSaveTooltipTimer > 0) {
            this.optionsSaveTooltipTimer -= 1 / 60;
            if (this.optionsSaveTooltipTimer <= 0) {
                this.optionsSaveTooltip = '';
            }
        }

        const mouse = this.input.getMousePos();
        const mx = mouse.x;
        const my = mouse.y;

        const buttonYCenters = [100, 175, 250, 325, 400, 475];
        let newHover = -1;
        for (let i = 0; i < buttonYCenters.length; i++) {
            const yc = buttonYCenters[i];
            if (mx >= 200 && mx <= 600 && my >= yc - 33 && my <= yc) {
                newHover = i;
                break;
            }
        }
        if (newHover !== this.menuHoverIndex) {
            this.menuHoverIndex = newHover;
            if (newHover >= 0) {
                try { this.audio.playSound('MenuChange'); } catch { /* skip */ }
            }
        }

        if (this.input.isMousePressed()) {
            if (newHover === 0) {
                try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
                this.state = GameState.BriefingSubmenu;
            } else if (newHover === 1) {
                try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
                this.optionsSaveTooltip = 'Save Done';
                this.optionsSaveTooltipTimer = 2;
            } else if (newHover === 2) {
                try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
                this.optionsSaveTooltip = 'Load Done';
                this.optionsSaveTooltipTimer = 2;
            } else if (newHover === 3) {
                try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
                this.state = GameState.DifficultyScreen;
            } else if (newHover === 4) {
                try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
                this.state = GameState.ReadyRoom;
            } else if (newHover === 5) {
                try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
                // Quit to system — reload page
                window.location.reload();
            }
        }
    }

    private renderOptionsMenu(): void {
        const ctx = this.canvas.ctx;
        this.drawCrtOverlay(ctx);

        const mouse = this.input.getMousePos();
        const mx = mouse.x;
        const my = mouse.y;

        const labels = [
            'Briefing Area',
            'Save Your Game',
            'Load Your Game',
            'Set Difficulty',
            'Quit to the Ready Room',
            'Quit to System',
        ];
        const yCenters = [100, 175, 250, 325, 400, 475];
        const tooltips = [
            'View briefings and ship specifications',
            'Save your current progress',
            'Load a previously saved game',
            'Change the game difficulty setting',
            'Return to the Ready Room',
            'Exit the game',
        ];

        let tooltipText = '';
        for (let i = 0; i < labels.length; i++) {
            const hover = this.drawMenuButton(ctx, labels[i], yCenters[i], my, mx);
            if (hover) tooltipText = tooltips[i];
        }

        if (this.optionsSaveTooltip) {
            tooltipText = this.optionsSaveTooltip;
        }

        this.drawMenuTooltipBar(ctx, tooltipText);
    }

    // ========== State: BriefingSubmenu ==========

    private updateBriefingSubmenu(): void {
        if (this.input.isKeyPressed('Escape')) {
            this.state = GameState.OptionsMenu;
            return;
        }

        const mouse = this.input.getMousePos();
        const mx = mouse.x;
        const my = mouse.y;

        const buttonYCenters = [133, 208, 283, 358, 433];
        let newHover = -1;
        for (let i = 0; i < buttonYCenters.length; i++) {
            const yc = buttonYCenters[i];
            if (mx >= 200 && mx <= 600 && my >= yc - 33 && my <= yc) {
                newHover = i;
                break;
            }
        }
        if (newHover !== this.menuHoverIndex) {
            this.menuHoverIndex = newHover;
            if (newHover >= 0) {
                try { this.audio.playSound('MenuChange'); } catch { /* skip */ }
            }
        }

        if (this.input.isMousePressed()) {
            if (newHover === 0) {
                try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
                this.state = GameState.Backstory;
                this.briefingScrollStart = performance.now();
            } else if (newHover === 1) {
                try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
                this.state = GameState.LevelBriefing;
                this.briefingScrollStart = performance.now();
                this.levelBriefed = this.level + 1;
            } else if (newHover === 2) {
                try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
                this.state = GameState.ShipSpecs;
            } else if (newHover === 3) {
                try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
                this.state = GameState.OptionsMenu;
            } else if (newHover === 4) {
                try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
                this.state = GameState.ReadyRoom;
            }
        }
    }

    private renderBriefingSubmenu(): void {
        const ctx = this.canvas.ctx;
        this.drawCrtOverlay(ctx);

        const mouse = this.input.getMousePos();
        const mx = mouse.x;
        const my = mouse.y;

        const labels = [
            'Back Story',
            'Level Briefing',
            'XenoHammer Ship Specifications',
            'Quit to the Options Screen',
            'Quit to the Ready Room',
        ];
        const yCenters = [133, 208, 283, 358, 433];
        const tooltips = [
            'Read the back story of XenoHammer',
            'View the briefing for the current level',
            'View your ship specifications',
            'Return to the Options screen',
            'Return to the Ready Room',
        ];

        let tooltipText = '';
        for (let i = 0; i < labels.length; i++) {
            const hover = this.drawMenuButton(ctx, labels[i], yCenters[i], my, mx);
            if (hover) tooltipText = tooltips[i];
        }

        this.drawMenuTooltipBar(ctx, tooltipText);
    }

    // ========== State: Backstory ==========

    private updateBackstory(): void {
        if (this.input.isKeyPressed('Escape')) {
            this.state = GameState.BriefingSubmenu;
            return;
        }

        this.starField.update(1 / 60);
        this.briefingScrollY = 475 - ((performance.now() - this.briefingScrollStart) / 60);

        if (this.briefingScrollY <= -550) {
            this.state = GameState.BriefingSubmenu;
            return;
        }

        if (this.input.isMousePressed() && this.briefingScrollY < 0) {
            this.state = GameState.BriefingSubmenu;
        }
    }

    private renderBackstory(): void {
        const ctx = this.canvas.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 800, 600);
        this.starField.draw(ctx, false);

        const img = this.assets.tryGetImage('backstory');
        if (img) {
            ctx.drawImage(img, 0, this.briefingScrollY);
        } else {
            // Fallback text
            ctx.fillStyle = '#0f0';
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Backstory image not available', 400, 300 + this.briefingScrollY);
            ctx.textAlign = 'left';
        }
    }

    // ========== State: LevelBriefing ==========

    private updateLevelBriefingScreen(): void {
        if (this.input.isKeyPressed('Escape')) {
            this.state = GameState.BriefingSubmenu;
            return;
        }

        this.starField.update(1 / 60);
        this.briefingScrollY = 600 - ((performance.now() - this.briefingScrollStart) / 40);

        const endPositions = [-620, -420, -400];
        const endY = endPositions[this.level] ?? -620;

        if (this.briefingScrollY <= endY) {
            this.state = GameState.BriefingSubmenu;
            return;
        }

        if (this.input.isMousePressed() && this.briefingScrollY < 0) {
            this.state = GameState.BriefingSubmenu;
        }
    }

    private renderLevelBriefingScreen(): void {
        const ctx = this.canvas.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 800, 600);
        this.starField.draw(ctx, false);

        const spriteId = `briefing_lvl_${this.level + 1}`;
        const img = this.assets.tryGetImage(spriteId);
        if (img) {
            ctx.drawImage(img, 0, this.briefingScrollY);
        } else {
            ctx.fillStyle = '#0f0';
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`Level ${this.level + 1} Briefing`, 400, 300 + this.briefingScrollY);
            ctx.textAlign = 'left';
        }
    }

    // ========== State: ShipSpecs ==========

    private updateShipSpecs(): void {
        if (this.input.isKeyPressed('Escape')) {
            this.state = GameState.BriefingSubmenu;
            return;
        }

        if (this.input.isMousePressed()) {
            const mouse = this.input.getMousePos();
            if (mouse.x >= 680 && mouse.x <= 800 && mouse.y >= 540 && mouse.y <= 600) {
                try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
                this.state = GameState.BriefingSubmenu;
            }
        }
    }

    private renderShipSpecs(): void {
        const ctx = this.canvas.ctx;
        const img = this.assets.tryGetImage('ship_specs');
        if (img) {
            ctx.drawImage(img, 0, 0, 800, 600);
        } else {
            ctx.fillStyle = '#0a1a0a';
            ctx.fillRect(0, 0, 800, 600);
            ctx.fillStyle = '#0f0';
            ctx.font = '20px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Ship Specifications', 400, 280);
            ctx.font = '14px monospace';
            ctx.fillText('Press ESC to return', 400, 320);
            ctx.textAlign = 'left';
        }

        // Draw "Done" button area
        const mouse = this.input.getMousePos();
        const inDone = mouse.x >= 680 && mouse.x <= 800 && mouse.y >= 540 && mouse.y <= 600;
        ctx.fillStyle = inDone ? 'rgb(70,85,70)' : 'rgb(51,64,51)';
        ctx.fillRect(680, 540, 120, 60);
        ctx.fillStyle = '#0f0';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Done', 740, 575);
        ctx.textAlign = 'left';
    }

    // ========== State: DifficultyScreen ==========

    private updateDifficultyScreen(): void {
        if (this.input.isKeyPressed('Escape')) {
            this.state = GameState.OptionsMenu;
            return;
        }

        const mouse = this.input.getMousePos();
        const mx = mouse.x;
        const my = mouse.y;

        const buttonYCenters = [143, 208, 283, 358, 433];
        let newHover = -1;
        for (let i = 0; i < buttonYCenters.length; i++) {
            const yc = buttonYCenters[i];
            if (mx >= 200 && mx <= 600 && my >= yc - 33 && my <= yc) {
                newHover = i;
                break;
            }
        }
        if (newHover !== this.menuHoverIndex) {
            this.menuHoverIndex = newHover;
            if (newHover >= 0) {
                try { this.audio.playSound('MenuChange'); } catch { /* skip */ }
            }
        }

        if (this.input.isMousePressed()) {
            if (newHover >= 0 && newHover <= 3) {
                try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
                this.difficulty = newHover;
            } else if (newHover === 4) {
                try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
                this.state = GameState.OptionsMenu;
            }
        }
    }

    private renderDifficultyScreen(): void {
        const ctx = this.canvas.ctx;
        this.drawCrtOverlay(ctx);

        const mouse = this.input.getMousePos();
        const mx = mouse.x;
        const my = mouse.y;

        const labels = ['Easy', 'Medium', 'Hard', 'Extremely Hard', 'Done'];
        const yCenters = [143, 208, 283, 358, 433];

        for (let i = 0; i < labels.length; i++) {
            this.drawMenuButton(ctx, labels[i], yCenters[i], my, mx);
        }

        const diffNames = ['Easy', 'Medium', 'Hard', 'Extremely Hard'];
        const currentName = diffNames[this.difficulty] ?? 'Medium';
        this.drawMenuTooltipBar(ctx, `Current Difficulty: ${currentName}`);
    }

    // ========== State: ShipCustomization ==========

    private readonly custSystemZones = [
        { x1: 215, y1: 45,  x2: 290, y2: 110, lx: 250, ly: 63,  name: 'Nose Blaster',       c1: 'blasterCell1'      as const, c2: 'blasterCell2'      as const },
        { x1: 100, y1: 105, x2: 170, y2: 170, lx: 132, ly: 123, name: 'Left Turret',        c1: 'leftTurretCell1'   as const, c2: 'leftTurretCell2'   as const },
        { x1: 340, y1: 105, x2: 410, y2: 170, lx: 372, ly: 123, name: 'Right Turret',       c1: 'rightTurretCell1'  as const, c2: 'rightTurretCell2'  as const },
        { x1: 180, y1: 115, x2: 245, y2: 180, lx: 209, ly: 133, name: 'Left Missile',       c1: 'leftMissileCell1'  as const, c2: 'leftMissileCell2'  as const },
        { x1: 265, y1: 115, x2: 335, y2: 180, lx: 297, ly: 133, name: 'Right Missile',      c1: 'rightMissileCell1' as const, c2: 'rightMissileCell2' as const },
        { x1: 220, y1: 195, x2: 290, y2: 265, lx: 249, ly: 213, name: 'Engine/Power Plant', c1: 'shipPowerCell1'    as const, c2: 'shipPowerCell2'    as const },
    ];

    private updateShipCustomization(): void {
        if (this.input.isKeyPressed('Escape')) {
            this.state = GameState.ReadyRoom;
            return;
        }

        if (this.custStatusTimer > 0) {
            this.custStatusTimer--;
            if (this.custStatusTimer <= 0) {
                this.custStatusMsg = '';
            }
        }

        const mouse = this.input.getMousePos();
        const mx = mouse.x;
        const my = mouse.y;

        // Hover detection over system zones
        let newHover = -1;
        for (let i = 0; i < this.custSystemZones.length; i++) {
            const z = this.custSystemZones[i];
            if (mx >= z.x1 && mx <= z.x2 && my >= z.y1 && my <= z.y2) {
                newHover = i;
                break;
            }
        }
        if (newHover !== this.custHoverSystem) {
            this.custHoverSystem = newHover;
            if (newHover >= 0) {
                try { this.audio.playSound('MenuChange'); } catch { /* skip */ }
            }
        }

        if (!this.input.isMousePressed()) return;
        if (!this.player) return;
        const setting = this.player.powerPlant.getSetting();

        // System zone click
        if (newHover >= 0) {
            try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
            this.custSelectedSystem = newHover;
            return;
        }

        const sel = this.custSelectedSystem;
        if (sel < 0 || sel >= this.custSystemZones.length) {
            // Done button
            if (mx >= 517 && mx <= 800 && my >= 553 && my <= 600) {
                try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
                this.state = GameState.ReadyRoom;
            }
            return;
        }

        const zone = this.custSystemZones[sel];
        const maxCell = this.player.powerPlant.maxPowerPerCell;

        // UP arrow (transfer cell2 → cell1)
        if (mx >= 545 && mx <= 570 && my >= 460 && my <= 485) {
            try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
            if (setting[zone.c1] < maxCell && setting[zone.c2] > 1) {
                setting[zone.c1]++;
                setting[zone.c2]--;
            }
            return;
        }

        // DOWN arrow (transfer cell1 → cell2)
        if (mx >= 545 && mx <= 570 && my >= 500 && my <= 525) {
            try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
            if (setting[zone.c2] < maxCell && setting[zone.c1] > 1) {
                setting[zone.c2]++;
                setting[zone.c1]--;
            }
            return;
        }

        // Buy Power Pod button
        if (mx >= 20 && mx <= 250 && my >= 420 && my <= 450) {
            try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
            if (this.player.powerPlant.resourceUnits < 1) {
                this.custStatusMsg = 'You Have No More Resource Units!';
                this.custStatusTimer = 120;
                return;
            }
            if (setting[zone.c1] < maxCell) {
                setting[zone.c1]++;
                this.player.powerPlant.resourceUnits--;
            } else if (setting[zone.c2] < maxCell) {
                setting[zone.c2]++;
                this.player.powerPlant.resourceUnits--;
            } else {
                this.custStatusMsg = 'Max Number of Power Cells Reached!';
                this.custStatusTimer = 120;
            }
            return;
        }

        // Done button
        if (mx >= 517 && mx <= 800 && my >= 553 && my <= 600) {
            try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
            this.state = GameState.ReadyRoom;
        }
    }

    private renderShipCustomization(): void {
        const ctx = this.canvas.ctx;

        // Background
        const bg = this.assets.tryGetImage('cust_GUI');
        if (bg) {
            ctx.drawImage(bg, 0, 0, 800, 600);
        } else {
            ctx.fillStyle = '#0a1a0a';
            ctx.fillRect(0, 0, 800, 600);

            // Draw ship silhouette in the ship area
            ctx.save();
            ctx.strokeStyle = '#1a3a1a';
            ctx.lineWidth = 1;

            // Ship body outline
            ctx.beginPath();
            ctx.moveTo(252, 50);   // nose tip
            ctx.lineTo(215, 100);  // left shoulder
            ctx.lineTo(100, 140);  // left wing tip
            ctx.lineTo(120, 170);  // left wing back
            ctx.lineTo(200, 155);  // left wing inner
            ctx.lineTo(220, 265);  // left engine
            ctx.lineTo(290, 265);  // right engine
            ctx.lineTo(310, 155);  // right wing inner
            ctx.lineTo(390, 170);  // right wing back
            ctx.lineTo(410, 140);  // right wing tip
            ctx.lineTo(295, 100);  // right shoulder
            ctx.closePath();
            ctx.stroke();

            // Divider line between ship area and info area
            ctx.strokeStyle = '#1a3a1a';
            ctx.beginPath();
            ctx.moveTo(510, 0);
            ctx.lineTo(510, 553);
            ctx.stroke();

            // Horizontal line above Done button
            ctx.beginPath();
            ctx.moveTo(0, 553);
            ctx.lineTo(800, 553);
            ctx.stroke();

            ctx.restore();
        }

        // Draw system zone outlines with labels
        ctx.font = '10px monospace';
        for (let i = 0; i < this.custSystemZones.length; i++) {
            const z = this.custSystemZones[i];
            const isHover = i === this.custHoverSystem;
            const isSelected = i === this.custSelectedSystem;

            // Zone rectangle
            if (isSelected) {
                ctx.strokeStyle = '#0f0';
                ctx.lineWidth = 2;
                ctx.fillStyle = 'rgba(0,255,0,0.08)';
                ctx.fillRect(z.x1, z.y1, z.x2 - z.x1, z.y2 - z.y1);
            } else if (isHover) {
                ctx.strokeStyle = 'rgba(0,255,0,0.6)';
                ctx.lineWidth = 1;
            } else {
                ctx.strokeStyle = 'rgba(0,255,0,0.2)';
                ctx.lineWidth = 1;
            }
            ctx.strokeRect(z.x1, z.y1, z.x2 - z.x1, z.y2 - z.y1);

            // Zone label (inside the box)
            ctx.fillStyle = isSelected ? '#0f0' : 'rgba(0,255,0,0.5)';
            ctx.textAlign = 'center';
            ctx.fillText(z.name, (z.x1 + z.x2) / 2, z.y1 + (z.y2 - z.y1) / 2 + 4);
        }
        ctx.textAlign = 'left';

        // ===== Right panel info =====
        const sel = this.custSelectedSystem;

        if (sel >= 0 && sel < this.custSystemZones.length && this.player) {
            const zone = this.custSystemZones[sel];
            const setting = this.player.powerPlant.getSetting();

            // System name header
            ctx.fillStyle = '#0f0';
            ctx.font = '16px monospace';
            ctx.fillText('System Selected:', 20, 290);
            ctx.fillStyle = '#5f5';
            ctx.fillText(zone.name, 190, 290);

            // Column descriptions
            ctx.fillStyle = '#0a0';
            ctx.font = '12px monospace';
            if (sel <= 4) {
                ctx.fillText('Left column: Shot Rate', 20, 320);
                ctx.fillText('Right column: Shot Power', 20, 340);
            } else {
                ctx.fillText('Left column: Shield Recharge Rate', 20, 320);
                ctx.fillText('Right column: Ship Maneuverability', 20, 340);
            }

            // Power cell visualization (in the right panel area)
            const cellX1 = 540;
            const cellX2 = 610;
            const cellBaseY = 500;
            const c1 = setting[zone.c1];
            const c2 = setting[zone.c2];

            // Column headers
            ctx.fillStyle = '#0a0';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Rate', cellX1 + 7, cellBaseY + 18);
            ctx.fillText('Power', cellX2 + 7, cellBaseY + 18);
            ctx.textAlign = 'left';

            // Draw cell bars
            this.drawPowerCells(ctx, cellX1, cellBaseY, c1);
            this.drawPowerCells(ctx, cellX2, cellBaseY, c2);

            // Empty cell outlines (up to max 5)
            ctx.strokeStyle = 'rgba(0,255,0,0.15)';
            ctx.lineWidth = 1;
            for (let i = c1; i < 5; i++) {
                ctx.strokeRect(cellX1, cellBaseY - (i * 12) - 10, 14, 10);
            }
            for (let i = c2; i < 5; i++) {
                ctx.strokeRect(cellX2, cellBaseY - (i * 12) - 10, 14, 10);
            }

            // Transfer arrows between columns
            const arrowX = (cellX1 + cellX2) / 2 + 7;
            ctx.fillStyle = '#0f0';
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('\u25C0', arrowX, 475);  // ◀ transfer right→left
            ctx.fillText('\u25B6', arrowX, 505);  // ▶ transfer left→right
            ctx.textAlign = 'left';

            // Multiplier info
            const total = Math.min(c1 + c2, 5);
            const mux = this.player.powerPlant.getWeaponMultiplier(c1, c2);
            ctx.fillStyle = '#0a0';
            ctx.font = '11px monospace';
            ctx.fillText(`Total: ${total}/5 cells`, 530, 380);
            ctx.fillText(`Multiplier: ${mux.toFixed(1)}x`, 530, 400);
        } else {
            // No system selected — show instructions
            ctx.fillStyle = '#0a0';
            ctx.font = '14px monospace';
            ctx.fillText('Select a system on the ship', 20, 290);
            ctx.fillText('to view and modify power', 20, 310);
            ctx.fillText('distribution.', 20, 330);
        }

        // Resource Units
        ctx.fillStyle = '#0f0';
        ctx.font = '14px monospace';
        if (this.player) {
            ctx.fillText(`Resource Units: ${this.player.powerPlant.resourceUnits}`, 20, 400);
        }

        // Buy Power Pod button (only when system selected)
        if (sel >= 0) {
            const buyHover = this.input.getMousePos();
            const inBuy = buyHover.x >= 20 && buyHover.x <= 250 && buyHover.y >= 420 && buyHover.y <= 450;
            ctx.fillStyle = inBuy ? 'rgb(70,85,70)' : 'rgb(51,64,51)';
            ctx.fillRect(20, 420, 230, 30);
            ctx.fillStyle = '#0f0';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Buy Power Pod (1 RU)', 135, 440);
            ctx.textAlign = 'left';
        }

        // Status message
        if (this.custStatusMsg) {
            ctx.fillStyle = '#ff0';
            ctx.font = '14px monospace';
            ctx.fillText(this.custStatusMsg, 20, 530);
        }

        // Settings display (right panel, upper)
        if (this.player) {
            ctx.font = '13px monospace';
            ctx.fillStyle = '#0f0';
            ctx.fillText('User Settings', 530, 80);

            const settingIdx = this.player.powerPlant.currentSetting;
            const labels = ['speed setting (Q)', 'power setting (W)', 'armor setting (E)'];
            for (let i = 0; i < 3; i++) {
                ctx.fillStyle = settingIdx === i ? '#0f0' : '#333';
                ctx.fillText(labels[i], 530, 110 + i * 25);
            }
        }

        // Done button
        const dm = this.input.getMousePos();
        const inDone = dm.x >= 517 && dm.x <= 800 && dm.y >= 553 && dm.y <= 600;
        ctx.fillStyle = inDone ? 'rgb(70,85,70)' : 'rgb(51,64,51)';
        ctx.fillRect(517, 553, 283, 47);
        ctx.fillStyle = '#0f0';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Done', 658, 582);
        ctx.textAlign = 'left';
    }

    private drawPowerCells(ctx: CanvasRenderingContext2D, x: number, baseY: number, count: number): void {
        ctx.fillStyle = '#0f0';
        for (let i = 0; i < count; i++) {
            ctx.fillRect(x, baseY - (i * 12) - 10, 14, 10);
        }
    }
}
