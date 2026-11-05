/* ---- THE VIEW: draws the world (or the host's world on a client). Rigs live here: made and posed only when drawn ---- */
const rgb = h => E.hex(h);
/** a realm's floor: flagstones, rugs and dust, lava that glows, stairwells that fall away into the dark */
function floorTexFor(realm, F) {
  const R = REALM_LOOK[realm], st = R.floor.map(rgb), alt = R.alt.map(rgb), mortar = rgb(R.mortar), FL = { stones: st.slice(1, 4), mortar, hi: st[4], lo: st[0], speck: st[0] };
  const lavaA = rgb('#ff5a14'), lavaB = rgb('#ffb43a'), lavaC = rgb('#7a1a0a'), black = [8, 6, 12], gold = rgb('#e8c060');
  const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  return (x, y, tag) => {
    const cx = Math.floor(x / T), cy = Math.floor(y / T), lx = x - cx * T, ly = y - cy * T;
    if (tag === 'lava') {
      const n = E.noise2(x / 9, y / 9), n2 = E.noise2(x / 3.5 + 9, y / 3.5);
      const c = n > .62 ? lavaB : n > .38 ? lavaA : mixc(lavaC, lavaA, n / .38);
      return [...mixc(c, lavaB, n2 > .75 ? .5 : 0), .7];
    }
    if (tag === 'stairs') {
      const rim = lx < 1.5 || lx > T - 1.5 || ly < 1.2;
      if (rim) return mixc(st[2], gold, ly < 1.2 && lx > 3 && lx < 13 ? .4 : 0);
      const step = Math.floor((ly - 1.2) / 2.6), edge = (ly - 1.2) % 2.6 < .7;
      return mixc(edge ? st[3] : st[1], black, Math.min(1, step / 5 + .1));
    }
    let base;
    if (realm === 'banquet') {
      const dark = (cx + cy) & 1, v = E.noise2(x / 7 + (dark ? 4 : 0), y / 7);
      base = dark ? mixc(alt[0], alt[1], v * .6) : mixc(st[0], st[1], v * .6);
      if (lx < .7 || ly < .7) base = mixc(base, gold, .35);
      if (tag === 'alt') base = mixc(alt[1], alt[2], E.hash2(Math.floor(x / 3), Math.floor(y / 3)) * .5);
      return base;
    }
    if (realm === 'furnace') {
      base = E.tex.flagstone(x, y, FL, 12);
      if ((lx < 1.6 || ly < 1.6) && E.hash2(cx, cy) > .3) base = mortar;
      if ((Math.abs(lx - 2.5) < .8 || Math.abs(lx - 13.5) < .8) && (Math.abs(ly - 2.5) < .8 || Math.abs(ly - 13.5) < .8)) base = st[4];
      const glow = E.noise2(x / 30, y / 30); if (glow > .7) base = mixc(base, lavaA, (glow - .7) * .5);
    } else if (R.planks) {
      const row = Math.floor(y / 5), off = E.hash2(row, 3) * 40, seam = (x + off) % 40 < 1 || y % 5 < .8, grain = E.noise2(x / 9 + row * 3, y / 2) * .25, k = E.hash2(Math.floor((x + off) / 40), row);
      base = seam ? mortar : mixc(st[k < .33 ? 1 : k < .66 ? 2 : 3], st[0], grain);
      if (!seam && (x + off) % 40 > 37.6 && y % 5 > 2 && y % 5 < 3) base = st[0];
    } else base = E.tex.flagstone(x, y, FL, realm === 'ossuary' ? 9 : 8);
    if (tag === 'alt') {
      if (realm === 'larder') { const edge = lx < 1 || lx > T - 1 || ly < 1 || ly > T - 1; base = edge ? alt[0] : (Math.floor(lx / 2) + Math.floor(ly / 4)) % 3 ? alt[1] : alt[2]; }
      else base = mixc(base, alt[1], E.hash2(Math.floor(x / 2), Math.floor(y / 2)) * .7);
    }
    return base;
  };
}

