# Stick-only invert check: left stick right (axis +1) must move the ship right normally, left when inverted.
import sys, time, pathlib
from playwright.sync_api import sync_playwright
HTML = pathlib.Path(sys.argv[1]).resolve().as_uri()
ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan,VulkanFromANGLE,WebGPU',
        '--use-vulkan=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-angle=swiftshader']
MOCK = """window.__pad = { id: 'mock', mapping: 'standard', connected: true, axes: [0,0,0,0],
  buttons: Array.from({length:17}, () => ({pressed:false, value:0})) };
navigator.getGamepads = () => [window.__pad];"""
X = "() => +window.__starfock.game.ship.x.toFixed(2)"
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.add_init_script(MOCK)
    pg.goto(HTML)
    pg.wait_for_function("window.__starfock && window.__starfock.mode === 'title'", timeout=30000)
    pg.evaluate("window.__starfock.startMission(0)"); time.sleep(2.5)
    res = {}
    for inv in (False, True):
        pg.evaluate(f"window.__starfock.settings.invertX = {str(inv).lower()}; window.__starfock.game.ship.x = 0; window.__starfock.game.ship.vx = 0")
        pg.evaluate("window.__pad.axes[0] = 1"); time.sleep(0.6); pg.evaluate("window.__pad.axes[0] = 0"); time.sleep(0.4)
        res[f'invertX={inv}'] = pg.evaluate(X)
    print(res)
    b.close()
