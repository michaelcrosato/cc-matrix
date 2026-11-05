// Meta systems: pickups, items, the Dossier, story beats and dialog, triggers, bosses, switching, the Wax Bench, saves, Echo Run, the main update.
const s3 = S7.sim, t3 = S7.st;

// ---------------------------------------------------------------- spots and pickups
function spotPos(sp) {
  const G = S7.graph(); if (sp.node) { const n = G.nodes[sp.node]; return { x: n.x, y: n.y, z: n.z }; }
  const e = G.edges[sp.edge]; const o = {}; s3.edgePos(e, e.len * sp.s, o); return o;
}
s3.spotPos = spotPos;
s3.addSpotPickup = function (sp) { const p = spotPos(sp); t3.pickups.push({ id: t3.nextId++, spot: sp.id, kind: sp.item, n: sp.n || 1, x: p.x + (sp.node ? .6 : 0), y: p.y + (sp.node ? .6 : 0), z: p.z + .5, label: sp.label }); };
s3.collect = function (p) {
  if (p.got) return; p.got = true;
  if (p.spot) t3.collected[t3.area + ':' + p.spot] = true;
  if (p.kind === 'red') { const cap = s3.redMax(); t3.red = Math.min(cap, t3.red + p.n); }
  else if (p.kind === 'rime') t3.rime += p.n;
  else if (/^pin\d$/.test(p.kind)) { if (!t3.pins.includes(p.kind)) t3.pins.push(p.kind); const pin = S7.PINS.find(q => q[0] === p.kind); s3.toast('LIFT PIN ' + t3.pins.length + '/7: ' + pin[1].toUpperCase()); }
  else if (p.kind.startsWith('coat_')) { const id = p.kind.slice(5); t3.roster[id].unlocked = true; s3.toast('A NEW COAT: ' + S7.reg.personas[id].name.toUpperCase()); s3.playBeat('coat_' + id); }
  else { t3.items[p.kind] = (t3.items[p.kind] || 0) + 1; const it = S7.reg.items[p.kind]; s3.toast('GOT: ' + (it ? it.name.toUpperCase() : p.kind)); if (p.kind === 'servicekey') s3.playBeat('got_key'); }
  S7.bus.emit('pickup', { kind: p.kind, amount: p.n, x: p.x, y: p.y, drop: !!p.drop });
  s3.updateObjective();
};
s3.unlockDossier = function (id) { if (t3.dossier.includes(id)) return; t3.dossier.push(id); const d = S7.DOSSIER.find(q => q[0] === id); if (d) s3.toast('DOSSIER: ' + d[1]); S7.bus.emit('dossier', { id }); };

