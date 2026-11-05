// ICE HOCKEY FINAL (2-on-2 + goalies) — winter · Glory Arena · skate, pass, charge and release shots, check into
// the glass. Two periods, sudden-death overtime, then a shootout. ON FIRE when the hype is full: the puck burns.
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, px = E.px, { clamp, lerp } = E;
const UI = O.UI, Art = O.Art, HL = 200, HW = 100, NETX = 182, MOUTH = 18, SR = 7, PR = 2.5;

O.defEvent({
  id: 'hockey', name: 'ICE HOCKEY FINAL', short: 'Hockey', season: 'winter', venueName: 'GLORY ARENA', music: 'organ', view: 'threequarter', input: O.KEYS_HOCKEY,
  format: { type: 'match' }, maxTime: 900,
  measure: { unit: 'goals', better: 'higher', fmt: v => String(v), wr: [7, 'TRB', 'MAX OVERDRIVE'], seedStep: -1, dp: 0 },
  points: v => 0,
  tune: { periodLength: [90, 30, 300, 5, 'Period length (s)'], skateAccel: [220, 80, 500, 5, 'Skate acceleration'], skateMax: [105, 50, 200, 1, 'Skate top speed'], shotPower: [300, 150, 600, 5, 'Shot power'], puckFriction: [.55, 0, 3, .05, 'Puck friction'], goalieSpeed: [140, 20, 260, 1, 'Goalie speed'], checkPower: [1, 0, 3, .05, 'Check power'] },
  howto: { goal: 'The final! Two periods, then sudden-death overtime and a shootout. Score more goals than the other nation.', rows: [[['move'], 'SKATE'], [['action'], 'HOLD: CHARGE · RELEASE: SHOOT'], [['mashL'], 'PASS'], [['mashR'], 'CHECK · SWITCH SKATER'], [['alt'], 'HOLD: SKATE BURST'], [['turbo'], 'ON FIRE!']] },
  yikesKinds: ['glass', 'owngoal'], turboName: 'ON FIRE!',
  laurel: { id: 'hattrick', name: 'HAT TRICK', text: 'One skater scores three goals in the final', test: (ctx, a) => !!(ctx.s && ctx.s.sk.some(k => k.team === ctx.teams.indexOf(a) && k.goals >= 3)) },
  hub: { ok: false }, attract: { seconds: 25, setup(ctx) { ctx.w.attract = true; } },
  phases: ['period 1', 'period 2', 'overtime', 'shootout'],
  build(ctx) {
    const hs = ctx.humans, opp = O.matchOpponent('hockey', ctx.meet);
    const A = hs[0] || ctx.athletes.find(a => a.nation === (ctx.meet.mode === 'attract' ? 'SUN' : 'SUN')) || ctx.athletes[0];
    const B = hs[1] || ctx.athletes.find(a => a.nation === (ctx.meet.mode === 'attract' ? 'TRB' : opp) && a !== A) || ctx.athletes.find(a => a !== A);
    ctx.teams = [A, B];
    ctx.w.ctrl = new Map(); hs.forEach((h, i) => ctx.w.ctrl.set(h, { team: i % 2, idx: i < 2 ? 0 : 1 }));
    ctx.w.zamboni = -1; ctx.w.screenToWorld = () => { try { const m = game.mouseGround && game.mouseGround(); return m ? [m[0], m[1]] : null; } catch (e) { return null; } };
  },
  start(ctx) {
    const sk = [];
    ctx.teams.forEach((tm, t) => { for (let i = 0; i < 3; i++) { const rig = i === 0 ? O.makeRig(tm.nation, 'hockey') : O.makeRig(tm.nation, 'hockey', { mate: i - 1 }); sk.push({ team: t, i, goalie: i === 2, x: 0, y: 0, vx: 0, vy: 0, face: t ? Math.PI : 0, rig, name: i === 0 ? tm.name : O.mateName(tm.nation, i - 1), down: 0, stam: 1, charge: 0, check: 0, checkCD: 0, goals: 0, ai: {} }); } });
    ctx.s = { phase: 'faceoff', pt: 0, period: 1, clock: ctx.T.periodLength, score: [0, 0], sk, puck: { x: 0, y: 0, vx: 0, vy: 0, owner: null, fire: false, cd: 0, last: null, lastTeam: null }, fire: [0, 0], streak: [0, 0], shoot: null, ot: false, msg: null, msgT: 0, lightT: 0, glassT: 0, shotsOn: [0, 0] };
    faceoff(ctx);
  },
  step(ctx, dt) {
    const s = ctx.s, T = ctx.T; s.pt += dt; if (s.msgT > 0) s.msgT -= dt; if (s.lightT > 0) s.lightT -= dt; if (s.glassT > 0) s.glassT -= dt;
    if (s.phase === 'done') return;
    if (s.phase === 'faceoff') { if (s.pt > (ctx.meet.mode === 'attract' ? .4 : 1.2)) { s.phase = 'play'; s.pt = 0; ctx.sfx('whistle'); ctx.cue('faceoff', {}, { cool: 30 }); } settleSkaters(ctx, dt); return; }
    if (s.phase === 'goal') { if (s.pt > (O.sandbox ? 0 : 3)) { if (s.shoot) shootoutNext(ctx); else if (s.ot) endMatch(ctx); else faceoff(ctx); } moveAll(ctx, dt, true); return; }
    if (s.phase === 'intermission') { ctx.w.zamboni = s.pt / 4; if (s.pt > (O.sandbox ? 0 : 4)) { ctx.w.zamboni = -1; s.period++; s.clock = T.periodLength; faceoff(ctx); } return; }
    if (s.phase === 'final') { if (s.pt > (O.sandbox ? 0 : 3)) s.phase = 'done'; return; }
    // play
    if (!s.shoot) { s.clock -= dt; if (s.clock <= 0) return periodEnd(ctx); }
    else { s.shoot.t -= dt; if (s.shoot.t <= 0 && !s.puck.owner && s.phase === 'play') { s.msg = 'NO GOAL'; s.msgT = 1; s.phase = 'goal'; s.pt = 0; } else if (s.shoot.t <= 0 && s.puck.owner) { s.msg = 'TIME!'; s.msgT = 1; s.phase = 'goal'; s.pt = 0; } }
    for (let t = 0; t < 2; t++) if (s.fire[t] > 0) { s.fire[t] -= dt; if (s.fire[t] <= 0) { s.puck.fire = false; } }
    controlAll(ctx, dt);
    moveAll(ctx, dt, false);
    puckStep(ctx, dt);
    if (!O.sandbox) animate(ctx, dt);
  },
  done: ctx => ctx.s.phase === 'done',
  perf: (ctx, a) => ctx.teams.includes(a) ? ctx.s.score[ctx.teams.indexOf(a)] : null,
  placings(ctx) {
    const s = ctx.s, [A, B] = ctx.teams, win = s.score[0] > s.score[1] ? 0 : s.score[1] > s.score[0] ? 1 : (s.shoot && s.shoot.goals[0] > s.shoot.goals[1] ? 0 : 1), rest = O.Sim.placings('hockey', ctx.athletes.filter(a => !ctx.teams.includes(a)).map(a => a.nation), ctx.rng('place'));
    ctx.teams[win].matchRank = 1; ctx.teams[1 - win].matchRank = 2;
    ctx.athletes.forEach(a => { if (!ctx.teams.includes(a)) a.matchRank = 3 + rest.indexOf(a.nation); });
    [A, B].forEach((t, i) => { t.matchPerf = s.score[i]; t.matchDisplay = (i === win ? 'WON ' : 'LOST ') + s.score[i] + '–' + s.score[1 - i] + (s.shoot ? ' (SO)' : s.ot ? ' (OT)' : ''); t.matchPoints = (i === win ? 1150 : 750) + s.score[i] * 15; });
    ctx.athletes.forEach(a => { if (!ctx.teams.includes(a)) { a.matchPerf = null; a.matchDisplay = a.matchRank === 3 ? 'BRONZE MATCH' : ''; a.matchPoints = Math.max(0, 600 - (a.matchRank - 3) * 80); } });
  },
  bot(ctx, a, dt) {
    const s = ctx.s, I = O.blankIntent(); if (!s || !ctx.w.ctrl.has(a)) return I;
    const c = ctx.w.ctrl.get(a), k = s.sk.find(q => q.team === c.team && q.i === c.idx); if (!k) return I;
    const plan = aiPlan(ctx, k, a.cheat === 'perfect' ? .99 : .9, dt); I.mv = plan.mv; if (plan.pass) I.L = true; if (plan.check) I.R = true; if (plan.shootHold) I.Ad = true; if (plan.shootRelease) { I.Au = true; I.Ad = false; } if (plan.burst) I.Xd = true; if (a.hype >= 1 && k === s.puck.owner) I.T = true;
    return I;
  },
  onTurbo(ctx, a) { const t = ctx.teams.indexOf(a); if (t >= 0) onFire(ctx, t); },
  cam(ctx, dt) { const s = ctx.s; const p = s ? s.puck : { x: 0, y: 0 }, tx = clamp(p.x + p.vx * .15, -HL + 110, HL - 110), ty = clamp(p.y, -HW + 50, HW - 30); const w = ctx.w; w.cx = w.cx === undefined ? tx : w.cx + (tx - w.cx) * Math.min(1, dt * 4); w.cy = w.cy === undefined ? ty : w.cy + (ty - w.cy) * Math.min(1, dt * 4); game.focus(w.cx, w.cy, 0); },
  draw(ctx, r) {
    const s = ctx.s, g = r.ctx, t = game.real;
    game.lights.enabled = true; game.lights.ambient = .5;
    px.rect(g, 0, 0, r.bw, r.bh, '#0a0814');
    const top = r.w(0, -HW - 20, 0)[1]; Art.stands(g, 0, Math.max(-200, top - 110), r.bw, top, { tiers: 3, seed: 111, scroll: r.ix, dark: true, bg: '#14101e', lip: '#221a2e', rail: '#5a5a7a' });
    // the ice and its markings
    Art.quad(r, [[-HL, -HW, 0], [HL, -HW, 0], [HL, HW, 0], [-HL, HW, 0]], '#eef6fb');
    for (let i = 0; i < 60; i++) { const h = O.hash('hk' + i), x = (h % (HL * 2)) - HL, y = ((h >>> 9) % (HW * 2)) - HW; Art.wline(r, [x, y, 0], [x + (h % 9) - 4, y + 3, 0], '#d8e6f0'); }
    Art.wline(r, [0, -HW, 0], [0, HW, 0], '#e23b2e', 3); for (const bx of [-60, 60]) Art.wline(r, [bx, -HW, 0], [bx, HW, 0], '#2f6fd8', 3);
    for (const gx of [-NETX, NETX]) Art.wline(r, [gx, -HW + 10, 0], [gx, HW - 10, 0], '#e23b2e', 1);
    for (const [cx, cy, rr] of [[0, 0, 30], [-120, -50, 22], [-120, 50, 22], [120, -50, 22], [120, 50, 22]]) { const pts = r.groundPts(cx, cy, rr, 28); for (let i = 0; i < pts.length; i++) { const a0 = pts[i], b0 = pts[(i + 1) % pts.length]; px.line(g, a0[0], a0[1], b0[0], b0[1], cx ? '#e23b2e' : '#2f6fd8', 1); } }
    for (const gx of [-NETX, NETX]) { const sg = Math.sign(gx), pts = []; for (let k = 0; k <= 10; k++) { const an = -Math.PI / 2 + k / 10 * Math.PI; pts.push(r.w(gx - sg * Math.cos(an) * 22, Math.sin(an) * 22, 0)); } pts.push(r.w(gx, 22, 0)); px.poly(g, pts, '#a8c8f0'); }
    // boards with the glass on top
    for (let x = -HL; x < HL; x += 20) { r.queue(x + 10, -HW, 0, gg => { r.box(gg, x, -HW - 4, 0, x + 20, -HW, 10, '#f4f4f4', '#2f7fe0'); const a0 = r.w(x, -HW - 2, 10), b0 = r.w(x + 20, -HW - 2, 26); px.blend(gg, .25 + (s && s.glassT > 0 ? .2 : 0), 'normal', () => px.rect(gg, a0[0], b0[1] + (s && s.glassT > 0 ? Math.round(Math.sin(t * 60) * 1) : 0), b0[0] - a0[0], a0[1] - b0[1], '#c8e8ff')); }); r.queue(x + 10, HW + 4, 0, gg => r.box(gg, x, HW, 0, x + 20, HW + 4, 7, '#f4f4f4', '#c8ccd8')); }
    for (const sx of [-1, 1]) r.queue(sx * HL, 0, 0, gg => r.box(gg, sx > 0 ? HL : -HL - 4, -HW, 0, sx > 0 ? HL + 4 : -HL, HW, 10, '#f4f4f4', '#2f7fe0'));
    // nets
    for (const gx of [-NETX, NETX]) { const sg = Math.sign(gx); r.queue(gx + sg * 6, 0, 0, gg => { const a0 = r.w(gx, -MOUTH, 0), b0 = r.w(gx, MOUTH, 0), c0 = r.w(gx + sg * 10, -MOUTH, 0), d0 = r.w(gx + sg * 10, MOUTH, 0), up = 1.161 * 16; px.blend(gg, .55, 'normal', () => px.poly(gg, [[a0[0], a0[1] - up], [b0[0], b0[1] - up], [d0[0], d0[1] - up * .6], [c0[0], c0[1] - up * .6]], '#ffffff')); for (const q of [a0, b0]) px.rect(gg, q[0] - 1, q[1] - up, 2, up, '#e23b2e'); px.line(gg, a0[0], a0[1] - up, b0[0], b0[1] - up, '#e23b2e', 2); }); }
    // goal light
    if (s && s.lightT > 0) for (const gx of [-NETX, NETX]) if (Math.sign(gx) === s.lightSide) { const p = r.w(gx + Math.sign(gx) * 14, 0, 30); r.glowDisc(g, p[0], p[1], 30, '#ff3a2a', .8 * (Math.floor(t * 8) % 2)); }
    // the resurfacing machine at intermission
    if (ctx.w.zamboni >= 0) { const x = lerp(-HL, HL, ctx.w.zamboni); r.queue(x, 0, 0, gg => { r.box(gg, x - 18, -10, 0, x + 18, 10, 16, '#e8ecf4', '#2f7fe0'); const p = r.w(x, 0, 18); E.font.text(gg, 'ICE 2000', p[0] - 18, p[1] - 4, '#14182e', { font: 'tiny', outline: false }); }); Art.quad(r, [[-HL, -HW, 0], [x - 18, -HW, 0], [x - 18, HW, 0], [-HL, HW, 0]], '#f8fcff'); }
    game.lights.add(s ? s.puck.x : 0, s ? s.puck.y : 0, 30, 140, .9, { color: '#ffffff' }); for (const lx of [-120, 0, 120]) game.lights.add(lx, 0, 60, 160, .6, { color: '#e8f0ff' });
    if (!s) return;
    // skaters and the puck
    for (const k of s.sk) {
      const tm = ctx.teams[k.team], hum = humanOf(ctx, k), z = 0;
      r.shadow(k.x, k.y, 6, .4);
      r.actor(k.x, k.y, z, (gg, ox, oy) => { k.rig.draw(gg, ox, oy, r.view); O.Gear.stick(gg, k.rig, r.view, ox, oy, { color: s.fire[k.team] > 0 && s.puck.owner === k ? '#ff7a1a' : '#d8b070' }); }, { flash: k.down > 0 ? '#ffffff' : undefined, flashMix: .3 });
      if (hum) r.queue(k.x, k.y, 40, gg => { const p = r.w(k.x, k.y, 40); px.poly(gg, [[p[0] - 4, p[1] - 6], [p[0] + 4, p[1] - 6], [p[0], p[1]]], hum.color); E.font.text(gg, 'P' + (hum.player + 1), p[0] - 5, p[1] - 14, hum.color, { font: 'tiny', outline: '#000' }); }, { bias: 50 });
      if (k.charge > 0) r.queue(k.x, k.y, 34, gg => { const p = r.w(k.x, k.y, 34); px.rect(gg, p[0] - 10, p[1], 20, 3, '#05060e'); px.rect(gg, p[0] - 10, p[1], Math.round(20 * k.charge), 3, '#ffe066'); }, { bias: 50 });
      void tm;
    }
    const p = s.puck; r.queue(p.x, p.y, 0, gg => { const q = r.w(p.x, p.y, 0); px.ell(gg, q[0], q[1], 3, 2, '#14161e'); px.rect(gg, q[0] - 1, q[1] - 2, 2, 1, '#5a5e6a'); }, { bias: 2 });
    if (p.fire && !O.sandbox && Math.floor(t * 40) % 2) game.particles.fire(p.x, p.y, 2, 1, { size: 3 });
  },
  hud(ctx, r, g) {
    const s = ctx.s, W = r.W, H = r.H; if (!s) return; const [A, B] = ctx.teams;
    // the centre-hung jumbotron: score and clock
    const jw = 150; Art.jumbo(g, W / 2 - jw / 2, 8, jw, 34, null, { draw: (jg, w, h) => { E.font.text(jg, A.nation + ' ' + s.score[0] + ' - ' + s.score[1] + ' ' + B.nation, Math.round(w / 2 - E.font.width(A.nation + ' ' + s.score[0] + ' - ' + s.score[1] + ' ' + B.nation, { font: 'tiny' }) / 2), 2, '#ffb020', { font: 'tiny', outline: false }); const cl = s.shoot ? 'SHOOTOUT' : (s.ot ? 'OT ' : 'P' + s.period + ' ') + Math.floor(Math.max(0, s.clock) / 60) + ':' + String(Math.floor(Math.max(0, s.clock) % 60)).padStart(2, '0'); E.font.text(jg, cl, Math.round(w / 2 - E.font.width(cl, { font: 'tiny' }) / 2), 9, '#ffffff', { font: 'tiny', outline: false }); } });
    Art.flag(g, W / 2 - jw / 2 - 26, 14, 21, 14, A.nation); Art.flag(g, W / 2 + jw / 2 + 5, 14, 21, 14, B.nation);
    if (s.shoot) { UI.text(g, 'SHOOTOUT ' + s.shoot.goals[0] + ' - ' + s.shoot.goals[1] + ' · ROUND ' + (Math.floor(s.shoot.n / 2) + 1), W / 2 - 80, 46, '#ffe066'); UI.text(g, s.shoot.t.toFixed(1) + ' s', W / 2 - 10, 58, '#ffffff'); }
    if (s.msgT > 0 && s.msg) UI.text(g, s.msg, W / 2 - UI.tw(s.msg, 3) / 2, H / 2 - 40, '#ffe066', { scale: 3 });
    if (s.phase === 'intermission') UI.text(g, 'INTERMISSION', W / 2 - UI.tw('INTERMISSION', 3) / 2, H / 2 - 20, '#ffffff', { scale: 3 });
    for (const h of ctx.humans) { const c = ctx.w.ctrl.get(h); if (!c) continue; const k = s.sk.find(q => q.team === c.team && q.i === c.idx), x = 12 + h.player * 110; UI.panel(g, x, H - 40, 104, 34, { trim: h.color, alpha: .75 }); UI.text(g, 'P' + (h.player + 1) + ' ' + O.shortName(k ? k.name : ''), x + 4, H - 36, h.color); UI.text(g, 'BURST', x + 4, H - 24, '#ffffff'); UI.bar(g, x + 36, H - 23, 34, 4, k ? k.stam : 0, '#7fb2ff'); O.HUD.flame(g, x + 4, H - 14, h, { w: 40 }); }
    if (ctx.humans.length) { const h = ctx.humans[0], c = ctx.w.ctrl.get(h), k = s.sk.find(q => q.team === c.team && q.i === c.idx), has = k && s.puck.owner === k; O.Prompt.strip(g, has ? [['action', 'HOLD: SHOOT'], ['mashL', 'PASS']] : [['mashR', 'CHECK / SWITCH'], ['alt', 'BURST']], W / 2 + 70, H - 22, { inp: h.inp }); }
  }
});

