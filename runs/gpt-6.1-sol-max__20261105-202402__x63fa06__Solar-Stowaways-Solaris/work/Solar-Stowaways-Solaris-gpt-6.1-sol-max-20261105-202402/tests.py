"""One command, isolated server and browser, assertions through the real game systems."""

import functools
import http.server
import json
import os
import threading
import traceback
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
GAME = ROOT / (HERE.name + ".html")
RESULTS = []
ERRORS = []
ARTIFACTS = HERE / "test-artifacts"
ARTIFACTS.mkdir(exist_ok=True)
SCRATCH = HERE / ".browser-tmp"
SCRATCH.mkdir(exist_ok=True)
os.environ["TMPDIR"] = str(SCRATCH)


def check(name, condition, detail=""):
    RESULTS.append(
        {
            "name": name,
            "pass": bool(condition),
            "detail": str(detail) if not condition else "",
        }
    )
    if not condition:
        print(f"FAIL {name}: {detail}", flush=True)


def state(page):
    return page.evaluate("window.__solar.snapshot()")


def advance(page, seconds, controls=None):
    return page.evaluate("([s,c])=>window.__solar.advance(s,c)", [seconds, controls])


def act(page, name):
    page.evaluate("(a)=>window.__solar.action(a)", name)


def open_game(browser, url, context=None):
    context = context or browser.new_context(
        viewport={"width": 1280, "height": 720}, device_scale_factor=1
    )
    page = context.new_page()
    page.on("pageerror", lambda e: ERRORS.append(str(e)))
    page.goto(url, wait_until="load", timeout=60000)
    page.wait_for_function(
        "window.__solar?.snapshot().ready || window.__solarError", timeout=90000
    )
    error = page.evaluate("window.__solarError || null")
    if error:
        raise AssertionError(error)
    return context, page


