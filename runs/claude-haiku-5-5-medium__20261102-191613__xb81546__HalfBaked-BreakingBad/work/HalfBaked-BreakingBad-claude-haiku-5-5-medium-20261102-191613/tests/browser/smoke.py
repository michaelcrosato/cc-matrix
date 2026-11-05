# Loads the bundled game in Chromium, records errors, and screenshots the title.
import sys, time, pathlib
from playwright.sync_api import sync_playwright

HTML = pathlib.Path(sys.argv[1]).resolve().as_uri()
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/hb-shots'
pathlib.Path(OUT).mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    page = browser.new_page(viewport={'width': 1280, 'height': 720})
    errors = []
    page.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)))
    page.on('console', lambda m: errors.append('CONSOLE ' + m.type + ' ' + m.text) if m.type in ('error', 'warning') else None)
    page.goto(HTML)
    time.sleep(3)
    page.screenshot(path=f'{OUT}/title.png')
    state = page.evaluate("() => ({ hasGame: !!window.HALF_BAKED, hasE: typeof My3D2dge !== 'undefined', hasHB: !!window.HB })")
    print('state', state)
    print('errors:', len(errors))
    for e in errors[:30]:
        print(e)
    browser.close()
