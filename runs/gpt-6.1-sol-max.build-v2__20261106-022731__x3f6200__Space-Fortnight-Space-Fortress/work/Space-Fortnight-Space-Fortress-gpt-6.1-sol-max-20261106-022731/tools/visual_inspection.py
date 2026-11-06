import json
from pathlib import Path

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent.parent
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto((root / "game.html").as_uri())
    page.wait_for_timeout(1800)
    print(
        json.dumps(
            {
                "title": page.title(),
                "errors": errors,
                "engineErrors": page.evaluate("window.__game?.errors"),
                "screen": page.evaluate("window.__fortnight?.ui.shell.screen"),
                "focus": page.locator(":focus").text_content(),
            }
        )
    )
    page.screenshot(path=str(root / "evidence/title.png"))
    page.locator(".esh-ttl button").first.click()
    page.wait_for_timeout(600)
    print(
        json.dumps(
            {
                "errors": errors,
                "engineErrors": page.evaluate("window.__game?.errors"),
                "state": page.evaluate(
                    "({phase:__fortnight.world?.s.phase,tick:__fortnight.world?.s.tick})"
                ),
            }
        )
    )
    page.evaluate("__game.debug.advance(10,{bot:true})")
    page.screenshot(path=str(root / "evidence/perimeter.png"))
    browser.close()
