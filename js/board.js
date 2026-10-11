/*
 * board.js
 * PixelBoard: the animated 3x3 puzzle board (tiles slide with GSAP when it is loaded,
 * with a plain CSS transition as fallback).
 * miniBoard(): small static boards used in the search panels and lists.
 */
((global) => {
  'use strict';

  const ICONS = ['star', 'flower', 'coin', 'heart', 'gem', 'mushroom', 'slime', 'tree'];

  /* Move an element to (x, y). Returns a Promise that resolves when the move ends. */
  function place(el, x, y, dur, ease) {
    const g = global.gsap;
    if (g) {
      if (dur > 0) {
        return new Promise(resolve => {
          g.to(el, { x, y, duration: dur, ease: ease || 'power2.out', onComplete: resolve });
        });
      }
      g.set(el, { x, y });
      return Promise.resolve();
    }
    el.style.transition = dur > 0 ? `transform ${dur}s steps(5)` : 'none';
    el.style.transform = `translate(${x}px,${y}px)`;
    return dur > 0 ? new Promise(r => setTimeout(r, dur * 1000)) : Promise.resolve();
  }

  class PixelBoard {
    constructor(root, opts = {}) {
      this.root = root;
      this.opts = { gap: 8, pad: 8, onTile: null, duration: 0.2, ...opts };
      this.els = {};
      this.state = null;
      this.goal = null;
      this.cell = 0;
      this.build();

      root.addEventListener('click', e => {
        const el = e.target.closest ? e.target.closest('.tile') : null;
        if (!el || !this.opts.onTile || !this.state) return;
        const t = parseInt(el.dataset.tile, 10);
        if (t === 0) return;
        this.opts.onTile(t, this.state.indexOf(t));
      });

      if (global.ResizeObserver) {
        new global.ResizeObserver(() => this.layout()).observe(root);
      } else {
        global.addEventListener('resize', () => this.layout());
      }
    }

    build() {
      this.root.classList.add('board');
      for (let t = 0; t <= 8; t++) {
        const el = document.createElement('div');
        el.dataset.tile = String(t);
        if (t === 0) {
          el.className = 'tile blank';
          el.setAttribute('aria-label', 'blank space');
        } else {
          el.className = `tile tile-c${t}`;
          el.setAttribute('role', 'button');
          el.setAttribute('aria-label', `tile ${t}`);
          el.innerHTML = `<span class="tile-num">${t}</span><span class="tile-icon">${global.Sprites.svg(ICONS[t - 1], 4)}</span>`;
        }
        this.root.appendChild(el);
        this.els[t] = el;
      }
    }

    pos(index) {
      const r = (index / 3) | 0;
      const c = index % 3;
      return {
        x: this.opts.pad + c * (this.cell + this.opts.gap),
        y: this.opts.pad + r * (this.cell + this.opts.gap)
      };
    }

    layout() {
      const w = this.root.clientWidth;
      if (!w) return;
      this.cell = Math.floor((w - 2 * this.opts.pad - 2 * this.opts.gap - 8) / 3);
      this.root.style.setProperty('--cell', `${this.cell}px`);
      for (let t = 0; t <= 8; t++) {
        this.els[t].style.width = `${this.cell}px`;
        this.els[t].style.height = `${this.cell}px`;
      }
      if (this.state) {
        for (let i = 0; i < 9; i++) {
          const p = this.pos(i);
          place(this.els[this.state[i]], p.x, p.y, 0);
        }
      }
    }

    /* Mark tiles that sit on their goal square and tiles that can slide into the blank. */
    marks() {
      if (!this.state) return;
      const blank = this.state.indexOf(0);
      for (let t = 1; t <= 8; t++) {
        const idx = this.state.indexOf(t);
        const el = this.els[t];
        el.classList.toggle('in-place', !!this.goal && this.goal[idx] === t);
        el.classList.toggle('movable', global.Puzzle.areAdjacent(idx, blank));
      }
    }

    /* Jump straight to a state (no animation). */
    setState(state, goal) {
      this.state = state.slice();
      if (goal) this.goal = goal.slice();
      this.layout();
      this.marks();
    }

    setGoal(goal) {
      this.goal = goal ? goal.slice() : null;
      this.marks();
    }

    /* Slide every tile that changed position. Resolves when all slides are finished. */
    moveTo(next, opts = {}) {
      const dur = opts.duration === undefined ? this.opts.duration : opts.duration;
      const old = this.state;
      const jobs = [];
      this.state = next.slice();
      for (let i = 0; i < 9; i++) {
        const tile = next[i];
        if (!old || old[i] !== tile) {
          const p = this.pos(i);
          jobs.push(place(this.els[tile], p.x, p.y, dur, opts.ease));
        }
      }
      this.marks();
      return Promise.all(jobs).then(() => this.marks());
    }

    /* Short coloured flash around the board. kind: 'right' | 'wrong' */
    flash(kind) {
      const root = this.root;
      root.classList.remove('flash-right', 'flash-wrong');
      void root.offsetWidth;
      root.classList.add(`flash-${kind}`);
      setTimeout(() => root.classList.remove(`flash-${kind}`), 520);
    }

    shake() {
      const g = global.gsap;
      if (!g) return;
      g.fromTo(this.root, { x: 0 }, { keyframes: [{ x: -9 }, { x: 9 }, { x: -6 }, { x: 6 }, { x: 0 }], duration: 0.36, ease: 'none' });
    }

    pop() {
      const g = global.gsap;
      if (!g) return;
      g.fromTo(this.root, { scale: 0.97 }, { scale: 1, duration: 0.18, ease: 'steps(3)' });
    }

    nudge(tile) {
      const g = global.gsap;
      const el = this.els[tile];
      if (!g || !el) return;
      g.fromTo(el, { rotation: 0 }, { keyframes: [{ rotation: -4 }, { rotation: 4 }, { rotation: -2 }, { rotation: 0 }], duration: 0.28, ease: 'none' });
    }

    hint(tile) {
      const el = this.els[tile];
      if (!el) return;
      el.classList.add('hinted');
      setTimeout(() => el.classList.remove('hinted'), 2600);
    }
  }

  /* Static 3x3 board as an HTML string. */
  function miniBoard(state, opts = {}) {
    const { goal, hi, large } = opts;
    let html = `<span class="mini${large ? ' mini-lg' : ''}">`;
    for (let i = 0; i < 9; i++) {
      const v = state[i];
      let cls = 'mc';
      if (v === 0) {
        cls += ' mc-blank';
      } else {
        if (goal && goal[i] === v) cls += ' mc-ok';
        if (hi === v) cls += ' mc-hi';
      }
      html += `<span class="${cls}">${v === 0 ? '' : v}</span>`;
    }
    return `${html}</span>`;
  }

  global.PixelBoard = PixelBoard;
  global.miniBoard = miniBoard;
})(typeof window !== 'undefined' ? window : globalThis);
