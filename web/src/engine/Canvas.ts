/**
 * Wraps HTML5 Canvas 2D context for the XenoHammer game (800×600).
 */
export class GameCanvas {
    readonly canvas: HTMLCanvasElement;
    readonly ctx: CanvasRenderingContext2D;
    readonly width = 800;
    readonly height = 600;

    constructor(canvasId: string) {
        const el = document.getElementById(canvasId);
        if (!el || !(el instanceof HTMLCanvasElement)) {
            throw new Error(`Canvas element "${canvasId}" not found`);
        }
        this.canvas = el;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D rendering context');
        }
        this.ctx = ctx;
        this.ctx.imageSmoothingEnabled = false;
    }

    /** Clear the canvas. Defaults to opaque black. */
    clear(r = 0, g = 0, b = 0, a = 1): void {
        this.ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    fillRect(x: number, y: number, w: number, h: number, color: string): void {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
    }

    /** Draw a full image at position. */
    drawImage(image: HTMLImageElement, x: number, y: number): void {
        this.ctx.drawImage(image, x, y);
    }

    /** Draw a sub-region of an image (for sprite sheets). */
    drawImageRegion(
        image: HTMLImageElement,
        sx: number, sy: number, sw: number, sh: number,
        dx: number, dy: number, dw: number, dh: number
    ): void {
        this.ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
    }

    /** Draw an image scaled to a target width and height. */
    drawImageScaled(
        image: HTMLImageElement,
        x: number, y: number,
        w: number, h: number
    ): void {
        this.ctx.drawImage(image, x, y, w, h);
    }

    /** Draw text on the canvas. */
    drawText(
        text: string, x: number, y: number,
        color = '#ffffff', font = '16px monospace'
    ): void {
        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.fillText(text, x, y);
    }
}
