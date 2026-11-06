import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {GPU_ARGS} from './tests/ui.mjs';
const project=JSON.parse(await readFile('project.json','utf8'));await mkdir('test-output/art',{recursive:true});const browser=await chromium.launch({headless:true,args:GPU_ARGS});try{const page=await browser.newPage({viewport:{width:1920,height:1080}});await page.goto(pathToFileURL(resolve('..',project.basename+'.html')).href+'?test=1');await page.waitForFunction(()=>__game.state().screen==='title',null,{timeout:120000});await page.evaluate(()=>__game.setRendering(false));const shot=async(name,fn)=>{await page.evaluate(fn);await page.waitForTimeout(150);await page.evaluate(()=>__game.render());await page.screenshot({path:'test-output/art/'+name+'.png'});};await page.screenshot({path:'test-output/art/title.png'});
await shot('kiln-dawn',()=>{__game.screen('play');__game.dev('teleport',{x:-55,z:153});__game.dev('time',6);__game.input({lookSet:[0,0]});__game.step(1);__game.input(null);});
await shot('widows-yard-morning',()=>{__game.dev('teleport',{x:40,z:54});__game.dev('time',9.5);__game.input({lookSet:[Math.PI,0]});__game.step(1);__game.input(null);});
await shot('waterhole-noon',()=>{__game.dev('teleport',{x:700,z:90});__game.dev('time',12.5);__game.input({lookSet:[Math.PI,.03]});__game.step(1);__game.input(null);});
await shot('fire-golden-hour',()=>{__game.dev('god',true);__game.dev('allWeapons');__game.dev('teleport',{x:530,z:480});__game.dev('time',17.7);__game.input({lookSet:[2.5,-.02]});__game.step(1);__game.input(null);__game.dev('ignite');__game.step(180);});
await shot('night-post',()=>{__game.dev('teleport',{x:120,z:-336});__game.dev('time',23.5);__game.input({lookSet:[Math.PI,-.01]});__game.step(1);__game.input(null);});
await shot('map-focus',()=>{__game.action('mapFocus');});
await shot('field-surgery',()=>{__game.action('map');__game.dev('teleport','s1');__game.dev('god',false);__game.dev('hurt',85,'burn');__game.action('heal');__game.step(60);__game.dev('god',true);});
await shot('driving-map',()=>{__game.dev('teleport',{x:48,z:75});__game.step(180);__game.action('use');__game.action('map');__game.dev('time',17.5);});
await shot('mercy',()=>{__game.action('use');__game.dev('buddyDown');});
await shot('settings',()=>__game.screen('settings'));
console.log('11 art screenshots written.');}finally{await browser.close();}
