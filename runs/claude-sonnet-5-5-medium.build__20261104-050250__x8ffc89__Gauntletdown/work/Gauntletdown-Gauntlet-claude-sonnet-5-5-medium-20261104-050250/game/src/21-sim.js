/* The simulation: heroes, shots, monsters, generators, items, level features, the narrator. Runs on the host (or solo); clients only puppet. */
const DEV = { god: false, noclip: false, infinite: false, freeze: false, onehit: false, gensOff: false, hitboxes: false, flow: false, netstats: false, bot: false, botThoughts: false, timeScale: 1, any: false };
const devAny = () => DEV.god || DEV.noclip || DEV.infinite || DEV.freeze || DEV.onehit || DEV.gensOff || DEV.bot || DEV.timeScale !== 1 || DEV.touched;
const isHost = () => !W || !W.net || W.net.host;

// ---------- narrator ----------
const SAY_PRI = { crit: 3, event: 2, tip: 1 };
function say(key, o = {}) {
  if (!W || (W.net && !W.net.host)) return;
  const raw = LINES[key]; if (!raw) return;
  const pri = o.pri || (/^(fall|low|shot|tithe|over|boss|bell)/.test(key) ? 'crit' : /^hint|^stun|^gnasher|^ghost|^lobber|^imp|^fryar|^snatcher|^force|^rune/.test(key) ? 'tip' : 'event');
  if (pri === 'tip' && (!OPT.tips || W.attract)) return;
  const seenKey = 'gd-tip-' + key;
  if (pri === 'tip' && !o.again) { if (RUN.tipsSeen && RUN.tipsSeen[key]) return; RUN.tipsSeen = RUN.tipsSeen || {}; RUN.tipsSeen[key] = 1; }
  void seenKey;
  const cd = o.cd === undefined ? 4 : o.cd, lk = key + (o.hero ? o.hero.slot : '');
  if (W.lastSay[lk] !== undefined && W.time - W.lastSay[lk] < cd && !o.force) return;
  W.lastSay[lk] = W.time;
  const text = (Array.isArray(raw) ? pick(raw) : raw).replace(/\{n\}/g, o.hero ? o.hero.name : 'SOMEONE').replace(/\{i\}/g, o.item || 'LOOT');
  W.queue.push({ text, pri: SAY_PRI[pri], t: W.time });
  if (W.net && W.net.host && W.net.onSay) W.net.onSay(key, o.hero ? o.hero.slot : -1, text);
}
function narratorStep(dt) {
  const S = W.speech;
  if (S.length) { const c = S[0]; c.life -= dt; if (c.life <= 0) S.shift(); }
  if (!W.queue.length) return;
  W.queue.sort((a, b) => b.pri - a.pri || a.t - b.t);
  const cur = S[0];
  if (cur && cur.pri >= W.queue[0].pri) return;
  if (cur && cur.age < 1.2 && cur.pri >= 2) return;
  const q = W.queue.shift(); W.queue.length = Math.min(W.queue.length, 3);
  showCaption(q.text, q.pri);
}
function showCaption(text, pri) {
  if (W.speech.length && W.speech[0].text === text) return;
  W.speech.unshift({ text, pri, life: 3.2 + text.length * .03, age: 0 });
  if (W.speech.length > 1) W.speech.length = 1;
  if (!W.attract || true) Voice.gaunt(text);
}

// ---------- effects helpers ----------
const sfx = (n, o) => { if (game && !(W && W.net && W.net.server)) game.audio.sfx(n, o); };
function ftext(x, y, str, col = '#fff') { W.texts.push({ x, y, z: 20, str, col, t: 0, life: 1 }); }
function puff(x, y, z, n = 6, col) { game.particles.dust(x, y, z, n, { color: col || '#bbb', speed: 22 }); }

