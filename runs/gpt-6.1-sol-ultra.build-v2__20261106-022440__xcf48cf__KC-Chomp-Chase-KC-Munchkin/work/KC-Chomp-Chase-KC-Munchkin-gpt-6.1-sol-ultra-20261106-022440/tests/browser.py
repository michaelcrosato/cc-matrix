"""Final-artifact stand-in checks. One browser process at a time; no local server."""

import argparse
import json
import math
import pathlib

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
PAD_INIT = """window.__pads=[];Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pads});
window.__makePad=(index)=>({index,id:'Test standard pad '+index,mapping:'standard',connected:true,
 timestamp:1,axes:[0,0,0,0],buttons:Array.from({length:20},()=>({pressed:false,touched:false,value:0}))});"""


def run_browser(game_file):
    passed = 0
    failures = []
    skipped = []
    details = {}
    url = pathlib.Path(game_file).resolve().as_uri() + "?test=1"

    def check(name, fn):
        nonlocal passed
        try:
            fn()
            passed += 1
        except (
            AssertionError,
            PlaywrightError,
            ValueError,
            KeyError,
            TypeError,
            RuntimeError,
        ) as error:
            failures.append(f"{name}: {error}")

    def require(condition, message):
        if not condition:
            raise AssertionError(message)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            context = browser.new_context(viewport={"width": 1920, "height": 1080})
            context.add_init_script(PAD_INIT)
            page = context.new_page()
            errors, resources = [], []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on("requestfailed", lambda request: resources.append(request.url))
            page.goto(url)
            page.wait_for_function("window.ChompApp?.mode==='title'")
            page.evaluate("game.stop()")

            def advance(seconds=0.05, draw=False):
                return page.evaluate(
                    "([seconds,draw])=>game.advance(seconds,{draw})", [seconds, draw]
                )

            def title():
                page.evaluate("game.debug.command('title')")
                advance()

            def start(players=1, stage=None):
                page.evaluate(
                    "([players,stage])=>game.debug.command('start',{players,board:stage===null?null:ChompContent.stages[stage],mode:stage===null?'campaign':'custom'})",
                    [players, stage],
                )
                advance(0.02, True)

            def snap():
                return page.evaluate("game.debug.snapshot()")

            def click(label):
                page.get_by_role("button", name=label, exact=True).first.click()
                advance()

            def key(code, seconds=0.08):
                page.keyboard.down(code)
                advance(seconds)
                page.keyboard.up(code)
                advance(0.03)

            def pad_button(index, button, down):
                page.evaluate(
                    "([i,b,down])=>{const p=__pads[i];p.buttons[b]={pressed:down,touched:down,value:down?1:0};p.timestamp++}",
                    [index, button, down],
                )
                advance(0.04)

            def boot():
                require(snap()["mode"] == "title", "Direct-file title did not boot")
                require(
                    page.evaluate(
                        "(()=>{const r=game.screen.canvas.getBoundingClientRect();return Math.abs(r.width-innerWidth)<2&&Math.abs(r.height-innerHeight)<2})()"
                    ),
                    "Canvas does not fill the viewport",
                )
                require(
                    not errors and not resources,
                    f"Boot errors/resources: {errors} {resources}",
                )
                require(
                    page.get_by_role(
                        "button", name="Chomp!  /  Solo campaign", exact=True
                    ).is_visible(),
                    "Native title action missing",
                )
                require(
                    page.evaluate(
                        "game.settings.music===.1&&game.audio.musicVolume===.1"
                    ),
                    "Music is not ten percent",
                )
                require(
                    page.evaluate("game.settings.glyphs==='playstation'"),
                    "PlayStation symbols are not the default",
                )
                require(
                    page.evaluate("game.errors.length===0"),
                    "Engine recorded a boot/draw error",
                )

            check("Chromium direct-file boot and defaults", boot)
            advance(0.03, True)
            page.screenshot(path=str(ROOT / "tests/screens-tv-title.png"))

            def mouse_focus():
                button = page.get_by_role("button", name="How to chomp", exact=True)
                button.hover()
                advance()
                require(
                    page.evaluate(
                        "document.activeElement.textContent==='How to chomp'"
                    ),
                    "Mouse hover did not move native focus",
                )
                button.click()
                advance()
                require(
                    page.evaluate("ChompApp.ui.screen==='help0'"),
                    "Mouse click did not open help",
                )
                title()

            check("Native mouse hover focus and menu click", mouse_focus)

            def keyboard_play():
                click("Chomp!  /  Solo campaign")
                require(snap()["mode"] == "play", "Solo button failed")
                before = snap()["actors"][0]
                page.keyboard.down("d")
                advance(0.25)
                forward = snap()["actors"][0]
                page.keyboard.up("d")
                page.keyboard.down("a")
                advance(0.08)
                reversed_actor = snap()["actors"][0]
                page.keyboard.up("a")
                advance(0.02)
                require(
                    forward["x"] > before["x"] + 0.5,
                    "Held keyboard direction did not move",
                )
                require(
                    reversed_actor["dir"] == 3 and reversed_actor["x"] < forward["x"],
                    "Mid-edge keyboard reversal failed",
                )
                count = snap()["stats"]["chirps"]
                key("Space", 0.03)
                require(
                    snap()["stats"]["chirps"] == count + 1, "Real Space did not reveal"
                )
                key("Escape", 0.03)
                paused = snap()
                require(
                    paused["screen"] == "pause" and paused["paused"],
                    "Escape did not open/freeze standalone pause",
                )
                advance(0.25)
                require(
                    snap()["tick"] == paused["tick"], "Simulation moved while paused"
                )
                key("Escape", 0.03)
                require(
                    not snap()["paused"] and snap()["screen"] is None,
                    "Escape did not resume",
                )
                advance(0.05, True)
                page.screenshot(path=str(ROOT / "tests/screens-tv-gameplay.png"))

            check("Real keyboard movement reversal reveal pause resume", keyboard_play)

            def audio_signal():
                require(
                    page.evaluate("game.audio.ready"),
                    "User gesture did not unlock Web Audio",
                )
                result = page.evaluate(
                    """async()=>{const C=new OfflineAudioContext(1,22050,44100);const bus=C.createGain();bus.connect(C.destination);ChompAudio.phoneme(C,bus,.01,510,.12,.1);const out=await C.startRendering();const values=out.getChannelData(0);let peak=0,sum=0,bad=0;for(const x of values){if(!Number.isFinite(x))bad++;peak=Math.max(peak,Math.abs(x));sum+=x*x;}return{peak,rms:Math.sqrt(sum/values.length),bad,musicGain:game.audio.bus('music').gain.value,sfxGain:game.audio.bus('sfx').gain.value,voiceGain:game.audio.bus('voice').gain.value};}"""
                )
                require(
                    result["bad"] == 0
                    and 0 < result["peak"] < 1
                    and result["rms"] > 0.00001,
                    f"Invalid procedural voice waveform {result}",
                )
                require(
                    abs(result["musicGain"] - 0.1) < 0.00001,
                    f"Wrong actual music gain {result}",
                )
                page.evaluate(
                    """()=>{const a=game.audio;window.__an=a.ctx.createAnalyser();__an.fftSize=2048;a.bus('sfx').connect(__an);a.sfx('chomp-power');}"""
                )
                page.wait_for_timeout(80)
                signal = page.evaluate(
                    """()=>{const d=new Float32Array(__an.fftSize);__an.getFloatTimeDomainData(d);let p=0;for(const x of d)p=Math.max(p,Math.abs(x));return p;}"""
                )
                require(
                    math.isfinite(signal) and signal > 0.00001,
                    "Actual SFX bus was silent",
                )
                details["audio"] = {
                    **result,
                    "sfxPeak": signal,
                    "humanListening": "unknown",
                }

            check("Procedural audio offline voice and actual SFX buses", audio_signal)

            def couch_keyboard():
                title()
                click("Couch co-op")
                click("Start together")
                require(
                    page.evaluate(
                        "game.players.length===2&&game.players[0].half==='left'&&game.players[1].half==='right'"
                    ),
                    "Keyboard seats were not split",
                )
                before = snap()["actors"]
                page.keyboard.down("d")
                page.keyboard.down("ArrowRight")
                advance(0.22)
                after = snap()["actors"]
                page.keyboard.up("d")
                page.keyboard.up("ArrowRight")
                require(
                    all(after[i]["x"] > before[i]["x"] + 0.2 for i in range(2)),
                    "Both keyboard seats did not move independently",
                )
                title()

            check("Couch UI and independent keyboard halves", couch_keyboard)

            def gamepad_flow():
                title()
                page.evaluate("__pads=[__makePad(0)]")
                advance()
                pad_button(0, 0, True)
                pad_button(0, 0, False)
                require(
                    snap()["mode"] == "play",
                    "South button did not start the focused title action",
                )
                require(snap()["device"] == "gamepad", "Gamepad did not change prompts")
                before = snap()["actors"][0]["x"]
                page.evaluate("__pads[0].axes=[1,0,0,0]")
                advance(0.18)
                require(snap()["actors"][0]["x"] > before, "Stick intent did not move")
                page.evaluate("__pads[0].axes=[0,0,0,0]")
                pad_button(0, 9, True)
                pad_button(0, 9, False)
                require(snap()["screen"] == "pause", "Options did not pause")
                pad_button(0, 1, True)
                pad_button(0, 1, False)
                require(
                    snap()["screen"] is None and not snap()["paused"],
                    "East button did not return to play",
                )
                pad_button(0, 8, True)
                pad_button(0, 9, True)
                pad_button(0, 9, False)
                pad_button(0, 8, False)
                require(
                    snap()["screen"] is None, "Create+Options was stolen by game pause"
                )
                page.evaluate("game.settings.set('glyphs','xbox')")
                require(
                    page.evaluate("game.input.glyphs==='xbox'"),
                    "Xbox glyph setting did not apply",
                )
                page.evaluate("game.settings.set('glyphs','playstation')")

            check(
                "Standard gamepad menu movement pause glyphs and Hub chord",
                gamepad_flow,
            )

            def pad_seats():
                start(2)
                require(
                    page.evaluate(
                        "game.players[0].pad===null&&game.players[1].pad===0"
                    ),
                    "One pad plus keyboard was not assigned explicitly",
                )
                before = snap()["actors"]
                page.keyboard.down("d")
                page.evaluate("__pads[0].axes=[1,0,0,0]")
                advance(0.18)
                after = snap()["actors"]
                page.keyboard.up("d")
                page.evaluate("__pads[0].axes=[0,0,0,0]")
                require(
                    all(after[i]["x"] > before[i]["x"] for i in range(2)),
                    "Pad and keyboard did not control separate heroes",
                )
                page.evaluate("__pads=[__makePad(0),__makePad(1)]")
                start(2)
                require(
                    page.evaluate("game.players[0].pad===0&&game.players[1].pad===1"),
                    "Two pads did not receive separate seats",
                )
                page.evaluate("__pads[0].axes=[1,0,0,0]")
                advance(0.08)
                page.evaluate("__pads=[]")
                advance(0.04)
                require(
                    snap()["paused"], "Controller loss did not safely pause couch play"
                )
                page.evaluate("__pads=[__makePad(0),__makePad(1)]")
                advance(0.04)
                pad_button(0, 1, True)
                pad_button(0, 1, False)
                require(not snap()["paused"], "Reconnected controller could not resume")
                page.evaluate("__pads=[]")
                advance()
                title()

            check("One-pad keyboard and two-pad seat assignments", pad_seats)

            def workshop_roundtrip():
                title()
                click("Maze workshop")
                require(snap()["mode"] == "editor", "Workshop did not open")
                before = page.evaluate("ChompApp.workshop.board.rows[1]")
                point = page.evaluate(
                    """()=>{const r=game.screen.canvas.getBoundingClientRect(),f=ChompApp.view.frame;const s=game.screen;return{x:r.left+((f.x+2.5*f.tile)*s.S+s.OX)/s.dpr,y:r.top+((f.y+1.5*f.tile)*s.S+s.OY)/s.dpr};}"""
                )
                page.mouse.click(point["x"], point["y"])
                advance()
                edited = page.evaluate("ChompApp.workshop.board.rows[1]")
                require(edited != before, "Mouse painting did not change a wall")
                page.keyboard.press("Control+z")
                advance()
                require(
                    page.evaluate("ChompApp.workshop.board.rows[1]") == before,
                    "Workshop undo failed",
                )
                page.keyboard.press("Control+y")
                advance()
                require(
                    page.evaluate("ChompApp.workshop.board.rows[1]") == edited,
                    "Workshop redo failed",
                )
                page.get_by_role("button", name="Pause menu", exact=True).click()
                advance()
                click("Save / load / name")
                page.get_by_role("textbox", name="Maze name", exact=True).fill(
                    "Browser supper"
                )
                click("Save to slot 1")
                require(
                    page.evaluate(
                        "JSON.parse(localStorage.getItem('chomp-save-v1')).boards[0].name==='Browser supper'"
                    ),
                    "Actual workshop slot save failed",
                )
                click("Back")
                click("Save / load / name")
                click("Load 1: Browser supper")
                require(
                    page.evaluate("ChompApp.workshop.board.name==='Browser supper'"),
                    "Actual slot reload failed",
                )
                page.get_by_role("button", name="Pause menu", exact=True).click()
                advance()
                click("Import / export")
                area = page.get_by_role(
                    "textbox", name="Maze import and export JSON", exact=True
                )
                exported = area.input_value()
                current = page.evaluate("JSON.stringify(ChompApp.workshop.board)")
                area.fill("{bad import")
                click("Import text")
                require(
                    page.evaluate("JSON.stringify(ChompApp.workshop.board)") == current,
                    "Invalid UI import replaced current board",
                )
                area.fill(exported)
                click("Import text")
                require(
                    snap()["mode"] == "editor" and snap()["screen"] is None,
                    "Valid UI import did not return to editor",
                )
                page.get_by_role("button", name="Pause menu", exact=True).click()
                advance()
                click("Playtest maze")
                require(
                    snap()["mode"] == "play" and page.evaluate("ChompApp.returnEditor"),
                    "Workshop playtest did not use the shared simulation",
                )
                key("Escape", 0.03)
                click("Return to workshop")
                require(snap()["mode"] == "editor", "Playtest did not return to editor")
                require(
                    page.evaluate("ChompApp.workshop.board.rows[1]") == edited,
                    "Returning from playtest lost the edit",
                )
                title()

            check(
                "Actual workshop edit undo save reload import play return",
                workshop_roundtrip,
            )

            def attract():
                title()
                saved = page.evaluate("localStorage.getItem('chomp-save-v1')")
                advance(9.85)
                require(
                    not snap()["attract"], "Attract started before ten idle seconds"
                )
                advance(0.2, True)
                require(snap()["attract"], "Attract did not start at ten seconds")
                require(len(snap()["actors"]) == 2, "Attract did not demonstrate co-op")
                page.keyboard.press("Enter")
                advance(0.03)
                require(
                    snap()["mode"] == "title" and snap()["screen"] == "title",
                    "Attract exit input also started gameplay",
                )
                advance(10.1)
                require(snap()["attract"], "Repeated attract entry failed")
                page.mouse.click(8, 8)
                advance(0.03)
                require(
                    snap()["mode"] == "title", "Mouse did not exit repeated attract"
                )
                require(
                    page.evaluate("localStorage.getItem('chomp-save-v1')") == saved,
                    "Attract polluted the save",
                )

            check(
                "Ten-second attract repeated entry input consumption save isolation",
                attract,
            )

            def developer():
                start()
                key("Escape", 0.03)
                click("Developer tools")
                require(snap()["assisted"], "Developer entry did not mark assisted run")
                page.evaluate("game.settings.set('dev_playerSpeed',8)")
                require(
                    page.evaluate("ChompApp.sim.config.playerSpeed===8"),
                    "Live developer slider did not change simulation",
                )
                click("Reset defaults")
                require(
                    page.evaluate(
                        "JSON.stringify(ChompApp.sim.config)===JSON.stringify({...ChompSim.DEFAULTS})"
                    ),
                    "Developer defaults did not fully reset",
                )
                click("Resume")
                require(
                    not snap()["paused"] and snap()["screen"] is None,
                    "Developer resume left the game paused",
                )

            check("Developer live slider reset and resume", developer)

            def settings_storage():
                title()
                click("Sound & comfort")
                click("Sound")
                require(
                    page.locator('input[type="range"]').count() >= 4,
                    "Native sound controls missing",
                )
                page.evaluate("game.settings.set('music',.37)")
                require(
                    abs(page.evaluate("game.audio.musicVolume") - 0.37) < 0.00001,
                    "Music slider did not reach native bus",
                )
                click("Back")
                click("Reset sound & comfort")
                require(
                    page.evaluate("game.settings.music===.1"),
                    "Reset did not restore ten percent music",
                )
                title()

            check("Settings controls and persisted reset", settings_storage)

            def credits_and_motion():
                require(
                    page.evaluate(
                        "Object.values(ChompRelease.sourceInformation).every(v=>typeof v==='string'&&v.trim().length>0)&&ChompRelease.sourceInformation.usage==='added on import'&&ChompRelease.testingFeedback.length===4&&ChompRelease.engineFeedback.length===6&&ChompRelease.promptFeedback.length===4"
                    ),
                    "Release information or required feedback fields are incomplete",
                )
                title()
                click("About & credits")
                for label in [
                    "Source Information",
                    "Testing Feedback",
                    "Engine Feedback",
                    "Prompt Feedback",
                ]:
                    require(
                        page.get_by_role("button", name=label, exact=True).is_visible(),
                        f"Missing mandatory credits category {label}",
                    )
                click("Source Information")
                advance(0.03, True)
                page.wait_for_timeout(250)
                page.screenshot(path=str(ROOT / "tests/screens-tv-credits.png"))
                start(1, 2)
                page.keyboard.down("d")
                for index in range(6):
                    advance(0.48, True)
                    page.screenshot(
                        path=str(ROOT / f"tests/screens-motion-{index}.png")
                    )
                page.keyboard.up("d")
                title()

            check(
                "Required credits categories and native animation strip",
                credits_and_motion,
            )

            def final_artifact_campaigns():
                traces = []
                for players in [1, 2]:
                    start(players)
                    result = page.evaluate("""() => {
                      const app=ChompApp,sim=app.sim,stages=[];let last=sim.stageIndex;
                      const initial=JSON.stringify(sim.config);let turns=0;
                      while(!['won','lost'].includes(sim.phase)&&sim.elapsed<1200){
                        const intents=Object.fromEntries(sim.seats.map(seat=>[seat,sim.botIntent(seat)]));
                        sim.step(1/120,intents);turns++;
                        if(sim.stageIndex!==last){stages.push({stage:last,elapsed:sim.elapsed,lives:sim.lives});last=sim.stageIndex;}
                        if(turns%120===0){app.state=sim.snapshot();app.process(0);}
                      }
                      app.state=sim.snapshot();app.process(0);
                      return{phase:sim.phase,food:sim.stats.food,finalCatches:sim.stats.finalCatches,lives:sim.lives,
                        elapsed:sim.elapsed,configUnchanged:JSON.stringify(sim.config)===initial,config:sim.config,
                        stages,screen:app.ui.screen,mode:app.mode,players:sim.players.length};
                    }""")
                    require(
                        result["phase"] == "won",
                        f"Built-file {players}-seat campaign did not win: {result}",
                    )
                    require(
                        result["food"] == 72
                        and len(result["finalCatches"]) == 6
                        and result["lives"] > 0,
                        f"Built-file campaign outcome invalid: {result}",
                    )
                    require(
                        result["configUnchanged"]
                        and not result["config"]["invulnerable"],
                        "Campaign bot evidence used altered rules",
                    )
                    require(
                        result["mode"] == "results" and result["screen"] == "results",
                        "Actual victory results did not open",
                    )
                    click("Chomp again")
                    retry = snap()
                    require(
                        retry["score"] == 0
                        and retry["lives"] == 5
                        and retry["stageIndex"] == 0,
                        "Actual results retry leaked run state",
                    )
                    traces.append(result)
                details["finalArtifactCampaigns"] = traces
                title()

            check(
                "Built HTML normal solo and co-op whole-campaign legal intents",
                final_artifact_campaigns,
            )

            check(
                "Chromium final console and resource integrity",
                lambda: require(
                    not errors
                    and not resources
                    and page.evaluate("game.errors.length===0"),
                    f"Errors: {errors}; resources:{resources}; engine:{page.evaluate('game.errors')}",
                ),
            )
            details["chromiumErrors"] = errors
            context.close()

            corrupt_context = browser.new_context(
                viewport={"width": 1280, "height": 720}
            )
            corrupt_context.add_init_script(
                "try{localStorage.setItem('chomp-save-v1','{broken');localStorage.setItem('my3d2dge:settings:kc-chomp-chase-v1','{broken')}catch{}"
            )
            corrupt_page = corrupt_context.new_page()
            corrupt_errors = []
            corrupt_page.on(
                "pageerror", lambda error: corrupt_errors.append(str(error))
            )

            def corrupt_storage():
                corrupt_page.goto(url)
                corrupt_page.wait_for_function("window.ChompApp?.mode==='title'")
                corrupt_page.evaluate("game.stop();game.advance(.03,{draw:true})")
                require(
                    corrupt_page.evaluate(
                        "ChompApp.save.best===0&&ChompApp.save.boards.length===0&&game.settings.music===.1&&ChompApp.state.lives===5&&game.errors.length===0"
                    ),
                    "Corrupt storage did not recover to safe defaults",
                )
                require(
                    not corrupt_errors,
                    f"Corrupt storage caused browser errors: {corrupt_errors}",
                )

            check(
                "Corrupt campaign and native settings storage recovery", corrupt_storage
            )
            corrupt_context.close()

            phone = browser.new_context(**playwright.devices["iPhone 13"])
            touch = phone.new_page()
            touch_errors = []
            touch.on("pageerror", lambda error: touch_errors.append(str(error)))
            touch.goto(url)
            touch.wait_for_function("window.ChompApp?.mode==='title'")
            touch.evaluate("game.stop()")

            def touch_flow():
                touch.get_by_role(
                    "button", name="Chomp!  /  Solo campaign", exact=True
                ).tap()
                touch.evaluate("game.advance(.03,{draw:true})")
                require(
                    touch.evaluate("ChompApp.mode==='play'"), "Phone tap did not start"
                )
                touch.evaluate(
                    "game.debug.command('start',{mode:'custom',board:ChompContent.stages[3]});game.advance(.03,{draw:true})"
                )
                box = touch.locator("canvas#screen").bounding_box()
                x, y = box["x"] + box["width"] * 0.22, box["y"] + box["height"] * 0.62
                client = phone.new_cdp_session(touch)
                first = {"x": x, "y": y, "id": 1}
                client.send(
                    "Input.dispatchTouchEvent",
                    {"type": "touchStart", "touchPoints": [first]},
                )
                moved = {"x": x + 65, "y": y, "id": 1}
                client.send(
                    "Input.dispatchTouchEvent",
                    {"type": "touchMove", "touchPoints": [moved]},
                )
                touch.evaluate("game.advance(.15,{draw:true})")
                require(
                    touch.evaluate(
                        "game.input.stickOn&&game.input.lastDevice==='touch'"
                    ),
                    "Real emulated touch did not steer",
                )
                before_id = touch.evaluate("game.input.stickId")
                reveal = touch.locator("#chirp").bounding_box()
                require(reveal is not None, "Contextual reveal button did not show")
                second = {
                    "x": reveal["x"] + reveal["width"] / 2,
                    "y": reveal["y"] + reveal["height"] / 2,
                    "id": 2,
                }
                client.send(
                    "Input.dispatchTouchEvent",
                    {"type": "touchStart", "touchPoints": [moved, second]},
                )
                touch.evaluate("game.advance(.04,{draw:true})")
                require(
                    touch.evaluate(
                        f"game.input.stickOn&&game.input.stickId==={before_id}"
                    ),
                    "Second finger destroyed held steering",
                )
                client.send(
                    "Input.dispatchTouchEvent",
                    {"type": "touchEnd", "touchPoints": [moved]},
                )
                client.send(
                    "Input.dispatchTouchEvent",
                    {"type": "touchCancel", "touchPoints": []},
                )
                touch.evaluate("game.advance(.04,{draw:true})")
                require(
                    touch.evaluate(
                        "!game.input.stickOn&&game.input.stick[0]===0&&game.input.stick[1]===0"
                    ),
                    "Touch cancellation left steering held",
                )
                touch.screenshot(path=str(ROOT / "tests/screens-phone-gameplay.png"))
                require(not touch_errors, f"Phone errors: {touch_errors}")

            check("Chromium phone touch multitouch reveal cancellation", touch_flow)
            phone.close()
        finally:
            browser.close()

        try:
            webkit = playwright.webkit.launch(headless=True)
        except (
            AssertionError,
            PlaywrightError,
            ValueError,
            KeyError,
            TypeError,
            RuntimeError,
        ) as error:
            skipped.append(f"WebKit unavailable in installed environment: {error}")
        else:
            try:
                context = webkit.new_context(**playwright.devices["iPhone 13"])
                page = context.new_page()
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto(url)
                page.wait_for_function("window.ChompApp?.mode==='title'")
                page.evaluate("game.stop()")

                def webkit_touch():
                    page.get_by_role(
                        "button", name="Chomp!  /  Solo campaign", exact=True
                    ).tap()
                    page.evaluate("game.advance(.1,{draw:true})")
                    require(
                        page.evaluate(
                            "ChompApp.mode==='play'&&ChompApp.state.remaining===12"
                        ),
                        "WebKit touch did not start a real board",
                    )
                    page.get_by_role("button", name="Pause menu", exact=True).tap()
                    page.evaluate("game.advance(.05)")
                    require(
                        page.evaluate("game.paused&&ChompApp.ui.screen==='pause'"),
                        "WebKit touch menu failed",
                    )
                    require(
                        not errors and page.evaluate("game.errors.length===0"),
                        f"WebKit error: {errors}",
                    )

                check("WebKit iPhone-profile direct-file tap and pause", webkit_touch)
                context.close()
            finally:
                webkit.close()

    result = {
        "passed": passed,
        "failed": len(failures),
        "skipped": len(skipped),
        "failures": failures,
        "skipReasons": skipped,
        "details": details,
    }
    (ROOT / "tests/browser-results.json").write_text(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("game")
    args = parser.parse_args()
    try:
        result = run_browser(args.game)
    except (
        AssertionError,
        PlaywrightError,
        ValueError,
        KeyError,
        TypeError,
        RuntimeError,
    ) as error:
        result = {
            "passed": 0,
            "failed": 1,
            "skipped": 0,
            "failures": [f"Browser infrastructure: {error}"],
            "skipReasons": [],
        }
        (ROOT / "tests/browser-results.json").write_text(json.dumps(result, indent=2))
    for failure in result["failures"]:
        print(failure)
    for reason in result["skipReasons"]:
        print("SKIP " + reason)
    print(
        f"Browser: {result['passed']} passed, {result['failed']} failed, {result['skipped']} skipped"
    )
    raise SystemExit(1 if result["failed"] else 0)
