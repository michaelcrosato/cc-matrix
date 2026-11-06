export function codeTone(
  ctx,
  bus,
  when,
  freq,
  dur = 0.15,
  volume = 0.1,
  wave = "triangle",
  to = null,
) {
  const osc = ctx.createOscillator(),
    gain = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, when);
  if (to)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), when + dur);
  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(volume, when + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(gain);
  gain.connect(bus);
  osc.start(when);
  osc.stop(when + dur + 0.01);
  return osc;
}
export function gibberish(ctx, bus, when, line, emotion = "gloat") {
  const nodes = [],
    count = Math.min(13, 5 + Math.floor(line.length / 8));
  for (let i = 0; i < count; i++) {
    const t = when + i * 0.092,
      dur = 0.065 + (i % 3) * 0.018,
      base = (emotion === "angry" ? 122 : 94) + ((i * 31) % 57),
      o = ctx.createOscillator(),
      v = ctx.createGain(),
      f = ctx.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(base, t);
    o.frequency.exponentialRampToValueAtTime(
      base * (i % 2 ? 1.5 : 0.72),
      t + dur,
    );
    f.type = "bandpass";
    f.frequency.setValueAtTime([680, 1200, 1750, 900, 1450][i % 5], t);
    f.Q.value = 3;
    v.gain.setValueAtTime(0, t);
    v.gain.linearRampToValueAtTime(0.19, t + 0.009);
    v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f);
    f.connect(v);
    v.connect(bus);
    o.start(t);
    o.stop(t + dur + 0.01);
    nodes.push(o);
  }
  return nodes;
}
const MELODIES = {
  title: "D5 . A4 C5 | F5 - E5 . | D5 . A4 . | C5 - A4 .",
  combat: "D5 . . A4 | C5 . F5 . | E5 . C5 . | A4 . . .",
  escalation: "D5 A4 F5 . | E5 C5 G5 . | F5 E5 D5 C5 | A4 . C5 .",
  boss: "D4 D5 . Eb5 | A4 . F5 E5 | D5 . C5 A4 | Bb4 A4 G4 .",
  victory: "D5 F5 A5 - | G5 E5 C5 - | D5 - - - | . . . .",
  failure: "D5 C5 A4 . | F4 E4 D4 - | . . . . | . . . .",
};
export class Soundtrack {
  constructor(game) {
    this.game = game;
    this.kind = null;
    this.nodes = [];
    this.enabled = false;
    this.stopped = false;
    const A = game.audio;
    const sounds = {
      shot: { wave: "triangle", freq: 900, to: 220, dur: 0.075, vol: 0.14 },
      dart: { wave: "sine", freq: 560, to: 290, dur: 0.15, vol: 0.16 },
      mineTurn: { wave: "sine", freq: 310, to: 470, dur: 0.12, vol: 0.1 },
      recover: {
        wave: "triangle",
        freq: 520,
        arp: [0, 5, 9],
        step: 0.07,
        dur: 0.3,
        vol: 0.15,
      },
      commit: { wave: "triangle", freq: 1100, to: 620, dur: 0.1, vol: 0.1 },
      mine: { wave: "pulse", freq: 260, to: 150, dur: 0.25, vol: 0.13 },
      roller: { wave: "triangle", freq: 100, to: 260, dur: 0.25, vol: 0.25 },
      hunter: { wave: "sine", freq: 900, to: 1450, dur: 0.3, vol: 0.11 },
      intercept: { wave: "noise", freq: 1300, to: 180, dur: 0.12, vol: 0.13 },
      kill: { wave: "noise", freq: 800, to: 100, dur: 0.24, vol: 0.17 },
      hit: { wave: "saw", freq: 180, to: 40, dur: 0.4, vol: 0.24 },
      land: { wave: "noise", freq: 300, to: 80, dur: 0.2, vol: 0.23 },
      brake: { wave: "sine", freq: 900, to: 65, dur: 0.7, vol: 0.21 },
      release: { wave: "sine", freq: 90, to: 540, dur: 0.3, vol: 0.15 },
      charged: {
        wave: "triangle",
        freq: 660,
        arp: [0, 4, 7, 12],
        step: 0.05,
        dur: 0.3,
        vol: 0.16,
      },
      weakpoint: { wave: "triangle", freq: 400, to: 800, dur: 0.2, vol: 0.16 },
      shield: { wave: "sine", freq: 420, to: 190, dur: 0.16, vol: 0.13 },
      phaseBreak: { wave: "noise", freq: 750, to: 100, dur: 0.7, vol: 0.25 },
      hullHit: { wave: "triangle", freq: 550, to: 350, dur: 0.055, vol: 0.1 },
      bossHit: { wave: "pulse", freq: 290, to: 420, dur: 0.09, vol: 0.12 },
      blocked: { wave: "sine", freq: 170, dur: 0.09, vol: 0.12 },
      clear: {
        wave: "triangle",
        freq: 400,
        arp: [0, 4, 7],
        step: 0.09,
        dur: 0.4,
        vol: 0.2,
      },
    };
    for (const [name, spec] of Object.entries(sounds))
      A.define("tb:" + name, spec);
  }
  unlock() {
    this.enabled = true;
    this.stopped = false;
    const ctx = this.game.audio._init();
    if (ctx?.state === "suspended") ctx.resume().catch(() => {});
  }
  music(kind) {
    if (kind === this.kind || this.stopped) return;
    this.kind = kind;
    const boss = kind === "boss";
    this.game.audio.music(
      {
        bpm: boss ? 132 : kind === "title" ? 92 : 112,
        steps: 4,
        tracks: [
          {
            name: "lead",
            wave: "triangle",
            vol: 0.18,
            notes: MELODIES[kind] || MELODIES.combat,
          },
          {
            name: "bass",
            wave: "sine",
            vol: 0.2,
            notes: "D3 . D3 . | Bb2 . Bb2 . | C3 . C3 . | A2 . A2 .",
          },
          {
            name: "pulse",
            wave: "pulse12",
            vol: 0.065,
            notes: "A4 . D5 . | F4 . Bb4 . | G4 . C5 . | E4 . A4 .",
          },
          {
            name: "drums",
            wave: "drums",
            vol: 0.09,
            notes: "k . h . | s . h h | k . h . | s h . h",
          },
        ],
      },
      { sync: true },
    );
  }
  events(events) {
    if (!this.enabled || this.stopped || this.game.paused) return;
    for (const e of events) {
      if (e.line && !["hint"].includes(e.type)) {
        this.stopVoice();
        const ctx = this.game.audio.ctx;
        if (ctx)
          this.nodes = gibberish(
            ctx,
            this.game.audio.bus("voice"),
            ctx.currentTime + 0.005,
            e.line,
            e.type === "hit" ? "angry" : "gloat",
          );
      }
      const name =
        e.type === "launch"
          ? e.kind
          : e.type === "intercept"
            ? "intercept"
            : e.type;
      if (this.game.audio.presets["tb:" + name])
        this.game.audio.sfx("tb:" + name, {
          pan: e.x == null ? 0 : (e.x - 320) / 400,
        });
    }
  }
  stopVoice() {
    for (const n of this.nodes)
      try {
        n.stop();
      } catch {}
    this.nodes = [];
  }
  pause() {
    this.stopVoice();
  }
  end() {
    this.stopped = true;
    this.kind = null;
    this.stopVoice();
    this.game.audio.music(null);
    this.game.audio.mute(true);
    const c = this.game.audio.ctx;
    if (c?.state === "running") c.suspend().catch(() => {});
  }
  reset() {
    this.stopVoice();
    this.kind = null;
    this.stopped = false;
    this.game.audio.mute(!this.game.settings.sound);
  }
}
export async function renderAudioEvidence(game) {
  const AC =
    globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  const stats = async (ctx) => {
    const buf = await ctx.startRendering(),
      data = buf.getChannelData(0);
    let peak = 0,
      sum = 0,
      finite = true;
    for (const n of data) {
      if (!Number.isFinite(n)) finite = false;
      peak = Math.max(peak, Math.abs(n));
      sum += n * n;
    }
    return { peak, rms: Math.sqrt(sum / data.length), finite };
  };
  const result = { music: game.settings.music, signals: {}, silent: {} };
  const frequency = (note) => {
    const m = /^([A-G])(#|b)?(\d)$/.exec(note);
    if (!m) return null;
    const semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const midi =
      (Number(m[3]) + 1) * 12 +
      semis[m[1]] +
      (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
    return 440 * 2 ** ((midi - 69) / 12);
  };
  for (const [kind, melody] of Object.entries(MELODIES)) {
    const ctx = new AC(1, 44100 * 3, 44100),
      bus = ctx.createGain();
    bus.gain.value = 0.1;
    bus.connect(ctx.destination);
    const notes = melody.replaceAll("|", "").split(/\s+/).filter(Boolean);
    for (let i = 0; i < notes.length; i++) {
      const f = frequency(notes[i]);
      if (f) codeTone(ctx, bus, i * 0.14, f, 0.17, 0.18, "triangle");
    }
    result.signals["music:" + kind] = await stats(ctx);
  }
  {
    const ctx = new AC(1, 44100 * 2, 44100),
      bus = ctx.createGain();
    bus.connect(ctx.destination);
    gibberish(
      ctx,
      bus,
      0.05,
      "Your century is overdue. I have come to collect!",
    );
    result.signals.voice = await stats(ctx);
  }
  {
    const ctx = new AC(1, 44100 * 3, 44100),
      A = game.audio,
      saved = { ctx: A.ctx, waves: A._waves, noise: A._noise };
    A.ctx = ctx;
    A._waves = {};
    const noise = ctx.createBuffer(1, 44100, 44100),
      d = noise.getChannelData(0);
    let seed = 51;
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      d[i] = seed / 2147483648 - 1;
    }
    A._noise = noise;
    try {
      for (const [i, name] of [
        "shot",
        "dart",
        "mine",
        "roller",
        "hunter",
        "hit",
        "brake",
        "intercept",
        "phaseBreak",
      ].entries())
        A._voice(A.presets["tb:" + name], ctx.destination, i * 0.24, 0.65);
    } finally {
      A.ctx = saved.ctx;
      A._waves = saved.waves;
      A._noise = saved.noise;
    }
    result.signals.effects = await stats(ctx);
  }
  for (const key of ["music", "effects", "voice"]) {
    const ctx = new AC(1, 22050, 44100),
      bus = ctx.createGain();
    bus.gain.value = 0;
    bus.connect(ctx.destination);
    if (key === "voice") gibberish(ctx, bus, 0, "Muted tyrant");
    else codeTone(ctx, bus, 0, 440, 0.3, 0.2, "triangle");
    result.silent[key] = (await stats(ctx)).peak;
  }
  return result;
}
