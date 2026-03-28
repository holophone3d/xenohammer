/**
 * GameManager — main game state machine and orchestrator.
 */

import { GameCanvas, Input, AudioManager, AssetLoader, ParticleSystem, SoundInstance } from '../engine';
import type { TouchControls } from '../engine';
import { LEVELS } from '../data/levels';
import { ENEMY_SCORES, RANKINGS, TURRET_VELOCITY_TABLE } from '../data/ships';
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
    Aftermath,
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
    touchControls: TouchControls | null = null;

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
    private levelAnimFrames: HTMLImageElement[][] = []; // per-level start animation frames
    private levelEndAnimFrames: HTMLImageElement[][] = []; // per-level end animation frames
    private levelEndAnimStart = 0; // timestamp when end animation started
    private hasNewCustomization = true; // "NEW!" label in ready room
    private playerDiedLastLevel = false; // death message in ready room
    private briefingScrollY = 0;
    private briefingScrollStart = 0;
    private aftermathY = 600; // C++ aftermath scroll position (600 → -550)
    private menuHoverIndex = -1;  // tracks which menu button is hovered
    private optionsSaveTooltip = '';  // tooltip for save/load feedback
    private optionsSaveTooltipTimer = 0;
    private custSelectedSystem: number = -1; // -1=none, 0=noseBlaster, 1=leftTurret, 2=rightTurret, 3=leftMissile, 4=rightMissile, 5=engine
    private custHoverSystem: number = -1;
    private custStatusMsg = '';
    private custStatusTimer = 0;
    // Demo projectiles for live ship preview in customization
    private custDemoProjectiles: Array<{x:number, y:number, vx:number, vy:number, type:string, frame:number, alive:boolean}> = [];
    private custDemoLastFire: Record<string, number> = {};
    private custSpeedShipX = 580;
    private custSpeedShipDir = 1;
    private custShieldDemo = 0;
    private turretAngleAvailable = false;
    private isHomingResearched = false;
    // C++ Sound.cpp:81-100 — two-phase fire sound (single shot → looping rapid fire)
    private playerFireSound: SoundInstance | null = null;
    private playerRapidFireActive = false;
    private newGamePlusRound = 0; // how many times the player has looped through all levels

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

        // Register audio load count up front so progress bar never goes backwards
        const soundFiles: [string, string][] = [
            ['Space', 'sounds/Space.mp3'],
            ['PlayerGun1', 'sounds/PlayerGun1.mp3'],
            ['PlayerGun2', 'sounds/PlayerGun2.mp3'],
            ['AlienWeapon1', 'sounds/AlienWeapon1.mp3'],
            ['AlienWeapon5', 'sounds/AlienWeapon5.mp3'],
            ['ExploMini1', 'sounds/ExploMini1.mp3'],
            ['CoinCollected', 'sounds/CoinCollected.mp3'],
            ['ShipEngine', 'sounds/ShipEngine.mp3'],
            ['MenuChange', 'sounds/MenuChange.mp3'],
            ['MenuSelect', 'sounds/MenuSelect.mp3'],
            ['BossNear1', 'sounds/BossNear1.mp3'],
        ];
        const musicFiles: [string, string][] = [
            ['Level2', 'sounds/Level2.mp3'],
            ['bossTEST', 'sounds/bossTEST.mp3'],
        ];
        this.assets.addPending(soundFiles.length + musicFiles.length);

        // Load all assets in parallel (images + sounds + music)
        const imageLoad = this.assets.loadManifest('assets/manifest.json', 'assets')
            .catch(e => console.warn('Failed to load manifest, continuing without assets:', e));

        await Promise.all([
            imageLoad,
            ...soundFiles.map(([id, path]) =>
                this.audio.loadSound(id, `assets/${path}`).finally(() => this.assets.markLoaded())
            ),
            ...musicFiles.map(([id, path]) =>
                this.audio.loadMusic(id, `assets/${path}`).finally(() => this.assets.markLoaded())
            ),
        ]);

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

    /** Load pre-rendered level intro animation frames.
     *  C++ uses resource keys level_anim_1–8; on-disk PNGs are in_game_1–8 etc. */
    private loadLevelAnimFrames(): void {
        // Level 1: in_game_1 through in_game_8 (typewriter "LEVEL 1_")
        const l1: HTMLImageElement[] = [];
        for (let i = 1; i <= 8; i++) {
            try { l1.push(this.assets.getImage(`in_game_${i}`)); } catch { break; }
        }
        // Level 2: in_game_1 through in_game_7 + in_game_start2 ("LEVEL 2_")
        const l2: HTMLImageElement[] = [];
        for (let i = 1; i <= 7; i++) {
            try { l2.push(this.assets.getImage(`in_game_${i}`)); } catch { break; }
        }
        try { l2.push(this.assets.getImage('in_game_start2')); } catch { /* skip */ }
        // Level 3: in_game_1 through in_game_7 + in_game_start3 ("LEVEL 3_")
        const l3: HTMLImageElement[] = [];
        for (let i = 1; i <= 7; i++) {
            try { l3.push(this.assets.getImage(`in_game_${i}`)); } catch { break; }
        }
        try { l3.push(this.assets.getImage('in_game_start3')); } catch { /* skip */ }
        this.levelAnimFrames = [l1, l2, l3];

        // End-of-level animations (C++ level1_end, level2_end — 15 frames at 100ms)
        // Level 1: in_game_1, in_game_9–22 (15 frames)
        // Level 2: in_game_1, in_game_9–21, in_game_end2 (15 frames)
        const safeImg = (id: string) => { try { return this.assets.getImage(id); } catch { return null; } };
        const endL1: HTMLImageElement[] = [];
        const img1 = safeImg('in_game_1');
        if (img1) endL1.push(img1);
        for (let i = 9; i <= 22; i++) {
            const f = safeImg(`in_game_${i}`);
            if (f) endL1.push(f); else break;
        }
        const endL2: HTMLImageElement[] = [];
        const img1b = safeImg('in_game_1');
        if (img1b) endL2.push(img1b);
        for (let i = 9; i <= 21; i++) {
            const f = safeImg(`in_game_${i}`);
            if (f) endL2.push(f); else break;
        }
        const end2 = safeImg('in_game_end2');
        if (end2) endL2.push(end2);
        this.levelEndAnimFrames = [endL1, endL2, []]; // No end animation for boss level
    }

    update(dt: number): void {
        dt = Math.min(dt, 0.1);
        this.now = performance.now();

        // Touch controls only active during gameplay
        this.touchControls?.setActive(this.state === GameState.Playing);

        // When debug overlay is open, consume input so it doesn't reach game UI
        if (this.debugMenuOpen) {
            this.handleDebugKeys();
            this.input.endFrame();
            return;
        }

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
            case GameState.Aftermath:
                this.updateAftermath(dt);
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

        // ESC during gameplay → return to Ready Room
        if (!this.debugMenuOpen && this.state === GameState.Playing && this.input.isKeyPressed('Escape')) {
            this.returnToReadyRoom();
        }

        this.handleDebugKeys();
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
            case GameState.Aftermath:
                this.renderAftermath();
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

        // Debug overlay hint (top-left, small)
        this.renderDebugHint();
    }

    // ========== State: Loading ==========

    private renderLoading(): void {
        const ctx = this.canvas.ctx;
        ctx.fillStyle = '#0f0';
        ctx.font = '24px XenoFont, monospace';
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
            // Delay Space ambient slightly — on iOS the AudioContext needs
            // time to resume after the gesture handler's ctx.resume() call
            setTimeout(() => {
                this.audio.playSound('Space', true);
            }, 150);
            this.started = true;
            this.state = GameState.ReadyRoom;
        }
    }

    private renderStartScreen(): void {
        const ctx = this.canvas.ctx;
        const splash = this.assets.tryGetImage('XenoStart');
        if (splash) {
            ctx.drawImage(splash, 0, 0, 800, 600);
        }
        ctx.fillStyle = '#0f0';
        ctx.font = '20px XenoFont, monospace';
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
                this.audio.playSound('MenuSelect');
                this.state = GameState.ShipCustomization;
            }
            // Center zone: Briefing & Options
            if (mx >= 200 && mx <= 400 && my >= 185 && my <= 218) {
                this.audio.playSound('MenuSelect');
                this.state = GameState.OptionsMenu;
            }
            // Right zone: Launch
            if (mx >= 601 && mx <= 800 && my >= 0 && my <= 540) {
                this.audio.playSound('MenuSelect');
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
        }

        const mouse = this.input.getMousePos();
        const mx = mouse.x;
        const my = mouse.y;

        // Determine hover zone
        const inLeft = mx >= 10 && mx <= 218 && my >= 260 && my <= 380;
        const inCenter = mx >= 200 && mx <= 400 && my >= 185 && my <= 218;
        const inRight = mx >= 601 && mx <= 800 && my >= 0 && my <= 540;

        // Zone hover labels (appear on hover)
        ctx.font = '18px XenoFont, monospace';
        ctx.textAlign = 'center';
        if (inLeft) {
            ctx.fillStyle = '#0f0';
            ctx.fillText('Ship Customization', 114, 340);
            this.hasNewCustomization = false; // C++: clears on hover
        }
        if (inCenter) {
            ctx.fillStyle = '#0f0';
            ctx.fillText('Briefing Area and Options', 300, 206);
        }
        if (inRight) {
            ctx.fillStyle = '#0f0';
            ctx.fillText('Launch', 600, 270);
        }

        // "NEW!" label near customization — C++ GUI.cpp:206-209
        if (this.hasNewCustomization && !inLeft) {
            ctx.font = '18px XenoFont, monospace';
            ctx.fillStyle = '#0f0';
            ctx.textAlign = 'center';
            ctx.fillText('NEW!', 114, 340);
        }

        // Notification labels — hide when hovering over the briefing CRT
        if (this.levelBriefed <= this.level && !inCenter) {
            ctx.font = '18px XenoFont, monospace';
            ctx.fillStyle = '#0f0';
            ctx.fillText('New Level Briefing Available!', 300, 206);
        }

        // Bottom tooltip bar — black background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 550, 800, 50);

        // Dynamic tooltip text — large font matching original
        ctx.font = '26px XenoFont, monospace';
        ctx.fillStyle = '#0f0';
        ctx.textAlign = 'center';

        let tooltip = '';

        if (inLeft) {
            tooltip = 'Click here to customize your ship.';
        } else if (inCenter) {
            tooltip = 'Click here to See Briefings, Save, Load, or Quit';
        } else if (inRight) {
            const ngPrefix = this.newGamePlusRound > 0
                ? `[NG+${this.newGamePlusRound}] ` : '';
            if (this.level === 0 && this.levelBriefed < 1 && this.newGamePlusRound === 0) {
                tooltip = 'Recon has new info see the level briefing.';
            } else if (this.level === 0) {
                tooltip = `${ngPrefix}Launch into the Outer Earth Sector`;
            } else if (this.level === 1 && this.levelBriefed < 2 && this.newGamePlusRound === 0) {
                tooltip = 'Recon has new info see the level briefing.';
            } else if (this.level === 1) {
                tooltip = `${ngPrefix}Penetrate the Outer Defense Matrix`;
            } else if (this.level === 2 && this.levelBriefed < 3 && this.newGamePlusRound === 0) {
                tooltip = 'Recon has new info see the level briefing.';
            } else if (this.level === 2) {
                tooltip = `${ngPrefix}Destroy the Nexus Core`;
            }
        } else if (this.playerDiedLastLevel) {
            // C++ GUI.cpp:201-202: death message replaces default when no zone hovered
            tooltip = 'You have died, your game has been restarted';
        } else {
            tooltip = 'Click on a screen or the door opening';
        }

        ctx.fillText(tooltip, 400, 580);
        ctx.textAlign = 'left';
    }

    // ========== State: Playing ==========

    private startLevel(levelIndex: number): void {
        this.level = levelIndex;
        this.playerDiedLastLevel = false;
        this.levelEndAnimStart = 0;

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
        this.starField.reset();

        // Spawn boss for levels with hasBoss
        const levelDef = LEVELS[levelIndex];
        if (levelDef?.hasBoss) {
            this.boss = new Boss(this.difficulty);
            this.boss.loadSprites(this.assets);
        }

        // Start level music — original uses Level2.mp3 for ALL levels
        this.audio.stopMusic();
        this.audio.playMusic('Level2', true); this.musicPlaying = 'Level2';

        // Start engine sound at low volume (original used ~10%)
        this.engineSound = this.audio.playSound('ShipEngine', true);
        this.engineSound.setVolume(0.1);

        this.state = GameState.Playing;
    }

    /** Advance to next level. If all levels complete, loop back with harder difficulty. */
    private advanceLevel(): void {
        this.level++;
        if (this.level >= LEVELS.length) {
            this.level = 0;
            this.newGamePlusRound++;
            this.difficulty = Math.min(3, this.difficulty + 1);
        }
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
            if (playerProj.length > 0) {
                // C++ Sound.cpp:81-100: first fire plays single shot (PlayerGun1),
                // subsequent fires while held switch to looping rapid fire (PlayerGun2)
                if (this.playerFireSound && this.playerFireSound.isPlaying()) {
                    if (!this.playerRapidFireActive) {
                        this.playerFireSound.stop();
                        this.playerFireSound = this.audio.playSound('PlayerGun2', true);
                        this.playerRapidFireActive = true;
                    }
                } else {
                    this.playerFireSound = this.audio.playSound('PlayerGun1');
                    this.playerRapidFireActive = false;
                }
            } else if (this.input.isKeyDown(Input.SPACE)) {
                // Fire button held but gate not ready — keep sound going
            } else {
                // C++ Sound.cpp:169-175: fire released — stop rapid loop, play final single shot
                if (this.playerRapidFireActive && this.playerFireSound) {
                    this.playerFireSound.stop();
                    this.playerFireSound = this.audio.playSound('PlayerGun1');
                    this.playerRapidFireActive = false;
                }
            }
            this.projectiles.push(...playerProj);
        }

        // Spawn waves
        const waveResult = this.waveManager.update(dt, this.difficulty);
        for (const enemy of waveResult.enemies) {
            try { enemy.loadSprite(this.assets); } catch { /* skip */ }
            this.enemies.push(enemy);
        }
        for (const ship of waveResult.capitalShips) {
            try { ship.loadSprites(this.assets); } catch { /* skip */ }
            this.capitalShips.push(ship);
        }

        // Update enemies
        const playerX = this.player?.x ?? 300;
        const playerY = this.player?.y ?? 300;

        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            enemy.update(dt, playerX, playerY);
            const enemyProj = enemy.tryFire(this.now, this.assets);
            if (enemyProj.length > 0) {
                this.audio.playSound(enemy.type === 'gunship' ? 'AlienWeapon1' : 'AlienWeapon5', false, enemy.type === 'gunship' ? 0.5 : 1.0);
            }
            this.projectiles.push(...enemyProj);
        }

        // Update capital ships
        for (const ship of this.capitalShips) {
            if (!ship.isAlive()) continue;
            ship.update(dt, playerX, playerY, this.now);
            const shipProj = ship.getProjectiles();
            this.projectiles.push(...shipProj);

            // Play capital ship fire sounds (C++: ENEMYCANNON→AlienWeapon1@0.5, ENEMYBLASTER→AlienWeapon5@1.0)
            for (const fs of ship.getFireSounds()) {
                this.audio.playSound(fs.sound, false, fs.volume);
            }

            // Dual engine flames (C++ make_CapShipEngine: two exhaust points at x+40, x+57)
            // Color: R=G=tempVal(0-2), B=1.0 (blue/cyan); fade 0.003-0.103/frame
            // C++ angle: -10+Random(20) = -10° to +10° from UP (exhaust behind ship)
            for (const engineOffX of [40, 57]) {
                const tempVal = Math.random() * 2; // C++ allows > 1.0 for overbright additive
                const cppFade = (Math.random() * 100) / 1000 + 0.003;
                const fadePerSec = cppFade * 60;
                const angleDeg = -10 + Math.random() * 20; // -10° to +10° from UP
                const angleRad = (angleDeg * Math.PI) / 180;
                this.particles.emit(ship.x + engineOffX, ship.y, 1, {
                    color: { r: tempVal, g: tempVal, b: 1.0 },
                    speed: 3 + Math.random() * 5,
                    life: 1.0,   // C++ intensity = 1.0f for frigates
                    fade: fadePerSec,
                    direction: angleRad,
                    spread: 0,
                });
            }

            // Capital ship death: C++ Frigate::destroy_ship() — 8× MakeExplosions
            if (ship.justDied) {
                ship.justDied = false;
                this.score += ENEMY_SCORES['frigate'] ?? 2000;
                if (this.player) this.player.kills++;
                this.audio.playSound('ExploMini1');

                for (const pt of ship.getExplosionPoints()) {
                    this.makeExplosions(pt.x, pt.y, ship.vx, ship.vy);
                }
            }

            // C++ ShipComponent::destroy_ship() — sound + explosion per component death
            for (const cd of ship.pendingComponentDestructions) {
                this.makeExplosions(cd.x, cd.y, ship.vx, ship.vy);
                this.audio.playSound('ExploMini1');
            }
            ship.pendingComponentDestructions = [];
        }
        // Clean up dead capital ships
        this.capitalShips = this.capitalShips.filter(s => s.isAlive());

        // Update boss
        if (this.boss && this.boss.alive) {
            const levelTimeMs = this.stateTimer * 1000;
            this.boss.update(dt, playerX, playerY, this.now, levelTimeMs);

            if (this.boss.shouldTriggerMusic()) {
                this.audio.playSound('BossNear1');
                // Switch to boss music (original: stops Level2, plays bossTEST)
                this.audio.stopMusic();
                this.audio.playMusic('bossTEST', true); this.musicPlaying = 'bossTEST';
            }

            const bossProj = this.boss.getProjectiles();
            this.projectiles.push(...bossProj);

            // Boss particle emission requests (explosions need particles too)
            for (const pe of this.boss.getParticleEmits()) {
                this.particles.emit(pe.x, pe.y, pe.count, {
                    color: { r: 1, g: 0.6, b: 0.1 }, speed: 100, life: 0.8, fade: 1.5,
                });
            }

            // Boss sound emission requests (C++: Sound::playExplosionSound() on component destruction)
            for (const snd of this.boss.getSoundEmits()) {
                this.audio.playSound(snd);
            }
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
            this.playerDiedLastLevel = true;
            this.state = GameState.GameOver;
            this.stateTimer = 0;
            return;
        }

        // Check level complete
        const levelDef = LEVELS[this.level];
        if (levelDef?.hasBoss) {
            if (this.boss && this.boss.isDefeated()) {
                this.stopGameplaySounds();
                // C++: lower boss music to 50%, transition to aftermath scrolling
                this.audio.setMusicVolume(0.5);
                this.state = GameState.Aftermath;
                this.aftermathY = 600;
                this.stateTimer = 0;
            }
        } else {
            if (this.waveManager.isTimeUp()) {
                this.stopGameplaySounds();
                // C++: all non-boss levels return to Ready Room via LevelComplete
                this.state = GameState.LevelComplete;
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
                // C++ creates a small sprite explosion at projectile hit position
                this.gameExplosions.push(new Explosion(
                    proj.x, proj.y, 'small', this.smallExpFrames,
                    proj.vx / 5, proj.vy / 5));
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
                    // C++ creates a small sprite explosion at projectile hit position
                    this.gameExplosions.push(new Explosion(
                        proj.x, proj.y, 'small', this.smallExpFrames,
                        proj.vx / 5, proj.vy / 5));
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
                        this.gameExplosions.push(new Explosion(
                            proj.x, proj.y, 'small', this.smallExpFrames,
                            proj.vx / 5, proj.vy / 5));
                        this.particles.emit(proj.x, proj.y, 6, {
                            color: { r: 1, g: 0.8, b: 0.2 }, speed: 50, life: 0.3,
                        });
                        break;
                    }
                }
            }
            if (proj.alive && this.boss && this.boss.alive) {
                // Use projectile center for sprite-level collision accuracy.
                // Boss.takeDamage handles priority ordering and per-pixel mask
                // checks internally; returns false if bullet hit a transparent area.
                for (const { component, rect } of this.boss.getComponentRects()) {
                    if (!component.damageable || component.destroyed) continue;
                    if (rectsOverlap(proj.getRect(), rect)) {
                        const cx = proj.x + proj.width / 2;
                        const cy = proj.y + proj.height / 2;
                        if (this.boss.takeDamage(cx, cy, proj.damage)) {
                            proj.alive = false;
                            this.gameExplosions.push(new Explosion(
                                proj.x, proj.y, 'small', this.smallExpFrames,
                                proj.vx / 5, proj.vy / 5));
                            this.particles.emit(proj.x, proj.y, 6, {
                                color: { r: 1, g: 0.8, b: 0.2 }, speed: 50, life: 0.3,
                            });
                        }
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
                this.audio.playSound('CoinCollected');
            }
        }
    }

    private onEnemyKilled(enemy: Enemy): void {
        this.score += ENEMY_SCORES[enemy.type] ?? 100;
        if (this.player) this.player.kills++;

        const cx = enemy.x + enemy.width / 2;
        const cy = enemy.y + enemy.height / 2;

        // C++ EnemyShip::destroy_ship() — per-type explosion positions
        if (enemy.type === 'gunship') {
            // 3× MakeExplosions: center, left engine, right engine
            this.makeExplosions(cx, cy, enemy.vx, enemy.vy);
            this.makeExplosions(
                enemy.x + enemy.width / 3, enemy.y + enemy.height - 5,
                enemy.vx, enemy.vy);
            this.makeExplosions(
                enemy.x + enemy.width - 15, enemy.y + enemy.height - 5,
                enemy.vx, enemy.vy);
        } else {
            // LightFighter, FighterB: 1× MakeExplosions at center
            this.makeExplosions(cx, cy, enemy.vx, enemy.vy);
        }

        // Particles supplement the trail system
        const count = enemy.type === 'gunship' ? 30 : 15;
        this.particles.emit(cx, cy, count, {
            color: { r: 1, g: 0.6, b: 0.1 }, speed: 100, life: 0.8, fade: 1.5,
        });

        // C++: Sound::playExplosionSound() — once per destroy_ship() call
        this.audio.playSound('ExploMini1');

        const pu = PowerUp.tryDrop(enemy.x, enemy.y, enemy.config.powerUpDropChance, this.assets);
        if (pu) this.gamePowerUps.push(pu);
    }

    /**
     * C++ explosionGenerator::MakeExplosions() — trail explosion system.
     * 5 trails × 4 small explosions + 1 big center = 21 per call.
     * Trail positions are pre-calculated along parabolic arcs (gravity applied
     * during generation, NOT at runtime). Each explosion drifts at half the
     * source velocity using VELOCITY_DIVISOR scaling.
     */
    private makeExplosions(sourceX: number, sourceY: number, dx: number, dy: number): void {
        const TRAIL_COUNT = 5;
        const TRAIL_LENGTH = 4;
        const EXPLOSION_SIZE = 32;
        const GRAVITY = EXPLOSION_SIZE / 16; // 2.0

        for (let trail = 0; trail < TRAIL_COUNT; trail++) {
            const dir = Math.random() * Math.PI * 2;
            const speed = (Math.random() + 0.5) * (EXPLOSION_SIZE / 4); // 4–12
            let tvx = speed * Math.cos(dir);
            let tvy = -speed * Math.sin(dir);
            let px = sourceX;
            let py = sourceY;

            for (let t = 0; t < TRAIL_LENGTH; t++) {
                px += tvx;
                py += tvy;
                tvy += GRAVITY;
                const delay = t * 2; // C++: set_curr_frame(-explosionnum*2)
                this.gameExplosions.push(
                    new Explosion(px, py, 'small', this.smallExpFrames, dx / 2, dy / 2, 0, delay));
            }
        }

        // Big center explosion (C++: SourceX-48, SourceY-48 = top-left of 96px sprite → web draws centered)
        this.gameExplosions.push(
            new Explosion(sourceX, sourceY, 'big', this.bigExpFrames, dx / 4, dy / 4));
    }

    private applyPowerUp(pu: PowerUp): void {
        if (!this.player) return;
        // C++ always increments powerUpCount (resource units) for every pickup
        this.player.powerPlant.resourceUnits++;
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
        if (this.playerFireSound) {
            this.playerFireSound.stop();
            this.playerFireSound = null;
            this.playerRapidFireActive = false;
        }
        this.audio.stopMusic();
        this.musicPlaying = '';
    }

    private renderPlaying(): void {
        const ctx = this.canvas.ctx;

        // Starfield background (Earth/Moon visible only on Level 1)
        this.starField.draw(ctx, this.level === 0);

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

        // Level start animation overlay — typewriter text at 100ms per character
        // C++: GameAnimation at (253, 200), 8 frames = 8 characters "LEVEL 1_"
        // Since level_anim sprites don't exist, we render with typewriter code
        if (this.stateTimer < 4 && this.stateTimer > 0.6) {
            const frames = this.levelAnimFrames[this.level] ?? [];
            if (frames.length > 0) {
                // Sprite-based animation (if sprites exist)
                const elapsed = this.stateTimer - 0.6;
                const frameIndex = Math.min(Math.floor(elapsed / 0.1), frames.length - 1);
                const frame = frames[frameIndex];
                if (frame) {
                    ctx.drawImage(frame, 253, 200);
                }
            } else {
                // Code-based typewriter: "LEVEL X" with cursor
                const fullText = `LEVEL ${this.level + 1}`;
                const elapsed = this.stateTimer - 0.6;
                const charsShown = Math.min(Math.floor(elapsed / 0.1) + 1, fullText.length);
                const displayText = fullText.substring(0, charsShown);
                // Blinking cursor (500ms blink)
                const showCursor = Math.floor(elapsed * 4) % 2 === 0 || charsShown < fullText.length;
                const cursor = showCursor ? '_' : '';

                ctx.save();
                ctx.textAlign = 'left';
                ctx.font = '28px XenoFont, monospace';
                ctx.fillStyle = '#0f0';
                ctx.fillText(displayText + cursor, 253, 220);
                ctx.restore();
            }
        }

        // Level end animation overlay (last 5 seconds) — C++ "LEVEL COMPLETED" typewriter
        // C++: GameAnimation at (223, 200), 15 frames at 100ms each, starts at levelDuration - 5000ms
        const levelDuration = this.waveManager.getLevelDuration();
        const levelTimer = this.waveManager.getLevelTimer();
        const timeLeft = levelDuration - levelTimer;
        const endFrames = this.levelEndAnimFrames[this.level] ?? [];
        if (timeLeft <= 5 && timeLeft > 0 && this.level < 2) {
            if (this.levelEndAnimStart === 0) {
                this.levelEndAnimStart = this.now;
            }
            if (endFrames.length > 0) {
                const elapsed = (this.now - this.levelEndAnimStart) / 1000;
                const frameIndex = Math.min(Math.floor(elapsed / 0.1), endFrames.length - 1);
                const frame = endFrames[frameIndex];
                if (frame) {
                    ctx.drawImage(frame, 223, 200);
                }
            }
        } else if (timeLeft > 5) {
            this.levelEndAnimStart = 0;
        }

        // Touch controls overlay (mobile only)
        this.touchControls?.render(ctx);
    }

    // ========== State: LevelComplete ==========

    private updateLevelComplete(dt: number): void {
        // C++: when timer expires, immediately return to Ready Room (no hold screen)
        this.advanceLevel();
        this.state = GameState.ReadyRoom;
    }

    private renderLevelComplete(): void {
        // Not used — C++ has no separate level complete screen
        // (end animation plays during last 5 seconds of gameplay, then straight to Ready Room)
    }

    // ========== State: GameOver ==========

    private updateGameOver(dt: number): void {
        this.stateTimer += dt;
        if (this.stateTimer >= 4) {
            // Death returns to Ready Room with all stats intact (like C++ game_reset)
            this.score = 0;
            this.level = 0;
            if (this.player) {
                this.player.shields = this.player.maxShields;
                this.player.armor = this.player.maxArmor;
            }
            this.state = GameState.ReadyRoom;
        }
    }

    private renderGameOver(): void {
        const ctx = this.canvas.ctx;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 800, 600);
        const img = this.assets.tryGetImage('game_over');
        if (img) {
            ctx.drawImage(img, 272, 268);
        }
    }

    // ========== State: Aftermath (C++ GUI::Aftermath_GUI) ==========

    private updateAftermath(dt: number): void {
        this.stateTimer += dt;
        this.starField.update(dt);

        // C++ scrolls aftermath from y=600 to y=-550 at rate: i = 600 - (elapsed_ms / 60)
        // That's ~1 pixel per frame at 60fps = ~60 px/s
        this.aftermathY = 600 - (this.stateTimer * 1000 / 60);

        // C++: exit_button (ESC) to skip, or auto-complete when scroll done
        if (this.input.isKeyPressed(Input.ESCAPE) || this.aftermathY <= -550) {
            // C++: aftermath returns directly to Ready Room, no Victory screen.
            // levelNum is incremented, score/kills preserved.
            this.advanceLevel();
            this.state = GameState.ReadyRoom;
            this.stateTimer = 0;
            this.audio.stopMusic();
        }
    }

    private renderAftermath(): void {
        const ctx = this.canvas.ctx;
        // Black background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 800, 600);

        // Starfield scrolling behind (no Earth/Moon — aftermath is after Level 3 boss)
        this.starField.draw(ctx, false);

        // Aftermath graphic scrolling upward
        const img = this.assets.tryGetImage('aftermath');
        if (img) {
            ctx.drawImage(img, 0, this.aftermathY);
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
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd700';
        ctx.font = '32px XenoFont, monospace';
        ctx.fillText('VICTORY!', 400, 120);

        ctx.fillStyle = '#fff';
        ctx.font = '16px XenoFont, monospace';
        ctx.fillText(`Final Score: ${this.score}`, 400, 280);
        if (this.player) {
            ctx.fillText(`Kills: ${this.player.kills}`, 400, 310);
            ctx.fillStyle = '#0f0';
            ctx.fillText(`Rank: ${this.getRank(this.player.kills)}`, 400, 340);
        }

        ctx.fillStyle = '#aaa';
        ctx.font = '14px XenoFont, monospace';
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
        ctx.font = '20px XenoFont, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, 400, yCenter - 8);
        ctx.textAlign = 'left';
        return inButton;
    }

    private drawCrtOverlay(ctx: CanvasRenderingContext2D): void {
        const overlay = this.assets.tryGetImage('room_screen');
        if (overlay) {
            ctx.drawImage(overlay, 0, 0, 800, 600);
        }
    }

    private drawMenuTooltipBar(ctx: CanvasRenderingContext2D, text: string): void {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 550, 800, 50);
        ctx.fillStyle = '#0f0';
        ctx.font = '20px XenoFont, monospace';
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
                this.audio.playSound('MenuChange');
            }
        }

        if (this.input.isMousePressed()) {
            if (newHover === 0) {
                this.audio.playSound('MenuSelect');
                this.state = GameState.BriefingSubmenu;
            } else if (newHover === 1) {
                this.audio.playSound('MenuSelect');
                this.saveGame();
                this.optionsSaveTooltip = 'Game Saved';
                this.optionsSaveTooltipTimer = 2;
            } else if (newHover === 2) {
                this.audio.playSound('MenuSelect');
                if (this.loadGame()) {
                    this.optionsSaveTooltip = 'Game Loaded';
                } else {
                    this.optionsSaveTooltip = 'No Save Found';
                }
                this.optionsSaveTooltipTimer = 2;
            } else if (newHover === 3) {
                this.audio.playSound('MenuSelect');
                this.state = GameState.DifficultyScreen;
            } else if (newHover === 4) {
                this.audio.playSound('MenuSelect');
                this.state = GameState.ReadyRoom;
            } else if (newHover === 5) {
                this.audio.playSound('MenuSelect');
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
                this.audio.playSound('MenuChange');
            }
        }

        if (this.input.isMousePressed()) {
            if (newHover === 0) {
                this.audio.playSound('MenuSelect');
                this.state = GameState.Backstory;
                this.briefingScrollStart = performance.now();
            } else if (newHover === 1) {
                this.audio.playSound('MenuSelect');
                this.state = GameState.LevelBriefing;
                this.briefingScrollStart = performance.now();
                this.levelBriefed = this.level + 1;
            } else if (newHover === 2) {
                this.audio.playSound('MenuSelect');
                this.state = GameState.ShipSpecs;
            } else if (newHover === 3) {
                this.audio.playSound('MenuSelect');
                this.state = GameState.OptionsMenu;
            } else if (newHover === 4) {
                this.audio.playSound('MenuSelect');
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
                this.audio.playSound('MenuSelect');
                this.state = GameState.BriefingSubmenu;
            }
        }
    }

    private renderShipSpecs(): void {
        const ctx = this.canvas.ctx;
        const img = this.assets.tryGetImage('ship_specs');
        if (img) {
            ctx.drawImage(img, 0, 0, 800, 600);
        }

        // Draw "Done" button area
        const mouse = this.input.getMousePos();
        const inDone = mouse.x >= 680 && mouse.x <= 800 && mouse.y >= 540 && mouse.y <= 600;
        ctx.fillStyle = inDone ? 'rgb(70,85,70)' : 'rgb(51,64,51)';
        ctx.fillRect(680, 540, 120, 60);
        ctx.fillStyle = '#0f0';
        ctx.font = '14px XenoFont, monospace';
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
                this.audio.playSound('MenuChange');
            }
        }

        if (this.input.isMousePressed()) {
            if (newHover >= 0 && newHover <= 3) {
                this.audio.playSound('MenuSelect');
                this.difficulty = newHover;
            } else if (newHover === 4) {
                this.audio.playSound('MenuSelect');
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
    // Zone click areas and cell references (from C++ what_system() coordinates)
    private readonly custSystemZones = [
        { x1: 215, y1: 45,  x2: 290, y2: 110, lx: 250, ly: 63,  name: 'Nose Blaster',         c1: 'blasterCell1'      as const, c2: 'blasterCell2'      as const },
        { x1: 100, y1: 105, x2: 170, y2: 170, lx: 132, ly: 123, name: 'Left Turret',          c1: 'leftTurretCell1'   as const, c2: 'leftTurretCell2'   as const },
        { x1: 340, y1: 105, x2: 410, y2: 170, lx: 372, ly: 123, name: 'Right Turret',         c1: 'rightTurretCell1'  as const, c2: 'rightTurretCell2'  as const },
        { x1: 180, y1: 115, x2: 245, y2: 180, lx: 209, ly: 133, name: 'Left Photon Torpedo',  c1: 'leftMissileCell1'  as const, c2: 'leftMissileCell2'  as const },
        { x1: 265, y1: 115, x2: 335, y2: 180, lx: 297, ly: 133, name: 'Right Photon Torpedo', c1: 'rightMissileCell1' as const, c2: 'rightMissileCell2' as const },
        { x1: 220, y1: 195, x2: 290, y2: 265, lx: 249, ly: 213, name: 'Power Plant',          c1: 'shipPowerCell1'    as const, c2: 'shipPowerCell2'    as const },
    ];

    private updateShipCustomization(): void {
        if (this.input.isKeyPressed('Escape')) {
            this.state = GameState.ReadyRoom;
            return;
        }
        // Q/W/E hotkeys for settings
        if (this.player) {
            if (this.input.isKeyPressed(Input.KEY_Q)) this.player.powerPlant.selectSetting(0);
            if (this.input.isKeyPressed(Input.KEY_W)) this.player.powerPlant.selectSetting(1);
            if (this.input.isKeyPressed(Input.KEY_E)) this.player.powerPlant.selectSetting(2);
        }
        if (this.custStatusTimer > 0) {
            this.custStatusTimer--;
            if (this.custStatusTimer <= 0) this.custStatusMsg = '';
        }
        // Update demo projectiles + engine feedback
        this.updateCustDemo();

        const mouse = this.input.getMousePos();
        const mx = mouse.x;
        const my = mouse.y;

        // Hover detection over system zones (only in ship diagram area 0-512, 45-301)
        let newHover = -1;
        if (mx <= 512 && my >= 45 && my <= 301) {
            for (let i = 0; i < this.custSystemZones.length; i++) {
                const z = this.custSystemZones[i];
                if (mx >= z.x1 && mx <= z.x2 && my >= z.y1 && my <= z.y2) {
                    newHover = i;
                    break;
                }
            }
        }
        if (newHover !== this.custHoverSystem) {
            this.custHoverSystem = newHover;
            if (newHover >= 0) {
                this.audio.playSound('MenuChange');
            }
        }

        if (!this.input.isMousePressed()) return;
        if (!this.player) return;

        // System zone click — only switch selection if clicking a DIFFERENT zone.
        // If same zone is already selected, fall through to arrow/buy button checks.
        if (newHover >= 0 && newHover !== this.custSelectedSystem) {
            this.audio.playSound('MenuSelect');
            this.custSelectedSystem = newHover;
            return;
        }

        const sel = this.custSelectedSystem;

        // Settings click (right panel: x=520-800)
        if (mx >= 520 && mx <= 800) {
            if (my >= 80 && my <= 110) {
                this.player.powerPlant.selectSetting(0);
                this.audio.playSound('MenuSelect');
                return;
            }
            if (my >= 111 && my <= 140) {
                this.player.powerPlant.selectSetting(1);
                this.audio.playSound('MenuSelect');
                return;
            }
            if (my >= 141 && my <= 170) {
                this.player.powerPlant.selectSetting(2);
                this.audio.playSound('MenuSelect');
                return;
            }
        }

        // Done button (517-800, 553-600) — reset shields/armor to 300 like C++
        if (mx >= 517 && mx <= 800 && my >= 553 && my <= 600) {
            this.audio.playSound('MenuSelect');
            this.player.shields = 300;
            this.player.armor = 300;
            this.state = GameState.ReadyRoom;
            return;
        }

        if (sel < 0 || sel >= this.custSystemZones.length) return;
        const zone = this.custSystemZones[sel];
        const setting = this.player.powerPlant.getSetting();
        const maxCell = this.player.powerPlant.maxPowerPerCell;

        // Arrow button on ship diagram (gui_button at lx,ly is 10x30)
        // Top 10px: transfer cell2 → cell1 (increase rate)
        if (mx >= zone.lx && mx <= zone.lx + 10 && my >= zone.ly && my <= zone.ly + 10) {
            this.audio.playSound('MenuSelect');
            if (setting[zone.c1] < maxCell && setting[zone.c2] > 1) {
                setting[zone.c1]++;
                setting[zone.c2]--;
            }
            return;
        }
        // Bottom 10px: transfer cell1 → cell2 (increase power)
        if (mx >= zone.lx && mx <= zone.lx + 10 && my >= zone.ly + 20 && my <= zone.ly + 30) {
            this.audio.playSound('MenuSelect');
            if (setting[zone.c2] < maxCell && setting[zone.c1] > 1) {
                setting[zone.c2]++;
                setting[zone.c1]--;
            }
            return;
        }

        // Large touch arrow overlays
        const AW = GameManager.CUST_ARROW_W;
        const AH = GameManager.CUST_ARROW_H;
        const AY = GameManager.CUST_ARROW_Y;
        const LX = GameManager.CUST_ARROW_LEFT_X;
        const RX = GameManager.CUST_ARROW_RIGHT_X;
        // Left arrow: increase rate (c1++, c2--)
        if (mx >= LX && mx <= LX + AW && my >= AY && my <= AY + AH) {
            this.audio.playSound('MenuSelect');
            if (setting[zone.c1] < maxCell && setting[zone.c2] > 1) {
                setting[zone.c1]++;
                setting[zone.c2]--;
            }
            return;
        }
        // Right arrow: increase power (c2++, c1--)
        if (mx >= RX && mx <= RX + AW && my >= AY && my <= AY + AH) {
            this.audio.playSound('MenuSelect');
            if (setting[zone.c2] < maxCell && setting[zone.c1] > 1) {
                setting[zone.c2]++;
                setting[zone.c1]--;
            }
            return;
        }

        // Buy Power Pod (300-364, 460-492) — affects ALL 3 settings
        if (mx >= 300 && mx <= 364 && my >= 460 && my <= 492) {
            this.audio.playSound('MenuSelect');
            if (this.player.powerPlant.resourceUnits < 1) {
                this.custStatusMsg = 'You Have No More Resource Units!';
                this.custStatusTimer = 120;
                return;
            }
            let added = false;
            for (let s = 0; s < 3; s++) {
                const st = this.player.powerPlant.settings[s];
                if (st[zone.c1] < maxCell) {
                    st[zone.c1]++;
                    added = true;
                } else if (st[zone.c2] < maxCell) {
                    st[zone.c2]++;
                    added = true;
                }
            }
            if (added) {
                this.player.powerPlant.resourceUnits--;
            } else {
                this.custStatusMsg = 'Max Number of Power Cells Reached!';
                this.custStatusTimer = 120;
            }
            return;
        }

        // Buy Research (300-364, 400-432)
        if (mx >= 300 && mx <= 364 && my >= 400 && my <= 432) {
            this.audio.playSound('MenuSelect');
            if (sel === 1 || sel === 2) {
                // Turret Rotation research (5 RU)
                if (!this.turretAngleAvailable) {
                    if (this.player.powerPlant.resourceUnits >= 5) {
                        this.turretAngleAvailable = true;
                        this.player.powerPlant.resourceUnits -= 5;
                    } else {
                        this.custStatusMsg = "You Don't Have Enough Resource Units!";
                        this.custStatusTimer = 120;
                    }
                }
            } else if (sel === 3 || sel === 4) {
                // Homing research (15 RU)
                if (!this.isHomingResearched) {
                    if (this.player.powerPlant.resourceUnits >= 15) {
                        this.isHomingResearched = true;
                        this.player.powerPlant.resourceUnits -= 15;
                    } else {
                        this.custStatusMsg = "You Don't Have Enough Resource Units!";
                        this.custStatusTimer = 120;
                    }
                }
            }
            return;
        }

        // Turret angle selector (450-472, 350-550) — when turret rotation researched
        if (this.turretAngleAvailable && (sel === 1 || sel === 2)) {
            if (mx >= 450 && mx <= 472) {
                const anglesLeft = [90, 135, 180, 225, 270];
                const anglesRight = [90, 45, 0, 315, 270];
                const angles = sel === 1 ? anglesLeft : anglesRight;
                const yPos = [350, 392, 434, 476, 518];
                for (let i = 0; i < 5; i++) {
                    if (my >= yPos[i] && my <= yPos[i] + 32) {
                        this.audio.playSound('MenuSelect');
                        if (sel === 1) {
                            setting.leftTurretAngle = angles[i];
                        } else {
                            setting.rightTurretAngle = angles[i];
                        }
                        return;
                    }
                }
            }
        }
    }

    private updateCustDemo(): void {
        const now = performance.now();
        const sel = this.custSelectedSystem;
        // Determine which weapons fire based on selection
        const fire = { nose: false, lt: false, rt: false, lm: false, rm: false };
        if (sel === -1) {
            fire.nose = fire.lt = fire.rt = fire.lm = fire.rm = true;
        } else if (sel === 0) fire.nose = true;
        else if (sel === 1) fire.lt = true;
        else if (sel === 2) fire.rt = true;
        else if (sel === 3) fire.lm = true;
        else if (sel === 4) fire.rm = true;
        // sel===5 (Engine) → no weapons fire

        const shipX = 621, shipY = 383;
        const rates: Record<string, number> = { nose: 150, lt: 300, rt: 300, lm: 1200, rm: 1200 };

        // Get current power setting for sprite frames and turret angles
        const setting = this.player?.powerPlant.getSetting();
        const ltAngle = setting?.leftTurretAngle ?? 135;
        const rtAngle = setting?.rightTurretAngle ?? 45;

        // Use the same discrete velocity table as real gameplay (scaled for demo speed)
        const demoScale = 0.52; // scale table velocities (~29 magnitude) to ~15 demo speed
        const ltSnap = ((Math.round(ltAngle / 45) * 45) % 360 + 360) % 360;
        const rtSnap = ((Math.round(rtAngle / 45) * 45) % 360 + 360) % 360;
        const ltVel = TURRET_VELOCITY_TABLE[ltSnap] ?? { dx: 0, dy: -29 };
        const rtVel = TURRET_VELOCITY_TABLE[rtSnap] ?? { dx: 0, dy: -29 };

        // Sprite frame = cell2 - 1 (matching real weapon rendering)
        const noseFrame = (setting?.blasterCell2 ?? 1);
        const ltFrame = (setting?.leftTurretCell2 ?? 1);
        const rtFrame = (setting?.rightTurretCell2 ?? 1);
        const lmFrame = (setting?.leftMissileCell2 ?? 1);
        const rmFrame = (setting?.rightMissileCell2 ?? 1);

        if (fire.nose && now - (this.custDemoLastFire['nose'] ?? 0) > rates.nose) {
            this.custDemoLastFire['nose'] = now;
            this.custDemoProjectiles.push({ x: shipX + 22, y: shipY - 12, vx: 0, vy: -14, type: 'blaster', frame: noseFrame, alive: true });
        }
        if (fire.lt && now - (this.custDemoLastFire['lt'] ?? 0) > rates.lt) {
            this.custDemoLastFire['lt'] = now;
            this.custDemoProjectiles.push({ x: shipX - 1, y: shipY - 5, vx: ltVel.dx * demoScale, vy: ltVel.dy * demoScale, type: 'turret', frame: ltFrame, alive: true });
        }
        if (fire.rt && now - (this.custDemoLastFire['rt'] ?? 0) > rates.rt) {
            this.custDemoLastFire['rt'] = now;
            this.custDemoProjectiles.push({ x: shipX + 44, y: shipY - 5, vx: rtVel.dx * demoScale, vy: rtVel.dy * demoScale, type: 'turret', frame: rtFrame, alive: true });
        }
        if (fire.lm && now - (this.custDemoLastFire['lm'] ?? 0) > rates.lm) {
            this.custDemoLastFire['lm'] = now;
            this.custDemoProjectiles.push({ x: shipX + 13, y: shipY, vx: 0, vy: -9, type: 'missile', frame: lmFrame, alive: true });
        }
        if (fire.rm && now - (this.custDemoLastFire['rm'] ?? 0) > rates.rm) {
            this.custDemoLastFire['rm'] = now;
            this.custDemoProjectiles.push({ x: shipX + 30, y: shipY, vx: 0, vy: -9, type: 'missile', frame: rmFrame, alive: true });
        }

        // Move projectiles and remove off-screen ones
        for (const p of this.custDemoProjectiles) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.y < 45 || p.y > 600 || p.x < 510 || p.x > 800) p.alive = false;
        }
        this.custDemoProjectiles = this.custDemoProjectiles.filter(p => p.alive);
        // Cap array size
        if (this.custDemoProjectiles.length > 50) {
            this.custDemoProjectiles = this.custDemoProjectiles.slice(-50);
        }

        // Engine feedback: speed ship bouncing (for Engine or None)
        if (sel === 5 || sel === -1) {
            const power = setting?.shipPowerCell2 ?? 1;
            const speed = 2 * power;
            this.custSpeedShipX += speed * this.custSpeedShipDir;
            if (this.custSpeedShipX >= 697) this.custSpeedShipDir = -1;
            if (this.custSpeedShipX <= 520) this.custSpeedShipDir = 1;
            this.custShieldDemo += 2;
            if (this.custShieldDemo >= 300) this.custShieldDemo = 0;
        }
    }

    private renderShipCustomization(): void {
        const ctx = this.canvas.ctx;
        const mouse = this.input.getMousePos();
        const sel = this.custSelectedSystem;

        // 1. Clear screen
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 800, 600);

        // 2. Draw b_unpressed or b_pressed at (0,45) — 800×555 background
        //    Contains ship diagram (0,45)→(512,301) and exit button (517,553)→(800,600)
        const inDone = mouse.x >= 517 && mouse.x <= 800 && mouse.y >= 553 && mouse.y <= 600;
        const bg = this.assets.tryGetImage(inDone ? 'b_pressed' : 'b_unpressed');
        if (bg) ctx.drawImage(bg, 0, 45);

        // 3. Fill black over non-ship-diagram areas (C++ fill_rect calls)
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 800, 40);           // top stat bar
        ctx.fillRect(0, 301, 512, 299);         // bottom-left info panel
        ctx.fillRect(512, 45, 288, 508);        // right panel
        ctx.fillRect(512, 553, 5, 47);          // thin divider next to exit button

        // 3b. Green divider lines at section boundaries
        ctx.fillStyle = '#0f0';
        ctx.fillRect(0, 40, 800, 1);            // bottom of stats bar
        ctx.fillRect(0, 301, 512, 1);           // bottom of ship diagram
        ctx.fillRect(512, 45, 1, 508);          // left edge of right panel
        ctx.fillRect(512, 553, 5, 1);           // above exit button divider
        ctx.fillRect(517, 553, 283, 1);         // above exit button

        // 4. Stats at top (y=35)
        if (this.player) {
            ctx.font = '18px XenoFont, monospace';
            ctx.fillStyle = '#0f0';
            ctx.textAlign = 'left';
            ctx.fillText("RU's:", 5, 35);
            ctx.fillText(this.player.powerPlant.resourceUnits.toString(), 55, 35);
            ctx.textAlign = 'center';
            ctx.fillText(this.getRank(this.player.kills), 400, 35);
            ctx.textAlign = 'left';
            ctx.fillText('Kills:', 600, 35);
            ctx.fillText(this.player.kills.toString(), 675, 35);
        }

        // 5. Power cell bars on ship diagram at C_* positions
        this.drawCustPowerBars(ctx);

        // 6. Zone highlights and gui_button indicator
        for (let i = 0; i < this.custSystemZones.length; i++) {
            const z = this.custSystemZones[i];
            const isHover = i === this.custHoverSystem;
            const isSelected = i === sel;
            if (isSelected) {
                ctx.fillStyle = 'rgba(0,255,0,0.12)';
                ctx.fillRect(z.x1, z.y1, z.x2 - z.x1, z.y2 - z.y1);
                ctx.strokeStyle = '#0f0';
                ctx.lineWidth = 2;
                ctx.strokeRect(z.x1, z.y1, z.x2 - z.x1, z.y2 - z.y1);
                // gui_button (10×30 arrow indicator) at the selected zone's position
                const guiBtn = this.assets.tryGetImage('GUI_button');
                if (guiBtn) ctx.drawImage(guiBtn, z.lx, z.ly);
            } else if (isHover) {
                ctx.fillStyle = 'rgba(0,255,0,0.06)';
                ctx.fillRect(z.x1, z.y1, z.x2 - z.x1, z.y2 - z.y1);
            }
        }

        // 7. "System Selected:" and "Select All Systems" text
        ctx.font = '18px XenoFont, monospace';
        ctx.fillStyle = '#0f0';
        ctx.textAlign = 'left';
        ctx.fillText('System Selected:', 10, 285);
        const selectedName = sel >= 0 && sel < this.custSystemZones.length
            ? this.custSystemZones[sel].name : 'All';
        ctx.fillText(selectedName, 160, 285);
        ctx.textAlign = 'right';
        ctx.fillText('Select All Systems', 490, 260);
        ctx.textAlign = 'left';

        // 8. Bottom-left info panel (0,301 → 512,600)
        if (sel >= 0 && sel < this.custSystemZones.length && this.player) {
            this.renderCustWeaponInfo(ctx, sel);
            // Large touch-friendly arrow overlays for adjusting power
            this.renderCustTouchArrows(ctx, sel);
        } else {
            // No system selected: draw cust_start image at (0,300)
            const custStart = this.assets.tryGetImage('cust_start');
            if (custStart) ctx.drawImage(custStart, 0, 300);
        }

        // 9. Right panel: User Settings (512-800, 45-170)
        this.renderCustSettings(ctx);

        // 10. Right panel: Ship demo + engine feedback
        this.renderCustShipDemo(ctx);

        // 11. Status message at bottom (large font, y=590)
        if (this.custStatusMsg) {
            ctx.fillStyle = '#0f0';
            ctx.font = '26px XenoFont, monospace';
            ctx.textAlign = 'left';
            ctx.fillText(this.custStatusMsg, 20, 590);
        }
    }

    /** Draw power cell bars on the ship diagram at C_* positions from Console.h */
    private drawCustPowerBars(ctx: CanvasRenderingContext2D): void {
        if (!this.player) return;
        const setting = this.player.powerPlant.getSetting();
        const W = 14, H = 10; // C_BAR_WIDTH, C_BAR_HEIGHT

        // All bar positions from Console.h customization constants
        const bars: Array<{x: number, y: number, count: number}> = [
            { x: 230, y: 102, count: setting.blasterCell1 },       // Blaster Rate
            { x: 265, y: 102, count: setting.blasterCell2 },       // Blaster Power
            { x: 111, y: 162, count: setting.leftTurretCell1 },    // L Turret Rate
            { x: 145, y: 162, count: setting.leftTurretCell2 },    // L Turret Power
            { x: 352, y: 162, count: setting.rightTurretCell1 },   // R Turret Rate
            { x: 387, y: 162, count: setting.rightTurretCell2 },   // R Turret Power
            { x: 188, y: 171, count: setting.leftMissileCell1 },   // L Missile Rate
            { x: 223, y: 171, count: setting.leftMissileCell2 },   // L Missile Power
            { x: 276, y: 171, count: setting.rightMissileCell1 },  // R Missile Rate
            { x: 311, y: 171, count: setting.rightMissileCell2 },  // R Missile Power
            { x: 230, y: 258, count: setting.shipPowerCell1 },     // Ship Shield
            { x: 265, y: 258, count: setting.shipPowerCell2 },     // Ship Engine
        ];

        ctx.fillStyle = '#0f0';
        for (const bar of bars) {
            for (let i = 0; i < bar.count; i++) {
                // C++ formula: y = Y_POS - ((temp * C_BAR_HEIGHT) + 4), height = C_BAR_HEIGHT
                const barY = bar.y - ((i * H) + 4) - H;
                ctx.fillRect(bar.x, barY, W, H);
            }
        }
    }

    /** Render weapon-specific info in bottom-left panel (matching C++ positions exactly) */
    private renderCustWeaponInfo(ctx: CanvasRenderingContext2D, sel: number): void {
        if (!this.player) return;
        ctx.font = '18px XenoFont, monospace';
        ctx.fillStyle = '#0f0';
        ctx.textAlign = 'left';

        // Column descriptions at (20, 325) and (20, 350)
        if (sel <= 4) {
            ctx.fillText('Left column determines Shot Rate', 20, 325);
            ctx.fillText('Right column determines Shot Power', 20, 350);
        } else {
            ctx.fillText('Left column determines Shield Recharge Rate', 20, 325);
            ctx.fillText('Right column determines Ship Maneuverability', 20, 350);
        }

        // Research section
        ctx.fillText('Research:', 20, 390);
        const buyBtn = this.assets.tryGetImage('buy');

        if (sel === 0 || sel === 5) {
            // Nose Blaster / Power Plant: research n/a
            ctx.fillText('n/a', 50, 420);
            ctx.fillText('cost = ', 160, 420);
            ctx.fillText('0', 240, 420);
            if (buyBtn) ctx.drawImage(buyBtn, 300, 400);
        } else if (sel === 1 || sel === 2) {
            // Turrets: Turret Rotation research (5 RU)
            if (this.turretAngleAvailable) {
                ctx.fillText('Already Researched', 110, 390);
                ctx.fillText('cost = ', 160, 420);
                ctx.fillText('n/a', 240, 420);
                // Turret angle panel at (450, 350)
                const panelKey = sel === 1 ? 'turret_pannel_left' : 'turret_pannel_right';
                const panel = this.assets.tryGetImage(panelKey);
                if (panel) ctx.drawImage(panel, 450, 350);
                // Selector highlight at current angle
                this.renderTurretAngleSelector(ctx, sel);
            } else {
                ctx.fillText('Turret Rotation', 110, 390);
                ctx.fillText('cost = ', 160, 420);
                ctx.fillText('5', 240, 420);
                if (buyBtn) ctx.drawImage(buyBtn, 300, 400);
            }
        } else if (sel === 3 || sel === 4) {
            // Missiles: Homing research (15 RU)
            if (this.isHomingResearched) {
                ctx.fillText('Already Researched', 110, 390);
                ctx.fillText('Homing Researched', 240, 420);
            } else {
                ctx.fillText('Homing', 110, 390);
                ctx.fillText('cost = ', 160, 420);
                ctx.fillText('15', 240, 420);
                if (buyBtn) ctx.drawImage(buyBtn, 300, 400);
            }
        }

        // Power pods section at (20, 450), buy button at (300, 460)
        ctx.fillText('Power pods:', 20, 450);
        ctx.fillText('cost = ', 160, 480);
        ctx.fillText('1', 240, 480);
        if (buyBtn) ctx.drawImage(buyBtn, 300, 460);
    }

    // Touch-friendly large arrow overlays for power adjustment
    // Each button spans half the info panel width (0→512), aligned to bottom
    private static readonly CUST_ARROW_W = 252;
    private static readonly CUST_ARROW_H = 94;
    private static readonly CUST_ARROW_Y = 506;
    private static readonly CUST_ARROW_LEFT_X = 2;
    private static readonly CUST_ARROW_RIGHT_X = 258;

    private renderCustTouchArrows(ctx: CanvasRenderingContext2D, sel: number): void {
        const mouse = this.input.getMousePos();
        const AW = GameManager.CUST_ARROW_W;
        const AH = GameManager.CUST_ARROW_H;
        const AY = GameManager.CUST_ARROW_Y;
        const LX = GameManager.CUST_ARROW_LEFT_X;
        const RX = GameManager.CUST_ARROW_RIGHT_X;

        const hoverL = mouse.x >= LX && mouse.x <= LX + AW && mouse.y >= AY && mouse.y <= AY + AH;
        const hoverR = mouse.x >= RX && mouse.x <= RX + AW && mouse.y >= AY && mouse.y <= AY + AH;

        const label = sel <= 4 ? ['◀  Rate', 'Power  ▶'] : ['◀  Shield', 'Speed  ▶'];

        // Left arrow (increase c1 / rate)
        ctx.fillStyle = hoverL ? 'rgba(0,255,0,0.25)' : 'rgba(0,255,0,0.10)';
        ctx.fillRect(LX, AY, AW, AH);
        ctx.strokeStyle = hoverL ? 'rgba(0,255,0,0.8)' : 'rgba(0,255,0,0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(LX, AY, AW, AH);
        ctx.fillStyle = hoverL ? '#0f0' : 'rgba(0,255,0,0.6)';
        ctx.font = '22px XenoFont, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label[0], LX + AW / 2, AY + AH / 2 + 8);

        // Right arrow (increase c2 / power)
        ctx.fillStyle = hoverR ? 'rgba(0,255,0,0.25)' : 'rgba(0,255,0,0.10)';
        ctx.fillRect(RX, AY, AW, AH);
        ctx.strokeStyle = hoverR ? 'rgba(0,255,0,0.8)' : 'rgba(0,255,0,0.35)';
        ctx.lineWidth = 2;
        ctx.strokeRect(RX, AY, AW, AH);
        ctx.fillStyle = hoverR ? '#0f0' : 'rgba(0,255,0,0.6)';
        ctx.fillText(label[1], RX + AW / 2, AY + AH / 2 + 8);
    }

    private renderTurretAngleSelector(ctx: CanvasRenderingContext2D, sel: number): void {
        if (!this.player) return;
        const setting = this.player.powerPlant.getSetting();
        const angle = sel === 1 ? setting.leftTurretAngle : setting.rightTurretAngle;
        const anglesLeft = [90, 135, 180, 225, 270];
        const anglesRight = [90, 45, 0, 315, 270];
        const angles = sel === 1 ? anglesLeft : anglesRight;
        const yPos = [350, 392, 434, 476, 518];
        const idx = angles.indexOf(angle);
        if (idx >= 0) {
            const selector = this.assets.tryGetImage('turret_selector');
            if (selector) ctx.drawImage(selector, 450, yPos[idx]);
        }
    }

    /** Render settings panel in right area (matching C++ positions) */
    private renderCustSettings(ctx: CanvasRenderingContext2D): void {
        if (!this.player) return;
        const settingIdx = this.player.powerPlant.currentSetting;

        ctx.font = '18px XenoFont, monospace';
        ctx.fillStyle = '#0f0';
        ctx.textAlign = 'left';
        ctx.fillText('User Settings', 520, 80);

        const labels = [
            "speed setting (HOTKEY 'Q')",
            "power setting (HOTKEY 'W')",
            "armor setting (HOTKEY 'E')",
        ];
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = settingIdx === i ? '#0f0' : '#9b9b9b';
            ctx.fillText(labels[i], 520, 110 + i * 30);
        }
    }

    /** Render live ship demo with projectiles in right panel */
    private renderCustShipDemo(ctx: CanvasRenderingContext2D): void {
        const sel = this.custSelectedSystem;
        const shipX = 621, shipY = 383;

        // Draw demo projectiles (using power-scaled weapon sprites)
        for (const p of this.custDemoProjectiles) {
            // frame = cell2 value (1-5), sprite index = frame (1-indexed filenames)
            const frameIdx = Math.max(1, Math.min(p.frame, 5));
            const spriteKey = p.type === 'blaster' ? `blaster_${frameIdx}`
                            : p.type === 'turret' ? `turret_${frameIdx}`
                            : `torp_${frameIdx}`;
            const img = this.assets.tryGetImage(spriteKey);
            if (img) {
                ctx.drawImage(img, p.x, p.y);
            }
        }

        // Draw ship sprite (frame 8 = center facing) when not Engine-only
        if (sel !== 5) {
            const shipImg = this.assets.tryGetImage('PlayerSprite08');
            if (shipImg) ctx.drawImage(shipImg, shipX, shipY);
        }

        // Engine feedback: shield bar + speed ship (for Engine or None selection)
        if (sel === 5 || sel === -1) {
            // Speed ship bouncing
            const speedShip = this.assets.tryGetImage('speed_ship');
            if (speedShip) ctx.drawImage(speedShip, this.custSpeedShipX, 509);

            // "Shields" label at (740, 345) per C++ (SHIELDS_X_POS+73, SHIELDS_Y_POS-220)
            ctx.font = '18px XenoFont, monospace';
            ctx.fillStyle = '#0f0';
            ctx.textAlign = 'left';
            ctx.fillText('Shields', 740, 345);

            // Shield bar: fills from (740, 545) upward, height = shields * 0.666
            const shields = this.custShieldDemo;
            const barHeight = shields * 0.666;
            let r: number, g: number;
            if (shields >= 150) {
                r = Math.min(1, Math.max(0, (shields * -0.015) + 4.5));
                g = 1.0;
            } else {
                r = 1.0;
                g = Math.min(1, Math.max(0, shields * 0.0066));
            }
            ctx.fillStyle = `rgb(${Math.floor(r * 255)},${Math.floor(g * 255)},0)`;
            ctx.fillRect(740, 545 - barHeight, 45, barHeight);
        }
    }

    // ========== Save / Load (explicit, menu-driven only) ==========

    private static readonly SAVE_KEY = 'xenohammer_save';

    private saveGame(): void {
        if (!this.player) return;
        const data = {
            score: this.score,
            level: this.level,
            difficulty: this.difficulty,
            kills: this.player.kills,
            settings: this.player.powerPlant.settings,
            currentSetting: this.player.powerPlant.currentSetting,
            resourceUnits: this.player.powerPlant.resourceUnits,
            turretAngleAvailable: this.turretAngleAvailable,
            isHomingResearched: this.isHomingResearched,
        };
        try {
            localStorage.setItem(GameManager.SAVE_KEY, JSON.stringify(data));
        } catch { /* storage full or unavailable */ }
    }

    /** Returns true if a save was found and loaded. */
    private loadGame(): boolean {
        if (!this.player) return false;
        try {
            const raw = localStorage.getItem(GameManager.SAVE_KEY);
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (typeof data.score === 'number') this.score = data.score;
            if (typeof data.level === 'number') this.level = data.level;
            if (typeof data.difficulty === 'number') this.difficulty = data.difficulty;
            if (typeof data.kills === 'number') this.player.kills = data.kills;
            if (data.settings && Array.isArray(data.settings) && data.settings.length === 3) {
                this.player.powerPlant.settings = data.settings;
            }
            if (typeof data.currentSetting === 'number') {
                this.player.powerPlant.currentSetting = data.currentSetting;
            }
            if (typeof data.resourceUnits === 'number') {
                this.player.powerPlant.resourceUnits = data.resourceUnits;
            }
            if (typeof data.turretAngleAvailable === 'boolean') {
                this.turretAngleAvailable = data.turretAngleAvailable;
            }
            if (typeof data.isHomingResearched === 'boolean') {
                this.isHomingResearched = data.isHomingResearched;
            }
            // Restore full health after load
            this.player.shields = this.player.maxShields;
            this.player.armor = this.player.maxArmor;
            return true;
        } catch { return false; }
    }

    // ========== DEBUG: Backtick (`) menu ==========

    private debugActive = false;
    private debugMenuOpen = false;
    private debugKeyDebounce = 0;
    private debugLastTapTime = 0;       // for double-tap ` key
    private debugLastClickTime = 0;     // for double-click / double-tap in corner
    private debugLastClickX = 0;
    private debugLastClickY = 0;

    private readonly DEBUG_CORNER_W = 160;  // ~20% of 800
    private readonly DEBUG_CORNER_H = 120;  // ~20% of 600
    private readonly DEBUG_DOUBLE_TAP_MS = 400;

    private handleDebugKeys(): void {
        this.debugKeyDebounce = Math.max(0, this.debugKeyDebounce - 1);
        if (this.debugKeyDebounce > 0) return;

        // Double-tap backtick (`) toggles debug overlay
        if (this.input.isKeyPressed('`')) {
            const now = performance.now();
            if (now - this.debugLastTapTime < this.DEBUG_DOUBLE_TAP_MS) {
                this.debugMenuOpen = !this.debugMenuOpen;
                this.debugKeyDebounce = 15;
                this.debugLastTapTime = 0;
                return;
            }
            this.debugLastTapTime = now;
        }

        // Double-click / double-tap in top-left corner toggles overlay
        if (this.input.isMousePressed()) {
            const pos = this.input.getMousePos();
            if (pos.x < this.DEBUG_CORNER_W && pos.y < this.DEBUG_CORNER_H) {
                const now = performance.now();
                if (now - this.debugLastClickTime < this.DEBUG_DOUBLE_TAP_MS) {
                    this.debugMenuOpen = !this.debugMenuOpen;
                    this.debugKeyDebounce = 15;
                    this.debugLastClickTime = 0;
                    return;
                }
                this.debugLastClickTime = now;
                this.debugLastClickX = pos.x;
                this.debugLastClickY = pos.y;
            }
        }

        if (!this.debugMenuOpen) return;

        // Keyboard: 1-7 debug options
        if (this.input.isKeyPressed('1')) {
            this.debugExec(() => this.debugJumpToLevel(0));
        } else if (this.input.isKeyPressed('2')) {
            this.debugExec(() => this.debugJumpToLevel(1));
        } else if (this.input.isKeyPressed('3')) {
            this.debugExec(() => this.debugSpawnFrigate());
        } else if (this.input.isKeyPressed('4')) {
            this.debugExec(() => this.debugJumpToLevel(2));
        } else if (this.input.isKeyPressed('5')) {
            this.debugExec(() => this.debugSpawnBoss());
        } else if (this.input.isKeyPressed('6')) {
            this.debugToggleGodMode();
            this.debugKeyDebounce = 15;
        } else if (this.input.isKeyPressed('7')) {
            if (this.player) this.player.powerPlant.resourceUnits += 10;
            this.debugKeyDebounce = 15;
        } else if (this.input.isKeyPressed('Escape')) {
            this.debugMenuOpen = false;
            this.debugKeyDebounce = 15;
        }

        // Touch/click on overlay buttons
        if (this.input.isMousePressed()) {
            const pos = this.input.getMousePos();
            const hit = this.debugHitTestOverlay(pos.x, pos.y);
            if (hit >= 0) {
                this.debugExecOption(hit);
            } else if (hit === -2 || pos.x > this.DEBUG_OVERLAY_W) {
                // Close button or click outside overlay closes it
                this.debugMenuOpen = false;
                this.debugKeyDebounce = 15;
            }
        }
    }

    private debugExec(fn: () => void): void {
        fn();
        this.debugMenuOpen = false;
        this.debugKeyDebounce = 15;
    }

    private debugToggleGodMode(): void {
        this.debugActive = !this.debugActive;
        if (this.player) {
            this.player.godMode = this.debugActive;
            if (this.debugActive) this.debugMaxPower();
        }
    }

    private debugExecOption(index: number): void {
        switch (index) {
            case 0: this.debugExec(() => this.debugJumpToLevel(0)); break;
            case 1: this.debugExec(() => this.debugJumpToLevel(1)); break;
            case 2: this.debugExec(() => this.debugSpawnFrigate()); break;
            case 3: this.debugExec(() => this.debugJumpToLevel(2)); break;
            case 4: this.debugExec(() => this.debugSpawnBoss()); break;
            case 5: this.debugToggleGodMode(); this.debugKeyDebounce = 15; break;
            case 6: if (this.player) this.player.powerPlant.resourceUnits += 10; this.debugKeyDebounce = 15; break;
            case 7: this.debugCycleTouchMode('portrait'); break;
            case 8: this.debugCycleTouchMode('landscape'); break;
        }
    }

    // Overlay layout constants
    private readonly DEBUG_OVERLAY_W = 240;
    private readonly DEBUG_BTN_H = 44;
    private readonly DEBUG_BTN_PAD = 6;
    private readonly DEBUG_BTN_X = 12;
    private readonly DEBUG_BTN_Y0 = 50;

    private readonly DEBUG_OPTIONS = [
        '1  Level 1',
        '2  Level 2',
        '3  Frigate (Mini-Boss)',
        '4  Level 3',
        '5  Boss Fight',
        '6  God Mode + Max Power',
        '7  +10 RUs',
        '8  Touch: Portrait',
        '9  Touch: Landscape',
    ];

    private debugHitTestOverlay(mx: number, my: number): number {
        if (mx > this.DEBUG_OVERLAY_W) return -1;
        // Close button (✕) — top right of panel
        const closeBtnX = this.DEBUG_OVERLAY_W - 36;
        const closeBtnY = 8;
        const closeBtnSize = 28;
        if (mx >= closeBtnX && mx <= closeBtnX + closeBtnSize &&
            my >= closeBtnY && my <= closeBtnY + closeBtnSize) {
            return -2; // close button
        }
        for (let i = 0; i < this.DEBUG_OPTIONS.length; i++) {
            const by = this.DEBUG_BTN_Y0 + i * (this.DEBUG_BTN_H + this.DEBUG_BTN_PAD);
            if (mx >= this.DEBUG_BTN_X && mx <= this.DEBUG_OVERLAY_W - this.DEBUG_BTN_X &&
                my >= by && my <= by + this.DEBUG_BTN_H) {
                return i;
            }
        }
        return -1;
    }

    private returnToReadyRoom(): void {
        this.audio.stopMusic();
        if (this.engineSound) { this.engineSound.stop(); this.engineSound = null; }
        if (this.playerFireSound) { this.playerFireSound.stop(); this.playerFireSound = null; }
        this.enemies = [];
        this.projectiles = [];
        this.gameExplosions = [];
        this.gamePowerUps = [];
        this.capitalShips = [];
        this.boss = null;
        this.particles.clear();
        this.state = GameState.ReadyRoom;
    }

    /** Public wrapper for touch ESC button. */
    escToReadyRoom(): void {
        if (this.state === GameState.Playing) {
            this.returnToReadyRoom();
        } else if (
            this.state === GameState.Aftermath ||
            this.state === GameState.Backstory ||
            this.state === GameState.LevelBriefing ||
            this.state === GameState.ShipSpecs ||
            this.state === GameState.OptionsMenu ||
            this.state === GameState.BriefingSubmenu ||
            this.state === GameState.DifficultyScreen ||
            this.state === GameState.ShipCustomization ||
            this.state === GameState.LevelComplete ||
            this.state === GameState.Victory
        ) {
            // Skip back to Ready Room from any menu/scroll screen
            if (this.state === GameState.Aftermath) {
                this.advanceLevel();
            }
            this.state = GameState.ReadyRoom;
            this.stateTimer = 0;
            this.audio.stopMusic();
        }
    }

    private debugJumpToLevel(levelIndex: number): void {
        console.log(`[DEBUG] Jump to level ${levelIndex + 1}`);
        this.startLevel(levelIndex);
    }

    private debugSpawnFrigate(): void {
        console.log('[DEBUG] Spawning Frigate encounter (no fighters)');
        this.level = 1;
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
        this.waveManager.startLevel(1);
        this.waveManager.suppressAllWaves(); // No fighter waves

        const ship = new CapitalShip(275, -300);
        ship.loadSprites(this.assets);
        this.capitalShips.push(ship);

        this.audio.stopMusic();
        this.audio.playMusic('Level2', true); this.musicPlaying = 'Level2';
        this.engineSound = this.audio.playSound('ShipEngine', true);
        this.engineSound.setVolume(0.1);
        this.state = GameState.Playing;
    }

    private debugSpawnBoss(): void {
        console.log('[DEBUG] Spawning Boss fight (skip to entering)');
        this.level = 2;
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
        this.stateTimer = 0;
        this.particles.clear();
        this.waveManager.startLevel(2);
        this.waveManager.suppressAllWaves(); // No fighter waves during debug boss

        // Spawn boss and skip wait — go directly to Entering state
        this.boss = new Boss(this.difficulty);
        this.boss.loadSprites(this.assets);
        this.boss.state = BossState.Entering;
        this.boss.musicTriggered = true;

        this.audio.stopMusic();
        this.audio.playMusic('bossTEST', true); this.musicPlaying = 'bossTEST';
        this.engineSound = this.audio.playSound('ShipEngine', true);
        this.engineSound.setVolume(0.1);
        this.state = GameState.Playing;
    }

    private debugMaxPower(): void {
        if (!this.player) return;
        const max = this.player.powerPlant.maxPowerPerCell;
        for (const s of this.player.powerPlant.settings) {
            s.blasterCell1 = max; s.blasterCell2 = max;
            s.leftTurretCell1 = max; s.leftTurretCell2 = max;
            s.rightTurretCell1 = max; s.rightTurretCell2 = max;
            s.leftMissileCell1 = max; s.leftMissileCell2 = max;
            s.rightMissileCell1 = max; s.rightMissileCell2 = max;
            s.shipPowerCell1 = max; s.shipPowerCell2 = max;
        }
    }

    private debugCycleTouchMode(mode: 'portrait' | 'landscape'): void {
        if (!this.touchControls) return;
        const cur = this.touchControls.getForceMode();
        // Toggle: if already this mode, turn off; otherwise set it
        if (cur === mode) {
            this.touchControls.forceMode(null);
        } else {
            this.touchControls.forceMode(mode);
        }
        this.debugMenuOpen = false;
        this.debugKeyDebounce = 15;
    }

    private renderDebugHint(): void {
        const ctx = this.canvas.ctx;
        ctx.save();

        // Only show GOD MODE indicator when active (no more `:Debug` hint)
        if (this.debugActive) {
            ctx.font = '10px monospace';
            ctx.fillStyle = 'rgba(255,255,0,0.6)';
            ctx.textAlign = 'left';
            ctx.fillText('GOD MODE', 4, 12);
        }

        // Debug overlay
        if (this.debugMenuOpen) {
            const W = this.DEBUG_OVERLAY_W;
            const H = 600;

            // Dim background overlay
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, 0, 800, 600);

            // Panel
            ctx.fillStyle = 'rgba(5,15,5,0.95)';
            ctx.fillRect(0, 0, W, H);
            ctx.strokeStyle = 'rgba(0,255,100,0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, W, H);

            // Title
            ctx.font = 'bold 16px monospace';
            ctx.fillStyle = '#0f0';
            ctx.textAlign = 'left';
            ctx.fillText('DEBUG MENU', 14, 32);

            // Close button (✕) — top right of panel
            const closeBtnX = W - 36;
            const closeBtnY = 8;
            const closeBtnSize = 28;
            const mousePos = this.input.getMousePos();
            const closeHover = mousePos.x >= closeBtnX && mousePos.x <= closeBtnX + closeBtnSize &&
                               mousePos.y >= closeBtnY && mousePos.y <= closeBtnY + closeBtnSize;
            ctx.fillStyle = closeHover ? 'rgba(255,80,80,0.3)' : 'rgba(255,255,255,0.08)';
            ctx.fillRect(closeBtnX, closeBtnY, closeBtnSize, closeBtnSize);
            ctx.strokeStyle = closeHover ? 'rgba(255,80,80,0.6)' : 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.strokeRect(closeBtnX, closeBtnY, closeBtnSize, closeBtnSize);
            ctx.font = 'bold 16px monospace';
            ctx.fillStyle = closeHover ? '#f66' : 'rgba(255,255,255,0.5)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✕', closeBtnX + closeBtnSize / 2, closeBtnY + closeBtnSize / 2);
            ctx.textBaseline = 'alphabetic';

            // Buttons
            const mouse = this.input.getMousePos();
            for (let i = 0; i < this.DEBUG_OPTIONS.length; i++) {
                const bx = this.DEBUG_BTN_X;
                const by = this.DEBUG_BTN_Y0 + i * (this.DEBUG_BTN_H + this.DEBUG_BTN_PAD);
                const bw = W - this.DEBUG_BTN_X * 2;
                const bh = this.DEBUG_BTN_H;

                // Hover detection
                const hover = mouse.x >= bx && mouse.x <= bx + bw &&
                              mouse.y >= by && mouse.y <= by + bh;

                // Button background — highlight active toggles
                const touchMode = this.touchControls?.getForceMode() ?? null;
                const isActiveToggle =
                    (i === 5 && this.debugActive) ||
                    (i === 7 && touchMode === 'portrait') ||
                    (i === 8 && touchMode === 'landscape');

                if (isActiveToggle) {
                    ctx.fillStyle = hover ? 'rgba(255,200,0,0.35)' : 'rgba(255,200,0,0.2)';
                } else {
                    ctx.fillStyle = hover ? 'rgba(0,255,100,0.2)' : 'rgba(0,255,100,0.07)';
                }
                ctx.fillRect(bx, by, bw, bh);

                // Button border
                ctx.strokeStyle = hover ? 'rgba(0,255,100,0.5)' : 'rgba(0,255,100,0.15)';
                ctx.lineWidth = 1;
                ctx.strokeRect(bx, by, bw, bh);

                // Button text
                ctx.font = '13px monospace';
                ctx.textAlign = 'left';
                ctx.fillStyle = hover ? '#fff' : '#0f0';
                ctx.fillText(this.DEBUG_OPTIONS[i], bx + 12, by + bh / 2 + 5);

                // Active toggle ON indicator
                if (isActiveToggle) {
                    ctx.fillStyle = '#ff0';
                    ctx.textAlign = 'right';
                    ctx.fillText('ON', bx + bw - 10, by + bh / 2 + 5);
                }
            }
        }

        ctx.restore();
    }
}
