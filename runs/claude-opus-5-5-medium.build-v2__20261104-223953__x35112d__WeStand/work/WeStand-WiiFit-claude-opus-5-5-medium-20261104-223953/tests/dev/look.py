import json, pathlib, sys
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
PAGE = (ROOT.parent / f"{ROOT.name}.html").resolve().as_uri()
ARGS = ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-vulkan=swiftshader", "--use-angle=swiftshader"]
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    page = b.new_context(viewport={"width":int(sys.argv[1]),"height":int(sys.argv[2])}).new_page()
    errs=[]; page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto(PAGE)
    for _ in range(600):
        if page.evaluate("!!window.__gameStatus"): break
        page.wait_for_timeout(200)
    page.wait_for_timeout(6000)
    print(page.title(), errs, json.loads(page.evaluate("window.__gameStatus"))["screen"])
    page.screenshot(path=str(ROOT/"notes/final-1080p.png"), timeout=240000)
    # About, with the real data in the page
    for _ in range(3):
        page.keyboard.press("ArrowUp"); page.wait_for_timeout(3000)
    page.keyboard.press("Enter")
    for _ in range(40):
        if json.loads(page.evaluate("window.__gameStatus"))["screen"]=="about": break
        page.wait_for_timeout(500)
    print(json.loads(page.evaluate("window.__gameStatus"))["screen"])
    for _ in range(3):
        page.keyboard.press("e"); page.wait_for_timeout(3000)
    page.wait_for_timeout(3000)
    page.screenshot(path=str(ROOT/"notes/final-about.png"), timeout=240000)
    b.close()
