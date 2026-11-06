"""One-command checks: npm test. Only failures and the final count go to stdout."""

from __future__ import annotations

import functools
import http.server
import json
import subprocess
import threading
from pathlib import Path

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
failures: list[str] = []
count = 0
records: dict = {}


def check(name, condition, detail=""):
    global count
    count += 1
    if not condition:
        failures.append(f"{name}: {detail or 'assertion failed'}")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def ready(page):
    page.wait_for_function("window.__game?.ready || window.__gameError", timeout=60000)
    assert page.evaluate("!!window.__game?.ready"), page.evaluate("window.__gameError")


INIT = """window.__PRESS_TEST__=true;
window.requestAnimationFrame=callback=>setTimeout(()=>callback(performance.now()),16);
window.cancelAnimationFrame=handle=>clearTimeout(handle);
window.__testPad={id:'Emulated standard controller',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
Object.defineProperty(navigator,'getGamepads',{value:()=>[window.__testPad]});"""


def pad_button(page, index, down):
    page.evaluate(
        "([i,v])=>{const b=window.__testPad.buttons[i];b.pressed=v;b.value=v?1:0;}",
        [index, down],
    )
    page.wait_for_timeout(100)


def run_browser_tests(browser, base):
    errors = []
    ctx = browser.new_context(viewport={"width": 1600, "height": 900})
    ctx.add_init_script(INIT)
    p = ctx.new_page()
    p.on("pageerror", lambda e: errors.append(str(e)))
    p.goto((ROOT / "game.html").as_uri())
    ready(p)
    check(
        "Single-file offline title",
        p.title().startswith("Press for Burgers")
        and p.locator('[data-action="solo"]').count() == 1,
    )
    check(
        "Pinned WebGPU and physics versions",
        p.evaluate(
            "__game.engine().three==='180'&&__game.engine().rapier==='0.19.3'&&__game.engine().backend==='WebGPU'"
        ),
    )
    check(
        "Music defaults to ten percent", p.evaluate("__game.app.audio.musicVolume===.1")
    )
    check(
        "Embedded libraries need no CDN",
        p.evaluate(
            "performance.getEntriesByType('resource').filter(r=>r.name.startsWith('http')).length===0"
        ),
    )
    p.keyboard.press("Enter")
    check("Keyboard accepts title menu", p.evaluate("__game.app.screen==='brief'"))
    p.keyboard.press("Enter")
    check(
        "Keyboard begins service",
        p.evaluate("__game.state().mode==='playing'&&__game.app.screen===null"),
    )
    x = p.evaluate("__game.state().players[0].x")
    p.keyboard.down("d")
    p.wait_for_function("x=>__game.state().players[0].x>x+1.2", arg=x, timeout=5000)
    p.keyboard.up("d")
    check(
        "Keyboard movement reaches Rapier",
        p.evaluate("__game.state().players[0].x") > x + 1,
    )
    p.keyboard.press("q", delay=50)
    check(
        "Keyboard activates belt brake",
        p.evaluate("__game.state().brake>4&&__game.state().stats.brakes===1"),
    )
    p.keyboard.press("Escape")
    before = p.evaluate("__game.state().time")
    p.wait_for_timeout(250)
    check(
        "Solo pause freezes simulation",
        p.evaluate("__game.app.screen==='pause'&&__game.state().time") == before,
    )
    p.locator('[data-action="dev"]').click()
    check("Pause opens dev tools", p.locator("[data-tuning]").count() == 7)
    p.locator("#tune-moveSpeed").fill("8")
    check(
        "Live balance slider updates simulation",
        p.evaluate("__game.app.sim.tuning.moveSpeed===8"),
    )
    p.locator('[data-action="god"]').click()
    check("Dev invincibility toggles", p.evaluate("__game.app.sim.invincible"))
    p.locator('[data-action="resetTuning"]').click()
    check(
        "Dev reset restores defaults",
        p.evaluate("__game.app.sim.tuning.moveSpeed===5.2&&!__game.app.sim.invincible"),
    )
    p.locator('[data-action="resume"]').click()
    # Use real E events after arranging a deterministic, complete order at the belt.
    p.evaluate(
        """()=>{const a=__game.app,s=a.sim.state,b=s.burgers[0],p=s.players[0];a.sim.tuning.beltSpeed=0;p.x=-3.6;p.z=b.z;p.held={kind:'topping',type:b.recipe[0]};}"""
    )
    p.keyboard.press("e", delay=60)
    check(
        "Keyboard action places topping", p.evaluate("__game.state().burgers[0].ready")
    )
    p.keyboard.press("e", delay=60)
    check(
        "Keyboard action carries completed burger",
        p.evaluate("__game.state().players[0].held?.kind==='burger'"),
    )
    p.evaluate("()=>{const p=__game.app.sim.state.players[0];p.x=-2.8;p.z=5.7;}")
    p.keyboard.press("e", delay=60)
    check(
        "Keyboard action serves correct window",
        p.evaluate("__game.state().totalServed===1"),
    )
    p.evaluate(
        "()=>{const a=__game.app;a.sim.spawnBurger();const b=a.sim.state.burgers[0];b.z=-1;a.view.camera.updateMatrixWorld();}"
    )
    pick = p.evaluate(
        "()=>{const a=__game.app,b=a.state.burgers[0];if(!b)return null;const vector=a.view.camera.position.clone().set(b.x,2,b.z).project(a.view.camera);return a.view.destination((vector.x+1)*innerWidth/2,(1-vector.y)*innerHeight/2,a.state);}"
    )
    check(
        "World clicking maps belt burgers to reachable action positions",
        pick is not None and abs(pick["x"] + 3.55) < 0.01,
    )
    offline = p.evaluate("__game.audioOffline()")
    check(
        "Procedural audio renders non-silent bounded samples",
        0.005 < offline["rms"] < 0.5 and offline["peak"] < 1,
        str(offline),
    )
    p.evaluate("__game.app.audio.play('served')")
    p.wait_for_timeout(80)
    check(
        "Live Web Audio output has signal",
        p.evaluate("__game.app.audio.level()") > 0.00001,
    )
    p.evaluate("__game.app.title()")
    pad_button(p, 0, True)
    pad_button(p, 0, False)
    check("Gamepad Cross accepts title", p.evaluate("__game.app.screen==='brief'"))
    pad_button(p, 0, True)
    pad_button(p, 0, False)
    x = p.evaluate("__game.state().players[0].x")
    p.evaluate("__testPad.axes[0]=1")
    p.wait_for_timeout(350)
    p.evaluate("__testPad.axes[0]=0")
    check(
        "Emulated standard gamepad moves chef",
        p.evaluate("__game.state().players[0].x") > x + 1,
    )
    pad_button(p, 9, True)
    pad_button(p, 9, False)
    check("Gamepad Options pauses", p.evaluate("__game.app.screen==='pause'"))
    p.evaluate("__game.app.action('settings')")
    p.locator("#glyphs").select_option("xbox")
    p.evaluate("__game.app.ui.input='gamepad'")
    check(
        "Xbox prompts are selectable",
        "A" in p.evaluate("__game.app.ui.key('action')")
        and p.evaluate("__game.app.ui.glyphs==='xbox'"),
    )
    p.evaluate(
        "__game.app.open('online');__game.app.ui.input='gamepad';__game.app.ui.setFocus(0);__game.app.ui.activate();__game.app.ui.navigate(0,-1);__game.app.ui.navigate(1,0);__game.app.ui.navigate(0,-1);__game.app.ui.navigate(0,-1)"
    )
    check(
        "Controller can enter a room code without a keyboard",
        p.locator("#room-input").input_value() == "BCAAAA",
    )
    p.evaluate("__game.app.ui.activate()")
    check(
        "Controller code entry hands focus to Join",
        p.evaluate(
            "!__game.app.ui.codeEditing&&__game.app.ui.items()[__game.app.ui.focus].dataset.action==='join'"
        ),
    )
    p.evaluate("__game.app.title();__game.app.lastInput=performance.now()-10001")
    p.wait_for_timeout(180)
    check(
        "Title idle starts attract mode after ten seconds",
        p.evaluate("__game.app.attract&&__game.state().mode==='playing'"),
    )
    result = p.evaluate("__game.step(150,true)")
    check(
        "Attract bot demonstrates a whole three-shift service",
        result["mode"] == "won" and result["totalServed"] == 15,
    )
    p.keyboard.press("x")
    check(
        "Any input exits attract to title",
        p.evaluate("!__game.app.attract&&__game.app.screen==='title'"),
    )
    p.evaluate("__game.app.start(2)")
    check(
        "Local co-op creates two chefs", p.evaluate("__game.state().players.length===2")
    )
    p.evaluate("__game.app.action('begin')")
    x = p.evaluate("__game.state().players[1].x")
    p.keyboard.down("ArrowRight")
    p.wait_for_timeout(300)
    p.keyboard.up("ArrowRight")
    check(
        "Second local keyboard controls second chef",
        p.evaluate("__game.state().players[1].x") > x + 0.8,
    )
    p.evaluate("__game.app.pause();__game.app.action('about')")
    check(
        "About screen has all required source information",
        all(
            p.get_by_text(text, exact=False).count() > 0
            for text in [
                "Source Information",
                "Testing Feedback",
                "Engine Feedback",
                "Prompt Feedback",
                "added on import",
            ]
        ),
    )
    for tab in ["testing", "engine", "prompt"]:
        p.locator(f'[data-action="about-{tab}"]').click()
        check(f"About {tab} feedback is filled", p.locator(".credits dd").count() >= 4)
    check("No JavaScript errors in solo and input tests", not errors, "; ".join(errors))
    records["offlineAudio"] = offline
    ctx.close()

    touch = browser.new_context(
        viewport={"width": 932, "height": 430},
        device_scale_factor=1,
        is_mobile=True,
        has_touch=True,
    )
    touch.add_init_script(INIT)
    p = touch.new_page()
    p.goto(base + "/game.html")
    ready(p)
    p.locator('[data-action="solo"]').tap()
    p.locator('[data-action="begin"]').tap()
    check(
        "Touch uses minimal assisted HUD",
        p.evaluate("__game.app.touchMode")
        and not p.locator(".hud-bottom").is_visible(),
    )
    cdp = touch.new_cdp_session(p)
    x = p.evaluate("__game.state().players[0].x")
    cdp.send(
        "Input.dispatchTouchEvent",
        {"type": "touchStart", "touchPoints": [{"x": 380, "y": 300}]},
    )
    cdp.send(
        "Input.dispatchTouchEvent",
        {"type": "touchMove", "touchPoints": [{"x": 440, "y": 300}]},
    )
    p.wait_for_timeout(400)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    check(
        "Invisible touch stick moves chef",
        p.evaluate("__game.state().players[0].x") > x + 1,
    )
    p.locator("#pause-btn").tap()
    check("Touch menu button pauses", p.evaluate("__game.app.screen==='pause'"))
    touch.close()


