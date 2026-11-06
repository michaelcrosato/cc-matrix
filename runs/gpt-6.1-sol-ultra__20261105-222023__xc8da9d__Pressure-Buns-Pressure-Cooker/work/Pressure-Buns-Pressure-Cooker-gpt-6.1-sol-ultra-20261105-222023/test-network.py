"""Two browser pages verify the same standalone network path used by players."""
import functools
import http.server
import pathlib
import threading
from playwright.sync_api import sync_playwright

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

def main():
    folder = pathlib.Path(__file__).resolve().parent
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(folder)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    failures=[]
    count=0
    def check(condition, message):
        nonlocal count
        count+=1
        if not condition:
            failures.append(message)
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True)
            context=browser.new_context()
            host=context.new_page()
            guest=context.new_page()
            url=f'http://127.0.0.1:{server.server_address[1]}/network-test.html'
            for page in (host,guest):
                page.goto(url)
                page.wait_for_function('window.testReady')
            code=host.evaluate('net.host()')
            check(len(code)==6, 'Room code must contain six characters')
            guest.evaluate('(code)=>net.join(code)', code)
            host.wait_for_function('net.connected')
            guest.wait_for_function('net.connected')
            guest.wait_for_function('messages.length>0')
            check(host.evaluate('net.isHost && net.localSeat===0'), 'Host must control chef zero')
            check(guest.evaluate('!net.isHost && net.localSeat===1'), 'Guest must control chef one')
            check(guest.evaluate('messages.at(-1).test===12'), 'Authoritative state must reach guest')
            guest.evaluate('net.sendInput({x:1,z:-1,action:true});net.sendInput({x:1,z:-1,action:false})')
            host.wait_for_function('inputs.some(p=>p.input.action)')
            check(host.evaluate('inputs.some(p=>p.seat===1 && p.input.x===1 && p.input.z===-1 && p.input.action)'), 'One-frame action must survive network tick and reach host')
            host.evaluate('snapshot={test:99}')
            guest.wait_for_function('messages.at(-1)?.test===99')
            check(True, 'Updated world must reach guest')
            guest.evaluate('net.leave()')
            host.wait_for_function('!net.connected')
            check(host.evaluate('events.some(e=>e.name==="disconnected")'), 'Guest leaving must notify host')
            host.evaluate('net.leave()')
            check(host.evaluate('net.role==="solo"'), 'Leaving room must restore standalone mode')
            browser.close()
    except Exception as exc:
        failures.append(str(exc))
    finally:
        server.shutdown()
    for failure in failures:
        print('FAIL: '+failure)
    print(f'{count} network checks, {len(failures)} failures')
    return len(failures)>0

if __name__=='__main__':
    raise SystemExit(main())
