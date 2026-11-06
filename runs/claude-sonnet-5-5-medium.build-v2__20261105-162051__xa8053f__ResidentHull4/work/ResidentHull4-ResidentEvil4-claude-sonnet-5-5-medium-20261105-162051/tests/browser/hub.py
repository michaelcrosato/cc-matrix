import subprocess, re, time, sys, os
from common import *
SITE = os.path.join(ROOT, 'tests', 'hubsite')
def run(r, only=None):
    srv = subprocess.Popen(['python3', '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], cwd=SITE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    port = None
    for _ in range(50):
        line = srv.stdout.readline(); m = re.search(r'port (\d+)', line)
        if m: port = int(m.group(1)); break
    try:
        with sync_playwright() as p:
            b = launch(p); 
            for name, q in [('2p', 'players=2&auto=1'), ('4p lossy', 'players=4&latency=150&jitter=50&loss=5&auto=1'), ('host-leave', 'players=2&scenario=host-leave&auto=1'), ('server', 'players=2&scenario=server&auto=1')]:
                if only and only not in name: continue
                pg = b.new_page(viewport={'width': 1100, 'height': 800}); errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)))
                pg.goto(f'http://127.0.0.1:{port}/harness.html?game=game.html&{q}')
                try: pg.wait_for_function("document.body.dataset.complete === 'true'", timeout=150000)
                except Exception as e: r.check('hub ' + name + ' completes', False, str(e)[:100]); pg.close(); continue
                res = pg.evaluate("window.__hubCheck")
                r.check('hub ' + name + ' passes', bool(res and res.get('pass')), str(res)[:600])
                pg.close()
            b.close()
    finally:
        srv.terminate()
if __name__ == '__main__':
    r = R(); run(r, sys.argv[1] if len(sys.argv) > 1 else None); print(f'{r.passed} passed, {r.failed} failed')
