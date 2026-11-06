import asyncio
import functools
import http.server
import json
import os
import threading
import traceback
import urllib.parse
from pathlib import Path

from playwright.async_api import async_playwright

DEV = Path(__file__).resolve().parent.parent
ROOT = DEV.parent
GAME = "Drainio-Bros-Mario-Bros-1983-gpt-6.1-sol-max-20261105-200707.html"
results = []
ONLY = os.getenv("DRAINIO_TEST_FILTER", "")
CURRENT_PAGE = None


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = http.server.ThreadingHTTPServer(
    ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT))
)
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{server.server_port}"
PAD_SCRIPT = """window.__pads=[];window.__padPulse=false;navigator.getGamepads=()=>{const result=window.__pads;if(window.__padPulse){window.__pads=result.map(p=>p?{...p,axes:[0,0,0,0],buttons:p.buttons.map(()=>({pressed:false,touched:false,value:0}))}:null);window.__padPulse=false;}return result;};window.setTestPad=(index,buttons={},axes=[0,0,0,0])=>{window.__pads[index]={index,connected:true,mapping:'standard',id:'Virtual DualSense',axes,buttons:Array.from({length:18},(_,i)=>({pressed:!!buttons[i],touched:!!buttons[i],value:buttons[i]?1:0}))};};"""


async def check(name, task):
    if ONLY and ONLY.lower() not in name.lower():
        return
    try:
        await task()
        results.append({"name": name, "pass": True})
    except Exception:  # noqa: BLE001 - collect all test failures
        debug = {}
        try:
            debug = (
                await CURRENT_PAGE.evaluate("window.__drainio?.inspect()")
                if CURRENT_PAGE
                else {}
            )
        except Exception:  # noqa: BLE001 - collect all test failures
            debug = {"inspection": "unavailable"}
        tb = traceback.format_exc()
        results.append(
            {
                "name": name,
                "pass": False,
                "error": tb[:700]
                + " ... "
                + tb[-300:]
                + " STATE "
                + json.dumps(debug)[:4000],
            }
        )
    (DEV / f"tests/latest-browser-results{'-' + ONLY if ONLY else ''}.json").write_text(
        json.dumps(results, indent=2)
    )


async def ready(page, url=None):
    global CURRENT_PAGE
    CURRENT_PAGE = page
    await page.goto(url or f"{BASE}/{GAME}?test=1&renderer=webgl")
    await page.wait_for_function("window.__drainio?.ready === true", timeout=90000)
    assert await page.title() == "Drainio Bros. — The night shift"


async def state(page):
    return await page.evaluate("window.__drainio.inspect()")


async def wait(page, expr, timeout=12000):
    await page.wait_for_function(expr, timeout=timeout)


async def presspad(page, buttons, axes=(0, 0, 0, 0)):
    before = (await state(page))["inputFrame"]
    await page.evaluate(
        "([b,a])=>{setTestPad(0,b,a);window.__padPulse=true;}",
        [{str(k): v for k, v in buttons.items()}, list(axes)],
    )
    await wait(page, f"window.__drainio.inspect().inputFrame>{before + 1}")


