import sys, subprocess, shutil, os, re, time; sys.path.insert(0,'tools/tests')
from blib import *
t=T()
root=os.path.abspath('tools/.hubsite'); os.makedirs(root,exist_ok=True)
for f in ['harness.html','bridge.js','round.js','session.js']: shutil.copy('tools/hub/'+f,root)
shutil.copy(HTML,root+'/game.html')
srv=subprocess.Popen(['python3','-u','-m','http.server','0','--bind','127.0.0.1'],cwd=root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
port=None
try:
    for _ in range(50):
        line=srv.stdout.readline(); m=re.search(r'port (\d+)',line)
        if m: port=int(m.group(1)); break
    t.ok(port,'server port')
    with sync_playwright() as p:
        b=p.chromium.launch(args=FL)
        ctx=b.new_context(viewport={'width':1280,'height':800})
        for q,name in [('players=2&auto=1','2 players'),('players=4&latency=150&jitter=50&loss=5&auto=1','4 players, bad network'),('players=2&auto=1&scenario=host-leave','host leaves')]:
            pg=ctx.new_page(); pg.goto(f'http://127.0.0.1:{port}/harness.html?game=game.html&{q}')
            ok=False
            try:
                pg.wait_for_function("document.body.dataset.complete==='true'",timeout=420000)
                vols=[f.evaluate("window.__GAME__?window.__GAME__.app.mix.audio.volume.music:null") for f in pg.frames if 'game.html' in f.url]; vols=[v for v in vols if v is not None]
                t.ok(len(vols)>=1 and all(abs(v-0.1)<1e-6 for v in vols),f'music at 10% in a session: {name}',vols)
                r=pg.evaluate("window.__hubCheck"); ok=bool(r and r.get('pass'))
                t.ok(ok,f'hub {name}',json.dumps([c for c in (r.get('checks') or r.get('items') or []) if not c.get('ok',c.get('pass',True))])[:600] if r else 'no result')
            except Exception as e:
                t.ok(False,f'hub {name} timed out',str(e)[:200]); print('state',pg.evaluate("JSON.stringify(window.__hubCheck||{})")[:600])
            pg.close()
        # the game outside a session still reaches the title
        pg=ctx.new_page(); pg.goto(f'http://127.0.0.1:{port}/game.html'); pg.wait_for_function("window.__GAME__!==undefined",timeout=60000); pg.wait_for_function("window.__GAME__.state().screen==='title'",timeout=30000); t.ok(True,'outside a session it reaches the title'); pg.close()
        b.close()
finally:
    srv.kill(); srv.wait()
t.done()
