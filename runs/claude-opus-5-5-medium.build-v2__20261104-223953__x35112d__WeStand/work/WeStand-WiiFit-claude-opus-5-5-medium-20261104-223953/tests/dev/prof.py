import json, pathlib, sys, time
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
PAGE = (ROOT.parent / f"{ROOT.name}.html").resolve().as_uri()
ARGS = ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-vulkan=swiftshader", "--use-angle=swiftshader"]
with sync_playwright() as p:
    b = p.chromium.launch(args=ARGS)
    ctx = b.new_context(viewport={"width": 320, "height": 180})
    page = ctx.new_page()
    page.on("console", lambda m: print(m.text[:160]) if "first frame" in m.text else None)
    page.goto(PAGE+"?scene="+sys.argv[1])
    for _ in range(300):
        if page.evaluate("!!window.__gameStatus"): break
        page.wait_for_timeout(200)
    cdp = ctx.new_cdp_session(page)
    cdp.send("Performance.enable")
    m0 = {x["name"]:x["value"] for x in cdp.send("Performance.getMetrics")["metrics"]}
    st = lambda: json.loads(page.evaluate("window.__gameStatus"))
    a=st()["tick"]; t=time.time(); page.wait_for_timeout(8000); dt=time.time()-t
    m1 = {x["name"]:x["value"] for x in cdp.send("Performance.getMetrics")["metrics"]}
    print("wall",round(dt,1),"ticks",st()["tick"]-a,"task",round(m1["TaskDuration"]-m0["TaskDuration"],2),"script",round(m1["ScriptDuration"]-m0["ScriptDuration"],2))
    b.close()
