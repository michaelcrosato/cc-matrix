import http.server,threading,pathlib,json,time
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parent.parent
class Quiet(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(root),**kw)
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
 page=browser.new_page(viewport={'width':1600,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{server.server_port}/scene-dev/test.html#webgl');page.wait_for_function('window.ready',timeout=120000)
 page.screenshot(path=str(root/'scene-dev/rink-webgl.png'))
 print(json.dumps({'errors':errors,'ready':page.evaluate('ready'),'renderer':page.evaluate('hs.renderer.backend.constructor.name'),'objects':page.evaluate('hs.scene.children.length')}))
 browser.close()
server.shutdown()
