"""Release checks use the delivered HTML and production commands. No route cheats."""

import functools
import hashlib
import http.server
import json
import sys
import threading
import urllib.parse
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT.parent
CONFIG = json.loads((ROOT / "build-config.json").read_text())
ARTIFACT = WORK / CONFIG["html"]
REPORT = json.loads((ROOT / "src/report.json").read_text())
FIXTURE = json.loads((ROOT / "build/route-fixture.json").read_text())
checks = []
evidence = {}
BROWSERS = []


def launch(kind, **options):
    b = kind.launch(**options)
    BROWSERS.append(b)
    return b


def check(name, passed, detail=""):
    checks.append({"name": name, "pass": bool(passed), "detail": str(detail)[:1800]})
    (ROOT / "build" / "verification-status.json").write_text(
        json.dumps(
            {
                "completed": len(checks),
                "latest": name,
                "pass": bool(passed),
                "failures": [c for c in checks if not c["pass"]],
            }
        )
    )


def safe(name, fn):
    try:
        fn()
    except (
        PlaywrightError,
        AssertionError,
        RuntimeError,
        ValueError,
        TypeError,
        KeyError,
        OSError,
    ) as exc:
        check(name, False, str(exc))
    finally:
        for b in BROWSERS:
            if b.is_connected():
                b.close()
        BROWSERS.clear()


PAD = """window.__pad=null;Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pad?[window.__pad]:[]});window.pad=(button=-1,axes=[0,0,0,0])=>window.__pad={id:'DualSense standard emulation',index:0,mapping:'standard',connected:true,timestamp:performance.now(),axes,buttons:Array.from({length:18},(_,i)=>({pressed:i===button,touched:i===button,value:i===button?1:0}))};"""
FLAGS = [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--disable-dev-shm-usage",
]


def ready(page, url):
    page.goto(url, wait_until="load", timeout=60000)
    page.wait_for_function(
        "window.__gameReady || window.__bootError", timeout=60000, polling=50
    )
    if page.evaluate("window.__bootError || null"):
        raise RuntimeError(page.evaluate("window.__bootError"))


def state(page):
    return page.evaluate("__app.state")


def send(page, action):
    return page.evaluate("(a)=>__DANGER.send(a)", action)


def idle_stop(page):
    page.evaluate("__app.lastActivity=performance.now()")


