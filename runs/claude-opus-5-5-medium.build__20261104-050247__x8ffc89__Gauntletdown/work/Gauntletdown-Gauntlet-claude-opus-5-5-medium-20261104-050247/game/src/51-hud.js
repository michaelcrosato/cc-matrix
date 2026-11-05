/* 51-hud: canvas pixel-art HUD anchored to r.W / r.H, clear of the corner buttons: a panel per player (portrait, class,
 * health as a big number, score, keys, flasks, amulet timer, specials), captions, the floor's name, timers, arrows to
 * the stairs and to allies, the reticle; and the floor card and the title's backdrop. */

const PORTRAITS = new Map();
function drawHUD(r) {
  if (!W) return;
  const big = S.hudSize === 'large', n = Math.max(1, PARTY.length), corner = game.cornerArea(), maxW = corner ? corner.x0 - 4 : r.W;
  const pw = Math.min(big ? 130 : 108, Math.floor((maxW - 4) / Math.max(n, SESSION ? n : n < 4 && !SC.play.attract ? n + 1 : n))), ph = big ? 40 : 34;
  r.overlay(g => {
    PARTY.forEach((h, i) => drawPanel(g, h, 2 + i * (pw + 2), 2, pw, ph, big));
    if (!SESSION && !SC.play.attract && PARTY.length < 4) { const x = 2 + PARTY.length * (pw + 2); if (x + pw <= maxW) { const a = .5 + .5 * Math.sin(game.real * 4); E.ui.box(g, x, 2, pw, ph, { bg: ['#1a1410', '#0a0806'], border: '#4a3a2a', alpha: .6 }); txt(g, 'PRESS', x + pw / 2, 9, a > .5 ? '#c8b8a0' : '#8a7a60', { align: 'center' }); otxt(g, 'Options / 2', x + pw / 2, 18, '#e8c890', { align: 'center' }); txt(g, 'TO JOIN', x + pw / 2, 27, '#c8b8a0', { align: 'center' }); } }
    // the floor's name, the hoard clock, the round clock
    const top = ph + 6;
    if (!SESSION) otxt(g, (W.no ? 'FLOOR ' + W.no + (RUN.loop > 1 ? ' (DESCENT ' + 'I'.repeat(RUN.loop) + ')' : '') + ': ' : '') + W.fd.name, r.W / 2, top, '#e8c890', { align: 'center' });
    if (W.hoard) E.font.title(g, String(Math.max(0, Math.ceil(W.hoard.t))), r.W / 2, top + 12, { scale: 3, colors: ['#ffffff', '#ffd36a', '#c87a2a'], outline: '#120806', depth: 2, align: 'center' });
    if (SESSION && HUB && SESS.info) {
      const left = Math.max(0, (SESS.info.limitMs || 360000) - Math.max(0, HUB.time())), m = Math.floor(left / 60000), s = Math.floor(left / 1000) % 60;
      otxt(g, m + ':' + String(s).padStart(2, '0'), r.W / 2, top, left < 30000 ? '#ff6a4a' : '#ffe08a', { align: 'center', scale: 2 });
      const sorted = PARTY.slice().sort((a, b) => b.score - a.score);
      sorted.forEach((h, k) => txt(g, (h.netName || '').replace(/[^\x20-\x7E]/g, '?').slice(0, 10) + ' ' + h.score, r.W - 6, top + 4 + k * 9, h.color, { align: 'right' }));
    }
    if (W.stage >= 1 && !W.hoard && !W.boss && W.stage < 3) txt(g, W.stage === 1 ? 'THE GAUNT GROWS IMPATIENT' : 'ALL DOORS OPEN', r.W / 2, top + 10, '#ff9a6a', { align: 'center' });
    if (W.stage >= 3) txt(g, 'EVERY WALL IS A STAIR: PUSH INTO ONE', r.W / 2, top + 10, '#ffe08a', { align: 'center' });
    // the King's bar
    if (W.boss && W.boss.alive && W.boss.intro <= 0) { const bw = Math.min(260, r.W - 40), bx = (r.W - bw) / 2, by = r.H - 36; otxt(g, 'KING FAMISH', r.W / 2, by - 9, '#e8c04a', { align: 'center' }); px.rect(g, bx - 1, by - 1, bw + 2, 7, '#000000'); E.ui.bar(g, bx, by, bw, 5, W.boss.hp / W.boss.maxHp, W.boss.phase === 3 ? '#ffd84a' : W.boss.phase === 2 ? '#e8843a' : '#c83a3a'); }
    // captions
    if (S.captions && NARR.cur) {
      const lines = E.font.wrap(NARR.cur.text, Math.min(r.W - 40, 380), {}).slice(0, 2), sc = r.W > 600 ? 2 : 1, y = r.H - 18 - lines.length * 9 * sc - (W.boss && W.boss.alive ? 20 : 0) - (SC.play.attract ? 22 : 0);
      lines.forEach((l, k) => otxt(g, l, r.W / 2, y + k * 9 * sc, NARR.cur.pri >= 3 ? '#ffe08a' : NARR.cur.pri === 1 ? '#c8e0ff' : '#f0e8d8', { align: 'center', scale: sc }));
    }
    // arrows: to the stairs once found (or once the Gaunt grows impatient), to allies off screen in sessions
    const me = PARTY.find(h => h.local) || PARTY[0];
    if (me && (W.stairsSeen || W.stage >= 1)) for (const e of W.exits.filter(e => !e.to).slice(0, 1)) edgeArrow(g, r, e.x, e.y, '#ffe08a', 'EXIT');
    if (SESSION && me) for (const h of PARTY) if (h !== me && h.alive) edgeArrow(g, r, h.x, h.y, h.color, '');
    // the reticle, where the mouse aims
    const I = game.input, mg = game.mouseGround && I.aimSource === 'mouse' && I.mouse && I.clock - (I.mouse.t || -9) < 3 ? I.pointer() : null;
    if (mg && PARTY[0] && PARTY[0].input === I) { const [x, y] = mg; px.rect(g, x - 4, y, 3, 1, '#ffffff'); px.rect(g, x + 2, y, 3, 1, '#ffffff'); px.rect(g, x, y - 4, 1, 3, '#ffffff'); px.rect(g, x, y + 2, 1, 3, '#ffffff'); hoverName(g, r, x, y); }
    if (anyCheat() && !SC.play.attract) { px.rect(g, r.W - 30, r.H - 12, 28, 10, '#a01a1a'); txt(g, 'DEV', r.W - 16, r.H - 10, '#ffffff', { align: 'center' }); }
    if (CHEAT.net || SESSION && CHEAT.net) { const s = NET.stats(); txt(g, s.role + ' sent ' + s.sent + ' recv ' + s.received + ' snap ' + s.lastSnapshotBytes + 'B max ' + s.maxSnapshotBytes + 'B peak ' + s.peak + '/s', 4, r.H - 20, '#7ae8e8'); }
    if (CHEAT.bot) PARTY.forEach((h, i) => { if (h.bot) txt(g, 'P' + (i + 1) + ' bot: ' + h.bot.think, 4, ph + 18 + i * 9, '#7ae8e8'); });
    if (SC.play.attract) drawDemoBanner(g, r);
    for (const h of PARTY) if (h.joinPick) drawJoinPick(g, r, h, 2 + h.pi * (pw + 2), ph + 4, pw);
  });
}
function drawPanel(g, h, x, y, w, ht, big) {
  E.ui.box(g, x, y, w, ht, { bg: [h.alive ? '#24180f' : '#1a0a0a', '#0a0604'], border: h.color, alpha: .82 });
  const rig = RIGS.get('h' + h.pi);
  px.disc(g, x + 12, y + 12, 9, h.color); px.disc(g, x + 12, y + 12, 8, '#1a1010');
  if (rig && rig.rig.drawPortrait) try { rig.rig.drawPortrait(g, x + 4, y + 4, 16, { zoom: 2.4, turn: .4, tint: h.alive ? undefined : '#808080', cape: false, weapon: false }); } catch (e) { /* portrait while posing */ }
  txt(g, (SESSION && h.netName ? h.netName.replace(/[^\x20-\x7E]/g, '?').slice(0, 10) : h.D.name), x + 24, y + 3, h.color);
  if (!h.alive) {
    otxt(g, SESSION ? 'RISING...' : 'RISE: ' + (h.input ? h.input.label('fire') : 'FIRE'), x + 24, y + 13, Math.floor(game.real * 3) % 2 ? '#ffe08a' : '#c8a060');
  } else {
    const hc = h.hp < 200 ? (Math.floor(game.real * 4) % 2 ? '#ff3a2a' : '#ffb0a0') : h.hp < 400 ? '#ffe04a' : '#ffffff';
    otxt(g, fmt(h.hp), x + 24, y + 11, hc, { scale: 2 });
  }
  txt(g, String(h.score), x + w - 4, y + 3, '#e8c890', { align: 'right' });
  // keys, flasks, the amulet with its timer, specials
  const yy = y + ht - 10;
  px.sprite(g, SPR.key, x + 4, yy + 1); txt(g, String(h.keys), x + 14, yy, '#ffe08a');
  px.sprite(g, SPR.flask, x + 24, yy - 2); txt(g, String(h.flasks), x + 32, yy, '#a8d0ff');
  if (h.amulet) { px.sprite(g, SPR.amulet[h.amulet], x + 42, yy - 1); txt(g, String(Math.ceil(h.amuletT)), x + 49, yy, AMULETS[h.amulet].color); }
  let sx = x + w - 6;
  for (const k of Object.keys(h.specials)) { px.rect(g, sx - 3, yy + 1, 4, 5, SPECIALS[k].color); sx -= 6; }
  if (h.menu > 0) txt(g, 'ON THE MENU', x + w - 4, y + 13, '#ffe06a', { align: 'right', font: 'tiny' });
  if (h.queasy > 0) txt(g, 'QUEASY', x + w - 4, y + 19, '#9ae84a', { align: 'right', font: 'tiny' });
  void big;
}
function drawJoinPick(g, r, h, x, y, w) {
  E.ui.box(g, x, y, Math.max(w, 120), 34, { bg: ['#2a1a14', '#100806'], border: h.color });
  otxt(g, '← ' + h.D.name + ' →', x + Math.max(w, 120) / 2, y + 6, h.color, { align: 'center' });
  txt(g, h.input.label('fire') + ' TO DROP IN', x + Math.max(w, 120) / 2, y + 20, '#e8d8c0', { align: 'center' });
}
function edgeArrow(g, r, wx, wy, color, label) {
  const [sx, sy] = r.w(wx, wy, 0), m = 16;
  if (sx > m && sx < r.W - m && sy > 44 && sy < r.H - m) return;
  const cx = r.W / 2, cy = r.H / 2, a = Math.atan2(sy - cy, sx - cx), ex = clamp(cx + Math.cos(a) * r.W, m, r.W - m), ey = clamp(cy + Math.sin(a) * r.H, 46, r.H - m);
  const p = (d, s) => [ex + Math.cos(a + s) * d, ey + Math.sin(a + s) * d];
  px.poly(g, [p(6, 0), p(6, 2.5), p(6, -2.5)], color);
  if (label) txt(g, label, ex - Math.cos(a) * 14, ey - Math.sin(a) * 10 - 3, color, { align: 'center', font: 'tiny' });
}
function hoverName(g, r, x, y) {
  const m0 = game.mouseGround(); if (!m0 || !isFinite(m0[0])) return; const mg = { x: m0[0], y: m0[1] };
  let best = null, bd = 14;
  for (const m of W.mons) { const d = Math.hypot(m.x - mg.x, m.y - mg.y); if (d < bd) { bd = d; best = { n: m.D.name + ' (RANK ' + m.rank + ')', e: m }; } }
  for (const gn of W.gens) { const d = Math.hypot(gn.x - mg.x, gn.y - mg.y); if (d < bd) { bd = d; best = { n: get('gens', gn.type).name + ' (RANK ' + gn.rank + ')', e: gn }; } }
  for (const it of W.items) { const d = Math.hypot(it.x - mg.x, it.y - mg.y); if (d < bd && d < 10) { bd = d; best = { n: it.kind === 'special' ? SPECIALS[it.sub].name : it.kind === 'amulet' ? 'AMULET: ' + AMULETS[it.sub].name : get('items', it.kind).name, e: it }; } }
  if (best) otxt(g, best.n, x, y + 8, '#ffe08a', { align: 'center', font: 'tiny' });
}

