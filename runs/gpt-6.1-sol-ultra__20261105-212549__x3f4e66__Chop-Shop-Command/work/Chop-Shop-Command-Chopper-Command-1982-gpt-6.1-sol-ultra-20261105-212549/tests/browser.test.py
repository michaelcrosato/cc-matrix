import os
import sys
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

DIR = Path(__file__).resolve().parents[1]
ROOT = DIR.parent
BASE = os.environ.get("CSC_BASE_URL", "http://127.0.0.1:36269")
NAME = DIR.name + ".html"
checks = 0
failures = []


def check(name, fn):
    global checks
    checks += 1
    try:
        fn()
    except (AssertionError, PlaywrightError) as error:
        failures.append(name + ": " + str(error).split("\n")[0])


def require(value, detail="assertion failed"):
    if not value:
        raise AssertionError(detail)


PAD = """
window.testPad=null;
navigator.getGamepads=()=>window.testPad?[window.testPad,window.testPad2||null]:[];
window.setPad=(pressed=[],axes=[0,0,0,0])=>{window.testPad={id:'Test DualSense',index:0,connected:true,mapping:'standard',axes,buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0,touched:pressed.includes(i)})),timestamp:performance.now()};};
"""


def ready(page):
    page.wait_for_function("window.__game || window.__bootError", timeout=60000)
    require(page.evaluate("!window.__bootError"), page.evaluate("window.__bootError"))
    require(page.title() == "Chop Shop Command", "wrong page served")


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=[
            "--no-sandbox",
            "--enable-unsafe-webgpu",
            "--enable-features=Vulkan",
            "--use-webgpu-adapter=swiftshader",
        ],
    )
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    gpu_errors = []
    page.on("pageerror", lambda error: gpu_errors.append(str(error)))
    check(
        "portable file loads with requested engines and WebGPU",
        lambda: (
            page.goto((ROOT / NAME).as_uri()),
            ready(page),
            require(page.evaluate("__game.state.renderer") == "WebGPU"),
            require(page.evaluate("__game.state.physics") == "0.19.3"),
            require(page.evaluate("__game.state.three") == "180"),
        ),
    )
    check(
        "WebGPU engine draws successive animation frames",
        lambda: (
            page.wait_for_function("__game.state.frames > 8", timeout=15000),
            require(not gpu_errors, str(gpu_errors)),
        ),
    )
    browser.close()

    browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
    context = browser.new_context(viewport={"width": 1600, "height": 900})
    context.add_init_script(
        "Object.defineProperty(navigator,'gpu',{value:undefined});" + PAD
    )
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(BASE + "/" + NAME)
    ready(page)
    check(
        "title fits and packaged font is available",
        lambda: (
            page.evaluate("document.fonts.ready"),
            require(
                page.evaluate("document.fonts.check('900 100px \"Barlow Condensed\"')")
            ),
            require(page.locator("#title .title-actions").bounding_box()["y"] < 750),
        ),
    )
    check(
        "keyboard launches the highlighted sortie",
        lambda: (
            page.keyboard.press("Enter"),
            page.wait_for_function("__game.state.screen === 'play'"),
            require(len(page.evaluate("__game.state.trucks")) == 12),
        ),
    )
    x = page.evaluate("__game.state.players[0].x")
    check(
        "keyboard flight and unlimited cannon work",
        lambda: (
            page.keyboard.down("KeyD"),
            page.keyboard.down("Space"),
            page.wait_for_timeout(500),
            page.keyboard.up("KeyD"),
            page.keyboard.up("Space"),
            require(page.evaluate("__game.state.players[0].x") > x + 1),
            require(page.evaluate("__game.state.shots") >= 2),
        ),
    )
    check(
        "mouse aiming fires at the world",
        lambda: (
            page.mouse.move(1100, 350),
            page.mouse.down(),
            page.wait_for_timeout(300),
            page.mouse.up(),
            require(page.evaluate("__game.sim.players[0].aimX") > 0),
            require(page.evaluate("__game.state.lastInput") == "keyboard"),
        ),
    )
    check(
        "shield activates with its keyboard key",
        lambda: (
            page.keyboard.press("KeyE"),
            page.wait_for_timeout(100),
            require(page.evaluate("__game.state.pulseReady") > 10),
            require(page.evaluate("__game.state.convoyShield") > 2),
        ),
    )
    page.keyboard.press("Escape")
    frozen = page.evaluate("__game.state.time")
    check(
        "pause freezes simulation and exposes dev mode",
        lambda: (
            page.wait_for_timeout(250),
            require(page.evaluate("__game.state.time") == frozen),
            page.keyboard.press("ArrowDown"),
            require(page.evaluate("__game.state.audio.state") == "suspended"),
            page.get_by_role("button", name="Dev flight deck").click(),
            require(page.evaluate("__game.state.screen") == "dev"),
        ),
    )
    check(
        "dev sliders alter live balance and reset defaults",
        lambda: (
            page.locator("[data-dev=speed]").evaluate(
                "el => {el.value=44;el.dispatchEvent(new Event('input',{bubbles:true}));}"
            ),
            require(page.evaluate("__game.state.cfg.speed") == 44),
            page.get_by_role("button", name="OFF", exact=True).click(),
            require(page.evaluate("__game.state.dev.god")),
            page.get_by_role("button", name="Reset defaults").click(),
            require(page.evaluate("__game.state.cfg.speed") == 26),
        ),
    )
    page.get_by_role("button", name="← BACK").click()
    page.get_by_role("button", name="Settings", exact=True).click()
    check(
        "music defaults to ten percent and sliders affect audio",
        lambda: (
            require(page.evaluate("__game.state.audio.musicVolume") == 0.1),
            page.locator("[data-setting=music]").evaluate(
                "el => {el.value=.25;el.dispatchEvent(new Event('input',{bubbles:true}));}"
            ),
            require(page.evaluate("__game.state.audio.musicVolume") == 0.25),
            page.locator("[data-setting=music]").evaluate(
                "el => {el.value=.1;el.dispatchEvent(new Event('input',{bubbles:true}));}"
            ),
        ),
    )
    check(
        "Xbox glyph option changes controller prompts",
        lambda: (
            page.get_by_role("button", name="PlayStation", exact=True).click(),
            page.evaluate("setPad([], [0.3,0,0,0])"),
            page.wait_for_timeout(100),
            require("X " in page.locator("#pulseLabel").inner_text()),
            page.evaluate("setPad()"),
        ),
    )
    page.get_by_role("button", name="← BACK").click()
    page.get_by_role("button", name="Return to hangar").click()
    check(
        "emulated standard gamepad launches and flies",
        lambda: (
            page.evaluate("setPad([0])"),
            page.wait_for_timeout(120),
            page.evaluate("setPad([], [1,0,0,0])"),
            page.wait_for_timeout(350),
            require(page.evaluate("__game.state.screen") == "play"),
            require(page.evaluate("__game.state.players[0].vx") > 5),
            page.evaluate("setPad([7], [0,0,1,0])"),
            page.wait_for_timeout(300),
            require(page.evaluate("__game.state.shots") > 0),
            page.evaluate("setPad()"),
        ),
    )
    check(
        "Create plus Options leaves hub shortcut untouched",
        lambda: (
            page.evaluate("setPad([8,9])"),
            page.wait_for_timeout(100),
            require(page.evaluate("__game.state.screen") == "play"),
            page.evaluate("setPad()"),
            page.wait_for_timeout(60),
        ),
    )
    check(
        "gamepad Options pauses and Cross resumes",
        lambda: (
            page.evaluate("setPad([9])"),
            page.wait_for_timeout(400),
            require(
                page.evaluate("__game.state.screen") == "pause",
                page.evaluate("__game.state.screen"),
            ),
            page.evaluate("setPad()"),
            page.wait_for_function('__game.state.audio.state === "suspended"'),
            page.wait_for_timeout(300),
            page.evaluate("setPad([0])"),
            page.wait_for_timeout(300),
            require(
                page.evaluate("__game.state.screen") == "play",
                page.evaluate("__game.state.screen"),
            ),
            page.evaluate("setPad()"),
        ),
    )
    page.evaluate("setPad()")
    page.evaluate('__game.menu("title")')
    page.get_by_role("button", name="2 pilot co-op").click()
    check(
        "standalone co-op accepts independent keyboard controls",
        lambda: (
            require(len(page.evaluate("__game.state.players")) == 2),
            page.keyboard.down("KeyA"),
            page.keyboard.down("KeyL"),
            page.keyboard.down("KeyN"),
            page.wait_for_timeout(400),
            page.keyboard.up("KeyA"),
            page.keyboard.up("KeyL"),
            page.keyboard.up("KeyN"),
            require(page.evaluate("__game.state.players[0].vx") < -2),
            require(page.evaluate("__game.state.players[1].vx") > 2),
            require(page.evaluate("__game.state.shots") > 0),
        ),
    )
    check(
        "two standard gamepads fly both co-op pilots",
        lambda: (
            page.evaluate(
                "setPad([],[-1,0,0,0]);testPad2={...testPad,index:1,axes:[1,0,0,0]};"
            ),
            page.wait_for_timeout(400),
            require(page.evaluate("__game.state.players[0].vx") < -2),
            require(page.evaluate("__game.state.players[1].vx") > 2),
            page.evaluate("testPad2=null;setPad()"),
        ),
    )
    page.evaluate('__game.menu("title")')
    page.get_by_role("button", name="Credits", exact=True).click()
    check(
        "credits contain all required source and feedback pages",
        lambda: (
            require("added on import" in page.locator("#menu").inner_text()),
            page.get_by_role("button", name="Next →").click(),
            require("TESTING FEEDBACK" in page.locator("#menu").inner_text()),
            page.get_by_role("button", name="Next →").click(),
            require("ENGINE FEEDBACK" in page.locator("#menu").inner_text()),
            page.get_by_role("button", name="Next →").click(),
            require("PROMPT FEEDBACK" in page.locator("#menu").inner_text()),
        ),
    )
    page.evaluate('__game.menu("title")')

    def attract_check():
        began = page.evaluate("performance.now()")
        page.wait_for_function("__game.state.screen === 'attract'", timeout=20000)
        require(
            page.evaluate("performance.now()") - began >= 9500,
            "attract started before idle interval",
        )
        page.wait_for_function("__game.state.shots > 0", timeout=5000)
        page.keyboard.press("KeyA")
        require(
            page.evaluate("__game.state.screen") == "title",
            "input did not exit attract",
        )

    check("attract starts after ten seconds and any input exits", attract_check)
    check(
        "no runtime exceptions during interactive desktop checks",
        lambda: require(not errors, str(errors)),
    )
    context.close()

    context = browser.new_context(
        viewport={"width": 844, "height": 390},
        is_mobile=True,
        has_touch=True,
        device_scale_factor=1,
    )
    context.add_init_script("Object.defineProperty(navigator,'gpu',{value:undefined});")
    page = context.new_page()
    page.goto(BASE + "/" + NAME)
    ready(page)
    check(
        "touch launch enables assisted fire and minimal interface",
        lambda: (
            page.get_by_role("button", name="Launch sortie").tap(),
            page.wait_for_timeout(300),
            require(page.evaluate("__game.state.screen") == "play"),
            require(page.evaluate("__game.state.lastInput") == "touch"),
            require(page.evaluate("__game.state.shots") > 0),
            require(not page.locator("#bottom").is_visible()),
        ),
    )
    session = context.new_cdp_session(page)

    def touch_drag():
        session.send(
            "Input.dispatchTouchEvent",
            {"type": "touchStart", "touchPoints": [{"x": 140, "y": 240, "id": 1}]},
        )
        session.send(
            "Input.dispatchTouchEvent",
            {"type": "touchMove", "touchPoints": [{"x": 210, "y": 210, "id": 1}]},
        )
        page.wait_for_timeout(250)
        require(page.evaluate("__game.state.players[0].vx") > 5)
        session.send(
            "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
        )
        page.locator("#touchPulse").tap()
        require(page.evaluate("__game.state.pulseReady") > 0)

    check("invisible touch flight and contextual shield work", touch_drag)
    context.close()
    context = browser.new_context(
        viewport={"width": 390, "height": 844},
        is_mobile=True,
        has_touch=True,
        device_scale_factor=1,
    )
    context.add_init_script("Object.defineProperty(navigator,'gpu',{value:undefined});")
    page = context.new_page()
    page.goto(BASE + "/" + NAME)
    ready(page)
    check(
        "portrait phone has reachable menus and assisted flight",
        lambda: (
            require(page.locator("[data-action=solo]").bounding_box()["y"] < 700),
            page.locator("[data-action=solo]").tap(),
            page.wait_for_timeout(300),
            require(page.evaluate("__game.state.screen") == "play"),
            require(page.evaluate("__game.state.shots") > 0),
        ),
    )
    context.close()
    browser.close()

for failure in failures:
    print("FAIL " + failure)
print(f"{checks} browser checks, {len(failures)} failures")
sys.exit(bool(failures))
