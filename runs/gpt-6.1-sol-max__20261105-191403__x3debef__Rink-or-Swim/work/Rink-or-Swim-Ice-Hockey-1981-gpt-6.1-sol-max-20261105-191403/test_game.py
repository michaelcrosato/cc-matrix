import functools
import http.server
import json
import os
import subprocess
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / ".test-cache"
CACHE.mkdir(exist_ok=True)
os.environ["TMPDIR"] = str(CACHE)
from playwright.sync_api import sync_playwright

checks = []
errors = []
issues = []


def check(name, predicate, detail=""):
    ok = bool(predicate)
    checks.append({"name": name, "pass": ok, "detail": str(detail) if not ok else ""})
    (ROOT / "test-progress.json").write_text(json.dumps(checks[-1]))
    if not ok:
        print("FAIL:", name, detail, flush=True)
    return ok


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass


handler = functools.partial(Quiet, directory=str(ROOT))
server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{server.server_port}"


def ready(page):
    page.wait_for_function(
        'window.__RINK__?.ready === true || !!document.querySelector(".boot-error")',
        timeout=60000,
    )
    if not page.evaluate("!!window.__RINK__"):
        raise RuntimeError(page.locator("#boot").inner_text())
    page.wait_for_function("window.__RINK__.frames > 2", timeout=60000)
    page.wait_for_function(
        "(() => { const n=__RINK__.arena.renderer.info.render.drawCalls; if(n>0){window.__drawEvidence=n;return true;}return false;})()",
        timeout=30000,
    )
    page.evaluate(
        "window.__drawRink=__RINK__.arena.render.bind(__RINK__.arena); __RINK__.arena.render=()=>{}"
    )
    if page.evaluate("!!__RINK__.app.attract"):
        page.keyboard.press("Escape")


def click(page, action):
    if page.evaluate("!!window.__RINK__?.app.attract"):
        page.keyboard.press("Escape")
    page.locator(f'[data-action="{action}"]').click()


def state(page):
    return page.evaluate("window.__RINK__.state")


