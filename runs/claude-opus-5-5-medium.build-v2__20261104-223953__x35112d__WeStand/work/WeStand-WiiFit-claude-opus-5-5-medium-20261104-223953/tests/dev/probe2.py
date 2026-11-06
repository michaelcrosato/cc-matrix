import json, pathlib, sys, time
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
PAGE = (ROOT.parent / f"{ROOT.name}.html").resolve().as_uri()
ARGS = ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-vulkan=swiftshader", "--use-angle=swiftshader"]
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    page = b.new_context(viewport={"width": 320, "height": 180}).new_page()
    page.goto(PAGE)
    for _ in range(300):
        if page.evaluate("!!window.__gameStatus"): break
        page.wait_for_timeout(200)
    st = lambda: {k:v for k,v in json.loads(page.evaluate("window.__gameStatus")).items() if k in("screen","focus","mode","attract","tick")}
    page.wait_for_timeout(1500)
    page.mouse.move(150, 90); page.wait_for_timeout(600); page.mouse.move(170, 100); page.wait_for_timeout(2500)
    print(1,st(), page.evaluate("window.__gamePrompts"))
    page.keyboard.press("ArrowUp"); page.wait_for_timeout(2500); print(2,st())
    for i in range(6):
        page.keyboard.press("Enter"); page.wait_for_timeout(2500); print(3,st())
    b.close()
