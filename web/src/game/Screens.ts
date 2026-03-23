/**
 * Screen rendering helpers for GameManager states.
 * These are pure render functions — no state management.
 */

import { AssetLoader } from '../engine';

const SCREEN_W = 800;
const SCREEN_H = 600;

/** Draw a fullscreen background image, or dark gradient fallback */
export function drawBackground(ctx: CanvasRenderingContext2D, assets: AssetLoader, imageId: string): boolean {
    const img = assets.tryGetImage(imageId);
    if (img) {
        ctx.drawImage(img, 0, 0, SCREEN_W, SCREEN_H);
        return true;
    }
    // Fallback gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_H);
    gradient.addColorStop(0, '#000020');
    gradient.addColorStop(1, '#000008');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    return false;
}

/** Draw centered text */
export function drawCentered(
    ctx: CanvasRenderingContext2D,
    text: string, y: number,
    font: string, color: string
): void {
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, SCREEN_W / 2, y);
    ctx.restore();
}

/** Draw text that blinks on/off */
export function drawBlinking(
    ctx: CanvasRenderingContext2D,
    text: string, y: number,
    font: string, color: string,
    time: number, rate = 1.5
): void {
    if (Math.sin(time * rate * Math.PI * 2) > 0) {
        drawCentered(ctx, text, y, font, color);
    }
}

/** Draw a progress bar */
export function drawProgressBar(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    progress: number, color = '#0f0', bgColor = '#333'
): void {
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, progress)), h);
}

/** Draw the start screen */
export function renderStartScreen(
    ctx: CanvasRenderingContext2D,
    assets: AssetLoader,
    time: number
): void {
    drawBackground(ctx, assets, 'XenoStart');
    drawCentered(ctx, 'Start Game', 580, '26px sans-serif', '#0f0');
    drawBlinking(ctx, 'Click or press SPACE', 550, '14px monospace', '#aaa', time);
}

/** Draw the ready room with 3 interactive zones */
export function renderReadyRoom(
    ctx: CanvasRenderingContext2D,
    assets: AssetLoader,
    mouseX: number, mouseY: number,
    level: number, levelBriefed: number
): void {
    drawBackground(ctx, assets, 'room');

    // Zone highlights
    const zones = [
        { x: 10, y: 260, w: 208, h: 120, label: 'Ship Customization', id: 'customize' },
        { x: 200, y: 185, w: 200, h: 33, label: 'Briefing & Options', id: 'options' },
        { x: 601, y: 0, w: 199, h: 540, label: 'Launch', id: 'launch' },
    ];

    for (const zone of zones) {
        const hover = mouseX >= zone.x && mouseX <= zone.x + zone.w &&
                      mouseY >= zone.y && mouseY <= zone.y + zone.h;
        if (hover) {
            ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
            ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
        }

        ctx.save();
        ctx.font = hover ? '22px sans-serif' : '18px sans-serif';
        ctx.fillStyle = hover ? '#0f0' : '#8f8';
        ctx.textAlign = 'center';
        ctx.fillText(zone.label, zone.x + zone.w / 2, zone.y + zone.h / 2 + 6);
        ctx.restore();
    }

    // Contextual message at bottom
    ctx.save();
    ctx.font = '14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'center';
    let msg = 'Click on a screen or the launch door';
    if (level === 0 && levelBriefed < 1) msg = 'Read the briefing before your first mission';
    else if (level === 0) msg = 'Launch into the Outer Earth Sector';
    else if (level === 1) msg = 'Penetrate the Outer Defense Matrix';
    else if (level === 2) msg = 'Destroy the Nexus Core';
    else if (level >= 3) msg = 'You Have Completed the Mission!';
    ctx.fillText(msg, 400, 580);
    ctx.restore();
}

/** Detect which ready room zone was clicked. Returns 'customize'|'options'|'launch'|null */
export function getReadyRoomClick(mouseX: number, mouseY: number): string | null {
    if (mouseX >= 10 && mouseX <= 218 && mouseY >= 260 && mouseY <= 380) return 'customize';
    if (mouseX >= 200 && mouseX <= 400 && mouseY >= 185 && mouseY <= 218) return 'options';
    if (mouseX >= 601 && mouseX <= 800 && mouseY >= 0 && mouseY <= 540) return 'launch';
    return null;
}

/** Draw loading screen with progress bar */
export function renderLoadingScreen(
    ctx: CanvasRenderingContext2D,
    progress: number
): void {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    drawCentered(ctx, 'XENOHAMMER', 260, '32px monospace', '#0f0');
    drawCentered(ctx, 'Loading...', 300, '16px monospace', '#aaa');
    drawProgressBar(ctx, 250, 330, 300, 20, progress);
    drawCentered(ctx, `${Math.floor(progress * 100)}%`, 370, '14px monospace', '#666');
}

/** Draw game over screen */
export function renderGameOverScreen(
    ctx: CanvasRenderingContext2D,
    assets: AssetLoader,
    score: number,
    time: number
): void {
    if (!drawBackground(ctx, assets, 'game_over')) {
        drawCentered(ctx, 'GAME OVER', 250, '32px monospace', '#f00');
    }
    drawCentered(ctx, `Score: ${score}`, 400, '20px monospace', '#fff');
    if (time > 3) {
        drawBlinking(ctx, 'Press SPACE to continue', 450, '14px monospace', '#aaa', time);
    }
}

/** Draw victory/aftermath screen */
export function renderVictoryScreen(
    ctx: CanvasRenderingContext2D,
    assets: AssetLoader,
    score: number,
    kills: number,
    rank: string,
    time: number
): void {
    drawBackground(ctx, assets, 'aftermath');
    drawCentered(ctx, 'MISSION COMPLETE', 120, '28px monospace', '#ff0');
    drawCentered(ctx, `Score: ${score}`, 200, '20px monospace', '#fff');
    drawCentered(ctx, `Kills: ${kills}`, 230, '16px monospace', '#aaa');
    drawCentered(ctx, `Rank: ${rank}`, 260, '18px monospace', '#0f0');
    if (time > 3) {
        drawBlinking(ctx, 'Press SPACE to continue', 400, '14px monospace', '#aaa', time);
    }
}

/** Draw level start overlay */
export function renderLevelStartOverlay(
    ctx: CanvasRenderingContext2D,
    level: number,
    elapsed: number
): void {
    if (elapsed < 0.6 || elapsed > 4.0) return;
    const alpha = elapsed < 1.5 ? (elapsed - 0.6) / 0.9 : elapsed > 3.0 ? (4.0 - elapsed) / 1.0 : 1.0;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.font = '48px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${level + 1}`, 325, 300);
    ctx.globalAlpha = 1;
    ctx.restore();
}

/** Draw level end overlay */
export function renderLevelEndOverlay(
    ctx: CanvasRenderingContext2D,
    level: number,
    timeRemaining: number
): void {
    if (timeRemaining > 5) return;
    const alpha = Math.min(1, (5 - timeRemaining) / 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '36px monospace';
    ctx.fillStyle = '#0f0';
    ctx.textAlign = 'center';
    ctx.fillText(`END OF LEVEL ${level + 1}`, 325, 300);
    ctx.globalAlpha = 1;
    ctx.restore();
}
