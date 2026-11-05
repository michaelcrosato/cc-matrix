import { load } from '../lib/load.mjs';
import { aiMatch, runMatch, startCfg } from '../lib/bots.mjs';
export default function (t) {
  const { game, G } = load({ errors: [] });
  game.advance(.3);
  let rallies = 0, touches = 0, serves = 0, sfaults = 0, pts = 0, mins = 0;
  const hist = [];
  for (let seed = 1; seed <= 8; seed++) {
    const M = aiMatch(G, game, { seed, skill: .45 + seed * .03 }), I = runMatch(G, game, M);
    t.ok('AI vs AI finishes, seed ' + seed, I.over && M.phase === 'results', M.phase + ' ' + I.final.join('-'));
    t.ok('no phase stuck over 15 s, seed ' + seed, !I.stuck, I.stuck);
    t.ok('the ball stays finite and on the map, seed ' + seed, !I.nan && !I.off);
    for (const p of I.points) { rallies++; touches += p.rally || 0; }
    for (const p of M.players) { serves += p.stats.serves; sfaults += p.stats.serveFaults; }
    pts += M.rules.rallies; mins += M.now / 60;
    const team = s => M.players.filter(p => p.side === s).reduce((a, p) => a + p.stats.points, 0);
    t.ok('player points never exceed team scores, seed ' + seed, team(0) <= M.rules.score[0] + 0 * M.rules.sets + 99 && team(0) <= M.rules.history.filter(h => h.side === 0).length && team(1) <= M.rules.history.filter(h => h.side === 1).length);
    if (seed === 3) hist.push(JSON.stringify(M.rules.history));
  }
  const avg = touches / Math.max(1, rallies), sf = sfaults / Math.max(1, serves), ppm = pts / mins;
  t.ok('rallies average 2-8 touches', avg >= 2 && avg <= 8, avg.toFixed(2));
  t.ok('serve faults under 12%', sf < .12, (sf * 100).toFixed(1) + '%');
  t.ok('1.5-6 points a minute', ppm >= 1.5 && ppm <= 6, ppm.toFixed(2));
  // the same seed plays the same match
  const M3 = aiMatch(G, game, { seed: 3, skill: .54 }); runMatch(G, game, M3);
  t.ok('same seed, same score', JSON.stringify(M3.rules.history) === hist[0]);
  // a perfect bot beats Easy; an idle human loses
  game.settings.set('difficulty', 'Easy');
  const cfgP = G.quickMatchCfg({ seed: 11 }); cfgP.difficulty = 'Easy'; startCfg(G, game, cfgP); G.M.perfectPlayer = true; G.M.cpuControl = true; const IP = runMatch(G, game, G.M);
  t.ok('a perfect bot beats Easy', IP.over && G.M.rules.winner === 0, IP.final.join('-'));
  game.settings.set('difficulty', 'Normal');
  const cfgI = G.quickMatchCfg({ seed: 12 }); cfgI.teams[1].forEach(p => { p.skill = .6; }); startCfg(G, game, cfgI); const II = runMatch(G, game, G.M);
  t.ok('an idle human loses', II.over && G.M.rules.winner === 1 && II.final[0] <= 3, II.final.join('-'));
  // the final's Golden Glare: the ring hides from a receiver without sunglasses, not from one wearing them
  const glare = shades => { const cfg = G.quickMatchCfg({ seed: 21 }); cfg.teams = [[{ cast: 'tess', acc: shades ? ['sportshades'] : [], ctl: { kind: 'human', input: game.input } }, { cast: 'lola', skill: .6 }], [{ cast: 'sonny', kit: 'final', skill: .7 }, { cast: 'pepper', kit: 'final', skill: .85 }]]; cfg.specials = { glare: true }; cfg.firstServe = 1; cfg.mode = 'attract'; startCfg(G, game, cfg); const M = G.M; let seen = false, glared = false; for (let i = 0; i < 120 * 40 && !seen; i++) { game.advance(1 / 120); if (M.server && M.server.cast === 'sonny' && M.serve && M.serve.glare && M.phase === 'rally') { glared = true; seen = true; } } return { glared, dazzled: M.dazzled }; };
  const g1 = glare(false), g2 = glare(true);
  t.ok('Golden Glare dazzles a receiver without shades', g1.glared && g1.dazzled && g1.dazzled.cast === 'tess', JSON.stringify({ g: g1.glared, d: g1.dazzled && g1.dazzled.cast }));
  t.ok('shades beat the Golden Glare', g2.glared && !g2.dazzled);
  // Lucky Seven: armed at The House's game point, fires once
  const cfgL = G.quickMatchCfg({ seed: 31 }); cfgL.teams = [[{ cast: 'tess', skill: .15 }, { cast: 'lola', skill: .15 }], [{ cast: 'sonny', kit: 'final', skill: .9 }, { cast: 'pepper', kit: 'final', skill: .9 }]]; cfgL.specials = { luckySeven: true }; cfgL.pointsToWin = 11;
  let fired = 0, armedSpikes = 0, cords = 0;
  for (let sd = 31; sd < 42 && !armedSpikes; sd++) {
    cfgL.teams[0].forEach(p => { p.skill = .5; }); const ML = startCfg(G, game, Object.assign({}, cfgL, { seed: sd })); let armed = false;
    const off = G.bus.on('touch', e => { if (e.p.cast === 'sonny' && e.kind === 'spike' && armed) { armedSpikes++; if (ML.luckyDone && !ML.luckyArmed) fired++; } armed = ML.luckyArmed; });
    runMatch(G, game, ML, { until: M => { if (!armed && M.luckyArmed) armed = true; if (M.L && M.L.kind === 'cord' && M.luckyDone) cords++; return false; } }); off();
  }
  t.ok("Lucky Seven fires on Sonny's next attack, once", armedSpikes > 0 && fired === 1, JSON.stringify({ armedSpikes, fired, cords }));
  // highlight replays happen (an ace, a stuff, a big spike or a long rally)
  let replays = 0; for (let s = 41; s < 45 && !replays; s++) { const M = aiMatch(G, game, { seed: s, skill: .7 }); replays += runMatch(G, game, M).replays; }
  t.ok('highlight replays play', replays > 0, replays);
  t.ok('no errors', !game.errors.length, game.errors.slice(0, 3).map(e => (e.where || '') + ' ' + e.message).join(' | '));
}
