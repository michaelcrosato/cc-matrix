# Screenshots of chosen moments: python3 tools/moments.py "name|js to start|wait ms" ...
import sys, time, subprocess, os, random, json
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
NAME = 'BreakingBond-BreakingBad-claude-opus-5-5-medium-20261102-181322.html'
port = random.randint(20000, 40000)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(.8)
errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': int(os.environ.get('VW', 1280)), 'height': int(os.environ.get('VH', 720))})
        pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error',) else None)
        pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
        pg.goto(f'http://localhost:{port}/{NAME}'); pg.wait_for_function('window.__bb', timeout=20000); pg.wait_for_timeout(1500)
        for spec in sys.argv[1:]:
            name, js, ms = spec.split('|')
            for part in js.split(';;'):
                if part.startswith('key:'): pg.keyboard.press(part[4:])
                elif part.startswith('hold:'): pg.keyboard.down(part[5:])
                elif part.startswith('up:'): pg.keyboard.up(part[3:])
                elif part.startswith('wait:'): pg.wait_for_timeout(int(part[5:]))
                elif part: pg.evaluate(part)
            pg.wait_for_timeout(int(ms)); pg.screenshot(path=f'/tmp/bb-x8b64cc/shots/{name}.png'); print(name, pg.evaluate('JSON.stringify(window.__bb.snapshot())'))
        b.close()
finally: srv.terminate()
print('errors:', list(dict.fromkeys(errs))[:10])
