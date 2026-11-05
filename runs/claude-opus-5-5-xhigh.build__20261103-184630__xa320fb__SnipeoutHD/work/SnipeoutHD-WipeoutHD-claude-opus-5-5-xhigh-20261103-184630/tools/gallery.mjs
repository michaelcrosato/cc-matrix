// The screenshot gallery (only for what scripts can't judge): node tools/gallery.mjs [name ...] -> tests/out/g-*.png
import { chromium } from 'playwright';
import { OUT } from './bundle.mjs';
const only = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(OUT.href);
const ev = (f, a) => page.evaluate(f, a);
const until = async (f, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(f).catch(() => false)) return true; await page.waitForTimeout(200); } return false; };
const gwait = async s => { const g0 = await ev(() => My3D2dge.current.real); await until(`My3D2dge.current.real >= ${g0 + s}`); };
const shot = async n => { await page.screenshot({ path: 'tests/out/g-' + n + '.png' }); console.log('shot', n); };
await until(() => window.My3D2dge && My3D2dge.current && My3D2dge.current.sceneName === 'title');
const race = async (cfg, s = 1) => { await ev(c => { window.__prev = My3D2dge.current.debug.race(); SN.flow.start(c); }, Object.assign({ team: 'kestrel', pilot: 'vale', intro: false, seed: 7 }, cfg)); await until(() => { const r = My3D2dge.current.debug.race(); return My3D2dge.current.sceneName === 'race' && r && r !== window.__prev && r.state === 'racing'; }); await gwait(s); };
const tp = async (s, u = 0, v = 1600) => { await ev(([s, u, v]) => { const R = My3D2dge.current.debug.race(); SN.debugTeleport(R, s, u, v); }, [s, u, v]); };
const bot = async on => ev(on => { if (!on) { SN.vpad[0].on = false; clearInterval(window.__bt); return; } window.__bt = setInterval(() => { const R = My3D2dge.current.debug.race(); if (!R || !R.player) return; const c = SN.AI.controls(R.player, R, { skill: 1, brain: 'bot' }); Object.assign(SN.vpad[0], { on: true, steer: c.steer, pitch: c.pitch, thrust: c.thrust, brakeL: c.brakeL, brakeR: c.brakeR, fire: c.fire }); }, 8); }, on);
const want = n => !only.length || only.includes(n);
if (want('season')) { await ev(() => { SN.save.data.started = true; SN.save.data.team = 'soratek'; SN.save.data.pilot = 'takahara'; SN.save.data.medals = { e1: 'gold', e2: 'silver', e3: 'bronze' }; SN.flow.toSeason(); }); await gwait(1.5); await shot('season');
  await ev(() => SN.story.play(SN.STORY.brief.e4)); await gwait(1.6); await shot('briefing'); await ev(() => { SN.story.queue.length = 0; SN.story.talk.close(); SN.story.active = false; }); }
if (want('karakum')) { await race({ mode: 'race', track: 'karakum', cls: 'FLARE' }); await bot(true); const s = await ev(() => SN.getTrack('karakum').knots[17]); await tp(s, 0, 1700); await gwait(1.2); await shot('karakum-spiral'); await tp(await ev(() => SN.getTrack('karakum').jumps[0].s0 - 16 * 40), 0, 1800); await gwait(.85); await shot('karakum-gorge'); await tp(await ev(() => SN.getTrack('karakum').tunnels[0].s0 + 16 * 60), 0, 1600); await gwait(.6); await shot('karakum-tunnel'); await bot(false); }
if (want('meridian')) { await race({ mode: 'race', track: 'meridian', cls: 'STORM' }); await bot(true); await tp(await ev(() => SN.getTrack('meridian').overpasses[0].sLow - 16 * 60), 0, 2000); await gwait(1); await shot('meridian-under'); await tp(await ev(() => SN.getTrack('meridian').jumps[0].s0 - 16 * 30), 0, 2000); await gwait(.55); await shot('meridian-drop'); await bot(false); }
if (want('borealis')) { await race({ mode: 'race', track: 'borealis', cls: 'FLARE' }); await bot(true); await gwait(3); await shot('borealis-start'); await tp(await ev(() => SN.getTrack('borealis').tunnels[0].s0 + 16 * 100), 0, 1700); await gwait(.6); await shot('borealis-ice'); await bot(false); }
if (want('cockpit')) { await race({ mode: 'race', track: 'solenne', cls: 'STORM' }); await bot(true); await ev(() => { const c = My3D2dge.current.debug.cams()[0]; c.mode = 'cockpit'; }); await gwait(4); await shot('cockpit'); await ev(() => { const c = My3D2dge.current.debug.cams()[0]; c.mode = 'far'; }); await gwait(1); await shot('far'); await bot(false); }
if (want('weapons')) { await race({ mode: 'race', track: 'solenne', cls: 'SPARK' }); await bot(true); for (const w of ['swarm', 'rail', 'tremor', 'bulwark']) { await ev(w => { const R = My3D2dge.current.debug.race(), pl = R.player, tg = R.ships.find(s => s !== pl && Math.abs(R.track.dS(pl.s, s.s)) < 2000) || R.ships[0]; R.weapons.give(pl, w); R.weapons.fire(pl, w); }, w); await gwait(.3); await shot('w-' + w); } await bot(false); }
if (want('overclock')) { await race({ mode: 'overclock', track: 'karakum', cls: 'SPARK' }); await bot(true); await gwait(2); await shot('overclock-1'); await ev(() => My3D2dge.current.debug.race().zoneUp(19)); await gwait(1.5); await shot('overclock-20'); await bot(false); }
if (want('academy')) { await race({ mode: 'academy', track: 'solenne', cls: 'SPARK', drill: 5 }); await gwait(1); await shot('academy'); }
if (want('results')) { await race({ mode: 'race', track: 'solenne', cls: 'SPARK', laps: 1 }); await ev(() => { const R = My3D2dge.current.debug.race(); SN.dev.race = R; SN.dev.cheatRows().find(r => r.label === 'Win now').act(); }); await until(() => My3D2dge.current.sceneName === 'results'); await gwait(1.5); await shot('podium'); await gwait(4); await shot('results'); }
if (want('replay')) { await ev(() => SN.flow.replay(My3D2dge.current.debug.race())); await until(() => My3D2dge.current.sceneName === 'replay'); await gwait(3); await shot('replay'); }
if (want('screens')) { for (const [n, f] of [['howto', () => SN.UI.push(SN.screens.howto())], ['records', () => SN.UI.push(SN.screens.records())], ['about', () => SN.UI.push(SN.screens.about())], ['options', () => SN.UI.push(SN.screens.options())], ['class', () => SN.flow.setup({ mode: 'race' })]]) { await ev(() => SN.flow.toMenu()); await gwait(.8); await ev(f); await gwait(.8); await shot(n); } await ev(() => { SN.UI.top().onTab && SN.UI.top().onTab(1); }); }
if (want('attract')) { await ev(() => My3D2dge.current.go('attract')); for (const k of [0, 1, 2, 3]) { await ev(k => SN.attract.start(k), k); await gwait(5); await shot('attract-' + k); } }
console.log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no page errors');
await browser.close();
