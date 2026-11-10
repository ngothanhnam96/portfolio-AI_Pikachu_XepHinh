# 04 · Testing

```bash
npm test          # node --test, no dependencies
```

64 tests across 16 suites, all deterministic (seeded RNG), ~0.3 s.

| File                | What it proves                                                                   | Spec |
|---------------------|----------------------------------------------------------------------------------|------|
| `board.test.js`     | Seeded RNG, padded grid, `fromRows`/`toRows`, generator deals even kind counts and unique ids | FR-1, NFR-3 |
| `path.test.js`      | 0/1/2-turn paths, routing through the outer ring, 3-turn rejection, kind/empty/self checks, symmetry, shortest route | FR-2, FR-3 |
| `gravity.test.js`   | All nine modes on hand-drawn boards, tile identity kept, tile count invariant     | FR-4 |
| `moves.test.js`     | Hint pairs really connect, a true deadlock (`abcd/cdab`) is detected and always broken by shuffle | FR-5–FR-7 |
| `game.test.js`      | Select/deselect/mismatch/no-path, scoring, combo window, time bonus, hint/shuffle limits, more hints from level 4, pause, game over, gravity after match, auto-shuffle on deadlock | FR-2–FR-10 |
| `scenes.test.js`    | Every background picture is a self-contained SVG (no NaN/undefined, no external refs) with a unique name; levels cycle and redraw identically; every music loop is well formed | FR-11, FR-13 |
| `game.test.js` (solver) | An automatic player clears full 9×16 levels for **every gravity mode** over several seeds, plus a portrait board — the game can never strand the player | FR-5 |

## Browser end-to-end check (v0.1.0)

Headless Edge driven over the DevTools protocol, clicking tiles like a player:

| Check                                                             | Result |
|-------------------------------------------------------------------|--------|
| Start screen over a blurred, paused board                          | ✅ |
| Clear the whole of level 1 by clicking (72 pairs)                  | ✅ level-clear dialog |
| Keyboard cursor + Enter selection, hint highlights 2 tiles         | ✅ |
| Level 2 "↓ Rơi xuống": 15 matches with real animation delays       | ✅ tiles fall |
| Pause blurs the board                                              | ✅ |
| Phone 390 × 844 (mobile emulation): portrait 16 × 9 board, no horizontal overflow | ✅ 352 px board |
| Dark theme                                                         | ✅ |
| JavaScript errors / console errors                                 | none |

## Browser check for v0.2.0 (picture + music)

Headless Edge with autoplay allowed, counting oscillator notes via a wrapped `OscillatorNode.start`:

| Check | Result |
|-------|--------|
| Picture shows through the gaps as tiles are removed | ✅ |
| Clearing all 72 pairs → picture at full opacity with caption "Đồng cỏ buổi sáng"; dialog held back, then opens with a thumbnail | ✅ |
| Music while playing | ✅ ~15 notes in 2 s |
| Music silent on the clear dialog | ✅ 0 notes |
| Level 2: new picture "Hoàng hôn trên biển" and a different loop | ✅ |
| `N` turns music off (0 notes) and saves `noi-thu:music = false` | ✅ |
| Console errors | none |

## Bugs found and fixed while testing

| Found | Fix |
|-------|-----|
| On phones the board was sized from `innerWidth`, which grows when content overflows — the board sized itself from its own overflow (462 px on a 390 px screen) | Size from `documentElement.clientWidth/Height` (the layout viewport) |
| Several test expectations were wrong (an `up` gravity picture, a "two-turn corridor" that had no path) | Fixed the tests; the engine was right |

## Note on headless browsers

Headless Chromium can fire `visibilitychange → hidden` at random moments. The game
deliberately auto-pauses when the tab is hidden, so automated runs must keep the page
visible (`--disable-renderer-backgrounding`, focus emulation) or they will see a pause dialog.
