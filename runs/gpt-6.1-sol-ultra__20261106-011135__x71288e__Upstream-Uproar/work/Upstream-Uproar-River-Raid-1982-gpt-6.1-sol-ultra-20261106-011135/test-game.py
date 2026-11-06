"""One-command state, input, audio, mission and official Hub protocol tests."""
import functools
import http.server
import importlib.util
import json
import threading
import os
import traceback
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('hub_check',ROOT/'hub-check.py')
hub=importlib.util.module_from_spec(spec);spec.loader.exec_module(hub)
class QuietHandler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT.parent)))
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
base=f'http://127.0.0.1:{server.server_port}/'
game=ROOT.name+'.html'
passed=0;failures=[];mission=[]
def check(name,condition,detail=''):
 global passed
 if condition:passed+=1
 else:failures.append(f'{name}: {detail}')
def snap(page):return page.evaluate('window.__UPROAR__.snapshot()')
def js(page,code):return page.evaluate(code)
def start(page,options='{}'):js(page,'window.__UPROAR__.start('+options+')')
def step(page,seconds):return js(page,f'window.__UPROAR__.step({seconds})')
def ready(page,url):
 page.goto(url,wait_until='domcontentloaded',timeout=60000)
 page.wait_for_function('window.__UPROAR__?.diagnostics.ready',timeout=60000)
 page.wait_for_function('window.__UPROAR__.state!=="loading"')

