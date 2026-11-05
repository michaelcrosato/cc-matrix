import sys, json, os
from playwright.sync_api import sync_playwright
html, eng = os.path.abspath(sys.argv[1]), (sys.argv[2] if len(sys.argv) > 2 else 'chromium'); out = '/tmp/s55/shots'; os.makedirs(out, exist_ok=True)
errs = []
with sync_playwright() as pw:
    b = getattr(pw, eng).launch(); p = b.new_page(viewport={'width': 1280, 'height': 720})
    p.on('pageerror', lambda e: errs.append('PAGE ' + str(e)[:300])); p.on('console', lambda m: errs.append('CON ' + m.text[:300]) if m.type == 'error' else None)
    p.goto('file://' + html); p.wait_for_timeout(3500)
    S = lambda: json.dumps(p.evaluate("My3D2dge.current.debug.snapshot()"))
    def log(n): print(n, S())
    log('title'); p.screenshot(path=out + '/title.png')
    p.keyboard.press('Enter'); p.wait_for_timeout(1500); log('after enter'); p.screenshot(path=out + '/card.png')
    p.keyboard.press('Enter'); p.wait_for_timeout(2200); log('card->')
    p.keyboard.press('Enter'); p.wait_for_timeout(1500); log('brief'); p.screenshot(path=out + '/brief.png')
    p.keyboard.press('Enter'); p.wait_for_timeout(800)
    p.keyboard.down('d'); p.wait_for_timeout(1500); p.keyboard.up('d'); p.screenshot(path=out + '/field.png'); log('field')
    p.mouse.move(700, 300); p.mouse.down(button='right'); p.wait_for_timeout(600); p.mouse.click(700, 300); p.wait_for_timeout(300); p.screenshot(path=out + '/watch.png'); p.mouse.up(button='right')
    for s in ['board', 'cipher', 'wire', 'box', 'paper']:
        p.evaluate("s => { const g = My3D2dge.current.debug; g.STATE().photos.push({slot:'tee',stars:3,act:true}); g.Screens[s](() => {}); }", s); p.wait_for_timeout(500); p.screenshot(path=out + '/' + s + '.png')
        for i in range(14): p.keyboard.press('Enter'); p.wait_for_timeout(80)
        log(s)
    p.evaluate("My3D2dge.current.debug.toEnd()"); p.wait_for_timeout(1500); p.screenshot(path=out + '/end.png'); log('end')
    p.evaluate("My3D2dge.current.go('title')"); p.wait_for_timeout(12500); log('attract'); p.screenshot(path=out + '/attract.png'); p.wait_for_timeout(20000); log('attract2'); p.keyboard.press('x'); p.wait_for_timeout(1000); log('exit')
    print('ERRORS', len(errs)); [print(e) for e in errs[:12]]
    b.close()
