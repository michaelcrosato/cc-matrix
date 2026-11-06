import functools
import json
import re
import subprocess
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "artifacts"
ART.mkdir(exist_ok=True)
count = 0
failures = []
metrics = {}
errors = []


def check(name, fn):
    global count
    try:
        fn()
        count += 1
    except Exception as exc:  # noqa: BLE001 -- aggregate all failures in this test runner
        failures.append(name + ": " + str(exc).splitlines()[0])
    (ART / "test-progress.json").write_text(
        json.dumps(
            {
                "passed": count,
                "failures": failures,
                "metrics": metrics,
                "errors": errors,
            },
            indent=2,
        )
    )


def require(value, message):
    if not value:
        raise AssertionError(message)


def tap(page, partial_name):
    box = page.get_by_role("button", name=partial_name).bounding_box()
    page.touchscreen.tap(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)


def ready(page):
    page.wait_for_function("window.__DE?.ready || window.__DE?.error", timeout=45000)
    require(
        page.evaluate("__DE.ready"),
        str(page.evaluate("__DE.error || 'renderer did not initialize'")),
    )


def padpress(page, button):
    page.evaluate(
        "(b)=>{__pad.buttons[b].pressed=true;__pad.buttons[b].value=1}", button
    )
    page.wait_for_timeout(180)
    page.evaluate(
        "(b)=>{__pad.buttons[b].pressed=false;__pad.buttons[b].value=0}", button
    )
    page.wait_for_timeout(180)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


subprocess.run(
    ["node", "build.mjs", "--quiet"], cwd=ROOT, check=True, capture_output=True
)
physics = subprocess.run(
    ["node", "tests/physics.mjs"], cwd=ROOT, capture_output=True, text=True, check=False
)
try:
    data = json.loads(physics.stdout)
    count += data["count"]
    failures.extend(data["failures"])
    metrics.update(data["metrics"])
except Exception as exc:  # noqa: BLE001 -- aggregate all failures in this test runner
    failures.append("physics runner: " + (physics.stderr or str(exc))[:300])


def metadata():
    report = json.loads((ROOT.parent / "exit-interview.json").read_text())
    require(
        set(report)
        == {
            "sourceInformation",
            "testingFeedback",
            "engineFeedback",
            "promptFeedback",
            "aiHub",
        },
        "wrong report shape",
    )
    require(
        len(report["testingFeedback"]) == 4
        and len(report["engineFeedback"]) == 6
        and len(report["promptFeedback"]) == 4,
        "missing interview answers",
    )
    require(
        report["sourceInformation"]["usage"] == "added on import", "wrong usage text"
    )
    require(
        all(v for v in report["sourceInformation"].values()), "empty source information"
    )
    html = (ROOT / "index.html").read_text()
    first_script = re.search(r"<script>(.*?)</script>", html, re.DOTALL).group(1)
    require(
        first_script == (ROOT / "vendor/hub/session.js").read_text(),
        "Hub client modified",
    )
    require(
        not re.search(r"<script[^>]+src=|<link[^>]+href=", html),
        "external runtime dependency",
    )


check("single-file package and exit interview contract", metadata)