function humanOf(ctx, k) { for (const [h, c] of ctx.w.ctrl) if (c.team === k.team && c.idx === k.i) return h; return null; }
function faceoff(ctx) {
  const s = ctx.s; s.phase = 'faceoff'; s.pt = 0;
  for (const k of s.sk) { k.vx = k.vy = 0; k.down = 0; k.charge = 0; const sg = k.team ? 1 : -1; if (k.goalie) { k.x = sg * (NETX - 12); k.y = 0; } else { k.x = sg * (k.i === 0 ? 14 : 70); k.y = k.i === 0 ? 0 : (k.team ? -40 : 40); } k.face = k.team ? Math.PI : 0; }
  const fr = ctx.rng('faceoff:' + (s.score[0] + s.score[1]) + ':' + s.period); Object.assign(s.puck, { x: 0, y: 0, vx: (fr() < .5 ? -1 : 1) * (30 + fr() * 30), vy: (fr() - .5) * 60, owner: null, cd: .25 });
}
function settleSkaters(ctx, dt) { if (!O.sandbox) animate(ctx, dt); }
function periodEnd(ctx) {
  const s = ctx.s; ctx.sfx('buzzer');
  if (!s.ot && s.period < 2) { s.phase = 'intermission'; s.pt = 0; ctx.cue('period', {}); return; }
  if (s.score[0] !== s.score[1]) return endMatch(ctx);
  if (!s.ot) { s.ot = true; s.clock = ctx.T.periodLength; s.msg = 'OVERTIME!'; s.msgT = 2; ctx.cue('overtime', {}, { prio: 4 }); faceoff(ctx); return; }
  startShootout(ctx);
}
function endMatch(ctx) { const s = ctx.s; s.phase = 'final'; s.pt = 0; const w = s.score[0] > s.score[1] ? 0 : s.score[1] > s.score[0] ? 1 : (s.shoot && s.shoot.goals[0] > s.shoot.goals[1] ? 0 : 1); s.msg = ctx.teams[w].nationName + ' WINS!'; s.msgT = 3; ctx.sfx('horn'); if (!O.sandbox) O.CrowdAudio.cheer(); }
function startShootout(ctx) { const s = ctx.s; s.shoot = { n: 0, goals: [0, 0], t: 6 }; s.msg = 'SHOOTOUT!'; s.msgT = 2; ctx.cue('shootout', {}, { prio: 4 }); shootoutSetup(ctx); }
function shootoutSetup(ctx) {
  const s = ctx.s, sh = s.shoot, team = sh.n % 2; s.phase = 'play'; s.pt = 0; sh.t = 6; sh.team = team;
  for (const k of s.sk) { k.vx = k.vy = 0; k.down = 0; k.charge = 0; k.x = k.team === team ? (k.goalie ? (team ? 1 : -1) * (NETX - 12) : (k.i === 0 ? 0 : (team ? 1 : -1) * 160)) : (k.goalie ? (team ? -1 : 1) * (NETX - 12) : (team ? -1 : 1) * 170); k.y = k.i === 1 ? (k.team ? 80 : -80) : 0; if (k.i === 1 || (k.team !== team && !k.goalie)) k.x = k.team ? 190 : -190, k.y = k.team ? 90 : -90; }
  const shooter = s.sk.find(k => k.team === team && k.i === 0); Object.assign(s.puck, { x: shooter.x + (team ? -8 : 8), y: 0, vx: 0, vy: 0, owner: shooter, cd: 0 });
}
function shootoutNext(ctx) {
  const s = ctx.s, sh = s.shoot; sh.n++;
  const rounds = Math.floor(sh.n / 2), a = sh.goals[0], b = sh.goals[1], left = Math.max(0, 3 - Math.ceil(sh.n / 2));
  if (sh.n % 2 === 0 && (rounds >= 3 ? a !== b : Math.abs(a - b) > left)) { if (a > b) s.score[0]++; else s.score[1]++; return endMatch(ctx); }
  if (sh.n % 2 === 1 && rounds < 3 && (a > b + left + 1 || b > a + left)) { if (a > b) s.score[0]++; else s.score[1]++; return endMatch(ctx); }
  if (sh.n > 40) { s.score[0]++; return endMatch(ctx); }
  shootoutSetup(ctx);
}
function onFire(ctx, t) { const s = ctx.s; s.fire[t] = 8; s.puck.fire = !!(s.puck.owner && s.puck.owner.team === t); ctx.cue('fire', { name: ctx.teams[t].name, nation: ctx.teams[t].nationName }, { prio: 4 }); }