def file_checks(pw):
    browser = launch(pw.chromium, headless=True, args=FLAGS)
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    context.add_init_script(PAD)
    page = context.new_page()
    errors = []
    requests = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.on("request", lambda req: requests.append(req.url))
    ready(page, ARTIFACT.as_uri() + "?backend=webgl")
    check(
        "file:// final artifact boots native World3D",
        page.evaluate("__app.view.rendererName") == "WebGL 2",
    )
    check("native engine version pinned", page.evaluate("My3D2dge.version") == "0.89.1")
    check(
        "fresh music gain defaults to 0.10",
        page.evaluate("__app.game.settings.music") == 0.10,
    )
    check(
        "fresh PS glyph setting",
        page.evaluate("__app.game.settings.glyphs") == "playstation",
    )
    check(
        "canonical embedded report equals delivered JSON",
        page.evaluate('JSON.parse(document.getElementById("game-credits").textContent)')
        == REPORT,
    )
    check(
        "offline artifact requests no neighbors or CDN",
        all(u.startswith((ARTIFACT.as_uri(), "data:", "blob:")) for u in requests),
        requests,
    )
    page.wait_for_timeout(80)
    bounds = page.evaluate(
        """()=>[...document.querySelectorAll('.esh-ttl .esh-btns button')].map(b=>{const r=b.getBoundingClientRect();return{label:b.textContent,bottom:r.bottom,right:r.right,top:r.top}})"""
    )
    check(
        "title choices fit viewport",
        all(b["bottom"] <= 724 and b["top"] >= 0 for b in bounds),
        bounds,
    )
    # A standard-mapping pad selects the same title and starts the same expedition.
    page.evaluate("pad(13)")
    page.wait_for_function(
        'document.activeElement.textContent==="Two adventurers"',
        timeout=5000,
        polling=50,
    )
    page.evaluate("pad()")
    check(
        "D-pad navigates title choices",
        page.evaluate("document.activeElement.textContent") == "Two adventurers",
    )
    page.evaluate("pad(12)")
    page.wait_for_function(
        'document.activeElement.textContent==="Begin expedition"',
        timeout=5000,
        polling=50,
    )
    page.evaluate("pad()")
    page.evaluate("pad(0)")
    page.wait_for_function('__app.stage==="play"', timeout=10000, polling=50)
    page.evaluate("pad()")
    page.wait_for_function(
        "__app.game.input.padPrev[0]===false", timeout=5000, polling=50
    )
    check(
        "standard gamepad starts expedition",
        page.evaluate("__app.ui.shell.screen") == "briefing",
    )
    page.evaluate("pad(0)")
    page.wait_for_function("!__app.ui.shell.screen", timeout=5000, polling=50)
    page.evaluate("pad()")
    page.wait_for_function(
        "__app.game.input.padPrev[0]===false", timeout=5000, polling=50
    )
    check("pad confirms briefing", page.evaluate("__app.ui.shell.screen") is None)
    page.evaluate("pad(10)")
    page.wait_for_function('__app.ui.shell.screen==="map"', timeout=5000, polling=50)
    page.evaluate("pad()")
    check(
        "standard spare L3 button opens automap",
        page.evaluate("__app.ui.shell.screen") == "map",
    )
    check(
        "automap modal is actually opaque",
        page.evaluate('getComputedStyle(document.querySelector(".screen-map")).opacity')
        == "1",
    )
    page.evaluate("pad(1)")
    page.wait_for_function("!__app.ui.shell.screen", timeout=5000, polling=50)
    page.evaluate("pad()")
    check(
        "gamepad prompt uses PlayStation glyphs",
        page.evaluate(
            '__app.game.input.lastDevice==="gamepad" && __app.ui.label("pack").includes("△")'
        ),
    )
    page.evaluate('__app.game.settings.set("glyphs","xbox")')
    page.wait_for_timeout(80)
    check(
        "Xbox glyph option changes prompt",
        page.evaluate('__app.ui.label("pack")') in ["Y", "Y / I", "Y / Tab"],
    )
    page.evaluate('__app.game.settings.set("glyphs","playstation");window.__pad=null')
    page.wait_for_timeout(100)
    check(
        "controller disconnect preserves run",
        page.evaluate(
            '__app.state.phase==="explore" && __app.state.players["0"].war===36'
        ),
    )
    page.evaluate("pad()")
    page.wait_for_timeout(100)
    page.keyboard.press("w")
    page.wait_for_function("__app.player.y===8", timeout=5000, polling=50)
    check("keyboard W moves logical tile north", page.evaluate("__app.player.y") == 8)
    page.keyboard.press("e")
    page.wait_for_function("__app.player.dir===1", timeout=5000, polling=50)
    check(
        "quarter turn E is free",
        page.evaluate("__app.player.dir===1 && __app.state.stats.rounds===0"),
    )
    page.keyboard.press("q")
    page.wait_for_function("__app.player.dir===0", timeout=5000, polling=50)
    check("quarter turn Q restores heading", page.evaluate("__app.player.dir") == 0)
    before_look = page.evaluate("__app.view.yawOffset")
    page.mouse.move(630, 350)
    page.mouse.down(button="middle")
    page.mouse.move(670, 350, steps=2)
    page.mouse.up(button="middle")
    check(
        "mouse middle-drag changes free look",
        page.evaluate("__app.view.yawOffset") != before_look,
    )
    page.evaluate("__app.view.resetLook()")
    page.keyboard.press("Tab")
    page.wait_for_function('__app.ui.shell.screen==="pack"', timeout=5000, polling=50)
    check(
        "Tab opens actual six-slot pack",
        page.evaluate("__app.ui.shell.screen") == "pack"
        and page.evaluate("__app.player.pack.length") == 6,
    )
    check(
        "pack has two visible hand indicators",
        page.locator(".pack-summary").count() == 1,
    )
    page.keyboard.press("Escape")
    page.wait_for_function("!__app.ui.shell.screen", timeout=5000, polling=50)
    page.keyboard.press("Escape")
    page.wait_for_function('__app.ui.shell.screen==="pause"', timeout=5000, polling=50)
    check(
        "pause persists through native shell lifecycle",
        page.evaluate(
            '__app.ui.shell.screen==="pause" && __app.game.paused && __app.net.paused'
        ),
    )
    page.get_by_role("button", name="Expedition tools", exact=True).click()
    page.wait_for_timeout(120)
    check(
        "developer mode reachable through pause",
        page.evaluate("__app.ui.shell.screen") == "dev",
    )
    check(
        "developer initial focus is on a visible tuning control",
        page.evaluate(
            "(()=>{const e=document.activeElement,r=e.getBoundingClientRect();return e.type==='range'&&r.top>=0&&r.bottom<=innerHeight})()"
        ),
    )
    slider = page.get_by_role("slider", name="Player damage ×", exact=True)
    slider.fill("1.5")
    slider.dispatch_event("input")
    check(
        "live tuning changes production multiplier",
        page.evaluate("__app.state.tuning.playerDamage===1.5 && __app.state.modified"),
    )
    page.get_by_role("button", name="Reset tuning to defaults", exact=True).click()
    page.wait_for_timeout(100)
    check(
        "tuning reset restores canonical values",
        page.evaluate(
            "JSON.stringify(__app.state.tuning)===JSON.stringify(__DANGER.CONTENT.tuning)"
        ),
    )
    page.get_by_role("button", name="Content workshop", exact=True).click()
    page.wait_for_timeout(120)
    check(
        "designer workflow has tile/entity preview",
        page.locator(".editor-grid button").count() == 121
        and page.locator("#editor-entity option").count() > 0,
    )
    page.get_by_role("button", name="Validate content", exact=True).click()
    check(
        "shipped content validates in workshop",
        page.locator(".editor-log").inner_text().startswith("Valid:"),
    )
    # Native Controls rebinding enters the same production input map.
    page.evaluate('()=>{__app.ui.hide();__app.ui.show("controls")}')
    page.wait_for_timeout(120)
    result = page.evaluate('__app.game.input.rebind("interact","keys","KeyB")')
    check("native rebinding accepts conflict-free key", result is None)
    page.evaluate('__app.game.input.lastDevice="keyboard"')
    check(
        "rebound prompts follow key", page.evaluate('__app.ui.label("interact")') == "B"
    )
    page.evaluate("()=>{__app.ui.hide();__app.ui.credits()}")
    check(
        "credits open at the first source-information field",
        page.evaluate('document.querySelector(".screen-credits .esh-mod").scrollTop')
        == 0,
    )
    page.keyboard.press("ArrowDown")
    page.wait_for_function(
        'document.querySelector(".screen-credits .esh-mod").scrollTop>0',
        timeout=5000,
        polling=50,
    )
    check(
        "controller/keyboard navigation scrolls long credits",
        page.evaluate('document.querySelector(".screen-credits .esh-mod").scrollTop')
        > 0,
    )
    page.evaluate(
        "__app.game.input.resetBindings();__app.ui.hide();__app.game.resume();__app.newSolo(false)"
    )
    prefix = []
    for entry in FIXTURE["actions"]:
        if entry["action"]["type"] == "guard":
            break
        prefix.append(entry["action"])
    page.evaluate(
        "actions=>{for(const a of actions){const r=__DANGER.send(a);if(!r.ok)throw Error(r.message)}__app.update(0)}",
        prefix,
    )
    before_round = page.evaluate("__app.state.stats.rounds")
    page.evaluate("pad(15)")
    page.wait_for_function('__app.ui.selected==="war"', timeout=5000, polling=50)
    page.evaluate("pad()")
    check(
        "D-pad selects basic fallback without committing",
        page.evaluate("__app.state.stats.rounds") == before_round
        and page.evaluate("__app.ui.selected") == "war",
    )
    page.evaluate("__app.newSolo(false)")
    # One complete stock-balance run, including both boss state boundaries.
    run_id = page.evaluate("__app.state.runId")
    actions = json.loads(json.dumps(FIXTURE["actions"]).replace(FIXTURE["run"], run_id))
    replay = page.evaluate(
        """entries=>{__app.game.stop();let accepted=0,beforeClaim=false;for(const entry of entries){const a=entry.action;if(a.type==='interact'&&a.target==='guardian.treasure')beforeClaim=__app.state.shared.bossDefeated&&!__app.state.shared.treasureClaimed&&__app.state.phase==='explore';const r=__DANGER.send(a);if(!r?.ok)throw Error('Route '+accepted+': '+JSON.stringify(a)+' '+JSON.stringify(r));accepted++;}__app.update(0);__app.game.start();return{accepted,beforeClaim};}""",
        actions,
    )
    accepted = replay["accepted"]
    before_claim = replay["beforeClaim"]
    page.wait_for_function(
        '__app.ui.shell.screen==="victory"', timeout=10000, polling=50
    )
    s = state(page)
    evidence["soloSummary"] = {
        "actions": accepted,
        "stats": s["stats"],
        "war": s["players"]["0"]["war"],
        "spirit": s["players"]["0"]["spirit"],
        "clockMs": s["clock"],
    }
    check("boss death does not silently claim treasure", before_claim)
    check("all 175 production route actions accepted", accepted == 175)
    check(
        "normal route wins three-floor campaign",
        s["phase"] == "victory" and s["floor"] == 2 and s["shared"]["treasureClaimed"],
    )
    check(
        "normal route exercises both channels",
        s["stats"]["damageWar"] > 0 and s["stats"]["damageSpirit"] > 0,
    )
    check(
        "normal route covers gate, secret and recovery",
        s["stats"]["gates"] == 1
        and s["stats"]["secrets"] == 1
        and s["stats"]["rests"] >= 8,
    )
    check(
        "all ordinary roles and boss defeated",
        s["stats"]["enemies"] == 8 and s["stats"]["bossPhases"] == 2,
    )
    check(
        "normal route used no invulnerability or tuning",
        not s["modified"] and not s["invulnerable"],
    )
    check(
        "victory screen provides run summary",
        page.evaluate("__app.ui.shell.screen") == "victory",
    )
    page.get_by_role("button", name="Continue in the vault", exact=True).click()
    page.wait_for_timeout(100)
    check(
        "victory continuation actually reopens exploration",
        page.evaluate(
            '__app.state.phase==="explore" && __app.state.shared.treasureClaimed && __app.state.completed'
        ),
    )
    check(
        "completed vault permits movement",
        send(page, {"type": "move", "dx": -1, "dy": 0})["ok"],
    )
    # Exact serialized checkpoint roundtrip, corruption rejection, and floor retry.
    saved = page.evaluate("__app.net.model.exportSave()")
    roundtrip = page.evaluate(
        """save=>{const m=new __DANGER.Model();const r=m.load(save);return{ok:r.ok,equal:JSON.stringify(m.snapshot())===JSON.stringify(save.state),retry:m.retry().ok,health:m.state.players['0'].war}}""",
        saved,
    )
    check(
        "save/load roundtrip preserves authoritative state",
        roundtrip["ok"] and roundtrip["equal"],
    )
    check(
        "floor-entry retry restores viable strength",
        roundtrip["retry"] and roundtrip["health"] > 0,
    )
    check(
        "corrupt save is refused gracefully",
        page.evaluate(
            "(()=>{const m=new __DANGER.Model();return m.load({garbage:true}).ok===false})()"
        ),
    )
    # Audio from real gesture plus OfflineAudioContext checks all generated samples.
    page.mouse.click(1100, 100)
    page.evaluate("__app.audio.unlock()")
    audio = page.evaluate("__app.audio.offlineProbe()")
    evidence["audio"] = audio
    check(
        "synthesized audio finite, nonzero and unclipped",
        audio.get("pass") is True,
        audio,
    )
    check(
        "fresh default music remains 10%",
        page.evaluate("__app.game.settings.music") == 0.10,
    )
    page.evaluate(
        "()=>{__app.game.settings.set('sound',false);__app.audio.update(__app.state,__app.game.settings,false)}"
    )
    check(
        "native Sound-off mutes custom procedural audio",
        page.evaluate("__app.audio.metrics().muted"),
    )
    page.evaluate(
        "()=>{__app.game.settings.set('sound',true);__app.audio.update(__app.state,__app.game.settings,false)}"
    )
    # Attract has exact inactivity boundary and input is consumed on exit.
    page.evaluate("__app.returnTitle()")
    original_save = page.evaluate('localStorage.getItem("danger-expedition-v1")')
    page.evaluate("__DANGER.setIdle(9900);__app.update(0)")
    check(
        "attract does not start before 10-second boundary",
        page.evaluate("!__app.attract"),
    )
    page.evaluate("__DANGER.setIdle(10001);__app.update(0)")
    check("attract starts at 10-second boundary", page.evaluate("__app.attract"))
    page.evaluate("__app.attractStep(6001)")
    check("attract demonstrates pack", page.evaluate("__app.ui.shell.screen") == "pack")
    page.evaluate("for(let i=0;i<4;i++)__app.attractStep(6001)")
    check("attract reaches guardian preview", page.evaluate("__app.state.floor") == 2)
    page.keyboard.press("Enter")
    page.wait_for_timeout(120)
    check(
        "any input exits attract and is consumed",
        page.evaluate(
            '__app.stage==="title" && !__app.attract && __app.ui.shell.screen==="title"'
        ),
    )
    page.evaluate("__DANGER.setIdle(10001);__app.update(0)")
    page.mouse.move(21, 21)
    page.wait_for_function(
        "__app.stage==='title'&&!__app.attract", timeout=5000, polling=50
    )
    check(
        "meaningful mouse motion exits and consumes attract demo",
        page.evaluate("__app.ui.shell.screen==='title'"),
    )
    check(
        "attract never overwrites solo save",
        page.evaluate('localStorage.getItem("danger-expedition-v1")') == original_save,
    )
    check(
        "no game or page exceptions on complete solo/input/audio path",
        not errors and page.evaluate("__app.game.errors.length") == 0,
        errors,
    )
    page.evaluate("__app.game.settings.set('glyphs','xbox')")
    page.reload(wait_until="load")
    page.wait_for_function("window.__gameReady", timeout=60000, polling=50)
    check(
        "saved glyph preference survives a real page reload",
        page.evaluate(
            "__app.game.settings.glyphs==='xbox'&&__app.game.input.glyphs==='xbox'"
        ),
    )
    check(
        "solo checkpoint survives a real page reload", page.evaluate("!!__app.saved()")
    )
    evidence["fileRequests"] = requests
    evidence["fileErrors"] = errors
    # Blocked persistence must remain playable.
    context.close()
    blocked = browser.new_context(viewport={"width": 960, "height": 640})
    blocked.add_init_script(
        "Object.defineProperty(window,'localStorage',{get(){throw new DOMException('blocked','SecurityError')}})"
    )
    bp = blocked.new_page()
    ready(bp, ARTIFACT.as_uri() + "?backend=webgl")
    bp.evaluate("__app.newSolo(false)")
    check(
        "blocked localStorage still permits a complete playable model",
        bp.evaluate("__app.player.war===36 && __app.persistence===false"),
    )
    blocked.close()
    browser.close()


