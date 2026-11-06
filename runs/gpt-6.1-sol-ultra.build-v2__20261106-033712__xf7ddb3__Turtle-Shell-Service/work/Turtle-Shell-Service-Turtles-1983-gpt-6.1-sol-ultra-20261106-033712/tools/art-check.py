from pathlib import Path

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto((root / "build/art-preview.html").as_uri())
    page.wait_for_timeout(800)
    page.screenshot(path=str(root / "build/art-floor.png"))
    page.goto((root / "build/art-preview.html").as_uri() + "#title")
    page.wait_for_timeout(400)
    page.screenshot(path=str(root / "build/art-title.png"))
    print(errors)
    browser.close()
