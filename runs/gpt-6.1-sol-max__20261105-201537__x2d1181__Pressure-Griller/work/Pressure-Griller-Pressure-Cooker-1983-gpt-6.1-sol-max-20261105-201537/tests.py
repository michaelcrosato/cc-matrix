"""One command: npm test --silent. No shared ports or persistent processes."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
import json
import subprocess
import functools
import traceback
import urllib.parse

BASE = Path(__file__).resolve().parent
ROOT = BASE.parent
HTML = ROOT / (BASE.name + '.html')
results = []

def record(name, passed, detail=''):
    results.append({'name': name, 'pass': bool(passed), 'detail': str(detail)})
    if not passed:
        print(f'FAIL {name}: {detail}', flush=True)

def check(name, fn):
    try:
        value = fn()
        if value is False:
            raise AssertionError('condition returned false')
        record(name, True)
    except Exception as e:
        record(name, False, str(e).split('Call log:')[0].strip())

def snap(page):
    return page.evaluate('__game.snapshot()')

def ready(page, url):
    page.goto(url, wait_until='load', timeout=60000)
    page.wait_for_function('window.__game && (__game.ready || __game.error)', timeout=60000)
    assert page.evaluate('__game.ready'), page.evaluate('__game.error')
    assert page.title() == 'Pressure Griller — A little lunch rush'

def act(page, action):
    page.evaluate('(a)=>__game.action(a)', action)

def advance(page, seconds):
    page.evaluate('(s)=>__game.advance(s)', seconds)

def require(condition, message='assertion failed'):
    if not condition:
        raise AssertionError(message)

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

core = subprocess.run(['node', 'core-tests.mjs'], cwd=BASE, capture_output=True, text=True)
for line in core.stdout.splitlines():
    if line.startswith('FAIL'):
        print(line, flush=True)
try:
    summary = json.loads(core.stdout.splitlines()[-1])
    for i in range(summary['passed']):
        results.append({'name': f'core/{i + 1}', 'pass': True, 'detail': ''})
    for i in range(summary['failed']):
        results.append({'name': f'core/failure-{i + 1}', 'pass': False, 'detail': core.stdout})
except Exception:
    record('core suite', False, core.stderr or core.stdout)

check('packaging/metadata parses with no empty required values', lambda: require(all(str(v).strip() for v in json.loads((ROOT / 'exit-interview.json').read_text())['sourceInformation'].values())))
check('packaging/runtime is embedded', lambda: require('<script src=' not in HTML.read_text() and '<script type="module" src=' not in HTML.read_text()))
check('packaging/unmodified hub session client', lambda: require((BASE / 'hub/session.js').read_text() in HTML.read_text()))

server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()
origin = f'http://127.0.0.1:{server.server_port}'
args = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required']
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=args)
        page = browser.new_page(viewport={'width': 1920, 'height': 1080}, device_scale_factor=1)
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        try:
            ready(page, HTML.as_uri())
            check('browser/file opens in title', lambda: require(snap(page)['screen'] == 'title'))
            check('browser/default backend is WebGPU', lambda: require(snap(page)['backend'] == 'WebGPU', snap(page)['backend']))
            check('browser/music defaults to ten percent', lambda: require(snap(page)['music'] == .1))
            page.wait_for_function('__game.snapshot().frames > 2', timeout=45000)
            check('browser/default renderer advances frames', lambda: require(snap(page)['frames'] > 2 and not snap(page)['deviceLost']))
            page.evaluate('__game.setIdle(11); __game.advance(.05)')
            check('browser/ten second idle launches attract', lambda: require(snap(page)['attract'] and snap(page)['mode'] == 'attract'))
            page.keyboard.press('x')
            check('browser/any input exits attract to title', lambda: require(snap(page)['screen'] == 'title' and not snap(page)['attract']))
        except Exception as e:
            record('browser/WebGPU initialization', False, e)
        page.evaluate('__game.loseDevice()')
        page.wait_for_function('__game.snapshot().recoveries === 1', timeout=30000)
        check('browser/lost WebGPU device recovers without losing state', lambda: require(snap(page)['backend'] == 'WebGL 2 fallback' and snap(page)['screen'] == 'title' and not snap(page)['deviceLost']))
        page.wait_for_timeout(600)
        page.screenshot(path=str(BASE / 'title-1920.png'))
        act(page, 'play'); act(page, 'begin')
        page.wait_for_timeout(1600)
        page.screenshot(path=str(BASE / 'game-1920.png'))
        act(page, 'quit')
        page.close()
        page = browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
        page.on('pageerror', lambda e: errors.append(str(e)))
        ready(page, HTML.as_uri() + '?renderer=webgl')
        page.evaluate('window.__pad=null; navigator.getGamepads=()=>window.__pad?[window.__pad]:[]')
        check('browser/visual fallback backend', lambda: require(snap(page)['backend'] == 'WebGL 2 fallback'))
        page.locator('[data-action="play"]').click()
        check('browser/open kitchen teaches controls', lambda: require(snap(page)['screen'] == 'howto'))
        page.locator('[data-action="begin"]').click()
        check('browser/apron button begins simulation', lambda: require(snap(page)['screen'] == 'game' and snap(page)['phase'] == 'playing'))
        before = snap(page)['players'][0]['x']
        page.keyboard.down('d')
        advance(page, .3)
        page.keyboard.up('d')
        check('browser/WASD drives physics chef', lambda: require(snap(page)['players'][0]['x'] > before + 1))
        page.keyboard.down('Shift'); page.evaluate('__game.inputTick()'); page.keyboard.up('Shift')
        check('browser/dash edge reaches simulation', lambda: require(snap(page)['stats']['dashes'] >= 1))
        page.keyboard.press('Escape')
        clock = snap(page)['clock']; advance(page, 2)
        check('browser/pause freezes standalone kitchen', lambda: require(snap(page)['screen'] == 'pause' and abs(snap(page)['clock'] - clock) < .001))
        page.keyboard.press('Enter')
        check('browser/keyboard activates focused resume', lambda: require(snap(page)['screen'] == 'game'))
        def catch(t):
            page.evaluate('(t)=>{const f=__game.snapshot().food.find(f=>f.type===t); if(!f)throw Error("missing topping");__game.setPlayer(0,f.x,f.z)}', t)
            advance(page, .35)
            page.keyboard.down(' '); page.evaluate('__game.inputTick()'); page.keyboard.up(' ')
        catch('C')
        check('browser/Space catches topping and emits physics particles', lambda: require('C' in snap(page)['players'][0]['plate'] and snap(page)['physicsBodies'] > 7))
        catch('L')
        page.evaluate('__game.setPlayer(0,-4.3,3.6)'); advance(page, .35)
        page.keyboard.down(' '); page.evaluate('__game.inputTick()'); page.keyboard.up(' ')
        check('browser/matching burger serves with score', lambda: require(snap(page)['stats']['served'] >= 1 and snap(page)['score'] > 200))
        page.keyboard.down('q'); page.evaluate('__game.inputTick()'); page.keyboard.up('q')
        check('browser/dinner bell keyboard input', lambda: require(snap(page)['slow'] > 0 and snap(page)['stats']['bells'] >= 1))
        act(page, 'quit'); act(page, 'play'); act(page, 'begin')
        page.evaluate('__game.render()')
        def click_food(t):
            point = page.evaluate('(t)=>{const f=__game.snapshot().food.find(f=>f.type===t);return __game.project(f.x,f.z)}', t)
            page.mouse.click(point['x'], point['y'])
            advance(page, 2)
        click_food('C'); click_food('L')
        check('mouse/world clicks navigate to and catch toppings', lambda: require(sorted(snap(page)['players'][0]['plate']) == ['C', 'L'], snap(page)['players'][0]))
        point = page.evaluate('__game.project(-4.3,4.6)')
        page.mouse.click(point['x'], point['y']); advance(page, 3)
        check('mouse/clicking matching counter serves burger', lambda: require(snap(page)['stats']['served'] == 1 and not snap(page)['players'][0]['plate']))
        page.keyboard.press('Escape'); page.locator('[data-action="dev"]').click()
        slider = page.locator('#dev-patience')
        slider.fill('90'); slider.dispatch_event('input')
        check('browser/live patience slider updates current tickets', lambda: require(snap(page)['config']['patience'] == 90 and all(t['maxPatience'] == 90 for t in snap(page)['tickets'])))
        page.locator('[data-action="god"]').click(); page.locator('[data-action="resetDev"]').click()
        check('browser/dev reset restores defaults', lambda: require(snap(page)['config']['patience'] == 65 and all(t['maxPatience'] == 65 for t in snap(page)['tickets']) and not page.locator('#god-setting').inner_text().endswith('On')))
        page.evaluate('document.getElementById("toast").classList.remove("show")')
        page.screenshot(path=str(BASE / 'dev-kitchen.png'))
        page.locator('[data-action="resume"]:visible').click()
        page.evaluate('__game.set("auto",true)'); advance(page, 100)
        check('browser/whole campaign with native physics', lambda: require(snap(page)['phase'] == 'result' and snap(page)['won'] and snap(page)['stats']['served'] == 12, json.dumps(snap(page)['stats'])))
        page.locator('[data-action="quit"]:visible').click()
        page.evaluate('window.__pad={index:0,connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0,touched:false}))}')
        def pad(button):
            page.evaluate('(b)=>{__pad.buttons[b].pressed=true;__pad.buttons[b].value=1;__game.inputTick()}', button)
            page.evaluate('(b)=>{__pad.buttons[b].pressed=false;__pad.buttons[b].value=0;__game.inputTick()}', button)
        pad(0)
        check('browser/standard pad Cross selects title menu', lambda: require(snap(page)['screen'] == 'howto' and snap(page)['inputMethod'] == 'pad'))
        pad(0)
        check('browser/standard pad Cross begins game', lambda: require(snap(page)['screen'] == 'game'))
        before = snap(page)['players'][0]['x']
        page.evaluate('__pad.axes[0]=.9'); advance(page, .3); page.evaluate('__pad.axes[0]=0')
        check('browser/standard pad axes move chef', lambda: require(snap(page)['players'][0]['x'] > before + .8))
        pad(1)
        check('browser/standard pad Circle dashes', lambda: require(snap(page)['stats']['dashes'] > 0))
        pad(9)
        check('browser/Options pauses', lambda: require(snap(page)['screen'] == 'pause'))
        page.evaluate('__pad.buttons[8].pressed=true'); pad(9); page.evaluate('__pad.buttons[8].pressed=false;__game.inputTick()')
        check('browser/Create and Options chord is reserved', lambda: require(snap(page)['screen'] == 'pause'))
        act(page, 'settings'); act(page, 'glyphs')
        check('browser/Xbox glyph setting changes prompts', lambda: require('A' in page.locator('#controls').inner_text() and 'Xbox' in page.locator('#glyph-setting').inner_text()))
        act(page, 'quit'); act(page, 'coop'); act(page, 'begin'); page.evaluate('window.__pad=null')
        check('browser/co-op physics spawn matches both visible chefs', lambda: require(all(abs(p['x'] - q['x']) < .01 and abs(p['z'] - q['z']) < .01 for p,q in zip(snap(page)['players'],snap(page)['physicsPositions']))))
        before = snap(page)['players']
        page.keyboard.down('ArrowRight'); advance(page, .3); page.keyboard.up('ArrowRight')
        after = snap(page)['players']
        check('browser/couch keyboard second chef has independent movement', lambda: require(len(after) == 2 and after[1]['x'] > before[1]['x'] + .8 and abs(after[0]['x'] - before[0]['x']) < .05))
        page.evaluate('window.__pads=[0,1].map(index=>({index,connected:true,mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0,touched:false}))}));navigator.getGamepads=()=>__pads;__pads[1].axes[0]=.9')
        before = snap(page)['players']
        advance(page, .3)
        after = snap(page)['players']
        page.evaluate('__pads[1].axes[0]=0;__game.inputTick()')
        check('browser/second standard controller independently drives chef two', lambda: require(after[1]['x'] > before[1]['x'] + .8 and abs(after[0]['x'] - before[0]['x']) < .05))
        act(page, 'quit'); act(page, 'about')
        check('browser/About contains source and usage disclosure', lambda: require('Pressure Cooker' in page.locator('#about-content').inner_text() and 'added on import' in page.locator('#about-content').inner_text()))
        check('browser/no uncaught runtime errors', lambda: require(not errors, errors))
        page.close()
        # Touch device stand-in: one page, real taps plus a synthetic multi-pointer drag.
        touch = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, has_touch=True, is_mobile=True)
        page = touch.new_page(); ready(page, HTML.as_uri() + '?renderer=webgl')
        page.wait_for_timeout(1200)
        page.screenshot(path=str(BASE / 'title-phone.png'))
        page.locator('[data-action="play"]').tap(); page.locator('[data-action="begin"]').tap()
        check('touch/taps enter game with touch prompts', lambda: require(snap(page)['screen'] == 'game' and snap(page)['inputMethod'] == 'touch'))
        before = snap(page)['players'][0]['x']
        cdp = touch.new_cdp_session(page)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 160, 'y': 480, 'id': 1}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': 220, 'y': 480, 'id': 1}]})
        advance(page, .3)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        check('touch/invisible stick moves chef', lambda: require(snap(page)['players'][0]['x'] > before + .8))
        page.evaluate('const f=__game.snapshot().food.find(f=>f.type==="C");__game.setPlayer(0,f.x,f.z)'); advance(page, .08)
        check('touch/assisted catch needs no on-screen button', lambda: require('C' in snap(page)['players'][0]['plate']))
        page.wait_for_timeout(800)
        page.screenshot(path=str(BASE / 'game-phone.png'))
        check('touch/no horizontal overflow', lambda: require(page.evaluate('document.documentElement.scrollWidth <= innerWidth')))
        page.locator('[data-action="pause"]').tap(); act(page, 'settings')
        page.locator('#music-volume').fill('10')
        page.locator('#music-volume').dispatch_event('input')
        act(page, 'resume')
        page.wait_for_timeout(800)
        levels = page.evaluate('__game.audio()')
        for _ in range(20):
            sample = page.evaluate('__game.audio()')
            if sample['rms'] > levels['rms']:
                levels = sample
            page.wait_for_timeout(50)
        check('audio/generated samples reach Web Audio', lambda: require(levels['state'] == 'running' and levels['notes'] >= 4 and levels['music'] == .1 and levels['rms'] > 0, levels))
        page.close(); touch.close()
        # Supplied harness, unchanged, on an OS-selected loopback port.
        for players, extra in [(2, ''), (4, '&latency=150&jitter=50&loss=5'), (4, '&scenario=host-leave&latency=150&jitter=50&loss=5')]:
            page = browser.new_page(viewport={'width': 1440, 'height': 900})
            game_path = '/' + HTML.name
            url = origin + '/' + BASE.name + '/hub/harness.html?game=' + urllib.parse.quote(game_path, safe='') + f'&players={players}&auto=1&play=2000' + extra
            page.goto(url, wait_until='load', timeout=60000)
            # Confirm this ephemeral origin really serves this game's title.
            check(f'hub/{players}{extra}/correct page', lambda: require(page.request.get(origin + game_path).ok and 'Pressure Griller' in page.request.get(origin + game_path).text()))
            try:
                page.wait_for_function('window.__hubCheck && window.__hubCheck.done', timeout=120000)
                report = page.evaluate('__hubCheck')
                for c in report['checks']:
                    record(f'hub/{players}{extra}/{c["name"]}', c['pass'], c.get('detail', ''))
                check(f'hub/{players}{extra}/aggregate', lambda: require(report['pass'], report['checks']))
                (BASE / f'hub-check-{players}{"-host-leave" if "host-leave" in extra else ""}.json').write_text(json.dumps(report, indent=2))
            except Exception as e:
                record(f'hub/{players}{extra}/harness complete', False, str(e))
            page.close()
        browser.close()
except Exception as e:
    record('browser/suite', False, str(e) + '\n' + traceback.format_exc(limit=2))
finally:
    server.shutdown(); server.server_close(); thread.join(timeout=3)

(BASE / 'test-results.json').write_text(json.dumps({'passed': sum(r['pass'] for r in results), 'failed': sum(not r['pass'] for r in results), 'checks': results}, indent=2))
failed = sum(not r['pass'] for r in results)
print(f'{len(results) - failed}/{len(results)} checks passed; {failed} failures.', flush=True)
raise SystemExit(1 if failed else 0)
