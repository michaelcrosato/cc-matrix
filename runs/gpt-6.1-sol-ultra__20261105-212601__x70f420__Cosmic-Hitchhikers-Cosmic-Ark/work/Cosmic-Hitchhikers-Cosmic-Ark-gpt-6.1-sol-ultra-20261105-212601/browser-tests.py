#!/usr/bin/env python3
"""Headless end-to-end checks; stdout contains only failures and one count."""

from __future__ import annotations

import argparse
import functools
import http.server
import json
import pathlib
import threading
import traceback
import urllib.parse

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

PROJECT = pathlib.Path(__file__).resolve().parent
ROOT = PROJECT.parent
DEFAULT_GAME = f"{PROJECT.name}.html"
COUNT = 0
FAILURES: list[str] = []


def check(name, passed, detail=""):
    global COUNT
    COUNT += 1
    if not passed:
        message = f"FAIL {name}: {str(detail)[:1500]}"
        FAILURES.append(message)
        print(message, flush=True)


def stage(name, action):
    try:
        action()
    except (
        PlaywrightError,
        OSError,
        ValueError,
        TypeError,
        KeyError,
        RuntimeError,
    ) as error:
        check(name, False, str(error).splitlines()[0])


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:
        pass


def ready(page):
    page.wait_for_function(
        "document.body.dataset.ready === 'true' && !!window.__COSMIC", timeout=90000
    )


def pad_set(page, axes=None, button=None, pressed=False):
    page.evaluate(
        """({axes,button,pressed}) => {
      const p = window.__testPad;
      if (axes) p.axes = axes;
      if (button !== null) p.buttons[button] = {pressed, touched:pressed, value:pressed ? 1 : 0};
      p.timestamp = performance.now();
    }""",
        {"axes": axes, "button": button, "pressed": pressed},
    )


def install_pad(context):
    context.add_init_script("""(() => {
      window.__testPad = { id:'DualSense Wireless Controller (standard test pad)', index:0,
        connected:true, mapping:'standard', timestamp:0, axes:[0,0,0,0],
        buttons:Array.from({length:17}, () => ({pressed:false,touched:false,value:0})),
        vibrationActuator:{ playEffect:() => Promise.resolve('complete') } };
      Object.defineProperty(navigator, 'getGamepads', {configurable:true, value:() => [window.__testPad]});
    })();""")


