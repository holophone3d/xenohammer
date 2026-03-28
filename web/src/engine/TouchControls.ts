/**
 * Virtual touch controls — HTML overlays for touch devices.
 *
 * **Portrait:** fixed bar below the game canvas (reserves bottom space).
 * **Landscape:** semi-transparent overlays on left/right sides of screen,
 *   game canvas fills 100% of the viewport.
 *
 * Includes a persistent ESC button (top-right) to return to Ready Room.
 *
 * Multi-touch: document-level touch handlers check every active touch
 * against zone hit-boxes, so D-pad + Fire works simultaneously.
 * In landscape the container has pointer-events:none so canvas touches
 * pass through for menu interaction.
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
    private escEl!: HTMLElement;

    // Callback for ESC button
    onEsc: (() => void) | null = null;

    // Debug force mode: null = auto, 'portrait' | 'landscape' = forced
    private _forceMode: 'portrait' | 'landscape' | null = null;
    // Mouse-as-touch emulation for PC testing
    private _mouseEmulation = false;
    private _mouseDown = false;

    // Cached zone data (recomputed every layout + every touch)
    private _zones: ZoneData | null = null;

    constructor(input: Input) {
        this.input = input;
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 1;

        this.container = document.createElement('div');
        this.container.id = 'touch-controls';
        this.hide();
        document.body.appendChild(this.container);

        if (this.isTouchDevice || this._forceMode) {
            this.init();
        }
    }

    private _initialized = false;
    private init(): void {
        if (this._initialized) return;
        this._initialized = true;
        this.applyContainerStyle();
        this.buildUI();
        this.addListeners();
        window.addEventListener('resize', () => this.layout());
        this.layout();
    }

    /** Force portrait/landscape layout for debugging on PC. */
    forceMode(mode: 'portrait' | 'landscape' | null): void {
        const wasNull = this._forceMode === null && !this.isTouchDevice;
        this._forceMode = mode;
        this._mouseEmulation = mode !== null;

        if (wasNull && mode !== null) {
            this.init();
            this.show();
            this.setActive(true);
        }

        if (mode === null && !this.isTouchDevice) {
            this.hide();
            this._mouseEmulation = false;
        }

        this.layout();
    }

    getForceMode(): 'portrait' | 'landscape' | null { return this._forceMode; }

    /** How much vertical space (px) to reserve for controls. */
    getReservedHeight(): number {
        if (!this.isTouchDevice && !this._forceMode) return 0;
        if (this.isLandscape()) return 0;
        return Math.max(100, Math.min(180, Math.round(window.innerHeight * 0.25)));
    }

    private isLandscape(): boolean {
        if (this._forceMode === 'portrait') return false;
        if (this._forceMode === 'landscape') return true;
        return window.innerWidth > window.innerHeight;
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
    render(_ctx: CanvasRenderingContext2D): void {}

    // ── Container style ──

    private applyContainerStyle(): void {
        const s = this.container.style;
        s.position = 'fixed';
        s.left = '0';
        s.right = '0';
        s.touchAction = 'none';
        s.userSelect = 'none';
        (s as any).webkitUserSelect = 'none';
        s.zIndex = '10';
    }

    // ── Layout ──

    layout(): void {
        if (this.isLandscape()) {
            this.layoutLandscape();
        } else {
            this.layoutPortrait();
        }
        this._zones = this.computeZones();
    }

    private layoutPortrait(): void {
        const s = this.container.style;
        s.bottom = '0';
        s.top = '';
        s.pointerEvents = '';
        const h = this.getReservedHeight();
        s.height = `${h}px`;

        const w = window.innerWidth;
        const pad = h * 0.08;
        const dpadSize = Math.min(h - pad * 2, w * 0.33);
        const fireSize = Math.min(h - pad * 2, w * 0.18);
        const cfgSize = Math.min(h * 0.45, w * 0.10);
        const escSize = Math.min(h * 0.35, w * 0.08);

        this.positionCircle(this.dpadBg, w * 0.22, h * 0.5, dpadSize / 2);
        this.positionCircle(this.fireEl, w * 0.78, h * 0.5, fireSize / 2);
        this.positionCircle(this.cfgEl, w * 0.55, h * 0.5, cfgSize / 2);
        // ESC button: top-right corner, outside the bottom bar
        this.positionEscButton(w, false);

        this.layoutArrows(dpadSize);
        this.scaleLabelFonts(fireSize, cfgSize, escSize);
    }

    private layoutLandscape(): void {
        const s = this.container.style;
        s.bottom = '0';
        s.top = '0';
        s.height = '';
        s.pointerEvents = 'none';

        const w = window.innerWidth;
        const h = window.innerHeight;

        const dpadSize = Math.min(h * 0.52, w * 0.16);
        const fireSize = Math.min(h * 0.40, w * 0.12);
        const cfgSize = Math.min(h * 0.22, w * 0.06);
        const escSize = Math.min(h * 0.18, w * 0.05);

        const margin = h * 0.08;
        const dpadCx = margin + dpadSize / 2;
        const dpadCy = h - margin - dpadSize / 2;
        this.positionCircle(this.dpadBg, dpadCx, dpadCy, dpadSize / 2);

        const fireCx = w - margin - fireSize / 2;
        const fireCy = h - margin - fireSize / 2;
        this.positionCircle(this.fireEl, fireCx, fireCy, fireSize / 2);

        const cfgCx = fireCx;
        const cfgCy = fireCy - fireSize / 2 - cfgSize / 2 - margin * 0.6;
        this.positionCircle(this.cfgEl, cfgCx, cfgCy, cfgSize / 2);

        // ESC: top-right
        this.positionEscButton(w, true);

        this.layoutArrows(dpadSize);
        this.scaleLabelFonts(fireSize, cfgSize, escSize);
    }

    private positionEscButton(screenW: number, landscape: boolean): void {
        const size = landscape
            ? Math.min(window.innerHeight * 0.18, screenW * 0.05)
            : Math.min(this.getReservedHeight() * 0.35, screenW * 0.08);
        const margin = 10;
        // In portrait, ESC floats above the bar (top-right of viewport)
        // In landscape, ESC is top-right of viewport
        const d = Math.max(size, 32) * 2;
        this.escEl.style.width = `${d}px`;
        this.escEl.style.height = `${d}px`;
        this.escEl.style.borderRadius = '50%';

        if (landscape) {
            this.escEl.style.left = `${screenW - d - margin}px`;
            this.escEl.style.top = `${margin}px`;
        } else {
            // Position at top-right of viewport (container is bottom-fixed, so use negative top)
            const containerTop = window.innerHeight - this.getReservedHeight();
            this.escEl.style.left = `${screenW - d - margin}px`;
            this.escEl.style.top = `${-(containerTop) + margin}px`;
        }
    }

    private layoutArrows(dpadSize: number): void {
        const ao = dpadSize * 0.33;
        const positions = [[0, -ao], [0, ao], [-ao, 0], [ao, 0]];
        this.dpadArrows.forEach((el, i) => {
            el.style.fontSize = `${Math.round(dpadSize * 0.22)}px`;
            el.style.left = `${dpadSize / 2 + positions[i][0]}px`;
            el.style.top = `${dpadSize / 2 + positions[i][1]}px`;
        });
    }

    private scaleLabelFonts(fireSize: number, cfgSize: number, escSize: number): void {
        const fireLabel = this.fireEl.querySelector('span') as HTMLElement;
        if (fireLabel) fireLabel.style.fontSize = `${Math.round(fireSize * 0.22)}px`;
        if (this.cfgLabel) this.cfgLabel.style.fontSize = `${Math.round(cfgSize * 0.36)}px`;
        const escLabel = this.escEl.querySelector('span') as HTMLElement;
        if (escLabel) escLabel.style.fontSize = `${Math.round(Math.max(escSize * 0.4, 11))}px`;
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

        this.fireEl = this.makeCircle('rgba(120,0,0,0.45)', 'rgba(255,60,60,0.6)');
        this.addLabel(this.fireEl, 'FIRE', true);

        this.cfgEl = this.makeCircle('rgba(0,40,80,0.45)', 'rgba(0,130,255,0.55)');
        this.cfgLabel = this.addLabel(this.cfgEl, 'MODE', true);

        // ESC button — always visible
        this.escEl = this.makeCircle('rgba(80,80,80,0.45)', 'rgba(200,200,200,0.5)');
        this.addLabel(this.escEl, 'ESC', true);
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

    // ── Touch / mouse handling ──

    private addListeners(): void {
        const o: AddEventListenerOptions = { passive: false };
        document.addEventListener('touchstart', this.onDocTouch, o);
        document.addEventListener('touchmove', this.onDocTouch, o);
        document.addEventListener('touchend', this.onDocTouch, o);
        document.addEventListener('touchcancel', this.onDocTouch, o);

        // Mouse emulation for PC debug testing
        document.addEventListener('mousedown', this.onMouseDown);
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
    }

    private onDocTouch = (e: TouchEvent): void => {
        if (this.container.style.display === 'none') return;
        const zones = this.computeZones();
        this._zones = zones;

        let hitControl = false;
        for (let i = 0; i < e.touches.length; i++) {
            if (this.touchInAnyZone(e.touches[i].clientX, e.touches[i].clientY, zones)) {
                hitControl = true;
                break;
            }
        }

        if (hitControl) {
            e.preventDefault();
        }

        this.process(e.touches, e.type === 'touchstart' ? e.changedTouches : null, zones);
    };

    private onMouseDown = (e: MouseEvent): void => {
        if (!this._mouseEmulation || this.container.style.display === 'none') return;
        const zones = this.computeZones();
        this._zones = zones;
        if (!this.touchInAnyZone(e.clientX, e.clientY, zones)) return;
        this._mouseDown = true;
        this.processMouseAsTouch(e.clientX, e.clientY, true, zones);
    };

    private onMouseMove = (e: MouseEvent): void => {
        if (!this._mouseEmulation || !this._mouseDown) return;
        this.processMouseAsTouch(e.clientX, e.clientY, false, this._zones!);
    };

    private onMouseUp = (_e: MouseEvent): void => {
        if (!this._mouseEmulation || !this._mouseDown) return;
        this._mouseDown = false;
        this.input.setVirtualKey(Input.LEFT, false);
        this.input.setVirtualKey(Input.RIGHT, false);
        this.input.setVirtualKey(Input.UP, false);
        this.input.setVirtualKey(Input.DOWN, false);
        this.input.setVirtualKey(Input.SPACE, false);
        this.fireEl.style.background = 'rgba(120,0,0,0.45)';
        this.dpadArrows.forEach(el => el.style.color = 'rgba(180,180,180,0.7)');
    };

    private processMouseAsTouch(cx: number, cy: number, isNew: boolean, zones: ZoneData): void {
        if (!this._active) return;

        const { dCx, dCy, dR, fCx, fCy, fR, cCx, cCy, cR, eCx, eCy, eR } = zones;
        const dead = dR * 0.22;

        let dx = 0, dy = 0, fire = false;

        if (Math.hypot(cx - dCx, cy - dCy) < dR * 1.6) {
            const ddx = cx - dCx, ddy = cy - dCy;
            if (Math.abs(ddx) > dead) dx = ddx > 0 ? 1 : -1;
            if (Math.abs(ddy) > dead) dy = ddy > 0 ? 1 : -1;
        }

        if (Math.hypot(cx - fCx, cy - fCy) < fR * 1.6) fire = true;

        if (isNew && Math.hypot(cx - cCx, cy - cCy) < cR * 2) {
            this.configIndex = (this.configIndex + 1) % 3;
            this.input.queueVirtualPress(
                [Input.KEY_Q, Input.KEY_W, Input.KEY_E][this.configIndex]);
        }

        if (isNew && Math.hypot(cx - eCx, cy - eCy) < eR * 1.6) {
            if (this.onEsc) this.onEsc();
        }

        this.input.setVirtualKey(Input.LEFT, dx < 0);
        this.input.setVirtualKey(Input.RIGHT, dx > 0);
        this.input.setVirtualKey(Input.UP, dy < 0);
        this.input.setVirtualKey(Input.DOWN, dy > 0);
        this.input.setVirtualKey(Input.SPACE, fire);

        this.updateVisualFeedback(dx, dy, fire);
    }

    /** Compute absolute screen-coordinate zones for current layout. */
    private computeZones(): ZoneData {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const landscape = this.isLandscape();

        if (landscape) {
            const margin = h * 0.08;
            const dpadSize = Math.min(h * 0.52, w * 0.16);
            const fireSize = Math.min(h * 0.40, w * 0.12);
            const cfgSize = Math.min(h * 0.22, w * 0.06);
            const escSize = Math.max(Math.min(h * 0.18, w * 0.05), 16);

            const fireCx = w - margin - fireSize / 2;
            const fireCy = h - margin - fireSize / 2;

            return {
                dCx: margin + dpadSize / 2,
                dCy: h - margin - dpadSize / 2,
                dR: dpadSize / 2,
                fCx: fireCx, fCy: fireCy, fR: fireSize / 2,
                cCx: fireCx,
                cCy: fireCy - fireSize / 2 - cfgSize / 2 - margin * 0.6,
                cR: cfgSize / 2,
                eCx: w - escSize - 10,
                eCy: escSize + 10,
                eR: escSize,
            };
        } else {
            const cr = this.container.getBoundingClientRect();
            const ch = cr.height;
            const cw = cr.width;
            const top = cr.top;
            const left = cr.left;

            const dpadSize = Math.min(ch * 0.84, cw * 0.33);
            const fireSize = Math.min(ch * 0.84, cw * 0.18);
            const cfgSize = Math.min(ch * 0.45, cw * 0.10);
            const escSize = Math.max(Math.min(ch * 0.35, cw * 0.08), 16);

            return {
                dCx: left + cw * 0.22, dCy: top + ch * 0.5, dR: dpadSize / 2,
                fCx: left + cw * 0.78, fCy: top + ch * 0.5, fR: fireSize / 2,
                cCx: left + cw * 0.55, cCy: top + ch * 0.5, cR: cfgSize / 2,
                // ESC at top-right of viewport
                eCx: w - escSize - 10,
                eCy: escSize + 10,
                eR: escSize,
            };
        }
    }

    private touchInAnyZone(x: number, y: number, z: ZoneData): boolean {
        return Math.hypot(x - z.dCx, y - z.dCy) < z.dR * 1.6 ||
               Math.hypot(x - z.fCx, y - z.fCy) < z.fR * 1.6 ||
               Math.hypot(x - z.cCx, y - z.cCy) < z.cR * 2 ||
               Math.hypot(x - z.eCx, y - z.eCy) < z.eR * 1.6;
    }

    private process(touches: TouchList, newTouches: TouchList | null, zones: ZoneData): void {
        if (!this._active) return;

        const { dCx, dCy, dR, fCx, fCy, fR, cCx, cCy, cR, eCx, eCy, eR } = zones;
        const dead = dR * 0.22;

        let dx = 0, dy = 0, fire = false;

        for (let i = 0; i < touches.length; i++) {
            const tx = touches[i].clientX;
            const ty = touches[i].clientY;

            if (Math.hypot(tx - dCx, ty - dCy) < dR * 1.6) {
                const ddx = tx - dCx, ddy = ty - dCy;
                if (Math.abs(ddx) > dead) dx = ddx > 0 ? 1 : -1;
                if (Math.abs(ddy) > dead) dy = ddy > 0 ? 1 : -1;
            }

            if (Math.hypot(tx - fCx, ty - fCy) < fR * 1.6) fire = true;
        }

        if (newTouches) {
            for (let i = 0; i < newTouches.length; i++) {
                const tx = newTouches[i].clientX;
                const ty = newTouches[i].clientY;
                if (Math.hypot(tx - cCx, ty - cCy) < cR * 2) {
                    this.configIndex = (this.configIndex + 1) % 3;
                    this.input.queueVirtualPress(
                        [Input.KEY_Q, Input.KEY_W, Input.KEY_E][this.configIndex]);
                    break;
                }
            }
            // ESC button — tap only
            for (let i = 0; i < newTouches.length; i++) {
                const tx = newTouches[i].clientX;
                const ty = newTouches[i].clientY;
                if (Math.hypot(tx - eCx, ty - eCy) < eR * 1.6) {
                    if (this.onEsc) this.onEsc();
                    break;
                }
            }
        }

        this.input.setVirtualKey(Input.LEFT, dx < 0);
        this.input.setVirtualKey(Input.RIGHT, dx > 0);
        this.input.setVirtualKey(Input.UP, dy < 0);
        this.input.setVirtualKey(Input.DOWN, dy > 0);
        this.input.setVirtualKey(Input.SPACE, fire);

        this.updateVisualFeedback(dx, dy, fire);
    }

    private updateVisualFeedback(dx: number, dy: number, fire: boolean): void {
        this.fireEl.style.background = fire ? 'rgba(200,0,0,0.55)' : 'rgba(120,0,0,0.45)';
        this.dpadArrows[0].style.color = dy < 0 ? '#0f0' : 'rgba(180,180,180,0.7)';
        this.dpadArrows[1].style.color = dy > 0 ? '#0f0' : 'rgba(180,180,180,0.7)';
        this.dpadArrows[2].style.color = dx < 0 ? '#0f0' : 'rgba(180,180,180,0.7)';
        this.dpadArrows[3].style.color = dx > 0 ? '#0f0' : 'rgba(180,180,180,0.7)';
    }
}

interface ZoneData {
    dCx: number; dCy: number; dR: number;
    fCx: number; fCy: number; fR: number;
    cCx: number; cCy: number; cR: number;
    eCx: number; eCy: number; eR: number;
}
