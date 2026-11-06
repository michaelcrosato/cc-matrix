#!/usr/bin/env python3
# Chromium on file:// the built HTML, with the flags the engine needs. Prints failures and a count.
import json, os, re, sys, time
from playwright.sync_api import sync_playwright
ARGS = ['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-angle=swiftshader','--use-webgpu-adapter=swiftshader']
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
path = os.path.abspath(os.path.join(root, '..', os.path.basename(root) + '.html'))
url = 'file://' + path
fails = []; n = 0
def check(c, msg):
    global n
    n += 1
    if not c: fails.append(msg)
READY = 'window.__GAME__ !== undefined'
PAD = """
(() => {
  const state = { buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0, touched: false })), axes: [0, 0, 0, 0] };
  window.__pad = state;
  const pad = { id: 'Stub DualSense', index: 0, connected: true, mapping: 'standard', timestamp: 1, buttons: state.buttons, axes: state.axes, vibrationActuator: { playEffect: async () => 'complete' } };
  navigator.getGamepads = () => [pad, null, null, null];
})();
"""
def new_page(ctx, errors):
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append('PAGEERROR ' + str(e)[:400]))
    page.on('console', lambda m: errors.append('CONSOLE ' + m.text[:300]) if m.type == 'error' else None)
    return page
def status(page): return page.evaluate('window.__GAME__.status()')
def top(page): return page.evaluate('window.__GAME__.ui.model().screen')
def frames(page, n=2):
    f = page.evaluate('window.__PIXEL_ENGINE__.frame')
    page.wait_for_function('(f) => window.__PIXEL_ENGINE__.frame >= f', arg=f + n, timeout=30000)
def pad_press(page, i, ms=0):
    page.evaluate('(i) => { window.__pad.buttons[i].pressed = true; window.__pad.buttons[i].value = 1; }', i)
    frames(page, 2)
    page.evaluate('(i) => { window.__pad.buttons[i].pressed = false; window.__pad.buttons[i].value = 0; }', i)
    frames(page, 2)
def wait_top(page, id_, timeout=10000):
    try:
        page.wait_for_function('(id) => window.__GAME__.ui.model().screen === id', arg=id_, timeout=timeout)
    except Exception:
        fails.append(f"wanted screen {id_}, on {page.evaluate('JSON.stringify(window.__GAME__.ui.model())')} {page.evaluate('window.__GAME__.g.scripts.list.map((s) => s.name).join()')} {page.evaluate('window.__GAME__.g.status()')}")
        raise

