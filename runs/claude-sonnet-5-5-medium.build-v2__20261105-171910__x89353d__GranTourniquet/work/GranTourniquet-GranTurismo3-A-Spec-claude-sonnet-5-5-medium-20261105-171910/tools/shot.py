import sys, json
from playwright.sync_api import sync_playwright
url, out = sys.argv[1], sys.argv[2]; wait = float(sys.argv[3]) if len(sys.argv) > 3 else 3
args = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
with sync_playwright() as p:
    b = p.chromium.launch(args=args); pg = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(wait * 1000); pg.screenshot(path=out)
    print(json.dumps(pg.evaluate("()=>window.__PIXEL_ENGINE__?window.__PIXEL_ENGINE__.state().status:'noengine'")), errs[:5]); b.close()
