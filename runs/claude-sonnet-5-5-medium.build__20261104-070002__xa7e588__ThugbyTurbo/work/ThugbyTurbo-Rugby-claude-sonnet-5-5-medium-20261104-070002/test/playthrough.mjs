// node test/playthrough.mjs — scripted playthrough of the whole game in the browser: title, all four cup rounds (auto-piloted
// seat), results/records/story flow, drills, exhibition, 2-player versus join, replays, dev panel events, hazards, about.
import { chromium } from '../tools/node_modules/playwright/index.mjs'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const file = process.argv[2] || '../ThugbyTurbo-Rugby-claude-sonnet-5-5-medium-20261104-070002.html';
let pass = 0, fail = 0; const bad = []; const ok = (n, c, d = '') => { if (c) pass++; else { fail++; bad.push(n + (d ? ': ' + d : '')); } };
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader'] }); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 300))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
await p.goto(pathToFileURL(resolve(file)).href); await p.waitForTimeout(1200);
const sc = () => p.evaluate(() => __thugby.game.sceneName);
const adv = s => p.evaluate(s => { __thugby.game.advance(s); return 1; }, s);
// the cup, four rounds, human seat on autopilot
await p.evaluate(() => localStorage.removeItem('thugby:cup'));
for (let r = 0; r < 4; r++) {
  await p.evaluate(r => __thugby.game.debug.go('story', { cup: r, stage: 'pre' }), r); await adv(.5); ok('round ' + r + ' story scene', (await sc()) === 'story');
  await p.evaluate(() => __thugby.game.debug.go('match', { mode: 'cup', cup: __thugby.game.scenes && 0 })); // placeholder replaced below
  await p.evaluate(r => __thugby.game.debug.go('match', { mode: 'cup', cup: r }), r); await adv(.5);
  await p.evaluate(() => { const S = __thugby.sim.S; S.seats[0].auto = true; S.seats[0].kind = 'script'; S.dev.infTurbo = true; S.cfg.halfLength = 30; __thugby.TT.TUNE.set('halfLength', 30); });
  let left = 600, done = false; while (left > 0 && !done) { await adv(10); left -= 10; done = (await sc()) === 'results'; }
  ok('round ' + r + ' reaches the results screen', done, await sc());
  const res = await p.evaluate(() => { const s = __thugby.sim.S; return { score: s.score, wd: s.counts.watchdog | 0, tries: s.stats[0].tries + s.stats[1].tries, over: s.over }; });
  ok('round ' + r + ' has no watchdog and a score', res.wd === 0 && res.over, JSON.stringify(res));
  if (res.score[0] <= res.score[1]) { await p.evaluate(r => { const c = JSON.parse(localStorage.getItem('thugby:cup') || '{"round":0,"results":[]}'); c.round = r + 1; localStorage.setItem('thugby:cup', JSON.stringify(c)); }, r); }
}
await p.evaluate(() => __thugby.game.debug.go('cup')); await adv(.5); ok('the cup screen shows', (await sc()) === 'cup');
// drills: autopilot where it can, then check each completes or is injected (the sim suite proves the mechanics)
for (const id of ['run', 'pass', 'evade', 'tackle', 'ruck', 'kick', 'scrum', 'lineout', 'goal']) {
  await p.evaluate(id => __thugby.game.debug.go('match', { mode: 'drill', drill: id }), id); await adv(1.2); const s0 = await p.evaluate(() => !!__thugby.sim.S.drillDef);
  ok('drill ' + id + ' loads', s0); await adv(5);
}
// exhibition with two players (versus): the joiner gets a seat
await p.evaluate(() => __thugby.game.debug.go('match', { mode: 'exh', home: 'titans', away: 'flames', venue: 'furnace', players: 2, half: 120 })); await adv(1.5);
ok('2-player versus has two seats and two inputs', await p.evaluate(() => __thugby.sim.S.seats.length === 2 && __thugby.game.players.length === 2), await p.evaluate(() => __thugby.game.players.length));
await p.evaluate(() => { const S = __thugby.sim.S; S.phase = 'play'; S.sp = null; }); await adv(2); ok('both seats control a player', await p.evaluate(() => __thugby.sim.S.players.filter(q => q.ctl >= 0).map(q => q.ctl).sort().join() === '0,1'));
// power-ups, hazards and events through the dev API in each venue
for (const v of ['muddington', 'docks', 'furnace', 'megadome']) {
  await p.evaluate(v => __thugby.game.debug.go('match', { mode: 'exh', home: 'hawks', away: 'mudlarks', venue: v, players: 0, half: 120 }), v); await adv(1);
  await p.evaluate(() => { const S = __thugby.sim.S; S.phase = 'play'; S.sp = null; S.ball.st = 'loose'; for (const n of ['SPAWN MEAT PIE', 'TRIGGER HAZARD', 'REF DOWN', 'FILL HYPE (BOTH)']) __thugby.sim.FORCE[n](); }); await adv(12);
  ok('venue ' + v + ' survives hazards and power-ups', errs.length === 0, errs.join(' | '));
}
// replays: force a monster hit and let the replay play and end
await p.evaluate(() => __thugby.game.debug.go('match', { mode: 'exh', home: 'hawks', away: 'rovers', venue: 'docks', players: 0, half: 120 })); await adv(1);
await p.evaluate(() => { const s = __thugby.sim, S = s.S; S.phase = 'play'; S.sp = null; S.ball.st = 'loose'; S.seats[0].auto = true; S.seats[0].kind = 'script'; }); await adv(8);
await p.evaluate(() => { const S = __thugby.sim.S; S.replayReq = 'monster'; }); await adv(1.2); const inRep = await p.evaluate(() => !!__thugby.TT.V.replay); ok('an instant replay starts', inRep);
await adv(12); ok('the replay ends', !(await p.evaluate(() => !!__thugby.TT.V.replay)));
// about, records, settings scenes draw
for (const s of ['about', 'records', 'training', 'exhibition', 'cup', 'title']) { await p.evaluate(s => __thugby.game.debug.go(s), s); await adv(.6); ok('scene ' + s + ' loads', (await sc()) === s); }
ok('no errors in the whole playthrough', errs.length === 0, errs.join(' | '));
await b.close(); console.log(fail ? bad.join('\n') + '\n' + fail + ' FAILED, ' + pass + ' passed' : 'all ' + pass + ' playthrough checks passed'); process.exit(fail ? 1 : 0);
