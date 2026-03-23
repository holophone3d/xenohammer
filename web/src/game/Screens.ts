/**
 * Non-gameplay UI screens: Menu, Briefing, Customize, GameOver, Victory.
 * All screens render to the full 800×600 canvas and handle input transitions.
 */

import { Input, AssetLoader } from '../engine';
import { PLAY_AREA_W, PLAY_AREA_H } from './Collision';
import { PowerSetting } from './PowerPlant';
import { RANKINGS } from '../data/ships';

const SCREEN_W = 800;
const SCREEN_H = 600;
const CONSOLE_W = 150;

const DIFFICULTY_NAMES = ['EASY', 'NORMAL', 'HARD', 'NIGHTMARE'];
const DIFFICULTY_COLORS = ['#0f0', '#ff0', '#f80', '#f00'];

// Shared text rendering helpers
function drawCenteredText(
    ctx: CanvasRenderingContext2D,
    text: string,
    y: number,
    font: string,
    color: string,
    maxWidth = PLAY_AREA_W,
): void {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, maxWidth / 2, y);
    ctx.textAlign = 'left';
}

function drawBlinkingText(
    ctx: CanvasRenderingContext2D,
    text: string,
    y: number,
    font: string,
    color: string,
    time: number,
    blinkRate = 1.5,
): void {
    if (Math.sin(time * blinkRate * Math.PI * 2) > 0) {
        drawCenteredText(ctx, text, y, font, color);
    }
}

