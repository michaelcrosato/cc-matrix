"""Official AI Hub protocol conformance, reusable by the unified test runner.

API: failures, test_count = test_hub(browser, base_url, game_filename)
The caller owns browser/server lifetime. Pass a browser factory to isolate each
scenario in a fresh Chromium process (recommended with SwiftShader).
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.parse import urlencode

PROJECT = Path(__file__).resolve().parents[1]
DEFAULT_GAME = PROJECT.name + ".html"


def test_hub(browser, base_url, game_filename=DEFAULT_GAME, scenarios=None):
    """Return (failures, count). ``browser`` may be a browser or zero-arg factory."""
    if scenarios is None:
        scenarios = (
            ("standard", {"players": 2}),
            (
                "adverse-network",
                {"players": 2, "latency": 150, "jitter": 50, "loss": 5},
            ),
            ("server", {"players": 2, "scenario": "server"}),
            ("host-leave", {"players": 2, "scenario": "host-leave"}),
        )
    failures = []
    test_count = 0
    reports = []
    for name, config in scenarios:
        scenario_browser = browser() if callable(browser) else browser
        context = scenario_browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page_errors = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        parameters = {
            "game": "../" + game_filename.lstrip("/"),
            "auto": 1,
            "play": 4000,
            "limit": 120,
            **config,
        }
        url = (
            base_url.rstrip("/")
            + "/"
            + PROJECT.name
            + "/harness.html?"
            + urlencode(parameters)
        )
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_function(
                "document.body.dataset.complete === 'true' && window.__hubCheck?.done",
                timeout=120000,
            )
            report = page.evaluate("window.__hubCheck")
            reports.append({**report, "scenario": name})
            for result in report.get("checks", []):
                test_count += 1
                if not result.get("pass"):
                    detail = result.get("detail", "")
                    failures.append(
                        f"Hub {name}: {result['name']}"
                        + (f" — {detail}" if detail else "")
                    )
            test_count += 1
            if not report.get("pass"):
                failures.append(f"Hub {name}: overall official harness result failed")
            test_count += 1
            if page_errors:
                failures.append(
                    f"Hub {name}: browser errors — " + "; ".join(page_errors[:5])
                )
        except Exception as error:
            test_count += 1
            detail = str(error).split("\n")[0]
            try:
                report = page.evaluate("window.__hubCheck || null")
                if report:
                    reports.append({**report, "scenario": name})
                    failed = [r for r in report.get("checks", []) if not r.get("pass")]
                    if failed:
                        detail += "; " + "; ".join(
                            r["name"] + ": " + r.get("detail", "") for r in failed
                        )
                    detail += "; " + "; ".join(report.get("log", [])[-4:])
            except Exception:
                pass
            failures.append(f"Hub {name}: {detail}")
        finally:
            context.close()
            if callable(browser):
                scenario_browser.close()
    (PROJECT / "tests" / "hub-results.json").write_text(json.dumps(reports, indent=2))
    return failures, test_count


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "base_url", help="Root workspace HTTP origin, e.g. http://127.0.0.1:43210"
    )
    parser.add_argument("game_filename", nargs="?", default=DEFAULT_GAME)
    parser.add_argument(
        "--scenario", choices=["standard", "server", "host-leave", "adverse-network"]
    )
    args = parser.parse_args()
    from playwright.sync_api import sync_playwright

    scenarios = None
    if args.scenario:
        config = {"players": 2}
        if args.scenario in ("server", "host-leave"):
            config["scenario"] = args.scenario
        elif args.scenario == "adverse-network":
            config.update(latency=150, jitter=50, loss=5)
        scenarios = [(args.scenario, config)]
    with sync_playwright() as playwright:

        def browser_factory():
            return playwright.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                    "--enable-unsafe-swiftshader",
                    "--use-gl=angle",
                    "--use-angle=swiftshader",
                ],
            )

        failures, count = test_hub(
            browser_factory, args.base_url, args.game_filename, scenarios
        )
    for failure in failures:
        print("FAIL " + failure)
    print(f"{count - len(failures)}/{count} Hub checks passed")
    return bool(failures)


if __name__ == "__main__":
    raise SystemExit(main())
