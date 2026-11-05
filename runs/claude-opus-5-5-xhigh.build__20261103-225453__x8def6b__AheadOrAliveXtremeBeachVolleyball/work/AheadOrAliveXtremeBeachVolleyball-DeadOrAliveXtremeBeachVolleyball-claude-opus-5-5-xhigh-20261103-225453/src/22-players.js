/* 22-players: the player entity (movement, jumps, dives), the timing judge and the human controller. Players can leave
 * the court lines but never cross the net plane. A press is judged against the planned contact time t*: PERFECT within
 * perfectWin, GREAT within greatWin, OK within okWin (each times the Timing assist), else a whiff. */
G.VB = G.VB || {};
const VB = G.VB;
VB.QUAL = { PERFECT: { rad: 4, spd: 1.12, rank: 3 }, GREAT: { rad: 10, spd: 1, rank: 2 }, OK: { rad: 20, spd: .85, rank: 1 }, STRETCH: { rad: 30, spd: .8, rank: 0 }, MISS: { rad: 60, spd: .6, rank: -1 } };
VB.QCOL = { PERFECT: '#ffd36a', GREAT: '#5ff0ff', OK: '#ffffff', STRETCH: '#c8c4d8', MISS: '#8a8a9a' };
VB.assist = () => G.ASSIST[G.setting('assist', 'Normal')] || 1;
VB.windows = (mul = VB.assist()) => ({ p: G.T.perfectWin * mul, g: G.T.greatWin * mul, o: G.T.okWin * mul });
/** the quality of a press err seconds from t* (inclusive boundaries) */
VB.judge = (err, mul) => { const w = VB.windows(mul), a = Math.abs(err) - 1e-9; return a <= w.p ? 'PERFECT' : a <= w.g ? 'GREAT' : a <= w.o ? 'OK' : 'MISS'; };
VB.lower = q => q === 'PERFECT' ? 'GREAT' : q === 'GREAT' ? 'OK' : q === 'OK' ? 'STRETCH' : 'MISS';
VB.stat = (p, k) => (p.statsBase[k] || 5);
VB.speed = p => G.T.runSpeed * (.86 + .03 * VB.stat(p, 'SPD')) * (p.ctl.kind === 'ai' ? G.T.aiSpeedMul : 1) * (p.speedMul || 1);
VB.reachR = p => G.T.reach + .4 * VB.stat(p, 'TEC');
VB.standReach = p => 44 * p.size / 1.25;
VB.jumpH = p => 10 + 1.0 * VB.stat(p, 'JMP');
VB.attackH = p => VB.standReach(p) + VB.jumpH(p);
VB.blockTopAt = (p, t) => p.block ? VB.standReach(p) + 2 + VB.blockZ(p, t) : VB.standReach(p);
VB.blockZ = (p, t) => {
  const b = p.block; if (!b) return 0; const u = t - b.t0, R = G.T.blockRise, h = VB.jumpH(p) * .85;
  if (u < 0) return 0; if (u < R) return h * E.ease.outQuad(u / R); if (u < R + .18) return h; if (u < R + .48) return h * (1 - E.ease.inQuad((u - R - .18) / .3)); return 0;
};
let PID = 0;
VB.makePlayer = (M, o) => {
  const c = G.CAST[o.cast] || G.CAST.rin;
  const rig = G.makeRig(o.cast, { suit: o.suit, acc: o.acc, kit: o.kit });
  const p = {
    id: o.id !== undefined ? o.id : PID++, side: o.side, slot: o.slot, cast: o.cast, name: o.name || c.name, rig, size: rig.o.size,
    x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: o.side ? Math.PI : 0,
    ctl: o.ctl || { kind: 'ai' }, act: 'ready', actT: 0, call: 'auto', callT: 0, lockT: 0, stats: G.newStats(),
    statsBase: Object.assign({ POW: 5, TEC: 5, SPD: 5, JMP: 5 }, c.stats || {}), skillBase: o.skill === undefined ? .5 : o.skill,
    jump: null, block: null, dive: null, bubble: null, react: 0, target: null, seat: o.seat, color: o.color || null, tag: o.tag || null, shades: (o.acc || []).some(a => G.ACCS[a] && G.ACCS[a].shades),
    pose: null, emote: null, emoteT: 0, mood: 'normal', rs: {}
  };
  return p;
};
/** move toward a world velocity with acceleration; keep to the own side of the net and inside the map */
VB.steer = (p, tvx, tvy, dt, acc = 900) => {
  p.vx = approach(p.vx, tvx, acc * dt); p.vy = approach(p.vy, tvy, acc * dt);
};
VB.integrate = (M, p, dt) => {
  const C = G.C;
  if (p.dive && p.dive.phase !== 'down') { /* the dive drives the body */ }
  p.x += p.vx * dt; p.y += p.vy * dt;
  const lim = C.NET_X + (p.side ? 6 : -6);
  if (p.side === 0 && p.x > lim) { p.x = lim; p.vx = Math.min(0, p.vx); }
  if (p.side === 1 && p.x < lim) { p.x = lim; p.vx = Math.max(0, p.vx); }
  p.x = clamp(p.x, 40, C.MAP_W * 16 - 40); p.y = clamp(p.y, 118, C.MAP_H * 16 - 30);
  // jumps: a spike's arc, a block's rise and hold, a jump serve's
  const t = M.now;
  if (p.jump) { const u = (t - p.jump.t0) / p.jump.dur; if (u >= 1 || u < -1) { if (u >= 1) { p.rig.land(.45); G.sfx('step_sand'); M.dust(p.x, p.y, 3); } p.jump = null; p.z = 0; } else p.z = u < 0 ? 0 : p.jump.h * 4 * u * (1 - u); }
  else if (p.block) { p.z = VB.blockZ(p, t); if (t - p.block.t0 > G.T.blockRise + .48) { p.block = null; p.z = 0; p.rig.land(.4); } }
  else p.z = 0;
};
/** start a jump whose peak lands at time peak (a spike's or a serve's) */
VB.jumpAt = (M, p, peak, rise = .38, h) => { p.jump = { t0: peak - rise, dur: rise * 2, h: h === undefined ? VB.jumpH(p) : h }; };

