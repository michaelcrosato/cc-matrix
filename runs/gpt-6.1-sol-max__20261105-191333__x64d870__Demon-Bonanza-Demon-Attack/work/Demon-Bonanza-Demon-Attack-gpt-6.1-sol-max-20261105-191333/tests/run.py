#!/usr/bin/env python3
"""One-command deterministic simulation + browser + official Hub integration suite."""

import json
import subprocess
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT.parent
SLUG = ROOT.name
ART = ROOT / "tests" / "artifacts"
ART.mkdir(exist_ok=True)
failures = []
checks = 0
CAPTURE_IMAGES = "--screenshots" in sys.argv
ONLY_PEER = "--peer" in sys.argv


def check(name, fn):
    global checks
    if ONLY_PEER and name != "Standalone WebRTC two-device shared-world co-op":
        return
    checks += 1
    (ART / "progress.json").write_text(
        json.dumps({"running": name, "checks": checks, "failures": failures})
    )
    try:
        fn()
    except Exception as e:  # noqa: BLE001 - collect every independent test failure
        failures.append(f"{name}: {e}")


def expect(v, message):
    if not v:
        raise AssertionError(message)


def metadata_test():
    data = json.loads((WORK / "exit-interview.json").read_text())
    expect(
        set(data)
        == {
            "sourceInformation",
            "testingFeedback",
            "engineFeedback",
            "promptFeedback",
            "aiHub",
        },
        "exit interview root shape",
    )
    expect(
        set(data["sourceInformation"])
        == {
            "date",
            "source",
            "plan",
            "genre",
            "perspective",
            "tech",
            "artDirection",
            "animation",
            "audio",
            "online",
            "testing",
            "research",
            "environment",
            "model",
            "usage",
        },
        "source information fields",
    )
    expect(data["sourceInformation"]["usage"] == "added on import", "usage value")
    for key, length in [
        ("testingFeedback", 4),
        ("engineFeedback", 6),
        ("promptFeedback", 4),
    ]:
        expect(
            len(data[key]) == length
            and all(isinstance(x, str) and x for x in data[key]),
            key + " shape",
        )
    expect(
        data["aiHub"]["name"] == "Demon Bonanza" and data["aiHub"]["type"] == "Game",
        "catalogue identity",
    )


check("Exit interview JSON shape and complete values", metadata_test)

result = subprocess.run(
    ["node", str(ROOT / "tests/core.mjs")],
    capture_output=True,
    text=True,
    cwd=ROOT,
    check=False,
)
(ART / "core-stderr.log").write_text(result.stderr)
(ART / "core-stdout.log").write_text(result.stdout)
try:
    core = json.loads(result.stdout.strip().splitlines()[-1])
    checks += core["count"]
    failures.extend(core["failures"])
    (ART / "core-result.json").write_text(json.dumps(core, indent=2))
except (ValueError, IndexError, KeyError):
    failures.append("Core suite could not run: " + result.stderr[-1800:])


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WORK), **kwargs)


server = ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
origin = f"http://127.0.0.1:{server.server_port}"
url = f"{origin}/{SLUG}.html"
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=[
            "--enable-unsafe-webgpu",
            "--enable-features=Vulkan",
            "--use-webgpu-adapter=swiftshader",
            "--disable-vulkan-surface",
            "--ignore-certificate-errors",
        ],
    )
    context = browser.new_context(
        viewport={"width": 1600, "height": 1000}, ignore_https_errors=True
    )
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))

    def load():
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_function(
            "window.__bonanza?.ready || window.__bonanzaError", timeout=90000
        )
        expect(page.title().startswith("Demon Bonanza"), "wrong page on server")
        expect(
            page.evaluate("!!window.__bonanza?.ready"),
            page.evaluate("window.__bonanzaError") or "game not ready",
        )
        expect(
            page.evaluate("__bonanza.state.screen") == "title", "title did not appear"
        )

    check("Browser startup and page identity", load)
    if page.evaluate("!!window.__bonanza"):
        check(
            "WebGPU renderer selected",
            lambda: expect(
                page.evaluate("__bonanza.state.backend") == "WebGPU",
                "not running WebGPU",
            ),
        )
        check(
            "WebGPU submitted scene geometry",
            lambda: expect(
                page.evaluate("__bonanza.graphics.renderer.info.render.drawCalls>0"),
                "no GPU draw calls",
            ),
        )
        check(
            "10 percent default music",
            lambda: expect(
                page.evaluate("__bonanza.state.music") == 0.1, "music default wrong"
            ),
        )

        def credits_match():
            data = json.loads((WORK / "exit-interview.json").read_text())
            actual = page.evaluate("__bonanza.credits")
            expect(
                actual
                == {
                    key: data[key]
                    for key in [
                        "sourceInformation",
                        "testingFeedback",
                        "engineFeedback",
                        "promptFeedback",
                    ]
                },
                "packaged About differs from exit interview",
            )

        check("Packaged credits match exit interview", credits_match)

        def shot():
            page.get_by_role("button", name="Start expedition", exact=True).click()
            page.keyboard.down("Space")
            page.wait_for_timeout(800)
            page.keyboard.up("Space")
            expect(
                page.evaluate("__bonanza.game.stats.shots") > 0, "keyboard did not fire"
            )
            page.keyboard.down("KeyD")
            page.wait_for_timeout(300)
            page.keyboard.up("KeyD")
            expect(page.evaluate("__bonanza.game.players[0].x") > 1, "movement failed")

        check("Keyboard shooting and movement", shot)

        def pause_test():
            page.keyboard.press("Escape")
            expect(
                page.evaluate("__bonanza.state.screen") == "pause", "pause menu absent"
            )
            before = page.evaluate("__bonanza.game.time")
            page.wait_for_timeout(250)
            expect(
                page.evaluate("__bonanza.game.time") == before,
                "solo simulation advances while paused",
            )
            page.get_by_role("button", name="Development lab", exact=True).click()
            page.get_by_role("slider", name="Cannon speed", exact=True).fill("18")
            expect(
                page.evaluate("__bonanza.game.tuning.playerSpeed") == 18,
                "live tuning failed",
            )
            page.get_by_role("button", name="Reset defaults", exact=True).click()
            expect(
                page.evaluate("__bonanza.game.tuning.playerSpeed") == 12,
                "defaults not restored",
            )
            page.get_by_role("button", name="Resume expedition", exact=True).click()

        check("Pause, live sliders and reset", pause_test)

        def audio_test():
            probe = page.evaluate("__bonanza.synthProbe()")
            expect(probe.get("rms", 0) > 0.005, "offline audio is silent")
            expect(0 < probe.get("peak", 0) < 1, "audio clips or is silent")
            (ART / "audio-result.json").write_text(json.dumps(probe, indent=2))

        check("Procedural effects and gibberish signal", audio_test)

        def controller():
            try:
                page.evaluate(
                    """window.testPad={id:'DualSense test',index:0,connected:true,mapping:'standard',axes:[1,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0,touched:false}))};navigator.getGamepads=()=>[window.testPad];window.testPad.buttons[7]={pressed:true,value:1};"""
                )
                x = page.evaluate("__bonanza.game.players[0].x")
                page.wait_for_timeout(350)
                expect(
                    page.evaluate("__bonanza.state.inputMode") == "gamepad",
                    "controller prompts not selected",
                )
                expect(
                    page.evaluate("__bonanza.game.players[0].x") > x,
                    "stick did not move",
                )
                page.evaluate(
                    "testPad.axes[0]=0;testPad.buttons[7]={pressed:false,value:0};testPad.buttons[9]={pressed:true,value:1}"
                )
                page.wait_for_function(
                    "__bonanza.state.screen==='pause'", timeout=10000
                )
                expect(
                    page.evaluate("__bonanza.state.screen") == "pause",
                    "Options did not pause",
                )
                page.evaluate("testPad.buttons[9]={pressed:false,value:0}")
                page.get_by_role("button", name="Settings", exact=True).click()
                page.get_by_role(
                    "button", name="PlayStation × ○ □ △", exact=True
                ).click()
                expect(
                    page.get_by_role("button", name="Xbox A B X Y", exact=True).count()
                    == 1,
                    "Xbox setting did not apply",
                )
                page.evaluate("navigator.getGamepads=()=>[]")
                page.keyboard.press("Escape")
                page.keyboard.press("Escape")
            finally:
                page.evaluate("navigator.getGamepads=()=>[];__bonanza.title()")

        check("Emulated standard gamepad and glyph settings", controller)

        def couch():
            page.evaluate("__bonanza.title()")
            page.get_by_role("button", name="Bring a partner", exact=True).click()
            page.get_by_role(
                "button", name="Couch co-op · 2 players", exact=True
            ).click()
            expect(
                page.evaluate("__bonanza.game.players.length") == 2,
                "second player missing",
            )
            page.keyboard.down("KeyK")
            page.keyboard.down("KeyL")
            page.wait_for_function("__bonanza.game.players[1].x>3", timeout=10000)
            page.keyboard.up("KeyK")
            page.keyboard.up("KeyL")
            expect(
                page.evaluate("__bonanza.game.players[1].x") > 3,
                "second keyboard cannon not moving",
            )
            expect(
                page.evaluate(
                    '[...__bonanza.game.entities.values()].some(e=>e.kind==="shot"&&e.owner===1)'
                ),
                "P2 not firing",
            )

        check("Couch co-op second keyboard", couch)

        def attract_test():
            page.evaluate(
                "__bonanza.title();__bonanza.input.lastInput=performance.now()-10050"
            )
            page.wait_for_function("__bonanza.state.attract", timeout=10000)
            expect(
                page.evaluate("__bonanza.state.attract"),
                "inactivity did not enter demo",
            )
            expect(
                page.evaluate("__bonanza.game.bot&&__bonanza.game.god"),
                "attract bot not invulnerable",
            )
            page.keyboard.press("KeyQ")
            page.wait_for_timeout(100)
            expect(
                page.evaluate("__bonanza.state.screen") == "title",
                "input did not leave demo",
            )

        check("Ten-second attract and input exit", attract_test)

        def credit_test():
            page.get_by_role("button", name="About & credits", exact=True).click()
            for name in [
                "Source Information",
                "Testing Feedback",
                "Engine Feedback",
                "Prompt Feedback",
            ]:
                page.get_by_role("button", name=name, exact=True).click()
                if name == "Source Information" and page.locator(".panel").evaluate(
                    "(e)=>e.scrollHeight>e.clientHeight"
                ):
                    page.evaluate(
                        "window.scrollPad={id:'Menu pad',index:0,connected:true,mapping:'standard',axes:[0,0,0,1],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[scrollPad]"
                    )
                    try:
                        page.wait_for_function(
                            "document.querySelector('.panel').scrollTop>0",
                            timeout=10000,
                        )
                    finally:
                        page.evaluate("navigator.getGamepads=()=>[]")
                expect(
                    page.locator(".credits-page").inner_text().strip(),
                    "empty credits tab",
                )
            page.keyboard.press("Escape")

        check("All required About and feedback screens", credit_test)
        if CAPTURE_IMAGES:
            page.goto(url + "?renderer=webgl", wait_until="domcontentloaded")
            page.wait_for_function("window.__bonanza?.ready", timeout=90000)
            page.screenshot(path=str(ART / "title-desktop.png"))
            page.evaluate(
                "__bonanza.start(1);__bonanza.game.god=true;__bonanza.game.beginWave(4);__bonanza.game.bot=true"
            )
            page.wait_for_timeout(4400)
            page.evaluate(
                "__bonanza.advance(5);__bonanza.game.players.forEach(p=>p.invul=0)"
            )
            page.wait_for_timeout(180)
            page.screenshot(path=str(ART / "game-desktop.png"))
            page.evaluate(
                "__bonanza.game.beginWave(5);__bonanza.advance(3);__bonanza.game.players.forEach(p=>p.invul=0)"
            )
            page.wait_for_timeout(3800)
            page.screenshot(path=str(ART / "boss-desktop.png"))
        # Prevent the desktop tab's automatic blur-pause from changing follow-up state.
        page.evaluate("__bonanza.title()")

        def mobile_test():
            mobile = browser.new_context(
                viewport={"width": 390, "height": 844},
                is_mobile=True,
                has_touch=True,
                device_scale_factor=1,
                ignore_https_errors=True,
            )
            mp = mobile.new_page()
            mp.on("pageerror", lambda e: errors.append(str(e)))
            try:
                mp.goto(url, wait_until="domcontentloaded")
                mp.wait_for_function("window.__bonanza?.ready", timeout=90000)
                mp.get_by_role("button", name="Start expedition", exact=True).tap()
                mp.wait_for_function("__bonanza.game.stats.shots>0", timeout=10000)
                expect(
                    mp.evaluate("__bonanza.state.inputMode") == "touch",
                    "touch mode not selected",
                )
                expect(
                    mp.evaluate("__bonanza.game.stats.shots") > 0,
                    "touch automatic fire absent",
                )
                mp.evaluate(
                    """window.dispatchEvent(new PointerEvent('pointerdown',{pointerId:81,pointerType:'touch',clientX:90,clientY:650}));window.dispatchEvent(new PointerEvent('pointermove',{pointerId:81,pointerType:'touch',clientX:150,clientY:650}));"""
                )
                mp.wait_for_function("__bonanza.game.players[0].x>0", timeout=10000)
                expect(
                    mp.evaluate("__bonanza.game.players[0].x") > 0,
                    "invisible thumb control failed",
                )
                expect(
                    mp.evaluate("__bonanza.game.stats.dashes") > 0,
                    "quick swipe did not dash",
                )
                mp.evaluate(
                    "window.dispatchEvent(new PointerEvent('pointerup',{pointerId:81,pointerType:'touch'}))"
                )
                if CAPTURE_IMAGES:
                    mp.goto(url + "?renderer=webgl", wait_until="domcontentloaded")
                    mp.wait_for_function("window.__bonanza?.ready", timeout=90000)
                    mp.screenshot(path=str(ART / "title-mobile.png"))
                    mp.get_by_role("button", name="Start expedition", exact=True).tap()
                    mp.wait_for_timeout(4000)
                    mp.evaluate("__bonanza.game.players.forEach(p=>p.invul=0)")
                    mp.wait_for_timeout(150)
                    mp.screenshot(path=str(ART / "game-mobile.png"))
                mp.get_by_role("button", name="Pause game").tap()
                expect(
                    mp.evaluate("__bonanza.state.screen") == "pause",
                    "touch pause inaccessible",
                )
            finally:
                mobile.close()

        check("Phone touch play and pause", mobile_test)
    check(
        "No unhandled browser errors",
        lambda: expect(not errors, " | ".join(errors[:5])),
    )
    context.close()

    def file_test():
        fc = browser.new_context(
            viewport={"width": 1280, "height": 720}, ignore_https_errors=True
        )
        fp = fc.new_page()
        try:
            fp.goto((WORK / (SLUG + ".html")).as_uri(), wait_until="domcontentloaded")
            fp.wait_for_function(
                "window.__bonanza?.ready || window.__bonanzaError", timeout=90000
            )
            expect(
                fp.evaluate("!!window.__bonanza?.ready"),
                "file URL initialization failed",
            )
            expect(
                fp.evaluate("__bonanza.state.backend") == "WebGPU",
                "file URL did not use WebGPU",
            )
            fp.get_by_role("button", name="Start expedition", exact=True).click()
            fp.keyboard.down("Space")
            fp.wait_for_function("__bonanza.game.stats.shots>0", timeout=10000)
            fp.keyboard.up("Space")
            expect(
                fp.evaluate("__bonanza.game.stats.shots") > 0, "file URL cannot play"
            )
        finally:
            fc.close()

    check("Single HTML runs directly from file URL", file_test)

    def peer_test():
        host_context = browser.new_context(
            viewport={"width": 960, "height": 640}, ignore_https_errors=True
        )
        join_context = browser.new_context(
            viewport={"width": 960, "height": 640}, ignore_https_errors=True
        )
        host = host_context.new_page()
        join = join_context.new_page()
        stage = "loading"
        try:
            for tab in [host, join]:
                tab.goto(url + "?renderer=webgl", wait_until="domcontentloaded")
                tab.wait_for_function("window.__bonanza?.ready", timeout=90000)
            offer = host.evaluate("__bonanza.network.offer()")
            answer = join.evaluate("(code)=>__bonanza.network.answer(code)", offer)
            host.evaluate("(code)=>__bonanza.network.accept(code)", answer)
            host.wait_for_function(
                "__bonanza.state.net.active && __bonanza.game.players.length===2",
                timeout=20000,
            )
            join.wait_for_function(
                "__bonanza.state.entities.length>1 && __bonanza.state.net.received>0",
                timeout=20000,
            )
            expect(
                host.evaluate("__bonanza.state.net.authority")
                and not join.evaluate("__bonanza.state.net.authority"),
                "authority incorrect",
            )
            stage = "remote input"
            join.bring_to_front()
            join.keyboard.down("KeyD")
            join.keyboard.down("Space")
            host.wait_for_function(
                "__bonanza.game.players[1].x>3 && [...__bonanza.game.entities.values()].some(e=>e.kind==='shot'&&e.owner===1)",
                timeout=15000,
            )
            join.keyboard.up("KeyD")
            join.keyboard.up("Space")
            expect(
                host.evaluate("__bonanza.game.players[1].x") > 3,
                "peer input did not move host body",
            )
            expect(
                host.evaluate(
                    '[...__bonanza.game.entities.values()].some(e=>e.kind==="shot"&&e.owner===1)'
                ),
                "peer fire absent from shared world",
            )
            expect(
                host.evaluate("__bonanza.state.net.received") > 0
                and join.evaluate("__bonanza.state.net.received") > 0,
                "one-way network",
            )
            stage = "shared upgrade"
            host.evaluate('__bonanza.game.phase="upgrade"')
            join.wait_for_function('__bonanza.state.phase==="upgrade"', timeout=10000)
            join.evaluate('__bonanza.network.chooseUpgrade("cool")')
            host.wait_for_function("__bonanza.game.upgrades.cool===1", timeout=10000)
            stage = "game over screen"
            host.evaluate("__bonanza.game.lives=-1;__bonanza.game.update()")
            join.wait_for_function('__bonanza.state.screen==="gameover"', timeout=15000)
            stage = "guest restart"
            join.get_by_role("button", name="Try again", exact=True).click()
            host.wait_for_function(
                '__bonanza.game.phase==="playing"&&__bonanza.game.lives===5',
                timeout=15000,
            )
            join.wait_for_function(
                '__bonanza.state.screen==="play"&&__bonanza.state.phase==="playing"',
                timeout=15000,
            )
            stage = "leave to solo"
            join.evaluate("__bonanza.title();__bonanza.start(1)")
            join.keyboard.down("Space")
            join.wait_for_function(
                "__bonanza.game.stats.shots>0&&__bonanza.game.time>.25", timeout=15000
            )
            join.keyboard.up("Space")
            expect(
                join.evaluate("__bonanza.state.net.authority")
                and join.evaluate("__bonanza.state.net.kind") == "solo",
                "leaving peer play did not restore solo authority",
            )
        except PlaywrightError as error:
            raise AssertionError(stage + ": " + str(error)) from error
        finally:
            details = {"stage": stage}
            for name, tab in [("host", host), ("guest", join)]:
                try:
                    details[name] = tab.evaluate(
                        "({state:__bonanza.state,keys:[...__bonanza.input.keys],inputs:[...__bonanza.game.inputs],connection:__bonanza.network.peer?.connectionState,channel:__bonanza.network.channel?.readyState})"
                    )
                except PlaywrightError as error:
                    details[name] = {"inspection": str(error)}
            (ART / "peer-state.json").write_text(json.dumps(details, indent=2))
            host_context.close()
            join_context.close()

    check("Standalone WebRTC two-device shared-world co-op", peer_test)
    for scenario, players, conditions in [
        ("standard", 2, ""),
        ("standard", 4, "&latency=150&jitter=50&loss=5"),
        ("host-leave", 4, "&latency=150&jitter=50&loss=5"),
        ("server", 2, ""),
    ]:

        def hub_test(scenario=scenario, players=players, conditions=conditions):
            hc = browser.new_context(
                viewport={"width": 1600, "height": 1000}, ignore_https_errors=True
            )
            hp = hc.new_page()
            try:
                harness = (
                    f"{origin}/{SLUG}/vendor/harness.html?game=../../{SLUG}.html&players={players}&scenario={scenario}&auto=1&play=4500&limit=30"
                    + conditions
                )
                hp.goto(harness, wait_until="domcontentloaded", timeout=60000)
                hp.wait_for_function(
                    'document.body.dataset.complete==="true"', timeout=150000
                )
                report = hp.evaluate("window.__hubCheck")
                (ART / f"hub-{scenario}-{players}.json").write_text(
                    json.dumps(report, indent=2)
                )
                details = []
                for f in hp.frames:
                    try:
                        details.append(
                            f.evaluate(
                                "({url:location.href,error:window.__bonanzaError,ready:!!window.__bonanza,backend:window.__bonanza?.state.backend,recovery:window.__bonanza?.graphics.recovery})"
                            )
                        )
                    except PlaywrightError as error:
                        details.append({"inspection": str(error)})
                (ART / f"hub-frames-{scenario}-{players}.json").write_text(
                    json.dumps(details, indent=2)
                )
                bad = [
                    c["name"] + ": " + c.get("detail", "")
                    for c in report["checks"]
                    if not c["pass"]
                ]
                expect(report["pass"], "; ".join(bad))
            finally:
                hc.close()

        check(f"Official Hub harness {scenario} / {players} seats", hub_test)
    browser.close()

    def webkit_test():
        wb = p.webkit.launch(headless=True)
        wc = wb.new_context(
            viewport={"width": 1280, "height": 720}, ignore_https_errors=True
        )
        wp = wc.new_page()
        wk_errors = []
        wp.on("pageerror", lambda e: wk_errors.append(str(e)))
        try:
            wp.goto(url, wait_until="domcontentloaded")
            wp.wait_for_function(
                "window.__bonanza?.ready || window.__bonanzaError", timeout=90000
            )
            expect(
                wp.evaluate("!!window.__bonanza?.ready"),
                wp.evaluate("window.__bonanzaError") or "WebKit startup failed",
            )
            wp.get_by_role("button", name="Start expedition", exact=True).click()
            wp.keyboard.down("Space")
            wp.wait_for_function("__bonanza.game.stats.shots>0", timeout=20000)
            wp.keyboard.up("Space")
            expect(wp.evaluate("__bonanza.game.stats.shots") > 0, "WebKit cannot fire")
        finally:
            try:
                (ART / "webkit-state.json").write_text(
                    json.dumps(
                        {
                            "state": wp.evaluate("window.__bonanza?.state"),
                            "keys": wp.evaluate(
                                "window.__bonanza?[...__bonanza.input.keys]:[]"
                            ),
                            "errors": wk_errors,
                        },
                        indent=2,
                    )
                )
            except PlaywrightError as error:
                (ART / "webkit-state.json").write_text(
                    json.dumps({"inspection": str(error), "errors": wk_errors})
                )
            wc.close()
            wb.close()

    check("WebKit compatibility play", webkit_test)
server.shutdown()
server.server_close()
report = {"checks": checks, "failures": failures}
(ART / "test-report.json").write_text(json.dumps(report, indent=2))
for failure in failures:
    print("FAIL " + failure)
print(f"{checks} checks · {len(failures)} failures")
sys.exit(bool(failures))
