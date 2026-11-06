"""Extended multiplayer verification. Run through test.sh --network."""

# ruff: noqa: BLE001
from __future__ import annotations

import argparse
import contextlib
import http.server
import json
import pathlib
import threading
import time
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
GAME = HERE.parent / (HERE.name + ".html")
REPORT = HERE / "extended-network-results.json"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


@contextlib.contextmanager
def server():
    def handler(*args, **kwargs):
        return QuietHandler(*args, directory=str(HERE.parent), **kwargs)

    s = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    t = threading.Thread(target=s.serve_forever, daemon=True)
    t.start()
    try:
        yield f"http://127.0.0.1:{s.server_address[1]}"
    finally:
        s.shutdown()
        s.server_close()
        t.join(timeout=2)


def load_game(context, base):
    page = context.new_page()
    page.goto(base + "/" + GAME.name + "?renderer=webgl", wait_until="domcontentloaded")
    page.wait_for_function("window.__game?.ready", timeout=120000)
    assert page.title() == "Haunted House Party", "Not our game"
    page.evaluate("window.__game.freezeRender(true)")
    return page


def check_hub(browser, base, params):
    context = browser.new_context(
        viewport={"width": 1280, "height": 800}, ignore_https_errors=True
    )
    context.add_init_script("setInterval(()=>window.__game?.freezeRender?.(true),100)")
    page = context.new_page()
    try:
        query = urlencode(
            {
                "game": "../" + GAME.name + "?renderer=webgl",
                "auto": 1,
                "play": 2500,
                **params,
            }
        )
        page.goto(
            base + "/" + HERE.name + "/harness.html?" + query,
            wait_until="domcontentloaded",
        )
        assert page.title() == "AI Hub Session Harness", "Not our harness"
        page.wait_for_function("window.__hubCheck?.done===true", timeout=180000)
        report = page.evaluate("window.__hubCheck")
        failures = [c for c in report["checks"] if not c["pass"]]
        assert report["pass"], "; ".join(
            c["name"] + ": " + str(c["detail"]) for c in failures
        )
        return {"report": report}
    finally:
        context.close()


def check_roster(browser, base):
    context = browser.new_context(
        viewport={"width": 960, "height": 700}, ignore_https_errors=True
    )
    context.add_init_script("setInterval(()=>window.__game?.freezeRender?.(true),100)")
    try:
        pages = [load_game(context, base) for _ in range(4)]
        host = pages[0]
        code = host.evaluate("window.__game.network.host()")
        for count, guest in enumerate(pages[1:], 2):
            guest.evaluate("(code)=>window.__game.network.join(code)", code)
            guest.wait_for_function("window.__game.network.started", timeout=15000)
            host.wait_for_function(
                "(n)=>window.__game.state.players.length===n", arg=count, timeout=10000
            )
        before = host.evaluate("window.__game.state.players.map(p=>p.id)")
        assert sorted(before) == [0, 1, 2, 3], before
        # Removing the middle seat must not end another guest's session.
        pages[2].evaluate("window.__game.network.leave()")
        host.wait_for_function("window.__game.state.players.length===3", timeout=10000)
        pages[3].wait_for_function(
            "window.__game.state.players.length===3", timeout=10000
        )
        assert pages[3].evaluate("!window.__game.network.ended"), (
            "Guest departure ended a peer's session"
        )
        pages[2].evaluate("(code)=>window.__game.network.join(code)", code)
        pages[2].wait_for_function("window.__game.network.started", timeout=15000)
        host.wait_for_function("window.__game.state.players.length===4", timeout=10000)
        after = host.evaluate("window.__game.state.players.map(p=>p.id)")
        assert sorted(after) == [0, 1, 2, 3], after
        # A short one-frame edge must survive the network transmission throttle.
        pages[3].evaluate("window.__game.network.sendInput({x:0,z:0,match:true})")
        pages[3].wait_for_function("window.__game.state.matches>0", timeout=10000)
        return {
            "before": before,
            "after": after,
            "host": host.evaluate("window.__game.network.stats()"),
            "guestStayedConnected": pages[3].evaluate("!window.__game.network.ended"),
        }
    finally:
        context.close()


