/* 50-view: drawing a floor from W (the sim's, or a client's puppets): floor and walls, torches and props, features,
 * items, generators, monsters, heroes, shots, the King, lights; and the effects the happenings make. */

const RIGS = new Map();          // id -> { rig, key }
const VIEWT = { last: 0, dt: 1 / 60 };
const ITEM_SPR = it => it.kind === 'special' ? SPR.special[it.sub] : it.kind === 'amulet' ? SPR.amulet[it.sub] : SPR[it.kind];
function rigFor(id, key, make) { let e = RIGS.get(id); if (!e || e.key !== key) { e = { rig: make(), key }; RIGS.set(id, e); } e.seen = game.real; return e.rig; }
function atk(name, t, spec) {
  const s = spec || E.MOVES[name]; if (!s) return null;
  const w = s.wind, a = s.active, rc = s.recover;
  if (t < 0 || t > w + a + rc) return null;
  return t < w ? { spec: E.move(name).spec, phase: 'wind', u: t / w } : t < w + a ? { spec: E.move(name).spec, phase: 'active', u: (t - w) / a } : { spec: E.move(name).spec, phase: 'recover', u: (t - w - a) / rc };
}
const BOW = { name: 'bowdraw', rel: true, hand: 'both', a0: .05, a1: 0, z0: 1, z1: 1, r0: 2, r1: 6, wind: .08, active: .05, recover: .14, lunge: 0, lean: .1, blade: 0 };

/* ---- decoration: torches on wall faces, realm props against walls, decided once per floor from a hash ---- */
function decorate() {
  if (W.deco) return W.deco;
  const map = W.map, rm = REALMS[W.realm] || REALMS.larder, deco = { torches: [], props: [], lava: [] };
  const busy = new Set([...W.p.items, ...W.p.mons, ...W.p.gens, ...W.p.exits, ...W.p.pads, ...W.p.runes, ...W.p.spikes, ...W.p.beams, ...W.p.plates, ...W.p.starts].map(e => e.cx + ',' + e.cy));
  for (let cy = 1; cy < map.h - 1; cy++) for (let cx = 1; cx < map.w - 1; cx++) {
    const c = map.cell(cx, cy), hsh = E.hash2(cx * 3 + 1, cy * 7 + 2);
    if (c === 1 && map.cell(cx, cy + 1) === 0 && hsh < .17) deco.torches.push({ x: (cx + .5) * T, y: (cy + 1) * T + 1, z: 14, cx, cy });
    if (c === 0 && !busy.has(cx + ',' + cy) && W.p.rows[cy][cx] === '.') {
      const walls = [[0, -1], [-1, 0], [1, 0], [0, 1]].filter(([dx, dy]) => map.cell(cx + dx, cy + dy) === 1);
      if (walls.length >= 1 && hsh > .93) { const [dx, dy] = walls[0]; deco.props.push({ name: rm.props[Math.floor(E.hash2(cx, cy) * rm.props.length)], x: (cx + .5 + dx * .28) * T, y: (cy + .5 + dy * .28) * T }); }
    }
    if (map.floorAt((cx + .5) * T, (cy + .5) * T) === 'lava' && hsh < .2) deco.lava.push({ x: (cx + .5) * T, y: (cy + .5) * T });
  }
  W.deco = deco;
  return deco;
}
const ringDots = (g, x, y, rx, ry, c, n) => { for (let k = 0; k < n; k++) { const a = k / n * TAU; px.dot(g, x + Math.cos(a) * rx, y + Math.sin(a) * ry, c); } };
const SHAPE_PROPS = new Set(['barrel', 'crate', 'sack', 'jar', 'pot', 'anvil']);

