"""Upstream AI Hub conformance: npm test invokes this against the completed build."""

import argparse
import re
import subprocess
from pathlib import Path
from urllib.parse import quote

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
GAME = HERE.name + ".html"
GPU_ARGS = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-webgpu-adapter=swiftshader",
]


def start_server():
    process = subprocess.Popen(
        [
            "python3",
            "-u",
            "-m",
            "http.server",
            "0",
            "--bind",
            "127.0.0.1",
            "--directory",
            str(HERE.parent),
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    line = process.stdout.readline()
    match = re.search(r"port (\d+)", line)
    if not match:
        process.terminate()
        process.wait(timeout=10)
        raise RuntimeError("The test server did not report its assigned port: " + line)
    return process, "http://127.0.0.1:" + match[1]


def run(base_url=None, scenarios=None):
    failures = []
    count = 0
    process = None
    try:
        if not (HERE.parent / GAME).is_file():
            raise RuntimeError("Build missing: " + GAME)
        if base_url is None:
            process, base_url = start_server()
        base_url = base_url.rstrip("/")
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, args=GPU_ARGS)
            try:
                context = browser.new_context(
                    ignore_https_errors=True, viewport={"width": 1440, "height": 1000}
                )
                page = context.new_page()
                # Confirm the OS-assigned server belongs to this game before trusting results.
                page.goto(base_url + "/" + quote(GAME), wait_until="domcontentloaded")
                if page.title() != "Boiler Buddies — A midnight maintenance adventure":
                    # The exact title can evolve; the identity must remain unambiguous.
                    assert "Boiler Buddies" in page.title(), (
                        "The server did not serve Boiler Buddies."
                    )
                for scenario in scenarios or ["standard", "server", "host-leave"]:
                    relative = quote(HERE.name + "/harness.html")
                    url = (
                        f"{base_url}/{relative}?game=../{quote(GAME)}&players=2&auto=1"
                        f"&play=4500&limit=90&latency=150&jitter=50&loss=5&scenario={scenario}"
                    )
                    page.goto(url, wait_until="domcontentloaded")
                    page.wait_for_function(
                        "document.body.dataset.complete === 'true'", timeout=85000
                    )
                    report = page.evaluate("window.__hubCheck")
                    if not isinstance(report, dict) or not report.get("done"):
                        failures.append(
                            f"Hub {scenario}: no completed conformance report"
                        )
                        continue
                    checks = report.get("checks", [])
                    count += len(checks)
                    for check in checks:
                        if not check.get("pass"):
                            failures.append(
                                f"Hub {scenario}: {check.get('name')} — {check.get('detail', '')}"
                            )
                    if not report.get("pass") and not any(
                        not check.get("pass") for check in checks
                    ):
                        failures.append(
                            f"Hub {scenario}: reported failure without check details"
                        )
                context.close()
            finally:
                browser.close()
    except Exception as error:  # noqa: BLE001 — report runner failures in the single test summary
        failures.append(str(error))
    finally:
        if process is not None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=10)
    return count, failures


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--url", help="Existing server rooted at the deliverable folder's parent"
    )
    parser.add_argument(
        "--scenario", action="append", choices=["standard", "server", "host-leave"]
    )
    args = parser.parse_args()
    count, failures = run(args.url, args.scenario)
    for failure in failures:
        print("FAIL " + failure)
    print(f"{max(0, count - len(failures))} passed, {len(failures)} failed (AI Hub)")
    raise SystemExit(bool(failures))
