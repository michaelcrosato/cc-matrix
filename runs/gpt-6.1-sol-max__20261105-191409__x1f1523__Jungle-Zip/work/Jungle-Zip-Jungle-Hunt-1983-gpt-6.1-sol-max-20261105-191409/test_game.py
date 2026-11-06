import argparse
import functools
import http.server
import json
import shlex
import threading
import traceback
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parent
ROOT = DEV.parent
GAME = ROOT / (DEV.name + ".html")
P = argparse.ArgumentParser()
P.add_argument("--screenshots", action="store_true")
P.add_argument("--quick", action="store_true")
P.add_argument("--gpu-only", action="store_true")
P.add_argument("--gpu-flags", default="")
P.add_argument("--headed", action="store_true")
ARGS = P.parse_args()
checks = []
errors = []
console_messages = []


def check(name, condition, detail=""):
    checks.append({"name": name, "pass": bool(condition), "detail": detail})
    if not condition:
        print("FAIL " + name + (": " + str(detail) if detail else ""), flush=True)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = http.server.ThreadingHTTPServer(
    ("127.0.0.1", 0), functools.partial(QuietHandler, directory=ROOT)
)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
BASE = f"http://127.0.0.1:{server.server_port}"


def boot(page, url):
    page.goto(url, wait_until="domcontentloaded")
    page.wait_for_function("window.__gameReady || window.__gameError", timeout=90000)
    err = page.evaluate("window.__gameError || null")
    if err:
        raise RuntimeError(err)
    page.wait_for_timeout(250)
    return page.evaluate("__jungleZip.snapshot()")


