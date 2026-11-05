/* SKILLER7 — audio, all in code: the engine's chip synth for music and effects, plus our own WebAudio laughter
 * (formant-filtered "ha"s, positional) and Animalese-style gibberish voices typed along with the dialog (§10).
 * Everything here listens to the bus; nothing changes the sim. Headless (no AudioContext) it all does nothing. */
const AU = { song: null, layerOn: false, voices: [], laughs: 0, lastShown: -1, lastLine: -1, bark: null };
S7.AU = AU;
const A_ = () => S7.game && S7.game.audio;
S7.sfx = (name, o) => { const a = A_(); if (!a || S7.game.headless) return; a.sfx(name, o); };
S7.music = (id, o = {}) => {
  const a = A_(); if (!a) return; if (AU.song === id && !o.restart) return; AU.song = id;
  if (!id) { a.music(null); return; }
  const s = S7.SONGS[id]; if (!s) return;
  a.music(JSON.parse(JSON.stringify(s)), Object.assign({ sync: true, fade: o.fade ?? .8 }, s.loop === false ? { loop: false } : {}));
  AU.layerOn = false;
};
const SFX = {
  tick: { wave: 'pulse12', freq: 'A6', dur: .03, vol: .08 }, confirm: [{ wave: 'pulse', freq: 'E5', dur: .06, vol: .12 }, { wave: 'pulse', freq: 'B5', dur: .08, vol: .1, delay: .05 }],
  back: { wave: 'pulse', freq: 'B4', to: 'E4', dur: .08, vol: .1 }, dry: { wave: 'noise', freq: 3000, dur: .04, vol: .2, filter: 'highpass' }, dial: { wave: 'noise', freq: 2400, dur: .02, vol: .18, filter: 'bandpass', q: 6 },
  shot38: [{ wave: 'noise', freq: 1600, to: 300, dur: .18, vol: .5 }, { wave: 'square', freq: 'C3', to: 'C2', dur: .1, vol: .2 }], shotPole: { wave: 'noise', freq: 2600, to: 900, dur: .05, vol: .25 },
  shotRifle: [{ wave: 'noise', freq: 900, to: 120, dur: .5, vol: .55 }, { wave: 'saw', freq: 'G2', to: 'C1', dur: .3, vol: .2 }], shotShotgun: [{ wave: 'noise', freq: 700, to: 90, dur: .38, vol: .6 }, { wave: 'square', freq: 'D2', to: 'A0', dur: .2, vol: .25 }],
  alphorn: [{ wave: 'saw', freq: 'F2', dur: .7, vol: .32, vib: [5, .02], hold: true }, { wave: 'saw', freq: 'C3', dur: .7, vol: .2, vib: [5, .02], hold: true }, { wave: 'noise', freq: 400, to: 120, dur: .5, vol: .25 }],
  shot25: { wave: 'noise', freq: 3000, to: 600, dur: .08, vol: .35 }, lob: [{ wave: 'noise', freq: 500, to: 2000, dur: .25, vol: .3 }, { wave: 'sine', freq: 'C3', to: 'G3', dur: .2, vol: .2 }],
  reload: [{ wave: 'noise', freq: 2400, dur: .03, vol: .2, filter: 'bandpass', q: 8 }, { wave: 'noise', freq: 1800, dur: .04, vol: .22, filter: 'bandpass', q: 8, delay: .25 }], reloaded: { wave: 'noise', freq: 3000, dur: .04, vol: .25, filter: 'bandpass', q: 6 },
  overheat: [{ wave: 'noise', freq: 1500, to: 300, dur: .8, vol: .3 }, { wave: 'saw', freq: 'A2', to: 'D2', dur: .4, vol: .15 }],
  scan: [{ wave: 'sine', freq: 'E6', to: 'E5', dur: .5, vol: .18 }, { wave: 'noise', freq: 400, to: 3000, dur: .6, vol: .12, delay: .05 }],
  crit: [{ wave: 'noise', freq: 5000, to: 1500, dur: .25, vol: .35, filter: 'highpass' }, { wave: 'sine', freq: 'A4', dur: .9, vol: .12, hold: true }, { wave: 'sine', freq: 'C#5', dur: .9, vol: .1, hold: true }, { wave: 'sine', freq: 'E5', dur: .9, vol: .09, hold: true }],
  kill: [{ wave: 'noise', freq: 600, to: 120, dur: .3, vol: .3 }, { wave: 'sine', freq: 'G2', to: 'C1', dur: .3, vol: .2 }], explode: [{ wave: 'noise', freq: 900, to: 60, dur: .6, vol: .6 }, { wave: 'sine', freq: 'C2', to: 'C1', dur: .5, vol: .4 }],
  tink: { wave: 'triangle', freq: 'E6', to: 'B6', dur: .1, vol: .2 }, giggleup: { wave: 'square', freq: 'C5', to: 'C6', dur: .35, vol: .12, arp: [0, 3, 0, 5, 0, 7], step: .04, loop: true },
  throw: { wave: 'noise', freq: 600, to: 1600, dur: .25, vol: .14 }, splat: { wave: 'noise', freq: 1200, to: 200, dur: .2, vol: .28 }, shatter: { wave: 'noise', freq: 4000, to: 1500, dur: .2, vol: .25, filter: 'highpass' },
  step: { wave: 'noise', freq: 1200, dur: .03, vol: .06 }, hockey: { wave: 'noise', freq: 3000, to: 600, dur: .5, vol: .3 }, jump: { wave: 'noise', freq: 400, to: 1200, dur: .3, vol: .2 }, land: { wave: 'noise', freq: 600, to: 120, dur: .25, vol: .35 },
  bell: [{ wave: 'sine', freq: 'C3', dur: 2.4, vol: .3 }, { wave: 'sine', freq: 'D#4', dur: 2, vol: .14 }, { wave: 'sine', freq: 'G#4', dur: 1.6, vol: .1 }, { wave: 'sine', freq: 'C6', dur: .8, vol: .06 }],
  ding: [{ wave: 'sine', freq: 'E6', dur: .9, vol: .2 }, { wave: 'sine', freq: 'B6', dur: .5, vol: .06 }], phone: { wave: 'square', freq: 'A5', dur: .9, vol: .06, arp: [0, 2], step: .03, loop: true },
  door7: [{ wave: 'sine', freq: 'C5', dur: .7, vol: .14 }, { wave: 'sine', freq: 'E5', dur: .7, vol: .11 }, { wave: 'sine', freq: 'G5', dur: .8, vol: .1 }], echo: [{ wave: 'square', freq: 'A4', dur: .25, vol: .14 }, { wave: 'square', freq: 'A5', dur: .25, vol: .12, delay: .25 }, { wave: 'square', freq: 'E5', dur: .5, vol: .1, delay: .5 }, { wave: 'square', freq: 'A5', dur: .5, vol: .05, delay: 1 }],
  flash: [{ wave: 'noise', freq: 6000, dur: .06, vol: .3, filter: 'highpass' }, { wave: 'sine', freq: 'C7', to: 'C6', dur: .4, vol: .08 }], flare: { wave: 'noise', freq: 2500, dur: 1, vol: .14, hold: true }, coins: { wave: 'square', freq: 'E6', dur: .5, vol: .08, arp: [0, 7, 12, 7, 0, 12], step: .05, loop: true },
  charge: [{ wave: 'noise', freq: 200, to: 50, dur: 1.2, vol: .6 }, { wave: 'sine', freq: 'A1', to: 'A0', dur: 1, vol: .4 }], wax: { wave: 'noise', freq: 3500, to: 1500, dur: .6, vol: .2 }, chime: { wave: 'sine', freq: 'E6', dur: .7, vol: .14 },
  steam: { wave: 'noise', freq: 4000, to: 800, dur: .9, vol: .2 }, swish: { wave: 'noise', freq: 800, to: 3000, dur: .3, vol: .16 }, ring: { wave: 'sine', freq: 'G4', to: 'D5', dur: .2, vol: .1 }, card: [{ wave: 'saw', freq: 'A2', dur: .5, vol: .14 }, { wave: 'square', freq: 'A3', dur: .3, vol: .1 }],
  pickup: [{ wave: 'pulse', freq: 'E6', dur: .05, vol: .08 }, { wave: 'pulse', freq: 'A6', dur: .08, vol: .08, delay: .05 }], hurt: [{ wave: 'noise', freq: 700, to: 200, dur: .2, vol: .3 }, { wave: 'square', freq: 'C3', to: 'G2', dur: .15, vol: .12 }],
  freeze: [{ wave: 'noise', freq: 6000, to: 2000, dur: 1.2, vol: .25, filter: 'highpass' }, { wave: 'sine', freq: 'B5', to: 'B6', dur: 1.2, vol: .08 }], thaw: { wave: 'noise', freq: 2000, to: 5000, dur: .5, vol: .2 },
  rumble: { wave: 'noise', freq: 120, dur: 2.5, vol: .5, hold: true }, cable: { wave: 'noise', freq: 300, dur: .5, vol: .16, filter: 'bandpass', q: 8 }, deflect: { wave: 'triangle', freq: 'A6', to: 'E7', dur: .08, vol: .1 }
};
S7.audioInit = game => {
  if (!game.audio) return; for (const k in SFX) game.audio.define(k, SFX[k]);
  const on = (ev, f) => S7.bus.on(ev, f);
  on('shot', d => S7.sfx(S7.WEAPONS[d.weapon].sfx)); on('reload', () => S7.sfx('reload')); on('reloaded', () => S7.sfx('reloaded')); on('dry', () => S7.sfx('dry')); on('overheat', () => S7.sfx('overheat'));
  on('scan', () => S7.sfx('scan')); on('crit', () => S7.sfx('crit')); on('kill', d => { if (!d.crit) S7.sfx('kill'); }); on('explode', () => S7.sfx('explode')); on('tink', () => S7.sfx('tink')); on('giggleup', () => S7.sfx('giggleup'));
  on('throw', () => S7.sfx('throw')); on('splat', () => S7.sfx('splat')); on('shatter', () => S7.sfx('shatter')); on('hockey', () => S7.sfx('hockey')); on('jump', () => S7.sfx('jump')); on('land', () => S7.sfx('land'));
  on('bigBell', () => S7.sfx('bell')); on('ding', () => S7.sfx('ding')); on('phoneRing', () => S7.sfx('phone')); on('room7', () => S7.sfx('door7')); on('pickup', () => S7.sfx('pickup')); on('hurt', () => { S7.sfx('hurt'); S7.game.input.rumble && S7.game.input.rumble(.5, .15); });
  on('freeze', () => S7.sfx('freeze')); on('rescue', () => S7.sfx('thaw')); on('switch', () => S7.sfx('swish')); on('ring', () => S7.sfx('ring')); on('card', () => S7.sfx('card')); on('wax', () => S7.sfx('wax')); on('steam', () => S7.sfx('steam')); on('deflect', () => S7.sfx('deflect'));
  on('edelSlot', () => S7.sfx('chime')); on('codeRight', () => S7.sfx('confirm')); on('codeWrong', () => S7.sfx('dry')); on('lawine', () => S7.sfx('rumble')); on('corniceFall', () => S7.sfx('rumble')); on('powerCut', () => S7.sfx('cable')); on('scope', () => S7.sfx('tick'));
  on('skill', d => S7.sfx({ flare: 'flare', makeitrain: 'coins', echo: 'echo', flash: 'flash', charge: 'charge' }[d.skill] || 'confirm'));
  on('crit', () => { if (CHEATS.slowCrit && S7.game) S7.game.timeScale = .25; if (S7.game && S7.game.freeze) S7.game.freeze(.06); });
  on('laugh', d => laugh(d)); on('bark', d => { AU.bark = { who: d.who, text: d.text, i: 0, t: 0 }; });
  on('bandKill', d => { const a = A_(); if (a && a.layer) { a.layer(d.name, 0, .3); a.tempo && a.tempo(d.bpm); } });
  on('area', d => { const A = S7.AREAS[d.to]; if (A && !G.boss && !G.attract) S7.music(A.music); });
  on('boss', d => { if (d.id === 'band' && d.phase === 1) S7.music('band', { restart: true }); if (d.id === 'grau' && d.phase === 1) S7.music('shaft', { restart: true }); if (d.id === 'grau' && d.phase > 1) { const a = A_(); a && a.tempo && a.tempo(128 + d.phase * 12); } if (d.id === 'hansi') S7.music(d.phase === 3 ? 'interview' : 'powderking', { restart: d.phase === 1 }); });
  on('bossDead', d => { S7.music('stage', { restart: true }); });
};
/** each frame (the presenter calls it): the danger layer, the voices typing, the laughs' gains */
S7.audioFrame = dt => {
  const a = A_(); if (!a || !a.ctx || S7.game.headless || !G) return;
  const danger = S7.nearEnemies && S7.nearEnemies(40).length > 0 && G.area !== 'room7';
  if (danger !== AU.layerOn) { AU.layerOn = danger; if (a.layer) try { a.layer('danger', danger ? 1 : 0, danger ? .5 : 1.5); } catch (e) { /* the song has no danger layer */ } }
  // the typed letters speak
  if (TALK.open) {
    const L = TALK.q[TALK.i];
    if (L) { if (AU.lastLine !== TALK.i || AU.lastQ !== TALK.q) { AU.lastLine = TALK.i; AU.lastQ = TALK.q; AU.lastShown = 0; } const n = Math.floor(TALK.shown); for (let k = AU.lastShown; k < n; k++) speakLetter(L.who, L.text, k); AU.lastShown = n; }
  }
  if (AU.bark) { const b = AU.bark; b.t += dt; const n = Math.min(b.text.length, Math.floor(b.t * 38)); for (let k = b.i; k < n; k++) speakLetter(b.who, b.text, k, .7); b.i = n; if (n >= b.text.length) AU.bark = null; }
};

