import json
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import quote

from playwright.sync_api import sync_playwright

D = Path(__file__).resolve().parent.parent
(D / "artifacts/runtime").mkdir(exist_ok=True)
os.environ["TMPDIR"] = str(D / "artifacts/runtime")
PROJECT = json.loads((D / "project.json").read_text())
FILE = (D.parent / PROJECT["html"]).as_uri()
failures = []
count = 0
evidence = {}
active_pages = []


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(
    ("127.0.0.1", 0), partial(QuietHandler, directory=str(D.parent))
)
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()
BASE = "http://127.0.0.1:" + str(server.server_port)
HARNESS = (
    BASE
    + "/"
    + quote(D.name)
    + "/vendor/ai-hub/lib/hub/harness.html?game="
    + quote("../../../../../" + PROJECT["html"])
)
PAD_SCRIPT = """window.__pads=[]; window.__pad=(i=0)=>({id:'DualSense Test '+i,index:i,mapping:'standard',connected:true,timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0}))}); Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pads});"""


def test(name, fn):
    global count
    count += 1
    try:
        fn()
    except Exception as e:  # noqa: BLE001 - test runner records all check failures
        failures.append(name + ": " + str(e)[:1800])


def check(value, message="assertion failed"):
    if not value:
        raise AssertionError(message)


def ready(page):
    page.wait_for_function(
        'window.__moon && document.body.dataset.game === "moonriders-20261106"',
        timeout=20000,
    )
    check(page.evaluate("Moonriders.TITLE") == PROJECT["title"], "wrong game identity")


def shot(page, name):
    page.screenshot(path=str(D / "artifacts" / name))


def snap(page):
    return page.evaluate("__moon.snapshot()")


def key(page, k):
    page.keyboard.press(k)
    page.wait_for_timeout(100)


def pad(page, index, button, hold=70):
    page.evaluate(
        "([i,b])=>{__pads[i].buttons[b]={pressed:true,touched:true,value:1}}",
        [index, button],
    )
    page.wait_for_timeout(hold)
    page.evaluate(
        "([i,b])=>{__pads[i].buttons[b]={pressed:false,touched:false,value:0}}",
        [index, button],
    )
    page.wait_for_timeout(70)


def pad_pick(page, label, max_steps=100, index=0):
    for _ in range(max_steps):
        if page.evaluate("document.activeElement?.textContent?.trim()") == label:
            pad(page, index, 0)
            return
        pad(page, index, 13, 35)
    raise AssertionError("pad could not focus " + label)


def quiet_errors(page):
    return page.evaluate("__moon.game.errors.map(e=>e.message)")


def open_page(browser, **kwargs):
    context = browser.new_context(**kwargs)
    context.add_init_script(PAD_SCRIPT)
    page = context.new_page()
    page.set_default_timeout(4500)
    page._err = []
    page._warn = []
    page.on("pageerror", lambda e: page._err.append(str(e)))
    page.on(
        "console", lambda m: page._warn.append(m.text) if m.type == "warning" else None
    )
    return context, page