handler = functools.partial(QuietHandler, directory=str(ROOT))
server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
origin = "http://127.0.0.1:" + str(server.server_port)
metrics["testOrigin"] = origin

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--enable-unsafe-swiftshader",
            ],
        )
        context = browser.new_context(
            viewport={"width": 1600, "height": 1000}, offline=True
        )
        page = context.new_page()
        page.on("pageerror", lambda e: errors.append(str(e) + " " + str(e.stack)))
        console_errors = []
        page.on(
            "console",
            lambda m: console_errors.append(m.text) if m.type == "error" else None,
        )
        page.goto((ROOT / "index.html").as_uri(), wait_until="load", timeout=60000)

        def initialized():
            ready(page)
            require(
                page.evaluate("__DE.state.backend") == "WebGPU", "WebGPU was not used"
            )

        check("offline HTML boots with WebGPU", initialized)

        if page.evaluate("!!window.__DE?.ready"):
            page.screenshot(path=str(ART / "title-webgpu.png"))
            metrics["initialState"] = page.evaluate("__DE.state")
            check(
                "title exposes five TV-sized actions",
                lambda: require(
                    page.locator(".title-layout .menu-button").count() == 5,
                    "wrong action count",
                ),
            )
            page.get_by_role("button", name="SOLO SORTIE").click()
            page.get_by_role("button", name="LAUNCH SORTIE").click()
            page.wait_for_timeout(250)
            check(
                "solo sortie creates Rapier world",
                lambda: require(page.evaluate("__DE.state.physics") > 0, "no bodies"),
            )
            page.evaluate("__DE.app.manual=true;__DE.simulate(4, {0:{fire:true}})")
            check(
                "simulation spawns the first encounter",
                lambda: require(
                    page.evaluate("__DE.game.wave") == 0, "wrong encounter"
                ),
            )
            check(
                "renderer produces frames",
                lambda: require(
                    page.evaluate("__DE.state.frames") > 2, "no rendered frames"
                ),
            )

            def pause_lab():
                page.keyboard.press("Escape")
                require(
                    page.evaluate("__DE.app.menu") == "pause", "Escape did not pause"
                )
                before = page.evaluate("__DE.game.time")
                page.evaluate("__DE.app.manual=false")
                page.wait_for_timeout(250)
                require(
                    page.evaluate("__DE.game.time") == before,
                    "paused simulation advanced",
                )
                page.get_by_role("button", name="FLIGHT LAB").click()
                page.get_by_label("Demon speed", exact=True).evaluate(
                    "(e)=>{e.value='1.7';e.dispatchEvent(new Event('input',{bubbles:true}))}"
                )
                require(
                    abs(page.evaluate("__DE.game.tuning.enemySpeed") - 1.7) < 0.01,
                    "live slider did not change world",
                )
                page.get_by_label("Invulnerable pilots", exact=True).check()
                page.get_by_role("button", name="CHARGE ENCORE", exact=True).click()
                require(
                    page.evaluate("__DE.game.players[0].charge") == 100,
                    "charge tool failed",
                )
                page.get_by_role("button", name="DROP PICKUPS", exact=True).click()
                require(
                    page.evaluate(
                        "[...__DE.game.entities.values()].filter(e=>e.type==='pickup').length"
                    )
                    == 3,
                    "drop tool failed",
                )
                page.get_by_role("button", name="NEXT ENCOUNTER", exact=True).click()
                require(page.evaluate("__DE.game.wave") == 1, "next encounter failed")
                page.get_by_role("button", name="RESET ALL TUNING").click()
                require(
                    page.evaluate(
                        "JSON.stringify(__DE.game.tuning)===JSON.stringify(__DE.DEFAULTS)"
                    ),
                    "tuning reset failed",
                )
                page.keyboard.press("Escape")
                page.keyboard.press("Escape")
                require(page.evaluate("__DE.app.menu") is None, "resume path failed")

            check("pause menu, live tuning and all lab tools", pause_lab)

            def keyboard_mouse():
                page.evaluate("__DE.app.manual=false;__DE.game.tuning.god=true")
                x = page.evaluate("__DE.game.players[0].x")
                page.keyboard.down("ArrowRight")
                page.wait_for_timeout(300)
                page.keyboard.up("ArrowRight")
                require(
                    page.evaluate("__DE.game.players[0].x") > x, "arrow movement failed"
                )
                page.keyboard.down("Space")
                page.wait_for_timeout(300)
                page.keyboard.up("Space")
                require(page.evaluate("__DE.game.stats.shots") > 0, "Space fire failed")
                page.mouse.move(300, 650)
                page.mouse.down()
                page.wait_for_timeout(300)
                page.mouse.up()
                require(
                    page.evaluate("__DE.game.players[0].x") < x + 0.2,
                    "mouse positioning failed",
                )
                page.keyboard.press("Shift")
                page.wait_for_timeout(50)
                require(
                    page.evaluate("__DE.game.stats.dashes") > 0, "keyboard dash failed"
                )
                page.evaluate("__DE.game.players[0].charge=100")
                page.keyboard.press("e")
                page.wait_for_timeout(50)
                require(
                    page.evaluate("__DE.game.stats.encores") > 0,
                    "keyboard Encore failed",
                )

            check("native keyboard and mouse gameplay", keyboard_mouse)

            def audio():
                result = page.evaluate("""async()=>{
                    const ctx=new OfflineAudioContext(1,44100,44100);
                    const engine=new __DE.app.audio.constructor(__DE.app.settings);
                    engine.ctx=ctx;engine.build(ctx);
                    engine.tone(220,.3,'triangle',.3,engine.music,.01);
                    engine.play('encore');engine.gibberish('victory');
                    const buffer=await ctx.startRendering(),data=buffer.getChannelData(0);
                    let sum=0,peak=0,bad=0;for(const v of data){sum+=v*v;peak=Math.max(peak,Math.abs(v));if(!Number.isFinite(v))bad++;}
                    return {rms:Math.sqrt(sum/data.length),peak,bad,voices:engine.voices,music:engine.settings.music};
                }""")
                metrics["offlineAudio"] = result
                require(
                    result["rms"] > 0.005 and result["peak"] < 1 and result["bad"] == 0,
                    "generated audio silent, clipped or invalid",
                )
                require(
                    result["voices"] == 1 and result["music"] == 10,
                    "voice or default music volume wrong",
                )

            check("offline-rendered music, SFX and gibberish voice", audio)

            def couch():
                page.evaluate(
                    "__DE.app.hangar();__DE.app.action('couch');__DE.app.manual=false;__DE.game.tuning.god=true"
                )
                x = page.evaluate("__DE.game.players[1].x")
                page.keyboard.down("l")
                page.wait_for_timeout(220)
                page.keyboard.up("l")
                require(
                    page.evaluate("__DE.game.players.length") == 2,
                    "missing co-op pilot",
                )
                require(
                    page.evaluate("__DE.game.players[1].x") > x,
                    "second keyboard pilot cannot move",
                )
                page.evaluate(
                    "__DE.game.players[1].inv=0;__DE.game.players[1].hp=1;__DE.game.tuning.god=false;__DE.game.damage(__DE.game.players[1]);__DE.game.startWave(1)"
                )
                require(
                    page.evaluate("__DE.game.players[1].alive"), "co-op revival failed"
                )

            check("couch co-op second keyboard pilot and revival", couch)

            def settings_credits():
                page.evaluate("__DE.app.hangar();__DE.app.action('settings')")
                page.get_by_label("Music", exact=True).evaluate(
                    "(e)=>{e.value='27';e.dispatchEvent(new Event('input',{bubbles:true}))}"
                )
                page.get_by_label("Controller glyphs", exact=True).select_option("xbox")
                page.reload()
                ready(page)
                require(
                    page.evaluate("__DE.app.settings.music") == 27,
                    "settings did not persist",
                )
                require(
                    page.evaluate("__DE.app.settings.glyphs") == "xbox",
                    "glyph choice did not persist",
                )
                page.evaluate(
                    "__DE.app.action('settings');__DE.app.action('resetSettings');__DE.app.action('title');__DE.app.action('about')"
                )
                require(
                    page.get_by_text("added on import", exact=True).count() == 1,
                    "credits missing usage",
                )
                for tab in ["testingFeedback", "engineFeedback", "promptFeedback"]:
                    page.evaluate("(t)=>__DE.app.action('tab:'+t)", tab)
                    require(
                        page.locator(".feedback-item").count()
                        == (6 if tab == "engineFeedback" else 4),
                        "missing feedback answers",
                    )

            check("persistent settings and all four credits sections", settings_credits)

            def attract():
                page.evaluate("__DE.app.hangar()")
                page.wait_for_timeout(10400)
                require(
                    page.evaluate("__DE.app.attract"),
                    "did not enter attract after ten seconds",
                )
                page.evaluate("__DE.app.attractClock=13.5")
                page.wait_for_timeout(250)
                require(
                    page.evaluate("__DE.game.wave") >= 1,
                    "attract does not demonstrate later encounters",
                )
                page.evaluate("__DE.game.startWave(6);__DE.app.attractClock=13.5")
                page.wait_for_timeout(250)
                require(page.evaluate("__DE.game.wave") == 0, "attract did not loop")
                page.keyboard.press("ArrowLeft")
                require(
                    page.evaluate("__DE.app.menu") == "title"
                    and not page.evaluate("__DE.app.attract"),
                    "input did not exit attract",
                )

            check("ten-second attract entry, progression, loop and input exit", attract)
            metrics["desktopState"] = page.evaluate("__DE.state")
        check(
            "no WebGPU runtime errors", lambda: require(not errors, "; ".join(errors))
        )
        metrics["consoleErrors"] = [
            e for e in console_errors if "Device was destroyed" not in e
        ]
        context.close()

        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()
        page.on("pageerror", lambda e: errors.append(str(e) + " " + str(e.stack)))
        page.goto(origin + "/index.html?renderer=webgl")

        def fallback():
            ready(page)
            require(page.title() == "Demon Encore", "server reached a different page")
            require(
                page.evaluate("__DE.state.backend") == "WebGL 2",
                "fallback backend missing",
            )
            page.wait_for_timeout(350)
            page.screenshot(path=str(ART / "title.png"))

        check("owned ephemeral server and rendered WebGL fallback", fallback)
        if page.evaluate("!!window.__DE?.ready"):

            def screenshot_game():
                page.evaluate(
                    "__DE.app.begin();__DE.app.manual=true;__DE.game.startWave(4);__DE.simulate(2,{0:{fire:true}});__DE.app.ui.bannerUntil=0"
                )
                page.wait_for_timeout(250)
                page.screenshot(path=str(ART / "game.png"))
                page.evaluate(
                    "__DE.game.startWave(6);__DE.simulate(3,{0:{fire:true}});__DE.app.ui.bannerUntil=0"
                )
                page.wait_for_timeout(250)
                page.screenshot(path=str(ART / "boss.png"))

            check("rendered swarm and boss composition", screenshot_game)
        context.close()

        pad_context = browser.new_context(viewport={"width": 1280, "height": 800})
        pad_context.add_init_script(
            """window.__pad={index:0,id:'Emulated DualSense',connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.__pad]});"""
        )
        pad_page = pad_context.new_page()
        pad_page.on("pageerror", lambda e: errors.append(str(e) + " " + str(e.stack)))
        pad_page.goto(origin + "/index.html?renderer=webgl")

        def controller():
            ready(pad_page)
            padpress(pad_page, 0)
            require(
                pad_page.evaluate("__DE.app.menu") == "difficulty",
                "Cross did not select",
            )
            pad_page.evaluate(
                "__DE.app.action('launch');__DE.game.startWave(0);__DE.game.tuning.god=true;__pad.axes[0]=.8;__pad.buttons[7].pressed=true;__pad.buttons[7].value=1"
            )
            pad_page.wait_for_timeout(450)
            require(
                pad_page.evaluate("__DE.game.players[0].x") > 0,
                "left stick did not move",
            )
            require(pad_page.evaluate("__DE.game.stats.shots") > 0, "R2 did not fire")
            pad_page.evaluate(
                "__pad.axes[0]=0;__pad.buttons[7].pressed=false;__pad.buttons[7].value=0"
            )
            padpress(pad_page, 1)
            require(
                pad_page.evaluate("__DE.game.stats.dashes") > 0, "Circle did not dash"
            )
            pad_page.evaluate("__DE.game.players[0].charge=100")
            padpress(pad_page, 2)
            require(
                pad_page.evaluate("__DE.game.stats.encores") > 0,
                "Square did not Encore",
            )
            padpress(pad_page, 9)
            require(
                pad_page.evaluate("__DE.app.menu") == "pause", "Options did not pause"
            )
            pad_page.evaluate("__DE.app.settings.glyphs='xbox';__DE.app.ui.prompts()")
            require(
                "A" in pad_page.locator("#footer-controls").inner_text(),
                "Xbox glyphs missing",
            )
            pad_page.evaluate("__pad.buttons[8].pressed=true")
            padpress(pad_page, 9)
            require(
                pad_page.evaluate("__DE.app.menu") == "pause",
                "Create+Options was consumed",
            )
            pad_page.evaluate("__pad.buttons[8].pressed=false")
            padpress(pad_page, 1)
            require(
                pad_page.evaluate("__DE.app.menu") is None, "Circle did not back out"
            )

        check("standard Gamepad API gameplay, menus and glyph switching", controller)
        pad_context.close()

        phone_context = browser.new_context(**pw.devices["iPhone 13"])
        phone = phone_context.new_page()
        phone.on("pageerror", lambda e: errors.append(str(e) + " " + str(e.stack)))
        phone.goto(origin + "/index.html?renderer=webgl")

        def touch():
            ready(phone)
            phone.screenshot(path=str(ART / "phone-title.png"))
            tap(phone, "SOLO SORTIE")
            tap(phone, "LAUNCH SORTIE")
            phone.evaluate("__DE.game.startWave(0);__DE.game.tuning.god=true")
            phone.wait_for_timeout(350)
            require(
                phone.evaluate("__DE.app.input.mode") == "touch",
                "touch mode not selected",
            )
            require(
                phone.evaluate("__DE.game.stats.shots") > 0, "touch auto-fire failed"
            )
            x = phone.evaluate("__DE.game.players[0].x")
            phone.dispatch_event(
                "#stage",
                "pointerdown",
                {
                    "pointerType": "touch",
                    "pointerId": 11,
                    "clientX": 100,
                    "clientY": 650,
                },
            )
            phone.dispatch_event(
                "#stage",
                "pointermove",
                {
                    "pointerType": "touch",
                    "pointerId": 11,
                    "clientX": 210,
                    "clientY": 650,
                },
            )
            phone.wait_for_timeout(250)
            require(
                phone.evaluate("__DE.game.players[0].x") > x,
                "invisible touch steering failed",
            )
            phone.dispatch_event(
                "#stage",
                "pointerdown",
                {
                    "pointerType": "touch",
                    "pointerId": 12,
                    "clientX": 270,
                    "clientY": 650,
                },
            )
            phone.wait_for_timeout(100)
            require(
                phone.evaluate("__DE.game.stats.dashes") > 0, "two-finger dash failed"
            )
            phone.dispatch_event(
                "#stage", "pointerup", {"pointerType": "touch", "pointerId": 11}
            )
            phone.dispatch_event(
                "#stage", "pointerup", {"pointerType": "touch", "pointerId": 12}
            )
            phone.evaluate("__DE.game.players[0].charge=100")
            phone.wait_for_timeout(200)
            tap(phone, "✦")
            require(
                phone.evaluate("__DE.game.stats.encores") > 0,
                "touch Encore pop-up failed",
            )
            phone.screenshot(path=str(ART / "phone-game.png"))

        check("phone touch, invisible steering, auto-fire and contextual Encore", touch)
        phone_context.close()

        host_context = browser.new_context(viewport={"width": 960, "height": 720})
        guest_context = browser.new_context(viewport={"width": 960, "height": 720})
        host = host_context.new_page()
        guest = guest_context.new_page()
        host.on("pageerror", lambda e: errors.append(str(e) + " " + str(e.stack)))
        guest.on("pageerror", lambda e: errors.append(str(e) + " " + str(e.stack)))
        host.goto(origin + "/index.html?renderer=webgl")
        guest.goto(origin + "/index.html?renderer=webgl")

        def peer():
            ready(host)
            ready(guest)
            offer = host.evaluate("async()=>await __DE.net.offer()")
            answer = guest.evaluate("async(code)=>await __DE.net.answer(code)", offer)
            host.evaluate("async(code)=>await __DE.net.accept(code)", answer)
            host.wait_for_function("__DE.net.active&&__DE.app.started", timeout=15000)
            guest.wait_for_function(
                "__DE.app.started&&__DE.game?.players.length===2", timeout=15000
            )
            guest.evaluate("__DE.app.input.target=3;__DE.app.input.mouseFire=true")
            guest.wait_for_timeout(500)
            host.wait_for_timeout(250)
            require(
                host.evaluate("__DE.net.received") > 0
                and guest.evaluate("__DE.net.received") > 0,
                "traffic not bidirectional",
            )
            require(
                host.evaluate("__DE.game.players[1].x") > 1,
                "guest input not authoritative on host",
            )
            hx = host.evaluate("__DE.game.players[1].x")
            gx = guest.evaluate("__DE.game.players[1].x")
            require(abs(hx - gx) < 1, "remote world diverged")
            metrics["directLink"] = {
                "hostReceived": host.evaluate("__DE.net.received"),
                "guestReceived": guest.evaluate("__DE.net.received"),
            }
            guest.set_viewport_size({"width": 390, "height": 844})
            host.wait_for_function("__DE.game.width < 3", timeout=10000)
            metrics["directLink"]["guestWidth"] = guest.evaluate("__DE.app.view.width")
            metrics["directLink"]["hostWidth"] = host.evaluate("__DE.game.width")
            guest.evaluate("__DE.app.hangar();__DE.app.action('launch')")
            require(
                guest.evaluate("__DE.net.host")
                and not guest.evaluate("__DE.net.active"),
                "guest could not return to solo",
            )
            host.wait_for_function("__DE.game.players[1].left === true", timeout=10000)

        check("real two-page WebRTC co-op and return to solo", peer)
        host_context.close()
        guest_context.close()

        metrics["hub"] = []
        for players, scenario, latency, jitter, loss in [
            (2, "standard", 0, 0, 0),
            (4, "standard", 150, 50, 5),
            (4, "host-leave", 150, 50, 5),
            (2, "server", 0, 0, 0),
        ]:
            hub_context = browser.new_context(viewport={"width": 1600, "height": 1000})
            hub_page = hub_context.new_page()
            hub_page.on(
                "pageerror",
                lambda e: errors.append("HUB " + str(e) + " " + str(e.stack)),
            )
            params = urlencode(
                {
                    "game": "../../index.html"
                    if players == 2 and scenario == "standard"
                    else "../../index.html?renderer=webgl",
                    "players": players,
                    "scenario": scenario,
                    "latency": latency,
                    "jitter": jitter,
                    "loss": loss,
                    "auto": 1,
                    "limit": 30,
                    "play": 3500,
                }
            )
            hub_page.goto(origin + "/vendor/hub/harness.html?" + params)

            def hub_run(hub_page=hub_page):
                hub_page.wait_for_function(
                    "document.body.dataset.complete==='true'", timeout=65000
                )
                result = hub_page.evaluate("__hubCheck")
                metrics["hub"].append(result)
                bad = [
                    c["name"] + " " + c["detail"]
                    for c in result["checks"]
                    if not c["pass"]
                ]
                require(result["pass"], "; ".join(bad))
                frames = [
                    f for f in hub_page.frames if "/index.html" in f.url.split("?")[0]
                ]
                require(
                    all(f.evaluate("__DE.net.ended") for f in frames),
                    "end did not freeze every copy",
                )

            check(
                "AI Hub "
                + scenario
                + " / "
                + str(players)
                + " players / loss "
                + str(loss),
                hub_run,
            )
            hub_context.close()

        check(
            "no runtime errors across controller, touch and multiplayer",
            lambda: require(not errors, "; ".join(errors)),
        )
        browser.close()

        safari = pw.webkit.launch(headless=True)
        safari_context = safari.new_context(viewport={"width": 1280, "height": 800})
        safari_page = safari_context.new_page()
        safari_errors = []
        safari_page.on("pageerror", lambda e: safari_errors.append(str(e)))

        def webkit():
            safari_page.goto(
                origin + "/index.html", wait_until="domcontentloaded", timeout=60000
            )
            ready(safari_page)
            require(
                safari_page.evaluate("__DE.state.backend") == "WebGL 2",
                "automatic WebGL fallback failed",
            )
            safari_page.evaluate(
                "__DE.app.begin();__DE.app.manual=true;__DE.simulate(5,{0:{fire:true}})"
            )
            require(
                safari_page.evaluate("__DE.game.stats.shots") > 0, "WebKit cannot play"
            )
            require(not safari_errors, "; ".join(safari_errors))

        check("WebKit automatic fallback and gameplay", webkit)
        safari_context.close()
        safari.close()
except Exception as exc:  # noqa: BLE001 -- aggregate all failures in this test runner
    failures.append("browser runner: " + str(exc).splitlines()[0])
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=2)

(ART / "test-results.json").write_text(
    json.dumps({"passed": count, "failures": failures, "metrics": metrics}, indent=2)
)
for failure in failures:
    print("FAIL " + failure)
print(str(count) + " passed; " + str(len(failures)) + " failed")
sys.exit(1 if failures else 0)
