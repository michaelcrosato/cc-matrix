import sys, time
from playwright.sync_api import sync_playwright
args = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
out = sys.argv[1]; want = [1]; got = {}
Q = "()=>{const g=window.__ENGINE__.game;return {i:window.__GAME__.A.attract&&window.__GAME__.A.attract.i,t:g&&(g.attractT??(g.nav&&g.nav.top&&g.nav.top.s.t))}}"
with sync_playwright() as p:
    b = p.chromium.launch(args=args); pg = b.new_page(viewport={'width': 1920, 'height': 1080}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(sys.argv[2]); pg.wait_for_timeout(4000)
    pg.evaluate("()=>{const g=window.__GAME__;g.A.fast=true;g.A.startAttract(window.__ENGINE__.game)}")  # the real attract director, wipes skipped
    t0 = time.time()
    while len(got) < 1 and time.time() - t0 < 900:
        pg.wait_for_timeout(150); st = pg.evaluate(Q)
        if st['i'] in want and st['i'] not in got and st['t'] is not None and st['t'] > 3.0:
            pg.screenshot(path=f"{out}/w_{st['i']}.png"); st2 = pg.evaluate(Q)
            if st2['i'] == st['i']:
                got[st['i']] = 1; print('clip', st['i'], 'verified', st2, flush=True)
    print('got', sorted(got), 'errors', errs[:3], flush=True); b.close()
