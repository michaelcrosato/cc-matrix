# python3 tests/tools/gallery.py outdir id1 id2 ... : plays activities with a bot, screenshots mid-play and at results.
import sys, os
from playwright.sync_api import sync_playwright
out = sys.argv[1]; ids = sys.argv[2:]
stem = 'WeeTeeter-WiiFit-claude-opus-5-5-xhigh-20261104-221037.html'
path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', stem))
os.makedirs(out, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('file://' + path)
    pg.wait_for_function('window.G && G.game && G.game.sceneName === "title"', timeout=30000)
    pg.evaluate('G.game.fadeTime = 0')
    for spec in ids:
        idn, _, tier = spec.partition(':'); tier = int(tier or 0)
        pg.evaluate(f"G.devMember(5); G.S.freePlay = true; G.S.instructor = 'birch'; G.DEV.bot = 'good'; G.go('act_{idn}', {{ tier: {tier}, from: 'dev' }}, {{ fade: 0 }})")
        pg.wait_for_timeout(700)
        pg.screenshot(path=f'{out}/{idn}{tier}_card.png')
        pg.keyboard.press('Enter')
        pg.wait_for_timeout(2500)
        pg.screenshot(path=f'{out}/{idn}{tier}_demo.png')
        pg.wait_for_function(f"G.scenes.act_{idn}.phase() === 'play'", timeout=20000)
        pg.wait_for_timeout(9000)
        pg.screenshot(path=f'{out}/{idn}{tier}_play.png')
        print(spec, pg.evaluate(f"G.scenes.act_{idn}.run().time"), errs[:3])
    b.close()
