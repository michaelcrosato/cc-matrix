import functools
import http.server
import json
import pathlib
import subprocess
import sys
import threading

from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
PROJECT = json.loads((HERE / "project.json").read_text())
FAILURES = []
COUNT = 0


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def check(label, condition):
    global COUNT
    COUNT += 1
    if not condition:
        FAILURES.append(label)


def run():
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(HERE.parent))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}/"
    url = base + PROJECT["stem"] + ".html"
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                    "--no-sandbox",
                ],
            )
            page = browser.new_page(
                viewport={"width": 1600, "height": 1000}, device_scale_factor=1
            )
            errors = []
            page.on("pageerror", lambda e, errors=errors: errors.append(str(e)))
            page.goto(url, wait_until="load")
            try:
                page.wait_for_function("!!window.__game", timeout=90000)
            except Exception:  # noqa: BLE001 - test runner records any failure
                check(
                    "Game initializes: "
                    + page.locator("#bootError").inner_text()
                    + " / "
                    + str(errors),
                    False,
                )
                browser.close()
                return
            page.evaluate("__game.hold(true)")
            state = page.evaluate("__game.getState()")
            check("Native WebGPU renderer starts", state["renderer"] == "WebGPU")
            check(
                "Rapier 0.19.3 active",
                state["physics"] == "Rapier 0.19.3" and state["bodyCount"] > 0,
            )
            check("Music defaults to ten percent", state["settings"]["music"] == 0.1)
            check("Title shown", page.locator("#titleScreen").is_visible())
            page.get_by_role("button", name="Launch sortie").click()
            check(
                "Launch enters game",
                page.evaluate("__game.getState().mode") == "playing",
            )
            page.evaluate(
                "__game.input({mx:1,mz:0,ax:0,az:-1,fire:false,boost:false});__game.step(1)"
            )
            moved = page.evaluate("__game.getState().players[0].x")
            check("Physics flight movement", moved > 5)
            page.evaluate("__game.step(.1,{fire:false})")
            check(
                "Incomplete controls remain finite",
                isinstance(
                    page.evaluate("__game.getState().players[0].x"), (float, int)
                ),
            )
            page.evaluate(
                "__game.input({mx:1,mz:0,ax:0,az:-1,fire:false,boost:true});__game.step(1)"
            )
            boosted = page.evaluate("__game.getState().players[0].x")
            check("Boost increases movement", boosted - moved > 48)
            page.evaluate("__game.input(null)")
            page.keyboard.press("Escape")
            check(
                "Pause stops solo flight",
                page.evaluate("__game.getState().mode") == "paused",
            )
            page.get_by_role("button", name="Developer flight deck").click()
            slider = page.locator('input[data-key="damage"]')
            slider.fill("30")
            check(
                "Live balance slider works",
                page.evaluate("__game.getState().tuning.damage") == 30,
            )
            page.get_by_role("button", name="Reset balance to defaults").click()
            check(
                "Reset balance restores defaults",
                page.evaluate("__game.getState().tuning.damage") == 18,
            )
            page.keyboard.press("Escape")
            page.get_by_role("button", name="Settings", exact=True).click()
            page.locator("#glyphSelect").select_option("xbox")
            check(
                "Controller glyph setting persists",
                page.evaluate("__game.getState().settings.glyphs") == "xbox",
            )
            page.locator("#glyphSelect").select_option("ps")
            page.keyboard.press("Escape")
            page.get_by_role("button", name="Resume sortie").click()
            page.evaluate('__game.dev("god")')
            page.keyboard.press("Escape")
            page.get_by_role("button", name="Resume sortie").click()
            # A deterministic pilot uses only flight, blasters, cable, and rescue mechanics.
            result = page.evaluate("""() => {
                __game.teleport(-95,15);__game.action();__game.step(.05,{mx:0,mz:0,ax:0,az:-1,fire:false,boost:false,actionSeq:1,rollSeq:0});
                const carried=__game.getState().players[0].carrying!==null;
                __game.teleport(0,85);__game.step(.1,{mx:0,mz:0,ax:0,az:-1,fire:false,boost:false,actionSeq:1,rollSeq:0});
                const rescued=__game.getState().rescued;
                let steps=0;
                while(__game.getState().phase===0 && steps++<100){
                    const s=__game.getState(), e=s.enemies.find(e=>!e.dead);
                    __game.teleport(e.x,e.z+38);
                    __game.step(.5,{mx:0,mz:0,ax:0,az:-1,fire:true,boost:false,actionSeq:1,rollSeq:0});
                }
                return {carried,rescued,steps,state:__game.getState()};
            }""")
            check("Survivor collection", result["carried"])
            check("Survivor delivered and scored", result["rescued"] == 1)
            check("Chapter one completed with blasters", result["state"]["phase"] == 1)
            result = page.evaluate("""() => {
                let action=1;
                for(let i=0;i<2;i++){
                    const e=__game.getState().enemies.find(e=>e.type==='walker'&&!e.dead);
                    if(!e)break;
                    __game.teleport(e.x+30,e.z);
                    action++;
                    __game.step(.05,{mx:0,mz:0,ax:0,az:-1,fire:false,boost:false,actionSeq:action,rollSeq:0});
                    __game.step(8.5,{mx:0,mz:0,ax:0,az:-1,fire:true,boost:false,actionSeq:action,rollSeq:0});
                }
                return __game.getState();
            }""")
            check(
                "Tow cable destroys both armored walkers",
                len(
                    [
                        e
                        for e in result["enemies"]
                        if e["type"] == "walker" and e["dead"]
                    ]
                )
                == 2,
            )
            check(
                "Evacuation chapter begins",
                result["phase"] == 2 and len(result["transports"]) == 2,
            )
            result = page.evaluate("""() => {
                let i=0;
                while(!__game.getState().enemies.find(e=>e.type==='ace')?.dead && i++<180){
                    const s=__game.getState(),e=s.enemies.find(e=>e.type==='ace');
                    if(!e)break;
                    __game.teleport(e.x,e.z+30);
                    __game.step(.25,{mx:0,mz:0,ax:0,az:-1,fire:true,boost:false,actionSeq:3,rollSeq:0});
                }
                let j=0;
                while(__game.getState().mode==='playing' && j++<90)__game.step(1,{mx:0,mz:0,ax:0,az:-1,fire:true,boost:false,actionSeq:3,rollSeq:0});
                return __game.getState();
            }""")
            check(
                "Interceptor defeated by blasters",
                any(e["type"] == "ace" and e["dead"] for e in result["enemies"]),
            )
            check("Both transports escape", result["evacuated"] == 2)
            check("Entire campaign reaches victory", result["mode"] == "won")
            check("Score includes objectives", result["score"] >= 8500)
            audio = page.evaluate("__game.audioTest()")
            check(
                "Procedural audio is finite and audible",
                bool(audio.get("finite")) and audio.get("rms", 0) > 0.001,
            )
            page.get_by_role("button", name="Return to title").click()
            page.evaluate("__game.idle(11)")
            page.wait_for_function('__game.getState().mode==="attract"')
            check("Attract begins after ten seconds", True)
            page.keyboard.press("KeyW")
            check(
                "Any input exits attract to title",
                page.evaluate("__game.getState().mode") == "title",
            )
            page.get_by_role("button", name="About & credits").click()
            about = page.locator("#panel").inner_text()
            check(
                "Credits include all feedback and source fields",
                all(
                    s in about
                    for s in [
                        "Source Information",
                        "Testing Feedback",
                        "Engine Feedback",
                        "Prompt Feedback",
                        "added on import",
                    ]
                ),
            )
            check("No runtime JavaScript errors", not errors)
            page.close()
            # Standard mapped virtual DualSense.
            pad_page = browser.new_page(viewport={"width": 1280, "height": 800})
            pad_page.add_init_script(
                """window.pad={connected:true,index:0,id:'Virtual DualSense',mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[window.pad];"""
            )
            pad_page.goto(url)
            pad_page.wait_for_function("!!window.__game", timeout=90000)
            pad_page.evaluate("window.pad.buttons[0]={pressed:true,value:1}")
            pad_page.wait_for_function('__game.getState().mode==="playing"')
            check("Controller starts sortie from title", True)
            pad_page.evaluate(
                "window.pad.buttons[0]={pressed:false,value:0};window.pad.axes[0]=1"
            )
            pad_page.wait_for_timeout(650)
            check(
                "Controller axis flies ship",
                pad_page.evaluate("__game.getState().players[0].x") > -10,
            )
            check(
                "Prompts switch to PlayStation",
                "✕" in pad_page.locator("#controlStrip").inner_text(),
            )
            pad_page.close()
            # Real two-page standalone co-op, with the normal authoritative host loop.
            host = browser.new_page(viewport={"width": 1280, "height": 800})
            wing = browser.new_page(viewport={"width": 1280, "height": 800})
            host.goto(url)
            wing.goto(url)
            host.wait_for_function("!!window.__game", timeout=90000)
            wing.wait_for_function("!!window.__game", timeout=90000)
            host.evaluate('__game.getLink().host("TEST48")')
            wing.evaluate('__game.getLink().join("TEST48")')
            host.wait_for_function(
                "__game.getState().players.length===2", timeout=15000
            )
            wing.wait_for_function(
                '__game.getState().mode==="guest" && __game.getState().players.length===2',
                timeout=15000,
            )
            check("Standalone co-op links two pilots", True)
            wing.evaluate('__game.dev("phase")')
            check(
                "Guest cannot mutate host-owned chapter",
                wing.evaluate("__game.getState().phase") == 0,
            )
            wing.evaluate('__game.dev("dev")')
            check(
                "Guest developer tools explain host authority",
                "host owns" in wing.locator("#panel").inner_text()
                and wing.locator('input[data-object="tuning"]').count() == 0,
            )
            wing.evaluate('__game.dev("resume")')
            wing.evaluate("__game.input({mx:1,mz:0,ax:0,az:-1,fire:true,boost:false})")
            wing.wait_for_timeout(1000)
            hs = host.evaluate("__game.getState()")
            ws = wing.evaluate("__game.getState()")
            hp = next(p for p in hs["players"] if p["id"] == 1)
            wp = next(p for p in ws["players"] if p["id"] == 1)
            check("Guest input moves authoritative player", hp["x"] > 35)
            check(
                "Guest receives authoritative position",
                isinstance(wp["x"], (float, int)) and abs(hp["x"] - wp["x"]) < 16,
            )
            host.evaluate("__game.getLink().finish(true,1234,{test:true})")
            wing.wait_for_function('__game.getState().mode==="won"', timeout=5000)
            check("Guest displays victory without physics-body errors", True)
            host.evaluate('__game.dev("launch")')
            wing.wait_for_function('__game.getState().mode==="guest"', timeout=5000)
            check("Host replay restarts wingmate round", True)
            wing.evaluate('__game.dev("title")')
            host.wait_for_function("__game.getState().players.length===1", timeout=5000)
            check("Wingmate departure removes their ship", True)
            wing.evaluate('__game.getLink().join("TEST48")')
            wing.wait_for_function('__game.getState().mode==="guest"', timeout=10000)
            check("Wingmate can rejoin the same flight", True)
            host.evaluate('__game.dev("title")')
            wing.wait_for_function('__game.getState().mode==="title"', timeout=5000)
            wing.evaluate('__game.dev("close");__game.dev("launch")')
            check(
                "Disconnected guest can launch solo",
                wing.evaluate(
                    '__game.getState().mode==="playing" && __game.getState().network.mode==="solo"'
                ),
            )
            host.close()
            wing.close()
            # Touch emulation drives both invisible thumb zones simultaneously.
            touch_context = browser.new_context(
                viewport={"width": 844, "height": 390},
                has_touch=True,
                is_mobile=True,
                device_scale_factor=1,
            )
            touch = touch_context.new_page()
            touch.goto(url)
            touch.wait_for_function("!!window.__game", timeout=90000)
            touch.get_by_role("button", name="Launch sortie").tap()
            check(
                "Touch launches on a landscape phone",
                touch.evaluate("__game.getState().mode") == "playing",
            )
            session = touch_context.new_cdp_session(touch)
            session.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchStart",
                    "touchPoints": [
                        {"id": 1, "x": 150, "y": 270},
                        {"id": 2, "x": 650, "y": 270},
                    ],
                },
            )
            session.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchMove",
                    "touchPoints": [
                        {"id": 1, "x": 210, "y": 230},
                        {"id": 2, "x": 650, "y": 200},
                    ],
                },
            )
            touch.wait_for_timeout(750)
            ts = touch.evaluate("__game.getState()")
            check(
                "Multitouch flies and aims together",
                ts["inputKind"] == "touch" and ts["players"][0]["x"] > 0,
            )
            session.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )
            touch.locator("#touchMenu").tap()
            check(
                "Touch pause menu works",
                touch.evaluate("__game.getState().modalPage") == "pause",
            )
            touch.screenshot(path=str(HERE / "touch-menu.png"))
            touch_context.close()
            # The deliverable also starts directly from a local file without dependencies.
            local = browser.new_page()
            local.goto((HERE.parent / (PROJECT["stem"] + ".html")).as_uri())
            local.wait_for_function("!!window.__game", timeout=90000)
            check(
                "Single HTML starts over file protocol",
                local.evaluate("__game.getState().renderer") == "WebGPU",
            )
            local.close()
            # Visual inspection only uses WebGL fallback: WebGPU headless captures can be blank.
            visual = browser.new_page(viewport={"width": 1600, "height": 1000})
            visual.goto(url + "?webgl=1")
            visual.wait_for_function("!!window.__game", timeout=90000)
            visual.evaluate("__game.hold(true)")
            visual.screenshot(path=str(HERE / "title-screen.png"))
            visual.get_by_role("button", name="Launch sortie").click()
            visual.evaluate(
                '__game.hold(true);__game.dev("phase");__game.dev("resume")'
            )
            visual.wait_for_timeout(1000)
            visual.screenshot(path=str(HERE / "gameplay-screen.png"))
            check(
                "Fallback renderer works",
                visual.evaluate("__game.getState().renderer") == "WebGL2",
            )
            visual.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    try:
        run()
    except Exception as e:  # noqa: BLE001 - test runner records any failure
        check(f"Unexpected test error: {type(e).__name__}: {e}", False)
    try:
        result = subprocess.run(
            ["node", "network-check.mjs"],
            cwd=HERE,
            text=True,
            capture_output=True,
            timeout=30,
            check=False,
        )
        import re

        summary = re.search(r"(\d+)/(\d+)", result.stdout)
        if summary:
            COUNT += int(summary.group(2))
        if result.returncode:
            FAILURES.extend(
                line for line in result.stdout.splitlines() if line.startswith("FAIL")
            )
            if not result.stdout:
                check("Network checks: " + result.stderr, False)
        import importlib.util

        spec = importlib.util.spec_from_file_location(
            "hub_integration", HERE / "integration-test.py"
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        n, failures = module.run_checks()
        COUNT += n
        FAILURES.extend(failures)
    except Exception as exc:  # noqa: BLE001 - test runner records any failure
        check("Integration test error: " + str(exc), False)
    for failure in FAILURES:
        print("FAIL: " + failure)
    print(f"{COUNT - len(FAILURES)}/{COUNT} checks passed; {len(FAILURES)} failures")
    sys.exit(bool(FAILURES))
