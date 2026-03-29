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

function fitCanvas(canvas: HTMLCanvasElement, reserveBottom: number): void {
    const safeTop = cachedSafeTop;
    const scaleX = window.innerWidth / GAME_W;
    const scaleY = (window.innerHeight - reserveBottom - safeTop) / GAME_H;
    const scale = Math.min(scaleX, scaleY);
    canvas.style.transform = `scale(${scale})`;
    if (reserveBottom > 0 || safeTop > 0) {
        // Portrait or safe-area: push canvas below notch/island
        canvas.style.transformOrigin = 'top center';
        document.body.style.alignItems = 'flex-start';
        document.body.style.paddingTop = safeTop > 0 ? `${safeTop}px` : '0';
    } else {
        // Landscape: center canvas in viewport
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
        if (reserve !== lastReserve) {
            lastReserve = reserve;
            fitCanvas(canvas, reserve);
        }
    }

    syncLayout();
    window.addEventListener('resize', () => {
        refreshSafeArea();
        lastReserve = -1; // force re-fit
        syncLayout();
        touch.layout();
    });

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

        game.render();
        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
});
