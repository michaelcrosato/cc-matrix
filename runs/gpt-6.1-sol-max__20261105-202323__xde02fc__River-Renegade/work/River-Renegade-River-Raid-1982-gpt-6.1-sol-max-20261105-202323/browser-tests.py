from playwright.sync_api import sync_playwright
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
import threading,json,traceback,urllib.request
base=Path(__file__).resolve().parent
checks=[];failures=[];hub_reports=[];errors=[];details={}
def check(name,passed,detail=''):
 checks.append({'name':name,'pass':bool(passed),'detail':str(detail)})
 (base/'browser-progress.json').write_text(json.dumps({'last':name,'passed':bool(passed),'checks':len(checks)}))
 if not passed: failures.append(name+(': '+str(detail) if detail else ''))
def pad_script():
 return '''window.testPad={id:'Simulated standard DualSense',index:0,connected:true,mapping:'standard',timestamp:1,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[window.testPad];'''
def press_pad(page,index):
 page.evaluate('(i)=>new Promise(resolve=>{testPad.buttons[i]={pressed:true,value:1};requestAnimationFrame(resolve)})',index)
 page.evaluate('(i)=>new Promise(resolve=>{testPad.buttons[i]={pressed:false,value:0};requestAnimationFrame(resolve)})',index)
def load(page,suffix='?test=1'):
 page.goto((base/'index.html').as_uri()+suffix,wait_until='load',timeout=120000)
 page.wait_for_function('window.__game && document.body.dataset.ready==="true"',timeout=120000)
 page.wait_for_function('__game.graphics.drawCalls>0 && !__game.graphics.recovering',timeout=30000)
def set_range(page,id,value):
 page.locator('#'+id).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}))}',value)
