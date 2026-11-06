"""Official AI Hub browser conformance; run against an existing local HTTP server.
Usage: ~/.local/share/pipx/venvs/playwright/bin/python test-hub.py http://127.0.0.1:PORT/path/index.html
Only failures and one count line are printed. The official harness lives in ./hub/.
"""
import argparse
import sys
from urllib.parse import urlencode, urlsplit, urlunsplit
from playwright.sync_api import sync_playwright


def run_hub(browser, game_url, scenarios=("standard", "server", "host-leave")):
    parsed = urlsplit(game_url)
    game_path = parsed.path
    # The HTML and hub directory are siblings in the development directory.
    harness_path = game_path.rsplit("/", 1)[0] + "/hub/harness.html"
    failures = []
    count = 0
    for scenario in scenarios:
        query = urlencode({"game": game_path, "players": 2, "auto": 1, "play": 4000,
                           "latency": 150, "jitter": 50, "loss": 5,
                           "scenario": scenario, "seed": 1988})
        harness_url = urlunsplit((parsed.scheme, parsed.netloc, harness_path, query, ""))
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        try:
            page.goto(harness_url, wait_until="domcontentloaded")
            page.wait_for_function("document.body.dataset.complete === 'true'", timeout=90000)
            report = page.evaluate("window.__hubCheck")
            for check in report.get("checks", []):
                count += 1
                if not check.get("pass"):
                    failures.append(f"Hub {scenario}: {check['name']} — {check.get('detail', '')}")
            if not report.get("pass") and not report.get("checks"):
                failures.append(f"Hub {scenario}: no conformance checks returned")
        except Exception as error:
            failures.append(f"Hub {scenario}: {error}")
        finally:
            page.close()
    return count, failures


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("game_url")
    parser.add_argument("--scenario", action="append", choices=["standard", "server", "host-leave"])
    args = parser.parse_args()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=[
            "--enable-unsafe-webgpu", "--enable-features=Vulkan",
            "--use-angle=swiftshader", "--disable-dev-shm-usage",
        ])
        try:
            count, failures = run_hub(browser, args.game_url, args.scenario or ("standard", "server", "host-leave"))
        finally:
            browser.close()
    for failure in failures:
        print("FAIL:", failure)
    print(f"{count} Hub checks, {len(failures)} failures")
    sys.exit(bool(failures))
