import functools
import http.server
import json
import pathlib
import shutil
import sys
import threading
import time
import traceback

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
IDENTITY = json.loads((ROOT / "identity.json").read_text())
ARTIFACT = ROOT.parent / (IDENTITY["stem"] + ".html")
OUT = ROOT / "artifacts"
RESULTS = []
SUITE = sys.argv[1] if len(sys.argv) > 1 else "all"


def check(name, fn):
    try:
        fn()
        RESULTS.append({"name": name, "pass": True})
    except Exception:  # noqa: BLE001 - The coordinator records every failure, then continues.
        RESULTS.append({"name": name, "pass": False, "detail": traceback.format_exc()})


def require(value, detail="Assertion failed"):
    if not value:
        raise AssertionError(detail)


def advance(page, seconds=0.1):
    page.evaluate("(s) => __game.game.advance(s,{draw:true})", seconds)


def snap(page):
    return page.evaluate("__game.debug.snapshot()")


def key(page, name):
    page.keyboard.down(name)
    advance(page, 0.025)
    page.keyboard.up(name)
    advance(page, 0.025)


def title(page):
    page.evaluate("__game.debug.toTitle()")
    advance(page, 0.5)
    page.evaluate("__game.activity()")
    require(snap(page)["scene"] == "title")


def native_click(page, menu, index):
    point = page.evaluate(
        """([name,i])=>{const a=__game,box=a.debug.menus[name].rowAt(i),s=a.game.screen,r=s.canvas.getBoundingClientRect();return {x:r.left+(s.OX+(box[0]+box[2]/2)*s.S)/s.dpr,y:r.top+(s.OY+(box[1]+box[3]/2)*s.S)/s.dpr};}""",
        [menu, index],
    )
    page.mouse.move(point["x"], point["y"])
    advance(page, 0.025)
    page.mouse.click(point["x"], point["y"])
    advance(page, 0.4)


def native_tap(page, menu, index):
    point = page.evaluate(
        """([name,i])=>{const a=__game,box=a.debug.menus[name].rowAt(i),s=a.game.screen,r=s.canvas.getBoundingClientRect();return [r.left+(s.OX+(box[0]+box[2]/2)*s.S)/s.dpr,r.top+(s.OY+(box[1]+box[3]/2)*s.S)/s.dpr];}""",
        [menu, index],
    )
    page.touchscreen.tap(*point)
    advance(page, 0.4)


def button(page, name):
    page.get_by_role("button", name=name, exact=True).first.click()
    advance(page, 0.05)


PAD_INIT = """window.__pads=[];window.makePad=(i)=>({id:'Virtual DualSense '+i,index:i,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0})),timestamp:0});Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.__pads});"""


def pad(page, index, button_index=None, pressed=False, axes=None):
    page.evaluate(
        """([index,b,on,axes])=>{if(!__pads[index])__pads[index]=makePad(index);if(b!==null)__pads[index].buttons[b]={pressed:on,touched:on,value:on?1:0};if(axes)__pads[index].axes=axes;__pads[index].timestamp++;}""",
        [index, button_index, pressed, axes],
    )
    advance(page, 0.04)


def pad_press(page, index, button_index):
    pad(page, index, button_index, True)
    pad(page, index, button_index, False)


