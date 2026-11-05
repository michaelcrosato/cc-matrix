// Runs the autopilot headless over each stage and prints arrivals against the timetable, judgments and rank.
// node tools/calibrate.mjs [par] [stage ...]   (par = min-time mode, for setting timetables 6-12 s after par)
import { load } from '../test/lib.mjs';
const args = process.argv.slice(2), par = args.includes('par'), ids = args.filter(a => a !== 'par' && a !== 'fit');
const { DH } = load({ warn: true });
if (!args.includes('fit')) for (const id of ids.length ? ids : ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'PR']) {
  const run = new DH.Run(id, { difficulty: 'Normal' }), ap = new DH.Autopilot(run, { mode: par ? 'par' : 'timetable' });
  const log = [];
  for (let i = 0; i < 900 * 120 && !run.done && run.phase !== 'over'; i++) {
    run.step(1 / 120, ap.step(1 / 120));
    for (const e of run.out) {
      if (e.k === 'judge') log.push(`${e.station || ''} ${e.label} ${e.err !== undefined ? e.err.toFixed(2) : ''} ${(e.items || []).map(x => x[0]).join(' ')} @${DH.clock(run.clock)}`);
      if (e.k === 'banner' || (e.k === 'toast' && /LIMIT|ATS|NO HORN|EMERG/.test(e.text))) log.push('  ' + (e.text) + ' @' + DH.clock(run.clock) + ' s=' + run.s.toFixed(0));
      if (e.k === 'gameOver') log.push('GAME OVER');
    }
    run.out.length = 0;
  }
  console.log(`${id}: ${run.done ? 'done' : run.phase} rank ${run.rank()} score ${run.finalScore()}/${Math.round(run.maxScore)} grace ${run.grace} comfort ${run.comfort.toFixed(0)} calls ${run.stats.great}/${run.stats.calls} missed ${run.stats.missed} t=${run.t.toFixed(0)}s events ${run.fired.join(',')}`);
  for (const l of log) console.log('   ' + l);
}
// fit: set each timetable so par (min-time) arrives 9 s early; dwell 25 s
if (args.includes('fit')) {
  for (const id of ids.length ? ids : ['S1', 'S2', 'S3', 'S4', 'S5', 'PR']) {
    const sg = DH.STAGES[id];
    for (let it = 0; it < 3; it++) {
      const run = new DH.Run(id, { difficulty: 'Normal' }), ap = new DH.Autopilot(run, { mode: 'par' }), arr = {};
      run.o.cheat = true;
      for (let i = 0; i < 900 * 120 && !run.done; i++) { run.step(1 / 120, ap.step(1 / 120)); for (const e of run.out) if (e.k === 'judge' && e.station) arr[e.station] = run.clock; run.out.length = 0; }
      sg.stops.forEach((q, i) => { if (i === 0) return; q.arr = Math.ceil(arr[q.id] + 9); if (i < sg.stops.length - 1) q.dep = q.arr + 25; });
    }
    console.log(id, JSON.stringify(sg.stops.map(q => [q.id, q.arr ? DH.clock(q.arr) : null, q.dep ? DH.clock(q.dep) : null])));
  }
}
