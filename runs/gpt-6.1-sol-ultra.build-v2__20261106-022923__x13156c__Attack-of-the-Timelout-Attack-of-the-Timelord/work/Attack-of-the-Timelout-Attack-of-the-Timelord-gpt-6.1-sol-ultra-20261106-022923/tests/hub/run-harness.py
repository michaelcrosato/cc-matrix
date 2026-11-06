"""Run the unmodified official Hub harness against the delivered HTML."""

import functools
import http.server
import json
import sys
import threading
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def run(artifact):
    artifact = Path(artifact).resolve()
    dev = Path(__file__).resolve().parents[2]
    root = artifact.parent
    reports = []
    failures = []
    handler = functools.partial(QuietHandler, directory=str(root))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_address[1]}"
    harness = (dev / "tests/hub/harness.html").relative_to(root).as_posix()
    scenarios = [
        {"players": 2},
        {"players": 4, "latency": 150, "jitter": 50, "loss": 5},
        {
            "players": 4,
            "latency": 150,
            "jitter": 50,
            "loss": 5,
            "scenario": "host-leave",
        },
        {"players": 2, "scenario": "server"},
    ]
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--enable-webgl",
                    "--use-gl=angle",
                    "--use-angle=swiftshader",
                    "--enable-unsafe-swiftshader",
                ],
            )
            for parameters in scenarios:
                page = browser.new_page(viewport={"width": 1280, "height": 800})
                query = {
                    "game": f"/{artifact.name}",
                    "auto": 1,
                    "seed": 1701,
                    **parameters,
                }
                try:
                    page.goto(
                        f"{base}/{harness}?{urlencode(query)}",
                        wait_until="domcontentloaded",
                    )
                    page.wait_for_function(
                        "document.body.dataset.complete === 'true'", timeout=100000
                    )
                    result = page.evaluate("window.__hubCheck")
                    reports.append({"parameters": query, "result": result})
                    if not result or not result.get("pass"):
                        failures.append(
                            f"Hub {parameters}: "
                            + "; ".join(
                                c["name"] + ": " + c.get("detail", "")
                                for c in (result or {}).get("checks", [])
                                if not c["pass"]
                            )
                        )
                except (PlaywrightError, AssertionError, ValueError) as error:
                    failures.append(f"Hub {parameters}: {error}")
                    reports.append({"parameters": query, "error": str(error)})
                finally:
                    page.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
    (dev / "test-artifacts/hub-results.json").write_text(
        json.dumps(
            {
                "revision": "35a1047f2067b2af3de3943f0fe452f39105d869",
                "reports": reports,
            },
            indent=2,
        )
    )
    for failure in failures:
        print(f"FAIL {failure}")
    print(f"Hub harness: {len(scenarios) - len(failures)}/{len(scenarios)} passed")
    return bool(failures)


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
