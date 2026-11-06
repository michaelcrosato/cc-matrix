"""Public-UI/input verification of the actual portable HTML. No simulation shortcuts.
The root verifier invokes this script; all detailed evidence stays in tests/browser-result.json.
"""

import json
import os
import re
import shutil
import subprocess
import sys
import traceback
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
IDENTITY = json.loads((ROOT / "identity.json").read_text())
ARTIFACT = ROOT.parent / (IDENTITY["slug"] + ".html")
OUT = ROOT / "tests/browser-evidence"
OUT.mkdir(exist_ok=True)
RESULT = {"cases": [], "assertions": 0, "failures": [], "limitations": []}
PAD_STUB = """window.__pads=[];Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pads,configurable:true});window.__makePad=(index=0)=>({id:'DualSense Wireless Controller (test stub)',index,connected:true,mapping:'standard',timestamp:1,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0})),vibrationActuator:null});"""


def check(ok, message):
    RESULT["assertions"] += 1
    if not ok:
        raise AssertionError(message)


def advance(page, seconds=0.1, draw=True):
    return page.evaluate(
        "([seconds,draw])=>game.advance(seconds,{draw})", [seconds, draw]
    )


def key(page, code, seconds=0.08):
    page.keyboard.down(code)
    advance(page, seconds)
    page.keyboard.up(code)
    advance(page, 0.05)


def pad(page, index, button, seconds=0.06):
    page.evaluate(
        "([i,b])=>{__pads[i].buttons[b]={pressed:true,touched:true,value:1};__pads[i].timestamp++}",
        [index, button],
    )
    advance(page, seconds)
    page.evaluate(
        "([i,b])=>{__pads[i].buttons[b]={pressed:false,touched:false,value:0};__pads[i].timestamp++}",
        [index, button],
    )
    advance(page, 0.05)


def click(page, name):
    page.locator(".esh-sh").get_by_role("button", name=name, exact=True).click()
    advance(page, 0.32)


def state(page):
    return page.evaluate("__bomber.sim.snapshot()")


def open_game(browser, **options):
    context = browser.new_context(viewport={"width": 1920, "height": 1080}, **options)
    context.add_init_script(PAD_STUB)
    page = context.new_page()
    errors = []
    requests = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on(
        "requestfailed", lambda r: requests.append({"url": r.url, "failure": r.failure})
    )
    page.goto(ARTIFACT.as_uri() + "?backend=webgl", wait_until="load")
    page.wait_for_function(
        "window.__bomber?.ready || window.__bomber?.error", timeout=90000
    )
    check(page.evaluate("__bomber.ready"), "Packaged game booted")
    page.wait_for_function('game.sceneName==="title"', timeout=15000)
    page.wait_for_timeout(350)
    page.evaluate("game.stop()")
    advance(page, 0.15)
    return context, page, errors, requests


def launch(page):
    click(page, "Fly a sortie")
    click(page, "Launch sortie")
    advance(page, 0.4)
    check(page.evaluate("game.sceneName") == "play", "Public launch enters flight")


def presented_frames(page, count=2):
    old = page.evaluate("__bomber.view.world.stats.frames")
    panes = page.evaluate("Math.max(1,game.viewports.length)")
    page.wait_for_function(
        "(n)=>__bomber.view.world.stats.frames>=n",
        arg=old + count * panes,
        timeout=10000,
    )
    page.evaluate(
        "()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))"
    )


def foreground_retained(page, label, solo=False):
    presented_frames(page)
    page.evaluate("My3D2dge.World3D.renderer.backend.gl?.finish()")
    path = OUT / f"{label}.png"
    page.screenshot(path=str(path))
    samples = (
        [
            ("nose canopy", "40x140+680+200", 0.08),
            ("pilot instrument", "48x48+1020+955", 0.4),
        ]
        if not solo
        else [("solo nose canopy", "110x160+370+430", 0.08)]
    )
    for part, region, minimum in samples:
        value = subprocess.check_output(
            [
                "magick",
                str(path),
                "-crop",
                region,
                "+repage",
                "-colorspace",
                "Gray",
                "-threshold",
                "18%",
                "-format",
                "%[fx:mean]",
                "info:",
            ],
            text=True,
        )
        ink = 1 - float(value)
        check(ink > minimum, f"{label}: {part} retained in rendered pixels ({ink:.3f})")


