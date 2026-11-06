"""Final-file AI Hub admission and shared-world checks. Existing Playwright only.
Run via /home/micha/.local/share/pipx/venvs/playwright/bin/python tests/hub_browser.py.
The verifier calls this script; stdout contains only failures and the final count.
"""

from __future__ import annotations

import functools
import hashlib
import json
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def gameplay_checks(browser, base: str) -> dict:
    """Setup-based real-transport combat; ordinary commands resolve every hit.
    The separate simulation campaign test supplies the no-setup full run.
    """
    checks = []
    context = browser.new_context(viewport={"width": 1600, "height": 1000})
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        params = {
            "game": "game.html",
            "players": 2,
            "latency": 80,
            "jitter": 20,
            "loss": 2,
            "seed": 515111,
            "limit": 180,
        }
        page.goto(
            f"{base}/harness.html?{urlencode(params)}", wait_until="domcontentloaded"
        )
        page.wait_for_function(
            """() => {
          const frames=Array.from(document.querySelectorAll('iframe'));
          return frames.length===2&&frames.every(f=>f.contentWindow?.__wizard?.net?.running && f.contentWindow.AIHub.time()>=0);
        }""",
            timeout=30000,
        )
        frames = page.frames[1:]
        host = next(frame for frame in frames if frame.evaluate("__wizard.net.isHost"))
        client = next(
            frame for frame in frames if not frame.evaluate("__wizard.net.isHost")
        )
        assert host.evaluate("typeof __wizard.test.feedCommand === 'function'"), (
            "ordinary-command test adapter missing"
        )
        host.evaluate("""() => {
          const {sim,net}=__wizard;sim.dev('room',0);sim.s.phase='hunt';sim.s.pending=[];sim.s.enemies=[];sim.s.bolts=[];
          sim.s.players.forEach(p=>{p.boltId=null;p.lastFire=-1000;p.alive=true;p.lives=3;p.moving=false;p.x=p.seat?17:1;p.y=11;});
          const e=sim.spawn('hopper',5,11);e.warning=0;e.activeAt=0;net.broadcast();
        }""")
        host.evaluate("__wizard.test.feedCommand({move:-1,aim:0,fire:true})")
        client.evaluate("__wizard.test.feedCommand({move:-1,aim:2,fire:true})")
        host.wait_for_function(
            "__wizard.sim.s.score>0 && __wizard.sim.s.phase==='familiar'", timeout=6000
        )
        host.evaluate("__wizard.test.feedCommand({move:-1,aim:-1,fire:false})")
        client.evaluate("__wizard.test.feedCommand({move:-1,aim:-1,fire:false})")
        score = host.evaluate("__wizard.sim.s.score")
        client.wait_for_function(
            "score => __wizard.sim.s.score===score && __wizard.sim.s.enemies.length===0",
            arg=score,
            timeout=5000,
        )
        assert host.evaluate("__wizard.sim.s.players.every(p=>p.stats.shots>0)"), (
            "both seats did not fire through their own copy"
        )
        checks.append(
            {
                "name": "two peers resolve the same ordinary enemy and shared score through actual transport",
                "pass": True,
            }
        )
        # The hidden hunter's union-of-player reveal is an authoritative shared field.
        host.evaluate("""() => {
          const {sim,net}=__wizard;sim.dev('room',1);sim.s.phase='hunt';sim.s.pending=[];sim.s.enemies=[];
          sim.s.tuning.stalkerSpeed=0;Object.assign(sim.s.players[0],{x:1,y:11,moving:false});Object.assign(sim.s.players[1],{x:1,y:1,moving:false});
          const e=sim.spawn('stalker',17,5);e.warning=0;e.activeAt=0;e.visible=false;net.broadcast();
        }""")
        client.wait_for_function(
            "__wizard.sim.s.roomIndex===1 && __wizard.sim.s.enemies.length===1 && !__wizard.sim.s.enemies[0].visible",
            timeout=5000,
        )
        assert client.evaluate("__wizard.sim.radar().enemies.length===1"), (
            "hidden hunter missing from radar"
        )
        host.evaluate(
            "Object.assign(__wizard.sim.s.players[1],{x:17,y:11,moving:false})"
        )
        client.wait_for_function(
            "__wizard.sim.s.enemies[0]?.visible===true", timeout=5000
        )
        checks.append(
            {
                "name": "shared hidden-information union and live radar agree on both peers",
                "pass": True,
            }
        )
        tick = host.evaluate("__wizard.sim.s.tick")
        host.evaluate("__wizard.game.menu()")
        host.wait_for_function(
            "tick=>__wizard.sim.s.tick>tick+25", arg=tick, timeout=3000
        )
        host.evaluate("__wizard.game.resume();__wizard.ui.hide()")
        checks.append(
            {
                "name": "host local pause overlay leaves the shared authoritative world running",
                "pass": True,
            }
        )
        # The last familiar gives the final bounty a meaningful fourfold payoff.
        host.evaluate("""() => {
          const {sim,net}=__wizard;sim.dev('room',5);sim.startFamiliar();
          Object.assign(sim.s.familiar,{x:9,y:11,warning:0,moving:false});
          for(const p of sim.s.players){sim.clearBolt(p);Object.assign(p,{x:p.seat?17:1,y:11,moving:false,alive:true,lives:3,lastFire:-1000});}net.broadcast();
        }""")
        host.evaluate("__wizard.test.feedCommand({move:-1,aim:0,fire:true})")
        client.evaluate("__wizard.test.feedCommand({move:-1,aim:2,fire:true})")
        host.wait_for_function(
            "__wizard.sim.s.phase==='intrusion' && __wizard.sim.s.earnedNextMultiplier===2",
            timeout=6000,
        )
        client.wait_for_function(
            "__wizard.sim.s.phase==='intrusion' && __wizard.sim.s.earnedNextMultiplier===2",
            timeout=5000,
        )
        host.evaluate("__wizard.test.feedCommand({move:-1,aim:-1,fire:false})")
        client.evaluate("__wizard.test.feedCommand({move:-1,aim:-1,fire:false})")
        checks.append(
            {
                "name": "one actual familiar interception changes the same next multiplier on both peers",
                "pass": True,
            }
        )
        for stage in range(3):
            host.wait_for_function(
                "stage=>__wizard.sim.s.wizardStage===stage && !!__wizard.sim.s.wizard",
                arg=stage,
                timeout=5000,
            )
            host.evaluate("""() => {
              const {sim,net}=__wizard;for(const p of sim.s.players){sim.clearBolt(p);Object.assign(p,{x:p.seat?17:1,y:11,moving:false,alive:true,lives:3,lastFire:-1000});}
              Object.assign(sim.s.wizard,{x:5,y:11,state:'active',vulnerable:true,warning:0,cast:20,teleportIn:20});net.broadcast();
            }""")
            host.evaluate("__wizard.test.feedCommand({move:-1,aim:0,fire:true})")
            host.wait_for_function(
                "stage=>__wizard.sim.s.wizardStage>stage || __wizard.sim.s.phase==='victory'",
                arg=stage,
                timeout=5000,
            )
            host.evaluate("__wizard.test.feedCommand({move:-1,aim:-1,fire:false})")
        page.wait_for_function(
            """() => Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow?.__wizard?.net?.ended)""",
            timeout=8000,
        )
        final = [
            frame.evaluate(
                "({phase:__wizard.sim.s.phase,score:__wizard.sim.s.score,bounty:__wizard.sim.s.bounty,next:__wizard.sim.s.earnedNextMultiplier,finishes:__wizard.net.metrics.finishes,stopped:__wizard.audio.stopped,pump:!!__wizard.net.pump,sent:__wizard.net.metrics.sent,tick:__wizard.sim.s.tick,maxBytes:__wizard.net.metrics.maxBytes,maxHz:__wizard.net.metrics.maxPerSecond})"
            )
            for frame in [host, client]
        ]
        assert all(
            state["phase"] == "victory"
            and state["bounty"] == 4000
            and state["next"] == 4
            for state in final
        ), f"final bounty disagrees: {final}"
        assert final[0]["score"] == final[1]["score"], f"final scores disagree: {final}"
        assert final[0]["finishes"] == 1 and final[1]["finishes"] == 0, (
            "finish authority or idempotence failed"
        )
        assert all(state["stopped"] and not state["pump"] for state in final), (
            "end did not stop audio and timers"
        )
        assert all(
            state["maxBytes"] < 16000 and state["maxHz"] <= 20 for state in final
        ), "wire limits exceeded"
        checks.append(
            {
                "name": "all three one-hit manifestations and fourfold bounty end everywhere with one tied finish",
                "pass": True,
            }
        )
        checks.append(
            {
                "name": "terminal audio and simulation pumps stop; actual packet sizes and rates stay within limits",
                "pass": True,
            }
        )
        if errors:
            raise AssertionError("; ".join(errors))
        checks.append(
            {"name": "isolated two-peer combat has no browser errors", "pass": True}
        )
        return {
            "scenario": "shared-combat",
            "pass": True,
            "checks": checks,
            "final": final,
            "setup": "Practice scene fixtures; every collision, capture and banishment is resolved by ordinary commands through official transport. Honest full campaign is a separate test.",
        }
    except Exception as error:  # noqa: BLE001 - keep test failure and clean up every context
        checks.append(
            {
                "name": "isolated two-peer shared combat",
                "pass": False,
                "detail": str(error),
            }
        )
        return {"scenario": "shared-combat", "pass": False, "checks": checks}
    finally:
        context.close()


