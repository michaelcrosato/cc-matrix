"""One-command browser, simulation, input, audio, co-op and Hub regression suite."""

import contextlib
import functools
import http.server
import json
import subprocess
import threading
import time
from pathlib import Path
from urllib.parse import unquote, urlparse

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parent
ROOT = DEV.parent
SLUG = json.loads((DEV / "project.json").read_text())["slug"]
RESULTS = []
ERRORS = []
START = time.monotonic()


def check(name, condition, detail=""):
    RESULTS.append({"name": name, "pass": bool(condition), "detail": str(detail)})
    if not condition:
        print(f"FAIL {name}: {detail}", flush=True)


@contextlib.contextmanager
def group(name):
    try:
        yield
    except Exception as error:  # noqa: BLE001 - Collect each failed scenario, then continue.
        check(name, False, str(error).split("Call log:")[0][:900])


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def local_dependencies(route):
    path = unquote(urlparse(route.request.url).path)
    if "/three@0.180.0/" in path:
        file = DEV / "node_modules/three" / path.split("/three@0.180.0/", 1)[1]
    elif "/@dimforge/rapier3d-compat@0.19.3/" in path:
        file = DEV / "node_modules/@dimforge/rapier3d-compat" / path.rsplit("/", 1)[1]
    else:
        return route.continue_()
    if file.is_file():
        route.fulfill(
            path=str(file),
            content_type="application/javascript",
            headers={"Access-Control-Allow-Origin": "*"},
        )
    else:
        route.continue_()


PAD_SCRIPT = """window.__pad={axes:[0,0,0,0], buttons:Array(17).fill(false)};
Object.defineProperty(navigator,'getGamepads',{value:()=>[{id:'Regression standard pad',index:0,connected:true,mapping:'standard',timestamp:performance.now(),axes:__pad.axes,buttons:__pad.buttons.map(v=>({pressed:v,touched:v,value:v?1:0}))}]});"""


def context_for(browser, **options):
    ctx = browser.new_context(ignore_https_errors=True, **options)
    ctx.route("https://cdn.jsdelivr.net/npm/**", local_dependencies)
    ctx.on(
        "page",
        lambda page: page.on("pageerror", lambda error: ERRORS.append(str(error))),
    )
    return ctx


def ready(page, url):
    page.goto(url)
    page.wait_for_function(
        "window.__stream?.ready || window.__streamError", timeout=60000
    )
    error = page.evaluate("window.__streamError || null")
    if error:
        raise RuntimeError(error)
    page.evaluate("__stream.controls.lastAny=Infinity")
    page.wait_for_timeout(180)


def pad(page, index, pressed=True):
    page.evaluate("([i,v])=>__pad.buttons[i]=v", [index, pressed])
    page.wait_for_timeout(180)


