# Runs the AI Hub's own harness on the bundle (copied to .cache/hubtest with the harness files and served on 127.0.0.1).
# Usage: python3 tests/hub-harness.py PORT "players=2&auto=1" [timeout_s]
import sys, json
from playwright.sync_api import sync_playwright
port, query = sys.argv[1], sys.argv[2]
limit = int(sys.argv[3]) if len(sys.argv) > 3 else 300
url = f'http://127.0.0.1:{port}/harness.html?game=game.html&{query}'
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.goto(url)
    try:
        pg.wait_for_function("() => window.__hubCheck && window.__hubCheck.pass === true", timeout=limit * 1000)
        print('PASS', query)
    except Exception as e:
        print('NOT PASSED', query, str(e)[:120])
    try:
        state = pg.evaluate("() => JSON.stringify(window.__hubCheck && (window.__hubCheck.checks || window.__hubCheck), null, 1)")
        print(state[:3000])
    except Exception as e:
        print('no checklist', e)
    b.close()
