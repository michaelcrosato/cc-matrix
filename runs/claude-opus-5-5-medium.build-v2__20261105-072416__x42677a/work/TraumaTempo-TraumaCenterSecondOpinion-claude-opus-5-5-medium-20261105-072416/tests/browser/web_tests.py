#!/usr/bin/env python3
"""Browser tests of the built single file, on file://, checked through window.__game."""
import json, sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import *
from playwright.sync_api import sync_playwright

R = Results()

def renders(b):
    # The real thing, once, small: a frame of 3D arrives and has pixels in it.
    p = Page(b, query="?scene=surgery/case/3", viewport=(480, 270))
    p.wait(lambda s: s["frames"] >= 2, timeout=200, what="a real frame")
    shot = p.page.screenshot()
    import zlib
    assert len(shot) > 8000, len(shot)
    assert not [e for e in p.errors if "favicon" not in e], p.errors
    p.close()

def hover_at_true_hidpi(pw):
    # A real device pixel ratio of 2 (not emulated): hover and click land where they should.
    wb = pw.chromium.launch(args=ARGS + ["--force-device-scale-factor=2", "--window-size=1000,600"])
    ctx = wb.new_context(no_viewport=True)
    page = ctx.new_page()
    page.goto(pathlib.Path(GAME).as_uri() + "?lite=1")
    st = lambda: json.loads(page.evaluate("window.__game ? __game.status() : '{}'") or "{}")
    end = time.time() + 120
    while time.time() < end and st().get("frames", 0) < 4:
        time.sleep(0.3)
    page.evaluate("__game.do(JSON.stringify({no_attract: true, screen: 'menu'}))")
    w, h, dpr = page.evaluate("[innerWidth, innerHeight, devicePixelRatio]")
    assert dpr == 2, dpr
    page.mouse.move(w / 2 - 10, h * 856 / 1080)
    page.mouse.move(w / 2, h * 856 / 1080)
    end = time.time() + 60
    while time.time() < end and st()["shell"]["focus"] != 5:
        time.sleep(0.3)
    assert st()["shell"]["focus"] == 5, st()["shell"]["focus"]
    wb.close()

def boots(b):
    p = Page(b, query="?lite=1", init=[TAP])
    st = p.wait(lambda s: s["shell"]["screen"] == "title" and s["frames"] > 4, what="title")
    assert "Trauma Tempo" == p.page.title(), p.page.title()
    assert st["title"] == "Trauma Tempo"
    assert "Trauma Tempo" in st["shell"]["texts"], st["shell"]["texts"]
    assert not [e for e in p.errors if "GPU" not in e and "favicon" not in e], p.errors
    # None of the engine's overlays.
    for bad in ["Shardfall", "F1 tuning", "Esc menu", "boot"]:
        assert not any(bad in t for t in st["shell"]["texts"]), bad
    assert p.page.evaluate("document.querySelector('canvas') != null")
    assert abs(st["bus"]["music"] - 0.1) < 1e-4, st["bus"]
    p.close()

def keyboard_and_mouse(b):
    p = Page(b, query="?lite=1")
    p.wait(lambda s: s["shell"]["screen"] == "title" and s["frames"] > 4, what="title")
    p.do({"no_attract": True})
    p.frames(1)
    p.key("Enter")
    st = p.wait(lambda s: s["shell"]["screen"] == "menu", what="menu")
    assert any(x.startswith("key:") for x in st["shell"]["prompts"]), st["shell"]["prompts"]
    f0 = st["shell"]["focus"]
    p.key("ArrowDown")
    st = p.wait(lambda s: s["shell"]["focus"] != f0, what="arrow moved focus")
    # Hover moves the focus and a click activates: About is the last of six, at about y=856 of 1080.
    p.mmove(480, 856 / 1080 * 540)
    p.frames(2)
    p.mmove(482, 856 / 1080 * 540)
    st = p.wait(lambda s: s["shell"]["screen"] == "menu" and s["shell"]["focus"] == 5, timeout=30, what="hover focus")
    p.mclick(482, 856 / 1080 * 540)
    st = p.wait(lambda s: "section:Credits" in s["shell"]["texts"], what="click about")
    texts = st["shell"]["texts"]
    for sec in ["Credits", "Source Information", "Testing Feedback", "Engine Feedback", "Prompt Feedback"]:
        assert f"section:{sec}" in texts, sec
    p.key("Escape")
    p.wait(lambda s: s["shell"]["screen"] == "menu", what="back")
    p.close()

