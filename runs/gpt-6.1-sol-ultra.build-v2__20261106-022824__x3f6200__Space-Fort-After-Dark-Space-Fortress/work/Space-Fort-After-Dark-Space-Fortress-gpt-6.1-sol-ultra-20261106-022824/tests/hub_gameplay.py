"""Exercise real replicated controls and lifecycle in the official Hub harness."""

import argparse
import functools
import http.server
import json
import threading
from pathlib import Path
from urllib.parse import urlencode

from hub_browser import WATCH, QuietHandler
from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright


def run(artifact, report_path):
    artifact = Path(artifact).resolve()
    project = Path(__file__).resolve().parents[1]
    checks = []

    def check(name, condition, detail=None):
        checks.append({"name": name, "pass": bool(condition), "detail": detail})

    handler = functools.partial(QuietHandler, directory=str(project.parent))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_address[1]}"
    query = urlencode(
        {
            "game": "/" + artifact.name,
            "players": 2,
            "latency": 150,
            "jitter": 50,
            "loss": 5,
            "limit": 600,
        }
    )
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
            )
            try:
                page = browser.new_page(viewport={"width": 1280, "height": 860})
                page.add_init_script(WATCH)
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                check(
                    "isolated server serves the intended artifact",
                    "Space Fort After Dark"
                    in page.request.get(base + "/" + artifact.name).text(),
                )
                page.goto(base + f"/{project.name}/tests/hub/harness.html?" + query)
                page.wait_for_function(
                    """() => [...document.querySelectorAll('iframe')].length===2 && [...document.querySelectorAll('iframe')].every(f=>f.contentWindow.__siege?.online)""",
                    timeout=15000,
                )
                frames = [f for f in page.frames[1:] if f.evaluate("!!window.__siege")]
                host = next(
                    f for f in frames if f.evaluate("window.__siege.online.isHost")
                )
                remote = next(
                    f for f in frames if not f.evaluate("window.__siege.online.isHost")
                )
                check(
                    "world is inert under Hub ready card",
                    all(f.evaluate("window.__siege.world.s.tick===0") for f in frames),
                )
                page.locator("#release").click()
                host.wait_for_function(
                    "window.__siege.online.started && AIHub.time()<0", timeout=10000
                )
                check(
                    "synchronized launch countdown remains inert",
                    all(
                        f.evaluate(
                            "window.__siege.world.s.tick===0 && window.__siege.world.s.score===0"
                        )
                        for f in frames
                    ),
                )
                host.wait_for_function(
                    "window.__siege.world.s.state==='play'", timeout=15000
                )
                timeline_gap = host.evaluate("""() => {
                  __game.debug.manual(true);
                  __game.advance(1);
                  const gap=__siege.world.s.time*1000-AIHub.time();
                  __game.debug.manual(false);
                  return gap;
                }""")
                check(
                    "authority catch-up never runs ahead of synchronized session time",
                    timeline_gap <= 8.4,
                    timeline_gap,
                )
                remote_id = remote.evaluate("AIHub.me")
                before = host.evaluate(
                    "id=>window.__siege.world.s.players.find(p=>p.id===id).x", remote_id
                )
                remote.evaluate(
                    "() => {__siege.game.input.hold('right');__siege.game.input.hold('attack');}"
                )
                page.wait_for_timeout(900)
                after = host.evaluate(
                    "id=>({x:__siege.world.s.players.find(p=>p.id===id).x,shots:__siege.world.s.shots.filter(s=>s.owner===id).length,ack:__siege.world.s.players.find(p=>p.id===id).lastSeq})",
                    remote_id,
                )
                check(
                    "remote native movement and laser act on authoritative host",
                    after["x"] > before + 20
                    and after["shots"] > 0
                    and after["ack"] > 0,
                    {"before": before, "after": after},
                )
                remote.evaluate(
                    "() => {__siege.game.input.hold('right',false);__siege.game.input.hold('attack',false);__siege.game.input.tap('skill');}"
                )
                page.wait_for_timeout(450)
                pulse = host.evaluate(
                    "id=>__siege.world.s.players.find(p=>p.id===id).pulse", remote_id
                )
                check(
                    "single-tick remote pulse survives lower-rate input transport",
                    pulse > 7,
                    pulse,
                )
                remote.evaluate("__siege.game.input.tap('dash')")
                page.wait_for_timeout(450)
                energy = host.evaluate(
                    "id=>__siege.world.s.players.find(p=>p.id===id).energy", remote_id
                )
                check(
                    "single-tick remote boost consumes real shared-world reserve",
                    energy < 90,
                    energy,
                )
                tick = host.evaluate(
                    "() => {__siege.game.pause('test-local-overlay');return __siege.world.s.tick;}"
                )
                page.wait_for_timeout(650)
                current = host.evaluate(
                    "() => ({tick:__siege.world.s.tick,paused:__siege.game.paused,overlay:__siege.overlay})"
                )
                check(
                    "host local pause neutralizes input while authority continues",
                    current["paused"]
                    and current["overlay"]
                    and current["tick"] > tick + 40,
                    current,
                )
                host.evaluate("() => {__siege.shell.hide();__siege.game.resume();}")
                tick = host.evaluate(
                    "() => {const tick=__siege.world.s.tick;const until=performance.now()+400;while(performance.now()<until){}return tick;}"
                )
                page.wait_for_timeout(150)
                current = host.evaluate("__siege.world.s.tick")
                check(
                    "explicit authority clock catches up after timer throttling",
                    current >= tick + 48,
                    {"before": tick, "after": current},
                )
                host.evaluate("""() => {
                  const w=__siege.world;w.dev('act',1);w.s.state='play';w.s.objective.heat=37;w.s.score=4321;
                  const p=w.s.players[1];p.invuln=0;w.damagePlayer(p,2);w.spawn('tractor',100,100);
                }""")
                remote.wait_for_function(
                    "__siege.world.s.act===1 && __siege.world.s.score===4321 && __siege.world.s.players[1].hp===10",
                    timeout=5000,
                )
                page.wait_for_timeout(200)
                a = host.evaluate(
                    "() => ({act:__siege.world.s.act,hp:__siege.world.s.players[1].hp,score:__siege.world.s.score,heat:__siege.world.s.objective.heat})"
                )
                b = remote.evaluate(
                    "() => ({act:__siege.world.s.act,hp:__siege.world.s.players[1].hp,score:__siege.world.s.score,heat:__siege.world.s.objective.heat,keyframes:__siege.online.keyframes})"
                )
                check(
                    "lossy snapshots converge on phase, health, score and objective",
                    a["act"] == b["act"]
                    and a["hp"] == b["hp"]
                    and a["score"] == b["score"]
                    and abs(a["heat"] - b["heat"]) < 1
                    and b["keyframes"] > 1,
                    {"host": a, "remote": b},
                )
                host.evaluate(
                    "() => {__siege.world.s.state='upgrade';__siege.world.s.timer=12;__siege.world.s.players.forEach(p=>p.choice=-1);__siege.lastLifecycle='';}"
                )
                remote.wait_for_function(
                    "__siege.shell.screen==='upgrade'", timeout=5000
                )
                remote.evaluate("() => {__siege.upgradeChoices.set(AIHub.me,2);}")
                host.wait_for_function(
                    "id=>__siege.world.s.players.find(p=>p.id===id).choice===2",
                    arg=remote_id,
                    timeout=5000,
                )
                choice = host.evaluate(
                    "id=>__siege.world.s.players.find(p=>p.id===id).upgrades[2]",
                    remote_id,
                )
                check(
                    "upgrade selection reaches authority while menu overlay is open",
                    choice == 1,
                    choice,
                )
                page.locator("#timeup").click()
                for f in frames:
                    f.wait_for_function(
                        "__siege.ended && __siege.online.ended", timeout=10000
                    )
                before = [f.evaluate("__siege.online.sent") for f in frames]
                page.wait_for_timeout(750)
                after = [f.evaluate("__siege.online.sent") for f in frames]
                audio = [f.evaluate("__siege.audio.diagnostics()") for f in frames]
                check(
                    "end stops all outgoing input and snapshot traffic",
                    before == after,
                    {"before": before, "after": after},
                )
                check(
                    "end silences music and synthesized source nodes",
                    all(
                        a["stopped"] and a["sources"] == 0 and not a["musicPlaying"]
                        for a in audio
                    ),
                    audio,
                )
                for f in frames:
                    f.evaluate("""() => {
                      document.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'mouse'}));
                      window.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,code:'KeyJ',key:'j'}));
                    }""")
                page.wait_for_timeout(150)
                post_audio = [f.evaluate("__siege.audio.diagnostics()") for f in frames]
                post_sent = [f.evaluate("__siege.online.sent") for f in frames]
                hidden_ui = [
                    f.evaluate(
                        "document.querySelector('#flight-menu').hidden && document.querySelector('#touch-actions').hidden"
                    )
                    for f in frames
                ]
                check(
                    "post-end gestures cannot revive audio, traffic or game menus",
                    post_sent == after
                    and all(hidden_ui)
                    and all(
                        a["stopped"] and a["sources"] == 0 and not a["musicPlaying"]
                        for a in post_audio
                    ),
                    {"sent": post_sent, "audio": post_audio, "uiHidden": hidden_ui},
                )
                violations = []
                for f in frames:
                    violations.extend(f.evaluate("window.__hubViolations||[]"))
                check(
                    "real gameplay produces no browser or forbidden-API errors",
                    not errors and not violations,
                    {"errors": errors, "violations": violations},
                )
            except (PlaywrightError, ValueError, KeyError, StopIteration) as error:
                check("gameplay script completed", False, str(error))
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
    report = {"pass": all(c["pass"] for c in checks), "checks": checks}
    Path(report_path).write_text(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("artifact")
    parser.add_argument(
        "--report",
        default=str(
            Path(__file__).resolve().parents[1] / "docs/hub-gameplay-evidence.json"
        ),
    )
    args = parser.parse_args()
    result = run(args.artifact, args.report)
    for c in result["checks"]:
        if not c["pass"]:
            print(f"FAIL {c['name']}: {c.get('detail', '')}")
    passed = sum(c["pass"] for c in result["checks"])
    print(
        f"{passed} Hub gameplay checks passed, {len(result['checks']) - passed} failed"
    )
    raise SystemExit(0 if result["pass"] else 1)
