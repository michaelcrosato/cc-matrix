/* Drawing a floor and the HUD. */
const glyph = a => (game.input.label ? game.input.label(a) : a);
const padLabel = (h, a) => { const I = h && h.input; return I && I.label ? I.label(a) : a; };

function animateAll(dt) {
  for (const m of W.mons) {
    const rg = m.rigD.rig, st = { x: m.x, y: m.y, z: m.z, vx: m.vx, vy: m.vy, facing: m.facing, hurt: m.flash > 0 };
    if (m.dead) { st.pose = 'die'; st.vx = st.vy = 0; if (m.rigD.kind === 'b') st.squash = -.4; }
    else if (m.rigD.kind === 'h') {
      st.attack = m.swing && m.swing.state || null;
      if (m.ch === 'o' && m.tell > 0) st.pose = 'cast'; if (m.isBoss && m.tell > 0) st.pose = m.attack === 'stomp' ? 'cheer' : 'cast';
      if (m.ch === 't') { st.vx *= .5; st.vy *= .5; }
    } else { st.squash = m.tell > 0 ? -.35 : Math.sin(m.t * 6) * .06; st.look = [Math.cos(m.facing), Math.sin(m.facing)]; }
    if (m.ch === 'g' && m.rigD.kind === 'b') st.squash = Math.sin(m.t * 5) * .1;
    rg.update(dt, st);
  }
}

function drawFloorMarks(r) {
  const T = W.time;
  for (const s of W.stairs) { r.groundDisc(s.x, s.y, 9, '#101020', .9); r.groundRing(s.x, s.y, 8, '#ffd860', .6 + .3 * Math.sin(T * 4)); }
  for (const s of W.skips) { r.groundDisc(s.x, s.y, 9, '#101020', .9); r.groundRing(s.x, s.y, 8, '#80c0ff', .6); r.queue(s.x, s.y, 0, g => { const [sx, sy] = r.w(s.x, s.y, 0); E.font.text(g, String(s.to), sx, sy - 5, '#c8e0ff', { align: 'center' }); }); }
  for (const p of W.pads) { r.groundDisc(p.x, p.y, 7, '#2a1050', .9); r.groundRing(p.x, p.y, 6 + Math.sin(T * 6), '#b080ff', .8); r.groundRing(p.x, p.y, 3, '#e0c0ff', .6); }
  for (const p of W.runes) { r.groundDisc(p.x, p.y, 6, '#403000', .9); r.groundRing(p.x, p.y, 5, '#ffe070', .7 + .2 * Math.sin(T * 8)); }
  for (const p of W.plates) if (!p.hit) { r.groundDisc(p.x, p.y, 6, '#303030', .9); r.groundRing(p.x, p.y, 5, p.kind === 'T' ? '#70e0ff' : '#ff6060', .8); }
  for (const s of W.spikes) { const ph = (T + s.ph) % 1.6, up = ph < .5, trem = ph > 1.35; r.groundDisc(s.x, s.y, 7, '#18141c', .9); if (up) r.queue(s.x, s.y, 0, g => { const [sx, sy] = r.w(s.x, s.y, 0); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) px.poly(g, [[sx + i * 4 - 1, sy + j * 2], [sx + i * 4, sy + j * 2 - 6], [sx + i * 4 + 1, sy + j * 2]], '#d8dce8'); }); else if (trem) r.groundRing(s.x, s.y, 4 + Math.sin(T * 60), '#ff6060', .5); else for (let i = -1; i <= 1; i += 2) r.groundDisc(s.x + i * 3, s.y, 1.2, '#c0c0c8', 1); }
  for (const b of W.rubble) r.groundDisc(b.x, b.y, 6, '#4a4038', .8);
  if (W.bellObj) { const b = W.bellObj; r.actor(b.x, b.y, 0, (g, ox, oy) => { const sw = b.rung ? Math.sin(b.t * 14) * Math.max(0, 1 - b.t / 3) * 4 : 0; px.sprite(g, SPR.bell, ox - 8 + sw, oy - 18); }); }
}