def no_errors(page, errors, requests):
    check(not errors, "No browser errors: " + str(errors[:2]))
    check(not page.evaluate("game.errors"), "No engine errors")
    check(not requests, "No missing asset/dependency requests")


def run(name, fn):
    try:
        info = fn() or {}
        RESULT["cases"].append({"name": name, "pass": True, **info})
    except Exception as exc:  # noqa: BLE001 - Record each independent scenario failure.
        text = f"{name}: {type(exc).__name__}: {exc}"
        RESULT["failures"].append(text)
        RESULT["cases"].append(
            {"name": name, "pass": False, "trace": traceback.format_exc()}
        )
        print("FAIL " + text)


def menus(browser):
    context, page, errors, requests = open_game(browser)
    try:
        check(page.title() == IDENTITY["title"], "Artifact title matches deliverable")
        check(
            page.evaluate("My3D2dge.World3D.backend") == "WebGL 2",
            "Native WebGL2 backend selected",
        )
        check(
            abs(page.evaluate("game.settings.music") - 0.1) < 1e-9,
            "First-run music defaults to10%",
        )
        key(page, "Escape")
        advance(page, 0.3)
        check(
            page.evaluate("__bomber.ui.shell.screen") == "title"
            and page.get_by_role("button", name="Fly a sortie", exact=True).count()
            == 1,
            "Title Escape preserves an accessible Play menu",
        )
        page.evaluate("__pads=[__makePad(0)]")
        pad(page, 0, 1)
        advance(page, 0.3)
        check(
            page.evaluate("__bomber.ui.shell.screen") == "title"
            and page.get_by_role("button", name="Fly a sortie", exact=True).count()
            == 1,
            "Title Circle preserves an accessible Play menu",
        )
        pad(page, 0, 9)
        advance(page, 0.3)
        check(
            page.evaluate("__bomber.ui.shell.screen") == "title"
            and page.get_by_role("button", name="Fly a sortie", exact=True).count()
            == 1,
            "Title Options preserves an accessible Play menu",
        )
        page.screenshot(path=str(OUT / "title-tv.png"))
        click(page, "Settings")
        check(
            page.evaluate("__bomber.ui.shell.screen") == "preferences",
            "Settings use filtered preferences",
        )
        check(
            not page.get_by_label("Fighter accuracy", exact=True).count(),
            "Normal settings do not expose developer tuning",
        )
        slider = page.get_by_label("Aim sensitivity", exact=True)
        slider.focus()
        before = page.evaluate("game.settings.aimSensitivity")
        key(page, "ArrowRight")
        check(
            page.evaluate("game.settings.aimSensitivity") > before,
            "Keyboard adjusts native live slider",
        )
        key(page, "Escape")
        check(
            page.evaluate("__bomber.ui.shell.screen") == "title",
            "Settings Escape back restores title without recursion",
        )
        click(page, "About / Credits")
        for tab in [
            "Source Information",
            "Testing Feedback",
            "Engine Feedback",
            "Prompt Feedback",
        ]:
            click(page, tab)
            check(
                page.get_by_role("heading", name=tab, exact=True).count() == 1,
                "Credits tab " + tab,
            )
        key(page, "Escape")
        check(
            page.evaluate("__bomber.ui.shell.screen") == "title",
            "About back restores title",
        )
        # Hover changes focus through native shell-compatible extension.
        page.get_by_role("button", name="Practice", exact=True).hover()
        check(
            page.evaluate("document.activeElement.textContent") == "Practice",
            "Pointer hover moves menu focus",
        )
        click(page, "Fly a sortie")
        page.wait_for_timeout(350)
        page.screenshot(path=str(OUT / "briefing-tv.png"))
        check(
            page.locator(".map-board svg").count() == 1,
            "Interactive briefing chart exists",
        )
        page.locator('[data-target="battery"]').click()
        check(
            "CLIFF BATTERY" in page.locator(".brief-copy h3").inner_text(),
            "Map target preview responds to pointer",
        )
        click(page, "Launch sortie")
        advance(page, 0.35)
        check(
            page.evaluate("game.sceneName") == "play",
            "Restored title still launches normal sortie",
        )
        key(page, "Escape")
        click(page, "Leave sortie")
        click(page, "End and debrief")
        check(
            page.evaluate("__bomber.ui.shell.screen") == "results",
            "Public manual end opens debrief",
        )
        for label, button in [("Escape", None), ("Options", 9), ("Circle", 1)]:
            if button is None:
                key(page, "Escape")
            else:
                pad(page, 0, button)
            advance(page, 0.3)
            check(
                page.evaluate("__bomber.ui.shell.screen") == "results"
                and page.get_by_role(
                    "button", name="Repair, rearm & fly again", exact=True
                ).count()
                == 1,
                "Debrief " + label + " retains accessible retry",
            )
        click(page, "Review briefing")
        check(
            page.evaluate("__bomber.ui.shell.screen") == "brief",
            "Review briefing survives queued title enter",
        )
        check(
            page.get_by_role("button", name="Launch sortie", exact=True).count() == 1,
            "Reviewed briefing can launch",
        )
        click(page, "Launch sortie")
        advance(page, 0.35)
        check(
            state(page)["practice"] is None and state(page)["phase"] == "launch",
            "Reviewed briefing starts a normal repaired sortie",
        )
        key(page, "Escape")
        click(page, "Leave sortie")
        click(page, "End and debrief")
        seed = state(page)["seed"]
        click(page, "Repair, rearm & fly again")
        check(
            state(page)["phase"] == "launch"
            and state(page)["aircraft"]["hull"] == 100
            and state(page)["bombsLeft"] > 0,
            "Debrief retry repairs and rearms actual shared aircraft",
        )
        check(
            state(page)["seed"] != seed, "Debrief retry creates a fresh encounter seed"
        )
        no_errors(page, errors, requests)
    finally:
        context.close()


