/** UI controller: renders the core game state and turns input into game calls. */

import { Game } from "./core/game.js";
import { ANIMALS } from "./core/tiles.js";
import { isMuted, isMusicOn, playMusic, setMusic, setMuted, sfx, stopMusic } from "./ui/audio.js";
import { sceneFor } from "./ui/scenes.js";
import { load, save } from "./ui/storage.js";
import { initAnalytics, track } from "./ui/analytics.js";

initAnalytics();

const GRAVITY_LABELS = {
  none: "Đứng yên",
  down: "↓ Rơi xuống",
  up: "↑ Bay lên",
  left: "← Dồn trái",
  right: "→ Dồn phải",
  "center-x": "→← Dồn vào giữa",
  "outward-x": "←→ Tách hai bên",
  "center-y": "↓↑ Dồn giữa (dọc)",
  "outward-y": "↑↓ Tách lên xuống",
};
const LOW_TIME = 30;
const REMOVE_MS = 300;
const SETTLE_MS = 200;
const REVEAL_MS = 2400; // time to admire the uncovered picture before the clear dialog

const $ = (id) => document.getElementById(id);
const ui = {
  hud: document.querySelector(".hud"),
  stage: $("stage"),
  board: $("board"),
  pathLayer: $("path-layer"),
  overlay: $("overlay"),
  panel: $("panel"),
  level: $("level"),
  score: $("score"),
  best: $("best"),
  timer: document.querySelector(".timer"),
  timerFill: $("timer-fill"),
  timerText: $("timer-text"),
  gravity: $("gravity"),
  hintButton: $("hint-btn"),
  hintCount: $("hint-count"),
  shuffleButton: $("shuffle-btn"),
  shuffleCount: $("shuffle-count"),
  pauseButton: $("pause-btn"),
  soundButton: $("sound-btn"),
  musicButton: $("music-btn"),
  scene: $("scene"),
  sceneArt: $("scene-art"),
  sceneCaption: $("scene-caption"),
  combo: $("combo"),
  toast: $("toast"),
};

const game = new Game();
const tileNodes = new Map(); // tile id → element
const cursorGhost = Object.assign(document.createElement("div"), { className: "cursor-ghost" });
cursorGhost.hidden = true;
ui.board.append(cursorGhost);

let size = 40;
let best = load("best", 0);
let busyUntil = 0;
let hintPair = null;
let cursor = null; // { r, c } while playing with the keyboard
let pathTimer = 0;
let toastTimer = 0;
let shownSecond = -1;

setMuted(load("muted", false));
setMusic(load("music", true));
let sceneLevel = 0;

// Layout & rendering -----------------------------------------------------------------------

function availableArea() {
  const hudHeight = ui.hud.getBoundingClientRect().height;
  document.documentElement.style.setProperty("--hud-actual", `${hudHeight}px`);
  const style = getComputedStyle(ui.stage);
  const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  // clientWidth/Height is the layout viewport. innerWidth grows on mobile when content
  // overflows, which would size the board from its own overflow and never shrink back.
  const root = document.documentElement;
  return { width: root.clientWidth - padX, height: root.clientHeight - hudHeight - padY };
}

function preferredOrientation() {
  const { width, height } = availableArea();
  return width < height ? "portrait" : "landscape";
}

function layout() {
  const board = game.board;
  if (!board) return;
  const { width, height } = availableArea();
  size = Math.floor(Math.min(width / board.width, height / board.height));
  size = Math.max(18, Math.min(76, size));
  const pixelWidth = board.width * size;
  const pixelHeight = board.height * size;
  ui.board.style.width = `${pixelWidth}px`;
  ui.board.style.height = `${pixelHeight}px`;
  ui.board.style.setProperty("--tile-size", `${size}px`);
  ui.pathLayer.setAttribute("viewBox", `0 0 ${pixelWidth} ${pixelHeight}`);
  ui.pathLayer.setAttribute("width", pixelWidth);
  ui.pathLayer.setAttribute("height", pixelHeight);
  Object.assign(ui.scene.style, {
    left: `${size}px`,
    top: `${size}px`,
    width: `${(board.width - 2) * size}px`,
    height: `${(board.height - 2) * size}px`,
  });
  render();
}

