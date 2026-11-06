"""Actual two-page game co-op: remote controls, synchronized results and rematch."""

import re
import subprocess
from pathlib import Path
from urllib.parse import quote

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent


def run():
    count = 0
    failures = []

    def check(name, value):
        nonlocal count
        count += 1
        if not value:
            failures.append("Two-page co-op: " + name)

    process = subprocess.Popen(
        [
            "python3",
            "-u",
            "-m",
            "http.server",
            "0",
            "--bind",
            "127.0.0.1",
            "--directory",
            str(HERE.parent),
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    try:
        line = process.stdout.readline()
        match = re.search(r"port (\d+)", line)
        if not match:
            raise RuntimeError("Own server did not report its assigned port")
        url = (
            "http://127.0.0.1:"
            + match[1]
            + "/"
            + quote(HERE.name + ".html")
            + "?capture=webgl"
        )
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True, args=["--enable-unsafe-swiftshader"]
            )
            try:
                context = browser.new_context(
                    viewport={"width": 1280, "height": 800}, ignore_https_errors=True
                )
                host = context.new_page()
                host.goto(url)
                host.wait_for_function(
                    "window.__game?.view.renderedFrames>1", timeout=90000
                )
                check("server identity", "Boiler Buddies" in host.title())
                code = host.evaluate("__game.network.host()")
                guest = context.new_page()
                guest.goto(url)
                guest.wait_for_function(
                    "window.__game?.view.renderedFrames>1", timeout=90000
                )
                guest.evaluate("code=>__game.network.join(code)", code)
                for page in [host, guest]:
                    page.wait_for_function(
                        "__game.screen==='play' && __game.network.connected && __game.state.players.length===2",
                        timeout=20000,
                    )
                check(
                    "both copies begin the same co-op game",
                    host.evaluate("__game.network.isHost")
                    and not guest.evaluate("__game.network.isHost"),
                )
                host.evaluate("__game.sim.god=true")
                guest.evaluate(
                    "window.__heard=[];const play=__game.audio.play.bind(__game.audio);__game.audio.play=name=>{__heard.push(name);return play(name)}"
                )
                x = host.evaluate("__game.state.players[1].x")
                guest.keyboard.down("d")
                host.wait_for_function(
                    "__game.state.players[1].x>" + str(x + 0.7), timeout=25000
                )
                guest.keyboard.up("d")
                check(
                    "guest movement drives host Rapier body",
                    host.evaluate("__game.state.players[1].x") > x + 0.7,
                )
                guest.keyboard.press("Shift")
                host.wait_for_function("__game.state.pulseCharges===2", timeout=20000)
                guest.wait_for_function("__game.state.pulseCharges===2", timeout=20000)
                check(
                    "guest pulse reaches both copies",
                    guest.evaluate("__game.state.pulseCharges===2"),
                )
                check(
                    "host effects are audible on the guest",
                    guest.evaluate("__heard.includes('pow')"),
                )
                final_score = host.evaluate(
                    "__game.sim.score=5432;__game.sim.win();__game.sim.score"
                )
                for page in [host, guest]:
                    page.wait_for_function("__game.screen==='result'", timeout=20000)
                check(
                    "final host score reaches guest result",
                    guest.evaluate(
                        f"__game.state.score==={final_score} && __game.state.mode==='won'"
                    )
                    and str(final_score).zfill(6)
                    in guest.locator("#panel").inner_text(),
                )
                check(
                    "guest waits for host rematch",
                    guest.locator("[data-action=again]:visible").count() == 0,
                )
                host.click("[data-action=again]:visible")
                for page in [host, guest]:
                    page.wait_for_function(
                        "__game.screen==='play' && __game.state.phase===1 && __game.state.score===0",
                        timeout=20000,
                    )
                check(
                    "rematch resets both games without reconnecting",
                    host.evaluate("__game.network.connected")
                    and guest.evaluate("__game.network.connected"),
                )
                guest.evaluate("__game.network.close()")
                host.wait_for_function("!__game.network.connected", timeout=15000)
                check(
                    "departed buddy cannot consume team lives",
                    host.evaluate(
                        "__game.sim.players[1].alive===false && !__game.sim.players[1].rb.isEnabled()"
                    ),
                )
                host.evaluate("__game.network.close()")
                context.close()
            finally:
                browser.close()
    except Exception as error:  # noqa: BLE001 - report integration failures through one quiet runner
        failures.append("Two-page co-op runner: " + str(error))
    finally:
        process.terminate()
        process.wait(timeout=10)
    return count, failures


if __name__ == "__main__":
    passed, errors = run()
    for error in errors:
        print("FAIL: " + error)
    print(f"{passed} co-op checks, {len(errors)} failures")
    raise SystemExit(bool(errors))
