import json
import traceback
from pathlib import Path

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
config = json.loads((root / "build-config.json").read_text())
artifact = root.parent / (config["base"] + ".html")
results = []
details = {}
captures = []


def check(name, fn):
    try:
        value = fn()
        results.append({"name": name, "pass": True})
        return value
    except Exception:
        results.append({"name": name, "pass": False, "error": traceback.format_exc()})
        return None


def expect(value, message="assertion failed"):
    if not value:
        raise AssertionError(message)


def advance(p, s=0.025, draw=True):
    return p.evaluate("([s,d])=>game.advance(s,{draw:d})", [s, draw])


def key(p, k, s=0.025):
    p.keyboard.down(k)
    advance(p, s)
    p.keyboard.up(k)
    advance(p, 0.025)


def capture(p, name):
    p.evaluate("game.advance(0,{draw:true})")
    p.screenshot(path=str(root / "artifacts" / name), animations="disabled")
    captures.append(name)


pad_script = """window.__pad={id:'DualSense Wireless Controller',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:1};Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pad?[window.__pad]:[]});"""
with sync_playwright() as pw:
    browser = pw.chromium.launch(
        headless=True, args=["--autoplay-policy=no-user-gesture-required"]
    )
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    context.add_init_script(pad_script)
    page = context.new_page()
    page.set_default_timeout(5000)
    errors = []
    requests = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("request", lambda r: requests.append(r.url))
    page.goto(artifact.as_uri() + "?test=1")
    page.wait_for_function("document.body.dataset.booted==='true'")
    page.evaluate("game.stop()")
    check(
        "packaged file boot, inline dependencies, 10% music",
        lambda: (
            expect(
                page.evaluate(
                    "game.errors.length===0 && game.W===640 && game.H===360 && game.settings.music===.1"
                )
            ),
            expect(not any("/src/" in u or "/vendor/" in u for u in requests)),
        ),
    )

    def title_fit():
        capture(page, "title.png")
        boxes = page.locator(".esh-ttl .esh-btns button").evaluate_all(
            "(es)=>es.map(e=>{const b=e.getBoundingClientRect();return [b.top,b.bottom]})"
        )
        expect(len(boxes) == 5)
        expect(
            all(0 <= top < bottom <= 1080 for top, bottom in boxes),
            "title actions clipped " + str(boxes),
        )

    check("TV title shows every action and selected focus", title_fit)

    def keyboard_start():
        key(page, "Enter")
        expect(page.evaluate("TimeBandit.ui.screen==='setup'"))
        key(page, "Enter")
        expect(page.evaluate("TimeBandit.snapshot().scene==='play'"))
        advance(page, 7)
        expect(
            page.evaluate(
                "TimeBandit.world.enemies.length===18 && TimeBandit.world.phase==='playing'"
            )
        )
        capture(page, "early-combat.png")

    check("keyboard starts actual campaign and curved fleet arrives", keyboard_start)

    def movement_fire():
        before = page.evaluate("TimeBandit.world.players[0].x")
        key(page, "d", 0.25)
        after = page.evaluate("TimeBandit.world.players[0].x")
        expect(after > before + 40)
        key(page, "Space", 0.1)
        expect(
            page.evaluate(
                "TimeBandit.world.events.some(e=>e.type==='shot'&&e.owner===0)"
            )
        )
        expect(page.evaluate("TimeBandit.world.shots.length<=1"))

    check("keyboard horizontal movement and held fire", movement_fire)

    def pointer_control():
        page.mouse.move(1500, 850)
        advance(page, 0.3)
        target = page.evaluate("TimeBandit.world.players[0].x")
        expect(target > 230)
        key(page, "a", 0.2)
        x = page.evaluate("TimeBandit.world.players[0].x")
        advance(page, 0.15)
        expect(
            abs(page.evaluate("TimeBandit.world.players[0].x") - x) < 1,
            "old pointer stole control",
        )
        page.mouse.move(1502, 850)
        advance(page, 0.1)
        expect(
            abs(page.evaluate("TimeBandit.world.players[0].x") - x) < 1,
            "mouse jitter stole control",
        )
        page.mouse.move(1710, 850)
        advance(page, 0.2)
        expect(page.evaluate("TimeBandit.world.players[0].x") > x + 25)
        page.mouse.down()
        advance(page, 0.1)
        page.mouse.up()
        expect(page.evaluate("TimeBandit.world.events.some(e=>e.type==='shot')"))

    check("mouse targets cannon x, keyboard overrides, jitter ignored", pointer_control)

    def pad_play():
        page.evaluate("window.__pad.axes[0]=.85")
        advance(page, 0.2)
        expect(page.evaluate("game.input.lastDevice==='gamepad'"))
        page.evaluate(
            "window.__pad.axes[0]=0;window.__pad.buttons[0]={pressed:true,value:1}"
        )
        advance(page, 0.1)
        page.evaluate("window.__pad.buttons[0]={pressed:false,value:0}")
        advance(page, 0.02)
        page.evaluate(
            "TimeBandit.world.brake=100;window.__pad.buttons[2]={pressed:true,value:1}"
        )
        advance(page, 0.03)
        page.evaluate("window.__pad.buttons[2]={pressed:false,value:0}")
        advance(page, 0.025)
        expect(page.evaluate("TimeBandit.world.stats.brakes===1"))
        capture(page, "brake.png")
        key(page, "a", 0.1)
        expect(page.evaluate("game.input.lastDevice==='keyboard'"))
        advance(page, 0.05)
        expect(
            page.evaluate("game.input.lastDevice==='keyboard'"),
            "idle pad stole prompts",
        )

    check("standard gamepad movement, fire, brake and modality", pad_play)

    def pause_dev():
        key(page, "Escape")
        expect(page.evaluate("game.paused && TimeBandit.ui.screen==='pause'"))
        tick = page.evaluate("TimeBandit.world.tick")
        advance(page, 0.2)
        expect(page.evaluate("TimeBandit.world.tick") == tick)
        page.get_by_role("button", name="Dev Mode", exact=True).click()
        expect(page.evaluate("TimeBandit.world.modified"))
        before = page.evaluate("TimeBandit.world.tick")
        page.get_by_role("button", name="Step one tick", exact=True).click()
        expect(page.evaluate("TimeBandit.world.tick") == before + 1)
        expect(page.evaluate("game.paused"))
        page.get_by_role("button", name="Live tuning sliders", exact=True).click()
        slider = page.get_by_role("slider", name="Machine speed", exact=True)
        slider.fill("300")
        slider.dispatch_event("input")
        expect(page.evaluate("TimeBandit.world.tuning.playerSpeed===300"))
        persisted = page.evaluate(
            "My3D2dge.store.get(game.settings._key,{}).values||{}"
        )
        expect(
            not any(k.startswith("dev_") for k in persisted),
            "dev tuning leaked into saved settings",
        )
        page.get_by_role("button", name="Reset tuning to defaults", exact=True).click()
        expect(page.evaluate("TimeBandit.world.tuning.playerSpeed===220"))
        page.get_by_role("button", name="Back", exact=True).first.click()
        page.get_by_role("button", name="Jump to encounter", exact=True).click()
        page.get_by_role("button", name="08 · The final invoice", exact=True).click()
        advance(page, 8)
        expect(page.evaluate("TimeBandit.world.wave===7"))
        capture(page, "all-threat-combat.png")
        key(page, "Escape")
        page.get_by_role("button", name="Dev Mode", exact=True).click()
        page.get_by_role("button", name="Live tuning sliders", exact=True).click()
        expect("0.13 s" in page.locator(".esh-mod").inner_text())
        expect("0.35 ×" in page.locator(".esh-mod").inner_text())
        page.evaluate("game.shell.hide();game.resume()")

    check(
        "native pause, dev tick, live sliders, persistence, reset and wave jump",
        pause_dev,
    )

    def pad_menus():
        page.evaluate("game.shell.hide();game.resume();game.pause()")
        advance(page, 0.025)
        page.get_by_role("button", name="Settings", exact=True).click()
        page.get_by_role("button", name="Controls", exact=True).click()
        b = page.get_by_role("button", name="Button symbols:", exact=False)
        b.focus()
        page.evaluate("game.settings.set('glyphs','xbox');game.shell.show('controls')")
        expect(page.evaluate("game.input.label('fire','gamepad')==='A'"))
        page.evaluate("game.settings.set('glyphs','playstation')")
        expect(page.evaluate("game.input.label('fire','gamepad')==='✕'"))
        # Use native controller focus/confirm/back rather than DOM click.
        initial = page.evaluate("document.activeElement.textContent")
        page.evaluate("window.__pad.buttons[13]={pressed:true,value:1}")
        advance(page, 0.025)
        page.evaluate("window.__pad.buttons[13]={pressed:false,value:0}")
        advance(page, 0.025)
        expect(page.evaluate("document.activeElement.textContent") != initial)
        page.evaluate("window.__pad.buttons[1]={pressed:true,value:1}")
        advance(page, 0.025)
        page.evaluate("window.__pad.buttons[1]={pressed:false,value:0}")
        advance(page, 0.025)
        expect(page.evaluate("TimeBandit.ui.screen==='settings'"))
        page.evaluate("game.shell.hide();game.resume()")
        advance(page, 0.025)

    check("gamepad focus, back and PlayStation/Xbox glyphs", pad_menus)

    def boss_results():
        page.evaluate("TimeBandit.openDev()")
        page.get_by_role("button", name="Jump to encounter", exact=True).click()
        page.get_by_role("button", name="Boss 3 · Overtime", exact=True).click()
        advance(page, 3)
        capture(page, "boss.png")
        # A separate natural loss uses damage; it is not the whole-campaign success test.
        page.evaluate("TimeBandit.startSolo(false)")
        advance(page, 3)
        for i in range(3):
            page.evaluate(
                "(()=>{const w=TimeBandit.world,p=w.players[0];p.inv=0;w.threats.push({id:9000+w.tick,kind:'dart',x:p.x,y:p.y,px:p.x,py:p.y,vx:0,vy:0,age:0,warn:0,state:'air',target:p.id,tx:p.x,ty:p.y,r:5,life:1,ground:false});})()"
            )
            advance(page, 0.025)
        expect(
            page.evaluate(
                "TimeBandit.world.outcome && !TimeBandit.world.outcome.won && TimeBandit.ui.screen==='results'"
            )
        )
        capture(page, "failure.png")
        page.get_by_role("button", name="Retry campaign", exact=True).click()
        advance(page, 0.025)
        expect(
            page.evaluate(
                "TimeBandit.world.players[0].hp===3 && !TimeBandit.world.outcome"
            )
        )

    check("boss screen, actual damage loss and immediate retry", boss_results)

    def records():
        page.evaluate(
            'TimeBandit.world.score=120;TimeBandit.world.phase="results";TimeBandit.world.outcome={won:true};TimeBandit.showResults()'
        )
        page.get_by_role("button", name="Save six-letter record", exact=True).click()
        expect(page.locator(".esh-btns button").count() == 8)
        page.get_by_role("button", name="Character 4", exact=False).click()
        expect(
            page.evaluate(
                "document.activeElement.textContent.startsWith('Character 4')"
            )
        )
        key(page, "ArrowLeft")
        expect(
            page.evaluate(
                "document.activeElement.textContent.startsWith('Character 4')"
            )
        )
        page.get_by_role("button", name="Keep PILOTX", exact=True).click()
        expect(page.evaluate("TimeBandit.getRecords()[0].name==='PILOTX'"))
        expect(page.evaluate("TimeBandit.getRecords()[0].mode==='solo'"))
        page.evaluate("TimeBandit.showResults()")
        capture(page, "results.png")

    check("six-character controller picker saves labeled local record", records)

    def about():
        page.evaluate("TimeBandit.showCredits(0)")
        groups = set()
        usage = False
        total = int(
            page.locator(".esh-mod > .esh-k").first.inner_text().split("/")[-1].strip()
        )
        for i in range(total):
            groups.add(page.locator(".esh-mod h2").text_content())
            usage = usage or page.get_by_text("added on import", exact=True).count() > 0
            fit = page.locator(".esh-mod").evaluate(
                "(e)=>e.scrollHeight<=e.clientHeight+3"
            )
            expect(fit, "credits page clips static content at page " + str(i))
            if i == 3:
                capture(page, "credits.png")
            page.get_by_role("button", name="Next page", exact=True).click()
        expect(usage)
        expect(
            all(
                g in groups
                for g in [
                    "Source Information",
                    "Testing Feedback",
                    "Engine Feedback",
                    "Prompt Feedback",
                ]
            )
        )
        page.evaluate("TimeBandit.showHelp()")
        for i in range(4):
            expect(
                page.locator(".esh-mod").evaluate(
                    "(e)=>e.scrollHeight<=e.clientHeight+3"
                ),
                "help page overflow",
            )
            page.get_by_role("button", name="Next page", exact=True).click()

    check("controller-readable pages contain all information and instructions", about)

    def attract():
        before = page.evaluate("JSON.stringify(TimeBandit.getRecords())")
        page.evaluate("TimeBandit.title()")
        advance(page, 9.8)
        expect(not page.evaluate("TimeBandit.snapshot().demo"))
        advance(page, 0.3)
        expect(page.evaluate("TimeBandit.snapshot().demo"))
        advance(page, 76, False)
        seen = page.evaluate("TimeBandit.world.seen")
        expect(
            all(x in seen for x in ["dart", "mine", "roller", "hunter", "boss2"]),
            str(seen),
        )
        expect(page.evaluate("JSON.stringify(TimeBandit.getRecords())") == before)
        key(page, "Enter")
        expect(
            page.evaluate("TimeBandit.ui.screen==='title' && TimeBandit.world===null"),
            "wake was not consumed",
        )
        for device in ["mouse", "pad"]:
            page.evaluate("TimeBandit.startAttract()")
            advance(page, 0.03)
            if device == "mouse":
                page.mouse.move(250, 300)
            else:
                page.evaluate("window.__pad.axes[0]=.8")
                advance(page, 0.025)
                page.evaluate("window.__pad.axes[0]=0")
            advance(page, 0.025)
            expect(
                page.evaluate(
                    "TimeBandit.ui.screen==='title' && !TimeBandit.snapshot().demo"
                )
            )

    check(
        "10-second attract, all threat showcase, wake consumption, saved-state isolation",
        attract,
    )

    def focus_disconnect():
        page.evaluate("TimeBandit.startSolo(false)")
        advance(page, 2.1)
        page.evaluate("window.dispatchEvent(new Event('blur'))")
        advance(page, 0.025)
        expect(page.evaluate("game.paused && game.pauseReason==='focus'"))
        page.evaluate("game.shell.hide();game.resume();window.__pad.axes[0]=.8")
        advance(page, 0.03)
        page.evaluate("window.__pad=null")
        advance(page, 0.03)
        expect(page.evaluate("game.paused"))

    check("solo focus loss and controller disconnect pause safely", focus_disconnect)

    def audio():
        page.evaluate("TimeBandit.sound.unlock()")
        signal = page.evaluate("TimeBandit.audioSignalCheck()")
        details["audio"] = signal
        evidence = page.evaluate("TimeBandit.audioEvidence()")
        details["audioEvidence"] = evidence
        expect(
            all(
                s["finite"] and 0.00001 < s["peak"] < 1
                for s in evidence["signals"].values()
            )
        )
        expect(all(v == 0 for v in evidence["silent"].values()))
        expect(
            signal["finite"] and 0.001 < signal["peak"] < 1 and signal["rms"] > 0.001
        )
        expect(page.evaluate("game.settings.music===.1"))
        page.evaluate(
            "game.settings.set('voice',0);game.settings.set('effects',0);game.settings.set('music',0);game.settings.set('sound',false)"
        )
        expect(
            page.evaluate(
                "game.audio.bus('voice').gain.value===0 && game.audio.bus('sfx').gain.value===0 && game.audio.bus('music').gain.value===0 && game.audio.bus('master').gain.value===0"
            )
        )
        page.evaluate("TimeBandit.sound.end()")
        expect(page.evaluate("TimeBandit.sound.nodes.length===0 && !game.audio.song"))

    check(
        "offline audio signal, 10% default, independent buses and terminal silence",
        audio,
    )

    def inherited_developer_flags():
        for flag in ["invulnerable", "ai", "hitboxes", "trajectories"]:
            page.evaluate(
                "(flag)=>{TimeBandit.resetTuning();TimeBandit.startSolo(false);game.settings.set('dev_'+flag,true);TimeBandit.startSolo(false);}",
                flag,
            )
            expect(
                page.evaluate("TimeBandit.world.modified"),
                "inherited " + flag + " allowed a normal record",
            )
        page.evaluate(
            "TimeBandit.resetTuning();TimeBandit.startSolo(false);TimeBandit.openDev()"
        )
        page.get_by_role("button", name="Simulation speed:", exact=False).click()
        page.evaluate("TimeBandit.startSolo(false)")
        expect(
            page.evaluate("TimeBandit.world.modified"),
            "inherited simulation speed allowed a normal record",
        )
        page.evaluate("TimeBandit.resetTuning();TimeBandit.startSolo(false)")
        expect(
            page.evaluate("!TimeBandit.world.modified"),
            "reset failed to restore standard eligibility",
        )

    check(
        "inherited developer assists and speed cannot submit normal records",
        inherited_developer_flags,
    )

    def full_campaign():
        page.evaluate(
            'TimeBandit.resetTuning();TimeBandit.startSolo(false);game.settings.set("autoFire",false);game.settings.set("slowHostiles",false);game.settings.set("emergencyBrake",false);TimeBandit.sound.end();TimeBandit.setAutomation(TimeBandit.botAction)'
        )
        for i in range(20):
            advance(page, 50, False)
            if page.evaluate("!!TimeBandit.world.outcome"):
                break
        result = page.evaluate(
            "({won:TimeBandit.world.outcome?.won,seen:TimeBandit.world.seen,score:TimeBandit.world.score,modified:TimeBandit.world.modified,time:TimeBandit.world.time})"
        )
        details["bundleCampaign"] = result
        expect(result["won"], str(result))
        expect(not result["modified"])
        expect(all("boss" + str(i) in result["seen"] for i in range(3)))
        advance(page, 6.2)
        capture(page, "victory.png")

    check("packaged whole-campaign action playthrough reaches victory", full_campaign)
    check("no Chromium runtime exceptions", lambda: expect(not errors, str(errors)))

    def narrow_geometry():
        page.set_viewport_size({"width": 390, "height": 700})
        page.evaluate("game.screen.resize();game.advance(0,{draw:true})")
        expect(
            page.evaluate(
                "game.W===640 && game.H===360 && game.screen.OX>=-1 && game.screen.S*game.W<=innerWidth*devicePixelRatio+2"
            )
        )

    check(
        "narrow low-DPR viewport preserves the complete defense rail", narrow_geometry
    )
    context.close()
    # Corrupt storage is isolated in a fresh page.
    c = browser.new_context()
    c.add_init_script(
        "Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked storage')}})"
    )
    p = c.new_page()
    p.goto(artifact.as_uri() + "?test=1")
    p.wait_for_function("document.body.dataset.booted==='true'")
    check(
        "unavailable storage survives boot and settings",
        lambda: expect(
            p.evaluate("game.errors.length===0 && game.settings.music===.1")
        ),
    )
    c.close()
    # Touch profile: canonical arena, simultaneous drag and context brake, pointercancel.
    touch = browser.new_context(**pw.devices["iPhone 13"])
    p = touch.new_page()
    p.goto(artifact.as_uri() + "?test=1")
    p.wait_for_function("document.body.dataset.booted==='true'")
    p.evaluate("game.stop();TimeBandit.startSolo(false);game.advance(2.1,{draw:true})")

    def touch_play():
        expect(
            p.evaluate(
                "TimeBandit.world.assists.autoFire && game.W===640 && game.H===360"
            )
        )
        cdp = touch.new_cdp_session(p)
        cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchStart", "touchPoints": [{"x": 100, "y": 420, "id": 7}]},
        )
        cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchMove", "touchPoints": [{"x": 160, "y": 420, "id": 7}]},
        )
        advance(p, 0.1)
        p.evaluate("TimeBandit.world.brake=100")
        advance(p, 0.025)
        expect(p.locator("#touch-brake").is_visible())
        p.locator("#touch-brake").dispatch_event(
            "pointerdown", {"pointerType": "touch", "pointerId": 8}
        )
        advance(p, 0.025)
        expect(p.evaluate("TimeBandit.world.stats.brakes===1"))
        cdp.send("Input.dispatchTouchEvent", {"type": "touchCancel", "touchPoints": []})
        advance(p, 0.025)
        expect(p.evaluate("game.errors.length===0"))
        capture(p, "touch-portrait.png")
        p.set_viewport_size({"width": 844, "height": 390})
        advance(p, 0.025)
        expect(p.evaluate("game.W===640 && game.H===360"))
        capture(p, "touch-landscape.png")
        expect(p.evaluate("game.screen.S*game.W<=innerWidth*devicePixelRatio+2"))

    check(
        "touch assisted play, simultaneous brake, cancel, portrait and landscape",
        touch_play,
    )

    def touch_wake():
        p.evaluate("TimeBandit.title();TimeBandit.startAttract()")
        advance(p, 0.025)
        p.touchscreen.tap(300, 180)
        advance(p, 0.025)
        expect(
            p.evaluate("!TimeBandit.snapshot().demo && TimeBandit.ui.screen==='title'")
        )

    check("touch wakes and consumes attract tap", touch_wake)
    touch.close()
    browser.close()
    for name in ["webkit", "firefox"]:
        engine = getattr(pw, name)
        try:
            b = engine.launch(headless=True)
            p = b.new_page(viewport={"width": 1280, "height": 720})
            err = []
            p.on("pageerror", lambda e: err.append(str(e)))
            p.goto(artifact.as_uri() + "?test=1")
            p.wait_for_function("document.body.dataset.booted==='true'", timeout=15000)
            p.evaluate(
                "game.stop();TimeBandit.startSolo(false);game.advance(7,{draw:true})"
            )
            check(
                name + " packaged boot, Canvas renderer and keyboard",
                lambda: expect(
                    p.evaluate(
                        "game.errors.length===0 && TimeBandit.world.wave===0 && game.W===640"
                    )
                    and not err,
                    str(err),
                ),
            )
            key(p, "d", 0.1)
            expect(p.evaluate("TimeBandit.world.players[0].x") > 170)
            b.close()
        except Exception:
            results.append(
                {
                    "name": name + " packaged browser",
                    "pass": False,
                    "error": traceback.format_exc(),
                }
            )
report = {"results": results, "details": details, "captures": captures}
print(json.dumps(report))
