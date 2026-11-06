"""One command: npm test --silent. Logs only failures and the final aggregate count."""

import json
import re
import subprocess
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

from test_hub import GPU_ARGS, run_hub_checks

ROOT = Path(__file__).resolve().parent
checks = 0
failures = []


def check(value, message):
    global checks
    checks += 1
    if not value:
        failures.append(message)


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


PAD_SCRIPT = """window.virtualPad={connected:false,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0,touched:false})),index:0,id:'Virtual standard DualSense',mapping:'standard',timestamp:0};Object.defineProperty(navigator,'getGamepads',{value:()=>virtualPad.connected?[virtualPad]:[]});"""


def core_checks(browser, url):
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    context.add_init_script(PAD_SCRIPT)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    try:
        page.goto(url, wait_until="domcontentloaded")
        page.wait_for_function("window.__game?.ready", timeout=90000)
        state = page.evaluate("__game.state")
        check(
            page.title() == state["title"] == "Pit & Away: Lost Caverns",
            "Exact release identity",
        )
        check(state["backend"] == "WebGPU", "Requested WebGPU backend")
        check(state["settings"]["music"] == 0.1, "Music defaults to10%")
        check(
            state["colliders"] == 16,
            "All authored terrain and capsule colliders are present",
        )
        check(
            page.locator('meta[name="hub:session"]').get_attribute("content") == "1",
            "Embedded AI Hub protocol metadata",
        )
        page.locator("[data-action=start]").click()
        page.evaluate("__game.setManual(true);__game.advance(20)")
        check(page.evaluate("__game.state.player.grounded"), "Rapier standing contact")
        x = page.evaluate("__game.state.player.x")
        page.keyboard.down("d")
        page.evaluate("__game.advance(25)")
        page.keyboard.up("d")
        check(
            page.evaluate("__game.state.player.x") > x + 1, "Native keyboard movement"
        )
        page.keyboard.press("Escape")
        check(page.evaluate("__game.state.modal") == "pause", "Keyboard pause")
        before = page.evaluate("__game.state")
        page.evaluate("__game.advance(120)")
        after = page.evaluate("__game.state")
        check(
            before["player"]["x"] == after["player"]["x"]
            and before["worldTime"] == after["worldTime"],
            "Solo pause freezes actors and wildlife",
        )
        page.locator("[data-action=dev]").click()
        check(
            page.locator("input[type=range]").count() == 7,
            "All seven balance variables are live sliders",
        )
        page.locator("#speed").fill("9.4")
        page.locator("#speed").dispatch_event("input")
        check(
            page.evaluate("__game.state.tuning.speed") == 9.4, "Live run speed tuning"
        )
        page.locator("[data-action=toggle-invulnerable]").click()
        check(
            page.evaluate("__game.state.dev.invulnerable"),
            "Developer invulnerability toggle",
        )
        page.locator("[data-action=warp-next]").click()
        check(
            page.evaluate("__game.state.player.checkpoint") == 1, "Developer camp warp"
        )
        page.locator("[data-action=reset-tuning]").click()
        check(
            page.evaluate("__game.state.tuning.speed") == 6.4
            and not page.evaluate("__game.state.dev.invulnerable"),
            "Reset balance restores defaults",
        )
        page.keyboard.press("Escape")
        page.locator("[data-action=settings]:visible").click()
        page.evaluate(
            "virtualPad.connected=true;virtualPad.buttons[0].pressed=false;__game.advance(1)"
        )
        page.keyboard.press("ArrowRight")
        check(
            page.evaluate("__game.state.settings.music") == 0.15,
            "Keyboard adjusts focused sliders",
        )
        page.locator("[data-action=glyphs]").click()
        page.evaluate(
            "virtualPad.axes[0]=.8;__game.advance(1);virtualPad.axes[0]=0;__game.advance(1)"
        )
        check(
            page.evaluate("__game.state.settings.glyphs") == "playstation",
            "Controller button action preserves focus on rerender",
        )
        page.keyboard.press("Escape")
        page.locator("[data-action=about]:visible").click()
        check(
            all(
                page.get_by_text(text, exact=False).count() > 0
                for text in [
                    "Source",
                    "Testing Feedback",
                    "Engine Feedback",
                    "Prompt Feedback",
                    "added on import",
                ]
            ),
            "Credits contain all required disclosures",
        )
        page.locator("summary").first.click()
        check(
            page.locator("details").first.get_attribute("open") is not None,
            "Feedback sections can expand",
        )
        page.keyboard.press("Escape")
        page.locator("[data-action=resume]").click()
        page.evaluate(
            "virtualPad.axes[0]=.8;__game.advance(30);virtualPad.axes[0]=0;__game.advance(1)"
        )
        check(
            "round" in page.locator("#controls").inner_html(),
            "Live standard gamepad displays controller glyphs",
        )
        page.evaluate(
            "virtualPad.buttons[9].pressed=true;virtualPad.buttons[8].pressed=true;__game.advance(1);virtualPad.buttons[9].pressed=false;virtualPad.buttons[8].pressed=false;__game.advance(1)"
        )
        check(page.evaluate("__game.state.modal") == "", "Create+Options is ignored")
        page.evaluate("virtualPad.connected=false")
        page.keyboard.press("m")
        check(
            page.locator(".map-visual svg").count() == 1
            and "MINA" in page.locator(".map-visual").inner_text(),
            "Expedition map shows the connected route and objectives",
        )
        page.keyboard.press("m")
        page.evaluate("__game.pause()")
        page.locator("[data-action=settings]:visible").click()
        page.locator("[data-action=toggle-assist]").click()
        page.keyboard.press("Escape")
        page.locator("[data-action=resume]").click()
        page.evaluate(
            "__game.start();__game.setManual(true);__game.setDev({invulnerable:true});__game.advance(170,{x:1,y:0,jump:false})"
        )
        check(
            page.evaluate("__game.state.player.x>19 && __game.state.player.y>-.5"),
            "Trail assist automatically holds a full gap-clearing jump",
        )
        page.evaluate("__game.pause()")
        page.locator("[data-action=settings]:visible").click()
        page.locator("[data-action=toggle-assist]").click()
        page.keyboard.press("Escape")
        page.locator("[data-action=resume]").click()

        page.evaluate(
            "__game.start();__game.setManual(true);__game.warp(4);__game.setDev({invulnerable:true});__game.advance(200,{x:1,y:0,jump:false})"
        )
        check(
            not page.evaluate("__game.state.stats.finished"),
            "Exit requires both friends and the Sunstone",
        )
        result = page.evaluate((ROOT / "route.js").read_text())
        check(
            result["state"]["stats"]["finished"]
            and all(result["state"]["stats"]["found"].values()),
            "Complete scripted expedition reaches the ending",
        )
        check(
            all(result["state"]["stats"]["visited"].values()),
            "Full playthrough uses walking, ladders, swimming and balloon travel",
        )
        check(
            result["state"]["stats"]["gold"] >= 7,
            "Full playthrough collects physical treasures",
        )
        check(
            result["state"]["stats"]["checkpoints"] >= 4,
            "Route discovers and activates expedition camps",
        )
        check(
            page.locator("[data-action=restart]").count() == 1,
            "Ending provides a playable restart",
        )
        page.evaluate(
            "__game.start();__game.setManual(true);__game.setDev({invulnerable:false});__game.advance(65);__game.collect(0);__game.damage()"
        )
        state = page.evaluate("__game.state")
        check(
            state["stats"]["deaths"] == 1
            and state["stats"]["score"] == 8500
            and abs(state["player"]["x"] - 3) < 0.2,
            "Hazards return to camp and deduct500 points",
        )
        check(
            state["stats"]["gold"] == 1, "Treasure persists through checkpoint recovery"
        )
        page.evaluate("__game.warp(1);__game.advance(130);__game.damage()")
        check(
            abs(page.evaluate("__game.state.player.x") - 22) < 0.2,
            "Later camps are used for return travel",
        )
        page.evaluate(
            "__game.start();__game.setManual(true);__game.advance(300,{x:1,y:0,jump:false})"
        )
        check(
            page.evaluate("__game.state.stats.deaths") > 0,
            "Actual moving wildlife can hit an unprotected explorer",
        )
        page.evaluate("__game.title();__game.setManual(false)")
        page.wait_for_function("__game.state.attract", timeout=16000)
        check(
            page.evaluate("__game.state.mode") == "attract",
            "Ten seconds idle starts AI-played attract mode",
        )
        page.evaluate("__game.advance(3550)")
        check(
            page.evaluate("__game.state.attract && !__game.state.stats.finished"),
            "Attract replay loops without finishing or stranding",
        )
        page.keyboard.press("Enter")
        check(
            page.evaluate("__game.state.mode") == "title",
            "Any key exits attract without starting a game",
        )

        page.locator("[data-action=coop]").click()
        page.locator("[data-action=join-local]").click()
        page.evaluate(
            "virtualPad.connected=true;virtualPad.buttons[0].pressed=true;__game.advance(1);virtualPad.buttons[0].pressed=false;__game.advance(1)"
        )
        check(
            page.locator("#room-input").input_value() == "CAVE-1000",
            "Controller edits room digits without a keyboard",
        )
        page.locator("#room-input").fill("CAVE-5279")
        check(
            page.locator("[data-room-digit]").all_text_contents()
            == ["5", "2", "7", "9"],
            "Typed room codes and controller digit buttons stay synchronized",
        )
        page.evaluate("virtualPad.connected=false")
        check(not errors, "Browser runtime errors: " + str(errors))
        check(
            len(json.dumps(page.evaluate("__game.snapshot()"))) < 16384,
            "Network snapshots fit the protocol budget",
        )
    except (PlaywrightError, ValueError, KeyError, TypeError) as error:
        check(False, "Core tests: " + str(error))
    finally:
        context.close()


