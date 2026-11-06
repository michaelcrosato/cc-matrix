"""Adapter-only official Hub protocol checks. Not a substitute for game tests."""
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
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{server.server_port}"
failures = []
checks = 0
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        for query in [
            "players=2",
            "players=4&latency=150&jitter=50&loss=5",
            "players=4&latency=150&jitter=50&loss=5&scenario=host-leave",
            "players=2&scenario=server",
        ]:
            page.goto(base + "/harness.html?game=test-adapter.html&auto=1&play=3000&" + query)
            page.wait_for_function("document.body.dataset.complete === 'true'", timeout=55000)
            report = page.evaluate("window.__hubCheck")
            checks += len(report["checks"])
            for check in report["checks"]:
                if not check["pass"]:
                    failures.append(f"{query}: {check['name']}: {check['detail']}")
        browser.close()
except Exception as error:
    failures.append(str(error))
finally:
    server.shutdown()
    server.server_close()
for failure in failures:
    print("FAIL:", failure)
print(f"{checks} Hub adapter checks, {len(failures)} failures")
raise SystemExit(bool(failures))
