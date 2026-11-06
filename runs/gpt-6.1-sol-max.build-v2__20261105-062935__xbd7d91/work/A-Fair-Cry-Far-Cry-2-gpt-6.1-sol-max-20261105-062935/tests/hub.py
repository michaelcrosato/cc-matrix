from pathlib import Path
from playwright.sync_api import sync_playwright
import threading,http.server,socketserver,urllib.request,json,sys,urllib.parse
ROOT=Path(__file__).resolve().parents[1]
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT.parent),**kw)
 def log_message(self,*a):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
port=server.server_address[1]
base=f'http://127.0.0.1:{port}'
html=(ROOT.parent/(ROOT.name+'.html')).name
assert '<title>A Fair Cry</title>' in urllib.request.urlopen(base+'/'+html).read().decode()
cases=['players=2&auto=1','players=4&latency=150&jitter=50&loss=5&auto=1','players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1','players=2&scenario=server&auto=1']
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--disable-dev-shm-usage'])
  for idx,case in enumerate(cases):
   page=browser.new_page(viewport={'width':800,'height':600})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   game=urllib.parse.quote('../../'+html+'?test=1&nodraw=1',safe='')
   url=base+'/'+ROOT.name+'/hub/harness.html?game='+game+'&'+case
   page.goto(url)
   try:
    page.wait_for_function('window.__hubCheck && document.body.dataset.complete==="true"',timeout=180000)
    report=page.evaluate('window.__hubCheck')
   except Exception as e:
    report={'error':str(e),'body':page.locator('body').inner_text()}
   (ROOT/f'notes/hub-{idx}.json').write_text(json.dumps(report,indent=2))
   print(case,json.dumps(report),errors,flush=True)
   page.close()
  browser.close()
finally:server.shutdown();server.server_close()
