import { GameManager, GameState } from './game/GameManager';
import { TouchControls } from './engine/TouchControls';

const TICK_RATE = 1 / 60; // 60 logic ticks per second
const MAX_TICKS_PER_FRAME = 5;
const GAME_W = 800;
const GAME_H = 600;

// Probe element to reliably read env(safe-area-inset-top) via a real CSS property.
// CSS custom properties store env() unevaluated; only real properties resolve it.
const safeAreaProbe = document.createElement('div');
Object.assign(safeAreaProbe.style, {
    position: 'fixed', top: '0', left: '0', width: '0', height: '0',
    paddingTop: 'env(safe-area-inset-top, 0px)',
    visibility: 'hidden', pointerEvents: 'none',
});
document.documentElement.appendChild(safeAreaProbe);

// Cached safe-area value — only re-read on resize (getComputedStyle is expensive)
let cachedSafeTop = 0;
function refreshSafeArea(): void {
    cachedSafeTop = parseInt(getComputedStyle(safeAreaProbe).paddingTop, 10) || 0;
}
refreshSafeArea();

function fitCanvas(canvas: HTMLCanvasElement, reserveBottom: number, forceTop = false): void {
    const safeTop = cachedSafeTop;
    const scaleX = window.innerWidth / GAME_W;
    const scaleY = (window.innerHeight - reserveBottom - safeTop) / GAME_H;
    const scale = Math.min(scaleX, scaleY);
    canvas.style.transform = `scale(${scale})`;
    if (reserveBottom > 0 || safeTop > 0 || forceTop) {
        // Portrait/touch/safe-area: top-align canvas
        canvas.style.transformOrigin = 'top center';
        document.body.style.alignItems = 'flex-start';
        document.body.style.paddingTop = safeTop > 0 ? `${safeTop}px` : '0';
    } else {
        // Landscape or desktop: center canvas in viewport
        canvas.style.transformOrigin = 'center center';
        document.body.style.alignItems = 'center';
        document.body.style.paddingTop = '0';
    }
}

const game = new GameManager('game-canvas');

// Poll loading progress and update the HTML overlay
const barEl = document.getElementById('loading-bar');
const pctEl = document.getElementById('loading-pct');
const overlayEl = document.getElementById('loading-overlay');
const progressInterval = setInterval(() => {
    const p = game.assets.getProgress();
    if (barEl) barEl.style.width = `${Math.floor(p * 100)}%`;
    if (pctEl) pctEl.textContent = `${Math.floor(p * 100)}%`;
}, 100);

