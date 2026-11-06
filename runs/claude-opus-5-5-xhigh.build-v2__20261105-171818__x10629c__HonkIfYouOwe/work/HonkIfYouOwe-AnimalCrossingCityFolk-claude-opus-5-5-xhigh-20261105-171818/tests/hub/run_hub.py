#!/usr/bin/env python3
# The Hub harness, each scenario asserted. Prints failures and a one-line count.
import json, os, re, subprocess, sys, time
from playwright.sync_api import sync_playwright
ARGS = ['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
here = os.path.dirname(os.path.abspath(__file__))
SCENARIOS = ['players=2', 'players=4&latency=150&jitter=50&loss=5', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave', 'players=2&scenario=server']
only = sys.argv[1:] or SCENARIOS
limit = os.environ.get('HUB_LIMIT', '20')
srv = subprocess.Popen(['python3', '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], cwd=here, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
try:
    line = srv.stdout.readline()
    port = re.search(r'port (\d+)', line).group(1)
    fails = 0; n = 0
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        for sc in only:
            n += 1
            page = b.new_page(viewport={'width': 1280, 'height': 800})
            url = f'http://127.0.0.1:{port}/harness.html?game=game.html&auto=1&limit={limit}&{sc}'
            page.goto(url)
            try:
                page.wait_for_function("document.body.dataset.complete === 'true'", timeout=420000)
            except Exception as e:
                print('TIMEOUT', sc); fails += 1; page.close(); continue
            report = page.evaluate('window.__hubCheck')
            title_ok = 'Honk' in page.evaluate("fetch('game.html').then(r=>r.text()).then(t=>t.slice(0,4000000).match(/<title>(.*?)<\\/title>/)[1])")
            if not title_ok: print('NOT OUR GAME', sc); fails += 1
            if not report.get('pass'):
                fails += 1
                print('FAIL', sc)
                for c in report.get('checks', []):
                    if not c.get('pass', c.get('ok')): print('   ', json.dumps(c)[:400])
            page.close()
        b.close()
    print(f'hub: {n} scenarios, {fails} failures')
    sys.exit(1 if fails else 0)
finally:
    srv.terminate(); srv.wait()
