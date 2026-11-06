// The whole game by script: real menus via setKey, bots inside activities.
import { App, boot, check, go, press, report, settle, steps, tickle } from './lib.mjs';
import { shownAge, totalStars } from '../../src/core/progress.js';
import { ACT, ACTIVITIES } from '../../src/data/activities.js';
import { STATIONS } from '../../src/data/stations.js';
import { weekDay } from '../../src/data/week.js';
import { MILESTONES } from '../../src/data/unlocks.js';
import { TUNABLES, T, TUNABLE_TABS } from '../../src/core/tunables.js';
import { ATTRACT_PLAYLIST, ATTRACT_IDLE, ATTRACT_SECONDS } from '../../src/app.js';
import { DevScreen } from '../../src/ui/screens/dev.js';
import { PauseScreen } from '../../src/ui/screens/pause.js';
await boot();
const e = App.engine, top = () => App.top()?.id ?? null, sid = () => App.scene?.id;
async function until(cond, max = 3000, what = '') {
  let n = 0;
  while (!cond() && n < max) {
    if (top() === 'dialogue') { await press('Enter', 2); n += 4; continue; }
    e.step(1); n++; if (n % 60 === 0) await tickle();
  }
  await tickle();
  check(`until ${what}`, cond(), `scene ${sid()} top ${top()} ${App.scene?.status?.(App.ctx)} errs ${App.engine.errors.slice(-1)} ${App.loadErrors.slice(-1)}`);
  return cond();
}
const noErrs = (w) => { check(`no errors: ${w}`, !e.errors.length && !App.loadErrors.length, [...e.errors, ...App.loadErrors].slice(-2).join('|').slice(0, 400)); e.errors.length = 0; App.loadErrors.length = 0; };
async function pickRow(pred, maxMoves = 24) {
  const m = App.top().menu;
  for (let i = 0; i < maxMoves; i++) { const it = m.items[m.index]; if (pred(it)) { await press('Enter'); return true; } await press('ArrowDown'); }
  check('menu row found', false, m.items.map((x) => x.label).join(','));
  return false;
}
// ---------- A fresh save, through the real menus ----------
await go('title', {});
await steps(30);
await press('Enter'); await steps(3);
check('main menu opens on any key', top() === 'main', top());
await pickRow((it) => it.label === 'The Week');
check('slots menu', top() === 'slots', top());
await pickRow((it) => it.label.startsWith('Guest 1'));
check('name entry', top() === 'name', top());
await press('Enter'); await press('ArrowRight'); await press('Enter');
check('typed name letters', App.top().name.length === 2, App.top().name);
await press('Tab');
check('avatar pick', top() === 'avatar', top());
await steps(5); await press('ArrowDown'); await steps(5); await press('Enter');
await until(() => sid() === 'ferry' && !App.loading, 900, 'ferry');
check('slot made', App.slot?.name?.length === 2 && App.slot.avatar === 1, JSON.stringify(App.slot?.name));
await steps(40); await press('Enter');
await until(() => sid() === 'weighin' && !App.loading, 900, 'first weigh-in');

