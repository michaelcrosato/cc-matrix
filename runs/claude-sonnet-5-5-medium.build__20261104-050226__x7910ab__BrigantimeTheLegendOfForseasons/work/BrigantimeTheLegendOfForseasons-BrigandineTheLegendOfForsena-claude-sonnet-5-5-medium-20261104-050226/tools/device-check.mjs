// emulated devices: a standard-mapping DualSense through the Gamepad API, and a touch-only phone
import { chromium } from '../engine/node_modules/playwright/index.mjs'; import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const url = pathToFileURL(resolve(process.env.PAGE || '../' + process.cwd().split('/').pop() + '.html')).href;
const b = await chromium.launch(); let bad = 0; const chk = (c, w) => { console.log((c ? 'ok   ' : 'FAIL ') + w); if (!c) bad++; };
{ // ---- pad ----
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(() => { window.__pad = { b: new Array(17).fill(0), a: [0, 0, 0, 0] }; const mk = () => ({ id: '054c-0ce6-Wireless Controller (DualSense)', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), axes: window.__pad.a.slice(), buttons: window.__pad.b.map(v => ({ pressed: !!v, touched: !!v, value: v })) }); navigator.getGamepads = () => [mk(), null, null, null]; });
  await p.goto(url); await p.waitForTimeout(1200); await p.evaluate(() => window.dispatchEvent(new Event('gamepadconnected')));
  const press = async (i, ms = 120) => { await p.evaluate(i => { window.__pad.b[i] = 1; }, i); await p.waitForTimeout(ms); await p.evaluate(i => { window.__pad.b[i] = 0; }, i); await p.waitForTimeout(160); };
  const sc = () => p.evaluate(() => My3D2dge.current.sceneName); const dev = () => p.evaluate(() => My3D2dge.current.input.lastDevice + '|' + My3D2dge.current.input.padStyle() + '|' + My3D2dge.current.input.label('confirm'));
  await press(13); await press(13); await press(0); await p.waitForTimeout(500); chk(await sc() === 'skirmishSetup', 'd-pad down x2 + Cross opens Skirmish: ' + await sc());
  chk((await dev()).startsWith('gamepad|playstation|'), 'PlayStation glyphs after pad use: ' + await dev());
  await p.screenshot({ path: 'shots/pad-prompts.png' });
  await press(1); await p.waitForTimeout(400); chk(await sc() === 'title', 'Circle goes back');
  for (let i = 0; i < 2; i++) { await p.evaluate(() => { window.__pad.a[1] = 1; }); await p.waitForTimeout(200); await p.evaluate(() => { window.__pad.a[1] = 0; }); await p.waitForTimeout(250); } await press(0); await p.waitForTimeout(500); const s2 = await sc(); chk(s2 !== 'title', 'left stick down x2 + Cross selects Skirmish: ' + s2); chk(s2 === 'skirmishSetup', 'it is the Skirmish screen');
  await p.evaluate(async () => { const g = My3D2dge.current; g.settings.set('glyphs', 'Xbox'); }); await p.waitForTimeout(400); chk((await dev()).includes('xbox'), 'Settings option switches to Xbox glyphs: ' + await dev());
  await p.evaluate(() => My3D2dge.current.settings.set('glyphs', 'PlayStation'));
  await p.evaluate(() => { const g = My3D2dge.current, G = g.debug.G; g.go('battle', { spec: G.makeSkirmish(21, { realms: [0, 1], map: 'meadow', season: 0 }), skirmish: true }); }); await p.waitForTimeout(2500);
  await press(0); await p.waitForTimeout(300); let m = await p.evaluate(() => My3D2dge.current.scene.bv.mode); chk(m === 'move', 'Cross selects a unit in battle: ' + m);
  await press(1); await p.waitForTimeout(300); m = await p.evaluate(() => My3D2dge.current.scene.bv.mode); chk(m === 'free', 'Circle deselects: ' + m);
  await press(2); await p.waitForTimeout(300); chk(await p.evaluate(() => !!My3D2dge.current.scene.bv.confirmEnd), 'Square opens end-phase confirm'); await press(1);
  await press(9); await p.waitForTimeout(500); chk(await p.evaluate(() => My3D2dge.current.paused), 'Options (Start) pauses');
  chk(!errs.length, 'no page errors with a pad ' + errs.join('|').slice(0, 100)); await p.close();
}
{ // ---- touch-only phone ----
  const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(url); await p.waitForTimeout(1500);
  const s = await p.evaluate(() => My3D2dge.current.debug.snapshot()); chk(s.touchOnly === true, 'touch-only detected'); await p.screenshot({ path: 'shots/touch.png' });
  await p.evaluate(() => { const G = My3D2dge.current.debug.G; G.lastActivity = performance.now() / 1000 - 11; }); await p.waitForTimeout(1500);
  chk((await p.evaluate(() => My3D2dge.current.sceneName)) === 'attract', 'attract runs on a touch-only device');
  chk(!errs.length, 'no page errors on touch ' + errs.join('|').slice(0, 100)); await ctx.close();
}
await b.close(); console.log(bad ? bad + ' device checks FAILED' : 'all device checks passed'); process.exit(bad ? 1 : 0);