def test_main(browser, base):
    ctx = context_for(browser, viewport={"width": 1920, "height": 1080})
    ctx.add_init_script(PAD_SCRIPT)
    page = ctx.new_page()
    with group("WebGPU boot"):
        ready(page, f"{base}/{SLUG}.html")
        state = page.evaluate("__stream.state()")
        check(
            "correct game and title screen",
            page.title().startswith("Stream Scheme") and state["screen"] == "title",
        )
        check(
            "WebGPU renderer selected", state["backend"] == "webgpu", state["backend"]
        )
        check(
            "Rapier initialized with real bodies",
            state["physics"] > 50,
            state["physics"],
        )
        check("music defaults to ten percent", state["musicVolume"] == 0.1)
        check(
            "single HTML has protocol tags",
            page.locator('meta[name="hub:session-mode"]').get_attribute("content")
            == "shared-world",
        )
        page.screenshot(path=str(DEV / "title-webgpu.png"))
    with group("controller menu and actions"):
        pad(page, 13)
        pad(page, 13, False)
        check("D-pad moves menu focus", page.evaluate("__stream.ui.focus") == 1)
        pad(page, 12)
        pad(page, 12, False)
        pad(page, 0)
        pad(page, 0, False)
        check(
            "Cross launches with no mouse",
            page.evaluate("__stream.state().phase") == "playing",
        )
        check(
            "controller prompts follow last input",
            "×" in page.locator('[data-prompt="fire"]').inner_text(),
        )
        x = page.evaluate("__stream.game.players[0].x")
        page.evaluate("__pad.axes[0]=0.8;__pad.buttons[7]=true")
        page.wait_for_timeout(700)
        page.evaluate("__pad.axes[0]=0;__pad.buttons[7]=false")
        check(
            "stick steers the aircraft",
            page.evaluate("__stream.game.players[0].x") > x + 1,
        )
        check(
            "trigger fires actual shots", page.evaluate("__stream.game.stats.shots") > 0
        )
        pad(page, 1)
        pad(page, 1, False)
        check(
            "Circle invokes native barrel-roll clip",
            page.evaluate("__stream.game.stats.rolls") == 1,
        )
        pad(page, 2)
        pad(page, 2, False)
        check(
            "Square spends burst charge",
            page.evaluate("__stream.game.players[0].bursts") == 1,
        )
        pad(page, 8)
        pad(page, 9)
        pad(page, 9, False)
        pad(page, 8, False)
        check(
            "Create + Options is reserved",
            page.evaluate("__stream.state().paused") is False,
        )
        pad(page, 9)
        pad(page, 9, False)
        check("Options pauses", page.evaluate("__stream.state().screen") == "pause")
        progress = page.evaluate("__stream.game.progress")
        page.wait_for_timeout(300)
        check(
            "pause freezes host simulation",
            page.evaluate("__stream.game.progress") == progress,
        )
    with group("live developer tools and keyboard"):
        page.locator('[data-action="dev"]').click()
        before = page.evaluate("__stream.game.params.scrollSpeed")
        page.keyboard.press("ArrowRight")
        check(
            "controller/keyboard adjusts live slider",
            page.evaluate("__stream.game.params.scrollSpeed") == before + 1,
        )
        page.locator('[data-action="god"]').click()
        page.locator('[data-action="jump"][data-value="2"]').click()
        check(
            "developer sector jump and invincibility",
            page.evaluate("__stream.game.progress>=3290 && __stream.game.god"),
        )
        page.locator('[data-action="refill"]').click()
        check(
            "developer refill works",
            page.evaluate("__stream.game.fuel===100 && __stream.game.reserves===9"),
        )
        page.locator('[data-action="defaults"]').click()
        check(
            "reset restores all balance defaults",
            page.evaluate(
                "JSON.stringify(__stream.game.params)===JSON.stringify({scrollSpeed:36,steerSpeed:24,fuelBurn:1.25,enemyFire:1,bulletDamage:1}) && !__stream.game.god && !__stream.game.autopilot"
            ),
        )
        page.locator('[data-action="resume"]').click()
        x = page.evaluate("__stream.game.players[0].x")
        page.keyboard.down("a")
        page.wait_for_timeout(450)
        page.keyboard.up("a")
        check(
            "WASD steers with keyboard",
            page.evaluate("__stream.game.players[0].x") < x - 1,
        )
        page.keyboard.press("Escape")
        page.locator('[data-action="settings"]').click()
        page.locator('[data-action="glyphs"]').click()
        check(
            "Xbox glyph setting works",
            page.evaluate("__stream.ui.settings.glyphs") == "xbox",
        )
        page.locator('[data-action="back"]').click()
        page.locator('[data-action="resume"]').click()
    with group("Rapier combat and economy"):
        result = page.evaluate("""() => {
          const s=__stream,g=s.game;g.reset([{id:0,name:'PHYSICS'}]);g.params.scrollSpeed=0;g.params.enemyFire=0;
          const p=g.players[0];p.x=0;p.y=0;p.invuln=0;g.progress=50;
          const e=g.addEntity('boat',0,65,1);g.inputs.set(0,{fire:true,x:0,y:0,aim:0});s.step(30);
          return {dead:e.dead,hits:g.stats.hits,score:g.score};
        }""")
        check(
            "Rapier bullet sensors destroy targets",
            result["dead"] and result["hits"] > 0 and result["score"] > 0,
            result,
        )
        result = page.evaluate("""() => {
          const s=__stream,g=s.game,p=g.players[0];g.inputs.clear();p.invuln=0;p.hp=3;
          g.enemyShot({id:999,x:p.x,s:g.progress-p.y+9},0,-25);s.step(30);
          const hit=p.hp; p.invuln=0;p.hp=3;g.rollPlayer(p);
          g.enemyShot({id:999,x:p.x,s:g.progress-p.y+9},0,-25);s.step(30);
          return {hit,rolling:p.hp};
        }""")
        check("enemy bullets damage hull", result["hit"] == 2, result)
        check("barrel roll prevents damage", result["rolling"] == 3, result)
        result = page.evaluate("""() => {
          const s=__stream,g=s.game,p=g.players[0],e=g.entities.find(e=>e.type==='fuel');
          g.fuel=10;p.x=e.x;g.progress=e.s+p.y;p.roll=0;g.inputs.clear();s.step(60);
          return {fuel:g.fuel,stops:g.stats.fuelStops};
        }""")
        check(
            "overflying dock replenishes shared fuel",
            result["fuel"] > 40 and result["stops"] == 1,
            result,
        )
        result = page.evaluate("""() => {
          const g=__stream.game,p=g.players[0],bridge=g.entities.find(e=>e.type==='bridge');
          p.hp=1;p.bursts=0;g.damageEntity(bridge,999);const saved={checkpoint:g.checkpoint,hp:p.hp,bursts:p.bursts};
          p.x+=9;g.fuel=.001;g.params.fuelBurn=4;__stream.step(2);const lost=g.phase;g.retry();
          return {...saved,lost,retry:g.progress,restored:g.fuel};
        }""")
        check(
            "bridge repairs and saves checkpoint",
            result["checkpoint"] == 1600
            and result["hp"] == 3
            and result["bursts"] == 2,
            result,
        )
        check("empty tank ends sortie", result["lost"] == "lost", result)
        check(
            "checkpoint retry restores the correct sector",
            result["retry"] == 1600 and result["restored"] == 100,
            result,
        )
        page.evaluate(
            "Object.assign(__stream.game.params,{scrollSpeed:36,steerSpeed:24,fuelBurn:1.25,enemyFire:1,bulletDamage:1})"
        )
    with group("complete scripted mission"):
        result = page.evaluate("__stream.playthrough()")
        (DEV / "playthrough.json").write_text(json.dumps(result, indent=2))
        check(
            "full sortie reaches victory",
            result["phase"] == "won",
            {
                "phase": result["phase"],
                "progress": result["progress"],
                "bossHp": result["bossHp"],
                "frames": result["frames"],
            },
        )
        check(
            "playthrough breaches both bridges",
            result["stats"]["bridges"] == 2,
            result["stats"],
        )
        check(
            "playthrough exercises fuel, roll and burst",
            all(result["stats"][k] > 0 for k in ["fuelStops", "rolls", "bursts"]),
            result["stats"],
        )
        check(
            "full mission includes three sectors and flagship",
            result["stage"] == 2
            and result["bossHp"] <= 0
            and result["progress"] > 5400,
        )
        check(
            "shared-world snapshot fits Hub packet budget",
            result["snapshotBytes"] < 16000,
            result["snapshotBytes"],
        )
    with group("audio output"):
        page.evaluate("__stream.start(1)")
        page.locator("#game").click(position={"x": 1200, "y": 550})
        page.evaluate("__stream.audio.gibberish();__stream.audio.sfx('checkpoint')")
        page.wait_for_timeout(180)
        result = page.evaluate(
            "({state:__stream.audio.ctx.state,level:__stream.audio.level(),events:__stream.audio.events,voices:__stream.audio.voices,music:__stream.audio.music.gain.value})"
        )
        check(
            "generated audio produces nonzero signal",
            result["state"] == "running" and result["level"] > 0.0001,
            result,
        )
        check(
            "gibberish voice and music are synthesized",
            result["voices"] > 0
            and result["events"] > 10
            and abs(result["music"] - 0.1) < 0.00001,
            result,
        )
    with group("attract mode"):
        page.evaluate("__stream.title()")
        page.wait_for_timeout(9300)
        check(
            "title remains until ten seconds",
            page.evaluate("__stream.state().phase") == "title",
        )
        page.wait_for_function("__stream.game.phase==='attract'", timeout=2500)
        check(
            "AI attract flight starts automatically",
            page.evaluate("__stream.game.phase") == "attract",
        )
        page.keyboard.press("x")
        check(
            "any input exits attract without launching",
            page.evaluate("__stream.state().screen") == "title",
        )
        page.evaluate("__stream.controls.lastAny=performance.now()-11000")
        page.wait_for_function("__stream.game.phase==='attract'")
        pad(page, 0)
        pad(page, 0, False)
        check(
            "controller input exits attract without launching",
            page.evaluate("__stream.state().screen") == "title",
        )
        page.evaluate(
            "__stream.ui.open('wing');__stream.controls.lastAny=performance.now()-11000"
        )
        page.wait_for_function("__stream.game.phase==='attract'", timeout=3000)
        check(
            "front menus also enter attract mode",
            page.evaluate("__stream.game.phase==='attract'"),
        )
        page.keyboard.press("x")
    ctx.close()


