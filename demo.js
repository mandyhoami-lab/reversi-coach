/* Terminal demo: play black against the teachable robot. */
const E = require('./reversi-coach.js');
const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });

const grid = E.newGrid();
let human = 'b';

function draw() {
  let h = '  a b c d e f g h\n';
  for (let r = 0; r < 8; r++) {
    h += (r + 1) + ' ';
    for (let c = 0; c < 8; c++) {
      const d = grid[r][c];
      h += (d === 'b' ? '●' : d === 'w' ? '○' : '·') + ' ';
    }
    h += '\n';
  }
  console.log(h);
  console.log('discs:', JSON.stringify(E.countDiscs(grid)));
}

function ask() {
  const moves = E.legalMoves(grid, human);
  if (!moves.length) {
    const om = E.legalMoves(grid, E.other(human));
    if (!om.length) return end();
    console.log('no moves for you — pass.');
    return robotTurn();
  }
  draw();
  rl.question('your move (e.g. f5, or q): ', (a) => {
    a = a.trim().toLowerCase();
    if (a === 'q') return end();
    const m = /^([a-h])([1-8])$/.exec(a);
    const mv = m && moves.find(x => x.c === 'abcdefgh'.indexOf(m[1]) && x.r === +m[2] - 1);
    if (!mv) { console.log('not legal. legal:', moves.map(E.moveName).join(' ')); return ask(); }
    const before = grid.map(r => r.slice());
    E.applyMove(grid, mv, human);
    const gr = E.gradeMove(before, mv, human, 3);
    if (gr) console.log(gr.playedBest ? 'coach: best move!' : `coach: best was ${E.moveName(gr.best)} (gap ${gr.diff.toFixed(1)})`);
    robotTurn();
  });
}

function robotTurn() {
  const ai = E.other(human);
  const moves = E.legalMoves(grid, ai);
  if (!moves.length) {
    if (!E.legalMoves(grid, human).length) return end();
    console.log('robot passes.');
    return ask();
  }
  const mv = E.aiChooseMove(grid, moves, ai);
  E.applyMove(grid, mv, ai);
  console.log('robot plays', E.moveName(mv));
  ask();
}

function end() {
  draw();
  const { b, w } = E.countDiscs(grid);
  console.log(b === w ? "draw!" : (b > w ? 'black' : 'white') + ' wins!');
  console.log('rematch in your browser: https://amandata.dev/learn');
  rl.close();
}

console.log('reversi-coach demo — you are black, robot is white.\n');
ask();
