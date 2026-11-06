"""Two actual game pages: authority, controls, puzzle, results and replay."""

import functools
import http.server
import pathlib
import threading

from playwright.sync_api import sync_playwright

DEV = pathlib.Path(__file__).resolve().parents[1]
ROOT = DEV.parent


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def run_checks():
    failures = []
    count = 0

    def check(condition, label):
        nonlocal count
        count += 1
        if not condition:
            failures.append(label)

    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
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
            try:
                context = browser.new_context(
                    viewport={"width": 960, "height": 640}, ignore_https_errors=True
                )
                errors = []
                host, guest = context.new_page(), context.new_page()
                for page in (host, guest):
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    page.goto(
                        f"http://127.0.0.1:{server.server_port}/{DEV.name}.html",
                        wait_until="domcontentloaded",
                    )
                    page.wait_for_function("window.__game?.ready", timeout=90000)
                    check(
                        page.title() == "Raiders of the Lost Fortune",
                        "Multiplayer server must serve our own game",
                    )
                code = host.evaluate("__game.command('create-room')")
                guest.evaluate("code => __game.command('join-room',code)", code)
                for page in (host, guest):
                    page.wait_for_function(
                        "__game.getState().online.connected && __game.getState().screen==='playing'",
                        timeout=20000,
                    )
                check(len(code) == 6, "Standalone rooms use a six-character code")
                check(
                    host.evaluate("__game.getState().actors[1].active"),
                    "Host activates partner explorer",
                )
                before = host.evaluate("__game.getState().actors[1].z")
                guest.keyboard.down("KeyW")
                guest.wait_for_timeout(550)
                guest.keyboard.up("KeyW")
                host.wait_for_timeout(300)
                after = host.evaluate("__game.getState().actors[1].z")
                check(
                    after < before - 0.6,
                    "Guest keyboard input moves authoritative partner",
                )
                check(
                    abs(after - guest.evaluate("__game.getState().actors[1].z")) < 0.8,
                    "Guest renders the host's shared position",
                )
                check(
                    abs(host.evaluate("__game.getState().actors[0].z") - 8) < 0.1,
                    "Guest movement leaves host explorer stationary",
                )
                host.evaluate("__game.command('god',true)")
                host.evaluate("__game.command('teleport',{index:1,x:-5,z:-20})")
                guest.wait_for_timeout(250)
                guest.keyboard.press("KeyE")
                host.wait_for_function("__game.getState().puzzle[0]===0", timeout=10000)
                check(True, "Guest can rotate a shared sign")
                for x in (0, 5):
                    host.evaluate("x=>__game.command('teleport',{x,z:-20})", x)
                    host.evaluate("__game.command('use')")
                host.wait_for_function("__game.getState().solved")
                guest.wait_for_function("__game.getState().solved")
                check(True, "Solved puzzle and open vault replicate to guest")
                host.evaluate("__game.command('teleport',{x:0,z:-35})")
                host.evaluate("__game.command('use')")
                guest.wait_for_function("__game.getState().relic")
                check(True, "Relic recovery and escape replicate to guest")
                host.evaluate("__game.command('teleport',{x:0,z:10})")
                for page in (host, guest):
                    page.wait_for_function("__game.getState().won", timeout=10000)
                check(True, "Both pages receive the same terminal victory")
                check(
                    guest.locator("#retry").count() == 0, "Shared retry belongs to host"
                )
                host.locator("#retry").click()
                guest.wait_for_function(
                    "!__game.getState().won && __game.getState().screen==='playing'",
                    timeout=10000,
                )
                check(True, "Guest resumes when host replays expedition")
                guest.evaluate("__game.command('leave-room')")
                host.wait_for_function("!__game.getState().online.connected")
                check(
                    not host.evaluate("__game.getState().actors[1].active"),
                    "Disconnected partner no longer blocks solo expedition",
                )
                check(not errors, "No multiplayer browser exceptions: " + repr(errors))
            finally:
                browser.close()
    except Exception as error:  # noqa: BLE001 - report failures and close owned resources
        failures.append(f"Multiplayer test interrupted: {error}")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    return count, failures


if __name__ == "__main__":
    total, problems = run_checks()
    for problem in problems:
        print("FAIL: " + problem)
    print(f"{total - len(problems)}/{total} multiplayer checks passed")
    raise SystemExit(bool(problems))
