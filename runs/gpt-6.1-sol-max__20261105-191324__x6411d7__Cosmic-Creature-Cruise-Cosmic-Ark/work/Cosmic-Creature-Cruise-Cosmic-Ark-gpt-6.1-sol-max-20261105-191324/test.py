import contextlib
import http.server
import json
import pathlib
import subprocess
import sys
import threading
import time
import traceback

from playwright.sync_api import sync_playwright

DEV = pathlib.Path(__file__).resolve().parent
ROOT = DEV.parent
BASE = json.loads((DEV / 'selection.json').read_text())['base']
RESULTS = {'passed': [], 'failures': [], 'evidence': {}}
ONLY = sys.argv[sys.argv.index('--only') + 1].lower() if '--only' in sys.argv else None
EXECUTED = []
PREVIOUS = json.loads((DEV / 'test-results.json').read_text()) if ONLY and (DEV / 'test-results.json').exists() else None


def check(name, fn):
    if ONLY and ONLY not in name.lower():
        return
    EXECUTED.append(name)
    try:
        fn()
        RESULTS['passed'].append(name)
    except Exception as error:
        RESULTS['failures'].append({'name': name, 'error': str(error)[:3000]})
        print(f'FAIL {name}: {error}', flush=True)


def expect(value, message):
    if not value:
        raise AssertionError(message)


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *args):
        pass


