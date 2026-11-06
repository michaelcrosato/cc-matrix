import argparse
import functools
import http.server
import json
import subprocess
import sys
import threading
import traceback
from pathlib import Path

from playwright.sync_api import sync_playwright

FOLDER = Path(__file__).resolve().parent
ROOT = FOLDER.parent
GAME = FOLDER.name + ".html"
ART = FOLDER / "artifacts"
ART.mkdir(exist_ok=True)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        return


results = []


def check(name, fn):
    try:
        fn()
        results.append({"name": name, "pass": True})
        (ART / "test-progress.json").write_text(json.dumps(results, indent=2))
        return True
    except Exception as exc:  # noqa: BLE001 -- The test runner records the complete traceback.
        message = str(exc)
        print("FAIL " + name + ": " + message, flush=True)
        results.append(
            {
                "name": name,
                "pass": False,
                "error": message,
                "trace": traceback.format_exc(),
            }
        )
        return False


def require(value, message):
    if not value:
        raise AssertionError(message)


def state(page):
    return page.evaluate("window.__game.state")


def load(page, url):
    page.goto(url, wait_until="domcontentloaded")
    page.wait_for_function("window.__game && window.__game.ready", timeout=120000)
    require(page.title() == "Raiders of the Lost Map", "Wrong game served")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--smoke", action="store_true")
    parser.add_argument("--visuals", action="store_true")
    parser.add_argument("--metadata", action="store_true")
    parser.add_argument("--reel", action="store_true")
    args = parser.parse_args()
    subprocess.run(
        [sys.executable, str(FOLDER / "build.py")], check=True, capture_output=True
    )
    check(
        "JavaScript module syntax",
        lambda: subprocess.run(
            ["node", "--check", str(FOLDER / "game.mjs")],
            check=True,
            capture_output=True,
        ),
    )
    if args.metadata:

        def schema():
            data = json.loads((ROOT / "exit-interview.json").read_text())
            require(
                set(data)
                == {
                    "sourceInformation",
                    "testingFeedback",
                    "engineFeedback",
                    "promptFeedback",
                    "aiHub",
                },
                "Exit interview keys differ",
            )
            require(
                len(data["testingFeedback"]) == 4
                and len(data["engineFeedback"]) == 6
                and len(data["promptFeedback"]) == 4,
                "Feedback questions missing",
            )
            require(
                data["sourceInformation"]["usage"] == "added on import",
                "Usage field differs",
            )
            require(
                data == json.loads((FOLDER / "credits.json").read_text()),
                "Credits and exit interview differ",
            )
            require(
                all(
                    isinstance(v, str) and v for v in data["sourceInformation"].values()
                ),
                "Empty source information",
            )

        check("Exit interview exact schema and filled fields", schema)
        check(
            "Single-file credits and pinned dependencies",
            lambda: require(
                "const CREDITS = " in (ROOT / GAME).read_text()
                and "@0.180.0" in (ROOT / GAME).read_text()
                and "@0.19.3" in (ROOT / GAME).read_text(),
                "Missing embedded metadata or pinned dependency",
            ),
        )
        (ART / "metadata-results.json").write_text(json.dumps(results, indent=2))
        print(
            str(sum(r["pass"] for r in results))
            + "/"
            + str(len(results))
            + " checks passed"
        )
        return
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = "http://127.0.0.1:" + str(server.server_port) + "/"
    (ART / "server.json").write_text(json.dumps({"url": base, "game": GAME}))
    console = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                    "--no-sandbox",
                    "--disable-background-timer-throttling",
                    "--disable-renderer-backgrounding",
                    "--disable-backgrounding-occluded-windows",
                ],
            )
            context = browser.new_context(
                viewport={"width": 1600, "height": 900}, ignore_https_errors=True
            )
            page = context.new_page()
            page.on("pageerror", lambda e: console.append(str(e)))
            page.on(
                "console",
                lambda m: (
                    console.append(m.text)
                    if m.type == "error" and "Reason: destroyed" not in m.text
                    else None
                ),
            )
            if not check("WebGPU boot", lambda: load(page, base + GAME)):
                (ART / "console.json").write_text(json.dumps(console, indent=2))
                (ART / "boot.txt").write_text(page.locator("#load-status").inner_text())
                browser.close()
                return
            check(
                "WebGPU backend",
                lambda: require(
                    page.evaluate("window.__game.backend") == "webgpu",
                    "WebGPU was not selected",
                ),
            )
            check(
                "Title and edition",
                lambda: require(
                    page.locator("#title-screen").is_visible()
                    and page.locator("h1").inner_text().replace("\n", " ")
                    == "of the LOST MAP",
                    "Title layout not visible",
                ),
            )
            check(
                "Physics world populated",
                lambda: require(
                    page.evaluate("window.__game.debug.colliderCount()") > 4,
                    "No physics world",
                ),
            )
            if args.visuals:
                page.evaluate("window.__game.render()")
                page.screenshot(path=str(ART / "title-webgpu.png"))
                load(page, base + GAME + "?renderer=webgl")
                page.evaluate("window.__game.render()")
                page.screenshot(path=str(ART / "title.png"))
                page.locator('[data-action="begin"]').click()
                page.wait_for_timeout(700)
                page.evaluate("window.__game.render()")
                page.screenshot(path=str(ART / "bazaar.png"))
            if args.reel:
                load(page, base + GAME + "?renderer=webgl")
                check(
                    "Two attract loops include every chapter and all whip crossings",
                    lambda: strict_reel(page),
                )
                page.keyboard.press("Escape")
                check(
                    "Input exits the replay",
                    lambda: require(
                        state(page)["mode"] == "title" and not state(page)["attract"],
                        "Replay did not exit",
                    ),
                )
                for index, name in [(2, "atlas-final"), (4, "descent-final")]:
                    page.evaluate("window.__game.start()")
                    page.evaluate("i=>window.__game.debug.setStage(i)", index)
                    if index == 4:
                        page.evaluate("window.__game.action('tool')")
                    page.evaluate(
                        "window.__game.debug.god(true);window.__game.step(2.2);window.__game.menu('pause')"
                    )
                    page.add_style_tag(
                        content="#stage-card,#speech,#modal{display:none!important}"
                    )
                    page.wait_for_timeout(400)
                    page.screenshot(path=str(ART / (name + ".png")))
            elif not args.smoke:
                run_tests(page, context, browser, p, base)
            check(
                "No uncaught browser errors",
                lambda: require(not console, "; ".join(console[:8])),
            )
            (ART / "console.json").write_text(json.dumps(console, indent=2))
            browser.close()
    except Exception as exc:  # noqa: BLE001 -- The test runner records the complete traceback.
        print("FAIL runner: " + str(exc), flush=True)
        results.append(
            {
                "name": "runner",
                "pass": False,
                "error": str(exc),
                "trace": traceback.format_exc(),
            }
        )
    finally:
        (ART / "console.json").write_text(json.dumps(console, indent=2))
        server.shutdown()
        server.server_close()
        (ART / ("reel-results.json" if args.reel else "test-results.json")).write_text(
            json.dumps(results, indent=2)
        )
        passed = sum(r["pass"] for r in results)
        print(str(passed) + "/" + str(len(results)) + " checks passed", flush=True)
        if passed != len(results):
            raise SystemExit(1)


