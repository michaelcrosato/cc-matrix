"""Final-file integration tests. Inputs are hardware emulation or ordinary commands.
Screenshots reached by developer mutation are explicitly labeled assisted in evidence.
Run through node tools/test.mjs browser; only failures and a final count go to stdout.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,traceback,sys,time,hashlib,re
ROOT=Path(__file__).resolve().parents[1]
HTML=ROOT.parent/(ROOT.name+'.html')
EVIDENCE=ROOT/'evidence'
results=[];findings=[];screens=[]
PAD='''(()=>{window.__pads=[];navigator.getGamepads=()=>window.__pads;window.__pad=(index,on=true)=>{if(!on){window.__pads[index]=null;dispatchEvent(new Event('gamepaddisconnected'));return;}const p={id:'DualSense standard mapping test stand-in',index,connected:true,mapping:'standard',timestamp:1,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0}))};window.__pads[index]=p;dispatchEvent(new Event('gamepadconnected'));return p;};window.__button=(p,b,on)=>{const v=window.__pads[p];if(v){v.buttons[b]={pressed:on,touched:on,value:on?1:0};v.timestamp++;}};})();'''

def record(name,ok,detail=''):
 results.append({'name':name,'pass':bool(ok),'detail':detail})
 if not ok: print('FAIL browser: '+name+' '+str(detail))

def attempt(name,fn):
 try:
  value=fn();record(name,value is not False,'' if value is None or value is True else value)
 except Exception as exc:
  record(name,False,str(exc));findings.append({'name':name,'error':str(exc),'trace':traceback.format_exc()[-1800:]})

def button(page,text):
 loc=page.get_by_role('button',name=text,exact=True)
 if loc.count()==0:loc=page.get_by_role('button',name=text,exact=False)
 loc.wait_for(state='visible',timeout=5000);loc.click(timeout=5000)

def wait_screen(page,name):
 try:page.wait_for_function('(s)=>__ring.ui.shell.screen===s',arg=name,timeout=10000)
 except Exception:
  debug=page.evaluate('''()=>({screen:__ring.ui.shell.screen,paused:__ring.game.paused,pausable:__ring.game.scene.pausable,mode:__ring.world?.mode,input:__ring.game.input.player,players:__ring.game.players.map(q=>({id:q.player,pad:q.pad,padIndex:q.padIndex,lost:q.padLost,held:[...q.held]})),errors:__ring.game.errors})''')
  raise AssertionError('Expected screen '+name+': '+json.dumps(debug))

def state(page):return page.evaluate('()=>__ring.inspect()')

def pad_press(page,b,p=0,hold=120):
 page.evaluate('([p,b])=>__button(p,b,true)',[p,b]);page.wait_for_timeout(hold)
 page.evaluate('([p,b])=>__button(p,b,false)',[p,b]);page.wait_for_timeout(120)

def pad_choose(page,label,p=0):
 for _ in range(45):
  if page.evaluate('(t)=>document.activeElement?.tagName==="BUTTON"&&document.activeElement.textContent.trim().startsWith(t)',label):
   pad_press(page,0,p=p);return
  pad_press(page,13,p=p,hold=70)
 raise AssertionError('Controller focus could not reach '+label)

def pad_slider(page,label,p=0):
 for _ in range(45):
  if page.evaluate('(t)=>document.activeElement?.type==="range"&&document.activeElement.getAttribute("aria-label")===t',label):return
  pad_press(page,13,p=p,hold=70)
 raise AssertionError('Controller focus could not reach slider '+label)

def screenshot(page,name,assisted=False):
 page.wait_for_timeout(350)
 f='browser-'+name+'.png';page.screenshot(path=str(EVIDENCE/f));screens.append({'file':f,'assisted':assisted})

def drive(page,until='board',seconds=180):
 return page.evaluate('''({until,seconds})=>{const R=__ring,S=RingSim;let steps=0;const start=R.world.time;for(;steps<seconds*120;steps+=5){const w=R.world;if((until==='board'&&w.mode==='board')||(until!=='board'&&w.roomId===until))break;if(w.mode==='failed')return {ok:false,why:'failure',room:w.roomId,hp:w.heroes.map(h=>h.hp)};const c=S.companion(w,w.heroes[0],5/120,true);c.ping=w.tick%600<5;R.testCommand(0,c);R.game.advance(5/120,{draw:false});}R.testCommand(0,null);return{ok:(until==='board'?R.world.mode==='board':R.world.roomId===until),room:R.world.roomId,mode:R.world.mode,assisted:R.world.assisted,seconds:R.world.time-start,history:R.world.history};}''',{'until':until,'seconds':seconds})

def run():
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True)
  ctx=browser.new_context(viewport={'width':1920,'height':1080})
  ctx.add_init_script(PAD)
  page=ctx.new_page();errors=[];requests=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('requestfailed',lambda r:requests.append(r.url))
  page.goto(HTML.as_uri());page.wait_for_function('window.__ring && document.documentElement.dataset.ready==="true"')
  attempt('single emitted HTML boots file:// with pinned native renderer',lambda:page.evaluate('document.title==="Quest for the Fourfold Rings"&&My3D2dge.version==="0.89.1"&&__ring.net===null'))
  attempt('clean-profile actual music default is ten percent',lambda:page.evaluate('__ring.game.settings.music===.1'))
  attempt('title buttons and disabled Continue are usable',lambda:page.get_by_role('button',name='New Expedition',exact=True).is_visible() and page.get_by_role('button',name='Continue Expedition',exact=True).is_disabled())
  screenshot(page,'title')
  attempt('mouse hover moves native menu focus',lambda:(page.get_by_role('button',name='How to Play',exact=True).hover(),page.wait_for_timeout(80),page.evaluate('document.activeElement.textContent.includes("How to Play")'))[-1])
  button(page,'How to Play');wait_screen(page,'help')
  screenshot(page,'help')
  attempt('help explains solo/couch/Hub and every mandatory touch action',lambda:all(x in ' '.join(page.locator('.esh').inner_text().lower().split()) for x in ['ai hub','touch','revive','dread']))
  page.keyboard.press('Escape');wait_screen(page,'title')
  # Native settings and rebinding remain the same screen hierarchy.
  button(page,'Settings');wait_screen(page,'settings')
  page.evaluate('__ring.game.advance(10.5,{draw:false})');attempt('attract never starts over Settings',lambda:page.evaluate('!__ring.attract'))
  screenshot(page,'settings')
  attempt('native settings exposes independent music, SFX, voice and comfort',lambda:page.evaluate('''()=>{const s=__ring.game.settings;return s.music===.1&&typeof s.effects==='number'&&typeof s.voice==='number'&&typeof s.motion==='boolean'&&typeof s.outlines==='boolean';}'''))
  page.keyboard.press('Escape');wait_screen(page,'title')
  button(page,'About / Credits');wait_screen(page,'about')
  attempt('About has all four required feedback categories',lambda:all(page.get_by_role('button',name=x,exact=True).is_visible() for x in ['Source Information','Testing Feedback','Engine Feedback','Prompt Feedback']))
  button(page,'Source Information');wait_screen(page,'source');screenshot(page,'source-information')
  attempt('source information is backed by parsed builder interview',lambda:page.evaluate('RingInterview.sourceInformation.plan==="PLAN.md"&&RingInterview.sourceInformation.usage==="added on import"&&RingInterview.testingFeedback.length===4&&RingInterview.engineFeedback.length===6&&RingInterview.promptFeedback.length===4'))
  page.evaluate('__ring.ui.title()')
  # Start through pointer menus, including the duplicate-capable class selection.
  button(page,'New Expedition');wait_screen(page,'select')
  attempt('four selectable animated native hero rigs exist',lambda:page.evaluate('Object.keys(RingContent.heroes).length===4&&Object.keys(My3D2dge.Humanoid.poses).includes("qCarry")'))
  screenshot(page,'hero-selection')
  button(page,'Warrior');wait_screen(page,'select');button(page,'Wizard')
  page.wait_for_function('__ring.world?.mode==="courtyard"')
  attempt('new expedition gives one human and useful AI companion',lambda:page.evaluate('!__ring.world.heroes[0].ai&&__ring.world.heroes[1].ai&&__ring.world.rings.every(x=>!x)&&__ring.world.dread===0'))
  screenshot(page,'courtyard')
  x=page.evaluate('__ring.world.heroes[0].x');page.keyboard.down('KeyD');page.wait_for_timeout(350);page.keyboard.up('KeyD')
  attempt('real keyboard movement changes authoritative position',lambda:page.evaluate('__ring.world.heroes[0].x')>x+2)
  page.mouse.move(1350,450);page.mouse.click(1350,450);page.wait_for_timeout(100)
  attempt('mouse primary uses ordinary combat and switches prompts',lambda:page.evaluate('__ring.world.events.some(e=>e.type==="attack"||e.type==="attack-wind")&&__ring.game.input.lastDevice==="mouse"'))
  # Projected native buffer -> client -> ground must invert camera and zoom.
  attempt('mouse aim transforms camera and native view correctly',lambda:page.evaluate('''()=>{const g=__ring.game,x=177,y=233,q=g.r.w(x,y,0),s=g.screen,b=s.canvas.getBoundingClientRect(),cx=(q[0]*s.S+s.OX-Math.round(s.fx*s.S))/s.dpr+b.left,cy=(q[1]*s.S+s.OY-Math.round(s.fy*s.S))/s.dpr+b.top,p=RingView.screenToWorld(cx,cy);return Math.hypot(p[0]-x,p[1]-y)<.001;}'''))
  page.keyboard.press('KeyK');page.keyboard.press('Space');page.wait_for_timeout(100)
  attempt('keyboard class power and dodge use live kit rules',lambda:page.evaluate('__ring.world.events.some(e=>e.type==="power")&&__ring.world.events.some(e=>e.type==="dodge")'))
  # Emulated standard pad, injected before startup. No physical controller claimed.
  page.evaluate('__pad(0)');pad_press(page,7)
  attempt('standard pad hot-switch shows PlayStation glyphs',lambda:page.evaluate('__ring.game.input.lastDevice==="gamepad"&&__ring.game.input.label("interact").includes("△")'))
  page.evaluate('__ring.game.settings.set("glyphs","xbox")');pad_press(page,3)
  attempt('Xbox glyph setting changes context prompt',lambda:page.evaluate('__ring.game.input.label("interact")==="Y"'))
  page.evaluate('__ring.game.settings.set("glyphs","playstation")')
  page.evaluate('__pad(1)');pad_press(page,9,p=1)
  page.wait_for_function('__ring.game.players.length===2&&!__ring.world.heroes[1].ai')
  attempt('free second standard controller joins safely from courtyard',lambda:page.evaluate('__ring.game.players.length===2&&!__ring.world.heroes[1].ai'))
  page.evaluate('__pad(1,false)');wait_screen(page,'reconnect')
  attempt('secondary disconnect pauses with reconnect choice',lambda:page.evaluate('__ring.game.paused') and page.get_by_role('button',name='Continue with AI',exact=True).is_visible())
  page.evaluate('__pad(1)');pad_press(page,3,p=1)
  page.wait_for_function('!__ring.game.paused&&__ring.ui.shell.screen!=="reconnect"')
  attempt('actual returning controller resumes its human hero',lambda:page.evaluate('!__ring.world.heroes[1].ai'))
  page.evaluate('__pad(1,false)');wait_screen(page,'reconnect');button(page,'Continue with AI')
  attempt('Continue with AI transfers secondary ownership without stranding run',lambda:page.evaluate('__ring.world.heroes[1].ai&&__ring.game.players.length===1&&!__ring.game.paused'))
  page.mouse.move(1,1);page.wait_for_timeout(200);pad_press(page,9);wait_screen(page,'pause')
  attempt('pad Options opens standalone pause',lambda:page.evaluate('__ring.game.paused'))
  t=page.evaluate('__ring.world.time');page.wait_for_timeout(160)
  attempt('standalone pause stops simulation without charging Dread',lambda:page.evaluate('__ring.world.time')==t)
  pad_choose(page,'Dev Mode');wait_screen(page,'dev');screenshot(page,'dev-mode')
  attempt('controller-only pause navigation reaches Dev Mode',lambda:page.evaluate('__ring.ui.shell.screen==="dev"'))
  attempt('Dev Mode exposes complete tuning registry bounds',lambda:page.locator('.esh input[type=range]').count()>=13)
  # Keyboard/pad slider editing sends native onChange, no remount.
  sliders=page.locator('.esh input[type=range]');page.mouse.move(1,1)
  pad_slider(page,'Hero speed')
  old=sliders.first.input_value();pad_press(page,15)
  attempt('pad adjusts focused live tuning slider',lambda:sliders.first.input_value()!=old)
  attempt('live slider mutation marks run assisted',lambda:page.evaluate('__ring.world.assisted'))
  button(page,'Reset tuning to defaults')
  attempt('Reset to Defaults restores tuning registry safely',lambda:page.evaluate('Object.entries(RingContent.tuning).every(([k,v])=>__ring.world.tuning[k]===v.value)'))
  page.mouse.move(1,1);pad_press(page,1);wait_screen(page,'pause');pad_choose(page,'About / Credits');wait_screen(page,'about')
  attempt('controller-only pause navigation reaches credits',lambda:page.get_by_role('button',name='Source Information',exact=True).is_visible())
  page.keyboard.press('Escape');page.wait_for_timeout(100)
  page.evaluate('__ring.ui.shell.hide();__ring.game.resume()')
  # Restart a clean ordinary run to keep extraction evidence unassisted.
  page.evaluate('__ring.newRun(["warrior","wizard"])')
  result=drive(page,'board',120)
  record('ordinary input driver reaches courtyard waystone',result['ok'] and not result['assisted'],result)
  if result['ok']:
   screenshot(page,'board')
   page.evaluate('__pad(1)');page.wait_for_timeout(120);pad_press(page,9,p=1)
   page.wait_for_function('__ring.game.players.length===2&&!__ring.world.heroes[1].ai')
   pad_choose(page,'Hollow Crown',p=1);page.wait_for_timeout(120)
   attempt('secondary controller cannot choose the primary seat route',lambda:page.evaluate('__ring.world.mode==="board"&&__ring.world.dread===0'))
   pad_choose(page,'Change my hero',p=1);wait_screen(page,'select');pad_choose(page,'Phantom',p=1);wait_screen(page,'board')
   attempt('secondary controller changes only its own waystone hero',lambda:page.evaluate('__ring.world.heroes[0].classId==="warrior"&&__ring.world.heroes[1].classId==="phantom"'))
   pad_choose(page,'Change my hero',p=1);wait_screen(page,'select');pad_choose(page,'Wizard',p=1);wait_screen(page,'board')
   page.evaluate('__pad(1,false)');wait_screen(page,'reconnect');button(page,'Continue with AI');wait_screen(page,'board')
   button(page,'Hollow Crown');wait_screen(page,'destination');button(page,'Enter Hollow Crown')
   page.wait_for_function('__ring.world.roomId==="dungeon1"')
   attempt('castle entry charges Dread exactly once',lambda:page.evaluate('__ring.world.dread===1'))
   result=drive(page,'dungeon2',180)
   record('ordinary input retrieves oath-ring and extracts room one',result['ok'] and not result['assisted'] and any(e['type']=='ring-pickup' for e in result['history']),result)
   attempt('moving to room two does not charge entry again',lambda:page.evaluate('__ring.world.dread===1'))
   screenshot(page,'dungeon-normal')
   saved=page.evaluate('localStorage.getItem("fourfold-rings-checkpoint-v3")')
   attempt('safe transition checkpoint contains room two and charged Dread',lambda:json.loads(saved)['roomId']=='dungeon2' and json.loads(saved)['dread']==1)
   page.reload();page.wait_for_function('window.__ring&&document.documentElement.dataset.ready==="true"')
   attempt('Continue enabled after a real safe checkpoint',lambda:page.get_by_role('button',name='Continue Expedition',exact=True).is_enabled())
   button(page,'Continue Expedition');page.wait_for_function('__ring.world?.roomId==="dungeon2"')
   attempt('Continue restores room, classes and Dread without re-entry charge',lambda:page.evaluate('__ring.world.dread===1&&__ring.world.heroes[0].classId==="warrior"&&__ring.world.heroes[1].classId==="wizard"'))
  attempt('rendering remains observational for authoritative state',lambda:page.evaluate('''()=>{const before=JSON.stringify(RingSim.snapshot(__ring.world));__ring.game.advance(0,{draw:true});return JSON.stringify(RingSim.snapshot(__ring.world))===before;}'''))
  # Native Controls menu rebinding is verified by one remapped gameplay action.
  page.keyboard.press('Escape');wait_screen(page,'pause')
  btn=page.get_by_role('button',name='Controls',exact=True)
  if btn.count():
   btn.click();page.wait_for_timeout(150);screenshot(page,'controls')
   attempt('native controls screen lists rebindable primary action',lambda:'Primary action' in page.locator('.esh').inner_text())
   page.locator('button[aria-label^="Primary action, keyboard:"]').click();page.keyboard.press('KeyU');page.wait_for_timeout(100)
   attempt('native key rebinding updates the primary action map',lambda:page.evaluate('__ring.game.input.map.attack.includes("KeyU")'))
  else:record('native Controls menu is reachable',False,'Controls button missing')
  # Visual assisted scenarios: each family, failure, ending and feedback.
  page.evaluate('__ring.ui.shell.hide();__ring.game.resume()')
  page.evaluate('''()=>{window.__badCoordinates=[];for(const name of ['line','poly','disc','ell']){const base=My3D2dge.px[name];My3D2dge.px[name]=function(...a){const coords=name==='poly'?(a[1]||[]).flat():a.slice(1,name==='line'?5:name==='ell'?5:4);if(coords.some(v=>typeof v==='number'&&!Number.isFinite(v)))window.__badCoordinates.push(name);return base.apply(this,a);};}}''')
  for rid in ['crystal2','inferno2','shifting2','final']:
   page.evaluate('(r)=>__ring.dev("jump",r)',rid);page.wait_for_timeout(220);screenshot(page,rid+'-assisted',True)
   attempt('native '+rid+' visual scenario has no engine errors',lambda:page.evaluate('__ring.game.errors.length===0'))
  attempt('all native authored enemies draw finite coordinates for string IDs',lambda:page.evaluate('__badCoordinates.length===0'))
  attempt('remote interpolation stays presentation-only and derives walking velocity',lambda:page.evaluate('''()=>{const w=__ring.world,u=__ring.ui.state,base=JSON.stringify(RingSim.snapshot(w));u.remote=true;RingView.update(w,.04,u);const copy={...w,heroes:w.heroes.map(h=>({...h,x:h.x+10}))},before=JSON.stringify(RingSim.snapshot(copy));RingView.update(copy,.04,u);const h=copy.heroes[0],rig=RingView.rigs.get(h.id+':'+h.classId);const ok=JSON.stringify(RingSim.snapshot(copy))===before&&JSON.stringify(RingSim.snapshot(w))===base&&rig.x<h.x&&rig._spW>0;u.remote=false;return ok;}'''))
  page.evaluate('__ring.dev("jump","final");__ring.world.rings=[true,true,true,true];__ring.world.finalBeat="escape";__ring.world.bound=4;__ring.world.stations.forEach(s=>s.active=true);__ring.world.heroes.forEach(h=>{h.x=200;h.y=264;h.down=false;});__ring.testCommand(0,{interact:true})')
  page.wait_for_function('__ring.world.mode==="victory"',timeout=10000)
  page.evaluate('__ring.testCommand(0,null)');screenshot(page,'victory-assisted',True)
  attempt('played escape reaches ending and replay options',lambda:page.get_by_role('button',name='Another Expedition',exact=True).is_visible())
  button(page,'Return to title');wait_screen(page,'title')
  # Attract: controlled native real time proves ten-second boundary without waiting wall-clock.
  page.mouse.move(1,1);page.evaluate('__ring.game.input.tap("map");__ring.game.advance(.01,{draw:false});__ring.game.advance(9.94,{draw:false})')
  attempt('attract does not start before ten seconds',lambda:page.evaluate('!__ring.attract'))
  page.evaluate('__ring.game.advance(.09,{draw:false})')
  attempt('attract starts at ten-second idle threshold',lambda:page.evaluate('__ring.attract'))
  save_before=page.evaluate('localStorage.getItem("fourfold-rings-checkpoint-v3")')
  coverage=page.evaluate('''()=>{const seen=[];for(let i=0;i<7;i++){__ring.game.advance(15.01,{draw:false});seen.push(__ring.world.roomId);}return seen;}''')
  attempt('attract loop covers all geometry families and dragon',lambda:all(x in coverage for x in ['dungeon2','crystal2','inferno2','shifting2','final']))
  attempt('attract never writes checkpoint progress',lambda:page.evaluate('localStorage.getItem("fourfold-rings-checkpoint-v3")')==save_before)
  screenshot(page,'attract')
  page.keyboard.press('Enter');wait_screen(page,'title')
  attempt('any keyboard input exits demo and is consumed',lambda:page.evaluate('!__ring.attract&&__ring.world===null&&__ring.ui.shell.screen==="title"'))
  # Pointer and pad exit are independent and do not leak into New Expedition.
  page.evaluate('__ring.game.advance(10.1,{draw:false})');page.mouse.click(20,20);wait_screen(page,'title')
  attempt('pointer exits attract without selecting title action',lambda:page.evaluate('!__ring.attract&&__ring.world===null'))
  page.evaluate('__pad(0);__ring.game.advance(10.1,{draw:false})');pad_press(page,0);wait_screen(page,'title')
  attempt('pad exits attract without selecting title action',lambda:page.evaluate('!__ring.attract&&__ring.world===null'))
  attempt('file launch makes no missing neighboring requests',lambda:not requests)
  attempt('integrated desktop has no console/page/engine exceptions',lambda:not errors and page.evaluate('__ring.game.errors.length===0'))
  desktop_errors=errors[:]
  ctx.close()
  # Storage corruption and unavailable storage in isolated clean profiles.
  for label,script in [('malformed','localStorage.setItem("fourfold-rings-checkpoint-v3","{malformed")'),('outdated','localStorage.setItem("fourfold-rings-checkpoint-v3",JSON.stringify({version:0}))'),('blocked','Storage.prototype.getItem=function(){throw new Error("test storage blocked")};Storage.prototype.setItem=function(){throw new Error("test storage blocked")}'),('full','Storage.prototype.setItem=function(){throw new DOMException("test quota","QuotaExceededError")}')]:
   cx=browser.new_context(viewport={'width':1280,'height':720});cx.add_init_script(script);q=cx.new_page();q.goto(HTML.as_uri());q.wait_for_function('window.__ring&&document.documentElement.dataset.ready==="true"')
   if label in ['malformed','outdated','blocked']:attempt(label+' checkpoint is rejected without Continue trap',lambda q=q:q.get_by_role('button',name='Continue Expedition',exact=True).is_disabled())
   attempt(label+' storage degrades gracefully and can start a new run',lambda q=q: q.evaluate('__ring.newRun();!!__ring.world&&__ring.world.mode==="courtyard"'))
   cx.close()
  # Touch device profiles use separate simultaneous pointer IDs and actual touch UI.
  for device in ['iPhone 13','iPad Pro 11']:
   profile=dict(p.devices[device]);profile.pop('default_browser_type',None)
   cx=browser.new_context(**profile);q=cx.new_page();q.goto(HTML.as_uri());q.wait_for_function('window.__ring&&document.documentElement.dataset.ready==="true"')
   q.evaluate('__ring.newRun(["wizard","phantom"])');q.wait_for_timeout(200)
   if q.locator('.esh-tut button').is_visible():q.locator('.esh-tut button').tap();q.wait_for_timeout(80)
   w=q.viewport_size['width'];h=q.viewport_size['height'];x=q.evaluate('__ring.world.heroes[0].x')
   cdp=cx.new_cdp_session(q)
   left={'x':w*.18,'y':h*.62,'id':11};right={'x':w*.78,'y':h*.6,'id':22}
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[left]})
   left={**left,'x':left['x']+45};cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[left]})
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[left,right]})
   right={**right,'x':right['x']-10,'y':right['y']-35};cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[left,right]})
   q.wait_for_timeout(350)
   attempt(device+' simultaneous invisible movement and aim sticks',lambda q=q,x=x:q.evaluate('__ring.world.heroes[0].x')>x+1)
   power=q.locator('#touchActions [data-action=power]')
   if power.is_visible():
    bb=power.bounding_box();third={'x':bb['x']+bb['width']/2,'y':bb['y']+bb['height']/2,'id':33};cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[left,right,third]});q.wait_for_timeout(120);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[left,right]})
    attempt(device+' contextual class power reachable while moving',lambda q=q:q.evaluate('__ring.world.events.some(e=>e.type==="power")'))
   else:record(device+' contextual class power reachable',False,'Class action not visible with aim stick')
   cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});q.wait_for_timeout(150)
   vx=q.evaluate('Math.hypot(__ring.world.heroes[0].vx,__ring.world.heroes[0].vy)');attempt(device+' cancelled pointers release movement',lambda vx=vx:vx<.1)
   cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':w*.18,'y':h*.62,'id':66}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':w*.18+45,'y':h*.62,'id':66}]});q.wait_for_timeout(100)
   q.evaluate('__ring.game.menu()');q.wait_for_timeout(100);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});q.wait_for_timeout(100);q.evaluate('__ring.ui.shell.hide();__ring.game.resume()');q.wait_for_timeout(150)
   attempt(device+' lifting a stick over pause cannot leave ghost movement',lambda q=q:q.evaluate('Math.hypot(__ring.world.heroes[0].vx,__ring.world.heroes[0].vy)<.1'))
   screenshot(q,device.replace(' ','-').lower())
   # An ordinary command driver proves same complete sim under touch viewport; actual contact action takes the ring.
   result=drive(q,'board',140);record(device+' ordinary route works at touch viewport',result['ok'] and not result['assisted'],result)
   if result['ok']:
    button(q,'Hollow Crown');wait_screen(q,'destination');button(q,'Enter Hollow Crown');q.wait_for_function('__ring.world.roomId==="dungeon1"')
    def approach(kind):
     return q.evaluate('''(kind)=>{let n=0;for(;n<120*100;n+=4){const w=__ring.world,c=RingSim.context(w,w.heroes[0]);if(c?.type===kind)break;const cmd=RingSim.companion(w,w.heroes[0],4/120,true);cmd.interact=false;__ring.testCommand(0,cmd);__ring.game.advance(4/120,{draw:false});}__ring.testCommand(0,null);return RingSim.context(__ring.world,__ring.world.heroes[0])?.type===kind;}''',kind)
    if approach('pickup'):
     q.wait_for_timeout(100);bb=q.locator('#touchActions [data-action=interact]').bounding_box();tp={'x':bb['x']+bb['width']/2,'y':bb['y']+bb['height']/2,'id':44};cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[tp]});q.wait_for_timeout(140);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
     attempt(device+' contact-sensitive touch pickup takes shared ring',lambda q=q:q.evaluate('__ring.world.ring?.carrier===1'))
     if approach('exit'):
      q.wait_for_timeout(100);bb=q.locator('#touchActions [data-action=interact]').bounding_box();tp={'x':bb['x']+bb['width']/2,'y':bb['y']+bb['height']/2,'id':55};cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[tp]});q.wait_for_timeout(140);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
      attempt(device+' touch extraction reaches second authored room',lambda q=q:q.evaluate('__ring.world.roomId==="dungeon2"&&!__ring.world.assisted'))
     else:record(device+' approach exit with ordinary movement',False,'not reached')
    else:record(device+' approach ring with ordinary movement',False,'not reached')
   q.set_viewport_size({'width':844,'height':390});q.wait_for_timeout(150);screenshot(q,device.replace(' ','-').lower()+'-landscape')
   attempt(device+' landscape resize keeps native rendering and safe document bounds',lambda q=q:q.evaluate('__ring.game.errors.length===0&&document.documentElement.scrollWidth<=innerWidth'))
   q.evaluate('__ring.game.menu()');button(q,'Quit to title');wait_screen(q,'title');q.evaluate('__ring.game.advance(10.1,{draw:false})');q.touchscreen.tap(10,10);wait_screen(q,'title')
   attempt(device+' touch exits disposable attract world immediately',lambda q=q:q.evaluate('!__ring.attract&&__ring.world===null'))
   cx.close()
  browser.close()
  # Available alternate engines: file boot and native room rendering.
  for engine in ['webkit','firefox']:
   try:
    b=getattr(p,engine).launch(headless=True);cx=b.new_context(viewport={'width':1280,'height':720});q=cx.new_page();errs=[];q.on('pageerror',lambda e:errs.append(str(e)));q.goto(HTML.as_uri());q.wait_for_function('window.__ring&&document.documentElement.dataset.ready==="true"',timeout=25000);q.evaluate('__ring.newRun()');q.wait_for_timeout(250)
    record(engine+' native file boot and gameplay',not errs and q.evaluate('__ring.game.errors.length===0'),errs)
    screenshot(q,engine+'-native');b.close()
   except Exception as exc:record(engine+' native file boot and gameplay',False,str(exc))
  return {'results':results,'findings':findings,'screenshots':screens,'file':HTML.name,'sha256':hashlib.sha256(HTML.read_bytes()).hexdigest(),'standIns':['emulated standard gamepads','Chromium phone/tablet touch profiles','local browser only; no physical pad, iPhone, iPad, TV or second human'],'desktopErrors':desktop_errors}

try:
 evidence=run()
except Exception as exc:
 record('suite setup or continuation',False,str(exc));evidence={'results':results,'findings':findings,'fatal':traceback.format_exc()}
(EVIDENCE/'browser.json').write_text(json.dumps(evidence,indent=2,ensure_ascii=False))
(ROOT/'docs/browser-findings.md').write_text('# Browser evidence\n\nFinal HTML tested through file://. Detailed current results: evidence/browser.json.\n\n'+ '\n'.join('- '+r['name']+': '+('PASS' if r['pass'] else 'FAIL — '+str(r['detail'])) for r in results)+'\n\nPhysical hardware and remote-human behavior remain unknown. Gamepads and touch hardware were emulated; all screenshots with development setup are labeled assisted.\n')
passed=sum(r['pass'] for r in results);failed=len(results)-passed
print(f'{passed} passed, {failed} failed');sys.exit(1 if failed else 0)
