"""Official Hub conformance; pass an existing localhost server URL."""
import argparse
import json
from pathlib import Path
from urllib.parse import quote, urlencode

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent


def run_hub_harness(base_url, scenarios=("standard", "server")):
    info = json.loads((ROOT / "build-info.json").read_text())
    stem = info["stem"]
    reports = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--use-angle=swiftshader",
                "--enable-unsafe-swiftshader",
                "--use-webgpu-adapter=swiftshader",
                "--disable-background-timer-throttling",
                "--disable-backgrounding-occluded-windows",
                "--disable-renderer-backgrounding",
            ],
        )
        try:
            for scenario in scenarios:
                page = browser.new_page(viewport={"width": 1280, "height": 720})
                runtime_errors = []
                page.on("pageerror", lambda error: runtime_errors.append(str(error)))
                page.on("console", lambda message: runtime_errors.append(message.text) if message.type == "error" else None)
                query = urlencode(
                    {
                        "game": "../" + stem + ".html",
                        "players": "2",
                        "auto": "1",
                        "scenario": scenario,
                        "latency": "150",
                        "jitter": "50",
                        "loss": "5",
                    }
                )
                url = base_url.rstrip("/") + "/" + quote(stem) + "/hub-harness.html?" + query
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=30000)
                    assert page.title() == "AI Hub Session Harness", "Wrong page served"
                    page.wait_for_function("window.__hubCheck?.done", timeout=100000)
                    report = page.evaluate("window.__hubCheck")
                    report["runtimeErrors"] = runtime_errors
                    report["frames"] = []
                    for frame in page.frames[1:]:
                        try:
                            report["frames"].append(frame.evaluate("({hub:window.AIHub?.inspect?.(),net:window.CavernNet?.status?.(),game:window.__game?.getState?.(),bootError:window.__bootError||null})"))
                        except Exception as error:
                            report["frames"].append({"inspectionError": str(error)})
                    reports.append(report)
                except Exception as error:
                    reports.append({"scenario": scenario, "pass": False, "checks": [{"name": "harness completed", "pass": False, "detail": str(error)}]})
                finally:
                    page.close()
        finally:
            browser.close()
    (ROOT / "hub-conformance-results.json").write_text(json.dumps(reports, indent=2))
    return reports


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("base_url")
    parser.add_argument("--scenarios", nargs="+", default=["standard", "server"])
    args = parser.parse_args()
    reports = run_hub_harness(args.base_url, args.scenarios)
    checks = [(report["scenario"], check) for report in reports for check in report["checks"]]
    for scenario, check in checks:
        if not check["pass"]:
            print(f"FAIL Hub {scenario}: {check['name']}: {check.get('detail', '')}")
    failures = sum(not check["pass"] for _, check in checks)
    print(f"{len(checks)} Hub checks, {failures} failures")
    return int(bool(failures))


if __name__ == "__main__":
    raise SystemExit(main())
