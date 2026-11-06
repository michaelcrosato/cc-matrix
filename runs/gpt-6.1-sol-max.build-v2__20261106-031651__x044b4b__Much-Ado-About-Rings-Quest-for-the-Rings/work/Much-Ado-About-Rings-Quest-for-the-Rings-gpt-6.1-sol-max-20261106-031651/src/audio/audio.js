(function (G) {
  'use strict';
  const M = G.MA;
  M.tone = (ctx, bus, t, frequency, duration, gain = 0.1, type = 'triangle', to = frequency) => {
    const o = ctx.createOscillator(),
      a = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(frequency, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(15, to), t + duration);
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(gain, t + 0.008);
    a.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(a);
    a.connect(bus);
    o.start(t);
    o.stop(t + duration + 0.01);
    o.addEventListener(
      'ended',
      () => {
        o.disconnect();
        a.disconnect();
      },
      { once: true },
    );
    return o;
  };
  const title = {
    bpm: 68,
    steps: 2,
    tracks: [
      {
        name: 'bells',
        wave: 'sine',
        vol: 0.3,
        notes: 'D5 . . A4 . . F5 . E5 . . A4 . . D5 . | D5 . . C5 . . A4 . Bb4 . . E5 . . A4 .',
      },
      {
        name: 'strings',
        wave: 'triangle',
        vol: 0.12,
        notes: 'D3 - - - A2 - - - Bb2 - - - A2 - - - | G2 - - - D3 - - - Bb2 - - - A2 - - -',
      },
    ],
  };
  const explore = {
    bpm: 76,
    steps: 2,
    tracks: [
      {
        name: 'footfall',
        wave: 'triangle',
        vol: 0.15,
        notes: 'D3 . A2 . . . F3 . C3 . G2 . . . E3 . | Bb2 . F3 . . . D3 . A2 . E3 . . . C3 .',
      },
      {
        name: 'lantern',
        wave: 'sine',
        vol: 0.2,
        notes: 'A4 . . . . . D5 . . . C5 . A4 . . . | F4 . . . . . Bb4 . . . A4 . E5 . . .',
      },
      { name: 'dread', wave: 'drums', vol: 0.1, notes: 'k . . . . . h . k . . . . . h .' },
    ],
  };
  const final = {
    bpm: 96,
    steps: 2,
    tracks: [
      { name: 'pulse', wave: 'triangle', vol: 0.23, notes: 'D3 . D3 . A2 . A2 . Bb2 . Bb2 . A2 . A2 .' },
      { name: 'warning', wave: 'sine', vol: 0.18, notes: 'D5 . A4 . F5 . E5 . D5 . C5 . Bb4 . A4 .' },
      { name: 'scales', wave: 'drums', vol: 0.15, notes: 'k . h . . . h . k . h . s . . .' },
    ],
  };
  const fanfare = {
    bpm: 120,
    steps: 2,
    tracks: [
      { wave: 'triangle', vol: 0.35, notes: 'D4 A4 D5 - F5 - E5 D5 | G5 - F5 E5 D5 - - -' },
      { wave: 'sine', vol: 0.25, notes: 'D3 - A3 - D4 - A3 - | G3 - A3 - D4 - - -' },
    ],
  };
  class Audio {
    constructor(game) {
      this.game = game;
      this.a = game.audio;
      this.last = null;
      this.theme = null;
      this.voices = new Set();
      this.footTimes = new Map();
      this.ended = false;
      const defs = {
        blade: { wave: 'noise', freq: 1100, to: 180, dur: 0.16, vol: 0.12 },
        rune: { wave: 'sine', freq: 420, to: 980, dur: 0.28, vol: 0.16 },
        phase: { wave: 'triangle', freq: 170, to: 510, dur: 0.4, vol: 0.12 },
        cloak: { wave: 'sine', freq: 600, to: 240, dur: 0.35, vol: 0.12 },
        ring: { wave: 'triangle', freq: 'D5', arp: [0, 7, 12, 16, 19], step: 0.1, dur: 0.7, vol: 0.18 },
        crystal: { wave: 'sine', freq: 1300, to: 800, dur: 0.25, vol: 0.1 },
        stone: { wave: 'noise', freq: 100, to: 55, dur: 0.6, vol: 0.12 },
        flame: { wave: 'noise', freq: 650, to: 180, dur: 0.5, vol: 0.12 },
      };
      for (const [k, v] of Object.entries(defs)) this.a.define(k, v);
    }
    music(key) {
      if (this.theme === key || this.ended) return;
      this.theme = key;
      this.dreadKey = null;
      this.a.music(
        key === 'silence'
          ? null
          : key === 'title' || key === 'board'
            ? title
            : key === 'final'
              ? final
              : key === 'victory'
                ? fanfare
                : explore,
        { sync: true, fade: 0.7 },
      );
    }
    voice(kind = 'master') {
      if (this.ended || !this.a.ctx || this.a.ctx.state !== 'running') return;
      const ctx = this.a.ctx,
        bus = this.a.bus('voice'),
        base = { master: 95, warrior: 140, wizard: 230, phantom: 185, changeling: 280 }[kind] || 165,
        gap =
          { master: 0.1, warrior: 0.085, wizard: 0.075, phantom: 0.095, changeling: 0.055 }[kind] || 0.075;
      for (let i = 0; i < 7; i++) {
        const node = M.tone(
          ctx,
          bus,
          ctx.currentTime + i * gap,
          base * [1, 1.2, 0.9, 1.4, 1.05, 0.8, 1.3][i],
          0.065,
          0.055,
          'triangle',
          base * 1.08,
        );
        this.voices.add(node);
        node.onended = () => this.voices.delete(node);
      }
    }
    update(w, silent = false) {
      if (this.ended || silent) return;
      if (this.theme === 'explore') {
        const key = `${w.dread}:${w.ring?.carrier != null}`;
        if (key !== this.dreadKey) {
          this.dreadKey = key;
          this.a.layer('dread', Math.min(1, 0.2 + w.dread * 0.1 + (w.ring?.carrier != null ? 0.25 : 0)), 0.8);
        }
      }
      if (['room', 'court'].includes(w.mode))
        for (const h of w.heroes)
          if (!h.down && Math.hypot(h.vx, h.vy) > 8 && w.time - (this.footTimes.get(h.id) || 0) > 0.32) {
            this.footTimes.set(h.id, w.time);
            this.a.sfx('step', {
              vol: 0.055,
              pitch: { warrior: 0.8, wizard: 1.05, phantom: 0.75, changeling: 1.25 }[h.classId],
              vary: 0,
            });
          }
      const idx = this.last ? w.events.findIndex((e) => e.id === this.last) : w.events.length - 1;
      for (const e of w.events.slice(Math.max(0, idx + 1))) {
        const action = {
          'primary-active':
            e.classId === 'warrior'
              ? 'blade'
              : e.classId === 'wizard'
                ? 'rune'
                : e.classId === 'phantom'
                  ? 'phase'
                  : 'cloak',
          power: 'rune',
          hurt: 'hurt',
          down: 'die',
          revive: 'heal',
          pickup: 'ring',
          pass: 'pickup',
          'ring-secured': 'ring',
          bind: 'ring',
          shift: 'stone',
          reveal: 'crystal',
          dodge: 'whoosh',
          'enemy-active': e.kind === 'dragon' || e.kind === 'fire' ? 'flame' : 'swing',
          guard: 'bump',
          'ward-intercept': 'rune',
          'ring-return': 'secret',
        }[e.type];
        if (action) this.a.sfx(action, { vary: 0 });
        if (e.type === 'director') this.voice('master');
        if (e.type === 'power') this.voice(e.classId);
        if (e.type === 'revive') this.voice(w.heroes[e.hero].classId);
        if (e.type === 'victory') {
          this.music('victory');
          this.voice('wizard');
        }
      }
      if (w.events.length) this.last = w.events[w.events.length - 1].id;
    }
    stop() {
      this.a.music(null);
      this.theme = null;
      for (const node of this.voices) {
        try {
          node.stop();
        } catch (_) {
          /* already ended */
        }
      }
      this.voices.clear();
    }
    end() {
      this.stop();
      this.ended = true;
      this.a.setVolume(0);
    }
  }
  M.Audio = Audio;
})(globalThis);
