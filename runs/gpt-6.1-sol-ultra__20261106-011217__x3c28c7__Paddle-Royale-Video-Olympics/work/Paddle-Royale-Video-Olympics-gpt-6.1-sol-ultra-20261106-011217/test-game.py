#!/usr/bin/env python3
"""Single-file game regression suite. Prints failures and one count line only."""

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parent
HTML = BASE.parent / (BASE.name + ".html")
checks = 0
failures = []


def require(condition, detail="assertion failed"):
    if not condition:
        raise AssertionError(detail)


def check(name, fn):
    global checks
    checks += 1
    try:
        fn()
    except Exception as exc:  # noqa: BLE001 — report every independent browser check
        message = f"FAIL {name}: {str(exc).splitlines()[0]}"
        failures.append(message)
        print(message, flush=True)


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
    context = browser.new_context(
        viewport={"width": 1440, "height": 900}, ignore_https_errors=True
    )
    context.add_init_script("""
      window.__testPad = null; window.__testPad2 = null;
      Object.defineProperty(navigator, 'getGamepads', {value: () => [window.__testPad,window.__testPad2]});
      window.__pad = (axis = 0, held = [], seat = 0) => {
        window[seat === 0 ? '__testPad' : '__testPad2'] = {connected:true,id:'Test standard pad',index:seat,mapping:'standard',
          axes:[0,axis,0,0],buttons:Array.from({length:17},(_,i)=>({pressed:held.includes(i),touched:held.includes(i),value:held.includes(i)?1:0}))};
      };
    """)
    page = context.new_page()
    runtime_errors = []
    page.on("pageerror", lambda error: runtime_errors.append(str(error)))
    ready = False
    try:
        page.goto(HTML.as_uri(), wait_until="domcontentloaded", timeout=60000)
        page.wait_for_function("window.__PADDLE__?.ready", timeout=120000)
        ready = True
    except Exception as exc:  # noqa: BLE001 — report every independent browser check
        checks += 1
        detail = (
            page.locator("#loadstatus").text_content()
            if page.locator("#loadstatus").count()
            else str(exc).splitlines()[0]
        )
        failures.append(f"FAIL single HTML boots: {detail}")
        print(failures[-1], flush=True)

    if ready:

        def state():
            return page.evaluate("__PADDLE__.getState()")

        def api(script):
            return page.evaluate("() => {" + script + "}")

        def start(court=0, mode="local"):
            page.evaluate(
                "(config) => __PADDLE__.start(config)", {"court": court, "mode": mode}
            )

        def reset_defaults():
            api(
                "__PADDLE__.setParam('ballSpeed',9.2);__PADDLE__.setParam('paddleSpeed',7.8);__PADDLE__.setParam('paddleSize',1.05);__PADDLE__.setParam('aiSkill',.7);__PADDLE__.setParam('chargeRate',.8);__PADDLE__.setParam('targetScore',5);"
            )

        check("single HTML title boots", lambda: require(state()["phase"] == "title"))
        check(
            "native WebGPU renderer active",
            lambda: require(
                state()["backend"]["backend"] == "WebGPU", state()["backend"]
            ),
        )
        check(
            "Rapier pinned version",
            lambda: require(
                page.evaluate("__PADDLE__.physics().version") == "0.19.3",
                page.evaluate("__PADDLE__.physics()"),
            ),
        )
        check(
            "native AnimationMixers present",
            lambda: require(
                state()["backend"].get("animationMixers", 0) > 0, state()["backend"]
            ),
        )
        check(
            "music defaults to ten percent",
            lambda: require(
                state()["settings"]["music"] == 0.1
                and state()["audio"]["musicVolume"] == 0.1
            ),
        )

        def title_navigation():
            page.keyboard.press("ArrowDown")
            page.keyboard.press("Enter")
            require(state()["screen"] == "courts", state()["screen"])
            require(page.locator(".courtcard").count() == 3)
            page.keyboard.press("Escape")
            require(state()["screen"] == "title")

        check("keyboard title focus and court picker", title_navigation)

        def collider_counts():
            result = []
            for court in range(3):
                start(court)
                result.append(page.evaluate("__PADDLE__.physics().colliders"))
            require(result == [5, 7, 9], result)

        check("all three sports have distinct collider worlds", collider_counts)

        def walls_bounce():
            start()
            result = api(
                "__PADDLE__.setBall(0,5.2,3,8);__PADDLE__.advance(.14);return __PADDLE__.getState();"
            )
            require(
                result["ball"]["vz"] < 0 and result["ball"]["z"] < 5.8, result["ball"]
            )

        check("Rapier side rail reflects ball", walls_bounce)

        def bumper_bounce():
            start(1)
            result = api(
                "__PADDLE__.setBall(-4.5,-2.5,9,0);__PADDLE__.advance(.14);return __PADDLE__.getState();"
            )
            require(result["ball"]["vx"] < 0, result["ball"])
            require(result["stats"]["banks"] >= 1, result["stats"])

        check("Bankshot physical bumper and bank statistic", bumper_bounce)

        def goal_wall():
            start(2)
            result = api(
                "__PADDLE__.setBall(9,4.1,10,0);__PADDLE__.advance(.15);return __PADDLE__.getState();"
            )
            require(
                result["ball"]["vx"] < 0 and result["scores"] == [0, 0], result["ball"]
            )

        check("Goal Rush back wall protects closed goal area", goal_wall)

        def goal_mouth():
            start(2)
            result = api(
                "__PADDLE__.setBall(10,0,10,0);__PADDLE__.advance(.12);return __PADDLE__.getState();"
            )
            require(
                result["scores"] == [1, 0] and result["phase"] == "point",
                result["scores"],
            )

        check("Goal Rush opening scores a point", goal_mouth)

        def paddle_bounce():
            start()
            result = api(
                "__PADDLE__.setPaddle(0,0);__PADDLE__.setBall(-8,0,-9,0);__PADDLE__.advance(.12);return __PADDLE__.getState();"
            )
            require(result["ball"]["vx"] > 0 and result["rally"] == 1, result["ball"])

        check("paddle return changes velocity and increments rally", paddle_bounce)

        def aim_return():
            start()
            page.keyboard.down("KeyD")
            try:
                result = api(
                    "__PADDLE__.setPaddle(0,0);__PADDLE__.setBall(-8,.6,-9,0);__PADDLE__.advance(.12);return __PADDLE__.getState();"
                )
                require(
                    result["ball"]["vx"] > 0 and result["ball"]["vz"] > 3,
                    result["ball"],
                )
            finally:
                page.keyboard.up("KeyD")

        check("edge contact and keyboard aim shape return angle", aim_return)

        def keyboard_move():
            start()
            page.keyboard.down("KeyW")
            try:
                result = api("__PADDLE__.advance(.25);return __PADDLE__.getState();")
                require(result["paddles"][0]["z"] < -1.8, result["paddles"][0])
                result = api("__PADDLE__.advance(2);return __PADDLE__.getState();")
                require(
                    -4.68 <= result["paddles"][0]["z"] <= -4.66, result["paddles"][0]
                )
            finally:
                page.keyboard.up("KeyW")

        check("keyboard movement and court bounds", keyboard_move)

        def second_player():
            start()
            page.keyboard.down("ArrowDown")
            try:
                result = api("__PADDLE__.advance(.3);return __PADDLE__.getState();")
                require(
                    result["paddles"][1]["z"] > 2
                    and abs(result["paddles"][0]["z"]) < 0.01
                )
            finally:
                page.keyboard.up("ArrowDown")

        check("local second keyboard player controls Mint", second_player)

        def power_shot():
            start()
            page.keyboard.down("Space")
            try:
                result = api(
                    "__PADDLE__.setBall(0,0,0,0);__PADDLE__.advance(1.3);return __PADDLE__.getState();"
                )
                require(result["paddles"][0]["charge"] > 0.99, result["paddles"][0])
                result = api(
                    "__PADDLE__.setPaddle(0,0);__PADDLE__.setBall(-8,0,-9,0);__PADDLE__.advance(.12);return __PADDLE__.getState();"
                )
                require(
                    result["stats"]["power"] == 1 and result["ball"]["vx"] > 11,
                    result["stats"],
                )
            finally:
                page.keyboard.up("Space")

        check("held charge creates a faster power return", power_shot)

        def dash():
            start()
            page.keyboard.down("KeyS")
            page.keyboard.down("ShiftLeft")
            try:
                result = api("__PADDLE__.advance(.1);return __PADDLE__.getState();")
                require(
                    result["paddles"][0]["z"] > 1.9
                    and result["paddles"][0]["cooldown"] > 1.4
                    and result["stats"]["dashes"] == 1,
                    result["paddles"][0],
                )
            finally:
                page.keyboard.up("KeyS")
                page.keyboard.up("ShiftLeft")
            result = api(
                "__PADDLE__.setBall(0,0,2.6,0);__PADDLE__.advance(1.7);return __PADDLE__.getState();"
            )
            require(result["paddles"][0]["cooldown"] == 0, result["paddles"][0])

        check("dash burst and cooldown recover", dash)

        def pause_dev():
            start()
            api("__PADDLE__.setBall(0,0,3,0);")
            page.keyboard.press("Escape")
            require(state()["phase"] == "pause" and state()["screen"] == "pause")
            before = state()["ball"]
            api("__PADDLE__.advance(.4);")
            require(state()["ball"] == before)
            page.locator('[data-action="dev"]').click()
            require(state()["screen"] == "dev")
            page.locator("#dev-ballSpeed").evaluate(
                "el => {el.value='14';el.dispatchEvent(new Event('input',{bubbles:true}))}"
            )
            require(state()["params"]["ballSpeed"] == 14)
            page.locator('[data-action="dev-auto"]').click()
            require(state()["perfect"])
            page.locator('[data-action="dev-debug"]').click()
            require(state()["debug"])
            page.locator('[data-action="dev-reset"]').click()
            require(
                state()["params"]["ballSpeed"] == 9.2
                and state()["params"]["targetScore"] == 5
            )
            page.locator('[data-action="resume"]').click()
            require(state()["phase"] == "play" and state()["screen"] == "game")
            api("__PADDLE__.point(0);")
            require(state()["phase"] == "point")
            page.keyboard.press("Escape")
            require(state()["phase"] == "pause" and state()["screen"] == "pause")
            api("__PADDLE__.advance(.4);")
            require(state()["phase"] == "pause")
            page.locator('[data-action="resume"]').click()
            require(state()["phase"] == "point" and state()["screen"] == "game")
            api("__PADDLE__.advance(1.6);")
            require(state()["phase"] in ["serve", "play"])

        check(
            "pause freezes play and point phases; dev tools and live reset work",
            pause_dev,
        )

        def cup_playthrough():
            reset_defaults()
            start(mode="cup")
            for court in range(3):
                require(state()["court"] == court)
                for _ in range(5):
                    api("__PADDLE__.point(0);__PADDLE__.advance(1.6);")
                require(
                    state()["phase"] == "result" and state()["winner"] == 0,
                    state()["phase"],
                )
                if court < 2:
                    page.locator('[data-action="next"]').click()
            require(
                state()["wins"] == [True, True, True] and state()["best"]["gold"] >= 1,
                state()["wins"],
            )
            require("The crown is yours." in page.locator("#modal").inner_text())
            page.locator('[data-action="replay"]').click()
            require(
                state()["court"] == 0
                and state()["scores"] == [0, 0]
                and state()["wins"] == []
            )

        check("complete three-event Royale Cup, crown, and replay", cup_playthrough)

        def physics_cup():
            reset_defaults()
            start(mode="cup")
            api(
                "__PADDLE__.setParam('targetScore',2);__PADDLE__.setParam('aiSkill',.1);"
            )
            page.keyboard.down("Space")
            try:
                for court in range(3):
                    result = api("""
                      let frames = 0;
                      let s = __PADDLE__.getState();
                      while(s.phase !== 'result' && frames++ < 18000){
                        const b=s.ball;
                        const target=s.court===2?0:(s.paddles[1].z>0?-4.6:4.6);
                        const angle=Math.atan((target-b.z)/18.2);
                        const offset=angle*1.25/.8;
                        __PADDLE__.setPaddle(0,Math.max(-4.67,Math.min(4.67,b.z-offset)));
                        __PADDLE__.advance(1/60);
                        s=__PADDLE__.getState();
                      }
                      return {phase:s.phase,winner:s.winner,court:s.court,scores:s.scores,stats:s.stats,frames,wins:s.wins};
                    """)
                    require(
                        result["phase"] == "result" and result["winner"] == 0, result
                    )
                    require(
                        result["stats"]["bestRally"] >= 1
                        and result["stats"]["power"] >= 1,
                        result,
                    )
                    if court < 2:
                        api("__PADDLE__.next();")
                require(state()["wins"] == [True, True, True])
            finally:
                page.keyboard.up("Space")
                reset_defaults()

        check(
            "natural-physics Cup playthrough using paddle autopilot, no score hook",
            physics_cup,
        )

        def loss_result():
            start()
            api("__PADDLE__.setParam('targetScore',1);__PADDLE__.point(1);")
            require(state()["phase"] == "result" and state()["winner"] == 1)
            require("Mint takes the court." in page.locator("#modal").inner_text())
            reset_defaults()

        check("losing a match produces the correct results", loss_result)

        def settings():
            api("__PADDLE__.act('quit');")
            page.locator('[data-action="settings"]').click()
            page.locator('[data-action="glyphs"]').click()
            require(state()["settings"]["glyphs"] == "xbox")
            require("Xbox" in page.locator('[data-action="glyphs"]').inner_text())
            page.locator("#music").evaluate(
                "el => {el.value='17';el.dispatchEvent(new Event('input',{bubbles:true}))}"
            )
            require(state()["audio"]["musicVolume"] == 0.17)
            saved = page.evaluate(
                "JSON.parse(localStorage.getItem('paddle-royale-settings'))"
            )
            require(saved["glyphs"] == "xbox" and saved["music"] == 0.17, saved)
            page.locator('[data-action="motion"]').click()
            require(state()["settings"]["reduceMotion"])
            page.locator('[data-action="mute"]').click()
            require(state()["audio"]["muted"])
            page.locator('[data-action="mute"]').click()
            page.locator('[data-action="motion"]').click()
            page.locator('[data-action="glyphs"]').click()
            page.locator("#music").evaluate(
                "el => {el.value='10';el.dispatchEvent(new Event('input',{bubbles:true}))}"
            )
            page.keyboard.press("Escape")

        check("audio, motion, glyph settings persist to local storage", settings)

        def attract():
            api("__PADDLE__.act('quit');__PADDLE__.setIdle();")
            page.wait_for_function("__PADDLE__.getState().attract", timeout=5000)
            require(state()["screen"] == "attract")
            api("__PADDLE__.advance(2.5);")
            require(state()["phase"] in ["play", "point", "serve"])
            page.keyboard.press("KeyZ")
            require(state()["phase"] == "title" and not state()["attract"])
            api("__PADDLE__.act('courts');__PADDLE__.setIdle();")
            page.wait_for_function("__PADDLE__.getState().attract", timeout=5000)
            page.mouse.move(30, 90)
            require(state()["phase"] == "title" and not state()["attract"])

        check("ten-second idle attract and any-input exit", attract)

        def controller():
            start(mode="solo")
            page.evaluate("__pad(.9, [0])")
            page.wait_for_function(
                "document.querySelector('#controlshint')?.textContent.includes('R1')",
                timeout=5000,
            )
            result = api("__PADDLE__.advance(.25);return __PADDLE__.getState();")
            require(
                result["paddles"][0]["z"] > 1.5 and result["paddles"][0]["charge"] > 0,
                result["paddles"][0],
            )
            page.evaluate("__pad(0, [])")
            page.wait_for_timeout(80)
            page.evaluate("__pad(0, [9])")
            page.wait_for_function(
                "__PADDLE__.getState().phase === 'pause'", timeout=3000
            )
            page.evaluate("__pad(0, [])")
            page.wait_for_timeout(80)
            page.evaluate("window.__testPad = null")
            page.keyboard.press("Escape")
            require(state()["screen"] == "game")

        check("emulated standard gamepad movement, charge, prompts, pause", controller)

        def second_controller():
            api("__PADDLE__.act('quit');")
            page.evaluate("__pad(0, [], 0);__pad(0, [], 1)")
            page.wait_for_timeout(100)
            page.evaluate("__pad(.9, [], 1)")
            page.wait_for_function(
                "document.querySelector('.focused')?.dataset.action === 'courts'",
                timeout=3000,
            )
            page.evaluate("__pad(0, [], 1)")
            page.wait_for_timeout(100)
            page.evaluate("__pad(0, [0], 1)")
            page.wait_for_function(
                "__PADDLE__.getState().screen === 'courts'", timeout=3000
            )
            page.evaluate("__pad(0, [], 1)")
            start()
            page.evaluate("__pad(.9, [], 1)")
            page.wait_for_timeout(80)
            result = api("__PADDLE__.advance(.25);return __PADDLE__.getState();")
            require(
                result["paddles"][1]["z"] > 1.5
                and abs(result["paddles"][0]["z"]) < 0.01,
                result["paddles"],
            )
            page.evaluate("window.__testPad = null;window.__testPad2 = null")

        check(
            "second standard pad alone navigates menus and controls Mint",
            second_controller,
        )

        def mouse():
            start()
            scene = page.locator("#scene")
            scene.dispatch_event(
                "pointermove", {"pointerType": "mouse", "clientX": 720, "clientY": 650}
            )
            api("__PADDLE__.advance(.2);")
            require("MOUSE" in page.locator("#controlshint").inner_text())
            scene.dispatch_event(
                "pointerdown",
                {"pointerType": "mouse", "button": 0, "clientX": 720, "clientY": 650},
            )
            result = api("__PADDLE__.advance(.3);return __PADDLE__.getState();")
            require(result["paddles"][0]["charge"] > 0.1)
            scene.dispatch_event("pointerup", {"pointerType": "mouse", "button": 0})

        check("mouse world aim and left-button charge", mouse)

        def touch():
            start()
            scene = page.locator("#scene")
            scene.dispatch_event(
                "pointerdown",
                {
                    "pointerType": "touch",
                    "pointerId": 11,
                    "clientX": 200,
                    "clientY": 300,
                },
            )
            scene.dispatch_event(
                "pointermove",
                {
                    "pointerType": "touch",
                    "pointerId": 11,
                    "clientX": 220,
                    "clientY": 400,
                },
            )
            result = api("__PADDLE__.advance(.25);return __PADDLE__.getState();")
            require(
                result["paddles"][0]["z"] > 1.5
                and result["paddles"][0]["charge"] > 0.1,
                result["paddles"][0],
            )
            require(
                page.locator("body").evaluate(
                    "el => el.classList.contains('touch-mode')"
                )
            )
            scene.dispatch_event(
                "pointerdown",
                {
                    "pointerType": "touch",
                    "pointerId": 12,
                    "clientX": 900,
                    "clientY": 400,
                },
            )
            result = api("__PADDLE__.advance(.02);return __PADDLE__.getState();")
            require(result["stats"]["dashes"] >= 1)
            scene.dispatch_event("pointerup", {"pointerType": "touch", "pointerId": 11})
            scene.dispatch_event("pointerup", {"pointerType": "touch", "pointerId": 12})

        check("touch invisible stick, assisted charge, second-finger dash", touch)

        def offline_audio():
            result = page.evaluate("__PADDLE__.audioProbe()")
            require(
                result["supported"]
                and result["finite"]
                and result["rms"] > 0.001
                and 0 < result["peak"] < 1
                and result["nonzero"] > 10000,
                result,
            )
            require(result["events"]["voice"] >= 1 and result["events"]["music"] >= 12)

        check(
            "offline synthesized music, effects and gibberish are finite and audible",
            offline_audio,
        )

        def credits():
            api("__PADDLE__.act('quit');__PADDLE__.act('about');")
            for tab, label in [
                ("source", "Source Information"),
                ("testing", "Testing Feedback"),
                ("engine", "Engine Feedback"),
                ("prompt", "Prompt Feedback"),
            ]:
                page.locator(f'[data-action="about-{tab}"]').click()
                require(page.locator(".abouttext").inner_text().strip(), label)

        check("all required About feedback screens are populated", credits)
        check(
            "no uncaught runtime errors",
            lambda: require(not runtime_errors, runtime_errors[:3]),
        )

    context.close()
    browser.close()

print(f"{checks} checks, {len(failures)} failures")
sys.exit(1 if failures else 0)
