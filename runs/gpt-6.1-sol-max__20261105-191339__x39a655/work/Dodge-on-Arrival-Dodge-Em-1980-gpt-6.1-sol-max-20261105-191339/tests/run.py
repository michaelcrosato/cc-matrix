"""One command exercises the shipped HTML. Only failures and one count reach stdout."""

import json
import os
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
ROOT = DEV.parent
RESULTS = []
NOTES = []
ERRORS = []
VISUAL = "--visual" in sys.argv
UI_ONLY = "--ui" in sys.argv
FLAGS = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-webgpu-adapter=swiftshader",
    "--no-sandbox",
]


def check(name, fn):
    try:
        fn()
        RESULTS.append({"name": name, "pass": True})
    except Exception as exc:  # noqa: BLE001 - a test framework records every test failure.
        detail = str(exc)
        RESULTS.append({"name": name, "pass": False, "detail": detail})
        print(f"FAIL {name}: {detail[:1600]}", flush=True)


def expect(condition, detail="assertion failed"):
    if not condition:
        raise AssertionError(detail)


def snap(page):
    return page.evaluate("window.__game.snapshot()")


def advance(page, seconds, **options):
    return page.evaluate("([s,o]) => window.__game.advance(s,o)", [seconds, options])


def setup_play(page, mode="solo"):
    page.evaluate("(m) => window.__game.start(m)", mode)
    advance(page, 3.05)


def place(page, id, **values):
    page.evaluate("([i,v]) => window.__game.place(i,v)", [id, values])


