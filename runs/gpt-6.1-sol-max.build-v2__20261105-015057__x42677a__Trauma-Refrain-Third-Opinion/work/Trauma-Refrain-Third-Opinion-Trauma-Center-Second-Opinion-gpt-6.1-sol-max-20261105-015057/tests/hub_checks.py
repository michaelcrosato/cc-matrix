from pathlib import Path
import json,re,subprocess,sys,time,urllib.request
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
results=[]
def record(name,passed,error=''):results.append(dict(name=name,pass_=passed,error=error))
server=subprocess.Popen([sys.executable,'-u','-m','http.server','0','--bind','127.0.0.1','-d',str(ROOT/'tests/hub')],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
try:
 line=server.stdout.readline();match=re.search(r'port (\d+)',line)
 if not match:raise RuntimeError('Could not find private test server port: '+line)
 base='http://127.0.0.1:'+match[1]
 content=urllib.request.urlopen(base+'/game.html').read().decode()
 if '<title>Trauma Refrain: Third Opinion</title>' not in content:raise RuntimeError('Server did not serve this game')
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True)
  scenarios=[('four-player impaired network','players=4&latency=150&jitter=50&loss=5'),('host leave','players=4&latency=150&jitter=50&loss=5&scenario=host-leave'),('server host','players=2&scenario=server'),('solo hub','players=1')]
  reports=[]
  for name,query in scenarios:
   context=browser.new_context(viewport={'width':1280,'height':900});context.add_init_script('window.__surgeryTestNoGPU=true;')
   page=context.new_page();page.goto(base+'/harness.html?game=game.html&'+query+'&auto=1&limit=20')
   try:
    page.wait_for_function('document.body.dataset.complete==="true"',timeout=65000)
    report=page.evaluate('window.__hubCheck');reports.append({'name':name,**report})
    issues=[c for c in report['checks'] if not c['pass']]
    record(name,report['pass'],json.dumps(issues))
    if name=='server host':
     server_frames=[f for f in page.frames if '/game.html' in f.url and f.evaluate('!!window.__game?.status().hub.server')]
     quiet=bool(server_frames) and server_frames[0].evaluate('__game.status().graphic===false && __game.status().audioPeak===0 && document.querySelector("#ui").childElementCount===0')
     record('server copy has no renderer, interface or sound',quiet)
   except Exception as e:record(name,False,str(e))
   context.close()
  context=browser.new_context(viewport={'width':1280,'height':900});context.add_init_script('window.__surgeryTestNoGPU=true;');page=context.new_page();page.goto(base+'/harness.html?game=game.html&players=2&auto=1&limit=30&play=14000')
  try:
   page.wait_for_function('Array.from(document.querySelectorAll("iframe")).filter(f=>f.contentWindow.__game?.status().screen==="operation").length===2',timeout=45000)
   frames=[f for f in page.frames if '/game.html' in f.url]
   host=next(f for f in frames if f.evaluate('__game.status().hub.isHost'))
   client=next(f for f in frames if not f.evaluate('__game.status().hub.isHost'))
   # The conformance harness injects random movement. Isolate the measured client input.
   client.evaluate("window.__probeKeys=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','d','w','s'].includes(e.key)&&!e.__probe)e.stopImmediatePropagation()};addEventListener('keydown',__probeKeys,true);addEventListener('keyup',__probeKeys,true);dispatchEvent(new Event('blur'))")
   for _ in range(12):client.evaluate('__game.input({aim:[4,-1],tool:5,held:0,pressure:1})');page.wait_for_timeout(90)
   g=host.evaluate('__game.status().sim');cur=g['surgeons'][1]['cursor']
   record('client input reaches authoritative host',abs(cur[0]-4)<.4 and abs(cur[1]+1)<.4,str(cur))
   a=host.evaluate('__game.status().sim.vitals');b=client.evaluate('__game.status().sim.vitals');record('client and host share patient vitals',abs(a-b)<1.5,str((a,b)))
   start_x=host.evaluate('__game.status().sim.surgeons[1].cursor[0]')
   for _ in range(8):client.evaluate('(()=>{let e=new KeyboardEvent("keydown",{key:"d",bubbles:true});e.__probe=true;document.dispatchEvent(e)})()');page.wait_for_timeout(90)
   client.evaluate('(()=>{let e=new KeyboardEvent("keyup",{key:"d",bubbles:true});e.__probe=true;document.dispatchEvent(e)})()');end_x=host.evaluate('__game.status().sim.surgeons[1].cursor[0]');record('client keyboard integrates a moving cursor',end_x>start_x+.5,str((start_x,end_x)));client.evaluate("removeEventListener('keydown',__probeKeys,true);removeEventListener('keyup',__probeKeys,true)")
   client.evaluate('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');record('hub disables local pause',client.evaluate('__game.status().screen')=='operation')
   page.wait_for_function('document.body.dataset.complete==="true"',timeout=50000)
   record('input sync round finishes cleanly',page.evaluate('window.__hubCheck.pass'))
  except Exception as e:record('two-copy actual state synchronization',False,str(e))
  context.close();browser.close()
 (ROOT/'tests/out/hub-reports.json').write_text(json.dumps(reports,indent=2))
except Exception as e:record('hub test environment',False,str(e))
finally:
 server.terminate()
 try:server.wait(timeout=5)
 except subprocess.TimeoutExpired:server.kill();server.wait()
(ROOT/'tests/out/hub-results.json').write_text(json.dumps(results,indent=2))
for r in results:
 if not r['pass_']:print('FAIL '+r['name']+': '+r['error'])
print(json.dumps({'passed':sum(r['pass_'] for r in results),'failed':sum(not r['pass_'] for r in results)}))