function createTile(id, kind) {
  const node = document.createElement("button");
  node.className = "tile";
  node.type = "button";
  node.tabIndex = -1; // the board is driven by the global keyboard cursor, not 144 tab stops
  node.dataset.id = id;
  const body = document.createElement("span");
  body.className = "tile-body";
  const face = document.createElement("span");
  face.className = "face";
  face.textContent = ANIMALS[kind].emoji;
  body.append(face);
  node.append(body);
  return node;
}

const isAt = (cell, r, c) => cell && cell.r === r && cell.c === c;

function render() {
  const board = game.board;
  const present = new Set();
  for (const { r, c, id, kind } of board.tiles()) {
    present.add(id);
    let node = tileNodes.get(id);
    if (!node) {
      node = createTile(id, kind);
      tileNodes.set(id, node);
      ui.board.append(node);
    }
    node.style.width = `${size}px`;
    node.style.height = `${size}px`;
    node.style.transform = `translate(${c * size}px, ${r * size}px)`;
    node.dataset.r = r;
    node.dataset.c = c;
    const selected = isAt(game.selected, r, c);
    node.classList.toggle("selected", selected);
    node.classList.toggle("hint", Boolean(hintPair && (isAt(hintPair.a, r, c) || isAt(hintPair.b, r, c))));
    node.setAttribute("aria-pressed", String(selected));
    node.setAttribute("aria-label", `${ANIMALS[kind].name}, hàng ${r}, cột ${c}`);
  }
  for (const [id, node] of tileNodes) {
    if (!present.has(id) && !node.classList.contains("removing")) {
      node.remove();
      tileNodes.delete(id);
    }
  }
  renderCursor();
}

function renderCursor() {
  cursorGhost.hidden = !cursor || game.state !== "playing";
  if (cursorGhost.hidden) return;
  cursorGhost.style.width = `${size}px`;
  cursorGhost.style.height = `${size}px`;
  cursorGhost.style.transform = `translate(${cursor.c * size}px, ${cursor.r * size}px)`;
}

/** Puts this level's picture behind the tiles; it shows through as pairs are removed. */
function showScene() {
  ui.board.classList.remove("revealed");
  if (sceneLevel === game.level) return;
  sceneLevel = game.level;
  const scene = sceneFor(game.level);
  ui.sceneArt.innerHTML = scene.svg;
  ui.sceneCaption.textContent = `🖼️ ${scene.name}`;
}

function syncMusic() {
  if (game.state === "playing" && isMusicOn() && !isMuted()) playMusic(game.level - 1);
  else stopMusic();
}

function clearBoard() {
  for (const node of tileNodes.values()) node.remove();
  tileNodes.clear();
  ui.pathLayer.replaceChildren();
  hintPair = null;
}

function drawPath(points) {
  const coords = points.map((p) => `${p.c * size + size / 2},${p.r * size + size / 2}`).join(" ");
  const under = Math.max(6, size * 0.18);
  const over = Math.max(3, size * 0.09);
  ui.pathLayer.innerHTML =
    `<polyline class="under" points="${coords}" stroke-width="${under}"/>` +
    `<polyline class="over" points="${coords}" stroke-width="${over}"/>`;
  clearTimeout(pathTimer);
  pathTimer = setTimeout(() => ui.pathLayer.replaceChildren(), 450);
}