def pause_dev(browser):
    context, page, errors, requests = open_game(browser)
    try:
        launch(page)
        advance(page, 25)
        key(page, "Escape")
        check(page.evaluate("game.paused"), "Escape pauses standalone")
        before = state(page)["t"]
        advance(page, 2)
        check(
            abs(state(page)["t"] - before) < 1e-8,
            "Standalone shared simulation freezes while paused",
        )
        click(page, "Mission map")
        check(
            page.evaluate("__bomber.ui.shell.screen") == "navigation",
            "Pause→map remains open",
        )
        before = state(page)["t"]
        advance(page, 1)
        check(state(page)["t"] > before + 0.9, "Map continues actual flight and fuel")
        click(page, "Back to station")
        check(
            not page.evaluate("__bomber.ui.shell.screen"), "Map back restores station"
        )
        key(page, "Escape")
        click(page, "Dev mode")
        check(state(page)["cheated"], "Opening dev tools visibly marks run")
        slider = page.get_by_label("Fuel burn", exact=True)
        slider.evaluate(
            '(e)=>{e.value=1.7;e.dispatchEvent(new Event("input",{bubbles:true}));}'
        )
        check(
            abs(page.evaluate("__bomber.sim.balance.fuelConsumption") - 1.7) < 1e-7,
            "Dev slider changes real fuel tuning",
        )
        click(page, "Reset tuning")
        check(
            abs(page.evaluate("__bomber.sim.balance.fuelConsumption") - 1) < 1e-7,
            "Reset restores canonical dependent tuning",
        )
        click(page, "Start engine fire")
        check(
            state(page)["aircraft"]["fire"] > 0,
            "Dev fire applies subsystem consequence",
        )
        click(page, "Repair all systems")
        check(state(page)["aircraft"]["fire"] == 0, "Repair clears real fire")
        click(page, "Spawn nose fighter")
        check(
            any(e["alive"] for e in state(page)["enemies"]),
            "Dev fighter spawns real enemy",
        )
        click(page, "Spawn flak danger")
        check(len(state(page)["flak"]) > 0, "Dev flak spawns real danger")
        click(page, "Jump: bomb approach")
        check(
            state(page)["aircraft"]["x"] == 312000,
            "Beat jump reaches authored approach",
        )
        # State export runs through actual in-game download action.
        with page.expect_download() as download:
            page.get_by_role("button", name="Export state JSON", exact=True).click()
        path = OUT / "exported-state.json"
        download.value.save_as(path)
        exported = json.loads(path.read_text())
        check(
            exported["version"] == 1 and exported["cheated"],
            "Dev state download parses and marks test",
        )
        click(page, "Mission authoring")
        check(page.locator("#edit-x").count() == 1, "Finished mission editor opens")
        page.locator("#edit-x").fill("21240")
        page.locator("#edit-y").fill("1120")
        click(page, "Apply waypoint & associated target")
        check(
            page.evaluate("__bomber.sim.definition.waypoints.harbor.x") == 21240 * 16,
            "Mission editor applies real world units",
        )
        with page.expect_download() as download:
            page.get_by_role("button", name="Export mission JSON", exact=True).click()
        path = OUT / "exported-mission.json"
        download.value.save_as(path)
        definition = json.loads(path.read_text())
        check(
            definition["waypoints"]["harbor"]["x"] == 21240 * 16,
            "Mission export preserves edits",
        )
        key(page, "Escape")
        check(
            page.evaluate("__bomber.ui.shell.screen") == "dev",
            "Editor back restores developer desk",
        )
        click(page, "Free camera: OFF")
        click(page, "Resume test flight")
        advance(page, 0.2)
        pose = page.evaluate("__bomber.view.freePose")
        check(bool(pose), "Free camera has independent persistent pose")
        key(page, "w", 0.5)
        after = page.evaluate("__bomber.view.freePose")
        check(
            abs(after["x"] - pose["x"])
            + abs(after["y"] - pose["y"])
            + abs(after["z"] - pose["z"])
            > 100,
            "Developer free camera translates with public input",
        )
        page.screenshot(path=str(OUT / "dev-free-camera.png"))
        no_errors(page, errors, requests)
    finally:
        context.close()


