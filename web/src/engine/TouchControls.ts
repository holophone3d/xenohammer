/**
 * Virtual touch controls — HTML overlays for touch devices.
 *
 * **Portrait:** fixed bar below the game canvas (reserves bottom space).
 * **Landscape:** semi-transparent overlays on left/right sides of screen,
 *   game canvas fills 100% of the viewport.
 *
 * D-pad has a draggable joystick nub that tracks the thumb and snaps
 * back to center on release. Inputs are maintained even when the thumb
 * slides beyond the dpad boundary (touch is tracked by ID, not zone).
 *
 * ESC button: portrait → left of MODE; landscape → above MODE.
 */

import { Input } from './Input';

interface ZoneData {
    dCx: number; dCy: number; dR: number;
    fCx: number; fCy: number; fR: number;
    cCx: number; cCy: number; cR: number;
    eCx: number; eCy: number; eR: number;
}

export class TouchControls {
    private input: Input;
    private container: HTMLElement;
    readonly isTouchDevice: boolean;
    private _active = false;
    private configIndex = 0;

    // Visual elements
    private dpadBg!: HTMLElement;
    private dpadNub!: HTMLElement;
    private dpadArrows: HTMLElement[] = [];
    private fireEl!: HTMLElement;
    private cfgEl!: HTMLElement;
    private cfgLabel!: HTMLElement;
    private escEl!: HTMLElement;
    private fullscreenEl: HTMLElement | null = null; // iOS "Add to Home Screen" prompt button

    // D-pad joystick state — track by touch identifier
    private dpadTouchId: number | null = null;

    // Callback for ESC button
    onEsc: (() => void) | null = null;

