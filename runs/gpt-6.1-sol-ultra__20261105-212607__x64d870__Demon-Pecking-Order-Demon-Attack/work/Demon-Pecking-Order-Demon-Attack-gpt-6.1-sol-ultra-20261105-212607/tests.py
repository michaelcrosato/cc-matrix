"""Game behavior checks. Run with the workstation's Playwright Python interpreter."""

import json
import pathlib
import time
import traceback

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent
GAME = ROOT.parent / (ROOT.name + ".html")
PAD_SCRIPT = """
window.__testPad = {index:0,id:'Test DualSense',mapping:'standard',connected:true,timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
window.__padConnected = false;
Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.__padConnected?[window.__testPad]:[]});
"""


def main():
    results = []
    details = {}
    started = time.monotonic()

    def check(name, callback):
        try:
            callback()
            results.append({"name": name, "passed": True})
        except Exception as error:  # noqa: BLE001 - report every failed test and continue.
            last_frame = traceback.extract_tb(error.__traceback__)[-1]
            message = (
                str(error) or f"assertion at {last_frame.name}:{last_frame.lineno}"
            )
            results.append({"name": name, "passed": False, "error": message})
            print(f"FAIL {name}: {message}", flush=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--autoplay-policy=no-user-gesture-required",
            ],
        )
        context = browser.new_context(
            viewport={"width": 1600, "height": 900}, ignore_https_errors=True
        )
        context.add_init_script(PAD_SCRIPT)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.set_default_timeout(12000)

        def state():
            return page.evaluate("gameTest.state")

        def start(coop=False):
            page.evaluate("c=>gameTest.start(c)", coop)
            assert state()["screen"] == "playing"

        def step(frames):
            page.evaluate("n=>gameTest.step(n)", frames)

        def wait_frames(count=2):
            current = state()["frames"]
            page.wait_for_function("n=>gameTest.state.frames>=n", arg=current + count)

        def pad_button(index, pressed):
            page.evaluate(
                "([i,p])=>{window.__padConnected=true;Object.assign(__testPad.buttons[i],{pressed:p,touched:p,value:p?1:0});}",
                [index, pressed],
            )
            wait_frames()

        def boot():
            page.goto(GAME.as_uri(), wait_until="load")
            page.wait_for_function(
                "window.gameTest?.ready || window.gameBootError", timeout=60000
            )
            error = page.evaluate("window.gameBootError || null")
            assert error is None, error
            current = state()
            assert page.title() == "Demon Pecking Order"
            assert current["screen"] == "title", current["screen"]
            assert current["version"] == "180", current["version"]
            assert current["rapier"] == "0.19.3", current["rapier"]
            assert current["backend"] == "webgpu", current["backend"]
            assert current["settings"]["glyphs"] == "PlayStation"
            details["engine"] = {
                key: current[key] for key in ["version", "rapier", "backend"]
            }

        check("file URL boots Three r180, Rapier 0.19.3 and WebGPU", boot)
        if not page.evaluate("!!window.gameTest?.ready"):
            browser.close()
            finish(results, details, started)
            return

        def title_and_keyboard():
            page.keyboard.press("Enter")
            assert state()["screen"] == "playing"
            x = state()["players"][0]["x"]
            page.keyboard.down("d")
            step(30)
            page.keyboard.up("d")
            assert state()["players"][0]["x"] > x + 3
            page.keyboard.down("a")
            step(30)
            page.keyboard.up("a")
            assert abs(state()["players"][0]["x"] - x) < 1
            step(150)
            before = state()["players"][0]["shots"]
            page.keyboard.down("Space")
            step(90)
            page.keyboard.up("Space")
            assert state()["players"][0]["shots"] > before + 3

        check("title keyboard activation, movement and held fire", title_and_keyboard)

        def dash_and_pulse():
            start()
            page.keyboard.down("ShiftLeft")
            step(1)
            page.keyboard.up("ShiftLeft")
            assert state()["stats"]["dashes"] == 1
            assert state()["players"][0]["invul"] > 0
            page.keyboard.down("q")
            step(1)
            page.keyboard.up("q")
            current = state()
            assert current["stats"]["pulses"] == 1
            assert current["power"] < 0.05

        check("dash protection and Scatter Pulse keyboard actions", dash_and_pulse)

        def pause():
            start()
            page.keyboard.press("Escape")
            assert state()["screen"] == "pause"
            old = state()["runTime"]
            step(120)
            assert state()["runTime"] == old
            page.keyboard.press("Enter")
            assert state()["screen"] == "playing"
            step(30)
            assert state()["runTime"] > old

        check("pause freezes simulation and keyboard resume works", pause)

        def dev():
            start()
            page.keyboard.press("Escape")
            page.locator('[data-action="dev"]').click()
            assert state()["screen"] == "dev"
            slider = page.locator('[data-balance="speed"]')
            slider.focus()
            slider.press("Home")
            slider.press("ArrowRight")
            assert state()["balance"]["speed"] == 5.5, state()["balance"]
            page.locator('[data-action="god"]').click()
            page.locator('[data-action="autoplay"]').click()
            page.locator('[data-action="resetdev"]').click()
            assert state()["balance"] == {
                "speed": 14,
                "fireRate": 5.5,
                "enemySpeed": 1,
                "enemyFire": 1,
                "bulletSpeed": 7.8,
                "pulseRecharge": 1,
                "difficulty": 1,
            }
            assert page.locator('[data-action="god"]').inner_text() == "Off"
            assert page.locator('[data-action="autoplay"]').inner_text() == "Off"
            page.locator('[data-action="resume"]').click()
            assert state()["screen"] == "playing"

        check("pause developer tools, live native range input and defaults reset", dev)

        def settings():
            start()
            page.keyboard.press("Escape")
            page.locator('[data-action="settings"]').click()
            assert state()["settings"]["music"] == 0.1
            slider = page.locator('[data-setting="music"]')
            slider.focus()
            slider.press("ArrowRight")
            assert abs(state()["settings"]["music"] - 0.11) < 0.00001
            slider.press("ArrowLeft")
            assert abs(state()["settings"]["music"] - 0.1) < 0.00001
            page.locator('[data-action="glyphs"]').click()
            assert state()["settings"]["glyphs"] == "Xbox"
            page.locator('[data-action="back"]').click()
            assert state()["screen"] == "pause"
            page.locator('[data-action="resume"]').click()

        check("music defaults to ten percent, live volume and Xbox option", settings)

        def gamepad():
            start()
            page.evaluate("__padConnected=true;__testPad.axes[0]=1")
            wait_frames()
            x = state()["players"][0]["x"]
            step(20)
            assert state()["players"][0]["x"] > x + 2
            page.evaluate("__testPad.axes[0]=0")
            wait_frames()
            step(180)
            before = state()["players"][0]["shots"]
            pad_button(0, True)
            step(90)
            pad_button(0, False)
            assert state()["players"][0]["shots"] > before
            assert "A" in page.locator("#prompts").inner_text()
            pad_button(9, True)
            pad_button(9, False)
            assert state()["screen"] == "pause"
            pad_button(0, True)
            pad_button(0, False)
            assert state()["screen"] == "playing"
            page.evaluate("__padConnected=false")
            wait_frames()

        check(
            "emulated standard gamepad movement, fire, glyphs and menu accept", gamepad
        )

        def local_coop():
            start(True)
            assert len(state()["players"]) == 2
            old = [player["x"] for player in state()["players"]]
            page.keyboard.down("d")
            page.keyboard.down("ArrowLeft")
            step(15)
            page.keyboard.up("d")
            page.keyboard.up("ArrowLeft")
            new = [player["x"] for player in state()["players"]]
            assert new[0] > old[0] + 1
            assert new[1] < old[1] - 1
            step(180)
            page.keyboard.down("Space")
            page.keyboard.down("Enter")
            step(90)
            page.keyboard.up("Space")
            page.keyboard.up("Enter")
            assert all(player["shots"] > 0 for player in state()["players"])

        check("two local pilots move and fire independently", local_coop)

        def death_retry():
            start()
            for _ in range(4):
                page.evaluate("gameTest.damage()")
            assert state()["screen"] == "result", state()
            assert "pecked to pieces" in page.locator("#screen").inner_text().lower()
            page.locator('[data-action="restart"]').click()
            current = state()
            assert current["screen"] == "playing"
            assert current["reserves"] == 4, current
            assert current["wave"] == 1, current
            assert current["score"] == 0, current

        check("last bunker ends patrol and Fly Again fully restarts", death_retry)

        def source_mechanics():
            start()
            page.evaluate("gameTest.spawn('splitter',0,12)")
            enemy = next(
                entity for entity in state()["entities"] if entity["type"] == "splitter"
            )
            page.evaluate("id=>gameTest.hit(id)", enemy["id"])
            shards = [
                entity for entity in state()["entities"] if entity["type"] == "shard"
            ]
            assert len(shards) == 2
            page.evaluate("id=>gameTest.hit(id)", shards[0]["id"])
            assert any(
                entity.get("diving")
                for entity in state()["entities"]
                if entity["type"] == "shard"
            )
            assert state()["stats"]["splits"] == 1
            assert state()["stats"]["dives"] == 1
            page.evaluate("gameTest.spawn('phantom',4,14)")
            step(200)
            assert state()["stats"]["phantoms"] == 1

        check("split enemies create paired shards and survivor dives", source_mechanics)

        def playthrough():
            start()
            page.evaluate("gameTest.autoplay(true)")
            seen = set()
            for _ in range(180):
                step(600)
                current = state()
                seen.add(current["wave"])
                if current["screen"] == "result":
                    break
            current = state()
            details["playthrough"] = {
                key: current[key]
                for key in [
                    "screen",
                    "wave",
                    "score",
                    "runTime",
                    "kills",
                    "stats",
                    "types",
                ]
            }
            assert current["screen"] == "result", details["playthrough"]
            assert page.evaluate("gameTest.snapshot().won"), details["playthrough"]
            assert set(range(1, 7)).issubset(seen), sorted(seen)
            assert current["stats"]["wavesCleared"] == 6
            assert current["stats"]["collisions"] > 50
            assert current["stats"]["bossHits"] > 0
            assert current["stats"]["splits"] > 0
            assert current["stats"]["dives"] > 0
            assert current["stats"]["enemyShots"] > 0
            assert {"grunt", "splitter", "shard", "phantom", "boss"}.issubset(
                set(current["types"])
            )
            assert "order restored" in page.locator("#screen").inner_text().lower()
            assert page.locator('[data-action="endless"]').is_visible()

        check(
            "complete six-wave autopilot playthrough including boss victory",
            playthrough,
        )

        def overtime():
            page.locator('[data-action="endless"]').click()
            assert state()["screen"] == "playing"
            page.evaluate("gameTest.wave(7)")
            assert state()["wave"] == 7
            assert "overtime" in page.locator("#wave-label").inner_text().lower()
            step(200)
            assert state()["entityCount"] > 1

        check("victory unlocks playable overtime", overtime)

        def audio():
            result = page.evaluate("gameTest.audioTest()")
            details["audio"] = result
            assert result["supported"]
            assert 0.001 < result["rms"] < 0.5, result
            assert 0.01 < result["peak"] < 1, result
            assert result["nonzero"] > 10000, result
            assert result["voices"] > 0
            assert result["musicSteps"] > 0
            assert state()["audio"]["unlocked"]

        check(
            "offline procedural music, effects and gibberish produce unclipped audio",
            audio,
        )

        def about():
            page.evaluate("gameTest.act('quit')")
            page.locator('[data-action="about"]').click()
            content = page.locator("#screen").inner_text()
            for heading in [
                "Source Information",
                "Testing Feedback",
                "Engine Feedback",
                "Prompt Feedback",
                "added on import",
            ]:
                assert heading.lower() in content.lower(), heading
            page.locator('[data-action="back"]').click()
            assert state()["screen"] == "title"

        check("credits contain all required source and feedback sections", about)

        def attract():
            page.evaluate("gameTest.act('quit')")
            page.wait_for_function("gameTest.state.attract", timeout=40000)
            assert page.locator("#demo-label").is_visible()
            page.keyboard.press("Space")
            assert state()["screen"] == "title"
            assert not state()["attract"]

        check("ten-second title idle starts attract and any input exits", attract)

        def attract_loops():
            page.evaluate("gameTest.attract()")
            seen = set()
            for _ in range(360):
                step(300)
                current = state()
                seen.add(current["wave"])
                assert current["attract"]
                assert current["screen"] == "playing"
                if current["stats"]["wavesCleared"] >= 12 and current["wave"] == 1:
                    break
            current = state()
            details["attractPlaythrough"] = {
                key: current[key] for key in ["wave", "runTime", "stats", "types"]
            }
            assert current["stats"]["wavesCleared"] >= 12, details["attractPlaythrough"]
            assert current["wave"] == 1, details["attractPlaythrough"]
            assert set(range(1, 7)).issubset(seen), seen
            page.keyboard.press("Escape")
            assert state()["screen"] == "title"

        check("attract demonstration loops repeatedly after final wave", attract_loops)

        check(
            "no unhandled JavaScript errors during gameplay checks",
            lambda: require(not errors, list(dict.fromkeys(errors))[:3]),
        )
        context.close()

        mobile = browser.new_context(
            **playwright.devices["iPhone 13"], ignore_https_errors=True
        )
        mobile_page = mobile.new_page()
        mobile_errors = []
        mobile_page.on("pageerror", lambda error: mobile_errors.append(str(error)))
        mobile_page.set_default_timeout(12000)

        def touch():
            mobile_page.goto(GAME.as_uri(), wait_until="load")
            mobile_page.wait_for_function(
                "window.gameTest?.ready || window.gameBootError", timeout=60000
            )
            assert mobile_page.evaluate("window.gameBootError || null") is None
            mobile_page.locator('[data-action="start"]').tap()
            assert mobile_page.evaluate("gameTest.state.screen") == "playing"
            mobile_page.evaluate("gameTest.step(180)")
            old_x = mobile_page.evaluate("gameTest.state.players[0].x")
            cdp = mobile.new_cdp_session(mobile_page)
            cdp.send(
                "Input.dispatchTouchEvent",
                {"type": "touchStart", "touchPoints": [{"x": 100, "y": 520, "id": 1}]},
            )
            cdp.send(
                "Input.dispatchTouchEvent",
                {"type": "touchMove", "touchPoints": [{"x": 200, "y": 520, "id": 1}]},
            )
            mobile_page.evaluate("gameTest.step(30)")
            cdp.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )
            current = mobile_page.evaluate("gameTest.state")
            assert current["players"][0]["x"] > old_x + 2
            assert current["players"][0]["shots"] > 0
            assert mobile_page.locator("#touch-pulse").is_visible()
            mobile_page.locator("#touch-pulse").tap()
            mobile_page.evaluate("gameTest.step(1)")
            assert mobile_page.evaluate("gameTest.state.stats.pulses") == 1
            mobile_page.locator("#pause-button").tap()
            assert mobile_page.evaluate("gameTest.state.screen") == "pause"
            assert not mobile_errors, mobile_errors

        check("phone touch drag, auto-fire, contextual pulse and pause", touch)
        mobile.close()
        browser.close()

    finish(results, details, started)


def require(condition, message):
    assert condition, message


def finish(results, details, started):
    failed = sum(not item["passed"] for item in results)
    report = {
        "passed": len(results) - failed,
        "failed": failed,
        "durationSeconds": round(time.monotonic() - started, 2),
        "results": results,
        "details": details,
    }
    (ROOT / "test-results.json").write_text(json.dumps(report, indent=2))
    print(f"{report['passed']} passed, {failed} failed", flush=True)
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
