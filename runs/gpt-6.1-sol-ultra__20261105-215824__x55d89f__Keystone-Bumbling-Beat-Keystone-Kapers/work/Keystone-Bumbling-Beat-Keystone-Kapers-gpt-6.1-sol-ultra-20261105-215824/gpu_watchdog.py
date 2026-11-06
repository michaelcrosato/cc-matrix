from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
import json, time
D=Path(__file__).resolve().parent
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(D.parent)))
Thread(target=s.serve_forever,daemon=True).start()
logs=[]; errors=[]; results=[]
try:
 with sync_playwright() as p:
  b=p.chromium.launch(args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--disable-gpu-watchdog'])
  c=b.new_context(ignore_https_errors=True, viewport={'width':1280,'height':800})
  page=c.new_page()
  page.add_init_script('''
  window.__gpuLog=[];
  if(navigator.gpu){
   const requestAdapter=navigator.gpu.requestAdapter.bind(navigator.gpu);
   navigator.gpu.requestAdapter=async(...args)=>{
    const adapter=await requestAdapter(...args);
    if(!adapter)return adapter;
    const requestDevice=adapter.requestDevice.bind(adapter);
    adapter.requestDevice=async(...args)=>{
      const device=await requestDevice(...args);
      window.__gpuLog.push({event:'device',at:performance.now(),features:[...device.features]});
      device.lost.then(v=>window.__gpuLog.push({event:'lost',at:performance.now(),message:v.message,reason:v.reason}));
      device.addEventListener('uncapturederror',v=>window.__gpuLog.push({event:'gpuerror',at:performance.now(),message:v.error.message}));
      const destroy=device.destroy.bind(device);
      device.destroy=(...a)=>{window.__gpuLog.push({event:'destroy',at:performance.now(),stack:new Error().stack});return destroy(...a);};
      return device;
    };return adapter;
   };
  }
  ''')
  html=(D.parent/(D.name+'.html')).read_text().replace('window.__game={','window.__renderDebug={renderer,scene,camera};window.__game={')
  page.route('**/'+D.name+'.html', lambda route:route.fulfill(status=200,content_type='text/html',body=html))
  page.on('console',lambda m:logs.append({'type':m.type,'message':m.text}))
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{s.server_port}/{D.name}.html',wait_until='domcontentloaded')
  try:page.wait_for_function('!!window.__game',timeout=90000)
  except Exception as e:errors.append(str(e))
  for seconds in [0,1,3,5]:
   if seconds:page.wait_for_timeout(seconds*1000)
   results.append(page.evaluate('''(()=>{if(!window.__game)return {loaded:false,loading:document.querySelector('#loading-text').textContent,gpuLog:window.__gpuLog};const{renderer,scene}=__renderDebug;let meshes=0;scene.traverse(o=>{if(o.isMesh)meshes++});return {loaded:true,frames:__game.renderer.frames,drawCalls:__game.renderer.drawCalls,triangles:__game.renderer.triangles,deviceLost:renderer._isDeviceLost,backend:renderer.backend.constructor.name,meshes,gpuLog:window.__gpuLog};})()'''))
  # With the same browser/page, remove shadows without changing the saved game.
  page.evaluate('''if(window.__renderDebug){__renderDebug.renderer.shadowMap.enabled=false;__renderDebug.scene.traverse(o=>{if(o.isLight)o.castShadow=false;});}''')
  page.wait_for_timeout(1000)
  results.append(page.evaluate('window.__game?{afterShadowDisabled:__game.renderer,deviceLost:__renderDebug.renderer._isDeviceLost}:{}'))
  c.close();b.close()
finally:s.shutdown();s.server_close()
report={'samples':results,'errors':errors,'logs':logs}
(D/'gpu-watchdog.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
