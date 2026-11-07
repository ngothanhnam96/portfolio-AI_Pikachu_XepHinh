# 02 · Design (plan + analysis)

## Architecture

```text
index.html ─► src/main.js (UI controller: DOM, input, animation, audio, storage)
                  │ calls                         ▲ events
                  ▼                               │
             src/core/game.js  ── state machine: level, score, timer, selection, combo
                  │
     ┌────────────┼──────────────┬───────────────┐
     ▼            ▼              ▼               ▼
 board.js      path.js       gravity.js      moves.js        rng.js
 grid + tile   ≤2-turn path  slide tiles     hint / shuffle  seeded PRNG
 identities    finder        per mode        deadlock check
```

`src/core/*` never touches the DOM, so the whole rule set runs under `node --test`.

## Data model

- The grid is **padded**: `(rows + 2) × (cols + 2)` cells, the outer ring always empty. Paths
  around the edge need no special case.
- `cells[i]` holds a **tile id** (or `-1`), `kinds[id]` holds the animal. Gravity and shuffle
  move ids, so the UI can keep one DOM element per id and animate it with a CSS transform.

## Path finding (≤ 2 turns)

Every path with at most two turns has the shape `A → P1 → P2 → B` where either

- `P1 = (r, A.col)`, `P2 = (r, B.col)` for some row `r` (vertical–horizontal–vertical), or
- `P1 = (A.row, c)`, `P2 = (B.row, c)` for some column `c` (horizontal–vertical–horizontal).

Zero- and one-turn paths are the degenerate cases (`r = A.row`, etc.). So we test every row
and every column of the padded grid — `O((R + C) · (R + C))`, ~ 1 000 cell checks on 11 × 18.
Among valid paths the **shortest** wins (ties → fewer turns), which also makes the drawn line
look natural. Points are then simplified (drop duplicates and collinear points).

## Gravity modes (cycle per level)

| Level | Mode        | Effect after each match                        |
|-------|-------------|------------------------------------------------|
| 1     | `none`      | Tiles stay                                      |
| 2     | `down`      | Columns compact downward                        |
| 3     | `up`        | Columns compact upward                          |
| 4     | `left`      | Rows compact left                               |
| 5     | `right`     | Rows compact right                              |
| 6     | `center-x`  | Left half slides right, right half slides left  |
| 7     | `outward-x` | Halves slide away from the centre               |
| 8     | `center-y`  | Top half slides down, bottom half slides up     |
| 9     | `outward-y` | Halves slide toward top and bottom edges        |

Then the cycle repeats with harder parameters.

## Difficulty curve

| Parameter     | Formula                                   | L1  | L5  | L10 |
|---------------|-------------------------------------------|-----|-----|-----|
| Animal kinds  | `min(36, 24 + 3·(L−1))`                   | 24  | 36  | 36  |
| Time (s)      | `max(180, 420 − 25·(L−1))`                | 420 | 320 | 195 |
| Hints / level | 3                                         |     |     |     |
| Shuffles / level | 3                                      |     |     |     |

Kinds are assigned pair by pair (`pair i → kind i mod K`), so every kind appears an even
number of times.

## Scoring

- Match: `10 + 5 · (combo − 1)`; combo grows when the next match comes within 4 s.
- Level clear: `+ 2 × seconds left`.

## Deadlocks & shuffle

Random boards can dead-lock (no pair connectable), especially with gravity. After every
match the game checks `findAnyPair`; if none exists it shuffles for free. A shuffle permutes
tile ids over occupied cells and retries (up to 200 times) until a pair exists. Tests play
full games with an automatic solver across many seeds and every gravity mode to prove a
level can always be finished.

## UI decisions

- Board drawn as absolutely positioned tiles; size computed from the viewport each resize.
- Path drawn in an SVG overlay through cell centres (including the outer ring), fades in 0.35 s.
- Removal: scale + fade; gravity: transform transition 160 ms.
- Sounds synthesised with WebAudio (no asset files); pitch rises with combo.
- Best score and mute flag in `localStorage` (wrapped in try/catch).

## Risks

| Risk                                                 | Mitigation                                     |
|------------------------------------------------------|------------------------------------------------|
| Emoji render differently per OS                      | Use long-standing emoji (Unicode ≤ 11); uniform tile frame |
| Similar animals (🐯 / 🦁) confuse players            | Intended genre difficulty; hint available       |
| ES modules blocked on `file://`                      | `npm start` serves over http; Pages serves over https |
| IP: genre classics use licensed characters           | Original name and generic emoji only            |
