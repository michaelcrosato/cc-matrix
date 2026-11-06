"""Run with npm test. Only failures and a final count are printed."""
import contextlib
import functools
import http.server
import json
import re
import subprocess
import sys
import threading
import urllib.parse
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
PROJECT = json.loads((HERE / 'project.json').read_text())
GAME = HERE.parent / (PROJECT['slug'] + '.html')
ART = HERE / 'test-artifacts'
ART.mkdir(exist_ok=True)
checks = []
errors = []

def check(name, ok, detail=''):
    checks.append({'name': name, 'pass': bool(ok), 'detail': str(detail)})
    if not ok:
        print('FAIL: ' + name + (' — ' + str(detail)[:1600] if detail else ''), flush=True)

def js(page, expression):
    return page.evaluate(expression)

def load(page, url):
    page.goto(url, wait_until='load')
    page.wait_for_function('window.__POSE__ && (window.__POSE__.snapshot().ready || window.__POSE__.snapshot().error)', timeout=60000)
    snap = js(page, '__POSE__.snapshot()')
    if not snap.get('ready'):
        raise RuntimeError(snap)
    return snap

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(HERE.parent)))
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
base = f'http://127.0.0.1:{server.server_port}/'
url = base + urllib.parse.quote(GAME.name)
check('Ephemeral server is this game', 'The Empire Strikes a Pose' in urllib.request.urlopen(url).read().decode()[:25000])
html = GAME.read_text()
for i, script in enumerate(re.findall(r'<script>([\s\S]*?)</script>', html)):
    script_file = ART / f'inline-{i}.js'
    script_file.write_text(script)
    result = subprocess.run(['node', '--check', str(script_file)], capture_output=True, text=True)
    check(f'Embedded script {i} parses', result.returncode == 0, result.stderr[:500])
