# Screenshots of the built game from file:// (for eye review only). Usage: python3 tests/shots.py
import sys, os
from playwright.sync_api import sync_playwright
HTML = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'KarateChampon-KarateChamp1984-claude-haiku-5-5-medium-20261103-184315.html'))
OUT = os.path.join(os.path.dirname(__file__), 'out')
os.makedirs(OUT, exist_ok=True)
shots = sys.argv[1:] or ['title', 'fight', 'road', 'move', 'about']
with sync_playwright() as p:
    b = p.chromium.launch()
    errors = []
    for name in shots:
        page = b.new_page(viewport={'width': 1280, 'height': 720})
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto('file://' + HTML + '#' + name)
        page.wait_for_timeout(2500)
        page.screenshot(path=os.path.join(OUT, name + '.png'))
        print(name, 'ok')
    print('page errors:', errors[:3])
    b.close()
