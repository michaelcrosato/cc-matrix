# Device pass in Chromium: a simulated standard-mapped gamepad (through navigator.getGamepads, which the engine reads),
# and a forced touch-only media query. This checks the browser-side path. It is NOT a physical controller or touch test.
import sys, os, time
from playwright.sync_api import sync_playwright

bundle = os.path.abspath(sys.argv[1])
S = 'window.My3D2dge.current'
fails, passed = [], 0
def check(name, ok, detail=''):
    global passed
    if ok: passed += 1
    else: fails.append(name + (' :: ' + str(detail) if detail else ''))

PAD_INIT = """
(() => {
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
  const axes = [0, 0, 0, 0];
  const pad = { id: 'Sim Controller (standard mapping)', index: 0, connected: true, mapping: 'standard',
    timestamp: 0, buttons, axes, get pressed() { return false; } };
  window.__pad = pad;
  navigator.getGamepads = () => [pad];
})();
"""
TOUCH_INIT = """
(() => {
  const real = window.matchMedia.bind(window);
  window.matchMedia = q => {
    if (/any-hover: none|any-pointer: coarse/.test(q)) return { matches: true, media: q, addEventListener() {}, removeEventListener() {} };
    return real(q);
  };
})();
"""

def press_pad(pg, index, ms=120):
    pg.evaluate(f"window.__pad.buttons[{index}].pressed = true; window.__pad.buttons[{index}].value = 1;")
    time.sleep(ms / 1000)
    pg.evaluate(f"window.__pad.buttons[{index}].pressed = false; window.__pad.buttons[{index}].value = 0;")
    time.sleep(.15)

with sync_playwright() as p:
    b = p.chromium.launch()
    # --- a simulated controller
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.add_init_script(PAD_INIT)
    errors = []; pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto('file://' + bundle); time.sleep(2)
    pg.evaluate(f"{S}.input.lastDevice")
    press_pad(pg, 9)     # Start: title -> menu
    time.sleep(.8)
    check('the simulated controller opens the menu with Start', pg.evaluate(f"{S}.sceneName") == 'menu', pg.evaluate(f"{S}.sceneName"))
    press_pad(pg, 0)     # A: the first item, the campaign
    time.sleep(3.6)
    check('A starts the campaign', pg.evaluate(f"{S}.sceneName") == 'hunt')
    check('the last device is the gamepad', pg.evaluate(f"{S}.input.lastDevice") == 'gamepad', pg.evaluate(f"{S}.input.lastDevice"))
    shots0 = pg.evaluate(f"{S}.debug.snapshot().site.shots")
    press_pad(pg, 7)     # RT: fire
    check('RT fires', pg.evaluate(f"{S}.debug.snapshot().site.shots") == shots0 + 1)
    press_pad(pg, 2)     # Square: pump
    time.sleep(.5)
    check('Square pumps the rifle', pg.evaluate(f"{S}.debug.snapshot().gun.chamber") == 'loaded')
    check('the prompts name the controller buttons', pg.evaluate(f"{S}.input.label('fire')") in ('RT', 'R2'), pg.evaluate(f"{S}.input.label('fire')"))
    check('no page errors with the controller', not errors, ' | '.join(errors[:2]))
    b.close()

    # --- a forced touch-only device: the message, the settings button, and attract
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 800, 'height': 600}, has_touch=True)
    pg.add_init_script(TOUCH_INIT)
    errors = []; pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto('file://' + bundle); time.sleep(2)
    check('a touch-only device opens the title with no touch controls', pg.evaluate(f"{S}.input.touchEnabled") is False, pg.evaluate(f"{S}.input.touchEnabled"))
    pg.keyboard.press('Enter'); time.sleep(.8)
    check('a touch-only device does not start a hunt on Enter', pg.evaluate(f"{S}.sceneName") == 'title')
    time.sleep(10.5)
    check('attract runs on a touch-only device', pg.evaluate(f"{S}.sceneName") == 'hunt')
    check('no page errors on the touch-only device', not errors, ' | '.join(errors[:2]))
    b.close()

for f in fails: print('FAIL ' + f)
print(f'devices (simulated): {passed} passed, {len(fails)} failed')
sys.exit(1 if fails else 0)
