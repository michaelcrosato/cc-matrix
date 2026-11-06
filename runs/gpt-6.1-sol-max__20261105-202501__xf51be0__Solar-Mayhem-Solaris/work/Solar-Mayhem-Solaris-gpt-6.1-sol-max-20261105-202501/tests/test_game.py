import functools
import http.server
import json
import pathlib
import sys
import threading
from contextlib import contextmanager

from playwright.sync_api import sync_playwright

DEV = pathlib.Path(__file__).resolve().parents[1]
ROOT = DEV.parent
GAME = DEV.name + ".html"
FAILURES = []
RESULTS = []
VISUAL = "--visual" in sys.argv
SMOKE = "--smoke" in sys.argv
VISUAL_ONLY = "--visual-only" in sys.argv
CAMPAIGN_ONLY = "--campaign-only" in sys.argv
HUB_ONLY = "--hub-only" in sys.argv


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


@contextmanager
def check(name):
    try:
        yield
        RESULTS.append({"name": name, "passed": True})
    except Exception as error:  # noqa: BLE001 -- each test failure belongs in the final report
        text = str(error).split("Call log:")[0].strip()[:1800]
        FAILURES.append(name + ": " + text)
        RESULTS.append({"name": name, "passed": False, "error": text})
    finally:
        (
            DEV
            / "artifacts"
            / ("visual-progress.json" if VISUAL_ONLY else "test-progress.json")
        ).write_text(json.dumps(RESULTS, indent=2))


def state(page):
    return page.evaluate("__solar.state()")


def ready(page, url):
    page.goto(url, wait_until="load")
    page.wait_for_function(
        "window.__solar?.ready || window.__solarError", timeout=90000
    )
    assert page.evaluate("window.__solarError || null") is None
    page.wait_for_function("__solar.state().frames > 2", timeout=30000)


def hub_checks(context, base):
    for players, extra in [
        (2, ""),
        (4, "&latency=150&jitter=50&loss=5"),
        (4, "&scenario=host-leave&latency=150&jitter=50&loss=5"),
    ]:
        label = f"AI Hub harness {players} pilots {extra or 'standard'}"
        with check(label):
            hub = context.new_page()
            harness = (
                base
                + DEV.name
                + "/reference/harness.html?game="
                + GAME
                + f"&players={players}&auto=1&play=4000"
                + extra
            )
            # The harness resolves the game's path from its own directory.
            harness = harness.replace("?game=" + GAME, "?game=../../" + GAME)
            hub.goto(harness)
            hub.wait_for_function(
                "document.body.dataset.complete === 'true'", timeout=120000
            )
            report = hub.evaluate("window.__hubCheck")
            report["frames"] = hub.evaluate(
                "[...document.querySelectorAll('iframe')].map(f=>({boot:f.contentWindow?.__solarBoot?.(),error:f.contentWindow?.__solarError,detail:f.contentDocument?.querySelector('#load-detail')?.textContent,ready:!!f.contentWindow?.__solar}))"
            )
            (
                DEV
                / f"artifacts/hub-{players}{'-leave' if 'host-leave' in extra else ''}.json"
            ).write_text(json.dumps(report, indent=2))
            assert report["pass"], json.dumps(report.get("checks", report))[-6000:]
            hub.close()


