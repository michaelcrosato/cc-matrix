from playwright.sync_api import sync_playwright
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
import importlib.util,json,sys,time
ROOT=Path(__file__).resolve().parent
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
server=ThreadingHTTPServer(('127.0.0.1',0),Quiet)
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/index.html'
failures=[];count=0

def check(name,condition):
 global count
 count+=1
 if not condition:failures.append(name)

PAD="""window.__pad={connected:true,index:0,id:'Test DualSense',mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0,touched:false}))};navigator.getGamepads=()=>[window.__pad];"""
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'])
 context=browser.new_context(viewport={'width':1920,'height':1080},has_touch=True)
 context.add_init_script(PAD)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  page.goto(url,wait_until='domcontentloaded');page.wait_for_function('window.__coast?.ready||window.__coastError',timeout=60000)
  check('Page identity',page.title()=='Californiroll Games')
  check('WebGPU r180 initialized',page.evaluate('window.__coast?.rendererInfo().webgpu && __coast.rendererInfo().revision==="180"'))
  page.wait_for_function('__coast.frames>5')
  check('GPU device survives actual rendering',page.evaluate('!__coast.renderer._isDeviceLost && __coast.renderer.info.render.drawCalls>0'))
  check('Title has no viewport overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight'))
  page.keyboard.press('Enter');page.wait_for_function('__coast.screen==="brief"')
  check('Brief gives all three event instructions',page.locator('.steps li').count()==3)
  page.keyboard.press('Enter');page.wait_for_function('__coast.game.state.phase==="play"')
  page.keyboard.down('ArrowRight');page.wait_for_function('__coast.game.state.time<44.9');page.keyboard.up('ArrowRight')
  check('Keyboard starts actual physics',page.evaluate('__coast.game.stats.physicsSteps>0 && __coast.game.state.time<45'))
  page.keyboard.press('Escape');page.wait_for_function('__coast.screen==="pause"')
  before=page.evaluate('__coast.game.state.time');page.wait_for_timeout(180)
  check('Pause freezes event clock',page.evaluate('__coast.game.state.time')==before)
  page.get_by_role('button',name='Dev mode',exact=True).click()
  page.locator('input[data-tune=speed]').fill('1.5');page.locator('input[data-tune=speed]').dispatch_event('input')
  check('Live dev slider changes model',page.evaluate('__coast.game.tune.speed===1.5'))
  page.get_by_role('button',name='Invincible: OFF').click()
  check('Dev invincibility toggle',page.evaluate('__coast.game.tune.invincible'))
  page.get_by_role('button',name='Reset defaults').click()
  check('Dev reset restores defaults',page.evaluate('__coast.game.tune.speed===1 && !__coast.game.tune.invincible'))
  page.get_by_role('button',name='Back to the session').click();page.wait_for_function('__coast.screen===null')
  page.keyboard.press('Escape');page.keyboard.press('Escape');page.wait_for_function('__coast.screen===null')
  check('Escape resumes pause',page.evaluate('__coast.screen===null'))
  page.evaluate('__coast.activate("quit")');page.evaluate('__pad.buttons[0]={pressed:true,value:1}');page.wait_for_function('__coast.screen==="brief"');page.evaluate('__pad.buttons[0]={pressed:false,value:0}');n=page.evaluate('__coast.frames');page.wait_for_function('(n)=>__coast.frames>n+2',arg=n)
  check('Controller prompts follow latest input',page.locator('.brief').inner_text().find('✕')>=0)
  page.evaluate('__pad.buttons[0]={pressed:true,value:1}');page.wait_for_function('__coast.screen===null');page.evaluate('__pad.buttons[0]={pressed:false,value:0};__pad.axes[0]=1');page.wait_for_timeout(150)
  check('Standard gamepad runs simulation',page.evaluate('__coast.inputKind==="pad" && __coast.game.state.time<45'))
  page.evaluate('__pad.axes[0]=0;__pad.buttons[9]={pressed:true,value:1}');page.wait_for_function('__coast.screen==="pause"');page.evaluate('__pad.buttons[9]={pressed:false,value:0}')
  check('Controller Options pauses',page.evaluate('__coast.screen==="pause"'))
  page.evaluate('__coast.activate("settings")');page.get_by_role('button',name='PlayStation').click();check('Xbox glyph switch saved',page.get_by_role('button',name='Xbox').count()==1)
  page.evaluate('__coast.activate("quit")');page.get_by_role('button',name='Pick an event').click();check('All six playable events exposed',page.locator('.event-card').count()==6)
  page.get_by_role('button',name='02 / COAST CLUB FOOTBAG').click();check('Mouse picks event',page.evaluate('__coast.game.state.event===1'))
  for i in range(6):
   page.evaluate('(i)=>{__coast.startGame(i,false,1);__coast.activate("begin");}',i)
   frame=page.evaluate('__coast.frames');page.wait_for_function('(n)=>__coast.frames>n+2',arg=frame)
   check(f'Event {i+1} renders and remains finite',page.evaluate('Number.isFinite(__coast.game.state.x)&&Number.isFinite(__coast.game.state.y)&&__coast.game.state.phase==="play"'))
  page.evaluate('__coast.activate("quit");__coast.forceAttract()');page.wait_for_function('__coast.attract',timeout=5000)
  check('Ten-second idle condition launches attract',page.evaluate('__coast.game.tune.invincible && __coast.game.state.phase==="play"'))
  page.keyboard.press('KeyZ');page.wait_for_function('!__coast.attract && __coast.screen==="title"')
  check('Any input exits attract',page.evaluate('__coast.screen==="title"'))
  page.evaluate('__coast.forceAttract()');page.wait_for_function('__coast.attract',timeout=5000);page.mouse.move(900,400);page.wait_for_function('!__coast.attract')
  check('Mouse motion exits attract',page.evaluate('__coast.screen==="title"'))
  audio=page.evaluate('async()=>{await __coast.audio.unlock();__coast.audio.voice("happy");__coast.audio.sfx("jump");return await __coast.renderAudioProof(4)}')
  check('Code audio produces finite audible PCM',audio.get('finite',False) and audio.get('rms',0)>0 and audio.get('peak',2)<1)
  check('Default music is ten percent',page.evaluate('__coast.audio.diagnostics().musicVolume===.1'))
  page.set_viewport_size({'width':844,'height':390});page.evaluate('__coast.startGame(3,false,1);__coast.activate("begin")');page.touchscreen.tap(100,220)
  check('Touch exposes contextual action',page.locator('#touch-action').is_visible())
  before=page.evaluate('__coast.game.stats.jumps');page.locator('#touch-action').tap();page.wait_for_timeout(100)
  check('Touch action jumps',page.evaluate('__coast.game.stats.jumps')>before)
  page.locator('#touch-menu').tap();check('Touch menu pauses',page.evaluate('__coast.screen==="pause"'))
  page.evaluate('__coast.activate("quit")');page.set_viewport_size({'width':1280,'height':800})
  peer=context.new_page();peer.on('pageerror',lambda e:errors.append(str(e)));peer.goto(url,wait_until='domcontentloaded');peer.wait_for_function('window.__coast?.ready',timeout=60000)
  page.evaluate('__coast.net.createRoom("TEST1988")');peer.evaluate('__coast.net.joinRoom("TEST1988")');page.wait_for_function('__coast.net.players.length===2',timeout=5000)
  page.evaluate('__coast.net.start()');peer.wait_for_function('__coast.game.state.phase==="play"')
  check('Standalone browser room synchronizes two players',peer.evaluate('__coast.game.state.players===2 && __coast.net.me===1'))
  page.evaluate('__coast.game.finish();__coast.game.next();__coast.game.begin()');peer.wait_for_function('__coast.game.state.player===1',timeout=5000)
  peer.evaluate('__coast.net.submit({kind:"input",input:{x:1,y:0,primary:false,pressed:false,trick:false}})');page.wait_for_timeout(200)
  check('Remote turn state follows host',peer.evaluate('__coast.game.state.player===1 && __coast.game.state.time<45'))
  peer.close();page.evaluate('__coast.net.leaveRoom()')
  check('No runtime errors',not errors)
  check('GPU survives all sports and multiplayer',page.evaluate('!__coast.renderer._isDeviceLost'))
  page.goto((ROOT.parent/'Californiroll-Games-California-Games-gpt-6.1-sol-ultra-20261105-212543.html').as_uri(),wait_until='domcontentloaded');page.wait_for_function('window.__coast?.ready',timeout=60000);page.wait_for_function('__coast.frames>4')
  check('Single release opens directly as file',page.title()=='Californiroll Games' and page.evaluate('__coast.screen==="title"'))
  check('File release renders with real WebGPU',page.evaluate('__coast.rendererInfo().webgpu && !__coast.renderer._isDeviceLost && __coast.renderer.info.render.drawCalls>0'))
  page.evaluate('__coast.activate("about")')
  for heading in ['Source Information','Source Information','Testing Feedback','Engine Feedback','Prompt Feedback']:
   check('In-game credits: '+heading,page.get_by_role('heading',name=heading,exact=True).count()==1)
   page.evaluate('__coast.activate("credits-next")')
 except Exception as e:failures.append(f'Browser exception after {count} checks: {e}'+str(page.evaluate('({screen:window.__coast?.screen,event:window.__coast?.game.state.event,phase:window.__coast?.game.state.phase,attract:window.__coast?.attract,net:window.__coast?.net.status})')))
 finally:context.close()
 spec=importlib.util.spec_from_file_location('hubtests',ROOT/'test-hub.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
 hc,hf=mod.run_hub(browser,url);count+=hc;failures+=hf
 browser.close()
server.shutdown();server.server_close()
for failure in failures:print('FAIL:',failure)
print(f'{count} browser and Hub checks, {len(failures)} failures')
sys.exit(bool(failures))
