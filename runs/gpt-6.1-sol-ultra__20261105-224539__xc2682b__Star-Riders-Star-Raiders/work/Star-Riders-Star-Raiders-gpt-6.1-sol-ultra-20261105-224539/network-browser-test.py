from playwright.sync_api import sync_playwright
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
    context=browser.new_context()
    a=context.new_page();b=context.new_page()
    for page in (a,b):
        page.goto(base+'/network-smoke.html')
        assert page.title()=='Star Riders network smoke test'
        page.wait_for_function('window.smoke?.ready')
    code=a.evaluate('net.createRoom()')
    if not code:
        print(json.dumps({'passed':False,'stage':'create','statuses':a.evaluate('smoke.statuses')}))
    else:
        joined=b.evaluate('(code)=>net.joinRoom(code)',code)
        if not joined:
            print(json.dumps({'passed':False,'stage':'join','host':a.evaluate('smoke.statuses'),'client':b.evaluate('smoke.statuses')}))
        else:
            a.evaluate('net.launchRoom()')
            for page in (a,b):page.wait_for_function('smoke.starts.length===1',timeout=10000)
            a.evaluate('net.update(.2,{sector:3,x:10,y:20,z:30},25,"TEST")')
            b.evaluate('net.update(.2,{sector:3,x:40,y:50,z:60},40,"TEST")')
            for page in (a,b):page.wait_for_function('smoke.ghosts.length>0',timeout=10000)
            print(json.dumps({'passed':True,'seedA':a.evaluate('smoke.starts[0]'),'seedB':b.evaluate('smoke.starts[0]'),'ghostA':a.evaluate('smoke.ghosts[0]'),'ghostB':b.evaluate('smoke.ghosts[0]')}))
    for page in (a,b):page.evaluate('net.leave()')
    browser.close()
