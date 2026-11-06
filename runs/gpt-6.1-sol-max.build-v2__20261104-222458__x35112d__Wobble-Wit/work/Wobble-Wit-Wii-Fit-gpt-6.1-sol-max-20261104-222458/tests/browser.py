from pathlib import Path
import json,traceback
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2];PAGE=ROOT/'Wobble-Wit-Wii-Fit-gpt-6.1-sol-max-20261104-222458.html';passed=0;failed=0
PAD="""(()=>{const b=()=>({pressed:false,touched:false,value:0});const p={id:'DualSense Wireless Controller (STANDARD GAMEPAD)',index:0,connected:true,mapping:'standard',timestamp:1,axes:[0,0,0,0],buttons:Array.from({length:17},b)};navigator.getGamepads=()=>[p,null,null,null];window.__setPad=(axes,on)=>{p.axes=axes;p.timestamp++;p.buttons.forEach((b,i)=>{b.pressed=on.includes(i);b.touched=b.pressed;b.value=b.pressed?1:0;});};window.__audioProbe={count:0,peak:0};if(window.AudioBufferSourceNode){const old=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer){const a=this.buffer.getChannelData(0);let peak=0;for(let i=0;i<a.length;i++)peak=Math.max(peak,Math.abs(a[i]));__audioProbe.peak=Math.max(__audioProbe.peak,peak);__audioProbe.count++;}return old.apply(this,args);};}})();"""
def check(ok,label):
 global passed,failed
 if ok:passed+=1;Path(__file__).resolve().parents[1].joinpath('notes/browser-stage.txt').write_text(label)
 else:failed+=1;print('FAIL '+label)
def status(p):return p.evaluate('JSON.parse(window.__gameStatus)')
def wait_screen(p,name):p.wait_for_function('(name)=>JSON.parse(window.__gameStatus||"null")?.screen===name',arg=name,timeout=45000)
def click_item(p,id):
 rect=p.evaluate('(id)=>JSON.parse(window.__gameUi).find(x=>x[0]===id)?.[1]',id);assert rect,f'UI item {id} missing';p.mouse.click((rect[0]+rect[2])/2,(rect[1]+rect[3])/2)
