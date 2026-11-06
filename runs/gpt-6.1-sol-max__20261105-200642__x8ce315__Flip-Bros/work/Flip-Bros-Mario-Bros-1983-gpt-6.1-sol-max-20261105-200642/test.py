"""One command: ./test.sh. Only failures and one final count are printed."""
import argparse
import functools
import http.server
import json
import os
import threading
import time
from pathlib import Path
from urllib.parse import quote, urlparse
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
(ROOT/'.cache/tmp').mkdir(parents=True,exist_ok=True)
os.environ['TMPDIR']=str(ROOT/'.cache/tmp')
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{server.server_address[1]}'
parser=argparse.ArgumentParser();parser.add_argument('--section',default='all');args=parser.parse_args()
results=[];notes={};errors=[]
def check(name,fn):
 try:
  value=fn()
  if isinstance(value,dict) and 'ok' in value:
   assert value['ok'],json.dumps(value,ensure_ascii=False)
  else: assert value is not False,repr(value)
  results.append({'name':name,'pass':True});notes[name]=value if isinstance(value,(dict,list,str,int,float)) else True
 except Exception as e:
  msg=str(e);results.append({'name':name,'pass':False,'detail':msg});print(f'FAIL {name}: {msg[:1500]}',flush=True)
def jscheck(page,name,script): check(name,lambda:page.evaluate(script))
def route_deps(route):
 url=route.request.url;path=urlparse(url).path
 if path.startswith('/npm/three@0.180.0/'):
  local=ROOT/'node_modules/three'/path.split('/npm/three@0.180.0/')[1]
 elif path.startswith('/npm/@dimforge/rapier2d-compat@0.19.3/'):
  local=ROOT/'node_modules/@dimforge/rapier2d-compat'/path.split('/npm/@dimforge/rapier2d-compat@0.19.3/')[1]
 elif path.startswith('/npm/peerjs@1.5.5/'):
  local=ROOT/'node_modules/peerjs'/path.split('/npm/peerjs@1.5.5/')[1]
 else: route.continue_();return
 if local.is_file():route.fulfill(path=str(local),content_type='application/javascript',headers={'access-control-allow-origin':'*'})
 else:route.continue_()
def page_for(browser,query='renderer=webgl',context=None):
 context=context or browser.new_context(viewport={'width':1600,'height':900})
 context.route('https://cdn.jsdelivr.net/npm/**',route_deps)
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(BASE+'/index.html?test=1&'+query,wait_until='domcontentloaded');page.wait_for_selector('body[data-ready=true]',timeout=90000)
 assert page.title()=='Flip Bros — The Night Shift'
 return page,context
SETUP="""const t=__test,g=t.game;t.freeze();t.start();Object.assign(t.balance,{invincible:false,autoplay:false,enemyPace:1});g.queue=[];g.spawnClock=999;"""
def ui_test(page):
 page.evaluate('__test.freeze();__test.start();')
 page.keyboard.press('Escape');page.locator('[data-action=dev]').click()
 page.locator('#balance-speed').evaluate("e=>{e.value='10';e.dispatchEvent(new Event('input',{bubbles:true}));}")
 assert page.evaluate('__test.balance.speed')==10
 page.locator('[data-action=defaults]').click();assert page.evaluate('__test.balance.speed')==7.6
 page.locator('[data-action=back-dev]').click();page.locator('[data-action=settings]').click()
 assert page.locator('#prefs-music').input_value()=='0.1'
 page.locator('[data-action=back-settings]').click();page.locator('[data-action=resume]').click()
 assert page.evaluate('__test.ui().screenMode')=='playing'
 return True

