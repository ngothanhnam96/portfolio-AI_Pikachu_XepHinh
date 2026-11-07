/** Move search (hints, deadlock detection) and shuffling. */

import { EMPTY } from "./board.js";
import { findPath } from "./path.js";
import { shuffleInPlace } from "./rng.js";

/** Any connectable pair as `{ a, b, path }`, or null when the board is dead-locked. */
export function findAnyPair(board) {
  const byKind = new Map();
  for (const tile of board.tiles()) {
    if (!byKind.has(tile.kind)) byKind.set(tile.kind, []);
    byKind.get(tile.kind).push({ r: tile.r, c: tile.c });
  }
  for (const cells of byKind.values()) {
    for (let i = 0; i < cells.length; i += 1) {
      for (let j = i + 1; j < cells.length; j += 1) {
        const path = findPath(board, cells[i], cells[j]);
        if (path) return { a: cells[i], b: cells[j], path };
      }
    }
  }
  return null;
}

/**
 * Permutes the tiles over the occupied cells until at least one pair connects.
 * Returns false only if every attempt stayed dead-locked (practically never).
 */
export function shuffleBoard(board, rng, attempts = 200) {
  const slots = [];
  board.cells.forEach((id, index) => {
    if (id !== EMPTY) slots.push(index);
  });
  const ids = slots.map((index) => board.cells[index]);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    shuffleInPlace(ids, rng);
    slots.forEach((index, k) => {
      board.cells[index] = ids[k];
    });
    if (findAnyPair(board)) return true;
  }
  return false;
}

/** Shuffles only when tiles remain and no move exists. Returns true if it shuffled. */
export function ensureMove(board, rng) {
  if (board.remaining === 0 || findAnyPair(board)) return false;
  shuffleBoard(board, rng);
  return true;
}
