"""Controller, keyboard, touch and synthesized audio regression checks.
Run with ~/.local/share/pipx/venvs/playwright/bin/python browser-input-tests.py.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json

GAME = (Path(__file__).resolve().parent.parent / 'Super-Breakbeat-Super-Breakout-gpt-6.1-sol-ultra-20261106-011159.html').as_uri()
FAILURES = []
COUNT = 0
PAD = '''(() => {window.__pad={id:'DualSense test pad',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.__pad,null,null,null],configurable:true});})()'''

def check(name, assertion):
    global COUNT
    COUNT += 1
    try:
        result = assertion()
        if result is False:
            raise AssertionError('condition false')
    except Exception as error:
        FAILURES.append(f'{name}: {error}')
        print(f'FAIL: {name}: {error}')

def press(page, button):
    page.evaluate('(i)=>{__pad.buttons[i]={pressed:true,touched:true,value:1}}',button)
    page.wait_for_timeout(120)
    page.evaluate('(i)=>{__pad.buttons[i]={pressed:false,touched:false,value:0}}',button)
    page.wait_for_timeout(100)

def focus(page, selector):
    page.locator(selector).focus()
    page.wait_for_timeout(50)

def boot(page, webgl=False):
    page.goto(GAME + ('?renderer=webgl' if webgl else ''), wait_until='load')
    page.wait_for_function('Boolean(window.__game)',timeout=120000)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--autoplay-policy=no-user-gesture-required'])
    context = browser.new_context(viewport={'width':1920,'height':1080})
    context.add_init_script(PAD)
    page = context.new_page()
    errors=[]
    page.on('pageerror',lambda error: errors.append(str(error)))
    try:
        boot(page)
        check('single HTML loads from file',lambda:page.evaluate('__game.screen === "title"'))
        check('WebGPU renderer active',lambda:'WebGPU' in page.evaluate('__game.scene.backend'))
        check('default music 10 percent',lambda:page.evaluate('__game.audio.musicVolume === .1'))
        press(page,0)
        check('controller starts run',lambda:page.evaluate('__game.screen === "game" && __game.core.state === "serve"'))
        check('PS prompts from last used controller',lambda:'✕' in page.locator('#servePrompt').inner_text())
        before=page.evaluate('__game.core.paddles[0]')
        page.evaluate('__pad.axes[0]=.8')
        page.wait_for_timeout(380)
        page.evaluate('__pad.axes[0]=0')
        check('left stick moves paddle',lambda:page.evaluate('__game.core.paddles[0]')>before+.5)
        press(page,0)
        check('cross serves',lambda:page.evaluate('__game.core.state === "playing" && __game.core.balls.some(b=>!b.captive)'))
        page.evaluate('__game.core.charge=1')
        pulses=page.evaluate('__game.core.stats.pulses')
        press(page,2)
        check('square triggers beat',lambda:page.evaluate('__game.core.stats.pulses')==pulses+1)
        press(page,9)
        check('Options pauses',lambda:page.evaluate('__game.paused') and page.locator('#modal').is_visible())
        before=page.evaluate('__game.core.time')
        page.wait_for_timeout(150)
        check('pause freezes simulation',lambda:page.evaluate('__game.core.time')==before)
        focus(page,'#panel [data-action=settings]');press(page,0)
        check('settings reached with pad',lambda:page.locator('#music').is_visible())
        focus(page,'#music')
        before=page.locator('#music').input_value()
        press(page,15)
        check('pad adjusts music slider live',lambda:float(page.locator('#music').input_value())>float(before) and page.evaluate('__game.audio.musicVolume')>.1)
        focus(page,'#glyph');press(page,15)
        check('pad changes glyph style',lambda:page.locator('#glyph').input_value()=='xbox')
        focus(page,'#motion')
        before=page.locator('#motion').is_checked()
        press(page,0)
        check('Cross toggles settings checkbox without closing',lambda:page.locator('#motion').is_visible() and page.locator('#motion').is_checked()!=before)
        # Restore settings using keyboard/mouse so checks stay independent.
        if not page.locator('#music').is_visible():
            page.evaluate('__game.action("settings")')
        page.locator('#music').fill('10')
        page.locator('#glyph').select_option('ps')
        if not page.locator('#motion').is_checked():page.locator('#motion').check()
        press(page,1)
        check('Circle returns to game',lambda:not page.locator('#modal').is_visible() and not page.evaluate('__game.paused'))
        page.keyboard.press('Escape')
        check('Escape opens pause',lambda:page.locator('#modal').is_visible() and page.evaluate('__game.paused'))
        page.locator('#panel [data-action=dev]').click()
        check('dev tools reached through pause',lambda:page.locator('#dev-ballSpeed').is_visible())
        page.locator('#dev-ballSpeed').fill('11')
        check('live tuning updates physics',lambda:page.evaluate('__game.core.tuning.ballSpeed === 11'))
        page.locator('#panel [data-action=devreset]').click()
        check('dev reset restores defaults',lambda:page.evaluate('__game.core.tuning.ballSpeed !== 11'))
        page.evaluate('__game.action("about")')
        page.wait_for_timeout(100)
        page.evaluate('__pad.axes[3]=.9')
        page.wait_for_timeout(350)
        page.evaluate('__pad.axes[3]=0')
        check('right stick scrolls long credits panel',lambda:page.locator('#panel').evaluate('(e)=>e.scrollTop>5'))
        page.evaluate('__game.action("resume")')
        audio=page.evaluate('async()=>await __game.renderAudioTest()')
        check('offline audio finite nonzero unclipped',lambda:audio['finite'] and audio['rms']>.001 and 0<audio['peak']<1)
        check('all procedural audio families exercised',lambda:audio['effects']==9 and audio['voices']>=2 and audio['musicSteps']==24 and audio['audioFiles']==0)
        check('no browser runtime exceptions desktop: '+repr(errors),lambda:not errors)
        page.evaluate('__game.returnTitle()')
        page.wait_for_function('__game.attract === true',timeout=14000)
        check('attract begins after title idle',lambda:page.evaluate('__game.attract && __game.core.autoplay && __game.core.infinite'))
        stage=page.evaluate('__game.core.stage')
        page.wait_for_function('__game.core.stage !== '+str(stage),timeout=19000)
        check('attract cycles demo features',lambda:page.evaluate('__game.attract') and page.evaluate('__game.core.stage')!=stage)
        page.keyboard.press('a')
        check('any input exits attract',lambda:page.evaluate('!__game.attract && __game.screen === "title"'))
        boot(page,webgl=True)
        check('WebGL2 fallback active',lambda:'WebGL' in page.evaluate('__game.scene.backend'))
        page.screenshot(path='title-desktop.png')
        page.locator('#title [data-action=start]').click()
        page.wait_for_timeout(300)
        page.screenshot(path='game-desktop.png')
    except Exception as error:
        check('desktop test execution',lambda:(_ for _ in ()).throw(error))
    finally:
        context.close()
    phone=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
    page=phone.new_page()
    errors=[]
    page.on('pageerror',lambda error: errors.append(str(error)))
    try:
        boot(page,webgl=True)
        check('portrait title start visible',lambda:page.locator('#title [data-action=start]').is_visible())
        page.screenshot(path='title-portrait.png')
        page.locator('#title [data-action=start]').tap()
        check('touch starts run',lambda:page.evaluate('__game.screen === "game" && __game.core.state === "serve"'))
        box=page.locator('#field').bounding_box()
        page.touchscreen.tap(box['x']+box['width']*.7,box['y']+box['height']*.8)
        page.wait_for_timeout(150)
        check('touch tap serves',lambda:page.evaluate('__game.core.state === "playing"'))
        check('touch controls activated',lambda:page.locator('body').evaluate('(e)=>e.classList.contains("touch")') and page.locator('#mobilePulse').is_visible())
        before=page.evaluate('__game.core.paddles[0]')
        session=phone.new_cdp_session(page)
        session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':180,'y':650,'id':1}]})
        session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':310,'y':650,'id':1}]})
        page.wait_for_timeout(200)
        session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        check('touch drag steers paddle',lambda:abs(page.evaluate('__game.core.paddles[0]')-before)>.2)
        page.evaluate('__game.core.charge=1')
        before=page.evaluate('__game.core.stats.pulses')
        page.locator('#mobilePulse').tap()
        page.wait_for_function('(before)=>__game.core.stats.pulses > before',arg=before,timeout=2000)
        check('touch beat button works',lambda:page.evaluate('__game.core.stats.pulses')==before+1)
        page.locator('#pauseButton').tap()
        check('touch pause opens menu',lambda:page.locator('#modal').is_visible() and page.evaluate('__game.paused'))
        page.locator('#panel [data-action=resume]').tap()
        page.screenshot(path='game-portrait.png')
        check('portrait document fits viewport',lambda:page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        check('no browser runtime exceptions touch',lambda:not errors)
    except Exception as error:
        check('portrait test execution',lambda:(_ for _ in ()).throw(error))
    finally:
        phone.close()
        browser.close()

Path('browser-input-results.json').write_text(json.dumps({'checks':COUNT,'failures':FAILURES},indent=2))
print(f'{COUNT-len(FAILURES)}/{COUNT} browser input checks passed; {len(FAILURES)} failures')
raise SystemExit(bool(FAILURES))
