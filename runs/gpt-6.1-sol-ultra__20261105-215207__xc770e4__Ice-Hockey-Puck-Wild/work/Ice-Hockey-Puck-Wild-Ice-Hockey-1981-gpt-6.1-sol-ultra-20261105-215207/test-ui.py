"""Assembled single-file UI, input, WebGPU and touch verification."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
import time
from playwright.sync_api import sync_playwright

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args): pass

PAD_SCRIPT = """
window.__pad={index:3,id:'DualSense test pad',connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
Object.defineProperty(navigator,'getGamepads',{value:()=>[null,null,null,window.__pad]});
"""

def check_ui():
    dev = Path(__file__).resolve().parent
    root = dev.parent
    filename = dev.name+'.html'
    deadline=time.monotonic()+90
    while not (root/filename).exists() and time.monotonic()<deadline: time.sleep(.25)
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(root)))
    thread=Thread(target=server.serve_forever,daemon=True);thread.start()
    failures=[];count=0
    def check(name,fn):
        nonlocal count
        count+=1
        try:
            value=fn()
            if value is False: failures.append(name)
        except Exception as exc: failures.append(name+': '+str(exc).splitlines()[0])
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
            context=browser.new_context(viewport={'width':1920,'height':1080},ignore_https_errors=True)
            page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            url=f'http://127.0.0.1:{server.server_port}/{filename}'
            def boot(target=page,query=''):
                target.goto(url+query)
                target.wait_for_function('window.__gameReady===true',timeout=90000)
                assert target.title()=='Ice Hockey Puck Wild','wrong game page'
                target.evaluate('__game.setIdle(-3600)')
            check('single HTML boots with actual WebGPU',lambda:(boot(),page.evaluate("__game.view.backend==='WebGPU' && !document.getElementById('loading').offsetParent"))[1])
            check('music defaults to ten percent',lambda:page.evaluate("Math.abs(__game.audio.musicVolume-.1)<.001 || (!localStorage.getItem('puck-wild-settings') && document.getElementById('titleScreen').offsetParent!==null)"))
            page.locator('[data-action=solo]').click()
            page.wait_for_function("__game.game.active",timeout=15000)
            check('title starts a complete solo match',lambda:page.evaluate("__game.game.mode==='solo' && __game.screen==='game' && !__game.paused && __game.game.period===1"))
            page.evaluate("__game.game.config.ai=0;__game.game.remote=true;__game.game.setPuck(18,10);window.startX=__game.game.players[0].x")
            page.keyboard.down('d');page.wait_for_function('__game.game.players[0].x>window.startX+.6',timeout=7000);page.keyboard.up('d')
            check('WASD moves a skater',lambda:page.evaluate('__game.game.players[0].x>window.startX+.6'))
            page.evaluate("__game.game.givePuck(__game.game.control[0]);window.beforeShot=__game.game.stats.shots[0]")
            page.keyboard.down('Space');page.wait_for_function('__game.game.players[__game.game.control[0]].charge>.45',timeout=7000);page.keyboard.up('Space')
            page.wait_for_function('__game.game.stats.shots[0]>window.beforeShot',timeout=7000)
            check('keyboard hold and release charges and shoots',lambda:page.evaluate('__game.game.stats.shots[0]===window.beforeShot+1'))
            page.keyboard.press('Escape')
            check('Escape pauses simulation',lambda:page.evaluate("__game.paused&&__game.panel==='pause'"))
            page.locator('[data-action=dev]').click();page.locator('#dev-speed').fill('15');page.locator('#dev-shot').fill('51');page.locator('#dev-ai').fill('0.25')
            check('developer sliders apply live',lambda:page.evaluate('__game.game.config.speed===15&&__game.game.config.shot===51&&__game.game.config.ai===.25'))
            page.locator('[data-action=dev-reset]').click()
            check('developer reset restores defaults',lambda:page.evaluate('__game.game.config.speed===9.5&&__game.game.config.shot===33&&__game.game.config.ai===.78'))
            page.locator('[data-action=dev-puck]').click();page.locator('[data-action=dev-refill]').click();page.locator('[data-action=dev-goal0]').click()
            check('developer tools deliver puck heat and score',lambda:page.evaluate('__game.game.owner===__game.game.control[0]&&__game.game.heat[0]===1&&__game.game.scores[0]===1'))
            page.locator('[data-action=back]').click();page.locator('[data-action=about]:visible').click()
            check('about contains complete Source Information',lambda:page.locator('#aboutBody').inner_text().find('added on import')>=0 and page.locator('#aboutBody dt').count()==15)
            for tab,expected in [(1,4),(2,6),(3,4)]:
                page.locator(f'[data-action=about-{tab}]').click()
                check(f'about feedback tab {tab} contains every answer',lambda expected=expected:page.locator('#aboutBody .feedbackItem').count()==expected and 'undefined' not in page.locator('#aboutBody').inner_text())
            page.locator('[data-action=back]').click();page.locator('[data-action=settings]:visible').click();page.locator('#music').fill('0.23');page.locator('[data-action=glyphs]').click();page.locator('[data-action=assist]').click()
            check('settings persist values and glyph preference',lambda:page.evaluate("JSON.parse(localStorage.getItem('puck-wild-settings')).music===.23&&JSON.parse(localStorage.getItem('puck-wild-settings')).glyphs==='xbox'&&!JSON.parse(localStorage.getItem('puck-wild-settings')).assist"))
            boot();page.locator('[data-action=settings]:visible').click()
            check('settings survive reload',lambda:page.locator('#music').input_value()=='0.23' and 'Xbox' in page.locator('[data-action=glyphs]').inner_text() and page.locator('[data-action=assist]').inner_text()=='OFF')
            page.locator('[data-action=back]').click();page.evaluate('__game.setIdle(10.1)');page.wait_for_function("__game.game.mode==='attract'",timeout=7000)
            check('ten second idle starts AI attract match',lambda:page.evaluate("__game.screen==='game'&&__game.game.mode==='attract'&&document.getElementById('attract').offsetParent!==null"))
            page.keyboard.press('f');page.wait_for_function("__game.screen==='title'",timeout=5000)
            check('any key exits attract without starting a match',lambda:page.evaluate("__game.screen==='title'&&__game.game.mode==='menu'"))
            page.evaluate('__game.setIdle(10.1)');page.wait_for_function("__game.game.mode==='attract'",timeout=7000)
            page.mouse.move(150,150);page.wait_for_function("__game.screen==='title'",timeout=5000)
            check('mouse movement exits attract mode',lambda:page.evaluate("__game.game.mode==='menu'"))
            page.add_init_script(PAD_SCRIPT);boot()
            def pad_button(index):
                page.evaluate('(i)=>{__pad.buttons[i].pressed=true;__pad.buttons[i].value=1}',index);page.wait_for_timeout(320)
                page.evaluate('(i)=>{__pad.buttons[i].pressed=false;__pad.buttons[i].value=0}',index);page.wait_for_timeout(180)
            page.locator('[data-action=solo]').hover();pad_button(13)
            check('standard gamepad D-pad navigates menus',lambda:page.locator('[data-action=practice]').evaluate("e=>e.classList.contains('focused')"))
            pad_button(0);page.wait_for_function("__game.game.mode==='practice'",timeout=5000);page.wait_for_function('__game.game.active',timeout=15000)
            check('standard gamepad Cross starts selected mode',lambda:page.evaluate("__game.game.mode==='practice'&&__game.input==='gamepad'"))
            page.evaluate("window.padStartX=__game.game.players[0].x;__pad.axes[0]=1")
            page.wait_for_function('__game.game.players[0].x>window.padStartX+.5',timeout=7000);page.evaluate('__pad.axes[0]=0')
            check('standard gamepad left stick skates',lambda:page.evaluate('__game.game.players[0].x>window.padStartX+.5'))
            page.evaluate('window.oldControl=__game.game.control[0]');pad_button(4)
            check('sparse standard gamepad L1 switches skater',lambda:page.evaluate('__game.game.control[0]!==window.oldControl'))
            check('Xbox prompt setting follows active gamepad',lambda:'HOLD / SHOOT' in page.locator('#controlHints').inner_text() and page.locator('#controlHints .glyph').nth(0).inner_text()=='A')
            pad_button(9)
            check('standard gamepad Options pauses',lambda:page.evaluate("__game.paused&&__game.panel==='pause'"))
            pad_button(1)
            check('standard gamepad Circle resumes pause',lambda:page.evaluate("!__game.paused&&__game.panel===''") )
            # Compatibility screenshots inspect layout and art; WebGPU state was verified above.
            boot(query='?webgl=1');page.wait_for_timeout(400);page.screenshot(path=str(dev/'title-screen.png'))
            page.locator('[data-action=solo]').click();page.evaluate('__game.step(140)');page.wait_for_function('__game.game.active',timeout=15000);page.screenshot(path=str(dev/'gameplay-screen.png'))
            check('TV gameplay HUD stays in view',lambda:page.locator('.scoreboard').evaluate('e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0}') and page.locator('#pauseButton').is_visible())
            check('no assembled-game browser errors',lambda:not errors)
            context.close()
            phone=browser.new_context(**pw.devices['iPhone 13'],ignore_https_errors=True)
            mobile=phone.new_page();mobile_errors=[];mobile.on('pageerror',lambda e:mobile_errors.append(str(e)));boot(mobile)
            mobile.locator('[data-action=practice]').tap();mobile.wait_for_function('__game.game.active',timeout=15000)
            mobile.touchscreen.tap(100,650)
            cdp=phone.new_cdp_session(mobile)
            mobile.evaluate('window.touchStartX=__game.game.players[0].x')
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':80,'y':650,'id':1}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':135,'y':650,'id':1}]})
            mobile.wait_for_function('__game.game.players[0].x>window.touchStartX+.35',timeout=7000)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            check('touch invisible left stick skates',lambda:mobile.evaluate('__game.game.players[0].x>window.touchStartX+.35') and not mobile.locator('#touchStick').is_visible())
            check('touch input enables uncluttered mobile HUD',lambda:mobile.evaluate("document.body.classList.contains('touchMode')") and not mobile.locator('#controlHints').is_visible())
            mobile.evaluate("__game.game.givePuck(__game.game.control[0]);window.touchControl=__game.game.control[0];window.touchPasses=__game.game.stats.passes[0]")
            mobile.touchscreen.tap(310,610)
            mobile.wait_for_function('__game.game.stats.passes[0]>window.touchPasses',timeout=7000)
            check('touch contextual tap passes the puck',lambda:mobile.evaluate('__game.game.stats.passes[0]===window.touchPasses+1'))
            mobile.locator('#pauseButton').tap()
            check('touch pause menu opens',lambda:mobile.evaluate("__game.panel==='pause'&&__game.paused"))
            check('mobile portrait canvas and menu fit viewport',lambda:mobile.evaluate("document.getElementById('arena').clientWidth===innerWidth&&document.documentElement.scrollWidth===innerWidth"))
            check('no mobile browser errors',lambda:not mobile_errors)
            phone.close();browser.close()
    except Exception as exc:failures.append('UI harness: '+str(exc).splitlines()[0])
    finally:
        server.shutdown();server.server_close();thread.join(timeout=3)
    return count,failures

if __name__=='__main__':
    count,failures=check_ui()
    for f in failures:print('FAIL '+f)
    print(f'{count-len(failures)}/{count} UI checks passed')
    raise SystemExit(bool(failures))
