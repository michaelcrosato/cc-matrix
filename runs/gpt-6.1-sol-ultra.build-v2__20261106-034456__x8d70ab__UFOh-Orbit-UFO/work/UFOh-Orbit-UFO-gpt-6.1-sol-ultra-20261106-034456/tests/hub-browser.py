"""Conformance for the exact packaged game. Run only via the test coordinator."""

from __future__ import annotations

import functools
import http.server
import importlib.util
import json
import os
import threading
import traceback
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parents[1]
ARTIFACTS = BASE / "artifacts"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def run():
    result = {"passed": 0, "failed": 0, "failures": []}
    reports = []
    ARTIFACTS.mkdir(exist_ok=True)
    if not (BASE / "build/game.html").is_file():
        return {
            "passed": 0,
            "failed": 1,
            "failures": ["Hub browser: build/game.html missing"],
        }
    handler = functools.partial(QuietHandler, directory=str(BASE))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    origin = f"http://127.0.0.1:{server.server_port}"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 900})
            page = context.new_page()
            cases = [
                ("normal-two", {"players": 2}),
                (
                    "latency-jitter-loss",
                    {"players": 2, "latency": 150, "jitter": 50, "loss": 5},
                ),
                ("host-leave", {"players": 2, "scenario": "host-leave"}),
                ("server-host", {"players": 2, "scenario": "server"}),
                ("one-player", {"players": 1}),
            ]
            if os.environ.get("ORBIT_HUB_GAMEPLAY_ONLY") == "1":
                cases = []
            for name, options in cases:
                errors = []

                def error_listener(error, collected=errors):
                    collected.append(str(error))

                page.on("pageerror", error_listener)
                try:
                    query = {
                        "game": "../../build/game.html",
                        "auto": 1,
                        "play": 1600,
                        "seed": 7,
                        "limit": 30,
                        **options,
                    }
                    page.goto(
                        origin + "/vendor/hub/harness.html?" + urlencode(query),
                        wait_until="load",
                    )
                    page.wait_for_function(
                        "document.body.dataset.complete === 'true'", timeout=50000
                    )
                    report = page.evaluate("window.__hubCheck")
                    reports.append({"case": name, **report})
                    for check in report["checks"]:
                        if check["pass"]:
                            result["passed"] += 1
                        else:
                            result["failed"] += 1
                            result["failures"].append(
                                f"Hub {name}: {check['name']}: {check.get('detail', '')}"
                            )
                    if errors:
                        result["failed"] += 1
                        result["failures"].append(
                            f"Hub {name}: browser errors: {errors}"
                        )
                    else:
                        result["passed"] += 1
                    frames = [f for f in page.frames if "/build/game.html" in f.url]
                    for frame in frames:
                        inspect = frame.evaluate("""() => {
                          const game=window.__game;
                          const data=game?.debug?.snapshot?.();
                          return {title:document.title,client:window.AIHub?.version,errors:game?.errors||[],data};
                        }""")
                        if (
                            inspect["client"] != "1.4.0"
                            or "UFOh Orbit" not in inspect["title"]
                            or inspect["errors"]
                        ):
                            result["failed"] += 1
                            result["failures"].append(
                                f"Hub {name}: exact artifact identity/client/draw errors: {inspect}"
                            )
                        else:
                            result["passed"] += 1
                        (
                            ARTIFACTS / f"hub-{name}-{len(reports)}-snapshot.json"
                        ).write_text(json.dumps(inspect, indent=2))
                except Exception:  # noqa: BLE001 - collect test failures for the coordinator.
                    result["failed"] += 1
                    result["failures"].append(f"Hub {name}: {traceback.format_exc()}")
                finally:
                    page.remove_listener("pageerror", error_listener)
            try:
                spec = importlib.util.spec_from_file_location(
                    "hub_gameplay", BASE / "tests/hub-gameplay.py"
                )
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                extra = module.gameplay(page, origin, BASE)
                result["passed"] += extra["passed"]
                result["failed"] += extra["failed"]
                result["failures"].extend(extra["failures"])
            except Exception:  # noqa: BLE001 - collect test failures for the coordinator.
                result["failed"] += 1
                result["failures"].append(
                    "Hub two-page gameplay: " + traceback.format_exc()
                )
                snapshots = []
                for frame in page.frames:
                    if "/build/game.html" in frame.url:
                        try:
                            snapshots.append(frame.evaluate("__game.debug.snapshot()"))
                        except Exception as error:  # noqa: BLE001 - preserve diagnostic failure.
                            snapshots.append({"inspectionError": str(error)})
                (ARTIFACTS / "hub-gameplay-failure.json").write_text(
                    json.dumps(snapshots, indent=2)
                )
            context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        worker.join(timeout=2)
        (ARTIFACTS / "hub-browser-report.json").write_text(
            json.dumps({"result": result, "cases": reports}, indent=2)
        )
    return result


if __name__ == "__main__":
    print(json.dumps(run()))
