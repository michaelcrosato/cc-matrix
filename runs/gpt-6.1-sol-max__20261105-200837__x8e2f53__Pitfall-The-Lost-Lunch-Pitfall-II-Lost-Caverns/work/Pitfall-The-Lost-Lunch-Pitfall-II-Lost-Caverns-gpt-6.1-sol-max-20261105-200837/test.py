#!/home/micha/.local/share/pipx/venvs/playwright/bin/python
import functools
import http.server
import json
import math
import os
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
GAME = ROOT.name + ".html"
ART = ROOT / "test-artifacts"
ART.mkdir(exist_ok=True)
(ART / "browser-tmp").mkdir(exist_ok=True)
os.environ["TMPDIR"] = str(ART / "browser-tmp")
checks = []
errors = []


def check(name, condition, detail=""):
    checks.append(
        {
            "name": name,
            "pass": bool(condition),
            "detail": str(detail) if not condition else "",
        }
    )
    if not condition:
        print(f"FAIL {name}: {detail}", flush=True)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass


def boot(page, url):
    page.on("pageerror", lambda error: errors.append(str(error)))
    if page.url == url:
        page.reload(wait_until="load", timeout=120000)
    else:
        page.goto(url, wait_until="load", timeout=120000)
    page.wait_for_function("window.__game?.ready || window.__bootError", timeout=120000)
    if page.evaluate("window.__bootError || null"):
        raise RuntimeError(page.evaluate("window.__bootError"))
    page.wait_for_timeout(700)


def state(page):
    return page.evaluate("__game.state")


def move(page, x=0, y=0, jump=False, frames=1, index=0):
    return page.evaluate(
        "([i,input,n])=>{__game.input(i,input);return __game.step(n);}",
        [index, {"x": x, "y": y, "jump": jump}, frames],
    )


def pos(page, index=0):
    return state(page)["players"][index]


