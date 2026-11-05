/* ---- AUDIO: every note, thud and voice written in code (the engine's chip synth). Songs with named layers, sound
 * effects, Animalese-style babble for every speaker, a crowd that follows the excitement, and the commentators ---- */
TT.audio = {};
const SONGS = TT.SONGS = {
  title: { bpm: 152, steps: 2, tracks: [
    { name: 'base', wave: 'square', vol: .08, notes: 'E4 . E4 G4 A4 . G4 E4 | D4 . D4 E4 G4 - - . | E4 . E4 G4 A4 . B4 A4 | G4 - E4 - D4 - - . | E4 . E4 G4 A4 . G4 E4 | D4 . D4 E4 G4 - A4 . | B4 - A4 - G4 - E4 - | E4 - - - . . . .' },
    { wave: 'saw', vol: .1, notes: 'E2 E2 . E2 E2 . E2 . | D2 D2 . D2 D2 . D2 . | C2 C2 . C2 C2 . C2 . | D2 D2 . D2 B1 . B1 .' },
    { wave: 'drums', vol: .14, notes: 'k . s . k k s . | k . s . k k s c' },
    { name: 'chant', wave: 'pulse', vol: .07, notes: '. . A3 . . . A3 C4 | . . A3 . . . A3 C4' }] },
  mud: { bpm: 126, steps: 2, tracks: [
    { name: 'base', wave: 'pulse', vol: .08, notes: 'C4 . E4 G4 C5 - G4 . | A4 . F4 A4 C5 - A4 . | G4 . E4 G4 B4 - G4 . | C5 - B4 - C5 - - .' },
    { wave: 'triangle', vol: .28, notes: 'C3 . G2 . C3 . G2 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . D3 . | C3 . G2 . C3 . . .' },
    { name: 'drums', on: false, wave: 'drums', vol: .12, notes: 'k . s . k . s s | k . s . k k s .' },
    { name: 'hype', on: false, wave: 'square', vol: .05, notes: 'C5 E5 G5 E5 C5 E5 G5 E5 | F5 A5 C6 A5 F5 A5 C6 A5' }] },
  shanty: { bpm: 112, steps: 3, tracks: [
    { name: 'base', wave: 'pulse12', vol: .09, notes: 'D4 - D4 F4 - A4 | G4 - F4 E4 - D4 | C4 - E4 G4 - C5 | A4 - - . . . | D4 - D4 F4 - A4 | G4 - F4 E4 - C4 | D4 - F4 E4 - C4 | D4 - - . . .' },
    { wave: 'triangle', vol: .28, notes: 'D2 . A2 D3 . A2 | C2 . G2 C3 . G2 | F2 . C3 F3 . C3 | A2 . E3 A2 . . ' },
    { name: 'drums', on: false, wave: 'drums', vol: .12, notes: 'k . h s . h | k . k s . h' },
    { name: 'hype', on: false, wave: 'square', vol: .05, notes: 'A5 . F5 D5 . F5 | G5 . E5 C5 . E5' }] },
  forge: { bpm: 132, steps: 2, tracks: [
    { name: 'base', wave: 'saw', vol: .09, notes: 'A2 A2 . A2 C3 . A2 . | A2 A2 . G2 F2 . E2 . | A2 A2 . A2 C3 . D3 . | E3 - D3 - C3 - B2 .' },
    { wave: 'square', vol: .05, notes: 'A4 . . . . . E5 . | . . . . F5 - E5 . | A4 . . . . . G5 . | . . E5 - . . . .' },
    { name: 'drums', on: false, wave: 'drums', vol: .14, notes: 'k . t . s . t k | k k t . s . t t' },
    { name: 'hype', on: false, wave: 'pulse', vol: .05, notes: 'A5 C6 E6 C6 A5 C6 E6 C6' }] },
  mayhem: { bpm: 160, steps: 2, tracks: [
    { name: 'base', wave: 'square', vol: .08, notes: 'E4 G4 B4 E5 D5 B4 G4 B4 | C4 E4 G4 C5 B4 G4 E4 G4 | D4 F#4 A4 D5 C5 A4 F#4 A4 | B3 D#4 F#4 B4 A4 F#4 D#4 F#4' },
    { wave: 'saw', vol: .1, notes: 'E2 . E2 . E2 . E2 . | C2 . C2 . C2 . C2 . | D2 . D2 . D2 . D2 . | B1 . B1 . B1 . B1 .' },
    { name: 'drums', on: false, wave: 'drums', vol: .14, notes: 'k h s h k k s h | k h s h k s s s' },
    { name: 'hype', on: false, wave: 'pulse12', vol: .05, notes: 'E6 - B5 - G5 - B5 - | C6 - G5 - E5 - G5 -' }] },
  pub: { bpm: 118, steps: 2, tracks: [
    { wave: 'triangle', vol: .12, notes: 'C4 E4 G4 E4 F4 A4 C5 A4 | G4 B4 D5 B4 C5 - G4 . | A4 C5 E5 C5 F4 A4 C5 A4 | G4 . E4 . C4 - - .' },
    { wave: 'pulse', vol: .06, notes: 'C3 . G3 . F2 . C3 . | G2 . D3 . C3 . G2 . | A2 . E3 . F2 . C3 . | G2 . G2 . C3 . . .' }] },
  third: { bpm: 100, steps: 2, tracks: [
    { wave: 'square', vol: .08, notes: 'G4 - G4 A4 B4 - G4 - | C5 - B4 A4 G4 - - . | E4 - E4 F#4 G4 - E4 - | D4 - - - . . . . | G4 - G4 A4 B4 - G4 - | C5 - D5 C5 B4 - A4 - | G4 - B4 A4 G4 - F#4 - | G4 - - - . . . .' },
    { wave: 'triangle', vol: .26, notes: 'G2 . D3 . C3 . G2 . | E2 . B2 . D2 . A2 .' },
    { wave: 'drums', vol: .08, notes: 'k . h . s . h .' }] }
};
const STINGS = {
  try: { bpm: 180, steps: 2, tracks: [{ wave: 'square', vol: .12, notes: 'C5 E5 G5 C6 - G5 C6 - - -' }, { wave: 'saw', vol: .08, notes: 'C3 - - G2 - - C3 - - -' }] },
  monster: { bpm: 200, steps: 2, tracks: [{ wave: 'saw', vol: .14, notes: 'C3 C3 . F#3 - - - -' }] },
  fire: { bpm: 220, steps: 2, tracks: [{ wave: 'square', vol: .1, notes: 'E5 G5 A5 B5 D6 E6 - -' }] },
  yellow: { bpm: 90, steps: 2, tracks: [{ wave: 'saw', vol: .11, notes: 'G3 - F#3 - F3 - E3 - - -' }] },
  drop: { bpm: 140, steps: 2, tracks: [{ wave: 'triangle', vol: .16, notes: 'E5 - C5 - - -' }] },
  win: { bpm: 160, steps: 2, tracks: [{ wave: 'square', vol: .12, notes: 'C5 . C5 . C5 G4 A4 B4 C5 - E5 - G5 - - -' }, { wave: 'triangle', vol: .2, notes: 'C3 . C3 . C3 . G2 . C3 - - - - - - -' }] },
  lose: { bpm: 100, steps: 2, tracks: [{ wave: 'triangle', vol: .14, notes: 'E4 - D#4 - D4 - C#4 - - - -' }] },
  roll: { bpm: 240, steps: 2, tracks: [{ wave: 'drums', vol: .16, notes: 's s s s s s s s s s s s k - -' }] }
};
TT.STINGS = STINGS;
const SFX = {
  whistle: { wave: 'square', freq: 2400, vib: [32, .06], dur: .28, vol: .12 },
  whistleLong: { wave: 'square', freq: 2400, vib: [30, .05], dur: .7, vol: .12 },
  hooter: { wave: 'saw', freq: 196, to: 190, dur: 1.2, vol: .2, vib: [6, .01] },
  thud: { wave: 'sine', freq: 110, to: 50, dur: .14, vol: .35 },
  crunch: { wave: 'noise', freq: 1400, to: 120, dur: .22, vol: .32, filter: 'lowpass' },
  boom: { wave: 'sine', freq: 80, to: 30, dur: .4, vol: .45 },
  pass: { wave: 'noise', freq: 2400, to: 900, dur: .1, vol: .1, filter: 'bandpass' },
  catch: { wave: 'noise', freq: 1600, to: 600, dur: .05, vol: .18 },
  punt: { wave: 'sine', freq: 160, to: 60, dur: .1, vol: .38 },
  tap: { wave: 'triangle', freq: 300, to: 160, dur: .06, vol: .2 },
  bok: { wave: 'triangle', freq: 300, to: 180, dur: .07, vol: .22 },
  doink: { wave: 'triangle', freq: 1200, to: 1180, dur: .7, vol: .22, vib: [12, .01] },
  engage: { wave: 'noise', freq: 600, to: 120, dur: .3, vol: .32 },
  horn: { wave: 'square', freq: 466, dur: .6, vol: .14, arp: [0, 4, 7], step: .04 },
  munch: { wave: 'noise', freq: 900, to: 400, dur: .12, vol: .16 },
  turbo: { wave: 'noise', freq: 600, to: 2000, dur: .18, vol: .08 },
  sputter: { wave: 'noise', freq: 300, to: 200, dur: .2, vol: .1 },
  super: { wave: 'square', freq: 'C4', dur: .5, vol: .12, arp: [0, 4, 7, 12, 16, 19, 24], step: .05 },
  flame: { wave: 'noise', freq: 400, to: 1200, dur: .9, vol: .2, filter: 'bandpass' },
  crack: { wave: 'noise', freq: 4000, to: 200, dur: .3, vol: .3 },
  thunder: { wave: 'noise', freq: 200, to: 40, dur: 1.6, vol: .35, filter: 'lowpass' },
  squawk: { wave: 'square', freq: 900, to: 1400, dur: .25, vol: .14, vib: [18, .2] },
  squelch: { wave: 'noise', freq: 300, to: 120, dur: .16, vol: .18, filter: 'lowpass' },
  ding: { wave: 'triangle', freq: 1760, dur: .4, vol: .2 },
  boo: { wave: 'saw', freq: 140, to: 110, dur: 1, vol: .1, vib: [5, .04] },
  clap: { wave: 'noise', freq: 2000, to: 1500, dur: .04, vol: .12 },
  roar: { wave: 'noise', freq: 500, to: 900, dur: 1.4, vol: .22, filter: 'lowpass' },
  groan: { wave: 'noise', freq: 600, to: 300, dur: .9, vol: .14, filter: 'lowpass' },
  oooh: { wave: 'triangle', freq: 260, to: 180, dur: .9, vol: .12, vib: [5, .03] }
};
TT.audio.init = game => {
  for (const k in SFX) game.audio.define(k, SFX[k]);
};
TT.audio.sfx = (name, o) => { if (TT.cfg.muted) return; try { TT.game.audio.sfx(name, o); } catch (e) { /* audio blocked */ } };
TT.audio.music = (id, o) => { if (TT.cfg.muted) return; const a = TT.game.audio; if (TT.audio.cur === id && a.pos && a.pos.playing) return; TT.audio.cur = id; a.music(id ? SONGS[id] : null, o || { fade: .6 }); };
TT.audio.sting = id => { if (TT.cfg.muted) return; try { TT.game.audio.sting(STINGS[id]); } catch (e) { /* none */ } };
TT.audio.layer = (name, v) => { try { TT.game.audio.layer(name, v, .6); } catch (e) { /* the song has no such layer */ } };

