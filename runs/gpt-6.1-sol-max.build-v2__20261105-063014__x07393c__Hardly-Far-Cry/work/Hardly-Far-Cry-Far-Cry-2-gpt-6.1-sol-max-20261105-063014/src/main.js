import {GAME_TITLE} from './content/title.js';
import {Engine,withUrlOptions} from '../pixel-engine.js';
import {createGame} from './game.js';
import {LOOK} from './core/look.js';
import {hubSession} from './net/session.js';
const hub=globalThis.AIHub;
let info=null;
if(hub?.active)info=await hub.connect({mode:'shared-world',seats:[1,4],card:true});
const touch=typeof matchMedia!=='undefined'&&matchMedia('(pointer: coarse)').matches&&!matchMedia('(any-pointer: fine)').matches;
const game=createGame({session:info?hubSession(info):null,touch,quality:new URLSearchParams(location.search).get('quality')});
const compatibility=message=>{game.notice='Controller or keyboard required';game.screen='compatibility';const root=document.getElementById('app');root.className='fallback';root.replaceChildren();const title=document.createElement('h1');title.textContent=GAME_TITLE;const notice=document.createElement('div');notice.textContent='Controller or keyboard required';const text=document.createElement('div');text.textContent='This game needs WebGPU. Open this file in Chrome or Edge with WebGPU enabled.';const button=document.createElement('button');button.type='button';button.textContent='SETTINGS / COMPATIBILITY';button.onclick=()=>{text.textContent='Graphics: WebGPU required. Input: keyboard and mouse or a standard gamepad. Music defaults to 10%. '+message;};root.append(title,notice,text,button);window.__GAME__=game;};
const OPTIONS=withUrlOptions({container:document.getElementById('app'),camera:{preset:'first',fov:68},look:LOOK,touch:false,debugKeys:false,settings:{button:false,key:false},seed:info?.seed??7341});
if(info&&!info.server){window.addEventListener('keydown',e=>{if(game.round?.ended||game.round?.started)return;if(e.code==='Enter')hub.answer('ready');if(e.code==='KeyM')hub.answer('more');});}
try {
 if(info?.server||new URLSearchParams(location.search).has('headless')){const e=await Engine.headless(game,OPTIONS);window.__PIXEL_ENGINE__=e;window.__PIXEL_READY__=Promise.resolve(e);if(!info?.server)e.manual=false;const timer=setInterval(()=>{if(game.options.session?.server&&game.round?.ended){clearInterval(timer);return;}if(e.manual&&!game.options.session?.server)return;e.step(6,1/60);},100);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});}
 else if(!navigator.gpu){compatibility('WebGPU is unavailable in this browser.');if(info)hub.fail('This game needs WebGPU');}
 else await Engine.start(game,OPTIONS);
}catch(e){if(info){hub.fail(String(e.message||e));throw e;}if(/webgpu|adapter|gpu device/i.test(String(e.message||e)))compatibility(String(e.message||e));else throw e;}
if(info&&!info.server){const answer=e=>{if(game.round?.ended||game.round?.started)return;if(e.code==='Enter')hub.answer('ready');if(e.code==='KeyM')hub.answer('more');};window.addEventListener('keydown',answer);window.addEventListener('pagehide',()=>window.removeEventListener('keydown',answer),{once:true});}