def main(p):
    browser = p.chromium.launch(args=ARGS)
    # ---- Fresh profile: boot, engine bytes, 10% music, title ---------------------------------------------
    errors = []
    ctx = browser.new_context(viewport={'width': 960, 'height': 540})
    page = new_page(ctx, errors)
    page.goto(url)
    page.wait_for_function(READY, timeout=60000)
    check(page.title() == 'Honk If You Owe', 'page title')
    html = open(path, encoding='utf8').read()
    engine = open(os.path.join(root, 'kit', 'pixel-engine.js'), encoding='utf8').read()
    check(engine in html, 'engine text unchanged in the page')
    check(open(os.path.join(root, 'vendor', 'session.js'), encoding='utf8').read() in html, 'session.js unmodified in the page')
    check(html.find('<script>') < html.find('hub:session') and html.find('<meta charset') < html.find('<script>'), 'session.js is the first script, right after meta charset')
    check(re.search(r'<script[^>]+src=', html) is None, 'no external scripts')
    check(page.evaluate('window.__GAME__.engine.audio.volume.music') == 0.1, 'fresh profile music 10%')
    # No TODOs
    check(not re.search(r'\b(TODO|FIXME|XXX)\b', open(os.path.join(root, 'build', 'bundle.js'), encoding='utf8').read()), 'no TODOs in the bundle')
    check(top(page) == 'title', 'title screen')
    items = page.evaluate('window.__GAME__.ui.model().items')
    check(items[:1] == ['New Arrival'] or items[0] == 'Continue', f'menu {items}')
    check('Visit' in items and 'Settings' in items and 'About' in items, f'menu has the entries {items}')
    # Mouse hover moves focus; click activates
    page.mouse.move(480, 320)
    page.wait_for_timeout(300)
    f0 = page.evaluate('window.__GAME__.ui.model().focus')
    page.mouse.move(480, 365)
    page.wait_for_timeout(300)
    f1 = page.evaluate('window.__GAME__.ui.model().focus')
    check(f1 != f0, f'mouse hover moves focus {f0} {f1}')
    check(page.evaluate("getComputedStyle(document.querySelector('#app canvas')).cursor") == 'none', 'OS cursor hidden')
    # Keyboard opens About with every field
    frames(page, 3)
    page.keyboard.press('ArrowDown')
    frames(page, 3)
    page.evaluate("() => { const g = window.__GAME__.g; const m = g.ui.top; m.focus = m.items.findIndex((i) => i.label === 'About'); }")
    page.keyboard.press('Enter')
    wait_top(page, 'about')
    text = page.evaluate('window.__GAME__.g.ui.top.allText()')
    for field in ['Date:', 'Source:', 'Plan:', 'Genre:', 'Perspective:', 'Tech:', 'Art Direction:', 'Animation:', 'Audio:', 'Online:', 'Testing:', 'Research:', 'Environment:', 'Model:', 'Usage: added on import', 'Testing Feedback', 'Engine Feedback', 'Prompt Feedback', 'How many issues did testing catch', 'If you could change one thing', 'What would you change in this prompt', 'Inspired by Animal Crossing: City Folk', 'Kenney', 'Licences']:
        check(field in text, f'About has {field}')
    check(text.count('Animal Crossing: City Folk') >= 1, 'source named')
    page.keyboard.press('Escape')
    page.wait_for_timeout(300)
    # Settings: reset restores 10%
    page.evaluate("() => { const g = window.__GAME__.g; const m = g.ui.top; m.focus = m.items.findIndex((i) => i.label === 'Settings'); }")
    page.keyboard.press('Enter')
    wait_top(page, 'settings')
    frames(page, 4)
    page.keyboard.press('ArrowRight')
    frames(page, 4)
    check(abs(page.evaluate('window.__GAME__.engine.audio.volume.music') - 0.2) < 0.001, 'music slider up')
    page.evaluate("() => { const m = window.__GAME__.g.ui.top; m.focus = m.items.findIndex((i) => i.label === 'Reset to defaults'); }")
    page.keyboard.press('Enter')
    page.wait_for_timeout(300)
    check(page.evaluate('window.__GAME__.engine.audio.volume.music') == 0.1, 'Settings Reset restores 10%')
    # The engine's own ⚙ Reset too, on the instance
    page.evaluate('window.__GAME__.engine.audio.resetVolumes()')
    check(page.evaluate('window.__GAME__.engine.audio.volume.music') == 0.1, 'engine reset restores 10%')
    # Xbox glyph option
    page.evaluate("() => { const m = window.__GAME__.g.ui.top; m.focus = m.items.findIndex((i) => i.label === 'Controller glyphs'); }")
    page.keyboard.press('Enter')
    page.wait_for_timeout(200)
    check(page.evaluate('window.__GAME__.g.settings.xbox') is True, 'Xbox option sets')
    page.keyboard.press('Enter')
    page.wait_for_timeout(200)
    page.keyboard.press('Escape')
    page.wait_for_timeout(300)
    # ---- Attract: starts at 10 s; a key exits; player save untouched ---------------------------------------
    page.evaluate("localStorage.setItem('honk:save', localStorage.getItem('honk:save') ?? '')")
    before = page.evaluate("localStorage.getItem('honk:save')")
    page.wait_for_function("window.__GAME__.g.noInput !== undefined")
    t0 = time.time()
    page.mouse.move(10, 10)
    page.wait_for_function("window.__GAME__.status().mode === 'attract'", timeout=30000)
    took = time.time() - t0
    check(9 <= took <= 16, f'attract at about 10 s: {took:.1f}')
    page.wait_for_timeout(1500)
    check(page.evaluate("window.__GAME__.status().mode") == 'attract', 'attract keeps running')
    page.keyboard.press('KeyK')
    page.wait_for_function("window.__GAME__.status().mode === 'title'", timeout=8000)
    check(True, 'a key exits attract')
    check(page.evaluate("localStorage.getItem('honk:save')") == before, 'player save untouched by attract')
    # a mouse move exits it too
    page.wait_for_function("window.__GAME__.status().mode === 'attract'", timeout=30000)
    page.wait_for_timeout(500)
    page.mouse.move(300, 200)
    page.wait_for_function("window.__GAME__.status().mode === 'title'", timeout=8000)
    check(True, 'a mouse move exits attract')
    # Sound: after a real key, music and voice measured on the master bus
    page.keyboard.press('KeyK')
    page.evaluate("""() => {
      const a = window.__GAME__.engine.audio;
      a.setVolume('music', 1);
      const c = a.context;
      const an = c.createAnalyser();
      an.fftSize = 2048;
      a.master.connect(an);
      window.__an = an;
      window.__level = () => { const b = new Float32Array(an.fftSize); an.getFloatTimeDomainData(b); let s = 0, pk = 0; for (const v of b) { s += v * v; pk = Math.max(pk, Math.abs(v)); } return { rms: Math.sqrt(s / b.length), pk }; };
    }""")
    page.wait_for_timeout(1500)
    lv = 0
    for i in range(10):
        lv = max(lv, page.evaluate('window.__level().rms'))
        page.wait_for_timeout(100)
    check(lv > 0.0005, f'music is above silence at the master: {lv}')
    page.evaluate("() => { const a = window.__GAME__.engine.audio; a.setVolume('music', 0); }")
    page.wait_for_timeout(600)
    silent = page.evaluate('window.__level().rms')
    page.evaluate("""() => { const g = window.__GAME__.g; window.__spk = setInterval(() => g.voice.syllable('a', 'gander', 'hello'), 60); }""")
    page.wait_for_timeout(500)
    v = 0
    for i in range(10):
        v = max(v, page.evaluate('window.__level().rms'))
        page.wait_for_timeout(60)
    page.evaluate('clearInterval(window.__spk)')
    check(v > 0.0005, f'voice is above silence: {v}')
    check(page.evaluate('window.__GAME__.g.voice.spoken') > 0, 'voices counted')
    page.evaluate("window.__GAME__.engine.audio.setVolume('music', 0.1)")
    check(not errors, f'no errors on the title flow: {errors[:4]}')
    page.close(); ctx.close()

    # ---- Stub DualSense drives title → play → pause; prompts follow the last device -------------------------
    errors = []
    ctx = browser.new_context(viewport={'width': 960, 'height': 540})
    ctx.add_init_script(PAD)
    page = new_page(ctx, errors)
    page.goto(url)
    page.wait_for_function(READY, timeout=60000)
    frames(page, 8)
    pad_press(page, 13)  # d-pad down: focus moves
    page.wait_for_timeout(200)
    check(page.evaluate('window.__GAME__.g.inp.device') == 'pad', 'device follows the pad')
    check(page.evaluate('window.__GAME__.ui.model().focus') == 1, 'd-pad moves focus')
    pad_press(page, 12)
    pad_press(page, 0)   # Cross: New Arrival
    wait_top(page, 'newArrival')
    pad_press(page, 0)   # Village Time
    page.wait_for_function("window.__GAME__.status().mode === 'play'", timeout=15000)
    check(True, 'pad drives title into play')
    # Skip to free play for the pause tests
    page.evaluate("window.__GAME__.actions.quickStart({ day: 5, hour: 10, x: 12, z: 45 })")
    frames(page, 4)
    # Prompts
    pad_press(page, 4)
    frames(page, 2)
    check(page.evaluate('window.__GAME__.g.inp.device') == 'pad', 'still pad')
    glyph_pad = page.evaluate("() => { const g = window.__GAME__.g; return [g.settings.xbox, g.inp.device]; }")
    # Left stick moves
    x0 = page.evaluate('window.__GAME__.g.player.x')
    z0 = page.evaluate('window.__GAME__.g.player.z')
    page.evaluate("window.__pad.axes[0] = 1")
    frames(page, 12)
    page.evaluate("window.__pad.axes[0] = 0")
    frames(page, 3)
    moved = abs(page.evaluate('window.__GAME__.g.player.x') - x0) + abs(page.evaluate('window.__GAME__.g.player.z') - z0)
    check(moved > 0.3, f'left stick moves you: {moved}')
    # Options: pause; Create + Options is the hub's
    page.evaluate("window.__pad.buttons[8].pressed = true; window.__pad.buttons[8].value = 1;")
    frames(page, 2)
    pad_press(page, 9)
    check(top(page) != 'pause', 'Create + Options does not pause')
    page.evaluate("window.__pad.buttons[8].pressed = false; window.__pad.buttons[8].value = 0;")
    frames(page, 2)
    pad_press(page, 9)
    wait_top(page, 'pause')
    check(True, 'Options pauses')
    labels = page.evaluate('window.__GAME__.ui.model().items')
    for l in ['Resume', 'Map', 'Almanac', 'Settings', 'Save & Quit to Title', 'About', 'Dev Mode']:
        check(l in labels, f'pause has {l}')
    check(page.evaluate('window.__GAME__.engine.paused') is False, 'engine not paused')
    w0 = page.evaluate('window.__GAME__.g.town.water.time ?? 0')
    # Dev mode from pause, slider changes behaviour, Reset All restores
    page.evaluate("() => { const m = window.__GAME__.g.ui.top; m.focus = m.items.findIndex((i) => i.label === 'Dev Mode'); }")
    pad_press(page, 0)
    wait_top(page, 'dev')
    page.evaluate("() => { const m = window.__GAME__.g.ui.top; m.focus = m.items.findIndex((i) => i.label === 'Balance'); }")
    pad_press(page, 0)
    wait_top(page, 'dev:Balance')
    check(page.evaluate('window.__GAME__.tuning.jogSpeed') == 4.2, 'default jog')
    page.evaluate("() => { const m = window.__GAME__.g.ui.top; m.focus = m.items.findIndex((i) => i.label === 'Jog speed'); }")
    for _ in range(10): pad_press(page, 15, 60)
    jog = page.evaluate('window.__GAME__.tuning.jogSpeed')
    check(jog > 4.5, f'slider moves live: {jog}')
    # Close menus, walk: faster
    page.evaluate("window.__GAME__.g.ui.popAll()")
    page.wait_for_timeout(100)
    page.evaluate("window.__GAME__.actions.goto('town', 16, 52)")
    page.evaluate("window.__GAME__.engine.manual = true")
    fast = page.evaluate("""() => { const e = window.__GAME__.engine, g = window.__GAME__.g; const a = [g.player.x, g.player.z]; e.input.setKey('KeyD', true); e.step(60); e.input.setKey('KeyD', false); const d = Math.hypot(g.player.x - a[0], g.player.z - a[1]); e.step(2); return d; }""")
    check(fast > 4.5, f'the slider changes how far you go in a second: {fast}')
    page.evaluate("() => { const e = window.__GAME__.engine; e.manual = false; }")
    pad_press(page, 9)
    wait_top(page, 'pause')
    page.evaluate("() => { const m = window.__GAME__.g.ui.top; m.focus = m.items.findIndex((i) => i.label === 'Dev Mode'); }")
    pad_press(page, 0)
    page.evaluate("() => { const m = window.__GAME__.g.ui.top; m.focus = m.items.findIndex((i) => i.label === 'Balance'); }")
    pad_press(page, 0)
    wait_top(page, 'dev:Balance')
    page.evaluate("() => { const m = window.__GAME__.g.ui.top; m.focus = m.items.findIndex((i) => i.label === 'Reset All'); }")
    pad_press(page, 0)
    page.wait_for_timeout(100)
    check(page.evaluate('window.__GAME__.tuning.jogSpeed') == 4.2, 'Reset All restores')
    # Each dev page opens
    page.evaluate("window.__GAME__.g.ui.pop()")
    for pagename in ['Time', 'World', 'Player', 'Neighbours', 'Events', 'Collections', 'Debug', 'Save']:
        page.evaluate("(l) => { const g = window.__GAME__.g; const m = g.ui.top; m.items.find((i) => i.label === l).action(g, m); }", pagename)
        page.wait_for_timeout(120)
        check(top(page) == f'dev:{pagename}', f'dev page {pagename}')
        page.evaluate("window.__GAME__.g.ui.pop()")
    page.evaluate("window.__GAME__.g.ui.popAll()")
    # Last device switches prompts
    page.keyboard.press('KeyK')
    frames(page, 3)
    check(page.evaluate('window.__GAME__.g.inp.device') == 'kbm', 'keyboard takes over the prompts')
    pad_press(page, 4)
    frames(page, 2)
    check(page.evaluate('window.__GAME__.g.inp.device') == 'pad', 'pad takes the prompts back')
    check(not errors, f'no errors on the pad flow: {errors[:4]}')
    # Attract: a pad button exits it
    page.evaluate("window.__GAME__.g.goTitle()")
    page.wait_for_function("window.__GAME__.status().mode === 'attract'", timeout=30000)
    frames(page, 4)
    pad_press(page, 1)
    page.wait_for_function("window.__GAME__.status().mode === 'title'", timeout=8000)
    check(True, 'a button exits attract')
    page.close(); ctx.close()

    # ---- Keyboard and mouse: the same game ---------------------------------------------------------------
    errors = []
    ctx = browser.new_context(viewport={'width': 960, 'height': 540})
    page = new_page(ctx, errors)
    page.goto(url)
    page.wait_for_function(READY, timeout=60000)
    page.wait_for_timeout(300)
    page.evaluate("window.__GAME__.actions.quickStart({ day: 5, hour: 10, x: 24, z: 31 })")
    page.wait_for_timeout(500)
    a = page.evaluate('[window.__GAME__.g.player.x, window.__GAME__.g.player.z]')
    page.keyboard.down('KeyS')
    page.wait_for_timeout(700)
    page.keyboard.up('KeyS')
    b_ = page.evaluate('[window.__GAME__.g.player.x, window.__GAME__.g.player.z]')
    check(abs(a[0] - b_[0]) + abs(a[1] - b_[1]) > 0.4, 'WASD walks')
    # Click to walk
    page.mouse.move(600, 300)
    page.wait_for_timeout(200)
    page.mouse.click(600, 300)
    page.wait_for_timeout(1400)
    c_ = page.evaluate('[window.__GAME__.g.player.x, window.__GAME__.g.player.z]')
    check(abs(c_[0] - b_[0]) + abs(c_[1] - b_[1]) > 0.5, f'left-click walks there: {b_} -> {c_}')
    check(page.evaluate('window.__GAME__.g.inp.mouse.used') is True, 'mouse prompts')
    # Real typing: E is Confirm and also a letter, so a name with an e must come out as typed
    page.evaluate("window.__GAME__.g.world.almanac.stars.book = true")
    page.keyboard.press('KeyJ', delay=120)
    page.wait_for_timeout(300)
    for _ in range(4):
        page.keyboard.press('KeyR', delay=120)
        page.wait_for_timeout(150)
    check(top(page) == 'almanac' and page.evaluate('window.__GAME__.g.ui.top.tab') == 4, 'Almanac on the Stars page')
    check('Name it' in page.evaluate('window.__GAME__.ui.model().prompts'), 'a found constellation offers Name it')
    page.keyboard.press('KeyE', delay=120)
    page.wait_for_timeout(400)
    check(top(page) == 'keyboard', 'naming opens the keyboard')
    prompts = page.evaluate('window.__GAME__.ui.model().prompts')
    check(prompts == ['Done', 'Rub out', 'Suggest', 'Never mind'], f'keyboard players see the keys that matter: {prompts}')
    page.keyboard.type('Eve Regret', delay=100)
    page.wait_for_timeout(300)
    typed = page.evaluate('window.__GAME__.ui.model().text')
    check(typed == 'Eve Regret', f'typing with real keys gives what was typed: {typed}')
    page.keyboard.press('Backspace', delay=120)
    page.wait_for_timeout(300)
    typed = page.evaluate('window.__GAME__.ui.model().text')
    check(typed == 'Eve Regre', f'Backspace rubs out one letter: {typed}')
    page.keyboard.press('Enter', delay=120)
    page.wait_for_timeout(400)
    check(page.evaluate('window.__GAME__.g.world.almanac.starNames.book') == 'Eve Regre', 'the constellation takes the name')
    check(top(page) == 'almanac', 'back on the Almanac page')
    page.keyboard.press('Escape', delay=120)
    page.wait_for_timeout(400)
    # Tab opens Pockets; Esc closes; Esc pauses
    page.keyboard.press('Tab')
    page.wait_for_timeout(300)
    check(top(page) == 'pockets', 'Tab opens Pockets')
    page.keyboard.press('Escape')
    page.wait_for_timeout(300)
    page.keyboard.press('Escape')
    page.wait_for_timeout(300)
    check(top(page) == 'pause', 'Esc pauses')
    # Fullscreen entry exists; Save & Quit via click on its rect
    rect = page.evaluate("() => { const m = window.__GAME__.g.ui.top; const i = m.items.findIndex((x) => x.label === 'Resume'); return m.rect(i); }")
    page.mouse.move(int((rect[0] + rect[2] / 2) * 2), int((rect[1] + rect[3] / 2) * 2))
    page.wait_for_timeout(150)
    page.mouse.click(int((rect[0] + rect[2] / 2) * 2), int((rect[1] + rect[3] / 2) * 2))
    page.wait_for_timeout(300)
    check(top(page) is None, 'click on Resume closes pause')
    # Picture checks: a real frame drawn
    page.wait_for_timeout(300)
    st = page.evaluate("(() => { const e = window.__PIXEL_ENGINE__; return { fps: e.fps, errors: e.errors, gpu: e.renderer.gpuErrors, rec: e.renderer.recoveries }; })()")
    check(not st['errors'], f"engine errors: {st['errors']}")
    check(not st['gpu'], f"GPU errors: {st['gpu']}")
    check(st['rec'] == 0, 'no device loss')
    check(not errors, f'no errors on keyboard flow: {errors[:4]}')
    page.close(); ctx.close()

    # ---- Touch-only profiles: no touch UI, notice, ⚙, tap opens settings, attract runs -----------------------
    for name in ['Pixel 7', 'iPad Pro 11']:
        errors = []
        dev = p.devices[name]
        ctx = browser.new_context(**{k: v for k, v in dev.items() if k != 'default_browser_type'})
        page = new_page(ctx, errors)
        page.goto(url)
        page.wait_for_function(READY, timeout=60000)
        page.wait_for_timeout(800)
        check(page.evaluate('window.__GAME__.g.opts.touchOnly') is True, f'{name}: treated as touch-only')
        check(page.evaluate("document.querySelectorAll('.pe-touch, .touch-controls, [data-touch]').length") == 0, f'{name}: no touch controls')
        check(page.evaluate('window.__GAME__.engine.touch') is None, f'{name}: no touch controls in the engine')
        text_drawn = page.evaluate("window.__GAME__.g.opts.touchOnly && !window.__GAME__.g.inp.keyOrPadSeen")
        check(text_drawn, f'{name}: notice shows')
        gear = page.evaluate("""() => { const b = [...document.querySelectorAll('button')].find((x) => /⚙|settings/i.test(x.textContent + (x.title || '') + (x.getAttribute('aria-label') || ''))); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, v: getComputedStyle(b).display !== 'none' && r.width > 0 }; }""")
        check(gear and gear['v'], f'{name}: settings button shows: {gear}')
        if gear:
            page.touchscreen.tap(gear['x'], gear['y'])
            page.wait_for_timeout(500)
            check(page.evaluate('window.__GAME__.engine.settings.isOpen') is True, f'{name}: tap opens settings')
            page.evaluate('window.__GAME__.engine.settings.close()')
        page.wait_for_function("window.__GAME__.status().mode === 'attract'", timeout=40000)
        check(True, f'{name}: attract runs')
        page.touchscreen.tap(200, 200)
        page.wait_for_function("window.__GAME__.status().mode === 'title'", timeout=10000)
        check(True, f'{name}: a tap exits attract')
        check(not errors, f'{name}: no errors {errors[:3]}')
        page.close(); ctx.close()
    browser.close()

    # ---- WebKit: friendly no-WebGPU message, no uncaught error ------------------------------------------------
    try:
        wk = p.webkit.launch()
        errors = []
        ctx = wk.new_context()
        page = new_page(ctx, errors)
        page.goto(url)
        page.wait_for_timeout(5000)
        has_gpu = page.evaluate('!!navigator.gpu')
        if not has_gpu or page.evaluate('!!document.getElementById("no-webgpu")'):
            check(page.evaluate('!!document.getElementById("no-webgpu")'), 'WebKit: friendly message')
            check('WebGPU' in page.evaluate('document.body.innerText'), 'WebKit: names WebGPU')
        hard = [e for e in errors if e.startswith('PAGEERROR')]
        check(not hard, f'WebKit: no uncaught errors {hard[:2]}')
        wk.close()
    except Exception as e:
        fails.append('WebKit run threw ' + str(e)[:300])
with sync_playwright() as p:
    try:
        main(p)
    except Exception as e:
        fails.append('THREW ' + str(e).split('\n')[0][:300])
for f in fails: print('FAIL', f)
print(f'browser: {n} checks, {len(fails)} failures')
sys.exit(1 if fails else 0)
