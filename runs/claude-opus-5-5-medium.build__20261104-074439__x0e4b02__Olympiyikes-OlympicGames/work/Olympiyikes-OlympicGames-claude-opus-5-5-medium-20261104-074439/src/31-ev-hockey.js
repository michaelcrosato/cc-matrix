/* OLYMPIYIKES! — Glory Arena, the ICE HOCKEY FINAL (§6.12): 2-on-2 plus goalies, two periods, overtime, a shootout; checks, ON FIRE. */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, clamp = E.clamp;
const X0 = 32, X1 = 512, Y0 = 32, Y1 = 272, CX = (X0 + X1) / 2, CY = (Y0 + Y1) / 2, GL = [X0 + 34, X1 - 34], GW = 26;
const rinkTex = (x, y) => {
  const n = E.hash2(Math.floor(x), Math.floor(y)) - .5;
  if (x < X0 || x > X1 || y < Y0 || y > Y1) return [30 + n * 10, 30 + n * 10, 46 + n * 10];
  if (Math.abs(x - CX) < 1.5) return [200, 40, 50];
  if (Math.abs(x - (CX - 70)) < 1.5 || Math.abs(x - (CX + 70)) < 1.5) return [40, 80, 200];
  if (Math.abs(x - GL[0]) < .8 || Math.abs(x - GL[1]) < .8) return [200, 40, 50];
  if (Math.abs(Math.hypot(x - CX, y - CY) - 30) < 1) return [40, 80, 200];
  for (const gx of GL) { const d = Math.hypot(x - gx, y - CY); if (d < 20 && (gx < CX ? x > gx : x < gx)) return [140, 190, 240]; }
  for (const [fx, fy] of [[CX - 140, CY - 60], [CX - 140, CY + 60], [CX + 140, CY - 60], [CX + 140, CY + 60]]) if (Math.abs(Math.hypot(x - fx, y - fy) - 18) < .8) return [200, 40, 50];
  const g = 230 + n * 10 + E.noise2(x * .02, y * .02) * 12; return [g - 6, g, g + 8];
};
let hmap = null;
const rink = () => { if (hmap) return hmap; const cols = Math.ceil((X1 + 32) / 16), rows = Math.ceil((Y1 + 32) / 16), R = []; for (let y = 0; y < rows; y++) { let s = ''; for (let x = 0; x < cols; x++) s += (y === 1 || y === rows - 2) && x >= 1 && x <= cols - 2 || (x === 1 || x === cols - 2) && y >= 1 && y <= rows - 2 ? '#' : '.'; R.push(s); }
  hmap = new E.TileMap({ rows: R, legend: { '#': 1, '.': { floor: 'ice' } }, floorTex: rinkTex, outside: '#141626', ao: 3, types: { 1: { h: 18, top: '#c8e4f8', side: '#e8ecf4', face: 'plank', cut: true, cutH: 6 } } }); return hmap; };

