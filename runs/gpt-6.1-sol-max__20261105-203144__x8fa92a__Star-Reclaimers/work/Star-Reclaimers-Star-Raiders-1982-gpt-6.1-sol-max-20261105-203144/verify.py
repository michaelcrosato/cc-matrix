"""Run all verification with npm test. Quiet on success except the final count."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from urllib.parse import quote
import json
import sys
import traceback
from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parent
ROOT = DEV.parent
GAME = ROOT / (DEV.name + '.html')
CHECKS = []
DETAILS = {}
GPU_ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=swiftshader', '--disable-vulkan-surface', '--use-webgpu-adapter=swiftshader']
API = 'window.__STAR_RECLAIMERS__'
PAD = """window.__pad={enabled:false,axes:[0,0,0,0],buttons:Array(17).fill(false)};
Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pad.enabled?[{id:'DualSense standard test pad',index:0,connected:true,mapping:'standard',axes:window.__pad.axes,buttons:window.__pad.buttons.map(v=>({pressed:v,touched:v,value:v?1:0})),timestamp:performance.now()}]:[]});"""

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def check(name, condition, detail=''):
    condition = bool(condition)
    CHECKS.append({'name': name, 'pass': condition, 'detail': detail if not condition else ''})
    if not condition:
        print(f'FAIL: {name}: {detail}', flush=True)


def state(page):
    return page.evaluate(API + '.snapshot()')


def call(page, js):
    return page.evaluate(f'() => {{const a={API};{js}}}')


def frames(page):
    page.evaluate('() => new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')


def press_pad(page, button):
    page.evaluate('(b)=>{window.__pad.enabled=true;window.__pad.buttons[b]=true}', button)
    frames(page)
    page.evaluate('(b)=>{window.__pad.buttons[b]=false}', button)
    frames(page)


def load(page, url):
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url, wait_until='load')
    page.wait_for_function(API + '?.snapshot().ready', timeout=60000)
    return errors


def run_group(name, fn):
    try:
        fn()
    except Exception:
        check(name, False, traceback.format_exc(limit=4))


def main():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}/'
    url = base + quote(GAME.name) + '?test=1'
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=GPU_ARGS)
            context = browser.new_context(viewport={'width':1280,'height':720}, device_scale_factor=1)
            context.add_init_script(PAD)
            page = context.new_page()
            errors = load(page, GAME.as_uri()+'?test=1')

            def basic():
                s=state(page)
                check('single file launches with pinned engines', s['ready'] and s['three']=='180' and s['rapier']=='0.19.3' and page.title()=='Star Reclaimers — a deep-space patrol', s)
                check('WebGPU draws the scene without device loss', s['backend']=='WebGPU' and not s['gpuLost'] and s['drawCalls']>100, s)
                render=page.evaluate(API+'.renderProof()');DETAILS['WebGPU-render']=render
                check('WebGPU framebuffer contains a varied dark-space scene',render['colours']>30 and render['dark']>render['pixels']*.4,render)
                check('music defaults to ten percent', s['music']==.1, s['music'])
                # Use ordinary input for the first launch and first shots.
                page.keyboard.press('Enter')
                check('keyboard launches the patrol', state(page)['state']=='playing')
                page.keyboard.down('KeyW')
                before=state(page)['player']['throttle']
                call(page,'a.advance(60)')
                page.keyboard.up('KeyW')
                check('keyboard throttle changes the Rapier ship velocity', state(page)['player']['throttle']>before and state(page)['player']['pos'][2]<100)
                initial=state(page)['enemies'][0]
                page.keyboard.down('Space')
                for _ in range(8):
                    call(page,f'a.aim({initial["id"]});a.advance(15)')
                page.keyboard.up('Space')
                s=state(page)
                check('cannons hit through Rapier swept queries', s['stats']['shots']>0 and s['stats']['rapierHits']>0 and s['stats']['hits']>0, s['stats'])
                page.keyboard.press('KeyC')
                check('shield allocation toggles', not state(page)['player']['shields'])
                page.keyboard.press('KeyV')
                check('chase camera toggles', state(page)['chase'])
                page.keyboard.press('Escape')
                before=state(page)['elapsed']
                call(page,'a.advance(120)')
                check('pause holds the simulation', state(page)['page']=='pause' and state(page)['elapsed']==before)
                page.locator('[data-cmd=dev]').click()
                check('developer mode is reachable from pause', state(page)['page']=='dev')
                page.locator('[data-tuning=damage]').fill('71')
                check('live tuning slider changes gameplay values', state(page)['tuning']['damage']==71)
                page.locator('[data-cmd=resetTuning]').click()
                check('live tuning reset restores defaults', state(page)['tuning']['damage']==28)
                call(page,"a.action('resume')")
                page.keyboard.press('KeyM')
                check('tactical chart opens with six sectors', state(page)['page']=='chart' and page.locator('[data-sector]').count()==6)
                page.locator('[data-sector="4"]').click()
                page.locator('[data-cmd=jump]').click()
                check('command sector is gated by the patrol', state(page)['sector']==0 and state(page)['page']=='chart')
                page.locator('[data-sector="1"]').click()
                page.locator('[data-cmd=jump]').click()
                call(page,'a.advance(180)')
                check('hyperspace loads the selected sector', state(page)['sector']==1 and state(page)['stats']['jumps']==1)
            run_group('basic flight and menus', basic)

            def systems():
                call(page,'a.start();a.invincible(false)')
                old=state(page)['enemies'][0]['pos']
                call(page,'a.clear()')
                page.evaluate('(p)=>window.__STAR_RECLAIMERS__.position(...p)',old)
                call(page,'a.advance(2)')
                check('energy salvage is collected on contact', state(page)['stats']['salvage']>0)
                call(page,"a.resources({hp:31,shield:8,energy:16,nova:0});a.position(80,-15,-140);a.action('interact');a.advance(180)")
                s=state(page)
                check('docking repairs, refuels and rearms', s['stats']['docks']==1 and s['player']['hp']==100 and s['player']['shield']==100 and s['player']['energy']>99 and s['player']['nova']==3,s)
                call(page,'a.start();a.resources({energy:0});a.advance(1000)')
                check('reserve reactor prevents zero-energy stranding', state(page)['player']['energy']>=12,state(page)['player']['energy'])
                call(page,"a.action('dev');a.action('unlock');a.action('resume');a.action('select',4);a.action('jump');a.advance(180)")
                # Reserve alone permits the jump; refill to test the boss mechanics.
                call(page,'a.refill()')
                s=state(page)
                check('developer reveal unlocks the command sector',s['sector']==4,s)
                core=next(e for e in s['enemies'] if e['kind']=='boss')
                page.keyboard.down('Space')
                call(page,f'a.aim({core["id"]});a.advance(100)')
                page.keyboard.up('Space')
                core2=next(e for e in state(page)['enemies'] if e['kind']=='boss')
                check('Crown core is protected by its shield relays',core2['hp']==core['hp'],core2)
                call(page,"a.position(0,0,-400);a.action('nova');a.advance(2)")
                s=state(page)
                check('nova destroys exposed relays and spends a charge',s['stats']['relays']==2 and s['player']['nova']==2 and s['stats']['nova']==1,s)
                call(page,"a.action('nova')")
                check('nova respects its cooldown',state(page)['stats']['nova']==1)
                page.keyboard.down('Space')
                call(page,f'a.aim({core["id"]});a.advance(90)')
                page.keyboard.up('Space')
                core3=next((e for e in state(page)['enemies'] if e['kind']=='boss'),None)
                check('unshielded command core takes cannon damage',core3 is None or core3['hp']<core2['hp'],core3)
                call(page,"a.start();a.action('shield');a.resources({hp:4});a.damage(12);a.advance(1)")
                check('ship destruction produces a debrief',state(page)['state']=='debrief')
            run_group('campaign systems',systems)

            def playthrough():
                call(page,'a.start();a.invincible(true);a.ai(true)')
                sectors=set()
                for _ in range(12):
                    s=call(page,'return a.advance(1200)')
                    sectors.add(s['sector'])
                    if s['state']=='debrief':break
                DETAILS['playthrough']=s
                check('scripted operation reaches the victory debrief',s['state']=='debrief' and 'the lanes are ours.' in page.locator('#modal').inner_text().lower(),s)
                check('playthrough clears all patrols, both relays and command ship',all(s['campaign'][i]['cleared'] for i in [0,1,2,4]) and s['stats']['relays']==2 and s['stats']['kills']==15,s['stats'])
                check('playthrough returns home and docks',s['sector']==0 and s['stats']['docks']>=1 and s['stats']['jumps']>=4,s['stats'])
                check('playthrough uses actual physics weapon hits',s['stats']['rapierHits']>=50 and s['stats']['shots']>=70,s['stats'])
            run_group('whole-operation playthrough',playthrough)

            def controller():
                call(page,"a.ai(false);a.action('title')")
                press_pad(page,0)
                check('standard-mapping gamepad launches from title',state(page)['state']=='playing')
                check('controller prompts use PlayStation glyphs', 'R2' in page.locator('#action-prompts').inner_text())
                page.evaluate('window.__pad.axes=[.5,-.8,.4,.2];window.__pad.buttons[7]=true')
                frames(page)
                call(page,'a.advance(60)')
                page.evaluate('window.__pad.axes=[0,0,0,0];window.__pad.buttons[7]=false')
                frames(page)
                check('gamepad axes fly and trigger fires',state(page)['stats']['shots']>0 and state(page)['player']['throttle']>.24)
                press_pad(page,9)
                check('Options opens pause',state(page)['page']=='pause')
                press_pad(page,13)
                check('D-pad moves menu focus',page.evaluate('document.activeElement.dataset.cmd')=='help')
                press_pad(page,1)
                check('Circle closes pause',state(page)['page'] is None)
                call(page,"a.action('settings');a.action('glyphs')")
                check('Xbox glyph setting updates prompts','RT' in page.locator('#action-prompts').inner_text())
                call(page,"a.action('resume')")
                # Create + Options belongs to AI Hub, even outside one the game ignores the chord.
                page.evaluate('window.__pad.buttons[8]=true')
                press_pad(page,9)
                check('Create plus Options does not open a game menu',state(page)['page'] is None)
                page.evaluate('window.__pad.enabled=false;window.__pad.buttons.fill(false)')
                frames(page)
            run_group('controller stand-in',controller)

            def sound_and_attract():
                check('gameplay announcements trigger synthesized gibberish voices',state(page)['audio']['voice']>0,state(page)['audio'])
                proof=page.evaluate(API+'.audioProof()')
                DETAILS['audio']=proof
                check('code audio produces non-clipping sound',proof['available'] and .0001<proof['rms']<.3 and 0<proof['peak']<1 and proof['nonzero']>1000,proof)
                call(page,"a.action('title');a.idle()")
                page.wait_for_function(API+'.snapshot().attract',timeout=10000)
                check('ten-second title idle starts an AI exhibition',state(page)['attract'])
                seen=set();docks=relays=novas=0;previous=0;looped=False
                for _ in range(30):
                    s=call(page,'return a.advance(300)')
                    seen.update(i for i,v in enumerate(s['campaign']) if v['visited'])
                    docks=max(docks,s['stats']['docks']);relays=max(relays,s['stats']['relays']);novas=max(novas,s['stats']['nova'])
                    if s['elapsed']<previous:looped=True
                    previous=s['elapsed']
                DETAILS['attract']={'sectors':sorted(seen),'docks':docks,'relays':relays,'novas':novas,'looped':looped}
                check('attract mode tours all six sectors and core mechanics',len(seen)==6 and docks>0 and relays==2 and novas>0,DETAILS['attract'])
                check('attract exhibition loops',looped,DETAILS['attract'])
                page.keyboard.press('KeyG')
                check('any input exits the exhibition',state(page)['state']=='title' and not state(page)['attract'])
                call(page,"a.action('about')")
                text=page.locator('#modal').inner_text()
                check('About exposes all required source fields and usage','Source Information' in text and 'added on import' in text and 'gpt-6.1-sol' in text)
                for tab,label in [('testing','Testing Feedback'),('engine','Engine Feedback'),('prompt','Prompt Feedback')]:
                    call(page,f"a.action('aboutTab','{tab}')")
                    check(label+' is accessible',len(page.locator('.feedback p').all())==len({'testing':range(4),'engine':range(6),'prompt':range(4)}[tab]))
                call(page,"a.action('back')")
            run_group('audio, exhibition and credits',sound_and_attract)

            def link():
                # Two pages in one browser, real WebRTC offer/answer and data channel.
                page.goto(url)
                page.wait_for_function(API+'?.snapshot().ready',timeout=60000)
                wing=context.new_page()
                wing_errors=load(wing,url)
                offer=page.evaluate(API+'.offer()')
                answer=wing.evaluate('(code)=>window.__STAR_RECLAIMERS__.answer(code)',offer)
                page.evaluate('(code)=>window.__STAR_RECLAIMERS__.link(code)',answer)
                page.wait_for_function(API+'.snapshot().link',timeout=20000)
                wing.wait_for_function(API+'.snapshot().link',timeout=20000)
                check('standalone WebRTC offer and answer establish a real link',state(page)['link'] and state(wing)['link'])
                call(page,'a.launchLinked()')
                wing.wait_for_function(API+'.snapshot().state==="playing"',timeout=10000)
                wing.wait_for_function(API+'.snapshot().ghosts.length>0',timeout=10000)
                page.wait_for_function(API+'.snapshot().ghosts.length>0',timeout=10000)
                check('peer launch starts both patrols and exchanges ghosts',state(page)['ghosts'] and state(wing)['ghosts'])
                call(page,'a.connectLocal()')
                call(wing,'a.connectLocal()')
                page.wait_for_function(API+'.snapshot().link',timeout=10000)
                wing.wait_for_function(API+'.snapshot().link',timeout=10000)
                check('same-browser tab link connects two pilots',state(page)['link'] and state(wing)['link'])
                call(page,'a.launchLinked()')
                wing.wait_for_function(API+'.snapshot().ghosts.length>0',timeout=10000)
                check('linked pilots have independent scores',state(page)['score']==0 and state(wing)['score']==0)
                check('multiplayer pages produce no runtime errors',not wing_errors and not errors,wing_errors+errors)
                wing.close()
            run_group('standalone multiplayer',link)
            context.close()

            def touch():
                touch_config={**p.devices['Pixel 7'],'viewport':{'width':844,'height':390},'device_scale_factor':1};tc=browser.new_context(**touch_config)
                tp=tc.new_page()
                touch_errors=load(tp,url)
                check('touch title controls fit the landscape screen',tp.locator('[data-cmd=launch]').is_visible() and tp.locator('[data-cmd=launch]').bounding_box()['y']>=0 and tp.locator('[data-cmd=network]').bounding_box()['y']+tp.locator('[data-cmd=network]').bounding_box()['height']<390)
                tp.locator('[data-cmd=launch]').tap()
                check('touch launches the same patrol with clear assisted UI',state(tp)['state']=='playing' and tp.locator('#touch-chart').is_visible() and not tp.locator('#action-prompts').is_visible())
                call(tp,'a.aim(1);a.advance(90)')
                check('touch flight assists cannon fire',state(tp)['stats']['shots']>0,state(tp)['stats'])
                tp.locator('#touch-chart').tap()
                check('touch opens the tactical chart',state(tp)['page']=='chart')
                call(tp,"a.action('resume')")
                # Actual browser touch contacts exercise simultaneous pointer capture.
                cdp=tc.new_cdp_session(tp)
                cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':1,'x':120,'y':250},{'id':2,'x':700,'y':250}]})
                cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'id':1,'x':155,'y':190},{'id':2,'x':740,'y':235}]})
                call(tp,'a.advance(60)')
                check('multitouch sticks alter thrust',state(tp)['player']['throttle']>.24,state(tp)['player'])
                cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
                tp.set_viewport_size({'width':390,'height':844})
                call(tp,"a.action('title')")
                check('touch title controls fit portrait screen',tp.locator('[data-cmd=network]').bounding_box()['y']+tp.locator('[data-cmd=network]').bounding_box()['height']<844)
                check('portrait title stays within the viewport',tp.locator('.title-body h1 span').evaluate('(el)=>{const r=document.createRange();r.selectNodeContents(el);return r.getBoundingClientRect().right<=innerWidth-8}'))
                frames(tp)
                check('touch profile has no runtime errors',not touch_errors,touch_errors)
                tp.screenshot(path=str(DEV/'touch-title.png'))
                tc.close()
            run_group('touch stand-in',touch)

            def graphics_recovery():
                c=browser.new_context(viewport={'width':1920,'height':1080})
                pg=c.new_page();errs=load(pg,url)
                call(pg,'a.loseGraphics()')
                pg.wait_for_function(API+'.snapshot().recovered',timeout=30000)
                frames(pg)
                pg.screenshot(path=str(DEV/'tv-title.png'))
                call(pg,'a.start();a.advance(120)')
                frames(pg)
                s=state(pg)
                check('lost WebGPU device recovers into native WebGL2 rendering',s['backend']=='WebGL2' and s['ready'] and not s['error'] and s['drawCalls']>0,s)
                pg.screenshot(path=str(DEV/'tv-cockpit.png'))
                render=pg.evaluate(API+'.renderProof()');DETAILS['WebGL2-render']=render
                check('WebGL2 framebuffer contains a varied dark-space scene',render['colours']>30 and render['dark']>render['pixels']*.4,render)
                call(pg,"a.action('chart')")
                pg.screenshot(path=str(DEV/'tv-chart.png'))
                check('graphics recovery has no uncaught exceptions',not errs,errs)
                c.close()
            run_group('graphics recovery',graphics_recovery)

            def webkit_touch():
                wb=p.webkit.launch(headless=True)
                wc=wb.new_context(**{**p.devices['iPhone 13'],'viewport':{'width':844,'height':390},'device_scale_factor':1})
                wp=wc.new_page();we=load(wp,url)
                wp.locator('[data-cmd=launch]').tap()
                call(wp,'a.advance(120)')
                check('WebKit iPhone stand-in flies with the native WebGL2 fallback',state(wp)['state']=='playing' and state(wp)['backend']=='WebGL2' and state(wp)['drawCalls']>0,state(wp))
                check('WebKit iPhone stand-in has no runtime errors',not we,we)
                wc.close();wb.close()
            run_group('WebKit iPhone stand-in',webkit_touch)


            def hub():
                harness=quote(DEV.name)+'/hub-harness.html'
                for players,extra,label in [(2,'','two players'),(4,'&latency=150&jitter=50&loss=5','four players with loss'),(4,'&latency=150&jitter=50&loss=5&scenario=host-leave','host leaves')]:
                    hc=browser.new_context(viewport={'width':1280,'height':800})
                    hp=hc.new_page()
                    hu=base+harness+'?game='+quote('../'+GAME.name,safe='')+f'&players={players}&auto=1&play=3200'+extra
                    hp.goto(hu)
                    check('harness page is the official local AI Hub harness ('+label+')',hp.title().startswith('AI Hub'),hp.title())
                    hp.wait_for_function('window.__hubCheck?.done',timeout=90000)
                    report=hp.evaluate('window.__hubCheck')
                    DETAILS['hub-'+label]=report
                    failed=[x for x in report['checks'] if not x['pass']]
                    check('AI Hub conformance: '+label,report['pass'],failed)
                    # End contract: no input or sound continues.
                    states=hp.evaluate('''() => [...document.querySelectorAll('iframe')].map(f=>f.contentWindow?.__STAR_RECLAIMERS__?.snapshot()).filter(Boolean)''')
                    check('AI Hub end stops every remaining game ('+label+')',all(s['hubEnded'] for s in states),states)
                    hc.close()
            run_group('official AI Hub harness',hub)
            browser.close()
    finally:
        server.shutdown();server.server_close();thread.join(timeout=3)
    report={'checks':CHECKS,'parameters':{'browser':'Chromium 153 / Playwright 1.63','graphics':GPU_ARGS,'server':'127.0.0.1, OS-assigned port','controller':'standard-mapping navigator.getGamepads stub','touch':'Pixel 7 profile, landscape and portrait','playthrough':'fixed-step AI pilot, invulnerable hull, ordinary Rapier cannons and campaign rules'},'details':DETAILS}
    (DEV/'test-results.json').write_text(json.dumps(report,indent=2)+'\n')
    failed=sum(not c['pass'] for c in CHECKS)
    print(f'{len(CHECKS)-failed}/{len(CHECKS)} checks passed; {failed} failures.',flush=True)
    return 1 if failed else 0

if __name__=='__main__':
    sys.exit(main())
