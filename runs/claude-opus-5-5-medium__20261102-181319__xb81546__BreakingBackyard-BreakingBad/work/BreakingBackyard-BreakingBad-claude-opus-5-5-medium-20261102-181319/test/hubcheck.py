# Runs the AI Hub harness (lib/hub/harness.html) against the single-file build, in a temp folder, for each scenario the
# hub's own test runs, and prints window.__hubCheck.
import sys, os, shutil, subprocess, socket, time, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'BreakingBackyard-BreakingBad-claude-opus-5-5-medium-20261102-181319.html'
TMP = '/tmp/bb-xb81546/hubserve'
os.makedirs(TMP, exist_ok=True)
for f in ['harness.html', 'bridge.js', 'round.js']: shutil.copy(os.path.join(HERE, '..', 'hub', f), TMP)
shutil.copy(os.path.join(HERE, '..', '..', NAME), os.path.join(TMP, 'game.html'))
s = socket.socket(); s.bind(('127.0.0.1', 0)); PORT = s.getsockname()[1]; s.close()
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=TMP, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(.8)
SCEN = ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave', 'players=1&auto=1']
fails = 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for q in SCEN:
        page = b.new_page(viewport={'width': 1400, 'height': 900})
        page.goto(f'http://127.0.0.1:{PORT}/harness.html?game=game.html&limit=40&{q}')
        try: page.wait_for_function('document.body.dataset.complete === "true"', timeout=150000)
        except Exception as e: print('timeout', q)
        res = page.evaluate('JSON.stringify(window.__hubCheck || null)')
        r = json.loads(res) if res else None
        ok = bool(r and r.get('pass'))
        print(('ok   ' if ok else 'FAIL ') + q)
        if not ok:
            fails += 1; print(json.dumps(r, indent=1)[:3000])
        page.screenshot(path=f'/tmp/bb-xb81546/shots/hub-{len(q)}.png')
        page.close()
    b.close()
srv.terminate()
sys.exit(1 if fails else 0)
