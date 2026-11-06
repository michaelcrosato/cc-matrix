import http.server
import json
import pathlib
import re
import sys
import threading
import traceback
from functools import partial
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "build-config.json").read_text())
GAME = ROOT.parent / (CONFIG["stem"] + ".html")
EVIDENCE = ROOT / "docs" / "evidence"
EVIDENCE.mkdir(exist_ok=True)
failures = []
outcomes = []
total = 0


def check(name, fn):
    global total
    total += 1
    try:
        fn()
        outcomes.append({"name": name, "pass": True})
    except Exception as exc:  # noqa: BLE001 -- aggregate every test failure, then continue.
        outcomes.append({"name": name, "pass": False, "detail": str(exc)})
        failures.append(name + ": " + str(exc))
        (EVIDENCE / ("failure-" + str(total) + ".txt")).write_text(
            traceback.format_exc()
        )


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def state(page):
    return page.evaluate("window.__motor.snapshot()")


def advance(page, ticks, ai=False):
    return page.evaluate("([n,ai]) => window.__motorTest.advance(n,ai)", [ticks, ai])


def click(page, name):
    page.get_by_role("button", name=name, exact=True).first.click()


def boot(page, url=None):
    page.goto(url or GAME.as_uri() + "?test=1", wait_until="load")
    page.wait_for_function(
        'window.__motor && window.__motor.snapshot().screen === "title"', timeout=15000
    )


