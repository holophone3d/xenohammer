import { GameManager } from './game/GameManager';
import { TouchControls } from './engine/TouchControls';

const TICK_RATE = 1 / 60; // 60 logic ticks per second
const MAX_TICKS_PER_FRAME = 5;
const GAME_W = 800;
const GAME_H = 600;

function fitCanvas(canvas: HTMLCanvasElement, reserveBottom: number): void {
    const scaleX = window.innerWidth / GAME_W;
    const scaleY = (window.innerHeight - reserveBottom) / GAME_H;
    const scale = Math.min(scaleX, scaleY);
    canvas.style.transform = `scale(${scale})`;
    if (reserveBottom > 0) {
        // Portrait: push canvas to top so controls sit below
        canvas.style.transformOrigin = 'top center';
        document.body.style.alignItems = 'flex-start';
    } else {
        // Landscape: center canvas in viewport
        canvas.style.transformOrigin = 'center center';
        document.body.style.alignItems = 'center';
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
    // Fade out and remove overlay
    if (overlayEl) {
        overlayEl.classList.add('hidden');
        setTimeout(() => overlayEl.remove(), 500);
    }

    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

    // Create touch controls (self-appends to body)
    const touch = new TouchControls(game.input);
    game.touchControls = touch;
    touch.onEsc = () => game.escToReadyRoom();
    const reserved = touch.getReservedHeight();

    if (touch.isTouchDevice) {
        touch.show();
    }

    fitCanvas(canvas, reserved);
    window.addEventListener('resize', () => {
        fitCanvas(canvas, touch.getReservedHeight());
        touch.layout();
    });

    let lastTime = performance.now();
    let accumulator = 0;

    function gameLoop(timestamp: number): void {
        const frameTime = (timestamp - lastTime) / 1000;
        lastTime = timestamp;
        accumulator += Math.min(frameTime, MAX_TICKS_PER_FRAME * TICK_RATE);

        while (accumulator >= TICK_RATE) {
            game.update(TICK_RATE);
            accumulator -= TICK_RATE;
        }

        game.render();
        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
});
