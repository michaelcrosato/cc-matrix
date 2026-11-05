# Browser checks in a real engine: keyboard, mouse (hover and click a person to walk over and talk), a gamepad (a fake
# one in the standard mapping: the stick, a button, PlayStation and Xbox symbols, the inverted-axes fix), and a
# touch-only phone (the title's notice, the attract mode). usage: python3 tests/browser.py URL [chromium|firefox|webkit]
import sys, asyncio, json
from playwright.async_api import async_playwright
URL = sys.argv[1]; ENG = sys.argv[2] if len(sys.argv) > 2 else 'chromium'
FAKE_PAD = """
window.__pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: true, mapping: 'standard', timestamp: 0,
  axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
navigator.getGamepads = () => [window.__pad, null, null, null];
"""
fails = 0
def check(what, ok, detail=''):
    global fails
    print(('ok   ' if ok else 'FAIL ') + what + ('' if ok else ': ' + str(detail)))
    if not ok: fails += 1
async def snap(pg): return json.loads(await pg.evaluate('JSON.stringify(My3D2dge.current.debug.snapshot())'))
async def main():
    async with async_playwright() as p:
        b = await getattr(p, ENG).launch()
        pg = await b.new_page(viewport={'width': 1280, 'height': 720})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await pg.add_init_script(FAKE_PAD)
        await pg.goto(URL); await pg.wait_for_timeout(2500)
        s = await snap(pg); check(ENG + ': the title loads', s['scene'] == 'title', s)
        # keyboard: Enter starts the story; Enter turns the dialog
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(2500)
        s = await snap(pg); check('Enter on NEW STORY opens the couch', s['scene'] == 'therapy', s)
        await pg.evaluate("(()=>{const D=My3D2dge.current.debug; D.convoQ.length=0; D.talk.close(); D.startChapter('ch1');})()"); await pg.wait_for_timeout(1500)
        s = await snap(pg); x0 = s['hero']['x']
        await pg.keyboard.down('KeyD'); await pg.wait_for_timeout(700); await pg.keyboard.up('KeyD')
        s = await snap(pg); check('D walks Sal right', s['hero']['x'] > x0 + 20, (x0, s['hero']['x']))
        await pg.keyboard.down('ShiftLeft'); await pg.keyboard.down('KeyA'); await pg.wait_for_timeout(500); await pg.keyboard.up('KeyA'); await pg.keyboard.up('ShiftLeft')
        s2 = await snap(pg); check('Shift+A sprints left', s2['hero']['x'] < s['hero']['x'] - 30, (s['hero']['x'], s2['hero']['x']))
        lab = await pg.evaluate("My3D2dge.current.input.label('attack')")
        check('keyboard prompts show keys', lab == 'J', lab)
        # the mouse: hover over Donna moves the focus; a click walks Sal over and talks
        pos = await pg.evaluate("""(()=>{const g=My3D2dge.current, D=g.debug, n=D.W.npcs.find(n=>n.who==='donna'); const [bx,by]=g.r.w(n.x,n.y,22); const c=document.getElementById('screen'); const k=c.clientWidth/g.W; return [bx*k, by*k];})()""")
        await pg.mouse.move(pos[0] - 30, pos[1] - 30); await pg.mouse.move(pos[0], pos[1]); await pg.wait_for_timeout(300)
        dev = await pg.evaluate("My3D2dge.current.input.lastDevice")
        hov = await pg.evaluate("(()=>{const W=My3D2dge.current.debug.W; return W.hover ? W.hover.label : null})()")
        check('the mouse becomes the device; hover focuses Donna', dev == 'mouse' and hov == 'Talk', (dev, hov))
        await pg.mouse.click(pos[0], pos[1]); await pg.wait_for_timeout(2500)
        s = await snap(pg); check('a click walks Sal to Donna and talks', s['talk'], s)
        await pg.evaluate("(()=>{const D=My3D2dge.current.debug; D.convoQ.length=0; D.talk.close();})()")
        # the gamepad: the left stick moves Sal, □ punches, symbols follow the pad
        await pg.evaluate("window.__pad.buttons[2] = { pressed: true, touched: true, value: 1 }; window.__pad.timestamp++"); await pg.wait_for_timeout(100)
        await pg.evaluate("window.__pad.buttons[2] = { pressed: false, touched: false, value: 0 }; window.__pad.timestamp++"); await pg.wait_for_timeout(300)
        dev = await pg.evaluate("My3D2dge.current.input.lastDevice"); lab = await pg.evaluate("My3D2dge.current.input.label('attack')")
        check('a pad button makes the pad the device; □ prompt', dev == 'gamepad' and lab == '□', (dev, lab))
        await pg.evaluate("My3D2dge.current.settings.set('glyphs','xbox')"); lab = await pg.evaluate("My3D2dge.current.input.label('attack')")
        check('Settings: Xbox symbols', lab == 'X', lab)
        await pg.evaluate("My3D2dge.current.settings.set('glyphs','playstation')")
        s = await snap(pg); x0 = s['hero']['x']
        await pg.evaluate("window.__pad.axes = [0.95, 0, 0, 0]"); await pg.wait_for_timeout(600); await pg.evaluate("window.__pad.axes = [0, 0, 0, 0]"); await pg.wait_for_timeout(100)
        s = await snap(pg); x1 = s['hero']['x']; check('stick right walks right', x1 > x0 + 15, (x0, x1))
        await pg.evaluate("My3D2dge.current.settings.set('invertX', true)")
        await pg.evaluate("window.__pad.axes = [0.95, 0, 0, 0]"); await pg.wait_for_timeout(600); await pg.evaluate("window.__pad.axes = [0, 0, 0, 0]"); await pg.wait_for_timeout(100)
        s = await snap(pg); x2 = s['hero']['x']; check('Invert horizontal: stick right walks left', x2 < x1 - 15, (x1, x2))
        await pg.evaluate("My3D2dge.current.settings.set('invertX', false)")
        y0 = s['hero']['y']
        await pg.evaluate("My3D2dge.current.settings.set('invertY', true)")
        await pg.evaluate("window.__pad.axes = [0, 0.95, 0, 0]"); await pg.wait_for_timeout(600); await pg.evaluate("window.__pad.axes = [0, 0, 0, 0]"); await pg.wait_for_timeout(100)
        s = await snap(pg); check('Invert vertical: stick down walks up', s['hero']['y'] < y0 - 10, (y0, s['hero']['y']))
        await pg.evaluate("My3D2dge.current.settings.set('invertY', false)")
        # Escape opens the pause menu (the engine's), Escape closes it
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
        paused = await pg.evaluate("My3D2dge.current.paused"); check('Esc pauses', paused, paused)
        await pg.screenshot(path=f'/tmp/x3ec78e/shots/pause-{ENG}.png')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
        check('no page errors', not errs, errs[:5])
        await pg.close()
        # a touch-only phone: the notice and the settings button, then the attract mode after 10 s
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=ENG != 'firefox', device_scale_factor=2)
        ph = await ctx.new_page(); perr = []; ph.on('pageerror', lambda e: perr.append(str(e)))
        await ph.goto(URL); await ph.wait_for_timeout(2500)
        tl = await ph.evaluate("My3D2dge.current.debug.touchLocked")
        await ph.screenshot(path=f'/tmp/x3ec78e/shots/touch-{ENG}.png')
        check('touch-only: "Controller or keyboard required"', tl, tl)
        await ph.wait_for_timeout(10500)
        s = await snap(ph); check('touch-only: the attract mode runs', s['scene'] == 'attract', s['scene'])
        await ph.screenshot(path=f'/tmp/x3ec78e/shots/touch-attract-{ENG}.png')
        check('no page errors on the phone', not perr, perr[:5])
        await b.close()
asyncio.run(main())
print(f'{fails} failed' if fails else 'all browser checks passed'); sys.exit(1 if fails else 0)