def extra_checks(page, context, url):
    with check("Branching refuel-first route and emergency tug"):
        page.evaluate(
            "__solar.start();__solar.manual(true);__solar.autopilot(true);__solar.god(true);__solar.advance(23);__solar.autopilot(false);__solar.advance(4)"
        )
        s = state(page)
        assert s["unlocked"] == 2 and s["cleared"] == [0], s
        assert page.locator(".sector-card:disabled").count() == 3
        old_score = s["score"]
        page.evaluate("__solar.set('fuel',0)")
        page.locator('[data-action="travel"][data-sector="2"]').click()
        assert state(page)["score"] == old_score - 500
        page.evaluate("__solar.advance(11)")
        s = state(page)
        assert s["cleared"] == [0, 2] and s["unlocked"] == 2, s
        assert s["fuel"] == 100 and s["health"] == 100
        saved = page.evaluate("JSON.parse(localStorage.getItem('solar-mayhem-save'))")
        assert saved["sector"] == 1, saved
        page.evaluate("__solar.advance(4)")
        assert page.locator('[data-sector="1"]').evaluate(
            "e=>e.classList.contains('focused')"
        )
        assert page.locator('[data-sector="3"]').is_disabled()
        page.evaluate("__solar.title()")
    with check("Metadata schema and all four About categories"):
        data = json.loads((ROOT / "exit-interview.json").read_text())
        assert set(data) == {
            "sourceInformation",
            "testingFeedback",
            "engineFeedback",
            "promptFeedback",
            "aiHub",
        }
        assert len(data["sourceInformation"]) == 15
        assert data["sourceInformation"]["usage"] == "added on import"
        assert [
            len(data[k])
            for k in ("testingFeedback", "engineFeedback", "promptFeedback")
        ] == [4, 6, 4]
        assert data["aiHub"]["name"] == "Solar Mayhem"
        for tab in ["source", "testing", "engine", "prompt"]:
            page.evaluate("tab=>__solar.about(tab)", tab)
            assert page.locator("#panel").is_visible()
        page.evaluate("__solar.title()")
    with check("Offline file URL launch with embedded engine and WASM"):
        context.set_offline(True)
        try:
            ready(page, (ROOT / GAME).as_uri())
            assert state(page)["backend"] == "WebGPU"
            page.keyboard.press("Enter")
            page.evaluate("__solar.manual(true);__solar.advance(3)")
            assert state(page)["mode"] == "playing"
            assert not state(page)["errors"]
        finally:
            context.set_offline(False)


