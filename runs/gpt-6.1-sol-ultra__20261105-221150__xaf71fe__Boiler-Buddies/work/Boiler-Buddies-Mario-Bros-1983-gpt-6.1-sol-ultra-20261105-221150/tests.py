"""One command: npm run -s test. Only failures and the final count are printed."""

import importlib.util
import json
import re
import subprocess
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
GAME = HERE.parent / (HERE.name + ".html")
GPU_ARGS = [
    "--enable-unsafe-webgpu",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--disable-gpu-watchdog",
    "--use-webgpu-adapter=swiftshader",
]
PAD_STUB = """
window.__pads=[];
Object.defineProperty(navigator,'getGamepads',{value:()=>window.__pads});
window.makePad=()=>({index:0,id:'DualSense test controller',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0,touched:false}))});
"""


def module(name):
    spec = importlib.util.spec_from_file_location(name, HERE / (name + ".py"))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def assembled():
    count = 0
    failures = []

    def check(name, value):
        nonlocal count
        count += 1
        if not value:
            failures.append("Assembled game: " + name)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=GPU_ARGS)
        try:
            context = browser.new_context(viewport={"width": 1600, "height": 1000})
            context.add_init_script(PAD_STUB)
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(GAME.as_uri(), wait_until="load")
            page.wait_for_function("window.__game?.ready", timeout=90000)
            page.wait_for_function(
                "__game.view.renderedFrames>4 && !__game.view.recovering", timeout=90000
            )
            check("self-contained file starts", "Boiler Buddies" in page.title())
            check(
                "WebGPU is the primary backend",
                page.evaluate("__game.view.initialBackend==='WebGPU'"),
            )
            check(
                "graphics submit geometry after initialization or recovery",
                page.evaluate("__game.view.lastDrawCalls>100 && !__game.view.failed"),
            )
            check(
                "bundled display font loads",
                page.evaluate("document.fonts.check('16px Bungee')"),
            )
            check(
                "world labels retain their pixels after graphics recovery",
                page.evaluate(
                    """()=>{let maps=[];__game.view.scene.traverse(o=>{if(o.material?.map?.image?.getContext)maps.push(o.material.map.image)});return maps.length>3&&maps.every(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return d.some((v,i)=>i%4===3&&v>0)})}"""
                ),
            )
            check(
                "music defaults to ten percent",
                page.evaluate("__game.settings.music===.1"),
            )
            check(
                "six designed phases",
                page.evaluate("__game.state.phase===1 && __game.screen==='title'"),
            )
            check(
                "title choices fit TV frame",
                page.evaluate(
                    "[...document.querySelectorAll('#title-screen button')].every(e=>{const r=e.getBoundingClientRect();return r.y>=0&&r.bottom<=innerHeight})"
                ),
            )
            page.click("[data-action=solo]:visible")
            page.wait_for_function("!__game.input.menu", timeout=15000)
            page.wait_for_function(
                "!document.querySelector('#hint').classList.contains('low')"
            )
            check(
                "tutorial overlays leave the starting keeper visible",
                page.evaluate(
                    """()=>{const p=__game.state.players[0];const v=__game.view.project(p.x,p.y);return ['hint','toast'].every(id=>{const e=document.getElementById(id);const r=e.getBoundingClientRect();return e.hidden||v.x<r.left||v.x>r.right||v.y<r.top||v.y>r.bottom})}"""
                ),
            )
            check(
                "start shift from title",
                page.evaluate(
                    "__game.screen==='play' && __game.state.players.length===1"
                ),
            )
            x = page.evaluate("__game.state.players[0].x")
            page.keyboard.down("d")
            page.wait_for_function(
                "__game.state.players[0].x>" + str(x + 1), timeout=15000
            )
            page.keyboard.up("d")
            check(
                "keyboard movement reaches physics body",
                page.evaluate("__game.state.players[0].x") > x + 1,
            )
            page.keyboard.down("Space")
            page.wait_for_function("__game.state.players[0].y>2", timeout=15000)
            page.keyboard.up("Space")
            check(
                "keyboard jump reaches physics body",
                page.evaluate("__game.state.players[0].y") > 2,
            )
            page.keyboard.press("Shift")
            page.wait_for_function("__game.state.pulseCharges===2", timeout=15000)
            check(
                "pulse consumes one finite charge",
                page.evaluate("__game.state.pulseCharges===2"),
            )
            page.keyboard.press("Escape")
            page.wait_for_function("__game.screen==='pause'")
            old_time = page.evaluate("__game.state.time")
            page.wait_for_timeout(250)
            check(
                "pause freezes simulation",
                page.evaluate("__game.state.time") == old_time,
            )
            page.click("[data-action=dev]:visible")
            check(
                "workshop is reachable from pause",
                page.evaluate("__game.screen==='dev'"),
            )
            page.locator("#tune-speed").evaluate(
                "e=>{e.value=12;e.dispatchEvent(new Event('input',{bubbles:true}))}"
            )
            check(
                "live slider changes gameplay",
                page.evaluate("__game.sim.tuning.speed===12"),
            )
            page.click("[data-action=dev-step]:visible")
            check(
                "dev single frame advances physics",
                page.evaluate("__game.state.time") > old_time,
            )
            n = page.evaluate("__game.state.enemies.length")
            page.click("[data-action=dev-crab]:visible")
            check(
                "dev spawn creates real enemy",
                page.evaluate("__game.state.enemies.length") == n + 1,
            )
            page.click("[data-action=dev-god]:visible")
            check("dev god mode toggles", page.evaluate("__game.sim.god"))
            page.click("[data-action=dev-reset]:visible")
            check(
                "tuning reset restores defaults",
                page.evaluate(
                    "__game.sim.tuning.speed===7.6 && __game.sim.tuning.timeScale===1"
                ),
            )
            page.click("[data-action=back]:visible")
            page.click("[data-action=settings]:visible")
            page.locator("#music").evaluate(
                "e=>{e.value=.23;e.dispatchEvent(new Event('input',{bubbles:true}))}"
            )
            check(
                "audio volume slider is live",
                page.evaluate("__game.settings.music===.23"),
            )
            page.locator("#music").evaluate(
                "e=>{e.value=.1;e.dispatchEvent(new Event('input',{bubbles:true}))}"
            )
            page.click("[data-action=glyphs]:visible")
            check(
                "Xbox glyph option exists",
                page.evaluate("__game.settings.glyphs==='xbox'"),
            )
            page.click("[data-action=back]:visible")
            page.click("[data-action=resume]:visible")
            page.evaluate("__pads=[makePad()];__pads[0].buttons[10].pressed=true")
            page.wait_for_function("__game.input.mode==='gamepad'", timeout=15000)
            check(
                "prompts follow gamepad input",
                page.evaluate(
                    "__game.input.mode==='gamepad' && document.querySelector('#control-strip').textContent.includes('A')"
                ),
            )
            page.evaluate(
                "__pads[0].buttons[10].pressed=false;__pads[0].buttons[9].pressed=true"
            )
            page.wait_for_function("__game.screen==='pause'")
            check(
                "standard pad Options opens pause",
                page.evaluate("__game.screen==='pause'"),
            )
            page.evaluate("__pads[0].buttons[9].pressed=false")
            page.wait_for_timeout(70)
            page.evaluate("__pads[0].buttons[0].pressed=true")
            page.wait_for_function("__game.screen==='play'")
            check(
                "standard pad confirms focused resume",
                page.evaluate("__game.screen==='play'"),
            )
            page.evaluate("__pads=[];__game.pause()")
            page.click("[data-action=guide]:visible")
            check(
                "guide includes every pest and boss",
                all(
                    text in page.locator("#panel").inner_text()
                    for text in ["COPPER CRAB", "HOPPER", "FROST SLUG", "KETTLE KING"]
                ),
            )
            page.click("[data-action=back]:visible")
            page.click("[data-action=about]:visible")
            seen = []
            for _ in range(5):
                seen.append(page.locator("#panel h2").inner_text())
                page.click("[data-action=about-next]:visible")
            check("all required credits and feedback screens", len(set(seen)) == 5)
            page.click("[data-action=back]:visible")
            page.click("[data-action=quit]:visible")
            page.click("[data-action=local]:visible")
            check(
                "local co-op creates two keepers",
                page.evaluate("__game.state.players.length===2"),
            )
            x2 = page.evaluate("__game.state.players[1].x")
            page.wait_for_function("!__game.input.menu", timeout=15000)
            page.keyboard.down("h")
            page.wait_for_function(
                "__game.state.players[1].x>" + str(x2 + 0.5), timeout=15000
            )
            page.keyboard.up("h")
            check(
                "second keyboard player moves independently",
                page.evaluate("__game.state.players[1].x") > x2 + 0.5,
            )
            # Runs the entire designed campaign through the same physics tick, including bonus and boss.
            campaign = page.evaluate(
                """()=>{const g=__game;const emit=g.sim.onEvent;g.sim.onEvent=()=>{};g.sim.start({players:2,attract:true});const seen=new Set();let frames=0;for(;frames<20000&&g.sim.mode!=='won';frames++){seen.add(g.sim.phase);g.sim.step(1/60,[]);}g.sim.onEvent=emit;return {phases:[...seen],won:g.sim.mode==='won',stats:g.sim.stats,frames};}"""
            )
            check(
                "scripted full campaign reaches all six shifts",
                campaign["phases"] == [1, 2, 3, 4, 5, 6],
            )
            check(
                "scripted full campaign defeats final boss",
                campaign["won"] and campaign["stats"]["bossHits"] == 3,
            )
            check(
                "attract demonstrates pulse, wrap and drop",
                all(campaign["stats"][key] > 0 for key in ["pulses", "wraps", "drops"]),
            )
            page.wait_for_function("__game.screen==='result'", timeout=10000)
            check(
                "victory produces complete results",
                "THAT’S A WRAP" in page.locator("#panel").inner_text(),
            )
            page.click("[data-action=about]:visible")
            page.click("[data-action=back]:visible")
            check(
                "credits return to victory without freezing",
                page.evaluate("__game.screen==='result'"),
            )
            page.click("[data-action=again]:visible")
            check(
                "new game resets after victory",
                page.evaluate(
                    "__game.state.phase===1 && __game.state.score===0 && __game.screen==='play'"
                ),
            )
            idle_start = page.evaluate("__game.showTitle();performance.now()")
            page.wait_for_function("__game.screen==='attract'", timeout=20000)
            check(
                "ten idle seconds enters AI attract",
                page.evaluate("__game.screen==='attract' && __game.state.attract")
                and page.evaluate("performance.now()") - idle_start >= 9900,
            )
            page.evaluate("__pads=[makePad()];__pads[0].axes[2]=.8")
            page.wait_for_function("__game.screen==='title'", timeout=15000)
            page.evaluate("__pads=[]")
            check(
                "any attract input returns to title",
                page.evaluate("__game.screen==='title'"),
            )
            page.wait_for_timeout(400)
            page.click("[data-action=online]:visible")
            page.fill("#room-input", "AB23CD")
            page.click("[data-action=code-picker]:visible")
            check(
                "controller code picker inherits native room text",
                page.locator(".code-letter").all_text_contents() == list("AB23CD"),
            )
            page.evaluate("__pads=[makePad()];__pads[0].buttons[12].pressed=true")
            page.wait_for_function(
                "document.querySelector('.code-letter').textContent==='B'",
                timeout=15000,
            )
            check(
                "standard pad cycles a room character",
                page.locator(".code-letter").first.inner_text() == "B",
            )
            page.evaluate(
                "__pads[0].buttons[12].pressed=false;__pads[0].buttons[15].pressed=true"
            )
            page.wait_for_function(
                "document.querySelector('.code-cell.active').dataset.codeIndex==='1'",
                timeout=15000,
            )
            check(
                "standard pad selects the next room character",
                page.evaluate(
                    "document.querySelector('.code-cell.active').dataset.codeIndex==='1'"
                ),
            )
            page.evaluate(
                "__pads[0].buttons[15].pressed=false;__pads[0].buttons[1].pressed=true"
            )
            page.wait_for_function("__game.screen==='online'", timeout=15000)
            check(
                "back preserves the controller-entered room code",
                page.locator("#room-input").input_value() == "BB23CD",
            )
            page.evaluate("__pads=[]")
            check("no assembled runtime exceptions", not errors)
            for error in errors:
                failures.append("Browser exception: " + error)
            context.close()
            # A touch-only landscape phone uses the same title and gameplay screens.
            context = browser.new_context(
                viewport={"width": 844, "height": 390},
                is_mobile=True,
                has_touch=True,
                device_scale_factor=1,
            )
            page = context.new_page()
            page.goto(GAME.as_uri())
            page.wait_for_function("window.__game?.ready", timeout=90000)
            check(
                "touch title buttons fit",
                page.evaluate(
                    "[...document.querySelectorAll('#title-screen button')].every(e=>e.getBoundingClientRect().bottom<=innerHeight)"
                ),
            )
            page.tap("[data-action=solo]")
            page.wait_for_function("!__game.input.menu", timeout=15000)
            page.touchscreen.tap(700, 270)
            page.wait_for_function("__game.state.players[0].y>1.8", timeout=15000)
            check(
                "touch jump and device detection",
                page.evaluate(
                    "__game.input.mode==='touch' && __game.state.players[0].y>1.8"
                ),
            )
            check(
                "touch hides the dense control strip",
                page.locator("#control-strip").evaluate(
                    "e=>getComputedStyle(e).display==='none'"
                ),
            )
            page.tap("#pause-button")
            page.wait_for_function("__game.screen==='pause'")
            check(
                "touch pause remains reachable",
                page.evaluate("__game.screen==='pause'"),
            )
            context.close()
        except Exception as error:  # noqa: BLE001 - aggregate test failures
            failures.append("Assembled test runner: " + str(error))
        finally:
            browser.close()
    return count, failures


