/* BOT: plays by the game's real rules through commands. Used by tests, the attract mode and Dev auto-play. Pure sim (no view). */
B.WALK = {
  f1: [['useAt', 5, 10, 0], ['clear', 7, 11, 13, 11], ['clear', 14, 9, 18, 12], ['takeAll', 14, 9, 18, 12], ['grab', 4, 11], ['useAt', 3, 10, 0], ['put', 3, 8, 0], ['go', 3, 4], ['clear', 1, 1, 8, 4], ['takeAll', 1, 1, 8, 4], ['useAt', 8, 2, 1], ['clear', 10, 1, 18, 5], ['useAt', 18, 3, 1], ['stow'], ['go', 18, 1]],
  f2: [['take', 3, 12], ['take', 2, 11], ['useAt', 4, 11, 1], ['clear', 6, 9, 12, 12], ['takeAll', 6, 9, 12, 12], ['useAt', 12, 11, 1], ['useAt', 16, 11, 2], ['go', 18, 10], ['readScroll', 'scrfeather'], ['go', 18, 5], ['clear', 13, 2, 18, 4], ['takeAll', 13, 2, 18, 4],
    ['readScroll', 'scrfeather'], ['go', 18, 10], ['go', 12, 11], ['useAt', 8, 9, 0], ['clear', 6, 5, 10, 7], ['takeAll', 6, 5, 10, 8], ['insert', 9, 9, 0, 'gear1', 4], ['useAt', 3, 6, 0], ['stow'], ['go', 18, 10], ['readScroll', 'scrfeather'], ['go', 18, 5], ['zapWand', 13, 3, 3], ['go', 9, 2]],
  f3: [['clear', 7, 9, 12, 12], ['go', 13, 11], ['clear', 13, 10, 18, 11], ['go', 18, 5], ['clear', 13, 2, 18, 4], ['useAt', 16, 2, 0], ['useAt', 14, 2, 0], ['useAt', 18, 2, 0], ['go', 11, 3], ['clear', 6, 3, 11, 5], ['takeAll', 6, 3, 11, 5], ['insertWards', 8, 3, 0], ['go', 8, 1]],
  f4: [['rest'], ['useAt', 1, 5, 3], ['useAt', 11, 5, 1], ['useAt', 4, 2, 0], ['boss'], ['go', 6, 1]]
};
B.Bot = (() => {
  const bot = { active: false, gi: 0, goal: null, wait: 0, cheats: false, log: [], resting: false, stuck: 0, lastCell: null, lastCellT: 0, fights: 0, report: { fights: [], rests: 0, floors: {} } };
  const S = () => B.S, P = () => B.S.party;
  const dirTo = (x0, y0, x1, y1) => x1 > x0 ? 1 : x1 < x0 ? 3 : y1 > y0 ? 2 : 0;
  const turnToward = (d) => { const p = P(); const diff = (d - p.dir + 4) % 4; if (diff === 0) return true; B.cmdTurn(diff === 3 ? -1 : 1); return false; };
  /** BFS path of cells from the party to (tx,ty); passable per what the party can do (open doors by using them) */
  bot.path = (tx, ty, allowMon, allowTrap) => {
    const p = P(), F = B.F(), key = B.key, start = key(p.cx, p.cy), prev = { [start]: null }, q = [[p.cx, p.cy]];
    const ok = (x, y) => { const c = B.cell(x, y); if (c === '#') return false; if (c === '+') return true; if (c === 'L') return !!(F.doors[key(x, y)].open || bot.keyFor(x, y)); if (c === 'M') return !!F.doors[key(x, y)].open; if (c === '=') return B.gateOpen(x, y); if ((c === 'O' || c === 'o') && p.floating < 6) return false; if (c === '^' && !(B.def().tele[key(x, y)] && !F.teles[B.def().tele[key(x, y)].id])) return false; if ((c === 'S' || c === 'T' && !F.disarmed[key(x, y)]) && !allowTrap) return (x === tx && y === ty); if (B.npcAt(x, y)) return false; if (!allowMon && B.monsAt(x, y).length && !(x === tx && y === ty)) return false; return true; };
    while (q.length) { const [x, y] = q.shift(); if (x === tx && y === ty) { const out = []; let c = key(x, y); while (c) { out.push(c.split(',').map(Number)); const pc = prev[c]; c = pc ? key(pc[0], pc[1]) : null; } return out.reverse(); } for (let d = 0; d < 4; d++) { const nx = x + B.DX[d], ny = y + B.DY[d], k = key(nx, ny); if (k in prev || !ok(nx, ny)) continue; prev[k] = [x, y]; q.push([nx, ny]); } }
    return allowTrap ? null : bot.path(tx, ty, allowMon, true);
  };
  bot.keyFor = (x, y) => { const lk = B.def().locks[B.key(x, y)]; return lk && B.keyHolder(lk.key); };
  /** one move toward a cell; returns 'there' | 'moved' | 'blocked' */
  bot.goStep = (tx, ty) => {
    const p = P(); if (p.cx === tx && p.cy === ty) return 'there'; if (p.tween) return 'moved';
    let path = bot.path(tx, ty, false); if (!path || path.length < 2) path = bot.path(tx, ty, true); if (!path || path.length < 2) return 'blocked';
    const [nx, ny] = path[1], d = dirTo(p.cx, p.cy, nx, ny); if (!turnToward(d)) return 'moved';
    const c = B.cell(nx, ny), F = B.F(), ds = F.doors[B.key(nx, ny)];
    if ((c === '+' || c === 'L' || c === 'M') && !ds.open) { B.cmdUse(); return 'moved'; }
    if (B.monsAt(nx, ny).length) { B.cmdStrike(); return 'moved'; } B.cmdMove('f'); return 'moved';
  };
  bot.awake = () => B.F().mons.filter(m => m.hp > 0 && (m.aware || m.state === 'hunt' || m.state === 'wind') && m.state !== 'asleep' && (Math.abs(m.cx - P().cx) + Math.abs(m.cy - P().cy) === 1 || bot.path(m.cx, m.cy, true)));
  /** a direction faced where using the Hand just stows it: no door, feature, NPC or item in front */
bot.stowFacing = () => { const p = P(), F = B.F(); const bad = d => { const x = p.cx + B.DX[d], y = p.cy + B.DY[d], c = B.cell(x, y); return '+LM'.includes(c) || B.featureAt(p.cx, p.cy, d) && B.featureAt(p.cx, p.cy, d).k !== 'torch' || B.npcAt(x, y) || (F.items[B.key(x, y)] || []).length; }; return !bad(p.dir); };
bot.pickFacing = () => { const p = P(), x = p.cx + B.DX[p.dir], y = p.cy + B.DY[p.dir], c = B.cell(x, y); return !('+LM'.includes(c) || (B.featureAt(p.cx, p.cy, p.dir) && B.featureAt(p.cx, p.cy, p.dir).k !== 'torch') || B.npcAt(x, y)); };
bot.healIfNeeded = () => {
    const p = P(), hurt = p.members.map((m, i) => i).filter(i => p.members[i].state !== 'dead' && (p.members[i].state === 'down' || p.members[i].hp < p.members[i].max * .55)).sort((a, b) => p.members[a].hp / p.members[a].max - p.members[b].hp / p.members[b].max)[0];
    if (hurt == null) return false;
    for (let i = 0; i < p.members.length; i++) { const c = p.members[i]; if (c.state === 'ok' && B.casterGear(c) && B.spellLeft(c, 'mend') > 0 && c.cool.main <= 0 && c.cool.off <= 0) { if (B.cmdCast(i, 'mend', hurt)) return true; } }
    for (let i = 0; i < p.members.length; i++) { const m = p.members[i]; for (let j = 0; j < 12; j++) if (m.pack[j] && B.ITEMS[m.pack[j].id].heal && p.members[hurt].hp < p.members[hurt].max * .5) { return B.useLoc({ k: 'pack', m: i, i: j }) || (B.setLoc({ k: 'pack', m: i, i: j }, m.pack[j]), false); } }
    return false;
  };
  bot.dodgeBoss = () => {
  const p = P(), b = S().boss, a = b.atk; if (!a || a.t < .25) return false;
  const safe = (x, y) => { if (a.kind === 'rain') return !a.cells.some(c => c[0] === x && c[1] === y); if (a.kind === 'chain') return x !== b.cx && y !== b.cy; if (a.kind === 'slam') return Math.abs(x - b.cx) + Math.abs(y - b.cy) !== 1; if (a.kind === 'gaze') return !B.los(b.cx, b.cy, x, y); return true; };
  if (safe(p.cx, p.cy)) return a.kind !== 'gaze' || true && false;
  const c = [0, 1, 2, 3].map(d => [p.cx + B.DX[d], p.cy + B.DY[d], d]).filter(q => B.walkable(q[0], q[1]) && !B.bossBlocks(q[0], q[1]) && !B.monsAt(q[0], q[1]).length && safe(q[0], q[1]))[0];
  if (!c) return false; const rel = ['f', 'r', 'b', 'l'][(c[2] - p.dir + 4) % 4]; B.cmdMove(rel); return true;
};
bot.fight = () => {
    const p = P(), S0 = S(); const aw = bot.awake(); const boss = S0.boss && S0.floor === 'f4' && S0.boss.awake && !S0.boss.dead && S0.boss.opened;
    if (!aw.length && !boss) return false; if (bot.healIfNeeded()) return true;
    if (p.tween) return true;
    const near = aw.filter(m => Math.abs(m.cx - p.cx) + Math.abs(m.cy - p.cy) === 1).sort((a, b) => a.hp - b.hp)[0];
    if (near) { const d = dirTo(p.cx, p.cy, near.cx, near.cy); if (!turnToward(d)) return true; B.cmdStrike(); return true; }
    if (boss && Math.abs(S0.boss.cx - p.cx) + Math.abs(S0.boss.cy - p.cy) === 1) { const d = dirTo(p.cx, p.cy, S0.boss.cx, S0.boss.cy); if (!turnToward(d)) return true; B.cmdStrike(); return true; }
    // ranged help
    for (let i = 0; i < p.members.length; i++) { const m = p.members[i]; if (m.cls === 'mage' && m.state === 'ok' && B.casterGear(m) && m.cool.main <= 0 && m.cool.off <= 0) { const dx = B.DX[p.dir], dy = B.DY[p.dir]; for (let k = 1; k <= 6; k++) { const x = p.cx + dx * k, y = p.cy + dy * k; if (B.opaque(x, y)) break; if (B.monsAt(x, y).length && B.spellLeft(m, 'spark') > 0) { B.cmdCast(i, 'spark'); return true; } } } }
    // missile users strike when a monster is in line
    for (let k = 1; k <= 5; k++) { const x = p.cx + B.DX[p.dir] * k, y = p.cy + B.DY[p.dir] * k; if (B.opaque(x, y)) break; if (B.monsAt(x, y).length && k > 1) { B.cmdStrike(); break; } }
    // approach the nearest awake enemy (ranged ones especially); wait for melee ones to come
    const tgt = aw.slice().sort((a, b) => (Math.abs(a.cx - p.cx) + Math.abs(a.cy - p.cy)) - (Math.abs(b.cx - p.cx) + Math.abs(b.cy - p.cy)))[0];
    if (boss) { const b = S0.boss; if (!(p.cx === 6 && p.cy === 5)) { return bot.goStep(6, 5) !== 'blocked'; } turnToward(0); return true; }
    if (tgt) { const caster = B.MONS[tgt.type].mind === 'caster'; const dist = Math.abs(tgt.cx - p.cx) + Math.abs(tgt.cy - p.cy); if (caster || dist > 3 || bot.waitFight > 3) { const adj = [[0, -1], [1, 0], [0, 1], [-1, 0]].map(d => [tgt.cx + d[0], tgt.cy + d[1]]).filter(c => B.walkable(c[0], c[1]) && !B.monsAt(c[0], c[1]).length).sort((a, b) => Math.abs(a[0] - p.cx) + Math.abs(a[1] - p.cy) - Math.abs(b[0] - p.cx) - Math.abs(b[1] - p.cy))[0]; if (adj) { bot.waitFight = 0; bot.goStep(adj[0], adj[1]); return true; } } bot.waitFight = (bot.waitFight || 0) + .02; return true; }
    return false;
  };
  bot.needRest = () => { const p = P(); const live = p.members.filter(m => m.state !== 'dead'); return live.some(m => m.state === 'down') || live.reduce((a, m) => a + m.hp / m.max, 0) / live.length < .7 || p.members.some(m => m.food < 20) && false; };
  bot.item = (id) => { const p = P(); for (let i = 0; i < p.members.length; i++) for (let j = 0; j < 12; j++) if (p.members[i].pack[j] && p.members[i].pack[j].id === id) return { k: 'pack', m: i, i: j }; return null; };
  bot.eatIfHungry = () => { const p = P(); for (let i = 0; i < p.members.length; i++) { const m = p.members[i]; if (m.state !== 'dead' && m.food < 30) { const l = bot.item('ration') || bot.item('ironration'); if (l) { const fi = B.getLoc(l); const was = m.food; B.S.party.selected = i; const old = l.m; /* eat by the member who is hungry */ const loc = { k: 'pack', m: l.m, i: l.i }; const ref = B.getLoc(loc); const it = B.ITEMS[ref.id]; m.food = Math.min(100, m.food + it.food); B.setLoc(loc, null); } } } };
  bot.runGoal = (g) => {
    const p = P(), F = B.F(); const op = g[0];
    const at = (x, y) => p.cx === x && p.cy === y;
    if (op === 'go') { const r = bot.goStep(g[1], g[2]); return r === 'there' ? true : r === 'blocked' ? (++bot.stuck > 200 ? true : false) : false; }
    if (op === 'face') return turnToward(g[1]);
    if (op === 'useAt' || op === 'put' || op === 'zapWand' || op === 'insert' || op === 'insertWards') {
      const x = g[1], y = g[2], d = g[3]; if (!at(x, y)) { const r = bot.goStep(x, y); if (r === 'blocked' && ++bot.stuck > 200) return true; return false; } if (p.tween) return false; if (!turnToward(d)) return false;
      if (op === 'useAt') { if (g.step == null) { g.step = 1; B.cmdUse(); g.wait = .45; return false; } if (g.wait > 0) { g.wait -= .01; return false; } return true; }
      if (op === 'put') { B.cmdPutDown(); return true; }
      if (op === 'zapWand') { const loc = bot.item('wand'); if (!loc) return true; B.zapWand(p.members[loc.m], B.getLoc(loc)); return true; }
      if (op === 'insert') { g.n = g.n == null ? g[5] : g.n; if (g.n <= 0) return true; if (!p.hand) { const l = bot.item(g[4]); if (!l) return true; B.invClick(l); } else if (B.cmdUse()) { g.n--; } return false; }
      if (op === 'insertWards') { if (!p.hand) { const l = bot.item('ward1') || bot.item('ward2') || bot.item('ward3'); if (!l) return true; B.invClick(l); } else B.cmdUse(); return false; }
    }
    if (op === 'grab' || op === 'take' || op === 'takeAll') {
      if (op === 'takeAll') { const cells = []; for (let y = g[2]; y <= g[4]; y++) for (let x = g[1]; x <= g[3]; x++) if ((F.items[B.key(x, y)] || []).length) cells.push([x, y]); if (p.hand) { if (p.tween) return false; if (bot.stowFacing()) B.cmdUse(); else B.cmdTurn(1); return false; } if (!cells.length) return true; const c = cells.sort((a, b) => Math.abs(a[0] - p.cx) + Math.abs(a[1] - p.cy) - Math.abs(b[0] - p.cx) - Math.abs(b[1] - p.cy))[0]; if (!at(c[0], c[1])) { const r = bot.goStep(c[0], c[1]); if (r === 'blocked') { F.items[B.key(c[0], c[1])] = []; } return false; } if (!p.tween) { if (bot.pickFacing()) B.cmdUse(); else B.cmdTurn(1); } return false; }
      const x = g[1], y = g[2]; if (!(F.items[B.key(x, y)] || []).length) { if (p.hand && op === 'take') { if (!p.tween) { if (bot.stowFacing()) B.cmdUse(); else B.cmdTurn(1); } return false; } return true; } if (!at(x, y)) { bot.goStep(x, y); return false; } if (!p.tween) { if (!p.hand) { if (bot.pickFacing()) B.cmdUse(); else B.cmdTurn(1); } else if (op === 'take') { if (bot.stowFacing()) B.cmdUse(); else B.cmdTurn(1); } } return op === 'grab' ? !!p.hand : false;
    }
    if (op === 'stow') { if (!p.hand) return true; if (!p.tween) { if (!bot.stowFacing()) B.cmdTurn(1); else B.cmdUse(); } return false; }
    if (op === 'readScroll') { const l = bot.item(g[1]); if (!l) return true; const mi = P().members.findIndex(m => m.cls === 'mage' && m.state === 'ok'); if (mi < 0) return true; const ref = B.getLoc(l); B.setLoc(l, null); const loc = { k: 'pack', m: mi, i: P().members[mi].pack.indexOf(null) }; B.setLoc(loc, ref); B.useLoc(loc); return true; }
    if (op === 'clear') { const [x0, y0, x1, y1] = [g[1], g[2], g[3], g[4]]; const ms = F.mons.filter(m => m.hp > 0 && m.cx >= x0 && m.cx <= x1 && m.cy >= y0 && m.cy <= y1); if (!ms.length) return true; const t = ms.sort((a, b) => Math.abs(a.cx - p.cx) + Math.abs(a.cy - p.cy) - Math.abs(b.cx - p.cx) - Math.abs(b.cy - p.cy))[0]; const dist = Math.abs(t.cx - p.cx) + Math.abs(t.cy - p.cy); if (dist === 1) { const d = dirTo(p.cx, p.cy, t.cx, t.cy); if (turnToward(d)) { if (t.state === 'asleep') B.cmdStrike(); else B.cmdStrike(); } return false; } const adj = [[0, -1], [1, 0], [0, 1], [-1, 0]].map(d => [t.cx + d[0], t.cy + d[1]]).filter(c => B.walkable(c[0], c[1]) && !B.monsAt(c[0], c[1]).length && bot.path(c[0], c[1], false)).sort((a, b) => Math.abs(a[0] - p.cx) + Math.abs(a[1] - p.cy) - Math.abs(b[0] - p.cx) - Math.abs(b[1] - p.cy))[0]; if (adj) bot.goStep(adj[0], adj[1]); else if (++bot.stuck > 400) return true; return false; }
    if (op === 'rest') { const live = p.members.filter(m => m.state !== 'dead'); const ready = live.every(m => m.state === 'ok' && m.hp >= m.max * .95); if (ready || B.enemiesNear()) return true; if (!S().camp && !p.tween) { if (B.cmdCamp('open')) { B.cmdCamp('rest'); bot.resting = true; } else return true; } return false; }
    if (op === 'boss') { const b = S().boss; if (!b || b.dead) return true; if (!(p.cx === 6 && p.cy === 5)) { bot.goStep(6, 5); return false; } if (turnToward(0)) { B.cmdStrike(); } return false; }
    return true;
  };
  bot.buildPlan = () => { const f = S().floor; bot.goals = (B.WALK[f] || []).map(g => g.slice()); bot.gi = 0; };
  bot.start = (o) => { o = o || {}; bot.active = true; bot.cheats = !!o.cheats; if (bot.cheats) { B.CHEATS.god = true; B.CHEATS.nohunger = true; B.CHEATS.spells = true; B.CHEATS.nocool = false; } bot.buildPlan(); bot.floor = S().floor; bot.stuck = 0; bot.maxSeconds = o.maxSeconds || 1e9; bot.t0 = S().time; bot.onFloorEnd = o.onFloorEnd; };
  bot.stop = () => { bot.active = false; };
  /** call once per fixed step before B.update */
  bot.step = (dt) => {
    if (!bot.active) return; const St = S(); if (St.over || St.ended) { bot.active = false; return; }
    if (bot.floor !== St.floor) { bot.floor = St.floor; if (B.WALK[St.floor]) bot.buildPlan(); bot.stuck = 0; }
    bot.t = (bot.t || 0) + dt; if (bot.t < .02) return; bot.t = 0;   // act at 50 Hz
    const p = P();
    if (St.camp) { if (!St.camp.rest) { if (bot.resting) { B.cmdCamp('close'); bot.resting = false; } else B.cmdCamp('rest'); } else bot.resting = true; return; }
    if (p.tween) return;
    bot.eatIfHungry();
    if (bot.fight()) return;
    if (bot.needRest() && !B.enemiesNear()) { if (B.cmdCamp('open')) { B.cmdCamp('rest'); bot.resting = true; bot.report.rests++; return; } }
    if (bot.gi >= (bot.goals || []).length) { bot.active = false; return; }
    const g = bot.goals[bot.gi]; if (bot.runGoal(g)) { if (bot.stuck > 200) bot.log.push('GAVE UP ' + g.slice(0, 5).join(':')); bot.gi++; bot.stuck = 0; }
    // stuck watchdog
    const key = p.cx + ',' + p.cy + ',' + p.dir + ',' + bot.gi; if (key === bot.lastKey) { bot.same = (bot.same || 0) + 1; if (bot.same > 3000) { bot.log.push('SKIP ' + bot.goals[bot.gi].slice(0, 5).join(':') + ' at ' + p.cx + ',' + p.cy + ' t=' + St.time.toFixed(0)); bot.gi++; bot.same = 0; bot.report.skipped = (bot.report.skipped || 0) + 1; } } else { bot.same = 0; bot.lastKey = key; }
  };
  return bot;
})();
