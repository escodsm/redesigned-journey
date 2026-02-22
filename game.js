const TILE = 16;
const COLS = 20;
const ROWS = 30;

const canvas = document.getElementById("game");
canvas.width = COLS * TILE;
canvas.height = ROWS * TILE;

const ctx = canvas.getContext("2d");

let justClimbed = false;
let hearts = 4;
let airClimbCount = 0;
let fallDistance = 0;
let isFalling = false;

let level = 1;

let player = {
  col: 10,
  row: ROWS - 2
};

let rocks = [];

// === NEW: Reachability tuning ===
// Adjust these to match your game's feel.
const MAX_JUMP_UP = 1;       // max vertical gap in tiles between reachable platforms
const MAX_JUMP_ACROSS = 5;   // max horizontal shift between successive platforms
const MIN_PLATFORM_WIDTH = 3;
const MAX_PLATFORM_WIDTH = 9;
const GRAVITY = 1;              // tiles per tick (1 = current behavior)
const FALL_DAMAGE_THRESHOLD = 8; // tiles fallen before losing a heart

// === NEW: Collapse system ===
let collapsingPlatforms = []; // active collapses (objects)
let armedCollapseKey = null;  // only arm collapse once per "standing on same platform"

let map = generateMountain();

function generateMountain() {
  let grid = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(0)
  );

  // Base ground
  for (let c = 0; c < COLS; c++) {
    grid[ROWS - 1][c] = 1;
  }

  // === First guaranteed reachable platform ===
  // Always 2 tiles above spawn, centered near player
  let firstRow = ROWS - 2;
  let firstWidth = 5;
  let firstCol = player.col - 2;

  firstCol = Math.max(1, Math.min(COLS - firstWidth - 1, firstCol));

  for (let w = 0; w < firstWidth; w++) {
    grid[firstRow][firstCol + w] = 2;
  }

  // Continue upward from there
  let currentRow = firstRow;
  let currentCol = firstCol;

  while (currentRow > 3) {

    let width = Math.floor(Math.random() * 3) + 3;

    let colShift = Math.floor(Math.random() * 7) - 3;
    currentCol = Math.max(1,
      Math.min(COLS - width - 1, currentCol + colShift)
    );

    let rowShift = Math.floor(Math.random() * 3) + 2;
    currentRow -= rowShift;

    for (let w = 0; w < width; w++) {
      if (currentRow >= 0)
        grid[currentRow][currentCol + w] = 2;
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

  // Draw hearts
  for (let i = 0; i < hearts; i++) {
    ctx.fillStyle = "red";
    ctx.fillRect(5 + i * 18, 5, 12, 12);
  }

  // Draw mountain/platforms
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (map[r][c] === 1) {
        drawTile(c, r, "#654321"); // ground
      } else if (map[r][c] === 2) {
        drawTile(c, r, "#8b5a2b"); // brown platform
      }
    }
  }

  // Draw player
  drawTile(player.col, player.row, "#00ffff");

  // Debug tile markers (optional)
  ctx.fillStyle = "red";
  ctx.fillRect(player.col * TILE, (player.row + 1) * TILE, TILE, TILE);

  ctx.fillStyle = "blue";
  ctx.fillRect(player.col * TILE, (player.row - 1) * TILE, TILE, TILE);

  // Draw rocks
  rocks.forEach(rock => {
    drawTile(rock.col, rock.row, "#aaaaaa");
  });
}

function isSolid(tile) {
  // === NEW: both ground and platforms are solid ===
  return tile === 1 || tile === 2;
}

function getTile(row, col) {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return 0;
  return map[row][col];
}

function checkForCollapseArming() {
  // If player's feet are supported by a brown platform, arm a collapse for that platform "segment"
  const belowRow = player.row + 1;
  const belowCol = player.col;

  if (belowRow < 0 || belowRow >= ROWS) return;

  if (getTile(belowRow, belowCol) !== 2) {
    // not standing on brown; allow arming again later
    armedCollapseKey = null;
    return;
  }

  // Find the contiguous segment at that row (start/end of that platform run)
  let start = belowCol;
  let end = belowCol;

  while (start > 0 && getTile(belowRow, start - 1) === 2) start--;
  while (end < COLS - 1 && getTile(belowRow, end + 1) === 2) end++;

  const key = `${belowRow}:${start}:${end}`;

  // Only arm once per segment while you're on it
  if (armedCollapseKey === key) return;
  armedCollapseKey = key;

  // Don’t duplicate if already collapsing
  if (collapsingPlatforms.some(p => p.key === key)) return;

  collapsingPlatforms.push({
    key,
    row: belowRow,
    start,
    end,
    dir: Math.random() < 0.5 ? "left" : "right",
    delay: 18,     // ticks before first crumble
    stepDelay: 8   // ticks between each tile collapse
  });
}

function updateCollapse() {
  for (const p of collapsingPlatforms) {
    if (p.delay > 0) {
      p.delay--;
      continue;
    }

    // crumble one tile
    if (p.dir === "left") {
      if (p.start <= p.end) {
        map[p.row][p.start] = 0;
        p.start++;
      }
    } else {
      if (p.start <= p.end) {
        map[p.row][p.end] = 0;
        p.end--;
      }
    }

    // reset delay between steps
    p.delay = p.stepDelay;
  }

  // Remove finished collapses
  collapsingPlatforms = collapsingPlatforms.filter(p => p.start <= p.end);
}

function update() {
  // === NEW: support includes tile 1 or 2 ===
  let supported =
    player.row < ROWS - 1 &&
    isSolid(getTile(player.row + 1, player.col));

  // Gravity (but not on the same tick we climbed)
if (!supported && !justClimbed) {

  let fallAmount = GRAVITY;

  // prevent falling past bottom
  if (player.row + fallAmount >= ROWS - 1) {
    fallAmount = (ROWS - 1) - player.row;
  }

  player.row += fallAmount;
  isFalling = true;
  fallDistance += fallAmount;
}

  // Landing resets
if (supported) {

  if (isFalling && fallDistance >= FALL_DAMAGE_THRESHOLD) {
    hearts--;
    hearts = Math.max(0, hearts);
  }

  isFalling = false;
  fallDistance = 0;
  airClimbCount = 0;
}

  // === NEW: arm collapse only when standing supported on brown ===
  if (supported) {
    checkForCollapseArming();
  } else {
    armedCollapseKey = null;
  }

  // clear climb suppression at end of tick
  justClimbed = false;

  // === NEW: update collapsing platforms ===
  updateCollapse();

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
  collapsingPlatforms = [];
  armedCollapseKey = null;
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

  if (e.key === "ArrowUp") {
    let supportedBefore =
      player.row < ROWS - 1 &&
      isSolid(getTile(player.row + 1, player.col));

    let canClimb = supportedBefore || airClimbCount < 2;

    if (player.row > 0 && canClimb) {
      player.row--;
      justClimbed = true;

      // Recompute support after moving up
      let supportedAfter =
        player.row < ROWS - 1 &&
        isSolid(getTile(player.row + 1, player.col));

      if (!supportedAfter) airClimbCount++;
      else airClimbCount = 0;
    }
  }
});

function gameLoop() {
  update();
  draw();
  setTimeout(gameLoop, 120); // controls speed
}

gameLoop();