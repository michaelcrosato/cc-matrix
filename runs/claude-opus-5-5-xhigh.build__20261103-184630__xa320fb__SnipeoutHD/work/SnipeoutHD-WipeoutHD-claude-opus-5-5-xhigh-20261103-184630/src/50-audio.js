// SNIPEOUT HD: sound, all synthesized. The effects catalogue (engine voices), the engine hums (a graph per nearby craft:
// pitch and filter by speed, Doppler, pan), the music director (layers by race state, the final lap, overclock's
// tempo), the gibberish voice (Animalese / Simlish: syllables seeded by each word, formant vowels), the announcer and
// the race radio. Headless, every call is computed without sound (Voice.say still returns its length).
(() => {
const E = My3D2dge, SN = globalThis.SN, V = SN.v;
const A = SN.audio = { hums: [], lastRadio: -99, subtitle: null, muted: false };
const G = () => E.current, AU = () => G() && G().audio;

/* ---- the effects ---- */
const SFX = {
  ui_move: { wave: 'pulse', freq: 1320, dur: .035, vol: .12 }, ui_ok: [{ wave: 'square', freq: 880, dur: .05, vol: .14 }, { wave: 'square', freq: 1320, dur: .07, vol: .14, delay: .05 }],
  ui_back: [{ wave: 'square', freq: 660, dur: .05, vol: .12 }, { wave: 'square', freq: 440, dur: .07, vol: .12, delay: .05 }], ui_locked: { wave: 'saw', freq: 110, dur: .16, vol: .14, lp: { f: 600, q: 4 } }, ui_tab: { wave: 'noise', freq: 4000, dur: .02, vol: .1, filter: 'highpass' },
  count_beep: { wave: 'square', freq: 'A5', dur: .14, vol: .16 }, count_go: [{ wave: 'saw', freq: 'A5', dur: .5, vol: .1, uni: 3, det: 10 }, { wave: 'saw', freq: 'E6', dur: .5, vol: .08 }, { wave: 'saw', freq: 'C#6', dur: .5, vol: .08 }],
  lap: { wave: 'triangle', freq: 'E6', arp: [0, 4, 7], step: .06, dur: .3, vol: .2 }, wrongway: { wave: 'square', freq: 880, to: 440, dur: .3, vol: .12, vib: [8, .1] },
  pos_up: { wave: 'pulse', freq: 'C6', arp: [0, 7], step: .05, dur: .12, vol: .1 }, pos_down: { wave: 'pulse', freq: 'G5', arp: [0, -5], step: .05, dur: .12, vol: .1 },
  boost_pad: [{ wave: 'noise', freq: 900, to: 4000, dur: .35, vol: .2 }, { wave: 'saw', freq: 300, to: 1200, dur: .3, vol: .07, lp: { f: 1800, q: 3 } }],
  pickup_roll: { wave: 'pulse', freq: 'E6', arp: [0, 5, 7, 12, 0, 5, 7, 12], step: .055, dur: .48, vol: .1 }, weapon_pad: { wave: 'triangle', freq: 'C6', arp: [0, 7, 12, 19], step: .04, dur: .2, vol: .14 },
  sideshift: { wave: 'noise', freq: 2400, to: 800, dur: .12, vol: .18 }, roll: { wave: 'saw', freq: 200, to: 600, dur: .4, vol: .08, vib: [20, .2] }, roll_boost: [{ wave: 'saw', freq: 'C5', arp: [0, 4, 7, 12], step: .05, dur: .28, vol: .1, uni: 2, det: 10 }, { wave: 'noise', freq: 1200, to: 5000, dur: .4, vol: .14 }],
  botch: [{ wave: 'noise', freq: 800, to: 200, dur: .35, vol: .3, filter: 'lowpass' }, { wave: 'square', freq: 220, to: 80, dur: .3, vol: .12 }],
  land_soft: { wave: 'noise', freq: 500, to: 200, dur: .1, vol: .2, filter: 'lowpass' }, land_hard: [{ wave: 'noise', freq: 700, to: 90, dur: .35, vol: .4, filter: 'lowpass' }, { wave: 'square', freq: 150, to: 70, dur: .2, vol: .2 }, { wave: 'noise', freq: 3000, dur: .06, vol: .18, delay: .05, filter: 'highpass' }],
  wall_hit: [{ wave: 'noise', freq: 2200, to: 600, dur: .18, vol: .35 }, { wave: 'square', freq: 320, to: 120, dur: .12, vol: .14 }], bump: [{ wave: 'noise', freq: 1200, to: 300, dur: .12, vol: .3 }, { wave: 'triangle', freq: 160, to: 80, dur: .1, vol: .3 }],
  low_shield: { wave: 'square', freq: 'B5', dur: .08, vol: .12 }, explode: [{ wave: 'noise', freq: 900, to: 50, dur: .9, vol: .55, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 28, dur: .9, vol: .5 }],
  eliminated: [{ wave: 'saw', freq: 'E4', to: 'E2', dur: .8, vol: .12, lp: { f: 1200, q: 6 } }, { wave: 'noise', freq: 600, to: 60, dur: 1, vol: .4, filter: 'lowpass' }], respawn: { wave: 'triangle', freq: 'C5', arp: [0, 7, 12, 19, 24], step: .05, dur: .3, vol: .14 },
  rescue: { wave: 'saw', freq: 300, to: 700, dur: 1.2, vol: .06, vib: [14, .06], lp: { f: 1400, q: 3 } },
  swarm_fire: [{ wave: 'noise', freq: 3000, to: 700, dur: .25, vol: .26 }, { wave: 'saw', freq: 600, to: 200, dur: .2, vol: .07 }], seeker_lock: { wave: 'square', freq: 'E6', dur: .06, vol: .12 }, seeker_locked: { wave: 'square', freq: 'B6', dur: .3, vol: .1 },
  seeker_fire: [{ wave: 'noise', freq: 2000, to: 500, dur: .4, vol: .25 }, { wave: 'saw', freq: 900, to: 300, dur: .35, vol: .07 }], mine_drop: { wave: 'square', freq: 300, to: 180, dur: .06, vol: .14 },
  cannon_fire: { wave: 'pulse12', freq: 1400, to: 500, dur: .05, vol: .12 }, rail_charge: { wave: 'saw', freq: 200, to: 2400, dur: .8, vol: .06, lp: { f: 3000, q: 6 } },
  rail_fire: [{ wave: 'noise', freq: 6000, to: 1500, dur: .1, vol: .4, filter: 'highpass' }, { wave: 'saw', freq: 2400, to: 120, dur: .7, vol: .12, uni: 2, det: 20 }],
  tremor: [{ wave: 'sine', freq: 60, to: 30, dur: 1, vol: .5 }, { wave: 'noise', freq: 300, to: 60, dur: 1, vol: .3, filter: 'lowpass' }], bulwark_on: { wave: 'triangle', freq: 'C5', arp: [0, 7, 12], step: .06, dur: .3, vol: .2 }, bulwark_off: { wave: 'triangle', freq: 'C6', arp: [0, -5, -12], step: .06, dur: .3, vol: .14 },
  autopilot_on: { wave: 'pulse', freq: 'A5', arp: [0, 5, 9], step: .06, dur: .25, vol: .12 }, autopilot_off: { wave: 'pulse', freq: 'A5', arp: [9, 5, 0], step: .06, dur: .25, vol: .1 },
  nitro: [{ wave: 'noise', freq: 600, to: 5000, dur: .6, vol: .3 }, { wave: 'saw', freq: 200, to: 1600, dur: .5, vol: .08, lp: { f: 2200, q: 4 } }], siphon: { wave: 'saw', freq: 140, to: 260, dur: .5, vol: .07, vib: [30, .2] },
  absorb: [{ wave: 'noise', freq: 5000, to: 600, dur: .3, vol: .2 }, { wave: 'triangle', freq: 'G6', arp: [0, -5, -12], step: .06, dur: .25, vol: .16, delay: .1 }], hit_light: [{ wave: 'noise', freq: 2500, to: 700, dur: .12, vol: .3 }, { wave: 'square', freq: 400, to: 150, dur: .08, vol: .12 }],
  hit_heavy: [{ wave: 'noise', freq: 1200, to: 80, dur: .5, vol: .45, filter: 'lowpass' }, { wave: 'square', freq: 200, to: 50, dur: .3, vol: .18 }, { wave: 'noise', freq: 5000, dur: .05, vol: .25, filter: 'highpass' }],
  perfect: { wave: 'square', freq: 'C6', arp: [0, 4, 7, 12], step: .04, dur: .22, vol: .12 }, stall: { wave: 'saw', freq: 200, to: 60, dur: .4, vol: .14 }, drill_ok: { wave: 'triangle', freq: 'C6', arp: [0, 4, 7, 12, 16], step: .05, dur: .35, vol: .18 }, drill_fail: { wave: 'square', freq: 300, to: 150, dur: .3, vol: .12 },
  gate: { wave: 'triangle', freq: 'G6', dur: .12, vol: .16 }, card_ready: { wave: 'triangle', freq: 'C6', arp: [0, 7], step: .07, dur: .2, vol: .16 }
};
A.define = () => { const au = AU(); if (!au) return; for (const k in SFX) au.define(k, SFX[k]); };
A.sfx = (name, o) => { const au = AU(); if (au && !A.muted) au.sfx(name, o); };

/* ---- the gibberish voice ---- */
const FORMANTS = { A: [800, 1200], E: [400, 2000], I: [300, 2300], O: [450, 800], U: [325, 700] };
const crushCurve = (() => { if (typeof Float32Array === 'undefined') return null; const c = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 127.5 - 1; c[i] = Math.round(x * 5) / 5; } return c; })();
const Voice = SN.Voice = {
  /** speak text as gibberish in a voice ({ f0, speed, ring, crush, vol }); returns its length in seconds */
  say(text, v = SN.ORACLE, o = {}) {
    const words = String(text).toUpperCase().replace(/\{[^}]*\}/g, '').replace(/[^A-Z0-9?!.' ]/g, ' ').split(/\s+/).filter(Boolean);
    const au = AU(), ctx = au && au.ctx && au.ready && !A.muted && G().settings.announcer !== false ? au.ctx : null, speed = v.speed || 1, f0 = v.f0 || 160;
    let t = 0; const t0 = ctx ? ctx.currentTime + .02 : 0, out = ctx ? au._sfxBus : null;
    let chain = null;
    if (ctx) {
      const g = ctx.createGain(); g.gain.value = (v.vol || .5) * (o.vol || 1); chain = g; g.connect(out);
      if (v.crush && crushCurve) { const ws = ctx.createWaveShaper(); ws.curve = crushCurve; ws.connect(g); chain = ws; }
      if (v.ring) { const rg = ctx.createGain(), osc = ctx.createOscillator(); osc.frequency.value = 60; rg.gain.value = .6; const dc = ctx.createGain(); dc.gain.value = .4; osc.connect(rg.gain); rg.connect(chain); dc.connect(chain); osc.start(t0); osc.stop(t0 + 30); const split = ctx.createGain(); split.connect(rg); split.connect(dc); chain = split; }
    }
    for (const w of words) {
      const rnd = E.rng(SN.hashString(w)), letters = w.replace(/[^A-Z]/g, ''), n = Math.max(1, Math.round(letters.length / 2.6));
      for (let i = 0; i < n; i++) {
        const ch = w[(i * 2 + 1) % w.length], vi = 'AEIOU'.indexOf(ch), vowel = 'AEIOU'[vi >= 0 ? vi : Math.floor(rnd() * 5)];
        const dur = (.07 + rnd() * .04) / speed, last = i === n - 1;
        const bend = last && /\.$/.test(w) ? .88 : last && /\?$/.test(w) ? 1.18 : last && /!$/.test(w) ? 1.1 : 1;
        const f = f0 * (.92 + rnd() * .16) * bend, loud = /!$/.test(w) ? 1.25 : 1;
        if (ctx) Voice._syllable(ctx, chain, t0 + t, dur, f, FORMANTS[vowel], 2000 + rnd() * 3000, loud);
        t += dur + .012;
      }
      t += .06 / speed;
    }
    return t;
  },
  _syllable(ctx, out, t, dur, f, F, cf, loud) {
    // the consonant: a burst of band-passed noise; the vowel: a saw through two formant band-passes, a little breath
    const au = AU(), nb = au._noise;
    if (nb) { const s = ctx.createBufferSource(); s.buffer = nb; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = cf; bp.Q.value = 2; const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.25 * loud, t + .004); g.gain.exponentialRampToValueAtTime(.0005, t + .018); s.connect(bp); bp.connect(g); g.connect(out); s.start(t, Math.random() * .5); s.stop(t + .03); }
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t + .012); o.frequency.linearRampToValueAtTime(f * .97, t + .012 + dur);
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 6; vg.gain.value = f * .015; vib.connect(vg); vg.connect(o.frequency);
    const env = ctx.createGain(); env.gain.setValueAtTime(.0001, t + .012); env.gain.linearRampToValueAtTime(.5 * loud, t + .02); env.gain.setValueAtTime(.5 * loud, t + .012 + dur - .03); env.gain.linearRampToValueAtTime(.0001, t + .012 + dur);
    for (const ff of F) { const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = 6; o.connect(bp); bp.connect(env); }
    if (nb) { const s = ctx.createBufferSource(); s.buffer = nb; const ng = ctx.createGain(); ng.gain.value = .15; s.connect(ng); ng.connect(env); s.start(t + .012, Math.random() * .5); s.stop(t + .012 + dur); }
    env.connect(out); o.start(t + .012); o.stop(t + .012 + dur + .02); vib.start(t + .012); vib.stop(t + .012 + dur + .02);
  },
  /** a speaker's voice */
  of(who) {
    if (!who || who === 'ORACLE' || who === SN.ORACLE) return SN.ORACLE;
    const P = SN.PILOTS[who] || SN.PRINCIPALS[who]; if (!P) return SN.ORACLE;
    return { f0: P.f0, speed: SN.PILOTS[who] ? 1.1 + (P.f0 % 3) * .07 : .9, crush: !!P.crush, vol: .45 };
  }
};

