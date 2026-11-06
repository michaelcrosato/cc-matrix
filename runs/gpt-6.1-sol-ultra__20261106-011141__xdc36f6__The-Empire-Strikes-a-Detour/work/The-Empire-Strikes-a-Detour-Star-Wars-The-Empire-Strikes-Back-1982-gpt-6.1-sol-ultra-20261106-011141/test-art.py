import http.server
import json
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Quiet)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
results = []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
            ],
        )
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        for fallback in [False, True]:
            page.goto(
                f"http://127.0.0.1:{server.server_port}/art-preview.html"
                + ("?fallback" if fallback else "")
            )
            assert page.title() == "ART PREVIEW - Detour"
            page.wait_for_function("window.preview?.frames > 3", timeout=90000)
            page.screenshot(
                path="art-preview-" + ("webgl" if fallback else "webgpu") + ".png"
            )
            results.append(
                {
                    "fallback": fallback,
                    "state": page.evaluate("window.preview"),
                    "errors": errors[:],
                }
            )
        browser.close()
finally:
    server.shutdown()
    server.server_close()
Path("art-preview-results.json").write_text(json.dumps(results, indent=2))
failures = [str(item) for item in results if item["errors"]]
for failure in failures:
    print(failure)
print(f"{len(results)} art render checks, {len(failures)} failures")
