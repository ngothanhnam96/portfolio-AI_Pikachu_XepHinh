import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Board } from "../src/core/board.js";
import { applyGravity, GRAVITY_MODES } from "../src/core/gravity.js";

const PICTURE = [
  "a..b", //
  ".c..",
  "d..e",
  "....",
];

function after(mode, picture = PICTURE) {
  const board = Board.fromRows(picture);
  applyGravity(board, mode);
  return board.toRows();
}

describe("applyGravity", () => {
  it("none leaves tiles in place", () => {
    assert.deepEqual(after("none"), PICTURE);
  });

  it("down / up compact columns", () => {
    assert.deepEqual(after("down"), ["....", "....", "a..b", "dc.e"]);
    assert.deepEqual(after("up"), ["ac.b", "d..e", "....", "...."]);
  });

  it("left / right compact rows", () => {
    assert.deepEqual(after("left"), ["ab..", "c...", "de..", "...."]);
    assert.deepEqual(after("right"), ["..ab", "...c", "..de", "...."]);
  });

  it("center-x pulls both halves toward the middle", () => {
    assert.deepEqual(after("center-x", ["a..b", "a.b."]), [".ab.", ".ab."]);
  });

  it("outward-x pushes both halves to the edges", () => {
    assert.deepEqual(after("outward-x", [".ab.", "..ba"]), ["a..b", "..ba"]);
  });

  it("center-y and outward-y work on columns", () => {
    const picture = ["a.", "..", "..", "b."];
    assert.deepEqual(after("center-y", picture), ["..", "a.", "b.", ".."]);
    assert.deepEqual(after("outward-y", ["..", "a.", "b.", ".."]), ["a.", "..", "..", "b."]);
  });

  it("keeps tile identity while moving", () => {
    const board = Board.fromRows(["a.", ".."]);
    const id = board.tileAt(1, 1);
    applyGravity(board, "down");
    assert.equal(board.tileAt(2, 1), id);
  });

  it("reports whether anything moved", () => {
    assert.equal(applyGravity(Board.fromRows(["..", "ab"]), "down"), false);
    assert.equal(applyGravity(Board.fromRows(["a.", ".."]), "down"), true);
  });

  it("never changes the number of tiles in any mode", () => {
    for (const mode of GRAVITY_MODES) {
      const board = Board.fromRows(["a.b.c", ".d.e.", "f...g"]);
      applyGravity(board, mode);
      assert.equal(board.remaining, 7, mode);
    }
  });

  it("rejects unknown modes", () => {
    assert.throws(() => applyGravity(Board.fromRows(["a"]), "sideways"));
  });
});
