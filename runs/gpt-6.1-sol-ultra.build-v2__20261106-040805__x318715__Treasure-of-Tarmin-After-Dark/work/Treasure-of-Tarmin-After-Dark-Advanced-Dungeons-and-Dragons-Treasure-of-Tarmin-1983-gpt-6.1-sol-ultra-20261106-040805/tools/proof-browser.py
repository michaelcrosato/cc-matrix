import json
from pathlib import Path

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True, args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
    )
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(Path("build/index.html").resolve().as_uri() + "?backend=webgl")
    page.wait_for_function("window.proofReady===true", timeout=60000)
    print(
        json.dumps(
            {
                "ready": page.evaluate("window.proofReady"),
                "backend": page.evaluate("My3D2dge.World3D.backend"),
                "errors": errors,
            }
        )
    )
    page.screenshot(path="evidence/packaging-proof.png")
    browser.close()
