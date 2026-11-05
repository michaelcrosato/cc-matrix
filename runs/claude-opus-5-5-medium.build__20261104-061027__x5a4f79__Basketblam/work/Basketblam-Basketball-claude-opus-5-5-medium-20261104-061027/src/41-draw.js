/* DRAW: the match in the world (court scene, twists, power-ups, hoops, players, the ball and its shadow and trail, the
 * referee at the tip) and the broadcast HUD (score bug with player plates, the clocks, the release meter, the
 * announcers' lower third, banners, break cards, the sponsor break, the final). */
const NPC_RIGS = {};
const npcRig = id => NPC_RIGS[id] || (NPC_RIGS[id] = (() => { const n = get('npc', id), p = get('player', id); return n ? dressRig(n, null) : p ? dressRig(p, p.team) : dressRig(get('npc', 'vinnie'), null); })());
const BALL_ART = (() => { const frames = []; for (let f = 0; f < 4; f++) frames.push(f); return frames; })();
function drawBallAt(g, x, y, rot, glow) {
  const X = Math.round(x), Y = Math.round(y);
  px.disc(g, X, Y, 5, '#3a1606'); px.disc(g, X, Y, 4, glow ? '#ffb040' : '#e8641a'); px.disc(g, X - 1, Y - 1, 2, glow ? '#fff0a0' : '#ff9a4a');
  const a = rot % Math.PI, c = Math.cos(a) * 3.5, s = Math.sin(a) * 3.5;
  px.line(g, X - c, Y - s, X + c, Y + s, '#3a1606', 1); px.line(g, X - s * .6, Y + c * .6, X + s * .6, Y - c * .6, '#3a1606', 1);
  px.dot(g, X - 2, Y - 2, '#ffd0a0');
}
function puIcon(g, id, x, y, s = 1) {
  const c = get('powerup', id).color, X = Math.round(x), Y = Math.round(y);
  px.disc(g, X, Y, 6 * s, '#0a0612'); px.disc(g, X, Y, 5 * s, E.shade(c, -.2));
  const k = s;
  switch (id) {
    case 'rocket': px.rect(g, X - 3 * k, Y, 6 * k, 2 * k, '#ffffff'); px.rect(g, X + k, Y - 2 * k, 2 * k, 2 * k, '#ffffff'); px.rect(g, X - 4 * k, Y + 2 * k, 2 * k, 2 * k, '#ffd23a'); break;
    case 'glue': px.rect(g, X - 2 * k, Y - 2 * k, 4 * k, 4 * k, '#d8ffd8'); px.rect(g, X - 2 * k, Y + 2 * k, k, 2 * k, '#d8ffd8'); break;
    case 'laser': px.rect(g, X - 4 * k, Y, 8 * k, k, '#ffffff'); px.rect(g, X, Y - 4 * k, k, 8 * k, '#ffffff'); break;
    case 'moon': px.disc(g, X, Y - k, 3 * k, '#ffffff'); px.disc(g, X + k, Y - 2 * k, 2 * k, E.shade(c, -.2)); px.rect(g, X - 2 * k, Y + 2 * k, 4 * k, k, '#ffffff'); break;
    case 'bomb': px.disc(g, X, Y + k, 3 * k, '#1a1a1a'); px.rect(g, X + k, Y - 3 * k, k, 2 * k, '#ffd23a'); px.dot(g, X + 2 * k, Y - 4 * k, '#ff5a1a'); break;
    case 'gold': px.disc(g, X, Y, 3 * k, '#fff0a0'); px.dot(g, X - k, Y - k, '#ffffff'); break;
  }
}
function drawMatchWorld(r) {
  const m = S.match, b = S.ball, t = game.time; if (!m) return;
  drawCourtScene(r, S.court, t, FX.react);
  // twists on the floor
  if (m.jackpot) { const j = m.jackpot, pulse = .6 + Math.sin(t * 6) * .3; r.decal(() => { r.groundDisc(j.x, j.y, 16, '#ffd23a', .25 * pulse); r.groundRing(j.x, j.y, 16, '#ffd23a', 1); r.groundRing(j.x, j.y, 12, '#fff0a0', .6); }); L.add(j.x, j.y, 10, 50, .5, { color: '#ffd23a' }); }
  const tw0 = m.twist;
  if (tw0 && tw0.slicks) r.decal(g => { for (const s of tw0.slicks) { const pts = []; for (let k = 0; k < 18; k++) { const a = k / 18 * TAU; pts.push(r.w(s.x + Math.cos(a) * s.rx, s.y + Math.sin(a) * s.ry, 0)); } px.poly(g, pts, '#0e0c10'); const sh = (t * .4 + s.x * .01) % 1; px.blend(g, .35, 'add', () => { const q = []; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; q.push(r.w(s.x + Math.cos(a) * s.rx * .5 + (sh - .5) * s.rx, s.y + Math.sin(a) * s.ry * .3, 0)); } px.poly(g, q, ['#ff5ad8', '#5ae8ff', '#ffe05a'][Math.floor(t * 2 + s.x) % 3]); }); } });
  if (tw0 && tw0.kind === 'eruption') {
    for (const v of VENTS) { r.decal(() => { r.groundDisc(v.x, v.y, 12, '#1a0a08', .9); r.groundRing(v.x, v.y, 12, tw0.ventOn ? '#ffffff' : '#ff6a2a', .8); }); if (tw0.ventOn && S.fxRng() < .5) P.smoke(v.x + (S.fxRng() - .5) * 8, v.y, 4, 1, { size: 1.2, color: '#f0f0f0' }); }
    for (const bm of tw0.bombs) if (!bm.hit) { const k = 1 - bm.t / bm.max, pulse = Math.sin(t * 18) > 0; r.decal(() => { r.groundRing(bm.x, bm.y, 22, pulse ? '#ff3a1a' : '#ffb020', 1); r.groundDisc(bm.x, bm.y, 22 * k, '#ff3a1a', .3); }); r.queue(bm.x, bm.y, 160 * (1 - k), g => { const [x, y] = r.w(bm.x, bm.y, 160 * (bm.t / bm.max) + 4); px.disc(g, x, y, 4, '#ff7a1a'); px.disc(g, x, y, 2, '#fff0a0'); }, { emissive: true }); }
    L.add(XM, Y0 - 60, 80, 260, .4 + Math.sin(t * 3) * .1, { color: '#ff4a1a' });
  }
  // power-ups: a pulsing ring and the icon bobbing over it
  for (const pu of m.powerups) { const def = get('powerup', pu.id); r.decal(() => r.groundRing(pu.x, pu.y, 9 + Math.sin(t * 8) * 1.5, def.color, 1)); r.queue(pu.x, pu.y, 14, g => { const [x, y] = r.w(pu.x, pu.y, 14 + Math.sin(t * 4) * 3); puIcon(g, pu.id, x, y); }, { emissive: true }); L.add(pu.x, pu.y, 12, 40, .6, { color: def.color }); }
  // the hoops (each in the colors of the team that defends it)
  drawHoop(r, 0, teamOf(0)); drawHoop(r, 1, teamOf(1));
  // the referee at the tip
  if (m.phase === 'tipoff') { const ref = npcRig('roscoe'); ref.update(1 / 60, { x: XM, y: YM + 20, z: 0, facing: Math.PI / 2, pose: m.tip && m.tip.tossed ? null : 'cheer' }); r.shadow(XM, YM + 20, 7, .35); r.actor(XM, YM + 20, 0, (g, ox, oy) => ref.draw(g, ox, oy, E.charView(r.view))); }
  // players
  const view = E.charView(r.view);
  for (const p of S.players) {
    r.shadow(p.x, p.y, 7 - Math.min(3, p.z * .04), .4);
    if (p.cmd.tD && !isAir(p) && Math.hypot(p.vx, p.vy) > 40 && (p.turbo > 0 || infTurbo(p))) r.decal(() => r.groundRing(p.x, p.y, 9, '#ffd23a', .5));
    if (hasBall(p)) r.decal(() => r.groundRing(p.x, p.y, 8, '#ffffff', .4));
    if (p.human && hasBall(p) && p.cmd.tD && setting('meter')) { const h = attackHoop(p.team); r.decal(() => r.groundArc(h.x, h.y, dunkRange(p) - 1, dunkRange(p) + 1, 0, TAU, canDunkFrom(p) ? '#ff7a1a' : '#5a4a6a', .5)); }
    const opts = { xray: p.human ? { color: p.tagColor || '#ffffff' } : false };
    if (p.nova) opts.ghost = { color: '#c080ff', life: .25, alpha: .45, owner: p };
    if (p.reboot > 0) opts.flash = Math.sin(t * 30) > 0 ? '#5ac8ff' : undefined;
    r.actor(p.x, p.y, p.z, (g, ox, oy) => p.rig.draw(g, ox, oy, view), opts);
    if (p.nova && S.fxRng() < .3) P.add({ kind: 'ember', x: p.x + (S.fxRng() - .5) * 8, y: p.y, z: p.z + 20 + S.fxRng() * 20, vz: 30, life: .5, color: '#c080ff' });
    if (p.dizzy > 0 || p.reboot > 0) r.queue(p.x, p.y, p.z + 56, g => { for (let k = 0; k < 3; k++) { const a = t * 6 + k * TAU / 3, [x, y] = r.w(p.x + Math.cos(a) * 8, p.y + Math.sin(a) * 4, p.z + reach(p) * .95); px.rect(g, x - 1, y - 1, 3, 3, p.reboot > 0 ? '#5ac8ff' : '#ffe05a'); } }, { emissive: true });
    // the player tag over humans (P1..P4 in their color)
    if (p.human || p.seat !== undefined) r.queue(p.x, p.y, p.z + 70, g => { const [x, y] = r.w(p.x, p.y, p.z + reach(p) + 10), X = Math.round(x), Y = Math.round(y), c = p.tagColor || '#ffffff', lab = p.tag || 'P1', w = tw(lab) + 4; px.rect(g, X - w / 2, Y - 10, w, 9, '#0a0612'); px.rect(g, X - w / 2 + 1, Y - 9, w - 2, 7, c); txt(g, lab, X, Y - 9, '#0a0612', 1, 'center', { outline: false }); px.poly(g, [[X - 2, Y - 1], [X + 2, Y - 1], [X, Y + 2]], c); }, { emissive: true, bias: 2 });
  }
  // the ball, its shadow (how players read its height) and the trail
  if (b && !(m.phase === 'tipoff' && !m.tip.tossed && false)) {
    r.shadow(b.x, b.y, Math.max(2, 4.5 - b.z * .02), clamp(.5 - b.z * .002, .15, .5));
    const hot = b.owner && b.owner.nova || (b.shot && S.players[b.shot.slot] && S.players[b.shot.slot].nova);
    if (b.trail.length > 2) r.queue(b.x, b.y, b.z, g => { b.trail.forEach(([x, y, z], k) => { const [sx, sy] = r.w(x, y, z); px.ddisc(g, sx, sy, 2 + k * .5, hot ? '#c080ff' : '#ffb060', k / b.trail.length * .5); }); }, { emissive: true, bias: -.01 });
    const handBias = b.owner ? (Math.sin(b.owner.facing) > 0 ? .5 : -.5) * (b.owner.dribSide || 1) : 0;
    r.queue(b.x, b.y, b.z, g => { const [x, y] = r.w(b.x, b.y, b.z); drawBallAt(g, x, y, b.spin, hot); }, { bias: handBias });
    if (hot) L.add(b.x, b.y, b.z, 50, .6, { color: '#c080ff' });
  }
}