def core_tests(browser, url):
    context, page = open_game(browser, url)
    s = state(page)
    check(
        "bundled file boots outside a server",
        s["ready"] and s["screen"] == "title",
        s["screen"],
    )
    check(
        "required physics and native animation",
        s["physicsVersion"] == "0.19.3" and s["animationMixers"] > 0,
        s,
    )
    check("music defaults to ten percent", s["settings"]["music"] == 0.1, s["settings"])
    pixels = page.evaluate("window.__solar.renderPixels()")
    check(
        "renderer produces a populated scene",
        pixels["bright"] > 200 and pixels["max"] > 150,
        pixels,
    )
    page.locator('[data-action="new"]').click()
    check("new flight opens the mission briefing", state(page)["screen"] == "briefing")
    page.locator('[data-action="launch"]').click()
    page.keyboard.down("d")
    s = advance(page, 0.5)
    page.keyboard.up("d")
    check("native WASD steering", s["player"]["x"] > 8, s["player"])
    page.mouse.move(780, 310)
    page.keyboard.down("Space")
    overheated = False
    for _ in range(70):
        s = advance(page, 0.1)
        overheated |= s["overheat"]
    page.keyboard.up("Space")
    check(
        "fire generates physics projectiles and heat",
        s["metrics"]["shots"] > 15 and s["metrics"]["collisionQueries"] > 100,
        s["metrics"],
    )
    check("sustained fire overheats", overheated, s["heat"])
    s = advance(page, 4)
    check(
        "overheat recovers without input",
        not s["overheat"] and s["heat"] < 0.05,
        s["heat"],
    )
    page.keyboard.press("Escape")
    before = state(page)["elapsed"]
    advance(page, 2)
    check(
        "pause freezes simulation",
        state(page)["elapsed"] == before and state(page)["screen"] == "paused",
    )
    page.locator('[data-action="dev"]').click()
    check("dev mode is reachable from pause", state(page)["screen"] == "dev")
    page.eval_on_selector(
        "#dev-steering",
        "e=>{e.value=29;e.dispatchEvent(new Event('input',{bubbles:true}))}",
    )
    check("balance slider applies live", state(page)["balance"]["steering"] == 29)
    page.locator('[data-action="dev-reset"]').click()
    check("balance reset restores defaults", state(page)["balance"]["steering"] == 20)
    page.evaluate("window.__solar.setPlayer({shield:0,hull:30,fuel:5})")
    page.locator('[data-action="dev-refill"]').click()
    s = state(page)
    check(
        "dev refill repairs all resources",
        all(s["player"][k] == 100 for k in ["shield", "hull", "fuel"])
        and s["pulses"] == 2,
    )
    page.locator('[data-action="back"]').click()
    page.locator('[data-action="resume"]').click()
    page.keyboard.press("q")
    s = state(page)
    check(
        "pulse spends a charge and records its effect",
        s["pulses"] == 1 and s["metrics"]["pulses"] == 1,
        s["metrics"],
    )
    page.keyboard.down("Shift")
    fuel = s["player"]["fuel"]
    s = advance(page, 1)
    page.keyboard.up("Shift")
    check(
        "boost consumes extra fuel",
        s["metrics"]["boostSeconds"] > 0.9 and fuel - s["player"]["fuel"] > 0.5,
    )
    page.evaluate(
        "window.__solar.setPlayer({hull:1,shield:0});window.__solar.damage(1000)"
    )
    check("hull loss opens a retry screen", state(page)["screen"] == "defeat")
    page.locator('[data-action="retry"]').click()
    check(
        "retry restores a playable checkpoint",
        state(page)["screen"] == "playing" and state(page)["player"]["hull"] == 100,
    )
    # A complete run uses the actual autonomous input driver, actual weapons,
    # actual swept collisions and actual objectives. No mission completion aid.
    act(page, "title")
    act(page, "new")
    page.evaluate("window.__solar.setSeed(1986)")
    act(page, "launch")
    page.evaluate("window.__solar.setAutopilot(true)")
    run = []
    for sector in range(5):
        for _ in range(180):
            s = advance(page, 1)
            if s["screen"] != "playing":
                break
        run.append(
            {
                k: s[k]
                for k in [
                    "sector",
                    "elapsed",
                    "screen",
                    "kills",
                    "rescued",
                    "gates",
                    "score",
                    "player",
                    "metrics",
                ]
            }
        )
        check(
            f"campaign sortie {sector + 1} completes through real play",
            s["screen"] == ("victory" if sector == 4 else "chart"),
            run[-1],
        )
        if s["screen"] not in ["chart", "victory"]:
            break
        if sector == 0:
            check(
                "patrol destroys all eight interceptors",
                s["kills"] >= 8 and s["metrics"]["hits"] > 15,
                s["metrics"],
            )
            check(
                "completed sortie saves a checkpoint",
                page.evaluate("!!localStorage.getItem('stowaways.checkpoint')"),
            )
            score = s["score"]
            act(page, "title")
            act(page, "continue")
            s = state(page)
            check(
                "saved flight restores score and route",
                s["screen"] == "chart" and s["cleared"] == [0] and s["score"] == score,
            )
            check(
                "checkpoint preserves recorded combat metrics",
                s["metrics"]["shots"] > 0 and s["metrics"]["hits"] > 15,
                s["metrics"],
            )
            page.evaluate("window.__solar.setAutopilot(true)")
        if sector == 1:
            check(
                "tractor recovers all three pilots",
                s["rescued"] == 3 and s["metrics"]["tractors"] == 3,
                s["metrics"],
            )
        if sector == 2:
            check(
                "station repairs and reloads resources",
                s["player"]["hull"] == 100
                and s["player"]["fuel"] > 99
                and s["pulses"] == 2,
                s["player"],
            )
        if sector == 3:
            check("ship passes all five navigation gates", s["gates"] == 5, s["gates"])
        if sector < 4:
            page.locator('[data-action="jump"]').click()
    (ARTIFACTS / "playthrough.json").write_text(json.dumps(run, indent=2))
    check(
        "campaign reaches a complete scored debrief",
        s["screen"] == "victory"
        and s["rescued"] == 3
        and s["gates"] == 5
        and len(s["cleared"]) == 5
        and s["score"] > 10000,
        s["screen"],
    )
    check(
        "debrief clears finished save",
        not page.evaluate("!!localStorage.getItem('stowaways.checkpoint')")
        if s["screen"] == "victory"
        else False,
    )
    page.evaluate("window.__solar.audio.laser();window.__solar.audio.voice(7)")
    page.wait_for_timeout(100)
    s = state(page)
    check(
        "procedural audio generates nonzero samples",
        s["audio"]["state"] == "running"
        and s["audio"]["level"] > 0.00001
        and s["audio"]["events"]["voice"] > 0,
        s["audio"],
    )
    act(page, "about")
    check(
        "credits contain required information and feedback",
        all(
            t in page.locator(".credits").inner_text()
            for t in [
                "SOURCE INFORMATION",
                "TESTING FEEDBACK",
                "ENGINE FEEDBACK",
                "PROMPT FEEDBACK",
                "added on import",
            ]
        ),
    )
    context.close()