def main_tests(browser,p):
 errors=[]
 context=browser.new_context(viewport={'width':1440,'height':900},device_scale_factor=1)
 page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 ready(page,base+game+'?test=1')
 check('served identity','Upstream Uproar' in page.title())
 check('WebGPU boot',js(page,'window.__UPROAR__.diagnostics.renderer')=='WebGPU')
 check('Rapier pinned version',js(page,'window.__UPROAR__.diagnostics.physics')=='0.19.3')
 check('default music volume',snap(page)['settings']['music']==.1)
 check('title initial state',snap(page)['state']=='title')
 before=js(page,'document.activeElement.dataset.action');page.keyboard.press('Tab');after=js(page,'document.activeElement.dataset.action')
 check('native menu Tab',before!=after)
 js(page,'window.__UPROAR__.setAttractIdle()');page.wait_for_function('window.__UPROAR__.snapshot().attract')
 check('10-second attract mode',snap(page)['attract'])
 page.keyboard.press('KeyZ');check('any input exits attract',snap(page)['state']=='title' and not snap(page)['attract'])
 page.get_by_role('button',name='Fly the river').click();js(page,'window.__UPROAR__.god(true)')
 page.keyboard.down('KeyD');s=step(page,.4);page.keyboard.up('KeyD')
 check('keyboard steering',s['players'][0]['x']>3)
 check('automatic river progression',s['progress']>4)
 page.keyboard.down('Space');s=step(page,1);page.keyboard.up('Space');check('keyboard cannon',s['shots']>=6)
 page.wait_for_timeout(550)
 a=js(page,'window.__UPROAR__.diagnostics.audio')
 check('audio running after gesture',a['state']=='running',str(a))
 check('synthesized notes',a['notes']>0,str(a))
 check('audio signal nonzero',a['rms']>0,str(a))
 js(page,'window.__UPROAR__.warp(80);window.__UPROAR__.god(true);window.__UPROAR__.setTuning("speed",0)');step(page,.01)
 js(page,'{let e=window.__UPROAR__.snapshot().entities.find(e=>e.type==="boat");window.__UPROAR__.setPlayer(e.x)}')
 page.keyboard.down('Space');s=step(page,2);page.keyboard.up('Space')
 check('Rapier projectile contact kills',s['kills']>=1 and s['score']>=150,str(s))
 check('physics collision events',s['stats']['collisions']>0)
 js(page,'window.__UPROAR__.setTuning("speed",16);window.__UPROAR__.warp(170);window.__UPROAR__.setFuel(35);window.__UPROAR__.setHull(3);window.__UPROAR__.god(true)');step(page,.01)
 js(page,'{let e=window.__UPROAR__.snapshot().entities.find(e=>e.type==="fuel");window.__UPROAR__.setPlayer(e.x)}');s=step(page,.7)
 check('fuel barge overflight',s['refuels']==1 and s['fuel']>40,str(s))
 check('fuel barge hull repair',s['hull']==4)
 start(page);js(page,'window.__UPROAR__.god(false);{const r=window.__UPROAR__.river(0);window.__UPROAR__.setPlayer(r.center+r.width+1)}');s=step(page,.1)
 check('bank collision damage',s['hull']==3,str(s))
 js(page,'window.__UPROAR__.setPlayer(window.__UPROAR__.river(window.__UPROAR__.snapshot().progress).center);window.__UPROAR__.roll();window.__UPROAR__.hurt()');s=snap(page)
 check('barrel roll invulnerability',s['hull']==3 and s['rolls']==1 and s['players'][0]['rollCooldown']>4)
 start(page);js(page,'window.__UPROAR__.god(false);window.__UPROAR__.setHull(1);window.__UPROAR__.setFuel(0);window.__UPROAR__.setPlayer(0)');s=step(page,.1)
 check('fuel death respawn recovery',s['lives']==2 and s['fuel']>80 and s['hull']==4,str(s))
 js(page,'window.__UPROAR__.warp(760);window.__UPROAR__.god(true)');s=step(page,8)
 check('bridge blockade cannot be bypassed',s['progress']<770 and s['bridges']==0,str(s))
 js(page,'{let e=window.__UPROAR__.snapshot().entities.find(e=>e.type==="bridge");window.__UPROAR__.setPlayer(e.x)}')
 page.keyboard.down('Space');s=step(page,4);page.keyboard.up('Space')
 check('bridge destruction checkpoint',s['bridges']==1 and s['checkpoint']==800,str(s))
 js(page,'window.__UPROAR__.warp(2388);window.__UPROAR__.god(true)');s=step(page,2)
 check('boss fires volleys',s['enemyBullets']>0,str(s))
 js(page,'window.__UPROAR__.pulse()');s=snap(page)
 check('pulse clears projectiles',s['enemyBullets']==0 and s['pulses']==2)
 check('pulse damages boss',any(e['type']=='boss' and e['hp']<190 for e in s['entities']))
 page.keyboard.press('Escape');s=snap(page);before=s['elapsed'];step(page,10)
 check('pause freezes mission',snap(page)['state']=='paused' and snap(page)['elapsed']==before)
 page.get_by_role('button',name='Developer tools').click();slider=page.locator('#tune-speed');slider.fill('24');slider.dispatch_event('input')
 check('live developer slider',snap(page)['tuning']['speed']==24)
 page.get_by_role('button',name='Reset defaults').click();check('balance reset',snap(page)['tuning']['speed']==16)
 page.get_by_role('button',name='Back',exact=False).click();page.get_by_role('button',name='About / credits').click()
 text=page.locator('.scroll-body').inner_text()
 check('required in-game credits',all(k.lower() in text.lower() for k in ['Source Information','Testing Feedback','Engine Feedback','Prompt Feedback','added on import']))
 page.keyboard.press('Escape');page.get_by_role('button',name='Settings',exact=True).click()
 page.locator('#music').focus();v=page.locator('#music').input_value();page.keyboard.press('ArrowRight');check('slider single keyboard step',int(page.locator('#music').input_value())==int(v)+1)
 page.get_by_role('button',name='Back',exact=False).click();page.get_by_role('button',name='Return to title').click()
 # Pad at nonzero slot: browsers may leave disconnected holes in getGamepads().
 page.mouse.move(1400,850)
 page.wait_for_timeout(100)
 js(page,"""window.testPad={index:2,id:'DualSense simulated',connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[null,null,window.testPad];document.querySelector('[data-action="solo"]').focus();testPad.buttons[0].pressed=true""")
 
 try:page.wait_for_function('window.__UPROAR__.state==="playing"',timeout=5000)
 except Exception:raise RuntimeError('pad accept diagnostic: '+str(js(page,'({state:__UPROAR__.state,focus:document.activeElement.dataset.action,errors:__UPROAR__.diagnostics.errors,pad:navigator.getGamepads()[2]})')))
 js(page,'testPad.buttons[0].pressed=false;testPad.axes[0]=.8;window.__UPROAR__.god(true)');before=snap(page)['players'][0]['x'];s=step(page,.4)
 check('nonzero-slot controller steering',s['players'][0]['x']>before+1)
 js(page,'testPad.axes[0]=0;testPad.buttons[7].pressed=true');s=step(page,.5);js(page,'testPad.buttons[7].pressed=false');check('controller trigger cannon',s['shots']>0)
 js(page,'testPad.buttons[9].pressed=true');page.wait_for_function('window.__UPROAR__.state==="paused"');js(page,'testPad.buttons[9].pressed=false');check('controller Options pauses',snap(page)['state']=='paused')
 page.get_by_role('button',name='Settings',exact=True).click();page.locator('#glyphs').select_option('xbox');page.locator('#glyphs').dispatch_event('input');js(page,'testPad.axes[0]=.3');page.wait_for_timeout(100)
 check('Xbox dynamic prompt',page.locator('[data-glyph="back"]').first.inner_text()=='B')
 page.locator('#glyphs').select_option('playstation');page.locator('#glyphs').dispatch_event('input');page.get_by_role('button',name='Back',exact=False).click();page.get_by_role('button',name='Flight manual').click()
 page.wait_for_function('document.querySelector(".info-grid").textContent.includes("R2")');check('PlayStation R2 prompt','R2' in page.locator('.info-grid').inner_text())
 page.get_by_role('button',name='Back',exact=False).click();page.get_by_role('button',name='About / credits').click();js(page,'testPad.axes[3]=1');page.wait_for_function('document.querySelector(".scroll-body").scrollTop>0');check('controller credits scrolling',js(page,'document.querySelector(".scroll-body").scrollTop')>0);js(page,'testPad.axes[3]=0;navigator.getGamepads=()=>[]')
 start(page,'{coop:true}');js(page,'window.__UPROAR__.god(true)');before=snap(page)['players'][1]['x'];page.keyboard.down('ArrowRight');page.keyboard.down('Enter');s=step(page,.4);page.keyboard.up('ArrowRight');page.keyboard.up('Enter')
 check('local co-op second pilot',s['coop'] and len(s['players'])==2 and s['players'][1]['x']>before+1 and s['shots']>0,str(s))
 # Entire mission through combat; autopilot cheats survival, not objectives.
 start(page);js(page,'window.__UPROAR__.autopilot(true)')
 for i in range(28):
  s=step(page,12);mission.append({k:s[k] for k in ['elapsed','progress','score','bridges','refuels','kills','bossDefeated','state']})
  if s['state']!='playing':break
 check('complete scripted mission',s['state']=='results' and s['bossDefeated'] and s['progress']>=2650,str(s))
 check('all bridge objectives',s['bridges']==2,str(s))
 check('mission demonstrates fuel',s['refuels']>=4,str(s))
 check('boss second attack phase',s['stats']['bossPhases']==2,str(s))
 check('mission demonstrates combat and rolls',s['kills']>25 and s['shots']>300 and s['rolls']>8,str(s))
 # Two copies exchange actual BroadcastChannel states.
 page2=context.new_page();ready(page2,base+game+'?test=1')
 for tab in [page,page2]:js(tab,'window.__UPROAR__.network.joinRoom("AUTOTEST","Pilot");window.__UPROAR__.start({});window.__UPROAR__.autopilot(true)')
 page.wait_for_function('window.__UPROAR__.diagnostics.network.peers===1',timeout=10000);page2.wait_for_function('window.__UPROAR__.diagnostics.network.peers===1',timeout=10000)
 check('two-tab ghost transport',js(page,'window.__UPROAR__.diagnostics.network.received')>0 and js(page2,'window.__UPROAR__.diagnostics.network.received')>0)
 js(page2,'window.__UPROAR__.network.leaveRoom()');page.wait_for_function('window.__UPROAR__.diagnostics.network.peers===0');check('ghost room leave',js(page,'window.__UPROAR__.diagnostics.network.peers')==0);page2.close()
 check('no uncaught runtime errors',not errors,'; '.join(errors))
 context.close()
 context=browser.new_context(viewport={'width':1280,'height':800});filepage=context.new_page();ready(filepage,(ROOT.parent/game).as_uri()+'?test=1');check('standalone file URL boot',snap(filepage)['state']=='title');context.close()
 # Touch uses native injected multitouch, no physical device needed.
 context=browser.new_context(**p.devices['Pixel 7']);page=context.new_page();ready(page,base+game+'?test=1')
 page.get_by_role('button',name='Fly the river').tap();js(page,'window.__UPROAR__.god(true)')
 check('touch mode selected',js(page,'document.body.dataset.touch')=='true')
 cdp=context.new_cdp_session(page);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':100,'y':540}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':165,'y':540}]});before=snap(page)['players'][0]['x'];s=step(page,.4)
 check('touch drag steering',s['players'][0]['x']>before+1)
 check('touch assisted auto cannon',s['shots']>0)
 before=s['players'][0]['x'];cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':165,'y':540,'id':0},{'x':290,'y':420,'id':1}]});s=step(page,.15);check('multitouch preserves steering',s['players'][0]['x']>before+.5)
 check('touch HUD stays minimal',page.locator('.score-box').is_hidden() and page.locator('.radio').is_hidden())
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.locator('#touchPulse').tap();step(page,.1)
 check('touch pulse action',snap(page)['pulses']==2)
 page.locator('#touchMenu').tap();check('touch menu pause',snap(page)['state']=='paused')
 context.close()

try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=hub.WEBGPU_ARGS)
  try:
   try:main_tests(browser,p)
   except Exception as exc:failures.append('game test execution: '+traceback.format_exc())
   if os.environ.get('UPROAR_TEST_SCOPE')!='game':
    count,hub_failures=hub.run_hub_tests(browser,base,'/'+game);passed+=count;failures.extend(hub_failures)
  finally:browser.close()
finally:
 server.shutdown();server.server_close()
(ROOT/'mission-test.json').write_text(json.dumps(mission,indent=2)+'\n')
report={'passed':passed,'failed':len(failures),'failures':failures}
(ROOT/'test-results.json').write_text(json.dumps(report,indent=2)+'\n')
for f in failures:print('FAIL '+f)
print(f'{passed}/{passed+len(failures)} checks passed')
raise SystemExit(bool(failures))