// ---------------------------------------------------------------- story: beats run as small scripts of steps
// steps: {say:'rurik', text:'..', mood} {card:'TARGET 00', sub:'..'} {wait:s} {cam:{at,look,fov}, t:s} {fn:()=>..} {wave:id} {flag:k,v} {dossier:id} {music:cue} {unlock:id} {boss:id} {end:true}
s3.playBeat = function (id) {
  const b = S7.reg.beats[id]; if (!b) return false;
  const steps = typeof b === 'function' ? b(t3) : b; if (!steps || !steps.length) return false;
  t3.beat = { id, steps, i: 0, wait: 0 }; t3.preBeat = t3.mode === 'talk' || t3.mode === 'cutscene' ? t3.preBeat : t3.mode;
  t3.mode = 'cutscene'; t3.speed = 0; S7.bus.emit('beat', { id }); runStep(); return true;
};
function endBeat() {
  const id = t3.beat && t3.beat.id; t3.beat = null; t3.talk = null; t3.cut = null; t3.card = null;
  t3.mode = t3.preBeat && !['talk', 'cutscene', 'transition', 'frozen'].includes(t3.preBeat) ? t3.preBeat : 'rail';
  if (t3.mode === 'aim') t3.mode = 'rail';
  if (t3.options && t3.options.length && t3.edge && t3.mode === 'rail' && t3.node && S7.graph().nodes[t3.node].edges.length >= 3) t3.mode = 'junction';
  S7.bus.emit('beatend', { id }); s3.updateObjective();
}
function runStep() {
  const b = t3.beat; if (!b) return;
  while (b.i < b.steps.length) {
    const s = b.steps[b.i];
    if (s.say) { t3.talk = { who: s.say, text: (S7.fmt || (x => x))(s.text), shown: 0, name: s.name || null, mood: s.mood || null }; t3.mode = 'talk'; return; }
    t3.mode = 'cutscene'; t3.talk = null;
    if (s.card) { t3.card = { title: s.card, sub: s.sub || '', t: s.t || 2.6, t0: s.t || 2.6 }; b.wait = s.t || 2.6; b.i++; S7.bus.emit('card', { card: t3.card }); return; }
    if (s.wait !== undefined) { b.wait = s.wait; b.i++; return; }
    if (s.cam) { t3.cut = { cam: s.cam }; if (s.t) { b.wait = s.t; b.i++; return; } }
    if (s.clearcam) t3.cut = null;
    if (s.fn) s.fn(t3);
    if (s.wave) s3.startWave(s.wave);
    if (s.flag) t3.flags[s.flag] = s.v === undefined ? true : s.v;
    if (s.dossier) s3.unlockDossier(s.dossier);
    if (s.music) S7.bus.emit('music', { cue: s.music });
    if (s.unlock) { t3.roster[s.unlock].unlocked = true; s3.toast('NEW COAT: ' + S7.reg.personas[s.unlock].name.toUpperCase()); }
    if (s.boss) s3.startBoss(s.boss);
    if (s.give) { t3.items[s.give] = (t3.items[s.give] || 0) + 1; }
    if (s.shake) S7.bus.emit('shake', { n: s.shake });
    if (s.go) { b.i++; endBeat(); s3.leaveArea(s.go[0], s.go[1]); return; }
    if (s.credits) { b.i++; endBeat(); S7.bus.emit('credits', {}); return; }
    if (s.result !== undefined) { s3.finishTarget(s.result); }
    b.i++;
  }
  endBeat();
}
function stepBeat(dt, I) {
  const b = t3.beat; if (!b) { if (t3.mode === 'talk' || t3.mode === 'cutscene') endBeat(); return; }
  if (t3.talk) {
    const tk = t3.talk, prev = Math.floor(tk.shown); tk.shown = Math.min(tk.text.length, tk.shown + 46 * dt);
    if (Math.floor(tk.shown) > prev) S7.bus.emit('talkchar', { who: tk.who, ch: tk.text[Math.floor(tk.shown) - 1] || ' ', i: Math.floor(tk.shown) });
    if (I.confirm || I.skipTalk) { if (tk.shown < tk.text.length) tk.shown = tk.text.length; else { b.i++; t3.talk = null; runStep(); } }
    return;
  }
  if (t3.card) t3.card.t -= dt;
  if (b.wait > 0) { b.wait -= dt; if (b.wait <= 0) { t3.card = null; runStep(); } }
  if (I.skipScene) { while (t3.beat && t3.beat === b && b.i < b.steps.length) { const s = b.steps[b.i]; if (s.say || s.card || s.wait !== undefined || s.cam) { b.i++; continue; } runStep(); } if (t3.beat === b) endBeat(); }
}

