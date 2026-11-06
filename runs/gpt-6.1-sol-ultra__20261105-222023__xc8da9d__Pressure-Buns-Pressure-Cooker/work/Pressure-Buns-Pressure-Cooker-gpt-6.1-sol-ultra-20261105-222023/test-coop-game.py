"""Exercise two real game pages: join, shared input, both restart paths and departure recovery."""

import functools
import http.server
import pathlib
import threading

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def main():
    folder = pathlib.Path(__file__).resolve().parent
    failures = []
    count = 0

    def check(condition, message):
        nonlocal count
        count += 1
        if not condition:
            failures.append(message)

    def expect(page, expression, message, timeout=12000):
        try:
            page.wait_for_function(expression, timeout=timeout)
            check(True, message)
            return True
        except PlaywrightError:
            check(False, message)
            return False

    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(folder.parent))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    browser = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                ],
            )
            context = browser.new_context(viewport={"width": 960, "height": 540})
            # Deliberately use the game\'s local transport; no public broker is required for this test.
            context.route(
                "https://unpkg.com/peerjs@1.5.5/**", lambda route: route.abort()
            )
            host = context.new_page()
            guest = context.new_page()
            url = f"http://127.0.0.1:{server.server_address[1]}/{folder.name}.html?renderer=webgl"
            errors = []
            for page in (host, guest):
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto(url, wait_until="domcontentloaded")
                page.wait_for_function("window.__game?.ready", timeout=30000)
                page.mouse.move(10, 10)
                page.locator("#online").click(force=True)
            host.locator("#net-host").click(force=True)
            host.wait_for_function(
                '/^[A-Z0-9]{6}$/.test(document.querySelector("#net-room").textContent)'
            )
            code = host.locator("#net-room").inner_text()
            guest.locator("#net-code").fill(code)
            guest.locator("#net-join").click(force=True)
            expect(
                host,
                "__game.network.connected",
                "Host game must accept a joining sous-chef",
            )
            expect(
                guest,
                "__game.network.connected && __game.network.localSeat===1",
                "Guest game must join as chef one",
            )
            host.locator("#net-start").click(force=True)
            expect(
                guest,
                '__game.game.state.mode==="play" && __game.screen===null',
                "Host start must open gameplay on the guest",
            )
            check(
                host.evaluate("__game.game.state.players.length===2"),
                "Shared host world must contain both chefs",
            )
            initial = host.evaluate("__game.game.state.players.find(p=>p.id===1).x")
            guest.keyboard.down("d")
            expect(
                host,
                f"__game.game.state.players.find(p=>p.id===1).x>{initial + 0.3}",
                "Guest keyboard input must move the authoritative second chef",
            )
            guest.keyboard.up("d")

            host.evaluate("""() => {
                const s=__game.game.state,p=s.players.find(p=>p.id===1);
                const burger=s.burgers.find(b=>b.slot===0);
                p.x=-3;p.z=4.1;p.held=null;p.actionCooldown=0;p.carrying={...burger,ready:true};
                s.burgers=s.burgers.filter(b=>b!==burger);
                __game.game.config.assist=false;
            }""")
            guest.evaluate("__game.game.config.assist=true")
            expect(
                host,
                "__game.game.state.served===1",
                "Guest's own assist setting must auto-serve through the authoritative host",
            )
            check(
                host.evaluate("!__game.game.config.assist"),
                "Guest assistance must leave the host's own setting unchanged",
            )
            guest.evaluate("__game.game.config.assist=false")

            def finish_round():
                host.evaluate(
                    '__game.game.state.mode="victory";__game.game.state.served=12;__game.game.state.score=1500'
                )
                expect(
                    host,
                    '__game.screen==="result"',
                    "Host victory must open its result menu",
                )
                expect(
                    guest,
                    '__game.screen==="result"',
                    "Shared victory must open the guest result menu",
                )

            finish_round()
            guest.locator("#retry").click(force=True)
            expect(
                host,
                '__game.game.state.mode==="play" && __game.game.state.served===0 && !__game.game.state.endless',
                "Guest retry must restart the authoritative campaign",
            )
            expect(
                guest,
                '__game.game.state.mode==="play" && __game.screen===null',
                "Guest retry must return both copies to gameplay",
            )
            finish_round()
            guest.locator("#endless").click(force=True)
            expect(
                host,
                '__game.game.state.mode==="play" && __game.game.state.endless',
                "Guest after-hours selection must start authoritative endless play",
            )
            expect(
                guest,
                "__game.game.state.endless && __game.screen===null",
                "Guest must display the same endless world",
            )
            finish_round()
            host.locator("#retry").click(force=True)
            expect(
                guest,
                '__game.game.state.mode==="play" && !__game.game.state.endless && __game.screen===null',
                "Host retry must close the guest result overlay and restart both copies",
            )
            orders = host.evaluate("""() => {
                const s=__game.game.state;
                s.players.find(p=>p.id===1).carrying=s.burgers.shift();
                return s.burgers.length+s.players.filter(p=>p.carrying).length;
            }""")
            guest.locator("#pauseButton").click(force=True)
            guest.locator("#quit").click(force=True)
            expect(
                host,
                "!__game.network.connected && __game.game.state.players.length===1",
                "Departing guest must leave one playable chef on the host",
            )
            check(
                host.evaluate("__game.game.physics.bodies===1"),
                "Departing chef physics body must be removed",
            )
            check(
                host.evaluate(
                    "const s=__game.game.state;s.burgers.length+s.players.filter(p=>p.carrying).length"
                )
                == orders,
                "Departing chef carried order must return to the host kitchen",
            )
            check(
                host.evaluate('__game.game.state.mode==="play"'),
                "Guest departure must leave the host campaign playable",
            )
            check(
                not errors,
                "Co-op flow must produce no JavaScript errors: " + repr(errors),
            )
            browser.close()
    except (PlaywrightError, KeyError, ValueError, OSError) as exc:
        failures.append(str(exc))
    finally:
        server.shutdown()
    for failure in failures:
        print("FAIL: " + failure)
    print(f"{count} co-op game checks, {len(failures)} failures")
    return bool(failures)


if __name__ == "__main__":
    raise SystemExit(main())
