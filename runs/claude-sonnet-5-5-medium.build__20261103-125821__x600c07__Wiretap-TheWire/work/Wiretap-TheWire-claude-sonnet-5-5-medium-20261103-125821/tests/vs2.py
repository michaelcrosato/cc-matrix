from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b=pw.chromium.launch(); p=b.new_page(viewport={'width':1280,'height':720}); errs=[]
    p.on('pageerror',lambda e:errs.append(str(e)[:250])); p.on('console',lambda m:errs.append(m.text[:200]) if m.type=='error' else None)
    p.goto('file:///tmp/s55/w.html'); p.wait_for_timeout(3000)
    p.evaluate("My3D2dge.current.go('field',{mission:'vs2',seconds:14})"); p.wait_for_timeout(1500); p.keyboard.press('Enter'); p.wait_for_timeout(500)
    p.keyboard.down('d'); p.keyboard.down('ArrowLeft'); p.wait_for_timeout(1200); p.keyboard.up('d'); p.keyboard.up('ArrowLeft')
    S="(()=>{const F=My3D2dge.current.debug.Field;return [Math.round(F.dana.x),Math.round(F.dana.y),Math.round(F.p2.x),Math.round(F.p2.y),F.vs.score,F.vs.left|0]})()"
    print(p.evaluate(S)); p.keyboard.down('q'); p.wait_for_timeout(500); p.keyboard.press('e'); p.keyboard.press('Slash'); p.wait_for_timeout(400); p.keyboard.up('q'); p.screenshot(path='/tmp/s55/shots/vs2.png')
    p.wait_for_timeout(14000); print(p.evaluate("My3D2dge.current.debug.UI.cur&&My3D2dge.current.debug.UI.cur.title")); print(errs[:5]); b.close()
