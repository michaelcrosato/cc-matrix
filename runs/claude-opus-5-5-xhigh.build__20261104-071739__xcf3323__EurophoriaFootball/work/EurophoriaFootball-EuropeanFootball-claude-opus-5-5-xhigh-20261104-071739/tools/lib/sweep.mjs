// The draw sweep: one real page visits every scene and moment, letting each render, and fails on any error (headless
// tests skip drawing). Steps are evals run inside the page.
import { chromium } from 'playwright';
const NAME = 'EurophoriaFootball-EuropeanFootball-claude-opus-5-5-xhigh-20261104-071739';
export async function run({ check }) {
  const S = 'sweep', file = new URL('../../../' + NAME + '.html', import.meta.url).pathname;
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }), p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await p.goto('file://' + file); await p.waitForTimeout(1500); await p.mouse.click(10, 10);
  const steps = [];
  const go = (label, js, ms = 1400) => steps.push([label, js, ms]);
  const m = 'EF.go("#match/smokehouse")';
  for (const s of ['title', 'setup', 'cup', 'album', 'about', 'training', 'ending']) go('#' + s, `EF.go("#${s}")`, 1800);
  for (const st of ['smokehouse', 'pasapasa', 'stahlpresse', 'lucchetto', 'euphorium']) go('match ' + st, `EF.go("#match/${st}")`, 2200);
  for (const part of ['corner', 'freekick', 'penalty', 'super', 'duel', 'halftime', 'extratime', 'results', 'shootout']) go('part ' + part, `EF.go("#match/${part}")`, part === 'duel' || part === 'super' ? 5000 : 3000);
  go('a match for triggers', m, 2500);
  const trig = js => `(() => { const mm = EF.cur && EF.cur.m; if (!mm) return; ${js} })()`;
  for (const c of ['kneeslide', 'backflip', 'cartwheel', 'aeroplane', 'robot', 'shirt', 'cornerflag', 'badgekiss', 'helicopter', 'fishslap', 'cheer']) go('celebration ' + c, trig(`EF.Dev.tab = 2; const row = EF.Dev.rows().find(r => r.label === 'CELEBRATION: ' + EF.get('celebration', '${c}').name); row.run();`), 1500);
  go('back to play', m, 2500);
  for (const ev of ['seagull', 'beachball', 'invader-keith', 'invader-stag', 'floodlight', 'flaresmoke', 'drone', 'fireworks']) go('event ' + ev, trig(`mm.setpiece = null; mm.setMode('play'); if ('${ev}' === 'fireworks') EF.cur.view.fireworks(4); else mm.startEvent('${ev}');`), 2500);
  go('yellow', trig(`mm.foul(mm.outfield(1)[0], mm.outfield(0)[0], 1.6, { sev: 1.2, kind: 'slide' });`), 3000);
  go('red', trig(`mm.foul(mm.outfield(1)[0], mm.outfield(0)[0], 3, { sev: 2, kind: 'slide' });`), 3500);
  go('var', trig(`mm.startVar({ kind: 'penalty', foul: { sev: .6, x: mm.goalX(0) - mm.dir(0) * 40, y: EF.P.CY }, side: 0 });`), 5000);
  go('dive', trig(`mm.setpiece = null; mm.setMode('play'); const f = mm.outfield(1)[1]; mm.setOwner(f, 'dev'); f.theatrics();`), 2500);
  go('goal and replay', trig(`mm.setpiece = null; mm.setMode('play'); EF.Dev.goal(0);`), 9000);
  go('bus', `EF.go("#match/lucchetto")`, 2000); go('the bus parked', trig(`mm.half = 2; mm.clock = mm.halfLen * 16 / 45; mm.score = [0, 1]; mm.setpiece = null; mm.setMode('play');`), 4000);
  go('the bus smashed', trig(`EF.parts.super(mm);`), 6000);
  for (let r = 1; r <= 5; r++) go('cup r' + r, `EF.go("#cup/r${r}")`, 2500);
  go('cup bracket', `My3D2dge.current.go('cup', {})`, 1500);
  go('villain', `My3D2dge.current.go('cup', { beat: 'villain' })`, 2500);
  go('tunnel', `My3D2dge.current.go('tunnel', { opts: { home: 'kipperton', away: 'opulence', stadium: 'euphorium' }, next: { scene: 'title', data: {} } })`, 6000);
  go('ending ceremony', `EF.go("#ending")`, 3000); go('ending parade', `My3D2dge.current.scene.phase = 'parade'; My3D2dge.current.scene.pt = 0`, 3000); go('ending tabloid', `(() => { const s = My3D2dge.current.scene; s.phase = 'tabloid'; s.tt = 0; s.photo = EF.Cast.rig('kipperton:pilchard'); })()`, 2000); go('ending credits', `(() => { const s = My3D2dge.current.scene; s.phase = 'credits'; s.ct = 0; })()`, 2000);
  for (const d of ['move', 'passing', 'shooting', 'air', 'skills', 'defending', 'setpieces', 'euphoria', 'theatrics']) go('drill ' + d, `EF.startDrill('${d}', null)`, 3000);
  go('anim gallery', `EF.go("#dev/anim/pass")`, 1000);
  for (let i = 0; i < 40; i++) go('gallery move ' + i, `My3D2dge.current.input.tap('right')`, 350);
  go('gallery views', `(() => { for (let i = 0; i < 4; i++) setTimeout(() => My3D2dge.current.input.tap('down'), i * 300); })()`, 1500);
  go('sound test', `EF.go("#dev/sound")`, 1500);
  go('album pages', `(() => { EF.go("#album"); for (let i = 0; i < 9; i++) setTimeout(() => My3D2dge.current.input.tap('right'), 400 + i * 250); })()`, 3500);
  go('about pages', `(() => { EF.go("#about"); for (let i = 0; i < 8; i++) setTimeout(() => My3D2dge.current.input.tap('right'), 400 + i * 250); })()`, 3000);
  go('dev panel tabs', `(() => { EF.go("#match"); setTimeout(() => { EF.Dev.open(); for (let i = 0; i < 4; i++) setTimeout(() => { EF.Dev.tab = i; }, i * 400); }, 1200); })()`, 3500);
  go('dev overlays', `(() => { EF.Dev.close(); Object.assign(EF.Dev.show, { hit: true, ai: true, path: true, bones: true }); })()`, 2000);
  go('views', `(() => { const g = My3D2dge.current; g.setView('threequarter'); setTimeout(() => g.setView('topdown'), 700); setTimeout(() => { g.setView('broadcast'); Object.assign(EF.Dev.show, { hit: false, ai: false, path: false, bones: false }); }, 1400); })()`, 2000);
  go('attract', `EF.go("#attract")`, 3000);
  for (let s = 0; s < 6; s++) go('attract segment ' + s, `(() => { const sc = My3D2dge.current.scene; sc.seg = ${s} - 1; sc.next(); })()`, s === 0 ? 9000 : 6000);
  let last = 0;
  for (const [label, js, ms] of steps) {
    try { await p.evaluate(js); } catch (e) { errs.push(label + ': eval ' + String(e).slice(0, 160)); }
    await p.waitForTimeout(ms);
    const ge = await p.evaluate(() => My3D2dge.current.errors.map(e => String(e.message || e).slice(0, 160)));
    if (ge.length > last || errs.length) { check(S, label, false, ge.slice(last).concat(errs).join(' | ')); errs.length = 0; last = ge.length; } else check(S, label, true);
  }
  await b.close();
}
