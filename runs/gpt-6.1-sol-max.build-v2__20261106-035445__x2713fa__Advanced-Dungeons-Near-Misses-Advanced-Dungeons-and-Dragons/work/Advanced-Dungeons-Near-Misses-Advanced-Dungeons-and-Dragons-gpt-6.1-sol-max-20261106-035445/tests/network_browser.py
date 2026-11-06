"""Production transport tests using real RTCPeerConnection in two contexts.
The small fixture isolates transport behavior; final-game synchronization runs
in hub_browser.py against the packed delivery artifact.
"""

import contextlib
import functools
import http.server
import json
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


@contextlib.contextmanager
def local_server(root):
    handler = functools.partial(QuietHandler, directory=str(root))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def run():
    checks = 0
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        host_context = browser.new_context()
        guest_context = browser.new_context()
        try:
            host = host_context.new_page()
            guest = guest_context.new_page()
            errors = []
            host.on("pageerror", lambda error: errors.append(str(error)))
            guest.on("pageerror", lambda error: errors.append(str(error)))
            for page in [host, guest]:
                page.goto((ROOT / "tests/network-fixture.html").as_uri())
                assert page.title() == "Near Misses transport fixture"
            checks += 1
            invitation = host.evaluate("__fixture.net.host({lan:true})")
            assert invitation.startswith("NM1.")
            checks += 1
            reply = guest.evaluate(
                "invitation => __fixture.net.join(invitation)", invitation
            )
            host.evaluate("reply => __fixture.net.accept(reply)", reply)
            for page in [host, guest]:
                page.wait_for_function(
                    "__fixture.net.running && __fixture.net.connected", timeout=15000
                )
            assert host.evaluate("__fixture.net.authority")
            assert not guest.evaluate("__fixture.net.authority")
            assert host.evaluate("__fixture.net.channel.ordered")
            checks += 1
            guest.evaluate(
                "__fixture.net.sendInput({mx:0,ax:1,ay:0,fireId:1}); __fixture.net.sendInput({mx:0,ax:1,ay:0,fireId:0})"
            )
            host.wait_for_function(
                "__fixture.commands.filter(x=>x.cmd.fireId===1).length===1"
            )
            guest.wait_for_function(
                "__fixture.state.party.ammo===2 && __fixture.state.enemies[0].hp===0"
            )
            checks += 1
            guest.wait_for_function("__fixture.net._pending.length===0")
            guest.evaluate("__fixture.net.sendInput({ax:1,fireId:1})")
            guest.wait_for_timeout(300)
            assert (
                host.evaluate("__fixture.commands.filter(x=>x.cmd.fireId===1).length")
                == 1
            )
            checks += 1
            guest.evaluate("__fixture.net.sendInput({ax:1,travel:'axe'})")
            guest.wait_for_function("__fixture.state.party.tools.includes('axe')")
            assert (
                host.evaluate("__fixture.state.party.tools.filter(x=>x==='axe').length")
                == 1
            )
            checks += 1
            guest.evaluate(
                "__fixture.net.channel.send(JSON.stringify({nm:1,c:'old-version',e:__fixture.net.sessionNonce,t:'input',seq:99}))"
            )
            host.wait_for_function("__fixture.net.diagnostics.rejected>0")
            checks += 1
            for page in [host, guest]:
                diagnostics = page.evaluate("__fixture.net.diagnostics")
                assert diagnostics["maxBytes"] <= 15000
                assert diagnostics["maxPerSecond"] <= 18
            checks += 1
            guest.evaluate("__fixture.net.close()")
            host.wait_for_function(
                "!__fixture.net.running && __fixture.state.players.length===1"
            )
            checks += 1
            assert not errors, errors
            checks += 1
        finally:
            host_context.close()
            guest_context.close()
            browser.close()
    return checks


if __name__ == "__main__":
    try:
        print(json.dumps({"networkBrowserChecks": run()}))
    except Exception as error:
        print(json.dumps({"failure": str(error)}))
        raise
