"""Run with the supplied Playwright Python; KERFUFFLE_TEST_URL selects the game.

Only failures and a one-line count are printed. Detailed observations are saved.
The game clock is advanced deterministically; input still travels through real DOM,
Gamepad API, pointer and Chromium touch event paths.
"""

import json
import os
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright


HERE = Path(__file__).resolve().parent
URL = os.environ.get("KERFUFFLE_TEST_URL", HERE.joinpath("index.html").as_uri())
if not URL.rstrip("/").endswith(".html"):
    URL = URL.rstrip("/") + "/index.html"
FAILURES = []
CHECKS = []
OBSERVATIONS = {}
PAGE_ERRORS = []
STARTED = time.time()

PAD_SCRIPT = """
window.__padStates = [];
Object.defineProperty(navigator, 'getGamepads', {configurable:true, value:() =>
 window.__padStates.map((p,i)=>({id:'Scripted standard pad '+i,index:i,
 connected:true,mapping:'standard',timestamp:performance.now(),axes:p.axes,
 buttons:p.buttons.map(v=>({pressed:v>.4,touched:v>0,value:v}))}))});
"""


def check(condition, name, detail=None):
    CHECKS.append({"name": name, "passed": bool(condition)})
    if not condition:
        FAILURES.append(name + (": " + str(detail) if detail is not None else ""))


def state(page):
    return page.evaluate("window.__game.state")


def step(page, seconds, auto=False):
    return page.evaluate("([s,a]) => window.__game.step(s,a)", [seconds, auto])


def reset(page):
    page.evaluate("window.__padStates=[]; window.__game.title(); window.__game.setIdle(-1000)")


def range_value(page, selector, value):
    page.locator(selector).evaluate(
        "(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))}", str(value)
    )


def case(name, action):
    try:
        action()
    except Exception as error:
        check(False, name + " completed", str(error).split("\n")[0])


