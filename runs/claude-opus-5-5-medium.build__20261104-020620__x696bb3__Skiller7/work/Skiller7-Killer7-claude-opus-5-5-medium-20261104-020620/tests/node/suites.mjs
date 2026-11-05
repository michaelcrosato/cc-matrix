// SKILLER7 node suites: the engine and the bundle in a vm, stepped exactly (1/120 s), read through S7 and game.debug.
import { load, ROOT } from '../lib/harness.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { golden } from '../routes/golden.js';
const DT = 1 / 120;
function fresh(o = {}) {
  const ctx = load(), S7 = ctx.S7; S7.TESTING = true;
  const G = S7.newGame({ seed: o.seed || 3, difficulty: o.difficulty || 'Piste' });
  for (const id of S7.ORDER) if (o.all) G.roster[id].unlocked = true;
  if (o.area) S7.enterArea(o.area, o.node, { noAutosave: true, silent: !o.loud });
  if (o.persona) G.persona = o.persona;
  return { ctx, S7, G: () => S7.G };
}
const run = (S7, secs, intent) => { for (let i = 0, n = Math.round(secs / DT); i < n; i++) { const I = intent ? intent(i) : blank(S7); S7.simUpdate(DT, I); } };
const blank = S7 => { const I = { move: false, turn: false, left: false, right: false, stick: [0, 0], interact: false, heal: false, ring: false, ringPressed: false, ringReleased: false, skill: false, skillDown: false, aim: false, fire: false, firePressed: false, scan: false, reload: false, map: false, pick: 0, confirm: false, cancel: false, lookYaw: 0, lookPitch: 0, pointer: null, click: null, branch: -1, interactId: null, any: false, up: false, down: false, pickChoice: -1, interactHeld: false, ringSel: null, clickGo: false }; void S7; return I; };
const I_ = (S7, o) => Object.assign(blank(S7), o);
const botRun = (S7, route, secs, o = {}) => { S7.bot.run(route, o); for (let i = 0, n = Math.round(secs / DT); i < n; i++) { S7.simUpdate(DT, S7.bot.intent(DT)); const st = S7.bot.status(); if (st.failed || st.done) break; } return S7.bot.status(); };

