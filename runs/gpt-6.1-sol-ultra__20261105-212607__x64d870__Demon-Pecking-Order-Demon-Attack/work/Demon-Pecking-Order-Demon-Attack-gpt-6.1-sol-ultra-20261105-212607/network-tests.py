"""One-command network adapter checks. Prints only failures and one count."""
import functools
import http.server
import pathlib
import threading
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    session = (ROOT / "session.js").read_text()
    adapter = (ROOT / "hub.js").read_text()
    fixture = ROOT / "network-fixture.html"
    fixture.write_text(
        '<!doctype html><html><head><meta charset="utf-8"><script>'
        + session
        + '</script><meta name="hub:session" content="1">'
        + '<meta name="hub:session-players" content="1-2">'
        + '<meta name="hub:session-mode" content="shared-world">'
        + '<meta name="hub:session-goal" content="Defend the outpost">'
        + '<meta name="hub:session-howto" content="Move and fire">'
        + '<title>Network adapter fixture</title></head><body>Network adapter fixture<script>'
        + adapter
        + """
        window.receivedInputs=[];window.receivedStates=[];window.ends=[];
        window.link=new HubLink({onInput:(i,id)=>receivedInputs.push({i,id}),onState:s=>receivedStates.push(s),onEnd:e=>ends.push(e)});
        window.ready=link.init();
        setInterval(()=>{if(link.isHost)link.sendState({score:123,x:4});else link.sendInput({move:1,fire:true});},20);
        </script></body></html>"""
    )
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}/"
    passed = failed = 0

    def check(name, callback):
        nonlocal passed, failed
        try:
            callback()
            passed += 1
        except Exception as error:
            failed += 1
            print(f"FAIL {name}: {error}")

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context(ignore_https_errors=True)

            def local_transport():
                host = context.new_page()
                guest = context.new_page()
                try:
                    host.goto(base + "network-fixture.html")
                    guest.goto(base + "network-fixture.html")
                    code = host.evaluate("link.hostRoom({local:true})")
                    guest.evaluate("code=>link.joinRoom(code)", code)
                    host.wait_for_function("link.started && receivedInputs.length>0")
                    guest.wait_for_function("link.started && receivedStates.length>0")
                    assert host.evaluate("receivedInputs[0].id") == 1
                    assert guest.evaluate("receivedStates[0].score") == 123
                    assert host.evaluate("link.players.length") == 2
                    host.evaluate("link.close()")
                    guest.wait_for_function("ends.length===1")
                    assert guest.evaluate("ends[0].reason") == "host-left"
                finally:
                    host.close()
                    guest.close()

            if '--online-only' not in sys.argv:
                check("two-page co-op, inputs, snapshots and host departure", local_transport)

            def public_transport():
                host = context.new_page()
                guest = context.new_page()
                try:
                    host.goto(base + "network-fixture.html")
                    guest.goto(base + "network-fixture.html")
                    code = host.evaluate("link.hostRoom()")
                    guest.evaluate("code=>link.joinRoom(code)", code)
                    host.wait_for_function("link.started && receivedInputs.length>0", timeout=30000)
                    guest.wait_for_function("link.started && receivedStates.length>0", timeout=30000)
                    assert guest.evaluate("receivedStates[0].score") == 123
                    assert host.evaluate("receivedInputs[0].id") == 1
                    assert host.evaluate("!!link._connection.peerConnection")
                finally:
                    host.close()
                    guest.close()

            check("public PeerJS signaling and direct WebRTC co-op", public_transport)

            def protocol(scenario):
                page = context.new_page()
                try:
                    page.goto(
                        base
                        + "harness.html?game=network-fixture.html&players=2&auto=1&limit=12&scenario="
                        + scenario
                    )
                    page.wait_for_function("document.body.dataset.complete==='true'", timeout=70000)
                    result = page.evaluate("window.__hubCheck")
                    failures = [x for x in result["checks"] if not x["pass"]]
                    assert result["pass"], failures
                finally:
                    page.close()

            if '--online-only' not in sys.argv:
                check("AI Hub shared-world protocol", lambda: protocol(""))
                check("AI Hub dedicated server protocol", lambda: protocol("server"))
                check("AI Hub host departure protocol", lambda: protocol("host-leave"))
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    print(f"{passed} passed, {failed} failed")
    raise SystemExit(1 if failed else 0)


if __name__ == "__main__":
    main()
