# Screenshots of stages (dressing, spans, walls) for review: .cache/shots/stage-<id>.png
import pathlib, sys
from playwright.sync_api import sync_playwright
HERE = pathlib.Path(__file__).resolve().parent.parent
BUNDLE = HERE.parent / 'OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-haiku-5-5-medium-20261104-043153.html'
SHOTS = HERE / '.cache' / 'shots'
ids = sys.argv[1:] or ['S1', 'S3', 'S5', 'S8', 'S10', 'S15']
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 960, 'height': 540}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BUNDLE.as_uri()); pg.wait_for_timeout(1500)
    for sid in ids:
        pg.evaluate("(id) => { OB.game.go('race', { mode: 'demo', demo: true, car: 'orchidea', paint: 0, passenger: 'marisol', route: [id], seed: 7, cheats: { noCollide: true, infiniteTime: true } }, {fade: 0}); }", sid)
        pg.wait_for_timeout(4000)
        pg.evaluate("() => { const r = OB.race; r.car.z = r.stage.len * .35; r.car.v = 200; }")
        pg.wait_for_timeout(1200)
        pg.screenshot(path=str(SHOTS / f'stage-{sid}.png')); print(sid, 'ok')
    print('errors', errs[:3]); b.close()
