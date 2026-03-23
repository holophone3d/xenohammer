import { GameManager } from './game/GameManager';

const TICK_RATE = 1 / 60; // 60 logic ticks per second
const MAX_TICKS_PER_FRAME = 5;

const game = new GameManager('game-canvas');

game.init().then(() => {
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
