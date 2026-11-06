// Two windows on BroadcastChannel play a round: a shared fire, a shared case, the same standings.
import { launch } from '../lib/browser.mjs';
import { OUT } from '../lib/paths.mjs';
export const name = 'link';
export const covers = ['src', 'pixel-engine.js', 'vendor', 'tools/build.mjs'];
export const needsBuild = true;
const wait = (page) => page.waitForFunction(() => window.__GAME__ && window.__PIXEL_ENGINE__, null, { timeout: 180000, polling: 200 });
export async function run(t) {
  const browser = await launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
    const a = await ctx.newPage(), b = await ctx.newPage();
    const errs = [];
    for (const p of [a, b]) p.on('pageerror', (e) => errs.push(e.message));
    await a.goto(`file://${OUT}`); await b.goto(`file://${OUT}`);
    await wait(a); await wait(b);
    for (const p of [a, b]) await p.evaluate(() => { const e = window.__PIXEL_ENGINE__; e.manual = true; e.step(200); });
    await a.evaluate(() => { window.__GAME__.startRound('host'); window.__PIXEL_ENGINE__.step(3); });
    await b.evaluate(() => { window.__GAME__.startRound('join'); window.__PIXEL_ENGINE__.step(3); });
    t.eq('host lobby', await a.evaluate(() => window.__GAME__.state().screen), 'lobby');
    await a.waitForFunction(() => window.__GAME__.linkPending.players.length === 2, null, { timeout: 15000, polling: 200 });
    t.eq('join sees itself seated', await b.evaluate(() => window.__GAME__.linkPending.me), 1);
    await a.evaluate(() => { window.__GAME__.linkPending.begin(); });
    await b.waitForFunction(() => window.__GAME__.round && window.__GAME__.round.phase === 'countdown', null, { timeout: 15000, polling: 200 });
    await a.waitForFunction(() => window.__GAME__.round, null, { timeout: 15000, polling: 200 });
    await a.waitForTimeout(3500);
    for (const p of [a, b]) await p.evaluate(() => window.__PIXEL_ENGINE__.step(10));
    t.eq('host in play', await a.evaluate(() => window.__GAME__.round.phase), 'play');
    t.eq('guest in play', await b.evaluate(() => window.__GAME__.round.phase), 'play');
    // The guest's position reaches the host.
    await b.evaluate(() => { const g = window.__GAME__; g.player.teleport(120, -240); window.__PIXEL_ENGINE__.step(2); });
    await a.waitForFunction(() => { const m = window.__GAME__.round.mercs.find((x) => x.id === 1); return m && Math.hypot(m.x - 120, m.z + 240) < 3; }, null, { timeout: 12000, polling: 200 });
    t.ok('guest position reaches host', true);
    // A shared fire: the host lights, the guest's grid follows.
    await a.evaluate(() => { const g = window.__GAME__; g.fire.ignite(180, -160, 8, 'player'); });
    await b.waitForFunction(() => window.__GAME__.fire.counts.burning > 0, null, { timeout: 12000, polling: 200 });
    t.ok('shared fire', true);
    // A shared case: the guest takes it through the host.
    await b.evaluate(() => { const g = window.__GAME__, c = g.round.cases[0]; g.player.teleport(c.x, c.z + 1); window.__PIXEL_ENGINE__.step(2); });
    await a.waitForTimeout(400);
    await b.evaluate(() => { const g = window.__GAME__; g.round.request(['take', 0]); });
    try { await a.waitForFunction(() => window.__GAME__.round.cases[0].state === 'carried', null, { timeout: 12000, polling: 200 }); } catch (err) { console.log(await a.evaluate(() => { const r = window.__GAME__.round, m = r.mercs.find((x) => x.id === 1), c = r.cases[0]; return JSON.stringify({ c, m: { x: m.x, z: m.z, down: m.down, carrying: m.carrying, seq: m.lastSeq }, q: r.evQ }); })); console.log(await b.evaluate(() => { const r = window.__GAME__.round; return JSON.stringify({ q: r.evQ, feet: window.__GAME__.player.feet, me: r.s.me, local: r.local?.id, lastE: r.netLastE, host: r.s.host, ended: r.ended }); })); throw err; }
    await b.waitForFunction(() => window.__GAME__.round.cases[0].state === 'carried', null, { timeout: 12000, polling: 200 });
    t.ok('shared case', true);
    // A shot from the guest is decided by the host: it wakes the soldiers there.
    await b.evaluate(() => { const g = window.__GAME__; g.round.sendShot(100, 45, -200, 1, 0, 0, 'tractor'); });
    await a.waitForTimeout(600);
    // A guest's syrette goes through the host.
    await a.evaluate(() => { const m = window.__GAME__.round.mercs.find((x) => x.id === 1); m.hp = 30; });
    await b.evaluate(() => { const g = window.__GAME__; g.round.evQ.push(['heal']); });
    await a.waitForFunction(() => window.__GAME__.round.mercs.find((x) => x.id === 1).hp > 60, null, { timeout: 12000, polling: 200 });
    t.ok('guest syrette reaches the host', true);
    // Bank, finish, same standings.
    await b.evaluate(() => { const g = window.__GAME__; g.player.teleport(150, -200); });
    await a.waitForFunction(() => { const m = window.__GAME__.round.mercs.find((x) => x.id === 1); return m && Math.hypot(m.x - 150, m.z + 200) < 4; }, null, { timeout: 12000, polling: 200 });
    await b.evaluate(() => { window.__GAME__.round.request(['bank']); });
    await a.waitForFunction(() => window.__GAME__.round.mercs.find((x) => x.id === 1).stones > 0, null, { timeout: 12000, polling: 200 });
    await b.waitForFunction(() => window.__GAME__.round.mercs.find((x) => x.id === 1).stones > 0, null, { timeout: 12000, polling: 200 });
    t.ok('guest banked on both copies', true);
    const standingsA = await a.evaluate(() => { const g = window.__GAME__; g.round.finish('time'); return g.round.outcome.standings; });
    await b.waitForFunction(() => window.__GAME__.round.phase === 'over', null, { timeout: 12000, polling: 200 });
    const standingsB = await b.evaluate(() => window.__GAME__.round.s.outcome.standings);
    t.eq('same standings', JSON.stringify(standingsA), JSON.stringify(standingsB));
    t.eq('guest wins', standingsA[0][0], 1);
    t.ok('no page errors', errs.length === 0, errs[0]);
  } finally { await browser.close(); }
}
