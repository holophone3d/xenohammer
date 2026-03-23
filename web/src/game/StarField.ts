/**
 * Parallax starfield background — Section 12 of SPEC.md.
 * 600 stars at varying depths (z: 1–300) scrolling downward with parallax.
 * Includes Earth (z=200) and Moon (z=400) celestial bodies.
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

export class StarField {
    private stars: Star[] = [];
    speed = DEFAULT_SPEED;
    private elapsed = 0;

    private earthSprite: HTMLImageElement | null = null;
    private moonSprite: HTMLImageElement | null = null;
    private earthY = 300;
    private moonY = 300;

    constructor(assets?: AssetLoader) {
        for (let i = 0; i < MAX_STARS; i++) {
            this.stars.push(this.createStar(true));
        }
        if (assets) this.loadSprites(assets);
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
            const layerSpeed = this.speed * (STAR_DISTANCE / (star.z + 1));
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

        // Scroll celestial bodies after 300ms
        if (this.elapsed >= 0.3) {
            const earthSpeed = this.speed * (STAR_DISTANCE / (200 + 1));
            this.earthY += earthSpeed * dt;

            const moonSpeed = this.speed * (STAR_DISTANCE / (400 + 1));
            this.moonY += moonSpeed * dt;
        }
    }

    draw(ctx: CanvasRenderingContext2D, nearEarth = true): void {
        for (const star of this.stars) {
            ctx.fillStyle = star.color;
            ctx.fillRect(star.x | 0, star.y | 0, star.size, star.size);
        }

        if (nearEarth && this.elapsed >= 0.3) {
            if (this.earthSprite) {
                ctx.drawImage(
                    this.earthSprite,
                    SCREEN_W / 2 - this.earthSprite.width / 2,
                    this.earthY | 0,
                );
            }
            if (this.moonSprite) {
                ctx.drawImage(
                    this.moonSprite,
                    SCREEN_W / 2 + 100,
                    this.moonY | 0,
                );
            }
        }
    }

    setSpeed(s: number): void {
        this.speed = s;
    }
}
