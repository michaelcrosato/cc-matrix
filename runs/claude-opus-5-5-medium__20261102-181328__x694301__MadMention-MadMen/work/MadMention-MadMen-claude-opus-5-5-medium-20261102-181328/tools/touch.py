import sys, json
from playwright.sync_api import sync_playwright
page_url, out = sys.argv[1], sys.argv[2]
with sync_playwright() as p:
    b = p.webkit.launch(); ctx = b.new_context(**p.devices['iPhone 13'])
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(page_url); pg.wait_for_timeout(2500)
    pg.screenshot(path=out + '/t01-touch-title.png')
    pg.wait_for_timeout(11000)
    print(pg.evaluate("JSON.stringify(My3D2dge.current.debug.snapshot())")[:140])
    pg.wait_for_timeout(4000); pg.screenshot(path=out + '/t02-touch-demo.png')
    print(errs[:5])
    b.close()
