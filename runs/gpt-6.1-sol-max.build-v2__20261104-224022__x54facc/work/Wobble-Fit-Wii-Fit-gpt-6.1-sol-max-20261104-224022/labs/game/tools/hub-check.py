# @file Real upstream AI Hub harness on an ephemeral loopback server, with engine-state assertions too.
import http.server,threading,json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path.cwd();GAME=ROOT.parent/'Wobble-Fit-Wii-Fit-gpt-6.1-sol-max-20261104-224022.html'
class Handler(http.server.SimpleHTTPRequestHandler):
 def translate_path(self,path):
  name=path.split('?')[0].lstrip('/')
  if name=='game.html':return str(GAME)
  if name in ['harness.html','bridge.js','round.js']:return str(ROOT/'.cache/hub'/name)
  return str(ROOT/'out'/'missing-resource')
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
base='http://127.0.0.1:'+str(server.server_port)
failures=[];passed=0;reports=[]
FLAGS=['--no-sandbox','--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader']
try:
 with sync_playwright() as p:
  for n,scenario in ([(int(next(a.split('=')[1] for a in sys.argv if a.startswith('--players='))), '')] if any(a.startswith('--players=') for a in sys.argv) else [(2,'')] if '--quick' in sys.argv else [(2,''),(3,''),(4,''),(3,'host-leave')]):
   browser=p.chromium.launch(headless=True,args=FLAGS)
   page=browser.new_page(viewport={'width':1600,'height':1000})
   errors=[];warnings=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('console',lambda e:warnings.append(e.text) if e.text.startswith('[AIHub]') else None)
   label=f'{n} players'+(' / '+scenario if scenario else '')
   try:
    response=page.request.get(base+'/game.html')
    assert 'Wobble Fit' in response.text(),'Server did not serve this game'
    url=base+'/harness.html?game=game.html&players='+str(n)+'&latency=150&jitter=50&loss=5&auto=1&play=8000'+('&scenario='+scenario if scenario else '')
    page.goto(url)
    page.wait_for_function('document.body.dataset.complete==="true"',timeout=150000)
    report=page.evaluate('window.__hubCheck');report['case']=label
    frames=[];reports.append(report);report['frames']=frames
    for frame in page.frames[1:]:
     if 'game.html' not in frame.url:continue
     state=frame.evaluate('({ready:__engine?.ready,errors:__engine?.errors,ghosts:__engine?.state?.("ghost")?.entities?.length,game:window.__game,hub:AIHub.active})')
     frames.append(state)
     assert state['ready'] is True,'Protocol passed but engine is not ready'
     assert not state['errors'],'Engine errors: '+str(state['errors'])
     assert state['ghosts']>=1,'No ghost entity on neighbouring mat'
    report['frames']=frames
    assert report.get('pass') is True,'Harness checks: '+'; '.join(c['name']+': '+c.get('detail','') for c in report['checks'] if not c['pass'])
    assert not errors and not warnings,str(errors+warnings)
    if n==2:page.screenshot(path='out/game/hub-two-players.png')
    passed+=1
   except Exception as e:
    failures.append(label+': '+str(e).split('\n')[0]);print('FAIL '+failures[-1],flush=True)
    page.screenshot(path=f'out/game/hub-failure-{n}-{scenario or "round"}.png')
   browser.close()
finally:server.shutdown();server.server_close()
Path('out/game/hub-report.json').write_text(json.dumps({'passed':passed,'failures':failures,'reports':reports},indent=2)+'\n')
print(f'{passed} hub checks passed; {len(failures)} failed')
sys.exit(bool(failures))