def basic(p, browser):
    context, page = open_page(
        browser, viewport={"width": 1920, "height": 1080}, device_scale_factor=1
    )
    try:
        page.goto(FILE)
        ready(page)
        test(
            "file package opens on original title without runtime fetches",
            lambda: check(
                snap(page)["scene"] == "title"
                and not page._err
                and not quiet_errors(page),
                str(page._err),
            ),
        )
        test(
            "default music gain is exactly ten percent",
            lambda: check(
                page.evaluate(
                    "__moon.game.settings.music===.1 && __moon.game.audio.musicVolume===.1"
                )
            ),
        )
        shot(page, "title.png")

        def pointer():
            b = page.get_by_role("button", name="Evasion · 3 minutes", exact=True)
            b.hover()
            check(
                page.evaluate("document.activeElement.textContent")
                == "Evasion · 3 minutes"
            )
            b.click()
            check(snap(page)["screen"] == "evasionBrief")
            check("offline" in page.get_by_role("dialog").inner_text().lower())
            page.get_by_role("button", name="Back", exact=True).first.click()

        test("pointer hover moves focus and click opens explained Evasion", pointer)
        page.get_by_role("button", name="Play operation", exact=True).click()
        page.wait_for_timeout(120)
        shot(page, "opening.png")
        test(
            "operation begins already in playable flight",
            lambda: check(
                snap(page)["scene"] == "play"
                and snap(page)["screen"] is None
                and snap(page)["sector"] == 0
            ),
        )

        def mouse_aim():
            page.mouse.move(700, 180)
            page.wait_for_timeout(120)
            s = snap(page)
            check(s["inputFamily"] == "mouse")
            check(s["ship"]["aimY"] < -0.4, str(s["ship"]))
            page.mouse.down()
            page.wait_for_timeout(220)
            page.mouse.up()
            check(snap(page)["didFire"])

        test("mouse truly aims and held click fires", mouse_aim)

        def movement():
            x = snap(page)["ship"]["x"]
            page.keyboard.down("d")
            page.wait_for_timeout(350)
            page.keyboard.up("d")
            check(snap(page)["ship"]["x"] > x + 15)
            page.keyboard.down("Shift")
            page.wait_for_timeout(210)
            page.keyboard.up("Shift")
            shot(page, "warp.png")
            check(snap(page)["ship"]["energy"] < 65)
            page.wait_for_timeout(600)

        test("keyboard steering and fresh Shift commit work", movement)
        key(page, "Escape")
        page.wait_for_function('__moon.ui.screen === "pause"')
        shot(page, "pause.png")

        def pause():
            t = snap(page)["tick"]
            page.wait_for_timeout(180)
            check(snap(page)["tick"] == t)
            page.get_by_role("button", name="Developer tools", exact=True).click()
            check(snap(page)["screen"] == "dev")
            page.get_by_role("button", name="Flight balance", exact=True).click()
            slider = page.get_by_role("slider", name="Flight speed", exact=True)
            slider.fill("120")
            check(page.evaluate("__moon.sim.balance.speed") == 120)
            page.get_by_role(
                "button", name="Reset authored defaults", exact=True
            ).click()
            check(page.evaluate("__moon.sim.balance.speed") == 96)
            page.get_by_role("button", name="Back", exact=True).first.click()
            page.get_by_role(
                "button", name="Collision + ownership overlay: off", exact=True
            ).click()
            check(page.evaluate("__moon.overlay"))
            page.get_by_role(
                "button", name="Advance one fixed step", exact=True
            ).click()
            check(snap(page)["tick"] == t + 1)
            page.get_by_role("button", name="Flight balance", exact=True).focus()
            page.locator(".esh-mod").evaluate("e=>e.scrollTop=0")
            page.wait_for_timeout(300)
            shot(page, "tools.png")

        test("pause tools live sliders, reset, overlays and single step", pause)
        page.get_by_role("button", name="Back", exact=True).first.click()
        page.get_by_role("button", name="Controls", exact=True).click()

        def rebind():
            b = page.get_by_role("button", name="Cannon, keyboard:", exact=False)
            b.click()
            key(page, "f")
            check(page.evaluate('__moon.game.input.map.fire.includes("KeyF")'))
            b = page.get_by_role("button", name="Cannon, keyboard:", exact=False)
            check("F" in b.inner_text())
            glyph = page.locator('button[aria-label^="Button symbols:"]')
            glyph.click()
            check(page.evaluate("__moon.game.settings.glyphs") != "playstation")
            for _ in range(5):
                if page.evaluate("__moon.game.settings.glyphs") == "xbox":
                    break
                glyph.click()
            check(page.evaluate('__moon.game.input.codeLabel("Pad0")') == "A")
            page.get_by_role("button", name="Back", exact=True).first.click()

        test(
            "native rebinding saves and controller glyph setting changes labels", rebind
        )

        def settings_persist():
            page.get_by_role("button", name="Settings", exact=True).click()
            page.get_by_role("slider", name="Music", exact=True).fill("0.2")
            page.get_by_role("slider", name="Radio voices", exact=True).fill("0.4")
            check(
                page.evaluate(
                    "__moon.game.audio.musicVolume===.2&&__moon.game.audio.voiceVolume===.4"
                )
            )
            page.reload()
            ready(page)
            check(
                page.evaluate(
                    "__moon.game.settings.music===.2&&__moon.game.settings.voice===.4"
                )
            )
            page.evaluate('__moon.game.settings.set("music",.1)')

        test(
            "settings and separate audio buses persist across reload", settings_persist
        )

        def about():
            page.get_by_role("button", name="About / Credits", exact=True).click()
            for label, key in [
                ("Source Information", "sourceInformation"),
                ("Testing Feedback", "testingFeedback"),
                ("Engine Feedback", "engineFeedback"),
                ("Prompt Feedback", "promptFeedback"),
            ]:
                page.get_by_role("button", name=label, exact=True).click()
                text = page.get_by_role("dialog").inner_text()
                check(label in text)
                pages = 1
                while page.get_by_role("button", name="Next page", exact=True).count():
                    page.get_by_role("button", name="Next page", exact=True).click()
                    pages += 1
                check(pages >= 2)
                page.get_by_role("button", name="Back to credits", exact=True).click()
            page.get_by_role("button", name="Back", exact=True).first.click()

        test("four complete About groups have navigable readable pages", about)

        def checkpoint_resume():
            page.evaluate('__moon.game.debug.start("operation",61421)')
            page.evaluate(
                '__moon.sim.s.ship.x=900;__moon.sim.s.sectorRescued=1;__moon.sim.s.didFire=true;__moon.sim.s.warpCount=1;__moon.sim.s.entities=[];__moon.sim.s.spawned=["first","drill"];__moon.sim.direct(0)'
            )
            # A narrow checkpoint fixture verifies persistence; the separate full pilot never sets objectives.
            page.evaluate(
                "__moon.sim.s.ship.x=1020;__moon.sim.s.ship.y=135;__moon.sim.direct(0)"
            )
            page.wait_for_timeout(120)
            check(snap(page)["sector"] == 1)
            page.reload()
            ready(page)
            check(
                page.get_by_role(
                    "button", name="Continue checkpoint", exact=True
                ).count()
                == 1
            )
            page.get_by_role("button", name="Continue checkpoint", exact=True).click()
            page.wait_for_timeout(100)
            check(snap(page)["sector"] == 1)
            check(snap(page)["ship"]["hull"] == 3)

        test(
            "explicit checkpoint resume reconstructs a clean sector", checkpoint_resume
        )

        def death_retry():
            page.evaluate(
                '__moon.game.debug.fixture("ship",{hull:1,grace:0});__moon.game.debug.fixture("damage")'
            )
            page.wait_for_function('__moon.sim.s.outcome === "failure"')
            page.wait_for_function('__moon.ui.screen === "results"')
            page.get_by_role("button", name="Retry checkpoint", exact=True).click()
            check(snap(page)["outcome"] is None)
            check(snap(page)["ship"]["hull"] == 3)

        test("hull failure reaches results and checkpoint retry", death_retry)

        def art():
            page.evaluate(
                '__moon.command("sector",2);__moon.sim.s.ship.x=2520;__moon.sim.direct(0);__moon.sim.formation("visual","curtain",2620,135,1);__moon.sim.formation("visual2","ring",2730,145);__moon.overlay=false'
            )
            page.wait_for_timeout(1300)
            shot(page, "minefield.png")
            page.evaluate(
                '__moon.command("sector",3);__moon.sim.s.ship.x=6960;__moon.sim.direct(0)'
            )
            page.wait_for_timeout(300)
            shot(page, "carrier.png")
            check(not quiet_errors(page))

        test("native original art draws busy minefield and carrier without errors", art)

        def audio():
            values = page.evaluate(
                """async()=>{const F=Moonriders,ctx=new OfflineAudioContext(1,44100*3,44100),bus=ctx.createGain();bus.gain.value=.7;bus.connect(ctx.destination);F.pluck(ctx,bus,.01,293.66,.3,.2);F.pluck(ctx,bus,.35,440,.3,.2);const synth=Object.create(__moon.game.audio);synth.ctx=ctx;synth._waves={};synth._noise=ctx.createBuffer(1,44100,44100);const rnd=F.rng(77),noise=synth._noise.getChannelData(0);for(let i=0;i<noise.length;i++)noise[i]=rnd.next()*2-1;['shot','warp','collapse','crystalHit','damage'].forEach((name,i)=>synth._voice(synth.presets['moon-'+name],bus,.1+i*.5,1,false));F.radioPhrase(ctx,bus,.7,'pilot');F.radioPhrase(ctx,bus,1.3,'navigator');F.radioPhrase(ctx,bus,1.9,'survivor');const out=await ctx.startRendering(),a=out.getChannelData(0);let peak=0,sum=0,finite=true;for(const x of a){finite=finite&&Number.isFinite(x);peak=Math.max(peak,Math.abs(x));sum+=x*x;}return{peak,rms:Math.sqrt(sum/a.length),finite};}"""
            )
            check(
                values["finite"] and 0.001 < values["rms"] < 0.4 and values["peak"] < 1,
                str(values),
            )
            evidence["audio"] = values
            page.mouse.click(900, 350)
            check(page.evaluate("__moon.game.audio.ctx !== null"))
            page.evaluate('__moon.game.settings.set("sound",false)')
            check(page.evaluate("__moon.game.audio._master.gain.value") == 0)
            page.evaluate('__moon.game.settings.set("sound",true)')
            key(page, "Escape")
            page.wait_for_timeout(100)
            check(page.evaluate("__moon.sound.voices.length") == 0)

        test(
            "offline music and three gibberish voices finite/non-silent/bounded; mute and pause clean up",
            audio,
        )
        test(
            "all Chromium page and engine errors remain empty",
            lambda: check(
                not page._err and not quiet_errors(page),
                str(page._err) + str(quiet_errors(page)),
            ),
        )
    finally:
        context.close()