function drawBackground(ctx: CanvasRenderingContext2D, assets: AssetLoader, imageId: string): void {
    try {
        const bg = assets.getImage(imageId);
        ctx.drawImage(bg, 0, 0, SCREEN_W, SCREEN_H);
    } catch {
        // No background image — fill with dark gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_H);
        gradient.addColorStop(0, '#000020');
        gradient.addColorStop(1, '#000008');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
}

// ============================================================================
// MenuScreen — Title screen with difficulty selection
// ============================================================================

export class MenuScreen {
    private difficulty = 1; // default: Normal
    private timer = 0;
    private titleGlow = 0;

    render(ctx: CanvasRenderingContext2D, assets: AssetLoader): void {
        this.timer += 1 / 60; // approximate; caller should manage real dt
        this.titleGlow = 0.7 + Math.sin(this.timer * 2) * 0.3;

        drawBackground(ctx, assets, 'menu_bg');

        // Title
        ctx.save();
        ctx.shadowColor = '#0af';
        ctx.shadowBlur = 20 * this.titleGlow;
        drawCenteredText(ctx, 'CODENAME: XENOHAMMER', 150, 'bold 36px monospace', '#fff');
        ctx.restore();

        // Subtitle
        drawCenteredText(ctx, 'A Space Combat Simulation', 185, '14px monospace', '#888');

        // Difficulty selector
        drawCenteredText(ctx, 'DIFFICULTY', 280, '16px monospace', '#aaa');

        const diffY = 310;
        for (let i = 0; i < DIFFICULTY_NAMES.length; i++) {
            const x = (PLAY_AREA_W / 2) - 120 + i * 80;
            const selected = i === this.difficulty;
            ctx.font = selected ? 'bold 14px monospace' : '12px monospace';
            ctx.fillStyle = selected ? DIFFICULTY_COLORS[i] : '#555';
            ctx.textAlign = 'center';
            ctx.fillText(DIFFICULTY_NAMES[i], x, diffY);
            if (selected) {
                // Selection indicator
                ctx.fillText('▼', x, diffY - 18);
            }
        }
        ctx.textAlign = 'left';

        // Start prompt
        drawBlinkingText(ctx, 'PRESS SPACE OR CLICK TO START', 420, '16px monospace', '#0f0', this.timer);

        // Controls hint
        drawCenteredText(ctx, '← → SELECT DIFFICULTY', 470, '12px monospace', '#666');
        drawCenteredText(ctx, 'ARROWS: MOVE  |  SPACE: FIRE  |  Q/W/E: POWER', 500, '10px monospace', '#444');
    }

    /** Advance the timer with real dt for smooth animations. */
    updateTimer(dt: number): void {
        this.timer += dt;
    }

    handleInput(input: Input): { action: 'start' | 'none'; difficulty: number } {
        // Difficulty selection
        if (input.isKeyPressed(Input.LEFT)) {
            this.difficulty = Math.max(0, this.difficulty - 1);
        }
        if (input.isKeyPressed(Input.RIGHT)) {
            this.difficulty = Math.min(DIFFICULTY_NAMES.length - 1, this.difficulty + 1);
        }

        // Start game
        if (input.isKeyPressed(Input.SPACE) || input.isMousePressed()) {
            return { action: 'start', difficulty: this.difficulty };
        }

        return { action: 'none', difficulty: this.difficulty };
    }
}

// ============================================================================
// BriefingScreen — Level briefing with objectives
// ============================================================================

const LEVEL_BRIEFINGS = [
    {
        title: 'LEVEL 1 — OUTER PERIMETER',
        objectives: [
            'Engage incoming enemy fighter squadrons',
            'Survive the assault for 95 seconds',
            'Destroy as many hostiles as possible',
        ],
        warning: 'Light and heavy fighters inbound. Stay sharp.',
    },
    {
        title: 'LEVEL 2 — CAPITAL ENGAGEMENT',
        objectives: [
            'Enemy capital ships detected in sector',
            'Neutralize frigate-class vessels',
            'Survive 95 seconds of combined assault',
        ],
        warning: 'Capital ships have turrets and heavy armor.',
    },
    {
        title: 'LEVEL 3 — FINAL ASSAULT',
        objectives: [
            'Enemy command ship located',
            'Destroy the boss to end the invasion',
            'All forces committed — no retreat',
        ],
        warning: 'The boss has multiple destructible components.\nDestroy outer nodes to expose the core.',
    },
];

export class BriefingScreen {
    private timer = 0;
    private textRevealProgress = 0;

    render(ctx: CanvasRenderingContext2D, level: number, assets: AssetLoader): void {
        this.timer += 1 / 60;
        this.textRevealProgress = Math.min(1, this.timer / 2); // text reveals over 2 seconds

        drawBackground(ctx, assets, 'briefing_bg');

        // Overlay darken
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

        const briefing = LEVEL_BRIEFINGS[level] ?? LEVEL_BRIEFINGS[0];

        // Title
        drawCenteredText(ctx, briefing.title, 100, 'bold 24px monospace', '#0f0');

        // Horizontal rule
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(100, 120);
        ctx.lineTo(PLAY_AREA_W - 100, 120);
        ctx.stroke();

        // Objectives header
        drawCenteredText(ctx, 'MISSION OBJECTIVES', 160, '16px monospace', '#ff0');

        // Objectives (revealed progressively)
        const totalChars = briefing.objectives.join('').length;
        let charsShown = Math.floor(totalChars * this.textRevealProgress);

        for (let i = 0; i < briefing.objectives.length; i++) {
            const obj = briefing.objectives[i];
            const visibleLen = Math.min(obj.length, charsShown);
            const visibleText = obj.substring(0, visibleLen);
            charsShown -= visibleLen;

            if (visibleText.length > 0) {
                drawCenteredText(
                    ctx,
                    `► ${visibleText}`,
                    210 + i * 30,
                    '14px monospace',
                    '#ccc',
                );
            }
            if (charsShown <= 0) break;
        }

        // Warning
        if (this.textRevealProgress >= 1) {
            ctx.fillStyle = '#f80';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            const warningLines = briefing.warning.split('\n');
            for (let i = 0; i < warningLines.length; i++) {
                ctx.fillText(warningLines[i], PLAY_AREA_W / 2, 360 + i * 18);
            }
            ctx.textAlign = 'left';

            drawBlinkingText(ctx, 'PRESS SPACE TO LAUNCH', 450, '16px monospace', '#0f0', this.timer);
        }
    }

    /** Advance the timer with real dt for smooth animations. */
    updateTimer(dt: number): void {
        this.timer += dt;
    }

    handleInput(input: Input): boolean {
        if (this.textRevealProgress < 1) {
            // Skip text reveal with any key press
            if (input.isKeyPressed(Input.SPACE) || input.isMousePressed()) {
                this.textRevealProgress = 1;
                this.timer = 3; // force fully revealed
                return false;
            }
            return false;
        }
        return input.isKeyPressed(Input.SPACE) || input.isMousePressed();
    }

    /** Reset for new level. */
    reset(): void {
        this.timer = 0;
        this.textRevealProgress = 0;
    }
}

// ============================================================================
// CustomizeScreen — Ship power distribution and turret angles
// ============================================================================

/** Shallow-clone a PowerSetting so we don't mutate the original. */
function cloneSetting(s: PowerSetting): PowerSetting {
    return { ...s };
}

export class CustomizeScreen {
    private selectedRow = 0;
    private timer = 0;

    private readonly ROWS = [
        { label: 'BLASTER POWER',    cell1Key: 'blasterCell1'      as const, cell2Key: 'blasterCell2'      as const },
        { label: 'LEFT TURRET PWR',  cell1Key: 'leftTurretCell1'   as const, cell2Key: 'leftTurretCell2'   as const },
        { label: 'RIGHT TURRET PWR', cell1Key: 'rightTurretCell1'  as const, cell2Key: 'rightTurretCell2'  as const },
        { label: 'LEFT MISSILE PWR', cell1Key: 'leftMissileCell1'  as const, cell2Key: 'leftMissileCell2'  as const },
        { label: 'RIGHT MISSILE PWR',cell1Key: 'rightMissileCell1' as const, cell2Key: 'rightMissileCell2' as const },
        { label: 'SHIP POWER',       cell1Key: 'shipPowerCell1'    as const, cell2Key: 'shipPowerCell2'    as const },
    ];

    render(ctx: CanvasRenderingContext2D, assets: AssetLoader, config: PowerSetting): void {
        this.timer += 1 / 60;

        drawBackground(ctx, assets, 'customize_bg');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

        // Title
        drawCenteredText(ctx, 'SHIP CUSTOMIZATION', 50, 'bold 24px monospace', '#0ff');

        // Power distribution grid
        const startY = 100;
        const rowHeight = 40;

        for (let i = 0; i < this.ROWS.length; i++) {
            const row = this.ROWS[i];
            const y = startY + i * rowHeight;
            const selected = i === this.selectedRow;

            // Row highlight
            if (selected) {
                ctx.fillStyle = 'rgba(0, 128, 255, 0.15)';
                ctx.fillRect(40, y - 14, PLAY_AREA_W - 80, rowHeight - 4);
            }

            // Label
            ctx.font = selected ? 'bold 14px monospace' : '13px monospace';
            ctx.fillStyle = selected ? '#0ff' : '#888';
            ctx.fillText(row.label, 60, y);

            // Cell values
            const val1 = config[row.cell1Key] as number;
            const val2 = config[row.cell2Key] as number;
            const total = val1 + val2;

            // Power bar visualization
            const barX = 300;
            const barW = 200;
            const barH = 12;
            ctx.fillStyle = '#222';
            ctx.fillRect(barX, y - 10, barW, barH);

            const fillW = (total / 5) * barW; // max 5
            ctx.fillStyle = total >= 4 ? '#f80' : total >= 2 ? '#0f0' : '#555';
            ctx.fillRect(barX, y - 10, fillW, barH);

            ctx.strokeStyle = '#444';
            ctx.strokeRect(barX, y - 10, barW, barH);

            // Numeric value
            ctx.font = '14px monospace';
            ctx.fillStyle = '#fff';
            ctx.fillText(`${total}/5`, barX + barW + 15, y);

            // Selection arrows
            if (selected) {
                ctx.fillStyle = '#0ff';
                ctx.fillText('◄', barX - 20, y);
                ctx.fillText('►', barX + barW + 50, y);
            }
        }

        // Turret angle section
        const angleY = startY + this.ROWS.length * rowHeight + 30;
        drawCenteredText(ctx, 'TURRET ANGLES', angleY, '16px monospace', '#ff0');

        ctx.font = '13px monospace';
        ctx.fillStyle = '#aaa';
        ctx.fillText(`Left Turret:  ${config.leftTurretAngle}°`, 120, angleY + 30);
        ctx.fillText(`Right Turret: ${config.rightTurretAngle}°`, 120, angleY + 50);

        // Instructions
        drawCenteredText(ctx, '↑↓ SELECT  |  ←→ ADJUST  |  SPACE TO CONTINUE',
            SCREEN_H - 40, '12px monospace', '#666');

        drawBlinkingText(ctx, 'PRESS SPACE WHEN READY', SCREEN_H - 70, '14px monospace', '#0f0', this.timer);
    }

    /** Advance the timer with real dt for smooth animations. */
    updateTimer(dt: number): void {
        this.timer += dt;
    }

    handleInput(input: Input, config: PowerSetting): PowerSetting {
        const updated = cloneSetting(config);

        // Navigate rows
        if (input.isKeyPressed(Input.UP)) {
            this.selectedRow = Math.max(0, this.selectedRow - 1);
        }
        if (input.isKeyPressed(Input.DOWN)) {
            this.selectedRow = Math.min(this.ROWS.length - 1, this.selectedRow + 1);
        }

        // Adjust values
        const row = this.ROWS[this.selectedRow];
        const cell1Key = row.cell1Key;
        const cell2Key = row.cell2Key;
        const current = (updated[cell1Key] as number) + (updated[cell2Key] as number);

        if (input.isKeyPressed(Input.RIGHT) && current < 5) {
            // Distribute to cell2 first, then cell1
            if ((updated[cell2Key] as number) < 3) {
                (updated[cell2Key] as number) += 1;
            } else {
                (updated[cell1Key] as number) += 1;
            }
        }
        if (input.isKeyPressed(Input.LEFT) && current > 0) {
            if ((updated[cell1Key] as number) > 0) {
                (updated[cell1Key] as number) -= 1;
            } else {
                (updated[cell2Key] as number) -= 1;
            }
        }

        return updated;
    }

    /** Check if player wants to proceed. */
    isReady(input: Input): boolean {
        return input.isKeyPressed(Input.SPACE) || input.isMousePressed();
    }
}

// ============================================================================
// GameOverScreen
// ============================================================================

export class GameOverScreen {
    private timer = 0;

    render(ctx: CanvasRenderingContext2D, score: number, assets: AssetLoader): void {
        this.timer += 1 / 60;

        drawBackground(ctx, assets, 'gameover_bg');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

        // Game Over text with red glow
        ctx.save();
        ctx.shadowColor = '#f00';
        ctx.shadowBlur = 30;
        drawCenteredText(ctx, 'GAME OVER', 200, 'bold 48px monospace', '#f00');
        ctx.restore();

        // Score
        drawCenteredText(ctx, 'FINAL SCORE', 290, '16px monospace', '#888');
        drawCenteredText(ctx, score.toString().padStart(8, '0'), 325, 'bold 28px monospace', '#fff');

        // Prompt
        drawBlinkingText(ctx, 'PRESS SPACE TO CONTINUE', 420, '16px monospace', '#aaa', this.timer);
    }

    /** Advance the timer with real dt for smooth animations. */
    updateTimer(dt: number): void {
        this.timer += dt;
    }

    handleInput(input: Input): boolean {
        return input.isKeyPressed(Input.SPACE) || input.isMousePressed();
    }
}

// ============================================================================
// VictoryScreen
// ============================================================================

export class VictoryScreen {
    private timer = 0;
    private statsRevealed = false;

    render(ctx: CanvasRenderingContext2D, score: number, rank: string, assets: AssetLoader): void {
        this.timer += 1 / 60;

        drawBackground(ctx, assets, 'victory_bg');

        // Subtle overlay
        ctx.fillStyle = 'rgba(0, 0, 20, 0.5)';
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

        // Victory header with golden glow
        ctx.save();
        ctx.shadowColor = '#ff0';
        ctx.shadowBlur = 25;
        drawCenteredText(ctx, 'VICTORY', 120, 'bold 52px monospace', '#ff0');
        ctx.restore();

        drawCenteredText(ctx, 'THE INVASION HAS BEEN REPELLED', 165, '14px monospace', '#aaa');

        // Stats panel (reveal after delay)
        if (this.timer > 1.0) {
            this.statsRevealed = true;
        }

        if (this.statsRevealed) {
            // Panel background
            ctx.fillStyle = 'rgba(0, 20, 40, 0.8)';
            ctx.strokeStyle = '#0af';
            ctx.lineWidth = 1;
            const panelX = PLAY_AREA_W / 2 - 160;
            const panelY = 210;
            const panelW = 320;
            const panelH = 160;
            ctx.fillRect(panelX, panelY, panelW, panelH);
            ctx.strokeRect(panelX, panelY, panelW, panelH);

            // Score
            drawCenteredText(ctx, 'FINAL SCORE', 245, '14px monospace', '#888');
            drawCenteredText(ctx, score.toString().padStart(8, '0'), 275, 'bold 24px monospace', '#fff');

            // Rank
            drawCenteredText(ctx, 'RANK ACHIEVED', 310, '14px monospace', '#888');
            const rankColor = rank === 'PONDEROSA' ? '#f0f' :
                              rank === 'GOD' ? '#ff0' :
                              rank === 'SAVIOR' ? '#0ff' : '#0f0';
            drawCenteredText(ctx, rank, 340, 'bold 20px monospace', rankColor);

            // Determine achievement text
            let achievement = '';
            if (score >= 50000) achievement = '★ LEGENDARY PILOT ★';
            else if (score >= 25000) achievement = '★ ELITE PILOT ★';
            else if (score >= 10000) achievement = '★ SKILLED PILOT ★';
            else achievement = '★ MISSION COMPLETE ★';

            drawCenteredText(ctx, achievement, 390, '12px monospace', '#ff0');
        }

        // Continue prompt
        if (this.timer > 2.0) {
            drawBlinkingText(ctx, 'PRESS SPACE TO CONTINUE', 470, '16px monospace', '#0f0', this.timer);
        }
    }

    /** Advance the timer with real dt for smooth animations. */
    updateTimer(dt: number): void {
        this.timer += dt;
    }

    handleInput(input: Input): boolean {
        if (this.timer < 2.0) return false;
        return input.isKeyPressed(Input.SPACE) || input.isMousePressed();
    }

    /** Reset for replay. */
    reset(): void {
        this.timer = 0;
        this.statsRevealed = false;
    }
}
