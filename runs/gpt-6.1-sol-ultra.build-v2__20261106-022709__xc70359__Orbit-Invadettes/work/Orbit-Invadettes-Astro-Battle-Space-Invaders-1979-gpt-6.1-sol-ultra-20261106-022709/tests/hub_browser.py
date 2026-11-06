"""Pinned AI Hub harness checks against the final, exported HTML.

Run with the installed Playwright Python interpreter. This module also exposes
run_hub_checks(browser, base_url, artifact, folder) for a shared browser runner.
"""
from __future__ import annotations

import functools
import http.server
import json
from pathlib import Path
import threading
import urllib.parse
import urllib.request

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
CONFIG = json.loads((ROOT / "build-config.json").read_text())
PROJECT = ROOT / CONFIG["folder"]
EVIDENCE = PROJECT / "evidence"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass


def run_hub_checks(browser, base_url, artifact=None, folder=None):
    artifact = artifact or CONFIG["html"]
    folder = folder or CONFIG["folder"]
    failures = []
    reports = []
    checks = 0
    for players, scenario in [(1, "standard"), (2, "standard"), (2, "host-leave"), (2, "server")]:
        errors = []
        warnings = []
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on(
            "console",
            lambda message: warnings.append(message.text)
            if message.type == "warning" and "aihub" in message.text.lower()
            else None,
        )
        query = urllib.parse.urlencode(
            {
                "game": "../../" + artifact,
                "players": players,
                "scenario": scenario,
                "latency": 150,
                "jitter": 50,
                "loss": 5,
                "auto": 1,
                "play": 3200,
                "seed": 4081,
            }
        )
        url = base_url + "/" + urllib.parse.quote(folder) + "/vendor/harness.html?" + query
        label = f"Hub {players}-seat {scenario}"
        try:
            page.goto(url, wait_until="domcontentloaded")
            page.wait_for_selector('body[data-complete="true"]', timeout=45000)
            report = page.evaluate("window.__hubCheck")
            checks += len(report.get("checks", []))
            for check in report.get("checks", []):
                if not check["pass"]:
                    failures.append(label + ": " + check["name"] + " — " + check.get("detail", ""))
            if report.get("pass") is not True:
                failures.append(label + ": __hubCheck.pass was not true")
            if errors:
                failures.append(label + ": page errors: " + "; ".join(errors))
            if warnings:
                failures.append(label + ": Hub warnings: " + "; ".join(warnings))
            worlds = []
            for frame in page.frames:
                if frame == page.main_frame:
                    continue
                try:
                    state = frame.evaluate("""()=>{const a=window.__OI,s=a?.session,w=a?.world;
                      return s&&w?{isHost:s.isHost,server:s.server,seat:s.seat,phase:s.phase,
                        tick:w.tick,epoch:w.epoch,score:w.score,reserve:w.reserve,status:w.status,reason:w.reason,
                        players:w.players.map(p=>({id:p.id,active:p.active,score:p.score,charges:p.charges,alive:p.alive})),
                        diagnostics:s.diagnostics}:null;}""")
                    if state:
                        worlds.append(state)
                except Exception:
                    pass
            report["worlds"] = worlds
            if worlds and any(w["diagnostics"]["pumpErrors"] for w in worlds):
                failures.append(label + ": adapter pump reported an error")
            if worlds and any(w["diagnostics"]["maxSnapshotBytes"] >= 16000 for w in worlds):
                failures.append(label + ": complete snapshot exceeded tested packet envelope")
            if scenario != "host-leave" and len(worlds) > 1:
                outcomes = [(w["status"], w["reason"], w["score"], w["reserve"], w["epoch"]) for w in worlds]
                if len(set(outcomes)) != 1:
                    failures.append(label + ": terminal world states disagreed: " + repr(outcomes))
                else:
                    checks += 1
            report["pageErrors"] = errors
            report["hubWarnings"] = warnings
            reports.append(report)
        except Exception as error:
            failures.append(label + ": " + str(error))
            reports.append({"scenario": scenario, "players": players, "error": str(error), "pageErrors": errors})
        finally:
            page.close()
    semantic_checks, semantic_failures, semantic_report = run_semantic_checks(browser, base_url, artifact, folder)
    checks += semantic_checks
    failures.extend(semantic_failures)
    reports.append(semantic_report)
    EVIDENCE.mkdir(exist_ok=True)
    (EVIDENCE / "hub-browser.json").write_text(json.dumps(reports, indent=2) + "\n")
    return checks, failures