def departure_checks(browser, base: str) -> dict:
    checks = []
    context = browser.new_context(viewport={"width": 1600, "height": 1000})
    page = context.new_page()
    try:
        page.goto(
            f"{base}/harness.html?{urlencode({'game': 'game.html', 'players': 2, 'latency': 100, 'jitter': 25, 'loss': 5, 'seed': 615110, 'limit': 180})}",
            wait_until="domcontentloaded",
        )
        page.wait_for_function(
            "Array.from(document.querySelectorAll('iframe')).length===2 && Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow?.__wizard?.net?.active)",
            timeout=20000,
        )
        page.locator("#release").click()
        page.wait_for_function(
            "Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow?.__wizard?.net?.running && f.contentWindow.AIHub.time()>=0)",
            timeout=10000,
        )
        host = next(
            frame for frame in page.frames[1:] if frame.evaluate("__wizard.net.isHost")
        )
        client = next(
            frame
            for frame in page.frames[1:]
            if not frame.evaluate("__wizard.net.isHost")
        )
        host.evaluate("""() => {
          const {sim,net}=__wizard;sim.dev('room',0);sim.s.phase='hunt';sim.s.pending=[];sim.s.enemies=[];sim.s.bolts=[];
          for(const p of sim.s.players){p.boltId=null;Object.assign(p,{x:p.seat?17:1,y:11,moving:false,alive:true,lives:3,lastFire:-1000});}
          const e=sim.spawn('hopper',13,11);e.warning=0;e.activeAt=0;net.broadcast();
        }""")
        client.wait_for_function(
            "__wizard.sim.s.enemies.length===1 && __wizard.sim.s.enemies[0].x>12",
            timeout=5000,
        )
        client.evaluate("__wizard.test.feedCommand(null)")
        target = client.evaluate("""() => {
          const g=__wizard.game,S=g.screen,rc=S.canvas.getBoundingClientRect(),p=g.view.p(13.5*16,11.5*16,0);
          return {x:rc.left+((p[0]-S.ix)*S.S+S.OX-Math.round(S.fx*S.S))/S.dpr,y:rc.top+((p[1]-S.iy)*S.S+S.OY-Math.round(S.fy*S.S))/S.dpr};
        }""")
        iframe_box = client.frame_element().bounding_box()
        assert iframe_box is not None, "remote client iframe has no pointer target"
        page.mouse.move(
            iframe_box["x"] + target["x"] + 12, iframe_box["y"] + target["y"] + 3
        )
        page.mouse.move(iframe_box["x"] + target["x"], iframe_box["y"] + target["y"])
        client.wait_for_function("__wizard.onlineCommand.aim===2", timeout=3000)
        page.mouse.down()
        host.wait_for_function(
            "__wizard.sim.s.score>0 && __wizard.sim.s.players[1].stats.kills>0",
            timeout=6000,
        )
        page.mouse.up()
        checks.append(
            {
                "name": "actual remote mouse aims relative to seat1 and its click resolves the shared hunter",
                "pass": True,
            }
        )
        client.evaluate("__wizard.test.feedCommand({move:-1,aim:2,fire:true})")
        host.wait_for_function("__wizard.sim.s.players[1]?.boltId", timeout=5000)
        page.locator("#who").select_option("p1")
        page.locator("#remove").click()
        host.wait_for_function(
            "__wizard.sim.s.players.length===1 && __wizard.net.players.length===1",
            timeout=5000,
        )
        assert host.evaluate(
            "__wizard.sim.s.players[0].seat===0 && __wizard.sim.s.bolts.every(b=>b.owner!=='p1')"
        ), "departed actor or bolt survived, or remaining seat was renumbered"
        checks.append(
            {
                "name": "nonhost departure safely removes its actor, bolt and command ownership",
                "pass": True,
            }
        )
        tick = host.evaluate("__wizard.sim.s.tick")
        host.wait_for_function(
            "tick=>__wizard.sim.s.tick>tick+25", arg=tick, timeout=3000
        )
        assert host.evaluate("!__wizard.net.ended && !__wizard.net.finished"), (
            "surviving host did not continue"
        )
        checks.append(
            {"name": "remaining warden continues after nonhost departure", "pass": True}
        )
        page.locator("#timeup").click()
        host.wait_for_function("__wizard.net.ended", timeout=8000)
        assert host.evaluate(
            "__wizard.net.metrics.finishes===1 && __wizard.audio.stopped && !__wizard.net.pump"
        ), "surviving host terminal lifecycle failed"
        checks.append(
            {
                "name": "timeup after departure submits one result and stops the remaining copy",
                "pass": True,
            }
        )
        return {"scenario": "nonhost-departure", "pass": True, "checks": checks}
    except Exception as error:  # noqa: BLE001 - keep every test failure and always close the context
        diagnostics = []
        for frame in page.frames[1:]:
            try:
                diagnostics.append(
                    frame.evaluate("""() => {
                  const a=__wizard,g=a.game,I=g.input;
                  return {host:a.net.isHost,seat:a.net.localSeat,command:a.onlineCommand,direct:a.test.command(a.net.localSeat),lastDevice:I.lastDevice,mouse:I.mouse,ground:g.mouseGround(),players:a.sim.s.players.map(p=>({seat:p.seat,x:p.x,y:p.y,face:p.face})),paused:g.paused,screen:a.ui.screen};
                }""")
                )
            except Exception as diagnostic_error:  # noqa: BLE001 - a removed iframe has no state
                diagnostics.append({"diagnosticError": str(diagnostic_error)})
        checks.append(
            {
                "name": "nonhost departure through official transport",
                "pass": False,
                "detail": str(error),
                "diagnostics": diagnostics,
            }
        )
        return {"scenario": "nonhost-departure", "pass": False, "checks": checks}
    finally:
        context.close()


