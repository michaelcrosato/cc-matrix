# Checks the systems one at a time in Chromium: attract mode, heat and busts, pause, camera, settings, pad glyphs, touch-only.
import sys, time, pathlib, json, math
from playwright.sync_api import sync_playwright

HTML = pathlib.Path(sys.argv[1]).resolve().as_uri()
OUT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else '/tmp/hb-shots'); OUT.mkdir(parents=True, exist_ok=True)
results = []
def check(name, ok, detail=''):
    results.append({'check': name, 'ok': bool(ok), 'detail': str(detail)})
    print(('PASS ' if ok else 'FAIL ') + name + (' ' + str(detail) if detail else ''), flush=True)

def hb(page, expr):
    return page.evaluate('() => window.HALF_BAKED.' + expr)

def wait_for(page, expr, timeout=20):
    end = time.time() + timeout
    while time.time() < end:
        if page.evaluate('() => ' + expr): return True
        time.sleep(0.1)
    return False

def new_page(browser, viewport=None, **kw):
    ctx = browser.new_context(viewport=viewport or {'width': 1280, 'height': 720}, **kw)
    page = ctx.new_page()
    errs = []
    page.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    page.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    page.goto(HTML); time.sleep(2.5)
    return ctx, page, errs

with sync_playwright() as p:
    browser = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])

    # 1. Attract: idle 10 s on the title starts the AI run; any key returns to the title.
    ctx, page, errs = new_page(browser)
    t0 = time.time()
    check('attract starts after 10 s idle', wait_for(page, "window.HALF_BAKED.scene() === 'lab' && window.HALF_BAKED.state() && window.HALF_BAKED.state().attract", 20), f'after {time.time()-t0:.1f}s')
    time.sleep(1.0); page.screenshot(path=str(OUT / 'attract-lab.png'))
    check('attract cooks a batch and walks to the desert', wait_for(page, "window.HALF_BAKED.scene() === 'street'", 45), hb(page, 'scene()'))
    time.sleep(2.0); page.screenshot(path=str(OUT / 'attract-street.png'))
    check('attract sells in the desert and reaches the yard', wait_for(page, "window.HALF_BAKED.scene() === 'yard'", 90), hb(page, 'scene()'))
    time.sleep(1.5); page.screenshot(path=str(OUT / 'attract-yard.png'))
    page.keyboard.press('KeyQ'); time.sleep(0.8)
    check('any key leaves attract for the title', hb(page, 'scene()') == 'title', hb(page, 'scene()'))
    check('attract run: no page errors', not [e for e in errs if e.startswith('PAGEERROR')], errs[:3])
    ctx.close()

    # 2. Heat and busts: stand in the agent's sight until the heat gauge fills; the batch is lost and the lab reopens.
    ctx, page, errs = new_page(browser)
    page.keyboard.press('Enter'); wait_for(page, "window.HALF_BAKED.scene() === 'lab'")
    time.sleep(0.3)
    for _ in range(40):
        if not hb(page, 'talk.open'): break
        page.keyboard.press('Enter'); time.sleep(0.25)
    hb(page, 'state() && (window.HALF_BAKED.state().product = {purity: 80, units: 10, grade: "GOOD"}, window.HALF_BAKED.state().cooked = true)')
    ex = hb(page, 'exitPos()'); hb(page, f"teleport({ex['x'] - 8}, {ex['y']})"); time.sleep(0.4)
    page.keyboard.press('Enter'); wait_for(page, "window.HALF_BAKED.scene() === 'street'")
    time.sleep(0.5)
    for _ in range(40):
        if not hb(page, 'talk.open'): break
        page.keyboard.press('Enter'); time.sleep(0.25)
    seen_heat = False; busted = False
    end = time.time() + 40
    while time.time() < end:
        if hb(page, 'talk.open'):
            page.keyboard.press('Enter'); time.sleep(0.2); continue
        if hb(page, 'state().busts') >= 1:
            busted = True; break
        ag = hb(page, 'agentPos()')
        if ag:
            # Stand in the agent's line of sight: 18 units out along his facing.
            hb(page, f"teleport({ag['x'] + 18 * math.cos(ag['facing'])}, {ag['y'] + 18 * math.sin(ag['facing'])})")
        st = hb(page, 'state().heat')
        if st and st > 5: seen_heat = True
        time.sleep(0.05)
    check('being seen raises the heat gauge', seen_heat)
    # The bust's dialogue plays out, then the scene changes to the lab.
    for _ in range(60):
        if hb(page, 'scene()') == 'lab': break
        if hb(page, 'talk.open'): page.keyboard.press('Enter')
        time.sleep(0.25)
    check('a full heat gauge busts the run back to the lab', busted and hb(page, 'scene()') == 'lab', hb(page, 'scene()'))
    time.sleep(0.6)
    for _ in range(40):
        if not hb(page, 'talk.open'): break
        page.keyboard.press('Enter'); time.sleep(0.25)
    check('the bust takes the batch', hb(page, 'state().product') is None and hb(page, 'state().busts') >= 1, hb(page, 'state().busts'))
    ctx.close()

    # 3. Pause menu, camera cycling, settings. Keyboard only.
    ctx, page, errs = new_page(browser)
    page.keyboard.press('Enter'); wait_for(page, "window.HALF_BAKED.scene() === 'lab'"); time.sleep(0.4)
    for _ in range(40):
        if not hb(page, 'talk.open'): break
        page.keyboard.press('Enter'); time.sleep(0.25)
    v0 = page.evaluate('() => window.HALF_BAKED.game.view.id')
    page.keyboard.press('KeyV'); time.sleep(0.3)
    v1 = page.evaluate('() => window.HALF_BAKED.game.view.id')
    check('V cycles the camera view', v0 != v1, f'{v0} -> {v1}')
    page.keyboard.press('Escape'); time.sleep(0.6)
    paused = page.evaluate('() => !!window.HALF_BAKED.game.paused || (window.HALF_BAKED.game.menuOpen ? true : false)')
    page.screenshot(path=str(OUT / 'pause.png'))
    check('Escape opens the pause menu', paused, paused)
    page.keyboard.press('Escape'); time.sleep(0.4)
    s = page.evaluate('() => ({ x: window.HALF_BAKED.game.settings.invertX, y: window.HALF_BAKED.game.settings.invertY, g: window.HALF_BAKED.game.settings.glyphs })')
    check('settings have invert X, invert Y and glyph style', s['x'] is False and s['y'] is False and s['g'] == 'playstation', s)
    page.evaluate("() => { window.HALF_BAKED.game.settings.set('invertX', true); window.HALF_BAKED.game.settings.set('glyphs', 'xbox'); }")
    s2 = page.evaluate('() => ({ x: window.HALF_BAKED.game.settings.invertX, g: window.HALF_BAKED.game.settings.glyphs })')
    check('settings change at runtime', s2['x'] is True and s2['g'] == 'xbox', s2)
    page.evaluate("() => { window.HALF_BAKED.game.settings.set('invertX', false); window.HALF_BAKED.game.settings.set('glyphs', 'playstation'); }")
    # Pad prompts: pretend the last device was a pad, so the glyphs draw as pad buttons.
    page.evaluate("() => { window.HALF_BAKED.game.input.lastDevice = 'gamepad'; }")
    time.sleep(0.4); page.screenshot(path=str(OUT / 'prompt-ps.png'))
    page.evaluate("() => { window.HALF_BAKED.game.settings.set('glyphs', 'xbox'); }"); time.sleep(0.4)
    page.screenshot(path=str(OUT / 'prompt-xbox.png'))
    page.evaluate("() => { window.HALF_BAKED.game.input.lastDevice = 'keyboard'; window.HALF_BAKED.game.settings.set('glyphs', 'playstation'); }")
    check('no page errors in play', not [e for e in errs if e.startswith('PAGEERROR')], errs[:3])
    ctx.close()

    # 4. Touch-only device: the message shows and attract still runs. No touch controls.
    ctx, page, errs = new_page(browser, viewport={'width': 820, 'height': 1180}, has_touch=True, is_mobile=True)
    time.sleep(0.5)
    touch_only = page.evaluate("() => window.HALF_BAKED.game.input.touchEnabled")
    page.screenshot(path=str(OUT / 'touch-title.png'))
    check('touch-only title turns the touch stick off', touch_only is False, touch_only)
    ctx.close()

    browser.close()

passed = sum(1 for r in results if r['ok'])
print(f'{passed}/{len(results)} system checks passed', flush=True)
(OUT / 'systems.json').write_text(json.dumps(results, indent=1))