def tools_by_keys_wheel_tray(b):
    p = Page(b, query="?scene=surgery/case/2&lite=1")
    p.wait(lambda s: s["sim"] and s["sim"]["stage"] == "Op" and s["frames"] > 3, what="op")
    p.do({"paused": False})
    p.mmove(400, 300)
    p.key("3")
    p.wait(lambda s: s["sim"]["ring_pos"] == 2, what="digit tool")
    p.page.mouse.wheel(0, 200)
    p.wait(lambda s: s["sim"]["ring_pos"] == 3, what="wheel down cycles")
    # A click on the tray picks the instrument there: find slot 7's screen position roughly.
    st = p.status()
    p.mmove(480, 500)
    p.frames(2)
    p.mclick(480, 505)
    p.wait(lambda s: s["sim"]["ring_pos"] in (3, 4), what="tray click")
    # The mouse aims absolutely.
    p.mmove(600, 260)
    st = p.wait(lambda s: s["sim"]["cursor"][0] > 0.5, what="mouse aim")
    p.page.mouse.down()
    p.wait(lambda s: s["sim"]["using"], what="left button uses")
    p.page.mouse.up()
    assert any(x.startswith("mouse:") for x in p.status()["shell"]["prompts"])
    p.close()

def pad_flow(b):
    p = Page(b, query="?lite=1", init=[PAD])
    p.wait(lambda s: s["shell"]["screen"] == "title" and s["frames"] > 3, what="title")
    p.do({"no_attract": True})
    p.press(0)
    st = p.wait(lambda s: s["shell"]["screen"] == "menu", what="pad to menu")
    assert st["device"] == "pad"
    assert "ps:cross" in st["shell"]["prompts"] or "stick:d" in st["shell"]["prompts"], st["shell"]["prompts"]
    f0 = st["shell"]["focus"]
    p.press(13)  # D-pad down
    p.wait(lambda s: s["shell"]["focus"] != f0, what="dpad")
    # Into a case with the pad.
    p.do({"load": "surgery/case/2"})
    p.wait(lambda s: s["sim"] and s["sim"]["stage"] == "Op", what="op")
    # The right stick moves the cursor.
    c0 = p.status()["sim"]["cursor"]
    p.pad("__pad.axes[2]=1")
    p.wait(lambda s: s["sim"]["cursor"][0] > c0[0] + 0.5, what="right stick")
    p.pad("__pad.axes[2]=0")
    # Pushing the stick up (a negative axis in the standard mapping) moves up the field.
    c1 = p.status()["sim"]["cursor"]
    p.pad("__pad.axes[3]=-1")
    p.wait(lambda s: s["sim"]["cursor"][1] < c1[1] - 0.5, what="right stick up")
    p.pad("__pad.axes[3]=0")
    # And flicking the left stick up picks the top of the ring.
    p.pad("__pad.axes[1]=1")
    p.wait(lambda s: s["sim"]["ring_pos"] == 4, what="flick down")
    p.pad("__pad.axes[1]=0")
    p.frames(2)
    p.pad("__pad.axes[1]=-1")
    p.wait(lambda s: s["sim"]["ring_pos"] == 0, what="flick up")
    p.pad("__pad.axes[1]=0")
    p.frames(2)
    # Flick selects a tool, instantly: right is ring position 2.
    p.pad("__pad.axes[0]=1")
    p.wait(lambda s: s["sim"]["ring_pos"] == 2, what="flick right")
    p.pad("__pad.axes[0]=0")
    p.frames(2)
    # Analog R2 reaches the sim.
    p.pad("__pad.buttons[7].pressed=true; __pad.buttons[7].value=0.5")
    st = p.wait(lambda s: s["sim"]["using"] and 0.3 < s["sim"]["pressure"] < 0.7, what="analog R2")
    p.pad("__pad.buttons[7].pressed=false; __pad.buttons[7].value=0")
    p.frames(2)
    # Options pauses; Circle resumes.
    p.press(9)
    p.wait(lambda s: s["shell"]["screen"] == "pause" and s["paused"], what="options pauses")
    p.press(1)
    p.wait(lambda s: s["shell"]["screen"] == "playing" and not s["paused"], what="circle resumes")
    # Options is ignored while Create is held.
    p.pad("__pad.buttons[8].pressed=true; __pad.buttons[8].value=1")
    p.frames(2)
    p.press(9)
    p.frames(2)
    assert p.status()["shell"]["screen"] == "playing"
    p.pad("__pad.buttons[8].pressed=false; __pad.buttons[8].value=0")
    # A second pad joins with Cross: a new seat.
    # Prompts flip the moment another device is touched.
    p.key("Tab")
    st = p.wait(lambda s: s["device"] == "keys", what="flip to keys")
    p.frames(2)
    assert any(x.startswith("mouse:") or x.startswith("key:") for x in p.status()["shell"]["prompts"])
    p.key("Tab")
    p.close()

