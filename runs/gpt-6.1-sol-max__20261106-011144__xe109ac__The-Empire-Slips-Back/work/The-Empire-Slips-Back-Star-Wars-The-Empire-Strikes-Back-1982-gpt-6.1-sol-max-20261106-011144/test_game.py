from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import contextlib
import functools
import json
import subprocess
import threading
import time
import sys
from playwright.sync_api import sync_playwright

DEV=Path(__file__).resolve().parent
ROOT=DEV.parent
GAME=ROOT/(DEV.name+'.html')
ART=DEV/'test-artifacts'
ART.mkdir(exist_ok=True)
subprocess.run([sys.executable,str(DEV/'build.py')],check=True,capture_output=True)
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{server.server_port}'
URL=BASE+'/'+GAME.name
results=[]
CASE=sys.argv[1] if len(sys.argv)>1 else ''
pageRef=None
errors=[]
console_errors=[]
def check(name,fn):
    if CASE and 'boot' not in name.lower() and CASE.lower() not in name.lower() and name!='Test runner completion':return
    try:
        fn()
        results.append({'name':name,'pass':True})
    except Exception as e:
        msg=str(e).split('Call log:')[0][:1800]
        if 'gamepad' in name and pageRef:
            msg+=' STATE '+str(pageRef.evaluate('({state:window.__game.snapshot,focus:document.activeElement?.id,pad:window.__pad})'))
        results.append({'name':name,'pass':False,'detail':msg})
        print('FAIL '+name+': '+msg,flush=True)
def expect(value,msg):
    if not value: raise AssertionError(msg)
def snap(page):
    return page.evaluate('window.__game.snapshot')

def capture(page,name):
    page.evaluate("""async()=>{const data=await window.__game.capture();const img=document.createElement('img');img.id='test-readback';img.src=data;img.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:1;pointer-events:none';document.body.append(img);await img.decode();}""")
    page.screenshot(path=str(ART/(name+'.png')))
    page.evaluate("document.getElementById('test-readback').remove()")

