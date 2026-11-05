// WIRETAP gameplay completion: plays The Case from New Case to the credits in ONE chain (state flows mission to
// mission), finishing every mission through its mechanics, the functions the controls call: interactables' act()
// (E / click), the camera's shutter (Cam.shoot with the reticle on someone), Box.pick (the diamond), Wire.minimize /
// log / voiceId, Cipher.turn (L1/R1), menu onSelect (✕ / click), TeeShift's orders, pager and dialer, and bots that
// move Dana (chase, tail). Never Director.done on a beat it is testing. Then Path B from the finale choice.
// node tests/complete.mjs   (one line per beat; exit 1 on a failure)
import vm from 'node:vm';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const here = new URL('.', import.meta.url);
const ctx = { console, setTimeout, clearTimeout }; ctx.window = ctx; ctx.addEventListener = () => {}; ctx.location = { hash: '', search: '', pathname: '/wiretap-complete' };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../engine/my-3d2dge.js', here), 'utf8'), ctx);
vm.runInContext(readFileSync(new URL('.game.js', here), 'utf8'), ctx);
const W = ctx.__wiretap, game = W.game, I = game.input, E = ctx.My3D2dge;
let failed = 0; const t0 = Date.now();
const check = (what, ok, detail = '') => { console.log((ok ? 'ok   ' : 'FAIL ') + what + (ok ? '' : ': ' + String(detail).slice(0, 300)) + '  [' + Math.round((Date.now() - t0) / 1000) + 's]'); if (!ok) failed++; };
const S = () => W.STATE(), F = () => S().flags, M = () => W.Mission.M, top = () => W.UI.top(), sel = id => top() && top().spec.onSelect(id);
const step = (s = .25) => game.advance(s);
const scene = () => game.sceneName;
game.advance(.5);
function photo(a, d = 46) {   // find a spot with a clear view of someone (in front if possible), raise the camera on them, hold focus, shoot
  const P = M().P, f = a.facing || 0, map = W.World.cur || W.World.map;
  let spot = null;
  for (const off of [0, .6, -.6, 1.2, -1.2, 1.9, -1.9, Math.PI]) for (const dd of [d, d + 30, d - 16]) {
    const w = W.World.walkableNear(a.x + Math.cos(f + off) * dd, a.y + Math.sin(f + off) * dd); const probe = { x: w.x, y: w.y, z: 0 };
    if (!spot && Math.hypot(w.x - a.x, w.y - a.y) > 18 && map.sight(probe, a)) spot = w;
  }
  spot = spot || W.World.walkableNear(a.x + Math.cos(f) * d, a.y + Math.sin(f) * d);
  P.place(spot.x, spot.y); P.facing = Math.atan2(a.y - P.y, a.x - P.x); W.Cam.on = true; W.Cam.target = a; W.Cam.focus = 1;
  return W.Cam.shoot(P, M().clock);
}
/** steer Dana with the direction actions, the way the stick or WASD would (screen directions from a world one) */
function steer(dx, dy, run) {
  const v = game.view, a = v.screenDirToGround(1, 0), c = v.screenDirToGround(0, 1), det = a[0] * c[1] - a[1] * c[0];
  const sx = (dx * c[1] - dy * c[0]) / det, sy = (a[0] * dy - a[1] * dx) / det, l = Math.hypot(sx, sy) || 1;
  I.hold('right', sx / l > .38); I.hold('left', sx / l < -.38); I.hold('down', sy / l > .38); I.hold('up', sy / l < -.38); I.hold('sprint', !!run);
}
const unsteer = () => { for (const k of ['right', 'left', 'down', 'up', 'sprint']) I.hold(k, false); };
const int = id => M().ints.find(i => i.id === id);
const actInt = id => { const i = int(id); if (i && i.when()) { i.act(M()); return true; } return false; };
/* ---- strategies per beat: each returns when its beat is done or it runs out of time ---- */
function untilNext(maxS, fn) { const b = S().beat; let t = 0; while (S().beat === b && t < maxS) { if (fn) fn(t); step(); t += .25; } return S().beat !== b; }
function annexRun(order, picks = {}) {
  return untilNext(90, t => {
    if (scene() !== 'annex' || W.Talk.busy) return; const tp = top();
    if (tp) { const html = tp.spec.html ? tp.spec.html() : ''; const want = Object.values(picks).find(k => html.includes('data-f="' + k + '"')); if (want) { sel(want); return; } if (tp.spec.onBack) tp.spec.onBack(); else W.UI.close(tp, true); return; }
    const b = W.Annex.b; const next = order.find(st => b.tasks.some(x => x.at === st && W.Annex.ready(x)));
    if (next && (t * 4) % 4 === 0) game.scene.station(next);
  });
}
function boardPins() {   // the Board: pin every card where the evidence allows (each pin is the same call a ✕/click makes)
  for (const tier of W.BOARD || []) for (const sl of tier.slots) for (const c of W.Board.cards()) if (W.Board.check(sl, c) === true && !S().board.pins[sl.id]) W.Board.pin(sl.id, c);
}
function teeNight(opts = {}) {
  const m = M(); let paged = 0, last = -99, counted = false, reopened = 0;
  const ok = untilNext(420, t => {
    const tp = top(), sim = m.sim;
    if (tp && tp.id === 'count') { counted = counted || { taken: sim.L.taken, target: W.TeeShift.target }; sel('ok'); return; }
    if (tp && tp.id === 'dial') { if (!tp.dialed) { tp.dialed = true; for (const d of '5550174') sel('d:' + d); } return; }   // dial once; the call connects by itself
    if (tp) { const html = tp.spec.html ? tp.spec.html() : '', ids = [...html.matchAll(/data-f="([^"]+)"/g)].map(x => x[1]); const want = (opts.pick && ids.includes(opts.pick)) ? opts.pick : ids[0]; if (want && tp.id !== 'pager') sel(want); if (top() === tp) W.UI.close(tp, true); return; }
    if (W.Talk.busy) return;
    // an active Tee: re-up early through a payphone, answer the callback, reopen when the patrol is gone, wake Pigeon
    if (sim.vials < 60 && t - last > 25 && !sim.reupPending) { last = t; if (opts.dial && !paged) { W.TeeShift.payphone(opts.dial); paged++; } else { W.TeeShift.sendPage(opts.phone || 'P2', '44'); paged++; } }
    if (W.TeeShift.ringing) { const k = W.TeeShift.ringing, pp = W.World.props.find(p => p.tag === k); m.P.place(pp.x, pp.y + 10); W.TeeShift.payphone(k); }
    if (!sim.open && !sim.cars.some(c => c.police && sim.sees(c)) && (t * 4) % 8 === 0) { W.TeeShift.order('open'); reopened++; }
    const pg = sim.crew.find(a => a.crewId === 'pigeon'); if (pg && pg.asleep) { m.P.place(pg.x - 12, pg.y + 8); W.TeeShift.context(pg); }
    for (const a of m.extras) if (a.isCop && !a.burned && !a.hidden) { a.revealed = true; W.TeeShift.callOut(a); }
    if (opts.court && !m.flags.handout) m.P.place(18 * 16, 48.6 * 16);
  });
  return { ok, counted, paged, reopened };
}
function wireSession() {
  let decoded = 0, logged0 = S().stats.logged;
  const ok = untilNext(700, t => {
    if (scene() !== 'stage') return; const Wr = W.Wire, tp = top();
    if (tp && tp.id === 'notebook') { sel('place:gas'); return; }
    if (tp && tp.id === 'cipher') { for (let k = 0; k < 4 && !W.Cipher_solved(); k++) W.Cipher.turn(1); W.UI.close(tp, true); return; }
    if (tp && tp.id !== 'wire') { const ids = (tp.spec.html ? tp.spec.html() : '').match(/data-f="([^"]+)"/g) || []; const sp = Wr.cur && Wr.cur.speaker; const want = ids.find(x => x.includes('"' + sp + '"')); sel(want ? sp : (ids[0] || '').slice(8, -1)); if (top() === tp) W.UI.close(tp, true); return; }
    if (!Wr.s) return;
    if (Wr.over) { Wr.finish(); return; }
    if (W.Talk.busy) return;
    const c = Wr.cur; I.hold('uiFast', !c);
    if (!c) return;
    if (c.type === 'page') { if (!W.Cipher.solved(c.page)) { Wr.decode(c.page); decoded++; } return; }
    if (c.type === 'N' && !c.min && c.t > .5) Wr.minimize();
    if (c.type === 'T' && !c.min && c.li < c.turnAt && c.t > .5) Wr.minimize();
    if (c.type === 'T' && c.min && c.minCd <= 0 && !(c.spot > 0)) Wr.minimize();   // spot-check
    if (c.typer && c.keys && c.keys.includes(c.li) && !(c.logged || []).includes(c.li) && c.typer.i > 3 && !(c.min && !(c.spot > 0))) Wr.log();
    if (c.typer && c.speaker && !Object.values(S().wire.ids).includes(c.speaker) && W.PEOPLE[c.speaker] && W.PEOPLE[c.speaker].rig && c.typer.i > 6 && !c.idTried) { c.idTried = true; S().wire.voiceprints.push(c.speaker); Wr.voiceId(); }
  });
  I.hold('uiFast', false);
  return { ok, decoded, logged: S().stats.logged - logged0, legal: S().meters.legal };
}
function boxSession(kitchen) {
  let picks = 0;
  const ok = untilNext(240, t => {
    const B = W.Box, tp = top(); if (!B.s && !tp) return;
    if (tp && tp.id !== 'box') { const html = tp.spec.html ? tp.spec.html() : ''; const want = ['pager', 'package', 'vacant', 'tee'].find(k => html.includes('data-f="' + k + '"')); sel(want || (html.match(/data-f="([^"]+)"/) || [])[1]); if (top() === tp) W.UI.close(tp, true); return; }
    if (B.st.over) { if (!B.busy()) B.finish(); return; }
    if (B.busy()) { if (B.typer) B.typer.finish(); return; }
    picks++;
    if (kitchen) { const s = B.st; B.pick(s.used.top ? (s.used.left ? 'bottom' : 'left') : 'top'); s.used.top = true; if (picks > 1) s.used.left = true; return; }
    const s = B.st; if (B.canFlip()) B.pick('bottom'); else if (!s.used.pager) B.pick('top'); else if (s.lastLean) B.pick('bottom'); else if (picks === 3) B.pick('left'); else if (s.fear < 55) B.pick('right'); else B.pick('bottom');
  });
  return { ok, picks };
}
/** a tail the way a player does it: walk where he walked, about 90 behind him (his own trail keeps him in sight round
    corners and through the vacant), run only when he's pulling away, and keep moving when he stops (pace along his trail,
    never stand and mirror him). No suspicion edits, no teleports. Retry screens are answered with Try again. */
function followTail(m, maxS, after, tailOf = () => m.tail) {
  let crumbs = null, kk = 0, lastI = 0, pace = 0;
  return untilNext(maxS, t => {
    const tp = top(); if (tp) { sel('retry'); if (top() === tp) W.UI.close(tp, true); crumbs = null; return; }
    if (W.Talk.busy) return; const tl = tailOf(); if (!tl) return; const P = m.P, a = tl.a;
    if (!tl.done) {
      if (!crumbs || tl.i < lastI) { crumbs = [{ x: a.x, y: a.y }]; kk = 0; } lastI = tl.i;   // a retry put him back at the checkpoint
      const lc = crumbs[crumbs.length - 1]; if (Math.hypot(a.x - lc.x, a.y - lc.y) > 6) crumbs.push({ x: a.x, y: a.y });
      let k = crumbs.length - 1; while (k > 0 && Math.hypot(crumbs[k].x - a.x, crumbs[k].y - a.y) < 90) k--; kk = Math.max(kk, k);
      const c = crumbs[kk], d = tl.dist;
      if (Math.hypot(c.x - P.x, c.y - P.y) > 8) P.goTo(c.x, c.y, d > 170 ? 85 : 58);
      else { pace = (pace + 1) % 16; const b = crumbs[Math.max(0, kk - 3)]; P.goTo(pace < 8 ? b.x : c.x, pace < 8 ? b.y : c.y, 30); }
    } else if (after) after(t);
  });
}
/** read someone through the camera: walk to a spot that sees them, hold Watch (the camera's own 3 s read does the rest) */
function readThrough(a, d = 80) {
  const P = M().P, map = W.World.cur || W.World.map;
  if (Math.hypot(a.x - P.x, a.y - P.y) > d + 20 || !map.sight(P, a)) {
    let spot = null; for (const off of [0, .7, -.7, 1.4, -1.4, Math.PI]) { const w = W.World.walkableNear(a.x + Math.cos(a.facing + off) * d, a.y + Math.sin(a.facing + off) * d); if (!spot && map.sight({ x: w.x, y: w.y, z: 0 }, a)) spot = w; }
    spot = spot || W.World.walkableNear(a.x, a.y + d); I.hold('watch', false); P.goTo(spot.x, spot.y, 58); return;
  }
  P.stop(); I.hold('watch', true); W.Cam.target = a;   // headless has no draw pass to pick the subject under the reticle
}
const STRAT = {
  'e1.cold': () => untilNext(60, t => { for (const id of ['dukes', 'lou', 'odessa']) if (!M().flags.talked[id]) { actInt('t:' + id); break; } actInt('cards'); }),
  'e1.photos': () => untilNext(240, t => {
    const m = M(); if (!m || !m.sim || W.Talk.busy || top()) { if (top()) W.UI.close(top(), true); return; }
    for (const id of ['tee', 'rook', 'corey', 'pigeon']) if (!S().facts.includes('face:' + id)) { const a = m.ppl[id]; if (a) { photo(a, a.roof ? 60 : 46); return; } }
    for (const a of m.sim.crew) if (W.readableRole(a) && S().facts.filter(f => f.startsWith('obs:')).length < 2) W.onReadRole(m, a);
    if (!F().pocketsMet) { actInt('pockets'); return; }
    if (!S().evidence.some(e => e.kind === 'act')) { const a = m.sim.all().find(x => x.act && x.person && ['sale-money', 'sale-product', 'stash-access', 'payphone', 'count-handoff'].includes(x.act.kind)); if (a) photo(a, 40); }
    actInt('chevyDone');
  }),
  'e1.board': () => annexRun(['board', 'stairs'], {}),
  'e2.payphones': () => untilNext(180, t => { if (W.Talk.busy) return; for (const k of ['P1', 'P2', 'P3']) if (!M().flags.read[k] && !M().reading) { const i = int('read:' + k); M().P.place(i.x, i.y); actInt('read:' + k); return; } const a = Object.values(M().ppl).find(x => x.act && x.act.kind === 'payphone'); if (a) photo(a, 40); }),
  'e2.chase': () => { const m = M(), P = m.P, r = m.ppl.corey; return untilNext(150, t => {
    const ch = m.chase; if (top()) { sel('retry'); return; }
    if (ch.state === 'run') {   // chase where he's going: his next node when he's far, him when he's close; sprint in bursts
      const d = Math.hypot(r.x - P.x, r.y - P.y), g = d > 70 && r.goal ? r.goal : r, dg = Math.hypot(g.x - P.x, g.y - P.y) || 1;
      const dir = dg < 60 ? [(g.x - P.x) / dg, (g.y - P.y) / dg] : W.Flow.dir(P, g.x, g.y); steer(dir[0], dir[1], true); if (ch.canTackle()) I.tap('interact'); }
    else if (ch.state === 'down') { unsteer(); I.hold('interact', true); }
    else { unsteer(); I.hold('interact', false); if (ch.ditched && !ch.pkgFound && !ch.ditched.lost && !ch.searched[ch.ditched.id] && !ch.searching) { const d = ch.ditched; P.place(16 * (d.x - .5) + 8, 16 * (d.y - .5) + 8); actInt('ditch:' + d.id); } else if (!ch.searching) actInt('takeIn'); }
  }); },
  'e2.box': () => boxSession(false).ok,
  'e2.paper': () => { let done = untilNext(120, t => {
    if (scene() !== 'annex' || W.Talk.busy) return; const tp = top();
    if (tp && tp.id === 'cipher') { for (const id of ['m1', 'm2', 'm3', 'm4', 'm5']) { W.Cipher.sel = id; for (let k = 0; k < 4 && !W.Cipher.solved(id); k++) W.Cipher.turn(1); } tp.spec.onBack(); return; }
    if (tp && tp.id === 'affidavit') { const P = W.Paper; for (const k of ['P1', 'P2', 'PG']) for (let n = 0; n < 3; n++) { if (!P.A.lines[k] || P.A.lines[k].length >= 3) break; P.picker(k); const c = top(); const html = c.spec.html(); const cards = [...html.matchAll(/data-f="([^"]+)"><b>([^<]*)<\/b>/g)].map(x => ({ id: x[1], lab: x[2] })); if (!cards.length || cards[0].id === 'none') { c.spec.onSelect('none'); break; } const best = cards.find(x => x.lab.includes('DIRECT')) || cards.sort((x, y) => parseInt(y.lab) - parseInt(x.lab))[0]; c.spec.onSelect(best.id); } P.select('nec:surveil'); P.select('submit'); return; }
    if (tp) { W.UI.close(tp, true); return; }
    const b = W.Annex.b, next = ['evidence', 'desk', 'stairs'].find(st => b.tasks.some(x => x.at === st && W.Annex.ready(x))); if (next && (t * 4) % 4 === 0) game.scene.station(next);
  }); return done; },
  'e2.paper2': () => STRAT['e2.paper'](),
  'e2.redo': () => untilNext(160, t => { const a = Object.values(M().ppl).find(x => x.act && x.act.kind === 'payphone'); if (a) photo(a, 40); }),
  'e2.chambers': () => untilNext(60),
  'e3.wire1': () => wireSession().ok, 'e3.wire2': () => wireSession().ok, 'e4.wire3': () => wireSession().ok,
  'e3.van': () => { let cd = 0; return untilNext(260, t => {   // from the parked van: raise the long lens on a subject in range, let focus settle, shoot once every 2 s
    const m = M(), tp = top(); if (tp) { sel('V2'); if (top() === tp) W.UI.close(tp, true); return; } if (W.Talk.busy) return;
    cd -= .25; const lens = (a, need) => { if (cd > 0 || W.Cam.film < 3 || !need) return; if (Math.hypot(a.x - m.P.x, a.y - m.P.y) > W.Cam.range - 8) return; I.hold('watch', true); if (W.Cam.target !== a) { W.Cam.target = a; W.Cam.focus = 0; } if (W.Cam.focus >= 1) { I.tap('photo'); cd = 2; } };
    if (m.truck && !S().facts.includes('plate:harstad')) { const c = m.photoCands()[0]; if (c) lens(c, true); return; }
    const d = m.ppl.dale; if (d && d.act && d.act.kind === 'reup-handoff') { lens(d, !S().facts.includes('act:dale:reup-handoff') && !S().facts.includes('act:tavon:reup-handoff')); return; }
    const sd = m.ppl.sunday; if (sd && sd.act && sd.act.kind === 'robbery') { lens(sd, !S().evidence.some(e => e.act === 'robbery')); return; }
    I.hold('watch', false);
  }); },
  'e3.i3': () => teeNight({}).ok, 'e1.i1': () => teeNight({}).ok, 'e2.i2': () => teeNight({ pick: 'trashGate', dial: 'P1' }).ok, 'e4.i4': () => teeNight({ court: true }).ok,
  'e4.tail': () => { const r = followTail(M(), 400, t => { if (!S().facts.includes('obs:burners')) readThrough(M().ppl.tee); }); I.hold('watch', false); return r; },
  'e4.trash': () => untilNext(160, t => {   // crouched in the dark alley, search only when Moe's bike is gone and nobody's looking, then walk out
    const m = M(), tp = top(); if (tp) { sel('retry'); return; } if (m.searching || W.Talk.busy) return; const P = m.P; P.crouch = true;
    const moe = m.extras.find(a => a.person === 'moe'), clear = moe.hidden && moe.lap < 34, lv = Math.max(0, ...m.observers.map(o => o.minds[P.id] ? o.minds[P.id].level : 0));
    if (!F().serials) { const i = m.ints.find(x => x.id.startsWith('bag') && x.when()); if (i) { if (Math.hypot(i.x - P.x, i.y + 6 - P.y) > 6) P.goTo(i.x, i.y + 6, 34); else if (clear && lv < .25) i.act(m); else P.stop(); } }
    else P.goTo(33 * 16, 20.6 * 16, 34); }),
  'e4.kitchen': () => boxSession(true).ok,
  'e5.rescue': () => { const r = untilNext(70, t => { const P = M().P, tx = 28.5 * 16, ty = 36.3 * 16, d = Math.hypot(tx - P.x, ty - P.y); if (d > 12) { const dir = d < 40 ? [(tx - P.x) / d, (ty - P.y) / d] : W.Flow.dir(P, tx, ty); steer(dir[0], dir[1], true); } else unsteer(); }); unsteer(); return r; },   // run there on the stick, against the clock
  'e5.raid': () => untilNext(150, t => { const m = M(), tp = top(); if (tp) { sel('both'); if (top() === tp) W.UI.close(tp, true); return; } if (W.Talk.busy) return; const R = m.raid;
    if (R.state === 'stack') { const d = R.breachDoor(); m.P.place(d.x + 10, d.y); actInt('breach'); }
    else if (R.state === 'live') { if (R.rookT > 0) R.hands(); if (m.ppl.moe && !R.res.moe) m.P.place(m.ppl.moe.x + 6, m.ppl.moe.y); else if (!m.flags.paper) { m.P.place(m.ppl.tee.x + 8, m.ppl.tee.y); actInt('paper'); } }
    else if (R.state === 'search') { const s = W.RAID_SPOTS.find(q => !R.searched[q.id]); if (s && !m.P.locked) { m.P.place(s.x * 16, s.y * 16 + 4); actInt('spot:' + s.id); } } }),
  'e5.count': () => { const m = M(); const r = followTail(m, 320, t => { const tp = top(); if (tp) { sel('retry'); return; } if (W.Talk.busy) return;
    if (!m.flags.roof) { const i = int('roof'); if (Math.hypot(i.x - m.P.x, i.y - m.P.y) > 14) m.P.goTo(i.x, i.y + 6, 85); else actInt('roof'); return; }
    const R = m.room; R.easyAt = [200, 120]; m.ctl.botAim = () => [200, 120];
    if (R.open && R.focus >= 1 && !F().easyPhoto && (t * 4) % 2 === 0) I.tap('photo'); }); return r; }
};
for (const id of ['e1.card', 'e2.card', 'e3.card', 'e4.card', 'e5.card']) STRAT[id] = () => untilNext(12);
for (const id of ['e1.car', 'e2.car', 'e3.car', 'e4.car']) STRAT[id] = () => untilNext(40);
for (const id of ['e3.rook', 'e3.easy', 'e5.press', 'e5.i5', 'e5.dawn']) STRAT[id] = () => untilNext(60);
STRAT['e1.brief'] = () => annexRun(['evidence', 'navarre', 'stairs'], { choice: 'van' });
STRAT['e2.brief'] = () => annexRun(['navarre', 'stairs'], { choice: 'pockets' });
STRAT['e3.up'] = () => annexRun(['hal', 'wire']);
STRAT['e3.major'] = () => annexRun(['navarre', 'board', 'wire'], { choice: 'hold' });
STRAT['e4.quiet'] = () => annexRun(['navarre', 'desk', 'stairs'], { choice: 'book' });
STRAT['e4.numbers'] = () => annexRun(['ren', 'board', 'wire']);
STRAT['e5.two'] = () => annexRun(['navarre', 'stairs'], { choice: W.__path || 'A' });
STRAT['e5.after'] = () => annexRun(['stairs']);
STRAT['e5.montage'] = () => untilNext(140);
// the chain
W.Globals.choose = null; ctx.__t = { W };
function play(label, until) {
  let guard = 0;
  while (guard++ < 70) {
    const b = S().beat; if (b === until) return true;
    const fn = STRAT[b]; if (!fn) { check(label + ' ' + b + ': has a strategy', false, 'none'); return false; }
    const BB = W.BEATS[b], want = { field: 'field', annex: 'annex', stage: 'stage', car: 'car', card: 'card', montage: 'montage', credits: 'credits' }[BB.kind];
    for (let w = 0; w < 40 && !(scene() === want && (BB.kind !== 'field' || (M() && M().spec.id === BB.ref))); w++) step(.25);   // the beat's scene is up
    if (b === 'e1.board' || b === 'e2.box' || b === 'e4.kitchen' || b === 'e2.paper' || b === 'e2.paper2' || b === 'e3.major' || b === 'e4.numbers') boardPins();
    const before = { case: S().meters.case, legal: S().meters.legal }; let ok = false; try { ok = fn(); } catch (e) { check(label + ' ' + b, false, e.stack); }
    const errs = game.errors.length;
    const info = b === 'e1.photos' ? ' faces ' + ['tee', 'rook', 'corey', 'pigeon'].filter(p => S().facts.includes('face:' + p)).length + '/4, reads ' + S().facts.filter(f => f.startsWith('obs:')).length : b.includes('wire') ? ' logged ' + S().stats.logged + ', legal ' + S().meters.legal + ', pages ' + Object.keys(S().cipher.decoded).length : b.includes('.i') && b.length === 5 ? ' count ' + money(S().crew.count) : b === 'e2.box' ? ' facts ' + ['tee-lieutenant', 'code', 'stash'].filter(f => S().facts.includes('stmt:corey:' + f)).length + '/3, CI ' + F().coreyCI : b === 'e2.chambers' ? ' signed ' + JSON.stringify((S().affidavit || {}).signed) + ' wire ' + F().wireUp : b === 'e4.kitchen' ? ' trust ' + F().pigeonTrust : b === 'e3.van' ? ' plate ' + S().facts.includes('plate:harstad') + ', dilemma ' + F().dilemma + ', shots ' + S().photos.filter(p => p.ep === 3 && ['harstad', 'dale', 'sunday', 'tavon'].includes(p.subject)).map(p => p.subject + ':' + p.stars).join(' ') : b === 'e5.count' ? ' easyPhoto ' + F().easyPhoto : '';
    check(label + ' ' + b + ' completed through play -> ' + S().beat + info, ok && game.errors.length === errs, ok ? game.errors.slice(errs).map(e => e.where + ': ' + e.message).join(' | ') : 'still in ' + b + ' (scene ' + scene() + ', ui ' + (top() && top().id) + ', obj ' + (M() && M().obj ? (M().obj.find(o => !o.ok) || {}).text : '') + ')');
    if (!ok) { W.UI.closeAll(); W.Director.done({ signed: ['P1'] }); step(1); }
  }
  return S().beat === until;
}
const money = n => '$' + Math.round(n || 0);
W.Director.newGame(); step(1.5);
let snapB = null;
const origGo = W.Director.go.bind(W.Director);
const SAVES = process.env.WIRETAP_SAVES;   // optional: write the chain's state at a few beats as saves for tests/play2.py to load
if (SAVES) mkdirSync(SAVES, { recursive: true });
W.Director.go = (id, o) => {
  if (id === 'e5.two' && !snapB) snapB = JSON.stringify(S());
  if (SAVES && W.__path === 'A' && ['e2.paper', 'e3.wire2', 'e4.numbers'].includes(id)) { const st = JSON.parse(JSON.stringify(S())); st.beat = id; writeFileSync(SAVES + '/' + id + '.json', JSON.stringify(st)); }
  return origGo(id, o);
};
W.__path = 'A';
const reachedA = play('A', 'e5.credits');
check('Path A: The Case played from New Case to the credits', reachedA, S().beat);
if (snapB) { W.__path = 'B'; ctx.__wiretap.Globals.choose = null; const st = JSON.parse(snapB); console.log('  (Path B from the same save: Brass ' + st.meters.brass + ', Corey CI ' + !!st.flags.coreyCI + ', exposed ' + !!st.flags.coreyExposed + ', Pigeon trust ' + st.flags.pigeonTrust + ')'); W.UI.closeAll(); W.Director.go = origGo; ctx.__wiretap.game.debug.state; Object.assign(S(), st); W.Director.go('e5.two', { noSave: true }); step(1.5); const reachedB = play('B', 'e5.credits'); check('Path B: from the finale choice to the credits (path ' + F().path + ')', reachedB && F().path === 'B', S().beat + ' path ' + F().path); }
check('no engine errors in the whole chain', game.errors.length === 0, game.errors.slice(0, 5).map(e => e.where + ': ' + e.message).join(' | '));
console.log(failed ? failed + ' check(s) failed' : 'all checks passed');
process.exit(failed ? 1 : 0);