def audio_test(page):
 result=page.evaluate("""async()=>{const ctx=new OfflineAudioContext(2,96000,48000),a=new __test.AudioEngine(ctx);for(const s of ['jump','bump','flip','kick','coin','hurt','dash','bell','clear','lose','menu'])a.sfx(s);a.voice('win');a.tick(true,1);const buffer=await ctx.startRendering();const d=buffer.getChannelData(0);let sum=0,peak=0,finite=true;for(let i=0;i<d.length;i++){sum+=d[i]*d[i];peak=Math.max(peak,Math.abs(d[i]));finite=finite&&Number.isFinite(d[i]);}return {ok:finite&&Math.sqrt(sum/d.length)>.005&&peak<=1,peak,rms:Math.sqrt(sum/d.length),events:a.events,music:a.musicVolume};}""")
 notes['audio']=result;return result

def about_test(page):
 page.evaluate('__test.showTitle()');page.locator('[data-action=about]').click()
 for action,title in [('source-info','SOURCE INFORMATION'),('testing-info','TESTING FEEDBACK'),('engine-info','ENGINE FEEDBACK'),('prompt-info','PROMPT FEEDBACK')]:
  page.locator('[data-action='+action+']').click();assert title in page.locator('#screen').inner_text()
  assert 'added on import' in page.locator('#screen').inner_text() if action=='source-info' else page.locator('.credits li').count()>0
  page.locator('[data-action=about]').click()
 page.locator('[data-action=title]').click();return True

def attract_test(page):
 page.evaluate('__test.freeze(false);__test.showTitle();__test.attract();')
 page.wait_for_function('__test.game.attract&&__test.game.time>0',timeout=15000)
 page.keyboard.press('r');page.wait_for_function("__test.ui().screenMode==='title'&&!__test.game.attract")
 page.evaluate('__test.freeze()');assert page.locator('#toast').is_hidden();return True

def controller_test(page):
 page.evaluate("""()=>{window.testPad={id:'Emulated DualSense',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[testPad];__test.showTitle();__test.freeze(false);}""")
 page.evaluate('testPad.buttons[0]={pressed:true,value:1}');page.wait_for_function("__test.ui().screenMode==='playing'")
 page.evaluate('testPad.buttons[0]={pressed:false,value:0};testPad.axes[0]=1')
 page.wait_for_function('__test.game.players[0].body.linvel().x>2')
 assert page.evaluate('__test.ui().lastInput')=='gamepad'
 assert '×' in page.locator('#controls').inner_text()
 page.evaluate('testPad.axes[0]=0;testPad.buttons[9]={pressed:true,value:1}')
 page.wait_for_function("__test.ui().screenMode==='pause'")
 page.evaluate('testPad.buttons[9]={pressed:false,value:0}')
 page.locator('[data-action=settings]').click();page.locator('[data-action=glyphs]').click();assert page.locator('[data-action=glyphs]').inner_text()=='Xbox'
 page.locator('[data-action=back-settings]').click();page.locator('[data-action=resume]').click()
 page.evaluate('testPad.axes[0]=.5');page.wait_for_function("__test.ui().lastInput==='gamepad'")
 assert 'A' in page.locator('#controls').inner_text()
 page.evaluate('testPad.axes[0]=0;__test.preferences.glyphs="ps";__test.freeze();__test.showTitle();navigator.getGamepads=()=>[]')
 return True

def touch_test(browser,pw):
 context=browser.new_context(**pw.devices['Pixel 7']);page,context=page_for(browser,context=context)
 page.locator('[data-action=solo]').tap();page.wait_for_timeout(400)
 before=page.evaluate('FlipBros.state().players[0]');page.evaluate('window.touchPeak=__test.game.players[0].y;window.touchSampler=setInterval(()=>touchPeak=Math.max(touchPeak,__test.game.players[0].y),10)');size=page.evaluate('({w:innerWidth,h:innerHeight})');w,h=size['w'],size['h']
 cdp=context.new_cdp_session(page)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':0,'x':65,'y':h*.73},{'id':1,'x':w*.67,'y':h*.64}]})
 cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'id':0,'x':115,'y':h*.73},{'id':1,'x':w*.67,'y':h*.64}]})
 page.wait_for_timeout(330);after=page.evaluate('FlipBros.state().players[0]')
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 peak=page.evaluate('touchPeak');page.evaluate('clearInterval(touchSampler)');assert after['x']>before['x']+.5 and peak>before['y']+.5,{'before':before,'after':after,'peak':peak}
 page.locator('#pause-btn').tap();assert page.evaluate('__test.ui().screenMode')=='pause'
 page.locator('[data-action=settings]').tap();assert page.locator('.panel').bounding_box()['width']<=w
 page.screenshot(path=str(ROOT/'verified-phone.png'));context.close();return True

