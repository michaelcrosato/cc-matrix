import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']});const page=await browser.newPage({viewport:{width:1920,height:1080}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await mkdir('tests/.captures',{recursive:true});
try{await page.goto('file://'+resolve('../Hardly-Far-Cry-Far-Cry-2-gpt-6.1-sol-max-20261105-063014.html')+(process.argv.includes('--low')?'?quality=low':''));await page.evaluate(async()=>{await window.__PIXEL_READY__;return true;});await page.evaluate(()=>{__PIXEL_ENGINE__.manual=true;__GAME__.idle=-1000;});
const scenes=[
 ['title',()=>{}],
 ['day',()=>{const g=__GAME__;g.newCampaign();g.mission.current=null;g.ridingTrain=false;g.cheats.god=true;g.cheats.invisible=true;g.hour=16.5;g.body.fever.active=false;g.teleport(-183,42);g.ctx.camera.yaw=.25;g.ctx.camera.pitch=-.035;g.equip('tractor',45);g.toast('THE WEST ROAD / CHECKPOINT TWO',8);g.idle=-1000;}],
 ['night-fire',()=>{const g=__GAME__;g.hour=22;g.teleport(-250,-260);g.ctx.camera.yaw=.1;g.ctx.camera.pitch=0;g.world.fire.ignite(-250,-282,20);g.equip('flare');}],
 ['held-map',()=>{const g=__GAME__;g.hour=16.5;g.body.fever.active=false;const v=g.vehicles.list[0];v.rig.reset([-100,g.world.heightAt(-100,150)+1.4,150],1);g.vehicles.enter(v);g.mapUp=true;g.cam.enabled=false;g.waypoint={x:430,z:-60,name:'EAST SIDING'};g.map.draw();}],
 ['shop',()=>{const g=__GAME__;g.vehicles.exit();g.mapUp=false;g.teleport(13,42);g.ui.open('shop');g.ctx.camera.yaw=0;g.stones=30;}],
 ['dialogue',()=>{const g=__GAME__;g.mission.start('m5');g.ui.contract='m5';g.ui.open('brief');g.say('vance','The water question has been a great sorrow to this office.');}],
 ['surgery',()=>{const g=__GAME__;g.ui.close();g.teleport(-146,140);g.hp=12;g.body.busy=null;g.body.heal();g.hands.mixer.update(1.4);g.ctx.engine.timeScale=0;}],
 ['dev-sliders',()=>{const g=__GAME__;g.body.busy=null;g.hp=100;g.ui.open('dev');g.ui.tab=5;g.ui.page=1;}],
 ['ending',()=>{const g=__GAME__;g.endingChoice='column';g.endCampaign();}],
 ['hub-card',()=>{const g=__GAME__;g.startRound();g.round.started=false;g.screen='card';}]
];
for(const [name,fn] of scenes){await page.evaluate(fn);await page.evaluate(()=>{__PIXEL_ENGINE__.step(2);__PIXEL_ENGINE__.manual=false;});await new Promise(r=>setTimeout(r,11000));await page.screenshot({path:'tests/.captures/'+name+'.png'});await page.evaluate(()=>__PIXEL_ENGINE__.manual=true);const s=await page.evaluate(()=>({game:__GAME__.state(),errors:__PIXEL_ENGINE__.errors,gpu:__PIXEL_ENGINE__.state().gpuErrors}));await writeFile('tests/.captures/'+name+'.json',JSON.stringify(s));console.log(name,s.errors,s.gpu);}
for(const [name,size] of [['tablet',{width:768,height:1024}],['ultrawide',{width:3440,height:1440}]]){await page.setViewportSize(size);await page.evaluate(()=>{const g=__GAME__;g.toTitle();g.idle=-1000;__PIXEL_ENGINE__.manual=false;});await new Promise(r=>setTimeout(r,11000));await page.screenshot({path:'tests/.captures/'+name+'.png'});await page.evaluate(()=>__PIXEL_ENGINE__.manual=true);console.log(name,await page.evaluate(()=>__PIXEL_ENGINE__.errors));}
console.log('Browser errors:',errors);await writeFile('tests/.captures/errors.json',JSON.stringify(errors));}finally{await browser.close();}
