#!/usr/bin/env python3
# Runs the AI Hub harness in each scenario. Prints only failures, then one count line.
import subprocess, sys, os, time, re, json
from playwright.sync_api import sync_playwright
FLAGS=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
here=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','hub')
srv=subprocess.Popen([sys.executable,'-u','-m','http.server','0','--bind','127.0.0.1'],cwd=here,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
line=srv.stdout.readline(); port=re.search(r'port (\d+)',line).group(1)
SC=sys.argv[1:] or ['players=2','players=4&latency=150&jitter=50&loss=5','players=4&latency=150&jitter=50&loss=5&scenario=host-leave','players=2&scenario=server']
fails=0
try:
  with sync_playwright() as p:
    b=p.chromium.launch(args=FLAGS)
    for sc in SC:
      pg=b.new_page(viewport={'width':1280,'height':800})
      errs=[]
      pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
      pg.goto(f'http://127.0.0.1:{port}/harness.html?game=game.html&auto=1&{sc}')
      try:
        pg.wait_for_function("document.body.dataset.complete==='true'",timeout=420000)
        r=pg.evaluate("JSON.stringify(window.__hubCheck)")
        c=json.loads(r)
        if not c.get('pass'):
          fails+=1; print('FAIL',sc); print(json.dumps([x for x in c.get('checks',c.get('items',[])) if not x.get('ok',x.get('pass',True))])[:1600]); print(r[:1200] if not c.get('checks') else '')
      except Exception as e:
        fails+=1; print('FAIL timeout',sc,str(e)[:200]); print(pg.evaluate("JSON.stringify(window.__hubCheck||{})")[:1500]); print(pg.evaluate("document.body.innerText")[:1200])
      if errs: print('page errors',errs[:3])
      pg.close()
    b.close()
finally:
  srv.terminate(); srv.wait(5)
print(f'hub: {len(SC)-fails}/{len(SC)} passed')
sys.exit(1 if fails else 0)
