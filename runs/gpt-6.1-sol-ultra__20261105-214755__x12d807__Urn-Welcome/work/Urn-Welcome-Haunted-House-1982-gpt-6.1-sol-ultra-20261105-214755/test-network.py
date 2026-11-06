from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
import threading
from playwright.sync_api import sync_playwright

failures=[]
checks=0
def check(ok,label):
    global checks
    checks+=1
    if not ok: failures.append(label)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
root=Path(__file__).resolve().parent
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/network-test.html'
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        context=browser.new_context()
        a=context.new_page();b=context.new_page()
        a.goto(url);b.goto(url)
        a.wait_for_function('window.loaded');b.wait_for_function('window.loaded')
        code=a.evaluate('net.host()')
        check(len(code)==4,'host room code')
        b.evaluate('(code)=>net.join(code)',code)
        a.wait_for_function('net.connected');b.wait_for_function('net.connected')
        check(a.evaluate('net.playerCount===2 && net.role==="host"'),'BroadcastChannel host connected')
        check(b.evaluate('net.localIndex===1 && net.role==="guest"'),'BroadcastChannel guest seat')
        a.evaluate('net.broadcast({players:[{x:1},{x:2}],fragments:2})')
        b.wait_for_function('events.some(e=>e[0]==="snapshot")')
        check(b.evaluate('events.find(e=>e[0]==="snapshot")[1].fragments===2'),'BroadcastChannel state transport')
        b.evaluate('net.sendInput({x:.4,y:-.8,action:true})')
        a.wait_for_function('events.some(e=>e[0]==="input")')
        check(a.evaluate('events.find(e=>e[0]==="input")[2]===1'),'BroadcastChannel guest input seat')
        a.evaluate('net.finish(true,123)')
        b.wait_for_function('events.some(e=>e[0]==="end")')
        check(b.evaluate('events.find(e=>e[0]==="end")[1].won'),'BroadcastChannel result transport')
        b.evaluate('net.disconnect()')
        a.wait_for_function('!net.connected')
        check(a.evaluate('net.playerCount===1'),'BroadcastChannel guest departure')
        check(a.evaluate('net.beginRound() && !net.reported'),'standalone round reset')
        a.evaluate('net.disconnect(); events=[]');b.evaluate('events=[]')
        offer=a.evaluate('net.createOffer()')
        check(offer.startswith('URNZ.') or offer.startswith('URN1.'),'WebRTC invitation encoding')
        answer=b.evaluate('(x)=>net.acceptOffer(x)',offer)
        a.evaluate('(x)=>net.acceptAnswer(x)',answer)
        a.wait_for_function('net.connected',timeout=20000);b.wait_for_function('net.connected',timeout=20000)
        check(a.evaluate('net.dataChannel.readyState==="open"'),'WebRTC host data channel')
        check(b.evaluate('net.dataChannel.readyState==="open"'),'WebRTC guest data channel')
        a.evaluate('net.broadcast({players:[{x:7},{x:9}],fragments:3})')
        b.wait_for_function('events.some(e=>e[0]==="snapshot")')
        check(b.evaluate('events.find(e=>e[0]==="snapshot")[1].fragments===3'),'WebRTC state transport')
        b.evaluate('net.sendInput({x:1,y:0,action:true})')
        a.wait_for_function('events.some(e=>e[0]==="input")')
        check(a.evaluate('events.find(e=>e[0]==="input")[1].action && events.find(e=>e[0]==="input")[2]===1'),'WebRTC input transport')
        a.evaluate('net.finish(true,456)')
        b.wait_for_function('events.some(e=>e[0]==="end")')
        check(b.evaluate('events.find(e=>e[0]==="end")[1].score===456'),'WebRTC result transport')
        a.evaluate('net.disconnect()');b.evaluate('net.disconnect()')
        browser.close()
except Exception as error:
    failures.append(f'network exception: {error}')
finally:
    server.shutdown();server.server_close()
for failure in failures: print('FAIL '+failure)
print(f'{checks} network checks, {len(failures)} failures')
raise SystemExit(bool(failures))
