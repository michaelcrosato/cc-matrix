"""One-command Star Riders verification. Run with the installed Playwright Python.

/home/micha/.local/share/pipx/venvs/playwright/bin/python <dev-folder>/tests.py
Only failures and the final check count are printed. Every server/browser is owned
and cleaned up by this process. No screenshots or external audio files are used.
"""
from __future__ import annotations

import json
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parent
ROOT = DEV.parent
HTML = ROOT / (DEV.name + '.html')
FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan',
         '--use-webgpu-adapter=swiftshader', '--disable-dev-shm-usage']
HOOK = 'window.__STAR_RIDERS__'
checks = 0
failures: list[str] = []


def check(name, fn, count=1):
    global checks
    checks += count
    try:
        fn()
        return True
    except Exception as error:
        message = str(error).strip().split('\nCall log:')[0]
        failure=f'{name}: {message[:1200]}'
        failures.append(failure)
        print('FAIL ' + failure, flush=True)
        return False


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def run_network_unit():
    global checks
    result = subprocess.run(['node', str(DEV / 'network-tests.mjs')],
                            capture_output=True, text=True, timeout=30, cwd=DEV)
    require(result.returncode == 0, result.stdout + result.stderr)
    match = re.search(r'(\d+) networking checks, 0 failures', result.stdout)
    require(match is not None, 'Networking unit runner did not report its count.')
    checks += int(match.group(1)) - 1


def run_real_network():
    result = subprocess.run([sys.executable, str(DEV / 'network-browser-test.py')],
                            capture_output=True, text=True, timeout=75, cwd=DEV)
    require(result.returncode == 0, result.stdout + result.stderr)
    report = json.loads(result.stdout.strip().splitlines()[-1])
    require(report.get('passed'), f'Real PeerJS/WebRTC room failed: {report}')
    require(report['seedA'] == report['seedB'], 'Room seeds diverged.')
    require(report['ghostA']['from'] == 1 and report['ghostB']['from'] == 0,
            'Ghost packets arrived with the wrong identities.')


def js(page, expression):
    return page.evaluate(f'() => {{ const g={HOOK}; {expression} }}')


def expect_js(page, expression, message):
    require(js(page, 'return !!(' + expression + ');'), message)


def advance(page, seconds, dt=1 / 60):
    js(page, f'for(let i=0;i<{int(seconds / dt) + 1};i++)g.step({dt});')


def frames(page, count=2):
    page.evaluate('''n => new Promise(resolve => {
        const tick=()=> --n<=0 ? resolve() : requestAnimationFrame(tick);
        requestAnimationFrame(tick);
    })''', count)


def start(page):
    js(page, 'g.start({seed:1982});')


def new_page(context, url):
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(url, wait_until='domcontentloaded', timeout=90000)
    page.wait_for_function(f'{HOOK}?.state.ready === true', timeout=120000)
    return page, errors


def pad_set(page, button=None, pressed=False, axes=None):
    page.evaluate('''({button,pressed,axes})=>{
      if(!window.__testPad)window.__testPad={id:'DualSense Test Controller',index:0,
        connected:true,mapping:'standard',timestamp:0,axes:[0,0,0,0],
        buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
      if(button!==null)window.__testPad.buttons[button]={pressed,touched:pressed,value:pressed?1:0};
      if(axes)window.__testPad.axes=axes;
    }''', {'button': button, 'pressed': pressed, 'axes': axes})


def pad_tap(page, button, condition=None):
    pad_set(page, button, True)
    if condition:
        page.wait_for_function(f'(()=>{{const g={HOOK};return {condition};}})()', timeout=12000)
    else:
        frames(page, 3)
    pad_set(page, button, False)
    frames(page, 3)


