# ruff: noqa: BLE001
# Collect each browser-check failure so the suite can report all independent failures.
"""One command: npm test --silent. Only failures and the final count are printed."""

import http.server
import importlib.util
import json
import subprocess
import threading
from functools import partial
from pathlib import Path

from playwright.sync_api import sync_playwright

from transport_tests import run_transport_tests

ROOT = Path(__file__).resolve().parent
GAME = "HERO-Blast-Shift-HERO-1984-gpt-6.1-sol-ultra-20261105-214551.html"
RESULTS = []


def require(condition, message="Assertion failed"):
    if not condition:
        raise AssertionError(message)


def case(name, fn):
    try:
        fn()
        RESULTS.append((name, True, ""))
    except Exception as exc:
        RESULTS.append((name, False, str(exc)))


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def run_core(browser, base_url):
    context = browser.new_context(
        viewport={"width": 1600, "height": 900}, device_scale_factor=1
    )
    context.add_init_script("""
      window.testPad={id:'DualSense test',index:0,connected:false,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
      navigator.getGamepads=()=>[window.testPad];
    """)
    page = context.new_page()
    page_errors = []
    page.on("pageerror", lambda e: page_errors.append(str(e)))

    def state():
        return page.evaluate("__game.state")

    def js(code):
        return page.evaluate(code)

    def boot():
        page.goto((ROOT.parent / GAME).as_uri(), wait_until="domcontentloaded")
        page.wait_for_function("window.__gameReady === true", timeout=120000)
        require(page.title() == "H.E.R.O. Blast Shift", "Wrong page served")
        s = state()
        require(s["mode"] == "title" and s["ready"], "No title screen")
        require(s["renderer"] == "WebGPU", "Primary renderer is not WebGPU")
        require(
            s["settings"]["music"] == 10 and s["audio"]["music"] == 0.1,
            "Music must default to 10%",
        )
        js("__game.set('manualClock',true);__game.set('idle',-1000000000)")

    case("single embedded file boots with native WebGPU over file://", boot)
    if not page.evaluate("window.__gameReady || false"):
        context.close()
        return

    def menu_controls():
        js("testPad.connected=true;testPad.buttons[13].pressed=true;__game.poll()")
        require(
            page.locator(":focus").inner_text() == "Race a friend",
            "D-pad focus did not move",
        )
        js("testPad.buttons[13].pressed=false;__game.poll()")
        # Keyboard native activation must occur exactly once, including toggle buttons.
        page.locator("[data-action=settings]").click()
        page.locator("#glyph-toggle").focus()
        page.keyboard.press("Enter")
        require(
            page.locator("#glyph-toggle").inner_text() == "Xbox",
            "Keyboard Enter toggled twice",
        )
        page.locator("#settings [data-action=back]").focus()
        js("testPad.buttons[0].pressed=true;__game.poll()")
        js(
            "testPad.buttons[0].pressed=false;testPad.connected=false;__game.poll();__game.action('back')"
        )
        require(state()["mode"] == "title", "Back did not restore title")

    case("keyboard activation and controller menu focus", menu_controls)

    def credits_scroll():
        js("__game.action('about');testPad.connected=true;testPad.axes=[0,0,0,.9]")
        js("for(let i=0;i<12;i++)__game.poll()")
        scroll = page.locator("#about .panel").evaluate("(el)=>el.scrollTop")
        require(scroll > 100, "Right stick cannot scroll credits")
        require(
            "RIGHT STICK" in page.locator("#scroll-hint").inner_text(),
            "Controller scroll hint is missing",
        )
        js("testPad.axes=[0,0,0,0];testPad.connected=false;__game.poll()")
        page.keyboard.press("Escape")
        require(state()["menu"] == "title", "Escape did not leave the About screen")
        page.locator("#title [data-action=settings]").click()
        page.keyboard.press("Escape")
        require(state()["menu"] == "title", "Escape did not leave title settings")

    case("controller credits scrolling and Escape submenu navigation", credits_scroll)

    def keyboard_motion():
        page.locator("#title [data-action=start]").click()
        js("__game.tick(.6)")
        start = state()
        require(start["grounded"], "Spawn did not land on the platform")
        page.keyboard.down("KeyD")
        page.keyboard.down("Space")
        js("__game.poll();__game.tick(.6)")
        end = state()
        page.keyboard.up("KeyD")
        page.keyboard.up("Space")
        js("__game.poll()")
        require(
            end["position"]["x"] > start["position"]["x"] + 1.5,
            "Keyboard horizontal movement failed",
        )
        require(
            end["position"]["y"] > start["position"]["y"] + 0.5,
            "Jetpack failed to lift",
        )
        require(end["fuel"] < start["fuel"], "Flight did not consume fuel")

    case("native keyboard flight and rotor power", keyboard_motion)

    def pause_dev():
        js("__game.pause()")
        before = state()["elapsed"]
        js("__game.tick(1)")
        require(state()["elapsed"] == before, "Paused solo game kept simulating")
        page.locator("#pause [data-action=dev]").click()
        page.locator("#dev-flightSpeed").fill("9")
        page.locator("#dev-flightSpeed").dispatch_event("input")
        require(
            state()["tuning"]["flightSpeed"] == 9 and state()["training"],
            "Live tuning did not apply",
        )
        page.locator("#god-toggle").click()
        require(state()["god"], "Invulnerability toggle failed")
        page.locator("[data-action=defaults]").click()
        require(
            state()["tuning"]["flightSpeed"] == 6.8 and not state()["god"],
            "Defaults did not restore",
        )
        page.locator("#dev [data-action=back]").click()
        page.locator("#pause [data-action=resume]").click()
        require(state()["menu"] is None, "Resume failed")

    case("pause, live dev sliders, toggles and reset", pause_dev)

    def pad_gameplay():
        js(
            "__game.start();__game.tick(.6);testPad.connected=true;testPad.axes=[.8,-.9,1,0];testPad.buttons[7].pressed=true;__game.poll();__game.tick(.7)"
        )
        s = state()
        require(s["position"]["x"] > 6, "Left stick did not move")
        require(s["flying"] and s["fuel"] < 100, "Left-stick flight failed")
        require(s["statistics"]["shots"] > 0, "R2 did not fire")
        js(
            "testPad.axes=[0,0,0,0];testPad.buttons[7].pressed=false;testPad.connected=false;__game.poll()"
        )
        require(
            "RT" in page.locator("#controls").inner_text(),
            "Xbox glyph setting did not update pad prompts",
        )

    case("standard-mapping controller flight, laser and glyphs", pad_gameplay)

    def collisions_fuel():
        js(
            "__game.start();__game.teleport(17,8);__game.set('fuel',0);__game.setInput({move:0,fly:1,fire:false});__game.tick(.2)"
        )
        s = state()
        require(s["position"]["y"] < 8 and not s["flying"], "Empty pack still flew")
        js("__game.setInput({move:0,fly:0,fire:false});__game.tick(2)")
        s = state()
        require(1.5 < s["position"]["y"] < 2, "Rapier floor collision failed")
        require(s["grounded"] and s["fuel"] > 0, "Ground recharge failed")
        js("__game.teleport(4,25);__game.tick(1)")
        require(
            24.4 < state()["position"]["y"] < 24.9, "Upper platform collision failed"
        )

    case("Rapier collision, gravity, empty pack and ground recharge", collisions_fuel)

    def laser():
        js("__game.start();__game.tick(2)")
        result = js("""() => {
          const e=__game.state.enemies[0];__game.teleport(e.x-3,e.y-.25);__game.setAim(1,0);__game.shoot();
          return __game.state;
        }""")
        require(not result["enemies"][0]["alive"], "Laser did not hit bat")
        require(
            not any(b["broken"] for b in result["barriers"]),
            "Laser broke a bomb-only bulkhead",
        )

    case("laser creature hit and bulkhead protection", laser)

    def charge():
        js(
            "__game.start();__game.teleport(16.2,2.2);__game.tick(.1);__game.charge();__game.teleport(19,6);__game.setInput({move:0,fly:0,fire:false});__game.tick(1.6)"
        )
        s = state()
        require(
            s["barriers"][0]["broken"], "Timed charge did not destroy the nearby wall"
        )
        require(not s["barriers"][1]["broken"], "Distant wall incorrectly broke")
        require(s["bombs"] == 0 and s["charges"] == 2, "Fuse or inventory is wrong")

    case("timed charge, collision filtering and localized destruction", charge)

    def miner_and_checkpoint():
        js("__game.teleport(7,2.1);__game.tick(.1)")
        s = state()
        require(
            s["rescued"] == 1 and s["miners"][0]["rescued"], "Proximity rescue failed"
        )
        before = s["score"]
        js("__game.tick(.4)")
        require(state()["score"] == before, "Rescue scored twice")
        js(
            "__game.set('health',1);__game.set('fuel',10);__game.set('charges',0);__game.teleport(33,15);__game.tick(3.2)"
        )
        s = state()
        require(
            s["health"] == 3 and s["fuel"] > 99 and s["charges"] == 3,
            "Service pad did not refill",
        )
        js("__game.set('health',1);__game.tick(2);__game.hurt(1)")
        s = state()
        require(s["lives"] == 2 and s["health"] == 3, "Replacement suit failed")
        require(
            abs(s["position"]["x"] - 33) < 0.1,
            "Replacement did not use service checkpoint",
        )

    case(
        "rescue once, service pad refill and replacement checkpoint",
        miner_and_checkpoint,
    )

    def hazards():
        js("__game.start();__game.tick(2);__game.teleport(28,1.8);__game.tick(.1)")
        require(state()["health"] < 3, "Lava did not hurt")
        js(
            "__game.loadLevel(1);__game.tick(1.6);__game.teleport(37,16.3);__game.tick(.1)"
        )
        require(state()["health"] < 3, "Hot steam did not hurt")
        js(
            "__game.loadLevel(1);__game.tick(4);__game.teleport(37,16.3);__game.tick(.05)"
        )
        require(state()["health"] == 3, "Blue safe vent caused damage")
        js(
            "__game.loadLevel(2);__game.tick(2);__game.set('fuel',50);__game.teleport(29,2.3);__game.tick(.3)"
        )
        require(state()["fuel"] < 50, "Floodwater did not drain rotor power")

    case("lava, hot/safe steam cycle and floodwater", hazards)

    def scanner_collectibles():
        js("__game.start();__game.scan();__game.teleport(17,9);__game.tick(.1)")
        require(state()["statistics"]["crystals"] > 0, "Crystal collection failed")
        require(
            not page.locator("#map-wrap").evaluate(
                '(el)=>el.classList.contains("hidden")'
            ),
            "Scanner did not display",
        )

    case("scanner and crystal collection", scanner_collectibles)

    # This AI drives the same flight/laser/charge inputs as a player, without
    # teleportation, extra health, free fuel, wall bypasses, or direct rescue calls.
    route_js = """() => {
      const g=__game,logs=[];
      function go(x,y,seconds=10){
        let reached=false;
        for(let i=0;i<seconds*60;i++){
          const s=g.state,dx=x-s.position.x,dy=y-s.position.y;
          if(s.mode!=='playing'||s.stageChanging){reached=true;break;}
          if(Math.abs(dx)<.34&&Math.abs(dy)<.5){reached=true;g.setInput({move:0,fly:0,fire:false});break;}
          const targetVy=Math.max(-6,Math.min(5,dy*3));
          g.setInput({move:Math.max(-1,Math.min(1,dx*2)),fly:dy>-.2&&s.velocity.y<targetVy+.15?1:0,fire:true});
          const targets=s.enemies.filter(e=>e.alive).sort((a,b)=>Math.hypot(a.x-s.position.x,a.y-s.position.y)-Math.hypot(b.x-s.position.x,b.y-s.position.y));
          if(targets.length){const e=targets[0];g.setAim(e.x-s.position.x,e.y-s.position.y);}
          g.tick(1/60);
        }
        logs.push({target:[x,y],reached,position:g.state.position,fuel:g.state.fuel,mode:g.state.mode});
      }
      const sector=g.state.sector;
      go(18,25);go(sector===1?17:16.2,2.2);g.charge();go(19,6,2);g.setInput({move:0,fly:0,fire:false});g.tick(1);
      go(sector===0?7:6,2.1);go(16.5,3);go(16.5,15.5);go(25,14.7);g.setInput({move:0,fly:0,fire:false});g.tick(2);
      go(40.5,17.7);g.charge();go(36,18,2);g.setInput({move:0,fly:0,fire:false});g.tick(1);
      go(49,15);go(37,18);go(37,25.5);go(50,25.5);
      g.setInput({move:0,fly:0,fire:false});
      return {logs,state:g.state};
    }"""

    def campaign():
        js("__game.start()")
        for i in range(3):
            result = js(route_js)
            missed = [r for r in result["logs"] if not r["reached"]]
            require(
                not missed,
                f"Sector {i + 1} AI route blocked: {missed}; rescued={result['state']['rescued']}",
            )
            require(
                result["state"]["rescued"] == (i + 1) * 2,
                f"Sector {i + 1} rescue count incorrect",
            )
            require(
                all(b["broken"] for b in result["state"]["barriers"]),
                f"Sector {i + 1} bulkhead remained",
            )
            if i < 2:
                page.wait_for_function(
                    f"__game.state.sector === {i + 1} && !__game.state.stageChanging",
                    timeout=10000,
                )
        s = state()
        require(
            s["mode"] == "result" and s["rescued"] == 6,
            "Campaign did not reach victory",
        )
        require(
            s["statistics"]["blasts"] >= 6 and s["statistics"]["shots"] > 0,
            "Playthrough skipped core tools",
        )
        require(not s["training"] and s["lives"] > 0, "Playthrough used cheats or died")

    case("full three-sector physical-input AI playthrough without cheats", campaign)

    def lose_restart():
        js(
            "__game.start();__game.set('lives',1);__game.set('health',1);__game.tick(2);__game.hurt(1)"
        )
        require(
            state()["mode"] == "result" and state()["lives"] == 0,
            "Game-over flow failed",
        )
        page.locator("#result [data-action=start]").click()
        require(
            state()["mode"] == "playing"
            and state()["lives"] == 3
            and state()["rescued"] == 0,
            "Restart failed",
        )

    case("game over and fresh campaign restart", lose_restart)

    def attract():
        js("__game.title();__game.set('manualClock',false);__game.set('idle',11000)")
        page.wait_for_function('__game.state.mode === "attract"', timeout=10000)
        js("__game.set('manualClock',true);__game.tick(32)")
        s = state()
        require(
            s["rescued"] >= 2 and s["statistics"]["blasts"] >= 2,
            "Attract did not demonstrate rescues and charges",
        )
        page.keyboard.press("Enter")
        require(state()["mode"] == "title", "Input did not exit attract mode")

    case("10-second attract replay, mechanics and input exit", attract)

    def runtime():
        require(not state()["errors"], f"Runtime errors: {state()['errors']}")
        require(not page_errors, f"Browser errors: {page_errors}")
        require(
            page.evaluate("__game.sceneStats.meshes") > 500,
            "Detailed 3D scene is missing",
        )

    case("no uncaught runtime errors and detailed scene", runtime)
    context.close()