def boot(page):
    page.on("pageerror", lambda error: PAGE_ERRORS.append(str(error)))
    page.goto(URL, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_function("!!window.__game", timeout=90000)
    page.evaluate("window.__game.setIdle(-1000)")


def desktop_checks(page):
    def launch_and_keyboard():
        reset(page)
        initial = state(page)
        check(initial["mode"] == "title", "Game boots to title screen")
        check(initial["backend"] == "WebGPU", "Native WebGPU backend initialized", initial["backend"])
        check(initial["audio"]["musicVolume"] == 0.1, "Music defaults to 10 percent")
        check(page.locator("#play-button").is_visible(), "Primary action is visible")
        page.keyboard.press("Enter")
        check(state(page)["mode"] == "play", "Keyboard confirm starts a patrol")
        step(page, 2.6)
        before = state(page)
        page.keyboard.down("d")
        after = step(page, 0.25)
        page.keyboard.up("d")
        check(after["players"][0]["angle"] < before["players"][0]["angle"] - 0.2,
              "Keyboard horizontal input aims cannon")
        shots = after["stats"]["weapons"]["flak"]
        page.keyboard.down("Space")
        after = step(page, 0.65)
        page.keyboard.up("Space")
        check(after["stats"]["weapons"]["flak"] > shots, "Space fires flak shells")
        page.keyboard.press("q")
        after = step(page, 0.025)
        check(after["players"][0]["weapon"] == "torpedo", "Q switches to guided torpedoes")
        shots = after["stats"]["weapons"]["torpedo"]
        page.mouse.move(950, 270)
        page.mouse.down()
        after = step(page, 0.6)
        page.mouse.up()
        check(after["stats"]["weapons"]["torpedo"] > shots, "Mouse click fires selected weapon")
        check(page.locator("body").get_attribute("data-input") == "mouse", "Mouse movement updates prompts")
        page.mouse.click(950, 270, button="right")
        after = step(page, 0.025)
        check(after["players"][0]["weapon"] == "flak", "Right click swaps weapons")
        page.evaluate("window.__game.setPlayer(0,{heat:.98,cooldown:0,lock:0});window.__game.fire(0)")
        check(state(page)["players"][0]["lock"] > 0, "Overheated barrel locks firing")
        after = step(page, 2.1)
        check(after["players"][0]["lock"] == 0, "Barrel recovers after cooling")

    case("Launch and keyboard/mouse", launch_and_keyboard)

    def menus_and_developer_tools():
        page.keyboard.press("Escape")
        before = state(page)
        check(before["paused"] and before["screen"] == "pause", "Escape opens pause menu")
        after = step(page, 2)
        check(after["elapsed"] == before["elapsed"], "Paused simulation freezes the patrol clock")
        page.locator("#pause-settings").click()
        check(state(page)["screen"] == "settings", "Settings are reachable from pause")
        range_value(page, "#music-volume", 27)
        range_value(page, "#sfx-volume", 41)
        page.locator("#glyph-select").select_option("xbox")
        after = state(page)
        check(abs(after["audio"]["musicVolume"] - 0.27) < 0.001, "Music slider updates live audio")
        check(abs(after["audio"]["sfxVolume"] - 0.41) < 0.001, "Effects slider updates live audio")
        preferences = page.evaluate("JSON.parse(localStorage.getItem('kerfuffle-prefs'))")
        check(preferences["glyphs"] == "xbox", "Controller glyph preference is saved")
        range_value(page, "#music-volume", 10)
        range_value(page, "#sfx-volume", 75)
        page.keyboard.press("Escape")
        page.locator("#dev-button").click()
        check(state(page)["screen"] == "dev", "Developer tools are reachable from pause")
        range_value(page, '[data-balance="fireRate"]', 2.1)
        range_value(page, '[data-balance="enemySpeed"]', 0.75)
        check(abs(state(page)["balance"]["fireRate"] - 2.1) < 0.001, "Fire-rate slider tunes live balance")
        check(abs(state(page)["balance"]["enemySpeed"] - 0.75) < 0.001, "Enemy-speed slider tunes live balance")
        page.locator("#invincible").check()
        health = state(page)["health"]
        page.evaluate("window.__game.hurt(500)")
        check(state(page)["health"] == health, "Invincibility prevents coast damage")
        page.locator("#next-wave").click()
        check(state(page)["stage"] == 1, "Developer wave advance works")
        page.locator("#repair").click()
        after = state(page)
        check(after["health"] == 100 and after["players"][0]["charge"] == 1,
              "Repair tool restores coast and broadside")
        page.locator("#spawn-boss").click()
        after = state(page)
        check(after["stage"] == 3 and any(e["type"] == "boss" for e in after["enemies"]),
              "Developer tool can summon flagship")
        page.locator("#reset-balance").click()
        after = state(page)
        check(after["balance"] == {"fireRate": 1, "enemySpeed": 1, "spawnRate": 1, "damage": 1,
                                   "shotSpeed": 1, "duration": 136, "assist": 0.24},
              "Reset restores all default balance variables", after["balance"])
        check(not page.locator("#invincible").is_checked() and not page.locator("#autopilot").is_checked(),
              "Reset disables developer cheats")
        page.keyboard.press("Escape")
        page.locator("#resume-button").click()
        check(not state(page)["paused"] and state(page)["screen"] is None, "Resume returns to gameplay")

    case("Pause/settings/developer tools", menus_and_developer_tools)

    def local_coop():
        reset(page)
        page.locator("#coop-button").click()
        after = step(page, 2.6)
        check(all(p["active"] for p in after["players"]), "Local co-op activates both cannons")
        before_angle = after["players"][1]["angle"]
        page.keyboard.down("j")
        page.keyboard.down("k")
        after = step(page, 0.4)
        page.keyboard.up("j")
        page.keyboard.up("k")
        check(after["players"][1]["angle"] > before_angle + 0.2, "Player-two keyboard aim works")
        check(after["players"][1]["heat"] > 0, "Player-two keyboard fires independently")
        page.keyboard.press("u")
        after = step(page, 0.025)
        check(after["players"][1]["weapon"] == "torpedo", "Player-two U switches weapon")
        check(page.locator("#player-1").is_visible(), "Local co-op displays second gunner HUD")

    case("Local keyboard co-op", local_coop)

    def gamepads():
        page.evaluate("""window.__padStates=[0,1].map(()=>({axes:[0,0,0,0],buttons:Array(17).fill(0)}));
          __padStates[0].axes[0]=.8;__padStates[1].axes[0]=-.8;
          __padStates[0].buttons[7]=1;__padStates[1].buttons[7]=1;""")
        page.wait_for_function("document.body.dataset.input==='gamepad'", timeout=10000)
        before = state(page)
        after = step(page, 0.5)
        check(after["players"][0]["angle"] < before["players"][0]["angle"], "First standard gamepad aims gold cannon")
        check(after["players"][1]["angle"] > before["players"][1]["angle"], "Second standard gamepad aims mint cannon")
        check(after["players"][0]["heat"] > 0 and after["players"][1]["heat"] > 0,
              "Both gamepad triggers fire independently")
        check(page.locator('[data-prompt="fire"]').first.inner_text() == "RT", "Xbox setting changes trigger glyphs")
        weapon = after["players"][0]["weapon"]
        page.evaluate("__padStates.forEach(p=>{p.axes=[0,0,0,0];p.buttons.fill(0)});__padStates[0].buttons[4]=1")
        page.wait_for_function("w=>window.__game.state.players[0].weapon!==w", arg=weapon, timeout=10000)
        check(state(page)["players"][0]["weapon"] != weapon, "Gamepad shoulder swaps weapons")
        page.evaluate("__padStates[0].buttons.fill(0)")
        page.wait_for_timeout(150)
        page.evaluate("__padStates[0].buttons[9]=1")
        page.wait_for_function("window.__game.state.paused", timeout=10000)
        check(state(page)["screen"] == "pause", "Gamepad options button opens pause")
        page.evaluate("__padStates[0].buttons.fill(0)")
        page.wait_for_timeout(150)
        page.evaluate("__padStates[0].buttons[0]=1")
        page.wait_for_function("!window.__game.state.paused", timeout=10000)
        check(state(page)["screen"] is None, "Gamepad confirm resumes focused menu action")
        page.evaluate("window.__padStates=[]")
        page.keyboard.press("Escape")
        page.locator("#pause-settings").click()
        page.locator("#glyph-select").select_option("ps")
        page.keyboard.press("Escape")
        page.locator("#resume-button").click()

    case("Two emulated standard gamepads", gamepads)

    def full_patrol():
        reset(page)
        before = state(page)["stats"]
        page.evaluate("window.__game.start()")
        after = step(page, 145, True)
        OBSERVATIONS["fullPatrol"] = {k: after[k] for k in ["result", "health", "score", "stage", "elapsed", "stats"]}
        check(after["mode"] == "result" and after["result"] is not None, "Full default patrol reaches results")
        check(after["result"] and after["result"]["won"], "Scripted default patrol defeats flagship", after["result"])
        check(all(i in after["stats"]["stages"] for i in range(4)), "Full patrol visits all four operations")
        check(after["stats"]["spawns"].get("boss", 0) > before["spawns"].get("boss", 0), "Final operation spawns flagship")
        check(after["stats"]["weapons"]["flak"] > before["weapons"]["flak"], "Playthrough uses flak")
        check(after["stats"]["weapons"]["torpedo"] > before["weapons"]["torpedo"], "Playthrough uses guided torpedoes")
        check(after["stats"]["salvos"] > before["salvos"], "Playthrough charges and fires broadside")
        check(after["stats"]["physicsHits"] > before["physicsHits"], "Rapier collision events register weapon hits")
        check(after["score"] > 1000 and after["health"] > 0, "Patrol produces a surviving coast and score")
        finite = page.evaluate("""()=>{const s=__game.state;return [...s.players,...s.enemies,...s.projectiles]
          .every(e=>['x','y'].every(k=>Number.isFinite(e[k])))}""")
        check(finite, "Physics entity positions remain finite through whole patrol")
        check(page.locator("#result-screen").is_visible(), "Completed patrol presents results screen")

    case("Complete default patrol", full_patrol)

    def attract():
        reset(page)
        before = state(page)["stats"]["attracts"]
        page.evaluate("window.__game.setIdle(10.1)")
        page.wait_for_function("window.__game.state.mode==='attract'", timeout=10000)
        check(page.locator("#demo-label").is_visible(), "Ten seconds of title inactivity starts labeled attract demo")
        after = step(page, 150, True)
        check(after["mode"] == "attract" and after["stats"]["attracts"] >= before + 2,
              "Attract demonstration loops after playing a complete patrol", after["stats"]["attracts"])
        page.keyboard.press("x")
        check(state(page)["mode"] == "title", "Any keyboard input exits attract mode to title")

    case("Attract demo and exit", attract)

    def failure_and_credits():
        reset(page)
        page.evaluate("window.__game.start();window.__game.hurt(120)")
        after = state(page)
        check(after["result"] and not after["result"]["won"] and after["health"] == 0,
              "Coast destruction ends patrol with loss")
        page.locator("#retry-button").click()
        after = state(page)
        check(after["mode"] == "play" and after["health"] == 100 and after["result"] is None,
              "Retry resets completed patrol")
        reset(page)
        page.locator("#howto-button").click()
        check(page.locator("#howto-screen").is_visible(), "Field manual is reachable")
        check("136" in page.locator("#howto-screen").inner_text(), "Field manual explains patrol objective")
        page.keyboard.press("Escape")
        page.locator("#credits-button").click()
        headings = []
        for _ in range(4):
            headings.append(page.locator("#credits-title").inner_text())
            page.locator("#credits-next").click()
        check([heading.lower() for heading in headings] == ["source information", "testing feedback", "engine feedback", "prompt feedback"],
              "All four required information/feedback screens are reachable", headings)
        check(page.locator("#credits-content").inner_text().find("added on import") >= 0,
              "Credits preserve required usage field")

    case("Loss, retry, manual and credits", failure_and_credits)


def touch_checks(page, context):
    def touch_play():
        check(state(page)["backend"] == "WebGL2 fallback", "WebGL2 fallback initializes without WebGPU", state(page)["backend"])
        button = page.locator("#play-button").bounding_box()
        page.touchscreen.tap(button["x"] + button["width"] / 2, button["y"] + button["height"] / 2)
        after = step(page, 2.6)
        check(after["mode"] == "play", "Phone touchscreen starts a patrol")
        check(page.locator("#menu-button").is_visible(), "Touch layout exposes minimal pause button")
        check(not page.locator(".hud-controls").is_visible(), "Touch layout hides keyboard control text")
        session = context.new_cdp_session(page)
        before = state(page)
        session.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": 140, "y": 400, "id": 1}]})
        after = step(page, 0.45)
        check(after["stats"]["weapons"]["flak"] > before["stats"]["weapons"]["flak"],
              "Holding a touch auto-fires the cannon")
        angle = after["players"][0]["angle"]
        session.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": 280, "y": 200, "id": 1}]})
        after = step(page, 0.2)
        check(abs(after["players"][0]["angle"] - angle) > 0.05, "Touch drag adjusts aim")
        page.evaluate("window.__game.setPlayer(0,{charge:1})")
        salvos = after["stats"]["salvos"]
        session.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [
            {"x": 280, "y": 200, "id": 1}, {"x": 335, "y": 510, "id": 2}
        ]})
        after = step(page, 0.05)
        check(after["stats"]["salvos"] == salvos + 1, "Second finger activates charged broadside")
        session.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        check(page.locator("body").get_attribute("data-input") == "touch", "Touch input selects touch assistance")
        button = page.locator("#menu-button").bounding_box()
        page.touchscreen.tap(button["x"] + button["width"] / 2, button["y"] + button["height"] / 2)
        check(state(page)["paused"] and state(page)["screen"] == "pause", "Touch pause button opens menu")
        session.detach()

    case("Touch profile and WebGL fallback", touch_play)


