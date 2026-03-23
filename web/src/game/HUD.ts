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
const BAR_MAX_H = 100;

export class HUD {
    private consoleSprite: HTMLImageElement | null = null;
    private speedShipSprite: HTMLImageElement | null = null;

    loadSprites(assets: AssetLoader): void {
        try { this.consoleSprite = assets.getImage('console'); } catch { /* not available */ }
        try { this.speedShipSprite = assets.getImage('speed_ship'); } catch { /* not available */ }
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

        // Score
        ctx.font = '12px monospace';
        ctx.fillStyle = '#0f0';
        ctx.fillText('SCORE', 660, 20);
        ctx.fillStyle = '#fff';
        ctx.fillText(score.toString().padStart(8, '0'), 660, 34);

        // Level
        ctx.fillStyle = '#0f0';
        ctx.fillText(`LEVEL ${level + 1}`, 660, 56);

        // Timer (M:SS, red if < 10s)
        const remaining = Math.max(0, timeRemaining);
        const mins = Math.floor(remaining / 60);
        const secs = Math.floor(remaining % 60);
        ctx.fillStyle = remaining < 10 ? '#f00' : '#ff0';
        ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, 740, 56);

        // Rank
        const rank = this.getRank(kills);
        ctx.fillStyle = '#aaa';
        ctx.fillText(rank, 660, 78);

        if (!player) return;

        // Weapon status indicators (small colored squares)
        const weaponLabels = ['BLS', 'LT', 'RT', 'LM', 'RM'];
        const weaponColors = ['#0f0', '#0ff', '#0ff', '#ff0', '#ff0'];
        for (let i = 0; i < Math.min(5, player.weapons.length); i++) {
            const wy = 100 + i * 18;
            const enabled = player.weapons[i].enabled;
            ctx.fillStyle = enabled ? weaponColors[i] : '#600';
            ctx.fillRect(660, wy - 8, 8, 8);
            ctx.fillStyle = enabled ? '#fff' : '#666';
            ctx.font = '10px monospace';
            ctx.fillText(weaponLabels[i], 672, wy);
        }

        // Power setting
        ctx.font = '12px monospace';
        ctx.fillStyle = '#ff0';
        ctx.fillText(`PWR SET: ${player.powerPlant.currentSetting + 1}`, 660, 200);

        // Speed ship animation area
        if (this.speedShipSprite) {
            ctx.drawImage(this.speedShipSprite, 680, 400);
        }

        // Shield bar (grows upward from y=565)
        this.drawBar(ctx, SHIELD_BAR_X, SHIELD_BAR_Y, BAR_W, player.shields, player.maxShields, '#00f', 'SHD');

        // Armor bar (grows upward from y=565)
        this.drawBar(ctx, ARMOR_BAR_X, ARMOR_BAR_Y, BAR_W, player.armor, player.maxArmor, '#f00', 'ARM');
    }

    private drawBar(
        ctx: CanvasRenderingContext2D,
        x: number, y: number, w: number,
        value: number, max: number,
        color: string, label: string,
    ): void {
        const ratio = max > 0 ? Math.min(1, value / max) : 0;
        const fillH = Math.floor(BAR_MAX_H * ratio);

        // Background
        ctx.fillStyle = '#222';
        ctx.fillRect(x, y - BAR_MAX_H, w, BAR_MAX_H);

        // Fill (grows upward from bottom)
        ctx.fillStyle = color;
        ctx.fillRect(x, y - fillH, w, fillH);

        // Border
        ctx.strokeStyle = '#555';
        ctx.strokeRect(x, y - BAR_MAX_H, w, BAR_MAX_H);

        // Label below bar
        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        ctx.fillText(label, x, y + 12);
    }

    private getRank(kills: number): string {
        let rank = RANKINGS[0].rank;
        for (const r of RANKINGS) {
            if (kills >= r.minKills) rank = r.rank;
        }
        return rank;
    }
}
