"""Optional visual artifacts; functional input/attract behavior is checked in test-ui.py."""

import os
from pathlib import Path

from playwright.sync_api import sync_playwright

os.environ["PW_TEST_SCREENSHOT_NO_FONTS_READY"] = "1"
folder = Path(__file__).resolve().parent
with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=[
            "--enable-unsafe-webgpu",
            "--enable-features=Vulkan",
            "--use-webgpu-adapter=swiftshader",
        ],
    )
    page = browser.new_page(
        viewport={"width": 1920, "height": 1080}, device_scale_factor=1
    )
    page.goto(
        (folder.parent / (folder.name + ".html")).as_uri() + "?renderer=webgl",
        wait_until="domcontentloaded",
    )
    page.wait_for_function("window.__game?.ready", timeout=30000)
    page.evaluate("""() => {
        __game.game.state.attract=false;
        __game.game.state.mode='title';
        __game.setScreen('title');
        window.__visualTitleKeepalive=setInterval(()=>__game.setScreen('title'),1000);
    }""")
    page.screenshot(path=str(folder / "title.png"), timeout=60000)
    page.evaluate(
        'clearInterval(window.__visualTitleKeepalive);__game.setScreen("title")'
    )
    page.locator("#play").click(force=True)
    page.wait_for_function('__game.game.state.mode==="play" && __game.screen===null')
    page.wait_for_timeout(1000)
    page.screenshot(path=str(folder / "gameplay.png"), timeout=60000)
    browser.close()
