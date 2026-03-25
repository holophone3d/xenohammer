/**
 * Parallax starfield background — Section 12 of SPEC.md.
 * 600 stars at varying depths (z: 1–300) scrolling downward with parallax.
 * Includes Earth and Moon celestial bodies (level 1 only).
 *
 * C++ StarField.cpp MoveStars model:
 *   All stars: y += speed (raw increment, same for all)
 *   Screen projection: yscr = y / z (closer = faster on screen)
 *   Web equivalent at 60fps: screen_speed = speed * 60 / z
 */

import { AssetLoader } from '../engine';
const SCREEN_W = 800;
const SCREEN_H = 600;

interface Star {
    x: number;
    y: number;
    z: number;
    size: number;
    color: string;
}

const MAX_STARS = 600;
const STAR_DISTANCE = 300;
const DEFAULT_SPEED = 30;
// C++ MoveStars is frame-rate-dependent; we convert assuming ~60fps target
const REFERENCE_FPS = 60;

// Initial positions matching reference screenshots
const EARTH_START_Y = 300;
const MOON_START_Y = 30;

export class StarField {
    private stars: Star[] = [];
    speed = DEFAULT_SPEED;
    private elapsed = 0;

    private earthSprite: HTMLImageElement | null = null;
    private moonSprite: HTMLImageElement | null = null;
    private earthY = EARTH_START_Y;
    private moonY = MOON_START_Y;
    private moonX = 0;
    private bodiesStopped = false;

    // C++ uses YSCALE=600: Earth vel=30 → 30/600*1000=50px/s, Moon vel=18 → 18/600*1000=30px/s
    private static readonly EARTH_SCREEN_SPEED = 50;
    private static readonly MOON_SCREEN_SPEED = 30;

    constructor(assets?: AssetLoader) {
        for (let i = 0; i < MAX_STARS; i++) {
            this.stars.push(this.createStar(true));
        }
        if (assets) this.loadSprites(assets);
    }

    reset(): void {
        this.elapsed = 0;
        this.earthY = EARTH_START_Y;
        this.moonY = MOON_START_Y;
        this.bodiesStopped = false;
    }

    loadSprites(assets: AssetLoader): void {
        try { this.earthSprite = assets.getImage('earth'); } catch { /* not available */ }
        try { this.moonSprite = assets.getImage('moon'); } catch { /* not available */ }
    }

    private createStar(randomY: boolean): Star {
        const z = Math.random() * STAR_DISTANCE + 1;
        const brightness = Math.floor(255 * (1 - z / STAR_DISTANCE));
        const b = Math.max(40, brightness);

        const tint = Math.random();
        let r: number, g: number, blue: number;
        if (tint < 0.6) {
            r = b; g = b; blue = b;                                       // white
        } else if (tint < 0.8) {
            r = Math.floor(b * 0.7); g = Math.floor(b * 0.8); blue = b;   // blue-tint
        } else {
            r = b; g = Math.floor(b * 0.9); blue = Math.floor(b * 0.6);   // warm-tint
        }

        return {
            x: Math.random() * SCREEN_W,
            y: randomY ? Math.random() * SCREEN_H : -2,
            z,
            size: z < 100 ? 2 : 1,
            color: `rgb(${r},${g},${blue})`,
        };
    }

    update(dt: number): void {
        this.elapsed += dt;

        for (const star of this.stars) {
            // C++ MoveStars: y += speed (same for all), yscr = y / z
            // Effective screen speed = speed / z per frame = speed * fps / z per second
            const layerSpeed = (this.speed * REFERENCE_FPS) / star.z;
            star.y += layerSpeed * dt;

            if (star.y > SCREEN_H) {
                const fresh = this.createStar(false);
                star.x = fresh.x;
                star.y = fresh.y;
                star.z = fresh.z;
                star.size = fresh.size;
                star.color = fresh.color;
            }
        }

        // Scroll celestial bodies after 300ms delay; stop when Moon passes screen bottom
        if (this.elapsed >= 0.3 && !this.bodiesStopped) {
            this.earthY += StarField.EARTH_SCREEN_SPEED * dt;
            this.moonY += StarField.MOON_SCREEN_SPEED * dt;

            // C++: scrolling stops when Moon y > 600
            if (this.moonY > 600) {
                this.bodiesStopped = true;
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D, nearEarth = true): void {
        for (const star of this.stars) {
            ctx.fillStyle = star.color;
            ctx.fillRect(star.x | 0, star.y | 0, star.size, star.size);
        }

        if (nearEarth) {
            // C++ renders Moon first, then Earth on top (Earth is closer: z=150 vs Moon z=200)
            if (this.moonSprite) {
                ctx.drawImage(
                    this.moonSprite,
                    this.moonX,
                    this.moonY | 0,
                );
            }
            if (this.earthSprite) {
                ctx.drawImage(
                    this.earthSprite,
                    0,
                    this.earthY | 0,
                );
            }
        }
    }

    setSpeed(s: number): void {
        this.speed = s;
    }
}
