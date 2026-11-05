# Runs the AI Hub harness against game.html served on 127.0.0.1:47614 (copy harness.html, bridge.js, round.js and the bundle as game.html into one folder and serve it). Usage: python3 hub-check.py 'players=2&auto=1'
import sys, json
from playwright.sync_api import sync_playwright
q = sys.argv[1]; timeout = int(sys.argv[2]) if len(sys.argv) > 2 else 240000
with sync_playwright() as pw:
    b = pw.chromium.launch(); p = b.new_page(viewport={'width': 1400, 'height': 900})
    p.goto('http://127.0.0.1:47614/harness.html?game=game.html&' + q)
    try: p.wait_for_function("document.body.dataset.complete === 'true'", timeout=timeout)
    except Exception as e: print('TIMEOUT', e)
    r = p.evaluate("() => window.__hubCheck")
    print('PASS' if r and r.get('pass') else 'FAIL', q)
    for c in (r or {}).get('checks', []) if isinstance(r, dict) else []:
        if not c.get('pass'): print('  x', c.get('name'), '|', str(c.get('detail'))[:300])
    if not r: print(p.evaluate("() => document.body.innerText.slice(0, 1500)"))
    p.screenshot(path='/tmp/wt-x600c07/hub-' + q.split('&')[0].replace('=', '') + '.png')
    b.close()
