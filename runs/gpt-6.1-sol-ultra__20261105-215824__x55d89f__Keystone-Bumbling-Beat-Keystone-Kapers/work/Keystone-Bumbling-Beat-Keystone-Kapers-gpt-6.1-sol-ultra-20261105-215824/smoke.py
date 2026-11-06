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
try:
 with sync_playwright() as p:
  b=p.chromium.launch(args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
  c=b.new_context(ignore_https_errors=True,viewport={'width':1600,'height':1000})
  pg=c.new_page();errors=[];logs=[]
  pg.on('pageerror',lambda e:errors.append(str(e)))
  pg.on('console',lambda e:logs.append(e.type+': '+e.text))
  pg.goto(f'http://127.0.0.1:{s.server_port}/{D.name}.html?webgl=1',wait_until='domcontentloaded')
  try:pg.wait_for_function('window.__game && window.__game.renderer.frames>3',timeout=90000)
  except Exception as e:print('STARTUP FAILURE',str(e),pg.locator('#loading-text').inner_text())
  print(json.dumps({'errors':errors,'logs':logs[-12:],'state':pg.evaluate('window.__game?{mode:__game.mode,screen:__game.screen,renderer:__game.renderer}:null')}))
  
  if pg.evaluate('!!window.__game'):
   pg.evaluate("__game.action('solo')");pg.wait_for_timeout(4500);pg.screenshot(path=str(D/'gameplay-webgl.png'))
   print(json.dumps(pg.evaluate('({state:__game.state.mode,players:__game.state.players,audio:__game.audio.inspect()})')))
  b.close()
finally:s.shutdown();s.server_close()
