// SNIPEOUT HD: AI Hub sessions (protocol 1, client 1.4.0, mode ghost). Everyone races the same seeded event on their
// own device: a FLARE race of 3 laps on a circuit the hub's seed picks, each copy with its own craft and the AI; the
// other humans are ghosts drawn from their messages, never collided with or targeted. The game's own card (a 3D grid
// shot, the players in seat colours, ready ticks, the time left, the goal, this player's controls), ready() once the
// world is warm, the countdown on the hub's clock, ghosts at 10 Hz, progress every second, the result, time-up, end.
(() => {
const E = My3D2dge, SN = globalThis.SN, V = SN.v, U = 16;
const HUB = SN.hub = { active: !!(typeof AIHub !== 'undefined' && AIHub.active), info: null, ghosts: new Map(), ended: false, reported: false, started: false, card: null, sent: 0, lastSend: -1, lastProg: -1, progressCount: 0, readyCalled: false, answered: null };
const SEAT_TEAMS = ['kestrel', 'soratek', 'volta', 'caldera'];
const SEAT_PILOTS = ['vale', 'takahara', 'ferrante', 'soto'];
/** connect, set up the event; the session scene takes it from there */
HUB.begin = async game => {
  const info = await AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true });
  if (!info) { HUB.active = false; return false; }
  HUB.info = info;
  const ev = HUB.event = { track: SN.TRACK_ORDER[Math.floor(AIHub.rng('event')() * 4)], cls: 'FLARE', laps: 3, seed: Math.floor(AIHub.rng('race')() * 4294967296) };
  for (const p of info.players) if (p.id !== info.me) HUB.ghosts.set(p.id, { id: p.id, name: p.name, color: p.color, seat: info.players.indexOf(p), samples: [], done: null, left: false });
  AIHub.on('card', c => { HUB.card = c; });
  AIHub.on('start', () => { HUB.started = true; });
  AIHub.on('message', (d, from) => { const g = HUB.ghosts.get(from); if (!g || !d) return; if (d.t === 'g') { g.samples.push(Object.assign({ at: AIHub.time() }, d)); if (g.samples.length > 30) g.samples.shift(); } if (d.t === 'done') g.done = d.ms; });
  AIHub.on('leave', ({ id }) => { const g = HUB.ghosts.get(id); if (g) { g.left = true; if (g.ship) g.ship.hidden = true; } HUB.ghosts.delete(id); });
  AIHub.on('time-up', () => { if (!HUB.reported) { HUB.reported = true; const s = HUB.race && HUB.race.player; AIHub.result({ score: s ? Math.max(0, Math.round(s.p / 16)) : 0 }); } });
  AIHub.on('end', e => { HUB.ended = true; HUB.endInfo = e; SN.audio.stopAll(); });
  return true;
};
/** the session's race: this copy's craft (by seat), the AI in front, the others as ghosts at the back */
HUB.makeRace = tw => {
  const info = HUB.info, me = info.players.findIndex(p => p.id === info.me), ev = HUB.event, seatOf = id => info.players.findIndex(p => p.id === id);
  const humans = [{ pilot: SEAT_PILOTS[me % 4], team: SEAT_TEAMS[me % 4] }];
  const ai = SN.field({ humans, size: 8 - (info.players.length - 1) }).filter(e => e.control === 'ai');
  const ghosts = [...HUB.ghosts.values()].map(g => ({ pilot: SEAT_PILOTS[g.seat % 4], team: SEAT_TEAMS[g.seat % 4], control: 'ghost', color: g.color, label: g.name, hubId: g.id }));
  const ent = ai.concat([{ pilot: humans[0].pilot, team: humans[0].team, control: 'human', pi: 0, color: info.players[me] && info.players[me].color }], ghosts);
  const R = new SN.Race({ track: tw.T, mode: 'hub', cls: ev.cls, laps: ev.laps, seed: ev.seed, entrants: ent, intro: false, clock: () => AIHub.time(), record: false });
  for (const s of R.ships) if (s.ghost) { const g = HUB.ghosts.get(s.hubId); if (g) g.ship = s; s.hidden = true; }
  HUB.race = R; return R;
};
/** a step of the session: ghosts from messages, sends at 10 Hz, progress about every second, the result */
HUB.step = (R, dt) => {
  if (HUB.ended || !R) return;
  const now = AIHub.time(), pl = R.player;
  // ghosts: interpolated toward the latest sample, 0.1 s behind
  for (const g of HUB.ghosts.values()) {
    const s = g.ship; if (!s) continue; const S = g.samples; if (!S.length) { s.hidden = true; continue; }
    const tt = now - 100; let a = S[0], b = S[S.length - 1];
    for (let k = 0; k < S.length - 1; k++) if (S[k].at <= tt && S[k + 1].at >= tt) { a = S[k]; b = S[k + 1]; break; }
    const f = b.at > a.at ? E.clamp((tt - a.at) / (b.at - a.at), 0, 1) : 1, L = R.track.L;
    let pa = a.p, pb = b.p; const p = pa + (pb - pa) * f, sAt = ((p % L) + L) % L;
    s.hidden = false; s.savePrev(); s.p = p; s.lapsDone = Math.max(0, Math.floor(p / L)); s.finished = !!b.fin || g.done !== null; if (s.finished && !s.finishT) s.finishT = (g.done || now) / 1000;
    const q = { s: sAt, u: a.u + (b.u - a.u) * f, h: a.h + (b.h - a.h) * f, yaw: a.y + (b.y - a.y) * f, roll: b.r || 0 };
    const fr = R.track.frameAt(q.s), srf = R.track.surface(q.s, q.u);
    if (srf.kind === 'gap') { V.addS(s.P, fr.C, fr.R, q.u); V.addS(s.P, s.P, fr.U, q.h); } else V.addS(s.P, srf.P, srf.N, q.h);
    V.set(s.F, fr.F[0] * Math.cos(q.yaw) + fr.R[0] * Math.sin(q.yaw), fr.F[1] * Math.cos(q.yaw) + fr.R[1] * Math.sin(q.yaw), fr.F[2] * Math.cos(q.yaw) + fr.R[2] * Math.sin(q.yaw));
    V.copy(s.U, srf.kind === 'gap' ? fr.U : srf.N); s.s = q.s; s.u = q.u; s.h = q.h; s.rollAng = q.roll; V.set(s.V, s.F[0] * b.v, s.F[1] * b.v, s.F[2] * b.v);
  }
  if (!pl || now < 0) return;
  // send our craft at 10 Hz (unreliable), progress about once a second
  if (now - HUB.lastSend >= 100) {
    HUB.lastSend = now; const fr = R.track.frameAt(pl.s), y = Math.atan2(V.dot(pl.F, fr.R), V.dot(pl.F, fr.F));
    AIHub.send({ t: 'g', p: Math.round(pl.p), u: Math.round(pl.u), h: Math.round(pl.h), y: +y.toFixed(3), r: +SN.wrapAngle(pl.rollAng).toFixed(2), v: Math.round(pl.speed), lap: pl.lap, fin: pl.finished ? 1 : 0 }, { reliable: false });
    HUB.sent++;
  }
  if (now - HUB.lastProg >= 1000) { HUB.lastProg = now; HUB.progressCount++; AIHub.progress({ score: Math.max(0, Math.round(pl.p / 16)), label: 'LAP ' + pl.lap + '/' + R.laps + ' · ' + SN.ordinal(pl.place) }); }
  if (pl.finished && !HUB.reported) {
    HUB.reported = true; const ms = Math.round(now);
    AIHub.result({ time: ms, stats: { 'Best lap': SN.fmtTime(pl.bestLap), 'Place vs AI': SN.ordinal(pl.place) }, awards: pl.stats.rolls ? [{ title: 'Barrel roller', detail: pl.stats.rolls + ' clean rolls' }] : [] });
    AIHub.send({ t: 'done', ms }, { reliable: true });
  }
};
/** the HUD's standings: the ghost players' names and live positions */
HUB.standingsHUD = (g, R, x, y) => {
  const rows = [R.player, ...[...HUB.ghosts.values()].map(q => q.ship).filter(Boolean)].sort((a, b) => b.p - a.p);
  rows.forEach((s, k) => { const me = s === R.player, c = me ? '#ffffff' : (s.seatColor || '#7af0ff'); E.font.text(g, (k + 1) + ' ' + (me ? 'YOU' : s.label), x, y + k * 9, c, { outline: '#05040c' }); });
};
/** the card's answers: Enter, ✕ or a tap on READY; △, M or a tap on MORE TIME (again takes it back) */
HUB.cardInput = (I, r) => {
  const c = I.clicked(), L = HUB._cardL || {};
  const inR = (q, b) => b && q[0] >= b[0] && q[0] < b[0] + b[2] && q[1] >= b[1] && q[1] < b[1] + b[3];
  if (I.pressed('confirm') || I.pressed('start') || (c && inR(c, L.ready))) { AIHub.answer('ready'); HUB.answered = 'ready'; SN.audio.sfx('card_ready'); I.consumeAll(); }
  else if (I.pressed('more') || (c && inR(c, L.more))) { AIHub.answer('more'); HUB.answered = HUB.answered === 'more' ? null : 'more'; SN.audio.sfx('ui_tab'); I.consumeAll(); }
};
HUB.drawCard = (g, r) => {
  const T = (s, x, y, c, o = {}) => E.font.text(g, s, x, y, c, Object.assign({ outline: '#05040c' }, o)), info = HUB.info, C = HUB.card || {}, ev = HUB.event, I = E.current.input;
  // the backdrop: night sky bands and the circuit's outline drawn large in its theme's neon
  g.fillStyle = '#05060e'; g.fillRect(0, 0, r.W, r.H); g._c = null;
  for (let k = 0; k < 12; k++) E.px.rect(g, 0, Math.round(r.H * k / 12), r.W, 1, k % 2 ? '#0a0e1c' : '#0c1224');
  SN.UI.panel(g, 10, 8, r.W - 20, r.H - 16, '#05060e', .55, '#29c8e8');
  { const Tr = SN.getTrack(ev.track), M = Tr.map, sz = Math.min(r.W - 40, r.H - 150) * .95, ox = r.W - sz - 20, oy = 90 + (r.H - 150 - sz) / 2, neon = SN.THEMES[SN.TRACKS[ev.track].theme].neon; let last = null;
    for (const p of M.pts) { const q = Tr.mapXY(p[0], p[1], sz, sz); if (last) E.px.line(g, ox + last[0], oy + last[1], ox + q[0], oy + q[1], neon, 2); last = q; }
    const t = E.current.real, k = Math.floor(t * 8) % M.pts.length, q = Tr.mapXY(M.pts[k][0], M.pts[k][1], sz, sz); E.px.disc(g, ox + q[0], oy + q[1], 3, '#ffffff'); }
  SN.drawLogo(g, r.W / 2, 14, .7);
  T('AI HUB SESSION · ' + SN.TRACKS[ev.track].name + ' · ' + ev.cls + ' · ' + ev.laps + ' LAPS', r.W / 2, 50, '#7af0ff', { align: 'center' });
  T('FINISH 3 LAPS FIRST: FASTEST TIME WINS', r.W / 2, 62, '#ffd36a', { align: 'center' });
  (info.players || []).forEach((p, k) => { const y = 78 + k * 14, ready = (C.ready || []).includes(p.id); E.px.rect(g, 30, y, 8, 8, p.color); T(p.name + (p.id === info.me ? '  (YOU)' : ''), 44, y, '#ffffff'); T(ready ? '✓ READY' : '...', r.W / 2 + 20, y, ready ? '#3aff6a' : '#7a8aa8'); });
  const left = C.left === null || C.left === undefined ? (C.starting ? 'STARTING' : C.paused ? 'PAUSED' : '') : Math.ceil(C.left / 1000) + ' S';
  T(left, r.W - 30, 78, '#ffffff', { align: 'right', scale: 2 });
  if (C.asking) T(C.asking + ' ASKED FOR MORE TIME', r.W - 30, 96, '#b8c4dc', { align: 'right', font: 'tiny' });
  const y0 = r.H - 82; T('YOUR CONTROLS', 30, y0, '#7af0ff');
  let xx = 30; for (const [a, l] of [['steer', 'STEER'], ['thrust', 'THRUST'], ['brakeL', ''], ['brakeR', 'AIRBRAKES'], ['fire', 'FIRE'], ['absorb', 'ABSORB']]) { xx += SN.glyph.draw(g, a, xx, y0 + 12, { input: I }) + 2; if (l) { T(l, xx, y0 + 14, '#ffffff'); xx += E.font.width(l) + 8; } }
  const bw = 100, by = r.H - 44, rb = HUB._cardL = { ready: [r.W / 2 - bw - 6, by, bw, 18], more: [r.W / 2 + 6, by, bw, 18] };
  SN.UI.panel(g, ...rb.ready, HUB.answered === 'ready' ? '#1a5a2a' : '#163a5a', .95, '#ffffff'); SN.glyph.draw(g, 'confirm', rb.ready[0] + 4, by + 4, { input: I }); T('READY', rb.ready[0] + 22, by + 5, '#ffffff', { scale: 1 });
  SN.UI.panel(g, ...rb.more, HUB.answered === 'more' || C.asked ? '#5a4a1a' : '#163a5a', .95, '#ffffff'); SN.glyph.draw(g, 'more', rb.more[0] + 4, by + 4, { input: I }); T(C.asked ? 'TAKE BACK' : 'MORE TIME', rb.more[0] + 22, by + 5, '#ffffff', { scale: 1 });
};
})();
