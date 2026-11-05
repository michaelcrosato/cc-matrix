import sys, json
from playwright.sync_api import sync_playwright
PAD = """window.__pad = { b: Array(17).fill(0), axes: [0,0,0,0] };
navigator.getGamepads = () => [{ id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(),
  axes: window.__pad.axes.slice(), buttons: window.__pad.b.map(v => ({ pressed: !!v, touched: !!v, value: v ? 1 : 0 })) }, null, null, null];"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 720}); pg.add_init_script(PAD)
    pg.goto(sys.argv[1]); pg.wait_for_timeout(1500)
    ev = pg.evaluate
    ev("window.G = My3D2dge.current; G.settings.set('glyphs','xbox'); G.debug.newGame('story'); G.go('office')"); pg.wait_for_timeout(1200)
    def walk(ax):
        ev("G.debug.teleport(330, 230)"); ev(f"window.__pad.axes[0] = {ax}"); pg.wait_for_timeout(700); ev("window.__pad.axes[0] = 0"); pg.wait_for_timeout(200)
        return json.loads(ev("JSON.stringify(G.debug.snapshot())"))['hero'][0]
    print('stick right, normal  -> x', walk(1))
    ev("G.settings.set('invertX', true)"); print('stick right, invertX -> x', walk(1))
    pg.screenshot(path='/tmp/mm4/xbox.png'); b.close()
