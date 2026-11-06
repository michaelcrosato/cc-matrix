from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
import json
D=Path(__file__).resolve().parent
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
s=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(D)))
Thread(target=s.serve_forever,daemon=True).start()
variants={
 'recommended':['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'],
 'angle-swiftshader':['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--use-angle=swiftshader','--disable-vulkan-surface'],
 'no-vulkan-feature':['--enable-unsafe-webgpu','--use-webgpu-adapter=swiftshader','--use-angle=swiftshader'],
 'vulkan-swiftshader':['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader'],
}
results=[]
try:
 with sync_playwright() as p:
  for name,args in variants.items():
   b=p.chromium.launch(args=args);c=b.new_context(ignore_https_errors=True);page=c.new_page();logs=[];errs=[]
   page.on('console',lambda m:logs.append(m.text));page.on('pageerror',lambda e:errs.append(str(e)))
   page.goto(f'http://127.0.0.1:{s.server_port}/gpu-minimal.html',wait_until='domcontentloaded')
   try:page.wait_for_function('!!window.debug',timeout=15000);page.wait_for_timeout(3000)
   except Exception as e:errs.append(str(e))
   result={'variant':name,'state':page.evaluate('window.debug?window.debug():null'),'logs':logs,'errors':errs};results.append(result);print(json.dumps(result),flush=True);c.close();b.close()
finally:s.shutdown();s.server_close()
(D/'gpu-environment.json').write_text(json.dumps(results,indent=2))
