// Visual showcase: builds a house, night, siege, boss; saves screenshots for a human/model to eyeball.
import { chromium } from '../../engine/node_modules/playwright/index.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url'; import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = path.resolve(root, '..', path.basename(root) + '.html');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 300))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
await page.goto(pathToFileURL(html).href); await page.waitForTimeout(1200);
const shot = async n => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(root, 'check-output', n + '.png') }); };
const run = c => page.evaluate(c);
await run("DQ.game.go('play',{new:true,name:'Show'})"); await page.waitForTimeout(600);
await run("DQ.talk.close(); DQ.devBeat('rooms'); DQ.talk.close(); DQ.S.cut=null; DQ.ui.closeAll(); DQ.S.flags.firstNight=1;"); await page.waitForTimeout(3000);
await run("for(let i=0;i<5;i++){DQ.talk.close();} DQ.S.cut=null; DQ.camOverride=null;");
await run(`(() => { const S = DQ.S, T = 16; S.hero.x = 43*T; S.hero.y = 57*T; S.hero.z=0; DQ.snapCam(); const put = (x,y,it)=>{ DQ.inv.add(it,1,true); S.hotbar[S.sel]=it; DQ.forceTarget={cx:x,cy:y}; DQ.placeAction(); DQ.forceTarget=null; };
 for (let k=0;k<2;k++) for (let y=0;y<5;y++) for (let x=0;x<5;x++){ const e=x==0||y==0||x==4||y==4; if(!e|| (x==2&&y==4)) continue; put(41+x,52+y,k? 'plank':'cobble'); }
 put(43,56,'door'); put(42,53,'torch'); put(44,53,'bed'); S.clock.hour=19.5; })()`);
await page.waitForTimeout(1500); await shot('s_room');
await run("DQ.S.clock.hour=21");  await page.waitForTimeout(600); await shot('s_night');
await run("DQ.S.clock.hour=12; DQ.devBeat('siege'); DQ.S.cut=null; DQ.talk.close(); DQ.tuning.siegePrep=2; DQ.S.flags.siegeStarted=true; DQ.siegeStart();"); await page.waitForTimeout(9000);
await run("DQ.talk.close()"); await shot('s_siege');
await run("DQ.god=true; for (const m of DQ.S.monsters) if (!m.def.boss) m.hp=0; DQ.S.siege.phase='wave'; DQ.S.siege.queue=[]; DQ.S.siege.wave=3;"); await page.waitForTimeout(6000); await run("DQ.talk.close(); DQ.talk.close();"); await page.waitForTimeout(3000); await run("DQ.talk.close(); DQ.talk.close();"); await shot('s_boss');
console.log(errs.length ? 'FAIL ' + JSON.stringify(errs) + JSON.stringify(await run('DQ.errors.slice(0,3)')) : 'showcase ok ' + JSON.stringify(await run('DQ.game.debug.snapshot().siege')));
await browser.close();
