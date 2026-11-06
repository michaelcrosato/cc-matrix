"""Responsive geometry checks plus optional screenshots for visual judgement."""

import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
GAME = ROOT.parent / (ROOT.name + ".html")
VIEWPORTS = [
    (1920, 1080),
    (1600, 900),
    (1280, 720),
    (1024, 768),
    (844, 390),
    (390, 844),
]
results = []
with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=[
            "--enable-unsafe-webgpu",
            "--enable-features=Vulkan",
            "--use-webgpu-adapter=swiftshader",
        ],
    )
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    page.goto(GAME.as_uri() + "?renderer=webgl")
    page.wait_for_function(
        "window.gameTest?.ready || window.gameBootError", timeout=60000
    )
    page.evaluate("document.fonts.ready")
    for width, height in VIEWPORTS:
        name = f"title controls visible and unobstructed at {width}x{height}"
        try:
            page.set_viewport_size({"width": width, "height": height})
            page.evaluate("gameTest.act('quit')")
            page.wait_for_timeout(100)
            geometry = page.evaluate(
                """()=>{const footer=document.querySelector('.title-bottom').getBoundingClientRect();return [...document.querySelectorAll('#screen [data-action]')].map(b=>{const r=b.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {name:b.dataset.action,x:r.left,y:r.top,right:r.right,bottom:r.bottom,hit:b===hit||b.contains(hit),footer:footer.top}})}"""
            )
            for b in geometry:
                assert (
                    b["x"] >= 0
                    and b["y"] >= 0
                    and b["right"] <= width + 1
                    and b["bottom"] <= height + 1
                ), b
                assert b["bottom"] <= b["footer"] - 3, b
                assert b["hit"], b
            page.locator("[data-action=about]").click()
            assert (
                "Source Information".lower()
                in page.locator("#screen").inner_text().lower()
            )
            page.locator("[data-action=back]").click()
            if "--screenshots" in sys.argv and width in [1920, 390]:
                page.screenshot(path=str(ROOT / f"final-title-{width}.png"))
            results.append({"name": name, "passed": True})
        except Exception as e:  # noqa: BLE001 - record each independent viewport failure.
            results.append({"name": name, "passed": False, "error": str(e)})
            print("FAIL " + name + ": " + str(e))
    if "--screenshots" in sys.argv:
        page.set_viewport_size({"width": 1600, "height": 900})
        page.evaluate(
            "gameTest.start();gameTest.autoplay(true);gameTest.wave(6);gameTest.step(60)"
        )
        page.wait_for_timeout(300)
        page.screenshot(path=str(ROOT / "final-boss-armored.png"))
        page.evaluate("gameTest.step(200)")
        page.wait_for_timeout(300)
        page.screenshot(path=str(ROOT / "final-boss-open.png"))
    browser.close()
report = {
    "passed": sum(r["passed"] for r in results),
    "failed": sum(not r["passed"] for r in results),
    "results": results,
}
(ROOT / "layout-results.json").write_text(json.dumps(report, indent=2))
print(f"{report['passed']} passed, {report['failed']} failed")
raise SystemExit(bool(report["failed"]))
