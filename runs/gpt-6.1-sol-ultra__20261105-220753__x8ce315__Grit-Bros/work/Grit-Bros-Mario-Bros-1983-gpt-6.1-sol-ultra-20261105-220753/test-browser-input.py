from pathlib import Path

from playwright.sync_api import sync_playwright

root = Path(__file__).parent
html = root.parent / (root.name + ".html")
checks = 0
failures = []
errors = []


def check(condition, message):
    global checks
    checks += 1
    if not condition:
        failures.append(message)


def mode(page, target):
    page.wait_for_function(
        "(target) => window.Grit?.mode === target", arg=target, timeout=15000
    )


def pad_button(page, index, pressed=True):
    page.evaluate(
        "(args) => { const [index,pressed]=args; padList[0].buttons[index]={pressed,value:pressed?1:0}; }",
        [index, pressed],
    )
    page.wait_for_timeout(80)


def press_pad(page, index):
    pad_button(page, index, True)
    pad_button(page, index, False)


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=[
            "--no-sandbox",
            "--autoplay-policy=no-user-gesture-required",
            "--enable-unsafe-webgpu",
            "--enable-features=Vulkan",
            "--use-webgpu-adapter=swiftshader",
        ],
    )
    context = browser.new_context(viewport={"width": 1100, "height": 700})
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append("desktop: " + str(error)))
    page.add_init_script(
        """window.padList=[]; Object.defineProperty(navigator,'getGamepads',{value:()=>window.padList});"""
    )
    page.goto(html.as_uri() + "?visual-qa=1")
    page.wait_for_function("window.Grit", timeout=60000)
    check(
        page.title().startswith("Grit Bros"),
        "Final HTML title did not identify the game",
    )
    check(
        page.evaluate("Grit.mode") == "title", "Final HTML did not reach title screen"
    )
    check(
        page.evaluate("Grit.audio.musicVolume") == 0.1,
        "Default music volume is not 10%",
    )
    page.keyboard.press("Enter")
    mode(page, "play")
    check(
        page.evaluate("Grit.state.players[0].active"),
        "Keyboard start did not activate P1",
    )
    page.evaluate("Grit.settings.invincible=true")
    start_x = page.evaluate("Grit.state.players[0].x")
    page.keyboard.down("d")
    page.wait_for_timeout(220)
    page.keyboard.up("d")
    check(
        page.evaluate("Grit.state.players[0].x") > start_x + 0.2,
        "Keyboard movement did not move P1",
    )
    page.keyboard.press("Escape")
    mode(page, "pause")
    check(
        page.locator(".panel h1").inner_text() == "TAKE FIVE.",
        "Keyboard pause panel missing",
    )
    page.keyboard.press("ArrowDown")
    page.keyboard.press("ArrowDown")
    page.keyboard.press("ArrowDown")
    page.keyboard.press("Enter")
    mode(page, "dev")
    check(
        page.locator('[data-setting="speed"]').count() == 1,
        "Pause menu could not navigate to dev workshop",
    )
    speed = page.evaluate("Grit.settings.speed")
    page.keyboard.press("ArrowRight")
    check(
        page.evaluate("Grit.settings.speed") > speed,
        "Dev speed slider did not apply live",
    )
    page.keyboard.press("ArrowDown")
    check(
        page.locator('[data-setting="jump"]').evaluate(
            '(el)=>el.classList.contains("selected")'
        ),
        "Keyboard failed to focus jump slider",
    )
    page.keyboard.press("ArrowDown")
    check(
        page.locator('[data-setting="gravity"]').evaluate(
            '(el)=>el.classList.contains("selected")'
        ),
        "Keyboard Up/Down gets trapped in focused range sliders",
    )
    page.keyboard.press("Escape")
    mode(page, "pause")
    page.keyboard.press("Escape")
    mode(page, "play")
    check(
        page.evaluate("Grit.mode") == "play",
        "Keyboard could not resume from dev workshop",
    )
    offline = page.evaluate("() => Grit.audio.testOffline()")
    check(
        offline["invalidSamples"] == 0
        and offline["rms"] > 0.005
        and offline["peak"] < 1,
        "Bundled procedural audio failed finite/audible/unclipped validation",
    )
    check(
        page.evaluate("Grit.audio.ctx.state") == "running",
        "Audio context did not unlock through keyboard start",
    )
    page.evaluate(
        """() => { Grit.showTitle(); window.padList=[{index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}]; }"""
    )
    page.wait_for_timeout(80)
    press_pad(page, 13)
    check(
        page.locator('[data-action="coop"]').evaluate(
            '(el)=>el.classList.contains("selected")'
        ),
        "Standard controller could not navigate title menu",
    )
    press_pad(page, 0)
    mode(page, "play")
    check(
        page.evaluate("Grit.state.players.filter(p=>p.active).length") == 2,
        "Controller confirmation did not start couch co-op",
    )
    page.evaluate("Grit.settings.invincible=true")
    page.evaluate("padList[0].axes[0]=-1")
    page.wait_for_timeout(120)
    check(
        page.evaluate("Grit.input.getPlayers()[0].x") == -1,
        "Controller left stick did not reach game input",
    )
    check(
        page.evaluate("Grit.input.lastType") == "gamepad",
        "Controller prompts did not follow actual input",
    )
    page.evaluate("padList[0].axes[0]=0")
    press_pad(page, 9)
    mode(page, "pause")
    check(page.evaluate("Grit.mode") == "pause", "Controller Options did not pause")
    press_pad(page, 0)
    mode(page, "play")
    check(page.evaluate("Grit.mode") == "play", "Controller Cross did not resume")
    check(
        not errors,
        "Bundled desktop browser emitted JavaScript errors: " + "; ".join(errors),
    )
    context.close()
    phone = browser.new_context(
        viewport={"width": 390, "height": 844},
        is_mobile=True,
        has_touch=True,
        device_scale_factor=1,
    )
    page = phone.new_page()
    page.on("pageerror", lambda error: errors.append("phone: " + str(error)))
    page.goto(html.as_uri() + "?visual-qa=1")
    page.wait_for_function("window.Grit", timeout=60000)
    page.locator('[data-action="solo"]').tap()
    mode(page, "play")
    check(
        page.evaluate('Grit.input.isTouch && Grit.input.lastType==="touch"'),
        "Phone did not identify touchscreen input",
    )
    check(
        page.evaluate('document.body.classList.contains("touch")'),
        "Touch menu tap incorrectly restored dense desktop UI",
    )
    check(
        page.locator("#touch-menu").is_visible(), "Phone touch pause button is missing"
    )
    page.locator("#touch-menu").tap()
    mode(page, "pause")
    check(page.evaluate("Grit.mode") == "pause", "Phone pause button failed")
    page.locator('[data-action="resume"]').tap()
    mode(page, "play")
    page.evaluate("Grit.settings.invincible=true")
    charges = page.evaluate("Grit.state.powCharges")
    page.locator("#touch-thump").tap()
    page.wait_for_timeout(100)
    check(
        page.evaluate("Grit.state.powCharges") == charges - 1,
        "Phone contextual thump did not consume a charge",
    )
    check(not errors, "Phone browser emitted JavaScript errors: " + "; ".join(errors))
    phone.close()
    browser.close()

for failure in failures:
    print("FAIL: " + failure)
print(f"{checks} bundled input/audio/UI checks, {len(failures)} failures")
raise SystemExit(bool(failures))
