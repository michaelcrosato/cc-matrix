from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
import json
D=Path(__file__).resolve().parent
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(D.parent)))
Thread(target=s.serve_forever,daemon=True).start()
html=(D.parent/(D.name+'.html')).read_text().replace('window.__game={','window.__renderDebug={renderer,scene,camera};window.__game={')
variants={
 'no-shadows':html.replace('shadowMap.enabled=true','shadowMap.enabled=false').replace('sun.castShadow=true','sun.castShadow=false'),
 'no-cel':html.replace('material.colorNode = nodeColor(color).mul(celBands);','material.colorNode = nodeColor(color);'),
 'no-shadows-no-cel':html.replace('shadowMap.enabled=true','shadowMap.enabled=false').replace('sun.castShadow=true','sun.castShadow=false').replace('material.colorNode = nodeColor(color).mul(celBands);','material.colorNode = nodeColor(color);'),
 'no-msaa':html.replace('antialias:true','antialias:false'),
 'no-mall':html.replace('mall=createMall(scene);','mall=createMall(new THREE.Scene());'),
}
results=[]
try:
 with sync_playwright() as p:
  b=p.chromium.launch(args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
  for name,body in variants.items():
   c=b.new_context(ignore_https_errors=True,viewport={'width':1280,'height':800});page=c.new_page();logs=[];errs=[]
   page.route('**/'+D.name+'.html',lambda route,request:route.fulfill(status=200,content_type='text/html',body=body))
   page.on('console',lambda m:logs.append(m.text));page.on('pageerror',lambda e:errs.append(str(e)))
   page.goto(f'http://127.0.0.1:{s.server_port}/{D.name}.html',wait_until='domcontentloaded')
   try:page.wait_for_function('!!window.__game',timeout=30000);page.wait_for_timeout(3000)
   except Exception as e:errs.append(str(e))
   state=page.evaluate('window.__game?{...__game.renderer,deviceLost:__renderDebug.renderer._isDeviceLost}:null')
   results.append({'variant':name,'state':state,'logs':logs,'errors':errs});print(json.dumps(results[-1]),flush=True);c.close()
  b.close()
finally:s.shutdown();s.server_close()
(D/'gpu-variants.json').write_text(json.dumps(results,indent=2))
