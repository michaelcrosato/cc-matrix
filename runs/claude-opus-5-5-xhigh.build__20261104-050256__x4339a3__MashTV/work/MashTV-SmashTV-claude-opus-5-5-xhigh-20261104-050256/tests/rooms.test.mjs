// enemies, rooms and room-sweep suites
import { playRoom } from './core.test.mjs';
const quiet = w => { if (w.script) w.script.cancel(); for (const d of ['N', 'E', 'S', 'W']) w.arena.doors[d].queue.length = 0; w.timers.length = 0; for (const e of w.enemies) e.dead = true; w.enemies.length = 0; w.fShots.clear(); w.lobs.length = 0; w.pickups.length = 0; };
const run = (game, s, until) => { for (let i = 0; i < s * 60; i++) { game.advance(1 / 60); if (until && until()) return true; } return false; };
export const suites = {
  enemies(t) {
    const P = playRoom(t, '1-1', { seed: 3 }), { MT, game, c } = P, w = P.w(); quiet(w); c.godMode = false;
    const hold = () => { c.place(184, 180); c.body.vx = c.body.vy = 0; };
    // door entry
    const g = w.spawnEnemy('goon', -14, 120, { door: 'W' });
    run(game, 3, () => !g.entering); t.check('a goon from a door walks into the interior', !g.entering && g.x > 16, [g.x, g.entering]);
    hold(); const d0 = Math.hypot(g.x - c.x, g.y - c.y); run(game, 1); t.check('the goon closes in', Math.hypot(g.x - c.x, g.y - c.y) < d0 - 20);
    // goon swing: a wind-up of .3 s before the hit
    quiet(w); c.invuln = 0; c.hp = 3; hold(); const gs = w.spawnEnemy('goon', c.x + 12, c.y, { inside: true }); let tWind = null, tHit = null, t0 = w.time;
    const offH = MT.on('ev:hurt', () => { if (tHit === null) tHit = w.time; });
    run(game, 2, () => { if (tWind === null && gs.state === 'wind') tWind = w.time; return tHit !== null; }); offH();
    t.check('the goon telegraphs its baton for at least .3 s', tWind !== null && tHit !== null && tHit - tWind >= .3 - 1 / 60 - 1e-6, [tWind, tHit]);
    // popper: fuse .6 s, then 8 shards
    quiet(w); c.invuln = 99; hold(); const pp = w.spawnEnemy('popper', c.x + 14, c.y, { inside: true }); let fuseAt = null;
    run(game, 2, () => { if (fuseAt === null && pp.state === 'fuse') fuseAt = w.time; return pp.dead; });
    t.check('a popper lights its fuse and bursts into 8 shards', pp.dead && w.fShots.list.filter(b => b.data.kind === 'shard').length === 8, w.fShots.list.length);
    // mime: telegraph .7 s, then a blast
    quiet(w); c.invuln = 0; c.hp = 3; hold(); const mm = w.spawnEnemy('mime', c.x + 20, c.y, { inside: true }); let teleAt = null, hpAt = null;
    run(game, 2, () => { if (teleAt === null && mm.state === 'tele') teleAt = w.time; if (c.hp < 3 && hpAt === null) hpAt = w.time; return mm.dead; });
    t.check('a land mime telegraphs .7 s, then blasts', teleAt !== null && hpAt !== null && hpAt - teleAt >= .69 && c.hp === 2, [teleAt, hpAt, c.hp]);
    t.check('mimes do not count for the clear', !MT.ENEMIES.mime.counted);
    // disco: bounces, fires 4 beams in a + or ×, the big one splits
    quiet(w); c.invuln = 99; c.place(40, 40); const dz = w.spawnEnemy('disco', 184, 120, { inside: true, ang: 0 }); dz.fireT = .5; let flare = false;
    run(game, 3, () => { if (dz.state === 'flare') flare = true; return w.fShots.list.length >= 4; });
    t.check('a disco ball flares, then fires four beams', flare && w.fShots.list.filter(b => b.data.kind === 'beam').length === 4, w.fShots.list.length);
    const vx0 = Math.sign(dz.vx); run(game, 4); t.check('it bounces off the walls', Math.sign(dz.vx) !== vx0 || dz.x > 30, [dz.vx, dz.x]);
    quiet(w); const big = w.spawnEnemy('discoBig', 184, 120, { inside: true }); w.damageEnemy(big, 99, { owner: 0 });
    t.check('a big disco ball splits into two small ones', w.enemies.filter(e => e.kind === 'discoSmall' && !e.dead).length === 2);
    // heckler: keeps its distance, lobs tomatoes with a ring
    quiet(w); c.invuln = 99; hold(); const hk = w.spawnEnemy('heckler', c.x, c.y - 20, { inside: true }); hk.throwT = 99; run(game, 3);
    const hd = Math.hypot(hk.x - c.x, hk.y - c.y); t.check('a heckler keeps 70-110 units away', hd > 55 && hd < 125, hd);
    hk.throwT = .01; run(game, .1); t.check('it lobs a tomato at a marked spot', w.lobs.length === 1 && w.lobs[0].tx !== undefined, w.lobs.length);
    const L = w.lobs[0]; run(game, 1.2); t.check('the tomato lands a second later and leaves a splat', w.lobs.length === 0 && w.decals.some(d => d.kind === 'splat'), [w.lobs.length, w.decals.length]);
    quiet(w); hold(); const sp = w.spawnAudience('heckler'); const hl = w.enemies[w.enemies.length - 1];
    t.check('the audience leaps over the wall', hl && hl.leap && (hl.x < 0 || hl.x > 368)); run(game, 1); t.check('and lands inside', hl && !hl.leap && hl.x > 16 && hl.x < 352);
    // tank: an aim line .4 s, then a shell that explodes
    quiet(w); c.invuln = 0; c.hp = 3; hold(); const tk = w.spawnEnemy('tank', c.x, 60, { inside: true }); tk.fireT = .5; tk.turret = Math.PI / 2; let aimAt = null, shot = null;
    run(game, 2, () => { if (aimAt === null && tk.state === 'aim') aimAt = w.time; if (shot === null && w.fShots.list.some(b => b.data.kind === 'shell')) shot = w.time; return shot !== null; });
    t.check('the dolly tank flashes its lens .4 s before a shell', aimAt !== null && shot !== null && shot - aimAt >= .39, [aimAt, shot]);
    // snake: segments follow, shot-off segments shorten it
    quiet(w); c.invuln = 99; const sn = w.spawnEnemy('snake', 100, 100, { inside: true }); run(game, 1);
    t.check('a cable snake has 10 segments', sn.segs.length === 10);
    w.damageEnemy(sn.segs[4], 99, { owner: 0 }); run(game, .1); t.check('shooting a segment off shortens it', sn.segs.length === 9, sn.segs.length);
    w.damageEnemy(sn, 99, { owner: 0 }); run(game, .1); t.check('the head takes the cable with it', w.enemies.filter(e => e.kind === 'snakeSeg').length === 0);
    // brute: a .8 s stomp, a charge, a wall stun with double damage
    quiet(w); c.invuln = 99; c.place(320, 120); const br = w.spawnEnemy('brute', 120, 120, { inside: true }); br.cycle = .01; let teleB = null, charge = null;
    run(game, 4, () => { if (teleB === null && br.state === 'tele') teleB = w.time; if (charge === null && br.state === 'charge') charge = w.time; return br.state === 'stun'; });
    t.check('the brute stomps .8 s, then charges', teleB !== null && charge - teleB >= .79, [teleB, charge]);
    t.check('a wall stuns it', br.state === 'stun', br.state);
    const hp0 = br.hp; w.damageEnemy(br, 1, { owner: 0 }); t.check('stunned, it takes double damage', Math.abs(hp0 - br.hp - 2) < .01, hp0 - br.hp);
    // deaths: confetti, cash and drops
    quiet(w); let kills = 0; const offK = MT.on('ev:kill', () => kills++); const cash0 = c.pr.cash;
    for (const k of ['goon', 'clapbot', 'popper', 'disco', 'heckler', 'tank', 'brute', 'hecklerKing']) { const e = w.spawnEnemy(k, 184, 120, { inside: true }); w.damageEnemy(e, 999, { owner: c.netId }); }
    game.advance(.02); offK(); t.check('every kind dies with a kill event and cash', kills >= 8 && c.pr.cash > cash0, [kills, c.pr.cash]);
    t.check('the Heckler King drops the key', w.pickups.some(p => p.kind === 'key'));
    t.check('no errors', !game.errors.length, game.errors.map(e => e.message));
  },
  rooms(t) {
    const P = playRoom(t, '1-1', { waves: false }), { MT, game, c } = P;
    MT.T.waveSize = 1; MT.T.waveGap = 0;
    MT.ROOMS.TEST = { id: 'TEST', name: 'TEST ROOM', ep: 1, type: 'battle', set: 'studio', exits: { E: '1-3' }, par: 999,
      waves: [{ at: 1, spawn: [['N', 'goon', 2]] }, { left: 0, spawn: [['S', 'goon', 1]] }, { at: 2, left: 0, spawn: [['E', 'goon', 1]] }] };
    game.go('play', { room: 'TEST' }); game.advance(.4); let w = MT.play.world; c.godMode = true;
    run(game, 4, () => w.phase === 'WAVES');
    run(game, 1.1); t.check('wave 1 at its time', w.wave === 1, w.wave);
    run(game, 1); t.check('wave 2 waits for the field to clear (left)', w.wave === 1, w.wave);
    for (const e of w.enemies) w.killEnemy(e, { owner: 0 }); run(game, 3, () => w.wave === 2); t.check('then it starts', w.wave === 2, w.wave);
    run(game, 2.5, () => w.wave === 3); t.check('a wave with at and left starts at the first of them', w.wave === 3, w.wave);
    t.check('scaling: 1 player, CONTESTANT', MT.scaleN(w, 10) === 10);
    MT.run.contestants.push(MT.run.contestants[0]); w.contestants.push(c); t.check('scaling: +35% a player', MT.scaleN(w, 10) === 14, MT.scaleN(w, 10)); w.contestants.pop(); MT.run.contestants.pop();
    MT.setTune('waveSize', 2); t.check('scaling: the wave-size slider', MT.scaleN(w, 10) === 20); MT.T.waveSize = 1;
    MT.run.diff = 'CHAMPION'; t.check('scaling: difficulty', MT.scaleN(w, 10) === 12); MT.run.diff = 'CONTESTANT';
    // clear ignores mimes, crates, locks
    run(game, 3); for (const e of w.enemies) w.killEnemy(e, { owner: 0 }); w.spawnEnemy('mime', 100, 100, { inside: true }); w.addTarget('crate', 200, 200); w.addTarget('lock', 120, 26);
    const cash = c.pr.cash; run(game, 4, () => w.phase === 'CLEAR');
    t.check('the clear ignores mimes, crates and locks', w.phase === 'CLEAR' || w.phase === 'EXIT', w.phase);
    t.check('the clear bonus pays $1,000 × episode × multiplier', c.pr.cash - cash >= 1000, c.pr.cash - cash);
    run(game, 2, () => w.phase === 'EXIT');
    t.check('only the listed exits open', w.arena.doors.E.state === 'exit' || w.arena.doors.E.state === 'opening', ['N', 'E', 'S', 'W'].map(d => w.arena.doors[d].state));
    t.check('...and no others', ['N', 'S', 'W'].every(d => w.arena.doors[d].state !== 'exit'));
    let hurry = false; const offH = MT.on('ev:hurry', () => { hurry = true; }); run(game, 26.5); offH();
    t.check('HURRY UP after 25 s', hurry);
    c.place(345, 120); const I = game.input; I.press('KeyD'); run(game, 2, () => w.exitPick); I.release('KeyD');
    t.check('walking into an exit picks it', !!w.exitPick && w.exitPick.door === 'E', w.exitPick);
    run(game, 6, () => MT.play.world !== w && MT.play.world.phase !== 'DONE'); const w2 = MT.play.world;
    t.check('the exit loads the right room, entered from the opposite door', w2.room.id === '1-3' && w2.entry === 'W', [w2.room.id, w2.entry]);
    // every key rule yields exactly one key
    const keyRooms = { '1-2': 'mimes', '1-4': 'survive', '1-6': 'crate', '2-2': 'belt', '2-4': 'carrier', '3-2': 'final', '3-4': 'vault', '3-6': 'carrier' };
    for (const id in keyRooms) {
      const Q = playRoom(t, id, { players: 2, god: true, ctl: 'bot' }), W2 = Q.w(); let keys = 0; const off = Q.MT.on('ev:key', () => keys++);
      for (let i = 0; i < 320 && !(W2.phase === 'EXIT' && !W2.pickups.some(p => p.kind === 'key')); i++) { Q.game.advance(.5); if (W2.phase === 'EXIT') { const k = W2.pickups.find(p => p.kind === 'key' && !(p.locked && p.locked())); if (k) for (const cc of W2.contestants) cc.place(k.x, k.y); } }
      off();
      t.check('key rule ' + keyRooms[id] + ' (' + id + ') yields one key', keys <= 1 && Q.MT.run.keys === 1, [Q.MT.run.keys, keys, W2.phase, W2.pickups.map(p => p.kind)]);
    }
  },
  'room-sweep'(t) {
    const ids = ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '3-1', '3-2', '3-3', '3-4', '3-5', '3-6', 'L1', 'L2', 'L3'];
    for (const id of ids) {
      const Q = playRoom(t, id, { players: 2, god: true, ctl: 'bot', seed: 11 }), W = Q.w(), room = Q.MT.ROOMS[id];
      for (const c of Q.MT.run.contestants) c.dmgMul = 1;
      let ok = false; for (let i = 0; i < 480 && !ok; i++) { Q.game.advance(.5); ok = W.phase === 'CLEAR' || W.phase === 'EXIT' || W.phase === 'DONE' || Q.MT.play.world !== W; }
      t.check(id + ' ' + room.name + ': two bots clear it within 240 s', ok, [W.phase, W.wave, W.countedAlive(), W.arena.pendingSpawns(), Math.round(W.time)]);
      const want = new Set(); for (const wv of room.waves || []) for (const s of wv.spawn || []) want.add(s[1]); if (room.survive) { want.add('goon'); want.add('clapbot'); want.add('popper'); } for (const p of room.place || []) want.add(p[0]);
      const missing = [...want].filter(k => !W.stats.kinds[k]);
      t.check(id + ': every listed kind appeared', !missing.length, missing);
      t.check(id + ': every wave spawned', !room.waves || W.wave === room.waves.length, [W.wave, room.waves && room.waves.length]);
      t.check(id + ': no errors', !Q.game.errors.length, Q.game.errors.map(e => e.where + ' ' + e.message));
    }
  },
};
