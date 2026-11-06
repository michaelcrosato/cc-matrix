"""Unmodified AI Hub harness checks; one local server and one browser, both owned here."""
import functools
import http.server
import pathlib
import threading
import urllib.parse
from playwright.sync_api import sync_playwright

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

def main():
    folder=pathlib.Path(__file__).resolve().parent
    workspace=folder.parent
    game=folder.name+'.html'
    failures=[]
    count=0
    if not (workspace/game).is_file():
        print('FAIL: bundled game file is missing: '+game)
        print('0 hub checks, 1 failure')
        return True
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(workspace)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    cases=[
        ('standard',{}),
        ('delayed-lossy',{'latency':'150','jitter':'50','loss':'5'}),
        ('host-leave',{'scenario':'host-leave'}),
        ('dedicated-server',{'scenario':'server'}),
    ]
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
            context=browser.new_context(viewport={'width':1280,'height':720})
            for name,extra in cases:
                page=context.new_page()
                try:
                    params={'game':'../'+game,'players':'2','auto':'1',**extra}
                    url=f'http://127.0.0.1:{server.server_address[1]}/{folder.name}/harness.html?'+urllib.parse.urlencode(params)
                    page.goto(url,wait_until='domcontentloaded')
                    page.wait_for_function('window.__hubCheck?.done===true',timeout=60000)
                    report=page.evaluate('window.__hubCheck')
                    count+=len(report.get('checks',[]))
                    if not report.get('pass'):
                        for check in report.get('checks',[]):
                            if not check['pass']:
                                failures.append(f'{name}: {check["name"]}: {check.get("detail","")}')
                except Exception as exc:
                    failures.append(f'{name}: {exc}')
                finally:
                    page.close()
            browser.close()
    finally:
        server.shutdown()
    for failure in failures:
        print('FAIL: '+failure)
    print(f'{count} hub checks, {len(failures)} failures')
    return bool(failures)

if __name__=='__main__':
    raise SystemExit(main())