/* ---- the human controller: the stick (or keys) moves; play, shot, dive and call; the mouse aims ---- */
VB.humanInput = (M, p, dt) => {
  const I = p.ctl.input; if (!I) return { mv: [0, 0], play: false, shot: false, dive: false, call: false, aim: [0, 0] };
  const m = I.move(), d = M.view ? M.view.screenDirToGround(m[0], m[1]) : [m[0], m[1]], L = Math.hypot(d[0], d[1]);
  const out = { mv: L > 1 ? [d[0] / L, d[1] / L] : d, raw: m, play: I.pressed('play'), shot: I.pressed('shot'), dive: I.pressed('dive'), call: I.pressed('call'), view: I.map.view && I.pressed('view'), shotHeld: I.down('shot') };
  // aim: the stick's screen direction picks a zone; with the mouse last, the reticle's ground point
  out.aim = d;
  if (I.lastDevice === 'mouse' && G.game.mouseGround) { const g = G.game.mouseGround(); if (g) out.mouse = [g[0], g[1]]; }
  if (M.perfectPlayer || M.cpuControl) out.bot = true;
  return out;
};
/** the 9 zones of a side's half, from the attacking side's point of view */
VB.zone = (side, depth, lat) => {   // depth: 0 short, 1 mid, 2 deep; lat: -1, 0, 1 (y)
  const C = G.C, dir = side === 0 ? 1 : -1, xs = [C.NET_X + dir * 30, C.NET_X + dir * 72, side === 0 ? C.X1 - 18 : C.X0 + 18];
  return [xs[depth], C.CY + lat * 44];
};
/** the zone a stick direction asks for (dir: the attacking side's), or the mouse's ground point clamped inside */
VB.aimTarget = (side, aim, mouse) => {
  const C = G.C;
  if (mouse) { const own = side === 0 ? mouse[0] > C.NET_X + 8 : mouse[0] < C.NET_X - 8; if (own) return [clamp(mouse[0], C.X0 + 6, C.X1 - 6), clamp(mouse[1], C.Y0 + 6, C.Y1 - 6)]; }
  const fwd = (side === 0 ? 1 : -1) * aim[0], lat = Math.abs(aim[1]) > .35 ? Math.sign(aim[1]) : 0;
  const depth = fwd > .35 ? 0 : fwd < -.35 ? 2 : Math.hypot(aim[0], aim[1]) > .35 ? 1 : 2;
  return VB.zone(side, depth, lat);
};
