"""Full bundled game against the official AI Hub automatic conformance harness."""
import argparse
import functools
import http.server
import threading
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--scenario',choices=('all','standard','host-leave','server'),default='all')
    args=parser.parse_args()
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    checks=0;failures=[]
    scenarios=('standard','host-leave','server') if args.scenario=='all' else (args.scenario,)
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True,args=['--no-sandbox','--enable-unsafe-webgpu','--enable-features=Vulkan','--use-webgpu-adapter=swiftshader'])
            for scenario in scenarios:
                page=browser.new_page(viewport={'width':1280,'height':720})
                query=urlencode({'game':'../index.html','players':2,'auto':1,'play':2400,'latency':150,'jitter':50,'loss':5,'scenario':scenario})
                page.goto(f'http://127.0.0.1:{server.server_port}/hub-docs/harness.html?{query}')
                page.wait_for_function('document.body.dataset.complete === "true"',timeout=90000)
                report=page.evaluate('window.__hubCheck')
                checks+=len(report['checks'])
                for check in report['checks']:
                    if not check['pass']:failures.append(scenario+': '+check['name']+' '+check['detail'])
                frames=[frame for frame in page.frames if frame!=page.main_frame]
                for frame in frames:
                    result=frame.evaluate('''() => {
                        const g=window.__game;if(!g)return {boot:window.__bootError||'game did not initialize'};
                        return {ended:g.online.ended,mode:g.mode,state:g.sim.state,players:g.sim.players.length,backend:g.view.backend,role:g.online.isHost?'host':'guest'};
                    }''')
                    checks+=1
                    if 'boot' in result:failures.append(scenario+': '+result['boot'])
                    elif result['ended'] and result['mode']=='play':failures.append(scenario+': '+result['role']+' keeps gameplay active after Hub ended.')
                page.close()
            browser.close()
    except Exception as error:failures.append(str(error))
    finally:server.shutdown();server.server_close()
    for failure in failures:print('FAIL:',failure)
    print(f'{checks} full-game Hub checks, {len(failures)} failures')
    return bool(failures)

if __name__=='__main__':raise SystemExit(main())
