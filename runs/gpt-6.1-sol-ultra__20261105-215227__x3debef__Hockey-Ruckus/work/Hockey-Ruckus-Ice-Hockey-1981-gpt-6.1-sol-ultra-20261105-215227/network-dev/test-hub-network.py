import functools
import http.server
import pathlib
import threading
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
failures=[]
scenarios=[('standard',''),('degraded','&latency=150&jitter=50&loss=5'),('host-leave','&scenario=host-leave'),('server','&scenario=server')]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
    page=browser.new_page()
    for name,extra in scenarios:
        try:
            page.goto(f'http://127.0.0.1:{server.server_port}/network-dev/harness.html?game=hub-network-fixture.html&players=2&auto=1&play=1500'+extra)
            page.wait_for_function('window.__hubCheck?.done===true',timeout=45000)
            report=page.evaluate('window.__hubCheck')
            if not report['pass']:
                for check in report['checks']:
                    if not check['pass']:failures.append(name+': '+check['name']+' '+check['detail'])
        except Exception as exc:failures.append(name+': '+str(exc).splitlines()[0])
    browser.close()
server.shutdown();server.server_close()
for failure in failures:print('FAIL '+failure)
print(f'{len(scenarios)-(len({f.split(":")[0] for f in failures}))}/{len(scenarios)} official Hub protocol checks passed')
raise SystemExit(bool(failures))
