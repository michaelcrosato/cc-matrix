/* DENSHA DE HALO! · AI Hub sessions (Session Protocol 1, ghost mode, 2-4 players): the Parallel Run. Every copy drives
 * the same seeded round on its own track of the quad section; the others show as ghost trains (their stripe in the
 * seat colour, a name tag) that never touch our world. Our own card before the start; ready() with no key press; play
 * gated on AIHub.time() >= 0; progress every second; result() once; on end, no input, no sound, the final standings. */
(() => {
'use strict';
const E = My3D2dge, DH = window.DH, px = E.px, game = DH.game, R = Math.round;
const H = DH.HUB;
const SEAT_TRACK = ['A', 'D', 'C', 'B'];
DH.hubState = { active: !!H, phase: 'boot', sent: 0, progressCalls: 0, resultSent: false, ended: false, ghosts: new Map(), card: null, info: null, standings: null, log: [] };
const HS = DH.hubState;
DH.hubConnect = async () => {
  if (!H) return null;
  let info = null;
  try { info = await H.connect({ mode: 'ghost', seats: [2, 4], card: true }); } catch (e) { info = null; }
  if (!info) { HS.active = false; return null; }
  HS.info = info; HS.phase = 'card';
  if (H.seed !== undefined) DH.seed = H.seed;
  for (const p of info.players) if (p.id !== info.me) HS.ghosts.set(p.id, { id: p.id, name: p.name, color: p.color || DH.SEAT[p.id % 4], s: 0, ts: 0, v: 0, done: false, gone: false, actor: null, j: null });
  H.on('card', c => { HS.card = Object.assign({ at: game.real }, c); });
  H.on('start', () => { HS.phase = 'countdown'; DH.Sound.melody('shotengai'); });
  H.on('message', (data, from) => {
    const gh = HS.ghosts.get(from); if (!gh || !data) return;
    if (data.t === 'g') { gh.ts = data.s; gh.v = data.v; gh.n = data.n; gh.st = data.st; if (!gh.seen) { gh.seen = true; gh.s = data.s; } }
    if (data.t === 'j') { gh.j = data.j; HS.toast = { text: (DH.SEAT_NAME[from % 4] || 'P' + from) + ': ' + data.j + ' STOP', color: gh.color, t: 0 }; }
    if (data.t === 'done') { gh.done = true; gh.score = data.score; }
  });
  H.on('leave', ({ id }) => { const gh = HS.ghosts.get(id); if (gh) gh.gone = true; HS.ghosts.delete(id); });
  H.on('time-up', () => { if (!HS.resultSent) DH.hubResult(); });
  H.on('end', ({ reason, standings }) => {
    HS.ended = true; HS.phase = 'end'; HS.reason = reason; HS.standings = standings || null;
    DH.music(null); DH.Sound.silence(); game.audio.mute(true); game.input.clear && game.input.clear();
  });
  game.go('hubCard', null, { fade: 0 });
  H.ready();
  return info;
};
DH.hubResult = () => {
  if (HS.resultSent || !H) return; HS.resultSent = true;
  const run = HS.drive && HS.drive.run, score = run ? run.finalScore() : 0;
  const stats = run ? { 'Perfect stops': run.stats.perfect, 'On time': run.stats.ontime, 'Great calls': run.stats.great } : {};
  const awards = []; if (run && run.stats.perfect >= 2) awards.push({ title: 'PERFECT HALO', detail: 'Every stop within 10 cm' }); if (run && run.stats.ontime >= 2) awards.push({ title: 'NOT ONE SECOND', detail: 'Every arrival on time' });
  H.result({ score, stats, awards });
  try { H.send({ t: 'done', score }); HS.sent++; } catch (e) { /* the hub drops it */ }
};
/* ---------- our own card: the four trains at Shotengai from above ---------- */
DH.scenes.hubCard = {
  enter() { this.bg = null; DH.music('parallel'); this.rects = {}; },
  answer(a) { if (HS.phase !== 'card' || !H) return; H.answer(a); DH.Sound.play(a === 'ready' ? 'confirm' : 'move'); },
  update(dt) {
    if (!this.bg) {
      const R0 = DH.route('halo'), st = R0.station('shotengai').stop[6];
      this.bg = new DH.Backdrop({ tod: 12, weather: 'clear', cam: { s: st - 170, x: 3.5, h: 24, dir: 1, horizon: .45, fov: 70 } });
      this.trains = SEAT_TRACK.map((t, i) => new DH.TrainActor({ id: 'c' + i, kind: 'h8000', cars: 6, s: st, dir: 1, xAt: s => R0.trackX(t, s) || 0, seatColor: DH.SEAT[i] }));
    }
    this.bg.update(dt);
    if (HS.phase === 'countdown' || HS.phase === 'play') { if (H.time() > -3000) game.go('hubRun', null, { fade: 0 }); return; }
    if (HS.phase !== 'card') return;
    const In = game.input;
    if (In.pressed('start') || In.pressed('call')) this.answer('ready');
    if (In.pressed('more') || In.pressed('ats')) this.answer('more');
    const c = In.clicked && In.clicked();
    if (c) for (const k in this.rects) { const q = this.rects[k]; if (c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]) this.answer(k); }
  },
  draw(r) {
    if (!this.bg) { r.sky(['#0a0e24', '#14204a', '#1a2a5a']); return; }
    const W = r.W, H2 = r.H, t = game.real, info = HS.info, card = HS.card;
    r.overlay(g => this.bg.rail.paint(g, { x: 0, y: 0, w: W, h: H2 }, this.bg.o.cam, { actors: this.trains, grade: this.bg.grade, weather: 'clear', t, fogDist: 1100 }));
    r.overlay(g => {
      px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, 56, '#05060c'));
      DH.logo(g, W / 2, 6, 3, t);
      E.font.text(g, 'PARALLEL RUN: four drivers, four tracks, one timetable', R(W / 2), 34, '#ffffff', { align: 'center', shadow: '#000' });
      E.font.text(g, 'Best driving score: stop on the mark, on time', R(W / 2), 44, '#ffe27a', { align: 'center', shadow: '#000' });
      const y = H2 - 104; DH.panel(g, 8, y, W - 16, 96);
      (info ? info.players : []).forEach((p, i) => { const ready = card && card.ready && card.ready.includes(p.id), x = 16 + i * ((W - 32) / 4); px.rect(g, R(x), y + 8, 10, 10, p.color || DH.SEAT[i]); E.font.text(g, String(p.name || 'P' + (i + 1)).slice(0, 12), R(x + 14), y + 9, p.id === info.me ? '#ffffff' : '#c8d0f0'); E.font.text(g, ready ? 'READY ✕' : '...', R(x + 14), y + 19, ready ? '#6aee7a' : '#8a90b0'); });
      const cx = W / 2; let x = 16;
      for (const [a, w] of [['power', 'POWER'], ['brake', 'BRAKE'], ['call', 'CALL'], ['horn', 'HORN'], ['ats', 'ATS']]) x += DH.Glyph.prompt(g, a, w, x, y + 40, '#ffffff') + 10;
      const left = card && card.left !== null && card.left !== undefined ? Math.max(0, Math.ceil((card.left - (game.real - card.at) * 1000) / 1000)) : null;
      E.font.text(g, !card ? 'Get ready...' : card.starting ? 'Starting...' : card.paused ? 'Paused: most players want more time' : left !== null ? 'Starts in ' + left : '', R(cx), y + 54, '#ffe27a', { align: 'center', scale: 1 });
      if (card && card.asking) E.font.text(g, card.asked ? 'You asked for more time' : card.asking + ' asking for more time', R(cx), y + 64, '#c8d0f0', { align: 'center' });
      const mine = card && card.ready && info && card.ready.includes(info.me);
      this.rects.ready = [cx - 120, y + 72, 110, 16]; this.rects.more = [cx + 10, y + 72, 110, 16];
      px.rect(g, cx - 120, y + 72, 110, 16, mine ? '#2a6a3a' : '#2a3a7a'); DH.Glyph.prompt(g, 'start', mine ? 'READY!' : 'READY', cx - 65, y + 80, '#ffffff', 1, 'center');
      px.rect(g, cx + 10, y + 72, 110, 16, card && card.asked ? '#6a5a2a' : '#2a3a7a'); DH.Glyph.prompt(g, 'more', 'MORE TIME', cx + 65, y + 80, '#ffffff', 1, 'center');
    });
  }
};
/* ---------- the round ---------- */
DH.scenes.hubRun = {
  pausable: true, camera: { zoom: false },
  enter() {
    const info = HS.info, me = info ? info.me : 0, seat = info ? Math.max(0, info.players.findIndex(p => p.id === me)) : 0;
    const run = new DH.Run('PR', { track: SEAT_TRACK[seat % 4], difficulty: 'Normal' });
    HS.drive = this.dr = new DH.Drive(run, { seatColor: DH.SEAT[seat % 4], ghosts: [...HS.ghosts.values()], onEnd: () => this.finish(), onGameOver: () => this.finish(), onEvents: out => { for (const e of out) if (e.k === 'judge' && e.station && H) { try { H.send({ t: 'j', st: e.station, j: e.label.replace(/!/g, '').replace('PERFECT HALO', 'PERFECT'), e: Math.round((e.err || 0) * 100) / 100 }); HS.sent++; } catch (x) { /* dropped */ } } } });
    this.dr.me.seatColor = DH.SEAT[seat % 4];
    for (const gh of HS.ghosts.values()) { const i = info.players.findIndex(p => p.id === gh.id), trk = SEAT_TRACK[i % 4], R0 = run.R; gh.s = run.s; gh.ts = run.s; gh.actor = new DH.TrainActor({ id: 'ghost' + gh.id, kind: 'h8000', cars: 6, s: run.s, dir: 1, xAt: s => R0.trackX(trk, DH.wrap(s, R0.len)) || 0, seatColor: gh.color, tag: String(gh.name || 'P').slice(0, 10).toUpperCase(), tagColor: gh.color }); }
    this.dr.ghosts = [...HS.ghosts.values()];
    this.sendT = 0; this.progT = 0; HS.phase = 'play'; DH.wheelWanted = () => game.sceneName === 'hubRun' && !game.paused;
    DH.applyLeverDir(); DH.current = this.dr;
  },
  finish() { if (!HS.resultSent) DH.hubResult(); HS.finished = true; },
  update(dt) {
    const dr = this.dr, run = dr.run;
    for (const gh of HS.ghosts.values()) { if (!gh.actor) continue; gh.ts += (gh.v || 0) / 3.6 * dt; gh.s += (gh.ts - gh.s) * Math.min(1, dt * 5); gh.actor.s = gh.s; gh.actor.tag = Math.abs(gh.s - run.s) < 400 ? String(gh.name || 'P').slice(0, 10).toUpperCase() : null; }
    dr.ghosts = [...HS.ghosts.values()];
    if (HS.toast) { HS.toast.t += dt; if (HS.toast.t > 2) HS.toast = null; }
    if (HS.ended) return;
    if (!H || H.time() < 0) { dr.story.update(dt); return; }   // play begins at 0
    const c = HS.finished ? {} : dr.readInput(game.input, dt);
    dr.update(dt, c);
    this.sendT += dt; this.progT += dt;
    if (this.sendT >= .1) { this.sendT = 0; try { if (H.send({ t: 'g', area: 'quad', s: Math.round(run.s * 10) / 10, v: Math.round(run.v * 10) / 10, n: run.notchName, st: run.phase }, { reliable: false }) !== false) HS.sent++; } catch (e) { /* dropped */ } }
    if (this.progT >= 1) { this.progT = 0; const sp = run.nextStop; H.progress({ score: run.finalScore(), label: (sp ? sp.st.name : 'DONE') + ' · ' + DH.fmtNum(run.finalScore()) }); HS.progressCalls++; }
  },
  draw(r) {
    this.dr.draw(r);
    const W = r.W, Hh = r.H, run = this.dr.run;
    r.overlay(g => {
      // the standings
      const rows = [[DH.SEAT_NAME[SEAT_TRACK.indexOf(run.track)] || 'YOU', run.finalScore(), this.dr.me.seatColor, true]].concat([...HS.ghosts.values()].map(gh => [String(gh.name || '').slice(0, 8), gh.score || 0, gh.color, false]));
      const y0 = Math.round(Hh * .3);
      rows.forEach(([n, s, c, me], i) => { px.rect(g, 4, y0 + i * 10, 4, 8, c); E.font.text(g, (me ? '> ' : '') + n, 10, y0 + i * 10, me ? '#ffffff' : '#c8d0f0', { shadow: '#000' }); });
      if (HS.toast) E.font.text(g, HS.toast.text, R(W / 2), R(Hh * .24), HS.toast.color, { align: 'center', shadow: '#000' });
      if (H && H.time() < 0 && !HS.ended) { const n = Math.ceil(-H.time() / 1000); E.font.title(g, n > 0 && n < 4 ? String(n) : 'READY', R(W / 2), R(Hh * .3), { scale: 4, colors: ['#ffffff', '#ffe27a', '#f2c230'], outline: '#0b0d18', align: 'center' }); }
      if (HS.finished && !HS.ended) { DH.panel(g, W / 2 - 110, Hh * .4, 220, 30); E.font.text(g, 'Waiting for the others', R(W / 2), R(Hh * .4 + 11), '#ffffff', { align: 'center' }); }
      if (HS.ended) {
        px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W, Hh, '#05060c'));
        E.font.title(g, HS.reason === 'finished' ? 'FINAL STANDINGS' : 'ROUND OVER', R(W / 2), 30, { scale: 2, colors: ['#ffffff', '#ffe27a'], outline: '#0b0d18', align: 'center' });
        const names = new Map((HS.info ? HS.info.players : []).map(p => [p.id, p]));
        (HS.standings || []).forEach((grp, i) => { (Array.isArray(grp) ? grp : [grp]).forEach((id, k) => { const p = names.get(id); E.font.text(g, (i + 1) + '. ' + String(p ? p.name : 'P' + id).slice(0, 14), R(W / 2 - 60), 60 + (i + k) * 14, p ? p.color : '#ffffff', { scale: 1 }); }); });
      }
    });
  }
};
})();
