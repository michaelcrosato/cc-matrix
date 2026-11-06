"""Shows Plumb's plait moving: puts the guest beside Plumb, turns the storm on, takes frames and compares them. Usage: python3 plait.py <html>"""
import os,sys,time,hashlib
from playwright.sync_api import sync_playwright
html=os.path.abspath(sys.argv[1])
ARGS=['--no-sandbox','--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
with sync_playwright() as p:
    b=p.chromium.launch(args=ARGS); pg=b.new_page(viewport={'width':800,'height':450}); pg.goto('file://'+html)
    t0=time.time()
    while time.time()-t0<150 and not pg.evaluate('!!(window.__engine && window.__engine.ready && window.__game && window.__ww)'): time.sleep(1)
    ev=pg.evaluate; ev("window.__ww.ctx.pick('title','begin')"); time.sleep(6)
    ev("window.__engine.actions.run('game.go',{station:'pavilion'}); window.__ww.setCamera('cam3=stage,portrait')"); time.sleep(25)
    ev("window.__engine.actions.run('dev.storm',{v:1})")
    hs=[]
    for i in range(4):
        time.sleep(10); f=f'out/shots/plait{i}.png'; pg.screenshot(path=f); hs.append(hashlib.md5(open(f,'rb').read()).hexdigest()[:8])
    print('frames', hs, 'distinct', len(set(hs)), 'errors', ev("window.__engine.errors.length")); b.close()