O.defEvent({
  id: 'hockey', name: 'ICE HOCKEY FINAL', short: 'Hockey', season: 'winter', venue: 'Glory Arena', pictogram: 'hockey', music: 'organ', view: 'threequarter', sport: 'hockey', input: O.KEYS_HOCKEY, lights: .5,
  format: { type: 'match' }, maxTime: 900, turbo: 'ON FIRE!', matchEvent: true,
  measure: { better: 'higher', unit: '', fmt: v => String(v), wr: [7, 'TRB', 'MAX OVERDRIVE'] },
  points: v => v * 140,
  tune: { periodLength: [90, 20, 240, 5, 'Period length (s)'], skateAccel: [220, 80, 400, 5, 'Skate accel'], skateMax: [105, 60, 180, 1, 'Skate max speed'], shotPower: [330, 150, 600, 5, 'Shot power'],
    puckFriction: [.35, 0, 2, .05, 'Puck friction'], goalieSpeed: [70, 20, 160, 2, 'Goalie speed'], checkPower: [1, 0, 3, .05, 'Check power'] },
  howto: { goal: 'Score more goals than the other team.', rows: [[['move'], 'Skate'], [['mashL'], 'Pass to your teammate'], [['action'], 'Hold: charge · release: SHOOT'], [['mashR'], 'Check (no puck) / switch skater'], [['alt'], 'Skate burst']] },
  yikesKinds: ['CHECKED INTO THE GLASS!', 'OWN GOAL!'],
  laurel: { id: 'hattrick', name: 'HAT TRICK', text: 'One skater scores three', test: (ctx, a) => ctx.S && ctx.S.skaters && ctx.S.skaters.some(k => k.team === ctx.teams.indexOf(a) && k.goals >= 3) },
  hub: { ok: false }, attract: { seconds: 25, after: 3, setup(ctx) { ctx.S.clock = 25; } },
  phases: [['period 2', ctx => { const S = ctx.S; S.period = 2; S.clock = ctx.T.periodLength; faceoff(ctx); }], ['overtime', ctx => { const S = ctx.S; S.period = 3; S.clock = ctx.T.periodLength; ctx.teams[0].S.score = ctx.teams[1].S.score; faceoff(ctx); }], ['shootout', ctx => { ctx.teams[0].S.score = ctx.teams[1].S.score; startShootout(ctx); }]],
  build() { rink(); },
  start(ctx) {
    const hum = ctx.athletes.filter(a => a.human), meet = ctx.meet;
    const A = hum[0] || ctx.athletes.find(a => a.pilot.cheat) || ctx.athletes[0];
    let B = hum.length > 1 && !meet.coop ? hum[1] : null;
    if (!B) { const rv = ctx.athletes.find(a => a.id === (meet.rival || O.rivalFor([A.id]))); B = rv && rv !== A ? rv : ctx.athletes.filter(a => a !== A && !a.human).sort((x, y) => y.nat.skills.hockey - x.nat.skills.hockey)[0]; }
    ctx.teams = [A, B]; ctx.active = [A, B];
    const ctl = [[A, null], [B, null]];
    if (hum.length > 1) { if (meet.coop) { ctl[0][1] = hum[1]; ctx.active.push(hum[1]); } else if (hum[2]) { ctl[0][1] = hum[2]; ctx.active.push(hum[2]); } if (!meet.coop && hum[3]) { ctl[1][1] = hum[3]; ctx.active.push(hum[3]); } }
    for (const a of ctx.active) { a.S = { score: 0 }; a.fin = false; }
    const sk = [];
    for (let t = 0; t < 2; t++) for (let k = 0; k < 2; k++) { const nat = ctx.teams[t].nat; const c = ctl[t][k]; sk.push({ team: t, k, x: 0, y: 0, vx: 0, vy: 0, fac: t ? Math.PI : 0, stun: 0, charge: 0, charging: false, stamina: 1, burst: 0, ctl: c && c.human ? c : (k === 0 && ctx.teams[t].human ? ctx.teams[t] : null), rig: ctx.sandbox ? null : O.makeRig(nat, 'hockey', k ? { mate: k } : {}), goals: 0, cool: 0, fire: 0, good: 0 }); }
    const gk = [0, 1].map(t => ({ team: t, x: GL[t] + (t ? -8 : 8), y: CY, rig: ctx.sandbox ? null : O.makeRig(ctx.teams[t].nat, 'hockey', { mate: 2 }), save: 0, freeze: 0, sk: ctx.skill(ctx.teams[t]) }));
    ctx.S = { skaters: sk, goalies: gk, puck: { x: CX, y: CY, vx: 0, vy: 0, owner: null, fire: false, last: null, z: 0 }, period: 1, clock: ctx.T.periodLength, pause: 0, msg: null, msgT: 0, over: false, overT: 0, shootout: null, t: 0, horn: 0, resurf: -1 };
    faceoff(ctx);
  },
  bot(ctx, a, dt, I) {
    // a human's skater on autopilot (dev cheat, tests): the AI's decision as an intent
    const S = ctx.S, me = S.skaters.find(k => k.ctl === a); if (!me) return I;
    const cmd = ai(ctx, me, dt); I.mv = cmd.mv; if (cmd.shoot) { I.Ad = me.charge < .5; if (me.charge >= .5) I.Au = true; } if (cmd.pass) I.L = true; if (cmd.check) I.R = true;
    if (a.hype >= 1 && S.puck.owner && S.puck.owner.team === me.team) I.T = true;
    return I;
  },
  step(ctx, dt) {
    const S = ctx.S, T = ctx.T, P = S.puck; S.t += dt;
    if (S.msgT > 0) S.msgT -= dt; if (S.horn > 0) S.horn -= dt;
    if (S.over) { S.overT += dt; return; }
    if (S.pause > 0) { S.pause -= dt; if (S.resurf >= 0) S.resurf += dt * 160; if (S.pause <= 0) { S.resurf = -1; faceoff(ctx); } return; }
    if (S.shootout) return shootoutStep(ctx, dt);
    S.clock -= dt;
    if (S.clock <= 0) { endPeriod(ctx); return; }
    for (const k of S.skaters) {
      if (k.stun > 0) { k.stun -= dt; k.vx *= .9; k.vy *= .9; k.x += k.vx * dt; k.y += k.vy * dt; continue; }
      k.cool = Math.max(0, k.cool - dt);
      let cmd;
      if (k.ctl && k.ctl.human && !(k.ctl.pilot.cheat)) { const I = k.ctl.I || O.blankIntent(); cmd = humanCmd(ctx, k, I); }
      else if (k.ctl && k.ctl.I) { cmd = humanCmd(ctx, k, k.ctl.I); }
      else cmd = ai(ctx, k, dt);
      move(ctx, k, cmd, dt);
    }
    // switching the human's skater to the one nearest the puck when the other has it not
    for (const a of ctx.active) if (a.human && a.I && a.I.R) { const mine = S.skaters.find(k => k.ctl === a); if (mine && P.owner !== mine && !nearPuck(mine, 30)) { const mate = S.skaters.find(k => k.team === mine.team && k !== mine && !k.ctl); if (mate && dist(mate, P) < dist(mine, P)) { mate.ctl = a; mine.ctl = null; } } }
    for (const a of ctx.active) if (a.I && a.I.T) O.Hype.fire(ctx, a);
    puckStep(ctx, dt);
    for (const g of S.goalies) goalieStep(ctx, g, dt);
    if (!ctx.sandbox) animate(ctx, dt);
    O.Crowd.level = Math.max(O.Crowd.level, .35);
  },
  done(ctx) { return ctx.S.over && (ctx.S.overT > 3 || ctx.fast); },
  perf(ctx, a) { return a.S.score; },
  matchRows(ctx) { return O.matchRows(ctx, ctx.teams, ctx.teams.map(a => a.S.score), 'hockey'); },
  camera(ctx) { const S = ctx.S; if (!S.puck) { game.focus(CX, CY, 0); return; } const hs = S.skaters.filter(k => k.ctl && k.ctl.human); const pts = [S.puck].concat(hs); const x = pts.reduce((s, p) => s + p.x, 0) / pts.length, y = pts.reduce((s, p) => s + p.y, 0) / pts.length; game.focus(clamp(x, X0 + 100, X1 - 100), clamp(y, Y0 + 40, Y1 - 40), 0); game.setZoom(1.45); },
  draw(ctx, r) {
    r.sky(['#05060f', '#0a0c1a', '#10142a']);
    const map = rink(); map.drawFloor(r);
    const S = ctx.S; if (!S.skaters) return;
    // stands in the dark with spots, the jumbotron cube, glass, goal lights
    r.queue(CX, 0, 0, g => { const a0 = r.w(0, Y0 - 16, 0); O.Art.crowd(g, 0, Math.max(0, a0[1] - 60), r.W, 54, O.Crowd.level, 51, [ctx.teams[0].nat.colors.a, ctx.teams[1].nat.colors.a, '#ffffff', ctx.teams[0].nat.colors.b, ctx.teams[1].nat.colors.b]); }, { bias: -3000 });
    map.queueWalls(r);
    for (const t of [0, 1]) { const gx = GL[t], dir = t ? 1 : -1; r.queue(gx + dir * 6, CY, 0, g => { const a0 = r.w(gx, CY - GW, 0), b = r.w(gx + dir * 12, CY + GW, 0), top = r.w(gx, CY - GW, 14); const L = Math.min(a0[0], b[0]), R2 = Math.max(a0[0], b[0]); px.blend(g, .18, 'normal', () => px.rect(g, L, top[1], R2 - L, b[1] - top[1], '#ffffff')); for (let x = L; x < R2; x += 3) px.rect(g, x, top[1], 1, b[1] - top[1], '#e8ecf4'); px.rect(g, L, top[1], R2 - L, 2, '#e8443a'); px.rect(g, a0[0] - 1, top[1], 2, a0[1] - top[1], '#e8443a'); const c = r.w(gx, CY + GW, 0); px.rect(g, c[0] - 1, top[1] + (c[1] - a0[1]), 2, a0[1] - top[1], '#e8443a'); }); if (S.horn > 0 && S.lastGoal === t) game.lights.add(gx, CY, 40, 140, 1, { color: '#ff3020' }); }
    for (let k = 0; k < 4; k++) game.lights.add(CX + Math.sin(game.real * .7 + k * 1.6) * 180, CY + Math.cos(game.real * .5 + k) * 70, 0, 110, .8, { color: ['#ffffff', '#ffe0a0', '#a0d8ff', '#ffd0f0'][k] });
    r.queue(CX, CY, 120, g => { const p = r.w(CX, CY, 120); O.Art.jumbo(g, p[0] - 44, p[1] - 14, 88, 22, [ctx.teams[0].nat.id + ' ' + ctx.teams[0].S.score + ' - ' + ctx.teams[1].S.score + ' ' + ctx.teams[1].nat.id, S.shootout ? 'SHOOTOUT' : 'P' + Math.min(S.period, 3) + '  ' + fmtClock(S.clock)]); }, { bias: 900 });
    if (S.resurf >= 0) { const x = X0 + S.resurf; r.actor(x, CY, 0, (g, ox, oy) => { px.rect(g, ox - 16, oy - 14, 32, 14, '#3a8ad8'); px.rect(g, ox - 10, oy - 22, 16, 9, '#e8ecf4'); px.disc(g, ox - 4, oy - 25, 4, '#f8f8ff'); E.font.text(g, 'YIKES', ox, oy - 11, '#ffffff', { align: 'center', outline: false, font: 'tiny' }); }); }
    for (const k of S.skaters) if (k.rig) { r.shadow(k.x, k.y, 5, .3); r.actor(k.x, k.y, 0, (g, ox, oy) => { k.rig.draw(g, ox, oy, r.view); drawStick(g, k, ox, oy); }, { flash: k.stun > 0 ? '#ffffff' : false, flashMix: .4 }); if (k.ctl && k.ctl.human) r.queue(k.x, k.y, 0, g => { const p = r.w(k.x, k.y, 0); for (let t = 0; t < 16; t++) { const an = t / 16 * Math.PI * 2; px.rect(g, p[0] + Math.cos(an) * 8, p[1] + Math.sin(an) * 4, 1, 1, k.ctl.color || '#ffd060'); } }, { bias: -5 }); }
    for (const gk of S.goalies) if (gk.rig) r.actor(gk.x, gk.y, 0, (g, ox, oy) => gk.rig.draw(g, ox, oy, r.view));
    const P = S.puck; r.queue(P.x, P.y, P.z, g => { const p = r.w(P.x, P.y, P.z); px.ell(g, p[0], p[1], 3, 2, '#05060f'); if (P.fire) { px.blend(g, .6, 'add', () => px.disc(g, p[0], p[1], 5, '#ff8a2a')); } }, { emissive: P.fire });
    if (P.fire && !ctx.fast) game.particles.fire(P.x, P.y, 2, 1, { size: 2 });
  },
  hud(ctx, r, g) {
    const S = ctx.S; if (!S.skaters) return;
    O.HUD.header(g, r, ctx, S.shootout ? 'SHOOTOUT' : S.period > 2 ? 'OVERTIME · SUDDEN DEATH' : 'PERIOD ' + S.period + ' OF 2');
    const x = r.W / 2 - 80; O.panel(g, x, 6, 160, 26, { alpha: .9 });
    O.Art.flag(g, x + 6, 12, 18, 12, ctx.teams[0].nat); O.Art.flag(g, x + 136, 12, 18, 12, ctx.teams[1].nat);
    O.text(g, ctx.teams[0].S.score + '  ' + fmtClock(S.clock) + '  ' + ctx.teams[1].S.score, r.W / 2, 13, '#ffffff', { align: 'center', scale: 1 });
    ctx.active.filter(a => a.human).forEach((a, i) => { const k = S.skaters.find(q => q.ctl === a); const y = r.H - 34 - i * 30; O.HUD.tag(g, 10, y, a); O.HUD.flame(g, 34, y - 6, a, a.input); if (k) { O.text(g, 'STAMINA', 52, y + 1, '#c8d0f0', { font: 'tiny' }); O.HUD.power(g, 90, y + 1, 50, k.stamina, '#4fe0a8'); if (k.charging) O.HUD.power(g, 150, y + 1, 50, k.charge, '#ffd060'); } });
    const me = S.skaters.find(k => k.ctl && k.ctl.human);
    if (me && game.settings.hints && !S.shootout) O.Prompt.strip(g, r, S.puck.owner === me ? [['action', 'Shoot'], ['mashL', 'Pass']] : [['mashR', 'Check / switch'], ['alt', 'Burst']], { input: me.ctl.input });
    if (S.shootout && S.shootout.shooter && S.shootout.shooter.ctl && S.shootout.shooter.ctl.human) O.Prompt.strip(g, r, [['move', 'Skate'], ['action', 'Shoot']], { input: S.shootout.shooter.ctl.input });
    if (S.msgT > 0 && S.msg) O.title(g, S.msg, r.W / 2, r.H * .3, 3);
    if (S.shootout) { const so = S.shootout; O.text(g, 'ROUND ' + (so.round + 1) + '   ' + so.goals[0] + ' - ' + so.goals[1], r.W / 2, 40, '#ffd060', { align: 'center' }); O.text(g, Math.max(0, so.t).toFixed(1), r.W / 2, 52, '#ffffff', { align: 'center' }); }
    if (S.over) { const wn = ctx.teams[0].S.score > ctx.teams[1].S.score ? ctx.teams[0] : ctx.teams[1]; O.title(g, wn.nat.name + ' WINS GOLD!', r.W / 2, r.H * .4, 3); }
  },
  ghostState() { return [0, 0, 0, 0, 0]; }, ghostDraw() { return null; }
});
const fmtClock = c => { c = Math.max(0, c); return Math.floor(c / 60) + ':' + String(Math.floor(c % 60)).padStart(2, '0'); };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const nearPuck = (k, d) => false && d && k;
function faceoff(ctx) {
  const S = ctx.S, P = S.puck; P.x = CX; P.y = CY; P.vx = P.vy = 0; P.owner = null; P.fire = false; P.z = 0;
  S.skaters.forEach(k => { k.x = CX + (k.team ? 1 : -1) * (k.k ? 60 : 14); k.y = CY + (k.k ? (k.team ? 40 : -40) : 0); k.vx = k.vy = 0; k.stun = 0; k.charge = 0; k.charging = false; });
  S.goalies.forEach(g => { g.x = GL[g.team] + (g.team ? -8 : 8); g.y = CY; g.freeze = 0; });
}
function humanCmd(ctx, k, I) {
  const S = ctx.S, mv = I.mv || [0, 0], d = game.view && game.view.screenDirToGround ? game.view.screenDirToGround(mv[0], mv[1]) : mv;
  const cmd = { mv: [d[0], d[1]], burst: I.X, shoot: false, pass: !!I.L, check: !!I.R && S.puck.owner !== k, charge: !!I.Ad, release: !!I.Au };
  if (I.mouse && I.ptr && I.click === null && ctx.toWorld) { /* aim toward the cursor below */ }
  if (I.mouse && game.mouseGround) { const m = game.mouseGround(); if (m) cmd.aim = [m[0] - k.x, m[1] - k.y]; }
  return cmd;
}
function ai(ctx, k, dt) {
  const S = ctx.S, P = S.puck, me = k.team, goalX = GL[1 - me], sk = k.ctl ? 1 : ctx.skill(ctx.teams[me]) * (k.ctl ? 1 : 1);
  const mate = S.skaters.find(q => q.team === me && q !== k), cmd = { mv: [0, 0], shoot: false, pass: false, check: false, charge: false, release: false };
  const to = (x, y, s = 1) => { const dx = x - k.x, dy = y - k.y, d = Math.hypot(dx, dy) || 1; cmd.mv = [dx / d * Math.min(1, d / 20) * s, dy / d * Math.min(1, d / 20) * s]; };
  if (P.owner === k) {
    const dGoal = Math.abs(goalX - k.x);
    to(goalX + (me ? 40 : -40), CY + Math.sin(S.t * 1.3 + k.k) * 30);
    const blocked = S.skaters.some(o => o.team !== me && Math.abs(o.y - k.y) < 16 && (me ? o.x < k.x && o.x > goalX : o.x > k.x && o.x < goalX) && Math.abs(o.x - k.x) < 50);
    if (dGoal < 150 + sk * 30) { cmd.charge = true; if (k.charge > .45 + (1 - sk) * .3) { cmd.charge = false; cmd.release = true; } }
    else if (blocked && mate && k.cool <= 0 && (k.seed = (k.seed || 0) + dt) > .8) { cmd.pass = true; k.seed = 0; }
  } else if (!P.owner || P.owner.team !== me) {
    const chaser = !mate || dist(k, P) <= dist(mate, P);
    if (chaser) { to(P.x + P.vx * .2, P.y + P.vy * .2); if (P.owner && dist(k, P.owner) < 16 && k.cool <= 0 && (k.ctl || ctx.rng('chk' + Math.floor(S.t * 2))() < .25 + sk * .3)) cmd.check = true; }
    else to((GL[me] + CX) / 2, CY + (P.y - CY) * .5, .8);
  } else { to(goalX + (me ? 90 : -90), CY + (k.k ? 50 : -50), .85); }
  if (!k.ctl) { const n = (E.noise2(S.t * .8, k.k * 9 + me * 3) - .5) * (1 - sk) * .8; cmd.mv[0] += n; cmd.mv[1] -= n * .5; }
  return cmd;
}
function move(ctx, k, cmd, dt) {
  const S = ctx.S, T = ctx.T, P = S.puck, a = ctx.teams[k.team];
  const m = Math.hypot(cmd.mv[0], cmd.mv[1]), burst = cmd.burst && k.stamina > .05;
  if (burst) k.stamina = Math.max(0, k.stamina - dt * .5); else k.stamina = Math.min(1, k.stamina + dt * .15);
  const max = T.skateMax * (burst ? 1.3 : 1) * (P.owner === k ? .92 : 1), acc = T.skateAccel * (burst ? 1.4 : 1);
  if (m > .05) { k.vx += cmd.mv[0] / Math.max(1, m) * acc * dt; k.vy += cmd.mv[1] / Math.max(1, m) * acc * dt; k.fac = Math.atan2(cmd.mv[1], cmd.mv[0]); }
  else { k.vx *= Math.pow(.4, dt); k.vy *= Math.pow(.4, dt); }
  const sp = Math.hypot(k.vx, k.vy); if (sp > max) { k.vx *= max / sp; k.vy *= max / sp; }
  k.x = clamp(k.x + k.vx * dt, X0 + 6, X1 - 6); k.y = clamp(k.y + k.vy * dt, Y0 + 6, Y1 - 6);
  if (k.x <= X0 + 6 || k.x >= X1 - 6) k.vx *= -.3; if (k.y <= Y0 + 6 || k.y >= Y1 - 6) k.vy *= -.3;
  // possession
  if (!P.owner && P.z < 3 && dist(k, P) < 8 && k.cool <= 0) { P.owner = k; P.last = k; ctx.fx.sfx('puck'); }
  if (P.owner === k) {
    if (cmd.charge) { k.charging = true; k.charge = Math.min(1, k.charge + dt * 1.4); }
    if ((cmd.release || (k.charging && !cmd.charge)) && k.charging) shoot(ctx, k, cmd);
    else if (cmd.pass) pass(ctx, k, cmd);
  } else { k.charging = false; k.charge = 0; }
  // checks
  if (cmd.check && k.cool <= 0) {
    k.cool = .8; k.vx += Math.cos(k.fac) * 120; k.vy += Math.sin(k.fac) * 120; ctx.fx.sfx('whoosh', { vol: .5 });
    for (const o of S.skaters) if (o.team !== k.team && o.stun <= 0 && dist(k, o) < 18 * ctx.T.checkPower + 4) {
      o.stun = 1; o.vx = Math.cos(k.fac) * 140; o.vy = Math.sin(k.fac) * 140; if (P.owner === o) { P.owner = null; P.vx = o.vx * 1.2; P.vy = o.vy * 1.2; o.cool = .6; }
      ctx.fx.sfx('check'); ctx.hype(a, .15); O.Crowd.excite(.5);
      const glass = o.x < X0 + 30 || o.x > X1 - 30 || o.y < Y0 + 30 || o.y > Y1 - 30;
      if (glass) { ctx.fx.sfx('glass'); ctx.fx.shake(3); ctx.fx.say('hockey'); if (o.ctl && o.ctl.human && !ctx.god(o.ctl)) ctx.yikes(o.ctl, 'CHECKED INTO THE GLASS!', 'glass'); }
    }
  }
  if (P.owner === k) { P.x = k.x + Math.cos(k.fac) * 7; P.y = k.y + Math.sin(k.fac) * 7; P.vx = k.vx; P.vy = k.vy; }
}
function shoot(ctx, k, cmd) {
  const S = ctx.S, P = S.puck, T = ctx.T, a = ctx.teams[k.team], fire = a.turboT > 0 || k.fire > 0;
  const goalX = GL[1 - k.team]; let dx = goalX - k.x, dy = CY - k.y + (cmd.mv[1] || 0) * 22;
  if (cmd.aim) { dx = cmd.aim[0]; dy = cmd.aim[1]; }
  else if (!k.ctl) { const r = ctx.rng('aim' + Math.floor(S.t * 10)); dy += (r() * 2 - 1) * (14 + (1 - ctx.skill(a)) * 28); }
  const d = Math.hypot(dx, dy) || 1, pw = T.shotPower * (.45 + .55 * k.charge) * (fire ? 1.4 : 1);
  P.owner = null; P.vx = dx / d * pw; P.vy = dy / d * pw; P.fire = fire; P.last = k; P.shot = true; k.cool = .3; k.charging = false; k.charge = 0;
  ctx.fx.sfx('thwack'); if (a.human || ctx.attract) ctx.hype(a, .08);
}
function pass(ctx, k) {
  const S = ctx.S, P = S.puck, mate = S.skaters.find(q => q.team === k.team && q !== k); if (!mate) return;
  const lx = mate.x + mate.vx * .35, ly = mate.y + mate.vy * .35, dx = lx - k.x, dy = ly - k.y, d = Math.hypot(dx, dy) || 1, sp = 240;
  P.owner = null; P.vx = dx / d * sp; P.vy = dy / d * sp; P.last = k; P.passTo = mate; P.shot = false; k.cool = .35; ctx.fx.sfx('puck');
  if (k.ctl && k.ctl.human) { mate.ctl = k.ctl; k.ctl = null; }
}
function puckStep(ctx, dt) {
  const S = ctx.S, P = S.puck, T = ctx.T; if (P.owner) return;
  P.vx *= Math.pow(1 - Math.min(.9, T.puckFriction * .5), dt); P.vy *= Math.pow(1 - Math.min(.9, T.puckFriction * .5), dt);
  P.x += P.vx * dt; P.y += P.vy * dt;
  // goals: across a goal line inside the mouth
  for (const t of [0, 1]) { const gx = GL[t], inside = t ? P.x > gx : P.x < gx; if (inside && Math.abs(P.y - CY) < GW && Math.abs(P.x - gx) < 14) { goalWrapper(ctx, 1 - t); return; } else if (inside && Math.abs(P.x - gx) < 14 && Math.abs(P.y - CY) < GW + 4) { P.vy *= -1; } }
  if (P.x < X0 + 2 || P.x > X1 - 2) { P.vx *= -.65; P.x = clamp(P.x, X0 + 2, X1 - 2); ctx.fx.sfx('puck', { vol: .3 }); }
  if (P.y < Y0 + 2 || P.y > Y1 - 2) { P.vy *= -.65; P.y = clamp(P.y, Y0 + 2, Y1 - 2); ctx.fx.sfx('puck', { vol: .3 }); }
  if (Math.hypot(P.vx, P.vy) < 40) P.fire = false;
}
function goalieStep(ctx, g, dt) {
  const S = ctx.S, P = S.puck, T = ctx.T, gx = GL[g.team], fireSlow = P.fire ? .5 : 1;
  const ty = clamp(P.y + (P.owner ? 0 : P.vy * .15), CY - GW + 4, CY + GW - 4), sp = T.goalieSpeed * (.6 + .5 * g.sk) * fireSlow;
  g.y += clamp(ty - g.y, -sp * dt, sp * dt); g.x = gx + (g.team ? -8 : 8) - Math.abs(g.y - CY) * .12 * (g.team ? -1 : 1);
  if (g.freeze > 0) { g.freeze -= dt; P.x = g.x + (g.team ? -6 : 6); P.y = g.y; P.vx = P.vy = 0; if (g.freeze <= 0) { P.owner = null; const mate = S.skaters.filter(k => k.team === g.team).sort((a, b) => dist(a, g) - dist(b, g))[0]; if (mate) { const dx = mate.x - P.x, dy = mate.y - P.y, d = Math.hypot(dx, dy) || 1; P.vx = dx / d * 200; P.vy = dy / d * 200; P.x += P.vx * .05; } } return; }
  if (!P.owner && dist(g, P) < 10 && Math.hypot(P.vx, P.vy) > 30) {
    const r = ctx.rng('save' + Math.floor(S.t * 20)), chance = (.55 + .4 * g.sk) * (P.fire ? .55 : 1) * (Math.hypot(P.vx, P.vy) > 300 ? .8 : 1);
    if (r() < chance) { S.saves = (S.saves || 0) + 1; if (r() < .35) { g.freeze = .8; ctx.fx.sfx('puck'); } else { P.vx = (g.team ? -1 : 1) * Math.abs(P.vx) * .4; P.vy = (r() * 2 - 1) * 120; ctx.fx.sfx('clack'); } if (!ctx.fast) { S.msg = 'SAVE!'; S.msgT = .8; } P.fire = false; }
  }
}
function goal(ctx, team) {
  const S = ctx.S, P = S.puck, sc = ctx.teams[team], by = P.last;
  sc.S.score++; S.lastGoal = 1 - team; S.horn = 3;
  if (by && by.team === team) by.goals++;
  else if (by && by.ctl && by.ctl.human && !ctx.god(by.ctl)) ctx.yikes(by.ctl, 'OWN GOAL!', 'owngoal');
  ctx.fx.sfx('horn'); O.sting('goal'); O.Crowd.doWave(3); O.CrowdAudio.cheer(); ctx.hype(sc, .3);
  if (!ctx.fast) { S.msg = 'GOAL!'; S.msgT = 2; ctx.fx.say('hockey', { name: by ? (by.team === team ? ctx.teams[team].short : 'somebody') : '' , nation: sc.nat.name }); }
  P.owner = null; P.vx = P.vy = 0; P.fire = false;
  if (S.period > 2) { endMatch(ctx); return; }
  S.pause = 2;
}
function endPeriod(ctx) {
  const S = ctx.S;
  if (S.period === 1) { S.period = 2; S.clock = ctx.T.periodLength; S.pause = 3.5; S.resurf = 0; S.msg = 'INTERMISSION'; S.msgT = 3; ctx.fx.sfx('buzzer'); return; }
  const [a, b] = ctx.teams;
  if (a.S.score !== b.S.score) return endMatch(ctx);
  if (S.period === 2) { S.period = 3; S.clock = ctx.T.periodLength; S.pause = 2.5; S.msg = 'OVERTIME!'; S.msgT = 2.5; ctx.fx.sfx('buzzer'); return; }
  startShootout(ctx);
}
function startShootout(ctx) { const S = ctx.S; S.shootout = { round: 0, turn: 0, goals: [0, 0], t: 6, shooter: null, phase: 'set' }; S.msg = 'SHOOTOUT!'; S.msgT = 2; setShooter(ctx); }
function setShooter(ctx) {
  const S = ctx.S, so = S.shootout, team = so.turn, k = S.skaters.find(q => q.team === team && (q.ctl && q.ctl.human)) || S.skaters.find(q => q.team === team);
  so.shooter = k; so.t = 6; so.phase = 'go'; so.res = null;
  for (const q of S.skaters) { q.x = q === k ? CX : CX + (q.team ? 1 : -1) * 200; q.y = q === k ? CY : Y0 + 20 + q.k * 20; q.vx = q.vy = 0; q.stun = 0; }
  const P = S.puck; P.owner = k; P.fire = false; k.fac = team ? Math.PI : 0;
}
function shootoutStep(ctx, dt) {
  const S = ctx.S, so = S.shootout, k = so.shooter, P = S.puck;
  if (so.phase === 'result') { so.rt -= dt; if (so.rt <= 0) nextShooter(ctx); return; }
  so.t -= dt;
  const cmd = k.ctl && k.ctl.human && !k.ctl.pilot.cheat ? humanCmd(ctx, k, k.ctl.I || O.blankIntent()) : ai(ctx, k, dt);
  if (!k.ctl || !k.ctl.human || k.ctl.pilot.cheat) { const gx = GL[1 - k.team]; if (Math.abs(gx - k.x) < 120) { cmd.charge = k.charge < .7; cmd.release = k.charge >= .7; } }
  cmd.check = false; cmd.pass = false;
  move(ctx, k, cmd, dt); puckStep(ctx, dt);
  goalieStep(ctx, S.goalies[1 - k.team], dt);
  if (!ctx.sandbox) animate(ctx, dt);
  const before = so.goals[k.team];
  if (S.lastShootGoal) { S.lastShootGoal = false; }
  if (P.owner !== k && (Math.hypot(P.vx, P.vy) < 20 || so.t <= 0)) result(false);
  else if (so.t <= 0 && P.owner === k) result(false);
  function result(scored) { if (so.phase !== 'go') return; so.phase = 'result'; so.rt = 1.5; so.res = scored; if (!ctx.fast) { S.msg = scored ? 'SCORES!' : 'NO GOAL'; S.msgT = 1.2; } void before; }
}
function nextShooter(ctx) {
  const S = ctx.S, so = S.shootout;
  if (so.turn === 1) { so.round++; const [g0, g1] = so.goals; if ((so.round >= 3 && g0 !== g1) || so.round >= 10) { if (g0 === g1) so.goals[ctx.rng('coin')() < .5 ? 0 : 1]++; ctx.teams[so.goals[0] > so.goals[1] ? 0 : 1].S.score++; return endMatch(ctx); } }
  so.turn = 1 - so.turn; setShooter(ctx);
}
// a shootout goal counts through the normal goal path
const _goal = goal;
function endMatch(ctx) { const S = ctx.S; S.over = true; S.overT = 0; ctx.fx.sfx('buzzer'); const wn = ctx.teams[0].S.score > ctx.teams[1].S.score ? ctx.teams[0] : ctx.teams[1]; ctx.fx.say('win', { nation: wn.nat.name, name: wn.short }); for (const a of ctx.active) a.fin = true; }
O.hockeyGoalHook = (ctx, team) => { const S = ctx.S; if (S.shootout) { S.shootout.goals[team]++; S.shootout.phase = 'result'; S.shootout.rt = 1.5; ctx.fx.sfx('horn'); return true; } return false; };
function goalWrapper(ctx, team) { if (O.hockeyGoalHook(ctx, team)) return; _goal(ctx, team); }
function drawStick(g, k, ox, oy) { const a = k.fac, len = 12; const hx = ox + Math.cos(a) * 3, hy = oy - 10, bx = ox + Math.cos(a) * len, by = oy - 1 + Math.sin(a) * 3; px.line(g, hx, hy, bx, by, '#5a3a1a', 1); px.rect(g, Math.round(bx - 1), Math.round(by), 4, 1, '#1a1a1a'); }
function animate(ctx, dt) {
  const S = ctx.S;
  for (const k of S.skaters) if (k.rig) { O.Pose.set(k.rig, k.stun > 0 ? null : 'stick'); k.rig.update(dt, { x: k.x, y: k.y, z: 0, vx: k.vx, vy: k.vy, facing: k.fac, down: k.stun > 0 ? Math.min(1, k.stun * 2) : 0, pose: S.over && ctx.teams[k.team].S.score > ctx.teams[1 - k.team].S.score ? 'cheer' : S.horn > 2 && S.lastGoal !== k.team ? 'cheer' : null }); }
  for (const g of S.goalies) if (g.rig) { O.Pose.set(g.rig, 'goalie'); g.rig.update(dt, { x: g.x, y: g.y, z: 0, vx: 0, vy: 0, facing: g.team ? Math.PI : 0 }); }
}
})();
