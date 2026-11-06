"""Official AI Hub harness, plus real guest input and shared pause checks."""
import functools
import http.server
import json
import pathlib
import sys
import threading
import urllib.parse
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).parent
class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_address[1]}'
results = []

def check(name, fn):
    try:
        fn()
        results.append({'name': name, 'pass': True})
    except Exception as error:
        results.append({'name': name, 'pass': False, 'detail': str(error)})
        print(f'FAIL {name}: {error}', flush=True)

def assert_true(value):
    assert value

def dispatch(frame, code, kind='keydown'):
    frame.evaluate('''([code,kind])=>document.body.dispatchEvent(new KeyboardEvent(kind,{code,key:code,bubbles:true,cancelable:true}))''', [code,kind])

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader','--disable-dev-shm-usage'])
        for scenario in (sys.argv[1:] or ['standard','host-leave','server']):
            context = browser.new_context(viewport={'width':1600,'height':1000})
            page = context.new_page()
            errors = []
            page.on('pageerror',lambda error: errors.append(str(error)))
            args = urllib.parse.urlencode({'game':'../index.html','players':'2','auto':'1','scenario':scenario,'latency':'150','jitter':'50','loss':'5','play':'10000'})
            page.goto(origin + '/hub/harness.html?' + args)
            page.wait_for_function('window.__hubCheck', timeout=10000)
            page.wait_for_function('document.body.dataset.complete==="true" || [...document.querySelectorAll("iframe")].filter(f=>f.contentWindow?.__DD?.ready).length >= 2', timeout=35000)
            if scenario == 'standard':
                page.wait_for_function('document.body.dataset.complete==="true" || [...document.querySelectorAll("iframe")].every(f=>f.contentWindow?.__DD?.network?.started && f.contentWindow?.__DD?.net?.roundTime>=0)',timeout=25000)
                frames = [frame for frame in page.frames if frame!=page.main_frame]
                if len(frames)>=2 and not page.evaluate('document.body.dataset.complete==="true"'):
                    host = next(f for f in frames if f.evaluate('window.__DD?.network?.isHost'))
                    guest = next(f for f in frames if not f.evaluate('window.__DD?.network?.isHost'))
                    check('hub bypasses the title menu', lambda: assert_true(host.evaluate('document.querySelector("#titleScreen").classList.contains("hidden")')))
                    dispatch(guest,'Space')
                    page.wait_for_timeout(400)
                    check('guest accelerator reaches authoritative host',lambda:assert_true(host.evaluate('window.__DD.state.players[1].boost===true')))
                    dispatch(guest,'Space','keyup')
                    dispatch(guest,'Escape')
                    try:
                        host.wait_for_function('window.__DD.state.mode==="paused"', timeout=3000)
                        guest.wait_for_function('window.__DD.state.mode==="paused"',timeout=3000)
                        check('guest can pause the shared world',lambda:assert_true(True))
                    except Exception as error:
                        check('guest can pause the shared world',lambda:assert_true(False))
                    dispatch(guest,'Escape','keyup')
                    dispatch(guest,'Escape')
                    try:
                        host.wait_for_function('window.__DD.state.mode==="playing"',timeout=3000)
                        guest.wait_for_function('window.__DD.state.mode==="playing"',timeout=3000)
                        check('guest can resume the shared world',lambda:assert_true(True))
                    except Exception as error:
                        check('guest can resume the shared world',lambda:assert_true(False))
                    dispatch(guest,'Escape','keyup')
            page.wait_for_function('document.body.dataset.complete==="true"',timeout=60000)
            report=page.evaluate('window.__hubCheck')
            for item in report['checks']:
                results.append({'scenario':scenario,**item})
                if not item['pass']:
                    print(f'FAIL {scenario}: {item["name"]}: {item.get("detail","")}',flush=True)
            check(f'{scenario}: browser error-free',lambda:assert_true(not errors))
            if errors: print('FAIL page errors: '+str(errors),flush=True)
            if scenario == 'standard':
                frames=[f for f in page.frames if f!=page.main_frame]
                if frames:
                    f=frames[0]
                    before=f.evaluate('window.__DD?.menu')
                    dispatch(f,'Escape')
                    page.wait_for_timeout(100)
                    check('ended Hub round ignores keyboard input',lambda:assert_true(f.evaluate('window.__DD?.menu')==before))
            context.close()
        browser.close()
finally:
    server.shutdown()
    (ROOT/'hub-test-results.json').write_text(json.dumps(results,indent=2))
    passed=sum(r['pass'] for r in results)
    failed=len(results)-passed
    print(f'{passed} passed, {failed} failed',flush=True)
raise SystemExit(bool(failed))