def test_single_player(page, errors):
    check('file:// engine initialization and exact dependency versions', lambda: require(
        js(page, "return g.getSnapshot().backend==='webgpu' && g.getSnapshot().threeRevision==='180' && g.getSnapshot().physicsVersion==='0.19.3' && g.getSnapshot().bodies>=2;"),
        'Expected native WebGPU, Three.js r180, Rapier 0.19.3 and a populated physics world; got ' + str(js(page, 'return g.getSnapshot();'))))
    check('title screen visible and default music is ten percent', lambda: expect_js(page,
        "g.state.mode==='title' && g.state.screen==='title' && !document.querySelector('#title').classList.contains('hidden') && Math.abs(g.settings.music-.1)<.001",
        'Title state or default music volume differs from the requested startup.'))

    def title_keyboard():
        page.locator('#title [data-action="launch"]').focus()
        page.keyboard.press('ArrowDown')
        require(page.evaluate('document.activeElement.dataset.action') != 'launch', 'ArrowDown did not move menu focus.')
        page.locator('#title [data-action="launch"]').focus()
        page.keyboard.press('Enter')
        page.wait_for_function(f'{HOOK}.state.mode==="playing" && !{HOOK}.state.screen')
    check('keyboard menu focus and launch', title_keyboard)

    def keyboard_controls():
        before = js(page, 'return g.state.shields;')
        page.keyboard.press('q')
        require(js(page, 'return g.state.shields;') is not before, 'Q did not toggle shields.')
        page.keyboard.press('r')
        expect_js(page, 'g.state.rear', 'R did not enable the aft view.')
        page.keyboard.press('r')
        page.keyboard.down('Shift')
        page.wait_for_function(f'{HOOK}.state.boost>0', timeout=10000)
        page.keyboard.up('Shift')
        require(js(page, 'return g.state.boostCooldown;') > 0, 'Boost did not enter cooldown.')
        page.keyboard.press('Escape')
        page.wait_for_function(f'{HOOK}.state.screen==="pause"')
        before = js(page, 'return g.state.time;')
        advance(page, 1)
        require(js(page, 'return g.state.time;') == before, 'Pause advanced the simulation.')
    check('flight controls, aft view, boost and pause freeze', keyboard_controls)

    def dev_tuning():
        page.locator('#pause [data-action="dev"]').click()
        slider = page.locator('#enemy-damage')
        slider.focus()
        slider.press('ArrowRight')
        expect_js(page, 'g.balance.enemyDamage>1', 'Developer damage slider did not apply live.')
        page.locator('#dev [data-action="reset-dev"]').click()
        expect_js(page, 'Object.values(g.balance).every(v=>v===1)', 'Reset did not restore all live defaults.')
        page.locator('#dev [data-action="invincible"]').click()
        expect_js(page, 'g.state.invincible', 'Developer invulnerability did not toggle.')
        page.locator('#dev [data-action="invincible"]').click()
        page.locator('#dev [data-action="back"]').click()
        page.locator('#pause [data-action="resume"]').click()
    check('pause-menu developer tools and live slider reset', dev_tuning)

    def shield_and_damage():
        report = js(page, '''
          g.state.invincible=false;g.state.shields=false;g.state.hull=100;g.state.shield=100;
          g.damagePlayer(20);const unshielded=g.state.hull;
          g.state.shields=true;g.state.hull=100;g.state.shield=100;
          g.damagePlayer(20);const protectedHull=g.state.hull,shield=g.state.shield;
          g.state.shields=false;g.state.hull=100;g.damagePlayer(60);
          const engines=g.state.system;g.damagePlayer(30);const photons=g.state.system;
          g.action('repair');return {unshielded,protectedHull,shield,engines,photons};
        ''')
        require(report['unshielded'] == 80 and report['protectedHull'] > 95 and report['shield'] < 100,
                f'Shield mitigation incorrect: {report}')
        require('ENGINES' in report['engines'] and 'PHOTON' in report['photons'],
                f'Damage did not disable the expected systems: {report}')
    check('shields, hull damage and damaged ship systems', shield_and_damage)

    def nav_and_dock():
        page.keyboard.press('m')
        page.wait_for_function(f'{HOOK}.state.screen==="map"')
        require(page.locator('#map [data-sector]').count() == 12, 'Chart does not contain twelve sectors.')
        page.locator('#map [data-sector="0"]').click()
        js(page, 'g.state.energy=1;')
        page.keyboard.press('Enter')
        expect_js(page, "g.state.warp===0 && g.state.sector===1 && g.state.screen==='map'", 'Insufficient-energy jump was accepted.')
        js(page, 'g.state.energy=1000;')
        page.keyboard.press('Enter')
        expect_js(page, 'g.state.warp>0 && g.state.energy<1000', 'Chart jump did not consume energy and enter hyperwarp.')
        advance(page, 3)
        expect_js(page, 'g.state.sector===0 && g.state.warp===0', 'Hyperwarp did not arrive at PORCHLIGHT.')
        js(page, "g.state.hull=25;g.state.shield=15;g.state.energy=100;g.state.system='PHOTON TUBES DAMAGED';")
        page.keyboard.press('Enter')
        expect_js(page, 'g.state.dock>0', 'Docking clearance did not start the tractor.')
        advance(page, 5.2)
        expect_js(page, "g.state.docked && g.state.dock===0 && g.state.dockVisits===1 && g.state.hull>=99 && g.state.shield>=99 && g.state.energy>990 && g.state.system==='ALL SYSTEMS NOMINAL'", 'Docking did not restore hull, shields, energy and systems.')
    check('chart navigation, energy rejection, hyperwarp and full docking service', nav_and_dock)

    def base_pressure():
        before = js(page, 'const b=g.sectors.find(s=>s.type===\'base\');b.pressure=76;return b.baseHealth;')
        advance(page, 1)
        after = js(page, "return g.sectors.find(s=>s.type==='base').baseHealth;")
        require(after < before, 'Hostile fleets did not apply pressure to starbases.')
    check('strategic hostile pressure damages stations', base_pressure)

    def actual_physics_hit():
        start(page)
        result = js(page, '''
          g.state.invincible=true;g.balance.weaponPower=5;
          const e=g.entities.find(e=>e.alive&&e.type==='fighter');
          const p=e.mesh.position.toArray();g.setPosition([p[0],p[1],p[2]+100]);
          g.state.yaw=0;g.state.pitch=0;g.state.speed=0;e.fire=99;
          g.step(1/60);g.state.target=e;g.state.lock=1;g.state.fireCooldown=0;
          const before=g.state.kills;g.fire();for(let i=0;i<45;i++)g.step(1/60);
          return {alive:e.alive,before,kills:g.state.kills,shots:g.state.shots,hits:g.state.hits};
        ''')
        require(not result['alive'] and result['kills'] > result['before'] and result['shots'] > 0 and result['hits'] > 0,
                f'Actual photon shots failed Rapier hit detection: {result}')
    check('photon projectiles destroy an enemy through Rapier ray collision', actual_physics_hit)

    def audio_proof():
        proof = page.evaluate(f'{HOOK}.audio.constructor.renderProof()')
        require(proof.get('supported') and proof['peak'] > .001 and proof['rms'] > .0001 and proof['nonzero'] > 1000,
                f'Procedural audio rendered silence: {proof}')
        require(abs(proof['musicVolume'] - .1) < .001, f'Offline music default differs from 10%: {proof}')
        expect_js(page, 'g.audio.stats.active && g.audio.stats.events.laser>0', 'Live Web Audio did not unlock or record weapon sounds.')
    check('procedural music, effects and gibberish voice produce offline audio', audio_proof)

    def full_mission():
        report = js(page, '''
          g.start({seed:1982});g.state.invincible=true;g.balance.energyDrain=0;g.balance.weaponPower=5;
          const visited=[],types=new Set(),failures=[];let shotAttempts=0;
          function tick(n){for(let i=0;i<n;i++)g.step(1/60);}
          function travel(index){g.state.energy=1000;g.jump(index);let tries=0;while(g.state.warp>0&&tries++<200)tick(1);if(g.state.sector!==index)throw Error('Jump failed for '+index);visited.push(index);}
          function clear(){
            let guard=0;
            while(g.entities.some(e=>e.alive&&e.type!=='asteroid')&&guard++<80){
              const e=g.entities.find(e=>e.alive&&e.type!=='asteroid');types.add(e.type);
              const p=e.mesh.position.toArray();g.setPosition([p[0],p[1],p[2]+105]);
              g.state.yaw=0;g.state.pitch=0;g.state.speed=0;e.fire=99;tick(1);
              g.state.target=e;g.state.lock=1;g.state.fireCooldown=0;g.fire();shotAttempts++;tick(30);
            }
            if(g.entities.some(e=>e.alive&&e.type!=='asteroid'))throw Error('Contacts resisted photon fire in '+g.state.sector);
          }
          for(const i of [1,2,3,5,7,9]){travel(i);clear();}
          if(!g.state.finale)throw Error('Clearing patrol sectors did not reveal command ship.');
          travel(11);
          const finale=g.entities.filter(e=>e.alive&&e.type!=='asteroid').map(e=>e.type);
          if(finale.length!==3||finale.filter(t=>t==='basestar').length!==1)throw Error('Finale composition incorrect: '+finale.join(','));
          clear();return {visited,types:[...types],shotAttempts,finale,snapshot:g.getSnapshot(),title:document.querySelector('#result-title')?.textContent};
        ''')
        require(report['visited'] == [1, 2, 3, 5, 7, 9, 11], f'Mission omitted a combat sector: {report}')
        require(set(report['types']) == {'fighter', 'cruiser', 'basestar'}, f'Missing enemy class: {report}')
        require(report['snapshot']['mode'] == 'results' and report['snapshot']['remaining'] == 0 and report['snapshot']['kills'] == 22 and report['snapshot']['score'] > 10000,
                f'Full photon-fire mission did not produce a valid victory: {report}')
        require('CLEAR' in report['title'], f'Victory debrief does not announce success: {report}')
    check('scripted full mission: all sectors, enemy classes, command ship and victory', full_mission)

    def losses():
        result = js(page, '''
          g.start();g.state.shields=false;g.damagePlayer(1000);const hull=g.state.mode;
          g.start();g.state.energy=.001;g.step(.1);const energy=g.state.mode;
          g.start();for(const b of g.sectors.filter(s=>s.type==='base')){b.baseHealth=.00001;b.pressure=76;}
          g.step(.1);return {hull,energy,bases:g.state.mode};
        ''')
        require(all(value == 'results' for value in result.values()), f'A mission failure branch did not finish: {result}')
    check('hull loss, energy depletion and both-stations-lost debriefs', losses)

    def about():
        js(page, "g.action('abort');g.action('about');")
        text = page.locator('#about').inner_text().lower()
        for phrase in ['source information', 'testing feedback', 'engine feedback', 'prompt feedback', 'added on import']:
            require(phrase in text, f'About/Credits missing required section: {phrase}')
        js(page, "g.action('back');")
    if (ROOT / 'exit-interview.json').exists():
        check('About/Credits includes source and all required feedback sections', about)

    def attract():
        js(page, "g.action('abort');g.state.idle=0;")
        page.wait_for_function(f'{HOOK}.state.attract', timeout=16000)
        expect_js(page, "g.state.mode==='playing' && g.state.invincible", 'Attract did not start an invulnerable AI flight.')
        js(page, 'g.finish(true);g.step(.05);')
        expect_js(page, "g.state.attract && g.state.attractTime<1 && g.state.mode==='playing' && !g.state.ended", 'Completing an attract mission did not restart the replay loop.')
        page.keyboard.press('Escape')
        expect_js(page, "g.state.mode==='title' && !g.state.attract", 'Input did not leave attract mode for the title.')
    check('ten-second idle attract demo, replay loop and any-input exit', attract)

    def controller():
        page.locator('#title [data-action="launch"]').focus()
        pad_tap(page, 0, "g.state.mode==='playing'")
        expect_js(page, "g.state.input==='gamepad'", 'Controller did not become the active input device.')
        pad_tap(page, 3, "g.state.screen==='map'")
        pad_tap(page, 1, '!g.state.screen')
        pad_set(page, 8, True); pad_set(page, 9, True); frames(page, 3)
        expect_js(page, '!g.state.paused', 'Create + Options was intercepted by the game.')
        pad_set(page, 8, False); pad_set(page, 9, False); frames(page, 3)
        pad_tap(page, 9, "g.state.screen==='pause'")
        page.locator('#pause [data-action="settings"]').click()
        page.locator('#glyphs').focus()
        pad_tap(page, 15)
        expect_js(page, "g.settings.glyphs==='xbox'", 'D-pad could not change the controller glyph preference.')
        page.locator('#settings [data-action="back"]').click()
        page.locator('#pause [data-action="resume"]').click()
        pad_tap(page, 4)
        text = page.locator('#control-prompts').inner_text()
        require('RT' in text, f'Xbox prompts did not follow the selected preference: {text}')
        page.evaluate('window.__testPad=null')
    check('standard gamepad menus, launch, chart, hub chord and Xbox glyph preference', controller)
    check('single-player JavaScript has no uncaught errors', lambda: require(not errors, '\n'.join(errors)))


