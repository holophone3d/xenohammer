/**
 * HUD / Console overlay — right side panel (150px) + status bars.
 * Matches console_positions from game-constants.json.
 */

import { GameCanvas } from '../engine';
import type { Player } from './Player';
import { PLAY_AREA_W, PLAY_AREA_H } from './Collision';
import { RANKINGS } from '../data/ships';

const CONSOLE_X = PLAY_AREA_W;                // 650
const CONSOLE_W = 150;
const SCREEN_W = CONSOLE_X + CONSOLE_W;       // 800

// Bar positions (relative to screen, from game-constants.json)
const ARMOR_X = 740;
const ARMOR_Y = 565;
const SHIELDS_X = 667;
const SHIELDS_Y = 565;
const BAR_W = 45;

export class HUD {
    draw(
        canvas: GameCanvas,
        player: Player | null,
        score: number,
        level: number,
        levelTimer: number,
        levelDuration: number,
    ): void {
        const ctx = canvas.ctx;

        // Console background
        ctx.fillStyle = '#111';
        ctx.fillRect(CONSOLE_X, 0, CONSOLE_W, PLAY_AREA_H);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(CONSOLE_X, 0, CONSOLE_W, PLAY_AREA_H);

        // --- Score ---
        ctx.font = '12px monospace';
        ctx.fillStyle = '#0f0';
        ctx.fillText('SCORE', CONSOLE_X + 10, 20);
        ctx.fillStyle = '#fff';
        ctx.fillText(score.toString().padStart(8, '0'), CONSOLE_X + 10, 34);

        // --- Level ---
        ctx.fillStyle = '#0f0';
        ctx.fillText(`LEVEL ${level + 1}`, CONSOLE_X + 10, 56);

        // --- Timer ---
        const remaining = Math.max(0, levelDuration - levelTimer);
        const mins = Math.floor(remaining / 60);
        const secs = Math.floor(remaining % 60);
        ctx.fillStyle = remaining < 10 ? '#f00' : '#ff0';
        ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, CONSOLE_X + 90, 56);

        if (!player) return;

        // --- Rank ---
        const rank = this.getRank(player.kills);
        ctx.fillStyle = '#aaa';
        ctx.fillText(rank, CONSOLE_X + 10, 78);

        // --- Armor Bar ---
        this.drawBar(ctx, ARMOR_X, ARMOR_Y, BAR_W, player.armor, player.maxArmor, '#f00', 'ARM');

        // --- Shield Bar ---
        this.drawBar(ctx, SHIELDS_X, SHIELDS_Y, BAR_W, player.shields, player.maxShields, '#00f', 'SHD');

        // --- Weapon Status Indicators ---
        const weaponNames = ['BLS', 'LT', 'RT', 'LM', 'RM'];
        const setting = player.powerPlant.getSetting();
        const cellValues = [
            setting.blasterCell1 + setting.blasterCell2,
            setting.leftTurretCell1 + setting.leftTurretCell2,
            setting.rightTurretCell1 + setting.rightTurretCell2,
            setting.leftMissileCell1 + setting.leftMissileCell2,
            setting.rightMissileCell1 + setting.rightMissileCell2,
        ];

        for (let i = 0; i < 5; i++) {
            const wy = 100 + i * 18;
            const enabled = player.weapons[i].enabled;
            ctx.fillStyle = enabled ? '#0f0' : '#600';
            ctx.fillText(weaponNames[i], CONSOLE_X + 10, wy);
            ctx.fillStyle = '#888';
            ctx.fillText(`P${cellValues[i]}`, CONSOLE_X + 50, wy);
        }

        // --- Power Setting ---
        ctx.fillStyle = '#ff0';
        ctx.fillText(`PWR SET: ${player.powerPlant.currentSetting + 1}`, CONSOLE_X + 10, 200);

        // --- Engine/Shield Power ---
        const shipPower = setting.shipPowerCell1 + setting.shipPowerCell2;
        ctx.fillStyle = '#0ff';
        ctx.fillText(`ENG: ${shipPower}`, CONSOLE_X + 10, 220);
        ctx.fillText(`SHD: ${shipPower}`, CONSOLE_X + 80, 220);

        // --- Kill Count ---
        ctx.fillStyle = '#aaa';
        ctx.fillText(`KILLS: ${player.kills}`, CONSOLE_X + 10, 250);

        // --- Separator line above armor/shields ---
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(CONSOLE_X, PLAY_AREA_H - 50);
        ctx.lineTo(SCREEN_W, PLAY_AREA_H - 50);
        ctx.stroke();
    }

    private drawBar(
        ctx: CanvasRenderingContext2D,
        x: number, y: number, w: number,
        value: number, max: number,
        color: string, label: string,
    ): void {
        // Label
        ctx.fillStyle = '#aaa';
        ctx.font = '10px monospace';
        ctx.fillText(label, x, y - 4);

        // Background
        ctx.fillStyle = '#222';
        ctx.fillRect(x, y, w, 8);

        // Fill
        const fillW = max > 0 ? (value / max) * w : 0;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, fillW, 8);

        // Border
        ctx.strokeStyle = '#555';
        ctx.strokeRect(x, y, w, 8);
    }

    private getRank(kills: number): string {
        let rank = RANKINGS[0].rank;
        for (const r of RANKINGS) {
            if (kills >= r.minKills) rank = r.rank;
        }
        return rank;
    }
}
