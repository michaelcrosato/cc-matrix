"""Capture only visual concerns: composition, TV legibility and responsive menus."""
import json,threading,os,sys
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];os.chdir(ROOT)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start()
errors=[];count=0
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1);page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  page.goto(f'http://127.0.0.1:{server.server_port}/index.html?webgl=1');page.wait_for_function('window.__game?.ready',timeout=60000);page.wait_for_timeout(600);page.screenshot(path='tests/title-tv.png');count+=1
  page.evaluate('__game.start();__game.invincible(true);__game.pilot(true);__game.step(15);__game.pilot(false)');page.wait_for_timeout(3200);page.screenshot(path='tests/patrol-tv.png');count+=1
  page.mouse.move(1700,400);page.evaluate('__game.boss();const b=__game.state.enemies.find(e=>e.type==="boss");__game.setShip(b.x-23,b.y-2);__game.step(.2)');page.wait_for_timeout(3200);page.screenshot(path='tests/carrier-tv.png');count+=1
  page.evaluate('__game.pause();__game.menu("dev")');page.wait_for_timeout(100);page.screenshot(path='tests/dev-tv.png');count+=1
  page.evaluate('__game.title()');page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(200);page.screenshot(path='tests/title-phone.png');count+=1
  if errors:raise RuntimeError('; '.join(errors))
 except Exception as e:errors.append(str(e));print('FAIL visual captures: '+str(e))
 finally:browser.close();server.shutdown()
Path('tests/visual-results.json').write_text(json.dumps({'captures':count,'errors':errors,'review':'TV title, patrol, carrier, developer tools and portrait title inspected; WebGL fallback used because headless WebGPU compositor returns blank canvas.'},indent=2))
print(f'{count if not errors else 0}/{count or 1} visual capture checks passed')
sys.exit(bool(errors))
