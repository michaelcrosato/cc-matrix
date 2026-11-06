// link: two games in one process play Cash Run over the BroadcastChannel to the end with the same standings.
import { boot } from '../lib/boot.mjs';
import { chromium } from 'playwright';
import { GAME_HTML, CHROME_FLAGS } from '../lib/serve.mjs';
export const covers = ['src', 'tools'];
const tick = () => new Promise((r) => setTimeout(r, 5));
export async function run(t) {
  const A = await boot(), B = await boot(); A.game.flow.startRound('host'); B.game.flow.startRound('join');
  for (let i = 0; i < 80 && !(A.game.flow.lobby?.joined); i++) { A.e.step(2); B.e.step(30); await tick(); }
  t.ok(A.game.flow.lobby?.joined, 'the host sees the friend join');
  A.game.ui.screen.items(A.game)[0].run(A.game, A.game.ui); for (let i = 0; i < 20; i++) { B.e.step(2); await tick(); }
  t.ok(A.game.round && B.game.round, 'both windows begin the round'); t.eq(A.game.round.players.length, 2, 'two players');
  A.game.godMode = B.game.godMode = true;
  // a shared case: B takes case 0 and banks it; A must see the standings
  const base = A.game.session.time(); await new Promise((r) => setTimeout(r, 3600));
  const c0 = B.game.round.cases[0]; B.game.player.teleport(c0.x, c0.z + 1); for (let i = 0; i < 90; i++) { B.e.input.setKey('KeyE', true); B.e.step(2); A.e.step(2); await tick(); } B.e.input.setKey('KeyE', false);
  for (let i = 0; i < 40; i++) { B.e.step(2); A.e.step(2); await tick(); }
  t.ok(B.game.round.local.carry === 0, 'the guest takes a case'); t.ok(A.game.round.cases[0].taken, 'the host sees it taken');
  B.game.player.teleport(150, -205); for (let i = 0; i < 40; i++) { B.e.step(3); A.e.step(3); await tick(); }
  t.ok(A.game.round.players[1].stones > 0, 'the host counts the guest\'s bank');
  A.game.session.emit('time-up', { graceMs: 5000 }); for (let i = 0; i < 20; i++) { A.e.step(2); B.e.step(2); await tick(); }
  t.ok(A.game.session.results && B.game.session.results, 'both windows get results'); t.eq(A.game.session.results.standings, B.game.session.results.standings, 'the same standings');
  t.eq(A.game.session.results.standings[0], [1], 'the guest wins with the bank');
  A.game.flow.lobby?.close(); B.game.flow.lobby?.close();
  // two real windows of one browser context on file://
  process.env.PLAYWRIGHT_HOST_PLATFORM_OVERRIDE ||= 'ubuntu24.04-x64';
  const br = await chromium.launch({ args: CHROME_FLAGS });
  try {
    const ctx = await br.newContext({ viewport: { width: 480, height: 270 } }); const pa = await ctx.newPage(), pb = await ctx.newPage();
    const spin = (p, n) => p.evaluate((k) => { window.__PIXEL_ENGINE__.step(k); }, n);
    for (const p of [pa, pb]) { await p.goto('file://' + GAME_HTML); await p.evaluate(() => window.__PIXEL_READY__.then(() => { window.__PIXEL_ENGINE__.manual = true; return true; })); }
    await pa.evaluate(() => { window.__GAME__.flow.startRound('host'); }); await pb.evaluate(() => { window.__GAME__.flow.startRound('join'); });
    let joined = false; for (let i = 0; i < 60 && !joined; i++) { await spin(pa, 3); await spin(pb, 40); await pa.waitForTimeout(100); joined = await pa.evaluate(() => !!(window.__GAME__.flow.lobby && window.__GAME__.flow.lobby.joined)); }
    t.ok(joined, 'two browser windows find each other');
    if (joined) {
      await pa.evaluate(() => { const g = window.__GAME__; g.ui.screen.items(g)[0].run(g, g.ui); });
      let both = false; for (let i = 0; i < 40 && !both; i++) { await spin(pb, 3); await spin(pa, 3); await pb.waitForTimeout(100); both = await pb.evaluate(() => !!window.__GAME__.round); }
      t.ok(both, 'the second window starts the round from the host\'s start');
    }
  } finally { await br.close(); }
}
