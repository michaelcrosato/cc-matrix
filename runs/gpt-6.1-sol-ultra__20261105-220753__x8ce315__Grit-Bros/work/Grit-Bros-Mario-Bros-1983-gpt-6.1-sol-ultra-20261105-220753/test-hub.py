"""Run the upstream AI Hub checks against the packaged game (one browser, OS-selected port)."""

import functools
import http.server
import pathlib
import sys
import threading
import urllib.parse

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:
        pass


def run_checks(browser, origin, html_name):
    failures = []
    count = 0
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    try:
        for scenario in ["standard", "server", "host-leave"]:
            query = urllib.parse.urlencode(
                {
                    "game": "../../" + html_name,
                    "players": "2",
                    "auto": "1",
                    "scenario": scenario,
                    "latency": "150",
                    "jitter": "50",
                    "loss": "5",
                    "play": "4000",
                    "limit": "20",
                }
            )
            page.goto(
                origin + "/" + ROOT.name + "/hub/harness.html?" + query,
                wait_until="domcontentloaded",
            )
            page.wait_for_function(
                "document.body.dataset.complete === 'true'", timeout=120000
            )
            result = page.evaluate("window.__hubCheck")
            count += len(result["checks"])
            for check in result["checks"]:
                if not check["pass"]:
                    failures.append(
                        f"AI Hub {scenario}: {check['name']}: {check.get('detail', '')}"
                    )
    finally:
        page.close()
    return count, failures


def run_tab_checks(browser, origin, html_name):
    failures = []
    count = 0
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    host = context.new_page()
    guest = context.new_page()
    errors = []
    host.on("pageerror", lambda error: errors.append(str(error)))
    guest.on("pageerror", lambda error: errors.append(str(error)))

    def check(passed, name):
        nonlocal count
        count += 1
        if not passed:
            failures.append("Tab rooms: " + name)

    try:
        url = origin + "/" + html_name
        host.goto(url, wait_until="domcontentloaded")
        guest.goto(url, wait_until="domcontentloaded")
        host.wait_for_function("window.Grit && Grit.mode === 'title'", timeout=30000)
        guest.wait_for_function("window.Grit && Grit.mode === 'title'", timeout=30000)
        host.locator('[data-action="rooms"]').click()
        guest.locator('[data-action="rooms"]').click()
        host.locator('[data-action="hostroom"]').click()
        code = host.locator(".room-code").inner_text()
        guest.locator("#room-code").fill(code)
        guest.locator('[data-action="joinroom"]').click()
        host.wait_for_function(
            "Grit.mode === 'play' && Grit.net.connected", timeout=10000
        )
        guest.wait_for_function(
            "Grit.mode === 'play' && Grit.net.connected", timeout=10000
        )
        check(
            host.evaluate("Grit.state.players.filter(p => p.active).length === 2"),
            "host enables both players",
        )
        check(
            guest.evaluate("!Grit.net.isHost && Grit.net.me === 1"),
            "joining page occupies second seat",
        )
        before = host.evaluate("Grit.state.players[1].x")
        guest.keyboard.down("d")
        host.wait_for_function(
            "Grit.state.players[1].x > " + str(before + 0.5), timeout=10000
        )
        guest.keyboard.up("d")
        check(True, "guest keyboard input moves host-authoritative player")
        host_x = host.evaluate("Grit.state.players[1].x")
        guest.wait_for_function(
            "Math.abs(Grit.state.players[1].x - " + str(host_x) + ") < 1", timeout=10000
        )
        check(True, "guest receives matching world snapshots")
        y_before = host.evaluate("Grit.state.players[1].y")
        guest.keyboard.down("Space")
        host.wait_for_function(
            "Grit.state.players[1].y > " + str(y_before + 0.7), timeout=10000
        )
        guest.keyboard.up("Space")
        check(True, "guest jump crosses network")
        x_before = host.evaluate("Grit.state.players[0].x")
        host.keyboard.down("a")
        host.wait_for_function(
            "Grit.state.players[0].x < " + str(x_before - 0.5), timeout=10000
        )
        host.keyboard.up("a")
        check(True, "host independently controls first player")
        guest.evaluate("Grit.showTitle()")
        host.wait_for_function(
            "!Grit.net.connected && Grit.state.players.filter(p => p.active).length === 1",
            timeout=10000,
        )
        check(
            host.evaluate("Grit.mode === 'play'"),
            "host continues after partner clocks out",
        )
        check(
            not errors,
            "both game pages remain free of runtime errors: " + "; ".join(errors),
        )
    finally:
        context.close()
    return count, failures


