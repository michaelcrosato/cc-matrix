# Runs the AI Hub harness against the built game: a loopback server on a port the OS picks, then Playwright.
# Usage: python3 run_hub.py [query]   (default: 2 players, auto). Stops only the server process it started.
import subprocess, sys, re, time, os
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
srv = subprocess.Popen([sys.executable, '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], cwd=here, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
try:
    line = srv.stdout.readline()
    m = re.search(r'port (\d+)', line)
    port = m.group(1)
    base = f'http://127.0.0.1:{port}'
    query = sys.argv[1] if len(sys.argv) > 1 else 'players=2&auto=1&limit=60'
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        page = b.new_page(viewport={'width': 1280, 'height': 720})
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)[:200]))
        page.goto(f'{base}/harness.html?game=karate.html&{query}')
        t0 = time.time()
        done = False
        last=0
        while time.time() - t0 < 900:
            page.wait_for_timeout(2000)
            if time.time()-last > 30:
                last=time.time(); print('waiting', round(time.time()-t0), 's', flush=True)
            try:
                done = page.evaluate("document.body && document.body.dataset.complete === 'true'")
            except Exception:
                pass
            if done: break
        res = page.evaluate("window.__hubCheck ? {pass: window.__hubCheck.pass, checks: (window.__hubCheck.checks||[]).map(c => ({name: c.name, pass: c.pass, detail: c.detail}))} : null")
        print('complete:', done, 'after', round(time.time()-t0), 's')
        if res:
            print('PASS:', res.get('pass'))
            for c in res.get('checks', []):
                if not c.get('pass'): print('  FAIL', c.get('name'), '-', str(c.get('detail'))[:200])
            print('  checks:', len(res.get('checks', [])), 'ok', sum(1 for c in res.get('checks', []) if c.get('pass')))
        else:
            print('no __hubCheck yet')
        print('page errors:', errs[:3])
        b.close()
finally:
    srv.terminate(); srv.wait(timeout=10)
