import functools
import http.server
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
failures=[];checks=0

def check(ok,text):
    global checks
    checks+=1
    if not ok:failures.append(text)

try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
        ctx=browser.new_context()
        host=ctx.new_page();guest=ctx.new_page()
        errors=[]
        for page in (host,guest):
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(f'http://127.0.0.1:{server.server_port}/module-test.html')
            page.wait_for_function('window.modulesReady === true')
        check(host.evaluate('audio.musicVolume')==.1,'Music does not default to 10%.')
        probe=host.evaluate('audio.renderProbe()')
        check(probe['finite'] and probe['rms']>.01 and probe['peak']<1,'Offline procedural audio is silent, clipped, or invalid.')
        host.click('#unlock')
        host.evaluate("audio.event('rescue');audio.event('explode');audio.update(.1,[{thrust:true,hp:3}],true)")
        host.wait_for_timeout(200)
        diag=host.evaluate('audio.diagnostics()')
        check(diag['state']=='running' and diag['events']['rescue']==1 and diag['rms']>0,'Live effects did not produce sound.')
        host.evaluate("online.createRoom('AUTOCHECK')")
        guest.evaluate("online.joinRoom('AUTOCHECK')")
        host.wait_for_function('online.active && starts===1')
        guest.wait_for_function('online.active && starts===1')
        guest.evaluate("online.sendInput({x:1,fire:true})")
        host.wait_for_function('messages.length>0')
        check(host.evaluate('messages[0].from===1 && messages[0].input.fire'),'Broadcast co-op input did not reach host.')
        host.evaluate("online.sendSnapshot({score:450,players:[{x:12}]})")
        guest.wait_for_function('messages.length>0')
        check(guest.evaluate('messages[0].snapshot.score===450'),'Broadcast co-op snapshot did not reach guest.')
        for page in (host,guest):page.evaluate('online.disconnect();messages.length=0;starts=0;')
        offer=host.evaluate('online.createOffer()')
        answer=guest.evaluate('(code)=>online.acceptOffer(code)',offer)
        host.evaluate('(code)=>online.acceptAnswer(code)',answer)
        host.wait_for_function('online.active && online.started',timeout=15000)
        guest.wait_for_function('online.active && online.started',timeout=15000)
        check(host.evaluate('online.isHost') and guest.evaluate('online.isGuest'),'Direct co-op roles are incorrect.')
        guest.evaluate('online.sendInput({x:-1,thrust:true})')
        host.wait_for_function('messages.length>0')
        host.evaluate('online.sendSnapshot({score:900,players:[{x:17}]})')
        guest.wait_for_function('messages.length>0')
        check(host.evaluate('messages[0].input.thrust') and guest.evaluate('messages[0].snapshot.score===900'),'Direct co-op data did not cross both ways.')
        check(not errors,'Browser module errors: '+str(errors))
        browser.close()
except Exception as e:
    failures.append(str(e))
finally:
    server.shutdown();server.server_close()
import re
import subprocess
import sys
protocol=subprocess.run([sys.executable,str(ROOT/'test-online-protocol.py')],capture_output=True,text=True)
summary=re.search(r'(\d+) protocol checks, (\d+) failures',protocol.stdout)
if summary:checks+=int(summary.group(1))
for line in protocol.stdout.splitlines():
    if line.startswith('FAIL:'):failures.append(line[5:].strip())
if protocol.returncode and not summary:failures.append('Protocol test runner failed: '+protocol.stderr)
for failure in failures:print('FAIL:',failure)
print(f'{checks} checks, {len(failures)} failures')
raise SystemExit(bool(failures))
