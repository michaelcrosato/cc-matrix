import sys, json
from playwright.sync_api import sync_playwright
q = sys.argv[1]
with sync_playwright() as pw:
    b = pw.chromium.launch(); p = b.new_page(viewport={'width':1280,'height':800}); errs=[]
    p.on('pageerror', lambda e: errs.append(str(e)[:200]))
    p.goto('http://localhost:8913/harness.html?game=game.html&' + q); 
    try: p.wait_for_function("document.body.dataset.complete==='true'", timeout=90000)
    except Exception as e: print('timeout')
    print(q, p.evaluate("JSON.stringify(window.__hubCheck && {pass:__hubCheck.pass, fails:(__hubCheck.checks||__hubCheck.items||[]).filter(c=>!c.ok&&!c.pass).map(c=>c.name+': '+(c.detail||''))})")); print(errs[:3]); b.close()
