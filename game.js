const TILE = 16;
const COLS = 20;
const ROWS = 30;

const canvas = document.getElementById("game");
canvas.width = COLS * TILE;
canvas.height = ROWS * TILE;

const ctx = canvas.getContext("2d");

let level = 1;

let player = {
  col: 10,
  row: ROWS - 2
};

let rocks = [];

let map = generateMountain();

function generateMountain() {
  let grid = [];

  for (let r = 0; r < ROWS; r++) {
    let row = [];
    for (let c = 0; c < COLS; c++) {
      row.push(0);
    }
    grid.push(row);
  }

  // Base platform (guaranteed start)
  for (let c = 0; c < COLS; c++) {
    grid[ROWS - 1][c] = 1;
  }

  // Random ledges
  for (let r = 3; r < ROWS - 2; r += 3) {
    let start = Math.floor(Math.random() * (COLS - 5));
    for (let i = 0; i < 5; i++) {
      grid[r][start + i] = 1;
    }
  }

  return grid;
}

function drawTile(col, row, color) {
  ctx.fillStyle = color;
  ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
}

function draw() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw mountain
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (map[r][c] === 1) {
        drawTile(c, r, "#654321");
      }
    }
  }

  // Draw player
  drawTile(player.col, player.row, "#00ffff");

  // Debug tile markers
ctx.fillStyle = "red";
ctx.fillRect(player.col * TILE, (player.row + 1) * TILE, TILE, TILE);

ctx.fillStyle = "blue";
ctx.fillRect(player.col * TILE, (player.row - 1) * TILE, TILE, TILE);

  // Draw rocks
  rocks.forEach(rock => {
    drawTile(rock.col, rock.row, "#aaaaaa");
  });
}

function update() {
 // Gravity
let supported =
  player.row < ROWS - 1 &&
  map[player.row + 1][player.col] === 1;

if (!supported) {
  player.row++;
}

  // Move rocks
  rocks.forEach(rock => rock.row += 1);

  // Remove rocks off screen
  rocks = rocks.filter(r => r.row < ROWS);

  // Spawn rocks
  if (Math.random() < 0.05) {
    rocks.push({
      col: Math.floor(Math.random() * COLS),
      row: 0
    });
  }

  // Rock collision
  rocks.forEach(rock => {
    if (rock.col === player.col && rock.row === player.row) {
      resetLevel();
    }
  });

  // Summit check
  if (player.row === 0) {
    level++;
    resetLevel();
  }
}

function resetLevel() {
  player.col = 10;
  player.row = ROWS - 2;
  rocks = [];
  map = generateMountain();
}

document.addEventListener("keydown", function(e) {

  if (["ArrowLeft", "ArrowRight", "ArrowUp"].includes(e.key)) {
    e.preventDefault();
  }

  if (e.key === "ArrowLeft" && player.col > 0) {
    player.col--;
  }

  if (e.key === "ArrowRight" && player.col < COLS - 1) {
    player.col++;
  }

  if (e.key === "ArrowUp" && player.row > 0) {
    player.row++;
  }

});

function gameLoop() {
  update();
  draw();
  setTimeout(gameLoop, 120); // controls speed
}

gameLoop();