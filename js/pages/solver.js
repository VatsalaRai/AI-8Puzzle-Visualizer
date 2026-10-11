/*
 * solver.js - Solver page.
 * Runs Uniform Cost Search once (recording every step), then replays the recording so the
 * search can be played, paused, resumed, stepped forwards and backwards, scrubbed and sped up.
 */
(() => {
  'use strict';
  const { $, fmtInt, fmtMs, fmtBytes, DIR_WORD } = UI;
  const P = Puzzle;

  UI.init('solver');

  const saved = Store.get();
  const goal = saved.goal.slice();
  const initial = saved.initial.slice();
  let model = saved.costModel === 'tile' ? 'tile' : 'uniform';

  /* Speed 1..10 -> delay between ticks and number of search steps per tick. */
  const SPEEDS = [
    null,
    { ms: 1200, batch: 1 }, { ms: 900, batch: 1 }, { ms: 650, batch: 1 }, { ms: 450, batch: 1 }, { ms: 300, batch: 1 },
    { ms: 200, batch: 1 }, { ms: 120, batch: 1 }, { ms: 60, batch: 1 }, { ms: 30, batch: 3 }, { ms: 16, batch: 12 }
  ];

  const board = new PixelBoard($('sv-board'), { duration: 0.16 });
  const initBoard = new PixelBoard($('sv-init'), { gap: 6, pad: 6 });
  const goalBoard = new PixelBoard($('sv-goal'), { gap: 6, pad: 6 });
  $('sv-init').style.maxWidth = '190px';
  $('sv-goal').style.maxWidth = '190px';

  let result = null;
  let replay = null;
  let total = 0;
  let timer = null;
  let pathTimer = null;
  let solutionBuilt = false;

  /* ---------- Helpers ---------- */
  const slideWord = dir => DIR_WORD[P.opposite(dir)];
  const stateOf = idx => P.decode(result.nodes.state[idx]);

  function log(text, kind) {
    const ul = $('sv-log');
    const li = document.createElement('li');
    li.className = kind || '';
    li.textContent = text;
    ul.insertBefore(li, ul.firstChild);
    while (ul.children.length > 60) ul.removeChild(ul.lastChild);
  }

  const isRunning = () => timer !== null;
  const atEnd = () => replay && replay.pos >= total;

  function stopRun() {
    if (timer) clearTimeout(timer);
    timer = null;
    if (pathTimer) clearInterval(pathTimer);
    pathTimer = null;
    updateButtons();
  }

  function updateButtons() {
    const ready = !!replay;
    const running = isRunning();
    $('btn-run').disabled = !ready || running;
    $('btn-pause').disabled = !ready || !running;
    $('btn-resume').disabled = !ready || running || atEnd() || replay.pos === 0;
    $('btn-step').disabled = !ready || running || atEnd();
    $('btn-back').disabled = !ready || running || replay.pos === 0;
    $('btn-end').disabled = !ready || running || atEnd();
    $('btn-reset').disabled = !ready;
    $('rng-scrub').disabled = !ready;
  }

  /* ---------- Summary ---------- */
  function clearSummary() {
    ['sm-status', 'sm-moves', 'sm-cost', 'sm-depth', 'sm-total-gen', 'sm-total-exp', 'sm-time', 'sm-mem', 'sm-memlabel', 'sm-peak']
      .forEach(id => { $(id).textContent = '-'; });
  }

  function fillSummary() {
    const s = result.stats;
    $('sm-status').textContent = result.found ? 'FOUND' : 'NOT FOUND';
    $('sm-moves').textContent = result.found ? result.moves.length : '-';
    $('sm-cost').textContent = result.found ? result.cost : '-';
    $('sm-depth').textContent = s.maxDepth;
    $('sm-total-gen').textContent = fmtInt(s.generated);
    $('sm-total-exp').textContent = fmtInt(s.expanded);
    $('sm-time').textContent = fmtMs(s.timeMs);
    $('sm-mem').textContent = fmtBytes(s.memoryBytes);
    $('sm-memlabel').textContent = s.memoryLabel.toUpperCase();
    $('sm-peak').textContent = fmtInt(s.peakFrontier);
  }

  /* ---------- Rendering one step ---------- */
  const STATUS = {
    0: ['ADDED TO OPEN', 'chip-lime'],
    1: ['CHEAPER COPY REPLACED', ''],
    2: ['SKIPPED: IN CLOSED', 'chip-ink'],
    3: ['SKIPPED: WORSE THAN OPEN', 'chip-ink']
  };

  function renderCurrent(cur) {
    if (!cur) {
      $('cur-info').innerHTML = 'Press RUN or NEXT STEP to begin. The first node is the initial state with path cost 0.';
      return;
    }
    const reached = cur.parent >= 0
      ? `Tile ${cur.tile} slid ${slideWord(cur.dir)} (move cost ${Ucs.stepCost(cur.tile, model)})`
      : 'Initial state (root)';
    const parentBlock = cur.parentState
      ? `<div class="mt-3"><div class="label mb-1">Parent node #${cur.parent}, g = ${cur.parentG}</div>${miniBoard(cur.parentState, { goal })}</div>`
      : '<div class="mt-3 muted">Parent node: none (this is the root)</div>';
    $('cur-info').innerHTML =
      `<div class="flex flex-wrap gap-4 items-start">${miniBoard(cur.state, { goal, large: true })}` +
      '<div class="min-w-[150px] flex-1">' +
      `<div><span class="muted">Node</span> <strong>#${cur.node}</strong></div>` +
      `<div><span class="muted">Path cost g(n)</span> <strong class="text-sun">${cur.g}</strong></div>` +
      `<div><span class="muted">Depth</span> <strong>${cur.depth}</strong></div>` +
      '<div><span class="muted">h(n)</span> <strong>0</strong> <span class="muted">f(n)</span> <strong>' + cur.g + '</strong></div>' +
      `<div class="mt-2"><span class="muted">Reached by</span> ${reached}</div>` +
      `<div class="mt-2"><span class="muted">Goal test</span> <strong class="${cur.isGoal ? 'text-lime' : ''}">${cur.isGoal ? 'PASSED, GOAL FOUND' : 'not the goal, expand it'}</strong></div>` +
      `</div></div>${parentBlock}`;
  }

  function renderSuccessors(cur) {
    const ul = $('succ-list');
    if (!cur) { ul.innerHTML = '<li class="muted">Nothing expanded yet.</li>'; return; }
    if (cur.isGoal) {
      ul.innerHTML = '<li class="muted">The goal node was selected, so the search stops without expanding it.</li>';
      return;
    }
    ul.innerHTML = cur.children.map(ch => {
      const [label, cls] = STATUS[ch.status];
      return `<li>${miniBoard(ch.state, { goal, hi: ch.tile })}<span class="flex-1">` +
        `<span class="block">Tile ${ch.tile} ${slideWord(ch.dir)}</span>` +
        `<span class="block muted">g = ${ch.g}${ch.node >= 0 ? ', node #' + ch.node : ''}</span>` +
        `<span class="chip ${cls}">${label}</span></span></li>`;
    }).join('');
  }

  function renderOpen() {
    const top = replay.topFrontier(10);
    $('open-count').textContent = fmtInt(replay.frontier.size);
    $('open-shown').textContent = top.length;
    $('open-list').innerHTML = top.map((idx, i) =>
      `<li><span class="chip ${i === 0 ? 'chip-lime' : 'chip-lav'}">${i === 0 ? 'NEXT' : i + 1}</span>` +
      `${miniBoard(stateOf(idx), { goal })}<span>g = ${result.nodes.g[idx]}<br><span class="muted">depth ${result.nodes.depth[idx]}</span></span></li>`
    ).join('') || '<li class="muted">The open list is empty.</li>';
  }

  function renderClosed() {
    const t = result.trace;
    const rows = [];
    for (let k = replay.pos - 1; k >= Math.max(0, replay.pos - 10); k--) {
      const idx = t.node[k];
      rows.push(`<li><span class="chip chip-ink">${k + 1}</span>${miniBoard(stateOf(idx), { goal })}` +
        `<span>g = ${result.nodes.g[idx]}<br><span class="muted">node #${idx}</span></span></li>`);
    }
    $('closed-count').textContent = fmtInt(replay.pos);
    $('closed-list').innerHTML = rows.join('') || '<li class="muted">Nothing expanded yet.</li>';
  }

  function renderStats(cur) {
    $('lv-expanded').textContent = fmtInt(cur ? cur.expanded : 0);
    $('lv-generated').textContent = fmtInt(cur ? cur.generated : 1);
    $('lv-open').textContent = fmtInt(replay.frontier.size);
    $('lv-closed').textContent = fmtInt(replay.pos);
    $('lv-curdepth').textContent = cur ? cur.depth : 0;
    $('lv-depth').textContent = cur ? cur.maxDepth : 0;
    $('lv-g').textContent = cur ? cur.g : 0;
  }

  /* Draws everything for the current position. "dur" is the tile slide time in seconds. */
  function render(dur) {
    const cur = replay.current();
    const state = cur ? cur.state : initial;
    if (dur > 0) board.moveTo(state, { duration: dur }); else board.setState(state, goal);
    renderStats(cur);
    renderCurrent(cur);
    renderSuccessors(cur);
    renderOpen();
    renderClosed();
    $('rng-scrub').value = replay.pos;
    $('scrub-val').textContent = replay.pos;
    updateButtons();
    return cur;
  }

  function logStep(cur) {
    if (!cur) return;
    if (cur.isGoal) {
      log(`Step ${cur.step}: node #${cur.node} selected and it is the GOAL. Path cost ${cur.g}. Search stops.`, 'ok');
      return;
    }
    const n = [0, 0, 0, 0];
    cur.children.forEach(c => { n[c.status]++; });
    log(`Step ${cur.step}: expanded node #${cur.node} (g = ${cur.g}). Added ${n[0]}, replaced ${n[1]}, skipped ${n[2] + n[3]}.`);
  }

  /* ---------- Finish ---------- */
  function buildSolution() {
    if (solutionBuilt) return;
    solutionBuilt = true;
    const moves = result.moves;
    $('sol-text').textContent =
      `Uniform Cost Search found a cheapest path with total cost ${result.cost} in ${moves.length} moves, after expanding ` +
      `${fmtInt(result.stats.expanded)} nodes and generating ${fmtInt(result.stats.generated)}.`;
    $('sv-path').innerHTML = result.path.map((s, i) =>
      `<div class="flex-none"><div class="label mb-1">${i === 0 ? 'STEP 0 START' : 'STEP ' + i}</div>${miniBoard(s, { goal, large: true })}</div>`
    ).join('');
    $('sv-steps').innerHTML = moves.map((m, i) =>
      `<li><span class="chip chip-lav">${i + 1}</span><span>Slide tile <strong class="text-sun">${m.tile}</strong> ${slideWord(m.dir)}` +
      ` (blank moves ${DIR_WORD[m.dir]}, cost ${Ucs.stepCost(m.tile, model)})</span></li>`).join('');
  }

  function hideSolution() {
    $('sv-solution').classList.add('hidden');
  }

  function onFinish(celebrate) {
    fillSummary();
    if (!result.found) {
      log('The search ended without reaching the goal (node limit reached).', 'bad');
      return;
    }
    buildSolution();
    $('sv-solution').classList.remove('hidden');
    $('sv-banner').textContent = `GOAL REACHED: COST ${result.cost} IN ${result.moves.length} MOVES`;
    if (celebrate) {
      Sound.found();
      UI.confetti(false);
      if (window.gsap && !Decor.reduceMotion) {
        gsap.from('#sv-solution .win, #sv-banner', { opacity: 0, y: 20, duration: 0.45, stagger: 0.1, ease: 'steps(5)', clearProps: 'all' });
      }
    }
  }

  /* ---------- Playback ---------- */
  function tick() {
    const { ms, batch } = SPEEDS[Number($('rng-speed').value)];
    let cur = null;
    for (let i = 0; i < batch; i++) {
      if (!replay.forward()) break;
    }
    cur = render(ms <= 60 ? 0 : Math.min(0.16, ms / 1000 * 0.6));
    logStep(cur);
    Sound.tick();
    if (atEnd()) {
      timer = null;
      updateButtons();
      onFinish(true);
      return;
    }
    timer = setTimeout(tick, ms);
  }

  function startRun() {
    if (isRunning() || !replay) return;
    timer = setTimeout(tick, 0);
    updateButtons();
  }

  $('btn-run').addEventListener('click', () => {
    stopRun();
    Sound.click();
    replay.seek(0);
    $('sv-log').innerHTML = '';
    hideSolution();
    clearSummary();
    render(0);
    log('Run started from the initial state.', 'info');
    startRun();
  });

  $('btn-pause').addEventListener('click', () => {
    Sound.click();
    stopRun();
    log(`Paused after step ${replay.pos}.`, 'info');
  });

  $('btn-resume').addEventListener('click', () => {
    Sound.click();
    log(`Resumed from step ${replay.pos}.`, 'info');
    startRun();
  });

  $('btn-step').addEventListener('click', () => {
    if (!replay || atEnd()) return;
    stopRun();
    Sound.tick();
    replay.forward();
    const cur = render(0.16);
    logStep(cur);
    if (atEnd()) onFinish(true);
  });

  $('btn-back').addEventListener('click', () => {
    if (!replay || replay.pos === 0) return;
    stopRun();
    Sound.undo();
    replay.backward();
    render(0.16);
    log(`Went back to step ${replay.pos}.`, 'info');
    hideSolution();
    clearSummary();
  });

  $('btn-end').addEventListener('click', () => {
    if (!replay || atEnd()) return;
    stopRun();
    Sound.click();
    replay.seek(total);
    render(0.2);
    log(`Jumped to the end (step ${total}).`, 'info');
    onFinish(true);
  });

  $('btn-reset').addEventListener('click', () => {
    if (!replay) return;
    stopRun();
    Sound.click();
    replay.seek(0);
    $('sv-log').innerHTML = '';
    hideSolution();
    clearSummary();
    render(0.2);
    log('Search reset to the initial state.', 'info');
  });

  $('rng-speed').addEventListener('input', () => {
    $('speed-val').textContent = $('rng-speed').value;
    Store.update({ speed: Number($('rng-speed').value) });
  });

  $('rng-scrub').addEventListener('input', () => {
    if (!replay) return;
    stopRun();
    replay.seek(Number($('rng-scrub').value));
    render(0);
    if (atEnd()) onFinish(false); else { hideSolution(); clearSummary(); }
  });

  /* Animate the final solution path on the main board. */
  $('btn-play-path').addEventListener('click', () => {
    if (!result || !result.found) return;
    stopRun();
    Sound.click();
    $('sv-board').scrollIntoView({ behavior: Decor.reduceMotion ? 'auto' : 'smooth', block: 'center' });
    let i = 0;
    const last = result.path.length - 1;
    board.setState(result.path[0], goal);
    log('Animating the solution path on the board.', 'info');
    pathTimer = setInterval(() => {
      if (i >= last) { clearInterval(pathTimer); pathTimer = null; Sound.lock(); return; }
      i++;
      Sound.move();
      board.moveTo(result.path[i], { duration: 0.35 });
    }, 800);
  });

  $('sel-cost').addEventListener('change', () => {
    model = $('sel-cost').value;
    Store.update({ costModel: model });
    Sound.click();
    load();
  });

  /* ---------- Load / solve ---------- */
  function showNoSolution(text) {
    $('sv-error-text').textContent = text;
    $('sv-error').classList.remove('hidden');
  }

  function load() {
    stopRun();
    solutionBuilt = false;
    hideSolution();
    clearSummary();
    $('sv-log').innerHTML = '';
    $('sv-error').classList.add('hidden');
    $('sel-cost').value = model;
    initBoard.setState(initial, goal);
    goalBoard.setState(goal, goal);

    if (!P.isSolvable(initial, goal)) {
      /* Exhaust the whole reachable space without recording a trace. */
      result = Ucs.run(initial, goal, { costModel: model, record: false });
      replay = null;
      total = 0;
      board.setState(initial, goal);
      showNoSolution(`The initial state cannot reach the goal state (their inversion parities differ). Uniform Cost Search checked all ${fmtInt(result.stats.expanded)} reachable states and found nothing. Open Setup to choose a solvable puzzle.`);
      fillSummary();
      $('rng-scrub').max = 0;
      $('scrub-max').textContent = '0';
      Sound.notFound();
      ['btn-run', 'btn-pause', 'btn-resume', 'btn-step', 'btn-back', 'btn-end', 'btn-reset', 'rng-scrub']
        .forEach(id => { $(id).disabled = true; });
      return;
    }
    if (P.equals(initial, goal)) {
      showNoSolution('The initial state already equals the goal, so the search ends immediately with cost 0.');
    }

    result = Ucs.run(initial, goal, { costModel: model, record: true });
    replay = new Ucs.Replay(result);
    total = replay.total();
    $('rng-scrub').max = total;
    $('scrub-max').textContent = total;
    render(0);
    log(`Ready. Uniform Cost Search will expand ${fmtInt(total)} nodes (${model === 'tile' ? 'tile weighted' : 'uniform'} cost).`, 'info');
    updateButtons();
  }

  $('rng-speed').value = saved.speed || 7;
  $('speed-val').textContent = $('rng-speed').value;
  load();
})();