def room_test(browser):
 page,context=page_for(browser);page.locator('[data-action=online]').click();page.locator('[data-action=host]').click()
 page.wait_for_selector('.roomcode');code=page.locator('.roomcode').inner_text()
 guest,_=page_for(browser,context=context);guest.locator('[data-action=online]').click();guest.locator('#room-code').fill(code);guest.locator('[data-action=join]').click()
 guest.wait_for_selector('.roomcode',timeout=15000);assert guest.locator('.roomcode').inner_text()==code
 page.wait_for_function('__test.net.members.length===2');page.locator('[data-action=room-start]').click()
 guest.wait_for_function('__test.net.started&&__test.game.players.length===2')
 guest.keyboard.down('d');guest.wait_for_function('__test.game.players.find(p=>p.id===__test.net.me).body.linvel().x>2');guest.keyboard.up('d')
 page.wait_for_function('__test.game.players.find(p=>p.id===1).body.translation().x>-2')
 assert abs(page.evaluate('__test.game.time')-guest.evaluate('__test.game.time'))<1
 page.evaluate('__test.game.finish(true)');guest.wait_for_function("__test.ui().screenMode==='result'")
 page.locator('[data-action=room-restart]').click();guest.wait_for_function("__test.game.status==='playing'&&__test.ui().screenMode==='playing'")
 guest.keyboard.press('Escape');guest.locator('[data-action=quit]').click();page.wait_for_function('__test.net.members.length===1')
 page.close();guest.close();context.close();return True




def metadata_test():
 r=json.loads((ROOT.parent/'exit-interview.json').read_text())
 assert set(r)=={'sourceInformation','testingFeedback','engineFeedback','promptFeedback','aiHub'}
 assert len(r['testingFeedback'])==4 and len(r['engineFeedback'])==6 and len(r['promptFeedback'])==4
 assert all(isinstance(x,str) and x for x in r['sourceInformation'].values())
 assert r['sourceInformation']['usage']=='added on import'
 assert r['aiHub']['name']=='Flip Bros' and 3<=len(r['aiHub']['tags'])<=6
 html=(ROOT/'index.html').read_text();client=(ROOT/'hub-session.js').read_text()
 assert '<script>'+client+'</script>' in html
 assert (ROOT.parent/'Flip-Bros-Mario-Bros-1983-gpt-6.1-sol-max-20261105-200642.html').read_text()==html
 return True

def controller_books_test(page):
 page.evaluate('__test.showTitle()');page.locator('[data-action=online]').click()
 page.evaluate("""()=>{window.testPad={id:'Emulated DualSense',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[testPad];}""")
 # Host is focused; select the code field then confirm it with a controller.
 page.evaluate('testPad.buttons[13]={pressed:true,value:1}');page.wait_for_function('__test.ui().menuFocus===1')
 page.evaluate('testPad.buttons[13]={pressed:false,value:0}');page.wait_for_timeout(100)
 page.evaluate('testPad.buttons[0]={pressed:true,value:1}');page.wait_for_function("__test.ui().screenMode==='code-entry'")
 page.evaluate('testPad.buttons[0]={pressed:false,value:0};testPad.buttons[12]={pressed:true,value:1}')
 page.wait_for_function("document.querySelector('[data-dial] strong').textContent!=='A'")
 page.evaluate('testPad.buttons[12]={pressed:false,value:0}');page.keyboard.type('PIPERS')
 assert page.evaluate('__test.ui().screenMode')=='code-entry'
 assert ''.join(page.locator('[data-dial] strong').all_inner_texts())=='PIPERS'
 page.keyboard.press('Escape');page.keyboard.press('Escape');page.locator('[data-action=about]').click();page.locator('[data-action=source-info]').click()
 assert page.locator('.panel').evaluate('e=>e.scrollTop')==0
 page.evaluate('testPad.buttons[13]={pressed:true,value:1}');page.wait_for_function('document.querySelector(".panel").scrollTop>0')
 page.evaluate('testPad.buttons[13]={pressed:false,value:0};navigator.getGamepads=()=>[];__test.showTitle()');return True

