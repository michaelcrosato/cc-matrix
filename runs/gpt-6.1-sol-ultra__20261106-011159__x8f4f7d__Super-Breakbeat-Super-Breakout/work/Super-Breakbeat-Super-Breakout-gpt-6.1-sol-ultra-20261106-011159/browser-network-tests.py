"""Production artifact multiplayer and official AI Hub conformance tests.

Run with ~/.local/share/pipx/venvs/playwright/bin/python browser-network-tests.py
Only failures and a final count are printed. No screenshot checks are used.
"""
import contextlib
import http.server
import json
from pathlib import Path
import sys
import threading
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SLUG = Path(__file__).resolve().parent.name
GAME = SLUG + ".html"
CHECKS = 0
FAILURES = []
ARTIFACTS = {}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def check(condition, message):
    global CHECKS
    CHECKS += 1
    if not condition:
        FAILURES.append(message)
        print("FAIL " + message, flush=True)


def ready(page, url):
    page.goto(url)
    page.wait_for_function("window.__game", timeout=45000)


def run():
    with contextlib.chdir(ROOT):
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Quiet)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = f"http://127.0.0.1:{server.server_port}"
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True, args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"])
                context = browser.new_context(viewport={"width": 1280, "height": 800})
                context.add_init_script("Object.defineProperty(navigator,'gpu',{get:()=>undefined,configurable:true})")
                errors = []
                context.on("page", lambda page: page.on("pageerror", lambda error: errors.append(str(error))))
                host, guest = context.new_page(), context.new_page()
                try:
                    for page in (host, guest):
                        ready(page, base + "/" + GAME)
                    check(host.title() == "Super Breakbeat", "production page identity is Super Breakbeat")
                    check(host.evaluate("__game.screen==='title' && __game.scene.backend==='WebGL2 fallback'"), "production boot and software renderer fallback")
                    host.locator('[data-action="multiplayer"]').click()
                    host.locator('[data-action="hostroom"]').click()
                    room = host.evaluate("__game.network.room")
                    guest.locator('[data-action="multiplayer"]').click()
                    guest.locator("#roomcode").fill(room)
                    guest.locator('[data-action="joinroom"]').click()
                    guest.wait_for_function("__game.network.connected")
                    host.wait_for_function("__game.network.connected")
                    check(len(room) == 6, "actual UI room handshake")
                    host.locator('[data-action="onlineStart"]').click()
                    guest.wait_for_function("__game.screen==='game' && __game.snapshot.stage===0 && __game.snapshot.upper")
                    check(guest.evaluate("__game.network.role==='guest' && __game.snapshot.upper"), "co-op launches twin paddles on both pages")
                    # Keep menu focus out of the field; actual browser keyboard input drives pilot 2.
                    field = guest.locator("#field")
                    bounds = field.bounding_box()
                    field.hover(position={"x": bounds["width"] / 2, "y": bounds["height"] / 2})
                    host.wait_for_function("Math.abs(__game.snapshot.paddles[1])<0.5", timeout=10000)
                    guest.keyboard.down("ArrowRight")
                    try:
                        host.wait_for_function("__game.snapshot.paddles[1]>0.8", timeout=10000)
                    finally:
                        guest.keyboard.up("ArrowRight")
                    position = host.evaluate("__game.snapshot.paddles[1]")
                    check(position > 0.8, f"guest keyboard controls upper paddle (x={position})")
                    # Mouse support is a separate input route and snapshot traffic is authoritative.
                    guest.locator("#field").hover(position={"x": 260, "y": 340})
                    guest.keyboard.press("Space")
                    host.wait_for_function("__game.snapshot.state==='playing'", timeout=5000)
                    guest.wait_for_function("__game.snapshot.balls.length>0", timeout=5000)
                    before = guest.evaluate("__game.snapshot.balls[0].y")
                    guest.wait_for_timeout(500)
                    after = guest.evaluate("__game.snapshot.balls[0].y")
                    check(abs(after - before) > 0.05, "host physics snapshots update guest ball position")
                    check(host.evaluate("__game.network.received>0") and guest.evaluate("__game.network.received>0"), "production traffic flows both directions")
                    brick_sounds = guest.evaluate("__game.audio.diagnostics().played.brick||0")
                    host.evaluate("__game.core.killBrick(__game.core.bricks.find(b=>b.alive))")
                    guest.wait_for_function("before=>(__game.audio.diagnostics().played.brick||0)>before && __game.scene.effects.length>0", arg=brick_sounds, timeout=10000)
                    check(guest.evaluate("__game.scene.effects.length>0"), "guest receives brick sound and impact particles")
                    # Public dev core completes the fourth transmission, exercising real result events.
                    host.evaluate("__game.core.score=4321;__game.core.stage=3;__game.core.stats.completed=3;__game.core.advance()")
                    host.wait_for_selector('[data-action="restart"]')
                    guest.wait_for_selector('[data-action="title"]')
                    check(guest.evaluate("__game.snapshot.score===4321 && __game.snapshot.state==='won'"), "final world and team result reach guest")
                    check(guest.evaluate("__game.snapshot.stats.completed===4"), "victory snapshot includes four completed transmissions")
                    host.locator('[data-action="restart"]').click()
                    guest.wait_for_function("__game.snapshot.stage===0 && __game.snapshot.score===0 && !__game.network.ended")
                    check(guest.evaluate("__game.screen==='game' && __game.snapshot.state==='serve'"), "linked run restarts after results")
                    host.evaluate("__game.core.stage=3;__game.core.stats.completed=3;__game.core.advance()")
                    host.wait_for_selector('[data-action="endless"]')
                    guest.wait_for_function("__game.snapshot.state==='won'")
                    host.locator('[data-action="endless"]').click()
                    guest.wait_for_function("__game.snapshot.stage===0 && !__game.network.ended && __game.snapshot.state==='serve'")
                    check(host.evaluate("__game.core.endless") and guest.evaluate("__game.network.started"), "linked endless encore restarts both pilots")
                    ARTIFACTS["standalone"] = {"host": host.evaluate("__game.diagnostics()"), "guest": guest.evaluate("__game.diagnostics()")}
                except Exception as error:
                    check(False, "standalone production test: " + str(error).split("Call log:")[0].strip())
                finally:
                    host.close()
                    guest.close()

                scenarios = [] if "--standalone-only" in sys.argv else [("standard", {}), ("host-leave", {}), ("server", {}), ("standard-loss", {"latency": 150, "jitter": 50, "loss": 5})]
                for label, extra in scenarios:
                    page = context.new_page()
                    try:
                        query = {"game": "../../../" + GAME, "players": 2, "auto": 1, "limit": 12, "scenario": "standard" if label == "standard-loss" else label, **extra}
                        page.goto(base + "/" + SLUG + "/vendor/hub/harness.html?" + urlencode(query))
                        page.wait_for_function("window.__hubCheck?.done", timeout=75000)
                        report = page.evaluate("window.__hubCheck")
                        ARTIFACTS[label] = report
                        bad = [entry for entry in report["checks"] if not entry["pass"]]
                        check(report["pass"], "production official Hub harness " + label + ": " + json.dumps(bad))
                    except Exception as error:
                        check(False, "production official Hub harness " + label + ": " + str(error).split("Call log:")[0].strip())
                    finally:
                        page.close()
                check(not errors, "no uncaught production JavaScript errors: " + "; ".join(errors[:5]))
                browser.close()
        finally:
            server.shutdown()
            server.server_close()


try:
    run()
except Exception as error:
    check(False, "network test infrastructure: " + str(error))
ARTIFACTS["summary"] = {"checks": CHECKS, "failures": FAILURES}
(Path(__file__).resolve().parent / ("browser-network-standalone-results.json" if "--standalone-only" in sys.argv else "browser-network-results.json")).write_text(json.dumps(ARTIFACTS, indent=2))
print(f"{CHECKS} checks, {len(FAILURES)} failures", flush=True)
raise SystemExit(bool(FAILURES))
