#!/usr/bin/env python3
"""AI Hub's unmodified harness, with one browser and an ephemeral local server."""

import json
import os
import sys
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
TEMP = ROOT / ".browser-temp-hub"
TEMP.mkdir(exist_ok=True)
os.environ["TMPDIR"] = str(TEMP)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class TestHTTPServer(ThreadingHTTPServer):
    daemon_threads = True


def run_checks():
    failures = []
    reports = []
    checks = 0
    server = TestHTTPServer(
        ("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f"http://127.0.0.1:{server.server_port}"
    scenarios = [
        {"players": 2, "scenario": "standard"},
        {"players": 4, "scenario": "standard", "latency": 150, "jitter": 50, "loss": 5},
        {
            "players": 4,
            "scenario": "host-leave",
            "latency": 150,
            "jitter": 50,
            "loss": 5,
        },
    ]
    if "--four-standard" in sys.argv:
        scenarios = [
            s for s in scenarios if s["players"] == 4 and s["scenario"] == "standard"
        ]
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-vulkan=swiftshader",
                    "--disable-dev-shm-usage",
                ],
            )
            try:
                for scenario in scenarios:
                    label = f"{scenario['players']} players / {scenario['scenario']}"
                    page = browser.new_page(viewport={"width": 1280, "height": 900})
                    try:
                        query = urlencode(
                            {
                                "game": "../index.html?renderer=webgl",
                                "auto": 1,
                                "play": 6000,
                                **scenario,
                            }
                        )
                        page.goto(
                            f"{origin}/vendor/harness.html?{query}",
                            wait_until="domcontentloaded",
                            timeout=30000,
                        )
                        page.wait_for_function(
                            "document.querySelector('iframe')?.contentDocument?.title.includes('Pitfallin')",
                            timeout=30000,
                        )
                        checks += 1
                        page.wait_for_function(
                            "document.body.dataset.complete === 'true'", timeout=120000
                        )
                        report = page.evaluate("window.__hubCheck")
                        reports.append(report)
                        for check in report.get("checks", []):
                            checks += 1
                            if not check["pass"]:
                                failures.append(
                                    f"{label}: {check['name']} — {check.get('detail', '')}"
                                )
                        if not report.get("pass") and all(
                            check["pass"] for check in report.get("checks", [])
                        ):
                            failures.append(f"{label}: overall harness failed")
                    except Exception as error:  # noqa: BLE001 - preserve diagnostics for every test failure
                        checks += 1
                        diagnostics = page.evaluate(
                            "({title:document.title,check:window.__hubCheck,frames:[...document.querySelectorAll('iframe')].map(f=>({title:f.contentDocument?.title,error:f.contentWindow?.__bootError,state:f.contentWindow?.__pitfallin?.state}))})"
                        )
                        reports.append(
                            {
                                "scenario": scenario,
                                "error": str(error),
                                "diagnostics": diagnostics,
                            }
                        )
                        failures.append(f"{label}: {error}")
                    finally:
                        page.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    (
        ROOT
        / (
            "hub-four-standard-results.json"
            if "--four-standard" in sys.argv
            else "hub-test-results.json"
        )
    ).write_text(json.dumps(reports, indent=2), encoding="utf-8")
    for failure in failures:
        print(f"FAIL {failure}")
    print(
        f"{checks - len(failures)}/{checks} hub checks passed"
        + (f"; {len(failures)} failed" if failures else "")
    )
    return not failures


if __name__ == "__main__":
    raise SystemExit(0 if run_checks() else 1)
