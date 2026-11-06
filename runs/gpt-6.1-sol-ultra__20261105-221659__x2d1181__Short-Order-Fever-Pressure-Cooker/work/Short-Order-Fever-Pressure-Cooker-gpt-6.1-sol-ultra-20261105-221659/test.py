"""Run ./test.sh: game rules, input, audio, transports, full playthrough and AI Hub."""
from pathlib import Path
import json
import subprocess
import re
import sys
import traceback
from playwright.sync_api import sync_playwright
from test_hub import run as hub_checks
from test_remote import run as remote_checks

P=Path(__file__).resolve().parent
SLUG=P.name
COUNT=0
FAIL=[]
REPORT={}
def check(name,fn):
    global COUNT
    COUNT+=1
    try:
        value=fn()
        if value is False: raise AssertionError('condition was false')
    except Exception as e:
        FAIL.append(name+': '+str(e).splitlines()[0])
def run():
    global COUNT
    subprocess.run(['python3',str(P/'build.py')],check=True,capture_output=True)
    server=subprocess.Popen(['python3','-u',str(P/'serve.py')],cwd=P.parent,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    try:
        port=re.search(r'port (\d+)',server.stdout.readline()).group(1)
        base='http://127.0.0.1:'+port
        url=base+'/'+SLUG+'.html'
        if '--remote-only' in sys.argv:
            count,failures=remote_checks(base);COUNT+=count;FAIL.extend(failures)
            check('exit interview valid JSON',lambda:len(json.loads((P.parent/'exit-interview.json').read_text())['engineFeedback'])==6)
            return
        with sync_playwright() as pw:
            browser=pw.chromium.launch(args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding','--autoplay-policy=no-user-gesture-required'])
            context=browser.new_context(viewport={'width':1600,'height':1000},ignore_https_errors=True)
            page=context.new_page()
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.add_init_script("window.__pad=null; navigator.getGamepads=()=>window.__pad?[window.__pad]:[];")
            page.goto(url)
            page.wait_for_function('window.__gameReady || window.__gameError',timeout=90000)
            check('identity and initialization',lambda:page.title().startswith('Short Order Fever') and page.evaluate('!!__gameReady && !window.__gameError'))
            check('native WebGPU renderer',lambda:page.evaluate('__game.scene().renderer')=='WebGPU')
            check('default music 10 percent',lambda:page.evaluate('__game.getAudio().musicVolume')==.1)
            check('title keyboard menu focus',lambda:page.locator('#title-panel [data-action=start]').get_attribute('class').find('pad-focus')>=0)
            page.keyboard.press('Enter')
            page.wait_for_timeout(500)
            check('keyboard starts kitchen',lambda:page.evaluate('__game.getScreen()')=='playing')
            z=page.evaluate('__game.getState().players[0].z')
            page.keyboard.down('w');page.wait_for_timeout(500);page.keyboard.up('w')
            check('WASD movement',lambda:page.evaluate('__game.getState().players[0].z')<z-.1)
            page.keyboard.press('Escape')
            pause_time=page.evaluate('__game.getState().shiftTime');page.wait_for_timeout(250)
            check('pause freezes shift clock',lambda:page.evaluate('__game.getState().shiftTime')==pause_time and page.evaluate('(()=>{const t=__game.getState().shiftTime;return __game.getScreen()==="pause" && t>0})()'))
            page.locator('[data-action=dev]').click()
            page.locator('[data-tuning=beltSpeed]').fill('2.5')
            check('live balance slider',lambda:page.evaluate('__game.getTuning().beltSpeed')==2.5)
            page.locator('[data-action=dev-reset]').click()
            check('reset tuning defaults',lambda:page.evaluate('__game.getTuning().beltSpeed')==1.65)
            page.locator('#dev-panel [data-action=resume]').click()
            # Controlled state steps invoke production rules, not mirrored test implementations.
            check('correct layer catch',lambda:page.evaluate("""(()=>{__game.start();__game.setPlayer({x:0,z:.65});__game.setState({items:[{id:999,type:'patty',x:0,z:-.65}]});__game.act();return __game.getState().players[0].stack.join()==='patty'&&__game.getState().stats.caught===1})()"""))
            check('wrong layer adds pressure and keeps stack',lambda:page.evaluate("""(()=>{const p=__game.getState().pressure;__game.setState({items:[{id:998,type:'tomato',x:0,z:-.65}]});__game.act();__game.step(.016);const s=__game.getState();return s.pressure>p+7&&s.players[0].stack.join()==='patty'&&s.debris.length>0})()"""))
            check('Rapier debris moves under gravity',lambda:page.evaluate("""(()=>{let y=__game.getState().debris[0].y;for(let i=0;i<15;i++)__game.step(1/60);return __game.getState().debris[0].y>y})()"""))
            check('discard clears tray',lambda:page.evaluate("""(()=>{__game.discard();return __game.getState().players[0].stack.length===0&&__game.getState().stats.wasted>0})()"""))
            check('ready burger and correct hatch score',lambda:page.evaluate("""(()=>{__game.start();__game.setPlayer({x:0,z:.65});for(const type of ['patty','cheese']){__game.setState({items:[{id:1001,type,x:0,z:-.65}]});__game.act();}__game.setPlayer({x:-5.5,z:4.8});__game.act();const s=__game.getState();return s.served===1&&s.score>=200&&s.players[0].stack.length===0&&s.combo===1&&s.pressure<8})()"""))
            check('wrong hatch rejects burger',lambda:page.evaluate("""(()=>{__game.setPlayer({stack:[...__game.getState().orders[0].recipe],x:5.5,z:4.8});const n=__game.getState().served;__game.act();return __game.getState().served===n&&__game.getState().pressure>=7})()"""))
            check('cannot switch a partly assembled tray',lambda:page.evaluate("""(()=>{__game.select(1);return __game.getState().players[0].order===0})()"""))
            check('bell pauses conveyor and ticket patience',lambda:page.evaluate("""(()=>{__game.setState({bellCharge:1,items:[{id:123,type:'cheese',x:0,z:-.65}]});let p=__game.getState().orders[0].patience;__game.bell();__game.step(1);const s=__game.getState();return s.freeze===4&&s.items[0].x===0&&s.orders[0].patience===p&&s.stats.bells===1})()"""))
            check('expired ticket penalizes and renews',lambda:page.evaluate("""(()=>{__game.start();let s=__game.getState(),id=s.orders[0].id;s.orders[0].patience=.01;__game.setState({orders:s.orders});__game.step(.1);s=__game.getState();return s.stats.expired===1&&s.orders[0].id!==id&&s.pressure>20})()"""))
            check('steam hazard stuns with warning phase',lambda:page.evaluate("""(()=>{__game.start();__game.setState({shift:1,time:12,pressure:8});__game.setPlayer({x:0,z:2.7});__game.step(.016);const s=__game.getState();return s.players[0].stun>0&&s.pressure>11&&s.ventPhase>11.5})()"""))
            check('pressure defeat',lambda:page.evaluate("""(()=>{__game.setState({pressure:101});__game.step(.016);return __game.getState().mode==='defeat'&&__game.getScreen()==='result'})()"""))
            check('shift timeout defeat',lambda:page.evaluate("""(()=>{__game.start();__game.setState({shiftTime:.01});__game.step(.1);return __game.getState().mode==='defeat'})()"""))
            # A full scripted service uses every layer and every colored hatch through the real action handler.
            check('complete 15 burger three-shift playthrough',lambda:page.evaluate("""(()=>{__game.auto(false);__game.start();let layers=0;for(let n=0;n<15;n++){let s=__game.getState();if(s.mode==='intermission')__game.step(5);let i=n%3;__game.select(i);s=__game.getState();__game.setPlayer({x:0,z:.65});for(const type of s.orders[i].recipe){__game.setState({items:[{id:4000+layers++,type,x:0,z:-.65}]});__game.act();}__game.setPlayer({x:[-5.5,0,5.5][i],z:4.8});__game.act();}const s=__game.getState();return s.mode==='victory'&&s.shift===2&&s.served===15&&s.stats.caught===47&&s.score>5000})()"""))
            REPORT['scriptedFinal']=page.evaluate('__game.getState()')
            # AI drives normal movement/catch/serve logic; loop is accelerated simulation time.
            check('autochef natural full playthrough',lambda:page.evaluate("""(()=>{__game.auto(true);__game.start();for(let n=0;n<15000&&__game.getState().mode!=='victory'&&__game.getState().mode!=='defeat';n++)__game.step(1/30);__game.auto(false);return __game.getState().mode==='victory'})()"""))
            REPORT['autoFinal']=page.evaluate('__game.getState()')
            page.evaluate('__game.start()');page.wait_for_timeout(100)
            check('offline audio is finite audible unclipped',lambda:page.evaluate("""async()=>{const r=await __game.audioTest();return r.supported&&r.finite&&r.rms>.005&&r.peak<1} """))
            check('procedural audio scheduled music and voices',lambda:page.evaluate('__game.getAudio().notes>0 && __game.getAudio().voices>0'))
            # Standard Gamepad API emulation, including last-input glyphs and UI focus.
            page.evaluate("window.__pad={id:'Test DualSense',index:0,connected:true,mapping:'standard',axes:[1,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};__game.setPlayer({x:0,z:3})")
            page.wait_for_timeout(350)
            check('standard pad movement and PlayStation glyph',lambda:page.evaluate('__game.getState().players[0].x')>.1 and '□' in page.locator('#controls').inner_text())
            page.evaluate('window.__pad.axes=[0,0,0,0];window.__pad.buttons[9]={pressed:true,value:1}')
            page.wait_for_timeout(100)
            check('pad Options opens pause',lambda:page.evaluate('__game.getScreen()')=='pause')
            page.evaluate('window.__pad.buttons[9]={pressed:false,value:0}')
            page.wait_for_timeout(80)
            page.evaluate('window.__pad.buttons[0]={pressed:true,value:1}')
            page.wait_for_timeout(120)
            check('pad menu activation preserves pad prompts',lambda:page.evaluate('__game.getScreen()')=='playing' and '□' in page.locator('#controls').inner_text())
            page.evaluate('window.__pad=null');stop_x=page.evaluate('__game.getState().players[0].x');page.wait_for_timeout(250)
            check('disconnected controller stops movement',lambda:abs(page.evaluate('__game.getState().players[0].x')-stop_x)<.1)
            page.keyboard.press('Escape');page.locator('#pause-panel [data-action=settings]').click();page.select_option('#glyphs','xbox');page.locator('#settings-panel [data-action=back]').click();page.locator('#pause-panel [data-action=resume]').click()
            page.evaluate("window.__pad={id:'Test Xbox',index:0,connected:true,mapping:'standard',axes:[.3,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}")
            page.wait_for_timeout(160)
            check('Xbox glyph setting',lambda:'Y' in page.locator('#controls').inner_text() and '□' not in page.locator('#controls').inner_text())
            def pad_press(index):
                page.evaluate('(i)=>window.__pad.buttons[i]={pressed:true,value:1}',index);page.wait_for_timeout(90)
                page.evaluate('(i)=>window.__pad.buttons[i]={pressed:false,value:0}',index);page.wait_for_timeout(90)
            page.evaluate('window.__pad.axes=[0,0,0,0]')
            pad_press(9)
            pad_press(13);pad_press(13);pad_press(0)
            check('controller opens Settings through menu',lambda:page.evaluate('__game.getScreen()')=='settings')
            pad_press(13);pad_press(13)
            old_glyph=page.locator('#glyphs').input_value();pad_press(15)
            check('controller changes prompt SELECT',lambda:page.locator('#glyphs').input_value()!=old_glyph)
            pad_press(13);old_assist=page.locator('#assist').is_checked();pad_press(0)
            check('controller toggles Settings checkbox',lambda:page.locator('#assist').is_checked()!=old_assist)
            pad_press(1);pad_press(13);pad_press(13);pad_press(13);pad_press(0)
            check('controller opens Developer Kitchen',lambda:page.evaluate('__game.getScreen()')=='dev')
            for _ in range(6):pad_press(13)
            pad_press(0)
            check('controller toggles developer checkbox',lambda:page.locator('#dev-invincible').is_checked())
            pad_press(0)
            page.evaluate('window.__pad=null')
            page.locator('#dev-panel [data-action=resume]').click()
            # Attract mode idle timer and any-button exit.
            page.keyboard.press('Escape');page.locator('[data-action=title]').first.click();page.wait_for_timeout(10800)
            check('attract starts after ten seconds',lambda:page.evaluate('__game.getState().attract && __game.getScreen()==="playing"'))
            page.keyboard.press('Space')
            check('any input exits attract to title',lambda:page.evaluate('!__game.getState().attract && __game.getScreen()==="title"'))
            check('no game runtime errors',lambda:not errors)
            # Standalone local co-op uses actual two game pages and replicated authority.
            peer=context.new_page();peer.goto(url+'?webgl');peer.wait_for_function('window.__gameReady',timeout=60000)
            page.bring_to_front();page.evaluate('__game.network.hostLocal()')
            peer.evaluate('__game.network.joinLocal()')
            peer.wait_for_function('__game.getState().players.length===2 && __game.network.localId()===1',timeout=10000)
            check('standalone local co-op joins',lambda:page.evaluate('__game.getState().players.length')==2)
            peer.bring_to_front();peer.keyboard.down('d');peer.wait_for_timeout(400);peer.keyboard.up('d');peer.wait_for_timeout(150)
            check('guest movement reaches authority',lambda:page.evaluate('__game.getState().players.find(p=>p.id===1).x')>-.6)
            check('shared state and scores replicated',lambda:peer.evaluate('__game.getState().served')==page.evaluate('__game.getState().served'))
            peer.evaluate('__game.network.close()');page.wait_for_timeout(250)
            check('departed player removed',lambda:page.evaluate('__game.getState().players.length')==1)
            peer.close();page.close();context.close()
            # Touch profile keeps controls sparse and applies correct catch assist.
            mobile=browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=1,ignore_https_errors=True)
            phone=mobile.new_page();phone.goto(url+'?webgl');phone.wait_for_function('window.__gameReady',timeout=60000)
            phone.locator('[data-action=start]').tap();phone.touchscreen.tap(400,220);phone.wait_for_timeout(100)
            check('touch interface enabled',lambda:'touch' in phone.locator('body').get_attribute('class'))
            phone.evaluate("__game.setPlayer({x:0,z:.65});__game.setState({items:[{id:999,type:'patty',x:0,z:-.65}]})")
            phone.wait_for_timeout(300)
            check('touch assists correct ingredient',lambda:phone.evaluate('__game.getState().players[0].stack[0]')=='patty')
            phone.set_viewport_size({'width':390,'height':844});phone.wait_for_timeout(100)
            check('portrait resize retains playable canvas',lambda:phone.locator('#game').bounding_box()['width']==390)
            phone.close();mobile.close()
            # file:// standalone initialization with CDN modules.
            direct=browser.new_page();direct.goto((P.parent/(SLUG+'.html')).as_uri()+'?webgl');direct.wait_for_function('window.__gameReady || window.__gameError',timeout=60000)
            check('single HTML file URL startup',lambda:direct.evaluate('!!window.__gameReady'))
            direct.close();browser.close()
        if '--skip-hub' not in sys.argv:
            count,failures=remote_checks(base);COUNT+=count;FAIL.extend(failures)
            count,failures=hub_checks(base);COUNT+=count;FAIL.extend(failures)
        if (P.parent/'exit-interview.json').exists():
            check('exit interview valid JSON',lambda:len(json.loads((P.parent/'exit-interview.json').read_text())['engineFeedback'])==6)
    finally:
        server.terminate();server.wait(timeout=5)
try:run()
except Exception as e:FAIL.append('suite interrupted: '+str(e).splitlines()[0]);COUNT+=1;REPORT['traceback']=traceback.format_exc()
REPORT['checks']=COUNT;REPORT['failures']=FAIL
(P/('final-regression-report.json' if '--remote-only' in sys.argv else 'test-report.json')).write_text(json.dumps(REPORT,indent=2))
for failure in FAIL:print('FAIL '+failure)
print(f'{COUNT-len(FAIL)}/{COUNT} checks passed')
sys.exit(bool(FAIL))