function drawBeams(r) {
  for (const b of W.beams) {
    const on = beamOn(b);
    r.queue(b.x, b.y, 6, g => {
      const [sx, sy] = r.w(b.x, b.y, 8), hx = b.vert ? 0 : 8, hy = b.vert ? 8 : 0;
      px.rect(g, sx - 2, sy - 8, 4, 12, '#505868'); px.dot(g, sx, sy - 9, on ? '#ff8080' : '#808090');
      if (on) { const a = b.vert ? [sx, sy - 1 - 7, sx, sy + 7] : [sx - 8, sy, sx + 8, sy]; px.line(g, a[0], a[1], a[2], a[3], '#ff2040', 3); px.line(g, a[0], a[1], a[2], a[3], '#ffd0d0', 1); r.glowDisc(g, sx, sy, 10, '#ff4060', .6); }
      void hx; void hy;
    }, { emissive: on });
  }
}

function drawItem(r, it) {
  if (it.gone) return;
  const bob = Math.sin(W.time * 3 + it.t) * 1.5 + 3;
  const k = it.kind;
  if (k === 'chest' || k === 'lchest') { r.prop('chest', it.x, it.y, 0, { size: 1, color: k === 'lchest' ? '#5a7ab0' : undefined }); return; }
  let spr = SPR[k]; if (k === 'potion') spr = potionSpr(it.sub); if (k === 'amulet') spr = amuSpr(it.sub);
  if (!spr) return;
  r.shadow(it.x, it.y, 5, .35, '#0c0818', it.z);
  const glow = { gold: '#ffd860', gem: '#60e8ff', crown: '#ffe080', key: '#fff0a0', potion: SPECIAL_COL[it.sub], amulet: AMULET_COL[it.sub], flask: '#c080ff', roast: null }[k];
  r.sprite(it.x, it.y, it.z + bob, spr, { anchor: 'bottom', glow: glow || undefined });
}

function drawMonster(r, m, view) {
  if (m.dead && m.dying > 1) return;
  const a = m.dead ? Math.max(0, 1 - m.dying / 1.0) : m.ch === 'y' && m.vis <= 0 ? .0 : m.emerge > 0 ? m.alpha : 1;
  const px0 = m.x, py0 = m.y;
  if (m.ch === 'y' && m.vis <= 0) { r.groundDisc(px0, py0, 5, '#201028', .35); return; }
  if (!m.dead || true) r.shadow(px0, py0, m.r + 1, .4 * a);
  const flash = m.flash > 0 ? '#ffffff' : null;
  r.actor(px0, py0, m.z || 0, (g, ox, oy) => m.rigD.rig.draw(g, ox, oy, view), { flash, flashMix: .7, alpha: m.ch === 'g' ? .75 * a : a, every: m.isBoss ? 1 : undefined, key: m });
  if (m.tell > 0 && m.ch === 'i') r.queue(m.x, m.y, 10, g => { const [sx, sy] = r.w(m.x, m.y, 8); r.glowDisc(g, sx, sy, 9, '#ff6020', .9); }, { emissive: true });
  if (m.tell > 0 && m.ch === 'o' && m.aimAt) r.groundRing(m.aimAt.x, m.aimAt.y, 6 + m.tell * 8, '#ff4030', .8);
  if (m.isBoss && m.tell > 0) { const rad = m.attack === 'stomp' ? 70 * (1 - m.tell / .8) : 0; if (rad) r.groundRing(m.x, m.y, rad, '#ff8040', .7); if (m.attack === 'charge') r.groundArc(m.x, m.y, 8, 150, m.facing - .12, m.facing + .12, '#ff4040', .35); }
  if (m.ch === 't') r.glowDisc && r.queue(m.x, m.y, 14, g => { const [sx, sy] = r.w(m.x, m.y, 8); r.glowDisc(g, sx, sy, 18, '#9040c0', .5); }, { emissive: true });
  if (m.isBoss && !m.dead) { r.queue(m.x, m.y, 60, g => { const [sx, sy] = r.w(m.x, m.y, 66); px.rect(g, sx - 22, sy, 44, 4, '#200808'); px.rect(g, sx - 21, sy + 1, Math.max(0, 42 * m.hp / m.maxhp), 2, '#e03040'); }); }
}

