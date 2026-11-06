"""Shared bits for the browser tests: the built single file, Chromium flags, stand-ins."""
import glob, json, os, pathlib, time

ROOT = pathlib.Path(__file__).resolve().parents[2]
GAME = sorted(glob.glob(str(ROOT.parent / "*.html")))[0]
ARGS = ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-webgpu-adapter=swiftshader", "--use-vulkan=swiftshader", "--use-angle=swiftshader"]
OUT = ROOT / "tests" / "out"
OUT.mkdir(parents=True, exist_ok=True)

PAD = """
(() => { const buttons = Array.from({length: 17}, () => ({pressed: false, touched: false, value: 0}));
  const pad = {id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true,
               mapping: 'standard', timestamp: 0, axes: [0,0,0,0], buttons};
  window.__pad = pad; navigator.getGamepads = () => [pad, null, null, null]; })();
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

OPEN = []
# The whole suite with the 3D on: half-size pixels at the same layout, and five times the patience.
FULL = bool(os.environ.get("FULL_PICTURE"))

class Page:
    """A page of the game with helpers that don't wait on real-time play."""
    half = False

    def __init__(self, browser, query="", init=(), viewport=(960, 540), url=None, **ctx):
        OPEN.append(self)
        if FULL:
            query = query.replace("?lite=1&", "?").replace("&lite=1", "").replace("?lite=1", "")
            # Half the window, not emulated half pixels: Chromium's emulation skews pointer positions.
            viewport = (viewport[0] // 2, viewport[1] // 2) if viewport == (960, 540) else viewport
            self.half = True
        self.ctx = browser.new_context(viewport={"width": viewport[0], "height": viewport[1]}, **ctx)
        self.page = self.ctx.new_page()
        self.errors = []
        self.page.on("console", lambda m: self.errors.append(m.text) if m.type == "error" else None)
        self.page.on("pageerror", lambda e: self.errors.append(str(e)))
        for s in init:
            self.page.add_init_script(s)
        self.page.goto(url or (pathlib.Path(GAME).as_uri() + query))

    def status(self):
        t = self.page.evaluate("window.__game ? __game.status() : ''")
        return json.loads(t) if t else {}

    def wait(self, pred, timeout=90, every=0.15, what=""):
        end = time.time() + timeout * (5 if FULL else 1)
        last = {}
        while time.time() < end:
            last = self.status()
            try:
                if last and pred(last):
                    return last
            except (KeyError, TypeError, IndexError):
                pass
            time.sleep(every)
        raise TimeoutError(f"timed out waiting for {what}; last: {json.dumps(last)[:600]}")

    def frames(self, n=3, timeout=60):
        """Wait until n more frames were drawn, so input has been read and acted on."""
        start = self.status().get("frames", 0)
        self.wait(lambda s: s.get("frames", 0) >= start + n * 2, timeout=timeout, what="frames")

    def mmove(self, x, y):
        k = 0.5 if self.half else 1.0
        self.page.mouse.move(x * k, y * k)

    def mclick(self, x, y):
        k = 0.5 if self.half else 1.0
        self.page.mouse.click(x * k, y * k)

    def do(self, obj):
        self.page.evaluate("(j) => __game.do(j)", json.dumps(obj))

    def key(self, k):
        self.page.keyboard.press(k)
        self.frames(2)

    def pad(self, js):
        self.page.evaluate("() => {" + js + "; __pad.timestamp++; }")

    def press(self, b):
        self.pad(f"__pad.buttons[{b}].pressed=true; __pad.buttons[{b}].value=1")
        self.frames(2)
        self.pad(f"__pad.buttons[{b}].pressed=false; __pad.buttons[{b}].value=0")
        self.frames(2)

    def close(self):
        if self in OPEN:
            OPEN.remove(self)
        self.ctx.close()

class Results:
    def __init__(self):
        self.n = 0
    def check(self, name, ok, detail=""):
        print(("PASS " if ok else "FAIL ") + name + ("" if ok else f": {str(detail)[:700]}"), flush=True)
    def run(self, name, fn):
        only = os.environ.get("ONLY_TESTS")
        if only and not any(w in name for w in only.split(",")):
            return
        try:
            fn()
            print("PASS " + name, flush=True)
        except Exception as e:  # a failed step shouldn't stop the rest
            print("FAIL " + name + ": " + str(e)[:900].replace("\n", " "), flush=True)
        for p in list(OPEN):
            try:
                p.close()
            except Exception:
                pass