def main():
    count = 0
    failures = []
    try:
        result = subprocess.run(
            ["node", "test-mechanics.mjs"],
            cwd=HERE,
            capture_output=True,
            text=True,
            check=False,
            timeout=45,
        )
        match = re.search(r"(\d+) mechanics checks, (\d+) failures", result.stdout)
        if result.returncode or not match:
            failures.append("Mechanics: " + result.stdout + result.stderr)
        else:
            count += int(match[1])
        for name in ["test-input-audio", "test-network"]:
            n, errors = module(name).run()
            count += n
            failures.extend(errors)
        n, errors = assembled()
        count += n
        failures.extend(errors)
        n, errors = module("test-multiplayer").run()
        count += n
        failures.extend(errors)
        n, errors = module("test-hub").run()
        count += n
        failures.extend(errors)
        interview = json.loads((HERE.parent / "exit-interview.json").read_text())
        count += 1
        if interview != json.loads((HERE / "credits.json").read_text()):
            failures.append("Exit interview and in-game credits must match")
    except Exception as error:  # noqa: BLE001 - aggregate test failures
        failures.append("Test runner: " + str(error))
    for failure in failures:
        print("FAIL: " + failure)
    print(f"{count} checks, {len(failures)} failures")
    return bool(failures)


if __name__ == "__main__":
    raise SystemExit(main())
