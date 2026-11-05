// The bot: plays the real sim through intents. Used by attract mode (it cheats freely) and by the scripted playthrough in tests.
const bot = S7.bot = { idx: 0, t: 0, v: null, route: [], talkT: 0, active: false, aimT: 0 };
const sm = S7.sim, sx = S7.st;
// the vignettes the attract mode loops through: each one is a slice of the demo
bot.VIGNETTES = [
  { id: 'lobby', area: '00A', node: 'start', time: 46, route: ['j2', 'j4'], flags: { keys: ['servicekey'], pins: ['pin1'], personas: ['rurik'] }, openGates: true },
  { id: 'rooms', area: 'room7', node: 'c', time: 18, route: ['ward', 'bench', 'c'], flags: {}, personas: ['rurik'] },
  { id: 'grau', area: '00C', node: 'n0', time: 50, route: [], boss: 'grau', personas: ['gustav'], bossHp: .28 },
  { id: 'village', area: '01A', node: 'start', time: 46, route: ['v1', 'v4', 'v5'], flags: { keys: ['tbar'] }, openGates: true, personas: ['jodl'] },
  { id: 'blackrun', area: '01C', node: 'base', time: 52, route: [], ride: true, personas: ['anselma'] },
  { id: 'king', area: '01F', node: 'f0', time: 52, route: [], boss: 'king', personas: ['baron'], bossHp: .26 }
];
bot.setup = function (idx) {
  const v = bot.VIGNETTES[idx % bot.VIGNETTES.length]; bot.v = v; bot.idx = idx; bot.t = 0; bot.talkT = 0; bot.route = (v.route || []).slice(); bot.fireT = 0; bot.stall = 0;
  S7.newState({ difficulty: 'normal' });
  for (const id of S7.ROSTER) { sx.roster[id].unlocked = true; }
  Object.assign(sx.cheats, { god: true, infRed: true, infAmmo: true });
  sx.red = 120; sx.rime = 8; sx.persona = (v.personas && v.personas[0]) || 'rurik';
  if (v.flags) { for (const k of v.flags.keys || []) sx.items[k] = 1; for (const p of v.flags.pins || []) sx.pins.push(p); }
  if (v.area !== 'room7') { sx.bosses.grau = v.id !== 'grau' && v.id !== 'lobby' && v.id !== 'rooms'; }
  sm.loadArea(v.area, v.node);
  if (v.openGates) { const A = S7.graph().A; for (const g in (A.gates || {})) sx.gates[A.id + ':' + g] = true; }
  if (v.boss) { sm.startBoss(v.boss); sx.boss.hp = sx.boss.hpMax = sx.boss.hpMax * (v.bossHp || 1); }
  if (v.ride) { sx.flags.ride = true; }
  sx.mode = ['rail', 'junction', 'ski', 'lift'].includes(sx.mode) ? sx.mode : 'rail';
  sx.done = sx.done || {};
  bot.active = true; sx.dossier.push('d_seen');
};
const blank = S7.noIntent;
function dists(goal) {   // shortest distances (metres) from every node to the goal
  const G = S7.graph(), d = { [goal]: 0 }, q = [goal];
  while (q.length) { q.sort((a, b) => d[a] - d[b]); const n = q.shift(); for (const e of G.nodes[n].edges) { const m = e.a === n ? e.b : e.a, nd = d[n] + e.len; if (d[m] === undefined || nd < d[m] - 1e-6) { d[m] = nd; q.push(m); } } }
  return d;
}
function pathTo(from, to) {   // the first edge to take from `from` toward `to`
  const G = S7.graph(), d = dists(to); if (d[from] === undefined) return null; let best = null, bv = 1e9;
  for (const e of G.nodes[from].edges) { const m = e.a === from ? e.b : e.a; const v = (d[m] === undefined ? 1e9 : d[m]) + e.len; if (v < bv) { bv = v; best = { e, n: m }; } }
  return best;
}
function aimAt(I, tx, ty, tz, rate = 3) {
  const a = sx.aim, eye = [sx.x, sx.y, sx.z + 1.55], dx = tx - eye[0], dy = ty - eye[1], dz = tz - eye[2];
  const yaw = Math.atan2(dy, dx), pit = Math.atan2(dz, Math.hypot(dx, dy)), ey = S7.angDiff(a.yaw, yaw), ep = pit - a.pitch;
  I.lookStick = [S7.clamp(ey * rate, -1, 1), -S7.clamp(ep * rate, -1, 1)]; return Math.hypot(ey, ep);
}
bot.intents = function (dt) {
  const I = blank(), v = bot.v; bot.t += dt;
  if (!v) return I;
  // keep the show going: cheat-reveal everything near
  for (const e of sx.enemies) if (!e.dead && Math.hypot(e.x - sx.x, e.y - sx.y) < 30) e.visible = Math.max(e.visible, .3);
  if (sx.mode === 'talk') { bot.talkT += dt; const tk = sx.talk; if (tk && tk.shown >= tk.text.length && bot.talkT > 1.1) { I.confirm = true; bot.talkT = 0; } return I; }
  if (sx.mode === 'cutscene') { if (bot.t > 6 && sx.card === null && sx.talk === null) I.skipScene = true; return I; }
  if (sx.mode === 'transition' || sx.mode === 'frozen' || sx.mode === 'gameover') return I;
  if (sx.cheats.god) for (const id of S7.ROSTER) { const r = sx.roster[id]; r.frozen = false; r.hp = Math.max(r.hp, 30); }
  // target selection: the nearest live enemy, or the boss's Warm Spot while it is open
  let tgt = null, bd = 1e9;
  for (const e of sx.enemies) { if (e.dead || e.spawnT > 0) continue; const d = Math.hypot(e.x - sx.x, e.y - sx.y); if (d < bd && d < (sx.mode === 'ski' ? 38 : 22)) { bd = d; tgt = e; } }
  const b = sx.boss;
  if (b && !b.dead) {
    I.aim = true; I.ring = false;
    const wp = b.warmPos(); let err = aimAt(I, wp[0], wp[1], wp[2], 4);
    if (b.warmOpen() && err < .03) { I.fire = I.firePressed = true; }
    else if (!b.warmOpen() && tgt && bd < 12) { aimAt(I, tgt.x, tgt.y, tgt.z + 1.25, 4); I.firePressed = I.fire = true; }
    if (sx.scanCd <= 0 && tgt) I.scan = true;
    if (bot.t % 7 < dt) I.skill = true;
    // slide around the ring when a danger zone is up: handled by god mode
    if (sx.mode === 'aim' && sx.preAim === 'junction') {}
    return I;
  }
  if (tgt && bd < 20) {
    I.aim = true;
    const w = tgt.def.warm, sc = tgt.visible > 0 ? w[1] : tgt.def.h * .6;
    const bx = tgt.x + Math.cos(tgt.face) * tgt.def.r * .6, by = tgt.y + Math.sin(tgt.face) * tgt.def.r * .6;
    const err = sx.mode === 'aim' ? aimAt(I, bx, by, tgt.z + sc, 4) : 9;
    if (sx.mode === 'ski' && sx.speed > 2) I.turn = true;
    if (err < .035 && !(tgt.def.shield && tgt.shieldUp)) { I.fire = I.firePressed = true; }
    if (sx.scanCd <= 0 && tgt.visible <= 0) I.scan = true;
    if (sx.mode !== 'aim' && sx.mode !== 'lift' && sx.mode !== 'ski') { I.go = false; }
    return I;
  }
  // gates: wear the right coat and use its skill
  if (sx.blocked) {
    const g = sm.gateOf();
    if (g && g.who && sx.persona !== g.who && sx.switchT <= 0) { sm.switchTo(g.who, true); I.go = false; return I; }
    if (g && sx.switchT <= 0 && bot.t - (bot.gateT || -9) > 1.5) { bot.gateT = bot.t; I.interact = true; }
    return I;
  }
  // nothing to shoot: follow the route
  const G = S7.graph(), A = G.A;
  if (sx.mode === 'ski') { I.go = true; return I; }
  if (sx.mode === 'lift') { return I; }
  if (A.boss && sx.bosses[A.boss] && !bot.route.length) { const out = Object.keys(G.nodes).find(k => G.nodes[k].kind === 'exit'); if (out) bot.route = [out]; }
  if (sx.node && bot.route[0] === sx.node) bot.route.shift();
  while (bot.route.length && !G.nodes[bot.route[0]]) bot.route.shift();
  const want = bot.route[0];
  if (sx.mode === 'junction') {
    let pick = 0;
    if (want) { const step = pathTo(sx.node, want); if (step) pick = Math.max(0, sx.options.findIndex(o => o.edge === step.e.id)); }
    else { const i = sx.options.findIndex(o => G.edges[o.edge].kind === 'ski' && !G.edges[o.edge].steep); pick = i >= 0 ? i : 0; }
    I.branch = pick; return I;
  }
  if (sx.mode === 'rail') {
    if (!want) { I.go = false; return I; }
    const e = G.edges[sx.edge], d = dists(want);
    if (sx.node) {   // standing on a node: face the right way along the best edge
      const step = pathTo(sx.node, want);
      if (step) { const ed = step.e, dir = ed.a === sx.node ? 1 : -1; if (ed.id !== sx.edge || dir !== sx.dir) { st_dir(ed); } }
      I.go = true;
    } else {          // mid-edge: turn about if the other end is the way
      const ahead = sx.dir > 0 ? e.b : e.a, behind = sx.dir > 0 ? e.a : e.b, dAhead = (d[ahead] === undefined ? 1e9 : d[ahead]) + (sx.dir > 0 ? e.len - sx.s : sx.s), dBehind = (d[behind] === undefined ? 1e9 : d[behind]) + (sx.dir > 0 ? sx.s : e.len - sx.s);
      if (dBehind + 1 < dAhead && bot.t - (bot.turnT || -9) > 1) { bot.turnT = bot.t; I.turn = true; } else I.go = true;
    }
  }
  return I;
};
function st_dir(e) {   // point the walker down the chosen edge when standing on a node
  sx.edge = e.id; if (e.a === sx.node) { sx.s = 0; sx.dir = 1; } else { sx.s = e.len; sx.dir = -1; } sm.placeHero();
}
bot.nextVignette = function () { bot.setup((bot.idx + 1) % bot.VIGNETTES.length); };
bot.step = function (dt) { if (bot.t > (bot.v ? bot.v.time : 40)) { bot.nextVignette(); return true; } return false; };
