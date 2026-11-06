"""Real released AI Hub harness against the exact self-contained HTML artifact.
Run with the workstation's pinned Playwright Python, passing final HTML path.
Only failures and one assertion count are printed. Evidence stays in artifacts/.
"""

from __future__ import annotations

import functools
import http.server
import json
import pathlib
import shutil
import sys
import threading
import urllib.parse

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)
source = (
    pathlib.Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "index.html"
)
under_test = ARTIFACTS / "hub-game.html"
shutil.copyfile(source, under_test)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = http.server.ThreadingHTTPServer(
    ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT))
)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
origin = f"http://127.0.0.1:{server.server_port}"
checks = 0
failures: list[str] = []
evidence: list[dict] = []


def check(ok, label):
    global checks
    checks += 1
    if not ok:
        failures.append(label)


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={"width": 1600, "height": 1000})
            for name, options in [
                ("normal", {}),
                ("adverse", {"latency": "150", "jitter": "50", "loss": "5"}),
                ("host-leave", {"scenario": "host-leave"}),
                ("server", {"scenario": "server"}),
            ]:
                params = {
                    "game": "/artifacts/hub-game.html",
                    "players": "2",
                    "auto": "1",
                    "play": "3000",
                    "seed": "912",
                    **options,
                }
                url = (
                    origin
                    + "/vendor/hub/harness.html?"
                    + urllib.parse.urlencode(params)
                )
                page.goto(url)
                page.wait_for_function(
                    "document.body.dataset.complete === 'true'", timeout=45000
                )
                report = page.evaluate("window.__hubCheck")
                for item in report.get("checks", []):
                    check(
                        item["pass"],
                        f"Hub {name}: {item['name']}: {item.get('detail', '')}",
                    )
                check(
                    report.get("pass") is True, f"Hub {name}: official __hubCheck.pass"
                )
                diagnostics = []
                for frame in page.frames[1:]:
                    try:
                        d = frame.evaluate("""() => {
                          const a = window.__rumble;
                          if (!a?.online) return null;
                          return {title:document.title, online:a.online.diagnostics(),
                            ended:a.hubEnded, seat:a.online.seat, server:a.hubServer,
                            blocks:a.world.blocks.map(b=>b.alive?1:0).join(''),
                            score:a.world.players.map(p=>p.score),
                            outcome:a.world.outcome, client:window.AIHub?.version};
                        }""")
                        if d:
                            diagnostics.append(d)
                    except PlaywrightError as error:
                        if name != "host-leave":
                            check(False, f"Hub {name}: diagnostic frame: {error}")
                check(
                    bool(diagnostics),
                    f"Hub {name}: game diagnostics confirm built artifact",
                )
                if diagnostics:
                    check(
                        all("Smithereen" in d["title"] for d in diagnostics),
                        f"Hub {name}: served page is this game",
                    )
                    check(
                        all(d["client"] == "1.4.0" for d in diagnostics),
                        f"Hub {name}: released client 1.4.0",
                    )
                    check(
                        all(d["ended"] for d in diagnostics),
                        f"Hub {name}: game adapters stopped on end",
                    )
                    check(
                        all(d["online"]["maxBytes"] < 16384 for d in diagnostics),
                        f"Hub {name}: actual message ceiling",
                    )
                    if name != "host-leave":
                        check(
                            len({d["blocks"] for d in diagnostics}) == 1,
                            f"Hub {name}: final block state agrees",
                        )
                evidence.append({"case": name, "report": report, "copies": diagnostics})
            # A separate game-specific firing test. Official generic arrows never press Fire.
            params = {
                "game": "/artifacts/hub-game.html",
                "players": "2",
                "auto": "0",
                "seed": "912",
                "latency": "150",
                "jitter": "50",
                "loss": "5",
            }
            page.goto(
                origin + "/vendor/hub/harness.html?" + urllib.parse.urlencode(params)
            )
            page.wait_for_function(
                "document.querySelectorAll('#grid iframe').length === 2"
            )
            page.locator("#release").click()
            page.wait_for_function(
                """() => [...document.querySelectorAll('#grid iframe')].every(f => {
              const w=f.contentWindow; return w.__rumble?.online && w.AIHub.time()>100;
            })""",
                timeout=20000,
            )
            frames = page.frames[1:]
            check(len(frames) == 2, "Hub Fire: two independent browser player pages")
            for frame in frames:
                frame.evaluate(
                    "window.__rumble.command(window.__rumble.hubSeat, {type:'begin'})"
                )
            page.wait_for_timeout(850)
            for frame in reversed(frames):
                frame.evaluate(
                    "window.__rumble.command(window.__rumble.hubSeat, {type:'release'})"
                )
            page.wait_for_timeout(650)
            actual = [
                frame.evaluate(
                    "({shots:window.__rumble.world.stats.shots, d:window.__rumble.online.diagnostics()})"
                )
                for frame in frames
            ]
            check(
                all(a["shots"] == [1, 1] for a in actual),
                "Hub Fire: simultaneous holds/releases launch exactly once for each seat",
            )
            check(
                all(a["d"]["maxBytes"] < 16384 for a in actual),
                "Hub Fire: actual gameplay messages stay bounded",
            )
            page.wait_for_timeout(5000)
            final_shapes = [
                frame.evaluate(
                    "window.__rumble.world.blocks.map(b=>b.alive?1:0).join('')"
                )
                for frame in frames
            ]
            check(
                final_shapes[0] == final_shapes[1],
                "Hub Fire: gameplay destruction agrees under latency/jitter/loss",
            )
            page.locator("#timeup").click()
            page.wait_for_function(
                """() => [...document.querySelectorAll('#grid iframe')].every(f => f.contentWindow.__rumble?.hubEnded)""",
                timeout=8000,
            )
            before = [
                frame.evaluate("window.__rumble.online.diagnostics().sent")
                for frame in frames
            ]
            for frame in frames:
                frame.evaluate(
                    "window.__rumble.command(window.__rumble.hubSeat, {type:'begin'})"
                )
            page.wait_for_timeout(300)
            after = [
                frame.evaluate("window.__rumble.online.diagnostics().sent")
                for frame in frames
            ]
            check(
                before == after,
                "Hub Fire: no messages after end despite attempted input",
            )
            evidence.append(
                {
                    "case": "game-specific-simultaneous-fire",
                    "copies": actual,
                    "finalShapesAgree": final_shapes[0] == final_shapes[1],
                }
            )
        finally:
            browser.close()
except Exception as error:  # noqa: BLE001 - suite records the failure before shutting down its own server
    check(False, f"Hub browser suite: {type(error).__name__}: {error}")
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=2)
    (ARTIFACTS / "hub-browser.json").write_text(
        json.dumps(
            {"checks": checks, "failures": failures, "evidence": evidence}, indent=2
        )
    )

for failure in failures:
    print(failure, file=sys.stderr)
print(f"{checks} checks, {len(failures)} failures")
sys.exit(1 if failures else 0)