def test_visual_and_file(browser, base):
    ctx = context_for(browser, viewport={"width": 1920, "height": 1080})
    page = ctx.new_page()
    with group("WebGL2 and file deployment"):
        ready(page, (ROOT / (SLUG + ".html")).as_uri() + "?webgl")
        check(
            "file URL boots single-file deliverable",
            page.evaluate("__stream.state().phase") == "title",
        )
        check(
            "native compatibility backend boots",
            page.evaluate("__stream.state().backend") == "webgl2",
        )
        page.wait_for_timeout(1000)
        page.screenshot(path=str(DEV / "title-1080.png"))
        page.evaluate("__stream.title();__stream.controls.lastAny=Infinity")
        check(
            "TV menu stays within screen",
            page.locator(".title-nav").bounding_box()["y"]
            + page.locator(".title-nav").bounding_box()["height"]
            < 1030,
        )
        page.locator('[data-action="solo"]').click()
        page.evaluate(
            "__stream.game.god=true;__stream.game.jump(1);__stream.game.autopilot=true"
        )
        page.wait_for_timeout(1400)
        page.screenshot(path=str(DEV / "flight-1080.png"))
        page.evaluate(
            "__stream.game.jump(3);__stream.game.progress=5098;__stream.game.players[0].invuln=0"
        )
        page.wait_for_timeout(2700)
        page.screenshot(path=str(DEV / "flagship-1080.png"))
        framing = page.evaluate(
            """() => {const s=__stream,b=s.game.entities.find(e=>e.type==='boss');return {top:s.view.project(b.x,b.s+12).y,bottom:s.view.project(b.x,b.s-12).y};}"""
        )
        check(
            "flagship combat remains inside camera framing",
            framing["top"] > 100 and framing["bottom"] < 800,
            framing,
        )
        check(
            "native animation mixers are running",
            page.evaluate(
                "[...__stream.view.units.values()].some(o=>o.mixer && o.mixer.time>0)"
            ),
        )
        page.keyboard.press("Escape")
        page.locator('[data-action="manual"]').click()
        page.screenshot(path=str(DEV / "manual-1080.png"))
        page.locator('[data-action="back"]').click()
        page.locator('[data-action="resume"]').click()
        page.evaluate("__stream.title();__stream.ui.open('about')")
        check(
            "credits contain all required source fields",
            page.locator(".source-pair").count() == 15,
            page.locator(".source-pair").count(),
        )
        for tab, count in [
            ("testingFeedback", 4),
            ("engineFeedback", 6),
            ("promptFeedback", 4),
        ]:
            page.locator(f'[data-value="{tab}"]').click()
            check(
                f"credits include {tab}",
                page.locator(".feedback-item").count() == count,
            )
    ctx.close()


