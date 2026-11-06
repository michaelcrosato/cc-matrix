import functools
import http.server
import pathlib
import threading
import sys
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).resolve().parent
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(root)))
thread=threading.Thread(target=server.serve_forever,daemon=True)
thread.start()
failures=[]
count=0
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
        context=browser.new_context()
        host=context.new_page()
        guest=context.new_page()
        errors=[]
        host.on('pageerror',lambda e:errors.append(str(e)))
        guest.on('pageerror',lambda e:errors.append(str(e)))
        url=f'http://127.0.0.1:{server.server_port}/network-probe.html'
        for page in (host,guest):
            page.goto(url)
            page.wait_for_function('window.ready===true')
            assert page.title()=='Kapop network probe'
        code=host.evaluate('net.host()')
        assert len(code)==6
        count+=1
        guest.evaluate('(code)=>net.join(code)',code)
        for page in (host,guest):
            page.wait_for_function('net.connected && net.players.length===2',timeout=10000)
        count+=1
        assert host.evaluate('net.start()') is True
        guest.wait_for_function('probe.events.length===1')
        count+=1
        host.wait_for_function('net.canPlay',timeout=5000)
        guest.wait_for_function('net.canPlay',timeout=5000)
        host.evaluate('net.update(.2,{score:123,bombs:[{id:1,x:2,y:4}]})')
        guest.wait_for_function('probe.states.length===1')
        assert guest.evaluate('probe.states[0].score')==123
        count+=1
        guest.evaluate('net.sendInput({x:5,pop:true});net.update(.2)')
        host.wait_for_function('probe.inputs.length===1')
        assert host.evaluate('probe.inputs[0]')=={'id':1,'x':5,'pop':True}
        count+=1
        host.evaluate('net.finish(true,999)')
        guest.wait_for_function('net.ended')
        count+=1
        # Starting another run through the same room must revive the guest.
        host.evaluate('net.start()')
        guest.wait_for_function('probe.events.length===2 && net.started && !net.ended')
        count+=1
        assert not errors,errors
        count+=1
        guest.evaluate('net.disconnect()')
        host.wait_for_function('!net.connected')
        host.evaluate('net.disconnect()')
        browser.close()
except Exception as error:
    failures.append(str(error))
finally:
    server.shutdown()
    server.server_close()
for error in failures:
    print('FAIL standalone network: '+error)
print(f'{count} standalone network checks passed; {len(failures)} failed')
sys.exit(1 if failures else 0)