function drawWorld(r) {
  if (!W) return;
  const now = game.real; VIEWT.dt = clamp(now - VIEWT.last, 0, .1); VIEWT.last = now; const dt = VIEWT.dt, t = W.t;
  const map = W.map, rm = REALMS[W.realm] || REALMS.larder, deco = decorate();
  game.cam.bounds = v => map.bounds(v);
  map.drawFloor(r); map.queueWalls(r);
  // torches and props
  for (const tc of deco.torches) { if (!r.visible(tc.x, tc.y, tc.z)) continue; r.prop('torch', tc.x, tc.y, tc.z, { light: true, color: rm.torch }); L.add(tc.x, tc.y + 10, 16, 70, .9, { color: rm.torch }); }
  for (const p of deco.props) { if (!r.visible(p.x, p.y, 0)) continue; if (SHAPE_PROPS.has(p.name)) r.shape(p.name, p.x, p.y, 0, { scale: .6 }); else r.prop(p.name, p.x, p.y, 0, { size: .8, light: p.name === 'candelabra' }); }
  for (const lv of deco.lava) L.add(lv.x, lv.y, 2, 40, .7, { color: '#ff6a1a' });
  if (W.realm === 'banquet') for (const x of [8, 22, 36]) { r.prop('chandelier', x * T, 12 * T, 40, { light: true }); L.add(x * T, 12 * T, 20, 120, 1, { color: '#ffd070' }); }
  // features
  for (const p of W.pads) r.decal(g => { const [sx, sy] = r.w(p.x, p.y, 0); for (let k = 0; k < 6; k++) { const a = t * 3 + k / 6 * TAU; px.dot(g, sx + Math.cos(a) * 5, sy + Math.sin(a) * 3, '#8affee'); } });
  for (const p of W.pads) L.add(p.x, p.y, 4, 30, .6, { color: '#4ae0d0' });
  const bs = beamOn(t);
  for (const b of W.beams) r.queue(b.x, b.y, 0, g => {
    if (bs === 'off') return; if (bs === 'flicker' && Math.floor(t * 20) % 2) return;
    const [x0, y0] = b.dir === 'v' ? r.w(b.x, b.y - 8, 2) : r.w(b.x - 8, b.y, 2), [x1, y1] = b.dir === 'v' ? r.w(b.x, b.y + 8, 2) : r.w(b.x + 8, b.y, 2);
    px.glow(g, 1); for (let k = 0; k < 3; k++) px.line(g, x0, y0 - k * 4, x1, y1 - k * 4, k === 1 ? '#ffffff' : '#7ab8ff'); px.glow(g, 0);
  }, { emissive: true });
  if (bs === 'on') for (const b of W.beams) L.add(b.x, b.y, 6, 30, .8, { color: '#7ab8ff' });
  for (const sp of W.spikes) { const st = spikeUp(sp, t); if (st === 'down') continue; r.queue(sp.x, sp.y, 0, g => { const [sx, sy] = r.w(sp.x, sp.y, 0), j = st === 'tremble' ? Math.sin(t * 80) : 0; for (const [dx, dy] of [[-4, -3], [0, -3], [4, -3], [-2, 1], [2, 1], [-4, 4], [0, 4], [4, 4]]) { const hgt = st === 'up' ? 5 : 1; px.line(g, sx + dx + j, sy + dy, sx + dx + j, sy + dy - hgt, '#d8dce8'); px.dot(g, sx + dx + j, sy + dy - hgt, '#ffffff'); } }); }
  for (const p of W.plates) if (p.used) r.decal(g => { const [sx, sy] = r.w(p.x, p.y, 0); px.rect(g, sx - 5, sy - 3, 10, 6, '#3a3a44'); });
  for (const e of W.exits) if (e.to) r.queue(e.x, e.y, 0, g => { const [sx, sy] = r.w(e.x, e.y, 0); otxt(g, String(e.to), sx, sy - 4, '#ffe08a', { align: 'center' }); });
  for (const e of W.exits) L.add(e.x, e.y, 2, 40, .7, { color: '#ffe0a0' });
  if (W.stage >= 3) for (const tc of deco.torches) L.add(tc.x, tc.y, 4, 30, .4, { color: '#ffe08a' });
  // items
  for (const it of W.items) {
    if (it.hideT > game.real) continue;
    if (!r.visible(it.x, it.y, 0)) continue;
    const bob = Math.sin(t * 3 + it.id) * 1.2, z = it.onTable ? 10 : 0;
    if (it.kind === 'chest' || it.kind === 'lchest') { r.shadow(it.x, it.y, 7, .35); r.prop('chest', it.x, it.y, 0, { size: .8, color: it.kind === 'lchest' ? '#5a5a6a' : undefined }); if (it.kind === 'lchest') r.sprite(it.x, it.y + 1, 7, SPR.lock, { anchor: 'center' }); continue; }
    const sp = ITEM_SPR(it); if (!sp) continue;
    if (!it.onTable) r.shadow(it.x, it.y, 4, .3);
    const glow = it.kind === 'special' || it.kind === 'amulet' || it.kind === 'gem' || it.kind === 'crown' || it.kind === 'gauntlet' || it.kind === 'flask';
    r.sprite(it.x, it.y, z + 2 + (it.kind === 'bell' ? 0 : bob + 2), sp, { anchor: 'bottom', glow });
    if (glow) L.add(it.x, it.y, 6, 24, .5, { color: it.kind === 'gauntlet' ? '#ffe06a' : '#c8e0ff' });
    if (it.hover) r.queue(it.x, it.y, 20, g => { const [sx, sy] = r.w(it.x, it.y, 22); otxt(g, get('items', it.kind).name, sx, sy - 6, '#ffe08a', { align: 'center' }); });
  }
  // generators
  for (const g of W.gens) if (r.visible(g.x, g.y, 0)) { drawGen(r, g, t); if (g.type === 'grate') L.add(g.x, g.y, 4, 40, .8, { color: '#ff7a2a' }); }
  // monsters
  for (const m of W.mons) {
    if (!r.visible(m.x, m.y, 0)) continue;
    const em = m.emerge > 0 ? m.emerge / .4 : 0, z = m.D.fly ? 6 + Math.sin(t * 3 + m.id) * 2 : -em * 14;
    if (m.type === 'fryar' && m.vis < .5) { if (Math.floor(t * 8 + m.id) % 3 === 0) r.shadow(m.x, m.y, 4, .15); continue; }
    r.shadow(m.x, m.y, m.type === 'tithe' ? 7 : 5, .35);
    const flash = m.hurtT > 0 ? '#ffffff' : null;
    if (m.type === 'ghost') {
      const near = PARTY.some(h => h.alive && Math.hypot(h.x - m.x, h.y - m.y) < 40); m.mouth = lerp(m.mouth || 0, near ? 1 : .1, .1);
      r.actor(m.x, m.y, z, (g, ox, oy) => drawShade(g, ox, oy, m, t, 1), { flash, every: 1, key: m });
      continue;
    }
    const rig = rigFor(m.id, m.type + m.rank, () => monsterRig(m.type, m.rank));
    if (!rig) continue;
    let attack = null;
    if (m.wind > 0 && m.D.move) attack = { spec: E.move(m.D.move).spec, phase: 'wind', u: clamp(1 - m.wind / (m.D.wind || .3), 0, 1) };
    else if (m.swingT !== undefined && m.D.move && W.t - m.swingT < .35) attack = atk(m.D.move, .3 + (W.t - m.swingT));
    else if (m.type === 'lobber' && m.swingT !== undefined && W.t - m.swingT < .5) attack = atk('throw', W.t - m.swingT);
    const st = { x: m.x, y: m.y, z: Math.max(0, z), vx: m.vx, vy: m.vy, facing: m.face, attack, hurt: m.hurtT > 0 };
    if (m.type === 'imp') { rig.update(dt, { squash: Math.sin(t * 10 + m.id) * .15, look: [Math.cos(m.face), Math.sin(m.face)], walk: Math.min(1, Math.hypot(m.vx, m.vy) / 30), flap: .7 }); }
    else rig.update(dt, st);
    const shrink = m.shrink > 0 ? 1 - m.shrink * .6 : 1;
    r.actor(m.x, m.y, Math.max(0, z), (g, ox, oy) => { rig.draw(g, ox, oy, r.view); if (m.type === 'imp' && m.spit > 0) { px.glow(g, 1); px.disc(g, ox, oy - 8, 2, '#ffd84a'); px.glow(g, 0); } }, { flash, every: W.mons.length > 60 ? 3 : 1, key: m, alpha: m.type === 'tithe' ? .85 : undefined });
    void shrink;
    if (m.type === 'tithe') L.add(m.x, m.y, 20, 50, .6, { color: '#ff3a3a' });
    if (m.type === 'imp') L.add(m.x, m.y, 8, 26, .5, { color: '#ff7a2a' });
    if (m.wind > 0 || m.spit > 0) r.decal(g => { const [sx, sy] = r.w(m.x, m.y, 0); ringDots(g, sx, sy, (m.r + 4) * r.view.scale, (m.r + 4) * r.view.scale * .5, '#ff4a3a', 14); });
    if (CHEAT.hitboxes) r.decal(g => { const [sx, sy] = r.w(m.x, m.y, 0); px.ell(g, sx, sy, m.r * 1.5, m.r, '#ff00ff'); });
  }
  // the King
  if (W.boss) drawBoss(r, W.boss, dt, t);
  // heroes
  for (const h of PARTY) {
    if (h.joinPick) continue;
    const rig = rigFor('h' + h.pi, h.cls, () => h.D.rig());
    r.decal(g => { const [sx, sy] = r.w(h.x, h.y, 0); ringDots(g, sx, sy, 8, 4, h.color, 22); });
    r.shadow(h.x, h.y, 6, .4);
    let attack = null, pose = null;
    if (h.swing && W.t - h.swing.t0 < h.swing.dur / .9 + .05) attack = atk(h.swing.move, (W.t - h.swing.t0) / .9);
    else if (W.t - h.throwT < .3) attack = h.D.throwMove === 'bow' ? { spec: BOW, phase: W.t - h.throwT < .08 ? 'wind' : W.t - h.throwT < .13 ? 'active' : 'recover', u: .5 } : atk(h.D.throwMove, (W.t - h.throwT) * 1.4);
    if (!h.alive) pose = 'die';
    else if (W.done && W.done.ending) pose = 'cheer';
    else if (h.stun > 0) pose = 'guard';
    if (h.lastMagic && game.real - h.lastMagic < .5) pose = 'cast';
    const hunger = h.hp < 200 ? (200 - h.hp) / 200 : 0;
    rig.o.hunch = (h.cls === 'hexer' ? .3 : 0) + hunger * .4;
    rig.update(dt, { x: h.x, y: h.y, z: 0, vx: h.vx, vy: h.vy, facing: h.plant || h.firing ? h.aim : h.face, attack, pose, hurt: h.hurtT > 0, expr: h.hurtT > 0 ? 'wince' : h.queasy > 0 ? 'wince' : null, run: 0 });
    const inv = h.inv > 0 && Math.floor(game.real * 12) % 2 === 0;
    const veil = h.amulet === 'veil';
    r.actor(h.x, h.y, W.done && !W.done.ending && !W.done.hoard && W.done.by === h.pi ? -Math.min(14, W.doneT * 20) : 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { xray: { color: h.color, actors: true }, flash: h.hurtT > 0 ? '#ff4a3a' : inv ? '#ffffff' : null, flashMix: .5, alpha: veil ? .45 : undefined });
    L.add(h.x, h.y, 16, 60, .55, { color: '#ffe0b0' });
    if (h.amulet === 'ironskin') L.add(h.x, h.y, 10, 30, .7, { color: '#ffd84a' });
    if (h.amulet === 'stench' && Math.random() < .2) P.add({ kind: 'dust', x: h.x + (Math.random() - .5) * 10, y: h.y, z: 10, vz: 10, life: .8, max: .8, color: '#7ad04a', size: 2 });
    if (h.stairT > 0) r.queue(h.x, h.y, 0, g => { const [sx, sy] = r.w(h.x, h.y, 0), f = clamp(h.stairT / Math.max(.01, TUNE.stairHold), 0, 1); for (let k = 0; k < 24 * f; k++) { const a = -Math.PI / 2 + k / 24 * TAU; px.dot(g, sx + Math.cos(a) * 10, sy + Math.sin(a) * 6, '#ffe08a'); } });
    if (S.names && PARTY.length > 1 || SESSION) r.queue(h.x, h.y, 40, g => { const [sx, sy] = r.w(h.x, h.y, 44); txt(g, SESSION && h.netName ? h.netName.replace(/[^\x20-\x7E]/g, '?').slice(0, 10) : 'P' + (h.pi + 1), sx, sy - 4, h.color, { align: 'center', font: 'tiny' }); });
    if (h.menu > 0) r.queue(h.x, h.y, 40, g => { const [sx, sy] = r.w(h.x, h.y, 46); px.sprite(g, SPR.bell, sx - 4, sy - 16 + Math.sin(t * 8) * 1); });
    if (CHEAT.hitboxes) r.decal(g => { const [sx, sy] = r.w(h.x, h.y, 0); px.ell(g, sx, sy, h.r * 1.5, h.r, '#00ffff'); });
  }
  // shots
  for (const s of W.shots) {
    if (s.kind === 'crock' || s.kind === 'plate') {   // a lob: its landing marked by a shadow ahead
      if (s.tx !== undefined && (s.land - W.t) < .6) r.decal(g => { const [sx, sy] = r.w(s.tx, s.ty, 0); px.blend(g, .5, 'normal', () => px.ell(g, sx, sy, 6, 3, '#000000')); px.ell(g, sx, sy, 7, 3.5, '#ff4a3a'); });
      r.sprite(s.x, s.y, Math.max(0, s.z), s.kind === 'plate' ? SPR.plate : SPR.crock, { anchor: 'center', rot: s.rot });
      continue;
    }
    const spr = s.kind === 'fireball' ? SPR.fireball : SPR['shot_' + s.kind] || SPR.shot_hex;
    const rot = s.kind === 'axe' ? s.rot : Math.atan2(s.vy, s.vx);
    r.sprite(s.x, s.y, s.z, spr, { anchor: 'center', rot, glow: s.kind === 'hex' || s.kind === 'fireball' });
    if (s.kind === 'fireball') L.add(s.x, s.y, 8, 30, .9, { color: '#ff8a2a' });
    if (s.kind === 'hex') L.add(s.x, s.y, 8, 20, .6, { color: '#c86af0' });
  }
  if (CHEAT.flow && W.field) r.decal(g => { const F = W.field; for (let cy = 0; cy < F.h; cy++) for (let cx = 0; cx < F.w; cx++) { const d = F.d[cy * F.w + cx]; if (d >= 1e9) continue; const [sx, sy] = r.w((cx + .5) * T, (cy + .5) * T, 0); px.dot(g, sx, sy, d % 4 === 0 ? '#ffff00' : '#ff8800'); } });
  // drop rigs for ids gone a while
  if (Math.random() < .02) for (const [k, e] of RIGS) if (game.real - e.seen > 5) RIGS.delete(k);
}
function drawBoss(r, B, dt, t) {
  if (!B.alive && B.state === 'dead' && (B.deadT = (B.deadT || 0) + dt) > 4) return;
  const rig = rigFor('king', 'king', () => monsterRig('king', 3));
  let attack = null, pose = null;
  if (B.state === 'stomp' || B.state === 'stompwind') attack = { spec: E.move('overhead').spec, phase: 'wind', u: .8 };
  if (B.throwAt && W.t - B.throwAt < .5) attack = atk('throw', W.t - B.throwAt);
  if (B.state === 'eat') pose = 'kneel'; if (B.state === 'roar') pose = 'cheer'; if (!B.alive) pose = 'die';
  if (B.intro > 0) pose = 'hips';
  rig.update(dt, { x: B.x, y: B.y, z: 0, vx: B.vx, vy: B.vy, facing: B.face, attack, pose, hurt: B.hurtT > 0, expr: B.state === 'roar' ? 'shout' : null });
  r.shadow(B.x, B.y, 16, .45);
  r.actor(B.x, B.y, 0, (g, ox, oy) => {
    rig.draw(g, ox, oy, r.view);
    if (B.phase === 3 && B.alive) { const c = rig.worldOffset ? rig.worldOffset(rig.J.chest || rig.J.shC) : [0, 0, 30]; const [sx, sy] = [ox + (c[0] || 0) * 0, oy - (c[2] || 30) * (r.view.bz ? -r.view.bz : .8)]; px.glow(g, 1); px.sprite(g, SPR.gauntlet, sx - 5, sy - 6); px.glow(g, 0); }
  }, { flash: B.hurtT > 0 ? '#ffffff' : null });
  B.hurtT = Math.max(0, (B.hurtT || 0) - dt);
  if (B.state === 'chargeWind') r.decal(g => { const [x0, y0] = r.w(B.x, B.y, 0), [x1, y1] = r.w(B.x + Math.cos(B.chargeA) * 160, B.y + Math.sin(B.chargeA) * 160, 0); px.line(g, x0, y0, x1, y1, Math.floor(t * 16) % 2 ? '#ff4a3a' : '#ffd84a', 2); });
  if (B.state === 'stomp') r.decal(g => { const [sx, sy] = r.w(B.x, B.y, 0); px.ell(g, sx, sy, 44 * r.view.scale, 22 * r.view.scale, '#ff4a3a'); });
  if (B.fogAt && W.t < B.fogAt.until) { for (let k = 0; k < 3; k++) { const a = B.fogAt.a + (Math.random() - .5) * 1, d = Math.random() * 100; P.add({ kind: 'smoke', x: B.fogAt.x + Math.cos(a) * d, y: B.fogAt.y + Math.sin(a) * d, z: 6, vz: 4, life: 1.2, max: 1.2, color: '#6a8a4a', size: 6 }); } }
  L.add(B.x, B.y, 30, 90, .8, { color: B.phase === 3 ? '#ffd84a' : '#c86af0' });
}

