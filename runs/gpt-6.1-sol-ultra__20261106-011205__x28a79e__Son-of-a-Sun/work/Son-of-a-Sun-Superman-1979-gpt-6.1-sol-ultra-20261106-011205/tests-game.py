"""One-command gameplay verification: prints failures and one final count only."""

import json
import os
import sys
import threading
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
checks = 0
failures = []


def check(condition, label, detail=""):
    global checks
    checks += 1
    if not condition:
        message = f"FAIL {label}" + (f": {detail}" if detail else "")
        failures.append(message)
        print(message, flush=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


@contextmanager
def serve():
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}/game.html?test=1"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def boot(page, url, expected_backend="WebGPU"):
    page.goto(url, wait_until="domcontentloaded", timeout=120000)
    page.wait_for_function(
        "window.__sun?.state.ready || window.__bootError", timeout=120000
    )
    error = page.evaluate("window.__bootError || null")
    if error:
        raise AssertionError("boot: " + error)
    check(
        page.title().startswith("Son of a Sun"), "server serves this game", page.title()
    )
    check(
        page.evaluate("__sun.state.backend") == expected_backend,
        f"{expected_backend} backend",
    )
    page.wait_for_function("__sun.renderInfo().drawCalls > 0", timeout=120000)
    check(
        page.evaluate("__sun.renderInfo().drawCalls") > 0, "renderer submits geometry"
    )
    if page.evaluate("__sun.state.demo"):
        page.evaluate("__sun.action('title')")


def state(page):
    return page.evaluate("__sun.state")


def step(page, seconds, controls=None, warp=None):
    return page.evaluate(
        """({seconds, controls, warp}) => {
      if(warp) __sun.warp(warp);
      if(controls !== null) __sun.input(controls);
      __sun.advanceTime(seconds);
      return __sun.state;
    }""",
        {"seconds": seconds, "controls": controls, "warp": warp},
    )


def target(page, offset=(0, 0, 0)):
    return page.evaluate(
        "offset => __sun.target().map((v,i)=>v+offset[i])", list(offset)
    )


