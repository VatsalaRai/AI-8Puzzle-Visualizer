/* setup.js - Puzzle input (typed or random), algorithm selection, saved puzzle preview. */
(() => {
  'use strict';
  const $ = UI.$;
  const P = Puzzle;

  UI.init('setup');

  const saved = Store.get();

  /* ---------- Input grids ---------- */
  function buildGrid(id, prefix, name) {
    let html = '';
    for (let i = 0; i < 9; i++) {
      html += '<input class="cell-input" id="' + prefix + i + '" type="text" maxlength="1" inputmode="numeric" ' +
        'autocomplete="off" spellcheck="false" aria-label="' + name + ' row ' + (Math.floor(i / 3) + 1) + ' column ' + (i % 3 + 1) + '">';
    }
    $(id).innerHTML = html;
  }
  buildGrid('grid-init', 'i', 'Initial state');
  buildGrid('grid-goal', 'g', 'Goal state');

  function cells(prefix) {
    const a = [];
    for (let i = 0; i < 9; i++) a.push($(prefix + i));
    return a;
  }
  function setGrid(prefix, state) {
    cells(prefix).forEach((el, i) => { el.value = state[i] === 0 ? '_' : String(state[i]); });
  }
  function readGrid(prefix) {
    return cells(prefix).map(el => { return P.parseCell(el.value); });
  }

  /* ---------- Validation ---------- */
  function check(arr, prefix, name, msgs) {
    const bad = {};
    const seen = {};
    let nan = false;
    arr.forEach((v, i) => {
      if (Number.isNaN(v)) { bad[i] = true; nan = true; return; }
      if (seen[v] !== undefined) { bad[i] = true; bad[seen[v]] = true; } else { seen[v] = i; }
    });
    cells(prefix).forEach((el, i) => { el.classList.toggle('bad', !!bad[i]); });
    const ok = Object.keys(bad).length === 0 && P.isValid(arr);
    if (ok) {
      msgs.push({ k: 'ok', t: name + ': valid (tiles 1 to 8 once each, one blank).' });
    } else if (nan) {
      msgs.push({ k: 'bad', t: name + ': use only digits 1 to 8, and _ for the blank.' });
    } else {
      msgs.push({ k: 'bad', t: name + ': every tile 1 to 8 must appear once, with exactly one blank square.' });
    }
    return ok;
  }

  function analyze() {
    let init = readGrid('i');
    let goal = readGrid('g');
    const msgs = [];
    const okInit = check(init, 'i', 'Initial state', msgs);
    const okGoal = check(goal, 'g', 'Goal state', msgs);
    let solvable = false;
    if (okInit && okGoal) {
      solvable = P.isSolvable(init, goal);
      msgs.push(solvable
        ? { k: 'ok', t: 'Solvable: the goal can be reached from the initial state.' }
        : { k: 'bad', t: 'Unsolvable: the inversion parity of the two states differs. UCS would search all 181,440 reachable states and report Not Found, and the game cannot be played.' });
    }
    $('val-msg').innerHTML = msgs.map(m => { return '<li class="' + m.k + '">' + m.t + '</li>'; }).join('');
    $('btn-save').disabled = !(okInit && okGoal);
    return { init: init, goal: goal, okInit: okInit, okGoal: okGoal, solvable: solvable };
  }

  function wire(prefix) {
    const arr = cells(prefix);
    arr.forEach((el, i) => {
      el.addEventListener('focus', () => { el.select(); });
      el.addEventListener('input', () => {
        const v = el.value.trim();
        if (v === '_' || v === '0' || v === '-') {
          el.value = '_';
        } else if (v === '') {
          el.value = '';
        } else if (/^[1-8]$/.test(v)) {
          el.value = v;
        } else {
          el.value = '';
          UI.toast('Use digits 1 to 8, or _ for the blank.', 'bad');
        }
        if (el.value !== '') {
          Sound.click();
          if (arr[i + 1]) arr[i + 1].focus();
        }
        analyze();
      });
      el.addEventListener('keydown', e => {
        let to = null;
        if (e.key === 'ArrowRight') to = i + 1;
        else if (e.key === 'ArrowLeft') to = i - 1;
        else if (e.key === 'ArrowUp') to = i - 3;
        else if (e.key === 'ArrowDown') to = i + 3;
        else if (e.key === 'Backspace' && el.value === '') to = i - 1;
        if (to !== null && arr[to]) { e.preventDefault(); arr[to].focus(); }
      });
    });
  }
  wire('i');
  wire('g');

  /* ---------- Saved puzzle preview ---------- */
  const prevInit = new PixelBoard($('prev-init'), { gap: 6, pad: 6 });
  const prevGoal = new PixelBoard($('prev-goal'), { gap: 6, pad: 6 });

  function refreshPreview() {
    const s = Store.get();
    prevInit.setState(s.initial, s.goal);
    prevGoal.setState(s.goal);
    let solvable = P.isSolvable(s.initial, s.goal);
    const chip = $('chip-solv');
    chip.textContent = solvable ? 'SOLVABLE' : 'UNSOLVABLE';
    chip.className = 'chip ' + (solvable ? 'chip-lime' : 'chip-pink');
    $('chip-cost').textContent = s.costModel === 'tile' ? 'TILE WEIGHTED COST' : 'UNIFORM COST';
    $('prev-note').textContent = solvable
      ? 'Saved. Yellow squares on the initial board mark tiles that already sit on their goal square.'
      : 'These two states cannot reach each other. The solver will report Not Found and the game will refuse to start.';
  }

  function applyAndSave(init, goal, message) {
    setGrid('i', init);
    setGrid('g', goal);
    Store.update({ initial: init, goal: goal });
    analyze();
    refreshPreview();
    Sound.click();
    UI.toast(message, 'ok');
    if (window.anime && !Decor.reduceMotion) {
      anime({ targets: '.cell-input', scale: [0.75, 1], delay: anime.stagger(28), duration: 260, easing: 'steps(4)' });
    }
  }

  $('btn-save').addEventListener('click', () => {
    const a = analyze();
    if (!(a.okInit && a.okGoal)) {
      UI.toast('Fix the highlighted squares first.', 'bad');
      Sound.blocked();
      return;
    }
    Store.update({ initial: a.init, goal: a.goal });
    refreshPreview();
    Sound.click();
    UI.toast(a.solvable ? 'Puzzle saved.' : 'Saved, but this pair is unsolvable.', a.solvable ? 'ok' : 'bad');
  });

  $('btn-example').addEventListener('click', () => {
    applyAndSave(P.EXAMPLE_INITIAL.slice(), P.GOAL_ASSIGNMENT.slice(), 'Assignment example loaded and saved.');
  });

  $('btn-classic').addEventListener('click', () => {
    let init = readGrid('i');
    let goal = P.GOAL_CLASSIC.slice();
    if (!P.isValid(init)) init = P.randomPuzzle(goal, 14);
    applyAndSave(init, goal, 'Classic goal set and saved.');
  });

  /* ---------- Random puzzle (Method 2) ---------- */
  $('sel-diff').value = saved.difficulty || 'medium';
  $('sel-diff').addEventListener('change', () => { Store.update({ difficulty: $('sel-diff').value }); });

  $('btn-random').addEventListener('click', () => {
    const diff = $('sel-diff').value;
    const opt = $('sel-goal').value;
    let goal;
    if (opt === 'classic') goal = P.GOAL_CLASSIC.slice();
    else if (opt === 'assignment') goal = P.GOAL_ASSIGNMENT.slice();
    else {
      const g = readGrid('g');
      goal = P.isValid(g) ? g : P.GOAL_CLASSIC.slice();
    }
    let init = P.randomPuzzle(goal, P.DIFFICULTY[diff]);
    Store.update({ difficulty: diff });
    applyAndSave(init, goal, 'Random ' + diff + ' puzzle generated and saved.');
  });

  /* ---------- Algorithm selection ---------- */
  $('algo-list').addEventListener('click', e => {
    const btn = e.target.closest('.algo-card');
    if (!btn) return;
    if (btn.classList.contains('locked')) {
      Sound.blocked();
      UI.toast('This project implements only Uniform Cost Search (Algorithm 5).', 'info');
    } else {
      Sound.click();
      UI.toast('Uniform Cost Search is selected.', 'ok');
    }
  });

  function paintCost() {
    const m = Store.get().costModel;
    document.querySelectorAll('input[name="cost"]').forEach(r => {
      r.checked = r.value === m;
      r.closest('label').classList.toggle('checked', r.checked);
    });
  }
  document.querySelectorAll('input[name="cost"]').forEach(r => {
    r.addEventListener('change', () => {
      Store.update({ costModel: r.value });
      paintCost();
      refreshPreview();
      Sound.click();
    });
  });

  /* ---------- Start ---------- */
  setGrid('i', saved.initial);
  setGrid('g', saved.goal);
  analyze();
  paintCost();
  refreshPreview();
})();
