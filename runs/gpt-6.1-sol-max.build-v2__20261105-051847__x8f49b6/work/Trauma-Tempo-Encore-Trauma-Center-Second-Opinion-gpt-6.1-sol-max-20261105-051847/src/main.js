import {initPhysics} from './sim/physics.js';
import {createView} from './view/renderer.js';
import {App} from './app/director.js';
import {startSession} from './app/session.js';
const params=new URLSearchParams(location.search);
window.__game={state:()=>({screen:'Boot',renderBackend:'loading'})};
const fail=(error)=>{const text=error?.message||String(error);if(params.get('test')==='1')window.__renderError=error?.stack||text;if(AIHub.active){AIHub.fail(text);return;}document.getElementById('boot')?.remove();document.getElementById('screen').innerHTML='<main class="screen no-graphics"><span class="eyebrow gold">ST. ALDER / GRAPHICS SUPPORT</span><h2>The theatre could not open.</h2><p>This game needs WebGPU or WebGL 2. Try another browser or the compatibility renderer.</p><button class="primary" id="compatibility">Use compatibility renderer ↗</button><p class="small muted" id="graphics-message"></p></main>';document.getElementById('graphics-message').textContent=text;document.getElementById('compatibility').onclick=()=>{const url=new URL(location.href);url.searchParams.set('webgl','1');location.href=url.href;};window.__game={state:()=>({screen:'No graphics',renderBackend:'unavailable'})};};
try{
 const info=await AIHub.connect({mode:'shared-world',seats:[1,4],card:true});
 await initPhysics();
 if(info?.server){document.getElementById('boot')?.remove();await startSession(info,null);}else{
 const view=await createView(document.body,{forceWebGL:params.get('webgl')==='1',noRender:params.get('norender')==='1',onError:fail});
 const app=new App({view,params,session:!!info});document.getElementById('boot')?.remove();
 if(info)await startSession(info,app);app.loop();
 }
}catch(error){console.error(error);fail(error);}