function formatTime(seconds) {
  const whole = Math.ceil(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function updateTimer() {
  if (!game.board) return;
  const fraction = game.timeLeft / game.config.timeLimit;
  ui.timerFill.style.transform = `scaleX(${fraction})`;
  const second = Math.ceil(game.timeLeft);
  if (second !== shownSecond) {
    shownSecond = second;
    ui.timerText.textContent = formatTime(game.timeLeft);
    ui.timer.classList.toggle("low", game.timeLeft <= LOW_TIME);
  }
}

function updateHud() {
  ui.level.textContent = game.level;
  ui.score.textContent = game.score.toLocaleString("vi-VN");
  ui.best.textContent = Math.max(best, game.score).toLocaleString("vi-VN");
  ui.hintCount.textContent = game.hintsLeft;
  ui.shuffleCount.textContent = game.shufflesLeft;
  ui.hintButton.disabled = game.hintsLeft === 0;
  ui.shuffleButton.disabled = game.shufflesLeft === 0;
  ui.gravity.textContent = GRAVITY_LABELS[game.config.gravity];
  ui.soundButton.textContent = isMuted() ? "🔇" : "🔊";
  ui.musicButton.classList.toggle("off", !isMusicOn());
  ui.musicButton.setAttribute("aria-pressed", String(isMusicOn()));
  ui.pauseButton.textContent = game.state === "paused" ? "▶" : "⏸";
  ui.board.classList.toggle("paused", game.state === "paused");
  syncMusic();
}

function toast(message) {
  ui.toast.textContent = message;
  ui.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    ui.toast.hidden = true;
  }, 2200);
}

function showCombo(text) {
  ui.combo.textContent = text;
  ui.combo.classList.remove("show");
  void ui.combo.offsetWidth; // restart the CSS animation
  ui.combo.classList.add("show");
}

function shake(cell) {
  const node = tileNodes.get(game.board.tileAt(cell.r, cell.c));
  if (!node) return;
  node.classList.remove("wrong");
  void node.offsetWidth;
  node.classList.add("wrong");
}

// Actions ----------------------------------------------------------------------------------

function select(r, c) {
  if (performance.now() < busyUntil) return;
  sfx.unlock();
  const event = game.select(r, c);
  if (!event) return;
  if (event.type === "match") {
    onMatch(event);
    return;
  }
  if (event.type === "select") sfx.select();
  if (event.type === "mismatch" || event.type === "no-path") {
    sfx.wrong();
    shake(event.from);
    if (event.type === "no-path") toast("Không nối được — đường đi cần tối đa 2 lần rẽ");
  }
  render();
}

function onMatch(event) {
  hintPair = null;
  drawPath(event.path);
  for (const id of event.ids) {
    const node = tileNodes.get(id);
    if (!node) continue;
    node.classList.remove("selected", "hint");
    node.classList.add("removing");
    setTimeout(() => {
      node.remove();
      tileNodes.delete(id);
    }, REMOVE_MS);
  }
  sfx.match(event.combo);
  if (event.combo > 1) showCombo(`Combo ×${event.combo}  +${event.points}`);

  // Let the line show between the original positions before tiles slide or reshuffle.
  const settle = event.gravityMoved || event.shuffled ? SETTLE_MS : 0;
  busyUntil = performance.now() + settle;
  setTimeout(() => {
    render();
    if (event.shuffled) {
      sfx.shuffle();
      toast("Hết nước đi — tự động đảo bàn");
    }
  }, settle);
  updateHud();

  if (event.levelClear) {
    rememberBest();
    setTimeout(() => {
      sfx.clear();
      ui.board.classList.add("revealed");
    }, REMOVE_MS + 50);
    setTimeout(() => showLevelClear(event.levelClear), REMOVE_MS + REVEAL_MS);
  }
}

function useHint() {
  if (game.state !== "playing" || performance.now() < busyUntil) return;
  if (game.hintsLeft === 0) {
    toast("Đã hết lượt gợi ý màn này");
    return;
  }
  hintPair = game.hint();
  sfx.hint();
  render();
  updateHud();
}

function useShuffle() {
  if (game.state !== "playing" || performance.now() < busyUntil) return;
  if (!game.shuffle()) {
    toast("Đã hết lượt đảo màn này");
    return;
  }
  hintPair = null;
  sfx.shuffle();
  render();
  updateHud();
}

