"""State-based UI/input journeys against the packaged standalone HTML."""

import json
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PAD_STUB = """
window.__pads=[];
window.__makePad=(index)=>({id:'DualSense Wireless Controller '+index,index,connected:true,
 mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0}))});
navigator.getGamepads=()=>window.__pads;
"""


def run_ui_tests(artifact=None, only=None):
    artifact = Path(artifact or ROOT / "build/game.html").resolve()
    passed = 0
    failures = []
    notes = []
    traces = []
    current_action = "load"

    def check(ok, label):
        nonlocal passed
        if ok:
            passed += 1
        else:
            failures.append(label)

    def journey(label, fn):
        try:
            fn()
        except Exception as exc:  # noqa: BLE001 — the test coordinator reports every failure as JSON
            failures.append(
                label + " after " + current_action + ": " + str(exc).split("\n")[0]
            )
            traces.append(str(exc))

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})

        def load(ctx=context, pads=0, denied=False):
            page = ctx.new_page()
            page.add_init_script(
                PAD_STUB
                + (
                    f"window.__pads=Array.from({{length:{pads}}},(_,i)=>__makePad(i));"
                    if pads
                    else ""
                )
            )
            if denied:
                page.add_init_script(
                    "Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Test storage denial','SecurityError')}})"
                )
            page._orbit_errors = []
            page._orbit_requests = []
            page.on("pageerror", lambda e: page._orbit_errors.append(str(e)))
            page.on("requestfailed", lambda r: page._orbit_requests.append(r.url))
            page.set_default_timeout(3000)
            page.goto(artifact.as_uri())
            page.wait_for_function(
                "window.__game && document.body.dataset.ready==='true'"
            )
            page.evaluate("__game.stop();__game.advance(.25)")
            return page

        def step(page, dt=0.1):
            page.evaluate("(dt)=>__game.advance(dt)", dt)

        def click(page, label):
            nonlocal current_action
            current_action = label
            page.locator("#orbit-ui").get_by_role(
                "button", name=label, exact=True
            ).first.click()
            step(page, 0.05)

        def screen(page):
            return page.evaluate("__orbit.screens.ui.screen")

        def pad(page, index, pressed=True, pilot=0):
            page.evaluate(
                """([pilot,index,pressed])=>{const b=__pads[pilot].buttons[index];b.pressed=pressed;b.value=pressed?1:0;b.touched=pressed;__game.advance(.025)}""",
                [pilot, index, pressed],
            )

        def tap_pad(page, index, pilot=0):
            pad(page, index, True, pilot)
            pad(page, index, False, pilot)

        def pad_focus(page, text, row=False):
            for _ in range(100):
                if page.evaluate(
                    """([text,row])=>{const e=document.activeElement;return !!e && (row?(e.closest('.esh-row')?.textContent||'').includes(text):e.textContent.trim()===text)}""",
                    [text, row],
                ):
                    return
                tap_pad(page, 13)
            raise AssertionError("Controller focus did not reach " + text)

        def keyboard_ui():
            page = load()
            try:
                check(
                    page.title().startswith("UFOh Orbit"),
                    "Packaged artifact has the game title",
                )
                check(
                    screen(page) == "title"
                    and page.evaluate("document.activeElement.textContent")
                    == "Start Mission",
                    "Title opens with first action focused",
                )
                check(
                    page.evaluate("__game.settings.music===.10"),
                    "Packaged first-run music setting is ten percent",
                )
                page.get_by_role("button", name="Score Attack", exact=True).hover()
                check(
                    page.evaluate("document.activeElement.textContent")
                    == "Score Attack",
                    "Mouse hover moves menu focus",
                )
                click(page, "Settings")
                step(page, 12)
                check(
                    screen(page) == "settings" and not page.evaluate("__orbit.attract"),
                    "Settings editing never launches attract",
                )
                music = page.get_by_role("slider", name="Music", exact=True)
                music.evaluate("e=>{e.value=.25;e.dispatchEvent(new Event('input'))}")
                check(
                    abs(page.evaluate("__game.settings.music") - 0.25) < 0.001
                    and abs(
                        page.evaluate(
                            "__orbit.audio.debug().buses?.music||__orbit.audio.settings.music"
                        )
                        - 0.25
                    )
                    < 0.001,
                    "Music slider changes saved setting and native bus",
                )
                click(page, "Controls")
                check(screen(page) == "controls", "Controls and rebinding screen opens")
                page.get_by_role("button", name=re.compile("Cannon.*keyboard")).click()
                page.keyboard.press("u")
                step(page)
                check(
                    page.evaluate('__game.input.label("fire","keyboard")') == "U",
                    "Keyboard cannon rebinding works",
                )
                click(page, "Restore defaults")
                check(
                    page.evaluate('__game.input.label("fire","keyboard")') == "Space",
                    "Controls restore defaults works",
                )
                click(page, "Back")
                click(page, "Back")
                click(page, "About / Credits")
                for index, title in enumerate(
                    [
                        "Source Information",
                        "Testing Feedback",
                        "Engine Feedback",
                        "Prompt Feedback",
                    ]
                ):
                    check(
                        page.locator("#orbit-ui").get_by_text(title, exact=True).count()
                        == 1,
                        title + " is accessible in game",
                    )
                    if index < 3:
                        click(page, "Next page")
                click(page, "Back")
                click(page, "Start Mission")
                check(
                    page.evaluate("__game.sceneName") == "play"
                    and page.evaluate("__orbit.world.status") == "running",
                    "Mission starts from title action",
                )
                initial = page.evaluate("__orbit.world.players[0].x")
                page.keyboard.down("d")
                step(page, 0.5)
                page.keyboard.up("d")
                step(page, 0.1)
                check(
                    page.evaluate("__orbit.world.players[0].x") > initial + 50,
                    "Keyboard movement drives actual saucer",
                )
                page.mouse.move(1500, 320)
                step(page, 0.1)
                check(
                    page.evaluate("__orbit.controls.intent(__orbit.world).aim"),
                    "Mouse requests a world-space bearing",
                )
                before = page.evaluate("__orbit.world.stats.shots")
                page.mouse.down()
                step(page, 0.6)
                page.mouse.up()
                step(page, 0.1)
                check(
                    page.evaluate("__orbit.world.stats.shots") > before
                    and page.evaluate("__orbit.world.players[0].shield") > 0,
                    "Mouse cannon spends actual shield",
                )
                page.keyboard.press("Escape")
                step(page)
                check(
                    screen(page) == "pause" and page.evaluate("__game.paused"),
                    "Escape opens native pause",
                )
                time = page.evaluate("__orbit.world.time")
                step(page, 1)
                check(
                    page.evaluate("__orbit.world.time") == time,
                    "Standalone pause stops simulation",
                )
                click(page, "Help")
                check(
                    screen(page) == "help"
                    and "YOUR WINGMATE" in page.locator("#orbit-ui").inner_text(),
                    "Field manual explains rescue and controls",
                )
                click(page, "Back")
                click(page, "Dev Mode")
                check(
                    screen(page) == "dev" and page.evaluate("__orbit.world.debug"),
                    "Pause Dev Mode marks flight ineligible for records",
                )
                click(page, "Combat tools")
                click(page, "Toggle invulnerability")
                check(
                    page.evaluate("__orbit.world.invulnerable"),
                    "Dev invulnerability action changes live simulation",
                )
                click(page, "Clear threats + shots")
                click(page, "Spawn drifter cluster")
                check(
                    page.evaluate(
                        '__orbit.world.enemies.filter(e=>e.type==="drifter").length'
                    )
                    == 6,
                    "Dev formation spawner creates six threats",
                )
                click(page, "Refill hull + shield")
                check(
                    page.evaluate(
                        "__orbit.world.players.every(p=>p.hull===3&&p.shield===0)"
                    ),
                    "Dev refill restores hull and shield",
                )
                before = page.evaluate("__orbit.present.debugOverlay")
                click(page, "Collision + aim overlay")
                check(
                    page.evaluate("__orbit.present.debugOverlay") != before,
                    "Dev collision and aim overlay toggles",
                )
                with page.expect_download() as download:
                    click(page, "Export snapshot")
                exported = download.value
                exported.save_as(ROOT / "artifacts/ui-exported-snapshot.json")
                check(
                    json.loads(
                        (ROOT / "artifacts/ui-exported-snapshot.json").read_text()
                    )["title"]
                    == "UFOh Orbit",
                    "Dev snapshot exports actual game state",
                )
                click(page, "Back")
                click(page, "Flight tuning")
                speed = page.get_by_role("slider", name="Flight speed", exact=True)
                speed.evaluate("e=>{e.value=300;e.dispatchEvent(new Event('input'))}")
                check(
                    page.evaluate("__orbit.world.balance.moveSpeed") == 300,
                    "Live tuning slider applies to authoritative balance",
                )
                click(page, "Reset page")
                check(
                    page.evaluate("__orbit.world.balance.moveSpeed") == 232,
                    "Tuning page restores canonical defaults",
                )
                click(page, "Back")
                click(page, "Simulation controls")
                time = page.evaluate("__orbit.world.time")
                click(page, "Single step")
                check(
                    abs(page.evaluate("__orbit.world.time") - time - 1 / 120) < 1e-6,
                    "Dev single-step advances one native update",
                )
                click(page, "Fast / 4x")
                check(
                    page.evaluate("__orbit.speed") == 4,
                    "Dev fast simulation action applies",
                )
                click(page, "Normal / 1x")
                click(page, "Back")
                click(page, "Encounter desk")
                click(page, "Crossing signals")
                check(
                    page.evaluate("__orbit.world.sector") == 2,
                    "Encounter picker jumps to authored sector",
                )
                click(page, "Boss phase III")
                check(
                    page.evaluate("__orbit.world.boss.phase") == 3,
                    "Boss phase picker reaches phase three",
                )
                with page.expect_file_chooser() as chooser:
                    click(page, "Import content JSON")
                chooser.value.set_files(
                    {
                        "name": "invalid.json",
                        "mimeType": "application/json",
                        "buffer": b'{"broken":true}',
                    }
                )
                page.wait_for_function(
                    "document.querySelector('#orbit-ui').innerText.includes('Content rejected')"
                )
                check(
                    page.evaluate("__orbit.world.content.sectors.length") == 4,
                    "Invalid imported content retains working deck",
                )
                content = page.evaluate("__game.debug.exportContent()")
                with page.expect_file_chooser() as chooser:
                    click(page, "Import content JSON")
                chooser.value.set_files(
                    {
                        "name": "valid.json",
                        "mimeType": "application/json",
                        "buffer": content.encode(),
                    }
                )
                page.wait_for_function(
                    "document.querySelector('#orbit-ui').innerText.includes('Content accepted')"
                )
                check(True, "Valid content imports through actual file control")
                click(page, "Back")
                click(page, "Back")
                click(page, "Resume")
                check(
                    screen(page) is None and not page.evaluate("__game.paused"),
                    "Resume leaves all pause tools and returns to flight",
                )
                check(
                    not page._orbit_errors and not page.evaluate("__game.errors"),
                    "Keyboard/menu/dev journey has no browser or registered draw errors",
                )
                check(
                    not page._orbit_requests,
                    "Standalone single file has no missing runtime requests",
                )
            finally:
                page.close()

        def results_storage():
            page = load()
            try:
                page.evaluate(
                    '__game.debug.start("mission");__game.advance(.4);__orbit.world.score=123;__orbit.world.players[0].down=true;__orbit.world.players[0].hull=0;__game.advance(3.5)'
                )
                check(
                    page.evaluate("__game.sceneName") == "results"
                    and screen(page) == "results",
                    "Real all-down defeat reaches results",
                )
                click(page, "Record six-letter name")
                page.keyboard.type("ABC123")
                step(page)
                check(
                    page.evaluate("__orbit.screens.name") == "ABC123",
                    "Keyboard enters all six score-name characters",
                )
                click(page, "Save score")
                check(
                    page.evaluate("__orbit.records.data.name") == "ABC123"
                    and page.evaluate('__orbit.records.best("mission")') == 123,
                    "Score name and mode-specific score save",
                )
                click(page, "Fly again")
                check(
                    page.evaluate("__game.sceneName") == "play"
                    and page.evaluate("__orbit.world.status") == "running",
                    "Results replay launches a complete fresh run",
                )
                page.reload()
                page.wait_for_function("window.__game&&document.body.dataset.ready")
                page.evaluate("__game.stop();__game.advance(.2)")
                check(
                    page.evaluate("__orbit.records.data.name") == "ABC123"
                    and page.evaluate('__orbit.records.best("mission")') == 123,
                    "Six-character records survive reload",
                )
                page.evaluate('localStorage.setItem("ufoh-orbit:records:v1","corrupt")')
                page.reload()
                page.wait_for_function("window.__game&&document.body.dataset.ready")
                page.evaluate("__game.stop();__game.advance(.2)")
                check(
                    page.evaluate('__orbit.records.best("mission")') == 0
                    and page.evaluate("__orbit.records.data.name") == "PILOT ",
                    "Corrupt persistence falls back safely",
                )
                check(
                    not page._orbit_errors,
                    "Results and persistence journey has no browser errors",
                )
            finally:
                page.close()
            denied_context = browser.new_context()
            denied = load(denied_context, denied=True)
            try:
                check(
                    not denied.evaluate("__orbit.records.available"),
                    "Denied localStorage is recognized",
                )
                click(denied, "Score Attack")
                check(
                    denied.evaluate("__orbit.world.mode") == "score-attack"
                    and denied.evaluate("__orbit.world.status") == "running",
                    "Storage denial leaves score attack playable",
                )
                check(
                    not denied._orbit_errors,
                    "Storage denial produces no uncaught errors",
                )
            finally:
                denied_context.close()

        def gamepad_ui():
            page = load(pads=1)
            try:
                tap_pad(page, 13)
                check(
                    page.evaluate("__game.input.lastDevice") == "gamepad"
                    and page.evaluate('__game.input.label("confirm")') == "✕",
                    "Standard pad selects PlayStation glyphs by default",
                )
                check(
                    page.evaluate("__orbit.audio.unlocked && !!__game.audio.ctx"),
                    "Pad-only intentional input attempts native audio unlock",
                )
                pad_focus(page, "Settings")
                tap_pad(page, 0)
                check(screen(page) == "settings", "Controller reaches title settings")
                pad_focus(page, "Controls")
                tap_pad(page, 0)
                check(screen(page) == "controls", "Controller opens binding screen")
                pad_focus(page, "Button symbols", row=True)
                tap_pad(page, 14)
                check(
                    page.evaluate("__game.settings.glyphs") == "xbox"
                    and page.evaluate('__game.input.label("confirm")') == "A",
                    "Controller changes Xbox button symbols",
                )
                pad_focus(page, "Button symbols", row=True)
                tap_pad(page, 15)
                check(
                    page.evaluate("__game.settings.glyphs") == "playstation",
                    "Controller restores PlayStation button symbols",
                )
                tap_pad(page, 1)
                tap_pad(page, 1)
                pad_focus(page, "Start Mission")
                tap_pad(page, 0)
                step(page, 0.4)
                check(
                    page.evaluate("__game.sceneName") == "play",
                    "Controller launches mission without mouse",
                )
                before = page.evaluate("__orbit.world.players[0].x")
                page.evaluate("__pads[0].axes=[1,0,0,-1]")
                step(page, 0.4)
                check(
                    page.evaluate("__orbit.world.players[0].x") > before + 30
                    and page.evaluate("__orbit.controls.intent(__orbit.world).aim"),
                    "Dual sticks independently move and request aim",
                )
                page.evaluate("__pads[0].axes=[0,0,0,0]")
                before = page.evaluate("__orbit.world.stats.shots")
                tap_pad(page, 7)
                check(
                    page.evaluate("__orbit.world.stats.shots") > before,
                    "R2 accepts a cannon shot",
                )
                pad(page, 8, True)
                pad(page, 9, True)
                check(
                    not page.evaluate("__game.paused"),
                    "Create plus Options remains reserved and does not pause game",
                )
                pad(page, 9, False)
                pad(page, 8, False)
                tap_pad(page, 9)
                check(screen(page) == "pause", "Options opens pause")
                pad_focus(page, "Dev Mode")
                tap_pad(page, 0)
                check(screen(page) == "dev", "Controller reaches Dev Mode")
                pad_focus(page, "Shield tuning")
                tap_pad(page, 0)
                before = page.evaluate("__orbit.world.balance.shieldRecharge")
                pad_focus(page, "Shield recharge", row=True)
                tap_pad(page, 15)
                check(
                    page.evaluate("__orbit.world.balance.shieldRecharge") > before,
                    "Controller adjusts live tuning slider",
                )
                tap_pad(page, 1)
                tap_pad(page, 1)
                pad_focus(page, "About / Credits")
                tap_pad(page, 0)
                check(screen(page) == "about", "Controller reaches About from pause")
                pad_focus(page, "Next page")
                tap_pad(page, 0)
                check(
                    "Testing Feedback" in page.locator("#orbit-ui").inner_text(),
                    "Controller turns credits pages",
                )
                tap_pad(page, 1)
                pad_focus(page, "Resume")
                tap_pad(page, 0)
                page.evaluate(
                    "__orbit.world.debug=false;__orbit.world.players[0].down=true;__orbit.world.players[0].hull=0"
                )
                step(page, 3.5)
                pad_focus(page, "Record six-letter name")
                tap_pad(page, 0)
                check(
                    screen(page) == "name", "Controller opens six-character name wheel"
                )
                before = page.evaluate("__orbit.screens.name")
                pad_focus(page, "Letter +")
                tap_pad(page, 0)
                check(
                    page.evaluate("__orbit.screens.name") != before,
                    "Controller turns a name-wheel character",
                )
                pad_focus(page, "Next position")
                tap_pad(page, 0)
                check(
                    page.evaluate("__orbit.screens.letter") == 1,
                    "Controller selects next of six characters",
                )
                pad_focus(page, "Save score")
                tap_pad(page, 0)
                check(
                    screen(page) == "results" and page.evaluate("__orbit.recorded"),
                    "Controller saves score from name wheel",
                )
                check(
                    not page._orbit_errors and not page.evaluate("__game.errors"),
                    "Controller UI journey has no browser or draw errors",
                )
            finally:
                page.close()

        def coop_inputs():
            page = load(pads=2)
            try:
                click(page, "Local Co-op")
                click(page, "Two controllers")
                click(page, "Launch Mission")
                step(page, 0.4)
                check(
                    page.evaluate(
                        "__orbit.world.players.length===2&&__game.players.length===2"
                    ),
                    "Two-controller local co-op launches simultaneous pilots",
                )
                before = page.evaluate("__orbit.world.players.map(p=>p.x)")
                page.evaluate("__pads[1].axes=[1,0,0,0]")
                step(page, 0.4)
                after = page.evaluate("__orbit.world.players.map(p=>p.x)")
                check(
                    abs(after[0] - before[0]) < 1 and after[1] > before[1] + 30,
                    "Second pad moves only its own pilot",
                )
                page.evaluate("__pads[1].axes=[0,0,0,0];__pads[1].connected=false")
                step(page, 0.1)
                check(
                    page.evaluate("__game.paused"),
                    "Disconnecting an active controller pauses local co-op",
                )
                page.evaluate(
                    "__pads[1].connected=true;__game.resume();__game.shell.hide()"
                )
                step(page, 0.1)
                check(
                    page.evaluate(
                        "__game.players[1].pad===1&&__game.players[0].pad===0"
                    ),
                    "Controller reconnect preserves device ownership",
                )
                page.evaluate("__orbit.toTitle()")
                step(page, 0.1)
                click(page, "Local Co-op")
                click(page, "Keyboard + controller")
                click(page, "Launch Mission")
                step(page, 0.4)
                check(
                    page.evaluate(
                        "__game.players[0].pad===null&&__game.players[1].pad===0"
                    ),
                    "Keyboard plus pad pairing assigns distinct owners",
                )
                page.evaluate("__orbit.toTitle()")
                step(page, 0.1)
                click(page, "Local Co-op")
                click(page, "Shared keyboard")
                click(page, "Launch Mission")
                step(page, 0.4)
                before = page.evaluate("__orbit.world.players.map(p=>p.x)")
                page.keyboard.down("d")
                step(page, 0.3)
                page.keyboard.up("d")
                step(page, 0.1)
                after = page.evaluate("__orbit.world.players.map(p=>p.x)")
                check(
                    after[0] > before[0] + 20 and abs(after[1] - before[1]) < 1,
                    "Shared keyboard WASD belongs only to pilot one",
                )
                before = after
                page.keyboard.down("ArrowLeft")
                step(page, 0.3)
                page.keyboard.up("ArrowLeft")
                step(page, 0.1)
                after = page.evaluate("__orbit.world.players.map(p=>p.x)")
                check(
                    after[1] < before[1] - 20, "Shared keyboard arrows move pilot two"
                )
                before = page.evaluate("__orbit.world.players.map(p=>p.shots)")
                page.keyboard.press("f")
                step(page, 0.1)
                page.keyboard.press(".")
                step(page, 0.1)
                after = page.evaluate("__orbit.world.players.map(p=>p.shots)")
                check(
                    after[0] > before[0] and after[1] > before[1],
                    "Both shared-keyboard cannon keys work",
                )
                check(
                    not page._orbit_errors,
                    "Local pairing journey has no browser errors",
                )
            finally:
                page.close()

        def attract_categories():
            for category in [
                "keyboard",
                "mouse move",
                "wheel",
                "click",
                "pad button",
                "pad stick",
                "touch",
            ]:
                ctx = (
                    context
                    if category != "touch"
                    else browser.new_context(
                        viewport={"width": 844, "height": 390},
                        has_touch=True,
                        is_mobile=True,
                    )
                )
                page = load(ctx, pads=1 if category.startswith("pad") else 0)
                try:
                    page.evaluate("__game.debug.idle(9.98);__game.advance(1/120)")
                    check(
                        not page.evaluate("__orbit.attract"),
                        category + ": attract waits until ten seconds",
                    )
                    page.evaluate("__game.debug.idle(10);__game.advance(.025)")
                    check(
                        page.evaluate("__orbit.attract")
                        and page.evaluate("__game.sceneName") == "play",
                        category + ": attract starts with a real world",
                    )
                    if category == "keyboard":
                        page.keyboard.press("Enter")
                    elif category == "mouse move":
                        page.mouse.move(155, 210)
                    elif category == "wheel":
                        page.mouse.wheel(0, 120)
                    elif category == "click":
                        page.mouse.click(500, 300)
                    elif category == "pad button":
                        tap_pad(page, 0)
                    elif category == "pad stick":
                        page.evaluate("__pads[0].axes=[.9,0,0,0]")
                    else:
                        page.touchscreen.tap(250, 220)
                    step(page, 0.1)
                    check(
                        not page.evaluate("__orbit.attract")
                        and page.evaluate("__game.sceneName") == "title"
                        and screen(page) == "title",
                        category
                        + ": cancel input is consumed without starting a real run",
                    )
                    check(
                        page.evaluate("__orbit.world===null")
                        and page.evaluate('__orbit.records.best("mission")') == 0,
                        category + ": attract cleanup leaves no world or record",
                    )
                finally:
                    page.close()
                    if ctx is not context:
                        ctx.close()
            page = load(pads=1)
            try:
                page.evaluate(
                    "__game.debug.idle(10);__game.advance(.025);__pads[0].axes=[.12,0,0,0]"
                )
                step(page, 0.1)
                check(
                    page.evaluate("__orbit.attract"),
                    "Controller drift beneath dead zone does not cancel attract",
                )
                sectors = []
                for _ in range(4):
                    sectors.append(page.evaluate("__orbit.world.sector"))
                    step(page, 18)
                check(
                    sectors == [0, 1, 2, 3],
                    "Attract showcases every sector and command encounter",
                )
                step(page, 5)
                check(
                    page.evaluate("__orbit.attract")
                    and page.evaluate("__orbit.attractTime") < 5,
                    "Attract loops after the complete showcase",
                )
                check(
                    page.evaluate("__orbit.world.balance.moveSpeed") == 232,
                    "Attract always uses canonical balance",
                )
                check(
                    not page._orbit_errors and not page.evaluate("__game.errors"),
                    "Attract showcase has no simulation/draw faults",
                )
            finally:
                page.close()

        def credits_pagination():
            fields = json.loads((ROOT / "src/data/interview.json").read_text())[
                "sourceInformation"
            ]
            expected = {key[0].upper() + key[1:] for key in fields}
            for label, width, height, per in [
                ("desktop", 1920, 1080, 2),
                ("phone", 390, 844, 1),
            ]:
                ctx = browser.new_context(viewport={"width": width, "height": height})
                page = load(ctx)
                try:
                    click(page, "About / Credits")
                    headers = page.locator("#orbit-ui .esh-sec")
                    check(
                        headers.count() == per,
                        label + ": credits show a readable number of detail entries",
                    )
                    observed = set(headers.all_text_contents())
                    parts = (len(expected) + per - 1) // per
                    for _ in range(parts - 1):
                        click(page, "More details")
                        observed.update(headers.all_text_contents())
                    check(
                        observed == expected,
                        label + ": More details exposes every source-information field",
                    )
                    click(page, "More details")
                    check(
                        headers.first.text_content() == "Date",
                        label + ": More details wraps to the first detail page",
                    )
                    for title in [
                        "Testing Feedback",
                        "Engine Feedback",
                        "Prompt Feedback",
                        "Source Information",
                    ]:
                        click(page, "Next page")
                        check(
                            page.locator("#orbit-ui")
                            .get_by_text(title, exact=True)
                            .count()
                            == 1,
                            label + ": Next page reaches " + title,
                        )
                    click(page, "Previous page")
                    check(
                        page.locator("#orbit-ui")
                        .get_by_text("Prompt Feedback", exact=True)
                        .count()
                        == 1,
                        label + ": Previous page cycles back to prompt feedback",
                    )
                    click(page, "Back")
                    check(screen(page) == "title", label + ": credits return to title")
                    check(
                        not page._orbit_errors,
                        label + ": paginated credits have no browser errors",
                    )
                finally:
                    ctx.close()

        def touch_devices():
            for label, width, height in [
                ("phone landscape", 844, 390),
                ("phone portrait", 390, 844),
                ("tablet landscape", 1180, 820),
            ]:
                ctx = browser.new_context(
                    viewport={"width": width, "height": height},
                    has_touch=True,
                    is_mobile=True,
                    device_scale_factor=2,
                )
                page = load(ctx)
                try:
                    button = page.get_by_role(
                        "button", name="Start Mission", exact=True
                    ).bounding_box()
                    page.touchscreen.tap(
                        button["x"] + button["width"] / 2,
                        button["y"] + button["height"] / 2,
                    )
                    step(page, 0.4)
                    check(
                        page.evaluate("__game.sceneName") == "play",
                        label + ": touch title launches mission",
                    )
                    session = ctx.new_cdp_session(page)
                    canvas = page.locator("#screen").bounding_box()
                    x0 = canvas["x"] + width * 0.23
                    x1 = canvas["x"] + width * 0.77
                    y = canvas["y"] + height * 0.73
                    points = [{"id": 41, "x": x0, "y": y}, {"id": 42, "x": x1, "y": y}]
                    session.send(
                        "Input.dispatchTouchEvent",
                        {"type": "touchStart", "touchPoints": points},
                    )
                    step(page, 0.05)
                    points = [
                        {"id": 41, "x": x0 + 32, "y": y - 12},
                        {"id": 42, "x": x1 - 24, "y": y - 30},
                    ]
                    session.send(
                        "Input.dispatchTouchEvent",
                        {"type": "touchMove", "touchPoints": points},
                    )
                    step(page, 0.05)
                    intent = page.evaluate("__orbit.controls.intent(__orbit.world)")
                    check(
                        page.evaluate("__orbit.controls.contacts.size") == 2
                        and intent["mx"] > 0.2
                        and intent["aim"],
                        label
                        + ": simultaneous invisible movement and aim sticks own distinct contacts",
                    )
                    check(
                        page.evaluate("__game.input.lastDevice") == "touch",
                        label + ": meaningful touch selects touch hints",
                    )
                    # A finger released over a pause sheet must never leave a
                    # custom stick held when the player resumes the flight.
                    page.evaluate("__game.pause()")
                    step(page, 0.05)
                    check(
                        screen(page) == "pause"
                        and page.evaluate("__orbit.controls.contacts.size") == 0,
                        label + ": opening pause releases live custom stick contacts",
                    )
                    session.send(
                        "Input.dispatchTouchEvent",
                        {"type": "touchEnd", "touchPoints": []},
                    )
                    step(page, 0.05)
                    click(page, "Resume")
                    resumed = page.evaluate("__orbit.controls.intent(__orbit.world)")
                    check(
                        page.evaluate("__orbit.controls.contacts.size") == 0
                        and abs(resumed["mx"]) < 0.0001
                        and abs(resumed["my"]) < 0.0001
                        and not resumed["fire"],
                        label
                        + ": release during menu resumes with neutral movement and cannon",
                    )
                    session.send(
                        "Input.dispatchTouchEvent",
                        {"type": "touchStart", "touchPoints": points},
                    )
                    step(page, 0.025)
                    session.send(
                        "Input.dispatchTouchEvent",
                        {"type": "touchCancel", "touchPoints": []},
                    )
                    step(page, 0.05)
                    check(
                        page.evaluate("__orbit.controls.contacts.size") == 0,
                        label + ": touch cancellation releases both sticks",
                    )
                    layout = page.evaluate("__orbit.present.layout")
                    check(
                        layout["k"] > 0 and layout["x"] >= 0 and layout["y"] >= 0,
                        label + ": complete authoritative arena fits device",
                    )
                    check(
                        page.evaluate(
                            "__orbit.world.arena.w===960&&__orbit.world.arena.h===540"
                        ),
                        label + ": device size never changes simulation arena",
                    )
                    check(
                        not page._orbit_errors and not page.evaluate("__game.errors"),
                        label + ": touch journey has no browser/draw faults",
                    )
                finally:
                    ctx.close()

        for label, fn in [
            ("Keyboard menu/dev journey", keyboard_ui),
            ("Results/persistence journey", results_storage),
            ("Controller UI journey", gamepad_ui),
            ("Local pairing journey", coop_inputs),
            ("Attract cancellation journey", attract_categories),
            ("Touch device journeys", touch_devices),
            ("About pagination journey", credits_pagination),
        ]:
            if only is None or only.lower() in label.lower():
                journey(label, fn)
        context.close()
        browser.close()

        for engine in [] if only else ["firefox", "webkit"]:

            def smoke(engine=engine):
                browser2 = getattr(pw, engine).launch(headless=True)
                try:
                    page = browser2.new_page(viewport={"width": 1280, "height": 720})
                    errors = []
                    page.on("pageerror", lambda e: errors.append(str(e)))
                    page.goto(artifact.as_uri())
                    page.wait_for_function("window.__game&&document.body.dataset.ready")
                    page.evaluate("__game.stop();__game.advance(.25)")
                    click(page, "Start Mission")
                    step(page, 2)
                    check(
                        page.evaluate("__game.sceneName") == "play"
                        and page.evaluate("__orbit.world.time") > 1,
                        engine + ": packaged file runs native simulation",
                    )
                    page.keyboard.press("Escape")
                    step(page, 0.1)
                    check(screen(page) == "pause", engine + ": keyboard pause works")
                    check(
                        not errors and not page.evaluate("__game.errors"),
                        engine + ": no browser or drawing errors",
                    )
                    notes.append(
                        engine
                        + " desktop browser smoke passed; emulation is not a real device test."
                    )
                finally:
                    browser2.close()

            journey(engine + " browser smoke", smoke)
    report = {
        "passed": passed,
        "failed": len(failures),
        "failures": failures,
        "notes": notes,
        "artifact": str(artifact),
        "traces": traces,
    }
    (ROOT / "artifacts/ui-report.json").write_text(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    try:
        result = run_ui_tests(
            sys.argv[1] if len(sys.argv) > 1 else None,
            sys.argv[2] if len(sys.argv) > 2 else None,
        )
    except Exception as exc:  # noqa: BLE001 — the test coordinator reports every failure as JSON
        result = {
            "passed": 0,
            "failed": 1,
            "failures": ["UI test harness: " + str(exc).split("\n")[0]],
        }
    print(json.dumps({k: result[k] for k in ["passed", "failed", "failures"]}))
    raise SystemExit(1 if result["failed"] else 0)