def test_touch(browser, base):
    ctx = context_for(
        browser,
        viewport={"width": 390, "height": 844},
        is_mobile=True,
        has_touch=True,
        device_scale_factor=1,
    )
    page = ctx.new_page()
    with group("touch controls"):
        ready(page, f"{base}/{SLUG}.html?webgl")
        page.screenshot(path=str(DEV / "title-phone.png"))
        page.locator('[data-action="solo"]').tap()
        check(
            "touch starts the same game",
            page.evaluate("__stream.game.phase") == "playing",
        )
        check(
            "touch enables assisted firing",
            page.evaluate("__stream.controls.last") == "touch",
        )
        page.wait_for_timeout(500)
        check("touch autofires", page.evaluate("__stream.game.stats.shots") > 0)
        check(
            "mobile sector banner fits the viewport",
            page.evaluate(
                "document.getElementById('stage-text').scrollWidth<=innerWidth"
            ),
        )
        x = page.evaluate("__stream.game.players[0].x")
        page.dispatch_event(
            "canvas",
            "pointerdown",
            {"pointerType": "touch", "pointerId": 42, "clientX": 80, "clientY": 600},
        )
        page.dispatch_event(
            "canvas",
            "pointermove",
            {"pointerType": "touch", "pointerId": 42, "clientX": 140, "clientY": 570},
        )
        page.wait_for_timeout(400)
        page.dispatch_event(
            "canvas",
            "pointerup",
            {"pointerType": "touch", "pointerId": 42, "clientX": 140, "clientY": 570},
        )
        check(
            "invisible thumb stick steers",
            page.evaluate("__stream.game.players[0].x") > x + 1,
        )
        page.touchscreen.tap(330, 550)
        page.wait_for_timeout(150)
        check(
            "right-side touch invokes roll",
            page.evaluate("__stream.game.stats.rolls") > 0,
        )
        page.screenshot(path=str(DEV / "flight-phone.png"))
        page.locator("#pause-button").tap()
        check(
            "touch pause button opens same pause menu",
            page.evaluate("__stream.ui.screen") == "pause",
        )
        check(
            "mobile screen has no horizontal overflow",
            page.evaluate("document.documentElement.scrollWidth<=innerWidth"),
        )
    ctx.close()