def attract(browser):
    context, page, errors, requests = open_game(browser)
    try:
        initial = page.evaluate(
            "({music:game.settings.music,glyphs:game.settings.glyphs})"
        )
        advance(page, 10.2)
        check(page.evaluate("__bomber.attract"), "Attract starts after10 seconds idle")
        check(
            not page.locator("#attract-label").is_hidden(),
            "Attract is visibly labeled demonstration",
        )
        key(page, "Enter")
        check(
            not page.evaluate("__bomber.attract"), "Keyboard exits attract immediately"
        )
        check(
            page.evaluate("__bomber.ui.shell.screen") == "title",
            "Exit key is consumed before title selection",
        )
        check(
            page.evaluate("({music:game.settings.music,glyphs:game.settings.glyphs})")
            == initial,
            "Attract leaves player settings intact",
        )
        advance(page, 10.1)
        check(page.evaluate("__bomber.attract"), "Attract loops on next idle")
        page.mouse.click(1800, 900)
        advance(page, 0.1)
        check(not page.evaluate("__bomber.attract"), "Pointer exits attract")
        check(
            page.evaluate("__bomber.ui.shell.screen") == "title",
            "Pointer exit does not launch a sortie",
        )
        advance(page, 10.1)
        page.evaluate("__pads=[__makePad(0)]")
        pad(page, 0, 0)
        check(not page.evaluate("__bomber.attract"), "Controller exits attract")
        check(
            page.evaluate("__bomber.ui.shell.screen") == "title",
            "Controller exit is consumed",
        )
        # Stick drift below deliberate-input threshold must not block the kiosk timer.
        page.evaluate("__pads[0].axes=[.05,-.04,0,0]")
        advance(page, 10.2)
        check(
            page.evaluate("__bomber.attract"),
            "Small pad drift does not block attract mode",
        )
        no_errors(page, errors, requests)
    finally:
        context.close()


