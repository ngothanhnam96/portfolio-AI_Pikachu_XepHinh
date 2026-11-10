import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Board } from "../src/core/board.js";
import {
  COMBO_BONUS,
  COMBO_WINDOW,
  Game,
  HINTS_PER_LEVEL,
  hintsForLevel,
  MAX_HINTS,
  MORE_HINTS_FROM_LEVEL,
  levelConfig,
  POINTS_PER_PAIR,
  SHUFFLES_PER_LEVEL,
  TIME_BONUS_PER_SECOND,
} from "../src/core/game.js";
import { GRAVITY_MODES } from "../src/core/gravity.js";
import { findAnyPair } from "../src/core/moves.js";

/** A game on a hand-drawn board (config still drives time and gravity). */
function gameWith(rows, gravity = "none", timeLimit = 100) {
  const game = new Game({
    seed: 1,
    config: (level) => ({ level, rows: 2, cols: 2, kindCount: 2, timeLimit, gravity }),
  });
  game.newGame();
  game.board = Board.fromRows(rows);
  return game;
}

/** Play a whole level by always taking the first available pair. */
function solve(game, maxMoves = 500) {
  for (let moves = 0; moves < maxMoves && game.state === "playing"; moves += 1) {
    const pair = findAnyPair(game.board);
    assert.ok(pair, "game must never be left without a move");
    game.select(pair.a.r, pair.a.c);
    const event = game.select(pair.b.r, pair.b.c);
    assert.equal(event.type, "match");
    game.tick(1);
  }
}

describe("levelConfig", () => {
  it("gets harder and cycles gravity modes", () => {
    const first = levelConfig(1);
    const fifth = levelConfig(5);
    assert.deepEqual([first.rows, first.cols], [9, 16]);
    assert.equal(first.gravity, "none");
    assert.ok(fifth.kindCount > first.kindCount);
    assert.ok(fifth.timeLimit < first.timeLimit);
    assert.equal(levelConfig(1 + GRAVITY_MODES.length).gravity, "none");
    assert.equal(levelConfig(50).timeLimit, 180);
    assert.equal(levelConfig(50).kindCount, 36);
  });

  it("gives more hints from level 4 (← Dồn trái) on, growing slowly up to a cap", () => {
    assert.equal(levelConfig(MORE_HINTS_FROM_LEVEL).gravity, "left");
    assert.deepEqual([1, 2, 3].map(hintsForLevel), [3, 3, 3]);
    assert.deepEqual([4, 5, 6, 7, 10, 13].map(hintsForLevel), [5, 5, 5, 6, 7, 8]);
    assert.equal(hintsForLevel(50), MAX_HINTS);
    for (let level = 1; level < 30; level += 1) {
      assert.ok(hintsForLevel(level + 1) >= hintsForLevel(level), `never fewer hints at level ${level + 1}`);
    }
  });

  it("a level starts with its own number of hints", () => {
    const game = new Game({ seed: 5 });
    game.newGame();
    assert.equal(game.hintsLeft, HINTS_PER_LEVEL);
    game.startLevel(4);
    assert.equal(game.hintsLeft, 5);
    for (let i = 0; i < 5; i += 1) assert.ok(game.hint());
    assert.equal(game.hint(), null);
  });

  it("swaps dimensions in portrait", () => {
    const config = levelConfig(1, "portrait");
    assert.deepEqual([config.rows, config.cols], [16, 9]);
  });
});

describe("Game selection", () => {
  it("selects, deselects and moves the selection on mismatch", () => {
    const game = gameWith(["ab", "ba"]);
    assert.equal(game.select(1, 1).type, "select");
    assert.equal(game.select(1, 1).type, "deselect");
    game.select(1, 1);
    assert.equal(game.select(1, 2).type, "mismatch");
    assert.deepEqual(game.selected, { r: 1, c: 2 });
  });

  it("ignores empty cells and the outer ring", () => {
    const game = gameWith(["a.", ".a"]);
    assert.equal(game.select(1, 2), null);
    assert.equal(game.select(0, 0), null);
  });

  it("reports no-path for same kinds that cannot connect", () => {
    const game = gameWith(["abcd", "cdab"]);
    game.select(1, 1);
    assert.equal(game.select(2, 3).type, "no-path");
  });

  it("matches, scores and removes both tiles", () => {
    const game = gameWith(["aa", "bb"]);
    game.select(1, 1);
    const event = game.select(1, 2);
    assert.equal(event.type, "match");
    assert.equal(event.points, POINTS_PER_PAIR);
    assert.equal(game.score, POINTS_PER_PAIR);
    assert.equal(game.board.remaining, 2);
    assert.equal(event.ids.length, 2);
  });
});

