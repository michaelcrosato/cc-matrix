"""One command: npm test. Prints failures and a single aggregate count."""

import asyncio
import json
import os
import re
import subprocess
import sys
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent
os.environ["TMPDIR"] = "."
checks = 0


async def frames(page, n=3):
    start = await page.evaluate("window.__pitfallin.state.frames")
    await page.wait_for_function(
        "(s)=>window.__pitfallin.state.frames>=s[0]+s[1]", arg=[start, n], timeout=30000
    )


failures = []


def check(ok, label, detail=""):
    global checks
    checks += 1
    if not ok:
        failures.append(label + (": " + str(detail) if detail else ""))


def run_node(name):
    global checks
    result = subprocess.run(
        ["node", name], cwd=ROOT, capture_output=True, text=True, check=False
    )
    m = re.search(r"(\d+)(?:/\d+)? .*checks passed(?:, (\d+) failed)?", result.stdout)
    if m:
        checks += int(m.group(1)) + int(m.group(2) or 0)
    if result.returncode:
        failures.append(
            name + ": " + result.stdout.strip() + " " + result.stderr.strip()
        )


async def browser_tests():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-vulkan=swiftshader",
                "--disable-dev-shm-usage",
            ],
        )
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto((ROOT / "index.html").as_uri())
        await page.wait_for_function(
            "window.__gameReady||window.__bootError", timeout=120000
        )
        check(
            await page.title() == "Pitfallin’ — A little danger. A lot of jungle.",
            "Game identity",
        )
        check(
            await page.evaluate("!!window.__gameReady&&!window.__bootError"),
            "Self-contained file boot",
        )
        s = await page.evaluate("window.__pitfallin.state")
        check(s["renderer"] == "WebGPU", "WebGPU backend")
        check(s["audio"]["musicVolume"] == 0.1, "Music default is ten percent")
        check(
            set(s["animations"]) == {"idle", "run", "jump", "climb", "swing"},
            "Native animation clips",
        )
        # Keyboard starts the same menus that the controller uses.
        await page.keyboard.press("Enter")
        await frames(page)
        check(
            await page.evaluate("window.__pitfallin.state.mode") == "playing",
            "Keyboard title selection",
        )
        before = await page.evaluate("window.__pitfallin.state.player.x")
        await page.keyboard.down("d")
        await page.wait_for_function(
            "(x)=>window.__pitfallin.state.player.x>x+1.5", arg=before, timeout=30000
        )
        await page.keyboard.up("d")
        after = await page.evaluate("window.__pitfallin.state.player.x")
        check(after > before + 1, "Native keyboard movement", (before, after))
        await page.keyboard.press("Space")
        await frames(page)
        check(
            await page.evaluate("window.__pitfallin.state.stats.jumps") >= 1,
            "Keyboard jump",
        )
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(100)
        check(
            await page.evaluate("window.__pitfallin.state.panel") == "pause",
            "Pause menu",
        )
        frozen = await page.evaluate("window.__pitfallin.state.remaining")
        await page.wait_for_timeout(180)
        check(
            await page.evaluate("window.__pitfallin.state.remaining") == frozen,
            "Solo pause freezes clock",
        )
        await page.click('[data-action="dev"]')
        await page.locator("#tune-speed").fill("9.5")
        await page.locator("#tune-speed").dispatch_event("input")
        await page.click("#dev-invincible")
        check(
            await page.evaluate(
                "window.__pitfallin.state.tuning.speed===9.5&&window.__pitfallin.state.dev.invincible"
            ),
            "Live developer tuning",
        )
        await page.click('[data-action="dev-reset"]')
        check(
            await page.evaluate(
                "window.__pitfallin.state.tuning.speed===7.2&&!window.__pitfallin.state.dev.invincible"
            ),
            "Developer reset defaults",
        )
        await page.click('[data-action="dev-resume"]')
        await page.keyboard.press("m")
        await page.wait_for_timeout(100)
        check(
            await page.evaluate("window.__pitfallin.state.panel") == "map",
            "Field map keyboard shortcut",
        )
        check(
            await page.locator(".relic-row").count() == 6,
            "Map lists six meaningful relics",
        )
        await page.keyboard.press("Escape")
        # Controller shim, standard mapping; Options+Create must be ignored.
        await page.evaluate(
            """() => { window.testPad={id:'DualSense test',connected:true,index:0,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[window.testPad];}"""
        )

        async def pad(i):
            await page.evaluate("(i)=>{testPad.buttons[i]={pressed:true,value:1};}", i)
            await frames(page, 2)
            await page.evaluate("(i)=>{testPad.buttons[i]={pressed:false,value:0};}", i)
            await frames(page, 2)

        await pad(9)
        check(
            await page.evaluate("window.__pitfallin.state.panel") == "pause",
            "Controller Options pauses",
        )
        await pad(0)
        check(
            await page.evaluate("window.__pitfallin.state.mode") == "playing",
            "Controller Cross selects Resume",
        )
        await page.evaluate("testPad.buttons[8]={pressed:true,value:1}")
        await pad(9)
        check(
            await page.evaluate("!window.__pitfallin.state.panel"),
            "Create + Options belongs to hub",
        )
        await page.evaluate("testPad.buttons[8]={pressed:false,value:0}")
        await pad(0)
        check(
            await page.evaluate("window.__pitfallin.state.inputMethod") == "gamepad",
            "Prompts follow controller",
        )
        check(
            "glyph" in await page.locator("#controls").inner_html(),
            "PlayStation glyph prompts",
        )
        await page.evaluate('window.__pitfallin.action("settings")')
        await page.locator("#glyphs").select_option("xbox")
        check(
            ">A<" in await page.locator("#controls").inner_html(), "Xbox glyph option"
        )
        await page.evaluate(
            "navigator.getGamepads=()=>[];window.__pitfallin.closePanel()"
        )
        # Offline signal provides measurable sound verification without a listener.
        signal = await page.evaluate("window.__pitfallin.offlineAudio()")
        check(
            signal["finite"] and signal["rms"] > 0.001 and signal["peak"] < 1,
            "Synthesized sound finite, audible and unclipped",
            signal,
        )
        await page.evaluate("window.__pitfallin.loseDevice()")
        await page.wait_for_function(
            "window.__pitfallin.state.renderer === 'WebGL2'", timeout=30000
        )
        await frames(page, 3)
        check(
            await page.evaluate("window.__pitfallin.state.renderer") == "WebGL2",
            "GPU loss recovers on compatibility renderer",
        )
        # Lifecycle and real ten-second attract trigger; all input exits replay.
        await page.evaluate('window.__pitfallin.action("title")')
        await page.wait_for_function(
            'window.__pitfallin.state.mode==="attract"', timeout=20000
        )
        check(
            await page.evaluate("window.__pitfallin.state.mode") == "attract",
            "Ten-second attract trigger",
        )
        await page.keyboard.press("x")
        await page.wait_for_timeout(100)
        check(
            await page.evaluate("window.__pitfallin.state.mode") == "title",
            "Input exits attract without starting",
        )
        await page.click('[data-action="about"]')
        for tab, count in [
            ("sourceInformation", 15),
            ("testingFeedback", 4),
            ("engineFeedback", 6),
            ("promptFeedback", 4),
        ]:
            await page.click('[data-credit="' + tab + '"]')
            n = await page.locator(
                ".credit-line" if tab == "sourceInformation" else ".feedback-item"
            ).count()
            check(n == count, "About / " + tab, n)
        await page.click('[data-credit="sourceInformation"]')
        await page.evaluate("navigator.getGamepads=()=>[testPad];testPad.axes[3]=1")
        await page.wait_for_function(
            "document.querySelector('#panel-container .scroll').scrollTop>100",
            timeout=30000,
        )
        await page.evaluate("testPad.axes[3]=0;navigator.getGamepads=()=>[]")
        check(
            await page.evaluate(
                "document.querySelector('#panel-container .scroll').scrollTop>100"
            ),
            "Controller right stick scrolls credits",
        )
        check(not errors, "No browser JavaScript errors", errors)
        await page.evaluate(
            "() => {const g=window.__pitfallin.getGame();g.start();g.complete(false,'A results navigation check.');window.__pitfallin.step(0);}"
        )
        await page.keyboard.press("Escape")
        check(
            await page.evaluate("window.__pitfallin.state.mode === 'title'"),
            "Results Back returns to a usable title",
        )
        await page.evaluate(
            "window.__pitfallin.getNetwork().callbacks.onEnd({reason:'finished'})"
        )
        await page.keyboard.press("Enter")
        check(
            await page.evaluate(
                "window.__pitfallin.state.audio.stopped && window.__pitfallin.state.mode === 'ended'"
            ),
            "Hub end ignores input and keeps audio stopped",
        )
        await page.close()
        # Touch only page: same title/UI; invisible stick and context action.
        context = await browser.new_context(
            viewport={"width": 844, "height": 390},
            is_mobile=True,
            has_touch=True,
            device_scale_factor=1,
        )
        mobile = await context.new_page()
        await mobile.goto((ROOT / "index.html").as_uri())
        await mobile.wait_for_function(
            "window.__gameReady||window.__bootError", timeout=120000
        )
        await mobile.tap('[data-action="start"]')
        await frames(mobile)
        check(
            await mobile.evaluate("window.__pitfallin.state.inputMethod") == "touch",
            "Touch input identity",
        )
        check(
            await mobile.locator("#controls").is_hidden(),
            "Touch minimizes persistent UI",
        )
        await mobile.touchscreen.tap(700, 230)
        await frames(mobile)
        check(
            await mobile.evaluate("window.__pitfallin.state.stats.jumps") >= 1,
            "Touch right tap jumps",
        )
        await mobile.wait_for_function(
            "window.__pitfallin.state.player.grounded", timeout=30000
        )
        touch_start = await mobile.evaluate(
            "({x:window.__pitfallin.state.player.x,jumps:window.__pitfallin.state.stats.jumps})"
        )
        cdp = await context.new_cdp_session(mobile)
        await cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchStart", "touchPoints": [{"id": 1, "x": 100, "y": 280}]},
        )
        await cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchMove", "touchPoints": [{"id": 1, "x": 160, "y": 280}]},
        )
        await cdp.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchStart",
                "touchPoints": [
                    {"id": 1, "x": 160, "y": 280},
                    {"id": 2, "x": 700, "y": 230},
                ],
            },
        )
        await mobile.wait_for_function(
            "(x)=>window.__pitfallin.state.player.x > x+1",
            arg=touch_start["x"],
            timeout=30000,
        )
        await cdp.send(
            "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
        )
        check(
            await mobile.evaluate("window.__pitfallin.state.player.x")
            > touch_start["x"] + 1,
            "Invisible touch stick moves explorer",
        )
        check(
            await mobile.evaluate("window.__pitfallin.state.stats.jumps")
            > touch_start["jumps"],
            "Simultaneous second touch jumps",
        )
        await cdp.detach()
        await mobile.evaluate("window.__pitfallin.teleport(84,.03)")
        await frames(mobile)
        check(
            await mobile.locator("#touch-action").is_visible(),
            "Context-sensitive touch action",
        )
        await mobile.tap("#touch-action")
        await mobile.wait_for_function(
            "window.__pitfallin.state.player.y < -1", timeout=30000
        )
        check(
            await mobile.evaluate("window.__pitfallin.state.player.y") < -1,
            "Touch action begins ladder descent",
        )
        await mobile.wait_for_function(
            "window.__pitfallin.state.player.y < -5.6 && !window.__pitfallin.state.player.climbing",
            timeout=30000,
        )
        check(
            await mobile.evaluate("window.__pitfallin.state.player.y < -5.6"),
            "Touch ladder assist completes descent",
        )
        await mobile.set_viewport_size({"width": 390, "height": 844})
        await mobile.evaluate("window.__pitfallin.action('title')")
        await frames(mobile, 2)
        check(
            await mobile.evaluate(
                "document.documentElement.scrollWidth === innerWidth"
            ),
            "Portrait phone layout fits viewport",
        )
        await mobile.tap('[data-action="start"]')
        await frames(mobile, 2)
        check(
            await mobile.evaluate(
                "document.querySelector('[data-action=pause]').getBoundingClientRect().right <= innerWidth"
            ),
            "Portrait touch HUD stays inside viewport",
        )
        await mobile.tap('[data-action="pause"]')
        await mobile.tap('#panel-container [data-action="guide"]')
        check(
            "Tap right"
            in await mobile.locator(
                '.guide-grid [data-prompt="jump"]'
            ).first.inner_text(),
            "Field guide uses native touch prompts",
        )
        await mobile.keyboard.press("ArrowDown")
        check(
            "Space"
            in await mobile.locator(
                '.guide-grid [data-prompt="jump"]'
            ).first.inner_text(),
            "Open guide prompts follow input changes",
        )
        await context.close()
        await browser.close()


