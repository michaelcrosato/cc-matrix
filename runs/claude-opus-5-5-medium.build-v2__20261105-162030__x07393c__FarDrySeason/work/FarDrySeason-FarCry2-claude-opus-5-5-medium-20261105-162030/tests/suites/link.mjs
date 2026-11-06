// Two windows on one computer: a shared fire, a shared case, the same standings.
import { basename, resolve } from 'node:path';
import { chromium } from 'playwright';
const root = resolve(import.meta.dirname, '..', '..'), url = `file://${resolve(root, '..', `${basename(root)}.html`)}`;
const FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'];
let pass = 0, fail = 0; const ok = (c, n) => { if (c) pass++; else { fail++; console.log(`FAIL ${n}`); } };
const browser = await chromium.launch({ args: FLAGS });
try {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
  const openP = async () => { const page = await ctx.newPage(); page.errs = []; page.on('pageerror', (x) => page.errs.push(String(x))); await page.goto(url); await page.waitForFunction(() => window.__PIXEL_READY__ !== undefined, null, { timeout: 90000 }); await page.evaluate(() => window.__PIXEL_READY__); await page.waitForFunction(() => !!window.__GAME__, null, { timeout: 60000 }); await page.evaluate(() => { const e = window.__PIXEL_ENGINE__; e.manual = true; const g = window.__GAME__; if (g.mode === 'attract') g.attract.stop(); }); return page; };
  const A = await openP(), B = await openP();
  await A.evaluate(() => window.__GAME__.startCashRun('host')); await B.evaluate(() => window.__GAME__.startCashRun('join'));
  await A.waitForFunction(() => window.__GAME__.linkPending?.joined, null, { timeout: 15000 });
  ok(await A.evaluate(() => window.__GAME__.ui.top?.id === 'link-lobby'), 'host lobby');
  await A.evaluate(() => window.__GAME__.linkPending.start());
  await B.waitForFunction(() => window.__GAME__.mode === 'round', null, { timeout: 10000 });
  ok(await A.evaluate(() => window.__GAME__.mode === 'round'), 'host in round');
  const step = (p, n = 30) => p.evaluate((k) => window.__PIXEL_ENGINE__.step(k), n);
  const both = async (n = 30, wait = 150) => { await Promise.all([step(A, n), step(B, n)]); await A.waitForTimeout(wait); };
  await A.waitForTimeout(3300); await both(60);
  ok(await A.evaluate(() => window.__GAME__.net.inPlay()), 'play began');
  // Shared fire: lit by the guest, seen by both.
  await B.evaluate(() => { const g = window.__GAME__, f = g.world.fire; let i = 0; for (let z = -280; z < -100 && !i; z += 5) for (let x = 230; x < 400 && !i; x += 5) if (f.burnableAt(x, z)) { g.net.queueEv(['i', x, z, 5]); i = 1; } });
  await A.waitForTimeout(500); for (let k = 0; k < 6; k++) await both(30, 300);
  const fa = await A.evaluate(() => window.__GAME__.world.fire.burning.length + window.__GAME__.world.fire.burntCount), fb = await B.evaluate(() => window.__GAME__.world.fire.burning.length + window.__GAME__.world.fire.burntCount);
  ok(fa > 0, `host fire ${fa}`); ok(fb > 0, `client sees the fire ${fb}`);
  // Guest walks to a case and takes it, banks it.
  await A.evaluate(() => { window.__GAME__.net.hurt = () => {}; });
  const cs = await B.evaluate(() => { const g = window.__GAME__, c = g.net.cases[5]; g.player.teleport(c.x + 1, c.z); g.player.lookAt(c.x, c.y, c.z); return c.i; });
  await both(30, 400); await B.evaluate((i) => { window.__GAME__.net.queueEv(['p', i]); }, cs); for (let k = 0; k < 3; k++) await both(30, 400);
  if (process.env.DBG) console.log(await A.evaluate((i) => { const n = window.__GAME__.net, c = n.cases[i], P = n.P[1]; return JSON.stringify({ c: [c.x, c.z, c.carrier, c.banked], P: [P.x, P.z, P.down, P.carrying, P.hp, P.seq, P.respawning] }); }, cs), await B.evaluate(() => JSON.stringify({ ev: window.__GAME__.net.evQ.length, x: window.__GAME__.player.x, z: window.__GAME__.player.z, t: window.__GAME__.net.time(), ended: window.__GAME__.net.ended })));
  ok(await A.evaluate((i) => window.__GAME__.net.cases[i].carrier === 1, cs), 'host gives the guest the case');
  ok(await B.evaluate((i) => window.__GAME__.net.cases[i].carrier === 1, cs), 'guest knows it carries the case');
  await B.evaluate(() => window.__GAME__.player.teleport(152, -225)); for (let k = 0; k < 4; k++) await both(30, 400);
  const sa = await A.evaluate(() => window.__GAME__.net.P[1].stones), sb = await B.evaluate(() => window.__GAME__.net.P[1].stones); ok(sa > 0, `banked ${sa}`); ok(sa === sb, `same stones on both ${sa} ${sb}`);
  // Gunfire plays on the other copy.
  const shots = (p) => p.evaluate(() => { const c = window.__GAME__.ctx.audio.counts; return (c['gun-rifle'] ?? 0) + (c['gun-rifle-far'] ?? 0) + (c['gun-mg'] ?? 0) + (c['gun-mg-far'] ?? 0); });
  await both(30, 300); ok(await B.evaluate(() => window.__GAME__.net.puppets.size > 0), 'the guest sees soldier puppets');
  let s0 = await shots(B); for (let k = 0; k < 4; k++) { await A.evaluate(() => { const g = window.__GAME__; for (const a of g.actors.list) a.firedT = g.world.time; }); await step(A, 1); await A.waitForTimeout(250); await step(B, 2); }
  ok((await shots(B)) > s0, 'a soldier firing on the host plays on the guest');
  s0 = await shots(B); for (let k = 0; k < 4; k++) { await A.evaluate(() => { const g = window.__GAME__; g.net.P[0].firedT = g.world.time; }); await step(A, 1); await A.waitForTimeout(250); await step(B, 2); }
  ok((await shots(B)) > s0, 'the host player firing plays on the guest');
  s0 = await shots(A); await B.evaluate(() => { const g = window.__GAME__; g.net.queueEv(['s', 'tractor', Math.round(g.player.x * 100), Math.round((g.player.y + 1.5) * 100), Math.round(g.player.z * 100), 0, 1000, 0]); }); for (let k = 0; k < 3; k++) await both(5, 300);
  ok((await shots(A)) > s0, 'the guest firing plays on the host');
  await A.evaluate(() => window.__GAME__.net.finish()); await A.waitForTimeout(600); await both(10);
  const ra = await A.evaluate(() => window.__GAME__.ui.top?.id), rb = await B.evaluate(() => window.__GAME__.ui.top?.id); ok(ra === 'results', `host results ${ra}`); ok(rb === 'results', `guest results ${rb}`);
  ok(!A.errs.length && !B.errs.length, `page errors ${[...A.errs, ...B.errs].slice(0, 2).join('|').slice(0, 300)}`);
  await ctx.close();
} catch (x) { fail++; console.log(`FAIL threw ${String(x).slice(0, 500)}`); }
await browser.close();
console.log(`${pass} passed, ${fail} failed`);