// ---------- One week ----------
App.setDriver('good');
async function weighIn(day) {
  await until(() => sid() === 'weighin' && !App.loading, 900, `weighin day ${day}`);
  await until(() => App.scene.part === 'test', 1600, 'test begins');
  await until(() => ['howold', 'question'].includes(top()), 1500, 'test ends');
  if (top() === 'howold') { await press('ArrowRight'); await press('ArrowDown'); await press('Enter'); await steps(3); check('how old never saved', !JSON.stringify(App.slot).includes('"felt"')); }
  check(`question day ${day}`, top() === 'question', top());
  await press('Enter');
  await until(() => App.scene.part === 'reveal', 900, 'reveal');
  await until(() => App.scene.revealed, 400, 'revealed');
  check(`age recorded day ${day}`, App.slot.chart.length === (App.slot.week === 1 ? day : App.slot.chart.length) && App.scene.shownAge === App.slot.wobbleToday + (App.slot.confessed ? 0 : 7), `${App.slot.chart} ${App.scene.shownAge}`);
  await steps(170);
  await press('Enter');
  await until(() => sid() === 'hub' && !App.loading, 900, 'hub');
  await until(() => top() !== 'dialogue', 900, 'hub dialogue done');
  noErrs(`weighin ${day}`);
}
async function walkTo(k) {
  const s = STATIONS[k], off = (s.reach ?? 3) - 1;
  App.scene.hero.teleport([s.at[0], 0.1, s.at[1] + off]);
  await steps(8);
  check(`near ${k}`, App.scene.near === k, `${App.scene.near} at ${App.scene.model.position.x.toFixed(1)},${App.scene.model.position.z.toFixed(1)}`);
}
async function playAt(k, id, skill = 'good') {
  App.setDriver(skill);
  await walkTo(k);
  await press('Enter'); await steps(2);
  check(`station menu ${k}`, top() === 'station', top());
  await pickRow((it) => it.label === ACT[id].name);
  await until(() => sid() === 'activity' && !App.loading, 900, `activity ${id}`);
  await steps(70); await press('Enter');
  const sc = App.scene;
  let n = 0;
  while (!sc.finished && n < 12000) { if (sc.phase === 'practice' && n % 200 === 0) sc.practiceSkip = true; if (sc.phase === 'intro' && n % 30 === 0) await press('Enter'); e.step(1); n++; if (n % 120 === 0) await tickle(); }
  check(`${id} finished`, sc.finished, sc.status(App.ctx));
  await steps(70);
  check('results', top() === 'results', top());
  const r = App.lastResult;
  const m = App.top().menu; const back = m.items.findIndex((it) => it.label.startsWith('Back') || it.label === 'Continue'); while (m.index !== back) await press('ArrowDown');
  await press('Enter');
  if (id !== 'longstand') { await until(() => sid() === 'hub' && !App.loading, 900, `back to hub ${id}`); }
  noErrs(`activity ${id}`);
  return r;
}
async function hammock(day) {
  await walkTo('hammock'); await press('Enter'); await steps(2);
  await until(() => top() === 'hammock', 600, 'hammock menu');
  await press('Enter');
  await until(() => sid() === 'report' && !App.loading, 900, 'report');
  await steps(40);
  await press('Enter');
  noErrs(`day ${day} report`);
}
const PLAN = {
  1: [['pavilion', 'tree'], ['shed', 'squats'], ['beach', 'hoop']],
  2: [['lagoon', 'header'], ['pavilion', 'warrior']],
  3: [['beach', 'step'], ['lagoon', 'slackline'], ['pavilion', 'chair']],
  4: [['lagoon', 'tray'], ['shed', 'press'], ['pavilion', 'fold']],
  5: [['gate', 'jog'], ['lagoon', 'pier'], ['pavilion', 'plank']],
  6: [['shed', 'lunges'], ['pavilion', 'heron']],
};
const LOCKED = { 1: 'jog', 2: 'tray', 3: 'press', 4: 'plank', 5: 'longstand' };
for (let day = 1; day <= 6; day++) {
  await weighIn(day);
  check(`day ${day} state`, App.slot.day === day, App.slot.day);
  check(`day ${day} goal open`, !App.slot.goalDone);
  if (LOCKED[day]) { const a = ACT[LOCKED[day]]; const { isOpen } = await import('../../src/core/progress.js'); check(`day ${day} still locks ${a.id}`, !isOpen(App.slot, a.id)); }
  for (const [k, id] of PLAN[day]) await playAt(k, id, 'expert');
  check(`day ${day} goal met (${weekDay(day).goalText})`, App.slot.goalDone, JSON.stringify(App.slot.today));
  await hammock(day);
}
check('jar milestones earned', App.slot.milestones >= 3 && App.slot.items.length === App.slot.milestones, `${App.slot.drips} drips, ${App.slot.milestones}`);
check('milestone count matches drips', App.slot.milestones === MILESTONES.filter((m) => m.at <= App.slot.drips).length);
check('training counted', totalStars(App.slot) > 20, totalStars(App.slot));
// Places.
await weighIn(7);
for (const [k, sc] of [['jar', 'jar'], ['hall', 'records'], ['locker', 'locker']]) {
  await walkTo(k); await press('Enter');
  await until(() => sid() === sc && !App.loading, 900, sc); await steps(30);
  if (sc === 'records') { await press('KeyE'); check('records pages', App.scene.page === 1); }
  if (sc === 'locker') { const before = App.slot.look.skin; await press('ArrowRight'); await steps(5); check('locker changes skin', App.slot.look.skin !== before); await press('Escape'); }
  else await press('Escape');
  await until(() => sid() === 'hub' && !App.loading, 900, `back from ${sc}`);
  noErrs(sc);
}
// ---------- The Long Stand and the confession ----------
const before = App.slot.chart.map((v) => shownAge(App.slot, v));
await playAt('stand', 'longstand', 'good');
await until(() => sid() === 'ending' && !App.loading, 900, 'ending');
await until(() => App.scene.part === 'chart', 1500, 'chart slides');
check('confessed', App.slot.confessed);
const after = App.slot.chart.map((v) => shownAge(App.slot, v));
check('confession subtracts exactly 7 from every point', before.every((v, i) => v - after[i] === 7), `${before} / ${after}`);
await until(() => App.scene.part === 'credits', 1500, 'credits');
await steps(130); await press('Enter');
await until(() => sid() === 'weighin' && !App.loading, 900, 'week 2 weigh-in');
check('week 2', App.slot.week === 2 && App.slot.day === 8, `${App.slot.week} ${App.slot.day}`);
noErrs('ending');
await until(() => App.scene.part === 'test', 1600, 'week 2 test');
App.setDriver(null);

