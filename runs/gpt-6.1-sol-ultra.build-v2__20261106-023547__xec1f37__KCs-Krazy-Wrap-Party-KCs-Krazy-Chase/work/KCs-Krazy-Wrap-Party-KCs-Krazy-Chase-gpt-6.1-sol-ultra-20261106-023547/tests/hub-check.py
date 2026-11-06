"""Pinned official runner plus normal/two-seat and single-seat harness checks.
Run with the installed Playwright Python interpreter; prints failures + one count.
"""

import argparse
import http.server
import json
import os
import pathlib
import subprocess
import threading
import urllib.parse
import urllib.request

from hub_input_checks import run as run_input_checks
from playwright.sync_api import sync_playwright

DEV = pathlib.Path(__file__).resolve().parents[1]
WORK = DEV.parent
PROJECT = json.loads((DEV / "project.json").read_text())
parser = argparse.ArgumentParser()
parser.add_argument("--game", default=str(WORK / (PROJECT["slug"] + ".html")))
parser.add_argument("--skip-official", action="store_true")
parser.add_argument("--input-only", action="store_true")
args = parser.parse_args()
GAME = pathlib.Path(args.game).resolve()
ARTIFACTS = DEV / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)
reports = []


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(WORK), **kw)

    def translate_path(self, path):
        clean = urllib.parse.urlparse(path).path
        if clean == "/game.html":
            return str(GAME)
        if clean.startswith("/lib/hub/"):
            relative = clean.removeprefix("/lib/hub/")
            if ".." not in pathlib.PurePosixPath(relative).parts:
                return str(DEV / "vendor/hub/lib/hub" / relative)
        return super().translate_path(path)

    def log_message(self, *a):
        pass


def check(name, passed, detail=""):
    reports.append({"name": name, "pass": bool(passed), "detail": detail})
    if not passed:
        print(f"FAIL {name}: {detail}")


