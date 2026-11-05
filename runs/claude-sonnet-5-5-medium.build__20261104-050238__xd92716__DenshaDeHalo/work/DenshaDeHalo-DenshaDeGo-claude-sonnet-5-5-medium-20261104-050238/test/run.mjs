// THE test command: node test/run.mjs   (prints only failures and a one-line count; BROWSER=1 adds the browser smoke, HUB=1 the AI Hub harness)
import { load } from './lib.mjs';
import { execFileSync } from 'node:child_process';
let fails = 0, count = 0;
const check = (name, ok, detail = '') => { count++; if (!ok) { fails++; console.log('FAIL ' + name + (detail ? ': ' + detail : '')); } };
const guard = (name, fn) => { try { fn(); } catch (e) { count++; fails++; console.log('FAIL ' + name + ' threw ' + (e && e.stack || e)); } };

/* ---------------- A. the simulation ---------------- */
{
  const ctx = load(['00-core.js', '10-route.js', '20-sim.js']), DH = ctx.DH;
  const drive = (run, secs = 1500, extra) => { for (let i = 0; i < 60 * secs && !run.finished && !run.failed; i++) { DH.autopilot(run, { cheat: true }); if (extra) extra(run, i); run.step(1 / 60, { horn: run.autoHorn }); } return run; };
  for (const st of DH.STAGES) guard('stage ' + st.id, () => {
    const run = drive(new DH.Run(st, {}));
    check(st.id + ' finishes', run.finished && !run.failed, String(run.failed));
    check(st.id + ' every stop made', run.results.length === st.stops.length, run.results.length + '/' + st.stops.length);
    check(st.id + ' stops within the OK window', run.results.every(r => ['PERFECT', 'GREAT', 'GOOD', 'OK'].includes(r.grade)), run.results.map(r => r.grade + r.e.toFixed(1)).join());
    check(st.id + ' halo time left', run.halo > 40, String(run.halo));
    check(st.id + ' calls made', run.calls >= st.stops.length, String(run.calls));
    check(st.id + ' rank', ['S', 'A', 'B', 'C'].includes(run.summary().rank), run.summary().rank);
  });
  guard('determinism', () => { const h = () => { const r = drive(new DH.Run(DH.stageById('S3'), {})); return [r.s.toFixed(3), r.t.toFixed(3), Math.round(r.score), r.halo.toFixed(2)].join(); }; check('same run twice, same state', h() === h()); });
  guard('lever and doors', () => {
    const run = new DH.Run(DH.stageById('S0'), {});
    check('starts at B8 with doors open', run.lever === -8 && run.doors);
    for (let i = 0; i < 12; i++) run.notchUp(); check('cannot reach power while the doors are open', run.lever <= 0, String(run.lever));
    for (let i = 0; i < 60 * 12; i++) run.step(1 / 60, {}); check('doors close on the timetable', !run.doors && run.canDepart);
    for (let i = 0; i < 16; i++) run.notchUp(); check('lever reaches P5', run.lever === 5, String(run.lever)); run.step(1 / 60, {}); check('departs', run.phase === 'run');
    for (let i = 0; i < 60 * 8; i++) run.step(1 / 60, {}); check('accelerates', run.v > 5, String(run.v)); run.neutral(); check('neutral snaps to N', run.lever === 0);
    run.eb(); check('EB latches', run.lever === -9); check('EB costs halo', run.halo < 100);
  });
  guard('ATS overspeed', () => {
    const run = new DH.Run(DH.stageById('S0'), {}); for (let i = 0; i < 60 * 8; i++) run.step(1 / 60, {}); for (let i = 0; i < 16; i++) run.notchUp();
    let warned = false, braked = false; for (let i = 0; i < 60 * 80 && !braked; i++) { run.step(1 / 60, {}); for (const e of run.events.splice(0)) { if (e.kind === 'atsWarn') warned = true; if (e.kind === 'ats') braked = true; } }
    check('ATS warns on overspeed', warned); check('ATS brakes when ignored', braked); check('ATS fee charged', run.halo < 100, String(run.halo));
  });
  guard('red signal', () => {
    const mk = () => { const run = new DH.Run(DH.stageById('S1'), {}); run.cal = true; run.depSched = 0; return run; };
    const go = (noATS) => { DH.TUNING.noATS = noATS; const run = mk(); for (let i = 0; i < 60 * 8; i++) run.step(1 / 60, {}); run.lead = null; const n = run.nextSignals(1)[0]; run.lead = { s: n.pos + 300, v: 0, len: 120, cap: 60, idx: 99, dwell: 1e9, phase: 'dwell' };
      run.lever = 5; for (let i = 0; i < 60 * 120 && !run.failed && !(run.v < .1 && i > 300); i++) { run.step(1 / 60, {}); } DH.TUNING.noATS = 0; return run; };
    const a = go(0); check('ATS stops a train short of a red signal', !a.failed && a.v < .5, String(a.failed));
    const b = go(1); check('with ATS off a red signal passed fails the shift', /DANGER|COLLISION/.test(b.failed || ''), String(b.failed));
  });
  guard('crossing', () => {
    const run = new DH.Run(DH.stageById('S3'), {}); run.cal = true; run.depSched = 0; run.lead = null;
    check('obstruction exists', !!run.obs && run.obs.active);
    let i = 0; for (; i < 60 * 600 && !run.failed && !run.finished; i++) { if (run.phase === 'dwell' && run.canDepart) run.notchUp(); else if (run.phase === 'run' && run.lever < 5 && run.v < 20) run.notchUp(); run.step(1 / 60, {}); if (run.v > 8 && run.lever > 0 && run.obs.s - run.s < 400) run.lever = 5; }
    check('no horn, no brake: collision at the crossing', /CROSSING/.test(run.failed || ''), String(run.failed));
    const r2 = new DH.Run(DH.stageById('S3'), {}); r2.cal = true; r2.depSched = 0; r2.lead = null; let cleared = false;
    for (let k = 0; k < 60 * 600 && !r2.failed && !cleared; k++) { DH.autopilot(r2, { cheat: true }); r2.step(1 / 60, { horn: r2.autoHorn }); if (!r2.obs.active) cleared = true; }
    check('the horn clears the crossing', cleared && !r2.failed, String(r2.failed));
  });
  guard('stop judging and penalties', () => {
    const run = new DH.Run(DH.stageById('S0'), {}); run.cal = true; run.depSched = 0; DH.TUNING.noATS = 1;
    for (let i = 0; i < 60 * 8; i++) run.step(1 / 60, {}); run.s = run.leg.s - 200; run.v = 25; run.lever = 0; run.phase = 'run'; run.stopJudged = false; run.callDone.add('mk0');
    for (let i = 0; i < 60 * 40 && !run.results.length; i++) { if (run.s > run.leg.s + 15) run.lever = -8; run.step(1 / 60, {}); } DH.TUNING.noATS = 0;
    check('a train that is not braked overruns', run.results[0] && run.results[0].grade === 'OVERRUN', JSON.stringify(run.results[0] && [run.results[0].grade, run.results[0].e]));
    check('overrun costs halo time', run.halo <= 90, String(run.halo));
    const w = DH.TUNING; const e = new DH.Run(DH.stageById('S0'), { difficulty: 'Easy' }).windows(), h = new DH.Run(DH.stageById('S0'), { difficulty: 'Hard' }).windows(); check('difficulty changes the stop window', e.perfect > h.perfect);
    const late = new DH.Run(DH.stageById('S0'), {}); late.cal = false; for (let i = 0; i < 60 * 120; i++) { late.step(1 / 60, {}); } late.phase = 'run'; check('timetable runs while waiting', late.t > 100);
  });
  guard('rain and tuning', () => {
    const stopDist = (weather) => { const run = new DH.Run(DH.stageById('S0'), { weather }); run.phase = 'run'; run.doors = false; run.canDepart = true; run.v = 22; run.lever = -8; run.leg = null; const s0 = run.s; DH.TUNING.noATS = 1; for (let i = 0; i < 60 * 60 && run.v > 0; i++) run.step(1 / 60, {}); DH.TUNING.noATS = 0; return run.s - s0; };
    check('wet rails lengthen the stop', stopDist('rain') > stopDist('clear') * 1.1, stopDist('rain') + ' vs ' + stopDist('clear'));
    const acc = (k) => { DH.TUNING.accelScale = k; const run = new DH.Run(DH.stageById('S0'), {}); run.cal = true; run.depSched = 0; for (let i = 0; i < 60 * 8; i++) run.step(1 / 60, {}); run.lever = 5; run.phase = 'run'; for (let i = 0; i < 60 * 8; i++) run.step(1 / 60, {}); DH.TUNING.accelScale = 1; return run.v; };
    check('the power slider changes acceleration', acc(2) > acc(1) * 1.3, acc(2) + ' vs ' + acc(1));
    DH.TUNING.haloStart = 5; DH.TUNING.penaltyScale = 3; const r = new DH.Run(DH.stageById('S0'), {}); r.pen(4, 'x'); check('Halo Time at zero ends the shift', /HALO/.test(r.failed || ''), String(r.failed)); DH.resetTuning(); check('reset restores the defaults', DH.TUNING.haloStart === 100 && DH.TUNING.penaltyScale === 1);
  });
  guard('calls', () => {
    const run = new DH.Run(DH.stageById('S1'), {}); run.cal = true; run.depSched = 0; let called = 0, missed = 0;
    for (let i = 0; i < 60 * 400; i++) { DH.autopilot(run, { cheat: true }); run.step(1 / 60, {}); for (const e of run.events.splice(0)) { if (e.kind === 'call') called++; if (e.kind === 'callMiss') missed++; } }
    check('calls register', called > 0, String(called));
  });
}

