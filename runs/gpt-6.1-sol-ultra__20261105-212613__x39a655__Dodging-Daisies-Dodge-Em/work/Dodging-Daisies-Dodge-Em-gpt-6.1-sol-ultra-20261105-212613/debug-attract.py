import functools,http.server,pathlib,threading,json
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).parent
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(root)));threading.Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--use-angle=vulkan','--disable-vulkan-surface']);page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(f'http://127.0.0.1:{s.server_port}/index.html');page.wait_for_function('window.__DD?.ready',timeout=60000)
 page.evaluate('__DD.returnTitle()');page.wait_for_timeout(11500)
 print('IDLE',page.evaluate('({debug:__DD.debug,mode:__DD.state.mode,attract:__DD.state.attract})'),errors,flush=True)
 page.keyboard.press('KeyW');page.evaluate('''window.pad={index:0,id:'Test',connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[pad]});__DD.returnTitle();''')
 page.wait_for_timeout(11500)
 print('PADIDLE',page.evaluate('({debug:__DD.debug,mode:__DD.state.mode,attract:__DD.state.attract})'),errors,flush=True)
 b.close()
s.shutdown()