def open_game(context, url):
    page = context.new_page()
    page.set_default_timeout(10000)
    page.on("pageerror", lambda e: ERRORS.append(str(e)))
    page.goto(url, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_function(
        "window.__game?.snapshot().ready || window.__bootError", timeout=90000
    )
    error = page.evaluate("window.__bootError || null")
    expect(not error, str(error))
    expect(page.title() == "Dodge on Arrival", "server did not serve this game")
    return page


def gameplay_tests(page):
    def versions():
        s = snap(page)
        expect(s["renderer"] == "WebGPU", s["renderer"])
        expect(s["three"] == "180" and s["rapier"] == "0.19.3", str(s))
        expect(s["audio"]["musicVolume"] == 0.1, "music default differs from 10%")

    check("Pinned engines, active WebGPU and 10% music", versions)

    def start_keyboard():
        page.keyboard.press("Enter")
        expect(snap(page)["state"] == "countdown", str(snap(page)))
        s = advance(page, 3.1)
        expect(s["state"] == "playing", str(s))

    check("Keyboard starts the full game", start_keyboard)

    def collect_sensor():
        s = advance(page, 1.2, invincible=True)
        expect(s["score"] > 0 and s["dotsLeft"] < 80 and s["sensorEvents"] > 0, str(s))

    check("Rapier sensor gold collection and scoring", collect_sensor)

    def buffered():
        setup_play(page)
        page.evaluate("window.__game.queue(0,0,2)")
        place(page, 0, lane=1, u=0.12, immune=100)
        s = advance(page, 0.05)
        expect(s["car"]["lane"] == 1 and s["car"]["requested"] == 2, str(s["car"]))
        place(page, 0, lane=1, u=0.249, immune=100)
        s = advance(page, 0.4)
        expect(
            s["car"]["lane"] == 2 and abs(s["car"]["renderLane"] - 2) < 0.01,
            str(s["car"]),
        )

    check("Input buffers until a gap and smoothly changes lane", buffered)

    def shift_limits():
        setup_play(page)
        page.evaluate("window.__game.queue(0,0,3)")
        place(page, 0, lane=0, u=0.249, immune=100)
        s = advance(page, 0.4)
        expect(
            s["car"]["lane"] == 2,
            "cruising did not allow a two-lane change: " + str(s["car"]),
        )
        setup_play(page)
        page.keyboard.down("Space")
        page.wait_for_function("window.__game.snapshot().car.boost", timeout=5000)
        page.evaluate("window.__game.queue(0,0,3)")
        place(page, 0, lane=0, u=0.249, immune=100)
        s = advance(page, 0.4)
        page.keyboard.up("Space")
        expect(
            s["car"]["lane"] == 1, "boost did not restrict the change: " + str(s["car"])
        )

    check("Cruising versus boost lane-change tradeoff", shift_limits)

    def closed_gate():
        setup_play(page)
        page.evaluate("window.__game.set({stage:4,elapsed:3,state:'playing'})")
        page.evaluate("window.__game.queue(0,0,2)")
        place(page, 0, lane=0, u=0.999, immune=100)
        s = advance(page, 0.12)
        expect(
            s["gates"][0]["locked"]
            and s["car"]["lane"] == 0
            and s["car"]["requested"] == 2
            and s["stats"]["gatesBlocked"] > 0,
            str(s),
        )

    check("Closed red gap preserves queued input", closed_gate)

    def crash_respawn():
        setup_play(page)
        collected = snap(page)["dotsLeft"]
        for id in [0, 1]:
            place(page, id, lane=0, u=0.14, immune=0)
        s = advance(page, 0.05)
        expect(
            s["state"] == "crashed" and s["lives"] == 2 and s["stats"]["crashes"] == 1,
            str(s),
        )
        s = advance(page, 1.6)
        expect(
            s["state"] == "playing"
            and s["car"]["u"] < 0.15
            and s["dotsLeft"] <= collected,
            str(s),
        )

    check("Head-on physics crash, life loss and safe respawn", crash_respawn)

    def gameover():
        setup_play(page)
        for _ in range(3):
            for id in [0, 1]:
                place(page, id, lane=0, u=0.19, immune=0)
            advance(page, 0.06)
            s = advance(page, 1.65)
        expect(
            s["state"] == "gameover" and s["lives"] == 0 and s["modal"] == "result",
            str(s),
        )
        page.click("[data-action=about]:visible")
        page.click("[data-action=back]:visible")
        expect(
            snap(page)["modal"] == "result", "credits did not return to result screen"
        )

    check("Three crashes finish with a navigable result screen", gameover)

    def slip():
        setup_play(page)
        page.evaluate("window.__game.set({charge:100})")
        page.keyboard.press("Shift")
        for id in [0, 1]:
            place(page, id, lane=0, u=0.17, immune=0)
        s = advance(page, 0.1)
        expect(
            s["stats"]["slips"] == 1
            and s["state"] == "playing"
            and s["lives"] == 3
            and s["car"]["slip"] > 0,
            str(s),
        )
        s = advance(page, 1.3)
        expect(s["car"]["slip"] == 0 and s["charge"] < 100, str(s))

    check("Ink slip spends charge, prevents a real collision and expires", slip)

    def near():
        setup_play(page)
        page.evaluate("window.__game.set({charge:0})")
        place(page, 0, lane=1, u=0.125, immune=0)
        place(page, 1, lane=2, u=0.125, immune=0)
        s = advance(page, 0.05)
        expect(
            s["stats"]["near"] >= 1 and s["charge"] >= 26 and s["score"] >= 50, str(s)
        )

    check("Near misses reward score and replenish ink", near)

    def whole_campaign():
        setup_play(page)
        s = advance(page, 300, autopilot=True)
        expect(s["state"] == "victory" and s["stage"] == 5, str(s))
        expect(
            s["stats"]["cleared"] == 5
            and s["stats"]["dots"] == 400
            and s["stats"]["shifts"] >= 15,
            str(s["stats"]),
        )
        expect(
            s["stats"]["crashes"] == 0
            and s["score"] > 10000
            and s["physicsTicks"] > 5000,
            str(s),
        )

    check(
        "Scripted full campaign physically collects all 400 gold across five circuits",
        whole_campaign,
    )

    def dev_tools():
        setup_play(page)
        page.keyboard.press("Escape")
        expect(snap(page)["paused"], "pause did not freeze simulation")
        before = snap(page)["elapsed"]
        page.wait_for_timeout(150)
        expect(snap(page)["elapsed"] == before, "simulation advanced while paused")
        page.click("[data-action=dev]:visible")
        page.locator("#dev-playerSpeed").evaluate(
            "el=>{el.value='15';el.dispatchEvent(new Event('input',{bubbles:true}))}"
        )
        expect(snap(page)["tune"]["playerSpeed"] == 15, "live slider did not apply")
        page.check("#dev-invincible")
        expect(snap(page)["dev"]["invincible"], "invulnerability toggle did not apply")
        page.click("[data-action=dev-step]:visible")
        expect(snap(page)["elapsed"] >= before + 0.9, "single-step failed")
        page.click("[data-action=dev-next]:visible")
        expect(snap(page)["stage"] == 2, "next circuit failed")
        page.click("[data-action=dev-refill]:visible")
        expect(
            snap(page)["lives"] == 3 and snap(page)["charge"] == 100, "refill failed"
        )
        page.click("[data-action=dev-reset]:visible")
        expect(
            snap(page)["tune"]["playerSpeed"] == 10.6
            and not snap(page)["dev"]["invincible"],
            "defaults did not reset",
        )
        page.click("[data-action=resume]:visible")
        expect(
            not snap(page)["paused"] and snap(page)["dev"]["used"],
            "test drive did not resume unranked",
        )

    check("Pause and all developer tools including live sliders and reset", dev_tools)

    def settings():
        page.keyboard.press("Escape")
        page.click("[data-action=settings]:visible")
        page.locator("#setting-music").evaluate(
            "el=>{el.value='30';el.dispatchEvent(new Event('input',{bubbles:true}))}"
        )
        expect(
            snap(page)["audio"]["musicVolume"] == 0.3,
            "music slider did not reach audio bus",
        )
        page.click("[data-action=glyphs]:visible")
        expect(
            page.locator("[data-action=glyphs]:visible").inner_text() == "Xbox",
            "Xbox glyph setting failed",
        )
        page.click("[data-action=glyphs]:visible")
        page.locator("#setting-music").evaluate(
            "el=>{el.value='10';el.dispatchEvent(new Event('input',{bubbles:true}))}"
        )
        page.click("[data-action=back]:visible")
        expect(snap(page)["modal"] == "pause", "settings back did not return to pause")
        page.click("[data-action=resume]:visible")

    check("Audio settings, glyphs and menu return paths", settings)

    def audio_output():
        page.evaluate("window.__game.audio()")
        page.wait_for_timeout(130)
        s = snap(page)
        expect(
            s["audio"]["state"] == "running" and s["audio"]["level"] > 0.0001,
            str(s["audio"]),
        )
        expect(
            all(
                s["audio"]["events"][e] > 0 for e in ["dot", "crash", "voice", "music"]
            ),
            str(s["audio"]),
        )

    check(
        "Procedural effects, music and gibberish produce measurable audio", audio_output
    )

    def duel():
        setup_play(page, "duel")
        for id in [0, 1]:
            place(page, id, lane=0, u=0.15, immune=0)
        s = advance(page, 0.05)
        expect(s["runner"] == 1 and s["state"] == "crashed", str(s))
        s = advance(page, 1.6)
        before = s["duelScores"][1]
        place(page, 1, lane=2, u=0.01, immune=50)
        page.keyboard.down("i")
        page.wait_for_timeout(100)
        s = advance(page, 3)
        page.keyboard.up("i")
        expect(s["duelScores"][1] > before, str(s))
        page.evaluate("window.__game.set({elapsed:89.95})")
        s = advance(page, 0.1)
        expect(s["state"] == "gameover" and s["modal"] == "result", str(s))

    check("Couch duel swaps roles, scores driver two and ends at 90 seconds", duel)

    def credits_screen():
        page.click("[data-action=about]:visible")
        expect(
            "added on import" in page.locator("#modal").inner_text(), "usage missing"
        )
        for tab, label in [
            ("testingFeedback", "Issues caught"),
            ("engineFeedback", "Best part of the engine"),
            ("promptFeedback", "Best part of the prompt"),
        ]:
            page.click("[data-tab=" + tab + "]")
            expect(
                label in page.locator("#modal").inner_text(),
                "missing credits panel " + tab,
            )
        page.click("[data-action=back]:visible")
        page.click("[data-action=title]:visible")

    check(
        "About contains source information and all three feedback panels",
        credits_screen,
    )

    def attract():
        page.evaluate("window.__game.titleIdle(10.1)")
        page.wait_for_function(
            "window.__game.snapshot().mode==='attract'", timeout=10000
        )
        s = advance(page, 100)
        expect(
            s["mode"] == "attract"
            and s["stats"]["dots"] > 80
            and s["stats"]["shifts"] > 3,
            str(s),
        )
        page.keyboard.press("x")
        expect(
            snap(page)["state"] == "title" and snap(page)["mode"] == "solo",
            str(snap(page)),
        )
        page.evaluate("window.__game.titleIdle(10.1)")
        page.wait_for_function("window.__game.snapshot().mode==='attract'")
        page.mouse.wheel(0, 60)
        page.wait_for_function("window.__game.snapshot().state==='title'")

    check(
        "Ten-second attract mode drives multiple circuits and exits on input", attract
    )

    def gamepad():
        page.evaluate("""() => {
          window.testPad = { axes:[0,0,0,0], buttons:Array.from({length:17},()=>({pressed:false,value:0})), index:0, mapping:'standard', connected:true, id:'Emulated DualSense' };
          Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.testPad,null,null,null]});
        }""")

        def press(n):
            page.evaluate(
                "(n)=>{testPad.buttons[n].pressed=true;testPad.buttons[n].value=1}", n
            )
            page.wait_for_function(
                "(n)=>window.__game.snapshot().inputPads[0]?.[n]===true",
                arg=n,
                timeout=5000,
            )
            page.evaluate(
                "(n)=>{testPad.buttons[n].pressed=false;testPad.buttons[n].value=0}", n
            )
            page.wait_for_function(
                "(n)=>window.__game.snapshot().inputPads[0]?.[n]===false",
                arg=n,
                timeout=5000,
            )

        press(0)
        expect(
            snap(page)["state"] == "countdown" and snap(page)["input"] == "pad",
            str(snap(page)),
        )
        advance(page, 3.1)
        page.evaluate("testPad.buttons[8].pressed=true;testPad.buttons[9].pressed=true")
        page.wait_for_timeout(120)
        expect(not snap(page)["paused"], "Create+Options was intercepted by game")
        page.evaluate(
            "testPad.buttons[8].pressed=false;testPad.buttons[9].pressed=false"
        )
        page.wait_for_timeout(100)
        press(9)
        expect(snap(page)["modal"] == "pause", "Options did not pause")
        press(13)
        press(0)
        expect(snap(page)["modal"] == "settings", str(snap(page)))
        page.set_viewport_size({"width": 1200, "height": 450})
        page.evaluate("window.testPad.axes[3]=1")
        page.wait_for_function("document.getElementById('modal').scrollTop>20")
        page.evaluate("window.testPad.axes[3]=0")
        page.set_viewport_size({"width": 1200, "height": 750})
        press(1)
        expect(snap(page)["modal"] == "pause", "Circle did not return to pause")
        press(1)
        expect(not snap(page)["paused"], "Circle did not resume")
        page.evaluate("window.__game.pause()")
        page.locator("[data-action=title]:visible").evaluate("e=>e.click()")
        page.evaluate("window.__game.titleIdle(10.1)")
        page.wait_for_function("window.__game.snapshot().mode==='attract'")
        page.evaluate("window.testPad.axes[2]=0.8")
        page.wait_for_function("window.__game.snapshot().state==='title'")
        page.evaluate("window.testPad.axes[2]=0")
        page.evaluate(
            'Object.defineProperty(navigator,"getGamepads",{configurable:true,value:()=>[]})'
        )

    check(
        "Standard gamepad starts, navigates menus and respects Create+Options", gamepad
    )


def touch_tests(browser, url, pw):
    context = browser.new_context(**pw.devices["Pixel 7"])
    page = open_game(context, url)

    def touch():
        page.tap("[data-action=solo]:visible")
        advance(page, 3.1)
        expect(snap(page)["input"] == "touch", "touch did not select touch UI")
        expect(
            page.locator("#control-strip").evaluate("e=>getComputedStyle(e).display")
            == "none",
            "desktop controls clutter touch screen",
        )
        client = context.new_cdp_session(page)
        client.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchStart",
                "touchPoints": [
                    {"x": 70, "y": 760, "id": 1},
                    {"x": 320, "y": 760, "id": 2},
                ],
            },
        )
        client.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchMove",
                "touchPoints": [
                    {"x": 130, "y": 760, "id": 1},
                    {"x": 320, "y": 760, "id": 2},
                ],
            },
        )
        page.wait_for_timeout(150)
        s = snap(page)
        expect(s["car"]["boost"] and s["car"]["requested"] is not None, str(s["car"]))
        client.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        page.tap("#touch-slip")
        expect(snap(page)["stats"]["slips"] >= 1, "contextual slip did not activate")
        page.tap("#menu-button")
        expect(snap(page)["paused"], "touch menu did not pause")
        page.tap("[data-action=dev]:visible")
        client.send(
            "Input.dispatchTouchEvent",
            {"type": "touchStart", "touchPoints": [{"x": 60, "y": 700, "id": 3}]},
        )
        for y in [640, 560, 480, 380, 280]:
            client.send(
                "Input.dispatchTouchEvent",
                {"type": "touchMove", "touchPoints": [{"x": 60, "y": y, "id": 3}]},
            )
            page.wait_for_timeout(30)
        client.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        expect(
            page.locator("#modal").evaluate("e=>e.scrollTop") > 10,
            "touch could not scroll the dev garage",
        )
        context.close()

    check("Phone multitouch, invisible controls, contextual slip and pause", touch)
    if not context.pages:
        return
    context.close()


