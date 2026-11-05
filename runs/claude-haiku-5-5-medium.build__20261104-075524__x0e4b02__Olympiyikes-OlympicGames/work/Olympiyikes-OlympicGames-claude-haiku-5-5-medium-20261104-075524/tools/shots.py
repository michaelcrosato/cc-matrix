# Screenshots of the built page in headless Chromium (Playwright), for the things a script can't judge: how it looks.
# Run: python3 tools/shots.py <out-dir>   (the page is the bundle in the work folder's root; it runs from file://)
import sys, os, pathlib
from playwright.sync_api import sync_playwright
here = pathlib.Path(__file__).resolve().parent.parent
bundle = here.parent / 'Olympiyikes-OlympicGames-claude-haiku-5-5-medium-20261104-075524.html'
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 960, 'height': 540})
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.goto(bundle.as_uri())
    pg.wait_for_timeout(1500)
    pg.screenshot(path=str(out / 'title.png'))
    for name, data in [('sprint', {'id': 'sprint', 'seed': 1}), ('skijump', {'id': 'skijump', 'seed': 2}), ('archery', {'id': 'archery', 'seed': 3})]:
        pg.evaluate("(d) => window.__oly.debug.go('ev', d)", data)
        pg.wait_for_timeout(900)
        pg.screenshot(path=str(out / (name + '-intro.png')))
        pg.wait_for_timeout(3400)
        pg.screenshot(path=str(out / (name + '-play.png')))
        pg.wait_for_timeout(5000)
        pg.screenshot(path=str(out / (name + '-late.png')))
    for name, js in [
        ('results', "window.__oly.debug.go('results', {id: 'sprint', result: {value: 11.6, label: '11.60 s', rank: 2, newBest: true, rivals: [{n: {name: 'TURBONIA', col: '#d7263d'}, label: '11.90 s'}, {n: {name: 'FRIMLAND', col: '#3a86ff'}, label: '12.40 s'}]}})"),
        ('medals', "window.__oly.debug.go('medals', null)"),
        ('about', "window.__oly.debug.go('about', null)"),
        ('menu', "window.__oly.debug.go('menu', null)")]:
        pg.evaluate("() => { " + js + " }")
        pg.wait_for_timeout(900)
        pg.screenshot(path=str(out / (name + '.png')))
    pg.evaluate("() => window.__oly.debug.go('dev', {from: null})")
    pg.wait_for_timeout(900)
    pg.screenshot(path=str(out / 'dev.png'))
    print('errors:', errors if errors else 'none')
    b.close()
