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

        // Load music tracks
        const musicFiles = [
            ['start', 'sounds/start.wav'],
            ['Level2', 'sounds/Level2.ogg'],
            ['SMC', 'sounds/SMC.wav'],
            ['BossNear1', 'sounds/BossNear1.wav'],
            ['SMD', 'sounds/SMD.ogg'],
            ['bossTEST', 'sounds/bossTEST.ogg'],
        ];
        for (const [id, path] of musicFiles) {
            try { await this.audio.loadMusic(id, `/assets/${path}`); } catch { /* skip */ }
        }

        // Cache explosion frames
        this.smallExpFrames = Explosion.loadFrames(this.assets, 'small');
        this.bigExpFrames = Explosion.loadFrames(this.assets, 'big');

        // Load HUD and starfield sprites
        this.hud.loadSprites(this.assets);
        this.starField.loadSprites(this.assets);

        this.state = GameState.StartScreen;
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
            }
            // Center zone: Briefing & Options
            if (mx >= 200 && mx <= 400 && my >= 185 && my <= 218) {
                try { this.audio.playSound('MenuSelect'); } catch { /* skip */ }
                this.levelBriefed = this.level + 1;
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
        const bg = this.assets.tryGetImage('room');
        if (bg) {
            ctx.drawImage(bg, 0, 0, 800, 600);
        } else {
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 0, 800, 600);
        }

        const overlay = this.assets.tryGetImage('room_screen');
        if (overlay) {
            ctx.drawImage(overlay, 0, 0);
        }

        const mouse = this.input.getMousePos();
        const mx = mouse.x;
        const my = mouse.y;

        ctx.font = '16px monospace';
        ctx.textAlign = 'center';

        // Left zone highlight
        const inLeft = mx >= 10 && mx <= 218 && my >= 260 && my <= 380;
        ctx.fillStyle = inLeft ? '#0f0' : '#aaa';
        ctx.fillText('Ship Customization', 114, 320);

        // Center zone highlight
        const inCenter = mx >= 200 && mx <= 400 && my >= 185 && my <= 218;
        ctx.fillStyle = inCenter ? '#0f0' : '#aaa';
        ctx.fillText('Briefing & Options', 300, 205);

        // Right zone highlight
        const inRight = mx >= 601 && mx <= 800 && my >= 0 && my <= 540;
        ctx.fillStyle = inRight ? '#0f0' : '#aaa';
        ctx.fillText('Launch', 700, 270);

        // Contextual message
        ctx.font = '14px monospace';
        ctx.fillStyle = '#ff0';
        if (this.level === 0 && this.levelBriefed < 1) {
            ctx.fillText('Read the briefing before your first mission', 400, 500);
        } else if (this.level === 0) {
            ctx.fillText('You are cleared for launch, pilot', 400, 500);
        } else {
            ctx.fillText(`Next mission: Level ${this.level + 1}`, 400, 500);
        }

        // Difficulty display
        const diffNames = ['EASY', 'NORMAL', 'HARD', 'NIGHTMARE'];
        ctx.fillStyle = '#888';
        ctx.font = '12px monospace';
        ctx.fillText(`Difficulty: ${diffNames[this.difficulty]} (press 1-4)`, 400, 560);
        ctx.textAlign = 'left';
    }

    // ========== State: Playing ==========

    private startLevel(levelIndex: number): void {
        this.level = levelIndex;
        this.player = new Player();
        this.player.loadSprite(this.assets);
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

        // Start level music
        this.audio.stopMusic();
        if (levelIndex === 0) {
            try { this.audio.playMusic('start', true); this.musicPlaying = 'start'; } catch { /* skip */ }
        } else if (levelIndex === 1) {
            try { this.audio.playMusic('Level2', true); this.musicPlaying = 'Level2'; } catch { /* skip */ }
        } else {
            try { this.audio.playMusic('SMC', true); this.musicPlaying = 'SMC'; } catch { /* skip */ }
        }

        // Start engine sound
        try { this.engineSound = this.audio.playSound('ShipEngine', true); } catch { this.engineSound = null; }

        this.state = GameState.Playing;
    }

    private updatePlaying(dt: number): void {
        this.stateTimer += dt;

        // Update starfield
        this.starField.update(dt);

        // Update player
        if (this.player && this.player.alive) {
            this.player.update(dt, this.input, this.now);
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

        // Level start text overlay
        if (this.stateTimer < 4) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.font = '28px monospace';
            ctx.fillStyle = '#0f0';
            const alpha = this.stateTimer < 0.6 ? 0 : Math.min(1, (this.stateTimer - 0.6) / 0.5);
            ctx.globalAlpha = alpha;
            ctx.fillText(`LEVEL ${this.level + 1}`, PLAY_AREA_W / 2, 280);
            ctx.globalAlpha = 1;
            ctx.textAlign = 'left';
            ctx.restore();
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
}
