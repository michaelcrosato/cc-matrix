import functools
import http.server
import json
import subprocess
import sys
import threading
import traceback
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"
ART.mkdir(exist_ok=True)
results = []
render_only = "--render-only" in sys.argv
camera_only = "--camera-only" in sys.argv
build = subprocess.run(
    ["node", "build.mjs"], cwd=ROOT, capture_output=True, text=True, check=False
)
if build.returncode:
    print("FAIL build: " + build.stderr)
    print("1 check: 0 passed, 1 failed.")
    raise SystemExit(1)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def check(name, fn):
    if camera_only and name not in [
        "native WebGPU / title / default audio",
        "WebGPU render target readback",
        "portrait phone / tablet / scrollable credits",
        "WebGL 2 fallback",
        "graphics-device recovery preserves expedition",
        "self-contained root HTML from file://",
        "exit-interview JSON / catalogue / feedback schema",
        "no JavaScript runtime errors",
    ]:
        return
    if render_only and name not in [
        "WebGPU driver probe",
        "native WebGPU / title / default audio",
        "WebGPU render target readback",
        "WebGL 2 fallback",
        "graphics-device recovery preserves expedition",
        "self-contained root HTML from file://",
        "no JavaScript runtime errors",
    ]:
        return
    try:
        fn()
        results.append({"name": name, "pass": True})
    except Exception as e:  # noqa: BLE001 -- each test failure must be collected while cleanup continues
        results.append(
            {
                "name": name,
                "pass": False,
                "error": str(e),
                "trace": traceback.format_exc(),
            }
        )
        print(f"FAIL {name}: {e}", flush=True)


def expect(value, message):
    if not value:
        raise AssertionError(message)


