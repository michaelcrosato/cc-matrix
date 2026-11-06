import json
import pathlib

from playwright.sync_api import sync_playwright

p = pathlib.Path(__file__).resolve().parents[1]
with sync_playwright() as x:
    b = x.chromium.launch(headless=True)
    page = b.new_page(viewport={"width": 1920, "height": 1080})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto((p / "build/game.html").as_uri())
    page.wait_for_selector('body[data-ready="true"]')
    print(
        json.dumps(
            page.evaluate(
                "({state:__game.debug.snapshot(), settings:{music:__game.settings.music,glyphs:__game.settings.glyphs}, title:document.title})"
            ),
            default=str,
        )[:1500]
    )
    page.screenshot(path=str(p / "build/title.png"))
    page.get_by_role("button", name="Check in · Solo", exact=True).click()
    page.wait_for_timeout(300)
    print(
        json.dumps(
            {
                "errors": errors,
                "runtime": page.evaluate("__game.errors"),
                "phase": page.evaluate("__TSS.sim.state.phase"),
            }
        )
    )
    page.screenshot(path=str(p / "build/intro.png"))
    page.keyboard.press("Enter")
    page.wait_for_timeout(300)
    page.screenshot(path=str(p / "build/play.png"))
    print(
        json.dumps(
            {
                "errors": errors,
                "runtime": page.evaluate("__game.errors"),
                "phase": page.evaluate("__TSS.sim.state.phase"),
                "practice": page.evaluate("__TSS.sim.state.practice"),
            }
        )
    )
    b.close()