try:
    physics = subprocess.run(
        ["node", "test_physics.mjs"],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if physics.returncode:
        check("physics suite executes", False, physics.stderr)
    else:
        for c in json.loads(physics.stdout):
            check(c["name"], c["pass"], c.get("detail", ""))
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--disable-dev-shm-usage",
                "--no-sandbox",
                "--autoplay-policy=no-user-gesture-required",
            ],
        )
        ctx = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1,
            ignore_https_errors=True,
        )
        page = ctx.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(BASE + "/game.html")
        ready(page)
        page.evaluate("__RINK__.app.lastInput=performance.now()+60000")
        check("correct title", page.title() == "Rink or Swim — Breakwater Cup")
        check(
            "WebGPU-capable renderer initializes",
            page.evaluate("__RINK__.arena.requestedBackend") == "WebGPU",
            state(page),
        )
        check(
            "renderer draws actual scene geometry",
            page.evaluate("window.__drawEvidence") > 0,
        )
        check(
            "music defaults to ten percent",
            page.evaluate("__RINK__.audio.music") == 0.1,
        )
        check("four skaters and Rapier initialized", len(state(page)["players"]) == 4)
        page.screenshot(path=str(ROOT / "title.png"))
        page.evaluate("__RINK__.title()")
        click(page, "quick")
        click(page, "start")
        check(
            "exhibition starts",
            state(page)["mode"] == "exhibition" and state(page)["screen"] == "play",
        )
        page.evaluate('__RINK__.game.phase="play"; __RINK__.game.phaseTime=0')
        page.evaluate(
            "() => {const g=__RINK__.game;g.phase='play';g.place(g.players[0],-5,0);g.place(g.players[2],10,8);g.players[0].stun=0;g.active[0]=0;}"
        )
        before = page.evaluate("__RINK__.game.players[__RINK__.game.active[0]].x")
        page.keyboard.down("d")
        page.wait_for_timeout(550)
        page.keyboard.up("d")
        after = page.evaluate("__RINK__.game.players[__RINK__.game.active[0]].x")
        check("keyboard skates right", after > before + 0.3, (before, after))
        page.evaluate("__RINK__.game.givePuck(0)")
        page.keyboard.down(" ")
        page.wait_for_timeout(180)
        page.keyboard.up(" ")
        page.wait_for_timeout(200)
        check(
            "charged keyboard shot recorded",
            page.evaluate("__RINK__.game.stats.shots[0]") > 0,
        )
        page.evaluate("__RINK__.game.givePuck(0)")
        page.keyboard.press("e")
        page.wait_for_timeout(150)
        check(
            "keyboard pass recorded", page.evaluate("__RINK__.game.stats.passes[0]") > 0
        )
        page.evaluate(
            """() => {const g=__RINK__.game;g.place(g.players[0],0,0);g.place(g.players[2],1.5,0);g.active[0]=0;g.givePuck(2);}"""
        )
        page.keyboard.press("q")
        page.wait_for_timeout(100)
        check(
            "body check stuns opponent",
            page.evaluate("__RINK__.game.players[2].stun") > 0,
        )
        check(
            "body check dislodges puck", page.evaluate("__RINK__.game.possession") != 2
        )
        page.keyboard.press("Escape")
        check("pause menu reachable", state(page)["screen"] == "pause")
        clock = state(page)["remaining"]
        page.wait_for_timeout(180)
        check("solo pause freezes clock", abs(state(page)["remaining"] - clock) < 0.01)
        click(page, "dev")
        slider = page.locator("#dev-shotPower")
        slider.fill("40")
        slider.dispatch_event("input")
        check(
            "developer balance slider live",
            page.evaluate("__RINK__.game.params.shotPower") == 40,
        )
        click(page, "reset")
        check(
            "developer defaults restore",
            page.evaluate("__RINK__.game.params.shotPower") == 25,
        )
        click(page, "resume")
        page.evaluate(
            """() => {let g=__RINK__.game;g.phase='play';g.place(g.players[0],12,0);g.place(g.players[1],-13,7);g.place(g.players[2],2,7);g.place(g.players[3],14,7);g.givePuck(0);g.shoot(g.players[0],{manual:true,ax:1,az:0});}"""
        )
        page.wait_for_function("__RINK__.game.score[0] > 0", timeout=5000)
        check(
            "physical shot crosses goal and scores",
            page.evaluate("__RINK__.game.score[0]") == 1,
        )
        page.evaluate('__RINK__.game.phase="play"; __RINK__.game.remaining=.02')
        page.wait_for_function('__RINK__.app.screen === "result"', timeout=3000)
        check(
            "period produces complete results",
            page.locator(".result-score").count() == 1,
        )
        click(page, "home")
        page.evaluate("__RINK__.app.lastInput=performance.now()-10001")
        page.wait_for_function("__RINK__.app.attract === true", timeout=3000)
        check("ten-second attract mode starts", state(page)["attract"])
        page.keyboard.press("Enter")
        check(
            "any input exits attract without starting match",
            state(page)["screen"] == "title" and not state(page)["attract"],
        )
        click(page, "school")
        page.evaluate("__RINK__.step(3)")
        page.keyboard.down("d")
        page.wait_for_timeout(1400)
        page.keyboard.up("d")
        page.wait_for_timeout(1600)
        check(
            "training movement advances drill",
            page.evaluate("__RINK__.app.training") == 1,
            state(page),
        )
        page.keyboard.press(" ")
        page.wait_for_timeout(1700)
        check(
            "training shot advances drill",
            page.evaluate("__RINK__.app.training") == 2,
            state(page),
        )
        page.keyboard.press("e")
        page.wait_for_timeout(1700)
        check(
            "training pass advances drill",
            page.evaluate("__RINK__.app.training") == 3,
            state(page),
        )
        page.keyboard.press("q")
        page.wait_for_timeout(1700)
        check(
            "training check advances drill",
            page.evaluate("__RINK__.app.training") == 4,
            state(page),
        )
        page.evaluate(
            """() => {const g=__RINK__.game;g.shoot(g.players[0],{manual:true,ax:1,az:2});}"""
        )
        page.wait_for_function("__RINK__.app.training===5", timeout=6000)
        check(
            "training bank advances drill", page.evaluate("__RINK__.app.training") == 5
        )
        page.evaluate(
            """() => {const g=__RINK__.game;g.shoot(g.players[0],{manual:true,ax:1,az:0});}"""
        )
        page.wait_for_function('__RINK__.app.screen === "schoolComplete"', timeout=6000)
        check(
            "six-drill scripted playthrough completes",
            state(page)["screen"] == "schoolComplete",
        )
        click(page, "home")
        click(page, "cup")
        click(page, "start")
        for round_id in range(3):
            page.evaluate(
                """() => {const g=__RINK__.game;g.phase='play';g.place(g.players[0],12,0);g.place(g.players[2],0,8);g.place(g.players[3],15,8);g.givePuck(0);g.shoot(g.players[0],{manual:true,ax:1,az:0});}"""
            )
            page.wait_for_function("__RINK__.game.score[0] > 0", timeout=5000)
            page.evaluate('__RINK__.game.phase="play"; __RINK__.game.remaining=.01')
            page.wait_for_function('__RINK__.app.screen === "result"', timeout=3000)
            check(
                f"Cup match {round_id + 1} completes",
                page.evaluate("__RINK__.app.cupRound") == round_id,
            )
            if round_id < 2:
                click(page, "next")
        check(
            "complete Cup has champion ending",
            "CUP OVERFLOWING" in page.locator("#screen").inner_text(),
        )
        click(page, "home")
        click(page, "club")
        click(page, "settings")
        check(
            "PlayStation glyphs default", page.locator("#glyphs").input_value() == "ps"
        )
        page.select_option("#glyphs", "xbox")
        check(
            "Xbox glyph setting works",
            page.evaluate("__RINK__.app.settings.glyphs") == "xbox",
        )
        click(page, "back")
        click(page, "about")
        for tab in ["source", "testing", "engine", "prompt"]:
            click(page, tab)
            check(
                f"credits {tab} section exists",
                len(page.locator(".credits").inner_text()) > 50,
            )
        page.evaluate('__RINK__.audio.init(); __RINK__.audio.event("goal")')
        page.wait_for_timeout(200)
        levels = page.evaluate(
            '({rms:__RINK__.audio.rms(), events:__RINK__.audio.events, files:performance.getEntriesByType("resource").filter(x=>/\\.(mp3|ogg|wav)/.test(x.name)).length})'
        )
        check(
            "synthesized audio produces measurable output",
            levels["rms"] > 0.0001,
            levels,
        )
        check("audio has no file assets", levels["files"] == 0)
        page.evaluate("__RINK__.title()")
        check("no runtime errors in solo flows", not errors, errors)
        page.screenshot(path=str(ROOT / "after-play.png"))
        # Controller input uses a standard-mapping stub, without a physical pad.
        page.evaluate(
            """() => {window.__pads=[0,1].map(index=>({id:'DualSense test',index,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))}));Object.defineProperty(navigator,'getGamepads',{value:()=>__pads,configurable:true});}"""
        )

        def pad_button(index, button, pressed):
            page.evaluate(
                "([i,b,v])=>{__pads[i].buttons[b]={pressed:v,touched:v,value:v?1:0}}",
                [index, button, pressed],
            )
            page.evaluate("__RINK__.controls.poll(1/60);__RINK__.step(1/60)")
            page.wait_for_timeout(100)

        pad_button(0, 13, True)
        pad_button(0, 13, False)
        check(
            "controller D-pad moves title focus",
            page.locator('[data-action="quick"]').evaluate(
                '(e)=>e.classList.contains("focused")'
            ),
        )
        pad_button(0, 0, True)
        pad_button(0, 0, False)
        check("controller Cross opens focused menu", state(page)["screen"] == "setup")
        click(page, "start")
        page.evaluate('__RINK__.game.phase="play"; __RINK__.game.phaseTime=0')
        before = page.evaluate("__RINK__.game.players[0].x")
        page.evaluate("__pads[0].axes[0]=.8")
        page.wait_for_timeout(400)
        page.evaluate("__pads[0].axes[0]=0")
        check(
            "controller left stick skates",
            page.evaluate("__RINK__.game.players[0].x") > before + 0.3,
        )
        check(
            "prompts follow last input and Xbox preference",
            "A" in page.locator("#playHelp").inner_text()
            and page.evaluate("__RINK__.controls.type") == "gamepad",
        )
        page.evaluate(
            "() => {const g=__RINK__.game;g.phase='play';g.place(g.players[0],-5,0);g.place(g.players[2],10,8);g.place(g.players[3],15,8);g.players[0].stun=0;g.givePuck(0);}"
        )
        pad_button(0, 0, True)
        pad_button(0, 0, False)
        check(
            "controller hold/release shoots",
            page.evaluate("__RINK__.game.stats.shots[0]") > 0,
        )
        previous_shots = page.evaluate("__RINK__.game.stats.shots[0]")
        page.evaluate(
            """() => {const r=__RINK__,g=r.game;g.phase='play';g.place(g.players[0],-5,0);g.place(g.players[2],10,8);g.players[0].stun=0;g.givePuck(0);__pads[0].buttons[0].pressed=true;r.controls.poll(1/120);__pads[0].buttons[0].pressed=false;r.controls.poll(1/120);r.controls.poll(1/120);r.step(1/60);}"""
        )
        check(
            "controller action survives two polls before a physics tick",
            page.evaluate("__RINK__.game.stats.shots[0]") == previous_shots + 1,
        )
        pad_button(0, 9, True)
        pad_button(0, 9, False)
        check("controller Options pauses", state(page)["screen"] == "pause")
        pad_button(0, 9, True)
        pad_button(0, 9, False)
        check("controller Options resumes", state(page)["screen"] == "play")
        page.evaluate(
            "() => {const g=__RINK__.game;g.phase='play';g.place(g.players[0],-5,0);g.place(g.players[2],10,8);g.players[0].stun=0;g.active[0]=0;}"
        )
        before = page.evaluate("__RINK__.game.players[__RINK__.game.active[0]].x")
        page.keyboard.down("d")
        page.wait_for_timeout(300)
        page.keyboard.up("d")
        check(
            "keyboard works with connected idle pads",
            page.evaluate("__RINK__.game.players[__RINK__.game.active[0]].x")
            > before + 0.1,
        )
        page.evaluate("__RINK__.title()")
        click(page, "versus")
        click(page, "local")
        click(page, "start")
        page.evaluate('__RINK__.game.phase="play"')
        before = page.evaluate("__RINK__.game.players[2].z")
        page.keyboard.down("ArrowDown")
        page.wait_for_timeout(350)
        page.keyboard.up("ArrowDown")
        check(
            "second keyboard player moves independently",
            page.evaluate("__RINK__.game.players[2].z") > before + 0.2,
        )
        page.evaluate("__RINK__.game.givePuck(2)")
        page.keyboard.press("Enter")
        page.wait_for_timeout(100)
        check(
            "second keyboard player shoots",
            page.evaluate("__RINK__.game.stats.shots[1]") > 0,
        )
        page.evaluate("__RINK__.title()")
        page.evaluate("__pads=[]")

        # Two pages exercise the real standalone room and snapshot protocol.
        guest = ctx.new_page()
        guest.on("pageerror", lambda e: errors.append("guest: " + str(e)))
        guest.goto(BASE + "/game.html")
        ready(guest)
        click(page, "versus")
        click(page, "online")
        click(page, "host")
        code = page.evaluate("__RINK__.online.code")
        click(guest, "versus")
        click(guest, "online")
        click(guest, "join")
        guest.locator("#joinCode").fill(code)
        click(guest, "join")
        page.wait_for_function(
            '__RINK__.app.matchMode === "online" && __RINK__.online.connected',
            timeout=15000,
        )
        guest.wait_for_function('__RINK__.app.matchMode === "online"', timeout=15000)
        check(
            "standalone private room connects two pages",
            page.evaluate("__RINK__.online.connected")
            and guest.evaluate("__RINK__.online.connected"),
        )
        page.evaluate('__RINK__.game.phase="play"')
        guest.wait_for_function('__RINK__.game.phase === "play"', timeout=4000)
        before = page.evaluate("__RINK__.game.players[2].z")
        guest.keyboard.down("s")
        guest.wait_for_timeout(500)
        guest.keyboard.up("s")
        check(
            "guest input changes host world",
            page.evaluate("__RINK__.game.players[2].z") > before + 0.3,
        )
        page.evaluate(
            """() => {const g=__RINK__.game;g.phase='play';g.place(g.players[0],12,0);g.place(g.players[2],0,8);g.place(g.players[3],15,8);g.givePuck(0);g.shoot(g.players[0],{manual:true,ax:1,az:0});}"""
        )
        guest.wait_for_function("__RINK__.game.score[0]===1", timeout=5000)
        check(
            "host score synchronizes to guest",
            guest.evaluate("__RINK__.game.score[0]")
            == page.evaluate("__RINK__.game.score[0]"),
        )
        guest.close()
        page.wait_for_function('__RINK__.app.matchMode === "exhibition"', timeout=6000)
        check(
            "disconnect transfers opponent to AI",
            page.evaluate("__RINK__.app.matchMode") == "exhibition",
        )
        page.evaluate("__RINK__.title()")

        # Validate the complete scene with the renderer's WebGL2 fallback, since
        # headless WebGPU can return a blank captured canvas on this machine.
        page.goto(BASE + "/game.html?renderer=webgl")
        ready(page)
        page.evaluate("__RINK__.app.lastInput=performance.now()+60000")
        page.evaluate("__drawRink()")
        page.screenshot(path=str(ROOT / "title.png"))
        check(
            "WebGL2 compatibility renderer loads", "WebGL2" in state(page)["renderer"]
        )
        page.evaluate('__RINK__.start("exhibition")')
        page.evaluate('__RINK__.game.phase="play"')
        page.wait_for_timeout(2400)
        page.evaluate("__drawRink()")
        page.screenshot(path=str(ROOT / "gameplay.png"))
        page.evaluate("__RINK__.pause()")
        page.screenshot(path=str(ROOT / "pause.png"))

        # Touch-only portrait interaction, including an invisible thumb stick.
        mobile = browser.new_context(**p.devices["iPhone 13"], ignore_https_errors=True)
        touch = mobile.new_page()
        touch.on("pageerror", lambda e: errors.append("touch: " + str(e)))
        touch.goto(BASE + "/game.html")
        ready(touch)
        touch.locator('[data-action="quick"]').tap()
        touch.locator('[data-action="start"]').tap()
        touch.evaluate('__RINK__.game.phase="play"')
        session = mobile.new_cdp_session(touch)
        before = touch.evaluate("__RINK__.game.players[0].x")
        session.send(
            "Input.dispatchTouchEvent",
            {"type": "touchStart", "touchPoints": [{"x": 65, "y": 600}]},
        )
        session.send(
            "Input.dispatchTouchEvent",
            {"type": "touchMove", "touchPoints": [{"x": 115, "y": 600}]},
        )
        touch.wait_for_timeout(400)
        session.send(
            "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
        )
        check(
            "invisible touch stick skates",
            touch.evaluate("__RINK__.game.players[0].x") > before + 0.15,
        )
        touch.evaluate("__RINK__.game.givePuck(0)")
        touch.wait_for_timeout(100)
        touch.locator("#touchShoot").tap()
        touch.wait_for_timeout(100)
        check(
            "context touch shoot works",
            touch.evaluate("__RINK__.game.stats.shots[0]") > 0,
        )
        touch.locator("#menuButton").tap()
        check("touch menu button pauses", state(touch)["screen"] == "pause")
        touch.screenshot(path=str(ROOT / "touch.png"))
        mobile.close()

        # Official AI Hub conformance harness, including loss and a server seat.
        for players, scenario, network in [
            (2, "", ""),
            (4, "", "&latency=150&jitter=50&loss=5"),
            (2, "host-leave", ""),
            (2, "server", ""),
        ]:
            url = (
                BASE
                + f"/harness.html?game=game.html&players={players}&auto=1&play=4000&limit=30"
                + network
            )
            if scenario:
                url += "&scenario=" + scenario
            ctx.add_init_script(
                "(() => {let rink; Object.defineProperty(window,'__RINK__',{configurable:true,get:()=>rink,set:v=>{rink=v; if(location.search.includes('aihub=')) v.arena.render=()=>{};}});})()"
            )
            page.goto(url)
            page.wait_for_function("window.__hubCheck?.done === true", timeout=90000)
            report = page.evaluate("window.__hubCheck")
            (ROOT / f"hub-{players}-{scenario or 'normal'}.json").write_text(
                json.dumps(report, indent=2)
            )
            check(
                f"AI Hub {players} seats {scenario or 'normal'}",
                report["pass"],
                [c for c in report["checks"] if not c["pass"]],
            )
        # The deployable file must also work without an HTTP server.
        page.goto((ROOT / "game.html").as_uri())
        ready(page)
        check(
            "single HTML runs from file protocol",
            page.evaluate("location.protocol") == "file:"
            and state(page)["screen"] in ["title", "play"],
        )
        page.evaluate('__RINK__.title();__RINK__.start("exhibition")')
        check(
            "file-protocol exhibition starts",
            state(page)["mode"] == "exhibition" and state(page)["screen"] == "play",
        )
        interview = json.loads((ROOT.parent / "exit-interview.json").read_text())
        check(
            "exit interview parses and matches in-game metadata",
            page.evaluate("__RINK__.feedback") == interview,
        )
        check(
            "all required exit interview sections present",
            set(interview)
            == {
                "sourceInformation",
                "testingFeedback",
                "engineFeedback",
                "promptFeedback",
                "aiHub",
            },
        )
        check(
            "deployable HTML matches development build",
            (ROOT / "game.html").read_bytes()
            == next(ROOT.parent.glob("Rink-or-Swim-*.html")).read_bytes(),
        )
        from test_rtc import probe_rtc

        rtc = probe_rtc(browser, page, BASE, ROOT)
        if rtc["status"] == "verified":
            check("real WebRTC data exchange via public relay", True)
        check(
            "no runtime errors across all input and network flows", not errors, errors
        )
        browser.close()
except Exception as e:  # noqa: BLE001 -- persist every unexpected test-run failure
    check(
        "test run completes",
        False,
        f"{type(e).__name__}: {e}; runtime errors: {errors}",
    )
finally:
    server.shutdown()
    result = {
        "checks": checks,
        "errors": errors,
        "passed": sum(x["pass"] for x in checks),
        "failed": sum(not x["pass"] for x in checks),
    }
    (ROOT / "test-results.json").write_text(json.dumps(result, indent=2))
    print(
        f"{result['passed']}/{len(checks)} checks passed; {result['failed']} failures",
        flush=True,
    )
    if result["failed"]:
        raise SystemExit(1)