def run():
    global pageRef
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--disable-dev-shm-usage','--use-angle=swiftshader'])
        context=browser.new_context(viewport={'width':1920,'height':1080},device_scale_factor=1)
        page=context.new_page();pageRef=page
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None)
        page.goto(URL,wait_until='domcontentloaded')
        def boot():
            page.wait_for_function('window.__game?.ready',timeout=90000)
            expect(page.title()=='The Empire Slips Back','Wrong game served')
            expect(page.evaluate('window.__game.renderer')=='WebGPU','WebGPU not used')
            page.evaluate('window.__game.setIdle(0)')
        check('Single-file WebGPU boot',boot)
        if not page.evaluate('!!window.__game'):
            raise RuntimeError('Boot failed. '+str(errors)+' / '+str(console_errors)+' / '+page.locator('#loadMessage').inner_text())
        capture(page,'title')
        def metadata():
            data=json.loads((ROOT/'exit-interview.json').read_text())
            expect(set(data)=={'sourceInformation','testingFeedback','engineFeedback','promptFeedback','aiHub'},'Exit interview schema differs')
            expect(all(isinstance(v,str) and v for v in data['sourceInformation'].values()),'Source information has an empty field')
            expect([len(data[k]) for k in ['testingFeedback','engineFeedback','promptFeedback']]==[4,6,4],'Feedback answers missing')
            embedded=page.evaluate('JSON.parse(document.getElementById("creditsData").textContent)')
            expect(embedded==data,'Embedded credits and exit interview differ')
            page.locator('#about').click()
            for text in ['Source Information','Testing Feedback','Engine Feedback','Prompt Feedback']:
                expect(page.locator('#panel').get_by_text(text,exact=True).count()==1,'Missing '+text)
            page.locator('#menuBack').click()
        check('Exit interview JSON and all four in-game credit sections',metadata)
        def packaging():
            html=GAME.read_text()
            for token in ['/* HUB_CLIENT */','/* STYLE */','// GAME_MODULE','/* CREDITS_JSON */']:
                expect(token not in html,'Unbundled token '+token)
            expect((DEV/'hub-session.js').read_text() in html,'Hub session client was modified')
            expect(GAME.name==DEV.name+'.html','Deliverable name differs from folder')
        check('Single-file packaging and unmodified Hub client',packaging)

        def menus():
            page.locator('#how').click()
            expect(page.locator('.schoolcard').count()==6,'School missing mechanics')
            page.locator('#menuBack').click()
            page.locator('#settings').click()
            expect(page.locator('#music').input_value()=='10','Music is not at 10%')
            page.select_option('#glyphs','xbox')
            page.locator('#menuBack').click()
            page.locator('#launch').click()
            expect(snap(page)['screen']=='playing','Launch failed')
            page.keyboard.press('Escape')
            page.locator('#dev').click()
            page.locator('#dev-speed').fill('31')
            expect(snap(page)['tuning']['speed']==31,'Live speed slider ignored')
            page.locator('#resetTuning').click()
            expect(snap(page)['tuning']['speed']==22,'Defaults reset failed')
            page.locator('#menuBack').click()
            page.locator('#resume').click()
        check('Menus, flight school, default audio and live dev sliders',menus)
        def movement():
            page.evaluate('window.__game.teleport(-55,8)')
            x=snap(page)['x']
            page.keyboard.down('KeyD')
            page.wait_for_function(f'window.__game.snapshot.x>{x+4}',timeout=20000)
            page.keyboard.up('KeyD')
            expect(snap(page)['x']>x+4,'WASD movement failed')
            page.evaluate('window.__game.teleport(-55,8)')
            a=page.evaluate('window.__game.step(1,{mx:1,my:0,boost:false}).x')
            page.evaluate('window.__game.teleport(-55,8)')
            b=page.evaluate('window.__game.step(1,{mx:1,my:0,boost:true}).x')
            expect(b>a+7,'Boost failed')
        check('Native keyboard movement and boost physics',movement)
        def heat():
            page.evaluate('window.__game.teleport(-50,25)')
            state=page.evaluate('window.__game.step(4,{fire:true,ax:0,ay:1})')
            expect(state['metrics']['shots']>10,'Blasters did not fire')
            expect(state['heat']>35,'Heat not accumulated')
            state=page.evaluate('window.__game.step(4)')
            expect(state['heat']<5 and not state['overheated'],'Blasters failed to cool')
        check('Blasters, heat lock and cooling',heat)
        def damage_repair():
            page.evaluate('window.__game.start();window.__game.step(3);window.__game.damage(30)')
            expect(snap(page)['hull']==70,'Hull damage incorrect')
            page.evaluate('window.__game.teleport(-97,2);window.__game.step(2.1)')
            expect(snap(page)['hull']>95,'Repair pad failed')
            expect(snap(page)['metrics']['repairs']>=29,'Repair metrics failed')
            page.evaluate('window.__game.setFocus(100);window.__game.activateFocus();window.__game.damage(80)')
            expect(snap(page)['hull']>95 and snap(page)['focusTime']>6,'Instinct invulnerability failed')
        check('Damage, repair and instinct invulnerability',damage_repair)
        def cable():
            page.evaluate('window.__game.start();window.__game.teleport(28,4);window.__game.beginCable()')
            expect(snap(page)['cable'],'Cable did not attach')
            s=page.evaluate('window.__game.step(4)')
            expect(s['metrics']['cables']==1 and s['walkers'][0]['dead'],'Cable did not topple walker')
            expect(s['bodies']>3,'Physics debris not created')
        check('Tow cable orbit, native collapse animation and physics debris',cable)
        def rescue():
            page.evaluate('window.__game.jump(1);window.__game.teleport(-15,2.5)')
            s=page.evaluate('window.__game.step(1.6)')
            expect(s['metrics']['rescued']==1 and s['pilots'][0]['rescued'],'Hover rescue failed')
            expect(s['score']>=1000,'Rescue did not award score')
        check('Hover rescue, reward and mission state',rescue)
        def full_mission():
            page.evaluate('window.__game.start()')
            s=page.evaluate('window.__game.autoplay(290,true)')
            expect(s['won'] and s['ended'],f'Mission did not finish: {s}')
            expect(s['act']==2 and s['metrics']['rescued']==3,'Mission skipped mechanics')
            expect(s['metrics']['cables']>0 and s['metrics']['weakHits']>0 and s['metrics']['focus']>0,f'Mission missing combat features: {s["metrics"]}')
            expect(s['score']>10000,'Mission score missing')
        check('Scripted complete mission across all three waves',full_mission)
        def no_cheats():
            page.evaluate('window.__game.start()')
            s=page.evaluate('window.__game.autoplay(300,false)')
            (ART/'playthrough.json').write_text(json.dumps(s,indent=2))
            expect(s['won'] and s['lives']>0,f'Unassisted mission failed: {s}')
        check('Whole mission with normal damage, lives and enemy pressure',no_cheats)

        def loss_checkpoint():
            page.evaluate('window.__game.start();window.__game.jump(1)')
            for _ in range(3):
                page.evaluate('window.__game.step(6);window.__game.damage(100)')
            expect(snap(page)['ended'] and not snap(page)['won'],'Loss condition failed')
            page.locator('#continue').click()
            s=snap(page)
            expect(s['act']==1 and s['hull']==100 and s['lives']==3 and not s['ended'],'Checkpoint did not restore wave')
        check('Game over and playable checkpoint retry',loss_checkpoint)
        def audio_test():
            s=page.evaluate('window.__game.offlineAudio()')
            expect(s['rms']>.005 and s['peak']>.05 and s['events']>20,f'Synth audio silent: {s}')
            expect(s['peak']<1,f'Audio clipping: {s}')
        check('Offline rendered music, effects and gibberish voice',audio_test)
        def gamepad():
            page.add_init_script('''window.__pad={index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[window.__pad];''')
            page.evaluate('''window.__pad={index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[window.__pad];window.__game.start();window.__pad.axes[0]=1;''')
            x=snap(page)['x'];page.wait_for_function(f'window.__game.snapshot.x>{x+3}',timeout=20000)
            expect(snap(page)['x']>x+3 and snap(page)['inputKind']=='gamepad','Standard pad movement failed')
            page.evaluate('window.__pad.axes[0]=0;window.__pad.buttons[9].pressed=true')
            page.wait_for_function('window.__game.snapshot.screen==="paused"',timeout=10000)
            expect(snap(page)['screen']=='paused','Options pause failed')
            page.evaluate('window.__pad.buttons[9].pressed=false')
            page.wait_for_timeout(400)
            page.evaluate('window.__pad.buttons[0].pressed=true')
            page.wait_for_function('window.__game.snapshot.screen==="playing"',timeout=10000)
            expect(snap(page)['screen']=='playing','Cross/A confirm failed')
            page.evaluate('window.__pad.buttons[0].pressed=false;window.__pad.axes=[0,0,0,0]')
        check('Emulated standard gamepad, glyph switching and menu confirmation',gamepad)
        def attract():
            page.evaluate('window.__pad.axes=[0,0,0,0];window.__pad.buttons.forEach(b=>b.pressed=false);window.__game.returnToTitle();window.__game.setIdle(10.1)')
            page.wait_for_function('window.__game.snapshot.screen==="attract"',timeout=10000)
            s=page.evaluate('window.__game.autoplay(14)')
            expect(s['metrics']['shots']>0,'Attract AI did not play')
            page.keyboard.press('KeyA')
            expect(snap(page)['screen']=='title','Input did not exit attract')
        check('Ten-second attract mode, AI play and input exit',attract)
        def menu_attract():
            page.locator('#how').click()
            page.evaluate('window.__game.setIdle(10.1)')
            page.wait_for_function('window.__game.snapshot.screen==="attract"',timeout=15000)
            page.keyboard.press('Enter')
            expect(snap(page)['screen']=='title','Menu attract did not exit on input')
        check('Idle attract from menu screens',menu_attract)

        page.evaluate('window.__game.start();window.__game.teleport(5,11)')
        page.wait_for_timeout(600)
        capture(page,'battle')
        def network():
            page.evaluate('window.__game.returnToTitle()')
            page.locator('#squad').click();page.locator('#localWing').click()
            second=context.new_page();second.on('pageerror',lambda e:errors.append(str(e)));second.goto(URL,wait_until='domcontentloaded');second.wait_for_function('window.__game?.ready',timeout=90000)
            second.locator('#squad').click();second.locator('#localWing').click()
            page.locator('#linkedLaunch').click()
            second.wait_for_function('window.__game.snapshot.screen==="playing"',timeout=10000)
            page.evaluate('window.__game.teleport(14,12);window.__game.emitGhost()')
            second.wait_for_function('window.__game.snapshot.ghosts.length>0',timeout=10000)
            second.wait_for_function('Math.abs(window.__game.snapshot.ghosts[0].x-14)<2',timeout=10000)
            page.evaluate('window.__game.closeNetwork()');second.close()
        check('Standalone two-page wing launch and ghost synchronization',network)
        def direct_link():
            page.evaluate('window.__game.returnToTitle()')
            page.locator('#squad').click()
            second=context.new_page();second.on('pageerror',lambda e:errors.append(str(e)));second.goto(URL,wait_until='domcontentloaded');second.wait_for_function('window.__game?.ready',timeout=90000)
            second.locator('#squad').click()
            page.locator('#makeInvite').click()
            page.wait_for_function('document.getElementById("netOutput").value.length>20',timeout=12000)
            offer=page.locator('#netOutput').input_value()
            second.locator('#netInput').fill(offer);second.locator('#acceptCode').click()
            second.wait_for_function('document.getElementById("netOutput").value.length>20',timeout=12000)
            response=second.locator('#netOutput').input_value()
            page.locator('#netInput').fill(response);page.locator('#acceptCode').click()
            page.locator('#linkedLaunch:not([disabled])').wait_for(timeout=20000)
            page.locator('#linkedLaunch').click()
            second.wait_for_function('window.__game.snapshot.screen==="playing"',timeout=10000)
            page.evaluate('window.__game.teleport(22,14);window.__game.emitGhost()')
            second.wait_for_function('window.__game.snapshot.ghosts.length>0 && Math.abs(window.__game.snapshot.ghosts[0].x-22)<2',timeout=10000)
            page.evaluate('window.__game.closeNetwork()');second.close()
        check('Direct WebRTC invitation, response and two-page ghost traffic',direct_link)

        page.close();context.close()
        def touch_test():
            mobile=browser.new_context(**p.devices['Pixel 7'])
            m=mobile.new_page();m.on('pageerror',lambda e:errors.append(str(e)));m.goto(URL,wait_until='domcontentloaded');m.wait_for_function('window.__game?.ready',timeout=90000);m.locator('#launch').tap();m.touchscreen.tap(200,400)
            expect(snap(m)['inputKind']=='touch','Touch input not selected')
            cdp=mobile.new_cdp_session(m)
            before=snap(m)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':70,'y':420,'id':1},{'x':310,'y':370,'id':2}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':123,'y':396,'id':1},{'x':315,'y':365,'id':2}]})
            m.wait_for_function(f'window.__game.snapshot.x>{before["x"]+1}',timeout=15000)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            expect(snap(m)['metrics']['shots']>0,'Multitouch aim did not fire')
            m.evaluate('window.__game.teleport(28,4)');m.wait_for_timeout(150)
            expect(m.locator('#touchAction').is_visible(),'Context touch action missing')
            m.locator('#touchAction').tap();m.wait_for_timeout(150)
            expect(snap(m)['cable'],'Touch cable failed')
            m.locator('#touchAction').wait_for(state='hidden',timeout=10000)
            expect(not m.locator('#banner').is_visible(),'Touch mission banner obscures flight')
            expect(not m.locator('#radio').is_visible(),'Touch notices overlap the radio')
            capture(m,'touch')
            mobile.close()
        check('Touch-only layout and contextual cable action',touch_test)
        def file_test():
            c=browser.new_context();f=c.new_page();f.on('pageerror',lambda e:errors.append(str(e)));f.goto(GAME.as_uri(),wait_until='domcontentloaded');f.wait_for_function('window.__game?.ready',timeout=90000);expect(f.title()=='The Empire Slips Back','file URL wrong page');f.locator('#launch').click();expect(snap(f)['screen']=='playing','file deployment launch failed');c.close()
        check('Direct file:// deployment',file_test)
        def fallback():
            c=browser.new_context()
            c.add_init_script("Object.defineProperty(navigator,'gpu',{get:()=>undefined})")
            f=c.new_page();f.on('pageerror',lambda e:errors.append(str(e)));f.goto(URL,wait_until='domcontentloaded')
            f.wait_for_function('window.__game?.ready',timeout=90000)
            expect(f.evaluate('window.__game.renderer')=='WebGL2','Graphics fallback not selected')
            f.locator('#launch').click()
            s=f.evaluate('window.__game.step(1,{mx:1})')
            expect(s['x']>-50,'Graphics fallback mission failed')
            c.close()
        check('Automatic WebGL2 fallback without navigator.gpu',fallback)

        for n,extra in [(2,''),(4,'&latency=150&jitter=50&loss=5'),(4,'&latency=150&jitter=50&loss=5&scenario=host-leave')]:
            def hub_test(n=n,extra=extra):
                c=browser.new_context(viewport={'width':1440,'height':1000})
                h=c.new_page()
                h.goto(BASE+'/'+DEV.name+'/harness.html?game=../'+GAME.name+f'&players={n}&auto=1'+extra,wait_until='domcontentloaded')
                h.wait_for_function('document.body.dataset.complete==="true"',timeout=150000)
                report=h.evaluate('window.__hubCheck')
                (ART/f'hub-{n}-{("host-leave" if "host-leave" in extra else "standard")}.json').write_text(json.dumps(report,indent=2))
                expect(report['pass'],json.dumps([v for v in report['checks'] if not v['pass']]))
                c.close()
            check(f'AI Hub ghost conformance {n} players'+(' host-leave' if 'host-leave' in extra else ' stress' if extra else ''),hub_test)
        check('No browser runtime errors',lambda:expect(not errors and not console_errors,'; '.join(errors+console_errors)))
        browser.close()
try:
    run()
except Exception as e:
    check('Test runner completion',lambda:(_ for _ in ()).throw(e))
finally:
    server.shutdown();server.server_close()
    report={'results':results,'runtimeErrors':errors,'consoleErrors':console_errors,'date':'2026-11-06'}
    (ART/'test-results.json').write_text(json.dumps(report,indent=2))
    with (ART/'test-history.jsonl').open('a') as f:f.write(json.dumps(report)+'\n')
    failures=sum(not r['pass'] for r in results)
    print(f'{len(results)-failures}/{len(results)} checks passed; {failures} failures.',flush=True)
    sys.exit(1 if failures else 0)
