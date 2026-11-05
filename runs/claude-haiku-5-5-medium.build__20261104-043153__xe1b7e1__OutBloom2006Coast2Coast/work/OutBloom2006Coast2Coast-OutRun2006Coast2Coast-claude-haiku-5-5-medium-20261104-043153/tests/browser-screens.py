# Screenshots of the scenes for review (.cache/shots/): the scene is entered through the game's own go().
import pathlib, sys
from playwright.sync_api import sync_playwright
HERE = pathlib.Path(__file__).resolve().parent.parent
BUNDLE = HERE.parent / 'OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-haiku-5-5-medium-20261104-043153.html'
SHOTS = HERE / '.cache' / 'shots'; SHOTS.mkdir(parents=True, exist_ok=True)
scenes = sys.argv[1:] or ['tour', 'brief', 'garden', 'versusrace', 'attract', 'ending', 'dev', 'trialsetup']
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 960, 'height': 540})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BUNDLE.as_uri()); pg.wait_for_timeout(2000)
    for name in scenes:
        arg = {'brief': {'id': 'B1'}, 'ending': {'result': {'goal': 'C', 'mood': 'Bud', 'passenger': 'vivi', 'score': 1, 'route': 'LR', 'routeIds': ['S1','S3'], 'time': 60, 'status': 'goal'}}, 'versusrace': {'route': ['S1','S2','S5'], 'cpu': True}, 'attract': {'idx': 0, 'seed': 1}}.get(name, {})
        pg.evaluate("([n, a]) => { My3D2dge.current.go(n, a, {fade: 0}); }", [name, arg])
        pg.wait_for_timeout(2500)
        pg.screenshot(path=str(SHOTS / (name + '.png')))
        print(name, pg.evaluate("() => My3D2dge.current.sceneName"))
    print('errors', errs[:4])
    b.close()
