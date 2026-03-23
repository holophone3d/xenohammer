/**
 * GameManager — main game state machine and orchestrator.
 */

import { GameCanvas, Input, AudioManager, AssetLoader, ParticleSystem } from '../engine';
import { LEVELS } from '../data/levels';
import { ENEMY_SCORES } from '../data/ships';
import { rectsOverlap, PLAY_AREA_W } from './Collision';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { Projectile } from './Projectile';
import { StarField } from './StarField';
import { HUD } from './HUD';
import { WaveManager } from './Wave';

export enum GameState {
    Loading,
    Menu,
    Briefing,
    CustomizeShip,
    Playing,
    LevelComplete,
    GameOver,
    Victory,
}

export interface Explosion {
    x: number;
    y: number;
    timer: number;
    duration: number;
    size: 'small' | 'large';
}

export interface PowerUp {
    x: number;
    y: number;
    vy: number;
    type: 'armor' | 'shield' | 'weapon';
    alive: boolean;
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
    explosions: Explosion[] = [];
    powerUps: PowerUp[] = [];

    private starField: StarField;
    private hud: HUD;
    private waveManager: WaveManager;
    private stateTimer = 0;
    private now = 0;

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
        // Assets would be loaded here in production:
        // await this.assets.loadSpriteFrames('player', '/assets/sprites', 17);
        // await this.assets.loadSpriteFrames('lightfighter', '/assets/sprites', 32);
        // etc.
        this.state = GameState.Menu;
    }

    update(dt: number): void {
        // Cap dt to prevent spiral-of-death on lag spikes
        dt = Math.min(dt, 0.1);
        this.now = performance.now();

        switch (this.state) {
            case GameState.Loading:
                break;

            case GameState.Menu:
                this.updateMenu();
                break;

            case GameState.Briefing:
                this.updateBriefing();
                break;

            case GameState.CustomizeShip:
                this.updateCustomize();
                break;

            case GameState.Playing:
                this.updatePlaying(dt);
                break;

            case GameState.LevelComplete:
                this.updateLevelComplete(dt);
                break;

            case GameState.GameOver:
                this.updateGameOver();
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

            case GameState.Menu:
                this.renderMenu();
                break;

            case GameState.Briefing:
                this.renderBriefing();
                break;

            case GameState.CustomizeShip:
                this.renderCustomize();
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

    // ========== State: Menu ==========

    private updateMenu(): void {
        this.starField.update(1 / 60);
        if (this.input.isKeyPressed(Input.ENTER) || this.input.isKeyPressed(Input.SPACE)) {
            this.state = GameState.Briefing;
        }
        // Difficulty selection: 1-4
        if (this.input.isKeyPressed('1')) this.difficulty = 0;
        if (this.input.isKeyPressed('2')) this.difficulty = 1;
        if (this.input.isKeyPressed('3')) this.difficulty = 2;
        if (this.input.isKeyPressed('4')) this.difficulty = 3;
    }

    private renderMenu(): void {
        this.starField.draw(this.canvas);
        const ctx = this.canvas.ctx;
        ctx.textAlign = 'center';

        ctx.fillStyle = '#0f0';
        ctx.font = '32px monospace';
        ctx.fillText('XENOHAMMER', 400, 180);

        ctx.fillStyle = '#aaa';
        ctx.font = '16px monospace';
        ctx.fillText('Press ENTER or SPACE to start', 400, 280);

        const diffNames = ['EASY', 'NORMAL', 'HARD', 'NIGHTMARE'];
        ctx.fillText(`Difficulty: ${diffNames[this.difficulty]} (press 1-4)`, 400, 320);

        ctx.fillStyle = '#555';
        ctx.font = '12px monospace';
        ctx.fillText('Arrow keys to move, SPACE to fire', 400, 400);
        ctx.fillText('Q/W/E to switch power settings', 400, 420);

        ctx.textAlign = 'left';
    }

    // ========== State: Briefing ==========

    private updateBriefing(): void {
        this.starField.update(1 / 60);
        if (this.input.isKeyPressed(Input.ENTER) || this.input.isKeyPressed(Input.SPACE)) {
            this.startLevel(this.level);
        }
    }

    private renderBriefing(): void {
        this.starField.draw(this.canvas);
        const ctx = this.canvas.ctx;
        ctx.textAlign = 'center';

        ctx.fillStyle = '#ff0';
        ctx.font = '24px monospace';
        ctx.fillText(`LEVEL ${this.level + 1}`, 400, 200);

        const levelDef = LEVELS[this.level];
        ctx.fillStyle = '#aaa';
        ctx.font = '14px monospace';
        ctx.fillText(`Duration: ${levelDef ? levelDef.duration : 95}s`, 400, 260);
        ctx.fillText(`Waves: ${levelDef ? levelDef.waves.length : 0}`, 400, 285);
        if (levelDef?.hasBoss) {
            ctx.fillStyle = '#f00';
            ctx.fillText('WARNING: BOSS ENCOUNTER', 400, 320);
        }

        ctx.fillStyle = '#0f0';
        ctx.fillText('Press ENTER to launch', 400, 380);
        ctx.textAlign = 'left';
    }

    // ========== State: CustomizeShip ==========

    private updateCustomize(): void {
        if (this.input.isKeyPressed(Input.ENTER)) {
            this.startLevel(this.level);
        }
    }

    private renderCustomize(): void {
        this.canvas.clear();
        const ctx = this.canvas.ctx;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0f0';
        ctx.font = '20px monospace';
        ctx.fillText('CUSTOMIZE SHIP', 400, 100);
        ctx.fillStyle = '#aaa';
        ctx.font = '14px monospace';
        ctx.fillText('Press ENTER to launch', 400, 500);
        ctx.textAlign = 'left';
    }

    // ========== State: Playing ==========

    private startLevel(levelIndex: number): void {
        this.level = levelIndex;
        this.player = new Player();
        this.enemies = [];
        this.projectiles = [];
        this.explosions = [];
        this.powerUps = [];
        this.stateTimer = 0;
        this.waveManager.startLevel(levelIndex);

        // Load sprites if available
        try {
            this.player.loadSprite(this.assets);
        } catch {
            // Assets not loaded
        }

        this.state = GameState.Playing;
    }

    private updatePlaying(dt: number): void {
        this.stateTimer += dt;

        // Update starfield
        this.starField.update(dt);

        // Update player
        if (this.player) {
            this.player.update(dt, this.input, this.now);

            // Player fires
            const playerProj = this.player.tryFire(this.input, this.now, this.assets);
            this.projectiles.push(...playerProj);
        }

        // Spawn waves
        const newEnemies = this.waveManager.update(dt, this.difficulty);
        for (const enemy of newEnemies) {
            try {
                enemy.loadSprite(this.assets);
            } catch {
                // Assets not loaded
            }
            this.enemies.push(enemy);
        }

        // Update enemies
        const playerX = this.player?.x ?? 300;
        const playerY = this.player?.y ?? 300;

        for (const enemy of this.enemies) {
            enemy.update(dt, playerX, playerY);
            const enemyProj = enemy.tryFire(this.now, this.assets);
            this.projectiles.push(...enemyProj);
        }

        // Update projectiles
        for (const proj of this.projectiles) {
            // Homing missiles track nearest enemy
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
        for (const exp of this.explosions) {
            exp.timer += dt;
        }

        // Update particles
        this.particles.update(dt);

        // Update power-ups
        for (const pu of this.powerUps) {
            if (!pu.alive) continue;
            pu.y += pu.vy * dt * 60;
            if (pu.y > 620) pu.alive = false;
        }

        // Collision detection
        this.checkCollisions();

        // Cleanup dead entities
        this.enemies = this.enemies.filter(e => e.alive);
        this.projectiles = this.projectiles.filter(p => p.alive);
        this.explosions = this.explosions.filter(e => e.timer < e.duration);
        this.powerUps = this.powerUps.filter(p => p.alive);

        // Check game over
        if (this.player && !this.player.alive) {
            this.state = GameState.GameOver;
            this.stateTimer = 0;
            return;
        }

        // Check level complete
        if (this.waveManager.isTimeUp() || this.waveManager.isLevelComplete(this.enemies.length)) {
            if (this.level >= LEVELS.length - 1) {
                this.state = GameState.Victory;
            } else {
                this.state = GameState.LevelComplete;
            }
            this.stateTimer = 0;
        }
    }

    private checkCollisions(): void {
        if (!this.player || !this.player.alive) return;

        const playerRect = this.player.getRect();

        for (const proj of this.projectiles) {
            if (!proj.alive) continue;
            const projRect = proj.getRect();

            if (proj.owner === 'enemy') {
                // Enemy projectile vs player
                if (rectsOverlap(projRect, playerRect)) {
                    this.player.takeDamage(proj.damage, this.now);
                    proj.alive = false;
                    this.particles.emit(proj.x, proj.y, 8, {
                        color: { r: 1, g: 0.3, b: 0.3 },
                        speed: 40,
                        life: 0.3,
                    });
                }
            } else if (proj.owner === 'player') {
                // Player projectile vs enemies
                for (const enemy of this.enemies) {
                    if (!enemy.alive) continue;
                    if (rectsOverlap(projRect, enemy.getRect())) {
                        enemy.takeDamage(proj.damage);
                        proj.alive = false;

                        this.particles.emit(proj.x, proj.y, 6, {
                            color: { r: 1, g: 0.8, b: 0.2 },
                            speed: 50,
                            life: 0.3,
                        });

                        if (!enemy.alive) {
                            this.onEnemyKilled(enemy);
                        }
                        break;
                    }
                }
            }
        }

        // Player vs enemies (collision damage)
        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            if (rectsOverlap(playerRect, enemy.getRect())) {
                this.player.takeDamage(20, this.now);
                enemy.takeDamage(50);
                if (!enemy.alive) {
                    this.onEnemyKilled(enemy);
                }
            }
        }

        // Player vs power-ups
        for (const pu of this.powerUps) {
            if (!pu.alive) continue;
            const puRect = { x: pu.x, y: pu.y, w: 16, h: 16 };
            if (rectsOverlap(playerRect, puRect)) {
                pu.alive = false;
                this.applyPowerUp(pu);
            }
        }
    }

    private onEnemyKilled(enemy: Enemy): void {
        this.score += ENEMY_SCORES[enemy.type] ?? 100;
        if (this.player) this.player.kills++;

        // Explosion
        this.explosions.push({
            x: enemy.x,
            y: enemy.y,
            timer: 0,
            duration: 0.5,
            size: enemy.config.explosionType,
        });

        // Particles
        const count = enemy.config.explosionType === 'large' ? 30 : 15;
        this.particles.emit(enemy.x + 16, enemy.y + 16, count, {
            color: { r: 1, g: 0.6, b: 0.1 },
            speed: 100,
            life: 0.8,
            fade: 1.5,
        });

        // Random power-up drop
        if (Math.random() < enemy.config.powerUpDropChance) {
            const types: PowerUp['type'][] = ['armor', 'shield', 'weapon'];
            this.powerUps.push({
                x: enemy.x,
                y: enemy.y,
                vy: 2,
                type: types[Math.floor(Math.random() * types.length)],
                alive: true,
            });
        }
    }

    private applyPowerUp(pu: PowerUp): void {
        if (!this.player) return;
        switch (pu.type) {
            case 'armor':
                this.player.armor = Math.min(this.player.maxArmor, this.player.armor + 50);
                break;
            case 'shield':
                this.player.shields = Math.min(this.player.maxShields, this.player.shields + 50);
                break;
            case 'weapon':
                this.score += 500;
                break;
        }
    }

    private renderPlaying(): void {
        const ctx = this.canvas.ctx;

        // Starfield behind everything
        this.starField.draw(this.canvas);

        // Clip play area for game objects
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, PLAY_AREA_W, this.canvas.height);
        ctx.clip();

        // Power-ups
        for (const pu of this.powerUps) {
            if (!pu.alive) continue;
            const colors = { armor: '#f00', shield: '#00f', weapon: '#ff0' };
            ctx.fillStyle = colors[pu.type];
            ctx.fillRect(pu.x, pu.y, 16, 16);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(pu.x, pu.y, 16, 16);
        }

        // Enemies
        for (const enemy of this.enemies) {
            enemy.draw(ctx);
        }

        // Player
        if (this.player) {
            this.player.draw(ctx);
        }

        // Projectiles
        for (const proj of this.projectiles) {
            proj.draw(ctx);
        }

        // Explosions
        for (const exp of this.explosions) {
            const alpha = 1 - exp.timer / exp.duration;
            const radius = exp.size === 'large' ? 40 : 20;
            const r = radius * (1 + exp.timer / exp.duration);
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillStyle = '#ff8800';
            ctx.beginPath();
            ctx.arc(exp.x + 16, exp.y + 16, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Particles
        this.particles.draw(ctx);

        ctx.restore();

        // HUD on top
        this.hud.draw(
            this.canvas,
            this.player,
            this.score,
            this.level,
            this.waveManager.getLevelTimer(),
            this.waveManager.getLevelDuration(),
        );
    }

    // ========== State: LevelComplete ==========

    private updateLevelComplete(dt: number): void {
        this.stateTimer += dt;
        this.starField.update(dt);
        if (this.stateTimer > 3 && (this.input.isKeyPressed(Input.ENTER) || this.input.isKeyPressed(Input.SPACE))) {
            this.level++;
            this.state = GameState.Briefing;
        }
    }

    private renderLevelComplete(): void {
        this.starField.draw(this.canvas);
        const ctx = this.canvas.ctx;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0f0';
        ctx.font = '28px monospace';
        ctx.fillText('LEVEL COMPLETE', 400, 250);
        ctx.fillStyle = '#fff';
        ctx.font = '16px monospace';
        ctx.fillText(`Score: ${this.score}`, 400, 300);
        if (this.stateTimer > 3) {
            ctx.fillStyle = '#aaa';
            ctx.fillText('Press ENTER to continue', 400, 380);
        }
        ctx.textAlign = 'left';
    }

    // ========== State: GameOver ==========

    private updateGameOver(): void {
        this.starField.update(1 / 60);
        if (this.input.isKeyPressed(Input.ENTER) || this.input.isKeyPressed(Input.SPACE)) {
            this.score = 0;
            this.level = 0;
            this.state = GameState.Menu;
        }
    }

    private renderGameOver(): void {
        this.starField.draw(this.canvas);
        const ctx = this.canvas.ctx;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f00';
        ctx.font = '32px monospace';
        ctx.fillText('GAME OVER', 400, 250);
        ctx.fillStyle = '#fff';
        ctx.font = '16px monospace';
        ctx.fillText(`Final Score: ${this.score}`, 400, 300);
        ctx.fillStyle = '#aaa';
        ctx.fillText('Press ENTER to return to menu', 400, 380);
        ctx.textAlign = 'left';
    }

    // ========== State: Victory ==========

    private updateVictory(): void {
        this.starField.update(1 / 60);
        if (this.input.isKeyPressed(Input.ENTER) || this.input.isKeyPressed(Input.SPACE)) {
            this.score = 0;
            this.level = 0;
            this.state = GameState.Menu;
        }
    }

    private renderVictory(): void {
        this.starField.draw(this.canvas);
        const ctx = this.canvas.ctx;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff0';
        ctx.font = '32px monospace';
        ctx.fillText('VICTORY!', 400, 200);
        ctx.fillStyle = '#0f0';
        ctx.font = '20px monospace';
        ctx.fillText('Earth is saved!', 400, 260);
        ctx.fillStyle = '#fff';
        ctx.font = '16px monospace';
        ctx.fillText(`Final Score: ${this.score}`, 400, 320);
        if (this.player) {
            ctx.fillText(`Kills: ${this.player.kills}`, 400, 350);
        }
        ctx.fillStyle = '#aaa';
        ctx.fillText('Press ENTER to return to menu', 400, 420);
        ctx.textAlign = 'left';
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
}