def link_tests(browser, url):
    context = browser.new_context(viewport={"width": 1000, "height": 650})
    host = open_game(context, url + "&localnet=1")
    guest = open_game(context, url + "&localnet=1")

    def local_link():
        host.click("[data-action=online]:visible")
        host.click("[data-action=host]:visible")
        code = snap(host)["net"]["code"]
        guest.click("[data-action=online]:visible")
        guest.click("[data-action=join-menu]:visible")
        guest.fill("#room-input", code)
        guest.click("[data-action=join]:visible")
        host.wait_for_function(
            "window.__game.snapshot().net.members===2", timeout=10000
        )
        guest.wait_for_function("window.__game.snapshot().net.seat===1", timeout=10000)
        host.click("[data-action=start-room]:visible")
        host.wait_for_function(
            "window.__game.snapshot().state==='playing'", timeout=15000
        )
        guest.wait_for_function(
            "window.__game.snapshot().state==='playing'", timeout=15000
        )
        host.wait_for_function(
            "window.__game.snapshot().ghosts.some(g=>g.visible)", timeout=10000
        )
        guest.wait_for_function(
            "window.__game.snapshot().ghosts.some(g=>g.visible)", timeout=10000
        )
        expect(
            snap(host)["mode"] == "race" and snap(guest)["mode"] == "race", "not racing"
        )
        expect(
            snap(host)["ghosts"][0]["id"] != snap(guest)["ghosts"][0]["id"],
            "ghosts are not remote drivers",
        )
        guest.evaluate("window.__game.network.close()")
        host.wait_for_function(
            "window.__game.snapshot().net.members===1", timeout=10000
        )

    check(
        "Two-tab standalone room codes, synchronized start, ghosts and leaving",
        local_link,
    )
    context.close()

    # Separate contexts cannot share BroadcastChannel: this must use actual WebRTC.
    hc = browser.new_context(viewport={"width": 800, "height": 550})
    gc = browser.new_context(viewport={"width": 800, "height": 550})
    h = open_game(hc, url)
    g = open_game(gc, url)
    try:
        h.evaluate("window.__game.network.open(true)")
        code = snap(h)["net"]["code"]
        g.evaluate("(code)=>window.__game.network.open(false,code)", code)
        h.wait_for_function(
            "window.__game.snapshot().net.members===2 && window.__game.snapshot().net.transport==='WEBRTC CONNECTED'",
            timeout=30000,
        )
        g.wait_for_function("window.__game.snapshot().net.members===2", timeout=10000)
        RESULTS.append(
            {
                "name": "Standalone public signaling and real cross-context WebRTC",
                "pass": True,
            }
        )
        NOTES.append(
            "Public PeerJS signaling and cross-context WebRTC data connection verified locally; a geographically remote network is unknown."
        )
    except Exception:  # noqa: BLE001 - public signaling is an optional environment probe.
        NOTES.append(
            "Public PeerJS signaling / cross-context WebRTC could not be confirmed in this environment: "
            + str(snap(h)["net"])
            + " / "
            + str(snap(g)["net"])
        )
    hc.close()
    gc.close()


