# Browser checks: loads the single-file build in Chromium (and WebKit with --webkit), visits scenes by deep link,
# plays a little with real key presses, records console errors and game.errors, and saves screenshots.
import sys, os, json, time, subprocess, socket
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
NAME = 'BreakingBackyard-BreakingBad-claude-opus-5-5-medium-20261102-181319.html'
OUT = sys.argv[sys.argv.index('-o') + 1] if '-o' in sys.argv else '/tmp/bb-xb81546/shots'
os.makedirs(OUT, exist_ok=True)
def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p
PORT = free_port()
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(.8)
URL = f'http://127.0.0.1:{PORT}/{NAME}'
fails = []
def run(browser_type, label, cases, viewport=(1280, 720)):
    b = browser_type.launch()
    for name, hash_, steps in cases:
        page = b.new_page(viewport={'width': viewport[0], 'height': viewport[1]})
        errs = []
        page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.goto(URL + hash_)
        page.wait_for_function('window.My3D2dge && My3D2dge.current && My3D2dge.current.debug', timeout=15000)
        page.wait_for_timeout(1200)
        for st in steps:
            if st[0] == 'key': page.keyboard.press(st[1]); page.wait_for_timeout(st[2] if len(st) > 2 else 150)
            elif st[0] == 'hold': page.keyboard.down(st[1]); page.wait_for_timeout(st[2]); page.keyboard.up(st[1])
            elif st[0] == 'wait': page.wait_for_timeout(st[1])
            elif st[0] == 'js': page.evaluate(st[1])
            elif st[0] == 'shot': page.screenshot(path=f'{OUT}/{label}-{name}-{st[1]}.png')
            elif st[0] == 'click': page.mouse.click(st[1], st[2]); page.wait_for_timeout(200)
            elif st[0] == 'move': page.mouse.move(st[1], st[2]); page.wait_for_timeout(100)
        page.screenshot(path=f'{OUT}/{label}-{name}.png')
        snap = page.evaluate('JSON.stringify(My3D2dge.current.debug.snapshot())')
        gerr = page.evaluate('My3D2dge.current.errors.map(e => (e.where||"") + " " + (e.message||e) + " " + (e.stack||"").split("\\n").slice(0,3).join(" / "))')
        ok = not errs and not gerr
        print(('ok   ' if ok else 'FAIL ') + f'{label} {name}: {snap[:220]}')
        if not ok:
            fails.append(name); print('   console:', errs[:5]); print('   game:', gerr[:5])
        page.close()
    b.close()
CASES = [
    ('title', '', [('wait', 800)]),
    ('town-ep1', '#town', [('wait', 1500), ('hold', 'KeyD', 600), ('hold', 'KeyS', 400)]),
    ('town-ep2', '#ep=2.1', [('wait', 2500), ('shot', 'a'), ('key', 'KeyV', 600), ('shot', 'topdown'), ('key', 'KeyV', 600), ('shot', 'iso'), ('key', 'KeyV', 300)]),
    ('cook', '#cook', [('wait', 2600), ('shot', 'measure'), ('key', 'KeyE', 400), ('key', 'KeyE', 400), ('key', 'KeyE', 400), ('hold', 'KeyE', 1500), ('shot', 'heat'), ('wait', 8000), ('shot', 'cryst'), ('wait', 6000)]),
    ('ep4', '#ep=4', [('wait', 1000), ('js', 'My3D2dge.current.debug.teleport(My3D2dge.current.debug.spot.arena.x, My3D2dge.current.debug.spot.arena.y)'), ('wait', 600), ('key', 'Enter', 300), ('key', 'Enter', 300), ('key', 'Enter', 300), ('key', 'Enter', 300), ('key', 'Enter', 300), ('key', 'Enter', 300), ('key', 'Enter', 300), ('key', 'Enter', 300), ('wait', 2500)]),
    ('lab', '#lab', [('wait', 1500), ('key', 'Enter', 300), ('key', 'Enter', 300), ('key', 'Enter', 300), ('key', 'Enter', 300), ('wait', 2000), ('key', 'KeyG', 500), ('wait', 1500)]),
    ('demo', '#demo', [('wait', 12000), ('shot', 'mid'), ('wait', 12000)]),
    ('about', '#about', [('wait', 500), ('key', 'ArrowRight', 300), ('shot', 'p2')]),
    ('ending', '#ending', [('wait', 3000), ('key', 'Enter', 400)]),
    ('credits', '#credits', [('wait', 3000)]),
    ('busted', '#busted', [('wait', 2000)]),
    ('dead', '#dead', [('wait', 1500)]),
    ('night', '#ep=2.3', [('wait', 800), ('js', 'My3D2dge.current.go("night")'), ('wait', 1500)]),
    ('ledger', '#ep=2.1', [('wait', 1200), ('key', 'Tab', 400)]),
    ('shop', '#ep=3', [('wait', 1000), ('js', 'My3D2dge.current.debug.teleport(My3D2dge.current.debug.spot.lenny.x, My3D2dge.current.debug.spot.lenny.y+4)'), ('wait', 300), ('key', 'KeyE', 500)]),
]
with sync_playwright() as p:
    only = [a for a in sys.argv[1:] if not a.startswith('-') and a != OUT]
    cases = [c for c in CASES if not only or c[0] in only]
    run(p.chromium, 'chromium', cases)
    if '--webkit' in sys.argv: run(p.webkit, 'webkit', cases[:4])
srv.terminate()
print('FAILED: ' + ', '.join(fails) if fails else 'all browser cases clean')
sys.exit(1 if fails else 0)