def run(headed=False, visual_only=False, webgl=False, probe=False):
    # Keep browser temporary files in this task folder; a relative TMPDIR also
    # keeps Linux's 108-byte Unix-socket path limit from breaking headed Chrome.
    os.chdir(ROOT)
    os.environ["TMPDIR"] = "."
    with serve() as url, sync_playwright() as p:
        gpu_args = (
            ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
            if webgl
            else [
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--use-angle=swiftshader",
            ]
        )
        browser = p.chromium.launch(headless=not headed, args=gpu_args)
        try:
            context = browser.new_context(
                viewport={"width": 1920, "height": 1080}, ignore_https_errors=True
            )
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            console_errors = []
            page.on(
                "console",
                lambda m: console_errors.append(m.text) if m.type == "error" else None,
            )
            if probe:
                page.goto(
                    url.replace("game.html", "minimal-webgpu.html"),
                    wait_until="domcontentloaded",
                )
                page.wait_for_function(
                    "window.probe?.ready || window.probe?.error", timeout=30000
                )
                page.wait_for_timeout(5000)
                result = page.evaluate("window.probe")
                (ROOT / "qa-minimal-webgpu.json").write_text(
                    json.dumps(
                        {"state": result, "consoleErrors": console_errors}, indent=2
                    )
                )
                page.screenshot(path=str(ROOT / "qa-minimal-webgpu.png"))
                check(
                    result["ready"] and result["backend"] == "WebGPU",
                    "minimal cube WebGPU initialized",
                )
                check(
                    result.get("render", {}).get("drawCalls", 0) > 0,
                    "minimal cube submits draws",
                    json.dumps(result),
                )
                check(
                    not result["lost"] and not result["error"] and not errors,
                    "minimal cube keeps GPU device",
                    json.dumps(result),
                )
                context.close()
                return
            boot(
                page,
                url + ("&renderer=webgl" if webgl else ""),
                "WebGL2" if webgl else "WebGPU",
            )
            if visual_only:
                page.wait_for_timeout(20000 if not webgl else 3000)
                page.evaluate("__sun.action('title')")
                page.wait_for_timeout(500)
                suffix = "webgl" if webgl else "headed"
                page.screenshot(path=str(ROOT / f"qa-title-{suffix}.png"))
                page.locator('[data-act="start"]').click()
                page.evaluate("__sun.warp([0,65,65])")
                page.wait_for_function(
                    "document.querySelector('#chapter').classList.contains('hidden')",
                    timeout=55000,
                )
                page.screenshot(path=str(ROOT / f"qa-gameplay-{suffix}.png"))
                (ROOT / f"qa-render-{suffix}.json").write_text(
                    json.dumps(
                        {
                            "render": page.evaluate("__sun.renderInfo()"),
                            "consoleErrors": console_errors,
                        },
                        indent=2,
                    )
                )
                check(not errors, "headed render browser errors", "; ".join(errors))
                shader_errors = [
                    e
                    for e in console_errors
                    if any(
                        x in e.lower()
                        for x in [
                            "validation",
                            "shader",
                            "pipeline",
                            "compilation",
                            "uncaptured",
                        ]
                    )
                ]
                check(
                    not shader_errors,
                    "GPU shader console errors",
                    "; ".join(shader_errors),
                )
                context.close()
                return
            page.screenshot(path=str(ROOT / "qa-title.png"))
            native = page.evaluate("__sun.native()")
            check(
                native["rapier"] and native["colliders"] > 20,
                "native Rapier collision world",
                str(native),
            )
            check(native["animation"], "native AnimationMixer")
            check(
                {"idle", "fly", "boost"}.issubset(state(page)["nativeAnimations"][0]),
                "native animation clips",
            )
            check(
                state(page)["settings"]["music"] == 0.1, "music defaults to 10 percent"
            )
            offline = page.evaluate("__sun.offlineTest()")
            check(
                offline["passed"],
                "audible unclipped procedural audio",
                json.dumps(offline),
            )

            # Attract is entered by the same timeout path as normal title idling.
            page.evaluate("__sun.setAttract()")
            page.wait_for_function("__sun.state.demo", timeout=10000)
            check(state(page)["mode"] == "demo", "attract enters after title timeout")
            step(page, 8)
            check(state(page)["runTime"] >= 8, "attract replay simulates")
            page.keyboard.press("Enter")
            page.wait_for_function("!__sun.state.demo")
            check(not state(page)["demo"], "any input exits attract")
            page.evaluate("__sun.action('title')")
            page.evaluate("""() => {
              __sun.openMenu('tabroom');
              __sun.setAttract();
              document.querySelector('#roomName').dispatchEvent(new KeyboardEvent('keydown', {code:'KeyA', bubbles:true}));
            }""")
            page.wait_for_timeout(100)
            check(not state(page)["demo"], "typing keeps menu idle timer active")
            page.evaluate("__sun.action('title')")

            page.locator('[data-act="start"]').click()
            page.wait_for_function("__sun.state.mode === 'playing'")
            check(state(page)["actors"] == 1, "solo shift starts")
            page.evaluate("__sun.input(null)")
            before = state(page)["heroes"][0]["pos"]
            page.keyboard.down("Space")
            page.wait_for_function(
                "y => __sun.state.heroes[0].pos[1] > y + 1",
                arg=before[1],
                timeout=30000,
            )
            page.keyboard.up("Space")
            after = state(page)["heroes"][0]["pos"]
            check(
                after[1] > before[1] + 1, "actual keyboard rise", str([before, after])
            )
            # A known roof collider: fly down onto the Evening Sun.
            collision_before = state(page)["collisionCount"]
            page.evaluate("__sun.warp([-65,45,-40]); __sun.input(null)")
            page.keyboard.down("ControlLeft")
            page.wait_for_function(
                "n => __sun.state.collisionCount > n",
                arg=collision_before,
                timeout=30000,
            )
            page.keyboard.up("ControlLeft")
            collision_state = state(page)
            check(
                collision_state["heroes"][0]["pos"][1] > 31.3,
                "solid building blocks flight",
                str(collision_state["heroes"][0]["pos"]),
            )
            check(
                collision_state["collisionCount"] > collision_before,
                "actual keyboard collision contacts",
            )

            # The whole campaign uses normal ability processing, only teleporting travel.
            page.evaluate("__sun.start()")
            for i in range(3):
                s = step(page, 0.8, {"action": True}, target(page))
                check(s["heroes"][0]["carry"] >= 0, f"citizen {i + 1} can be caught")
                s = step(page, 0.8, {"action": True}, [0, 5, 65])
                check(
                    s["rescued"] == i + 1,
                    f"citizen {i + 1} safely delivered",
                    str(s["rescued"]),
                )
            check(state(page)["mission"] == 1, "rescue chapter advances")
            s = step(
                page, 6.2, {"freeze": True, "action": False}, target(page, (0, 4, 8))
            )
            check(
                s["fireProgress"] == 1 and s["mission"] == 2,
                "freeze breath extinguishes rooftop",
            )
            for _ in range(22):
                if state(page)["mission"] != 2:
                    break
                step(
                    page,
                    0.25,
                    {"freeze": False, "action": True},
                    target(page, (0, 1, 5)),
                )
            check(
                state(page)["tramProgress"] == 1 and state(page)["mission"] == 3,
                "strength brakes moving tram",
            )
            page.evaluate("__sun.input({}); __sun.refill()")
            step(page, 0.05, {}, target(page, (0, 0, 10)))
            page.screenshot(path=str(ROOT / "qa-gameplay.png"))
            s = step(page, 0.8, {"action": True, "freeze": False})
            check(not any(n[1] for n in s["nodes"]), "unfrozen emitter refuses punch")
            for i in range(3):
                s = step(
                    page,
                    2.3,
                    {"freeze": True, "action": False},
                    target(page, (0, 0, 9)),
                )
                check(
                    sum(n[0] >= 0.95 for n in s["nodes"]) >= i + 1,
                    f"emitter {i + 1} freezes",
                    json.dumps(
                        {"nodes": s["nodes"], "energy": s["heroes"][0]["energy"]}
                    ),
                )
                s = step(page, 0.7, {"freeze": False, "action": True})
                check(
                    sum(n[1] for n in s["nodes"]) == i + 1, f"emitter {i + 1} shatters"
                )
                if i < 2:
                    s = step(
                        page, 12, {"freeze": False, "action": False}, [150, 100, 150]
                    )
                    check(
                        s["heroes"][0]["energy"] > 95,
                        f"sunlight recharges before emitter {i + 2}",
                    )
            s = state(page)
            check(
                s["finished"] and s["mode"] == "victory" and s["hope"] > 0,
                "whole campaign reaches victory",
                json.dumps({k: s[k] for k in ["mode", "hope", "finished", "score"]}),
            )
            check(s["score"] >= 5000, "campaign awards score", str(s["score"]))
            page.locator('[data-act="freeflight"]').click()
            check(
                state(page)["mode"] == "playing" and state(page)["finished"],
                "victory unlocks free flight",
            )
            for i in range(3):
                s = step(
                    page,
                    0.9,
                    {"freeze": False, "action": True},
                    target(page, (0, 2, 0)),
                )
                check(
                    s["heroes"][0]["bridgeCarry"] >= 0,
                    f"bridge truss {i + 1} can be carried",
                )
                s = step(
                    page,
                    0.9,
                    {"freeze": False, "action": True},
                    target(page, (0, 3, 0)),
                )
                check(
                    sum(s["bridgeDone"]) == i + 1,
                    f"bridge truss {i + 1} repairs socket",
                )
            step(page, 0.3, {"action": False}, target(page))
            s = step(page, 1.1, {"action": True})
            check(s["heroes"][0]["reporter"], "telephone booth changes to reporter")
            step(page, 0.2, {"action": False})
            s = step(page, 1.1, {"action": True})
            check(not s["heroes"][0]["reporter"], "telephone booth restores superhero")

            page.keyboard.press("Escape")
            check(state(page)["mode"] == "paused", "keyboard opens pause")
            frozen_time = state(page)["runTime"]
            page.wait_for_timeout(250)
            check(
                abs(state(page)["runTime"] - frozen_time) < 0.02,
                "solo pause stops simulation",
            )
            page.locator('[data-act="dev"]').click()
            slider = page.locator("#flightSpeed")
            slider.fill("52")
            slider.dispatch_event("input")
            check(
                state(page)["tuning"]["flightSpeed"] == 52,
                "developer balance slider applies live",
            )
            slider.focus()
            page.keyboard.press("ArrowRight")
            check(
                state(page)["tuning"]["flightSpeed"] == 53,
                "keyboard arrows adjust focused live slider",
            )
            page.locator('[data-act="defaults"]').click()
            check(
                state(page)["tuning"]["flightSpeed"] == 30,
                "developer reset restores defaults",
            )
            page.locator('[data-act="back"]').click()
            page.locator('#panel [data-act="settings"]').click()
            page.locator('[data-act="glyphs"]').click()
            check(state(page)["settings"]["glyphs"] == "xbox", "Xbox glyph preference")
            page.locator('[data-act="back"]').click()
            page.locator('#panel [data-act="credits"]').click()
            credits = page.locator("#creditsContent").inner_text()
            check(
                all(
                    x in credits
                    for x in [
                        "Source Information",
                        "Testing Feedback",
                        "Engine Feedback",
                        "Prompt Feedback",
                        "added on import",
                    ]
                ),
                "all required credits sections",
            )
            page.locator('[data-act="back"]').click()
            page.locator('[data-act="resume"]').click()

            # Standard Gamepad API mapping, including navigation and input glyphs.
            page.evaluate(
                """() => {window.qaPad={id:'QA standard pad',index:0,connected:true,mapping:'standard',axes:[0,-1,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:performance.now()};navigator.getGamepads=()=>[qaPad];__sun.input(null);__sun.warp([0,80,65]);}"""
            )
            before = state(page)["heroes"][0]["pos"]
            page.wait_for_function(
                "z => __sun.state.heroes[0].pos[2] < z - 1",
                arg=before[2],
                timeout=30000,
            )
            after = state(page)["heroes"][0]["pos"]
            check(
                after[2] < before[2] - 1, "standard gamepad flies", str([before, after])
            )
            check(
                "RT" in page.locator("#controls").inner_text(),
                "last-input gamepad Xbox prompts",
            )
            page.evaluate(
                "qaPad.axes=[0,0,0,0];qaPad.buttons[9]={pressed:true,touched:true,value:1}"
            )
            page.wait_for_function("__sun.state.mode === 'paused'")
            check(state(page)["mode"] == "paused", "gamepad Options pauses")
            page.evaluate("qaPad.buttons[9]={pressed:false,touched:false,value:0}")
            page.wait_for_timeout(100)
            page.evaluate("qaPad.buttons[0]={pressed:true,touched:true,value:1}")
            page.wait_for_function("__sun.state.mode === 'playing'")
            check(
                state(page)["mode"] == "playing", "gamepad Cross selects focused menu"
            )
            page.evaluate("navigator.getGamepads=()=>[]")
            page.locator("#pauseBtn").click()
            check(
                "W A S D" in page.locator("#controls").inner_text(),
                "mouse menu input restores keyboard prompts",
            )
            check(not errors, "no uncaught desktop browser errors", "; ".join(errors))
            gpu_errors = [
                e
                for e in console_errors
                if any(
                    x in e.lower()
                    for x in [
                        "device lost",
                        "validation",
                        "shader",
                        "pipeline",
                        "compilation",
                        "uncaptured",
                    ]
                )
            ]
            check(
                not gpu_errors,
                "desktop GPU has no device or shader errors",
                "; ".join(gpu_errors),
            )
            context.close()

            # Touch uses the same screen and a contextual action with invisible sticks.
            mobile = browser.new_context(
                viewport={"width": 844, "height": 390},
                device_scale_factor=1,
                is_mobile=True,
                has_touch=True,
                ignore_https_errors=True,
            )
            page = mobile.new_page()
            mobile_errors = []
            page.on("pageerror", lambda e: mobile_errors.append(str(e)))
            mobile_gpu_errors = []
            page.on(
                "console",
                lambda m: (
                    mobile_gpu_errors.append(m.text)
                    if m.type == "error"
                    and any(
                        x in m.text.lower()
                        for x in [
                            "device lost",
                            "validation",
                            "shader",
                            "pipeline",
                            "compilation",
                            "uncaptured",
                        ]
                    )
                    else None
                ),
            )
            boot(page, url)
            page.locator('[data-act="start"]').tap()
            check(
                "touch" in page.locator("body").get_attribute("class"),
                "touch device mode",
            )
            page.evaluate("__sun.warp(__sun.target()); __sun.input(null)")
            page.wait_for_timeout(150)
            check(
                page.locator("#touchAction").is_visible(), "nearby touch action appears"
            )
            # Dispatch genuine browser touch points through CDP for held drag movement.
            session = mobile.new_cdp_session(page)
            before = state(page)["heroes"][0]["pos"]
            session.send(
                "Input.dispatchTouchEvent",
                {"type": "touchStart", "touchPoints": [{"x": 150, "y": 280, "id": 1}]},
            )
            session.send(
                "Input.dispatchTouchEvent",
                {"type": "touchMove", "touchPoints": [{"x": 150, "y": 200, "id": 1}]},
            )
            page.wait_for_function(
                "before => __sun.state.heroes[0].pos.reduce((sum,v,i)=>sum+(v-before[i])**2,0) > 0.1",
                arg=before,
                timeout=30000,
            )
            session.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )
            after = state(page)["heroes"][0]["pos"]
            check(
                sum((a - b) ** 2 for a, b in zip(after, before)) > 0.1,
                "invisible touch stick moves hero",
                str([before, after]),
            )
            page.locator("#touchMenu").tap()
            check(state(page)["mode"] == "paused", "touch menu pauses")
            check(
                not mobile_errors,
                "no uncaught touch browser errors",
                "; ".join(mobile_errors),
            )
            check(
                not mobile_gpu_errors,
                "touch GPU has no device or shader errors",
                "; ".join(mobile_gpu_errors),
            )
            mobile.close()
            final_path = ROOT.parent / (ROOT.name + ".html")
            check(final_path.is_file(), "single-file release exists")
            file_context = browser.new_context(ignore_https_errors=True)
            file_page = file_context.new_page()
            file_gpu_errors = []
            file_page.on(
                "console",
                lambda m: (
                    file_gpu_errors.append(m.text)
                    if m.type == "error"
                    and any(
                        x in m.text.lower()
                        for x in [
                            "device lost",
                            "validation",
                            "shader",
                            "pipeline",
                            "compilation",
                            "uncaptured",
                        ]
                    )
                    else None
                ),
            )
            boot(file_page, final_path.as_uri() + "?test=1")
            check(
                file_page.evaluate("isSecureContext"),
                "file release is a secure context",
            )
            check(
                not file_gpu_errors,
                "file release GPU has no device or shader errors",
                "; ".join(file_gpu_errors),
            )
            file_context.close()
        finally:
            browser.close()


if __name__ == "__main__":
    try:
        run(
            headed="--headed" in sys.argv,
            visual_only="--visual" in sys.argv,
            webgl="--webgl" in sys.argv,
            probe="--probe" in sys.argv,
        )
    except Exception as error:  # noqa: BLE001 - report any harness failure in the one-line result contract.
        check(False, "test execution", str(error))
    print(f"{checks} checks, {len(failures)} failures", flush=True)
    raise SystemExit(bool(failures))
