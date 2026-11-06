"""Boot check: opens the built single file in software-rendered Chromium, waits for the engine, prints state and errors,
optionally saves a screenshot. Usage: python3 labs/game/tools/boot.py <html> [shot.png] [extra-query]"""
import sys, json, time
from playwright.sync_api import sync_playwright
html = sys.argv[1]; shot = sys.argv[2] if len(sys.argv) > 2 else None; q = sys.argv[3] if len(sys.argv) > 3 else ''
ARGS = ['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    pg = b.new_page(viewport={'width': 1920, 'height': 1080})
    logs = []
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text[:300]) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append('pageerror: ' + str(e)[:300]))
    pg.goto('file://' + __import__('os').path.abspath(html) + q)
    t0 = time.time(); ok = False
    while time.time() - t0 < 120:
        st = pg.evaluate('({ready: window.__engine && window.__engine.ready, errors: (window.__engine && window.__engine.errors || []).length, game: window.__game || null})')
        if st['ready'] and st['game']: ok = True; break
        time.sleep(1)
    time.sleep(3)
    st = pg.evaluate('({ready: window.__engine && window.__engine.ready, errors: (window.__engine.errors || []).map(e => e.code + ": " + e.message.slice(0,200)), game: window.__game || null})')
    print(json.dumps(st)); print('\n'.join(logs[:12]))
    if shot: pg.screenshot(path=shot)
    b.close()