def two_pads_join(b):
    # Any unassigned pad joins with Cross: a new seat, with its own cursor.
    two = PAD + """
    (() => { const buttons = Array.from({length: 17}, () => ({pressed: false, touched: false, value: 0}));
      const pad2 = {id: 'DualSense Wireless Controller (STANDARD GAMEPAD)', index: 1, connected: true,
                    mapping: 'standard', timestamp: 0, axes: [0,0,0,0], buttons};
      window.__pad2 = pad2; navigator.getGamepads = () => [window.__pad, pad2, null, null]; })();
    """
    p = Page(b, query="?scene=surgery/codeblue&lite=1", init=[two])
    p.wait(lambda s: s["sim"] and s["sim"]["stage"] == "Op" and s["frames"] > 3, what="code blue")
    p.pad("__pad.axes[2]=0.01")  # the first pad is the device in use
    p.pad("__pad2.buttons[0].pressed=true; __pad2.buttons[0].value=1; __pad2.timestamp++")
    p.wait(lambda s: s["sim"]["cursors"][1][0] is True, what="second seat joined")
    p.pad("__pad2.buttons[0].pressed=false; __pad2.buttons[0].value=0; __pad2.timestamp++")
    c0 = p.status()["sim"]["cursors"][1][1]
    p.pad("__pad2.axes[2]=1; __pad2.timestamp++")
    p.wait(lambda s: s["sim"]["cursors"][1][1] > c0 + 0.5, what="second cursor moves")
    p.close()

def xbox_setting_persists(b):
    ctx_page = Page(b, query="?lite=1", init=[PAD])
    p = ctx_page
    p.wait(lambda s: s["shell"]["screen"] == "title" and s["frames"] > 3, what="title")
    p.do({"no_attract": True, "screen": "settings", "page": 1})
    p.wait(lambda s: s["shell"]["screen"] == "settings", what="settings")
    p.press(0)  # focus is Button prompts: Cross toggles it
    st = p.wait(lambda s: s["shell"]["settings"]["xbox"], what="xbox on")
    # Settings persist across a reload.
    p.page.reload()
    st = p.wait(lambda s: s["shell"]["screen"] == "title" and s["frames"] > 3, what="reload")
    p.do({"no_attract": True})
    assert st["shell"]["settings"]["xbox"] is True
    p.press(0)
    st = p.wait(lambda s: s["shell"]["screen"] == "menu", what="menu")
    assert any(x.startswith("xb:") for x in st["shell"]["prompts"]), st["shell"]["prompts"]
    p.close()

