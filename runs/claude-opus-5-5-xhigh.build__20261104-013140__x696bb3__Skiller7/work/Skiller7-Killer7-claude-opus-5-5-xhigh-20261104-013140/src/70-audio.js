/* AUDIO (§10): every sound is code. Sound effects are the engine's chip voices (audio.define); songs are in the
 * engine's step notation with an explore layer and a danger layer; the wind, the room tone and the drips are our own
 * WebAudio beds; laughter and voices are synthesized in 71-voice.js. It listens to the bus and never changes the sim. */
const SFX = {
  // weapons
  shot38: [{ wave: 'noise', freq: 2400, to: 300, dur: .12, vol: .5, filter: 'lowpass' }, { wave: 'square', freq: 160, to: 50, dur: .08, vol: .3 }],
  shotpole: [{ wave: 'noise', freq: 4200, to: 1200, dur: .04, vol: .22, filter: 'highpass' }, { wave: 'square', freq: 300, to: 120, dur: .03, vol: .12 }],
  shotrifle: [{ wave: 'noise', freq: 1800, to: 120, dur: .4, vol: .7, filter: 'lowpass' }, { wave: 'sine', freq: 110, to: 30, dur: .3, vol: .5 }, { wave: 'noise', freq: 6000, dur: .03, vol: .2, filter: 'highpass' }],
  shotgun: [{ wave: 'noise', freq: 1500, to: 110, dur: .32, vol: .68, filter: 'lowpass' }, { wave: 'sine', freq: 95, to: 32, dur: .26, vol: .6 }],
  alphorn: [{ wave: 'saw', freq: 'A2', to: 'A1', dur: .5, vol: .4, vib: [6, .02] }, { wave: 'saw', freq: 'E3', to: 'E2', dur: .45, vol: .25 }, { wave: 'noise', freq: 700, to: 200, dur: .4, vol: .3, filter: 'lowpass' }],
  shot25: [{ wave: 'noise', freq: 3600, to: 900, dur: .07, vol: .32, filter: 'highpass' }, { wave: 'square', freq: 400, to: 160, dur: .04, vol: .14 }],
  launcher: [{ wave: 'noise', freq: 900, to: 200, dur: .25, vol: .5, filter: 'lowpass' }, { wave: 'sine', freq: 220, to: 90, dur: .2, vol: .3 }],
  reload: [{ wave: 'noise', freq: 3000, dur: .03, vol: .2, filter: 'highpass' }, { wave: 'square', freq: 900, dur: .02, vol: .08, delay: .12 }, { wave: 'noise', freq: 2400, dur: .04, vol: .2, filter: 'highpass', delay: .22 }],
  shell: [{ wave: 'noise', freq: 2800, dur: .03, vol: .2, filter: 'highpass' }, { wave: 'square', freq: 700, dur: .02, vol: .08, delay: .05 }],
  reloaded: { wave: 'square', freq: 1200, to: 900, dur: .04, vol: .08 },
  dryfire: { wave: 'square', freq: 2000, dur: .02, vol: .1 },
  overheat: [{ wave: 'noise', freq: 1200, to: 400, dur: .6, vol: .3, filter: 'bandpass' }, { wave: 'saw', freq: 120, to: 60, dur: .3, vol: .2 }],
  scope: { wave: 'noise', freq: 5000, to: 2000, dur: .08, vol: .12, filter: 'highpass' },
  // combat
  scan: [{ wave: 'sine', freq: 1320, to: 1300, dur: .25, vol: .25, vib: [12, .01] }, { wave: 'noise', freq: 300, to: 3000, dur: .6, vol: .14, filter: 'bandpass' }],
  crit: [{ wave: 'noise', freq: 8000, to: 2000, dur: .2, vol: .35, filter: 'highpass' }, { wave: 'triangle', freq: 'A5', dur: .6, vol: .14 }, { wave: 'triangle', freq: 'C#6', dur: .6, vol: .12 }, { wave: 'triangle', freq: 'E6', dur: .6, vol: .12 }],
  slush: [{ wave: 'noise', freq: 600, to: 120, dur: .35, vol: .35, filter: 'lowpass' }],
  burst: [{ wave: 'noise', freq: 900, to: 80, dur: .5, vol: .6, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 30, dur: .35, vol: .6 }, { wave: 'noise', freq: 3000, to: 600, dur: .15, vol: .25, filter: 'bandpass' }],
  boom: [{ wave: 'noise', freq: 700, to: 60, dur: .7, vol: .7, filter: 'lowpass' }, { wave: 'sine', freq: 70, to: 25, dur: .6, vol: .7 }],
  tink: [{ wave: 'triangle', freq: 'E7', dur: .12, vol: .2 }, { wave: 'noise', freq: 7000, dur: .03, vol: .1, filter: 'highpass' }],
  giggleup: { wave: 'square', freq: 400, to: 1400, dur: .35, vol: .14, vib: [30, .06] },
  whoosh: { wave: 'noise', freq: 600, to: 2400, dur: .3, vol: .16, filter: 'bandpass' },
  snowhit: { wave: 'noise', freq: 1600, to: 400, dur: .12, vol: .3, filter: 'lowpass' },
  hurt: [{ wave: 'noise', freq: 520, to: 200, dur: .12, vol: .4, filter: 'lowpass' }, { wave: 'sine', freq: 160, to: 90, dur: .1, vol: .3 }],
  freeze: [{ wave: 'noise', freq: 9000, to: 3000, dur: 1.2, vol: .3, filter: 'highpass' }, { wave: 'triangle', freq: 'E6', to: 'E5', dur: 1.2, vol: .14 }],
  chip: { wave: 'noise', freq: 6000, dur: .03, vol: .12, filter: 'highpass' },
  rescue: [{ wave: 'triangle', freq: 'C5', dur: .15, vol: .2 }, { wave: 'triangle', freq: 'E5', dur: .15, vol: .2, delay: .1 }, { wave: 'triangle', freq: 'G5', dur: .3, vol: .2, delay: .2 }],
  // movement and the world
  step: { wave: 'noise', freq: 900, dur: .03, vol: .06, filter: 'lowpass' },
  snowstep: { wave: 'noise', freq: 1400, to: 500, dur: .06, vol: .08, filter: 'lowpass' },
  hockeystop: [{ wave: 'noise', freq: 4000, to: 800, dur: .4, vol: .35, filter: 'highpass' }],
  jump: { wave: 'noise', freq: 800, to: 2000, dur: .2, vol: .2, filter: 'bandpass' },
  land: [{ wave: 'noise', freq: 600, to: 100, dur: .2, vol: .4, filter: 'lowpass' }, { wave: 'sine', freq: 80, to: 40, dur: .15, vol: .3 }],
  quickturn: { wave: 'noise', freq: 1200, to: 600, dur: .08, vol: .1, filter: 'lowpass' },
  lift: [{ wave: 'square', freq: 90, dur: .2, vol: .1 }, { wave: 'noise', freq: 400, dur: .1, vol: .1, delay: .2 }],
  bell: [{ wave: 'triangle', freq: 'E5', dur: 1.2, vol: .2 }, { wave: 'sine', freq: 'B5', dur: 1.0, vol: .1 }, { wave: 'sine', freq: 'G#6', dur: .6, vol: .06 }],
  bigbell: [{ wave: 'triangle', freq: 'C3', dur: 3, vol: .4 }, { wave: 'sine', freq: 'G3', dur: 2.6, vol: .2 }, { wave: 'sine', freq: 'E4', dur: 2, vol: .12 }, { wave: 'sine', freq: 'A#4', dur: 1.6, vol: .08 }],
  ding: [{ wave: 'sine', freq: 'C6', dur: .6, vol: .25 }, { wave: 'sine', freq: 'G6', dur: .4, vol: .08 }],
  cuckoo: [{ wave: 'sine', freq: 'E5', dur: .18, vol: .2 }, { wave: 'sine', freq: 'C5', dur: .3, vol: .2, delay: .22 }],
  phone: [{ wave: 'square', freq: 1400, dur: .4, vol: .08, vib: [22, .05] }, { wave: 'square', freq: 1400, dur: .4, vol: .08, vib: [22, .05], delay: .6 }],
  door7: [{ wave: 'triangle', freq: 'C4', dur: .8, vol: .14 }, { wave: 'triangle', freq: 'E4', dur: .8, vol: .12 }, { wave: 'triangle', freq: 'G4', dur: .8, vol: .1 }],
  flurry: { wave: 'noise', freq: 3000, to: 900, dur: .6, vol: .16, filter: 'bandpass' },
  echo: [{ wave: 'pulse', freq: 'A4', to: 'A5', dur: .25, vol: .16 }, { wave: 'pulse', freq: 'A5', to: 'E5', dur: .3, vol: .14, delay: .25 }, { wave: 'pulse', freq: 'A4', dur: .3, vol: .08, delay: .7 }, { wave: 'pulse', freq: 'A4', dur: .3, vol: .04, delay: 1.1 }],
  flash: [{ wave: 'noise', freq: 9000, dur: .05, vol: .3, filter: 'highpass' }, { wave: 'sine', freq: 2000, to: 9000, dur: .5, vol: .06 }],
  flare: [{ wave: 'noise', freq: 2000, to: 5000, dur: .5, vol: .2, filter: 'bandpass' }, { wave: 'noise', freq: 1500, dur: 1.2, vol: .08, filter: 'highpass', delay: .4 }],
  coins: [{ wave: 'square', freq: 'B5', dur: .06, vol: .1 }, { wave: 'square', freq: 'E6', dur: .1, vol: .1, delay: .06 }, { wave: 'square', freq: 'B5', dur: .06, vol: .08, delay: .14 }, { wave: 'square', freq: 'G6', dur: .1, vol: .08, delay: .2 }],
  charge: [{ wave: 'noise', freq: 500, to: 50, dur: 1, vol: .7, filter: 'lowpass' }, { wave: 'sine', freq: 60, to: 22, dur: .8, vol: .7 }],
  wax: { wave: 'noise', freq: 3000, to: 1500, dur: .6, vol: .2, filter: 'highpass' },
  chime: [{ wave: 'triangle', freq: 'G5', dur: .5, vol: .14 }, { wave: 'triangle', freq: 'D6', dur: .5, vol: .1, delay: .08 }],
  steam: { wave: 'noise', freq: 4000, to: 800, dur: 1, vol: .2, filter: 'highpass' },
  grind: [{ wave: 'saw', freq: 55, to: 45, dur: 2.5, vol: .14, vib: [8, .05] }, { wave: 'noise', freq: 300, dur: 2.5, vol: .14, filter: 'lowpass' }],
  collapse: [{ wave: 'noise', freq: 500, to: 60, dur: 1.4, vol: .7, filter: 'lowpass' }, { wave: 'sine', freq: 60, to: 25, dur: 1, vol: .6 }],
  feathers: { wave: 'noise', freq: 5000, to: 2000, dur: .9, vol: .14, filter: 'highpass' },
  rumble: { wave: 'noise', freq: 120, dur: 1.5, vol: .5, filter: 'lowpass' },
  pickup: [{ wave: 'square', freq: 'E5', dur: .05, vol: .1 }, { wave: 'square', freq: 'A5', dur: .08, vol: .1, delay: .05 }],
  red: { wave: 'triangle', freq: 'A5', to: 'E6', dur: .06, vol: .08 },
  rime: [{ wave: 'triangle', freq: 'E6', dur: .1, vol: .12 }, { wave: 'triangle', freq: 'B6', dur: .2, vol: .1, delay: .06 }],
  item: [{ wave: 'pulse', freq: 'C5', dur: .1, vol: .14 }, { wave: 'pulse', freq: 'G5', dur: .1, vol: .14, delay: .1 }, { wave: 'pulse', freq: 'C6', dur: .25, vol: .14, delay: .2 }],
  gateok: [{ wave: 'square', freq: 'G4', dur: .08, vol: .12 }, { wave: 'square', freq: 'D5', dur: .14, vol: .12, delay: .08 }],
  gateno: [{ wave: 'square', freq: 'D4', dur: .1, vol: .1 }, { wave: 'square', freq: 'C#4', dur: .16, vol: .1, delay: .1 }],
  // UI
  tick: { wave: 'square', freq: 1800, dur: .015, vol: .05 },
  confirm: [{ wave: 'square', freq: 'C6', dur: .04, vol: .08 }, { wave: 'square', freq: 'G6', dur: .06, vol: .08, delay: .04 }],
  back: { wave: 'square', freq: 'G5', to: 'C5', dur: .08, vol: .07 },
  ring: { wave: 'noise', freq: 2000, to: 600, dur: .25, vol: .12, filter: 'bandpass' },
  switch: [{ wave: 'noise', freq: 4000, to: 1200, dur: .45, vol: .16, filter: 'bandpass' }, { wave: 'triangle', freq: 'E5', to: 'B5', dur: .3, vol: .06 }],
  sting: [{ wave: 'saw', freq: 'A2', dur: .9, vol: .25 }, { wave: 'saw', freq: 'E3', dur: .9, vol: .2 }, { wave: 'square', freq: 'A4', to: 'G#4', dur: .9, vol: .12 }, { wave: 'noise', freq: 600, to: 100, dur: .5, vol: .3, filter: 'lowpass' }],
  thaw: [{ wave: 'noise', freq: 9000, to: 3000, dur: .25, vol: .2, filter: 'highpass' }]
};

