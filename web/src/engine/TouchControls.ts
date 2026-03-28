/**
 * Virtual touch controls — HTML bar below the game canvas.
 *
 * On touch devices the game canvas scales down to leave room at the
 * bottom of the viewport. This module creates a fixed-bottom container
 * with a D-pad, Fire button, and Config-cycle button, all sized
 * proportionally to the available space.
 *
 * Multi-touch: a single container-level touch handler checks every
 * active touch against zone hit-boxes, so D-pad + Fire works
 * simultaneously with two fingers.
 */

import { Input } from './Input';

export class TouchControls {
    private input: Input;
    private container: HTMLElement;
    readonly isTouchDevice: boolean;
    private _active = false;
    private configIndex = 0;

    // Visual elements
    private dpadBg!: HTMLElement;
    private dpadArrows: HTMLElement[] = [];
    private fireEl!: HTMLElement;
    private cfgEl!: HTMLElement;
    private cfgLabel!: HTMLElement;

    constructor(input: Input) {
        this.input = input;
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 1;

        this.container = document.createElement('div');
        this.container.id = 'touch-controls';
        this.hide();
        document.body.appendChild(this.container);

        if (this.isTouchDevice) {
            this.applyContainerStyle();
            this.buildUI();
            this.addListeners();
            window.addEventListener('resize', () => this.layout());
            this.layout();
        }
    }

    /** How much vertical space (px) to reserve for controls. */
    getReservedHeight(): number {
        if (!this.isTouchDevice) return 0;
        // Use up to 25% of viewport height, min 100px, max 180px
        return Math.max(100, Math.min(180, Math.round(window.innerHeight * 0.25)));
    }

    setActive(gameplay: boolean): void {
        this._active = gameplay;
        this.container.style.opacity = gameplay ? '1' : '0.35';
        if (!gameplay) {
            this.input.setVirtualKey(Input.LEFT, false);
            this.input.setVirtualKey(Input.RIGHT, false);
            this.input.setVirtualKey(Input.UP, false);
            this.input.setVirtualKey(Input.DOWN, false);
            this.input.setVirtualKey(Input.SPACE, false);
        }
    }

    show(): void { this.container.style.display = 'block'; }
    hide(): void { this.container.style.display = 'none'; }

    /** No-op — visuals are HTML elements, not canvas. */
    render(_ctx: CanvasRenderingContext2D): void {}

    // ── Container style ──

    private applyContainerStyle(): void {
        const s = this.container.style;
        s.position = 'fixed';
        s.bottom = '0';
        s.left = '0';
        s.right = '0';
        s.touchAction = 'none';
        s.userSelect = 'none';
        (s as any).webkitUserSelect = 'none';
        s.zIndex = '10';
    }

    // ── Layout: size container & position elements to fill space ──

    layout(): void {
        const h = this.getReservedHeight();
        this.container.style.height = `${h}px`;

        const w = window.innerWidth;
        const pad = h * 0.08; // padding around elements
        const dpadSize = Math.min(h - pad * 2, w * 0.33);
        const fireSize = Math.min(h - pad * 2, w * 0.18);
        const cfgSize = Math.min(h * 0.45, w * 0.10);

        this.positionCircle(this.dpadBg, w * 0.22, h * 0.5, dpadSize / 2);
        this.positionCircle(this.fireEl, w * 0.78, h * 0.5, fireSize / 2);
        this.positionCircle(this.cfgEl, w * 0.58, h * 0.5, cfgSize / 2);

        // Arrow offsets scale with dpad size
        const ao = dpadSize * 0.33;
        const positions = [
            [0, -ao], [0, ao], [-ao, 0], [ao, 0] // up, down, left, right
        ];
        this.dpadArrows.forEach((el, i) => {
            el.style.fontSize = `${Math.round(dpadSize * 0.22)}px`;
            el.style.left = `${dpadSize / 2 + positions[i][0]}px`;
            el.style.top = `${dpadSize / 2 + positions[i][1]}px`;
        });

        // Scale fire/cfg labels
        const fireLabel = this.fireEl.querySelector('span') as HTMLElement;
        if (fireLabel) fireLabel.style.fontSize = `${Math.round(fireSize * 0.22)}px`;
        if (this.cfgLabel) this.cfgLabel.style.fontSize = `${Math.round(cfgSize * 0.36)}px`;
    }

    private positionCircle(el: HTMLElement, cx: number, cy: number, r: number): void {
        const d = r * 2;
        el.style.left = `${cx - r}px`;
        el.style.top = `${cy - r}px`;
        el.style.width = `${d}px`;
        el.style.height = `${d}px`;
    }

    // ── Build HTML elements ──

