import json, pathlib, sys, time
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
PAGE = (ROOT.parent / f"{ROOT.name}.html").resolve().as_uri()
ARGS = ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-vulkan=swiftshader", "--use-angle=swiftshader"]
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    ctx = b.new_context(viewport={"width": 320, "height": 180})
    page = ctx.new_page()
    page.on("console", lambda m: print("CONSOLE", m.type, m.text[:200]))
    page.on("pageerror", lambda e: print("ERR", e))
    page.goto(PAGE)
    for _ in range(300):
        if page.evaluate("!!window.__gameStatus"): break
        page.wait_for_timeout(200)
    st = lambda: json.loads(page.evaluate("window.__gameStatus"))
    a = st()["tick"]; t=time.time(); page.wait_for_timeout(2000); print("tps", (st()["tick"]-a)/(time.time()-t))
    print(page.evaluate("window.__gameUi"))
    page.keyboard.down("ArrowDown"); page.wait_for_timeout(300); page.keyboard.up("ArrowDown"); page.wait_for_timeout(200)
    print("focus after held arrow", st()["focus"], st()["screen"])
    r = page.evaluate("window.__gameUi")[1]
    page.mouse.move((r["x0"]+r["x1"])/2-2, (r["y0"]+r["y1"])/2); page.wait_for_timeout(200)
    page.mouse.move((r["x0"]+r["x1"])/2, (r["y0"]+r["y1"])/2); page.wait_for_timeout(300)
    print("focus after hover", st()["focus"], r)
    page.mouse.down(); page.wait_for_timeout(100); page.mouse.up(); page.wait_for_timeout(300)
    print("after click", st()["screen"])
    b.close()