def standalone(browser, p):
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    context.add_init_script(PAD_INIT)
    page = context.new_page()
    errors, console_errors, external = [], [], []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on(
        "console",
        lambda m: console_errors.append(m.text) if m.type == "error" else None,
    )
    page.on(
        "request",
        lambda r: external.append(r.url) if r.url.startswith("http") else None,
    )
    page.goto(ARTIFACT.as_uri(), wait_until="load")
    page.wait_for_function(
        "window.__game && __game.game.sceneName==='title'", timeout=15000
    )
    page.evaluate("__game.game.stop()")
    check(
        "Final file: self-contained native boot",
        lambda: (
            require(not errors, str(errors)),
            require(not external, str(external)),
            require(snap(page)["title"] == IDENTITY["title"]),
            require(page.evaluate("My3D2dge.version") == "0.89.1"),
        ),
    )
    check(
        "Final file: locked audio and first-run 10% music",
        lambda: (
            require(page.evaluate("__game.game.audio.ctx===null")),
            require(page.evaluate("__game.game.settings.music") == 0.1),
        ),
    )
    page.screenshot(path=str(OUT / "title-1920.png"))

    def keyboard_journey():
        key(page, "Enter")
        advance(page, 0.5)
        require(snap(page)["scene"] == "play", str(snap(page)))
        advance(page, 4)
        x = snap(page)["players"][0]["x"]
        page.keyboard.down("d")
        advance(page, 0.4)
        page.keyboard.up("d")
        require(snap(page)["players"][0]["x"] > x + 50)
        page.mouse.move(1370, 320)
        advance(page, 0.25)
        page.mouse.down()
        advance(page, 0.32)
        page.mouse.up()
        require(snap(page)["world"]["metrics"]["shots"] >= 1)
        require(snap(page)["players"][0]["shield"] > 1)
        before = snap(page)["world"]["t"]
        key(page, "Escape")
        require(snap(page)["paused"])
        require(snap(page)["shell"] == "pause")
        advance(page, 1)
        require(abs(snap(page)["world"]["t"] - before) < 0.1)
        button(page, "Resume")
        require(not snap(page)["paused"])

    check(
        "Keyboard/mouse: start, steer, world aim, fire, shield, pause/resume",
        keyboard_journey,
    )

    def settings():
        title(page)
        native_click(page, "title", 3)
        require(snap(page)["shell"] == "settings")
        require(page.get_by_text("Music", exact=True).count() > 0)
        page.evaluate(
            "__game.game.settings.set('music',.27);__game.game.settings.set('motion',true);__game.game.settings.set('shake',0);__game.game.settings.set('flashes',0)"
        )
        require(page.evaluate("__game.game.audio.musicVolume") == 0.27)
        require(page.evaluate("__game.game.reduceMotion"))
        page.evaluate("__game.ui.hide()")
        advance(page, 0.1)
        native_click(page, "title", 4)
        require(snap(page)["shell"] == "about")
        for name in [
            "Source Information",
            "Testing Feedback",
            "Engine Feedback",
            "Prompt Feedback",
        ]:
            button(page, name)
            require(page.locator(".esh").inner_text().strip())
            button(page, "Next page" if name == "Source Information" else "Next answer")
            if name == "Source Information":
                page.screenshot(path=str(OUT / "credits-1920.png"))
            button(page, "Back")
        button(page, "Back")
        page.evaluate("__game.ui.hide()")

    check("Native settings, accessibility and all four credits sections", settings)

    def rebind():
        title(page)
        page.evaluate('__game.game.menu("controls")')
        advance(page, 0.1)
        require(snap(page)["shell"] == "controls")
        page.get_by_role(
            "button", name=__import__("re").compile("^Fire, keyboard:")
        ).click()
        page.keyboard.press("q")
        advance(page, 0.1)
        require(page.evaluate("__game.game.input.bindings.fire.keys.includes('KeyQ')"))
        button(page, "Restore defaults")
        require(page.evaluate("__game.game.input.map.fire.includes('Space')"))
        page.evaluate("__game.ui.hide()")

    check("Native Controls: real key rebinding and restore defaults", rebind)

    def dev():
        title(page)
        native_click(page, "title", 0)
        advance(page, 4)
        key(page, "Escape")
        button(page, "Dev Mode")
        require(snap(page)["world"]["debug"])
        button(page, "Pilot & cannon sliders")
        require(page.get_by_role("slider").count() == 7)
        page.evaluate("__game.game.settings.set('lab_speed',300)")
        require(page.evaluate("__game.world.balance.speed") == 300)
        button(page, "Reset this page")
        require(page.evaluate("__game.world.balance.speed") == 230)
        button(page, "Back")
        button(page, "Encounter & timeline")
        button(page, "Next encounter")
        button(page, "Jump to selected encounter")
        require(snap(page)["world"]["wave"] == 1)
        button(page, "Scrub current timeline")
        page.evaluate("__game.game.settings.set('lab_timeline',15)")
        require(snap(page)["world"]["enemies"] > 0)
        button(page, "Single step")
        button(page, "Back")
        button(page, "Back")
        button(page, "Content JSON editor")
        require(page.locator("#content-json").count() == 1)
        original = page.locator("#content-json").input_value()
        page.locator("#content-json").fill("{invalid")
        button(page, "Validate & apply")
        require(page.evaluate("__game.world.exportContent()") == original)
        page.locator("#content-json").fill(original)
        button(page, "Validate & apply")
        page.evaluate("__game.ui.hide()")
        advance(page, 0.2)
        require(not snap(page)["errors"], str(snap(page)["errors"]))

    check(
        "Dev tools: live sliders, resets, encounter picker, scrub/step and validated editor",
        dev,
    )

    def controller():
        title(page)
        pad(page, 0, axes=[0, 0.8, 0, 0])
        pad(page, 0, axes=[0, 0, 0, 0])
        require(snap(page)["controls"]["lastDevice"] == "gamepad")
        require(snap(page)["controls"]["label"] == "✕", str(snap(page)["controls"]))
        page.evaluate("__game.game.settings.set('glyphs','xbox')")
        require(snap(page)["controls"]["label"] == "A")
        page.evaluate(
            "__game.game.settings.set('glyphs','playstation');__game.debug.menus.title.i=0"
        )
        pad_press(page, 0, 0)
        advance(page, 0.5)
        require(snap(page)["scene"] == "play")
        advance(page, 4)
        pad(page, 0, axes=[0.8, 0, 0, -0.8])
        advance(page, 0.3)
        pad(page, 0, 7, True)
        advance(page, 0.4)
        pad(page, 0, 7, False)
        require(snap(page)["world"]["metrics"]["shots"] > 0)
        pad(page, 0, axes=[0, 0, 0, 0])
        pad_press(page, 0, 9)
        require(snap(page)["paused"])
        pad_press(page, 0, 0)
        require(not snap(page)["paused"])
        pad_press(page, 0, 9)
        button(page, "Dev Mode")
        pad(page, 0, axes=[0, 0.8, 0, 0])
        pad(page, 0, axes=[0, 0, 0, 0])
        require(page.evaluate("document.activeElement?.tagName==='BUTTON'"))
        page.evaluate("__game.ui.hide()")
        # Disconnect pauses the local game; reconnect keeps pad ownership.
        page.evaluate("__pads[0].connected=false")
        advance(page, 0.1)
        require(snap(page)["paused"])
        page.evaluate("__pads[0].connected=true")
        advance(page, 0.1)
        button(page, "Resume")
        page.mouse.move(100, 100)
        advance(page, 0.1)
        require(snap(page)["controls"]["lastDevice"] in ["mouse", "keyboard"])

    check(
        "Controller: glyphs, menu/world controls, pause, Dev navigation, disconnect/reconnect",
        controller,
    )

    def coop():
        title(page)
        native_click(page, "title", 2)
        native_click(page, "pairing", 0)
        pad_press(page, 0, 0)
        require(page.evaluate("__game.paired"))
        native_click(page, "join", 0)
        require(snap(page)["scene"] == "play")
        require(len(snap(page)["players"]) == 2)
        advance(page, 4)
        p0, p1 = snap(page)["players"]
        pad(page, 0, axes=[1, 0, 0, 0])
        advance(page, 0.4)
        pad(page, 0, axes=[0, 0, 0, 0])
        q0, q1 = snap(page)["players"]
        require(q1["x"] > p1["x"] + 40)
        require(abs(q0["x"] - p0["x"]) < 1)
        page.keyboard.down("a")
        advance(page, 0.3)
        page.keyboard.up("a")
        require(snap(page)["players"][0]["x"] < q0["x"] - 30)
        page.evaluate(
            """()=>{const w=__game.world;w.state.enemies=[];w.state.shots=[];w.state.waveTime=-100;const [a,b]=w.state.players;a.shield=0;a.x=400;a.y=350;b.x=430;b.y=350;b.down=true;b.hull=0;b.wreck=1;}"""
        )
        advance(page, 0.02)
        require(snap(page)["world"]["metrics"]["rescues"] == 1)
        require(not snap(page)["players"][1]["down"])
        page.evaluate(
            "for(const p of __game.world.state.players){p.down=true;p.hull=0;}"
        )
        advance(page, 2.7)
        require(snap(page)["scene"] == "results")
        require(snap(page)["world"]["status"] == "defeat")
        # Name wheel, including six controller characters and keyboard typing.
        page.evaluate(
            '__game.world.state.debug=false;__game.world.state.score=1234;__game.game.go("results",null,{fade:0})'
        )
        advance(page, 0.1)
        native_click(page, "results", 0)
        require(snap(page)["scene"] == "name")
        for char in "COSMIC":
            key(page, char)
        require(not page.evaluate("__game.entryActive"))
        native_click(page, "name", 0)
        require(snap(page)["records"]["mission"]["name"] == "COSMIC")
        require(snap(page)["records"]["mission"]["score"] == 1234)

    check(
        "Couch co-op: explicit devices, isolation, rescue, defeat and six-letter entry",
        coop,
    )

    def pad_name():
        # Keyboard owns P1; the paired controller still gets a full six-column wheel.
        page.evaluate('__game.debug.begin("score",2,{keepPair:true});')
        advance(page, 0.4)
        page.evaluate(
            '__game.world.state.score=2234;__game.world.state.status="defeat";__game.game.go("results",null,{fade:0})'
        )
        advance(page, 0.1)
        native_click(page, "results", 0)
        require(snap(page)["scene"] == "name")
        pad_press(page, 0, 12)
        for _ in range(6):
            pad_press(page, 0, 0)
        require(not page.evaluate("__game.entryActive"))
        pad_press(page, 0, 0)
        advance(page, 0.4)
        require(snap(page)["scene"] == "results")
        require(snap(page)["records"]["score"]["score"] == 2234)
        require(snap(page)["records"]["score"]["name"] != "COSMIC")

    check(
        "Controller name entry: joining pad edits all six columns and saves team record",
        pad_name,
    )

    def two_pads():
        title(page)
        native_click(page, "title", 2)
        native_click(page, "pairing", 1)
        pad_press(page, 0, 0)
        pad_press(page, 1, 0)
        require(page.evaluate("__game.paired"))
        native_click(page, "join", 0)
        advance(page, 4)
        require(len(snap(page)["players"]) == 2)
        x = snap(page)["players"][1]["x"]
        pad(page, 0, axes=[-1, 0, 0, 0])
        advance(page, 0.3)
        pad(page, 0, axes=[0, 0, 0, 0])
        require(abs(snap(page)["players"][1]["x"] - x) < 1)
        pad(page, 1, axes=[1, 0, 0, 0])
        advance(page, 0.3)
        pad(page, 1, axes=[0, 0, 0, 0])
        require(snap(page)["players"][1]["x"] > x + 30)
        ownership = page.evaluate("__game.game.players.map(p=>p.pad)")
        page.evaluate("__game.resetSeed(1981)")
        advance(page, 0.4)
        require(page.evaluate("__game.game.players.map(p=>p.pad)") == ownership)
        require(page.evaluate("__game.game.players.length") == 2)

    check("Couch co-op: two independent standard pads", two_pads)

    def attract_check():
        title(page)
        page.evaluate("__pads=[]")
        advance(page, 9.8)
        require(not snap(page)["attract"])
        advance(page, 0.3)
        require(snap(page)["attract"])
        advance(page, 83)
        require(snap(page)["attract"])
        require(snap(page)["attractTime"] < 5)
        before = snap(page)["records"]
        for category in [
            "key",
            "mouse",
            "wheel",
            "movement",
            "pad_button",
            "pad_stick",
        ]:
            page.evaluate("__game.debug.startAttract()")
            advance(page, 0.4)
            if category == "key":
                key(page, "Enter")
            elif category == "mouse":
                page.mouse.click(190, 230)
            elif category == "wheel":
                page.mouse.wheel(0, 80)
            elif category == "movement":
                page.mouse.move(700 + len(RESULTS), 500)
            elif category == "pad_button":
                pad(page, 0, 0, True)
            else:
                pad(page, 0, axes=[0.7, 0, 0, 0])
            advance(page, 0.5)
            require(snap(page)["scene"] == "title", category + str(snap(page)))
            require(not snap(page)["attract"])
            if category == "pad_button":
                pad(page, 0, 0, False)
            if category == "pad_stick":
                pad(page, 0, axes=[0, 0, 0, 0])
            require(snap(page)["records"] == before)
        page.evaluate("__pads=[]")

    check(
        "Attract: exact idle threshold, 82-second loop, isolated records, raw cancellation",
        attract_check,
    )

    def visual_frames():
        title(page)
        page.evaluate('__game.debug.begin("mission")')
        advance(page, 0.5)
        page.evaluate('__game.world.command("phase",{phase:2})')
        advance(page, 5)
        page.evaluate(
            '__game.world.command("spawn",{formation:"diamonds",kind:"drifter",x:480,y:340})'
        )
        advance(page, 0.15)
        page.screenshot(path=str(OUT / "boss-1920.png"))
        page.evaluate(
            """()=>{const w=__game.world;w.state.boss=null;w.state.enemies=[];w.state.shots=[];const e=w.formation({formation:'diamonds',kind:'drifter',x:480,y:260,instant:true,merge:false,speed:0});w.kill(e[0],0);__game.flushEvents();}"""
        )
        advance(page, 0.3)
        page.screenshot(path=str(OUT / "cascade-1920.png"))
        require(not snap(page)["errors"], str(snap(page)["errors"]))

    check(
        "Visual fixtures: dense boss and cascade render without native draw faults",
        visual_frames,
    )

    def exported_mission():
        title(page)
        page.evaluate(
            '__pads=[];__game.debug.begin("mission",1,{debug:true});__game.debug.bot=true'
        )
        advance(page, 0.4)
        report = page.evaluate(
            """()=>{const a=__game;let steps=0;const milestones=[];let wave=-1;while(a.game.sceneName!=='results'&&steps<180){a.game.advance(5,{draw:true});steps++;if(a.world&&a.world.state.wave!==wave){wave=a.world.state.wave;milestones.push({wave,t:a.world.state.t});}}a.debug.bot=false;return {snapshot:a.debug.snapshot(),milestones};}"""
        )
        (OUT / "exported-mission-playthrough.json").write_text(
            json.dumps(report, indent=2)
        )
        state = report["snapshot"]
        require(state["scene"] == "results", str(state))
        require(state["world"]["status"] == "victory", str(state))
        require(state["world"]["metrics"]["phases"] == 3)
        require(
            all(
                state["world"]["metrics"][k] > 0
                for k in ["shots", "rams", "fusions", "gunships", "cascades"]
            )
        )
        require(not state["errors"], str(state["errors"]))
        page.screenshot(path=str(OUT / "victory-1920.png"))
        native_click(page, "results", 0)
        require(snap(page)["scene"] == "play")

    check(
        "Exact exported HTML: legal-input whole mission, all phases, victory and replay",
        exported_mission,
    )

    try:
        for item in page.evaluate("async()=>await __game.debug.verifyAudio()"):
            # Audio helper uses the same result schema as the coordinator.
            RESULTS.append(
                {
                    "name": "Audio / " + item["name"],
                    "pass": bool(item["pass"]),
                    "detail": item.get("detail", ""),
                }
            )
    except Exception:  # noqa: BLE001 - Offline checks must report failures without ending other suites.
        RESULTS.append(
            {
                "name": "Offline audio coordinator",
                "pass": False,
                "detail": traceback.format_exc(),
            }
        )
    check(
        "Final file: no uncaught or console errors",
        lambda: (
            require(not errors, str(errors)),
            require(not console_errors, str(console_errors)),
        ),
    )
    (OUT / "browser-console.json").write_text(
        json.dumps(
            {"errors": errors, "consoleErrors": console_errors, "external": external},
            indent=2,
        )
    )

    def persisted():
        page.reload()
        page.wait_for_function("window.__game&&__game.game.sceneName==='title'")
        page.evaluate("__game.game.stop()")
        require(abs(page.evaluate("__game.game.settings.music") - 0.27) < 0.001)
        require(page.evaluate("__game.records.get().mission.name") == "COSMIC")
        require(page.evaluate("__game.records.get().mission.score") == 1234)

    check("Persistence: saved music and six-letter record survive reload", persisted)
    context.close()

    isolated = OUT / "isolated"
    isolated.mkdir(exist_ok=True)
    shutil.copyfile(ARTIFACT, isolated / "only.html")
    ctx = browser.new_context(viewport={"width": 1280, "height": 720})
    isolated_page = ctx.new_page()
    isolated_errors = []
    requests = []
    isolated_page.on("pageerror", lambda e: isolated_errors.append(str(e)))
    isolated_page.on("request", lambda r: requests.append(r.url))

    def isolated_file():
        target = (isolated / "only.html").as_uri()
        isolated_page.goto(target)
        isolated_page.wait_for_function(
            "window.__game&&__game.game.sceneName==='title'"
        )
        isolated_page.evaluate("__game.game.stop()")
        key(isolated_page, "Enter")
        advance(isolated_page, 4.5)
        require(snap(isolated_page)["scene"] == "play")
        require(not isolated_errors, str(isolated_errors))
        require(all(url == target for url in requests), str(requests))
        require([f.name for f in isolated.iterdir()] == ["only.html"])

    check("Copied single HTML: runs without sibling assets or requests", isolated_file)
    ctx.close()

    ctx = browser.new_context(viewport={"width": 1280, "height": 720})
    ctx.add_init_script(
        "Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('denied','SecurityError');}})"
    )
    denied_page = ctx.new_page()

    def denied_storage():
        denied_page.goto(ARTIFACT.as_uri())
        denied_page.wait_for_function("window.__game&&__game.game.sceneName==='title'")
        denied_page.evaluate("__game.game.stop()")
        key(denied_page, "Enter")
        advance(denied_page, 4.5)
        require(snap(denied_page)["scene"] == "play")
        require(denied_page.evaluate("__game.records.commit('mission',33,'DENIED')"))
        require(not denied_page.evaluate("__game.records.saved"))
        denied_page.evaluate("__game.game.settings.set('music',.6)")
        require(denied_page.evaluate("__game.game.settings.music") == 0.6)
        require(not snap(denied_page)["errors"])

    check(
        "Blocked browser storage: play, settings and in-memory records remain usable",
        denied_storage,
    )
    ctx.close()

    for profile in ["iPhone 13", "iPad (gen 7)"]:
        context = browser.new_context(**p.devices[profile])
        page = context.new_page()
        page.goto(ARTIFACT.as_uri())
        page.wait_for_function("window.__game&&__game.game.sceneName==='title'")
        page.evaluate("__game.game.stop()")

        def touch_journey(page=page, context=context, profile=profile):
            # Use real touchscreen menu taps, then CDP multi-contact movement/aim.
            box = page.evaluate(
                """()=>{const a=__game,b=a.debug.menus.title.rowAt(0),s=a.game.screen,r=s.canvas.getBoundingClientRect();return [r.left+(s.OX+(b[0]+b[2]/2)*s.S)/s.dpr,r.top+(s.OY+(b[1]+b[3]/2)*s.S)/s.dpr];}"""
            )
            page.touchscreen.tap(*box)
            advance(page, 0.5)
            require(snap(page)["scene"] == "play")
            advance(page, 4)
            size = page.viewport_size
            left = {
                "x": int(size["width"] * 0.22),
                "y": int(size["height"] * 0.76),
                "id": 1,
            }
            right = {
                "x": int(size["width"] * 0.78),
                "y": int(size["height"] * 0.76),
                "id": 2,
            }
            client = context.new_cdp_session(page)
            client.send(
                "Input.dispatchTouchEvent",
                {"type": "touchStart", "touchPoints": [left, right]},
            )
            left["x"] += 40
            right["y"] -= 38
            client.send(
                "Input.dispatchTouchEvent",
                {"type": "touchMove", "touchPoints": [left, right]},
            )
            advance(page, 0.4)
            require(snap(page)["controls"]["touches"] == 2, str(snap(page)))
            require(snap(page)["controls"]["touch"])
            require(snap(page)["controls"]["lastDevice"] == "touch")
            client.send(
                "Input.dispatchTouchEvent", {"type": "touchCancel", "touchPoints": []}
            )
            advance(page, 0.05)
            require(snap(page)["controls"]["touches"] == 0)
            require(page.locator("#rescue-action").is_hidden())
            require(not snap(page)["errors"])
            page.screenshot(
                path=str(
                    OUT
                    / (
                        "touch-phone.png"
                        if profile == "iPhone 13"
                        else "touch-tablet.png"
                    )
                )
            )
            page.evaluate(
                '__game.world.state.score=987;__game.world.state.debug=false;__game.game.go("results",null,{fade:0})'
            )
            advance(page, 0.1)
            native_tap(page, "results", 0)
            require(snap(page)["scene"] == "name")
            # Tap a real wheel arrow, then save while the entry remains active.
            point = page.evaluate(
                """()=>{const a=__game,s=a.game.screen,r=s.canvas.getBoundingClientRect(),x=a.game.W/2-126+19,y=132;return [r.left+(s.OX+x*s.S)/s.dpr,r.top+(s.OY+y*s.S)/s.dpr];}"""
            )
            page.touchscreen.tap(*point)
            advance(page, 0.05)
            native_tap(page, "name", 0)
            require(snap(page)["scene"] == "results")
            require(snap(page)["records"]["mission"]["score"] == 987)
            page.evaluate("__game.debug.startAttract()")
            advance(page, 0.4)
            page.touchscreen.tap(int(size["width"] / 2), int(size["height"] / 2))
            advance(page, 0.4)
            require(snap(page)["scene"] == "title")
            client.detach()

        check(
            "Touch / "
            + profile
            + ": menu, twin contacts, cancel, safe UI and attract exit",
            touch_journey,
        )
        context.close()


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:
        pass


