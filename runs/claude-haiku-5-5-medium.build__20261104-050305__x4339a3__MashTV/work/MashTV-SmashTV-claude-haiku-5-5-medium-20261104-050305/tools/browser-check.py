# Loads the deliverable over file:// in headless Chromium at deep links, records console and page errors and any request
# that leaves the file, and saves screenshots to shots/. Usage: python3 tools/browser-check.py <html> [hash ...]
import sys, os, json
from playwright.sync_api import sync_playwright
html = os.path.abspath(sys.argv[1])
links = sys.argv[2:] or ['title', 'room=1-1']
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shots')
os.makedirs(out, exist_ok=True)
report = {}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for link in links:
        pg = b.new_page(viewport={'width': 1280, 'height': 720})
        errors, external = [], []
        pg.on('console', lambda m: errors.append('console.' + m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
        pg.on('request', lambda r: external.append(r.url) if not r.url.startswith(('file:', 'data:', 'blob:')) else None)
        pg.goto('file://' + html + '#' + link)
        pg.wait_for_timeout(3500)
        name = link.replace('=', '-').replace('/', '-')
        pg.screenshot(path=os.path.join(out, name + '.png'))
        report[link] = {'errors': errors[:8], 'external': external[:5], 'scene': pg.evaluate("() => (window.MT && window.MT.G && window.MT.G.sceneName) || null")}
        pg.close()
    b.close()
print(json.dumps(report, indent=1))
