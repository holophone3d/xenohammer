import { GameManager } from './game/GameManager';

const game = new GameManager('game-canvas');

game.init().then(() => {
    let lastTime = 0;

    function gameLoop(timestamp: number): void {
        const dt = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        game.update(dt);
        game.render();

        requestAnimationFrame(gameLoop);
    }

    requestAnimationFrame(gameLoop);
});
