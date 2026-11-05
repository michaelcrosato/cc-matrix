/* 44-tools: the ten ninja tools and the Bento that carries them: 8 compartments (2 tiers x 4), each one tool type up to
 * its stack. Food tools are eaten or left as bait; steel tools are thrown, lobbed or dropped. */
def('tool', 'riceball', { name: 'Rice Ball', stack: 3, use: 'eat', desc: 'Eat to heal 40. Takes a moment.', unlock: null });
def('tool', 'poison', { name: 'Poison Rice Ball', stack: 2, use: 'bait', range: 48, desc: 'Leave it where a guard will see it. He eats. He does not finish.', unlock: null });
def('tool', 'dango', { name: 'Sleep Dango', stack: 2, use: 'bait', range: 48, desc: 'A bait that puts the eater to sleep for 25 s.', unlock: { mission: 'm1', rank: 'Ekiben' } });
def('tool', 'plum', { name: 'Sour Plum', stack: 3, use: 'eat', desc: 'Full stamina and soft steps for 20 s.', unlock: { mission: 'training', rank: 'Ekiben' } });
def('tool', 'shuriken', { name: 'Shuriken', stack: 10, use: 'throw', range: 160, desc: 'Thrown star. 8 damage; a calm guard turns to look.', unlock: null });
def('tool', 'smoke', { name: 'Smoke Bomb', stack: 2, use: 'lob', range: 96, desc: 'A cloud no eye sees through. Guards inside lose you.', unlock: null });
def('tool', 'caltrops', { name: 'Caltrops', stack: 2, use: 'drop', desc: 'Iron spikes at your feet: pursuers stumble and limp.', unlock: null });
def('tool', 'firecracker', { name: 'Firecracker', stack: 3, use: 'lob', range: 128, desc: 'Pops after landing. Guards go to look at the noise.', unlock: null });
def('tool', 'firepot', { name: 'Fire Pot', stack: 1, use: 'lob', range: 112, desc: 'Bursts in flame on impact: 45 damage, very loud.', unlock: { mission: 'm2', rank: 'Makunouchi' } });
def('tool', 'cloak', { name: 'Straw Cloak', stack: 1, use: 'self', desc: '15 s almost unseen, unless you strike or sprint.', unlock: { any: true, rank: 'Grand Kaiseki' } });
B.TOOL_ORDER = ['riceball', 'poison', 'dango', 'plum', 'shuriken', 'smoke', 'caltrops', 'firecracker', 'firepot', 'cloak'];