def hub_tests(browser):
    stage = OUT / "hub-stage"
    stage.mkdir(exist_ok=True)
    for name in ["harness.html", "bridge.js", "round.js"]:
        shutil.copyfile(ROOT / "vendor/hub" / name, stage / name)
    shutil.copyfile(ARTIFACT, stage / "game.html")
    handler = functools.partial(QuietHandler, directory=str(stage))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = "http://127.0.0.1:" + str(server.server_address[1])
    try:
        scenarios = [
            ("one player", "players=1"),
            ("two players", "players=2"),
            ("adverse network", "players=2&latency=150&jitter=50&loss=5"),
            ("host leave", "players=2&scenario=host-leave"),
            ("server host", "players=2&scenario=server"),
        ]
        for label, params in [] if SUITE == "gameplay" else scenarios:
            context = browser.new_context(viewport={"width": 1280, "height": 900})
            page = context.new_page()

            def official(page=page, params=params, label=label):
                page.goto(
                    base
                    + "/harness.html?game=game.html&auto=1&limit=8&seed=1981&"
                    + params
                )
                page.wait_for_function(
                    "document.body.dataset.complete==='true'", timeout=60000
                )
                report = page.evaluate("window.__hubCheck")
                (OUT / ("hub-" + label.replace(" ", "-") + ".json")).write_text(
                    json.dumps(report, indent=2)
                )
                require(
                    report.get("pass"),
                    json.dumps(
                        [x for x in report.get("checks", []) if not x.get("pass")],
                        indent=2,
                    ),
                )
                game_frames = [f for f in page.frames if "/game.html" in f.url]
                require(game_frames, "No game frames")
                for frame in game_frames:
                    require(frame.title() == IDENTITY["title"])
                    state = frame.evaluate("__game.debug.snapshot()")
                    require(not state["errors"], str(state["errors"]))
                    require(state["hub"]["state"] == "ended")
                    before = frame.evaluate("__game.hub.diagnostics()")
                    frame.evaluate("__game.game.advance(1)")
                    after = frame.evaluate("__game.hub.diagnostics()")
                    require(before["sent"] == after["sent"], "Traffic after end")
                    require(frame.evaluate("__game.audio.debug().stopped"))

            check("Official Hub harness / " + label, official)
            context.close()
        network_gameplay(browser, base)
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)


