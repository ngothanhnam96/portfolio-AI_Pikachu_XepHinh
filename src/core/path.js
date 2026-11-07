/**
 * Connection rule: two tiles of the same kind connect through empty cells with at most three
 * straight segments (≤ 2 turns).
 *
 * Every such path has the shape A → P1 → P2 → B with either
 *   P1 = (r, A.c), P2 = (r, B.c) for some row r      (vertical, horizontal, vertical), or
 *   P1 = (A.r, c), P2 = (B.r, c) for some column c   (horizontal, vertical, horizontal).
 * 0- and 1-turn paths are degenerate cases of these, so trying every row and every column of
 * the padded grid finds all candidates. The shortest one wins (ties: fewer turns).
 */

import { EMPTY } from "./board.js";

const same = (p, q) => p.r === q.r && p.c === q.c;

/** All cells from p to q (inclusive, straight line) are empty, except the endpoints a and b. */
function segmentClear(board, p, q, a, b) {
  const dr = Math.sign(q.r - p.r);
  const dc = Math.sign(q.c - p.c);
  let r = p.r;
  let c = p.c;
  for (;;) {
    const cell = { r, c };
    if (!same(cell, a) && !same(cell, b) && !board.isEmpty(r, c)) return false;
    if (r === q.r && c === q.c) return true;
    r += dr;
    c += dc;
  }
}

/** Drop repeated points and middle points that lie on a straight line. */
export function simplify(points) {
  const unique = points.filter((point, i) => i === 0 || !same(point, points[i - 1]));
  return unique.filter((point, i) => {
    if (i === 0 || i === unique.length - 1) return true;
    const prev = unique[i - 1];
    const next = unique[i + 1];
    return !((prev.r === point.r && point.r === next.r) || (prev.c === point.c && point.c === next.c));
  });
}

function pathLength(points) {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    length += Math.abs(points[i].r - points[i - 1].r) + Math.abs(points[i].c - points[i - 1].c);
  }
  return length;
}

/**
 * Returns the connecting path as corner points `[A, …, B]` (2 to 4 points), or `null`.
 */
export function findPath(board, a, b) {
  if (same(a, b)) return null;
  const kind = board.kindAt(a.r, a.c);
  if (kind === EMPTY || kind !== board.kindAt(b.r, b.c)) return null;

  let best = null;
  let bestLength = Infinity;
  const consider = (p1, p2) => {
    if (!segmentClear(board, a, p1, a, b)) return;
    if (!segmentClear(board, p1, p2, a, b)) return;
    if (!segmentClear(board, p2, b, a, b)) return;
    const points = simplify([a, p1, p2, b]);
    const length = pathLength(points);
    if (length < bestLength || (length === bestLength && points.length < best.length)) {
      best = points;
      bestLength = length;
    }
  };

  for (let r = 0; r < board.height; r += 1) consider({ r, c: a.c }, { r, c: b.c });
  for (let c = 0; c < board.width; c += 1) consider({ r: a.r, c }, { r: b.r, c });
  return best;
}

export function canConnect(board, a, b) {
  return findPath(board, a, b) !== null;
}
