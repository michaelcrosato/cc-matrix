from playwright.sync_api import sync_playwright
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from pathlib import Path
import functools,json
root=Path(__file__).resolve().parent
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root.parent)))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--use-angle=swiftshader','--no-sandbox'])
 page=browser.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 errors=[]; page.on('pageerror',lambda e: errors.append(str(e)));page.on('console',lambda m: print('CONSOLE',m.type,m.text[:450]) if m.type=='error' else None)
 page.goto(f'http://127.0.0.1:{server.server_port}/'+root.name+'.html?renderer=webgl')
 try: page.wait_for_function('window.__JUNGLE?.ready',timeout=90000)
 except Exception as e: print(str(e))
 print(json.dumps({'errors':errors,'load':page.locator('#load-text').inner_text(),'api':page.evaluate('!!window.__JUNGLE')}))
 page.screenshot(path=str(root/'title.png'))
 if page.evaluate('!!window.__JUNGLE'):
  page.get_by_role('button',name='Start expedition').click();page.wait_for_timeout(1500)
  print(json.dumps(page.evaluate('({state:__JUNGLE.state(),backend:__JUNGLE.renderer.backend.constructor.name,screen:__JUNGLE.screen()})'))[:4000])
  page.wait_for_timeout(2500);page.screenshot(path=str(root/'canopy.png'))
  page.evaluate('__JUNGLE.goStage(1)');page.wait_for_timeout(3500);page.screenshot(path=str(root/'river.png'))
  page.evaluate('__JUNGLE.goStage(3)');page.wait_for_timeout(3500);page.screenshot(path=str(root/'camp.png'))
 print('FINAL ERRORS',errors)
 browser.close()
server.shutdown();server.server_close()
