"""Two real Chromium peers exercise both standalone network transports."""
import json
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
checks = []

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

def check(name, fn):
    try:
        fn()
        checks.append({'name': name, 'passed': True, 'detail': ''})
    except Exception as error:
        checks.append({'name': name, 'passed': False, 'detail': str(error)})
        print(f'FAIL {name}: {error}')

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context()
    pages = [context.new_page(), context.new_page()]
    for page in pages:
        page.goto(f'http://127.0.0.1:{server.server_address[1]}/selection.json')
        page.add_script_tag(content=(ROOT/'net.js').read_text().replace('export function createNetwork','function createNetwork'))
        page.evaluate('''() => { window.events={}; window.net=createNetwork({onInput:(data,id)=>events.input={data,id},onSnapshot:data=>events.snapshot=data,onStart:()=>events.started=true,onEnd:data=>events.end=data,onLeave:data=>events.left=data}); }''')
    a, b = pages
    def local():
        a.evaluate("net.host('NETWORK-TEST')")
        b.evaluate("net.join('NETWORK-TEST')")
        a.wait_for_function('net.connected')
        b.wait_for_function('net.connected')
        a.evaluate('net.start()')
        b.wait_for_function('events.started')
        b.evaluate('net.sendInput({x:0.5,fire:true})')
        a.wait_for_function('events.input?.data.fire===true')
        a.evaluate('net.sendSnapshot({score:765,players:[{x:8},{x:9}]})')
        b.wait_for_function('events.snapshot?.score===765')
        assert a.evaluate('events.input.id') == 1
        assert b.evaluate('events.snapshot.players[1].x') == 9
        a.evaluate('net.solo()')
        b.evaluate('net.solo()')
    check('browser standalone BroadcastChannel round trip', local)
    def rtc():
        offer = a.evaluate('net.createOffer()')
        answer = b.evaluate('(offer)=>net.answerOffer(offer)', offer)
        a.evaluate('(answer)=>net.acceptAnswer(answer)', answer)
        a.wait_for_function('net.connected',timeout=20000)
        b.wait_for_function('net.connected',timeout=20000)
        a.evaluate('events={};net.start()')
        b.wait_for_function('net.started')
        b.evaluate('net.sendInput({x:-0.8,fire:true})')
        a.wait_for_function('events.input?.data.x===-0.8')
        a.evaluate('net.sendSnapshot({score:987,players:[{x:22},{x:23}]})')
        b.wait_for_function('events.snapshot?.score===987')
        a.evaluate('net.finish(true,987)')
        b.wait_for_function('events.end?.won===true')
        a.evaluate('net.restart()')
        b.wait_for_function('net.started&&!net.ended')
    check('browser standalone WebRTC offer-answer, controls, snapshot, team result', rtc)
    for page in pages:
        page.evaluate('net.close()')
    browser.close()
server.shutdown()
server.server_close()
(ROOT/'network-browser-test-results.json').write_text(json.dumps({'checks':checks,'passed':sum(c['passed'] for c in checks),'failed':sum(not c['passed'] for c in checks)},indent=2))
print(f"{sum(c['passed'] for c in checks)} browser network tests passed; {sum(not c['passed'] for c in checks)} failed")
raise SystemExit(0 if all(c['passed'] for c in checks) else 1)
