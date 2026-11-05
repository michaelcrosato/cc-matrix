import sys, json, time
from playwright.sync_api import sync_playwright
# usage: shot.py out_prefix "js-step;js-step;..." [w h] [engine]
out = sys.argv[1]; steps = sys.argv[2].split(';;') if len(sys.argv) > 2 and sys.argv[2] else []
w = int(sys.argv[3]) if len(sys.argv) > 3 else 1280; h = int(sys.argv[4]) if len(sys.argv) > 4 else 720
eng = sys.argv[5] if len(sys.argv) > 5 else 'chromium'
URL = 'file:///home/micha/dev/cc-matrix/runs/claude-sonnet-5-5-medium__20261102-181331__x22cc1b/work/WireTapDance-TheWire-claude-sonnet-5-5-medium-20261102-181331.html'
with sync_playwright() as p:
    b = getattr(p, eng).launch(args=['--use-gl=swiftshader','--enable-unsafe-swiftshader'] if eng=='chromium' else [])
    pg = b.new_page(viewport={'width': w, 'height': h})
    logs = []
    pg.on('console', lambda m: logs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append('PAGEERROR: ' + str(e)))
    pg.goto(URL); pg.wait_for_timeout(1500)
    n = 0
    for s in steps:
        s = s.strip()
        if s.startswith('wait:'): pg.wait_for_timeout(int(s[5:]))
        elif s.startswith('key:'): pg.keyboard.press(s[4:])
        elif s.startswith('hold:'): k, ms = s[5:].split('@'); pg.keyboard.down(k); pg.wait_for_timeout(int(ms)); pg.keyboard.up(k)
        elif s.startswith('shot:'): pg.screenshot(path=f'{out}{s[5:]}.png'); n += 1
        elif s.startswith('click:'): x, y = s[6:].split(','); pg.mouse.click(int(x), int(y))
        elif s.startswith('move:'): x, y = s[5:].split(','); pg.mouse.move(int(x), int(y))
        else:
            r = pg.evaluate('(() => { const g = My3D2dge.current; const d = g.debug; return ' + s + '; })()')
            if r is not None: print('>', json.dumps(r)[:600])
    print('\n'.join(logs[:25]))
    b.close()
