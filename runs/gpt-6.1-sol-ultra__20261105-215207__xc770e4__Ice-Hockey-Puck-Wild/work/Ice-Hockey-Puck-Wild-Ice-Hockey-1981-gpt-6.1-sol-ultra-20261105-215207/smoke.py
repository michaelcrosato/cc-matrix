import http.server,threading,functools,pathlib
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parent.parent
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
  page=browser.new_page(viewport={'width':1440,'height':900},ignore_https_errors=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  url='http://127.0.0.1:'+str(server.server_port)+'/'+pathlib.Path(__file__).parent.name+'.html'
  page.goto(url+'?webgl=1');page.wait_for_function('window.__gameReady',timeout=120000)
  print({'title':page.title(),'backend':page.evaluate('__game.view.backend'),'errors':errors})
  page.screenshot(path=str(pathlib.Path(__file__).parent.name and pathlib.Path(__file__).parent/'title-shot.png'))
  page.get_by_role('button',name='PLAY THE NIGHT GAME').click();page.wait_for_timeout(2800)
  page.screenshot(path=str(pathlib.Path(__file__).parent/'game-shot.png'))
  print({'phase':page.evaluate('__game.game.phase'),'errors':errors})
  browser.close()
finally: server.shutdown();server.server_close()
