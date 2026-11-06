from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from urllib.request import urlopen
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright
import json
import traceback
import sys

ROOT=Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass

server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
thread=Thread(target=server.serve_forever,daemon=True)
thread.start()
base=f'http://127.0.0.1:{server.server_port}'
assert '<title>B-17 Bomber Buddy</title>' in urlopen(base+'/game.html').read().decode()
reports=[]
try:
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        for name,params in [
            ('two-player',{}),
            ('impaired-network',{'latency':150,'jitter':50,'loss':5}),
            ('guest-departure',{'custom':'guest'}),
            ('host-departure',{'scenario':'host-leave'}),
            ('playerless-server',{'scenario':'server'})
        ]:
            if len(sys.argv)>1 and name not in sys.argv[1:]:
                continue
            context=browser.new_context(viewport={'width':1280,'height':720})
            page=context.new_page()
            warnings=[]
            page.on('console',lambda m:warnings.append(m.text) if '[AIHub]' in m.text and m.type in ['warning','error'] else None)
            custom=params.pop('custom',None)
            args={'game':'/game.html?backend=webgl','players':2,'auto':1,'play':16000,'limit':50,'seed':1701,**params}
            try:
                page.goto(base+'/vendor/hub-repo/lib/hub/harness.html?'+urlencode(args))
                assertions={}
                if name!='host-departure':
                    page.wait_for_function('''()=>Array.from(document.querySelectorAll('iframe')).filter(f=>f.contentWindow.Bomber?.ready&&f.contentWindow.AIHub.time()>=0).length>=2''',timeout=60000)
                    frames=[f for f in page.frames[1:] if f.evaluate('!!window.Bomber?.ready')]
                    host=next(f for f in frames if f.evaluate('AIHub.isHost'))
                    guest=next(f for f in frames if f.evaluate('!AIHub.isHost && AIHub.me===1'))
                    guest.evaluate('__game.input.tap("bombsight")')
                    host.wait_for_function('Bomber.sim.owners.bombs===1',timeout=10000)
                    guest.wait_for_function('Bomber.sim.player(AIHub.me).station==="bombs"&&Bomber.sim.player(AIHub.me).transition===0',timeout=10000)
                    guest.evaluate('__game.input.tap("doors")')
                    host.wait_for_function('Bomber.sim.aircraft.doors>.9',timeout=10000)
                    guest.evaluate('__game.input.tap("fire")')
                    host.wait_for_function('Bomber.sim.stats.released===3',timeout=10000)
                    guest.wait_for_function('Bomber.sim.aircraft.bombs===7',timeout=10000)
                    assertions['guestClaimsAndReleases']=True
                    assertions['inventoryConverges']=True
                    if name=='two-player':
                        guest.evaluate('__game.input.tap("tail")')
                        host.wait_for_function('Bomber.sim.owners.bombs===null',timeout=5000)
                        source=(ROOT/'tests'/'browser.py').read_text()
                        marker="result = page.evaluate('''"
                        driver=source.split(marker,1)[1].split("''')",1)[0]
                        for frame in frames:
                            frame.evaluate('cancelAnimationFrame(Bomber.hubRAF)')
                        driver=driver.replace('()=>{','async ()=>{',1).replace('for(let n=0;n<7300&&!app.sim.ended;n++){','for(let n=0;n<7300&&!app.sim.ended;n++){if(n%25===0)await new Promise(r=>setTimeout(r,0));').replace('{draw:true}','{draw:false}')
                        full=host.evaluate(driver)
                        if not full['result'] or not full['result']['won']:
                            raise AssertionError('Full Hub sortie did not recover: '+str(full['result']))
                        assertions['completeNativeInputSortie']=full['result']
                    if custom=='guest':
                        page.select_option('#who','p1')
                        page.click('#remove')
                        host.wait_for_function('Bomber.sim.players.length===1&&Bomber.sim.owners.bombs===null',timeout=10000)
                        assertions['departedDutiesReturnToAI']=True
                page.wait_for_function('window.__hubCheck && document.body.dataset.complete==="true"',timeout=120000)
                report=page.evaluate('window.__hubCheck')
                report['name']=name
                report['warnings']=warnings
                report['gameAssertions']=assertions
                states=[]
                for frame in page.frames[1:]:
                    if frame.evaluate('!!window.Bomber?.ready'):
                        states.append(frame.evaluate('({network:Bomber.inspect().network,time:Bomber.sim.time,ended:Bomber.sim.ended,audio:Bomber.sound.inspect(),owners:Bomber.sim.owners,players:Bomber.sim.players.map(p=>p.id)})'))
                report['gameStates']=states
                if warnings:
                    report['pass']=False
                if states and not all(s['network']['done'] and s['audio']['sources']==0 for s in states):
                    report['pass']=False
                    report['cleanupError']='End failed to stop sound or transport'
                if not report['pass']:
                    reasons=[c for c in report.get('checks',[]) if not c['pass']]
                    print('FAIL Hub '+name+': '+json.dumps(reasons or warnings or report.get('cleanupError')))
                reports.append(report)
            except Exception:
                print('FAIL Hub '+name+': harness did not complete')
                reports.append({'name':name,'pass':False,'error':traceback.format_exc(),'partial':page.evaluate('window.__hubCheck||null')})
            context.close()
        browser.close()
finally:
    server.shutdown()
    server.server_close()
(ROOT/'docs'/'hub-verification.json').write_text(json.dumps(reports,indent=2))
failed=sum(not r['pass'] for r in reports)
print(f'{len(reports)-failed}/{len(reports)} Hub scenarios passed; {failed} failures')
raise SystemExit(bool(failed))
