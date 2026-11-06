"""Controller, keyboard, touch, audio, and menu integration checks.

Run with the installed Playwright Python, passing an optional HTML path.
Uses the actual self-contained deliverable over file://; no server required.
"""
from pathlib import Path
import sys

from playwright.sync_api import sync_playwright


passed = 0
failed = 0
errors = []


def check(name, callback):
    global passed, failed
    try:
        callback()
        passed += 1
    except Exception as error:
        failed += 1
        print(f"FAIL {name}: {str(error).splitlines()[0]}")


def require(condition, message):
    if not condition:
        raise AssertionError(message)


PAD_STUB = """
window.__pad={id:'DualSense scripted standard pad',index:0,connected:true,mapping:'standard',timestamp:0,
 axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0}))};
navigator.getGamepads=()=>[window.__pad,null,null,null];
window.__setPad=(indices=[],axes=[0,0,0,0])=>{
 __pad.buttons.forEach((b,i)=>{b.pressed=indices.includes(i);b.touched=b.pressed;b.value=b.pressed?1:0;});
 __pad.axes=axes;__pad.timestamp=performance.now();
};
"""


def state(page):
    return page.evaluate("__game.getState()")


def ui(page):
    return page.evaluate("__game.getUI()")


def goto_title(page):
    page.evaluate("__setPad(); __game.action('title')")
    page.wait_for_timeout(120)
    require(state(page)["phase"] == "title", "return-to-title failed")


def set_range(page, selector, value):
    page.locator(selector).evaluate(
        "(el,value)=>{el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));}", value
    )


def pad(page, buttons=None, axes=None, milliseconds=110):
    page.evaluate("([buttons,axes])=>__setPad(buttons,axes)", [buttons or [], axes or [0, 0, 0, 0]])
    page.wait_for_timeout(milliseconds)


def pad_press(page, button):
    pad(page, [button])
    pad(page)


def ready(page):
    page.wait_for_function("window.__gameReady===true || !!window.__gameError", timeout=90000)
    require(page.evaluate("window.__gameReady===true"), page.evaluate("window.__gameError || 'boot failed'"))
    page.wait_for_timeout(180)


target = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).with_name("game.html")).resolve()
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, args=[
        "--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-webgpu-adapter=swiftshader", "--no-sandbox"
    ])
    context = browser.new_context(viewport={"width": 1600, "height": 900}, device_scale_factor=1)
    context.add_init_script(PAD_STUB)
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(f"desktop: {error}"))
    page.goto(target.as_uri(), wait_until="load")
    boot_ok = False
    try:
        ready(page)
        boot_ok = True
        passed += 1
    except Exception as error:
        failed += 1
        print(f"FAIL standalone file boot: {str(error).splitlines()[0]}")

    if boot_ok:
        def engines():
            require(page.evaluate("__game.scene.ready.webgpu === true"), "WebGPU backend was not selected")
            require(page.evaluate("__game.physicsVersion === '0.19.3'"), "Rapier version does not match 0.19.3")
            require(not page.evaluate("__game.net.active"), "standalone file incorrectly entered a Hub session")
            require(page.evaluate("__game.audio.diagnostics().music === .1"), "music did not default to 10%")
        check("requested engines and default music", engines)

        def title_space():
            page.locator('#title [data-action="start"]').focus()
            page.keyboard.press("Space")
            page.wait_for_timeout(180)
            require(state(page)["phase"] == "defense", "Space did not activate focused launch button")
        check("keyboard Space activates title", title_space)

        def pause_freezes():
            page.keyboard.press("Escape")
            page.wait_for_timeout(100)
            require(ui(page)["menu"] == "pause", "Escape did not open pause")
            time = state(page)["time"]
            page.wait_for_timeout(180)
            require(state(page)["time"] == time, "standalone simulation advanced while paused")
            page.keyboard.press("Escape")
            page.wait_for_timeout(130)
            require(ui(page)["menu"] == "", "Escape did not resume")
            require(state(page)["time"] > time, "resuming did not advance simulation")
        check("pause freezes and resumes gameplay", pause_freezes)

        def settings_live():
            page.keyboard.press("Escape")
            page.locator('#menu [data-action="settings"]').click()
            slider = page.locator("#music")
            slider.focus()
            before = float(slider.input_value())
            page.keyboard.press("ArrowRight")
            after = float(slider.input_value())
            require(abs(after - before - .01) < .00001, f"one keyboard step changed music {before} → {after}")
            set_range(page, "#music", .23)
            set_range(page, "#sfx", .42)
            levels = page.evaluate("__game.audio.diagnostics()")
            require(levels["music"] == .23 and levels["sfx"] == .42, "volume sliders did not reach live audio buses")
            require(page.locator("#musicOut").inner_text() == "23%", "music value label is stale")
            page.locator('#menu [data-action="glyphs"]').click()
            require(page.locator('#menu [data-action="glyphs"]').inner_text() == "Xbox", "glyph setting did not switch")
            set_range(page, "#music", .1)
            set_range(page, "#sfx", .65)
            page.locator('#menu [data-action="back"]').click()
            require(ui(page)["menu"] == "pause", "settings Back did not return to pause")
        check("settings sliders, keyboard steps and glyph choice", settings_live)

        def developer_tools():
            if ui(page)["menu"] != "pause":
                page.evaluate("__game.pause()")
            page.locator('#menu [data-action="dev"]').click()
            require(ui(page)["menu"] == "dev", "developer mode was not reached from pause")
            require(page.locator("input[data-dev]").count() == 6, "expected six live balance sliders")
            set_range(page, "#dev-meteorSpeed", 1.7)
            set_range(page, "#dev-beamPower", 2.1)
            config = page.evaluate("__game.game.config")
            require(config["meteorSpeed"] == 1.7 and config["beamPower"] == 2.1, "developer sliders did not update simulation")
            page.locator('#menu [data-action="god"]').click()
            require(page.evaluate("__game.game.config.invincible"), "invincibility did not enable")
            page.evaluate("__game.game.state.hull=1; __game.game.state.charge=5")
            page.locator('#menu [data-action="heal"]').click()
            require(state(page)["hull"] == 6 and state(page)["charge"] == 100, "repair/refill failed")
            page.locator('#menu [data-action="resetdev"]').click()
            config = page.evaluate("__game.game.config")
            require(config == {"meteorSpeed":1,"threatRate":1,"defenseDuration":24,"rescueTime":75,"beamPower":1,"pilotSpeed":1,"invincible":False}, "reset defaults did not restore every balance field")
        check("pause developer tools, live balance and reset", developer_tools)

        def manual_and_about():
            goto_title(page)
            page.locator('#title [data-action="how"]').click()
            require("two at once" in page.locator("#menu").inner_text(), "manual omitted cargo capacity")
            page.locator('#menu [data-action="back"]').click()
            page.locator('#title [data-action="about"]').click()
            text = page.locator("#menu").inner_text()
            for title in ["Source", "Testing Feedback", "Engine Feedback", "Prompt Feedback", "added on import"]:
                require(title.lower() in text.lower(), f"About omitted {title}")
        check("manual and required credits information", manual_and_about)

        def second_pilot():
            goto_title(page)
            page.locator('#title [data-action="coop"]').click()
            page.evaluate("__game.setPhase('rescue'); __game.game.state.enemies=[]")
            before = state(page)["players"]
            require(len(before) == 2, "local co-op did not create two pilots")
            page.keyboard.down("ArrowRight")
            page.keyboard.down("Enter")
            page.wait_for_timeout(230)
            after = state(page)["players"]
            page.keyboard.up("ArrowRight")
            page.keyboard.up("Enter")
            require(after[1]["x"] > before[1]["x"] + .3, "arrow keys did not move pilot two")
            require(after[1]["beam"], "Enter did not operate pilot two's tractor beam")
            require(abs(after[0]["x"] - before[0]["x"]) < .01, "pilot two controls moved pilot one")
        check("local co-op keyboard isolation and tractor beam", second_pilot)

        def pad_navigation():
            goto_title(page)
            page.locator('#title [data-action="start"]').focus()
            pad_press(page, 13)
            require(page.evaluate("document.activeElement.dataset.action") == "coop", "D-pad did not move menu focus")
            pad_press(page, 12)
            require(page.evaluate("document.activeElement.dataset.action") == "start", "D-pad did not return focus")
            pad_press(page, 0)
            require(state(page)["phase"] == "defense", "Cross/A did not launch")
            require(ui(page)["inputMode"] == "gamepad", "gamepad input was not detected")
        check("standard-mapping gamepad menu navigation and launch", pad_navigation)

        def pad_gameplay():
            pad(page, [7], [1, 0, 0, 0], 180)
            require(any(shot["vx"] > 20 for shot in state(page)["shots"]), "R2 plus stick did not fire right")
            pad(page)
            require("A" in page.locator("#controlsLine .key").all_inner_texts(), "Xbox glyph setting did not reach HUD")
            pad_press(page, 9)
            require(ui(page)["menu"] == "pause", "Options did not pause")
            pad_press(page, 0)
            require(ui(page)["menu"] == "", "Cross/A did not resume")
            pad(page, [8, 9])
            require(ui(page)["menu"] == "", "Create + Options incorrectly opened the game's pause menu")
            pad(page)
        check("gamepad fire, glyph prompts, pause and Hub chord", pad_gameplay)

        def keyboard_gameplay():
            page.keyboard.down("KeyW")
            page.keyboard.down("Space")
            page.wait_for_timeout(170)
            shots = state(page)["shots"]
            page.keyboard.up("KeyW")
            page.keyboard.up("Space")
            require(any(shot["vy"] > 20 for shot in shots), "W + Space did not fire upward")
            require(ui(page)["inputMode"] == "keyboard", "keyboard did not replace pad prompts")
        check("native keyboard fire and last-input switching", keyboard_gameplay)

        def generated_audio():
            rendered = page.evaluate("__game.renderAudioTest()")
            require(rendered["finite"] and .001 < rendered["peak"] < 1 and rendered["rms"] > .001, f"invalid synthesized PCM: {rendered}")
            require(rendered["defaultMusic"] == .1, "offline synthesizer default music is not 10%")
            page.evaluate("__game.audio.event('win')")
            page.wait_for_timeout(140)
            diagnostics = page.evaluate("__game.audio.diagnostics()")
            require(diagnostics["unlocked"] and diagnostics["state"] == "running", "real input did not unlock Web Audio")
            require(diagnostics["peak"] > .00001, "live analyser remained silent after synthesized cue")
        check("offline PCM and live audio unlock/analyser", generated_audio)

        def attract_mode():
            goto_title(page)
            page.wait_for_function("__game.getState().attract", timeout=22000)
            require(page.locator("#attract").is_visible(), "idle demonstration indicator did not appear")
            require(state(page)["phase"] == "defense", "attract did not start playing")
            page.mouse.move(1530, 700)
            page.wait_for_timeout(100)
            require(state(page)["phase"] == "title" and not state(page)["attract"], "mouse movement did not exit attract")
            require(page.evaluate("__game.game.config.defenseDuration") == 24, "attract changed the player's balance defaults")
            page.locator('#title [data-action="start"]').focus()
            page.keyboard.press("Enter")
            page.wait_for_timeout(100)
            require(state(page)["phase"] == "defense", "game could not launch after leaving attract")
        check("10-second idle attract, any-input exit and balance restoration", attract_mode)

        check("desktop runtime has no uncaught errors", lambda: require(not errors, "; ".join(errors)))

    context.close()

    if boot_ok:
        phone_context = browser.new_context(**playwright.devices["iPhone 13"])
        phone = phone_context.new_page()
        phone.on("pageerror", lambda error: errors.append(f"touch: {error}"))
        phone.goto(target.as_uri(), wait_until="load")

        def touch_play():
            ready(phone)
            require(phone.evaluate("__game.getUI().touchEnabled"), "touch profile did not select touch UI")
            phone.locator('#title [data-action="start"]').tap()
            phone.evaluate("__game.setPhase('rescue'); __game.game.state.enemies=[]")
            before = state(phone)["players"][0]
            session = phone_context.new_cdp_session(phone)
            session.send("Input.dispatchTouchEvent", {"type":"touchStart", "touchPoints":[{"x":70,"y":650,"id":1}]})
            session.send("Input.dispatchTouchEvent", {"type":"touchMove", "touchPoints":[{"x":125,"y":650,"id":1}]})
            phone.wait_for_timeout(220)
            after = state(phone)["players"][0]
            require(after["x"] > before["x"] + .3, "invisible left stick did not move shuttle")
            require(after["beam"], "touch hold did not assist the tractor beam")
            session.send("Input.dispatchTouchEvent", {"type":"touchEnd", "touchPoints":[]})
            phone.wait_for_timeout(90)
            require(not state(phone)["players"][0]["beam"], "tractor beam did not release with touch")
            require(phone.locator(".bottomLeft").is_hidden() and phone.locator(".bottomRight").is_hidden(), "touch did not remove dense control panels")
            phone.locator('#hud [data-action="pause"]').tap()
            require(ui(phone)["menu"] == "pause", "touch menu button did not pause")
        check("phone touch stick, beam assist, sparse HUD and pause", touch_play)
        def touch_landscape_title():
            phone.evaluate("__game.action('title')")
            phone.set_viewport_size({"width":844,"height":390})
            phone.wait_for_timeout(180)
            layout = phone.evaluate("""(()=>{const t=document.querySelector('#title');const brand=t.querySelector('.brandline').getBoundingClientRect();const heading=t.querySelector('h1').getBoundingClientRect();return {clear:heading.top>=brand.bottom,fit:[...t.querySelectorAll('button')].every(b=>{const r=b.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight-20})}})()""")
            require(layout["clear"], "landscape heading overlaps brand")
            require(layout["fit"], "landscape title actions are clipped")
        check("short landscape touch title remains fully usable", touch_landscape_title)
        check("touch runtime has no uncaught errors", lambda: require(not errors, "; ".join(errors)))
        phone_context.close()

    browser.close()

print(f"{passed + failed} browser checks: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