def run_rooms(browser, base):
    ctx = browser.new_context(viewport={"width": 1280, "height": 720})
    ctx.add_init_script(INIT)
    a, b = ctx.new_page(), ctx.new_page()
    for page in [a, b]:
        page.goto(base + "/game.html")
        ready(page)
    a.evaluate("__game.app.action('host')")
    a.wait_for_function("__game.app.net.room.length===6")
    room = a.evaluate("__game.app.net.room")
    b.evaluate("code=>__game.app.net.joinRoom(code)", room)
    b.wait_for_function("__game.app.net.players.length===2", timeout=20000)
    check(
        "Two standalone pages join a room",
        a.evaluate("__game.app.net.players.length===2")
        and b.evaluate("__game.app.net.me===1"),
    )
    a.evaluate("__game.app.action('startRoom')")
    b.wait_for_function(
        "__game.state().mode==='playing'&&__game.app.screen===null", timeout=10000
    )
    check(
        "Host starts a shared standalone service",
        a.evaluate("__game.state().players.length===2")
        and b.evaluate("__game.state().players.length===2"),
    )
    x = a.evaluate("__game.state().players.find(p=>p.id===1).x")
    b.keyboard.down("d")
    a.wait_for_function(
        "x=>__game.state().players.find(p=>p.id===1).x>x+1.2", arg=x, timeout=5000
    )
    b.keyboard.up("d")
    check(
        "Guest input reaches authoritative host",
        a.evaluate("__game.state().players.find(p=>p.id===1).x") > x + 1,
    )
    b.wait_for_timeout(200)
    hx = a.evaluate("__game.state().players.find(p=>p.id===1).x")
    gx = b.evaluate("__game.state().players.find(p=>p.id===1).x")
    check(
        "Host snapshots replicate positions",
        abs(hx - gx) < 0.3,
        f"host={hx}, guest={gx}",
    )
    records["standaloneRoom"] = {
        "host": a.evaluate("__game.net()"),
        "guest": b.evaluate("__game.net()"),
    }
    b.evaluate("__game.app.net.disconnect()")
    a.wait_for_function("__game.app.net.players.length===1", timeout=5000)
    check(
        "Guest departure removes the chef and releases the collider",
        a.evaluate(
            "__game.state().players.find(p=>p.id===1).disconnected&&!__game.app.sim.bodies.get(1).c.isEnabled()"
        ),
    )
    b.evaluate("code=>__game.app.net.joinRoom(code)", room)
    b.wait_for_function(
        "__game.app.net.players.length===2&&__game.app.net.me===1", timeout=10000
    )
    check(
        "A new apron can reuse a departed seat",
        a.evaluate(
            "!__game.state().players.find(p=>p.id===1).disconnected&&__game.app.sim.bodies.get(1).c.isEnabled()"
        ),
    )
    a.evaluate("__game.app.net.disconnect()")
    b.wait_for_function("__game.app.net.kind==='none'", timeout=5000)
    check(
        "Host departure closes standalone room",
        b.evaluate("__game.app.screen==='online'"),
    )
    ctx.close()