def touch_checks(browser, url):
    context = browser.new_context(
        viewport={"width": 844, "height": 390},
        is_mobile=True,
        has_touch=True,
        device_scale_factor=1,
    )
    page = context.new_page()
    try:
        page.goto(url)
        page.wait_for_function("__game?.ready", timeout=90000)
        page.locator("[data-action=start]").tap()
        page.evaluate("__game.setManual(true);__game.advance(10)")
        cdp = context.new_cdp_session(page)
        cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchStart", "touchPoints": [{"x": 100, "y": 250, "id": 7}]},
        )
        cdp.send(
            "Input.dispatchTouchEvent",
            {"type": "touchMove", "touchPoints": [{"x": 150, "y": 250, "id": 7}]},
        )
        page.evaluate("__game.advance(30)")
        check(
            page.evaluate("__game.state.player.x") > 4,
            "Invisible touch stick moves the explorer",
        )
        check(
            page.locator("#touch-action").is_visible(),
            "Touch shows a context-sensitive action",
        )
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        action_box = page.locator("#touch-action").bounding_box()
        cdp.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchStart",
                "touchPoints": [
                    {"x": action_box["x"] + 30, "y": action_box["y"] + 30, "id": 8}
                ],
            },
        )
        page.evaluate("__game.advance(12)")
        check(page.evaluate("__game.state.player.y") > 0.3, "Touch jump action works")
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        page.locator("#touch-menu").tap()
        check(
            page.evaluate("__game.state.modal") == "pause",
            "Touch menu opens the same pause flow",
        )
        check(
            page.locator(".panel").bounding_box()["height"] <= 390,
            "Landscape phone menus fit the viewport",
        )
    except (PlaywrightError, ValueError, KeyError, TypeError) as error:
        check(False, "Touch tests: " + str(error))
    finally:
        context.close()