/* ---- the floor card ---- */
function drawFloorCard(r, c) {
  drawTitleBack(r, c.t, true);
  r.overlay(g => {
    const W0 = r.W, H0 = r.H, fd = c.fd;
    if (c.realm) {
      const [title, line] = STORY.realm[c.realm];
      E.font.title(g, title, W0 / 2, H0 * .2, { scale: 2, colors: LOGO_COLORS, outline: '#120806', depth: 2, depthColor: '#3a1a0a', align: 'center' });
      E.font.wrap(line, Math.min(W0 - 40, 360), {}).forEach((l, k) => otxt(g, l, W0 / 2, H0 * .2 + 26 + k * 10, '#f0e0c8', { align: 'center' }));
      // the party slides down the chute
      PARTY.forEach((h, k) => { const rg = h.chute || (h.chute = h.D.rig()), y = ((c.t * 60 + k * 30) % (H0 + 40)) - 20; rg.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, pose: 'cheer' }); rg.draw(g, W0 / 2 - 60 + k * 40, y, r.view); });
    } else {
      E.font.title(g, fd.hoard ? 'TREASURE ROOM' : 'FLOOR ' + fd.no, W0 / 2, H0 * .18, { scale: 4, colors: LOGO_COLORS, outline: '#120806', depth: 3, depthColor: '#3a1a0a', align: 'center' });
      otxt(g, fd.name, W0 / 2, H0 * .18 + 42, '#ffe08a', { align: 'center', scale: 2 });
      const line = LINES[fd.hoard ? 'hoard_' + fd.hoard : 'floor_' + fd.no] || '';
      otxt(g, line, W0 / 2, H0 * .18 + 64, '#f0e0c8', { align: 'center' });
      if (RUN.floorIdx > 0) PARTY.forEach((h, k) => { const x = W0 / 2 + (k - (PARTY.length - 1) / 2) * 96, y = H0 * .62; otxt(g, h.D.name, x, y, h.color, { align: 'center' }); txt(g, 'SCORE ' + h.score, x, y + 11, '#ffe08a', { align: 'center' }); txt(g, 'KILLS ' + h.stats.kills, x, y + 20, '#d8c8b0', { align: 'center' }); txt(g, 'TREASURE ' + h.stats.treasure, x, y + 29, '#d8c8b0', { align: 'center' }); });
      if (RUN.loop > 1) otxt(g, 'DESCENT ' + 'I'.repeat(RUN.loop), W0 / 2, 10, '#ff8a6a', { align: 'center' });
    }
    if (c.t > .8) txt(g, 'PRESS ' + game.input.label('fire') + ' TO DESCEND', W0 / 2, H0 - 16, Math.floor(game.real * 2) % 2 ? '#ffe08a' : '#c8a060', { align: 'center' });
  });
}

