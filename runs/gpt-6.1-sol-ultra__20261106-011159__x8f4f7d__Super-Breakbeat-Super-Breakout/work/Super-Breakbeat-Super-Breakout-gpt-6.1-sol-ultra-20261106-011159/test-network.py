"""One-command adapter verification. Actual game harness belongs in game tests."""
import contextlib
import http.server
import json
from pathlib import Path
import threading

from playwright.sync_api import sync_playwright


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


failures = []
checks = 0


def check(condition, text):
    global checks
    checks += 1
    if not condition:
        failures.append(text)
        print("FAIL " + text)


with contextlib.chdir(Path(__file__).resolve().parent):
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Quiet)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}"
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        a, b = context.new_page(), context.new_page()
        for page in (a, b):
            page.goto(base + "/network-test.html")
            page.wait_for_function("window.loaded")
        room = a.evaluate("net.host()")
        check(len(room) == 6, "host produces room code")
        check(b.evaluate("code=>net.join(code)", room), "guest joins standalone room")
        a.evaluate("net.start({level:1})")
        b.wait_for_function("starts.length===1 && net.connected")
        check(b.evaluate("starts[0].coop && starts[0].players===2"), "standalone co-op starts")
        a.wait_for_function("inputs.length>0")
        b.wait_for_function("states.length>0")
        check(a.evaluate("inputs.at(-1).player===1"), "guest controls route to player 2")
        check(b.evaluate("states.at(-1).score===123"), "host snapshots arrive")
        a.evaluate("net.finish(123,true)")
        b.wait_for_function("net.ended")
        a.evaluate("net.start({level:2})")
        b.wait_for_function("starts.length===2 && !net.ended")
        check(b.evaluate("starts[1].level===2"), "standalone session can restart after results")
        b.evaluate("net.leave()")
        a.wait_for_function("!net.connected")
        check(a.evaluate("net.isHost"), "host remains available after guest leaves")
        offer = a.evaluate("net.createOffer()")
        answer = b.evaluate("s=>net.acceptOffer(s)", offer)
        a.evaluate("s=>net.acceptAnswer(s)", answer)
        for page in (a, b):
            page.wait_for_function("net.connected", timeout=15000)
        check(a.evaluate("net.transport==='webrtc'"), "serverless direct link connects")
        a.evaluate("net.start({direct:true})")
        b.wait_for_function("starts.at(-1).direct")
        check(b.evaluate("net.canPlay"), "direct link launches game")
        a.close()
        b.close()
        for scenario in ("standard", "host-leave", "server"):
            page = context.new_page()
            page.goto(base + "/vendor/hub/harness.html?game=../../network-test.html&players=2&auto=1&limit=7&scenario=" + scenario)
            page.wait_for_function("window.__hubCheck?.done", timeout=65000)
            report = page.evaluate("window.__hubCheck")
            check(report["pass"], "official harness " + scenario + ": " + json.dumps([c for c in report["checks"] if not c["pass"]]))
            page.close()
        browser.close()
    server.shutdown()

print(f"{checks} checks, {len(failures)} failures")
raise SystemExit(bool(failures))
