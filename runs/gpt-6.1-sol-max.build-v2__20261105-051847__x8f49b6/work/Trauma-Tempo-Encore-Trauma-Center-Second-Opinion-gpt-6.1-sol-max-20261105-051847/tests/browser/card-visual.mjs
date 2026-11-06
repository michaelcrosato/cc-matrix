import {chromium} from 'playwright';
import {copyFileSync} from 'node:fs';
import {server} from './suite.mjs';
copyFileSync('dist/game.html','tests/hub/site/game.html');
const srv=await server();const browser=await chromium.launch({headless:true});
try{const page=await browser.newPage({viewport:{width:1920,height:1080}});await page.goto(srv.url+'/tests/hub/site/harness.html?game=game.html&players=2');await page.waitForTimeout(600);const frames=page.frames().filter(f=>f.url().includes('/game.html'));for(const frame of frames){await frame.waitForFunction(()=>window.__game&&__game.state().screen==='Session card',{timeout:20000});await frame.evaluate(()=>{dispatchEvent(new KeyboardEvent('keydown',{key:'m',code:'m',bubbles:true}));dispatchEvent(new KeyboardEvent('keyup',{key:'m',code:'m',bubbles:true}));});}await page.waitForTimeout(500);const frame=frames[0];await frame.waitForFunction(()=>__game.state().screen==='Session card');await frame.locator('body').screenshot({path:'artifacts/final-session-card.png',animations:'disabled'});console.log('Own card More Time controls exercised; screenshot captured.');}finally{await browser.close();await srv.close();}
