import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Board } from "../src/core/board.js";
import { canConnect, findPath, simplify } from "../src/core/path.js";

// Coordinates are 1-based inside the board; row/col 0 and N+1 are the empty outer ring.
const at = (r, c) => ({ r, c });

describe("findPath", () => {
  it("connects neighbours with a single segment", () => {
    const board = Board.fromRows(["aa"]);
    assert.deepEqual(findPath(board, at(1, 1), at(1, 2)), [at(1, 1), at(1, 2)]);
  });

  it("connects along a clear straight line", () => {
    const board = Board.fromRows(["a..a"]);
    assert.deepEqual(findPath(board, at(1, 1), at(1, 4)), [at(1, 1), at(1, 4)]);
  });

  it("goes around a blocker through the outer ring", () => {
    const board = Board.fromRows(["abba"]);
    const path = findPath(board, at(1, 1), at(1, 4));
    // Up into the ring, across, back down: 3 segments, 2 turns.
    assert.equal(path.length, 4);
    assert.equal(path[1].r, path[2].r);
    assert.ok(path[1].r === 0 || path[1].r === 2);
  });

  it("uses one turn when an L-shape is free", () => {
    const board = Board.fromRows([
      "a..", //
      "b.a",
    ]);
    assert.deepEqual(findPath(board, at(1, 1), at(2, 3)), [at(1, 1), at(1, 3), at(2, 3)]);
  });

  it("uses two turns through an inner corridor", () => {
    const board = Board.fromRows([
      "a.b", //
      "b.b",
      "c.a",
    ]);
    // Right, down the empty middle column, right again.
    assert.deepEqual(findPath(board, at(1, 1), at(3, 3)), [at(1, 1), at(1, 2), at(3, 2), at(3, 3)]);
  });

  it("rejects paths that need three turns", () => {
    // Every 0-, 1- and 2-turn route between the two a's is blocked.
    const board = Board.fromRows([
      "bbbbb", //
      "ba.cb",
      "bbc.b",
      "bc.ab",
      "bbbbb",
    ]);
    assert.equal(findPath(board, at(2, 2), at(4, 4)), null);
  });

  it("never matches different kinds, empty cells or the same cell", () => {
    const board = Board.fromRows(["ab.a"]);
    assert.equal(findPath(board, at(1, 1), at(1, 2)), null);
    assert.equal(findPath(board, at(1, 1), at(1, 3)), null);
    assert.equal(findPath(board, at(1, 1), at(1, 1)), null);
  });

  it("is symmetric", () => {
    const board = Board.fromRows([
      "a.b.", //
      "bcca",
      "..b.",
    ]);
    assert.equal(canConnect(board, at(1, 1), at(2, 4)), canConnect(board, at(2, 4), at(1, 1)));
    assert.equal(canConnect(board, at(1, 3), at(3, 3)), canConnect(board, at(3, 3), at(1, 3)));
  });

  it("prefers the shortest valid route", () => {
    const board = Board.fromRows([
      "a...", //
      "....",
      "...a",
    ]);
    const path = findPath(board, at(1, 1), at(3, 4));
    assert.equal(path.length, 3); // an L, not a detour through the ring
  });

  it("connects tiles on the same edge through the ring", () => {
    const board = Board.fromRows([
      "abca", //
      "bcab",
    ]);
    const path = findPath(board, at(1, 1), at(1, 4));
    assert.deepEqual(path, [at(1, 1), at(0, 1), at(0, 4), at(1, 4)]);
  });
});

describe("simplify", () => {
  it("removes duplicates and collinear points", () => {
    const points = [at(1, 1), at(1, 1), at(1, 3), at(1, 5), at(4, 5), at(4, 5)];
    assert.deepEqual(simplify(points), [at(1, 1), at(1, 5), at(4, 5)]);
  });
});
