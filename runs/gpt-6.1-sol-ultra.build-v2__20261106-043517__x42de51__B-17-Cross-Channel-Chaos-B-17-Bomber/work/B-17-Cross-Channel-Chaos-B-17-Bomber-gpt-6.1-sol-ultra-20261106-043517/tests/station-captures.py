import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
IDENTITY = json.loads((ROOT / "identity.json").read_text())
URL = (ROOT.parent / (IDENTITY["slug"] + ".html")).as_uri() + "?backend=webgl"
OUT = ROOT / "tests/browser-evidence"


def advance(page, t=0.35):
    page.evaluate("(t)=>game.advance(t,{draw:true})", t)


def key(page, k):
    page.keyboard.down(k)
    advance(page, 0.06)
    page.keyboard.up(k)
    advance(page, 0.3)


def click(page, name):
    page.locator(".esh-sh").get_by_role("button", name=name, exact=True).click()
    advance(page)


results = {}
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--enable-unsafe-swiftshader"])
    try:
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(URL)
        page.wait_for_function("window.__bomber?.ready", timeout=90000)
        page.wait_for_timeout(300)
        page.evaluate("game.stop()")
        advance(page)
        click(page, "Practice")
        click(page, "Directional gunnery")
        advance(page, 1)
        key(page, "2")
        page.evaluate(
            """()=>{const v=__bomber.view,old=v.foreground.bind(v);v.foreground=(p,c,pl,a,s)=>{window.__fg={cam:{...c},station:pl.station,a:{x:a.x,y:a.y,z:a.z,yaw:a.yaw,pitch:a.pitch,bank:a.bank}};return old(p,c,pl,a,s);};}"""
        )
        for station, k in [
            ("nose", "ArrowUp"),
            ("starboard", "ArrowRight"),
            ("tail", "ArrowDown"),
            ("port", "ArrowLeft"),
        ]:
            key(page, k)
            page.wait_for_timeout(100)
            page.screenshot(path=str(OUT / f"station-{station}.png"))
            results[station] = page.evaluate(
                "({station:__bomber.sim.state.players[0].station,pose:{...__bomber.view.world.camera.pose},foreground:window.__fg,errors:game.errors})"
            )
        context.close()
        tablet = browser.new_context(
            viewport={"width": 820, "height": 1180},
            device_scale_factor=1,
            has_touch=True,
            is_mobile=True,
        )
        page = tablet.new_page()
        page.goto(URL)
        page.wait_for_function("window.__bomber?.ready", timeout=90000)
        page.wait_for_timeout(300)
        page.evaluate("game.stop()")
        advance(page)
        page.get_by_role("button", name="Practice", exact=True).tap()
        advance(page)
        page.get_by_role("button", name="Bomb calibration", exact=True).tap()
        advance(page)
        advance(page, 10)
        page.screenshot(path=str(OUT / "tablet-bombsight.png"))
        results["tablet"] = page.evaluate(
            "({ready:__bomber.ready,station:__bomber.sim.state.players[0].station,touch:__bomber.touch.active,errors:game.errors})"
        )
        assert results["tablet"]["touch"]
        tablet.close()
        results["errors"] = errors
    finally:
        browser.close()
(OUT / "station-captures.json").write_text(json.dumps(results, indent=2))
print(f"Station captures: {len(results) - 1} views, {len(results['errors'])} errors")
