// Browser smoke: the dev page (and the bundle, when it exists) in Chromium over file://. Walks every screen and fails on any page error.
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..'), root = dirname(here);
const bundle = readdirSync(root).find(f => f.endsWith('.html') && f.startsWith('AmericanFootballFiasco'));
const targets = [resolve(here, 'index.html')]; if (bundle) targets.push(resolve(root, bundle));
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
let bad = 0;
for (const file of targets) {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } }); const errors = [];
  page.on('pageerror', e => errors.push(String(e && e.stack || e))); page.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && m.text().startsWith('my-3D2dge'))) errors.push(m.text()); });
  await page.goto(pathToFileURL(file).href); await page.waitForTimeout(1200);
  const run = async (js, ms = 500) => { try { await page.evaluate(js); } catch (e) { errors.push('eval: ' + e.message); } await page.waitForTimeout(ms); };
  for (const p of ['exh', 'story', 'drills', 'records', 'about']) await run(`FF.game.go('title',{page:'${p}'})`, 450);
  await run(`FF.game.go('title',{page:'main'})`, 300);
  await run(`FF.startStory(0)`, 600); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  await run(`FF.game.go('match',{mode:'exh',home:'fiascos',away:'nightmares',stadium:'neon',humans:[true,false],quarters:4,qlen:60,boss:'blackout'})`, 800);
  await page.keyboard.press('Enter'); await page.waitForTimeout(300); await page.keyboard.press('Space'); await page.waitForTimeout(700);
  await run(`FF.S.lightsOut = 1`, 400);
  await page.keyboard.down('KeyD'); await page.keyboard.down('ShiftLeft'); await page.waitForTimeout(1500); await page.keyboard.up('KeyD'); await page.keyboard.up('ShiftLeft');
  await run(`FF.S.M.devCard(0,'bolt'); FF.openDev && 0`, 300); await page.keyboard.press('KeyI'); await page.waitForTimeout(800);
  await run(`FF.S.M.toCall(); FF.S.M.poss=0; FF.S.M.los=1000; FF.S.M.chooseOff('fg')`, 1800); await page.keyboard.press('Space'); await page.waitForTimeout(500); await page.keyboard.press('Space'); await page.waitForTimeout(1500);
  await run(`FF.S.M.toCall(); FF.S.M.devCard(0,'mascot'); FF.S.M.chooseOff('slants'); FF.S.M.chooseDef('blitz')`, 400); await page.keyboard.press('Space'); await page.waitForTimeout(1500);
  await run(`FF.openDev()`, 500); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await run(`FF.S.M.clock = 0; FF.S.M.q = 2; FF.S.M.toCall(); FF.S.M.endQuarter()`, 1500);
  await run(`FF.game.go('match',{mode:'attract',home:'sharks',away:'devils',stadium:'pier',humans:[false,false],quarters:2,qlen:30})`, 3000);
  await run(`FF.game.go('match',{mode:'drill',drill:0,autoCall:true,noClock:true,home:'fiascos',away:'devils',stadium:'junction',humans:[true,false],quarters:4,qlen:99,start:{poss:0,los:500}})`, 2500);
  await run(`FF.game.go('results',{cfg:{mode:'exh',humans:[true,false]},M:{score:[21,14],winner:0,stats:[{yards:200,passes:10,comps:6,hits:3,tds:3,sacks:1,fumbles:1,ints:0},{yards:150,passes:9,comps:4,hits:2,tds:2,sacks:0,fumbles:0,ints:1}],teams:['fiascos','bruisers'],longest:42,q:4}})`, 800);
  const info = await page.evaluate(() => ({ scene: My3D2dge.current.sceneName, errs: My3D2dge.current.errors.map(e => e.message) }));
  if (info.errs.length) errors.push('engine errors: ' + info.errs.join(' | '));
  if (errors.length) { bad++; console.log('BROWSER FAIL ' + file.split('/').pop() + ':\n' + errors.slice(0, 5).join('\n---\n')); }
  await page.close();
}
await browser.close(); process.exit(bad ? 1 : 0);