/* ---- the announcer and the race radio (subtitles on the HUD) ---- */
A.announce = (text, o = {}) => {
  const d = Voice.say(text, SN.ORACLE);
  if (G().settings.subtitles !== false) A.subtitle = { who: 'ORACLE', text, t: 0, dur: Math.max(1.6, d + .6), portrait: 'oracle' };
  return d;
};
A.radio = (pilot, text, race, force) => {
  if (!race || (!force && race.clock - A.lastRadio < 12)) return;
  A.lastRadio = race.clock; const d = Voice.say(text, Voice.of(pilot));
  if (G().settings.subtitles !== false) A.subtitle = { who: SN.PILOTS[pilot] ? SN.PILOTS[pilot].name : pilot, text, t: 0, dur: Math.max(2.2, d + .8), portrait: pilot };
};
A.tickSubtitle = dt => { if (A.subtitle) { A.subtitle.t += dt; if (A.subtitle.t > A.subtitle.dur) A.subtitle = null; } };

/* ---- the music director ---- */
A.music = (id, o = {}) => {
  const au = AU(); if (!au) return;
  const song = id ? (SN.SONGS[id] || null) : null;
  if (!song) { au.music(null, { fade: o.fade || .5 }); A.songId = null; return; }
  if (A.songId === id && au.song && !o.restart) return;
  A.songId = id; au.music(song, { sync: !!o.sync, fade: o.fade === undefined ? .8 : o.fade, restart: !!o.restart });
  if (o.layers) A.layers(o.layers);
};
/** set the playing song's layers: names on at full, the rest off ('all': every track) */
A.layers = (on, fade = .6) => {
  const au = AU(); if (!au || !au.song) return; const S = SN.SONGS[A.songId]; if (!S) return;
  for (const t of S.tracks) au.layer(t.name, on === 'all' || on.includes(t.name) ? 1 : 0, fade);
};
A.layer = (name, vol, fade) => { const au = AU(); if (au && au.song && SN.SONGS[A.songId] && SN.SONGS[A.songId].tracks.some(t => t.name === name)) au.layer(name, vol, fade); };
A.sting = id => { const au = AU(); if (au && SN.STINGS[id]) au.sting(SN.STINGS[id], { at: 'now', duck: .45 }); };
A.nowPlaying = id => { const S = SN.SONGS[id]; return S ? '♪ ' + S.title + ' · ' + S.artist : ''; };

