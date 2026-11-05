# Screenshots of a fork: the car placed before the junction, in it, and after the decision. .cache/shots/fork-*.png
import pathlib
from playwright.sync_api import sync_playwright
HERE = pathlib.Path(__file__).resolve().parent.parent
BUNDLE = HERE.parent / 'OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-haiku-5-5-medium-20261104-043153.html'
SHOTS = HERE / '.cache' / 'shots'
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 960, 'height': 540}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BUNDLE.as_uri()); pg.wait_for_timeout(1500)
    pg.evaluate("() => { OB.game.go('race', { mode: 'demo', demo: true, car: 'orchidea', paint: 0, passenger: 'marisol', route: null, seed: 3, cheats: { noCollide: true, infiniteTime: true }, bot: null }, {fade: 0}); }")
    pg.wait_for_timeout(4200)
    for name, z in [('approach', 'st.junction - 6000'), ('junction', 'st.junction + 10000'), ('decided', 'st.junction + 14000')]:
        pg.evaluate("(zexpr) => { const r = OB.race; const st = r.stage; r.car.z = eval(zexpr); r.car.v = 240; }", z)
        pg.wait_for_timeout(900)
        pg.screenshot(path=str(SHOTS / f'fork-{name}.png'))
        print(name, pg.evaluate("() => ({ z: Math.round(OB.race.car.z), stage: OB.race.stage.def.id, fork: !!OB.race.fork, decided: OB.race.fork && OB.race.fork.decided, shift: OB.race.camShift().toFixed(2) })"))
    print('errors', errs[:3]); b.close()