def js(page, source):
    return page.evaluate(source)


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=not ARGS.headed,
            args=shlex.split(ARGS.gpu_flags)
            if ARGS.gpu_flags
            else [
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--disable-vulkan-surface",
                "--use-angle=swiftshader",
                "--use-webgpu-adapter=swiftshader",
                "--disable-dev-shm-usage",
                "--no-sandbox",
            ],
        )
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        context.add_init_script("""
          window.__testPad=null;
          navigator.getGamepads=()=>window.__testPad?[window.__testPad]:[];
        """)
        page = context.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: console_messages.append(m.type + ": " + m.text))
        page.goto(BASE + "/" + DEV.name + "/gpu-probe.html")
        page.wait_for_function("window.probe?.done", timeout=15000)
        native = js(page, "window.probe")
        check(
            "Native WebGPU remains usable",
            not native.get("lost") and not native.get("error"),
            native,
        )
        check(
            "WebGL fallback context is available", native.get("webgl") is True, native
        )
        if ARGS.gpu_only:
            context.close()
            browser.close()
            raise SystemExit()
        state = boot(page, GAME.as_uri())
        check(
            "Single-file boot",
            state["title"] == "Jungle Zip" and state["mode"] == "title",
            state,
        )
        check("WebGPU renderer", state["renderer"] == "WebGPU", state["renderer"])
        check(
            "Music defaults to ten percent",
            abs(state["music"] - 0.1) < 0.001,
            state["music"],
        )
        check("Title actions", page.locator("#panel button").count() == 6)
        pixels = js(
            page,
            "async () => {const g=__jungleZip;g.testing=true;try{return await g.scene.renderProbe()}catch(e){return {colors:0,min:0,max:0,error:String(e),deviceLost:g.scene.renderer._isDeviceLost,render:g.scene.renderer.info.render}}}",
        )
        check(
            "WebGPU shaders produce a varied rendered frame",
            pixels["colors"] > 25 and pixels["max"] - pixels["min"] > 100,
            {"pixels": pixels, "console": console_messages[:30]},
        )
        if ARGS.screenshots:
            page.screenshot(path=str(DEV / "title-webgpu.png"))
        js(
            page,
            """() => { const g=__jungleZip;g.testing=true;g.start();g.autopilot=true;g.god=true; }""",
        )
        timeline = []
        for i in range(150):
            state = js(page, "__jungleZip.advance(120)")
            if i == 0 or not timeline or timeline[-1]["stage"] != state["stage"]:
                timeline.append(state)
            if state["mode"] in ["win", "lose"]:
                break
        check("Scripted full expedition", state["mode"] == "win", state)
        check(
            "All four acts visited",
            sorted(set(state["events"]["stages"])) == [0, 1, 2, 3],
            timeline,
        )
        check(
            "Vine transfers exercised", state["events"]["grabs"] >= 5, state["events"]
        )
        check(
            "Rescue completed",
            state["events"]["rescued"] and state["rescue"] >= 1,
            state,
        )
        looping = js(
            page, "() => {__jungleZip.attract=true;return __jungleZip.advance(300);}"
        )
        check(
            "Attract expedition loops after its rescue",
            looping["stage"] == 0
            and looping["mode"] == "play"
            and js(page, "__jungleZip.attract"),
            looping,
        )
        js(
            page,
            """() => {const g=__jungleZip;g.title();g.testing=false;window.__testPad={connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};window.__testPad.buttons[0]={pressed:true,value:1};}""",
        )
        page.wait_for_timeout(350)
        check(
            "Quick controller start",
            js(page, '__jungleZip.mode==="play"'),
            js(
                page,
                "({state:__jungleZip.snapshot(),testing:__jungleZip.testing,pad:__jungleZip.padPrev,focus:document.activeElement?.outerHTML?.slice(0,250),gp:navigator.getGamepads()})",
            ),
        )
        js(
            page,
            "__testPad=null;__jungleZip.pollPad();__jungleZip.testing=true;__jungleZip.start();__jungleZip.autopilot=true;__jungleZip.god=false",
        )
        route = []
        for i in range(150):
            route_state = js(page, "__jungleZip.advance(60)")
            route.append(route_state)
            if route_state["mode"] in ["win", "lose"]:
                break
        (DEV / "normal-route.json").write_text(json.dumps(route, indent=2))
        check(
            "Scripted route finishes with normal lives",
            route_state["mode"] == "win",
            route_state,
        )
        check(
            "Controller disconnect clears held buttons",
            js(page, "__jungleZip.padPrev.length===0"),
        )
        check(
            "Normal route exercises breathing, ducking, jumping and stuns",
            route_state["events"]["breaths"] > 0
            and route_state["events"]["ducks"] > 0
            and route_state["events"]["jumps"] > 10
            and route_state["events"]["stuns"] > 0,
            route_state["events"],
        )
        if not ARGS.quick:
            bounce = js(
                page,
                "() => {const g=__jungleZip;g.start();g.loadStage(2);g.god=true;const e=g.scene.enemies.find(e=>e.big);let up=false;let high=0;for(let i=0;i<240;i++){g.advance(1,{x:0});up ||= e.body.linvel().y>4;high=Math.max(high,e.body.translation().y);}g.health=3;g.completeStage();return {up,high,health:g.health};}",
            )
            check(
                "Large Rapier boulders retain a real bounce",
                bounce["up"] and bounce["high"] > 2.8,
                bounce,
            )
            check("Act clear restores one life", bounce["health"] == 4, bounce)
            js(
                page,
                """() => {const g=__jungleZip;g.start();g.loadStage(1);g.god=false;g.invincible=0;g.air=.05;g.setBody(5,0);g.advance(2,{x:0});}""",
            )
            s = js(page, "__jungleZip.snapshot()")
            check(
                "Oxygen depletion costs one life",
                s["health"] == 4 and s["events"]["hits"] == 1,
                s,
            )
            s = js(
                page,
                """() => {const g=__jungleZip;g.air=20;g.wasSurface=false;g.setBody(5,6);return g.advance(100,{x:0});}""",
            )
            check(
                "Surface refills air",
                s["air"] == 100 and s["events"]["breaths"] >= 1,
                s,
            )
            s = js(
                page,
                """() => {const g=__jungleZip;g.start();g.loadStage(1);g.invincible=0;const e=g.scene.enemies[0];const p=e.body.translation();g.setBody(p.x,p.y);return g.advance(2,{x:0});}""",
            )
            check("Rapier crocodile overlap causes damage", s["health"] == 4, s)
            result = js(
                page,
                """() => {const g=__jungleZip;g.loadStage(1);const e=g.scene.enemies[0],p=e.body.translation();g.setBody(p.x+2,p.y);g.face=-1;e.open=true;g.swat();const a=e.stun;e.open=false;g.swat();return {open:a,closed:e.stun,stuns:g.events.stuns};}""",
            )
            check(
                "Open jaws resist swats; closed jaws stun",
                result["open"] == 0 and result["closed"] > 0,
                result,
            )
            s = js(
                page,
                """() => {const g=__jungleZip;g.start();g.loadStage(2);g.advance(20,{x:0});return g.advance(12,{x:1,jump:true});}""",
            )
            check(
                "Ground jump uses Rapier gravity",
                s["y"] > 2 and s["events"]["jumps"] >= 1,
                s,
            )
            result = js(
                page,
                """() => {const g=__jungleZip;g.setBody(3,.86);g.advance(15,{x:0});const a=g.advance(5,{x:0,duck:true});return {state:a,scale:g.scene.player.root.getObjectByName('rig').scale.y};}""",
            )
            check(
                "Duck has a native animation",
                result["state"]["animation"] == "duck" and result["scale"] < 0.9,
                result,
            )
            s = js(
                page,
                """() => {const g=__jungleZip;g.pause();const a=g.timer;g.advance(120);return {mode:g.mode,before:a,after:g.timer};}""",
            )
            check(
                "Solo pause freezes the clock",
                s["mode"] == "pause" and s["before"] == s["after"],
                s,
            )
            check(
                "Pause menus hide gameplay toasts", page.locator("#toast").is_hidden()
            )
            page.locator('[data-act="dev"]').click()
            page.locator("#t-gravity").fill("30")
            result = js(
                page, "({gravity:__jungleZip.world.gravity.y,dev:__jungleZip.devUsed})"
            )
            check(
                "Developer balance changes are live",
                result["gravity"] == -30 and result["dev"],
                result,
            )
            page.locator('[data-act="defaults"]').click()
            check(
                "Developer reset restores defaults",
                js(
                    page,
                    "__jungleZip.world.gravity.y===-23 && __jungleZip.tuning.speed===6.2",
                ),
            )
            page.locator('[data-act="resume"]').click()
            check("Developer can resume play", js(page, '__jungleZip.mode==="play"'))
            s = js(
                page,
                """() => {const g=__jungleZip;g.start();g.advance(15);g.checkpoint={x:2,y:3,vine:3};g.health=2;g.invincible=0;g.setBody(22,-8);g.damage('fall');return g.snapshot();}""",
            )
            check(
                "Canopy fall returns to saved vine",
                s["health"] == 1 and s["vine"] == 3,
                s,
            )
            s = js(
                page,
                """() => {const g=__jungleZip;g.invincible=0;g.damage('hazard');return g.snapshot();}""",
            )
            check(
                "Lives exhausted show a complete result screen",
                s["mode"] == "lose" and page.locator('[data-act="retry"]').count() == 1,
                s,
            )
            page.locator('[data-act="retry"]').click()
            check(
                "Retry restores all supplies",
                js(
                    page,
                    '__jungleZip.health===5 && __jungleZip.stage===0 && __jungleZip.mode==="play"',
                ),
            )
            s = js(
                page,
                """() => {const g=__jungleZip;g.loadStage(3);g.god=true;g.setBody(52,.9);return g.advance(110,{x:0,attack:true});}""",
            )
            check(
                "Holding at the winch frees Pip",
                s["mode"] == "win" and s["events"]["rescued"],
                s,
            )
            freed = js(
                page,
                "() => {__jungleZip.advance(240);return {y:__jungleZip.scene.pal.root.position.y,parent:__jungleZip.scene.pal.root.parent===__jungleZip.scene.world};}",
            )
            check(
                "Rescued Pip leaves the cage and reaches safety",
                freed["parent"] and freed["y"] < 0.2,
                freed,
            )
            js(
                page,
                """() => {const g=__jungleZip;g.title();g.lastInput=performance.now()-10001;g.advance(1);}""",
            )
            check(
                "Ten-second idle starts attract play",
                js(
                    page,
                    '__jungleZip.attract && __jungleZip.autopilot && __jungleZip.mode==="play"',
                ),
            )
            page.keyboard.press("KeyD")
            check(
                "Any input exits attract to camp",
                js(page, '__jungleZip.mode==="title" && !__jungleZip.attract'),
            )
            js(page, "__jungleZip.start(true);__jungleZip.testing=false")
            page.mouse.move(730, 300)
            check(
                "Mouse movement exits attract mode",
                js(page, '__jungleZip.mode==="title" && !__jungleZip.attract'),
            )
            js(
                page,
                """() => {const g=__jungleZip;g.testing=false;window.__testPad={connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};window.__testPad.buttons[0]={pressed:true,value:1};g.pollPad();}""",
            )
            page.wait_for_timeout(80)
            check(
                "Standard gamepad starts the expedition",
                js(page, '__jungleZip.mode==="play" && __jungleZip.inputType==="pad"'),
                js(
                    page,
                    "({state:__jungleZip.snapshot(),testing:__jungleZip.testing,pad:__jungleZip.padPrev,focus:document.activeElement?.outerHTML?.slice(0,250),gp:navigator.getGamepads()})",
                ),
            )
            js(
                page,
                "__testPad.buttons[0]={pressed:false,value:0};__jungleZip.pollPad()",
            )
            page.wait_for_timeout(80)
            js(
                page,
                "__testPad.buttons[9]={pressed:true,value:1};__jungleZip.pollPad()",
            )
            page.wait_for_timeout(100)
            check("Gamepad Options opens pause", js(page, '__jungleZip.mode==="pause"'))
            js(
                page,
                "__testPad.buttons[9]={pressed:false,value:0};__jungleZip.pollPad()",
            )
            page.wait_for_timeout(80)
            js(
                page,
                "__jungleZip.padMenuTime=0;__testPad.buttons[13]={pressed:true,value:1};__jungleZip.pollPad();__testPad.buttons[13]={pressed:false,value:0};__jungleZip.pollPad()",
            )
            page.wait_for_timeout(30)
            check(
                "D-pad moves menu focus",
                page.locator(":focus").get_attribute("data-act") == "settings",
                page.locator(":focus").evaluate("(e)=>e.outerHTML"),
            )
            js(
                page,
                "__testPad=null;__jungleZip.testing=true;__jungleZip.ui.settings()",
            )
            page.locator("#glyphs").select_option("xbox")
            check(
                "Xbox glyph setting changes prompts",
                js(page, '__jungleZip.ui.glyph("jump")==="Ⓐ"'),
            )
            page.locator("#music").fill("10")
            js(
                page,
                """() => {const a=__jungleZip.audio;a.init();a.wake();a.sfx('win');a.voice(2);a.tone(440,.8,'sine',.4);}""",
            )
            page.wait_for_timeout(150)
            sound = js(
                page,
                "({level:__jungleZip.audio.level(),notes:__jungleZip.audio.notes,voices:__jungleZip.audio.voices})",
            )
            check(
                "Procedural audio produces a signal",
                sound["level"] > 0.001 and sound["voices"] > 0,
                sound,
            )
            js(page, "__jungleZip.audio.stop()")
            page.wait_for_timeout(80)
            check(
                "Audio end silences the master",
                js(page, "__jungleZip.audio.master.gain.value===0"),
            )
            scroll = js(
                page,
                "() => {const g=__jungleZip;g.ui.about();const m=g.ui.panel.querySelector('.modal');m.scrollTop=0;g.ui.navigate(1);return m.scrollTop;}",
            )
            check("Credits can be scrolled with a controller", scroll > 0, scroll)
            # Real WebRTC exchange between two independently loaded pages.
            boot(page, BASE + "/" + GAME.name)
            check("HTTP server serves this game", page.title().startswith("Jungle Zip"))
            peer = context.new_page()
            peer.on("pageerror", lambda e: errors.append(str(e)))
            peer.add_init_script("navigator.gpu.requestAdapter=()=>new Promise(()=>{})")
            boot(peer, BASE + "/" + GAME.name)
            check(
                "Stalled GPU initialization falls back to WebGL",
                js(peer, '__jungleZip.scene.backend==="WebGL 2 fallback"'),
            )
            offer = js(page, "__jungleZip.net.offer()")
            answer = peer.evaluate("(offer)=>__jungleZip.net.answer(offer)", offer)
            page.evaluate("(answer)=>__jungleZip.net.accept(answer)", answer)
            page.wait_for_function("__jungleZip.net.connected", timeout=15000)
            peer.wait_for_function("__jungleZip.net.connected", timeout=15000)
            js(page, "__jungleZip.net.startRace()")
            page.wait_for_function(
                "__jungleZip.net.received>0 && __jungleZip.scene.ghosts.size===1",
                timeout=15000,
            )
            peer.wait_for_function(
                "__jungleZip.net.received>0 && __jungleZip.scene.ghosts.size===1",
                timeout=15000,
            )
            check(
                "Standalone WebRTC begins both copies",
                js(page, '__jungleZip.mode==="play"')
                and js(peer, '__jungleZip.mode==="play"'),
            )
            check(
                "Standalone ghosts exchange and render positions",
                js(
                    page,
                    "__jungleZip.net.received>0 && __jungleZip.scene.ghosts.size===1",
                )
                and js(
                    peer,
                    "__jungleZip.net.received>0 && __jungleZip.scene.ghosts.size===1",
                ),
            )
            js(peer, "__jungleZip.net.close()")
            page.wait_for_timeout(250)
            check(
                "Peer disconnect preserves solo play",
                js(page, '!__jungleZip.net.connected && __jungleZip.mode==="play"'),
            )
            peer.close()
            page.close()
            mobile = browser.new_context(
                viewport={"width": 844, "height": 390},
                is_mobile=True,
                has_touch=True,
                device_scale_factor=1,
            )
            touch = mobile.new_page()
            touch.on("pageerror", lambda e: errors.append(str(e)))
            boot(touch, GAME.as_uri() + "?webgl=1")
            boxes = touch.locator("#panel button").evaluate_all(
                "buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};})"
            )
            check(
                "Landscape touch title keeps every action visible",
                all(
                    b["x"] >= 0
                    and b["y"] >= 0
                    and b["right"] <= 844
                    and b["bottom"] <= 390
                    for b in boxes
                ),
                boxes,
            )
            box = touch.locator('[data-act="start"]').bounding_box()
            touch.touchscreen.tap(
                box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
            )
            check(
                "Touch starts the same expedition",
                js(
                    touch,
                    '__jungleZip.mode==="play" && __jungleZip.inputType==="touch"',
                ),
            )
            touch.touchscreen.tap(720, 260)
            check(
                "Touch tap releases a vine",
                js(touch, "__jungleZip.jumpBuffer>0 || __jungleZip.vine===-1"),
            )
            js(
                touch,
                """() => {const g=__jungleZip;g.testing=true;g.loadStage(1);g.air=10;g.setBody(5,1);g.advance(30); }""",
            )
            check(
                "Touch assists low-air swimming",
                js(touch, "__jungleZip.position().y>2"),
            )
            check(
                "Touch HUD keeps movement controls invisible at rest",
                touch.locator("#touch-stick").is_hidden()
                and touch.locator("#hint").is_hidden(),
            )
            if ARGS.screenshots:
                js(touch, "__jungleZip.scene.render()")
                touch.wait_for_timeout(250)
                touch.screenshot(path=str(DEV / "touch.png"))
            mobile.close()
            # Official conformance harness: normal, impaired four-seat, host departure.
            page = context.new_page()
            for players, scenario, impaired in [
                (2, "standard", False),
                (4, "standard", True),
                (4, "host-leave", True),
            ]:
                suffix = "&latency=150&jitter=50&loss=5" if impaired else ""
                url = f"{BASE}/{DEV.name}/harness.html?game=../{GAME.name}%3Fwebgl%3D1&players={players}&scenario={scenario}&auto=1&play=4000{suffix}"
                page.goto(url, wait_until="domcontentloaded")
                page.wait_for_function(
                    'document.body.dataset.complete==="true"', timeout=90000
                )
                report = js(page, "window.__hubCheck")
                (DEV / f"hub-{players}-{scenario}.json").write_text(
                    json.dumps(report, indent=2)
                )
                failed = [c for c in report["checks"] if not c["pass"]]
                check(
                    f"AI Hub {players} seats / {scenario}"
                    + (" / loss and latency" if impaired else ""),
                    report["pass"],
                    failed,
                )
        if ARGS.screenshots:
            boot(page, GAME.as_uri() + "?webgl=1")
            check(
                "WebGL fallback boot",
                js(page, '__jungleZip.scene.backend==="WebGL 2 fallback"'),
            )
            page.wait_for_timeout(800)
            page.screenshot(path=str(DEV / "title.png"))
            for stage, x, y, filename in [
                (0, 25, 5, "canopy"),
                (1, 34, 3, "river"),
                (2, 40, 0.9, "boulders"),
                (3, 47, 0.9, "temple"),
            ]:
                page.evaluate(
                    """([stage,x,y]) => {const g=__jungleZip;g.start();g.loadStage(stage);g.setBody(x,y);g.god=true;g.advance(20,{x:0});g.scene.camera.position.x=x+4;g.scene.render();}""",
                    [stage, x, y],
                )
                page.wait_for_timeout(500)
                page.screenshot(path=str(DEV / (filename + ".png")))
        if ARGS.screenshots:
            js(
                page,
                '__jungleZip.title();__jungleZip.ui.returnScreen="title";__jungleZip.ui.about()',
            )
            page.screenshot(path=str(DEV / "credits.png"))
        metadata = json.loads((ROOT / "exit-interview.json").read_text())
        check(
            "Exit interview parses and has the required shape",
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
            "In-game credits match the exit interview",
            js(page, "window.JUNGLE_CREDITS") == metadata,
        )
        check("No JavaScript errors", not errors, errors)
        (DEV / "test-timeline.json").write_text(json.dumps(timeline, indent=2))
        context.close()
        browser.close()
except Exception as e:  # noqa: BLE001 — report any runner failure in the same result format.
    check("Test execution", False, str(e))
    (DEV / "test-exception.log").write_text(traceback.format_exc())
finally:
    server.shutdown()
    server.server_close()
    (DEV / "console-messages.json").write_text(json.dumps(console_messages, indent=2))
    (DEV / "test-results.json").write_text(json.dumps(checks, indent=2))
    passed = sum(c["pass"] for c in checks)
    print(
        f"{passed}/{len(checks)} checks passed; {len(checks) - passed} failures",
        flush=True,
    )
    raise SystemExit(0 if passed == len(checks) else 1)
