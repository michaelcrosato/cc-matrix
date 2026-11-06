"""One-command regression suite. Only failures and one final count are printed."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
import json, subprocess, os, re, traceback, time

ROOT=Path(__file__).resolve().parent
NAME=ROOT.name+'.html'
checks=0
failures=[]
started=time.monotonic()

def check(name,condition,detail=''):
    global checks
    checks+=1
    (ROOT/'test-progress.json').write_text(json.dumps({'check':checks,'last':name,'elapsed':round(time.monotonic()-started,1)}))
    if not condition: failures.append(name+(f': {detail}' if detail else ''))

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass

server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT.parent)))
thread=Thread(target=server.serve_forever,daemon=True);thread.start()
base=f'http://127.0.0.1:{server.server_address[1]}'
url=f'{base}/{NAME}'

def load(page,webgl=True):
    page.goto(url+('?webgl=1' if webgl else ''),wait_until='domcontentloaded')
    page.wait_for_function('window.__game?.ready || window.__gameError',timeout=120000)
    if page.evaluate('!!window.__gameError'): raise RuntimeError(page.evaluate('window.__gameError'))
    page.wait_for_function('__game.state.renderFrames>0',timeout=30000)
    page.evaluate('__game.setManual(true);__game.setRenderEnabled(false)')

try:
    artifact=(ROOT.parent/NAME).read_text()
    interview=json.loads((ROOT.parent/'exit-interview.json').read_text())
    check('single HTML artifact exists',len(artifact)>10000)
    check('source interview has exact root keys',set(interview)=={'sourceInformation','testingFeedback','engineFeedback','promptFeedback','aiHub'})
    check('feedback answers are complete length',[len(interview[k]) for k in ['testingFeedback','engineFeedback','promptFeedback']]==[4,6,4])
    check('unmodified Hub bootstrap embedded',(ROOT/'hub/session.js').read_text() in artifact)
    check('required library versions pinned','three@0.180.0' in artifact and 'rapier3d-compat@0.19.3' in artifact)
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--no-sandbox','--disable-dev-shm-usage'])
        context=browser.new_context(viewport={'width':1440,'height':900})
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        load(page,False)
        check('primary renderer is native WebGPU',page.evaluate('__game.state.renderer==="webgpu"'))
        check('Rapier body present and game initialized',page.evaluate('__game.state.physics===1 && __game.state.mode==="title"'))
        page.keyboard.press('Enter');page.evaluate('__game.step(60)')
        check('keyboard starts expedition',page.evaluate('__game.state.mode==="playing"'))
        check('Rapier capsule settles on trail',page.evaluate('Math.abs(__game.state.position.y-.9)<.03'))
        # WebGL backend makes headless GPU behavior independent of screenshot capture.
        load(page,True)
        page.keyboard.press('Enter');page.evaluate('__game.step(70)')
        check('music defaults to ten percent',page.evaluate('__game.settings.music===.1 && __game.audio.musicVolume===.1'))
        page.evaluate('__game.input({x:1});__game.step(85);__game.input({x:0})')
        check('movement collects treasure through contact',page.evaluate('__game.state.treasures.includes(0) && __game.state.score===4000'))
        check('movement runs expected distance',page.evaluate('__game.state.position.x>11 && __game.state.position.x<15'))
        page.evaluate('__game.jump();__game.step(23)')
        check('buffered jump gains height',page.evaluate('__game.state.position.y>3 && __game.state.metrics.jumps===1'))
        page.evaluate('__game.step(60)')
        check('jump returns to trail',page.evaluate('__game.state.grounded && Math.abs(__game.state.position.y-.9)<.05'))
        page.keyboard.press('Escape');before=page.evaluate('__game.state.time');page.evaluate('__game.step(120)')
        check('pause freezes expedition clock',page.evaluate('__game.state.mode==="paused"') and page.evaluate('__game.state.time')==before)
        page.get_by_role('button',name='Expedition workshop').click()
        page.locator('[data-tuning="speed"]').evaluate('(e)=>{e.value="9";e.dispatchEvent(new Event("input",{bubbles:true}))}')
        check('live balance slider changes controller',page.evaluate('__game.tuning.speed===9'))
        page.get_by_role('button',name='Reset all tuning').click()
        check('balance reset restores defaults',page.evaluate('__game.tuning.speed===6.8 && __game.tuning.gravity===25'))
        page.get_by_role('button',name='Test the trail').click()
        check('developer tools resume game',page.evaluate('__game.state.mode==="playing"'))
        page.evaluate('__game.teleport(54);__game.step(5);__game.interact();__game.step(120)')
        check('ladder descends into underground route',page.evaluate('__game.state.position.y<-6 && !__game.state.climbing && __game.state.metrics.climbs>=1'))
        page.evaluate('__game.interact();__game.step(120);__game.step(20)')
        check('ladder exits onto solid surface',page.evaluate('__game.state.position.y>.85 && __game.state.grounded && !__game.state.climbing'))
        page.evaluate('__game.teleport(110);__game.step(1);window.phaseA=__game.state.quickClosed;__game.step(180)')
        check('quicksand opens and closes',page.evaluate('__game.state.quickClosed!==window.phaseA'))
        crocs=page.evaluate('(()=>{let seen=new Set();for(let i=0;i<300;i++){__game.step();seen.add(__game.getHazards().find(h=>h.type==="crocodile").open)}return seen.size})()')
        check('crocodile jaws have safe and dangerous phases',crocs==2)
        page.evaluate('__game.start();__game.teleport(27);__game.step(75)')
        check('hazard costs a life and respawns at checkpoint',page.evaluate('__game.state.lives===2 && __game.state.position.x<5 && __game.state.metrics.hits===1'))
        page.evaluate('__game.teleport(27);__game.step(75);__game.teleport(27);__game.step(75)')
        check('three lost lives end expedition',page.evaluate('__game.state.mode==="lost" && __game.state.panel==="lose"'))
        page.get_by_role('button',name='A word from the field guide').click();page.keyboard.press('Escape')
        check('nested result menu returns to result screen',page.evaluate('__game.state.panel==="lose"'))
        page.evaluate('__game.start();__game.teleport(267);__game.step(1)')
        check('gate requires all treasures',page.evaluate('__game.state.mode==="playing" && document.getElementById("toast").textContent.includes("12 treasures")'))
        page.evaluate('__game.start();__game.showTitle();__game.setManual(false);__game.setIdle(11)')
        page.wait_for_function('__game.state.mode==="attract"',timeout=10000)
        check('title inactivity launches scripted attract mode',page.evaluate('__game.state.mode==="attract"'))
        page.keyboard.press('Space')
        check('any input exits attract to title',page.evaluate('__game.state.mode==="title"'))
        page.evaluate('__game.setManual(true);__game.showPanel("about")')
        check('credits contain all mandatory sections',all(t in page.locator('#overlay').text_content() for t in ['Source Information','Testing Feedback','Engine Feedback','Prompt Feedback','added on import']))
        page.evaluate('__game.showTitle();__game.showPanel("settings")')
        page.locator('[data-setting="glyphs"]').select_option('xbox')
        check('Xbox glyph preference persists',page.evaluate('JSON.parse(localStorage.getItem("pit-perfect-settings")).glyphs==="xbox"'))
        page.locator('[data-setting="music"]').focus();page.keyboard.press('ArrowDown')
        check('keyboard navigates beyond sliders',page.evaluate('document.activeElement.dataset.setting==="sfx"'))
        page.evaluate('__game.showTitle()')
        page.evaluate('''window.__pad={connected:true,index:0,id:'Standard test pad',mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[window.__pad];window.__pad.buttons[0]={pressed:true,value:1};''')
        page.wait_for_function('__game.state.mode==="playing"',timeout=10000)
        page.evaluate('window.__pad.buttons[0]={pressed:false,value:0};window.__pad.axes[0]=1')
        page.wait_for_timeout(250);page.evaluate('__game.step(50)')
        check('standard Gamepad API starts and moves explorer',page.evaluate('__game.state.lastInput==="gamepad" && __game.state.position.x>7'))
        check('input prompts follow Xbox controller',page.evaluate('document.getElementById("controls").innerText.includes("A") && document.getElementById("controls").innerText.includes("X")'))
        page.evaluate('window.__pad.axes[0]=0;window.__pad.buttons[9]={pressed:true,value:1}')
        page.wait_for_function('__game.state.mode==="paused"',timeout=10000)
        check('Options pauses from controller',page.evaluate('__game.state.panel==="pause"'))
        page.evaluate('window.__pad=null;navigator.getGamepads=()=>[];__game.showTitle()')
        signal=page.evaluate('''async()=>{const c=new OfflineAudioContext(1,48000*2,48000);const a=new __game.audio.constructor({context:c});a.update(.016);a.effect('jump');a.effect('treasure');a.voice('swing');const b=await c.startRendering();const d=b.getChannelData(0);let sum=0,peak=0;for(const x of d){sum+=x*x;peak=Math.max(peak,Math.abs(x));}return{rms:Math.sqrt(sum/d.length),peak,voices:a.voices,notes:a.musicNotes}}''')
        check('procedural music effects and voice generate signal',signal['rms']>.001 and signal['voices']>0 and signal['notes']>0,str(signal))
        check('procedural audio remains unclipped',signal['peak']<1,str(signal))
        # Full route uses the same physical controller and contact collection as a player.
        if (ROOT/'playthrough.js').exists():
            result=page.evaluate((ROOT/'playthrough.js').read_text())
            (ROOT/'playthrough-result.json').write_text(json.dumps(result,indent=2))
            check('scripted whole expedition completes',result.get('pass',False),json.dumps(result)[-1800:])
            check('scripted route collects every treasure',len(result.get('state',{}).get('treasures',[]))==12)
            check('scripted route uses every vine',result.get('state',{}).get('metrics',{}).get('vineReleases',0)>=3)
            check('scripted route uses both tunnel routes',result.get('state',{}).get('metrics',{}).get('climbs',0)>=4)
            page.get_by_role('button',name='About this expedition').click();page.keyboard.press('Escape')
            check('victory credits return to victory screen',page.evaluate('__game.state.panel==="win"'))
        else: check('scripted whole expedition exists',False)
        peer=context.new_page();peer.goto(f'{base}/{ROOT.name}/hub/README.md')
        peer.add_script_tag(content=(ROOT/'network.js').read_text().replace('export class Network','window.Network=class Network',1))
        page.evaluate('__game.network.host("FINALCHECK")')
        peer.evaluate('window.peerEvents=[];window.net=new Network(e=>peerEvents.push(e));net.init();net.join("FINALCHECK")')
        page.wait_for_function('__game.network.state.connected')
        page.evaluate('__game.start();__game.collect(0);__game.step(10)')
        peer.wait_for_function('peerEvents.some(e=>e.type==="peer")')
        page.evaluate('__game.teleport(27);__game.step(75);__game.teleport(27);__game.step(75);__game.teleport(27);__game.step(75)')
        peer.wait_for_function('peerEvents.some(e=>e.type==="peer"&&e.snapshot.finished)',timeout=10000)
        check('standalone race transmits final score and finish',peer.evaluate('peerEvents.findLast(e=>e.type==="peer").snapshot.finished'))
        peer.evaluate('net.update({x:6,y:0,score:1234,treasures:1})')
        page.wait_for_function('!!__game.state.peer')
        page.evaluate('__game.network.leave()')
        check('leaving clears rival state and HUD',page.evaluate('__game.state.peer===null && document.getElementById("peer").classList.contains("hidden")'))
        peer.close()
        check('no uncaught game errors',not errors,'; '.join(errors))
        context.close()
        mobile=browser.new_context(viewport={'width':844,'height':390},has_touch=True,is_mobile=True,device_scale_factor=1)
        touch=mobile.new_page();load(touch,True)
        touch.get_by_role('button',name='Begin expedition').tap();touch.evaluate('__game.step(70)')
        check('touch starts same expedition',touch.evaluate('__game.state.mode==="playing" && __game.state.lastInput==="touch"'))
        cdp=mobile.new_cdp_session(touch)
        cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':100,'y':290,'id':11}]})
        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':170,'y':290,'id':11}]})
        touch.evaluate('__game.step(45)')
        check('invisible touch stick moves explorer',touch.evaluate('__game.state.position.x>6'))
        cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        touch.touchscreen.tap(700,270);touch.evaluate('__game.step(20)')
        check('touch tap jumps',touch.evaluate('__game.state.position.y>2 && __game.state.metrics.jumps>0'))
        check('touch has minimal persistent controls',touch.evaluate('getComputedStyle(document.getElementById("bottom-bar")).display==="none" && getComputedStyle(document.querySelector("#hud .region-block")).display==="none"'))
        mobile.close()
        direct=browser.new_page(viewport={'width':1280,'height':720})
        direct.goto((ROOT.parent/NAME).as_uri()+'?webgl=1',wait_until='domcontentloaded')
        direct.wait_for_function('window.__game?.ready || window.__gameError',timeout=120000)
        check('single HTML launches through file protocol',direct.evaluate('!!window.__game?.ready && !window.__gameError'))
        direct.close();browser.close()
except Exception:
    failures.append('suite exception: '+traceback.format_exc().replace('\n',' | '))
finally:
    # Network-specific tests and the official harness are part of this one command.
    env={**os.environ,'PIT_TEST_BASE_URL':base}
    for script in ['hub/network-test.py','hub/conformance-test.py']:
        (ROOT/'test-progress.json').write_text(json.dumps({'check':checks,'last':script,'elapsed':round(time.monotonic()-started,1)}))
        try:
            r=subprocess.run([os.sys.executable,str(ROOT/script)],cwd=ROOT,env=env,capture_output=True,text=True,timeout=300)
            summary=re.search(r'(\d+)/(\d+) .*checks passed',r.stdout)
            if summary:
                passed,total=map(int,summary.groups());checks+=total
                if passed!=total: failures.extend(line for line in r.stdout.splitlines() if line.startswith('FAIL:'))
            if r.returncode and not summary: failures.append(script+': '+r.stdout[-1200:]+r.stderr[-1800:])
        except Exception as error: failures.append(script+': '+str(error))
    server.shutdown();server.server_close()
(ROOT/'test-progress.json').write_text(json.dumps({'check':checks,'last':'complete','elapsed':round(time.monotonic()-started,1),'failures':len(failures)}))
for failure in failures: print('FAIL: '+failure)
print(f'{checks-len(failures)}/{checks} checks passed; {len(failures)} failures')
raise SystemExit(bool(failures))
