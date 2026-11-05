import sys, json, time, os
from playwright.sync_api import sync_playwright
HTML = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'The-Sopranos-Oh-Come-On-The-Sopranos-claude-sonnet-5-5-medium-20261102-181337.html'))
# usage: shot.py out_prefix hash "steps"   steps: wait:ms down:Key up:Key press:Key eval:js shot:name
out, h = sys.argv[1], sys.argv[2]
steps = sys.argv[3].split() if len(sys.argv) > 3 else []
W, H = (int(sys.argv[4]), int(sys.argv[5])) if len(sys.argv) > 5 else (1280, 720)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
    ctxo = dict(viewport={'width': W, 'height': H})
    if os.environ.get('TOUCH'): ctxo.update(has_touch=True, is_mobile=True)
    pg = b.new_context(**ctxo).new_page()
    logs = []
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
    pg.goto('file://' + HTML + h)
    pg.wait_for_timeout(1500)
    n = 0
    for s in steps:
        k, _, v = s.partition(':')
        if k == 'wait': pg.wait_for_timeout(int(v))
        elif k == 'down': pg.keyboard.down(v)
        elif k == 'up': pg.keyboard.up(v)
        elif k == 'press': pg.keyboard.press(v)
        elif k == 'move': x, y = v.split(','); pg.mouse.move(int(x), int(y), steps=5)
        elif k == 'click': x, y = v.split(','); pg.mouse.click(int(x), int(y))
        elif k == 'eval': print('eval:', json.dumps(pg.evaluate(v.replace('~', ' '))))
        elif k == 'shot': pg.screenshot(path=f'{out}-{v}.png'); n += 1
    pg.screenshot(path=f'{out}-final.png')
    errs = pg.evaluate("() => window.__game ? window.__game.game.errors.map(e => e.message) : ['no game']")
    print('game errors:', errs); print('console:', logs[:10])
    b.close()
