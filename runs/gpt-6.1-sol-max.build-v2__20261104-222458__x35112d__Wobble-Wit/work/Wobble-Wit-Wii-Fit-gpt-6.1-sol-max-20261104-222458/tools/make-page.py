from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
client=(root/'hub/session.js').read_text()
about=json.loads((root.parent/'exit-interview.json').read_text())
head='''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<script>'''+client+'''</script>
<meta name="hub:session" content="1">
<meta name="hub:session-players" content="1-4">
<meta name="hub:session-mode" content="ghost">
<meta name="hub:session-minutes" content="3">
<meta name="hub:session-goal" content="Highest total across three balance events wins">
<meta name="hub:session-howto" content="Lean: stick, WASD or mouse. Act: Cross, Space or click. Steps: Q/E or shoulders.">
<meta name="hub:webgpu" content="required">
<script id="about-data" type="application/json">'''+json.dumps(about,ensure_ascii=False).replace('</','<\\/')+'''</script>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Wobble Wit — A little less wobble</title>
<meta name="description" content="A five-day wellness holiday staffed by talking gym equipment. Lean, breathe, splash, and learn to do a little less.">
<meta name="theme-color" content="#8fdde0">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='20' fill='%238fdde0'/%3E%3Ccircle cx='32' cy='32' r='22' fill='%23fbfaf6'/%3E%3Ccircle cx='32' cy='32' r='12' fill='none' stroke='%2378dcaa' stroke-width='4'/%3E%3Ccircle cx='36' cy='28' r='6' fill='%23ff786e'/%3E%3C/svg%3E">
<style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;overscroll-behavior:none;touch-action:none;background:#d6eef6;color:#263e54;font-family:ui-rounded,'Trebuchet MS',system-ui,sans-serif;user-select:none;-webkit-user-select:none}canvas{display:block;width:100vw!important;height:100vh!important;height:100dvh!important;outline:none;touch-action:none}button{font:inherit;cursor:pointer;border:0;border-radius:18px;padding:15px 25px;background:#329fa9;color:#fff;font-weight:700;min-height:48px}button:focus-visible,input:focus-visible{outline:4px solid #ff786e;outline-offset:4px}#msg{position:fixed;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:24px;font-size:clamp(20px,3vw,34px);gap:14px;background:radial-gradient(ellipse at 50% 110%,#8fdde0 0 38%,transparent 39%),#f8f6ed;z-index:2;pointer-events:none}#msg small{max-width:700px;line-height:1.6;font-size:.65em;color:#668085}#touch-card{display:none;position:fixed;inset:0;align-items:center;justify-content:center;padding:20px;background:#263e542b;z-index:4}#touch-card .card,#touch-settings{width:min(560px,100%);padding:32px;border-radius:32px;background:#fbfaf6;box-shadow:0 16px 80px #263e5426;text-align:center}#touch-card h1{font-size:clamp(27px,6vw,40px);line-height:1.15;margin:15px 0}#touch-card p{font-size:18px;line-height:1.5;color:#668085}#touch-card small{font-size:14px;color:#668085}#touch-settings{display:none;position:fixed;z-index:5;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,calc(100% - 32px));max-height:calc(100dvh - 32px);overflow-y:auto;text-align:left}#touch-settings h2{margin:0 0 24px}#touch-settings label{display:block;margin:17px 0;font-size:18px}#touch-settings input{display:block;width:100%;accent-color:#329fa9;margin-top:12px}#touch-settings button{width:100%;margin-top:12px}.brand{font-weight:900;letter-spacing:.14em;font-size:13px;color:#329fa9}#fallback-settings{display:none;position:fixed;bottom:28px;left:50%;transform:translateX(-50%);z-index:3}
@media(max-height:500px){#touch-card{padding:12px}#touch-card .card{padding:18px 24px;max-height:calc(100dvh - 24px)}#touch-card h1{font-size:28px;margin:8px 0}#touch-card p{font-size:16px;margin:8px 0}#touch-card small{font-size:13px}#touch-card button{min-height:42px;padding:10px 22px}}
</style>
<script>
(() => {
 const coarse=matchMedia('(pointer: coarse)').matches&&!matchMedia('(any-pointer: fine)').matches;
 let saved='';try{saved=localStorage.getItem('wobble-wit-v1')||'';}catch{}
 const boot=window.__gameBoot={scene:coarse?'fit/attract':null,seed:null,today:Math.floor(Date.now()/86400000),about:document.getElementById('about-data').textContent,save:saved};
 window.__fitExternalUi=[];window.__touchOnly=coarse;window.__gameReady=false;
 window.__fitLastDevice=coarse?3:0;window.__fitPad=null;
 addEventListener('keydown',()=>{window.__fitLastDevice=0;});
 let pointerX=0,pointerY=0;addEventListener('pointermove',e=>{if(Math.hypot(e.clientX-pointerX,e.clientY-pointerY)>6){window.__fitLastDevice=2;pointerX=e.clientX;pointerY=e.clientY;}});addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')window.__fitLastDevice=2;});
 let previous=0,repeat=0;
 const pollPad=now=>{const p=[...(navigator.getGamepads?.()||[])].find(p=>p?.connected);if(p){const on=n=>!!p.buttons[n]?.pressed;let held=0;for(const [n,bit]of[[0,64],[1,32768],[2,16777216],[3,8388608],[4,33554432|1048576],[5,67108864|2097152],[6,33554432],[7,67108864|32],[12,65536],[13,131072],[14,262144],[15,524288]])if(on(n))held|=bit;if(on(9)&&!on(8))held|=4194304;
 const lx=p.axes[0]||0,ly=-(p.axes[1]||0),rx=p.axes[2]||0,ry=-(p.axes[3]||0);let nav=0;if(ly>.5)nav|=65536;if(ly<-.5)nav|=131072;if(lx<-.5)nav|=262144;if(lx>.5)nav|=524288;let pressed=held&~previous;if(nav&&now>repeat){pressed|=nav;repeat=now+190;}if(!nav)repeat=0;const any=held!==0||Math.hypot(lx,ly)>.12||Math.hypot(rx,ry)>.2;if(any)window.__fitLastDevice=1;
 const old=window.__fitPad;window.__fitPad={held,pressed:pressed|(old?.pressed||0),any,lx,ly,rx,ry};previous=held;}requestAnimationFrame(pollPad);};requestAnimationFrame(pollPad);

 if(!window.AIHub||!AIHub.active)return;
 const hub=window.__hub={go:false,ended:false,players:[],me:0,ghosts:{}};
 boot.scene='fit/medley';boot.seed=Number((/[?&]aihub-seed=(\\d+)/.exec(location.search)||[])[1]||1);
 AIHub.connect({mode:'ghost',seats:[1,4]}).then(info=>{
  if(!info){return;}if(!navigator.gpu){AIHub.fail('This game needs WebGPU');return;}
  hub.me=info.me;hub.players=info.players;
  const status=()=>{try{return JSON.parse(window.__gameStatus||'null')?.hub??null;}catch{return null;}};
  const waitReady=()=>window.__gameStatus?AIHub.ready():setTimeout(waitReady,50);waitReady();
  let reported=false;const report=()=>{if(reported)return;reported=true;const s=status();AIHub.result({score:s?.score??0,stats:s?.stats??{}});};
  setInterval(()=>{if(AIHub.time()<0||hub.ended)return;hub.go=true;const s=status();AIHub.progress({score:s?.score??0,label:s?.label??'Warming up'});if(!reported)AIHub.send(s?.ghost??{area:-1},{reliable:false});if(s?.done)report();},100);
  AIHub.on('message',(data,from)=>{hub.ghosts[from]=data;});AIHub.on('leave',({id})=>{delete hub.ghosts[id];});AIHub.on('time-up',report);AIHub.on('end',()=>{hub.ended=true;document.querySelector('canvas')?.blur();});
 });
})();
</script>
</head><body>
<div id="msg" role="status" aria-live="polite"><span class="brand">TIPPY CAY · WELLNESS RESORT</span><strong>Preparing your towel…</strong></div>
<div id="touch-card"><div class="card"><span class="brand">WOBBLE WIT</span><h1>Controller or keyboard required</h1><p>Connect a controller or keyboard to check in.<br>The island is happy to demonstrate while you settle in.</p><button id="touch-open">Settings</button><p><small>A little less wobble. A little more you.</small></p></div></div>
<button id="fallback-settings">Settings</button>
<div id="touch-settings" role="dialog" aria-label="Settings"><span class="brand">A LITTLE ADJUSTMENT</span><h2>Settings</h2><label>Music <output id="music-val">10%</output><input id="touch-music" type="range" min="0" max="100" value="10"></label><label>Sound effects<input id="touch-sfx" type="range" min="0" max="100" value="80"></label><label>Equipment voices<input id="touch-voice" type="range" min="0" max="100" value="80"></label><label>Wobble assist<input id="touch-assist" type="range" min="0" max="80" value="0"></label><button id="touch-close">Back to the island</button></div>
<script>
(() => {
 const card=document.getElementById('touch-card'),settings=document.getElementById('touch-settings');let open=false,serial=-1;
 const showSettings=()=>{open=true;settings.style.display='block';card.style.display='none';if(window.__hasWebGPU)__fitExternalUi.push({kind:'settings'});};
 document.getElementById('touch-open').onclick=showSettings;document.getElementById('fallback-settings').onclick=showSettings;
 document.getElementById('touch-close').onclick=()=>{open=false;settings.style.display='none';__fitExternalUi.push({kind:'click',id:10});};
 for(const [key,id]of[['music',0],['sfx',1],['voice',2],['assist',5]])document.getElementById('touch-'+key).addEventListener('input',e=>{const v=Number(e.target.value)/100;__fitExternalUi.push({kind:'slider',id,value:v});if(key==='music')document.getElementById('music-val').textContent=e.target.value+'%';});
 const normal=()=>{window.__touchOnly=false;card.style.display='none';};addEventListener('keydown',normal);addEventListener('gamepadconnected',normal);
 addEventListener('contextmenu',e=>e.preventDefault());
 setInterval(()=>{const pads=navigator.getGamepads?.()||[];if([...pads].some(p=>p?.buttons.some(b=>b.pressed)||p?.axes.some(a=>Math.abs(a)>.3)))normal();if(__touchOnly&&window.__hasWebGPU&&!open)card.style.display='flex';
  let s;try{s=JSON.parse(window.__gameStatus||'null');}catch{}if(!s)return;window.__gameReady=true;document.body.dataset.screen=s.screen;
  if(s.serial>0&&s.serial!==serial&&!AIHub.active){serial=s.serial;try{localStorage.setItem('wobble-wit-v1',JSON.stringify(s.save));}catch{}}
 },100);
})();
</script>
<script type="module">
 const name='Wobble Wit',msg=document.getElementById('msg');
 let hasGPU=false;try{hasGPU=!!(navigator.gpu&&await navigator.gpu.requestAdapter());}catch{}window.__hasWebGPU=hasGPU;
 if(!hasGPU){if(AIHub.active)AIHub.fail('This game needs WebGPU');msg.replaceChildren();const brand=document.createElement('span');brand.className='brand';brand.textContent='TIPPY CAY · WELLNESS RESORT';const h=document.createElement('strong');h.textContent=window.__touchOnly?'Controller or keyboard required':'A small browser adjustment.';const detail=document.createElement('small');detail.textContent='Wobble Wit needs WebGPU. Open this file in a browser with WebGPU and hardware acceleration enabled. A controller or keyboard is required to play.';msg.append(brand,h,detail);document.getElementById('fallback-settings').style.display='block';}
 else{
  new MutationObserver((_,obs)=>{const c=document.querySelector('canvas');if(c){c.setAttribute('aria-label',name+' game');msg.remove();c.focus();obs.disconnect();}}).observe(document.body,{childList:true});
  try{if(window.loadGame)await window.loadGame();else await(await import('./shardfall.js')).default();}catch(error){console.error(name+' failed to load:',error);msg.textContent='Your towel is not quite ready. Reload to try again.';document.body.append(msg);}
 }
</script></body></html>
'''
licenses=(root/'notes/asset-licenses.txt').read_text()
head=head.replace('</head>', '<script id="license-data" type="text/plain">'+licenses.replace('</','<\\/')+'</script>\n</head>')
(root/'engine/web/index.html').write_text(head)
