// gameplay suites: cover, weapons, player, timer, scoring, enemies, threats, projectiles, objects, bosses, co-op
const C = (o = {}) => Object.assign({ aim: [0, 0], fireDown: false, firePressed: false, coverDown: false, coverPressed: false, next: false, prev: false, select: 0, reload: false }, o);
/** a sim in a scene's action phase with nothing spawned yet */
function action(t, TC, o = {}) { const s = t.sim(TC, Object.assign({ stage: 1, scene: '1-1' }, o)); t.step(s, .4); s.enemies = s.enemies.filter(e => e.ally); s.dir.waves.forEach(w => { w.started = true; }); s.dir.civs.forEach(c => { c.done = true; }); s.dir.clear = () => false; return s; }
/** aim at a world point for player i */
const aimAt = (TC, s, p, i = 0) => TC.worldToAim(s.cameraFor(i), p).slice(0, 2);
export default {
  cover(t) {
    const { TC } = t.load(), s = action(t, TC), p = s.players[0];
    t.step(s, .06, [C({ coverDown: true })]); t.check('cover blends in', p.c > .3 && p.c < 1, p.c);
    t.step(s, .1, [C({ coverDown: true })]); t.check('in cover after coverIn', p.c === 1);
    t.check('exposed means c < .5', p.c >= .5);
    t.step(s, .2, [C()]); t.check('out again after coverOut', p.c === 0);
    p.mag = 0; t.step(s, .5, [C({ coverDown: true })]); t.check('reloads in cover', p.mag === 9 && p.stats.reloads === 1);
    p.mag = 3; p.ammo.mg = 50; t.step(s, 1 / 120, [C({ coverDown: true, firePressed: true, fireDown: true })]); t.step(s, .02, [C({ coverDown: true })]); t.check('no firing in cover, fire switches weapons', p.mag === 3 && p.weapon === 'mg', p.weapon);
    TC.coverToggle = true; t.step(s, .5, [C()]); t.step(s, 1 / 120, [C({ coverPressed: true })]); t.step(s, .3, [C()]); t.check('toggle mode: one press holds cover', p.c === 1); t.step(s, 1 / 120, [C({ coverPressed: true })]); t.step(s, .3, [C()]); t.check('toggle mode: a second press leaves', p.c === 0); TC.coverToggle = false;
    p.weapon = 'hg'; p.mag = 4; t.step(s, 1 / 120, [C({ reload: true })]); t.step(s, .6, [C()]); t.check('quick reload ducks and refills', p.mag === 9);
  },
  weapons(t) {
    const { TC } = t.load(), s = action(t, TC), p = s.players[0];
    const shots = () => p.stats.shots;
    let n0 = shots(); for (let i = 0; i < 120; i++) s.step(1 / 120, [C({ fireDown: true, firePressed: i % 2 === 0, aim: [0, .8] })]); t.check('handgun: at most 6 a second', shots() - n0 <= 7 && shots() - n0 >= 5, shots() - n0);
    for (let i = 0; i < 240; i++) s.step(1 / 120, [C({ fireDown: true, firePressed: i % 2 === 0, aim: [0, .8] })]); t.check('a magazine is 9 rounds', shots() - n0 === 9, shots() - n0);
    t.check('magazine empties', p.mag === 0);
    t.step(s, .3); let e0 = s.events.filter(e => e.type === 'empty').length; t.step(s, 1 / 120, [C({ firePressed: true })]); t.check('empty click', s.events.filter(e => e.type === 'empty').length > e0);
    p.mag = 9; p.ammo.mg = 240; t.step(s, 1 / 120, [C({ select: 2 })]); t.step(s, .3); n0 = shots(); t.step(s, 1, [C({ fireDown: true, aim: [0, .8] })]); t.check('machine gun ~12 a second', Math.abs(shots() - n0 - 12) <= 2, shots() - n0);
    p.ammo.sg = 8; t.step(s, 1 / 120, [C({ select: 3 })]); t.step(s, .4); s.drain(); t.step(s, 1 / 120, [C({ firePressed: true, fireDown: true, aim: [0, .5] })]); const ev = s.events.find(e => e.type === 'shot'); t.check('shotgun fires 8 pellets', ev && ev.to.length === 8, ev && ev.to.length);
    p.ammo.gl = 1; t.step(s, 1 / 120, [C({ select: 4 })]); t.step(s, 1); s.drain(); t.step(s, 1 / 120, [C({ firePressed: true, aim: [0, .25] })]); t.check('grenade launcher launches a round', s.projectiles.some(q => q.kind === 'pgl')); t.step(s, 1.5); t.check('the round explodes', s.drain().some(e => e.type === 'explode'));
    t.step(s, .6); t.check('an empty special switches back to the handgun', p.weapon === 'hg', p.weapon);
    t.step(s, 1 / 120, [C({ select: 3 })]); t.step(s, .02); t.check('switch time blocks firing', p.switchT > 0 || p.weapon !== 'sg');
  },
  player(t) {
    const { TC } = t.load(), s = action(t, TC), p = s.players[0], lives = p.lives;
    TC.hurtPlayer(s, p, 'test'); t.check('a hit costs a life', p.lives === lives - 1);
    TC.hurtPlayer(s, p, 'test'); t.check('invulnerable just after', p.lives === lives - 1 && p.inv > 0);
    t.step(s, 2); TC.addScore(s, p, 150000, null, true); t.check('extra life at 150,000', p.lives === lives);
    p.lives = 1; p.inv = 0; TC.hurtPlayer(s, p, 'test'); t.step(s, .1); t.check('out of lives: CONTINUE?', s.phase === 'continue' && p.out);
    t.step(s, 1); t.step(s, 1 / 120, [C({ firePressed: true })]); t.check('a continue restores lives and resets the score', !p.out && p.lives === s.diff.lives && p.score === 0 && p.conts === 1);
    const s2 = action(t, TC), q = s2.players[0]; q.lives = 1; TC.hurtPlayer(s2, q, 'x'); t.step(s2, 11); t.check('no continue: game over', s2.phase === 'gameover');
    const s3 = action(t, TC), r = s3.players[0], ring = s3.objects.find(o => o.kind === 'lifering'), l0 = r.lives; TC.hitObject(s3, ring, r, 1, 'hg'); t.check('the life ring gives a life', r.lives === l0 + 1);
  },
  timer(t) {
    const { TC } = t.load(), s = t.sim(TC, { stage: 1, scene: '1-1' }); s.jump(1, '1-1', { phase: 'travel' }); const t0 = s.timer;
    t.step(s, 1); t.check('TIME does not run while travelling', s.timer === t0 && s.phase !== 'action');
    t.step(s, 4); t.check('TIME runs in action', s.phase === 'action' && s.timer < t0);
    const tb = s.timer; s.timeExtend(2); t.check('TIME EXTEND', Math.abs(s.timer - tb - 2) < 1e-9);
    const p = s.players[0], l = p.lives; p.inv = 5; s.timer = .01; t.step(s, .05); t.check("TIDE'S IN: a life even when invulnerable", p.lives === l - 1);
    t.check('TIME refills to 60%', Math.abs(s.timer - s.scene.time * .6) < .2, s.timer);
    const s2 = action(t, TC); delete s2.dir.clear; s2.timer = 20.4; const sc = s2.players[0].score; s2.enemies = []; t.step(s2, 1 / 120); t.check('a clear adds the time bonus', s2.players[0].score - sc === 2000 && s2.phase === 'clear', s2.players[0].score - sc);
  },
  scoring(t) {
    const { TC } = t.load(), s = action(t, TC), p = s.players[0];
    for (let i = 0; i < 5; i++) TC.addHitChain(p); t.check('chain ×1.1 at 5', TC.chainMul(p) === 1.1);
    for (let i = 0; i < 100; i++) TC.addHitChain(p); t.check('chain caps at ×2', TC.chainMul(p) === 2);
    t.step(s, 1 / 120, [C({ firePressed: true, aim: [0, .9] })]); t.check('a miss resets the chain', p.chain === 0);
    t.check('rank S', TC.rankOf(p, { shots: 10, hits: 8, lost: 0 }, 0) === 'S'); t.check('rank A', TC.rankOf(p, { shots: 10, hits: 6, lost: 1 }, 0) === 'A'); t.check('rank B', TC.rankOf(p, { shots: 10, hits: 5, lost: 3 }, 0) === 'B'); t.check('rank C', TC.rankOf(p, { shots: 10, hits: 2, lost: 3 }, 0) === 'C'); t.check('rank D after a continue', TC.rankOf(p, { shots: 10, hits: 9, lost: 0 }, 1) === 'D');
    const e = TC.spawnEnemy(s, 'deckhand', 'c1', { entry: 'stand' }); t.step(s, .05); const sc0 = p.score; p.chain = 0; TC.damageEnemy(s, e, 2, p, 'head', { weapon: 'hg' }); t.check('a headshot kill scores hit + kill + headshot', p.score - sc0 >= 100 + 1000 + 500, p.score - sc0);
  },
  enemies(t) {
    const { TC } = t.load();
    const s = action(t, TC), p = s.players[0], e = TC.spawnEnemy(s, 'deckhand', 'c1', { entry: 'stand' });
    let peeked = false, fired = false; for (let i = 0; i < 120 * 8; i++) { s.step(1 / 120, []); if (e.state === 'aim') peeked = true; if (s.events.some(v => v.type === 'eshot' && v.e === e.id)) fired = true; s.drain(); }
    t.check('a deckhand hides, peeks and fires', peeked && fired);
    const hidden = TC.spawnEnemy(s, 'deckhand', 'c5', { entry: 'stand' }); t.step(s, .05); const cam = s.cameraFor(0), h = hidden.vols.head.c, d = TC.V3.norm(TC.V3.sub(h, [cam.x, cam.y, cam.z])), w = s.rayWorld({ o: [cam.x, cam.y, cam.z], d }); t.check('a hiding deckhand is behind its cover', w && w.t < TC.V3.dist(h, [cam.x, cam.y, cam.z]) - 2);
    // a shot at the head while he peeks is a headshot
    let ok = false; for (let i = 0; i < 120 * 6 && !ok; i++) { s.step(1 / 120, []); if (e.alive && e.state === 'aim') { const a = aimAt(TC, s, e.vols.head.c); s.step(1 / 120, [C({ firePressed: true, fireDown: true, aim: a })]); ok = s.drain().some(v => v.type === 'kill' && v.e === e.id); } }
    t.check('aiming at the head kills', ok);
    // the quartermaster drops his ammo
    const qm = TC.spawnEnemy(s, 'quartermaster', null, { route: [[300, -60, 0], [300, 60, 0]], drop: 'mg' }); t.step(s, .1); TC.damageEnemy(s, qm, 5, p, 'torso', { weapon: 'hg' }); t.check('quartermaster drops machine-gun ammo', p.ammo.mg === 60);
    // the shield: immune from the front; the shotgun knocks it aside
    const sh = TC.spawnEnemy(s, 'shield', null, { entry: 'stand', from: [150, 0, 0] }); t.step(s, 1.5); const sv = sh.vols.shield; t.check('the shield has a shield volume', !!sv);
    const hp0 = sh.hp, aS = aimAt(TC, s, TC.V3.lerp(sv.a, sv.b, .5)); p.weapon = 'hg'; p.mag = 9; p.cool = 0; t.step(s, 1 / 120, [C({ firePressed: true, aim: aS })]); t.check('a handgun shot on the shield does nothing', sh.hp === hp0);
    p.ammo.sg = 8; p.weapon = 'sg'; p.cool = 0; p.switchT = 0; t.step(s, 1 / 120, [C({ firePressed: true, fireDown: true, aim: aS })]); t.check('the shotgun knocks the shield aside', !sh.shieldOn || sh.shieldOff > 0);
    // the rusher's slash is blocked by cover
    const s2 = action(t, TC), r = TC.spawnEnemy(s2, 'rusher', null, { from: [200, 0, 0] }); let res = null;
    for (let i = 0; i < 120 * 6 && !res; i++) { s2.step(1 / 120, [C({ coverDown: !!(r.th && r.th.T - s2.t < .2) })]); for (const v of s2.drain()) if (v.type === 'slash') res = v.res; }
    t.check('cover blocks the rusher slash', res === 'blocked', res);
    // the sniper's laser is a threat
    const s3 = action(t, TC, { stage: 2, scene: '2-1' }); const sn = TC.spawnEnemy(s3, 'sniper', 'k1', { entry: 'stand' }); let laser = false; for (let i = 0; i < 120 * 5; i++) { s3.step(1 / 120, []); if (sn.laser > 0) laser = true; } t.check('the sniper lasers and threatens', laser);
    // drones fly and fall
    const s4 = action(t, TC, { stage: 3, scene: '3-1' }); const dr = TC.spawnEnemy(s4, 'drone', null, { from: [300, 0, 60] }); t.step(s4, 1); t.check('a drone flies', dr.alive && dr.vols && dr.vols.body); TC.damageEnemy(s4, dr, 5, s4.players[0], 'body', {}); t.step(s4, 3); t.check('a dead drone falls and is gone', !s4.enemies.includes(dr));
    // a jet ski races its path and leaves
    const s5 = action(t, TC, { stage: 1, scene: '1-4' }); const js = TC.spawnEnemy(s5, 'jetski', null, { route: [[1650, -300, -24], [1700, 0, -24], [1900, 40, -24]], speed: 200 }); t.step(s5, 1); t.check('a jet ski moves along its path', js.d > 100); t.step(s5, 4); t.check('a jet ski leaves at the end', !s5.enemies.includes(js));
    // the captor: shooting the hostage costs a life
    const s6 = action(t, TC, { stage: 2, scene: '2-4' }); const cp = TC.spawnEnemy(s6, 'captor', 'door', { hostage: 'tejada' }); t.step(s6, .2); const q = s6.players[0], l0 = q.lives, hv = cp.hvols.torso, aH = aimAt(TC, s6, TC.V3.lerp(hv.a, hv.b, .5)); t.step(s6, 1 / 120, [C({ firePressed: true, aim: aH })]); t.check('hitting the hostage costs a life', q.lives === l0 - 1);
  },
  threats(t) {
    const { TC } = t.load(), s = action(t, TC), p = s.players[0];
    const a = TC.requestThreat(s, 0, { always: true, tele: 1, kind: 'x' }), b = TC.requestThreat(s, 0, { always: true, tele: 1, kind: 'x' });
    t.check('minGap between impacts', a && b && b.T - a.T >= .35 - 1e-9, b && (b.T - a.T));
    const c = TC.requestThreat(s, 0, { chance: 1, tele: 1, kind: 'y' }); t.check('maxThreats caps chance threats', c === null);
    const l = p.lives; t.step(s, 1.1, [C()]); t.check('an exposed player is hit', p.lives === l - 1);
    p.inv = 0; const d = TC.requestThreat(s, 0, { always: true, tele: .5, kind: 'z' }); t.step(s, 1.2, [C({ coverDown: true })]); t.check('cover blocks a threat', d.result === 'blocked' && p.lives === l - 1);
    t.step(s, .5, [C()]);
    // pop-out protection: leaving cover with < .15 s left slides the impact
    t.step(s, .3, [C({ coverDown: true })]); p.inv = 0; const e = TC.requestThreat(s, 0, { always: true, tele: .5, kind: 'w' }); t.step(s, .4, [C({ coverDown: true })]); const T0 = e.T; t.step(s, .12, [C()]); t.check('pop-out protection slides the impact', e.slid && e.T > T0);
    // misses never damage
    const s2 = action(t, TC), q = s2.players[0], ln = q.lives, dh = TC.spawnEnemy(s2, 'deckhand', 'c1', { entry: 'stand' }); TC.tune.enemy.threatMul = 0; t.step(s2, 8, [C()]); TC.resetTune(); t.check('misses never damage', q.lives === ln && s2.events.concat([]).length >= 0);
    void dh;
  },
  projectiles(t) {
    const { TC } = t.load(), s = action(t, TC, { stage: 3, scene: '3-1' }), p = s.players[0];
    const ro = TC.spawnEnemy(s, 'rocketeer', 'g1', { entry: 'stand' }); let rk = null; for (let i = 0; i < 120 * 8 && !rk; i++) { s.step(1 / 120, [C()]); rk = s.projectiles.find(q => q.kind === 'rocket'); }
    t.check('a rocket is launched with its threat', rk && rk.th);
    if (rk) { const sc = p.score; const a = aimAt(TC, s, rk.pos); p.cool = 0; s.step(1 / 120, [C({ firePressed: true, aim: a })]); t.check('a rocket can be shot down', !rk.alive && p.score > sc); }
    const s2 = action(t, TC, { stage: 1, scene: '1-B' }); const q = s2.players[0], l = q.lives;
    const pr = s2.launch({ kind: 'torpedo', pos: [3000, 200, -24], vel: [0, 0, 0], life: 1, land: [2900, 0, -24], home: true, hp: 2 }); pr.th = TC.requestThreat(s2, 0, { always: true, tele: 1, kind: 'torpedo', src: pr.id, pos: () => pr.pos, unblockable: true });
    t.step(s2, 1.2, [C({ coverDown: true })]); t.check('cover does not stop a torpedo', q.lives === l - 1);
    const s3 = action(t, TC), en = TC.spawnEnemy(s3, 'deckhand', 'c3', { entry: 'stand' }), pl = s3.players[0], l3 = pl.lives; t.step(s3, .1); TC.explode(s3, [en.x, en.y, en.z + 10], 50, 8, 0, false, 'gl'); t.check('explosions hurt enemies, never players', !en.alive && pl.lives === l3);
  },
  objects(t) {
    const { TC } = t.load(), s = action(t, TC, { stage: 1, scene: '1-2' }), p = s.players[0];
    const b1 = TC.addObject(s, 'barrel', [300, 0, 0]), b2 = TC.addObject(s, 'barrel', [330, 0, 0]); TC.breakObject(s, b1, p); t.step(s, .5); t.check('barrels chain-explode', !b1.alive && !b2.alive);
    const s2 = action(t, TC, { stage: 2, scene: '2-1' }), win = s2.objects.find(o => o.kind === 'window'); TC.hitObject(s2, win, s2.players[0], 1, 'hg'); t.check('a breakable removes its collider', !win.alive && !win.col.alive);
    const s3 = action(t, TC), civ = TC.spawnEnemy(s3, 'civilian', null, { route: [[200, -40, 0], [260, -40, 0]] }); t.step(s3, .2); const q = s3.players[0], l = q.lives, sc0 = (q.score = 9000); TC.damageEnemy(s3, civ, 1, q, 'torso', {}); t.check('a civilian hit costs 5,000 and a life', q.lives === l - 1 && q.score === sc0 - 5000);
    const s4 = action(t, TC, { stage: 1, scene: '1-2' }); t.check('Rook is there in single player', s4.enemies.some(e => e.ally)); const ally = s4.enemies.find(e => e.ally), cam = s4.cameraFor(0), o = [cam.x, cam.y, cam.z], d = TC.V3.norm(TC.V3.sub(ally.vols.torso.b, o)); s4.drain(); s4.resolveRay({ o, d }, s4.players[0], TC.REG.weapon.hg, true); t.check('shots pass through allies (with a bark)', ally.alive && s4.drain().some(e => e.type === 'allyhit'));
    const bottle = s4.objects.find(o => o.kind === 'intel'); TC.hitObject(s4, bottle, s4.players[0], 1, 'hg'); t.check('a bottle is intel', s4.drain().some(e => e.type === 'intel'));
  },
  bosses(t) {
    const { TC } = t.load();
    for (const [st, sc, id, secs] of [[1, '1-B', 'stingray', 200], [2, '2-B', 'hammerhead', 200], [3, '3-B', 'scylla', 260]]) {
      const s = new TC.Sim({ mode: 'stage', stage: st, scene: sc, seed: 3, cheats: { god: true } }), bot = new TC.Autopilot('expert'), states = new Set();
      for (let i = 0; i < secs * 120 && s.phase !== 'clear' && s.phase !== 'done'; i++) { s.step(1 / 120, [bot.command(s, 0, 1 / 120)]); for (const e of s.drain()) if (e.type === 'bossstate') states.add(e.state); }
      t.check(id + ' is beaten by the expert bot', s.phase === 'clear' || s.phase === 'done', s.boss && s.boss.hpFrac().toFixed(2) + ' ' + [...states].join(','));
      if (id === 'hammerhead') t.check('hammerhead swaps the cover', states.has('sweep') && !!s.slotsAlt);
      if (id === 'scylla') t.check('scylla topples and Krake takes the final shot', states.has('topple') && states.has('krake'));
    }
    for (const [st, sc, id] of [[1, '1-3', 'bulldog'], [2, '2-3', 'gull'], [3, '3-2', 'seawolf'], [3, '3-4', 'seawolf2']]) {
      const s = new TC.Sim({ mode: 'stage', stage: st, scene: sc, seed: 3, cheats: { god: true } }); t.step(s, .5); s.boss = TC.makeBoss(s, id); t.check(id + ' spawns with a bar', s.boss.hpFrac() > .99, s.boss.hpFrac());
    }
  },
  coop(t) {
    const { TC } = t.load(), s = new TC.Sim({ mode: 'coop', stage: 1, scene: '1-1', seed: 5, players: [{}, {}] }); t.step(s, .5);
    const a = s.cameraFor(0), b = s.cameraFor(1); t.check('two players, two cameras', Math.hypot(a.x - b.x, a.y - b.y) > 20);
    t.step(s, .3, [C({ coverDown: true }), C()]); t.check('independent cover', s.players[0].c === 1 && s.players[1].c === 0);
    const qm = TC.spawnEnemy(s, 'quartermaster', null, { route: [[300, -60, 0], [300, 60, 0]], drop: 'mg' }); t.step(s, .1); TC.damageEnemy(s, qm, 5, s.players[1], 'torso', {}); t.check('pickups go to the killer', s.players[1].ammo.mg === 60 && s.players[0].ammo.mg === 0);
    const p0 = s.players[0]; p0.lives = 1; TC.hurtPlayer(s, p0, 'x'); t.step(s, .2); t.check('one player out: the other plays on', p0.out && s.phase === 'action');
    t.step(s, 1, [C({ firePressed: true }), C()]); t.check('co-op continue', !p0.out);
    const s3 = new TC.Sim({ mode: 'host', stage: 1, scene: '1-1', seed: 5, players: [{}, {}, {}, {}] }); t.check('four slots for the hub', s3.scene.slots.length === 4 && new Set([0, 1, 2, 3].map(i => Math.round(s3.slotPose(i, 0).y))).size === 4);
  }
};
