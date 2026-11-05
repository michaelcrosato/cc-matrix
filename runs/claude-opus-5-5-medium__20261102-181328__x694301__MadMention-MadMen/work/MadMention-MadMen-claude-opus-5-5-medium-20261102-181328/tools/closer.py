import sys, json
from playwright.sync_api import sync_playwright
page_url, out = sys.argv[1], sys.argv[2]
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(page_url); pg.wait_for_timeout(1500)
    pg.evaluate("""window.G = My3D2dge.current; G.debug.newGame('story'); const S = G.debug.state();
      for (const id of ['rules','notebook','sketch','photo','rye','warstory','window']) S.cards.push(Object.assign({id}, window.MM.CARDS[id])); G.go('brainstorm')""")
    pg.wait_for_timeout(1500); pg.screenshot(path=out + '/k01-bs.png')
    snap = lambda: json.loads(pg.evaluate("JSON.stringify(G.debug.snapshot())"))
    for i in range(14):
        if snap()['scene'] == 'pitch': break
        pg.keyboard.press('Enter' if i not in (4,) else 'ArrowRight'); pg.wait_for_timeout(350)
        if i == 2: pg.screenshot(path=out + '/k02-bs-picked.png')
    for i in range(80):
        s = snap(); ph = s['pitch'] and s['pitch']['phase']
        if s['scene'] != 'pitch' or ph == 'verdict': break
        if ph == 'closer':
            pg.keyboard.down('Enter'); pg.wait_for_timeout(1300); pg.screenshot(path=out + '/k03-closer.png'); pg.wait_for_timeout(450); pg.keyboard.up('Enter'); pg.wait_for_timeout(400)
            pg.screenshot(path=out + '/k04-after.png')
        else: pg.keyboard.press('Enter')
        pg.wait_for_timeout(400)
    print(snap()['pitch'], errs)
    b.close()
