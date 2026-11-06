"""Wrap the unchanged official Hub harness; no catalogue writes or fixed ports."""

import functools
import json
import signal
import sys
import threading
import time
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
WORK = DEV.parent
CONFIG = json.loads((WORK / "build-config.json").read_text())
ARTIFACT = WORK / (CONFIG["slug"] + ".html")
failures = []
count = 0
evidence = []


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def check(name, ok, detail=""):
    global count
    count += 1
    if not ok:
        failures.append(f"{name}: {detail}")


def inspect_frames(page):
    output = []
    for frame in page.frames[1:]:
        try:
            data = frame.evaluate("""() => window.__pd ? ({
              title:document.title, ready:document.body.dataset.ready,
              online:__pd.app.online,server:__pd.app.server,started:__pd.app.started,ended:__pd.app.ended,
              status:__pd.mine.status,epoch:__pd.mine.epoch,tick:__pd.mine.tick,
              members:__pd.mine.players.map(p=>p.id),keyOwner:__pd.mine.keyOwner,
              score:__pd.mine.score,health:__pd.mine.players.map(p=>p.hp),
              errors:__pd.game.errors,network:__pd.link.diagnostics(),
              audio:__pd.audio?.diagnostics() || null
            }) : null""")
            if data:
                output.append(data)
        except PlaywrightError:
            # A host-leave case deliberately removes an iframe during inspection.
            pass
    return output


def automatic(browser, base, scenario, players, latency=0, jitter=0, loss=0):
    name = f"official {scenario}/{players} latency={latency} loss={loss}"
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    page_errors = []
    page.on("pageerror", lambda e: page_errors.append(str(e)))
    query = urllib.parse.urlencode(
        {
            "game": "/" + ARTIFACT.name,
            "auto": 1,
            "scenario": scenario,
            "players": players,
            "latency": latency,
            "jitter": jitter,
            "loss": loss,
            "play": 7000,
            "seed": 73082,
        }
    )
    try:
        page.goto(f"{base}/{DEV.name}/vendor/hub/harness.html?{query}")
        page.wait_for_function(
            'document.body.dataset.complete === "true"', timeout=55000
        )
        report = page.evaluate("window.__hubCheck")
        frames = inspect_frames(page)
        check(
            name + " completed",
            page.evaluate("document.body.dataset.complete") == "true",
        )
        check(
            name + " passed",
            report.get("pass") is True,
            json.dumps([c for c in report.get("checks", []) if not c.get("pass")]),
        )
        for item in report.get("checks", []):
            check(name + " / " + item["name"], item["pass"], item.get("detail", ""))
        check(name + " no browser errors", not page_errors, str(page_errors))
        check(
            name + " actual shared mine",
            bool(frames)
            and all(f["online"] and f["title"] == CONFIG["title"] for f in frames),
            str(frames),
        )
        check(
            name + " stopped on end",
            bool(frames) and all(f["ended"] and f["network"]["ended"] for f in frames),
            str(frames),
        )
        check(
            name + " packet constraints",
            all(
                f["network"]["maxBytes"] < 16384
                and f["network"]["maxUnreliableBytes"] <= 1200
                and f["network"]["maxPerSecond"] <= 20
                for f in frames
            ),
            str([f["network"] for f in frames]),
        )
        if scenario == "server":
            check(
                name + " nonplayer authority",
                any(
                    f["server"]
                    and len(f["members"]) == players
                    and f["network"]["finishCalls"] == 1
                    for f in frames
                ),
                str(frames),
            )
        before = [(f["tick"], f["network"]["sent"]) for f in frames]
        page.wait_for_timeout(350)
        after = [(f["tick"], f["network"]["sent"]) for f in inspect_frames(page)]
        check(name + " post-end silence", before == after, str([before, after]))
        evidence.append({"case": name, "report": report, "frames": frames})
    except Exception as error:  # noqa: BLE001 - aggregate independent case failures
        check(name, False, str(error))
        evidence.append(
            {"case": name, "error": str(error), "frames": inspect_frames(page)}
        )
    finally:
        page.close()


