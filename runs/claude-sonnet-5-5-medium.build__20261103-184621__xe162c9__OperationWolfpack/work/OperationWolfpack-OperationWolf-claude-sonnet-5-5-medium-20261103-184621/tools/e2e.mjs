// real keyboard and mouse through the built game: title -> start -> play -> pause menu -> dev mode
import { chromium } from 'playwright';
import { resolve } from 'node:path'; import { pathToFileURL } from 'node:url';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(pathToFileURL(resolve(process.argv[2])).href); await p.waitForTimeout(3500);
const sc = () => p.evaluate(() => WP.game.sceneName);
const log = async (what) => console.log(what.padEnd(34), await sc());
await log('boot');
await p.keyboard.press('Enter'); await p.waitForTimeout(500); await log('Enter on START');
for (let i = 0; i < 3 && (await sc()) === 'briefing'; i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(400); }
await p.waitForTimeout(3200); await log('after briefing and op card');
await p.mouse.move(600, 260); await p.mouse.down(); await p.waitForTimeout(3000);
console.log('shots fired', await p.evaluate(() => WP.G.sim.stats.shotsFired), 'mouse crosshair', await p.evaluate(() => [Math.round(WP.G.aim[0].x), Math.round(WP.G.aim[0].y)]));
await p.mouse.up();
await p.keyboard.down('KeyD'); await p.waitForTimeout(500); await p.keyboard.up('KeyD');
console.log('keyboard aim moved to', await p.evaluate(() => [Math.round(WP.G.aim[0].x), Math.round(WP.G.aim[0].y)]));
await p.keyboard.press('Escape'); await p.waitForTimeout(800); await p.screenshot({ path: 'shots/e2e-pause.png' });
console.log('paused', await p.evaluate(() => WP.game.paused));
// the pause menu: click the Dev mode entry (find by text through the DOM)
const clicked = await p.evaluate(() => { const els = [...document.querySelectorAll('button, li, div, span, a')].filter(e => /dev mode/i.test(e.textContent) && e.children.length === 0); if (els[0]) { els[0].click(); return els[0].tagName; } return null; });
console.log('dev mode entry clicked in DOM:', clicked);
await p.waitForTimeout(800); console.log('dev open', await p.evaluate(() => WP.dev.open)); await p.screenshot({ path: 'shots/e2e-dev.png' });
console.log(errs.length ? 'ERRORS:\n' + errs.slice(0, 5).join('\n') : 'no errors'); await b.close();
