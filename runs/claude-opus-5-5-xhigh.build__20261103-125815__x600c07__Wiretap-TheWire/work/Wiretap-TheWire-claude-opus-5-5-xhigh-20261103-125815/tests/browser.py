# WIRETAP browser checks (Playwright for Python, one browser at a time): fake gamepad glyphs and stick inversion,
# mouse hover focus, the touch-only notice and attract on a phone. Usage: python3 tests/browser.py <bundle url>
import sys, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1]
FAKE_PAD = """
window.__pad = { buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })), axes: [0, 0, 0, 0] };
const fake = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', timestamp: 1,
  get buttons() { return window.__pad.buttons; }, get axes() { return window.__pad.axes; }, vibrationActuator: null };
Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [fake, null, null, null] });
"""
fails = 0
def check(name, ok, detail=''):
    global fails
    print(('ok   ' if ok else 'FAIL ') + name + ('' if ok else ': ' + str(detail)[:300]))
    if not ok: fails += 1
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 720}); ctx.add_init_script(FAKE_PAD); p = ctx.new_page()
    errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto(URL + '#e1.photos'); p.wait_for_timeout(5500)
    tap = lambda i: (p.evaluate(f"() => {{ __pad.buttons[{i}] = {{ pressed: true, value: 1 }}; }}"), p.wait_for_timeout(120), p.evaluate(f"() => {{ __pad.buttons[{i}] = {{ pressed: false, value: 0 }}; }}"), p.wait_for_timeout(200))
    for _ in range(4): tap(0)
    p.wait_for_timeout(600)
    dev = p.evaluate("() => [__wiretap.game.input.lastDevice, __wiretap.game.input.label('interact', 'gamepad')]")
    check('a pad press switches prompts to the gamepad (' + str(dev) + ')', dev[0] == 'gamepad' and dev[1] == '✕', dev)
    p.evaluate("() => __wiretap.game.settings.set('glyphs', 'xbox')"); p.wait_for_timeout(300)
    lab = p.evaluate("() => __wiretap.game.input.label('interact', 'gamepad')"); check('Settings → Xbox symbols shows A (' + lab + ')', lab == 'A', lab)
    p.evaluate("() => __wiretap.game.settings.set('glyphs', 'playstation')")
    def push(ax):
        p.evaluate("() => { const M = __wiretap.Mission.M; M.P.locked = false; window.__p0 = [M.P.x, M.P.y]; }")
        p.evaluate(f"() => {{ __pad.axes = [{ax}, 0, 0, 0]; }}"); p.wait_for_timeout(700); p.evaluate("() => { __pad.axes = [0, 0, 0, 0]; }"); p.wait_for_timeout(200)
        return p.evaluate("() => { const M = __wiretap.Mission.M; return [M.P.x - __p0[0], M.P.y - __p0[1]]; }")
    a = push(1); p.evaluate("() => __wiretap.game.settings.set('stickInvX', true)"); b2 = push(1); p.evaluate("() => __wiretap.game.settings.set('stickInvX', false)")
    dot = a[0] * b2[0] + a[1] * b2[1]
    check('Invert stick left/right flips the direction (normal ' + str([round(v) for v in a]) + ', inverted ' + str([round(v) for v in b2]) + ')', dot < 0 and abs(a[0]) + abs(a[1]) > 10, [a, b2])
    p.evaluate("() => __wiretap.game.settings.set('stickInvY', true)"); c = p.evaluate("() => { const ps = navigator.getGamepads(); __pad.axes = [0, .8, 0, 0]; const v = navigator.getGamepads()[0].axes[1]; __pad.axes = [0,0,0,0]; return v; }")
    check('Invert stick up/down flips the vertical axis (' + str(c) + ')', c < 0, c); p.evaluate("() => __wiretap.game.settings.set('stickInvY', false)")
    hud = p.evaluate("() => document.body.innerText.includes('✕') || !!document.querySelector('.g-cross')")
    check('pad glyphs appear in the DOM', hud, '')
    check('no page errors (gamepad run)', not errs, errs[:3])
    ctx.close()
    # mouse: hover focuses a title menu item, click activates it
    ctx = b.new_context(viewport={'width': 1280, 'height': 720}); p = ctx.new_page(); p.goto(URL); p.wait_for_timeout(5000)
    box = p.evaluate("() => { const n = document.querySelector('[data-f=\"about\"]'); const r = n.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }")
    p.mouse.move(box[0] - 30, box[1] - 30); p.mouse.move(box[0], box[1], steps=4); p.wait_for_timeout(250)
    f = p.evaluate("() => (document.querySelector('.is-f') || {}).dataset?.f")
    check('hovering a menu item focuses it (' + str(f) + ')', f == 'about', f)
    p.mouse.click(box[0], box[1]); p.wait_for_timeout(500)
    check('clicking it opens About & Credits', p.evaluate("() => __wiretap.UI.top() && __wiretap.UI.top().id") == 'about')
    lg = p.evaluate("() => document.querySelector('.legend') && document.querySelector('.legend').innerHTML")
    check('legends show keyboard/mouse chips', lg and ('<kbd' in lg or 'g-mouse' in lg), lg)
    ctx.close(); b.close()
    # touch-only: an iPhone profile in WebKit
    wb = pw.webkit.launch(); ctx = wb.new_context(**pw.devices['iPhone 13']); p = ctx.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto(URL); p.wait_for_timeout(6000)
    t = p.evaluate("() => document.body.innerText")
    check('touch-only shows "Controller or keyboard required" with a Settings button', 'controller or keyboard required' in t.lower() and 'settings' in t.lower(), t[:200])
    p.screenshot(path='/tmp/wt-x600c07/touch.png'); p.wait_for_timeout(12500)
    att = p.evaluate("() => __wiretap.Globals.attract"); check('attract runs on a touch-only device after 10 s', att, att)
    p.screenshot(path='/tmp/wt-x600c07/touch-attract.png')
    p.touchscreen.tap(200, 300); p.wait_for_timeout(1500)
    check('a tap returns to the notice', not p.evaluate("() => __wiretap.Globals.attract") and 'controller or keyboard required' in p.evaluate("() => document.body.innerText").lower())
    check('no page errors (WebKit iPhone)', not errs, errs[:3])
    wb.close()
print('browser: ' + ('all checks passed' if not fails else str(fails) + ' failed'))
