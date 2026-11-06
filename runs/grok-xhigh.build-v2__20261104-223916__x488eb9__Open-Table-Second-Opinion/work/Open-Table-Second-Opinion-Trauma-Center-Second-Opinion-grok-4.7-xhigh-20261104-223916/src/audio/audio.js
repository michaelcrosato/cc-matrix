/* Original songs, effects, gibberish voices, and the hush choir. No audio files. */
(() => {
  const G = typeof window !== 'undefined' ? window : globalThis;
  const GAME = (G.GAME ||= {});

  const SONGS = {
    night: {
      bpm: 84, steps: 4,
      tracks: [
        { wave: 'triangle', vol: 0.22, notes: 'A3 . . E3 . . F3 . . C3 . . | D3 . . G3 . . A3 . . E3 . .' },
        { wave: 'square', vol: 0.07, notes: 'E5 . C5 . . A4 . . . G4 . E4 . | F4 . A4 . . C5 . . B4 . G4 .' },
        { wave: 'drums', vol: 0.28, notes: 'k . h . s . h . k . h . s . h . | k . h . s . h . k k h . s . h .' },
      ],
    },
    theatre: {
      bpm: 96, steps: 4,
      tracks: [
        { wave: 'triangle', vol: 0.2, notes: 'D3 . A3 . F3 . C3 . | G2 . D3 . A2 . E3 .' },
        { wave: 'square', vol: 0.06, notes: 'A4 . . F4 . D4 . . | E4 . G4 . . A4 . .' },
        { wave: 'drums', vol: 0.24, notes: 'k . . h s . . h | k . h . s . h .' },
      ],
    },
    hush: {
      bpm: 72, steps: 4,
      tracks: [
        { wave: 'sawtooth', vol: 0.08, notes: 'E4 - - F4 - - G4 - - A4 - - | Bb4 - - A4 - - G4 - - E4 - -' },
        { wave: 'triangle', vol: 0.16, notes: 'A2 . . . E3 . . . | F2 . . . C3 . . .' },
        { wave: 'drums', vol: 0.16, notes: 'k . . . . . h . | . . s . . . h .' },
      ],
    },
    ward: {
      bpm: 78, steps: 4,
      tracks: [
        { wave: 'triangle', vol: 0.18, notes: 'C4 . E4 . G4 . E4 . | A3 . C4 . E4 . C4 .' },
        { wave: 'square', vol: 0.05, notes: 'G4 . . E4 . . C4 . | E4 . . D4 . . C4 .' },
        { wave: 'drums', vol: 0.18, notes: 'k . . h . . s . | k . . h . . s .' },
      ],
    },
    end: {
      bpm: 66, steps: 4,
      tracks: [
        { wave: 'triangle', vol: 0.2, notes: 'A3 . C4 . E4 . . A4 . . G4 . E4 .' },
        { wave: 'square', vol: 0.05, notes: 'C5 . . A4 . . E4 . . . . .' },
        { wave: 'drums', vol: 0.12, notes: 'k . . . h . . . s . . .' },
      ],
    },
  };

  const PRESETS = {
    grip: { wave: 'square', freq: 520, to: 180, dur: 0.06, vol: 0.35 },
    snip: { wave: 'square', freq: 980, to: 240, dur: 0.07, vol: 0.4 },
    stitch: { wave: 'triangle', freq: 660, to: 880, dur: 0.08, vol: 0.35 },
    gel: { wave: 'sine', freq: 320, to: 180, dur: 0.12, vol: 0.3 },
    burn: { wave: 'sawtooth', freq: 140, to: 70, dur: 0.16, vol: 0.28 },
    suck: { wave: 'sine', freq: 90, to: 40, dur: 0.18, vol: 0.32 },
    ping: { wave: 'sine', freq: 880, to: 1320, dur: 0.1, vol: 0.3 },
    shock: { wave: 'square', freq: 140, to: 60, dur: 0.12, vol: 0.45 },
    dish: { wave: 'triangle', freq: 420, to: 200, dur: 0.09, vol: 0.3 },
    bad: { wave: 'sawtooth', freq: 180, to: 70, dur: 0.14, vol: 0.35 },
    stamp: { wave: 'triangle', freq: 520, to: 260, dur: 0.2, vol: 0.4 },
  };

  let game = null;
  let choirNodes = null;

  function bus(name) {
    if (!game || !game.audio || !game.audio.bus) return null;
    try { return game.audio.bus(name); } catch (e) { return null; }
  }

  function install(g) {
    game = g;
    if (!g || !g.audio || !g.audio.define) return;
    for (const k in PRESETS) g.audio.define(k, PRESETS[k]);
    g.audio.sfxVolume = 1;
    g.audio.voiceVolume = 0.9;
    g.audio.volume = 0.7;
    if (g.audio.musicVolume == null || g.audio.musicVolume > 0.2) g.audio.musicVolume = 0.1;
    if (g.audio.applyVolume) g.audio.applyVolume();
  }

  function play(name) {
    if (!game || !game.audio || !game.audio.music) return;
    const song = SONGS[name] || SONGS.night;
    game.audio.music(song, { fade: 0.35, loop: true });
  }

  function sfx(name) {
    if (!game || !game.audio || !game.audio.sfx) return;
    const voice = PRESETS[name] || PRESETS.ping;
    game.audio.sfx(voice, { vol: 0.8, vary: 0 });
  }

  function blip(ch) {
    const b = bus('voice');
    const ctx = game && game.audio && game.audio.ctx;
    if (!b || !ctx) return;
    const code = ch && ch.charCodeAt ? ch.charCodeAt(0) : 64;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 160 + (code % 19) * 16;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 640 + (code % 11) * 90;
    f.Q.value = 7;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(0.22, t + 0.012);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(f); f.connect(gn); gn.connect(b);
    o.start(t); o.stop(t + 0.08);
  }

  function stopChoir() {
    if (!choirNodes) return;
    const ctx = game && game.audio && game.audio.ctx;
    const t = ctx ? ctx.currentTime : 0;
    for (const n of choirNodes) {
      try { n.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); n.osc.stop(t + 0.06); } catch (e) { /* already quiet */ }
    }
    choirNodes = null;
  }

  function choir(on) {
    if (!on) { stopChoir(); return; }
    if (choirNodes) return;
    const b = bus('sfx');
    const ctx = game && game.audio && game.audio.ctx;
    if (!b || !ctx) return;
    const t = ctx.currentTime;
    choirNodes = [];
    const freqs = [196, 201, 247];
    for (let i = 0; i < freqs.length; i++) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freqs[i];
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900;
      const gn = ctx.createGain();
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(0.06, t + 0.4);
      o.connect(f); f.connect(gn); gn.connect(b);
      o.start(t);
      choirNodes.push({ osc: o, gain: gn });
    }
  }

  function tone(ctx, freq, type, dur, gain) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, 0);
    g.gain.exponentialRampToValueAtTime(0.0001, dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(0); o.stop(dur);
  }

  function rmsOf(buf) {
    const d = buf.getChannelData(0);
    let s = 0;
    for (let i = 0; i < d.length; i++) s += d[i] * d[i];
    return Math.sqrt(s / d.length);
  }

  async function renderProbe() {
    const AC = G.OfflineAudioContext || (typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : null);
    if (!AC) return null;
    async function render(build) {
      const ctx = new AC(1, 12000, 22050);
      build(ctx);
      const buf = await ctx.startRendering();
      return rmsOf(buf);
    }
    const effect = await render((ctx) => tone(ctx, 440, 'square', 0.2, 0.4));
    const voice = await render((ctx) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = 280;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1100;
      f.Q.value = 6;
      const g = ctx.createGain();
      g.gain.value = 0.35;
      o.connect(f); f.connect(g); g.connect(ctx.destination);
      o.start(0); o.stop(0.2);
    });
    const choirR = await render((ctx) => {
      for (const freq of [196, 201, 247]) tone(ctx, freq, 'sawtooth', 0.3, 0.12);
    });
    const music = await render((ctx) => tone(ctx, 330, 'triangle', 0.25, 0.1));
    const effects = await render((ctx) => tone(ctx, 330, 'square', 0.25, 1));
    return { effect, voice, choir: choirR, music, effects };
  }

  function onEv(ev) {
    if (!ev || !ev.length) return;
    const k = ev[0];
    if (k === 'grip' || k === 'free') sfx('grip');
    else if (k === 'grade' || k === 'stitch') sfx('stitch');
    else if (k === 'tear' || k === 'snap' || k === 'miss') sfx('bad');
    else if (k === 'shock' || k === 'codeblue') sfx('shock');
    else if (k === 'stamp' || k === 'closed') sfx('stamp');
    else if (k === 'breath') choir(ev[1] === 1);
  }

  GAME.Audio = { SONGS, install, play, sfx, blip, choir, stopChoir, renderProbe, onEv };
})();
