"""Official AI Hub conformance in standard, server and host-leave rounds."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
from urllib.parse import urlencode
import json
from playwright.sync_api import sync_playwright

def check_hub():
    dev=Path(__file__).resolve().parent;root=dev.parent
    class QuietHandler(SimpleHTTPRequestHandler):
        def log_message(self,*args):pass
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(root)))
    thread=Thread(target=server.serve_forever,daemon=True);thread.start()
    failures=[];count=0;reports=[]
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
            context=browser.new_context(ignore_https_errors=True,viewport={'width':1280,'height':720})
            for scenario in ['standard','server','host-leave']:
                page=context.new_page()
                params={'game':'../../'+dev.name+'.html','players':2,'auto':1,'scenario':scenario,'play':3000,'limit':30,'latency':150,'jitter':50,'loss':5}
                url=f'http://127.0.0.1:{server.server_port}/{dev.name}/hub/harness.html?'+urlencode(params)
                page.goto(url)
                if page.title()!='AI Hub — session harness':
                    actual=page.title()
                    if 'harness' not in actual.lower():raise AssertionError('Wrong harness page: '+actual)
                page.wait_for_function('document.body.dataset.complete==="true"',timeout=100000)
                report=page.evaluate('window.__hubCheck');reports.append(report)
                for check in report['checks']:
                    count+=1
                    if not check['pass']:failures.append(scenario+': '+check['name']+' — '+check['detail'])
                page.close()
            browser.close()
    except Exception as error:failures.append('Hub harness: '+str(error).splitlines()[0])
    finally:server.shutdown();server.server_close();thread.join(timeout=3)
    (dev/'hub-test-results.json').write_text(json.dumps(reports,indent=2))
    return count,failures

if __name__=='__main__':
    count,failures=check_hub()
    for failure in failures:print('FAIL:',failure)
    print(f'{count} official Hub checks; {len(failures)} failures')
    raise SystemExit(bool(failures))