async def main():
    node_suites = (
        []
        if "--browser-only" in sys.argv
        else ["simulation-tests.mjs", "network-tests.mjs", "playthrough-test.mjs"]
    )
    for file in node_suites:
        if (ROOT / file).exists():
            run_node(file)
    try:
        await browser_tests()
    except Exception as e:  # noqa: BLE001 - aggregate unexpected failures
        failures.append("Browser suite exception: " + str(e))
    network_suites = (
        [] if "--browser-only" in sys.argv else ["hub-tests.py", "rtc-tests.py"]
    )
    for script in network_suites:
        if not (ROOT / script).exists():
            continue
        r = await asyncio.to_thread(
            subprocess.run,
            [sys.executable, script],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        m = re.search(r"(\d+)(?:/\d+)? .*checks passed(?:, (\d+) failed)?", r.stdout)
        if m:
            global checks
            checks += int(m.group(1)) + int(m.group(2) or 0)
        if r.returncode:
            failures.append(script + ": " + r.stdout.strip() + " " + r.stderr.strip())
    try:
        json.loads((ROOT.parent / "exit-interview.json").read_text())
        check(True, "Exit interview parses")
    except FileNotFoundError:
        pass
    except Exception as e:  # noqa: BLE001 - aggregate unexpected failures
        check(False, "Exit interview parses", e)
    for failure in failures:
        print("FAIL:", failure)
    print(f"{checks - len(failures)} checks passed, {len(failures)} failed")
    return 1 if failures else 0


sys.exit(asyncio.run(main()))
