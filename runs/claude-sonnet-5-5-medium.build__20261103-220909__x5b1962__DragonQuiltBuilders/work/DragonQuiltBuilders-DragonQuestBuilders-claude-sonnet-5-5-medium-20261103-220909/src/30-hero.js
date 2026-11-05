// The Builder: movement, swinging/breaking, placing, interacting, eating, hurt/KO; drops and pickups.
(() => {
const { E, T } = DQ;
const ev = DQ.events;
const A = () => DQ.audio;
const SWATCHES = [['#e86a5a', '#3a4a7a'], ['#5aa8e8', '#7a3a5a'], ['#e8c040', '#3a6a4a'], ['#a86ae8', '#4a4a5a']];
DQ.SWATCHES = SWATCHES;

DQ.heroRig = function (look = 0, swatch = 0) {
  const [c1, c2] = SWATCHES[swatch % 4];
  return new E.Humanoid(look === 0
    ? { size: 1.05, build: 'chibi', hair: 'spiky', hat: { style: 'band', color: c1 }, outfit: 'tunic', weapon: 'sword', colors: { hair: '#6a3a22', cloth: c1, pants: c2, skin: '#f2cfa6', trim: '#ffe9a0' } }
    : { size: 1.05, build: 'chibi', hair: 'ponytail', outfit: 'shirt', weapon: 'sword', colors: { hair: '#2a2a40', cloth: c1, pants: c2, coat: '#e8d8b8', skin: '#e8b890', trim: '#ffe9a0' } });
};

DQ.makeHero = function (x, y) {
  const S = DQ.S, h = new E.Body({ x, y, r: 5 });
  Object.assign(h, { maxHp: 70, hp: 70, belly: 100, facing: Math.PI / 2, inv: 0, hurt: 0, dead: 0, swingT: 0, hit: false, charge: 0, spin: 0, placeCd: 0, noteT: 0, mount: null, bellyT: 0, starveT: 0, hopT: 0, lastSafe: [x, y], eatT: 0, pose: null, thought: 0, sleepFx: 0, mouseAim: false, lastHitMon: 0 });
  h.rig = DQ.heroRig(S.look, S.swatch);
  h.combo = new E.Combo(['slash', 'backslash'], { window: .3 });
  h.spinAtk = new E.Attack('spin');
  h.heal = 0; S.hero = h; return h;
};
DQ.syncWeaponLook = function () {
  const S = DQ.S, h = S.hero; if (!h) return; const it = DQ.inv.weapon();
  if (h.rig && h.rig.colors) { h.rig.colors.metal = it.metal; if (h.rig.opts) h.rig.opts.colors = h.rig.colors; }
};

// ---------- target cell ----------
DQ.heroTarget = function () {
  const S = DQ.S, h = S.hero, w = S.world, map = w.map, I = DQ.game.input;
  const reach = DQ.tuning.reach * T;
  if (DQ.forceTarget) { const f = DQ.forceTarget; return { cx: f.cx, cy: f.cy, via: 'force', dist: 0, inReach: true, height: w.height(f.cx, f.cy) }; }
  if (DQ.builderEyeActive && DQ.eyeCell) { const f = DQ.eyeCell, d = Math.hypot(f.cx * T + 8 - h.x, f.cy * T + 8 - h.y); return { cx: f.cx, cy: f.cy, via: 'eye', dist: d, inReach: d <= reach + T / 2, height: w.height(f.cx, f.cy) }; }
  let cx, cy, via = 'auto';
  if (DQ.mouseMode && !h.mount) {
    const p = I.pointer(); const hit = p && map.pick(p[0], p[1]);
    if (hit && hit.cx >= 0) { cx = hit.cx; cy = hit.cy; via = 'mouse'; }
  }
  if (cx === undefined) {
    const a = Math.round(h.facing / (Math.PI / 4)) * (Math.PI / 4);
    cx = Math.floor((h.x + Math.cos(a) * 14) / T); cy = Math.floor((h.y + Math.sin(a) * 14) / T);
    const hx = Math.floor(h.x / T), hy = Math.floor(h.y / T);
    if (cx === hx && cy === hy) { cx = hx + Math.round(Math.cos(a)); cy = hy + Math.round(Math.sin(a)); }
  }
  const dist = Math.hypot(cx * T + 8 - h.x, cy * T + 8 - h.y);
  return { cx, cy, via, dist, inReach: dist <= reach + T / 2, height: w.height(cx, cy) };
};

// ---------- body in the way? ----------
DQ.bodyInCell = function (cx, cy, ignoreHero) {
  const S = DQ.S, x0 = cx * T - 1, x1 = cx * T + T + 1, y0 = cy * T - 1, y1 = cy * T + T + 1;
  const inn = b => b.x > x0 && b.x < x1 && b.y > y0 && b.y < y1;
  if (!ignoreHero && inn(S.hero)) return true;
  return S.residents.some(inn) || S.monsters.some(inn);
};

// ---------- placing blocks / objects / using items ----------
DQ.placeAction = function () {
  const S = DQ.S, h = S.hero, w = S.world, id = DQ.inv.hotId();
  if (!id) { DQ.toast('Nothing selected.', '#aaa'); return false; }
  const it = DQ.ITEMS[id], t = DQ.heroTarget();
  if (it.kind === 'food') return DQ.eat(id);
  if (id === 'heartpatch') { DQ.inv.remove(id, 1); h.maxHp += 10; h.hp = h.maxHp; DQ.toast('Max HP +10!', '#ff8aa8'); A().sfx('powerup'); DQ.game.particles.glints(h.x, h.y, 16, 12, '#ff8aa8'); return true; }
  if (id === 'banner') return DQ.tryPlantBanner();
  if (id === 'pattern') { const tp = DQ.heroTarget(); return DQ.placePattern(tp.cx, tp.cy); }
  if (!t.inReach) { DQ.toast('Too far!', '#ff8a8a'); A().sfx('bump', { vol: .4 }); return false; }
  const { cx, cy } = t;
  if (!w.inside(cx, cy) || cx < 1 || cy < 1 || cx > w.W - 2 || cy > w.H - 2) { DQ.toast("Can't build there.", '#ff8a8a'); return false; }
  if (it.kind === 'block') {
    const hh = w.height(cx, cy), reachZ = Math.floor((h.z + 20) / T) + 1;
    if (hh >= DQ.MAXH || hh > reachZ + 1) { DQ.toast('Too high!', '#ff8a8a'); return false; }
    if (w.objs.has(w.idx(cx, cy))) { DQ.toast('Something is there.', '#ff8a8a'); return false; }
    if (DQ.bodyInCell(cx, cy) && hh === 0 || (Math.floor(h.x / T) === cx && Math.floor(h.y / T) === cy)) { DQ.toast("Something's in the way!", '#ff8a8a'); return false; }
    if (DQ.bodyInCell(cx, cy)) { DQ.toast("Something's in the way!", '#ff8a8a'); return false; }
    const bid = DQ.blockId(it.block); const inTown = DQ.inBorder(cx, cy);
    w.push(cx, cy, bid, { town: inTown }); DQ.inv.remove(id, 1); S.stats.placed++;
    A().sfx('stitch'); DQ.stitchFx(cx, cy, hh, DQ.BLOCKS[bid].top); h.placeCd = .12; DQ.placePop = { cx, cy, t: 0 };
    return true;
  }
  if (it.kind === 'obj') {
    const def = DQ.OBJECTS[it.obj];
    if (w.height(cx, cy) > 0) { DQ.toast('Needs a clear floor.', '#ff8a8a'); return false; }
    if (w.floor[w.idx(cx, cy)] === 'water') { DQ.toast("Can't place on water.", '#ff8a8a'); return false; }
    if (w.objs.has(w.idx(cx, cy))) { DQ.toast('Something is there.', '#ff8a8a'); return false; }
    if ((def.solid || def.door) && DQ.bodyInCell(cx, cy)) { DQ.toast("Something's in the way!", '#ff8a8a'); return false; }
    if (it.obj === 'ballista' && !DQ.inBorder(cx, cy) && S.mode !== 'bee') { DQ.toast('Ballistas must be inside the town border.', '#ff8a8a'); return false; }
    const fac = Math.round(h.facing / (Math.PI / 2)) * (Math.PI / 2) + Math.PI;
    const ob = w.addObj(it.obj, cx, cy, { facing: fac, extra: { town: DQ.inBorder(cx, cy) } }); if (!ob) return false;
    DQ.inv.remove(id, 1); S.stats.placedObj[it.obj] = (S.stats.placedObj[it.obj] || 0) + 1;
    if (it.obj === 'chest' && S.mode === 'story' && DQ.inBorder(cx, cy) && !S.town.chestId) { S.town.chestId = ob.id; ob.townChest = true; DQ.toast('This is now the Town Chest.', '#ffe9a0'); }
    A().sfx('stitch'); DQ.stitchFx(cx, cy, 0, '#ffe9a0'); h.placeCd = .12; return true;
  }
  return false;
};
DQ.stitchFx = (cx, cy, z, color) => { const g = DQ.game; g.particles.glints(cx * T + 8, cy * T + 8, z * T + 18, 7, '#fff4c0'); g.particles.bits(cx * T + 8, cy * T + 8, z * T + 16, 6, [color, '#ffffff']); };
DQ.tryPlantBanner = function () {
  const S = DQ.S, h = S.hero; if (S.town.planted) { DQ.toast('The Banner is already planted.', '#aaa'); return false; }
  const p = DQ.POI.banner, d = Math.hypot(h.x - (p[0] * T + 8), h.y - (p[1] * T + 8));
  if (d > T * 3.2) { DQ.toast('Plant it on the golden mark in Thimbleton!', '#ffe9a0'); return false; }
  DQ.inv.remove('banner', 1); DQ.startCutscene && DQ.startCutscene('plant');
  return true;
};
DQ.eat = function (id) {
  const S = DQ.S, h = S.hero, it = DQ.ITEMS[id]; if (!DQ.inv.remove(id, 1)) return false;
  h.belly = Math.min(100, h.belly + (it.belly || 0)); h.hp = Math.min(h.maxHp, h.hp + (it.hp || 0));
  h.eatT = .6; S.stats.eaten++; A().sfx('heal'); DQ.game.particles.glints(h.x, h.y, 20, 8, '#ffe9a0'); DQ.toast('Yum! Belly ' + Math.round(h.belly), '#ffe9a0');
  DQ.popDamage(h.x, h.y, 28, '+' + (it.belly || 0), '#ffe9a0'); ev.emit('itemUsed', { id }); return true;
};
DQ.popDamage = (x, y, z, text, color) => { if (DQ.settings && DQ.settings.damageNumbers === false) return; DQ.game.particles.text(x, y, z, String(text), color, { scale: 1, bounce: false }); };

// ---------- breaking ----------
const bhp = new Map();
DQ.clearBlockHp = () => bhp.clear();
DQ.breakAt = function (cx, cy, power = 1) {
  const S = DQ.S, w = S.world, h = S.hero;
  const hh = w.height(cx, cy); const o = w.objAt(cx, cy);
  if (hh === 0 && o) return DQ.hitObject(o, power);
  if (!hh) return false;
  const id = w.topId(cx, cy), b = DQ.BLOCKS[id], wp = DQ.inv.weapon(), key = cx + ',' + cy + ',' + hh;
  if (S.mode === 'bee' && (cx === 0 || cy === 0 || cx === w.W - 1 || cy === w.H - 1)) { A().sfx('bump', { vol: .5 }); return true; }
  if (cx <= 0 || cy <= 0 || cx >= w.W - 1 || cy >= w.H - 1) { DQ.toast("That's the edge of the quilt!", '#ff8a8a'); A().sfx('bump', { vol: .5 }); return true; }
  if (b.tier > wp.tier) {
    A().sfx('clink'); DQ.game.particles.sparks(cx * T + 8, cy * T + 8, hh * T, 8, h.facing);
    DQ.toast(b.tier >= 4 ? 'Only a Seam Ripper can cut a Black Knot!' : 'Too tough for your ' + wp.name + '!', '#ff8a8a'); return true;
  }
  let e = bhp.get(key); if (!e) { e = { hp: b.hp, max: b.hp, t: 0 }; bhp.set(key, e); }
  e.hp -= wp.blockDmg * DQ.tuning.blockDmg * power; e.t = 0;
  const frac = 1 - e.hp / e.max; DQ.crack = { cx, cy, z: hh - 1, frac, t: .6 };
  DQ.game.particles.bits(cx * T + 8, cy * T + 8, hh * T - 6, 3, [b.top, b.side]); A().sfx('thud', { vol: .5, pitch: .9 + frac * .4 });
  if (e.hp <= 0) {
    bhp.delete(key); w.pop(cx, cy); S.stats.broken++;
    DQ.game.particles.bits(cx * T + 8, cy * T + 8, hh * T - 6, 14, [b.top, b.side, '#ffffff']); A().sfx('rip'); DQ.game.shake(1.5);
    DQ.spawnDrop(cx * T + 8, cy * T + 8, (hh - 1) * T + 6, b.drop, 1);
    if (id === DQ.blockId('copper') || id === DQ.blockId('steel')) DQ.spawnDrop(cx * T + 8, cy * T + 8, (hh - 1) * T + 6, b.drop, 1);
  }
  return true;
};
DQ.hitObject = function (o, power = 1) {
  const S = DQ.S, w = S.world, def = DQ.OBJECTS[o.type], h = S.hero;
  if (def.portal || def.collect || o.type === 'banner') return false;
  const wp = DQ.inv.weapon(); o.hp -= (def.plant ? 99 : wp.blockDmg * 3) * power * (def.plant ? 1 : 1); o.flash = .15;
  DQ.game.particles.bits(o.x * T + 8, o.y * T + 8, 10, 5, [def.tint || '#8fd06a', '#fff4c0']); A().sfx(def.plant ? 'rustle' : 'thud', { vol: .5 });
  if (o.hp <= 0 || def.plant && o.hp <= 0) {
    w.removeObj(o);
    if (def.plant) {
      for (const [id, a, b] of def.drops) { const n = a + Math.floor(DQ.rng('drops')() * (b - a + 1)); if (n > 0) DQ.spawnDrop(o.x * T + 8, o.y * T + 8, 8, id, n); }
      S.regrow = S.regrow || []; S.regrow.push({ type: o.type, x: o.x, y: o.y, day: S.clock.day + def.regrow, hour: S.clock.hour, facing: o.facing, extra: o.type === 'berrybush' ? {} : {} });
      DQ.game.particles.bits(o.x * T + 8, o.y * T + 8, 12, 12, [def.tint || '#6fae4f', '#c0f090']);
    } else { DQ.game.particles.smoke(o.x * T + 8, o.y * T + 8, 10, 6, { size: 6 }); A().sfx('rip'); if (o.items) for (const it of o.items) DQ.spawnDrop(o.x * T + 8, o.y * T + 8, 8, it.id, it.n); if (o.townChest) S.town.chestId = 0; const it2 = Object.entries(DQ.ITEMS).find(([, v]) => v.obj === o.type); if (it2 && !def.ballista) DQ.spawnDrop(o.x * T + 8, o.y * T + 8, 8, it2[0], 1); }
  }
  return true;
};
DQ.regrowTick = function () {
  const S = DQ.S; if (!S.regrow || !S.regrow.length) return;
  const nowAbs = S.clock.day * 24 + S.clock.hour;
  S.regrow = S.regrow.filter(r => {
    if (nowAbs < r.day * 24 + r.hour) return true; const w = S.world;
    if (w.hgt[w.idx(r.x, r.y)] || w.objs.has(w.idx(r.x, r.y)) || DQ.bodyInCell(r.x, r.y)) return nowAbs < r.day * 24 + r.hour + 48;
    w.addObj(r.type, r.x, r.y, { gen: true, facing: r.facing }); return false;
  });
};

// ---------- drops ----------
DQ.spawnDrop = function (x, y, z, id, n = 1) {
  const S = DQ.S; if (!DQ.ITEMS[id]) return;
  const r = DQ.rng('dropfx');
  S.drops.push({ id, n, x, y, z, vx: (r() - .5) * 70, vy: (r() - .5) * 70, vz: 110 + r() * 60, t: 0, life: 300, bob: r() * 6, ground: 0 });
};
DQ.dropsTick = function (dt) {
  const S = DQ.S, h = S.hero, w = S.world;
  for (const d of S.drops) {
    d.t += dt; d.life -= dt; d.bob += dt * 4;
    if (!d.settled) {
      d.vz -= 520 * dt; d.z += d.vz * dt; const nx = d.x + d.vx * dt, ny = d.y + d.vy * dt, cx = Math.floor(nx / T), cy = Math.floor(ny / T);
      if (w.height(cx, cy) * T <= d.z + 2 && !(w.floor[w.idx(cx, cy)] === 'water' && !w.hgt[w.idx(cx, cy)])) { d.x = nx; d.y = ny; } else { d.vx = -d.vx * .3; d.vy = -d.vy * .3; }
      const gz = w.height(Math.floor(d.x / T), Math.floor(d.y / T)) * T + 4; if (d.z <= gz) { d.z = gz; d.vz = Math.abs(d.vz) > 60 ? -d.vz * .35 : 0; d.vx *= .6; d.vy *= .6; if (!d.vz) d.settled = true; }
    }
    if (d.t > .3 && !S.cut) {
      const dist = Math.hypot(h.x - d.x, h.y - d.y);
      if (dist < T * 1.6 && h.hp > 0 && DQ.inv.canAdd(d.id)) { d.settled = false; const k = 140 * dt / Math.max(dist, 1); d.x += (h.x - d.x) * Math.min(1, k * 4); d.y += (h.y - d.y) * Math.min(1, k * 4); d.z += (h.z + 10 - d.z) * Math.min(1, k * 3); if (dist < 7) { const got = DQ.inv.add(d.id, d.n); if (got) { d.dead = true; A().sfx('pickup', { vol: .5 }); if (got < d.n) { d.n -= got; d.dead = false; } } } }
      else if (dist < T * 1.6 && !DQ.inv.canAdd(d.id) && (S.time % 4) < dt) DQ.toast('Your bag is full!', '#ff8a8a');
    }
  }
  S.drops = S.drops.filter(d => !d.dead && d.life > 0);
  // the Lost Bundle
  if (S.bundle) { const b = S.bundle; if (Math.hypot(h.x - b.x, h.y - b.y) < 14 && h.hp > 0) { for (const [k, n] of Object.entries(b.items)) DQ.inv.add(k, n, true); DQ.toast('You found your Lost Bundle!', '#ffe9a0'); A().sfx('powerup'); S.bundle = null; } }
};

// ---------- hurt / KO ----------
DQ.hurtHero = function (dmg, fromX, fromY, o = {}) {
  const S = DQ.S, h = S.hero; if (h.hp <= 0 || h.inv > 0 || S.cut || DQ.god) return false;
  const diff = { Relaxed: .5, Normal: 1, Hard: 1.4 }[(DQ.settings && DQ.settings.difficulty) || 'Normal'];
  const d = Math.max(1, Math.round((dmg * DQ.tuning.monsterDmg - DQ.inv.defense() / 2) * diff));
  h.hp -= d; h.inv = .8; h.hurt = .35; if (h.mount) DQ.dismount();
  const a = Math.atan2(h.y - fromY, h.x - fromX); E.knockback({ x: fromX, y: fromY }, h, 150, 40);
  DQ.game.hitFx(h.x, h.y, 14, { power: .8, angle: a, damage: d, color: '#ff8a6a', sound: 'hurt' }); DQ.game.flash('#ff3a3a', .08, .35); h.rig.kick && h.rig.kick(-5);
  S.stats.hits++; ev.emit('builderHurt', { d });
  if (h.hp <= 0) DQ.koHero(); return true;
};
DQ.koHero = function () {
  const S = DQ.S, h = S.hero; h.hp = 0; h.dead = 1.6; S.stats.deaths++; A().sfx('die');
  DQ.game.particles.bits(h.x, h.y, 16, 30, ['#ffe9a0', '#ffffff', '#ff8a8a']); ev.emit('builderKO', {});
};
DQ.respawnHero = function () {
  const S = DQ.S, h = S.hero;
  const inSiege = ['wave', 'prep', 'breather', 'boss'].includes(S.siege.phase);
  if (!inSiege && S.mode === 'story' && (DQ.settings && DQ.settings.difficulty) !== 'Relaxed') {
    const lost = DQ.inv.dropBundle(); if (lost) S.bundle = { x: h.x, y: h.y, items: lost };
  }
  const sp = S.town.planted ? [S.town.x * T + 8, S.town.y * T + 8 + T * 2] : S.mode === 'bee' ? [18 * T + 8, 18 * T + 8] : [DQ.POI.start[0] * T + 8, DQ.POI.start[1] * T + 8];
  h.x = sp[0]; h.y = sp[1]; h.z = 0; h.vx = h.vy = h.vz = 0; h.hp = h.maxHp; h.belly = Math.max(h.belly, 60); h.inv = 1.5; h.dead = 0; h.mount = null;
  DQ.game.flash('#ffffff', .15, .6); ev.emit('builderRespawn', {});
};
DQ.dismount = function () { const h = DQ.S.hero; h.mount = null; };

// ---------- hero update ----------
DQ.heroUpdate = function (dt, intent) {
  const S = DQ.S, h = S.hero, w = S.world, map = w.map, I = DQ.game.input, tn = DQ.tuning;
  h.inv = Math.max(0, h.inv - dt); h.hurt = Math.max(0, h.hurt - dt); h.eatT = Math.max(0, h.eatT - dt); h.placeCd = Math.max(0, h.placeCd - dt); h.thought = Math.max(0, h.thought - dt);
  if (h.dead > 0) { h.dead -= dt; h.rig.update(dt, { x: h.x, y: h.y, z: h.z, vx: 0, vy: 0, facing: h.facing, pose: 'die' }); if (h.dead <= 0) DQ.respawnHero(); return; }
  // belly
  h.bellyT += dt * (intent.sprint ? 1.5 : 1) * (h.combo.busy ? 1.2 : 1);
  if (h.bellyT >= tn.bellySecs) { h.bellyT = 0; h.belly = Math.max(0, h.belly - 1); if (h.belly === 24) DQ.toast('Your belly is rumbling!', '#ffb070'); if (h.belly === 9) { DQ.toast('Your belly is VERY rumbly!', '#ff7050'); } }
  if (h.belly <= 0) { h.starveT += dt; if (h.starveT >= 4) { h.starveT = 0; h.hp = Math.max(1, h.hp - 1); DQ.toast('Your belly is empty! Eat something!', '#ff7050'); } } else h.starveT = 0;
  // mounted on a ballista: aim only
  if (h.mount) { DQ.ballistaAim(dt, intent); h.rig.update(dt, { x: h.x, y: h.y, z: h.z, vx: 0, vy: 0, facing: h.facing, pose: 'crouch' }); return; }
  // movement
  const busy = h.combo.busy || h.spinAtk.busy;
  let sp = tn.walk * (intent.sprint ? 1.45 : 1) * (busy ? .35 : 1) * (S.cut ? 0 : 1);
  if (h.eatT > 0) sp *= .3;
  const lock = DQ.builderEyeActive;
  const mx = lock ? 0 : intent.mx, my = lock ? 0 : intent.my; const len = Math.hypot(mx, my);
  const acc = (len > .05 ? 900 : 1100) * dt;
  const tvx = len > .05 ? mx * sp : 0, tvy = len > .05 ? my * sp : 0;
  const approach = (a, b, d) => a < b ? Math.min(b, a + d) : Math.max(b, a - d);
  const kb = h.hurt > .2; if (!kb) { h.vx = approach(h.vx, tvx, acc); h.vy = approach(h.vy, tvy, acc); }
  if (len > .1 && !busy && !intent.aim) h.facing = Math.atan2(my, mx);
  if (intent.aim != null && !busy) h.facing = intent.aim;
  if (intent.jump && h.onGround) { h.jump(tn.jump); A().sfx('jump', { vol: .35 }); }
  // auto-hop at ledges
  if (DQ.settings.autoHop !== false && h.onGround && len > .3 && h.hitWall) { h.hopT += dt; if (h.hopT > .08) { const a = Math.atan2(my, mx), cx = Math.floor((h.x + Math.cos(a) * 9) / T), cy = Math.floor((h.y + Math.sin(a) * 9) / T); const hh = w.height(cx, cy); if (hh === 1 && w.height(cx, cy) * T <= h.z + 17 && !w.objs.has(w.idx(cx, cy))) { h.jump(tn.jump * .93); h.hopT = -.3; } } } else if (!h.hitWall) h.hopT = 0;
  const wasAir = !h.onGround; h.update(dt, map);
  if (wasAir && h.onGround && h.landed) A().sfx('land', { vol: .3 });
  // out of the world / stuck inside block
  if (h.x < 8 || h.y < 8 || h.x > w.W * T - 8 || h.y > w.H * T - 8) { h.x = Math.min(w.W * T - 8, Math.max(8, h.x)); h.y = Math.min(w.H * T - 8, Math.max(8, h.y)); }
  if (h.onGround && h.z < 0.5 && !map.solidAt(h.x, h.y)) { if (Math.floor(S.time * 2) !== Math.floor((S.time - dt) * 2)) h.lastSafe = [h.x, h.y]; }
  if (map.solidAt(h.x, h.y) && h.z < w.height(Math.floor(h.x / T), Math.floor(h.y / T)) * T - 3) { const o = w.nearestWalkable(Math.floor(h.x / T), Math.floor(h.y / T), 5); if (o) { h.x = o[0] * T + 8; h.y = o[1] * T + 8; h.z = 0; } }
  // swing / hold to spin
  const wp = DQ.inv.weapon();
  if (intent.swingPressed && !busy && !S.cut) { if (h.combo.press()) { h.hit = false; } }
  if (intent.swingHeld && !busy && !S.cut) { h.charge = Math.min(.8, h.charge + dt); if (h.charge >= .6 && !h.charged) { h.charged = true; A().sfx('charge', { vol: .4 }); DQ.game.particles.glints(h.x, h.y, 20, 8, '#fff4a0'); h.rig.kick && h.rig.kick(4); } }
  else { if (h.charge >= .6 && !busy && DQ.S.flags.spinStitch && h.spinAtk.start()) { h.hit = false; h.spinHit = true; A().sfx('whoosh'); DQ.game.shake(2); } h.charge = 0; h.charged = false; }
  const ph = h.combo.update(dt), ph2 = h.spinAtk.update(dt);
  if (ph === 'active' || ph2 === 'active') { A().sfx(ph2 ? 'whoosh' : 'swing', { vol: .5 }); DQ.heroStrike(ph2 === 'active'); }
  if (intent.placePressed && h.placeCd <= 0 && !busy && !S.cut) DQ.placeAction();
  if (intent.interactPressed && !busy && !S.cut) DQ.heroInteract();
  // thinking pose after a notion
  const st = h.combo.busy ? h.combo.state : h.spinAtk.busy ? h.spinAtk.state : null;
  const still = Math.hypot(h.vx, h.vy) < 4;
  h.rig.update(dt, { x: h.x, y: h.y, z: h.z, vx: h.vx, vy: h.vy, facing: h.facing, hurt: h.hurt > 0, air: !h.onGround, attack: st, pose: h.thought > 0 ? 'cheer' : h.eatT > 0 ? 'crouch' : h.pose, expr: h.hurt > 0 ? 'wince' : h.thought > 0 ? 'smile' : null, sprint: intent.sprint && !still });
  if (h.onGround && !still && Math.floor(S.time * 6) !== Math.floor((S.time - dt) * 6) && DQ.regionNow !== 'x') A().sfx('step', { vol: .12 });
};

// a swing that connects: monsters in the arc first, otherwise the break target
DQ.heroStrike = function (spin) {
  const S = DQ.S, h = S.hero, wp = DQ.inv.weapon();
  const reach = spin ? 26 : 23, half = spin ? Math.PI : 0.95;
  let hitAny = false;
  for (const m of S.monsters) {
    if (m.hp <= 0 || m.hidden) continue;
    if (E.inArc(h, h.facing, m, reach + m.def.r * .6, half, 1.4)) {
      if (Math.abs((m.z || 0) - h.z) > 22) continue;
      const crit = !spin && DQ.chance(.05, 'combat'); const dmg = Math.round(wp.atk * (spin ? 1.5 : crit ? 1.5 : 1) * DQ.tuning.builderAtk);
      DQ.damageMonster(m, dmg, h.x, h.y, { crit, spin, weapon: wp.id }); hitAny = true;
    }
  }
  for (const b of S.bossParts || []) if (E.inArc(h, h.facing, b, reach, half)) { DQ.hitBossPart && DQ.hitBossPart(b, wp); hitAny = true; }
  if (hitAny || spin) return;
  const t = DQ.heroTarget();
  const ahead = (() => { const a = Math.round(h.facing / (Math.PI / 4)) * (Math.PI / 4); return [Math.floor((h.x + Math.cos(a) * 13) / T), Math.floor((h.y + Math.sin(a) * 13) / T)]; })();
  let cx = t.cx, cy = t.cy;
  if (t.via === 'auto') {
    // the first block or breakable thing in the facing line, 1 then 2 cells
    const a = Math.round(h.facing / (Math.PI / 4)) * (Math.PI / 4); let found = false;
    for (const k of [13, 23, 33]) { const x = Math.floor((h.x + Math.cos(a) * k) / T), y = Math.floor((h.y + Math.sin(a) * k) / T); if (S.world.height(x, y) > 0 || S.world.objAt(x, y)) { cx = x; cy = y; found = true; break; } }
    if (!found) { A().sfx('swing', { vol: .2 }); return; }
  } else if (!t.inReach) { DQ.toast('Too far!', '#ff8a8a'); return; }
  const o = S.world.objAt(cx, cy);
  if (o && S.world.height(cx, cy) === 0) DQ.hitObject(o, 1); else DQ.breakAt(cx, cy, 1);
};
})();
