/*
 * ucs.js
 * Uniform Cost Search for the 8-Puzzle, written from scratch (no search library).
 *
 * Idea: always expand the frontier node with the LOWEST path cost g(n).
 * The goal test is applied when a node is SELECTED for expansion (not when it is
 * generated), which is what makes UCS optimal.
 *
 * Cost models
 *   uniform : every move costs 1            (UCS then finds the fewest moves)
 *   tile    : moving tile k costs k         (UCS finds the cheapest total effort)
 *
 * Data structures
 *   frontier (open list)   : binary min-heap ordered by (g, creation order)
 *   closed list (explored) : Set of encoded states
 *   live frontier lookup   : Map of encoded state -> best node currently waiting
 *
 * Status codes of a generated successor (used by the visualizer)
 *   0 added to the frontier
 *   1 replaced a more expensive copy that was already waiting in the frontier
 *   2 discarded: already in the closed list
 *   3 discarded: already in the frontier with an equal or cheaper cost
 */
((global) => {
  'use strict';

  const P = global.Puzzle;

  const now = (typeof performance !== 'undefined' && performance.now)
    ? () => performance.now()
    : () => Date.now();

  /* Binary min-heap of plain numbers. Priority is encoded as g * M + id. */
  class NumHeap {
    constructor() {
      this.a = [];
    }

    get size() {
      return this.a.length;
    }

    push(v) {
      const a = this.a;
      let i = a.length;
      a.push(v);
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (a[p] <= v) break;
        a[i] = a[p];
        i = p;
      }
      a[i] = v;
    }

    pop() {
      const a = this.a;
      const top = a[0];
      const last = a.pop();
      const n = a.length;
      if (n > 0) {
        let i = 0;
        for (;;) {
          const l = 2 * i + 1;
          if (l >= n) break;
          const r = l + 1;
          const m = (r < n && a[r] < a[l]) ? r : l;
          if (a[m] >= last) break;
          a[i] = a[m];
          i = m;
        }
        a[i] = last;
      }
      return top;
    }
  }

  const stepCost = (tile, model) => (model === 'tile' ? tile : 1);

  function memoryLabel(bytes) {
    if (bytes < 400 * 1024) return 'Low';
    if (bytes < 4 * 1024 * 1024) return 'Medium';
    return 'High';
  }

  /*
   * Core search.
   *   opts.costModel : 'uniform' | 'tile'
   *   opts.record    : keep a full step-by-step trace for the visualizer (default true)
   *   opts.maxNodes  : safety limit on stored nodes
   */
  function solve(initial, goal, opts = {}) {
    const model = opts.costModel === 'tile' ? 'tile' : 'uniform';
    const record = opts.record !== false;
    const maxNodes = opts.maxNodes || 600000;
    const t0 = now();

    const goalKey = P.encode(goal);
    const M = 10000000; // node ids stay below this

    /* Node storage as parallel arrays (index = node id). */
    const nState = [P.encode(initial)];
    const nParent = [-1];
    const nG = [0];
    const nDepth = [0];
    const nTile = [0];
    const nDir = [''];

    const heap = new NumHeap();
    heap.push(0 * M + 0);
    const live = new Map([[nState[0], 0]]);
    const closed = new Set();

    let generated = 1; // the root counts as generated
    let expanded = 0;
    let maxDepth = 0;
    let peakFrontier = 1;
    let goalNode = -1;
    let reason = 'exhausted';

    const tr = record ? {
      node: [], gen: [], exp: [], maxd: [], front: [], start: [],
      chState: [], chStatus: [], chNode: [], chG: [], chTile: [], chDir: [], chRepl: []
    } : null;

    const newNode = (state, parent, g, depth, tile, dir) => {
      nState.push(state);
      nParent.push(parent);
      nG.push(g);
      nDepth.push(depth);
      nTile.push(tile);
      nDir.push(dir);
      return nState.length - 1;
    };

    while (heap.size > 0) {
      const pri = heap.pop();
      const idx = pri % M;
      const key = nState[idx];

      /* Skip stale heap entries (state already expanded or replaced by a cheaper copy). */
      if (closed.has(key) || live.get(key) !== idx) continue;

      live.delete(key);
      closed.add(key);

      if (record) {
        tr.start.push(tr.chState.length);
        tr.node.push(idx);
      }

      /* Goal test on selection. */
      if (key === goalKey) {
        goalNode = idx;
        if (record) {
          tr.gen.push(generated);
          tr.exp.push(expanded);
          tr.maxd.push(maxDepth);
          tr.front.push(live.size);
        }
        break;
      }

      expanded++;
      for (const nb of P.neighbors(P.decode(key))) {
        generated++;
        const ck = P.encode(nb.state);
        const ng = nG[idx] + stepCost(nb.tile, model);
        let status;
        let created = -1;
        let repl = -1;

        if (closed.has(ck)) {
          status = 2;
        } else if (live.has(ck)) {
          const old = live.get(ck);
          if (ng < nG[old]) {
            created = newNode(ck, idx, ng, nDepth[idx] + 1, nb.tile, nb.dir);
            live.set(ck, created);
            heap.push(ng * M + created);
            status = 1;
            repl = old;
          } else {
            status = 3;
          }
        } else {
          created = newNode(ck, idx, ng, nDepth[idx] + 1, nb.tile, nb.dir);
          live.set(ck, created);
          heap.push(ng * M + created);
          status = 0;
        }

        if (created >= 0 && nDepth[created] > maxDepth) maxDepth = nDepth[created];

        if (record) {
          tr.chState.push(ck);
          tr.chStatus.push(status);
          tr.chNode.push(created);
          tr.chG.push(ng);
          tr.chTile.push(nb.tile);
          tr.chDir.push(nb.dir);
          tr.chRepl.push(repl);
        }
      }
      if (live.size > peakFrontier) peakFrontier = live.size;

      if (record) {
        tr.gen.push(generated);
        tr.exp.push(expanded);
        tr.maxd.push(maxDepth);
        tr.front.push(live.size);
      }

      if (nState.length > maxNodes) {
        reason = 'limit';
        break;
      }
    }

    if (record) tr.start.push(tr.chState.length); // sentinel

    const found = goalNode >= 0;
    let path = [];
    let moves = [];
    let cost = 0;
    if (found) {
      for (let cur = goalNode; cur !== -1; cur = nParent[cur]) {
        path.push(nState[cur]);
        if (nParent[cur] !== -1) moves.push({ tile: nTile[cur], dir: nDir[cur] });
      }
      path = path.reverse().map(P.decode);
      moves = moves.reverse();
      cost = nG[goalNode];
      reason = 'goal';
    }

    const memBytes = nState.length * 48 + peakFrontier * 16 + closed.size * 16;

    return {
      algorithm: 'Uniform Cost Search',
      costModel: model,
      initial: initial.slice(),
      goal: goal.slice(),
      found,
      reason,
      path,
      moves,
      cost,
      stats: {
        generated,
        expanded,
        maxDepth,
        peakFrontier,
        nodesStored: nState.length,
        closedSize: closed.size,
        timeMs: now() - t0,
        memoryBytes: memBytes,
        memoryLabel: memoryLabel(memBytes)
      },
      nodes: { state: nState, parent: nParent, g: nG, depth: nDepth, tile: nTile, dir: nDir },
      trace: tr
    };
  }

  /*
   * Measured run: first without any recording (honest execution time and memory),
   * then, if requested, once more with the full trace for the visualizer.
   */
  function run(initial, goal, opts = {}) {
    const timed = solve(initial, goal, { costModel: opts.costModel, record: false, maxNodes: opts.maxNodes });
    if (opts.record === false) return timed;
    const traced = solve(initial, goal, { costModel: opts.costModel, record: true, maxNodes: opts.maxNodes });
    traced.stats.timeMs = timed.stats.timeMs;
    return traced;
  }

  /*
   * Exact cost-to-goal for every reachable state: Uniform Cost Search run backwards
   * from the goal until the frontier is empty. The game uses this to tell right
   * moves from wrong moves. Moves are reversible with the same cost, so the graph is symmetric.
   */
  function distanceMap(goal, model) {
    const M = 1000000000;
    const gk = P.encode(goal);
    const dist = new Map([[gk, 0]]);
    const heap = new NumHeap();
    heap.push(0 * M + gk);
    while (heap.size > 0) {
      const pri = heap.pop();
      const key = pri % M;
      const d = (pri - key) / M;
      if (dist.get(key) < d) continue;
      for (const nb of P.neighbors(P.decode(key))) {
        const ck = P.encode(nb.state);
        const nd = d + stepCost(nb.tile, model);
        const cur = dist.get(ck);
        if (cur === undefined || nd < cur) {
          dist.set(ck, nd);
          heap.push(nd * M + ck);
        }
      }
    }
    return dist;
  }

  /*
   * Replay: walks the recorded trace forwards or backwards one expansion at a time
   * and keeps the live frontier, so the visualizer can show Open / Closed lists.
   */
  class Replay {
    constructor(result) {
      this.r = result;
      this.pos = 0;
      this.frontier = new Set([0]);
    }

    total() {
      return this.r.trace.node.length;
    }

    forward() {
      if (this.pos >= this.total()) return false;
      const t = this.r.trace;
      const k = this.pos;
      this.frontier.delete(t.node[k]);
      for (let c = t.start[k]; c < t.start[k + 1]; c++) {
        const st = t.chStatus[c];
        if (st === 0 || st === 1) {
          if (st === 1) this.frontier.delete(t.chRepl[c]);
          this.frontier.add(t.chNode[c]);
        }
      }
      this.pos++;
      return true;
    }

    backward() {
      if (this.pos <= 0) return false;
      const t = this.r.trace;
      const k = this.pos - 1;
      for (let c = t.start[k]; c < t.start[k + 1]; c++) {
        const st = t.chStatus[c];
        if (st === 0 || st === 1) {
          this.frontier.delete(t.chNode[c]);
          if (st === 1) this.frontier.add(t.chRepl[c]);
        }
      }
      this.frontier.add(t.node[k]);
      this.pos--;
      return true;
    }

    seek(n) {
      n = Math.max(0, Math.min(this.total(), n));
      while (this.pos < n) this.forward();
      while (this.pos > n) this.backward();
    }

    /* The n cheapest nodes in the live frontier, ordered by (g, creation order). */
    topFrontier(n) {
      const g = this.r.nodes.g;
      const best = [];
      const before = (a, b) => g[a] < g[b] || (g[a] === g[b] && a < b);
      this.frontier.forEach(idx => {
        if (best.length === n && !before(idx, best[n - 1])) return;
        let i = best.length;
        best.push(idx);
        while (i > 0 && before(idx, best[i - 1])) {
          best[i] = best[i - 1];
          i--;
        }
        best[i] = idx;
        if (best.length > n) best.pop();
      });
      return best;
    }

    /* Everything the visualizer needs about the most recent expansion (null before step 1). */
    current() {
      if (this.pos === 0) return null;
      const t = this.r.trace;
      const n = this.r.nodes;
      const k = this.pos - 1;
      const idx = t.node[k];
      const children = [];
      for (let c = t.start[k]; c < t.start[k + 1]; c++) {
        children.push({
          state: P.decode(t.chState[c]),
          status: t.chStatus[c],
          node: t.chNode[c],
          g: t.chG[c],
          tile: t.chTile[c],
          dir: t.chDir[c]
        });
      }
      const parent = n.parent[idx];
      return {
        step: this.pos,
        node: idx,
        state: P.decode(n.state[idx]),
        g: n.g[idx],
        depth: n.depth[idx],
        tile: n.tile[idx],
        dir: n.dir[idx],
        parent,
        parentState: parent >= 0 ? P.decode(n.state[parent]) : null,
        parentG: parent >= 0 ? n.g[parent] : null,
        isGoal: n.state[idx] === P.encode(this.r.goal),
        children,
        generated: t.gen[k],
        expanded: t.exp[k],
        maxDepth: t.maxd[k],
        frontierSize: this.frontier.size
      };
    }
  }

  global.Ucs = { solve, run, distanceMap, Replay, NumHeap, stepCost };
})(typeof window !== 'undefined' ? window : globalThis);