function drawHeroWorld(r, h, view) {
  if (h.gone) return;
  const col = h.C.color, away = h.down;
  r.shadow(h.x, h.y, 6, .45);
  if (!away) { r.groundRing(h.x, h.y, 9, col, .55); if (h.stairT > 0 && W.descend == null) r.groundArc(h.x, h.y, 11, 13, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, h.stairT / Math.max(.05, TUNE.stairHold)), '#ffd860', .9); }
  if (h.amulet && h.amuletT > 0) r.groundRing(h.x, h.y, 12, AMULET_COL[h.amulet], .8);
  const inv = h.invuln > 0 && Math.floor(W.time * 14) % 2 === 0;
  const alpha = h.amulet === 'veil' && h.amuletT > 0 ? .5 : h.tele > 0 ? .5 : (inv ? .4 : 1);
  r.actor(h.x, h.y, h.z, (g, ox, oy) => h.rig.draw(g, ox, oy, view), { xray: { color: col }, flash: h.flash > 0 ? '#ff3030' : h.amulet === 'ironskin' && h.amuletT > 0 ? '#ffe070' : null, flashMix: .35, alpha, key: h });
  if (h.combo.busy) r.queue(h.x, h.y, 8, () => h.rig.drawSmear(r), {});
  if (h.queasy > 0) r.queue(h.x, h.y, 40, g => { const [sx, sy] = r.w(h.x, h.y, 38); px.disc(g, sx, sy, 3, '#80c040'); });
  if (h.pickT > 0 && h.input) r.queue(h.x, h.y, 70, g => { const [sx, sy] = r.w(h.x, h.y, 60); E.font.text(g, padLabel(h, 'magic') + ': change fool', sx, sy - 6, '#ffd860', { align: 'center', outline: '#000', font: 'tiny' }); });
  if (h.bell > 0) r.queue(h.x, h.y, 50, g => { const [sx, sy] = r.w(h.x, h.y, 46); px.sprite(g, SPR.bell, sx - 8, sy - 10); });
  if (OPT.names && !away && W.heroes.length > 1) r.queue(h.x, h.y, 44, g => { const [sx, sy] = r.w(h.x, h.y, 42); E.font.text(g, 'P' + (h.slot + 1), sx, sy - 9, col, { align: 'center', outline: '#000', font: 'tiny' }); });
  if (away) r.queue(h.x, h.y, 30, g => { const [sx, sy] = r.w(h.x, h.y, 18 + h.downT * 8 % 20); px.disc(g, sx, sy, 2, '#d8e0ff'); px.disc(g, sx - 1, sy, 1, '#fff'); });
  if (h.reticle && !away) r.queue(h.reticle.x, h.reticle.y, 1, g => { const [sx, sy] = r.w(h.reticle.x, h.reticle.y, 0); px.line(g, sx - 4, sy, sx - 1, sy, col, 1); px.line(g, sx + 1, sy, sx + 4, sy, col, 1); px.line(g, sx, sy - 4, sx, sy - 1, col, 1); px.line(g, sx, sy + 1, sx, sy + 4, col, 1); });
}

