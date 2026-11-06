import json, pathlib, sys, time
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
PAGE = (ROOT.parent / f"{ROOT.name}.html").resolve().as_uri()
ARGS = ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-vulkan=swiftshader", "--use-angle=swiftshader"]
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    ctx = b.new_context(viewport={"width": 320, "height": 180})
    page = ctx.new_page()
    page.goto(PAGE+"?scene="+(sys.argv[1] if len(sys.argv)>1 else "fit"))
    for _ in range(300):
        if page.evaluate("!!window.__gameStatus"): break
        page.wait_for_timeout(200)
    page.evaluate("window.__f=0;(function l(){window.__f++;requestAnimationFrame(l)})()")
    st = lambda: json.loads(page.evaluate("window.__gameStatus"))
    a = st()["tick"]; f0=page.evaluate("window.__f"); t=time.time(); page.wait_for_timeout(5000); 
    print("tps", (st()["tick"]-a)/(time.time()-t), "fps", (page.evaluate("window.__f")-f0)/(time.time()-t))
    b.close()
