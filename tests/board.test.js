import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Board, createBoard, EMPTY } from "../src/core/board.js";
import { mulberry32, shuffleInPlace } from "../src/core/rng.js";

describe("rng", () => {
  it("is deterministic per seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const c = mulberry32(43);
    const first = [a(), a(), a()];
    assert.deepEqual(first, [b(), b(), b()]);
    assert.notDeepEqual(first, [c(), c(), c()]);
    assert.ok(first.every((x) => x >= 0 && x < 1));
  });

  it("shuffle keeps every item", () => {
    const items = shuffleInPlace([1, 2, 3, 4, 5, 6], mulberry32(1));
    assert.deepEqual([...items].sort(), [1, 2, 3, 4, 5, 6]);
  });
});

describe("Board", () => {
  it("pads the grid with an empty ring", () => {
    const board = Board.fromRows(["ab", "ba"]);
    assert.equal(board.height, 4);
    assert.equal(board.width, 4);
    for (let c = 0; c < 4; c += 1) {
      assert.equal(board.tileAt(0, c), EMPTY);
      assert.equal(board.tileAt(3, c), EMPTY);
    }
    assert.equal(board.kindAt(1, 1), board.kindAt(2, 2));
    assert.equal(board.tileAt(-1, 0), EMPTY);
  });

  it("round-trips through fromRows / toRows", () => {
    const rows = ["ab.c", "..ca", "b..."];
    assert.deepEqual(Board.fromRows(rows).toRows(), rows);
  });

  it("removes tiles and counts what remains", () => {
    const board = Board.fromRows(["aa", "bb"]);
    board.remove(1, 1);
    assert.equal(board.remaining, 3);
    assert.ok(board.isEmpty(1, 1));
  });

  it("clone is independent", () => {
    const board = Board.fromRows(["aa"]);
    const copy = board.clone();
    copy.remove(1, 1);
    assert.equal(board.remaining, 2);
  });
});

describe("createBoard", () => {
  it("fills every cell with an even count of each kind", () => {
    const board = createBoard({ rows: 9, cols: 16, kindCount: 24, rng: mulberry32(7) });
    assert.equal(board.remaining, 144);
    const counts = new Map();
    for (const tile of board.tiles()) counts.set(tile.kind, (counts.get(tile.kind) ?? 0) + 1);
    assert.equal(counts.size, 24);
    for (const count of counts.values()) assert.equal(count % 2, 0);
  });

  it("gives every tile a unique id", () => {
    const board = createBoard({ rows: 4, cols: 4, kindCount: 3, rng: mulberry32(1) });
    const ids = board.tiles().map((tile) => tile.id);
    assert.equal(new Set(ids).size, 16);
  });

  it("rejects odd-sized boards", () => {
    assert.throws(() => createBoard({ rows: 3, cols: 3, kindCount: 2, rng: mulberry32(1) }));
  });
});
