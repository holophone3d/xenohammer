/**
 * Virtual touch controls for mobile/tablet.
 * Renders a translucent D-pad (left) and Fire + Config buttons (right)
 * over the play area during gameplay. Feeds virtual key state into Input.
 */

import { Input } from './Input';

// Layout constants in game coordinates (800×600, play area 650×600)
const DPAD_CX = 100;
const DPAD_CY = 490;
const DPAD_R = 60;
const DPAD_DEAD = 15;

const FIRE_CX = 550;
const FIRE_CY = 510;
const FIRE_R = 50;

const CFG_CX = 550;
const CFG_CY = 400;
const CFG_R = 30;

// Hit-test slop multiplier (finger is imprecise)
const SLOP = 1.4;

export class TouchControls {
    private input: Input;
    private canvas: HTMLCanvasElement;
    private _isTouchDevice: boolean;
    private _active = false;

    // Render state
    private dpadDx = 0;
    private dpadDy = 0;
    private fireHeld = false;
    private configIndex = 0;
    private lastTouchX = 0;
    private lastTouchY = 0;

    constructor(canvas: HTMLCanvasElement, input: Input) {
        this.canvas = canvas;
        this.input = input;
        this._isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 1;

        if (this._isTouchDevice) {
            this.addListeners();
        }
    }

    get isTouchDevice(): boolean { return this._isTouchDevice; }

    /** Enable/disable gameplay controls (menus still get touch→mouse). */
    setActive(gameplay: boolean): void {
        this._active = gameplay;
        if (!gameplay) {
            // Release all virtual keys when leaving gameplay
            this.dpadDx = this.dpadDy = 0;
            this.fireHeld = false;
            this.input.setVirtualKey(Input.LEFT, false);
            this.input.setVirtualKey(Input.RIGHT, false);
            this.input.setVirtualKey(Input.UP, false);
            this.input.setVirtualKey(Input.DOWN, false);
            this.input.setVirtualKey(Input.SPACE, false);
        }
    }

    // ── Touch event wiring ──

    private addListeners(): void {
        const opts: AddEventListenerOptions = { passive: false };
        this.canvas.addEventListener('touchstart', this.onTouch, opts);
        this.canvas.addEventListener('touchmove', this.onTouch, opts);
        this.canvas.addEventListener('touchend', this.onTouchEnd, opts);
        this.canvas.addEventListener('touchcancel', this.onTouchEnd, opts);
    }

    private onTouch = (e: TouchEvent): void => {
        e.preventDefault();
        this.process(e.touches, e.type === 'touchstart' ? e.changedTouches : null);
    };

    private onTouchEnd = (e: TouchEvent): void => {
        e.preventDefault();
        this.process(e.touches, null);
    };

    // ── Core processing ──

    private toGame(cx: number, cy: number): [number, number] {
        const r = this.canvas.getBoundingClientRect();
        return [
            (cx - r.left) * (this.canvas.width / r.width),
            (cy - r.top) * (this.canvas.height / r.height)
        ];
    }

    private process(touches: TouchList, newTouches: TouchList | null): void {
        // Always simulate mouse from primary touch (for menus)
        if (touches.length > 0) {
            const [mx, my] = this.toGame(touches[0].clientX, touches[0].clientY);
            this.lastTouchX = mx;
            this.lastTouchY = my;
            this.input.simulateMouseDown(mx, my);
        } else {
            this.input.simulateMouseUp();
        }

        if (!this._active) return;

        // Scan all touches for virtual controls
        let dx = 0, dy = 0, fire = false;

        for (let i = 0; i < touches.length; i++) {
            const [gx, gy] = this.toGame(touches[i].clientX, touches[i].clientY);

            // D-pad
            if (Math.hypot(gx - DPAD_CX, gy - DPAD_CY) < DPAD_R * SLOP) {
                const tdx = gx - DPAD_CX;
                const tdy = gy - DPAD_CY;
                if (Math.abs(tdx) > DPAD_DEAD) dx = tdx > 0 ? 1 : -1;
                if (Math.abs(tdy) > DPAD_DEAD) dy = tdy > 0 ? 1 : -1;
            }

            // Fire
            if (Math.hypot(gx - FIRE_CX, gy - FIRE_CY) < FIRE_R * SLOP) {
                fire = true;
            }
        }

        // Config tap: only on touchstart, cycle Q→W→E
        if (newTouches) {
            for (let i = 0; i < newTouches.length; i++) {
                const [gx, gy] = this.toGame(newTouches[i].clientX, newTouches[i].clientY);
                if (Math.hypot(gx - CFG_CX, gy - CFG_CY) < CFG_R * SLOP) {
                    this.configIndex = (this.configIndex + 1) % 3;
                    const keys = [Input.KEY_Q, Input.KEY_W, Input.KEY_E];
                    this.input.queueVirtualPress(keys[this.configIndex]);
                    break;
                }
            }
        }

        this.dpadDx = dx;
        this.dpadDy = dy;
        this.fireHeld = fire;

        this.input.setVirtualKey(Input.LEFT, dx < 0);
        this.input.setVirtualKey(Input.RIGHT, dx > 0);
        this.input.setVirtualKey(Input.UP, dy < 0);
        this.input.setVirtualKey(Input.DOWN, dy > 0);
        this.input.setVirtualKey(Input.SPACE, fire);
    }

    // ── Render ──

    render(ctx: CanvasRenderingContext2D): void {
        if (!this._isTouchDevice || !this._active) return;
        ctx.save();

        // D-pad disc
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(DPAD_CX, DPAD_CY, DPAD_R, 0, Math.PI * 2);
        ctx.fillStyle = '#444';
        ctx.fill();
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2;
        ctx.stroke();

        // D-pad arrows
        ctx.globalAlpha = 0.5;
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const ao = 32;
        ctx.fillStyle = this.dpadDy < 0 ? '#0f0' : '#aaa';
        ctx.fillText('▲', DPAD_CX, DPAD_CY - ao);
        ctx.fillStyle = this.dpadDy > 0 ? '#0f0' : '#aaa';
        ctx.fillText('▼', DPAD_CX, DPAD_CY + ao);
        ctx.fillStyle = this.dpadDx < 0 ? '#0f0' : '#aaa';
        ctx.fillText('◀', DPAD_CX - ao, DPAD_CY);
        ctx.fillStyle = this.dpadDx > 0 ? '#0f0' : '#aaa';
        ctx.fillText('▶', DPAD_CX + ao, DPAD_CY);

        // Fire button
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.arc(FIRE_CX, FIRE_CY, FIRE_R, 0, Math.PI * 2);
        ctx.fillStyle = this.fireHeld ? '#c00' : '#600';
        ctx.fill();
        ctx.strokeStyle = '#f44';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('FIRE', FIRE_CX, FIRE_CY);

        // Config button
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.arc(CFG_CX, CFG_CY, CFG_R, 0, Math.PI * 2);
        ctx.fillStyle = '#036';
        ctx.fill();
        ctx.strokeStyle = '#09f';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(['Q', 'W', 'E'][this.configIndex], CFG_CX, CFG_CY);

        ctx.restore();
    }
}