/* ---- babble: one syllable per letter, the speaker's own voice (wave, pitch, pace) ---- */
const VOWELS = 'aeiouyAEIOUY';
TT.babble = {
  last: 0,
  letter(ch, voice, i) {
    if (!ch || !/[a-zA-Z0-9]/.test(ch) || !voice) return;
    if (i % 2 && voice.rate < 1.1) return;   // (slower voices: every other letter)
    const code = ch.toLowerCase().charCodeAt(0), semi = ((code * 7) % 12) - 4 + (VOWELS.includes(ch) ? -2 : 0) + (ch === ch.toUpperCase() && /[A-Z]/.test(ch) ? 3 : 0);
    const f = voice.base * Math.pow(2, semi / 12), dur = (VOWELS.includes(ch) ? .07 : .05) / (voice.rate || 1);
    TT.audio.sfx({ wave: voice.wave, freq: f, to: f * .93, dur, vol: .09, vib: voice.vib });
    if (voice.gravel) TT.audio.sfx({ wave: voice.wave, freq: f / 2, to: f / 2 * .93, dur, vol: .05 });
    if (voice.echo) TT.game.after(.18, () => TT.audio.sfx({ wave: voice.wave, freq: f, to: f * .93, dur, vol: .04 }));
  },
  /** a short grunt burst for a player (tackles, rucks, scrums) */
  grunt(p) {
    const v = TT.playerVoice(p); for (let k = 0; k < 3; k++) TT.game.after(k * .06, () => TT.audio.sfx({ wave: v.wave, freq: v.base * (1 - k * .08), to: v.base * .8, dur: .06, vol: .08 }));
  }
};
TT.playerVoice = p => { const d = p.data || p; const base = clamp(320 - (d.size - 1) * 300 - (d.build === 'bulky' ? 50 : 0), 70, 320); return { wave: ['triangle', 'square', 'pulse', 'saw', 'pulse12'][(p.team * 2 + (p.idx || 0)) % 5], base: d.boss ? 70 : base, rate: d.build === 'bulky' ? .9 : 1.15, vib: d.hunch ? [8, .05] : undefined }; };

