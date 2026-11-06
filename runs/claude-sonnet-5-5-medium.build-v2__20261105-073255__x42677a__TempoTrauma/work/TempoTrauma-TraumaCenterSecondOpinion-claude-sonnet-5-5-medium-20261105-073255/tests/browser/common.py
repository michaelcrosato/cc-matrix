import json, pathlib, time
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[2]
GAME = ROOT.parent / "TempoTrauma-TraumaCenterSecondOpinion-claude-sonnet-5-5-medium-20261105-073255.html"
if not GAME.exists():
    GAME = ROOT / "TempoTrauma-TraumaCenterSecondOpinion-claude-sonnet-5-5-medium-20261105-073255.html"
OUT = ROOT / "tests" / "out"
ARGS = ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-webgpu-adapter=swiftshader", "--use-vulkan=swiftshader", "--use-angle=swiftshader"]

PAD = """
(() => { const mk = (i) => { const buttons = Array.from({length: 17}, () => ({pressed: false, touched: false, value: 0}));
  return {id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: i, connected: true, mapping: 'standard', timestamp: 0, axes: [0,0,0,0], buttons}; };
  const pads = [mk(0), mk(1), null, null]; window.__pad = pads[0]; window.__pad2 = pads[1];
  navigator.getGamepads = () => pads; })();
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

class Game:
    def __init__(self, p, pad=False, device=None, size=(960, 540), tap=True):
        self.browser = p.chromium.launch(args=ARGS, headless=True)
        kw = {}
        if device:
            kw = dict(p.devices[device])
        else:
            kw = dict(viewport={"width": size[0], "height": size[1]})
        self.ctx = self.browser.new_context(**kw)
        if pad:
            self.ctx.add_init_script(PAD)
        if tap:
            self.ctx.add_init_script(TAP)
        self.page = self.ctx.new_page()
        self.errors = []
        self.page.on("console", lambda m: self.errors.append(m.text) if m.type == "error" else None)
        self.page.on("pageerror", lambda e: self.errors.append(str(e)))

    def open(self, query="", timeout=120):
        self.page.goto("file://" + str(GAME) + query)
        self.page.wait_for_function("window.__game && window.__game.status() !== ''", timeout=timeout * 1000)
        return self

    def status(self):
        return json.loads(self.page.evaluate("__game.status()"))

    def step(self, n):
        return self.page.evaluate(f"__game.step({n})")

    def do(self, obj):
        return self.page.evaluate("(j) => __game.do(j)", json.dumps(obj))

    def wait(self, pred, timeout=60, what=""):
        t0 = time.time()
        while time.time() - t0 < timeout:
            st = self.status()
            if pred(st):
                return st
            time.sleep(0.25)
        raise AssertionError(f"timeout waiting for {what}: {json.dumps(self.status())[:400]}")

    def frames(self, k=1, timeout=400):
        """Waits for k more rendered frames (the game draws 1-8 a second here)."""
        n0 = self.status()["frame"]["n"]
        t0 = time.time()
        while time.time() - t0 < timeout:
            if self.status()["frame"]["n"] >= n0 + k:
                return
            time.sleep(0.05)
        raise AssertionError("no frames")

    def key(self, k, hold=0.0):
        self.page.keyboard.down(k)
        self.frames(1)
        self.page.keyboard.up(k)
        self.frames(1)

    def pad(self, button=None, axes=None, value=1.0, hold=0.9):
        js = "const p=__pad;"
        if button is not None:
            js += f"p.buttons[{button}].pressed=true;p.buttons[{button}].value={value};"
        if axes:
            for i, v in axes.items():
                js += f"p.axes[{i}]={v};"
        js += "p.timestamp++;"
        self.page.evaluate(js)
        self.frames(2)
        rel = "const p=__pad;"
        if button is not None:
            rel += f"p.buttons[{button}].pressed=false;p.buttons[{button}].value=0;"
        if axes:
            for i in axes:
                rel += f"p.axes[{i}]=0;"
        rel += "p.timestamp++;"
        self.page.evaluate(rel)
        self.frames(2)

    def shot(self, name):
        self.page.screenshot(path=str(OUT / name))

    def close(self):
        try:
            self.browser.close()
        except Exception:
            pass