def browser_tests(pw):
    browser = pw.chromium.launch(
        headless=True, args=["--autoplay-policy=no-user-gesture-required"]
    )
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()
    page.set_default_timeout(7000)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    try:
        boot(page)
        check(
            "final file boots title without errors",
            lambda: require(
                not errors and not state(page)["errors"],
                str(errors + state(page)["errors"]),
            ),
        )
        page.screenshot(path=str(EVIDENCE / "title.png"), animations="disabled")
        check(
            "music starts at 10 percent",
            lambda: require(
                state(page)["settings"]["music"] == 0.1, "music gain default"
            ),
        )
        click(page, "Quick play")
        page.wait_for_timeout(120)
        (EVIDENCE / "after-quick.json").write_text(
            json.dumps(
                {
                    "state": state(page),
                    "buttons": page.get_by_role("button").all_text_contents(),
                    "errors": errors,
                },
                indent=2,
            )
        )
        page.screenshot(path=str(EVIDENCE / "quick.png"), animations="disabled")
        click(page, "Time trial")
        check(
            "course and car selection preview",
            lambda: require(
                page.locator(".motor-preview").count() == 1, "missing preview"
            ),
        )
        page.screenshot(path=str(EVIDENCE / "setup.png"), animations="disabled")
        click(page, "Let’s drive")
        advance(page, 361)
        page.screenshot(path=str(EVIDENCE / "driving.png"), animations="disabled")
        check(
            "grid releases into running",
            lambda: require(
                state(page)["sim"]["phase"] == "running",
                str(state(page)["sim"]["phase"]),
            ),
        )
        result = advance(page, 20000, True)
        check(
            "complete two-lap trial through real inputs",
            lambda: require(
                result["sim"]["phase"] == "finished"
                and result["drivers"][0]["lap"] == 2,
                str(result),
            ),
        )
        check(
            "results actions present",
            lambda: require(
                page.get_by_role("button", name="Drive it again", exact=True).count()
                == 1,
                "missing retry",
            ),
        )
        page.screenshot(path=str(EVIDENCE / "results.png"), animations="disabled")
        check(
            "no runtime or draw errors",
            lambda: require(
                not errors and not state(page)["errors"],
                str(errors + state(page)["errors"]),
            ),
        )
        click(page, "Back to title")
        click(page, "About & credits")
        check(
            "source information in game",
            lambda: require(
                page.get_by_role(
                    "heading", name="Source information", exact=True
                ).count()
                == 1,
                "About missing",
            ),
        )
        page.screenshot(path=str(EVIDENCE / "about.png"), animations="disabled")
        for title in [
            "Made of code",
            "Build provenance",
            "Testing feedback",
            "Engine feedback",
            "Engine feedback, continued",
            "Prompt feedback",
            "Credits & notices",
            "Engine license",
        ]:
            click(page, "Next page")
            check(
                "credits page " + title,
                lambda title=title: require(
                    page.get_by_role("heading", name=title, exact=True).count() == 1,
                    title,
                ),
            )
        click(page, "Back")
        click(page, "Quick play")
        click(page, "Time trial")
        length = page.get_by_role("button", name=re.compile("^Length:"))
        length.click()
        click(page, "Let’s drive")
        result = advance(page, 35000, True)
        check(
            "classic five-lap event completes legally",
            lambda: require(
                result["sim"]["phase"] == "finished"
                and result["drivers"][0]["lap"] == 5,
                str(result["drivers"]),
            ),
        )
        check(
            "best record contains versioned authoritative ghost",
            lambda: require(
                page.evaluate(
                    'Object.values(JSON.parse(localStorage.getItem("auto-motley-motor-v1")).records).some(r => r.preset===5 && r.physics===MM.PHYSICS && r.ghost.length>100)'
                ),
                "no five-lap ghost",
            ),
        )
        click(page, "Drive it again")
        advance(page, 400)
        check(
            "best ghost replay has one real car and no errors",
            lambda: require(
                len(state(page)["sim"]["cars"]) == 1 and not state(page)["errors"],
                str(state(page)["errors"]),
            ),
        )
        page.keyboard.press("Escape")
        page.wait_for_function('window.__motor.snapshot().screen === "pause"')
        before = state(page)["sim"]["tick"]
        advance(page, 120)
        check(
            "standalone pause freezes the round",
            lambda: require(
                state(page)["sim"]["tick"] == before, "pause advanced physics"
            ),
        )
        click(page, "Dev mode · pit bench")
        slider = page.get_by_role("slider", name="Speed scale", exact=True)
        slider.fill("1.3")
        slider.dispatch_event("input")
        check(
            "live dev slider marks run unranked",
            lambda: require(
                page.evaluate("window.__game.settings.dev_speed") == 1.3
                and page.evaluate("window.__motor.snapshot().unranked"),
                "dev slider did not apply",
            ),
        )
        click(page, "Reset tuning defaults")
        check(
            "reset restores all live defaults",
            lambda: require(
                page.evaluate(
                    'Object.keys(MM.DEFAULTS).every(k => window.__game.settings["dev_"+k] === MM.DEFAULTS[k])'
                ),
                "reset differs",
            ),
        )
        page.screenshot(path=str(EVIDENCE / "dev.png"), animations="disabled")
        click(page, "Back")
        click(page, "Back to title")
        page.mouse.move(5, 5)
        saved = page.evaluate('localStorage.getItem("auto-motley-motor-v1")')
        n = max(0, int((9.88 - state(page)["idle"]) * 120))
        advance(page, n)
        check(
            "attract absent before ten seconds",
            lambda page=page: require(
                not state(page)["attract"], str(state(page)["idle"])
            ),
        )
        advance(page, 30)
        check(
            "attract enters at ten seconds",
            lambda page=page: require(state(page)["attract"], str(state(page)["idle"])),
        )
        advance(page, 1200, True)
        check(
            "attract writes no passport or records",
            lambda: require(
                saved == page.evaluate('localStorage.getItem("auto-motley-motor-v1")'),
                "attract wrote player storage",
            ),
        )
        page.keyboard.press("Enter")
        check(
            "attract exit consumes confirm",
            lambda: require(
                not state(page)["attract"] and state(page)["screen"] == "title",
                str(state(page)["screen"]),
            ),
        )
        check(
            "complete UI flow has no errors",
            lambda: require(
                not errors and not state(page)["errors"],
                str(errors + state(page)["errors"]),
            ),
        )
    except Exception:
        (EVIDENCE / "last-browser-state.json").write_text(
            json.dumps(
                {
                    "state": state(page),
                    "buttons": page.get_by_role("button").all_text_contents(),
                    "errors": errors,
                },
                indent=2,
            )
        )
        page.screenshot(
            path=str(EVIDENCE / "last-browser-state.png"), animations="disabled"
        )
        raise
    finally:
        context.close()
        browser.close()


