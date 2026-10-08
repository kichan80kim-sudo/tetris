"use strict";

const COLS = 10;
const ROWS = 20;
const TYPES = ["I", "O", "T", "S", "Z", "J", "L"];
const SCORE_BY_LINES = [0, 100, 300, 500, 800];
const DROP_SPEEDS = [1000, 850, 700, 550, 430, 340, 270, 210, 160, 120];

const PIECES = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  O: [
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[1, 1], [0, 2], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
};

const boardElement = document.querySelector("#board");
const nextGridElement = document.querySelector("#nextGrid");
const scoreElement = document.querySelector("#scoreValue");
const linesElement = document.querySelector("#linesValue");
const levelElement = document.querySelector("#levelValue");
const progressLabelElement = document.querySelector("#progressLabel");
const progressBarElement = document.querySelector("#progressBar");
const headerStatusElement = document.querySelector("#headerStatus");
const gameOverlay = document.querySelector("#gameOverlay");
const overlayTitle = document.querySelector("#overlayTitle");
const overlayMessage = document.querySelector("#overlayMessage");
const overlayAction = document.querySelector("#overlayAction");
const pauseButton = document.querySelector("#pauseButton");
const restartButton = document.querySelector("#restartButton");

const boardCells = [];
const nextCells = [];
let board = createEmptyBoard();
let bag = [];
let currentPiece = null;
let nextType = null;
let score = 0;
let lines = 0;
let level = 1;
let gameStatus = "ready";
let lastFrameTime = 0;
let lastDropTime = 0;
let lastSoftDropTime = 0;
let animationFrameId = null;

function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function createCells() {
  for (let index = 0; index < ROWS * COLS; index += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-hidden", "true");
    boardElement.appendChild(cell);
    boardCells.push(cell);
  }

  for (let index = 0; index < 16; index += 1) {
    const cell = document.createElement("div");
    cell.className = "next-cell";
    cell.setAttribute("aria-hidden", "true");
    nextGridElement.appendChild(cell);
    nextCells.push(cell);
  }
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function drawType() {
  if (bag.length === 0) bag = shuffle(TYPES);
  return bag.pop();
}

function createPiece(type) {
  return { type, rotation: 0, x: 3, y: 0 };
}

function getCells(piece, rotation = piece.rotation, offsetX = 0, offsetY = 0) {
  return PIECES[piece.type][rotation].map(([x, y]) => ({
    x: piece.x + x + offsetX,
    y: piece.y + y + offsetY,
  }));
}

function isValid(piece, offsetX = 0, offsetY = 0, rotation = piece.rotation) {
  return getCells(piece, rotation, offsetX, offsetY).every(({ x, y }) => {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
    return board[y][x] === null;
  });
}

function spawnPiece() {
  currentPiece = createPiece(nextType);
  nextType = drawType();
  if (!isValid(currentPiece)) {
    endGame();
  }
}

function startGame() {
  board = createEmptyBoard();
  bag = [];
  score = 0;
  lines = 0;
  level = 1;
  nextType = drawType();
  gameStatus = "playing";
  spawnPiece();
  lastFrameTime = performance.now();
  lastDropTime = lastFrameTime;
  lastSoftDropTime = lastFrameTime;
  updateOverlay();
  render();
}

function endGame() {
  gameStatus = "over";
  updateOverlay();
  render();
}

function togglePause() {
  if (gameStatus === "playing") {
    gameStatus = "paused";
  } else if (gameStatus === "paused") {
    gameStatus = "playing";
    const now = performance.now();
    lastFrameTime = now;
    lastDropTime = now;
    lastSoftDropTime = now;
  } else {
    return;
  }
  updateOverlay();
  render();
}

function moveHorizontal(direction) {
  if (gameStatus !== "playing" || !currentPiece) return;
  if (isValid(currentPiece, direction, 0)) {
    currentPiece.x += direction;
    render();
  }
}

function moveDown(isSoftDrop = false) {
  if (gameStatus !== "playing" || !currentPiece) return false;
  if (isValid(currentPiece, 0, 1)) {
    currentPiece.y += 1;
    if (isSoftDrop) score += 1;
    render();
    return true;
  }
  lockPiece();
  return false;
}

function hardDrop() {
  if (gameStatus !== "playing" || !currentPiece) return;
  let distance = 0;
  while (isValid(currentPiece, 0, 1)) {
    currentPiece.y += 1;
    distance += 1;
  }
  score += distance * 2;
  lockPiece();
  render();
}

function rotate(direction) {
  if (gameStatus !== "playing" || !currentPiece) return;
  const nextRotation = (currentPiece.rotation + direction + 4) % 4;
  const wallKicks = [0, -1, 1, -2, 2];
  for (const kick of wallKicks) {
    if (isValid(currentPiece, kick, 0, nextRotation)) {
      currentPiece.rotation = nextRotation;
      currentPiece.x += kick;
      render();
      return;
    }
  }
}

function lockPiece() {
  if (!currentPiece) return;
  for (const { x, y } of getCells(currentPiece)) {
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) board[y][x] = currentPiece.type;
  }
  clearLines();
  spawnPiece();
  const now = performance.now();
  lastDropTime = now;
  lastSoftDropTime = now;
}

function clearLines() {
  const remainingRows = board.filter((row) => row.some((cell) => cell === null));
  const cleared = ROWS - remainingRows.length;
  if (cleared === 0) return;

  board = Array.from({ length: cleared }, () => Array(COLS).fill(null)).concat(remainingRows);
  score += SCORE_BY_LINES[cleared] * level;
  lines += cleared;
  level = Math.floor(lines / 10) + 1;
}

function getDropInterval() {
  return DROP_SPEEDS[Math.min(level - 1, DROP_SPEEDS.length - 1)] ?? 100;
}

