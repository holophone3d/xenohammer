/**
 * HUD / Console overlay — right side panel (150px) + status bars.
 * Section 13 of SPEC.md.
 */

import type { Player } from './Player';
import { PLAY_AREA_W, PLAY_AREA_H } from './Collision';
import { RANKINGS } from '../data/ships';
import { AssetLoader } from '../engine';

const CONSOLE_X = PLAY_AREA_W;          // 650
const CONSOLE_W = 150;

const SHIELD_BAR_X = 667;
const SHIELD_BAR_Y = 565;
const ARMOR_BAR_X = 740;
const ARMOR_BAR_Y = 565;
const BAR_W = 45;

/** Compute bar color using the original C++ formula from GUI.cpp:805-813.
 *  >= 150: R=(val*-0.015)+4.5, G=1.0, B=0 (green → yellow)
 *  < 150: R=1.0, G=val*0.0066, B=0 (yellow → red) */
function getBarColor(value: number): string {
    let r: number, g: number;
    if (value >= 150) {
        r = Math.max(0, Math.min(1, (value * -0.015) + 4.5));
        g = 1.0;
    } else if (value > 0) {
        r = 1.0;
        g = Math.max(0, Math.min(1, value * 0.0066));
    } else {
        r = 1.0;
        g = 0;
    }
    return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},0)`;
}

export class HUD {
    private consoleSprite: HTMLImageElement | null = null;

    loadSprites(assets: AssetLoader): void {
        try { this.consoleSprite = assets.getImage('console'); } catch { /* not available */ }
    }

    draw(
        ctx: CanvasRenderingContext2D,
        player: Player | null,
        score: number,
        level: number,
        timeRemaining: number,
        kills: number,
    ): void {
        // Console background
        if (this.consoleSprite) {
            ctx.drawImage(this.consoleSprite, CONSOLE_X, 0);
        } else {
            ctx.fillStyle = '#111';
            ctx.fillRect(CONSOLE_X, 0, CONSOLE_W, PLAY_AREA_H);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(CONSOLE_X, 0, CONSOLE_W, PLAY_AREA_H);
        }

        if (!player) return;

        // Vertical offset — shift all HUD text/cells down to align with console sprite
        const dy = 12;

        // Rank — centered at top of panel
        const rank = this.getRank(kills);
        ctx.font = '12px XenoFont, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0f0';
        ctx.fillText(rank, 725, 12 + dy);
        ctx.textAlign = 'left';

        // Power cell bars (4×2px green) — positions from Console.h + offset
        ctx.fillStyle = '#0f0';
        this.drawCellBars(ctx, 719, 52 + dy, player.powerPlant.getBlasterRateCells());
        this.drawCellBars(ctx, 729, 52 + dy, player.powerPlant.getBlasterPowerCells());
        this.drawCellBars(ctx, 668, 80 + dy, player.powerPlant.getLeftTurretRateCells());
        this.drawCellBars(ctx, 678, 80 + dy, player.powerPlant.getLeftTurretPowerCells());
        this.drawCellBars(ctx, 768, 80 + dy, player.powerPlant.getRightTurretRateCells());
        this.drawCellBars(ctx, 778, 80 + dy, player.powerPlant.getRightTurretPowerCells());
        this.drawCellBars(ctx, 698, 83 + dy, player.powerPlant.getLeftMissileRateCells());
        this.drawCellBars(ctx, 708, 83 + dy, player.powerPlant.getLeftMissilePowerCells());
        this.drawCellBars(ctx, 738, 83 + dy, player.powerPlant.getRightMissileRateCells());
        this.drawCellBars(ctx, 748, 83 + dy, player.powerPlant.getRightMissilePowerCells());
        this.drawCellBars(ctx, 718, 122 + dy, player.powerPlant.getShieldCells());
        this.drawCellBars(ctx, 728, 122 + dy, player.powerPlant.getEngineCells());

        // Kills
        ctx.font = '12px XenoFont, monospace';
        ctx.fillStyle = '#0f0';
        ctx.fillText('Kills', 660, 130 + dy);
        ctx.textAlign = 'right';
        ctx.fillText(kills.toString(), 790, 130 + dy);
        ctx.textAlign = 'left';

        // Power settings (30px spacing)
        const setting = player.powerPlant.currentSetting;
        const settingLabels = ["speed setting 'Q'", "power setting 'W'", "armor setting 'E'"];
        const settingY = [190 + dy, 220 + dy, 250 + dy];
        ctx.font = '12px XenoFont, monospace';
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = setting === i ? '#0f0' : '#9b9b9b';
            ctx.fillText(settingLabels[i], 660, settingY[i]);
        }

        // RU's
        ctx.font = '12px XenoFont, monospace';
        ctx.fillStyle = '#0f0';
        ctx.fillText("RU's", 660, 280 + dy);
        ctx.fillText(player.powerPlant.resourceUnits.toString(), 700, 280 + dy);

        // Shield/Armor labels
        ctx.font = '12px XenoFont, monospace';
        ctx.fillStyle = '#0f0';
        ctx.textAlign = 'center';
        ctx.fillText('Shields', 688, 335 + dy);
        ctx.fillText('Armor', 760, 335 + dy);
        ctx.textAlign = 'left';

        // Shield bar (grows upward from y=565) — dynamic color
        this.drawHealthBar(ctx, SHIELD_BAR_X, SHIELD_BAR_Y, BAR_W, player.shields, player.maxShields);

        // Armor bar (grows upward from y=565) — dynamic color
        this.drawHealthBar(ctx, ARMOR_BAR_X, ARMOR_BAR_Y, BAR_W, player.armor, player.maxArmor);
    }

    /** Draw health bar with dynamic green→yellow→red color from original C++ formula.
     *  C++ draws directly on console texture with no background or border. */
    private drawHealthBar(
        ctx: CanvasRenderingContext2D,
        x: number, y: number, w: number,
        value: number, max: number,
    ): void {
        // Bar height: value * 0.666 per original (300 HP → 200px)
        const fillH = Math.floor(value * 0.666);

        // Fill (grows upward from bottom) with dynamic color — no background, no border
        if (fillH > 0) {
            ctx.fillStyle = getBarColor(value);
            ctx.fillRect(x, y - fillH, w, fillH);
        }
    }

    /** Draw power cell bars — 4×2px green blocks stacked upward (4px stride).
     *  C++ formula: fill_rect(X, Y-((i*4)+2), X+4, (Y-(i*4))-4) → 2px tall, 2px gap. */
    private drawCellBars(ctx: CanvasRenderingContext2D, x: number, y: number, cells: number): void {
        ctx.fillStyle = '#0f0';
        for (let i = 0; i < cells; i++) {
            ctx.fillRect(x, y - (i * 4 + 4), 4, 2);
        }
    }

    private getRank(kills: number): string {
        let rank = RANKINGS[0].rank;
        for (const r of RANKINGS) {
            if (kills >= r.minKills) rank = r.rank;
        }
        return rank;
    }
}