PAD_SCRIPT = """window.__pad={id:'Emulated standard pad',connected:true,mapping:'standard',index:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:0};navigator.getGamepads=()=>[window.__pad];window.__padButton=(n,v)=>{window.__pad.buttons[n]={pressed:v,touched:v,value:v?1:0};};"""


def pad_tests(browser, url):
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    context.add_init_script(PAD_SCRIPT)
    _, page = open_game(browser, url, context)

    def press(n):
        before = state(page)["metrics"]["renderFrames"]
        page.evaluate("n=>window.__padButton(n,true)", n)
        page.wait_for_function(
            "(n)=>window.__solar.snapshot().metrics.renderFrames!==n",
            arg=before,
            timeout=15000,
        )
        before = state(page)["metrics"]["renderFrames"]
        page.evaluate("n=>window.__padButton(n,false)", n)
        page.wait_for_function(
            "(n)=>window.__solar.snapshot().metrics.renderFrames!==n",
            arg=before,
            timeout=15000,
        )

    press(0)
    check(
        "controller Cross activates focused title action",
        state(page)["screen"] == "briefing",
    )
    check(
        "controller input initializes procedural audio",
        state(page)["audio"]["state"] != "locked",
        state(page)["audio"]["state"],
    )
    press(0)
    check(
        "controller launches flight without mouse", state(page)["screen"] == "playing"
    )
    page.evaluate("window.__pad.axes=[.8,-.5,.4,-.2];window.__padButton(7,true)")
    page.wait_for_timeout(300)
    s = advance(page, 0.6)
    page.evaluate("window.__pad.axes=[0,0,0,0];window.__padButton(7,false)")
    check(
        "standard gamepad steering and triggers",
        s["input"] == "pad" and s["player"]["x"] > 5 and s["metrics"]["shots"] > 0,
        s["player"],
    )
    press(9)
    check("Options pauses controller flight", state(page)["screen"] == "paused")
    act(page, "settings")
    page.evaluate("window.__padButton(13,true)")
    page.wait_for_function('!!document.querySelector("input.focused")')
    page.evaluate("window.__padButton(13,false)")
    page.wait_for_timeout(350)
    focus = page.locator("input.focused")
    check(
        "controller slider focus is visibly outlined",
        focus.evaluate(
            '(e)=>getComputedStyle(e).outlineStyle==="solid"&&parseFloat(getComputedStyle(e).outlineWidth)>=2'
        ),
    )
    setting = focus.get_attribute("data-setting")
    before = state(page)["settings"][setting]
    press(15)
    check(
        "D-pad adjusts the focused live setting",
        state(page)["settings"][setting] > before,
    )
    page.select_option("#glyphs", "xbox")
    check("Xbox glyph preference applies", state(page)["settings"]["glyphs"] == "xbox")
    press(1)
    check("controller back returns from settings", state(page)["screen"] == "paused")
    context.close()


