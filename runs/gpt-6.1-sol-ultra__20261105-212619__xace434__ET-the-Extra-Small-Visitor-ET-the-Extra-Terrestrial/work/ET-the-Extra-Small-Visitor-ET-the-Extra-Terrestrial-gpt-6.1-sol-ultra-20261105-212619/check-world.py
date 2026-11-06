import contextlib,functools,http.server,pathlib,threading
from playwright.sync_api import sync_playwright
folder=pathlib.Path(__file__).resolve().parent
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(folder)))
threading.Thread(target=server.serve_forever,daemon=True).start()
fail=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--no-sandbox'])
    page=browser.new_page(viewport={'width':1280,'height':800})
    page.on('pageerror',lambda e:fail.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/world-check.html')
    if page.title()!='Extra-Small Visitor World Check':fail.append('Wrong page')
    try:
        page.wait_for_function('window.worldCheck?.ok',timeout=120000)
    except Exception as e:fail.append(str(e))
    if not fail:
        if page.evaluate('worldCheck.backend')!='WebGPU':fail.append('Not WebGPU')
        page.screenshot(path=str(folder/'world-check.png'))
        page.evaluate('renderView(13,15,37,0,2,17)')
        page.screenshot(path=str(folder/'world-characters.png'))
    browser.close()
server.shutdown();server.server_close()
for issue in fail:print('FAIL: '+issue)
print(f'{3-len(fail)}/3 world checks passed')
raise SystemExit(bool(fail))
