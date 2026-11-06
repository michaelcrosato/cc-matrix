"""Standalone two-page play and AI Hub's own conformance harness.
Run with the installed Playwright Python interpreter. Prints failures and a count.
"""

import functools
import http.server
import json
import threading
import urllib.parse
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parent
ROOT = DEV.parent
GAME = DEV.name + ".html"
CHECKS = 0
FAILURES = []


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def check(name, function):
    global CHECKS
    CHECKS += 1
    try:
        function()
    except Exception as error:  # noqa: BLE001 - report all independent test failures
        message = str(error).split("Call log:")[0].strip()
        FAILURES.append({"name": name, "error": message})
        print(f"FAIL {name}: {message}", flush=True)


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def state(page):
    return page.evaluate("__PADDLE__.getState()")


def ready(page):
    page.wait_for_function("window.__PADDLE__?.ready", timeout=120_000)


def phase(page, value):
    page.wait_for_function(
        "v=>__PADDLE__.getState().phase===v", arg=value, timeout=8000
    )


def boot_pair(context, url):
    host, guest = context.new_page(), context.new_page()
    host.goto(url, wait_until="domcontentloaded")
    ready(host)
    guest.goto(url, wait_until="domcontentloaded")
    ready(guest)
    return host, guest


def standalone(context, url):
    host, guest = boot_pair(context, url)
    try:
        code = host.evaluate("__PADDLE__.network().host()")
        guest.evaluate("code=>__PADDLE__.network().join(code)", code)

        def connected():
            for page in (host, guest):
                page.wait_for_function(
                    "__PADDLE__.network().info.connected", timeout=8000
                )
            require(
                host.evaluate("__PADDLE__.network().info.transport") == "local",
                "local room did not use BroadcastChannel",
            )

        check("standalone room connection", connected)

        def start():
            require(
                host.evaluate("__PADDLE__.network().start({court:1})"),
                "host could not start",
            )
            for page in (host, guest):
                page.wait_for_function(
                    "__PADDLE__.getState().mode==='online' && __PADDLE__.getState().court===1",
                    timeout=8000,
                )
            require(
                state(guest)["scores"] == [0, 0], "guest did not receive initial scores"
            )

        check("standalone synchronized start", start)

        def inputs():
            guest.keyboard.down("s")
            try:
                host.wait_for_function(
                    "__PADDLE__.getState().paddles[1].z>1", timeout=8000
                )
            finally:
                guest.keyboard.up("s")
            host.evaluate("__PADDLE__.act('pause')")
            guest.wait_for_function(
                "__PADDLE__.getState().phase==='pause'", timeout=8000
            )
            host.wait_for_timeout(150)
            a, b = state(host), state(guest)
            require(
                abs(a["paddles"][1]["z"] - b["paddles"][1]["z"]) < 0.1,
                "guest paddle differs from authoritative host",
            )

        check("standalone guest input and host snapshots", inputs)

        def pause_resume():
            phase(guest, "pause")
            require(
                state(guest)["screen"] == "onlinepaused",
                "guest did not show host pause screen",
            )
            before = state(host)["ball"].copy()
            host.wait_for_timeout(250)
            require(state(host)["ball"] == before, "paused ball moved")
            host.evaluate("__PADDLE__.act('resume')")
            guest.wait_for_function(
                "['play','serve'].includes(__PADDLE__.getState().phase)", timeout=8000
            )
            require(
                state(guest)["screen"] == "game",
                "guest overlay did not close on resume",
            )

        check("standalone host pause and resume", pause_resume)

        def result():
            host.evaluate("__PADDLE__.setParam('targetScore',1); __PADDLE__.point(0)")
            phase(host, "result")
            phase(guest, "result")
            require(
                state(host)["scores"] == state(guest)["scores"] == [1, 0],
                "result scores diverged",
            )

        check("standalone result convergence", result)

        def rematch():
            host.evaluate("__PADDLE__.act('rematch')")
            for page in (host, guest):
                page.wait_for_function(
                    "['play','serve'].includes(__PADDLE__.getState().phase) && __PADDLE__.getState().scores.every(s=>s===0)",
                    timeout=8000,
                )
            require(state(guest)["court"] == 1, "rematch changed selected court")

        check("standalone rematch", rematch)

        def disconnect():
            guest.evaluate("__PADDLE__.network().disconnect()")
            host.wait_for_function("!__PADDLE__.network().info.connected", timeout=8000)
            require(
                state(host)["screen"] == "disconnected",
                "host did not show disconnect recovery",
            )

        check("standalone disconnect recovery", disconnect)
    finally:
        host.close()
        guest.close()


def hub(context, origin, scenario):
    page = context.new_page()
    try:
        query = urllib.parse.urlencode(
            {
                "game": "../../" + GAME,
                "players": 2,
                "auto": 1,
                "latency": 150,
                "jitter": 50,
                "loss": 5,
                "play": 6000,
                "scenario": scenario,
            }
        )
        harness = f"{origin}/{DEV.name}/vendor/harness.html?{query}"
        page.goto(harness, wait_until="domcontentloaded")
        page.wait_for_function(
            "document.body.dataset.complete==='true'", timeout=150_000
        )
        report = page.evaluate("window.__hubCheck")
        (DEV / f"hub-{scenario}-result.json").write_text(json.dumps(report, indent=2))
        failed = [
            f"{c['name']}: {c.get('detail', '')}"
            for c in report.get("checks", [])
            if not c["pass"]
        ]
        require(report.get("pass"), "; ".join(failed) or "harness did not pass")
    finally:
        page.close()


def main():
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f"http://127.0.0.1:{server.server_address[1]}"
    url = origin + "/" + GAME
    try:
        with urllib.request.urlopen(url) as response:
            document = response.read().decode()
        require("<title>Paddle Royale" in document, "server page is not Paddle Royale")
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                args=[
                    "--use-angle=swiftshader",
                    "--enable-unsafe-swiftshader",
                    "--disable-background-timer-throttling",
                    "--disable-backgrounding-occluded-windows",
                    "--disable-renderer-backgrounding",
                ],
            )
            context = browser.new_context(
                ignore_https_errors=True, viewport={"width": 1024, "height": 720}
            )
            context.add_init_script(
                "Object.defineProperty(navigator,'gpu',{get:()=>undefined});"
            )
            try:
                check("standalone complete flow", lambda: standalone(context, url))
                for scenario in ("standard", "server", "host-leave"):
                    check(
                        "AI Hub " + scenario,
                        lambda scenario=scenario: hub(context, origin, scenario),
                    )
            finally:
                context.close()
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    (DEV / "online-test-result.json").write_text(
        json.dumps({"checks": CHECKS, "failures": FAILURES}, indent=2)
    )
    print(f"{CHECKS - len(FAILURES)}/{CHECKS} online checks passed")
    raise SystemExit(bool(FAILURES))


if __name__ == "__main__":
    main()
