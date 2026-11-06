from pathlib import Path
import json,time
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
URL=(ROOT.parent/(ROOT.name+'.html')).as_uri()
PAD='''window.__pad={id:'DualSense Wireless Controller (STANDARD GAMEPAD)',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[__pad,null,null,null];'''
results=[]
def check(name,func):
 try:func();results.append({'name':name,'pass':True})
 except Exception as e:results.append({'name':name,'pass':False,'error':str(e)})
def expect(condition,message='assertion failed'):
 if not condition:raise AssertionError(message)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--use-vulkan=swiftshader','--use-angle=swiftshader'])
 ctx=browser.new_context(viewport={'width':1280,'height':720})
 ctx.add_init_script('window.__surgeryTestNoGPU=true;'+PAD)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(URL);page.wait_for_function('window.__game',timeout=60000)
 def status():return page.evaluate('__game.status()')
 def do(v):page.evaluate('(c)=>__game.do(c)',v)
 def wait(js,timeout=7000):page.wait_for_function(js,timeout=timeout)
 def pad(button,down=True):page.evaluate('([i,b])=>{__pad.buttons[i].pressed=b;__pad.buttons[i].value=b?1:0;__pad.timestamp++;}',[button,down]);page.wait_for_timeout(70)
 def tap(button):pad(button);pad(button,False)
 def point(x,z):
  return page.evaluate('([x,z])=>{const a=__game.project(x,z),r=document.querySelector("#stage").getBoundingClientRect();return [r.left+a[0]*r.width/1920,r.top+a[1]*r.height/1080]}',[x,z])
 check('single-file boot and music default',lambda:expect(status()['title']=='Trauma Refrain: Third Opinion' and status()['settings']['music']==.1 and not errors))
 def keyboard_menu():
  page.keyboard.press('Enter');expect(status()['screen']=='menu');page.keyboard.press('Enter');expect(status()['screen']=='difficulty')
 check('keyboard menu navigation',keyboard_menu)
 def pad_menu():
  tap(13);expect(status()['focus']==1);tap(0);expect(status()['screen']=='story');expect(status()['device']=='pad')
 check('DualSense menu and prompt detection',pad_menu)
 def story():
  do({'action':'advance'});a=page.locator('.story-text').inner_text();page.wait_for_timeout(100);expect(page.locator('.story-text').inner_text()==a,'revealed text regressed');do({'action':'skipstory'});expect(status()['screen']=='chart')
 check('story reveal and skip to chart',story)
 def mouse_menu():
  do({'action':'title'});page.keyboard.press('Enter');el=page.locator('[data-action="codeblue"]');el.hover();expect('focused' in el.get_attribute('class'));el.click();expect(status()['sim']['blue'])
 check('mouse hover focus and Code Blue entry',mouse_menu)
 def tool_digits():
  do({'load':0});page.keyboard.press('6');wait('__game.status().sim.surgeons[0].tool===5');expect(status()['device']=='keyboard')
 check('instrument digit input',tool_digits)
 def gel_gesture():
  page.mouse.move(*point(-4,0));page.mouse.down();wait('(__game.status().sim.surgeons[0].held&1)!==0');page.evaluate('__game.step(95,false)');page.mouse.up();expect(not status()['sim']['hazards'][0]['alive'],'gel was not painted')
 check('actual mouse paint gesture',gel_gesture)
 def forceps_gesture():
  page.keyboard.press('2');page.mouse.move(*point(-1.2,-1.1));page.mouse.down();wait('__game.status().sim.surgeons[0].grabbed!==null');page.mouse.move(*point(-1.2,-2.4),steps=12);wait('!__game.status().sim.hazards[1].alive');page.mouse.up()
 check('actual mouse forceps pull gesture',forceps_gesture)
 def suture_gesture():
  do({'type':'phase','phase':2});page.keyboard.press('3');page.mouse.move(*point(-1.6,.95));page.mouse.down()
  for n in range(10):
   g=status()['sim'];h=g['hazards'][0]
   if g['phase']!=2 or not h['alive']:break
   x=-2+4*min(.95,h['progress']+.08);z=.6+(-.35 if n%2 else .35);page.mouse.move(*point(x,z),steps=4);page.wait_for_timeout(90)
  page.mouse.up();expect(status()['sim']['phase']>2 or not status()['sim']['hazards'][0]['alive'],'zigzag did not produce stitches')
 check('actual mouse suture crossings',suture_gesture)
 def laser_gesture():
  do({'load':1});do({'type':'phase','phase':1});page.keyboard.press('5');page.mouse.move(*point(-3,-1));page.mouse.down();wait('__game.status().sim.surgeons[0].charge>.8');page.mouse.up();wait('!__game.status().sim.hazards[0].alive')
 check('actual laser hold and release',laser_gesture)
 def keyboard_defib():
  do({'load':2});do({'type':'code'});page.keyboard.down('Shift');page.keyboard.down('e');wait('__game.status().sim.surgeons[0].charge>1.2');do({'type':'mirror','state':{'beat':.01}});page.keyboard.up('e');page.keyboard.up('Shift');wait('__game.status().sim.code===0');expect(status()['sim']['vitals']>0)
 check('keyboard-only resuscitation chord',keyboard_defib)

 def keyboard_cursor():
  do({'load':0});before=status()['sim']['surgeons'][0]['cursor'];page.keyboard.down('d');page.wait_for_timeout(160);page.keyboard.up('d');expect(status()['sim']['surgeons'][0]['cursor'][0]>before[0]+.4)
 check('keyboard-only cursor movement',keyboard_cursor)

 def mouse_gift():
  do({'load':3});do({'type':'gift'});el=page.locator('#gift-button');el.hover();page.mouse.down();wait('__game.status().sim.surgeons[0].gift_hold>.3');do({'type':'mirror','state':{'beat':.01}});page.mouse.up();wait('__game.status().sim.gift_left>0');expect('gift:Hush' in status()['sim']['coverage'])
 check('mouse gift hold and beat release',mouse_gift)
 def local_join():
  do({'load':0});page.evaluate("__pad2={...__pad,index:1,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[__pad,__pad2,null,null];__pad2.buttons[0].pressed=true;__pad2.buttons[0].value=1")
  page.wait_for_timeout(120);page.evaluate('__pad2.buttons[0].pressed=false;__pad2.buttons[0].value=0;__pad2.axes[2]=1');page.wait_for_timeout(200);expect(status()['sim']['surgeons'][1]['active']);expect(status()['sim']['surgeons'][1]['cursor'][0]>.4)
  page.evaluate('navigator.getGamepads=()=>[__pad,null,null,null]');page.wait_for_timeout(100);expect(not status()['sim']['surgeons'][1]['active'])
 check('local second controller joins and disconnects',local_join)

 def flick():
  page.evaluate('__pad.axes[0]=1;__pad.timestamp++');page.wait_for_timeout(120);expect(status()['sim']['surgeons'][0]['tool']==2);page.evaluate('__pad.axes[0]=0;__pad.timestamp++');pad(7);expect(status()['sim']['surgeons'][0]['held']&1);pad(7,False)
 check('DualSense flick and analog trigger',flick)
 def pause_dev():
  tap(9);expect(status()['screen']=='pause');do({'action':'dev'});expect(status()['screen']=='dev');el=page.locator('[data-tune="drain"]');el.fill('2');el.dispatch_event('input');expect(abs(status()['sim']['tune']['drain']-2)<.01);do({'action':'devreset'});expect(status()['sim']['tune']['drain']==1)
 check('pause to dev live sliders and reset',pause_dev)
 def paused_settings_stay_paused():
  do({'load':2});do({'screen':'pause'});do({'action':'settings'});do({'idle':11000});page.wait_for_timeout(150);expect(status()['screen']=='settings' and status()['sim']['case']==2);do({'action':'back'});expect(status()['screen']=='pause')
 check('pause settings never replace the case with attract mode',paused_settings_stay_paused)

 def checkpoint():
  do({'type':'phase','phase':2});do({'type':'kill'});before=time.monotonic();do({'action':'retry'});expect(status()['sim']['phase']==2 and status()['screen']=='operation');expect(time.monotonic()-before<2)
 check('checkpoint retry under two seconds',checkpoint)
 def audio():
  page.keyboard.press('Escape');page.evaluate('__game.sound()');page.wait_for_timeout(120);expect(status()['audioPeak']>.001,'synthesized output is silent')
 check('Web Audio output is non-silent',audio)
 def settings_persist():
  do({'action':'settings'});do({'action':'settingstab:1'});do({'action':'setting:glyphs'});expect(status()['glyphs']=='Xbox');page.reload();page.wait_for_function('window.__game');expect(status()['glyphs']=='Xbox');do({'action':'settings'});do({'action':'resetsettings'});expect(status()['settings']['music']==.1)
 check('settings and prompt preference persist',settings_persist)
 def attract():
  do({'action':'title'});do({'idle':10050});wait('__game.status().screen==="attract"');page.keyboard.press('k');wait('__game.status().screen==="title"');do({'idle':10050});wait('__game.status().screen==="attract"');tap(0);expect(status()['screen']=='title')
 check('attract idle threshold and key/pad exit',attract)
 def campaign():
  do({'scene':'surgery/campaign'});g=page.evaluate('__game.step(120000,true)');expect(g['outcome']=='won' and len(g['completed'])==8);expect(all('tool:'+str(i) in g['coverage'] for i in range(9)));expect(all('gift:'+x in g['coverage'] for x in ['Hush','Echo','Duet']))
 check('full browser campaign and feature coverage',campaign)
 def about():
  do({'action':'about'});text=page.locator('#ui').inner_text();expect(all(k in text for k in ['Credits','Source Information','Testing Feedback','Engine Feedback','Prompt Feedback']),text);do({'action':'aboutsection:1'});do({'action':'aboutnext:15'});expect('Trauma Center: Second Opinion' in page.locator('#ui').inner_text(),page.locator('#ui').inner_text())
 check('About includes all required sections',about)

 def layout_bounds():
  for n in range(8):
   do({'load':n});do({'screen':'chart'});v=page.evaluate("(()=>{const p=document.querySelector('.patient-chart'),b=p.querySelector('.menu-button.primary');return {background:getComputedStyle(p).backgroundColor,p:p.getBoundingClientRect().bottom,b:b.getBoundingClientRect().bottom}})()")
   expect(v['background']=='rgb(242, 238, 220)',str(v));expect(v['b']<=v['p']+1,'case '+str(n)+' chart button overflows '+str(v))
  do({'load':3});page.evaluate('__game.step(30000,true)');expect(page.evaluate("(()=>{let p=document.querySelector('.result-sheet');return p.querySelector('.menu-button').getBoundingClientRect().bottom<=p.getBoundingClientRect().bottom+1})()"),'results button overflows')
  do({'load':0});do({'screen':'pause'});do({'action':'settings'});do({'action':'settingstab:1'});expect(page.evaluate("(()=>{let p=document.querySelector('.panel-shell');return [...p.querySelectorAll('button,input')].every(e=>e.getBoundingClientRect().bottom<=p.getBoundingClientRect().bottom+1)})()"),'settings overflow')
  do({'screen':'pause'});do({'action':'dev'})
  for n in range(8):
   expect(page.evaluate("(()=>{let p=document.querySelector('.panel-shell');return [...p.querySelectorAll('button,input')].every(e=>e.getBoundingClientRect().bottom<=p.getBoundingClientRect().bottom+1)})()"),'dev page '+str(n)+' overflow');do({'action':'devnext'})
 check('all charts, results, settings and dev pages fit',layout_bounds)

 check('no browser script errors',lambda:expect(not errors,json.dumps(errors)))
 ctx.close()
 mobile=browser.new_context(**p.devices['iPhone SE']);mobile.add_init_script('window.__surgeryTestNoGPU=true;');mp=mobile.new_page();mp.goto(URL);mp.wait_for_function('window.__game')
 def touch_only():
  expect(mp.locator('#touch-note').is_visible());expect('Controller or keyboard required' in mp.locator('#touch-note').inner_text());mp.locator('#touch-settings').tap();expect(mp.locator('[data-setting="music"]').is_visible());expect(mp.evaluate('__game.status().screen')=='settings');expect(mp.locator('[data-setting="music"]').bounding_box()['width']>100)
  for tab in range(3):
   mp.evaluate('(n)=>__game.do({action:"settingstab:"+n})',tab)
   expect(mp.evaluate("(()=>{let p=document.querySelector('.panel-shell');return [...p.querySelectorAll('button,input')].every(e=>e.getBoundingClientRect().bottom<=innerHeight)})()"),'mobile settings page '+str(tab)+' overflows')
 check('touch-only message and usable settings',touch_only)
 def touch_attract():
  mp.evaluate('__game.do({action:"back"});__game.do({idle:10050})');mp.wait_for_function('__game.status().screen==="attract"');mp.touchscreen.tap(100,100)
  # A touch is an exit gesture even though it never becomes a gameplay control.
  mp.wait_for_timeout(100);expect(mp.evaluate('__game.status().screen')=='title')
 check('touch attract and tap exit',touch_attract)
 def keyboard_unlock():
  mp.keyboard.press('k');mp.wait_for_function('!__game.status().touchOnly');mp.wait_for_timeout(70);expect(not mp.locator('#touch-note').is_visible())
 check('a keyboard unlocks the touch-only title',keyboard_unlock)
 mobile.close();browser.close()
 with p.webkit.launch(headless=True) as webkit:
  wp=webkit.new_page(**p.devices['iPhone 13']);wp.goto(URL);wp.wait_for_function('window.__game',timeout=60000)
  check('WebKit graceful WebGPU requirement and phone UI',lambda:expect(wp.locator('#touch-note').is_visible() and wp.locator('#gpu-note').is_visible()))
(ROOT/'tests/out/browser-results.json').write_text(json.dumps(results,indent=2))
for r in results:
 if not r['pass']:print('FAIL '+r['name']+': '+r['error'])
print(json.dumps({'passed':sum(r['pass'] for r in results),'failed':sum(not r['pass'] for r in results)}))
