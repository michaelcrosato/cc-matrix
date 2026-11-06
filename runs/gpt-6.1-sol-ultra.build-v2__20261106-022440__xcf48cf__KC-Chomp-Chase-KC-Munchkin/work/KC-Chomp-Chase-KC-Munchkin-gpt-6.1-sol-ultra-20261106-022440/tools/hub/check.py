"""Run the unchanged official Hub harness and compare real shared maze state.

Invoke using the installed Playwright 1.63 Python interpreter. No package or
browser installation, fixed port, global process lookup, or neighbouring files.
"""

import argparse
import functools
import http.server
import json
import pathlib
import threading
import time
import urllib.parse
import urllib.request

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


DIAGNOSTIC = """() => {
  const s = window.game?.debug?.snapshot?.();
  if (!s || !window.AIHub?.active) return null;
  return {hub:{host:AIHub.isHost, server:AIHub.server === true, me:AIHub.me,
    players:AIHub.players.map(p=>p.id)}, network:s.network,
    state:{tick:s.tick,phase:s.phase,revision:s.revision,foodMask:s.foodMask,
      score:s.score,lives:s.lives,actors:(s.actors||s.players||[]).map(a=>[a.id,a.x,a.y])}};
}"""


def stage_boundary(browser, origin, harness, game_name):
    """A legal-input accelerated boundary, separate from campaign-completion proof."""
    failures = []
    passed = 0
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    query = urllib.parse.urlencode(
        {
            "game": f"/{game_name}",
            "auto": 1,
            "players": 2,
            "seed": 42317,
            "latency": 150,
            "jitter": 50,
            "loss": 5,
            "play": 60000,
        }
    )
    page.goto(f"{origin}/{harness}?{query}")
    host = None
    deadline = time.monotonic() + 25
    while time.monotonic() < deadline:
        for frame in page.frames[1:]:
            try:
                if frame.evaluate(
                    "!!(window.ChompApp?.net?.isHost && ChompApp.net.live)"
                ):
                    host = frame
                    break
            except PlaywrightError:
                continue
        if host:
            break
        page.wait_for_timeout(80)
    if not host:
        page.close()
        return {
            "passed": 0,
            "failures": ["stage boundary: host did not enter a live round"],
        }
    boundary = host.evaluate("""() => {
      const a=ChompApp, sim=a.sim, before=sim.snapshot(), revision=sim.revision;
      let steps=0;
      while(sim.revision===revision && sim.phase!=='lost' && sim.phase!=='won' && steps<120*300){
        const intents=Object.fromEntries(sim.seats.map(seat=>[seat,sim.botIntent(seat)]));
        sim.step(1/120,intents); steps++;
      }
      a.state=sim.snapshot();
      a.net.transition();
      window.__boundaryBefore=before;
      window.__finishCalls=[];
      const finish=AIHub.finish.bind(AIHub);
      AIHub.finish=result=>{window.__finishCalls.push(JSON.parse(JSON.stringify(result)));return finish(result);};
      return {steps,seconds:steps/120,revisionBefore:revision,revision:sim.revision,
        stageIndex:sim.stageIndex,phase:sim.phase,lives:sim.lives,score:sim.score,
        foodMask:a.state.foodMask,stages:sim.stats.stages,finalCatches:sim.stats.finalCatches,
        defaultRules:sim.config.playerSpeed===ChompSim.DEFAULTS.playerSpeed && !sim.config.invulnerable};
    }""")
    if (
        boundary["revision"] > boundary["revisionBefore"]
        and boundary["stageIndex"] == 1
        and boundary["defaultRules"]
    ):
        passed += 1
    else:
        failures.append(
            f"stage boundary: legal normal-rule bots failed to clear first board: {boundary}"
        )
    guests = [frame for frame in page.frames[1:] if frame != host]
    repaired = False
    comparisons = 0
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        hd = host.evaluate(DIAGNOSTIC)
        recent = {
            item["q"]: item["state"] for item in hd["network"].get("recentStates", [])
        }
        states = []
        for guest in guests:
            gd = guest.evaluate(DIAGNOSTIC)
            if not gd or not gd.get("network"):
                continue
            accepted = gd["network"].get("lastAccepted")
            if accepted and accepted["q"] in recent:
                comparisons += 1
                states.append(
                    accepted["state"] == recent[accepted["q"]]
                    and gd["state"]["revision"] == boundary["revision"]
                )
        if states and all(states):
            repaired = True
            break
        page.wait_for_timeout(80)
    if repaired:
        passed += 1
    else:
        failures.append(
            "stage boundary: guests did not converge on the actual new board under packet loss"
        )
    host.evaluate("""() => {
      const before=window.__boundaryBefore;
      AIHub.send({v:1,t:'s',q:9000000,r:before.revision,k:before.tick,e:1,b:1,
        s:ChompNet.packState(before)},{reliable:true});
    }""")
    page.wait_for_timeout(550)
    stale_rejected = all(
        guest.evaluate("ChompApp.state.revision") >= boundary["revision"]
        for guest in guests
    )
    if stale_rejected:
        passed += 1
    else:
        failures.append(
            "stage boundary: stale prior-board state resurrected old progress"
        )
    page.locator("#timeup").click()
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline and not page.evaluate(
        "window.__hubCheck?.done === true"
    ):
        page.wait_for_timeout(80)
    official = page.evaluate("window.__hubCheck || null") or {}
    if official.get("pass") is True:
        passed += 1
    else:
        failures.append(
            "stage boundary: official harness failed after real board transition and time-up"
        )
    finish_calls = host.evaluate("window.__finishCalls")
    if len(finish_calls) == 1:
        result = finish_calls[0]
        ids = [int(player) for player in result["scores"]]
        valid = (
            result["standings"] == [sorted(ids)]
            and len(ids) == 2
            and len(set(result["scores"].values())) == 1
        )
        valid &= result["won"] is False and len(result.get("stats", {})) == 2
        if valid:
            passed += 1
        else:
            failures.append(
                f"stage boundary: time-up result was not one tied partial co-op score: {result}"
            )
    else:
        failures.append(
            f"stage boundary: expected one authoritative finish, received {len(finish_calls)}"
        )
    page.close()
    return {
        "passed": passed,
        "failures": failures,
        "boundary": boundary,
        "comparisons": comparisons,
        "official": official,
        "finishCalls": finish_calls,
    }


