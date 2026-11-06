"""One-command real-browser tests for standalone networking (no GPU required)."""
import contextlib
import functools
import http.server
import pathlib
import threading

from playwright.sync_api import sync_playwright


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


root = pathlib.Path(__file__).resolve().parent
handler = functools.partial(QuietHandler, directory=str(root))
server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
base = f"http://127.0.0.1:{server.server_port}"
failures = []
checks = 0


def check(condition, message):
    global checks
    checks += 1
    if not condition:
        failures.append(message)


try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context()
        host = context.new_page()
        guest = context.new_page()
        for page in [host, guest]:
            page.goto(base + "/hub-notes.md")
            page.evaluate("""async () => {
              const {OnlineLink} = await import('/hub.js');
              window.received = []; window.inputs = []; window.statuses = [];
              window.link = new OnlineLink({
                onState: (state,id) => received.push({state,id}),
                onInput: (input,id) => inputs.push({input,id}),
                onStatus: text => statuses.push(text),
              });
            }""")
        check(host.evaluate("link.role") == "solo", "Adapter did not start in solo mode")
        host.evaluate("link.host('TRANSPORT-TEST')")
        guest.evaluate("link.join('TRANSPORT-TEST')")
        guest.wait_for_function("link.connected && link.me === 1")
        check(host.evaluate("link.players.length") == 2, "BroadcastChannel host roster missing guest")
        check(guest.evaluate("link.players.length") == 2, "BroadcastChannel guest roster missing host")
        guest.evaluate("link.sendInput({move: [1,0], action:true})")
        host.wait_for_function("inputs.length === 1")
        check(host.evaluate("inputs[0].id === 1 && inputs[0].input.action"), "BroadcastChannel input lost sender or controls")
        host.evaluate("link.sendState({heroes:[{id:1,pos:[4,8,12]}],stage:2})")
        guest.wait_for_function("received.length === 1")
        check(guest.evaluate("received[0].state.heroes[0].pos[2] === 12 && received[0].state.stage === 2"), "BroadcastChannel snapshot corrupted")
        check(host.evaluate("link.sendState({stage:99}) === false"), "State rate limiting did not reject immediate duplicate")
        guest.evaluate("link.close()")
        host.wait_for_function("link.players.length === 1")
        check(guest.evaluate("link.role === 'solo' && !link.connected"), "Standalone close did not restore solo")
        check(guest.evaluate("""() => {
          try { link.decodeDescription('invalid','offer'); return false; } catch { return true; }
        }"""), "Malformed connection code was accepted")

        offer = host.evaluate("link.createOffer()")
        check(offer.startswith("SUN1."), "WebRTC invitation code missing prefix")
        answer = guest.evaluate("code => link.acceptOffer(code)", offer)
        check(answer.startswith("SUN1."), "WebRTC answer code missing prefix")
        host.evaluate("code => link.acceptAnswer(code)", answer)
        host.wait_for_function("link.connected", timeout=20000)
        guest.wait_for_function("link.connected", timeout=20000)
        check(host.evaluate("link.role === 'host' && link.channel.readyState === 'open'"), "WebRTC host data channel did not open")
        check(guest.evaluate("link.role === 'guest' && link.me === 1"), "WebRTC guest role incorrect")
        host.evaluate("received = []; inputs = []")
        guest.evaluate("received = []; inputs = []")
        guest.evaluate("link.sendInput({move:[0,-1], freeze:true})")
        host.wait_for_function("inputs.length === 1")
        check(host.evaluate("inputs[0].id === 1 && inputs[0].input.freeze"), "WebRTC controls did not reach authoritative host")
        host.evaluate("link.sendState({heroes:[{id:0,pos:[1,2,3]}],stage:4})")
        guest.wait_for_function("received.length === 1")
        check(guest.evaluate("received[0].state.stage === 4"), "WebRTC authoritative world did not reach partner")
        for page in [host, guest]:
            page.evaluate("link.close()")
        check(host.evaluate("link.pc === null && link.channel === null && !link.connected"), "WebRTC close leaked peer connection")
        context.close()
        browser.close()
except Exception as error:
    failures.append(f"Unexpected transport test error: {error}")
finally:
    server.shutdown()
    server.server_close()

for failure in failures:
    print("FAIL:", failure)
print(f"{checks} transport checks, {len(failures)} failures")
raise SystemExit(bool(failures))