def run_touch(browser, base_url):
    context = browser.new_context(
        viewport={"width": 844, "height": 390},
        is_mobile=True,
        has_touch=True,
        device_scale_factor=1,
    )
    page = context.new_page()

    def touch_controls():
        page.goto(base_url + "/" + GAME, wait_until="domcontentloaded")
        page.wait_for_function("window.__gameReady", timeout=120000)
        page.locator("#title [data-action=start]").tap()
        page.evaluate("__game.set('manualClock',true);__game.tick(.6)")
        before = page.evaluate("__game.state.position")
        cdp = context.new_cdp_session(page)
        left = {"x": 140, "y": 280, "id": 1}
        cdp.send(
            "Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [left]}
        )
        left = {"x": 195, "y": 215, "id": 1}
        cdp.send(
            "Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [left]}
        )
        right = {"x": 660, "y": 180, "id": 2}
        cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchStart", "touchPoints": [left, right]},
        )
        page.evaluate("__game.poll();__game.tick(.7)")
        s = page.evaluate("__game.state")
        require(
            s["position"]["x"] > before["x"] + 1 and s["flying"],
            "Invisible touch stick failed",
        )
        require(s["statistics"]["shots"] > 0, "Multitouch laser failed")
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        page.locator("#touch-menu").tap()
        require(page.evaluate("__game.state.menu") == "pause", "Touch menu failed")
        require(not page.evaluate("__game.state.errors"), "Touch runtime errors")

    case("mobile multitouch flight, assisted firing and menu", touch_controls)
    context.close()


