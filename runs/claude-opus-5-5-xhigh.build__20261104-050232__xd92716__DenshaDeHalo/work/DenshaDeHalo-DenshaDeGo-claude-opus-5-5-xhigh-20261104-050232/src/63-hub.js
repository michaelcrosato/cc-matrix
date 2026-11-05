/* 63-hub: AI Hub sessions (Session Protocol 1, ghost mode, 2-4 players). In a session the game opens straight into the
 * round: connect (no key press), build the Parallel Run, ready() at once, our own card (the four trains at Shotengai,
 * the players in their seat colours with ready ticks, the goal, this player's controls, the time left; READY with Enter,
 * ✕ or a click, MORE TIME with △, T or a click), the start on the hub's clock, then the race: each copy drives its own
 * track and sends where it is 10 times a second; the others are ghost trains on their tracks (no blocks, no signals),
 * a standings panel, progress every second, one result at the end (or at time-up), and silence at the end. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, game = DH.game, px = E.px, F = E.font, T = DH.T, SND = () => DH.Sound;
const TRACKS = ['A', 'C', 'D', 'B'];
const H = DH.Hub = { info: null, ghosts: new Map(), card: null, started: false, startIn: null, result: false, ended: false, standings: null, phase: 'connect', answered: { ready: false, more: false }, sentT: 0, progT: 0, toasts: [], stats: { sent: 0 } };
/** connect: returns true if a session is on (the round runs), false to play on our own */
DH.hubConnect = async () => {
  if (!DH.hub) return false;
  let info = null;
  try { info = await AIHub.connect({ mode: 'ghost', seats: [2, 4], card: true }); } catch (e) { info = null; }
  if (!info) { DH.hub = null; return false; }
  H.info = DH.hubInfo = info; game.o.menu.quit = false;
  if (game.headless === false && !game.screen.canvas) { AIHub.fail('The canvas could not be created'); return true; }
  DH.seed = Math.floor(AIHub.rng('route')() * 1e9);   // (the Parallel Run is the same on every copy anyway)
  for (const p of info.players) if (p.id !== info.me) H.ghosts.set(p.id, { id: p.id, name: p.name, color: p.color, s: 0, ts: 0, v: 0, n: 'N', track: TRACKS[info.players.indexOf(p) % 4], st: 'card', score: 0, done: false, judg: null, seen: false });
  AIHub.on('card', c => { H.card = c; });
  AIHub.on('start', d => { H.started = true; H.startIn = d && d.in; H.phase = 'countdown'; });
  AIHub.on('message', (data, from) => {
    const gh = H.ghosts.get(from); if (!gh || !data) return;
    if (data.t === 'g') { gh.ts = data.s; gh.v = data.v; gh.n = data.n; gh.st = data.st; gh.area = data.area; if (!gh.seen) { gh.s = data.s; gh.seen = true; } }
    if (data.t === 'j') { gh.judg = data.j; H.toasts.push({ text: (gh.name || 'P' + (from + 1)).toUpperCase().slice(0, 12) + ': ' + data.j + ' STOP', col: gh.color, t: 0 }); }
    if (data.t === 'p') gh.score = data.score;
    if (data.t === 'done') { gh.done = true; gh.score = data.score; }
  });
  AIHub.on('leave', ({ id }) => { const gh = H.ghosts.get(id); if (gh) H.toasts.push({ text: (gh.name || 'A player').toUpperCase().slice(0, 12) + ' LEFT', col: '#c8d0e8', t: 0 }); H.ghosts.delete(id); });
  AIHub.on('time-up', () => { if (!H.result) H.finish(true); });
  AIHub.on('end', ({ reason, standings }) => { H.ended = true; H.standings = standings || []; H.endReason = reason; H.phase = 'end'; SND().music(null); SND().stop(); DH.Babble.stop(); game.audio.mute(true); game.input.clear(); if (game.sceneName !== 'hubEnd') game.go('hubEnd', null, { fade: 0 }); });
  AIHub.ready();
  return true;
};
H.me = () => H.info.players.find(p => p.id === H.info.me) || { id: H.info.me, name: 'YOU', color: '#e8443a' };
H.myTrack = () => TRACKS[Math.max(0, H.info.players.findIndex(p => p.id === H.info.me)) % 4];
H.answer = a => { if (!DH.hub || H.started) return; if (a === 'more') H.answered.more = !H.answered.more; else H.answered.ready = true; AIHub.answer(a); game.audio.sfx(a === 'more' ? 'move' : 'ok'); };
H.finish = (timeUp) => {
  if (H.result || !DH.hub) return; H.result = true; const run = H.drive && H.drive.run, score = run ? Math.max(0, run.finalScore()) : 0, s = run ? DH.summarize(run) : null;
  const awards = []; if (s && s.perfect) awards.push({ title: 'Perfect Halo', detail: s.perfect + ' perfect stop' + (s.perfect > 1 ? 's' : '') }); if (s && s.onTime === s.judgments.length && s.judgments.length) awards.push({ title: 'Not one second', detail: 'Every arrival on time' });
  if (timeUp) AIHub.result({ score }); else AIHub.result({ score, stats: s ? { 'Perfect stops': s.perfect, 'On time': s.onTime, 'Great calls': s.calls.great } : {}, awards });
  AIHub.send({ t: 'done', score }); H.phase = 'wait';
};
/* ---- the card: our own ---- */
DH.scenes.hubCard = {
  input: DH.KEYS, camera: { zoom: false },
  enter() { SND().music('parallel'); },
  update(dt) {
    const I = game.input, ck = I.clicked();
    if (I.pressed('confirm') || I.pressed('start') || (ck && inB(ck, H._readyB))) H.answer('ready');
    if (I.pressed('ats') || (I.held && I.held.has('KeyT') && !H._tHeld) || (ck && inB(ck, H._moreB))) H.answer('more');
    H._tHeld = I.held && I.held.has('KeyT');
    if (H.phase === 'countdown') game.go('hubRun', null, { fade: 0 });
  },
  draw(r) {
    const R = DH.route('halo'), rail = DH.railFor(R), G = DH.grade(12), s0 = R.stations.find(q => q.id === 'shotengai').stop[6];
    for (const g of R.signals.A || []) g.aspect = g.kind === 'start' ? 'R' : 'G';
    const trains = H.info.players.map((p, i) => ({ s: s0, track: TRACKS[i % 4], dir: 1, cars: 6, livery: 'h8000', lights: true, colour: p.color, tag: (p.name || 'P' + (i + 1)).toUpperCase().slice(0, 10) }));
    const cam = { s: s0 - 170 + Math.sin(game.real * .2) * 10, x: 3.5, h: 22, dir: 1, horizon: .5, fov: 70 };
    rail.draw(r, cam, { grade: DH.railGrade(G), sky: DH.skyFor(G, 'city', rail.headingAt(s0), 1.5, 70), t: game.time, actors: trains.map(tr => ({ items: DH.trainItems(tr, R) })) });
    r.overlay(g => {
      const W = r.W, Hh = r.H, c = H.card || {}; px.blend(g, .45, 'normal', () => px.rect(g, 0, 0, W, Hh, '#05060c'));
      F.title(g, 'DENSHA DE HALO!', Math.round(W / 2), 8, { scale: 2, align: 'center', colors: ['#fffbe0', '#ffe070', '#c88a20'], depth: 2 });
      T(g, 'PARALLEL RUN: four drivers, four tracks, one timetable', W / 2, 30, '#c8d0e8', { align: 'center', shadow: '#000' });
      T(g, 'Best driving score: stop on the mark, on time', W / 2, 42, '#ffe9a0', { align: 'center', shadow: '#000' });
      // the players, in their seat colours, with ready ticks
      H.info.players.forEach((p, i) => { const y = 58 + i * 16, rd = (c.ready || []).includes(p.id), me = p.id === H.info.me; E.ui.box(g, Math.round(W / 2 - 110), y, 220, 14, { alpha: .8, bg: '#0a0c18', border: p.color }); px.rect(g, Math.round(W / 2 - 106), y + 3, 8, 8, p.color); T(g, (p.name || 'Player ' + (i + 1)).slice(0, 18) + (me ? '  (YOU)' : ''), W / 2 - 94, y + 3, '#ffffff'); T(g, 'TRACK ' + TRACKS[i % 4], W / 2 + 60, y + 3, '#8a90b0', { align: 'right', font: 'tiny' }); T(g, rd ? 'READY ✓' : '…', W / 2 + 104, y + 3, rd ? '#6aff8a' : '#8a90b0', { align: 'right' }); });
      const y2 = 60 + H.info.players.length * 16 + 4;
      DH.Glyph.row(g, [['lever', 'LEVER'], ['call', 'CALL'], ['horn', 'HORN'], ['ats', 'ATS']], W / 2, y2, { align: 'center' });
      const left = c.left === null || c.left === undefined ? (c.paused ? 'PAUSED: MORE TIME ASKED' : c.starting ? 'STARTING…' : '') : Math.ceil(c.left / 1000) + ' s';
      T(g, left, W / 2, y2 + 18, '#ffffff', { align: 'center', scale: 2, shadow: '#000' }); if (c.asking) T(g, c.asking + ' asked for more time', W / 2, y2 + 36, '#c8d0e8', { align: 'center', font: 'tiny' });
      const bw = 96; H._readyB = { x: Math.round(W / 2 - bw - 4), y: Hh - 44, w: bw, h: 20 }; H._moreB = { x: Math.round(W / 2 + 4), y: Hh - 44, w: bw, h: 20 };
      E.ui.box(g, H._readyB.x, H._readyB.y, bw, 20, { bg: H.answered.ready ? ['#2a5a2a', '#143014'] : ['#3a3220', '#241c10'], border: '#f2c230' }); T(g, H.answered.ready ? 'READY ✓' : 'READY', H._readyB.x + bw / 2, H._readyB.y + 6, '#ffffff', { align: 'center' });
      E.ui.box(g, H._moreB.x, H._moreB.y, bw, 20, { bg: H.answered.more ? ['#2a3a5a', '#141e30'] : '#141420', border: '#8a90b0' }); T(g, H.answered.more ? 'MORE TIME ✓' : 'MORE TIME', H._moreB.x + bw / 2, H._moreB.y + 6, '#ffffff', { align: 'center' });
      DH.Glyph.row(g, [['confirm', 'READY'], ['ats', 'MORE TIME']], W / 2, Hh - 20, { align: 'center' }); T(g, 'T: more time', W - 8, Hh - 10, '#6a6a80', { align: 'right', font: 'tiny' });
    });
  }
};
const inB = (p, b) => p && b && p[0] >= b.x && p[0] <= b.x + b.w && p[1] >= b.y && p[1] <= b.y + b.h;
/* ---- the race ---- */
DH.scenes.hubRun = {
  input: DH.KEYS, camera: { zoom: false }, pausable: true,
  enter() {
    const d = H.drive = new DH.Drive('PR', { track: H.myTrack(), auto: DH.hubAuto ? { skill: .9 } : null });
    d.ghosts = [...H.ghosts.values()].map(gh => { gh.tr = { s: d.run.s, track: gh.track, dir: 1, cars: 6, livery: 'h8000', lights: true, colour: gh.color, tag: (gh.name || '').toUpperCase().slice(0, 10) }; return gh.tr; });
    d.run.on('judge', J => { if (!J.tut) AIHub.send({ t: 'j', st: J.station, j: J.label.replace('!', '').replace(' HALO', ''), e: +J.err.toFixed(2) }, { reliable: true }); });
    d.run.on('finish', () => setTimeout0(() => H.finish(false)));
    SND().music(null); game.input.consumeAll(); H.cd = -1;
  },
  update(dt) {
    const d = H.drive; if (!d || H.ended) return;
    const t = AIHub.time();
    // the countdown: the departure melody; play begins at the hub's zero
    if (t < 0) { const k = Math.ceil(-t / 1000); if (k !== H.cd && k <= 3) { H.cd = k; game.audio.sfx('countdown'); } d.story.update(dt); d.hud.update(dt); return; }
    if (H.cd !== 0) { H.cd = 0; game.audio.sfx('go'); }
    d.update(dt);
    // where we are, ten times a second; the standings every second
    H.sentT += dt; H.progT += dt;
    if (H.sentT >= .1) { H.sentT = 0; AIHub.send({ t: 'g', area: 'quad', s: +d.run.s.toFixed(1), v: +d.run.train.v.toFixed(1), n: d.run.train.name, st: d.run.phase }, { reliable: false }); H.stats.sent++; }
    if (H.progT >= 1) { H.progT = 0; const sc = Math.max(0, d.run.finalScore()), ns = d.run.nextStop(); AIHub.progress({ score: sc, label: (ns ? ns.p.st.name : 'ARRIVED') + ' · ' + sc }); AIHub.send({ t: 'p', score: sc }, { reliable: false }); }
    // the ghosts glide to where they were last heard, carried on by their speed
    for (const gh of H.ghosts.values()) { if (!gh.tr) continue; const tgt = gh.ts + gh.v / 3.6 * .1; gh.s += (tgt - gh.s) * Math.min(1, dt * 6) + gh.v / 3.6 * dt * .5; gh.tr.s = gh.s; gh.tr.visible = gh.seen && Math.abs(gh.s - d.run.s) < 1500; }
    for (const q of H.toasts) q.t += dt; H.toasts = H.toasts.filter(q => q.t < 3);
    if (d.run.phase === 'over' && !H.result) H.finish(false);
  },
  draw(r) {
    const d = H.drive; if (!d) return; d.draw(r);
    r.overlay(g => {
      const W = r.W, Hh = r.H, t = AIHub.time();
      if (t < 0 && isFinite(t)) { const k = Math.ceil(-t / 1000); F.title(g, k > 0 ? String(k) : 'GO!', Math.round(W / 2), Math.round(Hh * .32), { scale: 4, align: 'center', colors: ['#ffffff', '#ffe070', '#f2c230'], depth: 3 }); }
      // standings
      const me = H.me(), rows = [{ name: 'YOU', color: me.color, score: Math.max(0, d.run.finalScore()), done: d.run.phase === 'finished' }].concat([...H.ghosts.values()].map(gh => ({ name: (gh.name || '').toUpperCase().slice(0, 9), color: gh.color, score: gh.score, done: gh.done }))).sort((a, b) => b.score - a.score);
      const x = 6, y = Math.round(Hh * .2); rows.forEach((rw, i) => { E.ui.box(g, x, y + i * 12, 92, 11, { alpha: .7, bg: '#0a0c18', border: rw.color }); T(g, (i + 1) + ' ' + rw.name, x + 3, y + i * 12 + 2, '#ffffff', { font: 'tiny' }); T(g, rw.score + (rw.done ? ' ✓' : ''), x + 89, y + i * 12 + 2, rw.color, { align: 'right', font: 'tiny' }); });
      H.toasts.forEach((q, i) => T(g, q.text, W / 2, Math.round(Hh * .62) + i * 10, q.col, { align: 'center', shadow: '#000' }));
      if (H.phase === 'wait') { E.ui.box(g, Math.round(W / 2 - 90), Math.round(Hh * .45), 180, 20, { alpha: .85, bg: '#0a0c18', border: '#f2c230' }); T(g, 'WAITING FOR THE OTHERS', W / 2, Math.round(Hh * .45) + 6, '#ffe9a0', { align: 'center' }); }
    });
  }
};
const setTimeout0 = fn => Promise.resolve().then(fn);
DH.scenes.hubEnd = {
  input: DH.KEYS, camera: { zoom: false },
  enter() { game.input.clear(); },
  update() { game.input.clear(); },
  draw(r) {
    DH.drawScenic(r, 'duel');
    r.overlay(g => {
      const W = r.W, Hh = r.H; px.blend(g, .65, 'normal', () => px.rect(g, 0, 0, W, Hh, '#05060c'));
      F.title(g, H.endReason === 'finished' ? 'FINAL STANDINGS' : H.endReason === 'sat-out' ? 'YOU SAT THIS ONE OUT' : 'ROUND OVER', Math.round(W / 2), 20, { scale: 2, align: 'center', colors: ['#fffbe0', '#ffe070', '#c88a20'], depth: 2 });
      const P = H.info ? H.info.players : [], st = H.standings || [];
      let rank = 1; st.forEach(tier => { (Array.isArray(tier) ? tier : [tier]).forEach(id => { const p = P.find(q => q.id === id); if (!p) return; const y = 52 + (rank - 1) * 16; E.ui.box(g, Math.round(W / 2 - 100), y, 200, 14, { alpha: .8, bg: '#0a0c18', border: p.color }); T(g, rank + '.  ' + (p.name || 'Player').slice(0, 18) + (p.id === H.info.me ? '  (YOU)' : ''), W / 2 - 94, y + 3, '#ffffff'); }); rank++; });
      DH.drawHaro(g, W / 2, Hh - 30, 1.2, game.real);
    });
  }
};
})();
