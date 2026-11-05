# A phone (touch, coarse pointer, no keys): the title shows "Controller or keyboard required" and the Settings button,
# and the attract mode starts after the idle time. Screenshot: .cache/shots/touch.png
import pathlib, json
from playwright.sync_api import sync_playwright
HERE = pathlib.Path(__file__).resolve().parent.parent
BUNDLE = HERE.parent / 'OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-haiku-5-5-medium-20261104-043153.html'
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2)
    pg = ctx.new_page(); errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BUNDLE.as_uri()); pg.wait_for_timeout(2500)
    snap = lambda: pg.evaluate("() => My3D2dge.current.debug.snapshot()")
    print('touchOnly', pg.evaluate("() => OB.env.touchOnly"), 'scene', snap()['scene'])
    pg.screenshot(path=str(HERE / '.cache' / 'shots' / 'touch.png'))
    pg.wait_for_timeout(11500)
    print('after 11 s idle, scene', snap()['scene'], 'attract', snap()['attract'])
    print('errors', errors[:3])
    b.close()
