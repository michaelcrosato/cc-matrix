/* ---- TOOLS and THE BENTO: 10 tools packed into 8 compartments (2 tiers x 4). Food tools are eaten or left as bait;
 * steel tools are thrown, lobbed or dropped. Stock is unlimited; packing limits you. Thrown tools fly to the cursor
 * (mouse) or auto-aim at the nearest visible guard in a 45° cone, else 80 ahead ---- */
B.def('tool', 'riceball', { name: 'Rice Ball', icon: 'riceball', stack: 3, use: 'eat', desc: 'Eat it: +40 health. Takes a moment.', unlock: null });
B.def('tool', 'poisonball', { name: 'Poison Rice Ball', icon: 'poisonball', stack: 2, use: 'bait', range: 48, desc: 'Leave it where a hungry guard will find it.', unlock: null });
B.def('tool', 'dango', { name: 'Sleep Dango', icon: 'dango', stack: 2, use: 'bait', range: 48, desc: 'The eater sleeps 25 s. A front cut is easy.', unlock: { mission: 'm1', rank: 'Ekiben' } });
B.def('tool', 'plum', { name: 'Sour Plum', icon: 'plum', stack: 3, use: 'self', desc: 'Full stamina and soft steps for 20 s.', unlock: { mission: 'training', rank: 'Ekiben' } });
B.def('tool', 'shuriken', { name: 'Shuriken', icon: 'shuriken', stack: 10, use: 'throw', range: 160, desc: 'Thrown star: 8 damage. Turns a calm guard.', unlock: null });
B.def('tool', 'smoke', { name: 'Smoke Bomb', icon: 'smoke', stack: 2, use: 'lob', range: 96, desc: 'A cloud that blinds and hides. Block + use: at your feet.', unlock: null });
B.def('tool', 'caltrops', { name: 'Caltrops', icon: 'caltrops', stack: 2, use: 'drop', desc: 'Spikes at your feet: pursuers stumble and limp.', unlock: null });
B.def('tool', 'firecracker', { name: 'Firecracker', icon: 'firecracker', stack: 3, use: 'lob', range: 128, desc: 'Pops where it lands. Guards go to look.', unlock: null });
B.def('tool', 'firepot', { name: 'Fire Pot', icon: 'firepot', stack: 1, use: 'lob', range: 112, desc: 'Explodes: 45 damage around it. Very loud.', unlock: { mission: 'm2', rank: 'Makunouchi' } });
B.def('tool', 'cloak', { name: 'Straw Cloak', icon: 'cloak', stack: 1, use: 'self', desc: 'For 15 s eyes slide off you, unless you are close.', unlock: { mission: 'any', rank: 'Grand Kaiseki' } });
const TOOL_ORDER = ['riceball', 'poisonball', 'dango', 'plum', 'shuriken', 'smoke', 'caltrops', 'firecracker', 'firepot', 'cloak'];
const Tools = {};
/** where a thrown tool goes: the cursor (clamped to range), the nearest visible guard in a 45° cone, or 80 ahead */
Tools.aim = (h, it, range, M) => {
  if (it && it.aimPoint && it.mouseMode) { const dx = it.aimPoint.x - h.x, dy = it.aimPoint.y - h.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, range / d); return { x: h.x + dx * k, y: h.y + dy * k, z: M.world.map.groundAt(h.x + dx * k, h.y + dy * k) }; }
  let f = h.facing; const mv = it && it.move; if (mv && Math.hypot(mv[0], mv[1]) > .3) f = Math.atan2(mv[1], mv[0]);
  let best = null, bd = range;
  for (const g of M.guards) { if (!g.alive || g.vis === 'hidden') continue; const d = Math.hypot(g.x - h.x, g.y - h.y); if (d < bd && Math.abs(E.angDiff(f, Math.atan2(g.y - h.y, g.x - h.x))) < .4) { bd = d; best = g; } }
  if (best) { h.facing = Math.atan2(best.y - h.y, best.x - h.x); return { x: best.x, y: best.y, z: best.z, target: best }; }
  const d = Math.min(80, range); h.facing = f; const x = h.x + Math.cos(f) * d, y = h.y + Math.sin(f) * d; return { x, y, z: M.world.map.groundAt(x, y) };
};
Tools.use = (h, it, M) => {
  const slot = Hero.slot(h); if (!slot) { B.Hud.toast('The bento is empty', ''); return false; }
  const spec = B.get('tool', slot.tool); if (!spec) return false;
  if (h.swim && slot.tool !== 'riceball') { B.Hud.toast('Not in the water', 'Only food works while swimming.'); return false; }
  if (Tools.cd > game.time) return false;
  const id = slot.tool;
  if (id === 'riceball') { if (h.hp >= h.maxHp || h.eatT > 0) return false; if (!Hero.take(h, id)) return false; h.eatT = .6; Au.sfx('crunch'); }
  else if (id === 'plum') { if (!Hero.take(h, id)) return false; h.stamina = h.staminaMax; h.exhausted = false; h.softT = 20; Au.sfx('eat'); B.Hud.toast('Sour Plum', 'Soft steps for 20 seconds.'); }
  else if (id === 'cloak') { if (!Hero.take(h, id)) return false; h.cloakT = 15; Au.sfx('fusuma'); Pt.smoke(h.x, h.y, h.z + 10, 6, { color: '#c8b070' }); B.Hud.toast('Straw Cloak', 'Eyes slide off you for 15 seconds.'); }
  else if (id === 'poisonball' || id === 'dango') {
    if (!Hero.take(h, id)) return false;
    const at = it && it.aimPoint && it.mouseMode ? Tools.aim(h, it, 48, M) : { x: h.x + Math.cos(h.facing) * 10, y: h.y + Math.sin(h.facing) * 10, z: h.z };
    if (Math.hypot(at.x - h.x, at.y - h.y) > 16) Tools.lob(h, at, id, M); else Tools.placeBait(at.x, at.y, at.z, id, M);
    Au.sfx('pickup', { vol: .3 });
  } else if (id === 'shuriken') {
    if (!Hero.take(h, id)) return false;
    const at = Tools.aim(h, it, 160, M), a = Math.atan2(at.y - h.y, at.x - h.x); h.facing = a;
    M.shots.fire({ x: h.x + Math.cos(a) * 6, y: h.y + Math.sin(a) * 6, z: h.z + 20, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, vz: 0, r: 2, team: 'hero', color: '#d8dce8', life: 160 / 300, dmg: 8, tool: 'shuriken', from: { x: h.x, y: h.y, z: h.z } });
    h.combo.cancel(); h.throwT = .2; Au.sfx('shuriken'); B.noise(h.x, h.y, h.z, 15, 'throw');
  } else if (id === 'caltrops') { if (!Hero.take(h, id)) return false; M.traps.push({ x: h.x, y: h.y, z: h.z, r: 24, t: 20 }); Au.sfx('caltrops'); }
  else if (id === 'smoke' || id === 'firecracker' || id === 'firepot') {
    if (!Hero.take(h, id)) return false;
    const feet = id === 'smoke' && h.blocking, at = feet ? { x: h.x, y: h.y, z: h.z } : Tools.aim(h, it, spec.range, M);
    if (feet) Tools.effect(id, at, M); else Tools.lob(h, at, id, M);
    Au.sfx('whoosh', { vol: .4 });
  }
  Tools.cd = game.time + .25;
  B.emit('toolUsed', { tool: id });
  return true;
};
/** a lobbed body flying to a ground point (E.arc), with a trail */
Tools.lob = (h, at, id, M) => {
  const from = { x: h.x, y: h.y, z: h.z + 22 }, to = { x: at.x, y: at.y, z: at.z || 0 }, v = E.arc(from, to, 700, { apex: 24 });
  M.lobs.push({ id, x: from.x, y: from.y, z: from.z, vx: v.vx, vy: v.vy, vz: v.vz, t: 0, tmax: v.t + .05, to });
};
Tools.placeBait = (x, y, z, id, M) => { M.baits.push({ id, x, y, z, kind: id === 'dango' ? 'sleep' : id === 'poisonball' ? 'poison' : 'food', taken: null, t: 0 }); };
/** a tool's effect where it lands */
Tools.effect = (id, at, M) => {
  const W = M.world;
  if (id === 'smoke') { M.clouds.push({ x: at.x, y: at.y, z: at.z || 0, r: 40, t: T('smokeTime'), t0: T('smokeTime') }); Au.sfx('smoke'); Pt.smoke(at.x, at.y, (at.z || 0) + 8, 26, { size: 3, color: '#a8a8b0' }); }
  else if (id === 'firecracker') { M.timers.push({ t: .8, fn: () => { Au.sfx('firecracker'); Pt.sparks(at.x, at.y, (at.z || 0) + 4, 16, -Math.PI / 2); Pt.glints(at.x, at.y, (at.z || 0) + 6, 10, '#ffd060'); W.dyn.push({ x: at.x, y: at.y, z: 8, r: 40, i: .7, t: .3, color: '#ffd060' }); B.noise(at.x, at.y, at.z || 0, 140, 'firecracker'); } }); Au.sfx('caltrops', { vol: .5 }); }
  else if (id === 'firepot') {
    Pt.explosion(at.x, at.y, (at.z || 0) + 6, 1.3); Pt.fire(at.x, at.y, (at.z || 0) + 4, 18, { size: 2 }); W.dyn.push({ x: at.x, y: at.y, z: 10, r: 80, i: 1, t: 1, color: '#ff8a30' });
    B.noise(at.x, at.y, at.z || 0, 220, 'explosion');
    for (const e of Combat.targets(M).concat([M.hero])) { const d = Math.hypot(e.x - at.x, e.y - at.y); if (d < 32 && Math.abs(e.z - (at.z || 0)) < 24) B.damage(M.hero, e, 45 / (e.kind === 'hero' ? 1 : M.hero.C.dmg), { kind: 'fire', unblockable: true }); }
  }
  else if (id === 'poisonball' || id === 'dango') Tools.placeBait(at.x, at.y, at.z || 0, id, M);
};
/** each step: lobs in flight, clouds, caltrops, bait, thrown stars, timed effects and dynamic lights */
Tools.update = (dt, M) => {
  const W = M.world;
  for (const l of M.lobs) {
    l.t += dt; l.vz -= 700 * dt; l.x += l.vx * dt; l.y += l.vy * dt; l.z += l.vz * dt;
    const gz = W.map.groundAt(l.x, l.y, 0, l.z + 4);
    if (crand() < .5) Pt.add({ kind: 'spark', x: l.x, y: l.y, z: l.z, life: .2, color: l.id === 'firepot' ? '#ff8a30' : '#c8c0b0' });
    if (l.z <= gz || l.t > l.tmax + .6) { l.done = true; Tools.effect(l.id, { x: l.x, y: l.y, z: Math.max(gz, 0) }, M); }
  }
  E.prune(M.lobs, l => l.done);
  for (const c of M.clouds) {
    c.t -= dt; if (crand() < dt * 8) Pt.smoke(c.x + (crand() - .5) * c.r, c.y + (crand() - .5) * c.r, c.z + 6, 2, { size: 3, color: '#9a9aa4' });
    for (const g of M.guards.concat(M.civs)) if (g.alive && g.mind && g.kind !== 'boss' && Math.hypot(g.x - c.x, g.y - c.y) < c.r && Math.abs(g.z - c.z) < 20) {   // blinded: a cough, and the hero is lost (searching at most)
      if (!(g.status.blind > 0)) { B.Voice.bark('*cough* *cough*', g.voice || 'guard', g.x, g.y, { force: true }); g.say = { text: '*cough* *cough*', t: 1.5 }; g.blindN = (g.blindN || 0) + 1; }
      g.status.blind = 1.5; if (g.mind.level > .64) g.mind.level = .64; if (g.mind.state === 'alert') { g.mind.state = 'search'; g.target = null; g.atk && g.atk.cancel && g.atk.cancel(); }
    }
  }
  E.prune(M.clouds, c => c.t <= 0);
  for (const tr of M.traps) {
    tr.t -= dt;
    for (const g of M.guards) if (g.alive && !g.cutBy && g.kind !== 'boss' && Math.hypot(g.x - tr.x, g.y - tr.y) < tr.r && Math.abs(g.z - tr.z) < 6 && !(g.status.caltrop > 0)) {
      g.status.caltrop = 8; g.status.stun = 2; g.status.limp = 6; B.damage(M.hero, g, 6 / M.hero.C.dmg, { kind: 'caltrops' }); B.Voice.bark('Agh! My feet!', g.voice || 'guard', g.x, g.y, { force: true });
    }
  }
  E.prune(M.traps, t => t.t <= 0);
  for (const tm of M.timers) { tm.t -= dt; if (tm.t <= 0 && !tm.done) { tm.done = true; tm.fn(); } }
  E.prune(M.timers, t => t.done);
  for (const b of M.baits) b.t += dt;
  E.prune(M.baits, b => b.gone);
  for (const d of W.dyn) if (d.t !== undefined) d.t -= dt;
  E.prune(W.dyn, d => d.t !== undefined && d.t <= 0);
  M.shots.update(dt, W.map);
  M.shots.hit(Combat.targets(M), (b, t) => {
    if (b.tool === 'shuriken') { Au.sfx('thunk'); B.damage(M.hero, t, b.dmg / M.hero.C.dmg, { kind: 'shuriken' }); if (t.alive && t.mind && t.mind.state === 'calm') { t.mind.hear(.7, b.from); t.mind.level = Math.max(t.mind.level, .7); } B.emit('shurikenHit', { target: t }); }
  }, 'hero');
  if (M.hero && !M.hero.dead) M.shots.hit([M.hero], (b, t) => { Au.sfx('thunk'); B.damage(b.owner || null, t, b.dmg, { kind: b.kind || 'arrow', angle: Math.atan2(b.vy, b.vx) }); }, 'enemy');
  if (M.escort && M.escort.alive) M.shots.hit([M.escort], (b, t) => { B.damage(b.owner || null, t, b.dmg * .6, { kind: 'arrow' }); }, 'enemy');
};
Tools.draw = (r, M) => {
  for (const l of M.lobs) r.queue(l.x, l.y, l.z, g => { const p = r.w(l.x, l.y, l.z); px.disc(g, p[0], p[1], 2, l.id === 'firepot' ? '#5a3a20' : l.id === 'smoke' ? '#2a2a34' : l.id === 'firecracker' ? '#c8243a' : '#f4f0e6'); px.dot(g, p[0] - 1, p[1] - 1, '#ffffff'); });
  for (const b of M.baits) if (!b.gone) r.queue(b.x, b.y, b.z, g => { const p = r.w(b.x, b.y, b.z + 2); px.sprite(g, Art.icon[b.id === 'dango' ? 'dango' : b.id === 'poisonball' ? 'poisonball' : 'riceball'], p[0] - 6, p[1] - 10); });
  for (const tr of M.traps) r.decal(g => { for (let i = 0; i < 9; i++) { const a = i * 2.4, d = (i % 3 + 1) * 6, p = r.w(tr.x + Math.cos(a) * d, tr.y + Math.sin(a) * d, tr.z); px.dot(g, p[0], p[1], '#9a9aa8'); px.dot(g, p[0] + 1, p[1], '#5a5a68'); } });
  for (const c of M.clouds) { const k = clamp(c.t / Math.min(1.5, c.t0), 0, 1); r.queue(c.x, c.y, c.z + 10, g => { const p = r.w(c.x, c.y, c.z + 10); px.blend(g, .45 * k, 'normal', () => { px.disc(g, p[0], p[1], c.r * .9 * (game.zoom || 1), '#8a8a94'); px.disc(g, p[0] - 6, p[1] - 4, c.r * .6 * (game.zoom || 1), '#a8a8b2'); }); }, { bias: 4 }); }
  M.shots.draw(r);
};
/* ---- THE BENTO: 8 compartments; the mission's suggested loadout, the last one remembered, unlocks gate the shelf ---- */
const Bento = {};
Bento.unlocked = (id, save) => { const t = B.get('tool', id); if (!t || !t.unlock) return true; if (B.M && B.M.cheats && B.M.cheats.unlockAll) return true; return !!(save && save.tools && save.tools.includes(id)); };
Bento.fromHint = (hint, save) => {
  const out = []; for (const [tool, n] of hint || []) { if (!Bento.unlocked(tool, save)) continue; const st = B.get('tool', tool).stack; let left = n; while (left > 0 && out.length < 8) { out.push({ tool, n: Math.min(st, left) }); left -= st; } }
  while (out.length < 8) out.push(null);
  return out.slice(0, 8);
};
Bento.full = slots => slots.map(s => s && { tool: s.tool, n: B.get('tool', s.tool).stack });
Bento.copy = slots => slots.map(s => s && { tool: s.tool, n: s.n });
B.Tools = Tools; B.Bento = Bento; B.TOOL_ORDER = TOOL_ORDER;
