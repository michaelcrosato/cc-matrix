"""Networking checks. Run with the installed Playwright Python interpreter."""
import functools
import http.server
import pathlib
import sys
import threading

from playwright.sync_api import sync_playwright


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    failures = []
    passed = 0
    directory = pathlib.Path(__file__).resolve().parent
    handler = functools.partial(QuietHandler, directory=str(directory))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    address = f"http://127.0.0.1:{server.server_port}"
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context()
            host = context.new_page()
            guest = context.new_page()
            for page in (host, guest):
                page.goto(address)
                page.evaluate("""async () => {
                  const {JungleOnline} = await import('/online.js');
                  window.events = [];
                  window.net = new JungleOnline({
                    onStart: () => events.push(['start']),
                    onInput: (input) => events.push(['input', input]),
                    onSnapshot: (state) => events.push(['snapshot', state]),
                    onDisconnect: () => events.push(['disconnect'])
                  });
                  await net.init();
                }""")
            code = host.evaluate("net.createRoom({local:true})")
            assert code.startswith("LOCAL-")
            passed += 1
            guest.evaluate("code => net.joinRoom(code)", code)
            for page in (host, guest):
                page.wait_for_function("net.connected && net.playerCount === 2")
            passed += 1
            assert host.evaluate("net.startGame()")
            guest.wait_for_function("net.running && events.some(e => e[0] === 'start')")
            passed += 1
            guest.evaluate("net.sendInput({x:0.7,jump:true})")
            host.wait_for_function("events.some(e => e[0] === 'input' && e[1].jump && e[1].x === 0.7)")
            passed += 1
            host.evaluate("net.sendSnapshot({stage:2,score:125,players:[{x:4,y:2},{x:5,y:3}]})")
            guest.wait_for_function("events.some(e => e[0] === 'snapshot' && e[1].score === 125)")
            passed += 1
            assert host.evaluate("!net.sendSnapshot({score:126})")
            passed += 1
            guest.evaluate("net.receive({v:1,kind:'snapshot',seq:0,value:{score:-10}})")
            assert guest.evaluate("net.lastState.score") == 125
            passed += 1
            guest.evaluate("net.leave()")
            host.wait_for_function("!net.connected && events.some(e => e[0] === 'disconnect')")
            passed += 1
            assert guest.evaluate("net.playerIndex === 0 && net.transport === 'solo' && !net.running")
            passed += 1
            assert not host.evaluate("net.startGame()")
            passed += 1
            assert not guest.evaluate("net.joinRoom('WRONG!')")
            passed += 1
            guest.evaluate("code => net.joinRoom(code)", code)
            host.wait_for_function("net.connected")
            guest.wait_for_function("net.connected && net.running")
            passed += 1
            guest.close()
            host.wait_for_function("!net.connected", timeout=10000)
            passed += 1
            host.evaluate("net.leave()")
            context.close()
            if "--internet" in sys.argv:
                contexts = [browser.new_context(), browser.new_context()]
                remote_pages = []
                for remote_context in contexts:
                    page = remote_context.new_page()
                    page.goto(address)
                    page.evaluate("""async () => {
                      const {JungleOnline} = await import('/online.js');
                      window.events = [];
                      window.net = new JungleOnline({
                        onInput: input => events.push(['input', input]),
                        onSnapshot: state => events.push(['snapshot', state])
                      });
                      await net.init();
                    }""")
                    remote_pages.append(page)
                internet_host, internet_guest = remote_pages
                room = internet_host.evaluate("net.createRoom()")
                internet_guest.evaluate("code => net.joinRoom(code)", room)
                for page in remote_pages:
                    page.wait_for_function("net.connected && net.transport === 'webrtc'", timeout=25000)
                passed += 1
                internet_host.evaluate("net.startGame()")
                internet_guest.wait_for_function("net.running")
                internet_guest.evaluate("net.sendInput({x:1,jump:true})")
                internet_host.wait_for_function("events.some(e => e[0] === 'input' && e[1].jump)")
                passed += 1
                internet_host.evaluate("net.sendSnapshot({score:345,stage:3})")
                internet_guest.wait_for_function("events.some(e => e[0] === 'snapshot' && e[1].score === 345)")
                passed += 1
                for page in remote_pages:
                    page.evaluate("net.leave()")
                for remote_context in contexts:
                    remote_context.close()
            browser.close()
    except Exception as error:
        failures.append(str(error))
    finally:
        server.shutdown()
        server.server_close()
    for failure in failures:
        print(f"FAIL networking: {failure}")
    print(f"Networking: {passed} passed, {len(failures)} failed")
    raise SystemExit(bool(failures))


if __name__ == "__main__":
    main()
