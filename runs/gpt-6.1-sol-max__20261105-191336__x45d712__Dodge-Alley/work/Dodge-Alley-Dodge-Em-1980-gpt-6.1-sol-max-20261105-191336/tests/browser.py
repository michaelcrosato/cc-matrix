import functools
import http.server
import json
import os
import threading
import urllib.parse
import urllib.request
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
runtime = root / "tests" / ".runtime"
runtime.mkdir(exist_ok=True)
os.environ["TMPDIR"] = str(runtime)
count = 0
failures = 0
records = []


def check(name, fn):
    global count, failures
    try:
        fn()
        count += 1
        records.append({"name": name, "pass": True})
        (root / "tests/browser-progress.json").write_text(json.dumps(records, indent=2))
        return True
    except Exception as e:  # noqa: BLE001 - Each test failure must be recorded before continuing.
        failures += 1
        records.append({"name": name, "pass": False, "error": str(e)})
        (root / "tests/browser-progress.json").write_text(json.dumps(records, indent=2))
        print(
            "FAIL browser: " + name + " — " + str(e).replace("\n", " ")[:1900],
            flush=True,
        )
        return False


def require(value, message):
    if not value:
        raise AssertionError(str(message))


def state(page):
    return page.evaluate("window.__dodge.state")


def action(page, name):
    page.evaluate("(name)=>window.__dodge.action(name)", name)


def advance(page, seconds):
    return page.evaluate("(s)=>window.__dodge.advance(s)", seconds)


def ready(page, url):
    page.set_default_timeout(9000)
    page.goto(url, wait_until="load")
    try:
        page.wait_for_function("window.__dodge?.ready", timeout=60000)
    except PlaywrightTimeoutError:
        raise AssertionError(
            {
                "status": page.locator("#bootStatus").inner_text(),
                "error": page.locator("#bootError").inner_text(),
            }
        )
    page.evaluate("window.__dodge.idle(-600000)")


def frames(page, n=2):
    current = page.evaluate("window.__dodge.state.debug.inputFrames")
    page.wait_for_function(
        "(target)=>window.__dodge.state.debug.inputFrames>=target",
        arg=current + n,
        timeout=15000,
    )


def click(page, selector):
    page.locator(selector).evaluate("(el)=>el.click()")