def pads_test(browser):
    context, page = open_page(browser, viewport={"width": 1920, "height": 1080})
    try:
        page.add_init_script("__pads=[__pad(0),__pad(1)]")
        page.goto(FILE)
        ready(page)

        def menu_pad():
            pad_pick(page, "Settings")
            check(snap(page)["screen"] == "settings")
            pad(page, 0, 1)
            check(snap(page)["screen"] == "title")
            pad_pick(page, "About / Credits")
            check(snap(page)["screen"] == "about")
            pad_pick(page, "Testing Feedback")
            check(snap(page)["screen"] == "report")
            pad_pick(page, "Next page")
            pad_pick(page, "Back to credits")
            pad_pick(page, "Back")
            pad_pick(page, "Play operation")
            page.wait_for_timeout(100)
            check(snap(page)["scene"] == "play")
            check(snap(page)["screen"] is None)

        test(
            "standard pad alone navigates title/settings/About/report and launches operation",
            menu_pad,
        )

        def solo_pad():
            page.evaluate("__pads[0].axes=[1,0,0,-1]")
            page.wait_for_timeout(260)
            s = snap(page)
            check(s["ship"]["vx"] > 30)
            check(s["ship"]["aimY"] < -0.9)
            pad(page, 0, 6)
            check(snap(page)["ship"]["energy"] < 70)
            page.evaluate("__pads[0].axes=[0,0,0,0]")
            pad(page, 0, 9)
            page.wait_for_function('__moon.ui.screen === "pause"')
            pad_pick(page, "Flight manual")
            check(snap(page)["screen"] == "help")
            pad_pick(page, "Back")
            pad_pick(page, "Developer tools")
            check(snap(page)["screen"] == "dev")
            pad_pick(page, "Back")
            pad_pick(page, "Resume")
            check(snap(page)["screen"] is None)

        test(
            "solo pad steering, independent aim, L2 and pause hierarchy work", solo_pad
        )

        def joining():
            page.wait_for_timeout(900)
            before = snap(page)["tick"]
            pad(page, 1, 9)
            check(snap(page)["players"] == 2, "second pad did not join")
            check(snap(page)["tick"] >= before)
            page.evaluate("__pads[0].axes=[1,0,0,0];__pads[1].axes=[0,-1,0,1]")
            page.wait_for_timeout(160)
            s = snap(page)
            check(s["ship"]["vx"] > 0 and abs(s["ship"]["vy"]) < 5, str(s["ship"]))
            check(s["ship"]["aimY"] > 0.9 and s["ship"]["previewY"] < -0.9)
            page.wait_for_function(
                '__moon.sim.s.ship.energy >= 60 && __moon.sim.s.ship.drive === "ready"'
            )
            pad(page, 1, 6)
            page.wait_for_timeout(120)
            check(snap(page)["ship"]["burstY"] < -0.9, json.dumps(snap(page)["ship"]))
            page.evaluate("__pads[0].axes=[0,0,0,0];__pads[1].axes=[0,0,0,0]")
            page.wait_for_timeout(650)

        test(
            "two pads share one ship and navigator preview preserves pilot movement",
            joining,
        )

        def paired_glyphs():
            page.evaluate('__moon.game.settings.set("glyphs","xbox")')
            check(
                page.evaluate('__moon.game.players.every(q=>q.codeLabel("Pad0")==="A")')
            )
            page.evaluate('__moon.game.settings.set("glyphs","playstation")')

        test("controller glyph choices apply to both joined seats", paired_glyphs)

        def navigator_menu():
            pad(page, 1, 9)
            page.wait_for_function('__moon.ui.screen === "pause"')
            pad_pick(page, "Flight manual", index=1)
            check(snap(page)["screen"] == "help")
            pad_pick(page, "Back", index=1)
            pad_pick(page, "Resume", index=1)
            check(snap(page)["screen"] is None)

        test("navigator owns and navigates the console it opened", navigator_menu)

        def swapping():
            pad(page, 0, 9)
            page.wait_for_function('__moon.ui.screen === "pause"')
            pad_pick(page, "Swap pilot / navigator")
            check(page.evaluate("__moon.sim.swap"))
            pad_pick(page, "Resume")
            page.evaluate("__pads[1].axes=[-1,0,0,0]")
            page.wait_for_timeout(150)
            check(snap(page)["ship"]["vx"] < 0)
            page.evaluate("__pads[1].axes=[0,0,0,0]")

        test("deliberate couch role swap preserves the mission", swapping)

        def secondary_loss():
            tick = snap(page)["tick"]
            page.evaluate("__pads[1].connected=false")
            page.wait_for_timeout(160)
            check(snap(page)["players"] == 1)
            check(snap(page)["sector"] == 0)
            check(snap(page)["roles"]["shared"] is False)
            check(snap(page)["tick"] > tick)

        test(
            "navigator disconnect hands all controls to solo without rebuilding world",
            secondary_loss,
        )

        def keyboard_plus_pad():
            page.evaluate("__pads[1].connected=false")
            page.keyboard.press("Escape")
            page.wait_for_timeout(100)
            # Explicit UI entry makes one keyboard + one pad a real supported pairing.
            page.evaluate("__moon.ui.hide();__moon.game.resume();__moon.joinPad()")
            page.wait_for_timeout(100)
            check(snap(page)["players"] == 2)
            page.keyboard.down("d")
            page.evaluate("__pads[0].axes=[0,-1,1,0]")
            page.wait_for_timeout(180)
            s = snap(page)
            check(
                s["ship"]["vx"] > 30
                and abs(s["ship"]["vy"]) < 3
                and s["ship"]["previewY"] < -0.9,
                json.dumps(s["ship"]),
            )
            check(page.evaluate("__moon.game.players[1].pad") == 0)
            page.keyboard.up("d")
            page.evaluate("__pads[0].axes=[0,0,0,0]")

        test("keyboard/mouse plus one joined controller share roles", keyboard_plus_pad)

        def primary_loss():
            page.evaluate(
                '__moon.game.removePlayer(2);__moon.sim.swap=false;__moon.game.input.pad="any";__moon.game.input.padIndex=null;__pads[0].connected=true;__pads[1].connected=true;__pads[0].axes=[1,0,0,0]'
            )
            page.wait_for_timeout(160)
            page.evaluate("__pads[0].axes=[0,0,0,0]")
            pad(page, 1, 9)
            check(snap(page)["players"] == 2)
            page.evaluate("__pads[0].connected=false")
            page.wait_for_timeout(150)
            check(snap(page)["players"] == 1)
            check(snap(page)["roles"]["shared"] is False)
            check(not snap(page)["paused"])
            page.evaluate("__pads[1].axes=[1,0,0,-1]")
            pad(page, 1, 6)
            check(snap(page)["ship"]["aimY"] < -0.9)

        test(
            "pilot disconnect transfers aim and hyperspace to remaining pad",
            primary_loss,
        )
        test(
            "pad tests produce no browser or engine errors",
            lambda: check(not page._err and not quiet_errors(page), str(page._err)),
        )
    finally:
        context.close()


