// road and junction: stages build, flat starts and junctions, scenery seeded, decision side, the seamless switch
import { boot, raceIn, run } from '../lib/boot.mjs';
export default async function (t) {
  const { OB } = boot(), SEG = OB.SEG;
  for (const id of Object.keys(OB.STAGES)) {
    const r = OB.World.stage(id), S = OB.STAGES[id];
    t(id + ' builds with its end', r.segs.length === S.length + (S.row < 5 ? 80 : 60), r.segs.length);
    t(id + ' first 150 flat', r.segs.slice(0, 150).every(s => Math.abs(s.y1 - s.y0) < 1e-6 && s.curve === 0));
    if (S.row < 5) { const j = r.segs.slice(S.length); t(id + ' junction flat and spreading', j.every(s => s.y0 === j[0].y0 && s.curve === 0) && j[j.length - 1].s1 > 2.3); }
    else t(id + ' goal arch', r.goalZ > S.length * SEG);
  }
  const w2 = new (OB.World.constructor)(); const a = JSON.stringify(OB.World.stage('S5').segs.map(s => s.things.map(x => x.kind + x.offset.toFixed(3)))), b = JSON.stringify(w2.build('S5', false).segs.map(s => s.things.map(x => x.kind + x.offset.toFixed(3))));
  t('scenery placed the same twice', a === b);
  const info = OB.World.info(OB.World.stage('S3'), 400 * SEG, 1.1);
  t('info reports edges (cliff and rail on Lemon Cliffs)', info.edge && ['cliff', 'rail', 'wall'].includes(info.edge.kind), JSON.stringify(info.edge));
  t('info reports grounds', OB.World.info(OB.World.stage('S1'), 300 * SEG, -1.5).ground === 'water');
  // the fork: the side the car is on picks the branch; the switch is seamless
  for (const side of [-1, 1]) {
    const { race, OB: O } = raceIn({ players: [{ car: 'orchidea', bot: { route: side < 0 ? 'L' : 'R' } }] }); const d = race.p1, road = d.road;
    race.place(d, 'S1', road.junctionAt - 40 * SEG, side * .4); d.car.v = 250;
    let ev = null; const off = O.bus.on('fork:choose', e => { ev = e; });
    let before = null;
    run(race, 20, () => { if (!before && d.car.z > road.length - 300 && d.stage === 'S1') { const cam = O.cameraOf(d, { w: 480, h: 270 }); before = { rel: cam.x - d.absX(), z: d.car.z }; } return d.stage !== 'S1'; });
    off();
    t('fork ' + (side < 0 ? 'left' : 'right') + ': the side chosen', ev && ev.side === side && d.stage === O.FORKS.S1[side < 0 ? 0 : 1], JSON.stringify(ev) + ' ' + d.stage);
    const cam2 = O.cameraOf(d, { w: 480, h: 270 }), relAfter = cam2.x - d.absX();
    t('fork ' + (side < 0 ? 'left' : 'right') + ': the switch is seamless (camera against car)', before && Math.abs(relAfter - before.rel) < .02, before && (before.rel.toFixed(3) + ' vs ' + relAfter.toFixed(3)));
    t('fork: z continues from 0', d.car.z < 600);
  }
  // a closed fork on a fixed route blocks that side
  { const { race } = raceIn({ route: { stages: ['S1', 'S3'], sprint: true }, players: [{ car: 'orchidea', bot: { route: 'L' } }] }); const d = race.p1; race.place(d, 'S1', d.road.junctionAt - 30 * SEG, -.6); d.car.v = 240;
    run(race, 20, () => d.stage !== 'S1'); t('a fixed route forces the open branch', d.stage === 'S3', d.stage); }
  // the gore cushions push toward the nearer branch
  { const { race, OB: O2 } = raceIn({ players: [{ car: 'orchidea' }] }); const d = race.p1, road = d.road; race.place(d, 'S1', road.junctionAt + 36 * SEG, .02); d.car.v = 100; d.input = null;
    let bump = false; const off = O2.bus.on('car:bump', e => { if (e.with === 'cushion') bump = true; }); run(race, 1.2); off();
    t('gore cushions bump the car aside', bump || Math.abs(d.absX()) > .3, d.absX()); }
}