/* ---- the crowd bed: filtered noise that swells with the excitement ---- */
TT.crowd = {
  level: .3, t: 0,
  step(dt, m) {
    if (!m || TT.cfg.session && false) return;
    let want = .25;
    if (m.phase === 'play') { const b = m.ball, att = m.possession, toLine = Math.abs(tryLineOf(att) - b.x); want = toLine < 200 ? .6 : .35; const h = holder(); if (h && h.lineBroken) want = .8; }
    if (m.phase === 'setkick' && (m.sub === 'aim' || m.sub === 'place')) want = .15;
    this.level = lerp(this.level, want, dt * 1.5);
    this.t -= dt;
    const vol = (TT.settings.crowd == null ? .8 : TT.settings.crowd);
    if (this.t <= 0 && vol > 0) {
      this.t = .9;
      TT.audio.sfx({ wave: 'noise', freq: 380 + this.level * 500, to: 420 + this.level * 520, dur: 1.2, vol: .05 + this.level * .09 * vol, filter: 'lowpass' });
      if (m.phase === 'setkick' && (m.sub === 'aim') && !m.ph.human) TT.audio.sfx('clap');
    }
    if (m.phase === 'setkick' && m.sub === 'aim') { this.clapT = (this.clapT || 0) - dt; if (this.clapT <= 0) { this.clapT = Math.max(.25, .9 - (20 - m.ph.clock) * .04); TT.audio.sfx('clap', { vol: vol }); } }
  }
};

