#!/usr/bin/env python3
"""Boots the page and plays it with a stub pad, keys, a mouse and fingers. Prints failures and a count."""
import json, shutil, sys, time
from common import *

t = Count()

def boot_ok(p, what):
    s = wait(p, lambda: status(p), 90)
    t.check(f"{what}: __gameStatus appears", s is not None, "no status")
    if not s:
        return False
    a = s["tick"]
    p.wait_for_timeout(1500)
    b = status(p)["tick"]
    return t.check(f"{what}: the tick advances", b > a, f"{a} -> {b}")

def tap_key(p, key, ms=120):
    # Software rendering on a shared machine: give it a few frames either side of the press.
    a = status(p)["tick"]
    p.keyboard.down(key)
    wait(p, lambda: status(p)["tick"] > a + 2, 40)
    p.wait_for_timeout(ms)
    p.keyboard.up(key)
    a = status(p)["tick"]
    wait(p, lambda: status(p)["tick"] > a + 3, 40)

def tap_pad(p, i, ms=120):
    # Held until the game has really ticked with it: a tap shorter than a frame isn't a tap.
    a = status(p)["tick"]
    p.evaluate(f"__setPad([0,0,0,0],[{i}])")
    wait(p, lambda: status(p)["tick"] > a + 2, 40)
    p.wait_for_timeout(ms)
    p.evaluate("__setPad([0,0,0,0],[])")
    a = status(p)["tick"]
    wait(p, lambda: status(p)["tick"] > a + 3, 40)

