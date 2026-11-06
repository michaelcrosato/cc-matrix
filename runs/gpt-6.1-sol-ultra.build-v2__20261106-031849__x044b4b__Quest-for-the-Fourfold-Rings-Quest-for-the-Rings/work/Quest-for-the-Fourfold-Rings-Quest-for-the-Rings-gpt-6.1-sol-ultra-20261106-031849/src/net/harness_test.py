"""Real vendored Hub conformance checks; invoked by the central test wrapper."""

from __future__ import annotations

import argparse
import functools
import hashlib
import http.server
import json
import os
import threading
import time
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[2]
WORK = DEV.parent
TITLE = "Quest for the Fourfold Rings"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, _format, *_args):
        pass


def run(game: Path, evidence: Path, names: list[str] | None = None) -> dict:
    scenarios = [
        ("two-player", {"players": "2"}),
        (
            "bad-network",
            {"players": "2", "latency": "150", "jitter": "50", "loss": "5"},
        ),
        ("host-departure", {"players": "2", "scenario": "host-leave"}),
        ("server-authority", {"players": "2", "scenario": "server"}),
        ("one-player", {"players": "1"}),
        ("nonhost-departure", {"players": "2"}),
    ]
    if names:
        scenarios = [(name, options) for name, options in scenarios if name in names]
    if not game.is_file():
        raise FileNotFoundError(f"Bundled game is absent: {game}")
    handler = functools.partial(QuietHandler, directory=str(WORK))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    port = httpd.server_address[1]
    base = f"http://127.0.0.1:{port}/"
    harness = DEV / "vendor/hub/harness.html"
    harness_relative = harness.relative_to(WORK).as_posix()
    game_relative = os.path.relpath(game, harness.parent).replace(os.sep, "/")
    result = {
        "game": str(game.relative_to(WORK)),
        "sha256": hashlib.sha256(game.read_bytes()).hexdigest(),
        "protocol": 1,
        "client": "1.4.0",
        "engine": "pinned-native",
        "environment": "Chromium 153 via Playwright Python 1.63.0; loopback ephemeral port; synthetic remote peers",
        "scenarios": [],
        "passed": 0,
        "failed": 0,
        "failures": [],
    }
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                for name, options in scenarios:
                    context = browser.new_context(
                        viewport={"width": 1280, "height": 800}
                    )
                    page = context.new_page()
                    errors: list[str] = []
                    page.on(
                        "pageerror",
                        lambda error, captured=errors: captured.append(str(error)),
                    )
                    scenario = {
                        "name": name,
                        "options": options,
                        "errors": errors,
                        "startedAt": time.time(),
                    }
                    try:
                        # Confirm the server is serving this game's actual emitted artifact.
                        response = context.request.get(
                            base + game.relative_to(WORK).as_posix()
                        )
                        if response.status != 200 or TITLE not in response.text():
                            raise AssertionError(
                                "Served game identity did not match the finished title"
                            )
                        query = {
                            "game": game_relative,
                            "auto": "1",
                            "seed": "4169",
                            "play": "6000",
                            **options,
                        }
                        page.goto(
                            base + harness_relative + "?" + urlencode(query),
                            wait_until="domcontentloaded",
                        )
                        if name == "nonhost-departure":
                            page.wait_for_function(
                                """() => [...document.querySelectorAll('iframe')].filter(f => {
                                    try { return f.contentWindow.AIHub && f.contentWindow.AIHub.time() >= 0; }
                                    catch { return false; }
                                }).length >= 2""",
                                timeout=40000,
                            )
                            page.locator("#who").select_option(index=1)
                            page.locator("#remove").click()
                        page.wait_for_function(
                            "document.body.dataset.complete === 'true'", timeout=50000
                        )
                        report = page.evaluate("window.__hubCheck")
                        scenario["report"] = report
                        for check in report.get("checks", []):
                            if check["pass"]:
                                result["passed"] += 1
                            else:
                                result["failed"] += 1
                                result["failures"].append(
                                    f"{name}: {check['name']}: {check.get('detail', '')}"
                                )
                        if not report.get("pass") and not any(
                            not c["pass"] for c in report.get("checks", [])
                        ):
                            result["failed"] += 1
                            result["failures"].append(
                                f"{name}: harness did not report pass"
                            )
                        if errors:
                            result["failed"] += 1
                            result["failures"].append(
                                f"{name}: page errors: {'; '.join(errors[:3])}"
                            )
                        scenario["frames"] = page.evaluate(
                            """() => [...document.querySelectorAll('iframe')].map(f => {
                                try { const w=f.contentWindow; return {title:w.document.title, me:w.AIHub?.me,
                                host:w.AIHub?.host,server:w.AIHub?.server,time:w.AIHub?.time(),probe:w.AIHub?.inspect()}; }
                                catch(e) { return {error:String(e)}; }
                            })"""
                        )
                    except (
                        PlaywrightError,
                        OSError,
                        AssertionError,
                        ValueError,
                    ) as error:
                        result["failed"] += 1
                        result["failures"].append(f"{name}: {error}")
                        scenario["error"] = str(error)
                        try:
                            scenario["report"] = page.evaluate(
                                "window.__hubCheck || null"
                            )
                        except PlaywrightError as report_error:
                            scenario["reportError"] = str(report_error)
                    finally:
                        scenario["seconds"] = round(
                            time.time() - scenario["startedAt"], 2
                        )
                        result["scenarios"].append(scenario)
                        context.close()
            finally:
                browser.close()
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join(timeout=2)
    evidence.parent.mkdir(parents=True, exist_ok=True)
    evidence.write_text(
        json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--game", type=Path, default=WORK / (DEV.name + ".html"))
    parser.add_argument(
        "--evidence", type=Path, default=DEV / "evidence/hub-conformance.json"
    )
    parser.add_argument("--scenario", action="append")
    args = parser.parse_args()
    try:
        output = run(args.game.resolve(), args.evidence.resolve(), args.scenario)
    except (PlaywrightError, OSError, AssertionError, ValueError) as error:
        output = {"passed": 0, "failed": 1, "failures": [str(error)]}
    for failure in output["failures"]:
        print("FAIL " + failure)
    print(f"{output['passed']} passed, {output['failed']} failed")
    raise SystemExit(1 if output["failed"] else 0)
