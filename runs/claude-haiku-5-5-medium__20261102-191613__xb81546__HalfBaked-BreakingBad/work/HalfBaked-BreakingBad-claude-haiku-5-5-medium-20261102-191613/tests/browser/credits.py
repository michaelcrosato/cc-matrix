# Opens the credits and saves a screenshot of the first screen (the source information and the wrapped feedback).
import sys, time, pathlib
from playwright.sync_api import sync_playwright
HTML = pathlib.Path(sys.argv[1]).resolve().as_uri()
OUT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else '/tmp/hb-shots'); OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(); page = b.new_page(viewport={'width': 1280, 'height': 720})
    errs = []
    page.on('pageerror', lambda e: errs.append(str(e)))
    page.goto(HTML); time.sleep(2.5)
    page.evaluate("() => window.HALF_BAKED.game.go('credits', {})"); time.sleep(3)
    page.screenshot(path=str(OUT / 'credits.png'))
    print('scene', page.evaluate('() => window.HALF_BAKED.scene()'), 'page errors', errs, flush=True)
    b.close()