def test_touch(browser, base):
    context = browser.new_context(viewport={'width': 844, 'height': 390}, has_touch=True, is_mobile=True,
                                  device_scale_factor=1)
    try:
        page, errors = new_page(context, base + '/' + HTML.name)
        def touch_flow():
            page.locator('#title [data-action="launch"]').tap()
            page.wait_for_function(f'{HOOK}.state.mode==="playing"')
            page.touchscreen.tap(170, 170)
            expect_js(page, "g.state.input==='touch' && document.body.classList.contains('touch')", 'Touch did not enable assisted mobile flight.')
            cdp = context.new_cdp_session(page)
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [
                {'x': 150, 'y': 230, 'id': 1}, {'x': 690, 'y': 210, 'id': 2}]})
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [
                {'x': 175, 'y': 190, 'id': 1}, {'x': 720, 'y': 190, 'id': 2}]})
            advance(page, .3)
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            page.locator('#touch-menu').tap()
            page.wait_for_function(f'{HOOK}.state.screen==="pause"')
            page.locator('#pause [data-action="map"]').tap()
            page.wait_for_function(f'{HOOK}.state.screen==="map"')
            require(page.locator('#map [data-sector]').count()==12, 'Touch pause chart did not show all sectors.')
            page.locator('#map [data-action="back"]').tap()
            expect_js(page, "!g.state.screen && !g.state.paused && g.state.mode==='playing'", 'Touch chart return did not restore flight.')
            require(not errors, '\n'.join(errors))
        check('touch launch, invisible multitouch sticks, assistance and pause', touch_flow)
    finally:
        context.close()



