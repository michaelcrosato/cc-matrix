// Browser pass: drives the real page through every screen, saves screenshots, prints only errors and a count.
import { chromium } from '../../engine/node_modules/playwright/index.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url'; import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = path.resolve(root, '..', path.basename(root) + '.html');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 300))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
await page.goto(pathToFileURL(html).href); await page.waitForTimeout(1500);
const shots = [
  ['b_newgame', "DQ.ui.open('newgame')"],
  ['b_about', "DQ.ui.closeAll(); DQ.ui.open('info',{title:'About',lines:DQ.aboutLines()})"],
  ['b_play', "DQ.ui.closeAll(); DQ.game.go('play',{new:true,name:'Tester'})", 1500, "DQ.talk.close()"],
  ['b_beat', "DQ.devBeat('siege'); DQ.talk.close(); DQ.S.cut=null; DQ.ui.closeAll()", 2500, "DQ.talk.close()"],
  ['b_satchel', "DQ.ui.open('satchel',{})"],
  ['b_craft', "DQ.ui.top().setTab(1)"],
  ['b_journal', "DQ.ui.top().setTab(2)"],
  ['b_map', "DQ.ui.top().setTab(3)"],
  ['b_banner', "DQ.ui.closeAll(); DQ.ui.open('banner')"],
  ['b_dev', "DQ.ui.closeAll(); DQ.openDev()"],
  ['b_chest', "DQ.ui.closeAll(); const c=DQ.S.world.addObj('chest',40,50,{}); c.items=[{id:'plank',n:5}]; DQ.ui.open('chest',{obj:c})"],
  ['b_travel', "DQ.ui.closeAll(); DQ.S.stats.discovered={portalCrags:1,portalPlaza:1}; DQ.ui.open('travel',{from:DQ.S.world.list.find(o=>o.type==='portal')})"],
  ['b_station', "DQ.ui.closeAll(); DQ.ui.open('craft',{station:'forge'})"],
  ['b_results', "DQ.ui.closeAll(); DQ.ui.open('results',{})"],
  ['b_boss', "DQ.ui.closeAll(); DQ.startCutscene('buttons'); DQ.S.hero.x=DQ.cellC?0:0;", 100],
];
for (const [name, code, wait, after] of shots) { try { await page.evaluate(code); } catch (e) { errs.push(name + ' EVAL ' + e.message); } await page.waitForTimeout(wait || 600); if (after) { try { await page.evaluate(after); } catch (e) { } await page.waitForTimeout(300); } await page.screenshot({ path: path.join(root, 'check-output', name + '.png') }); }
const de = await page.evaluate(() => DQ.errors.slice(0, 5));
console.log(errs.length || de.length ? 'FAIL ' + JSON.stringify(errs.concat(de)) : `${shots.length} screens ok`);
await browser.close();
