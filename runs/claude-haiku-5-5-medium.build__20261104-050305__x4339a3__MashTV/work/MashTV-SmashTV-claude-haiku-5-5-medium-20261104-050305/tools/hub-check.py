# Runs the AI Hub conformance harness (vendor/hub/harness.html, served from serve/ on 127.0.0.1) against the game, the way the
# hub checks a shared-world game: loads the page with ?game=GAME.html&players=N&auto=1 and prints each check. Usage:
# python3 tools/hub-check.py <players> [extra-query]
import sys, os, json, subprocess, time, re
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
serve = os.path.join(root, 'serve')
players = sys.argv[1] if len(sys.argv) > 1 else '2'
extra = sys.argv[2] if len(sys.argv) > 2 else ''
srv = subprocess.Popen([sys.executable, '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], cwd=serve, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
port = None
line = srv.stdout.readline()
m = re.search(r'port (\d+)', line) or re.search(r':(\d+)', line)
port = m.group(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = b.new_page(viewport={'width': 1280, 'height': 800})
        url = f'http://127.0.0.1:{port}/harness.html?game=GAME.html&players={players}&auto=1' + (('&' + extra) if extra else '')
        pg.goto(url)
        pg.wait_for_function("() => document.body && document.body.dataset.complete === 'true'", timeout=600000, polling=1000)
        rep = pg.evaluate("() => window.__hubCheck")
        for c in rep['checks']:
            print(('PASS ' if c['pass'] else 'FAIL ') + c['name'] + ((' — ' + c['detail']) if c.get('detail') and not c['pass'] else ''))
        print('RESULT', 'PASS' if rep['pass'] else 'FAIL')
        b.close()
finally:
    srv.terminate()
