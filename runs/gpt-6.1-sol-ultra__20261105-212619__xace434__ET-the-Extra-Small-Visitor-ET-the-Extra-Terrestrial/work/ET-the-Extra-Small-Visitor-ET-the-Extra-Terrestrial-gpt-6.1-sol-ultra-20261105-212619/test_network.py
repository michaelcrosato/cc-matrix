"""Transport integration checks; called from the project's one test command."""

import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def run_network_tests(browser):
    """Return failure text and count. Uses only two lightweight browser pages."""
    folder = Path(__file__).resolve().parent

    class QuietHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(folder), **kwargs)

        def log_message(self, *_args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_port}"
    html = f"""<!doctype html><title>Extra-Small Visitor transport test</title>
    <script type="module">
    import {{GameNetwork}} from '{base}/net.js';
    window.events = [];
    window.n = new GameNetwork({{
      onState: d=>events.push(['state',d]),
      onInput: (d,id)=>events.push(['input',d,id]),
      onStart: ()=>events.push(['start']),
      onRemoteFinish: d=>events.push(['finish',d]),
      onLeave: id=>events.push(['leave',id]),
      onRole: d=>events.push(['role',d]),
      onMessage: d=>events.push(['message',d])
    }});
    await n.init(); window.testReady = true;
    </script>"""
    context = browser.new_context()
    context.route(
        f"{base}/transport-test.html",
        lambda route: route.fulfill(body=html, content_type="text/html"),
    )
    host = context.new_page()
    guest = context.new_page()
    failures = []
    count = 0

    def check(label, fn):
        nonlocal count
        count += 1
        try:
            fn()
        except Exception as error:  # noqa: BLE001 - report every failed browser assertion.
            failures.append(f"Network: {label}: {error}")

    def direct_handshake():
        invitation = host.evaluate("n.createOffer()")
        reply = guest.evaluate("code=>n.acceptOffer(code)", invitation)
        host.evaluate("code=>n.acceptAnswer(code)", reply)
        host.wait_for_function("n.connected", timeout=15000)
        guest.wait_for_function("n.connected", timeout=15000)
        assert host.evaluate("n.isHost && n.me===0 && n.players.length===2")
        assert guest.evaluate("!n.isHost && n.me===1 && n.players.length===2")

    def world_transfer():
        host.evaluate("n.sendState({stage:'garden',players:[{x:3,z:7}],heart:83},true)")
        guest.wait_for_function("events.some(e=>e[0]==='state'&&e[1].heart===83)")

    def input_transfer():
        guest.evaluate("n.sendInput({x:100,z:-100,interact:true,pulse:true})")
        host.wait_for_function(
            "events.some(e=>e[0]==='input'&&e[1].interact&&e[2]===1)"
        )
        assert host.evaluate(
            "events.filter(e=>e[0]==='input').at(-1)[1].x===1 && events.filter(e=>e[0]==='input').at(-1)[1].z===-1"
        )

    def lifecycle():
        host.evaluate("n.startStandalone()")
        guest.wait_for_function("events.some(e=>e[0]==='start')")
        host.evaluate("n.finish(true,123,{Flowers:4})")
        guest.wait_for_function(
            "events.some(e=>e[0]==='finish'&&e[1].won&&e[1].score===123)"
        )

    def queued_note():
        assert guest.evaluate(
            "()=>{n.lastInput=performance.now();n.sendInput({note:0});n.sendInput({x:0});return n.pendingInput.note===0}"
        ), "A note press must survive empty frames before the next network send"
        guest.evaluate("()=>{n.lastInput=-Infinity;n.sendInput({})}")
        host.wait_for_function(
            "events.some(e=>e[0]==='input'&&e[1].note===0&&e[2]===1)"
        )
        guest.evaluate("()=>{n.lastInput=-Infinity;n.sendInput({note:9})}")
        host.wait_for_function(
            "events.filter(e=>e[0]==='input').at(-1)?.[1].note===null"
        )

    def bad_code():
        message = guest.evaluate(
            "async()=>{try{await n.acceptOffer('bad')}catch(e){return e.message}}"
        )
        assert "invitation" in message
        assert guest.evaluate("n.connected"), (
            "Bad code should preserve the existing connection"
        )

    def local_room():
        host.evaluate("n.disconnect()")
        guest.evaluate("n.disconnect()")
        room = host.evaluate("n.createLocalRoom()")
        guest.evaluate("code=>n.joinLocalRoom(code)", room)
        host.wait_for_function("n.connected && n.kind==='local-room'")
        guest.wait_for_function("n.connected && n.kind==='local-room'")
        host.evaluate("n.sendState({stage:'forest',heart:99},true)")
        guest.wait_for_function("events.some(e=>e[0]==='state'&&e[1].heart===99)")

    try:
        for page in [host, guest]:
            page.goto(f"{base}/transport-test.html")
            page.wait_for_function("window.testReady")
        check("direct WebRTC invitation and reply", direct_handshake)
        check("authoritative world reaches the guest", world_transfer)
        check("guest actions reach the host with validation", input_transfer)
        check("puzzle note survives throttling and rejects invalid notes", queued_note)
        check("host start and team finish", lifecycle)
        check("malformed code is rejected without dropping the link", bad_code)
        check("same-browser room joins and transfers the world", local_room)
        host.evaluate("n.destroy()")
        guest.evaluate("n.destroy()")
        host.close()
        guest.close()
        harness = context.new_page()

        def hub_scenario(scenario):
            harness.goto(
                f"{base}/hub/harness.html?game=net-smoke.html&players=2&auto=1"
                f"&play=2000&latency=150&jitter=50&loss=5&scenario={scenario}"
            )
            harness.wait_for_function("window.__hubCheck?.done", timeout=45000)
            report = harness.evaluate("window.__hubCheck")
            failed = [
                f"{c['name']}: {c['detail']}" for c in report["checks"] if not c["pass"]
            ]
            assert report["pass"], "; ".join(failed)

        for scenario in ["standard", "host-leave", "server"]:
            check(
                f"AI Hub conformance ({scenario}, 150 ms latency, 5% loss)",
                lambda scenario=scenario: hub_scenario(scenario),
            )
    finally:
        if not host.is_closed():
            host.evaluate("n.destroy()")
        if not guest.is_closed():
            guest.evaluate("n.destroy()")
        context.close()
        server.shutdown()
        server.server_close()
    return failures, count


if __name__ == "__main__":
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        failures, count = run_network_tests(browser)
        browser.close()
    for failure in failures:
        print(failure)
    print(f"{count} network checks, {len(failures)} failures")
    raise SystemExit(bool(failures))