class S7Audio {
  constructor(game, sim) {
    this.game = game; this.sim = sim; this.A = game.audio; this.danger = 0; this.dangerT = 0; this.song = null; this.amb = null;
    for (const k in SFX) this.A.define('s7' + k, SFX[k]);
    const on = (t, f) => S7.bus.on(t, f), sfx = (n, o) => this.sfx(n, o);
    on('shot', d => sfx(S7.WEAPONS[S7.PERSONAS[d.persona].weapon].sfx));
    on('reload', () => sfx('reload')); on('shell', () => sfx('shell')); on('reloaded', () => sfx('reloaded')); on('dryfire', () => sfx('dryfire')); on('overheat', () => sfx('overheat'));
    on('scope', () => sfx('scope')); on('scan', () => sfx('scan'));
    on('crit', () => { sfx('crit'); this.game.input.rumble && this.game.input.rumble(.4, .12); });
    on('kill', d => { if (!d.crit) sfx('slush'); });
    on('explode', d => { sfx(d.kind === 'burst' ? 'burst' : 'boom'); this.game.shake(d.kind === 'burst' ? 3 : 5); });
    on('tink', () => sfx('tink')); on('giggleup', () => sfx('giggleup')); on('throw', () => sfx('whoosh')); on('splat', () => sfx('snowhit')); on('shatter', () => sfx('tink'));
    on('hurt', () => { sfx('hurt'); this.game.flash('#ff2030', .08); this.game.input.rumble && this.game.input.rumble(.6, .18); });
    on('freeze', () => sfx('freeze')); on('chip', d => { if (Math.floor(d.t * 8) !== Math.floor((d.t - 1 / 120) * 8)) sfx('chip'); }); on('rescue', d => d.persona && sfx('rescue'));
    on('hockeystop', () => sfx('hockeystop')); on('jump', () => sfx('jump')); on('land', () => sfx('land')); on('quickturn', () => sfx('quickturn')); on('lift', () => sfx('lift'));
    on('pickup', d => sfx(d.kind === 'rime' ? 'rime' : d.kind === 'red' ? 'red' : 'pickup')); on('item', () => sfx('item')); on('pin', () => sfx('item')); on('dossier', () => sfx('pickup'));
    on('gate', d => sfx(d.ok ? 'gateok' : 'gateno')); on('coins', () => sfx('coins')); on('steam', () => sfx('steam'));
    on('skill', d => sfx({ flare: 'flare', makeitrain: 'coins', echo: 'echo', flash: 'flash', charge: 'charge' }[d.skill] || 'pickup'));
    on('switch', () => sfx('switch')); on('ring', d => d.open && sfx('ring')); on('flurry', () => sfx('flurry')); on('room7', () => sfx('door7'));
    on('card', () => sfx('sting')); on('splash', d => d.text === 'THAW.' && sfx('thaw'));
    on('tick', () => sfx('tick')); on('confirm', () => sfx('confirm')); on('refuse', () => sfx('gateno'));
    on('sfx', d => sfx(d.name)); on('bigbell', () => sfx('bigbell')); on('solve', d => sfx(d.kind === 'far' ? 'bigbell' : d.kind === 'cornice' || d.kind === 'serac' ? 'rumble' : 'chime'));
    on('music', d => this.music(d.song)); on('area', d => this.areaMusic(d.to));
    on('save', () => sfx('cuckoo')); on('pickup_phone', () => sfx('phone'));
    on('tutorial', () => sfx('confirm'));
  }
  sfx(name, o) { if (!name) return; try { if (typeof name === 'string') this.A.sfx(SFX[name] ? 's7' + name : name, o); else this.A.sfx(name, o); } catch (e) { /* no sound here */ } }
  ui(name) { this.sfx(name === 'tick' ? 'tick' : name === 'back' ? 'back' : 'confirm'); }
  music(id, o = {}) {
    if (this.song === id && !o.restart) return;
    this.song = id; this.dangerOn = false;
    if (!id) { this.A.stopMusic(1); return; }
    const s = S7.SONGS[id]; if (!s) return;
    try { this.A.music(s, Object.assign({ sync: true, fade: .8 }, o)); } catch (e) { /* no sound */ }
  }
  areaMusic(id) { const A = S7.AREAS[id]; if (A && A.music && !this.sim.boss) this.music(A.music); this.ambience(A && A.ambience); }
  /** each frame: the danger layer while Whiteouts are near; the beds' gains */
  update(dt) {
    const sim = this.sim; if (!sim || !sim.st) return;
    const near = sim.enemies.some(e => e.alive && !e.passive && V.dist2([e.x, e.y], [sim.hero.x, sim.hero.y]) < 40 * M);
    if (near) this.dangerT = 1.5; else this.dangerT -= dt;
    const want = this.dangerT > 0;
    if (want !== this.dangerOn && S7.SONGS[this.song] && S7.SONGS[this.song].tracks.some(t => t.name === 'danger')) { this.dangerOn = want; try { this.A.layer('danger', want ? 1 : 0, want ? .5 : 1.5); } catch (e) { /* no music */ } }
    if (this.amb) this.ambTick(dt);
  }
  /** ambience beds: wind (two filtered noise bands with slow gusts), room tone, the archive's drips */
  ambience(kind) {
    const c = this.A.ctx; if (!c || !this.A._sfxBus) { this.pendingAmb = kind; return; }
    if (this.amb && this.amb.kind === kind) return;
    if (this.amb) { const old = this.amb; try { old.g.gain.setTargetAtTime(0, c.currentTime, .4); setTimeout(() => { try { old.src.forEach(s => s.stop()); } catch (e) { /* stopped */ } }, 2000); } catch (e) { /* gone */ } this.amb = null; }
    if (!kind) return;
    const buf = S7.noiseBuffer(c), g = c.createGain(); g.gain.value = 0; g.connect(this.A._sfxBus);
    const src = [], mk = (type, f, q, vol) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const gg = c.createGain(); gg.gain.value = vol; s.connect(fl); fl.connect(gg); gg.connect(g); s.start(); src.push(s); return { fl, gg }; };
    const parts = [];
    if (kind === 'wind' || kind === 'storm' || kind === 'fohn') { parts.push(mk('bandpass', 380, .7, .5), mk('bandpass', 1400, 1.2, .18)); }
    if (kind === 'roomtone' || kind === 'room7') parts.push(mk('lowpass', 180, .5, .25));
    if (kind === 'archive') parts.push(mk('bandpass', 220, 2, .25));
    if (kind === 'crowd') parts.push(mk('bandpass', 700, .8, .12), mk('lowpass', 300, .5, .2));
    g.gain.setTargetAtTime(kind === 'storm' ? .5 : .32, c.currentTime, .8);
    this.amb = { kind, g, src, parts, t: 0, drip: 0 };
  }
  ambTick(dt) {
    const a = this.amb, c = this.A.ctx; a.t += dt;
    const gust = .6 + .4 * Math.sin(a.t * .37) * Math.sin(a.t * .13 + 1);
    if ((a.kind === 'wind' || a.kind === 'storm' || a.kind === 'fohn') && a.parts[0]) { a.parts[0].fl.frequency.setTargetAtTime((a.kind === 'fohn' ? 260 : 380) + gust * 260, c.currentTime, .3); a.parts[0].gg.gain.setTargetAtTime(.25 + gust * .4, c.currentTime, .3); }
    if (a.kind === 'archive') { a.drip -= dt; if (a.drip <= 0) { a.drip = .7 + Math.random() * 2.2; this.sfx({ wave: 'sine', freq: 1800 + Math.random() * 900, to: 900, dur: .08, vol: .05 }); } }
    if (a.kind === 'room7' && Math.floor(a.t) !== Math.floor(a.t - dt)) this.sfx({ wave: 'noise', freq: 5000, dur: .012, vol: .025, filter: 'highpass' });
  }
}
S7.Audio = S7Audio;
/** one second of white noise per context (laughs, voices, beds) */
S7.noiseBuffer = (c) => {
  if (c._s7noise) return c._s7noise;
  const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0);
  let s = 12345; for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = s / 0x3fffffff - 1; }
  return (c._s7noise = b);
};
