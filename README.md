# reversi-coach

A standalone Othello/Reversi engine with two robots, in a single zero-dependency JavaScript file. Extracted from the playable game at [amandata.dev/learn](https://amandata.dev/learn).

## What's inside

`reversi-coach.js` — pure game logic, no DOM needed. Works in the browser (`window.ReversiCoach`) and in node (`module.exports`).

**Rules engine**
- `newGrid()` — fresh 8×8 board
- `legalMoves(grid, color)` — all legal moves for `'b'` / `'w'`
- `applyMove(grid, move, color)` — play a move, flips discs
- `countDiscs(grid)` — `{ b, w }` disc counts
- `moveName(move)` — `"e6"` style coordinates

**The robots**
- `aiChooseMove(grid, moves, color)` — the *teachable robot*: deliberately easy to beat, plays like a casual human so beginners can learn
- `searchMove(grid, color, depth)` — deeper negamax search for analysis; returns `{ move, score }`
- `evaluate(grid, color)` — positional evaluation
- `gradeMove(grid, move, color, depth)` — the *coach*: compares your move against the engine's best, returns `{ best, diff, playedBest }` (best move, centipawn-ish gap, whether you found it)

## Try it

```bash
node demo.js
```

Play black against the teachable robot in your terminal. Type moves like `f5`, or `q` to quit.

## Play it in the browser

The full experience — beginner mode vs. the robot, and advanced study mode where the coach grades every move with an eval graph — lives at [amandata.dev/learn](https://amandata.dev/learn).

## Credit

Study-mode concept inspired by Hiyoko Reversi (ひよこリバーシ) — its post-game analysis and eval graph taught me what a teaching UI should do. Built by [Mandy](https://amandata.dev).
