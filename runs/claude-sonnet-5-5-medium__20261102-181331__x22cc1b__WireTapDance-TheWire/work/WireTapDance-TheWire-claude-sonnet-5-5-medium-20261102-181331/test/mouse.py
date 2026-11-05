import json
from playwright.sync_api import sync_playwright
URL = 'file:///home/micha/dev/cc-matrix/runs/claude-sonnet-5-5-medium__20261102-181331__x22cc1b/work/WireTapDance-TheWire-claude-sonnet-5-5-medium-20261102-181331.html'
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 1280, 'height': 720}); logs = []
    pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
    pg.goto(URL); pg.wait_for_timeout(1200)
    ev = lambda s: pg.evaluate('(() => { const d = My3D2dge.current.debug; return ' + s + '; })()')
    # the title menu: hover moves the focus, a click picks
    pg.mouse.move(640, 300); pg.wait_for_timeout(200)
    pg.mouse.move(640, 330); pg.wait_for_timeout(300); pg.mouse.click(640, 330); pg.wait_for_timeout(1200)
    print('after click on the menu:', ev('d.snapshot().scene'))
    ev('d.teleport(...d.spawn("kowalczyk").map((v,i)=>i?v+50:v-30))'); pg.wait_for_timeout(500)
    found = None
    for y in range(60, 700, 14):
        for x in range(40, 1240, 16):
            pg.mouse.move(x, y); pg.wait_for_timeout(8)
            if ev('d.hoverId()') == 'kowalczyk': found = (x, y); break
        if found: break
    print('hover found at', found)
    if found:
        pg.mouse.click(*found); pg.wait_for_timeout(600)
        print('autowalk', ev('!!d.autoWalk()'), 'talking', ev('d.snapshot().talking'))
        pg.wait_for_timeout(3500)
        print('after walking up: talking', ev('d.snapshot().talking'), 'stage', ev('d.snapshot().stage'))
    pg.screenshot(path='/tmp/shots/mouse.png'); print(logs); b.close()