// ---------- hero hurt / fall / rise ----------
function hurtHero(h, dmg, from, o = {}) {
  if (h.down || h.gone || dmg <= 0) return false;
  if (DEV.god || h.tele > 0 || (h.amulet === 'ironskin' && h.amuletT > 0) || h.invuln > 0) return false;
  if (!o.force && h.grace > 0 && o.src && o.src === h.lastSrc) return false;
  h.lastSrc = o.src || null; h.grace = o.src ? .25 : 0;
  const d = dmg * h.C.armor * DIFF[OPT.difficulty].dmg * (h.specials.ironbrew ? .8 : 1);
  h.hp -= d; h.flash = .18; h.hurtT = .25; h.hurtRaw = (h.hurtRaw || 0) + d;
  if (from) { const a = Math.atan2(h.y - from.y, h.x - from.x); h.push(Math.cos(a) * 60, Math.sin(a) * 60); }
  sfx('hurt', { pitch: 1 - h.slot * .08 });
  if (h.hp <= 0) heroFall(h);
  return true;
}
function heroFall(h) {
  h.hp = 0; h.down = true; h.downT = 0; h.flasks = Math.min(h.flasks, 0); h.keys = 0; h.amulet = null; h.amuletT = 0; h.stairT = 0;
  say('fall', { hero: h, force: true, cd: 0 });
  sfx('die'); game.particles.dust(h.x, h.y, 6, 8, { color: '#ccd' });
  if (W.menuHero === h) W.menuHero = null;
  if (W.net && W.net.host) { W.net.event && W.net.event(['hurt', h.slot, 0]); h.riseIn = 5; }
}
function heroRise(h, near) {
  h.down = false; h.hp = RUN.mode === 'net' ? 350 : Math.round(TUNE.startHealth * DIFF[OPT.difficulty].hp); h.flasks = Math.max(h.flasks, 0); h.invuln = 1.2; h.rig.dieT = 0; h.rig.downW = 0;
  if (RUN.mode === 'net') h.score = Math.max(0, h.score - 250);
  if (near) { h.x = near.x + 10; h.y = near.y; }
  RUN.continues++; h.contUsed = (h.contUsed || 0) + 1;
  say('rise', { hero: h, force: true, cd: 0 }); sfx('rise');
  game.particles.glints(h.x, h.y, 8, 10, '#fff6c0', 12);
}

// ---------- monsters hurt / die ----------
function damageMon(m, dmg, by, o = {}) {
  if (m.dead || m.dying > 0) return false;
  if (m.T.immune) { sfx('clink'); return false; }
  if (m.ch === 'y' && m.vis <= 0) return false;
  if (m.isBoss && m.state === 'sleep') return false;
  if (DEV.onehit) dmg = 9999;
  const rk0 = m.rank;
  m.hp -= dmg; m.flash = .12;
  if (by) { by.damageDone = (by.damageDone || 0) + dmg; if (m.isBoss) by.bossDmg += dmg; }
  if (o.knock) { const a = Math.atan2(m.y - o.knock.y, m.x - o.knock.x); if (!m.isBoss) m.push(Math.cos(a) * (o.kb || 40), Math.sin(a) * (o.kb || 40)); }
  if (m.isBoss) { ftext(m.x, m.y, String(Math.ceil(dmg)), '#ffd860'); bossPhaseCheck(m); }
  if (m.hp <= 0) { killMon(m, by); return true; }
  const rk = Math.ceil(m.hp / (m.maxhp / m.rank0));
  if (!m.isBoss && rk < rk0) { m.rank = rk; m.rigD = monRig(m.ch, rk); puff(m.x, m.y, 6, 6, '#ffeecc'); sfx('shrink'); }
  return true;
}
function killMon(m, by) {
  if (m.dead) return; m.dead = true; m.dying = .01;
  if (m.gen) m.gen.kids = Math.max(0, m.gen.kids - 1);
  if (by && m.ch !== 'g') {
    by.score += m.T.pts * m.spawnRank; by.kills++; W.killsTotal++;
    if (m.ch === 't') { by.score += 0; }
  } else if (by) { by.score += m.T.pts * m.spawnRank; by.kills++; W.killsTotal++; }
  if (m.T.pts && by && by.score !== undefined && !m.isBoss) ftext(m.x, m.y, '+' + m.T.pts * m.spawnRank, '#ffe080');
  if (m.stolen && !m.escapedWith) { dropItem(m.stolen.kind, m.x, m.y, m.stolen.sub); m.stolen = null; }
  switch (m.ch) {
    case 'g': game.particles.smoke(m.x, m.y, 8, 4, { color: '#dde' }); sfx('wail', { vol: .6 }); break;
    case 'i': game.particles.explosion(m.x, m.y, 6, .5); break;
    case 'y': game.particles.smoke(m.x, m.y, 6, 6, { dark: true }); sfx('pop'); break;
    case 't': game.particles.sparks(m.x, m.y, 10, 14, null, { color: '#e8e0d0' }); say('titheDead', { force: true }); sfx('boom'); W.tithe = null; break;
    case 'K': bossDie(m); break;
    default: sfx('squish', { vol: .7 }); game.particles.dust(m.x, m.y, 5, 4, { color: '#8a6' });
  }
  m.rigD.rig.dieT = 0;
}
function dropItem(kind, x, y, sub) { W.items.push({ kind, x, y, z: 0, id: W.items.length + 1000 + Math.floor(Math.random() * 1e6), t: 0, gone: false, sub, fresh: 1 }); }