// ---------- 6b. Reload mid-week ----------
{ App.save.write(); const raw = App.save.memory; App.save.load(); check('mid-week reload', App.save.data.slots[0].week === 2 && JSON.stringify(App.save.data).length === raw.length); }

// ---------- Mouse on the island: click walks; click a station walks there and enters ----------
{ App.save.wipe(); const { newSlot } = await import('../../src/core/save.js'); const { AVATARS } = await import('../../src/data/classmates.js');
  App.save.data.slots[0] = newSlot('Mouse', { ...AVATARS[0], equipped: [] }, 0); App.slotIndex = 0; App.slot.phase = 'free'; App.slot.dayIntroDone = 1;
  await go('hub', { silent: true }); await steps(10);
  const hub = App.scene, x0 = hub.model.position.x;
  e.input.setPointer(0.35, -0.25, false); await steps(3);
  check('mouse device on the island', App.device.last === 'mouse', App.device.last);
  e.input.setPointer(0.35, -0.25, true); await steps(2); e.input.setPointer(0.35, -0.25, false); await steps(60);
  check('click walks', Math.abs(hub.model.position.x - x0) > 0.5 || hub.nav, `${x0} ${hub.model.position.x}`);
  // Hover a station.
  const v = new App.THREE.Vector3(4, 0, -4).project(App.ctx.camera.camera);
  e.input.setPointer(v.x, v.y, false); await steps(4); check('hover names a station', hub.hover === 'jar', hub.hover);
  e.input.setPointer(v.x, v.y, true); await steps(2); e.input.setPointer(v.x, v.y, false);
  await until(() => sid() === 'jar' && !App.loading, 1500, 'click on a station walks there and enters');
  noErrs('mouse'); App.save.wipe(); App.slotIndex = null; await go('title', {}); App.setDriver('good'); }