describe("Game scoring", () => {
  it("builds a combo for quick matches and resets after the window", () => {
    const game = gameWith(["aabb", "ccdd"]);
    game.select(1, 1);
    game.select(1, 2);
    game.tick(1);
    game.select(1, 3);
    assert.equal(game.select(1, 4).combo, 2);
    game.tick(COMBO_WINDOW + 1);
    game.select(2, 1);
    const event = game.select(2, 2);
    assert.equal(event.combo, 1);
    assert.equal(game.score >= POINTS_PER_PAIR * 3 + COMBO_BONUS, true);
  });

  it("awards a time bonus when the level is cleared", () => {
    const game = gameWith(["aa"], "none", 50);
    game.tick(10);
    game.select(1, 1);
    const event = game.select(1, 2);
    assert.deepEqual(event.levelClear, { bonus: 40 * TIME_BONUS_PER_SECOND, level: 1 });
    assert.equal(game.state, "level-clear");
    assert.equal(game.score, POINTS_PER_PAIR + 40 * TIME_BONUS_PER_SECOND);
  });

  it("keeps the score into the next level and resets on a new game", () => {
    const game = new Game({ seed: 3 });
    game.newGame();
    game.score = 500;
    game.nextLevel();
    assert.equal(game.level, 2);
    assert.equal(game.score, 500);
    game.newGame();
    assert.equal(game.score, 0);
  });
});

describe("Game helpers and clock", () => {
  it("limits hints and shuffles per level", () => {
    const game = new Game({ seed: 5 });
    game.newGame();
    for (let i = 0; i < HINTS_PER_LEVEL; i += 1) assert.ok(game.hint());
    assert.equal(game.hint(), null);
    for (let i = 0; i < SHUFFLES_PER_LEVEL; i += 1) assert.equal(game.shuffle(), true);
    assert.equal(game.shuffle(), false);
    game.nextLevel();
    assert.equal(game.hintsLeft, HINTS_PER_LEVEL);
  });

  it("ends the game when time runs out", () => {
    const game = gameWith(["aa"], "none", 5);
    assert.equal(game.tick(4.5), null);
    assert.deepEqual(game.tick(1), { type: "game-over", score: 0, level: 1 });
    assert.equal(game.select(1, 1), null);
  });

  it("freezes the clock and input while paused", () => {
    const game = gameWith(["aa"], "none", 5);
    game.pause();
    game.tick(10);
    assert.equal(game.timeLeft, 5);
    assert.equal(game.select(1, 1), null);
    game.resume();
    assert.equal(game.select(1, 1).type, "select");
  });

  it("applies gravity after a match", () => {
    const game = gameWith(["a.", "bb", "ca"], "down");
    game.select(2, 1);
    const event = game.select(2, 2);
    assert.equal(event.gravityMoved, true);
    assert.deepEqual(game.board.toRows(), ["..", "a.", "ca"]);
  });

  it("auto-shuffles when a match leaves a deadlock", () => {
    // Removing the e's leaves the dead-locked abcd/cdab layout.
    const game = gameWith(["abcdee", "cdab.."]);
    game.select(1, 5);
    const event = game.select(1, 6);
    assert.equal(event.shuffled, true);
    assert.ok(findAnyPair(game.board));
  });
});

describe("Full levels are always finishable", () => {
  for (const mode of GRAVITY_MODES) {
    it(`gravity ${mode}`, () => {
      for (let seed = 1; seed <= 4; seed += 1) {
        const level = GRAVITY_MODES.indexOf(mode) + 1;
        const game = new Game({ seed: seed * 101 + level });
        game.newGame();
        if (level > 1) game.startLevel(level);
        assert.equal(game.config.gravity, mode);
        solve(game);
        assert.equal(game.state, "level-clear", `seed ${seed}`);
        assert.equal(game.board.remaining, 0);
      }
    });
  }

  it("portrait boards too", () => {
    const game = new Game({ seed: 77, orientation: "portrait" });
    game.startLevel(2);
    solve(game);
    assert.equal(game.state, "level-clear");
  });
});
