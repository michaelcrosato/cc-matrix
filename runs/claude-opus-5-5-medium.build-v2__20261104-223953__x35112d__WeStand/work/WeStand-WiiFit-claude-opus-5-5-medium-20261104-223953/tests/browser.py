#!/usr/bin/env python3
"""Browser checks on the final page, on file://, in one small window. Prints failures only."""
import json, pathlib, sys, time
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
NAME = ROOT.name
PAGE = (ROOT.parent / f"{NAME}.html").resolve().as_uri()
ARGS = ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-vulkan=swiftshader", "--use-angle=swiftshader"]
results = []
def check(name, ok, detail=""):
    results.append(bool(ok))
    if not ok:
        print(f"FAIL {name} {detail}", flush=True)
STUB = """
const btn = () => ({ pressed: false, touched: false, value: 0 });
const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 1,
              axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn) };
navigator.getGamepads = () => [pad, null, null, null];
window.__setPad = (axes, pressed) => { pad.axes = axes; pad.timestamp++; pad.buttons.forEach((b, i) => { const on = pressed.includes(i); b.pressed = on; b.touched = on; b.value = on ? 1 : 0; }); };
"""
SOUND = """
window.__sound = { rms: 0, n: 0, peak: 0, buffers: 0 };
const start = AudioBufferSourceNode.prototype.start;
AudioBufferSourceNode.prototype.start = function (...a) {
  const d = this.buffer && this.buffer.getChannelData(0);
  if (d) { let s = 0, p = 0; for (let i = 0; i < d.length; i += 4) { s += d[i] * d[i]; p = Math.max(p, Math.abs(d[i])); }
           const w = window.__sound; w.rms += s; w.n += Math.ceil(d.length / 4); w.peak = Math.max(w.peak, p); w.buffers++; }
  return start.apply(this, a);
};
"""
def status(page):
    s = page.evaluate("window.__gameStatus || null")
    return json.loads(s) if s else {}
def wait_status(page, pred, secs=30, note=""):
    t0 = time.time()
    last = {}
    while time.time() - t0 < secs:
        last = status(page)
        try:
            if last and pred(last):
                return last
        except Exception:
            pass
        page.wait_for_timeout(100)
    return None
def open_page(ctx, errors, wh=None):
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "GPU stall" not in m.text and "powerPreference" not in m.text else None)
    page.goto(PAGE)
    return page
