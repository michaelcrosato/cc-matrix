import functools
import json
import sys
from contextlib import contextmanager
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
ROOT = DEV.parent
GAME = ROOT / (DEV.name + ".html")
FAILURES = []
COUNT = 0
RECORDS = []
GPU = ["--no-sandbox", "--enable-unsafe-swiftshader"]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@contextmanager
def server():
    srv = ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT))
    )
    Thread(target=srv.serve_forever, daemon=True).start()
    try:
        yield f"http://127.0.0.1:{srv.server_port}"
    finally:
        srv.shutdown()
        srv.server_close()


def check(name, fn):
    global COUNT
    if "--touch-only" in sys.argv and name not in [
        "single-file boot",
        "multitouch invisible sticks and contextual controls",
    ]:
        return
    COUNT += 1
    (DEV / "tests/progress.json").write_text(
        json.dumps({"current": name, "count": COUNT, "records": RECORDS}, indent=2)
    )
    try:
        fn()
        RECORDS.append({"name": name, "pass": True})
    except Exception as e:  # noqa: BLE001 - Record each independent test failure.
        RECORDS.append({"name": name, "pass": False, "error": str(e)})
        FAILURES.append((name, str(e)))
        print(f"FAIL {name}: {e}", flush=True)


def require(value, detail="assertion failed"):
    if not value:
        raise AssertionError(detail)


def ready(page, url):
    page.goto(url, wait_until="load", timeout=90000)
    page.wait_for_function("window.__gameReady === true", timeout=90000)
    require(page.title() == "H.E.R.O. Another Day", "wrong page served")


PAD = r"""window.__pad=null;navigator.getGamepads=()=>window.__pad?[window.__pad,null,null,null]:[];window.__setPad=(buttons=[],axes=[0,0,0,0])=>{window.__pad={id:'Test DualSense',index:0,connected:true,mapping:'standard',timestamp:performance.now(),axes,buttons:Array.from({length:18},(_,i)=>({pressed:buttons.includes(i),touched:buttons.includes(i),value:buttons.includes(i)?1:0}))};};"""


