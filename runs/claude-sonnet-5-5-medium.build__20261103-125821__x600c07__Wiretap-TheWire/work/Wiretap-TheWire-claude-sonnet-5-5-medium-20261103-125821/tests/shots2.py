from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b=pw.chromium.launch(); p=b.new_page(viewport={'width':1280,'height':720}); errs=[]
    p.on('pageerror',lambda e:errs.append(str(e)[:200])); p.goto('file:///tmp/s55/w.html'); p.wait_for_timeout(3000)
    p.evaluate("My3D2dge.current.debug.Scenes_about&&0"); 
    # about via menu: down x3 then enter
    for _ in range(3): p.keyboard.press('ArrowDown')
    p.keyboard.press('ArrowDown'); p.keyboard.press('Enter'); p.wait_for_timeout(600); p.screenshot(path='/tmp/s55/shots/about.png')
    p.keyboard.press('e'); p.keyboard.press('e'); p.wait_for_timeout(400); p.screenshot(path='/tmp/s55/shots/about3.png')
    p.evaluate("My3D2dge.current.debug.toEnd()"); p.wait_for_timeout(1200); p.screenshot(path='/tmp/s55/shots/montage.png'); p.keyboard.press('Enter'); p.wait_for_timeout(6000); p.screenshot(path='/tmp/s55/shots/credits.png')
    print(errs); b.close()
