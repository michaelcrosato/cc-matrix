# ruff: noqa: BLE001
# The test runner aggregates all assertion and browser failures into one report.
"""Quiet, complete validation. Run ../<game folder>/test.sh from any directory."""

import json
import subprocess
import sys
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
GAME = HERE.name + ".html"
failures = []
count = 0
reports = {}


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def check(name, fn):
    global count
    count += 1
    (HERE / "tests/progress.json").write_text(
        json.dumps({"check": count, "stage": name})
    )
    try:
        value = fn()
        if value is False:
            raise AssertionError("condition was false")
    except Exception as error:
        failures.append(f"{name}: {error}")


def state(page):
    return page.evaluate("__creaks.state()")


def ready(page):
    try:
        page.wait_for_function(
            "window.__creaks?.ready && __creaks.state().gpuFrames>0", timeout=60000
        )
    except Exception as e:
        raise RuntimeError(
            "Boot failed at "
            + page.url
            + "; "
            + page.locator("#loadMessage").inner_text()
            + "; errors="
            + str(page.evaluate("window.__creaksErrors || []"))
        ) from e


def wait(page, expression):
    (HERE / "tests/progress.json").write_text(
        json.dumps({"check": count, "stage": expression})
    )
    try:
        page.wait_for_function(expression, timeout=20000)
    except Exception as error:
        details = page.evaluate(
            "window.__creaks ? JSON.stringify(__creaks.state().net) : 'not loaded'"
        )
        raise RuntimeError(expression + "; network=" + details) from error


def click(page, action):
    scope = (
        page.locator("#panel")
        if page.locator("#overlay").is_visible()
        else page.locator("body")
    )
    scope.locator(f'[data-action="{action}"]:visible').first.click()


def dependency(route):
    path = unquote(urlparse(route.request.url).path)
    if "/three@0.180.0/build/" in path:
        file = HERE / "node_modules/three/build" / path.split("/")[-1]
    elif "/@dimforge/rapier3d-compat@0.19.3/" in path:
        file = HERE / "node_modules/@dimforge/rapier3d-compat" / path.split("/")[-1]
    else:
        route.continue_()
        return
    if file.is_file():
        route.fulfill(
            path=str(file),
            content_type="text/javascript",
            headers={"Access-Control-Allow-Origin": "*"},
        )
    else:
        route.continue_()


build = subprocess.run(
    ["python3", "build.py"], cwd=HERE, check=False, capture_output=True, text=True
)
check("Single-file build", lambda: build.returncode == 0)
core = subprocess.run(
    ["node", "tests/core.test.mjs"],
    cwd=HERE,
    check=False,
    capture_output=True,
    text=True,
)
try:
    data = json.loads(core.stdout)
    count += data["count"]
    failures.extend(data["failures"])
except Exception:
    failures.append("Simulation tests: " + core.stdout + core.stderr)
