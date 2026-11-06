from pathlib import Path

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.firefox.launch(headless=True)
    page = b.new_page()
    errs = []
    logs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("console", lambda e: logs.append(e.text))
    page.goto(Path("build/index.html").resolve().as_uri() + "?test=1&backend=webgl")
    page.wait_for_timeout(8000)
    print(
        {
            "errors": errs,
            "console": logs[-8:],
            "body": page.locator("body").inner_text()[:1000],
            "globals": page.evaluate(
                "({E:typeof My3D2dge,hub:typeof AIHub,test:typeof __gameTest,gpu:!!navigator.gpu,webgl:!!document.createElement('canvas').getContext('webgl2'),dataset:{...document.body.dataset}})"
            ),
        }
    )
    b.close()
