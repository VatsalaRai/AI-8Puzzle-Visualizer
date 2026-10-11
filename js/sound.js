/*
 * sound.js
 * Retro sound effects synthesised with the Web Audio API (no audio files needed).
 * Browsers only allow audio after a user gesture, so ensure() is called on every
 * click / key press before anything is played.
 */
(global => {
  'use strict';

  let ctx = null;
  let master = null;
  let muted = false;
  let lastTick = 0;

  try { muted = localStorage.getItem('bq_muted') === '1'; } catch (e) { /* storage unavailable */ }

  function ensure() {
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.7;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  /* One oscillator note with a quick attack and an exponential fade-out. */
  function tone(o) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + (o.at || 0);
    const dur = o.dur || 0.1;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    const vol = o.vol === undefined ? 0.16 : o.vol;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  function noise(o) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + (o.at || 0);
    const dur = o.dur || 0.12;
    const len = Math.floor(ctx.sampleRate * dur);
    let buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = o.cutoff || 1400;
    const gain = ctx.createGain();
    gain.gain.value = o.vol === undefined ? 0.2 : o.vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  const Sound = {
    unlock() { ensure(); },

    isMuted() { return muted; },

    setMuted(m) {
      muted = !!m;
      try { localStorage.setItem('bq_muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
      if (master) master.gain.value = muted ? 0 : 0.7;
      if (!muted) Sound.click();
      return muted;
    },

    toggle() { return Sound.setMuted(!muted); },

    /* UI button press. */
    click() {
      tone({ freq: 740, to: 880, dur: 0.05, vol: 0.1 });
    },

    /* A tile slides: short wooden tick. */
    move() {
      tone({ freq: 210, to: 150, dur: 0.07, type: 'square', vol: 0.12 });
      noise({ dur: 0.04, vol: 0.05, cutoff: 2400 });
    },

    /* Right move: bright rising arpeggio, climbs with the streak. */
    right(streak) {
      const s = Math.min(streak || 1, 8);
      const base = 523.25 * Math.pow(2, (s - 1) / 12);
      tone({ freq: base, dur: 0.09, vol: 0.14, at: 0.0 });
      tone({ freq: base * 1.25, dur: 0.09, vol: 0.14, at: 0.07 });
      tone({ freq: base * 1.5, dur: 0.16, vol: 0.14, at: 0.14, type: 'triangle' });
    },

    /* Wrong move: low falling buzz with a noise thud. */
    wrong() {
      tone({ freq: 196, to: 82, dur: 0.28, type: 'sawtooth', vol: 0.18 });
      tone({ freq: 98, to: 55, dur: 0.3, type: 'square', vol: 0.1, at: 0.04 });
      noise({ dur: 0.14, vol: 0.12, cutoff: 900 });
    },

    /* Tile tried to move but is not next to the blank. */
    blocked() {
      tone({ freq: 130, dur: 0.06, type: 'square', vol: 0.12 });
      tone({ freq: 130, dur: 0.06, type: 'square', vol: 0.12, at: 0.09 });
    },

    /* A tile landed on its goal square. */
    lock() {
      tone({ freq: 988, dur: 0.06, type: 'square', vol: 0.09 });
      tone({ freq: 1319, dur: 0.12, type: 'square', vol: 0.09, at: 0.06 });
    },

    undo() {
      tone({ freq: 440, to: 294, dur: 0.12, type: 'triangle', vol: 0.14 });
    },

    hint() {
      tone({ freq: 880, dur: 0.07, type: 'sine', vol: 0.16 });
      tone({ freq: 1175, dur: 0.07, type: 'sine', vol: 0.16, at: 0.09 });
      tone({ freq: 1568, dur: 0.14, type: 'sine', vol: 0.16, at: 0.18 });
    },

    /* Puzzle solved: victory fanfare. */
    win() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
      const gaps = [0, 0.1, 0.2, 0.3, 0.45, 0.55, 0.68];
      for (let i = 0; i < notes.length; i++) {
        tone({ freq: notes[i], dur: i === notes.length - 1 ? 0.5 : 0.13, vol: 0.15, at: gaps[i] });
        tone({ freq: notes[i] / 2, dur: i === notes.length - 1 ? 0.5 : 0.13, type: 'triangle', vol: 0.12, at: gaps[i] });
      }
    },

    /* Gave up: slow falling minor line. */
    lose() {
      const notes = [392, 349.23, 311.13, 261.63, 196];
      for (let i = 0; i < notes.length; i++) {
        tone({ freq: notes[i], dur: 0.28, type: 'triangle', vol: 0.18, at: i * 0.22 });
      }
    },

    /* Search step in the solver. Rate limited so fast playback does not become noise. */
    tick() {
      const t = Date.now();
      if (t - lastTick < 70) return;
      lastTick = t;
      tone({ freq: 560, to: 620, dur: 0.03, type: 'square', vol: 0.05 });
    },

    /* Solver: goal node selected. */
    found() {
      Sound.win();
    },

    /* Solver: search ended without a solution. */
    notFound() {
      Sound.lose();
    }
  };

  /* Unlock audio on the very first interaction anywhere on the page. */
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => {
    global.addEventListener(ev, () => { ensure(); }, { once: true, passive: true });
  });

  global.Sound = Sound;
})(typeof window !== 'undefined' ? window : globalThis);