/* ---- rigs, kept per entity ---- */
const RIGS = new Map();
let lastDraw = 0;
function rigOf(e, make) { let v = RIGS.get(e); if (!v || v.key !== make.key) { v = { rig: make(), key: make.key, t: 0 }; RIGS.set(e, v); } return v.rig; }
const heroRig = h => rigOf(h, Object.assign(() => HERO_RIGS[h.cls](), { key: h.cls }));
const monRig = m => rigOf(m, Object.assign(() => MON_RIGS[m.type](m.rank), { key: m.type + m.rank }));
const BOW_SPEC = { a0: 0, a1: 0, z0: 1, z1: 1, reach: 9, r0: 7, r1: 9, hand: 'L', rel: true, blade: 0, lean: -.2 };
const SIZE_BY_RANK = [0, .86, 1, 1.12];

function drawWorld(r) {
  if (!W) return;
  const now = game.real, fdt = clamp(now - lastDraw, 0, .05); lastDraw = now;
  const view = E.charView(r.view), map = W.map, R = REALM_LOOK[W.realm];
  map.drawFloor(r); map.queueWalls(r);
  L.enabled = true; L.ambient = R.ambient - (W.impatience >= 3 ? .06 : 0);
  // stairs: an arch over each, and the floor number carved on skip stairs
  for (const s of W.stairs) {
    const x = mid(s.cx), y = mid(s.cy);
    if (s.to) r.queue(x, y, 0, g => { const [sx, sy] = r.w(x, y, 1); E.font.text(g, String(s.to), sx, sy - 4, '#ffe08a', { align: 'center', scale: 2, shadow: '#000', outline: false }); }, { bias: .2, emissive: true });
    L.add(x, y, 6, 34, .5, { color: '#ffd070' });
    if (W.impatience >= 3 || W.firsts.stairsSeen) r.decal(() => r.groundRing(x, y, 9 + Math.sin(now * 4) * 1.5, '#ffe08a'), { emissive: 1 });
  }
  // torches on the walls, props in the corners
  for (const t of W.dec.torches) { const x = mid(t.cx), y = (t.cy + 1) * T + 1; r.prop('torch', x, y, 13, { light: true, color: R.light }); }
  for (const d of W.dec.deco) drawDeco(r, d, R);
  if (W.realm === 'furnace') for (const c of W.p.lava) if ((c.cx + c.cy * 3) % 4 === 0) L.add(mid(c.cx), mid(c.cy), 4, 40, .55, { color: '#ff6a1a' });
  // open doors: the bars slide up out of sight
  for (const d of W.doors) if (d.open && W.t - d.openT < .5) { const u = (W.t - d.openT) / .5; for (const [cx, cy] of d.cells) r.queue(mid(cx), (cy + 1) * T, 0, g => { const z0 = u * 24, [ax, ay] = r.w(mid(cx) - 7, (cy + 1) * T, z0), [bx, by] = r.w(mid(cx) + 7, (cy + 1) * T, z0 + 24 * (1 - u)); for (let k = 0; k < 5; k++) { const X = ax + (bx - ax) * k / 4; px.line(g, X, ay, X, by, '#3a3a44', 1); } }, { bias: .5 }); }
  drawFeatures(r, now);
  drawItems(r, now, view);
  drawGens(r, now);
  drawMonsters(r, fdt, view, now);
  if (W.boss) drawBoss(r, fdt, view, now);
  drawHeroes(r, fdt, view, now);
  drawShots(r, now);
  // the hero's light: a soft pool so heroes are never lost in the dark
  for (const h of W.heroes) if (h.alive) L.add(h.x, h.y, 14, 96, .28, { color: '#fff0d0' });
  if (W.magicFlash > 0) L.add(W.heroes[0] ? W.heroes[0].x : 0, W.heroes[0] ? W.heroes[0].y : 0, 30, 400, W.magicFlash * 2, { color: '#ffffff' });
  if (CHEATS.hitboxes) drawHitboxes(r);
  if (CHEATS.flowfield) drawFlow(r);
  drawReticle(r);
}
function drawDeco(r, d, R) {
  const x = mid(d.cx), y = mid(d.cy), f = d.facing;
  switch (d.prop) {
    case 'barrel': r.shape('barrel', x, y, 0, { facing: f, scale: .75 }); break;
    case 'keg': r.shape(ASH('keg', 'barrel'), x, y, 0, { facing: f, scale: .7 }); break;
    case 'sacks': r.shape('sack', x - 3, y, 0, { facing: f, scale: .8 }); r.shape('sack', x + 4, y + 2, 0, { facing: f + 1, scale: .7 }); break;
    case 'crate': r.shape('crate', x, y, 0, { facing: f, scale: .7 }); break;
    case 'rack': r.shape('gd-rack', x, y, 0, { facing: 0, scale: .9 }); break;
    case 'candles': r.shape(ASH('candle-triple', 'jar'), x, y, 0, { scale: .9 }); r.prop('candle', x + 4, y + 3, 0, { light: true, size: .8 }); break;
    case 'coffin': r.shape(ASH('coffin-old', 'crate'), x, y, 0, { facing: f + Math.PI / 2, scale: .55 }); break;
    case 'bones': r.prop('bones', x, y, 0, { size: 1.1 }); break;
    case 'skull': r.prop('skull', x, y, 0, { size: 1.2 }); r.prop('candle', x + 5, y + 2, 0, { light: true, size: .7 }); break;
    case 'jar': r.shape('gd-jar', x, y, 0, { scale: 1 }); break;
    case 'urn': r.shape('pot', x, y, 0, { scale: .9 }); break;
    case 'brazier': r.prop('brazier', x, y, 0, { light: true, size: .9 }); break;
    case 'firedrum': r.prop('firedrum', x, y, 0, { light: true, size: .9 }); break;
    case 'anvil': r.shape('gd-anvil', x, y, 0, { facing: f }); break;
    case 'chains': r.prop('bones', x, y, 0, { size: .8 }); r.shape('gd-anvil', x + 2, y - 2, 0, { facing: f, scale: .7 }); break;
    case 'candelabra': r.prop('candelabra', x, y, 0, { light: true, size: 1 }); break;
    case 'banner': r.shape(ASH('banner-red', 'crate'), x, y - 6, 0, { facing: Math.PI / 2, scale: .9 }); break;
    case 'pillar': r.shape('gd-pillar', x, y, 0, {}); break;
  }
}
function drawFeatures(r, now) {
  for (const p of W.plates) r.shape('gd-plate', mid(p.cx), mid(p.cy), p.used ? -.5 : 0, {});
  for (const [i, p] of W.pads.entries()) { r.shape('gd-pad', mid(p.cx), mid(p.cy), 0, {}); const a = now * 3 + i; r.decal(() => { for (let k = 0; k < 3; k++) r.groundArc(mid(p.cx), mid(p.cy), 3.5 + k * 1.5, 4.3 + k * 1.5, a + k * 2, a + k * 2 + 1.6, '#8afff4'); }, { emissive: 1 }); L.add(mid(p.cx), mid(p.cy), 2, 26, .5, { color: '#6ae8e0' }); }
  for (const q of W.runes) { r.shape('gd-rune', mid(q.cx), mid(q.cy), 0, {}); L.add(mid(q.cx), mid(q.cy), 2, 20, .35 + Math.sin(now * 5) * .1, { color: '#ff4a6a' }); }
  for (const s of W.spikes) {
    const j = s.trem ? Math.sin(now * 80) * .6 : 0;
    r.shape(s.up ? 'gd-spikes' : 'gd-spikeplate', mid(s.cx) + j, mid(s.cy), 0, {});
  }
  for (const g of W.beams) {
    // pylons where the beam meets walls; the beam drawn bright while on, a flicker before
    const c0 = g.cells[0], c1 = g.cells[g.cells.length - 1], v = g.dir === 'v', show = g.on || (g.warn && Math.floor(now * 20) % 2);
    const ends = v ? [[mid(c0.cx), Math.min(c0.cy, c1.cy) * T], [mid(c0.cx), (Math.max(c0.cy, c1.cy) + 1) * T]] : [[Math.min(c0.cx, c1.cx) * T, mid(c0.cy)], [(Math.max(c0.cx, c1.cx) + 1) * T, mid(c0.cy)]];
    for (const [x, y] of ends) r.shape('gd-pylon', x, y, 0, { scale: .8 });
    if (!show) continue;
    const [a, b] = ends;
    r.queue((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0, gg => { for (const z of [5, 9, 13]) { const [x0, y0] = r.w(a[0], a[1], z), [x1, y1] = r.w(b[0], b[1], z); px.glow(gg, 1); px.line(gg, x0, y0 + Math.sin(now * 30 + z) * .7, x1, y1, g.on ? '#9afff8' : '#3a8a88', 1); } }, { emissive: true, bias: .4 });
    if (g.on) L.add((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 8, 50, .6, { color: '#6ae8e0' });
  }
  if (W.bell) { const b = W.bell, sw = Math.sin(now * 9) * b.swing * .5; r.shape('gd-bell', b.x, b.y, 0, { facing: Math.PI / 2 + sw }); if (b.target) L.add(b.x, b.y, 20, 40, .5, { color: '#ffd060' }); }
}
const SHAKE = () => (Math.random() - .5) * 1.4;
function drawItems(r, now, view) {
  for (const it of W.items) {
    if (it.gone || it.pending) continue;
    const bob = Math.sin(now * 3 + it.t) * 1, x = it.x, y = it.y, z = it.z || 0, D = it.D;
    switch (it.type) {
      case 'roast': r.shape(ASH('wholer-ham', 'pot'), x, y, z, { scale: .62, facing: it.t }); break;
      case 'loaf': r.shape(ASH('loaf-round', 'pot'), x, y, z, { scale: .8 }); break;
      case 'platter': r.shape(ASH('plate-dinner', 'pot'), x, y, z, { scale: .85 }); break;
      case 'stew': r.shape(ASH('bowl-soup', 'pot'), x, y, z, { scale: .8, mats: { s: 'gd-soup' } }); r.queue(x, y, z + 4, g => { if (Math.floor(now * 3 + it.t) % 3 === 0) { const [sx, sy] = r.w(x, y, z + 6 + (now * 6 % 4)); px.dot(g, sx, sy, '#9ae84a'); } }); break;
      case 'chest': case 'lockedchest': r.prop('chest', x, y, z, { open: it.open, size: .9, color: D.locked ? '#5a4a6a' : '#8a5a2a' }); if (D.locked) r.sprite(x, y, 14 + bob, SPR.key, {}); break;
      case 'key': r.shadow(x, y, 3, .3); r.sprite(x, y, 5 + bob, SPR.key, { glow: .4 }); break;
      case 'gold': r.shadow(x, y, 4, .3); r.sprite(x, y, 2, SPR.gold, { glow: .2 }); break;
      case 'gem': r.shadow(x, y, 3, .3); r.sprite(x, y, 4 + bob, (it.id % 2) ? SPR.gem : SPR.ruby, { glow: .5 }); if (Math.random() < .03) P.glints(x, y, 8, 1, '#ffffff', 6); break;
      case 'crown': r.shadow(x, y, 4, .3); r.sprite(x, y, 4 + bob, SPR.crown, { glow: .5 }); if (Math.random() < .05) P.glints(x, y, 10, 1, '#fff0a0', 8); break;
      case 'cider': r.shadow(x, y, 3, .3); r.sprite(x, y, 1, SPR.jug, {}); break;
      case 'flask': r.shadow(x, y, 3, .3); r.sprite(x, y, 3 + bob, SPR.flask, { glow: .6 }); L.add(x, y, 8, 18, .35, { color: '#5a8aff' }); break;
      case 'special': r.shadow(x, y, 3, .3); r.sprite(x, y, 4 + bob, SPR['sp_' + it.sub] || SPR.flask, { glow: .7 }); L.add(x, y, 8, 22, .45, { color: get('specials', it.sub).color }); break;
      case 'amulet': r.shadow(x, y, 3, .3); r.sprite(x, y, 6 + bob * 1.5, SPR['am_' + it.sub] || SPR.gem, { glow: .7 }); L.add(x, y, 8, 22, .45, { color: get('amulets', it.sub).color }); break;
      case 'gauntlet': r.shadow(x, y, 6, .4); r.queue(x, y, 10 + bob * 2, g => drawGauntlet(g, ...r.w(x, y, 10 + bob * 2), 1.4, now), { emissive: true }); L.add(x, y, 12, 70, .9, { color: '#ffd060' }); break;
    }
  }
}
/** the Iron Gauntlet: a mailed fist, gold-trimmed, glowing */
function drawGauntlet(g, x, y, k, now) {
  const C = E.tones('#9aa0ac'), Gd = E.tones('#e8c040');
  px.glow(g, 1);
  px.rect(g, x - 4 * k, y - 2 * k, 8 * k, 7 * k, C.sh); px.rect(g, x - 3.4 * k, y - 1.6 * k, 6 * k, 5.4 * k, C.base);
  for (let i = 0; i < 4; i++) px.rect(g, x - 4 * k + i * 2 * k, y - 6 * k, 1.6 * k, 4.4 * k, i % 2 ? C.lt : C.base);
  px.rect(g, x - 5 * k, y + 4.6 * k, 10 * k, 2.4 * k, Gd.base); px.rect(g, x - 5 * k, y + 4.6 * k, 10 * k, .8 * k, Gd.hi);
  px.dot(g, x - 2 * k, y - 4 * k, '#ffffff');
  if (Math.floor(now * 4) % 3 === 0) px.dot(g, x + 3 * k, y - 5 * k, '#fff8d0');
}
function drawGens(r, now) {
  for (const g of W.gens) {
    if (g.dead) continue;
    const j = g.shake > 0 ? SHAKE() : 0, s = g.breathe > 0 ? 1.06 : 1;
    r.shape(g.D.shape, g.x + j, g.y, g.D.onTable ? 10 : 0, { params: { dmg: g.dmg }, scale: s, facing: Math.PI / 2, pick: g });
    if (g.type === 'grate') L.add(g.x, g.y, 4, 34, .7, { color: '#ff7a2a' });
    if (g.type === 'shrine') L.add(g.x, g.y, 18, 30, .5, { color: '#ffc060' });
    if (g.shake > .1) r.queue(g.x, g.y, 24, gg => { const [sx, sy] = r.w(g.x, g.y, 26); E.font.text(gg, String(Math.ceil(g.hp)), sx, sy, '#ffe08a', { align: 'center', shadow: '#000', outline: false }); }, { bias: 3 });
  }
}
function attackOf(m) {
  const D = m.D, st = m.state;
  if (m.ai === 'melee' || m.ai === 'imp' || m.ai === 'fryar') {
    const spec = E.MOVES[m.ai === 'fryar' ? 'bash' : m.ai === 'imp' ? 'claw' : 'overhead'];
    if (st === 'wind') return { spec, phase: 'wind', u: clamp(m.stateT / D.wind, 0, 1) };
    if (st === 'strike') return { spec, phase: 'active', u: clamp(m.stateT / .12, 0, 1) };
    if (st === 'recover') return { spec, phase: 'recover', u: clamp(m.stateT / Math.max(.1, D.every - D.wind - .12), 0, 1) };
  }
  if (m.ai === 'lobber' && st === 'throw') return { spec: E.MOVES.throw, phase: m.stateT < .3 ? 'wind' : 'active', u: m.stateT < .3 ? m.stateT / .3 : (m.stateT - .3) / .15 };
  return null;
}
function drawMonsters(r, fdt, view, now) {
  const hover = hoverTarget();
  for (const m of W.monsters) {
    if (m.dead) continue;
    if (!r.visible(m.x, m.y, 10, 30, 30, 30)) continue;
    const rig = monRig(m), riseK = m.rise > 0 ? 1 - m.rise / .4 : 1, z = (m.z || 0) - (1 - riseK) * 14 + (m.D.fly && m.ai !== 'ghost' ? 4 + Math.sin(now * 2 + m.id) * 2 : 0);
    if (m.ai === 'ghost') rig.update(fdt, { vx: m.vx, vy: m.vy, gape: m.gape, size: SIZE_BY_RANK[m.rank] });
    else if (rig instanceof E.Blob) rig.update(fdt, { walk: Math.min(1, Math.hypot(m.vx, m.vy) / 30), flap: 1, squash: m.state === 'spit' ? -.2 : 0, look: [Math.cos(m.facing), Math.sin(m.facing)] });
    else rig.update(fdt, { x: m.x, y: m.y, z: 0, vx: m.vx, vy: m.vy, facing: m.facing, attack: attackOf(m), hurt: m.hitT > 0, pose: m.ai === 'tithe' && m.draining ? 'cast' : null, expr: m.state === 'wind' ? 'angry' : null });
    if (m.ai !== 'ghost') r.shadow(m.x, m.y, m.r * .9, .3);
    const alpha = m.ai === 'fryar' && m.hidden ? .12 : m.ai === 'ghost' ? 1 : riseK < 1 ? .6 : 1;
    if (alpha < .2 && Math.random() < .5) continue;
    r.actor(m.x, m.y, z, (g, ox, oy) => rig.draw(g, ox, oy, view), { flash: m.hitT > 0 ? '#ffffff' : null, flashMix: .7, alpha: alpha < 1 ? alpha : undefined, outline: hover === m ? '#ffe08a' : false, every: W.monsters.length > 60 && m !== hover ? 2 : 1, key: m });
    // telegraphs: the imp's mouth glows; the lobber's crock is raised; a fryar's pan drawn back
    if (m.ai === 'imp' && m.state === 'spit') { r.queue(m.x, m.y, 10, g => { const [sx, sy] = r.w(m.x + Math.cos(m.facing) * 3, m.y + Math.sin(m.facing) * 3, 8); px.glow(g, 1); px.disc(g, sx, sy, 1.5 + m.stateT * 6, '#ffd040'); }, { emissive: true, bias: 1 }); L.add(m.x, m.y, 8, 24, .6, { color: '#ff8a2a' }); }
    if (m.ai === 'snatcher') r.queue(m.x, m.y, 10, g => { const b = Math.abs(Math.sin(now * 14)) * 1.5, [sx, sy] = r.w(m.x - Math.cos(m.facing) * 4, m.y - Math.sin(m.facing) * 4, 11 + b); px.disc(g, sx, sy, m.loot ? 4.5 : 3.5, '#8a7a50'); px.disc(g, sx - 1, sy - 1, m.loot ? 3.4 : 2.4, '#b8a070'); if (m.loot && m.loot.type !== 'none') px.dot(g, sx, sy - 3, m.loot.type === 'flask' ? '#5a8aff' : '#f8d048'); }, { bias: -.2 });
    if (m.ai === 'tithe') { L.add(m.x, m.y, 20, 30, .4, { color: '#ff2a2a' }); if (m.draining) { const h = W.heroes.find(h => h.alive && near(h, m, 20)); if (h && Math.random() < .5) P.add({ kind: 'ember', x: h.x, y: h.y, z: 14, vx: (m.x - h.x) * 3, vy: (m.y - h.y) * 3, vz: 6, max: .3, color: '#ff3a3a' }); } }
    if (hover === m) r.queue(m.x, m.y, 30, g => { const [sx, sy] = r.w(m.x, m.y, 34); E.font.text(g, m.D.name + (m.D.immune ? '' : ' ' + 'I'.repeat(m.rank)), sx, sy, '#ffe08a', { align: 'center', shadow: '#000', outline: false }); }, { bias: 4 });
  }
}
function drawBoss(r, fdt, view, now) {
  const K = W.boss, rig = rigOf(K, Object.assign(() => MON_RIGS.king(), { key: 'king' }));
  const pose = K.dead ? 'die' : K.state === 'eat' ? 'cast' : K.state === 'stomp' ? 'crouch' : K.phase === 0 ? 'hips' : null;
  const attack = K.throwT > 0 ? { spec: E.MOVES.throw, phase: K.throwT > .2 ? 'wind' : 'active', u: 1 - (K.throwT % .2) / .2 } : null;
  rig.update(fdt, { x: K.x, y: K.y, z: 0, vx: K.vx, vy: K.vy, facing: K.facing, pose, attack, hurt: K.hitT > 0, expr: K.state === 'eat' ? 'smile' : K.phase === 3 ? 'shout' : 'angry' });
  r.shadow(K.x, K.y, 14, .4);
  if (K.state === 'aim' && K.charge) r.decal(() => { const a = K.charge.a, x1 = K.x + Math.cos(a) * 200, y1 = K.y + Math.sin(a) * 200; for (let k = 0; k < 20; k++) { const u = k / 20; r.groundDisc(K.x + (x1 - K.x) * u, K.y + (y1 - K.y) * u, 2.5, Math.floor(now * 10) % 2 ? '#ff4a3a' : '#ffd040'); } }, { emissive: 1 });
  if (K.state === 'stomp') r.decal(() => r.groundRing(K.x, K.y, 46 * Math.min(1, K.stateT / .6), '#ff4a3a'), { emissive: 1 });
  if (K.stomp > 0) r.decal(() => r.groundRing(K.x, K.y, 46 + (1 - K.stomp / .5) * 20, '#ffd040'), { emissive: 1 });
  if (K.fog) r.decal(() => { const f = K.fog; for (let k = 0; k < 14; k++) { const a = f.a + (k / 13 - .5) * 1.1; for (let d = 30; d < 130; d += 22) r.groundDisc(f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 7, '#4a6a2a', .35); } });
  r.actor(K.x, K.y, 0, (g, ox, oy) => {
    rig.draw(g, ox, oy, view);
    if (K.open && !K.dead) { const q = rig.worldOffset ? rig.worldOffset(rig.J.shC) : [0, 0, 30], p = view.p(q[0], q[1], q[2] - 6); drawGauntlet(g, ox + p[0], oy + p[1], .9, now); }
  }, { flash: K.hitT > 0 ? '#ffffff' : null, xray: { color: '#c84aff' } });
  if (K.open) L.add(K.x, K.y, 30, 50, .7, { color: '#ffd060' });
}
function drawHeroes(r, fdt, view, now) {
  for (const h of W.heroes) {
    const rig = heroRig(h), dead = !h.alive, firing = h.throwT > 0;
    let attack = h.combo.state || null;
    if (!attack && firing) { const u = 1 - h.throwT / .18; attack = h.D.throwMove === 'bow' ? { spec: BOW_SPEC, phase: u < .5 ? 'wind' : 'active', u: u < .5 ? u * 2 : (u - .5) * 2 } : E.move(h.D.throwMove === 'cast' ? 'cast' : 'throw', u < .4 ? u / .4 : (u - .4) / .6, u < .4 ? 'wind' : 'active'); }
    rig._gdDraw = firing && h.D.throwMove === 'bow' ? 1 : 0;
    rig.o.hunch = h.cls === 'hexer' ? .3 + (h.hp < 200 ? .3 : 0) : h.hp < 200 ? clamp((200 - h.hp) / 200, 0, .6) : 0;
    const pose = dead ? 'die' : h.castT > 0 ? 'cast' : W.cheer ? 'cheer' : h.stun > 0 ? 'guard' : null;
    rig.update(fdt, { x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, facing: firing || attack ? h.aim : h.facing, attack, hurt: h.hurtT > 0, pose, down: h.riseT > 0 ? h.riseT : undefined, expr: h.hurtT > 0 ? 'wince' : h.eatT > 0 ? 'smile' : null });
    if (h.eatT > 0) rig.kick(.08);
    const sink = h.sinkT ? Math.min(1, h.sinkT / .5) * 12 : 0;
    if (!dead) { r.shadow(h.x, h.y, 6, .35); r.decal(() => r.groundRing(h.x, h.y, 8, h.color), { emissive: 1 }); }
    if (!dead && h.stair > 0) r.decal(() => r.groundRing(h.x, h.y, 11, '#ffe08a'), { emissive: 1 });
    const blink = h.inv > 0 && !dead && Math.floor(now * 12) % 2, veil = h.amulet && h.amulet.type === 'veil';
    r.actor(h.x, h.y, h.z - sink, (g, ox, oy) => rig.draw(g, ox, oy, view), { xray: { color: h.color, actors: true }, flash: h.hurtT > 0 ? '#ff4a3a' : blink ? '#ffffff' : null, flashMix: .5, alpha: veil ? .5 : dead ? .7 : undefined, key: h });
    rig.drawSmear && h.combo.state && rig.drawSmear(r);
    if (dead && h.deadT < 2) { if (Math.random() < .3) P.add({ kind: 'smoke', x: h.x, y: h.y, z: 6 + h.deadT * 16, vz: 10, max: .8, color: '#d8e0f0' }); }
    if (h.amulet && !dead) { const A2 = get('amulets', h.amulet.type); r.decal(() => r.groundArc(h.x, h.y, 9.5, 11, -Math.PI / 2, -Math.PI / 2 + TAU * h.amulet.t / AMULET_TIME, A2.color), { emissive: 1 }); if (h.amulet.type === 'stench' && Math.random() < .3) P.add({ kind: 'smoke', x: h.x + E.rand(-6, 6), y: h.y + E.rand(-6, 6), z: 4, vz: 8, max: .7, color: '#8ad04a' }); if (h.amulet.type === 'ironskin' && Math.random() < .2) P.glints(h.x, h.y, 14, 1, '#ffe08a', 8); }
    if (h.onMenu > 0 && !dead) r.sprite(h.x, h.y, 40 + Math.sin(now * 8) * 2, SPR.bell, { glow: .8 });
    if (h.queasy > 0 && !dead && Math.random() < .2) P.add({ kind: 'bit', x: h.x, y: h.y, z: 26, vz: 10, max: .5, color: '#9ae84a' });
    if (h.stun > 0 && !dead) for (let k = 0; k < 3; k++) { const a = now * 6 + k * 2.1; r.queue(h.x, h.y, 32, g => { const [sx, sy] = r.w(h.x + Math.cos(a) * 6, h.y + Math.sin(a) * 4, 34); px.dot(g, sx, sy, '#ffe060'); }, { bias: 2, emissive: true }); }
    if (game.settings.names && !dead && (W.heroes.length > 1 || h.name.length > 2)) r.queue(h.x, h.y, 40, g => { const [sx, sy] = r.w(h.x, h.y, 42); E.font.text(g, h.name, sx, sy, h.color, { align: 'center', shadow: '#000', outline: false }); }, { bias: 5 });
  }
}
function drawShots(r, now) {
  for (const b of W.shots.list) {
    if (b.dead) continue;
    const spr = SHOT_SPR[b.kind] || SHOT_SPR.hex, rot = b.kind === 'axe' ? now * 18 : Math.atan2(b.vy, b.vx);
    r.shadow(b.x, b.y, 2, .25);
    r.sprite(b.x, b.y, b.z, spr, { anchor: 'center', rot, glow: b.kind === 'hex' ? 1 : .3 });
    if (b.kind === 'hex') L.add(b.x, b.y, b.z, 18, .5, { color: '#d070ff' });
  }
  for (const b of W.eshots.list) {
    if (b.dead) continue;
    if (b.grav) {   // a lob: its shadow grows where it will land
      const left = b.life - b.t, k = clamp(1 - left / .9, .2, 1);
      r.decal(() => r.groundRing(b.lx, b.ly, 3 + k * 9, left < .6 ? '#ff4a3a' : '#7a3a2a'), { emissive: left < .6 ? 1 : 0 });
      r.shadow(b.x, b.y, 2.5, .3);
      r.sprite(b.x, b.y, b.z, b.kind === 'plate' ? SHOT_SPR.plate : SHOT_SPR.crock, { anchor: 'center', rot: now * 10 });
    } else { r.sprite(b.x, b.y, b.z, SHOT_SPR.fireball, { anchor: 'center', glow: 1 }); L.add(b.x, b.y, b.z, 24, .7, { color: '#ff7a2a' }); if (Math.random() < .4) P.add({ kind: 'ember', x: b.x, y: b.y, z: b.z, vz: 4, max: .3, color: '#ffb040' }); }
  }
}
/** the mouse: a reticle on the ground where it aims; a monster or generator under it is outlined and named */
function hoverTarget() {
  const h = W && W.heroes.find(q => !q.remote && q.aimAt); if (!h) return null;
  const [mx, my] = h.aimAt; let best = null, bd = 12 * 12;
  for (const m of W.monsters) { if (m.dead) continue; const d = (m.x - mx) ** 2 + (m.y - my) ** 2; if (d < bd) { bd = d; best = m; } }
  return best;
}
function drawReticle(r) {
  for (const h of W.heroes) {
    if (!h.aimAt || !h.alive || h.remote) continue;
    const [x, y] = h.aimAt;
    r.decal(() => { r.groundRing(x, y, 5, '#ffffff'); r.groundRing(x, y, 2, h.color); }, { emissive: 1 });
    const g = W.gens.find(g => !g.dead && Math.hypot(g.x - x, g.y - y) < 12);
    if (g) r.queue(g.x, g.y, 26, gg => { const [sx, sy] = r.w(g.x, g.y, 28); E.font.text(gg, g.D.name + ' ' + 'I'.repeat(g.rank), sx, sy, '#ffe08a', { align: 'center', shadow: '#000', outline: false }); }, { bias: 4 });
  }
}
function drawHitboxes(r) {
  r.decal(() => {
    for (const m of W.monsters) if (!m.dead) r.groundRing(m.x, m.y, m.r, '#ff4a4a');
    for (const h of W.heroes) r.groundRing(h.x, h.y, h.r, '#4aff4a');
    for (const g of W.gens) if (!g.dead) r.groundRing(g.x, g.y, g.r, '#ffff4a');
    if (W.boss) r.groundRing(W.boss.x, W.boss.y, W.boss.r, '#ff4aff');
  }, { emissive: 1 });
}
function drawFlow(r) {
  const F = W.flow, M = W.map;
  r.overlay(g => {
    for (let cy = 0; cy < M.h; cy++) for (let cx = 0; cx < M.w; cx++) {
      const d = F.d[cy * M.w + cx]; if (d >= 1e9) continue;
      const [sx, sy] = r.w(mid(cx), mid(cy), 0); const sxx = sx - r.ix, syy = sy - r.iy;
      if (sxx < 0 || syy < 0 || sxx > r.W || syy > r.H) continue;
      px.dot(g, sxx, syy, d < 4 ? '#ff4a4a' : d < 10 ? '#ffd04a' : '#4a8aff');
    }
  });
}
