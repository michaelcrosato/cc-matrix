from pathlib import Path
import json
from playwright.sync_api import sync_playwright

base = Path(__file__).resolve().parent
art = base / 'test-artifacts'
art.mkdir(exist_ok=True)
url = (base.parent / (base.name + '.html')).as_uri() + '?renderer=webgl'
results = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'])
    try:
        for label, width, height, touch in [('desktop',1920,1080,False), ('phone',390,844,True), ('landscape',844,390,True)]:
            context = browser.new_context(viewport={'width':width,'height':height}, device_scale_factor=1, is_mobile=touch, has_touch=touch, ignore_https_errors=True)
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            try:
                page.goto(url, wait_until='domcontentloaded', timeout=60000)
                page.wait_for_function('window.__game && window.__game.scene', timeout=60000)
                page.evaluate("async () => { await window.__game.action('start'); window.__game.step(4); }")
                page.wait_for_timeout(900)
                page.screenshot(path=str(art / ('qa-' + label + '.png')), timeout=15000)
                results.append({'view':label,'snapshot':page.evaluate("() => ({screen:__game.snapshot().screen,renderer:__game.snapshot().renderer,phase:__game.snapshot().phase,players:__game.snapshot().players.length,scrollWidth:document.documentElement.scrollWidth,innerWidth,innerHeight})"),'errors':errors})
            finally:
                context.close()
    finally:
        browser.close()
print(json.dumps(results, indent=2))
