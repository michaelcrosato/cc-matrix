# Runs the AI Hub harness against the game and prints the verdict. Usage:
#   python3 tools/hub-check.py <port> [players] [extra query]
# The game and the harness must be served from the same origin (dist/hub/, see README in tools/).
import sys, json
from playwright.sync_api import sync_playwright
port = sys.argv[1]
players = sys.argv[2] if len(sys.argv) > 2 else '2'
extra = sys.argv[3] if len(sys.argv) > 3 else ''
url = f'http://127.0.0.1:{port}/harness.html?game=game.html&players={players}&auto=1{extra}'
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url)
    pg.wait_for_function("document.body && document.body.dataset.complete === 'true'", timeout=600000)
    res = pg.evaluate("(() => { const c = window.__hubCheck || {}; return { pass: c.pass, checks: c.checks || null, keys: Object.keys(c) }; })()")
    print(json.dumps(res, indent=1)[:4000])
    print('page errors:', errs[:5] if errs else 'none')
    b.close()
