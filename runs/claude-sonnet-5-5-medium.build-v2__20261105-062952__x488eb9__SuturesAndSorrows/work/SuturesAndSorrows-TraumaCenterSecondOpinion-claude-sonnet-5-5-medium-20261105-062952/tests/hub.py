# Hub harness: the four conformance runs (Appendix D). Prints failures and a one-line count. Needs the built HTML.
import json, os, re, shutil, subprocess, sys, glob
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
html = glob.glob(os.path.join(root, '..', '*.html'))[0]
work = os.path.join(root, 'tests', 'hubdir'); os.makedirs(work, exist_ok=True)
shutil.copy(html, os.path.join(work, 'game.html'))
for f in ['harness.html', 'bridge.js', 'round.js']: shutil.copy(os.path.join(root, 'vendor', 'hub', f), os.path.join(work, f))
srv = subprocess.Popen([sys.executable, '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1'], cwd=work, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
fails = []; n = 0
try:
    line = srv.stdout.readline(); port = int(re.search(r'port (\d+)', line).group(1)); base = f'http://127.0.0.1:{port}/'
    RUNS = ['players=2&auto=1', 'players=4&latency=150&jitter=50&loss=5&auto=1', 'players=4&latency=150&jitter=50&loss=5&scenario=host-leave&auto=1', 'players=2&scenario=server&auto=1']
    only = sys.argv[1:] 
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        for q in RUNS:
            if only and not any(o in q for o in only): continue
            pg = b.new_page(viewport={'width': 1280, 'height': 720}); pg.goto(base + 'harness.html?game=game.html&' + q)
            try: pg.wait_for_function("() => document.body.dataset.complete === 'true'", timeout=150000)
            except Exception as e: fails.append('TIMEOUT ' + q)
            r = pg.evaluate("() => { const h = window.__hubCheck; return h ? { pass: h.pass, failed: h.checks.filter(c => !c.pass).map(c => c.name + ': ' + c.detail), n: h.checks.length } : null }")
            title = pg.evaluate("() => { const f = document.querySelector('iframe'); try { return f && f.contentDocument && f.contentDocument.title } catch (e) { return 'x' } }")
            gerr = pg.evaluate("() => [...document.querySelectorAll('iframe')].map(f => { try { return f.contentWindow.GAME.game.errors.map(e => String(e.message || e).slice(0, 120)) } catch (e) { return [] } }).flat()"); n += 1
            if gerr: fails.append(q + ' game errors in frames: ' + json.dumps(gerr[:3]))
            n += (r or {}).get('n', 0)
            if not r or not r['pass']: fails.append(q + ' ' + json.dumps(r)[:900])
            if title and 'Sutures' not in title: fails.append(q + ' wrong page title ' + str(title))
            pg.close()
        pg = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto('file://' + html); pg.wait_for_timeout(1500)
        res = pg.evaluate("() => ({ active: AIHub.active, scene: GAME.game.debug.snapshot().scene })"); n += 1
        if res['active'] or res['scene'] != 'title' or errs: fails.append('standalone ' + json.dumps(res) + str(errs[:2]))
        pg.close(); b.close()
finally:
    srv.terminate(); srv.wait(timeout=5)
for f in fails: print('FAIL', f)
print(f'{n} hub checks, {len(fails)} failed')
