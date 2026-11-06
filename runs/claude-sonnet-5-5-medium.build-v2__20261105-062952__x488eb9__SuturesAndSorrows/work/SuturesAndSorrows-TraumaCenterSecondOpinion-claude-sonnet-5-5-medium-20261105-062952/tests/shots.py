import sys, os, json, glob
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
html = glob.glob(os.path.join(root, '..', '*.html'))[0]
# usage: shots.py name "js to run" wait_ms [name "js" wait_ms ...]
args = sys.argv[1:]; steps = [(args[i], args[i + 1], int(args[i + 2])) for i in range(0, len(args), 3)]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1920, 'height': 1080}); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:400])); pg.on('console', lambda m: errs.append('CONSOLE ' + m.text[:300]) if m.type == 'error' else None)
    pg.goto('file://' + html); pg.wait_for_timeout(1500)
    for name, js, wait in steps:
        try: pg.evaluate(js)
        except Exception as e: errs.append('EVAL ' + name + ' ' + str(e)[:300])
        pg.wait_for_timeout(wait)
        pg.screenshot(path=os.path.join(root, 'shots', name + '.png'))
        print(name, pg.evaluate("() => JSON.stringify(GAME.game.debug.snapshot()) + ' ' + GAME.game.errors.map(e => String(e.message || e).slice(0, 200)).join(' | ')"))
    print('\n'.join(errs[:10])); b.close()
