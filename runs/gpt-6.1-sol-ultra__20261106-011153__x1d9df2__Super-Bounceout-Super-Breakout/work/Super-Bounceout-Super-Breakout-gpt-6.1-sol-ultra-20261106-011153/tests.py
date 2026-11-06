#!/usr/bin/env python3
"""Headless state, input, audio and end-to-end checks. Prints failures + count only."""

from __future__ import annotations

import functools
import http.server
import importlib.util
import math
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SLUG = Path(__file__).resolve().parent.name
HTML = ROOT / f"{SLUG}.html"
FAILURES: list[str] = []
COUNT = 0


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def check(name, fn):
    global COUNT
    COUNT += 1
    try:
        fn()
    except Exception as exc:  # noqa: BLE001 — collect independent test failures
        message = str(exc).split("Call log:")[0].strip()
        FAILURES.append(f"FAIL {name}: {message}")


def state(page):
    return page.evaluate("__BOUNCEOUT__.state()")


def action(page, expression):
    return page.evaluate(f"() => {{ {expression} }}")


def boot(page, url):
    page.goto(url, wait_until="load", timeout=120000)
    page.wait_for_function("window.__BOUNCEOUT__?.ready === true", timeout=120000)
    require("Super Bounceout" in page.title(), "server did not return Super Bounceout")