def touch_tests(browser, url):
    context = browser.new_context(
        viewport={"width": 844, "height": 390},
        has_touch=True,
        is_mobile=True,
        device_scale_factor=1,
    )
    _, page = open_game(browser, url, context)
    page.locator('[data-action="new"]').tap()
    page.locator('[data-action="launch"]').tap()
    client = context.new_cdp_session(page)
    points = [{"x": 130, "y": 240, "id": 0}, {"x": 650, "y": 250, "id": 1}]
    client.send(
        "Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": points}
    )
    points[0].update(x=180, y=210)
    points[1].update(x=675, y=235)
    client.send(
        "Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": points}
    )
    s = advance(page, 0.5)
    client.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    check(
        "multitouch steers and fires through invisible sticks",
        s["input"] == "touch" and s["player"]["x"] > 2 and s["metrics"]["shots"] > 0,
        s["metrics"],
    )
    check(
        "touch hides dense control hints",
        not page.locator("#controlHints").is_visible(),
    )
    page.locator("#pauseButton").tap()
    check("touch menu remains reachable", state(page)["screen"] == "paused")
    context.close()


def attract_test(browser, url):
    context, page = open_game(browser, url)
    page.wait_for_function("window.__solar.snapshot().attract", timeout=14000)
    check(
        "ten-second title timeout starts attract mode",
        state(page)["attract"] and state(page)["screen"] == "playing",
    )
    result = page.evaluate(
        """()=>{const seen=new Set();for(let i=0;i<600;i++){window.__solar.advance(1);seen.add(window.__solar.snapshot().sector);if(seen.size===5&&window.__solar.snapshot().sector===0)break;}return{seen:[...seen],s:window.__solar.snapshot()};}"""
    )
    check(
        "attract autopilot shows and loops the full game",
        len(result["seen"]) == 5 and result["s"]["sector"] == 0,
        {"seen": result["seen"], "state": result["s"]["screen"]},
    )
    page.keyboard.press("x")
    check(
        "any input exits attract mode cleanly",
        state(page)["screen"] == "title"
        and not state(page)["attract"]
        and state(page)["score"] == 0,
    )
    page.evaluate("window.__solar.startAttract()")
    page.locator("#pauseButton").dispatch_event(
        "pointerdown", {"pointerType": "mouse", "button": 0}
    )
    page.evaluate('document.getElementById("pauseButton").click()')
    check(
        "attract exit consumes the initiating pointer action",
        state(page)["screen"] == "title" and not state(page)["attract"],
    )
    context.close()


