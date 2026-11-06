"""Shared browser helpers: Chromium with software WebGPU, stand-ins for a pad and for ears."""
import json
import pathlib
import time

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
GAME = ROOT / "out" / "game.html"
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)
ARGS = ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-webgpu-adapter=swiftshader", "--use-vulkan=swiftshader", "--use-angle=swiftshader"]

PAD = """
(() => { const buttons = Array.from({length: 17}, () => ({pressed: false, touched: false, value: 0}));
  const pad = {id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true,
               mapping: 'standard', timestamp: 0, axes: [0,0,0,0], buttons,
               vibrationActuator: {playEffect: (...a) => { window.__rumbled = (window.__rumbled||0)+1; return Promise.resolve('complete'); }}};
  window.__pad = pad; navigator.getGamepads = () => [pad, null, null, null];
  window.__padHit = (i, v) => { pad.buttons[i].pressed = v > 0; pad.buttons[i].touched = v > 0; pad.buttons[i].value = v; pad.timestamp++; };
  window.__padAxis = (i, v) => { pad.axes[i] = v; pad.timestamp++; };
})();
"""

TAP = """
(() => { const real = AudioNode.prototype.connect; window.__an = [];
  AudioNode.prototype.connect = function (dest, ...rest) { const r = real.call(this, dest, ...rest);
    if (dest instanceof AudioDestinationNode) { const c = this.context;
      if (!c.__an) { c.__an = c.createAnalyser(); c.__an.fftSize = 2048; window.__an.push(c.__an); } real.call(this, c.__an); }
    return r; };
  window.__peak = () => { let m = 0; for (const a of window.__an) { const b = new Float32Array(a.fftSize);
    a.getFloatTimeDomainData(b); for (const v of b) m = Math.max(m, Math.abs(v)); } return m; }; })();
"""


def wait_for_memory(gb=2.5, timeout=240):
    """Other agents share this machine, and the OOM killer ends the biggest browser."""
    end = time.time() + timeout
    while time.time() < end:
        for line in open("/proc/meminfo"):
            if line.startswith("MemAvailable"):
                if int(line.split()[1]) > gb * 1024 * 1024:
                    return
        time.sleep(3)


CRASHED = ("Target crashed", "Target closed", "has been closed", "ERR_ABORTED", "crashed", "Browser closed")


def open_game(browser, width=960, height=540, pad=False, tap=False, query="", storage=None, **ctx):
    context = browser.new_context(viewport={"width": width, "height": height}, **ctx)
    if pad:
        context.add_init_script(PAD)
    if tap:
        context.add_init_script(TAP)
    if storage is not None:
        context.add_init_script(f"localStorage.setItem('surgery-save', {json.dumps(storage)});")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    # Chromium's note about a touch it couldn't cancel is about the page's scrolling, not an error of ours.
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "Ignored attempt to cancel" not in m.text else None)
    page.goto(GAME.as_uri() + query)
    return context, page, errors


def status(page):
    return page.evaluate("window.__game ? window.__game.status() : null")


def wait(page, cond, timeout=90, what="condition"):
    end = time.time() + timeout
    while time.time() < end:
        s = status(page)
        if s and cond(s):
            return s
        time.sleep(0.2)
    raise AssertionError(f"timed out waiting for {what}: {status(page)}")


def frames(page, n=2, timeout=30):
    """Waits for the game to draw n more frames: software rendering runs at a few a second."""
    start = (status(page) or {}).get("frames", 0)
    end = time.time() + timeout
    while time.time() < end:
        s = status(page)
        if s and s.get("frames", 0) >= start + n:
            return
        time.sleep(0.03)


def key(page, name, hold=None):
    page.keyboard.down(name)
    frames(page, 2)
    page.keyboard.up(name)
    frames(page, 2)


def hit(page, i, v=1.0):
    """Presses a pad button across two frames, and lets go across two."""
    page.evaluate(f"__padHit({i},{v})")
    frames(page, 2)
    page.evaluate(f"__padHit({i},0)")
    frames(page, 2)


def press_until(page, name, cond, what, tries=12):
    """Presses a key until the state changes: for screens that wait a moment before they listen."""
    for _ in range(tries):
        s = status(page)
        if s and cond(s):
            return s
        key(page, name)
    raise AssertionError(f"{name} never led to {what}: {status(page)}")
