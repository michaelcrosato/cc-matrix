// A screenshot tour of the built game: every screen, one browser, errors collected.
// node tools/tour.mjs [filter] [WxH]   -> test-output/tour/<name>.png
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from './build.mjs';

const DEV = join(dirname(fileURLToPath(import.meta.url)), '..');
const filter = process.argv[2] && process.argv[2] !== 'all' ? new RegExp(process.argv[2]) : null, size = process.argv[3] || '1280x720';
if (!process.env.NOBUILD) build();
const html = join(DEV, '..', basename(DEV) + '.html'), out = join(DEV, 'test-output/tour'); mkdirSync(out, { recursive: true });
const T = 'G.debugTools';
export const STOPS = [
  ['title', '', 1500], ['menu', "game.go('menu', null, { fade: 0 })", 800],
  ['exhibition', `${T}.goto('exhibition')`, 800], ['howto', "game.go('howto', { from: 'menu' }, { fade: 0 })", 800], ['about', "game.go('about', { from: 'menu' }, { fade: 0 }); setTimeout(() => game.scene.turn(1), 50)", 800],
  ['invitation', "game.go('invitation', null, { fade: 0 })", 2500], ['charselect', "game.go('charselect', null, { fade: 0 })", 800],
  ['match-serve', `${T}.match({ seed: 5 })`, 6000], ['match-rally', `G.M.cpuControl = true`, 4000], ['match-servecam', `G.M.camMode = 'Serve Cam'`, 2500],
  ['match-night', `${T}.match({ seed: 6, cfg: { tod: 'night' } })`, 6000], ['match-results', `${T}.endMatch(true)`, 6000],
  ['map', `G.ensureState(); ${T}.setDay(2, 0); ${T}.goto('map')`, 1500], ['map-card', "game.scene.openCard()", 600], ['map-night', `${T}.setDay(2, 2); ${T}.goto('map')`, 1500],
  ['beach', `${T}.setDay(2, 0); ${T}.goto('location', { loc: 'beach' })`, 1500], ['beach-talk', "const n = game.scene.npcs.find(q => !q.staff); n && game.scene.openTalk(n)", 1200], ['beach-board', "game.scene.ui = null; game.scene.openBoard()", 600],
  ['pool', `${T}.goto('location', { loc: 'pool' })`, 1500], ['promenade', `${T}.goto('location', { loc: 'promenade' })`, 1500], ['villa', `${T}.goto('location', { loc: 'villa' })`, 1500],
  ['casino-floor', `${T}.setDay(2, 2); ${T}.goto('location', { loc: 'casino' })`, 2500], ['slots', `${T}.goto('casino', { station: 'slots' })`, 800], ['blackjack', `${T}.goto('casino', { station: 'blackjack' }); setTimeout(() => game.input.tap('confirm'), 100)`, 900], ['roulette', `${T}.goto('casino', { station: 'roulette' })`, 800],
  ['shop', `${T}.goto('shop', { shop: 'coral', from: 'promenade' })`, 900], ['wardrobe', `${T}.goto('wardrobe', { from: 'villa' })`, 900], ['journal', `${T}.goto('journal', { from: 'villa' })`, 900],
  ['poolhop', `${T}.goto('poolhop', {}); setTimeout(() => game.scene.auto = true, 50)`, 5000], ['dayend', `${T}.goto('dayend')`, 1200],
  ['arrival', `G.state = null; G.ensureState('amara'); G.runCutscene('arrival')`, 3000], ['party', `${T}.story('party')`, 4000],
  ['photo', `${T}.setDay(2, 1); ${T}.goto('location', { loc: 'pool' }); setTimeout(() => G.photo.open(), 600)`, 1500], ['album', `${T}.goto('album', { from: 'menu' })`, 900],
  ['dev', `${T}.goto('location', { loc: 'beach' }); setTimeout(() => G.devPanel.open(), 400)`, 900], ['dev-tuning', "G.devPanel.ov.tab = 5", 500],
  ['final', `G.state = null; G.ensureState('rin'); ${T}.story('final')`, 9000], ['final-glare', "G.M.cpuControl = true", 9000],
  ['rain', `${T}.setDay(3, 1); ${T}.vacationMatch('normal')`, 8000], ['tutorial', `G.state = null; G.ensureState('mei'); ${T}.vacationMatch('tutorial')`, 9000],
  ['exh4', `${T}.goto('exhibition'); setTimeout(() => { game.addPlayer({ keys: 'right' }); game.addPlayer({ pad: 1 }); game.addPlayer({ pad: 2 }); const sc = game.scene; let n = 2; for (const s of sc.slots) if (!s.who) { s.who = n; sc.joined.add(n); n++; } }, 200)`, 1200],
  ['pause', `G.dropPlayers(); ${T}.goto('location', { loc: 'beach' }); setTimeout(() => game.pause('player'), 600)`, 1200], ['save', "game.resume(); G.saveMenu()", 1200], ['xbox', "G.ui.shell && G.ui.shell.hide && G.ui.shell.hide(); game.settings.set('glyphs', 'xbox'); game.input.lastDevice = 'gamepad'; G.useInput('EXPLORE')", 800],
  ['credits', `${T}.goto('credits')`, 2500], ['vresults', `${T}.goto('vresults')`, 1200], ['attract', `G.dev && G.devPanel.ov && G.devPanel.close(); game.go('title', null, { fade: 0 }); setTimeout(() => G.startAttract(), 300)`, 6000]
];
const [w, h] = size.split('x').map(Number);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h } });
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await page.goto(pathToFileURL(html).href);
await page.waitForFunction(() => window.AOA && window.AOA.game && window.AOA.game.sceneName, null, { timeout: 30000 });
await page.waitForTimeout(800);
let seen = 0;
for (const [name, code, wait] of STOPS) {
  if (filter && !filter.test(name)) { if (code && /goto|match|story|runCutscene|startAttract|setDay|ensureState/.test(code) === false) continue; }
  const r = await page.evaluate(c => { try { const G = window.AOA, game = G.game; eval(c); return ''; } catch (e) { return 'ERR ' + e.message; } }, code);
  if (r) errs.push(name + ': ' + r);
  await page.waitForTimeout(wait);
  if (!filter || filter.test(name)) { await page.screenshot({ path: join(out, name + '.png') }); seen++; }
  const ge = await page.evaluate(() => (window.AOA.game.errors || []).splice(0).map(e => (e.where || '') + ' ' + e.message));
  for (const e of ge) errs.push(name + ': ' + e);
}
await browser.close();
console.log(seen + ' screens; ' + (errs.length ? errs.length + ' errors:\n' + [...new Set(errs)].slice(0, 25).join('\n') : 'no errors'));