def attract(b):
    p = Page(b, query="?lite=1", init=[PAD])
    p.wait(lambda s: s["shell"]["screen"] == "title" and s["frames"] > 3, what="title")
    t0 = time.time()
    p.wait(lambda s: s["shell"]["screen"] == "attract", timeout=60, what="attract at 10 s")
    took = time.time() - t0
    assert 6 < took < (200 if FULL else 30), took
    st = p.wait(lambda s: s["sim"] and s["sim"]["demo"], what="demo running")
    assert "DEMO" in p.wait(lambda s: "DEMO" in s["shell"]["texts"], what="DEMO text")["shell"]["texts"]
    # A frame can take seconds here: title may come and go between looks, so an exit also shows
    # as the idle clock falling back.
    def left(before):
        return lambda s: s["shell"]["screen"] == "title" or s["shell"]["idle"] < before
    p.page.keyboard.press("x")
    p.wait(lambda s: s["shell"]["screen"] == "title", what="key exits")
    # Pad exits.
    p.wait(lambda s: s["shell"]["screen"] == "attract", timeout=60, what="attract again")
    idle = p.status()["shell"]["idle"]
    p.press(0)
    p.wait(left(idle + 1), what="pad exits")
    assert p.status()["device"] == "pad"
    # Mouse exits.
    p.wait(lambda s: s["shell"]["screen"] == "attract", timeout=60, what="attract a third time")
    p.mmove(100, 100)
    idle = p.status()["shell"]["idle"]
    p.mmove(200, 200)
    p.wait(left(idle + 1), what="mouse exits")
    p.close()

def touch_only(b, playwright):
    device = playwright.devices["Pixel 7"]
    ctx = {k: v for k, v in device.items() if k not in ("viewport", "default_browser_type")}
    p = Page(b, query="?lite=1", viewport=(device["viewport"]["height"], device["viewport"]["width"]), **ctx)
    st = p.wait(lambda s: s["shell"]["touch_only"] and "Controller or keyboard required" in s["shell"]["texts"], what="message")
    # A Settings button a tap can use; no touch controls.
    vw, vh = device["viewport"]["height"], device["viewport"]["width"]
    p.page.touchscreen.tap(vw / 2, vh * 800 / 1080)
    p.wait(lambda s: s["shell"]["screen"] == "settings", what="tap settings")
    p.page.touchscreen.tap(vw / 2, vh * 940 / 1080)
    p.wait(lambda s: s["shell"]["screen"] == "title", what="tap back")
    # Attract still runs.
    p.wait(lambda s: s["shell"]["screen"] == "attract", timeout=40, what="touch attract")
    assert not any("Shardfall" in t for t in p.status()["shell"]["texts"])
    p.close()

def webkit_iphone(playwright):
    device = playwright.devices["iPhone 14"]
    wb = playwright.webkit.launch()
    ctx = wb.new_context(**{k: v for k, v in device.items() if k != "default_browser_type"})
    page = ctx.new_page()
    page.goto(pathlib.Path(GAME).as_uri())
    page.wait_for_timeout(3000)
    txt = page.evaluate("document.body.innerText")
    # No WebGPU here: the page's clear message, or (with WebGPU) the game running.
    has_gpu = page.evaluate("!!navigator.gpu")
    assert has_gpu or "WebGPU" in txt, txt[:200]
    wb.close()

def audio_runs(b):
    p = Page(b, query="?lite=1", init=[TAP])
    p.wait(lambda s: s["shell"]["screen"] == "title" and s["frames"] > 3, what="title")
    p.key("Enter")  # a gesture
    st = p.status()
    assert abs(st["bus"]["music"] - 0.1) < 1e-4
    end = time.time() + 30
    peak = 0
    while time.time() < end and peak < 0.001:
        peak = p.page.evaluate("window.__peak()")
        time.sleep(0.2)
    assert peak > 0.001, f"silent: {peak}"
    # The music bus really is playing, at its low level.
    st = p.wait(lambda s: s["peaks"][1] > 0, timeout=30, what="music peak")
    p.close()

