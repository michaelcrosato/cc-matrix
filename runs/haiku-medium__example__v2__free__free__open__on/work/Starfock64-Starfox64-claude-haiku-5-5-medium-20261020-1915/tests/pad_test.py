# Drives the game with a mocked standard-mapping gamepad (PS5 layout):
# menus via D-pad / Cross / Circle, flight via left stick, fire via R2, bomb via Triangle,
# pause via Options, and the invert-stick toggle in Options.
import sys, time, pathlib, json
from playwright.sync_api import sync_playwright
HTML = pathlib.Path(sys.argv[1]).resolve().as_uri()
ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan,VulkanFromANGLE,WebGPU',
        '--use-vulkan=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-angle=swiftshader']
MOCK = """
window.__pad = { id: 'Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', mapping: 'standard', connected: true,
  axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
navigator.getGamepads = () => [window.__pad];
window.addEventListener('load', () => window.dispatchEvent(new Event('gamepadconnected')));
"""
def press(pg, idx, hold=0.12):
    pg.evaluate(f"window.__pad.buttons[{idx}].pressed = true")
    time.sleep(hold)
    pg.evaluate(f"window.__pad.buttons[{idx}].pressed = false")
    time.sleep(0.15)
STATE = """() => { const s = window.__starfock; const g = s.game; return { mode: s.mode, stage: g && g.stageIndex,
  phase: g && g.phase, t: g && +g.t.toFixed(1), shipX: g && +g.ship.x.toFixed(2), shots: g && g.shots, bombs: g && g.bombs,
  invertX: s.settings.invertX, invertY: s.settings.invertY }; }"""
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.add_init_script(MOCK)
    errs = []
    pg.on('pageerror', lambda e: errs.append(f'[pageerror] {e}'))
    pg.goto(HTML)
    pg.wait_for_function("window.__starfock && window.__starfock.mode === 'title'", timeout=30000)
    time.sleep(0.5)
    press(pg, 0)                       # Cross: Start Mission
    print('after Cross on title:', pg.evaluate(STATE))
    press(pg, 0)                       # Cross: Launch
    time.sleep(2.5)
    print('after launch:', pg.evaluate(STATE))
    pg.evaluate("window.__pad.buttons[7].pressed = true"); time.sleep(0.5); pg.evaluate("window.__pad.buttons[7].pressed = false")
    pg.evaluate("window.__pad.axes[0] = -1"); time.sleep(1.0); pg.evaluate("window.__pad.axes[0] = 0")
    print('after R2 + stick left:', pg.evaluate(STATE))
    press(pg, 3)                       # Triangle: bomb
    print('after Triangle:', pg.evaluate(STATE))
    press(pg, 9)                       # Options: pause
    print('after Options (pause):', pg.evaluate(STATE))
    pg.screenshot(path='/tmp/pad-pause.png')
    press(pg, 13); press(pg, 0)        # D-pad down to Options, Cross
    print('pause->options:', pg.evaluate(STATE))
    press(pg, 13); press(pg, 13); press(pg, 13); press(pg, 13); press(pg, 13); press(pg, 13); press(pg, 13); press(pg, 13)  # to Stick Test... see below
    pg.screenshot(path='/tmp/pad-options.png')
    # Focus 0 is Invert Stick Left/Right: go back up and toggle it with Cross.
    for _ in range(8):
        press(pg, 12)
    press(pg, 0)
    print('after toggling invertX:', pg.evaluate(STATE))
    pg.evaluate("window.__pad.axes[0] = 1"); time.sleep(0.5)
    print('stick right while inverted (ship should move left):', pg.evaluate(STATE))
    pg.evaluate("window.__pad.axes[0] = 0"); time.sleep(0.2)
    pg.screenshot(path='/tmp/pad-options2.png')
    print('ERRORS:', json.dumps(errs[:10]))
    b.close()
