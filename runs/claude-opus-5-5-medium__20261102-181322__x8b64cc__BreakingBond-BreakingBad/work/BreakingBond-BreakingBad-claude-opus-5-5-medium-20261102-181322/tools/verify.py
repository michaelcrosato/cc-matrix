# Feature verification: a fake standard-mapping gamepad (axis inversion, PlayStation/Xbox glyphs), a full attract cycle,
# and a touch-only phone profile. Prints PASS/FAIL per check.
import sys, time, subprocess, os, random, json
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
NAME = 'BreakingBond-BreakingBad-claude-opus-5-5-medium-20261102-181322.html'
port = random.randint(20000, 40000)
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port)], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(.8)
URL = f'http://localhost:{port}/{NAME}'
FAKEPAD = """
window.__pad = { axes: [0,0,0,0], buttons: Array.from({length:17}, () => ({pressed:false, value:0})) };
const fake = () => [{ id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(), axes: window.__pad.axes.slice(), buttons: window.__pad.buttons }];
Object.defineProperty(Navigator.prototype, 'getGamepads', { value: fake, configurable: true, writable: true });
"""
res = []
def check(name, ok, detail=''): res.append((name, ok)); print(('PASS ' if ok else 'FAIL ') + name, detail)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 1280, 'height': 720}); pg.add_init_script(FAKEPAD)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_function('window.__bb', timeout=20000); pg.wait_for_timeout(1500)
        G = 'window.__bb.state().game'
        # play, push stick right: hero must move +x; with Invert left/right on: -x
        pg.evaluate('window.__bb.go("play",{ch:0,beat:1})'); pg.wait_for_timeout(1500)
        def push(ax, val, ms=700):
            pg.evaluate('window.__bb.teleport(240, 285)'); pg.wait_for_timeout(100)
            x0 = pg.evaluate('window.__bb.state().W.hero.x'); y0 = pg.evaluate('window.__bb.state().W.hero.y')
            pg.evaluate(f'window.__pad.axes[{ax}] = {val}'); pg.wait_for_timeout(ms); pg.evaluate(f'window.__pad.axes[{ax}] = 0'); pg.wait_for_timeout(150)
            return pg.evaluate('window.__bb.state().W.hero.x') - x0, pg.evaluate('window.__bb.state().W.hero.y') - y0
        dx, _ = push(0, 1); check('stick right moves right', dx > 10, f'dx={dx:.1f}')
        check('last device is gamepad', pg.evaluate(G + '.input.lastDevice') == 'gamepad')
        check('PlayStation glyph by default', pg.evaluate(G + '.input.label("interact")') == '✕', pg.evaluate(G + '.input.label("interact")'))
        pg.evaluate(G + '.settings.set("invertX", true)'); dx, _ = push(0, 1); check('invert left/right flips the stick', dx < -10, f'dx={dx:.1f}')
        pg.evaluate(G + '.settings.set("invertX", false)')
        _, dy = push(1, 1); pg.evaluate(G + '.settings.set("invertV", true)'); _, dy2 = push(1, 1)
        check('invert up/down flips the stick', dy > 10 and dy2 < -10, f'dy={dy:.1f} inverted dy={dy2:.1f}')
        pg.evaluate(G + '.settings.set("invertV", false)')
        pg.evaluate(G + '.settings.set("glyphs", "xbox")'); check('Xbox glyph setting shows A', pg.evaluate(G + '.input.label("interact")') == 'A', pg.evaluate(G + '.input.label("interact")'))
        check('settings expose the toggles', all(k in pg.evaluate(G + '.settings.keys()') for k in ['glyphs', 'invertX', 'invertV']))
        pg.evaluate(G + '.settings.set("glyphs", "playstation")')
        # keyboard and mouse prompts
        pg.keyboard.press('KeyW'); pg.wait_for_timeout(200)
        check('keyboard prompt is E', pg.evaluate('window.__bb.state().game.input.label("interact")') == 'E')
        # attract: idle 10 s on the title, it plays, cycles to another chapter after 30 s, any input exits
        pg.evaluate('window.__bb.go("title")'); pg.wait_for_timeout(11500)
        s1 = json.loads(pg.evaluate('JSON.stringify(window.__bb.snapshot())')); check('attract starts after 10 s idle', s1['attract'] and s1['scene'] == 'play', s1['chapter'])
        pg.wait_for_timeout(31000)
        s2 = json.loads(pg.evaluate('JSON.stringify(window.__bb.snapshot())')); check('attract cycles to the next segment', s2['attract'] and s2['chapter'] != s1['chapter'], f"{s1['chapter']} -> {s2['chapter']}")
        pg.evaluate('window.__pad.buttons[0] = {pressed:true, value:1}'); pg.wait_for_timeout(500); pg.evaluate('window.__pad.buttons[0] = {pressed:false, value:0}'); pg.wait_for_timeout(500)
        check('a controller button exits attract', pg.evaluate('window.__bb.snapshot().scene') == 'title')
        check('no page errors (pad run)', not errs, str(errs[:2]))
        pg.close()
        # touch-only phone (WebKit iPhone profile): notice + settings only, attract still runs
        wk = p.webkit.launch(); ctx = wk.new_context(**p.devices['iPhone 13']); pg = ctx.new_page()
        pg.goto(URL); pg.wait_for_function('window.__bb', timeout=20000); pg.wait_for_timeout(2000)
        items = pg.evaluate('JSON.stringify(window.__bb.state().game.scene && 0)')
        menu = pg.evaluate("(()=>{ try { return JSON.stringify(window.__bbTitleItems ? window.__bbTitleItems() : null) } catch(e) { return String(e) } })()")
        pg.screenshot(path='/tmp/bb-x8b64cc/shots/verify-touch.png')
        check('touch-only title menu is Settings + About', json.loads(menu) == ['SETTINGS', 'ABOUT & CREDITS'], menu)
        pg.wait_for_timeout(10500)
        check('attract runs on a touch-only device', pg.evaluate('window.__bb.snapshot().attract') is True)
        wk.close(); b.close()
finally: srv.terminate()
print('RESULT', sum(1 for _, ok in res if ok), '/', len(res))
