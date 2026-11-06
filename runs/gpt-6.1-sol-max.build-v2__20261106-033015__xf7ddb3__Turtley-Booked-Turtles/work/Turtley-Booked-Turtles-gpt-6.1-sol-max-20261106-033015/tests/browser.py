import json
import pathlib
import sys
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parents[1]
url = (root / 'build/game.html').as_uri()
failures = []
count = 0

def check(name, okay, detail=''):
    global count
    count += 1
    if not okay:
        failures.append(name + ': ' + str(detail))

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url)
    page.wait_for_timeout(500)
    if not page.evaluate('!!window.TB?.app'):
        print(json.dumps({'count': 1, 'failures': errors or ['Application did not initialize']}))
        browser.close()
        sys.exit(1)
    page.wait_for_timeout(300)
    check('export title identity', page.title() == 'Turtley Booked')
    check('engine is foundation', page.evaluate('!!TB.app.game.input && !!TB.app.game.audio && TB.app.game.view.id === "overhead"'))
    page.screenshot(path=str(root / 'build/title-tv.png'))
    page.get_by_role('button', name='Check in • Solo', exact=True).click()
    page.wait_for_timeout(2300)
    check('solo starts production world', page.evaluate('TB.app.run.phase === "playing"'))
    check('music gain default', page.evaluate('TB.app.game.settings.music === .1 && TB.app.game.audio.musicVolume === .1'))
    page.screenshot(path=str(root / 'build/play-tv.png'))
    page.keyboard.press('Escape')
    page.wait_for_timeout(150)
    check('native pause', page.evaluate('TB.app.game.paused && TB.app.ui.screen === "pause"'))
    page.get_by_role('button', name='Developer tools', exact=True).click()
    check('dev screen', page.get_by_role('heading', name='The caretaker’s cupboard').count() == 1)
    page.get_by_role('button', name='Balance sliders', exact=True).click()
    check('live sliders', page.locator('.esh input[type=range]').count() == 8)
    page.screenshot(path=str(root / 'build/dev-tv.png'))
    check('no runtime or draw errors', not errors and page.evaluate('TB.app.game.errors.length') == 0, errors or page.evaluate('TB.app.game.errors'))
    page.close()
    blocked=browser.new_page(viewport={'width':1280,'height':800})
    blocked.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage blocked','SecurityError')}})")
    blocked.goto(url)
    blocked.get_by_role('button',name='Check in • Solo',exact=True).click()
    blocked.evaluate('TB.app.game.settings.set("music",.2)')
    check('browser denied storage remains playable',blocked.evaluate('TB.app.game.errors.length===0&&TB.app.game.audio.musicVolume===.2'))
    blocked.close()
    browser.close()
print(json.dumps({'count': count, 'failures': failures}))
sys.exit(1 if failures else 0)
