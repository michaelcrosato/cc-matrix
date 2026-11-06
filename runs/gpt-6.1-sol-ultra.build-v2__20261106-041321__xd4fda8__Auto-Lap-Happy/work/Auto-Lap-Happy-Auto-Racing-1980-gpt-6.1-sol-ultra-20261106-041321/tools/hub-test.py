import http.server
import json
import pathlib
import sys
import threading
import urllib.parse

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]


class Quiet(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, *a):
        pass


server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Quiet)
threading.Thread(target=server.serve_forever, daemon=True).start()
base = "http://127.0.0.1:" + str(server.server_port)
game = sys.argv[1] if len(sys.argv) > 1 else "index.html"
cases = [
    ("one", {"players": 1}),
    ("two", {"players": 2}),
    ("loss", {"players": 2, "latency": 150, "jitter": 50, "loss": 5}),
    ("host-leave", {"players": 2, "scenario": "host-leave"}),
    ("server", {"players": 2, "scenario": "server"}),
]
if len(sys.argv) > 2:
    cases = [c for c in cases if c[0] in sys.argv[2:]]
results = []
with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=[
            "--disable-dev-shm-usage",
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
        ],
    )
    for name, params in cases:
        context = browser.new_context()
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda e, errors=errors: errors.append(str(e)))
        try:
            url = (
                base
                + "/vendor/hub/harness.html?"
                + urllib.parse.urlencode(
                    {"game": "../../" + game, "auto": 1, "play": 4000, **params}
                )
            )
            page.goto(url)
            page.wait_for_function(
                "document.body.dataset.complete==='true'", timeout=90000
            )
            report = page.evaluate("window.__hubCheck")
            results.append(
                {
                    "name": "Hub " + name,
                    "pass": report.get("pass") is True,
                    "detail": [c for c in report.get("checks", []) if not c["pass"]],
                    "errors": errors,
                }
            )
            (ROOT / "evidence" / ("hub-" + name + ".json")).write_text(
                json.dumps(report, indent=2)
            )
        except (PlaywrightError, OSError, ValueError) as e:
            results.append(
                {
                    "name": "Hub " + name,
                    "pass": False,
                    "detail": str(e),
                    "errors": errors,
                }
            )
        finally:
            context.close()
    browser.close()
server.shutdown()
server.server_close()
print(json.dumps(results))