def run_internet(browser, base):
    """Try a real WebRTC path across isolated browser contexts, without BroadcastChannel."""
    contexts = [
        browser.new_context(viewport={"width": 1280, "height": 720}) for _ in range(2)
    ]
    for ctx in contexts:
        ctx.add_init_script(INIT)
    host, guest = [ctx.new_page() for ctx in contexts]
    try:
        for page in [host, guest]:
            page.goto(base + "/game.html")
            ready(page)
        host.evaluate("__game.app.action('host')")
        try:
            host.wait_for_function("__game.app.net.peer?.open", timeout=15000)
        except PlaywrightTimeoutError:
            records["standaloneInternet"] = {
                "result": "unknown",
                "reason": "Public signaling did not become available in this environment.",
                "status": host.evaluate("__game.app.roomStatus"),
            }
            return
        code = host.evaluate("__game.app.net.room")
        guest.evaluate("code=>__game.app.net.joinRoom(code)", code)
        try:
            guest.wait_for_function(
                "__game.app.net.players.length===2&&__game.app.net.connection?.open",
                timeout=20000,
            )
        except PlaywrightTimeoutError:
            records["standaloneInternet"] = {
                "result": "unknown",
                "reason": "Public signaling opened but an isolated-context WebRTC connection could not be confirmed.",
                "status": guest.evaluate("__game.app.roomStatus"),
            }
            return
        check(
            "Standalone internet co-op negotiates a real WebRTC data channel",
            guest.evaluate("__game.app.net.connection.open"),
        )
        host.evaluate("__game.app.action('startRoom')")
        guest.wait_for_function("__game.state().mode==='playing'", timeout=10000)
        start = host.evaluate("__game.state().players[1].x")
        guest.keyboard.down("d")
        host.wait_for_function(
            "x=>__game.state().players[1].x>x+1", arg=start, timeout=5000
        )
        guest.keyboard.up("d")
        check(
            "Real WebRTC guest input moves the host simulation",
            host.evaluate("__game.state().players[1].x") > start + 1,
        )
        records["standaloneInternet"] = {
            "result": "passed",
            "transport": "PeerJS WebRTC, separate browser contexts; no BroadcastChannel",
            "host": host.evaluate("__game.net()"),
            "guest": guest.evaluate("__game.net()"),
        }
    finally:
        for ctx in contexts:
            ctx.close()


