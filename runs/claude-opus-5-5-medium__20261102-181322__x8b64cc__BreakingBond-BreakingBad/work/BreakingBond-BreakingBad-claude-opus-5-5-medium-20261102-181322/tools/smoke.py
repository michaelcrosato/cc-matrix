# Smoke test: loads the bundled game in headless Chromium, visits every scene and chapter, presses keys, screenshots,
# and prints console errors and the game's snapshot. Usage: python3 tools/smoke.py [steps...]
import sys, json, time, subprocess, os
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
NAME = 'BreakingBond-BreakingBad-claude-opus-5-5-medium-20261102-181322.html'
OUT = '/tmp/bb-x8b64cc/shots'
import random
port = random.randint(20000, 40000)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(.8)
plan = sys.argv[1:] or ['title', 'ch0', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'cookoff', 'lab', 'over', 'results', 'ending', 'about', 'attract']
errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1280, 'height': 720})
        pg.on('console', lambda m: errs.append('console.' + m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
        pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
        pg.goto(f'http://localhost:{port}/{NAME}')
        try: pg.wait_for_function('window.__bb', timeout=15000)
        except Exception as e:
            print('NO GAME', errs[:10]); raise SystemExit(1)
        pg.wait_for_timeout(2500)
        snap = lambda: pg.evaluate('JSON.stringify(window.__bb.snapshot())')
        def shot(n): pg.screenshot(path=f'{OUT}/{n}.png'); print(n, snap())
        def keys(seq):
            for k, ms in seq:
                if k.startswith('hold:'): pg.keyboard.down(k[5:])
                elif k.startswith('up:'): pg.keyboard.up(k[3:])
                elif k == 'wait': pass
                else: pg.keyboard.press(k)
                pg.wait_for_timeout(ms)
        for step in plan:
            if step == 'title':
                pg.mouse.move(600, 400); pg.wait_for_timeout(500); shot('title')
            elif step.startswith('ch'):
                i = int(step[2:3]); beat = int(step[4:]) if len(step) > 4 else 0
                pg.evaluate(f'window.__bb.go("play", {{ ch: {i}, beat: {beat} }})'); pg.wait_for_timeout(1500)
                shot(f'{step}-a')
                keys([('Enter', 400), ('Enter', 400), ('Enter', 400), ('hold:KeyD', 900), ('up:KeyD', 100), ('hold:KeyS', 700), ('up:KeyS', 300)])
                shot(f'{step}-b')
            elif step == 'attract':
                pg.evaluate('window.__bb.go("title")'); pg.wait_for_timeout(11500); shot('attract-a'); pg.wait_for_timeout(6000); shot('attract-b')
                pg.keyboard.press('KeyX'); pg.wait_for_timeout(800); shot('attract-exit')
            elif step == 'cookoff':
                pg.evaluate('window.__bb.go("cookoff", {})'); pg.wait_for_timeout(4500); shot('cookoff-a')
                keys([('hold:KeyA', 1200), ('up:KeyA', 100)]); shot('cookoff-b')
            elif step == 'lab': pg.evaluate('window.__bb.go("lab", { next: 2 })'); pg.wait_for_timeout(800); shot('lab')
            elif step == 'over': pg.evaluate('window.__bb.go("over", { reason: "busted", ch: 4, beat: 1 })'); pg.wait_for_timeout(800); shot('over')
            elif step == 'results': pg.evaluate('window.__bb.go("results", { ch: 2, stats: { time: 312, kills: 0 } })'); pg.wait_for_timeout(800); shot('results')
            elif step == 'ending': pg.evaluate('window.__bb.go("ending")'); pg.wait_for_timeout(800); shot('ending')
            elif step == 'about': pg.evaluate('window.__bb.go("about")'); pg.wait_for_timeout(2500); shot('about')
            elif step == 'card': pg.evaluate('window.__bb.go("card", { ch: 0 })'); pg.wait_for_timeout(5000); shot('card')
            elif step.startswith('eval:'): print(pg.evaluate(step[5:]))
        ge = pg.evaluate('JSON.stringify((window.__bb && My3D2dge && window.__game_errors) || null)')
        b.close()
finally:
    srv.terminate()
print('--- errors (%d) ---' % len(errs))
seen = set()
for e in errs:
    if e in seen: continue
    seen.add(e); print(e[:400])
