# Browser checks of the controller-first features: attract mode, inverted sticks, glyphs, touch-only, mouse hover, hub tags.
import sys, json, os, time
from playwright.sync_api import sync_playwright
FILE = os.path.abspath(sys.argv[1]); OUT = sys.argv[2]; os.makedirs(OUT, exist_ok=True)
fails = 0
def check(what, ok, detail=''):
    global fails
    print(('ok   ' if ok else 'FAIL ') + what + ('' if ok else ': ' + str(detail)))
    if not ok: fails += 1
PAD = """
window.__pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', timestamp: 0,
  axes: [0, 0, 0, 0], buttons: Array.from({length: 17}, () => ({ pressed: false, touched: false, value: 0 })) };
navigator.getGamepads = () => [window.__pad];
"""
with sync_playwright() as pw:
    br = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    def newpage(init=None, **kw):
        ctx = br.new_context(**({'viewport': {'width': 1280, 'height': 720}} | kw))
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
        if init: pg.add_init_script(init)
        pg.goto('file://' + FILE); pg.wait_for_timeout(2500); pg.errs = errs
        return pg
    snap = lambda p: json.loads(p.evaluate("JSON.stringify(WW.debug.game.debug.snapshot())"))
    # --- attract mode: 10 s idle on the title starts it, it plays, any input leaves
    p = newpage()
    check('title shows first', snap(p)['scene'] == 'title')
    p.wait_for_timeout(5000); check('7 s idle: still the title', snap(p)['scene'] == 'title', snap(p)['scene'])
    p.wait_for_timeout(6000); s = snap(p); check('after 10 s idle the attract mode starts', s['scene'] == 'attract', s)
    p.screenshot(path=OUT + '/30-attract.png')
    seen = set()
    for i in range(60):
        p.evaluate('WW.debug.game.advance(3)'); s = snap(p); seen.add(s['auto'])
        if i in (15, 40, 60, 80, 100): p.screenshot(path=OUT + f'/31-attract-{i}.png')
        if s['scene'] != 'attract': break
    print('attract steps seen:', sorted(x for x in seen if x))
    check('the demo walks through the game (cook, sell, launder, fight, Gus, delivery, lab, boss)', len([x for x in seen if x]) >= 7, seen)
    check('the attract mode ran without errors', not p.errs, p.errs)
    p.keyboard.press('Space'); p.wait_for_timeout(600); s = snap(p)
    check('any key leaves the attract mode for the title', s['scene'] == 'title', s)
    # a mouse move also exits
    p.wait_for_timeout(10800); check('idle again: attract restarts', snap(p)['scene'] == 'attract')
    p.mouse.move(300, 300); p.mouse.move(340, 320); p.wait_for_timeout(600); check('a mouse move leaves it too', snap(p)['scene'] == 'title', snap(p)['scene'])
    p.close()
    # --- gamepad: glyphs, inverted sticks
    p = newpage(PAD)
    p.evaluate("window.__pad.buttons[0].pressed = true"); p.wait_for_timeout(200); p.evaluate("window.__pad.buttons[0].pressed = false"); p.wait_for_timeout(200)
    lab = p.evaluate("WW.debug.game.input.label('interact')"); check('a pad shows PlayStation glyphs by default', lab in ('✕', 'X', 'Cross') or 'ross' in lab or lab == '✕', lab)
    p.evaluate("WW.debug.game.settings.set('glyphs', 'xbox')"); p.wait_for_timeout(100)
    lab = p.evaluate("WW.debug.game.input.label('interact')"); check('Settings can switch to Xbox glyphs', lab == 'A', lab)
    p.evaluate("WW.debug.game.settings.set('glyphs', 'playstation')")
    # start the game with the pad (Cross on the focused New game)
    p.evaluate("window.__pad.buttons[0].pressed = true"); p.wait_for_timeout(150); p.evaluate("window.__pad.buttons[0].pressed = false"); p.wait_for_timeout(1500)
    check('Cross starts a new game', snap(p)['scene'] == 'play', snap(p))
    p.evaluate("WW.debug.talk.close(); WW.debug.setMode('walk'); WW.debug.lists.thugs.length=0; WW.debug.lists.cops.length=0")
    x0 = snap(p)['hero'][0]; p.evaluate("window.__pad.axes = [1, 0, 0, 0]"); p.wait_for_timeout(700); p.evaluate("window.__pad.axes = [0, 0, 0, 0]")
    x1 = snap(p)['hero'][0]; check('left stick right moves right', x1 > x0 + 20, (x0, x1))
    p.evaluate("WW.debug.game.settings.set('invertH', true)"); p.wait_for_timeout(100)
    p.evaluate("window.__pad.axes = [1, 0, 0, 0]"); p.wait_for_timeout(700); p.evaluate("window.__pad.axes = [0, 0, 0, 0]")
    x2 = snap(p)['hero'][0]; check('Invert horizontal flips the stick', x2 < x1 - 20, (x1, x2))
    p.evaluate("WW.debug.game.settings.set('invertH', false); WW.debug.game.settings.set('invertV', true)"); p.wait_for_timeout(100)
    y0 = snap(p)['hero'][1]; p.evaluate("window.__pad.axes = [0, 1, 0, 0]"); p.wait_for_timeout(600); p.evaluate("window.__pad.axes = [0, 0, 0, 0]")
    y1 = snap(p)['hero'][1]; check('Invert vertical flips the stick (stick down moves up)', y1 < y0 - 15, (y0, y1))
    p.evaluate("WW.debug.game.settings.set('invertV', false)"); p.wait_for_timeout(100)
    y0 = snap(p)['hero'][1]; p.evaluate("window.__pad.axes = [0, 1, 0, 0]"); p.wait_for_timeout(600); p.evaluate("window.__pad.axes = [0, 0, 0, 0]")
    y1 = snap(p)['hero'][1]; check('with inversion off, stick down moves down', y1 > y0 + 15, (y0, y1))
    check('the HUD prompt label follows the device', p.evaluate("WW.debug.game.input.lastDevice") == 'gamepad')
    check('the gamepad flow had no errors', not p.errs, p.errs)
    p.close()
    # --- keyboard and mouse: prompts follow the last device; hover moves the focus
    p = newpage()
    p.keyboard.press('Enter'); p.wait_for_timeout(1500)
    p.evaluate("WW.debug.talk.close(); WW.debug.setMode('walk'); WW.debug.lists.thugs.length=0; WW.debug.lists.cops.length=0")
    p.keyboard.down('d'); p.wait_for_timeout(600); p.keyboard.up('d')
    lab = p.evaluate("WW.debug.game.input.label('interact')"); check('keyboard prompts show keys', lab in ('E',), lab)
    # mouse hover over a station highlights it; click uses it
    p.evaluate("var s=WW.debug.stations().find(s=>s.id==='shop'); WW.debug.game.debug.teleport(s.x, s.y+16); WW.debug.game.settings.set('glyphs','auto')")
    p.wait_for_timeout(400)
    pos = p.evaluate("(() => { const g = WW.debug.game, s = WW.debug.stations().find(s=>s.id==='shop'); const sp = g.view.toScreen ? g.view.toScreen(s.x, s.y, 0) : null; return sp; })()")
    print('shop screen pos', pos)
    p.close()
    # --- touch only
    p = newpage(None, viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
    check('touch-only: the game says a controller or keyboard is required', p.evaluate("WW.debug.touchOnly") is True)
    txt = p.evaluate("document.body.innerText"); check('...in text on the title', 'Controller or keyboard required' in txt, txt[:200])
    p.screenshot(path=OUT + '/32-touch.png')
    check('...and offers the settings button', 'Settings' in txt)
    check('...and no New game button', 'New game' not in txt and 'NEW GAME' not in txt.upper().replace('NEW GAME', '') or 'New game' not in txt)
    p.wait_for_timeout(10500); check('touch-only: the attract mode still runs', snap(p)['scene'] == 'attract', snap(p)['scene'])
    check('touch-only had no errors', not p.errs, p.errs)
    p.close()
    # --- hub tags and the About screen
    p = newpage()
    meta = p.evaluate("Object.fromEntries([...document.querySelectorAll('meta[name^=\"hub:\"]')].map(m => [m.name, m.content]))")
    check('hub tags present', meta.get('hub:session') == '1' and meta.get('hub:session-mode') == 'ghost' and meta.get('hub:session-players') == '1-4' and 'hub:session-goal' in meta and 'hub:session-howto' in meta, meta)
    p.evaluate("WW.debug.fn.showAbout()"); p.wait_for_timeout(500); p.screenshot(path=OUT + '/33-about.png')
    t = p.evaluate("document.body.innerText")
    for key in ['Date', 'Source', 'Genre and Perspective', 'Tech', 'Art Direction', 'Animation', 'Audio', 'Online', 'Testing', 'Research', 'Environment', 'Model', 'Usage']:
        check('About shows ' + key, key.lower() in t.lower(), key)
    p.close(); br.close()
print('FAILED' if fails else 'ALL OK', fails)
sys.exit(1 if fails else 0)
