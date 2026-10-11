/*
 * game.js - Play page.
 *
 * How right and wrong moves are decided:
 *   Uniform Cost Search is run backwards from the goal over the whole reachable state space
 *   (Ucs.distanceMap), giving the exact cheapest cost-to-goal of every state. A move is RIGHT
 *   when it lies on a cheapest path: dist(next) + moveCost == dist(current). Otherwise it is WRONG.
 *   The optimal answer itself is only computed and shown at the end (solved, or gave up).
 */
(() => {
  'use strict';
  const $ = UI.$;
  const P = Puzzle;

  UI.init('play');

  const saved = Store.get();
  const goal = saved.goal.slice();
  const model = saved.costModel === 'tile' ? 'tile' : 'uniform';

  function showError(msg) {
    $('g-error-text').textContent = msg;
    $('g-error').classList.remove('hidden');
    $('game-root').style.display = 'none';
  }

  if (!P.isSolvable(saved.initial, goal)) {
    showError('The saved initial state cannot reach the saved goal state, so there is nothing to play. Open Setup and choose a solvable puzzle, or generate a random one.');
    return;
  }
  if (P.equals(saved.initial, goal)) {
    showError('The saved initial state already equals the goal. Open Setup and choose a different starting arrangement, or generate a random puzzle.');
    return;
  }

  /* Exact cost-to-goal for every state (about 181,440 entries). */
  const dist = Ucs.distanceMap(goal, model);

  /* ---------- Messages ---------- */
  const RIGHT_MSGS = [
    'Right move! Tile {t} stays on a cheapest path.',
    'Correct. Uniform Cost Search would pick that move too.',
    'Sharp move! You are still on an optimal route.',
    'Yes! Tile {t} sliding {d} is part of a best answer.'
  ];
  const WRONG_MSGS = [
    'Wrong move. Tile {t} does not bring you closer to the goal.',
    'Wrong. Sliding tile {t} {d} adds extra cost. UCS would never choose it.',
    'Wrong way. A cheapest route does not use that move. Try Undo.',
    'Not that one. That move leaves every cheapest path.'
  ];
  let rIdx = 0;
  let wIdx = 0;
  function fill(tpl, t, d) { return tpl.replace('{t}', t).replace('{d}', d); }

  /* ---------- Game state ---------- */
  let startState = saved.initial.slice();
  let cur = startState.slice();
  let history = [];
  let right = 0, wrong = 0, streak = 0, hints = 0, undos = 0;
  let started = false;
  let ended = false;
  let busy = false;
  let t0 = 0;
  let elapsedEnd = 0;
  let timerId = null;
  let replayTimer = null;

  const board = new PixelBoard($('g-board'), { duration: 0.17, onTile: onTile });
  const target = new PixelBoard($('g-target'), { gap: 6, pad: 6 });
  $('g-target').style.maxWidth = '230px';
  let rvBoard = null;

  function elapsed() {
    if (!started) return 0;
    return ended ? elapsedEnd : (Date.now() - t0) / 1000;
  }
  function score() {
    return Math.max(0, 1000 - 25 * wrong - 50 * hints - 10 * undos - Math.floor(elapsed() / 5));
  }
  function pathCost() {
    let c = 0;
    history.forEach(h => { c += h.cost; });
    return c;
  }

  function log(text, kind) {
    const ul = $('g-log');
    const li = document.createElement('li');
    li.className = kind || '';
    li.textContent = text;
    ul.insertBefore(li, ul.firstChild);
    while (ul.children.length > 40) ul.removeChild(ul.lastChild);
    if (window.gsap && !Decor.reduceMotion) gsap.from(li, { x: -16, opacity: 0, duration: 0.25, ease: 'steps(4)' });
  }

  function hud(pulse) {
    $('st-moves').textContent = history.length;
    $('st-cost').textContent = pathCost();
    $('st-right').textContent = right;
    $('st-wrong').textContent = wrong;
    $('st-streak').textContent = streak;
    $('st-hints').textContent = hints;
    $('st-time').textContent = UI.fmtClock(elapsed());
    $('st-score').textContent = score();
    const total = right + wrong;
    const acc = total ? Math.round((right / total) * 100) : 0;
    $('st-acc').textContent = acc + '%';
    $('acc-bar').style.width = acc + '%';
    $('acc-wrap').setAttribute('aria-valuenow', String(acc));
    if (pulse) UI.pop($(pulse));
  }

  function setButtons() {
    const live = started && !ended;
    $('btn-undo').disabled = !live || history.length === 0;
    $('btn-hint').disabled = !live;
    $('btn-giveup').disabled = !live;
  }

  function startTimer() {
    stopTimer();
    t0 = Date.now();
    timerId = setInterval(() => {
      $('st-time').textContent = UI.fmtClock(elapsed());
      $('st-score').textContent = score();
    }, 500);
  }
  function stopTimer() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  /* ---------- Start / restart ---------- */
  function showOverlay() {
    const ov = $('g-overlay');
    ov.style.display = 'flex';
    ov.innerHTML =
      '<h2 class="title-md">READY?</h2>' +
      '<p class="text-[13px] m-0">Match the board to the target. Cost model: <strong class="text-sun">' +
      (model === 'tile' ? 'TILE WEIGHTED (moving tile k costs k)' : 'UNIFORM (every move costs 1)') + '</strong>.</p>' +
      '<ul class="log w-full"><li class="ok">Right move: it lies on a cheapest path. Bright chime.</li>' +
      '<li class="bad">Wrong move: it leaves every cheapest path. Low buzz.</li>' +
      '<li class="info">The best answer stays hidden until the end.</li></ul>' +
      '<button id="btn-start" class="btn" type="button">START QUEST</button>';
    $('btn-start').addEventListener('click', () => {
      Sound.unlock();
      Sound.click();
      $('g-overlay').style.display = 'none';
      begin(false);
    });
    $('btn-start').focus();
  }

  function hideReveal() {
    $('reveal').classList.add('hidden');
    stopReplay();
  }

  /* Reset the run. "keepStart" restarts the same puzzle, otherwise startState is already updated. */
  function begin() {
    cur = startState.slice();
    history = [];
    right = 0; wrong = 0; streak = 0; hints = 0; undos = 0;
    ended = false;
    busy = false;
    started = true;
    $('g-log').innerHTML = '';
    hideReveal();
    board.setState(cur, goal);
    target.setState(goal, goal);
    startTimer();
    hud();
    setButtons();
    log('Quest started. Make your first move.', 'info');
  }

  /* ---------- Moves ---------- */
  function slideWord(nb) { return UI.DIR_WORD[P.opposite(nb.dir)]; }

  function tryMove(nb) {
    if (!started || ended || busy) return;
    const before = dist.get(P.encode(cur));
    const after = dist.get(P.encode(nb.state));
    const cost = Ucs.stepCost(nb.tile, model);
    const isRight = after + cost === before;

    /* nb.blankTo is the square the tile slides FROM (the blank moves into it). */
    const wasPlaced = goal[nb.blankTo] === nb.tile;

    history.push({ tile: nb.tile, dir: nb.dir, from: cur, to: nb.state, right: isRight, cost: cost });
    if (isRight) { right++; streak++; } else { wrong++; streak = 0; }
    cur = nb.state;
    busy = true;
    Sound.move();

    const n = history.length;
    const word = slideWord(nb);

    board.moveTo(cur).then(() => {
      busy = false;
      const landed = goal[cur.indexOf(nb.tile)] === nb.tile && !wasPlaced;
      if (landed) Sound.lock();

      if (isRight) {
        Sound.right(streak);
        board.flash('right');
        board.pop();
        let msg = fill(RIGHT_MSGS[rIdx++ % RIGHT_MSGS.length], nb.tile, word);
        if (streak >= 3) msg = 'Streak of ' + streak + ' right moves! Tile ' + nb.tile + ' slides ' + word + '.';
        UI.toast(msg, 'ok');
        log('Move ' + n + ': tile ' + nb.tile + ' ' + word + '. RIGHT.', 'ok');
        hud('st-right');
      } else {
        Sound.wrong();
        board.flash('wrong');
        board.shake();
        UI.toast(fill(WRONG_MSGS[wIdx++ % WRONG_MSGS.length], nb.tile, word), 'bad');
        log('Move ' + n + ': tile ' + nb.tile + ' ' + word + '. WRONG.', 'bad');
        hud('st-wrong');
      }
      setButtons();

      if (P.equals(cur, goal)) finish(true);
    });
  }

  function onTile(tile, idx) {
    if (!started || ended || busy) return;
    const blank = cur.indexOf(0);
    if (!P.areAdjacent(idx, blank)) {
      Sound.blocked();
      board.nudge(tile);
      UI.toast('Tile ' + tile + ' is not next to the blank. Only touching tiles can slide.', 'info');
      return;
    }
    const nbs = P.neighbors(cur);
    for (let i = 0; i < nbs.length; i++) {
      if (nbs[i].tile === tile) { tryMove(nbs[i]); return; }
    }
  }

  /* Arrow keys / WASD move the BLANK in that direction. */
  const KEYS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right'
  };
  document.addEventListener('keydown', e => {
    const tag = e.target && e.target.tagName;
    if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
    const dir = KEYS[e.key];
    if (!dir || !started || ended) return;
    e.preventDefault();
    if (busy) return;
    const nbs = P.neighbors(cur);
    for (let i = 0; i < nbs.length; i++) {
      if (nbs[i].dir === dir) { tryMove(nbs[i]); return; }
    }
    Sound.blocked();
    UI.toast('The blank cannot move ' + UI.DIR_WORD[dir] + ' from here.', 'info');
  });

  /* ---------- Buttons ---------- */
  $('btn-undo').addEventListener('click', () => {
    if (!started || ended || busy || history.length === 0) return;
    const h = history.pop();
    if (h.right) right--; else wrong--;
    streak = 0;
    for (let i = history.length - 1; i >= 0 && history[i].right; i--) streak++;
    undos++;
    cur = h.from;
    busy = true;
    Sound.undo();
    board.moveTo(cur).then(() => { busy = false; });
    log('Undo: tile ' + h.tile + ' moved back. Score -10.', 'info');
    hud('st-moves');
    setButtons();
  });

  $('btn-hint').addEventListener('click', () => {
    if (!started || ended || busy) return;
    const before = dist.get(P.encode(cur));
    const nbs = P.neighbors(cur);
    let pick = null;
    for (let i = 0; i < nbs.length; i++) {
      let c = Ucs.stepCost(nbs[i].tile, model);
      if (dist.get(P.encode(nbs[i].state)) + c === before) { pick = nbs[i]; break; }
    }
    if (!pick) return;
    hints++;
    Sound.hint();
    board.hint(pick.tile);
    UI.toast('Hint: slide tile ' + pick.tile + ' ' + slideWord(pick) + '. Score -50.', 'info');
    log('Hint used: tile ' + pick.tile + '. Score -50.', 'info');
    hud('st-hints');
  });

  $('btn-restart').addEventListener('click', () => {
    if (!started) return;
    Sound.click();
    begin();
    UI.toast('Same puzzle, fresh start.', 'info');
  });

  $('btn-giveup').addEventListener('click', () => {
    if (!started || ended) return;
    finish(false);
  });

  function newPuzzle() {
    const diff = $('g-diff').value;
    startState = P.randomPuzzle(goal, P.DIFFICULTY[diff]);
    Store.update({ initial: startState, difficulty: diff });
    Sound.click();
    $('g-overlay').style.display = 'none';
    begin();
    UI.toast('New ' + diff + ' puzzle ready.', 'ok');
  }
  $('btn-new').addEventListener('click', newPuzzle);
  $('g-diff').value = saved.difficulty || 'medium';

  /* ---------- High scores ---------- */
  function renderScores() {
    const list = Store.get().scores;
    const ol = $('hs-list');
    if (!list.length) {
      ol.innerHTML = '<li class="muted">No scores yet. Solve a puzzle to set one.</li>';
      return;
    }
    ol.innerHTML = list.map((s, i) => {
      return '<li><span class="chip chip-pink">' + (i + 1) + '</span><span class="font-silk text-[15px] text-sun w-[56px]">' + s.score +
        '</span><span class="text-[12px]">' + s.moves + ' moves, ' + s.diff + ', ' + s.date + '</span></li>';
    }).join('');
  }

  /* ---------- Ending: win or give up, then reveal the answer ---------- */
  function finish(won) {
    if (ended) return;
    elapsedEnd = (Date.now() - t0) / 1000;
    ended = true;
    stopTimer();
    setButtons();
    hud();

    if (won) {
      Sound.win();
      UI.confetti(true);
      if (window.gsap && !Decor.reduceMotion) gsap.fromTo('#g-board', { scale: 1.04 }, { scale: 1, duration: 0.5, ease: 'steps(5)' });
    } else {
      Sound.lose();
      board.shake();
    }
    setTimeout(() => { revealAnswer(won); }, won ? 900 : 300);
  }

  function gradeFor(ratio) {
    if (ratio >= 0.999) return 'S';
    if (ratio >= 0.75) return 'A';
    if (ratio >= 0.5) return 'B';
    if (ratio >= 0.3) return 'C';
    return 'D';
  }

  function stepRow(i, m, c) {
    return '<li><span class="chip chip-lav">' + i + '</span><span>Slide tile <strong class="text-sun">' + m.tile + '</strong> ' +
      UI.DIR_WORD[P.opposite(m.dir)] + ' (cost ' + c + ')</span></li>';
  }

  function revealAnswer(won) {
    let res = Ucs.run(startState, goal, { costModel: model, record: false });
    const yourCost = pathCost();
    const yourMoves = history.length;
    const finalScore = won ? score() : 0;
    const ratio = won && yourCost > 0 ? res.cost / yourCost : 0;

    $('reveal').classList.remove('hidden');
    const banner = $('rv-banner');
    banner.className = 'banner mb-6 ' + (won ? 'banner-win' : 'banner-lose');
    banner.textContent = won ? 'QUEST COMPLETE! THE PUZZLE IS SOLVED.' : 'YOU GAVE UP. HERE IS THE ANSWER.';

    UI.countTo($('rv-opt-moves'), res.moves.length);
    UI.countTo($('rv-opt-cost'), res.cost);
    UI.countTo($('rv-your-moves'), yourMoves);
    UI.countTo($('rv-your-cost'), yourCost);
    $('rv-rw').textContent = right + ' / ' + wrong;
    $('rv-time').textContent = UI.fmtClock(elapsedEnd);
    $('rv-grade').textContent = won ? gradeFor(ratio) : 'NONE';
    UI.countTo($('rv-score'), finalScore);
    $('rv-hu').textContent = hints + ' / ' + undos;

    let verdict;
    if (!won) {
      verdict = 'The best possible answer takes ' + res.moves.length + ' moves' + (model === 'tile' ? ' with a total cost of ' + res.cost : '') + '. Study the steps below, then try again.';
    } else if (yourCost === res.cost) {
      verdict = 'Perfect! Your solution matches the optimal cost of ' + res.cost + '. Uniform Cost Search could not do better.';
    } else {
      verdict = 'You solved it with cost ' + yourCost + '. The optimal cost is ' + res.cost + ', so you spent ' + (yourCost - res.cost) + ' more than necessary.';
    }
    $('rv-verdict').textContent = verdict;
    $('rv-ucs').textContent = 'Found by Uniform Cost Search: ' + UI.fmtInt(res.stats.expanded) + ' nodes expanded, ' +
      UI.fmtInt(res.stats.generated) + ' generated, in ' + UI.fmtMs(res.stats.timeMs) + '.';

    /* Optimal path as a strip of mini boards */
    $('rv-path').innerHTML = res.path.map((s, i) => {
      return '<div class="flex-none"><div class="label mb-1">' + (i === 0 ? 'START' : 'STEP ' + i) + '</div>' + miniBoard(s, { goal: goal, large: true }) + '</div>';
    }).join('');

    $('rv-steps').innerHTML = res.moves.map((m, i) => {
      return stepRow(i + 1, m, Ucs.stepCost(m.tile, model));
    }).join('');

    /* Player's own moves */
    $('rv-yours').innerHTML = history.length
      ? history.map((h, i) => {
        return '<li><span class="chip ' + (h.right ? 'chip-lime' : 'chip-pink') + '">' + (h.right ? 'RIGHT' : 'WRONG') +
          '</span><span>' + (i + 1) + '. Tile ' + h.tile + ' ' + UI.DIR_WORD[P.opposite(h.dir)] + '</span></li>';
      }).join('')
      : '<li class="muted">You made no moves.</li>';

    if (won) {
      Store.addScore({ score: finalScore, moves: yourMoves, diff: $('g-diff').value, date: new Date().toLocaleDateString('en-GB') });
      renderScores();
    }
    Store.update({
      lastGame: { won: won, moves: yourMoves, cost: yourCost, optimalMoves: res.moves.length, optimalCost: res.cost, right: right, wrong: wrong, hints: hints, time: Math.round(elapsedEnd), score: finalScore, model: model }
    });

    /* Replay board */
    if (!rvBoard) rvBoard = new PixelBoard($('rv-board'), { duration: 0.35 });
    rvBoard.setState(res.path[0], goal);
    $('rv-cap').textContent = 'STEP 0 OF ' + res.moves.length + '  START';
    revealPath = res.path;

    if (window.gsap && !Decor.reduceMotion) {
      gsap.from('#reveal .win, #reveal .panel', { opacity: 0, y: 24, duration: 0.5, stagger: 0.1, ease: 'steps(5)', clearProps: 'all' });
    }
    $('reveal').scrollIntoView({ behavior: Decor.reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  let revealPath = [];

  function stopReplay() {
    if (replayTimer) clearInterval(replayTimer);
    replayTimer = null;
  }

  $('rv-play').addEventListener('click', () => {
    if (!revealPath.length) return;
    stopReplay();
    let i = 0;
    const last = revealPath.length - 1;
    rvBoard.setState(revealPath[0], goal);
    $('rv-cap').textContent = 'STEP 0 OF ' + last + '  START';
    Sound.click();
    replayTimer = setInterval(() => {
      if (i >= last) { stopReplay(); return; }
      i++;
      Sound.move();
      rvBoard.moveTo(revealPath[i]);
      $('rv-cap').textContent = 'STEP ' + i + ' OF ' + last + (i === last ? '  GOAL REACHED' : '');
      if (i === last) Sound.lock();
    }, 850);
  });
  $('rv-stop').addEventListener('click', () => { Sound.click(); stopReplay(); });

  $('rv-again').addEventListener('click', () => { Sound.click(); begin(); window.scrollTo(0, 0); });
  $('rv-new').addEventListener('click', () => { newPuzzle(); window.scrollTo(0, 0); });

  /* ---------- Initial paint ---------- */
  board.setState(cur, goal);
  target.setState(goal, goal);
  renderScores();
  hud();
  setButtons();
  showOverlay();
})();
