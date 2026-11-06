"""Measures how long the built file takes to reach window.__game. Usage: python3 labs/game/tools/boottime.py <html> [query]"""
import os, sys, time
from playwright.sync_api import sync_playwright
html = os.path.abspath(sys.argv[1]); query = sys.argv[2] if len(sys.argv) > 2 else ''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'), args=['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader'])
    pg = b.new_page(viewport={'width': 960, 'height': 540})
    pg.on('pageerror', lambda e: print('PAGEERROR', str(e)[:500]))
    pg.on('console', lambda m: print(m.type, m.text[:300]) if m.type in ('error',) or 'BOOT' in m.text else None)
    t = time.time()
    pg.goto('file://' + html + query, wait_until='commit')
    last = None
    while time.time() - t < 100:
        try:
            s = pg.evaluate("() => ({ engine: !!(window.__engine && window.__engine.ready), game: !!window.__game, help: !!(window.__engine && window.__engine.help) })")
        except Exception as e:
            s = str(e)[:80]
        if s != last:
            print(round(time.time() - t, 1), s); last = s
        if isinstance(s, dict) and s['game'] and s['engine']: break
        time.sleep(0.25)
    b.close()
