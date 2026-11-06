import functools,http.server,threading,json
from pathlib import Path
from playwright.sync_api import sync_playwright
folder=Path(__file__).resolve().parent;root=folder.parent
class Q(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Q,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--no-sandbox'])
  page=browser.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{server.server_port}/{folder.name}.html?webgl',wait_until='load')
  page.wait_for_function('window.__BOUNCEOUT__?.ready',timeout=120000)
  page.wait_for_timeout(1000)
  page.screenshot(path=str(folder/'title.png'))
  page.evaluate('__BOUNCEOUT__.start();__BOUNCEOUT__.setAuto(true);__BOUNCEOUT__.launch();__BOUNCEOUT__.step(5)')
  page.screenshot(path=str(folder/'game.png'))
  if errors: print('FAIL visual capture: '+' | '.join(errors))
  print(f'5 visual captures; {len(errors)} failures')
  page.set_viewport_size({'width':390,'height':844})
  page.evaluate('__BOUNCEOUT__.showTitle()')
  page.wait_for_timeout(300)
  page.screenshot(path=str(folder/'mobile-title.png'))
  page.evaluate('__BOUNCEOUT__.start()')
  page.wait_for_timeout(300)
  page.screenshot(path=str(folder/'mobile-game.png'))
  page.set_viewport_size({'width':844,'height':390})
  page.evaluate('__BOUNCEOUT__.showTitle()')
  page.wait_for_timeout(300)
  page.screenshot(path=str(folder/'landscape-title.png'))
  browser.close()
finally:server.shutdown();server.server_close()
