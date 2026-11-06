# Touch-only devices: no touch controls, the panel and settings button, attract runs, a tap doesn't exit it.
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _common import *

s = Suite()
with sync_playwright() as pw:
    b = launch(pw)
    device = pw.devices['Pixel 7']
    ctx = b.new_context(**device)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(DELIVERABLE.as_uri())
    page.evaluate('async () => { await window.__PIXEL_READY__; }')
    step(page, 10)
    st = page.evaluate("() => ({ touchOnly: window.__APP__.device.touchOnly, top: window.__APP__.top?.name, touch: !!document.querySelector('.touch-controls, [class*=touch]') })")
    s.ok(st['touchOnly'], 'detected a touch-only device')
    s.ok(not st['touch'], 'no touch controls on screen')
    text = page.evaluate("async () => { const e = await window.__PIXEL_READY__; return e.touch === null; }")
    s.ok(text, 'engine touch controls are off')
    rects = page.evaluate('window.__APP__.ui.rects.map(r => r.id)')
    s.ok('touchSettings' in rects, f'a settings button ({rects})')
    # What the panel says, read off the calls that draw it.
    said = page.evaluate("""async () => {
      const ui = window.__APP__.ui; const seen = []; const orig = ui.text; const origC = ui.centerText;
      ui.text = function (x, y, t, o) { seen.push(String(t)); return orig.call(this, x, y, t, o); };
      ui.centerText = function (y, t, ...rest) { seen.push(String(t)); return origC.call(this, y, t, ...rest); };
      const e = await window.__PIXEL_READY__; e.step(3);
      ui.text = orig; ui.centerText = origC;
      return seen; }""")
    s.ok('CONTROLLER OR KEYBOARD REQUIRED' in ' '.join(said), f'the panel says it: {said[:6]}')
    # Attract starts on its own and a tap doesn't exit.
    step(page, 620)
    page.wait_for_function('async () => { const e = await window.__PIXEL_READY__; e.step(10); return window.__APP__.attract === true; }', timeout=60000)
    s.ok(page.evaluate('window.__APP__.attract === true'), 'attract runs behind on touch')
    box = page.viewport_size
    page.touchscreen.tap(box['width'] / 2, box['height'] / 2)
    step(page, 30)
    s.ok(page.evaluate('window.__APP__.attract === true'), "tapping doesn't exit attract")
    page.close()
    # Settings button opens Settings.
    page = ctx.new_page()
    page.goto(DELIVERABLE.as_uri() + '?g_noattract=1')
    page.evaluate('async () => { await window.__PIXEL_READY__; }')
    step(page, 10)
    r = page.evaluate("() => { const r = window.__APP__.ui.rects.find(k => k.id === 'touchSettings'); return { x: r.x + r.w / 2, y: r.y + r.h / 2, W: window.__APP__.ui.W, H: window.__APP__.ui.H }; }")
    vw = page.viewport_size
    page.touchscreen.tap(r['x'] * vw['width'] / r['W'], r['y'] * vw['height'] / r['H'])
    # A tap is down-and-up in one go: let frames run live for it.
    step(page, 4)
    page.evaluate('async () => { const e = await window.__PIXEL_READY__; e.manual = false; }')
    page.wait_for_timeout(300)
    page.touchscreen.tap(r['x'] * vw['width'] / r['W'], r['y'] * vw['height'] / r['H'])
    page.wait_for_timeout(600)
    s.ok(page.evaluate('window.__APP__.top?.name') == 'settings', f"the button opens Settings ({page.evaluate('window.__APP__.top?.name')})")
    # A keyboard appearing drops the panel.
    page.evaluate("window.__APP__.closeAll(); window.__APP__.open(window.__GAME__.menu); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }))")
    page.wait_for_timeout(200)
    s.ok(page.evaluate('window.__APP__.device.touchOnly') is False, 'a keyboard drops the panel')
    s.ok(errors == [], f'no errors: {errors[:3]}')
    page.close()
    ctx.close()

    # Every string on every touch screen stays on the screen, on phones and tablets, either way up.
    HOOK = """() => {
      const ui = window.__APP__.ui; const h = ui.hud;
      if (h.__orig) return;
      h.__orig = h.text; window.__off = [];
      h.text = function (x, y, t, o = {}) {
        const m = h.measure(String(t), o.scale ?? 1);
        if (x < 0 || y < 0 || x + m.width > ui.W || y + m.height > ui.H) window.__off.push(String(t));
        return h.__orig.call(this, x, y, t, o);
      };
    }"""
    TAKE = 'async (n) => { const e = await window.__PIXEL_READY__; e.step(n); const o = [...new Set(window.__off)]; window.__off = []; return o; }'
    for name in ('Pixel 7', 'Pixel 7 landscape', 'iPhone 14', 'iPad Mini', 'iPad Mini landscape'):
        ctx = b.new_context(**pw.devices[name])
        page = ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(DELIVERABLE.as_uri() + '?g_noattract=1')
        page.evaluate('async () => { await window.__PIXEL_READY__; }')
        step(page, 6)
        page.evaluate(HOOK)
        off = page.evaluate(TAKE, 3)
        s.ok(off == [], f'{name}: the title and the panel fit: {off[:3]}')
        said = page.evaluate("""async () => {
          const ui = window.__APP__.ui; const seen = []; const orig = ui.hud.text;
          ui.hud.text = function (x, y, t, o) { seen.push(String(t)); return orig.call(this, x, y, t, o); };
          const e = await window.__PIXEL_READY__; e.step(2); ui.hud.text = orig;
          return seen.join(' '); }""")
        s.ok('CONTROLLER OR KEYBOARD REQUIRED' in said, f'{name}: the panel says it, wrapped or not')
        page.evaluate('window.__SCREENS__.openSettings()')
        for tab in range(3):
            off = page.evaluate(TAKE, 3)
            s.ok(off == [], f'{name}: Settings page {tab} fits: {off[:3]}')
            page.evaluate("window.__APP__.top.setPage?.(%d)" % ((tab + 1) % 3))
        s.ok(errors == [], f'{name}: no errors: {errors[:2]}')
        ctx.close()

    # Attract on a phone and a tablet held upright, running live as it does for a real visitor (a clip's update
    # doesn't run under manual stepping): its bands are drawn, say what's required, and everything stays on screen.
    for name in ('Pixel 7', 'iPad Mini'):
        ctx = b.new_context(**pw.devices[name])
        page = ctx.new_page()
        page.goto(DELIVERABLE.as_uri())
        page.evaluate('async () => { const e = await window.__PIXEL_READY__; e.manual = false; }')
        page.wait_for_function('window.__APP__.attract === true', timeout=60000)
        page.wait_for_timeout(8000)
        page.evaluate(HOOK)
        page.evaluate("""() => { window.__off = []; window.__seen = []; const h = window.__APP__.ui.hud; const o = h.text;
          h.text = function (x, y, t, q) { window.__seen.push(String(t)); return o.call(this, x, y, t, q); }; }""")
        page.wait_for_timeout(16000)
        said = ' '.join(dict.fromkeys(page.evaluate('window.__seen')))
        off = page.evaluate('[...new Set(window.__off)]')
        s.ok('DEMO' in said, f'{name}: attract draws its band')
        s.ok('CONTROLLER OR KEYBOARD REQUIRED' in said, f'{name}: attract says what is required')
        s.ok(off == [], f'{name}: everything in attract fits: {off[:4]}')
        ctx.close()

    # The way back from Settings, by touch alone; and a tap on a slider moves it.
    ctx = b.new_context(**pw.devices['Pixel 7'])
    page = ctx.new_page()
    page.goto(DELIVERABLE.as_uri() + '?g_noattract=1')
    page.evaluate('async () => { await window.__PIXEL_READY__; }')
    step(page, 6)
    page.evaluate('window.__SCREENS__.openSettings()')
    step(page, 3)
    page.evaluate('async () => { const e = await window.__PIXEL_READY__; e.manual = false; }')
    page.wait_for_timeout(300)
    vw = page.viewport_size
    tap = lambda r: page.touchscreen.tap((r['x'] + r['w'] / 2) * vw['width'] / page.evaluate('window.__APP__.ui.W'), (r['y'] + r['h'] / 2) * vw['height'] / page.evaluate('window.__APP__.ui.H'))
    rect = lambda k: page.evaluate(f"window.__APP__.ui.rects.find((r) => r.id === '{k}')")
    tap(rect('music'))
    page.wait_for_timeout(500)
    s.ok(abs(page.evaluate('window.__APP__.settings.music') - 0.1) > 0.01, 'a tap on the music slider moves it')
    page.evaluate("(async () => { const a = window.__APP__; a.settings.music = 0.1; a.applySettings(); a.saveSettings(); })()")
    tap(rect('touchBack'))
    page.wait_for_timeout(500)
    s.ok(page.evaluate('window.__APP__.top?.name') != 'settings', f"touch alone gets back out of Settings ({page.evaluate('window.__APP__.top?.name')})")
    ctx.close()
    b.close()
s.done()