function damageGen(g, dmg, by) {
  if (g.dead) return; if (DEV.onehit) dmg = 9999;
  g.hp -= dmg; g.flash = .12; sfx('clunk', { vol: .6, pitch: 1 + g.rank * .1 });
  if (by && g.hp > 0) ftext(g.x, g.y, String(Math.ceil(dmg)), '#ffe080');
  if (g.hp <= 0) {
    g.dead = true; if (by) { by.score += 25 * g.rank0; by.gensKilled++; ftext(g.x, g.y, '+' + 25 * g.rank0, '#ffe080'); }
    game.particles.explosion(g.x, g.y, 6, .8, { debris: ['#8a7a66', '#6a5a46'] }); game.shake(2); sfx('crumble');
    say('gen', {}); if (Math.random() < .1) dropItem('loaf', g.x, g.y);
    W.net && W.net.event && W.net.event(['gen', g.id]);
  } else {
    const rk = Math.ceil(g.hp / (g.maxhp / g.rank0)); if (rk < g.rank) { g.rank = rk; puff(g.x, g.y, 6, 6, '#cba'); }
  }
}

// ---------- shots ----------
function fireShot(h) {
  const C = h.C, a = Math.atan2(h.aim[1], h.aim[0]), sp = C.shotSpeed * (h.specials.quickshot ? 1.2 : 1);
  const dmg = (C.shotDmg + (h.specials.hardshot ? 1 : 0) + (h.amulet === 'rending' && h.amuletT > 0 ? 1 : 0)) * TUNE.shotDamage;
  W.shots.push({ x: h.x + Math.cos(a) * 8, y: h.y + Math.sin(a) * 8, z: 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 220 / sp, dmg, owner: h, kind: C.shot, pierce: (C.pierce || 0) + (h.amulet === 'rending' && h.amuletT > 0 ? 99 : 0), bounce: h.amulet === 'ricochet' && h.amuletT > 0 ? 3 : 0, splash: !!C.splash, a, hit: new Set(), spin: 0 });
  h.cd = C.cd / (TUNE.shotRate * (h.specials.quickshot ? 1.33 : 1)); h.kick = .08; h.shotsFired++;
  sfx('shot_' + C.shot, { vol: .5, vary: .1 });
  if (W.net && !W.net.host) return;
}
function shotWall(s, cx, cy) {
  const t = W.map.cell(cx, cy);
  if (t === 3) { const cr = W.cracked.find(c => c.x === cx && c.y === cy); if (cr) { cr.hp -= s.dmg; game.particles.dust((cx + .5) * TS, (cy + .5) * TS, 10, 3, { color: '#998' }); sfx('clunk'); if (cr.hp <= 0) breakCrack(cr); } }
}
function breakCrack(cr) {
  W.map.set(cr.x, cr.y, 0); W.cracked = W.cracked.filter(c => c !== cr); W.rubble.push({ x: (cr.x + .5) * TS, y: (cr.y + .5) * TS });
  game.particles.explosion((cr.x + .5) * TS, (cr.y + .5) * TS, 6, .6, { debris: ['#8a7a66'] }); sfx('crumble'); say('crack', {});
  W.net && W.net.event && W.net.event(['wall', cr.x, cr.y]);
}
function shotsStep(dt) {
  const H = W.grid;
  for (const s of W.shots) {
    if (s.dead) continue;
    const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt, cx = Math.floor(nx / TS), cy = Math.floor(ny / TS);
    if (W.map.solidCell(cx, cy) && W.map.heightAt(nx, ny) > s.z) {
      if (W.map.cell(cx, cy) !== 7) {   // the low table: shots fly over
        shotWall(s, cx, cy);
        if (s.bounce > 0) { s.bounce--; if (!W.map.solidCell(Math.floor(s.x / TS), cy) ) s.vy *= -1; else if (!W.map.solidCell(cx, Math.floor(s.y / TS))) s.vx *= -1; else { s.vx *= -1; s.vy *= -1; } s.a = Math.atan2(s.vy, s.vx); sfx('clink', { vol: .3 }); game.particles.sparks(s.x, s.y, 12, 3, null, { color: '#9ef' }); continue; }
        s.dead = true; game.particles.sparks(s.x, s.y, 12, 3, null, { color: '#ffd' }); continue;
      }
    }
    s.x = nx; s.y = ny; s.life -= dt; s.spin += dt * 14; if (s.life <= 0) { s.dead = true; continue; }
    // monsters
    H.near(s.x, s.y, 14, m => {
      if (s.dead || m.dead || s.hit.has(m.id) || m.dying > 0 || m.emerge > 0) return;
      if (Math.hypot(m.x - s.x, m.y - s.y) > m.r + 3) return;
      if (m.ch === 'y' && m.vis <= 0) return;
      if (m.T.immune) { s.dead = true; sfx('clink'); game.particles.sparks(s.x, s.y, 12, 4, null, { color: '#fff' }); return; }
      s.hit.add(m.id);
      damageMon(m, s.dmg, s.owner, { knock: s, kb: 30 });
      game.hitFx(s.x, s.y, 12, { power: .4, angle: s.a, sound: false, rumble: false });
      if (s.splash) for (const o of W.mons) if (o !== m && !o.dead && Math.hypot(o.x - m.x, o.y - m.y) < 12) damageMon(o, 1, s.owner, {});
      if (s.pierce > 0) s.pierce--; else s.dead = true;
    });
    if (s.dead) continue;
    for (const g of W.gens) if (!g.dead && Math.hypot(g.x - s.x, g.y - s.y) < g.r + 3) { damageGen(g, s.dmg, s.owner); game.particles.sparks(s.x, s.y, 12, 3); s.dead = true; break; }
    if (s.dead) continue;
    for (const it of W.items) if (!it.gone && SHOOTABLE[it.kind] && Math.hypot(it.x - s.x, it.y - s.y) < 6) { shootItem(it, s.owner); s.dead = true; break; }
    if (s.dead) continue;
    if (W.allyStun) for (const o of W.heroes) if (o !== s.owner && !o.down && Math.hypot(o.x - s.x, o.y - s.y) < o.r + 3 && o.invuln <= 0) { o.stun = .35; o.flash = .12; s.dead = true; sfx('clink'); break; }
  }
  W.shots = W.shots.filter(s => !s.dead);
}
const SHOOTABLE = { cider: 1, stew: 1, flask: 1, platter: 1 };
function shootItem(it, by) {
  it.gone = true; W.net && W.net.event && W.net.event(['gone', it.id, by ? by.slot : -1]);
  if (it.kind === 'stew') { say('shotstew', { hero: by, force: true }); ftext(it.x, it.y, 'SPLAT', '#8c8'); puff(it.x, it.y, 6, 6, '#7a8'); return; }
  if (it.kind === 'flask') { flaskBlast(by, it.x, it.y, .5, true); return; }
  if (by) { by.shotFood++; say('shotfood', { hero: by, force: true, cd: 3 }); }
  puff(it.x, it.y, 6, 8, '#fa8'); sfx('splat');
}

