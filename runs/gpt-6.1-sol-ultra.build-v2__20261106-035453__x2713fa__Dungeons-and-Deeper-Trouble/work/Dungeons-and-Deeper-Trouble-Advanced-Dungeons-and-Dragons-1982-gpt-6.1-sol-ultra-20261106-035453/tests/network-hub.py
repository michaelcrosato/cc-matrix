"""Run the unchanged AI Hub harness against the actual root delivery artifact."""

import hashlib
import json
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from typing import Any
from urllib.parse import urlencode

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT.parent
config = json.loads((ROOT / "build-config.json").read_text())
ARTIFACT = WORK / config["filename"]
if len(sys.argv) > 1:
    ARTIFACT = Path(sys.argv[1]).resolve()
if not ARTIFACT.exists():
    print(
        "Hub harness: delivery artifact does not exist: " + str(ARTIFACT),
        file=sys.stderr,
    )
    sys.exit(1)
ARTIFACT_HASH = hashlib.sha256(ARTIFACT.read_bytes()).hexdigest()


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass


server = ThreadingHTTPServer(
    ("127.0.0.1", 0), partial(QuietHandler, directory=str(WORK))
)
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()
base = f"http://127.0.0.1:{server.server_port}"
harness = f"{base}/{ROOT.name}/vendor/hub/harness.html"
game = "/" + ARTIFACT.relative_to(WORK).as_posix()
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
    ("explicit-guest-removal", {"players": 2}),
]
results: list[dict[str, Any]] = []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            for name, settings in scenarios:
                context = browser.new_context(viewport={"width": 1280, "height": 720})
                page = context.new_page()
                errors = []
                page.on("pageerror", lambda e, failures=errors: failures.append(str(e)))
                try:
                    params = {"game": game, "auto": 1, "play": 4000, **settings}
                    page.goto(harness + "?" + urlencode(params), wait_until="load")
                    if name == "explicit-guest-removal":
                        page.wait_for_function(
                            "Array.from(document.querySelectorAll('iframe')).filter(f=>f.contentWindow.AIHub?.time()>=0).length===2",
                            timeout=25000,
                        )
                        page.wait_for_timeout(1000)
                        options = page.locator("#who option").all()
                        guest_id = options[-1].get_attribute("value")
                        page.locator("#who").select_option(guest_id)
                        page.locator("#remove").click()
                    page.wait_for_function(
                        "document.body.dataset.complete==='true'", timeout=45000
                    )
                    report = page.evaluate("window.__hubCheck")
                    # The unchanged harness proves the protocol; inspect actual game roles too.
                    copies = []
                    for frame in page.frames[1:]:
                        detail = frame.evaluate(
                            """() => window.__DT ? ({marker:document.body.dataset.game,server:AIHub.server===true,me:AIHub.me,roster:AIHub.players.map(p=>p.id),localId:__DT.app.localId,players:__DT.state.players.map(p=>p.id),tick:__DT.state.tick,frontend:__DT.app.frontend,attract:__DT.app.attract,ended:__DT.app.ended,autoPause:__DT.game.o.autoPause,net:__DT.app.net?.inspect()}) : null"""
                        )
                        if detail:
                            copies.append(detail)
                    report["gameCopies"] = copies
                    game_checks = []
                    if copies:
                        game_checks.append(
                            {
                                "name": "managed copies skip title/attract and end cleanly",
                                "pass": all(
                                    c["marker"] == "dungeons-and-deeper-trouble"
                                    and not c["frontend"]
                                    and not c["attract"]
                                    and c["ended"]
                                    and c["net"]["ended"]
                                    for c in copies
                                ),
                            }
                        )
                        game_checks.append(
                            {
                                "name": "all game traffic remains within rate and payload limits",
                                "pass": all(
                                    c["net"]["stats"]["maxRate"] <= 16
                                    and c["net"]["stats"]["maxBytes"] <= 16000
                                    for c in copies
                                ),
                            }
                        )
                        if name == "dedicated-server":
                            dedicated = [c for c in copies if c["server"]]
                            game_checks.append(
                                {
                                    "name": "actual dedicated simulation has no phantom local actor",
                                    "pass": len(dedicated) == 1
                                    and dedicated[0]["localId"] is None
                                    and dedicated[0]["me"]
                                    not in dedicated[0]["players"]
                                    and set(dedicated[0]["players"])
                                    == set(dedicated[0]["roster"])
                                    and dedicated[0]["tick"] > 0
                                    and dedicated[0]["autoPause"] is False,
                                }
                            )
                        if name == "explicit-guest-removal":
                            game_checks.append(
                                {
                                    "name": "actual authority removes departed avatar and continues",
                                    "pass": len(copies) == 1
                                    and len(copies[0]["players"]) == 1
                                    and copies[0]["tick"] > 0,
                                }
                            )
                    report["gameChecks"] = game_checks
                    report["pass"] = report["pass"] and all(
                        c["pass"] for c in game_checks
                    )
                    if errors:
                        report["pass"] = False
                        report["runtimeErrors"] = errors
                    results.append(
                        {
                            **report,
                            "harnessScenario": report.get("scenario"),
                            "scenario": name,
                            "parameters": params,
                        }
                    )
                except (
                    AssertionError,
                    PlaywrightError,
                    ValueError,
                    TypeError,
                    KeyError,
                ) as exc:
                    results.append(
                        {
                            "scenario": name,
                            "pass": False,
                            "error": str(exc),
                            "runtimeErrors": errors,
                        }
                    )
                finally:
                    context.close()
        finally:
            browser.close()
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=2)
(ROOT / "reports" / "hub-harness.json").write_text(
    json.dumps(
        {"artifact": ARTIFACT.name, "sha256": ARTIFACT_HASH, "results": results},
        indent=2,
    )
)
for item in results:
    if not item.get("pass"):
        print("Hub " + item["scenario"] + ": " + json.dumps(item), file=sys.stderr)
failed = sum(not item.get("pass") for item in results)
checks = sum(
    len(item.get("checks", [])) + len(item.get("gameChecks", [])) for item in results
)
print(
    f"Hub harness: {len(results) - failed} scenarios passed, {failed} failed; {checks} checks."
)
sys.exit(bool(failed))
