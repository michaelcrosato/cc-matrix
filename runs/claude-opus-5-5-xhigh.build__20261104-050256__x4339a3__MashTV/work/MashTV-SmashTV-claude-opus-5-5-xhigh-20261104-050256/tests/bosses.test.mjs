// bosses and playthrough suites
import { playRoom } from './core.test.mjs';
const run = (game, s, until) => { for (let i = 0; i < s * 30; i++) { game.advance(1 / 30); if (until && until()) return true; } return !!(until && until()); };
export const suites = {
  bosses(t) {
    // ---------------------------------------------------------------- MASHY
    { const Q = playRoom(t, '1-B', { players: 2, god: true, ctl: 'bot', seed: 5 }), { MT, game } = Q, w = Q.w(); for (const c of MT.run.contestants) c.botOpts = { hold: [184, 200] };
      const b = w.boss; t.check('Mashy enters with the boss intro', b && b.kind === 'mashy');
      run(game, 8, () => b.phase === 'p1'); t.check('Mashy: phase 1 after the intro', b.phase === 'p1', b.phase);
      const body = b.get('body'), h0 = body.hp; w.damageBossPart(body, 10, { owner: 0 }); t.check('Mashy\'s body tinks while an arm lives (armor .15)', Math.abs(h0 - body.hp - 1.5) < .01, h0 - body.hp);
      let butter = false, gravy = false; run(game, 5, () => { for (const q of w.fShots.list) { if (q.data.kind === 'butter') butter = true; if (q.data.kind === 'gravy') gravy = true; } return butter && gravy; });
      t.check('the Butter Cannon and the Gravy Gatling fire', butter && gravy, [butter, gravy]);
      w.damageBossPart(b.get('armL'), 999, { owner: 0 }); w.damageBossPart(b.get('armR'), 999, { owner: 0 }); game.advance(.05);
      t.check('both arms off: phase 2', b.phase === 'p2', b.phase);
      let ring = false, tots = false; run(game, 7, () => { if (w.fShots.list.filter(q => q.data.kind === 'orb').length >= 14) ring = true; if (w.lobs.some(L => L.kind === 'tot')) tots = true; return ring && tots && b.hatch > .9; });
      t.check('phase 2: the head ring and the tater tots', ring && tots, [ring, tots]);
      t.check('the hatch opens', b.hatch > .9, b.hatch);
      const h1 = body.hp; w.damageBossPart(b.get('hatch'), 10, { owner: 0 }); t.check('the open hatch is a weak point (×2 at .5 armor)', Math.abs(h1 - body.hp - 10) < .01, h1 - body.hp);
      body.hp = body.max * .3; run(game, 2, () => b.phase === 'p3'); t.check('under 35%: phase 3, the charges', b.phase === 'p3', b.phase);
      let charged = false; run(game, 4, () => { if (b.tele) charged = true; return charged; }); t.check('the charge is telegraphed', charged);
      w.damageBossPart(body, 9999, { owner: 0 }); run(game, 4, () => b.dead);
      t.check('Mashy\'s death: a shower of cash, prizes and a capsule', b.dead && w.pickups.filter(p => MT.PICKUPS[p.kind].cashy).length >= 25 && w.pickups.some(p => p.kind === 'prize') && w.pickups.some(p => p.kind === 'capsule'), w.pickups.length);
      run(game, 8, () => game.sceneName === 'recap'); t.check('then the Prize Recap', game.sceneName === 'recap', game.sceneName);
      t.check('Mashy: no errors', !game.errors.length, game.errors.map(e => e.message)); }
    // ---------------------------------------------------------------- THE WHEEL
    { const Q = playRoom(t, '2-B', { players: 2, god: true, ctl: 'bot', seed: 6 }), { MT, game } = Q, w = Q.w(); for (const c of MT.run.contestants) c.botOpts = { hold: [184, 200], noFire: true };
      const b = w.boss; run(game, 6, () => b.phase === 'p1'); t.check('the Wheel: its spin cycle after the intro', b.phase === 'p1', b.phase);
      b.forced = [0, 1, 2, 3, 4, 5, 6, 7]; const stops = new Set(); const off = MT.on('ev:wheelStop', d => stops.add(d.seg));
      let kinds = new Set(); run(game, 110, () => { if (w.lobs.some(L => L.kind === 'tomato')) kinds.add('tomato'); if (b.beamOn) kinds.add('laser'); if (w.enemies.some(e => e.kind === 'mime')) kinds.add('mime'); if (w.fShots.list.some(q => q.data.kind === 'coin')) kinds.add('bankrupt'); if (w.enemies.some(e => e.kind === 'disco')) kinds.add('disco'); if (w.arena.pendingSpawns() || w.enemies.some(e => e.kind === 'goon')) kinds.add('goon'); if (b.jackpotT > 0) kinds.add('jackpot'); if (b.speedMul > 1) kinds.add('again'); return stops.size === 8; }); off();
      t.check('every segment comes up and runs its attack', stops.size === 8 && kinds.size === 8, [[...stops], [...kinds]]);
      const core = b.get('core'), c0 = core.hp; b.jackpotT = 0; w.damageBossPart(core, 10, { owner: 0 }); t.check('the Jackpot Core is armored in phase 1', c0 - core.hp < 2, c0 - core.hp);
      for (let i = 0; i < 4; i++) w.damageBossPart(b.get('seg' + i), 999, { owner: 0 }); game.advance(.05);
      t.check('four segments down: the wheel breaks loose', b.loose, b.phase);
      const c1 = core.hp; w.damageBossPart(core, 10, { owner: 0 }); t.check('loose, the core takes full damage', Math.abs(c1 - core.hp - 10) < .01);
      w.damageBossPart(core, 9999, { owner: 0 }); run(game, 5, () => b.dead); t.check('the Wheel falls flat and pays out', b.dead && w.pickups.length > 20);
      t.check('the Wheel: no errors', !game.errors.length, game.errors.map(e => e.message)); }
    // ---------------------------------------------------------------- LANCE -> THE NETWORK
    { const Q = playRoom(t, '3-B', { players: 2, god: true, ctl: 'bot', seed: 8 }), { MT, game } = Q, w = Q.w(); for (const c of MT.run.contestants) c.botOpts = { hold: [184, 200] };
      const pats = new Set(); const off = MT.on('ev:pattern', d => pats.add(d.name));
      const b = w.boss; run(game, 8, () => b.phase === 'lance'); t.check('Lance in the Starmaker 9000 after the intro', b.phase === 'lance', b.phase);
      run(game, 30, () => pats.size >= 3); off();
      t.check('cue cards, the mic drop and the spotlight sweep', pats.size >= 3, [...pats]);
      const pod = b.get('podium'); pod.hp = pod.max * .6; let gone = false, back = false; const o2 = MT.on('ev:backFromBreak', () => { back = true; });
      run(game, 20, () => { if (b.gone) gone = true; if (gone) for (const e of w.enemies) w.killEnemy(e, { owner: 0 }); return back; }); o2();
      t.check('a Commercial Break: Lance leaves, the adds come, he returns', gone && back, [gone, back]);
      let reveal = false; const o3 = MT.on('ev:robotReveal', () => { reveal = true; }); pod.hp = 1; w.damageBossPart(pod, 5, { owner: 0 });
      run(game, 14, () => b.stage === 'network'); o3();
      t.check('at 0 HP: LANCE WAS A ROBOT, then The Network', reveal && b.stage === 'network', [reveal, b.stage]);
      const eye = b.get('eye'), e0 = eye.hp; w.damageBossPart(eye, 10, { owner: 0 }); t.check('THE EYE is armored while 8 TVs stand', e0 - eye.hp < 2);
      const chs = new Set(); run(game, 25, () => { for (const tv of b.tvs) if (tv.ch >= 0) chs.add(tv.ch); return chs.size >= 5; });
      t.check('the TVs flip to every channel', chs.size >= 5, [...chs]);
      for (let i = 0; i < 8; i++) w.damageBossPart(b.tvs[i], 999, { owner: 0 }); game.advance(.05);
      const e1 = eye.hp; w.damageBossPart(eye, 10, { owner: 0 }); t.check('after 8 TVs, THE EYE takes full damage', Math.abs(e1 - eye.hp - 10) < .01);
      w.damageBossPart(eye, 99999, { owner: 0 }); run(game, 8, () => b.dead); t.check('SIGNAL LOST: The Network dies', b.dead);
      t.check('the finale: no errors', !game.errors.length, game.errors.map(e => e.message)); }
  },
  playthrough(t) {
    const { MT, game } = t.boot();
    const path = ['1-1', '1-2', '1-4', '1-5', '1-B', '2-1', '2-2', '2-4', '2-5', '2-B', '3-1', '3-2', '3-4', '3-5', '3-B'];
    const route = (w, doors) => { const i = path.indexOf(w.room.id); const next = path[i + 1]; return doors.find(d => w.room.exits[d] === next) || doors[0]; };
    const RUN = MT.newRun({ mode: 'arcade', diff: 'CONTESTANT', seed: 21 });
    for (let i = 0; i < 2; i++) { const c = MT.addRunPlayer({ slot: i, look: i, ctl: 'bot', input: i === 0 ? game.input : null, bot: { route }, god: true }); c.dmgMul = 3; }
    const scenes = [], rooms = []; let primes = 0, bombs = 0, boats = 0, reveal = 0, recaps = 0; const used = new Set();
    MT.on('ev:prime', () => primes++); MT.on('ev:bomb', () => bombs++); MT.on('ev:showboat', () => boats++); MT.on('ev:robotReveal', () => reveal++);
    game.go('play', { room: '1-1', intro: 'coldOpen' });
    let last = null, guard = 0, typed = 0;
    const killed = {}, weapons = {}, hazards = {};
    while (guard++ < 30 * 60 * 40) {
      game.advance(1 / 30);
      if (game.sceneName !== last) { scenes.push(game.sceneName); last = game.sceneName; if (last === 'recap') recaps++; }
      const w = MT.play.world;
      if (game.sceneName === 'play' && w) {
        if (!rooms.includes(w.room.id)) rooms.push(w.room.id);
        Object.assign(killed, w.stats.killed); Object.assign(weapons, w.stats.weapons); Object.assign(hazards, w.stats.hazards);
        for (const c of MT.run.contestants) { if (c.weapon !== 'blaster' && c.firing) used.add(c.weapon); for (const k in c.addons) if (c.addons[k] > 0) used.add(k); }
        if (w.phase === 'EXIT' && w.phaseT > 6) for (const c of w.contestants) c.botOpts.rush = true;
        if (w.phase === 'EXIT') { const k = w.pickups.find(p => p.kind === 'key' && !(p.locked && p.locked())); if (k && w.phaseT > 3) w.contestants[0].place(k.x, k.y); }
        if (w.phase === 'WAVES' && w.time > 30 && !w._bombed) { w._bombed = true; const c = w.contestants[0]; c.pr.bombs = Math.max(1, c.pr.bombs); w.showstopper(c); }
        if (w.phase === 'WAVES' && w.time > 20 && !w._boated) { w._boated = true; w.contestants[1].botOpts.boatAt = w.time; }
        if (w.phase === 'BONUS' && w.statueUp) { const s = w.pickups.find(p => p.kind === 'statue'); if (s && s.rise >= 1) w.contestants[0].place(s.x, s.y); }
      }
      if (game.sceneName === 'initials' && MT.cab.entry && guard % 6 === 0) { MT.cab.entry.input.tap('confirm'); typed++; }
      if (game.sceneName === 'scores' && guard % 30 === 0) game.input.tap('confirm');
      if ((game.sceneName === 'title' || game.sceneName === 'attract') && scenes.includes('scores')) break;
    }
    t.check('the left path in every episode', path.every(p => rooms.includes(p)), path.filter(p => !rooms.includes(p)));
    t.check('three recaps', recaps === 3, recaps);
    t.check('five keys or more: the Green Room', rooms.includes('GR') && RUN.keys >= 5, [RUN.keys, rooms]);
    t.check('the ending was the true one (B)', RUN.ending === 'b', RUN.ending);
    t.check('scenes in order: play, recap, play, recap, play, recap, play (GR), ending, initials, scores, title', JSON.stringify(scenes.filter((s, i) => s !== scenes[i - 1])).includes('"recap","play","recap","play","recap","play","ending","initials","scores"'), scenes);
    const kinds = ['goon', 'clapbot', 'popper', 'mime', 'disco', 'heckler', 'hecklerKing', 'tank', 'snake', 'brute'];
    t.check('every enemy kind killed', kinds.every(k => killed[k]), kinds.filter(k => !killed[k]));
    const wl = ['spread', 'rockets', 'popcorn', 'laser', 'records', 'shield', 'speed'];
    t.check('every weapon and add-on picked up and used', wl.every(k => weapons[k] && used.has(k)), [wl.filter(k => !weapons[k]), wl.filter(k => !used.has(k))]);
    t.check('both hazards met', hazards.conveyor && hazards.pyro, hazards);
    t.check('Prime Time at least once', primes >= 1, primes);
    t.check('a Showstopper and a showboat used', bombs >= 1 && boats >= 1, [bombs, boats]);
    t.check('prizes were won', RUN.contestants.some(c => c.pr.prizes.length > 0));
    t.check('the robot reveal ran', reveal >= 1);
    t.check('initials typed with the player\'s input', typed >= 3 && MT.cab.table('show').length >= 1, [typed, MT.cab.table('show')]);
    t.check('back at the title', game.sceneName === 'title', game.sceneName);
    t.check('the whole run: no errors', !game.errors.length, game.errors.map(e => e.where + ' ' + e.message));
    // a second run: no cheats, ROOKIE, until every life is gone; the continue runs out; game over; initials
    MT.newRun({ mode: 'arcade', diff: 'ROOKIE', seed: 22 });
    const c = MT.addRunPlayer({ slot: 0, ctl: 'bot', input: game.input, bot: { boats: false, human: true } }); c.pr.cash = 0;
    game.go('play', { room: '1-1' });
    const sc = []; guard = 0; let contSeen = false;
    while (guard++ < 60 * 30 * 30) { game.advance(1 / 30); const w = MT.play.world; if (w && w.phase === 'WAVES') { c.hp = Math.min(c.hp, 1); c.invuln = Math.min(c.invuln, .05); } if (MT.play.overlay && MT.play.overlay.cont) contSeen = true; if (game.sceneName !== sc[sc.length - 1]) sc.push(game.sceneName); if (game.sceneName === 'initials' && MT.cab.entry && guard % 6 === 0) MT.cab.entry.input.tap('confirm'); if ((game.sceneName === 'title' || game.sceneName === 'attract') && sc.includes('gameover')) break; if (game.sceneName === 'scores' && sc.includes('gameover') && guard % 30 === 0) game.input.tap('confirm'); }
    t.check('out of lives: the continue countdown', contSeen);
    t.check('it ran out: game over, then the table and the title', sc.includes('gameover') && sc.includes('scores'), sc);
    t.check('the second run: no errors', !game.errors.length, game.errors.map(e => e.where + ' ' + e.message));
  },
};