with sync_playwright() as pw:
    b = pw.chromium.launch(args=FLAGS)
    # ---------------------------------------------------------------- the page alone: no dev folder, no network
    alone = HERE / "_alone"
    shutil.rmtree(alone, ignore_errors=True)
    alone.mkdir()
    shutil.copy(PAGE, alone / "game.html")
    c = b.new_context(viewport={"width": 320, "height": 180}, offline=True)
    p = c.new_page()
    errors, requests = [], []
    p.on("pageerror", lambda e: errors.append(str(e)))
    p.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    p.on("request", lambda r: requests.append(r.url))
    p.goto((alone / "game.html").as_uri() + "?fast=1")
    if boot_ok(p, "the page alone"):
        t.check("the page alone has the game's title", p.title() == "Whiff Fit \u2014 A balance comedy at Tippy Cay", p.title())
        t.check("the page alone starts on the title screen", status(p)["screen"] == "title", status(p)["screen"])
        other = [u for u in requests if not u.startswith((alone.as_uri(), "data:", "blob:"))]
        t.check("the page alone asks for no other file", not other, str(other[:5]))
        t.check("the page alone: no page errors", not errors, str(errors[:3]))
    c.close()
    shutil.rmtree(alone, ignore_errors=True)
    # ---------------------------------------------------------------- boot, pad, keys, mouse
    errors = []
    c, p = open_page(b, init=[PAD], errors=errors)
    if boot_ok(p, "boot"):
        s = status(p)
        t.check("starts on the title", s["screen"] == "title", s["screen"])
        t.check("music defaults to 10%", abs(s["music_setting"] - 0.10) < 1e-3, str(s["music_setting"]))
        # Pad: D-pad down moves the focus, Cross confirms.
        f0 = status(p)["focus"]
        tap_pad(p, 13)
        f1 = status(p)["focus"]
        t.check("the pad moves the focus", f1 == f0 + 1, f"{f0} -> {f1}")
        u = ui(p)
        t.check("prompts show PlayStation glyphs on a pad", any(x.startswith("Cross:") for x in u["prompts"]), str(u["prompts"]))
        t.check("the device is the pad", u["device"] == "pad", u["device"])
        # Back to the top, then Cross: into guest select.
        tap_pad(p, 12)
        tap_pad(p, 0)
        t.check("the pad confirms", wait(p, lambda: status(p)["screen"] == "slots", 5), status(p)["screen"])
        tap_pad(p, 1)
        t.check("Circle backs", wait(p, lambda: status(p)["screen"] == "title", 5), status(p)["screen"])
        # Keyboard: the same, and the prompts change the instant the device does.
        tap_key(p, "s")
        t.check("keys move the focus", status(p)["focus"] == 1, str(status(p)["focus"]))
        u = ui(p)
        t.check("prompts follow the keyboard", u["device"] == "keys" and any(x.startswith("Space:") for x in u["prompts"]), str(u))
        tap_key(p, "w")
        tap_key(p, "Enter")
        t.check("Enter confirms", wait(p, lambda: status(p)["screen"] == "slots", 5), status(p)["screen"])
        tap_key(p, "Escape")
        t.check("Esc backs", wait(p, lambda: status(p)["screen"] == "title", 5), status(p)["screen"])
        # Mouse: hover moves focus, a click activates.
        items = ui(p)["items"]
        it = items[2]
        p.mouse.move(it["x"] + it["w"] / 2, it["y"] + it["h"] / 2)
        ok = wait(p, lambda: status(p)["focus"] == 2, 5)
        t.check("mouse hover moves the focus", ok, str(status(p)["focus"]))
        t.check("prompts follow the mouse", ui(p)["device"] == "mouse", ui(p)["device"])
        p.mouse.click(it["x"] + it["w"] / 2, it["y"] + it["h"] / 2)
        t.check("a click activates", wait(p, lambda: status(p)["screen"] == "settings", 15), status(p)["screen"] + " " + str(ui(p).get("event")))
        # Settings: the Xbox option.
        items = ui(p)["items"]
        labels = [i["label"] for i in items]
        t.check("Settings lists glyphs", "Button Glyphs" in labels, str(labels))
        for _ in range(3):
            tap_key(p, "s")
        tap_key(p, "Enter")
        tap_pad(p, 13)
        u = ui(p)
        t.check("Xbox glyphs after the option", any(x.startswith("A:") for x in u["prompts"]), str(u["prompts"]))
        p.evaluate("__setPad([0,0,0,0],[])")
        tap_pad(p, 12)
        tap_pad(p, 0)   # back to PlayStation
        tap_pad(p, 1)
        t.check("back to the title", wait(p, lambda: status(p)["screen"] == "title", 5), status(p)["screen"])
        # A real start from the keyboard, a look at the event flow.
        t.check("no page errors so far", not errors, str(errors[:3]))
    c.close()
    # ---------------------------------------------------------------- attract
    errors = []
    c, p = open_page(b, errors=errors)
    if boot_ok(p, "attract page"):
        # 600 sim ticks; the wall clock depends on how fast software rendering runs.
        a = status(p)["tick"]
        ok = wait(p, lambda: status(p)["attract"], 240)
        ticks = status(p)["tick"] - a
        t.check("attract starts after about 10 s (600 ticks) of no input", ok and ticks < 640, f"{ticks} ticks, {status(p)['screen']}")
        tap_key(p, "x")
        t.check("any input exits attract", wait(p, lambda: status(p)["screen"] == "title", 8), status(p)["screen"])
        t.check("attract: no page errors", not errors, str(errors[:3]))
    c.close()
    # ---------------------------------------------------------------- sound
    def level(music):
        save = json.dumps({"version": 1, "settings": {"music": music, "sfx": 0.0, "voice": 0.0}, "slots": [None, None, None, None]})
        c, p = open_page(b, init=[SOUND], storage=save)
        boot_ok(p, f"sound page at {music}")
        p.mouse.click(5, 5)
        p.wait_for_timeout(5000)
        p.evaluate("__snd.rms = 0; __snd.n = 0; __snd.peak = 0")
        p.wait_for_timeout(9000)
        r = p.evaluate("__snd.n ? Math.sqrt(__snd.rms / __snd.n) : 0")
        c.close()
        return r
    low, full = level(0.10), level(1.0)
    t.check("music is audible at full", full > 0.005, str(full))
    if full > 0:
        ratio = low / full
        t.check("music at 10% is about a tenth of full", 0.05 < ratio < 0.2, f"{low} / {full} = {ratio}")
    # ---------------------------------------------------------------- a stay: pad all the way, a save, Continue
    errors = []
    c, p = open_page(b, init=[PAD], errors=errors)
    if boot_ok(p, "stay page"):
        tap_pad(p, 0)   # New Stay
        wait(p, lambda: status(p)["screen"] == "slots", 40)
        tap_pad(p, 0)   # Guest 1
        wait(p, lambda: status(p)["screen"] == "names", 40)
        tap_pad(p, 13)
        tap_pad(p, 0)   # A name
        t.check("the look screen follows the name", wait(p, lambda: status(p)["screen"] == "look", 40), status(p)["screen"])
        tap_pad(p, 13); tap_pad(p, 13); tap_pad(p, 0)   # Begin Your Stay
        t.check("Pip greets you", wait(p, lambda: status(p)["screen"] == "dialog", 40), status(p)["screen"])
        for _ in range(40):
            if status(p)["screen"] != "dialog":
                break
            tap_pad(p, 0)
        t.check("the Morning Wobble Check starts", wait(p, lambda: status(p)["screen"] == "check", 60), status(p)["screen"])
        saved = p.evaluate("localStorage.getItem('whiff-fit-save-v1')")
        ok = saved and json.loads(saved)["slots"][0] is not None
        t.check("the guest is saved in localStorage", ok, str(saved)[:200])
        t.check("a stay: no page errors", not errors, str(errors[:3]))
        p.reload()
        boot_ok(p, "reload")
        items = wait(p, lambda: ui(p)["items"], 40)
        t.check("the title says Continue after a save", items and items[0]["label"] == "Continue", str(items)[:300])
    c.close()
    # ---------------------------------------------------------------- lean per device, the rhythm clock
    errors = []
    c, p = open_page(b, url=PAGE.as_uri() + "?fast=1&scene=fit/event/step_party", init=[PAD, SOUND], errors=errors)
    if boot_ok(p, "event page"):
        p.wait_for_timeout(1000)
        tap_key(p, "Space")
        t.check("Space starts the event", wait(p, lambda: status(p)["phase"] == "Play", 30), status(p).get("phase"))
        # Keys ramp: a short hold gives a small lean.
        a = status(p)["tick"]
        p.keyboard.down("d")
        small = wait(p, lambda: status(p)["lean"][0] or None, 8, 0.01) or 0
        wait(p, lambda: status(p)["tick"] > a + 120, 25)
        big = status(p)["lean"][0]
        p.keyboard.up("d")
        t.check("keys ramp the lean", 0 < small < big, f"{small} then {big}")
        # The stick: past the deadzone with its curve.
        p.evaluate("__setPad([0.5,0,0,0],[])")
        ok = wait(p, lambda: 0.2 < status(p)["lean"][0] < 0.45, 8)
        t.check("the stick leans through its curve", ok, str(status(p)["lean"]))
        p.evaluate("__setPad([0.08,0,0,0],[])")
        ok = wait(p, lambda: abs(status(p)["lean"][0]) < 0.001, 8)
        t.check("the stick has a deadzone", ok, str(status(p)["lean"]))
        p.evaluate("__setPad([0,0,0,0],[])")
        # The cursor: its offset from the middle of the window.
        p.mouse.move(160 + 0.38 * 180 * 0.5, 90)
        ok = wait(p, lambda: abs(status(p)["lean"][0] - 0.5) < 0.1, 8)
        t.check("the cursor leans by its offset", ok, str(status(p)["lean"]))
        # Sound is running (the click): the rhythm clock follows the music.
        p.mouse.click(160, 90)
        ok = wait(p, lambda: status(p).get("song_pos") is not None, 15)
        t.check("the rhythm clock runs once sound does", ok, str(status(p).get("song_pos")))
        if ok:
            s = status(p)
            t.check("the clock is near the song", abs(s["song_pos"] - s["t"]) < 20, f"{s['song_pos']} vs {s['t']}")
        t.check("event page: no page errors", not errors, str(errors[:3]))
    c.close()
    # ---------------------------------------------------------------- touch-only devices
    for name in ("Pixel 7", "Galaxy Tab S4"):
        dev = dict(pw.devices[name])
        dev.pop("viewport", None)
        dev.pop("device_scale_factor", None)
        dev.pop("default_browser_type", None)
        c, p = open_page(b, viewport=(320, 180), **dev)
        if boot_ok(p, name):
            t.check(f"{name}: the card is up", status(p)["touch_only"], str(status(p)))
            t.check(f"{name}: attract runs", wait(p, lambda: status(p)["attract"], 30), status(p)["screen"])
            items = wait(p, lambda: ui(p)["items"], 5)
            t.check(f"{name}: one Settings button", items and items[0]["label"] == "Settings", str(items))
            if items:
                it = items[0]
                p.touchscreen.tap(it["x"] + it["w"] / 2, it["y"] + it["h"] / 2)
                t.check(f"{name}: a tap opens Settings", wait(p, lambda: status(p)["screen"] == "settings", 20), status(p)["screen"] + " " + str(ui(p).get("event")))
        c.close()
    b.close()
    # ---------------------------------------------------------------- no WebGPU, on a touch device
    w = pw.webkit.launch()
    dev = dict(pw.devices["iPhone 14"])
    dev.pop("default_browser_type", None)
    ctx = w.new_context(**dev)
    p = ctx.new_page()
    p.goto(PAGE.as_uri())
    p.wait_for_timeout(1000)
    text = p.inner_text("#msg")
    t.check("no WebGPU on touch says both things", "Controller or keyboard required" in text and "WebGPU" in text, text)
    w.close()

print(f"{t.passed} passed, {t.failed} failed")
sys.exit(1 if t.failed else 0)
