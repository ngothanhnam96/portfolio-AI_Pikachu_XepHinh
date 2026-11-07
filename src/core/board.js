/**
 * The playing grid.
 *
 * The grid is padded with an always-empty ring, so a board of `rows × cols` tiles is stored as
 * `(rows + 2) × (cols + 2)` cells and paths may run around the outside edge. Tiles occupy
 * rows 1..rows and columns 1..cols.
 *
 * Cells hold a stable tile *id*; `kinds[id]` is the animal. Gravity and shuffle move ids, so
 * the UI can keep one element per id and animate it.
 */

import { shuffleInPlace } from "./rng.js";

export const EMPTY = -1;

export class Board {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.height = rows + 2;
    this.width = cols + 2;
    this.cells = new Array(this.height * this.width).fill(EMPTY);
    this.kinds = [];
  }

  index(r, c) {
    return r * this.width + c;
  }

  inBounds(r, c) {
    return r >= 0 && r < this.height && c >= 0 && c < this.width;
  }

  isInner(r, c) {
    return r >= 1 && r <= this.rows && c >= 1 && c <= this.cols;
  }

  tileAt(r, c) {
    return this.inBounds(r, c) ? this.cells[this.index(r, c)] : EMPTY;
  }

  kindAt(r, c) {
    const id = this.tileAt(r, c);
    return id === EMPTY ? EMPTY : this.kinds[id];
  }

  isEmpty(r, c) {
    return this.tileAt(r, c) === EMPTY;
  }

  remove(r, c) {
    this.cells[this.index(r, c)] = EMPTY;
  }

  /** Occupied cells as `{ r, c, id, kind }`, row-major. */
  tiles() {
    const result = [];
    for (let r = 1; r <= this.rows; r += 1) {
      for (let c = 1; c <= this.cols; c += 1) {
        const id = this.cells[this.index(r, c)];
        if (id !== EMPTY) result.push({ r, c, id, kind: this.kinds[id] });
      }
    }
    return result;
  }

  get remaining() {
    return this.cells.reduce((count, id) => count + (id === EMPTY ? 0 : 1), 0);
  }

  clone() {
    const copy = new Board(this.rows, this.cols);
    copy.cells = this.cells.slice();
    copy.kinds = this.kinds.slice();
    return copy;
  }

  /** Build a board from a picture: one string per row, '.' = empty, other chars = kinds. */
  static fromRows(lines) {
    const board = new Board(lines.length, lines[0].length);
    const kindOf = new Map();
    lines.forEach((line, row) => {
      [...line].forEach((char, col) => {
        if (char === ".") return;
        if (!kindOf.has(char)) kindOf.set(char, kindOf.size);
        board.kinds.push(kindOf.get(char));
        board.cells[board.index(row + 1, col + 1)] = board.kinds.length - 1;
      });
    });
    return board;
  }

  /** Inverse of `fromRows`, for readable test assertions. Kinds render as letters a, b, c… */
  toRows() {
    const lines = [];
    for (let r = 1; r <= this.rows; r += 1) {
      let line = "";
      for (let c = 1; c <= this.cols; c += 1) {
        const kind = this.kindAt(r, c);
        line += kind === EMPTY ? "." : String.fromCharCode(97 + kind);
      }
      lines.push(line);
    }
    return lines;
  }
}

/**
 * Random full board. Kinds are dealt pair by pair (`pair i → kind i mod kindCount`) so every
 * kind appears an even number of times.
 */
export function createBoard({ rows, cols, kindCount, rng }) {
  if ((rows * cols) % 2 !== 0) throw new Error("board needs an even number of cells");
  const board = new Board(rows, cols);
  const kinds = [];
  for (let pair = 0; pair < (rows * cols) / 2; pair += 1) {
    const kind = pair % kindCount;
    kinds.push(kind, kind);
  }
  board.kinds = shuffleInPlace(kinds, rng);
  let id = 0;
  for (let r = 1; r <= rows; r += 1) {
    for (let c = 1; c <= cols; c += 1) {
      board.cells[board.index(r, c)] = id;
      id += 1;
    }
  }
  return board;
}
