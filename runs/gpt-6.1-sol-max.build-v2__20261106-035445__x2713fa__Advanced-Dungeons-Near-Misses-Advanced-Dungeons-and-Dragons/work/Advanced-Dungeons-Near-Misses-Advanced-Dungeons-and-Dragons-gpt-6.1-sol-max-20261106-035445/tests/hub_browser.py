"""Run the unchanged AI Hub harness against the packed game.
The server is bound to an OS-selected localhost port, serves only the assigned
work folder, and is shut down by this process in every outcome.
"""

import argparse
import json
from pathlib import Path
from urllib.parse import urlencode

from network_browser import local_server
from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
IDENTITY = json.loads((DEV / "identity.json").read_text())
APP = "(globalThis.__NM || globalThis.NM?.app)"


def run(html=None):
    artifact = Path(html).resolve() if html else DEV.parent / IDENTITY["html"]
    assert artifact.is_file(), f"Packed game missing: {artifact}"
    assert artifact.parent == DEV.parent, "Serve only this task's assigned work folder"
    reports = []
    checks = 0
    scenarios = [
        ("two-player", {"players": 2}),
        ("adverse-network", {"players": 2, "latency": 150, "jitter": 50, "loss": 5}),
        (
            "host-leave",
            {
                "players": 2,
                "latency": 150,
                "jitter": 50,
                "loss": 5,
                "scenario": "host-leave",
            },
        ),
        ("dedicated-server", {"players": 2, "scenario": "server"}),
        ("one-player", {"players": 1}),
        ("guest-removal", {"players": 2}),
    ]
    try:
        with local_server(DEV.parent) as origin, sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                for name, options in scenarios:
                    page = browser.new_page(viewport={"width": 1280, "height": 800})
                    try:
                        query = urlencode(
                            {
                                "game": "/" + artifact.name,
                                "auto": 1,
                                "seed": 182,
                                **options,
                            }
                        )
                        page.goto(
                            f"{origin}/{DEV.name}/vendor/hub/harness.html?{query}"
                        )
                        page.wait_for_selector('iframe[title="Red Fox"]')
                        frame = (
                            page.locator('iframe[title="Red Fox"]')
                            .element_handle()
                            .content_frame()
                        )
                        frame.wait_for_function(
                            "document.title.includes('Advanced Dungeons')",
                            timeout=20000,
                        )
                        checks += 1
                        if name == "guest-removal":
                            frame.wait_for_function(
                                f"{APP}?.net?.running", timeout=25000
                            )
                            page.wait_for_timeout(800)
                            page.select_option("#who", "p1")
                            page.click("#remove")
                            frame.wait_for_function(
                                f"{APP}?.sim?.state.players.length===1", timeout=8000
                            )
                            checks += 1
                        if name == "dedicated-server":
                            server = (
                                page.locator('iframe[title="Server"]')
                                .element_handle()
                                .content_frame()
                            )
                            server.wait_for_function(
                                f"{APP}?.net?.running", timeout=25000
                            )
                            diagnostic = server.evaluate(
                                f"({{localSeat:{APP}.net.localSeat, role:{APP}.net.role, players:{APP}.sim.state.players.map(p=>p.seat), tick:{APP}.sim.state.tick}})"
                            )
                            assert (
                                diagnostic["localSeat"] is None
                                and diagnostic["role"] == "server"
                            ), diagnostic
                            assert sorted(diagnostic["players"]) == [1, 2], diagnostic
                            assert diagnostic["tick"] > 0, diagnostic
                            checks += 1
                        page.wait_for_function(
                            "document.body.dataset.complete === 'true'", timeout=45000
                        )
                        report = page.evaluate("window.__hubCheck")
                        reports.append({"case": name, "report": report})
                        failures = [c for c in report["checks"] if not c["pass"]]
                        assert report["pass"] is True, f"{name}: {failures}"
                        checks += len(report["checks"])
                        for child in page.frames[1:]:
                            if child.is_detached():
                                continue
                            diagnostic = child.evaluate(
                                f"{APP}?.net?.diagnostics || null"
                            )
                            if diagnostic:
                                assert diagnostic["maxBytes"] <= 15000, diagnostic
                                assert diagnostic["maxPerSecond"] <= 18, diagnostic
                                checks += 1
                    finally:
                        page.close()
            finally:
                browser.close()
    finally:
        (DEV / "docs" / "hub-test-report.json").write_text(
            json.dumps({"checks": checks, "cases": reports}, indent=2)
        )
    return checks


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--html")
    args = parser.parse_args()
    try:
        print(json.dumps({"hubBrowserChecks": run(args.html)}))
    except Exception as error:
        print(json.dumps({"failure": str(error)}))
        raise
