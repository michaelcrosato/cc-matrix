import json, threading, functools
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
root=Path(__file__).parent
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
 page=browser.new_page(viewport={'width':1440,'height':900},ignore_https_errors=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m: print('CONSOLE',m.type,m.text) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}/index.html?test',wait_until='networkidle',timeout=120000)
 try:page.wait_for_function('window.__game',timeout=90000)
 except Exception:print('INIT FAILURE',page.locator('#loading-detail').inner_text(),errors);raise
 print('INIT',json.dumps(page.evaluate('window.__game.state'))[:1200])
 page.locator('#play-button').click()
 print('PLAY',json.dumps(page.evaluate('window.__game.step(20,true)'))[:1800])
 page.screenshot(path=str(root/'game-webgpu.png'))
 
 for i in range(120):
  try:
   s=page.evaluate('window.__game.step(1,true)')
   if i%10==0:print('TICK',i,s['elapsed'],s['stage'],s['health'],len(s['enemies']),flush=True)
  except Exception as e:
   print('FAILED AT',i,e,flush=True);break
 print('FULL',json.dumps(page.evaluate('window.__game.state'))[:2500])
 print('ERRORS',errors)
 browser.close()
server.shutdown();server.server_close()
