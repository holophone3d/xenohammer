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
    // On touch devices, push canvas to the top so controls sit below
    if (reserveBottom > 0) {
        canvas.style.transformOrigin = 'top center';
        document.body.style.alignItems = 'flex-start';
    }
}

const game = new GameManager('game-canvas');

game.init().then(() => {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

    // Create touch controls (self-appends to body)
    const touch = new TouchControls(game.input);
    game.touchControls = touch;
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
