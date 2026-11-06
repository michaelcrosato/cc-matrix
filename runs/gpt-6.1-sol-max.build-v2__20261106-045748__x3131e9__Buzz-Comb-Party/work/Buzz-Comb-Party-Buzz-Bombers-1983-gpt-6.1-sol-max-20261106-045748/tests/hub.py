import json
import traceback
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlencode

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

base = Path(__file__).resolve().parents[1]
release = json.loads((base / "release.json").read_text())
checks = []


def check(name, ok, detail=""):
    checks.append(
        {"name": name, "pass": bool(ok), "detail": str(detail) if not ok else ""}
    )


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(
    ("127.0.0.1", 0), partial(Quiet, directory=str(base.parent))
)
Thread(target=server.serve_forever, daemon=True).start()
origin = "http://127.0.0.1:" + str(server.server_address[1])
game = "/" + release["basename"] + ".html"
harness = "/" + base.name + "/tests/hub/harness.html"
reports = []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for name, extra in [
            ("two-player", {"players": 2}),
            ("impaired", {"players": 2, "latency": 150, "jitter": 50, "loss": 5}),
            ("host-leave", {"players": 2, "scenario": "host-leave"}),
            ("server", {"players": 2, "scenario": "server"}),
            ("one-player", {"players": 1}),
        ]:
            context = browser.new_context(viewport={"width": 1200, "height": 800})
            page = context.new_page()
            page.goto(
                origin
                + harness
                + "?"
                + urlencode({"game": game, "auto": 1, "seed": 7, **extra})
            )
            page.wait_for_function(
                "document.body.dataset.complete === 'true'", timeout=90000
            )
            result = page.evaluate("window.__hubCheck")
            reports.append({"scenario": name, **result})
            check(
                "official Hub " + name,
                result.get("pass"),
                [c for c in result.get("checks", []) if not c["pass"]],
            )
            for f in page.frames[1:]:
                try:
                    state = f.evaluate(
                        "({marker:window.__game?.debug.snapshot().fingerprint,ready:window.__BUZZ?.network.metrics.readyCalls,ended:window.__BUZZ?.ended,finish:window.__BUZZ?.network.metrics.finishCalls,bytes:window.__BUZZ?.network.metrics.maxBytes})"
                    )
                    check(
                        "Hub " + name + " build identity and lifecycle",
                        state.get("marker") == "buzz-comb-party-20261106"
                        and state.get("ready") == 1
                        and state.get("ended")
                        and state.get("finish", 0) <= 1
                        and state.get("bytes", 99999) < 16384,
                        state,
                    )
                    if name == "server" and f.evaluate("AIHub.server"):
                        check(
                            "server host owns no controllable seat or audio",
                            f.evaluate(
                                "__BUZZ.localSeat===0 && __BUZZ.world.players.length===2 && !__game.audio.ctx && __game.input.pad===null"
                            ),
                        )
                except PlaywrightError as error:
                    check("Hub frame lifecycle remains inspectable", False, str(error))
            context.close()
        # Real copies running actual simultaneous actions under the official coordinator.
        context = browser.new_context(viewport={"width": 1400, "height": 900})
        page = context.new_page()
        page.goto(
            origin
            + harness
            + "?"
            + urlencode({"game": game, "players": 2, "seed": 7, "limit": 900})
        )
        page.wait_for_function(
            "Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow.__BUZZ?.ready)",
            timeout=30000,
        )
        frames = page.frames[1:]
        check(
            "two actual copies bypass standalone front end",
            all(
                f.evaluate(
                    "__BUZZ.online && __game.sceneName==='play' && !__BUZZ.attract"
                )
                for f in frames
            ),
        )
        check(
            "countdown does not advance the simulation",
            all(f.evaluate("__BUZZ.world.tick===0") for f in frames),
        )
        page.locator("#release").click()
        page.wait_for_function(
            "document.querySelector('iframe').contentWindow.__BUZZ.world.status==='live'",
            timeout=20000,
        )
        host = next(f for f in frames if f.evaluate("AIHub.isHost"))
        client = next(f for f in frames if not f.evaluate("AIHub.isHost"))
        # Both use ordinary controls; synchronized fixture only places the test bee in the firing lane.
        host.evaluate(
            """(()=>{const w=__BUZZ.world;BCP.spawnBee(w,{kind:'worker',x:w.players[0].x,tier:6,dir:1,reward:'network-proof'});__game.input.hold('fire');})()"""
        )
        client.evaluate("__game.input.tap('call')")
        page.wait_for_function(
            "document.querySelector('iframe').contentWindow.__BUZZ.world.stats.hits>0",
            timeout=15000,
        )
        host.evaluate("__game.input.hold('fire',false)")
        page.wait_for_function(
            "(()=>{const f=Array.from(document.querySelectorAll('iframe'));return f[0].contentWindow.__BUZZ.world.score===f[1].contentWindow.__BUZZ.world.score&&f[0].contentWindow.__BUZZ.world.stats.hits>0})()",
            timeout=10000,
        )
        check(
            "two copies share actual bee conversion and score",
            host.evaluate("__BUZZ.world.stats.hits")
            == client.evaluate("__BUZZ.world.stats.hits")
            and host.evaluate("__BUZZ.world.score")
            == client.evaluate("__BUZZ.world.score"),
        )
        page.wait_for_function(
            "Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow.__BUZZ.world.coverage.call===true)",
            timeout=10000,
        )
        check(
            "remote call is authoritative and shared",
            host.evaluate("__BUZZ.world.coverage.call===true")
            and client.evaluate("__BUZZ.world.coverage.call===true"),
        )
        before = host.evaluate("__BUZZ.world.tick")
        host.evaluate("__game.menu('pause',{pause:false});null")
        page.wait_for_timeout(500)
        check(
            "online local options keep the host world moving",
            host.evaluate("__BUZZ.world.tick") > before
            and host.evaluate("__game.shell.screen") == "pause",
        )
        host.evaluate("__game.shell.hide();null")
        # Malformed and stale inputs travel through the real SDK; sender cannot claim P1.
        client.evaluate(
            "AIHub.send({v:1,k:'input',seq:-1,move:Infinity,aim:null,fire:true,call:0,seat:1},{to:AIHub.host})"
        )
        page.wait_for_timeout(200)
        check(
            "host rejects malformed remote action",
            host.evaluate("__BUZZ.network.metrics.rejected") > 0,
        )
        stock = host.evaluate("__BUZZ.world.reserves")
        host.evaluate("BCP.queueGrowth(__BUZZ.world,0,640,.01)")
        page.wait_for_function(
            "(()=>{const f=Array.from(document.querySelectorAll('iframe'));return f.every(x=>x.contentWindow.__BUZZ.world.stats.retries===1)})()",
            timeout=15000,
        )
        check(
            "enclosure reset and shared stock agree in both copies",
            host.evaluate("__BUZZ.world.reserves") == stock - 1
            and client.evaluate("__BUZZ.world.reserves") == stock - 1,
        )
        page.select_option("#who", "p1")
        page.locator("#remove").click()
        page.wait_for_function(
            "document.querySelector('iframe').contentWindow.__BUZZ.world.players.length===1",
            timeout=10000,
        )
        check(
            "departing client removes its can without a stock charge",
            host.evaluate("__BUZZ.world.reserves") == stock - 1
            and host.evaluate("__BUZZ.world.players.length") == 1,
        )
        page.locator("#timeup").click()
        page.wait_for_timeout(1000)
        check(
            "one terminal team result and end stop sends",
            host.evaluate("__BUZZ.network.metrics.finishCalls") == 1
            and host.evaluate("__BUZZ.ended"),
        )
        sent = host.evaluate("__BUZZ.network.metrics.sent")
        tick = host.evaluate("__BUZZ.world.tick")
        page.wait_for_timeout(350)
        check(
            "end freezes world and outbound traffic",
            host.evaluate("__BUZZ.network.metrics.sent") == sent
            and host.evaluate("__BUZZ.world.tick") == tick,
        )
        reports.append(
            {"scenario": "gameplay", "host": host.evaluate("__game.debug.snapshot()")}
        )
        context.close()
        browser.close()
except (PlaywrightError, OSError, ValueError, TypeError):
    check("Hub automation completed", False, traceback.format_exc())
finally:
    server.shutdown()
    server.server_close()
(base / "evidence/hub-report.json").write_text(
    json.dumps({"checks": checks, "reports": reports}, indent=2)
)
print(json.dumps({"checks": checks}))