/* ---- effects from happenings (view only) ---- */
const at3 = (d, z = 10) => [d.x, d.y, z];
bus.on('kill', d => { if (!W) return; const c = { ghost: '#c8d0e0', gnasher: '#7a9a5a', lobber: '#e8e4dc', imp: '#ff6a1a', fryar: '#5a3a2a', snatcher: '#a88a5a', tithe: '#e8e0d0' }[d.type] || '#ffffff'; if (d.type === 'imp') P.explosion(d.x, d.y, 8, .5, { shake: 1, flash: false, sound: false }); else P.bits(...at3(d), 8, [c, E.shade(c, -.3)]); P.smoke(...at3(d, 6), 3, { size: 3 }); if (d.pts && d.by >= 0) P.text(d.x, d.y, 24, String(d.pts), '#ffe08a'); });
bus.on('monhit', d => P.sparks(...at3(d), 3));
bus.on('melee', d => { game.hitFx(d.x, d.y, 12, { power: .6, angle: d.a, sound: false, rumble: true }); });
bus.on('shothit', d => P.impact(d.x, d.y, 12, 4, d.kind === 'hex' ? '#c86af0' : '#ffe070'));
bus.on('shotwall', d => P.sparks(d.x, d.y, 12, 3, null, { color: d.kind === 'fireball' ? '#ff8a2a' : '#ffe8a0' }));
bus.on('genhit', d => { P.bits(d.x, d.y, 10, 3, ['#8a7a6a', '#5a4a3a']); P.text(d.x, d.y, 26, String(Math.round(d.dmg)), '#ff8a6a', { bounce: true }); });
bus.on('gen', d => { P.explosion(d.x, d.y, 6, .8, { debris: ['#6a5a4a', '#8a7a6a'], sound: false, flash: false }); game.shake(3); });
bus.on('spawn', d => P.dust(d.gx, d.gy, 2, 4, { color: '#8a7a6a' }));
bus.on('hurt', d => { P.sparks(d.x, d.y, 12, 4, null, { color: '#ff4a3a' }); const h = PARTY[d.pi]; if (h && h.input && h.input.rumble) h.input.rumble(.4, .12); if (h && !h.remote) game.flash('#ff2a1a', .05, .25); });
bus.on('gone', d => { if (!W) return; if (d.shot) { P.bits(d.x, d.y, 6, 6, ['#c87a3a', '#f0c890', '#8a4a26']); return; } P.glints(d.x, d.y, 8, 5); const D = get('items', d.kind); if (D && D.pts && d.by >= 0) P.text(d.x, d.y, 18, '+' + D.pts, '#ffe08a'); if (D && D.food && PARTY[d.by]) { P.text(d.x, d.y, 26, '+' + Math.round(D.heal * TUNE.foodHeal), '#7ae87a'); P.bits(d.x, d.y, 8, 5, ['#d8844a', '#f0c890']); const rg = RIGS.get('h' + d.by); if (rg && rg.rig.kick) rg.rig.kick(.35); } if (d.kind === 'chest' || d.kind === 'lchest') P.bits(d.x, d.y, 8, 10, ['#ffe06a', '#c8901a']); });
bus.on('magic', d => { game.flash('#ffffff', .15, .8); game.shake(5); P.ring(d.x, d.y, 4, Math.max(d.hw, d.hh), '#c8e8ff', .5); P.glints(d.x, d.y, 20, 12, '#ffffff', 60); const h = PARTY[d.pi]; if (h) h.lastMagic = game.real; });
bus.on('door', d => { if (!W) return; const g = W.doorGroups[d.g]; if (g) for (const c of g.cells) { P.dust(c.x, c.y, 4, 5); P.sparks(c.x, c.y, 16, 3); } });
bus.on('wall', d => { P.bits(d.x, d.y, 12, 12, ['#8a7a6a', '#5a4a3a']); P.dust(d.x, d.y, 4, 8); game.shake(2); });
bus.on('crack', d => P.bits(d.x, d.y, 14, 3, ['#8a7a6a']));
bus.on('trap', () => { game.shake(4); if (W) for (const c of [...W.p.trapT, ...W.p.trapY]) P.dust(c.x, c.y, 4, 6); });
bus.on('secret', d => { P.glints(d.x, d.y, 12, 10, '#c8e8ff'); });
bus.on('tele', d => { P.ring(d.x, d.y, 2, 14, '#8affee', .4); P.ring(d.tx, d.ty, 14, 2, '#8affee', .4); });
bus.on('stun', d => P.glints(d.x, d.y, 26, 6, '#c86af0'));
bus.on('crockbreak', d => { P.bits(d.x, d.y, 2, 6, d.kind === 'plate' ? ['#f4f0e8', '#c8c0b0'] : ['#8a5a3a', '#c88a5a']); P.dust(d.x, d.y, 2, 3); });
bus.on('fall', d => { for (let k = 0; k < 8; k++) P.add({ kind: 'glint', x: d.x, y: d.y, z: 10 + k * 3, vz: 20, life: 1.5, max: 1.5, color: '#c8d8ff', size: 2 }); });
bus.on('rise', d => { P.glints(d.x, d.y, 14, 12, '#ffe08a'); P.ring(d.x, d.y, 2, 16, '#ffe08a', .4); });
bus.on('drain', d => { if (Math.random() < .5) P.add({ kind: 'spark', x: d.x, y: d.y, z: 14, vx: (d.mx - d.x) * 2, vy: (d.my - d.y) * 2, vz: 10, life: .4, max: .4, color: '#ff3a3a', size: 1 }); });
bus.on('blink', d => P.smoke(d.x, d.y, 8, 4, { size: 4, color: '#5a5a6a' }));
bus.on('bell', d => { P.ring(d.x, d.y, 4, 60, '#ffe06a', .6); game.shake(2); });
bus.on('rankdown', d => P.smoke(d.x, d.y, 10, 2, { size: 2 }));
bus.on('bosshit', d => { P.text(d.x, d.y, 50, String(d.dmg), '#ffd84a', { bounce: true }); P.sparks(d.x, d.y, 30, 4); });
bus.on('king', d => { if (d.what === 'stomp') { game.shake(d.small ? 3 : 7); if (!d.small) P.ring(d.x, d.y, 6, 46, '#ff8a4a', .4); P.dust(d.x, d.y, 2, 10); } if (d.what === 'dead') { P.explosion(d.x, d.y, 20, 1.6, { debris: ['#e8dcc0', '#c8b8a0'], sound: false }); game.flash('#ffffff', .3, 1); } if (d.what === 'gulp') P.bits(d.x, d.y, 12, 8, ['#d8844a', '#f0c890']); });
bus.on('stairs', () => { if (W && W.done && W.done.at) P.glints(W.done.at.x, W.done.at.y, 10, 10); });
bus.on('wallsglow', () => game.flash('#ffe08a', .2, .4));
