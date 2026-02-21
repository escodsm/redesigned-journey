const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function draw() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#00ffff";
  ctx.font = "24px monospace";
  ctx.fillText("TI RETRO GAME", 200, 240);

  requestAnimationFrame(draw);
}

draw();