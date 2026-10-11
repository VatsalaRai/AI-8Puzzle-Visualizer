/*
 * Engine tests. Run with:  node tests/engine.test.js
 * No dependencies. Checks the puzzle model and the Uniform Cost Search engine.
 */
'use strict';
const assert = require('assert');
require('../js/puzzle.js');
require('../js/ucs.js');
const P = globalThis.Puzzle;
const U = globalThis.Ucs;

let passed = 0;
function test(name, fn) {
  const t = Date.now();
  fn();
  passed++;
  console.log('ok   ' + name + '  (' + (Date.now() - t) + ' ms)');
}

/* Independent reference BFS (fewest moves) used to cross-check UCS. */
function bfsDepth(start, goal) {
  const gk = P.encode(goal);
  let frontier = [start];
  const seen = new Set([P.encode(start)]);
  let d = 0;
  while (frontier.length) {
    if (frontier.some((s) => P.encode(s) === gk)) return d;
    const next = [];
    for (const s of frontier) {
      for (const nb of P.neighbors(s)) {
        const k = P.encode(nb.state);
        if (!seen.has(k)) { seen.add(k); next.push(nb.state); }
      }
    }
    frontier = next;
    d++;
  }
  return -1;
}

/* Independent reference Dijkstra (plain array scan, no heap) for weighted costs. */
function dijkstraCost(start, goal, model) {
  const gk = P.encode(goal);
  const dist = new Map([[P.encode(start), 0]]);
  const open = new Set([P.encode(start)]);
  while (open.size) {
    let best = null;
    for (const k of open) if (best === null || dist.get(k) < dist.get(best)) best = k;
    open.delete(best);
    if (best === gk) return dist.get(best);
    for (const nb of P.neighbors(P.decode(best))) {
      const k = P.encode(nb.state);
      const nd = dist.get(best) + (model === 'tile' ? nb.tile : 1);
      if (!dist.has(k) || nd < dist.get(k)) { dist.set(k, nd); open.add(k); }
    }
  }
  return -1;
}

test('encode / decode round trip', () => {
  const s = [2, 8, 3, 1, 6, 4, 7, 0, 5];
  assert.deepStrictEqual(P.decode(P.encode(s)), s);
  const z = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  assert.deepStrictEqual(P.decode(P.encode(z)), z);
});

test('validation and solvability', () => {
  assert.ok(P.isValid(P.EXAMPLE_INITIAL));
  assert.ok(!P.isValid([1, 1, 2, 3, 4, 5, 6, 7, 0]));
  assert.ok(P.isSolvable(P.EXAMPLE_INITIAL, P.GOAL_ASSIGNMENT));
  assert.ok(!P.isSolvable([1, 2, 3, 4, 5, 6, 8, 7, 0], P.GOAL_CLASSIC));
});

test('neighbors: corner 2, edge 3, centre 4', () => {
  assert.strictEqual(P.neighbors([0, 1, 2, 3, 4, 5, 6, 7, 8]).length, 2);
  assert.strictEqual(P.neighbors([1, 0, 2, 3, 4, 5, 6, 7, 8]).length, 3);
  assert.strictEqual(P.neighbors([1, 2, 3, 4, 0, 5, 6, 7, 8]).length, 4);
});

test('assignment example is solved in exactly 5 moves', () => {
  const r = U.solve(P.EXAMPLE_INITIAL, P.GOAL_ASSIGNMENT, { costModel: 'uniform' });
  assert.ok(r.found);
  assert.strictEqual(r.moves.length, 5);
  assert.strictEqual(r.cost, 5);
});

test('solution paths are legal and end at the goal', () => {
  const rng = P.mulberry32(7);
  for (let i = 0; i < 12; i++) {
    const init = P.randomPuzzle(P.GOAL_CLASSIC, 18, rng);
    for (const model of ['uniform', 'tile']) {
      const r = U.solve(init, P.GOAL_CLASSIC, { costModel: model, record: false });
      assert.ok(r.found);
      assert.deepStrictEqual(r.path[0], init);
      assert.deepStrictEqual(r.path[r.path.length - 1], P.GOAL_CLASSIC);
      let c = 0;
      for (let s = 0; s + 1 < r.path.length; s++) {
        const legal = P.neighbors(r.path[s]).some((n) => P.equals(n.state, r.path[s + 1]));
        assert.ok(legal, 'illegal step');
        c += U.stepCost(r.moves[s].tile, model);
      }
      assert.strictEqual(c, r.cost);
    }
  }
});

test('uniform UCS is optimal (matches independent BFS)', () => {
  const rng = P.mulberry32(11);
  for (let i = 0; i < 10; i++) {
    const init = P.randomPuzzle(P.GOAL_ASSIGNMENT, 20, rng);
    const r = U.solve(init, P.GOAL_ASSIGNMENT, { costModel: 'uniform', record: false });
    assert.strictEqual(r.moves.length, bfsDepth(init, P.GOAL_ASSIGNMENT));
  }
});

