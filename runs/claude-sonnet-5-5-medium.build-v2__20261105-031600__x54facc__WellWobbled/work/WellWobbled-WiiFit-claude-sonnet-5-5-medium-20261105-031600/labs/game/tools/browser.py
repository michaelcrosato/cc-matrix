"""Browser stages on the built single file (file://), software-rendered Chromium: boot, controller, keyboard, 10-foot text, attract, touch-only, about, settings, no-WebGPU.
Prints only failures and a final count line. Usage: python3 labs/game/tools/browser.py <html>"""
import sys, os, time
from playwright.sync_api import sync_playwright
html = os.path.abspath(sys.argv[1]); URL = 'file://' + html
ARGS = ['--no-sandbox', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader']
fails = []; count = [0]
def check(name, ok, detail=''):
    count[0] += 1
    if not ok: fails.append(f'{name}: {detail}')
def ready(pg, t=150):
    t0 = time.time()
    while time.time() - t0 < t:
        if pg.evaluate('!!(window.__engine && window.__engine.ready && window.__game && window.__ww)'): return True
        time.sleep(1)
    return False
def g(pg): return pg.evaluate('window.__game')
def until(pg, expr, t=60):
    t0 = time.time()
    while time.time() - t0 < t:
        try:
            if pg.evaluate(expr): return True
        except Exception: pass
        time.sleep(0.5)
    return False
def hold(pg, k, t=0.3): pg.keyboard.down(k); time.sleep(t); pg.keyboard.up(k)
def press_until(pg, k, expr, t=45, tries=3):
    for _ in range(tries):
        hold(pg, k, 0.4)
        if until(pg, expr, t): return True
    return False
PAD = """(() => { window.__btn = new Array(17).fill(false); window.__ax = [0,0,0,0];
  navigator.getGamepads = () => [{ id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(),
    axes: window.__ax, buttons: window.__btn.map((p) => ({ pressed: p, touched: p, value: p ? 1 : 0 })) }]; })();"""
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    # ---- boot, controller, keyboard, 10-foot ------------------------------------------------------------------
    pg = b.new_page(viewport={'width': 1920, 'height': 1080}); pg.add_init_script(PAD); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
    pg.goto(URL); check('boot: engine ready', ready(pg))
    if ready(pg, 1):
        st = g(pg); check('boot: no engine errors', pg.evaluate('window.__engine.errors.length') == 0, str(pg.evaluate('window.__engine.errors.map(e=>e.code)')))
        check('settings: music 0.1 on a fresh save', abs((st['music'] or 0) - 0.1) < 1e-6, str(st['music']))
        check('title shown', st['screen'] == 'title', st['screen'])
        small = pg.evaluate("""[...document.querySelectorAll('#ww *')].filter(e => e.children.length === 0 && (e.textContent||'').trim() && e.getBoundingClientRect().width > 0 && !e.closest('svg')).map(e => [parseFloat(getComputedStyle(e).fontSize), e.textContent.trim().slice(0,30)]).filter(x => x[0] < 27.5)""")
        check('10-foot: text at least 28 px', not small, str(small[:4]))
        check('10-foot: at most six menu rows', pg.evaluate("[...document.querySelectorAll('[data-ui=menu]')].every(m => m.querySelectorAll('[data-ui=item]').length <= 6)"))
        for _ in range(10):  # a slow boot can idle into attract: a pad press leaves it, then Cross begins, as a player would
            if g(pg)['screen'] == 'play': break
            pg.evaluate("window.__btn[0] = true"); time.sleep(3); pg.evaluate("window.__btn[0] = false"); time.sleep(6)
        until(pg, "window.__game.screen === 'play'"); st = g(pg); check('controller: Cross begins the game', st['screen'] == 'play', st['screen'])
        check('controller: PlayStation glyphs by default', st['glyphs'] == 'ps' and st['device'] == 'pad', f"{st['glyphs']} {st['device']}")
        check('controller: prompt shows an SVG glyph', until(pg, "!!document.querySelector('#ww .prompt svg.gl')"))
        hold(pg, 'KeyW', 0.2); check('prompts switch to keys on a key press', until(pg, "window.__game.device === 'keyboard' && !!document.querySelector('#ww .prompt .gl.cap')"), g(pg)['device'])
        pg.mouse.click(900, 500); check('prompts switch to the mouse on a click', until(pg, "window.__game.device === 'mouse'"), g(pg)['device'])
        check('keyboard: Tab opens the Programme', press_until(pg, 'Tab', "window.__game.screen === 'programme'"), g(pg)['screen'])
        check('keyboard: Escape closes it', press_until(pg, 'Escape', "window.__game.screen === 'play'"), g(pg)['screen'])
        check('pause opens', press_until(pg, 'Escape', "window.__game.screen === 'pause'"), g(pg)['screen'])
        rows = pg.evaluate("[...document.querySelectorAll('[data-ui=item]')].map(e=>e.textContent)"); check('pause menu reaches Dev Mode through More', 'More' in ' '.join(rows), str(rows))
        check('no page errors', not errs, str(errs))
    pg.close()
    # ---- attract and settings persistence ---------------------------------------------------------------------
    pg = b.new_page(viewport={'width': 1280, 'height': 720}); pg.goto(URL)
    if ready(pg):
        t0 = time.time(); on = False
        while time.time() - t0 < 40:
            if g(pg)['attract']: on = True; break
            time.sleep(1)
        check('attract starts after about 10 s idle on the title', on and 9 < time.time() - t0 < 60, f'{on} {time.time() - t0:.1f}')
        keys_before = pg.evaluate('Object.keys(localStorage).filter(k => k.includes("save"))')
        pg.keyboard.press('KeyA'); time.sleep(2); check('attract exits on a key', not g(pg)['attract'])
        check('attract never touches the save', not keys_before, str(keys_before))
    pg.close()
    # ---- about: every source field and answer is on screen -------------------------------------------------------
    pg = b.new_page(viewport={'width': 1920, 'height': 1080}); pg.goto(URL)
    if ready(pg):
        pg.evaluate("window.__ww.ctx.pick('title', 'about')"); until(pg, "!!document.querySelector('[data-screen=about]')")
        text = ''
        for _ in range(6):
            text += pg.evaluate("document.querySelector('[data-screen=about]') ? document.querySelector('[data-screen=about]').innerText : ''") + '\n'
            pg.evaluate("window.__ww.ctx.pick('about', 'next')"); time.sleep(2.5)
        for f in ['Date:', 'Source:', 'Plan:', 'Genre:', 'Perspective:', 'Tech:', 'Art Direction:', 'Animation:', 'Audio:', 'Online:', 'Testing:', 'Research:', 'Environment:', 'Model:', 'Usage:', 'Testing Feedback', 'Engine Feedback', 'Prompt Feedback']:
            check(f'about: {f}', f in text)
        check('about: Wii only on the Source line', text.count('Wii') == 1, str(text.count('Wii')))
    pg.close()
    # ---- touch-only ---------------------------------------------------------------------------------------------
    ctx = b.new_context(**p.devices['iPhone 13']); pg = ctx.new_page(); pg.goto(URL)
    t0 = time.time()
    while time.time() - t0 < 150 and not pg.evaluate("document.body.innerText.includes('Controller or keyboard required')"): time.sleep(1)
    check('touch-only: message shown', pg.evaluate("document.body.innerText.includes('Controller or keyboard required')"))
    tc = pg.evaluate("[...document.querySelectorAll('[data-touch], .touch-stick, .touch-control, .touch-knob')].filter(e => { const r = e.getBoundingClientRect(); return !e.hidden && !e.closest('[hidden]') && r.width > 0 && getComputedStyle(e).visibility !== 'hidden'; }).map(e => e.tagName + '.' + e.className + '#' + e.id)")
    check('touch-only: no touch controls in the DOM', not tc, str(tc[:4]))
    btn = pg.locator('[data-ui=item]').first
    if btn.count(): btn.tap(); time.sleep(1.5); check('touch-only: Settings opens by tap', 'Settings' in pg.evaluate("document.body.innerText"))
    ctx.close()
    b.close()
    # ---- no WebGPU: WebKit has none here ---------------------------------------------------------------------------
    try:
        wk = p.webkit.launch(); wp = wk.new_page(); wp.goto(URL); time.sleep(4)
        check('no WebGPU: a friendly page', 'needs a browser with WebGPU' in wp.evaluate('document.body.innerText'))
        wk.close()
    except Exception as e: check('no WebGPU page', False, str(e)[:120])
print('\n'.join('FAIL ' + f for f in fails)); print(f'browser: {count[0] - len(fails)}/{count[0]} checks passed')
