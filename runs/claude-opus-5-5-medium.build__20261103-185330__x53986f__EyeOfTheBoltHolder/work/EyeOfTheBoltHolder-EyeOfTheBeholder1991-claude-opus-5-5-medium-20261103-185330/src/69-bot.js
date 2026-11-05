/* BOT: the walkthrough runner. It plays by the game's own rules through the same commands a player sends: it paths
 * (opening doors, avoiding pits, trapdoors, the spinner and live teleporters), faces and uses features, fights (turning
 * to foes, Party Strike, Spark Dart down lines, Mend and potions), rests and eats when it should, loots, equips what is
 * better, answers stories. The tests' full playthrough, Dev Mode's auto-play and the attract mode all use it. */
B.WALK = {
  f1: [['grabAt', 2, 13], ['grabAt', 2, 12], ['use', 2, 11, 'E'], ['go', 2, 8], ['clear'], ['rest'], ['use', 1, 6, 'W'], ['grabAt', 3, 8], ['grabAt', 1, 5], ['rest'], ['go', 2, 4], ['openDoor', 2, 4, 'N'], ['go', 2, 2], ['clear'],
    ['grabAt', 1, 1], ['grabAt', 3, 2], ['grabAt', 5, 1], ['use', 5, 2, 'E'], ['clear'], ['rest'], ['go', 9, 7], ['clear'], ['use', 9, 5, 'N'], ['wait', 1.4], ['grabAt', 8, 3], ['grabAt', 10, 7],
    ['go', 13, 6, 'E'], ['hold', 'rock'], ['put'], ['wait', 1.4], ['rest4'], ['go', 17, 4], ['use', 17, 4, 'N'], ['wait', .8], ['go', 17, 2], ['clear'], ['loot', 9], ['grabAt', 20, 1], ['grabAt', 20, 2], ['grabAt', 13, 1], ['grabAt', 13, 2], ['rest'],
    ['use', 10, 8, 'S'], ['go', 9, 10], ['clear'], ['grabAt', 9, 11], ['grabAt', 10, 12], ['loot', 3], ['go', 4, 5, 'N'], ['hold', 'ratKingsCrown'], ['use', 4, 5, 'N'], ['use', 4, 5, 'N'], ['stow'], ['rest'],
    ['go', 12, 10], ['clear'], ['rest'], ['use', 13, 10, 'N'], ['use', 18, 10, 'S'], ['wait', 1.2], ['retry', 'G4', 4, 4], ['grabAt', 19, 10], ['rest'], ['go', 19, 12], ['clear'], ['grabAt', 20, 12], ['grabAt', 14, 12], ['loot', 4], ['rest'], ['use', 15, 13, 'S'], ['wait', .8], ['go', 15, 15]],
  f2: [['rest4'], ['go', 7, 1], ['clear'], ['grabAt', 9, 1], ['grabAt', 12, 3], ['grabAt', 11, 3], ['grabAt', 8, 1], ['grabAt', 10, 3], ['grabAt', 8, 2], ['use', 8, 3, 'S'], ['rest'],
    ['use', 12, 2, 'E'], ['wait', .8], ['go', 16, 2], ['clear'], ['rest'], ['grabAt', 16, 4], ['grabAt', 20, 3], ['loot', 4], ['go', 19, 5], ['clear'], ['use', 19, 6, 'W'], ['stow'], ['use', 19, 8, 'E'], ['clear'],
    ['rest'], ['go', 19, 13], ['clear'], ['go', 20, 14], ['grabAt', 20, 15], ['go', 17, 13], ['grabAt', 17, 15], ['go', 17, 14], ['openDoor', 17, 14, 'W'], ['go', 14, 14], ['clear'], ['rest'],
    ['grabAt', 13, 15], ['grabAt', 9, 15], ['grabAt', 13, 13], ['use', 10, 15, 'S'], ['use', 12, 15, 'S'], ['wait', 1.5], ['retry', 'G5', 4, 3], ['go', 11, 12], ['go', 11, 13], ['stow'], ['rest'],
    ['go', 17, 14], ['go', 17, 13], ['go', 19, 12], ['go', 19, 5], ['go', 16, 1], ['hold', 'tumblerGear'], ['use', 16, 1, 'N'], ['go', 17, 1], ['hold', 'tumblerGear'], ['use', 17, 1, 'N'],
    ['go', 19, 1], ['hold', 'tumblerGear'], ['use', 19, 1, 'N'], ['go', 20, 1], ['hold', 'tumblerGear'], ['use', 20, 1, 'N'], ['wait', .5], ['use', 18, 1, 'N'], ['stow'],
    ['go', 19, 12], ['go', 19, 13], ['go', 17, 13], ['go', 17, 14], ['rest'], ['go', 6, 14], ['go', 4, 14], ['clear'], ['grabAt', 5, 14], ['go', 4, 12, 'N'], ['hold', 'rock'], ['throw'], ['wait', 2.5],
    ['go', 3, 9], ['grabAt', 3, 9], ['use', 3, 9, 'N'], ['go', 2, 9, 'W'], ['hold', 'bentKey'], ['use', 2, 9, 'W'], ['stow'], ['wait', 1.2], ['go', 2, 7], ['clear'], ['grabAt', 1, 7], ['grabAt', 5, 7], ['grabAt', 1, 4], ['rest'],
    ['go', 4, 6, 'N'], ['hold', 'ironIngot'], ['put'], ['go', 2, 5], ['wait', 1.5], ['go', 8, 5], ['use', 8, 5, 'N'], ['go', 9, 6, 'E'], ['zap', 'wandUnlatching'], ['wait', 1], ['rest4'], ['go', 10, 6], ['clear'], ['rest'],
    ['grabAt', 12, 8], ['grabAt', 11, 5], ['grabAt', 13, 5], ['grabAt', 14, 5], ['loot', 4], ['use', 14, 6, 'E'], ['stow'], ['go', 13, 8], ['go', 14, 8]],
  f3: [['go', 1, 4], ['clear'], ['grabAt', 1, 8], ['grabAt', 5, 4], ['grabAt', 2, 5], ['grabAt', 4, 8], ['grabAt', 3, 4], ['rest'],
    ['rest4'], ['go', 8, 8], ['clear'], ['rest'], ['go', 13, 8], ['clear'], ['go', 17, 8], ['clear'], ['grabAt', 13, 7], ['grabAt', 17, 7], ['rest4'], ['use', 19, 7, 'N'], ['wait', .8], ['go', 19, 5], ['clear'], ['loot', 5], ['rest'],
    ['grabAt', 21, 5], ['grabAt', 15, 1], ['use', 16, 1, 'N'], ['use', 16, 5, 'S'], ['use', 18, 1, 'N'], ['use', 18, 5, 'S'], ['use', 20, 1, 'N'], ['use', 20, 5, 'S'], ['wait', .5], ['grabAt', 18, 3],
    ['go', 13, 3], ['clear'], ['grabAt', 13, 1], ['use', 11, 4, 'S'], ['go', 12, 4, 'S'], ['hold', 'copperWard'], ['use', 12, 4, 'S'], ['hold', 'brassWard'], ['use', 12, 4, 'S'], ['rest'],
    ['go', 11, 8], ['rest'], ['go', 11, 9], ['clear'], ['grabAt', 9, 11], ['grabAt', 13, 10], ['rest'], ['use', 13, 11, 'E'], ['wait', 2], ['branch', 'veil']],
  f3help: [['go', 13, 13], ['wait', 1.5], ['rest'], ['go', 15, 13], ['clear'], ['go', 20, 13], ['clear'], ['use', 22, 14, 'E'], ['stow'], ['grabAt', 20, 14], ['grabAt', 22, 13], ['grabAt', 21, 14], ['rest']],
  f3refuse: [['rest'], ['go', 19, 9], ['clear'], ['go', 19, 10], ['clear'], ['loot', 4], ['rest'], ['grabAt', 22, 11], ['grabAt', 16, 10], ['grabAt', 20, 10], ['use', 22, 10, 'N'], ['wait', 1.2], ['go', 21, 13], ['clear'], ['use', 22, 14, 'E'], ['stow'], ['grabAt', 20, 14], ['grabAt', 22, 13], ['grabAt', 21, 14], ['rest']],
  f3end: [['rest4'], ['go', 12, 4, 'S'], ['hold', 'ironWard'], ['use', 12, 4, 'S'], ['wait', 5], ['go', 12, 5], ['go', 12, 6]],
  f4: [['go', 6, 10], ['clear'], ['use', 4, 8, 'W'], ['clear'], ['rest4'], ['go', 6, 7], ['clear'], ['loot', 3], ['wait', 1.5], ['rest4'], ['go', 6, 5], ['wait', 1], ['boss'], ['wait', 2], ['use', 6, 1, 'N']]
};
B.Bot = {
  active: false, plan: [], i: 0, t: 0, cool: 0, opts: {}, stuck: null, log: [], restState: null, lastFloor: null, fights: [],
  start(o = {}) { this.active = true; this.opts = o; this.i = 0; this.t = 0; this.cool = 0; this.plan = o.plan || this.planFor(B.S.floor); this.stuck = null; this.restState = null; this.lastFloor = B.S.floor; this.done = false; this.log = []; this.lastRest = -99; this.arrT = -9; this.nMembers = 0; this.tries = {}; this.waitT = 0; this.sub = 0; this.arrangeLater = false; },
  stop() { this.active = false; },
  planFor(fid) { return (B.WALK[fid] || []).slice(); },
  say(s) { this.log.push(B.S.floor + ' ' + s); if (this.log.length > 400) this.log.shift(); },
  /** the commands for this step */
  step(dt) {
    if (!this.active || !B.S) return [];
    const S = B.S, P = S.party;
    if (S.over) { this.say('wiped'); this.active = false; return []; }
    if (S.talk) return this.answer();
    if (S.floor !== this.lastFloor) {   // a new floor: its walkthrough (the stairs or a fall)
      this.lastFloor = S.floor;
      if (this.opts.floorOnly) { this.active = false; this.done = true; return []; }
      if (!this.opts.plan) { this.plan = this.planFor(S.floor); this.i = 0; this.t = 0; }
    }
    if (S.camp) return this.campStep(dt);
    const frontDown = P.formation.slice(0, 2).some(i => P.members[i] && P.members[i].state !== 'ok') && P.formation.slice(2).some(i => P.members[i] && P.members[i].state === 'ok' && P.members[i].cls !== 'M');
    if (frontDown && S.time - (this.arrT || -9) > 1) { this.arrT = S.time; this.arrange(); }
    if (this.arrangeLater || P.members.length !== this.nMembers) { this.arrangeLater = false; this.nMembers = P.members.length; this.arrange(); }
    this.cool -= dt; this.t += dt;
    if (P.tween || P.lock > 0 || this.cool > 0) return [];
    // fighting comes first, then healing, then the plan
    const f = this.fight(); if (f) { this.cool = .02; return f; }
    const h = this.heal(false); if (h) { this.cool = .2; return h; }
    // an emergency: badly hurt with no one near, rest before going on (if the floor allows it)
    const live = P.members.filter(m => m.state === 'ok'), avg = live.reduce((n, m) => n + m.hp / m.max, 0) / Math.max(1, live.length);
    if ((avg < .5 || P.members.some(m => m.state === 'down') || live.some(m => B.rowOf(m) === 1 && m.hp < m.max * .5)) && !B.F().noRest && !B.enemiesNear() && S.time - (this.lastRest || -99) > 20) { this.lastRest = S.time; this.restState = { phase: 'open' }; return [{ c: 'camp', op: 'open' }]; }
    if (this.i >= this.plan.length) { this.done = true; this.active = !!this.opts.loop; return []; }
    const st = this.plan[this.i];
    if (this.t > (st[0] === 'boss' ? 600 : st[0] === 'clear' ? 240 : 90)) { this.say('stuck at ' + JSON.stringify(st)); this.stuck = this.stuck || st; this.next(); return []; }
    const out = this.doStep(st);
    if (out) this.cool = .03;
    return out || [];
  },
  next() { this.i++; this.t = 0; this.sub = 0; },
  answer() {
    const T = B.S.talk;
    if (T.stage === 'choice') { const pick = T.id === 'veil' ? (this.opts.veil === 'refuse' ? 1 : 0) : (this.opts.refuseAll ? 1 : 0); return [{ c: 'talk', op: 'choose', i: pick }]; }
    return [{ c: 'talk', op: 'next' }];
  },
  /* ---- the plan's steps ---- */
  doStep(st) {
    const S = B.S, P = S.party, [op, a, b, c] = st;
    switch (op) {
      case 'go': { if (P.cx === a && P.cy === b) { if (c && P.dir !== FACE[c]) return this.faceTo(FACE[c]); this.next(); return null; } return this.moveToward(a, b); }
      case 'use': { if (P.cx !== a || P.cy !== b) return this.moveToward(a, b); if (P.dir !== FACE[c]) return this.faceTo(FACE[c]); this.next(); return [{ c: 'use' }]; }
      case 'openDoor': { if (P.cx !== a || P.cy !== b) return this.moveToward(a, b); if (P.dir !== FACE[c]) return this.faceTo(FACE[c]); const [fx, fy] = B.front(), d = B.doorIn(S.floor, fx, fy); if (!d || d[1].want) { this.next(); return null; } return [{ c: 'use' }]; }
      case 'grabAt': {
        if (P.hand) return [{ c: 'stow' }];
        if (!B.itemsAt(a, b).length) { this.next(); this.equip(); return null; }
        if (P.cx !== a || P.cy !== b) return this.moveToward(a, b);
        return [{ c: 'pick', here: true }];
      }
      case 'loot': {
        if (P.hand) return [{ c: 'stow' }];
        const cells = Object.entries(B.FS().items).filter(([k, l]) => l.some(it => !['rock', 'bone', 'ironIngot', 'slingStones'].includes(it.id))).map(([k]) => k.split(',').map(Number)).filter(([x, y]) => B.manh(x, y, P.cx, P.cy) <= a && this.path(x, y));
        if (!cells.length) { this.next(); this.equip(); return null; }
        const [x, y] = cells.sort((p, q) => B.manh(p[0], p[1], P.cx, P.cy) - B.manh(q[0], q[1], P.cx, P.cy))[0];
        if (P.cx !== x || P.cy !== y) return this.moveToward(x, y);
        const list = B.itemsAt(x, y), top = list[list.length - 1];
        if (['rock', 'bone', 'ironIngot', 'slingStones'].includes(top.id)) { B.FS().items[key(x, y)] = [top, ...list.slice(0, -1)]; return null; }
        return [{ c: 'pick', here: true }];
      }
      case 'hold': { this.next(); if (P.hand && P.hand.id === a) return null; return P.hand ? [{ c: 'stow' }, { c: 'toHand', id: a }] : [{ c: 'toHand', id: a }]; }
      case 'stow': this.next(); return P.hand ? [{ c: 'stow' }] : null;
      case 'put': this.next(); return [{ c: 'putDown' }];
      case 'throw': this.next(); return [{ c: 'throw' }];
      case 'zap': this.next(); return [{ c: 'useItem', id: a }];
      case 'wait': if (this.t >= a) this.next(); return null;
      case 'clear': { if (this.t > .6 && !this.foes(7).length) { this.next(); return null; } return this.huntNearest(); }
      case 'rest': case 'rest4': { const live = P.members.filter(m => m.state === 'ok'), avg = live.reduce((n, m) => n + m.hp / m.max, 0) / Math.max(1, live.length), spent = P.members.filter(m => m.mem.length && m.mem.every(e => !e.ready)).length; const need = P.members.some(m => m.state === 'down') || avg < (op === 'rest4' ? .9 : .72) || live.some(m => m.hp < m.max * (op === 'rest4' ? .7 : .45)) || spent >= 1 || P.members.some(m => m.state === 'ok' && m.food < 30); if (!need || this.sub > 3 || B.F().noRest) { this.next(); return null; } this.sub = (this.sub || 0) + 1; this.restState = { phase: 'open' }; return [{ c: 'camp', op: 'open' }]; }
      case 'branch': { const more = B.WALK[this.opts.veil === 'refuse' ? 'f3refuse' : 'f3help'].concat(B.WALK.f3end); this.plan = this.plan.slice(0, this.i + 1).concat(more); this.next(); return null; }
      case 'boss': return this.bossStep();
      case 'retry': { const d = B.FS().doors[a]; this.tries = this.tries || {}; const k = this.i; if (d && d.want) { this.next(); return null; } this.tries[k] = (this.tries[k] || 0) + 1; if (this.tries[k] > c) { this.next(); return null; } this.say('retry ' + a); this.i -= b; this.t = 0; return null; }
      default: this.next(); return null;
    }
  },
  campStep(dt) {
    const S = B.S, R = this.restState;
    if (!R) return [{ c: 'camp', op: 'close' }];
    if (R.phase === 'open') { R.phase = 'eat'; this.memorize(); return [{ c: 'camp', op: 'eat' }]; }
    if (R.phase === 'eat') { R.phase = 'rest'; return [{ c: 'camp', op: 'rest' }]; }
    if (R.phase === 'rest') { if (S.camp.rest) return []; R.phase = 'done'; }
    this.restState = null; return [{ c: 'camp', op: 'close' }];
  },
  /** at camp: fill every empty slot (Camp, Memorize and Pray), healing first for clerics, damage first for mages */
  memorize() {
    const P = B.S.party, PREF = { C: ['mend', 'greaterMend', 'freeHinge', 'holdFast', 'purge', 'steadyHand', 'mend'], M: ['sparkDart', 'blazingOrb', 'forkedLightning', 'frostbite', 'slumber', 'sparkDart'] };
    P.members.forEach((m, mi) => {
      const k = B.casterKind(m); if (!k) return; const known = B.knownSpells(m);
      for (let l = 1; l <= 3; l++) { const opts = PREF[k].filter(sp => known.includes(sp) && B.SPELLS[sp].lvl === l).concat(known.filter(sp => B.SPELLS[sp].lvl === l)); let n = 0; while (opts.length && m.mem.filter(e => B.SPELLS[e.s].lvl === l).length < B.slotCount(m, l) && n < 12) { B.dispatch({ c: 'memorize', m: mi, op: 'add', spell: opts[n % Math.min(opts.length, 2)] }); n++; } }
    });
  },
  /* ---- moving ---- */
  passable(x, y, tx, ty) {
    const S = B.S, fid = S.floor, c = B.ch(fid, x, y), tgt = x === tx && y === ty;
    if (B.isWall(fid, x, y)) return false;
    const d = B.doorIn(fid, x, y); if (d && d[1].open < .85 && !(d[1].kind === 'door' || (d[1].kind === 'locked' && !d[1].locked))) return false;
    const pit = B.pitIn(fid, x, y); if (pit && !pit.p.bridged && S.party.fx.float <= 0) return false;
    if (!tgt && (c === 'S' || c === '<' || c === '>')) return false;
    const tp = B.RF().tpAt[key(x, y)]; if (tp && B.FS().tps[tp].on && !tgt) return false;
    return true;
  },
  path(tx, ty, avoidMons = true) {
    if (avoidMons === true) { const p = this.path(tx, ty, 'strict'); if (p) return p; return this.path(tx, ty, false); }
    const strict = avoidMons === 'strict';
    const P = B.S.party, R = B.RF(), prev = new Map(), q = [[P.cx, P.cy]], k0 = key(P.cx, P.cy); prev.set(k0, null);
    while (q.length) {
      const [x, y] = q.shift(); if (x === tx && y === ty) break;
      for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d], k = key(nx, ny); if (prev.has(k) || nx < 0 || ny < 0 || nx >= R.w || ny >= R.h) continue; if (!this.passable(nx, ny, tx, ty)) continue; if (strict && !(nx === tx && ny === ty) && B.monsAt(nx, ny).length) continue; prev.set(k, [x, y]); q.push([nx, ny]); }
    }
    if (!prev.has(key(tx, ty))) return null;
    const out = []; let cur = [tx, ty]; while (cur) { out.unshift(cur); cur = prev.get(key(cur[0], cur[1])); } return out;
  },
  moveToward(tx, ty) {
    const S = B.S, P = S.party, path = this.path(tx, ty);
    if (!path || path.length < 2) { if (this.t > 3) { this.say('no path to ' + tx + ',' + ty); this.stuck = this.stuck || ['go', tx, ty]; this.next(); } return null; }
    const [nx, ny] = path[1], d = B.dirTo(P.cx, P.cy, nx, ny);
    const door = B.doorIn(S.floor, nx, ny);
    if (door && door[1].open < .85) { if (door[1].want) return null; if (P.dir !== d) return this.faceTo(d); return [{ c: 'use' }]; }
    if (B.monsAt(nx, ny).length) { if (P.dir !== d) return this.faceTo(d); return [{ c: 'strike' }]; }
    const rel = (d - P.dir + 4) % 4;
    if (rel === 0) return [{ c: 'move', d: 'f' }];
    if (rel === 2 && path.length > 3) return this.faceTo(d);
    return [{ c: 'move', d: ['f', 'r', 'b', 'l'][rel] }];
  },
  faceTo(d) { const P = B.S.party, rel = (d - P.dir + 4) % 4; if (!rel) return null; return [{ c: 'turn', s: rel === 3 ? -1 : 1 }]; },
  /* ---- fighting ---- */
  foes(r = 6) { const P = B.S.party; return B.FS().mons.filter(m => m.hp > 0 && (m.aware || B.manh(m.cx, m.cy, P.cx, P.cy) <= 1) && B.manh(m.cx, m.cy, P.cx, P.cy) <= r && m.type !== 'boltholder'); },
  fight() {
    const S = B.S, P = S.party, foes = this.foes(5); if (!foes.length) return null;
    const heal = this.heal(true); if (heal) return heal;
    const adj = foes.filter(m => B.manh(m.cx, m.cy, P.cx, P.cy) === 1);
    const [fx, fy] = B.front();
    if (adj.length) {
      if (!adj.some(m => m.cx === fx && m.cy === fy)) return this.faceTo(B.dirTo(P.cx, P.cy, adj[0].cx, adj[0].cy));
      const out = []; if (P.members.some(m => B.canAct(m) && m.cool.main <= 0)) out.push({ c: 'strike' });
      const sp = this.spell(['blazingOrb', 'sparkDart', 'frostbite']); if (sp && adj.length && (adj.length > 1 || adj[0].max > 15)) out.push(sp);
      if (P.members.some(m => B.canAct(m) && m.cool.off <= 0 && B.handAction(m, 'off') === 'melee' && B.colOf(m) >= 0 && B.rowOf(m) === 1)) P.members.forEach((m, i) => { if (B.canAct(m) && m.cool.off <= 0 && B.rowOf(m) === 1 && B.handAction(m, 'off') === 'melee') out.push({ c: 'hand', m: i, h: 'off' }); });
      return out.length ? out : [];
    }
    // a foe down the line: darts of light; else let it come (a short wait), then go to it
    const line = foes.find(m => B.inLineClear(P.cx, P.cy, m.cx, m.cy, 6) && B.dirTo(P.cx, P.cy, m.cx, m.cy) === P.dir);
    if (line) { const sp = this.spell(['sparkDart', 'blazingOrb']); if (sp) return [sp]; }
    const near = foes.sort((a, b) => B.manh(a.cx, a.cy, P.cx, P.cy) - B.manh(b.cx, b.cy, P.cx, P.cy))[0];
    const anyLine = foes.find(m => B.inLineClear(P.cx, P.cy, m.cx, m.cy, 6));
    if (anyLine && this.spell(['sparkDart'])) return this.faceTo(B.dirTo(P.cx, P.cy, anyLine.cx, anyLine.cy)) || [this.spell(['sparkDart'])];
    this.waitT = (this.waitT || 0) + .03;
    if (this.waitT < 1.2 && !B.MONSTERS[near.type].keepAway && !B.MONSTERS[near.type].caster) return [];
    this.waitT = 0;
    return this.approach(near);
  },
  approach(m) {
    const P = B.S.party, R = B.RF();
    const path = R.grid.path([P.cx, P.cy], [m.cx, m.cy], { blocked: (x, y) => !(x === m.cx && y === m.cy) && (!this.passable(x, y, m.cx, m.cy) || B.monsAt(x, y).length > 0), ends: true });
    if (!path || path.length < 2) return null;
    const [nx, ny] = path[1], d = B.dirTo(P.cx, P.cy, nx, ny);
    if (B.monsAt(nx, ny).length) return this.faceTo(d) || [{ c: 'strike' }];
    const door = B.doorIn(B.S.floor, nx, ny); if (door && door[1].open < .85) return this.faceTo(d) || (door[1].want ? [] : [{ c: 'use' }]);
    const rel = (d - P.dir + 4) % 4; return [{ c: 'move', d: ['f', 'r', 'b', 'l'][rel] }];
  },
  huntNearest() { const P = B.S.party, f = this.foes(7).sort((a, b) => B.manh(a.cx, a.cy, P.cx, P.cy) - B.manh(b.cx, b.cy, P.cx, P.cy))[0]; return f ? this.approach(f) || [] : []; },
  /** a ready caster's spell (the first of the list it has), as a command */
  spell(list, target) {
    const P = B.S.party;
    for (const s of list) for (let i = 0; i < P.members.length; i++) { const m = P.members[i]; if (B.canAct(m) && m.cool.main <= 0 && B.casterHands(m) && m.mem.some(e => e.s === s && e.ready)) return { c: 'cast', m: i, spell: s, target }; }
    return null;
  },
  heal(inFight) {
    const P = B.S.party;
    const hurt = P.members.map((m, i) => [m, i]).filter(([m]) => m.state === 'down' || (m.state === 'ok' && m.hp < m.max * (inFight ? .4 : .3))).sort((a, b) => a[0].hp / a[0].max - b[0].hp / b[0].max)[0];
    if (hurt) {
      const sp = this.spell(['greaterMend', 'mend'], hurt[1]); if (sp) return [sp];
      const pot = ['potionGreaterHealing', 'potionHealing'].find(id => B.countItem(id) > 0 && (hurt[0].state === 'ok' || id === 'potionGreaterHealing'));
      if (pot && (hurt[0].hp < hurt[0].max * .3 || hurt[0].state === 'down')) return [{ c: 'useItem', id: pot, m: hurt[1] }];
    }
    const poisoned = P.members.findIndex(m => m.state === 'ok' && m.status.poison > 0 && m.hp < m.max * .6);
    if (poisoned >= 0) { const sp = this.spell(['purge'], poisoned); if (sp) return [sp]; if (B.countItem('potionAntidote')) return [{ c: 'useItem', id: 'potionAntidote', m: poisoned }]; }
    if (!inFight) { const dead = P.members.findIndex(m => m.state === 'dead'); if (dead >= 0) { const sp = this.spell(['raise'], dead); if (sp) return [sp]; const cl = P.members.findIndex(m => m.state === 'ok' && (m.cls === 'C' || m.cls === 'P')); if (cl >= 0 && B.countItem('scrollRaising')) return [{ c: 'useItem', id: 'scrollRaising', m: cl }]; } }
    return null;
  },
  healBoss() { const P = B.S.party, low = P.members.map((m, i) => [m, i]).filter(([m]) => m.state === 'ok' && m.hp < m.max * .55).sort((a, b) => a[0].hp / a[0].max - b[0].hp / b[0].max)[0]; if (!low) return null; const sp = this.spell(['greaterMend', 'mend'], low[1]); if (sp) return [sp]; if (B.countItem('potionHealing')) return [{ c: 'useItem', id: 'potionHealing', m: low[1] }]; return null; },
  /** wear what is better: armour, helms, rings, amulets, boots, bracers, the Robe; sharper blades for the front */
  equip() {
    const P = B.S.party, cmds = [];
    for (const m of P.members) {
      if (m.state === 'dead') continue;
      for (const f of this.packItems()) {
        const d = B.def(f.it), slot = d.kind === 'ring' ? (!m.slots.ring1 ? 'ring1' : !m.slots.ring2 ? 'ring2' : null) : { body: 'body', head: 'head', neck: 'neck', arms: 'arms', feet: 'feet', shield: 'off' }[d.kind];
        if (!slot || B.canEquip(m, f.it, slot)) continue;
        const cur = B.def(m.slots[slot]);
        const better = !cur || (d.def || 0) > (cur.def || 0) || (d.seeing && !cur.seeing && (cur.def || 0) === 0) || (d.int && !cur.int);
        if (slot === 'off' && m.slots.off && B.def(m.slots.off).kind !== 'shield') continue;
        if (better) { B.dispatch({ c: 'equip', m: P.members.indexOf(m), uid: f.it.uid, slot }); }
      }
      if (P.members.length > 4 || true) this.arrangeLater = true;
      if (B.rowOf(m) === 1) for (const f of this.packItems()) { const d = B.def(f.it), cur = B.def(m.slots.main); if (d.kind === 'weapon' && !d.two && !d.throw && cur && cur.kind === 'weapon' && B.diceAvg(d.dmg) + (d.hit || 0) > B.diceAvg(cur.dmg) + (cur.hit || 0) + (m.slots.main.rust ? -m.slots.main.rust : 0) && !B.canEquip(m, f.it, 'main')) B.dispatch({ c: 'equip', m: P.members.indexOf(m), uid: f.it.uid, slot: 'main' }); }
    }
    return cmds;
  },
  /** the sturdiest fighters in front; back-row members with a bow or crossbow take it up */
  arrange() {
    const P = B.S.party, F = P.formation, score = i => { const m = P.members[i]; if (!m || m.state !== 'ok') return -1; return m.max * (['F', 'P'].includes(m.cls) ? 1.4 : m.cls === 'R' ? 1.1 : m.cls === 'M' ? .3 : .8); };
    const order = F.slice().sort((a, b) => score(b) - score(a));
    if (order.slice(0, 2).some(i => F.indexOf(i) > 1) || F.slice(0, 2).some(i => score(i) < 0)) { for (let k = 0; k < order.length; k++) if (F[k] !== order[k]) { const j = F.indexOf(order[k]); B.dispatch({ c: 'formation', a: k, b: j }); } }
    for (const m of P.members) {
      if (m.state !== 'ok' || B.rowOf(m) === 1) continue;
      const main = B.def(m.slots.main); if (main && (main.kind === 'missile' || main.reach || main.kind === 'book' || main.kind === 'symbol')) continue;
      if (B.casterKind(m)) continue;
      const bow = this.packItems().find(f => { const d = B.def(f.it); if (d.kind !== 'missile') return false; const ammo = (m.slots.quiver && m.slots.quiver.id === d.ammo ? m.slots.quiver.n : 0) + this.packItems().filter(g => g.it.id === d.ammo).reduce((n, g) => n + (g.it.n || 0), 0); if (ammo < 6) return false; const off = m.slots.off; if (off) delete m.slots.off; const why = B.canEquip(m, f.it, 'main'); if (off) m.slots.off = off; return !why; });
      if (!bow) continue; const d = B.def(bow.it);
      if (m.slots.off) { const off = m.slots.off; delete m.slots.off; B.giveParty(off); }
      if (B.canEquip(m, bow.it, 'main')) continue;
      B.dispatch({ c: 'equip', m: P.members.indexOf(m), uid: bow.it.uid, slot: 'main' });
      if (!m.slots.quiver || m.slots.quiver.id !== d.ammo) { const am = B.findItem(it => it.id === d.ammo); if (am && am.where === 'pack') { B.removeFound(am); if (m.slots.quiver) B.giveParty(m.slots.quiver); m.slots.quiver = am.it; } }
    }
  },
  packItems() { const out = []; for (const m of B.S.party.members) for (let i = 0; i < 12; i++) if (m.pack[i]) out.push({ m, i, it: m.pack[i] }); return out; },
  /** the boss: turn the three locks between attacks, fight the Eye, turn the relocked lock again */
  bossStep() {
    const S = B.S, P = S.party, mon = B.bossMon();
    if (!mon || mon.hp <= 0) { this.next(); return null; }
    const hl = this.heal(true) || this.healBoss(); if (hl) return hl;
    const b = mon.boss, spots = { 0: [3, 3, 'W'], 1: [9, 3, 'E'], 2: [6, 1, 'N'] };
    const lockI = b.locks.findIndex(v => !v);
    if (b.tele && b.tele.cells.some(([x, y]) => x === P.cx && y === P.cy)) {   // dodge: a step out of the marked cells or the line
      for (const rel of ['l', 'r', 'b', 'f']) { const d = B.relDir(P.dir, rel), nx = P.cx + DX[d], ny = P.cy + DY[d]; if (B.open('f4', nx, ny) && !B.monsAt(nx, ny).length && !b.tele.cells.some(([x, y]) => x === nx && y === ny) && !(nx === mon.cx && ny === mon.cy)) return [{ c: 'move', d: rel }]; }
    }
    if (lockI >= 0) { const [x, y, f] = spots[lockI]; if (P.cx !== x || P.cy !== y) return this.moveToward(x, y); if (P.dir !== FACE[f]) return this.faceTo(FACE[f]); return [{ c: 'use' }]; }
    const d = B.manh(mon.cx, mon.cy, P.cx, P.cy);
    if (d === 1) { const want = B.dirTo(P.cx, P.cy, mon.cx, mon.cy); if (P.dir !== want) return this.faceTo(want); const out = [{ c: 'strike' }]; const sp = this.spell(['blazingOrb', 'sparkDart', 'frostbite']); if (sp) out.push(sp); return out; }
    if (B.inLineClear(P.cx, P.cy, mon.cx, mon.cy, 6)) { const sp = this.spell(['blazingOrb', 'sparkDart']); if (sp) { const want = B.dirTo(P.cx, P.cy, mon.cx, mon.cy); return P.dir !== want ? this.faceTo(want) : [sp]; } }
    const adj = [0, 1, 2, 3].map(k => [mon.cx + DX[k], mon.cy + DY[k]]).filter(([x, y]) => B.open('f4', x, y) && !B.monsAt(x, y).length).sort((p, q) => B.manh(p[0], p[1], P.cx, P.cy) - B.manh(q[0], q[1], P.cx, P.cy))[0];
    return adj ? this.moveToward(adj[0], adj[1]) : [];
  }
};
/** run the bot headlessly on the sim alone (tests): steps of 1/120 s until the plan is done or time runs out */
B.runBot = (o = {}, maxSeconds = 3600) => {
  B.Bot.start(o); const dt = 1 / 120; let t = 0;
  while (B.Bot.active && t < maxSeconds && !B.S.over) { const cmds = B.Bot.step(dt); B.update(dt, cmds); B.drain(); t += dt; if (o.until && o.until()) break; }
  return { t, done: B.Bot.done, stuck: B.Bot.stuck, log: B.Bot.log, over: B.S.over };
};
