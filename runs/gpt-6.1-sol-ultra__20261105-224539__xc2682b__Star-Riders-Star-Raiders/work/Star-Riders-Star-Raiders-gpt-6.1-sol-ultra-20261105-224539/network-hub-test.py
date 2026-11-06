from playwright.sync_api import sync_playwright
from urllib.parse import urlencode
import json
import subprocess
import pathlib
import re
import atexit
server=subprocess.Popen(["python3","-u","-m","http.server","0","--bind","127.0.0.1","--directory",str(pathlib.Path(__file__).resolve().parent)],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
atexit.register(server.terminate)
port=int(re.search(r"port (\d+)",server.stdout.readline()).group(1))
base=f"http://127.0.0.1:{port}"
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page()
    results=[]
    for players,scenario in ((2,''),(4,''),(4,'host-leave')):
        params={'game':'../network-hub-smoke.html','players':players,'auto':1,'play':6000,'latency':150,'jitter':50,'loss':5}
        if scenario:params['scenario']=scenario
        page.goto(base+'/vendor/harness.html?'+urlencode(params))
        page.wait_for_function('window.__hubCheck?.done',timeout=45000)
        report=page.evaluate('window.__hubCheck')
        results.append({'players':players,'scenario':scenario or 'normal','pass':report['pass'],'checks':len(report['checks']),'failures':[c for c in report['checks'] if not c['pass']]})
    browser.close()
    print(json.dumps(results))
