#!/usr/bin/env python3
"""Quiet integration suite for the final single-file build.
Run: /home/micha/.local/share/pipx/venvs/playwright/bin/python browser-check.py
"""
import functools
import http.server
import json
from pathlib import Path
import threading
import time
from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parent
ROOT = DEV.parent
TITLE = json.loads((DEV / 'title-selection.json').read_text())
HTML = ROOT / (TITLE['folder'] + '.html')
passed = 0
failed = 0
errors = []

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
URL = f'http://127.0.0.1:{server.server_address[1]}/{HTML.name}?renderer=webgl'


def check(name, function):
    global passed, failed
    try:
        function()
        passed += 1
    except Exception as exc:
        failed += 1
        message = str(exc).split('Call log:')[0].strip()
        print(f'FAIL {name}: {message}', flush=True)


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def boot(page, url=URL):
    page.goto(url, wait_until='domcontentloaded', timeout=60000)
    page.wait_for_function('window.__JUNGLE?.ready === true', timeout=90000)
    require(page.title() == TITLE['title'], f'Wrong page: {page.title()}')
    require(HTML.name in page.url, f'Wrong game URL: {page.url}')
    page.wait_for_function("__JUNGLE.screen() === 'title'", timeout=30000)


def screen(page, name):
    page.wait_for_function('(name) => __JUNGLE.screen() === name', arg=name, timeout=20000)


def click(page, parent, action):
    page.locator(f'#{parent} [data-act="{action}"]').click(timeout=20000)