// ---------------------------------------------------------------- triggers, waves, run events
s3.fireTriggers = function (kind, id) {
  const A = S7.graph().A;
  for (const tr of A.triggers) {
    if ((kind === 'node' && tr.node !== id) || (kind === 'edge' && tr.edge !== id)) continue;
    const key = A.id + ':' + tr.id; if (tr.once && t3.done[key]) continue; t3.done[key] = true;
    runTrigger(tr);
  }
};
function runTrigger(tr) {
  if (tr.wave) s3.startWave(tr.wave);
  if (tr.run) s3.runEvent(tr.run.type);
  if (tr.boss && !t3.bosses[tr.boss] && !t3.boss) { const bid = tr.boss; if (tr.beat) { S7.reg.beats[tr.beat + '_then'] = null; } t3.pendingBoss = bid; }
  if (tr.beat) s3.playBeat(tr.beat);
  else if (tr.boss && t3.pendingBoss) { const b = t3.pendingBoss; t3.pendingBoss = null; s3.startBoss(b); }
}
s3.runEvent = function (type) {
  if (t3.echo) return;
  const G = S7.graph(), e = G.edges[t3.edge]; if (!e) return;
  const at = (ds, lat) => { const o = {}; s3.edgePos(e, S7.clamp(t3.s + t3.dir * ds, 0, e.len), o); return [o.x + Math.cos(o.ang + Math.PI / 2) * lat, o.y + Math.sin(o.ang + Math.PI / 2) * lat]; };
  const spawn = (kind, ds, lat, still) => { const p = at(ds, lat); s3.spawnEnemy(kind, p[0], p[1], { still }); };
  const k = S7.T('spawnRate');
  if (type === 'lift1') { spawn('giggler', 30, 4, true); spawn('giggler', 44, -5, true); spawn('thrower', 28, 9); }
  else if (type === 'lift2') { spawn('thrower', 26, -10); spawn('thrower', 36, 10); spawn('giggler', 52, 2, true); if (k > 1.4) spawn('giggler', 58, -2, true); }
  else if (type === 'ski1') { spawn('skier', 62, 3); spawn('giggler', 78, -3); spawn('thrower', 90, 6); }
  else if (type === 'ski2') { spawn('skier', 60, -4); spawn('skier', 68, 4); spawn('giggler', 84, 0); spawn('sumo', 100, 2); }
  else if (type === 'ski3') { spawn('skier', 55, 0); spawn('thrower', 70, -6); spawn('thrower', 76, 6); spawn('giggler', 92, 0); spawn('bellhop', 100, 2); }
};

