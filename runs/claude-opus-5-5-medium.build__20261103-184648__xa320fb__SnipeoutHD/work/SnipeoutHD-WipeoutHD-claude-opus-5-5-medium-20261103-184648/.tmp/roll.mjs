// place the player on Karakum's 28-degree spiral (right-hand) and shoot chase and cockpit views
import { chromium } from 'playwright';
const url = 'file://' + process.cwd() + '/../SnipeoutHD-WipeoutHD-claude-opus-5-5-medium-20261103-184648.html?backend=webgl';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); const logs = []; page.on('pageerror', e => logs.push(e.message));
await page.goto(url); await page.waitForFunction(() => window.__game && window.__game.sceneName === 'title', null, { timeout: 60000 });
await page.evaluate(() => window.__game.go('loading', { setup: { mode: 'timetrial', track: 'karakum', cls: 'spark', team: 'kestrel', pilot: 'ingrid', laps: 3, intro: false } }));
await page.waitForFunction(() => window.__game.sceneName === 'race' && SN.scenes.race.race.state === 'racing', null, { timeout: 60000 });
await page.evaluate(() => { const R = SN.scenes.race.race, T = R.track, me = R.humans[0], s = (T.knots[16] + T.knots[17]) / 2; SN.Ship.place(me, R, s, 0, 900); me.p = s; me._lastS = s; R.getHuman = sh => SN.AI.controls(sh, R, { skill: 1, stateKey: 'bot' }); });
await page.waitForTimeout(2500); await page.screenshot({ path: 'tests/out/roll-chase.png' });
await page.evaluate(() => { SN.scenes.race.vw.cams[0].set('cockpit'); }); await page.waitForTimeout(1200); await page.screenshot({ path: 'tests/out/roll-cockpit.png' });
console.log(JSON.stringify(await page.evaluate(() => { const me = SN.scenes.race.race.humans[0], T = SN.scenes.race.race.track; return { bank: T.frameAt(me.s).bank, kappa: T.kappa[T.idx(me.s)], roll: SN.scenes.race.vw.world.camera.pose.roll }; })), logs.join('|'));
await browser.close();
