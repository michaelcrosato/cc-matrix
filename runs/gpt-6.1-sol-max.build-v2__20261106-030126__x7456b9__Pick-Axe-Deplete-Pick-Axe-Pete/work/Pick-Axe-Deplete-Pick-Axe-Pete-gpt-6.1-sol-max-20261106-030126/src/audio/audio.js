/* Pick Axe Deplete: native chip score and original procedural mine instruments.
 * Presentation-only. No random draw here can affect the mine simulation. */
(() => {
  globalThis.PD ||= {};
  const PD = globalThis.PD;
  const clamp = (n, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
  const defaults = Object.freeze({
    music: 0.1,
    sfx: 0.7,
    voice: 0.4,
    mute: false,
  });
  const NOTES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const frequency = (token) => {
    const m = /^([A-G])([#b]?)(\d)$/.exec(token);
    return m
      ? 440 * 2 ** ((NOTES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12 - 69) / 12)
      : 0;
  };

  // Both the native sequencer and the offline proof play these exact functions.
  function tone(ctx, bus, t, f, dur, vol, kind, track) {
    const end = t + Math.max(0.025, dur);
    const envelope = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = kind === 'bass' ? 'lowpass' : 'bandpass';
    filter.frequency.setValueAtTime(kind === 'bell' ? f * 2.2 : kind === 'bass' ? 800 : 1800, t);
    filter.Q.value = kind === 'bell' ? 1.7 : 0.55;
    envelope.gain.setValueAtTime(0, t);
    envelope.gain.linearRampToValueAtTime(vol, t + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.00001, end);
    filter.connect(envelope);
    envelope.connect(bus);
    const waves =
      kind === 'bell'
        ? [
            ['sine', 1, 0],
            ['sine', 2.01, 0.2],
          ]
        : kind === 'bass'
          ? [['triangle', 1, 0]]
          : [
              ['triangle', 1, 0],
              ['sawtooth', 1.003, 0.08],
            ];
    for (const [wave, ratio, share] of waves) {
      const osc = ctx.createOscillator();
      const part = ctx.createGain();
      part.gain.value = share || 1;
      osc.type = wave;
      osc.frequency.setValueAtTime(f * ratio, t);
      if (kind === 'pluck') osc.frequency.exponentialRampToValueAtTime(f * ratio * 0.995, t + 0.06);
      osc.connect(part);
      part.connect(filter);
      if (track) track(osc, end + 0.02, [part, filter, envelope]);
      osc.start(t);
      osc.stop(end + 0.02);
    }
  }

  function strike(ctx, bus, t, f, dur, vol, track) {
    const oscillator = ctx.createOscillator(),
      amp = ctx.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(f, t);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(35, f * 0.35), t + dur);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(vol, t + 0.002);
    amp.gain.exponentialRampToValueAtTime(0.00001, t + dur);
    oscillator.connect(amp);
    amp.connect(bus);
    if (track) track(oscillator, t + dur + 0.02, [amp]);
    oscillator.start(t);
    oscillator.stop(t + dur + 0.02);
  }

  function syllable(ctx, bus, t, f, vowel, vol, track) {
    const oscillator = ctx.createOscillator(),
      amp = ctx.createGain();
    const filters = [ctx.createBiquadFilter(), ctx.createBiquadFilter()];
    const formants = [
      [620, 1120],
      [380, 1850],
      [470, 890],
      [750, 1320],
    ][vowel % 4];
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(f, t);
    oscillator.frequency.exponentialRampToValueAtTime(f * 1.13, t + 0.035);
    oscillator.frequency.exponentialRampToValueAtTime(f * 0.91, t + 0.08);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(vol, t + 0.009);
    amp.gain.setValueAtTime(vol * 0.72, t + 0.035);
    amp.gain.linearRampToValueAtTime(0, t + 0.085);
    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i];
      filter.type = 'bandpass';
      filter.Q.value = 4;
      filter.frequency.setValueAtTime(formants[i], t);
      oscillator.connect(filter);
      filter.connect(amp);
    }
    amp.connect(bus);
    if (track) track(oscillator, t + 0.1, [amp, ...filters]);
    oscillator.start(t);
    oscillator.stop(t + 0.1);
  }

  const SCORE = [
    {
      bpm: 114,
      steps: 2,
      tracks: [
        {
          name: 'pick',
          wave: 'pdPluck',
          vol: 0.3,
          gate: 0.58,
          notes: 'D5 . F#5 A5 . F#5 D5 . E5 . F#5 E5 D5 . A4 . | D5 . F#5 A5 B5 . A5 F#5 E5 . D5 . A4 . D5 .',
        },
        {
          name: 'bass',
          wave: 'pdBass',
          vol: 0.25,
          gate: 0.65,
          notes: 'D3 . A3 . D3 . A3 . G3 . D3 . A2 . A3 .',
        },
        {
          name: 'work',
          wave: 'pdStrike',
          vol: 0.1,
          notes: 'D3 . . A3 D3 . A3 . D3 . . A3 D3 A3 . A3',
        },
        {
          name: 'pressure',
          wave: 'pdBell',
          vol: 0.13,
          on: false,
          gate: 0.4,
          notes: '. A5 . F#5 . A5 . B5 . A5 . F#5 . E5 . A5',
        },
      ],
    },
    {
      bpm: 122,
      steps: 2,
      tracks: [
        {
          name: 'pick',
          wave: 'pdPluck',
          vol: 0.28,
          gate: 0.65,
          notes: 'G5 . A5 B5 . D6 B5 . A5 G5 . E5 D5 . E5 . | G5 . B5 D6 E6 . D6 B5 A5 . G5 . E5 D5 G5 .',
        },
        {
          name: 'bass',
          wave: 'pdBass',
          vol: 0.27,
          gate: 0.6,
          notes: 'G2 . D3 . G3 . D3 . C3 . G3 . D3 . A3 .',
        },
        {
          name: 'work',
          wave: 'pdStrike',
          vol: 0.11,
          notes: 'G3 . D4 . G3 D4 . D4 G3 . D4 . G3 . D4 .',
        },
        {
          name: 'pressure',
          wave: 'pdBell',
          vol: 0.13,
          on: false,
          gate: 0.4,
          notes: 'D6 . B5 . . D6 . E6 D6 . B5 . A5 . D6 .',
        },
      ],
    },
    {
      bpm: 128,
      steps: 2,
      tracks: [
        {
          name: 'pick',
          wave: 'pdPluck',
          vol: 0.29,
          gate: 0.6,
          notes: 'E5 G5 B5 . D6 B5 G5 . A5 . G5 E5 D5 . E5 . | E5 G5 B5 D6 E6 . D6 B5 G5 A5 B5 . G5 . E5 .',
        },
        {
          name: 'bass',
          wave: 'pdBass',
          vol: 0.28,
          gate: 0.66,
          notes: 'E3 . B2 . E3 B3 . B2 A2 . E3 . B2 . B3 .',
        },
        {
          name: 'work',
          wave: 'pdStrike',
          vol: 0.12,
          notes: 'E3 . E4 B3 E3 . B3 . E3 E4 . B3 E3 . B3 E4',
        },
        {
          name: 'pressure',
          wave: 'pdBell',
          vol: 0.13,
          on: false,
          gate: 0.45,
          notes: 'B5 . D6 . E6 . D6 B5 . G5 . A5 B5 . E6 .',
        },
      ],
    },
  ];
  const FINALE = {
    bpm: 142,
    steps: 2,
    tracks: [
      {
        name: 'pick',
        wave: 'pdPluck',
        vol: 0.28,
        gate: 0.55,
        notes: 'E5 B5 E6 . D6 B5 G5 E5 G5 B5 D6 E6 D6 B5 G5 . | A5 E6 A6 . G6 E6 D6 B5 G5 B5 E6 . D6 B5 E6 .',
      },
      {
        name: 'bass',
        wave: 'pdBass',
        vol: 0.3,
        gate: 0.63,
        notes: 'E3 E3 B2 . E3 . B3 B2 A2 A2 E3 . B2 . B3 B2',
      },
      {
        name: 'work',
        wave: 'pdStrike',
        vol: 0.12,
        notes: 'E3 E4 . B3 E3 . E4 B3 E3 . E4 B3 E3 B3 E4 B3',
      },
      {
        name: 'pressure',
        wave: 'pdBell',
        vol: 0.13,
        gate: 0.4,
        notes: '. E6 . B5 . D6 . B5 . E6 . G6 . E6 . B5',
      },
    ],
  };
  const WIN = {
    bpm: 126,
    steps: 2,
    tracks: [
      {
        wave: 'pdPluck',
        vol: 0.34,
        notes: 'D5 F#5 A5 D6 . A5 B5 D6 F#6 - E6 D6 A5 - D6 - - -',
      },
      {
        wave: 'pdBass',
        vol: 0.28,
        notes: 'D3 . A3 . B2 . F#3 . G3 . A3 . D3 - - - - -',
      },
      {
        wave: 'pdBell',
        vol: 0.22,
        notes: '. . D6 . F#6 . A6 . D7 - - - A6 . D7 - - -',
      },
    ],
  };
  const LOSE = {
    bpm: 88,
    steps: 2,
    tracks: [
      { wave: 'pdPluck', vol: 0.32, notes: 'A5 . G5 . E5 D5 . A4 D5 - - -' },
      { wave: 'pdBass', vol: 0.3, notes: 'D3 . C3 . B2 . A2 . D2 - - -' },
    ],
  };

  const EFFECTS = {
    step: {
      wave: 'noise',
      freq: 1100,
      to: 280,
      dur: 0.035,
      vol: 0.09,
      filter: 'lowpass',
    },
    climb: { wave: 'triangle', freq: 430, to: 600, dur: 0.055, vol: 0.13 },
    warningOre: [
      { wave: 'triangle', freq: 196, dur: 0.12, vol: 0.25 },
      { wave: 'square', freq: 392, dur: 0.09, vol: 0.06, delay: 0.15 },
    ],
    warningBounce: [
      { wave: 'sine', freq: 440, to: 660, dur: 0.11, vol: 0.3 },
      { wave: 'sine', freq: 660, to: 880, dur: 0.1, vol: 0.24, delay: 0.14 },
    ],
    warningHeavy: [
      { wave: 'triangle', freq: 95, to: 65, dur: 0.28, vol: 0.34 },
      {
        wave: 'noise',
        freq: 350,
        to: 100,
        dur: 0.18,
        vol: 0.17,
        filter: 'lowpass',
        delay: 0.1,
      },
    ],
    chop: {
      wave: 'noise',
      freq: 3100,
      to: 850,
      dur: 0.095,
      vol: 0.21,
      filter: 'highpass',
    },
    redirect: [
      { wave: 'sine', freq: 320, to: 1440, dur: 0.14, vol: 0.28 },
      { wave: 'noise', freq: 2100, to: 600, dur: 0.07, vol: 0.13 },
    ],
    ore: [
      { wave: 'triangle', freq: 1280, to: 720, dur: 0.16, vol: 0.3 },
      { wave: 'noise', freq: 900, to: 260, dur: 0.11, vol: 0.25 },
    ],
    collision: [
      {
        wave: 'noise',
        freq: 1400,
        to: 90,
        dur: 0.31,
        vol: 0.38,
        filter: 'lowpass',
      },
      { wave: 'sine', freq: 130, to: 46, dur: 0.25, vol: 0.34 },
      {
        wave: 'triangle',
        freq: 1760,
        to: 800,
        dur: 0.16,
        vol: 0.16,
        delay: 0.07,
      },
    ],
    wear: { wave: 'triangle', freq: 1568, to: 1250, dur: 0.13, vol: 0.2 },
    break: [
      { wave: 'noise', freq: 2400, to: 130, dur: 0.2, vol: 0.32 },
      {
        wave: 'square',
        freq: 700,
        arp: [0, -5, -12],
        step: 0.06,
        dur: 0.22,
        vol: 0.16,
      },
    ],
    pick: {
      wave: 'triangle',
      freq: 660,
      arp: [0, 4, 7, 12],
      step: 0.055,
      dur: 0.27,
      vol: 0.28,
    },
    key: {
      wave: 'triangle',
      freq: 1047,
      arp: [0, 7, 12, 19],
      step: 0.06,
      dur: 0.32,
      vol: 0.27,
    },
    keyRise: {
      wave: 'sine',
      freq: 660,
      arp: [0, 7, 12, 19],
      step: 0.1,
      dur: 0.5,
      vol: 0.19,
    },
    supply: {
      wave: 'triangle',
      freq: 1200,
      arp: [0, -5, -9],
      step: 0.09,
      dur: 0.32,
      vol: 0.18,
    },
    swingRedirect: { wave: 'sine', freq: 280, to: 620, dur: 0.085, vol: 0.13 },
    armor: [
      { wave: 'triangle', freq: 880, to: 370, dur: 0.13, vol: 0.2 },
      { wave: 'noise', freq: 1700, to: 400, dur: 0.055, vol: 0.12 },
    ],
    keyLost: { wave: 'sine', freq: 1400, to: 320, dur: 0.32, vol: 0.22 },
    hurt: {
      wave: 'pulse',
      freq: 460,
      to: 140,
      dur: 0.23,
      vol: 0.27,
      vib: [26, 0.03],
    },
    down: {
      wave: 'triangle',
      freq: 520,
      arp: [0, -4, -7, -12],
      step: 0.075,
      dur: 0.36,
      vol: 0.3,
    },
    rescue: {
      wave: 'triangle',
      freq: 523,
      arp: [0, 4, 7, 12, 16],
      step: 0.065,
      dur: 0.36,
      vol: 0.28,
    },
    jam: [
      { wave: 'saw', freq: 140, to: 95, dur: 0.18, vol: 0.13 },
      {
        wave: 'triangle',
        freq: 185,
        to: 130,
        dur: 0.12,
        vol: 0.2,
        delay: 0.15,
      },
    ],
    door: [
      {
        wave: 'noise',
        freq: 500,
        to: 150,
        dur: 0.45,
        vol: 0.23,
        filter: 'lowpass',
      },
      {
        wave: 'triangle',
        freq: 196,
        arp: [0, 7, 12],
        step: 0.1,
        dur: 0.38,
        vol: 0.26,
      },
    ],
    wave: [
      {
        wave: 'triangle',
        freq: 165,
        arp: [0, 0, 7],
        step: 0.14,
        dur: 0.45,
        vol: 0.3,
      },
      { wave: 'noise', freq: 600, to: 150, dur: 0.4, vol: 0.13, delay: 0.1 },
    ],
    ui: { wave: 'triangle', freq: 740, to: 880, dur: 0.05, vol: 0.13 },
    jump: { wave: 'pulse', freq: 280, to: 600, dur: 0.11, vol: 0.2 },
    land: {
      wave: 'noise',
      freq: 600,
      to: 150,
      dur: 0.06,
      vol: 0.12,
      filter: 'lowpass',
    },
    ladder: [
      { wave: 'triangle', freq: 980, dur: 0.07, vol: 0.16 },
      { wave: 'triangle', freq: 740, dur: 0.07, vol: 0.16, delay: 0.11 },
    ],
  };

  class MineAudio {
    constructor(game) {
      this.game = game;
      this.native = game.audio;
      this.settings = { ...defaults };
      this.awakened = false;
      this.stopped = false;
      this.disposed = false;
      this.songKey = null;
      this.sources = new Set();
      this.effects = [];
      this.seen = new Set();
      this.seenOrder = [];
      this.cooldowns = new Map();
      this.elapsed = 0;
      this.lastVoice = -10;
      this.eventCount = 0;
      this.seed = 0x4d494e45;
      this.lastSnapshot = null;
      this._track = this._track.bind(this);
      const native = this.native;
      for (const [id, voice] of Object.entries(EFFECTS)) native.define(`pd:${id}`, voice);
      native.instrument('pdPluck', (c, b, t, f, d, v) =>
        tone(c, b, t, f, Math.min(d, 0.35), v, 'pluck', this._track),
      );
      native.instrument('pdBass', (c, b, t, f, d, v) => tone(c, b, t, f, d, v, 'bass', this._track));
      native.instrument('pdBell', (c, b, t, f, d, v) =>
        tone(c, b, t, f, Math.min(0.55, d * 1.4), v, 'bell', this._track),
      );
      native.instrument('pdStrike', (c, b, t, f, _d, v) => strike(c, b, t, f, 0.075, v * 1.6, this._track));
      this.set(defaults);
    }

    _track(source, end, nodes) {
      if (this.stopped || this.disposed) {
        try {
          source.disconnect();
        } catch (_) {}
        return;
      }
      const entry = { source, end, nodes };
      this.sources.add(entry);
      source.addEventListener(
        'ended',
        () => {
          this.sources.delete(entry);
          try {
            source.disconnect();
            for (const n of nodes) n.disconnect();
          } catch (_) {}
        },
        { once: true },
      );
    }

    async wake() {
      if (this.disposed || this.game.headless) return false;
      this.stopped = false;
      this.awakened = true;
      this.set(this.settings);
      this.native.bus('master');
      const context = this.native.ctx;
      if (!context) return false;
      try {
        if (context.state === 'suspended') await context.resume();
      } catch (_) {
        return false;
      }
      return context.state === 'running';
    }

    set(settings = {}) {
      for (const key of ['music', 'sfx', 'voice'])
        if (settings[key] !== undefined) this.settings[key] = clamp(Number(settings[key]));
      if (settings.mute !== undefined) this.settings.mute = !!settings.mute;
      const n = this.native;
      n.musicVolume = this.settings.music;
      n.sfxVolume = this.settings.sfx;
      n.voiceVolume = this.settings.voice;
      n.muted = this.stopped || this.settings.mute;
      n.applyVolume();
      return { ...this.settings };
    }

    update(dt, snapshot = {}) {
      if (this.disposed || this.stopped) return;
      this.elapsed += Math.max(0, dt || 0);
      this.lastSnapshot = snapshot;
      if (!this.awakened || this.game.headless) return;
      const n = this.native,
        c = n.ctx;
      this.effects = this.effects.filter((e) => e.end > (c ? c.currentTime : 0));
      if (snapshot.status === 'ended') {
        this.stop();
        return;
      }
      if (['victory', 'failure', 'won', 'lost', 'wipe', 'time-up'].includes(snapshot.status)) return;
      const chapter = clamp(Math.floor(snapshot.chamber || 0), 0, 2);
      const final = chapter === 2 && (snapshot.finale?.wave || 0) > 0;
      const key = final ? 'finale' : `chamber:${chapter}`;
      if (key !== this.songKey) {
        n.music(final ? FINALE : SCORE[chapter], {
          sync: true,
          fade: 0.3,
          restart: true,
        });
        this.songKey = key;
      }
      const pressure = snapshot.relief > 0 ? 0 : clamp(Number(snapshot.pressure) || 0);
      n.layer('pressure', final ? 1 : pressure, 0.35);
      n.layer('work', snapshot.relief > 0 ? 0.3 : 0.75 + pressure * 0.25, 0.35);
      const tempo = final
        ? 142 + Math.max(0, (snapshot.finale?.wave || 1) - 1) * 3
        : SCORE[chapter].bpm + pressure * 6;
      if (n.song && Math.abs(n.song.bpm - tempo) > 0.2) n.tempo(tempo);
    }

    _random() {
      let n = this.seed;
      n ^= n << 13;
      n ^= n >>> 17;
      n ^= n << 5;
      this.seed = n >>> 0;
      return this.seed / 4294967296;
    }

    _babble(mood, seat) {
      if (
        this.elapsed - this.lastVoice < 0.8 ||
        !this.native.ready ||
        this.settings.voice === 0 ||
        this.settings.mute
      )
        return;
      this.lastVoice = this.elapsed;
      const ctx = this.native.ctx,
        bus = this.native.bus('voice');
      if (!ctx || !bus) return;
      const base = seat === 1 ? 225 : 175;
      const pitches = mood === 'alarm' ? [7, 4, -3] : mood === 'boast' ? [0, 5, 2, 7] : [0, 4, 7];
      const time = ctx.currentTime + 0.012;
      for (let i = 0; i < pitches.length; i++)
        syllable(
          ctx,
          bus,
          time + i * 0.09,
          base * 2 ** (pitches[i] / 12),
          Math.floor(this._random() * 4),
          0.28,
          this._track,
        );
    }

    event(event = {}) {
      if (this.disposed || this.stopped) return false;
      const { id, type } = event;
      if (id != null) {
        if (this.seen.has(id)) return false;
        this.seen.add(id);
        this.seenOrder.push(id);
        if (this.seenOrder.length > 1024) this.seen.delete(this.seenOrder.shift());
      }
      this.eventCount++;
      if (!this.awakened || this.game.headless || !this.native.ready) return false;
      const native = this.native;
      if (type === 'victory' || type === 'failure') {
        native.music(type === 'victory' ? WIN : LOSE, {
          loop: false,
          sync: false,
          fade: 0.1,
          restart: true,
        });
        this.songKey = type;
        this._babble(type === 'victory' ? 'boast' : 'alarm', event.p);
        return true;
      }
      const aliases = {
        rung: 'climb',
        ladderWarn: 'ladder',
        ladderExpire: 'keyLost',
        ladderForm: 'climb',
        ladderDismount: 'land',
        keyExpire: 'keyLost',
        pickExpire: 'keyLost',
        waveClear: 'rescue',
        recovery: 'land',
        reviveCost: 'rescue',
        join: 'ui',
        leave: 'ui',
        retry: 'ui',
        entry: 'door',
        duck: 'step',
        evade: 'ui',
      };
      let sound = aliases[type] || type;
      if (type === 'swing') sound = event.kind === 'redirect' ? 'swingRedirect' : 'chop';
      if (type === 'warning')
        sound =
          event.kind === 'heavy'
            ? 'warningHeavy'
            : ['hopper', 'bounce', 'bouncer', 'high'].includes(event.kind)
              ? 'warningBounce'
              : 'warningOre';
      if (!EFFECTS[sound]) return false;
      const cooldown = ['step', 'climb'].includes(sound) ? 0.08 : type === 'warning' ? 0.15 : 0.035;
      if (this.elapsed - (this.cooldowns.get(sound) ?? -10) < cooldown) return false;
      this.cooldowns.set(sound, this.elapsed);
      const pan = Number.isFinite(event.x) ? clamp((event.x / 480) * 2 - 1, -0.8, 0.8) : 0;
      const handle = native.sfx(`pd:${sound}`, { pan, vary: 0.018 });
      if (handle?.playing) this.effects.push({ handle, end: native.ctx.currentTime + 1.2 });
      if (['break', 'hurt', 'down', 'jam'].includes(type)) this._babble('alarm', event.p);
      if (['pick', 'key', 'rescue', 'door', 'entry', 'waveClear'].includes(type))
        this._babble(['door', 'entry'].includes(type) ? 'boast' : 'delight', event.p);
      return !!handle?.playing;
    }

    stop() {
      if (this.disposed) return;
      this.stopped = true;
      this.songKey = null;
      const n = this.native;
      n.muted = true;
      n.applyVolume();
      for (const { handle } of this.effects) handle.stop(0);
      this.effects.length = 0;
      for (const entry of this.sources) {
        try {
          entry.source.stop();
          entry.source.disconnect();
          for (const node of entry.nodes) node.disconnect();
        } catch (_) {}
      }
      this.sources.clear();
      // The public stop stops the current score; draining its native crossfade/sting
      // lists makes the engine's scheduler unable to schedule another source at end.
      n.stopMusic(0);
      for (const song of [...(n._fading || []), ...(n._stings || [])]) {
        if (song.bus)
          try {
            song.bus.disconnect();
          } catch (_) {}
      }
      if (n._fading) n._fading.length = 0;
      if (n._stings) n._stings.length = 0;
      if (n._timer) {
        clearInterval(n._timer);
        n._timer = null;
      }
      this.cooldowns.clear();
      this.seen.clear();
      this.seenOrder.length = 0;
    }

    dispose() {
      if (this.disposed) return;
      this.stop();
      this.disposed = true;
      this.awakened = false;
    }

    diagnostics() {
      const n = this.native;
      return {
        awakened: this.awakened,
        stopped: this.stopped,
        disposed: this.disposed,
        context: n.ctx?.state || 'none',
        musicGain: n.musicVolume,
        sfxGain: n.sfxVolume,
        voiceGain: n.voiceVolume,
        muted: n.muted,
        song: this.songKey,
        activeSources: this.sources.size,
        activeEffects: this.effects.filter((e) => e.end > (n.ctx?.currentTime || 0)).length,
        scheduled: !!n._timer,
        events: this.eventCount,
      };
    }

    async renderProof() {
      const Offline = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
      if (!Offline) return { available: false, reason: 'OfflineAudioContext unavailable' };
      const sampleRate = 24000,
        duration = 2.4;
      const render = async (muted, voiceLevel, sfxLevel, musicLevel) => {
        const ctx = new Offline(4, Math.ceil(sampleRate * duration), sampleRate);
        const merge = ctx.createChannelMerger(4),
          total = ctx.createGain();
        const channels = ['music', 'sfx', 'voice'].map((_, index) => {
          const gain = ctx.createGain();
          gain.gain.value = muted ? 0 : [musicLevel, sfxLevel, voiceLevel][index];
          gain.connect(merge, 0, index);
          gain.connect(total);
          return gain;
        });
        total.gain.value = 0.7;
        total.connect(merge, 0, 3);
        merge.connect(ctx.destination);
        for (let k = 0; k < 8; k++) {
          const f = frequency(['D5', 'F#5', 'A5', 'D6', 'B5', 'A5', 'F#5', 'D5'][k]);
          tone(ctx, channels[0], 0.04 + k * 0.17, f, 0.15, 0.3, 'pluck');
          if (k % 2 === 0) tone(ctx, channels[0], 0.04 + k * 0.17, f / 4, 0.22, 0.26, 'bass');
        }
        strike(ctx, channels[1], 0.2, 130, 0.22, 0.4);
        tone(ctx, channels[1], 0.55, 1047, 0.25, 0.3, 'bell');
        for (let k = 0; k < 4; k++)
          syllable(ctx, channels[2], 0.8 + k * 0.09, 175 * 2 ** ([0, 4, 7, 12][k] / 12), k, 0.28);
        // Proof cleanup: every envelope finishes before 1.55 s; 1.8+ must be silent.
        const buffer = await ctx.startRendering();
        return [0, 1, 2, 3].map((channel) => {
          const data = buffer.getChannelData(channel);
          let peak = 0,
            sum = 0,
            tail = 0;
          for (let i = 0; i < data.length; i++) {
            const x = Math.abs(data[i]);
            peak = Math.max(peak, x);
            sum += x * x;
            if (i > sampleRate * 1.8) tail = Math.max(tail, x);
          }
          return { peak, rms: Math.sqrt(sum / data.length), tail };
        });
      };
      const normal = await render(false, 0.4, 0.7, 0.1);
      const silent = await render(true, 0.4, 0.7, 0.1);
      const voiceOff = await render(false, 0, 0.7, 0.1);
      return {
        available: true,
        defaultMusicGain: defaults.music,
        channels: {
          music: normal[0],
          sfx: normal[1],
          voice: normal[2],
          total: normal[3],
        },
        mutePeak: Math.max(...silent.map((s) => s.peak)),
        voiceOffPeak: voiceOff[2].peak,
        cleanupPeak: Math.max(...normal.map((s) => s.tail)),
        peakBounded: normal.every((s) => s.peak < 1),
      };
    }
  }

  PD.MineAudio = MineAudio;
  PD.AUDIO_DEFAULTS = defaults;
})();
