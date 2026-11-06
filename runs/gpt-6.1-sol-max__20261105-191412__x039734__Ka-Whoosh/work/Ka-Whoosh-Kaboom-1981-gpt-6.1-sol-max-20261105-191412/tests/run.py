"""Run from the game folder: npm test. Only failures and a final count are printed."""

import contextlib
import json
import pathlib
import re
import subprocess
import sys
import urllib.parse

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
GAME = ROOT.parent / "Ka-Whoosh-Kaboom-1981-gpt-6.1-sol-max-20261105-191412.html"
ART = ROOT / "tests" / "artifacts"
ART.mkdir(exist_ok=True)
results = []
issues = []


def check(name, fn):
    try:
        out = fn()
        if out is False:
            raise AssertionError("returned false")
        results.append({"name": name, "pass": True, "detail": out})
        (ART / "progress.json").write_text(json.dumps(results, indent=2, default=str))
    except Exception as exc:  # noqa: BLE001 - Aggregate test failures into one report.
        detail = str(exc)
        print(f"FAIL {name}: {detail}", flush=True)
        results.append({"name": name, "pass": False, "detail": detail})
        issues.append(name)
        (ART / "progress.json").write_text(json.dumps(results, indent=2, default=str))


def expect(value, message):
    if not value:
        raise AssertionError(message)
    return True


@contextlib.contextmanager
def static_server():
    log = (ART / "server.log").open("w")
    proc = subprocess.Popen(
        [
            sys.executable,
            "-u",
            "-m",
            "http.server",
            "0",
            "--bind",
            "127.0.0.1",
            "--directory",
            str(ROOT.parent),
        ],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=log,
        text=True,
    )
    try:
        line = proc.stdout.readline()
        match = re.search(r"port (\d+)", line)
        if not match:
            raise RuntimeError("Static server did not announce its OS-assigned port")
        yield "http://127.0.0.1:" + match.group(1)
    finally:
        proc.terminate()
        proc.wait(timeout=5)
        log.close()