def desktop_checks(browser, url):
    context = browser.new_context(viewport={"width": 1600, "height": 900})
    install_pad(context)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        page.goto(url, wait_until="load")
        ready(page)
        check(
            "served page is Cosmic Hitchhikers",
            "Cosmic Hitchhikers" in page.title(),
            page.title(),
        )
        check(
            "WebGPU renderer initialized",
            page.evaluate(
                "!!__COSMIC.renderer && (__COSMIC.renderer.isWebGPURenderer || __COSMIC.renderer.constructor.name.includes('WebGPU'))"
            ),
        )
        check(
            "music defaults to ten percent",
            page.evaluate("__COSMIC.audio.musicVolume === 0.1"),
        )
        check("title has a visible launch control", page.locator("#start").is_visible())
        # The timeout is intentionally real time; attract mode is a kiosk feature.
        page.wait_for_function("__COSMIC.state.attract === true", timeout=14000)
        check(
            "attract replay starts after title inactivity",
            page.evaluate("__COSMIC.state.attract === true"),
        )
        page.wait_for_timeout(250)
        t = page.evaluate("__COSMIC.state.time")
        page.wait_for_timeout(300)
        check("attract AI advances gameplay", page.evaluate("__COSMIC.state.time") > t)
        page.mouse.move(22, 22)
        page.wait_for_timeout(150)
        check(
            "pointer movement exits attract replay", page.locator("#start").is_visible()
        )
        # Launch with the actual primary UI control, then aim/fire with the mouse.
        page.locator("#start").click()
        page.wait_for_timeout(150)
        shots = page.evaluate("__COSMIC.state.shots")
        page.mouse.move(1250, 280)
        page.mouse.down()
        page.wait_for_timeout(650)
        page.mouse.up()
        check(
            "mouse aim and hold fires ark cannons",
            page.evaluate("__COSMIC.state.shots") > shots,
        )
        # Exercise real movement handlers during the rescue phase.
        page.evaluate("__COSMIC.sim.setPhase('rescue')")
        x = page.evaluate("__COSMIC.state.ship.x")
        page.keyboard.down("d")
        page.wait_for_timeout(650)
        page.keyboard.up("d")
        check(
            "keyboard movement flies the shuttle",
            page.evaluate("__COSMIC.state.ship.x") > x + 0.15,
        )
        page.keyboard.down("Space")
        page.wait_for_timeout(120)
        check(
            "keyboard beam button engages tractor",
            page.evaluate("__COSMIC.state.beam === true"),
        )
        page.keyboard.up("Space")
        page.keyboard.press("Escape")
        page.wait_for_timeout(150)
        check("Escape opens pause menu", page.locator("#pauseResume").is_visible())
        t = page.evaluate("__COSMIC.state.time")
        page.wait_for_timeout(250)
        check(
            "pause freezes world simulation",
            abs(page.evaluate("__COSMIC.state.time") - t) < 0.001,
        )
        page.locator("#devButton").click()
        page.wait_for_timeout(100)
        sliders = page.locator("#overlay input[type=range]")
        check(
            "developer menu exposes live balance sliders",
            sliders.count() >= 5,
            f"{sliders.count()} sliders",
        )
        if sliders.count():
            first = sliders.first
            before = page.evaluate("JSON.stringify(__COSMIC.sim.params)")
            first.evaluate(
                "e => {e.value = Math.min(Number(e.max),Number(e.value)+Number(e.step||1)); e.dispatchEvent(new Event('input',{bubbles:true}));}"
            )
            check(
                "developer sliders update running parameters",
                page.evaluate("JSON.stringify(__COSMIC.sim.params)") != before,
            )
        # A reload gives settings and controller tests a clean title menu.
        page.reload(wait_until="load")
        ready(page)
        page.locator("#settingsButton").click()
        page.wait_for_timeout(100)
        check(
            "settings menu exposes volume and controller options",
            page.locator("#overlay input[type=range]").count() >= 1
            and page.locator("#overlay").inner_text().lower().find("xbox") >= 0,
        )
        page.reload(wait_until="load")
        ready(page)
        page.locator("#aboutButton").click()
        about = page.locator("#overlay").inner_text()
        check(
            "credits contain required provenance and feedback",
            all(
                phrase.lower() in about.lower()
                for phrase in [
                    "Source Information",
                    "Testing Feedback",
                    "Engine Feedback",
                    "Prompt Feedback",
                    "added on import",
                ]
            ),
        )
        page.evaluate("document.getElementById('menuPanel').scrollTop = 0")
        pad_set(page, button=13, pressed=True)
        page.wait_for_timeout(400)
        pad_set(page, button=13, pressed=False)
        check(
            "controller can scroll long credits",
            page.evaluate("document.getElementById('menuPanel').scrollTop > 0"),
        )
        page.reload(wait_until="load")
        ready(page)
        pad_set(page, button=0, pressed=True)
        page.wait_for_timeout(180)
        pad_set(page, button=0, pressed=False)
        page.wait_for_timeout(120)
        check(
            "standard gamepad launches from title",
            not page.locator("#start").is_visible(),
        )
        page.evaluate("__COSMIC.sim.setPhase('rescue')")
        x = page.evaluate("__COSMIC.state.ship.x")
        pad_set(page, axes=[1, 0, 0, 0])
        page.wait_for_timeout(600)
        pad_set(page, axes=[0, 0, 0, 0])
        check(
            "standard gamepad left stick flies shuttle",
            page.evaluate("__COSMIC.state.ship.x") > x + 0.15,
        )
        pad_set(page, button=0, pressed=True)
        page.wait_for_timeout(120)
        check(
            "standard gamepad Cross activates tractor",
            page.evaluate("__COSMIC.state.beam === true"),
        )
        pad_set(page, button=0, pressed=False)
        pad_set(page, button=9, pressed=True)
        page.wait_for_timeout(120)
        pad_set(page, button=9, pressed=False)
        check(
            "standard gamepad Options opens pause",
            page.locator("#pauseResume").is_visible(),
        )
        audio = page.evaluate("async () => await __COSMIC.renderAudioTest()")
        check(
            "procedural music effects and gibberish render finite audible PCM",
            audio.get("passed") is True,
            json.dumps(audio),
        )
        check(
            "procedural audio stays below clipping",
            audio.get("all", {}).get("peak", 2) < 1,
            json.dumps(audio.get("all")),
        )
        # Two genuine pages communicate through the browser BroadcastChannel.
        page.reload(wait_until="load")
        ready(page)
        guest = context.new_page()
        guest.goto(url, wait_until="load")
        ready(guest)
        page.evaluate("__COSMIC.start(); __COSMIC.net.hostRoom('BROWSERTEST')")
        guest.evaluate("__COSMIC.net.joinRoom('BROWSERTEST')")
        guest.wait_for_function("__COSMIC.net.info.me === 1", timeout=5000)
        check(
            "standalone local link assigns distinct seats",
            page.evaluate("__COSMIC.net.info.count === 2")
            and guest.evaluate("__COSMIC.net.info.me === 1"),
        )
        guest.wait_for_function("__COSMIC.mode === 'playing'", timeout=5000)
        guest.keyboard.press("x")
        voice_before = guest.evaluate("__COSMIC.audio.counts.voice")
        page.evaluate("__COSMIC.sim.state.score=7654; __COSMIC.sim.setPhase('rescue')")
        guest.wait_for_function(
            "__COSMIC.state.score === 7654 && __COSMIC.state.phase === 'rescue'",
            timeout=5000,
        )
        check(
            "standalone client renders authoritative game state",
            guest.evaluate("__COSMIC.state.score === 7654"),
        )
        page.wait_for_timeout(180)
        check(
            "remote phase changes synthesize crew gibberish",
            guest.evaluate("__COSMIC.audio.counts.voice") > voice_before,
        )
        x = page.evaluate("__COSMIC.state.ship.x")
        guest.keyboard.down("d")
        guest.wait_for_timeout(650)
        guest.keyboard.up("d")
        check(
            "remote crew input reaches authoritative simulation",
            page.evaluate("__COSMIC.state.ship.x") > x + 0.1,
        )
        page.evaluate("__COSMIC.sim.finish(true)")
        guest.wait_for_function("__COSMIC.mode === 'results'", timeout=5000)
        check(
            "shared victory reaches guest results",
            guest.evaluate("__COSMIC.state.phase === 'win'"),
        )
        page.evaluate("__COSMIC.start()")
        guest.wait_for_function(
            "__COSMIC.mode === 'playing' && __COSMIC.state.phase === 'defense'",
            timeout=5000,
        )
        check(
            "host replay clears guest results overlay",
            guest.locator("#overlay").is_hidden(),
        )
        page.evaluate("__COSMIC.net.leave()")
        guest.wait_for_function(
            "__COSMIC.mode === 'title' && __COSMIC.net.info.role === 'solo'",
            timeout=5000,
        )
        check(
            "standalone host departure restores usable guest title",
            guest.locator("#start").is_visible(),
        )
        guest.locator("#start").click()
        check(
            "former guest can start a solo mission",
            guest.evaluate("__COSMIC.mode === 'playing'"),
        )
        page.evaluate("__COSMIC.net.hostRoom('BROWSERTEST2')")
        guest.evaluate("__COSMIC.net.joinRoom('BROWSERTEST2')")
        guest.wait_for_function("__COSMIC.net.info.me === 1", timeout=5000)
        guest.close()
        page.wait_for_timeout(250)
        check(
            "leaving local crew repairs host roster",
            page.evaluate("__COSMIC.net.info.count === 1"),
        )
        check("desktop runtime has no uncaught errors", not errors, "; ".join(errors))
    finally:
        context.close()


