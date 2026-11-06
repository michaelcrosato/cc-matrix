"""Behavior tests. Browser rendering is checked through renderer state; visuals use GPU readback separately."""

import functools
import http.server
import json
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright
from test_audio import test_audio

D = Path(__file__).resolve().parent
ROOT = D.parent
NAME = D.name + ".html"
ARGS = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-webgpu-adapter=swiftshader",
    "--use-angle=swiftshader",
    "--disable-dev-shm-usage",
]


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def vendor(route):
    name = route.request.url.split("/")[-1]
    lookup = {
        "three.webgpu.js": "three.webgpu.js",
        "three.core.js": "three.core.js",
        "three.tsl.js": "three.tsl.js",
        "rapier.mjs": "rapier.js",
    }
    if name in lookup:
        route.fulfill(
            path=str(D / "vendor" / lookup[name]),
            content_type="text/javascript",
            headers={"Access-Control-Allow-Origin": "*"},
        )
    else:
        route.continue_()


def run_game(url):
    failures = []
    count = 0

    def check(value, label):
        nonlocal count
        count += 1
        if not value:
            failures.append(label)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=ARGS)
        ctx = browser.new_context(
            viewport={"width": 1280, "height": 800}, ignore_https_errors=True
        )
        ctx.route("https://cdn.jsdelivr.net/**", vendor)
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(url + "?test=1", wait_until="domcontentloaded")
        try:
            page.wait_for_function(
                'window.__game?.state().ready || document.getElementById("bootError").textContent',
                timeout=60000,
            )
            state = lambda: page.evaluate("window.__game.state()")
            js = lambda code: page.evaluate(code)
            check(
                js("!!window.__game?.state().ready"),
                "Game boots with real WebGPU and Rapier",
            )
            if not js("!!window.__game?.state().ready"):
                raise RuntimeError(page.locator("#bootError").inner_text())
            check(state()["renderer"] == "WebGPU", "WebGPU backend active")
            check(state()["settings"]["music"] == 10, "Music defaults to 10 percent")
            check(
                state()["animationMixers"] == 2, "Vehicles use native animation mixers"
            )
            # Title preview must never become a scored round, even with long menus.
            js("window.__game.test.step(65,{})")
            check(
                state()["mode"] == "title" and state()["screen"] == "title",
                "Title preview never opens round results",
            )
            js("window.__game.test.title()")
            page.locator("[data-action=circuit]").click()
            check(
                state()["stage"] == 0 and state()["mode"] == "play",
                "Circuit begins at first contact",
            )

            # Deterministic fixed-step checks freeze RAF simulation and run the same actual physics loop.
            def setup(stage, x0=-10, z0=7, x1=-3, z1=7):
                js(
                    f'window.__game.test.start("duel",{stage});window.__game.test.pause();window.__game.test.bots(false);window.__game.test.position(0,{x0},{z0});window.__game.test.position(1,{x1},{z1});window.__game.test.step(1.8,{{}})'
                )

            setup(0)
            x = state()["entities"][0]["x"]
            js("window.__game.test.step(.4,{mx:1,mz:0})")
            check(
                state()["entities"][0]["x"] > x + 1,
                "Movement advances dynamic Rapier body",
            )
            js(
                "window.__game.test.position(0,-10,7);window.__game.test.aim(0,-Math.PI/2);window.__game.test.fire(0);window.__game.test.step(.5,{})"
            )
            check(
                state()["scores"][0] == 1,
                "Straight projectile actually collides and scores",
            )
            check(
                state()["hitCount"] > 0 and state()["collisions"] > 0,
                "Physics collision events drive combat",
            )
            setup(1, -10, 8, -3, 8)
            js(
                "window.__game.test.aim(0,-Math.PI/2);window.__game.test.fire(0);window.__game.test.step(.5,{})"
            )
            check(
                state()["scores"][0] == 0,
                "Unbanked shell cannot score in billiard field",
            )
            js(
                "window.__game.test.aim(0,Math.atan2(-7,-4.99));window.__game.test.fire(0);window.__game.test.step(1,{})"
            )
            check(state()["bounceCount"] > 0, "Rapier physically rebounds shells")
            check(
                state()["scores"][0] == 1,
                "Banked shell arms and scores after real rebound",
            )
            setup(2, -12, 8, 12, 8)
            js("window.__game.test.aim(0,Math.PI);window.__game.test.fire(0)")
            check(
                any(b["z"] > 8 for b in state()["bullets"]),
                "Guided projectile begins on firing trajectory",
            )
            js("window.__game.test.step(.25,{ax:1,az:0,aim:true,fire:true})")
            before = state()["bullets"][0]["x"] if state()["bullets"] else 0
            js("window.__game.test.step(.3,{ax:1,az:0,aim:true,fire:true})")
            check(
                any(b["x"] > before + 0.3 for b in state()["bullets"]),
                "Holding fire steers shell toward changed aim",
            )
            setup(3, -10, 8, 13, 8)
            js("window.__game.test.setReveal(1,0);window.__game.test.step(.02,{})")
            check(
                not state()["entities"][1]["visible"],
                "Invisible rival disappears after reveal expires",
            )
            js("window.__game.test.boost(0);window.__game.test.step(.02,{})")
            check(
                state()["entities"][1]["reveal"] > 2
                and state()["entities"][1]["visible"],
                "Radar ability reveals invisible rival",
            )
            js(
                "window.__game.test.setReveal(1,0);window.__game.test.position(1,15.5,8);window.__game.test.step(.2,{})"
            )
            check(
                state()["entities"][1]["reveal"] > 0,
                "Wall contact reveals invisible tank",
            )
            setup(4, 15.5, 0, -10, -6)
            wraps = state()["wrapCount"]
            js("window.__game.test.position(0,15.5,0)")
            js("window.__game.test.step(.4,{mx:1,mz:0})")
            check(
                state()["wrapCount"] > wraps and state()["entities"][0]["x"] < 0,
                "Jet wraps across arena edge",
            )
            # Every round and the ending, using developer hit award after independent real-hit validation.
            js(
                'window.__game.test.start("circuit",0);window.__game.test.pause();window.__game.test.bots(false)'
            )
            for stage in range(5):
                js("for(let i=0;i<4;i++)window.__game.test.score(0)")
                check(
                    state()["roundOver"] and state()["screen"] == "result",
                    f"Circuit field {stage + 1} ends at four hits",
                )
                page.keyboard.press("Escape")
                check(
                    state()["screen"] == "result",
                    f"Result screen {stage + 1} cannot escape into frozen play",
                )
                js("window.__game.test.continue()")
                if stage < 4:
                    check(
                        state()["stage"] == stage + 1,
                        f"Circuit advances to field {stage + 2}",
                    )
                    js("window.__game.test.pause();window.__game.test.bots(false)")
            check(
                state()["mode"] == "finished" and state()["totals"][0] == 20,
                "Complete five-field playthrough reaches ending with cumulative score",
            )
            # Live developer settings and reset through actual pause UI.
            js(
                'window.__game.test.title();window.__game.test.start("duel",0);window.__game.test.pause()'
            )
            page.locator("#pause [data-action=dev]").click()
            page.locator("#tune_speed").evaluate(
                'e=>{e.value=9;e.dispatchEvent(new Event("input",{bubbles:true}))}'
            )
            page.locator("#god").check()
            check(
                state()["tune"]["speed"] == 9 and state()["god"],
                "Developer controls change live gameplay variables",
            )
            page.locator("[data-action=devReset]").click()
            check(
                state()["tune"]["speed"] == 5.8 and not state()["god"],
                "Developer reset restores defaults",
            )
            page.locator("#dev [data-action=back]").click()
            page.locator("#pause [data-action=settings]").click()
            page.locator("#glyph").select_option("xbox")
            check(
                state()["settings"]["glyph"] == "xbox", "Xbox glyph preference updates"
            )
            page.locator("#music").evaluate(
                'e=>{e.value=20;e.dispatchEvent(new Event("input",{bubbles:true}))}'
            )
            check(
                abs(state()["audio"]["musicVolume"] - 0.2) < 0.001,
                "Music volume is live",
            )
            page.locator("#music").evaluate(
                'e=>{e.value=10;e.dispatchEvent(new Event("input",{bubbles:true}))}'
            )
            page.locator("#settings [data-action=back]").click()
            before = state()["roundLeft"]
            page.wait_for_timeout(150)
            check(
                abs(state()["roundLeft"] - before) < 0.001,
                "Solo pause freezes round clock",
            )
            js("window.__game.test.title();window.__game.test.forceAttract()")
            page.wait_for_function("window.__game.state().attract", timeout=10000)
            check(
                state()["attract"],
                "Attract mode starts after title inactivity threshold",
            )
            page.keyboard.press("KeyQ")
            check(
                state()["mode"] == "title" and not state()["attract"],
                "Any keyboard input exits attract to title",
            )
            # Virtual standard-mapping controller.
            js(
                'window.__pad={connected:true,index:0,id:"Test DualSense",mapping:"standard",axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0,touched:false}))};Object.defineProperty(navigator,"getGamepads",{value:()=>[window.__pad]});window.__pad.buttons[0]={pressed:true,value:1}'
            )
            page.wait_for_function('window.__game.state().mode==="play"', timeout=15000)
            js("window.__pad.buttons[0]={pressed:false,value:0};window.__pad.axes[0]=1")
            page.wait_for_function('window.__game.state().inputKind==="gamepad"')
            check(
                state()["inputKind"] == "gamepad",
                "Emulated DualSense controls game and prompt selection",
            )
            js("window.__pad.axes[0]=0;window.__pad.buttons[9]={pressed:true,value:1}")
            page.wait_for_function('window.__game.state().screen==="pause"')
            check(state()["paused"], "Controller Options opens pause")
            js(
                "window.__pad.buttons[9]={pressed:false,value:0};window.__pad.buttons[13]={pressed:true,value:1}"
            )
            page.wait_for_function(
                'window.__game.state().focus==="Settings"', timeout=15000
            )
            check(state()["focus"] == "Settings", "D-pad moves menu focus")
            js(
                "window.__pad.buttons[13]={pressed:false,value:0};window.__pad.buttons[0]={pressed:true,value:1}"
            )
            page.wait_for_function('window.__game.state().screen==="settings"')
            check(
                state()["screen"] == "settings",
                "Controller Cross activates focused menu item",
            )
            js("window.__pad.buttons[0]={pressed:false,value:0}")
            check(not errors, "No uncaught browser exceptions: " + str(errors))
            page.close()
            ctx.close()
            # Touch input in a phone profile, using actual multitouch browser events.
            mobile = browser.new_context(
                viewport={"width": 844, "height": 390},
                has_touch=True,
                is_mobile=True,
                device_scale_factor=1,
                ignore_https_errors=True,
            )
            mobile.route("https://cdn.jsdelivr.net/**", vendor)
            page = mobile.new_page()
            page.goto(url + "?test=1", wait_until="domcontentloaded")
            page.wait_for_function("window.__game?.state().ready", timeout=60000)
            check(
                page.locator(".menu-small").bounding_box()["y"]
                + page.locator(".menu-small").bounding_box()["height"]
                < 390,
                "Short landscape title controls fit viewport",
            )
            page.locator("[data-action=circuit]").tap()
            check(
                page.evaluate('document.body.classList.contains("touch")'),
                "Touch menu tap enables minimal touch HUD immediately",
            )
            session = mobile.new_cdp_session(page)
            session.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchStart",
                    "touchPoints": [
                        {"x": 120, "y": 280, "id": 1},
                        {"x": 650, "y": 260, "id": 2},
                    ],
                },
            )
            session.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchMove",
                    "touchPoints": [
                        {"x": 160, "y": 250, "id": 1},
                        {"x": 690, "y": 235, "id": 2},
                    ],
                },
            )
            page.wait_for_timeout(300)
            check(
                page.evaluate('window.__game.state().inputKind==="touch"'),
                "Multitouch drives invisible movement and aim sticks",
            )
            session.send(
                "Input.dispatchTouchEvent", {"type": "touchCancel", "touchPoints": []}
            )
            check(
                page.evaluate(
                    'document.getElementById("leftTouch").style.display==="none"'
                ),
                "Canceled touch releases movement stick",
            )
            page.close()
            mobile.close()
            af, ac = test_audio(browser, D)
            failures.extend(af)
            count += ac
        except Exception as exc:  # noqa: BLE001 - report failures and close test resources
            failures.append("Game suite exception: " + str(exc))
        finally:
            browser.close()
    return failures, count


if __name__ == "__main__":
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        failures, count = run_game(f"http://127.0.0.1:{server.server_port}/{NAME}")
    finally:
        server.shutdown()
        server.server_close()
    report = {"checks": count, "passed": count - len(failures), "failures": failures}
    (D / "test-game-report.json").write_text(json.dumps(report, indent=2))
    for failure in failures:
        print("FAIL:", failure)
    print(f"{count - len(failures)}/{count} game and audio checks passed")
    raise SystemExit(bool(failures))
