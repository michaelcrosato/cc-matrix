import sys, time
from playwright.sync_api import sync_playwright
args = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
out = sys.argv[1]; want = {1, 3, 5}; got = set()
Q = "()=>({i:window.__GAME__.A.attract&&window.__GAME__.A.attract.i,sc:window.__ENGINE__.game&&window.__ENGINE__.game.name,t:window.__ENGINE__.game&&(window.__ENGINE__.game.attractT??(window.__ENGINE__.game.nav&&window.__ENGINE__.game.nav.top&&window.__ENGINE__.game.nav.top.s.t))})"
with sync_playwright() as p:
    b = p.chromium.launch(args=args); pg = b.new_page(viewport={'width': 1920, 'height': 1080}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(sys.argv[2]); pg.wait_for_timeout(3000); t0 = time.time()
    print('start', pg.evaluate(Q), flush=True)
    while got != want and time.time() - t0 < 2400:
        st = pg.evaluate(Q)
        if st['i'] in want and st['i'] not in got and (st['t'] is None or st['t'] > 1.0):
            pg.screenshot(path=f"{out}/v_{st['i']}.png"); st2 = pg.evaluate(Q)
            if st2['i'] == st['i']: got.add(st['i']); print('verified clip', st, st['i'], st['sc'], flush=True)
        pg.wait_for_timeout(200)
    print('seen', sorted(got), 'errors', errs[:3], flush=True); b.close()
