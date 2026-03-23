/**
 * Parallax starfield background — port of TStarField from C++ source.
 * Multiple depth layers of stars scrolling downward.
 */

import { GameCanvas } from '../engine';
import { PLAY_AREA_W, PLAY_AREA_H } from './Collision';

interface Star {
    x: number;
    y: number;
    z: number;       // depth (1-300)
    size: number;
    color: string;
    active: boolean;
}

const MAX_STARS = 600;
const STAR_DISTANCE = 300;
const DEFAULT_SPEED = 30;

export class StarField {
    private stars: Star[] = [];
    speed = DEFAULT_SPEED;

    constructor() {
        for (let i = 0; i < MAX_STARS; i++) {
            this.stars.push(this.createStar(true));
        }
    }

    private createStar(randomY: boolean): Star {
        const z = Math.random() * STAR_DISTANCE + 1;
        const brightness = Math.floor(255 * (1 - z / STAR_DISTANCE));
        const b = Math.max(40, brightness);
        // Vary between white, blue-white, and warm tints
        const tint = Math.random();
        let r: number, g: number, blue: number;
        if (tint < 0.6) {
            r = b; g = b; blue = b;               // white
        } else if (tint < 0.8) {
            r = b * 0.7; g = b * 0.8; blue = b;   // blue-ish
        } else {
            r = b; g = b * 0.9; blue = b * 0.6;   // warm
        }

        return {
            x: Math.random() * PLAY_AREA_W,
            y: randomY ? Math.random() * PLAY_AREA_H : -2,
            z,
            size: z < 100 ? 2 : 1,
            color: `rgb(${Math.floor(r)},${Math.floor(g)},${Math.floor(blue)})`,
            active: Math.random() < 0.2 || randomY,
        };
    }

    update(dt: number): void {
        for (const star of this.stars) {
            if (!star.active) {
                // Chance to activate each frame
                if (Math.random() < 0.2 * dt) {
                    star.active = true;
                }
                continue;
            }

            // Closer stars (lower z) move faster — parallax
            const layerSpeed = this.speed * (STAR_DISTANCE / (star.z + 1));
            star.y += layerSpeed * dt;

            if (star.y > PLAY_AREA_H) {
                // Recycle at top
                const fresh = this.createStar(false);
                star.x = fresh.x;
                star.y = fresh.y;
                star.z = fresh.z;
                star.size = fresh.size;
                star.color = fresh.color;
                star.active = true;
            }
        }
    }

    draw(canvas: GameCanvas): void {
        const ctx = canvas.ctx;
        for (const star of this.stars) {
            if (!star.active) continue;
            ctx.fillStyle = star.color;
            ctx.fillRect(star.x | 0, star.y | 0, star.size, star.size);
        }
    }

    setSpeed(s: number): void {
        this.speed = s;
    }
}
