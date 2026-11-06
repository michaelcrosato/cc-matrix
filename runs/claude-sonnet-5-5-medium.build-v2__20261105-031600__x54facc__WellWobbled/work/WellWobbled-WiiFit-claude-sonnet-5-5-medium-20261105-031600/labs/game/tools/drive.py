"""Drives the built single file like a player with the keyboard and takes screenshots at the named moments.
Usage: python3 labs/game/tools/drive.py <html> <outdir>"""
import sys, os, time, json
from playwright.sync_api import sync_playwright
html = os.path.abspath(sys.argv[1]); out = sys.argv[2]; os.makedirs(out, exist_ok=True)
ARGS = ['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
def state(pg): return pg.evaluate('({e: (window.__engine.errors||[]).map(x=>x.code+":"+x.message.slice(0,160)), g: window.__game})')
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS); pg = b.new_page(viewport={'width': 1920, 'height': 1080}); logs = []
    pg.on('pageerror', lambda e: logs.append('pageerror: ' + str(e)[:300]))
    pg.on('console', lambda m: logs.append(m.text[:240]) if m.type == 'error' else None)
    pg.goto('file://' + html)
    t0 = time.time()
    while time.time() - t0 < 120 and not pg.evaluate('!!(window.__engine && window.__engine.ready && window.__game)'): time.sleep(1)
    time.sleep(2); pg.keyboard.press('Enter'); time.sleep(4); pg.screenshot(path=out + '/island.png'); print('after begin', state(pg))
    pg.keyboard.press('Tab'); time.sleep(1.5); pg.screenshot(path=out + '/programme.png'); pg.keyboard.press('ArrowDown'); pg.keyboard.press('Enter'); time.sleep(6)
    pg.screenshot(path=out + '/activity.png'); print('in activity', state(pg))
    for _ in range(40):
        pg.keyboard.down('KeyD'); time.sleep(0.2); pg.keyboard.up('KeyD'); pg.keyboard.down('KeyW'); time.sleep(0.15); pg.keyboard.up('KeyW')
    pg.screenshot(path=out + '/activity2.png'); print('end', state(pg)); print('\n'.join(logs[:10])); b.close()