def test_online_lobby(browser, base):
    context = browser.new_context(viewport={'width': 1280, 'height': 720})
    try:
        host, host_errors = new_page(context, base + '/' + HTML.name)
        guest, guest_errors = new_page(context, base + '/' + HTML.name)
        def lobby_round():
            for page in (host, guest):
                page.locator('#title [data-action="online"]').click()
                page.wait_for_function(f'{HOOK}.state.screen==="lobby"')
                js(page, "window.__receivedGhosts=[];const original=g.network.onGhost;g.network.onGhost=(data,from)=>{window.__receivedGhosts.push({data,from});original(data,from);};")
            host.locator('#lobby [data-action="host"]').click()
            host.wait_for_function(f'{HOOK}.network.active && {HOOK}.network.roomCode.length===6', timeout=30000)
            code = js(host, 'return g.network.roomCode;')
            guest.locator('#room-code').fill(code)
            guest.locator('#lobby [data-action="join"]').click()
            for page in (host, guest):
                page.wait_for_function(f'{HOOK}.network.players.length===2', timeout=30000)
            host.locator('#lobby [data-action="room-launch"]').click()
            for page in (host, guest):
                page.wait_for_function(f'{HOOK}.state.mode==="playing" && {HOOK}.network.started', timeout=15000)
                page.wait_for_function('window.__receivedGhosts.some(g=>!g.data.gone)', timeout=12000)
            require(js(host, 'return g.network.seed;') == js(guest, 'return g.network.seed;'), 'Online wing started with divergent seeds.')
            require(js(host, 'return g.network.me;') == 0 and js(guest, 'return g.network.me;') == 1,
                    'Online wing assigned incorrect seats.')
            require(js(host, 'return window.__receivedGhosts.some(p=>p.from===1 && p.data.sector===g.state.sector);'), 'Host did not receive guest flight ghosts.')
            require(js(guest, 'return window.__receivedGhosts.some(p=>p.from===0 && p.data.sector===g.state.sector);'), 'Guest did not receive host flight ghosts.')
            js(host, "g.state.score=100;g.finish(true);")
            js(guest, "g.state.score=250;g.finish(true);")
            for page in (host, guest):
                page.wait_for_function(f'{HOOK}.network.results.size===2', timeout=12000)
            require(js(host, 'return g.network.standingsText();') == js(guest, 'return g.network.standingsText();'),
                    'Online wing scoreboards disagree.')
            require(not host_errors and not guest_errors, str(host_errors + guest_errors))
        check('integrated two-browser online lobby, synchronized launch, ghosts and rankings', lobby_round)
    finally:
        for page in context.pages:
            try:
                js(page, 'g.network.leave();')
            except Exception:
                pass
        context.close()