def full_expedition(browser, base, scenario="server", route=0):
    name = f"full online {scenario} route {route}"
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    query = urllib.parse.urlencode(
        {
            "game": "/" + ARTIFACT.name,
            "players": 2,
            "scenario": scenario,
            "seed": 73082,
            "latency": 150,
            "jitter": 50,
            "loss": 5,
        }
    )
    timeline = []
    next_progress = 0
    try:
        page.goto(f"{base}/{DEV.name}/vendor/hub/harness.html?{query}")
        page.wait_for_function(
            'document.querySelectorAll("iframe").length === 3', timeout=10000
        )
        for frame in page.frames[1:]:
            frame.wait_for_function(
                "window.__pd && document.body.dataset.ready === 'true'", timeout=15000
            )
            if not frame.evaluate("AIHub.server"):
                frame.evaluate(
                    """route => {
                  const pilot = new PD.Pilot(route);
                  __pd.controls.read = () => pilot.intent(__pd.mine,__pd.mine.players.find(p=>p.id===AIHub.me));
                  // Rendering is proved by the separate file-browser suite. Keep
                  // real native ticks/Hub wall time/messages, but omit canvas
                  // painting so three software-rendered copies cannot distort
                  // this authority/input timing proof on the shared machine.
                  const advance = __pd.game.advance.bind(__pd.game);
                  __pd.game.advance = (seconds,options={}) => advance(seconds,{...options,draw:false});
                  __pd.app.testing = true;
                }""",
                    route,
                )
        page.locator("#release").click()
        started = time.monotonic()
        while time.monotonic() - started < 720:
            rows = inspect_frames(page)
            hosts = [r for r in rows if r["network"]["host"]]
            if hosts:
                host = hosts[0]
                if time.monotonic() > next_progress:
                    next_progress = time.monotonic() + 5
                    (DEV / "docs/evidence/hub-progress.json").write_text(
                        json.dumps(
                            {
                                "case": name,
                                "wallSeconds": round(time.monotonic() - started, 2),
                                **host,
                            }
                        )
                    )
                if (
                    not timeline
                    or host["epoch"] != timeline[-1]["epoch"]
                    or host["ended"]
                ):
                    timeline.append(
                        {"wallSeconds": round(time.monotonic() - started, 2), **host}
                    )
                if host["ended"]:
                    break
            page.wait_for_timeout(500)
        rows = inspect_frames(page)
        host = next((r for r in rows if r["network"]["host"]), {})
        check(
            name + " decisive victory",
            host.get("status") == "victory",
            json.dumps(host),
        )
        check(
            name + " real deadline margin",
            time.monotonic() - started < 840,
            str(time.monotonic() - started),
        )
        check(
            name + " no cheats",
            all(
                frame.evaluate(
                    "!__pd.mine.god && !__pd.mine.attract && !__pd.mine.developer"
                )
                for frame in page.frames[1:]
                if frame.evaluate("!!window.__pd")
            ),
        )
        check(
            name + " finish once",
            host.get("network", {}).get("finishCalls") == 1,
            json.dumps(host),
        )
        check(
            name + " actual end",
            "Ended played" in page.locator("#round").inner_text(),
            page.locator("#round").inner_text(),
        )
        for frame in page.frames[1:]:
            if frame.evaluate("!!window.__pd && AIHub.isHost"):
                proof = frame.evaluate(
                    "({features:__pd.mine.features,stats:__pd.mine.stats,history:__pd.mine.history.map(e=>e.type),time:__pd.mine.time})"
                )
                check(
                    name + " all chambers and waves",
                    proof["stats"]["doors"] == 3
                    and proof["stats"]["keys"] == 3
                    and proof["features"].get("waveClear") == 3,
                    json.dumps(proof["stats"]),
                )
                check(
                    name + " lifecycle mechanics",
                    all(
                        proof["features"].get(t, 0) > 0
                        for t in [
                            "break",
                            "pick",
                            "redirect",
                            "collision",
                            "key",
                            "door",
                            "victory",
                        ]
                    ),
                    json.dumps(proof["features"]),
                )
                evidence.append(
                    {"case": name, "timeline": timeline, "proof": proof, "frames": rows}
                )
    except Exception as error:  # noqa: BLE001 - aggregate independent case failures
        check(name, False, str(error))
        evidence.append(
            {
                "case": name,
                "error": str(error),
                "timeline": timeline,
                "frames": inspect_frames(page),
            }
        )
    finally:
        page.close()


def main():
    def terminate(_signum, _frame):
        raise SystemExit(143)

    signal.signal(signal.SIGTERM, terminate)
    handler = functools.partial(QuietHandler, directory=str(WORK))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        identity = urllib.request.urlopen(base + "/" + ARTIFACT.name).read().decode()
        check(
            "own loopback page identity",
            f"<title>{CONFIG['title']}</title>" in identity
            and "hub:session-mode" in identity,
        )
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                if "--full-only" in sys.argv:
                    full_expedition(browser, base)
                else:
                    automatic(browser, base, "standard", 1)
                    automatic(browser, base, "standard", 2)
                    automatic(browser, base, "standard", 2, 150, 50, 5)
                    automatic(browser, base, "host-leave", 2)
                    automatic(browser, base, "server", 2, 150, 50, 5)
                    if "--full" in sys.argv:
                        full_expedition(browser, base)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
    output = (
        "hub-full-results.json" if "--full-only" in sys.argv else "hub-results.json"
    )
    (DEV / "docs/evidence" / output).write_text(json.dumps(evidence, indent=2))
    print(json.dumps({"count": count, "failures": failures}))


if __name__ == "__main__":
    main()
