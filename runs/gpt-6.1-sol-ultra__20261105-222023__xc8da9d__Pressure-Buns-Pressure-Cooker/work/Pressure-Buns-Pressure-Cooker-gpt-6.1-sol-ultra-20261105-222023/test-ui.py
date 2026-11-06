"""Controller, keyboard, touch, attract, audio and default-renderer browser checks."""

import pathlib

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

PAD_SCRIPT = """
window.__padEnabled=false;window.__padPolls=0;
window.__pad={id:'Emulated DualSense',index:0,connected:true,mapping:'standard',timestamp:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>{window.__padPolls++;return window.__padEnabled?[window.__pad]:[];}});
window.__padButton=(n,down)=>{window.__padEnabled=true;window.__pad.buttons[n]={pressed:down,touched:down,value:down?1:0};window.__pad.timestamp=performance.now();};
"""


def main():
    folder = pathlib.Path(__file__).resolve().parent
    game = folder.parent / (folder.name + ".html")
    url = game.as_uri()
    failures = []
    count = 0

    def check(condition, message):
        nonlocal count
        count += 1
        if not condition:
            failures.append(message)

    def expect(page, expression, message, timeout=5000):
        try:
            page.wait_for_function(expression, timeout=timeout)
            check(True, message)
            return True
        except PlaywrightError:
            check(False, message)
            return False

    def pulse(page, button):
        before = page.evaluate("(n)=>{__padButton(n,true);return __padPolls}", button)
        page.wait_for_function(f"__padPolls>={before + 2}", timeout=10000)
        before = page.evaluate("(n)=>{__padButton(n,false);return __padPolls}", button)
        page.wait_for_function(f"__padPolls>={before + 2}", timeout=10000)

    def title_activity(page):
        # Software rendering can spend the title's idle window compiling a frame.
        # Native mouse motion gives the game fresh input before a title action.
        page.mouse.move(20, 20)
        page.mouse.move(21, 20)

    browser = None
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
            desktop = browser.new_context(viewport={"width": 1280, "height": 720})
            desktop.add_init_script(PAD_SCRIPT)
            page = desktop.new_page()
            page.goto(url + "?renderer=webgl", wait_until="domcontentloaded")
            if not expect(
                page,
                "window.__game?.ready",
                "file:// bundle must boot without a server",
                30000,
            ):
                check(
                    False, "Game boot details: " + page.locator("#error").inner_text()
                )
                browser.close()
                for failure in failures:
                    print("FAIL: " + failure)
                print(f"{count} UI checks, {len(failures)} failures")
                return True
            check(
                page.evaluate('__game.screen==="title"'),
                "Standalone game must open its title screen",
            )
            check(
                page.evaluate("Math.abs(__game.audio.getStats().musicVolume-.1)<1e-9"),
                "Default music volume must be10%",
            )
            audio = page.evaluate("__game.audio.testOffline()")
            check(
                audio.get("finite")
                and audio.get("supported")
                and audio.get("rms", 0) > 0
                and audio.get("peak", 0) > 0,
                "Offline music, SFX and voice synthesis must produce finite non-silent samples",
            )
            title_activity(page)
            pulse(page, 0)
            expect(
                page,
                '__game.screen===null && __game.game.state.mode==="play"',
                "Controller Cross must start a game",
            )
            check(
                page.evaluate('__game.lastInput==="gamepad"'),
                "Controller menu activation must preserve gamepad input mode",
            )
            check(
                "×" in page.locator("#prompts").inner_text()
                and "□" in page.locator("#prompts").inner_text(),
                "PlayStation action glyphs must remain after controller menu activation",
            )
            initial = page.evaluate("__game.game.state.players[0].x")
            page.evaluate("__pad.axes[0]=.85")
            expect(
                page,
                f"__game.game.state.players[0].x>{initial + 0.35}",
                "Left stick must move the simulated chef",
            )
            page.evaluate("__pad.axes[0]=0")
            initial_z = page.evaluate("__game.game.state.players[0].z")
            page.keyboard.down("w")
            expect(
                page,
                f"__game.game.state.players[0].z<{initial_z - 0.3}",
                "W must move the same chef with keyboard input",
            )
            page.keyboard.up("w")
            check(
                page.evaluate('__game.lastInput==="keyboard"')
                and "E" in page.locator("#prompts").inner_text(),
                "Keyboard activity must replace pad prompts with keyboard keys",
            )
            pulse(page, 9)
            expect(
                page, '__game.screen==="pause"', "Options must pause standalone play"
            )
            paused_time = page.evaluate("__game.game.state.time")
            page.wait_for_timeout(300)
            check(
                abs(page.evaluate("__game.game.state.time") - paused_time) < 0.001,
                "Paused single-player simulation must freeze",
            )
            for _ in range(3):
                pulse(page, 13)
            check(
                page.evaluate(
                    'document.querySelector("#dev").classList.contains("focused")'
                ),
                "Controller must navigate from pause to Developer kitchen",
            )
            pulse(page, 0)
            expect(
                page,
                '__game.screen==="dev"',
                "Developer kitchen must be reachable from pause",
            )
            speed = page.evaluate("__game.game.config.playerSpeed")
            pulse(page, 15)
            check(
                page.evaluate("__game.game.config.playerSpeed") > speed,
                "Controller D-pad must adjust the focused live tuning slider",
            )
            page.locator("#devReset").click(force=True)
            check(
                page.evaluate(
                    "__game.game.config.playerSpeed===5.2 && __game.game.config.beltSpeed===1 && __game.game.config.spawnInterval===2.2 && !__game.game.config.autoplay"
                ),
                "Developer reset must restore the important gameplay defaults",
            )
            page.locator("#devScreen [data-back]").click(force=True)
            page.locator("#quit").click(force=True)
            title_activity(page)
            page.locator("#online").click(force=True)
            pulse(page, 13)
            check(
                page.evaluate(
                    'document.querySelector("#net-code").classList.contains("focused")'
                ),
                "Controller must focus room-code input",
            )
            pulse(page, 0)
            expect(
                page,
                '!document.querySelector("#codeWheel").hidden',
                "Controller Cross must open six-character room editor",
            )
            pulse(page, 13)
            pulse(page, 15)
            pulse(page, 13)
            check(
                page.locator("#net-code").input_value() == "BBAAAA",
                "D-pad must edit room-code letters and positions",
            )
            pulse(page, 1)
            check(
                page.locator("#codeWheel").is_hidden(),
                "Controller Circle must leave room-code editor",
            )
            pulse(page, 0)
            pulse(page, 9)
            check(
                page.evaluate(
                    '__game.screen==="title" && document.querySelector("#codeWheel").hidden'
                ),
                "Options must leave room editing and reset hidden code-input state",
            )
            expect(
                page,
                "__game.game.state.attract && __game.screen===null",
                "Ten idle title seconds must start AI attract play",
                12000,
            )
            before = page.evaluate("__game.game.state.time")
            page.wait_for_timeout(300)
            check(
                page.evaluate("__game.game.state.time") > before,
                "Attract demonstration must run the game simulation",
            )
            page.mouse.move(880, 530)
            expect(
                page,
                '!__game.game.state.attract && __game.screen==="title"',
                "Mouse motion alone must exit attract mode",
            )
            title_activity(page)
            page.locator("#about").click(force=True)
            check(
                "added on import" in page.locator("#creditsContent").inner_text(),
                "In-game credits must include source information and imported usage marker",
            )
            for tab in ("testing", "engine", "prompt"):
                page.locator(f'[data-tab="{tab}"]').click(force=True)
                check(
                    len(page.locator("#creditsContent .feedback-item").all())
                    == {"testing": 4, "engine": 6, "prompt": 4}[tab],
                    f"About must contain every {tab} feedback answer",
                )
            campaign = page.evaluate("""() => {
                const game=__game.game;
                game.start();
                let frames=0;
                for(;frames<54000 && (game.state.mode==='play'||game.state.mode==='intermission');frames++) {
                    game.step(1/30,{0:game.aiInput(game.state.players[0])});
                }
                __game.setScreen(null);
                return {mode:game.state.mode,served:game.state.served,score:game.state.score,frames};
            }""")
            check(
                campaign["mode"] == "victory"
                and campaign["served"] == 12
                and campaign["score"] > 0,
                "Bundled campaign AI must complete all three shifts with twelve served orders",
            )
            expect(
                page,
                '__game.screen==="result" && !document.querySelector("#resultScreen").hidden',
                "Campaign victory must reach the actual result menu",
            )
            check(
                page.locator("#resultServed").inner_text() == "12",
                "Result menu must display all twelve delivered burgers",
            )
            page.locator("#endless").click(force=True)
            check(
                page.evaluate(
                    '__game.game.state.endless && __game.game.state.mode==="play" && __game.game.state.shift===3'
                ),
                "Victory menu must launch playable after-hours mode",
            )
            page.close()
            desktop.close()
            touch = browser.new_context(
                viewport={"width": 960, "height": 540},
                is_mobile=True,
                has_touch=True,
                device_scale_factor=1,
            )
            mobile = touch.new_page()
            mobile.goto(url + "?renderer=webgl", wait_until="domcontentloaded")
            if expect(
                mobile,
                "window.__game?.ready",
                "Touch profile must boot the same bundled game",
                30000,
            ):
                mobile.locator("#play").tap(force=True)
                expect(
                    mobile, "__game.screen===null", "Touch tap must start the same game"
                )
                check(
                    mobile.evaluate(
                        '__game.lastInput==="touch" && document.body.classList.contains("touch")'
                    ),
                    "Touch menu tap must enable touch prompts/layout",
                )
                session = touch.new_cdp_session(mobile)
                start_x = mobile.evaluate("__game.game.state.players[0].x")
                session.send(
                    "Input.dispatchTouchEvent",
                    {
                        "type": "touchStart",
                        "touchPoints": [{"x": 220, "y": 320, "id": 1}],
                    },
                )
                session.send(
                    "Input.dispatchTouchEvent",
                    {
                        "type": "touchMove",
                        "touchPoints": [{"x": 275, "y": 320, "id": 1}],
                    },
                )
                expect(
                    mobile,
                    f"__game.game.state.players[0].x>{start_x + 0.3}",
                    "Real touch drag must move the chef",
                )
                session.send(
                    "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
                )
                check(
                    mobile.evaluate("__game.game.config.assist"),
                    "Touch input must activate catch/serve assistance",
                )
                check(
                    mobile.locator("#prompts").is_hidden(),
                    "Touch controls must hide dense keyboard prompts",
                )
                # Isolate real-time gesture windows from software-GPU frame stalls.
                # Native touch events, RAF, gameplay, physics and HUD continue running.
                mobile.evaluate(
                    "window.__gestureRender=__game.scene.render;__game.scene.render=()=>{}"
                )
                try:
                    rejected_before = mobile.evaluate(
                        "const p=__game.game.state.players[0];p.x=0;p.z=0;p.held='onion';p.carrying=null;__game.game.state.stats.rejected"
                    )
                    session.send(
                        "Input.dispatchTouchEvent",
                        {
                            "type": "touchStart",
                            "touchPoints": [{"x": 830, "y": 320, "id": 2}],
                        },
                    )
                    expect(
                        mobile,
                        f"__game.game.state.players[0].held===null && __game.game.state.stats.rejected>{rejected_before}",
                        "Right-side touch hold must reject a held ingredient",
                    )
                    session.send(
                        "Input.dispatchTouchEvent",
                        {"type": "touchEnd", "touchPoints": []},
                    )
                    mobile.wait_for_timeout(400)
                    dashes_before = mobile.evaluate(
                        "const p=__game.game.state.players[0];p.x=0;p.z=0;p.cooldown=0;__game.game.state.stats.dashes"
                    )
                    left_touch = {"x": 275, "y": 320, "id": 1}
                    right_touch = {"x": 830, "y": 320, "id": 2}
                    session.send(
                        "Input.dispatchTouchEvent",
                        {
                            "type": "touchStart",
                            "touchPoints": [{"x": 220, "y": 320, "id": 1}],
                        },
                    )
                    session.send(
                        "Input.dispatchTouchEvent",
                        {"type": "touchMove", "touchPoints": [left_touch]},
                    )
                    mobile.wait_for_timeout(50)
                    session.send(
                        "Input.dispatchTouchEvent",
                        {
                            "type": "touchStart",
                            "touchPoints": [left_touch, right_touch],
                        },
                    )
                    # CDP touchEnd lists contacts to end, not contacts to retain.
                    session.send(
                        "Input.dispatchTouchEvent",
                        {"type": "touchEnd", "touchPoints": [right_touch]},
                    )
                    mobile.wait_for_timeout(70)
                    session.send(
                        "Input.dispatchTouchEvent",
                        {
                            "type": "touchStart",
                            "touchPoints": [left_touch, right_touch],
                        },
                    )
                    expect(
                        mobile,
                        f"__game.game.state.stats.dashes>{dashes_before}",
                        "Right-side double tap while left stick moves must dash",
                    )
                finally:
                    session.send(
                        "Input.dispatchTouchEvent",
                        {"type": "touchEnd", "touchPoints": []},
                    )
                    mobile.evaluate(
                        "__game.scene.render=window.__gestureRender;delete window.__gestureRender"
                    )
                mobile.evaluate(
                    'const p=__game.game.state.players[0];p.carrying={slot:0,color:"#ed665a",ingredients:[],required:[]};p.z=0'
                )
                mobile.wait_for_timeout(100)
                check(
                    mobile.locator("#touchAction").is_hidden(),
                    "Touch action button must stay hidden away from a wrapper",
                )
                mobile.evaluate(
                    "__game.game.state.players[0].x=-3;__game.game.state.players[0].z=3.7"
                )
                expect(
                    mobile,
                    '!document.querySelector("#touchAction").hidden',
                    "Touch action button must appear near the wrapper",
                )
                mobile.locator("#pauseButton").tap(force=True)
                expect(
                    mobile,
                    '__game.screen==="pause"',
                    "Touch menu button must open pause",
                )
            touch.close()
            gpu = browser.new_context(viewport={"width": 960, "height": 540})
            gpu_page = gpu.new_page()
            gpu_page.goto(url, wait_until="domcontentloaded")
            if expect(
                gpu_page,
                "window.__game?.ready",
                "Default WebGPU boot must complete",
                30000,
            ):
                check(
                    gpu_page.evaluate('__game.scene.stats.backend==="WebGPU"'),
                    "Default renderer must use the requested WebGPU backend",
                )
                check(
                    gpu_page.evaluate("__game.scene.stats.animations>0"),
                    "Scene must contain native Three.js animation clips",
                )
                check(
                    gpu_page.evaluate('__game.game.physics.version==="0.19.3"'),
                    "Game must run Rapier0.19.3 physics",
                )
            gpu.close()
            browser.close()
    except (PlaywrightError, KeyError, ValueError, OSError) as exc:
        failures.append(str(exc))
        try:
            if browser and browser.is_connected():
                browser.close()
        except PlaywrightError:
            # sync_playwright has already stopped and closed its owned processes.
            browser = None
    for failure in failures:
        print("FAIL: " + failure)
    print(f"{count} UI checks, {len(failures)} failures")
    return bool(failures)


if __name__ == "__main__":
    raise SystemExit(main())