def run_server_leave_checks(browser, origin, html_name):
    failures = []
    count = 0
    page = browser.new_page(viewport={"width": 1280, "height": 900})

    def check(passed, name):
        nonlocal count
        count += 1
        if not passed:
            failures.append("AI Hub survivor: " + name)

    try:
        query = urllib.parse.urlencode(
            {
                "game": "../../" + html_name,
                "players": "2",
                "scenario": "server",
                "limit": "30",
            }
        )
        page.goto(
            origin + "/" + ROOT.name + "/hub/harness.html?" + query,
            wait_until="domcontentloaded",
        )
        page.wait_for_function(
            "document.querySelectorAll('iframe').length === 3 && [...document.querySelectorAll('iframe')].every(f => f.contentWindow.Grit)",
            timeout=30000,
        )
        page.locator("#release").click()
        page.wait_for_function(
            "[...document.querySelectorAll('iframe')].some(f => f.contentWindow.Grit?.net.server && f.contentWindow.Grit.net.canPlay)",
            timeout=15000,
        )
        server = next(
            frame for frame in page.frames[1:] if frame.evaluate("Grit.net.server")
        )
        guest = next(
            frame for frame in page.frames[1:] if frame.evaluate("Grit.net.me === 1")
        )
        server.evaluate("Grit.showTitle(); Grit.start();")
        check(
            server.evaluate("Grit.mode === 'play' && Grit.net.hub !== null"),
            "title and restart cannot replace a hub round",
        )
        page.locator("#who").select_option("p0")
        page.locator("#remove").click()
        server.wait_for_function("Grit.net.players.length === 1", timeout=5000)
        check(
            server.evaluate(
                "Grit.state.players.filter(p => p.active).map(p => p.id).join(',') === '1'"
            ),
            "server retains surviving second seat after first seat leaves",
        )
        before = server.evaluate("Grit.state.players[1].x")
        guest.evaluate(
            "document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'d',code:'KeyD',bubbles:true,cancelable:true}))"
        )
        server.wait_for_function(
            "Grit.state.players[1].x > " + str(before + 0.5), timeout=10000
        )
        guest.evaluate(
            "document.body.dispatchEvent(new KeyboardEvent('keyup',{key:'d',code:'KeyD',bubbles:true,cancelable:true}))"
        )
        check(True, "surviving remote player continues moving")
        page.locator("#timeup").click()
        server.wait_for_function("Grit.net.ended", timeout=10000)
        check(
            server.evaluate("Grit.net.reported"),
            "server still reports a valid result after departure",
        )
    finally:
        page.close()
    return count, failures


def main():
    files = list(
        ROOT.parent.glob(
            "Grit-Bros-Mario-Bros-1983-gpt-6.1-sol-ultra-20261105-220753.html"
        )
    )
    html = (
        pathlib.Path(sys.argv[1]).resolve()
        if len(sys.argv) > 1
        else files[0]
        if files
        else None
    )
    if html is None or not html.is_file():
        print("FAIL AI Hub: packaged HTML is missing")
        print("1 AI Hub check, 1 failure")
        return 1
    handler = functools.partial(QuietHandler, directory=str(ROOT.parent))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    failures = []
    count = 0
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                ],
            )
            try:
                origin = f"http://127.0.0.1:{server.server_port}"
                count, failures = run_checks(browser, origin, html.name)
                tab_count, tab_failures = run_tab_checks(browser, origin, html.name)
                count += tab_count
                failures.extend(tab_failures)
                leave_count, leave_failures = run_server_leave_checks(
                    browser, origin, html.name
                )
                count += leave_count
                failures.extend(leave_failures)
            finally:
                browser.close()
    except (PlaywrightError, OSError) as error:
        count += 1
        failures.append(str(error))
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    for failure in failures:
        print("FAIL " + failure)
    print(f"{count} AI Hub checks, {len(failures)} failures")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