def file_checks(browser):
    context = browser.new_context()
    host = context.new_page()
    guest = context.new_page()
    try:
        release = ROOT.parent / (ROOT.name + ".html")
        for page in (host, guest):
            page.goto(release.as_uri())
            page.wait_for_function("__game?.ready", timeout=90000)
        check(
            host.evaluate("__game.state.title") == "Pit & Away: Lost Caverns",
            "Shareable HTML boots directly through file://",
        )
        host.evaluate(
            "__game.title();__game.network.hostLocal('FILE-SUITE');__game.start();__game.setManual(true);__game.advance(1)"
        )
        guest.evaluate(
            "__game.title();__game.network.joinLocal('FILE-SUITE');__game.start()"
        )
        host.wait_for_function("__game.network._paired", timeout=10000)
        host.evaluate("__game.network.sendSnapshot(__game.snapshot(),true)")
        guest.wait_for_function("__game.network.stats.snapshots>0", timeout=10000)
        check(
            guest.evaluate("__game.state.player.id") == 1,
            "Same-file co-op connects and replicates the correct explorer",
        )
    except (PlaywrightError, ValueError, KeyError, TypeError) as error:
        check(False, "File release tests: " + str(error))
    finally:
        context.close()


def main():
    global checks
    instance = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(Quiet, directory=str(ROOT))
    )
    thread = Thread(target=instance.serve_forever, daemon=True)
    thread.start()
    try:
        url = f"http://127.0.0.1:{instance.server_port}/game.html"
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=GPU_ARGS)
            try:
                core_checks(browser, url)
                touch_checks(browser, url)
                file_checks(browser)
                report = run_hub_checks(browser, url)
                checks += report["count"]
                failures.extend(report["failures"])
            finally:
                browser.close()
        result = subprocess.run(
            [sys.executable, str(ROOT / "test-network-audio.py")],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        match = re.search(r"(\d+)/(\d+).*checks passed", result.stdout)
        if match:
            checks += int(match[2])
            failures.extend(
                line for line in result.stdout.splitlines() if line.startswith("FAIL")
            )
        else:
            check(
                False,
                "Isolated network/audio test did not report counts: "
                + result.stdout
                + result.stderr,
            )
        check((ROOT.parent / "exit-interview.json").exists(), "Exit interview exists")
        if (ROOT.parent / "exit-interview.json").exists():
            obj = json.loads((ROOT.parent / "exit-interview.json").read_text())
            check(
                obj["aiHub"]["name"] == "Pit & Away: Lost Caverns"
                and obj["sourceInformation"]["usage"] == "added on import",
                "Exit interview JSON schema and identity",
            )
    finally:
        instance.shutdown()
        instance.server_close()
        thread.join()
    for failure in failures:
        print("FAIL:", failure)
    print(f"{checks - len(failures)}/{checks} checks passed")
    (ROOT / "test-results.json").write_text(
        json.dumps(
            {"checks": checks, "passed": checks - len(failures), "failures": failures},
            indent=2,
        )
    )
    return bool(failures)


if __name__ == "__main__":
    raise SystemExit(main())
