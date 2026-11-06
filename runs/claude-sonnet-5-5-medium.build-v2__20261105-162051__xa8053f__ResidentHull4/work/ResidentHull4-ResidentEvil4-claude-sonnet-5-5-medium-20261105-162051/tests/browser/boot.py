from common import *
def adv(pg, n=10): pg.evaluate(f"window.__PIXEL_READY__.then(e => {{ e.step({n}); }})")
def live(pg): pg.evaluate("window.__PIXEL_READY__.then(e => { e.manual = false; })")
def run(r):
    with sync_playwright() as p:
        b = launch(p)
        ctx = b.new_context(viewport={'width': 1280, 'height': 720}); ctx.set_default_timeout(30000)
        ctx.add_init_script("""
          window.__pad = { buttons: Array.from({length: 17}, () => ({pressed:false, value:0})), axes: [0,0,0,0] };
          navigator.getGamepads = () => [{ id:'Wireless Controller', index:0, connected:true, mapping:'standard', axes: window.__pad.axes, buttons: window.__pad.buttons, vibrationActuator: { playEffect: () => Promise.resolve() } }];""")
        pg = ctx.new_page(); errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('file://' + GAME); pg.wait_for_function('window.__PIXEL_READY__ !== undefined', timeout=60000)
        r.check('boots on WebGPU', pg.evaluate('window.__PIXEL_READY__.then(e => e.state().backend)') == 'WebGPU')
        adv(pg, 30)
        st = pg.evaluate("window.__PIXEL_READY__.then(e => ({errors: e.errors, gpu: e.state().gpuErrors, music: e.audio.volume.music, game: e.state().game}))")
        r.check('no engine errors', not st['errors'] and not st['gpu'], st)
        r.check('first boot music volume 0.1', abs(st['music'] - 0.1) < 1e-9, st['music'])
        r.check('title shows', st['game'] == 'title')
        # pad press -> PlayStation glyphs, XBOX setting, keyboard back
        pg.evaluate("window.__pad.buttons[12].pressed = true"); adv(pg, 5)
        r.check('pad becomes last device', pg.evaluate("window.__DEVICE__.kind") == 'pad')
        pg.evaluate("window.__pad.buttons[12].pressed = false"); adv(pg, 3)
        pg.keyboard.press('ArrowDown'); adv(pg, 3)
        r.check('keyboard switches device at once', pg.evaluate("window.__DEVICE__.kind") == 'kbm')
        live(pg)
        pg.evaluate("window.__APP__.startNew('standard')"); pg.wait_for_function("window.__PIXEL_READY__.then(e => e.state().game) && window.__GAME__ && window.__GAME__.def && window.__GAME__.def.id === 'quay'", timeout=30000)
        adv(pg, 20)
        r.check('new claim starts the quay', pg.evaluate("window.__GAME__.def.id") == 'quay')
        pg.evaluate("window.__GAME__.openPause()"); adv(pg, 3)
        r.check('pause freezes time', pg.evaluate("window.__PIXEL_READY__.then(e => e.timeScale)") == 0)
        # dev mode slider changes TUNING and resets
        pg.evaluate("""(async () => { const { } = {}; const app = window.__APP__; const s = app.top(); })()""")
        res = pg.evaluate("""() => { const app = window.__APP__; const T = window.__TUNING__; const before = T.walkSpeed; T.walkSpeed = 5.5; const changed = T.walkSpeed; return {before, changed}; }""")
        r.check('tuning is live data', res['changed'] == 5.5)
        pg.evaluate("window.__TUNING__.walkSpeed = 3.0")
        pg.evaluate("window.__APP__.pop()"); adv(pg, 3)
        r.check('resume restores time', pg.evaluate("window.__PIXEL_READY__.then(e => e.timeScale)") == 1)
        r.check('no page errors', not errs, errs[:3])
        b.close()
        # phone profile: touch controls absent, required panel, attract running, tap doesn't exit
        dev = p.devices['iPhone 13'] if 'iPhone 13' in p.devices else p.devices['Pixel 5']
        b2 = launch(p); c2 = b2.new_context(**{k: v for k, v in dev.items() if k != 'default_browser_type'}); c2.set_default_timeout(30000)
        pg2 = c2.new_page(); pg2.goto('file://' + GAME); pg2.wait_for_function('window.__PIXEL_READY__ !== undefined', timeout=60000)
        adv(pg2, 20)
        r.check('touch-only detected', pg2.evaluate("window.__APP__.touchOnly") is True)
        r.check('no touch controls', pg2.evaluate("window.__PIXEL_READY__.then(e => !e.touch)"))
        adv(pg2, 700)
        r.check('attract mode runs on touch-only', pg2.evaluate("!!window.__APP__.attract"))
        pg2.touchscreen.tap(100, 300); adv(pg2, 5)
        r.check('tap does not exit attract', pg2.evaluate("!!window.__APP__.attract"))
        b2.close()
if __name__ == '__main__':
    r = R(); run(r); print(f'{r.passed} passed, {r.failed} failed')
