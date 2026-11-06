"""AI Hub conformance. Owns its HTTP server/browser; reports failures and one count."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from urllib.parse import urlencode
import argparse
import threading
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--scenario',choices=['default','server','host-leave','impaired','all'],default='all')
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
folder=Path(__file__).resolve().parent.name
filename=folder+'.html'
failures=[]
checks=0
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
scenarios=['default','server','host-leave','impaired'] if args.scenario=='all' else [args.scenario]
try:
    if not (root/filename).is_file():raise RuntimeError('Final game HTML has not been built')
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
        for scenario in scenarios:
            context=browser.new_context(viewport={'width':1440,'height':900})
            page=context.new_page()
            params={'game':'/'+filename,'players':2,'auto':1,'play':10000,'limit':60}
            if scenario in ['server','host-leave']:params['scenario']=scenario
            if scenario=='impaired':params.update(latency=150,jitter=50,loss=5)
            url=f'http://127.0.0.1:{server.server_port}/{folder}/hub/harness.html?{urlencode(params)}'
            try:
                page.goto(url,wait_until='domcontentloaded',timeout=30000)
                page.wait_for_function('window.__hubCheck?.done===true',timeout=120000)
                report=page.evaluate('window.__hubCheck')
                for check in report.get('checks',[]):
                    checks+=1
                    if not check.get('pass'):failures.append(f'{scenario}: {check.get("name")}: {check.get("detail")}')
                if not report.get('pass') and not any(not c.get('pass') for c in report.get('checks',[])):
                    failures.append(scenario+': harness did not pass')
                if report.get('pass'):
                    copies=[f for f in page.frames if f!=page.main_frame]
                    for frame in copies:
                        if frame.is_detached():continue
                        ended=frame.evaluate('!!window.AIHub?.active && window.__URN?.network?.ended===true')
                        checks+=1
                        if not ended:failures.append(scenario+': game failed to record hub end')
            except Exception as error:
                failures.append(scenario+': '+str(error).split('\n')[0])
            finally:context.close()
        browser.close()
except Exception as error:
    failures.append(str(error).split('\n')[0])
finally:
    server.shutdown();server.server_close()
for failure in failures:print('FAIL '+failure)
print(f'{checks} hub checks, {len(failures)} failures')
raise SystemExit(bool(failures))
