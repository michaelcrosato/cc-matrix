import json
import pathlib
import sys
from playwright.sync_api import sync_playwright

base = pathlib.Path(__file__).resolve().parents[1]
project = json.loads((base / 'project.json').read_text())
artifact = base.parent / (project['basename'] + '.html')
checks, failures = 0, []
evidence = {}


def check(value, message):
    global checks
    checks += 1
    if not value:
        failures.append(message)


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()
        errors, requests = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: requests.append(request.url))
        page.goto(artifact.as_uri())
        page.wait_for_function('window.__rumble && window.__rumble.ui')
        check(page.evaluate('window.__rumble.screen') == 'title', 'exact final file boots at title')
        check(page.title() == project['title'], 'published title matches metadata')
        check(not errors, 'fresh final artifact has no page errors')
        check(all(url.startswith('file:') or url.startswith('data:') for url in requests), 'standalone makes no network requests')
        check(page.evaluate('window.__rumble.settings.music') == .1, 'fresh music defaults to ten percent')
        page.keyboard.press('Enter')
        page.wait_for_function('window.__rumble.screen === "play"')
        check(page.evaluate('window.__rumble.world.bout === 1 && window.__rumble.mode === "solo"'), 'title primary action enters actual solo bout')
        page.keyboard.down('Space')
        page.wait_for_function('window.__rumble.world.players[0].charge?.power >= .5')
        page.screenshot(path=str(base / 'artifacts/final-charged-combat.png'))
        page.keyboard.up('Space')
        page.wait_for_function('window.__rumble.world.stats.shots[0] === 1')
        check(page.evaluate('window.__rumble.world.stats.shots[0]') == 1, 'final artifact human hold-release launches once')
        page.evaluate('window.__rumble.game.advance(7)')
        check(page.evaluate('window.__rumble.world.events.some(e=>e.type==="impact")'), 'final artifact shot resolves against real targets')
        probes = page.evaluate('''async () => {
            const a = window.__rumble.audio;
            return {mix:await a.renderProbe(),silent:await a.renderProbe({music:0,effects:0,voice:0}),music:await a.renderProbe({music:.1,effects:0,voice:0}),effects:await a.renderProbe({music:0,effects:.7,voice:0}),voice:await a.renderProbe({music:0,effects:0,voice:.45}),diagnostics:a.diagnostics()};
        }''')
        evidence['audio'] = probes
        for bus in ['mix', 'music', 'effects', 'voice']:
            check(probes[bus].get('finite') and probes[bus].get('nonzero'), f'production {bus} offline audio is finite and nonzero')
            check(not probes[bus].get('clipped'), f'production {bus} representative audio does not clip')
        check(probes['silent'].get('peak') == 0, 'muted independent audio buses yield silence')
        check(abs(probes['music']['gains']['music'] - .1) < 1e-7, 'offline music routes through exactly ten percent gain')
        # Complete a real duel through legal AI, then inspect actual result and replay.
        page.evaluate('''() => {const a=window.__rumble;a.start('quick',{court:4,difficulty:'hard',seed:91});a.world.players[0].ai={style:'mason',reaction:.3,error:0,perfect:true,breadth:81,next:.4};a.game.advance(92);}''')
        check(page.evaluate('window.__rumble.world.phase') == 'over', 'final artifact real combat reaches a natural outcome')
        check(page.evaluate('window.__rumble.screen') == 'result', 'natural outcome opens result menu')
        check(page.evaluate('window.__rumble.world.stats.shots.every(n=>n>0)'), 'both duel players fire through legal simulation')
        check(page.evaluate('window.__rumble.world.stats.collapses') > 0, 'final artifact duel demonstrates structural collapse')
        page.screenshot(path=str(base / 'artifacts/final-result.png'))
        page.keyboard.press('Enter')
        page.wait_for_function('window.__rumble.screen === "play" && window.__rumble.world.phase === "play"')
        check(page.evaluate('window.__rumble.world.stats.shots.join(",")') == '0,0', 'result rematch clears old projectiles and scores')
        page.evaluate('window.__rumble.pause();window.__rumble.ui.open("about");')
        check(page.locator('.esh-sh').inner_text().find('Source Information') >= 0, 'credits source information is reachable')
        page.wait_for_timeout(250)
        page.screenshot(path=str(base / 'artifacts/final-credits.png'))
        check(page.evaluate('window.__rumble.game.errors.length') == 0, 'native browser engine reports no errors')
        check(not errors, 'complete final artifact path has no page errors')
        evidence['chromium'] = {'errors': errors, 'requests': requests, 'snapshot': page.evaluate('window.__rumble.snapshot()')}
        context.close()
        browser.close()
        # Closest available approximation to a touch-only iPhone, native Canvas path.
        browser = p.webkit.launch(headless=True)
        context = browser.new_context(**p.devices['iPhone 13'])
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(artifact.as_uri())
        page.wait_for_function('window.__rumble && window.__rumble.ui')
        check(page.evaluate('window.__rumble.screen') == 'title', 'WebKit phone final artifact boots')
        page.get_by_role('button', name='Solo Tour', exact=False).click()
        page.wait_for_function('window.__rumble.screen === "play"')
        check(page.locator('[data-sys="need"]').count() == 0, 'touch-only play has no unsupported-device blocker')
        check(page.locator('[data-act="menu"]').count() == 0, 'custom touch menu has no inherited START overlay')
        # Hardware portrait bounds, rather than just internal buffer coordinates.
        bounds = page.evaluate('''() => { const a=window.__rumble,g=a.game,s=g.screen,c=s.canvas,r=c.getBoundingClientRect(),v=g.view;return [40,600].map(x=>{const p=v.p(x,0,40);return r.left+((p[0]-s.ix)*s.S+s.OX)/c.width*r.width}); }''')
        check(all(0 <= x <= 390 for x in bounds), 'WebKit phone fits both castle foundations in physical screen')
        page.dispatch_event('#screen', 'pointerdown', {'pointerId': 31, 'pointerType': 'touch', 'clientX': 90, 'clientY': 600, 'button': 0, 'buttons': 1})
        page.wait_for_function('window.__rumble.world.players[0].charge?.power > .25')
        page.dispatch_event('#screen', 'pointerup', {'pointerId': 31, 'pointerType': 'touch', 'clientX': 90, 'clientY': 600, 'button': 0, 'buttons': 0})
        page.wait_for_function('window.__rumble.world.stats.shots[0] === 1')
        check(page.evaluate('window.__rumble.device') == 'touch', 'WebKit touch hold-release chooses touch prompts')
        page.dispatch_event('#screen', 'pointerdown', {'pointerId': 32, 'pointerType': 'touch', 'clientX': 90, 'clientY': 600, 'button': 0, 'buttons': 1})
        page.wait_for_timeout(100)
        page.dispatch_event('#screen', 'pointercancel', {'pointerId': 32, 'pointerType': 'touch', 'clientX': 90, 'clientY': 600, 'button': 0, 'buttons': 0})
        page.wait_for_timeout(150)
        check(page.evaluate('window.__rumble.world.stats.shots[0]') == 1, 'pointer cancellation never emits extra shot')
        check(not errors and page.evaluate('window.__rumble.game.errors.length') == 0, 'WebKit phone native canvas/input without errors')
        evidence['webkitPhone'] = {'bounds': bounds, 'errors': errors}
        context.close()
        browser.close()
        browser = p.firefox.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 720})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(artifact.as_uri())
        page.wait_for_function('window.__rumble && window.__rumble.ui')
        page.keyboard.press('Enter')
        page.wait_for_function('window.__rumble.screen === "play"')
        page.evaluate('window.__rumble.game.advance(1)')
        check(not errors and page.evaluate('window.__rumble.game.errors.length') == 0, 'Firefox Canvas gameplay needs no WebGL')
        evidence['firefox'] = {'errors': errors}
        browser.close()
except Exception as error:
    check(False, f'Browser/artifact suite: {type(error).__name__}: {error}')

(base / 'artifacts/browser.json').write_text(json.dumps({'checks': checks, 'failures': failures, 'evidence': evidence}, indent=2))
for failure in failures:
    print(failure, file=sys.stderr)
print(f'{checks} checks, {len(failures)} failures')
sys.exit(1 if failures else 0)