// ---------- magic ----------
function visibleBox(h) {
  if (W.net && !W.net.host && h.view) return { x0: h.x - h.view[0] * TS, x1: h.x + h.view[0] * TS, y0: h.y - h.view[1] * TS, y1: h.y + h.view[1] * TS };
  const b = game.screenGround && game.screenGround();
  if (b) return b;
  return { x0: h.x - 14 * TS, x1: h.x + 14 * TS, y0: h.y - 9 * TS, y1: h.y + 9 * TS };
}
function useFlask(h) {
  if (h.down || h.stun > 0) return false;
  if (h.flasks <= 0 && !DEV.infinite) return false;
  if (!DEV.infinite) h.flasks--;
  flaskBlast(h, h.x, h.y, 1, false, visibleBox(h));
  h.rig.poseHold = .4; h.castT = .45;
  say('flask', { hero: h, cd: 8 });
  return true;
}
function flaskBlast(h, x, y, power, shot, box) {
  const C = h ? h.C : CLASSES[3], mp = (h ? C.mpow : 1) * power * TUNE.magicPower * (h && h.specials.witchwater ? 1.5 : 1), gp = (h ? C.mgen : 1) * power * TUNE.magicPower;
  const b = box || { x0: x - 80, x1: x + 80, y0: y - 80, y1: y + 80 };
  W.rings = W.rings || []; W.rings.push({ x, y, t: 0, big: !shot });
  game.flash(shot ? '#ffd8a0' : '#ffffff', shot ? .25 : .5); game.shake(shot ? 3 : 6); sfx(shot ? 'boomS' : 'magic');
  for (const m of W.mons) {
    if (m.dead || m.x < b.x0 || m.x > b.x1 || m.y < b.y0 || m.y > b.y1) continue;
    if (m.ch === 't') { if (!shot || true) { m.hp = 0; killMon(m, h); } continue; }
    if (m.isBoss) { damageMon(m, Math.ceil(4 * mp), h, {}); continue; }
    damageMon(m, Math.ceil(4 * mp), h, { knock: { x, y }, kb: 80 });
  }
  for (const g of W.gens) if (!g.dead && g.x >= b.x0 && g.x <= b.x1 && g.y >= b.y0 && g.y <= b.y1) damageGen(g, Math.ceil(2 * gp), h);
  for (const f of W.foe) if (f.x >= b.x0 && f.x <= b.x1 && f.y >= b.y0 && f.y <= b.y1) f.dead = true;
  if (W.net && W.net.host) W.net.event && W.net.event(['magic', h ? h.slot : -1, Math.round(x), Math.round(y)]);
}