def touch_checks(browser, url, devices):
    profile = dict(devices["Pixel 5"])
    profile["viewport"] = {"width": 915, "height": 412}
    context = browser.new_context(**profile)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        page.goto(url, wait_until="load")
        ready(page)
        page.locator("#start").tap()
        page.wait_for_timeout(150)
        check(
            "touch launch starts the mission", not page.locator("#start").is_visible()
        )
        page.evaluate("__COSMIC.sim.setPhase('rescue')")
        # Real touch events via Chromium's input dispatcher, including two contacts.
        session = context.new_cdp_session(page)
        x = page.evaluate("__COSMIC.state.ship.x")
        session.send(
            "Input.dispatchTouchEvent",
            {"type": "touchStart", "touchPoints": [{"x": 140, "y": 275, "id": 1}]},
        )
        session.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchMove",
                "touchPoints": [{"x": 220, "y": 275, "id": 1}],
            },
        )
        session.send(
            "Input.dispatchTouchEvent",
            {
                "type": "touchStart",
                "touchPoints": [
                    {"x": 220, "y": 275, "id": 1},
                    {"x": 760, "y": 275, "id": 2},
                ],
            },
        )
        page.wait_for_timeout(650)
        moved = page.evaluate("__COSMIC.state.ship.x")
        session.send(
            "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
        )
        check(
            "touch drag flies shuttle with invisible stick",
            moved > x + 0.1,
            f"ship moved {moved - x}",
        )
        page.locator("#touchPause").tap()
        page.wait_for_timeout(100)
        check(
            "touch menu button opens pause", page.locator("#pauseResume").is_visible()
        )
        check(
            "touch layout stays within viewport",
            page.evaluate(
                "document.documentElement.scrollWidth <= innerWidth + 2 && document.documentElement.scrollHeight <= innerHeight + 2"
            ),
        )
        check("touch runtime has no uncaught errors", not errors, "; ".join(errors))
    finally:
        context.close()


