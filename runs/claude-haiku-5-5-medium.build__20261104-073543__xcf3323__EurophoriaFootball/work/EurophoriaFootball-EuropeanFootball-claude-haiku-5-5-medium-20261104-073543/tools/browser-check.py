# Opens the deliverable in headless Chromium from file://, drives it with the keyboard, and reports page and console errors.
# It draws the real frames the headless test cannot (the test has no screen), and saves three screenshots to shots/.
# Run: python3 -I tools/browser-check.py  (exit code 1 if an error was reported)
import os, sys, pathlib
from playwright.sync_api import sync_playwright

here = pathlib.Path(__file__).resolve().parent.parent
work = here.parent
deliv = next(work.glob('EurophoriaFootball-*.html'))
shots = here / 'shots'; shots.mkdir(exist_ok=True)
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 960, 'height': 540})
    pg.on('pageerror', lambda e: errors.append('page: ' + str(e)))
    pg.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' else None)
    pg.goto(deliv.as_uri())
    pg.wait_for_timeout(1500)
    pg.screenshot(path=str(shots / 'title.png'))
    pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(150); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)   # KICK-ABOUT
    pg.keyboard.press('Enter'); pg.wait_for_timeout(300)                                                           # club 1
    pg.wait_for_timeout(2500)
    pg.screenshot(path=str(shots / 'match.png'))
    for k in ['ArrowRight', 'KeyJ', 'KeyK']:
        pg.keyboard.down(k) if k.startswith('Arrow') else pg.keyboard.press(k); pg.wait_for_timeout(400)
    pg.keyboard.up('ArrowRight'); pg.wait_for_timeout(1500)
    pg.screenshot(path=str(shots / 'play.png'))
    b.close()
errors = [e for e in errors if 'favicon' not in e]
for e in errors: print(e)
print(f'{len(errors)} browser error(s); screenshots in shots/' if errors else 'no browser errors; screenshots in shots/')
sys.exit(1 if errors else 0)