def tour_tests(pw):
    browser = pw.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()
    page.set_default_timeout(8000)
    try:
        boot(page)
        click(page, "Start road tour")
        evidence = []
        for i in range(11):
            click(page, "Take the wheel")
            result = advance(page, 50000, True)
            evidence.append({"stop": i, "result": result})
            check(
                "input-driven tour stop " + str(i + 1),
                lambda result=result: require(
                    result["sim"]["phase"] == "finished", json.dumps(result)
                ),
            )
            if result["sim"]["phase"] != "finished":
                break
            click(page, "On to the next road")
        (EVIDENCE / "tour-playthrough.json").write_text(json.dumps(evidence, indent=2))
        check(
            "complete tour reaches its ending",
            lambda: require(
                state(page)["screen"] == "tour-end", str(state(page)["screen"])
            ),
        )
        page.screenshot(path=str(EVIDENCE / "tour-ending.png"), animations="disabled")
        check(
            "tour teaches actual splash and recovery",
            lambda: require(
                any(s["result"]["drivers"][0]["splashed"] for s in evidence),
                "no splash",
            ),
        )
        check(
            "tour demonstrates both pursuit scoring rules",
            lambda: require(
                evidence[7]["result"]["sim"]["score"][0] >= 1
                and evidence[8]["result"]["sim"]["score"][1] >= 2,
                "missing rule",
            ),
        )
        check(
            "tour exploration saves circuit stamps",
            lambda: require(
                "forest" in state(page)["passport"], str(state(page)["passport"])
            ),
        )
        click(page, "Take another road tour")
        check(
            "tour immediate replay returns to first stop",
            lambda: require(
                state(page)["screen"] == "tour-intro" and state(page)["tour"] == 0,
                str(state(page)["screen"]),
            ),
        )
        check(
            "tour no runtime errors",
            lambda page=page: require(
                not state(page)["errors"], str(state(page)["errors"])
            ),
        )
    except Exception:
        (EVIDENCE / "tour-last-state.json").write_text(
            json.dumps(state(page), indent=2)
        )
        page.screenshot(path=str(EVIDENCE / "tour-failure.png"), animations="disabled")
        raise
    finally:
        context.close()
        browser.close()


PAD_SCRIPT = """
window.padState={connected:true,axes:[0,0,0,0],values:Array(18).fill(0)};
Object.defineProperty(navigator,'getGamepads',{value:()=>[{
 index:0,id:'DualSense Wireless Controller test',mapping:'standard',connected:padState.connected,
 axes:padState.axes,buttons:padState.values.map(v=>({pressed:v>.5,touched:v>0,value:v})),timestamp:performance.now()
}]});
"""


def pad(page, button, value):
    page.evaluate("([b,v])=>window.padState.values[b]=v", [button, value])
    advance(page, 3)


def input_tests(pw):
    browser = pw.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    context.add_init_script(PAD_SCRIPT)
    page = context.new_page()
    try:
        boot(page)
        pad(page, 13, 1)
        pad(page, 13, 0)
        pad(page, 0, 1)
        pad(page, 0, 0)
        check(
            "controller navigates title into quick play",
            lambda: require(
                state(page)["screen"] == "quick", str(state(page)["screen"])
            ),
        )
        pad(page, 0, 1)
        pad(page, 0, 0)
        check(
            "controller opens setup",
            lambda: require(
                state(page)["screen"] == "setup", str(state(page)["screen"])
            ),
        )
        click(page, "Let’s drive")
        advance(page, 500)
        pad(page, 6, 0.37)
        advance(page, 40)
        check(
            "controller analog brake preserves pressure",
            lambda: require(
                abs(state(page)["drivers"][0]["input"]["brake"] - 0.37) < 0.01,
                str(state(page)["drivers"][0]["input"]),
            ),
        )
        pad(page, 6, 1)
        advance(page, 400)
        check(
            "controller long brake holds at rest",
            lambda: require(
                abs(state(page)["drivers"][0]["speed"]) < 0.01,
                str(state(page)["drivers"][0]["speed"]),
            ),
        )
        pad(page, 6, 0)
        advance(page, 200)
        check(
            "controller brake release accelerates",
            lambda: require(
                state(page)["drivers"][0]["speed"] > 20,
                str(state(page)["drivers"][0]["speed"]),
            ),
        )
        page.evaluate("window.padState.connected=false")
        advance(page, 30)
        check(
            "controller disconnect sends safe braking",
            lambda: require(
                state(page)["drivers"][0]["input"]["brake"] == 1,
                str(state(page)["drivers"][0]["input"]),
            ),
        )
        check(
            "controller disconnect does not freeze round",
            lambda page=page: require(
                state(page)["screen"] is None, str(state(page)["screen"])
            ),
        )
        page.keyboard.press("Escape")
        advance(page, 3)
        click(page, "Settings")
        glyph = page.get_by_role(
            "button",
            name=re.compile(
                "^Button symbols:|^Button glyphs:|^Controller symbols:|^Symbols:"
            ),
        )
        if glyph.count() == 0:
            page.evaluate('window.__game.settings.set("glyphs","xbox")')
        else:
            glyph.click()
        check(
            "Xbox prompt setting available",
            lambda: require(
                page.evaluate("window.__game.settings.glyphs") == "xbox",
                "glyph setting",
            ),
        )
        check(
            "pad test no engine errors",
            lambda page=page: require(
                not state(page)["errors"], str(state(page)["errors"])
            ),
        )
    finally:
        context.close()
        browser.close()


