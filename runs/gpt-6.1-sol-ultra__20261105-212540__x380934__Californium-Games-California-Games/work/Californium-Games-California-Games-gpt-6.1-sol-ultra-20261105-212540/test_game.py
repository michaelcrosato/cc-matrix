from playwright.sync_api import sync_playwright
from pathlib import Path
import json,sys,threading,http.server,functools,subprocess,time,traceback
P=Path(__file__).resolve().parent
checks=0;failures=[]
def check(ok,label):
 global checks
 checks+=1
 if not ok:failures.append(label);print('FAIL:',label,flush=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(P.parent)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/'
URL=base+P.name+'.html'
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--no-sandbox'])
 ctx=b.new_context(viewport={'width':1280,'height':800})
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  page.goto(URL,wait_until='domcontentloaded');page.wait_for_function('window.__game?.state.ready',timeout=45000)
  check('Californium Games' in page.title(),'served page identity')
  check(page.evaluate('__game.state.screen')=='title','title opens')
  check(page.evaluate('__game.state.renderer')=='webgpu','WebGPU backend initialized')
  check(page.evaluate('__game.audio.getDiagnostics().musicVolume')==.1,'music defaults to ten percent')
  offline=page.evaluate('__game.audio.testOffline()');check(offline['supported'] and offline['nonzeroFrames']>44100 and offline['rms']>.001 and offline['peak']<1,'procedural audio renders without clipping')
  page.keyboard.press('Enter');page.wait_for_function('__game.state.screen==="brief"');check(page.is_visible('#brief-panel'),'keyboard starts brief')
  page.keyboard.press('Enter');page.wait_for_function('__game.state.screen==="playing"')
  page.keyboard.press('Space');page.wait_for_function('__game.state.airborne');page.keyboard.press('j');page.wait_for_function('__game.state.pending>0');check(page.evaluate('__game.state.pending')>=180,'keyboard pop and aerial scoring')
  page.wait_for_function('__game.state.score>0',timeout=15000);check(page.evaluate('__game.state.landings')>0,'landing banks score')
  page.keyboard.press('Escape');page.wait_for_function('__game.state.screen==="paused"');t=page.evaluate('__game.state.time');page.wait_for_timeout(250);check(page.evaluate('__game.state.time')==t,'pause freezes simulation')
  check(page.evaluate('__game.audio.getDiagnostics().paused'),'pause suspends audio')
  page.click('#pause-dev');page.locator('[data-config="jump"]').fill('11');check(page.evaluate('__game.state.config.jump')==11,'live tuning slider')
  page.click('#dev-reset');check(page.evaluate('__game.state.config.jump')==8,'dev defaults reset')
  page.click('#dev-back');page.click('#resume');page.wait_for_function('__game.state.screen==="playing"')
  page.evaluate('__game.setConfig({duration:9,timeScale:4});__game.start("skate");__game.setBot(true)')
  for i,event in enumerate(['skate','surf','bmx']):
   page.wait_for_function('__game.state.screen==="event-result"',timeout=45000)
   s=page.evaluate('__game.state');check(s['event']==event and s['score']>0,f'{event} playable, scoring, timer completes')
   check(s['bails']==0 and abs(s['position']['x'])<21,f'{event} bot stays in arena')
   if event=='bmx':check(s['laps']>=1,'BMX bot clears hazards and completes a lap')
   page.click('#result-next')
   if i<2:page.click('#brief-go')
  page.wait_for_function('__game.state.screen==="festival-result"');s=page.evaluate('__game.state');check(s['players'][0]['total']==sum(s['players'][0]['scores']) and all(x>0 for x in s['players'][0]['scores']),'full festival scores aggregate')
  page.click('#festival-home');page.click('#start-hotseat');page.click('#brief-go');page.evaluate('__game.finish()');page.click('#result-next');check(page.evaluate('__game.state.currentPlayer')==1,'hotseat hands off next rider');page.click('#brief-go');check(page.evaluate('__game.state.score===0&&__game.state.landings===0'),'new rider starts with independent score and stats')
  page.evaluate('__game.title();__game.setConfig({duration:1,timeScale:4});__game.setIdle()');page.wait_for_function('__game.state.attract');check(page.is_visible('#attract'),'ten-second idle triggers attract')
  page.wait_for_function('__game.state.event==="surf"',timeout=15000);check(page.evaluate('__game.state.attract'),'attract advances across events')
  page.wait_for_function('__game.state.event==="bmx"',timeout=15000);page.wait_for_function('__game.state.event==="skate"&&__game.state.screen==="playing"',timeout=15000);check(page.evaluate('__game.state.attract'),'attract loops the entire festival')
  page.keyboard.press('q');page.wait_for_function('__game.state.screen==="title"');check(not page.evaluate('__game.state.attract'),'any input exits attract')
  page.add_init_script('window.testPad={connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0})),mapping:"standard",id:"Virtual DualSense"};navigator.getGamepads=()=>[window.testPad]')
  page.reload(wait_until='domcontentloaded');page.wait_for_function('__game.state.ready')
  def pad(i):
   page.evaluate(f'testPad.buttons[{i}].pressed=true');page.wait_for_timeout(120);page.evaluate(f'testPad.buttons[{i}].pressed=false');page.wait_for_timeout(120)
  pad(0);page.wait_for_function('__game.state.screen==="brief"');check(page.locator('[data-key="pop"]').first.text_content()=='✕','standard pad and PlayStation glyphs')
  pad(0);page.wait_for_function('__game.state.screen==="playing"');pad(9);page.wait_for_function('__game.state.screen==="paused"');check(True,'controller starts game and pauses')
  page.click('#pause-settings');page.click('#glyphs');check('XBOX' in page.inner_text('#glyphs'),'Xbox glyph setting');page.evaluate('testPad.axes[0]=.4');page.wait_for_timeout(100);page.evaluate('testPad.axes[0]=0');check(page.locator('[data-key="pop"]').first.text_content()=='A','Xbox input glyph')
  check(not errors,'no JavaScript errors: '+str(errors))
  check(not page.evaluate('__game.state.stats.errors'),'no game runtime exceptions')
  page.keyboard.press('Escape');page.click('#pause-about');check('Source Information' in page.inner_text('#about-content') or 'SOURCE INFORMATION' in page.inner_text('#about-content'),'complete in-game credits metadata')
  page.evaluate('document.getElementById("about-panel").scrollTop=0');page.keyboard.press('ArrowDown');check(page.evaluate('document.getElementById("about-panel").scrollTop')>0,'keyboard scrolls credits')
  page.evaluate('document.getElementById("about-panel").scrollTop=0;testPad.axes[3]=1');page.wait_for_timeout(150);page.evaluate('testPad.axes[3]=0');check(page.evaluate('document.getElementById("about-panel").scrollTop')>0,'controller right stick scrolls credits')
  ctx.close()
  touchctx=b.new_context(viewport={'width':844,'height':390},is_mobile=True,has_touch=True,device_scale_factor=1)
  mobile=touchctx.new_page();mobile.goto(URL,wait_until='domcontentloaded');mobile.wait_for_function('__game.state.ready',timeout=45000)
  mobile.tap('#start');mobile.tap('#brief-go');mobile.touchscreen.tap(420,230);mobile.wait_for_function('__game.state.airborne');check(mobile.evaluate('document.body.dataset.input')=='touch','touch pop and invisible stick input')
  mobile.tap('#touch-menu');mobile.wait_for_function('__game.state.screen==="paused"');check(True,'touch menu pauses')
  touchctx.close()
  # Official Hub checks, two frames on the same origin. No game-specific automation.
  hub=b.new_page(viewport={'width':1280,'height':800})
  hub.goto(base+P.name+'/harness.html?game=../'+P.name+'.html&players=2&auto=1&play=3000&limit=30',wait_until='domcontentloaded')
  hub.wait_for_function('document.body.dataset.complete==="true"',timeout=90000)
  result=hub.evaluate('window.__hubCheck');(P/'hub-check.json').write_text(json.dumps(result,indent=2))
  for c in result['checks']:check(c['pass'],'AI Hub: '+c['name']+' '+str(c.get('detail','')))
  check(result['pass'],'official AI Hub conformance')
  for scenario,number in [('standard',4),('host-leave',2)]:
   hub.goto(base+P.name+'/harness.html?game=../'+P.name+'.html&players='+str(number)+'&auto=1&play=2000&limit=30&latency=150&jitter=50&loss=5&scenario='+scenario,wait_until='domcontentloaded')
   hub.wait_for_function('document.body.dataset.complete==="true"',timeout=90000)
   r=hub.evaluate('window.__hubCheck');(P/f'hub-check-{scenario}-{number}.json').write_text(json.dumps(r,indent=2));check(r['pass'],f'AI Hub {number} players {scenario}: '+str([c for c in r['checks'] if not c['pass']]))
  hub.close()
  if '--visual' in sys.argv:
   visual=b.new_page(viewport={'width':1600,'height':1000})
   visual.goto(URL+'?renderer=webgl',wait_until='domcontentloaded');visual.wait_for_function('__game.state.ready',timeout=45000)
   visual.wait_for_timeout(1500);visual.screenshot(path=str(P/'title.png'))
   for sport in ['skate','surf','bmx']:
    visual.evaluate(f'__game.start("{sport}")');visual.wait_for_timeout(1000);visual.screenshot(path=str(P/(sport+'.png')))
   visual.close()
 except Exception as e:
  check(False,traceback.format_exc());(P/'test-error.json').write_text(json.dumps({'error':str(e),'pageErrors':errors,'state':page.evaluate('__game.state') if not page.is_closed() else {}},indent=2))
 finally:b.close()
net=subprocess.run(['node',str(P/'test_network.mjs')],capture_output=True,text=True)
if net.returncode:print(net.stdout);print(net.stderr);failures.append('network test')
else:
 import re
 m=re.search(r'(\d+) network checks',net.stdout)
 if m:checks+=int(m.group(1))
if '--online' in sys.argv:
 online=subprocess.run([sys.executable,str(P/'test_online.py'),URL],capture_output=True,text=True)
 result=json.loads((P/'test_online_result.json').read_text());checks+=len(result['checks'])
 if online.returncode:
  print(online.stdout);failures.append('real online test')
server.shutdown()
(P/'test-results.json').write_text(json.dumps({'checks':checks,'failures':failures,'audio':locals().get('offline',{}),'onlineIncluded':'--online' in sys.argv},indent=2))
if not failures and (P/'test-error.json').exists():(P/'test-error.json').unlink()
print(f'{checks} checks; {len(failures)} failures')
sys.exit(bool(failures))