def mixed_coop(browser):
    backend = browser.browser_type.name
    context, page, errors, requests = open_game(browser)
    try:
        page.evaluate("__pads=[__makePad(0)]")
        click(page, "Co-op crew")
        click(page, "Keyboard + controller")
        click(page, "Launch sortie")
        advance(page, 22)
        check(
            len(state(page)["players"]) == 2,
            "Public mixed-coop setup creates two crew members",
        )
        check(
            page.evaluate("game.players.length") == 2,
            "Native independent inputs created",
        )
        check(
            page.evaluate("game.viewports.length") == 2,
            "Native horizontal split has two viewports",
        )
        check(
            page.evaluate("__bomber.view.world.cameras.length") == 2,
            "Native world supplies two cameras",
        )
        before = state(page)["mounts"]["nose"]["ammo"]
        page.keyboard.down("d")
        page.evaluate(
            "__pads[0].axes[2]=.9;__pads[0].buttons[7]={pressed:true,value:1,touched:true}"
        )
        advance(page, 0.35)
        page.keyboard.up("d")
        page.evaluate(
            "__pads[0].axes[2]=0;__pads[0].buttons[7]={pressed:false,value:0,touched:false}"
        )
        advance(page, 0.1)
        s = state(page)
        check(s["aircraft"]["bank"] > 0.02, "P1 keyboard controls bomber while P2 aims")
        check(s["players"][1]["aim"]["yaw"] > 0.1, "P2 pad aim changes only its mount")
        check(
            s["mounts"]["nose"]["ammo"] < before,
            "P2 trigger fires finite shared ammunition",
        )
        check(
            page.evaluate("game.players[1].lastDevice") == "gamepad",
            "P2 retains its own controller prompts",
        )
        key(page, "Tab")
        page.get_by_role("button", name=re.compile("12 O’CLOCK.*NOSE")).click()
        advance(page, 0.1)
        check(
            state(page)["players"][0]["station"] == "pilot",
            "Busy station first requests a handover",
        )
        page.get_by_role("button", name=re.compile("12 O’CLOCK.*NOSE")).click()
        advance(page, 0.1)
        s = state(page)
        check(
            s["players"][0]["station"] == "nose"
            and s["players"][1]["station"] == "pilot",
            "Confirmed handover exchanges useful stations",
        )
        check(
            s["commandOwner"] == 2, "Pilot handover transfers flight-command permission"
        )
        # State/input checks above are deterministic; graphics checks use real native
        # RAF presentation so WebKit's stopped-loop canvas snapshot cannot lag the UI.
        advance(page, 0.25)
        page.evaluate("game.start()")
        foreground_retained(page, f"{backend}-before-pause")
        page.evaluate("game.stop()")
        pad(page, 0, 9)
        advance(page, 0.3)
        check(page.evaluate("game.paused"), "P2 Options pauses shared sortie")
        check(page.evaluate("game.pausedBy") == 2, "Pause records P2 focus ownership")
        active = page.evaluate("document.activeElement.textContent")
        pad(page, 0, 13)
        changed = page.evaluate("document.activeElement.textContent")
        check(changed != active, "P2 navigates its pause menu")
        key(page, "ArrowDown")
        check(
            page.evaluate("document.activeElement.textContent") == changed,
            "P1 cannot move P2-owned pause focus",
        )
        pad(page, 0, 1)
        check(not page.evaluate("game.paused"), "P2 Circle backs out and resumes")
        page.evaluate("game.start()")
        for frame in range(12):
            foreground_retained(page, f"{backend}-viewport-{frame:02}")
        page.evaluate("game.stop()")
        page.screenshot(
            path=str(
                OUT
                / (
                    "mixed-coop-tv.png"
                    if backend == "chromium"
                    else "webkit-mixed-coop-tv.png"
                )
            )
        )
        page.evaluate(
            "__pads[0].connected=false;const e=new Event('gamepaddisconnected');e.gamepad=__pads[0];dispatchEvent(e)"
        )
        advance(page, 0.2)
        s = state(page)
        check(not s["players"][1]["connected"], "Guest pad departure clears the player")
        check(s["owners"]["pilot"] == "AI", "Departed pilot duty returns to AI")
        check(
            s["commandOwner"] == 1, "Remaining human inherits flight-command permission"
        )
        check(
            page.evaluate("game.viewports.length") == 0,
            "Departure collapses native split to solo",
        )
        page.evaluate("game.start()")
        foreground_retained(page, f"{backend}-solo-after-departure", solo=True)
        page.evaluate("game.stop()")
        no_errors(page, errors, requests)
    finally:
        context.close()


def two_pads(browser):
    context, page, errors, requests = open_game(browser)
    try:
        page.evaluate("__pads=[__makePad(0),__makePad(1)]")
        click(page, "Co-op crew")
        click(page, "Two controllers")
        click(page, "Launch sortie")
        advance(page, 22)
        check(
            page.evaluate("game.players.map(p=>p.pad)") == [0, 1],
            "Two-pad setup assigns distinct standard pad indices",
        )
        page.evaluate("__pads[0].axes[0]=-.8;__pads[1].axes[2]=.8")
        advance(page, 0.4)
        s = state(page)
        check(s["aircraft"]["bank"] < -0.04, "First controller flies independently")
        check(
            s["players"][1]["aim"]["yaw"] > 0.1,
            "Second controller traverses gun independently",
        )
        page.evaluate("__pads[0].axes=[0,0,0,0];__pads[1].axes=[0,0,0,0]")
        advance(page, 0.1)
        key(page, "Escape")
        click(page, "Settings")
        symbols = page.get_by_role("button", name=re.compile("Button symbols:"))
        for _ in range(5):
            if page.evaluate("game.settings.glyphs") == "xbox":
                break
            symbols.click()
            advance(page, 0.05)
        check(
            page.evaluate("game.settings.glyphs") == "xbox",
            "Settings offer Xbox glyphs",
        )
        pad(page, 0, 7)
        check(
            page.evaluate('game.players[0].label("wheel")') == "Y",
            "Native prompts render Xbox Y",
        )
        no_errors(page, errors, requests)
    finally:
        context.close()


