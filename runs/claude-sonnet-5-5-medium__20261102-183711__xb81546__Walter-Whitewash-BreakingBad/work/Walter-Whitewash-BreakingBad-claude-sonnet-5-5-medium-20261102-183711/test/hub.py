# Runs the AI Hub harness (a simulated hub) against the bundled game: 2 and 4 players, with latency, and the host-leave scenario.
import sys, os, json, shutil, subprocess, time, tempfile
from playwright.sync_api import sync_playwright
FILE = os.path.abspath(sys.argv[1]); HUBDIR = os.path.abspath(sys.argv[2])
d = tempfile.mkdtemp(prefix='ww-hub-')
for f in ['harness.html', 'bridge.js', 'round.js']: shutil.copy(os.path.join(HUBDIR, f), d)
shutil.copy(FILE, os.path.join(d, 'game.html'))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8765', '-d', d], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
fails = 0
try:
  with sync_playwright() as pw:
    br = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    for q in ['players=1&auto=1', 'players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave']:
        p = br.new_context(viewport={'width': 1280, 'height': 800}).new_page(); errs = []
        p.on('pageerror', lambda e: errs.append(str(e)))
        p.goto(f'http://localhost:8765/harness.html?game=game.html&{q}')
        try: p.wait_for_function("document.body.dataset.complete === 'true'", timeout=100000)
        except Exception as e: print('timeout', q)
        res = p.evaluate("JSON.stringify(window.__hubCheck || {})")
        r = json.loads(res); ok = r.get('pass') is True
        print(('ok   ' if ok else 'FAIL ') + q, '' if ok else res[:1500]); fails += 0 if ok else 1
        if errs: print('  page errors', errs[:3])
        p.screenshot(path='/tmp/ww-shots/hub-' + q.split('&')[0] + '.png'); p.close()
    br.close()
finally:
    srv.terminate()
print('FAILED' if fails else 'ALL OK')
sys.exit(1 if fails else 0)
