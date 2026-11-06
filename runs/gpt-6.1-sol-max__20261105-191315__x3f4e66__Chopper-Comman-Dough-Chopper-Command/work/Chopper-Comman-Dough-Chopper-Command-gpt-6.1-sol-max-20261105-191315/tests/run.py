"""One-command browser checks. Prints failures and one final count only."""

from __future__ import annotations

import functools
import http.server
import json
import os
import subprocess
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "tests" / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)
RUNTIME = ROOT / "tests" / "runtime"
RUNTIME.mkdir(exist_ok=True)
RUNTIME.chmod(0o700)
os.environ.setdefault("XDG_RUNTIME_DIR", str(RUNTIME))
os.environ["TMPDIR"] = str(RUNTIME)
SLUG = ROOT.name
FAILURES: list[str] = []
RESULTS: dict[str, object] = {}
COUNT = 0
ONLY = sys.argv[sys.argv.index("--only") + 1].lower() if "--only" in sys.argv else ""


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def check(name, fn):
    global COUNT
    if ONLY and ONLY not in name.lower() and name != "WebGPU boot and title":
        return
    COUNT += 1
    try:
        RESULTS[name] = fn() or "pass"
    except Exception as exc:  # noqa: BLE001 -- each independent test must report failures.
        FAILURES.append(f"FAIL {name}: {exc}")
        RESULTS[name] = {"failure": str(exc)}
    (ARTIFACTS / "progress.json").write_text(json.dumps(RESULTS, indent=2))


