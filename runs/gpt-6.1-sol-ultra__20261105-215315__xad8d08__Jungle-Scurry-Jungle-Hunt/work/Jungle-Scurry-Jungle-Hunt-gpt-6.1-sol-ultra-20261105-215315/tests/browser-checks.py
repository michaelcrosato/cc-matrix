"""Browser input, screen-flow, synthesis, touch, and live co-op checks.

Imported by the aggregate runner. Standalone accepts BASE_URL and GAME_FILENAME.
Only failures and the final check count are printed.
"""

import sys
import time
from pathlib import Path
from urllib.parse import quote

PAD_INIT = """(() => {
 window.__padEnabled=false;
 window.__testPad={id:'DualSense test controller',index:0,mapping:'standard',connected:true,timestamp:0,
  axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
 Object.defineProperty(navigator,'getGamepads',{value:()=>window.__padEnabled?[window.__testPad]:[]});
})();"""


def run_browser_checks(browser, base_url, game_filename):
    failures = []
    count = 0
    contexts = []
    errors = []
    root = Path(__file__).resolve().parents[2]
    local_game = root / game_filename
    http_url = base_url.rstrip("/") + "/" + quote(game_filename)
    primary_url = local_game.as_uri() if local_game.exists() else http_url

    def check(name, callback):
        nonlocal count
        count += 1
        try:
            callback()
        except Exception as error:  # noqa: BLE001 - record each independent test failure
            failures.append(f"Browser {name}: {str(error)[:600]}")

    def ensure(condition, message):
        if not condition:
            raise AssertionError(message)

    def boot(page, url):
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_function(
            "window.__JUNGLE?.ready || window.__JUNGLE?.error", timeout=120000
        )
        ensure(
            page.evaluate("!!window.__JUNGLE?.ready"),
            page.evaluate(
                'window.__JUNGLE?.error || document.querySelector("#load-text")?.textContent'
            ),
        )
        ensure("Jungle Scurry" in page.title(), "wrong page served")

    def state(page):
        return page.evaluate("__JUNGLE.state()")

    # Use a simple expression wrapper because Playwright passes arg as one value.
    def wait_mode(page, expected):
        page.wait_for_function(
            "expected => __JUNGLE.state().mode === expected",
            arg=expected,
            timeout=10000,
        )

    def pad_button(page, index, pressed):
        before_frame = state(page)["frameCount"]
        page.evaluate(
            "([index,pressed])=>{const p=__testPad.buttons[index];p.pressed=pressed;p.touched=pressed;p.value=pressed?1:0;__testPad.timestamp++;}",
            [index, pressed],
        )
        page.wait_for_function(
            "frame=>__JUNGLE.state().frameCount>frame",
            arg=before_frame,
            timeout=10000,
        )

    try:
        desktop = browser.new_context(viewport={"width": 1280, "height": 720})
        contexts.append(desktop)
        desktop.add_init_script(PAD_INIT)
        page = desktop.new_page()
        check("single-file boot", lambda: boot(page, primary_url))
        if not page.evaluate("!!window.__JUNGLE?.ready"):
            return failures, count

        def webgpu():
            first = state(page)["frameCount"]
            page.wait_for_function(
                "n=>__JUNGLE.state().frameCount>n+2", arg=first, timeout=12000
            )
            current = state(page)
            ensure(
                current["backend"] == "WebGPU",
                f"requested WebGPU, got {current['backend']}",
            )
            ensure(current["mode"] == "title", "did not boot to title")
            ensure(current["music"] == 0.1, "music does not default to 10%")
            ensure(page.locator("#loading").is_hidden(), "loading screen remained")

        check("WebGPU frames and defaults", webgpu)

        def keyboard_menu():
            page.keyboard.press("ArrowDown")
            page.keyboard.press("ArrowDown")
            page.keyboard.press("Enter")
            wait_mode(page, "guide")
            ensure(page.locator(".guide-card").count() == 4, "guide omits a chapter")
            page.keyboard.press("Escape")
            wait_mode(page, "title")
            page.keyboard.press("Enter")
            wait_mode(page, "playing")
            page.keyboard.press("Escape")
            wait_mode(page, "pause")

        check("keyboard menu navigation and start", keyboard_menu)

        def freeze():
            before = state(page)["elapsed"]
            page.wait_for_timeout(300)
            ensure(state(page)["elapsed"] == before, "pause advanced simulation")

        check("pause freezes physics", freeze)

        def dev_tools():
            for _ in range(3):
                page.keyboard.press("ArrowDown")
            page.keyboard.press("Enter")
            wait_mode(page, "dev")
            ensure(
                page.locator("[data-tuning]").count() == 9,
                "missing live balance sliders",
            )
            page.keyboard.press("ArrowRight")
            ensure(
                page.evaluate("__JUNGLE.game.tuning.moveSpeed") > 7.2,
                "controller-style slider adjustment failed",
            )
            page.locator("#tune-oxygen").evaluate(
                '(el)=>{el.value="24";el.dispatchEvent(new Event("input",{bubbles:true}));}'
            )
            ensure(
                page.evaluate("__JUNGLE.game.tuning.oxygen") == 24,
                "live oxygen tuning failed",
            )
            page.locator("[data-action=god]").click()
            ensure(page.evaluate("__JUNGLE.game.god"), "invulnerability toggle failed")
            page.locator("[data-action=reset-tuning]").click()
            ensure(
                page.evaluate(
                    "__JUNGLE.game.tuning.moveSpeed===7.2 && __JUNGLE.game.tuning.oxygen===15 && !__JUNGLE.game.god"
                ),
                "reset did not restore defaults",
            )
            old = state(page)["stage"]
            page.locator("[data-action=next-stage]").click()
            ensure(state(page)["stage"] == (old + 1) % 4, "chapter jump failed")
            page.locator("[data-action=resume]").click()
            wait_mode(page, "playing")

        check("pause-accessible live dev tools", dev_tools)

        def keyboard_play():
            page.evaluate(
                '()=>{__JUNGLE.game.setup(3);__JUNGLE.game.enemies=[];__JUNGLE.setMode("playing");}'
            )
            page.wait_for_function("__JUNGLE.game.players[0].onGround", timeout=8000)
            before = state(page)["players"][0]["x"]
            page.keyboard.down("KeyD")
            page.wait_for_function(
                "x=>__JUNGLE.game.players[0].x>x+.4", arg=before, timeout=8000
            )
            page.keyboard.up("KeyD")
            jumps = state(page)["statistics"]["jumps"]
            page.keyboard.press("Space")
            page.wait_for_function(
                "n=>__JUNGLE.game.statistics.jumps>n", arg=jumps, timeout=8000
            )
            ensure(
                state(page)["lastInput"] == "keyboard",
                "keyboard prompt tracking failed",
            )

        check("actual keyboard movement and jumping", keyboard_play)

        def mouse_tool():
            page.evaluate(
                '()=>{__JUNGLE.game.setup(1);__JUNGLE.game.enemies=[];__JUNGLE.setMode("playing");}'
            )
            page.mouse.click(930, 450)
            page.wait_for_function("__JUNGLE.game.players[0].attack>0", timeout=5000)
            ensure(
                "Knife" in page.locator("#hint").inner_text(),
                "river tool prompt missing",
            )

        check("mouse world click activates knife", mouse_tool)

        def settings():
            page.evaluate('__JUNGLE.goTitle();__JUNGLE.action("settings")')
            wait_mode(page, "settings")
            page.locator("#music").evaluate(
                '(el)=>{el.value=".23";el.dispatchEvent(new Event("input",{bubbles:true}));}'
            )
            ensure(
                abs(page.evaluate("__JUNGLE.audio.musicVolume") - 0.23) < 0.0001,
                "music slider did not change audio",
            )
            ensure(
                page.evaluate(
                    'JSON.parse(localStorage.getItem("jungle-scurry-settings")).music'
                )
                == 0.23,
                "settings were not saved",
            )
            page.locator("#music").evaluate(
                '(el)=>{el.value=".1";el.dispatchEvent(new Event("input",{bubbles:true}));}'
            )
            page.locator("[data-action=glyphs]").click()
            ensure(
                page.evaluate("__JUNGLE.settings.glyphs") == "Xbox",
                "Xbox glyph setting failed",
            )
            page.locator("[data-action=back].primary").click()
            wait_mode(page, "title")

        check("settings update sound and saved glyph preference", settings)

        def gamepad():
            page.evaluate("window.__padEnabled=true")
            pad_button(page, 13, True)
            page.wait_for_function(
                'document.querySelector("[data-action=coop]")?.classList.contains("focused")',
                timeout=8000,
            )
            pad_button(page, 13, False)
            pad_button(page, 0, True)
            wait_mode(page, "coop")
            pad_button(page, 0, False)
            pad_button(page, 1, True)
            wait_mode(page, "title")
            pad_button(page, 1, False)
            pad_button(page, 0, True)
            wait_mode(page, "playing")
            pad_button(page, 0, False)
            page.wait_for_function(
                '__JUNGLE.state().lastInput==="pad" && document.querySelector("#hint")?.textContent.includes("A")',
                timeout=8000,
            )
            pad_button(page, 9, True)
            wait_mode(page, "pause")
            pad_button(page, 9, False)
            pad_button(page, 9, True)
            wait_mode(page, "playing")
            pad_button(page, 9, False)
            page.evaluate(
                '__JUNGLE.settings.glyphs="PlayStation";__JUNGLE.setMode("playing")'
            )
            page.wait_for_function(
                'document.querySelector("#hint")?.textContent.includes("×")',
                timeout=8000,
            )
            page.evaluate("window.__padEnabled=false")

        check("standard gamepad menus, pause, PS and Xbox prompts", gamepad)

        def audio():
            offline = page.evaluate("async()=>await __JUNGLE.offlineAudio()")
            ensure(
                offline["supported"] and offline["finite"], "offline synthesis failed"
            )
            ensure(
                0.001 < offline["rms"] < 0.5 and offline["peak"] < 1,
                f"invalid generated levels: {offline}",
            )
            ensure(
                offline["effects"] == 13
                and offline["voices"] == 1
                and offline["stages"] == 4,
                "offline test did not cover all synthesis families",
            )
            page.evaluate(
                'async()=>{await __JUNGLE.audio.unlock();__JUNGLE.audio.sfx("checkpoint");__JUNGLE.audio.voice("hello");}'
            )
            page.wait_for_function("__JUNGLE.audio.diagnostics().rms>0", timeout=5000)
            ensure(
                page.evaluate("__JUNGLE.audio.diagnostics().musicVolume") == 0.1,
                "default volume was not restored",
            )

        check("all synthesized music, SFX, voice and real-time levels", audio)

        def credits():
            page.evaluate('__JUNGLE.goTitle();__JUNGLE.action("about")')
            wait_mode(page, "about")
            source = page.locator(".scroll").inner_text()
            for text in ["Jungle Hunt", "added on import", "gpt-6.1-sol", "2026-11-05"]:
                ensure(text in source, f"source credits omit {text}")
            for tab, number in [(1, 4), (2, 6), (3, 4)]:
                page.locator(f'[data-action=about-tab][data-tab="{tab}"]').click()
                ensure(
                    page.locator(".feedback-a").count() == number,
                    f"feedback tab {tab} omitted answers",
                )
                ensure(
                    all(
                        text.strip()
                        for text in page.locator(".feedback-a").all_inner_texts()
                    ),
                    "empty feedback answer",
                )
            page.locator("[data-action=back].primary").click()

        check("source information and all feedback tabs", credits)

        def full_route():
            page.evaluate(
                "__JUNGLE.start();__JUNGLE.game.auto=true;__JUNGLE.game.god=true;__JUNGLE.step(9000)"
            )
            current = state(page)
            ensure(
                current["won"] and current["mode"] == "victory",
                f"full route did not win: {current}",
            )
            ensure(
                current["statistics"]["stages"] == 4 and current["bells"] == 3,
                "full route skipped chapters or bells",
            )
            for key in ["jumps", "grabs", "stuns", "ducks"]:
                ensure(current["statistics"][key] > 0, f"full route never used {key}")
            page.locator("[data-action=replay]").click()
            wait_mode(page, "playing")
            ensure(
                state(page)["stage"] == 0 and state(page)["score"] == 0,
                "replay did not reset",
            )

        check("complete four-chapter route, rescue result and replay", full_route)

        def attract():
            page.evaluate("__JUNGLE.goTitle()")
            page.wait_for_function('__JUNGLE.state().mode==="attract"', timeout=15000)
            ensure(
                page.evaluate("__JUNGLE.game.auto && __JUNGLE.game.god"),
                "attract was not AI driven",
            )
            page.keyboard.press("ShiftLeft")
            wait_mode(page, "title")
            ensure(
                not page.evaluate("__JUNGLE.game.auto"),
                "attract exit did not restore menu state",
            )

        check("ten-second attract timer and any-key exit", attract)

        def graphics_recovery():
            page.evaluate(
                "()=>{__JUNGLE.start();__JUNGLE.game.setup(1);__JUNGLE.game.score=31415;__JUNGLE.pause();window.__originalGame=__JUNGLE.game;}"
            )
            original = state(page)
            ensure(original["backend"] == "WebGPU", "device-loss test requires WebGPU")
            page.evaluate("__JUNGLE.renderer.backend.device.destroy()")
            page.wait_for_function(
                'n=>__JUNGLE.state().backend==="WebGL2" && __JUNGLE.state().frameCount>n+2',
                arg=original["frameCount"],
                timeout=30000,
            )
            current = state(page)
            ensure(
                page.evaluate("__JUNGLE.game===window.__originalGame"),
                "graphics recovery replaced the simulation",
            )
            ensure(
                current["score"] == 31415
                and current["stage"] == 1
                and current["mode"] == "pause"
                and current["elapsed"] == original["elapsed"],
                f"device loss changed paused game state: {current}",
            )
            ensure(
                not page.evaluate("__JUNGLE.lastError"),
                "device recovery left a runtime error",
            )

        check(
            "WebGPU device-loss recovery preserves game and resumes frames",
            graphics_recovery,
        )
        check(
            "desktop has no runtime errors",
            lambda: ensure(
                not errors and not page.evaluate("__JUNGLE.lastError"),
                f"page errors: {errors}; loop: {page.evaluate('__JUNGLE.lastError')}",
            ),
        )
        desktop.close()
        contexts.remove(desktop)

        touch_context = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=1,
            is_mobile=True,
            has_touch=True,
        )
        contexts.append(touch_context)
        touch = touch_context.new_page()
        check("touch-only single-file boot", lambda: boot(touch, primary_url))
        if touch.evaluate("!!window.__JUNGLE?.ready"):

            def touch_hud():
                touch.locator("[data-action=start]").tap()
                wait_mode(touch, "playing")
                ensure(
                    touch.locator("body").evaluate(
                        '(el)=>el.classList.contains("body-touch")'
                    ),
                    "touch profile was not detected",
                )
                ensure(
                    touch.locator(".chapter-box").is_hidden()
                    and touch.locator("#hint").is_hidden(),
                    "touch HUD is not minimal",
                )
                ensure(
                    touch.locator(".pause-button").is_visible()
                    and touch.locator("#touch-action").is_visible(),
                    "touch menu/action controls missing",
                )

            check("minimal touch HUD and contextual action control", touch_hud)

            def touch_move():
                touch.evaluate(
                    '()=>{__JUNGLE.game.setup(1);__JUNGLE.game.enemies=[];__JUNGLE.setMode("playing");}'
                )
                before = state(touch)["players"][0]["x"]
                cdp = touch_context.new_cdp_session(touch)
                cdp.send(
                    "Input.dispatchTouchEvent",
                    {
                        "type": "touchStart",
                        "touchPoints": [{"x": 100, "y": 600, "id": 1}],
                    },
                )
                cdp.send(
                    "Input.dispatchTouchEvent",
                    {
                        "type": "touchMove",
                        "touchPoints": [{"x": 190, "y": 600, "id": 1}],
                    },
                )
                touch.wait_for_function(
                    "x=>__JUNGLE.game.players[0].x>x+.3", arg=before, timeout=8000
                )
                cdp.send(
                    "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
                )
                cdp.detach()
                ensure(
                    state(touch)["lastInput"] == "touch",
                    "touch prompts did not follow input",
                )
                touch.wait_for_function(
                    'document.querySelector("#touch-action")?.textContent==="KNIFE"',
                    timeout=5000,
                )
                touch.locator("#touch-action").tap()
                touch.wait_for_function(
                    "__JUNGLE.game.players[0].attack>0", timeout=5000
                )

            check("invisible touch stick and contextual knife", touch_move)

            def touch_ring():
                touch.evaluate(
                    '()=>{__JUNGLE.game.setup(3);__JUNGLE.game.enemies=[];__JUNGLE.game.teleport(__JUNGLE.game.players[0],15,1);__JUNGLE.setMode("playing");}'
                )
                touch.wait_for_function(
                    'document.querySelector("#touch-action")?.textContent==="RING"',
                    timeout=5000,
                )
                touch.locator("#touch-action").tap()
                touch.wait_for_function("__JUNGLE.game.bells===1", timeout=5000)

            check("touch Sunbell action", touch_ring)
        touch_context.close()
        contexts.remove(touch_context)

        # Real input travels through BroadcastChannel, host simulation and snapshots.
        online = browser.new_context(viewport={"width": 960, "height": 540})
        contexts.append(online)
        host, guest = online.new_page(), online.new_page()
        check("standalone co-op host boot", lambda: boot(host, http_url))
        check("standalone co-op guest boot", lambda: boot(guest, http_url))
        if host.evaluate("!!window.__JUNGLE?.ready") and guest.evaluate(
            "!!window.__JUNGLE?.ready"
        ):

            def connect():
                room = "TEST-" + str(time.time_ns())[-10:]
                host.evaluate("room=>__JUNGLE.net.hostRoom(room)", room)
                guest.evaluate("room=>__JUNGLE.net.joinRoom(room)", room)
                host.wait_for_function("__JUNGLE.net.connected", timeout=10000)
                guest.wait_for_function("__JUNGLE.net.connected", timeout=10000)
                host.evaluate("__JUNGLE.net.begin()")
                wait_mode(host, "playing")
                wait_mode(guest, "playing")
                guest.wait_for_function(
                    "__JUNGLE.game.players.length===2", timeout=10000
                )
                ensure(
                    host.evaluate("__JUNGLE.game.players.length") == 2,
                    "host omitted second scout",
                )

            check("standalone live camp pairing and synchronized start", connect)

            def remote_input():
                host.evaluate(
                    '()=>{__JUNGLE.game.setup(1);__JUNGLE.game.enemies=[];__JUNGLE.setMode("playing");}'
                )
                guest.wait_for_function("__JUNGLE.game.stage===1", timeout=10000)
                before = host.evaluate("__JUNGLE.game.players[1].x")
                guest.keyboard.down("KeyD")
                host.wait_for_function(
                    "x=>__JUNGLE.game.players[1].x>x+.5", arg=before, timeout=10000
                )
                guest.keyboard.up("KeyD")
                guest.wait_for_function(
                    "x=>__JUNGLE.game.players[1].x>x+.4", arg=before, timeout=10000
                )
                ensure(
                    host.evaluate("__JUNGLE.net.stats.inputs") > 0
                    and guest.evaluate("__JUNGLE.net.stats.states") > 0,
                    "co-op transport counters did not advance",
                )

            check(
                "remote keyboard steers Scout Two through host authority", remote_input
            )

            def guest_hud():
                host.evaluate(
                    "()=>{const g=__JUNGLE.game;g.players[0].health=3;g.players[0].oxygen=15;g.players[1].health=1;g.players[1].oxygen=5;g.teleport(g.players[1],g.players[1].x,2);}"
                )
                try:
                    guest.wait_for_function(
                        "__JUNGLE.game.players[1].health===1 && __JUNGLE.game.players[1].oxygen<6",
                        timeout=8000,
                    )
                    guest.wait_for_function(
                        'parseFloat(document.querySelector("#oxygen")?.style.width)<50 && document.querySelectorAll(".life.empty").length===2',
                        timeout=8000,
                    )
                    ensure(
                        host.locator(".life.empty").count() == 0,
                        "host HUD displayed the guest's missing hearts",
                    )
                    ensure(
                        host.locator("#oxygen").evaluate(
                            "el=>parseFloat(el.style.width)"
                        )
                        > 80,
                        "host HUD displayed the guest's low oxygen",
                    )
                finally:
                    host.evaluate(
                        "()=>{const g=__JUNGLE.game;g.players[1].health=3;g.players[1].oxygen=15;g.teleport(g.players[1],g.players[1].x,6);}"
                    )

            check("guest HUD follows Scout Two health and oxygen", guest_hud)

            def online_pause():
                host.evaluate("__JUNGLE.pause()")
                wait_mode(host, "pause")
                frozen = state(host)["elapsed"]
                guest.wait_for_function(
                    "t=>Math.abs(__JUNGLE.game.elapsed-t)<.05", arg=frozen, timeout=8000
                )
                guest.wait_for_timeout(350)
                ensure(state(host)["elapsed"] == frozen, "paused host kept simulating")
                ensure(
                    abs(state(guest)["elapsed"] - frozen) < 0.05,
                    "guest advanced past paused host",
                )
                host.evaluate("__JUNGLE.pause()")
                host.wait_for_function(
                    "t=>__JUNGLE.game.elapsed>t+.1", arg=frozen, timeout=8000
                )

            check("host pause freezes both peers and resumes", online_pause)

            def guest_pause():
                wait_mode(guest, "playing")
                guest.keyboard.press("Escape")
                wait_mode(host, "pause")
                wait_mode(guest, "pause")
                frozen = state(host)["elapsed"]
                guest.wait_for_function(
                    "t=>Math.abs(__JUNGLE.game.elapsed-t)<.05", arg=frozen, timeout=8000
                )
                guest.wait_for_timeout(350)
                ensure(
                    state(host)["elapsed"] == frozen, "guest pause did not freeze host"
                )
                ensure(
                    abs(state(guest)["elapsed"] - frozen) < 0.05,
                    "guest pause did not preserve the guest snapshot",
                )
                guest.locator("[data-action=resume]").click()
                wait_mode(host, "playing")
                wait_mode(guest, "playing")
                host.wait_for_function(
                    "t=>__JUNGLE.game.elapsed>t+.1", arg=frozen, timeout=8000
                )

            check(
                "guest keyboard pause and menu resume synchronize both peers",
                guest_pause,
            )

            def online_finish():
                host.evaluate(
                    "__JUNGLE.game.auto=true;__JUNGLE.game.god=true;__JUNGLE.step(9000)"
                )
                wait_mode(host, "victory")
                wait_mode(guest, "victory")
                ensure(
                    host.evaluate("__JUNGLE.game.won"),
                    "co-op expedition did not finish",
                )
                ensure(
                    guest.locator(".rank").count() == 1, "guest result screen missing"
                )

            check("standalone co-op synchronized expedition finish", online_finish)
        check(
            "all browser pages have no JavaScript errors",
            lambda: ensure(not errors, "; ".join(errors)),
        )
        online.close()
        contexts.remove(online)
    finally:
        for context in contexts:
            context.close()
    return failures, count


if __name__ == "__main__":
    from playwright.sync_api import sync_playwright

    base = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:45949/"
    filename = (
        sys.argv[2]
        if len(sys.argv) > 2
        else "Jungle-Scurry-Jungle-Hunt-gpt-6.1-sol-ultra-20261105-215315.html"
    )
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--enable-unsafe-swiftshader",
                "--use-gl=angle",
                "--use-angle=swiftshader",
                "--no-sandbox",
                "--autoplay-policy=no-user-gesture-required",
            ],
        )
        try:
            failures, count = run_browser_checks(browser, base, filename)
        finally:
            browser.close()
    for failure in failures:
        print("FAIL " + failure)
    print(f"Browser: {count} checks, {len(failures)} failures.")
    sys.exit(bool(failures))