function drawWorld(r) {
  const map = W.map, view = r.view, T = W.time;
  const L = game.lights;
  if (OPT.lighting) { L.enabled = true; L.ambient = W.kind === 'boss' ? .62 : .72; }
  map.drawFloor(r);
  drawFloorMarks(r);
  map.queueWalls(r);
  // doors: iron bars drawn over the door cells
  for (const d of W.doors) if (!d.open) for (const c of d.cells) r.queue((c.x + .5) * TS, (c.y + .5) * TS, 20, g => { const [sx, sy] = r.w((c.x + .5) * TS, (c.y + .5) * TS, 12); for (let i = -6; i <= 6; i += 3) px.rect(g, sx + i - 1, sy - 12, 2, 24, '#9a9aa8'); px.rect(g, sx - 8, sy - 2, 16, 2, '#6a6a78'); });
  else for (const c of d.cells) if (d.t < .4) r.queue((c.x + .5) * TS, (c.y + .5) * TS, 20, g => { const [sx, sy] = r.w((c.x + .5) * TS, (c.y + .5) * TS, 12 + d.t * 60); for (let i = -6; i <= 6; i += 3) px.rect(g, sx + i - 1, sy - 12, 2, 24, '#9a9aa8'); });
  for (const f of W.fakes) { const fx = (f.x + .5) * TS, fy = (f.y + .5) * TS; r.queue(fx, fy + 8, 12, g => { const t0 = REALMS[W.realm]; r.box(g, f.x * TS, f.y * TS, 0, (f.x + 1) * TS, (f.y + 1) * TS, 24, t0.top, t0.side); }, { solid: true }); }
  for (const d of W.decor) { if (d.type === 'torch') r.prop('torch', d.x, d.y, d.z, { light: true }); else r.prop(d.type, d.x, d.y, 0, { size: 1.2 }); }
  drawBeams(r);
  for (const it of W.items) drawItem(r, it);
  for (const g of W.gens) if (!g.dead || g.fade === undefined) {
    if (g.dead) continue;
    r.shadow(g.x, g.y, 9, .4);
    r.actor(g.x, g.y, W.kind === 'boss' && g.table ? 10 : 0, (gg, ox, oy) => drawGen(gg, ox, oy, g, T));
    if (g.ch === 'I') L.add(g.x, g.y, 8, 50, .8, { color: '#ff6020' });
  }
  for (const m of W.mons) drawMonster(r, m, view);
  for (const h of W.heroes) { drawHeroWorld(r, h, view); if (!h.down && !h.gone) L.add(h.x, h.y, 14, 120, .85, { color: '#ffe8c0' }); }
  for (const s of W.shots) { drawShot(r, s); L.add(s.x, s.y, 10, 22, .6, { color: s.kind === 'hex' ? '#c070ff' : '#fff0c0' }); }
  for (const f of W.foe) { drawFoe(r, f); if (f.kind === 'fire') L.add(f.x, f.y, 8, 40, .8, { color: '#ff8030' }); }
  for (const p of W.pads) L.add(p.x, p.y, 6, 30, .5, { color: '#a060ff' });
  for (const t of W.texts) r.queue(t.x, t.y, t.z + 20, g => { const [sx, sy] = r.w(t.x, t.y, t.z); E.font.text(g, t.str, sx, sy, t.col, { align: 'center', outline: '#000', font: 'tiny' }); });
  if (W.rings) for (const rg of W.rings) r.groundRing(rg.x, rg.y, rg.t * (rg.boss ? 90 : 260), rg.boss ? '#ff8040' : '#e8f0ff', Math.max(0, 1 - rg.t / .8));
  // the mouse in the world: hovering a monster or generator outlines it and names it
  const mh = W.heroes[0];
  if (mh && mh.reticle && !mh.down) {
    let best = null, bd = 12; for (const t of [...W.mons, ...W.gens]) { if (t.dead || (t.ch === 'y' && t.vis <= 0)) continue; const d = Math.hypot(t.x - mh.reticle.x, t.y - mh.reticle.y); if (d < bd) { bd = d; best = t; } }
    if (best) { r.groundRing(best.x, best.y, (best.r || 6) + 3, '#ffffff', .9); const nm = best.T ? best.T.name : best.G.name, rk = best.rank; r.queue(best.x, best.y, 60, g => { const [sx, sy] = r.w(best.x, best.y, 52); E.font.text(g, nm + '  RANK ' + rk, sx, sy, '#ffffff', { align: 'center', outline: '#000', font: 'tiny' }); }); }
  }
  if (DEV.botThoughts) for (const h of W.heroes) if (h.bot) r.queue(h.x, h.y, 80, g => { const [sx, sy] = r.w(h.x, h.y, 56); E.font.text(g, h.bot.think || '-', sx, sy - 10, '#80ff80', { align: 'center', outline: '#000', font: 'tiny' }); });
  if (DEV.flow && W.flow) { const me = W.heroes[0]; if (me) { const cx0 = Math.floor(me.x / TS), cy0 = Math.floor(me.y / TS); for (let dy = -6; dy <= 6; dy++) for (let dx = -8; dx <= 8; dx++) { const x = (cx0 + dx + .5) * TS, y = (cy0 + dy + .5) * TS, v = W.map.walkable(cx0 + dx, cy0 + dy) && W.flow.dir(x, y); if (v) r.groundArc && r.queue(x, y, 1, g => { const [sx, sy] = r.w(x, y, 0); px.line(g, sx, sy, sx + Math.round(v[0] * 5), sy + Math.round(v[1] * 3), '#40c0ff', 1); }); } } }
  if (DEV.hitboxes) { for (const m of W.mons) r.groundRing(m.x, m.y, m.r, '#ff0000', .9); for (const h of W.heroes) r.groundRing(h.x, h.y, h.r, '#00ff00', .9); for (const g of W.gens) r.groundRing(g.x, g.y, g.r, '#ffff00', .9); }
  // enter the hush: fog of hunger
  if (W.fog > 0) r.overlay(g => { px.blend(g, .25 * W.fog, 'multiply', () => px.rect(g, 0, 0, r.W, r.H, '#601020')); });
}

