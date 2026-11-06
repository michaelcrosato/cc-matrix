"""Two-page standalone integration. Run after the Hub runner closes.

Usage: playwright-python test-online.py GAME_URL
Pinned rendering dependencies are fulfilled from the downloaded vendor copies.
"""

import importlib.util
import json
import math
import sys
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("hub_runner", ROOT / "test-hub.py")
HUB = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(HUB)

PAD_SCRIPT = """() => {
  window.testPad = {id:'Standard Test Pad',index:0,connected:true,mapping:'standard',
    axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))};
  Object.defineProperty(navigator,'getGamepads',{value:()=>[window.testPad],configurable:true});
}"""


def run(game_url):
    failures = []
    count = 0
    observations = {}

    def check(condition, message):
        nonlocal count
        count += 1
        if not condition:
            failures.append(message)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=HUB.WEBGPU_ARGS)
        try:
            context = browser.new_context(
                ignore_https_errors=True,
                viewport={"width": 960, "height": 600},
            )
            context.route("https://cdn.jsdelivr.net/**", HUB.vendor_route)
            context.add_init_script("(" + PAD_SCRIPT + ")()")
            pages = [context.new_page(), context.new_page()]
            errors = []
            for page in pages:
                page.on(
                    "pageerror", lambda error, target=errors: target.append(str(error))
                )
                page.goto(game_url, wait_until="domcontentloaded")
                page.wait_for_function("window.__game?.state().ready", timeout=30000)
            host, guest = pages
            check(
                all(
                    page.evaluate("__game.state().renderer === 'WebGPU'")
                    for page in pages
                ),
                "Both standalone copies must initialize WebGPU.",
            )
            host.evaluate("__game.test.config({points:50,roundTime:300})")
            room = host.evaluate("__game.test.network.hostRoom()")
            guest.evaluate("room => __game.test.network.joinRoom(room)", room)
            for page in pages:
                page.wait_for_function(
                    "__game.state().network.started && __game.state().mode === 'play'",
                    timeout=10000,
                )
            check(
                host.evaluate(
                    "__game.state().network.me === 0 && __game.state().entities.length === 2"
                )
                and guest.evaluate(
                    "__game.state().network.me === 1 && __game.state().entities.length === 2"
                ),
                "Browser room did not assign both live player seats.",
            )
            before = host.evaluate("__game.state().entities.find(e=>e.id===1)")
            guest.evaluate(
                "testPad.axes=[0,-.8,1,0];testPad.buttons[7]={pressed:true,touched:true,value:1}"
            )
            host.wait_for_timeout(1400)
            host_state = host.evaluate("__game.state()")
            guest_state = guest.evaluate("__game.state()")
            moved = next(e for e in host_state["entities"] if e["id"] == 1)
            reflected = next(e for e in guest_state["entities"] if e["id"] == 1)
            check(
                math.hypot(moved["x"] - before["x"], moved["z"] - before["z"]) > 0.5,
                "Guest's virtual gamepad did not move its tank in the authoritative host world.",
            )
            check(
                host_state["shotsFired"] > 0 and guest_state["inputKind"] == "gamepad",
                "Guest's virtual gamepad trigger did not fire on the host.",
            )
            check(
                math.hypot(moved["x"] - reflected["x"], moved["z"] - reflected["z"])
                < 2.5
                and host_state["network"]["received"] > 0
                and guest_state["network"]["received"] > 0,
                "Authoritative movement snapshots did not return to the guest.",
            )
            guest.evaluate(
                "testPad.axes=[0,0,0,0];testPad.buttons[7]={pressed:false,touched:false,value:0}"
            )
            host.evaluate("__game.test.makeArena(3)")
            guest.wait_for_function("__game.state().stage === 3", timeout=5000)
            host.evaluate("__game.test.score(0)")
            guest.wait_for_function("__game.state().totals[0] > 0", timeout=5000)
            check(
                guest.evaluate(
                    "__game.state().stage === 3 && __game.state().totals[0] === 1"
                ),
                "Invisible-field transition and score did not synchronize.",
            )
            host.evaluate("__game.test.makeArena(4)")
            guest.wait_for_function("__game.state().stage === 4", timeout=5000)
            # Score and finish in the same JS task: the final point cannot have
            # reached the guest through an ordinary world snapshot yet.
            host.evaluate(
                "__game.test.score(0);__game.test.endRound();__game.test.continue()"
            )
            for page in pages:
                page.wait_for_function(
                    "__game.state().network.ended && __game.state().mode === 'finished' && __game.state().screen === 'result'",
                    timeout=5000,
                )
            check(
                all(
                    page.locator("#resultKicker").inner_text() == "CARTRIDGE COMPLETE"
                    for page in pages
                ),
                "Final-field host finish did not show complete results on both copies.",
            )
            observations["host"] = host.evaluate("__game.state()")
            observations["guest"] = guest.evaluate("__game.state()")
            final_scores = host.evaluate("__game.test.network.lastScores")
            check(
                observations["host"]["totals"] == observations["guest"]["totals"]
                and observations["host"]["totals"][0] >= 2
                and all(
                    observations["host"]["totals"][int(seat)] == value
                    for seat, value in final_scores.items()
                ),
                "Final totals differed after the host's final hit and finish packet.",
            )
            for page in pages:
                page.evaluate("__game.test.title()")
            check(
                all(
                    page.evaluate(
                        "__game.state().mode === 'title' && !__game.state().network.online && !__game.test.audio.muted && __game.test.audio.musicEnabled"
                    )
                    for page in pages
                ),
                "Returning from online results to title did not restore unmuted music.",
            )
            check(not errors, "Standalone browser errors: " + "; ".join(errors[:4]))
            for page in pages:
                page.evaluate("__game.test.network.close()")
            context.close()
        except PlaywrightError as error:
            count += 1
            failures.append(f"{type(error).__name__}: {error}")
        finally:
            browser.close()
    return failures, count, observations


def main():
    if len(sys.argv) != 2:
        print("FAIL: usage: test-online.py GAME_URL_WITH_TEST_QUERY")
        print("0/1 standalone online checks passed")
        return 1
    failures, count, observations = run(sys.argv[1])
    (ROOT / "test-online-report.json").write_text(
        json.dumps(
            {"checks": count, "failures": failures, "observations": observations},
            indent=2,
        )
        + "\n"
    )
    for failure in failures:
        print("FAIL: " + failure)
    print(f"{count - len(failures)}/{count} standalone online checks passed")
    return int(bool(failures))


if __name__ == "__main__":
    raise SystemExit(main())
