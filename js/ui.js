/*
 * ui.js
 * Shared page helpers: navigation bar, sound toggle, toasts, formatters,
 * confetti, entrance animations. Every page calls UI.init('<page key>').
 */
(global => {
  'use strict';

  const S = global.Sprites;

  const NAV = [
    { key: 'home', href: 'index.html', label: 'HOME' },
    { key: 'setup', href: 'setup.html', label: 'SETUP' },
    { key: 'play', href: 'game.html', label: 'PLAY' },
    { key: 'solver', href: 'solver.html', label: 'SOLVER' },
    { key: 'compare', href: 'compare.html', label: 'COMPARE' },
    { key: 'algorithms', href: 'algorithms.html', label: 'ALGORITHMS' }
  ];

  function $(id) { return document.getElementById(id); }

  function renderNav(active) {
    const root = $('nav-root');
    if (!root) return;
    const star = S.svg('star', 2);
    const items = NAV.map((n, i) => {
      return (i ? '<li class="hidden md:block nav-sep" aria-hidden="true">' + star + '</li>' : '') +
        '<li><a class="nav-link' + (n.key === active ? ' active' : '') + '" href="' + n.href + '"' +
        (n.key === active ? ' aria-current="page"' : '') + '>' + n.label + '</a></li>';
    }).join('');

    root.innerHTML =
      '<header class="nav-bar">' +
      '<div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 md:px-6">' +
      '<a class="nav-brand order-1 flex items-center gap-2 mr-auto md:mr-4" href="index.html">' +
      S.svg('slime', 3) + '<span class="font-pixel text-[11px] text-soft">BLANK QUEST</span></a>' +
      '<button id="nav-toggle" class="btn btn-sun btn-sm order-2 md:hidden" aria-expanded="false" aria-controls="nav-links">MENU</button>' +
      '<button id="snd-toggle" class="btn btn-sun btn-sm order-3" aria-pressed="false"></button>' +
      '<nav id="nav-links" class="hidden order-4 w-full md:order-2 md:block md:w-auto md:flex-1" aria-label="Main">' +
      '<ul class="flex flex-col gap-1 md:flex-row md:flex-wrap md:items-center">' + items + '</ul></nav>' +
      '</div></header>';

    const toggle = $('nav-toggle');
    const links = $('nav-links');
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('hidden') === false;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (global.Sound) global.Sound.click();
    });

    const snd = $('snd-toggle');
    function paintSound() {
      const off = global.Sound && global.Sound.isMuted();
      snd.textContent = off ? 'SOUND OFF' : 'SOUND ON';
      snd.setAttribute('aria-pressed', off ? 'true' : 'false');
    }
    snd.addEventListener('click', () => {
      global.Sound.toggle();
      paintSound();
    });
    paintSound();
  }

  /* Pop-up message in the bottom-left corner. kind: 'ok' | 'bad' | 'info' */
  function toast(msg, kind) {
    let box = $('toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'toasts';
      box.className = 'fixed bottom-3 left-3 z-[100] flex flex-col gap-2 max-w-[92vw]';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    const t = document.createElement('div');
    t.className = 'toast toast-' + (kind || 'info');
    t.textContent = msg;
    box.appendChild(t);
    if (global.gsap && !global.Decor.reduceMotion) {
      global.gsap.from(t, { y: 24, opacity: 0, duration: 0.3, ease: 'steps(4)' });
    }
    setTimeout(() => {
      if (global.gsap && !global.Decor.reduceMotion) {
        global.gsap.to(t, { opacity: 0, x: -30, duration: 0.3, ease: 'steps(4)', onComplete: () => t.remove() });
      } else {
        t.remove();
      }
    }, 3200);
  }

  function fmtInt(n) { return Number(n).toLocaleString('en-US'); }

  function fmtMs(ms) {
    if (ms < 0.05) return '< 0.1 ms';
    if (ms < 10) return ms.toFixed(2) + ' ms';
    if (ms < 1000) return ms.toFixed(1) + ' ms';
    return (ms / 1000).toFixed(2) + ' s';
  }

  function fmtBytes(b) {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function fmtClock(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  const DIR_WORD = { up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT' };

  /* Count a number up to its final value (anime.js), falls back to setting it directly. */
  function countTo(el, value, format) {
    format = format || fmtInt;
    if (!global.anime || global.Decor.reduceMotion) { el.textContent = format(value); return; }
    const o = { v: 0 };
    global.anime({
      targets: o,
      v: value,
      duration: 700,
      easing: 'steps(12)',
      update: () => { el.textContent = format(Math.round(o.v)); },
      complete: () => { el.textContent = format(value); }
    });
  }

  /* Small scale pop on an element (GSAP). */
  function pop(el) {
    if (!global.gsap || global.Decor.reduceMotion) return;
    global.gsap.fromTo(el, { scale: 1.25 }, { scale: 1, duration: 0.25, ease: 'steps(4)' });
  }

  /* Pixel-colour confetti burst (canvas-confetti). */
  function confetti(big) {
    if (!global.confetti || global.Decor.reduceMotion) return;
    const colors = ['#E85DB5', '#F2A9D5', '#6258F5', '#83F28F', '#D0FFC0', '#F7E96B', '#F5F3FF'];
    const base = { colors: colors, shapes: ['square'], scalar: 1.3, ticks: 220, disableForReducedMotion: true };
    global.confetti(Object.assign({ particleCount: big ? 90 : 40, spread: 70, origin: { x: 0.2, y: 0.7 }, angle: 60 }, base));
    global.confetti(Object.assign({ particleCount: big ? 90 : 40, spread: 70, origin: { x: 0.8, y: 0.7 }, angle: 120 }, base));
    if (big) {
      setTimeout(() => {
        global.confetti(Object.assign({ particleCount: 120, spread: 120, startVelocity: 38, origin: { x: 0.5, y: 0.3 } }, base));
      }, 350);
    }
  }

  /* Entrance animation for panels (GSAP). */
  function reveal(selector) {
    const nodes = document.querySelectorAll(selector || '.reveal');
    if (!global.gsap || global.Decor.reduceMotion || !nodes.length) return;
    global.gsap.from(nodes, { opacity: 0, y: 18, duration: 0.45, stagger: 0.09, ease: 'steps(5)', clearProps: 'all' });
  }

  function init(activeKey) {
    renderNav(activeKey);
    global.Decor.init();
    reveal('.reveal');
    /* Chunky press effect for keyboard users too (Space / Enter on a focused button). */
    document.addEventListener('keydown', e => {
      if ((e.key === ' ' || e.key === 'Enter') && e.target.classList && e.target.classList.contains('btn')) {
        e.target.classList.add('is-down');
      }
    });
    document.addEventListener('keyup', e => {
      if (e.target.classList && e.target.classList.contains('btn')) e.target.classList.remove('is-down');
    });
  }

  global.UI = {
    $: $,
    init: init,
    toast: toast,
    fmtInt: fmtInt,
    fmtMs: fmtMs,
    fmtBytes: fmtBytes,
    fmtClock: fmtClock,
    DIR_WORD: DIR_WORD,
    countTo: countTo,
    pop: pop,
    confetti: confetti,
    reveal: reveal
  };
})(typeof window !== 'undefined' ? window : globalThis);