// control: humans drive their skater from their intent; everything else is the AI
function controlAll(ctx, dt) {
  const s = ctx.s;
  for (const k of s.sk) {
    k.cmd = null; if (k.down > 0) continue;
    const h = humanOf(ctx, k);
    if (h && !(s.shoot && k.team !== s.shoot.team && !k.goalie)) {
      const I = h.I; k.cmd = { mv: I.mv, pass: I.L, check: I.R, hold: I.Ad, release: I.Au, burst: I.Xd, aim: I.aim };
      if (I.R && s.puck.owner !== k && s.puck.owner && s.puck.owner.team !== k.team) {/* a check */}
      else if (I.R && s.puck.owner !== k) { const mate = s.sk.find(q => q.team === k.team && !q.goalie && q !== k), dm = Math.hypot(mate.x - s.puck.x, mate.y - s.puck.y), dk = Math.hypot(k.x - s.puck.x, k.y - s.puck.y); if (dm + 30 < dk && !s.shoot) { const c = ctx.w.ctrl.get(h); c.idx = mate.i; k.cmd = null; ctx.sfx('select'); continue; } }
    } else if (k.goalie) k.cmd = goalieCmd(ctx, k);
    else { const p = aiPlan(ctx, k, ctx.teams[k.team].cheat === 'perfect' ? .99 : ctx.teams[k.team].skill, dt); k.cmd = { mv: p.mv, pass: p.pass, check: p.check, hold: p.shootHold, release: p.shootRelease, burst: p.burst }; if (p.fire && ctx.teams[k.team].hype >= 1 && !(s.fire[k.team] > 0)) { ctx.teams[k.team].hype = 0; onFire(ctx, k.team); } }
  }
}
function aiPlan(ctx, k, skill, dt) {
  const s = ctx.s, P = s.puck, me = k.team, sg = me ? -1 : 1, oppNet = { x: sg * NETX, y: 0 }, out = { mv: [0, 0] }, ai = k.ai;
  const mate = s.sk.find(q => q.team === me && !q.goalie && q !== k), opp = s.sk.filter(q => q.team !== me && !q.goalie);
  const to = (x, y, sp = 1) => { const dx = x - k.x, dy = y - k.y, d = Math.hypot(dx, dy); out.mv = d > 4 ? [dx / d * sp, dy / d * sp] : [0, 0]; return d; };
  ai.react = (ai.react || 0) - dt; const slow = (1 - skill) * .5;
  if (P.owner === k) {
    const dNet = Math.hypot(oppNet.x - k.x, oppNet.y - k.y), pressed = opp.some(o => Math.hypot(o.x - k.x, o.y - k.y) < 26);
    to(oppNet.x - sg * 50, clamp(k.y * .6, -40, 40));
    if (dNet < 130 && Math.abs(k.y) < 55 && Math.abs(k.x) < NETX - 45) { ai.charge = (ai.charge || 0) + dt; out.shootHold = true; if (ai.charge > .2 + skill * .4) { out.shootHold = false; out.shootRelease = true; ai.charge = 0; } }
    else if (pressed && mate && !s.shoot && ctx.rng('pass:' + Math.floor(s.pt * 4))() < .5 + skill * .3 && mate.down <= 0) out.pass = true;
    out.burst = dNet > 140 && k.stam > .4;
    out.fire = true;
    return out;
  }
  if (P.owner && P.owner.team === me) { to(oppNet.x - sg * 70, P.owner.y > 0 ? -35 : 35); return out; }
  // chase the loose puck (the nearer of the two) or mark an opponent
  const dMe = Math.hypot(P.x - k.x, P.y - k.y), dMate = mate ? Math.hypot(P.x - mate.x, P.y - mate.y) : 1e9;
  if (dMe <= dMate || (P.owner && P.owner.team !== me && dMe < 60)) {
    const lead = .25 + slow, tx = P.x + P.vx * lead, ty = P.y + P.vy * lead; const d = to(tx, ty, ai.react > 0 ? .4 : 1);
    if (P.owner && P.owner.team !== me && d < 22 && k.checkCD <= 0 && ctx.rng('chk:' + k.team + k.i + Math.floor(s.pt * 3))() < .25 + skill * .5) out.check = true;
    out.burst = d > 50 && k.stam > .5;
  } else { const own = { x: -sg * NETX, y: 0 }; to(lerp(own.x, P.x, .55), P.y * .5); }
  return out;
}
function goalieCmd(ctx, k) {
  const s = ctx.s, P = s.puck, sg = k.team ? 1 : -1, gx = sg * (NETX - 10), skill = ctx.teams[k.team].cheat === 'perfect' ? .99 : ctx.teams[k.team].skill, fire = s.fire[1 - k.team] > 0;
  let ty = clamp(P.y * .55, -MOUTH + 3, MOUTH - 3); const tx = gx - sg * clamp(Math.abs(P.y) * .05, 0, 6);
  if (!P.owner && P.shot && Math.sign(P.vx) === sg && Math.abs(P.vx) > 1) { k.ai.seen = (k.ai.seen || 0) + 1 / 120; if (k.ai.seen > .05 * (1.5 - skill)) ty = clamp(P.y + P.vy * (k.x - P.x) / P.vx, -MOUTH - 2, MOUTH + 2); } else k.ai.seen = 0;
  const sp = ctx.T.goalieSpeed * (.55 + .45 * skill) * (fire ? .5 : 1), dx = tx - k.x, dy = ty - k.y, d = Math.hypot(dx, dy);
  return { mv: d > 1 ? [dx / d * Math.min(1, d / 6), dy / d * Math.min(1, d / 6)] : [0, 0], goalieSpeed: sp };
}
function moveAll(ctx, dt, coast) {
  const s = ctx.s, T = ctx.T;
  for (const k of s.sk) {
    if (k.down > 0) { k.down -= dt; k.vx *= Math.pow(.2, dt); k.vy *= Math.pow(.2, dt); }
    else if (!coast && k.cmd) {
      const c = k.cmd, burst = c.burst && k.stam > .05, max = k.goalie ? c.goalieSpeed || 60 : T.skateMax * (burst ? 1.35 : 1), acc = T.skateAccel * (k.goalie ? 1.4 : 1);
      if (burst) k.stam = Math.max(0, k.stam - dt * .45); else k.stam = Math.min(1, k.stam + dt * .18);
      const m = c.mv || [0, 0], ml = Math.hypot(m[0], m[1]);
      if (ml > .1) { k.vx += m[0] * acc * dt; k.vy += m[1] * acc * dt; k.face = Math.atan2(m[1], m[0]); }
      else { k.vx *= Math.pow(.35, dt); k.vy *= Math.pow(.35, dt); }
      const v = Math.hypot(k.vx, k.vy); if (v > max) { k.vx *= max / v; k.vy *= max / v; }
      actions(ctx, k, c, dt);
    } else { k.vx *= Math.pow(.4, dt); k.vy *= Math.pow(.4, dt); }
    if (k.checkCD > 0) k.checkCD -= dt; if (k.check > 0) k.check -= dt;
    k.x += k.vx * dt; k.y += k.vy * dt;
    if (k.goalie) { const sg = k.team ? 1 : -1; k.x = clamp(k.x, sg > 0 ? NETX - 30 : -NETX + 2, sg > 0 ? NETX - 2 : -NETX + 30); k.y = clamp(k.y, -MOUTH - 4, MOUTH + 4); }
    if (Math.abs(k.x) > HL - SR) { k.x = Math.sign(k.x) * (HL - SR); k.vx *= -.3; } if (Math.abs(k.y) > HW - SR) { if (k.hitT > 0) { glass(ctx, k); } k.y = Math.sign(k.y) * (HW - SR); k.vy *= -.3; }
    if (k.hitT > 0) k.hitT -= dt;
  }
  // bodies don't overlap
  for (let i = 0; i < s.sk.length; i++) for (let j = i + 1; j < s.sk.length; j++) { const a = s.sk[i], b = s.sk[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); if (d > 0 && d < SR * 2) { const o = (SR * 2 - d) / 2; a.x -= dx / d * o; a.y -= dy / d * o; b.x += dx / d * o; b.y += dy / d * o; } }
}
function actions(ctx, k, c, dt) {
  const s = ctx.s, P = s.puck, T = ctx.T, sg = k.team ? -1 : 1;
  if (P.owner === k) {
    if (c.hold) { k.charge = Math.min(1, k.charge + dt * 1.6); }
    if (c.release && k.charge > 0 || (k.charge >= 1 && !c.hold)) shoot(ctx, k, c);
    else if (c.pass) pass(ctx, k, c);
    return;
  }
  k.charge = 0;
  if (c.check && k.checkCD <= 0) {
    k.checkCD = .9; k.check = .3; ctx.sfx('whoosh', { vol: .4 });
    const tgt = s.sk.filter(q => q.team !== k.team && !q.goalie && q.down <= 0).map(q => ({ q, d: Math.hypot(q.x - k.x, q.y - k.y) })).sort((a, b) => a.d - b.d)[0];
    if (tgt && tgt.d < 26 && !O.god(humanOf(ctx, tgt.q))) { const q = tgt.q, nx = (q.x - k.x) / Math.max(1, tgt.d), ny = (q.y - k.y) / Math.max(1, tgt.d); k.vx += nx * 140; k.vy += ny * 140; q.down = 1 * T.checkPower; q.hitT = .5; q.vx += nx * 160 * T.checkPower; q.vy += ny * 160 * T.checkPower; ctx.sfx('check'); ctx.shake(3); ctx.cue('check', {}, { cool: 6 }); ctx.hype(ctx.teams[k.team], .12); if (P.owner === q) { P.owner = null; P.vx = nx * 90; P.vy = ny * 90 + 40; P.cd = .3; } if (humanOf(ctx, q)) { ctx.yikes(humanOf(ctx, q), 'glass', { quiet: Math.abs(q.y) < HW - 30 }); } }
  }
}
function glass(ctx, k) { const s = ctx.s; s.glassT = .5; ctx.sfx('glass'); if (!O.sandbox) { O.CrowdAudio.gasp(); ctx.cue('check', {}, { prio: 4 }); } k.hitT = 0; const h = humanOf(ctx, k); if (h) ctx.yikes(h, 'glass'); }
function shoot(ctx, k, c) {
  const s = ctx.s, P = s.puck, T = ctx.T, sg = k.team ? -1 : 1, net = { x: sg * (NETX + 4), y: 0 };
  const gl = s.sk.find(q => q.team !== k.team && q.goalie), human = !!humanOf(ctx, k), sk2 = ctx.teams[k.team].cheat ? 1 : ctx.teams[k.team].skill, noise = O.gauss(ctx.rng('aim:' + Math.floor(s.pt * 10) + k.team + k.i));
  let tx = net.x, ty = human ? clamp((c.mv ? c.mv[1] : 0) * 15, -MOUTH + 2, MOUTH - 2) : (ctx.rng('pick:' + Math.floor(s.pt * 7))() < sk2 ? (gl.y > 0 ? -1 : 1) * (MOUTH - 6) : (noise * 8)) + noise * (1 - sk2) * 12;
  if (c.aim && ctx.w.screenToWorld) { const w = ctx.w.screenToWorld(c.aim); if (w) { tx = w[0]; ty = w[1]; } }
  const dx = tx - P.x, dy = ty - P.y, d = Math.hypot(dx, dy) || 1, sp = (T.shotPower * (.55 + .6 * k.charge)) * (s.fire[k.team] > 0 ? 1.4 : 1);
  P.owner = null; P.vx = dx / d * sp; P.vy = dy / d * sp; P.cd = .2; P.last = k; P.lastTeam = k.team; P.shot = true; P.fire = s.fire[k.team] > 0;
  k.charge = 0; ctx.sfx('thwack'); s.shotsOn[k.team]++;
  if (k.rig && !O.sandbox) k.rig.kick(.5);
}
function pass(ctx, k, c) {
  const s = ctx.s, P = s.puck, mate = s.sk.find(q => q.team === k.team && !q.goalie && q !== k); if (!mate) return;
  let tx = mate.x + mate.vx * .35, ty = mate.y + mate.vy * .35;
  if (c.aim && ctx.w.screenToWorld) { const w = ctx.w.screenToWorld(c.aim); if (w) { tx = w[0]; ty = w[1]; } }
  const dx = tx - P.x, dy = ty - P.y, d = Math.hypot(dx, dy) || 1, sp = clamp(d * 2.6, 140, 260);
  P.owner = null; P.vx = dx / d * sp; P.vy = dy / d * sp; P.cd = .18; P.last = k; P.lastTeam = k.team; P.shot = false; P.pass = { from: k, to: mate };
  ctx.sfx('puck');
}
function puckStep(ctx, dt) {
  const s = ctx.s, P = s.puck, T = ctx.T;
  if (P.cd > 0) P.cd -= dt;
  if (P.owner) { const k = P.owner; P.x = k.x + Math.cos(k.face) * 9; P.y = k.y + Math.sin(k.face) * 9; P.vx = k.vx; P.vy = k.vy; if (k.down > 0) { P.owner = null; P.cd = .3; } return; }
  const sub = 3; for (let n = 0; n < sub; n++) {
    const h = dt / sub; P.x += P.vx * h; P.y += P.vy * h; const f = Math.pow(Math.exp(-T.puckFriction), h); P.vx *= f; P.vy *= f;
    if (Math.abs(P.y) > HW - PR) { P.y = Math.sign(P.y) * (HW - PR); P.vy *= -.65; ctx.sfx('puck'); }
    // the goalies: a puck heading for the net is saved where it passes the goalie, if it passes close enough
    for (const g of s.sk) { if (!g.goalie || g.down > 0) continue; const toNet = g.team ? 1 : -1; if (Math.sign(P.vx) !== toNet) continue; const was = P.x - P.vx * h; if ((P.x - g.x) * (was - g.x) <= 0 && Math.abs(P.y - g.y) < 11 * (s.fire[1 - g.team] > 0 ? .55 : 1) && P.shot !== false) { save(ctx, g); return; } }
    // the goal line: goal, save or the boards
    for (const gx of [-NETX, NETX]) {
      const crossed = (P.x - gx) * (P.x - P.vx * h - gx) <= 0 && Math.sign(P.vx) === Math.sign(gx);
      if (crossed && Math.abs(P.y) < MOUTH) {
        const gTeam = gx > 0 ? 1 : 0, goalie = s.sk.find(q => q.team === gTeam && q.goalie), fire = s.fire[1 - gTeam] > 0;
        const reach = (goalie.down > 0 ? 0 : 6) * (fire ? .55 : 1), dGo = Math.abs(goalie.y - P.y) + Math.max(0, Math.abs(goalie.x - gx) - 10);
        if (dGo < reach) { save(ctx, goalie); return; }
        return goal(ctx, 1 - gTeam);
      }
    }
    if (Math.abs(P.x) > HL - PR) { P.x = Math.sign(P.x) * (HL - PR); P.vx *= -.65; ctx.sfx('puck'); }
  }
  // pickups
  if (P.cd <= 0) {
    let best = null; for (const k of s.sk) { if (k.down > 0) continue; const d = Math.hypot(k.x + Math.cos(k.face) * 6 - P.x, k.y + Math.sin(k.face) * 6 - P.y); if (d < (k.goalie ? 9 : 11) && (!best || d < best.d)) best = { k, d }; }
    if (best) {
      const k = best.k;
      if (k.goalie) { if (Math.hypot(P.vx, P.vy) > 120 && P.shot) return save(ctx, k); P.owner = null; P.vx = (k.team ? -1 : 1) * 120; P.vy = (O.hash('g' + Math.floor(s.pt * 10)) % 2 ? 1 : -1) * 60; P.cd = .3; return; }
      const passOk = P.pass && P.pass.to === k; P.owner = k; P.pass = null; P.shot = false;
      if (passOk) { s.streak[k.team]++; ctx.hype(ctx.teams[k.team], .08); if (s.streak[k.team] >= 3 && !(s.fire[k.team] > 0)) { s.streak[k.team] = 0; onFire(ctx, k.team); } }
      if (P.lastTeam !== k.team) s.streak[1 - k.team] = 0;
      P.fire = s.fire[k.team] > 0; ctx.sfx('puck', { vol: .5 });
    }
  }
}
function save(ctx, g) { const s = ctx.s, P = s.puck; P.vx = -P.vx * .35 + (g.team ? -40 : 40); P.vy = (P.y >= g.y ? 1 : -1) * 90; P.cd = .25; P.shot = false; ctx.sfx('thunk'); ctx.cue('save', {}, { cool: 5 }); if (Math.abs(P.vx) < 60 && ctx.rng('freeze' + Math.floor(s.pt))() < .15 && !s.shoot) { s.msg = 'FROZEN!'; s.msgT = 1; return faceoff(ctx); } if (s.shoot) { s.msg = 'SAVED!'; s.msgT = 1.2; s.phase = 'goal'; s.pt = 0; } }
function goal(ctx, team) {
  const s = ctx.s, P = s.puck, scorer = P.last;
  if (s.shoot) { if (team === s.shoot.team) s.shoot.goals[team]++; s.msg = team === s.shoot.team ? 'GOAL!' : 'NO GOAL'; s.msgT = 1.2; s.phase = 'goal'; s.pt = 0; s.lightT = 2; s.lightSide = team ? -1 : 1; ctx.sfx('horn'); return; }
  s.score[team]++; s.phase = 'goal'; s.pt = 0; s.lightT = 3; s.lightSide = team ? -1 : 1; s.lastGoalTeam = team;
  const own = scorer && scorer.team !== team; if (scorer && !own) scorer.goals++;
  s.msg = own ? 'OWN GOAL!' : 'GOAL!'; s.msgT = 2.5; P.vx *= .1; P.vy *= .1; P.fire = false; s.fire[team] = 0;
  ctx.sfx('horn'); ctx.shake(3); if (!O.sandbox) { O.CrowdAudio.cheer(); O.Crowd.startWave(); O.Music.sting('horn'); }
  const capt = ctx.teams[team]; ctx.hype(capt, .25);
  if (own) { const h = humanOf(ctx, scorer); if (h) ctx.yikes(h, 'owngoal'); } else ctx.cue('goal', { name: scorer ? scorer.name : capt.name, nation: capt.nationName }, { prio: 4 });
  if (s.ot) { /* sudden death: the goal phase ends the match */ }
}
function animate(ctx, dt) {
  const s = ctx.s;
  for (const k of s.sk) {
    const st = { x: k.x, y: k.y, z: 0, facing: k.face, vx: k.vx, vy: k.vy };
    if (k.down > 0) { O.Pose.clear(k.rig, { snap: true }); st.down = 1; st.vx = st.vy = 0; }
    else if (k.goalie) O.Pose.set(k.rig, 'goalie');
    else if (s.phase === 'goal' && s.lastGoalTeam === k.team) { O.Pose.set(k.rig, 'hockey'); st.pose = 'cheer'; }
    else { O.Pose.set(k.rig, 'hockey', { wind: k.charge > .1 }); if (k.check > 0) st.dash = true; }
    if (s.phase === 'final') { O.Pose.clear(k.rig); st.pose = s.score[k.team] > s.score[1 - k.team] ? 'cheer' : 'hips'; st.vx = st.vy = 0; }
    k.rig.update(dt, st);
  }
}
})();
