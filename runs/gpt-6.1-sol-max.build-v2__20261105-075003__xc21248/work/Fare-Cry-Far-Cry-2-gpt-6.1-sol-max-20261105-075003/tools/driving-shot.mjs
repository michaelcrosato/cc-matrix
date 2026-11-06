import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {GPU_ARGS} from './tests/ui.mjs';
const project=JSON.parse(await readFile('project.json','utf8'));
const browser=await chromium.launch({headless:true,args:GPU_ARGS});
try{const page=await browser.newPage({viewport:{width:1280,height:720}});await page.goto(pathToFileURL(resolve('..',project.basename+'.html')).href+'?test=1');await page.waitForFunction(()=>__game.state().screen==='title',null,{timeout:120000});await page.evaluate(()=>{__game.setRendering(false);__game.screen('play');__game.dev('teleport',{x:48,z:75});__game.action('use');__game.action('map');__game.dev('time',17.5);__game.step(1);__game.render();});await page.evaluate(()=>__game.setRendering(true));await page.waitForTimeout(3000);await page.evaluate(()=>__game.setRendering(false));await page.screenshot({path:'test-output/art/driving-verified.png'});console.log('Driving view captured.');}finally{await browser.close();}