    // Debug force mode
    private _forceMode: 'portrait' | 'landscape' | null = null;
    private _mouseEmulation = false;
    private _mouseDown = false;
    private _mouseDpadLocked = false;

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
        if (!this._initialized) return;
        // Dim dpad/fire when not in gameplay, but keep ESC always visible
        this.dpadBg.style.opacity = gameplay ? '1' : '0.35';
        this.fireEl.style.opacity = gameplay ? '1' : '0.35';
        this.cfgEl.style.opacity = gameplay ? '1' : '0.35';
        this.escEl.style.opacity = '1';
        if (!gameplay) {
            this.input.setVirtualKey(Input.LEFT, false);
            this.input.setVirtualKey(Input.RIGHT, false);
            this.input.setVirtualKey(Input.UP, false);
            this.input.setVirtualKey(Input.DOWN, false);
            this.input.setVirtualKey(Input.SPACE, false);
            this.resetDpadNub();
            this.dpadArrows.forEach(el => el.style.color = 'rgba(180,180,180,0.7)');
            this.fireEl.style.background = 'rgba(120,0,0,0.45)';
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
        this.resetDpadNub();
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
        const cy = h * 0.25;  // shifted up ~25% from center
        const dpadSize = Math.min(h - pad * 2, w * 0.38);
        const fireSize = Math.min(h - pad * 2, w * 0.18);
        const cfgSize = Math.min(h * 0.45, w * 0.10);
        const escSize = cfgSize * 0.5;

        const cfgCx = w * 0.58;
        this.positionCircle(this.dpadBg, w * 0.22, cy, dpadSize / 2);
        this.positionCircle(this.fireEl, w * 0.78, cy, fireSize / 2);
        this.positionCircle(this.cfgEl, cfgCx, cy, cfgSize / 2);

        // ESC above MODE — bottom of ESC aligns with top of dpad
        const dpadTop = cy - dpadSize / 2;
        const escCy = dpadTop - escSize;  // escBottom = escCy + escSize = dpadTop
        const escD = escSize * 2;
        this.escEl.style.width = `${escD}px`;
        this.escEl.style.height = `${escD}px`;
        this.escEl.style.borderRadius = '6px';
        this.escEl.style.left = `${cfgCx - escSize}px`;
        this.escEl.style.top = `${escCy - escSize}px`;

        this.layoutNub(dpadSize);
        this.layoutArrows(dpadSize);
        this.scaleLabelFonts(fireSize, cfgSize, escSize);
        this.layoutFullscreenButton(w * 0.22, dpadTop, dpadSize);
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
        const escSize = cfgSize * 0.5;

        const margin = h * 0.08;
        this.positionCircle(this.dpadBg, margin + dpadSize / 2,
            h - margin - dpadSize / 2, dpadSize / 2);

        const fireCx = w - margin - fireSize / 2;
        const fireCy = h - margin - fireSize / 2;
        this.positionCircle(this.fireEl, fireCx, fireCy, fireSize / 2);

        // MODE above FIRE
        const cfgCy = fireCy - fireSize / 2 - cfgSize / 2 - margin * 0.6;
        this.positionCircle(this.cfgEl, fireCx, cfgCy, cfgSize / 2);

        // ESC above MODE — gap = 2× MODE-to-FIRE gap, centered over MODE
        const modeFireGap = (fireCy - fireSize / 2) - (cfgCy + cfgSize / 2);
        const escGap = modeFireGap * 2;
        const escCy = cfgCy - cfgSize / 2 - escSize / 2 - escGap;
        const escD = escSize * 2;
        this.escEl.style.width = `${escD}px`;
        this.escEl.style.height = `${escD}px`;
        this.escEl.style.borderRadius = '6px';
        this.escEl.style.left = `${fireCx - escSize}px`;
        this.escEl.style.top = `${escCy - escSize}px`;

        this.layoutNub(dpadSize);
        this.layoutArrows(dpadSize);
        this.scaleLabelFonts(fireSize, cfgSize, escSize);

        const dpadCx = margin + dpadSize / 2;
        const dpadTopY = h - margin - dpadSize;
        this.layoutFullscreenButton(dpadCx, dpadTopY, dpadSize);
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

    private layoutNub(dpadSize: number): void {
        const nubD = Math.round(dpadSize * 0.36);
        this.dpadNub.style.width = `${nubD}px`;
        this.dpadNub.style.height = `${nubD}px`;
        this.dpadNub.style.borderRadius = '50%';
        this.resetDpadNub();
    }

    private resetDpadNub(): void {
        if (!this.dpadNub || !this.dpadBg) return;
        const bgW = parseFloat(this.dpadBg.style.width) || 0;
        const nubW = parseFloat(this.dpadNub.style.width) || 0;
        this.dpadNub.style.left = `${(bgW - nubW) / 2}px`;
        this.dpadNub.style.top = `${(bgW - nubW) / 2}px`;
        this.dpadTouchId = null;
    }

    private scaleLabelFonts(fireSize: number, cfgSize: number, escSize: number): void {
        const fireLabel = this.fireEl.querySelector('span') as HTMLElement;
        if (fireLabel) fireLabel.style.fontSize = `${Math.round(fireSize * 0.22)}px`;
        if (this.cfgLabel) this.cfgLabel.style.fontSize = `${Math.round(cfgSize * 0.36)}px`;
        const escLabel = this.escEl.querySelector('span') as HTMLElement;
        if (escLabel) escLabel.style.fontSize = `${Math.round(Math.max(escSize * 0.4, 11))}px`;
    }

    /** Position the iOS fullscreen prompt button above the D-pad. */
    private layoutFullscreenButton(dpadCx: number, dpadTop: number, dpadSize: number): void {
        if (!this.fullscreenEl) return;
        const btnW = dpadSize * 0.8;
        const btnH = dpadSize * 0.22;
        this.fullscreenEl.style.left = `${dpadCx - btnW / 2}px`;
        this.fullscreenEl.style.top = `${dpadTop - btnH - dpadSize * 0.08}px`;
        this.fullscreenEl.style.width = `${btnW}px`;
        this.fullscreenEl.style.height = `${btnH}px`;
        const label = this.fullscreenEl.querySelector('span') as HTMLElement;
        if (label) label.style.fontSize = `${Math.round(btnH * 0.5)}px`;
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
        const arrows = ['▲\uFE0E', '▼\uFE0E', '◀\uFE0E', '▶\uFE0E'];
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

        // Joystick nub — draggable inner circle
        this.dpadNub = document.createElement('div');
        Object.assign(this.dpadNub.style, {
            position: 'absolute',
            background: 'rgba(200,200,200,0.5)',
            border: '2px solid rgba(255,255,255,0.6)',
            borderRadius: '50%',
            pointerEvents: 'none',
        });
        this.dpadBg.appendChild(this.dpadNub);

        this.fireEl = this.makeCircle('rgba(120,0,0,0.45)', 'rgba(255,60,60,0.6)');
        this.addLabel(this.fireEl, 'FIRE', true);

        this.cfgEl = this.makeCircle('rgba(0,40,80,0.45)', 'rgba(0,130,255,0.55)');
        this.cfgLabel = this.addLabel(this.cfgEl, 'MODE', true);

        // ESC button — always visible
        this.escEl = this.makeCircle('rgba(80,80,80,0.45)', 'rgba(200,200,200,0.5)');
        this.addLabel(this.escEl, 'ESC', true);

        // iOS Safari (not standalone) — show "Fullscreen" prompt button
        if (this.isIOSSafariNotStandalone() && !localStorage.getItem('xh_fs_dismissed')) {
            this.fullscreenEl = document.createElement('div');
            Object.assign(this.fullscreenEl.style, {
                position: 'absolute',
                borderRadius: '6px',
                background: 'rgba(0,180,80,0.55)',
                border: '2px solid rgba(0,255,120,0.7)',
                pointerEvents: 'auto',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
            });
            const label = document.createElement('span');
            label.textContent = '⛶ Fullscreen';
            Object.assign(label.style, {
                fontWeight: 'bold',
                fontFamily: 'sans-serif',
                color: 'rgba(255,255,255,0.85)',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
            });
            this.fullscreenEl.appendChild(label);
            this.container.appendChild(this.fullscreenEl);
            this.fullscreenEl.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showFullscreenInstructions();
            }, { passive: false });
            this.fullscreenEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showFullscreenInstructions();
            });
        }
    }

    private isIOSSafariNotStandalone(): boolean {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isStandalone = (navigator as any).standalone === true ||
            window.matchMedia('(display-mode: standalone)').matches;
        return isIOS && !isStandalone;
    }

    private showFullscreenInstructions(): void {
        // Remove the button after tapping
        if (this.fullscreenEl) {
            this.fullscreenEl.remove();
            this.fullscreenEl = null;
        }

        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0', left: '0', right: '0', bottom: '0',
            background: 'rgba(0,0,0,0.85)',
            zIndex: '9999',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            color: '#fff',
            fontFamily: 'sans-serif',
            textAlign: 'center',
        });

        overlay.innerHTML = `
            <div style="max-width:360px">
                <div style="font-size:3rem;margin-bottom:1rem">📱</div>
                <h2 style="font-size:1.3rem;color:#0f6;margin-bottom:1rem">Play Fullscreen</h2>
                <p style="font-size:0.95rem;color:#ccc;line-height:1.6;margin-bottom:1.5rem">
                    For the best experience without browser bars:
                </p>
                <div style="text-align:left;font-size:0.9rem;color:#eee;line-height:2">
                    <p>1. Tap <strong>Share</strong> <span style="font-size:1.2rem">⬆</span> in Safari</p>
                    <p>2. Scroll down, tap <strong>"Add to Home Screen"</strong></p>
                    <p>3. Tap <strong>Add</strong></p>
                    <p>4. Launch from your home screen 🚀</p>
                </div>
                <button id="xh-fs-dismiss" style="margin-top:1.5rem;padding:0.7rem 2rem;background:#0f6;color:#000;border:none;border-radius:6px;font-size:1rem;font-weight:bold;cursor:pointer">Got it!</button>
                <p style="margin-top:1rem;font-size:0.75rem;color:#666">
                    <a id="xh-fs-dontshow" href="#" style="color:#666;text-decoration:underline">Don't show again</a>
                </p>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#xh-fs-dismiss')!.addEventListener('touchstart', (e) => {
            e.preventDefault();
            overlay.remove();
        });
        overlay.querySelector('#xh-fs-dismiss')!.addEventListener('click', () => {
            overlay.remove();
        });
        overlay.querySelector('#xh-fs-dontshow')!.addEventListener('touchstart', (e) => {
            e.preventDefault();
            try { localStorage.setItem('xh_fs_dismissed', '1'); } catch {}
            overlay.remove();
        });
        overlay.querySelector('#xh-fs-dontshow')!.addEventListener('click', (e) => {
            e.preventDefault();
            try { localStorage.setItem('xh_fs_dismissed', '1'); } catch {}
            overlay.remove();
        });
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
        document.addEventListener('touchstart', this.onDocTouchStartMove, o);
        document.addEventListener('touchmove', this.onDocTouchStartMove, o);
        document.addEventListener('touchend', this.onDocTouchEnd, o);
        document.addEventListener('touchcancel', this.onDocTouchEnd, o);

        // Mouse emulation for PC debug testing
        document.addEventListener('mousedown', this.onMouseDown);
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
    }

    private onDocTouchStartMove = (e: TouchEvent): void => {
        if (this.container.style.display === 'none') return;
        const zones = this.computeZones();
        this._zones = zones;

        let hitControl = false;

        // Check for new dpad touches on touchstart
        if (e.type === 'touchstart') {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const t = e.changedTouches[i];
                if (Math.hypot(t.clientX - zones.dCx, t.clientY - zones.dCy) < zones.dR * 1.6) {
                    this.dpadTouchId = t.identifier;
                    hitControl = true;
                }
            }
        }

        // Check if any active touch hits a control
        for (let i = 0; i < e.touches.length; i++) {
            if (this.touchInAnyZone(e.touches[i].clientX, e.touches[i].clientY, zones)) {
                hitControl = true;
                break;
            }
        }
        // If tracked dpad touch is active, it's a control hit even if outside zone
        if (this.dpadTouchId !== null) {
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === this.dpadTouchId) {
                    hitControl = true;
                    break;
                }
            }
        }

        if (hitControl) e.preventDefault();

        this.process(e.touches, e.type === 'touchstart' ? e.changedTouches : null, zones);
    };

    private onDocTouchEnd = (e: TouchEvent): void => {
        if (this.container.style.display === 'none') return;

        // Check if the dpad touch was released
        if (this.dpadTouchId !== null) {
            let dpadStillDown = false;
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === this.dpadTouchId) {
                    dpadStillDown = true;
                    break;
                }
            }
            if (!dpadStillDown) {
                this.resetDpadNub();
                this.input.setVirtualKey(Input.LEFT, false);
                this.input.setVirtualKey(Input.RIGHT, false);
                this.input.setVirtualKey(Input.UP, false);
                this.input.setVirtualKey(Input.DOWN, false);
            }
        }

        // Re-process remaining touches
        const zones = this.computeZones();
        this._zones = zones;
        this.process(e.touches, null, zones);
    };

    private onMouseDown = (e: MouseEvent): void => {
        if (!this._mouseEmulation || this.container.style.display === 'none') return;
        const zones = this.computeZones();
        this._zones = zones;
        if (!this.touchInAnyZone(e.clientX, e.clientY, zones)) {
            // Check if near dpad for drag
            if (Math.hypot(e.clientX - zones.dCx, e.clientY - zones.dCy) < zones.dR * 1.6) {
                this._mouseDpadLocked = true;
            }
            if (!this._mouseDpadLocked) return;
        }
        this._mouseDown = true;
        if (Math.hypot(e.clientX - zones.dCx, e.clientY - zones.dCy) < zones.dR * 1.6) {
            this._mouseDpadLocked = true;
        }
        this.processMouseAsTouch(e.clientX, e.clientY, true, zones);
    };

    private onMouseMove = (e: MouseEvent): void => {
        if (!this._mouseEmulation || !this._mouseDown) return;
        this.processMouseAsTouch(e.clientX, e.clientY, false, this._zones!);
    };

    private onMouseUp = (_e: MouseEvent): void => {
        if (!this._mouseEmulation || !this._mouseDown) return;
        this._mouseDown = false;
        this._mouseDpadLocked = false;
        this.input.setVirtualKey(Input.LEFT, false);
        this.input.setVirtualKey(Input.RIGHT, false);
        this.input.setVirtualKey(Input.UP, false);
        this.input.setVirtualKey(Input.DOWN, false);
        this.input.setVirtualKey(Input.SPACE, false);
        this.fireEl.style.background = 'rgba(120,0,0,0.45)';
        this.dpadArrows.forEach(el => el.style.color = 'rgba(180,180,180,0.7)');
        this.resetDpadNub();
    };

    private processMouseAsTouch(cx: number, cy: number, isNew: boolean, zones: ZoneData): void {
        const { dCx, dCy, dR, fCx, fCy, fR, cCx, cCy, cR, eCx, eCy, eR } = zones;

        // ESC and MODE work regardless of active state
        if (isNew && Math.hypot(cx - eCx, cy - eCy) < eR * 1.6) {
            if (this.onEsc) this.onEsc();
        }
        if (isNew && Math.hypot(cx - cCx, cy - cCy) < cR * 2) {
            this.configIndex = (this.configIndex + 1) % 3;
            this.input.queueVirtualPress(
                [Input.KEY_Q, Input.KEY_W, Input.KEY_E][this.configIndex]);
        }

        if (!this._active) return;

        let dx = 0, dy = 0, fire = false;

        if (this._mouseDpadLocked || Math.hypot(cx - dCx, cy - dCy) < dR * 1.6) {
            const result = this.processDpadTouch(cx, cy, zones);
            dx = result.dx;
            dy = result.dy;
        }

        if (Math.hypot(cx - fCx, cy - fCy) < fR * 1.6) fire = true;

        this.input.setVirtualKey(Input.LEFT, dx < 0);
        this.input.setVirtualKey(Input.RIGHT, dx > 0);
        this.input.setVirtualKey(Input.UP, dy < 0);
        this.input.setVirtualKey(Input.DOWN, dy > 0);
        this.input.setVirtualKey(Input.SPACE, fire);

        this.updateVisualFeedback(dx, dy, fire);
    }

    /** Process a touch/mouse position on the dpad. Returns directional input and moves nub. */
    private processDpadTouch(cx: number, cy: number, zones: ZoneData): { dx: number; dy: number } {
        const { dCx, dCy, dR } = zones;
        const dead = dR * 0.18;
        const maxVisual = dR * 0.85;

        const rawDx = cx - dCx;
        const rawDy = cy - dCy;
        const dist = Math.hypot(rawDx, rawDy);

        // Direction from raw offset (even if beyond boundary)
        let dx = 0, dy = 0;
        if (Math.abs(rawDx) > dead) dx = rawDx > 0 ? 1 : -1;
        if (Math.abs(rawDy) > dead) dy = rawDy > 0 ? 1 : -1;

        // Clamp nub visual position to maxVisual radius
        let nubOx = rawDx, nubOy = rawDy;
        if (dist > maxVisual) {
            nubOx = (rawDx / dist) * maxVisual;
            nubOy = (rawDy / dist) * maxVisual;
        }

        // Position nub relative to dpadBg
        const bgW = parseFloat(this.dpadBg.style.width) || 0;
        const nubW = parseFloat(this.dpadNub.style.width) || 0;
        this.dpadNub.style.left = `${bgW / 2 + nubOx - nubW / 2}px`;
        this.dpadNub.style.top = `${bgW / 2 + nubOy - nubW / 2}px`;

        return { dx, dy };
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
            const escSize = cfgSize * 0.5;

            const fireCx = w - margin- fireSize / 2;
            const fireCy = h - margin - fireSize / 2;
            const cfgCy = fireCy - fireSize / 2 - cfgSize / 2 - margin * 0.6;
            const modeFireGap = (fireCy - fireSize / 2) - (cfgCy + cfgSize / 2);
            const escCy = cfgCy - cfgSize / 2 - escSize / 2 - modeFireGap * 2;

            return {
                dCx: margin + dpadSize / 2,
                dCy: h - margin - dpadSize / 2,
                dR: dpadSize / 2,
                fCx: fireCx, fCy: fireCy, fR: fireSize / 2,
                cCx: fireCx, cCy: cfgCy, cR: cfgSize / 2,
                eCx: fireCx, eCy: escCy, eR: escSize,
            };
        } else {
            const cr = this.container.getBoundingClientRect();
            const ch = cr.height;
            const cw = cr.width;
            const top = cr.top;
            const left = cr.left;

            const dpadSize = Math.min(ch * 0.84, cw * 0.38);
            const fireSize = Math.min(ch * 0.84, cw * 0.18);
            const cfgSize = Math.min(ch * 0.45, cw * 0.10);
            const escSize = cfgSize * 0.5;

            const cy = top + ch * 0.25;
            const cfgCx = left + cw * 0.58;
            const dpadTop = cy - dpadSize / 2;
            const escCy = dpadTop - escSize;

            return {
                dCx: left + cw * 0.22, dCy: cy, dR: dpadSize / 2,
                fCx: left + cw * 0.78, fCy: cy, fR: fireSize / 2,
                cCx: cfgCx, cCy: cy, cR: cfgSize / 2,
                eCx: cfgCx, eCy: escCy, eR: escSize,
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
        const { fCx, fCy, fR, cCx, cCy, cR, eCx, eCy, eR } = zones;

        // ESC and MODE work regardless of active state
        if (newTouches) {
            for (let i = 0; i < newTouches.length; i++) {
                const tx = newTouches[i].clientX;
                const ty = newTouches[i].clientY;
                if (Math.hypot(tx - eCx, ty - eCy) < eR * 1.6) {
                    if (this.onEsc) this.onEsc();
                    break;
                }
            }
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
        }

        if (!this._active) return;

        let dx = 0, dy = 0, fire = false;

        for (let i = 0; i < touches.length; i++) {
            const t = touches[i];
            const tx = t.clientX;
            const ty = t.clientY;

            // D-pad: only process the tracked touch (allows sliding beyond boundary)
            if (t.identifier === this.dpadTouchId) {
                const result = this.processDpadTouch(tx, ty, zones);
                dx = result.dx;
                dy = result.dy;
            }

            if (Math.hypot(tx - fCx, ty - fCy) < fR * 1.6) fire = true;
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
