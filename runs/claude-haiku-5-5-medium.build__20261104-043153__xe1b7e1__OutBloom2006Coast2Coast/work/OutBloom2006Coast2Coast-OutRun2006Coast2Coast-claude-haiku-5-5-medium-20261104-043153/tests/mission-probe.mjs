import { boot } from './boot.mjs';
const B = boot({ quiet: false }); const OB = B.OB;
const ids = process.argv.slice(2).length ? process.argv.slice(2) : OB.MISSIONS.map(m => m.id);
for (const id of ids) {
  const m = OB.MISSIONS.find(x => x.id === id);
  try {
    const r = new OB.Race({ mode: 'arcade', car: 'orchidea', seed: 5, route: m.route, passenger: 'marisol', cheats: { infiniteTime: true }, mission: id,
      bot: new OB.Brain({ forks: [], skill: 1, drift: true }) });
    const t = Date.now();
    for (let i = 0; i < 120 * 900 && r.status !== 'goal' && r.status !== 'over' && r.status !== 'finish'; i++) r.step(1/120, null);
    const res = r.result();
    console.log(id, m.rule, r.status, 'elapsed', res.time, 'mission', JSON.stringify(res.mission), 'contacts', res.contacts, Date.now()-t, 'ms');
  } catch (e) { console.log(id, 'THREW', e.stack.split('\n').slice(0,3).join(' / ')); }
}
process.exit(0);
