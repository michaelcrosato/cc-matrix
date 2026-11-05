import sys
from playwright.sync_api import sync_playwright
page_url, out = sys.argv[1], sys.argv[2]
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(page_url); pg.wait_for_timeout(1500)
    pg.evaluate("window.G = My3D2dge.current; G.debug.newGame('story'); const S = G.debug.state(); S.billings = 8.5; S.results = [{won:true},{won:true},{won:false}]; S.bunny = 2; S.home = 70; G.go('epilogue')")
    pg.wait_for_timeout(5000); pg.screenshot(path=out + '/e01-epilogue.png')
    pg.keyboard.press('Enter'); pg.wait_for_timeout(1500); pg.screenshot(path=out + '/e02-about.png')
    pg.keyboard.down('ArrowDown'); pg.wait_for_timeout(2500); pg.keyboard.up('ArrowDown'); pg.screenshot(path=out + '/e03-about2.png')
    pg.keyboard.down('ArrowDown'); pg.wait_for_timeout(4000); pg.keyboard.up('ArrowDown'); pg.screenshot(path=out + '/e04-about3.png')
    print(errs)
    b.close()
