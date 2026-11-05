// Screenshots of the screens (PLAN §12.3 'screens'): fails only on page errors, never on looks.
// node tests/browser/shots.mjs [out]  — opens the root bundle by file:// in Chromium at 1280x720.
import { chromium } from 'playwright';
const root = new URL('../../../', import.meta.url), out = process.argv[2] || new URL('../../.cache/shots/', import.meta.url).pathname;
const file = new URL('OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-opus-5-5-medium-20261104-035151.html', root).href;
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const requests = []; page.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) requests.push(r.url()); });
await page.goto(file); await page.waitForTimeout(1500);
const snap = () => page.evaluate(() => window.__ob.game.debug.snapshot());
const shot = async n => page.screenshot({ path: out + n + '.png' });
const go = (s, d) => page.evaluate(([s, d]) => window.__ob.game.go(s, d, { fade: 0 }), [s, d]);
const steps = (process.env.SHOTS || 'title,race,race2,love,night,fork,versus,ending,results,tour,garden,dev,radio,garage,trial,brief,about,hubcard').split(',');
for (const s of steps) {
  if (s === 'title') { await go('title'); await page.waitForTimeout(600); }
  if (s === 'race') { await go('race', { mode: 'arcade', car: 'orchidea', passenger: 'marisol', bot: {} }); await page.waitForTimeout(9000); }
  if (s === 'race2') { await page.evaluate(() => window.__ob.game.debug.teleport('S3', .3)); await page.waitForTimeout(2500); }
  if (s === 'love') { await go('race', { mode: 'love', startStage: 'S1', car: 'gardenia', passenger: 'juni', bot: {}, startline: false }); await page.waitForTimeout(500); await page.evaluate(() => { const O = window.__ob.OB; O.race.teleport(O.race.p1, 'S1', 120 * 200, 230); }); await page.waitForTimeout(6000); }
  if (s === 'night') { await go('race', { mode: 'arcade', startStage: 'S13', car: 'magnolia', passenger: 'vivi', bot: {}, startline: false }); await page.waitForTimeout(500); await page.evaluate(() => window.__ob.game.debug.teleport('S13', .3)); await page.waitForTimeout(3000); }
  if (s === 'fork') { await go('race', { mode: 'arcade', startStage: 'S2', bot: { plan: ['R'] }, startline: false }); await page.waitForTimeout(500); await page.evaluate(() => { const O = window.__ob.OB, S = O.World.get('S2'); O.race.teleport(O.race.p1, 'S2', (S.juncStart - 30) * 200, 240); }); await page.waitForTimeout(1500); }
  if (s === 'versus') { await go('race', { mode: 'versus', players: 2, route: { stages: ['S1', 'S2', 'S5'], end: 'sprint' }, cars: [{ model: 'orchidea' }, { model: 'gardenia', passenger: 'juni' }], bots: [{}, {}] }); await page.waitForTimeout(8000); }
  if (s === 'ending') { await go('ending', { goal: 'C', mood: 'bloom', passenger: 'vivi', driver: 'leo', car: 'orchidea', finished: true, mode: 'arcade', score: 1000, stats: {}, cfg: { mode: 'arcade' } }); await page.waitForTimeout(7000); }
  if (s === 'results') { await go('results', { goal: 'C', mood: 'bloom', grade: 'AA', petals: 30, petalMax: 36, passenger: 'vivi', finished: true, mode: 'love', score: 123456, time: 250, route: 'LRRL', stats: { bestDrift: 5000, nearmiss: 4, slip: 12, overtakes: 30 }, cfg: { mode: 'love' } }); await page.waitForTimeout(1500); }
  if (s === 'tour') { await page.evaluate(() => { window.__ob.OB.Profile.p.seenIntro = true; }); await go('tour'); await page.waitForTimeout(800); }
  if (s === 'garden') { await go('garden'); await page.waitForTimeout(800); }
  if (s === 'dev') { await go('race', { mode: 'arcade' }); await page.waitForTimeout(1200); await page.evaluate(() => window.__ob.OB.Dev.open()); await page.waitForTimeout(600); }
  if (s === 'radio') { await page.evaluate(() => { window.__ob.OB.Dev.active = false; }); await go('radio', { mode: 'arcade' }); await page.waitForTimeout(800); }
  if (s === 'garage') { await go('garage', { mode: 'love' }); await page.waitForTimeout(800); }
  if (s === 'trial') { await go('trial'); await page.waitForTimeout(800); }
  if (s === 'brief') { await go('brief', { id: 'V3' }); await page.waitForTimeout(2500); }
  if (s === 'about') { await go('about'); await page.waitForTimeout(600); }
  if (s === 'love2') { await go('race', { mode: 'love', startStage: 'S2', car: 'orchidea', passenger: 'marisol', bot: { seek: true }, startline: false }); await page.waitForTimeout(400); await page.evaluate(() => { const O = window.__ob.OB; O.race.teleport(O.race.p1, 'S2', 150 * 200, 200); O.race.requests.start('balloons'); }); await page.waitForTimeout(2600); }
  if (s === 'split') { await go('race', { mode: 'arcade', startStage: 'S1', bot: { plan: ['L'] }, startline: false }); await page.waitForTimeout(400); await page.evaluate(() => { const O = window.__ob.OB, S = O.World.get('S1'); O.race.teleport(O.race.p1, 'S1', (S.juncStart + 10) * 200, 240, -.3); }); await page.waitForTimeout(900); }
  if (s === 'about2') { await go('about'); await page.waitForTimeout(400); await page.keyboard.press('KeyE'); await page.waitForTimeout(300); }
  if (s === 'hubcard') { await go('hubcard'); await page.waitForTimeout(800); }
  await shot(s);
}
const sn = await snap();
await browser.close();
if (errors.length) console.log('FAIL browser errors: ' + errors.slice(0, 5).join(' | '));
if (requests.length) console.log('FAIL network requests: ' + requests.slice(0, 3).join(' '));
console.log(errors.length || requests.length ? 'shots: failed' : 'shots: ' + steps.length + ' screens, errors ' + sn.errors);
