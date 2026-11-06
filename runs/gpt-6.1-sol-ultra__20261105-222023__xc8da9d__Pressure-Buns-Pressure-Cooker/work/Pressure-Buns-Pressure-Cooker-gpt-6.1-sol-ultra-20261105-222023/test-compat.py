# ruff: noqa: BLE001
# Test boundaries collect browser exceptions as failures.
from pathlib import Path

from playwright.sync_api import sync_playwright

folder = Path(__file__).resolve().parent
failed = False
with sync_playwright() as p:
    b = p.webkit.launch(headless=True)
    c = b.new_context(
        viewport={"width": 390, "height": 844},
        is_mobile=True,
        has_touch=True,
        device_scale_factor=1,
    )
    page = c.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    try:
        page.goto(
            (folder.parent / (folder.name + ".html")).as_uri(),
            wait_until="domcontentloaded",
        )
        page.wait_for_function("window.__game?.ready", timeout=30000)
        page.locator("#play").tap()
        page.wait_for_function('__game.game.state.mode==="play"')
        assert page.evaluate('__game.scene.stats.backend==="WebGL fallback"')
        assert not errors, errors
        print("3 WebKit checks, 0 failures")
    except Exception as e:
        failed = True
        print("FAIL: WebKit mobile fallback: " + str(e).splitlines()[0])
        print("3 WebKit checks, 1 failure")
    b.close()
raise SystemExit(failed)
