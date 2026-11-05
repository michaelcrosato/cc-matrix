# Browser pass of the built bundle (Chromium through Playwright, from file://): every screen opens and nothing throws.
# Prints one line per failure, then a count. Called by tests/run.mjs. Usage: python3 tests/browser.py <bundle.html> [shots-dir]
import sys, os, time
from playwright.sync_api import sync_playwright

bundle = os.path.abspath(sys.argv[1])
shots = sys.argv[2] if len(sys.argv) > 2 else None
S = 'window.My3D2dge.current'
fails, passed = [], 0

def check(name, ok, detail=''):
    global passed
    if ok: passed += 1
    else: fails.append(name + (' :: ' + str(detail) if detail else ''))

with sync_playwright() as p:
    browser = p.chromium.launch()
    pg = browser.new_page(viewport={'width': 1280, 'height': 720})
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto('file://' + bundle)
    time.sleep(2)
    scene = lambda: pg.evaluate(f"{S}.sceneName")
    shot = lambda n: pg.screenshot(path=os.path.join(shots, n)) if shots else None
    check('title is up after load', scene() == 'title', scene())
    shot('title.png')
    pg.keyboard.press('Enter'); time.sleep(.9)
    check('Enter opens the menu', scene() == 'menu', scene())
    shot('menu.png')
    pg.keyboard.press('Enter'); time.sleep(.9)
    pg.keyboard.press('Enter'); time.sleep(3.4)
    check('campaign reaches play', scene() == 'hunt' and pg.evaluate(f"{S}.debug.snapshot().phase") == 'play')
    pg.evaluate(f"{S}.debug.spawn('buck', {{d: .62, x: .42, dir: 1}})"); time.sleep(.5)
    shot('play.png')
    pg.evaluate(f"{S}.debug.skipSeg()"); time.sleep(3.4)
    check('a site ends in the Shot Chart', pg.evaluate(f"{S}.debug.snapshot().phase") == 'tally', pg.evaluate(f"{S}.debug.snapshot().phase"))
    shot('tally.png')
    pg.evaluate(f"{S}.go('lodge')"); time.sleep(.9)
    check('the lodge opens', scene() == 'lodge')
    shot('lodge.png')
    pg.evaluate(f"{S}.go('about')"); time.sleep(.9)
    check('the about screen opens', scene() == 'about')
    shot('about.png')
    pg.evaluate(f"{S}.go('dev', {{from: 'menu'}})"); time.sleep(.9)
    check('dev mode opens', scene() == 'dev')
    shot('dev.png')
    pg.evaluate(f"{S}.go('hunt', {{mode: 'bonus', game: 'crow'}})"); time.sleep(3.2)
    check('a bonus game plays', pg.evaluate(f"{S}.debug.snapshot().segType") == 'bonus')
    shot('bonus.png')
    pg.evaluate(f"{S}.go('hunt', {{mode: 'practice'}})"); time.sleep(5)
    check('the practice range plays its first station', pg.evaluate(f"{S}.debug.snapshot().segType") == 'range')
    shot('range.png')
    pg.evaluate(f"{S}.go('hunt', {{mode: 'party', game: 3}})"); time.sleep(3.5)
    check('a party hunt plays the first turn', pg.evaluate(f"{S}.debug.snapshot().seg") == 0)
    pg.evaluate(f"{S}.go('animallab', {{from: 'dev'}})"); time.sleep(.9)
    check('the Animal Lab draws', scene() == 'animallab')
    shot('animallab.png')
    pg.evaluate(f"{S}.go('soundlab', {{from: 'dev'}})"); time.sleep(.9)
    check('the Sound Lab draws', scene() == 'soundlab')
    shot('soundlab.png')
    pg.evaluate(f"{S}.go('hunt', {{mode: 'attract'}})"); time.sleep(12)
    check('attract plays on its own', pg.evaluate(f"{S}.debug.snapshot().bot") is True)
    shot('attract.png')
    pg.keyboard.press('Space'); time.sleep(.9)
    check('any key leaves attract for the title', scene() == 'title', scene())
    check('no page errors in the browser pass', not errors, ' | '.join(errors[:3]))
    browser.close()

for f in fails: print('FAIL ' + f)
print(f'browser: {passed} passed, {len(fails)} failed')
sys.exit(1 if fails else 0)