/* ---- the voices: one syllable for every second letter, formants from the vowels ---- */
const VOICES = {
  holle: [420, 5, 1.25, 'triangle', { vib: 6, quiet: .7 }], rosalind: [260, 2, .9, 'pulse', {}], concierge: [120, 1, 1.2, 'sawtooth', { phone: true }], fohn: [160, 4, 1.1, 'sine', { breath: true, glide: true }],
  pim: [520, 3, .8, 'triangle', { echo: true }], murmel: [200, 2, 1.3, 'sawtooth', { muffle: true }], ansel: [110, 1, 1.15, 'sawtooth', {}], dagny: [330, 3, .75, 'pulse', {}], ignaz: [140, 2, 1.2, 'sawtooth', { trem: true }],
  rurik: [95, 2, 1, 'sawtooth', { gravel: true }], kasimir: [180, 7, .9, 'pulse', { yodel: true }], mireille: [300, 4, 1, 'triangle', { breath: true }], brigid: [240, 2, 1, 'pulse', {}], grau: [150, 1, 1, 'square', { ding: true }],
  hansi: [210, 5, .95, 'pulse', {}], tuba: [90, 3, 1, 'sawtooth', {}], villager: [250, 3, 1, 'triangle', {}], exposure: null
};
S7.VOICES = VOICES;
const VOWEL = { a: [800, 1200], e: [400, 2300], i: [300, 2700], o: [450, 800], u: [325, 700], y: [300, 2500] };
/** the syllable schedule for a text (deterministic): [{ i, vowel, cons, pause, up }] (the voice test reads it) */
S7.syllables = text => {
  const out = [], t = text.toLowerCase(); let n = 0;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === ',' || ch === ';') { out.push({ i, pause: .12 }); continue; }
    if (ch === '.' || ch === '!' || ch === '?') { out.push({ i, pause: .25, q: ch === '?', bang: ch === '!' }); continue; }
    if (!/[a-zäöüß]/.test(ch)) continue;
    if (n++ % 2) continue;
    let v = null; for (let k = i; k < Math.min(t.length, i + 3); k++) if (VOWEL[t[k]]) { v = t[k]; break; }
    out.push({ i, vowel: v || 'a', cons: VOWEL[ch] ? null : ch });
  }
  return out;
};
function speakLetter(who, text, k, vol = 1) {
  const V0 = VOICES[who]; if (!V0) return;
  const a = A_(), c = a && a.ctx; if (!c || c.state !== 'running' || a.muted) return;
  const ch = text[k] || '', lc = ch.toLowerCase();
  if (!/[a-zäöüß]/i.test(ch)) return;
  let idx = 0; for (let i = 0; i <= k; i++) if (/[a-zäöüß]/i.test(text[i])) idx++;
  if (idx % 2 === 0) return;
  const set = S7.game.settings, gainK = (set.voices ?? .8) * (a.sfxVolume ?? 1) * vol * (V0[4].quiet || 1);
  if (gainK <= 0) return;
  const [base, range, rate, wave, ex] = V0, t0 = c.currentTime + .005, dur = (.055 + ((idx * 7) % 5) * .006) * rate;
  let v = 'a'; for (let i = k; i < Math.min(text.length, k + 3); i++) if (VOWEL[text[i].toLowerCase()]) { v = text[i].toLowerCase(); break; }
  const drift = 1 - Math.min(.12, idx * .004), q = /\?/.test(text.slice(k, k + 12)) && text.length - k < 12 ? 1.19 : 1;
  let semi = ((idx * 37 + text.length) % (range * 2 + 1)) - range; if (ex.yodel && idx % 4 === 1) semi += 12;
  const f0 = base * Math.pow(2, semi / 12) * drift * q;
  const osc = c.createOscillator(); osc.type = wave === 'pulse' ? 'square' : wave; osc.frequency.setValueAtTime(f0, t0); if (ex.glide) osc.frequency.linearRampToValueAtTime(f0 * 1.06, t0 + dur);
  if (ex.vib || ex.trem) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = ex.vib || 9; lg.gain.value = f0 * .03; l.connect(lg); lg.connect(osc.frequency); l.start(t0); l.stop(t0 + dur + .05); }
  const F = VOWEL[v], f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(), g = c.createGain(), out = c.createGain();
  f1.type = f2.type = 'bandpass'; f1.frequency.value = F[0]; f2.frequency.value = F[1]; f1.Q.value = 5; f2.Q.value = 7;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.32 * gainK, t0 + .01); g.gain.exponentialRampToValueAtTime(.001, t0 + dur);
  osc.connect(f1); osc.connect(f2); f1.connect(g); f2.connect(g);
  let tail = g;
  if (ex.phone) { const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = .7; tail.connect(bp); tail = bp; }
  if (ex.muffle) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; tail.connect(lp); tail = lp; }
  tail.connect(out); out.connect(a._sfxBus || c.destination);
  if (ex.echo) { const d = c.createDelay(.5), fb = c.createGain(); d.delayTime.value = .18; fb.gain.value = .35; tail.connect(d); d.connect(fb); fb.connect(d); d.connect(out); }
  if (!VOWEL[lc] && a._noise) { const n = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain(); n.buffer = a._noise; nf.type = 'highpass'; nf.frequency.value = 's z f'.includes(lc) ? 4000 : 1800; ng.gain.setValueAtTime(.12 * gainK, t0); ng.gain.exponentialRampToValueAtTime(.001, t0 + .012); n.connect(nf); nf.connect(ng); ng.connect(out); n.start(t0); n.stop(t0 + .02); }
  if (ex.ding && idx % 10 === 5) S7.sfx('ding', { vol: .3 });
  osc.start(t0); osc.stop(t0 + dur + .02);
}