def attract_storage(browser):
    context, page = open_page(browser, viewport={"width": 1000, "height": 700})
    try:
        page.goto(FILE)
        ready(page)

        def clock():
            page.evaluate(
                "__moon.game.stop();__moon.cab.wake();__moon.game.advance(9.99,{draw:true})"
            )
            check(not snap(page)["attract"])
            page.evaluate("__moon.game.advance(.03,{draw:true})")
            check(snap(page)["attract"])
            before = page.evaluate("JSON.stringify(__moon.records)")
            page.mouse.move(100, 100)
            page.mouse.move(150, 120)
            page.wait_for_timeout(30)
            check(not snap(page)["attract"])
            check(snap(page)["screen"] == "title")
            check(page.evaluate("JSON.stringify(__moon.records)") == before)
            check(snap(page)["scene"] == "title")

        test(
            "browser attract exits on meaningful pointer motion without starting play",
            clock,
        )

        def exits():
            for family in ["keyboard", "touch", "gamepad"]:
                page.evaluate("__moon.startAttract()")
                check(snap(page)["attract"])
                if family == "keyboard":
                    page.keyboard.press("Enter")
                elif family == "touch":
                    page.dispatch_event(
                        "#screen",
                        "pointerdown",
                        {
                            "pointerType": "touch",
                            "pointerId": 1,
                            "clientX": 90,
                            "clientY": 300,
                        },
                    )
                else:
                    page.evaluate(
                        "__pads=[__pad(0)];__pads[0].buttons[0]={pressed:true,value:1};__moon.game.advance(.02,{draw:true});__pads[0].buttons[0]={pressed:false,value:0};__moon.game.advance(.02,{draw:true})"
                    )
                check(not snap(page)["attract"])
                check(snap(page)["screen"] == "title")
                check(snap(page)["scene"] == "title")

        test("keyboard/touch/pad wake activity is consumed instead of launching", exits)
    finally:
        context.close()
    context, page = open_page(browser, viewport={"width": 1000, "height": 700})
    try:
        page.add_init_script(
            "Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError')}})"
        )
        page.goto(FILE)
        ready(page)
        page.get_by_role("button", name="Play operation", exact=True).click()
        page.wait_for_timeout(100)
        test(
            "denied storage still allows a usable new operation",
            lambda: check(snap(page)["scene"] == "play" and not page._err),
        )
    finally:
        context.close()
    context, page = open_page(browser, viewport={"width": 1000, "height": 700})
    try:
        page.add_init_script(
            "localStorage.setItem('my3d2dge:moonriders-checkpoint','{bad');localStorage.setItem('my3d2dge:moonriders-records','null')"
        )
        page.goto(FILE)
        ready(page)
        test(
            "malformed persisted data falls back to usable defaults",
            lambda: check(
                snap(page)["checkpoint"] is None
                and snap(page)["records"]["operation"] == 0
            ),
        )
    finally:
        context.close()


