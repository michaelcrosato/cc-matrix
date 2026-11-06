# Runs the harness at one setting: python3 tests/tools/hubcheck.py "players=2&auto=1" [seconds] [shot]
import sys, os, subprocess, re, json, time
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'hub'))
srv = subprocess.Popen([sys.executable, '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
line = srv.stdout.readline(); port = re.search(r'port (\d+)', line).group(1)
q = sys.argv[1] if len(sys.argv) > 1 else 'players=1&auto=1'
limit = int(sys.argv[2]) if len(sys.argv) > 2 else 250
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg = b.new_page(viewport={'width': 1280, 'height': 720})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{port}/harness.html?game=game.html&{q}')
        t0 = time.time(); done = False; seen = 0
        while time.time() - t0 < limit:
            pg.wait_for_timeout(2000)
            st = pg.evaluate("({ c: document.body.dataset.complete, n: (window.__hubCheck && window.__hubCheck.checks || []).length })")
            if os.environ.get('HUB_VERBOSE') and st['n'] != seen: seen = st['n']; print(int(time.time() - t0), 's checks', seen, flush=True)
            if st['c'] == 'true': done = True; break
        r = pg.evaluate("JSON.stringify(window.__hubCheck || null)")
        d = json.loads(r) if r else None
        print(q, 'done' if done else 'TIMEOUT', 'pass', d and d.get('pass'), int(time.time() - t0), 's')
        if d:
            for c in d.get('checks', []):
                if not c.get('pass'): print(' FAIL', c.get('name'), '::', str(c.get('detail'))[:300])
        if errs: print(' page errors', errs[:5])
        if len(sys.argv) > 3: pg.screenshot(path=sys.argv[3])
        b.close()
finally:
    srv.terminate(); srv.wait()
