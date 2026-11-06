import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class Quiet(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), Quiet)
threading.Thread(target=server.serve_forever, daemon=True).start()
errors = []
backend = os.environ.get("VIEW_BACKEND", "webgl")
try:
    with sync_playwright() as p:
        flags = ["--enable-unsafe-swiftshader"]
        if backend == "webgpu":
            flags += [
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
            ]
        browser = p.chromium.launch(headless=True, args=flags)
        page = browser.new_page(viewport={"width": 1600, "height": 900})
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on(
            "console", lambda m: errors.append(m.text) if m.type == "error" else None
        )
        response = page.goto(
            f"http://127.0.0.1:{server.server_port}/tests/view-proof.html?backend={backend}"
        )
        assert response.status == 200
        page.wait_for_function("window.proof?.ready", timeout=90000)
        page.wait_for_timeout(4000)
        page.screenshot(path=str(ROOT / "tests/view-title.png"))
        page.evaluate("proof.setStation('pilot')")
        page.wait_for_timeout(500)
        page.screenshot(path=str(ROOT / "tests/view-pilot.png"))
        page.evaluate(
            "proof.setStation('bombs'); Object.assign(proof.sim.state.aircraft,{x:325000,y:18000,z:14400,yaw:0,bank:0});proof.sim.updatePrediction()"
        )
        page.wait_for_timeout(500)
        page.screenshot(path=str(ROOT / "tests/view-bombs.png"))
        page.evaluate("proof.split()")
        page.wait_for_timeout(700)
        page.screenshot(path=str(ROOT / "tests/view-split.png"))
        data = page.evaluate(
            "({errors:proof.game.errors,frames:proof.view.world.stats.frames,split:proof.game.viewports.length,cameras:proof.view.world.cameras.length,backend:My3D2dge.World3D.backend})"
        )
        errors += data["errors"]
        assert data["frames"] > 2
        assert data["split"] == 2
        assert data["cameras"] == 2
        assert data["backend"] == ("WebGPU" if backend == "webgpu" else "WebGL 2")
        browser.close()
    (ROOT / f"tests/view-proof-{backend}-result.json").write_text(
        json.dumps({"errors": errors, "data": data}, indent=2)
    )
    if errors:
        print(json.dumps({"errors": errors, "data": data}))
    assert not errors, (
        f"{len(errors)} renderer errors; see tests/view-proof-{backend}-result.json"
    )
    print(f"Native {data['backend']}: 4 view assertions passed")
finally:
    server.shutdown()
    server.server_close()