/* ---- the title's backdrop: an endless torch-lit shaft falling past the camera, the iron gauntlet tumbling down it ---- */
const SHAFT_RAMP = E.ramp('#5e3826', 8, .85), SHAFT_MORTAR = E.ramp('#2a160e', 4, .5);
const TITLE_RIGS = [];
function drawTitleBack(r, t, dim) {
  r.sky(['#080408', '#1a0c10', '#2a1410']);
  r.overlay(g => {
    const W0 = r.W, H0 = r.H, cx = W0 / 2, cy = H0 * .5, N = 10, sp = (t * .45) % 1;
    const ring = k => { const z = Math.pow(k, 2.4), s = 4 + z * Math.max(W0, H0) * 1.25; return { s, hx: s, hy: s * .7, z }; };
    // far to near: four wall trapezoids between each pair of rings, bricked, darker with depth
    for (let i = 0; i < N; i++) {
      const a = ring((i + sp) / N), b = ring((i + 1 + sp) / N), lit = clamp(Math.floor(Math.sqrt(b.z) * 6.5), 0, 7);
      const C = SHAFT_RAMP[lit], Cd = SHAFT_RAMP[Math.max(0, lit - 2)], M = SHAFT_MORTAR[clamp(Math.floor(b.z * 4), 0, 3)];
      const quad = (p) => px.poly(g, p, C);
      quad([[cx - a.hx, cy - a.hy], [cx + a.hx, cy - a.hy], [cx + b.hx, cy - b.hy], [cx - b.hx, cy - b.hy]]);   // ceiling
      px.poly(g, [[cx - a.hx, cy + a.hy], [cx + a.hx, cy + a.hy], [cx + b.hx, cy + b.hy], [cx - b.hx, cy + b.hy]], Cd);   // floor
      px.poly(g, [[cx - a.hx, cy - a.hy], [cx - b.hx, cy - b.hy], [cx - b.hx, cy + b.hy], [cx - a.hx, cy + a.hy]], SHAFT_RAMP[Math.max(0, lit - 1)]);
      px.poly(g, [[cx + a.hx, cy - a.hy], [cx + b.hx, cy - b.hy], [cx + b.hx, cy + b.hy], [cx + a.hx, cy + a.hy]], SHAFT_RAMP[Math.max(0, lit - 1)]);
      // mortar: the ring's edge and a course between, with staggered joints
      for (const [rx, ry] of [[a.hx, a.hy], [(a.hx + b.hx) / 2, (a.hy + b.hy) / 2]]) { px.rect(g, cx - rx, cy - ry, rx * 2, 1, M); px.rect(g, cx - rx, cy + ry, rx * 2, 1, M); px.rect(g, cx - rx, cy - ry, 1, ry * 2, M); px.rect(g, cx + rx - 1, cy - ry, 1, ry * 2, M); }
      for (let j = 1; j < 6; j++) { const f = j / 6 + (i % 2) * .08, x0 = cx - b.hx + f * b.hx * 2, x1 = cx - a.hx + f * a.hx * 2; px.line(g, x0, cy - b.hy, x1, cy - a.hy, M); px.line(g, x0, cy + b.hy, x1, cy + a.hy, M); }
      if (i % 2 === 1 && b.z > .02) for (const sd of [-1, 1]) {   // a torch on each side wall, with a halo
        const tx = cx + sd * (b.hx - Math.max(2, b.s * .04)), ty = cy - b.hy * .1, fs = Math.max(1, b.z * 6);
        px.blend(g, .35, 'add', () => px.disc(g, tx, ty, fs * 5, '#ff8a3a'));
        px.glow(g, 1); px.rect(g, tx - fs / 2, ty - fs * 1.6 - Math.sin(t * 11 + i) * fs * .3, fs, fs * 1.4, '#ffd36a'); px.rect(g, tx - fs / 4, ty - fs * 2.1, fs / 2, fs / 2, '#fff4c0'); px.glow(g, 0);
        px.rect(g, tx - fs / 3, ty, fs * .66, fs * 1.6, '#3a2418');
      }
    }
    px.blend(g, .8, 'normal', () => px.disc(g, cx, cy, 5, '#000000'));
    // embers rising past
    for (let k = 0; k < 40; k++) { const hx = E.hash2(k, 3), hy = E.hash2(k, 7), y = H0 - ((t * (20 + hy * 30) + hy * H0) % (H0 + 10)), x = hx * W0 + Math.sin(t + k) * 6; px.dot(g, x, y, k % 3 ? '#ff9a3a' : '#ffe08a'); }
    if (!dim) {
      const gy = ((t * 34) % (H0 + 60)) - 30, gx = W0 * .8 + Math.sin(t * .9) * 14;   // the gauntlet, tumbling down the shaft
      px.sprite(g, SPR.gauntletBig, gx, gy, { rot: t * 2.2 });
      // the four fools at the shaft's edge
      if (!TITLE_RIGS.length) for (const c of HERO_ORDER) TITLE_RIGS.push(get('heroes', c).rig());
      TITLE_RIGS.forEach((rg, k) => { rg.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: -Math.PI / 2 + (k - 1.5) * .25, pose: k === 0 ? 'hips' : k === 3 ? 'cast' : null }); rg.draw(g, (k < 2 ? 26 + k * 34 : W0 - 26 - (3 - k) * 34), H0 - 18, r.view); });
    }
    if (dim) px.blend(g, .35, 'normal', () => px.rect(g, 0, 0, W0, H0, '#05030a'));
  });
}