def run_semantic_checks(browser, base_url, artifact, folder):
    """Arranged fixtures test network semantics, never claim a normal campaign clear."""
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors, warnings, checks, failures = [], [], [], []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("console", lambda message: warnings.append(message.text)
            if message.type == "warning" and "aihub" in message.text.lower() else None)

    def check(name, condition, detail=""):
        checks.append({"name": name, "pass": bool(condition), "detail": detail})
        if not condition:
            failures.append("Hub semantic: " + name + (" — " + detail if detail else ""))

    def key(frame, code, key_value):
        frame.evaluate("""([code,key])=>{
          dispatchEvent(new KeyboardEvent('keydown',{code,key,bubbles:true}));
          setTimeout(()=>dispatchEvent(new KeyboardEvent('keyup',{code,key,bubbles:true})),80);
        }""", [code, key_value])

    try:
        query = urllib.parse.urlencode({"game": "../../" + artifact, "players": 2,
                                        "latency": 150, "jitter": 50, "loss": 5, "seed": 137})
        page.goto(base_url + "/" + urllib.parse.quote(folder) + "/vendor/harness.html?" + query)
        page.wait_for_function("[...document.querySelectorAll('iframe')].length===2 && [...document.querySelectorAll('iframe')].every(f=>f.contentWindow.__OI?.session)", timeout=20000)
        page.locator("#release").click()
        frames = [frame for frame in page.frames if frame != page.main_frame]
        host = next(frame for frame in frames if frame.evaluate("__OI.session.isHost"))
        guest = next(frame for frame in frames if not frame.evaluate("__OI.session.isHost"))
        host.wait_for_function("__OI.session.phase==='playing'", timeout=10000)
        guest.wait_for_function("__OI.session.phase==='playing'", timeout=10000)
        check("ready and shared countdown without gesture gates", host.evaluate("__OI.world.tick>0") and guest.evaluate("__OI.session.seat===1"))
        host.evaluate("""()=>{
          const w=__OI.world;w.assisted=true;w.fireTimer=100;w.bullets=[];
          const p=w.players[1];p.x=294;p.charges=2;p.protected=0;
          w.bunkers[2].mask.fill(0);
        }""")
        guest.wait_for_function("__OI.world.players[1].charges===2 && __OI.world.bunkers[2].mask.every(x=>!x)", timeout=5000)
        key(guest,"KeyQ","q")
        host.wait_for_function("__OI.world.players[1].repairs===1 && __OI.world.players[1].charges===1", timeout=5000)
        guest.wait_for_function("__OI.world.players[1].repairs===1 && __OI.world.players[1].charges===1", timeout=5000)
        cover_host = host.evaluate("JSON.stringify(__OI.world.bunkers.map(b=>b.mask))")
        cover_guest = guest.evaluate("JSON.stringify(__OI.world.bunkers.map(b=>b.mask))")
        check("remote repair spends one charge and restores the same mask on both copies", cover_host == cover_guest)
        check("remote repair edge acknowledged once", guest.evaluate("__OI.session.diagnostics.repairAcks[1]===1"))
        reserve = host.evaluate("__OI.world.reserve")
        host.evaluate("""()=>{
          const w=__OI.world,p=w.players[1];p.protected=0;
          w.bullets.push({id:++w.entitySeq,x:p.x,y:p.y-7,vy:w.tuning.bombSpeed,owner:-1,kind:'bomb',r:1.7});
        }""")
        host.wait_for_function("__OI.world.stats.losses===1", timeout=5000)
        guest.wait_for_function("__OI.world.stats.losses===1", timeout=5000)
        check("host collision death reaches guest with one reserve charge", host.evaluate("__OI.world.reserve") == reserve - 1 and guest.evaluate("__OI.world.reserve") == reserve - 1)
        guest.wait_for_function("__OI.world.players[1].alive && __OI.world.players[1].protected>0", timeout=5000)
        check("protected respawn agrees across copies", host.evaluate("__OI.world.players[1].alive") and guest.evaluate("__OI.world.players[1].alive"))
        key(guest,"Escape","Escape")
        guest.wait_for_function("__OI.ui.screen==='pause'", timeout=3000)
        tick = host.evaluate("__OI.world.tick")
        host.wait_for_function("__OI.world.tick>= " + str(tick + 120), timeout=4000)
        check("guest local overlay leaves host world and heartbeats running", not host.evaluate("__OI.session.ended"))
        key(guest,"Escape","Escape")
        guest.wait_for_function("!__OI.ui.screen || __OI.ui.screen==='game' || __OI.ui.screen==='play'", timeout=3000)
        before = host.evaluate("__OI.session.diagnostics.rejectedInputs")
        guest.evaluate("AIHub.send({t:'i',n:100000,at:AIHub.time(),m:1,f:0,r:1,seat:0},{to:AIHub.host,reliable:true})")
        host.wait_for_function("__OI.session.diagnostics.rejectedInputs>" + str(before), timeout=3000)
        check("packet-supplied foreign seat cannot take another cannon", True)
        page.locator("#timeup").click()
        guest.wait_for_function("__OI.session.ended", timeout=8000)
        host.wait_for_function("__OI.session.ended", timeout=8000)
        outcome_host=host.evaluate("[__OI.world.status,__OI.world.reason,__OI.world.reserve,__OI.world.score]")
        outcome_guest=guest.evaluate("[__OI.world.status,__OI.world.reason,__OI.world.reserve,__OI.world.score]")
        check("terminal reliable world agrees before Hub end", outcome_host == outcome_guest and outcome_host[0] == "defeat" and outcome_host[1] == "time-expired")
        check("host finishes once and all timers stop", host.evaluate("__OI.session.diagnostics.finishCalls===1 && __OI.session.diagnostics.stopped") and guest.evaluate("__OI.session.diagnostics.stopped"))
        check("semantic path has no browser errors or Hub warnings", not errors and not warnings, "; ".join(errors+warnings))
        details = {"host": host.evaluate("__OI.session.diagnostics"), "guest": guest.evaluate("__OI.session.diagnostics")}
    except Exception as error:
        check("semantic fixture ran", False, str(error))
        details = {"pageErrors": errors, "hubWarnings": warnings}
    finally:
        page.close()
    return len(checks), failures, {"scenario": "semantic-world", "players": 2, "pass": not failures,
                                   "checks": checks, "details": details,
                                   "fixture": "Arranged cover/resources and one hostile projectile; ordinary guest repair/input; not a campaign completion."}


def main():
    artifact = ROOT / CONFIG["html"]
    if not artifact.is_file():
        print("FAIL Hub: final HTML is missing: " + str(artifact))
        print("0 Hub checks, 1 failure")
        return 1
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    base_url = "http://127.0.0.1:" + str(server.server_address[1])
    try:
        with urllib.request.urlopen(base_url + "/" + urllib.parse.quote(CONFIG["html"])) as response:
            body = response.read().decode()
        assert "Orbit Invadettes" in body, "served page is not this game"
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                checks, failures = run_hub_checks(browser, base_url)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        server_thread.join(timeout=2)
    for failure in failures:
        print("FAIL " + failure)
    print(f"{checks} Hub checks, {len(failures)} failures")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
