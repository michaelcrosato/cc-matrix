"""Run the supplied AI Hub browser harness against the packaged delivery."""

import argparse
import functools
import http.server
import json
import threading
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def run():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", action="append")
    args = parser.parse_args()
    dev = Path(__file__).resolve().parent.parent
    root = dev.parent
    identity = json.loads((dev / "identity.json").read_text())
    handler = functools.partial(QuietHandler, directory=str(root))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    base = f"http://127.0.0.1:{server.server_port}"
    game = f"/{identity['slug']}.html"
    scenarios = args.scenario or ["standard", "loss", "server", "host-leave"]
    failures, reports = [], []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            for scenario in scenarios:
                page = browser.new_page(viewport={"width": 1600, "height": 1000})
                errors = []
                page.on(
                    "pageerror", lambda error, errors=errors: errors.append(str(error))
                )
                params = {"game": game, "players": "2", "auto": "1", "seed": "47"}
                if scenario == "loss":
                    params.update(latency="150", jitter="50", loss="5")
                else:
                    params.update(latency="60", jitter="20", loss="0")
                if scenario in ("server", "host-leave"):
                    params["scenario"] = scenario
                url = f"{base}/{identity['slug']}/vendor/hub/harness.html?{urlencode(params)}"
                try:
                    page.goto(url)
                    overlay = None
                    if scenario == "standard":
                        page.wait_for_function(
                            "[...document.querySelectorAll('iframe')].some(f=>f.contentWindow.__TSS?.net?.playing)",
                            timeout=25000,
                        )
                        host_frame = next(
                            frame
                            for frame in page.frames
                            if frame != page.main_frame
                            and frame.evaluate("!!window.__TSS?.net?.isHost")
                        )
                        before = host_frame.evaluate(
                            "(()=>{const a=__TSS;a.game.pause();return a.sim.state.tick})()"
                        )
                        page.wait_for_timeout(350)
                        overlay = host_frame.evaluate(
                            "(()=>{const a=__TSS;return {tick:a.sim.state.tick,paused:a.game.paused,screen:a.ui.shell.screen,intents:a.controls.read(a.sim,a.net.localSeat)}})()"
                        )
                        if not overlay["paused"] or overlay["tick"] <= before + 5:
                            failures.append(
                                f"standard: host world stopped under local pause: {overlay}"
                            )
                        if any(
                            value["dir"] != -1 or value["bomb"]
                            for value in overlay["intents"].values()
                        ):
                            failures.append(
                                f"standard: paused local seat continued sending movement: {overlay}"
                            )
                        host_frame.evaluate("__TSS.ui.shell.hide();__TSS.game.resume()")
                    page.wait_for_function(
                        "document.body.dataset.complete === 'true'", timeout=55000
                    )
                    report = page.evaluate("window.__hubCheck")
                    frames = [
                        frame for frame in page.frames if frame != page.main_frame
                    ]
                    identities = [
                        frame.evaluate("document.body.dataset.game || ''")
                        for frame in frames
                    ]
                    snapshots = [
                        frame.evaluate("window.__game?.debug?.snapshot?.()")
                        for frame in frames
                    ]
                    if any(value != identity["slug"] for value in identities):
                        failures.append(
                            f"{scenario}: loaded frame identity mismatch {identities}"
                        )
                    if not report.get("pass"):
                        failures.extend(
                            f"{scenario}: {check['name']}: {check.get('detail', '')}"
                            for check in report.get("checks", [])
                            if not check["pass"]
                        )
                    if errors:
                        failures.append(f"{scenario}: browser runtime errors: {errors}")
                    for snapshot in snapshots:
                        if snapshot and snapshot.get("errors"):
                            failures.append(
                                f"{scenario}: native game errors: {snapshot['errors']}"
                            )
                    reports.append(
                        {
                            "scenario": scenario,
                            "pass": report.get("pass"),
                            "checks": report.get("checks"),
                            "identities": identities,
                            "network": [
                                s.get("network") if s else None for s in snapshots
                            ],
                            "overlay": overlay,
                        }
                    )
                except (PlaywrightError, KeyError, ValueError) as error:
                    detail = page.evaluate(
                        "({check:window.__hubCheck,log:document.querySelector('#log')?.textContent,round:document.querySelector('#round')?.textContent})"
                    )
                    failures.append(f"{scenario}: {error}; {json.dumps(detail)}")
                finally:
                    page.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        worker.join(timeout=5)
    (dev / "build" / "hub-browser-results.json").write_text(
        json.dumps(
            {"count": len(scenarios), "failures": failures, "reports": reports},
            indent=2,
        )
    )
    for failure in failures:
        print(failure)
    print(
        f"{sum(bool(r.get('pass')) for r in reports)}/{len(scenarios)} Hub browser checks passed"
    )
    raise SystemExit(1 if failures else 0)


if __name__ == "__main__":
    run()
