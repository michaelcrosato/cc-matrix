import http.server,threading,pathlib,json
from playwright.sync_api import sync_playwright
p=pathlib.Path(__file__).parent
class H(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(p),**k)
 def log_message(self,*a):pass
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--ignore-certificate-errors'])
 page=b.new_page(viewport={'width':1600,'height':1000},device_scale_factor=1)
 err=[];page.on('pageerror',lambda e:err.append(str(e)))
 page.goto('http://127.0.0.1:'+str(s.server_port)+'/index.html?webgl=1',wait_until='load')
 try:page.wait_for_function('window.__game?.getState().ready',timeout=90000)
 except Exception as e:print(str(e))
 print(json.dumps({'errors':err,'text':page.locator('#loading-message').inner_text(),'state':page.evaluate('window.__game?.getState()'),'render':page.evaluate('window.__game?.renderInfo()')}))
 page.wait_for_timeout(1800);page.screenshot(path=str(p/'title-check.png'))
 page.evaluate('window.__game.start()');page.wait_for_timeout(1200);page.screenshot(path=str(p/'play-check.png'))
 b.close()
s.shutdown();s.server_close()
