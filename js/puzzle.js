/*
 * puzzle.js
 * 8-Puzzle model: state encoding, validation, solvability, successors, random puzzles.
 * A state is an array of 9 numbers (row-major). 0 is the blank tile.
 */
(global => {
  'use strict';

  const GOAL_CLASSIC = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  const GOAL_ASSIGNMENT = [1, 2, 3, 8, 0, 4, 7, 6, 5];
  const EXAMPLE_INITIAL = [2, 8, 3, 1, 6, 4, 7, 0, 5];

  /* A state becomes one integer (9 digits) so it can be used as a Map / Set key. */
  function encode(s) {
    let n = 0;
    for (let i = 0; i < 9; i++) n = n * 10 + s[i];
    return n;
  }

  function decode(n) {
    let a = new Array(9);
    for (let i = 8; i >= 0; i--) {
      const d = n % 10;
      a[i] = d;
      n = (n - d) / 10;
    }
    return a;
  }

  function isValid(s) {
    if (!Array.isArray(s) || s.length !== 9) return false;
    let seen = [false, false, false, false, false, false, false, false, false];
    for (let i = 0; i < 9; i++) {
      const v = s[i];
      if (!Number.isInteger(v) || v < 0 || v > 8 || seen[v]) return false;
      seen[v] = true;
    }
    return true;
  }

  function inversions(s) {
    let c = 0;
    for (let i = 0; i < 9; i++) {
      if (!s[i]) continue;
      for (let j = i + 1; j < 9; j++) {
        if (s[j] && s[i] > s[j]) c++;
      }
    }
    return c;
  }

  /* On a 3x3 board two states are mutually reachable exactly when their inversion parities match. */
  function isSolvable(initial, goal) {
    return inversions(initial) % 2 === inversions(goal) % 2;
  }

  function equals(a, b) {
    for (let i = 0; i < 9; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function opposite(dir) {
    return { up: 'down', down: 'up', left: 'right', right: 'left' }[dir];
  }

  function make(s, blank, target, dir) {
    const ns = s.slice();
    ns[blank] = s[target];
    ns[target] = 0;
    return { state: ns, tile: s[target], dir: dir, blankFrom: blank, blankTo: target };
  }

  /*
   * Successor states. The blank moves up, down, left, right (in that fixed order).
   * "dir" is the direction the BLANK moves; the tile moves the opposite way.
   */
  function neighbors(s) {
    const b = s.indexOf(0);
    const r = (b / 3) | 0;
    let c = b % 3;
    const out = [];
    if (r > 0) out.push(make(s, b, b - 3, 'up'));
    if (r < 2) out.push(make(s, b, b + 3, 'down'));
    if (c > 0) out.push(make(s, b, b - 1, 'left'));
    if (c < 2) out.push(make(s, b, b + 1, 'right'));
    return out;
  }

  /* Which way a tile slides when it moves from index "from" into the blank at index "to". */
  function slideDir(from, to) {
    const d = to - from;
    if (d === -3) return 'up';
    if (d === 3) return 'down';
    if (d === -1) return 'left';
    if (d === 1) return 'right';
    return null;
  }

  function areAdjacent(i, j) {
    return slideDir(i, j) !== null && !(Math.abs(i - j) === 1 && ((i / 3) | 0) !== ((j / 3) | 0));
  }

  /* Small seeded generator so benchmarks are repeatable. */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /*
   * Random solvable puzzle: walk away from the goal with random legal moves
   * (never undoing the previous move), so the result is always solvable.
   */
  function randomPuzzle(goal, steps, rng) {
    rng = rng || Math.random;
    let attempts = 0;
    while (attempts < 20) {
      let cur = goal.slice();
      let prevKey = -1;
      for (let i = 0; i < steps; i++) {
        const curKey = encode(cur);
        const opts = neighbors(cur).filter(n => { return encode(n.state) !== prevKey; });
        const pick = opts[Math.floor(rng() * opts.length)];
        prevKey = curKey;
        cur = pick.state;
      }
      if (!equals(cur, goal)) return cur;
      attempts++;
    }
    return neighbors(goal)[0].state;
  }

  /* Text from an input cell: blank can be empty, "_", "-" or "0". NaN means invalid. */
  function parseCell(text) {
    let t = String(text).trim();
    if (t === '' || t === '_' || t === '-' || t === '0') return 0;
    if (/^[1-8]$/.test(t)) return parseInt(t, 10);
    return NaN;
  }

  function toText(s) {
    return s.map(v => { return v === 0 ? '_' : String(v); }).join(' ');
  }

  const DIFFICULTY = { easy: 8, medium: 16, hard: 26, brutal: 60 };

  global.Puzzle = {
    GOAL_CLASSIC: GOAL_CLASSIC,
    GOAL_ASSIGNMENT: GOAL_ASSIGNMENT,
    EXAMPLE_INITIAL: EXAMPLE_INITIAL,
    DIFFICULTY: DIFFICULTY,
    encode: encode,
    decode: decode,
    isValid: isValid,
    inversions: inversions,
    isSolvable: isSolvable,
    equals: equals,
    opposite: opposite,
    neighbors: neighbors,
    slideDir: slideDir,
    areAdjacent: areAdjacent,
    mulberry32: mulberry32,
    randomPuzzle: randomPuzzle,
    parseCell: parseCell,
    toText: toText
  };
})(typeof window !== 'undefined' ? window : globalThis);
