#!/usr/bin/env python3
"""Browser and engine-capture checks for the packed Wobble Minutes page."""

import os
import subprocess
import sys
from pathlib import Path

os.environ.setdefault("PLAYWRIGHT_HOST_PLATFORM_OVERRIDE", "ubuntu24.04-x64")

DEV = Path(__file__).resolve().parents[1]
WORK = DEV.parent
HTML = WORK / "Wobble Minutes-Wii Fit-grok-4.7-xhigh-20261104-222132.html"
SCRATCH = Path("/home/micha/dev/cc-matrix/runs/grok-xhigh.build-v2__20261104-222132__x35112d/tmp/grok-goal-b3947fd4d9d9/implementer")
ENGINE = DEV / "engine"
FLAGS = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-vulkan=swiftshader",
    "--use-angle=swiftshader",
    # Headless Chromium pauses animation frames unless these are set, so the sim clock stops.
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--disable-dev-shm-usage",
]
PAD = """
const btn = () => ({ pressed: false, touched: false, value: 0 });
const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 1,
              axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, btn) };
navigator.getGamepads = () => [pad, null, null, null];
window.__setPad = (axes, pressed) => { pad.axes = axes; pad.timestamp++; pad.buttons.forEach((b, i) => { const on = pressed.includes(i); b.pressed = on; b.touched = on; b.value = on ? 1 : 0; }); };
"""
AUDIO = """
window.__fitAudio = [];
const proto = window.AudioBufferSourceNode && AudioBufferSourceNode.prototype;
if (proto && !proto.__fitPatched) {
  const orig = proto.start;
  proto.start = function () {
    try {
      const data = this.buffer && this.buffer.getChannelData(0);
      if (data && data.length) {
        let s = 0;
        const n = Math.min(data.length, 4800);
        for (let i = 0; i < n; i++) s += data[i] * data[i];
        window.__fitAudio.push(Math.sqrt(s / n));
      }
    } catch (e) {}
    return orig.apply(this, arguments);
  };
  proto.__fitPatched = true;
}
"""


def fail(msg):
    print(msg)
    return False


def status(page):
    return page.evaluate(
        """() => {
          const raw = window.__gameStatus;
          if (!raw) return null;
          try { return JSON.parse(String(raw)); } catch (e) { return { parse: String(e) }; }
        }"""
    )


def wait_status(page, ms=90000):
    page.wait_for_function("() => window.__gameStatus", timeout=ms)
    return status(page)


def surface_ok(page):
    box = page.evaluate(
        """() => {
          const c = document.querySelector('canvas');
          if (!c) return null;
          return { w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight };
        }"""
    )
    if not box:
        return fail("no canvas")
    vp = page.viewport_size
    if abs(box["cw"] - vp["width"]) > 2 or abs(box["ch"] - vp["height"]) > 2:
        return fail(f"canvas css {box} != viewport {vp}")
    if abs(box["w"] - vp["width"]) > 2 or abs(box["h"] - vp["height"]) > 2:
        return fail(f"drawing buffer {box} != viewport {vp}")
    return True


def item_center(page, label_part):
    return page.evaluate(
        """(part) => {
          const items = window.__gameUi || [];
          const it = items.find((i) => String(i.label).toLowerCase().includes(part));
          if (!it) return null;
          return { x: it.x + it.w / 2, y: it.y + it.h / 2, label: it.label, id: it.id };
        }""",
        label_part,
    )


def focused_label(page):
    return page.evaluate(
        """() => {
          const raw = window.__gameStatus;
          if (!raw) return '';
          let s;
          try { s = JSON.parse(String(raw)); } catch (e) { return ''; }
          const items = window.__gameUi || [];
          const it = items[s.menu_focus];
          return it ? String(it.label) : '';
        }"""
    )


def wait_status_pred(page, pred, ms=2000, step=100):
    elapsed = 0
    last = status(page)
    while elapsed <= ms:
        if last and pred(last):
            return last
        page.wait_for_timeout(step)
        elapsed += step
        last = status(page)
    return last


