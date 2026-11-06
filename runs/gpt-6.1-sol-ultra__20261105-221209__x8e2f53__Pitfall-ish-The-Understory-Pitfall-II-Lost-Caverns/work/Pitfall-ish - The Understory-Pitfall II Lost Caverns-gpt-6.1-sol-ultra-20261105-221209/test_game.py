"""One-command acceptance checks. Prints only failures and one final count."""
from pathlib import Path
import json
import re
import subprocess
import sys
import urllib.parse
from playwright.sync_api import sync_playwright
from route_test import run_route
from test_hub import run_hub_harness

ROOT=Path(__file__).resolve().parent
INFO=json.loads((ROOT/'build-info.json').read_text())
RESULTS=[]
def check(name,passed,detail=''):
    RESULTS.append((name,bool(passed),str(detail)))
def run_child(filename):
    command=['node',filename] if filename.endswith('.mjs') else [sys.executable,filename]
    result=subprocess.run(command,cwd=ROOT,text=True,capture_output=True)
    output=result.stdout+result.stderr
    for line in output.splitlines():
        if line.startswith('FAIL '): check(line[5:],False)
    count=re.search(r'(\d+)(?:/(\d+))? (?:networking checks passed|WebRTC checks passed|UI checks|file camp checks)',output)
    if count:
        total=int(count.group(2) or count.group(1))
        failures=sum(1 for line in output.splitlines() if line.startswith('FAIL '))
        for n in range(max(0,total-failures)):check(f'{filename} check {n+1}',True)
    else:check(filename+' completed',result.returncode==0,output[-1000:])
    if result.returncode and not any(line.startswith('FAIL ') for line in output.splitlines()):check(filename+' exited cleanly',False,output[-1000:])

