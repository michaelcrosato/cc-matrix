import json
import traceback
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PROJECT = json.loads((ROOT / "project.json").read_text())
URL = (ROOT.parent / (PROJECT["slug"] + ".html")).as_uri()
results = []


def check(name, ok, detail=""):
    results.append(
        {"name": name, "pass": bool(ok), "detail": str(detail) if not ok else ""}
    )


def state(page):
    return page.evaluate("BU.app.state")


def snap(page):
    return page.evaluate("__game.debug.snapshot()")


def wait(page):
    page.wait_for_timeout(120)


def click(page, name):
    region = page.locator(".esh-btns") if name == "Back" else page
    region.get_by_role("button", name=name, exact=True).click()
    wait(page)


def training(page):
    page.goto(URL)
    page.wait_for_function('window.BU?.app?.ui.screen==="title"')
    click(page, "Start your shift")
    click(page, "TRAINING · First day, last wire")
    click(page, "Open the device")
    page.locator('[data-board="B1"]').click()
    wait(page)


def target(page, id):
    t = page.evaluate("(id)=>__game.debug.targets().find(t=>t.id===id)", id)
    s = page.locator("#screen").bounding_box()
    dims = page.evaluate("({w:__game.W,h:__game.H})")
    return (
        s["x"] + t["x"] * s["width"] / dims["w"],
        s["y"] + t["y"] * s["height"] / dims["h"],
    )


def aim(page, id):
    page.mouse.move(*target(page, id))
    wait(page)


def tool(page, key):
    page.keyboard.press(key)
    wait(page)


