# Screenshots of the on-screen prompt for each device and glyph style, standing at the cook station.
import sys, time, pathlib
from playwright.sync_api import sync_playwright
HTML = pathlib.Path(sys.argv[1]).resolve().as_uri()
OUT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else '/tmp/hb-shots'); OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(); page = b.new_page(viewport={'width': 1280, 'height': 720})
    page.goto(HTML); time.sleep(2.5)
    page.keyboard.press('Enter'); time.sleep(1.0)
    for _ in range(40):
        if not page.evaluate('() => window.HALF_BAKED.talk.open'): break
        page.keyboard.press('Enter'); time.sleep(0.25)
    st = page.evaluate('() => window.HALF_BAKED.stationPos()')
    page.evaluate(f"() => window.HALF_BAKED.teleport({st['x']}, {st['y'] + 6})"); time.sleep(0.5)
    for name, dev, style in [('keys', 'keyboard', 'playstation'), ('ps', 'gamepad', 'playstation'), ('xbox', 'gamepad', 'xbox')]:
        page.evaluate(f"() => {{ const g = window.HALF_BAKED.game; g.input.lastDevice = '{dev}'; g.settings.set('glyphs', '{style}'); }}")
        time.sleep(0.4)
        page.screenshot(path=str(OUT / f'prompt-{name}.png'), clip={'x': 300, 'y': 600, 'width': 680, 'height': 120})
    print('done', flush=True)
    b.close()
