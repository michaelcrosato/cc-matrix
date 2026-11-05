# Opens the root bundle by file:// in Chromium: no console errors, no network requests, the title is reached.
# Saves screenshots of the title, the menu and a race into .cache/shots/ for review.
import sys, json, pathlib
from playwright.sync_api import sync_playwright
HERE = pathlib.Path(__file__).resolve().parent.parent
BUNDLE = HERE.parent / 'OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-haiku-5-5-medium-20261104-043153.html'
SHOTS = HERE / '.cache' / 'shots'; SHOTS.mkdir(parents=True, exist_ok=True)
errors, requests = [], []
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('request', lambda r: requests.append(r.url) if not r.url.startswith('file://') and not r.url.startswith('data:') else None)
    pg.goto(BUNDLE.as_uri())
    pg.wait_for_timeout(2500)
    snap = lambda: pg.evaluate("() => { const g = window.My3D2dge && My3D2dge.current; return g ? g.debug.snapshot() : null; }")
    s = snap(); print('scene', s and s['scene'])
    pg.screenshot(path=str(SHOTS / 'title.png'))
    pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)
    pg.screenshot(path=str(SHOTS / 'menu.png'))
    pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)   # arcade run: the garage
    for _ in range(4): pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(150)
    pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)   # start
    pg.wait_for_timeout(4500)                               # countdown and some driving
    pg.keyboard.down('ArrowUp'); pg.wait_for_timeout(2500); pg.keyboard.up('ArrowUp')
    pg.screenshot(path=str(SHOTS / 'race.png'))
    s = snap(); print('race', json.dumps({k: s[k] for k in ['scene', 'stage', 'v', 'clock', 'status'] if k in s}))
    b.close()
print('console errors:', len(errors), errors[:5])
print('external requests:', len(requests), requests[:3])
