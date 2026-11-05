// Screen flow: opens the single HTML in Chromium, visits every scene (through the game's own scene change), presses a few
// keys in play, opens the pause menu and the dev panel, and reports any page or game error. Screenshots go to check-output/.
// Usage: node tools/flow.mjs
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const file = resolve(root, '..', 'SublimeCrisis3-TimeCrisis3-claude-haiku-5-5-medium-20261103-183312.html');
if (!existsSync(file)) { console.log('FAIL missing ' + file); process.exit(1); }
const out = join(root, 'check-output');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
await page.waitForFunction(() => window.TC && TC.game && TC.game.scene, null, { timeout: 60000 });
await page.waitForTimeout(800);
const scene = () => page.evaluate(() => TC.game.scene && (TC.game.scene.name || TC.game.sceneName || TC.game.sceneId || ''));
const go = async (name, data) => { await page.evaluate(([n, d]) => TC.game.go(n, d, { fade: 0 }), [name, data || null]); await page.waitForTimeout(500); };
const shot = async (name) => { await page.screenshot({ path: join(out, name + '.png') }); };

await shot('flow-title');
for (const s of ['menu', 'difficulty', 'select', 'records', 'about', 'howto']) {
  await go(s);
  await shot('flow-' + s);
}
// The briefing and play for arcade stage 1 (the stage intro's dialog), then fire and cover.
await page.evaluate(() => { TC.current.mode = 'arcade'; TC.current.stage = 1; TC.current.difficulty = 'Normal'; });
await go('briefing', { stage: 1 });
await shot('flow-briefing');
await page.keyboard.press('Enter');
await page.waitForTimeout(1500);
await shot('flow-play-intro');
await page.evaluate(() => { if (TC.current.play && TC.current.play.dialog) { for (let i = 0; i < 40; i++) TC.current.play.dialog.close && TC.current.play.dialog.close(); } });
await page.waitForTimeout(400);
for (let i = 0; i < 8; i++) {
  await page.keyboard.down('Space'); await page.waitForTimeout(150); await page.keyboard.up('Space');
  await page.keyboard.press('KeyR');
  await page.keyboard.down('KeyZ'); await page.waitForTimeout(120); await page.keyboard.up('KeyZ');
  await page.waitForTimeout(300);
}
await page.keyboard.press('KeyE');
await page.waitForTimeout(300);
await shot('flow-play');
// The pause menu, then the dev panel.
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
await shot('flow-pause');
await page.evaluate(() => TC.Dev.openFrom(TC.game));
await page.waitForTimeout(500);
await shot('flow-dev');
await page.evaluate(() => { TC.Dev.close(); });
await page.waitForTimeout(200);
// Results and game over, from a finished result in the sim.
await go('results', { result: { won: true, stage: 1, difficulty: 'Normal', rows: [{ id: 0, name: 'P1', score: 12345, rank: 'A', acc: 66, shots: 40, hits: 26, kills: 9, headshots: 2, quick: 1, saves: 4, lost: 1, civ: 0, bestChain: 7, continues: 0, accBonus: 19800, noDamage: 0, total: 32145, time: 180 }], intel: [] }, next: true });
await page.waitForTimeout(1500);
await shot('flow-results');
await go('gameover', { result: { won: false, stage: 1, difficulty: 'Normal', rows: [{ id: 0, name: 'P1', score: 800, rank: 'C', acc: 20, shots: 10, hits: 2, kills: 1, headshots: 0, quick: 0, saves: 0, lost: 5, civ: 0, bestChain: 1, continues: 0, accBonus: 0, noDamage: 0, total: 800, time: 60 }], intel: [] } });
await page.waitForTimeout(800);
await shot('flow-gameover');
// Attract: after 10 s idle at the title, the attract scene runs; any key goes back.
await go('title');
await page.waitForTimeout(10800);
const sc = await page.evaluate(() => TC.game.scene && (TC.game.scene.name || TC.game.sceneName || ''));
await page.waitForTimeout(1200);
await shot('flow-attract');
await page.keyboard.press('KeyA');
await page.waitForTimeout(600);
const sc2 = await page.evaluate(() => TC.game.scene && (TC.game.scene.name || TC.game.sceneName || ''));
const info = await page.evaluate(() => ({ dialog: !!(TC.current.play && TC.current.play.dialog), errors: (TC.game.errors || []).length }));
await browser.close();
for (const e of errors.slice(0, 20)) console.log(e);
console.log(`scene after 10 s idle: ${JSON.stringify(sc)}; after a key: ${JSON.stringify(sc2)}; ${JSON.stringify(info)}`);
console.log(errors.length ? `${errors.length} error(s)` : 'flow ok');
process.exit(errors.length ? 1 : 0);
