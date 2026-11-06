/* Every sample, instrument and voice is synthesized at runtime. No audio assets. */
(() => {
  'use strict';
  const W = globalThis.Wired;
  W.SONG = {
    bpm: 84,
    steps: 4,
    tracks: [
      {
        name: 'glass',
        wave: 'sine',
        vol: 0.16,
        notes: 'D5 . . A4 . . . . F5 . . E5 . . . . | D5 . . . A5 . . . G5 . . . E5 . . .',
      },
      {
        name: 'bass',
        wave: 'triangle',
        vol: 0.23,
        notes: 'D2 - . . . . A2 . | D2 - . . . . C3 . | Bb1 - . . . . F2 . | A1 - . . . . E2 .',
      },
      {
        name: 'urgent',
        wave: 'pulse12',
        vol: 0.0,
        notes: 'D4 . A4 . D5 . A4 . F4 . A4 . E5 . A4 .',
      },
      { name: 'pulse', wave: 'drums', vol: 0.08, notes: 'k . . . . . h . k . . . . . h .' },
    ],
  };
  W.syllable = (ctx, bus, time, freq, dur, vol, vex = false) => {
    const osc = ctx.createOscillator(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    osc.type = vex ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * (vex ? 0.72 : 1.22), time + dur);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(vex ? 700 : 1550, time);
    filter.frequency.linearRampToValueAtTime(vex ? 1300 : 900, time + dur);
    filter.Q.value = 2.3;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    osc.start(time);
    osc.stop(time + dur + 0.01);
    return osc;
  };
  W.Audio = class {
    constructor(game) {
      this.g = game;
      this.a = game.audio;
      this.active = false;
      this.stopped = false;
      this.voiceNodes = [];
      this.priority = -1;
      this.voiceUntil = 0;
      this.lastTick = -1;
      this.event = 0;
      const defs = {
        snip: { wave: 'noise', freq: 2400, to: 900, dur: 0.06, vol: 0.3 },
        grip: { wave: 'square', freq: 210, to: 150, dur: 0.045, vol: 0.12 },
        insert: { wave: 'triangle', freq: 380, to: 620, dur: 0.12, vol: 0.25 },
        solder: { wave: 'noise', freq: 1000, to: 3200, dur: 0.17, vol: 0.1 },
        test: { wave: 'sine', freq: 620, to: 1240, dur: 0.24, vol: 0.22 },
        foam: { wave: 'noise', freq: 450, to: 180, dur: 0.4, vol: 0.23 },
        tick: { wave: 'sine', freq: 75, to: 50, dur: 0.08, vol: 0.12 },
        radio: { wave: 'square', freq: 1400, to: 900, dur: 0.045, vol: 0.08 },
        siren: { wave: 'sine', freq: 430, to: 620, dur: 0.8, vol: 0.025 },
      };
      for (const [n, d] of Object.entries(defs)) this.a.define('wired:' + n, d);
    }
    activate() {
      if (this.stopped || this.g.headless) return;
      this.a.bus('sfx');
      if (!this.active) {
        this.active = true;
        this.a.music(W.SONG, { sync: true });
      }
    }
    cue(n) {
      if (this.active && !this.stopped) this.a.sfx('wired:' + n);
    }
    say(text, who = 'nell', priority = 1) {
      if (this.stopped || !this.active || !this.a.ready) return false;
      const ctx = this.a.ctx,
        now = ctx.currentTime;
      if (now < this.voiceUntil && priority < this.priority) return false;
      for (const n of this.voiceNodes)
        try {
          n.stop();
        } catch {}
      this.voiceNodes = [];
      this.priority = priority;
      const letters = text.replace(/[^a-z]/gi, '').slice(0, 28),
        vex = who === 'vex',
        rng = W.rng(text);
      this.cue('radio');
      for (let i = 0; i < letters.length; i++) {
        const time = now + 0.06 + i * (vex ? 0.08 : 0.052),
          freq = (vex ? 115 : 240) * (1 + rng() * 0.75);
        this.voiceNodes.push(
          W.syllable(ctx, this.a.bus('voice'), time, freq, vex ? 0.075 : 0.05, 0.22, vex),
        );
      }
      this.voiceUntil = now + 0.06 + letters.length * (vex ? 0.08 : 0.052);
      return true;
    }
    update(s) {
      if (!s || this.stopped) return;
      const tick = Math.floor(s.remaining);
      if (tick !== this.lastTick) {
        this.lastTick = tick;
        if (s.remaining < 60 || tick % 4 === 0) this.cue('tick');
        if (this.active) this.a.layer('urgent', s.remaining < 60 ? 0.1 : 0, 0.5);
      }
      for (const e of s.events) {
        if (e.id <= this.event) continue;
        this.event = e.id;
        const cue = {
          cut: 'snip',
          lift: 'grip',
          pick: 'grip',
          place: 'insert',
          solder: 'solder',
          test: 'test',
          foam: 'foam',
          board: 'test',
          fault: 'radio',
          fire: 'siren',
        }[e.type];
        if (cue) this.cue(cue);
        if (['fault', 'fire', 'wrong', 'penalty'].includes(e.type)) this.say(e.text, 'nell', 3);
        else if (['board', 'stable', 'recover'].includes(e.type)) this.say(e.text, 'nell', 2);
        if (e.type === 'win' && this.active)
          this.a.sting({
            bpm: 108,
            steps: 2,
            loop: false,
            tracks: [{ wave: 'sine', vol: 0.25, notes: 'D5 F#5 A5 D6 - .' }],
          });
        if (e.type === 'loss' && this.active)
          this.a.sting({
            bpm: 90,
            steps: 2,
            loop: false,
            tracks: [{ wave: 'triangle', vol: 0.3, notes: 'D3 Ab2 D2 - .' }],
          });
      }
    }
    reset() {
      if (this.stopped) this.active = false;
      this.event = 0;
      this.lastTick = -1;
      this.stopped = false;
    }
    stop() {
      this.stopped = true;
      for (const n of this.voiceNodes)
        try {
          n.stop();
        } catch {}
      this.voiceNodes = [];
      this.a.music(null);
      if (this.a.ctx) this.a.ctx.suspend().catch(() => {});
    }
  };
})();
