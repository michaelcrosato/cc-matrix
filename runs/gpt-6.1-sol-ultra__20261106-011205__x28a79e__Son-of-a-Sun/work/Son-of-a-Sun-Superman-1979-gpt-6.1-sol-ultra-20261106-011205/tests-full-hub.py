"""Run official Hub conformance against the complete assembled game."""
import functools
import http.server
import json
import pathlib
import sys
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
reports = []
try:
    with sync_playwright() as p:
        for query in (sys.argv[1:] or [
            "players=2",
            "players=4&latency=150&jitter=50&loss=5",
            "players=4&latency=150&jitter=50&loss=5&scenario=host-leave",
            "players=2&scenario=server",
        ]):
            browser = p.chromium.launch(headless=True, args=[
                "--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-webgpu-adapter=swiftshader",
            ])
            page = browser.new_page(viewport={"width": 1280, "height": 720})
            page.goto(base + "/harness.html?game=game.html&auto=1&play=3000&" + query)
            page.wait_for_function("document.body.dataset.complete === 'true'", timeout=180000)
            report = page.evaluate("window.__hubCheck")
            checks += len(report["checks"])
            reports.append({"query": query, "report": report})
            for check in report["checks"]:
                if not check["pass"]:
                    failures.append(f"{query}: {check['name']}: {check['detail']}")
            frame_details = []
            for frame in page.frames[1:]:
                try:
                    frame_details.append(frame.evaluate("({url:location.href,bootError:window.__bootError||null,state:window.__sun?.state||null,loading:document.querySelector('#loading-detail')?.textContent})"))
                except Exception as error:
                    frame_details.append({"frameError": str(error)})
            reports[-1]["frames"] = frame_details
            (root / "full-hub-results.json").write_text(json.dumps(reports, indent=2))
            browser.close()
except Exception as error:
    failures.append(str(error))
finally:
    server.shutdown()
    server.server_close()
for failure in failures:
    print("FAIL:", failure)
print(f"{checks} full-game Hub checks, {len(failures)} failures")
raise SystemExit(bool(failures))
