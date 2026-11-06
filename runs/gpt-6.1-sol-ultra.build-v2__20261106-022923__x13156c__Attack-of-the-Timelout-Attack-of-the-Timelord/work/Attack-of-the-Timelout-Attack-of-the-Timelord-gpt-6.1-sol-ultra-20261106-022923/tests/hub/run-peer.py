"""Exercise real public PeerJS signaling and WebRTC between separate contexts."""

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


def run():
    dev = Path(__file__).resolve().parents[2]
    handler = functools.partial(QuietHandler, directory=str(dev))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_address[1]}/tests/hub/standalone-test.html"
    result = {
        "peerVersion": "1.5.5",
        "transport": "PeerJS / WebRTC / public PeerServer Cloud",
        "checks": [],
        "pass": False,
    }

    def check(name, condition, detail=""):
        result["checks"].append(
            {"name": name, "pass": bool(condition), "detail": detail}
        )
        if not condition:
            raise AssertionError(f"{name}: {detail}")

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            contexts = [browser.new_context(ignore_https_errors=True) for _ in range(2)]
            pages = [context.new_page() for context in contexts]
            for page in pages:
                page.goto(url)
                page.wait_for_function("window.loaded === true")
            host, guest = pages
            code = host.evaluate("() => net.createRoom()")
            check("public signaling creates a readable room", len(code) == 8, code)
            guest.evaluate("code => net.joinRoom(code)", code)
            host.wait_for_function(
                "net.roster.length === 2 && net.roster.every(p=>p.connected)"
            )
            check(
                "data link and application handshake establish two seats",
                guest.evaluate("net.me === 1 && net.roomState === 'lobby'"),
            )
            guest.evaluate("net.setReady(true)")
            host.wait_for_function("net.roster.every(p=>p.ready)")
            check(
                "guest ready is owned by its transport seat",
                host.evaluate("net.startRoom()"),
            )
            guest.wait_for_function("state.world?.tick > 1")
            check(
                "shared world starts on both browsers",
                guest.evaluate("state.starts === 1"),
            )
            initial = host.evaluate("state.world.players.find(p=>p.id==='1').x")
            guest.evaluate("action={move:1,fire:true,brake:false}")
            host.wait_for_function("state.world.players.find(p=>p.id==='1').x > 250")
            guest.wait_for_function("state.world.players.find(p=>p.id==='1').x > 250")
            check(
                "guest movement reaches authoritative world and returns", initial < 250
            )
            guest.evaluate("action={move:0,fire:true,brake:false}")
            host.wait_for_function("state.world.shots.some(s=>s.owner==='1')")
            check("remote fire creates real owned shots", True)
            host.evaluate(
                "net.finish({...state.world, phase:'results', outcome:'victory', score:777, tick:state.world.tick+1})"
            )
            guest.wait_for_function("net.finished && net.roomState === 'results'")
            check(
                "result and score converge",
                guest.evaluate(
                    "state.world.score === 777 && state.world.outcome === 'victory'"
                ),
            )
            guest.evaluate("net.setReady(true)")
            host.wait_for_function("net.roster.every(p=>p.ready)")
            host.evaluate("net.startRoom()")
            guest.wait_for_function(
                "state.starts === 2 && state.world?.tick > 20 && state.world.seed === net.seed"
            )
            check("remaining roster replays", True)
            guest.evaluate("net.leave()")
            host.wait_for_function("net.roster.length === 1")
            check(
                "guest departure removes its cannon",
                host.evaluate(
                    "state.world.players.find(p=>p.id==='1').connected === false"
                ),
            )
            late_rejected = False
            try:
                guest.evaluate("code => net.joinRoom(code)", code)
            except (PlaywrightError, AssertionError, ValueError) as error:
                late_rejected = "run is in progress" in str(error)
            check("active roster lock rejects late joins", late_rejected)
            host.evaluate(
                "net.finish({...state.world,phase:'results',outcome:'victory',tick:state.world.tick+1})"
            )
            guest.evaluate("code => net.joinRoom(code)", code)
            host.wait_for_function(
                "net.roster.length === 2 && net.roster.every(p=>p.connected)"
            )
            host.evaluate("net.leave()")
            guest.wait_for_function("net.roomState === 'disconnected'")
            check(
                "host leave terminates the guest session",
                guest.evaluate(
                    "!net.started && state.ends.some(e=>e.reason==='host-left')"
                ),
            )
            failed = False
            try:
                guest.evaluate("() => net.joinRoom('ZZZZZZZZ')")
            except (PlaywrightError, AssertionError, ValueError) as error:
                failed = any(
                    text in str(error)
                    for text in [
                        "No room answered",
                        "data link failed",
                        "connection closed",
                    ]
                )
            check("failed join gives an actionable error", failed)
            guest.evaluate("net.leave()")
            check(
                "failed join can return offline",
                guest.evaluate("net.roomState === 'offline' && !net.peer"),
            )
    except (PlaywrightError, AssertionError, ValueError) as error:
        if "run is in progress" in str(error):
            result["checks"].append(
                {
                    "name": "active roster lock rejects late joins",
                    "pass": True,
                    "detail": "Host rejected late join",
                }
            )
        else:
            result["error"] = str(error)
    finally:
        with contextlib.suppress(Exception):
            for page in pages:
                page.evaluate("net.leave()")
            browser.close()
        server.shutdown()
        server.server_close()
        thread.join()
    result["pass"] = (
        "error" not in result
        and len(result["checks"]) >= 13
        and all(c["pass"] for c in result["checks"])
    )
    (dev / "test-artifacts/peer-results.json").write_text(json.dumps(result, indent=2))
    if not result["pass"]:
        print(
            "FAIL standalone online: "
            + result.get(
                "error", "; ".join(c["name"] for c in result["checks"] if not c["pass"])
            )
        )
    print(
        f"Standalone public WebRTC: {sum(c['pass'] for c in result['checks'])}/{len(result['checks'])} checks passed"
    )
    return not result["pass"]


if __name__ == "__main__":
    import contextlib

    sys.exit(run())
