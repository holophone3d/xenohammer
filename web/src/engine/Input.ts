/**
 * Keyboard + mouse input state tracking.
 * Tracks current held-state (not events), suitable for a game loop.
 */
export class Input {
    private keys: Map<string, boolean> = new Map();
    private prevKeys: Map<string, boolean> = new Map();
    private mouseX = 0;
    private mouseY = 0;
    private mouseDown = false;
    private prevMouseDown = false;

    // Common key constants
    static readonly UP = 'ArrowUp';
    static readonly DOWN = 'ArrowDown';
    static readonly LEFT = 'ArrowLeft';
    static readonly RIGHT = 'ArrowRight';
    static readonly SPACE = ' ';
    static readonly ESCAPE = 'Escape';
    static readonly ENTER = 'Enter';
    static readonly KEY_A = 'a';
    static readonly KEY_Q = 'q';
    static readonly KEY_W = 'w';
    static readonly KEY_E = 'e';
    static readonly KEY_P = 'p';

    constructor(canvas: HTMLCanvasElement) {
        window.addEventListener('keydown', (e) => {
            this.keys.set(e.key, true);
            // Prevent default for game keys to stop page scrolling
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys.set(e.key, false);
        });

        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.mouseY = (e.clientY - rect.top) * scaleY;
        });

        canvas.addEventListener('mousedown', () => {
            this.mouseDown = true;
        });

        canvas.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });
    }

    /** True while the key is held down. */
    isKeyDown(key: string): boolean {
        return this.keys.get(key) === true;
    }

    /** True only on the frame the key was first pressed. */
    isKeyPressed(key: string): boolean {
        return this.keys.get(key) === true && this.prevKeys.get(key) !== true;
    }

    isMouseDown(): boolean {
        return this.mouseDown;
    }

    /** True only on the frame the mouse button was first pressed. */
    isMousePressed(): boolean {
        return this.mouseDown && !this.prevMouseDown;
    }

    getMousePos(): { x: number; y: number } {
        return { x: this.mouseX, y: this.mouseY };
    }

    /**
     * Call at the end of each frame to snapshot key state for
     * press-detection on the next frame.
     */
    endFrame(): void {
        this.prevKeys = new Map(this.keys);
        this.prevMouseDown = this.mouseDown;
    }
}
