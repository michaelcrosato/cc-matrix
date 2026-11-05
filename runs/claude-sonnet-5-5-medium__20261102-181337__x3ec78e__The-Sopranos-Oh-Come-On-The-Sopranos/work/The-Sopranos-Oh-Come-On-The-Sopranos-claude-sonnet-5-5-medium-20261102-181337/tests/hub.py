# Runs the AI Hub harness against the built game: python3 tests/hub.py [players] [extra query]
import sys, os, subprocess, time, json, shutil
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
html = os.path.join(here, '..', '..', 'The-Sopranos-Oh-Come-On-The-Sopranos-claude-sonnet-5-5-medium-20261102-181337.html')
srv = os.path.join('/tmp', 'hubtest'); os.makedirs(srv, exist_ok=True)
for f in ('harness.html', 'bridge.js', 'round.js'): shutil.copy(os.path.join(here, f), srv)
shutil.copy(html, os.path.join(srv, 'game.html'))
import random; port = random.randint(20000, 40000)
p = subprocess.Popen(['python3', '-m', 'http.server', str(port)], cwd=srv, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    players = sys.argv[1] if len(sys.argv) > 1 else '2'
    extra = sys.argv[2] if len(sys.argv) > 2 else ''
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
        pg = b.new_page(viewport={'width': 1400, 'height': 800})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://localhost:{port}/harness.html?game=game.html&players={players}&auto=1{extra}')
        for _ in range(150):
            if pg.evaluate("document.body.dataset.complete") == 'true': break
            pg.wait_for_timeout(1000)
        res = pg.evaluate("window.__hubCheck")
        print(json.dumps(res, indent=1)[:3500])
        pg.screenshot(path='/tmp/shots/hub-%s.png' % players)
        print('pageerrors', errs[:5])
        b.close()
finally:
    p.terminate()
