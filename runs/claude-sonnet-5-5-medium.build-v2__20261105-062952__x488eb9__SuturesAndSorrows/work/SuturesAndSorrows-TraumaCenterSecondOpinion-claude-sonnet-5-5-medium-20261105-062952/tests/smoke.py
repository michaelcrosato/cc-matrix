import sys, os, json, glob
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
html = glob.glob(os.path.join(root, '..', '*.html'))[0]
scene = sys.argv[1] if len(sys.argv) > 1 else ''
secs = float(sys.argv[2]) if len(sys.argv) > 2 else 3
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1920, 'height': 1080}); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:300])); pg.on('console', lambda m: errs.append('CONSOLE ' + m.text[:300]) if m.type == 'error' else None)
    pg.goto('file://' + html); pg.wait_for_timeout(int(secs * 1000))
    print(json.dumps(pg.evaluate("() => { const g = GAME.game; return { snap: g.debug.snapshot(), errors: g.errors.map(e => String(e.message || e).slice(0,300)) } }")))
    pg.screenshot(path=os.path.join(root, 'shots', 'smoke.png'))
    print('\n'.join(errs[:8]))
    b.close()