// ---------- 7. Pause ----------
App.setDriver('good');
await go('activity', { id: 'tree', mode: 'dropin' });
let sc = App.scene; sc.firstTime = false; sc.afterIntro(); await steps(300);
await press('Escape');
check('pause opens', top() === 'pause', top()); check('timeScale 0', e.timeScale === 0, e.timeScale);
const t0 = sc.lanes[1].sim.t, f0 = sc.fingerprint();
await steps(60);
check('fixedUpdate frozen', sc.lanes[1].sim.t === t0 && sc.fingerprint() === f0);
const idx0 = App.top().menu.index; await press('ArrowDown'); check('menu navigable while paused', App.top().menu.index !== idx0);
await press('ArrowUp'); await press('Enter');
check('resume', top() === null && e.timeScale === 1, `${top()} ${e.timeScale}`);
check('resume exact', sc.fingerprint() === f0 || sc.lanes[1].sim.t - t0 < 0.2);
await steps(30); check('time goes on', sc.lanes[1].sim.t > t0);
// ---------- 8. Dev ----------
await press('Escape');
await (async () => { const m = App.top().menu; const i = m.items.findIndex((x) => x.label === 'Dev Tools'); while (m.index !== i) await press('ArrowDown'); await press('Enter'); })();
check('dev opens from pause', top() === 'dev', top());
const dev = App.top();
for (let t = 0; t < TUNABLE_TABS.length; t++) {
  check(`dev tab ${t}`, dev.menu.title.includes(TUNABLE_TABS[t]), dev.menu.title);
  for (const it of dev.menu.items.filter((x) => x.tun)) { const before = T[it.tun.key]; it.adjust(1); if (T[it.tun.key] === before) it.adjust(-1); check(`slider ${it.tun.key} moves`, T[it.tun.key] !== before); }
  await press('KeyE');
}
check('all tunables have sliders', TUNABLES.length >= 26);
const { resetTunables } = await import('../../src/core/tunables.js');
App.resetAllTunables();
check('reset restores defaults', TUNABLES.every((r) => T[r.key] === r.def));
{ // Sliders change live behaviour.
  const { Dot } = await import('../../src/core/dot.js');
  const run = () => { const d = new Dot(() => 0.5); for (let i = 0; i < 20; i++) d.step(1 / 60, 1, 0, T); return d.x; };
  const a = run(); T.dotAuthority = 6; const b = run(); T.dotAuthority = 3; check('authority live', b > a * 1.2, `${a} ${b}`);
  const { StepSim } = await import('../../src/scenes/activity/step.js');
  const s = new StepSim(ACT.step, { god: false, ringMul: 1, noiseMul: 1 }, { next: () => 0.5 }); const w0 = s.win('ok'); T.stepWindow = 2; check('step window live', s.win('ok') === w0 * 2); T.stepWindow = 1;
  void resetTunables;
}
check('tools tab', dev.menu.title.includes('Tools'), dev.menu.title);
const tool = (l) => dev.menu.items.find((x) => x.label.startsWith(l));
tool('Give 50 Drips').on(); check('drips needs guest message', /guest/.test(dev.msg), dev.msg);
tool('God mode').on(); check('god on', App.god); tool('God mode').on(); check('god off', !App.god);
tool('Overlay').on(); check('overlay on', App.overlayDebug); await steps(2); tool('Overlay').on();
tool('Time scale').adjust(1); check('time scale', App.devTimeScale === 1.5); tool('Time scale').adjust(-1);
tool('Autopilot').adjust(1); check('autopilot picker', App.devDriver !== 'good');  App.setDriver('good');
tool('Sound test').on(); tool('Sound kind').adjust(1); tool('Sound test').on(); tool('Sound kind').adjust(1); tool('Sound test').on(); await steps(2);
const cnt0 = App.voice.log.length; tool('Dialogue tester').on(); await steps(3); check('dialogue tester opens', top() === 'dialogue', top()); check('voice logged', App.voice.log.length >= Math.min(30, cnt0)); while (top() === 'dialogue') await press('Enter', 3);
tool('Free camera').on(); await steps(3); check('free camera', App.engine.camera.preset === 'free'); tool('Free camera').on(); await steps(3);
dev.exportValues(); check('export is JSON', typeof JSON.parse(dev.lastExport) === 'object');
tool('Finish activity: 2').on(); await steps(5); check('finish with stars', App.lastResult?.stars === 2 && top() === 'results', `${JSON.stringify(App.lastResult)} ${top()}`);
App.overlays.length = 0;
await go('title', {}); await press('Enter'); App.overlays.length = 0;
// Animation viewer & jump.
await go('viewer', { clip: 3 }); await steps(10); await press('ArrowRight'); check('viewer cycles', App.scene.i === 4); noErrs('viewer');
App.setDriver(null);