function togglePause() {
  if (game.state === "playing") {
    game.pause();
    updateHud();
    showPause();
  } else if (game.state === "paused" && ui.overlay.classList.contains("open")) {
    resume();
  }
}

function resume() {
  closePanel();
  game.resume();
  updateHud();
  renderCursor();
}

function toggleSound() {
  setMuted(!isMuted());
  save("muted", isMuted());
  updateHud();
}

function toggleMusic() {
  sfx.unlock();
  setMusic(!isMusicOn());
  save("music", isMusicOn());
  toast(isMusicOn() ? "🎵 Bật nhạc nền" : "Tắt nhạc nền");
  updateHud();
}

function rememberBest() {
  if (game.score > best) {
    best = game.score;
    save("best", best);
  }
}

function startGame() {
  closePanel();
  clearBoard();
  game.orientation = preferredOrientation();
  game.newGame();
  track("pikachu/start");
  cursor = null;
  showScene();
  layout();
  updateHud();
}

function nextLevel() {
  closePanel();
  clearBoard();
  game.orientation = preferredOrientation();
  const hintsBefore = game.config.hints;
  game.nextLevel();
  cursor = null;
  showScene();
  layout();
  updateHud();
  if (game.config.hints > hintsBefore) toast(`💡 Màn khó hơn — bạn có ${game.config.hints} lượt gợi ý`);
}

function onGameOver(event) {
  track("pikachu/time-up");
  const record = event.score > best;
  rememberBest();
  sfx.over();
  updateHud();
  render();
  openPanel(`
    <div class="hero" aria-hidden="true">⏰</div>
    <h2 id="overlay-title">Hết giờ!</h2>
    <p>Bạn dừng ở màn ${event.level}</p>
    <div class="big">${event.score.toLocaleString("vi-VN")}</div>
    <p class="${record ? "record" : ""}">${record ? "🏆 Kỷ lục mới!" : `Kỷ lục: ${best.toLocaleString("vi-VN")}`}</p>
    <div class="buttons"><button class="button" data-action="restart">Chơi lại</button></div>`);
}

// Overlays ---------------------------------------------------------------------------------

function openPanel(html) {
  ui.panel.innerHTML = html;
  ui.overlay.classList.add("open");
  ui.panel.querySelector("button")?.focus();
}

function closePanel() {
  ui.overlay.classList.remove("open");
}

function showStart() {
  openPanel(`
    <div class="hero" aria-hidden="true">🐶🐱🦊🐼</div>
    <h2 id="overlay-title">Nối Thú</h2>
    <p>Tìm và nối hai con thú giống nhau trước khi hết giờ.</p>
    <ul>
      <li>Đường nối chỉ đi <strong>ngang/dọc</strong>, qua ô trống, <strong>tối đa 2 lần rẽ</strong> — được đi vòng ra ngoài viền.</li>
      <li>Mỗi màn có một <strong>kiểu rơi</strong> khác: thú trượt theo hướng sau mỗi lần nối.</li>
      <li>Nối nhanh liên tiếp để được <strong>combo</strong>; thời gian còn lại thành điểm thưởng.</li>
      <li>Phím: <kbd>←↑↓→</kbd> di chuyển, <kbd>Enter</kbd> chọn, <kbd>H</kbd> gợi ý, <kbd>S</kbd> đảo, <kbd>P</kbd> dừng, <kbd>M</kbd> âm thanh, <kbd>N</kbd> nhạc nền.</li>
      <li>Mỗi màn giấu một <strong>bức tranh</strong> phía sau — xóa hết thú để ngắm trọn vẹn.</li>
    </ul>
    ${best ? `<p>Kỷ lục của bạn: <strong>${best.toLocaleString("vi-VN")}</strong></p>` : ""}
    <div class="buttons"><button class="button" data-action="play">Chơi ngay</button></div>`);
}