// ---------------------------------------------------------------- bosses
const BOSSES = {
  grau: { name: 'BELLCAPTAIN GRAU', hp: 150, x: 13, y: 5.2, cy: 1.7, r: 1.2, warmR: .3 },
  king: { name: 'THE POWDER KING', hp: 240, x: 17, y: 8.5, cy: 4.2, r: 3.2, warmR: .55 }
};
s3.startBoss = function (id) {
  const d = BOSSES[id], A = S7.graph().A; if (t3.bosses[id]) return;
  const hp = d.hp * S7.T('bossHp');
  const b = t3.boss = { id, name: d.name, x: d.x, y: d.y, z: 0, cy: d.cy, r: d.r, warmR: d.warmR, hp, hpMax: hp, phase: 1, t: 0, state: 'idle', st: 0, rings: 0, stagger: 0, revealT: 0, hit: 0, zone: null, adds: 12, toggle: 0 };
  b.warmOpen = () => b.state === 'window' && !b.dead;
  b.warmPos = () => id === 'grau' ? [b.x, b.y + 1.0, b.z + 1.55] : [b.x + (b.toggle ? .9 : -.9), b.y + 2.9, b.z + 4.0];
  S7.bus.emit('boss', { id, phase: 1 });
};
s3.hitBoss = function (dmg, crit, w) {
  const b = t3.boss; if (!b || b.dead) return;
  if (crit) { const amt = dmg * S7.T('critMult'); b.hp -= amt; b.hit = .3; t3.stats.crits++; S7.bus.emit('crit', { boss: true }); S7.bus.emit('hit', { target: b, part: 'warm', dmg: amt, x: b.x, y: b.y, z: b.z + b.cy }); }
  else { b.hp -= dmg * .08; b.hit = .12; S7.bus.emit('hit', { target: b, part: 'shield', dmg: 0, x: b.x, y: b.y, z: b.z + b.cy }); if (w && w.stun) b.stagger = Math.max(b.stagger, .4); }
  const frac = b.hp / b.hpMax, ph = frac < .25 ? 3 : frac < .6 ? 2 : 1;
  if (ph !== b.phase) { b.phase = ph; S7.bus.emit('boss', { id: b.id, phase: ph }); s3.toast(b.name + ': PHASE ' + ph); b.adds = 0; }
  if (b.hp <= 0) bossDown(b);
};
function bossDown(b) {
  b.dead = true; b.hp = 0; t3.bosses[b.id] = true; t3.projectiles.length = 0; for (const e of t3.enemies) if (!e.dead) s3.killEnemy(e, false);
  S7.bus.emit('boss', { id: b.id, phase: 'dead' });
  s3.playBeat(b.id === 'grau' ? 't00_boss_down' : 't01_boss_down');
}
function bossStep(dt) {
  const b = t3.boss; if (!b) return;
  b.t += dt; b.hit = Math.max(0, b.hit - dt); b.revealT = Math.max(0, b.revealT - dt);
  if (b.dead) return;
  if (b.stagger > 0) { b.stagger -= dt; return; }
  const ph = b.phase, speed = ph === 3 ? .62 : ph === 2 ? .8 : 1;
  b.st += dt;
  if (b.id === 'grau') {
    if (b.state === 'idle') { if (b.st > 1.5 * speed) { b.state = 'ring'; b.st = 0; S7.bus.emit('bossring', { id: 'grau' }); } }
    else if (b.state === 'ring') { if (b.st > .55) { b.state = 'window'; b.st = 0; } }
    else if (b.state === 'window') {
      if (b.st > .5 && !b.threw) { b.threw = true; s3.fireProjectile(b.x, b.y + 1, 1.9, t3.x, t3.y, t3.z + 1.1, 7.5, 13, 'suit', b); if (ph >= 2) { s3.fireProjectile(b.x, b.y + 1, 1.9, t3.x + 2.6, t3.y, t3.z + 1.1, 7.5, 13, 'suit', b); } }
      if (b.st > (ph === 3 ? 1.5 : 2.0)) { b.state = 'idle'; b.st = 0; b.threw = false; b.rings++; if (ph >= 2 && b.rings % 2 === 0) { s3.startWave(b.rings % 4 === 0 ? 'hop2' : 'hop'); } }
    }
  } else {
    b.toggle = Math.floor(b.t / 2) % 2;
    if (b.state === 'idle') { if (b.st > 1.7 * speed) { b.rings++; const mode = b.rings % 3; b.st = 0;
        if (mode === 1) { b.state = 'volley'; } else if (mode === 2) { b.state = 'slide'; const G = S7.graph(); const keys = Object.keys(G.nodes).filter(k => /^f\d$/.test(k) && k !== 'f0'); const near = keys.sort((a, c) => Math.hypot(G.nodes[a].x - t3.x, G.nodes[a].y - t3.y) - Math.hypot(G.nodes[c].x - t3.x, G.nodes[c].y - t3.y))[0]; b.zone = { x: G.nodes[near].x, y: G.nodes[near].y, t: 0, r: 4.4 }; S7.bus.emit('bossring', { id: 'king', zone: b.zone }); }
        else { b.state = 'inhale'; S7.bus.emit('bossring', { id: 'king', inhale: true }); } } }
    else if (b.state === 'volley') { if (!b.threw) { b.threw = true; const n = ph === 1 ? 3 : 5; for (let i = 0; i < n; i++) s3.fireProjectile(b.x, b.y + 1, 4.4, t3.x + (i - (n - 1) / 2) * 1.9, t3.y, t3.z + 1.2, 7.5, 12, 'snow', b); } if (b.st > 1.3) { b.state = 'idle'; b.st = 0; b.threw = false; } }
    else if (b.state === 'slide') { if (b.zone) { b.zone.t += dt; if (b.zone.t > 1.9 && !b.zone.hit) { b.zone.hit = true; S7.bus.emit('explode', { x: b.zone.x, y: b.zone.y, z: 1, radius: b.zone.r, dmg: 32, source: 'avalanche', big: true }); if (Math.hypot(t3.x - b.zone.x, t3.y - b.zone.y) < b.zone.r) s3.hurtHero(32 * S7.T('bossDmg'), 'avalanche', b.zone.x, b.zone.y); } if (b.zone.t > 2.5) { b.zone = null; b.state = 'inhale'; b.st = 0; } } }
    else if (b.state === 'inhale') { if (b.st > .8) { b.state = 'window'; b.st = 0; } }
    else if (b.state === 'window') { if (b.st > (ph === 3 ? 2.0 : 2.8)) { b.state = 'idle'; b.st = 0; b.threw = false; if (ph >= 2 && b.adds < 1) { b.adds++; s3.startWave(ph === 2 ? 'add1' : 'add2'); } } }
  }
}