def run_harness(browser, base):
    ctx = browser.new_context(viewport={"width": 1400, "height": 900})
    ctx.add_init_script(INIT)
    p = ctx.new_page()
    for players, scenario, impairment in [
        (2, "standard", ""),
        (4, "standard", "&latency=150&jitter=50&loss=5"),
        (4, "host-leave", "&latency=150&jitter=50&loss=5"),
        (2, "server", ""),
    ]:
        p.goto(
            f"{base}/harness.html?game=game.html&players={players}&auto=1&scenario={scenario}&play=3&limit=30{impairment}"
        )
        p.wait_for_function(
            "[...document.querySelectorAll('iframe')].length>0&&[...document.querySelectorAll('iframe')].every(f=>f.contentWindow?.__game?.ready)",
            timeout=60000,
        )
        for frame in p.frames[1:]:
            frame.evaluate(
                "()=>{window.__finishPacket=null;const original=AIHub.finish;AIHub.finish=packet=>{window.__finishPacket=packet;return original.call(AIHub,packet)};if(__game.app.screen==='hubWaiting')__game.app.back();}"
            )
        check(
            f"AI Hub {players}p {scenario}: pre-round navigation stays in the session",
            all(
                frame.evaluate("__game.app.screen!=='title'") for frame in p.frames[1:]
            ),
        )
        p.wait_for_function("document.body.dataset.complete==='true'", timeout=90000)
        report = p.evaluate("window.__hubCheck")
        records[f"hub-{players}-{scenario}"] = report
        for item in report["checks"]:
            check(
                f"AI Hub {players}p {scenario}: {item['name']}",
                item["pass"],
                item.get("detail", ""),
            )
        check(f"AI Hub {players}p {scenario} final pass", report["pass"])
        if scenario != "host-leave":
            check(
                f"AI Hub {players}p {scenario}: unfinished service is not a team win",
                any(
                    frame.evaluate("window.__finishPacket?.won===false")
                    for frame in p.frames[1:]
                    if not frame.is_detached()
                ),
            )
    ctx.close()