test('tile-weighted UCS is optimal (matches independent Dijkstra)', () => {
  const rng = P.mulberry32(23);
  for (let i = 0; i < 4; i++) {
    const init = P.randomPuzzle(P.GOAL_CLASSIC, 12, rng);
    const r = U.solve(init, P.GOAL_CLASSIC, { costModel: 'tile', record: false });
    assert.strictEqual(r.cost, dijkstraCost(init, P.GOAL_CLASSIC, 'tile'));
  }
});

test('unsolvable puzzle exhausts all 181,440 reachable states', () => {
  const bad = [1, 2, 3, 4, 5, 6, 8, 7, 0];
  const r = U.solve(bad, P.GOAL_CLASSIC, { costModel: 'uniform', record: false });
  assert.ok(!r.found);
  assert.strictEqual(r.stats.expanded, 181440);
});

test('distanceMap agrees with UCS from the start state', () => {
  const rng = P.mulberry32(5);
  const dm = U.distanceMap(P.GOAL_CLASSIC, 'uniform');
  assert.strictEqual(dm.size, 181440);
  for (let i = 0; i < 6; i++) {
    const init = P.randomPuzzle(P.GOAL_CLASSIC, 22, rng);
    const r = U.solve(init, P.GOAL_CLASSIC, { costModel: 'uniform', record: false });
    assert.strictEqual(dm.get(P.encode(init)), r.cost);
  }
  const dt = U.distanceMap(P.GOAL_CLASSIC, 'tile');
  const init = P.randomPuzzle(P.GOAL_CLASSIC, 14, rng);
  const r = U.solve(init, P.GOAL_CLASSIC, { costModel: 'tile', record: false });
  assert.strictEqual(dt.get(P.encode(init)), r.cost);
});

test('every move changes distance by 1 in the uniform model (right / wrong is always defined)', () => {
  const dm = U.distanceMap(P.GOAL_ASSIGNMENT, 'uniform');
  const rng = P.mulberry32(3);
  const s = P.randomPuzzle(P.GOAL_ASSIGNMENT, 25, rng);
  for (const nb of P.neighbors(s)) {
    assert.strictEqual(Math.abs(dm.get(P.encode(nb.state)) - dm.get(P.encode(s))), 1);
  }
});

test('trace replay: frontier size matches, forward then backward restores state', () => {
  const init = P.randomPuzzle(P.GOAL_CLASSIC, 16, P.mulberry32(99));
  const r = U.solve(init, P.GOAL_CLASSIC, { costModel: 'tile', record: true });
  const rp = new U.Replay(r);
  const total = rp.total();
  assert.strictEqual(r.trace.node.length, r.stats.expanded + 1);
  const snapshots = [];
  for (let k = 0; k < total; k++) {
    rp.forward();
    assert.strictEqual(rp.frontier.size, r.trace.front[k], 'frontier size at step ' + k);
    if (k % 97 === 0) snapshots.push([k + 1, Array.from(rp.frontier).sort((a, b) => a - b)]);
  }
  const cur = rp.current();
  assert.ok(cur.isGoal);
  assert.strictEqual(cur.expanded, r.stats.expanded);
  assert.strictEqual(cur.generated, r.stats.generated);
  for (let s = snapshots.length - 1; s >= 0; s--) {
    rp.seek(snapshots[s][0]);
    assert.deepStrictEqual(Array.from(rp.frontier).sort((a, b) => a - b), snapshots[s][1]);
  }
  rp.seek(0);
  assert.deepStrictEqual(Array.from(rp.frontier), [0]);
});

test('topFrontier is sorted by (g, order) and never exceeds n', () => {
  const init = P.randomPuzzle(P.GOAL_CLASSIC, 18, P.mulberry32(41));
  const r = U.solve(init, P.GOAL_CLASSIC, { costModel: 'tile', record: true });
  const rp = new U.Replay(r);
  rp.seek(Math.floor(rp.total() / 2));
  const top = rp.topFrontier(12);
  assert.ok(top.length <= 12);
  for (let i = 1; i < top.length; i++) {
    const a = r.nodes.g[top[i - 1]];
    const b = r.nodes.g[top[i]];
    assert.ok(a < b || (a === b && top[i - 1] < top[i]));
  }
});

test('solve() with record=false equals record=true on every statistic', () => {
  const init = P.randomPuzzle(P.GOAL_CLASSIC, 20, P.mulberry32(8));
  const a = U.solve(init, P.GOAL_CLASSIC, { costModel: 'uniform', record: false });
  const b = U.solve(init, P.GOAL_CLASSIC, { costModel: 'uniform', record: true });
  for (const k of ['generated', 'expanded', 'maxDepth', 'peakFrontier', 'nodesStored']) {
    assert.strictEqual(a.stats[k], b.stats[k], k);
  }
  assert.strictEqual(a.cost, b.cost);
});

console.log('\nAll ' + passed + ' engine tests passed.');
