import http.server
import pathlib
import sys
import threading

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

root = pathlib.Path(__file__).parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kw):
        super().__init__(*args, directory=str(root), **kw)

    def log_message(self, format: str, *args) -> None:
        pass


server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
errors = []
checks = 0
with sync_playwright() as p:
    b = p.chromium.launch(
        headless=True,
        args=[
            "--enable-unsafe-webgpu",
            "--enable-features=Vulkan",
            "--use-webgpu-adapter=swiftshader",
        ],
    )
    for backend in ["gpu", "gl"]:
        page = b.new_page(viewport={"width": 1600, "height": 1000})
        page.on("pageerror", lambda e: errors.append(str(e)))
        try:
            page.goto(
                f"http://127.0.0.1:{server.server_port}/scene-smoke.html?{backend}"
            )
            page.wait_for_function("window.ready", timeout=60000)
            page.wait_for_timeout(1000)
            info = page.evaluate("s.stats()")
            assert info["nativeAnimationMixers"] == 6, info
            assert info["backend"] == ("WebGPU" if backend == "gpu" else "WebGL2"), info
            checks += 1
            assert page.evaluate(
                "(()=>{s.effect('kick',-4,8,0xffddaa,{points:450});s.effect('armor',0,4);s.effect('flip',4,12);return s.stats().callouts===3})()"
            )
            checks += 1
            if backend == "gl":
                page.screenshot(path=str(root / "scene-smoke.png"))
            assert page.evaluate(
                "(()=>{s.render({players:[],enemies:[],coins:[],phase:4,powCharges:0},1.1);return s.stats().callouts===0})()"
            )
            checks += 1
            assert page.evaluate(
                "(()=>{s.render({players:[],enemies:[],coins:[],phase:4,powCharges:0},.05);return s.stats().enemies===0})()"
            )
            checks += 1
        except (AssertionError, KeyError, PlaywrightError) as e:
            errors.append(f"{backend}: {e}")
        page.close()
    b.close()
server.shutdown()
for e in errors:
    print("FAIL", e)
print(f"{checks}/8 scene checks passed")
sys.exit(bool(errors))
