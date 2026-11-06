import http.server, threading, pathlib, os
from playwright.sync_api import sync_playwright
os.chdir(pathlib.Path(__file__).parent)
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),http.server.SimpleHTTPRequestHandler)
threading.Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
 page=b.new_page(viewport={'width':1600,'height':1000});errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 page.goto(f'http://127.0.0.1:{s.server_port}/visual-test.html?webgl=1');page.wait_for_function('window.ready || window.fail',timeout=90000)
 print(page.evaluate('({ready:window.ready,fail:window.fail,backend:window.view?.backend})'))
 page.wait_for_timeout(1000);page.screenshot(path='visual-check.png');print(errs)
 b.close()
s.shutdown()
