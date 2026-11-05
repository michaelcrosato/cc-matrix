/* THE ATTRACT MODE: after 10 s without input on the title, the menu or setup, a looping AI-played demo of about 100 s
 * that shows as much of the game as it can: a kickoff return, a Blazing TD with its replay, a mud fumble and pile-up, a
 * Kick Cam field goal, a pick six, Mascot Mayhem, LIGHTS OUT, the Snowplow, a story snippet, the halftime show, the
 * Seismic Sack, the champions, the Hall of Fiasco and the title. Both teams are the normal brains; the director forces
 * play calls and outcomes (the attract mode may cheat). Any input goes back. Nothing is saved. */
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, { px } = E, game = FF.game, S = FF.sim, UI = FF.ui, F = FF.FIELD;
const W = () => game.W, H = () => game.H;
const T = (g, s, x, y, c, o = {}) => E.font.text(g, s, Math.round(x), Math.round(y), c, Object.assign({ outline: false, shadow: '#000' }, o));
const call = (id, o = {}) => () => Object.assign({ play: FF.play(id), flip: false }, o);
const M = (o) => Object.assign({ kind: 'match', home: 'fiascos', away: 'mudhogs', stadium: 'tumbleweed', qLen: 600, difficulty: 'pro', humans: [], noOT: true, mode: 'attract', noSave: true, cpuCallDelay: .25 }, o);