/* ---- the engine hums: a graph per nearby craft ---- */
A.humStep = (race, listener, cams, dt, on) => {
  const au = AU(), ctx = au && au.ctx; if (!ctx || !au.ready) return;
  const muted = !on || A.muted || G().paused || au.muted;
  if (!A.hums.length) for (let k = 0; k < 4; k++) {
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    o1.type = 'sawtooth'; o2.type = 'square'; o2.detune.value = 12; lp.type = 'lowpass'; lp.Q.value = 2; g.gain.value = 0;
    const g2 = ctx.createGain(); g2.gain.value = .5; o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(pan); pan.connect(au._sfxBus);
    o1.start(); o2.start(); A.hums.push({ o1, o2, lp, g, pan, ship: null });
  }
  const now = ctx.currentTime;
  // the nearest craft to the listener get the voices (the humans' own first)
  const list = race ? race.ships.filter(s => !s.hidden && !s.elim && !s.ghost && !s.drone) : [];
  const ref = listener || (race && race.player) || list[0];
  list.sort((a, b) => (a.control === 'human' ? -1e9 : 0) + (ref ? V.dist(a.P, ref.P) : 0) - ((b.control === 'human' ? -1e9 : 0) + (ref ? V.dist(b.P, ref.P) : 0)));
  A.hums.forEach((h, k) => {
    const s = list[k]; h.ship = s || null;
    if (!s || muted) { h.g.gain.setTargetAtTime(0, now, .05); return; }
    const top = s.st.top * s.topK, kv = Math.min(1.4, s.speed / top), own = s.control === 'human';
    const d = ref && !own ? V.dist(s.P, ref.P) : 0, vol = own ? (race.humans.length > 1 ? .07 : .11) : .08 / (1 + d / 800);
    let dop = 1; if (ref && !own) { const rel = V.sub([0, 0, 0], ref.P, s.P), l = V.len(rel) || 1, vr = (V.dot(s.V, rel) - V.dot(ref.V, rel)) / l; dop = E.clamp(1 + vr / 6000, .85, 1.15); }
    const f = (48 + 120 * kv + (s.lastThrust ? 6 * Math.sin(race.clock * 30 + k) : 0)) * dop;
    h.o1.frequency.setTargetAtTime(f, now, .03); h.o2.frequency.setTargetAtTime(f * 1.5, now, .03);
    h.lp.frequency.setTargetAtTime(500 + 2500 * kv + (s.boostT > 0 ? 1500 : 0), now, .05);
    h.g.gain.setTargetAtTime(vol * (.5 + .5 * kv), now, .05);
    if (h.pan.pan) { let p = 0; if (own && race.humans.length > 1) p = s.pi === 0 ? -.6 : .6; else if (!own && cams && cams.project) { const q = cams.project(s.P[0], s.P[1], s.P[2]); if (q) p = E.clamp((q[0] / G().W) * 2 - 1, -1, 1); } h.pan.pan.setTargetAtTime(p, now, .05); }
  });
};
A.silenceHums = () => { const au = AU(); if (!au || !au.ctx) return; for (const h of A.hums) h.g.gain.setTargetAtTime(0, au.ctx.currentTime, .03); };
A.stopAll = () => { A.muted = true; A.silenceHums(); const au = AU(); if (au) au.music(null, { fade: .2 }); };

