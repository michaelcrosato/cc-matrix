"""Hub harness check: serves the built file beside the harness (127.0.0.1, an OS-picked port, only that process stopped), opens
harness.html?game=game.html&players=N&auto=1, waits for __hubCheck.pass and body[data-complete=true], and reports.
Usage: python3 labs/game/tools/hubcheck.py <dir with game.html + harness files> <players> [extra query]"""
import sys, os, time, json, subprocess, re
from playwright.sync_api import sync_playwright
d = sys.argv[1]; n = sys.argv[2]; extra = sys.argv[3] if len(sys.argv) > 3 else ''
srv = subprocess.Popen(['python3', '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], cwd=d, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
port = None
for _ in range(50):
    line = srv.stdout.readline()
    m = re.search(r'port (\d+)', line)
    if m: port = m.group(1); break
ARGS = ['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS); pg = b.new_page(viewport={'width': 1400, 'height': 900}); logs = []
        pg.on('console', lambda m: logs.append(m.type + ': ' + m.text[:200]) if m.text.startswith('[AIHub]') or m.type == 'error' else None)
        pg.goto(f'http://127.0.0.1:{port}/harness.html?game=game.html&players={n}&latency=150&jitter=50&loss=5&auto=1&play=8000{extra}', wait_until='commit')
        print('opened', flush=True); t0 = time.time(); done = False
        while time.time() - t0 < 420:
            done = pg.evaluate("document.body.dataset.complete === 'true'")
            if done: break
            if int(time.time() - t0) % 30 == 0: print('...', int(time.time() - t0), pg.evaluate("JSON.stringify((window.__hubCheck||{}).pass)"), flush=True)
            time.sleep(3)
        res = json.loads(pg.evaluate("JSON.stringify(window.__hubCheck || {})") or '{}')
        bad = [c for c in res.get('checks', []) if not c.get('pass')]
        print('HUB', n, extra, 'complete' if done else 'INCOMPLETE', 'PASS' if res.get('pass') else 'FAIL', int(time.time() - t0), 's')
        for c in bad: print('  FAILED:', c['name'], '|', str(c.get('detail'))[:200])
        print('\n'.join(logs[:6]))
        pg.screenshot(path=os.path.join(d, f'harness-{n}.png')); b.close()
finally:
    srv.terminate()