// ---------- items ----------
const FOOD_POINTS = { roast: 10, loaf: 5, cider: 10, platter: 20 };
function pickup(h, it) {
  const lim = heroLimit(h);
  switch (it.kind) {
    case 'key': if (h.keys >= lim) return false; h.keys++; say('key', { hero: h }); sfx('key'); break;
    case 'flask': if (h.flasks >= lim) return false; h.flasks++; sfx('pickup'); break;
    case 'roast': case 'cider': h.hp += TUNE.foodHeal; h.score += 10; h.food++; say('food', { hero: h, cd: 12 }); sfx('chomp'); ftext(h.x, h.y, '+' + TUNE.foodHeal, '#8f8'); h.rig.kick(.3); break;
    case 'loaf': h.hp += TUNE.foodHeal / 2; h.score += 5; h.food++; sfx('chomp'); ftext(h.x, h.y, '+' + Math.round(TUNE.foodHeal / 2), '#8f8'); break;
    case 'platter': h.hp += TUNE.foodHeal * 2; h.score += 20; h.food++; sfx('chomp'); ftext(h.x, h.y, '+' + TUNE.foodHeal * 2, '#8f8'); break;
    case 'stew': h.hp -= 50; h.queasy = 4; say('stew', { hero: h, cd: 10 }); sfx('gag'); ftext(h.x, h.y, '-50', '#f88'); if (h.hp <= 0) heroFall(h); break;
    case 'potion': if (h.specials[it.sub]) return false; h.specials[it.sub] = true; h.score += 250; ftext(h.x, h.y, SPECIAL_NAMES[it.sub], SPECIAL_COL[it.sub]); sfx('power'); break;
    case 'amulet': h.amulet = it.sub; h.amuletT = 20; h.score += 100; ftext(h.x, h.y, AMULET_NAMES[it.sub], AMULET_COL[it.sub]); sfx('power'); break;
    case 'gold': h.score += 100; h.treasure++; sfx('coin'); break;
    case 'gem': h.score += 250; h.treasure++; sfx('gem'); break;
    case 'crown': h.score += 2500; h.treasure++; say('crown', { hero: h }); sfx('gem'); break;
    case 'chest': h.score += 500; h.treasure++; it.opened = true; sfx('chest'); game.particles.glints(it.x, it.y, 8, 10); say('chest', { hero: h, cd: 20 }); break;
    case 'lchest': if (h.keys < 1) return false; h.keys--; h.score += 1000; h.treasure++; sfx('chest'); { const d = pick(['flask', 'roast', 'key']); dropItem(d, it.x + 8, it.y + 6); } game.particles.glints(it.x, it.y, 8, 12); break;
  }
  if (['gold', 'gem', 'crown', 'chest', 'lchest'].includes(it.kind)) { game.particles.glints(it.x, it.y, 8, 6); if (W.hoard.on) { W.hoard.left--; if (W.hoard.left <= 0) { h.score += 2000; say('hoardAll', { force: true }); } } }
  it.gone = true; W.net && W.net.event && W.net.event(['gone', it.id, h.slot]);
  return true;
}
function itemsStep(h) {
  for (const it of W.items) {
    if (it.gone) continue;
    const reach = it.kind === 'platter' ? 15 : h.r + 6;
    if (Math.hypot(it.x - h.x, it.y - h.y) < reach) { if (W.net && !W.net.host) continue; pickup(h, it); }
  }
}