def go_x(page, target, y=0, jump=False, limit=1800):
    jump_hold = 0
    for _ in range(limit // 6):
        p = pos(page)
        if abs(p["x"] - target) < 0.2:
            move(page, frames=2)
            return True
        danger = page.evaluate(
            "(()=>{const g=__game.raw,p=g.localPlayer();return g.state.hazards.some(h=>Math.abs(h.x-p.x)<2.8&&Math.abs(h.y-p.y)<1.2&&(h.x-p.x)*p.facing>-0.5)})()"
        )
        gap = target > 23 and 18.1 < p["x"] < 19.1
        if p["grounded"] and jump_hold <= 0 and (danger or gap):
            jump_hold = 32
        n = 6 if abs(p["x"] - target) > 0.7 else 1
        move(
            page,
            x=1 if p["x"] < target else -1,
            y=y,
            jump=jump or jump_hold > 0,
            frames=n,
        )
        jump_hold -= n
    return False


def swim_to(page, x, y):
    for _ in range(220):
        p = pos(page)
        dx, dy = x - p["x"], y - p["y"]
        if math.hypot(dx, dy) < 0.3:
            move(page, frames=2)
            return True
        move(
            page,
            x=max(-1, min(1, dx * 1.5 - 0.065)),
            y=max(-1, min(1, dy * 1.5)),
            frames=6,
        )
    return False


def route(page):
    page.evaluate("__game.start()")
    move(page, frames=45)
    go_x(page, 18.4)
    move(page, x=1, jump=True, frames=54)
    go_x(page, 35.7)
    page.evaluate("__game.action('interact');__game.step(2)")
    check("Route: Mox rescued using interact", state(page)["found"][0], pos(page))
    go_x(page, 40)
    move(page, x=1, frames=100)
    swim_to(page, 61, -1.6)
    swim_to(page, 76.3, -1.6)
    swim_to(page, 76.3, -8)
    check(
        "Route: native swim animation plays",
        page.evaluate("__game.animations[0].clip") == "swim",
    )
    page.evaluate("__game.action('interact');__game.step(2)")
    check("Route: Dr. Crumb rescued underwater", state(page)["found"][1], pos(page))
    move(page, x=0, y=1, jump=True, frames=160)
    go_x(page, 85, y=1, jump=True)
    check(
        "Route: river shore reached by swimming",
        pos(page)["x"] > 83 and pos(page)["y"] > 0.3,
        pos(page),
    )
    go_x(page, 93)
    for _ in range(160):
        p = pos(page)
        if p["y"] > 10.8:
            break
        move(page, x=(93 - p["x"]) * 0.5, y=1, frames=6)
    check(
        "Route: first ladder climbed through opening", pos(page)["y"] > 10.5, pos(page)
    )
    check(
        "Route: native climbing animation plays",
        page.evaluate("__game.animations[0].clip") == "climb",
    )
    go_x(page, 96)
    check("Route: upper shelf crumb collected", state(page)["crumbs"][8], pos(page))
    go_x(page, 101)
    for _ in range(120):
        if pos(page)["y"] > 17.8:
            break
        p = pos(page)
        move(page, x=(101 - p["x"]) * 0.5, y=1, frames=6)
    check("Route: second ladder climbed", pos(page)["y"] > 17.4, pos(page))
    go_x(page, 110)
    go_x(page, 118)
    move(page, frames=150)
    go_x(page, 118)
    page.evaluate("__game.action('interact');__game.step(3)")
    check("Route: balloon boarded", pos(page)["balloon"], pos(page))
    go_x(page, 114)
    for _ in range(150):
        if pos(page)["y"] > 26:
            break
        move(page, frames=6)
    check("Route: updraft reaches shrine height", pos(page)["y"] > 25.5, pos(page))
    check(
        "Route: native balloon animation plays",
        page.evaluate("__game.animations[0].clip") == "float",
    )
    go_x(page, 134.5)
    move(page, jump=True, x=1, frames=15)
    move(page, frames=100)
    check(
        "Route: balloon dismounted onto shrine",
        not pos(page)["balloon"] and pos(page)["y"] > 24,
        pos(page),
    )
    go_x(page, 150)
    page.evaluate("__game.action('interact');__game.step(2)")
    check("Route: lunchbox recovered", all(state(page)["found"]), pos(page))
    go_x(page, 159.5)
    page.evaluate("__game.action('interact');__game.step(2)")
    check(
        "Route: return trolley departs", state(page)["transit"] is not None, pos(page)
    )
    move(page, frames=500)
    check(
        "Route: return to camp completed",
        state(page)["returned"] and pos(page)["x"] < 10,
        pos(page),
    )
    go_x(page, 6.5)
    page.evaluate("__game.action('interact');__game.step(2)")
    check(
        "Route: expedition won at the camp bell",
        state(page)["won"] and page.evaluate("__game.menu") == "victory",
        state(page),
    )


def extra_checks(page, context, url):
    page.evaluate(
        '__game.start();__game.raw.controls.test={};__game.teleport(35.8,0.8);__game.action("interact");__game.step(3);__game.save()'
    )
    stored = page.evaluate('localStorage.getItem("lost-lunch-expedition-v1")')
    check(
        "Save is valid persistent JSON",
        stored and json.loads(stored).get("version") == 1,
        stored,
    )
    boot(page, url)
    check(
        "Save creates a continue action",
        page.get_by_role("button", name="Continue expedition", exact=True).count() == 1,
        page.evaluate(
            '({mode:__game.mode,menu:__game.menu,saved:__game.raw.saved,stored:localStorage.getItem("lost-lunch-expedition-v1")})'
        ),
    )
    page.get_by_role("button", name="Continue expedition", exact=True).click()
    check(
        "Continue restores discovery and physical position",
        state(page)["found"][0] and abs(pos(page)["x"] - 35.8) < 0.5,
        state(page),
    )
    page.evaluate(
        "__game.teleport(38,0.9);__game.step(30);__game.raw.state.score=500;__game.setClock(0);__game.teleport(28,0.8);__game.raw.localPlayer().invuln=0;__game.step(3)"
    )
    check(
        "Actual wildlife collision applies penalty",
        state(page)["score"] == 400 and pos(page)["hits"] == 1,
        state(page),
    )
    check(
        "Wildlife collision retains rescued companion",
        state(page)["found"][0] and abs(pos(page)["x"] - 38) < 0.2,
    )
    page.keyboard.press("KeyM")
    check(
        "Field map shows current location",
        page.locator("#map-player").count() == 1
        and page.evaluate("__game.menu") == "map",
    )
    page.keyboard.press("Escape")
    check("Map closes back to expedition", page.evaluate("__game.menu") == "")
    page.evaluate("__game.start(2);__game.raw.controls.test={};__game.step(60)")
    before = pos(page, 1)["x"]
    page.keyboard.down("KeyL")
    page.evaluate("__game.step(30)")
    page.keyboard.up("KeyL")
    check(
        "Couch second keyboard moves explorer two",
        pos(page, 1)["x"] > before + 2,
        state(page),
    )
    page.keyboard.press("Escape")
    before = state(page)["time"]
    page.evaluate("__game.step(60)")
    check("Couch pause freezes both explorers", state(page)["time"] == before)
    page.keyboard.press("Escape")
    page.evaluate(
        '__game.raw.toTitle();__game.raw.saved=null;__game.raw.ui.show("title");__game.raw.controls.test={};window.pad={index:0,id:"Test DualSense",mapping:"standard",connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,"getGamepads",{configurable:true,value:()=>[window.pad]});window.pad.buttons[0].pressed=true;__game.raw.controls.poll()'
    )
    check(
        "Standard gamepad Cross starts the expedition",
        page.evaluate("__game.mode") == "playing"
        and page.evaluate("__game.menu") == "",
    )
    page.evaluate(
        "pad.buttons[0].pressed=false;pad.axes[0]=1;__game.raw.controls.poll();__game.step(30)"
    )
    check(
        "Standard gamepad stick moves explorer",
        pos(page)["x"] > 8 and page.evaluate("__game.inputDevice") == "gamepad",
        pos(page),
    )
    check(
        "Last controller input shows PlayStation glyphs",
        page.evaluate('__game.raw.glyph("jump")') == "×",
    )
    page.evaluate(
        "pad.axes[0]=0;pad.buttons[8].pressed=true;pad.buttons[9].pressed=true;__game.raw.controls.poll()"
    )
    check("Create plus Options is reserved for hub", page.evaluate("__game.menu") == "")
    page.evaluate(
        "pad.buttons[8].pressed=false;pad.buttons[9].pressed=false;__game.raw.controls.poll();pad.buttons[9].pressed=true;__game.raw.controls.poll()"
    )
    check("Gamepad Options opens pause menu", page.evaluate("__game.menu") == "pause")
    page.evaluate("pad.buttons[9].pressed=false;__game.raw.controls.poll()")
    page.get_by_role("button", name="Settings", exact=True).click()
    page.get_by_role("button", name="Controller glyphs:", exact=False).click()
    page.evaluate("pad.axes[0]=0.3;__game.raw.controls.poll()")
    check(
        "Settings swaps controller glyphs to Xbox",
        page.evaluate('__game.raw.glyph("jump")') == "A",
    )
    page.evaluate(
        'pad.axes[0]=0;__game.raw.controls.poll();__game.raw.settings.xbox=0;__game.raw.persistSettings();Object.defineProperty(navigator,"getGamepads",{configurable:true,value:()=>[]})'
    )
    page.evaluate('__game.raw.ui.show("about","pause")')
    for n in range(5):
        page.locator(f'[data-act="credits-{n}"]').click()
        check(
            f"About page {n + 1} has readable content",
            len(page.locator(".panel").inner_text()) > 160,
        )
    page.evaluate('__game.raw.menuAction("reveal");__game.raw.ui.show("map","pause")')
    check(
        "Developer reveal adds all crumb locations to map",
        page.locator(".map-crumb").count() == 12,
    )
    page.evaluate("__game.start();__game.safe(true);__game.raw.state.score=0")
    coords = page.evaluate(
        "__game.raw.world.crumbMeshes.map(m=>[m.position.x,m.position.y])"
    )
    for x, y in coords:
        page.evaluate("([x,y])=>{__game.teleport(x,y);__game.step(2)}", [x, y])
    check(
        "All twelve optional crumbs are collectable",
        all(state(page)["crumbs"]),
        state(page)["crumbs"],
    )
    page.evaluate(
        '__game.save();__game.raw.toTitle();__game.raw.ui.show("settings","title")'
    )
    page.locator('[data-setting="music"]').fill("0.23")
    boot(page, url)
    check(
        "Audio settings persist across loads",
        abs(page.evaluate("__game.settings.music") - 0.23) < 0.001,
    )
    page.evaluate("__game.raw.settings.music=0.1;__game.raw.persistSettings()")
    page.evaluate("__game.start();__game.raw.audio.init();__game.step(60)")
    page.wait_for_timeout(100)
    levels = page.evaluate(
        "(()=>{const a=__game.raw.audio,b=new Uint8Array(a.analyser.frequencyBinCount);a.analyser.getByteFrequencyData(b);return [...b].reduce((s,n)=>s+n,0)})()"
    )
    check("Live Web Audio graph produces measurable energy", levels > 0, levels)


def touch_checks(pw, browser, url):
    mobile = browser.new_context(**pw.devices["Pixel 7"])
    page = mobile.new_page()
    boot(page, url)
    page.get_by_role("button", name="Begin expedition", exact=True).tap()
    check(
        "Phone touch starts the same expedition",
        page.evaluate("__game.mode") == "playing"
        and page.evaluate("__game.inputDevice") == "touch",
    )
    page.evaluate("__game.step(60)")
    before = pos(page)["x"]
    w, h = page.viewport_size["width"], page.viewport_size["height"]
    cdp = mobile.new_cdp_session(page)
    left = {"x": 70, "y": h * 0.74, "id": 1}
    right = {"x": w - 40, "y": h * 0.87, "id": 2}
    cdp.send(
        "Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [left, right]}
    )
    left["x"] = 140
    cdp.send(
        "Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [left, right]}
    )
    page.evaluate("__game.step(24)")
    check(
        "Multitouch thumb movement and jump work together",
        pos(page)["x"] > before + 1 and pos(page)["y"] > 1.4,
        pos(page),
    )
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    page.evaluate("__game.teleport(35.8,0.8);__game.safe(true);__game.step(60)")
    check("Touch assists nearby companion rescue", state(page)["found"][0], state(page))
    check(
        "Touch action appears only in context",
        page.locator("#touch-interact").is_hidden(),
    )
    page.locator("#touch-menu").tap()
    check("Touch menu opens pause", page.evaluate("__game.menu") == "pause")
    check(
        "Phone menu stays within viewport",
        page.locator(".panel").bounding_box()["width"] <= w,
    )
    page.screenshot(path=str(ART / "phone-menu.png"))
    mobile.close()


def peer_checks(context, url):
    host = context.new_page()
    guest = context.new_page()
    boot(host, url)
    boot(guest, url)
    host.evaluate('__game.raw.ui.show("link","title")')
    guest.evaluate('__game.raw.ui.show("link","title")')
    host.evaluate("__game.raw.net.offer()")
    invitation = host.locator("#signal-out").input_value()
    check("Direct peer invitation contains signaling data", len(invitation) > 100)
    guest.evaluate("(s)=>__game.raw.net.accept(s)", invitation)
    reply = guest.locator("#signal-out").input_value()
    host.evaluate("(s)=>__game.raw.net.accept(s)", reply)
    host.wait_for_function("__game.network.connected", timeout=20000)
    guest.wait_for_function("__game.network.connected", timeout=20000)
    check(
        "Standalone two-page WebRTC connects",
        host.evaluate("__game.network.host")
        and not guest.evaluate("__game.network.host"),
    )
    guest.evaluate("__game.input(0,{x:1})")
    for _ in range(16):
        guest.evaluate("__game.step(6)")
        host.evaluate("__game.step(6)")
        host.wait_for_timeout(15)
    hp = state(host)["players"][1]
    gp = state(guest)["players"][1]
    check("Client input is simulated by authoritative peer", hp["x"] > 11, hp)
    check("Peer world snapshots converge", abs(hp["x"] - gp["x"]) < 1.5, [hp, gp])
    host.evaluate(
        '__game.teleport(35.8,0.8,0);__game.action("interact");__game.step(12)'
    )
    guest.wait_for_timeout(100)
    check(
        "Shared rescue reaches the other device", state(guest)["found"][0], state(guest)
    )
    check(
        "Direct network carries data both ways",
        all(
            p.evaluate("__game.network.sent>0 && __game.network.received>0")
            for p in [host, guest]
        ),
    )
    guest.evaluate("__game.input(0,{x:0})")
    host.evaluate("__game.teleport(76.5,-8.1,1);__game.step(12)")
    guest.wait_for_timeout(60)
    guest.evaluate('__game.action("interact");__game.step(12)')
    host.wait_for_timeout(60)
    host.evaluate("__game.step(12)")
    guest.wait_for_timeout(60)
    check(
        "Remote interaction rescues companion on host",
        state(host)["found"][1] and state(guest)["found"][1],
    )
    guest.evaluate("__game.save()")
    saved = guest.evaluate(
        'JSON.parse(localStorage.getItem("lost-lunch-expedition-v1"))'
    )
    check(
        "Remote explorer save normalizes the solo seat",
        saved["snapshot"]["players"][0]["id"] == 0 and saved["snapshot"]["found"][1],
        saved,
    )
    host.evaluate(
        '__game.teleport(150,25,0);__game.action("interact");__game.step(12);__game.teleport(159.5,24.9,0);__game.action("interact");__game.step(24)'
    )
    guest.wait_for_timeout(100)
    guest.evaluate("__game.step(3)")
    check(
        "Co-op return ride begins on both devices",
        state(host)["transit"] is not None and state(guest)["transit"] is not None,
    )
    cart = guest.evaluate(
        "({x:__game.raw.world.trolley.position.x,p:__game.state.players[0].x})"
    )
    check(
        "Remote trolley follows the shared return ride",
        abs(cart["x"] - cart["p"]) < 2,
        cart,
    )
    host.evaluate("__game.step(500)")
    guest.wait_for_timeout(200)
    guest.evaluate("__game.step(2)")
    check(
        "Co-op return brings every explorer to camp",
        state(guest)["returned"] and all(p["x"] < 10 for p in state(guest)["players"]),
    )
    host.evaluate('__game.action("interact");__game.step(12)')
    guest.wait_for_timeout(100)
    check(
        "Co-op victory is shared across devices",
        state(host)["won"] and state(guest)["won"],
        [state(host)["found"], state(guest)["found"]],
    )
    host.evaluate("__game.autoplay(true)")
    guest.close()
    host.wait_for_function("!__game.network.connected", timeout=12000)
    check(
        "Peer disconnect clears remote seat and retains authority",
        not host.evaluate("__game.network.connected")
        and host.evaluate("__game.network.host")
        and len(state(host)["players"]) == 1,
        host.evaluate("__game.network"),
    )
    host.close()


def launch(pw):
    return pw.chromium.launch(
        headless=True,
        args=[
            "--enable-unsafe-webgpu",
            "--enable-features=Vulkan",
            "--use-webgpu-adapter=swiftshader",
            "--disable-dev-shm-usage",
        ],
    )


def hub_checks(pw, base):
    from urllib.parse import urlencode

    scenarios = [
        ("standard", 2, {}),
        ("stressed", 4, {"latency": 150, "jitter": 50, "loss": 5}),
        (
            "host-leave",
            4,
            {"scenario": "host-leave", "latency": 150, "jitter": 50, "loss": 5},
        ),
        ("server", 2, {"scenario": "server"}),
    ]
    for name, players, extra in scenarios:
        browser = launch(pw)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()
        params = {"game": "../../" + GAME, "players": players, "auto": 1, **extra}
        page.goto(
            base + "/" + ROOT.name + "/hub/harness.html?" + urlencode(params),
            wait_until="load",
            timeout=120000,
        )
        page.wait_for_function("window.__hubCheck?.done", timeout=120000)
        report = page.evaluate("__hubCheck")
        (ART / f"hub-{name}.json").write_text(json.dumps(report, indent=2))
        for result in report["checks"]:
            check(
                "Hub " + name + ": " + result["name"],
                result["pass"],
                result.get("detail", ""),
            )
        check(
            "Hub " + name + ": automatic conformance passes",
            report["pass"],
            [c for c in report["checks"] if not c["pass"]],
        )
        for frame in page.frames[1:]:
            if frame.evaluate("!!window.__game?.ready"):
                check(
                    "Hub " + name + ": ended game audio is muted",
                    frame.evaluate("__game.network.ended && !__game.audio.enabled"),
                )
        page.close()
        context.close()
        browser.close()


def main():
    handler = functools.partial(QuietHandler, directory=str(ROOT.parent))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        with sync_playwright() as pw:
            browser = launch(pw)
            context = browser.new_context(
                viewport={"width": 1920, "height": 1080}, device_scale_factor=1
            )
            page = context.new_page()
            boot(page, (ROOT.parent / GAME).as_uri() + "?test=1")
            check(
                "Single file boots through file://",
                page.evaluate("__game.mode") == "title",
            )
            check(
                "Renderer uses WebGPU",
                page.evaluate("__game.backend") == "WebGPU",
                page.evaluate("__game.backend"),
            )
            check(
                "Music defaults to ten percent",
                page.evaluate("__game.settings.music") == 0.1,
            )
            page.screenshot(path=str(ART / "title.png"))
            page.evaluate("__game.start()")
            move(page, frames=100)
            p = pos(page)
            check("Rapier capsule rests on terrain", abs(p["y"] - 0.69) < 0.12, p)
            move(page, x=1, frames=30)
            check(
                "Movement advances through physical world",
                pos(page)["x"] > p["x"] + 2,
                pos(page),
            )
            p = pos(page)
            move(page, jump=True, frames=15)
            check("Jump rises above the floor", pos(page)["y"] > p["y"] + 1, pos(page))
            move(page, frames=100)
            check("Gravity lands the explorer", pos(page)["grounded"], pos(page))
            page.keyboard.press("Escape")
            check(
                "Keyboard pause opens field menu",
                page.evaluate("__game.menu") == "pause",
            )
            before = state(page)["time"]
            move(page, frames=30)
            check("Pause freezes standalone simulation", state(page)["time"] == before)
            page.get_by_role("button", name="Developer field kit", exact=True).click()
            check(
                "Developer kit reachable from pause",
                page.evaluate("__game.menu") == "dev",
            )
            page.locator('[data-setting="speed"]').fill("9")
            check(
                "Balance slider applies live",
                page.evaluate("__game.balance.speed") == 9,
            )
            page.get_by_role(
                "button", name="Reset balance & assists", exact=True
            ).click()
            check(
                "Balance reset restores defaults",
                page.evaluate("__game.balance.speed") == 6.2,
            )
            page.keyboard.press("Escape")
            page.keyboard.press("Escape")
            page.evaluate("__game.start();__game.safe(true)")
            page.evaluate("__game.teleport(62,-5)")
            a = move(page, y=1, frames=40)["players"][0]
            check("Buoyant swimming responds vertically", a["water"] and a["y"] > -3, a)
            page.screenshot(path=str(ART / "river.png"))
            page.evaluate("__game.start();__game.teleport(38,0.9);__game.step(30)")
            check(
                "Checkpoint activates on contact",
                state(page)["flags"][1] and pos(page)["checkpoint"] == 1,
            )
            page.evaluate("__game.hurt();__game.step(2)")
            check(
                "Hazard recovery returns to last checkpoint",
                abs(pos(page)["x"] - 38) < 0.5 and pos(page)["invuln"] > 2,
            )
            route(page)
            page.screenshot(path=str(ART / "victory.png"))
            audio = page.evaluate("__game.verifyAudio()")
            check(
                "Synthesized audio produces nonzero unclipped PCM",
                audio["supported"] and 0.001 < audio["rms"] < 0.2 and audio["peak"] < 1,
                audio,
            )
            page.evaluate("__game.raw.toTitle();__game.attract()")
            check(
                "Ten idle seconds starts attract replay",
                page.evaluate("__game.mode") == "attract",
            )
            move(page, frames=3300)
            check(
                "Attract replay visits river and shrine",
                page.evaluate("__game.mode") == "attract" and pos(page)["x"] > 120,
                pos(page),
            )
            page.keyboard.press("KeyA")
            check(
                "Any input exits attract without starting play",
                page.evaluate("__game.mode") == "title",
            )
            extra_checks(page, context, (ROOT.parent / GAME).as_uri() + "?test=1")
            check("No runtime JavaScript errors", not errors, errors)
            page.close()
            context.close()
            browser.close()
            browser = launch(pw)
            context = browser.new_context(viewport={"width": 1920, "height": 1080})
            visual = context.new_page()
            boot(visual, (ROOT.parent / GAME).as_uri() + "?test=1&renderer=webgl")
            visual.evaluate("__game.step(2)")
            visual.wait_for_timeout(1500)
            visual.screenshot(path=str(ART / "title-visual.png"))
            visual.evaluate("__game.start();__game.step(120)")
            visual.wait_for_timeout(1000)
            visual.screenshot(path=str(ART / "camp-visual.png"))
            visual.evaluate("__game.safe(true);__game.teleport(64,-4);__game.step(60)")
            visual.wait_for_timeout(500)
            visual.screenshot(path=str(ART / "river-visual.png"))
            visual.evaluate("__game.teleport(145,25);__game.step(60)")
            visual.wait_for_timeout(500)
            visual.screenshot(path=str(ART / "shrine-visual.png"))
            check(
                "Fallback draws world geometry",
                visual.evaluate("__game.raw.renderer.info.render.drawCalls") > 0,
            )
            visual.close()
            context.close()
            browser.close()
            browser = launch(pw)
            touch_checks(pw, browser, base + "/" + GAME + "?test=1")
            browser.close()
            browser = launch(pw)
            context = browser.new_context(viewport={"width": 1920, "height": 1080})
            peer_checks(context, base + "/" + GAME + "?test=1")
            context.close()
            browser.close()
            hub_checks(pw, base)
            check(
                "No runtime JavaScript errors across all contexts", not errors, errors
            )
    except Exception as exc:  # noqa: BLE001 - report unexpected failures and close the owned server
        check("Test runner completed", False, str(exc))
    finally:
        server.shutdown()
        server.server_close()
        (ART / "results.json").write_text(
            json.dumps({"checks": checks, "errors": errors}, indent=2)
        )
    failures = sum(not c["pass"] for c in checks)
    print(f"{len(checks)} checks, {failures} failures", flush=True)
    return failures


def presentation():
    report = json.loads((ROOT.parent / "exit-interview.json").read_text())
    html = (ROOT.parent / GAME).read_text()
    selection = json.loads((ROOT / "selection.json").read_text())
    check(
        "Exit interview has the exact top-level schema",
        set(report)
        == {
            "sourceInformation",
            "testingFeedback",
            "engineFeedback",
            "promptFeedback",
            "aiHub",
        },
    )
    check(
        "All source fields are present and filled",
        len(report["sourceInformation"]) == 15
        and all(isinstance(v, str) and v for v in report["sourceInformation"].values()),
    )
    for key, length in [
        ("testingFeedback", 4),
        ("engineFeedback", 6),
        ("promptFeedback", 4),
    ]:
        check(
            key + " has every answer",
            len(report[key]) == length
            and all(isinstance(v, str) and v for v in report[key]),
        )
    check(
        "Usage is left for the importer",
        report["sourceInformation"]["usage"] == "added on import",
    )
    check(
        "Catalogue has valid title and tags",
        report["aiHub"]["name"] == selection["title"]
        and 3 <= len(report["aiHub"]["tags"]) <= 6,
    )
    check(
        "Title draw used a real fifty-item RNG",
        selection["poolSize"] == 50
        and 1 <= selection["draw"] <= 50
        and "secrets.randbelow" in selection["method"],
    )
    check(
        "Unmodified hub client is embedded",
        (ROOT / "hub/session.js").read_text() in html,
    )
    check(
        "HTML embeds its two scripts",
        html.count("<script>") == 2 and "<script src=" not in html,
    )
    try:
        with sync_playwright() as pw:
            browser = launch(pw)
            context = browser.new_context(
                viewport={"width": 1920, "height": 1080}, device_scale_factor=1
            )
            page = context.new_page()
            requests = []
            page.on("request", lambda request: requests.append(request.url))
            boot(page, (ROOT.parent / GAME).as_uri() + "?test=1&renderer=webgl")
            page.evaluate("__game.step(2)")
            page.wait_for_timeout(500)
            page.screenshot(path=str(ART / "title-final.png"))
            check(
                "Offline startup requests no remote resources",
                not any(u.startswith(("http:", "https:")) for u in requests),
                requests,
            )
            page.evaluate('__game.raw.ui.show("about","title")')
            values = list(report["sourceInformation"].values())
            for i, expected in [(0, values[:8]), (1, values[8:])]:
                page.locator(f'[data-act="credits-{i}"]').click()
                check(
                    "About source page " + str(i + 1) + " matches exit JSON",
                    page.locator(".credits-list dd").all_inner_texts() == expected,
                )
            for i, key in [
                (2, "testingFeedback"),
                (3, "engineFeedback"),
                (4, "promptFeedback"),
            ]:
                page.locator(f'[data-act="credits-{i}"]').click()
                text = page.locator(".feedback").inner_text()
                check(
                    "About " + key + " matches exit JSON",
                    all(v in text for v in report[key]),
                )
            page.screenshot(path=str(ART / "credits-final.png"))
            page.set_viewport_size({"width": 640, "height": 360})
            page.locator('[data-act="credits-1"]').click()
            page.keyboard.press("ArrowDown")
            page.wait_for_timeout(100)
            scroll = page.locator(".panel").evaluate(
                "p=>({top:p.scrollTop,full:p.scrollHeight,height:p.clientHeight})"
            )
            check(
                "Controller directions scroll overflowing credits",
                scroll["top"] > 0,
                scroll,
            )
            page.keyboard.press("ArrowRight")
            check(
                "Controller directions switch credits pages",
                page.locator(".feedback").count() == 1,
            )
            page.set_viewport_size({"width": 1920, "height": 1080})
            page.evaluate(
                "__game.start();__game.safe(true);__game.teleport(64,-4);__game.raw.cameraPos={x:67.3,y:1};__game.step(60);__game.raw.ui.toastUntil=0;__game.raw.ui.update()"
            )
            page.wait_for_timeout(500)
            page.screenshot(path=str(ART / "river-final.png"))
            page.evaluate(
                "__game.teleport(145,25);__game.raw.cameraPos={x:148.3,y:29.4};__game.step(60)"
            )
            page.wait_for_timeout(500)
            page.screenshot(path=str(ART / "shrine-final.png"))
            check("Final scene renders without JavaScript errors", not errors, errors)
            context.close()
            browser.close()
    except Exception as exc:  # noqa: BLE001 - report any presentation failure
        check("Presentation runner completed", False, str(exc))
    (ART / "presentation-results.json").write_text(
        json.dumps({"checks": checks, "errors": errors}, indent=2)
    )
    failures = sum(not c["pass"] for c in checks)
    print(f"{len(checks)} checks, {failures} failures", flush=True)
    return failures


if __name__ == "__main__":
    raise SystemExit(bool(presentation() if "--presentation" in sys.argv else main()))