def test_webrtc(browser, base):
    ctx = context_for(browser, viewport={"width": 960, "height": 640})
    host, client = ctx.new_page(), ctx.new_page()
    with group("standalone WebRTC co-op"):
        ready(host, f"{base}/{SLUG}.html?webgl")
        ready(client, f"{base}/{SLUG}.html?webgl")
        offer = host.evaluate("__stream.net.offer()")
        answer = client.evaluate("code=>__stream.net.answer(code)", offer)
        host.evaluate("code=>__stream.net.accept(code)", answer)
        host.wait_for_function("__stream.net.seats.length===2", timeout=15000)
        check(
            "direct invitation/reply establishes two seats",
            host.evaluate("__stream.net.seats.length") == 2,
        )
        host.evaluate("__stream.net.launch();__stream.game.god=true")
        host.keyboard.press("Space")
        check(
            "keyboard unlocks audio after automatic round start",
            host.evaluate(
                "!!__stream.audio.ctx && __stream.audio.ctx.state==='running'"
            ),
        )
        client.wait_for_function(
            "__stream.game.phase==='playing' && __stream.game.players.length===2",
            timeout=10000,
        )
        check(
            "standalone client enters shared world",
            client.evaluate("!__stream.net.authority && __stream.net.localId===1"),
        )
        x = host.evaluate("__stream.game.players[1].x")
        client.keyboard.down("a")
        client.keyboard.down("Space")
        client.wait_for_timeout(600)
        client.keyboard.up("a")
        client.keyboard.up("Space")
        check(
            "client input moves host-owned aircraft",
            host.evaluate("__stream.game.players[1].x") < x - 1,
        )
        check(
            "authoritative snapshots reach the client",
            client.evaluate("__stream.net.received>2 && __stream.game.progress>1"),
        )
        check(
            "standalone world positions stay synchronized",
            abs(
                host.evaluate("__stream.game.progress")
                - client.evaluate("__stream.game.progress")
            )
            < 12,
        )
        client.keyboard.press("e")
        host.wait_for_function("__stream.game.stats.bursts>0", timeout=2500)
        check(
            "remote burst executes on host",
            host.evaluate("__stream.game.stats.bursts") > 0,
        )
        host.evaluate("__stream.game.end(true,'NETWORK TEST')")
        client.wait_for_function("__stream.game.phase==='won'", timeout=3000)
        check(
            "host final result reaches standalone client",
            client.evaluate("__stream.ui.screen") == "debrief",
        )
        host.evaluate("__stream.net.launch()")
        client.wait_for_function("__stream.game.phase==='playing'")
        host.evaluate("__stream.net.disconnect()")
        client.wait_for_function("__stream.ui.screen==='debrief'", timeout=5000)
        check(
            "host disconnect gives client a recoverable debrief",
            client.evaluate("__stream.ui.endReason==='RADIO LINK LOST'"),
        )
        client.locator('[data-action="abort"]').click()
        check(
            "standalone client can return to hangar",
            client.evaluate("__stream.ui.screen==='title' && __stream.net.authority"),
        )
    ctx.close()


