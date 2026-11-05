// HUD, popups, objective tracker, and the world draw.
(() => {
const { E, T } = DQ;
const px = E.px, F = DQ.F;
const cellC = c => c * T + 8;

// ---------- world draw ----------
DQ.drawWorld = function (r) {
  const S = DQ.S, game = DQ.game, w = S.world, map = w.map, h = S.hero, t = S.time;
  r.sky(['#06051a', '#0d0b2a', '#141238']);
  map.drawFloor(r);
  // town border stitches
  if (S.town.planted) {
    const rad = DQ.townRadius(), x0 = (S.town.x - rad) * T, y0 = (S.town.y - rad) * T, x1 = (S.town.x + rad + 1) * T, y1 = (S.town.y + rad + 1) * T;
    r.decal(g => {
      const off = (t * 10) % 8, col = DQ.phase(S.clock.hour) === 'night' ? '#fff4c0' : '#f3e9c8';
      const dash = (ax, ay, bx, by) => { const n = Math.hypot(bx - ax, by - ay); for (let d = off; d < n; d += 8) { const p = r.w(ax + (bx - ax) * d / n, ay + (by - ay) * d / n, 0), q = r.w(ax + (bx - ax) * Math.min(n, d + 4) / n, ay + (by - ay) * Math.min(n, d + 4) / n, 0); px.line(g, p[0], p[1], q[0], q[1], col, 1); } };
      dash(x0, y0, x1, y0); dash(x1, y0, x1, y1); dash(x1, y1, x0, y1); dash(x0, y1, x0, y0);
    });
    if (S.ringFx) { S.ringFx.t += 1 / 60; const rr = S.ringFx.t * 120; r.decal(() => r.groundArc(S.ringFx.x, S.ringFx.y, Math.max(1, rr - 4), rr, 0, 6.283, '#ffe9a0', Math.max(0, .8 - S.ringFx.t * .4))); if (S.ringFx.t > 2) S.ringFx = null; }
    if (S.siege.phase === 'prep') { const m = DQ.siegeGates(); }
  }
  // golden mark before the banner is planted
  if (S.mode === 'story' && !S.town.planted) { const p = DQ.POI.banner; r.decal(() => { r.groundArc(cellC(p[0]), cellC(p[1]), 7 + Math.sin(t * 3) * 1.5, 11, 0, 6.283, '#ffd36a', .8); r.groundArc(cellC(p[0]), cellC(p[1]), 0, 6, 0, 6.283, '#ffd36a', .25); }); }
  // dev: room tint
  if (DQ.devShowRooms) r.decal(() => { for (const rm of S.town.rooms) for (const [cx, cy] of rm.cells) r.groundArc(cellC(cx), cellC(cy), 0, 7, 0, 6.283, '#58e0a0', .35); for (const lk of S.leaks || []) for (const [cx, cy] of lk.cells.slice(0, 40)) r.groundArc(cellC(cx), cellC(cy), 0, 5, 0, 6.283, '#ff6060', .3); });
  // telegraphs
  r.decal(() => { for (const m of S.monsters) { if (m.tele && m.def.boss) { const k = m.tele.kind; if (k === 'slam') r.groundArc(m.x, m.y, 0, (m.id === 'gnarlgrim' ? 3.5 : 3) * T, 0, 6.283, '#ff4a4a', .18 + .1 * Math.sin(t * 20)); else if (k === 'toss') r.groundArc(m.tossAt.x, m.tossAt.y, 0, 22, 0, 6.283, '#ff4a4a', .3); else if (k === 'charge') r.groundArc(m.x, m.y, 0, 18, m.face - .3, m.face + .3, '#ff4a4a', .4); } for (const ri of m.rings || []) r.groundArc(ri.x, ri.y, Math.max(0, ri.r - ri.band), ri.r, 0, 6.283, '#ffb050', .5); } });
  map.queueWalls(r);
  r._map = null;
  // objects
  const cull = (x, y) => r.visible(x, y, 0);
  for (const o of w.list) {
    const def = DQ.OBJECTS[o.type], x = cellC(o.x), y = cellC(o.y); if (!cull(x, y)) continue;
    if (def.door) { if (o.open) r.prop('door', x, y, 0, { open: true }); continue; }
    const z = w.height(o.x, o.y) * T;
    if (def.shape) r.shape(def.shape, x, y, z, { facing: o.facing, flash: o.flash > 0 ? '#ffffff' : undefined, mats: def.tint ? undefined : undefined });
    else if (def.prop) { if (o.type === 'banner') drawBanner(r, o, x, y); else r.prop(def.prop, x, y, z, { light: false, size: def.prop === 'crystal' ? 1.3 : 1.2 }); }
    if (def.light && o.type !== 'torch') {}
    if (def.light) game.lights.add(x, y, z + 14, def.light * (o.type === 'banner' ? 1 : 1), .9, { color: def.color });
    if (o.type === 'torch') game.lights.add(x, y, z + 14, def.light, .95, { color: def.color });
    if (o.type === 'portal') { r.queue(x, y, 20, g => { const p = r.w(x, y, 22); for (let i = 0; i < 6; i++) { const a = t * 2 + i; px.dot(g, Math.round(p[0] + Math.cos(a) * 9), Math.round(p[1] + Math.sin(a) * 4 - 6 + Math.sin(a * 2) * 2), '#c8e0ff'); } }, { emissive: true }); }
    if (def.collect) r.queue(x, y, 12, g => { const p = r.w(x, y, 10 + Math.sin(t * 3 + o.x) * 2); px.disc(g, p[0], p[1], 3, '#c8a030'); px.disc(g, p[0], p[1], 2, '#ffe060'); px.dot(g, p[0] - 1, p[1] - 1, '#fff'); }, { emissive: true });
    if (o.type === 'ballista' && o.aim != null) {}
  }
  // drops
  for (const d of S.drops) { if (!cull(d.x, d.y)) continue; const bob = d.settled ? Math.sin(d.bob) * 1.5 : 0; r.queue(d.x, d.y, d.z + 5 + bob, g => { const p = r.w(d.x, d.y, d.z + 5 + bob); DQ.drawIcon(g, d.id, p[0] - 5, p[1] - 8, 10); }, {}); r.shadow(d.x, d.y, 3, .3, undefined, w.height(Math.floor(d.x / T), Math.floor(d.y / T)) * T); }
  if (S.bundle) { const b = S.bundle; r.queue(b.x, b.y, 8, g => { const p = r.w(b.x, b.y, 8 + Math.sin(t * 3) * 2); px.disc(g, p[0], p[1], 5, '#8a5a32'); px.disc(g, p[0], p[1] - 1, 4, '#c68c54'); px.rect(g, p[0] - 1, p[1] - 6, 2, 3, '#ffe9a0'); }, { emissive: true }); }
  // cheer bubbles
  for (const b of S.bubbles) r.queue(b.x, b.y, b.z, g => { const p = r.w(b.x, b.y, b.z + Math.sin(t * 4 + b.x) * 2); px.disc(g, p[0] - 2, p[1] - 1, 2, '#ff7ab0'); px.disc(g, p[0] + 2, p[1] - 1, 2, '#ff7ab0'); px.poly(g, [[p[0] - 4, p[1]], [p[0] + 4, p[1]], [p[0], p[1] + 5]], '#ff7ab0'); px.dot(g, p[0] - 2, p[1] - 2, '#fff'); }, { emissive: true });
  // actors
  for (const rs of S.residents) {
    if (!cull(rs.x, rs.y)) continue; const z = rs.body.z; r.shadow(rs.x, rs.y, 6, .3, undefined, rs.body.groundZ || 0);
    r.actor(rs.x, rs.y, z, (g, ox, oy) => rs.rig.draw(g, ox, oy, r.view), { pick: rs, flash: rs.flash > 0 ? '#ff6060' : undefined });
    const q = DQ.offerFor(rs.id), rd = DQ.readyFor(rs.id);
    if (q || rd) r.queue(rs.x, rs.y, z + 46, g => { const p = r.w(rs.x, rs.y, z + 46 + Math.abs(Math.sin(t * 4)) * 3); F(g, rd ? '?' : '!', p[0], p[1] - 3, '#ffd36a', { align: 'center', scale: 2 }); }, { emissive: true });
    if (rs.balloon) r.queue(rs.x, rs.y, z + 44, g => { const p = r.w(rs.x, rs.y, z + 44); px.rect(g, p[0] - 7, p[1] - 8, 14, 9, '#fff'); px.rect(g, p[0] - 1, p[1] + 1, 2, 2, '#fff'); F(g, rs.balloon.kind === 'dots' ? '...' : rs.balloon.kind === 'note' ? '♪' : '!', p[0], p[1] - 7, '#222', { align: 'center', shadow: null }); }, {});
    if (rs.ko > 0) r.queue(rs.x, rs.y, z + 30, g => { const p = r.w(rs.x, rs.y, z + 30); F(g, 'x_x', p[0], p[1], '#fff', { align: 'center' }); }, {});
    if (rs.sleeping) r.queue(rs.x, rs.y, z + 34, g => { const p = r.w(rs.x, rs.y, z + 34 + Math.sin(t * 2) * 2); F(g, 'Zz', p[0], p[1], '#c8e0ff', { align: 'center' }); }, {});
  }
  for (const m of S.monsters) {
    if (!cull(m.x, m.y) || m.dead && m.dead <= 0) continue; const z = m.z + (m.hover ? 6 + Math.sin(t * 5 + m.x) * 2 : 0);
    r.shadow(m.x, m.y, m.def.r + 1, .3, undefined, m.body.groundZ || 0);
    r.actor(m.x, m.y, z, (g, ox, oy) => m.rig.draw(g, ox, oy, r.view), { pick: m, flash: m.flash > 0 ? '#ffffff' : m.state === 'windup' && Math.floor(t * 16) % 2 ? '#ff4040' : m.tangle > 0 ? '#ffd36a' : undefined, flashMix: .6, alpha: m.state === 'dead' ? Math.max(0, m.dead) : 1 });
    if (m.state === 'notice') r.queue(m.x, m.y, z + 28, g => { const p = r.w(m.x, m.y, z + 28); F(g, '!', p[0], p[1], '#ff6a6a', { align: 'center', scale: 2 }); }, {});
    if (m.hp < m.maxHp && !m.def.boss && m.state !== 'dead') r.queue(m.x, m.y, z + 24, g => { const p = r.w(m.x, m.y, z + 24); DQ.bar(g, p[0] - 8, p[1], 16, 2, m.hp / m.maxHp, '#e84a5a'); }, {});
    if (m.tangle > 0) r.queue(m.x, m.y, z + 36, g => { const p = r.w(m.x, m.y, z + 36); F(g, 'TANGLED', p[0], p[1], '#ffd36a', { align: 'center' }); const q = r.w(m.x, m.y, z + 18); const bl = 1 + Math.sin(t * 10) * .5; px.disc(g, q[0], q[1], 3 * bl, '#ffd36a'); }, { emissive: true });
    if (m.def.boss) game.lights.add(m.x, m.y, z + 20, 50, .5, { color: m.id === 'gnarlgrim' ? '#a070ff' : '#ffd060' });
  }
  const hv = S.cut && S.cut.kind === 'plant' ? 1 : 1;
  if (h) {
    r.shadow(h.x, h.y, 6, .35, undefined, h.groundZ || 0);
    r.actor(h.x, h.y, h.z, (g, ox, oy) => { if (h.dead > 0 && h.dead < 1.2) px.blend(g, h.dead / 1.2, 'normal', () => h.rig.draw(g, ox, oy, r.view)); else h.rig.draw(g, ox, oy, r.view); }, { xray: { color: '#ffd36a', actors: false }, flash: h.inv > 0 && Math.floor(t * 24) % 2 ? '#ffffff' : undefined, flashMix: .5 });
    if ((h.combo.busy || h.spinAtk.busy) && h.rig.drawSmear) h.rig.drawSmear(r);
    if (h.charge > .1) r.queue(h.x, h.y, h.z + 40, g => { const p = r.w(h.x, h.y, h.z + 40); DQ.bar(g, p[0] - 8, p[1], 16, 2, h.charge / .6, h.charge >= .6 ? '#ffe060' : '#8a84b8'); }, {});
    if (h.thought > 0) r.queue(h.x, h.y, h.z + 48, g => { const p = r.w(h.x, h.y, h.z + 48 + Math.sin(t * 5) * 1.5); px.rect(g, p[0] - 9, p[1] - 12, 18, 16, '#fff'); px.rect(g, p[0] - 1, p[1] + 4, 2, 2, '#fff'); F(g, '!', p[0], p[1] - 10, '#d89a20', { align: 'center', scale: 2, shadow: null }); }, {});
  }
  DQ.drawPattern(r);
  // shots
  for (const s of S.shots) r.queue(s.x, s.y, s.z, g => { const p = r.w(s.x, s.y, s.z); const col = s.kind === 'spool' ? '#ff8a8a' : s.kind === 'yarn' ? '#a070d0' : s.kind === 'button' ? '#ffe060' : s.kind === 'pie' ? '#e8b860' : '#fff'; px.disc(g, p[0], p[1], s.kind === 'yarn' ? 4 : 2, col); px.dot(g, p[0] - 1, p[1] - 1, '#fff'); }, { emissive: true });
  // cursor / target
  if (h && h.hp > 0 && !S.cut && !DQ.ui.isOpen() && !DQ.attractOn) {
    const tg = DQ.heroTarget(); const hh = w.height(tg.cx, tg.cy) * T, ok = tg.inReach;
    r.queue(cellC(tg.cx), cellC(tg.cy), hh + 2, g => { const a = r.w(tg.cx * T, tg.cy * T, hh), b = r.w((tg.cx + 1) * T, tg.cy * T, hh), c = r.w((tg.cx + 1) * T, (tg.cy + 1) * T, hh), d = r.w(tg.cx * T, (tg.cy + 1) * T, hh); const col = ok ? '#f3e9c8' : '#ff6a6a'; const pulse = Math.floor(t * 4) % 2; for (const [p, q] of [[a, b], [b, c], [c, d], [d, a]]) px.line(g, p[0], p[1], q[0], q[1], col, 1); if (ok && pulse) px.dot(g, a[0], a[1], '#fff'); }, { emissive: true });
  }
  if (DQ.crack && DQ.crack.t > 0) {}
  // lights
  const amb = DQ.ambient(S.clock.hour); game.lights.enabled = true; game.lights.ambient = Math.max(.28, amb.a);
  if (h) game.lights.add(h.x, h.y, h.z + 20, 70, S.clock.hour >= 19 || S.clock.hour < 5 ? .55 : .2, { color: '#ffe9c0' });
};
function drawBanner(r, o, x, y) {
  const S = DQ.S, t = S.time, rise = Math.min(1, (S.bannerRise = Math.min(1, (S.bannerRise == null ? 1 : S.bannerRise) + 1 / 120)));
  r.queue(x, y, 40, g => {
    const base = r.w(x, y, 0), top = r.w(x, y, 40 * rise);
    px.line(g, base[0], base[1], top[0], top[1], '#6a4222', 2);
    const sway = Math.sin(t * 2) * 2; const x0 = top[0], y0 = top[1];
    for (let i = 0; i < 7; i++) { const row = y0 + i * 2, wv = Math.round(sway * i / 7); px.rect(g, x0 + 1, row, 13 + wv, 2, i < 2 ? '#ffd36a' : i < 4 ? '#e86a5a' : i < 6 ? '#5aa8e8' : '#ffd36a'); }
    px.poly(g, [[x0 + 1, y0 + 14], [x0 + 14 + Math.round(sway), y0 + 14], [x0 + 7 + Math.round(sway / 2), y0 + 19]], '#ffd36a');
    if (S.bannerFlash > 0) px.blend(g, .5, 'add', () => px.disc(g, x0 + 7, y0 + 8, 14, '#ff6040'));
  }, { emissive: true });
}

// ---------- HUD ----------
const hotX = r => Math.round(r.W / 2 - 8 * 11);
DQ.drawHud = function (r) {
  const S = DQ.S, h = S.hero, game = DQ.game, I = game.input; if (!S || !h) return;
  r.overlay(g => {
    const W = r.W, H = r.H, t = S.time;
    // vitals
    px.rect(g, 4, 4, 102, 26, '#000000'); px.blend(g, .5, 'normal', () => px.rect(g, 4, 4, 102, 26, '#0a0818'));
    F(g, 'HP', 8, 7, '#ff9a9a'); DQ.bar(g, 24, 8, 76, 6, h.hp / h.maxHp, h.hp / h.maxHp < .25 && Math.floor(t * 4) % 2 ? '#ff8080' : '#e84a5a'); F(g, Math.ceil(h.hp) + '/' + h.maxHp, 100, 7, '#fff', { align: 'right', scale: 1 });
    F(g, 'Belly', 8, 19, '#ffd890'); DQ.bar(g, 38, 20, 62, 5, h.belly / 100, h.belly < 25 ? '#ff6a40' : '#e8a040');
    // clock + cheer
    const cx = W - 66, cy = 20, hr = S.clock.hour, ang = (hr / 24) * 6.283 - 1.57, night = hr >= 19 || hr < 5;
    px.disc(g, cx, cy, 15, '#0a0818'); px.disc(g, cx, cy, 13, night ? '#1a1850' : hr < 7 || hr >= 17 ? '#e0905a' : '#6ab8f0');
    const sx = cx + Math.cos(ang) * 8, sy = cy + Math.sin(ang) * 8; px.disc(g, sx, sy, 3, night ? '#e8e8ff' : '#ffe060');
    F(g, 'Day ' + S.clock.day, cx, cy + 18, '#fff', { align: 'center' }); F(g, String(Math.floor(hr)).padStart(2, '0') + ':' + String(Math.floor((hr % 1) * 60 / 10) * 10).padStart(2, '0'), cx, cy + 27, '#c8c0e8', { align: 'center' });
    if (S.town.planted) { F(g, 'Cheer ' + S.town.cheer, cx - 18, 5, '#ff9ac8', { align: 'right' }); F(g, 'Town Lv ' + S.town.level, cx - 18, 14, '#ffd36a', { align: 'right' }); }
    // objective tracker
    if (DQ.settings.hints !== false && S.mode === 'story') {
      const ob = DQ.currentObjective(); if (ob) {
        const w2 = Math.min(210, W - 220), x = W / 2 - w2 / 2; px.blend(g, .55, 'normal', () => px.rect(g, x, 4, w2, 22, '#0a0818')); F(g, ob.q.title, x + w2 / 2, 6, '#ffd36a', { align: 'center' });
        F(g, E.font.wrap(ob.text, w2 - 8)[0] || '', x + w2 / 2, 16, '#fff', { align: 'center' });
        const tg = DQ.objectiveTarget(ob); if (tg && !S.cut) drawMarker(g, r, tg);
      }
    }
    // siege / boss
    const sg = S.siege;
    if (['prep', 'wave', 'breather', 'boss'].includes(sg.phase)) {
      let txt = sg.phase === 'prep' ? 'The Knotted army approaches! ' + Math.floor(sg.t / 60) + ':' + String(Math.ceil(sg.t % 60)).padStart(2, '0') : sg.phase === 'wave' ? 'Wave ' + sg.wave + '/3   Foes ' + sg.left : sg.phase === 'breather' ? 'Wave cleared! Next in ' + Math.ceil(sg.t) : 'Gnarlgrim the Knotted!';
      px.blend(g, .6, 'normal', () => px.rect(g, W / 2 - 100, 32, 200, 24, '#2a0818')); F(g, txt, W / 2, 35, '#ff9a8a', { align: 'center' }); F(g, 'Banner', W / 2 - 94, 46, '#ffd36a'); DQ.bar(g, W / 2 - 46, 47, 142, 5, S.town.bannerHp / 300, '#ffd36a');
    }
    if (S.boss && S.boss.hp > 0) { const b = S.boss, bw = Math.min(200, W - 120), bx = W / 2 - bw / 2, by = H - 68; F(g, b.def.name, W / 2, by - 11, '#ffd36a', { align: 'center' }); DQ.bar(g, bx, by, bw, 6, b.hp / b.maxHp, b.tangle > 0 ? '#ffd36a' : '#c04a8a'); }
    const pp = DQ.patternProgress(); if (pp) { px.blend(g, .55, 'normal', () => px.rect(g, 4, 34, 110, 12, '#0a0818')); F(g, 'Cottage Pattern: ' + pp.done + '/' + pp.total, 8, 37, '#a0c8ff'); }
    // hotbar
    const hx = hotX(r), hy = H - 28;
    for (let i = 0; i < 8; i++) {
      const x = hx + i * 22, id = S.hotbar[i], cnt = id ? (S.bag[id] || 0) : 0, sel = i === S.sel;
      px.rect(g, x, hy, 20, 20, sel ? '#ffd36a' : '#0a0818'); px.rect(g, x + 1, hy + 1, 18, 18, sel ? '#4a3a70' : '#2a2450');
      if (id) { px.blend(g, cnt > 0 ? 1 : .35, 'normal', () => DQ.drawIcon(g, id, x + 2, hy + 2, 16)); if (cnt > 0 && DQ.ITEMS[id].stack > 1) F(g, cnt, x + 19, hy + 11, '#fff', { align: 'right' }); }
      F(g, i + 1, x + 2, hy + 1, '#8a84b8', { shadow: null }); DQ.ui.hit(x, hy, 20, 20, { click: () => { S.sel = i; } });
    }
    const sid = DQ.inv.hotId(); if (sid) F(g, DQ.ITEMS[sid].name, W / 2, hy - 10, '#fff', { align: 'center' });
    // context prompts
    if (!DQ.dialogOpen() && !S.cut) {
      const n = DQ.nearInteract(); const list = [['jump', 'Jump'], ['attack', I.lastDevice === 'mouse' || true ? 'Swing' : 'Swing'], ['place', sid ? (DQ.ITEMS[sid].kind === 'food' ? 'Eat' : 'Place') : 'Place']];
      if (n) list.push(['interact', { talk: 'Talk', chest: 'Open', station: 'Use', banner: 'Banner', bed: 'Sleep', portal: 'Travel', collect: 'Take', ballista: 'Man ballista', look: 'Look' }[n.kind]]);
      if (h.mount) { list.length = 0; list.push(['attack', 'Fire spool'], ['interact', 'Leave']); }
      list.push(['satchel', 'Satchel']);
      DQ.prompts(g, list, 6, H - 38);
    }
    if (S.leaks && DQ.leakHint && DQ.leakHint.t > 0) {}
    // toasts
    S.toasts.forEach((to, i) => { const a = Math.min(1, (to.life - to.t) * 2); px.blend(g, a, 'normal', () => F(g, to.text, W - 6, 56 + i * 10, to.color, { align: 'right' })); });
    // popups
    drawPopup(g, r, S);
    // low health vignette
    if (h.hp / h.maxHp < .25 && !DQ.settings.reduceFlash) px.blend(g, .15 + .1 * Math.sin(t * 6), 'normal', () => { px.rect(g, 0, 0, W, 4, '#ff0000'); px.rect(g, 0, H - 4, W, 4, '#ff0000'); px.rect(g, 0, 0, 4, H, '#ff0000'); px.rect(g, W - 4, 0, 4, H, '#ff0000'); });
    if (DQ.fade > 0) px.blend(g, DQ.fade, 'normal', () => px.rect(g, 0, 0, W, H, '#000'));
    if (S.cut && S.cut.skipT > 0) { F(g, 'Skipping...', W - 8, H - 12, '#fff', { align: 'right' }); DQ.bar(g, W - 70, H - 20, 62, 4, S.cut.skipT, '#ffd36a'); }
    else if (S.cut && S.cut.kind !== 'sleep') DQ.prompts(g, [['cancel', 'Hold to skip']], W - 100, H - 14);
    if (DQ.attractOn) { px.blend(g, .6, 'normal', () => px.rect(g, 0, H - 22, W, 22, '#000')); F(g, 'DEMO', 8, H - 17, '#ffd36a', { scale: 1 }); F(g, 'Press any button to play', W / 2, H - 17, Math.floor(t * 2) % 2 ? '#fff' : '#ffd36a', { align: 'center' }); }
    if (DQ.devOn) F(g, 'DEV', 4, H - 40, '#7aff7a');
  });
};
function drawMarker(g, r, tg) {
  const S = DQ.S, h = S.hero, z = (tg.z || 18), p = r.w(tg.x, tg.y, z); const W = r.W, H = r.H;
  const d = Math.round(Math.hypot(tg.x - h.x, tg.y - h.y) / T);
  const m = 14, on = p[0] > m && p[0] < W - m && p[1] > 40 && p[1] < H - 34;
  const bob = Math.sin(S.time * 5) * 2;
  if (on) { px.poly(g, [[p[0] - 4, p[1] - 10 + bob], [p[0] + 4, p[1] - 10 + bob], [p[0], p[1] - 4 + bob]], '#ffd36a'); F(g, d + 'm', p[0], p[1] - 20 + bob, '#ffd36a', { align: 'center' }); }
  else {
    const cx = W / 2, cy = H / 2, a = Math.atan2(p[1] - cy, p[0] - cx), ex = Math.max(m, Math.min(W - m, cx + Math.cos(a) * 400)), ey = Math.max(46, Math.min(H - 40, cy + Math.sin(a) * 400));
    px.poly(g, [[ex + Math.cos(a) * 7, ey + Math.sin(a) * 7], [ex + Math.cos(a + 2.5) * 6, ey + Math.sin(a + 2.5) * 6], [ex + Math.cos(a - 2.5) * 6, ey + Math.sin(a - 2.5) * 6]], '#ffd36a'); F(g, d + 'm', ex, ey + 8, '#ffd36a', { align: 'center' });
  }
}
function drawPopup(g, r, S) {
  const p = S.popups[0]; if (!p) return; const W = r.W, H = r.H, a = Math.min(1, p.t * 4, (p.life - p.t) * 3);
  px.blend(g, a, 'normal', () => {
    if (p.kind === 'room') { const y = H * .3 - (1 - Math.min(1, p.t * 3)) * 10; E.font.title(g, p.title, W / 2, y, { scale: 2, align: 'center', colors: ['#fff6c8', '#ffd36a', '#e07a2a'] }); F(g, p.text, W / 2, y + 22, '#fff', { align: 'center', scale: 2 }); return; }
    if (p.kind === 'level') { DQ.stitchBox(g, W / 2 - 150, H * .25, 300, 64, { border: '#ffd36a' }); F(g, p.title, W / 2, H * .25 + 10, '#ffd36a', { align: 'center', scale: 1 }); E.font.wrap(p.text, 280).slice(0, 4).forEach((l, i) => F(g, l, W / 2, H * .25 + 24 + i * 9, '#fff', { align: 'center' })); return; }
    const w = 230, x = W / 2 - w / 2, y = 34 + (p.kind === 'notion' ? 22 : 24); DQ.stitchBox(g, x, y, w, 40, { border: p.kind === 'quest' ? '#8affd0' : '#ffd36a' });
    if (p.kind === 'notion') { DQ.drawIcon(g, p.extra.icon, x + 8, y + 8, 24); F(g, p.title, x + 40, y + 8, '#ffd36a'); E.font.wrap(p.text, w - 48).slice(0, 3).forEach((l, i) => F(g, l, x + 40, y + 18 + i * 9, '#fff')); }
    else { F(g, p.title, x + w / 2, y + 11, p.kind === 'quest' ? '#8affd0' : '#ffd36a', { align: 'center' }); F(g, p.text, x + w / 2, y + 23, '#fff', { align: 'center' }); }
  });
}
DQ.hudTick = function (dt) {
  const S = DQ.S; for (const t of S.toasts) t.t += dt; S.toasts = S.toasts.filter(t => t.t < t.life);
  const p = S.popups[0]; if (p) { p.t += dt; if (p.t >= p.life) S.popups.shift(); }
};
})();