def network_gameplay(browser, base):
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()
    evidence = {}
    frames = []

    def shared_gameplay():
        page.goto(
            base
            + "/harness.html?game=game.html&players=2&limit=120&seed=1981&latency=150&jitter=50&loss=5"
        )
        page.wait_for_function(
            """()=>{const frames=[...document.querySelectorAll('iframe')];return frames.length===2&&frames.every(f=>f.contentWindow?.__game?.hub?.diagnostics().ready&&f.contentWindow.__game.game.sceneName==='play');}""",
            timeout=20000,
        )
        frames.extend([f for f in page.frames if "/game.html" in f.url])
        for f in frames:
            f.wait_for_function("window.__game?.hub?.active")
            require(f.title() == IDENTITY["title"])
        host = next(f for f in frames if f.evaluate("AIHub.isHost"))
        remote = next(f for f in frames if not f.evaluate("AIHub.isHost"))
        require(remote.evaluate("AIHub.me") == 1)
        page.locator("iframe").nth(0).evaluate(
            "f=>{f.style.width='1000px';f.style.height='620px';}"
        )
        page.locator("iframe").nth(1).evaluate(
            "f=>{f.style.width='420px';f.style.height='720px';}"
        )
        page.locator("#release").click()
        page.wait_for_timeout(200)
        require(
            all(f.evaluate("__game.world.state.t===0") for f in frames),
            "Countdown advanced mission time",
        )
        host.wait_for_function("__game.hub.running", timeout=15000)
        require(
            all(f.evaluate("__game.game.audio.ctx===null") for f in frames),
            "Gesture required for readiness",
        )
        host.evaluate(
            """()=>{const w=__game.world;w.state.transition=0;w.state.waveTime=-100;w.state.enemies=[];w.state.shots=[];w.state.boss=null;for(const [i,p]of w.state.players.entries()){p.x=420+i*130;p.y=350;p.vx=p.vy=0;p.invuln=0;p.shield=0;}}"""
        )
        page.wait_for_timeout(500)
        x = host.evaluate("__game.world.state.players[1].x")
        remote.evaluate('__game.game.input.hold("right")')
        page.wait_for_timeout(650)
        remote.evaluate('__game.game.input.hold("right",false)')
        host.wait_for_function(
            "(x)=>__game.world.state.players[1].x>x+40", arg=x, timeout=5000
        )
        page.wait_for_timeout(700)
        bounds = host.evaluate("__game.world.state.players.map(p=>[p.x,p.y])")
        require(420 <= bounds[0][0] <= 421, "Remote input steered host pilot")

        # The second seat points with its own local inverse projection, before and after resize.
        def aim_at(x, y):
            remote.evaluate(
                """([x,y])=>{const a=__game,r=a.game.r,s=a.game.screen,p=r.w(x,y,0),rc=s.canvas.getBoundingClientRect(),cx=rc.left+(s.OX+p[0]*s.S)/s.dpr,cy=rc.top+(s.OY+p[1]*s.S)/s.dpr;s.canvas.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:cx,clientY:cy}));}""",
                [x, y],
            )
            page.wait_for_timeout(450)
            values = host.evaluate(
                """()=>{const p=__game.world.state.players[1];return {actual:p.requested,expected:Math.atan2(180-p.y,750-p.x)};}"""
            )
            require(
                abs(
                    __import__("math").atan2(
                        __import__("math").sin(values["actual"] - values["expected"]),
                        __import__("math").cos(values["actual"] - values["expected"]),
                    )
                )
                < 0.03,
                str(values),
            )

        aim_at(750, 180)
        page.locator("iframe").nth(1).evaluate(
            "f=>{f.style.width='820px';f.style.height='390px';}"
        )
        page.wait_for_timeout(300)
        aim_at(750, 180)
        # Hub chord is reserved, and overlays send neutral input while the shared clock runs.
        remote.evaluate(PAD_INIT)
        remote.evaluate(
            "__pads=[makePad(0)];__pads[0].buttons[8]={pressed:true,value:1};__pads[0].buttons[9]={pressed:true,value:1}"
        )
        page.wait_for_timeout(150)
        require(
            not remote.evaluate("__game.game.paused"), "Create+Options opened game menu"
        )
        remote.evaluate(
            "__pads[0].buttons[8]={pressed:false,value:0};__pads[0].buttons[9]={pressed:false,value:0}"
        )
        page.wait_for_timeout(80)
        remote.evaluate("__pads[0].buttons[9]={pressed:true,value:1}")
        page.wait_for_timeout(120)
        remote.evaluate("__pads[0].buttons[9]={pressed:false,value:0}")
        require(remote.evaluate("__game.game.paused"))
        before = host.evaluate("__game.world.state.t")
        page.wait_for_timeout(400)
        require(host.evaluate("__game.world.state.t") > before)
        require(
            remote.evaluate(
                '(()=>{try{__game.debug.command("clear");return false;}catch{return true;}})()'
            )
        )
        remote.evaluate("__game.ui.hide();__pads=[];__game.controls.clear()")
        # Real shield-rescue contact on authority must be visible to both copies.
        host.evaluate(
            """()=>{const w=__game.world;w.state.enemies=[];w.state.shots=[];w.state.waveTime=-100;const [a,b]=w.state.players;a.x=400;a.y=350;a.shield=0;a.vx=a.vy=0;b.x=430;b.y=350;b.down=true;b.hull=0;b.wreck=1;}"""
        )
        remote.wait_for_function("__game.world.state.metrics.rescues===1", timeout=6000)
        require(
            remote.evaluate(
                "__game.world.state.players[1].hull===1&&!__game.world.state.players[1].down"
            )
        )
        host.evaluate(
            """()=>{const [a,b]=__game.world.state.players;a.x=400;a.y=350;a.down=true;a.hull=0;a.wreck=1;b.x=510;b.y=350;b.shield=0;}"""
        )
        page.wait_for_timeout(350)
        remote.evaluate(
            """()=>{const c=__game.game.screen.canvas,r=c.getBoundingClientRect();c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:901,clientX:r.left+r.width*.2,clientY:r.top+r.height*.8}));}"""
        )
        remote.wait_for_function(
            '!document.getElementById("rescue-action").hidden', timeout=4000
        )
        remote.evaluate(
            """()=>{const c=__game.game.screen.canvas;c.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerType:'touch',pointerId:901}));__game.controls.clear();}"""
        )
        host.evaluate(
            "Object.assign(__game.world.state.players[0],{down:false,hull:3,shield:0})"
        )
        # Second seat fires through the protocol; a complete cascade is authority-owned.
        host.evaluate(
            """()=>{const w=__game.world;w.state.enemies=[];w.state.shots=[];w.state.blasts=[];w.state.chains=[];w.state.players[0].x=80;w.state.players[0].y=470;const p=w.state.players[1];Object.assign(p,{x:480,y:390,vx:0,vy:0,bearing:Math.PI*1.5,requested:Math.PI*1.5,shield:0,invuln:0,hull:3});w.formation({formation:'chain',kind:'drifter',x:480,y:190,instant:true,merge:false,speed:0});}"""
        )
        remote.wait_for_function(
            "__game.world.state.enemies.length===5&&Math.abs(__game.world.state.players[1].x-480)<.2",
            timeout=6000,
        )
        remote.evaluate(
            """()=>{const a=__game,s=a.game.screen,r=s.canvas.getBoundingClientRect(),q=a.game.r.w(480,190,0);s.canvas.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:r.left+(s.OX+q[0]*s.S)/s.dpr,clientY:r.top+(s.OY+q[1]*s.S)/s.dpr}));}"""
        )
        host.wait_for_function(
            """()=>{const p=__game.world.state.players[1];return Math.abs(Math.atan2(Math.sin(p.bearing+Math.PI/2),Math.cos(p.bearing+Math.PI/2)))<.02&&Math.abs(Math.atan2(Math.sin(p.requested+Math.PI/2),Math.cos(p.requested+Math.PI/2)))<.02;}""",
            timeout=6000,
        )
        before_shot = host.evaluate("__game.world.state.metrics.shots")
        remote.evaluate('__game.game.input.tap("fire")')
        host.wait_for_function(
            "(count)=>__game.world.state.metrics.shots>count",
            arg=before_shot,
            timeout=5000,
        )
        remote.wait_for_function("__game.world.state.bestChain>=5", timeout=8000)
        page.wait_for_timeout(450)
        require(
            host.evaluate("__game.world.state.score")
            == remote.evaluate("__game.world.state.score")
        )
        require(host.evaluate("__game.world.state.players[1].score") > 0)
        before = host.evaluate("__game.world.state.t")
        page.wait_for_timeout(400)
        require(host.evaluate("__game.world.state.t") > before)
        require(host.evaluate("__game.game.hitstop===0"))
        host.evaluate(
            """()=>{const w=__game.world;w.state.enemies=[];w.state.shots=[];w.formation({formation:'pair',kind:'drifter',x:480,y:140,instant:true,speed:0,forcedMerge:true});}"""
        )
        remote.wait_for_function("__game.world.state.metrics.fusions>0", timeout=12000)
        # Fast fixture uses low emitter hull; every phase is still opened and hit by legal remote cannon input.
        remote.evaluate("__game.controls.clear()")
        host.evaluate(
            """()=>{const w=__game.world;w.balance.bossHealth=1;w.command('phase',{phase:0});w.state.transition=0;for(const p of w.state.players){p.invuln=120;p.shield=0;}w.state.players[0].x=80;w.state.players[0].y=480;w.state.players[1].x=480;w.state.players[1].y=430;w.state.players[1].bearing=Math.PI*1.5;}"""
        )
        end = time.monotonic() + 65
        while time.monotonic() < end and not host.evaluate("__game.hub.ended"):
            target = host.evaluate(
                """()=>{const b=__game.world.state.boss;if(!b||b.dead)return null;const p=__game.world.state.players[1];return b.components.filter(c=>c.hp>0).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]||null;}"""
            )
            if target:
                remote.evaluate(
                    """([x,y])=>{const a=__game,s=a.game.screen,r=s.canvas.getBoundingClientRect(),q=a.game.r.w(x,y,0);s.canvas.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:r.left+(s.OX+q[0]*s.S)/s.dpr,clientY:r.top+(s.OY+q[1]*s.S)/s.dpr}));a.game.input.hold('fire');}""",
                    [target["x"], target["y"]],
                )
            page.wait_for_timeout(180)
        host.wait_for_function("__game.hub.ended", timeout=5000)
        remote.wait_for_function("__game.hub.ended", timeout=5000)
        evidence["host"] = host.evaluate("__game.debug.snapshot()")
        evidence["remote"] = remote.evaluate("__game.debug.snapshot()")
        require(evidence["host"]["world"]["status"] == "victory", str(evidence))
        require(evidence["remote"]["world"]["status"] == "victory")
        require(
            evidence["host"]["world"]["score"] == evidence["remote"]["world"]["score"]
        )
        require(evidence["host"]["world"]["metrics"]["phases"] == 3)
        require(evidence["host"]["hub"]["finalCount"] == 1)
        require(evidence["remote"]["hub"]["finalCount"] == 0)
        require(evidence["host"]["hub"]["maxBytes"] <= 16384)
        sent = [f.evaluate("__game.hub.diagnostics().sent") for f in frames]
        for f in frames:
            f.evaluate(
                '__game.game.input.hold("fire");__game.game.input.hold("pause");__game.game.advance(1)'
            )
            require(f.evaluate("__game.audio.debug().stopped"))
        require(sent == [f.evaluate("__game.hub.diagnostics().sent") for f in frames])

    check(
        "Two-page Hub gameplay / resize, seat-2 aim, rescue, cascade, fusion, phases and tied victory",
        shared_gameplay,
    )
    if not RESULTS[-1]["pass"]:
        for index, frame in enumerate(frames):
            try:
                evidence[f"failureFrame{index}"] = frame.evaluate(
                    "({summary:__game.debug.snapshot(),world:__game.world.snapshot(),input:{fire:__game.game.input.down('fire'),padAim:__game.game.input.padAim,mouseAim:__game.controls.mouseAim}})"
                )
            except Exception as error:  # noqa: BLE001 - Best-effort failure evidence cannot hide the original check.
                evidence[f"failureFrame{index}"] = str(error)
    (OUT / "hub-gameplay.json").write_text(json.dumps(evidence, indent=2))
    context.close()

    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()

    def leave():
        page.goto(
            base + "/harness.html?game=game.html&players=2&limit=60&latency=80&loss=5"
        )
        page.wait_for_function(
            """()=>{const frames=[...document.querySelectorAll('iframe')];return frames.length===2&&frames.every(f=>f.contentWindow?.__game?.hub?.diagnostics().ready&&f.contentWindow.__game.game.sceneName==='play');}""",
            timeout=20000,
        )
        fs = [f for f in page.frames if "/game.html" in f.url]
        for f in fs:
            f.wait_for_function("window.__game?.hub?.active")
        host = next(f for f in fs if f.evaluate("AIHub.isHost"))
        remote = next(f for f in fs if not f.evaluate("AIHub.isHost"))
        page.locator("#release").click()
        host.wait_for_function("__game.hub.running", timeout=15000)
        remote.evaluate('__game.game.input.hold("fire")')
        page.wait_for_timeout(400)
        page.locator("#who").select_option(index=1)
        page.locator("#remove").click()
        host.wait_for_function(
            "__game.hub.diagnostics().members.length===1", timeout=6000
        )
        require(host.evaluate("__game.world.state.players[1].active===false"))
        require(host.evaluate("__game.world.state.shots.every(b=>b.owner!==1)"))
        page.locator("#timeup").click()
        host.wait_for_function("__game.hub.ended", timeout=6000)
        require(host.evaluate("__game.hub.diagnostics().finalCount===1"))
        require(host.evaluate('__game.world.state.status==="defeat"'))

    check(
        "Two-page Hub gameplay / departing pilot clears intent, survivor continues, time-up loses",
        leave,
    )
    context.close()