server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
base = f"http://127.0.0.1:{server.server_port}"
(ARTIFACTS / "hub-server.json").write_text(
    json.dumps({"pid": os.getpid(), "origin": base, "game": str(GAME)}, indent=2)
)
try:
    text = urllib.request.urlopen(base + "/game.html").read().decode()
    check("loopback origin serves this selected title", PROJECT["title"] in text)
    pristine = (DEV / "vendor/hub/session.js").read_text()
    check(
        "exactly one pristine Hub client is in the assembled page",
        text.count(pristine) == 1,
    )
    if not args.skip_official and not args.input_only:
        proc = subprocess.run(
            [
                "node",
                str(DEV / "vendor/hub/scripts/hub-check.mjs"),
                "/game.html",
                "--base",
                base,
                "--players",
                "2",
                "--json",
                "--no-solo",
            ],
            cwd=DEV,
            capture_output=True,
            text=True,
            timeout=240,
            check=False,
        )
        try:
            official = json.loads(proc.stdout)
            (ARTIFACTS / "hub-official.json").write_text(json.dumps(official, indent=2))
            for run in official["runs"]:
                for item in run["checks"]:
                    check(
                        f"official {run['scenario']}: {item['name']}",
                        item["pass"],
                        item.get("detail", ""),
                    )
        except (ValueError, KeyError):
            check(
                "official runner returns JSON",
                False,
                (proc.stderr + proc.stdout)[-3000:],
            )
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
        )
        for count, impaired in (
            () if args.input_only else ((1, False), (2, False), (2, True))
        ):
            label = f"{'impaired' if impaired else 'normal'} {count}-seat"
            context = browser.new_context(viewport={"width": 1280, "height": 860})
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error, errors=errors: errors.append(str(error)))
            query = urllib.parse.urlencode(
                {
                    "game": "/game.html",
                    "players": count,
                    "auto": 1,
                    "latency": 150 if impaired else 0,
                    "jitter": 50 if impaired else 0,
                    "loss": 5 if impaired else 0,
                    "play": 8000,
                    "scenario": "standard",
                }
            )
            page.goto(base + "/lib/hub/harness.html?" + query)
            page.wait_for_function(
                "Array.from(document.querySelectorAll('iframe')).length > 0 && Array.from(document.querySelectorAll('iframe')).every(f => f.contentWindow.GardenNet?.started && f.contentWindow.AIHub.time() >= 0)",
                timeout=35000,
            )
            frames = [f for f in page.frames if f.parent_frame]
            for frame in frames:
                frame.evaluate("""() => {
                  window.__netSnapshots=[]; window.__plantMessages=[];
                  const original=AIHub.send;
                  AIHub.send=(data,opts)=>{if(data?.t==='p')window.__plantMessages.push(JSON.parse(JSON.stringify(data)));return original(data,opts)};
                  AIHub.on('message',(data,from)=>{if(data?.t==='s' && from===AIHub.host)window.__netSnapshots.push(data)});
                }""")
            # The engine receives real key events through its ordinary input route.
            for frame in frames:
                frame.evaluate("""() => {
                  dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',code:'ArrowRight',bubbles:true}));
                  dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true}));
                }""")
            page.wait_for_timeout(450)
            for frame in frames:
                frame.evaluate("""() => {
                  dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowRight',code:'ArrowRight',bubbles:true}));
                  dispatchEvent(new KeyboardEvent('keyup',{key:' ',code:'Space',bubbles:true}));
                }""")
            page.wait_for_timeout(650)
            observations = []
            for frame in frames:
                observations.append(
                    frame.evaluate("""() => {
                  const n=GardenNet,s=n.state,packet=window.__netSnapshots.at(-1);
                  return {authority:n.authority,localId:n.localId,players:s.players.length,tick:s.tick,score:s.score,lives:s.lives,seeds:s.seeds,garden:s.garden,status:s.status,tails:s.crawlers.map(c=>c.segments),pending:n.pendingActions.size,plants:s.stats.plants,actions:n.stats.actions,maxBytes:n.stats.maxBytes,packet:packet?{tick:packet.s.tick,score:packet.s.score,lives:packet.s.lives,seeds:packet.s.seeds,garden:packet.s.garden,status:packet.s.status,tails:packet.s.crawlers.map(c=>c.segments)}:null};
                }""")
                )
            check(
                f"{label} shared world has exactly the declared avatars",
                all(x["players"] == count for x in observations),
                json.dumps(observations),
            )
            check(
                f"{label} authority advances without audio gesture dependency",
                any(x["authority"] and x["tick"] > 20 for x in observations),
            )
            for observation in observations:
                if not observation["authority"]:
                    packet = observation["packet"]
                    keys = (
                        "tick",
                        "score",
                        "lives",
                        "seeds",
                        "garden",
                        "status",
                        "tails",
                    )
                    check(
                        f"{label} replica faithfully applies host tail/lives/score/bait/garden/outcome",
                        packet and all(observation[k] == packet[k] for k in keys),
                        json.dumps(observation),
                    )
                    check(
                        f"{label} plant receives final acknowledgement",
                        observation["pending"] == 0,
                    )
            if count == 2:
                authority = next(f for f in frames if f.evaluate("GardenNet.authority"))
                client = next(
                    f for f in frames if not f.evaluate("GardenNet.authority")
                )
                plant = client.evaluate("window.__plantMessages.at(-1) || null")
                check(
                    f"{label} physical Space takes the reliable plant route",
                    bool(plant),
                )
                before_actions = authority.evaluate(
                    "({plants:GardenNet.state.stats.plants,actions:GardenNet.stats.actions})"
                )
                if plant:
                    client.evaluate(
                        "() => {const p=window.__plantMessages.at(-1);AIHub.send(p,{to:AIHub.host,reliable:true});AIHub.send(p,{to:AIHub.host,reliable:true});}"
                    )
                    page.wait_for_timeout(700)
                    after_actions = authority.evaluate(
                        "({plants:GardenNet.state.stats.plants,actions:GardenNet.stats.actions})"
                    )
                    ack = client.evaluate(
                        "() => {const p=window.__plantMessages.at(-1),key=`${AIHub.me}:${p.id}`;return {result:GardenNet.acknowledgements.get(key),pending:GardenNet.pendingActions.size}}"
                    )
                    check(
                        f"{label} duplicate reliable plant spends and executes at most once",
                        before_actions == after_actions,
                        json.dumps({"before": before_actions, "after": after_actions}),
                    )
                    check(
                        f"{label} duplicate plant has final accepted or rejected acknowledgement",
                        ack.get("result") in ("accepted", "rejected", "rate-limited")
                        and ack["pending"] == 0,
                        json.dumps(ack),
                    )
                check(
                    f"{label} every payload fits the protocol limit",
                    all(x["maxBytes"] < 16384 for x in observations),
                )
            page.wait_for_function(
                "document.body.dataset.complete === 'true'", timeout=35000
            )
            report = page.evaluate("window.__hubCheck")
            (
                ARTIFACTS / f"hub-{'impaired' if impaired else 'normal'}-{count}.json"
            ).write_text(json.dumps(report, indent=2))
            check(
                f"{label} harness completes and passes",
                report.get("pass"),
                json.dumps([x for x in report.get("checks", []) if not x["pass"]]),
            )
            check(
                f"{label} harness has no page errors",
                not errors,
                "\n".join(errors),
            )
            remaining = [f for f in page.frames if f.parent_frame]
            before = [
                f.evaluate(
                    "({tick:GardenNet.state?.tick,sent:GardenNet.stats.sent,ended:GardenNet.ended})"
                )
                for f in remaining
            ]
            page.wait_for_timeout(350)
            after = [
                f.evaluate(
                    "({tick:GardenNet.state?.tick,sent:GardenNet.stats.sent,ended:GardenNet.ended})"
                )
                for f in remaining
            ]
            check(
                f"{label} end stops all simulation and sending",
                before == after and all(x["ended"] for x in after),
                json.dumps({"before": before, "after": after}),
            )
            context.close()
        run_input_checks(browser, base, check, ARTIFACTS)
        browser.close()
except Exception as error:  # noqa: BLE001 - preserve diagnostic report for any browser failure
    check("Hub acceptance execution", False, str(error))
finally:
    server.shutdown()
    server.server_close()
    (ARTIFACTS / ("hub-input-report.json" if args.input_only else "hub-report.json")).write_text(
        json.dumps(
            {"pass": all(r["pass"] for r in reports), "checks": reports}, indent=2
        )
    )
passed = sum(x["pass"] for x in reports)
failed = len(reports) - passed
print(f"{passed} passed, {failed} failed (Hub browser)")
raise SystemExit(1 if failed else 0)
