/**
 * AABB + pixel-level collision detection for the play area (650×600).
 * Mirrors the original C++ CollisionDetection::Sprite_Collide:
 *   1. Fast AABB rejection
 *   2. Pixel-level scan on the overlap region using 1-bit alpha masks
 */

export const PLAY_AREA_W = 650;
export const PLAY_AREA_H = 600;

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

/** Anything that can participate in pixel-level collision. */
export interface Collider {
    x: number;
    y: number;
    w: number;
    h: number;
    /** 1-bit alpha mask (w × h), row-major. null = treat as solid (AABB only). */
    mask: Uint8Array | null;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.w &&
           a.x + a.w > b.x &&
           a.y < b.y + b.h &&
           a.y + a.h > b.y;
}

/**
 * Two-pass collision: AABB first, then pixel-level scan on overlap region.
 * If either collider has no mask, falls back to AABB-only.
 * Faithfully ports C++ CollisionDetection::Sprite_Collide.
 */
export function spriteCollide(a: Collider, b: Collider): boolean {
    // Pass 1: AABB rejection
    const left1 = a.x, right1 = a.x + a.w;
    const top1 = a.y, bottom1 = a.y + a.h;
    const left2 = b.x, right2 = b.x + b.w;
    const top2 = b.y, bottom2 = b.y + b.h;

    if (bottom1 < top2 || top1 > bottom2) return false;
    if (right1 < left2 || left1 > right2) return false;

    // If either has no mask, AABB hit is sufficient
    if (!a.mask || !b.mask) return true;

    // Pass 2: Pixel-level scan on overlap rectangle
    const overLeft = Math.max(left1, left2);
    const overRight = Math.min(right1, right2);
    const overTop = Math.max(top1, top2);
    const overBottom = Math.min(bottom1, bottom2);

    const overWidth = Math.floor(overRight - overLeft);
    const overHeight = Math.floor(overBottom - overTop);
    if (overWidth <= 0 || overHeight <= 0) return false;

    const aStartX = Math.floor(overLeft - a.x);
    const aStartY = Math.floor(overTop - a.y);
    const bStartX = Math.floor(overLeft - b.x);
    const bStartY = Math.floor(overTop - b.y);

    const aw = Math.floor(a.w);
    const bw = Math.floor(b.w);

    for (let row = 0; row < overHeight; row++) {
        const aRowOff = (aStartY + row) * aw + aStartX;
        const bRowOff = (bStartY + row) * bw + bStartX;
        for (let col = 0; col < overWidth; col++) {
            if (a.mask[aRowOff + col] > 0 && b.mask[bRowOff + col] > 0) {
                return true;
            }
        }
    }

    return false;
}

export function isOutOfBounds(x: number, y: number, margin = 0): boolean {
    return x < -margin || x > PLAY_AREA_W + margin ||
           y < -margin || y > PLAY_AREA_H + margin;
}

export function clampToPlayArea(x: number, y: number, w: number, h: number): { x: number; y: number } {
    return {
        x: Math.max(0, Math.min(PLAY_AREA_W - w, x)),
        y: Math.max(0, Math.min(PLAY_AREA_H - h, y)),
    };
}