// ---------------------------------------------------------------- the Seven: switching, the ring
s3.switchTo = function (id, quiet) {
  const r = t3.roster[id]; if (!r || !r.unlocked || r.frozen || id === t3.persona) return false;
  if (!['rail', 'junction', 'ring', 'ski', 'lift'].includes(t3.mode) && !quiet) return false;
  const from = t3.persona; t3.persona = id; t3.switchT = S7.T('timeScale') ? .45 : .45; t3.aim.zoom = false;
  S7.bus.emit('switch', { from, to: id }); t3.blocked = t3.blocked && S7.graph().edges[t3.edge] ? t3.blocked : null; return true;
};
s3.ringSlots = () => S7.ROSTER.map(id => ({ id, ok: t3.roster[id].unlocked && !t3.roster[id].frozen }));
s3.ringPick = function (vx, vy) {
  if (Math.hypot(vx, vy) < .4) return t3.ringSel;
  let a = Math.atan2(vy, vx) + Math.PI / 2; if (a < 0) a += Math.PI * 2;
  return Math.round(a / (Math.PI * 2 / 7)) % 7;
};

// ---------------------------------------------------------------- the Wax Bench
s3.upgradeCost = id => { const u = S7.UPGRADES.find(q => q.id === id), lv = t3.upg[id] || 0; return lv >= u.max ? null : u.cost[lv]; };
s3.buyUpgrade = function (id) {
  const c = s3.upgradeCost(id); if (c === null) return 'max'; if (t3.rime < c) return 'poor';
  t3.rime -= c; t3.upg[id] = (t3.upg[id] || 0) + 1;
  if (id === 'fur') for (const k of S7.ROSTER) { t3.roster[k].hp = Math.min(s3.personaMax(k), t3.roster[k].hp + Math.round(S7.reg.personas[k].hp * .15)); }
  S7.bus.emit('wax', { id }); return 'ok';
};

// ---------------------------------------------------------------- objective text
s3.updateObjective = function () {
  const a = t3.area, f = t3.flags; let o = '';
  const g = id => !!t3.gates[a + ':' + id];
  if (a === 'room7') o = !t3.bosses.grau ? 'Change coats at the Wardrobe. Wax at the Bench. Take the corridor when ready.' : !t3.bosses.king ? 'Rest. Wax. Then back out into the snow.' : 'It is over. Almost.';
  else if (a === '00A') o = !t3.items.servicekey ? (g('glass') ? 'Fetch the Service Key from the cloakroom.' : 'The Service Key is behind the glass wall in the west. A yodeler might help.') : 'Take the staff lift north.';
  else if (a === '00C') o = 'Shoot the Warm Spot on Grau when the bell rings.';
  else if (a === '01A') o = !t3.items.tbar ? (g('shopdoor') ? 'Take the T-Bar Token from the frozen shop.' : 'Find a T-Bar Token. The frozen shop east may hold one.') : !g('serac') ? (t3.roster.mara.unlocked ? 'The lift station is behind an ice serac. Mara knows ice: press the skill at it.' : 'An ice serac blocks the lift. The engineer\'s coat hangs in the private garden, west. A tycoon can open that gate.') : 'Take the lift station north-east.';
  else if (a === '01C') o = t3.echo ? 'ECHO RUN: ski to the bottom. Thawed targets cut 2 seconds.' : 'Ride the T-bar up, then ski the Black Run down.';
  else if (a === '01F') o = 'Shoot the Powder King\'s Warm Spot when he breathes in.';
  t3.objective = o;
};

