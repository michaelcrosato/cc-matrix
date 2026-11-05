from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b = pw.chromium.launch(); p = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
    p.on('pageerror', lambda e: errs.append(str(e)[:300]))
    p.goto('file:///tmp/s55/w.html'); p.wait_for_timeout(3000)
    p.evaluate("My3D2dge.current.go('field',{mission:'ep3'})"); p.wait_for_timeout(1500); p.keyboard.press('Enter'); p.wait_for_timeout(500)
    # shadow the runner at 40 units
    p.evaluate("window.__sh=setInterval(()=>{const F=My3D2dge.current.debug.Field;if(F.runner&&F.tailPhase!=='cuffing'){F.dana.x=F.runner.x-18;F.dana.y=F.runner.y;}},50)")
    for i in range(10):
        p.wait_for_timeout(2000); print(p.evaluate("(()=>{const F=My3D2dge.current.debug.Field;return [F.tailPhase,F.over,Math.round(F.tail*100),F.runner&&F.runner.state,My3D2dge.current.debug.UI.cur&&My3D2dge.current.debug.UI.cur.title]})()"))
        if i==3: p.keyboard.press('e')
    p.evaluate("clearInterval(window.__sh)")
    p.evaluate("My3D2dge.current.menu('settings')"); p.wait_for_timeout(800); p.screenshot(path='/tmp/s55/shots/settings.png'); print(errs); b.close()
