// Human control: which athlete each local player holds, switching (○, a click, auto-switch), and intents from the
// pad, the keyboard and the mouse, by context (passer, carrier, defender, receiver, kicker, after the whistle).
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, u = FF.u, F = FF.F, YD = 16, game = FF.game;
const { B1, B2, B3, B4, LB, RB } = FF.BITS;
const C = FF.control = { switchT: [0, 0, 0, 0], chord: [null, null, null, null], tagT: {}, hover: null };
/** the local players in a side: indexes into game.players */
const playersOf = (m, s) => (m.humans[s] || []).filter(p => typeof p === 'number' || (typeof p === 'string' && FF.net && FF.net.isHost && FF.net.isHost()));
const inputOf = p => typeof p === 'number' ? game.players[p] : FF.net.fakeInput(p);
C.inputOf = inputOf;
C.sideOf = (m, p) => (m.humans[0] || []).includes(p) ? 0 : (m.humans[1] || []).includes(p) ? 1 : -1;
const setCtl = (m, a, p) => { for (const o of m.all.concat(m.extra)) if (o.ctl === p) o.ctl = null; if (a) { if (a.ctl !== null && a.ctl !== p) return false; a.ctl = p; C.tagT[p] = 1.2; } return true; };
C.athleteOf = (m, p) => m.on.concat(m.extra).find(a => a.ctl === p) || null;
/** at the presnap: offense QB (or kicker, returner), co-op the second takes WR1; defense S then LB1 */
C.assignPresnap = m => {
  for (const a of m.all) if (typeof a.ctl === 'number') a.ctl = null;
  const oc = m.play.off, off = m.poss;
  for (const s of [0, 1]) {
    const ps = playersOf(m, s); if (!ps.length) continue;
    const S = m.bySlot[s]; let order;
    if (oc.type === 'kickoff') order = s === off ? ['K', 'S', 'CB'] : [m.returner ? m.returner.slot : 'WR1', 'RB', 'C'];
    else if (s === off) order = oc.formation === 'punt' ? ['K', 'WR1', 'WR2'] : oc.formation === 'fieldgoal' ? ['K', 'RB', 'WR2'] : ['QB', C.coopSlot || 'WR1', 'WR2', 'RB'];
    else order = oc.formation === 'punt' ? ['CB', 'LB1', 'S'] : ['S', 'LB1', 'CB', 'LB2'];
    ps.forEach((p, i) => { const a = S[order[i]] || m.unit[s][i]; if (a) setCtl(m, a, p); });
  }
};
/** the defense's human may move his defender before the snap (behind the line) */
C.presnapMoves = (m, dt) => {
  for (const p of playersOf(m, 1 - m.poss)) {
    const a = C.athleteOf(m, p), I = inputOf(p); if (!a || !I) continue;
    const mv = I.move(), d = game.view.screenDirToGround(mv[0], mv[1]), Do = m.dir(m.poss), sp = 70;   // (the defense lines up on the offense's far side of the ball)
    a.x += d[0] * sp * dt; a.y += d[1] * sp * dt;
    const minX = m.los + Do * 1.2 * YD; if ((a.x - minX) * Do < 0) a.x = minX;
    a.y = E.clamp(a.y, F.SIDE_T + 8, F.SIDE_B - 8); a.vx = d[0] * sp; a.vy = d[1] * sp;
    a.pose = Math.hypot(d[0], d[1]) > .1 ? 'run' : 'stance2';
    a.facing = Do > 0 ? Math.PI : 0;
    if (I.pressed('b2')) C.switchNearest(m, p, 1 - m.poss, { x: m.los, y: m.ballY });
  }
};
/** switch player p to the free athlete of side s nearest to point at */
C.switchNearest = (m, p, s, at, except) => {
  let best = null, bd = 1e9;
  for (const a of m.on) { if (a.side !== s || a.downT > 0 || (a.ctl !== null && a.ctl !== p) || a === except) continue; const d = Math.hypot(a.x - at.x, a.y - at.y); if (d < bd && a.ctl !== p) { bd = d; best = a; } }
  if (best) { setCtl(m, best, p); C.switchT[p] = .5; game.audio.sfx('menuMove'); }
  return best;
};
/** the screen position of a world point in the current view (the last frame's projection in a page, the view's own headless) */
C.screenOf = (x, y, z) => {
  if (FF.proj) return FF.proj(x, y, z);
  const v = game.view, c = FF.cam && FF.cam.pos ? FF.cam.pos : { x: F.MID_X, y: F.MID_Y, z: 0 }, p = v.p(x - c.x, y - c.y, z - (c.z || 0));
  return [game.W / 2 + p[0], game.H / 2 + p[1]];
};
/** the athlete under a screen point (the mouse), or null */
C.pickAt = (m, sx, sy) => {
  let best = null, bd = 1e9;
  for (const a of m.on) { const [x, y] = C.screenOf(a.x, a.y, a.z), z = game.zoom || 1, w = 10 * z, h = 38 * z; if (sx > x - w && sx < x + w && sy > y - h && sy < y + 4 * z) { const d = Math.abs(sx - x) + Math.abs(sy - (y - h / 2)); if (d < bd) { bd = d; best = a; } } }
  return best;
};
/** this step's intents for every human-held athlete; and who holds whom as the play goes */
C.update = (m, dt) => {
  for (const p in C.tagT) C.tagT[p] = Math.max(0, C.tagT[p] - dt);
  if (m.phase !== 'LIVE' && m.phase !== 'DEAD' && m.phase !== 'CELEBRATE' && m.phase !== 'PRESNAP') return;
  C.follow(m);
  const ptr = game.input.pointer(); C.hover = ptr && game.input.lastDevice === 'mouse' && m.phase !== 'CELEBRATE' ? C.pickAt(m, ptr[0], ptr[1]) : null;
  for (const s of [0, 1]) for (const p of playersOf(m, s)) {
    const I = inputOf(p); if (!I) continue;
    let a = C.athleteOf(m, p);
    if (C.switchT[p] > 0) C.switchT[p] -= dt;
    if (!a) continue;
    C.intentFor(m, a, I, p, dt);
  }
};
/** the ball moves: control follows it (a handoff, a throw's target, a catch, a turnover, a fumble) */
C.follow = m => {
  if (m.lockCtl) return;
  const b = m.ball, h = b.holder, auto = game.settings.autoSwitch;
  for (const s of [0, 1]) {
    const ps = playersOf(m, s); if (!ps.length) continue;
    const p0 = ps[0], cur = C.athleteOf(m, p0);
    if (h && h.side === s && h.ctl === null && m.phase === 'LIVE') {
      // the first human takes the ball; a co-op player with the ball keeps it
      const owner = ps.find(p => C.athleteOf(m, p) === h);
      if (owner === undefined) { const q = h.ctl === null ? p0 : null; if (q !== null) { const prev = C.athleteOf(m, q); setCtl(m, h, q); if (ps[1] !== undefined && prev && !C.athleteOf(m, ps[1])) setCtl(m, prev, ps[1]); } }
    }
    // a pass in the air: the offense's human follows his target; the defense's auto-switch to the defender nearest the landing point
    if (b.state === 'pass' && (b.type === 'lob' || b.type === 'bullet') && b.thrower) {
      if (b.thrower.side === s && b.target && b.target.ctl === null && cur === b.thrower) setCtl(m, b.target, p0);
      if (b.thrower.side !== s && auto) for (const p of ps) if (C.switchT[p] <= 0) { const a = C.athleteOf(m, p), L = b.to; if (a && Math.hypot(a.x - L.x, a.y - L.y) > 4 * YD) C.switchNearest(m, p, s, L); }
    }
    // a carrier past the line, a return: the defense's auto-switch to the best unheld defender
    if (h && h.side !== s && auto && m.phase === 'LIVE' && ((h.x - m.play.losX) * m.dir(h.side) > 0 || m.play.kicked)) for (const p of ps) if (C.switchT[p] <= 0) { const a = C.athleteOf(m, p); if (!a || a.downT > 0 || Math.hypot(a.x - h.x, a.y - h.y) > 9 * YD) C.switchNearest(m, p, s, h); }
    // a loose ball: the nearest
    if ((b.state === 'loose' || b.state === 'kickLoose') && auto) for (const p of ps) if (C.switchT[p] <= 0) { const a = C.athleteOf(m, p); if (!a || Math.hypot(a.x - b.x, a.y - b.y) > 6 * YD) C.switchNearest(m, p, s, b); }
    // a kick in the air: the receiving human takes the returner
    if (b.state === 'kick' && s !== m.poss) { const R = m.returnerFor(); if (R && R.ctl === null && cur !== R) setCtl(m, R, p0); }
  }
};
C.intentFor = (m, a, I, p, dt) => {
  const N = a.intent, b = m.ball, mv = I.move(), dir = game.view.screenDirToGround(mv[0], mv[1]), mag = Math.hypot(mv[0], mv[1]);
  const ai = { mx: N.mx, my: N.my, face: N.face };
  N.mx = dir[0] * Math.min(1, mag); N.my = dir[1] * Math.min(1, mag); N.turbo = I.down('turbo'); N.press = 0; N.held = 0; N.recv = -1; N.face = undefined; N.special = false; N.aimX = mv[0];
  const pr = k => I.pressed(k);
  // the kick meter (✕, Space or a click)
  if (m.phase === 'PRESNAP' && m.meterK && m.meterK.side === a.side && !m.meterK.done) { if (pr('b1') || (I.clicked && I.clicked() && game.input === I)) N.press |= B1; return; }
  if (m.phase === 'PRESNAP') { if (pr('b1') && a.side === m.poss) { N.press |= B1; I.consume && I.consume('b1'); } const c = game.input === I && I.clicked(); if (c && a.side === m.poss) { const t = C.pickAt(m, c[0], c[1]); if (t && (t.slot === 'QB' || t === a)) m.hikeNow = true; } return; }
  // a human QB with no stick input follows his drop (an assist); buttons stay his
  const passer = b.holder === a && m.canPass(a);
  if (passer && mag < .2 && m.phase === 'LIVE') { N.mx = ai.mx || 0; N.my = ai.my || 0; }
  if (m.phase === 'LIVE' && !b.holder && a.slot === 'QB' && a.side === m.poss && m.play.off.qb && m.play.off.qb.handoff && !m.play.handed && mag < .2) { N.mx = ai.mx || 0; N.my = ai.my || 0; }
  // after the whistle: a late hit, a dance
  if (m.phase === 'DEAD') { if (pr('b1')) m.lateHit(a); return; }
  if (m.phase === 'CELEBRATE') { if (b.holder === a && !a.danced && m.mode !== 'hub') { const d = pr('b2') ? 0 : pr('b3') ? 1 : pr('b4') ? 2 : -1; if (d >= 0) { a.dance = d; a.danced = true; } } return; }
  if (m.phase !== 'LIVE') return;
  // the boss special: L1 + R1 together (a single shoulder waits 0.1 s before it laterals)
  const ch = C.chord[p];
  if (pr('lb') || pr('rb')) { if (ch && m.t - ch.t < .1 && ch.k !== (pr('lb') ? 'lb' : 'rb')) { C.chord[p] = null; N.special = true; return; } C.chord[p] = { t: m.t, k: pr('lb') ? 'lb' : 'rb' }; }
  if (ch && m.t - ch.t >= .1) { C.chord[p] = null; if (b.holder === a) N.press |= LB; }
  if ((I.down('lb') && I.down('rb'))) { N.special = true; }
  if (passer) {
    // throw to a receiver: ✕ ○ □ (△ throws it away), or 1-4, or a click on him (Shift or R2: a Rocket Pass)
    let r = pr('b1') ? 0 : pr('b2') ? 1 : pr('b3') ? 2 : pr('b4') ? 3 : -1;
    if (r < 0) r = pr('r1') ? 0 : pr('r2') ? 1 : pr('r3') ? 2 : pr('r4') ? 3 : -1;
    const c = game.input === I && I.clicked(); if (r < 0 && c) { const t = C.pickAt(m, c[0], c[1]); const rc = m.receivers(a.side); if (t && rc.includes(t)) r = rc.indexOf(t); }
    if (r >= 0 && m.play.t > .2) N.recv = r;
    if (N.special && a.special === 'GOLDEN SPIRAL') { N.special = true; }
    return;
  }
  if (b.holder === a) {
    if (pr('b1')) N.press |= B1; if (pr('b2')) N.press |= B2; if (pr('b3')) N.press |= B3; if (pr('b4')) N.press |= B4;
    return;
  }
  // a punt in the air: ✕ calls for a fair catch
  if (b.state === 'kick' && b.kind === 'punt' && a === m.returnerFor() && pr('b1')) { a.fairCatch = true; game.audio.sfx('menuSelect'); return; }
  // defense: switch (○ or a click), tackle (✕; with turbo a Big Hit), strip / swim (□), jump (△)
  const def = b.holder ? b.holder.side !== a.side : b.thrower ? b.thrower.side !== a.side : a.side !== m.poss;
  if (def) {
    if (pr('b2')) { const at = b.state === 'pass' && b.to ? b.to : b; C.switchNearest(m, p, a.side, at, a); return; }
    const c = game.input === I && I.clicked(); if (c) { const t = C.pickAt(m, c[0], c[1]); if (t && t.side === a.side && t !== a) { setCtl(m, t, p); C.switchT[p] = .8; return; } }
  }
  if (pr('b1')) N.press |= B1; if (pr('b3')) N.press |= B3; if (pr('b4')) N.press |= B4;
  if (!def && pr('b2') && b.state !== 'pass') { /* offense without the ball: no switching */ }
};
/** what a player's buttons do now, for the prompt strip: [[action, word], ...] */
C.prompts = (m, p) => {
  const a = C.athleteOf(m, p); if (!m || !a) return [];
  const b = m.ball;
  if (m.phase === 'PRESNAP' && m.meterK && m.meterK.side === a.side) { const st = m.meterK.stage; return [['b1', st === 0 ? 'KICK' : st === 1 ? 'SET POWER' : 'SET AIM']].concat(st === 0 ? [['aim', 'AIM']] : []); }
  if (m.phase === 'PRESNAP') return a.side === m.poss ? [['b1', 'HIKE']] : [['move', 'MOVE'], ['b2', 'SWITCH']];
  if (m.phase === 'DEAD' && game.settings.lateHits && m.lateHitT > 0) return [['b1', 'LATE HIT']];
  if (m.phase === 'CELEBRATE' && b.holder === a) return [['b2', 'DANCE'], ['b3', 'ROLL'], ['b4', 'SPIN']];
  if (m.phase !== 'LIVE') return [];
  if (b.holder === a && m.canPass(a)) return [['recv', 'THROW'], ['turbo', 'ROCKET'], ['b4', 'AWAY']];
  if (b.holder === a) { const out = [['b3', 'SPIN'], ['b2', 'STIFF'], ['b4', 'HURDLE'], ['b1', m.inOwnEndZoneReturn(a) ? 'KNEEL' : 'DIVE'], ['turbo', 'TURBO']]; if (a.special && m.specialReady(a)) out.unshift(['chord', a.special]); return out; }
  if (b.state === 'pass' && b.thrower && b.thrower.side === a.side) return [['b4', 'JUMP'], ['b1', 'DIVE'], ['turbo', 'TURBO']];
  if (b.state === 'kick' && b.kind === 'punt' && a === m.returnerFor()) return [['b1', 'FAIR CATCH']];
  const out = [['b1', 'TACKLE'], ['turboB1', 'BIG HIT'], ['b2', 'SWITCH'], ['b4', 'JUMP'], ['b3', a.engaged ? 'SWIM' : 'STRIP']];
  if (a.special && m.specialReady(a)) out.unshift(['chord', a.special]);
  return out;
};
})();
