"""Official AI Hub lifecycle checks for the final single HTML game.

Can be imported by the main test command: run_harness(browser, base_url, game_url).
CLI starts a private OS-selected loopback server and owns its complete lifecycle.
"""

from __future__ import annotations

import argparse
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlencode

DEV = Path(__file__).resolve().parent
ROOT = DEV.parent
SCENARIOS = (
    ("standard", {}),
    ("adverse-network", {"latency": 150, "jitter": 50, "loss": 5}),
    ("host-leave", {"scenario": "host-leave"}),
    ("dedicated-server", {"scenario": "server"}),
)


def run_harness(browser, base_url: str, game_url: str, scenarios=SCENARIOS) -> dict:
    """Run official unmodified harness; return results without writing/printing."""
    from playwright.sync_api import Error as PlaywrightError

    passed = 0
    failures = []
    reports = {}
    for name, extra in scenarios:
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error, captured=errors: captured.append(str(error)))
        params = {
            "game": game_url,
            "players": 2,
            "auto": 1,
            "play": 6000,
            "limit": 60,
            "seed": 23831983,
            **extra,
        }
        url = f"{base_url.rstrip('/')}/{DEV.name}/harness.html?{urlencode(params)}"
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            if "AI Hub" not in page.title():
                raise AssertionError(f"Unexpected harness page: {page.title()}")
            page.wait_for_function(
                "document.body.dataset.complete === 'true'", timeout=100000
            )
            report = page.evaluate("window.__hubCheck")
            reports[name] = report
            if not report or not report.get("done"):
                failures.append(f"AI Hub {name}: no completed harness report")
            else:
                for check in report.get("checks", []):
                    if check.get("pass"):
                        passed += 1
                    else:
                        failures.append(
                            f"AI Hub {name}: {check.get('name')}: {check.get('detail')}"
                        )
                if report.get("pass") is not True and all(
                    c.get("pass") for c in report.get("checks", [])
                ):
                    failures.append(f"AI Hub {name}: overall pass is false")
            if errors:
                failures.extend(
                    f"AI Hub {name} page error: {error}" for error in errors
                )
        except (PlaywrightError, AssertionError) as error:
            failures.append(f"AI Hub {name}: {error}")
            try:
                reports[name] = page.evaluate("window.__hubCheck || null")
            except PlaywrightError:
                reports[name] = None
        finally:
            context.close()
    return {
        "passed": passed,
        "failed": len(failures),
        "failures": failures,
        "reports": reports,
    }


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--game", default=f"/{DEV.name}.html")
    parser.add_argument("--base-url")
    parser.add_argument("--scenario", choices=[s[0] for s in SCENARIOS])
    parser.add_argument(
        "--report", help="Save detailed JSON report under the dev directory"
    )
    args = parser.parse_args()
    from playwright.sync_api import sync_playwright

    server = None
    if args.base_url:
        base_url = args.base_url
    else:
        server = ThreadingHTTPServer(
            ("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT))
        )
        Thread(target=server.serve_forever, daemon=True).start()
        base_url = f"http://127.0.0.1:{server.server_port}"
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                    "--use-angle=swiftshader",
                    "--disable-vulkan-surface",
                    "--disable-dev-shm-usage",
                ],
            )
            scenarios = tuple(
                s for s in SCENARIOS if not args.scenario or s[0] == args.scenario
            )
            result = run_harness(browser, base_url, args.game, scenarios=scenarios)
            browser.close()
        if args.report:
            report = (DEV / args.report).resolve()
            if report.parent != DEV:
                raise ValueError("Report must stay inside the game dev directory")
            report.write_text(json.dumps(result, indent=2))
        for failure in result["failures"]:
            print(f"FAIL {failure}")
        print(f"{result['passed']} AI Hub checks passed; {result['failed']} failed")
        return int(bool(result["failed"]))
    finally:
        if server:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    raise SystemExit(main())
