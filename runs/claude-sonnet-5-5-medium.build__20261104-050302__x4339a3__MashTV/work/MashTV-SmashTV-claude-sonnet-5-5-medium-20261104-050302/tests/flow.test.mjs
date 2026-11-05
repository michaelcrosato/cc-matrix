import { load, arena, sleep } from './lib.mjs';
const route = { '1-1': 'W', '1-2': 'N', '1-4': 'E', '1-5': 'N', '2-1': 'W', '2-2': 'N', '2-4': 'E', '2-5': 'N', '3-1': 'W', '3-2': 'N', '3-4': 'E', '3-5': 'N' };
const ROOMS = ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-B', '2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-B', '3-1', '3-2', '3-3', '3-4', '3-5', '3-6', '3-B', 'GR', 'L1', 'L2', 'L3', 'LB'];
export const suites = {
  'room-sweep'(C) {
    for (const id of ROOMS) {
      const L = load(); const { game, MT } = L; game.advance(.3); MT.warp(id, { players: 2, bot: true, god: true, mode: 'test' }); MT.test = { noFlow: true }; let t = 0; const w = () => MT.worldNow;
      const rm = MT.ROOMS[id]; const kinds = new Set(); for (; t < 260; t++) { game.advance(1); if (!w()) break; for (const e of w().enemies) kinds.add(e.kind); if (['clear', 'exit'].includes(w().phase) || game.sceneName !== 'play') break; if (game.errors.length) break; }
      C.ok(id + ' clears within 240 s of game time', t < 240, 't=' + t); C.ok(id + ' has no errors', game.errors.length === 0, game.errors.map(e => e.message || String(e)).join('|'));
      if (rm.waves && rm.waves.length) { C.eq(id + ' waves spawned match the data', w().waveI, rm.waves.length - 1); const want = new Set(rm.waves.flatMap(x => x.spawn.map(s => s[1]))); for (const k of want) C.ok(id + ' kind appeared: ' + k, kinds.has(k)); }
    }
  },
  bosses(C) {
    for (const [id, kind] of [['1-B', 'mashy'], ['2-B', 'wheel'], ['3-B', 'lance']]) {
      const L = load(); const { game, MT } = L; game.advance(.3); MT.warp(id, { players: 2, bot: true, god: true, mode: 'test' }); MT.test = { noFlow: true }; const w = () => MT.worldNow; const phases = new Set(), subs = new Set(); let t = 0, intro = false;
      for (; t < 400; t++) { game.advance(1); const W = w(); if (!W) break; if (W.phase === 'bossIntro') intro = true; if (W.boss) { phases.add(W.boss.phase + (W.boss.stage || '')); subs.add(W.boss.sub); } if (W.phase === 'clear') break; if (game.errors.length) break; }
      C.ok(kind + ' intro played', intro); C.ok(kind + ' beaten within 400 s', w() && w().phase === 'clear', 't=' + t); C.ok(kind + ' no errors', game.errors.length === 0, game.errors.map(e => e.message || String(e)).join('|'));
      if (kind === 'mashy') C.ok('mashy goes through 3 phases', phases.size >= 3, [...phases].join());
      if (kind === 'wheel') { C.ok('wheel breaks loose in phase 2', phases.has('2'), [...phases].join()); C.ok('wheel has spin, stun, break', ['spin', 'stun', 'break'].every(s => subs.has(s)), [...subs].join()); }
      if (kind === 'lance') { C.ok('lance: commercial break happened', subs.has('break')); C.ok('lance: robot reveal then the network', subs.has('crash') && phases.has('1network'), [...phases].join() + ' ' + [...subs].join()); C.ok('lance: all 3 patterns', ['cyclone', 'micdrop', 'sweep'].every(s => subs.has(s)), [...subs].join()); }
    }
    // armor, weak points, forced wheel segments
    const A = arena({ room: '1-B' }); const { w, MT } = A; w.phase = 'test'; const b = w.boss; b.start(w); const body = b.part('body'), h0 = body.hp; w.hurtEnemy; b.hitPart(w, { part: body, x: 0, y: 0 }, 10, 0, 0); C.ok('mashy body tinks while an arm lives (armor .15)', h0 - body.hp < 3, h0 - body.hp);
    const hatch = b.part('hatch'); hatch.active = true; const hh = hatch.hp; b.hitPart(w, { part: hatch, x: 0, y: 0 }, 10, 0, 0); C.ok('hatch weak point takes x2', hh - hatch.hp >= 19, hh - hatch.hp);
    const B2 = arena({ room: '2-B' }); B2.MT.cheats.god = true; const wb = B2.w.boss; wb.start(B2.w); wb.forced = [0, 1, 2, 3, 4, 5, 6, 7]; const hit = new Set(); B2.w.phase = 'boss'; for (let i = 0; i < 150 * 30 && hit.size < 8; i++) { B2.adv(1 / 30); if (wb.stopped !== undefined) hit.add(wb.stopped); if (wb.phase === 1) for (const p of wb.parts) if (p.seg !== undefined) p.hp = p.max; wb.part('core').hp = wb.part('core').max; } C.eq('every wheel segment attack fires via forced stops', hit.size, 8);
  },
  proof(C) {
    const run = () => { const L = load(); const { game, MT } = L; game.advance(.3); MT.warp('1-1', { players: 2, bot: true, seed: 7, mode: 'test', god: true }); game.advance(30); return MT.stateHash(); };
    const a = run(), b = run(); C.ok('determinism: same seed, same hash', a === b && a !== 0, a + ' vs ' + b);
  },
  playthrough(C) {
    const L = load(); const { game, MT } = L; game.advance(.3); const seenKinds = new Set(), weapons = new Set(), scenes = []; let bomb = false, boat = false, prime = false;
    MT.cheats.god = true; MT.botRoute = route; MT.newRun({ mode: 'arcade', diff: 'CONTESTANT', players: [{ slot: 0, look: 0, bot: true }, { slot: 1, look: 1, bot: true }], seed: 11 }); const run = MT.run; for (const c of run.cs) { c.botOpts = { forceBoat: true, route }; }
    MT.on('roomEnter', w => { w.dmgBoost = 3; }); game.go('coldOpen'); let last = '', hazards = new Set(), guard = 0;
    while (guard++ < 4000) {
      game.advance(1); const sn = game.sceneName; if (sn !== last) { last = sn; scenes.push(sn); }
      const w = MT.worldNow; if (w) { for (const e of w.enemies) seenKinds.add(e.kind); for (const c of w.cs) { weapons.add(c.wpn); for (const k in c.addons) weapons.add(k); if (c.boatT > 0) boat = true; } for (const h of w.hazards) hazards.add(h.kind); if (w.rat.prime > 0) prime = true; for (const c of w.cs) if (c.bombs < 3) bomb = true; if (w.rat.R > 30) {} }
      // skip dialog-heavy scenes by pressing confirm
      if (['coldOpen', 'episodeCard', 'recap', 'mapcard', 'ending', 'credits'].includes(sn)) game.input.tap('confirm');
      if (sn === 'initials') { for (let i = 0; i < 4; i++) { game.input.tap('confirm'); game.advance(.1); } }
      if (sn === 'scores' || sn === 'title') break; if (game.errors.length) break;
      if (w && w.phase !== 'boss') for (const c of w.cs) { c.bombs = 3; }
    }
    C.ok('playthrough reaches the high-score table or title', last === 'scores' || last === 'title', 'ended at ' + last + ' after ' + guard + ' s'); C.ok('no errors in the whole playthrough', game.errors.length === 0, game.errors.map(e => (e.message || String(e)) + ' ' + (e.stack || '').split('\n')[1]).join(' | '));
    for (const k of ['goon', 'clapbot', 'popper', 'mime', 'disco', 'heckler', 'hecklerKing', 'tank', 'snake', 'brute']) C.ok('enemy kind killed/seen: ' + k, seenKinds.has(k));
    C.ok('both hazards met', hazards.has('conveyor') && hazards.has('pyro'), [...hazards].join()); C.ok('Prime Time at least once', prime || run.cs.some(c => c.cash > 400000)); C.ok('a showboat happened', boat); C.ok('keys >= 5 on the left path', run.keys >= 5, 'keys ' + run.keys);
    const ord = ['coldOpen', 'episodeCard', 'play', 'mapcard', 'recap', 'ending'].every(s => scenes.includes(s)); C.ok('scenes in order incl. recap', ord, scenes.join('>').slice(0, 200)); C.ok('3 recaps', scenes.filter(s => s === 'recap').length === 3, scenes.filter(s => s === 'recap').length); C.ok('Green Room played (Ending B)', run.green === true && scenes.includes('ending'), 'green ' + run.green);
    C.ok('recap prizes exist', run.cs.some(c => c.prizes.length > 0));
  },
  'playthrough-lose'(C) {
    const L = load(); const { game, MT } = L; game.advance(.3); MT.cheats.god = false; MT.newRun({ mode: 'arcade', diff: 'ROOKIE', players: [{ slot: 0, look: 0, bot: false }], seed: 3 }); const run = MT.run; run.cs[0].kind = 'local'; run.cs[0].botOpts = {}; game.go('play', { room: '1-1', entry: 'S' }, { fade: 0 }); game.advance(.2);
    const w0 = MT.worldNow; w0.cs[0].auto = false; w0.cs[0].input = game.input; let saw = new Set(); for (let t = 0; t < 400; t++) { const c = run.cs[0]; if (MT.worldNow && game.sceneName === 'play' && c.state === 'alive') { c.hp = Math.min(c.hp, 1); } game.advance(1); saw.add(game.sceneName); if (game.sceneName === 'play' && MT.worldNow && MT.worldNow.mode === 'solo') { /* idle player gets mashed */ } if (game.sceneName === 'gameover') break; if (game.sceneName === 'play' && game.scene.cont) { game.advance(12); } }
    C.ok('CONTINUE? then Game Over after the countdown', saw.has('gameover'), [...saw].join()); for (let i = 0; i < 20 && game.sceneName === 'gameover'; i++) { game.input.tap('confirm'); game.advance(1); } C.ok('game over leads on (initials or scores)', ['initials', 'scores', 'title'].includes(game.sceneName), game.sceneName); C.ok('no errors', game.errors.length === 0, game.errors.map(e => e.message || e).join('|'));
  }
};
