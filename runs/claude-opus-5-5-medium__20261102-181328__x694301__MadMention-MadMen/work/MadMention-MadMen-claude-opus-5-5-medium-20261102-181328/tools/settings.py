import sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.goto(sys.argv[1]); pg.wait_for_timeout(1500)
    pg.evaluate("My3D2dge.current.menu('settings')"); pg.wait_for_timeout(800)
    pg.screenshot(path=sys.argv[2], full_page=True)
    print(pg.evaluate("JSON.stringify({g: My3D2dge.current.settings.glyphs, ix: My3D2dge.current.settings.invertX, iy: My3D2dge.current.settings.invertY, keys: My3D2dge.current.settings.keys('Game')})"))
    print(pg.evaluate("document.body.innerText.slice(0, 1500)"))
    b.close()