def check_webrtc(browser, base):
    context = browser.new_context(
        viewport={"width": 960, "height": 700}, ignore_https_errors=True
    )
    context.add_init_script(
        'Object.defineProperty(window,"BroadcastChannel",{value:undefined,configurable:true});setInterval(()=>window.__game?.freezeRender?.(true),100);'
    )
    try:
        a, b = load_game(context, base), load_game(context, base)
        code = a.evaluate("window.__game.network.host()")
        a.wait_for_function("window.__game.network.stats().peerReady", timeout=30000)
        b.evaluate("(code)=>window.__game.network.join(code)", code)
        b.wait_for_function("window.__game.network.started", timeout=35000)
        a.wait_for_function("window.__game.network.started", timeout=10000)
        b.evaluate("window.__game.network.sendInput({x:1,z:0,match:true})")
        b.wait_for_function("window.__game.state.matches>0", timeout=10000)
        sa, sb = (
            a.evaluate("window.__game.network.stats()"),
            b.evaluate("window.__game.network.stats()"),
        )
        assert sa["received"] > 0 and sb["received"] > 0, (sa, sb)
        assert any(c["connectionState"] == "connected" for c in sa["connections"]), sa
        assert any(c["iceState"] == "connected" for c in sb["connections"]), sb
        return {
            "host": sa,
            "guest": sb,
            "transport": "WebRTC; BroadcastChannel disabled; Chromium loopback ICE allowed",
        }
    finally:
        context.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--followup",
        action="store_true",
        help="Rerun only host departure and roster regression checks, preserving other results.",
    )
    options = parser.parse_args()
    results = []
    if not GAME.exists():
        print("FAIL extended multiplayer: HTML package missing")
        print("0 passed, 1 failed")
        return 1
    with server() as base, sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--enable-unsafe-swiftshader",
                "--allow-loopback-in-peer-connection",
            ],
        )
        checks = [
            (
                "4-player adverse network",
                lambda: check_hub(
                    browser,
                    base,
                    {"players": 4, "latency": 150, "jitter": 50, "loss": 5},
                ),
            ),
            (
                "host leaves",
                lambda: check_hub(
                    browser,
                    base,
                    {
                        "players": 4,
                        "latency": 150,
                        "jitter": 50,
                        "loss": 5,
                        "scenario": "host-leave",
                    },
                ),
            ),
            (
                "dedicated server",
                lambda: check_hub(browser, base, {"players": 2, "scenario": "server"}),
            ),
            ("4-seat join leave and rejoin", lambda: check_roster(browser, base)),
            ("standalone actual WebRTC", lambda: check_webrtc(browser, base)),
        ]
        if options.followup:
            checks = [
                item
                for item in checks
                if item[0] in ("host leaves", "4-seat join leave and rejoin")
            ]
        try:
            for label, operation in checks:
                start = time.monotonic()
                try:
                    details = operation()
                    results.append(
                        {
                            "name": label,
                            "passed": True,
                            "seconds": round(time.monotonic() - start, 2),
                            **details,
                        }
                    )
                except Exception as error:
                    results.append(
                        {
                            "name": label,
                            "passed": False,
                            "error": str(error),
                            "seconds": round(time.monotonic() - start, 2),
                        }
                    )
                    print(
                        "FAIL " + label + ": " + str(error).splitlines()[0], flush=True
                    )
        finally:
            browser.close()
    overall = results
    if options.followup and REPORT.exists():
        replaced = {r["name"] for r in results}
        overall = [
            r for r in json.loads(REPORT.read_text()) if r["name"] not in replaced
        ] + results
    REPORT.write_text(json.dumps(overall, indent=2))
    passed = sum(r["passed"] is True for r in results)
    failed = sum(r["passed"] is False for r in results)
    wrapper = {
        "passed": sum(r["passed"] is True for r in overall),
        "failed": sum(r["passed"] is False for r in overall),
        "unknown": sum(r["passed"] is None for r in overall),
        "checks": overall,
    }
    (HERE / "network-test-results.json").write_text(json.dumps(wrapper, indent=2))
    print(f"{passed} passed, {failed} failed")
    return int(failed > 0)


if __name__ == "__main__":
    raise SystemExit(main())
