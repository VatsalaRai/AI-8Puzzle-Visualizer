/*
 * compare.js - Comparison page.
 * Only Uniform Cost Search is implemented in this project, so the table has live rows for UCS
 * (both cost models) and clearly marked placeholders for the algorithms assigned to others.
 */
(() => {
  'use strict';
  const { $, fmtInt, fmtMs } = UI;
  const P = Puzzle;

  UI.init('compare');

  let saved = Store.get();

  const OTHERS_BEFORE = ['BFS', 'DFS', 'DLS', 'IDDLS'];
  const OTHERS_AFTER = ['GBFS', 'A*'];

  const THEORY = [
    ['BFS', 'Yes', 'Yes, if all step costs are equal', 'O(b^d)', 'O(b^d)'],
    ['DFS', 'No on infinite or cyclic trees', 'No', 'O(b^m)', 'O(b m)'],
    ['DLS', 'No, if the goal is deeper than l', 'No', 'O(b^l)', 'O(b l)'],
    ['IDDLS', 'Yes', 'Yes, if all step costs are equal', 'O(b^d)', 'O(b d)'],
    ['UCS (this project)', 'Yes, if every step cost is above 0', 'Yes', 'O(b^(1 + floor(C* / e)))', 'O(b^(1 + floor(C* / e)))'],
    ['GBFS', 'No on infinite or cyclic trees', 'No', 'O(b^m) worst case', 'O(b^m) worst case'],
    ['A*', 'Yes', 'Yes, with an admissible heuristic', 'O(b^d) worst case', 'O(b^d) worst case']
  ];

  const MODEL_NAME = { uniform: 'UCS (uniform cost, every move = 1)', tile: 'UCS (tile weighted, tile k costs k)' };

  function measure(model) {
    const r = Ucs.run(saved.initial, saved.goal, { costModel: model, record: false });
    return r;
  }

  /* ---------- Puzzle header ---------- */
  function renderPuzzle() {
    $('cmp-init').innerHTML = miniBoard(saved.initial, { goal: saved.goal, large: true });
    $('cmp-goal').innerHTML = miniBoard(saved.goal, { goal: saved.goal, large: true });
    const solvable = P.isSolvable(saved.initial, saved.goal);
    $('cmp-note').textContent = solvable
      ? 'Both UCS configurations below solve this saved puzzle. Change it on the Setup page, or generate a random one here.'
      : 'This saved puzzle is unsolvable, so UCS exhausts the whole reachable space and reports Not Found.';
  }

  /* ---------- Comparison table ---------- */
  const otherRow = name =>
    `<tr><th scope="row" class="text-left font-px text-[9px] p-[10px] border-2 border-[#3A32B8]">${name}</th>` +
    '<td colspan="6" class="muted">Not implemented here. Assigned to another student.</td></tr>';

  function ucsRow(label, r) {
    const found = r.found;
    return `<tr class="is-mine"><th scope="row" class="text-left font-px text-[9px] p-[10px] border-2 border-[#3A32B8] text-sun">${label}</th>` +
      `<td><span class="chip ${found ? 'chip-lime' : 'chip-pink'}">${found ? 'YES' : 'NO'}</span></td>` +
      `<td class="num">${fmtInt(r.stats.expanded)}</td>` +
      `<td class="num">${found ? r.moves.length : '-'}</td>` +
      `<td class="num">${found ? r.cost : '-'}</td>` +
      `<td class="num">${fmtMs(r.stats.timeMs)}</td>` +
      `<td class="num">${r.stats.memoryLabel.toUpperCase()}</td></tr>`;
  }

  function renderTable() {
    const u = measure('uniform');
    const t = measure('tile');
    $('cmp-body').innerHTML =
      OTHERS_BEFORE.map(otherRow).join('') +
      ucsRow(MODEL_NAME.uniform, u) +
      ucsRow(MODEL_NAME.tile, t) +
      OTHERS_AFTER.map(otherRow).join('');
    renderCharts(u, t);
  }

  /* ---------- Bars ---------- */
  function barRow(label, value, max, text, cls) {
    const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 2;
    return `<div><div class="flex justify-between gap-3 text-[12px] mb-1"><span>${label}</span><strong class="text-sun">${text}</strong></div>` +
      `<div class="bar ${cls || ''}"><i data-w="${pct}"></i></div></div>`;
  }

  function growBars(root) {
    const bars = root.querySelectorAll('.bar > i');
    if (window.anime && !Decor.reduceMotion) {
      bars.forEach(b => { b.style.width = '0%'; });
      anime({ targets: Array.from(bars), width: el => el.getAttribute('data-w') + '%', delay: anime.stagger(120), duration: 700, easing: 'steps(10)' });
    } else {
      bars.forEach(b => { b.style.width = b.getAttribute('data-w') + '%'; });
    }
  }

  function renderCharts(u, t) {
    const maxN = Math.max(u.stats.expanded, t.stats.expanded);
    $('chart-nodes').innerHTML =
      barRow('UCS uniform cost', u.stats.expanded, maxN, fmtInt(u.stats.expanded)) +
      barRow('UCS tile weighted', t.stats.expanded, maxN, fmtInt(t.stats.expanded));
    const maxT = Math.max(u.stats.timeMs, t.stats.timeMs, 0.001);
    $('chart-time').innerHTML =
      barRow('UCS uniform cost', u.stats.timeMs, maxT, fmtMs(u.stats.timeMs)) +
      barRow('UCS tile weighted', t.stats.timeMs, maxT, fmtMs(t.stats.timeMs));
    growBars($('chart-nodes'));
    growBars($('chart-time'));
  }

  /* ---------- Theory table ---------- */
  function renderTheory() {
    $('theory-body').innerHTML = THEORY.map(row => {
      const mine = row[0].indexOf('UCS') === 0;
      return `<tr class="${mine ? 'is-mine' : ''}"><th scope="row" class="text-left font-px text-[9px] p-[10px] border-2 border-[#3A32B8] ${mine ? 'text-sun' : ''}">${row[0]}</th>` +
        row.slice(1).map(c => `<td>${c}</td>`).join('') + '</tr>';
    }).join('');
  }

  /* ---------- Benchmark ---------- */
  const LEVELS = [['easy', 8], ['medium', 16], ['hard', 26]];
  const PER_LEVEL = 5;
  let benchRunning = false;

  function runBenchmark() {
    if (benchRunning) return;
    benchRunning = true;
    $('btn-bench').disabled = true;
    const goal = saved.goal;
    const rows = [];
    const jobs = [];
    LEVELS.forEach(([name, steps], li) => {
      ['uniform', 'tile'].forEach(model => jobs.push({ name, steps, model, seedBase: 1000 * (li + 1) }));
    });
    let j = 0;

    function next() {
      if (j >= jobs.length) {
        finishBench(rows);
        return;
      }
      const job = jobs[j];
      $('bench-status').textContent = `Running ${job.name} (${job.model}), ${j + 1} of ${jobs.length}`;
      let moves = 0, cost = 0, exp = 0, time = 0;
      for (let k = 0; k < PER_LEVEL; k++) {
        const rng = P.mulberry32(job.seedBase + k);
        const init = P.randomPuzzle(goal, job.steps, rng);
        const r = Ucs.run(init, goal, { costModel: job.model, record: false });
        moves += r.moves.length;
        cost += r.cost;
        exp += r.stats.expanded;
        time += r.stats.timeMs;
      }
      rows.push({ name: job.name, model: job.model, moves: moves / PER_LEVEL, cost: cost / PER_LEVEL, exp: exp / PER_LEVEL, time: time / PER_LEVEL });
      j++;
      setTimeout(next, 10);
    }
    next();
  }

  function finishBench(rows) {
    $('bench-body').innerHTML = rows.map(r =>
      `<tr><td class="num">${r.name.toUpperCase()}</td><td>${r.model === 'tile' ? 'Tile weighted' : 'Uniform'}</td>` +
      `<td class="num">${r.moves.toFixed(1)}</td><td class="num">${r.cost.toFixed(1)}</td>` +
      `<td class="num">${fmtInt(Math.round(r.exp))}</td><td class="num">${fmtMs(r.time)}</td></tr>`).join('');
    const max = Math.max.apply(null, rows.map(r => r.exp));
    $('bench-bars').innerHTML = '<h3 class="head-px m-0">AVERAGE NODES EXPANDED</h3>' + rows.map(r =>
      barRow(`${r.name.toUpperCase()}, ${r.model === 'tile' ? 'tile weighted' : 'uniform'}`, r.exp, max, fmtInt(Math.round(r.exp)), r.model === 'tile' ? '' : 'bar-lime')
    ).join('');
    growBars($('bench-bars'));
    $('bench-status').textContent = 'Done. Same seeds give the same numbers on every run, apart from timing.';
    $('btn-bench').disabled = false;
    benchRunning = false;
    Sound.lock();
  }

  /* ---------- Game result ---------- */
  function renderGame() {
    const g = saved.lastGame;
    const box = $('game-card');
    if (!g) {
      box.innerHTML = '<p class="mt-0">You have not finished a game yet. <a href="game.html">Play a puzzle</a> and your result will appear here next to the optimal answer from Uniform Cost Search.</p>';
      return;
    }
    const diff = g.cost - g.optimalCost;
    box.innerHTML =
      '<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">' +
      `<div class="stat stat-lime"><div class="stat-k">OPTIMAL MOVES</div><div class="stat-v">${g.optimalMoves}</div></div>` +
      `<div class="stat stat-lime"><div class="stat-k">OPTIMAL COST</div><div class="stat-v">${g.optimalCost}</div></div>` +
      `<div class="stat"><div class="stat-k">YOUR MOVES</div><div class="stat-v">${g.moves}</div></div>` +
      `<div class="stat"><div class="stat-k">YOUR COST</div><div class="stat-v">${g.cost}</div></div>` +
      `<div class="stat stat-lav"><div class="stat-k">RIGHT / WRONG</div><div class="stat-v">${g.right} / ${g.wrong}</div></div>` +
      `<div class="stat stat-lav"><div class="stat-k">HINTS USED</div><div class="stat-v">${g.hints}</div></div>` +
      `<div class="stat stat-lav"><div class="stat-k">TIME</div><div class="stat-v">${UI.fmtClock(g.time)}</div></div>` +
      `<div class="stat"><div class="stat-k">SCORE</div><div class="stat-v">${g.score}</div></div></div>` +
      `<p class="mb-0 mt-4 text-[14px]">${g.won
        ? (diff === 0 ? 'You matched the optimal cost exactly.' : `You solved it, spending ${diff} more than the optimum.`)
        : 'You gave up on that game, so no score was recorded.'}</p>`;
  }

  /* ---------- Buttons ---------- */
  $('btn-bench').addEventListener('click', () => { Sound.click(); runBenchmark(); });

  $('btn-rand').addEventListener('click', () => {
    const diff = saved.difficulty || 'medium';
    const init = P.randomPuzzle(saved.goal, P.DIFFICULTY[diff]);
    Store.update({ initial: init });
    saved = Store.get();
    Sound.click();
    renderPuzzle();
    renderTable();
    UI.toast(`New ${diff} puzzle generated and saved.`, 'ok');
  });

  /* ---------- Start ---------- */
  renderPuzzle();
  renderTable();
  renderTheory();
  renderGame();
})();
