import { chromium } from 'playwright';
const url = 'file://' + process.cwd() + '/../SnipeoutHD-WipeoutHD-claude-opus-5-5-medium-20261103-184648.html?backend=webgl';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const errs = [];
const open = async (o = {}) => { const p = await (await browser.newContext(Object.assign({ viewport: { width: 1280, height: 720 } }, o))).newPage(); p.on('pageerror', e => errs.push(e.message)); if (o.init) await p.addInitScript(o.init); await p.goto(url); await p.waitForFunction(() => window.__game && window.__game.sceneName === 'title', null, { timeout: 90000 }); return p; };
const p = await open(), ev = f => p.evaluate(f), shot = n => p.screenshot({ path: 'tests/out/review-' + n + '.png' });
// Academy: the drill card, then a drill running
await ev(() => window.__game.go('loading', { setup: SN.Academy.setup() })); await p.waitForFunction(() => window.__game.sceneName === 'race', null, { timeout: 60000 }); await p.waitForTimeout(1500); await shot('academy-card');
await ev(() => { SN.Academy.phase = 'run'; SN.Academy.i = 1; SN.Academy.begin(); SN.Academy.phase = 'run'; const R = SN.scenes.race.race; R.getHuman = sh => SN.AI.controls(sh, R, { skill: 1, stateKey: 'bot', uAt: () => { const g = SN.Academy.gates.find(q => !q.done); return g ? g.u : null; } }); }); await p.waitForTimeout(2500); await shot('academy-gates');
// Season: briefing dialog with portrait, then a debrief after a medal on the hub
await ev(() => { window.__game.go('menu'); }); await p.waitForTimeout(1500);
await ev(() => { SN.save.data.started = true; SN.UI.push(SN.screens.season()); SN.Story.play('b_e4', () => {}); }); await p.waitForTimeout(2500); await shot('season-briefing');
await ev(() => { SN.Story.talk.open = false; SN.save.data.medals = { e1: 'gold', e2: 'silver', e3: 'bronze', e4: 'gold' }; SN.save.data.unlocked.classes = ['spark', 'flare']; }); await p.waitForTimeout(800); await shot('season-hub-medals');
await ev(() => { SN.Season.standings = () => SN.PILOTS.slice(0, 8).map((q, k) => ({ pilot: q.id, points: 40 - k * 5, place: k + 1 })); SN.save.data.gp.round = 2; SN.save.data.gp.points = {}; SN.save.data.gp.best = {}; SN.UI.push(SN.screens.gp()); }); await p.waitForTimeout(1500); await ev(() => { SN.Story.talk.open = false; }); await p.waitForTimeout(400); await shot('gp-standings');
// Dev mode: the panel from the pause menu, the world tab and the info tab
await ev(() => window.__game.go('loading', { setup: { mode: 'race', track: 'meridian', cls: 'storm', team: 'nullset', pilot: 'kaizero', laps: 3, intro: false } })); await p.waitForFunction(() => window.__game.sceneName === 'race' && SN.scenes.race.race.state === 'racing', null, { timeout: 90000 });
await ev(() => { SN.pauseItems().find(i => i[0] === 'Dev mode')[1](); SN.Dev.tab = 2; }); await p.waitForTimeout(800); await shot('dev-world');
await ev(() => { SN.Dev.tab = 3; }); await p.waitForTimeout(800); await shot('dev-info');
await ev(() => { SN.Dev.open = false; SN.Dev.overlay = true; }); await p.waitForTimeout(1500); await shot('dev-overlay'); await ev(() => { SN.Dev.overlay = false; });
// Attract mode
await ev(() => window.__game.go('title')); await p.waitForFunction(() => window.__game.sceneName === 'attract', null, { timeout: 90000 }); await p.waitForTimeout(9000); await shot('attract-race');
// touch-only phone
const t = await open({ hasTouch: true, isMobile: true, viewport: { width: 844, height: 390 }, init: () => { const mm = window.matchMedia.bind(window); window.matchMedia = q => /any-pointer: fine/.test(q) ? { matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q); } });
await t.waitForTimeout(1500); await t.screenshot({ path: 'tests/out/review-touch.png' });
console.log('page errors:', errs.length, errs.slice(0, 3).join(' | ')); await browser.close();
