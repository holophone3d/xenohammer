/**
 * Multi-frame animated sprites and single-frame static sprites.
 * Mirrors the classic engine's frame-based animation with millisecond timing.
 */

export class Sprite {
    frames: HTMLImageElement[];
    currentFrame: number;
    x: number;
    y: number;
    width: number;
    height: number;
    animSpeed: number; // ms per frame (classic used 20ms for explosions, 100ms general)
    private elapsed: number;
    private finished: boolean;
    loop: boolean;

    constructor(frames: HTMLImageElement[], animSpeed = 100) {
        if (frames.length === 0) {
            throw new Error('Sprite requires at least one frame');
        }
        this.frames = frames;
        this.currentFrame = 0;
        this.x = 0;
        this.y = 0;
        this.width = frames[0].naturalWidth || frames[0].width;
        this.height = frames[0].naturalHeight || frames[0].height;
        this.animSpeed = animSpeed;
        this.elapsed = 0;
        this.finished = false;
        this.loop = true;
    }

    /** Advance animation by dt milliseconds. */
    update(dt: number): void {
        if (this.frames.length <= 1 || this.finished) return;

        this.elapsed += dt;
        while (this.elapsed >= this.animSpeed) {
            this.elapsed -= this.animSpeed;
            this.currentFrame++;

            if (this.currentFrame >= this.frames.length) {
                if (this.loop) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = this.frames.length - 1;
                    this.finished = true;
                    return;
                }
            }
        }
    }

    /** Whether a non-looping animation has played through all frames. */
    isFinished(): boolean {
        return this.finished;
    }

    /** Reset animation to first frame. */
    reset(): void {
        this.currentFrame = 0;
        this.elapsed = 0;
        this.finished = false;
    }

    /** Draw at the sprite's own x/y position. */
    draw(ctx: CanvasRenderingContext2D): void {
        ctx.drawImage(this.frames[this.currentFrame], this.x, this.y);
    }

    /** Draw at an arbitrary position without changing the sprite's stored x/y. */
    drawAt(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        ctx.drawImage(this.frames[this.currentFrame], x, y);
    }

    /** Create an independent copy for instancing from a template. */
    clone(): Sprite {
        const s = new Sprite(this.frames, this.animSpeed);
        s.loop = this.loop;
        return s;
    }
}

/** Single-frame static sprite — lightweight alternative when animation isn't needed. */
export class StaticSprite {
    image: HTMLImageElement;
    x: number;
    y: number;
    readonly width: number;
    readonly height: number;

    constructor(image: HTMLImageElement) {
        this.image = image;
        this.x = 0;
        this.y = 0;
        this.width = image.naturalWidth || image.width;
        this.height = image.naturalHeight || image.height;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.drawImage(this.image, this.x, this.y);
    }

    drawAt(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        ctx.drawImage(this.image, x, y);
    }
}