def touch(browser):
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
    )
    context.add_init_script(PAD_STUB)
    page = context.new_page()
    errors = []
    requests = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on(
        "requestfailed", lambda r: requests.append({"url": r.url, "failure": r.failure})
    )
    try:
        page.goto(ARTIFACT.as_uri() + "?backend=webgl")
        page.wait_for_function("window.__bomber?.ready", timeout=90000)
        page.wait_for_timeout(300)
        page.evaluate("game.stop()")
        advance(page, 0.1)
        page.get_by_role("button", name="Fly a sortie", exact=True).tap()
        advance(page, 0.1)
        page.get_by_role("button", name="Launch sortie", exact=True).tap()
        advance(page, 0.4)
        check(
            page.evaluate("__bomber.touch.active"),
            "Touch device selects assisted touch UI",
        )
        check(
            "touch-mode" in page.locator("#hud").get_attribute("class"),
            "Touch hides dense station controls",
        )
        cdp = context.new_cdp_session(page)
        cdp.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchStart",
                "touchPoints": [
                    {"x": 70, "y": 590, "id": 1},
                    {"x": 310, "y": 590, "id": 2},
                ],
            },
        )
        cdp.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchMove",
                "touchPoints": [
                    {"x": 110, "y": 550, "id": 1},
                    {"x": 340, "y": 560, "id": 2},
                ],
            },
        )
        advance(page, 0.2)
        check(
            page.evaluate("__bomber.touch.fingers.size") == 2,
            "Two touch contacts are tracked simultaneously",
        )
        check(
            page.evaluate(
                "Math.abs(__bomber.touch.left[0])>0&&Math.abs(__bomber.touch.right[0])>0"
            ),
            "Invisible thumb regions provide independent flight and aim",
        )
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        advance(page, 0.1)
        check(
            page.evaluate("__bomber.touch.left[0]===0&&__bomber.touch.right[0]===0"),
            "Lifting contacts clears held touch commands",
        )
        page.screenshot(path=str(OUT / "phone-flight.png"))
        # A long press outlives multiple HUD rebuilds: pointerdown must still open the menu.
        page.evaluate(
            """() => {window.__touchTrace=[];for(const type of ['pointerdown','pointerup','click'])document.addEventListener(type,e=>{const row={type,target:e.target.outerHTML?.slice(0,230),detail:e.detail,before:{paused:game.paused,screen:__bomber.ui.shell.screen}};__touchTrace.push(row);queueMicrotask(()=>row.after={paused:game.paused,screen:__bomber.ui.shell.screen});},true);}"""
        )
        box = page.locator(".menu-toggle").bounding_box()
        x = box["x"] + box["width"] / 2
        y = box["y"] + box["height"] / 2
        cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchStart", "touchPoints": [{"x": x, "y": y, "id": 3}]},
        )
        advance(page, 0.3)
        check(
            page.evaluate("game.paused"),
            "Touch menu activates before periodic HUD replacement",
        )
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        advance(page, 0.1)
        (OUT / "touch-menu-trace.json").write_text(
            json.dumps(page.evaluate("__touchTrace"), indent=2)
        )
        check(
            page.get_by_role("button", name="Resume", exact=True).count() > 0,
            "Touch menu contains Resume: "
            + json.dumps(
                page.evaluate(
                    '({paused:game.paused,screen:__bomber.ui.shell.screen,buttons:[...document.querySelectorAll(".esh-sh button")].map(b=>b.textContent)})'
                )
            ),
        )
        page.get_by_role("button", name="Resume", exact=True).tap()
        advance(page, 0.3)
        # Directional practice provides a real target through the public ground-school menu.
        page.locator(".menu-toggle").tap()
        advance(page, 0.35)
        click(page, "Leave sortie")
        click(page, "Title screen")
        click(page, "Practice")
        click(page, "Directional gunnery")
        advance(page, 9.5)
        check(
            page.locator("[data-context=gun]").count() == 1,
            "Touch practice offers a threatened bearing action",
        )
        page.locator("[data-context=gun]").tap()
        advance(page, 0.35)
        check(
            state(page)["players"][0]["station"] == "nose",
            "Touch context action claims actual gun mount",
        )
        fire = page.locator("[data-context=fire]")
        check(fire.count() == 1, "Occupied threatened mount offers contextual fire")
        fire.scroll_into_view_if_needed()
        box = fire.bounding_box()
        fx = box["x"] + box["width"] / 2
        fy = box["y"] + box["height"] / 2
        before = state(page)["mounts"]["nose"]["ammo"]
        cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchStart", "touchPoints": [{"x": fx, "y": fy, "id": 4}]},
        )
        advance(page, 0.4)
        advance(page, 0.4)
        check(
            state(page)["mounts"]["nose"]["ammo"] < before,
            "Held touch fire expends actual ammunition across HUD replacements",
        )
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        advance(page, 0.1)
        check(
            not page.evaluate("__bomber.touch.fire"),
            "Release clears fire even after held DOM button replacement",
        )
        before = state(page)["mounts"]["nose"]["ammo"]
        advance(page, 0.3)
        check(
            state(page)["mounts"]["nose"]["ammo"] == before,
            "Touch fire cannot stick after release",
        )
        # Damaged-return practice exposes engine and irreversible emergency actions safely.
        page.locator(".menu-toggle").tap()
        advance(page, 0.35)
        click(page, "Leave sortie")
        click(page, "Title screen")
        click(page, "Practice")
        click(page, "Damaged return")
        advance(page, 0.35)
        check(
            state(page)["aircraft"]["fire"] > 0,
            "Damaged-return practice starts a real engine fire",
        )
        page.locator(".menu-toggle").tap()
        advance(page, 0.35)
        click(page, "Emergency actions")
        click(page, "Extinguish engine fire")
        check(
            state(page)["aircraft"]["fire"] == 0
            and state(page)["aircraft"]["extinguishers"] == 0,
            "Touch emergency action consumes the single bottle atomically",
        )
        hold = page.get_by_role(
            "button", name="Hold 1.5 seconds to jettison payload", exact=True
        )
        hold.scroll_into_view_if_needed()
        box = hold.bounding_box()
        hx = box["x"] + box["width"] / 2
        hy = box["y"] + box["height"] / 2
        bombs = state(page)["bombsLeft"]
        cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchStart", "touchPoints": [{"x": hx, "y": hy, "id": 5}]},
        )
        page.wait_for_timeout(450)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        page.wait_for_timeout(1200)
        check(
            state(page)["bombsLeft"] == bombs,
            "Releasing a short jettison hold cancels irreversible action",
        )
        hold = page.get_by_role(
            "button", name="Hold 1.5 seconds to jettison payload", exact=True
        )
        box = hold.bounding_box()
        hx = box["x"] + box["width"] / 2
        hy = box["y"] + box["height"] / 2
        cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchStart", "touchPoints": [{"x": hx, "y": hy, "id": 6}]},
        )
        page.wait_for_timeout(1650)
        check(
            state(page)["bombsLeft"] == 0,
            "Full deliberate jettison hold discards remaining payload once",
        )
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        advance(page, 0.1)
        click(page, "Back")
        click(page, "Leave sortie")
        click(page, "Title screen")
        # The public touchscreen exit is consumed in attract just like the keyboard.
        advance(page, 10.2)
        check(page.evaluate("__bomber.attract"), "Touch title enters attract")
        page.touchscreen.tap(195, 300)
        advance(page, 0.1)
        check(not page.evaluate("__bomber.attract"), "Tap exits attract")
        check(
            page.evaluate("__bomber.ui.shell.screen") == "title",
            "Attract touch exit does not select a menu item",
        )
        page.get_by_role("button", name="Fly a sortie", exact=True).tap()
        advance(page, 0.35)
        page.get_by_role("button", name="Launch sortie", exact=True).tap()
        advance(page, 0.4)
        check(
            state(page)["practice"] is None,
            "Normal sortie clears previous practice scenario",
        )
        check(
            state(page)["phase"] == "launch" and state(page)["aircraft"]["x"] < 10000,
            "Normal sortie restarts at the authored airfield",
        )
        no_errors(page, errors, requests)
    finally:
        context.close()


