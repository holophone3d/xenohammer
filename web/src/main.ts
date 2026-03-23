// -- Engine imports will go here --
// import { Engine } from './engine/engine';

// -- Game module imports will go here --
// import { Game } from './game/game';

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let lastTime = 0;

function drawLoadingScreen(): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#0f0";
  ctx.font = "24px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("XenoHammer Loading...", canvas.width / 2, canvas.height / 2);
}

function update(_deltaTime: number): void {
  // -- Game update logic will go here --
}

function render(): void {
  // -- Game render logic will go here --
  // For now, show loading screen
  drawLoadingScreen();
}

function gameLoop(timestamp: number): void {
  const deltaTime = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  update(deltaTime);
  render();

  requestAnimationFrame(gameLoop);
}

// Initial draw and start loop
drawLoadingScreen();
requestAnimationFrame(gameLoop);
