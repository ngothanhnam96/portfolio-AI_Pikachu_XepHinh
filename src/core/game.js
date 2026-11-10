/**
 * Game state machine. Pure logic: the UI calls methods and renders the returned events.
 *
 * States: idle → playing ⇄ paused → level-clear → playing … → game-over
 */

import { createBoard } from "./board.js";
import { applyGravity, GRAVITY_MODES } from "./gravity.js";
import { ensureMove, findAnyPair, shuffleBoard } from "./moves.js";
import { findPath } from "./path.js";
import { mulberry32, randomSeed } from "./rng.js";
import { ANIMALS } from "./tiles.js";

export const POINTS_PER_PAIR = 10;
export const COMBO_BONUS = 5;
export const COMBO_WINDOW = 4; // seconds between matches to keep a combo going
export const TIME_BONUS_PER_SECOND = 2;
export const HINTS_PER_LEVEL = 3;
export const SHUFFLES_PER_LEVEL = 3;
export const MORE_HINTS_FROM_LEVEL = 4; // from "← Dồn trái" on, sliding boards get much harder to read
export const MAX_HINTS = 8;

/** Hints for a level: 3 early on, 5 from level 4, then +1 every 3 levels (max 8). */
export function hintsForLevel(level) {
  if (level < MORE_HINTS_FROM_LEVEL) return HINTS_PER_LEVEL;
  return Math.min(MAX_HINTS, 5 + Math.floor((level - MORE_HINTS_FROM_LEVEL) / 3));
}

export function levelConfig(level, orientation = "landscape") {
  const portrait = orientation === "portrait";
  return {
    level,
    rows: portrait ? 16 : 9,
    cols: portrait ? 9 : 16,
    kindCount: Math.min(ANIMALS.length, 24 + 3 * (level - 1)),
    timeLimit: Math.max(180, 420 - 25 * (level - 1)),
    gravity: GRAVITY_MODES[(level - 1) % GRAVITY_MODES.length],
    hints: hintsForLevel(level),
  };
}

export class Game {
  constructor({ seed = randomSeed(), orientation = "landscape", config = levelConfig } = {}) {
    this.seed = seed;
    this.rng = mulberry32(seed);
    this.orientation = orientation;
    this.configFor = config;
    this.state = "idle";
    this.score = 0;
    this.level = 0;
    this.board = null;
  }

  newGame() {
    this.score = 0;
    return this.startLevel(1);
  }

  nextLevel() {
    return this.startLevel(this.level + 1);
  }

  startLevel(level) {
    this.level = level;
    this.config = this.configFor(level, this.orientation);
    this.board = createBoard({ ...this.config, rng: this.rng });
    ensureMove(this.board, this.rng);
    this.timeLeft = this.config.timeLimit;
    this.hintsLeft = this.config.hints ?? HINTS_PER_LEVEL;
    this.shufflesLeft = SHUFFLES_PER_LEVEL;
    this.selected = null;
    this.combo = 0;
    this.elapsed = 0;
    this.lastMatchAt = -Infinity;
    this.state = "playing";
    return { type: "level-start", level, config: this.config };
  }

  /** Click/tap on a board cell. Returns an event describing what happened, or null. */
  select(r, c) {
    if (this.state !== "playing") return null;
    const board = this.board;
    if (!board.isInner(r, c) || board.isEmpty(r, c)) return null;
    const cell = { r, c };

    if (!this.selected) {
      this.selected = cell;
      return { type: "select", cell };
    }
    const from = this.selected;
    if (from.r === r && from.c === c) {
      this.selected = null;
      return { type: "deselect", cell };
    }
    if (board.kindAt(from.r, from.c) !== board.kindAt(r, c)) {
      this.selected = cell;
      return { type: "mismatch", from, cell };
    }
    const path = findPath(board, from, cell);
    if (!path) {
      this.selected = cell;
      return { type: "no-path", from, cell };
    }
    return this.#match(from, cell, path);
  }

  #match(a, b, path) {
    const board = this.board;
    const ids = [board.tileAt(a.r, a.c), board.tileAt(b.r, b.c)];
    const kind = board.kindAt(a.r, a.c);
    board.remove(a.r, a.c);
    board.remove(b.r, b.c);
    this.selected = null;

    this.combo = this.elapsed - this.lastMatchAt <= COMBO_WINDOW ? this.combo + 1 : 1;
    this.lastMatchAt = this.elapsed;
    const points = POINTS_PER_PAIR + COMBO_BONUS * (this.combo - 1);
    this.score += points;

    const event = {
      type: "match",
      a,
      b,
      ids,
      kind,
      path,
      points,
      combo: this.combo,
      gravityMoved: applyGravity(board, this.config.gravity),
      shuffled: false,
      levelClear: null,
    };

    if (board.remaining === 0) {
      const bonus = Math.ceil(this.timeLeft) * TIME_BONUS_PER_SECOND;
      this.score += bonus;
      this.state = "level-clear";
      event.levelClear = { bonus, level: this.level };
    } else {
      event.shuffled = ensureMove(board, this.rng);
    }
    return event;
  }

  /** A connectable pair, consuming one hint. Null when no hints are left or not playing. */
  hint() {
    if (this.state !== "playing" || this.hintsLeft <= 0) return null;
    const pair = findAnyPair(this.board);
    if (pair) this.hintsLeft -= 1;
    return pair;
  }

  /** Player-requested shuffle, consuming one. */
  shuffle() {
    if (this.state !== "playing" || this.shufflesLeft <= 0) return false;
    this.shufflesLeft -= 1;
    this.selected = null;
    shuffleBoard(this.board, this.rng);
    return true;
  }

  /** Advance the clock. Returns a game-over event when time runs out. */
  tick(seconds) {
    if (this.state !== "playing") return null;
    this.elapsed += seconds;
    this.timeLeft = Math.max(0, this.timeLeft - seconds);
    if (this.timeLeft === 0) {
      this.state = "game-over";
      this.selected = null;
      return { type: "game-over", score: this.score, level: this.level };
    }
    return null;
  }

  pause() {
    if (this.state === "playing") this.state = "paused";
  }

  resume() {
    if (this.state === "paused") this.state = "playing";
  }
}