def click_label(page, part):
    """Move onto a published row, wait until hover selects it, then click."""
    target = item_center(page, part)
    if not target:
        return None
    page.mouse.move(target["x"], target["y"])
    elapsed = 0
    while elapsed <= 1500:
        if part.lower() in focused_label(page).lower():
            break
        page.wait_for_timeout(100)
        elapsed += 100
        target = item_center(page, part) or target
        page.mouse.move(target["x"], target["y"])
    page.mouse.click(target["x"], target["y"])
    return target


def boot_checks(page, errors):
    s = wait_status(page)
    if s.get("phase") != "title":
        return fail(f"boot phase {s.get('phase')}")
    if s.get("prompt") != "Cross":
        return fail(f"boot prompt {s.get('prompt')}")
    if abs(float(s.get("music", 1)) - 0.10) > 1e-6:
        return fail(f"music {s.get('music')}")
    tick = page.evaluate("() => Number(window.__gameStatus.tick)")
    tick2 = tick
    # Shader compile and a busy machine can stall the first frames. The clock still has to move.
    for _ in range(60):
        page.wait_for_timeout(200)
        tick2 = page.evaluate("() => Number(window.__gameStatus.tick)")
        if tick2 > tick:
            break
    if not (tick2 > tick):
        return fail(f"tick did not advance {tick} -> {tick2}")
    if not surface_ok(page):
        return False
    seen = page.evaluate(
        """() => {
          const pads = navigator.getGamepads ? navigator.getGamepads() : [];
          const pad = pads && pads[0];
          return !!(pad && pad.connected && pad.buttons && pad.buttons.length > 13);
        }"""
    )
    if not seen:
        return fail("gamepad stub is not visible to getGamepads")
    page.evaluate("() => window.__setPad([0,0,0,0], [13])")
    base_tick = (status(page) or {}).get("tick") or 0
    s = None
    # Hold D-pad down until a sim tick actually samples it. A stalled frame is not a miss.
    for _ in range(40):
        page.wait_for_timeout(200)
        s = status(page)
        if s and s.get("menu_focus") == 1:
            break
        if s and (s.get("tick") or 0) > base_tick + 40:
            break
    page.evaluate("() => window.__setPad([0,0,0,0], [])")
    if not s or s.get("menu_focus") != 1:
        return fail(f"pad did not move focus: {None if not s else s.get('menu_focus')} prompt {None if not s else s.get('prompt')}")
    if s.get("prompt") != "Cross":
        return fail(f"pad prompt {s.get('prompt')}")
    page.keyboard.down("ArrowDown")
    s = wait_status_pred(page, lambda st: st.get("prompt") == "Space" and st.get("menu_focus") == 2, ms=2000)
    page.keyboard.up("ArrowDown")
    if not s or s.get("prompt") != "Space":
        return fail(f"keyboard prompt {None if not s else s.get('prompt')}")
    if s.get("menu_focus") != 2:
        return fail(f"keyboard focus {s.get('menu_focus')}")
    page.mouse.move(8, 8)
    page.wait_for_timeout(80)
    page.mouse.move(40, 30)
    s = wait_status_pred(page, lambda st: st.get("prompt") == "Click", ms=2000)
    if not s or s.get("prompt") != "Click":
        return fail(f"mouse prompt {None if not s else s.get('prompt')}")
    if not click_label(page, "settings"):
        return fail(f"no settings rect {page.evaluate('() => window.__gameUi')}")
    if "settings" not in focused_label(page).lower():
        return fail(f"hover landed on {focused_label(page)!r}")
    s = wait_status_pred(page, lambda st: st.get("phase") == "settings", ms=2000)
    if not s or s.get("phase") != "settings":
        return fail(f"click did not open settings: {None if not s else s.get('phase')} focus {None if not s else s.get('menu_focus')}")
    if not click_label(page, "glyph"):
        return fail("settings has no Xbox glyph row")
    s = wait_status_pred(page, lambda st: st.get("xbox") is True, ms=2000)
    if not s or s.get("xbox") is not True:
        return fail(f"xbox toggle {None if not s else s.get('xbox')} focus {None if not s else s.get('menu_focus')} label {focused_label(page)!r}")
    if not click_label(page, "back"):
        return fail("no back rect")
    s = wait_status_pred(page, lambda st: st.get("phase") == "title", ms=2000)
    if not s or s.get("phase") != "title":
        return fail(f"back did not return to title: {None if not s else s.get('phase')}")
    # A cursor left on a row keeps the lean past the wake threshold, so attract never arms.
    vp = page.viewport_size
    page.mouse.move(vp["width"] / 2, vp["height"] / 2)
    attracted = False
    for _ in range(90):
        page.wait_for_timeout(500)
        s = status(page)
        if s.get("phase") == "attract" or s.get("demo") is True:
            attracted = True
            break
    if not attracted:
        return fail(f"attract did not start: {status(page)}")
    left = False
    s = status(page)
    for _ in range(8):
        page.keyboard.press("Space")
        s = wait_status_pred(page, lambda st: st.get("phase") != "attract" and st.get("demo") is not True, ms=500)
        if s and s.get("phase") != "attract" and s.get("demo") is not True:
            left = True
            break
    if not left:
        return fail(f"input did not leave attract: {None if not s else s.get('phase')} demo {None if not s else s.get('demo')}")
    heard = False
    for _ in range(8):
        page.wait_for_timeout(250)
        heard = page.evaluate("() => (window.__fitAudio || []).some((n) => n > 0.0001)")
        if heard:
            break
    if not heard:
        return fail("no audible buffer after the gesture")
    if errors:
        return fail("page errors: " + " | ".join(errors[:8]))
    return True


