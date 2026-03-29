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

    /** Per-frame 1-bit alpha masks for pixel-level collision (matches C++ frameMasks). */
    frameMasks: Uint8Array[] | null = null;

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

    /** Build 1-bit alpha masks for every frame (call once after images are loaded). */
    generateMasks(): void {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        this.frameMasks = [];
        for (const frame of this.frames) {
            const fw = frame.naturalWidth || frame.width;
            const fh = frame.naturalHeight || frame.height;
            canvas.width = fw;
            canvas.height = fh;
            ctx.clearRect(0, 0, fw, fh);
            ctx.drawImage(frame, 0, 0);
            const data = ctx.getImageData(0, 0, fw, fh).data;
            const mask = new Uint8Array(fw * fh);
            for (let i = 0; i < mask.length; i++) {
                mask[i] = data[i * 4 + 3] > 0 ? 1 : 0;
            }
            this.frameMasks.push(mask);
        }
    }

    /** Get the alpha mask for the current frame, or null if masks not generated. */
    getCurrentMask(): Uint8Array | null {
        if (!this.frameMasks) return null;
        return this.frameMasks[this.currentFrame] ?? null;
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

    /** Set current frame directly (for directional sprites like player/enemies). */
    setFrame(frame: number): void {
        this.currentFrame = Math.max(0, Math.min(frame, this.frames.length - 1));
        // Update dimensions to match current frame (important for power-level projectile sprites)
        const img = this.frames[this.currentFrame];
        this.width = img.naturalWidth || img.width;
        this.height = img.naturalHeight || img.height;
    }

    /** Draw current frame rotated around its center at (x,y). */
    drawRotated(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number): void {
        const img = this.frames[this.currentFrame];
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.drawImage(img, -this.width / 2, -this.height / 2);
        ctx.restore();
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
    /** 1-bit alpha mask for pixel-level collision. */
    mask: Uint8Array | null = null;

    constructor(image: HTMLImageElement) {
        this.image = image;
        this.x = 0;
        this.y = 0;
        this.width = image.naturalWidth || image.width;
        this.height = image.naturalHeight || image.height;
    }

    /** Build 1-bit alpha mask (call once after image is loaded). */
    generateMask(): void {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = this.width;
        canvas.height = this.height;
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.drawImage(this.image, 0, 0);
        const data = ctx.getImageData(0, 0, this.width, this.height).data;
        this.mask = new Uint8Array(this.width * this.height);
        for (let i = 0; i < this.mask.length; i++) {
            this.mask[i] = data[i * 4 + 3] > 0 ? 1 : 0;
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.drawImage(this.image, this.x, this.y);
    }

    drawAt(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        ctx.drawImage(this.image, x, y);
    }
}
