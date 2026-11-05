from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b=pw.chromium.launch(); p=b.new_page(viewport={'width':1280,'height':720}); errs=[]
    p.on('pageerror',lambda e:errs.append(str(e)[:200])); p.goto('file:///tmp/s55/w.html'); p.wait_for_timeout(3000)
    p.evaluate("My3D2dge.current.go('annex',{hub:true})"); p.wait_for_timeout(1200)
    p.keyboard.down('d'); p.wait_for_timeout(1200); p.keyboard.up('d'); p.screenshot(path='/tmp/s55/shots/annex.png')
    print(p.evaluate("(()=>{const s=My3D2dge.current.scenes?0:0;return document.getElementById('hud2').innerText.slice(0,120)})()"))
    p.keyboard.press('Tab'); p.wait_for_timeout(500); print(p.evaluate("My3D2dge.current.debug.UI.cur&&My3D2dge.current.debug.UI.cur.title")); p.keyboard.press('Escape')
    print(errs); b.close()
