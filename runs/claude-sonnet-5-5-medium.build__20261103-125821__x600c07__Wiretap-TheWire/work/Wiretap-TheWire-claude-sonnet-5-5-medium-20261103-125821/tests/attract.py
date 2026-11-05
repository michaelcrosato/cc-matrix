import sys, os
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b = pw.chromium.launch(); p = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
    p.on('pageerror', lambda e: errs.append(str(e)[:300]))
    p.goto('file:///tmp/s55/w.html'); p.wait_for_timeout(3000)
    p.evaluate("My3D2dge.current.debug.Attract.start()")
    for i in range(6):
        p.wait_for_timeout(5000); print(p.evaluate("(()=>{const d=My3D2dge.current.debug;const F=d.Field;return [F.m.id,F.dana&&Math.round(F.dana.x),F.dana&&Math.round(F.dana.y),F.watching,STATEphotos=d.STATE().photos.length,F.tee&&F.tee.cash]})()"))
    p.screenshot(path='/tmp/s55/shots/attract2.png'); print(errs); b.close()
