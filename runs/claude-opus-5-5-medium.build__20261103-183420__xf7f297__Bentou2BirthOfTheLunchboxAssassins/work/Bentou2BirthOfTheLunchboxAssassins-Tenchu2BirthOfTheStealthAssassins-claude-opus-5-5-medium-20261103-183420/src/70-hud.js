/* 70-hud: the in-game HUD on canvas, inside 4% overscan margins: health and Silent Cuts (top left), objective and boss
 * bar (top centre), the moon timer and the place (top right), the Ki Gauge (bottom left), the tool box (bottom right),
 * context prompts (bottom centre), marks over guards, bark bubbles, edge chevrons, the letterbox and the 静斬 splash. */
B.prompts = M => {
  const h = M.hero, out = []; if (!h || h.dead || M.over) return out;
  const c = B.cutCandidate(h, M); if (c) out.push({ act: 'attack', label: (c.g.mark ? 'Silent Mark - ' : 'Silent Cut - ') + B.CUT_NAMES[c.kind] });
  else if (M.guards.concat(M.bosses).some(e => e.alive && e.staggerT > 0 && Math.hypot(e.x - h.x, e.y - h.y) < 28)) out.push({ act: 'attack', label: 'Riposte' });
  else if (M.guards.concat(M.bosses).some(e => e.alive && e.swing && e.swing.phase === 'wind' && e.swing.u > .4 && Math.hypot(e.x - h.x, e.y - h.y) < 34 && e.parryable !== false)) out.push({ act: 'block', label: 'Parry!' });
  const it = B.interactable(h, M); if (it) out.push({ act: 'interact', label: (it.kind === 'hold' ? 'Hold: ' : '') + it.label, prog: it.kind === 'hold' && it.it.prog ? it.it.prog / (it.it.hold || 1) : 0 });
  if (out.length < 2 && h.anchor && !h.action) out.push({ act: 'grapple', label: h.grappleHold > .25 ? 'Release: grapple' : 'Grapple' });
  if (out.length < 2 && h.hug) out.push({ act: 'crouch', label: h.peek ? 'Peeking - leave the wall' : 'Leave the wall' });
  return out.slice(0, 2);
};
const box = (g, x, y, w, hh, a = .7) => { px.blend(g, a, 'normal', () => px.rect(g, x, y, w, hh, '#140c0c')); px.rect(g, x, y, w, 1, '#8a6a3a'); px.rect(g, x, y + hh - 1, w, 1, '#3a2a1a'); };
B.drawHud = (r, M) => {
  const G = B.game, h = M.hero, W = r.W, Hh = r.H, mx = Math.round(W * .04), my = Math.round(Hh * .04), t = G.real;
  r.overlay(g => {
    // the letterbox
    if (M.letterbox > .01) { const lb = Math.round(M.letterbox * Hh * .1); px.rect(g, 0, 0, W, lb, '#000'); px.rect(g, 0, Hh - lb, W, lb, '#000'); }
    // hit pulse at the edges
    if (M.hitFlash > 0) px.blend(g, M.hitFlash, 'normal', () => { px.rect(g, 0, 0, W, 4, '#d02a20'); px.rect(g, 0, Hh - 4, W, 4, '#d02a20'); px.rect(g, 0, 0, 4, Hh, '#d02a20'); px.rect(g, W - 4, 0, 4, Hh, '#d02a20'); });
    if (M.mode === 'attract' || !h) return B.drawSplash(g, r, M);
    if (M.letterbox > .6 && M.talk.open && M.talk.modal) return;
    // health: a vermilion brush stroke with the crest at its head
    const hw = 80, hp = clamp(h.hp / h.hpMax, 0, 1);
    box(g, mx, my, hw + 22, 26);
    px.sprite(g, B.CREST, mx + 3, my + 3);
    px.rect(g, mx + 19, my + 6, hw, 6, '#2a1414'); px.rect(g, mx + 19, my + 6, Math.round(hw * hp), 6, hp < .3 && Math.floor(t * 4) % 2 ? '#ff6a4a' : '#d8402a'); px.rect(g, mx + 19, my + 6, Math.round(hw * hp), 1, '#ff8a6a');
    for (let k = 0; k < Math.round(hw * hp); k += 7) px.dot(g, mx + 19 + k, my + 11, '#8a1c1c');
    B.drawKanji(g, 'sei', mx + 19, my + 14, .28, '#d02a20', '#1a0a08'); B.drawKanji(g, 'zan', mx + 29, my + 14, .28, '#d02a20', '#1a0a08');
    E.font.text(g, 'x' + M.stats.silentCuts, mx + 41, my + 15, '#f4ead5', { outline: false, shadow: '#000' });
    if (M.escort && M.escort.freed) { box(g, mx, my + 28, 70, 12); E.font.text(g, 'TOBEI', mx + 3, my + 30, '#b8a890', { outline: false }); const ep = M.escort.hp / M.escort.hpMax; for (let k = 0; k < 6; k++) px.rect(g, mx + 34 + k * 5, my + 31, 4, 5, k < Math.ceil(ep * 6) ? '#5ae0a0' : '#2a3a2a'); }
    // the boss bar
    const bb = M.bossBar; if (bb && bb.active) {
      const bw = Math.min(220, W - 120), bx = Math.round(W / 2 - bw / 2), by = my + 2; box(g, bx - 4, by - 2, bw + 8, 20, .8);
      E.font.text(g, bb.name.toUpperCase(), W / 2, by, '#e8b04a', { align: 'center', outline: false, shadow: '#000' });
      px.rect(g, bx, by + 10, bw, 5, '#2a1414'); px.rect(g, bx, by + 10, Math.round(bw * clamp(bb.hp / bb.hpMax, 0, 1)), 5, bb.phase === 2 ? '#ff6a2a' : '#d8402a'); px.rect(g, bx + bw / 2, by + 9, 1, 7, '#f4ead5');
    }
    if (M.bossCard && M.cine) E.font.title(g, M.bossCard.name.toUpperCase(), W / 2, Math.round(Hh * .32), { align: 'center', scale: 2, colors: ['#ffe8c0', '#e8b04a', '#d8402a'], depth: 2 });
    // ALARM banner
    if (M.bellRung && M.t - (M._bellShown || (M._bellShown = M.t)) < 3 && Math.floor(t * 3) % 2 === 0) E.font.title(g, 'ALARM!', W / 2, my + (bb ? 26 : 4), { align: 'center', scale: 2, colors: ['#ffd0a0', '#ff4a3a'], depth: 1 });
    // the moon timer, the place
    if (M.timer && !M.timer.stopped) {
      const tx = W - mx - 30, ty = my + 18, u = M.timer.left / M.timer.max, red = M.timer.left < 60;
      px.disc(g, tx, ty, 14, '#140c18'); for (let a = 0; a < 24; a++) { const an = Math.PI + a / 23 * Math.PI; px.dot(g, tx + Math.cos(an) * 12, ty + Math.sin(an) * 12, a / 23 <= 1 - u ? (red ? '#ff4a3a' : '#e8b04a') : '#3a3048'); }
      const an = Math.PI + (1 - u) * Math.PI; px.disc(g, tx + Math.cos(an) * 12, ty + Math.sin(an) * 12, 3, '#f4ecd0');
      E.font.text(g, B.fmtTime(M.timer.left), tx, ty + 2, red ? '#ff6a4a' : '#f4ead5', { align: 'center', outline: false, shadow: '#000' });
    }
    if (M.placeT > 0 && M.place) { const a = Math.min(1, M.placeT); px.blend(g, a, 'normal', () => E.font.text(g, M.place.name, W - mx, my + (M.timer && !M.timer.stopped ? 38 : 4), '#e8dcc0', { align: 'right', outline: false, shadow: '#000' })); }
    if (M.mode === 'trial' || M.mode === 'hub') { const s = B.trialScore(M); E.font.text(g, 'SCORE ' + s, W - mx, my + 4, '#e8b04a', { align: 'right', outline: false, shadow: '#000' }); E.font.text(g, B.fmtTime(M.hubClock !== undefined ? M.hubClock : M.t), W - mx, my + 14, '#b8a890', { align: 'right', outline: false, shadow: '#000' }); }
    // the Ki Gauge
    const kx = mx + 22, ky = Hh - my - 6, col = MOOD[M.kiState] || MOOD.calm;
    px.disc(g, kx, ky, 21, '#100a10');
    for (let a = 0; a <= 32; a++) { const an = Math.PI + a / 32 * Math.PI, on = a / 32 <= M.ki / 99; px.rect(g, Math.round(kx + Math.cos(an) * 18), Math.round(ky + Math.sin(an) * 18), 2, 2, on ? col : '#2a2430'); }
    E.font.text(g, String(M.ki).padStart(2, '0'), kx, ky - 15, M.ki ? col : '#5a5060', { align: 'center', scale: 2, outline: false, shadow: '#000' });
    const L = M.world.lightAt(h.x, h.y), eyeY = ky - 2; px.ell(g, kx, eyeY, 5, L < .35 ? 1 : L < .6 ? 2 : 3, '#e8dcc0'); if (L >= .35) px.disc(g, kx, eyeY, L < .6 ? 1 : 2, '#1a1418'); if (L < .35) px.rect(g, kx - 5, eyeY, 11, 1, '#5a5060');
    if (M.kiState === 'notice' || M.kiState === 'search' || M.kiState === 'alert') E.font.text(g, M.kiState === 'alert' ? '!' : '?', kx + 18, ky - 22, col, { scale: 2, outline: false, shadow: '#000' });
    if (h.focus) E.font.text(g, 'KI FOCUS', kx, ky + 1, '#a0a0ff', { align: 'center', outline: false, font: 'tiny' });
    // the tool box
    const s = B.Bento.cur(M), bx2 = W - mx - 44, by2 = Hh - my - 40;
    box(g, bx2, by2, 44, 40, .78);
    if (s) { const icon = B.ICON[s.tool]; if (icon) px.sprite(g, icon, bx2 + 15 - 6, by2 + 6, { scale: 2 }); E.font.text(g, 'x' + (M.cheats.infTools ? '99' : s.n), bx2 + 40, by2 + 28, '#f4ead5', { align: 'right', outline: false, shadow: '#000' }); }
    else E.font.text(g, 'EMPTY', bx2 + 22, by2 + 16, '#7a6a5a', { align: 'center', outline: false });
    if (M.toolFlash > 0 && s) E.font.text(g, get('tool', s.tool).name, bx2 + 44, by2 - 10, '#e8b04a', { align: 'right', outline: false, shadow: '#000' });
    const dv = B.device(); if (dv === 'gamepad') { B.glyph(g, 'toolPrev', bx2 - 12, by2 + 14); B.glyph(g, 'toolNext', bx2 + 46, by2 + 14); B.glyph(g, 'useTool', bx2 + 2, by2 + 27); }
    else { B.glyph(g, 'useTool', bx2 + 2, by2 + 27); }
    for (let k = 0; k < 8; k++) px.rect(g, bx2 + 4 + k * 5, by2 + 2, 4, 2, k === M.bento.sel ? '#e8b04a' : M.bento.slots[k] && M.bento.slots[k].n > 0 ? '#8a6a4a' : '#3a2a20');
    // the compass (north) beside the tool box
    const cx2 = bx2 - 10, cy2 = by2 + 36, n = r.view.p(0, -1), nl = Math.hypot(n[0], n[1]) || 1; px.disc(g, cx2, cy2, 5, '#140c0c'); px.line(g, cx2, cy2, Math.round(cx2 + n[0] / nl * 5), Math.round(cy2 + n[1] / nl * 5), '#d8402a'); E.font.text(g, 'N', Math.round(cx2 + n[0] / nl * 9), Math.round(cy2 + n[1] / nl * 9) - 3, '#b8a890', { align: 'center', outline: false, font: 'tiny' });
    // context prompts
    const pr = B.prompts(M); let py = Hh - my - 14 - (pr.length - 1) * 15;
    for (const p of pr) { const txt = '{a:' + p.act + '} ' + p.label, w = B.richW(txt) + 10; box(g, Math.round(W / 2 - w / 2), py - 3, w, 14, .7); B.rich(g, txt, W / 2, py, '#f4ead5', { align: 'center' }); if (p.prog) E.ui.bar(g, Math.round(W / 2 - w / 2) + 2, py + 9, Math.round((w - 4) * clamp(p.prog, 0, 1)), 1, 1, '#e8b04a'); py += 15; }
    // the tutorial card
    if (M.tut) { M.tut.t += 1 / 60; const tw = Math.min(300, W - 120), lines = E.font.wrap(M.tut.text.replace(/\{a:[a-zA-Z]+\}/g, 'MMM'), tw - 12); const th = 18 + lines.length * 11, tx = Math.round(W / 2 - tw / 2), ty = Math.round(Hh * .62) - th;
      box(g, tx, ty, tw, th, .85); E.font.text(g, M.tut.title.toUpperCase(), tx + 6, ty + 4, '#e8b04a', { outline: false }); B.richWrap(g, M.tut.text, tx + 6, ty + 15, tw - 12, '#f4ead5'); if (M.tut.t > 9) M.tut = null; }
    B.drawSplash(g, r, M);
  });
};
/* wrapped rich text: words and {a:} tokens */
B.richWrap = (g, s, x, y, w, color) => {
  const words = s.split(' '); let line = '', yy = y;
  for (const wd of words) { const test = line ? line + ' ' + wd : wd; if (B.richW(test) > w && line) { B.rich(g, line, x, yy, color); yy += 11; line = wd; } else line = test; }
  if (line) B.rich(g, line, x, yy, color); return yy + 11;
};
/* the 静斬 splash: two brush kanji, an ink burst and a caption */
B.drawSplash = (g, r, M) => {
  const sp = M.splash; if (!sp) return;
  const u = sp.t, a = u < .1 ? u / .1 : u > 1.1 ? Math.max(0, 1 - (u - 1.1) / .3) : 1, S = 2.1, x = Math.round(r.W * .16), y = Math.round(r.H * .3);
  const col = sp.mark ? '#f0f0e8' : '#d02a20', edge = sp.mark ? '#5a5a60' : '#1a0806';
  px.blend(g, a, 'normal', () => {
    for (let k = 0; k < 14; k++) { const an = k * 2.4, rr = 30 + (k * 37) % 40; px.disc(g, x + 34 + Math.cos(an) * rr * Math.min(1, u * 4), y + 34 + Math.sin(an) * rr * .7 * Math.min(1, u * 4), 2 + k % 3, edge); }
    B.drawKanji(g, 'sei', x - 4, y, S * .5, col, edge); B.drawKanji(g, 'zan', x + 34, y + 8, S * .5, col, edge);
    E.font.text(g, sp.mark ? 'SILENT MARK' : 'SILENT CUT', x + 34, y + 50, '#f4ead5', { align: 'center', outline: false, shadow: '#000' });
    E.font.text(g, B.CUT_NAMES[sp.kind].toUpperCase(), x + 34, y + 60, '#e8b04a', { align: 'center', outline: false, shadow: '#000' });
  });
};
/* world marks: guard awareness, bark bubbles, breath and stamina, the objective marker, chevrons, sight cones */
B.drawWorldMarks = (r, M) => {
  const G = B.game, h = M.hero; if (!h) return;
  const cones = G.settings.cones && M.mode !== 'attract';
  for (const g of M.guards) {
    if (!g.alive || g.vis === 'hidden' || g.civilian && !g.disguised) continue;
    if (cones && g.vis === 'visible' && !g.asleep) r.sightCone(g, { map: M.world.map, range: B.T('sightRange') * g.T.sight, fov: B.T('sightFov') * (g.T.fov / 1.5), color: MOOD[g.mind.state], alpha: g.mind.state === 'calm' ? .16 : .3 });
    else if (h.focus && g.vis === 'sensed') r.sightCone(g, { map: M.world.map, range: B.T('sightRange') * g.T.sight, fov: B.T('sightFov'), color: '#7a7aff', alpha: .18 });
  }
  if (M.dev && M.dev.ai) for (const g of M.guards) if (g.alive) { r.sightCone(g, { map: M.world.map, range: B.T('sightRange') * g.T.sight, fov: B.T('sightFov'), color: MOOD[g.mind.state], alpha: .25 }); }
  if (G.settings.marker && M.mode !== 'attract') { const tgt = B.objectiveTarget(M); if (tgt) r.marker(tgt.x, tgt.y, tgt.z || 0, { label: tgt.label, color: '#e8b04a' }); }
  r.overlay(g => {
    for (const q of M.guards.concat(M.bosses, M.escort ? [M.escort] : [])) {
      const [sx, sy] = r.w(q.x, q.y, q.z + (q.type === 'hound' ? 24 : 46)); if (sx < -20 || sx > r.W + 20 || sy < -20 || sy > r.H + 20) continue;
      if (q.bubble && (q.vis !== 'hidden' || q === M.escort)) { const lines = E.font.wrap(q.bubble.text, 110), bw = Math.max(...lines.map(l => E.font.width(l))) + 8, bh = lines.length * 9 + 4, bx = Math.round(sx - bw / 2), by = Math.round(sy - bh - 12);
        px.rect(g, bx, by, bw, bh, '#f4ead5'); px.rect(g, bx, by + bh, bw, 1, '#8a7a60'); px.poly(g, [[sx - 3, by + bh], [sx + 3, by + bh], [sx, by + bh + 4]], '#f4ead5'); lines.forEach((l, i) => E.font.text(g, l, bx + 4, by + 2 + i * 9, '#1a1418', { outline: false })); }
      if (!q.alive || q === M.escort || q.boss || q.vis === 'hidden' || q.civilian && !q.disguised) continue;
      const st = q.mind.state, c = MOOD[st];
      if (q.asleep) E.font.text(g, 'Zz', sx, sy - 6 - Math.round(Math.sin(G.real * 3) * 2), '#b8c8ff', { align: 'center', outline: false, shadow: '#000' });
      else if (q.eating && q.eatT > 0) E.font.text(g, '...', sx, sy - 6, '#f4ead5', { align: 'center', outline: false, shadow: '#000' });
      else if (st !== 'calm') { E.font.text(g, st === 'alert' ? '!' : '?', sx, sy - 9, c, { align: 'center', scale: 2, outline: false, shadow: '#000' }); E.ui.bar(g, Math.round(sx) - 7, Math.round(sy) + 6, 14, 2, Math.min(1, q.mind.level / 1.2), c); }
      if (B.mouseMode()) { const p = G.input.pointer(); if (p && Math.hypot(p[0] - sx, p[1] - sy - 24) < 18) { E.font.text(g, q.label, sx, sy - 22, '#f4ead5', { align: 'center', outline: false, shadow: '#000' }); E.ui.bar(g, Math.round(sx) - 10, Math.round(sy) - 12, 20, 2, Math.min(1, q.mind.level / 1.2), c); } }
      if (M.dev && M.dev.ai) E.font.text(g, st + (q.bellRun ? ' BELL' : ''), sx, sy + 10, '#ffffff', { align: 'center', font: 'tiny' });
    }
    // chevrons toward alerted enemies off screen
    for (const q of M.guards) { if (!q.alive || q.mind.state !== 'alert' || q.civilian) continue; const [sx, sy] = r.w(q.x, q.y, q.z + 20); if (sx >= 0 && sx <= r.W && sy >= 0 && sy <= r.H) continue; const cx = clamp(sx, 10, r.W - 10), cy = clamp(sy, 10, r.H - 10), a = Math.atan2(sy - r.H / 2, sx - r.W / 2); px.poly(g, [[cx + Math.cos(a) * 6, cy + Math.sin(a) * 6], [cx + Math.cos(a + 2.4) * 5, cy + Math.sin(a + 2.4) * 5], [cx + Math.cos(a - 2.4) * 5, cy + Math.sin(a - 2.4) * 5]], '#ff4a3a'); }
    // over the hero: breath and stamina
    const [hx, hy] = r.w(h.x, h.y, h.z + 44);
    if (h.dive || h.breath < B.T('breath') - .1) { const n = Math.ceil(h.breath / B.T('breath') * 6); for (let k = 0; k < 6; k++) px.disc(g, hx - 13 + k * 5, hy - 4, 2, k < n ? '#a8d8ff' : '#2a3a4a'); }
    if (h.stamina < h.staminaMax - .5) { const u = h.stamina / h.staminaMax; for (let a = 0; a < 16; a++) { const an = -Math.PI / 2 + a / 16 * TAU; px.dot(g, Math.round(hx + 14 + Math.cos(an) * 4), Math.round(hy + 6 + Math.sin(an) * 4), a / 16 <= u ? '#5ae0a0' : '#2a3a2a'); } }
    // grapple anchors: the highlighted one, or all of them while aiming
    const L = h.grappleHold > .25 ? h.anchors || [] : h.anchor ? [h.anchor] : [];
    for (const a of L) { const [ax, ay] = r.w(a.x, a.y, a.z), on = a === h.anchor, s = on ? 4 + Math.round(Math.sin(G.real * 6)) : 2; px.poly(g, [[ax, ay - s], [ax + s, ay], [ax, ay + s], [ax - s, ay]], on ? '#e8b04a' : '#8a7a5a'); }
  });
};
/* where the objective marker points */
B.objectiveTarget = M => {
  const ob = M.objectives.find(o => o.state === 'active' && !o.optional && (!o.after || o.after.every(x => M.objDone(x)))); if (!ob) return null;
  if (ob.type === 'assassinate') { const g = M.guards.find(q => q.id === ob.target && q.alive); return g ? { x: g.x, y: g.y, z: g.z, label: 'TARGET' } : null; }
  if (ob.type === 'defeat') { const b = M.bosses.find(q => q.bossId === ob.boss); return b && b.alive ? { x: b.x, y: b.y, z: b.z, label: b.active ? '' : 'DUEL' } : null; }
  if (ob.type === 'reach' || ob.type === 'escort') { if (ob.exit && M.exit) return { x: M.exit.x, y: M.exit.y, z: 0, label: 'EXIT' }; if (ob.at) return { x: cc(ob.at[0]), y: cc(ob.at[1]), z: ob.z || 0, label: '' }; }
  if (ob.type === 'rescue' || ob.type === 'interact' || ob.type === 'stopTimer') { const it = M.interacts.find(i => !i.done && (i.id === ob.interact || (ob.flag && i.count === ob.flag))); return it ? { x: it.x, y: it.y, z: it.z, label: '' } : null; }
  if (ob.type === 'retrieve') { const p = M.pickups.find(q => q.id === ob.pickup && !q.taken); return p ? { x: p.x, y: p.y, z: p.z, label: '' } : null; }
  if (ob.type === 'flag' && ob.flag === 'trialDone') { const n = M.talkers[0]; return n ? { x: n.x, y: n.y, z: 0, label: 'GRANNY' } : null; }
  return null;
};