B.Bento = {
  make(loadout) { const slots = []; for (let i = 0; i < 8; i++) { const id = loadout && loadout[i]; slots.push(id ? { tool: id, n: get('tool', id).stack } : null); } return { slots, sel: Math.max(0, slots.findIndex(Boolean)), used: 0 }; },
  cur(M) { const b = M.bento, s = b.slots[b.sel]; return s && s.n > 0 ? s : null; },
  count(M, id) { return M.bento.slots.reduce((a, s) => a + (s && s.tool === id ? s.n : 0), 0); },
  cycle(M, d) { const b = M.bento; for (let k = 1; k <= 8; k++) { const i = (b.sel + d * k + 80) % 8; if (b.slots[i] && b.slots[i].n > 0) { b.sel = i; B.sfx('uiMove'); M.toolFlash = .6; return; } } },
  pick(M, i) { if (M.bento.slots[i] && M.bento.slots[i].n > 0) { M.bento.sel = i; B.sfx('uiMove'); M.toolFlash = .6; } },
  take(M, id) { const b = M.bento; if (M.cheats.infTools) return true; const s = b.slots.find(s => s && s.tool === id && s.n > 0); if (!s) return false; s.n--; return true; },
  add(M, id, n) { const b = M.bento, st = get('tool', id).stack; let left = n; for (const s of b.slots) if (s && s.tool === id && s.n < st && left > 0) { const k = Math.min(st - s.n, left); s.n += k; left -= k; } for (let i = 0; i < 8 && left > 0; i++) if (!b.slots[i]) { const k = Math.min(st, left); b.slots[i] = { tool: id, n: k }; left -= k; } return n - left; },
  eatRiceBall(h, M) { if (h.hp >= h.hpMax || h.eatT > 0) return; if (!B.Bento.take(M, 'riceball')) { M.toast('No rice balls', 'Your bento is empty of rice'); return; } h.eatT = .6; h.eatTool = 'riceball'; B.sfx('eat'); M.stats.tools++; B.emit('toolUsed', { tool: 'riceball' }); },
  use(h, M, I) {
    const s = B.Bento.cur(M); if (!s) { M.toast('Empty compartment', 'Pick another tool'); return; }
    const T = get('tool', s.tool);
    if (s.tool === 'riceball') return B.Bento.eatRiceBall(h, M);
    if (!B.Bento.take(M, s.tool)) return;
    M.stats.tools++; B.emit('toolUsed', { tool: s.tool });
    if (s.tool === 'plum') { h.stamina = h.staminaMax; h.softT = 20; B.sfx('eat'); M.toast('Sour Plum', 'Soft steps for 20 seconds'); return; }
    if (s.tool === 'cloak') { h.cloakT = 15; B.sfx('fusuma'); M.toast('Straw Cloak', 'Still as a haystack'); return; }
    if (s.tool === 'caltrops') { M.traps.push({ kind: 'caltrops', x: h.x, y: h.y, z: h.z, r: 24, t: 20 }); B.sfx('caltrop'); return; }
    const aim = B.Bento.aim(h, M, I, T.range || 80);
    if (T.use === 'bait') {
      const d = Math.hypot(aim.x - h.x, aim.y - h.y), at = d < 14 || I.blockDown ? { x: h.x + Math.cos(h.facing) * 8, y: h.y + Math.sin(h.facing) * 8 } : aim;
      B.Bento.lob(h, M, s.tool, at, 18); return;
    }
    if (T.use === 'throw') {
      const a = Math.atan2(aim.y - h.y, aim.x - h.x); h.facing = a; h.combo.cancel && h.combo.cancel();
      M.shots.fire({ x: h.x + Math.cos(a) * 6, y: h.y + Math.sin(a) * 6, z: h.z + 18, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, r: 2, team: 'player', life: (T.range || 160) / 300, dmg: 8, color: '#c8d0e0' });
      B.sfx('shuriken'); return;
    }
    const at2 = s.tool === 'smoke' && I.blockDown ? { x: h.x, y: h.y } : aim;
    B.Bento.lob(h, M, s.tool, at2, 24);
  },
  /* where a thrown tool goes: the cursor (clamped to range), else the nearest visible guard ahead, else 80 ahead */
  aim(h, M, I, range) {
    if (I.aimPoint) { const d = Math.hypot(I.aimPoint.x - h.x, I.aimPoint.y - h.y), k = d > range ? range / d : 1; return { x: h.x + (I.aimPoint.x - h.x) * k, y: h.y + (I.aimPoint.y - h.y) * k }; }
    const t = E.targets(h, M.guards.filter(g => g.alive && g.vis === 'visible'), { range, arc: Math.PI / 4, sight: M.world.map })[0];
    if (t) return { x: t.target.x, y: t.target.y };
    const d = Math.min(80, range); return { x: h.x + Math.cos(h.facing) * d, y: h.y + Math.sin(h.facing) * d };
  },
  lob(h, M, tool, at, apex) {
    const from = { x: h.x, y: h.y, z: h.z + 20 }, gz = M.world.map.groundAt(at.x, at.y, 2, 300) || 0, v = E.arc(from, { x: at.x, y: at.y, z: gz }, 700, { apex });
    M.lobs.push({ tool, x: from.x, y: from.y, z: from.z, vx: v.vx, vy: v.vy, vz: v.vz, t: 0 }); B.sfx('whoosh', { vol: .5 }); h.facing = Math.atan2(at.y - h.y, at.x - h.x);
  }
};
/* lobbed tools in flight, landed baits, clouds and traps */
B.toolsUpdate = (M, dt) => {
  const W = M.world;
  for (const l of M.lobs) {
    l.t += dt; l.vz -= 700 * dt; l.x += l.vx * dt; l.y += l.vy * dt; l.z += l.vz * dt;
    const gz = W.map.groundAt(l.x, l.y, 2, l.z + 4) || 0;
    if (l.z <= gz || l.t > 3) { l.done = true; l.z = gz; B.toolLand(M, l); }
  }
  M.lobs = M.lobs.filter(l => !l.done);
  for (const c of M.clouds) { c.t -= dt; for (let k = 0; k < 2; k++) if (crand() < dt * 8) P.smoke(c.x + (crand() - .5) * c.r, c.y + (crand() - .5) * c.r, c.z + 4 + crand() * 20, 1, { size: 3, color: '#a8a8b0' }); }
  M.clouds = M.clouds.filter(c => c.t > 0);
  for (const t of M.traps) {
    t.t -= dt;
    if (t.kind === 'caltrops') for (const g of M.guards) if (g.alive && !g.boss && !g.dying && Math.hypot(g.x - t.x, g.y - t.y) < t.r && g.onGround && !(g._calT > 0)) { g._calT = 4; B.damage(M.hero, g, 6, { kind: 'trap', pierce: true, quiet: true }); g.stunT = 2; g.limpT = 6; B.sfxAt('caltrop', g.x, g.y); g.bark('hurt'); }
    if (t.kind === 'pop' && t.t <= 0) { B.sfxAt('crack', t.x, t.y); P.sparks(t.x, t.y, t.z + 4, 12, 0); P.glints(t.x, t.y, t.z + 6, 6, '#ffe080'); B.noise(t.x, t.y, t.z, 140, 'firecracker'); }
  }
  for (const g of M.guards) if (g._calT > 0) g._calT -= dt;
  M.traps = M.traps.filter(t => t.t > 0);
  for (const b of M.baits) { b.t += dt; if (b.eaten) b.done = true; }
  M.baits = M.baits.filter(b => !b.done);
  for (const l of M.world.dynLights) if (l.life !== undefined) l.life -= dt;
  M.world.dynLights = M.world.dynLights.filter(l => l.life === undefined || l.life > 0);
};
B.toolLand = (M, l) => {
  const h = M.hero;
  if (l.tool === 'poison' || l.tool === 'dango') { M.baits.push({ kind: l.tool, x: l.x, y: l.y, z: l.z, t: 0, eaten: false }); B.sfxAt('stepTatami', l.x, l.y); return; }
  if (l.tool === 'smoke') { M.clouds.push({ x: l.x, y: l.y, z: l.z, r: 40, t: B.T('smokeTime') }); B.sfxAt('smoke', l.x, l.y); P.smoke(l.x, l.y, l.z + 8, 30, { size: 3, color: '#b0b0b8' }); for (const g of M.guards) if (g.alive && Math.hypot(g.x - l.x, g.y - l.y) < 40) g.blind(); return; }
  if (l.tool === 'firecracker') { M.traps.push({ kind: 'pop', x: l.x, y: l.y, z: l.z, t: .8 }); B.sfxAt('stepTatami', l.x, l.y); return; }
  if (l.tool === 'firepot') {
    B.sfxAt('boom', l.x, l.y); P.explosion(l.x, l.y, l.z + 4, 1.2, { freeze: false, shake: 4 }); P.fire(l.x, l.y, l.z, 20, { size: 2 });
    M.world.dynLights.push({ x: l.x, y: l.y, z: 12, r: 90, i: 1.2, color: '#ff8a3a', life: 1 });
    for (const g of M.guards.concat(M.bosses)) if (g.alive && Math.hypot(g.x - l.x, g.y - l.y) < 32) B.damage(h, g, 45, { kind: 'fire', pierce: true });
    if (h && Math.hypot(h.x - l.x, h.y - l.y) < 32) B.damage(null, h, 45 * .6, { kind: 'fire', pierce: true });
    B.noise(l.x, l.y, l.z, 220, 'explosion');
  }
};
/* is a sight line through smoke? */
B.smoked = (M, a, b) => {
  for (const c of M.clouds) {
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1, u = clamp(((c.x - a.x) * dx + (c.y - a.y) * dy) / L2, 0, 1);
    if (Math.hypot(a.x + dx * u - c.x, a.y + dy * u - c.y) < c.r) return true;
  }
  return false;
};
B.finishEat = h => { if (h.eatTool === 'riceball') { h.hp = Math.min(h.hpMax, h.hp + 40); P.glints(h.x, h.y, h.z + 20, 8, '#a0ffa0'); B.sfx('pickup'); } h.eatTool = null; };
