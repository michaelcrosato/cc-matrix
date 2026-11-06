import json
import shutil
import sys
import traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
from browser_extra import more_flows, gamepads, touch_profiles, storage_and_browsers

ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = ROOT.parent / (ROOT.name + '.html')
EVIDENCE = ROOT / 'evidence'
ISOLATED = EVIDENCE / 'isolated'
ISOLATED.mkdir(exist_ok=True)
shutil.copyfile(ARTIFACT, ISOLATED / 'cartridge.html')
URL = (ISOLATED / 'cartridge.html').as_uri()
checks = 0
failures = []
observations = {}

def check(name, condition, detail=''):
    global checks
    checks += 1
    if not condition:
        failures.append({'name': name, 'detail': str(detail)})

def snap(page):
    return page.evaluate('window.__game.game.debug.snapshot()')

def action(page, key):
    page.keyboard.press(key)
    page.wait_for_timeout(110)

def choose(page, label, touch=False):
    page.wait_for_function('(label) => window.__game?.game.debug.snapshot().rows.some(r=>r.label===label)', arg=label)
    row = page.evaluate('(label) => __game.game.debug.snapshot().rows.find(r=>r.label===label)', label)
    point = page.evaluate('(b) => {const c=document.querySelector("canvas").getBoundingClientRect();return {x:c.x+(b.x+b.w/2)/__game.game.W*c.width,y:c.y+(b.y+b.h/2)/__game.game.H*c.height}}', row['box'])
    (page.touchscreen.tap if touch else page.mouse.click)(point['x'], point['y'])
    page.wait_for_timeout(150)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        observations['chromiumVersion'] = browser.version
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})
        errors = []
        warnings = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: warnings.append(m.text) if m.type in ['warning', 'error'] else None)
        page.goto(URL)
        page.wait_for_function('window.__game?.game.debug.snapshot().screen === "title"')
        page.screenshot(path=str(EVIDENCE / 'title-1080.png'))
        check('Isolated exported file boots into the title', snap(page)['screen'] == 'title')
        check('Music initializes at exactly 10%', snap(page)['settings']['music'] == .1)
        choose(page, 'SOLO DEFENSE')
        check('Solo lobby can be selected by pointer', snap(page)['screen'] == 'lobby', snap(page)['screen'])
        choose(page, 'CONTROLS & DEPLOY')
        check('Lobby leads to a short control card', snap(page)['screen'] == 'controls')
        choose(page, 'DEPLOY CANNONS')
        page.wait_for_function('__game.app.sim?.s.tick > 350')
        check('Control card starts ordinary combat', snap(page)['screen'] == 'play')
        action(page, 'Space')
        page.keyboard.down('Space')
        page.keyboard.down('a')
        page.wait_for_function('__game.app.sim.s.tutorial.moved && __game.app.sim.s.tutorial.fired')
        page.keyboard.up('a')
        page.keyboard.up('Space')
        page.screenshot(path=str(EVIDENCE / 'combat-1080.png'))
        check('Keyboard movement and hold fire reach the simulation', snap(page)['world']['tutorial']['fired'])
        action(page, 'Escape')
        check('Escape opens the pause screen', snap(page)['screen'] == 'pause', snap(page)['screen'])
        paused = snap(page)['world']['tick']
        page.wait_for_timeout(150)
        check('Standalone overlay freezes authoritative simulation', snap(page)['world']['tick'] == paused)
        choose(page, 'DEVELOPER TOOLS')
        choose(page, 'LIVE BALANCE / CANNON')
        page.screenshot(path=str(EVIDENCE / 'balance-1080.png'))
        action(page, 'ArrowRight')
        check('Live balance change marks run assisted', snap(page)['world']['assisted'])
        more_flows(p, browser, page, check, snap, action, choose, EVIDENCE, URL, observations)
        observations['screen'] = snap(page)['screen']
        observations['errors'] = errors
        observations['warnings'] = warnings
        check('Export native draw and update produce no errors', not errors and not page.evaluate('__game.game.errors.length'), errors)
        check('Export produces no engine warnings', not warnings, warnings)
        page.close()
        gamepads(browser, check, snap, action, choose, URL)
        touch_profiles(p, browser, check, snap, choose, EVIDENCE, URL)
        storage_and_browsers(p, browser, check, snap, choose, URL)
        browser.close()

try:
    run()
except Exception:
    failures.append({'name': 'Browser suite execution', 'detail': traceback.format_exc()})
(EVIDENCE / 'browser-tests.json').write_text(json.dumps({'count': checks, 'failures': failures, 'observations': observations}, indent=2))
for f in failures:
    print('FAIL ' + f['name'] + ': ' + f['detail'], file=sys.stderr)
print(json.dumps({'suite': 'browser', 'count': checks, 'failed': len(failures)}))
sys.exit(1 if failures else 0)
