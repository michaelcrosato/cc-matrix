import base64
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

D = Path(__file__).parent
port = json.loads((D / "server.json").read_text())["port"]
(D / "browser-tmp").mkdir(exist_ok=True)
fd = os.open(D / "browser-tmp", os.O_RDONLY)
short = f"/proc/{os.getpid()}/fd/{fd}"
with sync_playwright() as p:
    b = p.chromium.launch(
        headless=False,
        env={**os.environ, "TMPDIR": short},
        args=[
            "--enable-unsafe-webgpu",
            "--enable-features=Vulkan",
            "--use-webgpu-adapter=swiftshader",
            "--no-sandbox",
            "--use-angle=swiftshader",
        ],
    )
    page = b.new_page(
        viewport={"width": 1600, "height": 1000}, ignore_https_errors=True
    )
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on(
        "console",
        lambda m: print(m.type, m.text) if m.type in ["error", "warning"] else None,
    )

    def route(r):
        u = r.request.url
        files = {
            "three.webgpu.js": "three.webgpu.js",
            "three.core.js": "three.core.js",
            "three.tsl.js": "three.tsl.js",
            "rapier.mjs": "rapier.js",
        }
        n = u.split("/")[-1]
        if n in files:
            r.fulfill(
                path=str(D / "vendor" / files[n]),
                content_type="text/javascript",
                headers={"Access-Control-Allow-Origin": "*"},
            )
        else:
            r.continue_()

    page.route("https://cdn.jsdelivr.net/**", route)
    page.goto(
        f"http://127.0.0.1:{port}/Com-Ricochet-Combat-gpt-6.1-sol-ultra-20261105-212555.html?test=1"
    )
    try:
        page.wait_for_function("window.__game?.state().ready", timeout=90000)
    except Exception as e:  # noqa: BLE001 - report capture failures
        print("BOOT FAIL", e)
    print("ERRORS", errors)
    print(
        page.evaluate(
            'window.__game?.state()||document.getElementById("bootError").textContent'
        )
    )
    page.evaluate(
        "window.__game.test.freeze();window.__game.test.title();window.__game.test.view()"
    )
    print(page.evaluate("window.__game.test.renderCheck()"))
    data = page.evaluate("window.__game.test.capture()")
    (D / "readback.png").write_bytes(base64.b64decode(data.split(",")[1]))
    page.evaluate('document.getElementById("view").style.opacity=0')
    page.evaluate(
        'data=>{const img=document.createElement("img");img.id="capture";img.src=data;img.style.cssText="position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none";document.body.insertBefore(img,document.body.firstChild)}',
        data,
    )
    page.screenshot(path=str(D / "title.png"))
    page.evaluate('document.getElementById("capture").remove()')
    page.evaluate("window.__game.test.start();window.__game.test.view()")
    print(page.evaluate("window.__game.test.renderCheck()"))
    data = page.evaluate("window.__game.test.capture()")
    (D / "readback.png").write_bytes(base64.b64decode(data.split(",")[1]))
    page.evaluate('document.getElementById("view").style.opacity=0')
    page.evaluate(
        'data=>{const img=document.createElement("img");img.src=data;img.style.cssText="position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none";document.body.insertBefore(img,document.body.firstChild)}',
        data,
    )
    page.screenshot(path=str(D / "gameplay.png"))
    b.close()
