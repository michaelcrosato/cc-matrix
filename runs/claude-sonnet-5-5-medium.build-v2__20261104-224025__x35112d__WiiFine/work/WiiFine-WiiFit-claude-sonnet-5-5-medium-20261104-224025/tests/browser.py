#!/usr/bin/env python3
"""Browser tests (Playwright, one Chromium, 320x180, file://). Prints FAIL lines and `RESULT n passed, m failed`.
usage: python3 tests/browser.py [path-to-game.html]"""
import sys, os, json, time, glob
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
cands = sys.argv[1:] or sorted(glob.glob(os.path.join(os.path.dirname(ROOT), "WiiFine-*.html")) + glob.glob(os.path.join(ROOT, "..", "WiiFine-*.html")) + glob.glob(os.path.join(ROOT, "out", "test.html")))
PAGE = os.path.abspath(cands[0]) if cands else None
passed = failed = 0
FLAGS = ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-vulkan=swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"]
PAD = """
(() => {
const btn = () => ({ pressed: false, touched: false, value: 0 });
const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 1, axes: [0,0,0,0], buttons: Array.from({length: 17}, btn) };
window.__padOn = false;
navigator.getGamepads = () => window.__padOn ? [pad, null, null, null] : [null, null, null, null];
window.__setPad = (axes, pressed) => { window.__padOn = true; pad.axes = axes; pad.timestamp++; pad.buttons.forEach((b, i) => { const on = pressed.includes(i); b.pressed = on; b.touched = on; b.value = on ? 1 : 0; }); };
})();
"""

def check(name, ok, info=""):
    global passed, failed
    if ok: passed += 1
    else:
        failed += 1
        print(f"FAIL {name} {info}")

def status(page):
    try:
        return json.loads(page.evaluate("window.__gameStatus || 'null'")) or {}
    except Exception:
        return {}

def wait_status(page, timeout=60):
    t0 = time.time()
    while time.time() - t0 < timeout:
        s = status(page)
        if s.get("screen"): return s
        time.sleep(0.25)
    return {}

def wait_for(page, cond, timeout=20):
    t0 = time.time()
    while time.time() - t0 < timeout:
        s = status(page)
        if cond(s): return s
        time.sleep(0.2)
    return status(page)

def open_page(pw, w=320, h=180, init=None, args=None, ctx_args=None):
    b = pw.chromium.launch(headless=True, args=FLAGS + (args or []))
    ctx = b.new_context(viewport={"width": w, "height": h}, **(ctx_args or {}))
    ctx.add_init_script(PAD)
    if init: ctx.add_init_script(init)
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto("file://" + PAGE)
    return b, page, errors

