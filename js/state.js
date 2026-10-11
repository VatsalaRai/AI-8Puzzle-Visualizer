/*
 * state.js
 * Small localStorage-backed store shared by every page, so the puzzle chosen on the
 * Setup page is the same one used by the game, the solver and the comparison page.
 * Works when index.html is opened straight from disk (file://).
 */
(global => {
  'use strict';

  const KEY = 'blank_quest_state_v1';
  const P = global.Puzzle;

  function defaults() {
    return {
      initial: P.EXAMPLE_INITIAL.slice(),
      goal: P.GOAL_ASSIGNMENT.slice(),
      algo: 'ucs',
      costModel: 'uniform',
      difficulty: 'medium',
      speed: 7,
      scores: [],
      runs: [],
      lastGame: null
    };
  }

  function read() {
    const base = defaults();
    try {
      const raw = global.localStorage.getItem(KEY);
      if (!raw) return base;
      const saved = JSON.parse(raw);
      const merged = Object.assign(base, saved);
      if (!P.isValid(merged.initial) || !P.isValid(merged.goal)) {
        merged.initial = base.initial;
        merged.goal = base.goal;
      }
      return merged;
    } catch (e) {
      return base;
    }
  }

  function write(obj) {
    try { global.localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* storage unavailable */ }
  }

  const Store = {
    get: read,

    update(patch) {
      const s = read();
      Object.assign(s, patch);
      write(s);
      return s;
    },

    reset() {
      write(defaults());
      return read();
    },

    /* Keep the latest solver runs for the comparison page. */
    pushRun(run) {
      const s = read();
      s.runs.unshift(run);
      s.runs = s.runs.slice(0, 12);
      write(s);
    },

    /* Top 5 scores. */
    addScore(entry) {
      const s = read();
      s.scores.push(entry);
      s.scores.sort((a, b) => { return b.score - a.score; });
      s.scores = s.scores.slice(0, 5);
      write(s);
      return s.scores;
    }
  };

  global.Store = Store;
})(typeof window !== 'undefined' ? window : globalThis);