def run_hub(game, scenarios=None):
    game = pathlib.Path(game).resolve()
    root = game.parent
    dev = pathlib.Path(__file__).resolve().parents[2]
    harness = (dev / "tools/hub/lib/hub/harness.html").relative_to(root).as_posix()
    failures = []
    passed = 0
    reports = []
    handler = functools.partial(QuietHandler, directory=str(root))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f"http://127.0.0.1:{server.server_address[1]}"
    cases = scenarios or [
        ("one-player", {"players": 1}),
        ("two-player", {"players": 2}),
        ("impaired", {"players": 2, "latency": 150, "jitter": 50, "loss": 5}),
        ("host-leave", {"players": 2, "scenario": "host-leave"}),
        ("dedicated", {"players": 2, "scenario": "server"}),
    ]
    try:
        html = (
            urllib.request.urlopen(f"{origin}/{urllib.parse.quote(game.name)}")
            .read()
            .decode()
        )
        if "K.C. Chomp Chase" not in html or "aihub-session 1.4.0" not in html:
            raise RuntimeError("The scoped server did not return this game")
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                for label, options in cases:
                    page = browser.new_page(viewport={"width": 1440, "height": 900})
                    errors = []
                    page.on(
                        "pageerror", lambda error, sink=errors: sink.append(str(error))
                    )
                    query = urllib.parse.urlencode(
                        {"game": f"/{game.name}", "auto": 1, "seed": 42317, **options}
                    )
                    page.goto(f"{origin}/{harness}?{query}")
                    comparisons = 0
                    mismatches = []
                    host_positions = set()
                    food_positions = set()
                    dedicated_ok = False
                    deadline = time.monotonic() + 65
                    while time.monotonic() < deadline:
                        copies = []
                        for frame in page.frames[1:]:
                            try:
                                diagnostic = frame.evaluate(DIAGNOSTIC)
                                if diagnostic and diagnostic.get("network"):
                                    copies.append(diagnostic)
                            except PlaywrightError:
                                continue
                        hosts = [copy for copy in copies if copy["hub"]["host"]]
                        if hosts:
                            host = hosts[0]
                            network = host["network"]
                            recent = {
                                s["q"]: s["state"]
                                for s in network.get("recentStates", [])
                            }
                            if network.get("live"):
                                host_positions.add(
                                    json.dumps(host["state"].get("actors"))
                                )
                                for item in recent.values():
                                    food_positions.add(json.dumps(item.get("foods")))
                            if host["hub"]["server"]:
                                dedicated_ok |= (
                                    network.get("localSeat") is None
                                    and len(host["state"].get("actors", [])) == 2
                                )
                            for guest in copies:
                                if guest["hub"]["host"]:
                                    continue
                                accepted = guest["network"].get("lastAccepted")
                                if accepted and accepted["q"] in recent:
                                    comparisons += 1
                                    expected = recent[accepted["q"]]
                                    if accepted["state"] != expected:
                                        mismatches.append(
                                            f"sequence {accepted['q']} differs"
                                        )
                        report = page.evaluate("window.__hubCheck || null")
                        if report and report.get("done"):
                            break
                        page.wait_for_timeout(80)
                    report = page.evaluate("window.__hubCheck || null") or {}
                    reports.append(
                        {
                            "scenario": label,
                            "official": report,
                            "sharedComparisons": comparisons,
                            "sharedMismatches": mismatches,
                            "dedicatedNoPhantom": dedicated_ok,
                        }
                    )
                    checks = report.get("checks", [])
                    for check in checks:
                        if check.get("pass"):
                            passed += 1
                        else:
                            failures.append(
                                f"{label}: {check['name']}: {check.get('detail', '')}"
                            )
                    if report.get("pass") is not True:
                        failures.append(
                            f"{label}: official __hubCheck.pass was not true"
                        )
                    else:
                        passed += 1
                    if errors:
                        failures.append(
                            f"{label}: browser errors: {'; '.join(errors[:4])}"
                        )
                    else:
                        passed += 1
                    if options.get("players", 2) == 2 and label != "host-leave":
                        if comparisons == 0 or mismatches:
                            failures.append(
                                f"{label}: shared world equality: {comparisons} comparisons; {mismatches[:3]}"
                            )
                        else:
                            passed += 1
                    if label == "dedicated":
                        if dedicated_ok:
                            passed += 1
                        else:
                            failures.append(
                                "dedicated: host had no verified real-player-only simulation"
                            )
                    if len(host_positions) < 2 or len(food_positions) < 2:
                        failures.append(
                            f"{label}: actual actor/food motion was not observed"
                        )
                    else:
                        passed += 1
                    # Re-press controls after Hub end and verify network counters stop.
                    before = []
                    for frame in page.frames[1:]:
                        try:
                            before.append((frame, frame.evaluate(DIAGNOSTIC)))
                            frame.evaluate(
                                "document.body.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowRight',key:'ArrowRight',bubbles:true})); document.body.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',key:'Escape',bubbles:true}));"
                            )
                        except PlaywrightError:
                            continue
                    page.wait_for_timeout(250)
                    silent = True
                    for frame, old in before:
                        try:
                            current = frame.evaluate(DIAGNOSTIC)
                            if (
                                old
                                and current
                                and old.get("network")
                                and current.get("network")
                            ):
                                a, b = old["network"], current["network"]
                                silent &= a.get("stateSequence") == b.get(
                                    "stateSequence"
                                ) and a.get("inputSequence") == b.get("inputSequence")
                                silent &= (
                                    old.get("state") == current.get("state")
                                    and b.get("ended") is True
                                )
                        except PlaywrightError:
                            continue
                    if silent:
                        passed += 1
                    else:
                        failures.append(
                            f"{label}: controls or world/traffic continued after end"
                        )
                    page.close()
                boundary = stage_boundary(browser, origin, harness, game.name)
                passed += boundary["passed"]
                failures.extend(boundary["failures"])
                reports.append({"scenario": "impaired-stage-boundary", **boundary})
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    output = {
        "passed": passed,
        "failed": len(failures),
        "skipped": 0,
        "failures": failures,
        "scenarios": reports,
    }
    (dev / "tools/hub/results.json").write_text(json.dumps(output, indent=2))
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("game")
    args = parser.parse_args()
    result = run_hub(args.game)
    for failure in result["failures"]:
        print(failure)
    print(
        f"Hub: {result['passed']} passed, {result['failed']} failed, {result['skipped']} skipped"
    )
    raise SystemExit(1 if result["failed"] else 0)