def test_hub(browser, base):
    global checks
    context = browser.new_context(viewport={'width': 1280, 'height': 720})
    page = context.new_page()
    try:
        for players, scenario in [(2, ''), (4, ''), (4, 'host-leave')]:
            name = f'Integrated AI Hub {players}-player ' + (scenario or 'adverse-network')
            def run(players=players, scenario=scenario):
                global checks
                params = {'game': '../../' + HTML.name, 'players': players, 'auto': 1,
                          'play': 6000, 'latency': 150 if players == 4 else 0,
                          'jitter': 50 if players == 4 else 0, 'loss': 5 if players == 4 else 0}
                if scenario:
                    params['scenario'] = scenario
                url = base + '/' + DEV.name + '/vendor/harness.html?' + urlencode(params)
                page.goto(url, wait_until='domcontentloaded', timeout=90000)
                require(page.title().startswith('AI Hub'), 'Server did not serve the AI Hub harness.')
                page.wait_for_function('window.__hubCheck?.done', timeout=120000)
                report = page.evaluate('window.__hubCheck')
                checks += len(report.get('checks', [])) - 1
                bad = [f"{c['name']}: {c.get('detail','')}" for c in report['checks'] if not c['pass']]
                require(report['pass'], '\n'.join(bad))
                frames = page.frames[1:]
                for frame in frames:
                    if frame.is_detached():
                        continue
                    snapshot = frame.evaluate(f'{HOOK}?.getSnapshot()')
                    if snapshot:
                        require(snapshot['ready'], 'A Hub game frame never finished loading.')
                        require(frame.evaluate(f'{HOOK}.state.hubEnded'), 'Hub end did not freeze the game.')
                        require(frame.evaluate(f'{HOOK}.audio.stats.muted'), 'Hub end did not silence audio.')
            check(name, run)
    finally:
        context.close()