with sync_playwright()as pw:
 browser=pw.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'])
 try:
  p=browser.new_page(viewport={'width':320,'height':180},device_scale_factor=1);errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.add_init_script(PAD);p.goto(PAGE.as_uri());p.wait_for_function('window.__gameStatus',timeout=120000);wait_screen(p,'Title');check(status(p)['title']=='Wobble Wit','boots correct title');tick=status(p)['tick'];p.wait_for_function('(n)=>JSON.parse(__gameStatus).tick>n',arg=tick,timeout=30000);check(True,'render loop advances');check(not errors,'no boot page errors')
  p.keyboard.press('ArrowDown');p.wait_for_function('JSON.parse(__gameStatus).focus===1',timeout=30000);check(True,'keyboard moves focus');p.keyboard.press('ArrowUp');p.wait_for_function('JSON.parse(__gameStatus).focus===0',timeout=30000)
  p.evaluate('__setPad([0,0,0,0],[13])');p.wait_for_function('JSON.parse(__gameStatus).device===1&&JSON.parse(__gameStatus).focus===1',timeout=45000);p.evaluate('__setPad([0,0,0,0],[])');check(status(p)['focus']==1,'pad dpad moves focus')
  p.evaluate('__setPad([0,0,0,0],[0])');wait_screen(p,'Pass');p.evaluate('__setPad([0,0,0,0],[])');check(True,'pad confirms Play Together');p.keyboard.press('Escape');wait_screen(p,'Title')
  click_item(p,2);wait_screen(p,'Settings');check(abs(status(p)['settings']['music']-.1)<.00001,'music starts at ten percent');
  for focus in [1,2,3]:
   p.keyboard.press('ArrowDown');p.wait_for_function('(n)=>JSON.parse(__gameStatus).focus===n',arg=focus,timeout=15000)
  p.keyboard.press('Enter');p.wait_for_function('JSON.parse(__gameStatus).settings.xbox===true',timeout=15000);check(True,'Xbox glyph option changes');p.keyboard.press('Escape');wait_screen(p,'Title')
  # Mouse hover and click are the same sim-owned choices as keyboard and pad.
  rect=p.evaluate('JSON.parse(__gameUi).find(x=>x[0]===0)[1]');p.mouse.move((rect[0]+rect[2])/2,(rect[1]+rect[3])/2);p.wait_for_function('JSON.parse(__gameStatus).focus===0',timeout=15000);check(True,'mouse hover focuses');click_item(p,0);wait_screen(p,'Guest');check(status(p)['device']==2,'mouse click activates and changes prompts');p.keyboard.press('Enter');wait_screen(p,'Name');p.keyboard.press('Enter');wait_screen(p,'Look');click_item(p,2);wait_screen(p,'Intro');check(True,'new guest reaches reception dialogue')
  for _ in range(6):
   before=status(p)['tick'];p.keyboard.press('Space');p.wait_for_function('(n)=>JSON.parse(__gameStatus).tick>n',arg=before,timeout=30000)
  wait_screen(p,'Card');check(status(p)['event']=='wobble-check','new stay opens morning check');p.keyboard.press('Enter');wait_screen(p,'Countdown');check(True,'activity countdown starts');p.keyboard.press('Escape');wait_screen(p,'Pause');t=status(p)['eventTime'];p.wait_for_timeout(300);check(status(p)['eventTime']==t,'pause freezes activity');p.keyboard.press('F1');p.wait_for_timeout(100);check(status(p)['screen']=='Pause','engine F1 is disabled');check(p.evaluate('__audioProbe.count>0&&__audioProbe.peak>0'),'synth produces audible buffers');p.close()
  # Attract timing is tested in simulation ticks, with real browser input used to exit.
  p=browser.new_page(viewport={'width':320,'height':180},device_scale_factor=1);p.goto(PAGE.as_uri());p.wait_for_function('window.__gameStatus',timeout=120000);p.wait_for_function('JSON.parse(__gameStatus).demo',timeout=120000);check(True,'attract starts after menu idling');p.keyboard.press('Enter');wait_screen(p,'Title');check(not status(p)['demo'],'any key exits attract');p.close()
  for device in ['Pixel 10','Galaxy Tab S9']:
   opts={k:v for k,v in pw.devices[device].items()if k!='default_browser_type'};opts['device_scale_factor']=1;opts['viewport']={'width':400,'height':600};ctx=browser.new_context(**opts);p=ctx.new_page();p.goto(PAGE.as_uri());p.wait_for_function('window.__gameStatus',timeout=120000);p.locator('#touch-card').wait_for(state='visible',timeout=30000);check('Controller or keyboard required' in p.locator('#touch-card').inner_text(),device+' touch requirement');check(status(p)['demo'],device+' attract running');p.locator('#touch-open').tap();p.locator('#touch-settings').wait_for(state='visible');wait_screen(p,'Settings');check(True,device+' Settings tap');p.locator('#touch-music').evaluate('(e)=>{e.value="25";e.dispatchEvent(new Event("input",{bubbles:true}));}');p.wait_for_function('Math.abs(JSON.parse(__gameStatus).settings.music-.25)<.01',timeout=20000);check(True,device+' live volume slider');check(p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),device+' no horizontal overflow');ctx.close()
 finally:browser.close()
 webkit=pw.webkit.launch(headless=True)
 try:
  ctx=webkit.new_context(**{k:v for k,v in pw.devices['iPhone SE (3rd gen)'].items()if k!='default_browser_type'});p=ctx.new_page();p.goto(PAGE.as_uri());p.wait_for_timeout(700);text=p.locator('#msg').inner_text();check('Controller or keyboard required' in text and 'WebGPU' in text,'WebKit iPhone fallback states both requirements');p.locator('#fallback-settings').tap();check(p.locator('#touch-settings').is_visible(),'fallback Settings opens');check(p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'WebKit phone no overflow');ctx.close()
 finally:webkit.close()
print(f'{passed} passed, {failed} failed')
raise SystemExit(bool(failed))
