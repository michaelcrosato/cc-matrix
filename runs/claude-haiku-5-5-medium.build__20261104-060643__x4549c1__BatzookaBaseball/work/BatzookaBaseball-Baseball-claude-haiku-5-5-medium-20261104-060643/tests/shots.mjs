// Screenshots of the states a script can't judge: node tests/shots.mjs [outdir]. It opens the built dev page in Chromium
// (Playwright, from the engine's install), warps into a match, and captures each phase of an at-bat and a field play.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] || join(root, 'check-output'));
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(pathToFileURL(join(root, 'index.html')).href + '#attract');
await page.waitForFunction(() => window.My3D2dge && My3D2dge.current && My3D2dge.current.debug, null, { timeout: 60000 });
await page.evaluate(() => My3D2dge.current.debug.warp('match', { human: [false, true] }));
const phase = () => page.evaluate(() => My3D2dge.current.debug.snapshot().phase);
const shot = async name => { await page.screenshot({ path: join(out, name + '.png') }); console.log('shot', name, await phase()); };
const until = async (cond, name) => {
  await page.waitForFunction(c => { const s = My3D2dge.current.debug.snapshot(); return eval(c); }, cond, { timeout: 60000, polling: 50 });
  await shot(name);
};
await until("s.phase === 'ready'", 'a-ready');
await page.evaluate(() => { const g = My3D2dge.current; g.input.tap && g.input.tap('confirm'); });
await until("s.phase === 'meter'", 'b-meter');
await page.evaluate(() => My3D2dge.current.input.tap('confirm'));
await until("s.phase === 'pitch'", 'c-pitch');
await page.waitForTimeout(250);
await shot('c2-pitch-late');
await until("s.phase === 'inplay' || s.phase === 'after'", 'd-after-pitch');
await page.waitForTimeout(1500);
await shot('e-play');
// the derby: join, begin, and a pitch in flight, then the ball's flight over the field
await page.evaluate(() => My3D2dge.current.debug.warp('derby'));
await page.waitForTimeout(600);
await page.evaluate(() => My3D2dge.current.input.tap('confirm'));
await page.waitForFunction(() => My3D2dge.current.debug.snapshot().scene === 'derby', null, { timeout: 20000 });
try {
  await page.waitForFunction(() => { const D = My3D2dge.current.debug.BZ.D; return D && D.round && D.round.plan && D.round.pt > .3; }, null, { timeout: 30000, polling: 50 });
} catch (e) {
  const st = await page.evaluate(() => { const g = My3D2dge.current, D = g.debug.BZ.D; return { scene: g.sceneName, errors: g.errors.map(x => String(x.message || x)).slice(0, 3), D: D ? { phase: D.phase, hasRound: !!D.round, clock: D.clock, players: D.players.length, finished: D.finished } : null }; });
  console.log('derby did not start:', JSON.stringify(st));
  await browser.close();
  process.exit(1);
}
await page.screenshot({ path: join(out, 'f-derby-pitch.png') });
// swing at the plate: wait for the pitch's arrival window, press confirm, then wait for the ball
await page.waitForFunction(() => { const R = My3D2dge.current.debug.BZ.D.round; return R && R.plan && R.pt > R.plan.time - .05; }, null, { timeout: 30000, polling: 20 });
// aim the bat-head where the ball will cross (the stick would do this), then swing
await page.evaluate(() => { const B = My3D2dge.current.debug.BZ, R = B.D.round, p = B.plateLoc(R.plan); R.reticle = { lat: p.lat, h: p.h }; My3D2dge.current.input.tap('confirm'); });
await page.waitForFunction(() => { const D = My3D2dge.current.debug.BZ.D; return D && D.round && D.round.ball; }, null, { timeout: 10000, polling: 20 });
await page.waitForTimeout(700);
await page.screenshot({ path: join(out, 'g-derby-ball.png') });
console.log('errors:', errors.length ? errors.slice(0, 3) : 'none');
await browser.close();