    private buildUI(): void {
        // D-pad
        this.dpadBg = this.makeCircle('rgba(60,60,60,0.5)', 'rgba(120,120,120,0.6)');
        const arrows = ['▲', '▼', '◀', '▶'];
        this.dpadArrows = arrows.map(ch => {
            const el = document.createElement('span');
            el.textContent = ch;
            Object.assign(el.style, {
                position: 'absolute',
                transform: 'translate(-50%,-50%)',
                color: 'rgba(180,180,180,0.7)',
                pointerEvents: 'none',
            });
            this.dpadBg.appendChild(el);
            return el;
        });

        // Fire
        this.fireEl = this.makeCircle('rgba(120,0,0,0.45)', 'rgba(255,60,60,0.6)');
        this.addLabel(this.fireEl, 'FIRE', true);

        // Config
        this.cfgEl = this.makeCircle('rgba(0,40,80,0.45)', 'rgba(0,130,255,0.55)');
        this.cfgLabel = this.addLabel(this.cfgEl, 'MODE', true);
    }

    private makeCircle(bg: string, border: string): HTMLElement {
        const el = document.createElement('div');
        Object.assign(el.style, {
            position: 'absolute',
            borderRadius: '50%',
            background: bg,
            border: `2px solid ${border}`,
            pointerEvents: 'none',
        });
        this.container.appendChild(el);
        return el;
    }

    private addLabel(parent: HTMLElement, text: string, bold: boolean): HTMLElement {
        const el = document.createElement('span');
        el.textContent = text;
        Object.assign(el.style, {
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            fontWeight: bold ? 'bold' : 'normal',
            fontFamily: 'sans-serif',
            color: 'rgba(255,255,255,0.65)',
            pointerEvents: 'none',
        });
        parent.appendChild(el);
        return el;
    }

    // ── Touch handling ──

    private addListeners(): void {
        const o: AddEventListenerOptions = { passive: false };
        this.container.addEventListener('touchstart', this.onTouch, o);
        this.container.addEventListener('touchmove', this.onTouch, o);
        this.container.addEventListener('touchend', this.onTouch, o);
        this.container.addEventListener('touchcancel', this.onTouch, o);
    }

    private onTouch = (e: TouchEvent): void => {
        e.preventDefault();
        this.process(e.touches, e.type === 'touchstart' ? e.changedTouches : null);
    };

    private process(touches: TouchList, newTouches: TouchList | null): void {
        if (!this._active) return;

        const cr = this.container.getBoundingClientRect();
        const h = cr.height;
        const w = cr.width;

        // Zone centers & radii (match layout percentages)
        const dpadSize = Math.min(h * 0.84, w * 0.33);
        const dCx = w * 0.22, dCy = h * 0.5, dR = dpadSize / 2;
        const dead = dR * 0.22;

        const fireSize = Math.min(h * 0.84, w * 0.18);
        const fCx = w * 0.78, fCy = h * 0.5, fR = fireSize / 2;

        const cfgSize = Math.min(h * 0.45, w * 0.10);
        const cCx = w * 0.58, cCy = h * 0.5, cR = cfgSize / 2;

        let dx = 0, dy = 0, fire = false;

        for (let i = 0; i < touches.length; i++) {
            const tx = touches[i].clientX - cr.left;
            const ty = touches[i].clientY - cr.top;

            // D-pad (generous hit area)
            if (Math.hypot(tx - dCx, ty - dCy) < dR * 1.6) {
                const ddx = tx - dCx, ddy = ty - dCy;
                if (Math.abs(ddx) > dead) dx = ddx > 0 ? 1 : -1;
                if (Math.abs(ddy) > dead) dy = ddy > 0 ? 1 : -1;
            }

            // Fire (generous)
            if (Math.hypot(tx - fCx, ty - fCy) < fR * 1.6) {
                fire = true;
            }
        }

        // Config: tap only (touchstart)
        if (newTouches) {
            for (let i = 0; i < newTouches.length; i++) {
                const tx = newTouches[i].clientX - cr.left;
                const ty = newTouches[i].clientY - cr.top;
                if (Math.hypot(tx - cCx, ty - cCy) < cR * 2) {
                    this.configIndex = (this.configIndex + 1) % 3;
                    this.input.queueVirtualPress(
                        [Input.KEY_Q, Input.KEY_W, Input.KEY_E][this.configIndex]);
                    this.cfgLabel.textContent = ['MODE 1', 'MODE 2', 'MODE 3'][this.configIndex];
                    break;
                }
            }
        }

        // Inject into Input
        this.input.setVirtualKey(Input.LEFT, dx < 0);
        this.input.setVirtualKey(Input.RIGHT, dx > 0);
        this.input.setVirtualKey(Input.UP, dy < 0);
        this.input.setVirtualKey(Input.DOWN, dy > 0);
        this.input.setVirtualKey(Input.SPACE, fire);

        // Visual feedback
        this.fireEl.style.background =
            fire ? 'rgba(200,0,0,0.55)' : 'rgba(120,0,0,0.45)';
        this.dpadArrows[0].style.color = dy < 0 ? '#0f0' : 'rgba(180,180,180,0.7)';
        this.dpadArrows[1].style.color = dy > 0 ? '#0f0' : 'rgba(180,180,180,0.7)';
        this.dpadArrows[2].style.color = dx < 0 ? '#0f0' : 'rgba(180,180,180,0.7)';
        this.dpadArrows[3].style.color = dx > 0 ? '#0f0' : 'rgba(180,180,180,0.7)';
    }
}