FF.data.attract = [
  { id: 'logo', kind: 'logo', dur: 3 },
  M({ id: 'kickoff', dur: 8, start: 'kickoff', kicking: 1, cheats: { godMode: true, team: 0, freezeClock: true }, label: 'KICKOFF RETURN', key: 'kickCaught' }),
  M({ id: 'blazing', dur: 11, start: { possession: 0, los: 55, down: 1, toGo: 20 }, cards: [['HOT_SAUCE'], []], forceCalls: { 0: call('deep_post', { card: 'HOT_SAUCE' }), 1: call('cover2') }, cheats: { forceCatch: true, noTackle: true, team: 0 }, label: 'A BLAZING TOUCHDOWN', key: 'td' }),
  M({ id: 'mud', dur: 8, stadium: 'hogwallow', home: 'mudhogs', away: 'fiascos', start: { possession: 0, los: 45, down: 2, toGo: 12 }, forceCalls: { 0: call('hb_dive'), 1: call('lb_blitz') }, cheats: { forceFumble: true }, label: 'BERTHA IN THE MUD', key: 'fumble', after: () => { const b = S.bySlot(0, 'RB'); if (b) b.specialUsed = {}; }, tick: t => { const c = S.carrier(); if (S.phase === 'LIVE' && c && S.play.t > 1.6) { const d = S.onField(1 - c.team).sort((p, q) => Math.hypot(p.b.x - c.b.x, p.b.y - c.b.y) - Math.hypot(q.b.x - c.b.x, q.b.y - c.b.y))[0]; if (d) { d.b.x = c.b.x + 10; d.b.y = c.b.y; d.act = { id: 'bigHit', t: .1, dur: 1.35, air: .35, lunge: true }; S.cheats.forceFumble = true; S.tryTackle(d, c); } } } }),
  M({ id: 'fg', dur: 7, stadium: 'hogwallow', home: 'mudhogs', away: 'fiascos', start: { possession: 1, los: 65, down: 4, toGo: 9 }, forceCalls: { 1: call('field_goal') }, cheats: { forceKick: true }, label: 'THE KICK CAM', key: 'fg' }),
  M({ id: 'pick6', dur: 8, stadium: 'afterglow', home: 'owls', away: 'fiascos', night: true, start: { possession: 0, los: 40, down: 3, toGo: 15 }, forceCalls: { 0: call('slants'), 1: call('man') }, cheats: { forceINT: true, godMode: true, team: 1 }, label: 'PICK SIX', key: 'int', tick: () => { const q = S.bySlot(0, 'QB'), w = S.bySlot(0, 'WR1'); if (S.phase === 'LIVE' && q && w && S.ball.holder === q && !S.play.passThrown && S.play.t > 1.2 && !q.act) S.startThrow(q, w, false); const B = S.ball; if (B.state === 'pass' && !B.forced) { const d = S.onField(1).sort((p, r) => Math.hypot(p.b.x - B.tx, p.b.y - B.ty) - Math.hypot(r.b.x - B.tx, r.b.y - B.ty))[0]; if (d) { d.b.x += (B.tx - d.b.x) * .15; d.b.y += (B.ty - d.b.y) * .15; d.eng && S.release(d.eng); } } } }),
  M({ id: 'mascot', dur: 7, stadium: 'afterglow', home: 'owls', away: 'fiascos', night: true, start: { possession: 0, los: 50, down: 1, toGo: 20 }, forceCalls: { 0: call('deep_post'), 1: call('cover2') }, label: 'MASCOT MAYHEM', key: 'mascotHit', after: () => { S.mascotOn = 1; }, tick: () => { const m = S.mascot, c = S.carrier(); if (m && !m.done && c && S.phase === 'LIVE' && S.play.t > 1.2) { m.x += (c.b.x - m.x) * .08; m.y += (c.b.y - m.y) * .08; } } }),
  M({ id: 'lights', dur: 6, stadium: 'afterglow', home: 'owls', away: 'fiascos', night: true, start: { possession: 1, los: 30, down: 1, toGo: 20 }, forceCalls: { 1: call('hb_sweep'), 0: call('cover2') }, label: 'LIGHTS OUT!', after: () => FF.ots.lightsOut(true, 9) }),
  M({ id: 'snowplow', dur: 7, stadium: 'frostbite', home: 'yetis', away: 'fiascos', start: { possession: 1, los: 30, down: 2, toGo: 14 }, forceCalls: { 1: call('deep_post'), 0: call('lb_blitz') }, label: 'AVALANCHE SNOWPLOW', key: 'sack' }),
  { id: 'story', kind: 'story', dur: 6, lines: [['brock', "I've got a golden arm, a golden helmet, and a golden future."], ['brock', "You've got... pickles."]] },
  M({ id: 'halftime', dur: 5, stadium: 'megadome', home: 'dynasty', away: 'fiascos', start: { possession: 0, los: 50, down: 1, toGo: 20 }, label: 'THE HALFTIME SHOW', halftime: true }),
  M({ id: 'seismic', dur: 7, stadium: 'megadome', home: 'dynasty', away: 'fiascos', start: { possession: 1, los: 35, down: 3, toGo: 18 }, forceCalls: { 1: call('hb_dive'), 0: call('lb_blitz') }, label: 'THE SEISMIC SACK', key: 'seismic', after: () => { const m = S.bySlot(0, 'LB1'); if (m) m.specialUsed = {}; }, tick: () => { const m = S.bySlot(0, 'LB1'), c = S.carrier(); if (m && c && c.team !== 0 && S.phase === 'LIVE' && S.play.t > .45 && !(m.seismicT > 0)) { if (m.eng) S.release(m.eng); m.down = 0; if (Math.hypot(c.b.x - m.b.x, c.b.y - m.b.y) > 40) { m.b.x = c.b.x + S.dir[c.team] * 30; m.b.y = c.b.y + 8; } FF.ots.trySpecial(m); } } }),
  M({ id: 'champs', dur: 5, stadium: 'megadome', home: 'dynasty', away: 'fiascos', start: { possession: 1, los: 50, down: 1, toGo: 20 }, label: 'CHAMPIONS!', champs: true }),
  { id: 'records', kind: 'records', dur: 5 },
  { id: 'title', kind: 'title', dur: 5 }
];