server = http.server.ThreadingHTTPServer(
    ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT))
)
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{server.server_port}"
errors = []
console_messages = []

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=[
            "--enable-unsafe-webgpu",
            "--enable-features=Vulkan",
            "--use-webgpu-adapter=swiftshader",
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
            "--disable-gpu-watchdog",
            "--disable-dev-shm-usage",
            "--no-sandbox",
        ],
    )
    context = browser.new_context(
        viewport={"width": 1920, "height": 1080}, device_scale_factor=1
    )
    context.add_init_script(
        """window.__pad = {id:'Standard test controller',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0,touched:false})),timestamp:1}; window.__padEnabled=false; navigator.getGamepads=()=>window.__padEnabled?[window.__pad]:[];"""
    )
    page = context.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on(
        "console",
        lambda m: (
            console_messages.append({"type": m.type, "text": m.text})
            if m.type in ("warning", "error")
            else None
        ),
    )

    def load(target=page, suffix=""):
        target.goto(base + "/game.html?test=1" + suffix, wait_until="load")
        target.wait_for_function("window.__game?.state().ready", timeout=90000)
        target.evaluate("window.__game.manual(true)")
        expect(
            target.title().startswith("Jungle Jinks"),
            "Server did not serve Jungle Jinks",
        )

    def js(s):
        return page.evaluate(s)

    def state():
        return js("__game.state()")

    def driver_probe():
        page.goto(base + "/vendor/README.md")
        report = page.evaluate(
            """async()=>{const out=[];for(const power of [undefined,'high-performance']){try{const a=await navigator.gpu.requestAdapter({powerPreference:power}),d=await a.requestDevice(),src=d.createBuffer({size:4,usage:GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST}),dst=d.createBuffer({size:4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});d.queue.writeBuffer(src,0,new Uint32Array([19683]));const e=d.createCommandEncoder();e.copyBufferToBuffer(src,0,dst,0,4);d.queue.submit([e.finish()]);await dst.mapAsync(GPUMapMode.READ);const value=new Uint32Array(dst.getMappedRange())[0];dst.unmap();out.push({power:power||'default',value,info:{...a.info}});d.destroy();}catch(e){out.push({power:power||'default',error:e.message});}}return out;}"""
        )
        (ART / "gpu-driver.json").write_text(json.dumps(report, indent=2))
        expect(
            all(x.get("value") == 19683 for x in report),
            "Native GPU buffer roundtrip failed: " + str(report),
        )

    check("WebGPU driver probe", driver_probe)

    def startup():
        load()
        s = state()
        expect(
            s["backend"] == "WebGPU", "Expected the native WebGPU backend: " + str(s)
        )
        expect(
            s["mode"] == "title" and s["music"] == 0.1,
            "Title or default music incorrect",
        )
        page.wait_for_timeout(1000)
        page.screenshot(path=str(ART / "title.png"))

    check("native WebGPU / title / default audio", startup)

    def gpu_proof():
        proof = js("__game.renderProof()")
        (ART / "gpu-render-proof.json").write_text(json.dumps(proof, indent=2))
        expect(
            proof["colors"] > 20 and proof["max"] - proof["min"] > 80,
            "GPU readback found an empty scene: " + str(proof),
        )

    check("WebGPU render target readback", gpu_proof)

    def movement():
        js("__game.start(); __game.advance(.5,{x:1})")
        r = state()["runners"][0]
        expect(r["x"] > 5.0, "Run did not advance: " + str(r))
        js("__game.advance(.12,{x:1,jump:true})")
        expect(state()["runners"][0]["y"] > 1.7, "Jump did not lift explorer")

    check("run and jump through Rapier", movement)

    def vines():
        js(
            """const g=__game.game,r=g.runners[0],v=g.stages[0].vines[0]; __game.teleport(v.end.x,v.end.y-1.1);r.invuln=0;__game.advance(.12,{jump:true});"""
        )
        expect(state()["runners"][0]["swing"], "Vine did not catch airborne explorer")
        js("__game.advance(.4,{x:1}); __game.advance(.05,{x:1,jump:true})")
        expect(not state()["runners"][0]["swing"], "Release did not detach explorer")
        expect(
            js("__game.game.runners[0].body.linvel().x") > 5,
            "Release did not preserve forward momentum",
        )

    check("vine capture / pendulum / momentum release", vines)

    def full_run():
        js("__game.start({bot:true})")
        trace = []
        for _ in range(40):
            s = js("__game.advance(10)")
            r = s["runners"][0]
            trace.append(r)
            if r["finished"]:
                break
        (ART / "playthrough.json").write_text(json.dumps(trace, indent=2))
        expect(r["finished"], "Full expedition stalled: " + json.dumps(trace[-4:]))
        expect(
            {e["stage"] for e in s["events"] if e["type"] == "stage"} == {0, 1, 2, 3},
            "Not all four acts were played",
        )
        expect(
            r["swings"] >= 3 and all(r["winches"]),
            "Playthrough skipped swings or winches",
        )
        expect(s["mode"] == "results", "Rescue did not show complete results")
        js("__game.snapshot()")
        expect(
            js("__game.game.stages[3].freePip.root.visible"),
            "Rescued Pip disappeared from the final scene",
        )
        page.screenshot(path=str(ART / "ending.png"))
        page.keyboard.press("Escape")
        expect(state()["mode"] == "title", "Escape could not return from results")

    check("scripted complete four-act expedition", full_run)

    def river():
        js("__game.start();__game.stage(1);__game.teleport(15,-3);__game.advance(2,{})")
        expect(
            state()["runners"][0]["oxygen"] < 17, "Underwater breath did not decrease"
        )
        js("__game.teleport(24,-4);__game.advance(2,{})")
        expect(
            state()["runners"][0]["oxygen"] >= 17.8, "Bubble column did not refill air"
        )
        js("__game.snapshot()")
        page.screenshot(path=str(ART / "river.png"))

    check("swimming / oxygen depletion / air pockets", river)

    def crocs():
        js(
            """const r=__game.game.runners[0],c=r.stage.crocs[0];__game.teleport(c.group.position.x,c.group.position.y);r.invuln=0;r.god=false;__game.advance(.1,{});"""
        )
        expect(
            state()["runners"][0]["health"] < 5, "Crocodile sensor did not cause damage"
        )
        js(
            """const r=__game.game.runners[0],c=r.stage.crocs[0];__game.teleport(c.group.position.x-2,c.group.position.y);__game.advance(.1,{cut:true});"""
        )
        expect(state()["runners"][0]["stuns"] > 0, "Machete did not stun crocodile")

    check("crocodile contact and machete stun", crocs)

    def rocks():
        js(
            "__game.stage(2);__game.teleport(10,2.3);__game.advance(.4,{duck:true});__game.game.runners[0].spawnRock();__game.advance(2,{x:0})"
        )
        r = state()["runners"][0]
        expect(r["rocks"] > 0, "No physical boulders")
        expect(
            js("__game.game.runners[0].rocks[0].body.linvel().x") < 0,
            "Boulders are not rolling toward explorer",
        )
        js("__game.advance(.15,{duck:true})")
        expect(
            state()["runners"][0]["ducking"], "Duck did not shrink explorer collider"
        )
        js("__game.snapshot()")
        page.screenshot(path=str(ART / "rockfall.png"))

    check("physical rockfall and crouch collider", rocks)

    def rescue():
        js("__game.stage(3)")
        for x in (18, 52, 71):
            js(f"__game.teleport({x},1.2);__game.advance(1.3,{{interact:true}})")
        expect(all(state()["runners"][0]["winches"]), "A winch could not be wound")
        js("__game.teleport(84,1.2);__game.advance(2.6,{interact:true})")
        expect(state()["runners"][0]["finished"], "Pip could not be rescued")

    check("all winches / basket / final rescue", rescue)

    def checkpoints():
        js(
            "__game.start();__game.teleport(32,1.2);__game.advance(.1,{});__game.teleport(40,-17);__game.advance(.1,{})"
        )
        r = state()["runners"][0]
        expect(
            r["checkpoint"] == 1 and 29 < r["x"] < 35,
            "Fall did not return to the latest camp",
        )
        js('const r=__game.game.runners[0];r.health=1;r.invuln=0;r.hurt("test",true)')
        expect(state()["runners"][0]["down"], "Zero health did not open recovery")
        page.keyboard.press("Escape")
        expect(
            state()["modal"] == "down",
            "Escape hid the recovery screen and soft-locked play",
        )
        page.locator('[data-action="retry"]').click()
        expect(
            state()["runners"][0]["health"] == 5 and state()["mode"] == "playing",
            "Checkpoint recovery did not resume",
        )

    check("checkpoint / fall / zero-health recovery", checkpoints)

    def workshop():
        js("__game.game.pause()")
        page.locator('[data-action="dev"]').click()
        page.locator('[data-dev="speed"]').fill("10")
        expect(state()["cfg"]["speed"] == 10, "Live speed slider not applied")
        page.locator('[data-action="dev-god"]').click()
        expect(js("__game.game.runners[0].god"), "Invincibility toggle not applied")
        page.locator('[data-action="dev-stage"][data-stage="1"]').click()
        expect(state()["runners"][0]["stage"] == 1, "Workshop act selector not applied")
        page.locator('[data-action="dev-reset"]').click()
        expect(state()["cfg"]["speed"] == 6.6, "Balance reset failed")
        page.locator('[data-action="back"]').click()
        page.locator('[data-action="resume"]').click()

    check("pause workshop / live sliders / stage skip / reset", workshop)

    def controller():
        js(
            "__game.game.goTitle();window.__padEnabled=true;__pad.buttons[13]={pressed:true,value:1}"
        )
        page.wait_for_function(
            '__game.game.focused?.dataset.action==="multiplayer"', timeout=10000
        )
        js("__pad.buttons[13]={pressed:false,value:0}")
        page.wait_for_function("__game.game.input.menuLatch===0", timeout=10000)
        js("__pad.buttons[0]={pressed:true,value:1}")
        page.wait_for_function('__game.state().modal==="multiplayer"', timeout=10000)
        js("__pad.buttons[0]={pressed:false,value:0}")
        expect(
            state()["modal"] == "multiplayer",
            "Controller could not navigate and select a menu",
        )
        expect(state()["input"] == "gamepad", "Controller was not recognized")
        js('window.__padEnabled=false;__game.game.modalBack="title";__game.game.back()')
        page.locator('[data-action="settings"]').click()
        page.locator('[data-action="glyphs"]').click()
        expect(
            state()["settings"]["glyphs"] == "xbox", "Xbox glyph setting did not change"
        )
        page.locator('[data-action="glyphs"]').click()
        page.locator('[data-action="back"]').click()

    check("emulated standard pad / focus / PlayStation-Xbox glyphs", controller)

    def couch():
        js("__game.start({local:true,bot:true,god:true});__game.advance(1)")
        s = state()
        expect(
            len(s["runners"]) == 2 and all(r["x"] > 6 for r in s["runners"]),
            "Both couch explorers did not move",
        )
        expect(
            page.locator("#splitLine").is_visible(), "Split-screen divider is missing"
        )
        js("__game.snapshot()")
        page.screenshot(path=str(ART / "couch.png"))

    check("two independent local split-screen expeditions", couch)

    def audio():
        proof = js("__game.audioProof()")
        expect(
            proof["rms"] > 0.001 and proof["peak"] < 1,
            "Offline synthesized audio is silent or clipped: " + str(proof),
        )
        js(
            '__game.game.audio.unlock();__game.game.audio.voice();__game.game.audio.effect("pickup")'
        )
        page.wait_for_timeout(250)
        expect(
            js("__game.game.audio.notesPlayed") > 5
            and js("__game.game.audio.voicesPlayed") > 0,
            "Live music / effects / voice did not schedule",
        )
        expect(
            abs(js("__game.game.audio.music.gain.value") - 0.1) < 1e-6,
            "Music bus is not at 10%",
        )
        levels = []
        for _ in range(4):
            levels.append(js("__game.game.audio.levels()"))
            page.wait_for_timeout(70)
        expect(
            max(levels) > 1e-5, "The live audio destination produced no measured signal"
        )
        (ART / "audio-proof.json").write_text(
            json.dumps({"offline": proof, "liveLevels": levels}, indent=2)
        )

    check("OfflineAudioContext and live synthesis", audio)

    def attract():
        js(
            "__game.game.goTitle();__game.manual(false);__game.game.lastActivity=performance.now()-10010"
        )
        page.wait_for_function("__game.state().attract", timeout=5000)
        expect(
            state()["runners"][0]["health"] == 5,
            "Attract mode did not start a safe AI expedition",
        )
        page.keyboard.press("Space")
        page.wait_for_function('__game.state().mode==="title"', timeout=3000)
        js("__game.game.lastActivity=performance.now()-10010")
        page.wait_for_function("__game.state().attract", timeout=5000)
        page.mouse.move(1100, 500)
        page.wait_for_function('__game.state().mode==="title"', timeout=3000)
        js("__game.manual(true)")
        js(
            "__game.game.attractRestart=3;__game.game.goTitle();__game.start();__game.advance(4,{})"
        )
        expect(
            state()["mode"] == "playing" and not state()["attract"],
            "A stale attract restart interrupted a new expedition",
        )
        js("__game.game.goTitle()")

    check("10-second attract mode / any-input exit", attract)

    def credits():
        page.locator('[data-action="about"]').click()
        for tab, text in [
            ("source", "added on import"),
            ("testing", "Most helpful test?"),
            ("engine", "Three.js"),
            ("prompt", "controller-first"),
        ]:
            page.locator(f'[data-tab="{tab}"]').click()
            expect(
                text in page.locator("#creditsContent").inner_text(),
                "Credits missing " + tab,
            )
        page.locator('[data-action="back"]').click()

    check("all four required in-game feedback sections", credits)

    def peer_race():
        js("__game.game.goTitle();__game.manual(true)")
        other = context.new_page()
        other.on("pageerror", lambda e: errors.append("peer: " + str(e)))
        try:
            load(other)
            other.evaluate("__game.render(false)")
            offer = js("__game.game.peer.hostOffer()")
            reply = other.evaluate("(code)=>__game.game.peer.joinOffer(code)", offer)
            page.evaluate("(code)=>__game.game.peer.acceptAnswer(code)", reply)
            page.wait_for_function("__game.game.peer.connected", timeout=15000)
            other.wait_for_function("__game.game.peer.connected", timeout=15000)
            js(
                'const at=Date.now()-10;__game.game.peer.send({type:"start",at});__game.game.startPeer(at)'
            )
            page.wait_for_function('__game.state().mode==="playing"')
            other.wait_for_function('__game.state().mode==="playing"')
            js("__game.advance(1,{x:1})")
            other.evaluate("__game.advance(1,{x:1})")
            page.wait_for_function("__game.state().ghosts.length===1")
            other.wait_for_function("__game.state().ghosts.length===1")
            expect(
                state()["peer"]["sent"] > 0 and state()["peer"]["received"] > 0,
                "WebRTC did not exchange snapshots",
            )
            other.wait_for_function("__game.state().ghosts[0]?.x>6", timeout=15000)
            page.wait_for_function("__game.state().ghosts[0]?.x>6", timeout=15000)
            js("__game.game.runners[0].finish()")
            other.evaluate("__game.game.runners[0].finish()")
            page.locator('#modalRoot [data-action="play"]').click()
            page.wait_for_function('__game.state().mode==="playing"', timeout=15000)
            other.wait_for_function('__game.state().mode==="playing"', timeout=15000)
            expect(
                not state()["runners"][0]["finished"]
                and not other.evaluate("__game.state().runners[0].finished"),
                "Direct race rematch did not reset both explorers",
            )
        finally:
            other.close()
            js("__game.game.peer.close();__game.game.goTitle()")

    check("two-page direct WebRTC ghost race", peer_race)

    def touch():
        mobile = browser.new_context(
            viewport={"width": 844, "height": 390},
            device_scale_factor=1,
            is_mobile=True,
            has_touch=True,
        )
        mp = mobile.new_page()
        mp.on("pageerror", lambda e: errors.append("touch: " + str(e)))
        try:
            load(mp)
            mp.evaluate("__game.start();__game.manual(false)")
            cdp = mobile.new_cdp_session(mp)
            cdp.send(
                "Input.dispatchTouchEvent",
                {"type": "touchStart", "touchPoints": [{"x": 150, "y": 260, "id": 0}]},
            )
            cdp.send(
                "Input.dispatchTouchEvent",
                {"type": "touchMove", "touchPoints": [{"x": 215, "y": 260, "id": 0}]},
            )
            mp.wait_for_timeout(500)
            cdp.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )
            expect(
                mp.evaluate("__game.state().runners[0].x") > 4,
                "Invisible touch stick did not move explorer",
            )
            mp.touchscreen.tap(700, 250)
            expect(
                mp.evaluate("__game.state().input") == "touch",
                "Touch was not recognized",
            )
            expect(
                mp.locator(".touch-menu").is_visible(), "Touch pause button is missing"
            )
        finally:
            mobile.close()

    check("phone profile / invisible touch stick / contextual UI", touch)

    def small_screens():
        for width, height in [(390, 844), (1024, 768)]:
            device = browser.new_context(
                viewport={"width": width, "height": height},
                has_touch=True,
                is_mobile=True,
                device_scale_factor=1,
            )
            sp = device.new_page()
            try:
                load(sp)
                bounds = sp.locator("#titleMenu").bounding_box()
                expect(
                    bounds
                    and bounds["x"] >= 0
                    and bounds["y"] + bounds["height"] <= height,
                    "Title menu overflows small screen",
                )
                sp.evaluate("__game.start();__game.advance(.1,{});__game.snapshot()")
                clip = sp.evaluate(
                    "(()=>{const g=__game.game,r=g.runners[0],v=r.avatar.root.position.clone().project(g.cameras[0]);return{x:v.x,y:v.y}})()"
                )
                expect(
                    abs(clip["x"]) < 0.85 and abs(clip["y"]) < 0.85,
                    "Explorer is outside portrait camera view: " + str(clip),
                )
                sp.evaluate("__game.game.goTitle()")
                sp.locator('[data-action="about"]').click()
                sp.locator('[data-tab="source"]').click()
                expect(
                    sp.locator("#creditsContent").is_visible(),
                    "Credits missing on touch screen",
                )
                sp.evaluate('document.querySelector("#creditsContent").scrollTop=200')
                expect(
                    sp.evaluate('document.querySelector("#creditsContent").scrollTop')
                    > 0,
                    "Credits do not scroll on a small screen",
                )
            finally:
                device.close()

    check("portrait phone / tablet / scrollable credits", small_screens)

    for params, label in [
        ("players=2", "two-player"),
        ("players=4&latency=150&jitter=50&loss=5", "four-player impaired network"),
        (
            "players=4&latency=150&jitter=50&loss=5&scenario=host-leave",
            "host departure",
        ),
    ]:

        def hub_test(params=params, label=label):
            page.goto(
                base + "/vendor/harness.html?game=../game.html&auto=1&" + params,
                wait_until="load",
            )
            page.wait_for_function("window.__hubCheck?.done", timeout=180000)
            report = page.evaluate("window.__hubCheck")
            (ART / ("hub-" + label.replace(" ", "-") + ".json")).write_text(
                json.dumps(report, indent=2)
            )
            expect(
                report["pass"],
                "; ".join(
                    c["name"] + ": " + c.get("detail", "")
                    for c in report["checks"]
                    if not c["pass"]
                ),
            )

        check("AI Hub harness / " + label, hub_test)

    def fallback():
        load(suffix="&backend=webgl")
        expect(state()["backend"] == "WebGL 2", "WebGL 2 fallback unavailable")
        page.wait_for_timeout(500)
        page.screenshot(path=str(ART / "visual-title.png"))
        for i, pos in enumerate([(24, 4), (39, -4), (41, 7), (53, 1.2)]):
            js(
                f'__game.start();__game.stage({i});__game.teleport({pos[0]},{pos[1]});__game.advance(.05,{{}});__game.game.bannerTime=0;document.querySelector("#stageBanner").classList.add("hidden");__game.game.runners[0].invuln=0;__game.game.runners[0].syncVisual(0);__game.game.runners[0].camera.x={pos[0]}+4;__game.game.runners[0].camera.y={-2.3 if i == 1 else pos[0] * 0.125 + 5.1 if i == 2 else 5.2};__game.snapshot()'
            )
            page.wait_for_timeout(150)
            page.screenshot(path=str(ART / f"visual-act-{i + 1}.png"))
        page.wait_for_timeout(300)

    check("WebGL 2 fallback", fallback)

    def renderer_recovery():
        before = state()["runners"][0]
        js(
            '__game.game.renderer.onDeviceLost({api:"WebGPU",message:"Deliberate automated device-loss test",reason:"destroyed"})'
        )
        page.wait_for_function(
            "__game.game.recoveryCount===1&&!__game.game.recovering", timeout=15000
        )
        after = state()["runners"][0]
        expect(
            state()["backend"] == "WebGL 2"
            and before["stage"] == after["stage"]
            and abs(before["x"] - after["x"]) < 0.01,
            "Device recovery restarted or lost the expedition",
        )
        proof = js("__game.renderProof()")
        expect(proof["colors"] > 20, "Recovered renderer did not draw the jungle")

    check("graphics-device recovery preserves expedition", renderer_recovery)

    def portable():
        path = ROOT.parent / (ROOT.name + ".html")
        page.goto(path.as_uri() + "?test=1", wait_until="load")
        page.wait_for_function("window.__game?.state().ready", timeout=90000)
        js("__game.manual(true)")
        expect(state()["mode"] == "title", "Root HTML did not run from file://")

    check("self-contained root HTML from file://", portable)

    def interview_schema():
        interview = json.loads((ROOT.parent / "exit-interview.json").read_text())
        expect(
            set(interview)
            == {
                "sourceInformation",
                "testingFeedback",
                "engineFeedback",
                "promptFeedback",
                "aiHub",
            },
            "Exit interview top-level shape changed",
        )
        expect(
            len(interview["testingFeedback"]) == 4
            and len(interview["engineFeedback"]) == 6
            and len(interview["promptFeedback"]) == 4,
            "Exit interview answer counts are incorrect",
        )
        expect(
            interview["sourceInformation"]["usage"] == "added on import",
            "Usage must be added on import",
        )
        expect(
            interview["aiHub"]["name"] == "Jungle Jinks"
            and len(interview["aiHub"]["tags"]) in range(3, 7),
            "Catalogue metadata is invalid",
        )
        expect(
            all(
                isinstance(v, str) and v
                for v in interview["sourceInformation"].values()
            ),
            "An exit interview source value is empty",
        )

    check("exit-interview JSON / catalogue / feedback schema", interview_schema)
    check(
        "no JavaScript runtime errors",
        lambda: expect(not errors, "; ".join(dict.fromkeys(errors))[:3000]),
    )
    context.close()
    browser.close()

server.shutdown()
(
    ART
    / (
        "test-camera-results.json"
        if camera_only
        else "test-render-results.json"
        if render_only
        else "test-results.json"
    )
).write_text(
    json.dumps(
        {"tests": results, "runtimeErrors": errors, "console": console_messages},
        indent=2,
    )
)
failures = sum(not r["pass"] for r in results)
print(f"{len(results)} checks: {len(results) - failures} passed, {failures} failed.")
raise SystemExit(bool(failures))
