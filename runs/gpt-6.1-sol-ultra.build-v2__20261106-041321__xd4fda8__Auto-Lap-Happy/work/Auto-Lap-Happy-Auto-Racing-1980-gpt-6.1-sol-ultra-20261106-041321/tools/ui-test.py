"""UI/input checks on the actual bundled game; root test.mjs consumes JSON results."""

import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parents[1]
FINAL = BASE.parent / (BASE.name + ".html")
URL = os.environ.get("HAPPY_UI_URL", FINAL.resolve().as_uri())
EVIDENCE = BASE / "evidence"
PAD = """window.__pads=[{index:0,connected:true,id:'Playwright DualSense stand-in',mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))}];navigator.getGamepads=()=>window.__pads;"""


def run():
    results = []
    errors = []

    def check(name, ok, detail=""):
        results.append(
            {"name": name, "pass": bool(ok), "detail": "" if ok else str(detail)}
        )
        (EVIDENCE / "ui-results.json").write_text(json.dumps(results, indent=2))

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        context.add_init_script(PAD)
        page = context.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(URL)
        page.wait_for_function("window.__happy")
        page.wait_for_timeout(80)
        page.evaluate("__happy.game.stop()")

        def step(t=0.025):
            page.evaluate("(t)=>__happy.step(t)", t)

        def press(button=None, axes=None):
            page.evaluate(
                "({button,axes})=>{let p=__pads[0];p.buttons.forEach((b,i)=>{b.pressed=i===button;b.value=i===button?1:0});p.axes=axes||[0,0,0,0]}",
                {"button": button, "axes": axes},
            )
            step(0.25)
            page.evaluate(
                "__pads[0].buttons.forEach(b=>{b.pressed=false;b.value=0});__pads[0].axes=[0,0,0,0]"
            )
            step(0.05)
            page.wait_for_timeout(25)

        def click(a):
            page.locator(f'[data-action="{a}"]').first.click()
            page.wait_for_timeout(25)

        def focus():
            return page.evaluate(
                "document.activeElement?.dataset.action||document.activeElement?.dataset.setting||document.activeElement?.dataset.tune||document.activeElement?.id"
            )

        def state():
            return page.evaluate("__happy.snapshot()")

        check("file bundle opens at title", page.evaluate("__happy.screen") == "title")
        page.screenshot(path=str(EVIDENCE / "ui-title-tv.png"))
        press(13)
        check("standard pad moves title focus", focus() == "quick", focus())
        check(
            "last pad input updates visible menu glyphs",
            "✕" in page.locator(".footer").inner_text(),
            page.locator(".footer").inner_text(),
        )
        press(0)
        check(
            "standard pad confirms quick-play screen",
            page.evaluate("__happy.screen") == "quick",
        )
        press(15)
        check(
            "pad spatial focus reaches time trial",
            focus() in ("choose-trial", "choose-duel", "choose-free"),
            focus(),
        )

        # Pad-only reachability checks for every enabled choice on each common screen.
        def reachable(name):
            selector = "#ui button:not(:disabled),#ui input:not(:disabled):not([type=file]),#ui select,#ui textarea"
            all_actions = page.evaluate(
                "(sel)=>[...document.querySelectorAll(sel)].map(e=>e.dataset.action||e.dataset.setting||e.dataset.tune||e.id)",
                selector,
            )

            def current_index():
                return page.evaluate(
                    "(sel)=>[...document.querySelectorAll(sel)].indexOf(document.activeElement)",
                    selector,
                )

            seen = {current_index()}
            frontier = [current_index()]
            while frontier:
                current = frontier.pop()
                for b in [12, 13, 14, 15]:
                    page.evaluate(
                        "({sel,i})=>document.querySelectorAll(sel)[i]?.focus()",
                        {"sel": selector, "i": current},
                    )
                    press(b)
                    dest = current_index()
                    if dest not in seen:
                        seen.add(dest)
                        frontier.append(dest)
            missing = [name for i, name in enumerate(all_actions) if i not in seen]
            check(
                name + " pad directional graph reaches every control",
                not missing,
                missing,
            )

        reachable("quick play")
        click("choose-trial")
        reachable("setup")
        page.screenshot(path=str(EVIDENCE / "ui-setup-tv.png"))
        click("start")
        step(3.2)
        page.keyboard.down("Space")
        step(1.5)
        check(
            "keyboard brake holds car at rest",
            abs(page.evaluate("__happy.sim.cars[0].speed")) < 0.1,
            page.evaluate("__happy.sim.cars[0].speed"),
        )
        page.keyboard.up("Space")
        step(0.6)
        check(
            "keyboard release resumes auto acceleration",
            page.evaluate("__happy.sim.cars[0].speed") > 1,
        )
        page.evaluate("__happy.game.advance(.01,{draw:true})")
        page.screenshot(path=str(EVIDENCE / "ui-race-tv.png"))
        press(9)
        check(
            "Options opens local pause menu", page.evaluate("__happy.screen") == "pause"
        )
        before = page.evaluate("__happy.sim.t")
        step(2)
        check(
            "local pause freezes simulation", page.evaluate("__happy.sim.t") == before
        )
        reachable("pause")
        click("settings")
        reachable("settings")
        page.locator("[data-setting=glyphs]").select_option("xbox")
        check(
            "Xbox glyph selection changes saved setting",
            page.evaluate("__happy.settings.glyphs") == "xbox",
        )
        page.keyboard.press("Escape")
        press(9)
        step(0.15)
        check(
            "Xbox driving prompts follow pad input",
            "Y" in page.locator(".controlhint").inner_text(),
            page.locator(".controlhint").inner_text(),
        )
        page.evaluate("window.__savedPad=__pads[0];__pads=[]")
        step(0.05)
        check(
            "pad disconnect pauses local round safely",
            page.evaluate("__happy.screen") == "pause",
        )
        page.evaluate("__pads=[__savedPad]")
        press(9)
        check(
            "reconnected pad can resume without seat reassignment",
            page.evaluate("__happy.screen") == "driving",
        )
        press(9)
        click("dev")
        reachable("developer")
        slider = page.locator("[data-tune=speed]")
        old = page.evaluate("__happy.sim.tuning.speed")
        slider.focus()
        press(15)
        check(
            "pad changes live dev slider",
            page.evaluate("__happy.sim.tuning.speed") > old,
        )
        check("dev tuning marks run unranked", page.evaluate("__happy.sim.dev"))
        click("dev-reset")
        check(
            "dev reset restores defaults",
            page.evaluate("__happy.sim.tuning.speed") == 1,
        )
        click("dev-back")
        click("quit")
        click("multi")
        reachable("multiplayer")
        click("host")
        reachable("direct invitation")
        if page.locator("[data-action=import]").count():
            page.locator("[data-action=import]").focus()
            with page.expect_file_chooser() as chooser:
                press(0)
            chooser.value.set_files([])
            check("pad import action opens real file chooser", True)
        else:
            check(
                "pad import action opens real file chooser",
                False,
                "No focusable import action",
            )
        click("connection-back")
        click("join")
        reachable("direct reply")
        click("connection-back")
        click("back")
        click("credits")
        reachable("credits")
        check(
            "TV credits use readable large text",
            page.evaluate(
                'parseFloat(getComputedStyle(document.querySelector(".creditbody")).fontSize)'
            )
            >= 24,
        )
        page.screenshot(path=str(EVIDENCE / "ui-source-tv.png"))
        for i in range(5):
            click("credit-next")
            if i in [1, 2, 3]:
                page.screenshot(path=str(EVIDENCE / f"ui-feedback-{i}-tv.png"))
        check(
            "credits expose source and every feedback category",
            page.evaluate('document.querySelector(".eyebrow").textContent').endswith(
                "6 / 6"
            ),
        )
        click("back")
        # Deterministic inactivity boundary; stopped RAF keeps wall time out of assertions.
        saves = page.evaluate("JSON.stringify({...localStorage})")
        page.evaluate("__happy.setIdle(9.89)")
        step(0.009)
        check(
            "attract absent before 9.9 seconds", not page.evaluate("__happy.attracting")
        )
        step(0.12)
        check("attract begins after ten seconds", page.evaluate("__happy.attracting"))
        step(15)
        check(
            "attract does not write player saves",
            page.evaluate("JSON.stringify({...localStorage})") == saves,
        )
        page.keyboard.press("Enter")
        step(0.02)
        check(
            "keyboard exits attract and consumes confirm",
            page.evaluate("__happy.screen") == "title"
            and not page.evaluate("__happy.attracting"),
        )
        page.evaluate("__happy.setIdle(10)")
        step(0.01)
        press(0)
        check(
            "pad exits attract and consumes confirm",
            page.evaluate("__happy.screen") == "title"
            and not page.evaluate("__happy.attracting"),
        )
        page.mouse.move(250, 485)
        page.evaluate("__happy.setIdle(10)")
        step(0.01)
        page.mouse.click(250, 485)
        step(0.02)
        check(
            "stationary mouse click exits attract without activating a choice",
            page.evaluate("__happy.screen") == "title"
            and not page.evaluate("__happy.attracting"),
            page.evaluate("__happy.screen"),
        )
        if page.evaluate("__happy.screen") != "title":
            page.evaluate('__happy.action("quit")')
        page.evaluate("__happy.setIdle(10)")
        step(0.01)
        page.keyboard.press("KeyQ")
        step(0.02)
        check(
            "unbound keyboard input exits attract without an action",
            page.evaluate("__happy.screen") == "title"
            and not page.evaluate("__happy.attracting"),
        )
        page.evaluate("__happy.setIdle(10)")
        step(0.01)
        page.mouse.wheel(0, 120)
        step(0.02)
        check(
            "mouse wheel exits attract and consumes scroll",
            page.evaluate("__happy.screen") == "title"
            and not page.evaluate("__happy.attracting"),
        )
        # Confirm normal device changes restore keyboard prompts.
        page.keyboard.press("ArrowDown")
        page.wait_for_timeout(30)
        check(
            "keyboard input restores visible keyboard menu prompts",
            "Enter" in page.locator(".footer").inner_text(),
            page.locator(".footer").inner_text(),
        )
        press(13)
        page.mouse.move(350, 495)
        check(
            "mouse hover restores visible keyboard prompts",
            "Enter" in page.locator(".footer").inner_text(),
            page.locator(".footer").inner_text(),
        )
        check(
            "no uncaught UI runtime errors",
            not errors and not page.evaluate("__happy.errors"),
            errors or page.evaluate("__happy.errors"),
        )
        context.close()
        for name, width, height in [("landscape", 844, 390), ("portrait", 390, 844)]:
            ctx = browser.new_context(
                viewport={"width": width, "height": height},
                is_mobile=True,
                has_touch=True,
                device_scale_factor=1,
            )
            pg = ctx.new_page()
            pg.on("pageerror", lambda e: errors.append(str(e)))
            pg.goto(URL)
            pg.wait_for_function("window.__happy")
            pg.wait_for_timeout(50)
            pg.evaluate("__happy.game.stop()")
            pg.screenshot(path=str(EVIDENCE / f"ui-touch-{name}-title.png"))
            pg.locator("[data-action=quick]").tap()
            pg.locator("[data-action=choose-trial]").tap()
            pg.screenshot(path=str(EVIDENCE / f"ui-touch-{name}-setup.png"))
            box = pg.locator("[data-action=start]").bounding_box()
            check(
                f"touch {name} setup has a reachable drive control",
                box and box["width"] > 100,
                box,
            )
            # Use physical touch gestures to check menu scrolling rather than locator auto-scroll.
            if name == "portrait":
                initial = pg.evaluate('document.querySelector(".screen").scrollTop')
                client = ctx.new_cdp_session(pg)
                client.send(
                    "Input.dispatchTouchEvent",
                    {
                        "type": "touchStart",
                        "touchPoints": [{"x": width / 2, "y": height * 0.8}],
                    },
                )
                for fraction in [0.7, 0.6, 0.5, 0.4, 0.3, 0.2]:
                    client.send(
                        "Input.dispatchTouchEvent",
                        {
                            "type": "touchMove",
                            "touchPoints": [{"x": width / 2, "y": height * fraction}],
                        },
                    )
                client.send(
                    "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
                )
                pg.wait_for_timeout(100)
                after = pg.evaluate('document.querySelector(".screen").scrollTop')
                check(
                    "portrait touch gesture scrolls setup to offscreen controls",
                    after > initial,
                    {"before": initial, "after": after},
                )
            pg.locator("[data-action=start]").tap()
            pg.evaluate("__happy.step(3.3);__happy.game.advance(.01,{draw:true})")
            check(
                f"touch {name} driving prompts use touch gestures",
                "Hold right" in pg.locator(".controlhint").inner_text(),
                pg.locator(".controlhint").inner_text(),
            )
            angle_before = pg.evaluate("__happy.sim.cars[0].angle")
            pg.screenshot(path=str(EVIDENCE / f"ui-touch-{name}-race.png"))
            client = ctx.new_cdp_session(pg)
            client.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchStart",
                    "touchPoints": [
                        {"id": 1, "x": width * 0.2, "y": height * 0.72},
                        {"id": 2, "x": width * 0.8, "y": height * 0.72},
                    ],
                },
            )
            client.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchMove",
                    "touchPoints": [
                        {"id": 1, "x": width * 0.2 + 70, "y": height * 0.72},
                        {"id": 2, "x": width * 0.8, "y": height * 0.72},
                    ],
                },
            )
            pg.evaluate("__happy.step(.5)")
            c = pg.evaluate(
                "({speed:__happy.sim.cars[0].speed,angle:__happy.sim.cars[0].angle})"
            )
            check(
                f"touch {name} simultaneous brake stops car", abs(c["speed"]) < 0.1, c
            )
            check(
                f"touch {name} simultaneous steering changes heading",
                abs(c["angle"] - angle_before) > 0.03,
                c,
            )
            client.send(
                "Input.dispatchTouchEvent", {"type": "touchCancel", "touchPoints": []}
            )
            pg.evaluate("__happy.step(.5)")
            check(
                f"touch {name} cancellation releases brake",
                pg.evaluate("__happy.sim.cars[0].speed") > 1,
            )
            pg.locator("[data-action=pause]").tap()
            check(
                f"touch {name} pause menu works",
                pg.evaluate("__happy.screen") == "pause",
            )
            pg.locator("[data-action=quit]").tap()
            pg.evaluate("__happy.setIdle(10);__happy.step(.02)")
            pg.touchscreen.tap(width * 0.3, height * 0.48)
            pg.evaluate("__happy.step(.02)")
            check(
                f"touch {name} exits attract with consumed input",
                pg.evaluate("__happy.screen") == "title"
                and not pg.evaluate("__happy.attracting"),
                pg.evaluate("__happy.screen"),
            )
            ctx.close()
        browser.close()
        webkit = p.webkit.launch(headless=True)
        ctx = webkit.new_context(
            viewport={"width": 844, "height": 390}, is_mobile=True, has_touch=True
        )
        pg = ctx.new_page()
        wk_errors = []
        pg.on("pageerror", lambda e: wk_errors.append(str(e)))
        pg.goto(URL)
        pg.wait_for_function("window.__happy")
        pg.wait_for_timeout(80)
        pg.evaluate("__happy.game.stop()")
        check(
            "WebKit final file boots and renders title",
            pg.evaluate("__happy.screen") == "title" and pg.locator("h1").is_visible(),
        )
        pg.locator("[data-action=quick]").tap()
        pg.locator("[data-action=choose-trial]").tap()
        pg.locator("[data-action=start]").tap()
        pg.evaluate("__happy.step(3.4);__happy.game.advance(.01,{draw:true})")
        pg.screenshot(path=str(EVIDENCE / "ui-webkit-race.png"))
        check(
            "WebKit touch starts live driving",
            pg.evaluate("__happy.screen") == "driving"
            and pg.evaluate("__happy.sim.cars[0].speed") > 0,
        )
        pg.locator("[data-action=pause]").tap()
        check(
            "WebKit touch pause and renderer stay error free",
            pg.evaluate("__happy.screen") == "pause"
            and not wk_errors
            and not pg.evaluate("__happy.errors"),
            wk_errors,
        )
        ctx.close()
        webkit.close()
    (EVIDENCE / "ui-results.json").write_text(json.dumps(results, indent=2))
    (EVIDENCE / "ui-runtime-errors.json").write_text(json.dumps(errors, indent=2))
    return results


if __name__ == "__main__":
    print(json.dumps(run()))