def file_test(browser):
 context=browser.new_context();context.route('https://cdn.jsdelivr.net/npm/**',route_deps);page=context.new_page()
 release=ROOT.parent/'Flip-Bros-Mario-Bros-1983-gpt-6.1-sol-max-20261105-200642.html'
 page.goto(release.as_uri()+'?test=1');page.wait_for_selector('body[data-ready=true]',timeout=90000)
 assert page.title()=='Flip Bros — The Night Shift';assert page.evaluate('FlipBros.backend')=='WebGPU'
 page.locator('[data-action=solo]').click();page.wait_for_function('__test.game.time>0');context.close();return True

def recovery_test(browser):
 page,context=page_for(browser,query='');page.evaluate('__test.renderer.backend.device.destroy()')
 page.wait_for_function("FlipBros.backend==='WebGL2 recovery'",timeout=15000)
 page.wait_for_function('__test.renderer.info.render.drawCalls>100')
 page.locator('[data-action=solo]').click();page.wait_for_function('__test.game.time>0')
 r={'ok':page.evaluate('!window.__graphicsError'),'backend':page.evaluate('FlipBros.backend')};context.close();return r

def webrtc_test(browser):
 page,host_context=page_for(browser);page.locator('[data-action=online]').click();page.locator('[data-action=host]').click()
 page.wait_for_function('__test.net.peer?.open===true',timeout=35000);code=page.locator('.roomcode').inner_text()
 guest,guest_context=page_for(browser);guest.locator('[data-action=online]').click();guest.locator('#room-code').fill(code);guest.locator('[data-action=join]').click()
 guest.wait_for_selector('.roomcode',timeout=25000);page.wait_for_function('__test.net.members.length===2')
 assert page.evaluate('[...__test.net.channels.values()].some(c=>c.peer?.open)')
 page.locator('[data-action=room-start]').click();guest.wait_for_function('__test.net.started&&__test.game.players.length===2')
 guest.keyboard.down('d');page.wait_for_function('__test.game.players.find(p=>p.id===1)?.body.linvel().x>2');guest.keyboard.up('d')
 host_context.close();guest_context.close();return True

def hub_test(browser,n,scenario,impaired):
 context=browser.new_context(viewport={'width':1600,'height':900});context.route('https://cdn.jsdelivr.net/npm/**',route_deps);page=context.new_page()
 url=BASE+'/harness.html?game='+quote('index.html',safe='')+f'&players={n}&scenario={scenario}&auto=1&play=3000'
 if impaired:url+='&latency=150&jitter=50&loss=5'
 page.goto(url);page.wait_for_function('window.__hubCheck?.done===true',timeout=150000)
 report=page.evaluate('__hubCheck');notes['hub-'+str(n)+'-'+scenario]=report
 context.close();return {'ok':report['pass'],'failed':[c for c in report['checks'] if not c['pass']]}

def gpu_test(browser):
 page,context=page_for(browser,query='')
 page.wait_for_timeout(1500)
 r=page.evaluate("""async()=>{const r=__test.renderer;const device=await Promise.race([r.backend.device?.lost.then(x=>x.reason),new Promise(resolve=>setTimeout(()=>resolve('alive'),250))]);const target=new __test.THREE.RenderTarget(64,64);r.setRenderTarget(target);await r.renderAsync(__test.scene,__test.camera);const pixels=await r.readRenderTargetPixelsAsync(target,0,0,64,64);r.setRenderTarget(null);target.dispose();const colors=new Set();for(let i=0;i<pixels.length;i+=4)colors.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);return {ok:FlipBros.backend==='WebGPU'&&device==='alive'&&colors.size>12,initial:FlipBros.initialBackend,backend:FlipBros.backend,draws:r.info.render.drawCalls,device,colors:colors.size,error:window.__graphicsError||null};}""")
 notes['graphics']=r;page.screenshot(path=str(ROOT/'verified-default.png'));context.close();return r

