# Screenshots at 1920x1080 for the ten-foot judgement. usage: python3 tests/shot.py out_dir name=hash[,advance_seconds] ...
import sys, os
from playwright.sync_api import sync_playwright
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
f = os.path.abspath('../WhyFit-WiiFit-claude-opus-5-5-medium-20261104-221447.html')
with sync_playwright() as p:
    b = p.chromium.launch()
    for spec in sys.argv[2:]:
        name, _, rest = spec.partition('=')
        hash_, _, js = rest.partition('|')
        pg = b.new_page(viewport={'width': 1920, 'height': 1080})
        msgs = []
        pg.on('pageerror', lambda e: msgs.append(str(e)))
        pg.goto('file://' + f + hash_)
        pg.wait_for_function('window.G && G.game && G.game.sceneName', timeout=30000)
        pg.wait_for_timeout(1500)
        if js:
            pg.evaluate(js)
            pg.wait_for_timeout(2500)
        pg.screenshot(path=f'{out}/{name}.png')
        print(name, pg.evaluate('G.game.sceneName'), pg.evaluate('G.game.errors.map(e=>e.message).slice(0,3)'), msgs[:3])
        pg.close()
    b.close()