// ---------------------------------------------------------------- targets, results, saves
s3.finishTarget = function (n) {
  const s = t3.stats, acc = s.shots ? s.hits / s.shots : 0;
  let score = s.kills * 10 + s.crits * 15 - Math.round(s.damage) * 1 + Math.max(0, 600 - Math.round(s.t)) * .2 + t3.pins.length * 20;
  const rank = score > 360 ? 'S' : score > 260 ? 'A' : score > 170 ? 'B' : 'C';
  t3.results[n] = { target: n, kills: s.kills, crits: s.crits, damage: Math.round(s.damage), time: s.t, acc: Math.round(acc * 100), pins: t3.pins.length, rank };
  S7.bus.emit('result', { target: n, stats: t3.results[n], rank });
  t3.stats = { kills: 0, crits: 0, damage: 0, shots: 0, hits: 0, freezes: 0, t: 0 };
};
s3.serialize = function () {
  const keep = ['area', 'persona', 'roster', 'red', 'rime', 'items', 'pins', 'dossier', 'upg', 'flags', 'gates', 'done', 'collected', 'bosses', 'stats', 'results', 'playTime', 'difficulty'];
  const o = {}; for (const k of keep) o[k] = JSON.parse(JSON.stringify(t3[k]));
  o.node = t3.node; return o;
};
s3.deserialize = function (d) {
  S7.newState({ difficulty: d.difficulty });
  for (const k of Object.keys(d)) if (k !== 'node') t3[k] = JSON.parse(JSON.stringify(d[k]));
  for (const id of S7.ROSTER) if (!t3.roster[id]) t3.roster[id] = { hp: 1, frozen: false, unlocked: false, ammo: S7.reg.weapons[S7.reg.personas[id].weapon].mag, reload: 0, cool: 0 };
  for (const id of S7.ROSTER) { t3.roster[id].reload = 0; t3.roster[id].cool = 0; }
  s3.loadArea(d.area, d.node || (d.area === 'room7' ? 'c' : undefined));
};
s3.saveHere = function () {
  t3.lastSave = s3.serialize(); S7.bus.emit('save', {}); return t3.lastSave;
};
s3.enterRoom7 = function () { s3.reviveFrozen(); for (const id of S7.ROSTER) { const r = t3.roster[id]; r.hp = Math.max(r.hp, Math.round(s3.personaMax(id) * .6)); r.ammo = S7.reg.weapons[S7.reg.personas[id].weapon].mag; } };
s3.nextFromRoom7 = function () {
  if (!t3.bosses.grau) return ['00A', 'start'];
  if (!t3.bosses.king) return ['01A', 'start'];
  return ['room7', 'c'];
};

// ---------------------------------------------------------------- Echo Run: ski the Black Run against the clock and the ghosts
s3.startEcho = function (opts = {}) {
  S7.newState({ difficulty: 'normal' });
  for (const id of S7.ROSTER) t3.roster[id].unlocked = true;
  t3.persona = 'anselma';
  t3.echo = { t: 0, hits: 0, total: 0, finished: false, started: false, rec: [], ghost: opts.ghost || null, others: {}, countdown: opts.countdown === undefined ? 3 : opts.countdown, result: null, seed: opts.seed || 1 };
  s3.loadArea('01C', 'top');
  t3.edge = 's1'; t3.s = 0; t3.dir = 1; t3.mode = 'ski'; t3.node = null; t3.speed = 0; t3.options = []; s3.placeHero(); s3.directCamera(0, true);
  // targets: warm-spot dummies along the main line
  const G = S7.graph(); const spots = [['s1', .22, 3], ['s1', .5, -3], ['s1', .78, 3], ['s2', .25, -3], ['s2', .55, 3], ['s2', .85, -3], ['s3', .3, 3], ['s3', .65, -3]];
  for (const [eid, f, lat] of spots) { const e = G.edges[eid], o = {}; s3.edgePos(e, e.len * f, o); const ex = o.x + Math.cos(o.ang + Math.PI / 2) * lat, ey = o.y + Math.sin(o.ang + Math.PI / 2) * lat; const en = s3.spawnEnemy('giggler', ex, ey, { from: 'echo' }); en.dummy = true; en.spawnT = 0; en.visible = 1; en.face = o.ang + Math.PI; t3.echo.total++; }
  t3.pickups.length = 0; t3.objective = 'ECHO RUN: ski to the bottom. Thawed targets cut 2 seconds.';
  S7.bus.emit('echo', { kind: 'start' });
};
s3.echoTick = function (dt) {
  const ec = t3.echo; if (!ec || ec.finished) return;
  ec.t += dt; ec.recT = (ec.recT || 0) + dt;
  if (ec.recT >= .1) { ec.recT = 0; ec.rec.push([+ec.t.toFixed(2), t3.edge, +t3.s.toFixed(1)]); }
  if (t3.node === 'rest' || (t3.edge === 's3' && t3.s >= G_len('s3') - .5)) s3.echoFinish();
};
function G_len(id) { return S7.graph().edges[id].len; }
s3.echoFinish = function () {
  const ec = t3.echo; if (!ec || ec.finished) return; ec.finished = true;
  const cut = ec.hits * 2, time = Math.max(1, ec.t - cut);
  ec.result = { raw: ec.t, cut, time, hits: ec.hits, total: ec.total };
  S7.bus.emit('echo', { kind: 'finish', result: ec.result });
};

