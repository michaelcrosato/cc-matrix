import assert from 'node:assert/strict';
import {chromium,webkit,firefox,devices} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import {GPU_ARGS} from './browser.mjs';
const url='file://'+process.cwd()+'/dist/game.html';
export async function run(test){
 const folder='tests/results/screens';mkdirSync(folder,{recursive:true});const report=[];
 const b=await chromium.launch({headless:true,args:GPU_ARGS});const p=await b.newPage({viewport:{width:960,height:540}});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
 try{
  await p.goto(url);await p.waitForFunction(()=>window.__GAME__,{timeout:35000});await p.evaluate(()=>{__PIXEL_ENGINE__.manual=true;});await p.setViewportSize({width:1920,height:1080});
  async function capture(name,args={}){
   const start=await p.evaluate(args=>{
    const a=__GAME__.app,e=__PIXEL_ENGINE__;e.manual=true;a.idle=0;
    if(args.op){__GAME__.goto(args.op,args.stage||0);if(args.knock){const boss=a.sim.entities.find(x=>x.k==='strain');if(boss)boss.timer=.01;}if(args.pink)a.sim.pink=1;}
    if(args.scene!=null){a.startStory(args.scene);if(args.beat!=null){a.beat=args.beat;a.setBeat();}a.lineAge=10;}
    if(args.mode){if(args.mode==='settings')a.openSettings('pause');else if(args.mode==='about')a.openAbout('main');else a.show(args.mode);}
    if(args.tool){a.sim.seats[0].tool=args.tool;a.sim.seats[0].x=0;a.sim.seats[0].z=-.1;}
    if(args.page!=null)a.aboutPage=args.page;
    e.input.setKey('KeyJ',!!args.use);
    if(args.win)a.forceOutcome(true);if(a.sim){a.sim.god=true;a.sim.freezeClock=true;}e.step(args.knock?4:1);e.manual=false;return e.frame;
   },args);
   await p.waitForFunction(n=>__PIXEL_ENGINE__.frame>n+1,start,{timeout:15000});await p.screenshot({path:folder+'/'+name+'.png'});await p.evaluate(()=>{__PIXEL_ENGINE__.manual=true;});
  }
  if(process.argv.includes('--quick')){await test('3D preview frames',async()=>{await capture('00-title',{mode:'title'});await capture('arena-01',{op:1,stage:1});await capture('arena-08',{op:8,stage:1});await capture('cast-reyes',{scene:0});await capture('settings',{op:1,stage:0,mode:'settings'});});return;}
  await test('TV screenshots: title, all ten arenas, every room and every cast member',async()=>{
   await capture('00-title',{mode:'title'});
   for(const [op,stage]of [[1,1],[2,6],[3,3],[4,1],[5,2],[6,5],[7,1],[8,1],[9,2],[10,1]])await capture('arena-'+String(op).padStart(2,'0'),{op,stage,knock:op===5,pink:op===6});
   for(const[scene,room]of [[0,'or'],[1,'ward'],[2,'corridor'],[3,'office'],[5,'scrub'],[6,'atrium'],[8,'roof']])await capture('set-'+room,{scene});
   for(const[scene,beat,who]of [[0,1,'ilya'],[0,0,'reyes'],[3,4,'sabine'],[3,0,'bram'],[1,1,'pem'],[6,0,'hesper']])await capture('cast-'+who,{scene,beat});
   for(const tool of ['scalpel','forceps','suture','drain','syringe','gel','laser','scanner'])await capture('tool-'+tool,{op:2,stage:0,tool,use:tool==='scanner'||tool==='laser'});
   await capture('hud-code-blue',{op:4,stage:4});await capture('hud-massage',{op:8,stage:4});await capture('results',{op:1,stage:6,win:true});await capture('pause',{op:1,stage:1,mode:'pause'});await capture('dev',{mode:'dev'});await capture('settings',{mode:'settings'});await capture('about',{mode:'about'});
   await capture('about-testing',{mode:'about',page:8});await capture('about-engine',{mode:'about',page:10});await capture('about-prompt',{mode:'about',page:13});await capture('about-credits',{mode:'about',page:15});
   assert.deepEqual(await p.evaluate(()=>__PIXEL_ENGINE__.errors),[]);assert.deepEqual(errs,[]);
  });
  await test('menus remain within the HUD at tablet, laptop and TV widths',async()=>{
   for(const[width,height]of [[1024,768],[1280,720],[1920,1080],[2560,1080]]){
    await p.setViewportSize({width,height});await p.evaluate(()=>{__PIXEL_ENGINE__.manual=false;});await p.waitForTimeout(200);
    const violations=await p.evaluate(()=>{const a=__GAME__.app,e=__PIXEL_ENGINE__,bad=[];e.manual=true;for(const mode of ['main','difficulty','pause','dev','settings','consult','results']){a.idle=0;a.show(mode);e.step(1);for(const r of a.ui)if(r.x<0||r.y<0||r.x+r.w>a.ctx.hud.width+1||r.y+r.h>a.ctx.hud.height+1)bad.push({mode,r,w:a.ctx.hud.width,h:a.ctx.hud.height});}return bad;});
    assert.deepEqual(violations,[],`${width}x${height}: ${JSON.stringify(violations)}`);
   }
  });
 }finally{await p.close();await b.close();}
 const matrix=[
  ['iPhone-SE',webkit,'iPhone SE (3rd gen)'],['iPhone-17',webkit,'iPhone 17 Pro'],['iPhone-landscape',webkit,'iPhone SE (3rd gen) landscape'],
  ['Pixel-7',chromium,'Pixel 7'],['Fold-cover',chromium,'Galaxy Z Fold 7 Cover'],['Fold-open',chromium,'Galaxy Z Fold 7'],
  ['iPad-Mini',webkit,'iPad Mini'],['iPad-Pro',webkit,'iPad Pro 11 landscape'],['Android-tablet',chromium,null,{width:800,height:1280},true],
  ['Desktop-small',chromium,null,{width:1024,height:768}],['Laptop',chromium,null,{width:1280,height:720}],
  ['TV',chromium,null,{width:1920,height:1080}],['Ultrawide',chromium,null,{width:2560,height:1080}],['Firefox',firefox,null,{width:1440,height:900}],
 ];
 for(const[name,type,profile,viewport,touch]of matrix)await test('viewport '+name,async()=>{
  const browser=await type.launch({headless:true,...(type===chromium?{args:GPU_ARGS}:{})});
  const options=profile?{...devices[profile]}:{viewport:viewport||{width:1024,height:768},...(touch?{isMobile:true,hasTouch:true}:{})};assert.ok(!profile||devices[profile],profile);
  const context=await browser.newContext(options),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  try{
   await page.goto(url);await page.waitForFunction(()=>window.__GAME__||window.__FALLBACK__,{timeout:35000});
   if(profile||touch)await page.evaluate(()=>{if(window.__GAME__){__PIXEL_ENGINE__.step(620);__PIXEL_ENGINE__.manual=false;}});
   await page.screenshot({path:folder+'/viewport-'+name+'.png'});
   const state=await page.evaluate(()=>({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,render:window.__GAME__?'WebGPU':'fallback',touch:!!window.__GAME__?.app.devices.blocked,errors:window.__PIXEL_ENGINE__?.errors||[]}));
   report.push({name,...state});assert.equal(state.overflow,false);assert.deepEqual(state.errors,[]);assert.deepEqual(errors,[]);
  }finally{await context.close();await browser.close();}
 });
 writeFileSync('tests/results/viewport-report.json',JSON.stringify(report,null,2));
}
