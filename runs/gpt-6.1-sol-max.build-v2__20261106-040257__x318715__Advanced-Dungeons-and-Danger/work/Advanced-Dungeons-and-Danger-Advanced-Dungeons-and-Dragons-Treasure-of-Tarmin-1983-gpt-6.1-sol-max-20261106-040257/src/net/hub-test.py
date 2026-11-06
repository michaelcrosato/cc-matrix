from pathlib import Path
import functools
import http.server
import json
import threading
import sys
import urllib.parse
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
reports=[]
failures=[]
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True)
        for name,extra in [('standard',''),('impaired','&latency=150&jitter=50&loss=5'),('host-leave','&scenario=host-leave'),('server','&scenario=server&latency=150&jitter=50&loss=5'),('solo-hub','')]:
            if len(sys.argv)>1 and name not in sys.argv[1:]:
                continue
            players=1 if name=='solo-hub' else 2
            context=browser.new_context()
            page=context.new_page()
            page.goto(f'http://127.0.0.1:{server.server_port}/vendor/hub/harness.html?game=/src/net/probe-hub.html&players={players}&auto=1&play=2000'+extra)
            page.wait_for_function('document.body.dataset.complete === "true"',timeout=45000)
            report=page.evaluate('window.__hubCheck')
            diagnostics=[]
            for frame in page.frames[1:]:
                try:
                    diagnostics.append(frame.evaluate('window.net?.diagnostics()'))
                except Exception:
                    pass
            report['diagnostics']=diagnostics
            report['scenarioName']=name
            reports.append(report)
            if report.get('pass') is not True:
                failures.extend(f'{name}: {check["name"]}: {check.get("detail", "")}' for check in report.get('checks',[]) if not check.get('pass'))
            if any(d and d['traffic']['maxBytes']>15200 or d and d['traffic']['maxPerSecond']>16 for d in diagnostics):
                failures.append(name+': traffic budget exceeded')
            context.close()
        browser.close()
except Exception as exc:
    failures.append('Hub transport probe ran: '+str(exc))
finally:
    server.shutdown();server.server_close();thread.join(timeout=2)
output=ROOT/'evidence'/'hub-transport-probe.json'
previous=json.loads(output.read_text()).get('reports',[]) if output.exists() and len(sys.argv)>1 else []
merged=[report for report in previous if report.get('scenarioName') not in {r['scenarioName'] for r in reports}]+reports
output.write_text(json.dumps({'reports':merged,'failures':failures},indent=2))
for failure in failures:
    print('FAIL '+failure)
print(f'{len(reports)-len(failures)}/{len(reports)} official Hub transport probe scenarios passed')
raise SystemExit(1 if failures else 0)
