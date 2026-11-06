from __future__ import annotations

import json
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
ART = ROOT / "test-artifacts"
ART.mkdir(exist_ok=True)
results = []
mode = sys.argv[1] if len(sys.argv) > 1 else "all"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format: str, *args: object) -> None:
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
base = f"http://127.0.0.1:{server.server_port}"


def check(name, fn):
    try:
        detail = fn()
        results.append({"name": name, "pass": True, "detail": detail})
    except Exception as exc:  # noqa: BLE001 - isolate and report every test failure
        message = str(exc)
        results.append({"name": name, "pass": False, "detail": message})
        print(f"FAIL {name}: {message}", flush=True)


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--disable-dev-shm-usage",
            ],
        )
        context = browser.new_context(
            viewport={"width": 1440, "height": 900}, ignore_https_errors=True
        )
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        def boot():
            page.goto(
                (ROOT.parent / (ROOT.name + ".html")).as_uri(),
                wait_until="domcontentloaded",
            )
            page.wait_for_function("window.__STAR?.state.ready", timeout=90000)
            assert page.title().startswith("Star Ralliers")
            page.wait_for_timeout(1200)
            s = page.evaluate("__STAR.snapshot()")
            assert not s["fatal"], s["fatal"]
            assert s["backend"] == "WebGPU", s
            assert s["rapier"] == "0.19.3", s
            page.screenshot(path=str(ART / "title-webgpu.png"))
            return s

        check("file:// boot with WebGPU, Three r180 and Rapier 0.19.3", boot)
        if not results[-1]["pass"]:
            (ART / "console-errors.json").write_text(json.dumps(errors, indent=2))
        if results[-1]["pass"] and mode not in ("smoke", "hub", "visual", "package"):

            def menus():
                page.get_by_role("button", name="Launch patrol").click()
                assert page.locator("#briefScreen").is_visible()
                page.get_by_role("button", name="Take the helm").click()
                assert page.evaluate("__STAR.state.mode") == "playing", page.evaluate(
                    "__STAR.snapshot()"
                )
                page.keyboard.press("Escape")
                assert page.locator("#pauseScreen").is_visible()
                page.get_by_role("button", name="Developer tools", exact=True).click()
                assert page.locator("#modalScreen").is_visible()
                page.locator("#setting-enemyDamage").fill("0.5")
                assert page.evaluate("__STAR.tune.enemyDamage") == 0.5
                page.get_by_role("button", name="Reset balance defaults").click()
                assert page.evaluate("__STAR.tune.enemyDamage") == 1
                page.locator("#modalBack").click()
                page.get_by_role("button", name="End patrol", exact=True).click()
                page.get_by_role("button", name="Settings", exact=True).first.click()
                assert page.locator("#setting-music").input_value() == "0.1"
                page.locator("#modalBack").click()
                return "Launch, briefing, pause, developer sliders, defaults, settings."

            check("menus, pause and live balance controls", menus)

            def sound():
                d = page.evaluate("__STAR.audio.constructor.probe()")
                assert d["rms"] > 0.01 and 0.01 < d["peak"] <= 1, d
                page.evaluate(
                    """async () => {await __STAR.audio.unlock();__STAR.audio.shot();__STAR.audio.voice('cadet ready');__STAR.audio.update(1,1);}"""
                )
                page.wait_for_timeout(130)
                live = page.evaluate(
                    """() => {let a=new Float32Array(__STAR.audio.analyser.fftSize);__STAR.audio.analyser.getFloatTimeDomainData(a);return {peak:Math.max(...a.map(Math.abs)),events:__STAR.audio.events,voices:__STAR.audio.voiceEvents,notes:__STAR.audio.notes,music:__STAR.audio.musicVolume};}"""
                )
                assert (
                    live["peak"] > 0.001
                    and live["events"] > 2
                    and live["voices"] > 0
                    and live["notes"] > 0
                ), live
                assert live["music"] == 0.1, live
                return {"offline": d, "actualGame": live}

            check("procedural Web Audio produces a non-clipping signal", sound)

            def playthrough():
                page.evaluate(
                    """() => {__STAR.audio.suspend();__STAR.start({auto:true});__STAR.state.god=true;}"""
                )
                samples = []
                for _ in range(100):
                    snap = page.evaluate("__STAR.step(600)")
                    samples.append(snap)
                    if snap["mode"] != "playing":
                        break
                (ART / "campaign.json").write_text(json.dumps(samples, indent=2))
                assert snap["win"], snap
                assert snap["kills"] == snap["total"] == 11, snap
                assert snap["jumps"] >= 4 and snap["docks"] >= 1, snap
                assert (
                    snap["stats"]["collisions"] >= 11
                    and snap["stats"]["physicsSteps"] > 0
                ), snap
                assert all(b["alive"] for b in snap["bases"]), snap
                return snap

            check(
                "scripted complete campaign through real combat, jumps, docking and victory",
                playthrough,
            )

            def normal_patrol():
                page.evaluate("__STAR.start({auto:true})")
                samples = []
                for _ in range(90):
                    snap = page.evaluate("__STAR.step(600)")
                    samples.append(snap)
                    if snap["mode"] != "playing":
                        break
                (ART / "normal-campaign.json").write_text(json.dumps(samples, indent=2))
                assert snap["win"], snap
                assert snap["energy"] > 0 and snap["hull"] > 0, snap
                return snap

            check("full patrol under ordinary damage and energy rules", normal_patrol)

            def systems():
                return page.evaluate(
                    """() => {const g=__STAR;g.start();g.player.shieldOn=false;g.damagePlayer(60);if(!g.player.engineDamaged||g.player.hull!==40)throw Error('Hull damage not applied');g.player.position.set(0,0,-160);g.physics.getRigidBody(0);g.player.velocity.set(0,0,0);if(!g.dock())throw Error('Dock request rejected');g.step(300);if(g.player.hull!==100||g.player.energy<999.5||g.player.engineDamaged)throw Error('Dock failed to restore systems');g.warp('D3');g.step(260);if(g.state.sector!=='D3')throw Error('Warp failed');g.openMap();const before=g.state.missionTime;g.step(60);if(g.state.missionTime<=before)throw Error('Chart should keep time');g.state.overlay=null;g.player.shieldOn=true;g.player.shield=100;g.damagePlayer(13);if(g.player.shield!==87||g.player.hull!==100)throw Error('Shield failed');const energy=g.player.energy;g.pulse();if(g.state.pulseCd<=0||g.player.energy>=energy)throw Error('Pulse failed');g.state.overlay='pause';const t=g.state.missionTime;g.step(60);if(g.state.missionTime!==t)throw Error('Solo pause advanced');return g.snapshot();}"""
                )

            check("hull, engine damage, shields, pulse, repair and solo pause", systems)

            def failure():
                snap = page.evaluate(
                    """() => {__STAR.start();__STAR.player.shieldOn=false;__STAR.damagePlayer(101);return __STAR.snapshot();}"""
                )
                assert snap["mode"] == "result" and not snap["win"], snap
                page.evaluate("__STAR.start(); __STAR.player.energy=0; __STAR.step(1)")
                assert page.evaluate("__STAR.state.mode") == "result"
                return "Hull destruction and energy exhaustion both report a mission evaluation."

            check("loss states and restart", failure)

            def siege_and_flagship():
                return page.evaluate(
                    """() => {let g=__STAR;g.start();g.tune.siegeSpeed=4;g.step(5000);if(g.bases.some(b=>b.alive)||g.state.mode!=='result')throw Error('Base siege did not end patrol');g.tune.siegeSpeed=1;g.start();g.warp('E1');g.step(250);const boss=g.enemies.find(e=>e.type==='crown');g.state.target=boss;g.player.position.copy(boss.position).add({x:0,y:0,z:300});g.physics.getRigidBody(0).setTranslation(g.player.position,true);let hp=boss.hp;g.fire();g.step(100);if(boss.hp!==hp)throw Error('Long-range photons bypassed command shield');g.state.debug=true;return g.snapshot();}"""
                )

            check("base siege loss and long-range flagship shield", siege_and_flagship)

            def pad():
                page.evaluate(
                    """() => {__STAR.title();window.testPad={id:'Emulated DualSense',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[window.testPad];}"""
                )

                def button(n):
                    before = page.evaluate("__STAR.state.stats.frames")
                    page.evaluate(f"testPad.buttons[{n}]={{pressed:true,value:1}}")
                    page.wait_for_function(
                        f"__STAR.state.stats.frames > {before}+1", timeout=15000
                    )
                    before = page.evaluate("__STAR.state.stats.frames")
                    page.evaluate(f"testPad.buttons[{n}]={{pressed:false,value:0}}")
                    page.wait_for_function(
                        f"__STAR.state.stats.frames > {before}", timeout=15000
                    )

                button(0)
                assert page.evaluate("__STAR.state.mode") == "brief", page.evaluate(
                    "__STAR.snapshot()"
                )
                button(0)
                assert page.evaluate("__STAR.state.mode") == "playing", page.evaluate(
                    "__STAR.snapshot()"
                )
                button(12)
                assert page.evaluate("__STAR.state.overlay") == "map", page.evaluate(
                    "__STAR.snapshot()"
                )
                button(15)
                button(0)
                assert page.evaluate("!!__STAR.state.warp"), page.evaluate(
                    "__STAR.snapshot()"
                )
                page.evaluate("testPad.axes[0]=.7")
                page.wait_for_timeout(200)
                page.evaluate("testPad.axes[0]=0")
                assert page.evaluate(
                    'document.getElementById("controlStrip").textContent.includes("R2")'
                )
                page.evaluate('__STAR.openModal("settings")')
                page.locator("#glyphSelect").select_option("xbox")
                assert page.evaluate(
                    'document.getElementById("controlStrip").textContent.includes("RT")'
                )
                page.locator("#glyphSelect").select_option("ps")
                page.evaluate(
                    "__STAR.state.warp=null;__STAR.state.overlay=null;__STAR.start()"
                )
                page.mouse.move(720, 450)
                before = page.evaluate("__STAR.state.shots")
                page.mouse.down()
                page.wait_for_timeout(350)
                page.mouse.up()
                assert page.evaluate("__STAR.state.shots") > before, (
                    "An idle connected pad suppressed mouse fire."
                )
                page.keyboard.press("Escape")
                page.evaluate("navigator.getGamepads=()=>[];__STAR.title()")
                return "Standard mapping launch, chart navigation, warp and PlayStation prompts."

            check("emulated DualSense controller and dynamic prompts", pad)

            def attract():
                page.evaluate(
                    "__STAR.title();__STAR.state.idleAt=performance.now()-10100"
                )
                page.wait_for_timeout(250)
                assert page.evaluate("__STAR.state.attract")
                page.evaluate("__STAR.step(720)")
                assert page.evaluate("__STAR.state.jumps") > 0
                page.keyboard.press("KeyZ")
                assert page.evaluate("__STAR.state.mode") == "title"
                assert not page.evaluate("__STAR.state.attract")
                return "Starts after ten idle seconds, flies and exits on input."

            check("ten-second AI attract mode and interruption", attract)

            def touch():
                ctx = browser.new_context(
                    viewport={"width": 844, "height": 390},
                    has_touch=True,
                    is_mobile=True,
                    device_scale_factor=1,
                    ignore_https_errors=True,
                )
                pg = ctx.new_page()
                try:
                    pg.goto(base + "/index.html", wait_until="domcontentloaded")
                    pg.wait_for_function("window.__STAR?.state.ready", timeout=60000)
                    assert pg.title().startswith("Star Ralliers")
                    pg.locator("#launchBtn").tap()
                    assert pg.locator("#briefScreen").is_visible()
                    pg.locator("#beginBtn").tap()
                    pg.touchscreen.tap(200, 210)
                    pg.wait_for_timeout(150)
                    assert pg.evaluate('document.body.classList.contains("touch-mode")')
                    assert pg.locator("#touchMenu").is_visible()
                    assert pg.locator("#touchAction").is_visible()
                    pg.screenshot(path=str(ART / "touch-landscape.png"))
                    pg.locator("#touchAction").tap()
                    assert pg.locator("#mapScreen").is_visible()
                    pg.screenshot(path=str(ART / "touch-chart.png"))
                    return "Touch-only controls, minimal HUD and context chart action."
                finally:
                    ctx.close()

            check("touch phone controls and context action", touch)

            def local_wing():
                p1 = context.new_page()
                p2 = context.new_page()
                try:
                    for pg in [p1, p2]:
                        pg.goto(base + "/index.html", wait_until="domcontentloaded")
                        pg.wait_for_function(
                            "window.__STAR?.state.ready", timeout=60000
                        )
                    p1.evaluate('__STAR.wing.open("TEST77",true)')
                    p2.evaluate('__STAR.wing.open("TEST77",false)')
                    p1.wait_for_function("__STAR.wing.members.size===2", timeout=15000)
                    p2.wait_for_function("__STAR.wing.members.size===2", timeout=15000)
                    p1.evaluate(
                        '__STAR.wing.emit({type:"start",seed:771}); __STAR.start({seed:771})'
                    )
                    p2.wait_for_function('__STAR.state.mode==="playing"')
                    for pg in [p1, p2]:
                        pg.wait_for_function("__STAR.ghosts.size===1", timeout=15000)
                        assert pg.evaluate("__STAR.state.stats.ghostUpdates") > 0
                    transports = [
                        p1.evaluate("__STAR.wing.transport"),
                        p2.evaluate("__STAR.wing.transport"),
                    ]
                    remote = False
                    try:
                        for pg in [p1, p2]:
                            pg.wait_for_function(
                                "[...__STAR.wing.connections.values()].some(c=>c.open)",
                                timeout=15000,
                            )
                        for pg in [p1, p2]:
                            pg.evaluate(
                                "__STAR.wing.channel.close();__STAR.wing.channel=null;__STAR.state.stats.ghostUpdates=0;"
                            )
                        for pg in [p1, p2]:
                            pg.wait_for_function(
                                "__STAR.state.stats.ghostUpdates>1", timeout=10000
                            )
                        remote = True
                    except (AssertionError, PlaywrightTimeoutError):
                        remote = False
                    return {
                        "members": 2,
                        "ghosts": 1,
                        "transports": transports,
                        "WebRTC_without_BroadcastChannel_confirmed": remote,
                    }

                finally:
                    p1.close()
                    p2.close()

            check(
                "two-page standalone room, synchronized launch and ghost exchange",
                local_wing,
            )
        if mode in ("all", "package"):

            def package_and_credits():
                info = json.loads((ROOT.parent / "exit-interview.json").read_text())
                assert set(info) == {
                    "sourceInformation",
                    "testingFeedback",
                    "engineFeedback",
                    "promptFeedback",
                    "aiHub",
                }
                assert set(info["sourceInformation"]) == {
                    "date",
                    "source",
                    "plan",
                    "genre",
                    "perspective",
                    "tech",
                    "artDirection",
                    "animation",
                    "audio",
                    "online",
                    "testing",
                    "research",
                    "environment",
                    "model",
                    "usage",
                }
                assert [
                    len(info[k])
                    for k in ["testingFeedback", "engineFeedback", "promptFeedback"]
                ] == [4, 6, 4]
                assert info["sourceInformation"]["usage"] == "added on import"
                assert info["aiHub"]["name"] == "Star Ralliers"
                assert len(info["aiHub"]["tags"]) in range(3, 7)
                html = (ROOT.parent / (ROOT.name + ".html")).read_text()
                assert html == (ROOT / "index.html").read_text()
                assert (
                    "<script>" + (ROOT / "hub-session.js").read_text() + "</script>"
                    in html
                )
                assert (
                    "Embedded font licenses" in html and "SIL OPEN FONT LICENSE" in html
                )
                assert "Testing is in progress" not in html
                page.evaluate('__STAR.title();__STAR.openModal("about")')
                assert (
                    page.locator("#creditContent")
                    .inner_text()
                    .find(info["sourceInformation"]["usage"])
                    >= 0
                )
                for key in ["testingFeedback", "engineFeedback", "promptFeedback"]:
                    page.locator(f'[data-credit="{key}"]').click()
                    content = page.locator("#creditContent").inner_text()
                    for answer in info[key]:
                        assert answer in content, (key, answer)
                return {
                    "interview": "valid",
                    "feedback": "matches About",
                    "hubClient": "unmodified",
                    "fonts": "licensed",
                }

            check(
                "single-file package, interview schema and in-game feedback parity",
                package_and_credits,
            )
        if mode in ("all", "visual"):

            def visual_fallback():
                pg = context.new_page()
                try:
                    pg.goto(
                        (ROOT.parent / (ROOT.name + ".html")).as_uri() + "?webgl=1",
                        wait_until="domcontentloaded",
                    )
                    pg.wait_for_function("window.__STAR?.state.ready", timeout=60000)
                    pg.wait_for_timeout(1600)
                    assert pg.evaluate("__STAR.snapshot().backend") == "WebGL2"
                    pg.screenshot(path=str(ART / "title-webgl.png"))
                    pg.evaluate('__STAR.start();__STAR.warp("D3");__STAR.step(250)')
                    pg.wait_for_timeout(500)
                    pg.screenshot(path=str(ART / "combat-webgl.png"))
                    pg.evaluate("__STAR.openMap()")
                    pg.screenshot(path=str(ART / "chart.png"))
                    return "WebGL2 fallback renders the same scene; title, combat and chart captures saved."
                finally:
                    pg.close()

            check("WebGL2 fallback and visual captures", visual_fallback)
        if mode in ("all", "hub"):
            page.close()

            def harness(n, extra=""):
                pg = context.new_page()
                try:
                    pg.goto(
                        base
                        + f"/harness.html?game=index.html&players={n}&auto=1&limit=15"
                        + extra,
                        wait_until="domcontentloaded",
                    )
                    assert pg.title() == "AI Hub Session Harness"
                    pg.wait_for_function("window.__hubCheck?.done", timeout=150000)
                    result = pg.evaluate("__hubCheck")
                    (
                        ART / f"hub-{n}{'-leave' if 'host-leave' in extra else ''}.json"
                    ).write_text(json.dumps(result, indent=2))
                    assert result["pass"], [
                        r for r in result["checks"] if not r["pass"]
                    ]
                    return {"checks": len(result["checks"]), "pass": True}
                finally:
                    pg.close()

            check("official AI Hub harness, 2 players", lambda: harness(2))
            check(
                "official AI Hub harness, 4 players with 150ms latency / 50ms jitter / 5% loss",
                lambda: harness(4, "&latency=150&jitter=50&loss=5"),
            )
            check(
                "official AI Hub harness, host leaves a 4-player ghost round",
                lambda: harness(4, "&latency=150&jitter=50&loss=5&scenario=host-leave"),
            )
        if mode == "all":

            def safari_fallback():
                wk = p.webkit.launch(headless=True)
                ctx = wk.new_context(
                    viewport={"width": 390, "height": 844},
                    has_touch=True,
                    is_mobile=True,
                    device_scale_factor=1,
                    ignore_https_errors=True,
                )
                pg = ctx.new_page()
                try:
                    pg.goto(base + "/index.html?webgl=1", wait_until="domcontentloaded")
                    pg.wait_for_function("window.__STAR?.state.ready", timeout=90000)
                    assert pg.title().startswith("Star Ralliers")
                    pg.locator("#launchBtn").tap()
                    pg.locator("#beginBtn").tap()
                    pg.wait_for_timeout(500)
                    assert pg.evaluate("__STAR.state.mode") == "playing"
                    assert not pg.evaluate("__STAR.state.fatal||false")
                    return {
                        "browser": "WebKit",
                        "profile": "390×844 touch",
                        "backend": pg.evaluate("__STAR.snapshot().backend"),
                    }
                finally:
                    ctx.close()
                    wk.close()

            check("WebKit portrait phone fallback", safari_fallback)
        check(
            "no uncaught browser errors",
            lambda: (
                (_ for _ in ()).throw(AssertionError(errors))
                if errors
                else "No uncaught errors."
            ),
        )
        context.close()
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    (ART / f"results-{mode}.json").write_text(json.dumps(results, indent=2))
    passed = sum(r["pass"] for r in results)
    print(
        f"{passed}/{len(results)} checks passed; {len(results) - passed} failures.",
        flush=True,
    )
if any(not r["pass"] for r in results):
    sys.exit(1)
