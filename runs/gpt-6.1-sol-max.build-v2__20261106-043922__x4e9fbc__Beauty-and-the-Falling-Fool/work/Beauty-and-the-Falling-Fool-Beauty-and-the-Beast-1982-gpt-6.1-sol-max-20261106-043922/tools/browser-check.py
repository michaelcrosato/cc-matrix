import functools
import http.server
import json
import sys
import threading
import time
import traceback
import urllib.parse
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parents[1]
BUILD = json.loads((BASE / "artifacts/build.json").read_text())
URL = (BASE.parent / BUILD["file"]).as_uri()
results = []


def test(name, fn):
    if "--hub-only" in sys.argv and not name.startswith("actual three-copy"):
        return
    try:
        detail = fn()
        results.append({"name": name, "pass": True, "detail": detail})
    except Exception as exc:  # noqa: BLE001 - aggregate independent verification failures
        results.append(
            {
                "name": name,
                "pass": False,
                "error": str(exc) + "\n" + traceback.format_exc(limit=3),
            }
        )


def check(ok, message):
    if not ok:
        raise AssertionError(message)


def snap(page):
    return page.evaluate("__game.debug.snapshot()")


def click(page, name):
    page.get_by_role("button", name=name, exact=True).first.click(timeout=5000)


PAD_INIT = """window.pads=[]; navigator.getGamepads=()=>window.pads;
window.setPads=(count)=>{window.pads=Array.from({length:count},(_,i)=>({index:i,id:'DualSense emulation '+i,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))}));};
window.padButton=(i,j,on)=>{pads[i].buttons[j]={pressed:on,touched:on,value:on?1:0};};"""
ROUTE = """() => {const g=__game.game,w=__game.debug.world();g.stop();let roof=false;const strips=[];for(let i=0;i<36000;i++){const a=FF.bot(w,w.actors[0]);for(const [name,on]of Object.entries({left:a.x<-.1,right:a.x>.1,up:a.up,down:a.down,jump:a.jump}))g.input.hold(name,!!on);if(a.jumpPressed)g.input.tap('jump');g.advance(1/120,{draw:i%150===0});if(w.section===3&&!roof){roof=true;g.advance(0,{draw:true});}if(w.phase==='results'||w.phase==='failed')break;}g.advance(0,{draw:true});return __game.debug.snapshot();}"""


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
    ctx.add_init_script(PAD_INIT)
    page = ctx.new_page()
    errors = []
    requests = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    ctx.route("http://**/*", lambda r: (requests.append(r.request.url), r.abort()))
    ctx.route("https://**/*", lambda r: (requests.append(r.request.url), r.abort()))
    page.goto(URL)
    page.wait_for_function('window.__game && __game.debug.snapshot().menu === "title"')
    test(
        "offline file boot and exact identity",
        lambda: check(
            page.title() == BUILD["title"] and not errors and not requests,
            "identity/errors/network " + str(errors + requests),
        ),
    )

    def title_focus():
        box = page.get_by_role(
            "button", name="Start climbing", exact=True
        ).bounding_box()
        check(box and box["y"] + box["height"] < 1080, "start outside viewport")
        page.get_by_role("button", name="How to play", exact=True).hover()
        check(
            page.evaluate("document.activeElement.textContent").strip()
            == "How to play",
            "mouse hover focus",
        )
        click(page, "How to play")
        check("Six seconds" in page.locator(".esh-sh").inner_text(), "help missing")
        click(page, "Got it")

    test("title readability, hover focus and how-to", title_focus)

    def play_pause():
        click(page, "Start climbing")
        page.keyboard.down("d")
        page.wait_for_timeout(450)
        page.keyboard.up("d")
        check(snap(page)["actors"][0]["x"] > 85, "did not move")
        page.keyboard.down("w")
        page.wait_for_timeout(1000)
        page.keyboard.up("w")
        page.keyboard.press("Escape")
        page.wait_for_timeout(80)
        check(snap(page)["menu"] == "pause", "pause missing")
        tick = snap(page)["tick"]
        page.wait_for_timeout(100)
        check(snap(page)["tick"] == tick, "offline world advanced in pause")
        page.screenshot(path=str(BASE / "artifacts/gameplay-pause.png"))
        click(page, "Resume")
        page.wait_for_timeout(100)
        check(snap(page)["tick"] > tick, "did not resume")

    test("real keyboard play and native pause/resume", play_pause)

    def audio():
        check(page.evaluate("__game.game.audio.musicVolume") == 0.1, "music bus not .1")
        page.evaluate(
            """() => {const a=__game.game.audio;window.musicMeter=a.ctx.createAnalyser();musicMeter.fftSize=2048;a.bus('music').connect(musicMeter);}"""
        )
        page.wait_for_timeout(650)
        data = page.evaluate(
            """() => {const d=new Float32Array(musicMeter.fftSize);musicMeter.getFloatTimeDomainData(d);return {peak:Math.max(...d.map(Math.abs)),finite:d.every(Number.isFinite),gain:__game.game.audio._musBus.gain.value};}"""
        )
        check(
            data["peak"] > 0 and data["finite"] and abs(data["gain"] - 0.1) < 1e-6,
            "silent/invalid music " + str(data),
        )
        page.evaluate('__game.game.settings.set("sound",false)')
        check(
            page.evaluate("__game.game.audio._master.gain.value") == 0,
            "mute not applied",
        )
        page.evaluate('__game.game.settings.set("sound",true)')
        voice = page.evaluate(
            """async () => {const c=new OfflineAudioContext(1,22050,22050),bus=c.createGain();bus.connect(c.destination);FF.synthVoice(c,bus,.02,220);const b=await c.startRendering(),d=b.getChannelData(0);return {peak:Math.max(...d.map(Math.abs)),finite:d.every(Number.isFinite)};}"""
        )
        check(
            voice["peak"] > 0 and voice["peak"] < 1 and voice["finite"],
            "invalid voice " + str(voice),
        )
        return {"music": data, "voice": voice}

    test("procedural music, voice, gain and mute measured", audio)

    def dev():
        page.keyboard.press("Escape")
        page.wait_for_timeout(80)
        click(page, "Dev Mode")
        click(page, "Live balance sliders")
        slider = page.get_by_role("slider", name="Run speed", exact=True)
        slider.fill("120")
        check(
            page.evaluate("__game.debug.world().cfg.run") == 120,
            "slider did not update simulation",
        )
        click(page, "Reset balance defaults")
        check(
            page.evaluate("__game.debug.world().cfg.run") == 95
            and slider.input_value() == "95",
            "reset failed",
        )
        click(page, "Back")
        click(page, "Single step (1/120 s)")
        check(snap(page)["unranked"], "dev run not unranked")
        click(page, "Back")
        click(page, "Resume")

    test("pause dev live sliders, reset and single step", dev)

    def credits():
        page.keyboard.press("Escape")
        page.wait_for_timeout(80)
        click(page, "About & credits")
        seen = []
        for i in range(20):
            seen.append(page.locator(".esh-sh").inner_text())
            if page.get_by_role("button", name="Next page", exact=True).count():
                click(page, "Next page")
            else:
                break
        for key in [
            "Source Information",
            "Testing Feedback",
            "Engine Feedback",
            "Prompt Feedback",
            "added on import",
        ]:
            check(any(key.lower() in t.lower() for t in seen), "missing " + key)
        click(page, "Back")
        click(page, "Resume")

    test("all credits and ordered interview pages reachable", credits)

    def window_click():
        point = page.evaluate(
            """() => {const g=__game.game;__game.debug.reset();g.stop();g.advance(1);g.input.hold('right');g.advance(.3);g.input.hold('right',false);g.advance(.1,{draw:true});const p=g.r.w(104,0,33),r=g.screen.canvas.getBoundingClientRect();return {x:r.left+(p[0]*g.screen.S+g.screen.OX)/g.screen.dpr,y:r.top+(p[1]*g.screen.S+g.screen.OY)/g.screen.dpr};}"""
        )
        page.mouse.click(point["x"], point["y"])
        page.evaluate("__game.game.advance(1.4,{draw:true})")
        check(
            snap(page)["actors"][0]["floor"] == 1,
            "window click failed ordinary traversal",
        )
        page.evaluate("__game.game.start()")

    test("mouse window target obeys normal alignment and traversal", window_click)

    def full_route():
        page.evaluate("__game.debug.reset()")
        state = page.evaluate(ROUTE)
        check(
            state["rescued"] and state["departed"] and state["phase"] == "results",
            "browser route " + state["phase"],
        )
        check(not page.evaluate("__game.game.errors"), "native draw errors")
        page.screenshot(path=str(BASE / "artifacts/results.png"))
        return {
            "seconds": state["time"],
            "score": state["score"],
            "hazards": state["metrics"]["seen"],
        }

    test("packaged native-input complete rescue and departure", full_route)

    def attract():
        page.evaluate('__game.game.go("title",null,{fade:0}); __game.game.advance(.1)')
        before = page.evaluate("JSON.stringify(localStorage)")
        page.evaluate("__game.game.advance(9.5)")
        check(snap(page)["runtime"] == "title", "attract too early")
        page.evaluate("__game.game.advance(.7)")
        check(snap(page)["runtime"] == "attract", "attract missing at 10 seconds")
        page.evaluate("__game.game.advance(100,{draw:true})")
        check(
            page.evaluate("JSON.stringify(localStorage)") == before,
            "attract changed saves",
        )
        page.keyboard.press("F7")
        page.evaluate("__game.game.advance(.1)")
        check(snap(page)["runtime"] == "title", "raw unmapped key failed to wake")
        page.evaluate("__game.game.advance(10.2)")
        page.mouse.move(800, 400)
        page.evaluate("__game.game.advance(.1)")
        check(snap(page)["runtime"] == "title", "pointer failed to wake")
        page.evaluate("setPads(1);pads[0].axes[0]=.1;__game.game.advance(10.3)")
        check(snap(page)["runtime"] == "attract", "small pad drift prevented attract")
        page.evaluate("pads[0].axes[0]=.8;__game.game.advance(.1)")
        check(snap(page)["runtime"] == "title", "pad axis failed to wake")
        page.evaluate("setPads(0);__game.game.start()")

    test("10-second attract, raw wakes, drift tolerance and save isolation", attract)

    def gamepad():
        page.evaluate("setPads(1); __game.debug.reset(); __game.game.start()")
        page.wait_for_timeout(300)
        page.evaluate("pads[0].axes[0]=.8")
        page.wait_for_timeout(300)
        check(snap(page)["actors"][0]["x"] > 72, "pad axis movement")
        page.evaluate("pads[0].axes[0]=0; padButton(0,0,true)")
        page.wait_for_timeout(50)
        page.evaluate("padButton(0,0,false)")
        check(
            page.evaluate('__game.game.input.label("jump")') == "✕",
            "PlayStation glyph missing",
        )
        page.evaluate('__game.game.settings.set("glyphs","xbox")')
        check(
            page.evaluate('__game.game.input.label("jump")') == "A",
            "Xbox glyph missing",
        )
        page.evaluate("setPads(0)")
        page.wait_for_timeout(150)
        check(page.evaluate("__game.game.paused"), "controller loss did not pause")
        page.evaluate(
            '__game.game.settings.set("glyphs","playstation");__game.game.resume();__game.game.shell.hide()'
        )

    test("emulated standard pad, edge jump, glyphs and disconnect", gamepad)

    def coop():
        page.evaluate("setPads(2);__game.debug.start({coop:true});__game.game.start()")
        page.wait_for_timeout(300)
        old = snap(page)["actors"]
        page.evaluate("pads[1].axes[0]=.8")
        page.wait_for_timeout(300)
        new = snap(page)["actors"]
        check(new[1]["x"] > old[1]["x"] + 5, "second pad not routed")
        check(abs(new[0]["x"] - old[0]["x"]) < 3, "second pad moved first climber")
        page.evaluate("pads[1].axes[0]=0")
        page.screenshot(path=str(BASE / "artifacts/coop.png"))
        page.evaluate("setPads(1);__game.debug.start({coop:true});__game.game.start()")
        page.wait_for_timeout(250)
        old = snap(page)["actors"]
        page.keyboard.down("d")
        page.wait_for_timeout(220)
        page.keyboard.up("d")
        new = snap(page)["actors"]
        check(
            new[0]["x"] > old[0]["x"] + 5 and abs(new[1]["x"] - old[1]["x"]) < 3,
            "keyboard/pad ownership incorrect",
        )
        page.evaluate("setPads(0)")

    test("two-pad and keyboard-plus-pad co-op seat ownership", coop)
    test(
        "no standalone runtime errors or external requests",
        lambda: check(not errors and not requests, str(errors + requests)),
    )
    ctx.close()
    phone = browser.new_context(**pw.devices["Pixel 7"])
    mobile = phone.new_page()

    def multitouch():
        mobile.goto(URL)
        mobile.wait_for_function("window.__game")
        click(mobile, "Start climbing")
        mobile.wait_for_function("__game.debug.snapshot().time>.25")
        old = snap(mobile)["actors"][0]["x"]
        cdp = phone.new_cdp_session(mobile)
        cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchStart", "touchPoints": [{"x": 70, "y": 600, "id": 1}]},
        )
        cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchMove", "touchPoints": [{"x": 120, "y": 600, "id": 1}]},
        )
        cdp.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchStart",
                "touchPoints": [
                    {"x": 120, "y": 600, "id": 1},
                    {"x": 300, "y": 600, "id": 2},
                ],
            },
        )
        mobile.wait_for_function(
            "__game.debug.snapshot().metrics.jumps>0", timeout=5000
        )
        mobile.wait_for_function(
            f"__game.debug.snapshot().actors[0].x>{old + 3}", timeout=5000
        )
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        mobile.wait_for_function("__game.debug.snapshot().actors[0].onGround")
        mobile.evaluate('__game.game.settings.set("hand","left")')
        before = snap(mobile)
        old_x = before["actors"][0]["x"]
        old_jumps = before["metrics"]["jumps"]
        cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchStart", "touchPoints": [{"x": 290, "y": 600, "id": 1}]},
        )
        cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchMove", "touchPoints": [{"x": 340, "y": 600, "id": 1}]},
        )
        cdp.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchStart",
                "touchPoints": [
                    {"x": 340, "y": 600, "id": 1},
                    {"x": 70, "y": 600, "id": 2},
                ],
            },
        )
        mobile.wait_for_function(f"__game.debug.snapshot().metrics.jumps>{old_jumps}")
        mobile.wait_for_function(f"__game.debug.snapshot().actors[0].x>{old_x + 3}")
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        mobile.evaluate('__game.game.settings.set("hand","right")')
        cdp.detach()
        mobile.screenshot(path=str(BASE / "artifacts/touch-multitouch.png"))
        mobile.evaluate(
            '__game.game.go("title",null,{fade:0});__game.game.advance(10.4)'
        )
        check(snap(mobile)["runtime"] == "attract", "touch demo setup failed")
        mobile.touchscreen.tap(180, 500)
        mobile.wait_for_function('__game.debug.snapshot().runtime === "title"')

    test("emulated phone simultaneous move/jump and touch attract wake", multitouch)
    phone.close()
    blocked = browser.new_context(viewport={"width": 1280, "height": 720})
    blocked.add_init_script(
        "Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError')}})"
    )
    unavailable = blocked.new_page()

    def storage_fallback():
        unavailable.goto(URL)
        unavailable.wait_for_function("window.__game")
        click(unavailable, "Start climbing")
        unavailable.wait_for_function("__game.debug.snapshot().time>.1")
        check(
            unavailable.evaluate("__game.game.audio.musicVolume") == 0.1,
            "blocked storage changed defaults",
        )
        check(
            not unavailable.evaluate("__game.game.errors"),
            "blocked storage caused game errors",
        )

    test("browser blocked-storage fallback remains playable", storage_fallback)
    blocked.close()
    absent = browser.new_context(viewport={"width": 1280, "height": 720})
    absent.add_init_script(
        """let client;Object.defineProperty(window,'AIHub',{configurable:true,get(){return client},set(api){client=api;api.active=true;api.connect=()=>{api.active=false;return Promise.resolve(null)};}});"""
    )
    orphan = absent.new_page()

    def absent_hub():
        orphan.goto(URL)
        orphan.wait_for_function(
            'window.__game && __game.debug.snapshot().menu === "title"'
        )
        click(orphan, "Start climbing")
        orphan.wait_for_function("__game.debug.snapshot().time>.2")
        check(
            snap(orphan)["runtime"] == "playing",
            "null handshake did not recover to standalone",
        )
        check(
            orphan.evaluate("__game.game.settings.ff_run") == 95,
            "balance defaults missing after fallback",
        )
        check(
            orphan.evaluate("typeof __game.debug.world") == "function",
            "standalone inspection missing after fallback",
        )

    test("null Hub handshake restores complete standalone runtime", absent_hub)
    absent.close()
    browser.close()
    for name, launcher, device in [
        ("webkit", pw.webkit, "iPhone 13"),
        ("firefox", pw.firefox, None),
    ]:
        browser = launcher.launch(headless=True)
        config = (
            {**pw.devices[device]}
            if device
            else {"viewport": {"width": 1280, "height": 720}}
        )
        ctx = browser.new_context(**config)
        page = ctx.new_page()
        other_errors = []
        page.on("pageerror", lambda e, sink=other_errors: sink.append(str(e)))

        def startup(page=page, device=device, other_errors=other_errors):
            page.goto(URL)
            page.wait_for_function("window.__game")
            click(page, "Start climbing")
            page.wait_for_timeout(300)
            check(
                snap(page)["phase"] == "playing" and not other_errors,
                "startup " + str(other_errors),
            )
            if device:
                page.wait_for_function("__game.debug.snapshot().time>.25")
                page.touchscreen.tap(300, 600)
                page.wait_for_function(
                    "__game.debug.snapshot().metrics.jumps>0", timeout=5000
                )
                page.screenshot(path=str(BASE / "artifacts/touch-portrait.png"))
                page.set_viewport_size({"width": 844, "height": 390})
                page.wait_for_timeout(100)
                page.screenshot(path=str(BASE / "artifacts/touch-landscape.png"))
                page.evaluate("__game.game.pause()")
                page.wait_for_timeout(80)
                click(page, "Settings")
                check(
                    page.get_by_role("slider", name="Music", exact=True).count() == 1,
                    "touch settings inaccessible",
                )
            else:
                page.keyboard.down("d")
                page.wait_for_timeout(180)
                page.keyboard.up("d")
                check(snap(page)["actors"][0]["x"] > 70, "Firefox movement failed")

        test(
            name + " canvas, input and settings smoke (emulated touch)"
            if device
            else name + " Canvas startup and keyboard",
            startup,
        )
        ctx.close()
        browser.close()
    # The pristine Hub harness is served from its vendored location; game is same-origin.
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(BASE.parent))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = "http://127.0.0.1:" + str(server.server_port)
    browser = pw.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1200, "height": 800})
    page = ctx.new_page()
    harness = BASE.name + "/vendor/ai-hub/lib/hub/harness.html"
    gamepath = "/" + BUILD["file"]
    for scenario, network in [
        ("standard", ""),
        ("server", "&latency=150&jitter=50&loss=5"),
        ("host-leave", "&latency=150&jitter=50&loss=5"),
    ]:

        def hub_case(scenario=scenario, network=network):
            url = (
                origin
                + "/"
                + harness
                + "?game="
                + urllib.parse.quote(gamepath, safe="/")
                + "&players=2&auto=1&play=1800&scenario="
                + scenario
                + network
            )
            page.goto(url)
            page.wait_for_function(
                'document.body.dataset.complete === "true"', timeout=60000
            )
            report = page.evaluate("window.__hubCheck")
            (BASE / "artifacts" / ("hub-" + scenario + ".json")).write_text(
                json.dumps(report, indent=2)
            )
            check(
                report["pass"],
                "; ".join(
                    c["name"] + ": " + c.get("detail", "")
                    for c in report["checks"]
                    if not c["pass"]
                ),
            )
            return {"checks": len(report["checks"])}

        test("Hub " + scenario + " handshake, traffic, time-up and cleanup", hub_case)

    def hub_rescue():
        url = (
            origin
            + "/"
            + harness
            + "?game="
            + urllib.parse.quote(gamepath, safe="/")
            + "&players=2&scenario=server&latency=0&jitter=0&loss=0&seed=55&limit=300"
        )
        page.goto(url)
        page.wait_for_function(
            'document.querySelectorAll("iframe").length===3 && [...document.querySelectorAll("iframe")].every(f=>f.contentWindow.__game && f.contentWindow.AIHub.me!==null)',
            timeout=15000,
        )
        page.locator("#release").click()
        page.wait_for_timeout(3300)
        driver = (BASE / "tests/hub-pilot.js").read_text()
        started = time.monotonic()
        trace_at = -1
        last = []
        menu_tested = False
        rooftop = False
        while time.monotonic() - started < 200:
            last = page.evaluate(driver)
            if int(time.monotonic() - started) // 3 != trace_at:
                trace_at = int(time.monotonic() - started) // 3
                (BASE / "artifacts/hub-route-trace.json").write_text(
                    json.dumps(last, indent=2)
                )
            host = next((x for x in last if x and x["server"]), None)
            if host and host["s"]["section"] == 3 and not rooftop:
                rooftop = True
                page.screenshot(path=str(BASE / "artifacts/hub-rooftop.png"))
            if host and host["s"]["time"] > 8 and not menu_tested:
                client = next(
                    f
                    for f in page.frames
                    if f != page.main_frame
                    and f.evaluate("!!window.AIHub && !AIHub.server")
                )
                before = host["s"]["tick"]
                client.evaluate("__game.game.pause()")
                page.wait_for_timeout(250)
                check(
                    page.evaluate(driver)[0]["s"]["tick"] > before,
                    "host froze under client menu",
                )
                client.evaluate("__game.game.shell.hide();__game.game.resume()")
                menu_tested = True
            if host and all(x["s"]["phase"] == "ended" for x in last if x):
                break
            page.wait_for_timeout(40)
        (BASE / "artifacts/hub-rescue-latest.json").write_text(
            json.dumps(last, indent=2)
        )
        check(
            last and all(x["s"]["rescued"] for x in last if x),
            "copies did not all commit rescue: "
            + str(
                [
                    (x["server"], x["s"]["phase"], x["s"]["section"], x["s"]["chances"])
                    for x in last
                    if x
                ]
            ),
        )
        check(
            all(x["s"]["phase"] == "ended" for x in last if x),
            "Hub did not end after departure",
        )
        check(
            len({(x["s"]["score"], x["s"]["chances"]) for x in last if x}) == 1,
            "authoritative results diverged",
        )
        check("[[0,1]]" in page.locator("#log").inner_text(), "no tied team finish")
        counts = [x["s"]["network"]["sent"] for x in last if x]
        page.wait_for_timeout(250)
        after = page.evaluate(driver)
        check(
            counts == [x["s"]["network"]["sent"] for x in after if x],
            "traffic continued after end",
        )
        check(
            all(
                not x["s"]["audio"]["active"] or x["s"]["audio"]["phrase"] is None
                for x in after
                if x
            ),
            "audio phrase continued after end",
        )
        check(
            next(x for x in after if x["server"])["s"]["audio"]["active"] == False,
            "server activated audio",
        )
        report = {
            "secondsWall": time.monotonic() - started,
            "copies": last,
            "menuContinued": menu_tested,
            "tie": True,
        }
        (BASE / "artifacts/hub-rescue.json").write_text(json.dumps(report, indent=2))
        return {"seconds": report["secondsWall"], "score": last[0]["s"]["score"]}

    test(
        "actual three-copy Hub rescue, local menu and end cleanup",
        hub_rescue,
    )
    ctx.close()
    browser.close()
    server.shutdown()
    server.server_close()
    thread.join()
(BASE / "artifacts/browser.json").write_text(json.dumps(results, indent=2))
print(
    json.dumps(
        {"tests": len(results), "failures": [r for r in results if not r["pass"]]}
    )
)
