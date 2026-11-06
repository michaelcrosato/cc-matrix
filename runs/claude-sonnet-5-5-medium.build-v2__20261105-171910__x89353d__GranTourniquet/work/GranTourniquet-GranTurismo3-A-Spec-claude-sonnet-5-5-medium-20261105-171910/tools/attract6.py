import sys, time
from playwright.sync_api import sync_playwright
args = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
with sync_playwright() as p:
    b = p.chromium.launch(args=args); pg = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(sys.argv[1]); pg.wait_for_timeout(3000); seq = []; t0 = time.time()
    while time.time() - t0 < 2000:
        i = pg.evaluate("()=>window.__GAME__.A.attract&&window.__GAME__.A.attract.i"); vis = pg.evaluate("()=>window.__GAME__.A.attractLog||[]")
        if i is not None and (not seq or seq[-1] != i): seq.append(i); print('clip', i, flush=True)
        if len(vis) >= 11: break
        pg.wait_for_timeout(40)
    print('DIRECTOR VISIT LOG', vis, flush=True); print('DONE sequence', seq, 'distinct', sorted(set(seq)), 'page/console errors:', errs[:5], flush=True); b.close()