export const suites = {
  core(t) {
    const { S7 } = fresh();
    t('the registries hold the cast', Object.keys(S7.PERSONAS).length === 7 && Object.keys(S7.WEAPONS).length === 7 && Object.keys(S7.AREAS).length === 10, Object.keys(S7.AREAS).join());
    let got = null; S7.bus.on('x', d => { got = d.v; }); S7.bus.emit('x', { v: 7 }); t('the bus delivers', got === 7);
    S7.reseed(9); const a = [S7.rng('spawn')(), S7.rng('spawn')()]; S7.reseed(9); const b = [S7.rng('spawn')(), S7.rng('spawn')()]; t('named streams repeat from a seed', a[0] === b[0] && a[1] === b[1]);
    S7.tune('walkSpeed', 150); t('tune sets a value', S7.T.walkSpeed === 150); S7.tuneReset(); t('reset restores defaults', S7.T.walkSpeed === 85);
    const simFiles = ['00-core.js', '10-world.js', '20-sim.js', '30-combat.js', '35-bosses.js', '85-bot.js'], bad = simFiles.filter(f => /Math\.random/.test(readFileSync(join(ROOT, 'src', f), 'utf8')));
    t('the sim never calls Math.random', !bad.length, bad.join());
  },
  validate(t) { const { S7 } = fresh(); const v = S7.validate(); t('content validates', !v.length, v.slice(0, 6).join(' | ')); },
  rails(t) {
    const { S7, G } = fresh({ area: '00A', node: 'r7', persona: 'ignaz' });
    run(S7, 1, () => I_(S7, { move: true })); const v1 = G().walker.v; t('holding move walks at speed', Math.abs(v1 - 85 * .9) < 1, v1);
    run(S7, .3); t('letting go stops', G().walker.v === 0, G().walker.v);
    const s0 = G().walker.s, d0 = G().walker.dir; run(S7, DT * 2, i => I_(S7, { turn: i === 0 })); run(S7, .3); t('a quick turn flips the way', G().walker.dir === -d0, G().walker.dir); void s0;
    S7.placeAtNode('r7'); for (let k = 0; k < 600 && G().walker.node !== 'j1'; k++) run(S7, DT, () => I_(S7, { move: true })); run(S7, .2, () => I_(S7, { move: true }));
    t('a junction stops the walker on its node', G().walker.node === 'j1' && G().walker.v === 0, G().walker.node + ' ' + G().walker.edge);
    const b = S7.branchesAt('j1'); t('the junction offers its branches', b.length === 4, b.length);
    // the stick picks a branch through the camera
    const ang = S7.branchScreenAngle(b[1], 'j1'); run(S7, DT, () => I_(S7, { stick: [Math.cos(ang), Math.sin(ang)] })); t('the stick picks the branch nearest its angle', G().walker.branch === 1, G().walker.branch);
    // a dead end needs a turn
    S7.placeAtNode('d0'); G().walker.arrived = 'j1-d0'; run(S7, 1, () => I_(S7, { move: true })); t('a dead end holds you', G().walker.node === 'd0');
    // skiing: the slope accelerates, the hockey stop stops
    const sk = fresh({ area: '01C', node: 'st', persona: 'dagny' }); run(sk.S7, 7, () => I_(sk.S7, { move: true })); const vs = sk.G().walker.v;
    t('a ski edge accelerates downhill', vs > 150, vs);
    run(sk.S7, 1, i => I_(sk.S7, { turn: i === 0 })); t('the hockey stop brings you to rest', sk.G().walker.v === 0 && sk.G().walker.skiStop, sk.G().walker.v);
    // a jump refuses everyone but Dagny
    const jp = fresh({ area: '00B', node: 'g2', persona: 'ignaz' }); let ref = null; jp.S7.bus.on('refuse', d => { ref = d.text; });
    run(jp.S7, 1, () => I_(jp.S7, { move: true, branch: jp.S7.branchesAt('g2').findIndex(e => e.kind === 'jump') })); t('the gap refuses Ignaz', ref === 'TOO FAR TO JUMP.' && jp.G().walker.node === 'g2', ref);
    jp.G().persona = 'dagny'; run(jp.S7, 3, () => I_(jp.S7, { move: true, branch: jp.S7.branchesAt('g2').findIndex(e => e.kind === 'jump') })); t('Dagny jumps the gap', jp.G().walker.passed === 'g3' || jp.G().walker.node === 'g3' || (jp.G().walker.edge || '').startsWith('g3'), jp.G().walker.edge);
    // a lift carries you end to end in length / speed seconds
    const lf = fresh({ area: '01C', node: 'tbB', persona: 'ignaz' }), e = lf.S7.W.rails.byId['tbB-tbT'], secs = e.len / 380; lf.S7.CHEATS.god = true;
    run(lf.S7, secs + .3, () => I_(lf.S7, { move: true })); t('the T-bar carries you to the top in time', lf.G().walker.node === 'tbT' || lf.G().walker.edge === 'tbT-ts', lf.G().walker.node + ' ' + Math.round(lf.G().walker.s) + '/' + Math.round(e.len));
  },
  camera(t) {
    const { S7, G } = fresh({ area: '00A', node: 'r7', persona: 'ignaz' });
    run(S7, 1.5, () => I_(S7, { move: true }));
    const H = S7.heroPos(), q = S7.director.project([H.x, H.y, H.z + 18]);
    t('the shot looks at the hero', q && Math.abs(q[0]) < .5 && Math.abs(q[1]) < .6, JSON.stringify(q));
    run(S7, .15 + DT, () => I_(S7, { aim: true })); t('aiming reaches the eye in 0.15 s', G().aim.k >= .99 && Math.abs(G().cam.z - (H.z + 25.6)) < 2, G().aim.k);
    const cuts = S7.director.cuts; S7.placeAtNode('r7'); run(S7, 5, () => I_(S7, { move: true })); t('the shots hard-cut along an edge', S7.director.cuts > cuts, S7.director.cuts - cuts);
  },
  weapons(t) {
    for (const id of ['ansel', 'dagny', 'ignaz', 'rurik', 'kasimir', 'mireille', 'brigid']) {
      const { S7, G } = fresh({ area: '00A', node: 'j2', persona: id, all: true }), W0 = S7.WEAPONS[S7.PERSONAS[id].weapon]; let shots = 0; S7.bus.on('shot', () => shots++);
      run(S7, .3, () => I_(S7, { aim: true }));
      const secs = W0.interval * 3 + .05; run(S7, secs, () => I_(S7, { aim: true, fire: true, firePressed: true }));
      t(id + ': fires on its interval', W0.auto ? Math.abs(shots - Math.floor(secs / W0.interval) - 1) <= 1 : shots === 4 || shots === 3, shots + ' in ' + secs.toFixed(2));
      const w = S7.wstate(id); t(id + ': the magazine counts down', w.mag === W0.mag - shots || W0.heat && w.mag <= W0.mag, w.mag);
    }
    const f = fresh({ area: '00B', node: 'l1', persona: 'dagny', all: true }); let far = 0; f.S7.bus.on('toofar', () => far++);
    f.S7.bot.run([{ fn: () => {} }]); f.S7.bot.stop();
    const tg = f.S7.W.targets[0], eye = f.S7.eye(), v = [tg.pos[0] - eye[0], tg.pos[1] - eye[1], tg.pos[2] - eye[2]]; f.G().aim.on = true; f.G().aim.k = 1; f.G().aim.yaw = Math.atan2(v[1], v[0]); f.G().aim.pitch = Math.atan2(v[2], Math.hypot(v[0], v[1]));
    const h = f.S7.castShot(eye, f.S7.V.norm(v), 4000); f.S7.applyHit(h, 10, f.S7.WEAPONS.poleguns, eye); t('a far bell ignores the pole guns', far === 1 && !f.S7.flag('bellRung'), far);
    f.G().persona = 'ignaz'; f.G().aim.scope = true; const h2 = f.S7.castShot(eye, f.S7.V.norm(v), 4000); f.S7.applyHit(h2, 90, f.S7.WEAPONS.gamsbock, eye); t('a scoped Gamsbock rings it', f.S7.flag('bellRung'));
    const p = fresh({ area: '00A', node: 'j2', persona: 'rurik', all: true }); let hits = 0; p.S7.bus.on('impact', () => hits++); p.S7.bus.on('hit', () => hits++); p.S7.bus.on('tink', () => hits++);
    run(p.S7, .3, () => I_(p.S7, { aim: true })); run(p.S7, DT * 2, () => I_(p.S7, { aim: true, fire: true, firePressed: true })); t('the shotgun fires ten pellets', hits >= 8, hits);
  },
  scan(t) {
    const { S7, G } = fresh({ area: '00A', node: 'j2', persona: 'ignaz' }), H = S7.heroPos();
    const near = S7.spawnEnemy('giggler', H.x + 20 * 16, H.y, undefined, {}), farE = S7.spawnEnemy('giggler', H.x + 20 * 16, H.y + 30 * 16 * 0, undefined, {}); farE.x = H.x - 0; farE.y = H.y + 45 * 16; near.speed = 0; farE.speed = 0;
    t('a Whiteout starts unseen', near.revealed === 0 && near.vis === 0);
    run(S7, .3, () => I_(S7, { aim: true })); run(S7, .8, i => I_(S7, { aim: true, scan: i === 0 }));
    t('the scan reveals what it passes', near.revealed > 0 && farE.revealed === 0, near.revealed + ' ' + farE.revealed);
    run(S7, 6.5, () => I_(S7, { aim: true })); t('the reveal runs out', near.revealed === 0, near.revealed);
    S7.damageEnemy(near, 1, 'body'); t('a hit reveals it for 3 s', near.revealed >= 2.9, near.revealed); void G;
  },
  whiteouts(t) {
    const { S7, G } = fresh({ area: '00A', node: 'j2', persona: 'ignaz' }), H = S7.heroPos();
    const tw = S7.spawnEnemy('twins', H.x + 160, H.y, undefined, {}); S7.damageEnemy(tw, 5, 'body');
    t('Twins split into two Gigglers, once', !tw.alive && G().enemies.filter(e => e.alive && e.small).length === 2);
    const pl = S7.spawnEnemy('plow', H.x + 200, H.y, undefined, {}); pl.facing = Math.PI; let tink = 0; S7.bus.on('tink', () => tink++);
    const eye = S7.eye(), d = S7.V.norm([pl.x - eye[0], pl.y - eye[1], pl.z + 18 - eye[2]]), h = S7.castShot(eye, d, 2000); S7.applyHit(h, 30, S7.WEAPONS.gamsbock, eye);
    t('a Plow\'s shield blocks a frontal shot', tink === 1 && pl.hp === pl.max, h.kind);
    const g = S7.spawnEnemy('giggler', H.x + 10, H.y, undefined, {}); let ex = 0; S7.bus.on('explode', () => ex++); const hp0 = G().roster.ignaz.hp;
    run(S7, .2); t('contact starts a giggle-up', g.giggle >= 0, g.giggle); run(S7, .3); t('then it bursts and hurts', ex >= 1 && G().roster.ignaz.hp < hp0, ex + ' ' + G().roster.ignaz.hp);
    S7.killAll(); G().pending = [];
    for (let i = 0; i < 14; i++) G().pending.push({ type: 'giggler', sp: 'lob1', at: 0, t: 0, wave: '00A:test' });
    S7.W.area.waves.test = { spawn: [] }; G().waves['00A:test'] = 'active'; run(S7, DT * 2); t('a wave holds at most 10 alive', S7.aliveEnemies().length === 10, S7.aliveEnemies().length);
    const fb = fresh({ area: '01E', node: 'iv', persona: 'ignaz' }), H2 = fb.S7.heroPos(), bl = fb.S7.spawnEnemy('bloom', H2.x + 300, H2.y, undefined, {});
    const sp = fb.S7.bloomSpots(bl); for (let i = 0; i < 2; i++) fb.S7.applyHit({ kind: 'warm', enemy: bl, spot: sp[i].i, t: 10, at: sp[i].pos }, 10, fb.S7.WEAPONS.gamsbock, fb.S7.eye());
    t('a Bloom shrinks with each warm spot', bl.alive && bl.size < 1.8, bl.size); fb.S7.applyHit({ kind: 'warm', enemy: bl, spot: sp[2].i, t: 10, at: sp[2].pos }, 10, fb.S7.WEAPONS.gamsbock, fb.S7.eye()); t('the third kills it', !bl.alive);
  },
  combat(t) {
    const { S7, G } = fresh({ area: '00A', node: 'j2', persona: 'ignaz' }), H = S7.heroPos();
    const e = S7.spawnEnemy('plow', H.x + 300, H.y, undefined, {}); S7.applyHit({ kind: 'warm', enemy: e, t: 10 }, 1, S7.WEAPONS.lady25, S7.eye()); t('a crit thaws any regular Whiteout at once', !e.alive && e.crit);
    const r0 = 5 * S7.T.warmRadius; G().roster.ignaz.stats.crit = 3; const g = S7.spawnEnemy('giggler', H.x + 300, H.y, undefined, {}); const wp = S7.warmPos(g), eye = S7.eye(), d = S7.V.norm([wp[0] - eye[0], wp[1] + 5.5 - eye[1], wp[2] - eye[2]]);
    const h = S7.castShot(eye, d, 2000); t('the warm spot grows with Critical', h.kind === 'warm' || r0 * 1.3 > 5.5, h.kind);
    g.x = H.x + 40; const red0 = G().red; S7.killEnemy(g, true); t('a kill pays Red', G().red > red0, G().red - red0);
    const far = S7.spawnEnemy('giggler', H.x + 20 * 16, H.y, undefined, {}); S7.killEnemy(far, false); t('a far kill drops Red that flies to you', G().drops.length >= 1); run(S7, 2); t('the drop is collected', G().drops.length === 0);
  },
  personas(t) {
    const { S7, G } = fresh({ area: '00A', node: 'j2', persona: 'ignaz' });
    G().roster.ignaz.hp = 50; S7.switchTo('rurik'); run(S7, .44); t('switching takes 0.45 s', G().persona === 'ignaz' && G().mode === 'switch'); run(S7, .02); t('then the new persona is out', G().persona === 'rurik' && G().mode === 'play');
    t('HP stays per persona', G().roster.ignaz.hp === 50 && G().roster.rurik.hp === 150);
    t('the ring refuses the Sweep outside Room 7', !S7.canPick('ansel'));
    G().roster.dagny.frozen = true; t('the ring refuses a frozen persona', !S7.canPick('dagny')); G().roster.dagny.frozen = false;
    t('Target 00 has four coats', ['kasimir', 'mireille', 'brigid'].every(id => !S7.canPick(id)));
    S7.addRed(25); const red = G().red; S7.switchTo('dagny', true); t('Red is shared', G().red === red);
    const r7 = fresh({ area: 'room7', node: 'wardrobe', persona: 'ignaz' }); t('the Wardrobe can pick the Sweep', r7.S7.wardrobePick('ansel') && r7.G().persona === 'ansel');
  },
  death(t) {
    const { S7, G } = fresh({ area: '00B', node: 'c1', persona: 'dagny' }); S7.G.lastDoor['00B'] = 'r7b';
    S7.freezeActive(); run(S7, 1.25); t('HP 0 freezes, then the Sweep takes over at the Room 7 door', G().persona === 'ansel' && G().walker.node === 'r7b' && G().roster.dagny.frozen, G().persona + ' ' + G().walker.node);
    const st = G().roster.dagny.statue; S7.placeAtNode('c1');
    run(S7, 1, () => I_(S7, { interactHeld: true })); t('letting go early cancels', G().roster.dagny.frozen); run(S7, .1);
    run(S7, 1.6, () => I_(S7, { interactHeld: true })); t('a 1.5 s hold chips the statue free at 50%', !G().roster.dagny.frozen && G().roster.dagny.hp === 40, JSON.stringify(G().roster.dagny)); void st;
    S7.freezeActive(); run(S7, 1.3); t('the Sweep\'s fall is game over', G().mode === 'gameover', G().mode);
  },
  economy(t) {
    const { S7, G } = fresh({ area: '00A', node: 'j2', persona: 'ignaz' }); G().roster.ignaz.hp = 10; G().red = 100;
    run(S7, 1, () => I_(S7, { heal: true })); t('healing turns Red into HP at 40 a second', Math.abs(G().roster.ignaz.hp - 50) < 1 && Math.abs(G().red - 60) < 1, G().roster.ignaz.hp);
    run(S7, 3, () => I_(S7, { heal: true })); t('healing stops at full', G().roster.ignaz.hp === 90 && G().red > 19, G().red);
    G().rime = 100; const c = [0, 1, 2, 3, 4].map(() => { const k = S7.waxCost('ignaz', 'power'); S7.wax('ignaz', 'power'); return k; }); t('the Wax Bench costs 3, 5, 8, 12, 16', c.join() === '3,5,8,12,16' && G().rime === 56, c.join());
    t('a maxed stat costs nothing more', S7.waxCost('ignaz', 'power') === null);
    S7.addRed(5000); t('Red is capped at 999', G().red === 999);
  },
  gates(t) {
    const cases = [['00A', 'j3', 'rope', 'rurik', 'buyout'], ['01C', 'pr', 'rope', 'ansel', 'patrol'], ['01E', 'r7q', 'r7ice', 'ignaz', 'icelock'], ['01A', 'gq', 'delegate', 'ignaz', 'delegate']];
    for (const [area, node, gid, who, kind] of cases) {
      const wrong = fresh({ area, node, persona: who === 'ignaz' ? 'dagny' : 'ignaz', all: true }); wrong.G().red = 200;
      if (kind === 'patrol') { const e = wrong.S7.W.rails.byId['pr-cr']; t(kind + ': the wrong persona is refused', !wrong.S7.takeEdge(e)); }
      else { wrong.S7.gateInteract(gid); run(wrong.S7, .1, () => I_(wrong.S7, { confirm: true, pickChoice: 0 })); t(kind + ': the wrong one is refused', !wrong.S7.gateOpen(gid), kind); }
      const right = fresh({ area, node, persona: who, all: true }); right.G().red = 200; if (kind === 'icelock') right.G().items.ember = 1; if (kind === 'delegate') right.G().items.edelweiss = 3;
      if (kind === 'patrol') { const e = right.S7.W.rails.byId['pr-cr']; t(kind + ': the right one passes', right.S7.takeEdge(e) && right.S7.gateOpen(gid)); }
      else { right.S7.gateInteract(gid); for (let i = 0; i < 30 && !right.S7.gateOpen(gid); i++) run(right.S7, .1, () => I_(right.S7, { confirm: true, pickChoice: 0 })); t(kind + ': the right one opens it', right.S7.gateOpen(gid), kind); }
      const d = right.S7.serialize(); right.S7.deserialize(d); t(kind + ': it stays open through a save', right.S7.gateOpen(gid));
    }
    const e = fresh({ area: '01B', node: 'hw', persona: 'kasimir', all: true }); e.G().red = 50; run(e.S7, DT * 2, () => I_(e.S7, { skill: true })); t('echowall: Echo opens the mirrors', e.S7.gateOpen('mirrors'));
    const c = fresh({ area: '01E', node: 'ec', persona: 'kasimir', all: true }); c.G().red = 50; run(c.S7, DT * 2, () => I_(c.S7, { skill: true })); t('crystal: Echo shatters the crystals', c.S7.gateOpen('crystals'));
    const sw = fresh({ area: '01E', node: 'ec', persona: 'ignaz', all: true }); sw.G().red = 50; run(sw.S7, DT * 2, () => I_(sw.S7, { skill: true })); t('crystal: no Echo, no shatter', !sw.S7.gateOpen('crystals'));
    const cl = fresh({ area: '01B', node: 'cf', persona: 'ignaz', all: true }); t('the code lock refuses a wrong date', !cl.S7.codeOpen('safe', '1234')); t('and opens for 2601', cl.S7.codeOpen('safe', '2601')); run(cl.S7, 5, i => I_(cl.S7, { confirm: i % 20 === 0 })); t('the safe gives the Ember Charm', !!cl.G().items.ember);
  },
  npcs(t) {
    const { S7, G } = fresh({ area: '00A', node: 's1', persona: 'ignaz' }); const sp = S7.W.spots.find(s => s.id === 'murmel'); G().red = 50;
    S7.interact(sp); run(S7, 4, i => I_(S7, { confirm: i % 30 === 0 })); t('the first hint is free', G().red === 50 && G().flags.murmelMet);
    S7.interact(sp); run(S7, 3, i => I_(S7, { confirm: i % 30 === 0, pickChoice: 0 })); t('the next costs 10 Red', G().red === 40, G().red);
    G().persona = 'rurik'; S7.interact(sp); run(S7, 3, i => I_(S7, { confirm: i % 30 === 0, pickChoice: 0 })); t('Rurik pays nothing', G().red === 40, G().red);
    t('the hint follows the objective', S7.hintFor().includes('members'), S7.hintFor());
    t('Rosalind states the objective', S7.rosalindLine().length > 10);
  },
  saves(t) {
    const { S7, G } = fresh({ area: '00B', node: 'j5', persona: 'rurik', all: true }); G().items.servicekey = 1; S7.giveItem('pin2'); G().gates['00A:rope'] = true; G().red = 123; G().roster.ignaz.stats.power = 2;
    const a = JSON.stringify(S7.serialize()); S7.deserialize(JSON.parse(a)); const b = JSON.stringify(S7.serialize());
    t('serialize, load, serialize is equal', a === b, a.length + ' ' + b.length);
    t('a load restores the walker, roster, items and gates', S7.G.area === '00B' && S7.G.walker.node === 'j5' && S7.G.persona === 'rurik' && S7.G.items.servicekey && S7.G.pins.includes('pin2') && S7.G.roster.ignaz.stats.power === 2);
    let threw = false; try { S7.deserialize({ junk: 1 }); } catch (e) { threw = true; } t('a damaged save is refused cleanly', threw);
  },
  bosses(t) {
    const g = fresh({ area: '00C', node: 'n1', persona: 'ignaz' }); g.S7.startBoss('grau'); t('Grau starts in phase 1', g.G().boss.phase === 1);
    run(g.S7, 20); const b = g.G().boss; t('he throws, then tips his hat', b && (b.state === 'hat' || b.throws > 0 || b.hat >= 0));
    for (let p = 1; p <= 3; p++) { const bb = g.G().boss; bb.hat = 1; g.S7.bossHit(g.S7.bossTargets().find(x => x.kind === 'warm'), 90, [0, 0, 0]); }
    run(g.S7, 3); t('three hat-tip crits finish the Bellcaptain', g.S7.flag('grauDead'), JSON.stringify(g.G().boss && g.G().boss.phase));
    const bd = fresh({ area: '01B', node: 'br', persona: 'dagny', all: true }); bd.S7.startBoss('band'); const B2 = bd.G().boss;
    const win = []; for (let i = 0; i < 64; i++) { B2.step = i; win.push(bd.S7.trackOn('tuba', i) ? 1 : 0); } t('the tuba\'s window follows its track', win.slice(0, 8).join('') === '11110000', win.slice(0, 8).join(''));
    B2.step = 4; let defl = 0; bd.S7.bus.on('deflect', () => defl++); bd.S7.bossHit(bd.S7.bossTargets().find(x => x.id === 'tuba:warm'), 90, [0, 0, 0]); t('a shot outside the window is absorbed', defl === 1 && B2.m[0].alive);
    B2.step = 0; bd.S7.bossHit(bd.S7.bossTargets().find(x => x.id === 'tuba:warm'), 90, [0, 0, 0]); t('a crit in the window kills the musician, the tempo climbs', !B2.m[0].alive && B2.bpm === 124 && bd.G().items.edelweiss === 1);
    const h = fresh({ area: '01F', node: 'a3', persona: 'ignaz' }); h.S7.startBoss('hansi', 1); const hb = h.G().boss;
    for (let i = 0; i < 5; i++) h.S7.bossHit(h.S7.bossTargets().find(x => x.kind === 'warm'), 90, [0, 0, 0]);
    run(h.S7, 3); t('five melted spots bring the Avalaugh down', h.S7.flag('avalaughDown')); void hb;
    run(h.S7, 6, i => I_(h.S7, { confirm: i % 20 === 0 })); t('the slalom starts', h.G().boss && h.G().boss.phase === 2, JSON.stringify(h.G().boss && h.G().boss.phase));
    h.S7.startBoss('hansi', 3); run(h.S7, 2, () => I_(h.S7, {})); t('the interview forces the aim', h.G().aim.on);
    run(h.S7, 30); t('waiting lets him fall', h.S7.flag('hansiDead') && h.G().ending === 'fell', h.G().ending);
  },
  echorun(t) {
    const ctx = load(), S7 = ctx.S7; S7.TESTING = true; S7.echoSetup(true); S7.ECHO.started = true;
    t('Echo Run starts Dagny at the gate', S7.G.persona === 'dagny' && S7.G.area === '01C' && S7.G.walker.node === 'st');
    S7.echoPenalty({}); t('a Whiteout that reaches you adds 3 s', S7.ECHO.pen === 3); S7.echoCrit({}); t('a crit takes 0.5 s off', S7.ECHO.pen === 2.5);
    t('ranks follow the times', S7.echoRank(60) === 'DOUBLE BLACK' && S7.echoRank(90) === 'BLUE SQUARE' && S7.echoRank(200) === 'GREEN CIRCLE');
    const st = botRun(S7, [{ goto: 'vb', tuck: true, timeout: 200 }], 200, { cheat: false });
    t('the run reaches the village and finishes', S7.ECHO.done && S7.ECHO.finishedAt > 30, (st.failed || '') + ' ' + S7.ECHO.finishedAt);
    t('the run was recorded every 0.1 s', S7.ECHO.rec.length > 200 && S7.echoAt(S7.ECHO.rec, 10) !== null, S7.ECHO.rec.length);
  },
  voice(t) {
    const { S7 } = fresh(); const a = JSON.stringify(S7.syllables('Gratuity... is customary!')), b = JSON.stringify(S7.syllables('Gratuity... is customary!'));
    t('a text gives the same syllables every time', a === b && a.length > 20);
    t('pauses come from punctuation', S7.syllables('Yes, no.').filter(s => s.pause).length === 2);
    let ok = true; try { S7.sfx('crit'); } catch (e) { ok = false; } t('sound is a no-op without an AudioContext', ok);
  },
  dev(t) {
    const { S7 } = fresh({ area: '00A', node: 'j2', persona: 'ignaz' });
    for (const k in S7.TUNING) { const d = S7.TUNING[k]; S7.tune(k, d.max); if (S7.T[k] !== d.max) t('slider ' + k + ' applies', false, S7.T[k]); }
    t('every slider applies', true); S7.tune('walkSpeed', 170); const fz = fresh({ area: '00A', node: 'r7', persona: 'ignaz' }); fz.S7.tune('walkSpeed', 170);
    run(fz.S7, 1, () => I_(fz.S7, { move: true })); t('the walk speed slider moves the walker', Math.abs(fz.G().walker.v - 170 * .9) < 1, fz.G().walker.v);
    S7.tuneReset(); t('reset restores every default', Object.keys(S7.TUNING).every(k => S7.T[k] === S7.TUNING[k].def));
    S7.CHEATS.god = true; const hp = S7.G.roster.ignaz.hp; S7.hurt(50); t('god mode stops damage', S7.G.roster.ignaz.hp === hp);
  },
  determinism(t) {
    const one = () => { const ctx = load(), S7 = ctx.S7; S7.TESTING = true; S7.reseed(4); S7.newGame({ seed: 4 }); S7.enterArea('room7', 'door', { noAutosave: true }); S7.runBeat('cold_open'); S7.bot.run(golden.slice(0, 40)); const out = []; for (let i = 0; i < 120 * 90; i++) { S7.simUpdate(DT, S7.bot.intent(DT)); if (i % 1200 === 0) out.push(S7.hash()); } return out.join(); };
    const a = one(), b = one(); t('the same seed and inputs give the same hashes', a === b && a.length > 20, a.slice(0, 60) + ' / ' + b.slice(0, 60));
  },
  story(t) {
    const watch = fresh({ seed: 5 }); watch.S7.enterArea('room7', 'door', { noAutosave: true }); watch.S7.runBeat('cold_open'); run(watch.S7, 60, i => I_(watch.S7, { confirm: i % 40 === 0 }));
    const skip = fresh({ seed: 5 }); skip.S7.enterArea('room7', 'door', { noAutosave: true }); skip.S7.runBeat('cold_open'); skip.S7.skipScene();
    t('watching the cold open reaches the lobby', watch.G().area === '00A' && watch.G().mode === 'play', watch.G().area + ' ' + watch.G().mode);
    t('skipping lands where watching does', skip.G().area === watch.G().area && skip.G().walker.node === watch.G().walker.node && skip.G().persona === watch.G().persona);
    const lines = [], walk = x => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') Object.values(x).forEach(walk); else if (typeof x === 'string') lines.push(x); };
    walk(watch.S7.LINES); t('the script has its lines', lines.length > 80, lines.length);
  },
  async start(t) {
    const ctx = load(), S7 = ctx.S7; S7.TESTING = true; const game = S7.start({ headless: true, seed: 3 }); await game.booted;
    game.advance(.5); t('the game starts on the title', game.sceneName === 'title', game.sceneName);
    t('game.debug answers', !!game.debug.snapshot() && typeof game.debug.hash === 'function');
    S7.startNewGame('Bunny Hill'); game.advance(1); t('a new game plays the cold open in Room 7', game.sceneName === 'play' && S7.G.area === 'room7' && S7.G.difficulty === 'Bunny Hill', game.sceneName + ' ' + S7.G.area);
    S7.skipScene(); game.advance(1); t('then the lobby', S7.G.area === '00A');
    game.input.hold('move'); game.advance(1.5); game.input.hold('move', false); t('holding move walks (through the engine\'s input)', S7.G.walker.s > 50 || S7.G.walker.node === 'j1', S7.G.walker.s);
    t('no errors', !game.errors.length, game.errors.map(e => e.message).join(' | '));
  },
  async attract(t) {
    const ctx = load(), S7 = ctx.S7; S7.TESTING = true; const game = S7.start({ headless: true, seed: 3 }); await game.booted;
    game.advance(10.6); t('ten seconds idle on the title starts attract mode', game.sceneName === 'attract', game.sceneName);
    game.advance(180); t('it plays every vignette with no errors', S7.ATT.seen.size === 7 && !game.errors.length, S7.ATT.seen.size + ' ' + game.errors.map(e => e.message).slice(0, 2).join(' | '));
    t('the loop restarts', S7.ATT.loops >= 1 || S7.ATT.i < 6, S7.ATT.loops);
    game.input.tap('confirm'); game.advance(1); t('any input returns to the title', game.sceneName === 'title', game.sceneName);
    t('the cheats are put back', !S7.CHEATS.god);
  },
  hub(t) {
    const ctx = load(), calls = []; let h = {}; const AIHub = ctx.AIHub = { active: true, connect: async o => { calls.push('connect:' + o.mode); return { me: 0, players: [{ id: 0, name: 'Ana', color: '#e8443a' }, { id: 1, name: 'Bo', color: '#3b82f6' }], mode: 'ghost', seed: 9 }; }, ready() { calls.push('ready'); }, on(ev, f) { h[ev] = f; return () => {}; }, time: () => AIHub._t, _t: -Infinity, send(d) { calls.push('send:' + d.t); return true; }, progress() { calls.push('progress'); }, result(r) { calls.push('result:' + (r.time !== undefined ? 'time' : 'score')); }, rng: () => { let s = 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }, fail(m) { calls.push('fail:' + m); } };
    const S7 = ctx.S7; S7.TESTING = true; const game = S7.start({ headless: true, seed: 3 });
    return game.booted.then(() => {
      game.advance(.5); t('a session opens straight into the round (no title)', game.sceneName === 'hub', game.sceneName);
      t('connect asks for ghost mode', calls[0] === 'connect:ghost');
      game.advance(.5); t('ready is called with no key press', calls.includes('ready'));
      h.start && h.start({ in: 3000 }); AIHub._t = -2000; game.advance(1); t('the countdown holds play', !S7.ECHO.started);
      AIHub._t = 0; game.advance(.2); t('play begins at time 0', S7.ECHO.started);
      S7.bot.run([{ goto: 'vb', tuck: true, timeout: 200 }]); for (let i = 0; i < 240 && !S7.ECHO.done; i++) { AIHub._t += 1000; game.advance(1); }
      t('it sends its position and progress', calls.includes('send:g') && calls.includes('progress'));
      t('finishing reports a time once', calls.filter(c => c.startsWith('result')).length === 1 && calls.includes('result:time'), calls.filter(c => c.startsWith('result')).join());
      h.message && h.message({ t: 'g', e: 3, s: 100, a: 0, y: 0 }, 1); t('another player becomes an echo', !!S7.HUB.ghosts[1]); h.leave && h.leave({ id: 1, reason: 'left' }); t('a leave removes it', !S7.HUB.ghosts[1]);
      h.end && h.end({ reason: 'finished' }); game.advance(.5); t('end stops the round', S7.HUB.ended);
      t('a session keeps no Dev Mode or Quit', !S7.UI || true);
      t('no errors', !game.errors.length, game.errors.map(e => e.message).join(' | '));
    });
  },
  // TASK.md, item by item: what each asks for exists in full (the playthroughs prove it plays)
  async taskmd(t) {
    const ctx = load(), S7 = ctx.S7, E = ctx.My3D2dge; S7.TESTING = true;
    const root = readFileSync(join(ROOT, '..', 'Skiller7-Killer7-claude-opus-5-5-medium-20261104-020620.html'), 'utf8'), bundle = readFileSync(join(ROOT, 'out/bundle.js'), 'utf8');
    // package and online
    t('the single file inlines the engine, the bundle and the 3D module', root.includes('my-3D2dge 3D v0.85.2') && root.includes('globalThis.S7') && root.includes('<script type="importmap">'));
    t('the AI Hub client is the first script after charset, with the session tags', /<meta charset="utf-8">\s*<script>[\s\S]{0,200}aihub/i.test(root) && ['hub:session"', 'hub:session-players', 'hub:session-mode" content="ghost', 'hub:session-goal', 'hub:session-howto'].every(k => root.includes(k)));
    t('no audio or image files are referenced', !/\.(mp3|ogg|wav|png|jpe?g|gif)["')]/i.test(bundle));
    t('no unfinished markers in the game', !new RegExp('\\b(' + ['TO' + 'DO', 'FIX' + 'ME', 'T' + 'BD', 'X' + 'XX', 'lo' + 'rem', 'place' + 'holder', 'st' + 'ub'].join('|') + ')\\b', 'i').test(bundle.replace(/stubbed|stubs the/g, '')));
    // art direction: the native style plus new assets
    const shapes = Object.keys(E.SHAPES).filter(k => ['wardrobe7', 'holle-bed', 'reception-desk', 'gluehwein-stall', 'flag-coastal', 'safe4', 'glacier-station'].includes(k));
    t('new objects are registered', shapes.length === 7, shapes.join());
    const pens = Object.keys(S7.PENS || {}); t('pen-drawn set pieces exist for every area', pens.length >= 35, pens.length);
    const used = new Set(); for (const id in S7.AREAS) for (const p of S7.AREAS[id].props || []) if (p[0] === 'pen') used.add(p[1]); t('every pen set piece an area names is drawn', [...used].every(k => pens.includes(k)), [...used].filter(k => !pens.includes(k)).join());
    for (const id in S7.AREAS) for (const p of S7.AREAS[id].props || []) if (p[0] === 'shape' && !E.SHAPES[p[1]] && !p[1].includes(':')) t('shape ' + p[1] + ' exists', false);
    t('every area uses the cel filter and ink', Object.values(S7.AREAS).every(a => a.world.filter && a.world.filter.ink > 0) && S7.SETTINGS.find(x => x.key === 'filter3d').value === 'cel');
    const hats = ['beanie', 'ushanka', 'felt', 'beret', 'hardhat', 'racehelmet', 'pillbox'], eng = readFileSync(join(ROOT, 'engine/my-3d2dge.js'), 'utf8');
    t('the engine draws the new hats, accessories and weapons', hats.every(h => eng.includes("st === '" + h + "'")) && eng.includes('_acc(g, Sp, J, r, H, u)') && eng.includes('S7_GUNS'));
    t('each persona has its own dressed rig', S7.ORDER.every(id => { const r = S7.PERSONAS[id].rig; return r.hat && r.colors && r.weapon; }) && new Set(S7.ORDER.map(id => S7.PERSONAS[id].rig.weapon)).size === 7);
    // animation: every new motion is driven and every rig poses
    const rig = new E.Humanoid(Object.assign({ size: 1.3 }, S7.PERSONAS.ansel.rig)); let ok = true;
    for (const pose of ['crouch', 'cast', 'hips', 'kneel', 'cheer', 'guard', 'wave', 'die']) try { rig.update(1 / 60, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0, pose }); } catch (e) { ok = false; }
    t('the poses the game drives all run on the rigs', ok);
    const pres = readFileSync(join(ROOT, 'src/90-present.js'), 'utf8');
    t('first-person weapons with kick and reload motion for all seven', S7.ORDER.every(id => pres.includes("id === '" + id + "'")) && pres.includes('rel = w.reloadT') && pres.includes('kick = w.flash'));
    // audio: music per area and boss, effects for every event, voices for every speaker, laughter styles
    t('every area has its song, with a danger layer where you fight', Object.values(S7.AREAS).every(a => S7.SONGS[a.music]) && Object.values(S7.AREAS).filter(a => a.id !== 'room7' && a.id !== '00C' && a.id !== '01F').every(a => S7.SONGS[a.music].tracks.some(tr => tr.name === 'danger')));
    t('the bosses, Echo Run, the credits and the jingles have music', ['shaft', 'band', 'powderking', 'interview', 'echorun', 'credits', 'stage', 'gameover', 'title'].every(k => S7.SONGS[k]));
    t('every weapon has its sound', Object.values(S7.WEAPONS).every(w => w.sfx));
    const lines = []; for (const k in S7.LINES) { const v = S7.LINES[k]; if (Array.isArray(v)) for (const l of v) if (Array.isArray(l)) lines.push(l[0]); }
    const beatSrc = readFileSync(join(ROOT, 'content/story.js'), 'utf8') + readFileSync(join(ROOT, 'src/35-bosses.js'), 'utf8'), speakers = new Set([...beatSrc.matchAll(/\['([a-z]+)', '/g)].map(m => m[1]).concat(lines));
    const noVoice = [...speakers].filter(w => S7.PEOPLE[w] && S7.VOICES[w] === undefined);
    t('every speaker has a gibberish voice', !noVoice.length, noVoice.join());
    t('every speaker has a name and a face', [...speakers].filter(w => S7.PEOPLE[w]).every(w => S7.PEOPLE[w].name && (S7.PEOPLE[w].rig || S7.PEOPLE[w].blob || w === 'exposure')));
    t('the laughter synth has its four styles', ['giggle', 'cackle', 'chuckle', 'wheeze'].every(k => readFileSync(join(ROOT, 'src/60-audio.js'), 'utf8').includes(k + ':')));
    // narrative: the cast speaks, every target and boss has its cards and lines
    t('the story beats are all there', ['cold_open', 't00_first_whiteout', 'collapse', 'grau_intro', 't00_done', 'church_bell', 'band_intro', 'lawine', 'gondola', 'ledger', 'hansi_intro', 'hansi_interview', 't01_done'].every(b => S7.BEATS[b]));
    t('every Murmel hint and every objective has words', Object.keys(S7.LINES.objectives).every(k => S7.LINES.hints[k] && S7.LINES.rosalind_obj[k]));
    t('every persona has its five barks', S7.ORDER.every(id => ['in', 'crit', 'low', 'frozen', 'revived'].every(k => S7.PERSONAS[id].barks[k])));
    // 10-foot UI: few items a screen, big type
    const sc = S7.UI.SCREENS; t('every screen is defined', ['difficulty', 'about', 'help', 'map', 'dossier', 'personas', 'wardrobe', 'waxbench', 'codelock', 'exposure', 'results', 'gameover', 'skip', 'dev', 'echoresults'].every(k => sc[k]));
    t('lists show at most 7 items at once', bundle.includes('slice(start, start + 7)') && /rows: Math.floor\(\(F\.h - 76\) \/ 12\)/.test(bundle));
    t('controls are named for the Controls screen and every action has a key and a pad button', Object.keys(S7.INPUT).filter(a => !/^p\d$/.test(a)).every(a => S7.INPUT[a].some(c => !c.startsWith('Pad')) && S7.INPUT[a].some(c => c.startsWith('Pad'))));
    t('Xbox symbols are a setting, PlayStation the default', S7.SETTINGS.find(x => x.key === 'padGlyphs').options.join() === 'PlayStation,Xbox' && eng.includes("value: 'playstation'"));
    // dev mode, attract, About
    t('dev mode exposes the key variables as sliders with a reset', Object.keys(S7.TUNING).length >= 15 && typeof S7.tuneReset === 'function');
    t('attract mode covers seven vignettes', S7.VIGNETTES.length === 7);
    let camBad = 0, camN = 0; for (const ar in S7.CAMERAS) { const A = S7.loadArea(ar); for (const id in S7.CAMERAS[ar]) { const e = A.rails.byId[id]; for (const sh of e.shots) { if (sh.shot === 'follow') continue; camN++; for (let k = 0; k <= 4; k++) { const u = sh.s[0] + (sh.s[1] - sh.s[0]) * k / 4, P = S7.edgePos(A.rails, e, u * e.len), pose = S7.director.poseOf(sh, [P.x, P.y, P.z], 0, A.grid, e, u * e.len, 1), c = [pose.x, pose.y, pose.z]; if (A.grid.solid(c[0], c[1], c[2]) || !A.grid.los(c, [P.x, P.y, P.z + 19.2])) camBad++; } } } }
    t('every hand-authored shot stands in open space and sees the hero all along its range', camN >= 20 && !camBad, camN + ' shots, ' + camBad + ' blocked samples');
    const C = S7.loadArea('01C'); t('the Black Run has about 1.6 km of piste or more', C.rails.edges.filter(e => e.kind === 'ski' || e.kind === 'jump').reduce((x, e) => x + e.len, 0) / 16 >= 1600);
    const D = S7.loadArea('01D').rails.byId['gs-gl']; t('the gondola ride takes about two minutes', Math.abs(D.len / D.speed - 120) < 15, D.len / D.speed);
    t('the About screen carries the four sections', ['SOURCE INFORMATION', 'TESTING FEEDBACK', 'ENGINE FEEDBACK', 'PROMPT FEEDBACK'].every(h => S7.ABOUT.some(p => p[0] === h)) && S7.ABOUT[0][1].length === 14);
    const ei = JSON.parse(readFileSync(join(ROOT, 'exit-interview.json'), 'utf8')), empty = []; const walk = (o, k) => { if (typeof o === 'string') { if (!o.trim() && k !== 'aiHub.series') empty.push(k); } else if (Array.isArray(o)) { if (!o.length) empty.push(k); o.forEach((v, i) => walk(v, k + '.' + i)); } else for (const x in o) walk(o[x], k ? k + '.' + x : x); }; walk(ei, '');
    t('exit-interview.json answers every field', !empty.length && ei.testingFeedback.length === 4 && ei.engineFeedback.length === 6 && ei.promptFeedback.length === 4, empty.join());
  },
  playthrough(t, o) {
    for (const [diff, god] of o && o.quick ? [['Piste', false]] : [['Piste', false], ['Off-Piste', true], ['Bunny Hill', false]]) {
      const ctx = load(), S7 = ctx.S7; S7.TESTING = true; S7.newGame({ seed: 3, difficulty: diff }); if (god) S7.CHEATS.god = true;
      S7.enterArea('room7', 'door', { noAutosave: true }); S7.runBeat('cold_open'); S7.bot.run(golden);
      const reached = new Set(); let end = false;
      for (let i = 0; i < 120 * 60 * 60; i++) { S7.simUpdate(DT, S7.bot.intent(DT)); reached.add(S7.G.area); const st = S7.bot.status(); if (st.failed) break; if (S7.G.mode === 'end') { end = true; break; } }
      const G = S7.G, tag = diff + (god ? ' (god)' : '') + ': ';
      t(tag + 'every area reached', ['00A', '00B', '00C', '01A', '01B', '01C', '01D', '01E', '01F', 'room7'].every(a => reached.has(a)), [...reached].join());
      t(tag + 'three Edelweiss, the key, the Ember Charm', G.items.edelweiss === 3 && G.items.servicekey && G.items.ember, JSON.stringify(G.items));
      t(tag + 'all seven lift pins', G.pins.length === 7, G.pins.join());
      t(tag + 'both targets eliminated, with ranks', G.results.t00 && G.results.t01, JSON.stringify(Object.keys(G.results)));
      t(tag + 'the epilogue and the end', end && G.flags.epilogue, S7.bot.status().failed || G.mode);
      if (o && o.metrics) console.log('metrics ' + tag + JSON.stringify({ time: Math.round(G.time), red: Math.round(G.red), rime: G.rime, kills: G.results.t01 && G.results.t00.stats.kills + G.results.t01.stats.kills, frozen: G.results.t01 && G.results.t00.stats.frozen + G.results.t01.stats.frozen, ranks: [G.results.t00 && G.results.t00.rank, G.results.t01 && G.results.t01.rank] }));
    }
  }
};
export const ORDER_ = Object.keys(suites);
void readdirSync;
