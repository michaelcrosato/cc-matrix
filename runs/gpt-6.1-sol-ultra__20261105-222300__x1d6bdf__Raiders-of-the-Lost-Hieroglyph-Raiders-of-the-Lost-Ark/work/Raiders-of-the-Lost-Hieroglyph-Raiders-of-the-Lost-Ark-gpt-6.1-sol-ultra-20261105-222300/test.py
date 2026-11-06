"""One-command expedition checks: npm test. Prints failures and one count line."""
import contextlib
import functools
import http.server
import json
import math
from pathlib import Path
import sys
import threading
import traceback
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'vendor'))
from network_checks import run_network_checks
from game_hub_checks import run_game_hub_checks
failures=[]
trail=[]
passed=0

def check(condition,label):
 global passed
 if condition:passed+=1
 else:failures.append(label)

def section(label,fn):
 if '--coop-only' in sys.argv and label not in ['startup','standalone game co-op']:return
 try:fn()
 except Exception as e:failures.append(label+': '+str(e))

class QuietHandler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass

server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT.parent)))
threading.Thread(target=server.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{server.server_port}/{ROOT.name}.html'
issues=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--disable-dev-shm-usage'])
 context=browser.new_context(viewport={'width':1280,'height':800},ignore_https_errors=True)
 page=context.new_page()
 page.on('pageerror',lambda e:issues.append(str(e)))
 page.goto(URL)
 def ready():
  page.wait_for_function('window.__game?.state.ready',timeout=120000)
  check(page.title()=='Raiders of the Lost Hieroglyph','served page identity')
  check(page.evaluate('__game.state.renderer')=='webgpu','WebGPU renderer active')
  check(page.evaluate('__game.state.mode')=='title' and not page.evaluate('__game.state.isAttract'),'loading completes before title attract timer starts')
  check(page.evaluate('__game.state.audio.music')==.1,'music defaults to 10 percent')
  check(page.evaluate('__game.diagnostics.rigs.every(a=>a.mixer&&a.clips===5)'),'native animation mixer and five clips')
  check(page.evaluate('__game.diagnostics.colliders')>5,'Rapier environment colliders present')
  check(page.locator('meta[name="hub:session-mode"]').get_attribute('content')=='shared-world','hub metadata present')
 section('startup',ready)
 def state():return page.evaluate('__game.state')
 def move(x,z,seconds=9):return page.evaluate('([x,z,s])=>__game.moveTo(x,z,s)',[x,z,seconds])
 def act(i):page.evaluate('(i)=>__game.input(i,1/60)',i)
 def interact():page.evaluate('__game.interact()')
 def expedition():
  page.locator('[data-action="start"]').click()
  for x,z in [(5,3),(7,1),(5,-1)]:
   move(x,z)
   page.evaluate('([x,z])=>{__game.aim(x,z);__game.input({attack:true},1.5)}',[x,z])
  for _ in range(6):
   hero=state()['players'][0]
   thieves=[e for e in state()['enemies'] if e['type']=='thief' and e['hp']>0]
   if not thieves:break
   enemy=min(thieves,key=lambda e:math.hypot(e['x']-hero['x'],e['z']-hero['z']))
   if math.hypot(enemy['x']-hero['x'],enemy['z']-hero['z'])>3:move(enemy['x'],enemy['z'],3)
   current=next(e for e in state()['enemies'] if e['type']=='thief' and e['id']==enemy['id'])
   page.evaluate('([x,z])=>{__game.aim(x,z);__game.input({attack:true},1.6)}',[current['x'],current['z']])
  check(state()['game']['coins']>=3,'whip breaks crates and recovers three trade coins')
  trail.append({'step':'supplies','state':state()})
  move(0,3);move(-6,0);interact();trail.append({'step':'merchant','state':state()})
  check(state()['game']['flags'].get('kit') and state()['game']['flags'].get('seal'),'outfitter trades inventory kit')
  move(-2,-3);move(0,-9);interact();trail.append({'step':'temple','state':state()})
  check(state()['stage']==1,'bazaar to sun-map chapter transition')
  move(0,1);interact()
  check(state()['game']['flags'].get('sealPlaced'),'sun seal unlocks map puzzle')
  move(-5,-.5);interact()
  # West dial starts at I, so one turn then three returns tests cycling.
  for _ in range(3):interact()
  move(0,-2.8);interact()
  move(5,-.5);interact();interact()
  check(state()['game']['dials']==[0,1,2],'three independently rotating puzzle dials')
  move(0,1);interact()
  check(state()['game']['flags'].get('map'),'correct dawn/noon/dusk alignment reveals mesa')
  move(4,0);move(4,-8);move(0,-9);interact()
  check(state()['stage']==2,'sun-map to mesa chapter transition')
  move(-4.5,1);interact();page.evaluate('__game.advance(1.6)')
  check(state()['game']['flags'].get('swung') and state()['players'][0]['x']>3,'whip-anchor traversal crosses chasm')
  move(8,-5);interact()
  check(state()['game']['flags'].get('dug'),'shovel opens marked excavation')
  move(8,-9);interact()
  check(state()['stage']==3,'mesa to vault chapter transition')
  check(state()['players'][0]['parachute']>0 and state()['players'][0]['y']>0,'visible parachute descent begins')
  page.evaluate('__game.advance(2.7)')
  check(state()['players'][0]['y']==0,'parachute lands safely')
  act({'tool':True})
  check(state()['game']['flute']>0,'flute charms snakes')
  move(0,-7);interact()
  check(state()['game']['flags'].get('ark') and state()['game']['escape'],'casket triggers boulder escape')
  move(3,0);move(3,8);move(0,10);interact()
  check(state()['game']['won'] and state()['screen']=='win','complete expedition reaches victory')
  check(state()['game']['score']>=1400,'adventure score rewards all chapter mechanics')
  check(state()['game']['deaths']<2,'full route survivable with default balance')
 section('full scripted expedition',expedition)
 def menu_tests():
  page.evaluate('__game.start()')
  page.evaluate('__game.action("pause")')
  check(state()['screen']=='pause','pause reachable')
  page.keyboard.press('ArrowDown');page.keyboard.press('Enter')
  check(state()['screen']=='journal','keyboard confirm selects active overlay instead of hidden title')
  page.evaluate('__game.action("back")')
  before=state()['game']['time'];page.evaluate('__game.advance(1)')
  check(state()['game']['time']==before,'solo pause freezes simulation')
  page.evaluate('__game.action("dev")')
  page.locator('[data-balance="speed"]').evaluate("e=>{e.value='8';e.dispatchEvent(new Event('input',{bubbles:true}))}")
  check(state()['balance']['speed']==8,'developer speed slider updates live balance')
  page.evaluate('__game.action("reset-balance")')
  check(state()['balance']['speed']==5.4,'developer reset restores defaults')
  page.evaluate('__game.action("god")')
  check(state()['game']['flags'].get('god'),'developer invulnerability toggle')
  page.evaluate('__game.action("pause-back");__game.action("journal")')
  check(page.locator('#overlay').inner_text().count('Dawn')>0,'field notes explain puzzle clues')
  page.evaluate('__game.action("back");__game.action("settings")')
  page.locator('[data-setting="music"]').evaluate("e=>{e.value='.23';e.dispatchEvent(new Event('input',{bubbles:true}))}")
  check(abs(state()['audio']['music']-.23)<.001,'music volume applies to actual audio graph')
  page.locator('[data-setting="music"]').evaluate("e=>{e.value='.1';e.dispatchEvent(new Event('input',{bubbles:true}))}")
  page.evaluate('__game.action("glyphs")')
  check('xbox' in page.locator('#overlay').inner_text().lower(),'Xbox controller glyph setting')
  page.evaluate('__game.action("about")')
  text=page.locator('#overlay').inner_text()
  check(all(x in text for x in ['Testing Feedback','Engine Feedback','Prompt Feedback','added on import']),'About includes source and all feedback categories')
  page.evaluate('__game.action("title")')
 section('menus and developer tools',menu_tests)
 def attract():
  page.evaluate('__game.action("title");__game.idle(9.9)')
  check(not state()['isAttract'],'attract stays idle before ten seconds')
  page.evaluate('__game.idle(10.1)')
  check(state()['isAttract'],'attract starts after ten seconds without input')
  seen=set();loop=False
  for i in range(100):
   page.evaluate('__game.advance(2)')
   s=state();seen.add(s['stage'])
   if len(seen)==4 and s['stage']==0:loop=True;break
  check(seen=={0,1,2,3},'attract replay demonstrates all four chapters')
  check(loop,'attract replay completes expedition and loops')
  page.keyboard.press('KeyZ')
  check(not state()['isAttract'] and state()['mode']=='title','any keyboard input exits attract')
 section('attract mode',attract)
 def pad():
  page.evaluate('''window.testPad={id:'DualSense test',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0,touched:false}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.testPad],configurable:true})''')
  page.evaluate('testPad.buttons[0].pressed=true')
  page.wait_for_function('__game.state.mode==="playing"',timeout=20000)
  check(state()['players'][0]['roll']==0,'controller menu confirm does not leak into gameplay dodge')
  page.evaluate('testPad.buttons[0].pressed=false;testPad.axes[0]=1')
  x=state()['players'][0]['x']
  page.wait_for_function('(x)=>__game.state.players[0].x>x+.15',arg=x,timeout=15000)
  check(state()['players'][0]['x']>x,'standard gamepad left stick moves player')
  page.evaluate('testPad.axes[0]=0;testPad.buttons[9].pressed=true')
  page.wait_for_function('__game.state.screen==="pause"',timeout=15000)
  check(state()['screen']=='pause','standard gamepad Options opens pause')
  page.evaluate('testPad.buttons[9].pressed=false')
  page.wait_for_timeout(150)
  page.evaluate('testPad.buttons[1].pressed=true')
  page.wait_for_function('__game.state.screen===""',timeout=15000)
  check(state()['screen']=='','standard gamepad back resumes')
  page.evaluate('testPad.buttons[1].pressed=false')
 section('controller',pad)
 def audio_checks():
  result=page.evaluate('__game.testAudioOffline()')
  check(result.get('finite',False) and result.get('rms',0)>.001,'offline procedural music effects and voice produce finite nonzero audio')
  page.evaluate('__game.audio.unlock();__game.audio.effect("whip");__game.audio.voice("A fine mistake")')
  check(state()['audio']['state'] in ['running','suspended'],'live Web Audio context created')
 section('audio',audio_checks)
 def touch_checks():
  mobile=browser.new_context(viewport={'width':844,'height':390},device_scale_factor=1,is_mobile=True,has_touch=True,ignore_https_errors=True)
  mp=mobile.new_page();mp.goto(URL+'?renderer=webgl')
  mp.wait_for_function('window.__game?.state.ready',timeout=120000)
  mp.locator('[data-action="start"]').tap()
  check('touch' in mp.locator('body').get_attribute('class'),'touch device selects minimal touch layout')
  x=mp.evaluate('__game.state.players[0].x')
  cdp=mobile.new_cdp_session(mp)
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':100,'y':230,'id':1}]})
  cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':160,'y':230,'id':1}]})
  mp.wait_for_function('(x)=>__game.state.players[0].x>x+.1',arg=x,timeout=15000)
  check(mp.evaluate('__game.state.players[0].x')>x,'invisible touch stick moves explorer')
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  mp.evaluate('__game.position(5,3);__game.advance(1.2)')
  check(mp.evaluate('__game.state.game.coins')>=1,'touch assistance breaks supply crates without attack UI')
  mp.evaluate('__game.position(-6,0);__game.advance(.05)')
  check(mp.locator('#touch-action').is_visible(),'context-sensitive touch action appears near outfitter')
  mobile.close()
 if '--quick' not in sys.argv:section('touch profile',touch_checks)
 def local_game_coop():
  page.bring_to_front();page.evaluate('__game.action("title")')
  page.evaluate('__game.network.host()');page.evaluate('__game.start()')
  code=state()['network']['code']
  guest=context.new_page();guest.goto(URL)
  guest.wait_for_function('window.__game?.state.ready',timeout=120000)
  guest.evaluate('(c)=>__game.network.join(c)',code)
  guest.wait_for_function('__game.state.network.connected&&__game.state.mode==="playing"',timeout=20000)
  page.wait_for_function('__game.state.players.length===2',timeout=15000)
  check(len(state()['players'])==2,'standalone game co-op spawns partner')
  guest.keyboard.down('KeyD')
  guest.wait_for_timeout(600)
  guest.keyboard.up('KeyD')
  check(any(a['id']==1 and a['x']>1.5 for a in state()['players']),'guest keyboard input reaches host simulation')
  page.evaluate('__game.warp(1);__game.position(0,1,1)')
  guest.wait_for_function('__game.state.stage===1&&__game.state.context==="map"',timeout=20000)
  guest.locator('#context').click()
  page.wait_for_function('__game.state.game.flags.sealPlaced',timeout=15000)
  check(state()['game']['flags'].get('sealPlaced'),'guest context click performs authoritative interaction')
  guest.wait_for_function('document.querySelector("#dialogue").textContent.includes("inscription")',timeout=10000)
  check('inscription' in guest.locator('#dialogue').inner_text(),'co-op guest receives synchronized expedition dialogue')
  guest.evaluate('__game.network.leave()');guest.close();page.evaluate('__game.network.leave()')
 if '--quick' not in sys.argv:section('standalone game co-op',local_game_coop)
 def network_checks():
  global passed
  module=URL.rsplit('/',1)[0]+'/'+ROOT.name+'/network.js'
  passed+=run_network_checks(browser,URL,module)
 if '--quick' not in sys.argv:section('transport and protocol checks',network_checks)
 # Close the main GPU page before the multi-frame official harness.
 check(not issues,'no uncaught game JavaScript errors: '+str(issues))
 context.close()
 def file_checks():
  fc=browser.new_context(ignore_https_errors=True)
  fp=fc.new_page();fp.goto((ROOT.parent/(ROOT.name+'.html')).as_uri())
  fp.wait_for_function('window.__game?.state.ready',timeout=120000)
  check(fp.evaluate('__game.state.renderer')=='webgpu','single HTML boots with WebGPU directly from file URL')
  check(fp.title()=='Raiders of the Lost Hieroglyph','file URL serves correct title')
  fc.close()
 if '--quick' not in sys.argv:section('file deployment',file_checks)
 def hub_checks():
  global passed
  passed+=run_game_hub_checks(browser,URL)
 if '--quick' not in sys.argv:section('official AI Hub harness',hub_checks)
 browser.close()
server.shutdown();server.server_close()
report={'trail':trail,'passed':passed,'failures':failures,'parameters':{'browser':'Chromium 153 software WebGPU','viewport':'1280x800','mobile':'844x390 touch emulation','controller':'standard-mapping Gamepad API stub','network':'two pages, AI Hub player-host/server-host/host-leave/impaired network','playthrough':'four chapters with default balance and real movement/actions'}}
(ROOT/('test-results-coop.json' if '--coop-only' in sys.argv else 'test-results.json')).write_text(json.dumps(report,indent=2))
for failure in failures:print('FAIL: '+failure)
print(f'{passed} checks passed; {len(failures)} failures')
sys.exit(bool(failures))