async def main():
    async with async_playwright() as p:
        gpu = await p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--disable-dev-shm-usage",
            ],
        )
        gp = await gpu.new_page(
            viewport={"width": 1280, "height": 720}, ignore_https_errors=True
        )

        async def gpu_test():
            await ready(gp, f"{BASE}/{GAME}?test=1")
            assert (await state(gp))["initialBackend"] == "WebGPU", str(await state(gp))
            await gp.locator("[data-action=solo]:visible").click()
            await gp.evaluate("window.__drainio.getGame().intro=0")
            await gp.keyboard.down("d")
            await wait(gp, "window.__drainio.inspect().state.players[0].x > -1.5")
            await gp.keyboard.up("d")
            assert (await state(gp))["state"]["stats"]["hurts"] == 0

        await check("WebGPU initializes and advances real gameplay", gpu_test)
        await gpu.close()
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--use-gl=angle",
                "--use-angle=swiftshader",
                "--enable-unsafe-swiftshader",
                "--disable-dev-shm-usage",
            ],
        )
        ctx = await browser.new_context(
            viewport={"width": 1440, "height": 900}, ignore_https_errors=True
        )
        await ctx.add_init_script(PAD_SCRIPT)
        page = await ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        if ONLY == "D-pad":
            await ready(page)
            await page.evaluate("window.__drainio.start(1)")
            await page.keyboard.press("Escape")
            await wait(page, "document.activeElement.dataset.action==='resume'")

        async def file_test():
            await ready(page, (ROOT / GAME).as_uri() + "?test=1&renderer=webgl")
            assert (await state(page))["screen"] == "title"
            assert await page.locator("[data-action=solo]:visible").is_visible()
            assert "WebGL" in (await state(page))["backend"]

        await check("shareable HTML opens directly from file://", file_test)

        async def controller_start():
            await presspad(page, {0: True})
            await wait(page, "window.__drainio.inspect().screen==='play'")
            assert (await state(page))["input"] == "pad"
            assert "×" in await page.locator("#play-footer").inner_text()
            await page.evaluate("window.__drainio.getGame().intro=0")
            x = (await state(page))["state"]["players"][0]["x"]
            await page.evaluate("setTestPad(0,{},[1,0,0,0])")
            await wait(page, f"window.__drainio.inspect().state.players[0].x > {x + 1}")
            await page.evaluate("setTestPad(0)")

        await check(
            "standard controller starts, moves and changes prompts", controller_start
        )

        async def combo_reserved():
            await presspad(page, {8: True, 9: True})
            assert (await state(page))["modal"] is None
            await presspad(page, {9: True})
            await wait(page, "window.__drainio.inspect().modal==='pause'")

        await check(
            "Create plus Options stays reserved; Options pauses", combo_reserved
        )

        async def pause_freezes():
            tick = (await state(page))["state"]["tick"]
            await page.wait_for_timeout(350)
            assert (await state(page))["state"]["tick"] == tick

        await check("pause freezes the solo physics world", pause_freezes)

        async def pad_menu_navigation():
            await presspad(page, {13: True})
            assert (
                await page.evaluate("document.activeElement.dataset.action") == "manual"
            )
            await presspad(page, {0: True})
            await wait(page, "window.__drainio.inspect().modal==='manual'")
            await presspad(page, {1: True})
            await wait(page, "window.__drainio.inspect().modal==='pause'")

        await check(
            "D-pad navigation and face buttons operate the same menus",
            pad_menu_navigation,
        )

        async def workshop():
            await page.locator("[data-action=dev]:visible").click()
            speed = page.locator("#range-speed")
            await speed.evaluate("(el)=>{el.value='8.1'}")
            await speed.dispatch_event("input")
            assert await page.evaluate("window.__drainio.getGame().config.speed") == 8.1
            assert (await state(page))["state"]["cheated"]
            await page.locator("[data-action=reset-config]:visible").click()
            assert await page.evaluate("window.__drainio.getGame().config.speed") == 6.2
            await page.locator("[data-action=dev-tools]:visible").click()
            before = await page.evaluate("window.__drainio.getGame().tick")
            await page.locator("[data-action=step]:visible").click()
            assert await page.evaluate("window.__drainio.getGame().tick") == before + 1
            await page.locator("[data-action=god]:visible").click()
            assert await page.evaluate("window.__drainio.getGame().god")
            await page.locator("[data-action=debug-draw]:visible").click()
            await page.wait_for_timeout(200)
            await page.locator("[data-action=spawn-hopper]:visible").click()
            assert any(
                e["type"] == "hopper" for e in (await state(page))["state"]["enemies"]
            )
            await page.locator("[data-action=resume]:visible").click()

        await check(
            "pause workshop edits live variables, resets, steps and spawns", workshop
        )

        async def keyboard_physics():
            await page.evaluate(
                'window.__drainio.start(1);window.__drainio.scenario("shell")'
            )
            await page.keyboard.press("Space")
            await wait(
                page,
                "window.__drainio.inspect().state.enemies.some(e=>e.state==='flipped')",
            )
            await page.keyboard.up("Space")
            assert (await state(page))["state"]["stats"]["bumps"] >= 1
            await page.evaluate(
                """()=>{const g=window.__drainio.getGame(),e=g.enemies.find(e=>e.state==='flipped');g.setPosition(g.players[0],e.x,e.y+.2)}"""
            )
            await wait(page, "window.__drainio.inspect().state.stats.kicks>=1")

        await check(
            "keyboard jump bumps a pest and contact kicks it away", keyboard_physics
        )

        async def settings_audio():
            await page.evaluate(
                "window.__drainio.start(1);window.__drainio.getGame().intro=0"
            )
            await page.keyboard.press("Escape")
            await page.locator("[data-action=settings]:visible").click()
            assert (await state(page))["settings"]["music"] == 0.1
            await page.locator("#range-music").evaluate("el=>{el.value='.23'}")
            await page.locator("#range-music").dispatch_event("input")
            assert (await state(page))["settings"]["music"] == 0.23
            await page.locator("[data-action=glyphs]:visible").click()
            assert (await state(page))["settings"]["glyphs"] == "xbox"
            await page.locator("[data-action=back]:visible").click()
            await page.locator("[data-action=resume]:visible").click()
            await page.evaluate("setTestPad(0,{},[.8,0,0,0])")
            await wait(
                page,
                "window.__drainio.inspect().input==='pad'&&document.querySelector('#play-footer').innerHTML.includes('>A<')",
            )
            await page.evaluate("setTestPad(0)")
            audio = await page.evaluate("window.__drainio.audioCheck()")
            assert 0.001 < audio["rms"] < 0.2 and 0 < audio["peak"] < 1
            assert (await state(page))["sound"]["notes"] > 0
            await page.keyboard.press("Escape")
            await page.locator("[data-action=settings]:visible").click()
            await page.locator("#range-music").evaluate("el=>{el.value='.1'}")
            await page.locator("#range-music").dispatch_event("input")
            await page.locator("[data-action=glyphs]:visible").click()
            await page.locator("[data-action=back]:visible").click()
            await page.locator("[data-action=resume]:visible").click()

        await check(
            "settings, Xbox glyphs and measurable code-generated music", settings_audio
        )

        async def crew_input():
            await page.evaluate(
                "window.__drainio.start(4);window.__drainio.getGame().intro=0;for(let i=0;i<4;i++)setTestPad(i,{},[i%2?-1:1,0,0,0])"
            )
            before = [p["x"] for p in (await state(page))["state"]["players"]]
            await wait(
                page,
                "window.__drainio.inspect().state.players.every(p=>Math.abs(p.vx)>5)",
            )
            after = [p["x"] for p in (await state(page))["state"]["players"]]
            assert all(abs(a - b) > 0.1 for a, b in zip(after, before))
            await page.evaluate("window.__pads=[]")

        await check("four virtual pads control four distinct couch players", crew_input)

        async def about_feedback():
            await page.evaluate("window.__drainio.start(1)")
            await page.keyboard.press("Escape")
            await page.locator("[data-action=about]:visible").click()
            text = await page.locator(".source-content").inner_text()
            for word in [
                "Mario Bros.",
                "Three.js r180",
                "added on import",
                "gpt-6.1-sol",
                "2026-11-05",
            ]:
                assert word in text
            for category, count in [("testing", 4), ("engine", 6), ("prompt", 4)]:
                await page.locator(f"[data-action=about-{category}]:visible").click()
                assert await page.locator(".feedback-item").count() == count
            await page.locator("[data-action=back]:visible").click()
            assert (await state(page))["modal"] == "pause"
            await page.locator("[data-action=quit]:visible").click()

        await check(
            "About contains source information and all feedback screens", about_feedback
        )

        async def attract():
            await page.wait_for_function(
                "window.__drainio.inspect().screen==='attract'", timeout=18000
            )
            initial = (await state(page))["state"]["tick"]
            await wait(page, f"window.__drainio.inspect().state.tick>{initial + 60}")
            await page.keyboard.press("x")
            await wait(page, "window.__drainio.inspect().screen==='title'")

        await check(
            "ten idle seconds starts AI attract play; input exits safely", attract
        )

        async def menu_layout():
            await page.set_viewport_size({"width": 1920, "height": 1080})
            if (await state(page))["screen"] == "attract":
                await page.keyboard.press("Escape")
            await page.locator("[data-action=manual]:visible").click()
            assert await page.locator(".manual-step").count() == 3
            await page.locator("[data-action=manual-1]:visible").click()
            assert await page.locator(".pest-card").count() == 4
            assert await page.locator(".pest-card").first.evaluate(
                "el=>{const r=el.getBoundingClientRect();return !!document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('#modal')}"
            )
            box = await page.locator(".panel").bounding_box()
            assert box["x"] >= 0 and box["y"] >= 0 and box["y"] + box["height"] <= 1081
            await page.screenshot(path=str(DEV / "tests/manual-review.png"))
            await page.locator("[data-action=back]:visible").click()
            await page.screenshot(path=str(DEV / "tests/title-final.png"))

        await check(
            "manual explains the full rules and fits the TV viewport", menu_layout
        )
        await page.close()
        await ctx.close()
        touchctx = await browser.new_context(
            viewport={"width": 844, "height": 390},
            device_scale_factor=1,
            is_mobile=True,
            has_touch=True,
            ignore_https_errors=True,
        )
        touch = await touchctx.new_page()

        async def touch_controls():
            await ready(touch)
            await touch.tap("[data-action=solo]:visible")
            await touch.evaluate("window.__drainio.getGame().intro=0")
            client = await touchctx.new_cdp_session(touch)
            await client.send(
                "Input.dispatchTouchEvent",
                {"type": "touchStart", "touchPoints": [{"x": 140, "y": 260, "id": 1}]},
            )
            await client.send(
                "Input.dispatchTouchEvent",
                {"type": "touchMove", "touchPoints": [{"x": 220, "y": 260, "id": 1}]},
            )
            await wait(touch, "window.__drainio.inspect().state.players[0].x>-1.8")
            await client.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchStart",
                    "touchPoints": [
                        {"x": 220, "y": 260, "id": 1},
                        {"x": 730, "y": 170, "id": 2},
                    ],
                },
            )
            await wait(touch, "window.__drainio.inspect().state.stats.jumps>=1")
            await client.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )
            assert (await state(touch))["input"] == "touch"
            await touch.evaluate("window.__drainio.position(0,0,.65)")
            await wait(
                touch,
                "!document.getElementById('touch-action').classList.contains('hidden')",
            )
            await touch.tap("#touch-action")
            await wait(touch, "window.__drainio.inspect().state.pow===2")
            await touch.tap("#pause-now")
            assert (await state(touch))["modal"] == "pause"
            await touch.screenshot(path=str(DEV / "tests/touch-review.png"))

        await check(
            "touch supports invisible movement, multitouch jump and contextual BOP",
            touch_controls,
        )
        await touch.close()
        await touchctx.close()
        hostctx = await browser.new_context(
            viewport={"width": 960, "height": 600}, ignore_https_errors=True
        )
        guestctx = await browser.new_context(
            viewport={"width": 960, "height": 600}, ignore_https_errors=True
        )
        host = await hostctx.new_page()
        guest = await guestctx.new_page()

        async def internet_room():
            await ready(host)
            await host.bring_to_front()
            await host.keyboard.press("Escape")
            await host.locator("[data-action=online]:visible").click(force=True)
            await host.locator("[data-action=host-room]:visible").click(force=True)
            await wait(host, "window.__drainio.inspect().modal==='lobby'")
            code = (await state(host))["network"]["code"]
            await ready(guest)
            await guest.bring_to_front()
            await guest.keyboard.press("Escape")
            await guest.locator("[data-action=online]:visible").click(force=True)
            await guest.locator("#room-input").fill(code)
            await guest.locator("[data-action=join-room]:visible").click()
            await wait(
                guest,
                "window.__drainio.getNetwork().hostConnection?.open===true",
                timeout=25000,
            )
            await wait(guest, "window.__drainio.inspect().network.joined===true")
            await wait(host, "window.__drainio.inspect().network.players.length===2")
            await host.bring_to_front()
            await host.locator("[data-action=online-start]:visible").click(force=True)
            await wait(
                guest,
                "window.__drainio.inspect().screen==='play'&&window.__drainio.inspect().state?.players.length===2",
            )
            await host.evaluate("window.__drainio.getGame().intro=0")
            x = (await state(host))["state"]["players"][1]["x"]
            await guest.keyboard.down("d")
            await wait(
                host,
                f"window.__drainio.inspect().state.players[1].x>{x + 1.5}",
                timeout=15000,
            )
            await guest.keyboard.up("d")
            assert (await state(guest))["network"]["received"] > 3
            await host.evaluate("window.__drainio.getNetwork().close()")
            await wait(guest, "window.__drainio.inspect().modal==='disconnect'")

        await check(
            "standalone WebRTC room connects two isolated contexts and relays movement",
            internet_room,
        )
        await host.close()
        await guest.close()
        await hostctx.close()
        await guestctx.close()
        for players, scenario, loss in [
            (2, "standard", 0),
            (4, "standard", 5),
            (4, "host-leave", 5),
            (2, "server", 0),
        ]:
            harness = await browser.new_page(
                viewport={"width": 1280, "height": 800}, ignore_https_errors=True
            )

            async def run_harness(
                players=players, scenario=scenario, loss=loss, harness=harness
            ):
                game = "../../" + GAME + "?renderer=webgl"
                query = urllib.parse.urlencode(
                    {
                        "game": game,
                        "players": players,
                        "auto": 1,
                        "limit": 8,
                        "latency": 150 if loss else 0,
                        "jitter": 50 if loss else 0,
                        "loss": loss,
                        "scenario": scenario,
                    }
                )
                await harness.goto(f"{BASE}/{DEV.name}/research/harness.html?{query}")
                await harness.wait_for_function(
                    'document.body.dataset.complete === "true"', timeout=140000
                )
                report = await harness.evaluate("window.__hubCheck")
                if not report["pass"]:
                    failures = [c for c in report["checks"] if not c["pass"]]
                    raise AssertionError(json.dumps(failures))

            await check(
                f"AI Hub conformance: {players} players, {scenario}, {loss}% loss",
                run_harness,
            )
            await harness.close()
        await check(
            "no uncaught errors across keyboard, controller and workshop flows",
            lambda: assert_async(not errors, errors),
        )
        await browser.close()
        try:
            wk = await p.webkit.launch(headless=True)
            wkpage = await wk.new_page(
                viewport={"width": 844, "height": 390},
                has_touch=True,
                ignore_https_errors=True,
            )

            async def webkit():
                await ready(wkpage)
                await wkpage.tap("[data-action=solo]:visible")
                await wait(wkpage, "window.__drainio.inspect().screen==='play'")
                assert "WebGL" in (await state(wkpage))["backend"]

            await check(
                "WebKit touch profile loads compatibility rendering and starts", webkit
            )
            await wk.close()
        except Exception as e:  # noqa: BLE001 - report browser startup failures
            results.append(
                {"name": "WebKit launch", "pass": False, "error": str(e)[:700]}
            )
    print(json.dumps(results))


async def assert_async(condition, detail):
    assert condition, str(detail)


try:
    asyncio.run(main())
finally:
    server.shutdown()
    server.server_close()
