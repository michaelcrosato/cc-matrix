// ---------- procedural audio: synthesized sfx + step-sequenced music ----------
const Audio = (() => {
  let ctx, master, musG, sfxG, noiseBuf, started = false, track = null, step = 0, nextT = 0, intensity = 0;
  const A = {};
  function init() {
    if (started) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); musG = ctx.createGain(); sfxG = ctx.createGain();
      const comp = ctx.createDynamicsCompressor(); musG.connect(master); sfxG.connect(master); master.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      started = true; A.vol();
    } catch (e) { started = false; }
  }
  A.vol = () => { if (!started) return; master.gain.value = Settings.master / 10; musG.gain.value = Settings.music / 10 * .5; sfxG.gain.value = Settings.sfx / 10; };
  A.unlock = init;
  const osc = (type, f0, f1, dur, vol, dest = null, t0 = 0) => {
    if (!started) return; const t = ctx.currentTime + t0, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g); g.connect(dest || sfxG); o.start(t); o.stop(t + dur + .02);
  };
  const noise = (dur, vol, f0, f1, type = 'lowpass') => {
    if (!started) return; const t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(f); f.connect(g); g.connect(sfxG); s.start(t); s.stop(t + dur);
  };
  A.sfx = (n, p = 1) => {
    if (!started) return;
    switch (n) {
      case 'laser': osc('square', 1400 * p, 300, .12, .12); break;
      case 'laser2': osc('sawtooth', 1800, 400, .14, .12); osc('square', 900, 200, .12, .06); break;
      case 'enemylaser': osc('sawtooth', 500, 160, .18, .07); break;
      case 'charge': osc('sine', 200, 900, .6, .12); break;
      case 'lock': osc('square', 1500 + p * 120, 0, .06, .1); break;
      case 'missile': osc('sawtooth', 300, 1200, .3, .1); noise(.3, .08, 3000, 500); break;
      case 'boom': noise(.7, .5, 2500, 60); osc('sine', 120, 30, .5, .5); break;
      case 'smallboom': noise(.35, .3, 3500, 100); osc('sine', 90, 40, .25, .25); break;
      case 'bomb': noise(1.6, .7, 4000, 40); osc('sine', 80, 20, 1.2, .6); osc('sawtooth', 600, 50, 1, .15); break;
      case 'hit': noise(.25, .4, 1500, 200); osc('square', 220, 80, .2, .2); break;
      case 'roll': noise(.5, .15, 500, 4000, 'bandpass'); break;
      case 'deflect': osc('triangle', 1800, 2600, .15, .15); break;
      case 'pickup': osc('triangle', 600, 0, .08, .2); osc('triangle', 900, 0, .1, .2, null, .08); osc('triangle', 1200, 0, .2, .2, null, .16); break;
      case 'ui': osc('triangle', 700, 0, .05, .12); break;
      case 'ok': osc('triangle', 600, 900, .12, .15); break;
      case 'back': osc('triangle', 500, 300, .1, .12); break;
      case 'warn': osc('square', 880, 0, .12, .1); osc('square', 880, 0, .12, .1, null, .2); break;
      case 'boost': noise(.8, .2, 300, 3000, 'bandpass'); break;
      case 'flip': noise(.7, .15, 3000, 300, 'bandpass'); break;
      case 'clang': osc('square', 300, 100, .15, .15); noise(.1, .2, 6000, 1000, 'highpass'); break;
      case 'win': [0, .15, .3, .5].forEach((t, i) => osc('triangle', [523, 659, 784, 1047][i], 0, .4, .2, null, t)); break;
      case 'lose': [0, .25, .5].forEach((t, i) => osc('sawtooth', [330, 262, 196][i], 0, .5, .15, null, t)); break;
    }
  };
  A.voice = (pitch = 1) => { if (!started) return; for (let i = 0; i < 4; i++) osc('square', (220 + Math.random() * 120) * pitch, 0, .06, .05, null, i * .07); };
  // music: per-track bass line + arpeggio; "intensity" adds drums and lead
  const TRACKS = {
    title: { bpm: 96, root: 45, scale: [0, 3, 7, 10], bass: [0, 0, 3, 0, 7, 0, 3, 5], lead: [12, 15, 19, 15, 12, 10, 12, 7], drums: 0 },
    coast: { bpm: 140, root: 40, scale: [0, 2, 4, 7, 9], bass: [0, 0, 7, 0, 5, 5, 7, 3], lead: [12, 16, 19, 16, 14, 16, 19, 21], drums: 1 },
    canyon: { bpm: 150, root: 38, scale: [0, 3, 5, 7, 10], bass: [0, 0, 0, 3, 0, 0, 5, 3], lead: [12, 15, 17, 15, 19, 17, 15, 12], drums: 1 },
    nebula: { bpm: 160, root: 36, scale: [0, 3, 7, 8], bass: [0, 0, 8, 0, 7, 7, 3, 5], lead: [12, 15, 19, 20, 19, 15, 12, 8], drums: 1 },
    boss: { bpm: 168, root: 36, scale: [0, 1, 4, 7], bass: [0, 0, 1, 0, 0, 0, 4, 1], lead: [12, 13, 16, 19, 16, 13, 12, 7], drums: 1 }
  };
  const mf = n => 440 * Math.pow(2, (n - 69) / 12);
  A.music = n => { if (!started) return; track = n ? TRACKS[n] : null; step = 0; nextT = ctx.currentTime + .1; };
  A.intensity = v => { intensity = v; };
  A.tick = () => {
    if (!started || !track) return;
    const sd = 60 / track.bpm / 2;
    while (nextT < ctx.currentTime + .15) {
      const s = step % 16, bi = (s >> 1) % 8, t = nextT - ctx.currentTime;
      if (s % 2 === 0) osc('sawtooth', mf(track.root + track.bass[bi]), 0, sd * 1.8, .2, musG, t);
      osc('square', mf(track.root + 12 + track.scale[(s * 3 + (s >> 2)) % track.scale.length] + (s >> 3) * 0), 0, sd * .8, .05 + intensity * .03, musG, t);
      if (s % 2 === 0 && (intensity > 0 || track.drums === 0)) osc('triangle', mf(track.root + 12 + track.lead[bi]), 0, sd * 1.6, .1, musG, t);
      if (track.drums) {
        if (s % 4 === 0) osc('sine', 150, 40, .15, .35, musG, t);
        if (s % 4 === 2) { osc('square', 3000, 1500, .04, .04, musG, t); }
        if (intensity > 0 && s % 2 === 1) osc('square', 6000, 5000, .02, .025, musG, t);
      }
      nextT += sd; step++;
    }
  };
  return A;
})();
addEventListener('pointerdown', () => Audio.unlock());
addEventListener('keydown', () => Audio.unlock());
