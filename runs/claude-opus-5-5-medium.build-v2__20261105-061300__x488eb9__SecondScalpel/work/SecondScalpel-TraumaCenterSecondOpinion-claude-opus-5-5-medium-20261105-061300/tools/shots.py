# Screenshots for what scripts can't judge: python3 tools/shots.py name=js [...] ; each js runs in the page (G=GAME, g=game), waits a bit, snaps.
import os, sys, json
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.dirname(__file__) + '/..'); page_url = 'file://' + root + '/game.html'
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:300])); pg.on('console', lambda m: errs.append(m.text[:300]) if m.type == 'error' else None)
    pg.goto(page_url); pg.wait_for_timeout(1500)
    for a in sys.argv[1:]:
        name, _, js = a.partition('='); wait = 900
        if name.count(':'): name, w = name.split(':'); wait = int(w)
        pg.evaluate('() => { const G = window.GAME, g = G.game; ' + js + ' }'); pg.wait_for_timeout(wait)
        pg.screenshot(path=root + '/notes/shots/' + name + '.png')
    print(json.dumps(pg.evaluate('() => GAME.game.errors.map(e => e.message)'))[:600], errs[:6]); b.close()