/* ---- laughter (§10.3): one voice a laugh, formant filters for "ha", breath before each syllable; positional ---- */
const LAUGH = { giggle: [7, .09, 1.6, 'square', 1.04], cackle: [5, .12, 1.1, 'sawtooth', .96], chuckle: [3, .14, .7, 'triangle', .99], wheeze: [5, .11, 1.2, 'noise', 1] };
function laugh(d) {
  const a = A_(), c = a && a.ctx; if (!c || c.state !== 'running' || a.muted || AU.laughs >= 8) return;
  const pose = S7.director.pose, dist = d.d / M; if (dist > 60) return;
  const set = S7.game.settings, gk = (1 - dist / 60) * (a.sfxVolume ?? 1) * (set.voices ?? .8) * .5; if (gk <= .01) return;
  const [n0, syl, pk, wave, slope] = LAUGH[d.style] || LAUGH.giggle, e = d.enemy, n = n0 + (e ? (e.id % 3) : 0), base = 300 * pk * Math.pow(2, ((e && e.pitch) || 0) / 12);
  const pan = c.createStereoPanner ? c.createStereoPanner() : null, out = c.createGain(), lp = c.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = W.grid && !W.grid.los([pose.x, pose.y, pose.z], d.at) ? 900 : 9000;
  out.gain.value = gk; if (pan) pan.pan.value = clamp(Math.sin(angDiff(pose.yaw, Math.atan2(d.at[1] - pose.y, d.at[0] - pose.x))), -1, 1);
  lp.connect(out); if (pan) { out.connect(pan); pan.connect(a._sfxBus || c.destination); } else out.connect(a._sfxBus || c.destination);
  AU.laughs++; const t0 = c.currentTime + .01;
  for (let i = 0; i < n; i++) {
    const t = t0 + i * syl * 1.15, f = base * Math.pow(slope, i), g = c.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.5, t + .012); g.gain.exponentialRampToValueAtTime(.001, t + syl);
    if (wave === 'noise' || i % 2 === 0) { const nb = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain(); nb.buffer = a._noise; nf.type = 'bandpass'; nf.frequency.value = 1500; ng.gain.setValueAtTime(wave === 'noise' ? .4 : .12, t); ng.gain.exponentialRampToValueAtTime(.001, t + (wave === 'noise' ? syl : .03)); nb.connect(nf); nf.connect(ng); ng.connect(lp); nb.start(t); nb.stop(t + syl + .02); }
    if (wave !== 'noise') { const o = c.createOscillator(), f1 = c.createBiquadFilter(), f2 = c.createBiquadFilter(); o.type = wave; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * .92, t + syl); f1.type = f2.type = 'bandpass'; f1.frequency.value = 750; f2.frequency.value = 1200; f1.Q.value = 4; f2.Q.value = 5; o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(lp); o.start(t); o.stop(t + syl + .02); }
  }
  setTimeout(() => { AU.laughs = Math.max(0, AU.laughs - 1); }, (n * syl * 1.15 + .2) * 1000);
}