def direct_link_test(browser, url):
    c1, p1 = open_game(browser, url)
    c2, p2 = open_game(browser, url)
    act(p1, "wing")
    act(p2, "wing")
    p1.locator('[data-action="net-host"]').click()
    p1.wait_for_function(
        'document.getElementById("flightCode").value.startsWith("SS1.")', timeout=15000
    )
    offer = p1.locator("#flightCode").input_value()
    p2.locator('[data-action="net-join"]').click()
    p2.locator("#flightCode").fill(offer)
    p2.locator('[data-action="net-accept"]').click()
    p2.wait_for_function('window.__solar.link.code.startsWith("SS1.")', timeout=15000)
    answer = p2.locator("#flightCode").input_value()
    p1.locator("#flightCode").fill(answer)
    p1.locator('[data-action="net-accept"]').click()
    p1.wait_for_function("window.__solar.snapshot().connected", timeout=20000)
    p2.wait_for_function("window.__solar.snapshot().connected", timeout=20000)
    check(
        "standalone peer codes establish WebRTC",
        state(p1)["connected"] and state(p2)["connected"],
    )
    p1.locator('[data-action="net-launch"]').click()
    p2.wait_for_function('window.__solar.snapshot().screen==="playing"', timeout=5000)
    check(
        "standalone launch synchronizes both flights",
        state(p1)["screen"] == "playing" and state(p2)["screen"] == "playing",
    )
    p1.wait_for_function("window.__solar.snapshot().wingCount===1", timeout=5000)
    p2.wait_for_function("window.__solar.snapshot().wingCount===1", timeout=5000)
    check(
        "both standalone ships receive wing snapshots",
        state(p1)["wingCount"] == 1 and state(p2)["wingCount"] == 1,
    )
    p1.evaluate("window.__solar.link.close()")
    c1.close()
    c2.close()


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def hub_tests(browser, port):
    for players, scenario, impair in [
        (2, "standard", False),
        (4, "standard", True),
        (4, "host-leave", True),
    ]:
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        params = {
            "game": "../" + GAME.name + "?renderer=webgl",
            "players": players,
            "scenario": scenario,
            "auto": 1,
            "limit": 45,
        }
        if impair:
            params.update(latency=150, jitter=50, loss=5)
        page.goto(
            f"http://127.0.0.1:{port}/{HERE.name}/harness.html?" + urlencode(params),
            wait_until="load",
            timeout=60000,
        )
        page.wait_for_function(
            'document.body.dataset.complete==="true"', timeout=100000
        )
        result = page.evaluate("window.__hubCheck")
        frames = [f for f in page.frames if f != page.main_frame]
        identity = [
            f.evaluate(
                "({url:location.href,title:document.title,name:window.GAME_CREDITS?.aiHub?.name})"
            )
            for f in frames
        ]
        check(
            f"harness loaded this game / {players} seats / {scenario}",
            bool(identity) and all(i["name"] == "Solar Stowaways" for i in identity),
            identity,
        )
        check(
            f"official AI Hub harness / {players} seats / {scenario}",
            result["pass"],
            [c for c in result["checks"] if not c["pass"]],
        )
        if frames:
            frame = frames[0]
            before = frame.evaluate("window.__solar.snapshot().metrics.renderFrames")
            frame.evaluate(
                """()=>{navigator.getGamepads=()=>[{connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},(_,i)=>({pressed:i===1,value:i===1?1:0}))}];document.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true}));}"""
            )
            frame.wait_for_function(
                "(n)=>window.__solar.snapshot().metrics.renderFrames!==n",
                arg=before,
                timeout=15000,
            )
            check(
                f"session end freezes controller input and sound / {players} / {scenario}",
                frame.evaluate(
                    'window.__solar.snapshot().screen==="hub-end"&&window.__solar.audio.muted'
                ),
            )
        (ARTIFACTS / f"hub-{players}-{scenario}.json").write_text(
            json.dumps(result, indent=2)
        )
        context.close()


def visual_views(browser, url):
    context = browser.new_context(
        viewport={"width": 1920, "height": 1080}, device_scale_factor=1
    )
    _, page = open_game(browser, url, context)
    page.wait_for_timeout(450)
    page.screenshot(path=str(ARTIFACTS / "title-1920.png"))
    act(page, "new")
    act(page, "launch")
    advance(page, 5)
    page.wait_for_timeout(450)
    page.screenshot(path=str(ARTIFACTS / "flight-1920.png"))
    for sector, name in [(1, "cinder"), (4, "carrier")]:
        act(page, "dev")
        page.select_option("#dev-sector", str(sector))
        act(page, "dev-jump")
        advance(page, 7)
        page.wait_for_timeout(450)
        page.screenshot(path=str(ARTIFACTS / (name + "-1920.png")))
    act(page, "chart")
    page.screenshot(path=str(ARTIFACTS / "chart-1920.png"))
    act(page, "pause-chart")
    act(page, "dev")
    page.screenshot(path=str(ARTIFACTS / "dev-1920.png"))
    check(
        "TV menus remain inside the viewport",
        page.locator(".panel").evaluate(
            "(e)=>{const r=e.getBoundingClientRect();return r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight}"
        ),
    )
    context.close()
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        has_touch=True,
        is_mobile=True,
        device_scale_factor=1,
    )
    _, page = open_game(browser, url, context)
    page.wait_for_timeout(450)
    check(
        "portrait title fits completely on the phone",
        page.locator("h1 .outline").evaluate(
            "(e)=>{const r=e.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth}"
        ),
    )
    page.screenshot(path=str(ARTIFACTS / "title-phone.png"))
    page.locator('[data-action="new"]').tap()
    page.locator('[data-action="launch"]').tap()
    advance(page, 5)
    page.wait_for_timeout(450)
    page.screenshot(path=str(ARTIFACTS / "flight-phone.png"))
    check(
        "phone has a reachable menu without horizontal overflow",
        page.locator("#pauseButton").is_visible()
        and page.evaluate("document.documentElement.scrollWidth===innerWidth"),
    )
    act(page, "dev")
    page.select_option("#dev-sector", "1")
    act(page, "dev-jump")
    advance(page, 6)
    page.wait_for_timeout(450)
    page.screenshot(path=str(ARTIFACTS / "cinder-phone.png"))
    context.close()