def expect(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    build = subprocess.run(
        ["node", "build.mjs"], cwd=ROOT, capture_output=True, text=True, check=False
    )
    if build.returncode:
        print("FAIL build: " + build.stderr)
        print("0 passed, 1 failed")
        return 1
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT / "dist"))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    url = f"{base}/{SLUG}.html?test=1"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                    "--disable-vulkan-surface",
                    "--use-angle=swiftshader",
                    "--autoplay-policy=no-user-gesture-required",
                ],
            )
            context = browser.new_context(viewport={"width": 1600, "height": 900})
            page = context.new_page()
            errors = []
            console_messages = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on(
                "console",
                lambda m: (
                    console_messages.append({"type": m.type, "text": m.text[:1800]})
                    if m.type in ["error", "warning"]
                    else None
                ),
            )
            page.goto(url, wait_until="load", timeout=120000)

            def boot():
                page.wait_for_function(
                    "window.__CCD || window.__bootError", timeout=120000
                )
                expect(
                    not page.evaluate("window.__bootError || null"),
                    page.evaluate("window.__bootError || null"),
                )
                state = page.evaluate("__CCD.inspect()")
                expect(
                    page.title() == "Chopper Comman-Dough — Rotor Express",
                    "wrong game page",
                )
                expect(state["backend"] == "WebGPU", state["backend"])
                expect(state["screen"] == "title", state)
                expect(state["settings"]["music"] == 10, "music must default to 10%")
                page.screenshot(path=str(ARTIFACTS / "title.png"))
                return state

            check("WebGPU boot and title", boot)
            if page.evaluate("!!window.__CCD"):

                def raw_gpu():
                    result = page.evaluate("""async () => {
                      const a=await navigator.gpu.requestAdapter(),d=await a.requestDevice();
                      const c=document.createElement('canvas');c.width=4;c.height=4;document.body.append(c);const ctx=c.getContext('webgpu');ctx.configure({device:d,format:'rgba8unorm',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});
                      try { const t=ctx.getCurrentTexture();
                      const b=d.createBuffer({size:1024,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});const e=d.createCommandEncoder();
                      const p=e.beginRenderPass({colorAttachments:[{view:t.createView(),loadOp:'clear',storeOp:'store',clearValue:[.2,.3,.4,1]}]});p.end();
                      e.copyTextureToBuffer({texture:t},{buffer:b,bytesPerRow:256},{width:4,height:4});d.queue.submit([e.finish()]);await b.mapAsync(GPUMapMode.READ);
                      const pixel=Array.from(new Uint8Array(b.getMappedRange()).slice(0,4));b.unmap();b.destroy();t.destroy();return {pixel};
                      } catch(e){return {error:e.message};} finally {c.remove();d.destroy();}
                    }""")
                    expect(result.get("pixel", [0])[0] > 20, result)
                    return result

                check("WebGPU native clear/readback diagnostic", raw_gpu)

                def gpu_pixels():
                    result = page.evaluate(
                        """async () => {__CCD.freeze(true);try {const result=await __CCD.view.probePixels();return result;}catch(e){return {error:e.message,lost:__CCD.view.renderer._isDeviceLost,backend:__CCD.view.backend,initialized:__CCD.view.renderer._initialized};}finally{__CCD.freeze(false);}}"""
                    )
                    if "error" in result:
                        result["console"] = console_messages[-12:]
                        raise AssertionError(result)
                    expect(result["pixels"] == 1024, result)
                    expect(
                        result["mean"] > 30 and result["max"] - result["min"] > 50,
                        result,
                    )
                    return result

                check("WebGPU offscreen rendered pixel readback", gpu_pixels)

                def controls():
                    page.evaluate("__CCD.action('quit')")
                    page.locator('[data-action="start"]').click()
                    page.evaluate("__CCD.freeze(true)")
                    page.keyboard.down("d")
                    command = page.evaluate(
                        "__CCD.input.command(0,__CCD.view,__CCD.game.getPilot(0))"
                    )
                    expect(command["x"] == 1, command)
                    state = page.evaluate(
                        "__CCD.advance(1,false,{0:__CCD.input.command(0,__CCD.view,__CCD.game.getPilot(0))})"
                    )
                    expect(state["pilots"][0]["x"] > 15, state)
                    page.keyboard.up("d")
                    page.keyboard.down("Space")
                    state = page.evaluate(
                        "__CCD.advance(.8,false,{0:__CCD.input.command(0,__CCD.view,__CCD.game.getPilot(0))})"
                    )
                    page.keyboard.up("Space")
                    expect(state["stats"]["shots"] >= 5, state)
                    page.keyboard.press("Escape")
                    expect(
                        page.evaluate("__CCD.inspect().screen") == "pause",
                        "Escape did not pause",
                    )
                    page.locator('[data-action="dev"]').click()
                    slider = page.locator('[data-balance="speed"]')
                    slider.fill("40")
                    expect(
                        page.evaluate("__CCD.game.config.speed") == 40,
                        "live balance did not apply",
                    )
                    page.locator('[data-action="resetbalance"]').click()
                    expect(
                        page.evaluate("__CCD.game.config.speed") == 27, "reset failed"
                    )
                    return {
                        "shots": state["stats"]["shots"],
                        "x": state["pilots"][0]["x"],
                    }

                check("Keyboard, pause and live developer sliders", controls)

                def campaign():
                    result = page.evaluate("""() => {
                      __CCD.start([0]);__CCD.freeze(true);__CCD.game.god=true;
                      let s=__CCD.advance(420,true);return s;
                    }""")
                    expect(result["phase"] == "won", result)
                    expect(
                        result["wave"] == 4 and result["stats"]["waves"] == 4, result
                    )
                    expect(result["stats"]["kills"] == 43, result)
                    expect(result["stats"]["bosses"] == 1, result)
                    expect(result["trucks"] > 0, result)
                    return result

                check(
                    "Complete four-dispatch campaign with real physics hits", campaign
                )

                def mechanics():
                    result = page.evaluate("""() => {
                      __CCD.start([0]);__CCD.freeze(true);const g=__CCD.game;g.god=false;
                      const p=g.getPilot(0),t=g.trucks[6];
                      p.invul=0;g.hit(p,1000);const reserve=p.lives;
                      __CCD.advance(2.2);p.invul=0;
                      p.x=t.x;p.y=7;p.vx=0;p.vy=0;p.body.setTranslation({x:t.x,y:7,z:0},true);t.hp=1;
                      __CCD.advance(2.3);const repaired=g.stats.repairs;
                      const pickup=g.create('power',p.x,p.y,{ttl:20});__CCD.advance(.1);const power=p.power;
                      g.create('split',p.x+8,p.y,{vx:0,vy:0,splitAt:.1,ttl:3,target:0});__CCD.advance(.2);const splits=g.stats.splits;
                      p.flare=0;g.popFlare(p);const missiles=[...g.entities.values()].filter(e=>e.type==='missile'&&!e.dead).length;
                      const size=JSON.stringify(g.snapshot()).length;
                      for(const tr of g.liveTrucks())g.hit(tr,100);__CCD.advance(.1);const lost=g.phase;
                      return {reserve,repaired,power,splits,missiles,size,lost,physics:g.world.bodies.len()};
                    }""")
                    expect(result["reserve"] == 2, result)
                    expect(result["repaired"] > 0, result)
                    expect(result["power"] > 8, result)
                    expect(result["splits"] > 0 and result["missiles"] == 0, result)
                    expect(result["lost"] == "lost", result)
                    expect(result["size"] < 16000, result)
                    return result

                check(
                    "Reserves, repair hover, pickups, split/flare and failure",
                    mechanics,
                )

                def audio():
                    page.evaluate("__CCD.audio.unlock()")
                    result = page.evaluate("__CCD.audio.offlineProbe()")
                    expect(0.005 < result["rms"] < 0.5, result)
                    expect(0.02 < result["peak"] < 1, result)
                    page.evaluate(
                        "__CCD.audio.sfx.gain.value=0;__CCD.audio.music.gain.value=.1;__CCD.audio.resume();__CCD.audio.update()"
                    )
                    page.wait_for_function(
                        "__CCD.audio.generated>5&&__CCD.audio.levels()>.00001",
                        timeout=8000,
                    )
                    result["liveMusicRms"] = page.evaluate("__CCD.audio.levels()")
                    page.evaluate("__CCD.audio.volumes(.1,.7)")
                    return result

                check("Procedural music/SFX/voice audio signal", audio)

                def gamepad():
                    page.evaluate(
                        "__CCD.start([0]);__CCD.freeze(true);__CCD.input.padPrevious.clear()"
                    )
                    page.evaluate("""() => {
                      window.fakePad={index:0,id:'DualSense test',mapping:'standard',connected:true,timestamp:1,axes:[.8,-.5,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
                      fakePad.buttons[7]={pressed:true,value:1};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[fakePad]});
                      __CCD.input.poll(.1);
                    }""")
                    command = page.evaluate(
                        "__CCD.input.command(0,__CCD.view,__CCD.game.getPilot(0))"
                    )
                    expect(
                        command["x"] > 0.5 and command["y"] > 0.2 and command["fire"],
                        command,
                    )
                    page.evaluate(
                        "__CCD.ui.show('title');fakePad.axes=[0,0,0,0];fakePad.buttons[7]={pressed:false,value:0};__CCD.input.poll(.1)"
                    )
                    page.wait_for_timeout(40)
                    page.evaluate(
                        "fakePad.buttons[0]={pressed:true,value:1};__CCD.input.poll(.1)"
                    )
                    expect(
                        page.evaluate("__CCD.inspect().screen") == "",
                        "Cross did not launch",
                    )
                    page.evaluate(
                        "fakePad.buttons[0]={pressed:false,value:0};__CCD.input.poll(.1);__CCD.setting('glyphs','xbox');__CCD.ui.updatePrompts()"
                    )
                    expect(
                        page.locator("#flare-prompt").inner_text() == "B",
                        "Xbox glyph setting failed",
                    )
                    page.evaluate(
                        "Object.defineProperty(navigator,'getGamepads',{value:()=>[]});__CCD.input.poll(.1)"
                    )
                    return command

                check("Emulated standard gamepad and adaptive prompts", gamepad)

                def screenshot():
                    page.evaluate(
                        "__CCD.start([0]);__CCD.freeze(true);__CCD.game.god=true;__CCD.advance(7,true);__CCD.view.update(.016);__CCD.view.render();__CCD.ui.hideBanner()"
                    )
                    page.screenshot(path=str(ARTIFACTS / "gameplay.png"))
                    return page.evaluate("__CCD.inspect()")

                check("Gameplay presentation snapshot", screenshot)

                def restart_timing():
                    page.evaluate(
                        "__CCD.start([0]);__CCD.freeze(true);__CCD.game.finish(false);__CCD.start([0]);__CCD.freeze(true)"
                    )
                    page.wait_for_timeout(950)
                    expect(
                        page.evaluate("__CCD.inspect().screen") == "",
                        "old result screen interrupted the new campaign",
                    )
                    return "new campaign survives previous result timer"

                check("Restart cancels stale results and transient UI", restart_timing)
                check(
                    "No JavaScript runtime errors", lambda: expect(not errors, errors)
                )
            context.close()

            def visual_compatibility():
                ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
                pg = ctx.new_page()
                try:
                    pg.goto(url + "&renderer=webgl", timeout=120000)
                    pg.wait_for_function(
                        "window.__CCD || window.__bootError", timeout=120000
                    )
                    expect(
                        pg.evaluate("!!window.__CCD"), pg.evaluate("window.__bootError")
                    )
                    expect(
                        pg.evaluate("__CCD.inspect().backend")
                        == "WebGL 2 compatibility",
                        "compatibility backend missing",
                    )
                    pg.wait_for_timeout(700)
                    pg.screenshot(path=str(ARTIFACTS / "title-visible.png"))
                    pg.evaluate(
                        "__CCD.start([0]);__CCD.game.god=true;__CCD.freeze(true);__CCD.advance(11,false);__CCD.view.update(.1);__CCD.view.render();__CCD.ui.hideBanner()"
                    )
                    pg.screenshot(path=str(ARTIFACTS / "gameplay-visible.png"))
                    return pg.evaluate("__CCD.inspect().backend")
                finally:
                    ctx.close()

            check(
                "Compatibility renderer and 1080p visual review", visual_compatibility
            )

            def attract_and_local():
                ctx = browser.new_context(viewport={"width": 1280, "height": 720})
                pg = ctx.new_page()
                try:
                    pg.goto(url)
                    pg.wait_for_function("window.__CCD", timeout=120000)
                    pg.wait_for_function("__CCD.inspect().attract", timeout=18000)
                    pg.wait_for_function(
                        "__CCD.inspect().stats.shots > 0", timeout=8000
                    )
                    demonstrated = pg.evaluate(
                        "__CCD.freeze(true);__CCD.advance(180,true)"
                    )
                    expect(demonstrated["phase"] == "won", demonstrated)
                    expect(
                        demonstrated["stats"]["repairs"] > 0
                        and demonstrated["stats"]["boostTime"] > 0
                        and demonstrated["stats"]["splits"] > 0
                        and demonstrated["stats"]["flares"] > 0,
                        demonstrated,
                    )
                    pg.evaluate("__CCD.freeze(false)")
                    pg.keyboard.press("q")
                    expect(
                        pg.evaluate("__CCD.inspect().screen") == "title",
                        "input did not leave attract mode",
                    )
                    pg.evaluate("__CCD.action('localstart');__CCD.freeze(true)")
                    result = pg.evaluate(
                        "__CCD.advance(1,false,{0:{x:1},1:{x:-1,fire:true}})"
                    )
                    expect(len(result["pilots"]) == 2, result)
                    expect(
                        result["pilots"][0]["x"] > 0 and result["pilots"][1]["x"] < 0,
                        result,
                    )
                    return {
                        "pilots": len(result["pilots"]),
                        "attract": "entered at 10 seconds; input returned to title",
                    }
                finally:
                    ctx.close()

            check(
                "Ten-second attract replay and local cooperative flight",
                attract_and_local,
            )

            def touch():
                ctx = browser.new_context(
                    viewport={"width": 844, "height": 390},
                    is_mobile=True,
                    has_touch=True,
                    device_scale_factor=1,
                )
                pg = ctx.new_page()
                try:
                    pg.goto(url)
                    pg.wait_for_function("window.__CCD", timeout=120000)
                    bounds = pg.locator('[data-action="start"]').bounding_box()
                    expect(bounds and bounds["y"] + bounds["height"] < 390, bounds)
                    pg.locator('[data-action="start"]').tap()
                    pg.evaluate("__CCD.freeze(true)")
                    result = pg.evaluate("""() => {
                      const c=document.getElementById('game');
                      const touch=(x,y)=>new Touch({identifier:7,target:c,clientX:x,clientY:y});
                      c.dispatchEvent(new TouchEvent('touchstart',{changedTouches:[touch(140,260)],touches:[touch(140,260)],cancelable:true,bubbles:true}));
                      c.dispatchEvent(new TouchEvent('touchmove',{changedTouches:[touch(205,210)],touches:[touch(205,210)],cancelable:true,bubbles:true}));
                      const command=__CCD.input.command(0,__CCD.view,__CCD.game.getPilot(0));
                      const state=__CCD.advance(.7,false,{0:command});
                      c.dispatchEvent(new TouchEvent('touchend',{changedTouches:[touch(205,210)],touches:[],cancelable:true,bubbles:true}));
                      __CCD.ui.show('');return {command,state,type:__CCD.input.last,touches:__CCD.input.touches.size};
                    }""")
                    expect(result["type"] == "touch", result)
                    expect(
                        result["command"]["x"] > 0.9
                        and result["command"]["y"] > 0.5
                        and result["command"]["fire"],
                        result,
                    )
                    expect(result["touches"] == 0, result)
                    expect(
                        not pg.locator(".abilities").is_visible(),
                        "touch controls did not simplify",
                    )
                    pg.screenshot(path=str(ARTIFACTS / "touch-landscape.png"))
                    return {"command": result["command"], "type": result["type"]}
                finally:
                    ctx.close()

            check("Touch flight, automatic fire and clean touch HUD", touch)

            def radio_multiplayer():
                ctx = browser.new_context(viewport={"width": 960, "height": 540})
                host, guest = ctx.new_page(), ctx.new_page()
                try:
                    for pg in [host, guest]:
                        pg.goto(url)
                        pg.wait_for_function("window.__CCD", timeout=120000)
                    host.evaluate("__CCD.net.hostRoom('TEST')")
                    guest.evaluate("__CCD.net.joinRoom('TEST')")
                    host.wait_for_function("__CCD.net.seats.length===2", timeout=8000)
                    guest.wait_for_function("__CCD.net.me===1", timeout=8000)
                    host.evaluate("__CCD.net.launch()")
                    guest.wait_for_function("__CCD.inspect().started", timeout=8000)
                    guest.keyboard.down("d")
                    host.wait_for_function("__CCD.game.getPilot(1)?.x>7", timeout=12000)
                    guest.keyboard.up("d")
                    guest.wait_for_function("__CCD.net.received>4", timeout=8000)
                    h, g = (
                        host.evaluate("__CCD.inspect()"),
                        guest.evaluate("__CCD.inspect()"),
                    )
                    expect(h["net"]["sent"] > 0 and h["net"]["received"] > 0, h)
                    expect(g["trucks"] == h["trucks"] and len(g["pilots"]) == 2, g)
                    return {
                        "host": h["net"],
                        "guest": g["net"],
                        "remoteX": h["pilots"][1]["x"],
                    }
                finally:
                    ctx.close()

            check("Standalone two-page radio shared world", radio_multiplayer)

            def rtc_multiplayer():
                ctx = browser.new_context(viewport={"width": 800, "height": 600})
                host, guest = ctx.new_page(), ctx.new_page()
                try:
                    for pg in [host, guest]:
                        pg.goto(url)
                        pg.wait_for_function("window.__CCD", timeout=120000)
                    offer = host.evaluate("__CCD.net.offer()")
                    answer = guest.evaluate("offer=>__CCD.net.answer(offer)", offer)
                    host.evaluate("answer=>__CCD.net.accept(answer)", answer)
                    host.wait_for_function(
                        "__CCD.net.dc?.readyState==='open'", timeout=15000
                    )
                    guest.wait_for_function(
                        "__CCD.net.dc?.readyState==='open'", timeout=15000
                    )
                    host.evaluate("__CCD.net.launch()")
                    guest.wait_for_function(
                        "__CCD.inspect().started&&__CCD.net.received>3", timeout=10000
                    )
                    expect(
                        guest.evaluate("__CCD.inspect().pilots.length") == 2,
                        "missing remote pilot",
                    )
                    return {
                        "offerBytes": len(offer),
                        "answerBytes": len(answer),
                        "dataChannel": "open; state received",
                    }
                finally:
                    ctx.close()

            check(
                "Direct WebRTC offer/answer and world synchronization", rtc_multiplayer
            )

            for scenario, players, extra in [
                ("standard", 2, ""),
                ("adverse", 4, "&latency=150&jitter=50&loss=5"),
                ("host-leave", 4, "&scenario=host-leave"),
                ("server", 2, "&scenario=server"),
            ]:

                def hub_run(scenario=scenario, players=players, extra=extra):
                    ctx = browser.new_context(viewport={"width": 1400, "height": 900})
                    pg = ctx.new_page()
                    try:
                        pg.goto(
                            f"{base}/harness.html?game={SLUG}.html&players={players}&auto=1&playMs=3500{extra}",
                            timeout=120000,
                        )
                        pg.wait_for_function(
                            "document.body.dataset.complete==='true'", timeout=120000
                        )
                        result = pg.evaluate("window.__hubCheck")
                        (ARTIFACTS / f"hub-{scenario}.json").write_text(
                            json.dumps(result, indent=2)
                        )
                        failed = [c for c in result["checks"] if not c["pass"]]
                        expect(result["pass"], failed)
                        return {
                            "pass": True,
                            "checks": len(result["checks"]),
                            "players": players,
                        }
                    finally:
                        ctx.close()

                check(f"AI Hub harness: {scenario}", hub_run)

            def package_and_report():
                data = json.loads((ROOT.parent / "exit-interview.json").read_text())
                expect(
                    set(data)
                    == {
                        "sourceInformation",
                        "testingFeedback",
                        "engineFeedback",
                        "promptFeedback",
                        "aiHub",
                    },
                    "exit interview shape",
                )
                expect(
                    len(data["testingFeedback"]) == 4
                    and len(data["engineFeedback"]) == 6
                    and len(data["promptFeedback"]) == 4,
                    "feedback arrays",
                )
                expect(data["sourceInformation"]["usage"] == "added on import", "usage")
                html = (ROOT.parent / (SLUG + ".html")).read_text()
                expect(
                    "sourceMappingURL" not in html or "data:" in html,
                    "external source map",
                )
                client = (ROOT / "research" / "session.js").read_text()
                expect(client in html, "Hub client was modified")
                expect(
                    'type="module"' in html and "data:font/ttf;base64" in html,
                    "not a bundled package",
                )
                return {"htmlBytes": len(html.encode()), "json": "valid"}

            check("Single-file package and exit interview JSON", package_and_report)

            def file_protocol():
                ctx = browser.new_context(viewport={"width": 1280, "height": 720})
                pg = ctx.new_page()
                try:
                    pg.goto(
                        (ROOT.parent / (SLUG + ".html")).as_uri() + "?test=1",
                        timeout=120000,
                    )
                    pg.wait_for_function(
                        "window.__CCD||window.__bootError", timeout=120000
                    )
                    expect(
                        pg.evaluate("!!window.__CCD"),
                        pg.evaluate("window.__bootError||null"),
                    )
                    expected = json.loads((ROOT / "report.json").read_text())
                    expect(
                        pg.evaluate("__CCD.report") == expected,
                        "embedded credits differ from exit interview",
                    )
                    expect(
                        all(
                            v and isinstance(v, str)
                            for v in expected["sourceInformation"].values()
                        ),
                        "missing source fields",
                    )
                    pg.locator('[data-action="credits"]').click()
                    expect(
                        pg.locator(".credits-row").count()
                        == len(expected["sourceInformation"]) + 1,
                        "missing source rows",
                    )
                    for tab, count in [
                        ("testingFeedback", 4),
                        ("engineFeedback", 6),
                        ("promptFeedback", 4),
                    ]:
                        pg.locator(f'[data-credit="{tab}"]').click()
                        expect(
                            pg.locator(".feedback-item").count() == count,
                            f"missing {tab} answers",
                        )
                        expect(
                            expected[tab][0]
                            in pg.locator(".credits-body").inner_text(),
                            f"wrong {tab} text",
                        )
                        expect(
                            all(a != "unknown" and a for a in expected[tab]),
                            f"unfilled {tab}",
                        )
                    pg.evaluate(
                        "__CCD.input.last='gamepad';__CCD.setting('glyphs','xbox');__CCD.ui.show('manual')"
                    )
                    manual = pg.locator(".panel").inner_text()
                    expect(
                        "RT / A" in manual and "LT BOOST" in manual,
                        "Xbox manual prompts",
                    )
                    pg.evaluate("__CCD.action('quit')")
                    pg.locator('[data-action="start"]').click()
                    pg.evaluate("__CCD.freeze(true)")
                    result = pg.evaluate("__CCD.advance(2,false,{0:{fire:true}})")
                    expect(result["physics"] and result["stats"]["shots"] > 5, result)
                    return {
                        "protocol": "file:",
                        "physics": True,
                        "shots": result["stats"]["shots"],
                    }
                finally:
                    ctx.close()

            check("Self-contained file protocol launch", file_protocol)
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    (ARTIFACTS / "results.json").write_text(json.dumps(RESULTS, indent=2))
    for failure in FAILURES:
        print(failure)
    print(f"{COUNT - len(FAILURES)} passed, {len(FAILURES)} failed")
    return bool(FAILURES)


if __name__ == "__main__":
    raise SystemExit(main())
