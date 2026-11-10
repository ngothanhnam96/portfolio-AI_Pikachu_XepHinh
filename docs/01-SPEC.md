# 01 · Specification — *Nối Thú* (Animal Connect)

An original browser game in the classic **tile-connect** genre (also known as Onet /
Shisen-Sho, popular in Vietnam as "xếp hình nối thú"). All names and art are original;
tiles use standard Unicode animal emoji.

## Core rule

The board is a grid of tiles. The player picks two tiles showing the **same animal**. They are
removed when they can be joined by a line that:

- has **at most 3 straight segments** (at most 2 turns),
- runs horizontally/vertically only,
- crosses **only empty cells** — including an empty ring around the board, so lines may go
  outside the edge.

The level is cleared when the board is empty. The run ends when the timer reaches zero.

## Functional requirements

| ID    | Requirement |
|-------|-------------|
| FR-1  | Board of 9 × 16 tiles (16 × 9 in portrait), each animal appears an even number of times. |
| FR-2  | Click/tap a tile to select; clicking a second tile resolves the pair (match / not same / no path). Clicking the selected tile deselects it. |
| FR-3  | A valid match draws the connecting path briefly, then removes both tiles. |
| FR-4  | **Gravity modes** change per level: none, down, up, left, right, toward centre and away from centre (horizontal and vertical). Remaining tiles slide after each match. |
| FR-5  | **Deadlock** (no valid pair left) triggers a free automatic shuffle. |
| FR-6  | **Hint** highlights a valid pair (limited per level: 3 on levels 1–3; from level 4, where tiles start sliding sideways, 5, then +1 every 3 levels up to 8). |
| FR-7  | **Shuffle** rearranges remaining tiles (limited per level); a shuffled board always has a move. |
| FR-8  | **Timer** per level; shorter on later levels. Time out → game over. |
| FR-9  | **Score:** 10 per pair + combo bonus for quick consecutive matches + time bonus on clear. Best score is remembered on the device. |
| FR-10 | Difficulty grows per level: more distinct animals, less time, new gravity mode. |
| FR-11 | Pause / resume, sound on / off, background music on / off (music plays only while a level is being played). |
| FR-12 | Keyboard play: arrows move a cursor, Enter/Space select, H hint, S shuffle, P pause, M sound, N music. |
| FR-13 | Each level hides a **background picture** behind the tiles. It shows through as tiles are removed and is fully revealed, with its name, when the level is cleared. |

## Non-functional requirements

| ID    | Requirement |
|-------|-------------|
| NFR-1 | Static site: no build step, no runtime dependencies, works offline once loaded. |
| NFR-2 | Game rules live in pure ES modules with no DOM access, fully unit-tested in Node. |
| NFR-3 | Seeded RNG so every board and test is reproducible. |
| NFR-4 | Responsive from 360 px phones (portrait board) to desktop; touch and mouse. |
| NFR-5 | 60 fps animations via CSS transforms; tile identity is stable so gravity moves animate. |
| NFR-6 | Light and dark theme; status never conveyed by color alone (selection = ring + lift). |
| NFR-7 | CI runs tests on every push; GitHub Pages deploy from `main`. |

## Out of scope (v1)

Online leaderboard, multiplayer, custom tile packs, level editor.