// ---------- HUD ----------
function hudPanel(g, h, x, y, w, i) {
  const col = h.C.color, hp = Math.max(0, Math.round(h.hp));
  E.ui.box(g, x, y, w, 34, { bg: ['#14101e', '#0a0812'], border: h.down ? '#503040' : col, alpha: .85 });
  px.disc(g, x + 16, y + 17, 13, col);
  h.rig.drawPortrait(g, x + 4, y + 5, 25, { zoom: 2.4, turn: .4, bg: '#1a1424', cape: false, weapon: false, tint: h.down ? '#808080' : undefined });
  E.font.text(g, h.name2 || h.C.name, x + 33, y + 3, col, { font: 'tiny' });
  const big = hp > 9999 ? '9999+' : String(hp), low = hp < 200 && !h.down, flash = low && Math.floor(game.real * 4) % 2 === 0;
  if (h.down) E.font.text(g, 'EATEN', x + 33, y + 10, '#c06060', { scale: 1 });
  else E.font.text(g, big, x + 33, y + 10, flash ? '#ff3030' : hp < 400 ? '#ffd040' : '#ffffff', { scale: 2, outline: '#000' });
  if (h.down) { if (!W.net && W.heroes.some(o => !o.down)) E.font.text(g, 'RISE: ' + padLabel(h, 'fire'), x + 33, y + 22, '#ffd860', { font: 'tiny' }); else if (W.net) E.font.text(g, 'RISING...', x + 33, y + 22, '#ffd860', { font: 'tiny' }); }
  else {
    E.font.text(g, String(h.score), x + 33, y + 25, '#c8c0e0', { font: 'tiny' });
    const kx = x + w - 50; drawSmall(g, "key", kx, y + 25); E.font.text(g, String(h.keys), kx + 10, y + 26, '#fff0a0', { font: 'tiny' });
    drawSmall(g, "flask", kx + 22, y + 25); E.font.text(g, String(h.flasks), kx + 30, y + 26, '#d0a0ff', { font: 'tiny' });
    if (h.amulet && h.amuletT > 0) { px.sprite(g, amuSpr(h.amulet), x + w - 17, y + 2); E.ui.bar(g, x + w - 19, y + 19, 17, 2, h.amuletT / 20, AMULET_COL[h.amulet]); }
    let px0 = x + 33; for (const k in h.specials) { px.rect(g, px0, y + 31, 4, 2, SPECIAL_COL[k]); px0 += 6; }
  }
}
function drawSmall(g, name, x, y) { const s = SPR1[name]; if (!s) return; px.sprite(g, s, x, y, false); }

