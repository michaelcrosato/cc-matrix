# @file Browser input, accessibility, persistence and viewport integration checks.
import json,sys,time
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path.cwd(); GAME=ROOT.parent/'Wobble-Fit-Wii-Fit-gpt-6.1-sol-max-20261104-224022.html'
OUT=ROOT/'out/game'; OUT.mkdir(parents=True,exist_ok=True)
failures=[]; passed=0

def check(name,fn):
 global passed
 try: fn(); passed+=1
 except Exception as e:
  failures.append(name+': '+str(e).split('\n')[0]+' '+str(page.evaluate('window.__game')));print('FAIL '+failures[-1],flush=True)
def require(value,message):
 if not value: raise AssertionError(message)
PAD="""window.__pad={id:'DualSense Wireless Controller',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[window.__pad];"""
FLAGS=['--no-sandbox','--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader']
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=FLAGS)
 ctx=browser.new_context(viewport={'width':1280,'height':720})
 ctx.add_init_script(PAD)
 page=ctx.new_page(); errors=[]; external=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:external.append(r.url) if r.url.startswith('http') else None)
 page.goto(GAME.as_uri(),wait_until='load')
 check('Chromium WebGPU boot',lambda:page.wait_for_function('window.__engine?.ready===true && window.__game?.ready===true',timeout=90000))
 check('zero startup errors',lambda:require(not errors and page.evaluate('__engine.errors.length')==0,str(errors)))
 check('offline single file',lambda:require(not external,str(external)))
 check('10 percent music',lambda:require(page.evaluate('__game.volumes.music')==.1,'Fresh music volume'))
 page.mouse.move(10,10)
 def keyboard_start():
  page.keyboard.press('Enter');page.wait_for_function('__game.screen==="arrival"')
  page.keyboard.press('ArrowDown',delay=80);page.keyboard.press('ArrowDown',delay=80);page.keyboard.press('Enter',delay=80)
  page.wait_for_function('__game.screen==="programme"')
  page.keyboard.press('Enter');page.wait_for_function('__game.mode==="event" && __game.event==="check"')
  page.keyboard.down('d');page.wait_for_function('__game.balance.x>.2',timeout=20000);page.keyboard.up('d')
  require(page.evaluate('__game.balance.x')>.02,'Right lean did not move balance')
 check('keyboard begins and leans',keyboard_start)
 def pause_and_dev():
  page.keyboard.press('Escape');page.wait_for_function('__game.screen==="pause"')
  page.locator('[data-action=tools]').click();page.locator('[data-action=dev]').click()
  page.wait_for_selector('[data-action="game.wobble.gain"]')
  page.locator('input[data-slider="0"]').fill('22')
  require(page.evaluate('__engine.state().settings["game.wobble.gain"]')==22,'Live slider did not change sim setting')
  page.locator('[data-action=devtools]').click();page.locator('[data-action=reset]').click()
  require(page.evaluate('__engine.state().settings["game.wobble.gain"]??14')==14,'Reset failed')
  page.keyboard.press('Escape');page.keyboard.press('Escape');page.locator('[data-action=resume]').click()
 check('pause dev slider and reset',pause_and_dev)
 def settings_persist():
  page.keyboard.press('Escape');page.locator('[data-action=settings]').click()
  page.locator('input[data-slider="0"]').fill('0.23')
  page.locator('[data-action=xbox]').click()
  require(page.evaluate('__game.glyphSet')=='Xbox','Glyph preference')
  page.reload();page.wait_for_function('__engine.ready===true && __game.ready===true',timeout=90000)
  require(page.evaluate('__game.volumes.music')==.23,'Music did not persist')
  require(page.evaluate('__game.glyphSet')=='Xbox','Glyph setting did not persist')
 check('settings persist on reload',settings_persist)
 def hover():
  item=page.locator('[data-action=about]');item.hover()
  require(page.evaluate('__game.focus')==3,'Mouse hover did not move focus')
  item.click();require(page.evaluate('__game.lastDevice')=='mouse','Mouse prompt family')
  texts=[]
  for i in range(6): texts.append(page.locator('#shell').inner_text());page.locator('[data-action=next]').click()
  alltext='\n'.join(texts)
  for field in ['Source Information','Testing Feedback','Engine Feedback','Prompt Feedback','Credits','added on import','PLAN.md','Wii Fit']:require(field in alltext,'Missing About field '+field)
  page.mouse.move(2,2);page.wait_for_function('__game.screen==="about"',timeout=10000)
  page.locator('[data-action=back]').click()
 check('mouse focus and complete About',hover)
 def pad_press(button):
  page.evaluate('(n)=>{__pad.buttons[n]={pressed:true,touched:true,value:1};__pad.timestamp++;}',button)
  page.wait_for_function('__game.lastDevice==="pad"',timeout=10000)
  page.wait_for_timeout(120)
  page.evaluate('(n)=>{__pad.buttons[n]={pressed:false,touched:false,value:0};__pad.timestamp++;}',button)
  page.wait_for_timeout(180)
 def controller():
  page.reload();page.wait_for_function('__engine.ready && __game.ready',timeout=90000)
  pad_press(13);require(page.evaluate('__game.lastDevice')=='pad','Pad did not become active')
  pad_press(1)
  page.evaluate('document.querySelector("[data-action=begin]")?.dispatchEvent(new MouseEvent("pointerenter"))')
  pad_press(0)
  page.wait_for_function('__game.screen==="arrival"')
  pad_press(13);pad_press(13);pad_press(0)
  page.wait_for_function('__game.screen==="programme"')
  pad_press(0);page.wait_for_function('__game.mode==="event"')
  page.evaluate('__pad.axes[0]=.7');page.wait_for_function('__game.balance.x>.15',timeout=20000);page.evaluate('__pad.axes[0]=0')
  require(page.evaluate('__game.balance.x')>.01,'Pad lean did not reach sim')
  pad_press(9);page.wait_for_function('__game.screen==="pause"')
 check('standard pad navigation and lean',controller)
 def activity_screens():
  page.keyboard.press('Escape')
  for event,tick,name in [('pose',900,'pose'),('pond',600,'pond'),('line',900,'line'),('garden',450,'garden'),('tilt',8700,'tilt')]:
   page.evaluate('([id,tick])=>{__engine.actions.run("game.start",{event:id});__engine.pause();__engine.step(tick);}',[event,tick])
   page.wait_for_function('([id,tick])=>__game.screen==="play" && __game.event===id && __game.tick>=tick',arg=[event,tick],timeout=20000)
   page.wait_for_timeout(200)
   require(page.evaluate('__engine.errors.length')==0,'Activity engine error '+event)
  page.evaluate('__engine.actions.run("game.finish",{score:800})');page.wait_for_timeout(400)
 check('activity views and finale render',activity_screens)
 def attract():
  page.evaluate('__engine.actions.run("game.front");__engine.resume()')
  # A real menu action resets the visual shell as well.
  page.keyboard.press('Escape');page.wait_for_timeout(200)
  if page.locator('[data-action=quit]').count():page.locator('[data-action=quit]').click()
  else:
   page.reload();page.wait_for_function('__engine.ready',timeout=90000)
  page.keyboard.press('ArrowUp');page.keyboard.press('ArrowDown')
  before=page.evaluate('JSON.stringify(__game.progress)')
  page.wait_for_function('__game.attract',timeout=16000)
  require(page.evaluate('__game.event')=='pose','Attract did not begin with a pose')
  page.keyboard.press('KeyZ');page.wait_for_function('!__game.attract')
  require(page.evaluate('__game.screen')=='title','Attract did not restore title')
  require(page.evaluate('JSON.stringify(__game.progress)')==before,'Attract changed save')
 check('attract timing exits and save isolation',attract)
 def pause_settings_idle():
  page.evaluate('__engine.actions.run("game.start",{event:"pose"});__engine.resume()');page.wait_for_function('__game.event==="pose"&&__game.screen==="play"')
  page.keyboard.press('Escape');page.wait_for_function('__game.screen==="pause"');page.locator('[data-action=settings]').click()
  page.wait_for_timeout(11200)
  require(not page.evaluate('__game.attract') and page.evaluate('__game.event')=='pose','Attract interrupted a paused class')
  page.locator('[data-action=back]').click();page.locator('[data-action=quit]').click()
 check('in-game settings preserve a paused class',pause_settings_idle)
 def local_mixed():
  page.reload();page.wait_for_function('__engine.ready && __game.ready',timeout=90000)
  require(page.evaluate('(()=>{const f=__engine.state("retreat").entities[0].retreat.data;return f.day===__game.progress.day&&f.pebbles===__game.progress.pebbles;})()'),'Title did not hydrate saved progress')
  page.locator('[data-action=group]').click();page.locator('[data-action=begin]').click()
  try:
   page.keyboard.down('d');page.evaluate('__pad.axes[0]=-.7')
   page.wait_for_function("()=>{const r=__engine.state('retreat').entities[0].retreat.data.event;return r.id==='group'&&r.inputs[0]?.x>.8&&r.inputs[1]?.x<-.5;}",timeout=30000)
   state=page.evaluate("""()=>{let r=__engine.state('retreat').entities[0].retreat.data.event;const values=r.inputs.flatMap(i=>i?[i.x,i.y,i.l,i.r,i.act?2:1]:[0,0,0,0,0]);__engine.step(Math.max(1,420-r.tick),{'game:seats':values});r=__engine.state('retreat').entities[0].retreat.data.event;return {x:r.seats[0].x,y:r.seats[1].x};}""")
   require(state['x']>.08 and state['y']<-.08,'Local mats did not move independently: '+str(state))
  finally:
   page.keyboard.up('d');page.evaluate('__pad.axes[0]=0')
 check('keyboard and pad have independent local mats',local_mixed)
 def sandbox():
  before=page.evaluate('JSON.stringify(__game.progress)')
  page.keyboard.press('Escape');page.wait_for_function('__game.screen==="pause"')
  page.locator('[data-action=tools]').click();page.locator('[data-action=dev]').click();page.locator('[data-action=devtools]').click()
  page.locator('[data-action=next]').click();page.locator('[data-action=next]').click();page.locator('[data-action=sandbox]').click()
  page.locator('[data-action=pebbles]').click();page.evaluate('__engine.actions.run("game.leave")')
  page.wait_for_function('(before)=>__game.progress.pebbles>JSON.parse(before).pebbles',arg=before)
  page.locator('[data-action=sandbox]').click()
  page.wait_for_function('(before)=>JSON.stringify(__game.progress)===before',arg=before,timeout=30000)
  require(page.evaluate('(()=>{const f=__engine.state("retreat").entities[0].retreat.data;return f.pebbles===__game.progress.pebbles;})()'),'Sandbox leaked live state')
 check('throwaway residency restores saved and live progress',sandbox)
 def rebind():
  page.keyboard.press('Escape');page.keyboard.press('Escape');page.wait_for_function('__game.screen==="pause"')
  page.locator('[data-action=tools]').click();page.locator('[data-action=controls]').click();page.locator('[data-action=rebind]').click()
  page.keyboard.press('r');page.keyboard.press('t');page.wait_for_selector('[data-action=reset-bindings]')
  require(page.locator('#shell [data-glyph=left]').first.inner_text()=='R','Left prompt did not follow rebind')
  page.locator('[data-action=back]').click();page.locator('[data-action=resume]').click()
  page.evaluate('__engine.actions.run("game.start",{event:"pond"});__engine.resume()');page.wait_for_function('__game.event==="pond"&&__game.screen==="play"')
  page.keyboard.down('r');page.wait_for_function('__engine.state("retreat").entities[0].retreat.data.event.composure<1000',timeout=15000);page.keyboard.up('r')
  page.keyboard.press('Escape');page.wait_for_function('__game.screen==="pause"');page.locator('[data-action=tools]').click();page.locator('[data-action=controls]').click();page.locator('[data-action=reset-bindings]').click()
  page.keyboard.press('z')
  require(page.locator('#shell [data-glyph=left]').first.inner_text()=='Q','Defaults did not restore')
 check('keyboard rebind updates prompts and live controls',rebind)
 check('no browser or engine errors after play',lambda:require(not errors and page.evaluate('__engine.errors.length')==0,str(errors)))
 ctx.close();browser.close()
 # Touch-only on WebGPU Chromium, including a tappable Settings button during attract.
 browser=p.chromium.launch(headless=True,args=FLAGS)
 ctx=browser.new_context(**p.devices['iPhone 13']);page=ctx.new_page()
 page.goto(GAME.as_uri());page.wait_for_function('__engine.ready',timeout=90000)
 def touch():
  require(page.locator('#shell').inner_text().find('Controller or keyboard required')>=0,'Missing touch notice')
  require(page.locator('[data-action=begin]').count()==0,'Touch can begin play')
  page.wait_for_function('__game.attract',timeout=16000)
  button=page.locator('[data-touch-settings]');button.tap();page.wait_for_function('__game.screen==="settings"')
  require(page.locator('.touch-stick, [data-touch-action]').count()==0,'Touch controls are present')
 check('touch-only message settings and attract',touch)
 ctx.close();browser.close()
 # Safari engine gets the honest WebGPU requirement page, with accessible preferences.
 for engine in [p.webkit,p.firefox]:
  browser=engine.launch(headless=True);page=browser.new_page(viewport={'width':390,'height':844})
  page.goto(GAME.as_uri())
  def unsupported():
   page.wait_for_selector('.no-gpu')
   require('WebGPU' in page.locator('#shell').inner_text(),'No friendly unsupported page')
   page.locator('[data-action=settings]').click();page.locator('[data-action=back]').click()
   require(page.locator('.no-gpu').count()==1,'Back lost unsupported-browser message')
   require(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Horizontal overflow')
  check(engine.name+' unsupported-browser UI',unsupported)
  browser.close()
print(f'{passed} browser checks passed; {len(failures)} failed')
(OUT/'browser-report.json').write_text(json.dumps({'passed':passed,'failures':failures},indent=2)+'\n')
sys.exit(bool(failures))