def touch_tests(p, browser):
    for label, width, height in [
        ("phone-portrait", 390, 844),
        ("phone-landscape", 844, 390),
        ("tablet-portrait", 768, 1024),
        ("tablet-landscape", 1024, 768),
    ]:
        context, page = open_page(
            browser,
            viewport={"width": width, "height": height},
            device_scale_factor=1,
            is_mobile=True,
            has_touch=True,
        )
        try:
            page.goto(FILE)
            ready(page)
            page.get_by_role("button", name="Play operation", exact=True).tap()
            page.wait_for_timeout(120)
            cdp = context.new_cdp_session(page)

            def dispatch(kind, points, cdp=cdp):
                cdp.send(
                    "Input.dispatchTouchEvent", {"type": kind, "touchPoints": points}
                )

            def contact(x, y, i):
                return {"x": x, "y": y, "id": i, "radiusX": 5, "radiusY": 5, "force": 1}

            def multitouch(
                page=page,
                width=width,
                height=height,
                dispatch=dispatch,
                contact=contact,
            ):
                x = snap(page)["ship"]["x"]
                a = contact(width * 0.22, height * 0.72, 1)
                b = contact(width * 0.76, height * 0.72, 2)
                dispatch("touchStart", [a])
                a = contact(width * 0.22 + 52, height * 0.72, 1)
                dispatch("touchMove", [a])
                page.wait_for_timeout(250)
                check(snap(page)["ship"]["x"] > x + 8)
                dispatch("touchStart", [a, b])
                page.wait_for_timeout(70)
                dispatch("touchEnd", [b])
                page.wait_for_timeout(180)
                check(
                    snap(page)["ship"]["energy"] < 70,
                    "right tap failed to burst while steering",
                )
                dispatch("touchCancel", [])
                page.wait_for_timeout(150)
                check(page.evaluate("__moon.touch.contacts.size") == 0)
                check(
                    page.evaluate(
                        "__moon.touch.move[0]===0&&__moon.touch.move[1]===0&&!__moon.touch.warp"
                    )
                )
                page.wait_for_timeout(600)

            test(
                label + " multi-contact flight, right-tap burst and cancellation",
                multitouch,
            )

            def pop(
                page=page,
                width=width,
                height=height,
                dispatch=dispatch,
                contact=contact,
            ):
                page.wait_for_function(
                    '__moon.sim.s.ship.energy >= 60 && __moon.sim.s.ship.drive === "ready"'
                )
                a = contact(width * 0.72, height * 0.68, 3)
                dispatch("touchStart", [a])
                page.wait_for_timeout(120)
                check(page.locator(".burst-pop").is_visible())
                dispatch("touchCancel", [])
                page.wait_for_timeout(80)
                check(not page.locator(".burst-pop").is_visible())

            test(label + " contact-sensitive hyperspace affordance", pop)

            def menu(page=page, label=label):
                buttons = page.locator('[data-sys="corner"] button')
                check(buttons.count() > 0)
                page.evaluate("__moon.game.menu()")
                page.wait_for_timeout(100)
                check(snap(page)["screen"] == "pause")
                page.get_by_role("button", name="Flight manual", exact=True).tap()
                check(snap(page)["screen"] == "help")
                page.get_by_role("button", name="Back", exact=True).first.tap()
                page.get_by_role("button", name="Resume", exact=True).tap()
                page.wait_for_timeout(100)
                check(snap(page)["screen"] is None)
                shot(page, label + ".png")
                check(not page._err and not quiet_errors(page), str(page._err))

            test(label + " accessible console/help and readable layout evidence", menu)
        finally:
            context.close()