class QuietHandler(SimpleHTTPRequestHandler):
 def log_message(self,*a): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(base)));thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();url='http://127.0.0.1:'+str(server.server_port)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--use-angle=swiftshader','--no-sandbox'])
  ctx=browser.new_context(viewport={'width':1280,'height':720},device_scale_factor=1)
  ctx.add_init_script(pad_script());page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  load(page)
  check('single HTML boots from file URL',page.evaluate('__game.screen==="title" && document.title.startsWith("River Renegade")'))
  check('native WebGPU executes scene draws',page.evaluate('__game.graphics.backend==="WebGPU" && __game.graphics.drawCalls>100 && __game.graphics.triangles>0'),page.evaluate('__game.graphics'))
  check('native animation mixers are active',page.evaluate('__game.graphics.animations>=2'))
  check('music defaults to ten percent',page.evaluate('__game.settings.music===0.1'))
  page.keyboard.press('Enter');check('keyboard opens sortie brief',page.evaluate('__game.screen==="brief"'))
  page.keyboard.press('Enter');check('keyboard launches the flight',page.evaluate('__game.screen==="play"'))
  page.wait_for_timeout(2500);page.evaluate('__game.freeze(false)');before=page.evaluate('__game.state.players[0].x');page.keyboard.down('KeyD');page.keyboard.down('KeyW');page.keyboard.down('Space');page.wait_for_timeout(750);page.keyboard.up('KeyD');page.keyboard.up('KeyW');page.keyboard.up('Space')
  check('keyboard steers, accelerates and fires',page.evaluate('(before)=>__game.state.players[0].x>before && __game.state.metrics.shots>0 && __game.state.lastSpeed>17',before),page.evaluate('({x:__game.state.players[0].x,speed:__game.state.lastSpeed,shots:__game.state.metrics.shots})'))
  page.keyboard.press('Escape');t=page.evaluate('__game.state.time');page.wait_for_timeout(250);check('pause freezes a standalone world',page.evaluate('__game.screen==="pause" && __game.state.time===%s'%t))
  page.get_by_role('button',name='Flight deck').click();check('developer tools open from pause',page.evaluate('__game.screen==="dev"'))
  set_range(page,'dev-speed',29);set_range(page,'dev-damage',.5);check('live developer sliders change simulation rules',page.evaluate('__game.simulation.tuning.speed===29 && __game.simulation.tuning.damage===0.5'))
  page.get_by_role('button',name='Reset defaults').click();check('reset restores gameplay defaults',page.evaluate('__game.simulation.tuning.speed===17 && __game.simulation.tuning.damage===1'))
  page.get_by_role('button',name='Invulnerable',exact=True).click();page.get_by_role('button',name='Infinite fuel',exact=True).click();check('developer test toggles work',page.evaluate('__game.simulation.god && __game.simulation.noFuel'))
  page.get_by_role('button',name='Final blockade',exact=True).click();check('sector warp preserves cleared-bridge progress',page.evaluate('__game.state.progress===2680 && __game.state.bridges===3'))
  page.get_by_role('button',name='Resume sortie').click();page.evaluate('__game.freeze(true)');page.wait_for_timeout(300);check('boss encounter exposes turret objectives',page.locator('#bossbar').is_visible() and 'TURRETS' in page.locator('#bossname').inner_text())
  page.evaluate('__game.simulation.autopilot=true;__game.step(3000)');check('scripted boss flight reaches victory UI',page.evaluate('__game.state.won && __game.screen==="result"'),page.evaluate('({progress:__game.state.progress,boss:__game.state.bossDead,screen:__game.screen})'))
  page.get_by_role('button',name='Return to title').click();page.get_by_role('button',name='Fly with a wingmate').click();page.get_by_role('button',name='Take off').click();page.wait_for_timeout(2500);page.evaluate('__game.freeze(false)');before=page.evaluate('__game.state.players.map(p=>p.x)');page.keyboard.down('KeyA');page.keyboard.down('ArrowRight');page.wait_for_timeout(450);page.keyboard.up('KeyA');page.keyboard.up('ArrowRight');after=page.evaluate('__game.state.players.map(p=>p.x)');check('two local pilots accept independent keyboard controls',len(after)==2 and after[0]<before[0] and after[1]>before[1],{'before':before,'after':after})
  page.evaluate('__game.freeze(true);__game.action("quit")');press_pad(page,0);check('standard controller confirms a menu choice',page.evaluate('__game.screen==="brief"'))
  press_pad(page,0);page.wait_for_timeout(2500);page.evaluate('__game.freeze(false);testPad.axes[0]=0.6;testPad.buttons[7]={pressed:true,value:1}');x=page.evaluate('__game.state.players[0].x');page.wait_for_timeout(450);page.evaluate('testPad.axes[0]=0;testPad.buttons[7]={pressed:false,value:0}');check('standard controller steers and fires',page.evaluate('(x)=>__game.state.players[0].x>x && __game.state.metrics.shots>0',x))
  press_pad(page,9);check('Options opens pause',page.evaluate('__game.screen==="pause"'));press_pad(page,13);press_pad(page,0);check('controller focus reaches developer tools',page.evaluate('__game.screen==="dev"'))
  press_pad(page,1);check('Circle returns to pause',page.evaluate('__game.screen==="pause"'))
  page.get_by_role('button',name='Settings',exact=True).click();page.get_by_role('button',name='PlayStation',exact=True).click();page.evaluate('testPad.axes[0]=0.2');page.wait_for_timeout(100);page.evaluate('testPad.axes[0]=0');check('controller glyph setting switches to Xbox',page.evaluate('__game.settings.glyphs==="xbox"'))
  page.evaluate('__game.action("quit");__game.setIdle(11000)');page.wait_for_function('__game.screen==="attract"',timeout=5000);check('title idle starts a protected AI attract flight',page.evaluate('__game.simulation.god && __game.simulation.autopilot && __game.state.players.length===2'))
  page.evaluate('testPad.axes[0]=0.8');page.wait_for_function('__game.screen==="title"',timeout=5000);page.evaluate('testPad.axes[0]=0');check('any controller input exits attract and restores tuning',page.evaluate('__game.simulation.tuning.speed===17'))
  page.get_by_role('button',name='Settings',exact=True).click();set_range(page,'music',10);set_range(page,'sfx',70);page.get_by_role('button',name='Back').click()
  page.get_by_role('button',name='Fly solo').click();page.get_by_role('button',name='Take off').click();page.evaluate('__game.sound.sfx("pulse");__game.sound.gibberish(4)');page.wait_for_timeout(140);levels=page.evaluate('__game.sound.levels()');check('generated effects and gibberish produce audio signal',levels['ready'] and levels['events']>7 and levels['rms']>0,levels);off=page.evaluate('__game.sound.offlineCheck()');check('offline synthesizer output is nonzero and unclipped',0<off['rms']<.4 and off['peak']<=1,off)
  page.evaluate('__game.action("quit");__game.action("about")');check('all required credit sections are present',page.locator('.credits-tabs button').count()==6)
  for i in range(6):
   page.locator('[data-action="about-'+str(i)+'"]').click();check('credit page '+str(i+1)+' has recorded content',len(page.locator('.modal').inner_text())>120)
  page.evaluate('__game.action("quit");__game.testDeviceLoss()');page.wait_for_function('__game.graphics.recovered && !__game.graphics.recovering && __game.graphics.drawCalls>100 && __game.graphics.triangles>0',timeout=20000);check('device loss restores the scene through WebGL 2',page.evaluate('__game.graphics.backend.includes("recovery") && __game.graphics.drawCalls>0'),page.evaluate('__game.graphics'))
  check('desktop has no uncaught errors',not errors,errors)
  page.goto((base/'index.html').as_uri()+'?test=1&webgl=1',timeout=120000);page.wait_for_function('window.__game && __game.graphics.drawCalls>0',timeout=30000);page.set_viewport_size({'width':1920,'height':1080});page.wait_for_timeout(300);page.screenshot(path=str(base/'title-reviewed.png'));page.evaluate('__game.start(1);__game.warp(1080)');page.wait_for_timeout(300);page.screenshot(path=str(base/'copper-reviewed.png'));page.evaluate('__game.warp(2721)');page.wait_for_timeout(300);page.screenshot(path=str(base/'boss-reviewed.png'));details['desktopGraphics']=page.evaluate('__game.graphics')
  ctx.close()
  mobile=browser.new_context(**p.devices['iPhone 13']);mp=mobile.new_page();mp.on('pageerror',lambda e:errors.append('touch: '+str(e)));load(mp)
  fits=mp.locator('.title-actions').evaluate('(e)=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.right<=innerWidth}')
  check('phone title has reachable actions and no horizontal overflow',fits and mp.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  mp.get_by_role('button',name='Fly solo').tap();mp.get_by_role('button',name='Take off').tap();mp.wait_for_timeout(2500);mp.evaluate('__game.freeze(false)');x=mp.evaluate('__game.state.players[0].x');cdp=mobile.new_cdp_session(mp);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':60,'y':520,'id':1}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':110,'y':480,'id':1}]});mp.wait_for_timeout(500);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});check('invisible touch stick steers and assisted guns fire',mp.evaluate('(x)=>__game.state.players[0].x>x && __game.state.metrics.shots>0',x));mp.locator('#touchpulse').tap();mp.wait_for_timeout(80);check('contact pulse action works on touch',mp.evaluate('__game.state.metrics.pulses>0'))
  mp.evaluate('__game.freeze(true);__game.warp(150);const p=__game.simulation.players[0];const f=__game.simulation.entities.find(e=>e.type==="fuel");p.x=f.x;p.fuel=30;__game.freeze(false)');mp.touchscreen.tap(120,550);mp.wait_for_timeout(400);check('touch assistance preserves nearby fuel docks and refills',mp.evaluate('__game.state.metrics.refueled>0 && __game.state.entities.find(e=>e.type==="fuel")?.hp===4'),mp.evaluate('({refuel:__game.state.metrics.refueled,fuel:__game.state.players[0].fuel})'))
  mp.evaluate('__game.freeze(true)');mp.goto((base/'index.html').as_uri()+'?test=1&webgl=1',timeout=120000);mp.wait_for_function('window.__game && __game.graphics.drawCalls>0',timeout=30000);mp.evaluate('__game.start(1);__game.warp(150)');mp.wait_for_timeout(600);mp.screenshot(path=str(base/'touch-reviewed.png'));mobile.close()
  check('test server serves this game',b'<title>River Renegade' in urllib.request.urlopen(url+'/index.html').read())
  for scenario,n in [('standard',2),('standard',4),('host-leave',4),('server',2)]:
   hc=browser.new_context(viewport={'width':1200,'height':800});hp=hc.new_page();hp.on('pageerror',lambda e:errors.append('hub: '+str(e)))
   params=f'?game=index.html&players={n}&auto=1&latency=150&jitter=50&loss=5&scenario={scenario}'
   hp.goto(url+'/harness.html'+params,wait_until='load',timeout=120000)
   try:hp.wait_for_function('document.body.dataset.complete==="true"',timeout=90000)
   except Exception as e:failures.append('Hub harness timed out '+scenario+' '+str(n)+': '+str(e))
   report=hp.evaluate('window.__hubCheck||{}');hub_reports.append(report)
   for c in report.get('checks',[]):check(f'Hub {n}p {scenario}: '+c['name'],c['pass'],c.get('detail',''))
   if not report.get('checks'):check(f'Hub {n}p {scenario}: report exists',False,report)
   if scenario=='standard' and n==2:
    states=[]
    for f in hp.frames[1:]:
     try:states.append(f.evaluate('({screen:__game.screen,ended:__game.hub.ended,bytes:__game.hub.lastNetBytes,players:__game.state.players.length,score:__game.state.score,progress:__game.state.progress})'))
     except:pass
    details['hub2FinalStates']=states;check('Hub stops every copy on end',len(states)==2 and all(v['ended'] and v['screen']=='hubend' for v in states),states);check('host snapshots fit protocol limit',any(v['bytes']>0 for v in states) and all(v['bytes']<=16384 for v in states),states)
   hc.close()
  browser.close()
except Exception:
 failures.append('Browser suite exception: '+traceback.format_exc())
finally:
 server.shutdown();server.server_close()
print(json.dumps({'checks':checks,'failures':failures,'hubReports':hub_reports,'errors':errors,'details':details}))
