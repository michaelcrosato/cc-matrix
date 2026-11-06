// Every sound is synthesized. Native music/effects/voice buses own the user's gain exactly once.
export function formant(
  ctx,
  bus,
  time,
  freq = 190,
  duration = 0.13,
  vol = 0.055,
  index = 0,
) {
  const osc = ctx.createOscillator(),
    filter = ctx.createBiquadFilter(),
    gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, time);
  osc.frequency.exponentialRampToValueAtTime(
    freq * (index % 2 ? 1.35 : 0.8),
    time + duration,
  );
  filter.type = 'bandpass';
  filter.frequency.value = [780, 1200, 1700, 950][index % 4];
  filter.Q.value = 4;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(filter).connect(gain).connect(bus);
  osc.start(time);
  osc.stop(time + duration + 0.02);
  osc.onended = () => {
    osc.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
  return osc;
}
export function lute(ctx, bus, time, freq, dur, vol) {
  const osc = ctx.createOscillator(),
    g = ctx.createGain(),
    f = ctx.createBiquadFilter();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  f.type = 'lowpass';
  f.frequency.setValueAtTime(3500, time);
  f.frequency.exponentialRampToValueAtTime(500, time + Math.max(0.04, dur));
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(vol, time + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(0.04, dur));
  osc.connect(f).connect(g).connect(bus);
  osc.start(time);
  osc.stop(time + dur + 0.04);
  osc.onended = () => {
    osc.disconnect();
    f.disconnect();
    g.disconnect();
  };
}
export const MARCH = {
  bpm: 104,
  steps: 4,
  tracks: [
    {
      wave: 'siegeLute',
      vol: 0.13,
      notes:
        'D4 . A4 . D5 - C5 . B4 . A4 . G4 . E4 . | F4 . A4 . D5 . F5 - E5 . D5 . C5 . A4 . | G4 . B4 . E5 . D5 . C5 . A4 . F4 . E4 . | D4 . F4 . A4 . D5 - A4 . F4 . D4 - . .',
    },
    {
      wave: 'triangle',
      vol: 0.12,
      notes:
        'D3 . . . A2 . . . D3 . . . A2 . . . | F3 . . . C3 . . . F3 . . . A2 . . . | G2 . . . D3 . . . A2 . . . A2 . . . | D3 . . . A2 . . . D3 . . . D3 . . .',
    },
    { wave: 'drums', vol: 0.045, notes: 'k . . h . . s . k . h . s . . h' },
  ],
};
export class SiegeAudio {
  constructor(game) {
    this.game = game;
    this.lastVoice = -100;
    this.voices = [];
    this.effects = [];
    this.ended = false;
    const a = game.audio;
    a.instrument('siegeLute', lute);
    const patches = {
      siegeWind: { wave: 'noise', freq: 260, to: 450, dur: 0.06, vol: 0.06 },
      siegeLaunch: [
        { wave: 'noise', freq: 650, to: 130, dur: 0.17, vol: 0.12 },
        { wave: 'triangle', freq: 95, to: 45, dur: 0.13, vol: 0.13 },
      ],
      siegeStone: [
        { wave: 'noise', freq: 950, to: 110, dur: 0.24, vol: 0.12 },
        { wave: 'sine', freq: 130, to: 45, dur: 0.2, vol: 0.15 },
      ],
      siegeWood: { wave: 'noise', freq: 1700, to: 300, dur: 0.17, vol: 0.14 },
      siegeCrew: { wave: 'triangle', freq: 440, to: 230, dur: 0.16, vol: 0.1 },
      siegeArmor: [
        { wave: 'square', freq: 180, to: 75, dur: 0.12, vol: 0.07 },
        { wave: 'sine', freq: 840, to: 420, dur: 0.24, vol: 0.06 },
      ],
      siegeWater: { wave: 'sine', freq: 320, to: 70, dur: 0.24, vol: 0.14 },
      siegeRepair: {
        wave: 'triangle',
        freq: 370,
        to: 210,
        dur: 0.045,
        vol: 0.09,
      },
      siegeReturn: {
        wave: 'triangle',
        freq: 440,
        arp: [0, 4, 7, 12],
        step: 0.06,
        dur: 0.26,
        vol: 0.1,
      },
      siegeCancel: { wave: 'sine', freq: 240, to: 140, dur: 0.09, vol: 0.06 },
    };
    for (const k in patches) a.define(k, patches[k]);
  }
  music(court = 0) {
    if (this.ended) return;
    const song = {
      ...MARCH,
      bpm: [104, 96, 112, 86, 123][court],
      tracks: MARCH.tracks,
    };
    this.game.audio.music(song, { sync: true });
  }
  voice(variant = 0) {
    if (this.ended || this.game.real - this.lastVoice < 3) return;
    this.lastVoice = this.game.real;
    const a = this.game.audio,
      bus = a.bus('voice'),
      ctx = a.ctx;
    if (!ctx || !bus || ctx.state !== 'running') return;
    for (let i = 0; i < 4; i++)
      this.voices.push(
        formant(
          ctx,
          bus,
          ctx.currentTime + i * 0.105,
          variant ? 145 + i * 13 : 210 - i * 15,
          0.1,
          0.09,
          i + variant,
        ),
      );
    this.voices = this.voices
      .filter((o) => o.context.currentTime < o.context.currentTime + 1)
      .slice(-20);
  }
  play(name, options) {
    const effect = this.game.audio.sfx(name, options);
    this.effects.push(effect);
    if (this.effects.length > 80) this.effects.shift();
    return effect;
  }
  event(e) {
    if (this.ended) return;
    const a = { sfx: (name, options) => this.play(name, options) };
    if (e.type === 'launch')
      a.sfx('siegeLaunch', { pitch: e.stone === 1 ? 0.72 : 1 });
    else if (e.type === 'wind') a.sfx('siegeWind');
    else if (e.type === 'cancel') a.sfx('siegeCancel');
    else if (e.type === 'water') a.sfx('siegeWater');
    else if (e.type === 'recovery') a.sfx('siegeReturn');
    else if (e.type === 'hit') {
      a.sfx(
        e.kind === 'crew'
          ? 'siegeCrew'
          : e.kind === 'launcher'
            ? 'siegeArmor'
            : 'siegeStone',
      );
      if (e.kind !== 'castle') this.voice(e.seat);
    } else if (e.type === 'collapse') {
      a.sfx('siegeWood', { pitch: 0.7 });
      this.voice(1);
    } else if (e.type === 'split') a.sfx('whoosh', { vol: 0.25, pitch: 1.4 });
    else if (e.type === 'outcome') {
      this.fanfare(e.winner);
      this.voice(1);
    }
  }
  fanfare(winner) {
    this.game.audio.sting({
      bpm: 136,
      steps: 4,
      tracks: [
        {
          wave: 'triangle',
          vol: 0.18,
          notes:
            winner < 0
              ? 'D4 - F4 - E4 - D4 -'
              : 'D4 . D4 . A4 - F#4 - A4 - D5 - - - - -',
        },
        {
          wave: 'siegeLute',
          vol: 0.1,
          notes: 'D3 - A3 - D4 - - - D3 - A3 - D4 - - -',
        },
      ],
    });
  }
  reset() {
    for (const e of this.effects) e.stop?.();
    this.effects = [];
    for (const v of this.voices)
      try {
        v.stop();
      } catch {}
    this.voices = [];
    this.lastVoice = -100;
    this.game.audio.stopMusic(0);
  }
  stop() {
    this.reset();
    this.ended = true;
    this.game.audio.mute(true);
    try {
      this.game.audio.ctx?.suspend()?.catch(() => {});
    } catch {}
  }
}
