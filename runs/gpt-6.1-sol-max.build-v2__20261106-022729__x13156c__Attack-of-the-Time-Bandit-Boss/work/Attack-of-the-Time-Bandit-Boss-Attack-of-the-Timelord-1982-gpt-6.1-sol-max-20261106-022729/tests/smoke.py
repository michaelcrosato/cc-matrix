import json
from pathlib import Path

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
config = json.loads((root / "build-config.json").read_text())
url = (root.parent / (config["base"] + ".html")).as_uri() + "?test=1"
with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True, args=["--autoplay-policy=no-user-gesture-required"]
    )
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(url)
    page.wait_for_function("document.body.dataset.booted === 'true'")
    print("boot", page.evaluate("TimeBandit.snapshot()"))
    page.screenshot(path=str(root / "artifacts/title.png"))
    page.get_by_role("button", name="Play campaign", exact=True).click()
    page.get_by_role("button", name="Standard campaign", exact=True).click()
    page.wait_for_timeout(300)
    page.evaluate("game.stop(); game.advance(6)")
    print("play", page.evaluate("TimeBandit.snapshot()"))
    page.screenshot(path=str(root / "artifacts/combat.png"))
    print("errors", errors)
    browser.close()