def main():
    build = subprocess.run(
        ["node", "build.mjs"], cwd=ROOT, capture_output=True, text=True, check=False
    )
    if build.returncode:
        RESULTS.append(("build", False, build.stderr))
        return
    case(
        "exit interview JSON shape and embedded credits",
        lambda: require(
            all(
                k in json.loads((ROOT.parent / "exit-interview.json").read_text())
                for k in [
                    "sourceInformation",
                    "testingFeedback",
                    "engineFeedback",
                    "promptFeedback",
                    "aiHub",
                ]
            )
        ),
    )
    handler = partial(QuietHandler, directory=str(ROOT.parent))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = f"http://127.0.0.1:{server.server_port}"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                ],
            )
            run_core(browser, base_url)
            run_touch(browser, base_url)
            RESULTS.extend(run_transport_tests(browser, base_url))
            spec = importlib.util.spec_from_file_location(
                "hub_tests", ROOT / "hub-tests.py"
            )
            hub = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(hub)
            cases, errors = hub.run_hub_tests(browser, base_url)
            RESULTS.extend((name, True, "") for name in cases)
            RESULTS.extend(
                ("official AI Hub conformance", False, error) for error in errors
            )
            browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        RESULTS.append(("test runner", False, str(error)))
    failed = [r for r in RESULTS if not r[1]]
    for name, _, detail in failed:
        print(f"FAIL: {name}: {detail}")
    print(
        f"{len(RESULTS) - len(failed)}/{len(RESULTS)} checks passed; {len(failed)} failures"
    )
    (ROOT / "test-results.json").write_text(
        json.dumps(
            [{"name": n, "passed": p, "detail": d} for n, p, d in RESULTS], indent=2
        )
    )
    raise SystemExit(bool(failed))
