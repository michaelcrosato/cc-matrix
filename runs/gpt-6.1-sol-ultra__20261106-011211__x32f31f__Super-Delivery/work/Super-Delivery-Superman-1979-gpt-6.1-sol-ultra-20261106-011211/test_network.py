"""Network integration checks. Imported by the game's single test command."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import threading


def network_checks(browser, base_url):
    """Return (check name, passed, detail) tuples without printing."""
    results = []
    pages = [browser.new_page(), browser.new_page()]
    try:
        for page in pages:
            page.goto(base_url + "/network-test.html")
            page.evaluate("""async () => {
              const {NetworkLink} = await import('./network.js');
              window.received = [];
              window.link = new NetworkLink({ onMessage: (type,payload,from) => received.push({type,payload,from}) });
            }""")
        invalid = pages[1].evaluate("""async () => {
          try { await link.join('not-a-real-code'); return false; }
          catch(e) { return /complete Super Delivery/.test(e.message); }
        }""")
        results.append(("WebRTC rejects invalid codes", invalid, ""))
        offer = pages[0].evaluate("() => link.host()")
        answer = pages[1].evaluate("code => link.join(code)", offer)
        pages[0].evaluate("code => link.accept(code)", answer)
        for page in pages:
            page.wait_for_function("link.connected", timeout=15000)
        results.append(("WebRTC two-page offer/reply connection", True, ""))
        pages[0].evaluate("() => link.send('state',{rescued:2,x:12.5})")
        pages[1].evaluate("() => link.send('input',{x:1,action:true})")
        pages[0].wait_for_function("received.length > 0")
        pages[1].wait_for_function("received.length > 0")
        results.append(("WebRTC transports authoritative state and guest input", pages[0].evaluate("received[0].type==='input' && received[0].payload.action && received[0].from===1") and pages[1].evaluate("received[0].type==='state' && received[0].payload.rescued===2 && received[0].from===0"), ""))
        pages[0].evaluate("() => link.close()")
        pages[1].wait_for_function("!link.connected")
        results.append(("WebRTC disconnection releases the peer", pages[0].evaluate("link.role === 'solo' && link.pc === null && !link.connected"), ""))
    except Exception as exc:
        results.append(("WebRTC two-page integration", False, str(exc)))
    finally:
        for page in pages:
            page.close()
    return results


if __name__ == "__main__":
    from playwright.sync_api import sync_playwright

    class QuietHandler(SimpleHTTPRequestHandler):
        def log_message(self, *_):
            pass

    root = Path(__file__).resolve().parent
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(root)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            checks = network_checks(browser, f"http://127.0.0.1:{server.server_port}")
            browser.close()
        for name, passed, detail in checks:
            if not passed:
                print(f"FAIL {name}: {detail}")
        print(f"{sum(ok for _, ok, _ in checks)}/{len(checks)} network checks passed")
        raise SystemExit(0 if all(ok for _, ok, _ in checks) else 1)
    finally:
        server.shutdown()
        server.server_close()