const A = {
  input: FF.KEYS, view: 'broadcast', camera: { zoom: false },
  enter(d) { A.from = (d && d.from) || 'title'; A.i = -1; A.seen = {}; A.loops = 0; FF.noSave = true; FF.music.play('ATTRACT'); A.next(); FF.idle.reset(); A.wait = .4; },
  exit() { FF.noSave = false; game.timeScale = 1; FF.cut.lines = null; FF.match.camOpt = null; },
  next() {
    A.i = (A.i + 1) % FF.data.attract.length; if (A.i === 0) A.loops++;
    const seg = A.seg = FF.data.attract[A.i]; A.t = 0;
    FF.bus.emit('attractSegment', { id: seg.id });
    if (seg.kind === 'match') {
      FF.match.setup(Object.assign({}, seg, { seed: 11 + A.i, after: () => { if (seg.after) seg.after(); } }));
      if (seg.halftime || seg.champs) { S.toPhase(seg.champs ? 'FINAL' : 'HALFTIME', 99); S.halftimeHold = true; for (const a of S.athletes) a.pose = seg.champs ? (a.team === 1 ? 'CHEER' : 'DEJECTED') : 'IDLE'; S.winner = 1; }
      FF.music.play('ATTRACT');
    } else if (seg.kind === 'story') { FF.cut.play(seg.lines, {}); A.cutT = 0; }
  },
  update(dt) {
    A.wait -= dt;
    if (A.wait < 0 && FF.idle.any()) { game.input.consumeAll && game.input.consumeAll(); game.go(A.from, null, { fade: .25 }); return; }
    A.t += dt;
    const seg = A.seg;
    if (seg.kind === 'match') {
      if (seg.halftime || seg.champs) { S.moveAll(dt, true); FF.match.update ? null : 0; presentation(dt); if (seg.champs && Math.random() < dt * 3) game.particles.bits(1024 + (Math.random() - .5) * 200, F.MID_Y, 160, 20, ['#e8742a', '#4a2a6a', '#ffd84a', '#ffffff']); }
      else { FF.match.update(dt); if (seg.tick && !A.seen[seg.id]) seg.tick(A.t); }
      if (seg.key && !A.seen[seg.id] && FF.sim.events) { /* events are counted by the listener below */ }
      const done = A.t > seg.dur || (seg.key && A.seen[seg.id] && A.t - A.seen[seg.id] > 3.5 && !FF.replay.play);
      if (done) A.next();
    } else if (seg.kind === 'story') { A.cutT += dt; if (A.cutT > 2.6) { A.cutT = 0; FF.cut.next(); } FF.cut.update(0); if (A.t > seg.dur || !FF.cut.lines) A.next(); }
    else if (A.t > seg.dur) A.next();
  },
  draw(r) {
    const seg = A.seg;
    if (seg.kind === 'match') FF.match.draw(r);
    else if (seg.kind === 'story') { FF.titleStage.draw(r, 1 / 60, { zoom: 1.5 }); }
    else FF.titleStage.draw(r, 1 / 60, { zoom: 1.25 });
    r.overlay(g => {
      if (seg.kind === 'logo' || seg.kind === 'title') FF.logo(g, A.t, W() / 2, H() * .14);
      if (seg.kind === 'story') FF.cut.draw(g);
      if (seg.kind === 'records') { px.blend(g, .7, 'normal', () => px.rect(g, 0, 0, W(), H(), '#05050c')); UI.title(g, 'HALL OF FIASCO', W() / 2, 20, 3); const rec = FF.records.all(); FF.records.KEYS.slice(0, 6).forEach(([k, label, unit], i) => { const v = rec[k]; T(g, label, W() / 2 - 150, 64 + i * 22, '#ffb02e'); T(g, v ? (k === 'cupTime' ? FF.fmtClock(v.v) : v.v + unit) : '--', W() / 2 + 150, 64 + i * 22, '#ffffff', { align: 'right' }); }); }
      if (seg.halftime) FF.results.halftime(g);
      if (seg.champs) UI.title(g, 'FIASCO CUP CHAMPIONS', W() / 2, H() * .2, 2);
      if (seg.label && A.t < 2.5) T(g, seg.label, W() / 2, H() * .14, '#ffe890', { align: 'center', scale: 2, outline: '#000' });
      // the overlay: DEMO PLAY and PRESS ANY BUTTON
      E.ui.box(g, W() / 2 - 44, 4, 88, 16, { bg: ['#d03a2a', '#801a10'], border: '#ffffff', alpha: .95 });
      T(g, 'DEMO PLAY', W() / 2, 8, '#ffffff', { align: 'center' });
      if (Math.floor(game.real * 2) % 2) T(g, FF.touchOnly ? 'TAP TO RETURN' : 'PRESS ANY BUTTON', W() / 2, H() - 22, '#ffe040', { align: 'center', scale: 2, outline: '#000' });
    });
  }
};
function presentation(dt) { for (const a of S.all) if (a.on) FF.Rigs.drive(a, dt, {}); FF.cam.update(dt, { target: [1024, F.MID_Y, 1.1] }); FF.cast.update(dt); FF.Stadium.update(dt); FF.fx.update(dt); FF.talk.update(dt); FF.Stadium.excite(.9); }
FF.bus.on('*', e => { if (FF.game.sceneName !== 'attract' || !A.seg) return; if (A.seg.key === e.ev && !A.seen[A.seg.id]) A.seen[A.seg.id] = A.t || .01; FF.attractLog = FF.attractLog || {}; FF.attractLog[e.ev] = (FF.attractLog[e.ev] || 0) + 1; });
FF.scenes = Object.assign(FF.scenes || {}, { attract: A });
})();