def run_tests(page, context, browser, playwright, base):
    comprehensive(page, context, browser, playwright, base)


def drive(page, x, z, seconds=25):
    result = page.evaluate(
        "a => window.__game.drive(a[0],a[1],a[2],.6,true)", [x, z, seconds]
    )
    require(
        result["reached"],
        "Route blocked at " + str(result) + " heading to " + str([x, z]),
    )
    return result


def interact_at(page, x, z):
    drive(page, x, z)
    result = page.evaluate(
        "window.__game.step(.35); const used=window.__game.action('interact'); window.__game.step(.35); used"
    )
    require(result, "Interaction was not available at " + str([x, z]))
    return state(page)


def comprehensive(page, context, browser, playwright, base):
    def gpu_state():
        page.evaluate("window.__game.start()")
        before = state(page)["players"][0]["pos"]
        page.evaluate("window.__game.step(.8,{x:1,z:0})")
        after = state(page)
        require(
            after["metrics"]["physicsSteps"] >= 48
            and after["players"][0]["pos"] != before,
            "WebGPU game did not simulate movement",
        )

    check("WebGPU movement and simulation", gpu_state)
    load(page, base + GAME + "?renderer=webgl")
    check(
        "Fallback renderer",
        lambda: require(
            page.evaluate("window.__game.backend") == "webgl2", "Fallback unavailable"
        ),
    )

    def attract():
        page.evaluate("window.__game.idle()")
        page.wait_for_function("window.__game.state.attract", timeout=15000)
        require(state(page)["mode"] == "playing", "Attract did not play")
        page.keyboard.press("Escape")
        page.wait_for_function(
            "!window.__game.state.attract && window.__game.state.mode==='title'"
        )

    check("Ten-second attract and input exit", attract)

    def keyboard():
        page.keyboard.press("Enter")
        page.wait_for_function("window.__game.state.mode==='playing'")
        before = state(page)["players"][0]["pos"]
        page.keyboard.down("w")
        page.wait_for_timeout(600)
        page.keyboard.up("w")
        after = state(page)["players"][0]["pos"]
        require(
            abs(before["x"] - after["x"]) + abs(before["z"] - after["z"]) > 0.2,
            "WASD did not move",
        )
        page.keyboard.press("Escape")
        t = state(page)["time"]
        page.wait_for_timeout(300)
        require(
            state(page)["menu"] == "pause" and abs(state(page)["time"] - t) < 0.05,
            "Solo pause did not stop simulation",
        )
        page.keyboard.press("Escape")

    check("Keyboard start, movement and pause", keyboard)

    def tuning():
        page.evaluate("window.__game.menu('pause')")
        page.locator('[data-action="dev"]').click()
        page.locator('[data-slider="speed"]').fill("8.1")
        require(
            abs(state(page)["tune"]["speed"] - 8.1) < 0.01, "Live speed slider failed"
        )
        page.locator('[data-action="reset-dev"]').click()
        require(
            abs(state(page)["tune"]["speed"] - 5.2) < 0.01, "Defaults did not restore"
        )
        page.evaluate("window.__game.resume()")

    check("Pause developer tools and live sliders", tuning)

    def settings_test():
        page.evaluate("window.__game.menu('settings')")
        page.locator('[data-action="glyphs"]').click()
        require(
            state(page)["settings"]["glyphs"] == "Xbox", "Xbox symbols not selected"
        )
        page.locator('[data-action="reset-options"]').click()
        require(state(page)["settings"]["music"] == 0.1, "Music default is not 10%")
        page.evaluate("window.__game.resume()")

    check("Input glyph option and music defaults", settings_test)

    def audio_test():
        levels = page.evaluate("window.__game.audio()")
        (ART / "audio-levels.json").write_text(json.dumps(levels, indent=2))
        require(
            0.005 < levels["rms"] < 0.5 and 0 < levels["peak"] < 1,
            "Synth output silent or clipping: " + str(levels),
        )

    check("Procedural audio renders a non-silent signal", audio_test)

    page.evaluate("window.__game.start()")
    page.keyboard.press("i")

    def market():
        for x, z in [(-11, 2), (-7, -3), (-4, 6), (4, 7)]:
            drive(page, x, z)
        require(state(page)["coins"] >= 3, "Cannot collect enough coins")
        data = interact_at(page, 9, 2.7)
        require(
            data["flags"].get("flute") and data["flags"].get("shovel"),
            "Trading did not grant tools",
        )
        data = interact_at(page, 0, -9.5)
        require(data["stage"] == 1, "Temple entrance did not transition")

    if not check("Playthrough: market, combat, coins and trading", market):
        (ART / "playthrough-state.json").write_text(json.dumps(state(page), indent=2))
        return

    def temple():
        interact_at(page, 11, 8)
        require(state(page)["flags"].get("chute"), "Parachute satchel did not open")
        page.evaluate("window.__game.action('tool')")
        require(state(page)["players"][0]["flute"] > 0, "Flute did not charm snakes")
        interact_at(page, 10, -1)
        require(state(page)["seals"] == [], "Wrong seal did not reset")
        for x, z in [(-10, -1), (0, -5), (10, -1)]:
            interact_at(page, x, z)
        require(
            state(page)["flags"].get("templeSolved"),
            "Correct seal sequence did not unlock",
        )
        interact_at(page, 0, -8)
        require(state(page)["flags"].get("staff"), "Staff not recovered")
        data = interact_at(page, 0, -10)
        require(data["stage"] == 2, "Atlas entrance blocked")

    if not check("Playthrough: flute, wrong seal, seals, parachute and staff", temple):
        (ART / "playthrough-state.json").write_text(json.dumps(state(page), indent=2))
        return

    def atlas():
        interact_at(page, 0, 2.5)
        require(
            not state(page)["flags"].get("mapped"),
            "Atlas revealed without mirror solution",
        )
        for x, z in [(-9, -3), (2, -5), (10, 3)]:
            interact_at(page, x, z)
            page.evaluate("window.__game.action('interact');window.__game.step(.35)")
        data = state(page)
        require(
            data["mirrors"] == [0, 1, 2] and data["flags"].get("mapped"),
            "Mirror solution did not reveal target: " + str(data["mirrors"]),
        )
        interact_at(page, -11, 8)
        require(state(page)["stage"] == 3, "Ankh gateway failed")

    if not check("Playthrough: staff, directional mirror puzzle and ankh", atlas):
        (ART / "playthrough-state.json").write_text(json.dumps(state(page), indent=2))
        return

    def mesas():
        interact_at(page, -10.5, 5)
        page.evaluate("window.__game.step(2.1)")
        require(
            abs(state(page)["players"][0]["pos"]["x"] + 3) < 1,
            "First swing missed mesa",
        )
        interact_at(page, -1, -2)
        page.evaluate("window.__game.step(2.1)")
        interact_at(page, 8, -6)
        page.evaluate("window.__game.step(2.1)")
        require(
            state(page)["metrics"]["swings"] >= 3, "Not all three swing routes used"
        )
        target = state(page)["target"]
        if target < 2:
            interact_at(page, 10, 2)
            page.evaluate("window.__game.step(2.1)")
        if target == 0:
            interact_at(page, 4, -6)
            page.evaluate("window.__game.step(2.1)")
        x, z = [(-3, 1.5), (6, -6.5), (13, 5.5)][target]
        interact_at(page, x, z)
        require(
            state(page)["stage"] == 4 and state(page)["selectedMesa"] == target,
            "Correct mesa launch failed",
        )

    if not check("Playthrough: all mesa swings and target selection", mesas):
        (ART / "playthrough-state.json").write_text(json.dumps(state(page), indent=2))
        return

    def parachute():
        page.evaluate("window.__game.action('tool')")
        require(state(page)["players"][0]["gliding"], "Parachute did not open")
        drive(page, 7, -4)
        page.evaluate("window.__game.step(15)")
        require(state(page)["stage"] == 5, "Successful landing did not enter the Well")

    if not check("Playthrough: steerable parachute and landing", parachute):
        (ART / "playthrough-state.json").write_text(json.dumps(state(page), indent=2))
        return

    def boss():
        target = state(page)["target"]
        interact_at(page, -8 + target * 8, -2)
        require(state(page)["flags"].get("bossAwake"), "Excavation did not wake Voss")
        summary = page.evaluate("""() => {
          const g=window.__game;let guardSeen=false,exposedSeen=false,dodged=false;
          for(let i=0;i<60*60 && !g.state.flags.bossDefeated;i++){
           const s=g.state,p=s.players.find(p=>p.id===s.localId),e=s.enemies.find(e=>e.kind==='boss');
           if(!e)break;
           guardSeen ||= e.state==='windup';exposedSeen ||= e.state==='exposed';
           let dx=e.pos.x-p.pos.x,dz=e.pos.z-p.pos.z,n=Math.hypot(dx,dz)||1;
           const approach=n>2.8?1:0;
           const dodge=e.state==='windup'&&e.timer<.3;
           dodged ||= dodge;
           g.step(1/60,{x:approach*(dx*.821-dz*.571)/n,z:approach*(dx*.571+dz*.821)/n,attack:true,dodge,aim:{x:e.pos.x,z:e.pos.z}});
          }
          return {guardSeen,exposedSeen,dodged,won:g.state.flags.bossDefeated,state:g.state};
        }""")
        require(
            summary["guardSeen"]
            and summary["exposedSeen"]
            and summary["dodged"]
            and summary.get("won"),
            "Boss opening or combat failed: " + json.dumps(summary),
        )
        interact_at(page, 0, -6)
        require(
            state(page)["stage"] == 6 and state(page)["flags"].get("relic"),
            "Relic did not trigger escape",
        )

    if not check("Playthrough: excavation, guarded boss, evade and relic", boss):
        (ART / "playthrough-state.json").write_text(json.dumps(state(page), indent=2))
        return

    def escape():
        for x, z in [
            (-3, 5),
            (-3, 0),
            (3, -2),
            (3, -8),
            (-3, -10),
            (-3, -16),
            (3, -18),
            (3, -24),
            (0, -27.5),
        ]:
            drive(page, x, z, 35)
        page.evaluate("window.__game.step(.35);window.__game.action('interact')")
        data = state(page)
        require(data["won"] and data["menu"] == "victory", "Escape did not finish")
        require(page.locator(".victory-score").is_visible(), "Victory result not shown")
        (ART / "playthrough-state.json").write_text(json.dumps(data, indent=2))

    if not check("Playthrough: rubble, darts, boulder escape and victory", escape):
        (ART / "playthrough-state.json").write_text(json.dumps(state(page), indent=2))

    def checkpoint():
        page.evaluate("window.__game.start();window.__game.debug.setStage(2)")
        saved = page.evaluate("JSON.parse(localStorage.getItem('lost-map-checkpoint'))")
        require(
            saved["stage"] == 2 and saved["flags"]["staff"], "Checkpoint not persisted"
        )

    check("Checkpoint persistence", checkpoint)

    def wrong_tomb():
        page.evaluate("window.__game.debug.setStage(3)")
        wrong = (state(page)["target"] + 1) % 3
        x, z = [(-3, 1.5), (6, -6.5), (13, 5.5)][wrong]
        page.evaluate("a=>window.__game.debug.teleport(a[0],0,a[1])", [x, z])
        page.evaluate(
            "window.__game.step(.35);window.__game.action('interact');window.__game.action('tool')"
        )
        require(state(page)["stage"] == 4, "Wrong-mesa branch did not launch")
        drive(page, 7, -4)
        page.evaluate("window.__game.step(15)")
        require(
            state(page)["stage"] == 3 and state(page)["secrets"] > 0,
            "Empty tomb did not return to mesas with its reward",
        )

    check("Wrong mesa produces an optional treasure and safe return", wrong_tomb)

    def respawn_test():
        page.evaluate(
            "window.__game.start();window.__game.step(3);window.__game.debug.hurt(9);window.__game.step(3)"
        )
        data = state(page)
        require(
            data["players"][0]["hp"] == 6
            and data["players"][0]["down"] <= 0
            and data["deathCount"] >= 1,
            "Checkpoint rescue failed",
        )

    check("Defeat and checkpoint rescue", respawn_test)

    def controller():
        page.evaluate("""() => {
          window.fakePad={connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
          Object.defineProperty(navigator,'getGamepads',{value:()=>[window.fakePad]});
          window.__game.start();
        }""")
        before = state(page)["players"][0]["pos"]
        page.evaluate("window.fakePad.axes[0]=1")
        page.wait_for_timeout(700)
        page.evaluate("window.fakePad.axes[0]=0")
        after = state(page)["players"][0]["pos"]
        require(
            abs(after["x"] - before["x"]) + abs(after["z"] - before["z"]) > 0.3,
            "Gamepad stick did not move",
        )
        require(
            "□" in page.locator("#hud-hints").inner_text(),
            "PlayStation symbols not shown",
        )
        page.evaluate("window.fakePad.buttons[9]={pressed:true,value:1}")
        page.wait_for_timeout(250)
        page.evaluate("window.fakePad.buttons[9]={pressed:false,value:0}")
        require(state(page)["menu"] == "pause", "Options did not pause")
        page.evaluate("window.__game.menu('about');window.fakePad.axes[3]=1")
        page.wait_for_timeout(700)
        require(
            page.locator("#modal-body").evaluate("e=>e.scrollTop") > 10,
            "Right-stick menu scrolling failed",
        )
        page.evaluate("window.fakePad=null;window.__game.resume()")

    check("Emulated standard gamepad and PlayStation prompts", controller)

    def credits():
        page.evaluate("window.__game.menu('about')")
        for tab in ["source", "testing", "engine", "prompt"]:
            page.locator('[data-tab="' + tab + '"]').click()
            require(
                len(page.locator("#modal-body").inner_text()) > 80,
                "Credits tab empty: " + tab,
            )
        page.evaluate("window.__game.resume()")

    check("All four About and feedback tabs", credits)

    def touch():
        tc = browser.new_context(
            viewport={"width": 844, "height": 390},
            is_mobile=True,
            has_touch=True,
            device_scale_factor=1,
        )
        tp = tc.new_page()
        try:
            load(tp, base + GAME + "?renderer=webgl")
            tp.evaluate("window.__game.debug.freeze(true)")
            tp.screenshot(path=str(ART / "touch-title.png"))
            tp.locator('[data-action="begin"]').tap()
            tp.touchscreen.tap(100, 250)
            tp.wait_for_timeout(200)
            require(
                tp.locator("body").evaluate("e=>e.classList.contains('touch')"),
                "Touch mode not selected",
            )
            require(
                tp.locator("#touch-menu").is_visible(), "Minimal touch menu missing"
            )
            tp.locator("#touch-menu").tap()
            require(state(tp)["menu"] == "pause", "Touch pause failed")
        except Exception:
            tp.screenshot(path=str(ART / "touch-failure.png"))
            (ART / "touch-state.json").write_text(json.dumps(state(tp), indent=2))
            raise
        finally:
            tc.close()

    check("Touch profile, minimal controls and pause", touch)

    def co_op():
        page.evaluate("window.__game.resume()")
        page.evaluate("window.__game.room.create()")
        code = page.evaluate("window.__game.room.code")
        other = context.new_page()
        try:
            load(other, base + GAME + "?renderer=webgl")
            other.evaluate("code=>window.__game.room.join(code)", code)
            page.wait_for_function(
                "window.__game.room.code && document.querySelectorAll('.player-row').length===2",
                timeout=15000,
            )
            page.locator('[data-action="launch-room"]').click()
            other.wait_for_function(
                "window.__game.state.players.length===2 && window.__game.state.mode==='playing'",
                timeout=15000,
            )
            other.keyboard.down("d")
            other.wait_for_timeout(850)
            other.keyboard.up("d")
            page.wait_for_timeout(1000)
            hs, cs = state(page), state(other)
            (ART / "coop-state.json").write_text(
                json.dumps({"host": hs, "peer": cs}, indent=2)
            )
            require(
                len(hs["players"]) == 2
                and cs["metrics"]["snapshots"] > 2
                and hs["metrics"]["inputs"] > 2,
                "Co-op transport did not exchange authoritative state",
            )
            hid = cs["localId"]
            hp = next(p["pos"] for p in hs["players"] if p["id"] == hid)
            cp = next(p["pos"] for p in cs["players"] if p["id"] == hid)
            require(abs(hp["x"] - cp["x"]) < 1, "Peer positions disagree")
            page.evaluate("window.__game.debug.flags({flute:true,shovel:true})")
            other.wait_for_function(
                "window.__game.state.flags.flute && window.__game.state.flags.shovel"
            )
            require(hp["x"] > -12, "Remote movement did not reach host")
            (ART / "coop-state.json").write_text(
                json.dumps({"host": state(page), "peer": state(other)}, indent=2)
            )
        finally:
            other.close()
            page.evaluate("window.__game.room.close()")

    check("Standalone two-page co-op, remote movement and shared tools", co_op)

    def reel_coverage():
        strict_reel(page)
        page.evaluate("window.__game.exitAttract()")

    check("Looping attract reel covers all seven chapters", reel_coverage)

    def direct_file():
        fp = context.new_page()
        try:
            load(fp, (ROOT / GAME).as_uri() + "?renderer=webgl")
            require(
                fp.locator("#title-screen").is_visible(), "Direct file title missing"
            )
        finally:
            fp.close()

    check("Direct file deployment", direct_file)

    def screenshots():
        page.evaluate("window.__game.start();window.__game.debug.god(true)")
        page.set_viewport_size({"width": 1920, "height": 1080})
        for index, name in [
            (1, "temple"),
            (2, "atlas"),
            (4, "descent"),
            (5, "well"),
            (6, "escape"),
        ]:
            page.evaluate("i=>window.__game.debug.setStage(i)", index)
            if index == 4:
                page.evaluate("window.__game.action('tool')")
            page.evaluate("window.__game.step(2.2)")
            page.add_style_tag(content="#stage-card,#speech{display:none!important}")
            page.evaluate("window.__game.menu('pause')")
            page.evaluate("document.getElementById('modal').classList.add('hidden')")
            page.evaluate("window.__game.render()")
            page.wait_for_timeout(350)
            page.screenshot(path=str(ART / (name + ".png")))
            page.evaluate("window.__game.resume()")
        page.evaluate("window.__game.room.close()")

    screenshots()
    page.close()

    def harness_test(players, scenario="standard", loss=0):
        hp = context.new_page()
        try:
            game = "/" + GAME + "?renderer=webgl"
            from urllib.parse import urlencode

            query = urlencode(
                {
                    "game": game,
                    "players": players,
                    "auto": 1,
                    "scenario": scenario,
                    "latency": 150 if loss else 0,
                    "jitter": 50 if loss else 0,
                    "loss": loss,
                    "play": 3500,
                }
            )
            url = base + FOLDER.name + "/vendor/harness.html?" + query
            hp.goto(url, wait_until="domcontentloaded")
            hp.wait_for_function(
                "window.__hubCheck && window.__hubCheck.done", timeout=120000
            )
            report = hp.evaluate("window.__hubCheck")
            (ART / ("hub-" + str(players) + "-" + scenario + ".json")).write_text(
                json.dumps(report, indent=2)
            )
            failed = [c for c in report["checks"] if not c["pass"]]
            require(report["pass"], json.dumps(failed))
        finally:
            hp.close()

    check("AI Hub two-player official conformance", lambda: harness_test(2))
    check(
        "AI Hub four players, latency, jitter, loss and player leave",
        lambda: harness_test(4, loss=5),
    )
    check("AI Hub host-leave handling", lambda: harness_test(4, "host-leave", 5))
    check(
        "AI Hub dedicated server without a local player",
        lambda: harness_test(2, "server"),
    )


def strict_reel(page):
    page.evaluate(
        "window.__game.room.close();window.__game.attract();window.__game.step(225)"
    )
    trace = page.evaluate(
        "() => {const e=window.__game.debug.events();const i=e.map(e=>e.type).lastIndexOf('attract-start');return e.slice(i+1);}"
    )
    reel = [e["index"] for e in trace if e["type"] == "stage"]
    swings = sum(e["type"] == "swing" for e in trace)
    (ART / "attract-reel.json").write_text(
        json.dumps({"stages": reel, "swings": swings, "trace": trace}, indent=2)
    )
    require(
        set(reel) == set(range(7)), "Attract did not cover every chapter: " + str(reel)
    )
    require(
        state(page)["attract"] and reel.count(6) >= 2,
        "Attract did not show two escapes: " + str(reel),
    )
    require(swings >= 6, "Attract skipped the whip crossings: " + str(swings))


if __name__ == "__main__":
    main()
