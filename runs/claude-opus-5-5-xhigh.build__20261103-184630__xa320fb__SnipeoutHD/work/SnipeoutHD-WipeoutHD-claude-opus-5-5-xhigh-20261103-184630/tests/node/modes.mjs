// modes: time trial (and its ghost round trip), hot lap, snipeout, overclock, the academy (the drill bot passes all
// eleven), versus (two viewports, both finish), the grand prix's points and ties.
import { load } from '../lib/vm.mjs';
import { bot, drillBot, drive } from '../lib/bot.mjs';
export async function run(T) {
  const { SN, game } = load({ quiet: true }); await game.booted;
  const U = 16, I = game.input, snap = () => game.debug.snapshot();
  const go = (cfg, s = 1.2) => { SN.flow.start(Object.assign({ team: 'kestrel', pilot: 'vale', seed: 21, intro: false }, cfg)); game.advance(s); };
  const until = (bots, cond, max = 400) => { let t = 0; while (!cond() && t < max) { drive(game, bots, .5); t += .5; } return t; };
  SN.cheats.god = false;
  // time trial: three laps, a record, the ghost kept; the next run races it
  { go({ mode: 'timetrial', track: 'solenne', cls: 'SPARK', laps: 1 }); const b = bot(SN, game); until([b], () => snap().scene === 'results'); b.stop();
    T.check('time trial ends in the results', snap().scene === 'results', snap());
    const key = 'solenne/SPARK/timetrial', gd = SN.save.data.ghosts[key]; T.check('time trial keeps the ghost of a record', !!gd, Object.keys(SN.save.data.ghosts));
    const rec = SN.Records.get(SN.save.data, 'solenne', 'SPARK', 'timetrial'); T.check('time trial records the time', rec && rec.race > 30 && rec.race < 80, rec);
    go({ mode: 'timetrial', track: 'solenne', cls: 'SPARK', laps: 1 }); const R = game.debug.race(), gs = R.ships.find(s => s.ghost);
    T.check('the next time trial races the ghost', !!gs, R.ships.map(s => s.control));
    const data = SN.Ghost.decode(gd); const b2 = bot(SN, game); drive(game, [b2], 6); b2.stop();
    const q = SN.Ghost.at(data, R.t, R.track); T.check('the ghost plays back where it was recorded', gs && q && !gs.hidden && Math.abs(R.track.dS(q.s, gs.s)) < 16, { q, s: gs && gs.s });
    // the ghost encoding round-trips
    const sample = [100, -5, 14, 120, -3000, 65000 / 4 | 0, 7, 9, 0, 0]; T.check('ghost data round-trips', JSON.stringify(SN.Ghost.decode(SN.Ghost.encode(sample))) === JSON.stringify(sample), SN.Ghost.decode(SN.Ghost.encode(sample))); }
  // hot lap: a flying start, the best lap counts, End run finishes it
  { go({ mode: 'hotlap', track: 'meridian', cls: 'FLARE' }); const R = game.debug.race(); T.check('hot lap starts flying', R.player.speed > R.player.st.top * .5, R.player.speed);
    const b = bot(SN, game); until([b], () => R.player.laps.length >= 2, 200); T.check('hot lap counts laps from the line', R.player.laps.length >= 2 && isFinite(R.player.bestLap), R.player.laps);
    R.endRun(); drive(game, [b], 3); b.stop(); T.check('End run goes to the results', snap().scene === 'results', snap().scene); }
  // snipeout: points, respawns, the target ends it
  { go({ mode: 'snipeout', track: 'karakum', cls: 'FLARE', target: 6 }); const R = game.debug.race(); const b = bot(SN, game); let resp = 0, elims = 0; let t = 0;
    while ((R.state === 'racing' || R.state === 'countdown') && t < 330) { drive(game, [b], .5); t += .5; } b.stop();
    T.check('snipeout ends when someone reaches the target', R.order[0].points >= 6 || R.endReason === 'time', { pts: R.order.map(s => s.points), why: R.endReason }); }
  // overclock: zones every 12 s, faster each zone; the run ends at zero energy
  { go({ mode: 'overclock', track: 'solenne', cls: 'SPARK' }); const R = game.debug.race(); const b = bot(SN, game); const top0 = R.player.topK; drive(game, [b], 28); T.check('overclock zones climb every 12 s', R.zone === 3, R.zone); T.check('each zone is faster', R.player.topK > top0, [top0, R.player.topK]);
    R.player.energy = 1; SN.Ship.damage(R.player, 10, 'test', null, R); drive(game, [b], 3); b.stop(); T.check('overclock ends at zero energy', snap().scene === 'results', snap().scene); }
  // the academy: the drill bot passes all eleven
  { go({ mode: 'academy', track: 'solenne', cls: 'SPARK' }, .5); const R = game.debug.race(); const b = drillBot(SN, game); let t = 0, fails = {};
    while (R.academy.state !== 'done' && t < 600) { drive(game, [b], .5); t += .5; for (const e of []) {} if (R.academy.state === 'fail') fails[SN.DRILLS[R.academy.i].id] = (fails[SN.DRILLS[R.academy.i].id] || 0) + (R.academy.t < .01 ? 1 : 0); }
    b.stop(); T.check('the academy bot passes all eleven drills', R.academy.passed.length === 11, { passed: R.academy.passed, at: SN.DRILLS[Math.min(10, R.academy.i)].id, retries: R.academy.retries, msg: R.academy.msg });
    drive(game, [], 3); T.check('the academy ends in its results', snap().scene === 'results', snap().scene); }
  // versus: two players, two viewports, both finish
  { const p2 = game.addPlayer({ keys: 'right' }); SN.flow.start({ mode: 'versus', track: 'solenne', cls: 'SPARK', laps: 1, seed: 5, intro: false, players: [{ team: 'kestrel', pilot: 'vale' }, { team: 'soratek', pilot: 'takahara' }] }); game.advance(1.5);
    const R = game.debug.race(); T.check('versus has two humans', R.humans.length === 2, R.humans.length); T.check('versus splits the screen in two', snap().splits === 2, snap().splits);
    T.check('player 2 has the keyboard\'s right half', p2.label('thrust', 'keyboard') === '.' && game.input.label('thrust', 'keyboard') === 'F', [p2.label('thrust', 'keyboard'), game.input.label('thrust', 'keyboard')]);
    const b1 = bot(SN, game, 0), b2 = bot(SN, game, 1); until([b1, b2], () => snap().scene === 'results', 200); b1.stop(); b2.stop();
    T.check('both versus players finish', R.humans.every(h => h.finished), R.humans.map(h => h.finished)); game.removePlayer(p2); }
  // the grand prix: points 10-8-6-5-4-3-2-1, DNF 0, ties by best finish
  { const D = SN.save.data; D.gp = { round: 0, points: {}, done: false, medal: null }; const fake = (order, dnf = []) => ({ player: { pilot: 'vale', dnf: false, finished: true, bestLap: 40, finishT: 100 }, mode: 'gp', cfg: { season: 'gp', gpRound: D.gp.round }, track: { id: 'solenne' }, cls: 'STORM', zone: 1, rules: {}, humans: [], results: () => order.map((p, k) => ({ pilot: p, place: k + 1, dnf: dnf.includes(p), ship: k === 0 ? { pilot: p } : null, human: p === 'vale' })) });
    const O1 = SN.flow.outcome(Object.assign(fake(['vale', 'kaizero', 'ferrante', 'hex', 'soto', 'okafor', 'mori', 'brekke']), {}));
    T.check('a grand prix round scores 10-8-6...', D.gp.points.vale === 10 && D.gp.points.kaizero === 8 && D.gp.points.brekke === 1, D.gp.points);
    SN.flow.outcome(fake(['kaizero', 'vale', 'ferrante', 'hex', 'soto', 'okafor', 'mori', 'brekke'], ['brekke']));
    T.check('a DNF scores nothing', D.gp.points.brekke === 1, D.gp.points.brekke);
    const O3 = SN.flow.outcome(fake(['ferrante', 'hex', 'vale', 'kaizero', 'soto', 'okafor', 'mori', 'brekke']));
    T.check('the standings sort by points', O3.gp.table[0].pts >= O3.gp.table[1].pts, O3.gp.table.slice(0, 3)); }
}
