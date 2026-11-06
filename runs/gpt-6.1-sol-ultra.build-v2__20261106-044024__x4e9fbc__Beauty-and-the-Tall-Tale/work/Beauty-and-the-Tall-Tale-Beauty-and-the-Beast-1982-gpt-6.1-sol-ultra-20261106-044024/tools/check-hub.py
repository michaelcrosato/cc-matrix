"""Run the pristine Hub harness against the actual packaged HTML.

Imported by check-browser.py/verify or run on its own with the installed
Playwright Python. The HTTP listener is owned here and asks the OS for a port.
The runner never writes to the Hub catalogue and closes all owned resources.
"""

from __future__ import annotations

import functools
import http.server
import json
import pathlib
import threading
import urllib.parse

from playwright.sync_api import sync_playwright

DEV = pathlib.Path(__file__).resolve().parents[1]
ROOT = DEV.parent
IDENTITY = json.loads((DEV / "build-identity.json").read_text())
SHIPPING = ROOT / (IDENTITY["basename"] + ".html")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def run_hub_checks():
    results = []
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    harness = f"{base}/{DEV.name}/vendor/ai-hub/harness.html"
    cases = [
        ("single-seat", {"players": "1"}),
        ("two-seat", {"players": "2"}),
        (
            "degraded-150ms-50ms-5percent",
            {"players": "2", "latency": "150", "jitter": "50", "loss": "5"},
        ),
        ("host-leave", {"players": "2", "scenario": "host-leave"}),
        ("non-playing-server", {"players": "2", "scenario": "server"}),
    ]
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                for name, options in cases:
                    page = browser.new_page(viewport={"width": 1280, "height": 800})
                    errors = []
                    page.on("pageerror", lambda e, errors=errors: errors.append(str(e)))
                    report = {}
                    try:
                        query = {
                            "game": "/" + SHIPPING.name,
                            "auto": "1",
                            "play": "2500",
                            "seed": "14013",
                            **options,
                        }
                        page.goto(harness + "?" + urllib.parse.urlencode(query))
                        page.wait_for_function(
                            "document.body.dataset.complete === 'true'", timeout=55000
                        )
                        report = page.evaluate("window.__hubCheck")
                        frames = [
                            f
                            for f in page.frames
                            if f != page.main_frame and f.url != "about:blank"
                        ]
                        # Guard against another builder's page or an accidental
                        # path collision before trusting a protocol result.
                        identities = [f.evaluate("document.title") for f in frames]
                        if any(IDENTITY["title"] not in title for title in identities):
                            raise AssertionError(f"wrong game identity: {identities!r}")
                        if not report.get("pass"):
                            errors.extend(
                                f"{c['name']}: {c.get('detail', '')}"
                                for c in report.get("checks", [])
                                if not c["pass"]
                            )
                        # Any exposed adapter diagnostics must confirm that
                        # routine snapshots avoid unreliable fragmentation.
                        for frame in frames:
                            diag = frame.evaluate(
                                "globalThis.TallTaleApp?.state.network?.diagnostics?.() || null"
                            )
                            if diag and diag.get("maxRoutineBytes", 0) > 1200:
                                errors.append(
                                    "routine network snapshot exceeded 1200 bytes"
                                )
                            if diag and diag.get("postEndSends", 0):
                                errors.append("adapter attempted to send after end")
                        results.append(
                            {
                                "name": "Hub " + name,
                                "pass": not errors,
                                "errors": errors,
                                "report": report,
                            }
                        )
                    except Exception as error:  # noqa: BLE001 - report each failed scenario, then clean up
                        results.append(
                            {
                                "name": "Hub " + name,
                                "pass": False,
                                "errors": [str(error)],
                                "report": report,
                            }
                        )
                    finally:
                        page.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    (DEV / "artifacts" / "hub-checks.json").write_text(json.dumps(results, indent=2))
    return results


if __name__ == "__main__":
    results = run_hub_checks()
    failures = [r for r in results if not r["pass"]]
    for result in failures:
        print(result["name"] + ": " + "; ".join(result["errors"]))
    print(f"{len(results) - len(failures)}/{len(results)} Hub harness checks passed")
    raise SystemExit(bool(failures))
