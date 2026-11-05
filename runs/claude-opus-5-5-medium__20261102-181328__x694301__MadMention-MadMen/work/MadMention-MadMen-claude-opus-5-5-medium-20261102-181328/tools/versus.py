import sys, json
from playwright.sync_api import sync_playwright
page_url, out = sys.argv[1], sys.argv[2]
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.goto(page_url); pg.wait_for_timeout(1500); pg.evaluate("window.G = My3D2dge.current")
    snap = lambda: json.loads(pg.evaluate("JSON.stringify(G.debug.snapshot())"))
    k = pg.keyboard
    k.press('ArrowDown'); pg.wait_for_timeout(200); k.press('Enter'); pg.wait_for_timeout(1200)
    pg.screenshot(path=out + '/v01-draft.png')
    for i in range(8): k.press('ArrowRight'); pg.wait_for_timeout(150); k.press('Enter'); pg.wait_for_timeout(300)
    pg.wait_for_timeout(1000); pg.screenshot(path=out + '/v02-bs.png'); print(snap()['scene'])
    for i in range(10):
        if snap()['scene'] == 'pitch': break
        k.press('Enter'); pg.wait_for_timeout(600)
    for i in range(90):
        s = snap(); ph = s['pitch'] and s['pitch']['phase']
        if i == 14: pg.screenshot(path=out + '/v03-pitch.png')
        if s['scene'] != 'pitch' or ph == 'verdict': break
        if ph == 'closer': k.down('Enter'); pg.wait_for_timeout(1700); k.up('Enter')
        else: k.press('Enter')
        pg.wait_for_timeout(450)
    pg.wait_for_timeout(1500); pg.screenshot(path=out + '/v04-verdict.png'); print(snap()['pitch'])
    b.close()
print('\n'.join(errs[:20]) or 'no errors')
