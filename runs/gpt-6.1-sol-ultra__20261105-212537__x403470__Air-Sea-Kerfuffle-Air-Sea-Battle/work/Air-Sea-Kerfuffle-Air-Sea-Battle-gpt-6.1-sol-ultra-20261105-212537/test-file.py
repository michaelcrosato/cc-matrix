"""Verify the actual single-file deliverable opens directly, without an HTTP server."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
here = Path(__file__).resolve().parent
release = here.parent / (here.name + '.html')
checks = []
failures = []
def check(name, passed):
    checks.append({'name': name, 'pass': bool(passed)})
    if not passed:
        failures.append(name)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
        page = browser.new_page(viewport={'width':1280,'height':720})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(release.as_uri(), wait_until='domcontentloaded')
        page.wait_for_function('window.__game', timeout=90000)
        check('Release file boots directly to its own title', page.title() == 'Air-Sea Kerfuffle — Coastal Arcade' and page.evaluate("__game.state.mode==='title'"))
        check('Direct-file WebGPU renderer initializes', page.evaluate("__game.state.backend==='WebGPU'"))
        page.keyboard.press('Enter')
        page.evaluate('__game.step(2.7)')
        page.keyboard.down('Space')
        page.evaluate('__game.step(.5)')
        page.keyboard.up('Space')
        check('Direct-file input and physics work without browser errors', page.evaluate("__game.state.mode==='play'&&__game.state.stats.weapons.flak>0") and not errors)
        browser.close()
except Exception as error:
    failures.append(str(error).splitlines()[0])
report = {'checks':checks,'failures':failures,'url':release.as_uri()}
(here/'file-test-results.json').write_text(json.dumps(report,indent=2))
for failure in failures:
    print('FAIL '+failure)
print(f'{len(checks)} file checks; {len(failures)} failures')
raise SystemExit(bool(failures))
