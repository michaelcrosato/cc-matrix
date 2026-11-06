"""Protocol conformance against the official AI Hub harness, served on an OS-picked port."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright
import argparse
import os

folder = Path(__file__).resolve().parent
workspace = folder.parent
parser = argparse.ArgumentParser()
parser.add_argument('--game', default=folder.name + '.html')
parser.add_argument('--players', type=int, default=2)
args = parser.parse_args()
(folder / '.browser-tmp').mkdir(exist_ok=True)
os.environ['TMPDIR'] = str(folder / '.browser-tmp')
class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw): super().__init__(*a, directory=str(workspace), **kw)
    def log_message(self, *a): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), QuietHandler)
Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_address[1]}'
failures = []
checks = 0
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader'])
        for scenario, players, latency, jitter, loss in [('standard', 2, 0, 0, 0), ('standard', args.players, 150, 50, 5), ('host-leave', args.players, 150, 50, 5), ('server', 2, 0, 0, 0)]:
            context = browser.new_context(viewport={'width': 1280, 'height': 900})
            page = context.new_page()
            params = urlencode({'game': '/' + args.game.lstrip('/'), 'players': players, 'latency': latency, 'jitter': jitter, 'loss': loss, 'auto': 1, 'scenario': scenario, 'play': 6000, 'limit': 45})
            page.goto(f'{base}/{folder.name}/harness.html?{params}')
            page.wait_for_function('document.body.dataset.complete === "true"', timeout=110000)
            report = page.evaluate('window.__hubCheck')
            for result in report.get('checks', []):
                checks += 1
                if not result.get('pass'): failures.append(f'{scenario}/{players}: {result["name"]}: {result.get("detail", "")}')
            if not report.get('pass') and not report.get('checks'): failures.append(f'{scenario}/{players}: no harness checks returned')
            context.close()
        browser.close()
except Exception as exc:
    failures.append(str(exc))
finally:
    server.shutdown()
for failure in failures: print('FAIL:', failure)
print(f'{checks} AI Hub checks; {len(failures)} failures')
raise SystemExit(bool(failures))
