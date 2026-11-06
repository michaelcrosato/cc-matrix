#!/usr/bin/env python3
"""The full picture, 3D on, on a software renderer: slow, so generous timeouts and small windows,
except the 1920x1080 screenshots of every main screen."""
import json, pathlib, re, shutil, subprocess, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from common import *
from playwright.sync_api import sync_playwright

R = Results()
SLOW = 400

def stage(p, name):
    return p.wait(lambda s: s["sim"] and s["sim"]["stage"] == name, timeout=SLOW, every=0.5, what=f"stage {name}")

def not_blank(path, least=30000):
    assert pathlib.Path(path).stat().st_size > least, f"{path} looks blank"

def shots(b):
    p = Page(b, viewport=(1920, 1080))
    p.wait(lambda s: s["frames"] >= 2, timeout=SLOW, every=1, what="first frames")
    p.do({"no_attract": True})
    def snap(n):
        p.frames(2, timeout=SLOW)
        path = OUT / f"full_{n}.png"
        p.page.screenshot(path=str(path), timeout=SLOW * 1000)
        not_blank(path)
    snap("title")
    p.do({"load": "surgery/campaign", "bot": False})
    stage(p, "Story")
    p.page.evaluate("__game.step(30)")
    p.do({"advance": 40})
    p.do({"paused": False})
    p.frames(2, timeout=SLOW)
    p.page.evaluate("__game.step(120)")
    snap("story")
    p.do({"load": "surgery/case/3/3", "bot": True})
    stage(p, "Op")
    p.page.evaluate("__game.step(500)")
    snap("op")
    p.do({"paused": True, "screen": "dev", "page": 3})
    snap("dev")
    p.do({"paused": False, "screen": "about"})
    snap("about")
    # Run a case to its results, and stop pressing on.
    p.do({"load": "surgery/case/0", "screen": "playing", "bot": False})
    stage(p, "Op")
    p.page.evaluate("__game.step(300)")
    p.do({"win": True})
    p.page.evaluate("__game.step(300)")
    stage(p, "Results")
    time.sleep(1)
    snap("results")
    assert not [e for e in p.errors if "favicon" not in e], p.errors[:3]
    p.close()

def pad_full(b):
    p = Page(b, init=[PAD], viewport=(480, 270))
    p.wait(lambda s: s["shell"]["screen"] == "title" and s["frames"] > 2, timeout=SLOW, what="title")
    p.do({"no_attract": True})
    p.press(0)
    p.wait(lambda s: s["shell"]["screen"] == "menu", timeout=SLOW, what="menu")
    p.do({"load": "surgery/case/2"})
    stage(p, "Op")
    p.pad("__pad.axes[0]=1")
    p.wait(lambda s: s["sim"]["ring_pos"] == 2, timeout=SLOW, what="flick")
    p.pad("__pad.axes[0]=0")
    p.pad("__pad.buttons[7].pressed=true; __pad.buttons[7].value=0.5")
    p.wait(lambda s: s["sim"]["using"], timeout=SLOW, what="R2")
    p.pad("__pad.buttons[7].pressed=false; __pad.buttons[7].value=0")
    p.press(9)
    p.wait(lambda s: s["shell"]["screen"] == "pause", timeout=SLOW, what="pause")
    p.close()

def phone_full(b, pw):
    device = pw.devices["Pixel 7"]
    ctx = {k: v for k, v in device.items() if k not in ("viewport", "default_browser_type")}
    vw, vh = device["viewport"]["height"], device["viewport"]["width"]
    p = Page(b, viewport=(vw, vh), **ctx)
    p.wait(lambda s: s["shell"]["touch_only"] and "Controller or keyboard required" in s["shell"]["texts"], timeout=SLOW, what="message")
    # Frames take seconds here: hold attract off while tapping, or a slow step lets it start.
    p.do({"no_attract": True})
    p.frames(1, timeout=SLOW)
    p.page.screenshot(path=str(OUT / "full_phone.png"), timeout=SLOW * 1000)
    if p.status()["shell"]["screen"] == "attract":
        p.page.touchscreen.tap(vw / 2, vh / 2)
        p.wait(lambda s: s["shell"]["screen"] == "title", timeout=SLOW, what="tap leaves attract")
        p.frames(1, timeout=SLOW)
    p.page.touchscreen.tap(vw / 2, vh * 800 / 1080)
    p.wait(lambda s: s["shell"]["screen"] == "settings", timeout=SLOW, what="tap settings")
    p.page.touchscreen.tap(vw / 2, vh * 940 / 1080)
    p.wait(lambda s: s["shell"]["screen"] == "title", timeout=SLOW, what="tap back")
    p.do({"no_attract": False})
    p.wait(lambda s: s["shell"]["screen"] == "attract" and s["sim"]["demo"], timeout=SLOW, what="attract on a phone")
    p.close()

def hub_full(b, query="players=1&auto=1&limit=30"):
    # A real round, drawing everything, on the harness's own check.
    hub = ROOT / "tests" / "hub"
    shutil.copy(GAME, hub / "game_full.html")
    srv = subprocess.Popen([sys.executable, "-u", "-m", "http.server", "0", "--bind", "127.0.0.1", "-d", str(hub)], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        port = int(re.search(r"port (\d+)", srv.stdout.readline()).group(1))
        ctx = b.new_context(viewport={"width": 640, "height": 360})
        page = ctx.new_page()
        page.goto(f"http://127.0.0.1:{port}/harness.html?game=game_full.html&{query}")
        page.wait_for_function("document.body.dataset.complete === 'true'", timeout=SLOW * 2500)
        chk = json.loads(page.evaluate("JSON.stringify(window.__hubCheck)"))
        ctx.close()
        assert chk.get("pass") is True, json.dumps([c for c in chk["checks"] if not c["pass"]])[:900]
    finally:
        srv.terminate()
        (hub / "game_full.html").unlink(missing_ok=True)

ONLY = sys.argv[1] if len(sys.argv) > 1 else ""
with sync_playwright() as pw:
    browser = pw.chromium.launch(args=ARGS)
    if ONLY == "phone":
        R.run("full picture: phone profile", lambda: phone_full(browser, pw))
        browser.close()
        sys.exit(0)
    R.run("full picture: 1080p title, story, op, dev, about, results", lambda: shots(browser))
    R.run("full picture: DualSense flow", lambda: pad_full(browser))
    R.run("full picture: phone profile", lambda: phone_full(browser, pw))
    R.run("full picture: a hub round", lambda: hub_full(browser))
    R.run("full picture: hub, 4 players on a bad network", lambda: hub_full(browser, "players=4&latency=150&jitter=50&loss=5&auto=1&play=60000&limit=120"))
    R.run("full picture: hub, the host leaves", lambda: hub_full(browser, "players=4&latency=150&jitter=50&loss=5&auto=1&scenario=host-leave&play=60000&limit=120"))
    R.run("full picture: hub, a server with no player", lambda: hub_full(browser, "players=2&scenario=server&auto=1&play=60000&limit=120"))
    browser.close()
