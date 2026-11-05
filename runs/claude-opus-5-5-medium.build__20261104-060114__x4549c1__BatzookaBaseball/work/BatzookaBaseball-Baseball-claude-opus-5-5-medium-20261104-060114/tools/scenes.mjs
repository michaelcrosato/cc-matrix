// Scenario screenshots (the look, framing and readability: what a script can't judge). node tools/scenes.mjs [names...]
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
const FILE = resolve('../BatzookaBaseball-Baseball-claude-opus-5-5-medium-20261104-060114.html'), OUT = '.tmp/shots';
mkdirSync(OUT, { recursive: true });
const want = process.argv.slice(2);
const S = {
  homer: ['match/kernel', [[2500], ['js', () => { const M = My3D2dge.current.debug.M(); M.cheats.autoplay = true; M.force = { homer: true, contact: 'perfect' }; }], ['js', () => { const M = My3D2dge.current.debug.M(); M.cheats.allStrikes = true; }], [1500], ['wait'], [100, 'hr1'], [700, 'hr2'], [1300, 'hr3'], [2500, 'hr4']]],
  play: ['match/caldera', [[2500], ['js', () => { const M = My3D2dge.current.debug.M(); M.cheats.autoplay = true; M.force = { contact: 'perfect' }; }], ['wait'], [300, 'pl1'], [900, 'pl2'], [1200, 'pl3']]],
  moon: ['match/tranquility', [[3500, 'moon1'], ['js', () => { My3D2dge.current.debug.M().cheats.autoplay = true; }], [3000, 'moon2']]],
  bone: ['match/boneyard', [[3500, 'bone1']]],
  mega: ['match/megadome', [[3500, 'mega1']]],
  rhubarb: ['match/caldera', [[2500], ['js', () => { const g = My3D2dge.current; g.debug.M().cheats.autoplay = true; g.debug.fns.startRhubarb(null, null); }], [2500, 'rh1'], [3000, 'rh2']]],
  dev: ['match/kernel', [[2500], ['js', () => { My3D2dge.current.debug.fns.devOpen(); }], [400, 'dev1'], ['js', () => { BZ.dev.tab = 2; }], [300, 'dev2']]],
  about: ['about', [[1500, 'about1'], ['key', 'ArrowRight'], [400, 'about2']]],
  tour: ['tour', [[1800, 'tourmap']]],
  club: ['clubhouse', [[1500, 'club']]],
  lessons: ['lessons', [[1500, 'lessons']]],
  derby: ['derby', [[4500, 'derby1']]],
  attract: ['attract', [[3000, 'att1'], [9000, 'att2']]],
  hub: ['hubcard', [[1500, 'hubcard']]],
  touch: ['touch', [[1500, 'touch']]],
  gallery: ['gallery', [[2000, 'gallery']]],
  results: ['match/kernel', [[2000], ['js', () => { const M = My3D2dge.current.debug.M(); M.teams[0].runs = 5; M.over = true; M.winner = 0; M.innings = 1; M.phase = 'halfEnd'; M.phaseT = 99; M.half = 1; }], [3500, 'results']]],
  ts: ['teamSelect', [[1500, 'ts']]],
  story: ['title', [[800], ['js', () => { BZ.newTour(); }], [1800, 'story']]],
  pad: ['match/kernel', [[3000], ['js', () => { const g = My3D2dge.current; g.input.lastDevice = 'gamepad'; }], [200, 'padps'], ['js', () => { const g = My3D2dge.current; g.settings.set('glyphs', 'xbox'); g.input.lastDevice = 'gamepad'; }], [200, 'padxb'], ['js', () => { const g = My3D2dge.current; g.settings.set('glyphs', 'playstation'); }]]],
  pitch: ['match/barnacle', [[2000], ['js', () => { const g = My3D2dge.current, M = g.debug.M(); M.teams.forEach(t => { t.ctrl.cap = null; }); M.teams[1].ctrl.cap = g.input; }], [2500, 'pitch1'], ['key', 'KeyK'], [500, 'pitch2']]]
};
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const [name, [hash, steps]] of Object.entries(S)) {
  if (want.length && !want.includes(name)) continue;
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(pathToFileURL(FILE).href + '#' + hash);
  for (const st of steps) {
    if (st[0] === 'js') await page.evaluate(st[1]);
    else if (st[0] === 'wait') await page.waitForFunction(() => { const M = My3D2dge.current.debug.M(); return M && M.ball && M.phase === 'inPlay' || M && M.phase === 'homer'; }, null, { timeout: 30000 }).catch(() => {});
    else if (st[0] === 'key') await page.keyboard.press(st[1]);
    else { await page.waitForTimeout(st[0]); if (st[1]) await page.screenshot({ path: OUT + '/' + st[1] + '.png' }); }
  }
  const ge = await page.evaluate(() => My3D2dge.current.errors.map(e => e.where + ': ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  for (const e of ge.concat(errs)) console.log(name, 'ERR', e);
  await page.close();
}
await browser.close();
