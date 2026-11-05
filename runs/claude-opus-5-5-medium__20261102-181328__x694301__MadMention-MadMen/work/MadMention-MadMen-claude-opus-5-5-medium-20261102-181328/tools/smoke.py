# python3 tools/smoke.py PAGE OUTDIR [engine]: load the page headless, drive a day through game.debug, screenshot each stage, print errors
import sys, json, time
from playwright.sync_api import sync_playwright
page_url, out = sys.argv[1], sys.argv[2]
eng = sys.argv[3] if len(sys.argv) > 3 else 'chromium'
errs = []
with sync_playwright() as p:
    b = getattr(p, eng).launch()
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.on('console', lambda m: errs.append('console.' + m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.goto(page_url); pg.wait_for_timeout(2500)
    pg.screenshot(path=out + '/01-title.png')
    snap = lambda: pg.evaluate('JSON.stringify(window.__g ? 0 : 0)')
    G = "(() => { for (const k of Object.keys(window)) {} })()"
    def ev(js): return pg.evaluate(js)
    # find the game: the debug handle lives on the game; reach it through E.current
    ev("window.G = My3D2dge.current")
    pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)
    pg.screenshot(path=out + '/02-dayintro.png')
    pg.keyboard.press('Enter'); pg.wait_for_timeout(300); pg.keyboard.press('Enter'); pg.wait_for_timeout(1500)
    print('after intro', ev("JSON.stringify(G.debug.snapshot())"))
    pg.screenshot(path=out + '/03-office.png')
    pg.keyboard.down('KeyW'); pg.wait_for_timeout(700); pg.keyboard.up('KeyW')
    ev("G.debug.teleport(470, 318)"); pg.wait_for_timeout(300)
    pg.screenshot(path=out + '/04-lorraine-near.png')
    pg.keyboard.press('KeyE'); pg.wait_for_timeout(2500)
    pg.screenshot(path=out + '/05-talk.png')
    for i in range(8): pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
    print('after talk', ev("JSON.stringify(G.debug.snapshot())"))
    pg.keyboard.press('Tab'); pg.wait_for_timeout(500); pg.screenshot(path=out + '/06-folio.png'); pg.keyboard.press('Tab')
    pg.keyboard.press('KeyV'); pg.wait_for_timeout(600); pg.screenshot(path=out + '/07-iso.png'); pg.keyboard.press('KeyV'); pg.wait_for_timeout(600); pg.screenshot(path=out + '/08-top.png'); pg.keyboard.press('KeyV')
    ev("G.debug.state().clock = 839.9"); pg.wait_for_timeout(1500)
    for i in range(4): pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
    pg.wait_for_timeout(1500); pg.screenshot(path=out + '/09-brainstorm.png')
    print('bs', ev("JSON.stringify(G.debug.snapshot())"))
    for i in range(6): pg.keyboard.press('Enter'); pg.wait_for_timeout(400)
    pg.wait_for_timeout(1500); pg.screenshot(path=out + '/10-pitch.png')
    for i in range(40):
        s = json.loads(ev("JSON.stringify(G.debug.snapshot())"))
        ph = s['pitch'] and s['pitch']['phase']
        if i % 6 == 0: pg.screenshot(path=out + '/11-pitch-%02d.png' % i)
        if s['scene'] != 'pitch' or ph == 'verdict': break
        if ph == 'closer': pg.keyboard.down('Enter'); pg.wait_for_timeout(1800); pg.keyboard.up('Enter')
        else: pg.keyboard.press('Enter')
        pg.wait_for_timeout(700)
    pg.screenshot(path=out + '/12-verdict.png')
    print('end', ev("JSON.stringify(G.debug.snapshot())"))
    b.close()
print('\n'.join(errs[:30]) or 'no errors')
