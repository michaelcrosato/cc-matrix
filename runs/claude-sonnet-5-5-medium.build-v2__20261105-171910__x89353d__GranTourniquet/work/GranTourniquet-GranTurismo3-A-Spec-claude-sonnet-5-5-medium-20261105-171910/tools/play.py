# Drives the built html: python3 tools/play.py <url> <outprefix> '<js to eval each step; ; separated>' ...  (small helper for screenshots)
import sys, json
from playwright.sync_api import sync_playwright
url = sys.argv[1]; prefix = sys.argv[2]; steps = sys.argv[3:]
args = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
with sync_playwright() as p:
    b = p.chromium.launch(args=args); pg = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(3500)
    for i, s in enumerate(steps):
        if s.startswith('wait:'): pg.wait_for_timeout(float(s[5:]) * 1000); continue
        if s.startswith('key:'): pg.keyboard.press(s[4:]); pg.wait_for_timeout(300); continue
        if s.startswith('shot:'): pg.screenshot(path=prefix + s[5:] + '.png'); continue
        r = pg.evaluate(s); print(json.dumps(r)[:600])
    print('errors:', errs[:6]); b.close()