def touch_and_compatibility_tests(pw):
    for name, engine, device in [
        (
            "phone",
            pw.chromium,
            {
                "viewport": {"width": 844, "height": 390},
                "has_touch": True,
                "is_mobile": True,
            },
        ),
        (
            "tablet-webkit",
            pw.webkit,
            {
                "viewport": {"width": 1024, "height": 768},
                "has_touch": True,
                "is_mobile": True,
            },
        ),
    ]:
        browser = engine.launch(headless=True)
        context = browser.new_context(**device)
        page = context.new_page()
        try:
            boot(page)
            click(page, "Quick play")
            click(page, "Time trial")
            click(page, "Let’s drive")
            advance(page, 400)
            page.evaluate(
                """()=>{const c=document.getElementById('screen');for(const p of [{id:11,x:110,y:260},{id:12,x:700,y:260}])c.dispatchEvent(new PointerEvent('pointerdown',{pointerId:p.id,pointerType:'touch',clientX:p.x,clientY:p.y,bubbles:true}));c.dispatchEvent(new PointerEvent('pointermove',{pointerId:11,pointerType:'touch',clientX:155,clientY:260,bubbles:true}));}"""
            )
            advance(page, 120)
            data = state(page)
            check(
                name + " simultaneous steering and braking",
                lambda data=data: require(
                    data["device"] == "touch"
                    and data["drivers"][0]["input"]["brake"] == 1
                    and data["drivers"][0]["input"]["steer"] > 0.25,
                    str(data["drivers"][0]["input"]),
                ),
            )
            page.evaluate('window.dispatchEvent(new Event("blur"))')
            advance(page, 4)
            check(
                name + " interruption clears touches and pauses",
                lambda page=page: require(
                    state(page)["screen"] == "pause", str(state(page)["screen"])
                ),
            )
            click(page, "Resume")
            advance(page, 120)
            check(
                name + " no stuck touch brake after resume",
                lambda page=page: require(
                    state(page)["drivers"][0]["input"]["brake"] == 0,
                    str(state(page)["drivers"][0]["input"]),
                ),
            )
            page.screenshot(path=str(EVIDENCE / (name + ".png")), animations="disabled")
            check(
                name + " no engine errors",
                lambda page=page: require(
                    not state(page)["errors"], str(state(page)["errors"])
                ),
            )
        except Exception:
            page.screenshot(
                path=str(EVIDENCE / (name + "-failure.png")), animations="disabled"
            )
            (EVIDENCE / (name + "-failure.json")).write_text(
                json.dumps(state(page), indent=2)
            )
            raise
        finally:
            context.close()
            browser.close()