check('Hub client embedded unmodified', (HERE / 'session.js').read_text() in html)
check('No external runtime asset requests', not re.search(r'<(?:script|link)[^>]+(?:src|href)="https?://', html))
interview = json.loads((HERE.parent / 'exit-interview.json').read_text())
check('Exit interview exact schema', set(interview) == {'sourceInformation', 'testingFeedback', 'engineFeedback', 'promptFeedback', 'aiHub'} and [len(interview[k]) for k in ['testingFeedback', 'engineFeedback', 'promptFeedback']] == [4, 6, 4])

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader', '--disable-dev-shm-usage'])
    context = browser.new_context(viewport={'width': 1600, 'height': 1000}, device_scale_factor=1)
    context.add_init_script("""
      window.__testPad = { connected:true, id:'Emulated DualSense', index:0, mapping:'standard', axes:[0,0,0,0], buttons:Array.from({length:17},()=>({pressed:false,value:0,touched:false})), timestamp:0 };
      window.__padPresent = false;
      Object.defineProperty(navigator,'getGamepads',{value:()=>window.__padPresent?[window.__testPad]:[]});
      window.__pressPad=(i,on)=>{window.__padPresent=true;__testPad.buttons[i].pressed=on;__testPad.buttons[i].value=on?1:0;};
    """)
    page = context.new_page()
    page.on('pageerror', lambda err: errors.append(str(err)))
    try:
        snap = load(page, GAME.as_uri() + '?test=1&manual=1')
        check('File startup and embedded dependencies', snap['ready'], snap)
        check('WebGPU active', snap['backend'] == 'WebGPU', snap['backend'])
        check('Pinned Rapier version', snap['physics'].startswith('0.19.3'), snap['physics'])
        check('Native animation tracks active', snap['animations'] >= 10, snap['animations'])
        check('Music defaults to ten percent', snap['music'] == .1, snap['music'])
        page.get_by_role('button', name='Launch sortie').click()
        check('Launch begins play', js(page, '__POSE__.snapshot().mode') == 'playing')
        progress = []
        for _ in range(30):
            snap = js(page, '__POSE__.run(20,true)')
            progress.append(snap)
            if snap['completed']:
                break
        (ART / 'playthrough.json').write_text(json.dumps(progress, indent=2))
        check('Scripted full mission victory', snap['completed'] and snap['won'], snap)
        check('Both tow takedowns completed', snap['topples'] == 2, snap)
        check('Escort and boss complete', snap['escort'] >= 1 and snap['kills'] >= 7, snap)
        check('Rapier projectile collision exercised', snap['stats']['physicsHits'] > 10, snap['stats'])
        check('Complete result screen', page.get_by_role('button', name='Fly another sortie').is_visible())
        page.get_by_role('button', name='About & credits').click()
        credits = page.locator('#menu').inner_text()
        check('Credits contain source and all feedback sections', all(title in credits for title in ['Source Information','Testing Feedback','Engine Feedback','Prompt Feedback','added on import']))
        page.get_by_role('button', name='Library licenses').click()
        check('Third-party licenses included', 'THE SOFTWARE IS PROVIDED' in page.locator('#menu').inner_text() and 'Apache License' in page.locator('#menu').inner_text())
        page.get_by_role('button', name='Back to credits').click()
        page.get_by_role('button', name='Back', exact=True).click()
        check('Credits and licenses return to result screen', js(page, '__POSE__.snapshot().screen') == 'result')
        # Cooldown, flight handling, damage, failure and pickup systems.
        js(page, '__POSE__.game.begin(); __POSE__.game.mouse.active=false; __POSE__.game.mouse.x=0; __POSE__.game.mouse.y=0')
        snap = js(page, '__POSE__.run(4.2,false,{turn:0,throttle:0,boost:false,fire:true,cable:false,brake:false})')
        check('Continuous fire overheats cannons', snap['overheated'], snap)
        snap = js(page, '__POSE__.run(3,false,{turn:0,throttle:0,boost:false,fire:false,cable:false,brake:false})')
        check('Released fire cools and unlocks cannons', snap['heat'] < 25 and not snap['overheated'], snap['heat'])
        baseline = js(page, '__POSE__.game.player.speed')
        js(page, '__POSE__.run(1,false,{turn:0,throttle:0,boost:true,fire:false,cable:false,brake:false})')
        check('Boost increases speed', js(page, '__POSE__.game.player.speed') > baseline * 1.4)
        yaw = js(page, '__POSE__.game.player.yaw')
        page.keyboard.down('d')
        js(page, '__POSE__.run(.5,false)')
        page.keyboard.up('d')
        check('Keyboard steers flight', abs(js(page, '__POSE__.game.player.yaw') - yaw) > .4)
        js(page, '__POSE__.game.begin(); __POSE__.game.player.hp=40; __POSE__.game.player.pos.copy(__POSE__.game.cache[0].pos); __POSE__.run(.05,false,{turn:0,throttle:0,boost:false,fire:false,cable:false,brake:false})')
        check('Repair pickup restores hull and records collection', js(page, '__POSE__.game.player.hp') == 72 and js(page, '__POSE__.game.stats.repairs') == 1)
        js(page, '__POSE__.game.begin(); __POSE__.game.damagePlayer(300)')
        check('Hull loss ends the sortie', js(page, '__POSE__.snapshot().completed && !__POSE__.game.won'))
        js(page, '__POSE__.game.begin(); __POSE__.game.damageArk(1000)')
        check('Transport loss ends the sortie', js(page, '__POSE__.snapshot().completed && !__POSE__.game.won'))
        js(page, '__POSE__.game.begin()')
        check('Fresh run clears prior victory and result state', not js(page, '__POSE__.snapshot().won') and not js(page, '__POSE__.snapshot().completed'))
        # Cable launches, releases and tension failures use the real mechanic.
        js(page, "__POSE__.game.begin(); __POSE__.game.ui.action('nextStage'); {let g=__POSE__.game,w=g.entities.find(e=>e.type==='walker');g.player.pos.set(w.pos.x+36,9,w.pos.z);g.player.yaw=Math.PI;g.tryCable();}")
        check('Tow attaches in range', js(page, '!!__POSE__.snapshot().tether'))
        js(page, '__POSE__.run(1,false,{turn:0,throttle:0,boost:false,fire:false,cable:false,brake:false})')
        check('Tow orbit earns wraps', js(page, '__POSE__.snapshot().tether.wraps') > .05)
        page.keyboard.press('Space')
        js(page, '__POSE__.run(.05,false)')
        check('Tow button releases the line', js(page, '__POSE__.snapshot().tether') is None)
        js(page, "__POSE__.run(1.2,false);{let g=__POSE__.game,w=g.entities.find(e=>e.type==='walker');g.player.pos.set(w.pos.x+36,9,w.pos.z);g.tryCable();}__POSE__.run(7,false,{turn:0,throttle:0,boost:true,fire:false,cable:false,brake:false})")
        check('Excess boost snaps the cable', js(page, '__POSE__.game.stats.cableSnaps') >= 1)
        # Pause-menu developer and preference tools.
        js(page, '__POSE__.game.begin()')
        page.keyboard.press('Escape')
        before = js(page, '__POSE__.snapshot().time')
        js(page, '__POSE__.run(2,false)')
        check('Pause freezes simulation', js(page, '__POSE__.snapshot().time') == before)
        page.get_by_role('button', name='Developer tools').click()
        check('Developer mode reachable from pause', js(page, '__POSE__.snapshot().screen') == 'dev')
        speed = page.get_by_role('slider', name='Cruise speed')
        speed.focus()
        js(page, '__POSE__.game.ui.focus(0)')
        page.keyboard.press('ArrowRight')
        check('Live balance slider changes flight model', js(page, '__POSE__.game.balance.speed') == 33)
        page.get_by_role('button', name='Reset balance to defaults').click()
        check('Balance reset restores defaults', js(page, '__POSE__.game.balance.speed') == 32)
        step_before = js(page, '__POSE__.snapshot().time')
        page.get_by_role('button', name='Step one simulation frame').click()
        check('Developer frame step advances exactly one tick', abs(js(page, '__POSE__.snapshot().time') - step_before - 1/60) < 1e-6)
        js(page, '__POSE__.game.player.hp=20;__POSE__.game.ark.hp=20')
        page.get_by_role('button', name='Repair skimmer & transport').click()
        check('Developer repair tool works', js(page, '__POSE__.snapshot().hp') == 100 and js(page, '__POSE__.snapshot().arkHp') == 180)
        page.get_by_role('button', name='Back to pause').click()
        page.get_by_role('button', name='Settings', exact=True).click()
        page.get_by_role('slider', name='Music', exact=True).evaluate('(el)=>{el.value=.23;el.dispatchEvent(new Event("input"))}')
        check('Audio volume preference is live', js(page, '__POSE__.snapshot().music') == .23)
        page.get_by_role('button', name='Reset preferences').click()
        check('Preferences restore ten percent music', js(page, '__POSE__.snapshot().music') == .1)
        # Gamepad API standard mapping, glyphs and the hub-reserved chord.
        js(page, "__POSE__.game.ui.action('title'); __pressPad(0,true); __POSE__.game.pollPad(.016); __pressPad(0,false); __POSE__.game.pollPad(.016)")
        check('Standard gamepad launches menu selection', js(page, '__POSE__.snapshot().mode') == 'playing')
        check('PlayStation prompts follow gamepad', 'R2' in page.locator('#actionHints').inner_text())
        yaw = js(page, '__POSE__.game.player.yaw')
        js(page, '__testPad.axes[0]=.8;__pressPad(7,true);__POSE__.game.pollPad(.016);__POSE__.run(.6,false);__testPad.axes[0]=0;__pressPad(7,false);__POSE__.game.pollPad(.016)')
        check('Gamepad stick steers and trigger fires', abs(js(page, '__POSE__.game.player.yaw') - yaw) > .3 and js(page, '__POSE__.game.shots') > 0)
        js(page, '__pressPad(8,true);__pressPad(9,true);__POSE__.game.pollPad(.016)')
        check('Create plus Options is ignored by game', js(page, '__POSE__.snapshot().mode') == 'playing')
        js(page, '__pressPad(8,false);__pressPad(9,false);__POSE__.game.pollPad(.016);__pressPad(9,true);__POSE__.game.pollPad(.016);__pressPad(9,false);__POSE__.game.pollPad(.016)')
        check('Options pauses the game', js(page, '__POSE__.snapshot().screen') == 'pause')
        js(page, "__POSE__.game.settings.glyphs='xbox';__POSE__.game.ui.refreshHints()")
        check('Xbox prompt option is respected', 'RT' in page.locator('#actionHints').inner_text())
        js(page, "__POSE__.game.settings.glyphs='ps';__padPresent=false;__POSE__.game.ui.action('title')")
        # Attract idle, actual AI/replay loop and any-input return.
        js(page, '__POSE__.game.manual=false;__POSE__.game.lastInteraction=performance.now()-10010;__POSE__.game.frame(performance.now()+60);__POSE__.pauseClock()')
        check('Ten-second idle enters attract mode', js(page, '__POSE__.snapshot().mode') == 'attract')
        attract = []
        for _ in range(35):
            state = js(page, '__POSE__.run(10,true)')
            attract.append(state)
            if state['completed']:
                break
        (ART / 'attract.json').write_text(json.dumps(attract, indent=2))
        check('Attract showcases all mission mechanics', state['completed'] and state['topples'] == 2, state)
        js(page, '__POSE__.run(5,true)')
        check('Attract loops to a fresh sortie', js(page, '__POSE__.snapshot().mode') == 'attract' and js(page, '__POSE__.snapshot().time') < 6, js(page, '__POSE__.snapshot()'))
        page.keyboard.press('Enter')
        check('Any input exits attract without starting a run', js(page, '__POSE__.snapshot().mode') == 'title', js(page, '__POSE__.snapshot()'))
        # Synthesis is verified as data, not by claiming an audible review.
        js(page, '__POSE__.game.sound.unlock();__POSE__.game.sound.laser();__POSE__.game.sound.voice("The cold front is clear.");__POSE__.game.sound.update(32,true,false)')
        page.wait_for_timeout(80)
        check('Web Audio produces a measurable live signal', js(page, '__POSE__.audioLevel()') > .0001)
        probe = js(page, '__POSE__.audioProbe()')
        check('Offline synthesizer has finite audible-range output', probe['supported'] and .001 < probe['rms'] < .5 and probe['peak'] < 1, probe)
        check('Gibberish voices are synthesized', js(page, '__POSE__.game.sound.voices') > 0)
        # Visual-only captures use the renderer backend that headless screenshots can see.
        load(page, GAME.as_uri() + '?test=1&manual=1&renderer=webgl')
        check('WebGL fallback works', js(page, '__POSE__.snapshot().backend') == 'WebGL 2 fallback')
        js(page, '__POSE__.render()')
        page.screenshot(path=str(ART / 'title.png'))
        page.get_by_role('button', name='Launch sortie').click()
        js(page, '__POSE__.game.cameraUpdate(1);__POSE__.render()')
        page.screenshot(path=str(ART / 'flight.png'))
        js(page, "__POSE__.game.ui.action('nextStage');{let g=__POSE__.game,w=g.entities.find(e=>e.type==='walker');g.player.pos.set(w.pos.x+36,9,w.pos.z);g.player.yaw=Math.PI;g.tryCable();}__POSE__.run(3,false,{turn:0,throttle:0,boost:false,fire:false,cable:false,brake:false});__POSE__.render()")
        page.screenshot(path=str(ART / 'cable.png'))
        js(page, '__POSE__.game.toggleCamera();__POSE__.render()')
        page.screenshot(path=str(ART / 'tactical.png'))
        js(page, "__POSE__.game.ui.action('nextStage');__POSE__.game.settings.camera='chase';__POSE__.game.player.pos.set(20,9,120);__POSE__.game.player.yaw=Math.PI;__POSE__.run(20,true);__POSE__.render()")
        page.screenshot(path=str(ART / 'escort.png'))
        # Actual two-document transports: BroadcastChannel and WebRTC handshake.
        load(page, url + '?test=1&manual=1')
        other = context.new_page()
        other.on('pageerror', lambda err: errors.append(str(err)))
        load(other, url + '?test=1&manual=1')
        for pg in [page, other]:
            js(pg, "__POSE__.game.net.joinLocal('automated-wing');__POSE__.game.begin();__POSE__.run(.5,false)")
        js(page, '__POSE__.run(.5,false)')
        page.wait_for_timeout(100)
        check('BroadcastChannel wing exchanges player states', js(page, '__POSE__.snapshot().net.peers') >= 1 and js(other, '__POSE__.snapshot().net.peers') >= 1)
        js(page, '__POSE__.game.updateGhosts(.1)')
        check('Wing echo craft rendered in matching chapter', js(page, '__POSE__.game.ghosts.size') >= 1)
        offer = js(page, '__POSE__.game.net.invite()')
        answer = other.evaluate('(code)=>__POSE__.game.net.accept(code)', offer)
        page.evaluate('(code)=>__POSE__.game.net.accept(code)', answer)
        page.wait_for_function('__POSE__.game.net.dc?.readyState === "open"', timeout=12000)
        other.wait_for_function('__POSE__.game.net.dc?.readyState === "open"', timeout=12000)
        check('Direct WebRTC invite-answer links two players', True)
        # Disconnect BC to prove that the direct channel itself carries messages.
        for pg in [page, other]:
            js(pg, '__POSE__.game.net.bc.close();__POSE__.game.net.bc=null;__POSE__.game.net.peers.clear();__POSE__.run(.5,false)')
        js(page, '__POSE__.run(.5,false)')
        page.wait_for_timeout(100)
        check('Direct channel exchanges wing ghosts', js(page, '__POSE__.game.net.peers.has("direct")') and js(other, '__POSE__.game.net.peers.has("direct")'))
        other.close()
        # Mobile input uses actual simultaneous touch contacts through Chromium CDP.
        page.close()
        mobile_context = browser.new_context(viewport={'width':844,'height':390}, has_touch=True, is_mobile=True, device_scale_factor=1)
        mobile = mobile_context.new_page()
        mobile.on('pageerror', lambda err: errors.append(str(err)))
        load(mobile, url + '?test=1&manual=1&renderer=webgl')
        mobile.get_by_role('button', name='Launch sortie').tap()
        cdp = mobile_context.new_cdp_session(mobile)
        cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':100,'y':280,'id':1},{'x':720,'y':240,'id':2}]})
        cdp.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[{'x':154,'y':235,'id':1},{'x':740,'y':220,'id':2}]})
        touch = js(mobile, '({pointers:__POSE__.game.touch.pointers.size,turn:__POSE__.game.touch.turn,fire:__POSE__.game.touch.fire,input:__POSE__.game.lastInput})')
        check('Simultaneous touch steering and aim work', touch['pointers'] == 2 and touch['turn'] > .5 and touch['fire'] and touch['input'] == 'touch', touch)
        check('Touch hides keyboard action strip', mobile.locator('#actionHints').evaluate('(el)=>getComputedStyle(el).display') == 'none')
        js(mobile, '__POSE__.run(.5,false)')
        cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
        check('Touch release clears invisible sticks', js(mobile, '__POSE__.game.touch.pointers.size') == 0 and js(mobile, '__POSE__.game.touch.turn') == 0)
        js(mobile, "__POSE__.game.ui.action('nextStage');{let g=__POSE__.game,w=g.entities.find(e=>e.type==='walker');g.player.pos.set(w.pos.x+36,9,w.pos.z);g.updateHUD();}__POSE__.render()")
        check('Context-sensitive touch tow appears near a walker', mobile.locator('#touchAction').is_visible())
        mobile.locator('#touchAction').tap()
        js(mobile, '__POSE__.run(.05,false)')
        check('Touch tow starts real cable action', bool(js(mobile, '__POSE__.snapshot().tether')))
        mobile.screenshot(path=str(ART / 'touch.png'))
        mobile.set_viewport_size({'width':390,'height':844})
        js(mobile, "__POSE__.game.ui.action('title');__POSE__.render()")
        title_box = mobile.get_by_role('button', name='Launch sortie').bounding_box()
        check('Portrait phone menu keeps launch in the viewport', title_box is not None and title_box['y'] >= 0 and title_box['y']+title_box['height'] <= 844)
        check('Touch menu shows native drag and tap instructions', 'Tap to launch' in mobile.locator('.menu-controls').inner_text() and 'WASD' not in mobile.locator('.menu-controls').inner_text())
        mobile.screenshot(path=str(ART / 'phone-title.png'))
        mobile_context.close()
        tablet_options = dict(p.devices['iPad (gen 7)'])
        tablet_options['device_scale_factor'] = 1
        tablet_context = browser.new_context(**tablet_options)
        tablet = tablet_context.new_page()
        load(tablet, url + '?test=1&manual=1')
        tablet.get_by_role('button', name='Launch sortie').tap()
        check('Tablet device profile launches with native touch prompts', js(tablet, '__POSE__.snapshot().mode') == 'playing' and js(tablet, '__POSE__.snapshot().lastInput') == 'touch')
        tablet_context.close()
        # Hub's official conformance suite, including loss/jitter and host departure.
        harness = context.new_page()
        harness.on('pageerror', lambda err: errors.append(str(err)))
        for label, params in [('two-player','players=2'),('four-player-loss','players=4&latency=150&jitter=50&loss=5'),('host-leave','players=4&latency=150&jitter=50&loss=5&scenario=host-leave')]:
            hurl = base + urllib.parse.quote(HERE.name) + '/harness.html?game=../' + urllib.parse.quote(GAME.name) + '&' + params + '&auto=1&play=5000'
            harness.goto(hurl, wait_until='load')
            harness.wait_for_function('document.body.dataset.complete === "true"', timeout=100000)
            report = js(harness, 'window.__hubCheck')
            (ART / ('hub-' + label + '.json')).write_text(json.dumps(report, indent=2))
            failed = [c for c in report['checks'] if not c['pass']]
            check('AI Hub official harness: ' + label, report['pass'], failed)
        harness.close()
        check('No JavaScript errors across all scenarios', not errors, errors)
    except Exception as exc:
        check('Browser scenarios completed', False, str(exc))
        try:
            page.screenshot(path=str(ART / 'failure.png'), timeout=10000)
        except Exception:
            pass
    finally:
        (ART / 'errors.json').write_text(json.dumps(errors, indent=2))
        browser.close()
server.shutdown()
server.server_close()
(ART / 'results.json').write_text(json.dumps(checks, indent=2))
failed = sum(not c['pass'] for c in checks)
print(f'{len(checks)} checks: {len(checks)-failed} passed, {failed} failed.')
sys.exit(bool(failed))