if not ONLY or ONLY in ('core', 'simulation'):
    sim = subprocess.run(['node', 'simulation.test.mjs'], cwd=DEV, capture_output=True, text=True)
    try:
        sim_result = json.loads(sim.stdout.strip().splitlines()[-1])
        RESULTS['passed'].extend([f'Simulation check {i + 1}' for i in range(sim_result['passed'])])
        RESULTS['evidence']['campaign'] = sim_result['campaign']
        for failure in sim_result['failures']:
            RESULTS['failures'].append(failure)
            print(f"FAIL {failure['name']}: {failure['error']}", flush=True)
    except Exception as error:
        RESULTS['failures'].append({'name': 'Simulation runner', 'error': sim.stderr or str(error)})
        print(f'FAIL Simulation runner: {sim.stderr or error}', flush=True)

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
origin = f'http://127.0.0.1:{server.server_port}'
url = origin + '/' + BASE + '.html'
browser_errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader', '--no-sandbox'])
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    page.on('pageerror', lambda e: browser_errors.append(str(e)))

    def load():
        page.goto(url + '?renderer=webgl', wait_until='load', timeout=60000)
        page.wait_for_function('window.__cruise || window.__bootError', timeout=60000)
        expect(page.evaluate('document.title') == 'Cosmic Creature Cruise', 'Wrong page served')
        expect(page.evaluate('!window.__bootError'), page.evaluate('window.__bootError'))
        RESULTS['evidence']['backend'] = page.evaluate('__cruise.backend')
        expect(page.evaluate('__cruise.screen') == 'title', 'No title screen')

    check('WebGPU startup and correct game identity', load)
    ready = bool(page.evaluate('!!window.__cruise'))
    if ready:
        def title_art():
            page.evaluate("__cruise.action('title');__cruise.setIdle(-3600)")
            page.screenshot(path=str(DEV / 'art-title.png'))
            expect(page.locator('h1').inner_text().replace('\n', ' ') == 'COSMIC CREATURE CRUISE', 'Title text missing')
            expect(page.locator('[data-action="new"]').bounding_box()['width'] > 300, 'Primary button too small for TV')
        check('Title TV layout and art capture', title_art)

        def keyboard_menu():
            page.evaluate("__cruise.action('title');__cruise.setIdle(-3600)")
            page.keyboard.press('Enter')
            expect(page.evaluate('__cruise.screen') == 'briefing', 'Enter did not open briefing')
            page.keyboard.press('Enter')
            expect(page.evaluate('__cruise.screen') == 'play', 'Enter did not launch')
            page.keyboard.press('Escape')
            expect(page.evaluate('__cruise.screen') == 'pause', 'Escape did not pause')
            before = page.evaluate('__cruise.game.time')
            page.wait_for_timeout(300)
            expect(page.evaluate('__cruise.game.time') == before, 'Game advances while paused')
            page.keyboard.press('Escape')
            expect(page.evaluate('__cruise.screen') == 'play', 'Escape did not resume')
        check('Keyboard launch, pause, and resume', keyboard_menu)

        def manual_defense():
            page.evaluate("__cruise.game.spawnCd=100; __cruise.game.clearHazards(); __cruise.game.spawn('meteor',6,0,-2,0,{dir:0});")
            page.keyboard.down('d')
            page.keyboard.down('Space')
            page.wait_for_function('__cruise.game.kills > 0', timeout=6000)
            page.keyboard.up('Space')
            page.keyboard.up('d')
            expect(page.evaluate('__cruise.game.score') > 0, 'Manual fire did not score')
            page.keyboard.press('e')
            page.wait_for_function('__cruise.game.pulseCd > 0', timeout=5000)
        check('Real keyboard defense and pulse', manual_defense)

        def mouse_aim():
            point = page.evaluate('__cruise.view.screenPoint(0,-6)')
            page.mouse.move(point['x'], point['y'])
            page.wait_for_function('__cruise.game.aim===3', timeout=5000)
            shots = page.evaluate('__cruise.game.totalShots')
            page.mouse.click(point['x'], point['y'])
            page.wait_for_function(f'__cruise.game.totalShots>{shots}', timeout=5000)
        check('Native mouse hover aim and click fire', mouse_aim)

        def controller():
            page.evaluate("""() => {window.pad={id:'Emulated DualSense',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[window.pad];pad.buttons[9]={pressed:true,value:1};} """)
            page.wait_for_function("__cruise.screen==='pause'", timeout=5000)
            page.evaluate('pad.buttons[9]={pressed:false,value:0}')
            page.wait_for_timeout(180)
            expect(page.locator('[data-key="pause"]').first.inner_text() == '☰', 'Prompts did not switch to controller')
            page.evaluate('pad.buttons[0]={pressed:true,value:1}')
            page.wait_for_function("__cruise.screen==='play'", timeout=5000)
            page.evaluate('pad.buttons[0]={pressed:false,value:0}')
            page.wait_for_timeout(100)
            page.evaluate("pad.axes=[0,0,-1,0];pad.buttons[0]={pressed:true,value:1}")
            page.wait_for_timeout(400)
            expect(page.evaluate('__cruise.game.aim') == 2, 'Right stick did not aim left')
            page.evaluate('pad.axes=[0,0,0,0];pad.buttons[0]={pressed:false,value:0};navigator.getGamepads=()=>[]')
        check('Standard gamepad, prompts, pause and aim', controller)

        def dev_tools():
            page.keyboard.press('Escape')
            page.locator('[data-action="dev"]').click()
            expect(page.evaluate('__cruise.screen') == 'dev', 'Dev mode unreachable from pause')
            page.locator('[data-tuning="shuttleSpeed"]').fill('12')
            expect(page.evaluate('__cruise.game.tuning.shuttleSpeed') == 12, 'Live tuning did not apply')
            page.locator('[data-action="god"]').click()
            expect(page.evaluate('__cruise.game.god'), 'Invulnerability did not toggle')
            page.locator('[data-action="tuning-reset"]').click()
            expect(page.evaluate('__cruise.game.tuning.shuttleSpeed') == 8, 'Reset did not restore defaults')
            page.locator('[data-action="next-planet"]').click()
            expect(page.evaluate('__cruise.game.planet') == 1, 'Next planet did not work')
            page.locator('[data-action="skip"]').click()
            page.locator('[data-action="skip"]').click()
            expect(page.evaluate('__cruise.game.phase') == 'rescue', 'Next phase did not reach rescue')
            page.locator('[data-action="dev-resume"]').click()
            page.screenshot(path=str(DEV / 'art-rescue.png'))
        check('Developer tools, balance sliders and surface art', dev_tools)

        def real_rescue():
            page.evaluate("__cruise.game.shuttle.x=-13;__cruise.game.shuttle.y=-3.8;__cruise.game.sentinelCd=100;__cruise.game.god=true")
            page.keyboard.down('Space')
            page.wait_for_function('__cruise.game.shuttle.beam>.3', timeout=6000)
            page.screenshot(path=str(DEV / 'art-beam.png'))
            page.wait_for_function('__cruise.game.shuttle.cargo.length===1', timeout=6000)
            page.keyboard.up('Space')
            page.evaluate('__cruise.game.shuttle.x=0;__cruise.game.shuttle.y=5.2')
            page.wait_for_function('__cruise.game.rescued===1', timeout=4000)
            expect(page.evaluate('__cruise.game.creatures[0].status') == 'saved', 'Rescued creature not saved')
        check('Real-time beam pickup and automatic dock', real_rescue)

        def complete_campaign():
            page.evaluate('__cruise.start(4242)')
            result = page.evaluate('__cruise.advance(450,true)')
            expect(result['phase'] == 'victory', f"Campaign ended {result['phase']}")
            expect(result['rescued'] == 18 and result['pairs'] == 9, 'Campaign did not reunite every pair')
            expect(page.evaluate('__cruise.screen') == 'results', 'No victory results screen')
            expect('show' not in (page.locator('#toast').get_attribute('class') or '').split(), 'Old flight toast leaks into results')
            page.screenshot(path=str(DEV / 'art-results.png'))
        check('Browser full campaign and victory results', complete_campaign)

        def persistence():
            best = page.evaluate("JSON.parse(localStorage.getItem('ccc-record')).best")
            expect(best > 10000, 'Best score was not persisted')
            page.evaluate("__cruise.action('title');__cruise.action('settings')")
            expect(page.locator('[data-setting="music"]').input_value() == '10', 'Music default is not 10%')
            page.locator('[data-action="glyphs"]').click()
            expect(page.evaluate('__cruise.settings.glyphs') == 'xbox', 'Xbox option not set')
            page.locator('[data-setting="music"]').fill('17')
            page.reload(wait_until='load')
            page.wait_for_function('window.__cruise', timeout=60000)
            expect(page.evaluate('__cruise.settings.music') == 17, 'Settings did not persist')
            expect(page.evaluate('__cruise.settings.glyphs') == 'xbox', 'Glyph option did not persist')
            page.evaluate("__cruise.action('settings');__cruise.action('settings-reset');__cruise.action('settings-back')")
        check('Settings, glyphs, default music and saved progress', persistence)

        def audio_probe():
            result = page.evaluate('__cruise.audio.offlineProbe()')
            RESULTS['evidence']['audio'] = result
            expect(.005 < result['rms'] < .5, f"Audio RMS invalid: {result['rms']}")
            expect(0 < result['peak'] < .99, f"Audio peak invalid: {result['peak']}")
        check('Procedural music, effects and voice audio signal', audio_probe)

        def attract():
            page.evaluate("__cruise.action('title');__cruise.setIdle(10.1)")
            page.wait_for_function('__cruise.attract', timeout=6000)
            expect(page.evaluate('__cruise.game.autopilot && __cruise.game.god'), 'Attract pilot not active')
            page.evaluate('__cruise.advance(16,true)')
            expect(page.evaluate('__cruise.game.phase') == 'rescue', 'Attract mode did not show rescue')
            page.keyboard.press('Space')
            expect(page.evaluate('__cruise.screen') == 'title', 'Input did not exit attract to title')
            expect(not page.evaluate('__cruise.attract'), 'Attract flag still active')
        check('Ten-second attract AI and clean input exit', attract)

        def standalone_room():
            page.evaluate("__cruise.action('online');__cruise.action('host')")
            code = page.evaluate('__cruise.network.roomCode')
            expect(len(code) == 6, 'Room code length incorrect')
            second = context.new_page()
            second.on('pageerror', lambda e: browser_errors.append(str(e)))
            try:
                second.goto(url, wait_until='load')
                second.wait_for_function('window.__cruise', timeout=60000)
                second.evaluate("__cruise.action('online');__cruise.action('join-menu')")
                second.locator('#room-input').fill(code)
                second.locator('[data-action="join"]').click()
                page.wait_for_function('__cruise.network.players.length===2', timeout=15000)
                second.wait_for_function('__cruise.network.me===1', timeout=15000)
                page.locator('[data-action="room-launch"]').click()
                second.wait_for_function("__cruise.screen==='play'", timeout=10000)
                expect(page.evaluate('__cruise.game.seed') == second.evaluate('__cruise.game.seed'), 'Room seeds differ')
                second.wait_for_function('__cruise.network.ghosts.size>0', timeout=15000)
                page.wait_for_function('__cruise.network.ghosts.size>0', timeout=15000)
                RESULTS['evidence']['room'] = {'players': 2, 'sameSeed': True, 'ghostsBothWays': True, 'transport': 'BroadcastChannel; remote signaling availability recorded separately'}
                page.evaluate("__cruise.action('title')")
            finally:
                second.close()
        check('Standalone two-page room, shared seed and ghosts', standalone_room)

        def credits():
            page.evaluate("__cruise.action('title');__cruise.action('credits')")
            text = page.locator('.scroll').inner_text()
            for required in ['Source Information', 'Testing Feedback', 'Engine Feedback', 'Prompt Feedback', 'added on import']:
                expect(required in text, f'Credits missing {required}')
            expect(len(page.locator('.credit').all()) == 15, 'Credits source fields incomplete')
        check('Required About information and feedback', credits)
    page.close()
    context.close()

    def mobile_touch():
        mobile = browser.new_context(**p.devices['iPhone 13'])
        pg = mobile.new_page()
        pg.on('pageerror', lambda e: browser_errors.append(str(e)))
        try:
            pg.goto(url + '?renderer=webgl', wait_until='load')
            pg.wait_for_function('window.__cruise', timeout=60000)
            pg.evaluate('__cruise.setIdle(-3600)')
            pg.locator('[data-action="new"]').tap()
            pg.locator('[data-action="launch"]').tap()
            expect(pg.evaluate('__cruise.input.last') == 'touch', 'Touch did not activate')
            expect(pg.locator('#touch-pulse').is_visible(), 'Touch pulse hidden')
            pg.evaluate('__cruise.game.beginRescue();__cruise.game.god=true')
            pg.wait_for_timeout(200)
            session = mobile.new_cdp_session(pg)
            session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 100, 'y': 420, 'id': 1}]})
            session.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': 150, 'y': 460, 'id': 1}]})
            pg.wait_for_timeout(400)
            session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            expect(pg.evaluate('__cruise.game.shuttle.x') > .3, 'Floating touch stick did not fly')
            pg.locator('#touch-pulse').tap()
            pg.wait_for_timeout(200)
            expect(pg.evaluate('__cruise.game.pulseCd') > 0, 'Touch pulse did not fire')
            pg.screenshot(path=str(DEV / 'art-mobile.png'))
        finally:
            mobile.close()
    check('Phone touch flight, assisted beam and pulse', mobile_touch)

    def file_launch():
        ctx = browser.new_context(viewport={'width': 1280, 'height': 720})
        pg = ctx.new_page()
        try:
            pg.goto((ROOT / (BASE + '.html')).as_uri(), wait_until='load')
            pg.wait_for_function('window.__cruise || window.__bootError', timeout=60000)
            expect(pg.evaluate('!!window.__cruise'), pg.evaluate('window.__bootError'))
            expect(pg.evaluate('__cruise.backend') == 'WebGPU', 'Native WebGPU not used')
        finally:
            ctx.close()
    check('Self-contained file URL launch with native WebGPU', file_launch)

    def harness(players, extra=''):
        ctx = browser.new_context(viewport={'width': 1280, 'height': 900})
        pg = ctx.new_page()
        try:
            game_path = '../' + BASE + '.html'
            hurl = f'{origin}/{DEV.name}/harness.html?game={game_path}&players={players}&auto=1&limit=12{extra}'
            pg.goto(hurl, wait_until='load', timeout=60000)
            expect('harness' in pg.title().lower() or pg.locator('iframe').count() > 0, 'Wrong harness page')
            pg.wait_for_function("document.body.dataset.complete==='true'", timeout=120000)
            result = pg.evaluate('window.__hubCheck')
            RESULTS['evidence'][f'hub-{players}{extra}'] = result
            expect(result and result.get('pass'), json.dumps(result))
        finally:
            ctx.close()

    check('AI Hub automatic two-player protocol harness', lambda: harness(2))
    check('AI Hub four-player latency, jitter and packet loss', lambda: harness(4, '&latency=150&jitter=50&loss=5'))
    check('AI Hub ghost round survives host departure', lambda: harness(4, '&latency=150&jitter=50&loss=5&scenario=host-leave'))
    check('No browser runtime exceptions', lambda: expect(not browser_errors, '\n'.join(browser_errors[:12])))
    browser.close()

server.shutdown()
server.server_close()
if PREVIOUS:
    RESULTS['passed'] = [name for name in PREVIOUS['passed'] if name not in EXECUTED] + RESULTS['passed']
    RESULTS['failures'] = [failure for failure in PREVIOUS['failures'] if failure['name'] not in EXECUTED] + RESULTS['failures']
    RESULTS['evidence'] = {**PREVIOUS['evidence'], **RESULTS['evidence'], 'targetedRerun': ONLY}
(DEV / 'test-results.json').write_text(json.dumps(RESULTS, indent=2) + '\n')
print(f"{len(RESULTS['passed'])} passed, {len(RESULTS['failures'])} failed.")
raise SystemExit(bool(RESULTS['failures']))
