// Love in Bloom: for each of the 14 request types the pipeline rates Perfect for petals, an honest bot run rates
// something for the object types, a deliberate failure rates Miss; loved types x1.2; fork preference; penalties; grade
import { raceIn, run } from '../lib/boot.mjs';
const STAGE_FOR = { pass: 'S1', drift: 'S3', ribbons: 'S9', balloons: 'S1', gnomes: 'S9', bees: 'S2', cones: 'S3', arches: 'S5', speed: 'S4', clean: 'S7', draft: 'S4', close: 'S3', bouquets: 'S5', photo: 'S8' };
const go = (type, mode, passenger = 'vivi') => {
  const stage = STAGE_FOR[type]; const B = raceIn({ route: { stages: [stage], sprint: true }, players: [{ car: 'orchidea', passenger, bot: mode !== 'fail' ? { targets: true } : null }] }, {});
  const { race, OB } = B;
  if (!race.req) race.rules.push(new OB.Requests.Director(race, { passenger }));
  const d = race.p1; race.place(d, stage, 160 * 200, 0); d.car.v = 230;
  if (mode === 'perfect') OB.cheats.perfectRequests = true;
  if (mode === 'fail') { d.input = null; const lane = type === 'cones' || type === 'arches' ? null : -.66; d.brain = { intent: () => ({ steer: lane === null ? 0 : (lane - d.car.x) * 2, gas: type === 'speed' ? .3 : 1, brake: 0 }) }; d.car.x = type === 'cones' ? 0 : type === 'arches' ? .95 : -.66; if (['pass', 'close', 'draft'].includes(type)) OB.cheats.noTraffic = true; if (type !== 'clean') OB.cheats.noCollide = true; }
  race.req.start({ key: 't', stage, z: d.car.z + 2600, type });
  if (mode === 'fail' && type === 'cones') { const cx = race.req.cur.objs[0].x; d.car.x = cx; d.brain = { intent: () => ({ steer: (cx - d.car.x) * 3, gas: 1, brake: 0 }) }; }
  let end = null; OB.bus.on('req:end', e => { end = e; });
  if (mode === 'fail' && (type === 'clean' || type === 'bees')) { run(race, 2.5); d.car.spin('test', (n, x) => OB.bus.emit(n, Object.assign({ car: d.id }, x))); if (type === 'bees') { race.req.cur.hits = 5; } }
  run(race, 40, () => end);
  return { end, race, OB, d };
};
export default async function (t) {
  for (const type of Object.keys(STAGE_FOR)) {
    const p = go(type, 'perfect'); t(type + ': the pipeline rates Perfect', p.end && p.end.rating === 'Perfect' && p.end.petals >= 5, JSON.stringify(p.end));
    const f = go(type, 'fail'); t(type + ': a deliberate failure rates Miss or Good', f.end && (f.end.rating === 'Miss' || (f.end.rating === 'Good' && ['clean'].includes(type))), JSON.stringify(f.end));
    if (['balloons', 'gnomes', 'bouquets', 'arches', 'cones', 'speed', 'photo'].includes(type)) { const b = go(type, 'bot'); t(type + ': the bot earns a rating', b.end && b.end.rating !== 'Miss', JSON.stringify(b.end)); }
  }
  // loved types earn x1.2 (Marisol loves balloons)
  { const m = go('balloons', 'perfect', 'marisol'); t('a loved request earns x1.2', m.end.petals === 6, m.end.petals); }
  // fork preference and penalties
  { const { race, OB } = raceIn({ players: [{ car: 'orchidea', passenger: 'marisol', bot: { route: 'L' } }] }); const dir = new OB.Requests.Director(race, { passenger: 'marisol' }); race.rules.push(dir); const d = race.p1;
    race.place(d, 'S1', d.road.junctionAt - 610 * 200, -.5); d.car.v = 260; dir.done.add('S1:0'); dir.done.add('S1:1');
    run(race, 60, () => d.stage !== 'S1');
    const pref = race.forkPref; t('the passenger states a fork preference', dir.prefStated.S1);
    t('taking or refusing it moves petals', dir.history.length === 0 && (dir.petals === 2 || dir.petals === 0), dir.petals);
    const p0 = dir.petals; OB.bus.emit('car:crash', { car: d.id }); t('a spin-out costs 2 petals', dir.petals === Math.max(0, p0 - 2), dir.petals); }
  // the grade maths
  { const { race, OB } = raceIn({ players: [{ car: 'orchidea', passenger: 'juni' }] }); const dir = new OB.Requests.Director(race, { passenger: 'juni' });
    dir.max = 100; dir.petals = 92; const g1 = dir.grade(); dir.petals = 70; const g2 = dir.grade(); dir.petals = 30; const g3 = dir.grade();
    t('grades: AAA at 92%, A at 70%, D at 30%', g1 === 'AAA' && g2 === 'A' && g3 === 'D', [g1, g2, g3].join());
    t('moods follow the grade', OB.moodOfGrade('AA') === 'bloom' && OB.moodOfGrade('C') === 'bud' && OB.moodOfGrade('E') === 'wilt'); }
}