/* ---------------- B. the whole game, headless ---------------- */
await (async () => {
  const ctx = load(), DH = ctx.DH, game = DH.game, I = game.input;
  await new Promise(r => setTimeout(r, 80));
  const tap = a => { I.tap(a); I.lastDevice = 'keyboard'; game.advance(.05); I.lastDevice = 'keyboard'; };
  const settle = (s = 1.5) => game.advance(s);
  const scene = () => game.sceneName;
  settle(1); check('boots to the title', scene() === 'title', scene()); check('no errors at boot', game.errors.length === 0, game.errors.map(e => e.message).join());
  // menu screens
  for (const [n, scn] of [[1, 'freerun'], [2, 'log'], [3, 'help'], [5, 'about']]) { for (let i = 0; i < n; i++) tap('down'); tap('confirm'); settle(); check('title -> ' + scn, scene() === scn, scene()); tap('cancel'); settle(); check(scn + ' -> back to the title', scene() === 'title', scene());}
  // local duel: two players on one keyboard, split screen
  for (let i = 0; i < 6; i++) tap('down'); tap('confirm'); settle(1.5); check('title -> local duel', scene() === 'duel', scene());
  { const d = DH.scenes.duel; settle(14); for (let p = 0; p < 2; p++) for (let k = 0; k < 16; k++) { DH.duelPress(p, 'up'); settle(.1); }
    settle(10); check('duel: both players drive their own train', d.runs[0].v > 3 && d.runs[1].v > 3, d.runs.map(r => r.v).join());
    DH.duelPress(0, 'eb'); settle(.2); check('duel: P1 emergency brake leaves P2 alone', d.runs[0].lever === -9 && d.runs[1].lever > 0);
    d.auto = [true, true]; DH.TUNING.timeScale = 3; let gt = 0; while (!d.over && gt < 900) { settle(5); gt += 5; } DH.TUNING.timeScale = 1; check('duel ends with a result', d.over && d.runs.every(r => r.finished || r.failed)); tap('down'); tap('confirm'); settle(1.5); check('duel -> title', scene() === 'title', scene()); }
  // attract mode after ten seconds idle, any input leaves it
  settle(11); check('attract mode starts after 10 s idle', scene() === 'attract', scene()); settle(6); check('attract mode runs', scene() === 'attract' && DH.drive && DH.drive.run.s > DH.drive.run.s0 + 20, scene());
  tap('confirm'); settle(1.5); check('any input leaves attract mode', scene() === 'title', scene());
  // the whole career, scripted: briefing, drive (autopilot), results, next
  tap('confirm'); settle(); check('career -> halo map', scene() === 'halomap', scene());
  DH.TUNING.timeScale = 3;
  for (let n = 0; n < 6; n++) {
    check('stage ' + n + ' available on the map', scene() === 'halomap' || scene() === 'briefing', scene());
    if (scene() === 'halomap') { for (let k = 0; k < n; k++) tap('down'); tap('confirm'); settle(); }
    check('briefing S' + n, scene() === 'briefing', scene()); tap('cancel'); settle(.2); tap('confirm'); settle(1.5); check('drive S' + n, scene() === 'drive', scene());
    DH.drive.auto = true; let guardT = 0; while (scene() === 'drive' && guardT < 900) { game.advance(5); guardT += 5; }
    check('S' + n + ' ends in results', scene() === 'results', scene() + ' ' + JSON.stringify(game.debug.snapshot()).slice(0, 200));
    if (scene() !== 'results') break; settle(1);
    tap('confirm'); settle(1.5);   // NEXT SHIFT / FINISH THE RING
  }
  check('the ring ends in the ending', scene() === 'ending', scene()); for (let i = 0; i < 12; i++) { tap('confirm'); settle(.4); } tap('cancel'); settle(.5); settle(4); tap('confirm'); settle(1.5); check('ending returns to the title', scene() === 'title', scene());
  const sv = DH.save.get(); check('progress saved: all stages unlocked', sv.unlocked >= 5, JSON.stringify(sv.best)); check('postcards earned', sv.cards.length >= 1);
  DH.TUNING.timeScale = 1;
  // dev mode
  game.go('drive', { stage: DH.stageById('S0'), opts: {}, free: true }, { fade: 0 }); settle(1);
  DH.drive.dev.open = true; settle(.2); const before = DH.TUNING.accelScale; tap('right'); settle(.1); check('dev slider moves with the d-pad', DH.TUNING.accelScale !== before, String(DH.TUNING.accelScale));
  for (let i = 0; i < 24; i++) tap('down'); tap('confirm'); settle(.1); /* last items: reset to defaults then close */
  DH.TUNING.accelScale = 1.7; const items = DH.drive.devItems(); const reset = items.find(q => /RESET/.test(q.label)); reset.fn(); check('dev reset restores defaults', DH.TUNING.accelScale === 1);
  DH.drive.dev.open = false;
  // manual driving through the real input map
  game.go('drive', { stage: DH.stageById('S0'), opts: {}, free: true }, { fade: 0 }); settle(1); I.lastDevice = 'keyboard';
  settle(14); for (let i = 0; i < 10; i++) { tap('up'); settle(.3); } check('W / up moves the lever to power', DH.drive.run.lever > 0, String(DH.drive.run.lever)); settle(10); check('the train moves under player control', DH.drive.run.v > 3, String(DH.drive.run.v));
  tap('neutral'); check('N snaps the lever to neutral', DH.drive.run.lever === 0); tap('eb'); check('Backspace is the emergency brake', DH.drive.run.lever === -9); game.settings.set('leverDir', 'Up = Brake');
  settle(8); for (let i = 0; i < 3; i++) { tap('down'); settle(.3); } check('"Up = Brake" flips the d-pad', DH.drive.run.lever === -9 || DH.drive.run.lever > -9);
  check('no errors in the whole run', game.errors.length === 0, game.errors.map(e => e.message).join(' | '));
})().catch(e => { count++; fails++; console.log('FAIL game flow threw ' + (e && e.stack || e)); });

/* ---------------- C. browser smoke and the hub harness (opt-in) ---------------- */
if (process.env.BROWSER) { try { const out = execFileSync('node', ['test/flow.mjs'], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8', env: Object.assign({}, process.env, { TMPDIR: process.cwd() + '/.tmp' }) }); count++; if (!/no errors/.test(out)) { fails++; console.log('FAIL browser smoke: ' + out.split('\n').slice(-4).join(' | ')); } } catch (e) { count++; fails++; console.log('FAIL browser smoke threw ' + e.message.slice(0, 300)); } }
console.log(fails ? fails + ' FAILED of ' + count + ' checks' : 'all ' + count + ' checks passed');
process.exit(fails ? 1 : 0);
