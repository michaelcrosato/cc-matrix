"""Official, unmodified AI Hub harness tests; importable by the complete game suite.

Run with the preinstalled Playwright Python interpreter:
  python hub-check.py http://127.0.0.1:PORT /Upstream-Uproar-....html
"""

import argparse
import re
from pathlib import Path
from urllib.parse import urlencode, urljoin

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

WEBGPU_ARGS = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-webgpu-adapter=swiftshader",
    "--disable-dev-shm-usage",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--autoplay-policy=no-user-gesture-required",
]


def run_hub_tests(browser, base_url, game_path):
    """Return (passed assertion count, failure strings); print nothing.

    The server must serve the workspace root. game_path is root-relative or
    an absolute URL on that server. Only one harness page exists at a time.
    """
    passed = 0
    failures = []
    base_url = base_url.rstrip("/") + "/"
    target = urljoin(base_url, game_path)
    harness = urljoin(base_url, Path(__file__).parent.name + "/harness.html")
    scenarios = [
        ("two players", {"players": 2}),
        (
            "four players with latency, jitter and loss",
            {"players": 4, "latency": 150, "jitter": 50, "loss": 5},
        ),
        (
            "host departure with latency, jitter and loss",
            {
                "players": 4,
                "latency": 150,
                "jitter": 50,
                "loss": 5,
                "scenario": "host-leave",
            },
        ),
    ]
    context = browser.new_context(
        viewport={"width": 960, "height": 720}, device_scale_factor=1
    )
    try:
        response = context.request.get(target)
        html = response.text()
        if response.status != 200 or not re.search(
            r"<title>[^<]*Upstream\s+Uproar", html, re.IGNORECASE
        ):
            return 0, [
                f"AI Hub identity: expected Upstream Uproar HTML at {target}; HTTP {response.status}"
            ]
        passed += 1
        for label, settings in scenarios:
            page = context.new_page()
            params = {
                "game": target,
                "auto": 1,
                "seed": 1982,
                "play": 6000,
                "limit": 60,
                **settings,
            }
            try:
                page.goto(
                    harness + "?" + urlencode(params),
                    wait_until="domcontentloaded",
                    timeout=30000,
                )
                page.wait_for_function(
                    "window.__hubCheck?.done === true", timeout=95000
                )
                report = page.evaluate("window.__hubCheck")
                checks = report.get("checks", [])
                if not checks:
                    failures.append(f"AI Hub {label}: harness produced no assertions")
                for check in checks:
                    if check.get("pass"):
                        passed += 1
                    else:
                        detail = check.get("detail", "")
                        failures.append(
                            f"AI Hub {label}: {check.get('name', 'unnamed check')} — {detail}"
                        )
                if not report.get("pass") and all(c.get("pass") for c in checks):
                    failures.append(
                        f"AI Hub {label}: final harness pass flag was false"
                    )
            except PlaywrightError as error:
                failures.append(f"AI Hub {label}: {str(error).splitlines()[0]}")
                try:
                    progress = page.evaluate("window.__hubCheck || null")
                    if progress:
                        for check in progress.get("checks", []):
                            if not check.get("pass"):
                                failures.append(
                                    f"AI Hub {label}: {check.get('name')} — {check.get('detail', '')}"
                                )
                        for line in progress.get("log", [])[-4:]:
                            failures.append(f"AI Hub {label} log: {line}")
                except PlaywrightError as diagnostic_error:
                    failures.append(
                        f"AI Hub {label}: diagnostic unavailable: {str(diagnostic_error).splitlines()[0]}"
                    )
            finally:
                page.close()
    finally:
        context.close()
    return passed, failures


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_url")
    parser.add_argument("game_path")
    args = parser.parse_args()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=WEBGPU_ARGS)
        try:
            passed, failures = run_hub_tests(browser, args.base_url, args.game_path)
        finally:
            browser.close()
    for failure in failures:
        print("FAIL " + failure)
    print(f"{passed}/{passed + len(failures)} AI Hub checks passed")
    raise SystemExit(bool(failures))


if __name__ == "__main__":
    main()