def pad(page, button, until=None, arg=None):
    page.evaluate('(n) => __testPad.buttons[n].pressed = true', button)
    try:
        if until:
            page.wait_for_function(until, arg=arg, timeout=20000)
        else:
            page.wait_for_timeout(350)
    except Exception as error:
        details = page.evaluate("({screen:__JUNGLE.screen(),focus:document.activeElement?.dataset.act,confirm:document.querySelector('#title [data-prompt=confirm]')?.textContent})")
        raise AssertionError(f'Pad button {button} failed {until}: {details}') from error
    finally:
        frame = page.evaluate('__JUNGLE.renderer.info.render.calls')
        page.evaluate('(n) => __testPad.buttons[n].pressed = false', button)
        page.wait_for_function('(frame) => __JUNGLE.renderer.info.render.calls >= frame + 2', arg=frame, timeout=20000)


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=[
            '--enable-unsafe-webgpu', '--enable-features=Vulkan',
            '--use-webgpu-adapter=swiftshader', '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'
        ])
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        context.add_init_script("""window.__testPad={id:'Test DualSense',index:0,mapping:'standard',connected:true,timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[window.__testPad];""")
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))

        def http_boot():
            boot(page)
            require(page.locator('#title').is_visible(), 'Title screen invisible')
            require(page.evaluate('__JUNGLE.renderer.isWebGPURenderer'), 'Native WebGPURenderer is not active')
            require(page.evaluate('__JUNGLE.audio.musicVolume') == .10, 'Music default is not 10%')
        check('HTTP boot, correct title, renderer and music default', http_boot)

        def mouse_hover():
            page.locator('#title [data-act="how"]').hover()
            require(page.evaluate("document.activeElement.dataset.act") == 'how', 'Mouse hover did not move actual focus')
            page.locator('#title [data-act="solo"]').hover()
            require(page.evaluate("document.activeElement.dataset.act") == 'solo', 'Mouse hover did not restore Start focus')
        check('mouse hover moves menu focus', mouse_hover)

        def keyboard_menus():
            page.keyboard.press('ArrowDown')
            page.keyboard.press('ArrowDown')
            page.keyboard.press('Enter')
            screen(page, 'how')
            text = page.locator('#how').inner_text().lower()
            for word in ['vine', 'jaws', 'rocks', 'bells']:
                require(word in text, f'Field guide omits {word}')
            page.keyboard.press('Escape')
            screen(page, 'title')
        check('keyboard focus navigation and four-part field guide', keyboard_menus)

        def native_jump():
            page.keyboard.press('Space')
            screen(page, 'game')
            page.keyboard.down('KeyD')
            page.keyboard.down('Space')
            page.wait_for_function('__JUNGLE.state().stats.jumps > 0', timeout=20000)
            page.keyboard.up('Space')
            page.wait_for_function('__JUNGLE.state().stats.grabs > 0', timeout=25000)
            page.keyboard.up('KeyD')
            require(page.evaluate('__JUNGLE.state().players[0].x') > 5, 'Keyboard movement did not advance')
        check('real keyboard movement, jump and first vine catch', native_jump)

        def pause_freeze():
            page.keyboard.press('Escape')
            screen(page, 'pause')
            before = page.evaluate('__JUNGLE.state().time')
            page.wait_for_timeout(450)
            after = page.evaluate('__JUNGLE.state().time')
            require(before == after, f'World progressed while paused: {before} to {after}')
        check('pause freezes simulation', pause_freeze)

        def dev_tools():
            click(page, 'pause', 'dev')
            screen(page, 'dev')
            require(page.locator('#sliders input').count() == 7, 'Missing live balance sliders')
            page.locator('#dev-speed').evaluate("el=>{el.value=11.2;el.dispatchEvent(new Event('input'))}")
            require(page.evaluate('__JUNGLE.game.config.speed') == 11.2, 'Speed slider does not update live')
            page.locator('#god').check()
            require(page.evaluate('__JUNGLE.game.god'), 'Invulnerability checkbox is disconnected')
            click(page, 'dev', 'reset-tuning')
            require(page.evaluate('__JUNGLE.game.config.speed') == 7.8, 'Reset did not restore speed')
            require(not page.evaluate('__JUNGLE.game.god'), 'Reset did not clear invulnerability')
            page.locator('#stage-select').select_option('1')
            click(page, 'dev', 'warp')
            screen(page, 'game')
            require(page.evaluate('__JUNGLE.state().stage') == 1, 'Chapter warp failed')
            page.wait_for_function("!document.getElementById('air-wrap').classList.contains('hidden')")
        check('pause developer tools, seven sliders, reset and chapter warp', dev_tools)

        def audio_signal():
            data = page.evaluate('__JUNGLE.offlineAudio()')
            require(data['supported'], 'OfflineAudioContext unsupported')
            require(data['rms'] > .001 and data['peak'] > .01, f'Silent generated audio: {data}')
            require(not data['clipping'] and data['peak'] < .99, f'Clipped audio: {data}')
            require(data['nonzero'] > 44100, 'Audio output too short')
        check('procedural soundtrack, effects and voice produce unclipped signal', audio_signal)

        def settings_persist():
            page.keyboard.press('Escape')
            screen(page, 'pause')
            click(page, 'pause', 'settings')
            screen(page, 'settings')
            page.locator('#music').evaluate("el=>{el.value=17;el.dispatchEvent(new Event('input'))}")
            page.locator('#effects').evaluate("el=>{el.value=61;el.dispatchEvent(new Event('input'))}")
            page.locator('#glyph-style').select_option('xbox')
            page.locator('#motion').check()
            saved = page.evaluate("JSON.parse(localStorage.getItem('hullabaloo-settings'))")
            require(saved['music'] == 17 and saved['effects'] == 61 and saved['glyph'] == 'xbox', 'Settings did not persist')
            boot(page)
            require(page.evaluate('__JUNGLE.settings.music') == 17, 'Music setting lost on reload')
            require(page.evaluate('__JUNGLE.settings.motion'), 'Quiet camera setting lost on reload')
        check('settings controls and persistence across reload', settings_persist)

        def gamepad_controls():
            pad(page, 13, "document.activeElement?.dataset.act === 'coop'")
            require('A' in page.locator('#title [data-prompt="confirm"]').inner_text(), 'Xbox glyph did not follow last input')
            pad(page, 0, "__JUNGLE.screen() === 'coop'")
            pad(page, 1, "__JUNGLE.screen() === 'title'")
            pad(page, 0, "__JUNGLE.screen() === 'game'")
            pad(page, 9, "__JUNGLE.screen() === 'pause'")
            pad(page, 9, "__JUNGLE.screen() === 'game'")
            page.keyboard.press('Escape')
            click(page, 'pause', 'settings')
            page.locator('#glyph-style').select_option('ps')
            click(page, 'settings', 'back')
            pad(page, 9, "__JUNGLE.screen() === 'game'")
            page.wait_for_function("document.getElementById('context').textContent.includes('×')")
            require(page.locator('#context .glyph').count() > 0, 'PlayStation glyphs are missing')
        check('standard gamepad menu navigation, start, Options and PS/Xbox glyphs', gamepad_controls)

        def attract_mode():
            page.evaluate('__JUNGLE.toTitle()')
            page.wait_for_function('__JUNGLE.game.attract && __JUNGLE.screen() === "game"', timeout=23000)
            require(page.locator('#attract-bar').is_visible(), 'Attract banner missing')
            page.keyboard.press('KeyA')
            screen(page, 'title')
            require(not page.evaluate('__JUNGLE.game.attract'), 'Any-input attract exit failed')
        check('ten-second attract mode and any-input exit', attract_mode)

        def full_playthrough():
            data = page.evaluate("""() => {
              __JUNGLE.start(1,false);const g=__JUNGLE.game;g.god=true;g.auto=true;const visited=[];
              for(let i=0;i<14400&&g.mode==='playing';i++){g.step(1/60);if(!visited.includes(g.stage))visited.push(g.stage);}
              return {state:g.snapshot(),visited};
            }""")
            require(data['visited'] == [0, 1, 2, 3], f"Chapters visited: {data['visited']}")
            require(data['state']['mode'] == 'won', f"Game did not finish: {data['state']['mode']}")
            require(data['state']['stats']['stages'] == 4, 'Completion count incorrect')
            require(data['state']['rescued'] and all(data['state']['bells']), 'Bird rescue did not complete')
            screen(page, 'outcome')
            require(page.locator('#final-score').inner_text() != '000000', 'Results did not show score')
        check('complete browser four-chapter playthrough and victory results', full_playthrough)

        def credits():
            boot(page)
            click(page, 'title', 'about')
            screen(page, 'about')
            text = page.locator('#about-text').inner_text().lower()
            for word in ['source information', 'testing feedback', 'engine feedback', 'prompt feedback', 'added on import']:
                require(word in text, f'Credits missing {word}')
            page.keyboard.press('Escape')
        check('required source information and feedback in credits', credits)
        context.close()

        mobile_context = browser.new_context(**p.devices['iPhone 13'])
        mobile = mobile_context.new_page()
        mobile.on('pageerror', lambda error: errors.append(str(error)))
        def touch_controls():
            boot(mobile)
            mobile.locator('#title [data-act="solo"]').tap()
            screen(mobile, 'game')
            cdp = mobile_context.new_cdp_session(mobile)
            def touches(kind, points):
                cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': points})
            start = mobile.evaluate('__JUNGLE.state().players[0].x')
            touches('touchStart', [{'x': 65, 'y': 490, 'id': 1}])
            touches('touchMove', [{'x': 125, 'y': 490, 'id': 1}])
            mobile.wait_for_function('(start) => __JUNGLE.state().players[0].x > start + .3', arg=start, timeout=20000)
            touches('touchEnd', [])
            require(mobile.locator('#touch-action').is_visible(), 'Touch contextual action did not appear')
            require(not mobile.locator('#context').is_visible(), 'Desktop control ribbon crowds touch screen')
            require(not mobile.locator('#touch-tip').is_visible(), 'Persistent drag hint crowds touch screen')
            box = mobile.locator('#touch-action').bounding_box()
            jump_start = mobile.evaluate('__JUNGLE.state().stats.jumps')
            touches('touchStart', [{'x': box['x'] + box['width']/2, 'y': box['y'] + box['height']/2, 'id': 2}])
            mobile.wait_for_function('(n) => __JUNGLE.state().stats.jumps > n', arg=jump_start, timeout=20000)
            touches('touchEnd', [])
            mobile.locator('#menu-button').tap()
            screen(mobile, 'pause')
            mobile.locator('#pause [data-act="dev"]').tap()
            mobile.locator('#stage-select').select_option('3')
            mobile.locator('#dev [data-act="warp"]').tap()
            mobile.evaluate('__JUNGLE.game.teleport(__JUNGLE.game.players[0],37,0)')
            mobile.wait_for_function("document.getElementById('touch-action').textContent === 'RING'")
            box = mobile.locator('#touch-action').bounding_box()
            touches('touchStart', [{'x': box['x'] + box['width']/2, 'y': box['y'] + box['height']/2, 'id': 3}])
            mobile.wait_for_function('__JUNGLE.state().bells[0] === true', timeout=20000)
            touches('touchEnd', [])
        check('touch drag, contextual jump/ring, pause and compact HUD', touch_controls)
        mobile_context.close()

        file_context = browser.new_context(viewport={'width': 960, 'height': 540})
        file_page = file_context.new_page()
        file_page.on('pageerror', lambda error: errors.append(str(error)))
        def file_boot():
            boot(file_page, HTML.as_uri())
            require(file_page.evaluate('__JUNGLE.renderer.isWebGPURenderer'), 'file:// lacks WebGPURenderer')
            require(file_page.evaluate('__JUNGLE.renderer.backend.isWebGPUBackend || __JUNGLE.graphicsRecovered'), 'Primary renderer did not select WebGPU or recover its device')
        check('file:// single-file deployment with primary WebGPU backend', file_boot)
        def device_recovery():
            file_page.evaluate("""() => {__JUNGLE.start(1,false);__JUNGLE.goStage(1);__JUNGLE.game.score=1234;__JUNGLE.game.lives=3;__JUNGLE.pause();window.__preservedGame=__JUNGLE.game;window.__preservedBody=__JUNGLE.game.players[0].body;const device=__JUNGLE.renderer.backend.device;if(device)device.destroy();}""")
            file_page.wait_for_function('__JUNGLE.graphicsRecovered === true && __JUNGLE.renderer.backend.isWebGLBackend', timeout=60000)
            preserved = file_page.evaluate('({sameGame:__JUNGLE.game===window.__preservedGame,sameBody:__JUNGLE.game.players[0].body===window.__preservedBody,state:__JUNGLE.state()})')
            require(preserved['sameGame'] and preserved['sameBody'], 'Recovery replaced simulation/player')
            require(preserved['state']['stage']==1 and preserved['state']['score']==1234 and preserved['state']['lives']==3, 'Recovery lost expedition state')
            frame = file_page.evaluate('__JUNGLE.renderer.info.render.calls')
            file_page.wait_for_function('(frame)=>__JUNGLE.renderer.info.render.calls > frame+1', arg=frame, timeout=45000)
            require(not file_page.locator('#loading').is_visible(), 'Recovery left fatal/loading overlay')
        check('forced WebGPU device loss recovers graphics and preserves expedition', device_recovery)
        file_context.close()
        check('no uncaught browser errors', lambda: require(not errors, '; '.join(errors[:4])))
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=5)
print(f'{passed} passed, {failed} failed ({passed + failed} browser tests)', flush=True)
raise SystemExit(1 if failed else 0)
