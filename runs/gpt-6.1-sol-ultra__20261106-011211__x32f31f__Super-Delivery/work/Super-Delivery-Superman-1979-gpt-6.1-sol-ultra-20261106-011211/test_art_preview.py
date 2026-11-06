from playwright.sync_api import sync_playwright
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import threading
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
s=ThreadingHTTPServer(('127.0.0.1',0),Quiet);threading.Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(headless=False,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
 page=b.new_page(viewport={'width':1280,'height':800});page.on('pageerror',lambda e:print(e));page.on('console',lambda e: print(e.text) if e.type=='error' else None)
 page.goto(f'http://127.0.0.1:{s.server_port}/art-preview.html');page.wait_for_function('window.artReady',timeout=90000);page.screenshot(path='art-preview.png');print('BACKEND',page.evaluate('window.artBackend'));b.close()
s.shutdown()