/* ---- race events to sounds, callouts, radio ---- */
A.events = (race, o = {}) => {
  const human = s => s && s.control === 'human';
  for (const e of race.events) {
    const s = e.ship, me = human(s);
    switch (e.t) {
      case 'count': A.sfx('count_beep'); A.announce(SN.STORY.announce[e.n]); break;
      case 'go': A.sfx('count_go'); A.announce(SN.STORY.announce.go); A.layers('all'); if (SN.SONGS[A.songId]) for (const t of SN.SONGS[A.songId].tracks) if (t.name === 'lead' || (race.mode === 'overclock' && t.on === false)) A.layer(t.name, 0, .1); break;
      case 'perfectstart': if (me) { A.sfx('perfect'); A.announce(SN.STORY.announce.perfectstart); } break;
      case 'stall': if (me) A.sfx('stall'); break;
      case 'lap': if (me) { A.sfx('lap'); A.sting('lap'); } break;
      case 'finallap': if (me) { A.sting('finallap'); A.announce(SN.STORY.announce.finallap); A.layer('lead', 1, 1.5); if (o.radio !== false) { const r = SN.PILOTS[SN.rivalFor(s.team)]; A.radio(r.id, SN.STORY.radio.final[Math.floor(race.clock) % 2], race); } } break;
      case 'finish': if (me) { A.announce(e.place === 1 ? SN.STORY.announce.winner : SN.STORY.announce.raceover); A.sting(e.place <= 3 ? 'win' : 'podium'); A.layers(['pad', 'pad2'], 2); } break;
      case 'wrongway': if (me) { A.sfx('wrongway'); A.announce(SN.STORY.announce.wrongway); } break;
      case 'position': if (me) A.sfx(e.to < e.from ? 'pos_up' : 'pos_down'); break;
      case 'pad': if (me) A.sfx('boost_pad'); break;
      case 'pickup': if (me) { A.sfx(e.pad ? 'pickup_roll' : 'weapon_pad'); const W = SN.WEAPONS[e.weapon]; race.later(.5, () => A.announce(W.name)); } break;
      case 'sideshift': if (me) A.sfx('sideshift'); break;
      case 'rollstart': if (me) A.sfx('roll'); break;
      case 'roll': if (me) { if (e.ok) { A.sfx('roll_boost'); A.announce(SN.STORY.announce.roll); } else A.sfx('botch'); } break;
      case 'land': if (me) A.sfx(e.hard ? 'land_hard' : 'land_soft'); break;
      case 'wall': if (me) A.sfx('wall_hit', { pitch: E.clamp(e.impact / 600, .7, 1.4) }); break;
      case 'bump': if (me || human(e.other)) A.sfx('bump'); break;
      case 'lowshield': A.sfx('low_shield'); break;
      case 'fire': if (me || o.all) A.sfx({ swarm: 'swarm_fire', seeker: 'seeker_fire', mine: 'mine_drop', cannon: 'cannon_fire', rail: 'rail_fire', tremor: 'tremor', bulwark: 'bulwark_on', autopilot: 'autopilot_on', nitro: 'nitro', siphon: 'siphon' }[e.weapon]); if (s) s._firedAt = race.clock; break;
      case 'lock': if (human(e.target)) A.sfx('seeker_locked'); if (me) A.sfx('seeker_lock'); break;
      case 'absorb': if (me) A.sfx('absorb'); break;
      case 'bulwark': if (me && !e.on) A.sfx('bulwark_off'); break;
      case 'autopilot': if (me && !e.on) A.sfx('autopilot_off'); break;
      case 'hit': if (me || human(e.by)) A.sfx(e.dmg > 15 ? 'hit_heavy' : 'hit_light'); if (me && !e.soft && e.by && o.radio !== false && Math.random() < .4) A.radio(s.pilot, SN.STORY.radio.hit[Math.floor(race.clock) % 3], race); break;
      case 'elim': A.sfx('explode'); if (me) { A.sfx('eliminated'); A.announce(SN.STORY.announce.elim); A.sting('elim'); } else if (e.sniped && human(e.by)) A.announce(SN.STORY.announce.sniped); else if (human(e.by) && o.radio !== false) A.radio(s.pilot, SN.STORY.radio.elim[Math.floor(race.clock) % 3], race); break;
      case 'respawn': if (me) A.sfx('respawn'); break;
      case 'rescue': if (me) A.sfx('rescue'); break;
      case 'boom': A.sfx('explode', { vol: .5 }); break;
      case 'zone': A.sfx('pickup_roll', { vol: .6 }); A.sting('zone'); A.announce('ZONE ' + e.n); if (e.n % 2 === 0) { const S = SN.SONGS.overclock, off = S.tracks.filter(t => t.on === false); const k = Math.min(off.length, Math.floor(e.n / 2)); off.slice(0, k).forEach(t => A.layer(t.name, 1, 1)); } { const au = AU(); if (au && au.song && A.songId === 'overclock') au.tempo(Math.min(176, 120 + 3 * e.n)); } if (e.n === 40) A.announce(SN.STORY.announce.overclocked); break;
      case 'drill': if (e.ok === true) A.sfx('drill_ok'); else if (e.ok === false) A.sfx('drill_fail'); break;
      case 'gate': A.sfx('gate'); break;
      case 'points': if (me && e.sniped) A.announce(SN.STORY.announce.sniped); break;
    }
    // the radio: overtakes by named pilots, now and then
    if (e.t === 'position' && me && o.radio !== false && race.clock - A.lastRadio > 12) {
      const other = race.order[e.to < e.from ? e.to : e.to - 2]; if (other && other !== s && other.control === 'ai') A.radio(other.pilot, e.to < e.from ? SN.STORY.radio.overtaken[Math.floor(race.clock) % 3] : SN.PILOTS[other.pilot].banter[Math.floor(race.clock) % 3], race);
    }
  }
};
})();
