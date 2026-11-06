"""One command: npm test. Prints failures and one count; artifacts stay here."""

from __future__ import annotations

import functools
import http.server
import json
import os
import sys
import threading
import time
import urllib.parse
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
STEM = json.loads((ROOT / "title-selection.json").read_text())["stem"]
GAME = ROOT.parent / (STEM + ".html")
ART = ROOT / "artifacts"
os.environ["TMPDIR"] = str(ART / "browser-tmp")
(ART / "browser-tmp").mkdir(exist_ok=True)
checks = []
failures = []
reports = {}


def check(name, condition, detail=""):
    checks.append(name)
    (ART / "test-progress.json").write_text(
        json.dumps({"last": name, "checks": checks, "failures": failures}, indent=2)
    )
    if not condition:
        failures.append({"test": name, "detail": str(detail)})
        print("FAIL " + name + (": " + str(detail) if detail else ""), flush=True)


def guarded(name, fn):
    try:
        fn()
    except Exception:  # noqa: BLE001 - test groups must report every failure
        import traceback

        check(name, False, traceback.format_exc())


def wait_ready(page):
    page.wait_for_function(
        "window.COMBRISK?.ready || window.COMBRISK?.error", timeout=90000
    )
    assert page.evaluate("COMBRISK.ready"), page.evaluate("COMBRISK.error")


def load(page, url):
    page.goto(url, wait_until="load")
    wait_ready(page)


def js(page, source):
    return page.evaluate(source)


# A safe, known, empty lane. All bullets still use the actual Rapier ray queries.
SETUP = """(heat=0)=>{
const c=COMBRISK,g=c.game;g.start('solo',heat);c.ui.clear();g.cheats.aiPaused=true;g.countdown=0;
for(const t of g.tanks){t.invuln=0;t.reveal=2;t.reload=0;t.body.setLinvel({x:0,y:0,z:0},true);}
const a=g.tanks[0],b=g.tanks[1];
for(const [t,x,z] of [[a,-14,-9],[b,-8,-9]]){t.x=x;t.z=z;t.body.setTranslation({x,y:.7,z},true);t.aim=-Math.PI/2;t.angle=t.aim;}
for(const t of g.tanks.slice(2)){t.x=14;t.z=9;t.body.setTranslation({x:14,y:.7,z:9},true);}
g.world.step();g.inputs.clear();return true;
}"""


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = http.server.ThreadingHTTPServer(
    ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT.parent))
)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
BASE = "http://127.0.0.1:" + str(server.server_address[1])
URL = BASE + "/" + urllib.parse.quote(GAME.name)