/* ---- commentary: the director picks a line by category, priority and cooldown, and puts it on the radio ---- */
TT.comm = {
  talk: null, last: {}, bags: {}, queue: [], busy: 0, used: new Set(), nextRos: false,
  init(game) {
    this.talk = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#e8c040', voice: null, speed: 46 });
    this.talk.onLetter = (ch, i) => { if (TT.settings.commentary === 'On' && this.voice) TT.babble.letter(ch, this.voice, i); };
  },
  reset() { this.last = {}; this.bags = {}; this.queue = []; this.busy = 0; this.used = new Set(); if (this.talk) this.talk.close && (this.talk.open = false); },
  /** say a line of a category ({$player}, {$team}, {$score}, {$venue} filled in) */
  say(cat, vars = {}, prio = 1) {
    if (!this.talk || TT.settings.commentary === 'Off' || TT.cfg.quietComm) return;
    if (this.last[cat] && M && M.t - this.last[cat] < 6 && prio < 3) return;
    if (this.busy > 0 && prio < 2) return;
    const lines = TT.LINES[cat]; if (!lines) return;
    const rng = TT.fxRng;
    const bag = this.bags[cat] || (this.bags[cat] = TT.bag(lines, rng));
    let line = bag(); let tries = 0; while (this.used.has(line[1]) && tries++ < lines.length) line = bag();
    this.used.add(line[1]);
    this.last[cat] = M ? M.t : 0;
    const who = line[0] === 'r' ? 'ros' : 'barry';
    let text = line[1];
    const V = Object.assign({ venue: M ? M.venue.name : '', score: M ? M.teams[0].short + ' ' + M.score[0] + ', ' + M.teams[1].short + ' ' + M.score[1] : '' }, vars);
    text = text.replace(/\{\$(\w+)\}/g, (_, k) => TT.ascii(V[k] == null ? '' : V[k]));
    this.show(who, text);
    // Ros chips in a beat later, now and then
    if (who === 'barry' && TT.fxRng() < .35 && lines.some(l => l[0] === 'r')) {
      const ros = lines.filter(l => l[0] === 'r' && !this.used.has(l[1]));
      if (ros.length) { const l = ros[Math.floor(TT.fxRng() * ros.length)]; this.used.add(l[1]); TT.game.after(2.4, () => this.show('ros', l[1].replace(/\{\$(\w+)\}/g, (_, k) => TT.ascii(V[k] || '')))); }
    }
  },
  show(who, text) {
    const c = TT.CAST[who];
    this.voice = c.voice; this.busy = 2.2;
    this.talk.say(text, { name: c.name, portrait: TT.castRig(who), portraitOpts: { zoom: 2.6, turn: .4 }, auto: 2.2, modal: false, alpha: .85 });
  },
  step(dt) { this.busy = Math.max(0, this.busy - dt); if (this.talk) this.talk.update(dt); },
  draw(r) { if (this.talk && this.talk.open) this.talk.draw(r); }
};
/* the cast's rigs (portraits), made once */
const CAST_RIGS = {};
TT.castRig = id => {
  if (CAST_RIGS[id]) return CAST_RIGS[id];
  if (id.includes(':')) { const [tid, k] = id.split(':'), t = TT.teamById(tid), d = t.players[+k]; return CAST_RIGS[id] = rigFor({ data: d }, t.home); }
  const c = TT.CAST[id]; return CAST_RIGS[id] = new E.Humanoid(Object.assign({ weapon: null }, (c && c.o) || {}));
};
TT.castVoice = id => {
  if (id.includes(':')) { const [tid, k] = id.split(':'), t = TT.teamById(tid), d = t.players[+k]; return TT.playerVoice({ data: d, team: TT.TEAMS.indexOf(t), idx: +k }); }
  return (TT.CAST[id] || TT.CAST.barry).voice;
};
TT.castName = id => {
  if (id.includes(':')) { const [tid, k] = id.split(':'), d = TT.teamById(tid).players[+k]; return d.nick; }
  return (TT.CAST[id] || {}).name || id.toUpperCase();
};
