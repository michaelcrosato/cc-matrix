import { Engine, withUrlOptions, PALETTE } from '../pixel-engine.js';
import { App } from './app.js';
export { App };
export function createGame(){const app=new App();return app.first();}
if(typeof document!=='undefined'){
 let info=null;
 if(globalThis.AIHub?.active)info=await globalThis.AIHub.connect({mode:'ghost',seats:[1,4],card:true});
 let storage;try{storage=localStorage;}catch{}
 const app=new App({storage,info});globalThis.__GAME__=app;
 const key=e=>{app.externalPulse='keyboard';if(app.menu?.kind==='name'&&e.key.length===1&&/^[a-zA-Z0-9 -]$/.test(e.key)){app.engine?.input.send({nameChar:e.key});}if(app.scene?.id==='card'){if(e.code==='Enter')globalThis.AIHub.answer('ready');if(e.code==='KeyM')globalThis.AIHub.answer('more');}};
 const pointer=e=>{app.externalPulse=e.pointerType==='touch'?'touch':'mouse';};const motion=e=>{if(Math.abs(e.movementX)+Math.abs(e.movementY)>2)app.externalPulse=e.pointerType==='touch'?'touch':'mouse';};const wheel=()=>app.externalPulse='mouse';
 window.addEventListener('keydown',key);window.addEventListener('pointerdown',pointer);window.addEventListener('pointermove',motion);window.addEventListener('wheel',wheel);
 app.listeners.push(()=>{window.removeEventListener('keydown',key);window.removeEventListener('pointerdown',pointer);window.removeEventListener('pointermove',motion);window.removeEventListener('wheel',wheel);});
 try{const engine=await Engine.start(app.first(),withUrlOptions({container:document.getElementById('app'),aspect:'fill',touch:false,settings:{button:app.device.touchOnly?'top-right':false},quality:info?'medium':'high',seed:info?.seed||271828,background:PALETTE.sky,camera:app.first().camera()}));app.engine=engine;if(info)globalThis.AIHub.ready();globalThis.AIHub?.probe?.(()=>({scene:app.scene.id==='card'?'ready':app.scene.phase==='podium'?'over':app.scene.id==='title'?app.menu?'menu':'title':'play',menu:!!app.menu,world:app.scene.t,input:app.lastInput}));}
 catch(e){app.bootError=e.message;if(info)globalThis.AIHub.fail(e.message);}
}