game.init().then(() => {
    clearInterval(progressInterval);
    // Show 100% before fading
    if (barEl) barEl.style.width = '100%';
    if (pctEl) pctEl.textContent = '100%';
    // Fade out and remove overlay after a brief flash of 100%
    setTimeout(() => {
        if (overlayEl) {
            overlayEl.classList.add('hidden');
            setTimeout(() => overlayEl.remove(), 500);
        }
    }, 300);

    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

    // Create touch controls (self-appends to body)
    const touch = new TouchControls(game.input);
    game.touchControls = touch;
    touch.onEsc = () => game.input.queueVirtualPress('Escape');

    // Show touch controls from StartScreen onward (hidden only during Loading)
    let controlsShown = false;
    let lastReserve = -1; // track to avoid redundant fitCanvas calls
    let lastPortraitTouch = false;

    function syncLayout(): void {
        const showControls = game.state !== GameState.Loading;
        if (showControls !== controlsShown) {
            controlsShown = showControls;
            if (showControls && touch.isTouchDevice) {
                touch.show();
            } else {
                touch.hide();
            }
        }
        // Reserve bottom space for portrait touch controls during gameplay
        const gameplay = game.isGameplay();
        const reserve = (gameplay && showControls) ? touch.getReservedHeight() : 0;
        // On touch devices in portrait, always top-align so canvas doesn't
        // jump from centered → top when transitioning to gameplay
        const portraitTouch = touch.isTouchDevice && window.innerHeight > window.innerWidth;
        if (reserve !== lastReserve || portraitTouch !== lastPortraitTouch) {
            lastReserve = reserve;
            lastPortraitTouch = portraitTouch;
            fitCanvas(canvas, reserve, portraitTouch);
        }
    }

    syncLayout();
    window.addEventListener('resize', () => {
        refreshSafeArea();
        lastReserve = -1; // force re-fit
        lastPortraitTouch = !lastPortraitTouch; // force re-check
        syncLayout();
        touch.layout();
    });

    // === PC Controls Overlay (non-touch only, shown once on first ReadyRoom) ===
    let pcOverlayShown = false;
    function maybeShowPCControls(): void {
        if (pcOverlayShown || touch.isTouchDevice) return;
        if (game.state !== GameState.ReadyRoom) return;
        if (localStorage.getItem('xh-pc-controls-dismissed')) return;
        pcOverlayShown = true;

        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', inset: '0', zIndex: '9999',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
        });
        overlay.innerHTML = `
            <div style="background:#111;border:1px solid #0f6;border-radius:12px;padding:2rem 2.5rem;max-width:420px;text-align:center;font-family:sans-serif;color:#ccc">
                <h2 style="color:#0f6;margin:0 0 1.2rem;font-size:1.3rem;letter-spacing:.05em">Controls</h2>
                <div style="display:grid;grid-template-columns:auto 1fr;gap:.5rem 1rem;text-align:left;font-size:.95rem;margin-bottom:1.2rem">
                    <kbd style="background:#222;border:1px solid #444;border-radius:4px;padding:.15rem .5rem;color:#fff;font-family:monospace;text-align:center">← → ↑ ↓</kbd><span>Move ship</span>
                    <kbd style="background:#222;border:1px solid #444;border-radius:4px;padding:.15rem .5rem;color:#fff;font-family:monospace;text-align:center">Space</kbd><span>Fire weapons</span>
                    <kbd style="background:#222;border:1px solid #444;border-radius:4px;padding:.15rem .5rem;color:#fff;font-family:monospace;text-align:center">Esc</kbd><span>Back / Return to base</span>
                    <kbd style="background:#222;border:1px solid #444;border-radius:4px;padding:.15rem .5rem;color:#fff;font-family:monospace;text-align:center">Q W E</kbd><span>Toggle ship configurations</span>
                </div>
                <p style="color:#9f9;font-size:.85rem;margin:0 0 1.5rem;line-height:1.5">💡 Upgrade your ship at the space station between missions!</p>
                <div style="display:flex;gap:.75rem;justify-content:center">
                    <button id="xh-pc-ok" style="background:#0f6;color:#000;border:none;border-radius:6px;padding:.5rem 1.5rem;font-weight:700;font-size:.9rem;cursor:pointer">Got it!</button>
                    <button id="xh-pc-dont" style="background:transparent;color:#666;border:1px solid #333;border-radius:6px;padding:.5rem 1rem;font-size:.8rem;cursor:pointer">Don't show again</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        const dismiss = () => overlay.remove();
        overlay.querySelector('#xh-pc-ok')!.addEventListener('click', dismiss);
        overlay.querySelector('#xh-pc-dont')!.addEventListener('click', () => {
            localStorage.setItem('xh-pc-controls-dismissed', '1');
            dismiss();
        });
        overlay.addEventListener('click', (e) => { if (e.target === overlay) dismiss(); });
        document.addEventListener('keydown', function esc(e) {
            if (e.key === 'Escape' || e.key === ' ') { dismiss(); document.removeEventListener('keydown', esc); }
        });
    }

    let lastTime = performance.now();
    let accumulator = 0;
    // Track render-frame FPS (not logic-tick rate)
    let renderFpsFrames = 0;
    let renderFpsAccum = 0;

    function gameLoop(timestamp: number): void {
        const frameTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;
        accumulator += Math.min(frameTime, MAX_TICKS_PER_FRAME * TICK_RATE);

        while (accumulator >= TICK_RATE) {
            game.update(TICK_RATE);
            accumulator -= TICK_RATE;
        }

        // Track actual render FPS and push to GameManager for display
        renderFpsFrames++;
        renderFpsAccum += frameTime;
        if (renderFpsAccum >= 0.5) {
            game.debugFpsDisplay = Math.round(renderFpsFrames / renderFpsAccum);
            renderFpsFrames = 0;
            renderFpsAccum = 0;
        }

        // Set interpolation alpha for smooth rendering between fixed ticks
        game.renderAlpha = accumulator / TICK_RATE;

        // Check for state transition → refit canvas
        syncLayout();
        maybeShowPCControls();

        game.render();
        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
});