def test_hub(browser, base):
    scenarios = [
        ("two-player", "players=2"),
        ("four-player impaired network", "players=4&latency=150&jitter=50&loss=5"),
        ("host-leave", "players=4&scenario=host-leave&latency=150&jitter=50&loss=5"),
        ("server without a player", "players=2&scenario=server"),
    ]
    for name, params in scenarios:
        ctx = context_for(browser, viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        with group(f"AI Hub {name}"):
            page.goto(
                f"{base}/{SLUG}/harness.html?game=../{SLUG}.html&{params}&auto=1&play=3"
            )
            page.wait_for_function("window.__hubCheck?.done", timeout=100000)
            report = page.evaluate("window.__hubCheck")
            (DEV / ("hub-" + name.replace(" ", "-") + ".json")).write_text(
                json.dumps(report, indent=2)
            )
            check(
                f"AI Hub {name} conformance",
                report.get("pass"),
                [c for c in report.get("checks", []) if not c.get("pass")],
            )
        ctx.close()


def main():
    built = subprocess.run(
        ["node", "build.mjs"], cwd=DEV, text=True, capture_output=True, check=False
    )
    if built.returncode:
        check("build", False, built.stderr)
        return
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                    "--no-sandbox",
                    "--autoplay-policy=no-user-gesture-required",
                ],
            )
            try:
                test_main(browser, base)
                test_visual_and_file(browser, base)
                test_touch(browser, base)
                test_webrtc(browser, base)
                test_hub(browser, base)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
    check("no uncaught browser errors", not ERRORS, ERRORS[:5])
    check(
        "exit interview parses with required fields",
        set(json.loads((ROOT / "exit-interview.json").read_text()))
        == {
            "sourceInformation",
            "testingFeedback",
            "engineFeedback",
            "promptFeedback",
            "aiHub",
        },
    )


if __name__ == "__main__":
    with group("test runner"):
        main()
    passed = sum(r["pass"] for r in RESULTS)
    (DEV / "test-report.json").write_text(
        json.dumps(
            {
                "passed": passed,
                "total": len(RESULTS),
                "seconds": round(time.monotonic() - START, 2),
                "results": RESULTS,
                "browserErrors": ERRORS,
            },
            indent=2,
        )
    )
    print(
        f"{passed}/{len(RESULTS)} checks passed; {len(RESULTS) - passed} failures",
        flush=True,
    )
    raise SystemExit(0 if passed == len(RESULTS) else 1)
