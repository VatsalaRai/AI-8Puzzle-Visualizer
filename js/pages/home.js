/* home.js - Home page: student details, animated title, live solution demo. */
(() => {
  'use strict';
  const $ = UI.$;

  UI.init('home');

  /* Fill course / student details from js/config.js */
  const cfg = window.APP_CONFIG || {};
  document.querySelectorAll('[data-cfg]').forEach(el => {
    el.textContent = cfg[el.getAttribute('data-cfg')] || '';
  });

  /* Letter-by-letter title drop (anime.js, stepped) */
  const title = $('hero-title');
  const text = title.textContent;
  title.setAttribute('aria-label', text);
  title.innerHTML = text.split('').map(c => {
    return c === ' ' ? '<span class="hero-letter">&nbsp;</span>' : '<span class="hero-letter inline-block" aria-hidden="true">' + c + '</span>';
  }).join('');
  if (window.anime && !Decor.reduceMotion) {
    anime({
      targets: '.hero-letter',
      translateY: [-18, 0],
      opacity: [0, 1],
      delay: anime.stagger(80),
      duration: 450,
      easing: 'steps(5)'
    });
  }

  /* Live demo: replay the optimal solution of the assignment example in a loop */
  const goal = Puzzle.GOAL_ASSIGNMENT;
  let res = Ucs.solve(Puzzle.EXAMPLE_INITIAL, goal, { record: false });
  const path = res.path;
  const board = new PixelBoard($('demo-board'), { duration: 0.4 });
  const cap = $('demo-caption');
  let i = 0;

  function caption() {
    cap.textContent = i === 0
      ? 'STEP 0 OF ' + (path.length - 1) + '  START'
      : (i === path.length - 1 ? 'STEP ' + i + ' OF ' + (path.length - 1) + '  GOAL REACHED' : 'STEP ' + i + ' OF ' + (path.length - 1));
  }

  board.setState(path[0], goal);
  caption();

  function next() {
    if (i < path.length - 1) {
      i++;
      board.moveTo(path[i]);
      caption();
      setTimeout(next, i === path.length - 1 ? 2400 : 1100);
    } else {
      i = 0;
      board.setState(path[0], goal);
      caption();
      setTimeout(next, 1100);
    }
  }
  setTimeout(next, 1400);
})();
