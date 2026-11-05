import sys, json
from playwright.sync_api import sync_playwright
URL = 'file:///home/micha/dev/cc-matrix/runs/claude-sonnet-5-5-medium__20261102-181331__x22cc1b/work/WireTapDance-TheWire-claude-sonnet-5-5-medium-20261102-181331.html'
total = int(sys.argv[1]) if len(sys.argv) > 1 else 150
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader'])
    pg = b.new_page(viewport={'width': 960, 'height': 540}); logs = []
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
    pg.goto(URL); pg.wait_for_timeout(1000)
    last = None
    for i in range(total // 5):
        pg.wait_for_timeout(5000)
        s = pg.evaluate('(() => { const d = My3D2dge.current.debug.snapshot(); return {scene:d.scene, stage:d.stage, demo:d.demo, hero:d.hero, photos:d.photos, caught:d.caught, box:d.box, done:d.done, ov:d.overlay, err:d.errors}; })()')
        k = json.dumps([s['scene'], s['stage'], s['demo'], s['done']])
        if k != last: print(i * 5, json.dumps(s)); last = k
        if i == 6: pg.screenshot(path='/tmp/shots/att_a.png')
        if i == 12: pg.screenshot(path='/tmp/shots/att_b.png')
    print('\n'.join(logs[:10])); b.close()