def main():
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        # --- keyboard, mouse, attract, sound
        ctx = b.new_context(viewport={"width": 320, "height": 180})
        ctx.add_init_script(SOUND)
        errors = []
        page = open_page(ctx, errors)
        s = wait_status(page, lambda x: x.get("screen") == "title", 90)
        check("boots to the title", s, json.dumps(status(page))[:300])
        check("no errors at boot", not errors, errors[:3])
        t0 = status(page).get("tick", 0)
        check("the tick advances", wait_status(page, lambda x: x.get("tick", 0) > t0, 10))
        check("music defaults to 10%", abs(status(page).get("music", 0) - 0.10) < 1e-6)
        check("not a hub session", page.evaluate("!(window.AIHub && AIHub.active)"))
        # keyboard moves focus and confirms
        page.keyboard.press("ArrowDown")
        check("keyboard moves focus", wait_status(page, lambda x: x.get("focus") == 1, 10), status(page).get("focus"))
        page.keyboard.press("ArrowUp")
        wait_status(page, lambda x: x.get("focus") == 0, 10)
        # mouse: hover moves focus, click activates
        rects = page.evaluate("window.__gameUi || []")
        check("the UI publishes item rects", len(rects) >= 3, rects)
        if len(rects) >= 3:
            r = rects[2]
            page.mouse.move((r["x0"] + r["x1"]) / 2, (r["y0"] + r["y1"]) / 2)
            check("hover moves focus", wait_status(page, lambda x: x.get("focus") == 2, 10), status(page).get("focus"))
            # item 2: Settings (no save yet, so: New Stay, Together, Settings, About)
            page.mouse.down(); page.wait_for_timeout(60); page.mouse.up()
            s = wait_status(page, lambda x: x.get("screen") == "settings", 10)
            check("click activates", s, status(page).get("screen"))
            page.keyboard.press("Escape")
            wait_status(page, lambda x: x.get("screen") == "title", 10)
        # sound reaches the buffers after a real input
        page.wait_for_timeout(1500)
        snd = page.evaluate("window.__sound")
        check("audio runs after a click", snd["buffers"] > 0, snd)
        rms = (snd["rms"] / max(1, snd["n"])) ** 0.5
        check("music at about 10%", 0.0005 < rms < 0.09, rms)
        # attract after 10 s, any input exits
        page.mouse.move(1, 1)
        t = time.time()
        s = wait_status(page, lambda x: x.get("screen") == "attract", 120)
        check("attract starts after 10 s", s and time.time() - t > 7, time.time() - t)
        page.wait_for_timeout(500)
        page.keyboard.press("Space")
        s = wait_status(page, lambda x: x.get("screen") == "title" and x.get("attract") is None, 15)
        check("any input exits attract", s, str(status(page))[:200])
        # Prompts follow the device; Settings has the Xbox option.
        wait_status(page, lambda x: x.get("screen") == "title", 10)
        page.keyboard.press("ArrowDown"); page.wait_for_timeout(2500)
        page.keyboard.press("ArrowUp"); page.wait_for_timeout(2500)
        check("prompts show keys after a key", page.evaluate("window.__gamePrompts") == "keyboard", page.evaluate("window.__gamePrompts"))
        page.mouse.move(150, 90); page.wait_for_timeout(600); page.mouse.move(170, 100); page.wait_for_timeout(2500)
        check("prompts show the mouse after it moves", page.evaluate("window.__gamePrompts") == "mouse", page.evaluate("window.__gamePrompts"))
        # The pointer rests on a row: keys still move the focus, back to New Stay.
        for _ in range(4):
            if status(page).get("focus") == 0:
                break
            page.keyboard.press("ArrowUp"); wait_status(page, lambda x: x.get("focus") == 0, 3)
        check("keys move focus under a resting pointer", status(page).get("focus") == 0, status(page).get("focus"))
        check("no errors after play", not errors, errors[:3])
        # A stay from the keyboard: New Stay to the Morning Check, then it is saved and continues.
        def key(k, pred, name, secs=20):
            t0 = time.time()
            while time.time() - t0 < secs:
                page.keyboard.press(k)
                if wait_status(page, pred, 2.5):
                    return True
            check(name, False, str(status(page))[:200])
            return False
        ok = key("Enter", lambda x: x.get("screen") == "slots", "Enter opens New Stay")
        ok = ok and key("Space", lambda x: x.get("screen") == "name", "a slot opens the names")
        ok = ok and key("Space", lambda x: x.get("screen") == "look", "a name opens the looks")
        # Polled: two taps inside one slow frame count as one.
        for want in (1, 2):
            page.keyboard.press("ArrowDown")
            if not wait_status(page, lambda x, w=want: x.get("focus") == w, 8):
                page.keyboard.press("ArrowDown")
                wait_status(page, lambda x, w=want: x.get("focus") == w, 8)
        ok = ok and key("Space", lambda x: x.get("mode") == "Check" or x.get("screen") == "dialog", "Check In begins the stay")
        ok = ok and key("Space", lambda x: x.get("mode") == "Check", "the dialogue leads to the Morning Check", 60)
        check("a keyboard stay reaches the Morning Check", ok)
        saved = page.evaluate("localStorage.getItem('we-stand-save-1')")
        check("the stay is saved", saved and '"name"' in saved, (saved or "")[:120])
        page.reload()
        s = wait_status(page, lambda x: x.get("screen") == "title", 90)
        wait_status(page, lambda x: x.get("tick", 0) > 5, 20)
        page.keyboard.press("ArrowDown")
        wait_status(page, lambda x: x.get("focus") == 1, 10)
        ok2 = key("Enter", lambda x: x.get("screen") == "slots", "Continue lists the guest")
        ok2 = ok2 and key("Space", lambda x: x.get("day") == 1 and x.get("screen") in ("dialog", "island", "check"), "Continue resumes the stay")
        check("a saved stay continues after a reload", ok2)
        check("no errors in a stay", not errors, errors[:3])
        ctx.close()
        # --- controller
        ctx = b.new_context(viewport={"width": 320, "height": 180})
        ctx.add_init_script(STUB)
        errors = []
        page = open_page(ctx, errors)
        wait_status(page, lambda x: x.get("screen") == "title", 90)
        def pad(button, pred, name):
            page.evaluate(f"window.__setPad([0,0,0,0],[{button}])")
            s = wait_status(page, pred, 12)
            page.evaluate("window.__setPad([0,0,0,0],[])")
            check(name, s, str(status(page))[:160])
            page.wait_for_timeout(1500)
        pad(13, lambda x: x.get("focus") == 1, "D-pad moves focus")
        pad(12, lambda x: x.get("focus") == 0, "D-pad moves focus back")
        pad(0, lambda x: x.get("screen") == "slots", "Cross confirms")
        pad(1, lambda x: x.get("screen") == "title", "Circle backs")
        # a stick pushes the menu too, and starts the game
        check("prompts show PlayStation on a pad", page.evaluate("window.__gamePrompts") == "playstation", page.evaluate("window.__gamePrompts"))
        # Settings, Glyphs: the Xbox option swaps them. New Stay, Together, Settings.
        pad(13, lambda x: x.get("focus") == 1, "down to Together")
        pad(13, lambda x: x.get("focus") == 2, "down to Settings")
        pad(0, lambda x: x.get("screen") == "settings", "Settings opens by pad")
        for want in (1, 2, 3):
            pad(13, lambda x, w=want: x.get("focus") == w, f"down to row {want}")
        pad(0, lambda x: x.get("xbox") is True, "the Xbox glyph option")
        page.wait_for_timeout(2500)
        check("prompts show Xbox glyphs", page.evaluate("window.__gamePrompts") == "xbox", page.evaluate("window.__gamePrompts"))
        check("no errors with a pad", not errors, errors[:3])
        ctx.close()
        # --- touch-only: phone and tablet
        for name in ["Pixel 7", "iPad Pro 11"]:
            dev = dict(p.devices[name])
            dev.pop("default_browser_type", None)
            dev["viewport"] = {"width": 320, "height": 180}
            ctx = b.new_context(**dev)
            errors = []
            page = open_page(ctx, errors)
            s = wait_status(page, lambda x: x.get("touch_only") is True and x.get("attract") is not None, 120)
            check(f"{name}: touch-only runs attract with the card", s, status(page))
            if s:
                page.wait_for_timeout(2500)
                rects = page.evaluate("window.__gameUi || []")
                btn = [r for r in rects if r["id"] == 900]
                check(f"{name}: a Settings button", btn, rects)
                if btn:
                    r = btn[0]
                    page.touchscreen.tap((r["x0"] + r["x1"]) / 2, (r["y0"] + r["y1"]) / 2)
                    s = wait_status(page, lambda x: x.get("screen") == "settings", 15)
                    check(f"{name}: Settings opens by tap", s, status(page).get("screen"))
            check(f"{name}: no errors", not errors, errors[:3])
            ctx.close()
        b.close()
        # --- WebKit: no WebGPU here: the page's own message says both things
        wk = p.webkit.launch()
        dev = dict(p.devices["iPhone 14"])
        dev.pop("default_browser_type", None)
        ctx = wk.new_context(**dev)
        page = ctx.new_page()
        page.goto(PAGE)
        page.wait_for_timeout(1500)
        text = page.evaluate("document.body.innerText")
        check("iPhone: says a controller or keyboard is required", "Controller or keyboard required" in text, text[:200])
        check("iPhone: says WebGPU is needed", "WebGPU" in text, text[:200])
        wk.close()
    print(f"{sum(results)} passed, {len(results) - sum(results)} failed")
    return 0 if all(results) else 1
sys.exit(main())
