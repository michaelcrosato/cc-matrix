import sys, json
from playwright.sync_api import sync_playwright
page_url, out = sys.argv[1], sys.argv[2]
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error','warning') else None)
    pg.goto(page_url); pg.wait_for_timeout(1500); pg.evaluate("window.G = My3D2dge.current")
    seen = []
    for i in range(36):
        pg.wait_for_timeout(3000)
        s = json.loads(pg.evaluate("JSON.stringify(G.debug.snapshot())"))
        seen.append((i*3+3, s['scene'], s['mode'], s['clock'], len(s['cards']), s['pitch'] and s['pitch']['phase']))
        if i % 3 == 0: pg.screenshot(path=out + '/a%02d.png' % i)
    for x in seen: print(x)
    pg.keyboard.press('KeyQ'); pg.wait_for_timeout(800)
    print('after key', pg.evaluate("JSON.stringify(G.debug.snapshot())")[:120])
    b.close()
print('\n'.join(errs[:20]) or 'no errors')
