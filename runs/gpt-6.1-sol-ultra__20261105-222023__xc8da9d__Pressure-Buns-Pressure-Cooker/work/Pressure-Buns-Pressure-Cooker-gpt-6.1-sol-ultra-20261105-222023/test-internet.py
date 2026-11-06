# ruff: noqa: BLE001
# Test boundaries collect browser exceptions as failures.
import functools
import http.server
import pathlib
import threading

from playwright.sync_api import sync_playwright


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


folder = pathlib.Path(__file__).resolve().parent
server = http.server.ThreadingHTTPServer(
    ("127.0.0.1", 0), functools.partial(Quiet, directory=str(folder))
)
threading.Thread(target=server.serve_forever, daemon=True).start()
failed = False
try:
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        c = b.new_context()
        c.add_init_script("window.BroadcastChannel=undefined")
        h = c.new_page()
        g = c.new_page()
        url = f"http://127.0.0.1:{server.server_address[1]}/network-test.html"
        h.goto(url)
        g.goto(url)
        h.wait_for_function("window.testReady")
        g.wait_for_function("window.testReady")
        code = h.evaluate("net.host()")
        h.wait_for_timeout(2500)
        g.evaluate("(code)=>net.join(code)", code)
        try:
            g.wait_for_function("net.connected", timeout=20000)
            h.wait_for_function("net.connected", timeout=5000)
            g.evaluate("net.sendInput({x:1,action:true})")
            h.wait_for_function("inputs.some(i=>i.input.action)", timeout=5000)
            print("3 Internet checks, 0 failures")
        except Exception as e:
            failed = True
            print("FAIL: Internet WebRTC: " + str(e).splitlines()[0])
            print("3 Internet checks, 1 failure")
        b.close()
finally:
    server.shutdown()
raise SystemExit(failed)
