import functools,http.server,pathlib,threading,json
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).parent
class H(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
s=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(root)));threading.Thread(target=s.serve_forever,daemon=True).start()
with sync_playwright() as p:
 for gpu in (True,False):
  flags=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader']+(['--use-angle=vulkan','--disable-vulkan-surface'] if gpu else [])
  b=p.chromium.launch(headless=True,args=flags);page=b.new_page(viewport={'width':1440,'height':1000});errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(f'http://127.0.0.1:{s.server_port}/index.html'+('' if gpu else '?renderer=webgl'));page.wait_for_function('window.__DD?.ready||window.__bootError',timeout=60000)
  print('BOOT',gpu,page.evaluate('window.__bootError||__DD.renderer'),flush=True)
  if not page.evaluate('!!window.__DD'):b.close();continue
  if not gpu:
   page.wait_for_timeout(1000);page.screenshot(path=str(root/'title-final.png'))
  page.evaluate('''__DD.play(1);__DD.game.state.countdown=0;window.pad={index:0,id:'Test DualSense',connected:true,mapping:'standard',axes:[0,-1,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[pad]});''')
  for i in range(3):
   page.wait_for_timeout(1000);print('FRAME',gpu,i,page.evaluate('({mode:__DD.state.mode,t:__DD.state.players[0].t,queue:__DD.state.players[0].queue,input:__DD.input,physics:__DD.physics,render:__DD.scene.renderer.info.render,renderError:window.__renderError})'),errors,flush=True)
  if not gpu:page.screenshot(path=str(root/'gameplay-final.png'))
  b.close()
s.shutdown()
