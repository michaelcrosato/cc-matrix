// the whole game: the reference bot drives all 16 routes to all 5 goals on Normal (every stage entered, every
// checkpoint once), within the balance windows (the all-left route with 15-30 s spare, the all-right with 2-12 s);
// a sloppy bot (a spin a stage) fails some routes; Love in Bloom reaches Bloom, Bud and Wilt by scripted quality
import { boot } from '../lib/boot.mjs';
export default async function (t) {
  const { OB: O } = boot(), goals = new Set(), spare = {};
  for (const route of O.ALL_ROUTES) {
    const { OB, game } = boot(); const race = OB.Race.create({ mode: 'arcade', seed: 11, players: [{ car: 'orchidea', bot: { route } }] });
    const cps = []; OB.bus.on('checkpoint', e => cps.push(e.id));
    for (let n = 0; n < 120 * 520 && race.phase !== 'done'; n++) race.step(1 / 120);
    const p = race.p1, ok = p.finished && p.routeStr === route;
    if (ok) { goals.add(p.goal); spare[route] = Math.round(race.result.clock); }
    t('route ' + route + ' reaches its goal', ok, (p.finished ? 'finished ' : 'out of time at ' + p.stage) + ' ' + p.routeStr + ' times ' + p.stageTimes.join('/'));
    t('route ' + route + ': every checkpoint once', cps.length === 4 && new Set(cps).size === 4, cps.join());
    t('route ' + route + ': no errors', game.errors.length === 0, game.errors.map(e => e.message).join('|'));
  }
  t('all five goals reached', goals.size === 5, [...goals].join());
  t('balance: the all-left route spares 15-30 s', spare.LLLL >= 15 && spare.LLLL <= 30, spare.LLLL);
  t('balance: the all-right route spares 2-12 s', spare.RRRR >= 2 && spare.RRRR <= 12, spare.RRRR);
  // a sloppy driver: a spin-out on every stage costs enough to fail some routes
  let fails = 0;
  for (const route of ['LLLL', 'RRRR', 'LRLR', 'RLRL', 'RRLL', 'LLRR']) {
    const { OB } = boot(); const race = OB.Race.create({ mode: 'arcade', seed: 11, players: [{ car: 'orchidea', bot: { route } }] }); let spunOn = new Set();
    for (let n = 0; n < 120 * 520 && race.phase !== 'done'; n++) { race.step(1 / 120); const d = race.p1; if (!spunOn.has(d.stage) && d.car.z > 300 * 200 && d.car.v > 200) { spunOn.add(d.stage); d.car.spin('test', () => {}); d.car.spin; for (let k = 0; k < 2; k++) { d.car.crash = null; d.car.invuln = 0; d.car.spin('test', () => {}); } } }
    if (!race.p1.finished) fails++;
  }
  t('a sloppy bot fails some routes', fails >= 2, fails + ' of 6');
  // Love in Bloom: three passengers, three moods by scripted quality
  const moods = {};
  for (const [pass, quality] of [['marisol', 'perfect'], ['vivi', 'honest'], ['juni', 'none']]) {
    const { OB } = boot(); OB.cheats.infiniteTime = true; if (quality === 'perfect') { OB.cheats.perfectRequests = true; OB.cheats.noCollide = true; }
    const race = OB.Race.create({ mode: 'love', seed: 11, passenger: pass, rules: [OB.Requests.director({ passenger: pass })], players: [{ car: 'orchidea', passenger: pass, bot: { route: quality === 'perfect' ? null : 'LRLR', targets: quality !== 'none' } }] });
    if (quality === 'none') race.req.start = function () { this.done.add(arguments[0].key); this.max += 5; };
    for (let n = 0; n < 120 * 560 && race.phase !== 'done'; n++) race.step(1 / 120);
    const R = race.result; moods[quality] = R && R.mood;
    t('Love in Bloom with ' + pass + ' (' + quality + ') reaches a goal with a grade', R && R.players[0].goal && R.grade, R && JSON.stringify({ g: R.grade, p: R.petals, m: R.maxPetals }));
    if (R && R.players[0].goal) { const E = OB.ENDINGS[R.players[0].goal][R.mood]; t('its ending has every line', E && E[pass] && E.caption); }
  }
  t('three moods by quality: Bloom, then Wilt', moods.perfect === 'bloom' && moods.none === 'wilt', JSON.stringify(moods));
}
