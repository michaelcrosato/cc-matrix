"""Functional input/front-end checks on the exported artifact, with native browser stand-ins."""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BUILD = "FWR-20261106-023037"
PAD_INIT = """window.__pads=[];Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>window.__pads});"""


def run_checks(game_path):
    checks = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=["--use-gl=angle", "--use-angle=swiftshader", "--no-sandbox"])
        context = browser.new_context(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
        context.add_init_script(PAD_INIT)
        page = context.new_page()
        browser_errors = []
        page.on("pageerror", lambda err: browser_errors.append(str(err)))
        page.on("console", lambda msg: browser_errors.append(msg.text) if msg.type == "error" else None)

        def check(name, fn):
            try:
                fn()
                checks.append({"name": name, "pass": True, "detail": ""})
            except Exception as err:
                checks.append({"name": name, "pass": False, "detail": str(err)})

        def expect(value, detail):
            if not value:
                raise AssertionError(detail)

        def snap():
            return page.evaluate("FWR.debug.snapshot()")

        def advance(seconds=.04):
            return page.evaluate("s=>FWR.debug.advance(s)", seconds)

        def action(name, value=None):
            page.evaluate("([n,v])=>FWR.debug.action(n,v)", [name, value])
            advance()

        def init_page():
            page.goto(Path(game_path).resolve().as_uri())
            page.wait_for_function("document.body.dataset.ready==='true'", timeout=30000)
            expect(page.evaluate("document.body.dataset.build") == BUILD, "Wrong game identity")
            page.evaluate("FWR.debug.externalClock=true;FWR.debug.game.stop()")
            advance()

        def pad(button=None, axes=None, index=0, down=True):
            page.evaluate("""({button,axes,index,down})=>{
                if(!window.__pads[index])window.__pads[index]={index,id:'DualSense Test '+index,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
                const p=window.__pads[index];if(axes)p.axes=axes;
                if(button!==null){p.buttons[button].pressed=down;p.buttons[button].value=down?1:0;}
            }""", {"button": button, "axes": axes, "index": index, "down": down})
            advance()

        def press(button):
            pad(button, down=True)
            pad(button, down=False)

        def focus_text():
            return page.evaluate("document.activeElement?.textContent||''")

        def select(label):
            for _ in range(35):
                if label.lower() in focus_text().lower():
                    press(0)
                    return
                press(13)
            raise AssertionError("Pad could not reach " + label + "; focus=" + focus_text())

        def key(code):
            page.keyboard.press(code)
            advance()

        init_page()

        def title_default():
            expect(snap()["screen"] == "title", "Fresh boot must show title")
            expect(snap()["settings"]["music"] == .1, "Music default must be exactly .10")
            pad()
            press(0)
            expect(snap()["mode"] == "play" and snap()["sector"] == 0, "Pad Cross must start playable opening")
            press(9)
            expect(snap()["screen"] == "pauseMenu" and snap()["paused"], "Options must open real pause")
            press(9)
            expect(snap()["screen"] is None and not snap()["paused"], "Options must resume after hiding native Shell")
        check("browser: one standard pad starts and pauses/resumes operation", title_default)

        def pad_screens():
            press(9)
            select("Controls")
            expect(snap()["screen"] == "controls", "Controls screen unreachable with pad")
            press(1)
            select("Settings")
            expect(snap()["screen"] == "settings", "Settings screen unreachable with pad")
            press(1)
            select("Developer tools")
            expect(snap()["screen"] == "dev", "Dev tools unreachable with pad")
            select("Flight variables")
            expect(snap()["screen"] == "devBalanceFlight", "Balance sliders unreachable with pad")
            slider = page.locator("input[aria-label='Cruise speed']")
            slider.focus()
            old = snap()["config"]["shipSpeed"]
            press(15)
            expect(snap()["config"]["shipSpeed"] > old, "Pad right must change live selected slider")
            press(1)
            select("Reset shipped defaults")
            expect(snap()["config"]["shipSpeed"] == 220, "Reset must restore authored defaults")
            press(1)
            press(1)
            expect(not snap()["paused"] and snap()["screen"] is None, "Back hierarchy must resume flight")
            action("title")
            select("About")
            for _ in range(14):
                select("Next page")
            press(1)
            expect(snap()["screen"] == "title", "About pages must not accumulate back-stack frames")
            select("Evasion")
            expect(snap()["screen"] == "evasionBriefing", "Evasion must explain disabled cannon")
            select("Launch Evasion")
            expect(page.evaluate("FWR.debug.world().mode") == "evasion", "Pad must launch Evasion")
        check("browser: pad-only screen hierarchy, live slider/reset, credits and Evasion", pad_screens)

        def pointer_settings():
            action("title")
            page.get_by_role("button", name="Settings", exact=True).hover()
            expect("Settings" in focus_text(), "Pointer hover must move focus")
            page.get_by_role("button", name="Settings", exact=True).click()
            advance()
            expect(snap()["screen"] == "settings", "Pointer click must activate hovered menu item")
            music = page.locator("input[aria-label='Music']")
            music.evaluate("e=>{e.value=.23;e.dispatchEvent(new Event('input',{bubbles:true}))}")
            expect(abs(snap()["settings"]["music"] - .23) < .001, "Music slider does not change actual preference")
            page.evaluate("FWR.debug.game.settings.set('glyphs','xbox')")
            expect(snap()["settings"]["glyphs"] == "xbox", "Xbox glyph option must change preference")
            page.reload()
            page.wait_for_function("document.body.dataset.ready==='true'")
            page.evaluate("FWR.debug.externalClock=true;FWR.debug.game.stop()")
            expect(snap()["settings"]["music"] == .23 and snap()["settings"]["glyphs"] == "xbox", "Settings must survive reload")
        check("browser: mouse focus/click, real music setting and persisted Xbox glyphs", pointer_settings)

        def rebind_keys():
            action("play")
            key("Escape")
            page.get_by_role("button", name="Controls", exact=True).click()
            advance()
            button = page.locator("button[aria-label^='Hyperspace, keyboard:']")
            expect(button.count() == 1, "Native binding capture missing")
            button.click()
            page.keyboard.press("q")
            advance()
            expect("KeyQ" in page.evaluate("FWR.debug.game.input.map.warp"), "Native rebinding must alter semantic mapping")
            key("Escape")
            key("Escape")
            expect(snap()["screen"] is None and not snap()["paused"], "Escape must back out and resume")
            before = snap()["ship"]["x"]
            page.keyboard.down("q")
            advance(.7)
            page.keyboard.up("q")
            advance(.05)
            expect(snap()["ship"]["x"] > before + 150, "Rebound Q must commit actual hyperspace flight")
            expect("Q" in page.evaluate("FWR.debug.input.label('warp')"), "Prompts must honor rebound key")
            expect(page.evaluate("FWR.debug.input.family") == "keyboard", "Last intentional key must select keyboard prompts")
            action("title")
            page.get_by_role("button", name="Settings", exact=True).click()
            advance()
            page.get_by_role("button", name="Restore preferences", exact=True).click()
            advance()
        check("browser: native keyboard rebinding controls a real burst and prompt", rebind_keys)

        def attract_lifecycle():
            # All demo testing uses isolated contexts and leaves gameplay storage byte-identical.
            def begin():
                page.evaluate("window.__pads=[]")
                action("title")
                advance(9.94)
                expect(snap()["mode"] == "title", "Attract starts before ten seconds")
                advance(.07)
                expect(snap()["mode"] == "attract", "Attract does not start at ten seconds")
            baseline = page.evaluate("localStorage.getItem('freedom-warp-rescue.v2')")
            begin()
            first = snap()["runId"]
            advance(55)
            expect(snap()["mode"] == "attract" and snap()["runId"] != first, "Attract must loop")
            key("a")
            expect(snap()["screen"] == "title" and snap()["mode"] == "title", "Keyboard exit must be consumed")
            begin()
            page.mouse.move(1800, 60)
            advance()
            expect(snap()["mode"] == "title", "Pointer movement must exit attract")
            begin()
            pad(0, down=True)
            expect(snap()["mode"] == "title" and snap()["screen"] == "title", "Controller confirm must exit without starting game")
            advance(.1)
            expect(snap()["mode"] == "title", "Held attract-exit button must stay consumed")
            pad(0, down=False)
            begin()
            page.locator("#screen").dispatch_event("pointerdown", {"pointerId": 73, "pointerType": "touch", "clientX": 600, "clientY": 500, "button": 0, "buttons": 1})
            advance()
            expect(snap()["mode"] == "title", "Touch must exit attract")
            # A compatibility click from the same contact must not activate fresh title controls.
            page.get_by_role("button", name="Play operation", exact=True).dispatch_event("click")
            advance()
            expect(snap()["mode"] == "title", "Attract-exit contact leaked a click into title")
            expect(page.evaluate("localStorage.getItem('freedom-warp-rescue.v2')") == baseline, "Attract modified saved progress/settings")
        check("browser: exact attract threshold, looping, all-family consumed exits and save isolation", attract_lifecycle)

        def touch_checks(viewport, name):
            nonlocal page
            page.close()
            context.close()
            touch_context = browser.new_context(viewport=viewport, device_scale_factor=1, is_mobile=True, has_touch=True)
            touch_context.add_init_script(PAD_INIT)
            page = touch_context.new_page()
            page.on("pageerror", lambda err: browser_errors.append(str(err)))
            page.goto(Path(game_path).resolve().as_uri())
            page.wait_for_function("document.body.dataset.ready==='true'")
            expect(page.evaluate("document.body.dataset.build") == BUILD, "Wrong touch page identity")
            page.evaluate("FWR.debug.externalClock=true;FWR.debug.game.stop()")
            action("play")
            canvas = page.locator("#screen")
            bounds = canvas.bounding_box()
            x0 = bounds["x"] + bounds["width"] * .22
            y0 = bounds["y"] + bounds["height"] * .65
            right_x = bounds["x"] + bounds["width"] * .75
            right_y = bounds["y"] + bounds["height"] * .6

            def pointer(kind, pid, x, y):
                canvas.dispatch_event(kind, {"pointerId": pid, "pointerType": "touch", "clientX": x, "clientY": y, "button": 0, "buttons": 0 if kind in ["pointerup", "pointercancel"] else 1, "isPrimary": pid == 1})
                advance(.025)

            pointer("pointerdown", 1, x0, y0)
            pointer("pointermove", 1, x0 + 65, y0)
            pointer("pointerdown", 2, right_x, right_y)
            expect(page.evaluate("FWR.debug.input.contacts.size") == 2, name + ": multi-contact tracking failed")
            expect(page.evaluate("FWR.debug.input.family") == "touch", name + ": touch prompts not selected")
            expect(page.locator(".fwr-touch-warp").is_visible(), name + ": contextual warp affordance missing")
            pointer("pointerup", 2, right_x, right_y)
            advance(1.7)
            expect(len(snap()["rescued"]) >= 1, name + ": touch steering did not complete genuine first rescue")
            before = snap()["ship"]["x"]
            pointer("pointerdown", 2, right_x, right_y)
            pointer("pointerup", 2, right_x, right_y)
            pointer("pointerdown", 2, right_x, right_y)
            advance(.6)
            expect(snap()["ship"]["x"] > before + 200, name + ": touch double tap did not produce real burst")
            pointer("pointerup", 2, right_x, right_y)
            expect(page.evaluate("FWR.debug.input._touchBurst") is False, name + ": right release left burst latched during steering")
            pointer("pointercancel", 1, x0 + 65, y0)
            expect(page.evaluate("FWR.debug.input.contacts.size") == 0, name + ": cancellation did not clear contacts")
            expect(not page.locator(".fwr-touch-warp").is_visible(), name + ": cancelled contacts left warp UI")
            advance(.5)
            x = snap()["ship"]["x"]
            advance(.5)
            expect(abs(snap()["ship"]["x"] - x) < .1, name + ": cancelled touch left movement held")
            page.get_by_role("button", name="Pause / flight deck").tap()
            advance()
            expect(snap()["screen"] == "pauseMenu", name + ": touch menu not operable")
            page.get_by_role("button", name="Resume flight", exact=True).tap()
            advance()
            expect(not snap()["paused"], name + ": touch resume failed")
            expect(not snap()["errors"], name + ": engine reported errors")
            touch_context.close()
            return touch_context

        # Each touch layout has its own context so changes do not contaminate the other.
        try:
            touch_checks({"width": 390, "height": 844}, "phone portrait")
            checks.append({"name": "browser: phone multitouch, first rescue, hyperspace, cancellation and menu", "pass": True, "detail": ""})
        except Exception as err:
            checks.append({"name": "browser: phone multitouch, first rescue, hyperspace, cancellation and menu", "pass": False, "detail": str(err)})
        # touch_checks closes the original context; use a fresh context holder for the second call.
        context = browser.new_context(viewport={"width": 1024, "height": 768})
        page = context.new_page()
        try:
            touch_checks({"width": 1024, "height": 768}, "tablet landscape")
            checks.append({"name": "browser: tablet multitouch, first rescue, hyperspace, cancellation and menu", "pass": True, "detail": ""})
        except Exception as err:
            checks.append({"name": "browser: tablet multitouch, first rescue, hyperspace, cancellation and menu", "pass": False, "detail": str(err)})
        checks.append({"name": "browser: no frontend console or page errors", "pass": not browser_errors, "detail": "\n".join(browser_errors)})
        browser.close()
    return checks


if __name__ == "__main__":
    result = run_checks(sys.argv[1])
    if "--json" in sys.argv:
        print(json.dumps(result))
    else:
        for item in result:
            if not item["pass"]:
                print("FAIL " + item["name"] + ": " + item["detail"])
        print(f"{sum(item['pass'] for item in result)}/{len(result)} frontend browser checks passed")
    sys.exit(0 if all(item["pass"] for item in result) else 1)
