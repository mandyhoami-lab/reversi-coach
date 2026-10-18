/* =========================================================
   reversi-coach — standalone Othello/Reversi engine + robots.
   Pure game logic with zero dependencies: legal move generation,
   a teachable AI opponent (easy to beat on purpose), a deeper
   search for analysis, and a move grader (best..blunder).
   Extracted from the playable game at https://amandata.dev/learn
   Works in the browser (window.ReversiCoach) and node
   (module.exports). No DOM required.
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- engine (pure, testable) ---------------- */
  var N = 8;
  var DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

  function onBoard(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
  function other(p) { return p === 'b' ? 'w' : 'b'; }

  function newGrid() {
    var g = [];
    for (var r = 0; r < N; r++) { g.push([]); for (var c = 0; c < N; c++) g[r].push(null); }
    g[3][3] = 'w'; g[3][4] = 'b';
    g[4][3] = 'b'; g[4][4] = 'w';
    return g;
  }

  function legalMoves(g, p) {
    var o = other(p), moves = [];
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      if (g[r][c]) continue;
      var flips = [];
      for (var d = 0; d < DIRS.length; d++) {
        var line = [], rr = r + DIRS[d][0], cc = c + DIRS[d][1];
        while (onBoard(rr, cc) && g[rr][cc] === o) { line.push([rr, cc]); rr += DIRS[d][0]; cc += DIRS[d][1]; }
        if (line.length && onBoard(rr, cc) && g[rr][cc] === p) flips = flips.concat(line);
      }
      if (flips.length) moves.push({ r: r, c: c, flips: flips });
    }
    return moves;
  }

  function applyMove(g, mv, p) {
    g[mv.r][mv.c] = p;
    for (var i = 0; i < mv.flips.length; i++) g[mv.flips[i][0]][mv.flips[i][1]] = p;
  }

  function countDiscs(g) {
    var b = 0, w = 0;
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      if (g[r][c] === 'b') b++; else if (g[r][c] === 'w') w++;
    }
    return { b: b, w: w };
  }

  /* ---------------- robot ----------------
     A teachable, beatable robot. Each game it samples a "mood":
     a blunder rate between 60% and 92%. Most moves it just picks
     a random legal square (easy to beat, easy to learn against),
     but when it focuses it plays a real 1-ply positional game with
     a mobility term — so you still see what good Othello looks like.
     Some games it goofs off, some games it locks in: expect a mix
     of wins and losses, no two games alike. */
  var WEIGHTS = [
    120, -20,  20,   5,   5,  20, -20, 120,
    -20, -40,  -5,  -5,  -5,  -5, -40, -20,
     20,  -5,  15,   3,   3,  15,  -5,  20,
      5,  -5,   3,   3,   3,   3,  -5,   5,
      5,  -5,   3,   3,   3,   3,  -5,   5,
     20,  -5,  15,   3,   3,  15,  -5,  20,
    -20, -40,  -5,  -5,  -5,  -5, -40, -20,
    120, -20,  20,   5,   5,  20, -20, 120
  ];

  function evaluate(g, p) {
    var o = other(p), score = 0;
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      if (g[r][c] === p) score += WEIGHTS[r * N + c];
      else if (g[r][c] === o) score -= WEIGHTS[r * N + c];
    }
    score += (legalMoves(g, p).length - legalMoves(g, o).length) * 6;
    return score;
  }

  function cloneGrid(g) {
    return g.map(function (row) { return row.slice(); });
  }

  function aiChooseMove(g, moves, ai, rnd, blunder) {
    rnd = rnd || Math.random;
    blunder = (typeof blunder === 'number') ? blunder : 0.75;
    if (!moves.length) return null;
    /* goof-off move: any legal square, great for learning against */
    if (rnd() < blunder) return moves[(rnd() * moves.length) | 0];
    /* focused move: 1-ply positional play with a little wobble */
    var scored = moves.map(function (mv) {
      var ng = cloneGrid(g);
      applyMove(ng, mv, ai);
      return { mv: mv, s: evaluate(ng, ai) + rnd() * 8 };
    });
    scored.sort(function (a, b) { return b.s - a.s; });
    return scored[0].mv;
  }

  /* Deeper search (negamax + alpha-beta) used by the advanced
     teaching mode: grading human moves and powering the robot.
     (cloneGrid above is shared; the duplicate declaration the file
     once carried is gone — the two were identical.) */
  function negamax(g, color, depth, alpha, beta) {
    var ms = legalMoves(g, color);
    if (ms.length === 0) {
      if (legalMoves(g, other(color)).length === 0) {
        var c = countDiscs(g);
        var diff = color === 'b' ? c.b - c.w : c.w - c.b;
        return diff * 10000;
      }
      return -negamax(g, other(color), depth, -beta, -alpha);
    }
    if (depth === 0) return evaluate(g, color);
    var best = -Infinity;
    for (var i = 0; i < ms.length; i++) {
      var ng = cloneGrid(g);
      applyMove(ng, ms[i], color);
      var s = -negamax(ng, other(color), depth - 1, -beta, -alpha);
      if (s > best) best = s;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }
  function searchMove(g, color, depth) {
    var ms = legalMoves(g, color);
    if (!ms.length) return { mv: null, score: 0 };
    var best = ms[0], bestS = -Infinity;
    for (var i = 0; i < ms.length; i++) {
      var ng = cloneGrid(g);
      applyMove(ng, ms[i], color);
      var s = -negamax(ng, other(color), depth - 1, -Infinity, Infinity);
      if (s > bestS) { bestS = s; best = ms[i]; }
    }
    return { mv: best, score: bestS };
  }
  /* How good was the human's move? Compares it against the engine's
     best move at the same depth. diff is in eval points, from the
     mover's perspective (0 = played the best move). */
  function gradeMove(g, mv, color, depth) {
    var best = searchMove(g, color, depth);
    if (!best.mv) return null;
    var playedBest = best.mv.r === mv.r && best.mv.c === mv.c;
    var afterHuman = cloneGrid(g);
    applyMove(afterHuman, mv, color);
    var humanScore = -negamax(afterHuman, other(color), depth - 1, -Infinity, Infinity);
    return { best: best.mv, diff: playedBest ? 0 : best.score - humanScore, playedBest: playedBest };
  }
  function moveName(mv) {
    return 'abcdefgh'.charAt(mv.c) + (mv.r + 1);
  }

  /* expose engine for node testing and for the advanced page */
  /* -------- pixel-art disc sprites (generated at runtime) --------
     Awake cat heads, 16x16, in the site cat's palette: cream cat for
     white, black cat with amber eyes for black. The head breaks out
     of the old disc circle — ears and all — with a 1px outline. */
  var CAT_FACE_ROWS = [
    "................",
    "..ff........ff..",
    "..fff......fff..",
    "..fppf....fppf..",
    "..ffffffffffff..",
    ".ffffffddffffff.",
    ".ffffffffffffff.",
    ".fffveffffvefff.",
    ".fffeeffffeefff.",
    ".ffffffffffffff.",
    ".ffffffnnffffff.",
    ".fffffdfffdffff.",
    ".ffffffffffffff.",
    "..ffffffffffff..",
    "...ffffffffff...",
    ".....ffffff....."
  ];
  var _spriteCache = {};
  var ENGINE_API = {
    newGrid: newGrid, legalMoves: legalMoves, applyMove: applyMove,
    countDiscs: countDiscs, evaluate: evaluate, aiChooseMove: aiChooseMove,
    other: other, searchMove: searchMove, gradeMove: gradeMove,
    moveName: moveName
  };
  if (typeof window !== 'undefined') window.ReversiCoach = ENGINE_API;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ENGINE_API;
    return;
  }

})();
