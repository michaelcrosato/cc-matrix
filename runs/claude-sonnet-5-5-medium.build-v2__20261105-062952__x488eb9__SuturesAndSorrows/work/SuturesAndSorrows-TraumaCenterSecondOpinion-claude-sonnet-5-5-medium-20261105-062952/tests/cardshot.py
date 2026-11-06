import subprocess,sys,re,os
from playwright.sync_api import sync_playwright
d=os.path.abspath('tests/hubdir'); root=os.path.abspath('.')
srv=subprocess.Popen([sys.executable,'-u','-m','http.server','0','--bind','127.0.0.1'],cwd=d,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
try:
    port=int(re.search(r'port (\d+)',srv.stdout.readline()).group(1))
    with sync_playwright() as p:
        b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']); pg=b.new_page(viewport={'width':1920,'height':1080})
        pg.goto(f'http://127.0.0.1:{port}/harness.html?game=game.html&players=2'); pg.wait_for_timeout(11000)
        pg.screenshot(path=os.path.join(root,'shots','hubcard.png')); b.close()
finally: srv.terminate()