def portable(browser):
    folder = OUT / "portable"
    folder.mkdir(exist_ok=True)
    copied = folder / "bomber.html"
    shutil.copyfile(ARTIFACT, copied)
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    page = context.new_page()
    errors = []
    requests = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("requestfailed", lambda r: requests.append(r.url))
    try:
        page.goto(copied.as_uri() + "?backend=webgl")
        page.wait_for_function("window.__bomber?.ready", timeout=90000)
        check(
            page.title() == IDENTITY["title"],
            "Copied artifact identifies itself away from dev files",
        )
        check(
            page.evaluate("My3D2dge.World3D.backend") == "WebGL 2",
            "Copied artifact starts complete native renderer",
        )
        check(
            not page.evaluate(
                'performance.getEntriesByType("resource").some(r=>!r.name.startsWith("file:")&&!r.name.startsWith("data:")&&!r.name.startsWith("blob:"))'
            ),
            "Portable artifact requires no CDN/network requests",
        )
        no_errors(page, errors, requests)
    finally:
        context.close()


def webkit(p):
    browser = p.webkit.launch(headless=True)
    try:
        context, page, errors, requests = open_game(browser)
        try:
            launch(page)
            advance(page, 0.4)
            page.screenshot(path=str(OUT / "webkit-cockpit.png"))
            check(
                page.evaluate("My3D2dge.World3D.backend") == "WebGL 2",
                "WebKit uses native WebGL2 route",
            )
            no_errors(page, errors, requests)
        finally:
            context.close()
        mixed_coop(browser)
    finally:
        browser.close()