try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--use-angle=vulkan','--use-vulkan=swiftshader','--enable-features=Vulkan','--disable-vulkan-surface','--disable-gpu-watchdog'])
  if args.section=='gpu-probes':
   matrix=[['--enable-unsafe-webgpu','--use-angle=swiftshader-webgl','--use-webgpu-adapter=swiftshader'],['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-dawn-features=allow_unsafe_apis','--disable-gpu-sandbox'],['--enable-unsafe-webgpu','--use-angle=vulkan','--use-vulkan=swiftshader','--enable-features=Vulkan','--disable-vulkan-surface'],['--enable-unsafe-webgpu','--use-angle=swiftshader','--use-dawn=swiftshader','--disable-gpu-sandbox'],['--enable-unsafe-webgpu','--no-sandbox','--disable-gpu-sandbox','--use-angle=swiftshader']]
   for flags in matrix:
    def run_probe(flags=flags):
     b=pw.chromium.launch(headless=True,args=flags);c=b.new_context();c.route('https://cdn.jsdelivr.net/npm/**',route_deps);p=c.new_page();logs=[];p.on('console',lambda m:logs.append([m.type,m.text]));p.goto(BASE+'/gpu-probe.html');p.wait_for_selector('body[data-ready=true]',timeout=30000)
     r=p.evaluate("""async()=>({device:await Promise.race([renderer.backend.device.lost.then(x=>({reason:x.reason,message:x.message})),new Promise(r=>setTimeout(()=>r('alive'),500))]),adapter:await navigator.gpu.requestAdapter().then(a=>a?.info),gl:!!document.createElement('canvas').getContext('webgl2')})""")
     b.close();return {'ok':r['device']=='alive','state':r,'logs':logs}
    check('GPU probe '+' '.join(flags),run_probe)
  if args.section in ['all','core']:
   page,ctx=page_for(browser)
   jscheck(page,'release metadata and default music',"""()=>({ok:document.querySelector('meta[name="hub:session-mode"]').content==='shared-world'&&__test.preferences.music===.1&&FlipBros.title==='Flip Bros',music:__test.preferences.music})""")
   jscheck(page,'Rapier ground contact and movement',"""()=>{const t=__test;t.freeze();t.start();t.advance(60);const a=t.game.players[0].body.translation();t.advance(30,{0:{x:1}});const b=t.game.players[0].body.translation();return {ok:b.x-a.x>2.5&&Math.abs(b.y-a.y)<.1,a,b};}""")
   jscheck(page,'head bump flips an enemy through a platform',"()=>{"+SETUP+"const e=g.spawnEnemy('crab',-5,4.63);e.speed=0;g.players[0].body.setTranslation({x:-5,y:1.09},true);t.advance(8);t.advance(22,{0:{jump:true}});return {ok:e.stun>0&&g.metrics.bumps>0&&g.metrics.flips===1,state:g.snapshot()};}")
   jscheck(page,'jump through gap, land upstairs, and auto-kick',"""()=>{const t=__test,g=t.game; t.advance(26,{0:{x:1}});t.advance(5);const start=g.players[0].body.translation();t.advance(24,{0:{jump:true}});t.advance(38,{0:{x:-1,jump:true}});return {ok:g.metrics.kicks===1&&g.score>=200,start,state:g.snapshot()};}""")
   jscheck(page,'hard hat takes two separate bumps',"()=>{"+SETUP+"const e=g.spawnEnemy('armored',-5,4.63);e.speed=0;g.players[0].body.setTranslation({x:-5,y:1.09},true);t.advance(8);t.advance(22,{0:{jump:true}});const first=e.armor===0&&e.stun===0;t.advance(65);t.advance(22,{0:{jump:true}});return {ok:first&&e.stun>0,first,state:g.snapshot()};}")
   jscheck(page,'flipped pests recover on timer',"()=>{"+SETUP+"const e=g.spawnEnemy('crab',-5,4.63);e.speed=0;g.flip(e,g.players[0]);t.advance(450);return {ok:e.stun===0,stun:e.stun};}")
   jscheck(page,'bell charges and empty bell',"()=>{"+SETUP+"const e=g.spawnEnemy('crab',-5,4.63);e.speed=0;for(let i=0;i<4;i++){t.advance(1,{0:{bell:true}});t.advance(80);}return {ok:g.charges===0&&g.metrics.bells===3,charges:g.charges,bells:g.metrics.bells};}")
   jscheck(page,'physical bell block works from underneath',"()=>{"+SETUP+"g.spawnEnemy('crab',-5,4.63);g.players[0].body.setTranslation({x:0,y:1.09},true);t.advance(8);t.advance(15,{0:{jump:true}});return {ok:g.metrics.bells===1&&g.charges===2,state:g.snapshot()};}")
   jscheck(page,'dash protects and hurt invulnerability prevents rapid deaths',"()=>{"+SETUP+"const e=g.spawnEnemy('crab',-4,1.03);e.speed=0;const p=g.players[0];p.inv=0;const lives=g.lives;t.advance(1,{0:{dash:true}});const safe=g.lives===lives;t.advance(16);p.body.setTranslation({x:e.x,y:e.y},true);p.body.setLinvel({x:0,y:0},true);t.advance(1);const hurt=g.lives===lives-1;const before=g.lives;t.advance(20);return {ok:safe&&hurt&&g.lives===before,safe,hurt,lives:g.lives};}")
   jscheck(page,'side wrap and pipe recycling',"()=>{"+SETUP+"const e=g.spawnEnemy('crab',14,1.03);g.players[0].body.setTranslation({x:15.4,y:1.09},true);t.advance(2);return {ok:g.players[0].x<0&&e.y>10,state:g.snapshot()};}")
   jscheck(page,'hopper jumps and frost crab leaves ice',"()=>{"+SETUP+"const e=g.spawnEnemy('hopper',-7,4.63);e.speed=0;e.hop=0;const ice=g.spawnEnemy('frost',7,4.63);ice.speed=0;ice.iceClock=0;t.advance(8);return {ok:e.body.linvel().y>0&&g.ice.length>0,vy:e.body.linvel().y,ice:g.ice.length};}")
   jscheck(page,'late-shift sparks become active hazards',"()=>{"+SETUP+"g.startShift(3,false);g.stageTime=13;t.advance(1);return {ok:g.sparks.length===1,number:g.sparks.length};}")
   jscheck(page,'coin collection and chained kick scoring',"()=>{"+SETUP+"const p=g.players[0];p.inv=3;g.coin(p.x,p.y,0,true);for(const x of [-4.25,-3.75]){const e=g.spawnEnemy('crab',x,1.03);e.stun=5;}t.advance(2);return {ok:g.metrics.kicks===2&&g.combo===2&&g.score>=650&&g.metrics.coins>=1,state:g.snapshot()};}")
   jscheck(page,'boss requires three real contacts while flipped',"()=>{"+SETUP+"g.phase=4;const e=g.spawnEnemy('boss',0,8.78);e.speed=0;const p=g.players[0];p.inv=999;const hp=[];for(let i=0;i<3;i++){t.advance(160);g.flip(e,p);p.body.setTranslation({x:e.x-.9,y:e.y},true);p.body.setLinvel({x:0,y:0},true);t.advance(1);hp.push(e.hp);p.body.setTranslation({x:-4,y:1.09},true);}return {ok:hp.join(',')==='2,1,1'&&g.status==='won'&&g.metrics.kicks===3,hp,state:g.snapshot()};}")
   jscheck(page,'whole game autoplay visits all shifts and payday then wins',"""()=>{const t=__test,g=t.game;t.start();t.balance.autoplay=true;t.balance.invincible=true;const visited=new Set(),types=new Set();let frames=0;while(!['won','lost'].includes(g.status)&&frames<54000){g.step(1/60,{});if(frames%30===0){visited.add(g.bonus?'payday':String(g.phase));for(const e of g.enemies)types.add(e.type);}if(frames%10===0){for(const p of document.querySelectorAll('.floater'))p.remove();}frames++;}t.balance.autoplay=false;t.balance.invincible=false;return {ok:g.status==='won'&&['1','2','3','4','payday'].every(x=>visited.has(x))&&types.size===5,frames,visited:[...visited],types:[...types],state:g.snapshot()};}""")
   jscheck(page,'two-bot attract replay clears the whole game within its loop',"""()=>{const t=__test,g=t.game;t.freeze();t.balance.autoplay=false;g.reset([{id:0,name:'Axle'},{id:1,name:'Rivet'}],true);const phases=new Set();let frames=0;while(g.status!=='won'&&frames<5700){g.step(1/60,{});phases.add(g.bonus?'payday':String(g.phase));frames++;}g.attract=false;return {ok:g.status==='won'&&phases.size===5,frames,phases:[...phases],state:g.snapshot()};}""")
   # State results above remain inspectable in the JSON report if a mechanic fails.
   check('keyboard pause, settings, live developer sliders, and reset',lambda: ui_test(page))
   check('procedural music, effects, and voices render audible finite audio',lambda:audio_test(page))
   check('all About sections contain required information',lambda:about_test(page))
   check('ten-second attract mode loops and any input exits without starting',lambda:attract_test(page))
   check('controller menu, gameplay input, glyph switching, and pause',lambda:controller_test(page))
   check('controller room-code editing and scrolling credits',lambda:controller_books_test(page))
   page.screenshot(path=str(ROOT/'verified-title.png'))
   check('no uncaught browser errors in core flow',lambda: {'ok':not errors,'errors':errors})
   ctx.close()
  if args.section in ['all','touch']:
   check('phone multitouch movement, jumping, and usable menus',lambda:touch_test(browser,pw))
  if args.section in ['all','rooms']:
   check('standalone room join, start, remote input, state sync, restart and leave',lambda:room_test(browser))
  if args.section in ['all','webrtc']:
   check('standalone WebRTC co-op across separate browser contexts',lambda:webrtc_test(browser))
  if args.section in ['all','hub']:
   for players,scenario,network in [(2,'standard',False),(4,'standard',True),(4,'host-leave',True),(2,'server',False)]:
    check(f'AI Hub {players} players / {scenario} / impaired={network}',lambda n=players,s=scenario,k=network:hub_test(browser,n,s,k))
  if args.section in ['all','gpu']:
   check('native WebGPU draws a varied stage and its device stays alive',lambda:gpu_test(browser))
  if args.section in ['all','metadata']:
   check('exit interview schema, metadata, and unmodified Hub client',metadata_test)
  if args.section in ['all','file']:
   check('single release HTML launches and plays from file protocol',lambda:file_test(browser))
  if args.section in ['all','recovery']:
   check('live WebGPU device loss recovers into playable WebGL2',lambda:recovery_test(browser))
  browser.close()
except Exception as error:
 results.append({'name':'test setup or execution','pass':False,'detail':str(error)});print('FAIL test setup or execution: '+str(error)[:1500],flush=True)
finally:
 server.shutdown();server.server_close()
 (ROOT/'test-report.json').write_text(json.dumps({'results':results,'notes':notes},indent=2,ensure_ascii=False))
 failures=sum(not r['pass'] for r in results)
 print(f'{len(results)-failures}/{len(results)} checks passed; {failures} failures')
 raise SystemExit(bool(failures))
