"""Official AI Hub harness against the final bundled game, including dedicated authority."""
import json
import sys
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
GAME = ROOT.parent / (ROOT.name + '.html')
checks = []
reports = []

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

if not GAME.exists():
    print('FAIL official AI Hub harness: bundled game does not exist yet')
    raise SystemExit(1)

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT.parent)))
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-webgpu-adapter=swiftshader'])
        for scenario in (sys.argv[1:] or ['standard', 'server', 'host-leave']):
            context = browser.new_context(viewport={'width':1280,'height':800},ignore_https_errors=True)
            page = context.new_page()
            errors=[]
            console_errors=[]
            failed_requests=[]
            page.add_init_script("window.__capturedHubErrors=[];addEventListener('message',event=>{if(event.data?.aihub===1&&event.data.type==='error')window.__capturedHubErrors.push({message:event.data.message,fatal:event.data.fatal});});")
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console',lambda msg:console_errors.append(msg.text) if msg.type=='error' else None)
            page.on('requestfailed',lambda request:failed_requests.append({'url':request.url,'failure':request.failure}))
            params={'game':'/'+GAME.name,'players':2,'auto':1,'play':4000,'limit':60,'latency':150,'jitter':50,'loss':5,'scenario':scenario}
            url=f'http://127.0.0.1:{server.server_address[1]}/{ROOT.name}/hub/harness.html?{urlencode(params)}'
            try:
                page.goto(url,wait_until='domcontentloaded')
                assert page.locator('#game').input_value() == '/'+GAME.name, 'harness loaded another game'
                page.wait_for_function('document.body.dataset.complete === "true"',timeout=90000)
                report=page.evaluate('window.__hubCheck')
                frame_renderers=[]
                for frame in page.frames[1:]:
                    try:
                        frame_renderers.append(frame.evaluate('({url:location.href,renderer:window.__game?.inspect().renderer??null,rendererRecoveries:window.__game?.inspect().rendererRecoveries??null,errors:window.__game?.inspect().errors??null})'))
                    except Exception as frame_error:
                        frame_renderers.append({'url':frame.url,'inspectionError':str(frame_error)})
                diagnostics={'hubErrors':page.evaluate('window.__capturedHubErrors'),'consoleErrors':console_errors.copy(),'failedRequests':failed_requests.copy(),'frameRenderers':frame_renderers}
                reports.append({'scenario':scenario,**report,'diagnostics':diagnostics})
                for item in report['checks']:
                    checks.append({'name':f'Hub {scenario}: '+item['name'],'passed':item['pass'],'detail':item.get('detail','')})
                    if not item['pass']:
                        print(f"FAIL Hub {scenario}: {item['name']}: {item.get('detail','')}")
                if not report['pass']:
                    print('FAIL Hub diagnostics: '+json.dumps(diagnostics))
                if errors:
                    checks.append({'name':f'Hub {scenario}: outer browser errors','passed':False,'detail':' / '.join(errors)})
                    print(f'FAIL Hub {scenario}: outer browser errors: {errors}')
            except Exception as error:
                checks.append({'name':f'Hub {scenario}: harness completion','passed':False,'detail':str(error)})
                print(f'FAIL Hub {scenario}: {error}')
            finally:
                context.close()
        browser.close()
finally:
    server.shutdown()
    server.server_close()
passed=sum(c['passed'] for c in checks)
failed=sum(not c['passed'] for c in checks)
(ROOT/'hub-test-results.json').write_text(json.dumps({'checks':checks,'passed':passed,'failed':failed,'reports':reports},indent=2))
print(f'{passed} Hub tests passed; {failed} failed')
raise SystemExit(0 if failed==0 else 1)