try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=[
            "--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-webgpu-adapter=swiftshader",
            "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
        ])
        desktop = browser.new_context(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
        desktop.add_init_script(PAD_SCRIPT)
        page = desktop.new_page()
        boot(page)
        OBSERVATIONS["desktopBackend"] = state(page)["backend"]
        desktop_checks(page)
        desktop.close()
        phone_options = dict(playwright.devices["Pixel 7"])
        phone_options["device_scale_factor"] = 1
        phone = browser.new_context(**phone_options)
        phone.add_init_script(PAD_SCRIPT + "Object.defineProperty(navigator,'gpu',{configurable:true,get:()=>undefined});")
        page = phone.new_page()
        boot(page)
        OBSERVATIONS["touchBackend"] = state(page)["backend"]
        touch_checks(page, phone)
        phone.close()
        browser.close()
    check(not PAGE_ERRORS, "No uncaught browser errors", PAGE_ERRORS)
except Exception as error:
    check(False, "Browser test suite completed", str(error).split("\n")[0])

report = {"url": URL, "checks": len(CHECKS), "failures": FAILURES, "results": CHECKS,
          "observations": OBSERVATIONS, "pageErrors": PAGE_ERRORS, "seconds": round(time.time() - STARTED, 2),
          "parameters": {"browser": "Chromium 153 / Playwright 1.63", "desktop": "1280x720 WebGPU SwiftShader",
                         "touch": "Pixel 7 profile / WebGL2 fallback", "clock": "60 Hz deterministic Rapier steps",
                         "pads": "Two standard-mapping Gamepad API stubs"}}
HERE.joinpath("game-test-results.json").write_text(json.dumps(report, indent=2) + "\n")
for failure in FAILURES:
    print("FAIL: " + failure)
print(f"{len(CHECKS)} gameplay checks, {len(FAILURES)} failures")
sys.exit(1 if FAILURES else 0)
