import json
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "build-config.json").read_text())
URL = (ROOT.parent / CONFIG["filename"]).as_uri()
passed = []
failures = []
errors = []


def check(name, fn):
    try:
        fn()
        passed.append(name)
        (ROOT / "reports/browser-live.json").write_text(
            json.dumps({"passed": passed, "failures": failures})
        )
    except (AssertionError, PlaywrightError) as error:
        failures.append(name + ": " + str(error))
        (ROOT / "reports/browser-live.json").write_text(
            json.dumps({"passed": passed, "failures": failures})
        )


def expect(value, message):
    assert value, message


def advance(page, seconds=0.1):
    page.evaluate("(seconds)=>__DT.game.advance(seconds,{draw:true})", seconds)


def press(page, key, seconds=0.05):
    page.keyboard.down(key)
    advance(page, seconds)
    page.keyboard.up(key)
    advance(page, 0.025)


PAD_STUB = """window.__pads=[];window.__makePad=(index=0)=>({id:'DualSense standard test pad',index,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:0});Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pads});"""
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 1920, "height": 1080}, device_scale_factor=1
    )
    context.add_init_script(PAD_STUB)
    page = context.new_page()
    page.set_default_timeout(6000)
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(URL)
    page.wait_for_function("document.body.dataset.ready==='true'")
    page.evaluate("__DT.game.stop()")
    advance(page)
    check(
        "actual file boots with correct unique marker",
        lambda: expect(
            page.evaluate(
                "document.body.dataset.game==='dungeons-and-deeper-trouble' && __DT.game.errors.length===0"
            ),
            "wrong artifact or runtime error",
        ),
    )
    check(
        "title choices fit the TV viewport",
        lambda: expect(
            page.evaluate(
                "[...document.querySelectorAll('.esh-ttl .esh-btns button')].every(b=>{const r=b.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})"
            ),
            "title choices clipped",
        ),
    )
    page.get_by_role("button", name="Settings", exact=True).hover()
    check(
        "mouse hover moves menu focus",
        lambda: expect(
            page.evaluate("document.activeElement.textContent==='Settings'"),
            "hover did not focus",
        ),
    )
    page.get_by_role("button", name="Settings", exact=True).click()
    check(
        "music starts at exactly ten percent",
        lambda: expect(
            page.evaluate(
                "__DT.game.settings.music===0.1 && __DT.game.audio.musicVolume===0.1"
            ),
            "music default is wrong",
        ),
    )
    page.evaluate("__DT.game.settings.set('music',0.27)")
    page.reload()
    page.wait_for_function("document.body.dataset.ready==='true'")
    page.evaluate("__DT.game.stop()")
    advance(page)
    check(
        "explicit music setting survives reload",
        lambda: expect(
            page.evaluate("__DT.game.settings.music===0.27"), "music override lost"
        ),
    )
    page.evaluate("__DT.game.settings.set('music',0.1)")
    page.get_by_role("button", name="About & credits", exact=True).click()
    check(
        "source information is present in game credits",
        lambda: expect(
            "PLAN.md" in page.locator(".esh-mod").inner_text()
            and "Advanced Dungeons" in page.locator(".esh-mod").inner_text(),
            "missing source metadata",
        ),
    )
    page.get_by_role("button", name="Testing feedback", exact=True).click()
    check(
        "testing feedback screen populated",
        lambda: expect(
            "CRITICAL ISSUES" in page.locator(".esh-mod").inner_text(),
            "missing feedback",
        ),
    )
    page.evaluate("__DT.app.toTitle()")
    advance(page)
    (ROOT / "reports/browser-before-begin.json").write_text(
        json.dumps(
            page.evaluate(
                "({screen:__DT.app.ui.shell.screen,frontend:__DT.app.frontend,paused:__DT.game.paused,own:__DT.app.ui.shell._ownPause,real:__DT.game.real,errors:__DT.game.errors,html:document.querySelector('.dt-shell').innerText})"
            )
        )
    )
    page.get_by_role("button", name="Begin expedition", exact=True).click()
    advance(page, 0.1)
    check(
        "begin enters a playable route graph",
        lambda: expect(
            page.evaluate(
                "__DT.state.phase==='map'&&__DT.app.ui.shell.screen==='route'"
            ),
            "route screen missing",
        ),
    )
    page.get_by_role("button", name="→ The Pale Below", exact=True).click()
    advance(page, 1.7)
    check(
        "first cave enters through actual travel interaction",
        lambda: expect(
            page.evaluate("__DT.state.phase==='cave'&&__DT.state.cave==='chalk'"),
            "travel did not enter cave",
        ),
    )
    page.mouse.move(1300, 600)
    advance(page)
    initial = page.evaluate("__DT.state.stats.shots")
    page.mouse.down()
    advance(page, 0.8)
    check(
        "held mouse fires one shaft per press",
        lambda: expect(
            page.evaluate("__DT.state.stats.shots") == initial + 1,
            "held fire repeated or failed",
        ),
    )
    page.mouse.up()
    advance(page, 0.5)
    x = page.evaluate("__DT.state.players[0].x")
    press(page, "d", 0.4)
    check(
        "keyboard movement reaches production simulation",
        lambda: expect(
            page.evaluate("__DT.state.players[0].x") > x + 10, "WASD did not move"
        ),
    )
    press(page, "Escape")
    tick = page.evaluate("__DT.state.tick")
    advance(page, 1)
    check(
        "solo pause freezes gameplay clock",
        lambda: expect(
            page.evaluate("__DT.game.paused && __DT.state.tick") == tick,
            "paused simulation advanced",
        ),
    )
    page.get_by_role("button", name="Resume", exact=True).click()
    advance(page, 0.2)
    check(
        "resume returns to the expedition",
        lambda: expect(page.evaluate("__DT.state.tick") > tick, "resume stayed frozen"),
    )
    press(page, "Tab")
    check(
        "field map opens with explored fog",
        lambda: expect(
            page.evaluate("__DT.app.ui.shell.screen==='map'&&__DT.game.paused"),
            "field map failed",
        ),
    )
    press(page, "Escape")
    advance(page, 0.1)
    check(
        "map closes without stuck inputs",
        lambda: expect(
            page.evaluate("!__DT.app.ui.shell.screen&&!__DT.game.paused"),
            "map did not close",
        ),
    )
    page.evaluate("window.__pads=[__makePad(0)];__pads[0].axes[0]=.75")
    advance(page, 0.3)
    check(
        "standard gamepad movement switches prompts",
        lambda: expect(
            page.evaluate("__DT.game.input.lastDevice==='gamepad'"), "pad not detected"
        ),
    )
    page.evaluate(
        "__pads[0].axes[0]=0;__pads[0].buttons[7]={pressed:true,value:1,touched:true}"
    )
    advance(page, 0.6)
    page.evaluate("__pads[0].buttons[7]={pressed:false,value:0,touched:false}")
    advance(page, 0.1)
    check(
        "PlayStation glyphs are the controller default",
        lambda: expect(
            page.evaluate("__DT.game.input.label('fire')==='R2'"), "wrong PS glyph"
        ),
    )
    page.evaluate("__DT.game.settings.set('glyphs','xbox')")
    check(
        "Xbox glyph preference applies to prompts",
        lambda: expect(
            page.evaluate("__DT.game.input.label('interact')==='A'"), "wrong Xbox glyph"
        ),
    )
    page.evaluate(
        "__DT.game.settings.set('glyphs','playstation');__DT.game.input.rebind('fire','keys','KeyF');__DT.game.input.lastDevice='keyboard'"
    )
    check(
        "rebinding updates action prompts",
        lambda: expect(
            page.evaluate("__DT.game.input.label('fire')==='F'"),
            "rebind prompt unchanged",
        ),
    )
    page.evaluate("__DT.game.input.resetBindings();__pads[0].axes[0]=.7")
    advance(page, 0.1)
    page.evaluate("__pads=[]")
    advance(page, 0.1)
    check(
        "controller loss clears movement and pauses solo",
        lambda: expect(
            page.evaluate("__DT.game.paused"), "controller loss did not pause"
        ),
    )
    page.get_by_role("button", name="Developer tools", exact=True).click()
    page.get_by_role("button", name="Tune movement", exact=True).click()
    page.evaluate("__DT.game.settings.set('dev_moveSpeed',83)")
    check(
        "live balance slider changes current rules",
        lambda: expect(
            page.evaluate("__DT.app.sim.tunables.moveSpeed===83"),
            "live value unchanged",
        ),
    )
    page.get_by_role("button", name="Reset this page", exact=True).click()
    check(
        "reset restores balance defaults",
        lambda: expect(
            page.evaluate(
                "__DT.app.sim.tunables.moveSpeed===DTConfig.defaults.moveSpeed"
            ),
            "reset failed",
        ),
    )
    page.evaluate("__DT.app.ui.shell.hide();__DT.app.toTitle()")
    advance(page)
    checksum = page.evaluate(
        "[localStorage.getItem('deeper-trouble:campaign:1:a'),localStorage.getItem('deeper-trouble:campaign:1:b')].join('|')"
    )
    page.evaluate("__DT.app.lastActivity=__DT.game.real")
    advance(page, 9.99)
    check(
        "attract waits for ten seconds of idle",
        lambda: expect(not page.evaluate("__DT.app.attract"), "attract started early"),
    )
    advance(page, 0.04)
    check(
        "attract starts an isolated demonstration",
        lambda: expect(
            page.evaluate("__DT.app.attract && !__DT.app.net"), "attract did not start"
        ),
    )
    press(page, "x")
    check(
        "first input dismisses and is consumed",
        lambda: expect(
            page.evaluate("__DT.app.frontend&&!__DT.app.attract"),
            "attract input started play",
        ),
    )
    check(
        "attract preserves campaign save byte-for-byte",
        lambda: expect(
            page.evaluate(
                "[localStorage.getItem('deeper-trouble:campaign:1:a'),localStorage.getItem('deeper-trouble:campaign:1:b')].join('|')"
            )
            == checksum,
            "attract changed save",
        ),
    )
    page.evaluate(
        "__DT.start('couch');__DT.app.ui.shell.hide();__DT.app.sim.enterCave('chalk');window.__pads=[__makePad(0)];__DT.game.input.pad=null;__DT.game.addPlayer({pad:0});__pads[0].axes[0]=.8"
    )
    advance(page, 0.3)
    check(
        "keyboard and pad own distinct couch seats",
        lambda: expect(
            page.evaluate(
                "__DT.state.players.length===2&&__DT.game.players[0].pad===null&&__DT.game.players[1].pad===0"
            ),
            "device seat assignment failed",
        ),
    )
    page.evaluate("__DT.app.save(true)")
    page.reload()
    page.wait_for_function("document.body.dataset.ready==='true'")
    page.evaluate("__DT.game.stop()")
    advance(page)
    check(
        "continue is available after saved expedition",
        lambda: expect(
            page.get_by_role("button", name="Continue the trail", exact=True).count()
            == 1,
            "missing Continue",
        ),
    )
    page.get_by_role("button", name="Continue the trail", exact=True).click()
    advance(page, 0.2)
    check(
        "continue restores valid current and restart state",
        lambda: expect(
            page.evaluate(
                "__DT.state.players.length===1&&__DT.app.sim.checkpoint.version===DTContent.version"
            ),
            "continue state malformed",
        ),
    )
    check(
        "Chromium reports no game or JavaScript errors",
        lambda: expect(
            not errors and page.evaluate("__DT.game.errors.length===0"), str(errors)
        ),
    )
    context.close()
    phone = browser.new_context(**pw.devices["iPhone 13"])
    mobile = phone.new_page()
    mobile.on("pageerror", lambda e: errors.append(str(e)))
    mobile.goto(URL)
    mobile.wait_for_function("document.body.dataset.ready==='true'")
    mobile.evaluate(
        "__DT.game.stop();__DT.start('solo');__DT.app.sim.enterCave('chalk');__DT.app.ui.shell.hide()"
    )
    advance(mobile, 0.2)
    before = mobile.evaluate("__DT.state.stats.shots")
    mobile.touchscreen.tap(330, 470)
    advance(mobile, 0.5)
    check(
        "touch right-side tap fires a single intentional shaft",
        lambda: expect(
            mobile.evaluate("__DT.state.stats.shots") == before + 1, "touch shot failed"
        ),
    )
    cdp = phone.new_cdp_session(mobile)
    cdp.send(
        "Input.dispatchTouchEvent",
        {"type": "touchStart", "touchPoints": [{"x": 80, "y": 500, "id": 91}]},
    )
    cdp.send(
        "Input.dispatchTouchEvent",
        {"type": "touchMove", "touchPoints": [{"x": 130, "y": 500, "id": 91}]},
    )
    advance(mobile, 0.3)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchCancel", "touchPoints": []})
    advance(mobile, 0.1)
    check(
        "touch cancellation releases invisible stick",
        lambda: expect(
            mobile.evaluate(
                "__DT.app.inputs.touch.pointers.size===0&&__DT.app.inputs.touch.move.every(x=>x===0)"
            ),
            "touch remained held",
        ),
    )
    mobile.screenshot(path=str(ROOT / "reports/touch.png"))
    phone.close()
    browser.close()
    second = pw.webkit.launch(headless=True)
    ctx = second.new_context(viewport={"width": 1280, "height": 720})
    pg = ctx.new_page()
    try:
        pg.goto(URL)
        pg.wait_for_function("document.body.dataset.ready==='true'", timeout=20000)
        pg.get_by_role("button", name="Begin expedition", exact=True).click()
        pg.wait_for_timeout(300)
        check(
            "secondary WebKit engine boots the same file and route UI",
            lambda: expect(
                pg.evaluate("__DT.state.phase==='map'&&__DT.game.errors.length===0"),
                "WebKit startup failed",
            ),
        )
    except PlaywrightError as e:
        failures.append("WebKit startup: " + str(e))
    finally:
        ctx.close()
        second.close()
report = {
    "passed": len(passed),
    "failed": len(failures),
    "checks": passed,
    "failures": failures,
    "pageErrors": errors,
}
(ROOT / "reports/browser.json").write_text(json.dumps(report, indent=2))
for failure in failures:
    print(failure)
print(f"{len(passed)} browser/input checks passed; {len(failures)} failed")
raise SystemExit(bool(failures))
