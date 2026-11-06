/* Freedom Warp Rescue — original code-defined instruments, score, radio babble and effects.
 * Native my-3D2dge music/sfx clock and volume buses form the audio foundation.
 */
(() => {
  "use strict";
  const F = (globalThis.FWR ||= {});
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
  const NOTES =
    "D5 . A4 . F5 . E5 . | D5 . C5 . A4 . G4 . | D5 . A4 . F5 . G5 . | E5 . C5 . A4 . . .";
  const SONGS = {
    flight: {
      bpm: 104,
      steps: 4,
      tracks: [
        { name: "pulse", wave: "fwr-pluck", vol: 0.18, notes: NOTES },
        {
          name: "bass",
          wave: "triangle",
          vol: 0.16,
          notes:
            "D2 - . D3 . . A2 . | C2 - . C3 . . G2 . | Bb1 - . Bb2 . . F2 . | C2 - . A2 . . C3 .",
        },
        {
          name: "space",
          wave: "fwr-pad",
          vol: 0.085,
          notes: "D4 - - - A3 - - - | C4 - - - G3 - - - | Bb3 - - - F4 - - - | C4 - - - E4 - - -",
        },
        {
          name: "threat",
          wave: "drums",
          vol: 0.35,
          on: false,
          notes: "k . h . . . h . | k . h . s . h . | k . h . . . h . | k . h h s . h .",
        },
        {
          name: "rescue",
          wave: "fwr-bell",
          vol: 0.075,
          on: false,
          notes: "A5 . . . F5 . . . | G5 . . . E5 . . . | F5 . . . D5 . . . | E5 . . . A5 . . .",
        },
      ],
    },
    carrier: {
      bpm: 112,
      steps: 4,
      tracks: [
        {
          name: "pulse",
          wave: "fwr-pluck",
          vol: 0.16,
          notes:
            "D4 . A4 D5 . F5 A4 . | D4 . Bb4 D5 . G5 Bb4 . | C4 . G4 C5 . E5 G4 . | A3 . E4 A4 . C5 E4 .",
        },
        {
          name: "bass",
          wave: "triangle",
          vol: 0.19,
          notes:
            "D2 . D2 . A2 . D3 . | Bb1 . Bb1 . F2 . Bb2 . | C2 . C2 . G2 . C3 . | A1 . A1 . E2 . A2 .",
        },
        {
          name: "space",
          wave: "fwr-pad",
          vol: 0.08,
          notes: "D3 - - - F3 - - - | Bb2 - - - D3 - - - | C3 - - - E3 - - - | A2 - - - C3 - - -",
        },
        {
          name: "threat",
          wave: "drums",
          vol: 0.4,
          notes: "k . h . s . h . | k k h . s . h h | k . h . s . h . | k . h h s . h h",
        },
      ],
    },
    victory: {
      bpm: 108,
      steps: 4,
      loop: false,
      tracks: [
        {
          wave: "fwr-bell",
          vol: 0.2,
          notes:
            "D5 . F5 . A5 . D6 - | C6 . A5 . G5 . F5 - | E5 . F5 . A5 . G5 . | D6 - - - - - - -",
        },
        {
          wave: "fwr-pad",
          vol: 0.13,
          notes: "D4 - - - F4 - - - | C4 - - - E4 - - - | Bb3 - - - G4 - - - | D4 - - - - - - -",
        },
      ],
    },
    failure: {
      bpm: 88,
      steps: 4,
      loop: false,
      tracks: [
        {
          wave: "fwr-pluck",
          vol: 0.18,
          notes: "A4 - . . F4 - . . | E4 - . . C4 - . . | D4 - - - - - - -",
        },
        {
          wave: "fwr-pad",
          vol: 0.12,
          notes: "D3 - - - - - - - | C3 - - - - - - - | D2 - - - - - - -",
        },
      ],
    },
  };
  const SOUNDS = {
    cannon: [
      { wave: "pulse12", freq: 780, to: 180, dur: 0.075, vol: 0.09, attack: 0.003 },
      { wave: "sine", freq: 190, to: 80, dur: 0.06, vol: 0.07 },
    ],
    enemy: { wave: "sine", freq: 390, to: 180, dur: 0.12, vol: 0.075 },
    impact: [
      { wave: "noise", freq: 2200, to: 900, dur: 0.05, vol: 0.055 },
      { wave: "sine", freq: 620, to: 440, dur: 0.06, vol: 0.045 },
    ],
    shield: { wave: "triangle", freq: 940, to: 1280, dur: 0.08, vol: 0.075 },
    arming: { wave: "sine", freq: 520, to: 720, dur: 0.07, vol: 0.08 },
    collapse: [
      { wave: "noise", freq: 2400, to: 120, dur: 0.42, vol: 0.14, filter: "lowpass" },
      { wave: "triangle", freq: 440, to: 90, dur: 0.38, vol: 0.11 },
    ],
    crystalWarning: [
      { wave: "sine", freq: 1200, to: 700, dur: 0.18, vol: 0.11 },
      { wave: "triangle", freq: 1760, to: 900, dur: 0.13, vol: 0.07 },
    ],
    rescue: [
      { wave: "fwr-bell", freq: 587.33, arp: [0, 3, 7, 12], step: 0.065, dur: 0.43, vol: 0.2 },
      { wave: "sine", freq: 293.66, to: 587.33, dur: 0.32, vol: 0.07 },
    ],
    windup: { wave: "saw", freq: 95, to: 420, dur: 0.16, vol: 0.08, attack: 0.03 },
    warp: [
      { wave: "noise", freq: 800, to: 4200, dur: 0.32, vol: 0.11 },
      { wave: "sine", freq: 140, to: 1000, dur: 0.4, vol: 0.13, attack: 0.018 },
    ],
    denied: { wave: "triangle", freq: 155, to: 95, dur: 0.13, vol: 0.13 },
    damage: [
      { wave: "noise", freq: 1700, to: 100, dur: 0.3, vol: 0.19, filter: "lowpass" },
      { wave: "triangle", freq: 110, to: 45, dur: 0.3, vol: 0.17 },
    ],
    explosion: [
      { wave: "noise", freq: 1600, to: 80, dur: 0.5, vol: 0.2, filter: "lowpass" },
      { wave: "sine", freq: 95, to: 32, dur: 0.42, vol: 0.14 },
    ],
    focus: { wave: "sine", freq: 610, to: 730, dur: 0.035, vol: 0.08 },
    confirm: {
      wave: "fwr-pluck",
      freq: 587.33,
      arp: [0, 7, 12],
      step: 0.045,
      dur: 0.18,
      vol: 0.14,
    },
    checkpoint: {
      wave: "fwr-bell",
      freq: 440,
      arp: [0, 5, 12, 17],
      step: 0.07,
      dur: 0.48,
      vol: 0.17,
    },
    loss: [
      { wave: "noise", freq: 2500, to: 400, dur: 0.24, vol: 0.1 },
      { wave: "sine", freq: 880, to: 220, dur: 0.35, vol: 0.13 },
    ],
  };
  // Instruments use ordinary Web Audio nodes, but run through native engine notes and bus gain.
  function instrument(kind, ctx, bus, t, freq, dur, vol, track) {
    const o = ctx.createOscillator(),
      gain = ctx.createGain();
    o.type = kind === "pad" ? "triangle" : kind === "bell" ? "sine" : "triangle";
    o.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + (kind === "pad" ? 0.035 : 0.004));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, dur));
    o.connect(gain);
    gain.connect(bus);
    o.start(t);
    o.stop(t + dur + 0.04);
    track?.(o, gain, t + dur + 0.04);
    if (kind === "bell") {
      const a = ctx.createOscillator(),
        g = ctx.createGain();
      a.type = "sine";
      a.frequency.setValueAtTime(freq * 2.003, t);
      g.gain.setValueAtTime(vol * 0.22, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.55);
      a.connect(g);
      g.connect(bus);
      a.start(t);
      a.stop(t + dur + 0.03);
      track?.(a, g, t + dur + 0.03);
    }
  }
  // Deliberately non-lexical radio syllables: pitched glottal pulses with shifting vowel-like formants.
  function babble(ctx, bus, time, character = "survivor", seed = 1, track) {
    const count = character === "pilot" ? 3 : character === "navigator" ? 4 : 5,
      base = character === "pilot" ? 155 : character === "navigator" ? 205 : 275;
    for (let i = 0; i < count; i++) {
      const t = time + i * 0.087,
        f = base * (1 + Math.sin(seed * 1.7 + i * 2.3) * 0.13),
        o = ctx.createOscillator(),
        amp = ctx.createGain(),
        filter = ctx.createBiquadFilter();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * (i % 2 ? 1.21 : 0.89), t + 0.056);
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(760 + ((i * 359 + seed * 71) % 1150), t);
      filter.Q.value = 3.1;
      amp.gain.setValueAtTime(0, t);
      amp.gain.linearRampToValueAtTime(0.11, t + 0.009);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(filter);
      filter.connect(amp);
      amp.connect(bus);
      o.start(t);
      o.stop(t + 0.078);
      track?.(o, amp, t + 0.08);
    }
  }
  class Audio {
    constructor(E, game) {
      if (game === undefined) {
        game = E;
        E = globalThis.My3D2dge;
      }
      this.E = E;
      this.game = game;
      this.native = game.audio;
      this.unlocked = false;
      this.suspended = false;
      this.lastEvent = 0;
      this.run = null;
      this.lastTime = 0;
      this.theme = null;
      this.nodes = [];
      this.handles = [];
      this.nextRadio = 0;
      this.lastWorld = null;
      this.analyser = null;
      this.settings = { master: 0.7, music: 0.1, effects: 0.8, voice: 0.65 };
      this.applySettings(this.settings);
      for (const [name, kind] of [
        ["fwr-pluck", "pluck"],
        ["fwr-pad", "pad"],
        ["fwr-bell", "bell"],
      ])
        this.native.instrument(name, (ctx, bus, t, f, d, v) =>
          instrument(kind, ctx, bus, t, f, d, v, (...args) => this._track(...args)),
        );
      for (const [id, definition] of Object.entries(SOUNDS))
        this.native.define("fwr:" + id, definition);
    }
    init() {
      if (this.unlocked) return Promise.resolve(this.native.ready);
      const bus = this.native.bus("master"),
        ctx = this.native.ctx;
      if (!bus || !ctx) return Promise.resolve(false);
      this.unlocked = true;
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      bus.connect(this.analyser);
      this.applySettings(this.settings);
      const p = ctx.state === "running" ? Promise.resolve() : ctx.resume();
      return p
        .then(() => {
          if (this.lastWorld && !this.suspended) this._theme(this.lastWorld);
          return this.native.ready;
        })
        .catch(() => false);
    }
    applySettings(s = {}) {
      this.settings = {
        master: clamp(s.master ?? s.volume ?? this.settings?.master ?? 0.7),
        music: clamp(s.music ?? this.settings?.music ?? 0.1),
        effects: clamp(s.effects ?? s.sfx ?? this.settings?.effects ?? 0.8),
        voice: clamp(s.voice ?? this.settings?.voice ?? 0.65),
      };
      this.native.volume = this.settings.master;
      this.native.musicVolume = this.settings.music;
      this.native.sfxVolume = this.settings.effects;
      this.native.voiceVolume = this.settings.voice;
      this.native.applyVolume();
    }
    _track(o, g, end) {
      this.nodes.push({ o, g, end });
    }
    _theme(world) {
      const outcome =
        typeof world.outcome === "string"
          ? world.outcome
          : world.outcome?.won === true
            ? "victory"
            : world.outcome?.won === false
              ? "failure"
              : world.outcome?.type;
      const key =
        outcome === "victory" || outcome === "won" || world.phase === "complete"
          ? "victory"
          : outcome === "failure" || outcome === "defeat" || world.phase === "failed"
            ? "failure"
            : world.sector >= 3
              ? "carrier"
              : "flight";
      if (this.theme !== key) {
        this.theme = key;
        this.native.music(SONGS[key], {
          sync: true,
          fade: 0.5,
          loop: !["victory", "failure"].includes(key),
        });
      }
      if (key === "flight") {
        const pressure = (world.entities || []).filter((e) =>
          ["layer", "guard", "interceptor"].includes(e.type),
        ).length;
        this.native.layer("threat", pressure ? Math.min(0.75, 0.23 + pressure * 0.1) : 0.12, 0.4);
        const recent = world.time < (this.rescueRelief || 0);
        this.native.layer("rescue", recent ? 0.7 : 0.12, 0.4);
      }
    }
    effect(name, opts = {}) {
      if (!this.unlocked || this.suspended) return null;
      const h = this.native.sfx("fwr:" + name, { vary: 0, ...opts });
      this.handles.push({ h, end: (this.native.ctx?.currentTime || 0) + 1.5 });
      return h;
    }
    ui(type = "focus") {
      return this.effect(type === "activate" ? "confirm" : type);
    }
    voice(character = "survivor", seed = 1, priority = 0) {
      const c = this.native.ctx;
      if (!this.unlocked || this.suspended || !c || c.state !== "running") return;
      if (c.currentTime < this.nextRadio && priority < 2) return;
      this.nextRadio = c.currentTime + (priority >= 2 ? 0.6 : 1.1);
      const bus = this.native.bus("voice");
      if (bus) babble(c, bus, c.currentTime + 0.006, character, seed, (...a) => this._track(...a));
    }
    update(world, dt) {
      this.lastWorld = world;
      const run = String(world.runId ?? world.id ?? world.seed) + ":" + world.sector;
      if (run !== this.run || world.time < this.lastTime - 0.1) {
        this.lastEvent = 0;
        this.run = run;
        this.theme = null;
        this.clearVoices();
        this.nextRadio = 0;
      }
      this.lastTime = world.time || 0;
      const c = this.native.ctx;
      if (c) {
        for (const n of this.nodes)
          if (n.end < c.currentTime) {
            try {
              n.g.disconnect();
              n.o.disconnect();
            } catch {}
          }
        this.nodes = this.nodes.filter((n) => n.end >= c.currentTime);
        this.handles = this.handles.filter((a) => a.end >= c.currentTime);
      }
      // Never unlock sound from update or attract. A real input gesture must call init().
      if (this.unlocked && !this.suspended && !world.attract) this._theme(world);
      for (const ev of world.events || []) {
        const id = ev.id ?? ev.seq ?? 0;
        if (id <= this.lastEvent) continue;
        this.lastEvent = Math.max(this.lastEvent, id);
        if (!this.unlocked || this.suspended || world.attract) continue;
        const type = String(ev.type).toLowerCase();
        if (type === "enemyfire") this.effect("enemy");
        else if (type === "cannon" || type === "playershot" || type === "playerfire")
          this.effect("cannon");
        else if (/rescue/.test(type)) {
          this.effect("rescue");
          this.voice("survivor", id, 2);
          this.rescueRelief = world.time + 3.5;
        } else if (/crack|crystalwarning|crystal-warning/.test(type)) {
          this.effect("crystalWarning");
          this.voice("navigator", id, 1);
        } else if (/loss|lost/.test(type)) {
          this.effect("loss");
          this.voice("pilot", id, 2);
        } else if (/collapse/.test(type)) this.effect("collapse");
        else if (/arm/.test(type)) this.effect("arming");
        else if (/windup|preview/.test(type)) this.effect("windup");
        else if (/denied|low-energy/.test(type)) this.effect("denied");
        else if (/warp|burst/.test(type)) {
          this.effect("warp");
          this.voice("navigator", id, 0);
        } else if (type === "hit" || type === "minehit") this.effect("impact");
        else if (type === "shield") this.effect("shield");
        else if (/damage|ship-hit/.test(type)) {
          this.effect("damage");
          this.voice("pilot", id, 2);
        } else if (/checkpoint|sector/.test(type)) {
          this.effect("checkpoint");
          this.voice("pilot", id, 1);
        } else if (/destroy|explo|carrier/.test(type)) this.effect("explosion");
        else if (/radio|brief|warning/.test(type)) this.voice("navigator", id, 1);
      }
    }
    clearVoices() {
      for (const n of this.nodes) {
        try {
          n.o.stop();
          n.g.disconnect();
        } catch {}
      }
      this.nodes = [];
    }
    pause(on = true) {
      on = !!on;
      if (on === this.suspended) return;
      this.suspended = on;
      if (on) {
        this.native.music(null);
        this.theme = null;
        this.clearVoices();
        for (const h of this.handles) h.h.stop();
        this.handles = [];
      } else if (this.unlocked && this.lastWorld) this._theme(this.lastWorld);
    }
    stop() {
      this.native.music(null);
      this.theme = null;
      this.clearVoices();
      for (const h of this.handles) h.h.stop();
      this.handles = [];
      this.lastWorld = null;
      this.suspended = true;
    }
    metrics() {
      const samples = new Float32Array(this.analyser?.fftSize || 1024);
      this.analyser?.getFloatTimeDomainData(samples);
      let peak = 0,
        energy = 0,
        finite = true;
      for (const v of samples) {
        finite &&= Number.isFinite(v);
        peak = Math.max(peak, Math.abs(v));
        energy += v * v;
      }
      return {
        unlocked: this.unlocked,
        ready: this.native.ready,
        finite,
        peak,
        rms: Math.sqrt(energy / samples.length),
        musicGain: this.native.musicVolume,
        masterGain: this.native.volume,
        effectsGain: this.native.sfxVolume,
        voiceGain: this.native.voiceVolume,
        suspended: this.suspended,
        activeNodes: this.nodes.length,
        theme: this.theme,
      };
    }
    static renderFixture(ctx, destination = ctx.destination) {
      const root = ctx.createGain();
      root.gain.value = 0.65;
      root.connect(destination);
      instrument("pluck", ctx, root, 0.03, 587.33, 0.18, 0.19);
      instrument("bell", ctx, root, 0.28, 880, 0.4, 0.17);
      babble(ctx, root, 0.8, "survivor", 12);
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(140, 1.4);
      o.frequency.exponentialRampToValueAtTime(1100, 1.8);
      g.gain.setValueAtTime(0.16, 1.4);
      g.gain.exponentialRampToValueAtTime(0.0001, 1.85);
      o.connect(g);
      g.connect(root);
      o.start(1.4);
      o.stop(1.9);
      return { duration: 2, musicDefault: 0.1 };
    }
  }
  F.Audio = Audio;
  F.audioDefinitions = { songs: SONGS, sounds: SOUNDS };
})();
