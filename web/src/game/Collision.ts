/**
 * AABB collision detection for the play area (650×600).
 */

export const PLAY_AREA_W = 650;
export const PLAY_AREA_H = 600;

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
}

export function isOutOfBounds(x: number, y: number, margin = 64): boolean {
    return x < -margin || x > PLAY_AREA_W + margin ||
           y < -margin || y > PLAY_AREA_H + margin;
}

export function clampToPlayArea(x: number, y: number, w: number, h: number): { x: number; y: number } {
    return {
        x: Math.max(0, Math.min(PLAY_AREA_W - w, x)),
        y: Math.max(0, Math.min(PLAY_AREA_H - h, y)),
    };
}
