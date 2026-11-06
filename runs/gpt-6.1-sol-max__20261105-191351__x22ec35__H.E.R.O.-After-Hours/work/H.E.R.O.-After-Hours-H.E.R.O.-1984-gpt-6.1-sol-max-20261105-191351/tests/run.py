"""One command: npm test. Prints failures and one count; artifacts stay here."""

import argparse
import contextlib
import functools
import http.server
import json
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tests"
parser = argparse.ArgumentParser()
parser.add_argument(
    "--suite", choices=["smoke", "mechanics", "hub", "visual", "all"], default="all"
)
args = parser.parse_args()
results = []
errors = []


def check(name, fn):
    try:
        value = fn()
        assert value is not False, "returned false"
        results.append({"name": name, "pass": True})
    except Exception as exc:  # noqa: BLE001 — a test runner must report every failed check
        msg = str(exc)[:1800]
        results.append({"name": name, "pass": False, "error": msg})
        print("FAIL " + name + ": " + msg)


def expect(value, message="assertion failed"):
    assert value, message


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *unused):
        pass


with sync_playwright() as pw:
    browser = pw.chromium.launch(
        headless=True,
        args=[
            "--no-sandbox",
            "--enable-unsafe-webgpu",
            "--enable-features=Vulkan",
            "--use-webgpu-adapter=swiftshader",
            "--use-angle=vulkan",
            "--use-vulkan=swiftshader",
            "--disable-vulkan-surface",
            "--disable-dev-shm-usage",
            "--autoplay-policy=no-user-gesture-required",
        ],
    )
    page = browser.new_page(viewport={"width": 1600, "height": 900})
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    url = (ROOT / "dist/index.html").as_uri() + "?test=1"
    page.goto(url)

    def boot():
        page.wait_for_function("document.body.dataset.ready === 'true'", timeout=60000)
        data = page.evaluate("window.__GAME__.inspect()")
        expect(data["renderer"] == "WebGPU", data["renderer"])
        expect(data["state"] == "title", str(data))
        expect(data["animations"] >= 4, "native animation mixers missing")
        expect(data["audio"]["music"] == 0.1, "music default is not 10%")
        expect(not data["deviceLost"], "GPU device lost")

    check("single-file offline boot / WebGPU / native animation / music defaults", boot)
    ready = page.evaluate("document.body.dataset.ready === 'true'")
    if ready:
        page.evaluate("window.__GAME__.idleAt = performance.now() + 100000")
        if args.suite in ["smoke", "all"]:

            def menu():
                page.keyboard.press("ArrowDown")
                expect(
                    page.locator('button[data-action="coop"]').evaluate(
                        "b=>b.classList.contains('focused')"
                    ),
                    "keyboard focus did not move",
                )
                page.keyboard.press("ArrowUp")
                page.keyboard.press("Enter")
                page.wait_for_function("window.__GAME__.state==='playing'")
                expect(page.evaluate("window.__GAME__.players.length") == 1)
                page.keyboard.press("Escape")
                expect(page.evaluate("window.__GAME__.ui.page") == "pause")
                page.locator('[data-action="dev"]').click()
                slider = page.locator('input[data-variable="speed"]')
                slider.fill("10")
                expect(page.evaluate("window.__GAME__.tuning.speed") == 10)
                page.locator('[data-action="reset-dev"]').click()
                expect(page.evaluate("window.__GAME__.tuning.speed") == 6.2)
                page.locator('[data-action="back"]').click()
                page.locator('[data-action="resume"]').click()

            check("keyboard menus, pause, live tuning and reset", menu)

            def pad():
                page.evaluate("""() => {
                  const g=window.__GAME__;g.title();g.idleAt=performance.now()+100000;
                  window.pad={id:'Test DualSense',index:0,connected:true,mapping:'standard',timestamp:1,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0,touched:false}))};
                  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.pad]});
                  window.press=(n,on)=>{pad.buttons[n]={pressed:on,value:on?1:0};g.pollPads(performance.now());};
                  press(0,true);press(0,false);
                }""")
                expect(
                    page.evaluate("window.__GAME__.state") == "playing",
                    page.evaluate("JSON.stringify(__GAME__.inspect())"),
                )
                expect(
                    page.evaluate("window.__GAME__.inputKind") == "pad",
                    "pad not last input",
                )
                expect(
                    "✕" in page.locator("#controls-strip").inner_text(),
                    page.locator("#controls-strip").inner_text(),
                )
                flight = page.evaluate(
                    """() => {const g=__GAME__;g.manual=true;const y=g.players[0].y;pad.axes[0]=.5;press(0,true);for(let i=0;i<50;i++)g.tick(1/60);press(0,false);pad.axes[0]=0;g.pollPads(performance.now());g.manual=false;return g.players[0].y-y;}"""
                )
                expect(flight > 1, "pad thrust did not move the pilot")
                page.evaluate("press(9,true);press(9,false)")
                expect(page.evaluate("window.__GAME__.ui.page") == "pause")
                page.locator('#panel [data-action="settings"]').click()
                page.locator('[data-action="toggle"][data-value="glyphs"]').click()
                expect(page.evaluate("window.__GAME__.settings.glyphs") == "xbox")
                page.evaluate("press(3,true);press(3,false)")
                expect(
                    "RT" in page.locator("#controls-strip").inner_text(),
                    page.locator("#controls-strip").inner_text(),
                )
                page.evaluate(
                    'Object.defineProperty(navigator,"getGamepads",{configurable:true,value:()=>[]});__GAME__.settings.glyphs="ps";__GAME__.saveSettings();__GAME__.resume()'
                )

            check(
                "emulated standard gamepad, Options and PlayStation/Xbox prompts", pad
            )

            def about_screen():
                page.evaluate("__GAME__.pause()")
                page.locator('#panel [data-action="credits"]').click()
                expect(
                    "added on import" in page.locator(".credits-content").inner_text()
                )
                expect("gpt-6.1-sol" in page.locator(".credits-content").inner_text())
                for tab, word in [
                    ("testingFeedback", "7 distinct issues"),
                    ("engineFeedback", "AnimationMixer"),
                    ("promptFeedback", "Standalone multiplayer"),
                ]:
                    page.locator(
                        f'#panel [data-action="tab"][data-value="{tab}"]'
                    ).click()
                    expect(word in page.locator(".credits-content").inner_text(), tab)
                    expect(
                        page.locator(f'#panel [data-value="{tab}"]').evaluate(
                            'b=>b.classList.contains("focused")'
                        ),
                        "active credits tab lost controller focus",
                    )
                page.locator('#panel [data-action="back"]').click()
                page.locator('#panel [data-action="resume"]').click()
                page.evaluate('__GAME__.activity("keyboard")')
                expect("F / LMB" in page.locator("#controls-strip").inner_text())

            check(
                "all four in-game credits tabs, source metadata and controller focus",
                about_screen,
            )

            def audio():
                page.evaluate(
                    """async () => {const g=__GAME__;await g.sound.unlock();g.sound.play('rescue');g.sound.play('blast');g.sound.update(true,true);}"""
                )
                page.wait_for_timeout(100)
                data = page.evaluate(
                    """() => {const g=__GAME__;g.sound.update(true,true);return g.inspect().audio;}"""
                )
                expect(data["state"] == "running", str(data))
                expect(data["peak"] > 0.0001, str(data))
                expect(data["notes"] > 5, str(data))

            check(
                "procedural music, effects and gibberish produce measurable audio",
                audio,
            )

            def attract():
                page.evaluate(
                    """() => {const g=__GAME__;g.title();g.idleAt=performance.now()-10020;}"""
                )
                page.wait_for_function("__GAME__.attractMode", timeout=10000)
                page.keyboard.press("KeyQ")
                expect(page.evaluate("__GAME__.state") == "title")
                expect(not page.evaluate("__GAME__.attractMode"))

            check("ten-second attract trigger and input exit", attract)

        if args.suite in ["mechanics", "all"]:
            page.evaluate("""() => {
                const g=__GAME__;g.manual=true;g.start(1);g.qaInput={x:0,fly:false,fire:false,bomb:false,aimX:1,aimY:0,down:false};
                g.getInput=()=>g.qaInput;
                window.step=(n,i={})=>{g.qaInput={x:0,fly:false,fire:false,bomb:false,aimX:1,aimY:0,down:false,...i};for(let k=0;k<n;k++)g.tick(1/60);};
                window.warp=(x,y)=>{const p=g.players[0];p.x=x;p.y=y;p.vx=0;p.vy=0;p.body.setTranslation({x,y,z:0},true);g.world.step();};
            }""")

            def flight():
                data = page.evaluate(
                    """() => {const g=__GAME__;g.start(1);step(90,{fly:true});const top=g.players[0].y;step(180);return {top,y:g.players[0].y,grounded:g.players[0].grounded,power:g.players[0].energy};}"""
                )
                expect(data["top"] > 7, str(data))
                expect(3.9 < data["y"] < 4.3 and data["grounded"], str(data))
                expect(data["power"] < 100, str(data))

            check(
                "physical rotor lift, gravity, grounding and power consumption", flight
            )

            def collision():
                data = page.evaluate(
                    """() => {__GAME__.start(1);step(200,{x:1});return __GAME__.inspect();}"""
                )
                expect(9.5 < data["players"][0]["x"] < 10.1, str(data["players"]))
                expect(data["walls"][0]["alive"])

            check("Rapier barricade prevents walking through rock", collision)

            def bomb():
                data = page.evaluate(
                    """() => {const g=__GAME__;g.start(1);warp(8.8,4.1);g.players[0].invuln=0;g.plant(g.players[0]);warp(5,4.1);step(110);return g.inspect();}"""
                )
                expect(not data["walls"][0]["alive"], str(data))
                expect(
                    data["score"] == 150,
                    "new shift did not reset score: " + str(data["score"]),
                )
                expect(data["players"][0]["bombs"] == 5, str(data))
                expect(data["players"][0]["health"] == 3, str(data))
                expect(data["score"] >= 150, str(data))

            check("timed dynamite opens barricade; retreat avoids own blast", bomb)

            def self_blast():
                data = page.evaluate(
                    """() => {const g=__GAME__;g.start(1);step(100);g.plant(g.players[0]);step(100);return g.inspect();}"""
                )
                expect(data["players"][0]["health"] < 3, str(data))

            check("dynamite has self-damage and a visible warning radius", self_blast)

            def laser():
                data = page.evaluate(
                    """() => {const g=__GAME__;g.start(1);warp(8.8,4.1);step(190,{fire:true});return g.inspect();}"""
                )
                expect(not data["walls"][0]["alive"], str(data))
                expect(data["players"][0]["bombs"] == 6, str(data))

            check("continuous helmet laser melts walls without dynamite", laser)

            def lamp():
                data = page.evaluate(
                    """() => {const g=__GAME__;g.start(1);warp(5,6.28);g.players[0].vy=0;g.laser(g.players[0],{aimX:1,aimY:0});g.updateVisual(.016);return {alive:g.lamps[0].alive,dark:+document.getElementById('darkness').style.opacity};}"""
                )
                expect(not data["alive"], str(data))
                expect(data["dark"] > 0, str(data))

            check("shooting a lamp creates a dark headlamp-lit zone", lamp)

            def critters():
                data = page.evaluate(
                    """() => {const g=__GAME__;g.start(1);const e=g.enemies[0];e.x=6;e.y=4.82;e.bx=6;e.by=4.82;warp(3,4.1);g.laser(g.players[0],{aimX:1,aimY:0});return {dead:!e.alive,score:g.totalScore()};}"""
                )
                expect(data["dead"] and data["score"] >= 75, str(data))

            check("laser defeats a critter and awards score", critters)

            def hazards():
                data = page.evaluate(
                    """() => {const g=__GAME__;g.start(1);warp(35.5,-8);g.players[0].invuln=0;step(2);return g.inspect();}"""
                )
                expect(data["lives"] == 3, str(data))
                expect(data["players"][0]["x"] < 5, str(data))

            check("lava consumes a reserve and restores at checkpoint", hazards)

            def raft():
                data = page.evaluate(
                    """() => {const g=__GAME__;g.start(1);g.loadLevel(2);const f=g.rafts[0];warp(f.x,f.y+f.h*.19+.9);g.players[0].invuln=9;step(120);return {px:g.players[0].x,fx:f.x,health:g.players[0].health,moved:f.x-f.bx};}"""
                )
                expect(data["moved"] > 1, str(data))
                expect(abs(data["px"] - data["fx"]) < 1.5, str(data))
                expect(data["health"] == 3, str(data))

            check("kinematic heat-proof raft carries a grounded pilot", raft)

            def rescue():
                data = page.evaluate(
                    """() => {const g=__GAME__;g.start(1);warp(44,-8.1);g.players[0].energy=40;step(60);return g.inspect();}"""
                )
                expect(
                    data["state"] == "intermission" and data["rescued"] == 1, str(data)
                )
                expect(data["players"][0]["energy"] > 60, str(data))
                expect(data["score"] >= 1000, str(data))
                page.evaluate("__GAME__.updateVisual(.016);__GAME__.art.render()")

            check("automatic miner rescue, equipment bonus and descent debrief", rescue)

            def coop():
                data = page.evaluate(
                    """() => {const g=__GAME__;g.start(2);step(30);return g.inspect();}"""
                )
                expect(
                    len(data["players"]) == 2 and data["state"] == "playing", str(data)
                )
                expect(data["players"][0]["id"] != data["players"][1]["id"])

            check("standalone two-pilot shared-screen co-op", coop)

            def physical_campaign():
                data = page.evaluate("""() => {
                  const g=__GAME__;g.start(1);g.tuning.invincible=true;let stage=0,hold=0,lastLevel=0,ticks=0;const logs=[];
                  g.getInput=p=>{
                    const route=g.level.script,s=route[Math.min(stage,route.length-1)],dx=s[0]-p.x,dy=s[1]-p.y;
                    const i={x:Math.max(-1,Math.min(1,dx*1.2)),fly:p.vy<Math.max(-6,Math.min(5,dy*4)),fire:true,bomb:false,aimX:p.face,aimY:0,down:false};
                    const wall=g.walls.find(w=>w.alive&&Math.abs(w.x-p.x)<5&&Math.abs(w.y-p.y)<w.h/2+1);
                    if(wall){i.aimX=Math.sign(wall.x-p.x);i.aimY=0;}
                    if(Math.hypot(dx,dy)<.65){hold+=1/60;if(s[2]==='bomb'&&hold<.02)i.bomb=true;const wait=s[2]==='wait'?1.9:s[2]==='raft'?1.1:.7;if(hold>wait){stage++;hold=0;}}
                    else hold=0;
                    if(stage>=route.length){const m=g.miners.find(m=>!m.rescued);if(m){i.x=Math.max(-1,Math.min(1,(m.x-p.x)*1.2));i.fly=p.vy<Math.max(-6,Math.min(5,(m.y-p.y)*4));}}
                    return i;
                  };
                  while(ticks++<40000&&g.state!=='victory'){
                    if(g.state==='intermission'){logs.push({level:g.levelIndex,ticks,stage});g.nextLevel();stage=0;hold=0;}
                    g.tick(1/60);
                  }
                  return {ticks,stage,logs,...g.inspect()};
                }""")
                (OUT / "physical-campaign.json").write_text(json.dumps(data, indent=2))
                expect(data["state"] == "victory" and data["rescued"] == 8, str(data))

            check(
                "physical campaign route with collisions enabled and test invulnerability",
                physical_campaign,
            )

            def campaign():
                data = page.evaluate("""() => {
                  const g=__GAME__;g.getInput=p=>g.aiInput(p);g.start(1,true);let ticks=0;const visits=new Set();
                  while(ticks++<30000&&g.state!=='victory'){visits.add(g.levelIndex);g.tick(1/60);}
                  return {ticks,visits:[...visits],...g.inspect()};
                }""")
                expect(data["state"] == "victory" and data["rescued"] == 8, str(data))
                expect(len(data["visits"]) == 4, str(data))
                expect(data["score"] > 8000, str(data))
                (OUT / "campaign.json").write_text(json.dumps(data, indent=2))
                page.evaluate("__GAME__.updateVisual(.016);__GAME__.art.render()")

            check(
                "scripted complete four-descent attract playthrough / all eight miners",
                campaign,
            )

        if args.suite in ["smoke", "all"]:

            def recovery():
                before = page.evaluate(
                    "({level:__GAME__.levelIndex,total:__GAME__.totalRescued})"
                )
                page.evaluate("__GAME__.art.gpuDevice.destroy()")
                page.wait_for_function(
                    "__GAME__.art.backend==='WebGL2' && !__GAME__.art.recovering",
                    timeout=15000,
                )
                expect(page.evaluate("__GAME__.levelIndex") == before["level"])
                expect(page.evaluate("__GAME__.totalRescued") == before["total"])
                expect(page.evaluate("__GAME__.art.recoveries") == 1)

            check("GPU device-loss recovery preserves the current shift", recovery)

        check(
            "no standalone JavaScript or rendering errors",
            lambda: expect(not errors, "\n".join(errors[:8])),
        )

    def metadata():
        interview = json.loads((ROOT.parent / "exit-interview.json").read_text())
        expect(
            set(interview)
            == {
                "sourceInformation",
                "testingFeedback",
                "engineFeedback",
                "promptFeedback",
                "aiHub",
            }
        )
        expect(
            len(interview["testingFeedback"]) == 4
            and len(interview["engineFeedback"]) == 6
            and len(interview["promptFeedback"]) == 4
        )
        expect(interview["sourceInformation"]["usage"] == "added on import")
        expect(all(str(v).strip() for v in interview["sourceInformation"].values()))
        expect(
            page.evaluate("window.__HERO_INFO__") == interview,
            "in-game About data differs from the exit interview",
        )
        html = (ROOT / "dist/index.html").read_text()
        session = (ROOT / "research/session.js").read_text()
        expect(
            "<script>" + session + "</script>" in html,
            "Hub client is not embedded verbatim",
        )
        expect(
            'src="http' not in html and 'src="./' not in html,
            "external script dependency",
        )

    check(
        "exit interview schema, in-game credits and unmodified embedded Hub client",
        metadata,
    )
    page.close()

    if args.suite in ["smoke", "all"]:

        def touch():
            context = browser.new_context(
                viewport={"width": 844, "height": 390},
                is_mobile=True,
                has_touch=True,
                device_scale_factor=1,
            )
            p = context.new_page()
            p.goto(url)
            p.wait_for_function("document.body.dataset.ready==='true'", timeout=60000)
            p.locator('[data-action="solo"]').tap()
            p.touchscreen.tap(700, 260)
            expect(p.evaluate("__GAME__.touch.active"), "touch mode did not activate")
            expect(p.locator("#touch-menu").is_visible())
            expect(not p.locator("#controls-strip").is_visible())
            p.evaluate(
                """() => {const g=__GAME__;g.manual=true;window.touchStartX=g.players[0].x;document.getElementById('game').dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',pointerId:21,clientX:130,clientY:290,bubbles:true}));document.dispatchEvent(new PointerEvent('pointermove',{pointerType:'touch',pointerId:21,clientX:220,clientY:290,bubbles:true}));document.getElementById('game').dispatchEvent(new PointerEvent('pointerdown',{pointerType:'touch',pointerId:22,clientX:730,clientY:290,bubbles:true}));for(let k=0;k<55;k++)g.tick(1/60);}"""
            )
            expect(
                p.evaluate(
                    "__GAME__.players[0].x>touchStartX+1 && __GAME__.players[0].y>5"
                ),
                "multitouch move and flight did not act together",
            )
            p.evaluate(
                "document.dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',pointerId:21,bubbles:true}));document.dispatchEvent(new PointerEvent('pointerup',{pointerType:'touch',pointerId:22,bubbles:true}));__GAME__.manual=false"
            )
            p.screenshot(path=str(OUT / "touch.png"))
            context.close()

        check("touch profile, invisible controls and minimal HUD", touch)

    if args.suite in ["visual", "all"]:

        def visual():
            context = browser.new_context(viewport={"width": 1920, "height": 1080})
            p = context.new_page()
            p.goto(url)
            p.wait_for_function("document.body.dataset.ready==='true'", timeout=60000)
            p.evaluate("__GAME__.idleAt=performance.now()+100000")
            p.wait_for_timeout(1500)
            p.screenshot(path=str(OUT / "title.png"))
            p.locator('[data-action="solo"]').click()
            p.wait_for_timeout(1000)
            p.screenshot(path=str(OUT / "gameplay.png"))
            p.evaluate(
                "__GAME__.loadLevel(2);const p=__GAME__.players[0];p.x=35;p.y=-6;p.body.setTranslation({x:35,y:-6,z:0},true);__GAME__.art.cameraAt(34,-4,1,true)"
            )
            p.wait_for_timeout(500)
            p.screenshot(path=str(OUT / "river.png"))
            context.close()

        check("WebGPU visual captures at TV resolution", visual)

    if args.suite in ["hub", "all"]:
        handler = functools.partial(Quiet, directory=str(ROOT / "dist"))
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        host = f"http://127.0.0.1:{server.server_port}"

        def world_sync():
            context = browser.new_context(viewport={"width": 1280, "height": 720})
            p = context.new_page()
            try:
                p.goto(
                    host + "/harness.html?game=index.html&players=2&limit=120",
                    wait_until="domcontentloaded",
                )
                p.wait_for_function(
                    "document.querySelectorAll('iframe').length===2 && [...document.querySelectorAll('iframe')].every(f=>f.contentWindow.__GAME__?.ready)",
                    polling=100,
                    timeout=60000,
                )
                p.locator("#release").click()
                frames = [f for f in p.frames[1:] if "index.html" in f.url]
                host_frame = next(f for f in frames if f.evaluate("__GAME__.authority"))
                client_frame = next(
                    f for f in frames if not f.evaluate("__GAME__.authority")
                )
                host_frame.wait_for_function(
                    "__GAME__.state==='playing' && AIHub.time()>=0",
                    polling=100,
                    timeout=15000,
                )
                cid = client_frame.evaluate("AIHub.me")
                before = host_frame.evaluate(
                    "(id)=>__GAME__.players.find(p=>p.id===id).x", cid
                )
                client_frame.evaluate("__GAME__.keys.add('KeyD')")
                host_frame.wait_for_function(
                    "(args)=>__GAME__.players.find(p=>p.id===args.id).x > args.x+.5",
                    arg={"id": cid, "x": before},
                    polling=100,
                    timeout=15000,
                )
                client_frame.evaluate("__GAME__.keys.delete('KeyD')")
                after = host_frame.evaluate(
                    "(id)=>__GAME__.players.find(p=>p.id===id).x", cid
                )
                host_frame.evaluate(
                    """id=>{const g=__GAME__,p=g.players.find(p=>p.id===id),m=g.miners[0];p.x=m.x;p.y=m.y;p.vx=0;p.vy=0;p.body.setTranslation({x:p.x,y:p.y,z:0},true);p.invuln=5;g.remoteInputs.set(id,{x:0,fly:false,fire:false,bomb:false,aimX:1,aimY:0});}""",
                    cid,
                )
                p.wait_for_function(
                    "[...document.querySelectorAll('iframe')].every(f=>f.contentWindow.__GAME__.totalRescued>=1)",
                    polling=100,
                    timeout=15000,
                )
                data = [f.evaluate("__GAME__.inspect()") for f in frames]
                (OUT / "hub-world-sync.json").write_text(
                    json.dumps(
                        {"before": before, "after": after, "copies": data}, indent=2
                    )
                )
                expect(all(d["rescued"] == 1 for d in data), str(data))
                p.locator("#timeup").click()
                p.wait_for_function(
                    "[...document.querySelectorAll('iframe')].every(f=>f.contentWindow.__GAME__.hubEnded)",
                    polling=100,
                    timeout=12000,
                )
            except Exception:
                debug = []
                for f in p.frames[1:]:
                    if "index.html" in f.url:
                        with contextlib.suppress(Exception):
                            debug.append(
                                f.evaluate(
                                    "({info:__GAME__?.inspect(),keys:[...__GAME__.keys],remote:[...__GAME__.remoteInputs],me:AIHub.me,time:AIHub.time()})"
                                )
                            )
                (OUT / "hub-sync-debug.json").write_text(
                    json.dumps(
                        {"frames": debug, "log": p.locator("#log").inner_text()},
                        indent=2,
                    )
                )
                raise
            finally:
                context.close()

        check(
            "remote input moves authoritative world and rescue replicates to both pilots",
            world_sync,
        )

        try:
            for players, scenario, network in [
                (2, "standard", ""),
                (4, "standard", "&latency=150&jitter=50&loss=5"),
                (4, "host-leave", "&latency=150&jitter=50&loss=5"),
                (2, "server", ""),
            ]:

                def hub_check(players=players, scenario=scenario, network=network):
                    context = browser.new_context(
                        viewport={"width": 1600, "height": 900}
                    )
                    p = context.new_page()
                    found = p.request.get(host + "/index.html").text()
                    expect(
                        "<title>H.E.R.O. After Hours</title>" in found,
                        "server is not this game",
                    )
                    p.goto(
                        host
                        + f"/harness.html?game=index.html&players={players}&auto=1&limit=16&scenario={scenario}"
                        + network
                    )
                    p.wait_for_function(
                        "document.body.dataset.complete==='true'", timeout=150000
                    )
                    report = p.evaluate("window.__hubCheck")
                    (OUT / f"hub-{players}-{scenario}.json").write_text(
                        json.dumps(report, indent=2)
                    )
                    expect(
                        report["pass"],
                        "\n".join(
                            c["name"] + ": " + str(c.get("detail", ""))
                            for c in report["checks"]
                            if not c["pass"]
                        ),
                    )
                    # Network state is concrete, not merely a protocol hello.
                    if scenario == "standard":
                        data = [
                            f.evaluate("window.__GAME__?.inspect()")
                            for f in p.frames[1:]
                            if "index.html" in f.url
                        ]
                        expect(len(data) >= 2, str(data))
                        expect(
                            all(
                                d["network"]["received"] > 0
                                and d["network"]["sent"] > 0
                                for d in data
                                if d
                            ),
                            str(data),
                        )
                    context.close()

                check(
                    f"AI Hub {players} players / {scenario}"
                    + (" / loss-latency-jitter" if network else ""),
                    hub_check,
                )
                for ctx in list(browser.contexts):
                    ctx.close()
        finally:
            for ctx in list(browser.contexts):
                ctx.close()
            server.shutdown()
            server.server_close()
    browser.close()

passed = sum(r["pass"] for r in results)
report = {"passed": passed, "total": len(results), "results": results, "errors": errors}
(OUT / "results.json").write_text(json.dumps(report, indent=2))
print(f"{passed}/{len(results)} checks passed; {len(results) - passed} failures")
raise SystemExit(0 if passed == len(results) else 1)
