"""Actual packaged game over public PeerJS/WebRTC, with marked collision fixtures.

The fixtures test integration deterministically. They do not stand in for the
separate legitimate whole-campaign script.
"""

import contextlib
import functools
import http.server
import json
import sys
import threading
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def run(artifact):
    dev = Path(__file__).resolve().parents[2]
    results = {
        "artifact": Path(artifact).name,
        "checks": [],
        "pass": False,
        "fixtureRules": "Marked modified run; real canonical collision, damage, interception, brake and terminal logic; no victory injection.",
    }
    artifact = Path(artifact).resolve()
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0),
        functools.partial(QuietHandler, directory=str(artifact.parent)),
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    artifact_url = f"http://127.0.0.1:{server.server_address[1]}/{artifact.name}"
    browser = None
    pages = []

    def check(name, condition, detail=""):
        results["checks"].append(
            {"name": name, "pass": bool(condition), "detail": detail}
        )
        if not condition:
            raise AssertionError(f"{name}: {detail}")

    def evaluate(page, source, arg=None):
        return page.evaluate(source, arg)

    def collision_fixture(page, target="guest", airborne=False):
        return evaluate(
            page,
            """({target,airborne})=>{
          const a=__timelout.app,w=a.world;w.modified=true;
          const players=target==='all'?w.players:[w.players.find(p=>String(p.id)==='1')];
          for(const p of players){if(target==='all')p.hp=1;
            w.threats.push({id:w.nextId++,type:'missile',x:p.x,y:airborne?120:235,px:p.x,py:airborne?120:235,vx:0,vy:130,r:6,warning:0,age:0,targetId:p.id,targetX:p.x,targetY:240,grounded:false,left:0,right:0,safeX:0,life:10,committed:true,angle:0});
          }
          return {intercepts:w.stats.intercepts,hits:w.stats.hits,hp:w.players.find(p=>String(p.id)==='1').hp,score:w.score};
        }""",
            {"target": target, "airborne": airborne},
        )

    try:
        p = sync_playwright().start()
        if p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-swiftshader",
                    "--use-gl=angle",
                    "--use-angle=swiftshader",
                    "--disable-background-timer-throttling",
                    "--disable-renderer-backgrounding",
                    "--disable-backgrounding-occluded-windows",
                ],
            )
            contexts = [browser.new_context(ignore_https_errors=True) for _ in range(2)]
            pages = [context.new_page() for context in contexts]
            errors = []
            diagnostics = []
            for page in pages:
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.on(
                    "console",
                    lambda message: (
                        diagnostics.append({"type": message.type, "text": message.text})
                        if message.type in ["warning", "error"]
                        else None
                    ),
                )
                page.on(
                    "requestfailed",
                    lambda request: diagnostics.append(
                        {"failedUrl": request.url, "failure": request.failure}
                    ),
                )
                page.on(
                    "websocket",
                    lambda websocket: diagnostics.append({"websocket": websocket.url}),
                )
                page.goto(artifact_url, wait_until="load")
                page.wait_for_function("document.body.dataset.ready === 'true'")
                evaluate(
                    page,
                    """(()=>{const g=__timelout.game;g._running=false;cancelAnimationFrame(g._raf);window.__networkTestPump=setInterval(()=>g.advance(1/60),16);__timelout.app.screens.online();})()""",
                )
            host, guest = pages
            code = evaluate(host, "() => __timelout.app.net.createRoom()")
            evaluate(guest, "code => __timelout.app.net.joinRoom(code)", code)
            host.wait_for_function(
                "__timelout.app.net.roster.length===2 && __timelout.app.net.roster.every(p=>p.connected)"
            )
            check(
                "final artifact establishes actual two-context WebRTC room",
                len(code) == 8,
            )
            evaluate(guest, "__timelout.app.net.setReady(true)")
            host.wait_for_function("__timelout.app.net.roster.every(p=>p.ready)")
            check(
                "host starts real shared campaign",
                evaluate(host, "__timelout.app.net.startRoom()"),
            )
            guest.wait_for_function(
                "__timelout.app.world?.tick > 1 && __timelout.app.mode === 'run'"
            )
            for page in pages:
                evaluate(
                    page,
                    "window.testAction={move:0,fire:false,brake:false};__timelout.app.input.action=()=>window.testAction",
                )
            evaluate(guest, "testAction={move:1,fire:true,brake:false}")
            host.wait_for_function(
                "__timelout.app.world.players.find(p=>String(p.id)==='1').x>250"
            )
            guest.wait_for_function(
                "__timelout.app.world.players.find(p=>String(p.id)==='1').x>250"
            )
            check(
                "guest action crosses transport and authoritative position returns",
                True,
            )
            host.wait_for_function(
                "__timelout.app.world.shots.some(s=>String(s.owner)==='1')"
            )
            check("remote firing creates owned canonical shots", True)
            before_time = evaluate(host, "__timelout.app.world.time")
            evaluate(guest, "clearInterval(window.__networkTestPump)")
            host.wait_for_function(
                "t=>__timelout.app.world.time>t+0.8 && __timelout.app.world.players.find(p=>String(p.id)==='1').vx===0",
                arg=before_time,
            )
            check("shared clock advances while a guest stops input and rendering", True)
            check(
                "stopped input sampling expires cached local movement and fire",
                evaluate(
                    guest,
                    "__timelout.app.net._local.move===0 && !__timelout.app.net._local.fire",
                ),
            )
            evaluate(
                guest,
                "window.__networkTestPump=setInterval(()=>__timelout.game.advance(1/60),16)",
            )
            evaluate(guest, "testAction={move:0,fire:false,brake:false}")
            host.wait_for_function(
                "!__timelout.app.world.shots.length && __timelout.app.world.time>4"
            )
            before = collision_fixture(host, airborne=True)
            evaluate(guest, "testAction={move:0,fire:true,brake:false}")
            host.wait_for_function(
                "__timelout.app.world.stats.intercepts>" + str(before["intercepts"])
            )
            guest.wait_for_function(
                "__timelout.app.world.stats.intercepts>" + str(before["intercepts"])
            )
            check(
                "real shot intercepts threat and both copies gain score and charge",
                evaluate(
                    guest,
                    "__timelout.app.world.score>=2 && __timelout.app.world.charge>0",
                ),
            )
            evaluate(guest, "testAction={move:0,fire:false,brake:false}")
            host.wait_for_function(
                "!__timelout.app.world.shots.length && __timelout.app.world.players.every(p=>p.invuln<=0)"
            )
            before = collision_fixture(host)
            host.wait_for_function(
                "__timelout.app.world.stats.hits>" + str(before["hits"])
            )
            guest.wait_for_function(
                "__timelout.app.world.stats.hits>" + str(before["hits"])
            )
            check(
                "one canonical hit removes one pip and converges remotely",
                evaluate(
                    guest,
                    "hp=>__timelout.app.world.players.find(p=>String(p.id)==='1').hp===hp-1",
                    before["hp"],
                ),
            )
            evaluate(host, "__timelout.app.world.charge=100")
            evaluate(guest, "testAction={move:0,fire:false,brake:true}")
            host.wait_for_function("__timelout.app.world.brake>0")
            guest.wait_for_function("__timelout.app.world.brake>0")
            check(
                "guest brake request activates one shared slowdown",
                evaluate(
                    guest,
                    "__timelout.app.world.charge===0 && __timelout.app.world.stats.brakes===1",
                ),
            )
            evaluate(guest, "testAction={move:0,fire:false,brake:false}")
            host.wait_for_function(
                "__timelout.app.world.players.every(p=>p.invuln<=0) && __timelout.app.world.brake===0"
            )
            collision_fixture(host, target="all")
            host.wait_for_function("__timelout.app.net.finished", timeout=15000)
            guest.wait_for_function(
                "__timelout.app.net.finished && __timelout.app.mode==='results'",
                timeout=15000,
            )
            check(
                "all-disabled loss reaches complete results on both copies",
                evaluate(
                    guest,
                    "__timelout.app.world.outcome==='defeat' && __timelout.app.screens.shell.screen==='results'",
                ),
            )
            check(
                "terminal integrity score charge and phase agree",
                all(
                    evaluate(host, f"__timelout.app.world.{key}")
                    == evaluate(guest, f"__timelout.app.world.{key}")
                    for key in ["score", "charge", "phase", "outcome"]
                ),
            )
            old_seed = evaluate(host, "__timelout.app.world.seed")
            for page in pages:
                evaluate(page, "__timelout.app.screens.lobby()")
            evaluate(guest, "__timelout.app.net.setReady(true)")
            host.wait_for_function("__timelout.app.net.roster.every(p=>p.ready)")
            check(
                "results lobby can ready and replay",
                evaluate(host, "__timelout.app.net.startRoom()"),
            )
            guest.wait_for_function(
                "old=>__timelout.app.world.seed!==old && __timelout.app.world.tick>20 && __timelout.app.mode==='run'",
                arg=old_seed,
            )
            check("replay isolates prior run packets and advances", True)
            evaluate(host, "__timelout.app.net.leave()")
            guest.wait_for_function("__timelout.app.net.roomState==='disconnected'")
            check(
                "host leave stops shared simulation with solo escape",
                evaluate(
                    guest, "__timelout.app.screens.shell.screen==='network-error'"
                ),
            )
            evaluate(guest, "__timelout.app.startSolo()")
            guest.wait_for_function(
                "__timelout.app.mode==='run' && !__timelout.app.networked"
            )
            check("solo remains playable after network teardown", True)
            check(
                "packets respect size and rate ceilings",
                all(
                    evaluate(
                        page,
                        "__timelout.app.net.debug.maxPacketBytes<=16384 && __timelout.app.net.debug.maxUnreliableBytes<=1200 && __timelout.app.net.debug.maxPerSecond<=20",
                    )
                    for page in pages
                ),
            )
            results["networkMetrics"] = [
                evaluate(page, "__timelout.app.net.debug") for page in pages
            ]
            check(
                "no uncaught exceptions in actual packaged shared-world play",
                not errors,
                "; ".join(errors),
            )
            for page in pages:
                evaluate(page, "__timelout.app.net.leave()")
            browser.close()
    except (PlaywrightError, AssertionError, ValueError) as error:
        results["error"] = str(error)
        results["diagnostics"] = diagnostics if "diagnostics" in locals() else []
        results["states"] = []
        for page in pages:
            with contextlib.suppress(PlaywrightError):
                results["states"].append(
                    evaluate(
                        page,
                        "(()=>{const a=__timelout.app,n=a.net,g=__timelout.game;return{mode:a.mode,screen:a.screens.shell.screen,paused:g.paused,live:g.live,scene:g.scene,clock:g.real,net:{started:n.started,finished:n.finished,isHost:n.isHost,state:n.roomState,clock:n._clock,critical:n._critical.length,queued:n._packets.length,debug:n.debug},world:{tick:a.world?.tick,phase:a.world?.phase,players:a.world?.players}}})()",
                    )
                )
    finally:
        with contextlib.suppress(Exception):
            for page in pages:
                evaluate(page, "__timelout.app.net.leave()")
            if browser:
                browser.close()
    if "p" in locals():
        p.stop()
    server.shutdown()
    server.server_close()
    thread.join()
    results["pass"] = (
        "error" not in results
        and bool(results["checks"])
        and all(c["pass"] for c in results["checks"])
    )
    (dev / "test-artifacts/network-gameplay.json").write_text(
        json.dumps(results, indent=2)
    )
    if not results["pass"]:
        print("FAIL packaged multiplayer: " + results.get("error", "unknown"))
    print(
        f"Packaged multiplayer: {sum(c['pass'] for c in results['checks'])}/{len(results['checks'])} checks passed"
    )
    return not results["pass"]


if __name__ == "__main__":
    sys.exit(run(sys.argv[1]))
