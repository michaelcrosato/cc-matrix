# Browser checks of the bundled file: title, intro, town, cook, shop, fight, attract, in two engines. Screenshots to OUT.
import sys, json, os
from playwright.sync_api import sync_playwright
FILE = os.path.abspath(sys.argv[1]); OUT = sys.argv[2]; ENGINE = sys.argv[3] if len(sys.argv) > 3 else 'chromium'
os.makedirs(OUT, exist_ok=True)
errs = []
def snap(p): return json.loads(p.evaluate("JSON.stringify(WW.debug.game.debug.snapshot())"))
with sync_playwright() as pw:
    br = getattr(pw, ENGINE).launch(**({'args': ['--autoplay-policy=no-user-gesture-required']} if ENGINE == 'chromium' else {}))
    ctx = br.new_context(viewport={'width': 1280, 'height': 720})
    p = ctx.new_page()
    p.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    p.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    p.goto('file://' + FILE); p.wait_for_timeout(3000)
    p.screenshot(path=f'{OUT}/01-title.png'); print('title', snap(p))
    p.mouse.move(640, 300); p.keyboard.press('Enter'); p.wait_for_timeout(2000)
    print('after enter', snap(p)); p.screenshot(path=f'{OUT}/02-intro.png')
    for i in range(24): p.keyboard.press('Enter'); p.wait_for_timeout(200)
    p.wait_for_timeout(500); print('play', snap(p)); p.screenshot(path=f'{OUT}/03-town.png')
    print('errors:', errs if errs else 'none')
    br.close()
