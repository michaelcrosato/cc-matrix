# The hub group: the protocol's harness at all five settings, then the game on its own. Stops only its own server, by PID.
import os, sys, json, re, subprocess, time
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
HUB = os.path.join(HERE, 'hub')
STEM = 'WeeTeeter-WiiFit-claude-opus-5-5-xhigh-20261104-221037.html'
def check(name, ok, detail=''):
    print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else ': ' + str(detail)[:400]), flush=True)
srv = subprocess.Popen([sys.executable, '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], cwd=HUB, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
port = re.search(r'port (\d+)', srv.stdout.readline()).group(1)
base = f'http://127.0.0.1:{port}'
SET = ['players=1&auto=1', 'players=2&auto=1', 'players=3&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave']
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        pg = b.new_page(viewport={'width': 1280, 'height': 720})
        pg.goto(f'{base}/game.html'); pg.wait_for_timeout(1500)
        check('the server serves this game', 'Wee Teeter' in pg.title(), pg.title())
        pg.close()
        for q in SET:
            pg = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(f'{base}/harness.html?game=game.html&{q}')
            t0 = time.time(); done = False; ghosts = 0
            while time.time() - t0 < 180:
                pg.wait_for_timeout(1000)
                if pg.evaluate("document.body.dataset.complete") == 'true': done = True; break
                for fr in pg.frames:
                    try:
                        if fr != pg.main_frame: ghosts = max(ghosts, fr.evaluate("window.G && G.Hub ? Object.keys(G.Hub.ghosts).length : 0"))
                    except Exception: pass
            d = json.loads(pg.evaluate("JSON.stringify(window.__hubCheck || null)") or 'null')
            check('harness ' + q, done and d and d.get('pass'), [c for c in (d or {}).get('checks', []) if not c.get('pass')])
            if 'players=2' in q: check('two copies see each other as ghosts', ghosts > 0, ghosts)
            pg.close()
        # on its own, the session client stays out of the way
        pg = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'{base}/game.html'); ok = False
        for _ in range(100):
            pg.wait_for_timeout(200)
            if pg.evaluate("window.G && G.game && G.game.sceneName") == 'title': ok = True; break
        check('the game on its own reaches the title', ok); check('no errors on its own', not errs, errs[:3])
        b.close()
finally:
    srv.terminate(); srv.wait()