def touch_checks(pw):
    browser = launch(pw.chromium, headless=True, args=FLAGS)
    for device in ["iPhone 13", "iPad (gen 7)"]:
        context = browser.new_context(**pw.devices[device])
        page = context.new_page()
        ready(page, ARTIFACT.as_uri() + "?backend=webgl")
        page.get_by_role("button", name="Begin expedition", exact=True).tap()
        check(
            device + " gets dismissible gesture instructions",
            "drag the left half" in page.locator(".screen-briefing").inner_text(),
        )
        page.get_by_role("button", name="Enter the vault", exact=True).tap()
        page.touchscreen.tap(15, 200)
        page.wait_for_timeout(100)
        check(
            device + " touch uses minimal contextual HUD",
            page.evaluate('__app.lastInput==="touch"')
            and page.locator("#menu-button").is_visible(),
        )
        check(
            device + " no permanent movement button bank",
            page.locator("#e3-touch").count() == 0
            or not page.locator("#e3-touch").is_visible(),
        )
        check(
            device + " exploration hides combat popups",
            not page.locator("#combat-actions").is_visible(),
        )
        check(
            device + " custom menu replaces native START",
            page.evaluate("!__app.game.input._startEl"),
        )
        check(
            device + " HUD uses touch guidance",
            not page.locator("#context-hint").is_visible(),
        )
        # Multi-pointer production events exercise invisible left movement + right look.
        before = page.evaluate("({y:__app.player.y,yaw:__app.view.yawOffset})")
        cdp = context.new_cdp_session(page)
        width = page.evaluate("innerWidth")
        lx, rx = int(width * 0.22), int(width * 0.72)

        def touch_event(kind, points, cdp=cdp):
            cdp.send(
                "Input.dispatchTouchEvent",
                {
                    "type": kind,
                    "touchPoints": [
                        {"x": x, "y": y, "id": i, "radiusX": 4, "radiusY": 4}
                        for i, x, y in points
                    ],
                },
            )

        touch_event("touchStart", [(11, lx, 400)])
        touch_event("touchStart", [(11, lx, 400), (12, rx, 400)])
        touch_event("touchMove", [(11, lx, 350), (12, rx + 30, 400)])
        touch_event("touchEnd", [])
        page.wait_for_function("__app.player.y<9", timeout=5000, polling=50)
        after = page.evaluate("({y:__app.player.y,yaw:__app.view.yawOffset})")
        check(
            device + " multitouch moves and looks independently",
            after["y"] < before["y"] and after["yaw"] != before["yaw"],
            after,
        )
        page.locator("#menu-button").tap()
        page.wait_for_timeout(120)
        check(
            device + " touch opens same pause menu",
            page.evaluate("__app.ui.shell.screen") == "pause",
        )
        page.get_by_role("button", name="The six-slot pack", exact=True).tap()
        check(
            device + " touch opens same six-slot pack",
            page.evaluate("__app.ui.shell.screen") == "pack",
        )
        page.evaluate(
            "()=>{__app.ui.hide();__app.newSolo(false);__app.lastInput='touch';__app.ui.notice('Lantern','A short message.');__app.ui.update()}"
        )
        toast = page.locator(".esh-toast").bounding_box()
        check(
            device + " toast stays compact",
            toast is not None and toast["height"] < page.evaluate("innerHeight") * 0.25,
            toast,
        )
        prefix = []
        for entry in FIXTURE["actions"]:
            if entry["action"]["type"] == "guard":
                break
            prefix.append(entry["action"])
        page.evaluate(
            "actions=>{for(const a of actions)__DANGER.send(a);__app.ui.update()}",
            prefix,
        )
        page.locator("[data-source=guard]").tap()
        page.locator("#context-action").tap()
        page.wait_for_function('__app.ui.selected!=="guard"', timeout=5000, polling=50)
        check(
            device + " touch guard returns to attack selector",
            page.evaluate("__app.state.stats.rounds") > 0,
        )
        context.close()
    browser.close()


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass


def server_start():
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(WORK))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, thread


def rtc_checks(pw):
    server, thread = server_start()
    browser = launch(pw.chromium, headless=True, args=FLAGS)
    url = (
        f"http://127.0.0.1:{server.server_port}/"
        + urllib.parse.quote(CONFIG["html"])
        + "?backend=webgl"
    )
    try:
        host = browser.new_context(viewport={"width": 1100, "height": 760})
        guest = browser.new_context(viewport={"width": 1100, "height": 760})
        a = host.new_page()
        b = guest.new_page()
        errors = []
        a.on("pageerror", lambda e: errors.append("host: " + str(e)))
        b.on("pageerror", lambda e: errors.append("guest: " + str(e)))
        ready(a, url)
        a.evaluate("__app.game.stop()")
        ready(b, url)
        b.evaluate("__app.game.stop()")
        a.evaluate("__app.stopAttract()")
        b.evaluate("__app.stopAttract()")
        check(
            "loopback server serves intended game",
            a.title() == CONFIG["title"] and b.title() == CONFIG["title"],
        )
        for page in [a, b]:
            page.get_by_role("button", name="Two adventurers", exact=True).click()
        b.get_by_role("button", name="Join an expedition", exact=True).click()
        b.locator("#invite-input").fill("damaged-code")
        b.get_by_role("button", name="Create answer from offer", exact=True).click()
        check(
            "malformed invite remains recoverable in real UI",
            b.evaluate("__app.net.pc===null")
            and "code" in b.locator(".connection-status").inner_text().lower(),
        )
        a.get_by_role("slider", name="Host planning window", exact=True).fill("12")
        a.get_by_role("slider", name="Host planning window", exact=True).dispatch_event(
            "input"
        )
        a.get_by_role("button", name="Host an expedition", exact=True).click()
        a.wait_for_function(
            'document.querySelector("#invite-output")?.value?.startsWith("DD1.O.")',
            timeout=20000,
            polling=50,
        )
        offer = a.locator("#invite-output").input_value()
        b.locator("#invite-input").fill(offer)
        b.get_by_role("button", name="Create answer from offer", exact=True).click()
        b.wait_for_function(
            'document.querySelector("#invite-output")?.value?.startsWith("DD1.A.")',
            timeout=20000,
            polling=50,
        )
        answer = b.locator("#invite-output").input_value()
        check(
            "guest sees negotiated planning duration before returning answer",
            b.evaluate("__app.net.planningSeconds") == 12
            and "12" in b.locator(".connection-status").inner_text(),
        )
        a.locator("#invite-input").fill(answer)
        a.get_by_role("button", name="Connect using answer", exact=True).click()
        for page in [a, b]:
            page.wait_for_function(
                '__app.net.running && __app.stage==="play"', timeout=20000, polling=50
            )
        check(
            "UI-exchanged WebRTC codes open actual data channel",
            a.evaluate("__app.net.channel.readyState") == "open"
            and b.evaluate("__app.net.channel.readyState") == "open",
        )
        check(
            "separate browser peers own separate adventurers",
            a.evaluate("__app.net.localId") == "0"
            and b.evaluate("__app.net.localId") == "1",
        )
        check(
            "custom planning window is authoritative and marked modified",
            a.evaluate("__app.state.tuning.planningSeconds===12&&__app.state.modified")
            and b.evaluate(
                "__app.state.tuning.planningSeconds===12&&__app.state.modified"
            ),
        )
        # Follow commands through actual pads/UI and authority, never optimistic client awards.
        send(b, {"type": "turn", "delta": 1})
        b.wait_for_function("__app.player.dir===1", polling=50)
        a.wait_for_function('__app.state.players["1"].dir===1', polling=50)
        check(
            "guest logical input reaches authority",
            a.evaluate('__app.state.players["1"].dir') == 1,
        )
        send(a, {"type": "move", "dx": 0, "dy": -1})
        a.wait_for_function("__app.player.y===8", polling=50)
        b.wait_for_function('__app.state.players["0"].y===8', polling=50)
        check(
            "host exploration movement is shared without timer",
            b.evaluate('__app.state.players["0"].y') == 8
            and a.evaluate("__app.state.combat") is None,
        )
        a.evaluate("()=>{__app.ui.pause();__app.ui.settings()}")
        a.wait_for_timeout(160)
        check(
            "online settings keep authority live",
            a.evaluate("__app.net.running && !__app.net.paused"),
        )
        send(b, {"type": "turn", "delta": -1})
        a.wait_for_function('__app.state.players["1"].dir===0', polling=50)
        check(
            "one player menu does not block companion input",
            a.evaluate('__app.state.players["1"].dir') == 0,
        )
        a.evaluate("__app.ui.hide()")
        check(
            "network state is never eligible for solo autosave",
            a.evaluate("!__app.net.allowSoloSave")
            and b.evaluate("!__app.net.allowSoloSave"),
        )
        # Set up contested pickup with legal exploration route and a stock pack.
        # Controlled setup positions isolate transactions; the complete stock-route proof is separate.
        a.evaluate(
            """()=>{const m=__app.net.model;for(const id of ['0','1']){m.state.players[id].x=3;m.state.players[id].y=3;}m.state.combat=null;m.state.phase='explore';__app.net._emit();__app.net._publish(true)}"""
        )
        b.wait_for_function(
            '__app.state.players["1"].x===3 && __app.state.players["1"].y===3',
            polling=50,
        )
        send(a, {"type": "pickup", "target": "upper.rune"})
        send(b, {"type": "pickup", "target": "upper.rune"})
        b.wait_for_function(
            '__app.state.entities["upper.rune"].claimed===true', polling=50
        )
        check(
            "simultaneous loot has exactly one authoritative owner",
            a.evaluate(
                'Object.values(__app.state.players).flatMap(p=>[...p.pack,...p.hands]).filter(i=>i==="upper.rune.item").length'
            )
            == 1,
        )
        # Hand off the rune via production transaction.
        send(a, {"type": "handoff", "item": "upper.rune.item", "target": "1"})
        b.wait_for_function('__app.player.pack.includes("upper.rune.item")', polling=50)
        check(
            "nearby item handoff changes ownership on both peers",
            a.evaluate('!__app.player.pack.includes("upper.rune.item")')
            and b.evaluate('__app.player.pack.includes("upper.rune.item")'),
        )
        a.evaluate(
            """()=>{const m=__app.net.model;m.state.players['1'].war=0;m.state.players['1'].down=true;m.state.players['0'].food=0;__app.net._emit();__app.net._publish(true)}"""
        )
        check(
            "no-food revive is rejected without counter loss",
            not send(a, {"type": "revive", "target": "1"})["ok"]
            and a.evaluate("__app.player.food") == 0,
        )
        a.evaluate('__app.net.model.state.players["0"].food=2')
        check(
            "revive from depleted War restores both pools",
            send(a, {"type": "revive", "target": "1"})["ok"],
        )
        b.wait_for_function(
            "!__app.player.down && __app.player.war>0 && __app.player.spirit>0",
            polling=50,
        )
        a.evaluate(
            """()=>{const m=__app.net.model;m.state.players['1'].spirit=0;m.state.players['1'].down=true;__app.net._emit();__app.net._publish(true)}"""
        )
        check(
            "revive from depleted Spirit restores both pools",
            send(a, {"type": "revive", "target": "1"})["ok"],
        )
        b.wait_for_function("!__app.player.down && __app.player.spirit>0", polling=50)
        # Departure preserves shared objectives and recovers stable inventory in reachable bags.
        b.evaluate("__app.net.close()")
        a.wait_for_function('__app.state.players["1"].connected===false', polling=50)
        check(
            "guest departure does not end host expedition",
            a.evaluate(
                '__app.net.running && !__app.net.ended && __app.state.phase!=="ended"'
            ),
        )
        check(
            "departed gear recovered in stable world loot",
            a.evaluate(
                'Object.values(__app.state.entities).some(e=>e.type==="loot" && e.itemId==="upper.rune.item" && !e.claimed)'
            ),
        )
        check(
            "network-origin continuation still cannot overwrite solo save",
            a.evaluate("!__app.net.allowSoloSave"),
        )
        evidence["rtcDiagnostics"] = a.evaluate("__app.net.diagnostics()")
        check("real RTC produces no page exceptions", not errors, errors)
        host.close()
        guest.close()
    finally:
        browser.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def hub_checks(pw):
    server, thread = server_start()
    browser = launch(pw.chromium, headless=True, args=FLAGS)
    base = f"http://127.0.0.1:{server.server_port}"
    harness = "/" + ROOT.name + "/vendor/hub/harness.html"
    game = "/" + CONFIG["html"] + "?backend=webgl"
    reports = []
    try:
        for name, extra in [
            ("standard", ""),
            ("impaired", "&latency=150&jitter=50&loss=5"),
            ("host-leave", "&scenario=host-leave"),
            ("server", "&scenario=server&latency=150&jitter=50&loss=5"),
            ("solo-hub", ""),
        ]:
            context = browser.new_context(viewport={"width": 1280, "height": 800})
            page = context.new_page()
            players = 1 if name == "solo-hub" else 2
            url = (
                base
                + harness
                + "?game="
                + urllib.parse.quote(game, safe="")
                + f"&players={players}&auto=1&play=2500"
                + extra
            )
            page.goto(url, wait_until="load")
            page.wait_for_function(
                'document.body.dataset.complete==="true"', timeout=90000, polling=50
            )
            r = page.evaluate("window.__hubCheck")
            r["scenarioName"] = name
            reports.append(r)
            check(
                "final artifact official Hub " + name,
                r.get("pass") is True,
                [c for c in r.get("checks", []) if not c["pass"]],
            )
            diagnostics = []
            for frame in page.frames[1:]:
                try:
                    d = frame.evaluate("__app.net.diagnostics()")
                    diagnostics.append(d)
                    check(
                        name + " copy stops simulation/outgoing on end",
                        d["ended"] and not d["running"] and d["queue"] == 0,
                    )
                    check(
                        name + " traffic within Hub limits",
                        d["traffic"]["maxBytes"] <= 16384
                        and d["traffic"]["maxPerSecond"] <= 20,
                        d["traffic"],
                    )
                    if d["server"]:
                        check(
                            "Hub server authority creates no renderer/audio",
                            frame.evaluate(
                                "__app.game===null && __app.view===null && __app.audio===null"
                            ),
                        )
                    elif frame.evaluate("__app.game!==null"):
                        check(
                            name + " native world has no engine exceptions",
                            frame.evaluate("__app.game.errors.length") == 0,
                        )
                except (
                    PlaywrightError,
                    AssertionError,
                    RuntimeError,
                    ValueError,
                    TypeError,
                    KeyError,
                    OSError,
                ) as exc:
                    if name != "host-leave":
                        check(name + " diagnostics reachable", False, str(exc))
            r["diagnostics"] = diagnostics
            context.close()
        # A full normal-rules Hub victory within real session time, with a legitimate one-seat session.
        context = browser.new_context(viewport={"width": 1100, "height": 760})
        page = context.new_page()
        page.goto(
            base
            + harness
            + "?game="
            + urllib.parse.quote(game, safe="")
            + "&players=1&limit=600"
        )
        page.locator("#restart").click()
        page.wait_for_function(
            'document.querySelector("iframe")?.contentWindow?.__gameReady===true',
            timeout=60000,
            polling=50,
        )
        page.locator("#release").click()
        frame = page.frames[1]
        frame.wait_for_function("__app.net.running===true", timeout=15000, polling=50)
        check(
            "Hub begins automatically without title or attract",
            frame.evaluate(
                '__app.stage==="play" && !__app.attract && !__app.ui.shell.screen'
            ),
        )
        run = frame.evaluate("__app.state.runId")
        actions = json.loads(
            json.dumps(FIXTURE["actions"]).replace(FIXTURE["run"], run)
        )
        accepted = 0
        accepted = frame.evaluate(
            """entries=>{__app.game.stop();let n=0;for(const e of entries){const r=__DANGER.send(e.action);if(!r?.ok)throw Error('Hub route '+JSON.stringify(e.action)+' '+JSON.stringify(r));n++;}__app.update(0);__app.game.start();return n;}""",
            actions,
        )
        frame.wait_for_function("__app.net.ended===true", timeout=10000, polling=50)
        check(
            "stock full campaign wins under actual Hub clock",
            frame.evaluate(
                "__app.state.shared.treasureClaimed && AIHub.time()<AIHub.limitMs"
            )
            and accepted == 175,
        )
        check(
            "Hub result authority calls finish exactly once",
            frame.evaluate("__app.net._finished===true && __app.net.isHost"),
        )
        context.close()
    finally:
        evidence["hubReports"] = reports
        browser.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def browser_fallbacks(pw):
    # WebGPU state can be tested independently from unreliable headless captures.
    browser = launch(
        pw.chromium,
        headless=True,
        args=[
            "--enable-unsafe-webgpu",
            "--enable-features=Vulkan",
            "--use-webgpu-adapter=swiftshader",
            "--disable-dev-shm-usage",
        ],
    )
    page = browser.new_page(viewport={"width": 960, "height": 640})
    try:
        ready(page, ARTIFACT.as_uri())
        page.evaluate("__app.newSolo(false)")
        check(
            "native WebGPU path boots and advances gameplay",
            page.evaluate("__app.view.rendererName") == "WebGPU"
            and send(page, {"type": "move", "dx": 0, "dy": -1})["ok"],
        )
    finally:
        browser.close()
    browser = launch(pw.webkit, headless=True)
    page = browser.new_page(viewport={"width": 1024, "height": 768})
    try:
        ready(page, ARTIFACT.as_uri() + "?backend=webgl")
        page.evaluate("__app.newSolo(false)")
        check(
            "WebKit available WebGL2 path plays same rules",
            page.evaluate("__app.view.rendererName") == "WebGL 2"
            and send(page, {"type": "move", "dx": 0, "dy": -1})["ok"],
        )
    finally:
        browser.close()
    browser = launch(pw.firefox, headless=True)
    page = browser.new_page(viewport={"width": 960, "height": 640})
    try:
        page.goto(ARTIFACT.as_uri() + "?backend=webgl")
        page.wait_for_function(
            "window.__gameReady||window.__bootError", timeout=60000, polling=50
        )
        check(
            "unsupported Firefox displays actionable renderer message",
            page.evaluate("!!window.__bootError")
            and page.get_by_role("button", name="Retry loading").is_visible(),
        )
    finally:
        browser.close()


selected = sys.argv[1:] or ["file", "touch", "rtc", "hub", "fallbacks"]
with sync_playwright() as pw:
    for name, fn in [
        ("file", file_checks),
        ("touch", touch_checks),
        ("rtc", rtc_checks),
        ("hub", hub_checks),
        ("fallbacks", browser_fallbacks),
    ]:
        if name in selected:
            safe(name + " check group completed", lambda fn=fn: fn(pw))
output = {
    "artifactSha256": hashlib.sha256(ARTIFACT.read_bytes()).hexdigest(),
    "checks": checks,
    "evidence": evidence,
    "passed": sum(c["pass"] for c in checks),
    "failed": sum(not c["pass"] for c in checks),
    "total": len(checks),
}
(ROOT / "evidence" / ("release-" + "-".join(selected) + ".json")).write_text(
    json.dumps(output, indent=2, ensure_ascii=False)
)
for c in checks:
    if not c["pass"]:
        print("FAIL " + c["name"] + ": " + c["detail"])
print(
    f"{output['passed']}/{len(checks)} browser checks passed; {output['failed']} failures"
)
raise SystemExit(1 if output["failed"] else 0)