def action(page, id, hold=0):
    aim(page, id)
    page.mouse.down()
    page.wait_for_timeout(hold or 70)
    page.mouse.up()
    wait(page)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    context.add_init_script(
        "window.__pad={id:'Emulated standard DualSense',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0})),timestamp:0};navigator.getGamepads=()=>[window.__pad];"
    )
    page = context.new_page()
    page.set_default_timeout(10000)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    try:
        training(page)
        check(
            "file artifact title and normal dispatch",
            state(page)["caseId"] == "training"
            and page.evaluate("BU.app.screen") == "work",
        )
        check(
            "readable native board targets",
            len(page.evaluate("__game.debug.targets()")) >= 12,
        )
        page.keyboard.press("Tab")
        wait(page)
        click(page, "Stencil alphabet")
        click(page, "Back")
        check(
            "native back restores custom evidence sectors",
            page.locator('[data-board="B1"]').is_visible(),
        )
        page.evaluate("BU.app.ui.show('evidence',{})")
        wait(page)
        check(
            "native screen redraw restores custom evidence content",
            page.locator('[data-board="B1"]').is_visible(),
        )
        page.locator('[data-board="B1"]').click()
        wait(page)
        page.keyboard.press("Space")
        wait(page)
        check(
            "keyboard apply cuts focused lead",
            state(page)["boards"][0]["components"][0]["cuts"][0],
        )

        # Standard pad D-pad and cross through actual navigator polling.
        def pad(button, hold=0.12):
            page.evaluate(
                "(i)=>{__pad.buttons[i]={pressed:true,touched:true,value:1};__pad.timestamp=performance.now()}",
                button,
            )
            page.wait_for_timeout(int(hold * 1000))
            page.evaluate(
                "(i)=>{__pad.buttons[i]={pressed:false,touched:false,value:0};__pad.timestamp=performance.now()}",
                button,
            )
            wait(page)

        pad(15)
        check("controller moves focus", page.evaluate("BU.app.focusTarget") != "C1:0")
        check(
            "controller prompt family defaults PlayStation",
            page.evaluate("__game.settings.glyphs") == "playstation",
        )
        # Mouse aims actual target before applying; selected prior focus is intentionally different.
        action(page, "C1:1")
        check(
            "mouse click operates on hovered terminal",
            state(page)["boards"][0]["components"][0]["cuts"] == [True, True],
        )
        tool(page, "Digit2")
        action(page, "C1:body")
        check(
            "pliers remove only freed component",
            state(page)["boards"][0]["components"][0]["removed"],
        )
        action(page, "spare:S1")
        check("tray pickup", state(page)["boards"][0]["held"] == "S1")
        page.mouse.click(*target(page, "C1:body"))
        wait(page)
        check(
            "placement into empty socket",
            state(page)["boards"][0]["components"][0]["part"] == "S1",
        )
        tool(page, "Digit3")
        action(page, "C1:0", 660)
        check(
            "solder hold release completes joint in safe band",
            state(page)["boards"][0]["components"][0]["joints"][0],
        )
        # Solo pause preserves time and repair; native settings/rebinding paths remain reachable.
        aim(page, "C1:1")
        page.mouse.down()
        page.wait_for_timeout(90)
        page.keyboard.press("Escape")
        wait(page)
        page.mouse.up()
        wait(page)
        check(
            "physical pause cancels a solder hold",
            state(page)["boards"][0]["hold"] is None,
        )
        check("physical pause suspends procedural voice", snap(page)["audio"]["paused"])
        before = state(page)["remaining"]
        page.wait_for_timeout(350)
        after = state(page)["remaining"]
        check("solo native pause freezes fuse", abs(before - after) < 0.02)
        click(page, "Settings")
        check("native settings opened", page.evaluate("BU.app.ui.screen") == "settings")
        page.evaluate("__game.settings.set('glyphs','xbox')")
        check(
            "Xbox prompt option applies",
            page.evaluate("__game.input.label('apply','gamepad')") == "A",
        )
        page.evaluate("__game.settings.set('glyphs','playstation')")
        page.keyboard.press("Escape")
        wait(page)
        # Escape returns pause, then Resume returns full workspace.
        if page.get_by_role("button", name="Resume", exact=True).count():
            click(page, "Resume")
        else:
            page.keyboard.press("Escape")
            wait(page)
        check(
            "pause overlay restores workspace",
            page.evaluate('!BU.app.ui.screen&&BU.app.screen==="work"'),
        )
        check("audio resumes with native menu", not snap(page)["audio"]["paused"])
        # Finish with actual mouse hold and open code confirmation from fresh evidence.
        action(page, "C1:1", 660)
        page.wait_for_function("BU.app.state.boards[0].complete")
        check(
            "completed board automatically publishes evidence",
            all(v != -1 for v in state(page)["evidence"][0]),
        )
        click(page, "Enter disarm code")
        check(
            "decision overlays retain readable fuse",
            page.locator("#bu-global-fuse").is_visible(),
        )
        check(
            "code selection distinct from submission",
            state(page)["status"] == "active"
            and page.evaluate("BU.app.ui.screen") == "code",
        )
        # Native _cycle left/right support must be reversible without committing.
        page.locator('[data-digit="0"]').focus()
        page.keyboard.press("ArrowRight")
        wait(page)
        forward = page.evaluate("BU.app.codeDraft[0]")
        page.keyboard.press("ArrowLeft")
        wait(page)
        check(
            "dial left/right native focus support",
            forward == 1 and page.evaluate("BU.app.codeDraft[0]") == 0,
        )
        click(page, "Review this code")
        check(
            "deliberate confirmation has safe default",
            page.evaluate("document.activeElement.textContent").upper()
            == "KEEP CHECKING",
        )
        click(page, "Keep checking")
        # Developer tools and settings reset work through the actual native shell.
        click(page, "Pause / settings")
        click(page, "Developer workbench")
        click(page, "Return")
        check(
            "developer back returns to native pause without recursion",
            page.get_by_role("button", name="Resume", exact=True).is_visible(),
        )
        click(page, "Developer workbench")
        click(page, "Live balance sliders")
        r = page.locator('input[aria-label="Simulation speed"]')
        r.fill("2")
        r.dispatch_event("input")
        wait(page)
        check(
            "live dev slider changes authoritative tuning",
            state(page)["tuning"]["timeScale"] == 2 and state(page)["modified"],
        )
        click(page, "Reset all balance defaults")
        check(
            "native reset coherently restores tuning",
            state(page)["tuning"]["timeScale"] == 1,
        )
        click(page, "Back to workbench")
        click(page, "Board / case authoring")
        click(page, "Reveal full stencil mask")
        click(page, "Validate scratch content")
        check(
            "editor validates authored content",
            page.evaluate("document.body.innerText").find("Content valid") >= 0,
        )
        click(page, "JSON import / export")
        value = page.locator("#bu-editor-json").input_value()
        check(
            "versioned editor export model",
            json.loads(value)["version"] == "bomb-union-1",
        )
        page.locator("#bu-editor-json").fill("{broken")
        click(page, "Import text")
        check(
            "invalid editor import is recoverable",
            page.evaluate("document.body.innerText").find("Import rejected") >= 0,
        )
        page.locator("#bu-editor-json").fill(value)
        click(page, "Import text")
        click(page, "Playtest scratch copy")
        check(
            "editor playtest isolates modified copy",
            state(page)["modified"] and len(state(page)["boards"]) == 1,
        )
        page.evaluate(
            """() => { const a=BU.app, original=a.audio.effect.bind(a.audio);a.observedCues=[];a.audio.effect=name=>{a.observedCues.push(name);return original(name)};a.command({type:'claim',board:'B1'});a.command({type:'test',board:'B1',spare:a.state.boards[0].spares[0].id}); }"""
        )
        wait(page)
        check(
            "diagnostic truth reaches distinct synthesized continuity tone",
            page.evaluate(
                "BU.app.observedCues.includes(BU.app.state.events.filter(e=>e.type==='test').at(-1).pass?'test-pass':'test-fail')"
            ),
        )
        page.evaluate(
            "BU.app.net.callbacks.onStatus('Stale board revision. Try that action again.')"
        )
        check(
            "remote command rejection has visible workspace feedback",
            "Stale board revision" in page.locator("body").inner_text(),
        )
        page.keyboard.press("Escape")
        wait(page)
        if not page.get_by_role(
            "button", name="Developer workbench", exact=True
        ).count():
            page.evaluate("__game.menu()")
            wait(page)
        # Direct developer control is intentionally separate from ordinary-input campaign acceptance.
        page.evaluate(
            "BU.app.command({type:'dev',operation:'fuse',value:.01});__game.resume();BU.app.ui.hide()"
        )
        page.wait_for_function('BU.app.state.status==="lost"')
        page.wait_for_timeout(200)
        check(
            "expiry reports actual cause exactly once",
            state(page)["cause"] == "time-expired"
            and "fuse ran out" in page.locator("body").inner_text().lower(),
        )
        check(
            "developer modified results remain labeled",
            state(page)["result"]["modified"],
        )
        page.screenshot(path=str(ROOT / "evidence/failure.png"))
        click(page, "Return to title")
        click(page, "About & credits")
        check(
            "credits source information reachable",
            page.evaluate("BU.app.ui.screen") == "credits",
        )
        for _ in range(12):
            if "Testing Feedback" in page.locator("body").inner_text():
                break
            click(page, "Next page")
        check(
            "credits required feedback pagination",
            "Testing Feedback" in page.locator("body").inner_text(),
        )
        fits = []
        for _ in range(17):
            fits.append(
                page.evaluate(
                    "document.querySelector('.esh-mod').scrollHeight<=document.querySelector('.esh-mod').clientHeight+1"
                )
            )
            click(page, "Next page")
        check("all credits pages fit controller-readable viewport", all(fits))
        click(page, "Back")
        check(
            "credits back restores title and attract lifecycle",
            page.evaluate('BU.app.ui.screen==="title"&&BU.app.screen==="title"'),
        )
        wait(page)
        # Real ten-second idle clock and wake consumption, separate state/records.
        storage = page.evaluate("JSON.stringify(localStorage)")
        page.mouse.move(1800, 1000)
        page.wait_for_timeout(10300)
        check("attract starts after ten seconds", page.evaluate("BU.app.attract"))
        page.wait_for_timeout(900)
        check(
            "attract advances actual repair simulation",
            page.evaluate("BU.app.state.revision>0"),
        )
        page.keyboard.press("Enter")
        wait(page)
        check(
            "attract wake input consumed",
            page.evaluate(
                '!BU.app.attract&&BU.app.ui.screen==="title"&&BU.app.state===null'
            ),
        )
        check(
            "attract does not write saves/settings",
            page.evaluate("JSON.stringify(localStorage)") == storage,
        )
        # Unavailable/corrupted local storage stays playable (new context initialization).
        bad = browser.new_context(viewport={"width": 1280, "height": 720})
        bad.add_init_script(
            "Storage.prototype.getItem=function(){return '{malformed'};Storage.prototype.setItem=function(){throw Error('blocked')}"
        )
        bp = bad.new_page()
        bp.goto(URL)
        bp.wait_for_function("window.__game")
        check(
            "blocked corrupted storage fallback",
            bp.evaluate('__game.errors.length===0&&BU.app.ui.screen==="title"'),
        )
        bad.close()
        check(
            "browser runtime has no errors",
            not errors and not page.evaluate("__game.errors"),
            errors,
        )
    except Exception as e:  # noqa: BLE001 - test runner records failed acceptance evidence
        check(
            "browser integration driver", False, str(e) + "\n" + traceback.format_exc()
        )
        page.screenshot(path=str(ROOT / "evidence/browser-failure.png"))
    context.close()
    # Touch browser emulation in both tablet landscape and phone portrait.
    for name, device in [
        ("tablet", p.devices["iPad Pro 11"]),
        ("phone", p.devices["iPhone 13"]),
    ]:
        c = browser.new_context(**device)
        tp = c.new_page()
        try:
            training(tp)
            t = target(tp, "C1:0")
            tp.touchscreen.tap(*t)
            tp.wait_for_timeout(180)
            check(
                name + " direct touch selects terminal",
                tp.evaluate("BU.app.focusTarget") == "C1:0",
            )
            check(
                name + " contextual touch action is reachable",
                tp.locator(".bu-touch-action").is_visible(),
            )
            check(
                name + " assisted physical action",
                state(tp)["boards"][0]["components"][0]["cuts"][0],
            )
            tp.screenshot(path=str(ROOT / ("evidence/" + name + ".png")))
            tp.evaluate("__game.menu()")
            wait(tp)
            check(
                name + " menu reachable",
                tp.get_by_role("button", name="Resume", exact=True).is_visible(),
            )
        except Exception as e:  # noqa: BLE001 - test runner records failed acceptance evidence
            check(name + " touch emulation", False, str(e))
        c.close()
    browser.close()
(ROOT / "evidence/browser.json").write_text(
    json.dumps(
        {
            "checks": results,
            "runtime": "Chromium 153 / Playwright 1.63; emulated standard gamepad, phone/tablet",
        },
        indent=2,
    )
)
print(json.dumps({"checks": results}))
raise SystemExit(0 if all(r["pass"] for r in results) else 1)