// ---------- doors, plates, pads, runes, spikes, beams ----------
function openDoorGroup(d, by) {
  if (d.open) return; d.open = 1; d.t = 0;
  for (const c of d.cells) { W.map.set(c.x, c.y, 0); }
  sfx('door'); say('door', { hero: by }); W.net && W.net.event && W.net.event(['door', W.doors.indexOf(d)]);
}
function featuresStep(dt) {
  const T = W.time;
  for (const d of W.doors) if (d.open) d.t += dt;
  for (const h of W.heroes) {
    if (h.down) continue;
    if (!d_doorsOpenAllowed()) continue;
    // doors
    if (h.keys > 0 || DEV.infinite) for (const d of W.doors) if (!d.open) for (const c of d.cells) {
      if (Math.hypot((c.x + .5) * TS - h.x, (c.y + .5) * TS - h.y) < TS * .5 + h.r + 3) {
        if (!(W.net && !W.net.host)) { if (!DEV.infinite) h.keys--; openDoorGroup(d, h); }
        break;
      }
    }
    // plates
    for (const p of W.plates) if (!p.hit && Math.hypot(p.x - h.x, p.y - h.y) < 8) {
      p.hit = true; for (const q of W.plates) if (q.kind === p.kind) q.hit = true;
      for (const t of W.trapWalls[p.kind]) { W.map.set(t.x, t.y, 0); game.particles.explosion((t.x + .5) * TS, (t.y + .5) * TS, 6, .5, { debris: ['#8a7a66'] }); }
      game.shake(3); sfx('rumble'); say('trap', { hero: h }); W.net && W.net.event && W.net.event(['trap', p.kind]);
      if (p.kind === 'Y') for (const m of W.mons) m.cool = .2;
    }
    // transporters
    for (const p of W.pads) if (p.pair && p.cd <= 0 && Math.hypot(p.x - h.x, p.y - h.y) < 7 && h.tele <= 0) {
      p.cd = p.pair.cd = .8; h.x = p.pair.x; h.y = p.pair.y; h.tele = .5; sfx('tele'); game.particles.glints(p.x, p.y, 6, 8, '#a8f'); game.particles.glints(h.x, h.y, 6, 8, '#a8f'); say('teleport', { hero: h, cd: 20 });
    }
    // runes
    if (h.runeImmune <= 0) for (const r of W.runes) if (Math.hypot(r.x - h.x, r.y - h.y) < 7) { h.stun = .8; h.runeImmune = 2.3; sfx('zap'); game.particles.sparks(h.x, h.y, 6, 8, null, { color: '#fe8' }); say('rune', { hero: h, cd: 30 }); break; }
    // spikes
    for (const s of W.spikes) { const ph = (T + s.ph) % 1.6; if (ph < .5 && Math.abs(s.x - h.x) < 8 && Math.abs(s.y - h.y) < 8 && (h.spikeAt !== Math.floor((T + s.ph) / 1.6) + s.ph)) { h.spikeAt = Math.floor((T + s.ph) / 1.6) + s.ph; hurtHero(h, 15, s, { force: true }); } }
    // beams
    for (const b of W.beams) { if (!beamOn(b)) continue; if (Math.abs(b.x - h.x) < 9 + h.r * .3 && Math.abs(b.y - h.y) < 9 + h.r * .3) { if (!h.beamCd || h.beamCd <= 0) { h.beamCd = .6; hurtHero(h, 12, b, { force: true }); h.push((h.x - b.x) * 12, (h.y - b.y) * 12); sfx('zap'); } } }
    // fake walls
    for (const f of W.fakes) if (!f.found && Math.abs((f.x + .5) * TS - h.x) < 10 && Math.abs((f.y + .5) * TS - h.y) < 10) { f.found = 1; if (!W.secretFound) { W.secretFound = true; say('fake', { hero: h }); } sfx('secret'); game.particles.glints((f.x + .5) * TS, (f.y + .5) * TS, 8, 8); }
    if (h.beamCd > 0) h.beamCd -= dt;
  }
  for (const p of W.pads) if (p.cd > 0) p.cd -= dt;
  for (const m of W.mons) { if (m.dead || m.ch === 'g') continue; if (m.T.immune) continue; for (const b of W.beams) if (beamOn(b) && Math.abs(b.x - m.x) < 9 && Math.abs(b.y - m.y) < 9 && (!m.beamCd || m.beamCd <= 0)) { m.beamCd = .6; damageMon(m, 2, null, { knock: b, kb: 120 }); } if (m.beamCd > 0) m.beamCd -= dt; }
}
const d_doorsOpenAllowed = () => true;
function beamOn(b) { const ph = (W.time + b.ph) % 4; return ph >= 2 || (ph >= 1.6 && Math.floor(W.time * 20) % 2 === 0); }