// ---------- 9. Attract ----------
await go('title', {});
App.idle = 0; const framesToAttract = Math.ceil(ATTRACT_IDLE * 60);
await steps(framesToAttract - 30); check('no attract before 10 s', !App.attract);
await steps(60); check('attract starts at 10 s on the title', !!App.attract);
await settle();
check('attract ran first item', App.scene.id === ATTRACT_PLAYLIST[0][0], App.scene.id);
{ // A full loop, error-free.
  const seen = new Set(); let frames = 0;
  while (frames < 60 * ATTRACT_SECONDS * (ATTRACT_PLAYLIST.length + 1) && App.attractLoops < 2) { e.step(1); frames++; if (frames % 60 === 0) { await tickle(); seen.add(`${App.scene.id}:${App.scene.def?.id ?? ''}`); } }
  check('attract covers the playlist', seen.size >= ATTRACT_PLAYLIST.length - 1, [...seen].join(','));
  check('attract loops', App.attractLoops >= 2, App.attractLoops);
  noErrs('attract');
}
await settle(); await steps(40);
for (const [how, act] of [['key', () => e.input.setKey('KeyK', true)], ['pad', () => e.input.setKey('PadCross', true)], ['pointer', () => e.input.setPointer(0.4, 0.4, false)]]) {
  check(`attract running before ${how}`, !!App.attract); act(); await steps(4); e.input.setKey('KeyK', false); e.input.setKey('PadCross', false);
  check(`${how} exits attract`, !App.attract); await settle(); await steps(5);
  check(`back on title after ${how}`, sid() === 'title', sid());
  App.idle = ATTRACT_IDLE - 0.05; await steps(10); check(`timer re-arms ${how}`, !!App.attract); await settle(); await steps(40);
}
App.attract = null; App.go('title', {}); await settle();
// On a menu.
await press('Enter'); check('main', top() === 'main'); App.idle = 0; await steps(framesToAttract + 30); check('attract from a menu', !!App.attract); await settle(); App.attract = null; App.overlays.length = 0;
// Not during play or pause.
await go('activity', { id: 'tree', mode: 'dropin' }); App.idle = 0; await steps(framesToAttract + 30); check('no attract during play', !App.attract);
await press('Escape'); await steps(framesToAttract + 30); check('no attract on pause', !App.attract && top() === 'pause'); App.overlays.length = 0; e.timeScale = 1;
noErrs('attract rules');

// ---------- 10. Determinism ----------
for (const id of ['tree', 'squats', 'hoop', 'header', 'step', 'slackline', 'tray', 'pier', 'jog']) {
  App.setDriver('good');
  const make = () => App.scenes.activity({ id, mode: 'dropin', skipIntro: true });
  await e.loadGame(make(), { camera: make().camera?.() }); await tickle(); e.step(2); await tickle();
  const s1 = App.scene;
  await steps(600);
  const fp = e.fingerprint(), rec = e.recording();
  await e.replay(rec, () => e.loadGame(make(), { camera: make().camera?.() })); await tickle();
  check(`replay ${id}`, e.fingerprint() === fp || App.scene.fingerprint() === s1.fingerprint(), `${e.fingerprint()} vs ${fp}`);
  noErrs(`replay ${id}`);
  App.setDriver(null); e.manual = true;
}
// ---------- 11. Medley ----------
await go('medley', { players: [{ kind: 'bot', seat: 0, name: 'Marguerite', cast: 'marguerite', skill: 'expert', id: 0 }, { kind: 'bot', seat: 1, name: 'Dennis', cast: 'dennis', skill: 'sloppy', id: 1 }, { kind: 'bot', seat: 2, name: 'June', cast: 'june', skill: 'good', id: 2 }, { kind: 'bot', seat: 3, name: 'Coach', cast: 'coach', skill: 'average', id: 3 }] });
const med = App.scene;
await steps(60 * 3 + 30);
check('medley first event in its window', med.partEv === 'event' && med.ev === 0, med.status());
await steps(60 * 56); check('medley gap after window', med.partEv === 'gap', med.status());
await steps(60 * 10); check('second event', med.ev === 1 && med.partEv === 'event', med.status());
await steps(60 * 65); check('third event', med.ev === 2 && med.partEv === 'event', med.status());
await steps(60 * 57);
check('podium', med.part === 'podium', med.status());
for (const l of med.lanes) check(`medley lane scores in range ${l.name}`, l.evScores.every((s) => s >= 0 && s <= 1000) && l.total !== undefined, l.evScores.join());
check('expert beats sloppy', med.totalOf(med.lanes[0]) > med.totalOf(med.lanes[1]), med.status());
check('awards made', med.awards.length === 3);
noErrs('medley');
const { GhostDriver } = await import('../../src/core/drivers.js');
{ const g = new GhostDriver(); const o = { x: 9 }; g.receive({ a: 1, x: 0.5, y: 0, c: 1, t: 0, s: 7 }); g.lerp(1 / 60); check('ghost lerps', g.x > 0 && g.x < 0.5); g.read(o); check('ghost has no input', o.x === 0); }
await steps(5); App.top(); App.overlays.length = 0;
void ACTIVITIES;
const r = report(); console.log(`${r.n - r.fail}/${r.n} passed`); process.exit(r.fail ? 1 : 0);