def main():
    if not PAGE or not os.path.exists(PAGE):
        print("FAIL no game page found"); print("RESULT 0 passed, 1 failed"); return
    with sync_playwright() as pw:
        b, page, errors = open_page(pw)
        try:
            s = wait_status(page, 90)
            page.keyboard.press("Shift")  # any input resets the idle clock (the page may have waited a while)
            check("boots and publishes status", bool(s), "no __gameStatus")
            t0 = s.get("tick", 0); s2 = wait_for(page, lambda x: x.get("tick", 0) > t0, 8)
            check("the tick advances", s2.get("tick", 0) > t0, f"{t0} -> {s2.get('tick')}")
            check("starts on the title", s.get("screen") == "Title", s.get("screen"))
            check("music defaults to 10%", abs(s.get("settings", {}).get("music", 0) - 0.10) < 1e-6, s.get("settings"))
            # keyboard: Space activates New Stay -> guest select
            page.keyboard.press("Space"); s = wait_for(page, lambda s: s.get("screen") == "Guests")
            check("keyboard confirms", s.get("screen") == "Guests", s.get("screen"))
            page.keyboard.press("Escape"); s = wait_for(page, lambda s: s.get("screen") == "Title")
            check("keyboard backs out", s.get("screen") == "Title", s.get("screen"))
            # keyboard focus moves: Down twice then Space opens Play Together setup
            def ui_now(cond, timeout=8):
                t0 = time.time(); ui = {}
                while time.time() - t0 < timeout:
                    ui = json.loads(page.evaluate("window.__gameUi || '{}'") or "{}")
                    if cond(ui): break
                    time.sleep(0.3)
                return ui
            ui = ui_now(lambda u: any(l == "Settings" for _, l in u.get("rects", [])))
            check("ui rects are published", len(ui.get("rects", [])) >= 4, str(ui)[:100])
            # mouse hover and click on Settings
            rects = {lab: r for r, lab in ui.get("rects", [])}
            if "Settings" in rects:
                x0, y0, x1, y1 = rects["Settings"]
                page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2); time.sleep(0.3)
                page.mouse.click((x0 + x1) / 2, (y0 + y1) / 2)
                s = wait_for(page, lambda s: s.get("screen") == "Settings")
                check("mouse click activates", s.get("screen") == "Settings", s.get("screen"))
            else:
                check("settings item present", False, str(rects.keys()))
            # glyph prompts follow the device
            ui = ui_now(lambda u: any(g in ("Space", "Esc") for g in u.get("glyphs", [])))
            check("keyboard prompts show keys", any(g in ("Space", "Esc") for g in ui.get("glyphs", [])), str(ui.get("glyphs")))
            # pad: Cross / Circle
            page.evaluate("window.__setPad([0,0,0,0], [])"); time.sleep(1.0)
            page.evaluate("window.__setPad([0,0,0,0], [1])"); time.sleep(0.9); page.evaluate("window.__setPad([0,0,0,0], [])")  # Circle: back
            s = wait_for(page, lambda s: s.get("screen") == "Title")
            check("pad Circle backs out", s.get("screen") == "Title", s.get("screen"))
            ui = ui_now(lambda u: any(g in ("Cross", "Circle") for g in u.get("glyphs", [])))
            check("pad prompts show PlayStation glyphs", any(g in ("Cross", "Circle") for g in ui.get("glyphs", [])), str(ui.get("glyphs")))
            page.evaluate("window.__setPad([0,0,0,0.9], [])"); time.sleep(0.35); page.evaluate("window.__setPad([0,0,0,0], [])")
            page.evaluate("window.__setPad([0,0,0,0], [0])"); time.sleep(0.25); page.evaluate("window.__setPad([0,0,0,0], [])")
            time.sleep(0.5)
            check("no console errors", not errors, "; ".join(errors[:3]))
        finally:
            b.close()
        # attract mode: 10 s idle on the title, any input exits
        b, page, errors = open_page(pw)
        try:
            wait_status(page, 90)
            s = wait_for(page, lambda s: s.get("screen") == "Attract", 40)
            check("attract starts after idle", s.get("screen") in ("Attract", "Play"), s.get("screen"))
            check("attract shows the demo ribbon", s.get("demo") is True, str(s.get("demo")))
            page.keyboard.press("Space")
            s = wait_for(page, lambda s: s.get("screen") == "Title", 10)
            check("any input exits attract", s.get("screen") == "Title", s.get("screen"))
        finally:
            b.close()
        # touch: phone profile shows the card and attract runs; Settings by tap
        for dev in ("iPhone 13", "iPad (gen 7)"):
            d = pw.devices.get(dev)
            if not d: continue
            b = pw.chromium.launch(headless=True, args=FLAGS)
            dd = {k: v for k, v in d.items() if k not in ("default_browser_type",)}
            dd["viewport"] = {"width": 360, "height": 200}
            dd["screen"] = {"width": 360, "height": 200}
            ctx = b.new_context(**dd)
            page = ctx.new_page(); errs = []
            page.on("pageerror", lambda e: errs.append(str(e)))
            page.goto("file://" + PAGE)
            try:
                s = wait_status(page, 90)
                check(f"{dev}: boots", bool(s), "no status")
                s = wait_for(page, lambda s: s.get("touch_only") is True, 10)
                check(f"{dev}: touch-only card", s.get("touch_only") is True, str(s.get("touch_only")))
                s = wait_for(page, lambda s: s.get("screen") in ("Attract", "Play"), 40)
                check(f"{dev}: attract runs", s.get("screen") in ("Attract", "Play"), s.get("screen"))
            finally:
                b.close()
        # WebKit with an iPhone profile has no WebGPU here: the page's own message must say both things
        d = pw.devices.get("iPhone 13")
        if d:
            b = pw.webkit.launch()
            dd = {k: v for k, v in d.items() if k not in ("default_browser_type",)}
            page = b.new_context(**dd).new_page()
            page.goto("file://" + PAGE)
            time.sleep(3)
            txt = page.inner_text("body")
            check("WebKit iPhone: says Controller or keyboard required", "Controller or keyboard required" in txt, txt[:120])
            check("WebKit iPhone: says it needs WebGPU", "WebGPU" in txt, txt[:120])
            b.close()
    print(f"RESULT {passed} passed, {failed} failed")

main()
