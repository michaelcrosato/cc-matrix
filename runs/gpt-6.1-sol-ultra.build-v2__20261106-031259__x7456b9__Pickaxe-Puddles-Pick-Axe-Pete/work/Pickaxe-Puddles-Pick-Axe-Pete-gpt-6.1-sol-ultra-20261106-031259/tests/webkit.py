"""Independent WebKit file launch and touch/control smoke, using the shipped artifact."""
from pathlib import Path
import json
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT.parent / 'build-config.json').read_text())
ARTIFACT = ROOT.parent / (CONFIG['stem'] + '.html')
count = 0
failures = []

def check(value, label):
    global count
    count += 1
    if not value:
        failures.append(label)

with sync_playwright() as p:
    browser = p.webkit.launch(headless=True)
    try:
        for width, height in [(390, 844), (844, 390)]:
            context = browser.new_context(viewport={'width': width, 'height': height}, has_touch=True, is_mobile=True)
            errors = []
            page = context.new_page()
            page.set_default_timeout(8000)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            page.goto(ARTIFACT.as_uri())
            page.wait_for_function('window.__pp?.ready === true', timeout=30000)
            page.evaluate('__pp.game.stop()')
            check(page.title() == CONFIG['title'], 'WebKit branding')
            check(page.evaluate("__pp.mode==='title' && __pp.game.errors.length===0"), 'WebKit native standalone title')
            page.locator('[data-do="expedition"]').tap()
            page.evaluate('__pp.game.advance(1.85)')
            check(page.evaluate("__pp.mode==='play' && __pp.screen===null && __pp.sim.miners[0].hero.z===16"), 'WebKit touch starts native play')
            check(page.evaluate('__pp.game.screen.OX>=-1 && __pp.game.screen.OY>=-1'), 'WebKit small screen uncropped')
            page.touchscreen.tap(width * .78, height * .62)
            page.evaluate('__pp.game.advance(.05)')
            check(page.evaluate("__pp.input.device==='touch' && __pp.sim.miners[0].hero.z>16"), 'WebKit actual touch jumps')
            page.locator('#pause-button').tap()
            page.evaluate('__pp.game.advance(.02)')
            check(page.evaluate("__pp.screen==='pause'"), 'WebKit touch pause')
            page.locator('[data-do="settings"]').tap()
            check(page.locator('#range-music').input_value() == '10', 'WebKit independent music default')
            check(not errors and page.evaluate('__pp.game.errors.length===0'), 'WebKit no page/native errors')
            page.evaluate('__pp.dispose()')
            context.close()
    finally:
        browser.close()

for failure in failures:
    print('FAIL ' + failure, file=sys.stderr)
print(f'{count - len(failures)}/{count} WebKit checks passed')
raise SystemExit(1 if failures else 0)
