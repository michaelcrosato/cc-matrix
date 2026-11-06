#!/usr/bin/env python3
# Hub harness runs. Prints failures only and a last line "N passed, M failed".
import os, shutil, subprocess, sys, glob, json, tempfile
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__)); dev = os.path.abspath(here + '/../..'); root = os.path.abspath(dev + '/..')
html = glob.glob(root + '/PresidentEvil4-*.html')[0]
t = dev + '/dist/hubtest'; shutil.rmtree(t, ignore_errors=True); os.makedirs(t)
shutil.copy(html, t + '/game.html')
for f in ['harness.html', 'bridge.js', 'round.js']: shutil.copy(dev + '/vendor/hub/' + f, t + '/' + f)
srv = subprocess.Popen(['python3', '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], cwd=t, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
line = srv.stdout.readline(); port = int(line.split('port ')[1].split(' ')[0])
runs = sys.argv[1:] or ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1', 'players=2&scenario=server&auto=1']
ok = bad = 0
try:
    with sync_playwright() as p:
        b = p.firefox.launch(headless=False, firefox_user_prefs={'dom.webgpu.enabled': True, 'gfx.webgpu.ignore-blocklist': True, 'dom.webgpu.workers.enabled': True, 'gfx.webgpu.force-enabled': True, 'security.sandbox.gpu.level': 0, 'security.sandbox.content.level': 0, 'media.autoplay.default': 0}) if os.environ.get('PE_BROWSER') == 'firefox' else p.chromium.launch(args=['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'])
        for r in runs:
            pg = b.new_page(viewport={'width': 1280, 'height': 800}); logs = []
            pg.on('pageerror', lambda e: logs.append(str(e)[:300]))
            pg.goto(f'http://127.0.0.1:{port}/harness.html?game=game.html&limit=20&{r}')
            try:
                pg.wait_for_function("document.body.dataset.complete === 'true'", timeout=300000)
                rep = pg.evaluate('window.__hubCheck')
                if rep.get('pass'): ok += 1
                else:
                    bad += 1; print('FAIL', r); print(json.dumps([c for c in rep.get('checks', []) if not c.get('pass') and not c.get('ok')], indent=0)[:1800]); print(logs[:4])
            except Exception as e:
                bad += 1; print('FAIL timeout', r, str(e)[:200]); print(pg.evaluate('JSON.stringify(window.__hubCheck||{}).slice(0,1200)')); print(logs[:4])
            pg.close()
        b.close()
finally:
    srv.terminate()
print(f'{ok} passed, {bad} failed')
sys.exit(1 if bad else 0)
