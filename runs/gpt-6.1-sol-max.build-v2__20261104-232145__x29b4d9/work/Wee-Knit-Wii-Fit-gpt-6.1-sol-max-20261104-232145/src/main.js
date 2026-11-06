import {View} from './render/renderer.js';
import {Input} from './input/input.js';
import {Director} from './game/director.js';
import {Session} from './game/session.js';
import {R} from './physics/world.js';
import {setSeed} from './core/rng.js';
import * as THREE from 'three/webgpu';
async function main(){
 const pConnect=AIHub.active?AIHub.connect({mode:'ghost',seats:[1,4],card:true}):null;
 const params=new URLSearchParams(location.search);await R.init();const view=await new View().init(params.get('render')==='0'),input=new Input(),game=new Director(view,input);game.manual=params.has('manual');window.__game=game;window.addEventListener('error',e=>game.errors.push(e.message));window.addEventListener('unhandledrejection',e=>game.errors.push(String(e.reason)));
 if(pConnect){const info=await pConnect;if(info)game.session=new Session(game,info);else game.standalone();}else game.standalone();
 AIHub.probe(()=>({scene:game.screen==='title'?'title':game.screen==='sessionCard'?'ready':game.screen==='sessionOver'?'over':['play','sessionPlay','island','attract'].includes(game.screen)?'play':'menu',menu:['settings','pause','dev'].includes(game.screen),world:game.simTime,input:{x:game.lastInput?.x||0,y:game.lastInput?.z||0,fire:!!game.lastInput?.hop}}));
 if(params.has('test')){window.__TEST__={state:()=>game.state(),advance:sec=>{let ticks=Math.ceil(sec*120-1e-7);for(let i=0;i<ticks;i++)game.fixed(1/120);game.event?.frame(Math.min(sec,.25));if(game.event&&game.screen==='play')game.ui.updateEvent(game.event);game.ui.updatePrompts();return game.state();},bot:skill=>{game.testBot=skill;if(!skill&&window.__pads){for(let p of window.__pads){p.axes=[0,0,0,0];for(let b of p.buttons){b.value=0;b.pressed=false;}}}return skill;},goto:(s,args)=>game.goto(s,args),tuning:game.tuning,settings:game.settings,seed:setSeed,versions:{three:THREE.REVISION,rapier:R.version()},audioOffline:async(kind,name)=>{const {offlineSample}=await import('./audio/engine.js');return offlineSample(kind,name);}};}
 document.querySelector('#boot')?.remove();let last=performance.now(),acc=0;
 function loop(now){let real=Math.max(0,(now-last)/1000);last=now;acc+=Math.min(real,.25)*(game.session?1:game.dev.timeScale);let count=0;try{while(acc>=1/120&&count++<120){game.fixed(1/120);acc-=1/120;}game.frame(Math.min(real,.25));}catch(e){game.errors.push(e.message);console.error(e);if(game.session)AIHub.fail(e.message);game.ui.toast('Something could not continue. '+e.message,20);return;}requestAnimationFrame(loop);}
 if(view.renderer)view.renderer.setAnimationLoop(()=>{});if(!params.has('manual'))requestAnimationFrame(loop);else game.frame(0);
}
main().catch(e=>{console.error(e);let b=document.querySelector('#boot');if(!b){b=document.createElement('div');b.className='error';document.body.append(b);}b.textContent='Unable to start. WebGPU or WebGL2 is needed. '+e.message;AIHub.fail(e.message);});
