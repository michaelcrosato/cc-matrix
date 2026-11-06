"""One-command verification: node simulation/protocol + real browser inputs/audio/campaign."""
import functools,http.server,json,subprocess,threading,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
GAME='River-Razzle-River-Raid-gpt-6.1-sol-ultra-20261105-222441.html'
checks=0;failures=[]
def check(ok,label):
 global checks
 checks+=1
 if not ok:failures.append(label)
def phase(label,fn):
 try:fn()
 except Exception as e:check(False,label+': '+str(e).splitlines()[0])
for name in ['test-game.mjs','network-test.mjs']:
 r=subprocess.run(['node','--no-warnings',str(ROOT/name)],cwd=ROOT,capture_output=True,text=True)
 for line in r.stdout.splitlines():
  if 'checks,' in line:
   checks+=int(line.split()[0])
  else:failures.append(line)
 if r.returncode and not r.stdout.strip():failures.append(r.stderr[:500])
class QuietHandler(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT.parent)))
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
base='http://127.0.0.1:'+str(server.server_address[1])
url=base+'/'+GAME
pad_script="""window.__pads=[];navigator.getGamepads=()=>window.__pads;window.makeTestPad=()=>({connected:true,id:'Emulated standard DualSense',mapping:'standard',index:0,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0}))});"""
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
  context=browser.new_context(viewport={'width':1600,'height':900})
  context.add_init_script(pad_script)
  page=context.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url);page.wait_for_function('window.__RAZZLE__?.state.ready',timeout=90000)
  state=lambda:page.evaluate('__RAZZLE__.state')
  check(page.title().startswith('River Razzle'),'served page is River Razzle')
  check(state()['backend']=='WebGPU','WebGPU backend selected')
  check(state()['physics']=='0.19.3','Rapier version pinned')
  check(abs(state()['audio']['musicVolume']-.1)<.001,'music defaults to 10 percent')
  check(state()['mode']=='title','starts on title')
  page.locator('[data-action="coop"]').hover()
  check(page.locator('[data-action="coop"]').evaluate('el=>el.classList.contains("focused")'),'mouse hover moves menu focus')
  page.keyboard.press('Enter');check(state()['mode']=='coop','keyboard activates hovered focus')
  page.keyboard.press('Escape');check(state()['mode']=='title','keyboard back returns to title')
  page.get_by_role('button',name='FLY SOLO').click();check(state()['mode']=='playing','solo starts')
  x=state()['players'][0]['x'];page.keyboard.down('KeyD')
  page.wait_for_function(f'__RAZZLE__.state.players[0].x>{x+1}',timeout=10000);page.keyboard.up('KeyD')
  check(state()['players'][0]['x']>x+1,'keyboard steers')
  page.keyboard.down('Space');page.wait_for_function('__RAZZLE__.state.stats.shots>0');page.keyboard.up('Space');check(state()['stats']['shots']>0,'keyboard fires real projectiles')
  page.keyboard.press('KeyE');page.wait_for_function('__RAZZLE__.state.stats.pulses>0');check(state()['pulseCooldown']>0,'pulse activates cooldown')
  page.keyboard.press('Escape');check(state()['mode']=='pause','pause opens')
  t=state()['time'];page.wait_for_timeout(150);check(abs(state()['time']-t)<.001,'solo pause freezes simulation')
  page.get_by_role('button',name='DEV HANGAR').click();check(state()['mode']=='dev','dev mode reachable from pause')
  page.locator('#dev-speed').fill('25');check(page.evaluate('__RAZZLE__.game.config.speed')==25,'live balance slider updates gameplay')
  page.get_by_role('button',name='RESET DEFAULTS').click();check(page.evaluate('__RAZZLE__.game.config.speed')==19,'reset balance restores default')
  page.get_by_role('button',name='BACK TO FLIGHT').click()
  page.evaluate('__RAZZLE__.resetTitle();window.__pads=[makeTestPad()];__pads[0].buttons[0]={pressed:true,value:1}')
  page.wait_for_function('__RAZZLE__.state.mode==="playing"');page.evaluate('__pads[0].buttons[0]={pressed:false,value:0}')
  check(state()['lastUsed']=='gamepad','standard gamepad becomes active input')
  page.evaluate('__pads[0].axes[0]=-.8');x=state()['players'][0]['x'];page.wait_for_function(f'__RAZZLE__.state.players[0].x<{x-1}');page.evaluate('__pads[0].axes[0]=0')
  check(state()['players'][0]['x']<x-1,'standard gamepad steers')
  x=state()['players'][0]['x'];page.keyboard.down('KeyD');page.wait_for_function(f'__RAZZLE__.state.players[0].x>{x+1}');page.keyboard.up('KeyD');check(state()['players'][0]['x']>x+1,'idle connected controller permits keyboard steering')
  page.evaluate('__pads[0].buttons[9]={pressed:true,value:1}');page.wait_for_function('__RAZZLE__.state.mode==="pause"');page.evaluate('__pads[0].buttons[9]={pressed:false,value:0}');check(state()['mode']=='pause','gamepad Options pauses')
  page.evaluate('__pads=[]');page.get_by_role('button',name='SETTINGS',exact=True).click();page.get_by_role('button',name='PlayStation',exact=True).click();check(state()['settings']['glyphs']=='Xbox','Xbox glyph option works')
  page.locator('#music').fill('17');check(abs(state()['audio']['musicVolume']-.17)<.001,'music slider updates audio bus');page.locator('#music').fill('10')
  page.get_by_role('button',name='BACK',exact=True).click();page.get_by_role('button',name='RESUME FLIGHT').click()
  page.evaluate('__RAZZLE__.start(2)');check(len(state()['players'])==2,'local co-op has two active planes')
  x=state()['players'][1]['x'];page.keyboard.down('ArrowRight');page.wait_for_function(f'__RAZZLE__.state.players[1].x>{x+1}');page.keyboard.up('ArrowRight');check(state()['players'][1]['x']>x+1,'second keyboard pilot steers independently')
  page.evaluate('__RAZZLE__.resetTitle();__RAZZLE__.setIdle()');page.wait_for_function('__RAZZLE__.state.mode==="attract"');check(state()['attract'] if 'attract' in state() else state()['mode']=='attract','ten-second idle starts AI attract')
  page.wait_for_function('__RAZZLE__.state.stats.shots>0');check(state()['stats']['shots']>0,'attract pilot demonstrates shooting')
  page.keyboard.press('Space');check(state()['mode']=='title','any input exits attract without launching')
  page.evaluate('__RAZZLE__.setIdle()');page.wait_for_function('__RAZZLE__.state.mode==="attract"');page.evaluate('window.__pads=[makeTestPad()];__pads[0].buttons[0]={pressed:true,value:1}');page.wait_for_function('__RAZZLE__.state.mode==="title"');page.wait_for_timeout(250);check(state()['mode']=='title','held controller confirm is consumed when exiting attract');page.evaluate('__pads=[]')
  page.evaluate('__RAZZLE__.action("autofire");__RAZZLE__.start(1);__RAZZLE__.game.warp(27);__RAZZLE__.game.step(1/60,[{}]);let f=__RAZZLE__.game.entities.find(e=>e.kind==="fuel");__RAZZLE__.game.players[0].x=f.x;__RAZZLE__.game.fuel=45;__RAZZLE__.game.config.speed=30;')
  page.wait_for_function('__RAZZLE__.state.stats.refuels>0',timeout=15000);check(state()['stats']['refuels']>0,'automatic fire preserves needed fuel pads');page.evaluate('__RAZZLE__.action("autofire");__RAZZLE__.game.config.speed=19;')
  page.evaluate('__RAZZLE__.start(1);__RAZZLE__.autopilot(true);__RAZZLE__.advance(160)');s=state()
  check(s['won'] and s['bridges']==4,'scripted whole campaign clears four blockades and wins')
  check(s['stats']['refuels']>0 and s['stats']['pulses']>0,'campaign demonstrates refuel and pulse')
  page.wait_for_function('__RAZZLE__.state.mode==="result"',timeout=15000);check(state()['mode']=='result','campaign reaches results screen')
  audio_result=page.evaluate('''async()=>{const ctx=new OfflineAudioContext(2,48000,24000),a=new __RAZZLE__.audio.constructor({context:ctx});await a.unlock();a.setState('playing');for(const n of ['shot','explosion','refuel','bridge','checkpoint','hit','pulse','lowfuel','win','menu'])a.play(n);a.voice(8);a.update(.5,{speed:20,fuel:12,active:true});const data=(await ctx.startRendering()).getChannelData(0);let energy=0,peak=0,finite=true;for(const x of data){energy+=x*x;peak=Math.max(peak,Math.abs(x));finite&&=Number.isFinite(x);}return {energy,peak,finite};}''')
  check(audio_result['energy']>0 and audio_result['finite'] and audio_result['peak']<=1.01,'procedural audio produces finite audible unclipped PCM')
  page.evaluate('__RAZZLE__.resetTitle();__RAZZLE__.action("options");__RAZZLE__.action("about")')
  check(all(x in page.locator('#screens').inner_text() for x in ['Source Information','Testing Feedback','Engine Feedback','Prompt Feedback','added on import']),'credits contain all required records')
  check(not errors,'no uncaught browser errors: '+'; '.join(errors[:2]))
  context.close()
  file_context=browser.new_context(offline=True);fp=file_context.new_page();fp.goto((ROOT.parent/GAME).as_uri());fp.wait_for_function('window.__RAZZLE__?.state.ready',timeout=90000);check(fp.evaluate('__RAZZLE__.state.ready'),'single HTML boots offline through file URL');file_context.close()
  touch_context=browser.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=1)
  tp=touch_context.new_page();tp.goto(url);tp.wait_for_function('window.__RAZZLE__?.state.ready',timeout=90000)
  tp.get_by_role('button',name='FLY SOLO').tap();tp.wait_for_function('__RAZZLE__.state.stats.shots>0');check(tp.evaluate('__RAZZLE__.state.lastUsed')=='touch','touch-only input detected')
  check(tp.evaluate('__RAZZLE__.state.stats.shots')>0,'touch fire assistance works')
  cdp=touch_context.new_cdp_session(tp);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':200,'y':180,'id':7}]});cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':250,'y':180,'id':7}]})
  tx=tp.evaluate('__RAZZLE__.state.players[0].x');tp.wait_for_function(f'__RAZZLE__.state.players[0].x>{tx+.5}');check(tp.evaluate('__RAZZLE__.state.players[0].x')>tx+.5,'invisible touch stick steers')
  touch_context.close();browser.close()
except Exception as e:failures.append('Browser suite: '+str(e).splitlines()[0])
finally:
 # Official harness is sequenced after gameplay to keep browser use bounded.
 r=subprocess.run([sys.executable,str(ROOT/'network-browser-test.py'),base],cwd=ROOT,capture_output=True,text=True)
 for line in r.stdout.splitlines():
  if 'checks,' in line:checks+=int(line.split()[0])
  elif line.startswith('FAIL '):failures.append(line[5:])
 if r.returncode and not r.stdout.strip():failures.append(r.stderr[:500])
 server.shutdown();server.server_close()
for message in failures:print('FAIL '+message)
print(f'{checks} checks, {len(failures)} failures')
sys.exit(bool(failures))
