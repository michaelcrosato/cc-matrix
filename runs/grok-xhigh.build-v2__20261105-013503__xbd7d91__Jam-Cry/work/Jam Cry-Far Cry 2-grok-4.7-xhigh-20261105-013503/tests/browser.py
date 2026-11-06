#!/usr/bin/env python3
"""Drive the packed Jam Cry page. Prints FAIL lines and one CHECKS line."""
import struct
import sys
import zlib
from collections import Counter
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parent.parent
WORK = DEV.parent
HTML = WORK / "Jam Cry-Far Cry 2-grok-4.7-xhigh-20261105-013503.html"
LOGS = DEV / "test-logs"
GPU = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-vulkan=swiftshader",
    "--use-angle=swiftshader",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
]
FAILS = []
CHECKS = 0


def check(ok, detail):
    global CHECKS
    CHECKS += 1
    if not ok:
        FAILS.append(detail)
        print(f"FAIL: {detail}", flush=True)


def finish():
    print(f"CHECKS {CHECKS}")
    return 1 if FAILS else 0


def png_samples(data, step=24):
    pos = 8
    w = h = color = 0
    raw = b""
    while pos + 8 <= len(data):
        n = struct.unpack(">I", data[pos:pos + 4])[0]
        kind = data[pos + 4:pos + 8]
        chunk = data[pos + 8:pos + 8 + n]
        pos += 12 + n
        if kind == b"IHDR":
            w, h, _depth, color = struct.unpack(">IIBB", chunk[:10])
        elif kind == b"IDAT":
            raw += chunk
        elif kind == b"IEND":
            break
    dec = zlib.decompress(raw)
    bpp = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[color]
    stride = w * bpp
    i = 0
    prev = bytearray(stride)
    colors = []
    for y in range(h):
        filt = dec[i]
        i += 1
        row = bytearray(dec[i:i + stride])
        i += stride
        for x in range(stride):
            left = row[x - bpp] if x >= bpp else 0
            up = prev[x]
            ul = prev[x - bpp] if x >= bpp else 0
            if filt == 1:
                row[x] = (row[x] + left) & 255
            elif filt == 2:
                row[x] = (row[x] + up) & 255
            elif filt == 3:
                row[x] = (row[x] + ((left + up) // 2)) & 255
            elif filt == 4:
                p = left + up - ul
                pa, pb, pc = abs(p - left), abs(p - up), abs(p - ul)
                pred = left if pa <= pb and pa <= pc else up if pb <= pc else ul
                row[x] = (row[x] + pred) & 255
        prev = row
        if y % step == 0:
            for x in range(0, w, step):
                o = x * bpp
                colors.append((row[o], row[min(o + 1, stride - 1)], row[min(o + 2, stride - 1)]))
    return colors


def varied(png_bytes):
    colors = png_samples(png_bytes)
    top = Counter(colors).most_common(1)[0][1]
    return top / max(1, len(colors)) < 0.92


def hook_url():
    return HTML.as_uri() + "?test=1&nodraw=1"


def wait_game(page, ms=120000):
    page.wait_for_function("() => window.__game && window.__game.ui && window.__game.status", timeout=ms)


def push(page, cmd):
    page.evaluate("(c) => window.gameTest.queue.push(c)", cmd)


def wait_ui(page, expr, ms=8000):
    page.wait_for_function(
        "() => { try { const u = JSON.parse(window.__game.ui); const s = JSON.parse(window.__game.status); return (" + expr + "); } catch (e) { return false; } }",
        timeout=ms,
    )


def launch_once(pw, index, width, height):
    out = LOGS / f"launch-{index}.png"
    errors = []
    browser = pw.chromium.launch(headless=True, args=GPU)
    try:
        context = browser.new_context(viewport={"width": width, "height": height}, device_scale_factor=1)
        page = context.new_page()
        page.on("pageerror", lambda e: errors.append("pageerror " + str(e)))
        page.on("console", lambda m: errors.append("console " + m.text) if m.type == "error" else None)
        page.goto(HTML.as_uri())
        title = page.locator("h1").inner_text()
        check(title == "Jam Cry", f"launch {index} title before wasm is {title!r}")
        page.wait_for_selector("canvas", timeout=180000)
        page.wait_for_function(
            """() => {
                const c = document.querySelector('canvas');
                return c && c.width === window.innerWidth && c.height === window.innerHeight;
            }""",
            timeout=180000,
        )
        painted = False
        for _ in range(40):
            raw = page.locator("canvas").screenshot()
            ok = varied(raw)
            if ok:
                painted = True
                break
            page.wait_for_timeout(500)
        page.screenshot(path=str(out))
        check(painted, f"launch {index} canvas is a flat clear")
        before = page.evaluate(
            """() => {
                try { return JSON.parse(window.__game.ui).screen; }
                catch (e) { return document.querySelector('#shell')?.dataset.screen || ''; }
            }"""
        )
        for key in ("Enter", "Space", "Enter", "Space"):
            page.keyboard.press(key)
            page.wait_for_timeout(350)
        after = page.evaluate(
            """() => {
                try { return JSON.parse(window.__game.ui).screen + ':' + JSON.parse(window.__game.ui).label; }
                catch (e) { return document.querySelector('#shell')?.dataset.screen || ''; }
            }"""
        )
        check(before != after, f"launch {index} keys left state {before!r} -> {after!r}")
        check(not errors, f"launch {index} page errors: {errors[:4]}")
    finally:
        browser.close()
    return out


def fresh(pw, query):
    browser = pw.chromium.launch(headless=True, args=GPU)
    context = browser.new_context(viewport={"width": 1100, "height": 700}, device_scale_factor=1)
    context.add_init_script(
        """(() => {
            const orig = AudioNode.prototype.connect;
            window.__gains = [];
            AudioNode.prototype.connect = function (dest) {
                try { if (this instanceof GainNode) window.__gains.push(this.gain.value); } catch (e) {}
                return orig.apply(this, arguments);
            };
            const real = Math.random;
            window.__randCalls = 0;
            Math.random = function () { window.__randCalls++; return real.apply(this, arguments); };
            window.__rand = Math.random;
        })();"""
    )
    page = context.new_page()
    page.goto(HTML.as_uri() + query)
    return browser, page


def to_playing(page):
    wait_game(page)
    wait_ui(page, "u.screen === 'Title'")
    for screen in ("Difficulty", "Merc", "Prologue", "Playing"):
        push(page, {"act": 1})
        wait_ui(page, f"u.screen === '{screen}'")


def hooks(pw):
    browser, page = fresh(pw, "?test=1&nodraw=1")
    try:
        wait_game(page)
        push(page, {"act": 3})
        wait_ui(page, "u.glyph === 'Enter' && u.device === 'Keyboard'")
        check(True, "keyboard glyph")
        page.evaluate(
            """() => {
                window.__pad = { axes: [0,0,0,0], buttons: Array.from({length:17}, () => ({pressed:false, touched:false, value:0})) };
                navigator.getGamepads = () => [{
                    id: 'Stub (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)',
                    index: 0, connected: true, mapping: 'standard', timestamp: performance.now(),
                    axes: window.__pad.axes.slice(), buttons: window.__pad.buttons, vibrationActuator: null
                }, null, null, null];
            }"""
        )
        wait_ui(page, "u.glyph === 'Cross' && u.device === 'Gamepad'")
        check(True, "playstation glyph")
        push(page, {"act": 14})
        wait_ui(page, "u.glyph === 'A' && u.xbox === true")
        check(True, "xbox glyph")
        # A fresh contract, so Continue is not the focused row.
        page.evaluate("() => localStorage.removeItem('jamcry-save')")
        page.reload()
        to_playing(page)
        page.locator("canvas").click(position={"x": 780, "y": 240})
        page.wait_for_function("() => document.pointerLockElement && document.pointerLockElement.tagName === 'CANVAS'", timeout=8000)
        page.evaluate("() => document.dispatchEvent(new MouseEvent('mousemove', {movementX: 160, movementY: 0, bubbles: true}))")
        wait_ui(page, "Math.abs(s.yaw) > 0.05")
        check(True, "pointer yaw")
        page.evaluate("() => document.exitPointerLock()")
        wait_ui(page, "u.screen === 'Pause' && u.rows.indexOf('Dev mode') >= 0")
        check(True, "unlock pauses and lists dev")
        push(page, {"act": 11})
        wait_ui(page, "s.dev.god === true")
        push(page, {"act": 12})
        wait_ui(page, "s.tune.fire_spread > 0.9")
        check(True, "dev cheat and slider")
        push(page, {"act": 15})
        page.wait_for_function("() => !!localStorage.getItem('jamcry-save')", timeout=8000)
        page.reload()
        wait_game(page)
        wait_ui(page, "u.rows.indexOf('Continue') === 0")
        push(page, {"act": 1})
        wait_ui(page, "u.screen === 'Playing'")
        check(True, "save continue")
        # Music: a key starts the oscillator through the wrapped gain.
        page.keyboard.press("KeyM")
        page.wait_for_function("() => (window.__gains || []).some(v => Math.abs(v - 0.10) < 0.001)", timeout=4000)
        check(True, "music gain")
        page.evaluate("() => localStorage.removeItem('jamcry-save')")
        page.reload()
        wait_game(page)
        wait_ui(page, "u.screen === 'Title'")
        push(page, {"hover": [400, 220 + 3 * 80 + 10], "click": True})
        wait_ui(page, "u.screen === 'About'")
        seen = ""
        for _ in range(12):
            seen += "\n" + page.evaluate("() => [...document.querySelectorAll('#about p')].map(p => p.textContent).join('\\n')")
            need = [
                "2026-11-05 01:35:03", "Source: Far Cry 2", "PLAN.md", "Shooter", "first person",
                "shardfall", "sun-bleached", "simulation-driven", "0.10", "BroadcastChannel",
                "Playwright", "START_HERE", "Grok CLI", "grok-4.7", "added on import",
                "Testing Feedback", "Engine Feedback", "Prompt Feedback",
            ]
            if all(n in seen for n in need):
                break
            push(page, {"act": 1})
            page.wait_for_timeout(200)
        missing = [n for n in [
            "2026-11-05 01:35:03", "Source: Far Cry 2", "PLAN.md", "Shooter", "first person",
            "shardfall", "sun-bleached", "simulation-driven", "0.10", "BroadcastChannel",
            "Playwright", "START_HERE", "Grok CLI", "grok-4.7", "added on import",
            "Testing Feedback", "Engine Feedback", "Prompt Feedback",
        ] if n not in seen]
        check(not missing, "about missing " + ", ".join(missing))
    finally:
        browser.close()


def phone(pw):
    browser = pw.chromium.launch(headless=True, args=GPU)
    try:
        device = pw.devices["iPhone 13"].copy()
        device["device_scale_factor"] = 1
        context = browser.new_context(**device)
        page = context.new_page()
        page.goto(hook_url())
        wait_game(page)
        wait_ui(page, "u.notice === 'Controller or keyboard required'")
        visible = page.evaluate(
            """() => {
                const b = document.getElementById('settings-btn');
                const stick = document.querySelector('[data-touch], .touch-stick, #stick, #touch');
                return { shown: b && !b.hidden, text: b ? b.textContent : '', stick: !!stick,
                         controls: JSON.parse(window.__game.ui).touch_controls };
            }"""
        )
        check(visible["shown"] and visible["text"] == "Settings" and not visible["stick"] and visible["controls"] is False,
              f"phone chrome {visible}")
        wait_ui(page, "u.screen === 'Attract'", ms=20000)
        still = page.evaluate("() => document.getElementById('notice').textContent")
        check(still == "Controller or keyboard required", f"attract notice {still!r}")
    finally:
        browser.close()


def webkit(pw):
    browser = pw.webkit.launch(headless=True)
    try:
        page = browser.new_page(viewport={"width": 900, "height": 600})
        page.goto(HTML.as_uri() + "?nogpu=1")
        # nogpu skips the module's gpu branch only when the flag is set before it.
        # WebKit has no navigator.gpu, so the message shows even without nogpu.
        page.goto(HTML.as_uri())
        page.wait_for_function("() => (document.getElementById('msg')?.textContent || '').includes('needs WebGPU')", timeout=15000)
        text = page.locator("#msg").inner_text()
        check("needs WebGPU" in text and "Jam Cry" in text, f"webkit message {text!r}")
        check(page.locator("h1").inner_text() == "Jam Cry", "webkit title")
    finally:
        browser.close()


def net(pw):
    browser = pw.chromium.launch(headless=True)
    try:
        context = browser.new_context(viewport={"width": 800, "height": 600})
        context.add_init_script(
            """(() => {
                const real = Math.random;
                window.__randCalls = 0;
                Math.random = function () { window.__randCalls++; return real.apply(this, arguments); };
            })();"""
        )
        a = context.new_page()
        b = context.new_page()
        a.goto(HTML.as_uri() + "?nogpu=1")
        b.goto(HTML.as_uri() + "?nogpu=1")
        a.wait_for_function("() => window.gameNet && window.gameNet.startBroadcast")
        b.wait_for_function("() => window.gameNet && window.gameNet.startBroadcast")
        solo = a.evaluate("() => ({ active: !!(window.AIHub && AIHub.active), calls: window.__randCalls || 0 })")
        check(solo["active"] is False and solo["calls"] == 0, f"solo hub/random {solo}")
        a.evaluate("() => window.gameNet.startBroadcast()")
        b.evaluate("() => window.gameNet.startBroadcast()")
        a.wait_for_function("() => (document.getElementById('results')?.textContent || '').includes('BroadcastChannel')", timeout=8000)
        check(True, "broadcast")
        code = a.evaluate("() => window.gameNet.offerCode()")
        answer = b.evaluate("(c) => window.gameNet.takeOffer(c)", code)
        a.evaluate("(c) => window.gameNet.takeAnswer(c)", answer)
        a.wait_for_function("() => (document.getElementById('results')?.textContent || '').includes('WebRTC')", timeout=8000)
        check(True, "webrtc")
        made = a.evaluate("() => window.__rtcWhileHub || 0")
        check(made == 0, "webrtc was not opened for a hub")
    finally:
        browser.close()


def main():
    LOGS.mkdir(parents=True, exist_ok=True)
    if not HTML.is_file():
        print("FAIL: packed html missing")
        print("CHECKS 1")
        return 1
    cmd = sys.argv[1] if len(sys.argv) > 1 else "hooks"
    with sync_playwright() as pw:
        if cmd == "launch1":
            launch_once(pw, 1, 960, 540)
        elif cmd == "launch2":
            launch_once(pw, 2, 1280, 720)
        elif cmd == "hooks":
            hooks(pw)
            phone(pw)
        elif cmd == "webkit":
            webkit(pw)
        elif cmd == "net":
            net(pw)
        else:
            print(f"FAIL: unknown {cmd}")
    return finish()


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print(f"FAIL: {type(e).__name__}: {e}")
        print(f"CHECKS {CHECKS + 1}")
        sys.exit(1)
