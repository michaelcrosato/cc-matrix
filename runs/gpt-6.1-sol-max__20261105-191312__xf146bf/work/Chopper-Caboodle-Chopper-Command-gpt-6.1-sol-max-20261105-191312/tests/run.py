"""One command: npm test. Only failed assertions and the final count are printed."""

import json
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "tests" / "artifacts"
ART.mkdir(exist_ok=True)
RUNTIME = ROOT / "tests" / ".runtime"
RUNTIME.mkdir(exist_ok=True)
os.environ["TMPDIR"] = str(RUNTIME)
GPU_ONLY = "--gpu-only" in sys.argv
passed = 0
failed = []
details = {}


def check(name, condition, detail=""):
    global passed
    (ART / "progress.json").write_text(
        json.dumps({"last": name, "passed": passed, "failed": failed})
    )
    if condition:
        passed += 1
    else:
        failed.append({"name": name, "detail": str(detail)})
        print("FAIL: " + name + (": " + str(detail) if detail else ""), flush=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(
    ("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT))
)
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()
BASE = "http://127.0.0.1:" + str(server.server_port)
PAD = """window.testPads=[];navigator.getGamepads=()=>window.testPads;
window.setPad=(index,axes=[0,0,0,0],pressed=[])=>{window.testPads[index]={id:'Test DualSense',index,connected:true,mapping:'standard',axes,buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),touched:pressed.includes(i),value:pressed.includes(i)?1:0})),timestamp:performance.now()};};"""
COMPAT = "Object.defineProperty(navigator,'gpu',{get:()=>undefined,configurable:true});"


def snap(page):
    return page.evaluate("window.__caboodleTest.snapshot()")


def boot(page, url=None):
    page.goto(url or BASE + "/index.html")
    page.wait_for_function(
        'window.__caboodle?.ready || !document.querySelector("#error").hidden',
        timeout=90000,
    )
    check(
        "Game boots: " + str(page.url).split("/")[-1],
        page.evaluate("!!window.__caboodle?.ready"),
        page.locator("#error-text").text_content(),
    )
    page.evaluate(
        "window.__caboodle.input.lastActivity=Infinity;__caboodle.gfx.renderer.setSize(Math.round(innerWidth/2),Math.round(innerHeight/2),false)"
    )


def fixture(page):
    page.evaluate(
        """()=>{const a=window.__caboodle;a.start();a.game.god=true;const g=a.game;for(const e of [...g.enemies,...g.bullets])g.remove(e);g.enemies=[];g.bullets=[];g.spawnTimer=99999;g.spawnLeft=99;return true;}"""
    )


def advance(page, seconds, controls=None, ai=False):
    if ai:
        return page.evaluate("(s)=>window.__caboodleTest.advance(s,true)", seconds)
    return page.evaluate(
        """({s,c})=>{const g=window.__caboodle.game;for(let i=0;i<Math.ceil(s*60)&&g.running;i++)g.step(1/60,[c||{},{}]);return g.snapshot();}""",
        {"s": seconds, "c": controls},
    )


def pad(page, pressed=None, axes=None, index=0):
    pressed = pressed or []
    page.evaluate("([i,a,b])=>setPad(i,a,b)", [index, axes or [0, 0, 0, 0], pressed])
    page.wait_for_function(
        "([i,b])=>{const v=__caboodle.input.padPrev.get(i);return v && v.every((p,n)=>p===b.includes(n));}",
        arg=[index, pressed],
        timeout=10000,
    )


def pad_tap(page, button):
    pad(page, [button])
    pad(page)


try:
    with sync_playwright() as p:
        if not GPU_ONLY:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--use-angle=swiftshader",
                    "--enable-unsafe-swiftshader",
                    "--disable-gpu-watchdog",
                    "--autoplay-policy=no-user-gesture-required",
                ],
            )
            context = browser.new_context(
                viewport={"width": 1920, "height": 1080}, device_scale_factor=1
            )
            context.add_init_script(COMPAT)
            context.add_init_script(PAD)
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on(
                "console",
                lambda m: errors.append(m.text) if m.type == "error" else None,
            )
            boot(page)
            check(
                "The served page is Chopper Caboodle",
                page.title().startswith("Chopper Caboodle"),
            )
            check("Pinned Rapier 0.19.3", snap(page)["physics"] == "0.19.3")
            check("Music defaults to 10%", snap(page)["settings"]["music"] == 0.1)
            check(
                "Compatibility rendering boots",
                snap(page)["backend"] == "WebGL 2 compatibility",
            )
            page.screenshot(path=str(ART / "title-1920.png"))

            page.evaluate(
                "window.__caboodle.input.lastActivity=performance.now()-10001"
            )
            page.wait_for_function('window.__caboodle.screen==="attract"')
            check(
                "Ten seconds of menu inactivity starts AI attract flight",
                snap(page)["demo"],
            )
            advance(page, 70, ai=True)
            check(
                "Attract flight reaches boss sector",
                snap(page)["sector"] == 2,
                snap(page),
            )
            page.keyboard.press("z")
            page.wait_for_function('window.__caboodle.screen==="title"')
            check("Any input exits attract mode to title", not snap(page)["running"])

            page.locator("#title [data-action=solo]").click()
            check(
                "Scramble launches a live patrol",
                snap(page)["running"] and len(snap(page)["trucks"]) == 3,
            )
            check(
                "Starting a new patrol clears any old boss state",
                snap(page)["boss"] is None,
            )
            x = snap(page)["players"][0]["x"]
            page.keyboard.down("d")
            page.wait_for_function(
                "(x)=>__caboodle.game.players[0].x>x+1", arg=x, timeout=10000
            )
            page.keyboard.up("d")
            check(
                "Keyboard flight moves the physics body",
                snap(page)["players"][0]["x"] > x + 1,
            )
            page.mouse.move(100, 300)
            page.wait_for_timeout(150)
            check(
                "Mouse aims and reverses the aircraft",
                snap(page)["players"][0]["face"] == -1,
            )
            page.keyboard.press("e")
            page.wait_for_function("__caboodle.game.metrics.rockets>=1", timeout=10000)
            check(
                "A short rocket key tap is buffered",
                snap(page)["metrics"]["rockets"] >= 1,
            )
            page.keyboard.press("q")
            page.wait_for_function("__caboodle.game.metrics.flares>=1", timeout=10000)
            check(
                "A short flare key tap is buffered",
                snap(page)["metrics"]["flares"] >= 1,
            )
            page.keyboard.press("Escape")
            before = snap(page)["time"]
            page.wait_for_timeout(200)
            check(
                "Pause freezes standalone simulation",
                snap(page)["time"] == before and snap(page)["screen"] == "pause",
            )
            page.locator("#pause [data-action=dev]").click()
            slider = page.locator("[data-config=speed]")
            slider.evaluate(
                "e=>{e.value='24';e.dispatchEvent(new Event('input',{bubbles:true}));}"
            )
            check(
                "Developer sliders change live flight balance",
                snap(page)["config"]["speed"] == 24,
            )
            page.locator("[data-action=resetDev]").click()
            check(
                "Developer reset restores all balance values",
                snap(page)["config"]
                == {
                    "speed": 17,
                    "fireRate": 9,
                    "weaponDamage": 1,
                    "incoming": 1,
                    "spawnRate": 1,
                    "rocketCooldown": 1.2,
                },
            )
            page.locator("#dev [data-action=back]").click()
            page.locator("#pause [data-action=options]").click()
            page.locator("[data-action=glyphs]").click()
            check(
                "Xbox glyph preference is available",
                snap(page)["settings"]["glyphs"] == "xbox",
            )
            page.locator("[data-action=resetSettings]").click()
            page.locator("#options [data-action=back]").click()
            page.locator("#pause [data-action=resume]").click()

            fixture(page)
            page.evaluate(
                "()=>{const g=__caboodle.game,p=g.players[0];g.spawnEnemy('turret',p.x+13,p.y);}"
            )
            state = advance(page, 2.5, {"fire": True, "aimX": 1, "aimY": 0})
            check(
                "Rapier projectile contacts cause enemy destruction and score",
                state["metrics"]["physicsContacts"] > 0
                and state["metrics"]["kills"] >= 1
                and state["score"] >= 250,
                state,
            )
            check("Gunfire produces registered hits", state["metrics"]["hits"] >= 9)
            fixture(page)
            page.evaluate(
                "()=>{const g=__caboodle.game,p=g.players[0];g.spawnEnemy('turret',p.x+17,p.y);g.spawnEnemy('turret',p.x+20,p.y);g.rocket(p);}"
            )
            state = advance(page, 1.4)
            hp = page.evaluate("__caboodle.game.enemies.map(e=>e.hp)")
            check(
                "Homing rocket has splash damage",
                len(hp) == 2 and all(h < 9 for h in hp),
                hp,
            )
            page.evaluate(
                "()=>{const g=__caboodle.game,p=g.players[0];g.projectile(p.x+8,p.y,-1,0,'hostile',true);g.flare(p);}"
            )
            check(
                "Flares clear nearby hostile missiles",
                page.evaluate(
                    '__caboodle.game.bullets.filter(b=>!b.removed&&b.team==="hostile").length'
                )
                == 0,
            )
            page.evaluate(
                "()=>{const g=__caboodle.game,p=g.players[0],c=g.crew[0];p.x=c.x;p.y=5;p.vx=0;p.vy=0;p.body.setTranslation({x:p.x,y:p.y,z:0},true);}"
            )
            state = advance(page, 2)
            check(
                "A low steady hover rescues crew and awards points",
                state["metrics"]["rescued"] == 1 and state["score"] >= 400,
            )
            page.evaluate(
                "()=>{const g=__caboodle.game,p=g.players[0];p.x=__caboodle.gfx.pad.position.x;p.y=4;p.vx=0;p.vy=0;p.hp=30;p.rockets=0;p.flares=0;p.body.setTranslation({x:p.x,y:p.y,z:0},true);}"
            )
            state = advance(page, 2)
            check(
                "Field pad repairs and fully rearms",
                state["players"][0]["hp"] > 65
                and state["players"][0]["rockets"] == 5
                and state["players"][0]["flares"] == 3
                and state["metrics"]["padsUsed"] >= 1,
                state,
            )

            fixture(page)
            page.evaluate(
                "()=>{const g=__caboodle.game;g.god=false;g.players[0].invuln=0;g.damage(g.players[0],200);}"
            )
            state = advance(page, 2.6)
            check(
                "A lost aircraft respawns using a reserve",
                state["metrics"]["respawns"] == 1 and state["players"][0]["hp"] == 100,
            )
            page.evaluate(
                "()=>{const g=__caboodle.game;g.god=false;for(const t of g.trucks)g.damage(t,999);}"
            )
            advance(page, 0.02)
            check(
                "Losing every truck ends the patrol",
                snap(page)["completed"]
                and not snap(page)["won"]
                and snap(page)["screen"] == "result",
            )
            page.locator("#result-next").click()
            check(
                "Retry starts a clean patrol",
                snap(page)["running"]
                and snap(page)["score"] == 0
                and len(snap(page)["trucks"]) == 3,
            )

            page.evaluate("__caboodle.action('title')")
            pad(page)
            pad_tap(page, 0)
            check(
                "Standard controller Cross starts patrol",
                snap(page)["screen"] == "play" and snap(page)["input"] == "gamepad",
            )
            x = snap(page)["players"][0]["x"]
            pad(page, axes=[1, 0, 0, 0])
            page.wait_for_function(
                "(x)=>__caboodle.game.players[0].x>x+1", arg=x, timeout=10000
            )
            pad(page)
            check("Standard left stick flies", snap(page)["players"][0]["x"] > x + 1)
            pad_tap(page, 2)
            check(
                "Controller Square fires homing rocket",
                snap(page)["metrics"]["rockets"] >= 1,
            )
            pad(page, [8, 9])
            check(
                "Create plus Options is reserved for the Hub",
                snap(page)["screen"] == "play",
            )
            pad(page)
            pad_tap(page, 9)
            check("Options opens pause", snap(page)["screen"] == "pause")
            pad_tap(page, 13)
            check(
                "D-pad changes menu focus",
                page.locator("#pause [data-action=school]").evaluate(
                    'e=>e.classList.contains("focused")'
                ),
                page.evaluate(
                    '({focus:[...document.querySelectorAll(".focused")].map(e=>e.dataset.action),repeat:__caboodle.input.menuRepeat,screen:__caboodle.screen})'
                ),
            )
            pad_tap(page, 1)
            check("Circle backs out of pause", snap(page)["screen"] == "play")
            page.evaluate("__caboodle.action('title')")
            page.locator("#title [data-action=coop]").click()
            page.locator("[data-action=startCoop]").click()
            y = snap(page)["players"][1]["y"]
            page.keyboard.down("i")
            page.wait_for_function(
                "(y)=>__caboodle.game.players[1].y>y+1", arg=y, timeout=10000
            )
            page.keyboard.up("i")
            check(
                "Standalone couch co-op has an independent second pilot",
                len(snap(page)["players"]) == 2
                and snap(page)["players"][1]["y"] > y + 1,
            )
            pad(page, axes=[0, -1, 0, 0], index=1)
            y = snap(page)["players"][1]["y"]
            page.wait_for_function(
                "(y)=>__caboodle.game.players[1].y>y+.5", arg=y, timeout=10000
            )
            pad(page, index=1)
            check(
                "Second standard gamepad controls the second pilot",
                snap(page)["players"][1]["y"] > y + 0.5,
            )
            page.evaluate("window.testPads=[]")

            page.evaluate("__caboodle.start('training')")
            state = advance(page, 150, ai=True)
            details["training"] = state
            check(
                "Full interactive flight school completes",
                state["completed"] and state["won"],
                state,
            )
            check(
                "Flight school exercises guns, rockets, flares and rescue",
                state["metrics"]["kills"] >= 2
                and state["metrics"]["rockets"] >= 1
                and state["metrics"]["flares"] >= 1
                and state["metrics"]["rescued"] >= 1,
                state["metrics"],
            )
            page.evaluate("()=>{__caboodle.start();__caboodle.game.god=true;}")
            state = advance(page, 360, ai=True)
            details["campaign"] = state
            details["campaignEvents"] = page.evaluate("__caboodleTest.events()")
            check(
                "Scripted campaign clears every sector and wins",
                state["completed"] and state["won"] and state["sector"] == 2,
                state,
            )
            check(
                "Campaign reaches and defeats the boss and second phase",
                any(e["type"] == "bossDefeated" for e in details["campaignEvents"])
                and any(e["type"] == "bossPhase" for e in details["campaignEvents"]),
            )
            check(
                "Campaign covers rescue, missiles, countermeasures and convoy survival",
                state["metrics"]["rescued"] >= 2
                and state["metrics"]["rockets"] >= 3
                and state["metrics"]["flares"] >= 1
                and any(t["hp"] > 0 for t in state["trucks"]),
                state["metrics"],
            )
            page.screenshot(path=str(ART / "campaign-result.png"))
            page.evaluate(
                "()=>{__caboodle.start();__caboodle.game.god=true;__caboodle.game.beginSector(2);}"
            )
            page.wait_for_timeout(500)
            page.screenshot(path=str(ART / "boss-1920.png"))
            page.evaluate(
                "()=>{__caboodle.audio.play('rocket');__caboodle.audio.play('boom');__caboodle.audio.voice();}"
            )
            page.wait_for_timeout(120)
            audio = page.evaluate("__caboodleTest.audio()")
            details["audio"] = audio
            check(
                "Procedural audio produces a nonzero signal",
                audio["state"] == "running" and audio["level"] > 0.00001,
                audio,
            )
            check(
                "Procedural music is scheduled at default 10% gain",
                audio["musicNotes"] > 0 and abs(audio["musicGain"] - 0.1) < 0.005,
                audio,
            )
            page.evaluate("__caboodle.action('title');__caboodle.action('credits')")
            check(
                "In-game credits include all four required feedback sections",
                all(
                    page.locator("#credits-body").get_by_text(t, exact=True).count()
                    == 1
                    for t in [
                        "Source Information",
                        "Testing Feedback",
                        "Engine Feedback",
                        "Prompt Feedback",
                    ]
                ),
            )
            pad(page, axes=[0, 1, 0, 0])
            page.wait_for_function(
                'document.querySelector("#credits-body").scrollTop>0', timeout=10000
            )
            check(
                "Controller scrolls the credits",
                page.locator("#credits-body").evaluate("e=>e.scrollTop") > 0,
            )
            pad(page)
            check(
                "Desktop session has no JavaScript or console errors",
                len(errors) == 0,
                errors,
            )
            details["desktopErrors"] = errors
            context.close()

            touch_context = browser.new_context(**p.devices["Pixel 7"])
            touch_context.add_init_script(COMPAT)
            touch_page = touch_context.new_page()
            boot(touch_page)
            touch_page.screenshot(path=str(ART / "touch-title.png"))
            box = touch_page.locator("#title [data-action=solo]").bounding_box()
            touch_page.touchscreen.tap(
                box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
            )
            check(
                "Touch launches the same patrol screen",
                snap(touch_page)["screen"] == "play"
                and snap(touch_page)["input"] == "touch",
            )
            touch_page.evaluate("__caboodle.game.god=true")
            cdp = touch_context.new_cdp_session(touch_page)
            w = touch_page.viewport_size["width"]
            h = touch_page.viewport_size["height"]
            x, y = w * 0.22, h * 0.65
            old = snap(touch_page)["players"][0]
            cdp.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchStart",
                    "touchPoints": [
                        {"x": x, "y": y, "id": 1},
                        {"x": w * 0.8, "y": h * 0.6, "id": 2},
                    ],
                },
            )
            cdp.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchMove",
                    "touchPoints": [
                        {"x": x + 55, "y": y - 45, "id": 1},
                        {"x": w * 0.8, "y": h * 0.6, "id": 2},
                    ],
                },
            )
            touch_page.wait_for_timeout(500)
            cdp.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )
            state = snap(touch_page)
            check(
                "Invisible touch stick supports multitouch flight",
                state["players"][0]["x"] > old["x"] + 1
                and state["players"][0]["y"] > old["y"] + 1,
                state,
            )
            check("Touch automatically aims and fires", state["metrics"]["shots"] > 0)
            touch_page.evaluate(
                "()=>{const g=__caboodle.game,p=g.players[0],e=g.spawnEnemy('turret',p.x+18,p.y+2);e.hp=99;e.maxHp=99;}"
            )
            touch_page.wait_for_function(
                '!document.querySelector("#touch-rocket").hidden', timeout=10000
            )
            check(
                "Touch shows a contextual rocket action",
                touch_page.locator("#touch-rocket").is_visible(),
            )
            if touch_page.locator("#touch-rocket").is_visible():
                box = touch_page.locator("#touch-rocket").bounding_box()
                touch_page.touchscreen.tap(
                    box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
                )
                touch_page.wait_for_function(
                    "__caboodle.game.metrics.rockets>=1", timeout=10000
                )
                check(
                    "Contextual touch rocket works",
                    snap(touch_page)["metrics"]["rockets"] >= 1,
                )
            touch_page.screenshot(path=str(ART / "touch-game.png"))
            touch_page.locator("#touch-menu").tap()
            check("Touch menu pauses patrol", snap(touch_page)["screen"] == "pause")
            check(
                "Touch page does not overflow horizontally",
                touch_page.evaluate("document.documentElement.scrollWidth<=innerWidth"),
            )
            touch_context.close()

            hub_context = browser.new_context(viewport={"width": 1600, "height": 1000})
            hub_context.add_init_script(COMPAT)
            hub_page = hub_context.new_page()
            for players, scenario in [
                (2, "standard"),
                (4, "standard"),
                (4, "host-leave"),
            ]:
                hub_page.goto(
                    BASE
                    + f"/harness.html?game=index.html&players={players}&latency=150&jitter=50&loss=5&auto=1&scenario={scenario}"
                )
                hub_page.wait_for_function("window.__hubCheck?.done", timeout=100000)
                report = hub_page.evaluate("window.__hubCheck")
                details[f"hub-{players}-{scenario}"] = report
                check(
                    f"AI Hub conformance: {players} players, {scenario}, 150ms / 50ms / 5% loss",
                    report["pass"],
                    [c for c in report["checks"] if not c["pass"]],
                )
            hub_context.close()

            file_context = browser.new_context(
                viewport={"width": 1280, "height": 720}, offline=True
            )
            file_context.add_init_script(COMPAT)
            file_page = file_context.new_page()
            boot(file_page, (ROOT / "index.html").as_uri())
            file_page.locator("#title [data-action=solo]").click()
            check("Single HTML runs offline from file://", snap(file_page)["running"])
            file_page.screenshot(path=str(ART / "gameplay-1280.png"))
            file_context.close()
            browser.close()

        gpu_browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--disable-gpu-watchdog",
                "--enable-unsafe-swiftshader",
                "--use-angle=swiftshader",
                "--autoplay-policy=no-user-gesture-required",
            ],
        )
        gpu_page = gpu_browser.new_page(viewport={"width": 960, "height": 540})
        boot(gpu_page)
        details["gpuInitial"] = snap(gpu_page)
        check(
            "Native WebGPU renderer initializes",
            gpu_page.evaluate(
                '__caboodle.gfx.backend==="WebGPU" || !!__caboodle.gfx.lastDeviceLoss'
            ),
            details["gpuInitial"]["backend"],
        )
        gpu_page.evaluate("__caboodle.start();__caboodle.game.god=true;")
        state = advance(gpu_page, 8, ai=True)
        check(
            "Game state advances on native WebGPU path",
            state["time"] >= 7.98 and state["metrics"]["shots"] > 0,
            state["metrics"],
        )
        gpu_page.evaluate(
            "()=>{const b=__caboodle.gfx.renderer.backend;if(b.isWebGPUBackend)b.device.destroy();}"
        )
        gpu_page.wait_for_function(
            '__caboodle.gfx.backend==="WebGL 2 compatibility" && !__caboodle.gfx.recovering',
            timeout=45000,
        )
        check(
            "Graphics recovers after a lost WebGPU device",
            gpu_page.locator("#error").is_hidden(),
        )
        gpu_browser.close()
except Exception as e:  # noqa: BLE001 -- Report any browser or test failure in one result.
    check("Test suite completed", False, str(e))
finally:
    server.shutdown()
    server.server_close()
    details["passed"] = passed
    details["failed"] = failed
    (ART / "report.json").write_text(json.dumps(details, indent=2))
    print(f"{passed} passed, {len(failed)} failed.", flush=True)
sys.exit(1 if failed else 0)
