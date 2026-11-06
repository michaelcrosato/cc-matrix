import json
from pathlib import Path

from playwright.sync_api import sync_playwright

p = Path(__file__).resolve().parent.parent
with sync_playwright() as pw:
    browser = pw.chromium.launch(
        headless=True, args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
    )
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto((p / "game.html").as_uri() + "?backend=webgl", wait_until="load")
    page.wait_for_function(
        "window.__bomber?.ready || window.__bomber?.error", timeout=120000
    )
    page.wait_for_timeout(800)
    state = page.evaluate(
        "({ready:__bomber.ready,error:__bomber.error,scene:game.sceneName,errors:game.errors})"
    )
    page.screenshot(path=str(p / "tests/title.png"))
    print(json.dumps({"state": state, "errors": errors}, indent=2))
    if state.get("ready"):
        page.get_by_role("button", name="Fly a sortie", exact=True).click()
        page.screenshot(path=str(p / "tests/briefing.png"))
        page.get_by_role("button", name="Launch sortie", exact=True).click()
        page.wait_for_timeout(1500)
        page.screenshot(path=str(p / "tests/cockpit.png"))
        print(
            json.dumps(
                page.evaluate(
                    "({scene:game.sceneName,phase:__bomber.sim.state.phase,errors:game.errors,screen:__bomber.ui.shell.screen})"
                )
            )
        )
    browser.close()