def harness_tests(browser, base_url):
    for players, scenario in [(2, "standard"), (4, "standard"), (4, "host-leave")]:
        context = browser.new_context(viewport={"width": 1100, "height": 720})
        page = context.new_page()
        params = urlencode(
            {
                "game": "../../" + DEV.name + ".html",
                "players": players,
                "auto": 1,
                "limit": 14,
                "scenario": scenario,
                "latency": 150 if players == 4 else 0,
                "jitter": 50 if players == 4 else 0,
                "loss": 5 if players == 4 else 0,
            }
        )

        def harness(page=page, params=params, players=players, scenario=scenario):
            page.goto(
                base_url + "/" + DEV.name + "/tests/harness.html?" + params,
                wait_until="domcontentloaded",
            )
            page.wait_for_function("window.__hubCheck?.done", timeout=120000)
            report = page.evaluate("window.__hubCheck")
            (DEV / "tests" / f"hub-{players}-{scenario}.json").write_text(
                json.dumps(report, indent=2)
            )
            failed = [c for c in report["checks"] if not c["pass"]]
            expect(report["pass"], json.dumps(failed))
            RESULTS.extend(
                {"name": f"Hub {players} {scenario}: " + c["name"], "pass": True}
                for c in report["checks"]
            )

        check(f"Official AI Hub harness: {players} players / {scenario}", harness)
        context.close()


