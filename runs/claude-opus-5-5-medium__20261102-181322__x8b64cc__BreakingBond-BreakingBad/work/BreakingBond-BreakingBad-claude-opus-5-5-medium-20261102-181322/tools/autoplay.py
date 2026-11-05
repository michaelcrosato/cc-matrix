# Autoplay: the attract bot plays each chapter start to finish (it cheats: invulnerable, unseen, no-clip when stuck),
# proving every beat's script can complete. Usage: python3 tools/autoplay.py [chapter indexes...]
import sys, json, time, subprocess, os, random
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
NAME = 'BreakingBond-BreakingBad-claude-opus-5-5-medium-20261102-181322.html'
port = random.randint(20000, 40000)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(.8)
chs = [int(a) for a in sys.argv[1:]] or [0, 1, 2, 3, 4, 5]
errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 960, 'height': 540})
        pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
        pg.goto(f'http://localhost:{port}/{NAME}'); pg.wait_for_function('window.__bb', timeout=20000); pg.wait_for_timeout(1500)
        for c in chs:
            pg.evaluate(f'window.__bb.go("play", {{ ch: {c}, beat: 0, test: true }})'); pg.wait_for_timeout(500)
            last = None; t0 = time.time(); ok = False
            while time.time() - t0 < 240:
                pg.evaluate('My3D2dge && (window.__bb.state().W && (window.__bb.state().W.slow = 0)); window.__g = window.__g || null')
                s = json.loads(pg.evaluate('JSON.stringify(window.__bb.snapshot())'))
                key = (s['scene'], s['beat'], s['objective'], s['cooking'], s['enemies'])
                if key != last: print(f'  ch{c} t={time.time()-t0:5.1f}', key, 'hero', s['hero'], 'cash', s['cash']); last = key
                if s['scene'] == 'results': ok = True; break
                if s['scene'] not in ('play',): print('  left play:', s['scene']); break
                pg.wait_for_timeout(500)
            pg.screenshot(path=f'/tmp/bb-x8b64cc/shots/auto-ch{c}.png')
            print(f'CHAPTER {c}:', 'COMPLETE' if ok else 'STUCK', f'{time.time()-t0:.0f}s')
        b.close()
finally: srv.terminate()
print('--- errors ---'); [print(e[:300]) for e in dict.fromkeys(errs)]
