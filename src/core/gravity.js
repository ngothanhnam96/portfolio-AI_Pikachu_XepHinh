/**
 * Gravity modes: after each match the remaining tiles slide toward a "sink" side.
 * Each mode is a list of lines; a line is an ordered list of cells starting at its sink.
 */

import { EMPTY } from "./board.js";

export const GRAVITY_MODES = [
  "none",
  "down",
  "up",
  "left",
  "right",
  "center-x",
  "outward-x",
  "center-y",
  "outward-y",
];

const range = (from, to) => {
  const step = from <= to ? 1 : -1;
  const values = [];
  for (let value = from; value !== to + step; value += step) values.push(value);
  return values;
};

function columnLines(board, rowOrders) {
  const lines = [];
  for (let c = 1; c <= board.cols; c += 1) {
    for (const rows of rowOrders) lines.push(rows.map((r) => board.index(r, c)));
  }
  return lines;
}

function rowLines(board, colOrders) {
  const lines = [];
  for (let r = 1; r <= board.rows; r += 1) {
    for (const cols of colOrders) lines.push(cols.map((c) => board.index(r, c)));
  }
  return lines;
}

function linesFor(board, mode) {
  const { rows, cols } = board;
  const midRow = Math.floor(rows / 2);
  const midCol = Math.floor(cols / 2);
  switch (mode) {
    case "none":
      return [];
    case "down":
      return columnLines(board, [range(rows, 1)]);
    case "up":
      return columnLines(board, [range(1, rows)]);
    case "left":
      return rowLines(board, [range(1, cols)]);
    case "right":
      return rowLines(board, [range(cols, 1)]);
    case "center-x":
      return rowLines(board, [range(midCol, 1), range(midCol + 1, cols)]);
    case "outward-x":
      return rowLines(board, [range(1, midCol), range(cols, midCol + 1)]);
    case "center-y":
      return columnLines(board, [range(midRow, 1), range(midRow + 1, rows)]);
    case "outward-y":
      return columnLines(board, [range(1, midRow), range(rows, midRow + 1)]);
    default:
      throw new Error(`unknown gravity mode '${mode}'`);
  }
}

/** Slides tiles in place. Returns true when at least one tile moved. */
export function applyGravity(board, mode) {
  let moved = false;
  for (const line of linesFor(board, mode)) {
    const ids = line.map((index) => board.cells[index]).filter((id) => id !== EMPTY);
    line.forEach((index, k) => {
      const id = k < ids.length ? ids[k] : EMPTY;
      if (board.cells[index] !== id) moved = true;
      board.cells[index] = id;
    });
  }
  return moved;
}