def file_checks(browser, game):
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        page.goto((ROOT / game).as_uri(), wait_until="load")
        ready(page)
        check(
            "single HTML launches directly from file URL",
            "Cosmic Hitchhikers" in page.title()
            and page.evaluate("__COSMIC.net.info.role === 'solo'"),
        )
        page.locator("#start").click()
        page.keyboard.down("ArrowUp")
        page.wait_for_timeout(300)
        page.keyboard.up("ArrowUp")
        check(
            "file URL gameplay accepts keyboard input",
            page.evaluate("__COSMIC.state.shots > 0"),
        )
        check("file URL runtime has no uncaught errors", not errors, "; ".join(errors))
    finally:
        context.close()


def hub_checks(browser, base, game):
    for players, scenario, network in [
        (2, "standard", False),
        (4, "standard", True),
        (4, "host-leave", True),
        (2, "server", False),
    ]:
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        query = {
            "game": "/" + game,
            "players": str(players),
            "scenario": scenario,
            "auto": "1",
            "limit": "10",
            "play": "2400",
        }
        if network:
            query.update(latency="150", jitter="50", loss="5")
        url = f"{base}/{PROJECT.name}/hub-harness.html?{urllib.parse.urlencode(query)}"
        try:
            page.goto(url, wait_until="load")
            page.wait_for_function(
                "document.body.dataset.complete === 'true'", timeout=100000
            )
            report = page.evaluate("window.__hubCheck")
            for item in report.get("checks", []):
                check(
                    f"AI Hub {players}p {scenario}: {item['name']}",
                    item["pass"],
                    item.get("detail", ""),
                )
            check(
                f"AI Hub {players}p {scenario}: entire conformance suite",
                report.get("pass") is True,
            )
        except (
            PlaywrightError,
            OSError,
            ValueError,
            TypeError,
            KeyError,
            RuntimeError,
        ) as error:
            try:
                details = page.evaluate("JSON.stringify(window.__hubCheck || {})")
            except (
                PlaywrightError,
                OSError,
                ValueError,
                TypeError,
                KeyError,
                RuntimeError,
            ):
                details = "no harness report"
            check(
                f"AI Hub {players}p {scenario}",
                False,
                f"{str(error).splitlines()[0]}; {details}",
            )
        finally:
            context.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--game", default=DEFAULT_GAME)
    parser.add_argument("--skip-hub", action="store_true")
    parser.add_argument("--only-hub", action="store_true")
    args = parser.parse_args()
    # Only these upstream files are copied. No other agent's files are read.
    for name in ["bridge.js", "round.js"]:
        (PROJECT / name).write_bytes((PROJECT / ("hub-" + name)).read_bytes())
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    base = f"http://127.0.0.1:{server.server_port}"
    url = f"{base}/{urllib.parse.quote(args.game)}"
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                    "--disable-dev-shm-usage",
                ],
            )
            try:
                if not args.only_hub:
                    stage(
                        "desktop browser scenario", lambda: desktop_checks(browser, url)
                    )
                    stage(
                        "touch browser scenario",
                        lambda: touch_checks(browser, url, playwright.devices),
                    )
                    stage(
                        "file URL browser scenario",
                        lambda: file_checks(browser, args.game),
                    )
                if not args.skip_hub:
                    hub_checks(browser, base, args.game)
            finally:
                browser.close()
    except (PlaywrightError, OSError, ValueError, TypeError, KeyError, RuntimeError):
        check("browser test infrastructure", False, traceback.format_exc())
    finally:
        server.shutdown()
        server.server_close()
    print(f"{COUNT} browser checks, {len(FAILURES)} failed", flush=True)
    return 1 if FAILURES else 0


if __name__ == "__main__":
    raise SystemExit(main())