def harness_checks(browser):
    context, page = open_page(browser, viewport={"width": 1440, "height": 900})
    try:
        for label, query in [
            ("standard", "&players=2"),
            ("impaired", "&players=2&latency=150&jitter=50&loss=5"),
            ("host-leave", "&players=2&scenario=host-leave"),
            ("server", "&players=2&scenario=server"),
            ("solo", "&players=1"),
        ]:

            def run_case(label=label, query=query):
                page.goto(HARNESS + "&auto=1&play=2400&seed=61421" + query)
                page.wait_for_function(
                    'document.body.dataset.complete === "true"', timeout=60000
                )
                report = page.evaluate("window.__hubCheck")
                evidence["harness-" + label] = report
                check(
                    report["pass"],
                    json.dumps([c for c in report["checks"] if not c["pass"]])[:1600],
                )
                frames = [f for f in page.frames if f != page.main_frame]
                check(len(frames) >= 1)
                for f in frames:
                    if f.evaluate('typeof __moon !== "undefined"'):
                        check(f.evaluate("Moonriders.BUILD") == "moonriders-20261106")
                        check(f.evaluate("__moon.net.maxBytes") <= 16384)
                        check(f.evaluate("__moon.net.maxRate") <= 20)
                check(
                    not any(
                        "AIHub" in x and ("over " in x or "dropped" in x)
                        for x in page._warn
                    ),
                    str(page._warn),
                )
                page._warn.clear()

            test("official Hub harness " + label, run_case)
    finally:
        context.close()