function drawHud(r) {
  const heroes = W.heroes.filter(h => !h.gone), n = Math.max(heroes.length, W.net ? heroes.length : 1);
  const corner = game.cornerArea && game.cornerArea();
  r.overlay(g => {
    const Wd = r.W, avail = corner && corner.y0 < 40 ? Math.floor(corner.x0) - 6 : Wd, pw = Math.min(118, Math.floor((avail - 12) / 4));
    const slots = heroes;
    const totalW = pw * Math.max(slots.length, 1) + 3 * (slots.length - 1), x0 = Math.max(2, Math.floor((avail - totalW) / 2));
    slots.forEach((h, i) => hudPanel(g, h, Math.max(2, x0 + i * (pw + 3)), 2, pw, i));
    if (!W.net && !W.attract && slots.length < 4 && RUN.mode !== 'net') {
      const jx = Math.max(2, x0 + slots.length * (pw + 3)), pad = game.input.lastDevice === 'gamepad';
      if (jx + pw < Wd) { E.ui.box(g, jx, 2, pw, 34, { bg: ['#14101e', '#0a0812'], border: '#3a3050', alpha: .6 }); const t = Math.floor(game.real * 2) % 2; E.font.text(g, (pad ? glyph('start') : '2') + ' TO JOIN', jx + pw / 2, 14, t ? '#ffd860' : '#a09070', { align: 'center', font: 'tiny' }); }
    }
    // floor name
    const topY = 38;
    if (W.kind === 'floor') E.font.text(g, 'FLOOR ' + W.meta.no + '  ' + W.meta.name, Wd / 2, topY, '#e8d8b0', { align: 'center', shadow: '#000', font: 'tiny' });
    if (W.kind === 'treasure') { E.font.text(g, String(Math.max(0, Math.ceil(W.hoard.t))), Wd / 2, topY + 4, W.hoard.t < 8 ? '#ff4040' : '#ffd860', { align: 'center', scale: 3, outline: '#000' }); }
    if (W.kind === 'boss') E.font.text(g, W.meta.name, Wd / 2, topY, '#ffd860', { align: 'center', shadow: '#000', font: 'tiny' });
    if (W.net && W.net.hud) W.net.hud(g, r);
    if (devAny()) E.font.text(g, 'DEV', 4, r.H - 10, '#ff4040', { font: 'tiny', outline: '#000' });
    // caption
    if (OPT.captions && W.speech.length) {
      const c = W.speech[0], sc = r.W >= 400 ? 2 : 1, lines = E.font.wrap(c.text, r.W - 40, { scale: sc }), a = Math.min(1, c.life * 2);
      lines.slice(0, 2).forEach((ln, i) => E.font.text(g, ln, r.W / 2, r.H - 44 - (lines.length - 1 - i) * 17 * (sc / 2) - 6, a > .5 ? '#ffe9b8' : '#a08860', { align: 'center', scale: sc, outline: '#1a0c00', shadow: '#000' }));
    }
    // stairs arrow
    const stairs = W.stairs[0];
    if (stairs && (W.imp1 || W.doorsOpen) && W.kind === 'floor') {
      const me = W.heroes.find(h => !h.down && h.local !== false); if (me) {
        const a = Math.atan2(stairs.y - me.y, stairs.x - me.x), dd = Math.hypot(stairs.x - me.x, stairs.y - me.y);
        if (dd > 150) { const cx = r.W / 2, cy = r.H / 2, ex = cx + Math.cos(a) * (r.W / 2 - 18), ey = cy + Math.sin(a) * (r.H / 2 - 40); const k = Math.floor(game.real * 3) % 2; px.poly(g, [[ex + Math.cos(a) * 8, ey + Math.sin(a) * 8], [ex + Math.cos(a + 2.5) * 7, ey + Math.sin(a + 2.5) * 7], [ex + Math.cos(a - 2.5) * 7, ey + Math.sin(a - 2.5) * 7]], k ? '#ffd860' : '#c09030'); }
      }
    }
    // big centre text
    if (W.contT >= 0 && !W.attract) {
      E.font.text(g, 'CONTINUE? ' + Math.max(0, W.contN), r.W / 2, r.H / 2 - 20, '#ff6050', { align: 'center', scale: 3, outline: '#000' });
      const h0 = W.heroes[0]; E.font.text(g, 'Press ' + padLabel(h0, 'fire') + ' to rise again', r.W / 2, r.H / 2 + 10, '#ffe9b8', { align: 'center', scale: 1, shadow: '#000' });
    }
    if (W.cardT > 0) drawFloorCard(g, r);
    if (W.countdown !== undefined && W.countdown > 0) E.font.text(g, String(Math.ceil(W.countdown)), r.W / 2, r.H / 2 - 20, '#ffffff', { align: 'center', scale: 5, outline: '#000' });
  });
}
function drawFloorCard(g, r) {
  const a = Math.min(1, W.cardT * 2, (5 - W.cardT) * 2 + 1);
  px.blend(g, .6 * Math.min(1, a), 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#05030a'));
  const Rm = W.R, cx = r.W / 2;
  E.font.title(g, W.kind === 'floor' ? 'FLOOR ' + W.meta.no : W.kind === 'treasure' ? 'TREASURE ROOM' : 'THE BANQUET', cx, 54, { scale: 3, colors: ['#fff0b0', '#e0a030', '#8a4a10'], align: 'center', outline: '#000' });
  E.font.text(g, W.meta.name, cx, 92, Rm.accent, { align: 'center', scale: 2, outline: '#000' });
  if (W.cardLine) { const ls = E.font.wrap(W.cardLine, r.W - 60, { scale: 1 }); ls.forEach((ln, i) => E.font.text(g, ln, cx, 116 + i * 10, '#e8d8b0', { align: 'center', shadow: '#000' })); }
  if (W.step > 0 && W.heroes.length) { W.heroes.forEach((h, i) => { const x = cx - (W.heroes.length - 1) * 55 + i * 110; E.font.text(g, h.C.name, x, 150, h.C.color, { align: 'center', font: 'tiny' }); E.font.text(g, h.score + ' pts', x, 160, '#fff', { align: 'center', font: 'tiny' }); E.font.text(g, h.kills + ' kills  ' + h.treasure + ' loot', x, 170, '#b0a8c8', { align: 'center', font: 'tiny' }); }); }
  if (!W.net) E.font.text(g, 'Press ' + padLabel(W.heroes[0], 'fire') + ' to start', cx, r.H - 28, Math.floor(game.real * 2) % 2 ? '#ffd860' : '#a08850', { align: 'center' });
}
