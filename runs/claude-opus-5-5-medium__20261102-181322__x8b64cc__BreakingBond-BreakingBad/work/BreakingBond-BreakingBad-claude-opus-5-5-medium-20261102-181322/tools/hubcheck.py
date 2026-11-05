# Runs the AI Hub harness's automatic check against the bundled game. Usage: python3 tools/hubcheck.py DIR "query"
import sys, time, subprocess, random, json
from playwright.sync_api import sync_playwright
d, q = sys.argv[1], sys.argv[2]
port = random.randint(20000, 40000)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port)], cwd=d, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(.8)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1400, 'height': 900})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://localhost:{port}/harness.html?game=game.html&{q}')
        try: pg.wait_for_function('document.body.dataset.complete === "true"', timeout=int(sys.argv[3]) if len(sys.argv) > 3 else 240000)
        except Exception as e: print('TIMEOUT waiting for complete')
        res = pg.evaluate('JSON.stringify(window.__hubCheck || null)')
        print(res[:3000])
        pg.screenshot(path='/tmp/bb-x8b64cc/shots/hub.png')
        print('pageerrors', errs[:5])
        b.close()
finally: srv.terminate()
