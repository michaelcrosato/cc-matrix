# Screenshots of the built page (the single HTML), headless Chromium. Usage: python3 -I test/shot.py <html> <outdir> <hash>...
import sys, os, time
from playwright.sync_api import sync_playwright
html, outdir, hashes = sys.argv[1], sys.argv[2], sys.argv[3:]
os.makedirs(outdir, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
    errors = []
    for h in hashes:
        pg = b.new_page(viewport={'width': 1280, 'height': 720})
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' else None)
        pg.goto('file://' + os.path.abspath(html) + '#' + h)
        time.sleep(4)
        pg.screenshot(path=os.path.join(outdir, h.replace('/', '_') + '.png'))
        print('shot', h)
        pg.close()
    print('errors', len(errors), errors[:5])
    b.close()