with static_server() as base, sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=[
            "--enable-unsafe-webgpu",
            "--enable-features=Vulkan",
            "--use-webgpu-adapter=swiftshader",
            "--use-angle=swiftshader",
            "--no-sandbox",
            "--autoplay-policy=no-user-gesture-required",
        ],
    )
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    context.add_init_script("""window.__testPad=null;
      Object.defineProperty(navigator,'getGamepads',{value:()=>window.__testPad?[window.__testPad]:[]});""")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(e.stack))
    page.goto(
        GAME.as_uri() + ("?renderer=webgl" if "--metadata" in sys.argv else ""),
        wait_until="load",
        timeout=120000,
    )
    page.wait_for_function("window.__gameReady || window.__gameError", timeout=120000)
    check(
        "engine initialization",
        lambda: expect(
            page.evaluate("!!window.__gameReady"),
            page.evaluate('window.__gameError||"not ready"'),
        ),
    )
    if page.evaluate("!!window.__gameReady"):
        if "--metadata" in sys.argv:
            info = json.loads((ROOT.parent / "exit-interview.json").read_text())
            check(
                "exit interview matches embedded credits",
                lambda: expect(
                    page.evaluate("__KA_WHOOSH__.info") == info,
                    "Embedded metadata differs from exit-interview.json",
                ),
            )
            check(
                "exit interview exact schema and feedback lengths",
                lambda: expect(
                    set(info)
                    == {
                        "sourceInformation",
                        "testingFeedback",
                        "engineFeedback",
                        "promptFeedback",
                        "aiHub",
                    }
                    and len(info["testingFeedback"]) == 4
                    and len(info["engineFeedback"]) == 6
                    and len(info["promptFeedback"]) == 4
                    and info["sourceInformation"]["usage"] == "added on import"
                    and 3 <= len(info["aiHub"]["tags"]) <= 6,
                    "Exit interview schema mismatch",
                ),
            )
            for tab in ["source", "testing", "engine", "prompt"]:
                page.evaluate(
                    "(tab)=>{__KA_WHOOSH__.app.aboutTab=tab;__KA_WHOOSH__.app.showAbout()}",
                    tab,
                )
                body = page.locator(".about-body").text_content()
                values = (
                    list(info["sourceInformation"].values())
                    if tab == "source"
                    else info[tab + "Feedback"]
                )
                check(
                    "About contains complete " + tab + " feedback",
                    lambda values=values, body=body: expect(
                        all(v in body for v in values), "Missing About text"
                    ),
                )
            page.evaluate(
                "__KA_WHOOSH__.app.aboutTab='source';__KA_WHOOSH__.app.showAbout()"
            )
            page.screenshot(path=str(ART / "about-final.png"))
            page.set_viewport_size({"width": 390, "height": 844})
            page.evaluate(
                "__KA_WHOOSH__.app.start('solo');__KA_WHOOSH__.app.input.device('touch')"
            )
            page.wait_for_timeout(400)
            page.screenshot(path=str(ART / "touch-final.png"))
            (ART / "metadata-results.json").write_text(
                json.dumps(results, indent=2, default=str)
            )
            context.close()
            browser.close()
            print(
                f"{len(results) - len(issues)}/{len(results)} checks passed; {len(issues)} failures."
            )
            sys.exit(1 if issues else 0)
        if "--diagnostic" in sys.argv:
            samples = []
            for label, action in [
                ("initial", ""),
                ("solo", "__KA_WHOOSH__.app.start('solo')"),
                ("title", "__KA_WHOOSH__.app.showTitle()"),
                ("coop", "__KA_WHOOSH__.app.start('coop')"),
            ]:
                if action:
                    page.evaluate(action)
                page.wait_for_timeout(2500)
                samples.append(
                    {
                        "stage": label,
                        "errors": errors[:3],
                        "state": page.evaluate(
                            "({backend:__KA_WHOOSH__.stage.backend,draws:__KA_WHOOSH__.stage.renderer.info.render.drawCalls,lastFrame:__KA_WHOOSH__.app.lastFrame,time:__KA_WHOOSH__.stage.time,recovering:__KA_WHOOSH__.stage.recovering,disposed:__KA_WHOOSH__.stage.disposed,lost:__KA_WHOOSH__.stage.renderer._isDeviceLost,frame:__KA_WHOOSH__.stage.renderer.info.frame,callback:!!__KA_WHOOSH__.stage.renderer._animation._animationLoop})"
                        ),
                    }
                )
            (ART / "diagnostic.json").write_text(json.dumps(samples, indent=2))
            check(
                "render lifecycle diagnostic",
                lambda: expect(not errors, "\n".join(dict.fromkeys(errors))[:6000]),
            )
            context.close()
            browser.close()
            print(
                f"{len(results) - len(issues)}/{len(results)} checks passed; {len(issues)} failures."
            )
            sys.exit(1 if issues else 0)
        check(
            "WebGPU and pinned Rapier",
            lambda: page.evaluate(
                "__KA_WHOOSH__.stage.initialBackend==='WebGPU' && __KA_WHOOSH__.game.version==='0.19.3'"
            ),
        )
        check(
            "self-contained fonts",
            lambda: page.evaluate(
                "document.fonts.check('900 24px Display')&&document.fonts.check('400 20px Body')"
            ),
        )

        def gpu_submissions():
            page.wait_for_function(
                "__KA_WHOOSH__.stage.webgpuDrawCalls>100", timeout=10000
            )
            return page.evaluate(
                """()=>{const s=__KA_WHOOSH__.stage;return s.initialBackend==='WebGPU'&&s.webgpuDrawCalls>100;}"""
            )

        check("WebGPU submits the scene", gpu_submissions)
        check(
            "loading overlay hidden and fonts registered",
            lambda: page.evaluate(
                """()=>getComputedStyle(document.getElementById('loading')).display==='none'&&[...document.fonts].some(f=>f.family==='Display'&&f.status==='loaded')"""
            ),
        )
        page.screenshot(path=str(ART / "title.png"))
        check(
            "keyboard starts solo",
            lambda: (
                page.keyboard.press("Enter"),
                expect(
                    page.evaluate(
                        "__KA_WHOOSH__.game.phase==='intro'&&__KA_WHOOSH__.app.screen===null"
                    ),
                    "Enter did not start",
                ),
            )[-1],
        )

        def movement():
            page.keyboard.down("KeyD")
            page.wait_for_function("__KA_WHOOSH__.game.players[0].x>1", timeout=10000)
            page.keyboard.up("KeyD")
            return expect(
                page.evaluate("__KA_WHOOSH__.game.players[0].x>1"),
                "Keyboard did not move tubs",
            )

        check("keyboard movement", movement)
        check(
            "physics catches and scoring",
            lambda: page.evaluate(
                """()=>{const t=__KA_WHOOSH__;t.game.effects=false;t.game.start({seed:1981});const s=t.advance(22,{auto:true});return s.stats.caught>=10&&s.score>0&&s.players[0].buckets>0;}"""
            ),
        )
        page.screenshot(path=str(ART / "gameplay.png"))

        def full_shift():
            state = page.evaluate(
                """()=>{const t=__KA_WHOOSH__;t.game.start({seed:1981});return t.advance(240,{auto:true});}"""
            )
            (ART / "full-shift.json").write_text(json.dumps(state, indent=2))
            return expect(
                state["phase"] == "won"
                and state["stats"]["stages"] == 6
                and state["stats"]["gold"] > 0
                and state["stats"]["caught"] > 150,
                json.dumps(state),
            )

        check("complete six-shift physics playthrough", full_shift)
        check(
            "results show all six shifts",
            lambda: page.locator("#screen").inner_text().find("6/6") >= 0,
        )

        def douse():
            return page.evaluate(
                """()=>{const t=__KA_WHOOSH__,g=t.game;g.start({seed:12});g.phase='playing';g.spawn('normal',0,8);g.spawn('normal',1,7);const before=g.score;let a=g.douse();return a&&g.bombs.length===0&&g.charge===0&&g.stats.doused===2&&g.score>before&&!g.douse();}"""
            )

        check("douse clears bombs and consumes meter", douse)

        def losses():
            return page.evaluate(
                """()=>{const t=__KA_WHOOSH__,g=t.game;g.start({seed:42});g.phase='playing';for(let i=0;i<3;i++){g.grace=0;let b=g.spawn('normal',8,.6);g.miss(b);}return g.phase==='lost'&&g.players[0].buckets===0&&g.stats.misses===3;}"""
            )

        check("three misses end the shift", losses)

        def perfect_and_gold():
            return page.evaluate(
                """()=>{const t=__KA_WHOOSH__,g=t.game;g.start({seed:12});g.charge=0;const normal=g.spawn('normal',0,3);g.catch(normal,0);const normalScore=g.score;const gold=g.spawn('gold',0,3);g.catch(gold,0);return normalScore===20&&g.score===80&&g.stats.perfect===2&&g.stats.gold===1&&g.charge===35;}"""
            )

        check("perfect and gold bonuses", perfect_and_gold)

        def coop():
            return page.evaluate(
                """()=>{const t=__KA_WHOOSH__,g=t.game;g.start({mode:'coop',seed:1981});g.phase='playing';g.spawn('normal',-3,4);g.spawn('normal',3,4);const s=t.advance(.7);return s.stats.caught===2&&s.players.length===2&&s.players.every(p=>p.buckets===3);}"""
            )

        check("couch co-op sensor catches", coop)

        def restored():
            return page.evaluate(
                """()=>{const g=__KA_WHOOSH__.game;g.start({seed:8});g.players[0].buckets=1;g.charge=0;g.restore();return g.players[0].buckets===2&&g.charge===25;}"""
            )

        check("shift clear restores a tub and charge", restored)

        def deterministic():
            return page.evaluate(
                """()=>{const t=__KA_WHOOSH__,g=t.game;g.start({seed:88});const a=t.advance(10,{auto:true});g.start({seed:88});const b=t.advance(10,{auto:true});return a.score===b.score&&a.spawned===b.spawned&&a.players[0].x===b.players[0].x;}"""
            )

        check("identical-seed delivery stream", deterministic)
        check(
            "gold miss preserves tubs",
            lambda: page.evaluate(
                """()=>{const g=__KA_WHOOSH__.game;g.start({seed:12});let b=g.spawn('gold',8,.6);g.miss(b);return g.players[0].buckets===3&&g.stats.misses===0;}"""
            ),
        )

        def pause_dev():
            page.evaluate("__KA_WHOOSH__.app.start('solo')")
            page.keyboard.press("Escape")
            before = page.evaluate("__KA_WHOOSH__.game.clock")
            page.wait_for_timeout(250)
            expect(
                abs(page.evaluate("__KA_WHOOSH__.game.clock") - before) < 0.001,
                "Paused simulation advanced",
            )
            page.locator('[data-action="dev"]').click()
            page.locator('[data-action="dev-tab:tuning"]').click()
            page.locator("#tune-width").fill("2.5")
            expect(
                page.evaluate(
                    "__KA_WHOOSH__.game.tune.width===2.5&&__KA_WHOOSH__.game.unranked"
                ),
                "Slider not live",
            )
            page.locator('[data-action="dev:reset"]').click()
            return expect(
                page.evaluate("__KA_WHOOSH__.game.tune.width===1.85"),
                "Defaults not restored",
            )

        check("pause and live developer tuning", pause_dev)

        def settings():
            page.evaluate("__KA_WHOOSH__.app.showTitle()")
            page.locator('[data-action="settings"]').click()
            expect(
                page.evaluate(
                    "__KA_WHOOSH__.settings===undefined && __KA_WHOOSH__.sound.musicVolume===.1"
                ),
                "Music default is not 10%",
            )
            page.locator('[data-action="glyphs"]').click()
            return expect(
                page.locator('[data-action="glyphs"]').inner_text() == "Xbox",
                "Glyph switch failed",
            )

        check("music defaults and glyph setting", settings)

        def readable_credits():
            page.evaluate(
                "__KA_WHOOSH__.app.aboutTab='source';__KA_WHOOSH__.app.showAbout();document.querySelector('.about-body').focus();__KA_WHOOSH__.app.input.navigate(1)"
            )
            return expect(
                page.evaluate("document.querySelector('.about-body').scrollTop>0"),
                "Controller navigation did not scroll source info",
            )

        check("controller-readable source information", readable_credits)

        def gamepad():
            page.evaluate(
                """()=>{__KA_WHOOSH__.app.showTitle();window.__testPad={id:'Test standard pad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};__testPad.buttons[0]={pressed:true,value:1};}"""
            )
            page.wait_for_function(
                "__KA_WHOOSH__.app.screen===null&&__KA_WHOOSH__.game.phase==='intro'",
                timeout=10000,
            )
            page.evaluate(
                "__testPad.buttons[0]={pressed:false,value:0};__testPad.axes[0]=1"
            )
            page.wait_for_function("__KA_WHOOSH__.game.players[0].x>1", timeout=10000)
            expect(
                page.evaluate("__KA_WHOOSH__.game.players[0].x>1"),
                "Pad stick did not move",
            )
            expect(
                page.evaluate("__KA_WHOOSH__.app.input.last==='pad'"),
                "Pad glyph source missing",
            )
            page.evaluate(
                "__testPad.axes[0]=0;__testPad.buttons[9]={pressed:true,value:1}"
            )
            page.wait_for_function("__KA_WHOOSH__.app.screen==='pause'", timeout=10000)
            expect(
                page.evaluate("__KA_WHOOSH__.app.screen==='pause'"),
                "Options did not pause",
            )
            page.evaluate("window.__testPad=null")
            return True

        check("emulated standard gamepad controls", gamepad)

        def attract():
            page.evaluate(
                "__KA_WHOOSH__.app.showTitle();__KA_WHOOSH__.app.lastActivity=performance.now()-10050"
            )
            page.wait_for_function("__KA_WHOOSH__.app.attract", timeout=5000)
            expect(
                page.evaluate("__KA_WHOOSH__.game.attract"), "Attract not AI controlled"
            )
            page.keyboard.press("Space")
            return expect(
                page.evaluate(
                    "!__KA_WHOOSH__.app.attract&&__KA_WHOOSH__.app.screen==='title'"
                ),
                "Input did not exit attract",
            )

        check("ten-second attract and input exit", attract)

        def audio():
            page.locator('[data-action="solo"]').click()
            value = page.evaluate(
                """async()=>{const s=__KA_WHOOSH__.sound;await s.unlock();s.play('douse');s.babble(true);s.tone(660,3,.18);let peak=0;for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,20));peak=Math.max(peak,s.level());}return {peak,state:s.ctx.state};}"""
            )
            return expect(
                value["peak"] > 0.0001 and value["state"] == "running",
                json.dumps(value),
            )

        check("synthesized audio produces signal", audio)
        check(
            "renderer recovery preserves simulation",
            lambda: page.evaluate(
                """async()=>{const t=__KA_WHOOSH__,seed=t.game.seed,phase=t.game.phase;await t.stage.useCompatibility();return t.stage.backend==='WebGL 2 compatibility'&&t.game.seed===seed&&t.game.phase===phase&&!!t.stage.loop;}"""
            ),
        )
        check(
            "no uncaught browser errors",
            lambda: expect(not errors, "; ".join(dict.fromkeys(errors))[:3000]),
        )
    context.close()
    browser.close()
    browser = p.chromium.launch(
        headless=True,
        args=[
            "--enable-unsafe-webgpu",
            "--enable-features=Vulkan",
            "--use-webgpu-adapter=swiftshader",
            "--use-angle=swiftshader",
            "--no-sandbox",
            "--autoplay-policy=no-user-gesture-required",
        ],
    )

    # Real touch events on a landscape phone profile; no physical touch hardware needed.
    touch_context = browser.new_context(
        viewport={"width": 844, "height": 390},
        device_scale_factor=1,
        is_mobile=True,
        has_touch=True,
    )
    touch = touch_context.new_page()
    touch.goto(GAME.as_uri(), wait_until="load", timeout=120000)
    touch.wait_for_function("window.__gameReady||window.__gameError", timeout=120000)

    def touch_controls():
        touch.locator('[data-action="solo"]').tap()
        cdp = touch_context.new_cdp_session(touch)
        cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchStart", "touchPoints": [{"x": 530, "y": 220, "id": 1}]},
        )
        touch.wait_for_function("__KA_WHOOSH__.game.players[0].x>0", timeout=10000)
        expect(
            touch.evaluate(
                "__KA_WHOOSH__.game.players[0].x>0&&__KA_WHOOSH__.game.assist"
            ),
            "Touch did not move or assist",
        )
        cdp.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchStart",
                "touchPoints": [
                    {"x": 530, "y": 220, "id": 1},
                    {"x": 650, "y": 220, "id": 2},
                ],
            },
        )
        touch.wait_for_timeout(80)
        expect(
            touch.evaluate("__KA_WHOOSH__.game.stats.douses===1"),
            "Second touch did not douse",
        )
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        return True

    check("touch drag, assist and second-finger douse", touch_controls)

    def touch_menu():
        touch.locator("#pause-button").tap()
        expect(
            touch.evaluate("__KA_WHOOSH__.app.screen==='pause'"),
            "Touch menu not opened",
        )
        touch.locator('[data-action="resume"]').tap()
        return expect(
            touch.evaluate("__KA_WHOOSH__.app.screen===null"),
            "Touch menu did not resume",
        )

    check("touch pause and resume", touch_menu)
    touch_context.close()
    browser.close()
    browser = p.chromium.launch(
        headless=True,
        args=[
            "--enable-unsafe-webgpu",
            "--enable-features=Vulkan",
            "--use-webgpu-adapter=swiftshader",
            "--use-angle=swiftshader",
            "--no-sandbox",
            "--autoplay-policy=no-user-gesture-required",
        ],
    )

    # Standalone online mode uses an actual peer data channel between two pages.
    rtc_context = browser.new_context(viewport={"width": 1000, "height": 700})
    host = rtc_context.new_page()
    guest = rtc_context.new_page()
    for rp in [host, guest]:
        rp.goto(
            base + "/" + GAME.name + "?renderer=webgl",
            wait_until="load",
            timeout=120000,
        )
        rp.wait_for_function("window.__gameReady||window.__gameError", timeout=120000)
        expect(
            rp.title().startswith("Ka-Whoosh!"), "Static server returned another game"
        )
        rp.evaluate("__KA_WHOOSH__.app.showOnline()")

    def rtc_pair():
        host.evaluate(
            "if(__KA_WHOOSH__.app.attract)__KA_WHOOSH__.app.exitAttract();__KA_WHOOSH__.app.activity();__KA_WHOOSH__.app.showOnline()"
        )
        host.locator('[data-action="create-invite"]').click()
        host.wait_for_function(
            'document.getElementById("outgoing-code").value.startsWith("WHOOSH1.")',
            timeout=15000,
        )
        offer = host.locator("#outgoing-code").input_value()
        guest.evaluate(
            "if(__KA_WHOOSH__.app.attract)__KA_WHOOSH__.app.exitAttract();__KA_WHOOSH__.app.activity();__KA_WHOOSH__.app.showOnline()"
        )
        guest.locator("#incoming-code").fill(offer)
        guest.locator('[data-action="accept-code"]').click()
        guest.wait_for_function(
            'document.getElementById("outgoing-code").value.startsWith("WHOOSH1.")',
            timeout=15000,
        )
        reply = guest.locator("#outgoing-code").input_value()
        host.evaluate("__KA_WHOOSH__.app.activity()")
        host.locator("#incoming-code").fill(reply)
        host.locator('[data-action="accept-code"]').click()
        host.wait_for_function("__KA_WHOOSH__.network.connected", timeout=15000)
        guest.wait_for_function("__KA_WHOOSH__.network.connected", timeout=15000)
        return True

    check("standalone WebRTC invite and reply UI", rtc_pair)

    def rtc_race():
        host.locator('[data-action="race-start"]').click()
        host.wait_for_function("__KA_WHOOSH__.network.roundActive", timeout=10000)
        guest.wait_for_function("__KA_WHOOSH__.network.roundActive", timeout=10000)
        expect(
            host.evaluate("__KA_WHOOSH__.game.seed")
            == guest.evaluate("__KA_WHOOSH__.game.seed"),
            "Rivals had different seeds",
        )
        host.wait_for_function("__KA_WHOOSH__.network.peers.size===1", timeout=5000)
        guest.wait_for_function("__KA_WHOOSH__.network.peers.size===1", timeout=5000)
        return expect(
            host.evaluate("__KA_WHOOSH__.stage.ghosts.size===1")
            and guest.evaluate("__KA_WHOOSH__.stage.ghosts.size===1"),
            "Rival tubs not visible",
        )

    check("standalone synchronized race and ghosts", rtc_race)

    def rtc_results():
        host.evaluate("__KA_WHOOSH__.game.score=1200;__KA_WHOOSH__.game.finish(false)")
        guest.evaluate("__KA_WHOOSH__.game.score=900;__KA_WHOOSH__.game.finish(false)")
        host.wait_for_function(
            "__KA_WHOOSH__.network.rivalResult?.score===900", timeout=5000
        )
        guest.wait_for_function(
            "__KA_WHOOSH__.network.rivalResult?.score===1200", timeout=5000
        )
        host.evaluate(
            "__KA_WHOOSH__.app.settings.difficulty='chill';__KA_WHOOSH__.app.applySettings()"
        )
        expect(
            host.evaluate("__KA_WHOOSH__.game.difficulty==='arcade'"),
            "Online race difficulty changed",
        )
        return expect(
            "rooftop crown" in host.locator("#screen").inner_text(),
            "Remote result not shown",
        )

    check("standalone race results round trip", rtc_results)

    def rtc_close():
        host.locator('[data-action="leave-online"]').click()
        return expect(
            host.evaluate(
                "__KA_WHOOSH__.network.pc===null&&!__KA_WHOOSH__.network.active"
            ),
            "Peer connection leaked",
        )

    check("standalone disconnect cleans up", rtc_close)
    rtc_context.close()

    browser.close()

    # The requested, unmodified AI Hub harness performs its full protocol checks.
    for players, scenario, network in [
        (2, "standard", False),
        (4, "standard", True),
        (4, "host-leave", True),
    ]:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--use-angle=swiftshader",
                "--no-sandbox",
            ],
        )
        hc = browser.new_context(viewport={"width": 1280, "height": 900})
        hp = hc.new_page()

        def hub_check(players=players, scenario=scenario, network=network, hp=hp):
            params = {
                "game": "../" + GAME.name,
                "players": str(players),
                "scenario": scenario,
                "auto": "1",
                "play": "4000",
            }
            if network:
                params.update(latency="150", jitter="50", loss="5")
            url = (
                base
                + "/"
                + ROOT.name
                + "/harness.html?"
                + urllib.parse.urlencode(params)
            )
            hp.goto(url, wait_until="load", timeout=120000)
            hp.wait_for_function(
                'document.body.dataset.complete==="true"', timeout=90000
            )
            report = hp.evaluate("window.__hubCheck")
            (ART / f"hub-{players}-{scenario}.json").write_text(
                json.dumps(report, indent=2)
            )
            return expect(
                report["pass"],
                json.dumps([c for c in report["checks"] if not c["pass"]]),
            )

        check(
            f"AI Hub {players} players / {scenario}"
            + (" / 150ms, jitter, 5% loss" if network else ""),
            hub_check,
        )
        hc.close()
        browser.close()

    # Compatibility backend screenshots are for art/layout review; WebGPU is tested above.
    browser = p.chromium.launch(
        headless=True, args=["--no-sandbox", "--use-angle=swiftshader"]
    )
    vc = browser.new_context(viewport={"width": 1920, "height": 1080})
    vp = vc.new_page()
    vp.goto(GAME.as_uri() + "?renderer=webgl", wait_until="load", timeout=120000)
    vp.wait_for_function("window.__gameReady||window.__gameError", timeout=120000)
    vp.wait_for_timeout(700)
    vp.screenshot(path=str(ART / "title-tv.png"))

    def compatibility():
        expect(
            vp.evaluate("__KA_WHOOSH__.stage.backend==='WebGL 2 compatibility'"),
            "Wrong compatibility backend",
        )
        vp.evaluate(
            """()=>{const t=__KA_WHOOSH__;t.app.start('solo');t.game.effects=true;t.game.auto=true;t.game.jumpWave(4);t.game.phase='playing';t.app.hideAnnounce();t.game.bomberX=3.1;t.game.players[0].x=-2;for(const [x,y,k]of [[3.1,9.6,'normal'],[1.7,7.2,'gold'],[-.6,5.2,'rush'],[-2,3.8,'normal']])t.game.spawn(k,x,y);t.stage.burst(-2,3.2,'water',50);}"""
        )
        vp.wait_for_timeout(350)
        vp.screenshot(path=str(ART / "gameplay-tv.png"))
        return vp.evaluate(
            "async()=>{const r=await __KA_WHOOSH__.stage.verifyFrame();return r.colors>30;}"
        )

    check("WebGL compatibility rendering", compatibility)
    vp.evaluate("__KA_WHOOSH__.app.pause()")
    vp.screenshot(path=str(ART / "pause-tv.png"))
    vp.evaluate("__KA_WHOOSH__.app.showAbout()")
    vp.screenshot(path=str(ART / "about-tv.png"))
    vc.close()
    browser.close()

    # WebKit is a useful stand-in for Safari, with the WebGL compatibility backend.
    wb = p.webkit.launch(headless=True)
    wc = wb.new_context(
        viewport={"width": 390, "height": 844},
        is_mobile=True,
        has_touch=True,
        device_scale_factor=1,
    )
    wp = wc.new_page()

    def webkit():
        wp.goto(GAME.as_uri(), wait_until="load", timeout=120000)
        wp.wait_for_function("window.__gameReady||window.__gameError", timeout=120000)
        return expect(
            wp.evaluate("!!window.__gameReady"),
            wp.evaluate('window.__gameError||"WebKit not ready"'),
        )

    check("WebKit portrait compatibility", webkit)
    if wp.evaluate("!!window.__gameReady"):
        wp.wait_for_timeout(600)
        wp.screenshot(path=str(ART / "title-portrait.png"))

        def portrait():
            wp.locator('[data-action="solo"]').tap()
            wp.wait_for_timeout(150)
            return expect(
                wp.evaluate("__KA_WHOOSH__.app.screen===null"),
                "Portrait touch could not start",
            )

        check("portrait touch menu", portrait)
        wp.wait_for_timeout(1000)
        wp.screenshot(path=str(ART / "gameplay-portrait.png"))
    wc.close()
    wb.close()
    check(
        "exit interview parses with exact schema",
        lambda: expect(
            set(json.loads((ROOT.parent / "exit-interview.json").read_text()))
            == {
                "sourceInformation",
                "testingFeedback",
                "engineFeedback",
                "promptFeedback",
                "aiHub",
            },
            "Exit interview schema mismatch",
        ),
    )

(ART / "results.json").write_text(json.dumps(results, indent=2, default=str))
print(
    f"{len(results) - len(issues)}/{len(results)} checks passed; {len(issues)} failures.",
    flush=True,
)
sys.exit(1 if issues else 0)
