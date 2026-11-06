"""Run official AI Hub browser checks; print only failures and one count."""

import argparse
import functools
import http.server
import json
import pathlib
import threading
from urllib.parse import quote

from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
GAME = HERE.name + ".html"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def run_checks(scenarios=None):
    scenarios = scenarios or ["standard", "server", "host-leave", "latency"]
    failures, results = [], []
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    count = 0
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                    "--disable-dev-shm-usage",
                ],
            )
            try:
                for scenario in scenarios:
                    context = browser.new_context(
                        ignore_https_errors=True,
                        viewport={"width": 1280, "height": 800},
                    )
                    page = context.new_page()
                    errors = []
                    page.on("pageerror", lambda e, errors=errors: errors.append(str(e)))
                    qs = (
                        "game=" + quote("../../" + GAME) + "&players=2&auto=1&play=1800"
                    )
                    if scenario == "latency":
                        qs += "&latency=150&jitter=50&loss=5"
                    elif scenario != "standard":
                        qs += "&scenario=" + scenario
                    page.goto(
                        base + "/" + HERE.name + "/hub/harness.html?" + qs,
                        wait_until="domcontentloaded",
                    )
                    try:
                        page.wait_for_function(
                            "document.body.dataset.complete === 'true'", timeout=120000
                        )
                        report = page.evaluate("window.__hubCheck")
                        rows = report.get("checks", [])
                        count += len(rows)
                        for check in rows:
                            if not check["pass"]:
                                failures.append(
                                    f"{scenario}: {check['name']}: {check.get('detail', '')}"
                                )
                        states = []
                        for frame in page.frames[1:]:
                            try:
                                before = frame.evaluate("window.__game?.getState()")
                                states.append(before)
                                if not before:
                                    continue
                                count += 1
                                if before.get("audio", {}).get("contextState") not in [
                                    "suspended",
                                    "closed",
                                    "locked",
                                ]:
                                    failures.append(
                                        f"{scenario}: Hub end must stop all audio, context is {before.get('audio', {}).get('contextState')}"
                                    )
                                frame.evaluate(
                                    "() => { const g=window.__game; g.dev('retry'); g.dev('title'); }"
                                )
                                page.wait_for_timeout(200)
                                after = frame.evaluate("window.__game.getState()")
                                count += 1
                                if after.get("mode") != before.get("mode") or after.get(
                                    "elapsed"
                                ) != before.get("elapsed"):
                                    failures.append(
                                        f"{scenario}: input after Hub end changed the round"
                                    )
                                count += 1
                                if after.get("audio", {}).get("contextState") not in [
                                    "suspended",
                                    "closed",
                                    "locked",
                                ]:
                                    failures.append(
                                        f"{scenario}: input after Hub end restarted audio"
                                    )
                            except Exception as exc:  # noqa: BLE001 - test runner records any failure
                                count += 1
                                failures.append(
                                    f"{scenario}: end-state inspection failed: {exc}"
                                )
                        results.append(
                            {
                                "scenario": scenario,
                                "pass": report.get("pass"),
                                "checks": rows,
                                "states": states,
                                "errors": errors,
                            }
                        )
                    except Exception as exc:  # noqa: BLE001 - test runner records any failure
                        count += 1
                        failures.append(f"{scenario}: harness did not finish: {exc}")
                        results.append(
                            {
                                "scenario": scenario,
                                "pass": False,
                                "report": page.evaluate("window.__hubCheck || null"),
                                "errors": errors,
                            }
                        )
                    context.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
    (HERE / "integration-results.json").write_text(json.dumps(results, indent=2))
    return count, failures


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", action="append", dest="scenarios")
    args = parser.parse_args()
    count, failures = run_checks(args.scenarios)
    for failure in failures:
        print("FAIL hub: " + failure)
    print(f"{count - len(failures)}/{count} Hub integration checks passed")
    raise SystemExit(bool(failures))
