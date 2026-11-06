"""Official AI Hub conformance; can be imported by the main one-command suite."""

import json
import sys
from pathlib import Path
from urllib.parse import urlencode, urlsplit, urlunsplit

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
GPU_ARGS = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-webgpu-adapter=swiftshader",
    "--autoplay-policy=no-user-gesture-required",
]


def run_hub_checks(browser, game_url, *, official=True):
    """Run the unmodified official harness in one browser, sequentially."""
    reports = []
    failures = []
    count = 0
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    page = context.new_page()
    try:
        page.goto(game_url, wait_until="domcontentloaded")
        page.wait_for_function("window.__game?.ready === true", timeout=60000)
        title = page.title()
        state_title = page.evaluate("window.__game.state.title")
        count += 1
        if title != "Pit & Away: Lost Caverns" or state_title != title:
            failures.append(
                f"Game identity mismatch: document={title!r}, state={state_title!r}"
            )
            return {"count": count, "failures": failures, "reports": reports}
        parsed = urlsplit(game_url)
        directory = parsed.path.rsplit("/", 1)[0] + "/"
        harness = urlunsplit(
            (parsed.scheme, parsed.netloc, directory + "harness.html", "", "")
        )
        game_name = parsed.path.rsplit("/", 1)[-1]
        for scenario, network in (
            [
                ("standard", {}),
                ("standard-stressed", {"latency": 150, "jitter": 50, "loss": 5}),
                ("host-leave", {}),
                ("server", {"latency": 150, "jitter": 50, "loss": 5}),
            ]
            if official
            else []
        ):
            params = {
                "game": game_name,
                "players": 2,
                "auto": 1,
                "scenario": "standard" if scenario == "standard-stressed" else scenario,
                "play": 6000,
                "seed": 314159,
                **network,
            }
            page.goto(harness + "?" + urlencode(params), wait_until="domcontentloaded")
            page.wait_for_function(
                'document.body.dataset.complete === "true"', timeout=90000
            )
            report = page.evaluate("window.__hubCheck")
            reports.append({"scenario": scenario, **report})
            count += len(report.get("checks", []))
            for check in report.get("checks", []):
                if not check["pass"]:
                    failures.append(
                        f"{scenario}: {check['name']}: {check.get('detail', '')}"
                    )
            if not report.get("checks"):
                failures.append(f"{scenario}: official harness produced no checks")
                count += 1
        # The official harness checks the protocol. These assertions also exercise
        # the shipped game's physical second seat and its complete balloon journey.
        page.goto(game_url, wait_until="domcontentloaded")
        page.wait_for_function("window.__game?.ready === true", timeout=60000)
        guest = context.new_page()
        guest.goto(game_url, wait_until="domcontentloaded")
        guest.wait_for_function("window.__game?.ready === true", timeout=60000)
        room = page.evaluate("""() => {
          const room='CHECK-'+Date.now();__game.network.hostLocal(room);__game.start();
          __game.setDev({invulnerable:true});return room;
        }""")
        guest.evaluate("room=>{__game.network.joinLocal(room);__game.start()}", room)
        page.wait_for_function("__game.network._paired")
        guest.wait_for_function("__game.network.stats.snapshots > 0")
        page.evaluate("__game.setManual(true)")

        def coop_check(passed, name):
            nonlocal count
            count += 1
            reports.append(
                {"scenario": "standalone-coop", "name": name, "pass": passed}
            )
            if not passed:
                failures.append("standalone-coop: " + name)

        coop_check(
            guest.evaluate("__game.state.player.id===1")
            and page.evaluate("__game.getActor(1)?.id===1"),
            "Each device owns the correct physical explorer seat",
        )
        before = page.evaluate("__game.getActor(1).x")
        guest.evaluate("__game.setInput({x:1,y:0,jump:false})")
        guest.wait_for_timeout(180)
        moved = page.evaluate("__game.advance(60,{x:0,y:0,jump:false})")
        coop_check(
            moved["remote"]["x"] > before + 3 and abs(moved["player"]["x"] - 3) < 0.2,
            "Real remote input moves only the second KCC explorer",
        )
        guest.evaluate("__game.pause()")
        guest.wait_for_timeout(180)
        before = page.evaluate("__game.getActor(1).x")
        stopped = page.evaluate("__game.advance(30,{x:0,y:0,jump:false})")
        coop_check(
            stopped["remote"]["x"] - before < 0.65,
            "Guest menus neutralize held movement at the authority",
        )
        caught = page.evaluate("""() => {
          const p=__game.getActor(1);Object.assign(p,{x:85,y:-33.8,mode:'walk',vx:0,vy:0,
            grounded:true,jumpHeld:false,balloonLock:0,checkpoint:3,invuln:2});
          __game.setRemoteInput(1,{x:0,y:1,jump:true});return __game.advance(1);
        }""")
        floated = page.evaluate("""() => {
          __game.setRemoteInput(1,{x:0,y:1,jump:false});return __game.advance(60);
        }""")
        released = page.evaluate("""() => {
          __game.setRemoteInput(1,{x:0,y:0,jump:true});return __game.advance(1);
        }""")
        coop_check(
            caught["remote"]["mode"] == "float"
            and caught["balloon"]["ownerId"] == 1
            and floated["remote"]["y"] > caught["remote"]["y"] + 4
            and released["remote"]["mode"] == "walk"
            and not released["balloon"]["attached"],
            "The remote explorer can catch, steer, and release the shared balloon",
        )
        damaged = page.evaluate("""() => {
          const before=__game.state;__game.setDev({invulnerable:false});
          __game.getActor(1).invuln=0;__game.damage(__game.getActor(1));
          return {before,after:__game.state};
        }""")
        coop_check(
            damaged["after"]["stats"]["deaths"]
            == damaged["before"]["stats"]["deaths"] + 1
            and damaged["after"]["stats"]["score"]
            == damaged["before"]["stats"]["score"]
            - damaged["before"]["tuning"]["penalty"]
            and damaged["after"]["remote"]["checkpoint"] == 3
            and 80 < damaged["after"]["remote"]["x"] < 83
            and damaged["after"]["player"]["x"] == damaged["before"]["player"]["x"],
            "Remote damage penalizes the shared score and respawns only that explorer",
        )
        page.evaluate("""() => {
          __game.setDev({invulnerable:true});
          __game.items.forEach((item,index)=>{if(!item.collected)__game.collect(index)});
          Object.assign(__game.getActor(1),{x:113,y:-4.85,mode:'walk',vx:0,vy:0,jumpHeld:false});
          __game.setRemoteInput(1,{x:0,y:0,jump:false});__game.advance(1);
        }""")
        guest.wait_for_function(
            "__game.state.stats.finished && __game.state.mode==='won'"
        )
        coop_check(
            guest.evaluate("__game.state.player.id===1")
            and guest.evaluate("__game.state.stats.score")
            == page.evaluate("__game.state.stats.score"),
            "A remote explorer can finish and receive the final shared victory snapshot",
        )
        page.evaluate(
            "__game.start();__game.setManual(true);__game.advance(1);__game.network.sendSnapshot(__game.snapshot(),true)"
        )
        guest.wait_for_function(
            "__game.state.mode==='play' && !__game.state.stats.finished && __game.state.modal===''"
        )
        coop_check(True, "Host restart begins a fresh expedition on the guest")
        guest.evaluate("__game.title()")
        page.evaluate("__game.network.sendSnapshot(__game.snapshot(),true)")
        guest.wait_for_timeout(180)
        coop_check(
            guest.evaluate(
                "__game.state.mode==='title' && !__game.state.playing && __game.network.role==='solo'"
            ),
            "Leaving co-op returns to title without later snapshots restarting play",
        )
    except (PlaywrightError, OSError, ValueError, KeyError) as error:
        count += 1
        failures.append(type(error).__name__ + ": " + str(error))
    finally:
        context.close()
    result = {"count": count, "failures": failures, "reports": reports}
    (ROOT / "hub-test-results.json").write_text(json.dumps(result, indent=2))
    return result


def main():
    if len(sys.argv) != 2:
        print("FAIL: supply the served game URL to test_hub.py")
        print("0/1 Hub checks passed")
        return 1
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=GPU_ARGS)
        try:
            result = run_hub_checks(browser, sys.argv[1])
        finally:
            browser.close()
    for failure in result["failures"]:
        print("FAIL:", failure)
    print(
        f"{result['count'] - len(result['failures'])}/{result['count']} Hub checks passed"
    )
    return bool(result["failures"])


if __name__ == "__main__":
    raise SystemExit(main())
