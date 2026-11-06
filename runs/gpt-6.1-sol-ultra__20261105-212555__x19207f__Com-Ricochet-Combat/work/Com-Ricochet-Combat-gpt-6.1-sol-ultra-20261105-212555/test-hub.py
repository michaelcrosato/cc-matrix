"""Official AI Hub conformance runner.

Usage: playwright-python test-hub.py HARNESS_DIRECTORY_URL GAME_RELATIVE_PATH
Example: test-hub.py http://127.0.0.1:12345/DevFolder/ ../Game.html
The four scenarios run sequentially with one fresh Chromium at a time. Pinned
CDN dependencies are fulfilled from the exact downloaded vendor copies, so
network availability does not affect protocol tests.
"""

import json
import sys
from pathlib import Path
from urllib.parse import urlencode, urljoin, urlparse

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
WEBGPU_ARGS = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-webgpu-adapter=swiftshader",
    "--disable-dev-shm-usage",
]
SCENARIOS = [
    ("two-player", {"players": 2}),
    ("four-player-impaired", {"players": 4, "latency": 150, "jitter": 50, "loss": 5}),
    (
        "host-leave",
        {
            "players": 4,
            "latency": 150,
            "jitter": 50,
            "loss": 5,
            "scenario": "host-leave",
        },
    ),
    ("dedicated-server", {"players": 2, "scenario": "server"}),
]


def vendor_route(route):
    path = urlparse(route.request.url).path
    mapping = {
        "/npm/three@0.180.0/build/three.webgpu.js": "three.webgpu.js",
        "/npm/three@0.180.0/build/three.core.js": "three.core.js",
        "/npm/three@0.180.0/build/three.tsl.js": "three.tsl.js",
        "/npm/@dimforge/rapier3d-compat@0.19.3/rapier.mjs": "rapier.js",
    }
    filename = mapping.get(path)
    local = ROOT / "vendor" / filename if filename else None
    if local and local.is_file():
        route.fulfill(
            path=str(local),
            content_type="application/javascript; charset=utf-8",
            headers={"access-control-allow-origin": "*"},
        )
    else:
        route.continue_()


def run_hub(base_url, game_path):
    failures = []
    reports = []
    count = 0
    with sync_playwright() as playwright:
        for name, scenario in SCENARIOS:
            # SwiftShader can retain devices from destroyed WebGPU iframes.
            # A fresh GPU process per scenario keeps this headless stand-in
            # independent of the renderer contexts used by the previous one.
            browser = playwright.chromium.launch(headless=True, args=WEBGPU_ARGS)
            try:
                context = browser.new_context(
                    ignore_https_errors=True,
                    viewport={"width": 1280, "height": 900},
                )
                context.route("https://cdn.jsdelivr.net/**", vendor_route)
                response = context.request.get(urljoin(base_url, game_path))
                game_html = response.text()
                count += 1
                if (
                    not response.ok
                    or "Com-Ricochet" not in game_html
                    or 'name="hub:session"' not in game_html
                ):
                    failures.append(
                        "The server did not return the Com-Ricochet game with Hub metadata."
                    )
                    return failures, count, reports
                page = context.new_page()
                errors = []
                page.on(
                    "pageerror", lambda error, target=errors: target.append(str(error))
                )
                params = {
                    "game": game_path,
                    "auto": 1,
                    "seed": 1977,
                    "limit": 60,
                    **scenario,
                }
                url = urljoin(base_url, "harness.html") + "?" + urlencode(params)
                report = {"scenarioName": name, "url": url}
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    page.wait_for_function(
                        "document.body.dataset.complete === 'true'", timeout=120000
                    )
                    result = page.evaluate("window.__hubCheck")
                    report.update(result or {})
                    checks = (result or {}).get("checks", [])
                    count += len(checks) + 2
                    for check in checks:
                        if not check.get("pass"):
                            failures.append(
                                f"{name}: {check.get('name')}: {check.get('detail', '')}"
                            )
                    if not result or not result.get("pass"):
                        failures.append(
                            f"{name}: official window.__hubCheck.pass was not true."
                        )
                    if errors:
                        failures.append(
                            f"{name}: browser errors: {'; '.join(errors[:5])}"
                        )
                    # Keep browser errors in the machine-readable report as well.
                    report["browserErrors"] = errors
                except PlaywrightError as error:
                    count += 1
                    failures.append(f"{name}: {type(error).__name__}: {error}")
                    report["runnerError"] = str(error)
                    try:
                        report["partial"] = page.evaluate("window.__hubCheck || null")
                    except PlaywrightError as partial_error:
                        report["partialError"] = str(partial_error)
                reports.append(report)
                page.close()
                context.close()
            finally:
                browser.close()
    return failures, count, reports


def main():
    if len(sys.argv) != 3:
        print("FAIL: usage: test-hub.py HARNESS_DIRECTORY_URL GAME_RELATIVE_PATH")
        print("0/1 AI Hub checks passed")
        return 1
    failures, count, reports = run_hub(sys.argv[1].rstrip("/") + "/", sys.argv[2])
    (ROOT / "test-hub-report.json").write_text(
        json.dumps(
            {"failures": failures, "checks": count, "scenarios": reports}, indent=2
        )
        + "\n"
    )
    for failure in failures:
        print("FAIL: " + failure)
    print(f"{count - len(failures)}/{count} AI Hub checks passed")
    return int(bool(failures))


if __name__ == "__main__":
    raise SystemExit(main())