def run():
    require(HTML.exists(), f"missing packaged HTML: {HTML.name}")
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_port}/{HTML.name}"
    errors: list[str] = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                    "--no-sandbox",
                ],
            )
            context = browser.new_context(viewport={"width": 1920, "height": 1080})
            page = context.new_page()
            page.on("pageerror", lambda error: errors.append(str(error)))
            boot(page, url)

            def initial():
                s = state(page)
                require(s["phase"] in ("title", "menu"), f"initial phase: {s['phase']}")
                require(
                    "webgpu" in str(s.get("renderer", "")).lower(),
                    f"WebGPU backend not active: {s.get('renderer')}",
                )
                require(
                    "0.19.3" in str(s.get("physics", "")),
                    f"unexpected physics version: {s.get('physics')}",
                )
                require(page.locator("canvas").count() >= 1, "no renderer canvas")

            check("initialization and exact engines", initial)

            def start_and_physics():
                action(
                    page,
                    "__BOUNCEOUT__.start('solo'); __BOUNCEOUT__.setAuto(true); __BOUNCEOUT__.launch();",
                )
                before = state(page)
                action(page, "__BOUNCEOUT__.step(12);")
                after = state(page)
                require(
                    after["score"] > before["score"],
                    f"ball did not break bricks in 12s: {after}",
                )
                require(
                    after["remaining"] < before["remaining"],
                    "no physical brick destruction",
                )
                require(after["lives"] > 0, "autoplay immediately lost all lives")
                require(after["balls"], "no active balls")

            check("natural Rapier collisions and scoring", start_and_physics)

            def pause_resume():
                action(page, "__BOUNCEOUT__.pause();")
                require(state(page)["phase"] == "paused", "pause did not open")
                before = state(page)
                action(page, "__BOUNCEOUT__.step(2);")
                after = state(page)
                require(
                    before["score"] == after["score"], "simulation changed during pause"
                )
                require(
                    before.get("ballState") == after.get("ballState"),
                    "ball positions changed during pause",
                )
                action(page, "__BOUNCEOUT__.resume();")
                require(state(page)["phase"] in ("playing", "stage"), "resume failed")

            check("pause freezes simulation", pause_resume)

            def developer():
                action(page, "__BOUNCEOUT__.pause();")
                page.get_by_role("button", name="Developer tools", exact=True).click()
                speed = page.locator("#dev-speed")
                require(speed.is_visible(), "developer speed slider is inaccessible")
                before = state(page)["config"]["speed"]
                speed.focus()
                speed.press("ArrowRight")
                require(
                    state(page)["config"]["speed"] > before,
                    "keyboard did not adjust live speed slider",
                )
                page.get_by_role("button", name="Reset defaults", exact=True).click()
                config = state(page)["config"]
                require(
                    config["speed"] == 11
                    and config["paddleWidth"] == 3.1
                    and config["chargeRate"] == 1,
                    "developer reset did not restore defaults",
                )
                action(
                    page,
                    "__BOUNCEOUT__.resume(); __BOUNCEOUT__.dev({speed:9,paddleWidth:4,chargeRate:2,god:true,auto:true}); __BOUNCEOUT__.step(2);",
                )
                require(state(page)["lives"] > 0, "live developer variables broke game")
                action(
                    page,
                    "__BOUNCEOUT__.dev({speed:11,paddleWidth:3.1,chargeRate:1,god:false,auto:false});",
                )

            check("pause developer sliders and reset defaults", developer)

            def powers():
                action(
                    page,
                    "__BOUNCEOUT__.start('solo'); __BOUNCEOUT__.setAuto(true); __BOUNCEOUT__.launch(); __BOUNCEOUT__.spawnPower('multi'); __BOUNCEOUT__.step(.6);",
                )
                s = state(page)
                require(s["lives"] > 0, "powerup broke state")
                ball_count = (
                    s["balls"] if isinstance(s["balls"], int) else len(s["balls"])
                )
                require(ball_count >= 3, f"multiball was not collected: {s}")
                action(
                    page,
                    "__BOUNCEOUT__.spawnPower('wide'); __BOUNCEOUT__.spawnPower('slow'); __BOUNCEOUT__.step(2);",
                )
                require(
                    state(page)["phase"] in ("playing", "stage", "clear"),
                    "powerup caused invalid phase",
                )
                require(
                    state(page).get("stats", {}).get("powers", 0) >= 3,
                    "wide and slow pickups were not collected",
                )

            check("powerup system", powers)

            def settings():
                action(
                    page,
                    "__BOUNCEOUT__.setSetting('music', .27); __BOUNCEOUT__.setSetting('glyphs', 'xbox');",
                )
                require(
                    math.isclose(state(page)["settings"]["music"], 0.27, abs_tol=0.002),
                    "music slider state failed",
                )
                require(
                    state(page)["settings"]["glyphs"] == "xbox",
                    "glyph setting state failed",
                )
                page.reload(wait_until="load")
                page.wait_for_function(
                    "window.__BOUNCEOUT__?.ready === true", timeout=120000
                )
                require(
                    math.isclose(state(page)["settings"]["music"], 0.27, abs_tol=0.002),
                    "music setting did not persist",
                )
                require(
                    state(page)["settings"]["glyphs"] == "xbox",
                    "controller glyph setting did not persist",
                )
                action(
                    page,
                    "__BOUNCEOUT__.setSetting('music', .1); __BOUNCEOUT__.setSetting('glyphs', 'ps');",
                )

            check("settings and controller glyph persistence", settings)

            def life_cycle():
                action(page, "__BOUNCEOUT__.start('solo');")
                before = state(page)["lives"]
                action(page, "__BOUNCEOUT__.loseBall();")
                require(
                    state(page)["lives"] == before - 1,
                    "losing a ball did not consume a life",
                )
                for _ in range(8):
                    if state(page)["phase"] == "gameover":
                        break
                    action(page, "__BOUNCEOUT__.loseBall();")
                require(
                    state(page)["phase"] == "gameover",
                    "life depletion did not reach game over",
                )
                action(page, "__BOUNCEOUT__.start('solo');")
                require(
                    state(page)["lives"] > 0 and state(page)["score"] == 0,
                    "restart failed",
                )

            check("life loss, game over and restart", life_cycle)

            def full_playthrough():
                action(
                    page,
                    "__BOUNCEOUT__.start('solo'); __BOUNCEOUT__.setAuto(true); __BOUNCEOUT__.dev({god:true}); __BOUNCEOUT__.launch();",
                )
                seen = set()
                for _ in range(180):
                    s = state(page)
                    seen.add(s["stage"])
                    if s["phase"] == "victory":
                        break
                    if s["phase"] in ("clear", "stage"):
                        action(page, "__BOUNCEOUT__.launch();")
                    action(page, "__BOUNCEOUT__.step(20);")
                s = state(page)
                require(
                    s["phase"] == "victory",
                    f"autoplay did not complete campaign after 3600 simulated seconds: {s}",
                )
                require(len(seen) >= 4, f"not all stages visited: {sorted(seen)}")
                require(s["score"] > 0, "campaign completed with no score")

            check("scripted full campaign", full_playthrough)

            def local_coop():
                action(
                    page,
                    "__BOUNCEOUT__.start('coop'); __BOUNCEOUT__.setAuto(true); __BOUNCEOUT__.launch(); __BOUNCEOUT__.step(10);",
                )
                s = state(page)
                require(s["lives"] > 0 and s["score"] > 0, f"co-op could not play: {s}")
                if "paddles" in s:
                    require(len(s["paddles"]) >= 2, "co-op missing second paddle")

            check("local cooperative play", local_coop)

            def controller():
                page.add_init_script(
                    """window.__testPad={id:'DualSense test',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))}; navigator.getGamepads=()=>[window.__testPad];"""
                )
                page.reload(wait_until="load")
                page.wait_for_function(
                    "window.__BOUNCEOUT__?.ready === true", timeout=120000
                )
                page.evaluate(
                    "__testPad.buttons[0]={pressed:true,touched:true,value:1}"
                )
                page.wait_for_timeout(200)
                page.evaluate(
                    "__testPad.buttons[0]={pressed:false,touched:false,value:0}"
                )
                require(
                    state(page)["phase"] in ("playing", "stage"),
                    "controller confirm did not start game",
                )
                page.evaluate("__testPad.axes[0]=.9")
                page.wait_for_timeout(300)
                page.evaluate(
                    "__testPad.axes[0]=0; __testPad.buttons[9]={pressed:true,value:1}"
                )
                page.wait_for_timeout(200)
                page.evaluate("__testPad.buttons[9]={pressed:false,value:0}")
                require(
                    state(page)["phase"] == "paused", "controller Options did not pause"
                )

            check("standard gamepad menu and pause", controller)

            def keyboard():
                action(
                    page, "__BOUNCEOUT__.start('solo'); __BOUNCEOUT__.setAuto(false);"
                )
                page.keyboard.press("Space")
                page.wait_for_timeout(100)
                require(state(page)["balls"], "Space did not launch")
                page.keyboard.press("Escape")
                require(state(page)["phase"] == "paused", "Escape did not pause")
                page.keyboard.press("Escape")
                require(
                    state(page)["phase"] in ("playing", "stage"),
                    "Escape did not resume",
                )

            check("keyboard launch and pause", keyboard)

            def audio():
                page.mouse.click(100, 100)
                metrics = page.evaluate("__BOUNCEOUT__.audio?.() ?? null")
                require(metrics is not None, "audio metrics unavailable")
                require(
                    str(metrics.get("state", metrics.get("contextState", "")))
                    == "running",
                    f"audio context did not unlock: {metrics}",
                )
                level = metrics.get("musicVolume", metrics.get("music", 0.10))
                require(
                    math.isclose(float(level), 0.1, abs_tol=0.002),
                    f"default music is not 10%: {metrics}",
                )

            check("coded audio unlock and default music volume", audio)

            def rendered_audio():
                rendered = page.evaluate("__BOUNCEOUT__.audioTest()")
                require(
                    math.isfinite(rendered["peak"]) and 0.001 < rendered["peak"] < 1,
                    f"invalid synthesized audio peak: {rendered}",
                )
                require(
                    math.isfinite(rendered["rms"]) and rendered["rms"] > 0.0001,
                    f"silent synthesized audio: {rendered}",
                )
                require(
                    rendered["metrics"]["syllablesPlayed"] > 0,
                    "gibberish voice produced no syllables",
                )

            check(
                "offline music effects and voice render nonzero finite audio",
                rendered_audio,
            )

            def attract():
                page.reload(wait_until="load")
                page.wait_for_function(
                    "window.__BOUNCEOUT__?.ready === true", timeout=120000
                )
                action(page, "__BOUNCEOUT__.idle(11);")
                page.wait_for_timeout(250)
                require(
                    state(page)["phase"] == "attract",
                    "idle title did not enter attract demo",
                )
                action(page, "__BOUNCEOUT__.step(12);")
                require(state(page)["score"] > 0, "attract AI does not play")
                page.keyboard.press("Shift")
                page.wait_for_timeout(100)
                require(
                    state(page)["phase"] in ("title", "menu"),
                    "input did not exit attract mode",
                )

            check("10-second attract mode plays and exits", attract)

            def about():
                page.get_by_role("button", name="About & credits", exact=True).click()
                html = page.content().lower()
                require(
                    "source information" in html, "credits missing source information"
                )
                require("added on import" in html, "credits missing usage field")
                require("super breakout" in html, "credits missing source attribution")
                for tab, required in (
                    ("Testing", ["Issues caught", "Most helpful test"]),
                    ("Engine", ["Engine changes", "One wish"]),
                    ("Prompt", ["Confusing", "One change"]),
                ):
                    page.get_by_role("button", name=tab, exact=True).click()
                    html = page.content()
                    for label in required:
                        require(label in html, f"{tab} feedback missing {label}")

            check("required in-game source and feedback credits", about)

            check(
                "no uncaught browser errors",
                lambda: require(not errors, " | ".join(errors[:5])),
            )

            def online_gameplay():
                guest = context.new_page()
                try:
                    boot(guest, url)
                    code = page.evaluate("__BOUNCEOUT__.online.host()")
                    require(
                        len(code) == 6, "host did not produce a six-character room code"
                    )
                    require(
                        guest.evaluate("code => __BOUNCEOUT__.online.join(code)", code),
                        "guest rejected valid room",
                    )
                    page.wait_for_function(
                        "__BOUNCEOUT__.online.connected", timeout=15000
                    )
                    guest.wait_for_function(
                        "__BOUNCEOUT__.online.connected", timeout=15000
                    )
                    require(
                        page.evaluate("__BOUNCEOUT__.online.role") == "host",
                        "wrong host role",
                    )
                    require(
                        guest.evaluate("__BOUNCEOUT__.online.role") == "guest",
                        "wrong guest role",
                    )
                    action(
                        guest,
                        "__BOUNCEOUT__.online.sendInput({x:0}); __BOUNCEOUT__.launch();",
                    )
                    page.wait_for_function(
                        "__BOUNCEOUT__.state().ballState.some(b => !b.docked)",
                        timeout=10000,
                    )
                    action(page, "__BOUNCEOUT__.setAuto(true); __BOUNCEOUT__.step(8);")
                    guest.wait_for_function(
                        "__BOUNCEOUT__.state().score > 0", timeout=15000
                    )
                    page.wait_for_timeout(200)
                    host_state, guest_state = state(page), state(guest)
                    require(
                        guest_state["score"] > 0, "host gameplay did not reach guest"
                    )
                    require(
                        abs(host_state["score"] - guest_state["score"]) < 300,
                        "guest score diverged from host",
                    )
                    require(
                        abs(host_state["remaining"] - guest_state["remaining"]) <= 2,
                        "guest brick state diverged",
                    )
                    require(
                        len(host_state.get("paddles", [])) == 2,
                        "online game missing cooperative paddles",
                    )
                    action(
                        page,
                        "__BOUNCEOUT__.setAuto(false); __BOUNCEOUT__.start('online');",
                    )
                    guest.wait_for_function(
                        "__BOUNCEOUT__.state().score === 0", timeout=10000
                    )
                    require(
                        state(guest)["remaining"] == state(page)["remaining"],
                        "guest bricks did not reset on host replay",
                    )
                    before_x = state(page)["paddles"][1]["x"]
                    direction = "ArrowRight" if before_x < 0 else "ArrowLeft"
                    guest.keyboard.down(direction)
                    guest.wait_for_timeout(500)
                    guest.keyboard.up(direction)
                    after_x = state(page)["paddles"][1]["x"]
                    require(
                        abs(after_x - before_x) > 0.5,
                        "guest keyboard did not move host's second paddle",
                    )
                    guest.evaluate("__BOUNCEOUT__.online.leave()")
                    page.wait_for_timeout(200)
                    require(
                        not page.evaluate("__BOUNCEOUT__.online.connected"),
                        "host did not detect guest departure",
                    )
                    require(
                        state(page)["phase"] != "gameover",
                        "partner departure killed host game",
                    )
                    page.evaluate("__BOUNCEOUT__.online.leave()")
                finally:
                    guest.close()

            check("two-page online co-op replication and departure", online_gameplay)

            def lobby_attract_preserves_room():
                action(page, "__BOUNCEOUT__.showTitle();")
                page.locator('button[data-action="online"]').click()
                page.get_by_role("button", name="Host a room").click()
                page.wait_for_function(
                    "__BOUNCEOUT__.online.roomCode.length === 6", timeout=10000
                )
                code = page.evaluate("__BOUNCEOUT__.online.roomCode")
                action(page, "__BOUNCEOUT__.idle(11);")
                page.wait_for_function(
                    "__BOUNCEOUT__.state().phase === 'attract'", timeout=10000
                )
                page.keyboard.press("Shift")
                page.wait_for_function(
                    "__BOUNCEOUT__.state().phase === 'title'", timeout=10000
                )
                require(
                    page.evaluate("__BOUNCEOUT__.online.role") == "host",
                    "exiting attract destroyed waiting host role",
                )
                require(
                    page.evaluate("__BOUNCEOUT__.online.roomCode") == code,
                    "exiting attract changed host room code",
                )
                require(
                    page.locator("#roomDisplay").is_visible()
                    and code in page.locator("#roomDisplay").inner_text(),
                    "attract exit did not restore online room lobby",
                )
                page.evaluate("__BOUNCEOUT__.online.leave()")

            check(
                "waiting online lobby survives attract mode",
                lobby_attract_preserves_room,
            )

            def file_boot():
                local = context.new_page()
                local.route("https://**", lambda route: route.abort())
                local.route("http://**", lambda route: route.abort())
                try:
                    boot(local, HTML.as_uri())
                    require(
                        "webgpu" in state(local)["renderer"].lower(),
                        "file:// did not initialize WebGPU",
                    )
                    action(
                        local,
                        "__BOUNCEOUT__.start('solo'); __BOUNCEOUT__.setAuto(true); __BOUNCEOUT__.launch(); __BOUNCEOUT__.step(5);",
                    )
                    require(
                        state(local)["score"] > 0,
                        "delivered file:// game could not play",
                    )
                finally:
                    local.close()

            check("self-contained file delivery boots and plays offline", file_boot)
            context.close()

            mobile = browser.new_context(
                viewport={"width": 390, "height": 844},
                is_mobile=True,
                has_touch=True,
                device_scale_factor=1,
            )
            mp = mobile.new_page()
            mobile_errors = []
            mp.on("pageerror", lambda err: mobile_errors.append(str(err)))
            boot(mp, url)

            def mobile_flow():
                require(
                    mp.evaluate(
                        "document.documentElement.scrollWidth <= innerWidth + 1"
                    ),
                    "mobile page overflows horizontally",
                )
                action(mp, "__BOUNCEOUT__.start('solo');")
                mp.touchscreen.tap(190, 650)
                mp.wait_for_timeout(300)
                require(state(mp)["balls"], "touch did not launch")
                require(not mobile_errors, " | ".join(mobile_errors[:3]))

            check("touch viewport and launch", mobile_flow)
            mobile.close()
            spec = importlib.util.spec_from_file_location(
                "hub_test", Path(__file__).with_name("hub-test.py")
            )
            hub_tests = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(hub_tests)
            hub_tests.run_hub_checks(browser, url, check, require)
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    return 1 if FAILURES else 0


if __name__ == "__main__":
    try:
        code = run()
    except Exception as exc:  # noqa: BLE001 — collect independent test failures
        FAILURES.append(f"FAIL harness: {exc}")
        code = 1
    for failure in FAILURES:
        print(failure)
    print(f"{COUNT} checks; {len(FAILURES)} failures")
    raise SystemExit(code)
