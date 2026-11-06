import sys, time, json
from playwright.sync_api import sync_playwright
args = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
out = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(args=args); pg = b.new_page(viewport={'width': 1920, 'height': 1080}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(sys.argv[2]); pg.wait_for_timeout(3000)
    seen = []; t0 = time.time(); started = False; last = -1
    while time.time() - t0 < 1500:
        st = pg.evaluate("()=>({a:!!window.__GAME__.A.attract,i:window.__GAME__.A.attract&&window.__GAME__.A.attract.i,sc:window.__ENGINE__.game&&window.__ENGINE__.game.name,t:window.__GAME__.A.attract&&window.__GAME__.A.attract.t})")
        if st['a']:
            started = True
            if st['i'] != last and st['sc'] in ('menu','race'):
                pg.wait_for_timeout(4000); pg.screenshot(path=f"{out}/att_{st['i']}.png"); seen.append(st['i']); last = st['i']; print('clip', st['i'], st['sc'], flush=True)
            if len(seen) >= 10 and last == 9: pass
        if started and not st['a']: break
        if len(seen) >= 10 and st['i'] == 0 and len(seen) > 10: break
        if len(seen) >= 10 and last == 0: break
        pg.wait_for_timeout(1500)
    print('seen', seen, 'looped', seen.count(0) , 'errors', errs[:3], flush=True); b.close()
