#!/home/micha/.local/share/pipx/venvs/playwright/bin/python
"""One command: core simulation, browser input/audio, online and Hub checks.

Only failures and a final count go to stdout. --visual saves desktop/phone images.
The server binds an OS-assigned localhost port and shuts down on completion.
"""

import json
import subprocess
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import quote

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT.parent
FILE = ROOT.name + ".html"
failures = []
count = 0
visual = "--visual" in sys.argv


def require(ok, message="assertion failed"):
    if not ok:
        raise AssertionError(message)


def check(name, fn, cleanup=None):
    global count
    count += 1
    try:
        fn()
    except Exception as exc:  # noqa: BLE001 -- report each independent test failure.
        failures.append(f"{name}: {exc}")
    finally:
        if cleanup:
            cleanup()


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    global count
    core = subprocess.run(
        ["node", str(ROOT / "tests/core.mjs")],
        capture_output=True,
        text=True,
        timeout=60,
        check=True,
    )
    data = json.loads(core.stdout.strip().splitlines()[-1])
    count += data["count"]
    failures.extend(data["failures"])
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(QuietHandler, directory=str(WORK))
    )
    Thread(target=server.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{server.server_port}"
    url = f"{origin}/{FILE}?test=1"
    errors = []
    with sync_playwright() as p:
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

        def local_deps(context):
            # Exercise pinned files, without making each Hub frame download them again.
            for remote, local in [
                ("three@0.180.0/build/three.webgpu.js", "three.webgpu.js"),
                ("three@0.180.0/build/three.core.js", "three.core.js"),
                ("@dimforge/rapier2d-compat@0.19.3/rapier.mjs", "rapier.mjs"),
                ("peerjs@1.5.5/dist/peerjs.min.js", "peerjs.min.js"),
            ]:
                context.route(
                    "https://cdn.jsdelivr.net/npm/" + remote,
                    lambda route, request, local=local: route.fulfill(
                        path=str(ROOT / "vendor" / local),
                        content_type="application/javascript",
                        headers={"Access-Control-Allow-Origin": "*"},
                    ),
                )

        context = browser.new_context(viewport={"width": 1440, "height": 960})
        local_deps(context)
        context.add_init_script(
            "window.__pads=[]; navigator.getGamepads=()=>window.__pads;"
        )
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(url)
        page.wait_for_function("!!window.Bounceout", timeout=45000)
        require(
            page.title().startswith("Super Bounceout"), "server did not return our game"
        )
        check(
            "WebGPU backend boots",
            lambda: require(page.evaluate("Bounceout.state.backend") == "WebGPU"),
        )
        check(
            "music defaults to ten percent",
            lambda: require(page.evaluate("Bounceout.state.settings.music") == 0.1),
        )

        def gpu_pixels():
            result = page.evaluate("""async()=>{
              const T=await import('three'),v=Bounceout.test.view,r=v.renderer;
              const target=new T.RenderTarget(128,128,{type:T.UnsignedByteType});
              r.setRenderTarget(target);r.render(v.scene,v.camera);
              const pixels=await r.readRenderTargetPixelsAsync(target,0,0,128,128);
              r.setRenderTarget(null);target.dispose();
              let bright=0,colorful=0;
              for(let i=0;i<pixels.length;i+=4){if(pixels[i]>150)bright++;if(pixels[i]>pixels[i+2]*1.2&&pixels[i]>100)colorful++;}
              return {bright,colorful};
            }""")
            require(result["bright"] > 100, str(result))
            require(
                result["colorful"] > 20,
                "coloured brick faces are missing: " + str(result),
            )

        check("GPU readback contains bright coloured geometry", gpu_pixels)

        def keyboard_start():
            page.keyboard.press("Enter")
            page.wait_for_function("Bounceout.state.modal==='intro'")
            page.keyboard.press("Enter")
            page.wait_for_function(
                "Bounceout.state.status==='playing' && !Bounceout.state.modal"
            )

        check("keyboard starts and serves", keyboard_start)

        def keyboard_move():
            x = page.evaluate("Bounceout.state.paddles[0].x")
            page.keyboard.down("KeyD")
            page.wait_for_timeout(200)
            page.keyboard.up("KeyD")
            require(page.evaluate("Bounceout.state.paddles[0].x") > x + 0.4)

        check("A/D paddle movement", keyboard_move)

        def mouse_move():
            box = page.locator("#viewport").bounding_box()
            page.mouse.move(
                box["x"] + box["width"] * 0.25, box["y"] + box["height"] * 0.8
            )
            page.wait_for_timeout(150)
            require(page.evaluate("Bounceout.state.paddles[0].x") < -2)
            require(page.evaluate("Bounceout.state.input") == "mouse")

        check("mouse positions paddle natively", mouse_move)

        def pause_freezes():
            page.keyboard.press("Escape")
            page.wait_for_function("Bounceout.state.modal==='pause'")
            before = page.evaluate("Bounceout.state.time")
            page.wait_for_timeout(200)
            require(page.evaluate("Bounceout.state.time") == before)

        check("solo pause freezes physics", pause_freezes)

        def dev_tuning():
            page.locator('[data-action="dev"]').click()
            page.locator("#dev-paddleWidth").fill("5")
            require(page.evaluate("Bounceout.state.config.paddleWidth") == 5)
            page.locator("#dev-ballSpeed").fill("12")
            require(
                page.evaluate(
                    "Bounceout.test.game.balls.filter(b=>b.alive).every(b=>b.speed===12)"
                )
            )
            before = page.evaluate("Bounceout.state.time")
            page.locator('[data-action="step"]').click()
            require(page.evaluate("Bounceout.state.time") > before)
            page.locator('[data-action="resetTune"]').click()
            require(page.evaluate("Bounceout.state.config.paddleWidth") == 3.6)

        check("dev live tuning, fixed step and reset", dev_tuning)

        def offline_audio():
            metrics = page.evaluate(
                """async()=>{const c=new OfflineAudioContext(1,24000,48000);Bounceout.test.synthTone(c,c.destination,440,.01,.25,.3,'triangle',880);const b=await c.startRendering();const a=b.getChannelData(0);return {peak:Math.max(...a),rms:Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length)};}"""
            )
            require(metrics["peak"] > 0.1 and metrics["rms"] > 0.01, str(metrics))

        check("procedural audio produces nonzero samples", offline_audio)
        check(
            "live audio context and music gain",
            lambda: require(
                page.evaluate(
                    "Bounceout.audio.ctx.state==='running' && Math.abs(Bounceout.audio.music.gain.value-.1)<.01"
                )
            ),
        )

        def pad_navigation():
            page.locator('[data-action="resume"]').click()
            page.evaluate(
                """window.__pads=[{id:'Test DualSense',index:0,connected:true,mapping:'standard',axes:[.8,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}]"""
            )
            x = page.evaluate("Bounceout.state.paddles[0].x")
            page.wait_for_function("Bounceout.state.input==='gamepad'")
            page.wait_for_function("oldX=>Bounceout.state.paddles[0].x>oldX", arg=x)
            page.evaluate(
                "__pads[0].axes[0]=0;__pads[0].buttons[9]={pressed:true,value:1}"
            )
            page.wait_for_function("Bounceout.state.modal==='pause'")
            page.evaluate("__pads[0].buttons[9]={pressed:false,value:0}")
            page.wait_for_function(
                "document.querySelector('[data-prompt=action]').textContent==='✕'"
            )
            page.locator('#modalBody [data-action="settings"]').click()
            page.locator('[data-action="glyphs"]').click()
            require(
                page.evaluate("Bounceout.state.settings.glyphs") == "Xbox",
                json.dumps(page.evaluate("Bounceout.state")),
            )
            # Touching the mouse changed prompt family: restore active pad input.
            page.evaluate("__pads[0].axes[0]=.5")
            page.wait_for_function(
                "Bounceout.state.input==='gamepad' && document.querySelector('[data-prompt=action]').textContent==='A'"
            )
            page.evaluate("window.__pads=[]")

        check(
            "standard pad, pause, PS/Xbox glyph switching",
            pad_navigation,
            lambda: page.evaluate("window.__pads=[]"),
        )

        def couch():
            page.evaluate("Bounceout.test.returnTitle()")
            page.locator('[data-action="coop"]').click()
            page.locator('[data-action="begin"]').click()
            require(len(page.evaluate("Bounceout.state.paddles")) == 2)
            before = page.evaluate("Bounceout.state.paddles.map(p=>p.x)")
            page.keyboard.down("KeyD")
            page.keyboard.down("ArrowLeft")
            page.wait_for_timeout(160)
            page.keyboard.up("KeyD")
            page.keyboard.up("ArrowLeft")
            after = page.evaluate("Bounceout.state.paddles.map(p=>p.x)")
            require(after[0] > before[0] and after[1] < before[1], str((before, after)))

        check("couch co-op independent controls", couch)

        def all_credits():
            page.keyboard.press("Escape")
            page.locator('#modalBody [data-action="about"]').click()
            for tab in ["source", "testing", "engine", "prompt"]:
                page.locator(f'[data-credit="{tab}"]').click()
                require(len(page.locator("#modalBody").inner_text()) > 200)

        check("all required in-game credit tabs", all_credits)

        def attract():
            page.evaluate("Bounceout.test.returnTitle();Bounceout.test.advanceIdle()")
            page.wait_for_function("Bounceout.state.screen==='attract'")
            require(
                page.evaluate(
                    "Bounceout.test.game.autopilot && Bounceout.test.game.invincible"
                )
            )
            page.evaluate("Bounceout.test.app.attractStage=performance.now()-18001")
            page.wait_for_function("Bounceout.state.stage===1")
            page.keyboard.press("KeyZ")
            require(page.evaluate("Bounceout.state.screen") == "title")
            require(page.evaluate("Bounceout.state.status") == "serve")

        check("10-second attract, variant rotation and input exit", attract)

        def menu_attract():
            page.evaluate(
                "Bounceout.test.handleClick('settings');Bounceout.test.advanceIdle()"
            )
            page.wait_for_function(
                "Bounceout.state.screen==='attract' && !Bounceout.state.modal"
            )
            page.mouse.move(5, 5)
            page.wait_for_function("Bounceout.state.screen==='title'")

        check("idle title menus attract and mouse motion exits", menu_attract)

        def pad_title_choice():
            page.evaluate(
                """window.__pads=[{id:'Test DualSense',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},(_,i)=>({pressed:i===13,value:i===13?1:0}))}]"""
            )
            page.wait_for_function("Bounceout.test.app.focus===1")
            page.evaluate("__pads[0].buttons[13]={pressed:false,value:0}")
            page.wait_for_timeout(40)
            page.evaluate("__pads[0].buttons[0]={pressed:true,value:1}")
            page.wait_for_function("Bounceout.state.modal==='intro'")
            require(page.evaluate("Bounceout.test.game.coop"))
            page.evaluate("window.__pads=[]")

        check("controller chooses co-op from the title menu", pad_title_choice)

        def final_overlay():
            page.evaluate(
                "Bounceout.test.start();Bounceout.test.handleClick('begin');const g=Bounceout.test.game;g.stage=3;g.metrics.stages=[0,1,2];g.completeStage();Bounceout.test.processEvents()"
            )
            require(page.evaluate("Bounceout.state.modal") == "result")
            require(page.locator("#modalTitle").inner_text() == "Space. Made.")
            page.locator('[data-action="again"]').click()
            require(page.evaluate("Bounceout.state.stage") == 0)

        check("victory results and replay", final_overlay)
        check("no browser runtime exceptions", lambda: require(not errors, str(errors)))
        context.close()

        # Narrow touch portrait: check hit areas, camera bounds and real touch input.
        phone = browser.new_context(**p.devices["iPhone 13"])
        phone.add_init_script(
            "Object.defineProperty(navigator,'gpu',{value:undefined,configurable:true});"
        )
        local_deps(phone)
        mobile = phone.new_page()
        mobile.goto(url)
        mobile.wait_for_function("!!window.Bounceout", timeout=45000)

        def touch():
            require(mobile.evaluate("Bounceout.state.input") == "touch")
            mobile.locator('[data-action="start"]').tap()
            mobile.locator('[data-action="begin"]').tap()
            box = mobile.locator("#viewport").bounding_box()
            mobile.touchscreen.tap(
                box["x"] + box["width"] * 0.75, box["y"] + box["height"] * 0.8
            )
            mobile.wait_for_timeout(100)
            require(mobile.evaluate("Bounceout.test.game.relaxed"))
            require(
                mobile.evaluate(
                    "Bounceout.test.view.camera.right>=10.5 && Bounceout.test.view.camera.left<=-10.5"
                )
            )
            require(mobile.evaluate("document.documentElement.scrollWidth<=innerWidth"))
            require(mobile.locator("#menuButton").is_visible())

        check("phone touch assistance and uncropped camera", touch)
        if visual:
            mobile.screenshot(path=str(ROOT / "tests/phone.png"))
        phone.close()

        # WebGL is the engine's own compatibility backend, useful for screenshots.
        fallback = browser.new_context(viewport={"width": 1920, "height": 1080})
        local_deps(fallback)
        fallback.add_init_script(
            "Object.defineProperty(navigator,'gpu',{value:undefined,configurable:true});"
        )
        fp = fallback.new_page()
        fp.goto(url)
        fp.wait_for_function("!!window.Bounceout", timeout=45000)
        check(
            "native WebGL 2 compatibility backend",
            lambda: require(
                fp.evaluate("Bounceout.state.backend") == "WebGL 2 fallback"
            ),
        )
        if visual:
            fp.wait_for_timeout(250)
            fp.screenshot(path=str(ROOT / "tests/title.png"))
            fp.keyboard.press("Enter")
            fp.keyboard.press("Enter")
            fp.wait_for_timeout(400)
            fp.screenshot(path=str(ROOT / "tests/play.png"))
        fallback.close()

        direct = browser.new_context(viewport={"width": 1365, "height": 768})
        dp = direct.new_page()

        def file_launch():
            dp.goto((WORK / FILE).as_uri())
            dp.wait_for_function("!!window.Bounceout", timeout=60000)
            require(
                dp.evaluate(
                    "Bounceout.state.screen==='title' && Bounceout.state.backend==='WebGPU'"
                )
            )

        check("file:// launch with real CDN dependencies", file_launch)
        direct.close()

        # Official Hub harness. Four copies stay in one browser, not four browsers.
        for players, scenario in [(2, "normal"), (4, "normal"), (4, "host-leave")]:
            hub = browser.new_context(viewport={"width": 1440, "height": 960})
            local_deps(hub)
            hp = hub.new_page()
            params = f"?game={quote('/' + FILE)}&players={players}&auto=1&play=3000&limit=30&latency=150&jitter=50&loss=5&scenario={scenario}"
            hp.goto(origin + "/" + ROOT.name + "/tests/harness.html" + params)

            def harness(hp=hp, players=players, scenario=scenario):
                hp.wait_for_function("window.__hubCheck?.done", timeout=65000)
                report = hp.evaluate("window.__hubCheck")
                count_checks = len(report["checks"])
                require(
                    report["pass"],
                    json.dumps([c for c in report["checks"] if not c["pass"]]),
                )
                (ROOT / "tests" / f"hub-{players}-{scenario}.json").write_text(
                    json.dumps(report, indent=2)
                )
                return count_checks

            check(f"official Hub {players}-player {scenario}", harness)
            hub.close()

        # Standalone real signaling + local WebRTC data channel, two independent pages.
        race = browser.new_context(viewport={"width": 1200, "height": 800})
        local_deps(race)
        host = race.new_page()
        guest = race.new_page()
        host.goto(url)
        guest.goto(url)
        host.wait_for_function("!!window.Bounceout", timeout=45000)
        guest.wait_for_function("!!window.Bounceout", timeout=45000)

        def online():
            host.locator('[data-action="online"]').click()
            host.locator('[data-action="host"]').click()
            host.wait_for_function(
                "Bounceout.test.link.roster.length===1", timeout=25000
            )
            code = host.evaluate("Bounceout.test.link.code")
            guest.locator('[data-action="online"]').click()
            guest.locator("#roomCodeInput").fill(code)
            guest.locator('[data-action="join"]').click()
            host.wait_for_function(
                "Bounceout.test.link.roster.length===2", timeout=25000
            )
            guest.wait_for_function(
                "Bounceout.test.link.roster.length===2", timeout=25000
            )
            host.locator('[data-action="launchRace"]').click()
            host.wait_for_function("Bounceout.state.screen==='play'", timeout=10000)
            guest.wait_for_function("Bounceout.state.screen==='play'", timeout=10000)
            host.wait_for_function("Bounceout.state.ghosts.length===1", timeout=10000)
            guest.wait_for_function("Bounceout.state.ghosts.length===1", timeout=10000)
            require(
                host.evaluate(
                    "Bounceout.test.link.started && Bounceout.state.status==='playing'"
                )
            )
            for copy in [host, guest]:
                copy.evaluate(
                    "const g=Bounceout.test.game;g.lives=1;for(const b of g.balls)if(b.alive)g.removeBall(b)"
                )
            host.wait_for_function("Bounceout.state.modal==='result'", timeout=10000)
            guest.wait_for_function("Bounceout.state.modal==='result'", timeout=10000)
            host.wait_for_function(
                "document.getElementById('rematchButton') && !document.getElementById('rematchButton').disabled",
                timeout=10000,
            )
            host.locator('[data-action="rematch"]').click()
            guest.wait_for_function(
                "Bounceout.state.status==='playing' && !Bounceout.state.modal",
                timeout=10000,
            )
            guest.evaluate("Bounceout.test.link.close()")
            host.wait_for_function("Bounceout.state.ghosts.length===0", timeout=10000)
            host.evaluate(
                "const g=Bounceout.test.game;g.lives=1;for(const b of g.balls)if(b.alive)g.removeBall(b)"
            )
            host.wait_for_function("Bounceout.state.modal==='result'", timeout=10000)
            host.locator('[data-action="title"]').click()
            require(
                host.evaluate(
                    "Bounceout.state.screen==='title' && !Bounceout.test.link.active"
                )
            )

        check("standalone room, launch, ghosts, results, rematch and departure", online)
        race.close()
        browser.close()
    server.shutdown()
    server.server_close()


try:
    main()
except Exception as exc:  # noqa: BLE001 -- retain a useful report if browser setup fails.
    failures.append("Test runner: " + str(exc))
for failure in failures:
    print("FAIL " + failure)
print(f"{count} checks: {count - len(failures)} passed, {len(failures)} failed")
(ROOT / "tests/results.json").write_text(
    json.dumps(
        {"checks": count, "passed": count - len(failures), "failures": failures},
        indent=2,
    )
    + "\n"
)
sys.exit(1 if failures else 0)