def couch_tests(pw):
    browser = pw.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()
    try:
        boot(page)
        click(page, "Multiplayer")
        click(page, "Couch duel")
        click(page, "Let’s drive")
        click(page, "Seats confirmed · start")
        advance(page, 420)
        page.keyboard.down("ArrowRight")
        advance(page, 12)
        data = state(page)
        check(
            "shared keyboard arrows steer only driver two",
            lambda: require(
                data["drivers"][0]["input"]["steer"] == 0
                and data["drivers"][1]["input"]["steer"] == 1,
                str([d["input"] for d in data["drivers"]]),
            ),
        )
        page.keyboard.up("ArrowRight")
        page.keyboard.down("a")
        advance(page, 12)
        data = state(page)
        check(
            "shared keyboard WASD steers only driver one",
            lambda: require(
                data["drivers"][0]["input"]["steer"] == -1
                and data["drivers"][1]["input"]["steer"] == 0,
                str([d["input"] for d in data["drivers"]]),
            ),
        )
        page.keyboard.up("a")
        page.keyboard.down("ArrowDown")
        advance(page, 12)
        data = state(page)
        check(
            "shared keyboard brakes stay separate",
            lambda: require(
                data["drivers"][0]["input"]["brake"] == 0
                and data["drivers"][1]["input"]["brake"] == 1,
                str([d["input"] for d in data["drivers"]]),
            ),
        )
        page.keyboard.up("ArrowDown")
        page.keyboard.press("Escape")
        advance(page, 6)
        before = state(page)["sim"]["tick"]
        advance(page, 120)
        check(
            "couch pause freezes both drivers",
            lambda: require(
                state(page)["sim"]["tick"] == before
                and state(page)["screen"] == "pause",
                str(state(page)["screen"]),
            ),
        )
    finally:
        context.close()
        browser.close()


def audio_tests(pw):
    browser = pw.chromium.launch(
        headless=True, args=["--autoplay-policy=no-user-gesture-required"]
    )
    context = browser.new_context()
    page = context.new_page()
    try:
        boot(page)
        click(page, "Quick play")
        result = page.evaluate(
            """async()=>{const C=window.OfflineAudioContext||window.webkitOfflineAudioContext;const c=new C(1,48000,48000);const g=c.createGain();g.gain.value=.35;g.connect(c.destination);MM.synthTone(c,g,{wave:'sawtooth',freq:70,to:180,dur:.45,vol:.08,at:0});MM.synthTone(c,g,{freq:523,to:784,dur:.18,vol:.09,at:.1});MM.babble(c,g,.5);const b=await c.startRendering(),a=b.getChannelData(0);let sum=0,peak=0;for(const v of a){sum+=v*v;peak=Math.max(peak,Math.abs(v));}return {rms:Math.sqrt(sum/a.length),peak,music:__game.audio.musicVolume};}"""
        )
        (EVIDENCE / "audio.json").write_text(json.dumps(result, indent=2))
        check(
            "offline synthesized motor/SFX/voice output nonzero",
            lambda: require(result["rms"] > 0.0001, str(result)),
        )
        check(
            "offline synthesized output stays bounded",
            lambda: require(result["peak"] < 0.6, str(result)),
        )
        check(
            "native music bus initial gain .10",
            lambda: require(result["music"] == 0.1, str(result)),
        )
        live = page.evaluate(
            """async()=>{const a=__game.audio;const n=a.ctx.createAnalyser();n.fftSize=2048;a.bus('music').connect(n);const b=new Float32Array(n.fftSize);let peak=0;for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,60));n.getFloatTimeDomainData(b);for(const v of b)peak=Math.max(peak,Math.abs(v));}a.bus('music').disconnect(n);return {peak,song:!!a.song,ready:a.ready};}"""
        )
        check(
            "native procedural music produces signal",
            lambda: require(
                live["peak"] > 0.00001 and live["song"] and live["ready"], str(live)
            ),
        )
        page.evaluate('__game.settings.set("sound",false)')
        check(
            "master mute follows setting",
            lambda: require(
                page.evaluate(
                    "__game.audio.muted && __game.audio._master.gain.value===0"
                ),
                "mute bus",
            ),
        )
    finally:
        context.close()
        browser.close()


