// Audio (§3.10), all synthesized: the SFX catalogue (engine voices with our synth extensions), engine hums for the four
// nearest craft (their own WebAudio graphs on the effects bus: pitch, filter, Doppler, pan), the music director (layers
// at GO and the final lap, overclock tempo), the announcer and radio as Animalese/Simlish-style gibberish (SN.Voice)
(() => {
const E = My3D2dge, SN = globalThis.SN;
const SFX = {
  ui_move: { wave: 'pulse', freq: 1046, dur: .035, vol: .1 }, ui_ok: [{ wave: 'square', freq: 784, dur: .05, vol: .12 }, { wave: 'square', freq: 1175, dur: .08, vol: .12, delay: .045 }],
  ui_back: { wave: 'square', freq: 660, to: 392, dur: .09, vol: .11 }, ui_locked: { wave: 'saw', freq: 98, dur: .16, vol: .16, vib: [30, .3] }, ui_tab: { wave: 'noise', freq: 5000, dur: .025, vol: .14, filter: 'highpass' },
  count_beep: { wave: 'square', freq: 'A5', dur: .16, vol: .16, lp: { f: 3000, q: 1 } }, count_go: [{ wave: 'saw', freq: 'A5', dur: .6, vol: .1, uni: 3, det: 12, lp: { f: 2600, q: 2 } }, { wave: 'saw', freq: 'C#6', dur: .6, vol: .08, uni: 3, det: 12 }, { wave: 'saw', freq: 'E6', dur: .6, vol: .08, uni: 3, det: 12 }],
  lap: { wave: 'triangle', freq: 'E6', arp: [0, 4, 7, 12], step: .05, dur: .3, vol: .2 }, finish: { wave: 'square', freq: 'C5', arp: [0, 4, 7, 12, 16, 19, 24], step: .07, dur: .6, vol: .14, lp: { f: 3000, q: 2 } },
  wrongway: { wave: 'square', freq: 880, to: 440, dur: .25, vol: .12, vib: [12, .2] }, pos_up: { wave: 'pulse', freq: 'C6', arp: [0, 7], step: .04, dur: .1, vol: .08 }, pos_down: { wave: 'pulse', freq: 'G5', arp: [0, -5], step: .04, dur: .1, vol: .08 },
  boost_pad: [{ wave: 'noise', freq: 600, to: 4000, dur: .35, vol: .22, filter: 'bandpass' }, { wave: 'saw', freq: 200, to: 900, dur: .3, vol: .07, lp: { f: 1500, q: 4 } }],
  pickup_roll: { wave: 'pulse', freq: 'C6', arp: [0, 3, 7, 10, 12, 15, 19, 22], step: .05, dur: .45, vol: .08 }, weapon_pad: { wave: 'triangle', freq: 1760, to: 3520, dur: .12, vol: .12 },
  sideshift: { wave: 'noise', freq: 1800, to: 500, dur: .12, vol: .2 }, roll: { wave: 'saw', freq: 220, to: 660, dur: .45, vol: .08, vib: [24, .1], lp: { f: 1200, q: 6 } },
  roll_boost: [{ wave: 'noise', freq: 800, to: 5000, dur: .4, vol: .2 }, { wave: 'square', freq: 'E5', arp: [0, 7, 12], step: .05, dur: .2, vol: .1 }], botch: { wave: 'saw', freq: 300, to: 80, dur: .35, vol: .14 },
  land_soft: { wave: 'noise', freq: 400, to: 150, dur: .1, vol: .2, filter: 'lowpass' }, land_hard: [{ wave: 'noise', freq: 900, to: 100, dur: .3, vol: .4, filter: 'lowpass' }, { wave: 'square', freq: 120, to: 60, dur: .15, vol: .2 }],
  wall_hit: [{ wave: 'noise', freq: 2400, to: 600, dur: .18, vol: .35 }, { wave: 'square', freq: 180, to: 90, dur: .12, vol: .18 }], scrape: { wave: 'noise', freq: 3200, dur: .06, vol: .12, q: 4 },
  bump: { wave: 'triangle', freq: 140, to: 70, dur: .1, vol: .35 }, pit_charge: { wave: 'sine', freq: 440, to: 880, dur: .3, vol: .06 }, low_shield: { wave: 'square', freq: 1320, dur: .08, vol: .1 },
  explode: [{ wave: 'noise', freq: 900, to: 50, dur: 1, vol: .55, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 28, dur: .9, vol: .5 }], eliminated: { wave: 'saw', freq: 440, to: 55, dur: 1.1, vol: .16, lp: { f: 1800, q: 4, env: 0 } },
  respawn: { wave: 'sine', freq: 200, to: 1200, dur: .5, vol: .2, vib: [12, .1] }, rescue: { wave: 'saw', freq: 600, to: 800, dur: 1.2, vol: .06, vib: [40, .05], lp: { f: 1500, q: 6 } },
  swarm_fire: [{ wave: 'noise', freq: 1500, to: 300, dur: .25, vol: .3 }, { wave: 'saw', freq: 600, to: 200, dur: .2, vol: .08 }], seeker_lock: { wave: 'square', freq: 1760, dur: .05, vol: .12 },
  seeker_fire: [{ wave: 'noise', freq: 900, to: 2400, dur: .4, vol: .3 }, { wave: 'saw', freq: 300, to: 900, dur: .3, vol: .08 }], mine_drop: { wave: 'square', freq: 220, to: 110, dur: .08, vol: .14 },
  cannon_fire: { wave: 'pulse12', freq: 1400, to: 300, dur: .06, vol: .1 }, rail_charge: { wave: 'saw', freq: 200, to: 2200, dur: .8, vol: .07, lp: { f: 2600, q: 8 } },
  rail_fire: [{ wave: 'noise', freq: 6000, to: 800, dur: .5, vol: .45, filter: 'highpass' }, { wave: 'saw', freq: 1800, to: 120, dur: .6, vol: .12, uni: 3, det: 30 }], tremor: [{ wave: 'sine', freq: 60, to: 30, dur: 1, vol: .6 }, { wave: 'noise', freq: 300, to: 80, dur: .9, vol: .3, filter: 'lowpass' }],
  bulwark_on: { wave: 'triangle', freq: 'C5', arp: [0, 7, 12, 19], step: .05, dur: .3, vol: .16 }, bulwark_off: { wave: 'triangle', freq: 'C6', arp: [0, -5, -12], step: .05, dur: .2, vol: .12 },
  autopilot_on: { wave: 'square', freq: 'G5', arp: [0, 5, 0, 5], step: .06, dur: .3, vol: .1 }, autopilot_off: { wave: 'square', freq: 'G5', arp: [5, 0], step: .06, dur: .15, vol: .1 },
  nitro: [{ wave: 'noise', freq: 300, to: 3000, dur: .6, vol: .35 }, { wave: 'saw', freq: 100, to: 500, dur: .6, vol: .1, lp: { f: 900, q: 6 } }], siphon: { wave: 'saw', freq: 400, to: 1200, dur: .5, vol: .08, vib: [50, .3] },
  absorb: [{ wave: 'noise', freq: 4000, to: 500, dur: .3, vol: .2 }, { wave: 'triangle', freq: 'E6', arp: [0, 4, 7], step: .05, dur: .25, vol: .14, delay: .15 }],
  hit_light: { wave: 'noise', freq: 2000, to: 700, dur: .1, vol: .3 }, hit_heavy: [{ wave: 'noise', freq: 1200, to: 200, dur: .35, vol: .5 }, { wave: 'square', freq: 160, to: 50, dur: .25, vol: .22 }],
  whoosh_up: { wave: 'noise', freq: 400, to: 1600, dur: .3, vol: .12 }, drill_ok: { wave: 'triangle', freq: 'G5', arp: [0, 4, 7, 12], step: .06, dur: .35, vol: .2 }, drill_fail: { wave: 'square', freq: 330, to: 165, dur: .3, vol: .12 }
};
const A = SN.Audio = {
  hums: [], scrapeT: 0, songId: null,
  init() { if (this._init) return; this._init = true; const a = SN.game.audio; for (const k in SFX) a.define(k, SFX[k]); },
  get ctx() { return SN.game.audio.ctx; },
  sfx(name, o) { if (!SN.game) return; this.init(); try { SN.game.audio.sfx(name, o); } catch (e) { /* no sound */ } },
  music(id, o = {}) { this.init(); const s = SN.SONGS[id]; if (!s || this.songId === id && !o.restart) return; this.songId = id; SN.game.audio.music(s, Object.assign({ sync: !!o.sync, fade: o.fade ?? .6 }, o)); this.layersOn = new Set(s.tracks.filter(t => t.on !== false).map(t => t.name)); },
  has(name) { const s = SN.SONGS[this.songId]; return s && s.tracks.some(t => t.name === name); },
  layer(name, on, fade = 1) { if (!this.has(name)) return; SN.game.audio.layer(name, on ? 1 : 0, fade); if (on) this.layersOn.add(name); else this.layersOn.delete(name); },
  sting(song) { try { SN.game.audio.sting(song, { at: 'beat' }); } catch (e) { /* no sound */ } },
  stingNamed(k) { if (SN.STINGS[k]) this.sting(SN.STINGS[k]); },
  /** 0..1 on each beat of the music (the overclock skin pulses with it) */
  beat() { const p = SN.game.audio.pos; return p.playing ? Math.max(0, 1 - (p.beat % 1) * 3) : 0; },
  raceStart(R, S) {
    if (R.attract && !SN.Attract.sound) return;
    const id = R.mode === 'overclock' ? 'overclock' : SN.SONG_OF[R.track.id] || 'solenne', s = SN.SONGS[id];
    this.music(id, { sync: true, restart: true, fade: .4 });
    for (const t of ['kick', 'hats', 'clap', 'snare', 'arp', 'lead', 'boom']) this.layer(t, id === 'overclock' && t === 'kick', 0);
    if (SN.HUD && !R.attract) SN.HUD.note('♪ ' + s.title + ' - ' + s.artist, 0);
    this.race = R; this.makeHums();
  },
  go() { for (const t of ['kick', 'hats', 'clap', 'snare', 'arp', 'boom']) this.layer(t, true, .3); },
  finalLap() { this.layer('lead', true, 1); this.stingNamed('final'); },
  raceOver() { for (const t of ['kick', 'hats', 'clap', 'snare', 'arp', 'lead', 'boom']) this.layer(t, false, 2.5); },
  zone(n) {
    const order = ['hats', 'clap', 'arp', 'snare', 'lead', 'boom']; for (let k = 0; k < Math.min(order.length, Math.floor(n / 2)); k++) if (!this.layersOn.has(order[k])) this.layer(order[k], true, 1);
    try { SN.game.audio.tempo(Math.min(176, 120 + 3 * n)); } catch (e) { /* none */ }
  },
  scrape() { this.sfx('scrape', { vol: .6 }); },
  raceEnd() { this.stopHums(); this.race = null; },
  /** the announcer: a line spoken in gibberish and shown as a subtitle */
  announce(text, delay = 0) {
    if (!text) return; const say = () => { if (SN.game.settings.announcer !== false) SN.Voice.say(text, SN.VOICES.oracle); if (SN.HUD && SN.HUD.subtitle) SN.HUD.subtitle(text); };
    if (delay) SN.game.after(delay, say); else say();
  },
  voice(text, v) { return SN.Voice.say(text, Object.assign({}, SN.VOICES.pilot, v)); },
  /* ---- engine hums: four persistent graphs, the nearest craft ---- */
  makeHums() {
    const c = this.ctx; this.stopHums(); if (!c || !SN.game.audio._sfxBus) return;
    for (let k = 0; k < 4; k++) {
      const o1 = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : null;
      o1.type = 'sawtooth'; o2.type = 'square'; o2.detune.value = 7; lp.type = 'lowpass'; lp.Q.value = 3; g.gain.value = 0;
      o1.connect(lp); o2.connect(lp); lp.connect(g); if (pan) { g.connect(pan); pan.connect(SN.game.audio._sfxBus); } else g.connect(SN.game.audio._sfxBus);
      o1.start(); o2.start(); this.hums.push({ o1, o2, lp, g, pan });
    }
  },
  /** silence the hums while the game is paused (update doesn't run then; draw does) */
  pauseCheck() { const c = this.ctx; if (!c || !this.hums.length) return; if (SN.game.paused || SN.hubEnded) for (const h of this.hums) h.g.gain.setTargetAtTime(0, c.currentTime, .03); },
  stopHums() { for (const h of this.hums) { try { h.g.gain.value = 0; h.o1.stop(); h.o2.stop(); h.g.disconnect(); } catch (e) { /* gone */ } } this.hums = []; },
  /** each few steps: the hums follow the nearest craft */
  update(R, view) {
    const c = this.ctx; if (!c || !this.hums.length || !R) return;
    const muted = SN.game.paused || SN.game.audio.muted || SN.hubEnded, now = c.currentTime, w = view.world;
    const players = R.humans.length ? R.humans : [view.cams[0].ship], me = view.cams[0].ship || players[0];
    const list = R.ships.filter(s => !s.elim).sort((a, b) => (players.includes(b) - players.includes(a)) || SN.V.dist(a.P, me.P) - SN.V.dist(b.P, me.P)).slice(0, 4);
    this.hums.forEach((h, k) => {
      const sh = list[k]; if (!sh || muted) { h.g.gain.setTargetAtTime(0, now, .05); return; }
      const v = Math.max(0, SN.Ship.fwdSpeed(sh)), kv = Math.min(1.5, v / sh.st.top), mine = players.includes(sh), d = SN.V.dist(sh.P, me.P);
      const rel = mine ? 0 : (SN.V.dot(sh.V, SN.V.norm(SN.V.sub(me.P, sh.P, [0, 0, 0]))) - SN.V.dot(me.V, SN.V.norm(SN.V.sub(me.P, sh.P, [0, 0, 0])))), dop = Math.max(.85, Math.min(1.15, 1 + rel / 6000));
      const f = (48 + 120 * kv + (sh.thrustOn ? Math.sin(SN.game.real * 30) * 2 : 0)) * dop, boost = sh.boostT > 0 || sh.nitroT > 0;
      h.o1.frequency.setTargetAtTime(f, now, .05); h.o2.frequency.setTargetAtTime(f * 1.005, now, .05);
      h.lp.frequency.setTargetAtTime(500 + 2500 * kv + (boost ? 1500 : 0), now, .05);
      const vol = mine ? (R.humans.length > 1 ? .07 : .09) : .07 / (1 + d / 800);
      h.g.gain.setTargetAtTime(vol, now, .08);
      if (h.pan) { let p = 0; if (mine && R.humans.length > 1) p = sh.player ? .6 : -.6; else if (!mine && w) { const q = w.project(sh.P[0], sh.P[1], sh.P[2]); p = q ? Math.max(-1, Math.min(1, (q[0] / SN.game.W) * 2 - 1)) : 0; } h.pan.pan.setTargetAtTime(p, now, .05); }
    });
  }
};

/* ---- gibberish voices (Appendix B): every word its own syllables, seeded by the word ---- */
const FORMANTS = { A: [800, 1200], E: [400, 2000], I: [300, 2300], O: [450, 800], U: [325, 700] };
SN.VOICES = { oracle: { f0: 205, speed: .85, ring: true, vol: .5 }, pilot: { f0: 160, speed: 1.15, vol: .45 }, principal: { f0: 150, speed: .9, vol: .45 } };
SN.Voice = {
  /** speak text in gibberish (headless: just the duration); returns seconds */
  say(text, v = SN.VOICES.pilot) {
    const words = String(text).toUpperCase().replace(/[^A-Z0-9?!.' ]/g, ' ').split(/\s+/).filter(Boolean);
    const audio = SN.game && SN.game.audio, ctx = audio && audio.ready && !audio.muted ? audio.ctx : null, out = ctx && audio._sfxBus, t0 = ctx ? ctx.currentTime + .02 : 0;
    let t = 0; const sp = v.speed || 1;
    for (const w of words) {
      const rnd = E.rng(SN.hashString(w)), n = Math.max(1, Math.round(w.replace(/[^A-Z]/g, '').length / 2.6));
      for (let i = 0; i < n; i++) {
        const ch = w[(i * 2 + 1) % w.length], vi = 'AEIOU'.indexOf(ch), vowel = 'AEIOU'[vi >= 0 ? vi : (rnd() * 5) | 0];
        const dur = (.07 + rnd() * .04) / sp, last = i === n - 1, bend = last && /[.]$/.test(w) ? .88 : last && /[?]$/.test(w) ? 1.18 : last && /!$/.test(w) ? 1.1 : 1;
        const f = (v.f0 || 160) * (.92 + rnd() * .16) * bend, cf = 2000 + rnd() * 3000;
        if (ctx) try { this._syl(ctx, out, t0 + t, dur, f, FORMANTS[vowel], cf, v, last && /!$/.test(w)); } catch (e) { /* no sound */ }
        t += dur + .012;
      }
      t += .06 / sp;
    }
    return t;
  },
  _syl(c, out, t, dur, f, [F1, F2], cf, v, loud) {
    const vol = (v.vol || .45) * (loud ? 1.25 : 1) * .5;
    // the consonant: a short band-passed noise burst
    const nb = c.createBufferSource(); nb.buffer = SN.game.audio._noise; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = cf; bp.Q.value = 2; const ng = c.createGain();
    ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(vol * .5, t + .004); ng.gain.exponentialRampToValueAtTime(.0005, t + .02); nb.connect(bp); bp.connect(ng); ng.connect(out); nb.start(t, Math.random() * .5); nb.stop(t + .03);
    // the vowel: a saw through two formant filters, with vibrato, a little breath, ring mod or bit crush
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t + .012); o.frequency.linearRampToValueAtTime(f * (1 + (Math.random() - .5) * .06), t + .012 + dur);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 6; lg.gain.value = f * .015; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + .1);
    const g = c.createGain(); g.gain.setValueAtTime(0, t + .012); g.gain.linearRampToValueAtTime(vol, t + .02); g.gain.setValueAtTime(vol, t + .012 + dur - .03); g.gain.linearRampToValueAtTime(0, t + .012 + dur);
    let src = o;
    if (v.crush) { const ws = c.createWaveShaper(), cv = new Float32Array(64); for (let i = 0; i < 64; i++) cv[i] = Math.round(((i / 63) * 2 - 1) * 4) / 4; ws.curve = cv; o.connect(ws); src = ws; }
    for (const [F, q] of [[F1, 6], [F2, 6]]) { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = F; b.Q.value = q; src.connect(b); b.connect(g); }
    let tail = g;
    if (v.ring) { const rm = c.createGain(), ro = c.createOscillator(); ro.frequency.value = 60; rm.gain.value = .6; const depth = c.createGain(); depth.gain.value = .4; ro.connect(depth); depth.connect(rm.gain); g.connect(rm); ro.start(t); ro.stop(t + dur + .1); tail = rm; }
    const br = c.createBufferSource(); br.buffer = SN.game.audio._noise; const brg = c.createGain(); brg.gain.setValueAtTime(vol * .15, t + .012); brg.gain.linearRampToValueAtTime(0, t + .012 + dur); br.connect(brg); brg.connect(out); br.start(t + .012, Math.random() * .5); br.stop(t + dur + .05);
    tail.connect(out); o.start(t + .012); o.stop(t + .012 + dur + .05);
  }
};
})();