// ---------------------------------------------------------------- the main step
s3.update = function (dt, I) {
  dt = Math.min(dt, 1 / 20) * S7.T('timeScale');
  I = I || {};
  if (t3.mode === 'transition') {
    t3.transT -= dt;
    if (t3.transT <= 0 && t3.pendingArea) { const p = t3.pendingArea; t3.pendingArea = null;
      let to = p.to, node = p.node;
      if (t3.area === 'room7' && p.node === 'door' && to === 'room7') { const n = s3.nextFromRoom7(); to = n[0]; node = n[1]; }
      if (to === 'room7' && node === 'door') { /* arriving into Room 7 from the field puts you at the hub */ node = 'c'; }
      if (t3.area === 'room7' && to !== 'room7') { /* leaving Room 7 */ }
      s3.loadArea(to, node); if (to === 'room7') s3.enterRoom7(); else s3.reviveFrozen();
      if (to !== 'room7') { t3.lastSave = null; }
      s3.autosave && s3.autosave();
      if (t3.mode === 'transition') t3.mode = 'rail';
      if (t3.mode === 'rail' && S7.graph().nodes[t3.node] && S7.graph().nodes[t3.node].edges.length >= 3) { t3.mode = 'junction'; }
      S7.bus.emit('arrived', { area: to });
    }
    return;
  }
  if (t3.over) return;
  t3.time += dt;
  if (t3.echo && t3.echo.countdown > 0) { t3.echo.countdown -= dt; I = { stick: [0, 0] }; if (t3.echo.countdown <= 0) { t3.echo.started = true; S7.bus.emit('echo', { kind: 'go' }); } s3.directCamera(dt); return; }
  if (t3.mode === 'talk' || t3.mode === 'cutscene') { stepBeat(dt, I); s3.directCamera(dt); return; }
  if (t3.mode === 'modal') return;
  if (I.map && ['rail', 'junction'].includes(t3.mode)) { S7.bus.emit('open', { screen: 'map' }); return; }
  // the ring: hold to slow time and choose a coat
  if (I.ring && ['rail', 'junction', 'aim', 'ski', 'lift'].includes(t3.mode)) { t3.preRing = t3.mode; t3.mode = 'ring'; t3.ringSel = S7.ROSTER.indexOf(t3.persona); S7.bus.emit('ringon', {}); }
  if (t3.mode === 'ring') {
    if (I.ringVec) { const k = s3.ringPick(I.ringVec[0], I.ringVec[1]); if (k !== null && k !== undefined && k !== t3.ringSel) { t3.ringSel = k; S7.bus.emit('select', {}); } }
    if (!I.ring) { const id = S7.ROSTER[t3.ringSel]; t3.mode = t3.preRing === 'aim' ? 'rail' : t3.preRing; if (id) s3.switchTo(id); S7.bus.emit('ringoff', {}); }
    else { s3.stepCombat(dt * .15, {}); s3.directCamera(dt); return; }
  }
  if (I.pick && ['rail', 'junction', 'ski', 'lift'].includes(t3.mode)) { const id = S7.ROSTER[I.pick - 1]; if (id) s3.switchTo(id); }
  if (t3.mode !== 'frozen') { t3.playTime += dt; t3.stats.t += dt; }
  if (t3.mode !== 'frozen' && t3.mode !== 'gameover') {
    if (t3.echo && !t3.echo.started) I = {};
    s3.interactStep(dt, I);
    const prevS = t3.s, prevEdge = t3.edge;
    if (!(t3.mode === 'aim' && (t3.preAim === 'rail' || t3.preAim === 'junction'))) stepWalkerPublic(dt, I);
    if (t3.edge === prevEdge && ['rail', 'ski', 'lift'].includes(t3.mode) || t3.mode === 'aim') edgeTriggers(prevS);
  }
  s3.stepCombat(dt, I);
  bossStep(dt);
  s3.directCamera(dt);
  t3.objTimer = (t3.objTimer || 0) - dt; if (t3.objTimer <= 0) { t3.objTimer = .5; s3.updateObjective(); }
  if (t3.hint && t3.mode !== 'rail' && t3.mode !== 'ski') { /* keep hint */ }
  if (t3.blocked && t3.speed > 0.1) t3.blocked = null;
  // the game's own pause for the Sweep rescue
};
function edgeTriggers(prevS) {
  const A = S7.graph().A, e = S7.graph().edges[t3.edge]; if (!e) return;
  for (const tr of A.triggers) {
    if (tr.edge !== t3.edge) continue; const key = A.id + ':' + tr.id; if (tr.once && t3.done[key]) continue;
    const at = tr.s * e.len;
    if ((prevS < at && t3.s >= at) || (prevS > at && t3.s <= at)) { t3.done[key] = true; runTrigger(tr); }
  }
}
function stepWalkerPublic(dt, I) { s3.stepWalker(dt, I); }
// interact: spots (talk, bench, wardrobe, save, leave), gates
s3.nearSpot = function () {
  const A = S7.graph().A; let best = null, bd = 2.6;
  for (const sp of A.spots) { if (sp.kind === 'pickup') continue; const p = spotPos(sp), d = Math.hypot(p.x - t3.x, p.y - t3.y); if (d < bd) { bd = d; best = sp; } }
  return best;
};
s3.interactStep = function (dt, I) {
  if (!['rail', 'junction'].includes(t3.mode) && !(t3.mode === 'ski' && t3.speed < 1)) { t3.prompt = null; return; }
  const sp = s3.nearSpot(); t3.prompt = sp ? { kind: sp.kind, label: sp.label, id: sp.id } : null;
  if (t3.blocked) { const g = s3.gateOf(); t3.prompt = g ? { kind: 'gate', label: g.label, id: t3.blocked } : t3.prompt; }
  if (I.clickSpot) { const sp2 = S7.graph().A.spots.find(q => q.id === I.clickSpot); if (sp2 && (!sp || sp2.id === sp.id)) I = Object.assign({}, I, { interact: true }); }
  if (!I.interact) return;
  if (t3.blocked) {
    const g = s3.gateOf(); if (!g) return;
    if (g.who && g.who !== t3.persona) { const w = S7.reg.personas[g.who]; s3.toast('WEAR ' + w.name.toUpperCase() + ' TO TRY THIS'); S7.bus.emit('deny', {}); return; }
    s3.useSkill(); return;
  }
  if (!sp) return;
  const speak = id => { s3.playBeat(id); };
  if (sp.kind === 'npc' || sp.kind === 'phone') speak(sp.talk);
  else if (sp.kind === 'save') S7.bus.emit('open', { screen: 'save' });
  else if (sp.kind === 'bench') S7.bus.emit('open', { screen: 'bench' });
  else if (sp.kind === 'wardrobe') S7.bus.emit('open', { screen: 'wardrobe' });
  else if (sp.kind === 'leave') { const dest = s3.nextFromRoom7(); s3.autosave && s3.autosave(); s3.leaveArea(dest[0], dest[1]); }
};