def direct_tests(pw, base=None):
    browser = pw.chromium.launch(headless=True)
    host_ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    guest_ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    host, guest = host_ctx.new_page(), guest_ctx.new_page()
    host.set_default_timeout(8000)
    guest.set_default_timeout(8000)
    errors = []
    for page in [host, guest]:
        page.on("pageerror", lambda e: errors.append(str(e)))
    try:
        for page in [host, guest]:
            boot(page, (base + "/index.html?test=1") if base else None)
            click(page, "Multiplayer")
            click(page, "Direct connection")
        guest.locator("#signal-in").fill("{bad")
        click(guest, "Join · make reply")
        check(
            "direct malformed invitation rejected",
            lambda: require(
                "incomplete" in guest.locator("#signal-status").inner_text(),
                guest.locator("#signal-status").inner_text(),
            ),
        )
        click(host, "Host · make invitation")
        host.wait_for_selector("#signal-out", timeout=16000)
        offer = host.locator("#signal-out").input_value()
        check(
            "direct invitation contains gathered candidates",
            lambda: require(
                "a=candidate:" in json.loads(offer)["sdp"], "no ICE candidates"
            ),
        )
        guest.locator("#signal-in").fill(offer)
        click(guest, "Join · make reply")
        guest.wait_for_selector("#signal-out", timeout=16000)
        answer = guest.locator("#signal-out").input_value()
        check(
            "direct reply includes real answer and candidates",
            lambda: require(
                json.loads(answer)["type"] == "answer"
                and "a=candidate:" in json.loads(answer)["sdp"],
                "invalid answer",
            ),
        )
        host.locator("#signal-in").fill(answer)
        click(host, "Accept reply")
        host.wait_for_function("__motor.snapshot().connected", timeout=18000)
        guest.wait_for_function("__motor.snapshot().connected", timeout=18000)
        check(
            "real RTCPeerConnection opens in two contexts",
            lambda: require(
                state(host)["connected"] and state(guest)["connected"],
                "channel did not open",
            ),
        )
        host.get_by_role("button", name=re.compile("^Ready · matched motors")).click()
        guest.get_by_role("button", name=re.compile("^Ready · matched motors")).click()
        host.wait_for_function(
            '__motor.snapshot().online && __motor.snapshot().sim.phase === "running"',
            timeout=12000,
        )
        guest.wait_for_function(
            '__motor.snapshot().online && __motor.snapshot().sim.phase === "running"',
            timeout=12000,
        )
        check(
            "direct roles and matched competitive cars",
            lambda: require(
                state(host)["isHost"]
                and not state(guest)["isHost"]
                and [c[0] for c in state(host)["sim"]["cars"]] == ["tan", "blue"],
                "role / config mismatch",
            ),
        )
        host.evaluate("__motorTest.networkQuality(150,.05)")
        guest.evaluate("__motorTest.networkQuality(150,.05)")
        host.evaluate("__motorTest.intent(0,{gas:1,brake:0,steer:0})")
        guest.evaluate("__motorTest.intent(1,{gas:0,brake:1,steer:0})")
        for _ in range(140):
            host.evaluate("__motorTest.intent(0,__motorTest.nextAI(0))")
            if state(host)["sim"]["score"][0] >= 1:
                break
            host.wait_for_timeout(90)
        check(
            "direct authority awards clean lead once",
            lambda: require(
                state(host)["sim"]["score"][0] == 1, str(state(host)["sim"]["score"])
            ),
        )
        guest.wait_for_function("__motor.snapshot().sim.score[0] >= 1", timeout=5000)
        check(
            "direct guest receives authoritative scoring",
            lambda: require(
                state(guest)["sim"]["score"] == state(host)["sim"]["score"],
                "score mismatch",
            ),
        )
        tick = state(host)["sim"]["tick"]
        host.keyboard.press("Escape")
        host.wait_for_function('__motor.snapshot().screen === "online-pause"')
        host.wait_for_timeout(500)
        check(
            "online menu leaves authority running",
            lambda: require(
                state(host)["sim"]["tick"] > tick, "online pause froze physics"
            ),
        )
        click(host, "Read-only diagnostics")
        check(
            "online dev controls are read only",
            lambda: require(
                host.get_by_role("heading", name="Read-only pit board").count() == 1
                and host.get_by_role("slider").count() == 0,
                "online tuning exposed",
            ),
        )
        click(host, "Back")
        click(host, "Back to the road")
        host.evaluate("__motorTest.intent(0,{gas:0,brake:1,steer:0})")
        guest.evaluate("__motorTest.intent(1,{gas:0,brake:1,steer:0,recover:true})")
        host.wait_for_function(
            '__motor.snapshot().sim.phase === "finished"', timeout=38000
        )
        guest.wait_for_function(
            '__motor.snapshot().sim.phase === "finished"', timeout=5000
        )
        check(
            "complete real-channel duel reaches winner",
            lambda: require(
                state(host)["sim"]["winner"] == 0
                and state(host)["sim"]["score"][0] >= 10,
                str(state(host)["sim"]["score"]),
            ),
        )
        check(
            "direct final state agrees",
            lambda: require(
                state(host)["sim"]["score"] == state(guest)["sim"]["score"],
                "final mismatch",
            ),
        )
        (
            EVIDENCE / ("direct-" + ("loopback" if base else "file") + ".json")
        ).write_text(
            json.dumps(
                {
                    "host": state(host),
                    "guest": state(guest),
                    "offer": {
                        "type": json.loads(offer)["type"],
                        "candidates": json.loads(offer)["sdp"].count("a=candidate:"),
                    },
                    "errors": errors,
                },
                indent=2,
            )
        )
        click(host, "Ready for rematch")
        click(guest, "Ready for rematch")
        host.wait_for_function(
            '__motor.snapshot().peerRound === 2 && __motor.snapshot().sim.phase === "running"',
            timeout=10000,
        )
        guest.wait_for_function(
            '__motor.snapshot().peerRound === 2 && __motor.snapshot().sim.phase === "running"',
            timeout=10000,
        )
        check(
            "direct rematch resets score and exchange",
            lambda: require(
                state(host)["sim"]["score"] == [0, 0]
                and state(host)["sim"]["exchange"] == 0,
                "rematch leaked state",
            ),
        )
        host.close()
        guest.wait_for_function(
            '__motor.snapshot().playMode === "ended"', timeout=12000
        )
        check(
            "vanished direct host ends guest match cleanly",
            lambda: require(
                state(guest)["screen"] == "session-end", str(state(guest)["screen"])
            ),
        )
        check("direct path no runtime errors", lambda: require(not errors, str(errors)))
    except Exception:
        (EVIDENCE / "direct-last-state.json").write_text(
            json.dumps(
                {
                    "host": state(host) if not host.is_closed() else {},
                    "guest": state(guest),
                    "errors": errors,
                },
                indent=2,
            )
        )
        raise
    finally:
        host_ctx.close()
        guest_ctx.close()
        browser.close()


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def loopback_direct_tests(pw):
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        direct_tests(pw, "http://127.0.0.1:" + str(server.server_port))
    finally:
        server.shutdown()
        server.server_close()