def visual_tests(browser, url):
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = open_game(context, url + "&renderer=webgl")
    if snap(page)["mode"] == "attract":
        page.keyboard.press("x")
    page.evaluate("window.__game.titleIdle(-1000)")
    page.wait_for_timeout(1200)
    page.screenshot(path=str(DEV / "tests/title.png"))
    setup_play(page)
    page.wait_for_timeout(1500)
    page.screenshot(path=str(DEV / "tests/gameplay.png"))
    page.evaluate("window.__game.pause()")
    page.locator("[data-action=dev]:visible").evaluate("e=>e.click()")
    page.screenshot(path=str(DEV / "tests/garage.png"))
    context.close()
    context = browser.new_context(
        viewport={"width": 412, "height": 915},
        device_scale_factor=1,
        is_mobile=True,
        has_touch=True,
    )
    page = open_game(context, url + "&renderer=webgl")
    page.screenshot(path=str(DEV / "tests/phone-title.png"))
    setup_play(page)
    page.wait_for_timeout(2000)
    page.screenshot(path=str(DEV / "tests/phone-gameplay.png"))
    context.close()
    RESULTS.append(
        {"name": "Visual review captures generated with WebGL2 fallback", "pass": True}
    )


def main():
    runtime = DEV / "tests" / ".runtime"
    runtime.mkdir(exist_ok=True)
    os.environ["TMPDIR"] = str(runtime)
    server = subprocess.Popen(
        [sys.executable, "-u", "-m", "http.server", "0", "--bind", "127.0.0.1"],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    )
    try:
        assert server.stdout is not None
        line = server.stdout.readline()
        match = re.search(r"port (\d+)", line)
        if match is None:
            raise RuntimeError("loopback server failed to bind: " + line)
        base_url = "http://127.0.0.1:" + match.group(1)
        url = base_url + "/" + DEV.name + ".html?test=1"
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, args=FLAGS)
            context = browser.new_context(viewport={"width": 1200, "height": 750})
            page = open_game(context, url)
            gameplay_tests(page)
            context.close()
            touch_tests(browser, url, pw)
            if not UI_ONLY:
                link_tests(browser, url)
                harness_tests(browser, base_url)

            def file_package():
                context = browser.new_context(viewport={"width": 900, "height": 600})
                page = open_game(
                    context, (ROOT / (DEV.name + ".html")).as_uri() + "?test=1"
                )
                expect(snap(page)["state"] == "title", "file:// did not open title")
                context.close()

            if not UI_ONLY:
                check("Single-file package boots directly from file://", file_package)
            if VISUAL:
                visual_tests(browser, url)
            browser.close()
        check(
            "No uncaught browser exceptions",
            lambda: expect(not ERRORS, json.dumps(ERRORS[:8])),
        )
        check(
            "Exit interview parses and has all required fields",
            lambda: expect(
                all(
                    v != ""
                    for v in json.loads((ROOT / "exit-interview.json").read_text())[
                        "sourceInformation"
                    ].values()
                ),
                "empty source field",
            ),
        )
    except Exception as exc:  # noqa: BLE001 - report runner failures and close owned resources.
        check("Test runner completes", lambda error=exc: (_ for _ in ()).throw(error))
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
            server.wait()
        report = {
            "checks": RESULTS,
            "notes": NOTES,
            "errors": ERRORS,
            "date": "2026-11-05",
        }
        (DEV / ("tests/ui-report.json" if UI_ONLY else "tests/report.json")).write_text(
            json.dumps(report, indent=2)
        )
        failed = sum(not r["pass"] for r in RESULTS)
        print(
            f"{len(RESULTS)} checks · {len(RESULTS) - failed} passed · {failed} failed",
            flush=True,
        )
        sys.exit(bool(failed))


if __name__ == "__main__":
    main()
