"""AI Hub's actual browser conformance harness; no invented protocol stand-in."""

from __future__ import annotations

import functools
import http.server
import json
import threading
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parent.parent
ROOT = DEV.parent
GAME = DEV.name + ".html"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def run_checks():
    failures = []
    count = 0
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    url = f"http://127.0.0.1:{server.server_port}"
    reports = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                    "--ignore-certificate-errors",
                    "--disable-dev-shm-usage",
                ],
            )
            context = browser.new_context(viewport={"width": 1280, "height": 900})
            try:
                for label, extra in [
                    ("two-player", {}),
                    ("latency-loss", {"latency": 150, "jitter": 50, "loss": 5}),
                    ("host-leave", {"scenario": "host-leave"}),
                    ("server-host", {"scenario": "server"}),
                ]:
                    page = context.new_page()
                    errors = []
                    page.on(
                        "pageerror",
                        lambda error, errors=errors: errors.append(str(error)),
                    )
                    try:
                        query = {
                            "game": "../" + GAME,
                            "players": 2,
                            "auto": 1,
                            "play": 3500,
                            **extra,
                        }
                        page.goto(
                            url + "/" + DEV.name + "/harness.html?" + urlencode(query),
                            wait_until="domcontentloaded",
                            timeout=45000,
                        )
                        page.wait_for_function(
                            "document.body.dataset.complete === 'true'", timeout=120000
                        )
                        report = page.evaluate("window.__hubCheck")
                        reports.append(
                            {"scenario": label, "browserErrors": errors, **report}
                        )
                        for check in report.get("checks", []):
                            count += 1
                            if not check["pass"]:
                                failures.append(
                                    f"{label}: {check['name']}: {check.get('detail', '')}"
                                )
                        count += 1
                        if not report.get("pass"):
                            failures.append(f"{label}: overall conformance failed")
                        count += 1
                        if errors:
                            failures.append(
                                f"{label}: no browser errors: "
                                + "; ".join(dict.fromkeys(errors))
                            )
                    except Exception as error:  # noqa: BLE001 - report failures and close owned resources
                        count += 1
                        failures.append(f"{label}: {error}")
                    finally:
                        page.close()
            finally:
                context.close()
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
    (DEV / "tests" / "hub-results.json").write_text(json.dumps(reports, indent=2))
    return count, failures


if __name__ == "__main__":
    checks, issues = run_checks()
    for issue in issues:
        print("FAIL " + issue)
    print(f"{checks - len(issues)}/{checks} AI Hub checks passed")
    raise SystemExit(1 if issues else 0)
