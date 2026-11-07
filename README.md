# Nối Thú — Animal Connect

An original browser puzzle in the classic **tile-connect** genre (Onet / Shisen-Sho, known in
Vietnam as "xếp hình nối thú"). Find two identical animals and join them with a line of at
most **two turns** before the clock runs out. Every level adds a new **gravity** twist.

- 9 × 16 board (16 × 9 on phones), 36 animals, paths may wrap around the outer edge
- 9 gravity modes: still, fall, rise, slide left/right, collapse to / split from the centre
- Combos, time bonus, best score, hints, shuffles, automatic deadlock shuffle
- Mouse, touch and full keyboard play · light & dark theme · sound effects synthesised in code
- Zero dependencies, no build step — pure ES modules

## Play

```bash
npm start      # http://127.0.0.1:5173
```

| Key            | Action           |
|----------------|------------------|
| `← ↑ ↓ →`      | Move cursor      |
| `Enter`/`Space`| Select tile      |
| `H`            | Hint             |
| `S`            | Shuffle          |
| `P` / `Esc`    | Pause            |
| `M`            | Sound on/off     |

## Test

```bash
npm test       # 61 tests, includes an automatic solver clearing full levels in every gravity mode
```

## Project layout

```text
index.html, styles.css      UI shell
src/main.js                 UI controller: rendering, animation, input, overlays
src/ui/audio.js, storage.js WebAudio effects, safe localStorage
src/core/                   pure game rules (no DOM) — fully unit-tested
  board.js                  padded grid with stable tile ids
  path.js                   ≤ 2-turn path finder
  gravity.js                nine gravity modes
  moves.js                  hint search, deadlock detection, shuffle
  game.js                   state machine: levels, score, combo, timer
tests/                      node:test suites
scripts/serve.mjs           zero-dependency static dev server
```

## Engineering process

1. [Spec](docs/01-SPEC.md) — rules, requirements
2. [Design](docs/02-DESIGN.md) — architecture, path algorithm, gravity, difficulty, scoring
3. [Tasks](docs/03-TASKS.md) — traceable task list and backlog
4. Implementation — `src/`
5. [Testing](docs/04-TESTING.md) — unit suites, solver proof, browser e2e, bugs found
6. [Deploy](docs/05-DEPLOY.md) — GitHub Pages, CI

## Credits & license

Game design and code are original. Tile faces are standard Unicode emoji rendered by your
system font. Licensed under Apache-2.0.