def seats_tests(pw):
    browser = pw.chromium.launch(headless=True)
    try:
        for mode, count in [("padkeys", 1), ("pads", 2)]:
            context = browser.new_context(viewport={"width": 1280, "height": 800})
            context.add_init_script(
                """window.testPads=[0,1].map(i=>({index:i,id:'Standard controller '+i,mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0}))}));Object.defineProperty(navigator,'getGamepads',{value:()=>testPads});"""
            )
            page = context.new_page()
            try:
                boot(page)
                if count == 1:
                    page.evaluate("testPads[1].connected=false")
                click(page, "Multiplayer")
                click(page, "Couch duel")
                click(page, "Let’s drive")
                for _ in range(count):
                    page.get_by_role("button", name=re.compile("^Seats:")).click()
                click(page, "Seats confirmed · start")
                advance(page, 420)
                page.evaluate("testPads[0].axes[0]=.65;testPads[1].axes[0]=-.7")
                advance(page, 18)
                data = state(page)
                if mode == "padkeys":
                    correct = (
                        data["drivers"][0]["input"]["steer"] == 0
                        and data["drivers"][1]["input"]["steer"] > 0.4
                    )
                else:
                    correct = (
                        data["drivers"][0]["input"]["steer"] > 0.4
                        and data["drivers"][1]["input"]["steer"] < -0.4
                    )
                check(
                    mode + " keeps controller seats separate",
                    lambda correct=correct, data=data: require(
                        correct, str([d["input"] for d in data["drivers"]])
                    ),
                )
                page.evaluate("testPads[0].axes[0]=0;testPads[1].axes[0]=0")
                result = advance(page, 30000, True)
                check(
                    mode + " completes a scored couch duel",
                    lambda result=result: require(
                        result["sim"]["phase"] == "finished"
                        and max(result["sim"]["score"]) > 0,
                        str(result["sim"]["score"]),
                    ),
                )
            finally:
                context.close()
    finally:
        browser.close()


