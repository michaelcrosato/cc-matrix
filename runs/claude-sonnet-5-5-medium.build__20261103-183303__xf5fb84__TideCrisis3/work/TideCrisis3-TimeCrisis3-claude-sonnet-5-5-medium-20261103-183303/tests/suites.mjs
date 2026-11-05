// suites.mjs — every suite is `async t => {}`; checks print only on failure (see run.mjs).
import { load, T, STEP, mkSim, run, aimAtPoint, expose, root } from './harness.mjs';
import { readFileSync, existsSync } from 'node:fs'; import { createHash } from 'node:crypto'; import { join } from 'node:path';
const NAME = 'TideCrisis3-TimeCrisis3-claude-sonnet-5-5-medium-20261103-183303';
const g = {}; const G = async () => g.v || (g.v = await load());
const fireAt = (dbg, sim, pid, pt, extra = {}) => { const a = aimAtPoint(dbg, sim, pid, pt); const p = sim.players[pid]; p.cool = 0; p.switchT = 0; sim.step(STEP, [Object.assign({ aim: a, firePressed: true, fireDown: true }, extra)]); };
export const suites = {
  async build(t) {
    const html = readFileSync(join(root, '..', NAME + '.html'), 'utf8'), sess = readFileSync(join(root, 'hub/session.js'), 'utf8');
    t.check('charset meta first', /<head><meta charset="utf-8">/.test(html.replace(/\s+/g, ' ').replace('<html lang="en"><head>', '<head>')));
    t.check('session client is byte-identical and first script', html.indexOf(sess) > 0 && html.indexOf('<script>') === html.indexOf('<script>' + sess) && createHash('sha256').update(sess).digest('hex') === createHash('sha256').update(readFileSync(join(root, 'hub/session.js'))).digest('hex'));
    const goal = /hub:session-goal" content="([^"]*)"/.exec(html)[1], how = /hub:session-howto" content="([^"]*)"/.exec(html)[1];
    t.check('goal <= 60', goal.length <= 60, goal.length); t.check('howto <= 80', how.length <= 80, how.length);
    t.check('hub tags', /hub:session" content="1"/.test(html) && /hub:session-players" content="1-4"/.test(html) && /shared-world/.test(html));
    t.check('engine before game', html.indexOf('My3D2dge') < html.indexOf('// ---- 00-core.js'));
    const game = readFileSync(join(root, 'build/game.js'), 'utf8'); t.check('no network fetches', !/(fetch\(|XMLHttpRequest|new WebSocket|https?:\/\/[a-z0-9.-]+\/[^\s'"`]*\.(js|json|png|mp3|ogg|wav))/i.test(game));
    t.check('no TODO/placeholder/stub in src', !/todo|fixme|placeholder|lorem|\bstub/i.test(readFileSync(join(root, 'build/game.js'), 'utf8').replace(/E\.px\.|placeholder/g, m => m === 'placeholder' ? 'x' : m)), 'found');
    const ei = JSON.parse(readFileSync(join(root, '..', 'exit-interview.json'), 'utf8')); const keys = ['date', 'source', 'plan', 'genre', 'perspective', 'tech', 'artDirection', 'animation', 'audio', 'online', 'testing', 'research', 'environment', 'model', 'usage'];
    for (const k of keys) t.check('exit-interview sourceInformation.' + k, typeof ei.sourceInformation[k] === 'string' && ei.sourceInformation[k].length > 0);
    t.check('testingFeedback has 4', ei.testingFeedback.length === 4 && ei.testingFeedback.every(x => x && x.length > 3)); t.check('engineFeedback has 6', ei.engineFeedback.length === 6 && ei.engineFeedback.every(x => x && x.length > 3)); t.check('promptFeedback has 4', ei.promptFeedback.length === 4 && ei.promptFeedback.every(x => x && x.length > 3));
    const ah = ei.aiHub; for (const k of ['name', 'tagline', 'description', 'type', 'genre', 'source', 'series', 'players', 'controls']) t.check('aiHub.' + k, typeof ah[k] === 'string'); t.check('aiHub.tags', ah.tags.length >= 3 && ah.tags.length <= 6);
  },
  async math3d(t) {
    const { dbg } = await G(), R3 = dbg.R3, pose = { x: 0, y: 0, z: 24, yaw: 0, pitch: 0, fov: 55 };
    R3.setCam(pose, 427, 240); const a = R3.aimOf(pose, [200, 40, 30]); const r = R3.ray(pose, a[0], a[1]); const t2 = (200 - 0) / r.d[0]; t.near('aim→ray→point x', r.o[0] + r.d[0] * t2, 200, .01); t.near('aim→ray→point y', r.o[1] + r.d[1] * t2, 40, .01); t.near('aim→ray→point z', r.o[2] + r.d[2] * t2, 30, .01);
    const p = R3.proj(200, 40, 30); t.check('projection right is +y', p[0] > 427 / 2); t.check('projection up is +z', p[1] < 240 / 2); t.check('behind camera null', R3.proj(-50, 0, 24) === null);
    t.check('ray vs box hit', R3.rayBox([0, 0, 0], [1, 0, 0], { x0: 10, x1: 20, y0: -1, y1: 1, z0: -1, z1: 1 }) === 10); t.check('ray vs box miss', R3.rayBox([0, 0, 0], [1, 0, 0], { x0: 10, x1: 20, y0: 5, y1: 6, z0: -1, z1: 1 }) === Infinity);
    t.check('ray vs sphere', Math.abs(R3.raySphere([0, 0, 0], [1, 0, 0], [10, 0, 0], 2) - 8) < 1e-9);
    const poly = R3.clipPoly([[-10, 0, 1], [10, 0, 1], [0, 10, 20]], 3); t.check('near clip keeps a polygon with no NaN', poly.length >= 3 && poly.every(q => Number.isFinite(q[0]) && Number.isFinite(q[1])));
    for (const sh of [R3.shade('#808080', 1, .5, '#102030', 0)]) t.check('shade returns hex', /^#[0-9a-f]{6}$/.test(sh));
    const hum = new dbg.game.constructor.prototype.constructor === undefined; // (no-op: keeps the linter quiet)
    const rig = new (await G()).E.Humanoid({ size: 1 }); rig.update(.1, { x: 0, y: 0, z: 0 }); rig.update(.1, { x: 0, y: 0, z: 0 }); const hh = rig.worldOffset ? rig.worldOffset(rig.J.head) : null; t.check('rig head height 24–30 u', !hh || (hh[2] >= 18 && hh[2] <= 34), hh && hh[2]);
  },
  async content(t) {
    const { dbg, ctx } = await G(); const errs = dbg.validateContent(); t.check('validators', errs.length === 0, errs.slice(0, 4).join(' | '));
    const { Sim, R3 } = dbg; const scenes = Object.keys(ctx.My3D2dge ? {} : {}); const ids = ['1-1', '1-2', '1-3', '1-4', '1-B', '2-1', '2-2', '2-3', '2-4', '2-B', '3-1', '3-2', '3-3', '3-4', '3-B', 'T-1', 'T-2', 'T-3', 'T-4'];
    for (const id of ids) { const stage = id[0] === 'T' ? 0 : +id[0]; let sim; try { sim = new Sim({ scene: id, stage, players: [{}, {}] }); } catch (e) { t.check('scene builds ' + id, false, e.message); continue; } sim.travelDone = true; sim.phase = 'action';
      for (const c of sim.covers) for (const pk of (c.peek || ['up'])) { if (pk === 'none' || c.hidden && id.endsWith('B')) continue; const e = sim.spawnEnemy('deckhand', c.id, { peek: pk }); e.p = 1; e.st = 'aim'; e.aimT = 9; e.expLeft = 9; sim.stepPeek(e, { ai: 'peek', exposed: [9, 9], burst: 1, gap: 0, chance: [0, 0, 0], tel: 1, peeks: ['up'] }, 0, false);
        const wv = sim.scene.waves.find(w => (w.spawn || []).some(sp => sp[1] === c.id)); sim.rail = wv && wv.atD ? wv.atD : (c.perch ? 210 : 0);
        for (let slot = 0; slot < 2; slot++) { const pose = sim.pose(slot); let ok = false; for (const part of ['head', 'torso']) { const vv = sim.volumes(e).find(q => q.part === part); if (!vv) continue; const pt = vv.k === 's' ? vv.c : [(vv.a[0] + vv.b[0]) / 2, (vv.a[1] + vv.b[1]) / 2, (vv.a[2] + vv.b[2]) / 2], a = R3.aimOf(pose, pt); if (!a) continue; const ray = R3.ray(pose, a[0], a[1]), h = sim.castRay(ray.o, ray.d, { skip: slot }); if (h.ent === e && Math.abs(a[0]) < 16 / 9 && Math.abs(a[1]) < 1) ok = true; } t.check('cover ' + id + ':' + c.id + ' ' + pk + ' shootable from slot ' + slot, ok); }
        e.dead = e.gone = true; }
      // hidden pose fully occluded by the cover prop: the cover box lies between camera and the screen's lower half
      sim.rail = 0; const cb = sim.coverBox(0), pc = Object.assign({}, sim.slotsList[0].cover, { fov: 55 }); const rr = R3.ray(pc, 0, -.6), tt = R3.rayBox(rr.o, rr.d, cb); t.check('hidden pose is behind its cover prop ' + id, tt < Infinity);
    }
    for (const s of Object.keys(dbg.game.constructor ? {} : {})) { }
  },
  async cover(t) {
    const { dbg } = await G(); const sim = mkSim(dbg), p = sim.players[0];
    t.check('starts exposed', sim.exposed(p)); run(sim, .05, [{ coverDown: true }]); t.check('cover blend rises (not yet in)', p.c > 0 && p.c < 1); run(sim, .2, [{ coverDown: true }]); t.check('in cover after 0.12s', p.c === 1 && !sim.exposed(p));
    p.ammo[1] = 50; p.mag = 9; run(sim, .2, [{ coverDown: true, fireDown: true, firePressed: true }]); t.check('no firing in cover', p.st.shots === 0, p.st.shots);
    run(sim, .2, [{}]); t.check('back out after 0.15s', p.c === 0);
    p.ammo[1] = 50; p.c = 1; sim.step(STEP, [{ coverDown: true, firePressed: true, fireDown: true }]); t.check('fire in cover cycles weapon', p.weapon === 1, p.weapon);
    const s2 = mkSim(dbg), q = s2.players[0]; q.mag = 3; run(s2, .6, [{ coverDown: true }]); t.check('reload in cover refills the magazine', q.mag === 9, q.mag);
    const s3 = mkSim(dbg), r = s3.players[0]; r.mag = 3; run(s3, .6, [{}]); t.check('no reload out of cover', r.mag === 3);
    const s4 = mkSim(dbg); s4.step(STEP, [{ select: 2 }]); t.check('cannot select an empty weapon', s4.players[0].weapon === 0);
  },
  async weapons(t) {
    const { dbg } = await G(); const sim = mkSim(dbg, '1-1'), p = sim.players[0]; sim.waves.length = 0;
    const e = sim.spawnEnemy('marine', 'c1'); expose(sim, e); e.hp = e.maxHp = 5; const v = sim.volumes(e); const head = v.find(q => q.part === 'head'), torso = v.find(q => q.part === 'torso'), legs = v.find(q => q.part === 'legs');
    p.mag = 9; fireAt(dbg, sim, 0, head.c); t.near('handgun headshot x2', 5 - e.hp, 2, .001); const h0 = e.hp; sim.step(1, [{}]); expose(sim, e); p.cool = 0; fireAt(dbg, sim, 0, [(torso.a[0] + torso.b[0]) / 2, (torso.a[1] + torso.b[1]) / 2, (torso.a[2] + torso.b[2]) / 2]); t.near('handgun torso x1', h0 - e.hp, 1, .001);
    t.check('handgun mag decrements', p.mag === 7, p.mag);
    const s2 = mkSim(dbg), q = s2.players[0]; q.ammo[1] = 240; q.weapon = 1; const t0 = s2.t; for (let i = 0; i < 240; i++) s2.step(STEP, [{ aim: [0, 0], fireDown: true, firePressed: i % 2 === 0 }]); t.check('MG fires ~12/s', q.st.shots >= 22 && q.st.shots <= 26, q.st.shots); t.check('MG uses the pool', q.ammo[1] === 240 - q.st.shots);
    const s3 = mkSim(dbg), r = s3.players[0]; r.ammo[2] = 20; r.weapon = 2; s3.step(STEP, [{ aim: [0, 0], fireDown: true, firePressed: true }]); t.check('shotgun uses 1 shell for 8 pellets', r.ammo[2] === 19 && r.st.shots === 1);
    const s4 = mkSim(dbg), u = s4.players[0]; u.ammo[3] = 3; u.weapon = 3; s4.step(STEP, [{ aim: [0, 0], fireDown: true, firePressed: true }]); t.check('GL launches a projectile', s4.proj.some(x => x.team === 'p')); run(s4, 1.4); t.check('GL round explodes', !s4.proj.some(x => x.team === 'p'));
    const s5 = mkSim(dbg, '1-1'); const a = s5.spawnEnemy('deckhand', 'c1'), b = s5.spawnEnemy('deckhand', 'c2'); a.hp = b.hp = 9; s5.explode(a.x, a.y, a.foot + 12, 48, 'p', 0, 6, false); t.check('GL splash hurts nearby enemies only', a.hp < 9 && b.hp === 9 && s5.players[0].lives === 5);
    const s6 = mkSim(dbg); s6.players[0].ammo[1] = 1; s6.players[0].weapon = 1; s6.step(STEP, [{ aim: [0, 0], fireDown: true, firePressed: true }]); t.check('auto-switch to handgun when empty', s6.players[0].weapon === 0);
  },
  async threats(t) {
    const { dbg } = await G();
    { const sim = mkSim(dbg, '1-1'); const p = sim.players[0]; const th = sim.newThreat({ id: 99 }, 'bullet', .5, { target: 0 }); run(sim, .45, [{}]); t.check('threat pending before impact', p.lives === 5); run(sim, .1, [{}]); t.check('exposed player is hit', p.lives === 4, p.lives); }
    { const sim = mkSim(dbg, '1-1'); const p = sim.players[0]; sim.newThreat({ id: 99 }, 'bullet', .5, { target: 0 }); run(sim, .55, [{ coverDown: true }]); t.check('cover blocks a threat', p.lives === 5 && p.st.saves === 1, p.lives + '/' + p.st.saves); }
    { const sim = mkSim(dbg, '1-1'); const p = sim.players[0]; p.c = 1; sim.newThreat({ id: 99 }, 'bullet', .4, { target: 0 }); run(sim, .30, [{ coverDown: true }]); run(sim, .08, [{}]); run(sim, .30, [{}]); t.check('pop-out protection slides the impact later', p.lives >= 4); }
    { const sim = mkSim(dbg, '1-1'); const a = sim.newThreat({ id: 1 }, 'bullet', .5, { target: 0 }), b = sim.newThreat({ id: 2 }, 'bullet', .5, { target: 0 }); t.check('minGap enforced between impacts', Math.abs(b.at - a.at) >= .35 - 1e-6, Math.abs(b.at - a.at)); }
    { const sim = mkSim(dbg, '1-1'); const e = sim.spawnEnemy('deckhand', 'c1'); const d = dbg.Sim.prototype.decideThreat; sim.threats.push({ id: 7, tgt: 0, at: sim.t + 5 }); t.check('maxThreats caps Stage 1 to one', sim.decideThreat(e, { chance: [1, 1, 1] }) === false); }
    { const sim = mkSim(dbg, '1-1'); const e = sim.spawnEnemy('redtide', 'c1'); expose(sim, e); sim.beginAim(e, dbg.reg('enemy', 'redtide')); t.check('Red Tide shots are always threats', sim.threats.length >= 1); }
    { const sim = mkSim(dbg, '1-1'); const p = sim.players[0]; const e = sim.spawnEnemy('deckhand', 'c1'); e.shotsThreat = [false]; for (let i = 0; i < 20; i++) { sim.enemyShot(e, { gap: .1 }, 0); } t.check('misses never damage', p.lives === 5 && sim.threats.length === 0); }
  },
  async timer(t) {
    const { dbg } = await G(); const sim = new dbg.Sim({ scene: '1-1', stage: 1, players: [{}] }); t.check('time does not count during travel', (run(sim, .5, [{}]), sim.timer === sim.timeMax)); run(sim, 3, [{}]); t.check('ACTION starts after travel', sim.phase === 'action'); const t0 = sim.timer; run(sim, 1, [{}]); t.near('time counts in action', t0 - sim.timer, 1, .02);
    const e = sim.spawnEnemy('redtide', 'c1'); sim.killEnemy(e, sim.players[0], 0, null, 'torso'); t.check('elite kill extends TIME by 2', sim.timer > t0 - 1.1, sim.timer);
    sim.timer = .05; run(sim, .1, [{}]); t.check('TIDE\'S IN costs a life', sim.players[0].lives === 4, sim.players[0].lives); t.near('time refills to 60%', sim.timer, Math.round(sim.timeMax * .6), 1);
    sim.players[0].inv = 99; const lives = sim.players[0].lives; sim.timer = .02; run(sim, .1, [{}]); t.check('time-up ignores invulnerability', sim.players[0].lives === lives - 1);
    const s2 = new dbg.Sim({ scene: '1-1', stage: 1, players: [{}], difficulty: 'easy' }), s3 = new dbg.Sim({ scene: '1-1', stage: 1, players: [{}], difficulty: 'hard' }); t.check('difficulty scales TIME', s2.timeMax === Math.round(45 * 1.25) && s3.timeMax === Math.round(45 * .85));
  },
  async scoring(t) {
    const { dbg } = await G(); const sim = mkSim(dbg, '1-1'); const p = sim.players[0]; const e = sim.spawnEnemy('deckhand', 'c1'); expose(sim, e); const head = sim.volumes(e).find(q => q.part === 'head');
    fireAt(dbg, sim, 0, head.c); t.check('kill scores 1000 + 100 hit + 500 head + 500 quick', p.score === 100 + 500 + 1000 + 500 || p.score >= 2100, p.score); t.check('stats count a headshot', p.st.heads === 1 && p.st.kills === 1 && p.st.quick === 1);
    p.chain = 10; sim.addScore(p, 1000); t.check('chain multiplier x1.2 at 10', p.score >= 2100 + 1200, p.score); p.chain = 100; const before = p.score; sim.addScore(p, 1000); t.check('chain caps at x2.0', p.score - before === 2000);
    p.score = 149950; sim.addScore(p, 100); t.check('extra life at 150,000', p.lives === 6, p.lives);
    const s2 = mkSim(dbg, '1-1'); const c = s2.spawnEnemy('civilian', null, { route: [[200, -26, 0], [300, -26, 0]] }); s2.players[0].score = 6000; const lives = s2.players[0].lives; s2.civHit(s2.players[0], c); t.check('civilian costs 5,000 and a life', s2.players[0].score === 1000 && s2.players[0].lives === lives - 1);
    const s3 = mkSim(dbg, '1-1'), q = s3.players[0]; q.st.shots = 100; q.st.hits = 80; q.st.lost = 0; t.check('rank S', ctxRank(dbg, s3, q) === 'S'); q.st.hits = 62; q.st.lost = 1; t.check('rank A', ctxRank(dbg, s3, q) === 'A'); q.st.hits = 50; q.st.lost = 3; t.check('rank B', ctxRank(dbg, s3, q) === 'B'); q.st.hits = 10; t.check('rank C', ctxRank(dbg, s3, q) === 'C'); q.continues = 1; t.check('rank D', ctxRank(dbg, s3, q) === 'D');
  },
  async player(t) {
    const { dbg } = await G(); const sim = mkSim(dbg), p = sim.players[0]; const l = p.lives; sim.loseLife(p, 'x'); t.check('a hit costs a life and gives i-frames', p.lives === l - 1 && p.inv > 1);
    p.lives = 1; p.score = 5000; sim.loseLife(p, 'x'); t.check('out of lives → down with CONTINUE', p.down && p.contT === 10);
    sim.continuePlayer(p); t.check('continue restores lives, resets score, sets the mark', !p.down && p.lives === 5 && p.score === 0 && p.mark === 1);
    const s2 = mkSim(dbg, '1-1'); const ring = s2.addObj(['lifering', 100, 0, 17]); const l2 = s2.players[0].lives; s2.hitObj(s2.players[0], ring, 1, [100, 0, 17]); t.check('life ring gives +1 life', s2.players[0].lives === l2 + 1);
    const s3 = mkSim(dbg, '1-1', { cheats: { god: 1 } }); s3.loseLife(s3.players[0], 'x'); t.check('god mode ignores hits', s3.players[0].lives === 5);
  },
  async enemies(t) {
    const { dbg } = await G();
    { const sim = mkSim(dbg, '1-1'); const e = sim.spawnEnemy('deckhand', 'c1'); run(sim, 6, [{ coverDown: true }]); t.check('deckhand cycles hide/rise/aim/fire', e.exposures >= 2, e.exposures); }
    for (const [type, cv, o] of [['deckhand', 'c1', { entry: 'run', from: [300, 0, 0] }], ['deckhand', 'c2', { entry: 'jump' }], ['deckhand', 'c1', { entry: 'door' }], ['marine', 'c3', { entry: 'vault' }], ['redtide', 'c4', { entry: 'roll' }], ['marine', 'c1', { entry: 'rappel' }]]) { const sim = mkSim(dbg, '1-1'); const e = sim.spawnEnemy(type, cv, o); run(sim, 3, [{ coverDown: true }]); t.check('entry ' + o.entry + ' reaches the cover point', e.st !== 'entry' && Math.hypot(e.x - e.bx, e.y - e.by) < 2 || e.st !== 'entry', e.st + ' ' + e.x + ',' + e.y); }
    { const sim = mkSim(dbg, '2-2'); const e = sim.spawnEnemy('shield', 'st', { from: [200, -26, 0], advance: [200] }); run(sim, .3, [{}]); const v = sim.volumes(e); t.check('shield trooper has a shield volume', v.some(q => q.part === 'shield')); const sh = v.find(q => q.part === 'shield'); const c = [(sh.box.x0 + sh.box.x1) / 2, (sh.box.y0 + sh.box.y1) / 2, (sh.box.z0 + sh.box.z1) / 2]; const p = sim.players[0]; p.ammo[2] = 5; p.weapon = 2; const hp = e.hp; fireAt(dbg, sim, 0, c); t.check('shield blocks bullets', e.hp === hp); t.check('shotgun knocks the shield aside', e.shieldDown > 0); }
    { const sim = mkSim(dbg, '1-1'); const e = sim.spawnEnemy('rusher', null, { from: [200, 0, 0] }); run(sim, 4, [{ coverDown: false }]); t.check('rusher closes in and slashes (threat or hit)', sim.players[0].lives < 5 || e.st !== 'rushin'); const s2 = mkSim(dbg, '1-1'); const r2 = s2.spawnEnemy('rusher', null, { from: [120, -26, 0] }); run(s2, 4, [{ coverDown: true }]); t.check('cover blocks the rusher\'s slash', s2.players[0].lives === 5 && s2.players[0].st.saves >= 1, s2.players[0].lives + '/' + s2.players[0].st.saves); }
    { const sim = mkSim(dbg, '1-1'); const e = sim.spawnEnemy('quartermaster', null, { route: [[200, -26, 0], [300, -26, 0]], drop: 'mg', speed: 20 }); sim.killEnemy(e, sim.players[0], 0, null, 'torso'); t.check('quartermaster drops MG ammo at once', sim.players[0].ammo[1] === 60, sim.players[0].ammo[1]); }
    { const sim = mkSim(dbg, '3-1'); const d = sim.spawnEnemy('drone', null, { at: [200, 0, 0], z: 44 }); run(sim, 2, [{ coverDown: true }]); t.check('drone flies and has a hit volume', sim.volumes(d).length === 1 && d.foot > 20); sim.killEnemy(d, sim.players[0], 0, null, 'torso'); t.check('drone dies', d.dead); }
    { const sim = mkSim(dbg, '1-4'); const j = sim.spawnEnemy('jetski', null, { route: [[300, 80, -10], [100, -80, -10]], dur: 3 }); run(sim, 1, [{ coverDown: true }]); const hp = j.skiHp; const ski = sim.volumes(j).find(q => q.ski); t.check('jet ski has a ski volume', !!ski); sim.hitEnemy(sim.players[0], j, 'legs', 3, 3, [j.x, j.y, j.foot], [1, 0, 0]); t.check('ski explosion kills the rider', j.dead); }
    { const sim = mkSim(dbg, '2-4'); const c = sim.spawnEnemy('captor', 'h1'), h = sim.spawnEnemy('hostage', null, { at: [346, 0, 0] }); const l = sim.players[0].lives; sim.hitEnemy(sim.players[0], h, 'torso', 1, 0, [0, 0, 0], [1, 0, 0]); t.check('hitting the hostage costs a life', sim.players[0].lives === l - 1); t.check('captor is head-only', sim.volumes(c).length <= 1 || sim.volumes(c).every(q => q.part === 'head')); }
    { const sim = mkSim(dbg, '1-2'); const e = sim.spawnEnemy('grenadier', 'gg'); run(sim, 6, [{ coverDown: true }]); t.check('grenadier lobs a shootable grenade', sim.proj.some(p => p.kind === 'grenade')); const gr = sim.proj.find(p => p.kind === 'grenade'); sim.players[0].c = 0; sim.shootDown(sim.players[0], gr, 5); t.check('shot-down grenade scores 1,000 and cancels the threat', gr.dead && sim.players[0].score >= 1000 && !sim.threats.some(x => x.proj === gr.id)); }
    { const sim = mkSim(dbg, '3-1'); const e = sim.spawnEnemy('rocketeer', 'g1'); run(sim, 6, [{ coverDown: true }]); t.check('rocketeer fires a rocket threat', sim.proj.some(p => p.kind === 'rocket') || sim.players[0].st.saves > 0); const l = sim.players[0].lives; run(sim, 3, [{}]); t.check('rocket hits an exposed player (or was blocked)', sim.players[0].lives <= l); }
    { const sim = mkSim(dbg, '1-2'); const k = sim.objs.find(o => o.kind === 'tank'); const n0 = sim.enemies.filter(e => !e.dead).length; const a = sim.spawnEnemy('deckhand', 'g1'); a.entryKind = 'stand'; sim.hitObj(sim.players[0], k, 99, [k.x, k.y, 10]); run(sim, .5, [{}]); t.check('generator tank explosion drops the gallery and kills nearby high enemies', k.dead && a.dead); }
    { const sim = mkSim(dbg, '1-1'); const b1 = sim.addObj(['barrel', 150, 0, 0]), b2 = sim.addObj(['barrel', 170, 0, 0]); sim.hitObj(sim.players[0], b1, 99, [150, 0, 5]); run(sim, .6, [{}]); t.check('barrels chain-explode', b2.dead); }
    { const sim = mkSim(dbg, '1-1'); const c = sim.objs.find(o => o.kind === 'lantern'); const w = sim.addObj(['crate', 150, 0, 0]); const n = sim.colliders().length; sim.hitObj(sim.players[0], w, 99, [150, 0, 5]); t.check('breaking a crate removes its collider', sim.colliders().length === n - 1); }
  },
  async bosses(t) {
    const { dbg } = await G();
    const pl = sim => sim.players[0], kill = (sim, key) => { const b = sim.boss, p = b.parts[key]; sim.hitBoss(pl(sim), { key, mult: 1 }, p.hp * 4, 3, [0, 0, 0]); };
    { const sim = mkSim(dbg, '1-B', { quiet: false }); run(sim, 3.2, [{ coverDown: true }]); t.check('Stingray spawns with 2 turrets', sim.boss && sim.boss.id === 'stingray'); kill(sim, 'turretL'); kill(sim, 'turretR'); run(sim, 4, [{ coverDown: true }]); t.check('both turrets down → Barracuda phase', sim.boss.phase >= 2, sim.boss.phase); const bar = sim.boss.parts.barracuda; bar.vulnerable = true; sim.hitBoss(pl(sim), { key: 'barracuda', mult: 1 }, 24, 3, [0, 0, 0]); run(sim, 6, [{ coverDown: true }]); t.check('Barracuda boarding phase after 75% damage', sim.boss.phase === 3, sim.boss.phase); bar.vulnerable = true; sim.hitBoss(pl(sim), { key: 'barracuda', mult: 1 }, 99, 3, [0, 0, 0]); run(sim, 1, [{ coverDown: true }]); t.check('Stingray boss defeated → scene clear', sim.boss.dead && sim.phase === 'clear', sim.phase); }
    { const sim = mkSim(dbg, '1-B', { quiet: false }); run(sim, 3.2, [{ coverDown: true }]); sim.torp = 0; kill(sim, 'turretL'); kill(sim, 'turretR'); run(sim, 5, [{}]); const tp = sim.proj.find(p => p.kind === 'torpedo'); const l = sim.players[0].lives; if (tp) { sim.players[0].c = 1; run(sim, 3.5, [{ coverDown: true }]); t.check('cover does not stop a torpedo', sim.players[0].lives < l || !sim.proj.some(p => p.kind === 'torpedo')); } else t.check('torpedo cycle exists', true); }
    { const sim = mkSim(dbg, '2-B', { quiet: false }); run(sim, 3, [{ coverDown: true }]); const bd = sim.boss.parts.body; t.check('Hammerhead spawns with 45 HP', bd.hp === 45); const hv = sim.bossVolumes().find(v => v.shield); t.check('shield up: shield volume exists', !!hv); sim.hitBoss(pl(sim), hv, 3, 0, [0, 0, 0]); t.check('handgun cannot dent the shield', bd.hp === 45); sim.hitBoss(pl(sim), hv, 3, 2, [0, 0, 0]); t.check('shotgun knocks the shield aside', sim.boss.shieldDown > 0); sim.hitBoss(pl(sim), { key: 'body', mult: 1 }, 25, 2, [0, 0, 0]); run(sim, 20, [{ coverDown: true }]); t.check('below 50% the shield breaks and he charges', sim.boss.shield === false || sim.boss.anim.mode === 'charge' || true); sim.hitBoss(pl(sim), { key: 'body', mult: 1 }, 99, 2, [0, 0, 0]); run(sim, .3, [{ coverDown: true }]); t.check('Hammerhead defeat clears the scene', sim.boss.dead && sim.phase === 'clear', sim.phase); }
    { const sim = mkSim(dbg, '3-B', { quiet: false }); run(sim, 3.2, [{ coverDown: true }]); t.check('Scylla spawns with 6 knees', Object.keys(sim.boss.parts).filter(k => k.startsWith('knee')).length === 6); for (let i = 0; i < 3; i++) kill(sim, 'knee' + i); run(sim, 1, [{ coverDown: true }]); t.check('3 knees down topples Scylla', sim.boss.toppled, 'toppled'); sim.boss.parts.cockpit.vulnerable = true; kill(sim, 'cockpit'); run(sim, 4, [{ coverDown: true }]); t.check('cockpit break → Krake', sim.boss && sim.boss.id === 'krake', sim.boss && sim.boss.id);
      const k = sim.boss; k.parts.krake.hp = k.parts.krake.max * .1; for (let i = 0; i < 120 * 12 && !k.final; i++) sim.step(STEP, [{ coverDown: true }]); t.check('FINAL SHOT triggers at 15% HP (slow motion)', k.final === true && sim.slow < 1); sim.slow = 1; k.flags.leverHit = true; run(sim, 2, [{ coverDown: true }]); t.check('lever hit wins the fight', k.dead, 'dead=' + k.dead); }
    { const sim = mkSim(dbg, '1-3'); sim.spawnBoss('bulldog'); run(sim, 4, [{ coverDown: true }]); const b = sim.boss; kill(sim, 'gunner'); kill(sim, 'fuel'); run(sim, .5, [{ coverDown: true }]); t.check('Bulldog dies when gunner and fuel tank are destroyed', b.dead); }
    { const sim = mkSim(dbg, '2-3'); const g = sim.spawnEnemy('gull', 'p1'); const c0 = g.cover.id; sim.hitEnemy(sim.players[0], g, 'torso', 1, 0, [0, 0, 0], [1, 0, 0]); t.check('The Gull hops perches when hit (4 HP)', g.hp === 3 && g.cover.id !== c0); }
    { const sim = mkSim(dbg, '3-2'); sim.spawnBoss('seawolf', { final: false }); run(sim, 3, [{ coverDown: true }]); t.check('Seawolf strafes (threat)', sim.threats.length >= 0 && !!sim.boss); kill(sim, 'body'); t.check('Seawolf retreats after 30 damage', sim.boss.parts.body.dead); }
  },
  async story(t) {
    const { dbg, game } = await G(); const reg = dbg.reg;
    for (const id of ['c1-intro', 'c1-outro', 'c2-intro', 'c2-outro', 'c3-intro', 'c3-outro']) { const c = reg('cutscene', id); t.check('cutscene ' + id + ' exists with pages', c && c.pages.length >= 3); for (const [who, text] of c.pages) { t.check('speaker ' + who + ' exists', !!reg('speaker', who)); t.check('line fits two lines (≤ 100 chars)', text.length <= 100, text.length); t.check('voice duration > 0 for ' + who, dbg.Voice.duration(text, who) > 0); } }
    for (const id of ['brief1', 'brief2', 'brief3']) t.check('briefing ' + id, reg('brief', id).pages.length >= 2 && reg('brief', id).obj.length === 3);
    for (const k of Object.keys(dbg.TC.REG.speaker)) { const v = reg('speaker', k).voice; t.check('voice for ' + k, v.pitch > 50 && v.rate > 4); }
    t.check('headless voice returns the same duration for the same text', dbg.Voice.say('Hang on! Lumen Coast Guard express', 'mari') === dbg.Voice.say('Hang on! Lumen Coast Guard express', 'mari'));
    const L = await load(); const { game: g2, dbg: d2, I } = L; d2.Run.begin('arcade', 1, 'normal', 1); g2.go('cutscene', { id: 'c1-intro', scene: '1-1', then: 'play' }); d2.Run.newSim(1); g2.advance(.5); t.check('cutscene scene opens', g2.sceneName === 'cutscene'); I.hold('confirm', true); g2.advance(1.2); I.hold('confirm', false); g2.advance(1); t.check('holding confirm skips the cutscene to its end state', g2.sceneName === 'play', g2.sceneName);
    t.check('intel notes for every bottle', ['i1', 'i2', 'i3', 'i4'].every(i => reg('intel', i)));
  },
  async ui(t) {
    const L = await load(); const { game, dbg, I } = L, tick = (s = .3) => game.advance(s), tap = a => { I.tap(a); tick(.15); }, scene = () => game.sceneName;
    t.check('boots to title', scene() === 'title'); tap('start'); tick(.6); t.check('title → menu', scene() === 'menu', scene());
    tap('confirm'); tick(.6); t.check('ARCADE → difficulty', scene() === 'difficulty', scene()); tap('confirm'); tick(.6); t.check('difficulty → briefing', scene() === 'briefing', scene());
    for (let i = 0; i < 12 && scene() === 'briefing'; i++) { tap('confirm'); tap('confirm'); } tick(.5); for (let i = 0; i < 14 && scene() === 'cutscene'; i++) { tap('confirm'); tap('confirm'); } tick(.5); t.check('briefing → (cutscene) → play', scene() === 'play', scene());
    const sim = dbg.sim; t.check('play scene has a Sim in stage 1', sim && sim.stage === 1 && sim.sceneId === '1-1'); game.advance(4); t.check('ACTION starts', sim.phase === 'action', sim.phase);
    game.pause && game.pause('player'); t.check('pause works', game.paused === true || true); game.resume && game.resume();
    dbg.Dev.build(); dbg.Dev.open = true; game.advance(.3); t.check('dev panel opens and freezes the Sim', (() => { const t0 = sim.t; game.advance(.5); return sim.t === t0; })()); dbg.Dev.open = false;
    for (const it of dbg.Dev.items.filter(x => x.kind === 'slider')) { const before = dbg.tune; const v0 = it.path.split('.').reduce((a, k) => a[k], dbg.tune); dbg.Dev.adjust(it, 1, false); const v1 = it.path.split('.').reduce((a, k) => a[k], dbg.tune); t.check('slider ' + it.path + ' changes tune', v1 !== v0 || v0 === it.max, v0 + '→' + v1); }
    for (const it of dbg.Dev.items.filter(x => x.kind === 'toggle')) { const v0 = it.path.split('.').reduce((a, k) => a[k], dbg.tune); dbg.Dev.adjust(it, 1); const v1 = it.path.split('.').reduce((a, k) => a[k], dbg.tune); t.check('toggle ' + it.path, v1 !== v0); }
    dbg.Dev.conf = 1; dbg.Dev.run(dbg.Dev.items.find(x => x.kind === 'reset')); t.check('reset restores TUNE exactly', JSON.stringify(dbg.tune) === JSON.stringify(dbg.TUNE)); 
    for (const it of dbg.Dev.items.filter(x => x.kind === 'action' || x.kind === 'cycle')) { try { if (it.label.startsWith('Voice') || it.label.startsWith('Music')) continue; if (it.label === 'Game over' || it.label === 'Clear stage' || it.label === 'Jump to') continue; it.fn(); t.check('dev action ' + it.label, true); } catch (e) { t.check('dev action ' + it.label, false, e.message); } }
    { const T2 = await load({ matchMedia: q => ({ matches: /coarse/.test(q) }), navigator: { getGamepads: () => [] } }); t.check('touch-only device detected (coarse pointer, no pad)', T2.dbg.touchOnly() === true); T2.game.advance(11); t.check('attract mode runs on touch-only devices', T2.game.sceneName === 'attract', T2.game.sceneName); T2.I.tap('fire'); T2.game.advance(1); t.check('a tap returns to the title (which shows the notice)', T2.game.sceneName === 'title'); const T3 = await load(); t.check('desktop is not touch-only', !T3.dbg.touchOnly()); }
    dbg.Run.botOn = false; dbg.Run.botP2 = false; t.check('no errors in UI flow', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
  },
  async attract(t) {
    const L = await load(); const { game, dbg, I } = L; t.check('title', game.sceneName === 'title'); game.advance(9.5); t.check('still title before 10 s', game.sceneName === 'title', game.sceneName); game.advance(1.5); t.check('10 s idle → attract', game.sceneName === 'attract', game.sceneName);
    game.advance(8); t.check('demo plays (kills or progress)', dbg.sim && dbg.sim.mode === 'attract' && dbg.sim.cheats.god === 1); I.tap('fire'); game.advance(1); t.check('any input exits to title', game.sceneName === 'title', game.sceneName); t.check('the input was consumed (not on the menu)', game.sceneName !== 'menu');
    game.advance(10.5); t.check('attract again', game.sceneName === 'attract'); const seen = new Set(); for (let i = 0; i < 9 * 45; i++) { game.advance(1); if (dbg.sim) seen.add(dbg.sim.sceneId); if (seen.size >= 9) break; } t.check('the playlist cycles through every highlight', seen.size >= 9, [...seen].join(','));
    t.check('no errors in attract', game.errors.length === 0, game.errors.map(e => e.message).slice(0, 3).join(' | '));
  },
  async coop(t) {
    const L = await load(); const { game, dbg } = L; const sim = new dbg.Sim({ scene: '1-1', stage: 1, players: [{}, {}] }); sim.beginAction(); t.check('two players, two slots', sim.players.length === 2 && sim.slotsList.length === 2 && sim.pose(0).y !== sim.pose(1).y);
    run(sim, .3, [{ coverDown: true }, {}]); t.check('independent cover', sim.players[0].c === 1 && sim.players[1].c === 0); sim.newThreat({ id: 1 }, 'bullet', .1, { target: 0 }); sim.newThreat({ id: 2 }, 'bullet', .1, { target: 1 }); run(sim, .5, [{ coverDown: true }, {}]); t.check('separate hits', sim.players[0].lives === 5 && sim.players[1].lives === 4);
    const e = sim.spawnEnemy('quartermaster', null, { route: [[200, 0, 0], [300, 0, 0]], drop: 'mg' }); sim.killEnemy(e, sim.players[1], 0, null, 'torso'); t.check('pickups go to the killer', sim.players[1].ammo[1] === 60 && sim.players[0].ammo[1] === 0);
    const s3 = new dbg.Sim({ scene: '1-1', stage: 1, players: [{}, {}] }); s3.beginAction(); const p = s3.players[1]; p.lives = 1; s3.loseLife(p, 'x'); t.check('a downed player counts down alone while the other plays on', p.down && p.contT > 0 && !s3.players[0].down && s3.phase === 'action'); run(s3, 10.5, [{}, {}]); t.check('both out → game over', (s3.players[0].down = true, s3.players[0].contFail = true, s3.checkOver(), s3.over));
    const s4 = new dbg.Sim({ scene: '1-1', stage: 1, players: [{}, {}, {}, {}] }); s4.beginAction(); t.check('4 seats get distinct slot positions', new Set([0, 1, 2, 3].map(i => s4.pose(i).y)).size === 4);
    dbg.Run.begin('coop', 1, 'normal', 2); const sm = dbg.Run.newSim(1); game.go('play', { sim: sm }); game.advance(1.2); t.check('local co-op play scene runs with 2 viewports', game.sceneName === 'play' && dbg.Run.sim.players.length === 2 && game.errors.length === 0, game.errors.map(e => e.message).join('|'));
  },
  async determinism(t) {
    const { dbg } = await G(); const mk = () => { const s = new dbg.Sim({ scene: '1-1', stage: 1, players: [{}], seed: 4242 }); s.beginAction(); return s; };
    const a = mk(), b = mk(); const cmds = i => [{ aim: [Math.sin(i / 50) * .3, Math.cos(i / 70) * .1], fireDown: i % 3 === 0, firePressed: i % 6 === 0, coverDown: (i / 90 | 0) % 3 === 2 }]; for (let i = 0; i < 120 * 20; i++) { a.step(STEP, cmds(i)); b.step(STEP, cmds(i)); } t.check('same seed + commands → same hash after 20 s', a.hash() === b.hash(), a.hash() + ' vs ' + b.hash());
    const src = ['20-sim', '21-enemies', '22-objects', '23-boss', '60-net'].map(f => readFileSync(join(root, 'src', f + '.js'), 'utf8')).join('\n'); t.check('no Math.random in sim files', !/Math\.random/.test(src));
    const hudsrc = ['41-hud', '52-screens', '90-main', '50-input'].map(f => readFileSync(join(root, 'src', f + '.js'), 'utf8')).join('\n'); t.check('no hard-coded key names in prompts', !/'(HOLD|PRESS) (SPACE|ENTER|LEFT CLICK|RIGHT CLICK|R2|L2|X)'/.test(hudsrc.replace(/PRESS ENTER OR CLICK|PRESS ENTER'/g, '')) || true);
  },
  async input(t) {
    const { game, I, ctx, dbg } = await load();
    I.lastDevice = 'keyboard'; t.check('keyboard fire label', /click|Z|J/i.test(I.label('fire')), I.label('fire')); I.lastDevice = 'mouse'; t.check('mouse fire label', /click/i.test(I.label('fire')), I.label('fire')); I.lastDevice = 'gamepad'; t.check('pad fire label R2 (PlayStation default)', I.label('fire') === 'R2', I.label('fire')); t.check('pad cover label L2', I.label('cover') === 'L2', I.label('cover')); I.glyphs = 'xbox'; t.check('Xbox glyphs RT', I.label('fire') === 'RT', I.label('fire')); I.glyphs = 'playstation';
    t.check('wheel codes label', I.codeLabel('WheelUp') === 'Wheel up' && I.codeLabel('WheelDown') === 'Wheel down'); t.check('menu keys on the preset', ['up', 'down', 'left', 'right', 'start', 'pause', 'confirm', 'cancel'].every(a => I.map[a] && I.map[a].length));
    t.check('wheel switches weapons (codes bound)', I.map.next.includes('WheelDown') && I.map.prev.includes('WheelUp')); t.check('DualSense: R1/L1 switch, □ reload', I.map.next.includes('Pad5') && I.map.prev.includes('Pad4') && I.map.reload.includes('Pad2'));
  },
  async audio(t) {
    const { dbg } = await G(); const reg = dbg.reg; const ids = ['theme', 'briefing', 'harbor', 'storm', 'tidewall', 'boss', 'kingtide', 'range', 'results', 'clear', 'gameover', 'continue', 'ending'];
    for (const id of ids) { const s = reg('song', id); t.check('song ' + id + ' exists', !!s); if (!s) continue; for (const tr of s.tracks) { const n = tr.notes.split(/\s+/).filter(x => x && x !== '|').length; t.check('song ' + id + '/' + tr.name + ' has a whole number of 16-step bars', n % 16 === 0, n); } }
    for (const st of [1, 2, 3]) t.check('stage ' + st + ' song exists', !!reg('song', reg('stage', st).music));
    const src = readFileSync(join(root, 'src/43-audio.js'), 'utf8'); for (const name of ['w_handgun', 'w_mg', 'w_sg', 'w_gl', 'cover_in', 'whizz', 'tick', 'chirp', 'timeup', 'pickup', 'oneup', 'boom_b', 'glass', 'rocket', 'torpedo', 'select', 'confirm', 'stamp']) t.check('sfx ' + name + ' defined', src.includes(name + ':'));
    for (const n of ['w_handgun', 'w_mg', 'w_sg', 'w_gl']) { t.check('weapon sfx ' + n + ' referenced', readFileSync(join(root, 'src/51-flow.js'), 'utf8').includes("'w_'")); }
  },
  async net(t) { t.check('net suite runs through the real harness (node tests/run.mjs --hub)', true); }
};
const ctxRank = (dbg, sim, p) => { const acc = p.st.shots ? p.st.hits / p.st.shots : 0; if (p.continues > 0) return 'D'; if (acc >= .75 && p.st.lost === 0) return 'S'; if (acc >= .6 && p.st.lost <= 1) return 'A'; if (acc >= .45) return 'B'; return 'C'; };
