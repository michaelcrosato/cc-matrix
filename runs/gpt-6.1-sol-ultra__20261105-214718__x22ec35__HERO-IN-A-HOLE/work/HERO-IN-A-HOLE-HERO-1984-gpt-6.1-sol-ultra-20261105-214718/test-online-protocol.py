import functools
import http.server
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
failures=[];checks=0
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
        for scenario in ('standard','host-leave','server'):
            page=browser.new_page()
            page.goto(f'http://127.0.0.1:{server.server_port}/hub-docs/harness.html?game=online-protocol-test.html&players=2&auto=1&play=1800&latency=150&jitter=50&loss=5&scenario={scenario}')
            page.wait_for_function('document.body.dataset.complete === "true"',timeout=45000)
            report=page.evaluate('window.__hubCheck')
            checks+=len(report['checks'])
            for check in report['checks']:
                if not check['pass']:failures.append(scenario+': '+check['name']+' '+check['detail'])
            page.close()
        browser.close()
except Exception as e:failures.append(str(e))
finally:server.shutdown();server.server_close()
for failure in failures:print('FAIL:',failure)
print(f'{checks} protocol checks, {len(failures)} failures')
raise SystemExit(bool(failures))