def main():
    require(HTML.is_file(), f'Build the deliverable first: {HTML.name}')
    check('networking unit checks', run_network_unit)
    server = subprocess.Popen(['python3', '-u', '-m', 'http.server', '0', '--bind', '127.0.0.1',
                               '--directory', str(ROOT)], stdout=subprocess.PIPE,
                              stderr=subprocess.DEVNULL, text=True)
    try:
        line = server.stdout.readline()
        match = re.search(r'port (\d+)', line)
        require(match is not None, f'Owned HTTP server failed to bind: {line}')
        base = 'http://127.0.0.1:' + match.group(1)
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, args=FLAGS)
            try:
                context = browser.new_context(viewport={'width': 1920, 'height': 1080})
                context.add_init_script('''window.__testPad=null;
                  Object.defineProperty(navigator,'getGamepads',{value:()=>window.__testPad?[window.__testPad]:[]});''')
                try:
                    page, errors = new_page(context, HTML.as_uri())
                    test_single_player(page, errors)
                finally:
                    context.close()
                test_touch(browser, base)
                test_online_lobby(browser, base)
                test_hub(browser, base)
            finally:
                browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait(timeout=5)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        failures.append(f'Test infrastructure: {error}')
        print(f'FAIL Test infrastructure: {error}', flush=True)
    print(f'{checks} checks, {len(failures)} failures')
    raise SystemExit(1 if failures else 0)