def open_page(browser, viewport):
    context = browser.new_context(viewport=viewport, device_scale_factor=1)
    page = context.new_page()
    errors = []
    page.add_init_script(PAD + AUDIO)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    page.goto(HTML.as_uri())
    return context, page, errors


def touch_profile(browser, playwright, device_name, viewport=None):
    device = dict(playwright.devices[device_name])
    # Software WebGPU cannot keep sim time at a phone's device pixel ratio.
    device["device_scale_factor"] = 1
    if viewport:
        device["viewport"] = viewport
    context = browser.new_context(**device)
    try:
        page = context.new_page()
        page.add_init_script(PAD + AUDIO)
        page.on("pageerror", lambda e: None)
        page.goto(HTML.as_uri(), wait_until="domcontentloaded")
        page.wait_for_selector("#need", state="visible", timeout=20000)
        text = page.locator("#need").inner_text()
        if "Controller or keyboard required" not in text:
            return fail(f"{device_name} card text {text!r}")
        attracted = False
        base_tick = (status(page) or {}).get("tick") or 0
        # Software WebGPU on a tablet canvas runs well under 60. Attract is 600 sim ticks.
        for _ in range(200):
            page.wait_for_timeout(500)
            s = status(page)
            if s and (s.get("phase") == "attract" or s.get("demo") is True):
                attracted = True
                break
            if s and (s.get("tick") or 0) > base_tick + 800:
                break
        if not attracted:
            return fail(f"{device_name} attract did not keep running: {status(page)}")
        box = page.locator("#need-settings").bounding_box()
        if not box:
            return fail(f"{device_name} settings button has no box")
        page.touchscreen.tap(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        s = wait_status_pred(page, lambda st: st and st.get("phase") == "settings", ms=2000)
        if not s or s.get("phase") != "settings":
            return fail(f"{device_name} settings tap -> {s}")
        return True
    finally:
        context.close()


def webkit_fallback(playwright):
    browser = playwright.webkit.launch(headless=True)
    device = playwright.devices["iPhone 13"]
    context = browser.new_context(**device)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(HTML.as_uri(), wait_until="domcontentloaded")
    page.wait_for_timeout(500)
    text = page.locator("body").inner_text()
    browser.close()
    if "Controller or keyboard required" not in text or "needs WebGPU" not in text:
        return fail(f"webkit fallback text: {text[:400]!r}")
    return True


def stddev(path):
    out = subprocess.check_output(
        ["magick", "identify", "-format", "%[fx:standard_deviation]", str(path)],
        text=True,
    )
    return float(out.strip() or "0")


def captures():
    shots = []
    specs = [("title", "fit", "30"), ("pose", "fit/event/pose", "420")]
    for name, scene, ticks in specs:
        pair = []
        for i in (1, 2):
            dest = SCRATCH / f"capture-{name}-{i}.png"
            cmd = [
                "cargo", "run", "-q", "--offline", "--locked", "-p", "pav_tools", "--bin", "pav", "--",
                "capture", f"scene={scene}", f"ticks={ticks}", "width=1920", "height=1080", f"out={dest}",
            ]
            proc = subprocess.run(cmd, cwd=ENGINE, text=True, capture_output=True, env={**os.environ, "CARGO_BUILD_JOBS": "8"})
            if proc.returncode != 0:
                (SCRATCH / "launch-error.log").write_text(proc.stdout + "\n" + proc.stderr, encoding="utf-8")
                return fail(f"capture {name} failed to start\n{proc.stderr[-800:]}")
            if not dest.is_file() or dest.stat().st_size < 1000:
                return fail(f"capture {name} missing {dest}")
            dev = stddev(dest)
            if dev < 0.02:
                return fail(f"capture {name}-{i} looks blank, stddev {dev}")
            pair.append(dev)
        if abs(pair[0] - pair[1]) > 0.05:
            return fail(f"{name} captures disagree {pair}")
        shots.append((name, pair))
    return True


def main():
    SCRATCH.mkdir(parents=True, exist_ok=True)
    if not HTML.is_file():
        (SCRATCH / "launch-error.log").write_text(f"missing {HTML}\n", encoding="utf-8")
        print(f"missing packed page {HTML}")
        return 1
    passed = 0
    failed = 0

    def check(ok):
        nonlocal passed, failed
        if ok:
            passed += 1
        else:
            failed += 1

    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=FLAGS)
        for n in (1, 2):
            context, page, errors = open_page(browser, {"width": 320, "height": 180})
            try:
                check(boot_checks(page, errors))
            except Exception as e:
                print(f"boot {n}: {e}")
                failed += 1
            context.close()
        browser.close()
        for device_name, tag in (("iPhone 13", "iphone"), ("iPad (gen 7)", "ipad")):
            touch_browser = p.chromium.launch(headless=True, args=FLAGS)
            try:
                try:
                    check(touch_profile(touch_browser, p, device_name))
                except Exception as e:
                    print(f"{tag}: {e}")
                    try:
                        touch_browser.close()
                    except Exception:
                        pass
                    touch_browser = p.chromium.launch(headless=True, args=FLAGS)
                    vp = p.devices[device_name]["viewport"]
                    # The GPU process dies at the full tablet framebuffer under software WebGPU.
                    small = {"width": max(360, vp["width"] // 2), "height": max(480, vp["height"] // 2)}
                    print(f"{tag}: retry at {small['width']}x{small['height']}")
                    try:
                        check(touch_profile(touch_browser, p, device_name, small))
                    except Exception as e2:
                        print(f"{tag} retry: {e2}")
                        failed += 1
            finally:
                touch_browser.close()
        try:
            check(webkit_fallback(p))
        except Exception as e:
            print(f"webkit: {e}")
            failed += 1
    try:
        check(captures())
    except Exception as e:
        (SCRATCH / "launch-error.log").write_text(str(e), encoding="utf-8")
        print(f"capture: {e}")
        failed += 1
    print(f"{passed} passed, {failed} failed")
    return 0 if failed == 0 and passed else 1


if __name__ == "__main__":
    sys.exit(main())
