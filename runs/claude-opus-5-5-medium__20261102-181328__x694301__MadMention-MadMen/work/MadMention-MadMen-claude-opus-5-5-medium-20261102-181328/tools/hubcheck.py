import sys, json
from playwright.sync_api import sync_playwright
url = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1400, 'height': 900})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url)
    try: pg.wait_for_function("document.body.dataset.complete === 'true'", timeout=float(sys.argv[3]) if len(sys.argv) > 3 else 240000)
    except Exception as e: print('timeout', e)
    pg.screenshot(path=sys.argv[2])
    r = pg.evaluate("JSON.stringify(window.__hubCheck || null)")
    print(r[:3000])
    print(errs[:10])
    b.close()