def run() -> dict:
    failures: list[str] = []
    passed = 0
    reports: list[dict] = []
    game = ROOT / "game.html"
    if not game.is_file():
        return {"passed": 0, "failures": ["final game.html test copy does not exist"]}
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_address[1]}"
    evidence: dict = {
        "gameSHA256": hashlib.sha256(game.read_bytes()).hexdigest(),
        "scenarios": reports,
    }
    try:
        # Verify the ephemeral address serves our game before trusting its frames.
        with urlopen(f"{base}/game.html", timeout=5) as response:
            assert b"The Inconspicuous Wizard" in response.read(), (
                "ephemeral server is not our game"
            )
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True, args=["--disable-dev-shm-usage"]
            )
            evidence["browser"] = browser.version
            try:
                for scenario in (
                    []
                    if "--leave-only" in sys.argv
                    else ["standard", "host-leave", "server"]
                ):
                    context = browser.new_context(
                        viewport={"width": 1600, "height": 1000}
                    )
                    page = context.new_page()
                    errors: list[str] = []
                    page.on(
                        "pageerror",
                        lambda error, errors=errors: errors.append(str(error)),
                    )
                    try:
                        params = {
                            "game": "game.html",
                            "players": 2,
                            "latency": 150,
                            "jitter": 50,
                            "loss": 5,
                            "scenario": scenario,
                            "auto": 1,
                            "seed": 539103,
                            "play": 6000,
                            "limit": 90,
                        }
                        page.goto(
                            f"{base}/harness.html?{urlencode(params)}",
                            wait_until="domcontentloaded",
                            timeout=20000,
                        )
                        page.wait_for_function(
                            "document.body.dataset.complete === 'true'", timeout=90000
                        )
                        report = page.evaluate("window.__hubCheck")
                        reports.append(report)
                        for check in report.get("checks", []):
                            if check["pass"]:
                                passed += 1
                            else:
                                failures.append(
                                    f"Hub {scenario}: {check['name']}: {check.get('detail', '')}"
                                )
                        if not report.get("pass") and not any(
                            not check["pass"] for check in report.get("checks", [])
                        ):
                            failures.append(
                                f"Hub {scenario}: no passing conformance result"
                            )
                        if errors:
                            failures.extend(
                                f"Hub {scenario} runtime: {error}" for error in errors
                            )
                        else:
                            passed += 1
                        # Terminal stop is observable on all remaining framed copies.
                        quiescence = page.evaluate("""() => Array.from(document.querySelectorAll('iframe')).map(frame=>{
                          const app=frame.contentWindow?.__wizard;
                          const net=app?.net || app?.network;
                          return net ? {ended:net.ended, sent:net.metrics.sent, tick:net.sim?.s?.tick, pump:!!net.pump} : null;
                        }).filter(Boolean)""")
                        if quiescence:
                            page.wait_for_timeout(200)
                            after = page.evaluate("""() => Array.from(document.querySelectorAll('iframe')).map(frame=>{
                              const app=frame.contentWindow?.__wizard;const net=app?.net || app?.network;
                              return net ? {ended:net.ended,sent:net.metrics.sent,tick:net.sim?.s?.tick,pump:!!net.pump} : null;
                            }).filter(Boolean)""")
                            if quiescence == after and all(
                                item["ended"] and not item["pump"] for item in after
                            ):
                                passed += 1
                            else:
                                failures.append(
                                    f"Hub {scenario}: ended copies still step, send or run their pump"
                                )
                    except Exception as error:  # noqa: BLE001 - report every browser failure and always clean up
                        failures.append(f"Hub {scenario}: {error}")
                    finally:
                        context.close()
                extra_reports = [departure_checks(browser, base)]
                if "--leave-only" not in sys.argv:
                    extra_reports.append(gameplay_checks(browser, base))
                for report in extra_reports:
                    reports.append(report)
                    for check in report["checks"]:
                        if check["pass"]:
                            passed += 1
                        else:
                            failures.append(
                                f"Hub {report['scenario']}: {check['name']}: {check.get('detail', '')}"
                            )
            finally:
                browser.close()
    except Exception as error:  # noqa: BLE001 - report every browser failure and always clean up
        failures.append(f"Hub browser setup: {error}")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    evidence.update({"passed": passed, "failures": failures})
    (
        ROOT
        / "evidence"
        / ("hub-leave.json" if "--leave-only" in sys.argv else "hub-browser.json")
    ).write_text(json.dumps(evidence, indent=2) + "\n")
    return {"passed": passed, "failures": failures}


if __name__ == "__main__":
    result = run()
    for failure in result["failures"]:
        print(f"FAIL {failure}", file=sys.stderr)
    print(
        f"{result['passed']} Hub browser checks passed; {len(result['failures'])} failed"
    )
    raise SystemExit(1 if result["failures"] else 0)