def main():
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = "http://127.0.0.1:" + str(server.server_address[1]) + "/"
    url = base + GAME + ("?webgl=1" if VISUAL_ONLY else "")
    browser_errors = []
    campaign = {}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--autoplay-policy=no-user-gesture-required",
                ],
            )
            context = browser.new_context(
                viewport={"width": 1440, "height": 900}, device_scale_factor=1
            )
            context.add_init_script("""window.__testPad=null;
                Object.defineProperty(navigator,'getGamepads',{value:()=>window.__testPad?[window.__testPad]:[]});""")
            page = context.new_page()
            page.on("pageerror", lambda error: browser_errors.append(str(error)))
            page.on(
                "console",
                lambda message: (
                    browser_errors.append(message.text)
                    if message.type == "error"
                    and "Reason: destroyed" not in message.text
                    else None
                ),
            )
            with check("WebGPU boot and single-file package"):
                ready(page, url)
                s = state(page)
                assert s["backend"] == (
                    "WebGL2 fallback" if VISUAL_ONLY else "WebGPU"
                ), s["backend"]
                assert s["mode"] == "title"
                assert s["settings"]["music"] == 0.1
                assert not s["errors"], s["errors"]
                assert page.title().startswith("Solar Mayhem")
                if VISUAL or VISUAL_ONLY:
                    page.screenshot(path=str(DEV / "artifacts/title.png"))
            if not page.evaluate("!!window.__solar"):
                return
            if HUB_ONLY:
                page.close()
                hub_checks(context, base)
                browser.close()
                return
            if VISUAL_ONLY:
                with check("Visual flight composition"):
                    page.evaluate(
                        "__solar.start();__solar.manual(true);__solar.god(true);__solar.encounter(5);__solar.advance(4)"
                    )
                    page.wait_for_timeout(3500)
                    page.screenshot(path=str(DEV / "artifacts/flight.png"))
                    page.keyboard.press("Tab")
                    page.screenshot(path=str(DEV / "artifacts/scanner.png"))
                browser.close()
                return
            with check("Keyboard launch and controls"):
                page.keyboard.press("Enter")
                page.wait_for_function("__solar.state().mode === 'warp'")
                page.evaluate("__solar.manual(true); __solar.advance(3)")
                assert state(page)["mode"] == "playing"
                page.evaluate("__solar.advance(0.5,{x:1,fire:true})")
                s = state(page)
                assert s["x"] > 3 and s["metrics"]["shots"] >= 2
            if SMOKE:
                return
            with check("Full campaign through real Rapier combat and pickups"):
                campaign = page.evaluate("""() => {
                    __solar.start(); __solar.manual(true); __solar.autopilot(true); __solar.god(true);
                    const route=[]; let previous=''; let s;
                    for(let t=0;t<700;t++){
                        try{s=__solar.advance(1);}catch(e){return {state:__solar.state(),route,error:e.message,at:t,stack:e.stack};}const mark=s.sector+':'+s.mode;
                        if(mark!==previous){route.push({t,sector:s.sector,mode:s.mode,kills:s.metrics.kills,rescues:s.metrics.rescues,key:s.key,rings:s.rings});previous=mark;}
                        if(s.mode==='victory'||s.mode==='gameover')break;
                    }
                    return {state:s,route};
                }""")
                s = campaign["state"]
                campaign["console"] = browser_errors.copy()
                (DEV / "artifacts/campaign.json").write_text(
                    json.dumps(campaign, indent=2)
                )
                assert s["mode"] == "victory", json.dumps(
                    {k: v for k, v in campaign.items() if k != "state"}
                )[-3500:]
                assert s["cleared"] == [0, 1, 2, 3, 4, 5], s["cleared"]
                m = s["metrics"]
                assert m["rescues"] == 4 and m["docks"] == 1, m
                assert m["keys"] == 1 and m["gates"] == 1, m
                assert m["rings"] >= 4 and m["hits"] > 50 and m["collisions"] > 50, m
                assert m["bossPhases"] == 3, m
                assert s["completed"] and s["score"] > 10000
                page.locator("#panel [data-action=about]").click()
                page.keyboard.press("Escape")
                assert (
                    state(page)["panel"] == "result"
                    and state(page)["mode"] == "victory"
                )
            if CAMPAIGN_ONLY:
                return
            with check("Pulse, cooldowns, roll and incoming fire"):
                page.evaluate(
                    "__solar.start();__solar.manual(true);__solar.autopilot(false);__solar.god(true);__solar.encounter(0);__solar.spawn('mech',0,0,-30);__solar.advance(3)"
                )
                before = state(page)
                assert any(e["team"] == "enemy" for e in before["entities"]), (
                    "No hostile shots spawned"
                )
                assert page.evaluate("__solar.pulse()")
                assert not any(e["team"] == "enemy" for e in state(page)["entities"])
                assert not page.evaluate("__solar.pulse()"), (
                    "Cooldown did not lock pulse"
                )
                assert page.evaluate("__solar.roll()")
                assert not page.evaluate("__solar.roll()")
                page.evaluate("__solar.advance(8.1)")
                assert state(page)["pulseCD"] == 0 and state(page)["rollCD"] == 0
            with check("Damage, reserve craft and complete game-over flow"):
                page.evaluate(
                    "__solar.god(false);__solar.set('lives',2);__solar.damage(100)"
                )
                assert state(page)["lives"] == 1 and state(page)["health"] == 100
                page.evaluate("__solar.damage(100)")
                assert state(page)["mode"] == "gameover"
                assert (
                    page.locator("#panel").inner_text().find("One more sunrise?") >= 0
                )
                page.locator("#panel [data-action=new]").click()
                assert state(page)["mode"] == "warp" and state(page)["lives"] == 3
            with check("Pause, live sliders and reset to defaults"):
                page.evaluate("__solar.advance(3)")
                page.keyboard.press("Escape")
                assert state(page)["mode"] == "paused"
                page.locator("[data-action=dev]").click()
                page.locator("#dev-enemyDamage").evaluate(
                    "e=>{e.value=31;e.dispatchEvent(new Event('input',{bubbles:true}))}"
                )
                assert state(page)["tuning"]["enemyDamage"] == 31
                page.locator("[data-action=reset-tuning]").click()
                assert state(page)["tuning"]["enemyDamage"] == 16
                page.locator("[data-action=resume]").click()
                assert state(page)["mode"] == "playing"
            with check("Scanner locks, sector travel and saved flight"):
                page.keyboard.press("Tab")
                assert state(page)["panel"] == "map"
                assert page.locator(".sector-card:disabled").count() == 5
                page.keyboard.press("Escape")
                assert state(page)["mode"] == "playing"
                page.evaluate("__solar.save()")
                saved = page.evaluate(
                    "JSON.parse(localStorage.getItem('solar-mayhem-save'))"
                )
                assert saved["sector"] == 0 and saved["lives"] == 3
            with check("Settings, controller glyphs and credits feedback"):
                page.keyboard.press("Escape")
                page.locator("#panel [data-action=settings]").click()
                page.locator("[data-action=glyphs]").click()
                assert state(page)["settings"]["glyphs"] == "xbox"
                page.locator("#music").evaluate(
                    "e=>{e.value=17;e.dispatchEvent(new Event('input',{bubbles:true}))}"
                )
                assert state(page)["settings"]["music"] == 0.17
                page.locator("#music").evaluate(
                    "e=>{e.value=10;e.dispatchEvent(new Event('input',{bubbles:true}))}"
                )
                page.evaluate("__solar.about('source')")
                assert "added on import" in page.locator("#panel").inner_text()
                for tab in ["testing", "engine", "prompt"]:
                    page.locator(
                        f'[data-action="credits-tab"][data-tab="{tab}"]'
                    ).click()
                    assert page.locator(".feedback-item").count() >= 4
                page.evaluate("__solar.title()")
            with check("Standard mapped gamepad menu and analog flight"):
                page.evaluate("__solar.title()")
                page.evaluate(
                    """window.__testPad={connected:true,mapping:'standard',index:0,id:'Virtual DualSense',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};__solar.manual(false);__testPad.buttons[0]={pressed:true,value:1}"""
                )
                page.wait_for_function("__solar.state().mode==='warp'")
                page.evaluate(
                    "__testPad.buttons[0]={pressed:false,value:0};__solar.manual(true);__solar.advance(3)"
                )
                page.evaluate(
                    "__testPad.axes=[.8,-.4,0,0];__testPad.buttons[7]={pressed:true,value:1};__solar.manual(false)"
                )
                page.wait_for_timeout(650)
                s = state(page)
                assert (
                    s["input"] == "pad" and s["x"] > 2 and s["metrics"]["shots"] > 0
                ), s
                page.evaluate(
                    "__testPad.axes=[0,0,0,0];__testPad.buttons[7]={pressed:false,value:0};__testPad.buttons[9]={pressed:true,value:1}"
                )
                page.wait_for_function("__solar.state().panel==='pause'")
                page.evaluate("window.__testPad=null;__solar.manual(true)")
            with check("Web Audio output, sequencer and synthesized voices"):
                page.locator("[data-action=resume]").click()
                page.evaluate("__solar.audio();__solar.encounter(5)")
                levels = []
                for _ in range(8):
                    page.wait_for_timeout(110)
                    levels.append(state(page)["audio"]["level"])
                a = state(page)["audio"]
                assert a["state"] == "running" and a["notes"] > 0 and a["voices"] > 0, a
                assert max(levels) > 0.001, levels
                if VISUAL:
                    page.evaluate(
                        "__solar.god(true);__solar.advance(4);__solar.render()"
                    )
                    page.wait_for_timeout(700)
                    page.screenshot(path=str(DEV / "artifacts/flight.png"))
            with check("Attract mode starts after idle and any input exits"):
                page.evaluate("__solar.title();__solar.idle()")
                assert state(page)["attract"]
                page.evaluate("__solar.advance(6)")
                assert state(page)["autopilot"] and state(page)["mode"] == "playing"
                page.keyboard.press("KeyZ")
                assert state(page)["mode"] == "title" and not state(page)["attract"]
            with check("Standalone two-page ghost wing race"):
                wing = context.new_page()
                ready(wing, url)
                page.evaluate("__solar.local('AUTOTEST',true)")
                wing.evaluate("__solar.local('AUTOTEST',false)")
                page.wait_for_function("__solar.state().network.received>0")
                page.evaluate("__solar.manual(false);__solar.launch()")
                page.wait_for_function(
                    "__solar.state().mode==='playing'", timeout=15000
                )
                wing.wait_for_function(
                    "__solar.state().mode==='playing'", timeout=15000
                )
                page.wait_for_timeout(400)
                a, b = state(page), state(wing)
                assert a["network"]["peers"] >= 1 and b["network"]["peers"] >= 1, [
                    a["network"],
                    b["network"],
                ]
                assert a["network"]["sent"] > 2 and b["network"]["received"] > 2
            with check("Standalone direct WebRTC invitation and answer"):
                page.evaluate("__solar.disconnect();__solar.title()")
                wing.evaluate("__solar.disconnect();__solar.title()")
                offer = page.evaluate("__solar.rtc(true)")
                answer = wing.evaluate("code=>__solar.rtc(false,code)", offer)
                page.evaluate("code=>__solar.answer(code)", answer)
                page.wait_for_function("__solar.state().network.peers>0", timeout=20000)
                wing.wait_for_function("__solar.state().network.peers>0", timeout=20000)
                page.evaluate("__solar.launch()")
                wing.wait_for_function(
                    "__solar.state().mode==='playing'", timeout=15000
                )
            if "wing" in locals():
                wing.close()
            page.evaluate("__solar.disconnect();__solar.title()")
            extra_checks(page, context, url)
            page.close()
            with check("Touch device launch, assisted firing and invisible stick"):
                mobile = browser.new_context(
                    viewport={"width": 844, "height": 390},
                    has_touch=True,
                    is_mobile=True,
                    device_scale_factor=1,
                )
                touch = mobile.new_page()
                ready(touch, url)
                touch.locator("[data-action=new]").tap()
                touch.wait_for_function(
                    "__solar.state().mode==='playing'", timeout=20000
                )
                assert touch.locator("body.touch").count() == 1
                assert touch.locator("#touch-menu").is_visible()
                touch.evaluate(
                    """() => {let c=document.querySelector('#universe');c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:7,pointerType:'touch',clientX:240,clientY:230}));c.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:7,pointerType:'touch',clientX:320,clientY:180}));}"""
                )
                touch.wait_for_timeout(500)
                s = state(touch)
                assert s["x"] > 1 and s["metrics"]["shots"] > 0, s
                if VISUAL:
                    touch.screenshot(path=str(DEV / "artifacts/touch.png"))
                mobile.close()
            hub_checks(context, base)
            with check("No uncaught game errors"):
                assert not browser_errors, browser_errors
            browser.close()
    finally:
        server.shutdown()
        report = {
            "passed": sum(r["passed"] for r in RESULTS),
            "failed": len(FAILURES),
            "checks": RESULTS,
            "campaign": campaign,
        }
        (
            DEV
            / (
                "artifacts/visual-report.json"
                if VISUAL_ONLY
                else "artifacts/test-report.json"
            )
        ).write_text(json.dumps(report, indent=2))
        for failure in FAILURES:
            print("FAIL " + failure)
        print(
            f"{len(RESULTS)} checks: {report['passed']} passed, {report['failed']} failed"
        )


if __name__ == "__main__":
    main()
    sys.exit(bool(FAILURES))