def slider(page, selector, value):
    page.locator(selector).evaluate(
        '(el,v)=>{el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}));}',
        str(value),
    )


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = http.server.ThreadingHTTPServer(
    ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(root))
)
server.daemon_threads = True
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
origin = "http://127.0.0.1:" + str(server.server_address[1])
require(
    "<title>Dodge Alley</title>"
    in urllib.request.urlopen(origin + "/index.html").read().decode(),
    "wrong loopback page",
)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--disable-dev-shm-usage",
            ],
        )
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        gpu = context.new_page()
        gpu_errors = []
        gpu.on("pageerror", lambda e: gpu_errors.append(str(e)))

        def gpu_boot():
            ready(gpu, (root / "index.html").as_uri() + "?test=1")
            s = state(gpu)
            require(s["renderer"] == "WebGPU", s)
            require(s["screen"] == "title" and s["renderCount"] > 0, s)
            require(not gpu_errors, gpu_errors)

        check("self-contained file boots with the WebGPU backend", gpu_boot)
        gpu.close()
        page = context.new_page()
        js_errors = []
        page.on("pageerror", lambda e: js_errors.append(str(e)))
        ready(page, (root / "index.html").as_uri() + "?test=1&webgl=1&headless=1")

        def defaults():
            s = state(page)
            require(s["musicVolume"] == 0.1, s["musicVolume"])
            require(s["renderer"] == "WebGL2 fallback", s["renderer"])
            require(page.locator("#title.active").count() == 1, s)
            page.evaluate("window.__dodge.renderOnce()")
            page.screenshot(path=str(root / "tests/title.png"), timeout=45000)
            page.evaluate("window.__dodge.setRendering(false)")

        check("fallback, title layout and 10% music default", defaults)

        def launch():
            action(page, "quit")
            page.locator('#title button[data-action="solo"]').click(force=True)
            advance(page, 7)
            require(state(page)["phase"] == "playing", state(page))
            page.evaluate("window.__dodge.renderOnce()")
            page.screenshot(path=str(root / "tests/game.png"), timeout=45000)
            page.evaluate("window.__dodge.setRendering(false)")

        check("mouse title selection launches the arcade run", launch)

        def keyboard():
            before = state(page)
            page.keyboard.down("a")
            frames(page, 3)
            after = state(page)
            page.keyboard.up("a")
            require(
                after["players"][0]["queueDir"] == 1
                or after["gatesTaken"] > before["gatesTaken"],
                after,
            )
            page.keyboard.down(" ")
            frames(page, 3)
            advance(page, 0.8)
            page.keyboard.up(" ")
            require(state(page)["boostTime"] > 0, state(page))

        check("keyboard buffers a turn and fires turbo", keyboard)

        def pause_freezes():
            page.keyboard.press("Escape")
            before = state(page)
            require(before["screen"] == "pause", before)
            advance(page, 5)
            require(state(page)["elapsed"] == before["elapsed"], state(page))

        check("pause stops the simulation", pause_freezes)
        page.evaluate(
            """() => {window.__pads=[{index:0,id:'DualSense test',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}];Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.__pads});}"""
        )

        def pad_button(n, held=False):
            page.evaluate("(n)=>{__pads[0].buttons[n]={pressed:true,value:1};}", n)
            frames(page, 2)
            if not held:
                page.evaluate("(n)=>{__pads[0].buttons[n]={pressed:false,value:0};}", n)
                frames(page, 2)

        def pad_menus():
            pad_button(13)
            pad_button(0)
            require(state(page)["screen"] == "settings", state(page))
            require(state(page)["lastInput"] == "gamepad", state(page))
            page.locator("#musicVolume").focus()
            pad_button(15)
            require(state(page)["settings"]["music"] == 11, state(page))
            slider(page, "#musicVolume", 10)
            click(page, "#glyphSetting")
            pad_button(14)
            require(
                page.locator("#playPrompts .key.pad").first.inner_text() == "A",
                page.locator("#playPrompts").inner_text(),
            )
            click(page, "#glyphSetting")
            slider(page, "#musicVolume", 10)
            action(page, "back")
            action(page, "resume")
            pad_button(8, True)
            pad_button(9)
            require(state(page)["screen"] == "", state(page))
            page.evaluate("__pads[0].buttons[8]={pressed:false,value:0}")
            pad_button(9)
            require(state(page)["screen"] == "pause", state(page))
            page.evaluate("__pads=[]")

        check(
            "standard controller navigates menus, sliders and reserved chord", pad_menus
        )
        page.evaluate("__pads=[]")

        def developer():
            click(page, "#devButton")
            require(state(page)["screen"] == "dev", state(page))
            slider(page, "#tune-playerSpeed", 16)
            slider(page, "#tune-enemySpeed", 9)
            require(state(page)["tuning"]["playerSpeed"] == 16, state(page))
            click(page, "#godButton")
            click(page, "#autoButton")
            action(page, "repair")
            require(
                state(page)["tuning"]["invincible"]
                and state(page)["tuning"]["autopilot"],
                state(page),
            )
            action(page, "resetTuning")
            require(
                state(page)["tuning"]["playerSpeed"] == 11.5
                and not state(page)["tuning"]["invincible"],
                state(page),
            )
            click(page, "#godButton")
            click(page, "#autoButton")
            action(page, "resume")

        check(
            "garage applies live tuning, repair, assists and default reset", developer
        )

        def campaign():
            advance(page, 500)
            s = state(page)
            require(s["phase"] == "won" and s["screen"] == "results", s)
            require(s["totalCollected"] == 312, s)
            require(s["stage"] == 3 and s["gatesTaken"] >= 9, s)
            require(page.locator("#resultTitle").inner_text() == "CLEAN GETAWAY!", s)
            require(int(page.locator("#resultTokens").inner_text()) == 312, s)

        check("full browser campaign drives and clears all three shifts", campaign)

        def audio():
            result = page.evaluate("window.__dodge.audioProbe()")
            require(
                result["finite"]
                and 0.005 < result["rms"] < 0.6
                and 0.01 < result["peak"] < 1,
                result,
            )
            require(result["duration"] == 2 and result["channels"] == 2, result)
            page.wait_for_timeout(350)
            require(state(page)["audio"]["events"] > 0, state(page)["audio"])
            (root / "tests/audio-probe.json").write_text(json.dumps(result, indent=2))

        check("offline synth music, effects and gibberish produce finite audio", audio)

        def attract_mode():
            action(page, "resultBack")
            page.evaluate("window.__dodge.idle(10001)")
            page.wait_for_function("window.__dodge.state.attract")
            advance(page, 100)
            require(state(page)["totalCollected"] > 104, state(page))
            page.keyboard.press("Enter")
            require(
                state(page)["screen"] == "title" and not state(page)["attract"],
                state(page),
            )

        check("10-second attract mode drives stages and any input exits", attract_mode)

        def about():
            action(page, "about")
            headings = []
            for i in range(7):
                headings.append(page.locator("#aboutHeading").inner_text())
                require(len(page.locator("#aboutContent").inner_text()) > 50, i)
                action(page, "aboutNext")
            require(
                set(headings)
                == {
                    "SOURCE INFORMATION",
                    "TESTING FEEDBACK",
                    "ENGINE FEEDBACK",
                    "PROMPT FEEDBACK",
                },
                headings,
            )
            require(
                page.evaluate("window.__dodge.credits.sourceInformation.usage")
                == "added on import",
                "usage",
            )
            action(page, "back")

        check("About includes all source and feedback pages", about)

        def keypad():
            action(page, "together")
            action(page, "joinRoom")
            for n in "1274":
                click(page, f'button[data-digit="{n}"]')
            require(page.locator("#joinCode").input_value() == "1274", "keypad")
            require(page.locator("#connectRoomButton").is_enabled(), "join button")
            action(page, "erase")
            require(page.locator("#joinCode").input_value() == "127", "erase")
            action(page, "back")
            action(page, "back")

        check("online code entry works entirely with focusable buttons", keypad)

        def couch():
            action(page, "together")
            action(page, "coop")
            page.evaluate("window.__dodge.tune({invincible:false,autopilot:false})")
            advance(page, 3)
            before = state(page)
            require(len(before["players"]) == 2 and before["lives"] == 4, before)
            page.keyboard.down("a")
            page.keyboard.down("ArrowRight")
            frames(page, 3)
            after = state(page)
            page.keyboard.up("a")
            page.keyboard.up("ArrowRight")
            require(
                after["players"][0]["queueDir"] == 1
                or after["players"][0]["lane"] == 1,
                after,
            )
            require(
                after["players"][1]["queueDir"] == -1
                or after["players"][1]["lane"] == 1,
                after,
            )

        check(
            "couch crew has two independently controlled cars and shared lives", couch
        )

        def two_pads():
            page.evaluate(
                """() => {window.__pads=[0,1].map(index=>({index,id:'Standard gamepad '+index,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}));}"""
            )
            before = state(page)
            page.evaluate(
                """() => {__pads[0].axes[0]=-1;__pads[0].buttons[7]={pressed:true,value:1};__pads[1].axes[0]=1;__pads[1].buttons[0]={pressed:true,value:1};}"""
            )
            frames(page, 3)
            after = state(page)
            require(
                after["players"][0]["queueDir"] == 1
                or after["players"][0]["lane"] > before["players"][0]["lane"],
                after,
            )
            require(
                after["players"][1]["queueDir"] == -1
                or after["players"][1]["lane"] < before["players"][1]["lane"],
                after,
            )
            require(after["boostTime"] > before["boostTime"], after)
            page.evaluate("__pads=[]")

        check("two emulated standard gamepads drive separate couch cars", two_pads)
        check(
            "no application JavaScript errors during the full UI flow",
            lambda: require(not js_errors, js_errors),
        )
        page.close()
        context.close()

        # Standalone multiplayer uses actual pages on the same verified loopback origin.
        rooms = browser.new_context(viewport={"width": 960, "height": 600})
        host = rooms.new_page()
        guest = rooms.new_page()
        ready(host, origin + "/index.html?test=1&webgl=1&headless=1")
        ready(guest, origin + "/index.html?test=1&webgl=1&headless=1")

        def room_join():
            host.evaluate("window.__dodge.createRoom()")
            code = state(host)["room"]["code"]
            guest.evaluate("(code)=>window.__dodge.createRoom(code)", code)
            host.wait_for_function("window.__dodge.state.room?.players.length===2")
            guest.wait_for_function("window.__dodge.state.room?.players.length===2")
            require(state(guest)["room"]["connected"], state(guest))
            host.wait_for_function("window.__dodge.state.room.links===1", timeout=30000)
            guest.wait_for_function(
                "window.__dodge.state.room.links===1", timeout=30000
            )
            host.evaluate("window.__dodge.useWebRTCOnly()")
            guest.evaluate("window.__dodge.useWebRTCOnly()")

        joined = check("two standalone pages join the same room", room_join)
        if joined:

            def room_race():
                action(host, "startRoom")
                guest.wait_for_function("window.__dodge.state.runActive")
                advance(host, 4)
                advance(guest, 4)
                host.wait_for_function("window.__dodge.state.room.ghosts===1")
                guest.wait_for_function("window.__dodge.state.room.ghosts===1")
                require(
                    state(host)["mode"] == "attack"
                    and state(guest)["mode"] == "attack",
                    "race mode",
                )
                require(state(host)["seed"] == state(guest)["seed"], "seed")
                before = state(guest)["room"]["ghostData"][0]["u"]
                advance(host, 1)
                guest.wait_for_function(
                    "(before)=>Math.abs(window.__dodge.state.room.ghostData[0].u-before)>.01",
                    arg=before,
                )
                require(
                    host.locator("#devButton").evaluate(
                        '(e)=>e.classList.contains("hidden")'
                    ),
                    "race cheats",
                )

            check(
                "standalone race starts in sync and exchanges visible ghosts", room_race
            )

            def room_finish():
                host.evaluate("window.__dodge.tune({invincible:true})")
                guest.evaluate("window.__dodge.tune({invincible:true})")
                advance(host, 151)
                advance(guest, 151)
                require(
                    state(host)["phase"] == "won" and state(guest)["phase"] == "won",
                    "time limit",
                )
                host.wait_for_function(
                    'document.querySelectorAll("#resultRanks > div").length===2'
                )
                require(guest.locator("#resultRanks > div").count() == 2, "two results")
                action(host, "resultBack")
                guest.wait_for_function('window.__dodge.state.screen==="lobby"')
                require(state(host)["screen"] == "lobby", "host rematch lobby")
                (root / "tests/network-observation.json").write_text(
                    json.dumps(
                        {"host": state(host)["room"], "guest": state(guest)["room"]},
                        indent=2,
                    )
                )

            check(
                "both standalone racers finish, see scores and return to the lobby",
                room_finish,
            )

            def room_departure():
                action(guest, "leaveRoom")
                host.wait_for_function("window.__dodge.state.room.players.length===1")
                guest.evaluate(
                    "(code)=>window.__dodge.createRoom(code)",
                    state(host)["room"]["code"],
                )
                guest.wait_for_function("window.__dodge.state.room?.players.length===2")
                action(host, "leaveRoom")
                guest.wait_for_function(
                    'window.__dodge.state.screen==="title" && !window.__dodge.state.room'
                )

            check(
                "standalone guest and host departures clean up the room", room_departure
            )
        rooms.close()

        # Touchscreen emulation exercises real multitouch dispatch.
        phone_options = dict(p.devices["Pixel 7"])
        phone_options["device_scale_factor"] = 1
        phone = browser.new_context(**phone_options)
        mobile = phone.new_page()
        ready(mobile, origin + "/index.html?test=1&webgl=1&headless=1")

        def touch():
            mobile.locator('#title button[data-action="solo"]').tap()
            advance(mobile, 3)
            session = phone.new_cdp_session(mobile)
            session.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchStart",
                    "touchPoints": [
                        {"x": 170, "y": 580, "id": 1},
                        {"x": 350, "y": 620, "id": 2},
                    ],
                },
            )
            session.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchMove",
                    "touchPoints": [
                        {"x": 95, "y": 580, "id": 1},
                        {"x": 350, "y": 620, "id": 2},
                    ],
                },
            )
            mobile.wait_for_timeout(350)
            s = state(mobile)
            require(s["lastInput"] == "touch", s)
            require(
                mobile.locator("body").evaluate(
                    '(e)=>e.classList.contains("touch-playing")'
                ),
                "touch UI",
            )
            require(s["players"][0]["queueDir"] == 1 or s["players"][0]["lane"] == 1, s)
            require(s["boostTime"] > 0, s)
            session.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )
            mobile.locator("#pauseButton").tap()
            require(state(mobile)["screen"] == "pause", state(mobile))
            mobile.evaluate("window.__dodge.renderOnce()")
            mobile.screenshot(path=str(root / "tests/touch-pause.png"), timeout=45000)
            mobile.evaluate("window.__dodge.setRendering(false)")

        check("phone multitouch swipes lanes, boosts and opens the menu", touch)
        phone.close()

        # The official unmodified AI Hub harness validates the session contract.
        harness = browser.new_context(viewport={"width": 1440, "height": 900})
        for seats, scenario, latency, jitter, loss in [
            (2, "standard", 0, 0, 0),
            (4, "standard", 150, 50, 5),
            (4, "host-leave", 150, 50, 5),
        ]:
            hp = harness.new_page()
            label = (
                f"official Hub: {seats} seats, {scenario}, {latency} ms, {loss}% loss"
            )

            def hub_case(
                hp=hp,
                seats=seats,
                scenario=scenario,
                latency=latency,
                jitter=jitter,
                loss=loss,
            ):
                query = urllib.parse.urlencode(
                    {
                        "game": "../index.html?webgl=1&test=1&headless=1",
                        "players": seats,
                        "auto": 1,
                        "scenario": scenario,
                        "latency": latency,
                        "jitter": jitter,
                        "loss": loss,
                        "play": 6000,
                    }
                )
                hp.goto(origin + "/hub/harness.html?" + query, wait_until="load")
                hp.wait_for_function("window.__hubCheck?.done", timeout=100000)
                report = hp.evaluate("window.__hubCheck")
                (root / f"tests/hub-{seats}-{scenario}.json").write_text(
                    json.dumps(report, indent=2)
                )
                require(report["pass"], [c for c in report["checks"] if not c["pass"]])
                frames = [f for f in hp.frames if "index.html" in f.url]
                require(
                    all(
                        f.evaluate("!window.__dodge || window.__dodge.state.hub.ended")
                        for f in frames
                    ),
                    "end lifecycle",
                )

            check(label, hub_case)
            hp.close()
        harness.close()
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    (root / "tests/browser-results.json").write_text(
        json.dumps({"count": count, "failures": failures, "checks": records}, indent=2)
    )
print(json.dumps({"suite": "browser", "count": count, "failures": failures}))