def main():
    interview = json.loads((ROOT / "exit-interview.json").read_text())
    check(
        "exit interview parses with required feedback counts",
        len(interview["testingFeedback"]) == 4
        and len(interview["engineFeedback"]) == 6
        and len(interview["promptFeedback"]) == 4
        and interview["sourceInformation"]["usage"] == "added on import",
    )
    html = GAME.read_text()
    client = (HERE / "hub-session.js").read_text()
    check(
        "unmodified Hub client is embedded before game code",
        client.replace("</script", "<\\/script") in html
        and html.index(client[:90]) < html.index("hub:session-players"),
    )
    check(
        "single HTML includes physics and has no asset fetch requirements",
        len(html) > 2500000
        and "<script src=" not in html
        and '<link rel="stylesheet"' not in html,
    )
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = server.server_address[1]
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-angle=swiftshader",
                    "--enable-unsafe-swiftshader",
                    "--disable-vulkan-surface",
                    "--no-sandbox",
                ],
            )
            try:
                # Check the required path by state and GPU readback; screenshots
                # of WebGPU canvases can be blank in headless Chromium.
                try:
                    context, page = open_game(browser, GAME.as_uri() + "?test=1")
                    pixels = page.evaluate("window.__solar.renderPixels()")
                    check(
                        "WebGPU primary path renders real pixels",
                        state(page)["renderer"] == "WebGPU"
                        and pixels["max"] > 150
                        and pixels["bright"] > 200,
                        pixels,
                    )
                    page.evaluate("window.__solar.loseGraphicsDevice()")
                    page.wait_for_function(
                        'window.__solar.snapshot().renderer==="WebGL2"', timeout=15000
                    )
                    recovered = page.evaluate("window.__solar.renderPixels()")
                    check(
                        "GPU device loss recovers to a populated fallback",
                        recovered["bright"] > 200,
                        recovered,
                    )
                    context.close()
                except Exception as e:  # noqa: BLE001 - collect every suite failure before final report
                    check(
                        "WebGPU primary path renders real pixels",
                        False,
                        str(e).splitlines()[0],
                    )
                url = GAME.as_uri() + "?test=1&renderer=webgl"
                for name, run in [
                    ("core", core_tests),
                    ("gamepad", pad_tests),
                    ("touch", touch_tests),
                    ("attract", attract_test),
                    ("direct WebRTC", direct_link_test),
                    ("visual layouts", visual_views),
                ]:
                    try:
                        run(browser, url)
                    except Exception as e:  # noqa: BLE001 - collect every suite failure before final report
                        check(name + " suite completes", False, str(e).splitlines()[0])
                        (
                            ARTIFACTS / (name.replace(" ", "-") + "-error.txt")
                        ).write_text(traceback.format_exc())
                try:
                    hub_tests(browser, port)
                except Exception as e:  # noqa: BLE001 - collect every suite failure before final report
                    check("Hub harness suite completes", False, str(e).splitlines()[0])
                    (ARTIFACTS / "hub-error.txt").write_text(traceback.format_exc())
                check("no uncaught game exceptions", not ERRORS, ERRORS)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
    (ARTIFACTS / "results.json").write_text(json.dumps(RESULTS, indent=2))
    failed = sum(not r["pass"] for r in RESULTS)
    print(
        f"{len(RESULTS) - failed}/{len(RESULTS)} checks passed; {failed} failures",
        flush=True,
    )
    raise SystemExit(bool(failed))


if __name__ == "__main__":
    main()
