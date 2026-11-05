/* The Whiteouts (§7.6). speed: [min, max] u/s; contact: burst damage; red: [body kill, crit kill]; rime: on a crit. */
S7.enemy('giggler', { name: 'Giggler', hp: 30, speed: [32, 42], contact: 20, red: [8, 14], rime: 1, ai: 'walker', blast: 1.5, hats: [null, null, 'beanie'] });
S7.enemy('bellboy', { name: 'Bellboy', hp: 18, speed: [85, 100], contact: 14, red: [6, 12], rime: 1, ai: 'runner', warm: 'head', hats: ['pillbox'] });
S7.enemy('tobogganer', { name: 'Tobogganer', hp: 26, speed: [130, 170], contact: 26, red: [10, 18], rime: 1, ai: 'sled', warm: 'chest', sled: true, laugh: 'cackle' });
S7.enemy('skier', { name: 'Giggler on skis', hp: 30, speed: [110, 140], contact: 20, red: [8, 14], rime: 1, ai: 'sled', sled: false, skis: true });
S7.enemy('snowballer', { name: 'Snowballer', hp: 25, speed: [0, 0], contact: 0, red: [8, 14], rime: 1, ai: 'thrower', every: 2.6, reach: 60, throwDmg: 8, laugh: 'chuckle' });
S7.enemy('twins', { name: 'Twins', hp: 40, speed: [28, 32], contact: 20, red: [12, 20], rime: 2, ai: 'twins',
  onHit(sim, e, warm) {
    if (warm || e.split) return true;
    // a body hit splits it in two small Gigglers, once
    e.split = true; e.alive = false; e.gone = true;
    for (const s of [-1, 1]) { const g = sim.spawnEnemy('giggler', [e.x + Math.cos(e.facing + Math.PI / 2) * 10 * s, e.y + Math.sin(e.facing + Math.PI / 2) * 10 * s], { hp: 12, size: .7, reveal: 3, wave: e.wave }); g.split = true; }
    sim.emit('split', { at: [e.x, e.y, e.z + 16] });
    return false;
  } });
S7.enemy('plow', { name: 'Plow', hp: 90, speed: [24, 28], contact: 30, red: [20, 30], rime: 2, ai: 'plow', warm: 'back', shield: true, size: 1.15, laugh: 'cackle' });
S7.enemy('inspector', { name: 'Inspector', hp: 50, speed: [0, 0], contact: 0, red: [15, 25], rime: 2, ai: 'inspector', passive: true, warm: 'head', hats: ['felt'],
  onKill(sim, e) { if (e.data.give) { sim.giveItem(e.data.give, 1); sim.st.flags[e.data.flag || 'inspectorDead'] = 1; sim.emit('edelweiss', { at: [e.x, e.y, e.z + 20] }); } } });
S7.enemy('bloom', { name: 'Bloom', hp: 300, speed: [16, 20], contact: 45, red: [40, 60], rime: 4, ai: 'bloom', size: 1.8, blast: 2.5, noCrit: true, laugh: 'cackle',
  init(sim, e) { e.spotsLeft = 3; e.spotI = 0; },
  warmAt(sim, e) {
    const k = e.size, a = sim.time * .8 + e.spotI * 2.1, f = e.facing;
    const lx = 2.6 + Math.cos(a) * 1.5, ly = Math.sin(a) * 6, lz = 22 + (e.spotI % 3) * 5;
    return [e.x + (lx * Math.cos(f) - ly * Math.sin(f)) * k, e.y + (lx * Math.sin(f) + ly * Math.cos(f)) * k, e.z + lz * k];
  },
  onHit(sim, e, warm) {
    if (!warm) return true;
    e.spotsLeft--; e.spotI++; e.size *= .82; e.hp = Math.max(e.hp, 1);
    sim.emit('crit', { enemy: e, at: sim.warmPos(e) }); sim.splash('THAW.', { crit: true });
    sim.curResults().crits++;
    if (e.spotsLeft <= 0) { e.hp = 0; sim.kill(e, true); }
    return false;
  } });
S7.enemy('dancer', { name: 'Dancing Giggler', hp: 22, speed: [40, 50], contact: 16, red: [6, 10], rime: 1, ai: 'dancer', laugh: 'giggle' });
S7.enemy('crawler', { name: 'Cable Crawler', hp: 20, speed: [26, 34], contact: 20, red: [8, 12], rime: 1, ai: 'crawler', warm: 'chest' });
S7.enemy('climber', { name: 'Window climber', hp: 24, speed: [0, 0], contact: 18, red: [8, 12], rime: 1, ai: 'idle', warm: 'head',
  init(sim, e) { e.fixed = true; e.climbT = 6; } });
