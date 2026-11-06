import contextlib
import functools
import http.server
import json
import pathlib
import sys
import threading
import urllib.parse
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parents[1]
count = 0
failures = []
evidence = []
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(root)))
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
base = f'http://127.0.0.1:{server.server_port}'
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1400, 'height': 900})
        for scenario, network in [('standard', ''), ('standard', '&latency=150&jitter=50&loss=5'), ('server', ''), ('host-leave', '')]:
            query = f'?game=/build/game.html&players=2&auto=1&scenario={scenario}&play=1500{network}'
            page.goto(base + '/vendor/hub/harness.html' + query)
            page.wait_for_function('document.body.dataset.complete === "true"', timeout=60000)
            report = page.evaluate('window.__hubCheck')
            evidence.append(report)
            for check in report['checks']:
                count += 1
                if not check['pass']:
                    failures.append(scenario + network + ': ' + check['name'] + ' — ' + check.get('detail', ''))
            for frame in page.frames[1:]:
                if 'game.html' in frame.url:
                    count += 1
                    count += 1
                    if not frame.evaluate('TB.app.game.errors.length===0'):
                        failures.append('Native session errors: '+frame.evaluate('JSON.stringify(TB.app.game.errors)'))
                    if frame.title() != 'Turtley Booked':
                        failures.append('Harness loaded the wrong game')
            page.goto('about:blank')
        browser.close()
except Exception as e:
    failures.append(str(e))
finally:
    server.shutdown()
    server.server_close()
(root / 'build/hub-evidence.json').write_text(json.dumps(evidence, indent=2))
print(json.dumps({'count': count, 'failures': failures}))
sys.exit(1 if failures else 0)
