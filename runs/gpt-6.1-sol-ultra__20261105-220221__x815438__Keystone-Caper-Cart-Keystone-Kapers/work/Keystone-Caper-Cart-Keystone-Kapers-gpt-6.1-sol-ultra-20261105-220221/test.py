"""One-command regression suite. Prints failures and one final count only."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import traceback
from contextlib import suppress
from pathlib import Path
from urllib.parse import urlencode, urlsplit

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
FLAGS = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-webgpu-adapter=swiftshader",
    "--autoplay-policy=no-user-gesture-required",
]
PAD = """window.__pad={id:'DualSense regression controller',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window.__pad]});"""
checks = 0
failures: list[str] = []


def check(label, condition):
    global checks
    checks += 1
    if not condition:
        failures.append(label)


def run_case(label, task):
    try:
        task()
    except Exception as exc:  # noqa: BLE001 - collect independent test failures before reporting
        location = " -> ".join(
            f"{Path(frame.filename).name}:{frame.lineno}"
            for frame in traceback.extract_tb(exc.__traceback__)
            if Path(frame.filename).resolve() == Path(__file__).resolve()
        )
        check(label + " [" + location + "]: " + str(exc).split("\n")[0], False)


def press_pad(page, button, until=None):
    page.evaluate("(b)=>{__pad.buttons[b]={pressed:true,touched:true,value:1}}", button)
    if until:
        page.wait_for_function(until, timeout=5000)
    else:
        page.wait_for_timeout(180)
    page.evaluate(
        "(b)=>{__pad.buttons[b]={pressed:false,touched:false,value:0}}", button
    )
    page.wait_for_timeout(80)


def wait_boot(page, url):
    page.goto(url)
    page.wait_for_function("window.__game !== undefined", timeout=40000)
    page.wait_for_function(
        'getComputedStyle(document.querySelector("#loading")).display === "none"',
        timeout=5000,
    )


def browser_game_checks(browser, game_url):
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    context.add_init_script(PAD)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    wait_boot(page, game_url)
    check("Correct game page loaded", page.title() == "Keystone Caper Cart")
    check(
        "Three.js R180 and Rapier 0.19.3 initialized",
        page.evaluate(
            '__game.version.three === "180" && __game.version.rapier === "0.19.3"'
        ),
    )
    check(
        "WebGPU backend initialized",
        page.evaluate('__game.state.renderer === "WebGPU"'),
    )
    check(
        "Title opens without an input gesture",
        page.evaluate('__game.state.mode === "title"'),
    )
    check(
        "Default music is ten percent",
        page.evaluate("__game.audio.inspect().musicVolume === .1"),
    )
    check(
        "Title offers solo, couch, online and handbook",
        page.locator(
            '[data-action="solo"], [data-action="couch"], [data-action="online"], [data-action="how"]'
        ).count()
        == 4,
    )
    page.locator('[data-action="solo"]').click()
    page.wait_for_function('__game.state.mode === "play"')
    check(
        "Characters use native AnimationMixer clips",
        page.evaluate(
            '__game.actors().every(a=>a.mixer && ["idle","run","jump","duck"].every(k=>a.actions[k]))'
        ),
    )
    x = page.evaluate("__game.state.players[0].x")
    page.keyboard.down("d")
    page.wait_for_function("(x)=>__game.state.players[0].x>x+.6", arg=x)
    page.keyboard.up("d")
    check("Keyboard moves the officer", True)
    page.keyboard.down("Space")
    page.wait_for_function("__game.state.events.jumps>0")
    page.keyboard.up("Space")
    check(
        "Keyboard jump triggers physics and animation",
        page.evaluate(
            '__game.state.players[0].anim === "jump" || __game.state.events.jumps>0'
        ),
    )
    page.wait_for_function("__game.game.players[0].grounded", timeout=8000)
    page.keyboard.down("s")
    page.wait_for_function("__game.state.players[0].duck")
    check(
        "Keyboard duck lowers the character collider",
        page.evaluate("__game.game.players[0].collider.shape.halfHeight < .2"),
    )
    page.keyboard.up("s")
    page.keyboard.press("Escape")
    page.wait_for_function('__game.state.mode === "pause"')
    before = page.evaluate("__game.game.elapsed")
    page.wait_for_timeout(180)
    check(
        "Pause freezes simulation",
        abs(page.evaluate("__game.game.elapsed") - before) < 0.0001,
    )
    page.locator('[data-action="dev"]').click()
    check(
        "Developer desk is reachable from pause",
        page.locator("#dev-speed").is_visible(),
    )
    page.locator("#dev-speed").evaluate("(el)=>el.value=12")
    page.locator("#dev-speed").dispatch_event("input")
    check(
        "Developer speed tuning applies live",
        page.evaluate("__game.game.config.speed === 12"),
    )
    page.mouse.move(1910, 1070)
    page.wait_for_timeout(100)
    page.locator("#dev-speed").focus()
    press_pad(page, 15, "__game.game.config.speed > 12")
    check("Controller adjusts developer sliders", True)
    page.locator('[data-action="refill"]').dispatch_event(
        "pointerenter", {"pointerType": "mouse"}
    )
    check(
        "Stationary mouse hover preserves controller focus",
        page.evaluate('document.activeElement?.id === "dev-speed"'),
    )
    page.locator('[data-action="refill"]').hover()
    page.wait_for_function('document.activeElement?.dataset.action === "refill"')
    check("Real mouse movement restores native hover focus", True)
    page.locator("#dev-roundTime").evaluate("(el)=>el.value=120")
    page.locator("#dev-roundTime").dispatch_event("input")
    check(
        "Developer clock tuning refills active timer",
        page.evaluate("__game.game.time === 120"),
    )
    page.locator('[data-action="defaults"]').click()
    check(
        "Developer defaults restore original values",
        page.evaluate(
            "__game.game.config.speed === 8.4 && __game.game.config.roundTime === 90 && !__game.game.config.invincible"
        ),
    )
    page.locator('[data-action="pause"]').click()
    page.locator('[data-action="settings"]').click()
    page.locator('[data-action="glyph"]').click()
    check(
        "Xbox glyph option is available",
        "Xbox" in page.locator('[data-action="glyph"]').inner_text(),
    )
    page.locator('[data-action="back"]').click()
    page.locator('[data-action="resume"]').click()
    page.evaluate("__pad.axes[0]=1")
    page.wait_for_function(
        'document.querySelector("#prompts").textContent.includes("A Jump")'
    )
    check(
        "Prompts follow controller input and Xbox preference",
        "X Cuff" in page.locator("#prompts").inner_text(),
    )
    page.evaluate(
        "__pad.axes[0]=0; __pad.buttons[8].pressed=true;__pad.buttons[9].pressed=true"
    )
    page.wait_for_timeout(180)
    check(
        "Create plus Options is reserved for Hub",
        page.evaluate('__game.state.mode === "play"'),
    )
    page.evaluate("__pad.buttons[8].pressed=false; __pad.buttons[9].pressed=false")
    page.wait_for_timeout(100)
    press_pad(page, 9, '__game.state.mode === "pause"')
    check("Controller Options opens pause", True)
    page.locator('[data-action="title"]').click()
    page.locator('[data-action="couch"]').click()
    check(
        "Couch mode creates two physical officers",
        page.evaluate("__game.state.players.length === 2"),
    )
    positions = page.evaluate("__game.state.players.map(p=>p.x)")
    page.keyboard.down("d")
    page.keyboard.down("ArrowLeft")
    page.wait_for_function(
        "(p)=>__game.state.players[0].x>p[0]+.4 && __game.state.players[1].x<p[1]-.4",
        arg=positions,
    )
    page.keyboard.up("d")
    page.keyboard.up("ArrowLeft")
    check("Couch keyboard bindings control separate officers", True)
    page.keyboard.press("Escape")
    page.locator('[data-action="credits"]').click()
    credits = page.locator(".credits-scroll").inner_text()
    check(
        "About contains all required information and feedback",
        all(
            s.lower() in credits.lower()
            for s in [
                "Source Information",
                "testing Feedback",
                "engine Feedback",
                "prompt Feedback",
                "added on import",
            ]
        ),
    )
    page.evaluate("__pad.axes[3]=1")
    page.wait_for_function('document.querySelector(".credits-scroll").scrollTop > 50')
    page.evaluate("__pad.axes[3]=0")
    check("Controller can scroll the full About screen", True)
    page.locator('[data-action="back"]').click()
    page.locator('[data-action="resume"]').click()
    page.evaluate("""()=>{
      __game.start(1);
      const g=__game.game;g.config.invincible=true;
      for(let c=0;c<3;c++){
        g.teleport(0,g.thief.x,g.thief.floor);
        g.step(1/60,[{act:true}]);
        for(let i=0;i<165;i++)g.step(1/60,[{}]);
      }
      __game.step(0);
    }""")
    page.wait_for_function('__game.state.mode === "result"')
    check(
        "Scripted three-case browser playthrough reaches the victory screen",
        page.evaluate(
            '__game.state.state === "won" && __game.state.events.catches === 3 && __game.state.score>0'
        ),
    )
    check(
        "Victory summary offers a complete replay",
        page.locator('[data-action="again"]').is_visible()
        and "Case closed!" in page.locator("#menu").inner_text(),
    )
    page.mouse.move(1910, 1070)
    page.wait_for_function('document.activeElement?.dataset.action === "again"')
    press_pad(page, 13, 'document.activeElement?.dataset.action === "title"')
    press_pad(page, 12, 'document.activeElement?.dataset.action === "again"')
    check("Controller navigates the result menu", True)
    press_pad(page, 0, '__game.state.mode === "play"')
    check(
        "Replay starts a fresh first case",
        page.evaluate(
            '__game.state.case === 1 && __game.state.events.catches === 0 && __game.state.mode === "play"'
        ),
    )
    page.keyboard.press("Escape")
    page.locator('[data-action="title"]').click()
    page.wait_for_function("__game.state.attract === true", timeout=16000)
    check(
        "Ten-second idle title starts an AI attract patrol",
        page.evaluate('__game.state.mode === "attract"'),
    )
    page.keyboard.press("x")
    page.wait_for_function('__game.state.mode === "title" && !__game.state.attract')
    check("Any input exits attract mode to the title", True)
    probe = page.evaluate("__game.probeAudio()")
    check(
        "Offline synthesized audio is finite and audible",
        probe.get("supported")
        and probe.get("finite")
        and 0.001 < probe.get("rms", 0) < 0.3
        and 0.02 < probe.get("peak", 0) < 1,
    )
    check(
        "Offline audio uses default ten-percent music", probe.get("musicVolume") == 0.1
    )
    events_before = page.evaluate("__game.audio.inspect().events")
    page.evaluate(
        """()=>{for(const name of ['jump','duck','coin','hit','elevator','catch','win','lose','menu','dash'])__game.audio.sfx(name);__game.audio.speak('cop')}"""
    )
    sound = page.evaluate("__game.audio.inspect()")
    check("Audio unlocks after a player gesture", sound["state"] == "running")
    check(
        "Realtime music, effects and gibberish schedule audible nodes",
        sound["events"] == events_before + 11
        and sound["notes"] > 0
        and sound["activeNodes"] > 0,
    )
    page.evaluate(
        "__game.audio.setMusic(5);__game.audio.setSfx(-4);__game.audio.mute(true)"
    )
    sound = page.evaluate("__game.audio.inspect()")
    check(
        "Volume controls clamp and mute applies",
        sound["musicVolume"] == 1 and sound["sfxVolume"] == 0 and sound["muted"],
    )
    page.wait_for_timeout(1600)
    check(
        "Ended procedural audio sources are released",
        page.evaluate("__game.audio.inspect().activeNodes === 0"),
    )
    check("No uncaught game runtime errors", not errors)
    context.close()


def file_boot_checks(browser):
    selection = json.loads((ROOT / "selection.json").read_text())
    release = ROOT.parent / (selection["slug"] + ".html")
    check(
        "Single-file release is present and matches the development build",
        release.exists() and release.read_bytes() == (ROOT / "index.html").read_bytes(),
    )
    context = browser.new_context()
    page = context.new_page()
    wait_boot(page, release.as_uri())
    check(
        "Single-file release boots directly through file://",
        page.title() == "Keystone Caper Cart"
        and page.evaluate('__game.state.renderer === "WebGPU"'),
    )
    page.locator('[data-action="solo"]').click()
    check(
        "Direct-file release starts gameplay",
        page.evaluate('__game.state.mode === "play"'),
    )
    context.close()


def touch_checks(browser, game_url):
    context = browser.new_context(
        viewport={"width": 844, "height": 390},
        is_mobile=True,
        has_touch=True,
        device_scale_factor=1,
    )
    page = context.new_page()
    wait_boot(page, game_url)
    page.locator('[data-action="solo"]').tap()
    page.wait_for_function('__game.state.mode === "play"')
    check("Touch can start a patrol", True)
    check(
        "Touch landscape hides keyboard prompt strip",
        not page.locator("#prompts").is_visible(),
    )
    x = page.evaluate("__game.state.players[0].x")
    cdp = context.new_cdp_session(page)
    cdp.send(
        "Input.dispatchTouchEvent",
        {"type": "touchStart", "touchPoints": [{"x": 180, "y": 260}]},
    )
    cdp.send(
        "Input.dispatchTouchEvent",
        {"type": "touchMove", "touchPoints": [{"x": 245, "y": 260}]},
    )
    page.wait_for_function("(x)=>__game.state.players[0].x>x+.4", arg=x)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    check("Invisible touch stick moves the officer", True)
    page.touchscreen.tap(700, 260)
    page.wait_for_function("__game.state.events.jumps > 0")
    check("Right-side touch jumps", True)
    page.locator("#pauseButton").tap()
    page.wait_for_function('__game.state.mode === "pause"')
    check("Touch menu button pauses", True)
    context.close()


def standalone_network_checks(browser, base_url):
    context = browser.new_context()
    page = context.new_page()
    page.goto(base_url + "/net-test.html")
    page.wait_for_function("window.ready === true")
    page.evaluate("create(); nets[0].host()")
    code = page.evaluate("nets[0].code")
    check("Standalone room code has six characters", len(code) == 6)
    for _ in range(3):
        page.evaluate("(code)=>{const i=create();return nets[i].join(code)}", code)
    page.wait_for_function("nets.every(n=>n.players.length === 4)")
    check(
        "Four standalone seats remain distinct",
        page.evaluate('nets.map(n=>n.me).join(",") === "0,1,2,3"'),
    )
    page.evaluate("nets[0].start({count:4})")
    page.wait_for_function("nets.every(n=>n.started)")
    check(
        "Standalone host starts every officer",
        page.evaluate('events.every(es=>es.some(e=>e.name === "onStart"))'),
    )
    page.evaluate(
        "nets[1].sendInput({x:99,jump:true});nets[2].sendInput({x:-99,duck:true});nets[3].sendInput({x:0,action:true});nets[0].sendState({round:2,score:123})"
    )
    page.wait_for_function('events[0].filter(e=>e.name === "onInput").length === 3')
    check(
        "Host receives all guest seats and clamps axes",
        page.evaluate(
            'events[0].filter(e=>e.name==="onInput").map(e=>e.args[1]).sort().join(",")==="1,2,3" && events[0].filter(e=>e.name==="onInput").every(e=>Math.abs(e.args[0].x)<=1)'
        ),
    )
    page.wait_for_function(
        'events.slice(1).every(es=>es.some(e=>e.name === "onState" && e.args[0].round === 2))'
    )
    check("Host snapshots reach every officer", True)
    page.evaluate("nets[0].finish(456,true)")
    page.wait_for_function(
        'events.slice(1).every(es=>es.some(e=>e.name === "onFinish" && e.args[0].score === 456))'
    )
    check("Team result reaches every officer", True)
    page.evaluate("nets.forEach(n=>n.leave())")
    check(
        "Rooms tear down cleanly", page.evaluate('nets.every(n=>n.role === "offline")')
    )
    context.close()


def rtc_checks(browser, base_url):
    contexts = [browser.new_context(), browser.new_context()]
    pages = []
    try:
        for context in contexts:
            context.add_init_script("window.BroadcastChannel=undefined")
            page = context.new_page()
            page.goto(base_url + "/net-test.html")
            page.wait_for_function("window.ready === true")
            page.evaluate("create()")
            pages.append(page)
        host, guest = pages
        host.evaluate("nets[0].host()")
        code = host.evaluate("nets[0].code")
        host.wait_for_function('!nets[0].status.includes("opening")', timeout=25000)
        guest.evaluate("(code)=>nets[0].join(code)", code)
        guest.wait_for_function("nets[0].connected", timeout=25000)
        check("Public PeerJS signaling connects isolated contexts", True)
        host.evaluate("nets[0].start({count:2})")
        guest.wait_for_function("nets[0].started")
        guest.evaluate("nets[0].sendInput({x:1,jump:true})")
        host.wait_for_function('events[0].some(e=>e.name === "onInput")')
        host.evaluate("nets[0].sendState({networkTest:true})")
        guest.wait_for_function(
            'events[0].some(e=>e.name === "onState" && e.args[0].networkTest)'
        )
        check("WebRTC carries guest input and host snapshots", True)
    finally:
        for page in pages:
            with suppress(PlaywrightError):
                page.evaluate("nets[0].leave()")
        for context in contexts:
            context.close()


def hub_checks(browser, base_url, game_name):
    context = browser.new_context()
    page = context.new_page()
    for label, params in [
        ("two-player Hub", {"players": 2}),
        (
            "four-player lossy Hub",
            {"players": 4, "latency": 150, "jitter": 50, "loss": 5},
        ),
        ("Hub spectator server", {"players": 2, "scenario": "server"}),
        ("Hub host departure", {"players": 2, "scenario": "host-leave"}),
    ]:

        def scenario(params=params, label=label):
            query = urlencode({"game": game_name, "auto": 1, "limit": 8, **params})
            page.goto(base_url + "/harness.html?" + query)
            page.wait_for_function(
                'document.body.dataset.complete === "true"', timeout=90000
            )
            result = page.evaluate("window.__hubCheck")
            for item in result.get("checks", []):
                check(
                    label
                    + ": "
                    + item["name"]
                    + (": " + item.get("detail", "") if not item["pass"] else ""),
                    item["pass"],
                )
            if not result.get("checks"):
                check(label + ": harness produced no checks", False)

        run_case(label, scenario)
    context.close()


def core_checks():
    script = ROOT / "core-test.mjs"
    if not script.exists():
        check("Deterministic core regression script is present", False)
        return
    result = subprocess.run(
        ["node", str(script), "--json"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=90,
        check=False,
    )
    try:
        report = json.loads(result.stdout)
        total = int(report["checks"])
        bad = report.get("failures", [])
        global checks
        checks += total
        failures.extend("Core: " + str(f) for f in bad)
        if result.returncode and not bad:
            check(
                "Core subprocess exited successfully: " + result.stderr.strip(), False
            )
    except (ValueError, KeyError, TypeError):
        check(
            "Core runner returns valid JSON: "
            + (result.stdout + result.stderr).strip()[:500],
            False,
        )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--url",
        help="Existing game URL; otherwise an isolated loopback server is started",
    )
    parser.add_argument(
        "--only",
        choices=["all", "desktop"],
        default="all",
        help="Rerun just desktop checks after a UI-only change",
    )
    parser.add_argument("--skip-hub", action="store_true")
    parser.add_argument("--skip-rtc", action="store_true")
    args = parser.parse_args()
    server = None
    try:
        game_url = args.url
        if not game_url:
            server = subprocess.Popen(
                [sys.executable, "-u", "-m", "http.server", "0", "--bind", "127.0.0.1"],
                cwd=ROOT,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                text=True,
            )
            line = server.stdout.readline()
            match = re.search(r"port (\d+)", line)
            if not match:
                raise RuntimeError(
                    "Isolated test server did not announce its OS-selected port"
                )
            game_url = "http://127.0.0.1:" + match.group(1) + "/index.html"
        parts = urlsplit(game_url)
        base_url = parts.scheme + "://" + parts.netloc + parts.path.rsplit("/", 1)[0]
        game_name = parts.path.rsplit("/", 1)[-1]
        if args.only == "all":
            run_case("Core regression suite", core_checks)
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=FLAGS)
            try:
                if args.only == "desktop":
                    run_case(
                        "Desktop controls, menus, attract and audio",
                        lambda: browser_game_checks(browser, game_url),
                    )
                else:
                    run_case("Direct-file release", lambda: file_boot_checks(browser))
                    run_case(
                        "Desktop controls, menus, attract and audio",
                        lambda: browser_game_checks(browser, game_url),
                    )
                    run_case("Touch controls", lambda: touch_checks(browser, game_url))
                    run_case(
                        "Standalone four-player networking",
                        lambda: standalone_network_checks(browser, base_url),
                    )
                    if not args.skip_rtc:
                        run_case(
                            "Internet WebRTC networking",
                            lambda: rtc_checks(browser, base_url),
                        )
                    if not args.skip_hub:
                        run_case(
                            "Official Hub harness",
                            lambda: hub_checks(browser, base_url, game_name),
                        )
            finally:
                browser.close()
    except Exception as exc:  # noqa: BLE001 - collect independent test failures before reporting
        check("Test runner: " + str(exc).split("\n")[0], False)
    finally:
        if server:
            server.terminate()
            server.wait(timeout=10)
    report = {"checks": checks, "passed": checks - len(failures), "failures": failures}
    (
        ROOT
        / ("test-results.json" if args.only == "all" else "test-results-desktop.json")
    ).write_text(json.dumps(report, indent=2))
    for failure in failures:
        print("FAIL: " + failure)
    print(f"{checks - len(failures)}/{checks} checks passed; {len(failures)} failures")
    return bool(failures)


if __name__ == "__main__":
    raise SystemExit(main())
