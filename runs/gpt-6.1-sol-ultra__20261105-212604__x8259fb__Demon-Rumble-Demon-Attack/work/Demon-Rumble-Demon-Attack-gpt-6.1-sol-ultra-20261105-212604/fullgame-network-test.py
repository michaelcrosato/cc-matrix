#!/usr/bin/env python3
"""Actual bundled-game WebRTC playthrough: two pages, one browser, no server."""

import argparse
import json
import traceback
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parent
SELECTION = json.loads((DEV / "title-selection.json").read_text())
GAME = (DEV.parent / (SELECTION["basename"] + ".html")).as_uri()
PAD_STUB = """(() => {
 window.__networkPad={id:'Demon Rumble test standard pad',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:0};
 Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[__networkPad]});
})();"""


def run(fallback=False):
    result = {"checks": [], "errors": [], "campaign": {}}

    def check(name, condition, detail=None):
        result["checks"].append(
            {"name": name, "pass": bool(condition), "detail": detail}
        )

    def state(page):
        return page.evaluate("__game.state()")

    def ship(page, seat):
        return next(item for item in state(page)["ships"] if item["seat"] == seat)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--disable-dev-shm-usage",
                "--autoplay-policy=no-user-gesture-required",
            ],
        )
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        context.add_init_script(PAD_STUB)
        if fallback:
            context.add_init_script(
                "Object.defineProperty(navigator,'gpu',{value:undefined,configurable:true});"
            )
        host = context.new_page()
        guest = context.new_page()
        for label, page in [("host", host), ("guest", guest)]:
            page.on(
                "pageerror",
                lambda error, name=label: result["errors"].append(f"{name}: {error}"),
            )
        try:
            for page in (host, guest):
                page.goto(GAME, wait_until="load", timeout=60000)
                page.wait_for_function("window.__game?.state().ready", timeout=60000)
            check(
                "both file pages identify as Demon Rumble",
                "Demon Rumble" in host.title() and "Demon Rumble" in guest.title(),
            )
            check(
                "both renderer instances initialized",
                state(host)["backend"] == state(guest)["backend"]
                and ("WebGL" if fallback else "WebGPU") in state(host)["backend"],
                [state(host)["backend"], state(guest)["backend"]],
            )

            invite = host.evaluate("__game.network.createOffer()")
            reply = guest.evaluate("(code)=>__game.network.acceptOffer(code)", invite)
            host.evaluate("(code)=>__game.network.acceptAnswer(code)", reply)
            host.wait_for_function(
                "__game.state().network.active && __game.state().ships.length === 2",
                timeout=20000,
            )
            guest.wait_for_function(
                "__game.state().network.active && __game.state().ships.length === 2",
                timeout=20000,
            )
            # Freeze only the authoritative simulation. Real frame polling and networking keep running.
            host.evaluate("__game.tune({invincible:true});__game.step(0)")
            check(
                "manual code exchange creates a two-player game",
                invite.startswith("DR1:")
                and reply.startswith("DR1:")
                and state(host)["mode"] == "playing"
                and state(guest)["mode"] == "playing",
            )
            check(
                "host and guest use distinct correct seats",
                state(host)["network"]["isHost"]
                and state(host)["network"]["localSeat"] == 0
                and not state(guest)["network"]["isHost"]
                and state(guest)["network"]["localSeat"] == 1,
            )
            guest.wait_for_function(
                '__game.state().ships.map(s=>s.seat).sort().join() === "0,1"',
                timeout=5000,
            )
            check(
                "both ships are replicated to guest",
                sorted(item["seat"] for item in state(guest)["ships"]) == [0, 1],
            )

            guest_before = ship(host, 1)["x"]
            host_before = ship(host, 0)["x"]
            guest.keyboard.down("d")
            guest.wait_for_timeout(250)
            host.evaluate("__game.step(30)")
            guest.keyboard.up("d")
            guest.wait_for_timeout(250)
            check(
                "guest keyboard steers seat 1 on authoritative host",
                ship(host, 1)["x"] > guest_before + 3,
                state(host)["ships"],
            )
            check(
                "guest input leaves host ship independent",
                abs(ship(host, 0)["x"] - host_before) < 0.1,
                state(host)["ships"],
            )

            guest_before = ship(host, 1)["x"]
            before_shots = state(host)["shots"]
            guest.evaluate(
                "__networkPad.axes[0]=-1;__networkPad.buttons[0]={pressed:true,touched:true,value:1}"
            )
            guest.wait_for_timeout(250)
            host.evaluate("__game.step(30)")
            guest.evaluate(
                "__networkPad.axes[0]=0;__networkPad.buttons[0]={pressed:false,touched:false,value:0}"
            )
            guest.wait_for_timeout(250)
            check(
                "guest local controller at index 0 steers remote seat 1",
                ship(host, 1)["x"] < guest_before - 3,
                state(host)["ships"],
            )
            check(
                "guest controller fires through host physics",
                state(host)["shots"] > before_shots,
                state(host)["shots"],
            )
            check(
                "guest prompts follow controller input",
                state(guest)["lastInput"] == "pad",
            )

            guest_before = ship(host, 1)["x"]
            before_shots = state(host)["shots"]
            guest.mouse.move(1080, 500)
            guest.mouse.down()
            guest.wait_for_timeout(250)
            host.evaluate("__game.step(30)")
            guest.mouse.up()
            guest.wait_for_timeout(250)
            check(
                "guest pointer aim steers host ship",
                ship(host, 1)["x"] > guest_before + 3,
                state(host)["ships"],
            )
            check("guest pointer click fires", state(host)["shots"] > before_shots)

            guest_before = ship(host, 1)["x"]
            before_shots = state(host)["shots"]
            guest.dispatch_event(
                "canvas",
                "touchstart",
                {
                    "touches": [{"identifier": 1, "clientX": 500, "clientY": 500}],
                    "changedTouches": [
                        {"identifier": 1, "clientX": 500, "clientY": 500}
                    ],
                },
            )
            guest.dispatch_event(
                "canvas",
                "touchmove",
                {
                    "touches": [{"identifier": 1, "clientX": 380, "clientY": 500}],
                    "changedTouches": [
                        {"identifier": 1, "clientX": 380, "clientY": 500}
                    ],
                },
            )
            guest.wait_for_timeout(250)
            host.evaluate("__game.step(30)")
            guest.dispatch_event(
                "canvas",
                "touchend",
                {
                    "touches": [],
                    "changedTouches": [
                        {"identifier": 1, "clientX": 380, "clientY": 500}
                    ],
                },
            )
            guest.wait_for_timeout(250)
            check(
                "guest touch drag steers through the network",
                ship(host, 1)["x"] < guest_before - 3,
                state(host)["ships"],
            )
            check("guest touch contact autofires", state(host)["shots"] > before_shots)

            guest.keyboard.down("d")
            guest.wait_for_timeout(250)
            host.evaluate("__game.step(12)")
            guest.keyboard.press("Escape")
            guest.wait_for_timeout(300)
            paused_position = ship(host, 1)["x"]
            host.evaluate("__game.step(30)")
            check(
                "guest pause opens the same pause screen",
                state(guest)["mode"] == "paused" and state(guest)["screen"] == "pause",
            )
            check(
                "guest pause sends neutral movement while key stays held",
                abs(ship(host, 1)["x"] - paused_position) < 0.1,
                state(host)["ships"],
            )
            check(
                "guest pause leaves host world running",
                state(host)["mode"] == "playing",
            )
            guest.keyboard.up("d")
            guest.keyboard.press("Escape")
            guest.wait_for_timeout(250)
            check(
                "guest resumes round input",
                state(guest)["mode"] == "playing" and state(guest)["screen"] is None,
            )

            # Complete all six nights with real AI input and Rapier shots, using live balance tools.
            host.evaluate(
                "__game.tune({autoplay:true,invincible:true,damage:5,fireRate:4})"
            )
            seen_waves = set()
            for _ in range(90):
                host.evaluate("__game.step(600)")
                current = state(host)
                seen_waves.add(current["wave"])
                if current["mode"] in ("victory", "defeat"):
                    break
            campaign = state(host)
            result["campaign"] = {"wavesSeen": sorted(seen_waves), "host": campaign}
            check(
                "network host completes all six nights through real gameplay",
                campaign["mode"] == "victory" and campaign["wave"] >= 6,
                {
                    "mode": campaign["mode"],
                    "wave": campaign["wave"],
                    "elapsed": campaign["elapsed"],
                },
            )
            guest.wait_for_function(
                '__game.state().screen === "results" && !__game.state().network.active',
                timeout=10000,
            )
            final_guest = state(guest)
            result["campaign"]["guest"] = final_guest
            check(
                "guest receives victory result and disconnects cleanly",
                final_guest["mode"] == "victory"
                and final_guest["screen"] == "results"
                and not final_guest["network"]["active"],
                final_guest["network"],
            )
            check(
                "guest victory score matches authoritative host",
                final_guest["score"] == campaign["score"] and final_guest["score"] > 0,
                {"host": campaign["score"], "guest": final_guest["score"]},
            )
            check(
                "guest result screen shows the winning copy",
                "HELL OF A SHIFT" in guest.locator("#result-title").inner_text(),
            )

            host.locator('[data-screen="results"] [data-action="retry"]').click()
            check(
                "host can retry after online result without stale session",
                state(host)["mode"] == "playing"
                and len(state(host)["ships"]) == 1
                and not state(host)["network"]["active"],
                state(host)["network"],
            )
            host.keyboard.press("Escape")
            host.locator('[data-screen="pause"] [data-action="title"]').click()
            check(
                "host can return to title after online result",
                state(host)["mode"] == "title"
                and state(host)["screen"] == "title"
                and not state(host)["network"]["active"],
            )
            guest.locator('[data-screen="results"] [data-action="title"]').click()
            check(
                "guest can return to title after online result",
                state(guest)["mode"] == "title" and state(guest)["screen"] == "title",
            )
            check(
                "full game network session emitted no browser errors",
                not result["errors"],
                result["errors"],
            )
        except Exception as error:  # noqa: BLE001 — report any browser or assertion failure
            check(
                "full game network test completed without exception", False, str(error)
            )
            result["exception"] = traceback.format_exc()
        finally:
            context.close()
            browser.close()
    result["passed"] = sum(item["pass"] for item in result["checks"])
    result["failed"] = len(result["checks"]) - result["passed"]
    (DEV / "fullgame-network-test-results.json").write_text(
        json.dumps(result, indent=2)
    )
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback", action="store_true")
    arguments = parser.parse_args()
    result = run(arguments.fallback)
    for item in result["checks"]:
        if not item["pass"]:
            print(
                "FAIL: "
                + item["name"]
                + (": " + str(item["detail"]) if item.get("detail") is not None else "")
            )
    print(
        f"{len(result['checks'])} full-game network checks, {result['failed']} failures"
    )
    raise SystemExit(bool(result["failed"]))