html = (ROOT / GAME).read_text()
script = (
    html.split('<script type="module"', 1)[1].split(">", 1)[1].split("</script>", 1)[0]
)
syntaxfile = HERE / "tests/bundle-check.mjs"
syntaxfile.write_text(script)
syntax = subprocess.run(
    ["node", "--check", str(syntaxfile)],
    cwd=HERE,
    check=False,
    capture_output=True,
    text=True,
)
check("Bundled JavaScript syntax", lambda: syntax.returncode == 0)
check(
    "Exit interview JSON schema",
    lambda: (
        set(json.loads((ROOT / "exit-interview.json").read_text()))
        == {
            "sourceInformation",
            "testingFeedback",
            "engineFeedback",
            "promptFeedback",
            "aiHub",
        }
    ),
)
check(
    "Unmodified AI Hub client is embedded",
    lambda: (HERE / "vendor/session.js").read_text() in html,
)
server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{server.server_port}"
url = base + "/" + GAME
glflags = [
    "--enable-unsafe-webgpu",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--autoplay-policy=no-user-gesture-required",
]
network_url = url + "?renderer=webgl"
flags = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-angle=vulkan",
    "--disable-vulkan-surface",
    "--autoplay-policy=no-user-gesture-required",
]
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=flags)
        context = browser.new_context(
            viewport={"width": 1600, "height": 1000}, device_scale_factor=1
        )
        context.route("https://cdn.jsdelivr.net/npm/**", dependency)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(url)
        ready(page)
        check(
            "Correct game and actual WebGPU backend",
            lambda: (
                page.title() == "The House of Creaks"
                and state(page)["backend"] == "WebGPU"
            ),
        )
        check("Music defaults to ten percent", lambda: state(page)["music"] == 0.1)
        click(page, "start")
        check(
            "Title starts a playable night",
            lambda: (
                state(page)["screen"] == "game" and len(state(page)["players"]) == 1
            ),
        )
        start = state(page)["players"][0]
        page.keyboard.down("KeyD")
        wait(page, f"Math.abs(__creaks.player().x - {start['x']}) > .35")
        page.keyboard.up("KeyD")
        check(
            "Keyboard moves through the physical world",
            lambda: abs(state(page)["players"][0]["x"] - start["x"]) > 0.35,
        )
        page.keyboard.press("Space")
        wait(page, "__creaks.player().matches===15")
        check(
            "Match key ignites a real flame",
            lambda: state(page)["players"][0]["match"] > 0,
        )
        page.keyboard.press("Tab")
        check(
            "Paper map and floor navigation",
            lambda: (
                state(page)["screen"] == "map"
                and page.locator(".map-room").count() == 6
            ),
        )
        click(page, "map-3")
        check(
            "All four floors are on the map",
            lambda: "The Attic" in page.locator("#panel h2").inner_text(),
        )
        page.keyboard.press("Escape")
        page.keyboard.press("Escape")
        click(page, "dev")
        check(
            "Pause exposes complete developer controls",
            lambda: (
                page.locator("[data-tuning]").count() == 6
                and page.locator("[data-action=grant-shard]").is_visible()
            ),
        )
        page.locator("#dev-speed").fill("6.5")
        check(
            "Live slider changes movement tuning",
            lambda: page.locator("#devout-speed").inner_text() == "6.5",
        )
        click(page, "god")
        click(page, "floor-up")
        check(
            "Developer teleport changes actual floor",
            lambda: state(page)["players"][0]["f"] == 1,
        )
        click(page, "reset-tuning")
        click(page, "pause")
        click(page, "settings")
        page.locator("#set-glyphs").select_option("xbox")
        check(
            "Xbox glyph preference is stored", lambda: state(page)["glyphs"] == "xbox"
        )
        click(page, "back")
        page.evaluate("__creaks.audioTest()")
        wait(
            page,
            "__creaks.state().audio.notes>0 && __creaks.state().audio.level>0.0001",
        )
        check(
            "Synthesized music, effects and gibberish produce audio",
            lambda: (
                state(page)["audio"]["effects"] >= 2
                and state(page)["audio"]["voices"] >= 1
            ),
        )
        # Standard Gamepad API emulation, including a real Options -> resume flow.
        page.evaluate(
            """window.__pad={id:'Virtual standard DualSense',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[__pad]"""
        )
        old = state(page)["players"][0]["x"]
        page.evaluate("__pad.axes[0]=.8")
        wait(
            page,
            f'__creaks.state().lastInput==="gamepad" && Math.abs(__creaks.player().x-({old}))>.2',
        )
        page.evaluate("__pad.axes[0]=0;__pad.buttons[9].pressed=true")
        wait(page, '__creaks.state().screen==="pause"')
        page.evaluate("__pad.buttons[9].pressed=false")
        page.wait_for_timeout(200)
        page.evaluate("__pad.buttons[0].pressed=true")
        wait(page, '__creaks.state().screen==="game"')
        page.evaluate("__pad.buttons[0].pressed=false")
        check(
            "Standard gamepad moves, pauses, resumes and changes prompts",
            lambda: (
                state(page)["lastInput"] == "gamepad"
                and "RT" in page.locator("#controlHints").inner_text()
            ),
        )
        # Scripted full physical playthrough, using the public developer test controls.
        page.evaluate(
            """()=>{__creaks.action('quit');__creaks.start();__creaks.god(true);__creaks.tune({enemySpeed:0});window.walk=(x,z)=>{for(const q of __creaks.path(x,z)){let n=0;while(Math.hypot(__creaks.player().x-q.x,__creaks.player().z-q.z)>.13&&n++<100){const p=__creaks.player(),dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz);__creaks.step(1/60,{x:dx/d,z:dz/d});}if(n>=100)throw new Error('navigation stuck');}};window.use=()=>{__creaks.step(1.05,{});__creaks.interact()};}"""
        )
        page.evaluate(
            """()=>{walk(10,-6.6);use();walk(12,7);use();walk(-12,-7);use();walk(-10,5.8);use();walk(-12,-7);use();walk(12,7);use();walk(0,6.2);use();walk(12,7);use();walk(0,-5.8);use();walk(12,7);use();walk(0,6.2);use();walk(12,7);use();walk(-12,-7);use();walk(12,7);use();walk(10,-6.2);use();walk(12,7);use();walk(-12,-7);use();walk(12,7);use();walk(0,6.2);use();walk(0,9);use();}"""
        )
        wait(page, '__creaks.state().screen==="ending"')
        check(
            "Browser full playthrough reaches victory with all mechanics",
            lambda: (
                state(page)["status"] == "won"
                and state(page)["recovered"] == 3
                and state(page)["stairsUsed"] >= 12
            ),
        )
        click(page, "quit")
        click(page, "about")
        check(
            "In-game credits include all required source fields",
            lambda: (
                "added on import" in page.locator(".credits-text").inner_text()
                and "0.19.3" in page.locator(".credits-text").inner_text()
            ),
        )
        page.evaluate("__pad.axes[3]=1")
        wait(page, "document.querySelector('.credits-text').scrollTop>30")
        page.evaluate("__pad.axes[3]=0")
        check(
            "Controller can scroll the complete credits",
            lambda: page.locator(".credits-text").evaluate("(e)=>e.scrollTop") > 30,
        )
        page.locator(".credits-text").focus()
        page.locator(".credits-text").evaluate("(e)=>e.scrollTop=0")
        page.keyboard.press("Space")
        wait(page, "document.querySelector('.credits-text').scrollTop>30")
        page.keyboard.press("Tab")
        check(
            "Keyboard scrolls credits and keeps menu focus inside the panel",
            lambda: page.evaluate("!!document.activeElement.closest('#panel')"),
        )
        click(page, "about-1")
        check(
            "Testing feedback is accessible in game",
            lambda: page.locator(".credits-text p").count() == 4,
        )
        click(page, "back")
        page.evaluate("__creaks.setIdle()")
        wait(page, "__creaks.state().attract===true")
        check(
            "Idle title enters an AI-played attract mode",
            lambda: state(page)["screen"] == "attract",
        )
        page.wait_for_timeout(1300)
        check(
            "Attract replay actually moves its player",
            lambda: abs(state(page)["players"][0]["x"] + 2) > 0.1,
        )
        page.keyboard.press("Enter")
        check(
            "Any input exits attract mode to title",
            lambda: state(page)["screen"] == "title" and not state(page)["attract"],
        )
        # Same-origin two-page co-op, using the renderer's compatibility backend.
        context.close()
        browser.close()
        browser = p.webkit.launch(headless=True)
        context = browser.new_context(viewport={"width": 800, "height": 600})
        context.route("https://cdn.jsdelivr.net/npm/**", dependency)
        page = context.new_page()
        page.goto(network_url)
        ready(page)
        page.set_viewport_size({"width": 800, "height": 600})
        click(page, "coop")
        click(page, "local-host")
        room = page.locator(".code-display").inner_text()
        guest = context.new_page()
        guest.set_viewport_size({"width": 640, "height": 480})
        guest.goto(network_url)
        ready(guest)
        click(guest, "coop")
        click(guest, "local-join")
        guest.locator("#roomCode").fill(room)
        click(guest, "join-room")
        wait(guest, "__creaks.state().net.me===1")
        check(
            "Standalone room assigns a second player",
            lambda: len(state(page)["players"]) == 2 and state(guest)["net"]["me"] == 1,
        )
        click(page, "start")
        wait(guest, '__creaks.state().screen==="game"')
        old = state(guest)["players"][1]["x"]
        guest.keyboard.down("KeyD")
        wait(page, f"Math.abs(__creaks.state().players[1].x-({old}))>.3")
        guest.keyboard.up("KeyD")
        check(
            "Guest inputs update the host-owned shared world",
            lambda: abs(state(page)["players"][1]["x"] - old) > 0.3,
        )
        page.evaluate(
            "__creaks.teleport(0,5,1);__creaks.action('grant-shard');__creaks.teleport(0,6.4,0);__creaks.interact()"
        )
        wait(guest, "__creaks.state().banked.length===1")
        check(
            "Recovered fragments replicate to the guest",
            lambda: state(guest)["banked"] == state(page)["banked"],
        )
        page.evaluate(
            "(()=>{const s=__creaks.snapshot();s.status='won';s.finished=true;s.banked=['shard0','shard1','shard2'];s.items.forEach(i=>{if(i.id.startsWith('shard')){i.banked=true;i.holder=null}});__creaks.restore(s)})()"
        )
        wait(guest, "__creaks.state().screen==='ending'")
        page.evaluate("__creaks.action('restart')")
        wait(
            guest,
            "__creaks.state().screen==='game' && __creaks.state().banked.length===0",
        )
        check(
            "Co-op restart resumes every guest in a fresh shared night",
            lambda: (
                len(state(guest)["players"]) == 2
                and state(guest)["status"] == "playing"
            ),
        )
        guest.evaluate("__creaks.action('quit')")
        wait(page, "__creaks.state().players.length===1")
        guest.close()
        page.evaluate("__creaks.action('quit')")
        # Cross-device transport with manual offer/answer, no public broker.
        context.close()
        browser.close()
        browser = p.chromium.launch(headless=True, args=glflags)
        context = browser.new_context(viewport={"width": 800, "height": 600})
        context.route("https://cdn.jsdelivr.net/npm/**", dependency)
        page = context.new_page()
        page.goto(network_url)
        ready(page)
        page.evaluate("__creaks.setIdle()")
        wait(page, "__creaks.state().attract===true")
        page.evaluate("__creaks.createOffer()")
        wait(page, "!!__creaks.offer()")
        offer = page.evaluate("__creaks.offer()")
        guest = context.new_page()
        guest.set_viewport_size({"width": 640, "height": 480})
        guest.goto(network_url)
        ready(guest)
        guest.evaluate("__creaks.setIdle()")
        wait(guest, "__creaks.state().attract===true")
        guest.evaluate("(code)=>__creaks.acceptOffer(code)", offer)
        wait(guest, "!!__creaks.answer()")
        answer = guest.evaluate("__creaks.answer()")
        page.evaluate("(code)=>__creaks.acceptAnswer(code)", answer)
        wait(guest, "__creaks.state().net.me===1")
        check(
            "Direct WebRTC invitation and reply connect two pages",
            lambda: len(state(page)["players"]) == 2,
        )
        page.evaluate("__creaks.start()")
        wait(guest, '__creaks.state().screen==="game"')
        check(
            "Network starts cancel stale attract replay state",
            lambda: not state(page)["attract"] and not state(guest)["attract"],
        )
        old = state(guest)["players"][1]["z"]
        guest.keyboard.down("KeyS")
        wait(page, f"Math.abs(__creaks.state().players[1].z-({old}))>.2")
        guest.keyboard.up("KeyS")
        check(
            "WebRTC carries live cooperative inputs and snapshots",
            lambda: (
                state(guest)["net"]["stats"]["received"] > 2
                and state(page)["net"]["stats"]["received"] > 0
            ),
        )
        guest.evaluate("__creaks.action('quit')")
        guest.close()
        page.evaluate("__creaks.action('quit')")
        check(
            "No browser game errors",
            lambda: not errors and not page.evaluate("__creaksErrors.length"),
        )
        context.close()
        browser.close()
        browser = p.chromium.launch(headless=True, args=flags)
        # Real touch profile. A single browser remains open.
        touch = browser.new_context(**p.devices["iPhone 13"])
        touch.route("https://cdn.jsdelivr.net/npm/**", dependency)
        mobile = touch.new_page()
        mobile.goto(url)
        ready(mobile)
        mobile.locator("[data-action=start]").tap()
        old = state(mobile)["players"][0]["x"]
        cdp = touch.new_cdp_session(mobile)
        cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchStart", "touchPoints": [{"x": 70, "y": 600, "id": 1}]},
        )
        cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchMove", "touchPoints": [{"x": 120, "y": 560, "id": 1}]},
        )
        wait(mobile, f"Math.abs(__creaks.player().x-({old}))>.15")
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        check(
            "Touch drag moves with a minimal HUD",
            lambda: (
                state(mobile)["lastInput"] == "touch"
                and mobile.locator("#controlHints").is_hidden()
            ),
        )
        check(
            "Touch menu remains usable",
            lambda: mobile.locator("[data-action=pause]").bounding_box()["width"] >= 30,
        )
        mobile.evaluate("__creaks.teleport(12,7,0)")
        wait(
            mobile,
            "Math.abs(__creaks.projectPlayer().x)<.8 && Math.abs(__creaks.projectPlayer().y)<.75",
        )
        check(
            "Portrait camera keeps distant rooms and the player visible",
            lambda: abs(mobile.evaluate("__creaks.projectPlayer().x")) < 0.8,
        )
        touch.close()
        browser.close()
        browser = p.chromium.launch(headless=True, args=flags)
        # File deployment, with exactly the same external module loading.
        filectx = browser.new_context()
        filectx.route("https://cdn.jsdelivr.net/npm/**", dependency)
        filepage = filectx.new_page()
        filepage.goto((ROOT / GAME).as_uri())
        ready(filepage)
        check(
            "Single HTML boots directly from file://",
            lambda: (
                state(filepage)["screen"] == "title"
                and state(filepage)["backend"] == "WebGPU"
            ),
        )
        filectx.close()
        browser.close()
        # Official conformance harness. Sequential scenarios limit resource use.
        scenarios = [
            ("two-player", "players=2"),
            ("four-player-impaired", "players=4&latency=150&jitter=50&loss=5"),
            (
                "host-leave",
                "players=4&latency=150&jitter=50&loss=5&scenario=host-leave",
            ),
            ("server-only-host", "players=2&scenario=server"),
        ]
        for label, args in scenarios:
            browser = p.webkit.launch(headless=True)
            harnessctx = browser.new_context(viewport={"width": 960, "height": 640})
            harnessctx.route("https://cdn.jsdelivr.net/npm/**", dependency)
            (HERE / "tests/progress.json").write_text(
                json.dumps({"check": count, "stage": "AI Hub " + label})
            )
            h = harnessctx.new_page()
            h.goto(
                base
                + "/"
                + HERE.name
                + "/vendor/harness.html?game=../../"
                + GAME
                + "%3Frenderer%3Dwebgl&auto=1&play=3000&"
                + args
            )
            try:
                h.wait_for_function(
                    'document.body.dataset.complete==="true"', timeout=60000
                )
                report = h.evaluate("window.__hubCheck")
                reports[label] = report
                for item in report["checks"]:
                    count += 1
                    if not item["pass"]:
                        failures.append(
                            "AI Hub "
                            + label
                            + " / "
                            + item["name"]
                            + ": "
                            + item.get("detail", "")
                        )
                if not report["pass"] and not any(
                    not c["pass"] for c in report["checks"]
                ):
                    failures.append("AI Hub " + label + " did not pass")
            except Exception as e:
                failures.append("AI Hub " + label + ": " + str(e))
            h.close()
            harnessctx.close()
            browser.close()
        browser = p.webkit.launch(headless=True)
        visual = browser.new_context(
            viewport={"width": 1920, "height": 1080}, device_scale_factor=1
        )
        visual.route("https://cdn.jsdelivr.net/npm/**", dependency)
        shot = visual.new_page()
        shot.goto(network_url)
        ready(shot)
        shot.evaluate("__creaks.action('settings')")
        shot.screenshot(path=str(HERE / "tests/settings-1080.png"))
        shot.evaluate("__creaks.action('back')")
        shot.wait_for_timeout(1200)
        shot.screenshot(path=str(HERE / "tests/title-1080.png"))
        shot.evaluate("__creaks.start();__creaks.ignite()")
        shot.wait_for_timeout(1200)
        shot.screenshot(path=str(HERE / "tests/gameplay-1080.png"))
        visual.close()
        browser.close()
except Exception as e:
    failures.append("Browser validation interrupted: " + str(e))
finally:
    server.shutdown()
    server.server_close()
(HERE / "tests/results.json").write_text(
    json.dumps({"count": count, "failures": failures, "hub": reports}, indent=2)
)
for f in failures:
    print("FAIL " + f)
print(f"{count - len(failures)}/{count} checks passed; {len(failures)} failures.")
sys.exit(bool(failures))