def main():
    interview = json.loads((ROOT / "exit-interview.json").read_text())
    with server() as origin, sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=GPU)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900}, device_scale_factor=1
        )
        context.set_default_timeout(15000)
        context.add_init_script(PAD)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on(
            "console",
            lambda m: (
                errors.append("console: " + m.text) if m.type == "error" else None
            ),
        )
        check(
            "single-file boot",
            lambda: ready(page, GAME.as_uri() + "?renderer=webgl&state-test=1"),
        )
        if not page.evaluate("!!window.__gameReady"):
            print(
                f"{COUNT - len(FAILURES)}/{COUNT} checks passed; {len(FAILURES)} failures"
            )
            browser.close()
            return 1
        page.evaluate("__game.testing.manual(true)")
        check(
            "Three.js r180 and Rapier 0.19.3 compatibility renderer",
            lambda: require(
                page.evaluate(
                    '__game.engine.three==="180"&&__game.engine.rapier==="0.19.3"&&__game.engine.renderer==="WebGL 2 compatibility"'
                ),
                page.evaluate("__game.engine.renderer"),
            ),
        )
        check(
            "title is controller readable",
            lambda: require(
                page.get_by_text("ANOTHER DAY", exact=True).is_visible()
                and page.get_by_role("button", name="Start shift").is_visible()
            ),
        )
        check("no runtime errors at boot", lambda: require(not errors, str(errors)))

        def test_default_music():
            page.get_by_role("button", name="Settings", exact=True).click()
            require(
                page.locator("#slider-music").input_value() == "10", "music is not 10%"
            )
            page.get_by_role("button", name="Back", exact=True).click()

        check("music defaults to ten percent", test_default_music)

        def test_keyboard():
            page.keyboard.press("Enter")
            require(
                page.evaluate("__game.state().phase") == "game", "Enter did not start"
            )
            page.keyboard.down("KeyD")
            state = page.evaluate("__game.testing.tick(45)")
            page.keyboard.up("KeyD")
            require(state["players"][0]["x"] > -8.7, str(state["players"][0]))
            page.keyboard.down("Space")
            before = state["players"][0]["y"]
            state = page.evaluate("__game.testing.tick(50)")
            page.keyboard.up("Space")
            require(state["players"][0]["y"] > before + 2, "jetpack did not lift")
            require(state["players"][0]["fuel"] < 95, "jet fuel did not drain")

        check("native keyboard movement and jetpack", test_keyboard)

        def test_physics():
            state = page.evaluate(
                """()=>{__game.testing.start();__game.testing.position(3,-6);return __game.testing.step(120,{move:1});}"""
            )
            require(state["players"][0]["x"] < 4.4, "walked through rubble")
            require(state["players"][0]["y"] >= -10.0, "fell through room floor")

        check("Rapier blocks solid mine and rubble", test_physics)

        def test_charge():
            state = page.evaluate(
                """()=>{__game.testing.start();__game.testing.position(2.3,-8.5);__game.testing.setAim(1,0);__game.testing.bomb();__game.testing.position(-2,-8);return __game.testing.step(125,{});}"""
            )
            require(state["gates"][0] is True, "charge did not open gate")
            require(state["charges"] == 1, "charge count incorrect")

        check("timed physics charge opens blocked passage", test_charge)

        def test_laser():
            state = page.evaluate(
                """()=>{__game.testing.start();__game.testing.position(10,-9.5);return __game.testing.step(180,{fire:true,aimX:1,aimY:-.1});}"""
            )
            require(state["kills"] >= 1, "pulse did not kill crawler")
            require(state["shotsFired"] >= 12, "pulse did not repeat")

        check("aimed pulse damages enemies", test_laser)

        def test_water():
            state = page.evaluate(
                """()=>{__game.testing.start();__game.testing.position(-14,-25.5);return __game.testing.step(60,{});}"""
            )
            require(
                state["players"][0]["air"] < 178,
                "water did not increase air consumption",
            )

        check("flooded works consume more air", test_water)

        def test_lava():
            state = page.evaluate(
                """()=>{__game.testing.start();__game.testing.position(10,-48.2);return __game.testing.step(20,{});}"""
            )
            require(state["players"][0]["health"] < 5, "lava did not hurt suit")

        check("lava and suit damage", test_lava)

        def test_supply():
            state = page.evaluate(
                """()=>{__game.testing.start();const p=__game.testing.rawWorld.players[0];p.health=2;p.fuel=12;p.air=30;p.bombs=1;__game.testing.position(-2.8,-13.7);return __game.testing.step(2,{});}"""
            )
            pp = state["players"][0]
            require(
                pp["health"] == 5
                and pp["fuel"] > 99
                and pp["air"] > 179
                and pp["bombs"] == 5,
                str(pp),
            )

        check("supply station refills the full kit", test_supply)

        def test_recoveries():
            state = page.evaluate(
                """()=>{__game.testing.start();__game.testing.hurt(5);let s=__game.state();if(s.players[0].lives!==2)throw Error('No recovery');__game.testing.hurt(5);__game.testing.hurt(5);return __game.state();}"""
            )
            require(
                state["status"] == "lost" and state["phase"] == "lost",
                "three suit losses did not end shift",
            )
            require(
                page.get_by_text("End of the shift.", exact=True).is_visible(),
                "no failure screen",
            )

        check("recoveries and complete failure state", test_recoveries)

        def test_campaign():
            result = page.evaluate((DEV / "tests/campaign.js").read_text())
            (DEV / "tests/campaign-result.json").write_text(
                json.dumps(result, indent=2)
            )
            require(result["status"] == "won" and result["rescued"] == 3, str(result))
            require(
                all(result["gates"]) and result["charges"] == 3,
                "not all route mechanics played",
            )
            require(result["downs"] == 0, "autopilot needed a recovery")
            require(
                page.get_by_text("Everybody clocked out.", exact=True).is_visible(),
                "no victory screen",
            )

        check(
            "complete campaign with physical controls and default balance",
            test_campaign,
        )

        def test_pause_dev():
            page.evaluate("__game.testing.start()")
            page.keyboard.press("Escape")
            require(
                page.get_by_role("button", name="Developer tools").is_visible(),
                "dev mode absent from pause",
            )
            page.get_by_role("button", name="Developer tools").click()
            page.locator("#slider-moveSpeed").fill("9")
            require(
                page.evaluate("__game.state().tuning.moveSpeed") == 9,
                "live slider failed",
            )
            page.get_by_role("button", name="Refill kit", exact=True).click()
            page.get_by_role("button", name="Ember", exact=True).click()
            require(page.evaluate("__game.state().players[0].y") == -43, "warp failed")
            page.get_by_role("button", name="Reset defaults").click()
            require(
                page.evaluate("__game.state().tuning.moveSpeed") == 6.2, "reset failed"
            )
            page.get_by_role("button", name="Back to pause").click()
            page.get_by_role("button", name="Resume shift", exact=True).click()

        check("pause developer tools and live balance reset", test_pause_dev)

        def test_pad():
            page.evaluate("__setPad([9])")
            page.wait_for_function('__game.state().screen==="pause"', timeout=8000)
            require(
                page.evaluate("__game.state().screen") == "pause",
                "Options did not pause",
            )
            page.evaluate("__setPad([])")
            page.wait_for_timeout(100)
            page.evaluate("__setPad([0])")
            page.wait_for_function("__game.state().screen===null", timeout=8000)
            require(
                page.evaluate("__game.state().screen") is None, "Cross did not resume"
            )
            page.evaluate("__setPad([])")
            page.wait_for_timeout(100)
            page.evaluate("__game.testing.position(0,-6);__setPad([0,7],[.8,0,1,0])")
            page.wait_for_timeout(150)
            state = page.evaluate("__game.testing.tick(50)")
            require(
                state["input"] == "gamepad"
                and state["players"][0]["fuel"] < 95
                and state["shotsFired"] > 0,
                "pad gameplay did not route",
            )
            require(
                "✕" in page.locator("#controlStrip").inner_text(),
                "PlayStation prompt missing",
            )
            page.evaluate("__setPad([])")
            page.wait_for_timeout(100)

        check("standard DualSense gamepad menus and gameplay", test_pad)

        def test_glyphs():
            page.evaluate("__game.testing.menu('pause')")
            page.get_by_role("button", name="Settings", exact=True).click()
            page.get_by_role("button", name="PlayStation · ✕ ○ □ △").click()
            page.get_by_role("button", name="Back", exact=True).click()
            page.get_by_role("button", name="Resume shift", exact=True).click()
            page.evaluate("__setPad([0])")
            page.wait_for_timeout(150)
            require(
                "RT" in page.locator("#controlStrip").inner_text(),
                "Xbox prompt missing",
            )
            page.evaluate("__setPad([])")

        check("Xbox glyph setting follows last input", test_glyphs)

        def test_mouse_focus():
            page.evaluate("__game.testing.menu('pause')")
            b = page.get_by_role("button", name="Field guide", exact=True)
            b.hover()
            require(
                "focused" in (b.get_attribute("class") or ""),
                "hover did not move focus",
            )
            b.click()
            require(
                page.get_by_text("A good day to get out.", exact=True).is_visible(),
                "guide did not open",
            )

        check("mouse hover focus and field guide", test_mouse_focus)

        def test_credits():
            page.evaluate("__game.testing.menu('about')")
            for label in [
                "Source Information",
                "Testing Feedback",
                "Engine Feedback",
                "Prompt Feedback",
            ]:
                page.get_by_role("button", name=label, exact=True).click()
                content = page.locator("#creditsContent").inner_text()
                require(content.strip(), "empty credits tab")
                key = {
                    "Testing Feedback": "testingFeedback",
                    "Engine Feedback": "engineFeedback",
                    "Prompt Feedback": "promptFeedback",
                }.get(label)
                expected = (
                    interview[key][0]
                    if key
                    else interview["sourceInformation"]["model"]
                )
                require(
                    expected in content,
                    "credits do not match exit-interview.json: " + label,
                )
            page.get_by_role("button", name="Source Information", exact=True).click()
            require(
                "added on import" in page.locator("#creditsContent").inner_text(),
                "usage metadata absent",
            )

        check("all required in-game credits sections", test_credits)

        def test_audio():
            data = page.evaluate("__game.testing.audioProbe()")
            require(0.005 < data["rms"] < 0.5, str(data))
            require(0.05 < data["peak"] <= 1, str(data))
            require(
                data["musicDefault"] == 0.1 and data["voiceSyllables"] == 6, str(data)
            )
            (DEV / "tests/audio-result.json").write_text(json.dumps(data, indent=2))

        check("offline synthesized music, effects and gibberish voice", test_audio)

        def test_attract():
            page.evaluate(
                "__game.testing.menu('title');__game.testing.idle();__game.testing.tick(1)"
            )
            require(
                page.evaluate("__game.state().phase") == "attract",
                "idle did not enter attract",
            )
            for _ in range(12):
                state = page.evaluate("__game.testing.tick(600)")
                if state["rescued"] > 0:
                    break
            require(
                state["rescued"] > 0 and state["charges"] > 0,
                "attract did not demonstrate rescue and explosives",
            )
            page.keyboard.press("KeyK")
            require(
                page.evaluate("__game.state().phase") == "title",
                "input did not exit attract",
            )

        check("ten-second attract starts, plays and exits on input", test_attract)

        def test_couch():
            page.evaluate("__game.testing.start(2);__game.testing.position(0,-6,1)")
            page.keyboard.down("ArrowRight")
            state = page.evaluate("__game.testing.tick(30)")
            page.keyboard.up("ArrowRight")
            require(
                len(state["players"]) == 2 and state["players"][1]["x"] > 1,
                "couch second seat did not move",
            )

        check("two-player couch controls", test_couch)
        check(
            "no errors during gameplay and menus",
            lambda: require(not errors, str(errors[:8])),
        )
        page.close()

        def test_visual():
            q = context.new_page()
            q.set_viewport_size({"width": 1920, "height": 1080})
            ee = []
            q.on("pageerror", lambda e: ee.append(str(e)))
            ready(q, GAME.as_uri() + "?renderer=webgl&state-test=1")
            q.evaluate("__game.testing.manual(true)")
            q.evaluate("__game.testing.render()")
            q.wait_for_timeout(300)
            q.screenshot(timeout=45000, path=str(DEV / "tests/title-webgl.png"))
            q.evaluate(
                "__game.testing.start();__game.testing.position(0,-7);__game.testing.render()"
            )
            q.wait_for_timeout(400)
            q.screenshot(timeout=45000, path=str(DEV / "tests/mine-webgl.png"))
            require(not ee, str(ee))
            require(
                q.evaluate("__game.engine.renderer") == "WebGL 2 compatibility",
                "compatibility renderer did not initialize",
            )
            q.close()

        if "--visual" in sys.argv:
            check("visual compatibility render", test_visual)

        def test_rooms():
            a = context.new_page()
            b = context.new_page()
            try:
                ready(a, origin + "/" + GAME.name + "?renderer=webgl&state-test=1")
                ready(b, origin + "/" + GAME.name + "?renderer=webgl&state-test=1")
                a.evaluate("__game.testing.roomHost('TST234')")
                b.evaluate("__game.testing.roomJoin('TST234')")
                a.wait_for_function("__game.state().players.length===2", timeout=8000)
                b.wait_for_function("__game.state().net.id===1", timeout=8000)
                a.evaluate("__game.testing.roomBegin()")
                b.wait_for_function('__game.state().phase==="game"', timeout=8000)
                b.keyboard.down("KeyD")
                b.keyboard.down("Space")
                b.keyboard.down("KeyJ")
                b.wait_for_timeout(1000)
                b.keyboard.up("KeyD")
                b.keyboard.up("Space")
                b.keyboard.up("KeyJ")
                ss = a.evaluate("__game.state()")
                pp = next(p for p in ss["players"] if p["id"] == 1)
                require(pp["x"] > -10, "remote control did not move host-owned hero")
                require(ss["shotsFired"] > 0, "remote fire not applied")
                a.evaluate("__game.testing.position(2.3,-8.5,1)")
                b.wait_for_timeout(350)
                b.keyboard.press("KeyE")
                a.wait_for_function("__game.state().charges>0", timeout=6000)
                a.wait_for_function("__game.state().gates[0]===true", timeout=8000)
                b.wait_for_function("__game.state().gates[0]===true", timeout=8000)
                b.close()
                a.wait_for_function("__game.state().players.length===1", timeout=6000)
            finally:
                if not b.is_closed():
                    b.close()
                a.close()

        check("standalone shared-world room, remote actions and departure", test_rooms)

        def test_touch():
            mobile = browser.new_context(
                viewport={"width": 932, "height": 430},
                has_touch=True,
                is_mobile=True,
                device_scale_factor=1,
            )
            q = mobile.new_page()
            ee = []
            q.on("pageerror", lambda e: ee.append(str(e)))
            try:
                ready(q, origin + "/" + GAME.name + "?renderer=webgl&state-test=1")
                q.get_by_role("button", name="Start shift", exact=True).tap()
                q.evaluate("__game.testing.position(-2,-7);__game.testing.step(1,{})")
                session = mobile.new_cdp_session(q)
                session.send(
                    "Input.dispatchTouchEvent",
                    {
                        "type": "touchStart",
                        "touchPoints": [
                            {"x": 130, "y": 300, "id": 0},
                            {"x": 650, "y": 220, "id": 1},
                        ],
                    },
                )
                session.send(
                    "Input.dispatchTouchEvent",
                    {
                        "type": "touchMove",
                        "touchPoints": [
                            {"x": 177, "y": 240, "id": 0},
                            {"x": 705, "y": 205, "id": 1},
                        ],
                    },
                )
                try:
                    q.wait_for_function(
                        "__game.state().players[0].fuel < 98 && __game.state().shotsFired > 0",
                        timeout=8000,
                    )
                except Exception:  # noqa: BLE001 - Include contact state in a failed hardware emulation check.
                    state = q.evaluate(
                        "({state:__game.state(),input:__game.testing.inputDiagnostics()})"
                    )
                    raise AssertionError(json.dumps(state)) from None
                state = q.evaluate("__game.state()")
                session.send(
                    "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
                )
                require(state["input"] == "touch", "touch input mode missing")
                require(
                    state["players"][0]["fuel"] < 98 and state["shotsFired"] > 0,
                    "multitouch did not fly and fire",
                )
                require(
                    not q.locator("#touchContext").is_visible(),
                    "context action should be hidden away from targets",
                )
                q.get_by_role("button", name="Pause", exact=True).tap()
                require(
                    q.get_by_text("Take a breather.", exact=True).is_visible(),
                    "touch pause did not work",
                )
                if "--visual" in sys.argv:
                    q.screenshot(timeout=45000, path=str(DEV / "tests/touch-pause.png"))
                require(not ee, str(ee))
            finally:
                mobile.close()

        check("multitouch invisible sticks and contextual controls", test_touch)
        for players, scenario, impaired in [
            (2, "standard", False),
            (4, "standard", True),
            (4, "host-leave", True),
            (2, "server", False),
        ]:

            def hub_check(players=players, scenario=scenario, impaired=impaired):
                h = context.new_page()
                try:
                    params = {
                        "game": "../../" + GAME.name + "?renderer=webgl&state-test=1",
                        "players": players,
                        "auto": 1,
                        "play": 4000,
                        "scenario": scenario,
                    }
                    if impaired:
                        params.update(latency=150, jitter=50, loss=5)
                    h.goto(
                        origin
                        + "/"
                        + DEV.name
                        + "/vendor/harness.html?"
                        + urlencode(params),
                        wait_until="domcontentloaded",
                    )
                    h.wait_for_function(
                        'document.body.dataset.complete==="true"', timeout=100000
                    )
                    report = h.evaluate("window.__hubCheck")
                    (DEV / f"tests/hub-{players}-{scenario}.json").write_text(
                        json.dumps(report, indent=2)
                    )
                    require(
                        report["pass"],
                        str([c for c in report["checks"] if not c["pass"]]),
                    )
                    ended_frames = [f for f in h.frames[1:] if "aihub=" in f.url]
                    for f in ended_frames:
                        try:
                            require(
                                f.evaluate("window.__game?.state().phase") == "end",
                                "round end did not freeze game",
                            )
                        except Exception as ex:
                            if "detached" not in str(ex):
                                raise
                finally:
                    h.close()

            check(
                f"AI Hub {players} players / {scenario}"
                + (" / impaired network" if impaired else ""),
                hub_check,
            )

        browser.close()
    (DEV / "tests/results.json").write_text(
        json.dumps(
            {
                "passed": COUNT - len(FAILURES),
                "total": COUNT,
                "failures": FAILURES,
                "checks": RECORDS,
            },
            indent=2,
        )
    )
    print(f"{COUNT - len(FAILURES)}/{COUNT} checks passed; {len(FAILURES)} failures")
    return bool(FAILURES)


if __name__ == "__main__":
    raise SystemExit(main())
