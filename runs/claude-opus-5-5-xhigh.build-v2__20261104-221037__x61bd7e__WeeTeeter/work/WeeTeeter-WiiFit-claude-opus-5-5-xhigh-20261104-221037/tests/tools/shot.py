# Screenshot helper for the 10-foot judgement: python3 tests/tools/shot.py out.png "#hash" [steps...]
# Steps: wait:ms key:Code down:Code up:Code js:expr mouse:x,y click:x,y size:WxH
import sys, os
from playwright.sync_api import sync_playwright
out, hash_ = sys.argv[1], sys.argv[2]
steps = sys.argv[3:]
stem = 'WeeTeeter-WiiFit-claude-opus-5-5-xhigh-20261104-221037.html'
path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', stem))
W, H = 1920, 1080
for s in steps:
    if s.startswith('size:'): W, H = map(int, s[5:].split('x'))
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': W, 'height': H})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('file://' + path + hash_)
    pg.wait_for_function('window.My3D2dge && My3D2dge.current && My3D2dge.current.sceneName', timeout=20000)
    pg.wait_for_timeout(1200)
    n = 0
    for s in steps:
        k, _, v = s.partition(':')
        if k == 'wait': pg.wait_for_timeout(int(v))
        elif k == 'key': pg.keyboard.press(v)
        elif k == 'down': pg.keyboard.down(v)
        elif k == 'up': pg.keyboard.up(v)
        elif k == 'js': print(pg.evaluate(v))
        elif k == 'mouse': x, y = map(int, v.split(',')); pg.mouse.move(x, y)
        elif k == 'click': x, y = map(int, v.split(',')); pg.mouse.click(x, y)
        elif k == 'shot': pg.screenshot(path=v); n += 1
    pg.screenshot(path=out)
    print('scene', pg.evaluate('My3D2dge.current.sceneName'), 'errors', errs[:5])
    b.close()
