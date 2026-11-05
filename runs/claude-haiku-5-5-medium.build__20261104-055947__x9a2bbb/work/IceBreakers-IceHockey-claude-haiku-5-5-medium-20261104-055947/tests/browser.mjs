// The browser smoke test: loads every scene by its deep link in Chromium (headless), lets it draw for a moment, and fails
// on any error the page reports. Headless Node skips drawing, so this is where the screens are checked. Exit code 1 on a
// failure. It serves the built HTML from a loopback port the OS picks, and stops the server when it is done.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = process.env.GAME_HTML || join(root, '..', 'IceBreakers-IceHockey-claude-haiku-5-5-medium-20261104-055947.html');
const html = readFileSync(htmlPath, 'utf8');
const server = createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port + '/' + basename(htmlPath);
const SCENES = ['title', 'attract', 'setup', 'story', 'cutscene', 'practice', 'records', 'about', 'dev', 'credits', 'results', 'match', 'flood', 'lab'];
let fail = 0, pass = 0;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  for (const name of SCENES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(base + '#' + name, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const title = await page.title();
    if (errors.length || title !== 'Ice Breakers') { fail++; console.log('FAIL ' + name + ': ' + (errors.slice(0, 2).join(' | ') || 'title ' + title)); } else pass++;
    await page.close();
  }
  // a player's keys in a match: the skater moves when the stick is held, and the pass key does not throw
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '#match', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const before = await page.evaluate(() => { const s = window.__game.game.debug.snapshot(); return s.skaters.filter(k => k.human)[0] || null; });
  await page.keyboard.down('KeyD'); await page.waitForTimeout(900); await page.keyboard.up('KeyD');
  await page.keyboard.press('KeyJ'); await page.waitForTimeout(300);
  const after = await page.evaluate(() => window.__game.game.debug.snapshot());
  const you = after.skaters.filter(k => k.human)[0];
  if (!before || !you) { fail++; console.log('FAIL match: no player is on the ice'); }
  else if (Math.abs(you.x - before.x) < 5 && Math.abs(you.y - before.y) < 5) { fail++; console.log('FAIL match: the keys did not move the player'); }
  else pass++;
  if (errors.length) { fail++; console.log('FAIL keys: ' + errors.slice(0, 2).join(' | ')); } else pass++;
  await page.close();
  // every arena draws: the pond's thin ice and snowbanks, the Dome's mascot and crate, the Lumber Yard's octopus and rat
  const ap = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const aerr = [];
  ap.on('pageerror', e => aerr.push(e.message));
  await ap.goto(base + '#match', { waitUntil: 'load' });
  await ap.waitForTimeout(800);
  for (const arena of [0, 1, 2, 3, 4]) {
    await ap.evaluate(a => window.__game.game.go('match', { cfg: { teams: [0, 1], arena: a, humans: 0, seed: 7 + a, mode: 'exhibition' } }, { fade: 0 }), arena);
    await ap.waitForTimeout(1500);
  }
  if (aerr.length) { fail++; console.log('FAIL arenas: ' + aerr.slice(0, 2).join(' | ')); } else pass++;
  await ap.close();
  // a fight, drawn: the gloves drop in a live match, the round's picks and the HUD draw without error
  const fp = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const ferr = [];
  fp.on('pageerror', e => ferr.push(e.message));
  await fp.goto(base + '#match', { waitUntil: 'load' });
  await fp.waitForTimeout(1200);
  await fp.evaluate(() => { const sk = window.__game.M().skaters; window.__game.sim.fightStart(sk[0], sk[3]); });
  await fp.keyboard.press('KeyK'); await fp.waitForTimeout(2500);
  const fightState = await fp.evaluate(() => window.__game.game.debug.snapshot().fight);
  if (ferr.length || fightState === null) { fail++; console.log('FAIL fight: ' + (ferr.slice(0, 2).join(' | ') || 'no fight state')); } else pass++;
  await fp.close();
  // the camera: V changes the view (the broadcast, then the overhead one)
  const vp = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await vp.goto(base + '#match', { waitUntil: 'load' });
  await vp.waitForTimeout(1200);
  const v0 = await vp.evaluate(() => window.__game.game.view.label || window.__game.game.view.name || String(window.__game.game.view.pitch));
  await vp.keyboard.press('KeyV'); await vp.waitForTimeout(400);
  const v1 = await vp.evaluate(() => window.__game.game.view.label || window.__game.game.view.name || String(window.__game.game.view.pitch));
  if (v0 !== v1) pass++; else { fail++; console.log('FAIL camera: V did not change the view (' + v0 + ')'); }
  await vp.close();
  // the pause menu's Dev Mode opens the dev sliders
  const pg = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const perr = [];
  pg.on('pageerror', e => perr.push(e.message));
  await pg.goto(base + '#match', { waitUntil: 'load' });
  await pg.waitForTimeout(1200);
  await pg.keyboard.press('Escape');
  await pg.waitForTimeout(400);
  const devItem = pg.getByText('Dev Mode', { exact: true });
  if (await devItem.count()) { await devItem.first().click(); await pg.waitForTimeout(800); }
  const sceneNow = await pg.evaluate(() => window.__game.game.sceneName);
  if (sceneNow === 'dev') pass++; else { fail++; console.log('FAIL pause menu: Dev Mode did not open the dev sliders (scene ' + sceneNow + ', menu item found: ' + (await devItem.count()) + ')'); }
  await pg.close();
  // keyboard join: the 2 key adds a second player to the set-up screen
  const jp = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await jp.goto(base + '#setup', { waitUntil: 'load' });
  await jp.waitForTimeout(1200);
  await jp.keyboard.press('Digit2');
  await jp.waitForTimeout(400);
  const joined = await jp.evaluate(() => window.__game.game.players.length);
  if (joined >= 2) pass++; else { fail++; console.log('FAIL keyboard join: ' + joined + ' player(s) after pressing 2'); }
  await jp.close();
  // a touch-only device: the notice is on the title (the scene runs; the touch screen says so)
  const tctx = await browser.newContext({ viewport: { width: 800, height: 400 }, isMobile: true, hasTouch: true });
  const tp = await tctx.newPage();
  await tp.goto(base, { waitUntil: 'load' });
  await tp.waitForTimeout(1200);
  const tonly = await tp.evaluate(() => window.__game.touchOnly);
  if (tonly === true) pass++; else { fail++; console.log('FAIL touch-only: the device was not seen as touch-only (' + tonly + ')'); }
  await tctx.close();
  void perr;
} finally {
  await browser.close();
  server.close();
}
console.log(fail ? `${pass} browser checks passed, ${fail} failed` : `all ${pass} browser checks passed`);
process.exit(fail ? 1 : 0);