function showPause() {
  openPanel(`
    <h2 id="overlay-title">Tạm dừng</h2>
    <p>Màn ${game.level} · ${game.score.toLocaleString("vi-VN")} điểm · còn ${formatTime(game.timeLeft)}</p>
    <div class="buttons">
      <button class="button" data-action="resume">Tiếp tục</button>
      <button class="button secondary" data-action="restart">Chơi lại từ đầu</button>
    </div>`);
}

function showLevelClear({ bonus, level }) {
  track("pikachu/level-clear");
  const upcoming = game.configFor(level + 1, preferredOrientation()).gravity;
  openPanel(`
    <div class="scene-thumb" aria-hidden="true">${sceneFor(level).svg}</div>
    <h2 id="overlay-title">🎉 Hoàn thành màn ${level}!</h2>
    <p class="scene-name">Bức tranh: <strong>${sceneFor(level).name}</strong></p>
    <p>Thưởng thời gian: <strong>+${bonus.toLocaleString("vi-VN")}</strong></p>
    <div class="big">${game.score.toLocaleString("vi-VN")}</div>
    <p>Màn tiếp theo: <strong>${GRAVITY_LABELS[upcoming]}</strong></p>
    <div class="buttons"><button class="button" data-action="next">Màn tiếp theo</button></div>`);
}

ui.panel.addEventListener("click", (event) => {
  const action = event.target.closest("button[data-action]")?.dataset.action;
  sfx.unlock();
  if (action === "play") resume();
  else if (action === "resume") resume();
  else if (action === "restart") startGame();
  else if (action === "next") nextLevel();
});

// Input ------------------------------------------------------------------------------------

ui.board.addEventListener("click", (event) => {
  const node = event.target.closest(".tile");
  if (!node || node.classList.contains("removing")) return;
  cursor = null;
  select(Number(node.dataset.r), Number(node.dataset.c));
});

ui.hintButton.addEventListener("click", useHint);
ui.shuffleButton.addEventListener("click", useShuffle);
ui.pauseButton.addEventListener("click", togglePause);
ui.soundButton.addEventListener("click", toggleSound);
ui.musicButton.addEventListener("click", toggleMusic);

const ARROWS = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

document.addEventListener("keydown", (event) => {
  const key = event.key;
  if (ui.overlay.classList.contains("open")) {
    if ((key === "Escape" || key === "p" || key === "P") && game.state === "paused") resume();
    return;
  }
  if (key === "p" || key === "P" || key === "Escape") return togglePause();
  if (key === "m" || key === "M") return toggleSound();
  if (key === "n" || key === "N") return toggleMusic();
  if (game.state !== "playing") return;
  if (key === "h" || key === "H") return useHint();
  if (key === "s" || key === "S") return useShuffle();

  if (ARROWS[key]) {
    event.preventDefault();
    const board = game.board;
    if (!cursor) cursor = game.selected ? { ...game.selected } : { r: 1, c: 1 };
    else {
      const [dr, dc] = ARROWS[key];
      cursor = {
        r: Math.min(board.rows, Math.max(1, cursor.r + dr)),
        c: Math.min(board.cols, Math.max(1, cursor.c + dc)),
      };
    }
    renderCursor();
  } else if ((key === "Enter" || key === " ") && cursor) {
    event.preventDefault();
    select(cursor.r, cursor.c);
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && game.state === "playing") togglePause();
});

let resizeTimer = 0;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(layout, 120);
});

// Main loop --------------------------------------------------------------------------------

let lastFrame = performance.now();
function frame(now) {
  const seconds = Math.min(0.25, (now - lastFrame) / 1000);
  lastFrame = now;
  if (game.state === "playing") {
    const event = game.tick(seconds);
    if (event) onGameOver(event);
  }
  updateTimer();
  requestAnimationFrame(frame);
}

// A paused first level sits blurred behind the start screen.
game.orientation = preferredOrientation();
game.newGame();
game.pause();
showScene();
layout();
updateHud();
showStart();
requestAnimationFrame(frame);
