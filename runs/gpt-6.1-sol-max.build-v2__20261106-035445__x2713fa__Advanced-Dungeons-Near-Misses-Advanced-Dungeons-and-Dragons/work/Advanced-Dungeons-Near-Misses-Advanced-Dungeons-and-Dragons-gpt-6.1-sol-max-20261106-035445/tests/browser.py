"""Final-file integration and presentation checks; mutations are isolated developer fixtures."""

import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from audio_browser import run as audio_checks

ROOT = Path(__file__).resolve().parents[1]
IDENTITY = json.loads((ROOT / "identity.json").read_text())
URL = (ROOT.parent / IDENTITY["html"]).as_uri()
PAD = """window.__pad={on:false,axes:[0,0,0,0],buttons:Array(17).fill(false)};navigator.getGamepads=()=>window.__pad.on?[{index:0,id:'DualSense Wireless Controller',mapping:'standard',connected:true,axes:window.__pad.axes,buttons:window.__pad.buttons.map(pressed=>({pressed,value:pressed?1:0,touched:pressed}))}]:[];"""


def run():
    count = 0

    def check(value, message):
        nonlocal count
        assert value, message
        count += 1

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        context.add_init_script(PAD)
        page = context.new_page()
        errors = []
        requests = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("request", lambda request: requests.append(request.url))
        page.goto(URL)
        page.wait_for_function("window.__NM?.ready")
        check(
            page.evaluate(
                "document.body.dataset.game === 'near-misses-20261106-035445'"
            ),
            "Final artifact identity",
        )
        check(page.title() == IDENTITY["title"], "Exact random title")
        page.get_by_role("button", name="Settings", exact=True).hover()
        check(
            page.evaluate("document.activeElement.textContent") == "SETTINGS"
            or page.evaluate("document.activeElement.textContent") == "Settings",
            "Mouse hover moves menu focus",
        )
        check(
            page.evaluate(
                'document.head.querySelectorAll("script")[0].textContent.includes("aihub-session 1.4.0")'
            ),
            "Unmodified session client first",
        )
        check(
            page.locator('meta[name="hub:session-players"]').get_attribute("content")
            == "1-2",
            "Declared two-player seats",
        )
        check(
            page.get_by_role(
                "button", name="Continue expedition", exact=True
            ).is_disabled(),
            "No invented continue",
        )
        page.get_by_role("button", name="About & credits", exact=True).click()
        check(
            page.get_by_role(
                "heading", name="Source Information", exact=True
            ).is_visible(),
            "In-game Source Information populated",
        )
        for title in ["Testing Feedback", "Engine Feedback", "Prompt Feedback"]:
            page.get_by_role("button", name=title, exact=True).click()
            check(
                page.get_by_role("heading", name=title, exact=True).is_visible(),
                "In-game " + title + " populated",
            )
        page.evaluate("__NM.ui.title()")
        page.get_by_role("button", name="Two rangers", exact=True).click()
        page.get_by_role("button", name="Online · join expedition", exact=True).click()
        page.get_by_role("button", name="Open text fallback", exact=True).click()
        page.get_by_role("textbox", name="Pairing text", exact=True).fill(
            "not-an-invitation"
        )
        page.get_by_role("button", name="Use pasted text", exact=True).click()
        check(
            page.get_by_role("textbox", name="Pairing text", exact=True).is_visible()
            and not page.evaluate("__NM.net.connected"),
            "Malformed manual pairing remains safe and editable",
        )
        page.get_by_role("button", name="Cancel", exact=True).click()
        check(
            page.evaluate('__NM.ui.shell.screen === "title" && !__NM.pairing'),
            "Pairing cancel restores ordinary menu",
        )

        boxes = page.locator(".esh-btns button").evaluate_all(
            "(buttons)=>buttons.map(b=>{let r=b.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right}})"
        )
        check(
            all(
                b["top"] >= 0
                and b["bottom"] <= 1080
                and b["left"] >= 0
                and b["right"] <= 1920
                for b in boxes
            ),
            "TV title actions fit viewport",
        )
        page.screenshot(path=str(ROOT / "tests/title-tv.png"))
        page.get_by_role("button", name="New expedition", exact=True).click()
        page.get_by_role("button", name="Chalk Burrows", exact=True).click()
        page.wait_for_function(
            '__NM.sim.state.mode === "cave" && !__NM.ui.shell.screen'
        )
        check(page.evaluate("__NM.sim.state.party.ammo") == 3, "Three initial arrows")
        initial_x = page.evaluate("__NM.sim.state.players[0].x")
        page.keyboard.down("d")
        page.wait_for_function(f"__NM.sim.state.players[0].x > {initial_x + 9}")
        page.keyboard.up("d")
        check(
            page.evaluate("__NM.sim.state.players[0].x") > initial_x,
            "Expected WASD movement",
        )
        page.mouse.move(1450, 540)
        page.wait_for_timeout(100)
        page.mouse.down()
        page.wait_for_timeout(700)
        page.mouse.up()
        check(
            page.evaluate("__NM.sim.state.stats.shots") == 1,
            "Held mouse produces one intentional arrow",
        )
        check(
            page.evaluate("Math.abs(__NM.sim.state.players[0].angle) < .8"),
            "Mouse aim projects to ground",
        )
        check(
            abs(page.evaluate("__NM.game.audio.musicVolume") - 0.1) < 0.00001,
            "Music defaults to one effective 10 percent bus",
        )
        page.screenshot(path=str(ROOT / "tests/cave-tv.png"))
        page.keyboard.press("Escape")
        page.wait_for_function('__NM.game.paused && __NM.ui.shell.screen === "pause"')
        tick = page.evaluate("__NM.sim.state.tick")
        page.wait_for_timeout(180)
        check(
            page.evaluate("__NM.sim.state.tick") == tick,
            "Solo pause stops authoritative simulation",
        )
        page.get_by_role("button", name="Developer tools", exact=True).click()
        check(
            page.get_by_role("button", name="Balance sliders", exact=True).is_visible(),
            "Developer tools reachable from pause",
        )
        save_before_dev = page.evaluate("localStorage.getItem(__NM.save.key)")
        page.get_by_role("button", name="Balance sliders", exact=True).click()
        page.get_by_role("button", name="Movement", exact=True).click()
        slider = page.get_by_role("slider", name="Walking speed", exact=True)
        slider.fill("62")
        slider.dispatch_event("input")
        check(
            page.evaluate("__NM.sim.config.moveSpeed") == 62,
            "Live tuning reaches existing simulation",
        )
        check(
            page.evaluate("__NM.sim.state.stats.assisted"),
            "Developer changes mark assistance",
        )
        page.evaluate("__NM.saveNow()")
        check(
            page.evaluate("localStorage.getItem(__NM.save.key)") == save_before_dev,
            "Developer changes do not overwrite campaign",
        )
        page.evaluate("__NM.ui.tuning()")
        page.get_by_role("button", name="Reset all to defaults", exact=True).click()
        check(
            page.evaluate(
                "JSON.stringify(__NM.sim.config) === JSON.stringify(NM.DEFAULTS)"
            ),
            "All live defaults reset together",
        )
        page.evaluate('__NM.game.input.rebind("dodge","keys","KeyQ")')
        check(
            page.evaluate('__NM.game.input.label("dodge")') == "Q",
            "Rebinding updates prompt",
        )
        page.evaluate("__NM.game.input.resetBindings()")
        page.evaluate("__NM.ui.shell.hide(); __NM.game.resume()")
        page.evaluate("__pad.on=true;__pad.axes=[.7,0,0,0]")
        old_x = page.evaluate("__NM.sim.state.players[0].x")
        page.wait_for_function(f"__NM.sim.state.players[0].x > {old_x + 5}")
        page.evaluate("__pad.axes=[0,0,0,0]")
        check(
            page.evaluate("__NM.game.input.lastDevice") == "gamepad",
            "Standard pad switches meaningful prompts",
        )
        check(
            page.evaluate('__NM.game.input.label("interact")') in ("✕", "×", "Cross"),
            "PlayStation prompt default",
        )
        page.evaluate('__NM.game.settings.set("glyphs","xbox")')
        check(
            page.evaluate('__NM.game.input.label("interact")') == "A",
            "Xbox glyph preference",
        )
        page.evaluate("__pad.on=false")
        page.wait_for_timeout(100)
        check(
            page.evaluate("__NM.game.input.padMove.every(v=>v===0)"),
            "Unplug clears held pad movement",
        )
        # Continue uses the legitimate saved entry, not the developer fixture.
        page.reload()
        page.wait_for_function("window.__NM?.ready")
        check(
            page.get_by_role(
                "button", name="Continue expedition", exact=True
            ).is_enabled(),
            "Continue available after committed checkpoint",
        )
        page.get_by_role("button", name="Continue expedition", exact=True).click()
        page.wait_for_function('__NM.playing && __NM.sim.state.mode === "cave"')
        check(
            page.evaluate("__NM.sim.state.party.ammo") == 3,
            "Saved quiver and enemy state reload atomically",
        )
        check(
            page.evaluate("!__NM.sim.state.stats.assisted"),
            "Developer fixture did not contaminate saved run",
        )
        # Couch assignment uses the engine device claims, capped at two rangers.
        page.evaluate('__NM.start({local:true});__NM.travel("chalk")')
        page.wait_for_function(
            '__NM.sim.state.mode === "cave" && !__NM.ui.shell.screen'
        )
        check(
            page.evaluate(
                "__NM.sim.state.players.length === 2 && __NM.game.players.length === 2"
            ),
            "Couch two-seat lifecycle",
        )
        positions = page.evaluate("__NM.sim.state.players.map(p=>p.x)")
        page.keyboard.down("d")
        page.wait_for_timeout(180)
        page.keyboard.up("d")
        moved = page.evaluate("__NM.sim.state.players.map(p=>p.x)")
        check(
            moved[0] > positions[0] and abs(moved[1] - positions[1]) < 0.01,
            "Keyboard owns ranger1 only",
        )
        page.evaluate("__pad.on=true;__pad.axes=[.7,0,0,0]")
        page.wait_for_timeout(200)
        moved2 = page.evaluate("__NM.sim.state.players.map(p=>p.x)")
        page.evaluate("__pad.axes=[0,0,0,0];__pad.on=false")
        check(
            moved2[1] > moved[1] and abs(moved2[0] - moved[0]) < 1,
            "Claimed controller owns ranger2 only",
        )
        page.evaluate(
            "__NM.ui.shell.hide();__NM.game.resume();__NM.sim.removePlayer(2);__NM.game.removePlayer(2);__NM.game.allowJoin(false);__NM.game.pause()"
        )
        page.wait_for_function('__NM.ui.shell.screen === "pause"')
        page.get_by_role("button", name="Add local companion", exact=True).click()
        check(
            page.evaluate(
                "__NM.sim.state.players.length === 2 && __NM.game.players.length === 2"
            ),
            "Manual couch join survives a previous remote-style device lifecycle",
        )
        # Isolated attract uses real engine fixed stepping; no gameplay mutation proves a clear.
        page.evaluate("__NM.game.stop();__NM.ui.title();__NM.idleAt=__NM.game.real")
        checksum = page.evaluate("localStorage.getItem(__NM.save.key)")
        page.evaluate("__NM.game.advance(9.9,{draw:false})")
        check(
            not page.evaluate("__NM.attract"),
            "Attract does not start before ten seconds",
        )
        page.evaluate("__NM.game.advance(.2,{draw:false})")
        check(page.evaluate("__NM.attract"), "Ten-second idle launches attract")
        page.evaluate("__NM.game.advance(20,{draw:false})")
        check(
            page.evaluate('__NM.demo.state.party.tools.includes("boat")'),
            "Attract reaches tool-opening beat",
        )
        check(
            page.evaluate("localStorage.getItem(__NM.save.key)") == checksum,
            "Attract save checksum unchanged",
        )
        check(
            page.evaluate("__NM.net.diagnostics.sent") == 0,
            "Attract opens no transport",
        )
        page.keyboard.press("Space")
        page.evaluate("__NM.game.advance(.05,{draw:false})")
        check(
            page.evaluate(
                '!__NM.attract && !__NM.playing && __NM.ui.shell.screen === "title"'
            ),
            "Dismiss input consumed before New or Fire",
        )
        # Purposeful visual fixtures, clearly separate from the honest playthrough.
        page.evaluate(
            '__NM.start();__NM.game.note("",0);__NM.sim.assist();__NM.sim.dev.infiniteHealth=true;__NM.sim.loadCave(3);__NM.sim.state.players[0].x=715;__NM.sim.state.players[0].y=360;__NM.sim.state.players[0].invuln=0;__NM.sim.updateVisibility();__NM.ui.lastMode=null;__NM.game.advance(.2,{draw:true})'
        )
        page.screenshot(path=str(ROOT / "tests/guardian-amber.png"))
        page.evaluate(
            "__NM.sim.loadCave(4);__NM.sim.state.players[0].x=715;__NM.sim.state.players[0].y=385;__NM.sim.state.players[0].invuln=0;__NM.sim.updateVisibility();__NM.ui.lastMode=null;__NM.game.advance(.2,{draw:true})"
        )
        page.screenshot(path=str(ROOT / "tests/guardian-blue.png"))
        page.evaluate(
            '__NM.sim.state.party.halves=["dawn","dusk"];__NM.sim.win();__NM.game.advance(.1,{draw:true})'
        )
        page.screenshot(path=str(ROOT / "tests/results-tv.png"))
        check(
            page.get_by_role("dialog").get_by_role("heading").inner_text()
            == "The sky remembers.",
            "Populated victory resolution",
        )
        check(
            not errors and not page.evaluate("__NM.game.errors.length"),
            f"No final-file runtime errors: {errors}",
        )
        check(
            all(url.startswith("file:") or url.startswith("data:") for url in requests),
            "No external assets or audio requests",
        )
        context.close()
        # Real mobile browser touch events through CDP, including multitouch ownership and cancel.
        phone_context = browser.new_context(**p.devices["iPhone 13"])
        phone = phone_context.new_page()
        phone.goto(URL)
        phone.wait_for_function("window.__NM?.ready")
        phone.get_by_role("button", name="New expedition", exact=True).tap()
        phone.get_by_role("button", name="Chalk Burrows", exact=True).tap()
        phone.wait_for_function(
            '__NM.sim.state.mode === "cave" && !__NM.ui.shell.screen'
        )
        cdp = phone_context.new_cdp_session(phone)
        x0 = phone.evaluate("__NM.sim.state.players[0].x")
        cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchStart", "touchPoints": [{"x": 70, "y": 560, "id": 1}]},
        )
        cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchMove", "touchPoints": [{"x": 122, "y": 560, "id": 1}]},
        )
        phone.wait_for_timeout(300)
        check(
            phone.evaluate("__NM.sim.state.players[0].x") > x0 + 3,
            "Invisible left thumb moves ranger",
        )
        cdp.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchStart",
                "touchPoints": [
                    {"x": 122, "y": 560, "id": 1},
                    {"x": 310, "y": 540, "id": 2},
                ],
            },
        )
        phone.wait_for_timeout(80)
        cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchEnd", "touchPoints": [{"x": 310, "y": 540, "id": 2}]},
        )
        phone.wait_for_function("__NM.sim.state.stats.shots === 1")
        check(
            phone.evaluate("__NM.controls.fingers.size") == 1,
            "Right release retains left pointer ownership",
        )
        cdp.send("Input.dispatchTouchEvent", {"type": "touchCancel", "touchPoints": []})
        phone.wait_for_timeout(70)
        check(
            phone.evaluate(
                "__NM.controls.touchMove.every(v=>v===0) && __NM.controls.fingers.size===0"
            ),
            "Pointer cancellation releases movement",
        )
        check(
            phone.evaluate('document.querySelectorAll(".nm-pairtext").length') == 0,
            "Touch play has no permanent pairing or button panel",
        )
        phone.screenshot(path=str(ROOT / "tests/touch-portrait.png"))
        phone.set_viewport_size({"width": 844, "height": 390})
        phone.wait_for_timeout(120)
        check(
            phone.evaluate("__NM.controls.fingers.size") == 0,
            "Orientation change clears pointers",
        )
        check(
            phone.evaluate("__NM.game.errors.length") == 0,
            "Touch layout draws without errors",
        )
        phone_context.close()
        count += audio_checks(browser)
        browser.close()
        # Secondary renderer/storage path; no real iOS certification is claimed.
        secondary = p.webkit.launch(headless=True)
        web_page = secondary.new_page(viewport={"width": 1280, "height": 720})
        web_page.goto(URL)
        web_page.wait_for_function("window.__NM?.ready")
        check(web_page.evaluate("__NM.game.errors.length") == 0, "WebKit file startup")
        web_page.get_by_role("button", name="New expedition", exact=True).click()
        web_page.get_by_role("button", name="Chalk Burrows", exact=True).click()
        web_page.wait_for_function('__NM.sim.state.mode === "cave"')
        check(
            web_page.evaluate("__NM.game.errors.length") == 0,
            "WebKit native cave rendering",
        )
        secondary.close()
    (ROOT / "docs/browser-report.json").write_text(
        json.dumps(
            {
                "checks": count,
                "errors": errors,
                "scope": "Final file Chromium TV and touch emulation, WebKit, engine inputs, storage, attract, developer sliders, code audio",
            },
            indent=2,
        )
    )
    return count


if __name__ == "__main__":
    print(json.dumps({"checks": run()}))