/* ---- the HUD ---- */
function plate(g, x, y, w, p, right) {
  const nm = p.name.length > 10 ? p.name.slice(0, 10) : p.name, m = S.match;
  txt(g, nm, right ? x + w - 1 : x + 1, y, p.nova ? '#ffd23a' : UI.ink, 1, right ? 'right' : 'left');
  // turbo bar and the three heat pips under the name
  const bw = Math.min(46, w - 22), bx = right ? x + w - 1 - bw : x + 1;
  E.ui.bar(g, bx, y + 9, bw, 3, p.turbo, infTurbo(p) ? '#c080ff' : p.turbo < .2 ? '#ff5a3a' : '#ffd23a');
  const heat = p.nova ? 3 : m.streak.slot === p.slot ? m.streak.n : 0, hx = right ? bx - 16 : bx + bw + 2;
  for (let k = 0; k < 3; k++) px.rect(g, hx + k * 5, y + 9, 4, 3, k < heat ? (p.nova ? '#c080ff' : '#ff7a1a') : '#2a2440');
  if (p.powerup) { const ix = right ? x + 6 : x + w - 6; puIcon(g, p.powerup.id, ix, y + 3); }
  if (p.human || p.seat !== undefined) { const c = p.tagColor || '#ffffff', lab = p.tag || 'P', bw2 = tw(lab) + 3, bx2 = right ? x + w - 1 - tw(nm) - bw2 - 2 : x + tw(nm) + 3; px.rect(g, bx2, y, bw2, 8, c); txt(g, lab, bx2 + bw2 / 2, y, '#0a0612', 1, 'center', { outline: false }); }
}
function drawHud(g, r) {
  const m = S.match; if (!m) return;
  const ca = game.cornerArea && game.cornerArea(), rightEdge = ca && ca.y1 > 2 && ca.y0 < 36 ? Math.floor(ca.x0) - 2 : r.W - 4;
  const W = r.W, pw = Math.min(clamp(Math.floor((W - 92) / 2) - 6, 130, 200), Math.min(W - 4, rightEdge) - (W / 2 + 40) - 4), top = 3, H0 = 34;
  for (const t of [0, 1]) {
    const tm = teamOf(t), x = t === 0 ? 4 : Math.min(W - 4, rightEdge) - pw, right = t === 1;
    E.ui.box(g, x, top, pw, H0, { bg: [E.shade(tm.jersey, -.25), E.shade(tm.jersey, -.62)], border: tm.trim, alpha: .88 });
    txt(g, tm.short, right ? x + pw - 5 : x + 5, top + 3, '#ffffff', 1, right ? 'right' : 'left');
    txt(g, m.score[t], right ? x + 5 : x + pw - 5, top + 2, '#ffffff', 2, right ? 'left' : 'right');
    if (m.gold === t) puIcon(g, 'gold', right ? x + 36 : x + pw - 36, top + 7);
    const pl = S.players.filter(p => p.team === t), half = Math.floor((pw - 8) / 2);
    pl.forEach((p, k) => plate(g, x + 4 + (right ? (1 - k) : k) * (half + 1), top + 19, half - 2, p, right));
  }
  const cx = W / 2, per = m.sudden ? 'SUDDEN BLAM' : m.quarter > m.periods ? 'OT' + (m.ot > 1 ? m.ot : '') : m.periods === 2 ? (m.quarter === 1 ? '1ST HALF' : '2ND HALF') : 'Q' + m.quarter;
  E.ui.box(g, cx - 38, top, 76, H0, { bg: ['#1a1230', '#0a0612'], border: UI.gold, alpha: .9 });
  txt(g, per, cx - 18, top + 3, UI.gold, 1, 'center');
  const sc = Math.max(0, Math.ceil(m.shotClock)); E.ui.box(g, cx + 8, top + 2, 24, 11, { bg: sc <= 5 ? '#6a0a0a' : '#1a1a24', border: sc <= 5 ? '#ff5a3a' : '#5a5a6a', gradient: false });
  txt(g, sc, cx + 20, top + 4, sc <= 5 ? '#ffd0c0' : '#ffffff', 1, 'center');
  txt(g, m.sudden ? '--' : fmtClock(m.clock), cx, top + 16, m.clock < 10 && !m.sudden ? '#ff7a5a' : '#ffffff', 2, 'center');
  // the release meter by a human shooter
  for (const p of S.players) if (p.human && p.state === 'jumpshot' && p.jump && setting('meter')) {
    const [sx, sy] = r.w(p.x, p.y, p.z + reach(p) + 16), u = clamp(p.jump.t / (p.jump.apexT * 2), 0, 1), pw2 = perfectWin(p) / (p.jump.apexT * 2), X = Math.round(sx) + 12, Y = Math.round(sy);
    px.rect(g, X, Y, 5, 30, '#0a0612'); px.rect(g, X + 1, Y + 15 - Math.round(pw2 * 30 / 2), 3, Math.max(2, Math.round(pw2 * 30)), '#5ae8ff');
    px.rect(g, X + 1, Y + 29 - Math.round(u * 28), 3, 2, u > .5 - pw2 / 2 && u < .5 + pw2 / 2 ? '#ffffff' : '#ffd23a');
  }
  // edge arrows for humans off screen
  for (const p of S.players) if (p.human || p.seat !== undefined) { const [sx] = r.w(p.x, p.y, 20); if (sx < 0 || sx > W) { const left = sx < 0, X = left ? 6 : W - 6, Y = r.H * .6; px.poly(g, left ? [[X, Y], [X + 8, Y - 6], [X + 8, Y + 6]] : [[X, Y], [X - 8, Y - 6], [X - 8, Y + 6]], p.tagColor || '#fff'); txt(g, p.tag || '', left ? X + 10 : X - 10, Y - 3, p.tagColor || '#fff', 1, left ? 'left' : 'right'); } }
  // the windsock at the Pier
  if (m.twist && m.twist.kind === 'wind') { const x = 30, y = r.H - 60, w = m.wind ? Math.hypot(m.wind.x, m.wind.y) / Math.max(1, tune('windStrength')) : 0, a = m.wind ? Math.atan2(m.wind.y * .5, m.wind.x) : 0;
    E.ui.box(g, x - 20, y - 16, 44, 32, { bg: '#0a0612', border: UI.line, alpha: .7 }); px.line(g, x - 10, y + 10, x - 10, y - 10, '#c8c8d0', 1);
    px.poly(g, [[x - 10, y - 10], [x - 10 + Math.cos(a) * 22 * (.3 + w), y - 6 + Math.sin(a) * 6], [x - 10, y - 2]], '#ff7a3a');
    for (let k = 0; k < Math.ceil(w * 3); k++) txt(g, m.wind.x > 0 ? '>' : '<', x + 6 + k * 5, y + 6, '#ffffff', 1); }
  // banners
  const bn = FX.banner;
  if (bn) {
    const k = bn.t < .25 ? E.ease.outBack(bn.t / .25) : 1, a = bn.t > 1.1 ? 1 - (bn.t - 1.1) / .2 : 1, s = Math.max(1, Math.round(3 * k)), y = Math.round(r.H * .3);
    if (a > .1) { E.font.title(g, bn.text, W / 2, y, { scale: s, colors: BANNER_COL[bn.kind] || BANNER_COL.dunk, depth: 2, depthColor: '#1a0612', align: 'center' }); if (bn.sub) txt(g, bn.sub, W / 2, y + s * 9 + 4, '#ffffff', 1, 'center'); }
  }
  // tip-off and inbound prompts for humans
  const hum = S.players.find(p => p.human);
  if (m.phase === 'tipoff' && hum && m.jumpers.includes(hum)) promptLine(g, 'TIP-OFF! {shoot} TO JUMP AT THE TOP', W / 2, r.H * .4, hum.human, { align: 'center' });
  if (m.phase === 'inbound' && m.inb && m.inb.who.human) promptLine(g, '{pass} INBOUND', W / 2, r.H * .4, m.inb.who.human, { align: 'center' });
  if (S.mode === 'exhibition' || S.mode === 'tour') {   // the first possession's hint for a human handler
    const hh = S.players.find(p => p.human && hasBall(p));
    if (hh && m.time < 25 && !m.hintShown) promptLine(g, 'HOLD {turbo} + {shoot} NEAR THE RIM TO DUNK   {pass} PASS   {shove} SPIN', W / 2, r.H - 50, hh.human, { align: 'center', color: UI.dim });
  }
  drawCaption(g, r);
  if (m.phase === 'break') drawBreak(g, r);
  if (m.phase === 'sponsor') drawSponsor(g, r);
  if (m.phase === 'over' && S.mode !== 'attract') { E.font.title(g, 'FINAL', W / 2, r.H * .32, { scale: 4, colors: ['#ffffff', '#ffd23a', '#ff7a1a'], depth: 3, align: 'center' }); txt(g, teamName(0) + ' ' + m.score[0] + '  -  ' + m.score[1] + ' ' + teamName(1), W / 2, r.H * .32 + 42, '#ffffff', 2, 'center'); }
}
function drawCaption(g, r) {
  const c = Caption.cur; if (!c) return;
  const w = Math.min(r.W - 40, 330), x = Math.round(r.W / 2 - w / 2), h = 30, y = r.H - h - 6, k = Math.min(1, c.t / .15);
  if (k < 1) return E.ui.box(g, x + w / 2 - w * k / 2, y, w * k, h, { bg: '#140c24', border: UI.accent });
  E.ui.box(g, x, y, w, h, { bg: ['#2a1a48', '#140c24'], border: UI.accent, alpha: .92 });
  const rig = npcRig(c.speaker); try { rig._talk = c.t < c.left; rig.drawPortrait(g, x + 3, y + 3, 24, { bg: '#3a2a5a' }); } catch (e) { /* portrait */ }
  txt(g, c.name, x + 31, y + 2, UI.gold, 1);
  const lines = E.font.wrap(c.text, w - 36, {}); lines.slice(0, 2).forEach((ln, i) => txt(g, ln, x + 31, y + 11 + i * 9, '#ffffff', 1, 'left', { outline: false }));
}
function drawBreak(g, r) {
  const m = S.match, half = m.breakKind === 'halftime', w = Math.min(r.W - 30, 380), h = half ? 170 : 130, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H / 2 - h / 2) + 10;
  panel(g, x, y, w, h, half ? 'HALFTIME REPORT' : 'END OF Q' + m.quarter);
  txt(g, teamName(0) + '  ' + m.score[0] + '  -  ' + m.score[1] + '  ' + teamName(1), x + w / 2, y + 26, '#ffffff', 2, 'center');
  // the leaders
  const lead = [0, 1].map(t => S.players.filter(p => p.team === t).sort((a, c) => c.stats.PTS - a.stats.PTS)[0]);
  lead.forEach((p, t) => { const lx = x + (t ? w * .55 : 12); txt(g, p.name + ': ' + p.stats.PTS + ' PTS', lx, y + 50, UI.dim, 1); txt(g, 'DUNKS ' + p.stats.DNK + '  BLK ' + p.stats.BLK + '  STL ' + p.stats.STL, lx, y + 60, UI.dim, 1); });
  // juice bars of everyone on court and the bench
  S.players.forEach((p, k) => { const lx = x + (p.team ? w * .55 : 12), ly = y + 76 + (k % 2) * 12; txt(g, p.name.slice(0, 10), lx, ly, '#ffffff', 1); E.ui.bar(g, lx + 70, ly + 2, 60, 4, p.juice, p.juice > .5 ? UI.good : '#ff7a3a'); });
  if (S.subUI && S.subUI.list) { const hint = S.subUI.text; promptLine(g, hint, x + w / 2, y + h - 30, S.subUI.input, { align: 'center' }); }
  if (half) { const lines = E.font.wrap(m.gag, w - 24, {}); lines.slice(0, 2).forEach((ln, i) => txt(g, ln, x + w / 2, y + 112 + i * 10, UI.gold, 1, 'center')); }
  txt(g, 'BACK IN ' + Math.ceil(Math.max(0, m.breakT)), x + w / 2, y + h - 14, UI.dim, 1, 'center');
}
function drawSponsor(g, r) {
  const m = S.match, w = Math.min(r.W - 20, 400), h = 120, x = Math.round(r.W / 2 - w / 2), y = Math.round(r.H / 2 - h / 2);
  E.ui.box(g, x, y, w, h, { bg: ['#f4e8c8', '#e0c890'], border: '#c8202a' });
  E.font.title(g, 'GLOBO-BLAM', r.W / 2, y + 10, { scale: 3, colors: ['#ff5a3a', '#c8202a', '#6a0a0a'], depth: 2, align: 'center' });
  E.font.wrap(m.sponsorLine, w - 30, {}).forEach((ln, i) => txt(g, ln, r.W / 2, y + 48 + i * 11, '#2a1a10', 1, 'center', { outline: false }));
  // the cleaning bot rolling out with new glass
  const u = clamp(m.sponsorT / 4, 0, 1), bx = x + 20 + u * (w - 40); px.rect(g, bx - 8, y + h - 24, 16, 10, '#8a90a0'); px.disc(g, bx - 5, y + h - 13, 3, '#2a2a2a'); px.disc(g, bx + 5, y + h - 13, 3, '#2a2a2a'); px.rect(g, bx - 3, y + h - 34, 10, 10, '#cfe4ff');
  txt(g, "WE'LL BE RIGHT BACK", r.W / 2, y + h - 10, '#c8202a', 1, 'center', { outline: false });
}