def compatibility(p):
    for label, kind, kwargs in [
        (
            "webkit-phone",
            p.webkit,
            {
                "viewport": {"width": 390, "height": 844},
                "is_mobile": True,
                "has_touch": True,
            },
        ),
        ("firefox-desktop", p.firefox, {"viewport": {"width": 1280, "height": 720}}),
    ]:

        def run_case(kind=kind, kwargs=kwargs, label=label):
            b = kind.launch(headless=True)
            context, page = open_page(b, **kwargs)
            try:
                page.goto(FILE)
                ready(page)
                page.get_by_role("button", name="Play operation", exact=True).click()
                page.wait_for_timeout(150)
                check(snap(page)["scene"] == "play")
                check(not page._err and not quiet_errors(page), str(page._err))
                shot(page, label + ".png")
            finally:
                context.close()
                b.close()

        test(label + " final package boots and enters flight", run_case)


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            for suite, args in [
                (basic, (p, browser)),
                (pads_test, (browser,)),
                (attract_storage, (browser,)),
                (touch_tests, (p, browser)),
                (harness_checks, (browser,)),
            ]:
                try:
                    suite(*args)
                except Exception as e:  # noqa: BLE001 - test runner records all check failures
                    failures.append(suite.__name__ + " setup/flow: " + str(e)[:1800])
        finally:
            browser.close()
        compatibility(p)
finally:
    server.shutdown()
    server.server_close()
(D / "artifacts/browser-results.json").write_text(
    json.dumps({"count": count, "failures": failures, "evidence": evidence}, indent=2)
)
print(json.dumps({"count": count, "failures": failures}))
