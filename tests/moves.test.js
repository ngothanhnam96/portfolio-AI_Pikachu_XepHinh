import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Board } from "../src/core/board.js";
import { ensureMove, findAnyPair, shuffleBoard } from "../src/core/moves.js";
import { findPath } from "../src/core/path.js";
import { mulberry32 } from "../src/core/rng.js";

// Dead-locked: every pair needs three turns or is blocked by another tile.
const DEADLOCK = [
  "abcd", //
  "cdab",
];

describe("findAnyPair", () => {
  it("returns a pair that really connects", () => {
    const board = Board.fromRows(["ab", "ba", "cc"]);
    const pair = findAnyPair(board);
    assert.ok(pair);
    assert.equal(board.kindAt(pair.a.r, pair.a.c), board.kindAt(pair.b.r, pair.b.c));
    assert.deepEqual(findPath(board, pair.a, pair.b), pair.path);
  });

  it("returns null on a dead-locked board", () => {
    assert.equal(findAnyPair(Board.fromRows(DEADLOCK)), null);
  });

  it("returns null when fewer than two tiles of a kind remain", () => {
    assert.equal(findAnyPair(Board.fromRows(["a.b"])), null);
  });
});

describe("shuffleBoard", () => {
  it("keeps the same tiles on the same occupied cells", () => {
    const board = Board.fromRows(["ab.c", "c.ba"]);
    const ids = board.tiles().map((t) => t.id).sort();
    const occupied = board.tiles().map((t) => `${t.r},${t.c}`);
    assert.ok(shuffleBoard(board, mulberry32(3)));
    assert.deepEqual(board.tiles().map((t) => t.id).sort(), ids);
    assert.deepEqual(board.tiles().map((t) => `${t.r},${t.c}`), occupied);
  });

  it("always breaks a deadlock", () => {
    for (let seed = 1; seed <= 25; seed += 1) {
      const board = Board.fromRows(DEADLOCK);
      assert.ok(shuffleBoard(board, mulberry32(seed)), `seed ${seed}`);
      assert.ok(findAnyPair(board), `seed ${seed}`);
    }
  });
});

describe("ensureMove", () => {
  it("does nothing when a move exists or the board is empty", () => {
    assert.equal(ensureMove(Board.fromRows(["aa"]), mulberry32(1)), false);
    assert.equal(ensureMove(Board.fromRows([".."]), mulberry32(1)), false);
  });

  it("shuffles a dead-locked board into a playable one", () => {
    const board = Board.fromRows(DEADLOCK);
    assert.equal(ensureMove(board, mulberry32(9)), true);
    assert.ok(findAnyPair(board));
  });
});
