import { load } from './lib/load.mjs';
const which = process.argv[2];
const L = await load(); const { BB, game } = L; const I = game.input;
const skipCard = () => { for (let i = 0; i < 40 && BB.H.phase === 'card'; i++) { I.tap('confirm'); game.advance(.2); } };
const err = () => game.errors.map(e => e.message + ' ' + (e.stack||'').split('\n').slice(1,3).join('|'));
if (which === 'hollow1') {
  game.debug.goto('hollow1'); game.advance(.1); skipCard(); game.debug.bot(true, { skill: 'expert', cheat: true });
  for (let t = 0; t < 70; t += 1) { game.advance(1); const s = game.debug.snapshot(); if (t % 3 === 0) console.log(t, 'kills', s.site.kills, 'esc', s.site.escaped, s.site.animals.map(a => a.id + a.sex[0] + ':' + a.mode + (a.dead ? 'X' : '')).join(' '), JSON.stringify(s.players[0]).slice(0, 140)); }
}
if (which === 'bonus') {
  game.debug.goto('bonus_crows'); game.advance(.1); skipCard(); game.debug.bot(true, { skill: 'expert', cheat: true });
  for (let t = 0; t < 12; t += 1) { game.advance(1); const c = BB.curSite; console.log(t, c.state, 'crit', c.critters.length, c.critters.map(x => x.type + (x.dead ? 'X' : '') + ':' + Math.round(x.x) + ',' + Math.round(x.y) + ',' + (x.alt||0).toFixed(1)).join(' '), JSON.stringify(game.debug.snapshot().players[0]).slice(0, 160), BB.players[0].bot.target && BB.players[0].bot.target.kind); }
  console.log(err());
}
if (which === 'party') {
  game.debug.startParty(4); game.advance(.3); skipCard(); console.log(BB.H.phase, BB.players.length, err());
  for (let t = 0; t < 8; t++) { game.advance(1); console.log(t, BB.H.phase, BB.curSite.state, JSON.stringify(game.debug.snapshot().players.map(p => p.siteScore + '/' + p.shots))); }
}
if (which === 'leg') {
  game.debug.goto('hollow1'); game.advance(.1); skipCard();
  const c = BB.curSite, v = c.view, p = BB.players[0]; p.rx = v.W / 2; p.ry = v.hy + v.camH * v.f / 40;
  BB.devSpawn('buck'); const a = c.animals[c.animals.length - 1]; a.mode = 'stand'; a.linger = 99; game.advance(.05);
  const pr = BB.project(v, a.x, a.y, a.z); console.log('pr', pr && pr.map(x => Math.round(x * 10) / 10), 'occ?', BB.occluded(c, v, pr[0], pr[1] - 10, pr[3]), 'ground y', a.y, a.z);
  for (const zone of ['heart', 'leg', 'head', 'ham']) { game.debug.aimAt(0, a.id, zone); const cand = BB.pickShot(c, p.rx + p.sx, p.ry + p.sy); console.log(zone, 'ax', Math.round(p.rx), Math.round(p.ry), 'cands', cand.map(q => q.kind + ':' + (q.zone || '') + ':' + Math.round(q.D))); }
}
if (which === 'm') {
  const id = process.argv[3]; game.debug.goto(id); game.advance(.1); skipCard(); game.debug.bot(true, { skill: 'expert', cheat: true });
  for (let t = 0; t < 70; t += 3) { game.advance(3); const s = game.debug.snapshot(); console.log(t, 'kills', s.site.kills, 'esc', s.site.escaped, s.site.animals.map(a => a.id + a.sex[0] + ':' + a.mode + (a.dead ? 'X' : '') + '@' + Math.round(a.x) + ',' + Math.round(a.y)).join(' '), 'shots', s.players[0].shots); }
}
if (which === 'drift') {
  game.debug.goto('hollow1'); game.advance(.1); skipCard(); const p = BB.players[0];
  for (let i = 0; i < 6; i++) { game.advance(.2); console.log(Math.round(p.rx), Math.round(p.ry), p.aimMode, JSON.stringify(I.move()), I.padAim, I.pointer && I.pointer(), p.ramp); }
}
if (which === 'leg2') {
  game.debug.goto('hollow1'); game.advance(.1); skipCard(); const c = BB.curSite, v = c.view, p = BB.players[0];
  const near = () => { p.rx = v.W / 2; p.ry = v.hy + v.camH * v.f / 40; };
  near(); BB.devSpawn('buck'); let a = c.animals[c.animals.length - 1]; a.mode = 'stand'; a.linger = 99; game.advance(.05);
  game.debug.aimAt(0, a.id, 'heart'); game.debug.fire(0); game.advance(.1); console.log('dead1', a.dead, Math.round(p.rx), Math.round(p.ry));
  near(); BB.devSpawn('buck'); const b2 = c.animals[c.animals.length - 1]; b2.mode = 'stand'; b2.linger = 99; game.advance(.05);
  console.log('b2', b2.id, b2.x, b2.y, b2.mode, 'pr', BB.project(v, b2.x, b2.y, b2.z));
  game.debug.pump(0); game.advance(.4);
  console.log('b2 after', b2.x, b2.y, b2.mode, b2.escaped, b2.spookT, 'ap', game.debug.aimAt(0, b2.id, 'leg'), Math.round(p.rx), Math.round(p.ry));
}
if (which === 'range7') {
  game.debug.goto('range'); game.advance(.2); skipCard(); const c = BB.curSite, R = c.range, p = BB.players[0];
  R.station = 6; R.begin(); game.advance(.1);
  for (let t = 0; t < 40; t++) {
    game.advance(.25);
    for (const cr of c.critters) { const pr = BB.project(c.view, cr.x, cr.y, 0); const bx = BB.critterBox(cr, pr[0], pr[1], pr[2]); if (t % 8 === 0) console.log(t, cr.type, cr.def.motion, 'pop', cr.pop && cr.pop.toFixed(2), bx && [Math.round(bx.cx), Math.round(bx.cy), Math.round(bx.rx), Math.round(bx.ry)], 'dead', cr.dead, 'life', cr.life.toFixed(0));
      if (cr.type === 'squirrel' && bx && !cr.dead) { p.rx = bx.cx; p.ry = bx.cy; p.ax = p.rx; p.ay = p.ry; p.chambered = true; p.rackT = 0; p.lastShotT = -9; p.rounds = 5; console.log('pick', BB.pickShot(c, p.ax, p.ay).map(q => q.kind), 'occ', BB.occluded(c, c.view, p.ax, p.ay, pr[3]), 'D', pr[3]); BB.fireFor(p, c); console.log('fired at', cr.id, 'counts', JSON.stringify(R.counts), 'dead', cr.dead); } }
  }
  console.log(err());
}
if (which === 'cam') {
  game.debug.goto('bigmo'); game.advance(.1); skipCard(); game.debug.bot(true, { skill: 'expert', cheat: true });
  let seen = 0; for (let i = 0; i < 400; i++) { game.advance(.25); if (BB.H.cam) { seen++; if (seen < 4) console.log('cam', BB.H.cam.t.toFixed(2), 'ts', game.timeScale, 'mag', BB.curSite.view.mag.toFixed(2)); } }
  console.log('cam frames', seen, 'kills', BB.curSite.kills.length, 'phase', BB.H.phase, err());
}