def cross_browser(p):
    for name in ["firefox", "webkit"]:
        browser = getattr(p, name).launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        errors = []
        page.on("pageerror", lambda e, errors=errors: errors.append(str(e)))

        def smoke(page=page, errors=errors):
            page.goto(ARTIFACT.as_uri())
            page.wait_for_function(
                "window.__game&&__game.game.sceneName==='title'", timeout=15000
            )
            page.evaluate("__game.game.stop()")
            key(page, "Enter")
            advance(page, 4.5)
            require(snap(page)["scene"] == "play")
            require(not errors, str(errors))
            require(not snap(page)["errors"], str(snap(page)["errors"]))

        check(name + " / final standalone file smoke", smoke)
        browser.close()


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            if SUITE in ["all", "browser"]:
                standalone(browser, p)
            if SUITE in ["all", "harness", "gameplay"]:
                hub_tests(browser)
        finally:
            browser.close()
        if SUITE in ["all", "browser"]:
            cross_browser(p)


try:
    main()
except Exception:  # noqa: BLE001 - Final reporting must survive setup and browser launch failures.
    RESULTS.append(
        {
            "name": "Browser setup/runtime",
            "pass": False,
            "detail": traceback.format_exc(),
        }
    )
finally:
    (OUT / "browser-results.json").write_text(json.dumps(RESULTS, indent=2))