def firefox(p):
    browser = p.firefox.launch(headless=True)
    try:
        context = browser.new_context()
        context.add_init_script(
            'window.__earlyErrors=[];addEventListener("error",e=>__earlyErrors.push({message:e.message,stack:e.error?.stack}));'
        )
        page = context.new_page()
        try:
            page.goto(ARTIFACT.as_uri())
            page.wait_for_function(
                "window.__bomber?.error||window.__bomber?.ready||window.__earlyErrors?.length",
                timeout=30000,
            )
            early = page.evaluate("__earlyErrors")
            (OUT / "firefox-early-errors.json").write_text(json.dumps(early, indent=2))
            check(not early, "Firefox bundle initialization errors: " + str(early))
            ready = page.evaluate("__bomber.ready")
            if not ready:
                check(
                    page.locator("#support").is_visible(),
                    "Unsupported renderer provides visible explanation",
                )
                check(
                    "WEBGL 2" in page.locator("#support").inner_text(),
                    "Unsupported renderer explains capability needed",
                )
                RESULT["limitations"].append(
                    "Installed Firefox has no usable native WebGL2; useful unsupported-renderer screen verified."
                )
            else:
                check(
                    page.evaluate("My3D2dge.World3D.backend") == "WebGL 2",
                    "Firefox available renderer works",
                )
        finally:
            context.close()
    finally:
        browser.close()


def main():
    selected = next(
        (a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--cases=")),
        os.environ.get("BROWSER_CASES", ""),
    )
    names = selected.split(",") if selected else None
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--enable-unsafe-swiftshader"])
        try:
            for name, fn in [
                ("menus/preferences/credits", menus),
                ("pause/dev/editor/free camera", pause_dev),
                ("attract/input consumption", attract),
                ("mixed couch co-op", mixed_coop),
                ("two pads/glyphs", two_pads),
                ("touch/multitouch", touch),
                ("copied artifact portability", portable),
            ]:
                if not names or any(x in name for x in names):
                    run(name, lambda fn=fn: fn(browser))
        finally:
            browser.close()
        if not names or "webkit" in names:
            run("WebKit native renderer", lambda: webkit(p))
        if not names or "firefox" in names:
            run("Firefox unsupported renderer", lambda: firefox(p))
    output = ROOT / "tests/browser-result.json"
    if output.exists():
        history = OUT / "browser-run-history.json"
        runs = json.loads(history.read_text()) if history.exists() else []
        runs.append(json.loads(output.read_text()))
        history.write_text(json.dumps(runs, indent=2))
    output.write_text(json.dumps(RESULT, indent=2))
    print(
        f"Browser verification: {RESULT['assertions']} assertions, {len(RESULT['cases'])} scenarios, {len(RESULT['failures'])} failures"
    )
    raise SystemExit(bool(RESULT["failures"]))


if __name__ == "__main__":
    main()