try:
    html = GAME.read_text()
    check(
        "single HTML has no external asset dependency",
        "https://cdn" not in html and 'type="module" src=' not in html,
    )
    check(
        "Hub client is embedded unmodified",
        (ROOT / "reference/session.js").read_text() in html,
    )
    metadata = json.loads((ROOT.parent / "exit-interview.json").read_text())
    check(
        "exit interview schema",
        set(metadata)
        == {
            "sourceInformation",
            "testingFeedback",
            "engineFeedback",
            "promptFeedback",
            "aiHub",
        }
        and len(metadata["testingFeedback"]) == 4
        and len(metadata["engineFeedback"]) == 6
        and len(metadata["promptFeedback"]) == 4,
    )
    check(
        "server returns this game",
        "<title>Combrisk" in urllib.request.urlopen(URL).read().decode(),
    )
    with sync_playwright() as pw:
        # Native WebGPU runtime. No canvas screenshot: SwiftShader readback can lose the device.
        browser = pw.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
            ],
        )
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        gpu_errors = []
        page.on("pageerror", lambda e: gpu_errors.append(str(e)))

        def gpu_test():
            load(page, GAME.as_uri())
            check(
                "WebGPU initialises from file URL",
                js(page, "COMBRISK.backend") == "WebGPU",
            )
            js(page, "COMBRISK.start();COMBRISK.game.countdown=0")
            page.keyboard.down("KeyD")
            page.wait_for_function(
                "COMBRISK.snapshot().tanks[0].x > -12.5", timeout=10000
            )
            page.keyboard.up("KeyD")
            check(
                "WebGPU gameplay advances",
                js(page, "COMBRISK.snapshot().tanks[0].x") > -12.5,
            )
            check("WebGPU runtime has no JS errors", not gpu_errors, gpu_errors)

        guarded("WebGPU runtime", gpu_test)
        browser.close()

        browser = pw.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--enable-unsafe-swiftshader",
                "--use-angle=swiftshader",
            ],
        )
        context = browser.new_context(
            viewport={"width": 1600, "height": 900}, device_scale_factor=1
        )
        context.add_init_script(
            """window.__pad=null;Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pad?[window.__pad]:[]});"""
        )
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(e.stack))
        page.on(
            "console", lambda m: errors.append(m.text) if m.type == "error" else None
        )
        load(page, URL + "?renderer=webgl")
        check("fallback initialises", js(page, "COMBRISK.backend") == "WebGL 2")
        check(
            "music defaults to ten percent", js(page, "COMBRISK.settings.music") == 0.1
        )
        check(
            "title is controller focusable",
            page.locator("[data-action=solo]").evaluate(
                "(e)=>e===document.activeElement"
            ),
        )
        serial = js(page, "COMBRISK.snapshot().serial")
        page.keyboard.press("Enter")
        page.wait_for_function("COMBRISK.ui.name==='game'")
        check(
            "Enter launches once", js(page, "COMBRISK.snapshot().serial") == serial + 1
        )
        js(page, "COMBRISK.game.countdown=0;COMBRISK.game.cheats.aiPaused=true")
        x = js(page, "COMBRISK.snapshot().tanks[0].x")
        page.keyboard.down("KeyD")
        page.wait_for_function(
            "(x)=>COMBRISK.snapshot().tanks[0].x>x+.5", arg=x, timeout=10000
        )
        page.keyboard.up("KeyD")
        check(
            "keyboard movement moves a tank",
            js(page, "COMBRISK.snapshot().tanks[0].x") > x + 0.5,
        )
        page.mouse.move(1100, 320)
        page.mouse.down()
        page.wait_for_function("COMBRISK.snapshot().stats.shots>0", timeout=5000)
        page.mouse.up()
        check("mouse aim and fire", js(page, "COMBRISK.snapshot().stats.shots") > 0)
        page.keyboard.press("ShiftLeft")
        page.wait_for_function("COMBRISK.snapshot().stats.boosts>0", timeout=5000)
        check("keyboard boost", js(page, "COMBRISK.snapshot().tanks[0].boostCd") > 0)

        def physics_tests():
            js(page, SETUP)
            result = js(
                page,
                """()=>{const g=COMBRISK.game,t=g.tanks[0];t.x=17;t.z=0;t.body.setTranslation({x:17,y:.7,z:0},true);g.input(0,{x:1,z:0});COMBRISK.advance(1);return t.x;}""",
            )
            check("Rapier walls contain tanks", 16 < result < 17.5, result)
            js(page, SETUP)
            result = js(
                page,
                """()=>{const c=COMBRISK,g=c.game,t=g.tanks[0];t.x=14;t.z=5;t.body.setTranslation({x:14,y:.7,z:5},true);t.aim=-Math.PI/2;g.world.step();g.fire(t);c.advance(.22);return g.bullets.map(b=>({banks:b.banks,vx:b.vx}));}""",
            )
            check(
                "shell reflects from wall",
                any(b["banks"] == 1 and b["vx"] < 0 for b in result),
                result,
            )
            js(page, SETUP)
            result = js(
                page,
                """()=>{const c=COMBRISK,g=c.game,t=g.tanks[0];t.x=15;t.z=5;t.body.setTranslation({x:15,y:.7,z:5},true);t.aim=-Math.PI/2;g.world.step();g.fire(t);c.advance(.6);return t.hp;}""",
            )
            check("own ricochet can damage player", result == 2, result)
            js(page, SETUP)
            result = js(
                page,
                """()=>{const c=COMBRISK,g=c.game,t=g.tanks[0];t.x=-4;t.z=0;t.body.setTranslation({x:-4,y:.7,z:0},true);t.aim=-Math.PI/2;g.world.step();for(let i=0;i<2;i++){g.fire(t);c.advance(.3);}return g.destroyed;}""",
            )
            check("cover breaks after two real impacts", len(result) == 1, result)
            js(page, SETUP)
            result = js(
                page,
                """()=>{const c=COMBRISK,g=c.game,a=g.tanks[0],b=g.tanks[1];for(let i=0;i<3;i++){g.fire(a);c.advance(.5);}const killed=!b.alive&&a.score===1;c.advance(2.3);return {killed,alive:b.alive,hp:b.hp,invuln:b.invuln};}""",
            )
            check("three hits score a knockout", result["killed"], result)
            check(
                "knocked-out tank respawns protected",
                result["alive"] and result["hp"] == 3 and result["invuln"] > 0,
                result,
            )
            js(page, SETUP)
            result = js(
                page,
                """()=>{const c=COMBRISK,g=c.game,a=g.tanks[0];a.hp=2;g.addPickup('repair',a.x,a.z);c.advance(.02);const repaired=a.hp===3;g.addPickup('shield',a.x,a.z);c.advance(.02);const shield=a.shield;g.addPickup('rapid',a.x,a.z);c.advance(.02);a.reload=0;g.fire(a);const rapid=a.rapid>7&&a.reload<g.tuning.reload*.5;const b=g.tanks[1];b.aim=Math.PI/2;b.reload=0;g.fire(b);c.advance(.5);return {repaired,shield,rapid,absorbed:!a.shield&&a.hp===3};}""",
            )
            for name, key in [
                ("repair pickup heals", "repaired"),
                ("shield pickup grants protection", "shield"),
                ("rapid pickup reduces reload", "rapid"),
                ("shield absorbs a real shell", "absorbed"),
            ]:
                check(name, result[key], result)
            # Ghost concealment is a view concern, not just a state flag.
            page.evaluate(SETUP, 2)
            result = js(
                page,
                """()=>{const c=COMBRISK,g=c.game;g.tanks.forEach(t=>{t.invuln=0;t.reveal=0});c.view.sync(g.snapshot(),.1);return {enemyHidden:!c.view.tanks.get(1).root.visible,selfVisible:c.view.tanks.get(0).root.visible};}""",
            )
            check(
                "ghosts hide opponents but preserve local visibility",
                result["enemyHidden"] and result["selfVisible"],
                result,
            )
            result = js(
                page,
                """()=>{const c=COMBRISK,g=c.game,b=g.tanks[1];g.fire(b);c.view.sync(g.snapshot(),.02);return b.reveal>0&&c.view.tanks.get(1).root.visible;}""",
            )
            check("firing reveals ghost tank", result)
            page.evaluate(SETUP, 1)
            result = js(
                page,
                """()=>{const c=COMBRISK,g=c.game,a=g.tanks[0],b=g.tanks[1];for(const [t,x,z]of[[a,14,-6],[b,14,2]]){t.x=x;t.z=z;t.body.setTranslation({x,y:.7,z},true);}b.hp=1;a.aim=-Math.PI*.75;g.world.step();g.fire(a);c.advance(.8);return {score:a.score,dead:!b.alive,banks:g.stats.banks};}""",
            )
            check(
                "bank-shot knockout scores double",
                result["score"] == 2 and result["dead"] and result["banks"] > 0,
                result,
            )
            page.evaluate(SETUP, 3)
            result = js(
                page,
                """()=>{const c=COMBRISK,g=c.game,a=g.tanks[0];a.x=17.8;a.z=-5;a.aim=-Math.PI/2;a.body.setTranslation({x:17.8,y:.7,z:-5},true);g.input(0,{x:1,z:0,boost:true});c.advance(.4);return {x:a.x,boost:a.boostCd};}""",
            )
            check("aircraft wraps across field edge", result["x"] < 0, result)
            check("aircraft roll ability recharges", result["boost"] > 0, result)
            result = js(
                page,
                """()=>{const c=COMBRISK,g=c.game,a=g.tanks[0];a.x=16;a.z=0;a.aim=-Math.PI/2;a.body.setTranslation({x:16,y:.7,z:0},true);g.input(0,{x:0,z:0});g.fire(a);c.advance(.15);return g.bullets.some(b=>b.wraps===1&&b.x<0);}""",
            )
            check("aircraft shell wraps once", result)

        guarded("physics and combat group", physics_tests)

        def couch_ghosts():
            js(
                page,
                "COMBRISK.game.start('local',2);COMBRISK.ui.clear();COMBRISK.game.tanks.forEach(t=>{t.invuln=0;t.reveal=0});COMBRISK.view.sync(COMBRISK.snapshot(),.02)",
            )
            check(
                "couch ghost duel treats both players equally",
                js(
                    page,
                    "!COMBRISK.view.tanks.get(0).root.visible&&!COMBRISK.view.tanks.get(1).root.visible",
                ),
            )

        guarded("couch ghost fairness", couch_ghosts)

        def campaign():
            js(
                page,
                "COMBRISK.start();COMBRISK.game.tuning.target=1;COMBRISK.game.cheats.aiPaused=true",
            )
            for heat in range(4):
                result = js(
                    page,
                    """()=>{const c=COMBRISK,g=c.game;g.countdown=0;g.cheats.aiPaused=true;const a=g.tanks[0],b=g.tanks[1];for(const [t,x,z]of[[a,-14,-9],[b,-8,-9]]){t.x=x;t.z=z;t.body.setTranslation({x,y:.7,z},true);t.body.setLinvel({x:0,y:0,z:0},true);t.invuln=0;t.aim=-Math.PI/2;t.hp=3;t.reveal=2;}for(const t of g.tanks.slice(2)){t.invuln=50;t.body.setTranslation({x:14,y:.7,z:8},true);}g.world.step();g.input(0,{x:0,z:0});for(let i=0;i<8&&g.phase!=='results';i++){g.fire(a);c.advance(.48);}return {heat:g.heat,phase:g.phase,score:a.score,enemyHP:b.hp};}""",
                )
                check(
                    "scripted circuit heat " + str(heat + 1),
                    result["heat"] == heat
                    and result["phase"] == "results"
                    and result["score"] >= 1,
                    result,
                )
                page.wait_for_function("COMBRISK.ui.name==='results'", timeout=10000)
                if heat < 3:
                    page.locator("[data-action=continue]").click()
            s = js(page, "COMBRISK.snapshot()")
            check(
                "complete circuit has four results",
                s["finished"] and len(s["results"]) == 4 and s["heatWins"] == 4,
                s["results"],
            )
            check(
                "campaign finale is reachable",
                "THE WEEKEND" in page.locator("#screen").inner_text(),
            )
            page.locator("[data-action=rematch]").click()
            check(
                "circuit rematch resets progression",
                js(
                    page,
                    "COMBRISK.snapshot().heat===0&&!COMBRISK.snapshot().finished&&COMBRISK.snapshot().results.length===0",
                ),
            )

        guarded("full campaign playthrough", campaign)

        def menu_tests():
            page.keyboard.press("Escape")
            page.locator("[data-action=dev]").click()
            check(
                "dev mode is reachable from pause", js(page, "COMBRISK.ui.name==='dev'")
            )
            page.locator("input[data-tune=speed]").evaluate(
                "e=>{e.value=7.2;e.dispatchEvent(new Event('input',{bubbles:true}))}"
            )
            check(
                "live tuning changes simulation",
                abs(js(page, "COMBRISK.game.tuning.speed") - 7.2) < 0.01,
            )
            page.locator("[data-action=resetTune]").click()
            check(
                "balance resets to defaults",
                js(
                    page,
                    "COMBRISK.game.tuning.speed===5.2&&COMBRISK.game.tuning.target===5",
                ),
            )
            page.locator("[data-action=god]").click()
            check(
                "invincibility toggle works",
                js(page, "COMBRISK.game.cheats.invincible"),
            )
            page.locator("[data-action=next]").click()
            check("dev heat skip reaches next map", js(page, "COMBRISK.game.heat") == 1)
            page.locator("[data-action=resume]").click()
            page.keyboard.press("Escape")
            page.locator("[data-action=settings]").click()
            page.locator("[data-action=glyphs]").click()
            check(
                "Xbox glyph preference switches",
                js(page, "COMBRISK.settings.glyphs==='xbox'"),
            )
            page.locator("[data-action=back]").click()
            page.locator("[data-action=about]").click()
            text = page.locator("#screen").inner_text()
            check(
                "credits include required feedback",
                all(
                    s in text
                    for s in [
                        "Source Information",
                        "Testing Feedback",
                        "Engine Feedback",
                        "Prompt Feedback",
                        "added on import",
                    ]
                ),
            )
            page.locator(".about-scroll").focus()
            js(page, "COMBRISK.ui.navigate(0,1)")
            page.wait_for_function(
                "document.querySelector('.about-scroll').scrollTop>0"
            )
            check(
                "controller scrolls long credits",
                page.locator(".about-scroll").evaluate("(e)=>e.scrollTop") > 0,
            )
            page.keyboard.press("Escape")
            page.locator("[data-action=quit]").click()
            # Menu-pad test, then movement and firing with a standard-mapped virtual pad.
            js(
                page,
                "window.__pad={index:0,id:'Virtual standard pad',connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0,touched:false}))};__pad.buttons[0]={pressed:true,value:1}",
            )
            page.wait_for_function("COMBRISK.ui.name==='game'", timeout=10000)
            js(
                page,
                "__pad.buttons[0]={pressed:false,value:0};COMBRISK.game.countdown=0;COMBRISK.game.cheats.aiPaused=true",
            )
            before = js(page, "COMBRISK.snapshot().tanks[0].x")
            js(page, "__pad.axes=[1,0,0,-1];__pad.buttons[7]={pressed:true,value:1}")
            page.wait_for_function(
                "(x)=>COMBRISK.snapshot().tanks[0].x>x+.5&&COMBRISK.snapshot().stats.shots>0",
                arg=before,
                timeout=12000,
            )
            check(
                "virtual pad moves aims and fires",
                js(page, "COMBRISK.input.device") == "pad"
                and js(page, "COMBRISK.snapshot().tanks[0].x") > before + 0.5,
            )
            check(
                "Xbox prompts follow active controller",
                "RT" in page.locator("#bottom-hud").inner_text(),
            )
            js(
                page,
                "window.__pad=null;COMBRISK.title();COMBRISK.input.lastInput=performance.now()-11000",
            )
            page.wait_for_function("COMBRISK.attract", timeout=10000)
            check(
                "ten-second attract mode starts",
                js(page, "COMBRISK.snapshot().mode") == "attract",
            )
            result = js(page, "COMBRISK.advance(21).heat")
            check("attract mode tours different mechanics", result == 1, result)
            page.keyboard.press("Enter")
            check(
                "any input exits attract without starting a game",
                js(page, "!COMBRISK.attract&&COMBRISK.ui.name==='title'"),
            )

        guarded("menus controller and attract group", menu_tests)

        def audio_test():
            page.locator("[data-action=settings]").click()
            result = js(
                page,
                """async()=>{const s=COMBRISK.sound;await s.wake();s.play('boom');s.voice('go');s.update(true);return {state:s.ctx.state,music:s.musicBus.gain.value,voices:s.history.filter(v=>v.type==='sawtooth').length,scheduled:s.history.length};}""",
            )
            time.sleep(0.025)
            levels = js(page, "COMBRISK.sound.levels()")
            check(
                "audio graph runs at configured music volume",
                result["state"] == "running" and abs(result["music"] - 0.1) < 0.001,
                result,
            )
            check(
                "procedural sound produces an audible signal",
                levels["peak"] > 0.0001,
                levels,
            )
            check(
                "gibberish voices are synthesised",
                result["voices"] > 0 and result["scheduled"] > 5,
                result,
            )

        guarded("audio group", audio_test)
        if "--capture" in sys.argv:
            page.set_viewport_size({"width": 1920, "height": 1080})
            js(page, "COMBRISK.title()")
            page.wait_for_timeout(500)
            page.mouse.move(1850, 30)
            page.screenshot(path=str(ART / "final-title.png"), animations="disabled")
            js(
                page,
                "COMBRISK.start();COMBRISK.game.countdown=0;COMBRISK.game.cheats.aiPaused=true;COMBRISK.game.tanks.forEach(t=>t.invuln=0)",
            )
            page.wait_for_timeout(500)
            page.screenshot(path=str(ART / "final-tanks.png"))
            js(
                page,
                "COMBRISK.game.buildHeat(3);COMBRISK.game.countdown=0;COMBRISK.game.tanks.forEach(t=>t.invuln=0)",
            )
            page.wait_for_timeout(500)
            page.screenshot(path=str(ART / "final-air.png"))
        check("standalone has no runtime errors", not errors, errors[:6])
        context.close()

        def touch_test():
            phone = browser.new_context(
                viewport={"width": 390, "height": 844},
                device_scale_factor=1,
                is_mobile=True,
                has_touch=True,
            )
            p = phone.new_page()
            load(p, URL + "?renderer=webgl")
            boxes = p.locator("#screen button").evaluate_all(
                "(es)=>es.map(e=>{let r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}})"
            )
            check(
                "phone title buttons remain on screen",
                all(
                    b["x"] >= 0 and b["x"] + b["w"] <= 391 and b["y"] + b["h"] <= 845
                    for b in boxes
                ),
                boxes,
            )
            if "--capture" in sys.argv:
                p.screenshot(path=str(ART / "final-phone-title.png"))
            p.locator("[data-action=solo]").tap()
            js(p, "COMBRISK.game.countdown=0;COMBRISK.game.cheats.aiPaused=true")
            session = phone.new_cdp_session(p)
            session.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchStart",
                    "touchPoints": [
                        {"x": 70, "y": 650, "id": 0},
                        {"x": 310, "y": 650, "id": 1},
                    ],
                },
            )
            session.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchMove",
                    "touchPoints": [
                        {"x": 120, "y": 610, "id": 0},
                        {"x": 315, "y": 600, "id": 1},
                    ],
                },
            )
            p.wait_for_function("COMBRISK.snapshot().stats.shots>0", timeout=10000)
            check(
                "multitouch invisible sticks move and fire",
                js(
                    p,
                    'COMBRISK.input.touch.size===2&&COMBRISK.input.device==="touch"&&COMBRISK.snapshot().tanks[0].x> -13',
                ),
            )
            check(
                "touch boost appears at contact", p.locator("#touch-boost").is_visible()
            )
            session.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )
            check("touch UI clears on release", js(p, "COMBRISK.input.touch.size") == 0)
            phone.close()

        guarded("touch group", touch_test)

        def standalone_link():
            c = browser.new_context(viewport={"width": 900, "height": 650})
            a = c.new_page()
            b = c.new_page()
            load(a, URL + "?headless=1")
            load(b, URL + "?headless=1")
            offer = js(a, "COMBRISK.net.hostOffer()")
            answer = b.evaluate("(o)=>COMBRISK.net.joinOffer(o)", offer)
            a.evaluate("(r)=>COMBRISK.net.acceptAnswer(r)", answer)
            a.wait_for_function("COMBRISK.net.active", timeout=20000)
            b.wait_for_function(
                "COMBRISK.net.active&&COMBRISK.game.remote", timeout=20000
            )
            js(a, "COMBRISK.game.countdown=0")
            b.keyboard.down("KeyA")
            a.wait_for_function("COMBRISK.snapshot().tanks[1].x<12.4", timeout=12000)
            b.keyboard.up("KeyA")
            check(
                "standalone WebRTC remote input reaches host",
                js(a, "COMBRISK.snapshot().tanks[1].x") < 12.4,
            )
            b.wait_for_function("COMBRISK.snapshot().tanks[1].x<12.4", timeout=10000)
            check(
                "standalone host state reaches guest",
                js(b, "COMBRISK.net.received>2&&COMBRISK.game.remote"),
            )
            b.close()
            a.wait_for_function("!COMBRISK.net.active", timeout=12000)
            check(
                "standalone peer departure is handled",
                js(a, "COMBRISK.ui.name==='waiting'"),
            )
            c.close()

        guarded("standalone multiplayer group", standalone_link)

        def hub_scenario(players, scenario="standard", rough=False, rendered=False):
            c = browser.new_context(viewport={"width": 1280, "height": 850})
            p = c.new_page()
            params = {
                "game": "../../" + GAME.name + ("" if rendered else "?headless=1"),
                "players": str(players),
                "auto": "1",
                "play": "3500",
                "limit": "45",
                "scenario": scenario,
            }
            if rough:
                params.update({"latency": "150", "jitter": "50", "loss": "5"})
            harness = (
                BASE
                + "/"
                + ROOT.name
                + "/reference/harness.html?"
                + urllib.parse.urlencode(params)
            )
            p.goto(harness)
            p.wait_for_function("window.__hubCheck?.done", timeout=110000)
            report = js(p, "window.__hubCheck")
            reports[f"hub-{players}-{scenario}"] = report
            bad = [v for v in report["checks"] if not v["pass"]]

            if not report["pass"]:
                details = []
                for frame in p.frames[1:]:
                    try:
                        details.append(
                            frame.evaluate(
                                "({url:location.href,ready:window.COMBRISK?.ready,error:window.COMBRISK?.error,boot:document.getElementById('boot-status')?.textContent,kind:window.COMBRISK?.net.kind,backend:window.COMBRISK?.backend,info:window.COMBRISK?.net.info,frames:window.COMBRISK?.frameCount})"
                            )
                        )
                    except Exception as e:  # noqa: BLE001 - diagnostic for a removed frame
                        details.append(str(e))
                bad.append({"frames": details, "log": report["log"][-12:]})
            check(
                f"AI Hub {players} players / {scenario}"
                + (" / rendered" if rendered else " / headless")
                + (" / latency and loss" if rough else ""),
                report["pass"],
                bad,
            )
            c.close()

        for players, scenario, rough in [
            (2, "standard", False),
            (4, "standard", True),
            (4, "host-leave", True),
            (2, "server", False),
        ]:
            guarded(
                f"Hub scenario {players}/{scenario}",
                lambda n=players, s=scenario, r=rough: hub_scenario(n, s, r),
            )
        browser.close()
        # A normal rendered session also has to pass the supplied harness.
        for n in [2, 4]:
            browser = pw.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                ],
            )
            guarded(
                f"rendered Hub {n}",
                lambda n=n: hub_scenario(n, rough=n == 4, rendered=True),
            )
            browser.close()
finally:
    server.shutdown()
    server.server_close()
    result = {
        "checks": len(checks),
        "passed": len(checks) - len(failures),
        "failures": failures,
        "reports": reports,
    }
    (ART / "test-results.json").write_text(json.dumps(result, indent=2) + "\n")
    print(
        f"{len(checks) - len(failures)}/{len(checks)} checks passed; {len(failures)} failures",
        flush=True,
    )
raise SystemExit(1 if failures else 0)