function getGhostPiece() {
  if (!currentPiece) return null;
  const ghost = { ...currentPiece };
  while (isValid(ghost, 0, 1)) ghost.y += 1;
  return ghost;
}

function paintCell(cell, type, extraClass = "") {
  cell.className = type ? `cell piece-${type.toLowerCase()} ${extraClass}` : `cell ${extraClass}`;
}

function renderBoard() {
  const display = board.map((row) => [...row]);
  const ghost = getGhostPiece();
  if (ghost && gameStatus === "playing") {
    for (const { x, y } of getCells(ghost)) {
      if (display[y]?.[x] === null) display[y][x] = `ghost-${ghost.type}`;
    }
  }
  if (currentPiece && gameStatus !== "over") {
    for (const { x, y } of getCells(currentPiece)) {
      if (display[y]?.[x] === null) display[y][x] = `current-${currentPiece.type}`;
    }
  }

  display.forEach((row, y) => row.forEach((value, x) => {
    const cell = boardCells[y * COLS + x];
    if (!value) {
      paintCell(cell, null);
      return;
    }
    if (value.startsWith("ghost-")) {
      const type = value.replace("ghost-", "");
      paintCell(cell, type, "ghost");
      return;
    }
    if (value.startsWith("current-")) {
      const type = value.replace("current-", "");
      paintCell(cell, type, "current");
      return;
    }
    paintCell(cell, value, "locked");
  }));
}

function renderNext() {
  nextCells.forEach((cell) => { cell.className = "next-cell"; });
  if (!nextType) return;
  const previewPiece = { type: nextType, rotation: 0, x: 0, y: 0 };
  for (const { x, y } of getCells(previewPiece)) {
    if (x >= 0 && x < 4 && y >= 0 && y < 4) {
      nextCells[y * 4 + x].className = `next-cell piece-${nextType.toLowerCase()}`;
    }
  }
}

function renderStats() {
  scoreElement.textContent = String(score).padStart(6, "0");
  linesElement.textContent = String(lines).padStart(3, "0");
  levelElement.textContent = String(level).padStart(2, "0");
  const levelProgress = lines % 10;
  progressLabelElement.textContent = `${levelProgress} / 10`;
  progressBarElement.style.width = `${levelProgress * 10}%`;
}

function updateOverlay() {
  const content = {
    ready: {
      title: "게임 준비 완료",
      message: "블록을 쌓아 빈틈없는 라인을 만들어 보세요.",
      button: "게임 시작",
      status: "준비 완료",
    },
    playing: { title: "", message: "", button: "", status: "플레이 중" },
    paused: {
      title: "일시정지",
      message: "잠깐 쉬어도 좋아요. 준비가 되면 계속하세요.",
      button: "계속하기",
      status: "일시정지",
    },
    over: {
      title: "게임 오버",
      message: `최종 점수 ${String(score).padStart(6, "0")}점 · ${lines}줄을 지웠습니다.`,
      button: "다시 시작",
      status: "게임 오버",
    },
  }[gameStatus];

  headerStatusElement.textContent = content.status;
  gameOverlay.classList.toggle("is-visible", gameStatus !== "playing");
  pauseButton.textContent = gameStatus === "paused" ? "계속하기" : "일시정지";
  pauseButton.disabled = gameStatus !== "playing" && gameStatus !== "paused";
  if (gameStatus !== "playing") {
    overlayTitle.textContent = content.title;
    overlayMessage.textContent = content.message;
    overlayAction.textContent = content.button;
  }
}

function render() {
  renderBoard();
  renderNext();
  renderStats();
  updateOverlay();
}

function gameLoop(timestamp) {
  if (gameStatus === "playing") {
    if (timestamp - lastSoftDropTime >= 45 && heldKeys.has("ArrowDown")) {
      moveDown(true);
      lastSoftDropTime = timestamp;
    }
    if (timestamp - lastDropTime >= getDropInterval()) {
      moveDown();
      lastDropTime = timestamp;
    }
  }
  lastFrameTime = timestamp;
  animationFrameId = requestAnimationFrame(gameLoop);
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();
  const handledKeys = ["arrowleft", "arrowright", "arrowdown", "arrowup", " ", "z", "p", "escape", "r"];
  if (!handledKeys.includes(key)) return;
  event.preventDefault();

  if (key === "p" || key === "escape") {
    togglePause();
    return;
  }
  if (key === "r") {
    startGame();
    return;
  }
  if (gameStatus !== "playing" || event.repeat && (key === " " || key === "arrowup" || key === "z")) return;

  if (key === "arrowleft") moveHorizontal(-1);
  if (key === "arrowright") moveHorizontal(1);
  if (key === "arrowdown") {
    moveDown(true);
    lastSoftDropTime = performance.now();
  }
  if (key === "arrowup") rotate(1);
  if (key === "z") rotate(-1);
  if (key === " ") hardDrop();
}

const heldKeys = new Set();

function handleKeyUp(event) {
  heldKeys.delete(event.key);
}

function handleControl(control) {
  if (control === "left") moveHorizontal(-1);
  if (control === "right") moveHorizontal(1);
  if (control === "rotate") rotate(1);
  if (control === "down") moveDown(true);
  if (control === "drop") hardDrop();
}

createCells();
document.addEventListener("keydown", (event) => {
  heldKeys.add(event.key);
  handleKeyDown(event);
});
document.addEventListener("keyup", handleKeyUp);
overlayAction.addEventListener("click", () => {
  if (gameStatus === "paused") togglePause();
  else startGame();
});
restartButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
document.querySelectorAll("[data-control]").forEach((button) => {
  button.addEventListener("click", () => handleControl(button.dataset.control));
});

render();
if (!animationFrameId) animationFrameId = requestAnimationFrame(gameLoop);
