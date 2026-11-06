from __future__ import annotations

import argparse
import json
import os
import sys
import threading
import traceback
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"
ART.mkdir(exist_ok=True)
parser = argparse.ArgumentParser()
parser.add_argument(
    "--suite", choices=["core", "hub", "visual", "delivery", "all"], default="all"
)
args = parser.parse_args()
results = []
errors = []


def check(name, ok, detail=""):
    results.append({"name": name, "pass": bool(ok), "detail": detail if not ok else ""})
    if not ok:
        print(f"FAIL {name}: {detail}", flush=True)


def case(name, fn):
    try:
        fn()
    except Exception as e:  # noqa: BLE001 - collect each independent test failure and continue the suite.
        check(name, False, str(e))
        (ART / (name.replace(" ", "-") + "-error.txt")).write_text(
            traceback.format_exc()
        )


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass


server = ThreadingHTTPServer(
    ("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT))
)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
BASE = f"http://127.0.0.1:{server.server_port}"


def asset_route(route):
    url = route.request.url
    if "three@0.180.0/build/" in url:
        route.fulfill(
            path=ROOT / "node_modules/three/build" / url.split("/")[-1],
            content_type="application/javascript",
        )
    elif "rapier3d-compat@0.19.3/rapier.mjs" in url:
        route.fulfill(
            path=ROOT / "node_modules/@dimforge/rapier3d-compat/rapier.mjs",
            content_type="application/javascript",
        )
    else:
        route.continue_()


def context(browser, **kwargs):
    ctx = browser.new_context(
        ignore_https_errors=True, viewport={"width": 1280, "height": 720}, **kwargs
    )
    ctx.route("https://cdn.jsdelivr.net/**", asset_route)
    return ctx


def load(page, query="?test=1"):
    page.goto(BASE + "/game.html" + query, wait_until="domcontentloaded")
    page.wait_for_function("window.__gameReady || window.__gameError", timeout=90000)
    err = page.evaluate("window.__gameError||null")
    if err:
        raise RuntimeError(err)
    assert page.title() == "Raiders of the Golden Goose", (
        "Server returned a different game"
    )
    return page.evaluate("window.__GG?.snapshot()")


def state(page):
    return page.evaluate("window.__GG.snapshot()")


# Relative TMPDIR keeps Chromium's Unix socket below 108 bytes inside this folder.
os.chdir(ROOT)
os.environ["TMPDIR"] = "."
with sync_playwright() as pw:
    browser = pw.chromium.launch(
        channel="chromium",
        headless=True,
        args=[
            "--no-sandbox",
            "--disable-gpu-watchdog",
            "--enable-unsafe-webgpu",
            "--enable-features=Vulkan",
            "--use-webgpu-adapter=swiftshader",
            "--use-angle=vulkan",
            "--disable-vulkan-surface",
        ],
    )

    def static_files():
        selection = json.loads((ROOT / "selection.json").read_text())
        html = (ROOT.parent / (selection["slug"] + ".html")).read_text()
        report = json.loads((ROOT.parent / "exit-interview.json").read_text())
        check(
            "Single-file export and interview parse",
            "<title>Raiders of the Golden Goose</title>" in html
            and set(report)
            == {
                "sourceInformation",
                "testingFeedback",
                "engineFeedback",
                "promptFeedback",
                "aiHub",
            },
        )
        check(
            "Unmodified AI Hub client is first head script",
            html.split("<script>", 1)[1].startswith(
                (ROOT / "hub-session.js").read_text()
            ),
        )
        check(
            "Title chosen from fifty with cryptographic RNG",
            selection["candidates"] == 50
            and selection["method"] == "node:crypto randomInt"
            and 1 <= selection["index"] <= 50,
        )
        check(
            "No source module or media-file runtime dependencies",
            "src/engine.js" not in html
            and not any(ext in html for ext in ['.mp3"', '.wav"', '.ogg"']),
        )

    def core():
        ctx = context(browser)
        p = ctx.new_page()
        page_errors = []
        p.on("pageerror", lambda e: page_errors.append(str(e)))
        try:
            s = load(p)
            check(
                "Pinned WebGPU and Rapier initialise",
                s["renderer"] == "WebGPU" and s["physics"] == "Rapier 0.19.3",
                str(s),
            )
            check("Default music gain is ten percent", s["audio"]["musicVolume"] == 0.1)
            check(
                "Title has a field guide and credits",
                p.get_by_role("button", name="The field guide").count() == 1
                and p.get_by_role("button", name="About & credits").count() == 1,
            )
            p.get_by_role("button", name="Begin expedition", exact=True).click(
                timeout=5000
            )
            check("Mouse starts solo expedition", state(p)["status"] == "playing")
            p.keyboard.down("d")
            p.wait_for_function("window.__GG.input().mx>.9")
            inp = p.evaluate("window.__GG.input()")
            p.evaluate("(input)=>window.__GG.advance(30,{0:input})", inp)
            p.keyboard.up("d")
            check("WASD moves a Rapier body", state(p)["players"][0]["x"] > 1)
            p.keyboard.press("Escape")
            check("Escape opens pause menu", state(p)["screen"] == "pause")
            p.get_by_role("button", name="Developer toolkit", exact=True).click()
            slider = p.locator("#range-moveSpeed")
            slider.fill("8.1")
            slider.dispatch_event("input")
            check(
                "Live developer slider changes movement",
                abs(state(p)["tuning"]["moveSpeed"] - 8.1) < 0.01,
            )
            p.get_by_role("button", name="Invulnerable: OFF").click()
            check("Developer invulnerability toggles", state(p)["god"])
            p.get_by_role("button", name="Reset defaults", exact=True).click()
            check(
                "Developer defaults restore balance",
                state(p)["tuning"]["moveSpeed"] == 6.3 and not state(p)["god"],
            )
            p.get_by_role("button", name="← Back", exact=True).click()
            p.get_by_role("button", name="Back to the adventure", exact=True).click()
            # Entire expedition with ordinary movement/actions at default tuning, no warps or immunity.
            report = p.evaluate((ROOT / "tests/playthrough.js").read_text())
            (ART / "playthrough.json").write_text(json.dumps(report, indent=2))
            check(
                "Full default-balance playthrough wins with all curios",
                report["final"]["status"] == "won"
                and report["final"]["treasures"] == 3
                and not report["final"]["god"],
            )
            check(
                "All primary mechanics were exercised",
                report["final"]["gateOpen"]
                and report["final"]["cleanSwap"]
                and report["final"]["boulder"]["started"]
                and report["final"]["kills"] >= 6,
            )
            p.evaluate("window.__GG.openMenu('about','pause')")
            for i, label in enumerate(
                [
                    "Source information",
                    "Testing feedback",
                    "Engine feedback",
                    "Prompt feedback",
                ]
            ):
                p.get_by_role("button", name=label, exact=True).click()
                check("Credits contain " + label, p.locator(".credit-row").count() >= 4)
            p.evaluate(
                "window.__GG.closeMenu();window.__GG.start(true);window.__GG.advance(20)"
            )
            check(
                "Standalone couch co-op creates two explorers",
                len(state(p)["players"]) == 2,
            )
            p.evaluate("window.__GG.damage(1,8)")
            check(
                "Co-op partner can be downed without ending run",
                state(p)["players"][1]["down"] and state(p)["status"] == "playing",
            )
            p.keyboard.down("ShiftLeft")
            check(
                "Couch keyboard sprint does not roll the second explorer",
                not p.evaluate("window.__GG.input(1).roll"),
            )
            p.keyboard.up("ShiftLeft")
            p.keyboard.down("ShiftRight")
            check(
                "Second explorer has an independent roll binding",
                p.evaluate("window.__GG.input(1).roll"),
            )
            p.keyboard.up("ShiftRight")
            p.evaluate("window.__GG.interact(0)")
            check(
                "Co-op interaction revives partner",
                not state(p)["players"][1]["down"]
                and state(p)["players"][1]["hp"] == 3,
            )
            p.evaluate(
                "window.__GG.start();window.__GG.advance(20);window.__GG.damage(0,8)"
            )
            check(
                "Solo defeat shows checkpoint retry",
                state(p)["status"] == "failed" and state(p)["screen"] == "failure",
            )
            p.get_by_role("button", name="Try that again", exact=True).click()
            check(
                "Checkpoint retry restores health",
                state(p)["status"] == "playing" and state(p)["players"][0]["hp"] == 6,
            )
            p.evaluate(
                "window.__GG.warp(0,0,-14);window.__GG.advance(1,{0:{interact:true}});window.__GG.advance(80);window.__GG.save();window.__GG.restore()"
            )
            check(
                "Checkpoint can be restored",
                state(p)["checkpoint"]["name"] == "The sun gallery"
                and state(p)["phase"] == "puzzle"
                and state(p)["players"][0]["z"] < -25,
            )
            p.evaluate("window.__GG.openMenu('pause')")
            p.get_by_role("button", name="Return to title", exact=True).click()
            p.evaluate("window.__GG.idle()")
            p.wait_for_function("window.__GG.snapshot().attract", timeout=10000)
            check("Ten-second title idle begins attract replay", state(p)["attract"])
            reel = p.evaluate("Array.from({length:24},()=>window.__GG.advance(250))")
            (ART / "attract.json").write_text(json.dumps(reel, indent=2))
            check(
                "Attract replay demonstrates advanced chapters",
                any(
                    s["hasRelic"] or s["phase"] in ["escape", "complete"] for s in reel
                ),
                str([s["phase"] for s in reel]),
            )
            p.keyboard.press("z")
            check(
                "Any input exits attract to title",
                state(p)["status"] == "title" and not state(p)["attract"],
                str(state(p)),
            )
            audio = p.evaluate("window.__GG.offlineAudio()")
            (ART / "audio-levels.json").write_text(json.dumps(audio, indent=2))
            check(
                "Procedural audio produces a signal",
                all(v["rms"] > 0.0001 and v["peak"] > 0 for v in audio.values())
                and audio["music"]["gain"] == 0.1,
                str(audio),
            )
            check(
                "No graphics device loss",
                p.evaluate("!window.__deviceLoss"),
                str(p.evaluate("window.__deviceLoss||null")),
            )
            check(
                "No runtime exceptions",
                not page_errors and not p.evaluate("window.__gameError||null"),
                str(page_errors),
            )
            selection = json.loads((ROOT / "selection.json").read_text())
            p.goto((ROOT.parent / (selection["slug"] + ".html")).as_uri() + "?test=1")
            p.wait_for_function(
                "window.__gameReady || window.__gameError", timeout=90000
            )
            check(
                "Export runs directly from file URL",
                p.evaluate("!!window.__gameReady && !window.__gameError"),
            )
        finally:
            ctx.close()

    def gamepad():
        ctx = context(browser)
        p = ctx.new_page()
        ctx.add_init_script(
            """window.__virtualPad={index:0,id:'Test DualSense',connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:0};navigator.getGamepads=()=>[window.__virtualPad];"""
        )
        try:
            load(p)
            p.evaluate("window.__virtualPad.buttons[0]={pressed:true,value:1}")
            p.wait_for_function(
                'window.__GG.snapshot().status==="playing"', timeout=15000
            )
            p.evaluate(
                "window.__virtualPad.buttons[0]={pressed:false,value:0};window.__virtualPad.axes[0]=.9"
            )
            p.wait_for_function("window.__GG.input().mx>.5")
            inp = p.evaluate("window.__GG.input()")
            p.evaluate("(i)=>window.__GG.advance(30,{0:i})", inp)
            check(
                "Standard gamepad starts and moves explorer",
                state(p)["input"] == "pad" and state(p)["players"][0]["x"] > 1,
            )
            check(
                "PlayStation prompts follow controller input",
                "□" in p.locator("#controls").inner_text(),
            )
            p.evaluate(
                "window.__virtualPad.axes[0]=0;window.__virtualPad.buttons[9]={pressed:true,value:1}"
            )
            p.wait_for_function('window.__GG.snapshot().screen==="pause"')
            p.evaluate("window.__virtualPad.buttons[9]={pressed:false,value:0}")
            check("Options opens controller pause menu", state(p)["screen"] == "pause")
            p.get_by_role("button", name="Settings", exact=True).click()
            p.locator("#glyph-choice").select_option("Xbox")
            p.evaluate("window.__virtualPad.axes[2]=.5")
            p.wait_for_function('window.__GG.snapshot().input==="pad"')
            check(
                "Xbox option replaces face glyphs",
                "X" in p.locator("#controls").inner_text()
                and "RT" in p.locator("#controls").inner_text(),
            )
            p.evaluate(
                'window.__virtualPad.axes[2]=0;window.__GG.openMenu("about","pause");window.__virtualPad.axes[3]=.85'
            )
            p.wait_for_function(
                'document.querySelector(".credits-scroll").scrollTop>50', timeout=10000
            )
            check(
                "Right stick scrolls all credits fields",
                p.locator(".credits-scroll").evaluate("(el)=>el.scrollTop>50"),
            )
            p.evaluate(
                "window.__virtualPad.axes[2]=0;window.__virtualPad.axes[3]=0;window.__GG.closeMenu();window.__GG.start(true);window.__extraPads=[1,2,3].map(index=>({...window.__virtualPad,index,axes:[0,0,0,0],buttons:Array.from({length:17},(_,i)=>({pressed:index>1&&i===0,value:index>1&&i===0?1:0}))}));navigator.getGamepads=()=>[window.__virtualPad,...window.__extraPads]"
            )
            p.wait_for_function(
                "window.__GG.snapshot().players.length===4", timeout=15000
            )
            check(
                "Four standard gamepads support four couch explorers",
                len(state(p)["players"]) == 4,
            )
        finally:
            ctx.close()

    def touch():
        ctx = context(browser, has_touch=True, is_mobile=True, device_scale_factor=1)
        p = ctx.new_page()
        try:
            load(p)
            p.get_by_role("button", name="Begin expedition", exact=True).tap()
            check(
                "Touch starts the same expedition",
                state(p)["status"] == "playing" and state(p)["input"] == "touch",
            )
            cdp = ctx.new_cdp_session(p)
            cdp.send(
                "Input.dispatchTouchEvent",
                {"type": "touchStart", "touchPoints": [{"x": 180, "y": 540, "id": 1}]},
            )
            cdp.send(
                "Input.dispatchTouchEvent",
                {"type": "touchMove", "touchPoints": [{"x": 230, "y": 490, "id": 1}]},
            )
            p.wait_for_function("window.__GG.input().mx>.5")
            inp = p.evaluate("window.__GG.input()")
            p.evaluate("(i)=>window.__GG.advance(30,{0:i})", inp)
            check(
                "Invisible touch stick moves explorer", state(p)["players"][0]["x"] > 1
            )
            cdp.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchStart",
                    "touchPoints": [
                        {"x": 230, "y": 490, "id": 1},
                        {"x": 1000, "y": 460, "id": 2},
                    ],
                },
            )
            check(
                "Touch supports two simultaneous contacts",
                p.evaluate("window.__GG.input().touch")
                and p.evaluate("window.__GG.input().whip"),
            )
            cdp.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )
            p.evaluate("window.__GG.warp(0,0,-14);window.__GG.advance(1)")
            p.locator("#context-button").tap()
            p.evaluate(
                "(i)=>window.__GG.advance(1,{0:i})", p.evaluate("window.__GG.input()")
            )
            check(
                "Touch context button engages grapple",
                state(p)["players"][0]["grapple"],
            )
            check(
                "Touch layout hides control clutter",
                p.locator("#controls").is_hidden()
                and p.locator("#pause-button").is_visible(),
            )
            p.evaluate(
                'window.__GG.start();window.__GG.dev("warp-escape");window.__GG.warp(0,21,-52);window.__GG.advance(20);window.__GG.advance(120,{0:{mx:0,mz:.45,touch:true,sprint:true}})'
            )
            check(
                "Touch assist carries partial stick input across the escape gap",
                state(p)["players"][0]["z"] > -44 and state(p)["players"][0]["hp"] == 6,
                str(state(p)["players"][0]),
            )
        finally:
            ctx.close()

    def hub():
        ctx = context(browser)
        p = ctx.new_page()
        try:
            for players, scenario in [
                (2, "standard"),
                (4, "standard"),
                (4, "host-leave"),
                (2, "server"),
            ]:
                p.goto(
                    BASE
                    + f"/harness.html?game=game.html&players={players}&latency=150&jitter=50&loss=5&auto=1&play=4000&scenario={scenario}"
                )
                p.wait_for_function("window.__hubCheck?.done", timeout=120000)
                report = p.evaluate("window.__hubCheck")
                (ART / f"hub-{players}-{scenario}.json").write_text(
                    json.dumps(report, indent=2)
                )
                for c in report["checks"]:
                    check(
                        f"AI Hub {players} {scenario}: " + c["name"],
                        c["pass"],
                        c.get("detail", ""),
                    )
                check(
                    f"AI Hub {players} {scenario} overall",
                    report["pass"],
                    json.dumps([c for c in report["checks"] if not c["pass"]]),
                )
        finally:
            ctx.close()

    def network_gameplay():
        ctx = context(browser)
        p = ctx.new_page()
        try:
            p.goto(
                BASE
                + "/harness.html?game=game.html%3Ftest%3D1&players=2&latency=80&jitter=20&loss=0"
            )
            p.wait_for_function(
                "document.querySelectorAll('iframe').length===2 && Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow.__gameReady)",
                timeout=90000,
            )
            p.locator("#release").click()
            p.wait_for_function(
                "Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow.AIHub.time()>=0)",
                timeout=20000,
            )
            frames = [f for f in p.frames if f.parent_frame]
            host = next(f for f in frames if f.evaluate("AIHub.isHost"))
            guest = next(f for f in frames if not f.evaluate("AIHub.isHost"))
            host.evaluate("window.__GG.advance(20)")
            start = host.evaluate("window.__GG.snapshot().players[1].x")
            guest.evaluate(
                "window.dispatchEvent(new KeyboardEvent('keydown',{key:'d',code:'KeyD'}))"
            )
            host.wait_for_function(
                "window.__GG.netInputs()[1]?.mx>.9 && window.__GG.netInputs()[1].age<500",
                timeout=15000,
            )
            movement = host.evaluate(
                "({input:window.__GG.netInputs(),before:window.__GG.snapshot().players,after:window.__GG.advance(30).players})"
            )
            (ART / "network-input.json").write_text(json.dumps(movement, indent=2))
            guest.evaluate(
                "window.dispatchEvent(new KeyboardEvent('keyup',{key:'d',code:'KeyD'}))"
            )
            check(
                "Remote ordinary input moves the correct shared-world seat",
                host.evaluate("window.__GG.snapshot().players[1].x") > start + 1,
                str(movement),
            )
            p.wait_for_timeout(300)
            host.evaluate("window.__GG.warp(1,-6,-33.7);window.__GG.advance(1)")
            p.wait_for_timeout(300)
            guest.evaluate(
                "window.dispatchEvent(new KeyboardEvent('keydown',{key:'e',code:'KeyE'}));window.dispatchEvent(new KeyboardEvent('keyup',{key:'e',code:'KeyE'}))"
            )
            success = False
            for _ in range(25):
                p.wait_for_timeout(60)
                host.evaluate("window.__GG.advance(1)")
                if host.evaluate("window.__GG.snapshot().mirrors[0].rotation===1"):
                    success = True
                    break
            check("Remote interaction rotates host-authoritative sun lens", success)
            p.wait_for_function(
                "Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow.__GG.snapshot().mirrors[0].rotation===1)",
                timeout=10000,
            )
            check("Shared puzzle state reaches both clients", True)
            # A complete ordinary-action run on the host must finish the hub round as a team win.
            report = host.evaluate((ROOT / "tests/playthrough.js").read_text())
            (ART / "online-playthrough.json").write_text(json.dumps(report, indent=2))
            p.wait_for_function(
                "Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow.__GG.snapshot().hub.ended)",
                timeout=15000,
            )
            check(
                "Whole online expedition ends every seat with a team win",
                report["final"]["status"] == "won" and report["final"]["hasRelic"],
            )
        finally:
            ctx.close()

    def delivery():
        ctx = browser.new_context(
            ignore_https_errors=True, viewport={"width": 1280, "height": 720}
        )
        p = ctx.new_page()
        requests = []
        p.on("request", lambda request: requests.append(request.url))
        try:
            selection = json.loads((ROOT / "selection.json").read_text())
            p.goto(
                (ROOT.parent / (selection["slug"] + ".html")).as_uri() + "?test=1",
                wait_until="domcontentloaded",
            )
            p.wait_for_function(
                "window.__gameReady || window.__gameError", timeout=120000
            )
            s = state(p)
            check(
                "Export starts from file URL using actual CDN dependencies",
                s["status"] == "title"
                and s["renderer"] == "WebGPU"
                and not p.evaluate("window.__gameError||null"),
                str(s),
            )
            p.get_by_role("button", name="About & credits", exact=True).click(
                timeout=5000
            )
            p.get_by_role("button", name="Testing feedback", exact=True).click()
            text = p.locator(".credits-scroll").inner_text()
            check(
                "Exported credits contain final testing feedback",
                "112/112" in text and "6 game/UI/integration defects" in text,
            )
            (ART / "delivery.json").write_text(
                json.dumps(
                    {"requests": requests, "state": s, "credits": text}, indent=2
                )
            )
        finally:
            ctx.close()

    def visual():
        ctx = context(browser)
        p = ctx.new_page()
        p.set_viewport_size({"width": 1920, "height": 1080})
        try:
            load(p, "?test=1&webgl=1")
            p.mouse.move(3, 3)
            p.screenshot(path=ART / "title.png")
            check(
                "Title menu remains within the television viewport",
                p.locator(".title-menu").bounding_box()["y"] >= 0,
            )
            p.evaluate("window.__GG.start();window.__GG.advance(10)")
            p.evaluate("window.__GG.render()")
            p.screenshot(path=ART / "approach.png")
            for stage in ["puzzle", "vault", "escape"]:
                p.evaluate('(s)=>window.__GG.dev("warp-"+s)', stage)
                p.evaluate("window.__GG.advance(20);window.__GG.render()")
                p.screenshot(path=ART / (stage + ".png"))
            p.evaluate(
                "window.__GG.warp(0,21,20);window.__GG.advance(1);window.__GG.render()"
            )
            p.screenshot(path=ART / "victory.png")
            p.evaluate("window.__GG.openMenu('dev','pause')")
            p.screenshot(path=ART / "developer.png")
            check(
                "Developer panel has seven balance sliders",
                p.locator("input[type=range]").count() == 7,
            )
            p.set_viewport_size({"width": 844, "height": 390})
            p.evaluate("window.__GG.openMenu('title')")
            p.screenshot(path=ART / "landscape-menu.png")
            check(
                "Landscape title controls fit the viewport",
                p.locator("[data-action=about]").bounding_box()["y"]
                + p.locator("[data-action=about]").bounding_box()["height"]
                <= 390,
            )
            p.set_viewport_size({"width": 390, "height": 844})
            p.evaluate("window.__GG.openMenu('title')")
            p.screenshot(path=ART / "portrait-menu.png")
            check(
                "Portrait title controls fit the viewport",
                p.locator("[data-action=about]").bounding_box()["y"]
                + p.locator("[data-action=about]").bounding_box()["height"]
                <= 844,
            )
            check(
                "Visual render has no runtime error",
                not p.evaluate("window.__gameError||window.__deviceLoss||null"),
            )
        finally:
            ctx.close()

    if args.suite in ["core", "all"]:
        case("package integrity", static_files)
        case("core expedition", core)
        case("gamepad input", gamepad)
        case("touch input", touch)
    if args.suite in ["hub", "all"]:
        case("hub conformance", hub)
        case("shared world gameplay", network_gameplay)
    if args.suite in ["delivery", "all"]:
        case("export delivery", delivery)
    if args.suite in ["visual", "all"]:
        browser.close()
        browser = pw.chromium.launch(
            channel="chromium",
            headless=True,
            args=[
                "--no-sandbox",
                "--enable-unsafe-swiftshader",
                "--use-angle=swiftshader",
            ],
        )
        case("visual inspection", visual)
    browser.close()
server.shutdown()
server.server_close()
report = {
    "suite": args.suite,
    "count": len(results),
    "passed": sum(r["pass"] for r in results),
    "failed": sum(not r["pass"] for r in results),
    "results": results,
}
(ART / f"test-results-{args.suite}.json").write_text(json.dumps(report, indent=2))
print(
    f"{report['passed']}/{report['count']} checks passed; {report['failed']} failures.",
    flush=True,
)
sys.exit(1 if report["failed"] else 0)