server=subprocess.Popen([sys.executable,'-u','-m','http.server','0','--bind','127.0.0.1'],cwd=ROOT.parent,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
try:
    line=server.stdout.readline();port=re.search(r'port (\d+)',line)
    if not port:raise RuntimeError('Could not identify own HTTP server')
    base='http://127.0.0.1:'+port.group(1)
    url=base+'/'+urllib.parse.quote(INFO['stem']+'.html')
    meta=json.loads((ROOT/'metadata.json').read_text())
    check('Exit interview schema has required fields',set(meta)=={'sourceInformation','testingFeedback','engineFeedback','promptFeedback','aiHub'} and len(meta['testingFeedback'])==4 and len(meta['engineFeedback'])==6 and len(meta['promptFeedback'])==4)
    check('Title selected using a real 50-candidate random draw',INFO['candidates']==50 and 1<=INFO['selection']<=50)
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-webgpu-adapter=swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding'])
        context=browser.new_context(viewport={'width':1600,'height':900})
        context.add_init_script("window.testPad={id:'Injected standard DualSense',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[window.testPad];")
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url);page.wait_for_function('window.__game?.getState().ready||window.__bootError',timeout=90000)
        check('Server serves the intended game',page.title()==INFO['title'])
        check('Game starts without a click',page.evaluate("__game.getState().ready&&__game.getState().mode==='title'"))
        check('Exact engine versions',page.evaluate("__game.getState().three==='180'&&__game.getState().rapier==='0.19.3'"))
        check('Music defaults to ten percent and remains gesture locked',page.evaluate("__game.audio().musicVolume===.1&&!__game.audio().ready"))
        page.wait_for_function("__game.getState().stats.frames>2&&!window.__bootError",timeout=60000)
        check('Renderer submits scene geometry after device recovery if needed',page.evaluate("__game.renderInfo().calls>0"))
        page.keyboard.press('ArrowDown');check('Keyboard menus navigate',page.evaluate("document.activeElement.dataset.action==='coop'"))
        page.keyboard.press('ArrowUp');page.keyboard.press('Enter');page.wait_for_function("__game.getState().mode==='playing'")
        start=page.evaluate('__game.getState().players[0].x');page.keyboard.down('KeyD');page.wait_for_timeout(250);page.keyboard.up('KeyD')
        check('Keyboard movement changes physical position',page.evaluate('__game.getState().players[0].x')>start+.3)
        page.keyboard.press('Escape');check('Escape pauses',page.evaluate("__game.getState().mode==='paused'&&document.querySelector('[data-action=resume]')!==null"))
        page.keyboard.press('Escape');check('Escape resumes exactly once',page.evaluate("__game.getState().mode==='playing'"))
        page.keyboard.press('KeyM');check('Field map shows actual cave geometry',page.locator('.field-map svg rect').count()>10)
        page.keyboard.press('Escape');page.keyboard.press('Escape')
        page.evaluate("__game.action('pause');__game.action('dev')")
        page.locator('[data-setting=speed]').evaluate("e=>{e.value=9;e.dispatchEvent(new Event('input',{bubbles:true}))}")
        check('Developer tuning applies live',page.evaluate('__game.getState().config.speed===9'))
        page.locator('[data-action="dev:reset"]').click();check('Developer reset restores defaults',page.evaluate('__game.getState().config.speed===6.2'))
        page.locator('[data-action="dev:teleport"][data-value=river]').click();check('Developer quick travel works',page.evaluate('__game.getState().players[0].x===60'))
        page.evaluate("__game.action('settings')");page.locator('[data-setting=music]').evaluate("e=>{e.value=.2;e.dispatchEvent(new Event('input',{bubbles:true}))}")
        check('Settings update live audio graph',page.evaluate('__game.audio().musicVolume===.2'))
        page.locator('[data-setting=glyphs]').select_option('xbox');page.evaluate("__game.action('title');window.testPad.buttons[0]={pressed:true,value:1}");page.wait_for_function("__game.getState().mode==='playing'",timeout=30000);page.evaluate('testPad.buttons[0]={pressed:false,value:0}')
        check('Gamepad Cross starts expedition',page.evaluate("__game.getState().mode==='playing'&&__game.getState().lastInput==='gamepad'"))
        page.evaluate('testPad.axes[0]=1');page.wait_for_function('__game.getState().players[0].x>8.3',timeout=30000);page.evaluate('testPad.axes[0]=0')
        check('Gamepad stick drives the same controller',page.evaluate('__game.getState().players[0].x>8.2'))
        page.evaluate('testPad.buttons[9]={pressed:true,value:1}');page.wait_for_function("__game.getState().mode==='paused'",timeout=30000);page.evaluate('testPad.buttons[9]={pressed:false,value:0}')
        check('Gamepad Options pauses',page.evaluate("__game.getState().mode==='paused'"))
        check('Xbox prompt preference is reflected',page.locator('#input-hint').inner_text().startswith('A SELECT'))
        page.evaluate("__game.action('start');__game.action('pause');__game.step(30,{});__game.teleport(12,4.2);__game.step(1,{});window.beforeMishap=__game.getState();__game.setHealth(1);__game.hurt()")
        check('Fatal mishap restores checkpoint and hearts',page.evaluate('__game.getState().players[0].health===3&&Math.abs(__game.getState().players[0].x-8)<.1'))
        check('Mishap preserves collected treasure',page.evaluate('__game.getState().gold===beforeMishap.gold&&beforeMishap.gold>0'))
        check('Damage is counted and score cannot become negative',page.evaluate('__game.getState().stats.hits===1&&__game.getState().score>=0'))
        probe=page.evaluate('__game.renderAudioProbe()');check('All synthesized audio renders finite audible samples',probe['finite'] and probe['rms']>.001 and 0<probe['peak']<1 and probe['effectEvents']>=10 and probe['voiceEvents']>0,str(probe))
        for name,passed,detail in run_route(page):check(name,passed,detail)
        (ROOT/'route-trace.json').write_text(json.dumps(page.evaluate('window.__routeTrace'),indent=2))
        balloon_check=page.evaluate("""()=>{const g=__game;g.action('start');g.action('pause');g.action('assist',true);g.teleport(85.8,-25.98);let n=0;while(!g.getState().players[0].balloon&&n++<1200)g.step(1,{up:true});g.step(1,{});g.step(1,{up:true,jump:true,left:true});const free=!g.getState().players[0].balloon;g.step(30,{up:true,left:true});const escaped=!g.getState().players[0].balloon;g.action('assist',false);return{caught:n<1200,free,escaped};}""")
        check('Assist and held-up input cannot trap a dismounting balloon rider',all(balloon_check.values()),str(balloon_check))
        page.evaluate("__game.action('title');__game.setIdle(9.99)");page.wait_for_function("__game.getState().mode==='attract'",timeout=30000)
        check('Attract replay starts after ten seconds idle',page.evaluate("__game.getState().mode==='attract'"))
        page.keyboard.press('KeyQ');check('Any input exits attract mode',page.evaluate("__game.getState().mode==='title'"))
        page.evaluate("__game.action('about')");page.locator('[data-action="about:credits"]').click();check('About contains complete source metadata',all(x in page.locator('.credits-grid').inner_text() for x in ['added on import','0.19.3','2026-11-05','gpt-6.1-sol']))
        page.locator('[data-action="about:feedback"]').click();check('About contains all interview answers',page.locator('.feedback-block article').count()==14)
        # Two real game copies share a world over the standalone local transport.
        guest=context.new_page();guest.goto(url);guest.wait_for_function('window.__game?.getState().ready',timeout=90000)
        page.evaluate("CavernNet.hostLocal('ACCEPTANCE')");guest.evaluate("CavernNet.joinLocal('ACCEPTANCE')");guest.wait_for_function('CavernNet.status().connected');page.wait_for_function('__game.getState().players.length===2')
        guest.keyboard.down('KeyD');page.wait_for_function('__game.getState().players.find(p=>p.id===1).x>8.5',timeout=30000);guest.keyboard.up('KeyD')
        hostX=page.evaluate('__game.getState().players.find(p=>p.id===1).x');guestX=guest.evaluate('__game.getState().players.find(p=>p.id===1).x')
        check('Standalone guest input moves authoritative actor',hostX>8.4,str(hostX));check('Standalone guest receives matching world snapshots',abs(hostX-guestX)<1,f'{hostX} / {guestX}')
        guest.evaluate("__game.action('pause')");page.wait_for_function("Math.abs(__game.getState().players.find(p=>p.id===1).vx)<.05",timeout=30000)
        paused_x=page.evaluate('__game.getState().players.find(p=>p.id===1).x');page.wait_for_timeout(300)
        check('A paused guest sends neutral controls',abs(page.evaluate('__game.getState().players.find(p=>p.id===1).x')-paused_x)<.1)
        page.evaluate("__game.action('dev:rescue');__game.teleport(8,4.02)");page.wait_for_function("__game.getState().mode==='victory'",timeout=30000);guest.wait_for_function("__game.getState().mode==='victory'",timeout=30000)
        guest.evaluate("__game.action('restart')");page.wait_for_function("__game.getState().mode==='playing'",timeout=30000);guest.wait_for_function("__game.getState().mode==='playing'",timeout=30000)
        check('Co-op can restart the expedition without reconnecting',guest.evaluate('__game.getState().rescued.every(v=>!v)&&CavernNet.status().connected'))
        page.evaluate("__game.teleport(88,-3.98)");guest.wait_for_function('__game.getState().players.every(p=>p.checkpoint.x===88)',timeout=30000)
        check('Shared checkpoint positions reach the guest',guest.evaluate('__game.getState().checkpoints[4]'))
        guest.evaluate('CavernNet.solo()');page.wait_for_timeout(100);check('Disconnected co-op returns to a live solo expedition',page.evaluate("CavernNet.status().transport==='solo'&&__game.getState().players.length===1"))
        guest.close();context.close()
        # Touch input uses the same screens with invisible sticks and contextual actions.
        mobile=browser.new_context(viewport={'width':844,'height':390},has_touch=True,is_mobile=True,device_scale_factor=1)
        touch=mobile.new_page();touch.goto(url);touch.wait_for_function('window.__game?.getState().ready',timeout=90000);touch.locator('[data-action=start]').tap();touch.evaluate("__game.action('pause')")
        touch.evaluate("__game.action('resume')");cdp=mobile.new_cdp_session(touch);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':130,'y':220,'id':1}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':210,'y':220,'id':1}]})
        touch.wait_for_function('__game.getState().input.right',timeout=30000);check('Touch drag controls movement',touch.evaluate("__game.getState().lastInput==='touch'&&__game.getState().input.right"))
        touch.wait_for_function("getComputedStyle(document.querySelector('.hud-top')).display==='none'",timeout=30000)
        check('Touch HUD remains minimal',touch.evaluate("getComputedStyle(document.querySelector('.hud-top')).display==='none'"))
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});touch.locator('.corner-menu').tap();check('Touch menu button pauses',touch.evaluate("__game.getState().mode==='paused'"));mobile.close()
        # Offline file:// operation is part of the deliverable contract.
        offline=browser.new_context(offline=True);fp=offline.new_page();fp.goto((ROOT.parent/(INFO['stem']+'.html')).as_uri());fp.wait_for_function('window.__game?.getState().ready',timeout=90000)
        check('Single HTML boots offline over file protocol',fp.title()==INFO['title'] and fp.evaluate('__game.getState().ready'));offline.close()
        check('No uncaught runtime errors during mechanics and UI checks',not errors,'; '.join(errors));browser.close()
    for filename in ['hub-test.mjs','hub-rtc-test.py','hub-file-test.py','test_ui.py']:run_child(filename)
    for report in run_hub_harness(base):
        for item in report['checks']:check('AI Hub '+report.get('scenario','standard')+': '+item['name'],item['pass'],item.get('detail',''))
except Exception as e:
    check('Acceptance suite completed',False,str(e))
finally:
    server.terminate();server.wait(timeout=10)
failed=[r for r in RESULTS if not r[1]]
(ROOT/'test-results.json').write_text(json.dumps({'checks':len(RESULTS),'failures':len(failed),'results':[{'name':n,'pass':p,'detail':d} for n,p,d in RESULTS]},indent=2))
for name,passed,detail in failed:print('FAIL '+name+(': '+detail if detail else ''))
print(f'{len(RESULTS)} checks, {len(failed)} failures')
raise SystemExit(bool(failed))
