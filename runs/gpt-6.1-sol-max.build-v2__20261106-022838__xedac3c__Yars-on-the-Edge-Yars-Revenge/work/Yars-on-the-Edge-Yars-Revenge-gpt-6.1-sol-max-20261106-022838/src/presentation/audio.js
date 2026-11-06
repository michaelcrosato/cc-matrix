(() => {
  "use strict";
  const G = globalThis.Edge;
  // Every source has a finite envelope and stop time. Shared by live and OfflineAudioContext checks.
  function tone(
    ctx,
    bus,
    { freq = 220, to = freq, dur = 0.18, vol = 0.07, wave = "triangle", at = ctx.currentTime, filter = 0 },
    pool,
  ) {
    if (!ctx || !bus) return null;
    const o = ctx.createOscillator(),
      amp = ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(freq, at);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + dur);
    amp.gain.setValueAtTime(0, at);
    amp.gain.linearRampToValueAtTime(vol, at + Math.min(0.012, dur * 0.15));
    amp.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    amp.gain.linearRampToValueAtTime(0, at + dur + 0.01);
    let f = null;
    if (filter) {
      f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = filter;
      o.connect(f);
      f.connect(amp);
    } else o.connect(amp);
    amp.connect(bus);
    o.start(at);
    o.stop(at + dur + 0.025);
    pool?.add(o);
    o.onended = () => {
      pool?.delete(o);
      o.disconnect();
      amp.disconnect();
      f?.disconnect();
    };
    return o;
  }
  function noise(ctx, bus, { dur = 0.4, vol = 0.08, at = ctx.currentTime, filter = 1100, seed = 1 }, pool) {
    const n = Math.ceil(ctx.sampleRate * dur),
      buffer = ctx.createBuffer(1, n, ctx.sampleRate),
      data = buffer.getChannelData(0);
    let a = seed || 1;
    for (let i = 0; i < n; i++) {
      a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
      data[i] = (a / 2147483648 - 1) * (1 - i / n) ** 2;
    }
    const src = ctx.createBufferSource(),
      f = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    src.buffer = buffer;
    f.type = "lowpass";
    f.frequency.value = filter;
    gain.gain.value = vol;
    src.connect(f);
    f.connect(gain);
    gain.connect(bus);
    src.start(at);
    src.stop(at + dur + 0.01);
    pool?.add(src);
    src.onended = () => {
      pool?.delete(src);
      src.disconnect();
      f.disconnect();
      gain.disconnect();
    };
    return src;
  }
  function babble(ctx, bus, seed = 1, at = ctx.currentTime, pool) {
    for (let i = 0; i < 5; i++) {
      const start = at + i * 0.095,
        freq = 145 + ((seed * 31 + i * 73) % 210),
        o = ctx.createOscillator(),
        f = ctx.createBiquadFilter(),
        amp = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(freq, start);
      o.frequency.linearRampToValueAtTime(freq * 1.28, start + 0.07);
      f.type = "bandpass";
      f.frequency.value = [750, 1200, 1900, 850, 1500][(i + seed) % 5];
      f.Q.value = 4;
      amp.gain.setValueAtTime(0, start);
      amp.gain.linearRampToValueAtTime(0.1, start + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, start + 0.085);
      amp.gain.linearRampToValueAtTime(0, start + 0.09);
      o.connect(f);
      f.connect(amp);
      amp.connect(bus);
      o.start(start);
      o.stop(start + 0.095);
      pool?.add(o);
      o.onended = () => {
        pool?.delete(o);
        o.disconnect();
        f.disconnect();
        amp.disconnect();
      };
    }
  }
  const songs = [
    {
      bpm: 84,
      steps: 4,
      tracks: [
        {
          name: "drone",
          wave: "triangle",
          vol: 0.13,
          notes: "F#2 - - - - - - - C#2 - - - - - - - D2 - - - - - - - E2 - - - C#2 - - -",
        },
        {
          name: "glass",
          wave: "edgeGlass",
          vol: 0.18,
          notes: "F#4 . . . C#5 . . . A4 . . . E4 . . . F#4 . C#5 . . . A4 . G#4 . . . E4 . . .",
        },
        {
          name: "pulse",
          wave: "pulse12",
          vol: 0.035,
          notes: "F#3 . . . . . C#3 . F#3 . . . . . E3 .",
          on: false,
        },
      ],
    },
    {
      bpm: 98,
      steps: 4,
      tracks: [
        {
          name: "drone",
          wave: "triangle",
          vol: 0.12,
          notes: "D2 - - - - - - - F#2 - - - - - - - C#2 - - - - - - - E2 - - - - - - -",
        },
        {
          name: "glass",
          wave: "edgeGlass",
          vol: 0.19,
          notes: "D5 . A4 . F#4 . . . C#5 . G#4 . E4 . . . A4 . F#4 . E5 . . . C#5 . . . F#4 . . .",
        },
        { name: "pulse", wave: "pulse12", vol: 0.035, notes: "D3 . . D3 . . A2 . . . D3 . . . A2 ." },
      ],
    },
    {
      bpm: 110,
      steps: 4,
      tracks: [
        {
          name: "drone",
          wave: "triangle",
          vol: 0.14,
          notes: "F#2 - - - D2 - - - C#2 - - - E2 - - - F#2 - - - A2 - - - C#2 - - - - - - -",
        },
        {
          name: "glass",
          wave: "edgeGlass",
          vol: 0.18,
          notes: "F#4 . C#5 . A4 . E5 . F#5 . E5 . C#5 . A4 . D5 . A4 . F#4 . E4 . C#5 . . . E5 . . .",
        },
        { name: "pulse", wave: "pulse12", vol: 0.035, notes: "F#3 . F#3 . . C#3 . . D3 . D3 . . E3 . ." },
      ],
    },
  ];
  class Sound {
    constructor(game) {
      this.game = game;
      this.audio = game.audio;
      this.nodes = new Set();
      this.lastEvent = 0;
      this.sector = -1;
      this.enabled = false;
      this.disposed = false;
      this.wasPaused = false;
      this.audio.instrument("edgeGlass", (ctx, bus, at, freq, dur, vol) => {
        tone(
          ctx,
          bus,
          { at, freq, dur: Math.min(0.9, dur * 1.8), vol: vol * 0.45, wave: "sine" },
          this.nodes,
        );
        tone(
          ctx,
          bus,
          { at, freq: freq * 2.005, dur: Math.min(0.5, dur), vol: vol * 0.08, wave: "sine" },
          this.nodes,
        );
      });
    }
    unlock() {
      if (this.disposed || this.game.headless) return;
      this.enabled = true;
      const b = this.audio.bus("sfx");
      if (b && this.audio.ctx.state === "suspended") this.audio.ctx.resume().catch(() => {});
    }
    music(sector = 0) {
      if (this.sector === sector) return;
      this.sector = sector;
      this.audio.music(songs[sector], { sync: true, fade: 0.6 });
    }
    update(state) {
      if (this.disposed || !state) return;
      this.music(state.sector);
      const paused = this.game.paused;
      if (paused && !this.wasPaused) this.stopSources();
      this.wasPaused = paused;
      if (!this.enabled || paused) return;
      this.audio.layer(
        "pulse",
        state.core.mode === "windup" || state.core.mode === "flight" ? 0.055 : 0.02,
        0.2,
      );
      for (const e of state.events || [])
        if (e.id > this.lastEvent) {
          this.effect(e);
          this.lastEvent = e.id;
        }
    }
    effect(e) {
      if (!this.enabled || this.disposed) return;
      const ctx = this.audio.ctx,
        bus = this.audio.bus("sfx");
      if (!ctx || !bus) return;
      const t = (o) => tone(ctx, bus, o, this.nodes),
        n = (o) => noise(ctx, bus, { ...o, seed: e.id }, this.nodes);
      if (e.type === "shot") {
        if (e.id % 3 === 0) t({ freq: 1050, to: 550, dur: 0.055, vol: 0.025 });
      }
      if (e.type === "cell") {
        t({
          freq: e.kind === "bite" ? 180 : 420,
          to: e.kind === "bite" ? 490 : 170,
          dur: 0.055,
          vol: 0.04,
          wave: "square",
        });
        n({ dur: 0.05, vol: 0.025, filter: 1800 });
      }
      if (e.type === "ready" || e.type === "refill") {
        for (let i = 0; i < 3; i++)
          t({
            freq: [440, 659, 880][i],
            at: ctx.currentTime + i * 0.08,
            dur: 0.21,
            vol: 0.065,
            wave: "sine",
          });
      }
      if (e.type === "swirl-wind") {
        t({ freq: 105, to: 570, dur: 1.1, vol: 0.11, wave: "sawtooth", filter: 1000 });
        t({ freq: 112, to: 610, dur: 1.1, vol: 0.035, wave: "sine" });
      }
      if (e.type === "swirl-launch") {
        n({ dur: 0.7, vol: 0.09, filter: 1400 });
        t({ freq: 480, to: 62, dur: 0.7, vol: 0.14 });
      }
      if (e.type === "cannon-call")
        t({ freq: 100, to: 900, dur: 0.26, vol: 0.12, wave: "square", filter: 1300 });
      if (e.type === "cannon-launch" || e.type === "cannon-return") {
        t({ freq: 90, to: 28, dur: 0.7, vol: 0.26, wave: "sawtooth", filter: 500 });
        n({ dur: 0.55, vol: 0.17, filter: 2400 });
      }
      if (e.type === "reflect") {
        for (let i = 0; i < 3; i++)
          t({
            at: ctx.currentTime + i * 0.13,
            freq: 1400 - i * 180,
            to: 400,
            dur: 0.12,
            vol: 0.1,
            wave: "square",
            filter: 2300,
          });
      }
      if (["core-hit", "collapse", "death"].includes(e.type)) {
        n({ dur: e.type === "collapse" ? 2 : 0.7, vol: 0.2, filter: 900 });
        t({ freq: 75, to: 24, dur: 1.2, vol: 0.21, wave: "sawtooth", filter: 430 });
      }
      if (e.type === "refuge-warning") {
        for (let i = 0; i < 3; i++)
          t({ at: ctx.currentTime + i * 0.4, freq: 330, to: 270, dur: 0.17, vol: 0.07, wave: "sine" });
      }
      if (["sector", "phase", "airborne-bonus", "victory"].includes(e.type))
        babble(ctx, this.audio.bus("voice"), e.id % 13, ctx.currentTime, this.nodes);
    }
    stopSources() {
      for (const n of this.nodes) {
        try {
          n.stop();
          n.disconnect();
        } catch {}
      }
      this.nodes.clear();
    }
    reset() {
      this.stopSources();
      this.lastEvent = 0;
      this.sector = -1;
    }
    dispose() {
      this.stopSources();
      this.audio.music(null);
      this.audio.mute(true);
      this.disposed = true;
      try {
        this.audio.ctx?.suspend();
      } catch {}
    }
    static offline(ctx, bus) {
      tone(ctx, bus, { freq: 220, to: 65, dur: 0.5, vol: 0.12, at: 0 });
      noise(ctx, bus, { dur: 0.8, vol: 0.1, at: 0.3, seed: 47 });
      babble(ctx, bus, 4, 1.3);
    }
  }
  Object.assign(G, { Sound, synthTone: tone, synthNoise: noise, synthBabble: babble });
})();
