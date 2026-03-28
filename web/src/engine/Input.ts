/**
 * Keyboard + mouse + virtual-touch input state tracking.
 * Tracks current held-state (not events), suitable for a game loop.
 */
export class Input {
    private keys: Map<string, boolean> = new Map();
    private prevKeys: Map<string, boolean> = new Map();
    private pressedQueue: Set<string> = new Set(); // catches fast press+release between frames
    private virtualKeys: Map<string, boolean> = new Map();
    private mouseX = 0;
    private mouseY = 0;
    private mouseDown = false;
    private prevMouseDown = false;
    private mouseClickQueued = false;

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
            if (!this.keys.get(e.key)) {
                this.pressedQueue.add(e.key);
            }
            this.keys.set(e.key, true);
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
            this.mouseClickQueued = true;
        });

        canvas.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });

        // Touch → mouse simulation (for menu interaction on mobile)
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                const rect = canvas.getBoundingClientRect();
                const sx = canvas.width / rect.width;
                const sy = canvas.height / rect.height;
                this.mouseX = (e.touches[0].clientX - rect.left) * sx;
                this.mouseY = (e.touches[0].clientY - rect.top) * sy;
                this.mouseDown = true;
                this.mouseClickQueued = true;
            }
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (e.touches.length === 0) {
                this.mouseDown = false;
            }
        }, { passive: false });
    }

    /** True while the key is held down (keyboard or virtual touch). */
    isKeyDown(key: string): boolean {
        return this.keys.get(key) === true || this.virtualKeys.get(key) === true;
    }

    /** True only on the frame the key was first pressed. */
    isKeyPressed(key: string): boolean {
        // Check queue first (catches fast press+release between frames)
        if (this.pressedQueue.has(key)) return true;
        return this.keys.get(key) === true && this.prevKeys.get(key) !== true;
    }

    isMouseDown(): boolean {
        return this.mouseDown;
    }

    /** True only on the frame the mouse button was first pressed. */
    isMousePressed(): boolean {
        if (this.mouseClickQueued) return true;
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
        this.pressedQueue.clear();
        this.mouseClickQueued = false;
    }

    // ── Virtual input (touch controls) ──

    /** Set a virtual key's held state from touch controls. */
    setVirtualKey(key: string, down: boolean): void {
        if (down && !this.virtualKeys.get(key)) {
            this.pressedQueue.add(key);
        }
        this.virtualKeys.set(key, down);
    }

    /** Queue a one-frame virtual press (e.g. config cycle tap). */
    queueVirtualPress(key: string): void {
        this.pressedQueue.add(key);
    }

    /** Simulate mouse-down from a touch event (for menu interaction). */
    simulateMouseDown(x: number, y: number): void {
        this.mouseX = x;
        this.mouseY = y;
        if (!this.mouseDown) {
            this.mouseClickQueued = true;
        }
        this.mouseDown = true;
    }

    /** Simulate mouse-up from touch release. */
    simulateMouseUp(): void {
        this.mouseDown = false;
    }
}