def run_render(browser, base):
    ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
    ctx.add_init_script(INIT)
    p = ctx.new_page()
    p.goto(base + "/game.html")
    ready(p)
    p.evaluate(
        "async()=>{const v=__game.app.view;v.renderer.info.autoReset=false;v.render(__game.state(),.016,true,1);await v.renderer.waitForGPU();}"
    )
    check(
        "WebGPU submits the complete kitchen without validation errors",
        p.evaluate(
            "__game.app.view.renderer.info.render.triangles>50000&&!__game.app.view.gpuLost&&__game.app.view.gpuErrors.length===0"
        ),
    )
    p.evaluate("__game.app.view.renderer.backend.device.destroy()")
    p.wait_for_function("__game.app.view.backend.includes('WebGL2')", timeout=15000)
    check(
        "GPU loss recovers to a working compatibility backend",
        p.evaluate("__game.app.view.backend.includes('GPU recovery')"),
    )
    # Screenshots are reserved for composition and text readability.
    p.evaluate(
        "__game.app.lastInput=performance.now();__game.app.view.renderer.info.autoReset=false;__game.app.view.render(__game.state(),.016,true,1)"
    )
    p.screenshot(path=str(ROOT / "title-final.png"), timeout=60000)
    p.evaluate("__game.app.view.render(__game.state(),.016,true,1)")
    check(
        "Compatibility renderer draws kitchen geometry",
        p.evaluate("__game.app.view.renderer.info.render.triangles>50000"),
    )
    p.evaluate(
        "__game.newService();__game.app.sim.state.burgers[0].z=-.5;__game.app.view.render(__game.state(),.016,false,2)"
    )
    p.screenshot(path=str(ROOT / "gameplay-final.png"), timeout=60000)
    check(
        "Gameplay camera and scene are present", p.locator("#view canvas").count() == 1
    )
    p.evaluate("__game.app.action('pause');__game.app.pause();__game.app.action('dev')")
    p.screenshot(path=str(ROOT / "dev-final.png"), timeout=60000)
    records["renderBackend"] = p.evaluate("__game.engine()")
    p.set_viewport_size({"width": 390, "height": 844})
    p.evaluate(
        "()=>{const a=__game.app;a.touchMode=true;document.body.classList.add('touch');a.ui.input='touch';a.sim.reset(2026);a.sim.beginShift();a.open(null);a.sim.spawnBurger();a.sim.state.burgers[0].z=-1;a.sim.spawnBurger();a.view.resize();a.view.render(a.state,.016,false,3);a.ui.lastHUD=-1;a.ui.hud(a.state,999);}"
    )
    p.screenshot(path=str(ROOT / "touch-portrait-final.png"), timeout=60000)
    check(
        "Portrait camera fits the complete kitchen width",
        p.evaluate("__game.app.view.camera.right-__game.app.view.camera.left>=25.9"),
    )
    check(
        "Portrait touch order tickets fit the screen",
        p.evaluate(
            "[...document.querySelectorAll('.ticket')].every(e=>e.getBoundingClientRect().right<=innerWidth&&e.getBoundingClientRect().left>=0)"
        ),
    )
    ctx.close()


def main():
    result = subprocess.run(
        ["node", "test-model.mjs"], cwd=ROOT, capture_output=True, text=True, check=True
    )
    model = json.loads(result.stdout.strip().splitlines()[-1])
    global count
    count += model["count"]
    failures.extend(model["failures"])
    records["model"] = model
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_address[1]}"
    try:
        with sync_playwright() as w:
            browser = w.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                    "--use-angle=swiftshader",
                    "--disable-background-timer-throttling",
                    "--disable-renderer-backgrounding",
                    "--no-sandbox",
                ],
            )
            for name, fn in [
                ("browser", run_browser_tests),
                ("standalone", run_rooms),
                ("internet", run_internet),
                ("hub", run_harness),
                ("render", run_render),
            ]:
                try:
                    fn(browser, base)
                except Exception as exc:  # noqa: BLE001 -- report every failed suite, then exit nonzero
                    check(
                        f"{name} suite completed",
                        False,
                        str(exc).split("Call log:")[0].strip(),
                    )
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    report = {
        "checks": count,
        "passed": count - len(failures),
        "failures": failures,
        "details": records,
    }
    (ROOT / "test-results.json").write_text(json.dumps(report, indent=2))
    for failure in failures:
        print("FAIL " + failure)
    print(f"{count - len(failures)}/{count} checks passed; {len(failures)} failures")
    raise SystemExit(bool(failures))


if __name__ == "__main__":
    main()