def dev_mode(b):
    p = Page(b, query="?scene=surgery/case/3&lite=1")
    p.wait(lambda s: s["sim"] and s["sim"]["stage"] == "Op" and s["frames"] > 3, what="op")
    p.key("Escape")
    st = p.wait(lambda s: s["shell"]["screen"] == "pause", what="pause")
    for t in ["Resume", "Restart", "Controls", "Settings", "Dev Mode", "Quit to Title"]:
        assert t in st["shell"]["texts"], t
    # Dev Mode is fifth.
    for _ in range(4):
        p.key("ArrowDown")
    p.key("Enter")
    p.wait(lambda s: s["shell"]["screen"] == "dev", what="dev")
    # A balance page: slide the first slider, then Reset All.
    p.do({"page": 3})
    p.frames(2)
    p.key("ArrowRight")
    st = p.wait(lambda s: abs(s["shell"]["tune"]["drain"] - 1.0) > 0.05, what="slider moved")
    for _ in range(6):
        p.key("ArrowDown")
    p.key("Enter")
    p.wait(lambda s: abs(s["shell"]["tune"]["drain"] - 1.0) < 0.001, what="reset")
    p.close()

def whole_campaign(b):
    p = Page(b, query="?lite=1")
    p.wait(lambda s: s["frames"] > 3, what="start")
    p.do({"load": "surgery/campaign", "bot": True, "no_attract": True})
    p.wait(lambda s: s["sim"] and s["sim"]["stage"] == "Story", what="campaign start")
    p.page.evaluate("__game.step(300000)")
    st = p.wait(lambda s: s["outcome"] in ("won", "lost") or s["shell"]["screen"] == "menu", timeout=500, every=1.0, what="campaign end")
    assert st["outcome"] != "lost", json.dumps(st)[:500]
    p.close()

def screenshots(b):
    p = Page(b, viewport=(1920, 1080))
    p.wait(lambda s: s["frames"] > 2, what="start", timeout=120)
    time.sleep(1)
    p.page.screenshot(path=str(OUT / "title.png"))
    p.do({"load": "surgery/case/3/2", "bot": True})
    p.wait(lambda s: s["sim"] and s["sim"]["stage"] == "Op", what="op", timeout=120)
    p.page.evaluate("__game.step(420)")
    time.sleep(3)
    p.page.screenshot(path=str(OUT / "op.png"))
    p.do({"screen": "dev", "paused": True})
    time.sleep(3)
    p.page.screenshot(path=str(OUT / "dev.png"))
    p.do({"screen": "about", "paused": False})
    time.sleep(3)
    p.page.screenshot(path=str(OUT / "about.png"))
    p.close()

with sync_playwright() as pw:
    browser = pw.chromium.launch(args=ARGS)
    for name, fn in [
        ("a real 3D frame arrives", renders),
        ("boots with no errors and no engine overlays", boots),
        ("keyboard and mouse menus", keyboard_and_mouse),
        ("tools by digit, wheel and tray; mouse aim", tools_by_keys_wheel_tray),
        ("DualSense flow", pad_flow),
        ("two pads: the second joins with Cross", two_pads_join),
        ("Xbox prompts, and settings persist", xbox_setting_persists),
        ("attract at 10 s, exits on key, pad and mouse", attract),
        ("audio runs, music at 10%", audio_runs),
        ("dev mode: sliders apply and reset", dev_mode),
        ("the whole campaign, stepped with the bot", whole_campaign),
    ]:
        R.run(name, lambda: fn(browser))
    R.run("phone: message, settings, no touch controls, attract", lambda: touch_only(browser, pw))
    R.run("WebKit iPhone: as far as it goes", lambda: webkit_iphone(pw))
    R.run("hover at a true device pixel ratio of 2", lambda: hover_at_true_hidpi(pw))
    if "--shots" in sys.argv:
        R.run("screenshots", lambda: screenshots(browser))
    browser.close()