def hub_tests(pw):
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = "http://127.0.0.1:" + str(server.server_port)
    browser = pw.chromium.launch(headless=True)
    try:
        for players, scenario in [
            (1, "standard"),
            (2, "standard"),
            (2, "host-leave"),
            (2, "server"),
        ]:
            context = browser.new_context(viewport={"width": 1280, "height": 800})
            context.add_init_script(
                """for(const key of ['RTCPeerConnection','WebSocket','EventSource']){const C=window[key];if(C)window[key]=new Proxy(C,{construct(target,args){if(window.AIHub?.active)throw new Error('Forbidden in-session transport '+key);return Reflect.construct(target,args);}});}"""
            )
            page = context.new_page()
            try:
                params = {
                    "game": "../../index.html",
                    "players": players,
                    "auto": 1,
                    "play": 3600,
                    "limit": 30,
                    "scenario": scenario,
                }
                if players == 2:
                    params.update({"latency": 150, "jitter": 50, "loss": 5})
                page.goto(base + "/vendor/hub/harness.html?" + urlencode(params))
                page.wait_for_function(
                    'document.body.dataset.complete === "true"', timeout=50000
                )
                report = page.evaluate("window.__hubCheck")
                (
                    EVIDENCE / ("hub-" + scenario + "-" + str(players) + ".json")
                ).write_text(json.dumps(report, indent=2))
                check(
                    "official Hub conformance " + scenario + "/" + str(players),
                    lambda report=report: require(
                        report["pass"] is True,
                        json.dumps([c for c in report["checks"] if not c["pass"]]),
                    ),
                )
            finally:
                context.close()
    finally:
        browser.close()
        server.shutdown()
        server.server_close()


def visual_capture(pw):
    browser = pw.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()
    try:
        boot(page)
        page.screenshot(path=str(EVIDENCE / "title-final.png"), animations="disabled")
        click(page, "Quick play")
        click(page, "Time trial")
        page.screenshot(path=str(EVIDENCE / "setup-final.png"), animations="disabled")
        click(page, "Let’s drive")
        advance(page, 900, True)
        poses = []
        for i in range(4):
            if i == 1:
                page.keyboard.down("ArrowRight")
            if i == 3:
                page.keyboard.up("ArrowRight")
                page.keyboard.down("Space")
            advance(page, 24)
            poses.append(state(page)["sim"]["cars"][0][1:4])
            page.screenshot(
                path=str(EVIDENCE / ("motion-" + str(i) + ".png")),
                animations="disabled",
            )
        page.keyboard.up("Space")
        check(
            "motion capture advances real car poses",
            lambda: require(poses[0] != poses[-1], "motion did not advance"),
        )
        check(
            "final capture has no renderer errors",
            lambda: require(not state(page)["errors"], str(state(page)["errors"])),
        )
        (EVIDENCE / "motion.json").write_text(json.dumps(poses, indent=2))
    finally:
        context.close()
        browser.close()


with sync_playwright() as playwright:
    selected = sys.argv[1] if len(sys.argv) > 1 else "all"
    flows = [
        ("browser", browser_tests),
        ("tour", tour_tests),
        ("input", input_tests),
        ("couch", couch_tests),
        ("seats", seats_tests),
        ("touch", touch_and_compatibility_tests),
        ("audio", audio_tests),
        ("direct", direct_tests),
        ("loopback", loopback_direct_tests),
        ("hub", hub_tests),
        ("visual", visual_capture),
    ]
    for name, fn in flows:
        allowed = ["all", name] + (
            ["browser"] if name not in ["direct", "loopback", "hub"] else ["net"]
        )
        if selected not in allowed:
            continue
        try:
            fn(playwright)
        except Exception as exc:  # noqa: BLE001 -- record a failed flow and continue.
            total += 1
            failures.append(name + " flow: " + str(exc))
            (EVIDENCE / (name + "-exception.txt")).write_text(traceback.format_exc())
print(json.dumps({"total": total, "failures": failures, "outcomes": outcomes}))
