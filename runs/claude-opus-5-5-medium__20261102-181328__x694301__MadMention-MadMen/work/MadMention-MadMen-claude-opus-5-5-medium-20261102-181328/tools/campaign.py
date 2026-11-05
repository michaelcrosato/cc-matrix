import sys, json
from playwright.sync_api import sync_playwright
page_url, out = sys.argv[1], sys.argv[2]
errs = []
PAD = """
window.__pad = { b: Array(17).fill(0), axes: [0,0,0,0] };
const mk = () => ({ id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(),
  axes: window.__pad.axes.slice(), buttons: window.__pad.b.map(v => ({ pressed: !!v, touched: !!v, value: v ? 1 : 0 })) });
navigator.getGamepads = () => [mk(), null, null, null];
"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error','warning') and 'AudioContext' not in m.text else None)
    pg.add_init_script(PAD)
    pg.goto(page_url); pg.wait_for_timeout(1500); pg.evaluate("window.G = My3D2dge.current")
    ev = lambda js: pg.evaluate(js)
    snap = lambda: json.loads(ev("JSON.stringify(G.debug.snapshot())"))
    def pad(i, ms=120):
        ev(f"window.__pad.b[{i}] = 1"); pg.wait_for_timeout(ms); ev(f"window.__pad.b[{i}] = 0"); pg.wait_for_timeout(120)
    pad(13); pad(12)   # touch the pad: the prompts switch to it
    pg.screenshot(path=out + '/c00-title-pad.png')
    pad(0); pg.wait_for_timeout(1200); pad(0); pg.wait_for_timeout(300); pad(0); pg.wait_for_timeout(1500)
    pg.screenshot(path=out + '/c01-office-pad.png')
    ev("G.debug.teleport(64, 344)"); pg.wait_for_timeout(400); pad(0); pg.wait_for_timeout(1500)
    pg.screenshot(path=out + '/c02-bunny-choice.png')
    for i in range(6): pad(0); pg.wait_for_timeout(400)
    print('d0', snap()['cards'])
    for d in range(3):
        if d > 0:
            # through the day card into the office
            for i in range(3): pad(0); pg.wait_for_timeout(700)
        ev("G.debug.teleport(424, 74)"); pg.wait_for_timeout(300); ev("G.debug.use('drawer')"); pg.wait_for_timeout(500)
        for i in range(5): pad(0); pg.wait_for_timeout(350)
        ev("G.debug.use('barcart')"); pg.wait_for_timeout(500)
        for i in range(5): pad(0); pg.wait_for_timeout(350)
        if d == 1: pg.screenshot(path=out + '/c03-day2-office.png')
        ev("G.debug.state().clock = 839.9"); pg.wait_for_timeout(1200)
        for i in range(3): pad(0); pg.wait_for_timeout(600)
        pg.screenshot(path=out + f'/c04-bs-{d}.png')
        for k in range(12):
            s = snap()
            if s['scene'] == 'pitch': break
            pad(9) if k % 3 == 2 else pad(0); pg.wait_for_timeout(400)
        for i in range(60):
            s = snap(); ph = s['pitch'] and s['pitch']['phase']
            if ph == 'deliver' and d == 0 and i < 20: pg.screenshot(path=out + '/c05-deliver.png')
            if ph == 'closer' and d == 0: pg.screenshot(path=out + '/c06-closer.png')
            if s['scene'] != 'pitch' or ph == 'verdict': break
            if ph == 'closer':
                ev("window.__pad.b[0] = 1"); pg.wait_for_timeout(1700)
                if d == 0: pg.screenshot(path=out + '/c06b-closer-held.png')
                ev("window.__pad.b[0] = 0")
            else: pad(0)
            pg.wait_for_timeout(500)
        print('verdict', d, snap()['pitch'], snap()['billings'])
        pg.wait_for_timeout(1000); pad(0); pg.wait_for_timeout(2500)
        pg.screenshot(path=out + f'/c07-evening-{d}.png')
        for i in range(4): pad(0); pg.wait_for_timeout(700)
        pad(13) if d == 1 else None
        for i in range(4): pad(0); pg.wait_for_timeout(700)
        print('after evening', d, snap()['scene'], snap()['day'], snap()['home'])
    pg.wait_for_timeout(4000); pg.screenshot(path=out + '/c08-epilogue.png')
    pad(0); pg.wait_for_timeout(1200); pg.screenshot(path=out + '/c09-about.png')
    print('end', snap()['scene'])
    b.close()
print('\n'.join(errs[:20]) or 'no errors')
