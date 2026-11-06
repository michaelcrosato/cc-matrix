"""Extra packaged controls proof: actual DOM mouse and CDP touch contacts."""

import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ID = json.loads((ROOT / "build-identity.json").read_text())
URL = (ROOT.parent / (ID["basename"] + ".html")).as_uri()
RESULTS = []


def check(name, condition, detail=""):
    RESULTS.append({"name": name, "pass": bool(condition), "detail": str(detail)})


def step(page, n=0.1):
    page.evaluate("(n)=>TallTaleApp.game.advance(n,{draw:true})", n)


def open_page(browser, device=None, init=None):
    ctx = browser.new_context(
        **(device or {"viewport": {"width": 1280, "height": 720}})
    )
    ctx.route(
        "**/*",
        lambda r: r.continue_() if r.request.url.startswith("file:") else r.abort(),
    )
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    if init:
        page.add_init_script(init)
    page.goto(URL)
    page.wait_for_function("window.TallTaleApp?.state.ready")
    page.evaluate("TallTaleApp.game.stop()")
    return ctx, page, errors


def start(page, touch=False):
    action = "tap" if touch else "click"
    getattr(page.get_by_role("button", name="Climb solo", exact=False), action)()
    getattr(page.get_by_role("button", name="Let’s climb", exact=False), action)()
    step(page, 0.6)


def window_point(page):
    return page.evaluate(
        """()=>{const g=TallTaleApp.game,s=g.screen,w=TallTaleApp.state.sim.windows[0],p=g.r.w(w.x,0,w.z+22),r=s.canvas.getBoundingClientRect();return{x:r.left+(p[0]*s.S+s.OX)/s.dpr,y:r.top+(p[1]*s.S+s.OY)/s.dpr};}"""
    )


def run_controls_checks():
    RESULTS.clear()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx, page, errors = open_page(browser, p.devices["iPhone 13"])
        try:
            step(page, 0.02)
            page.screenshot(path=str(ROOT / "artifacts/phone-title-review.png"))
            check(
                "phone title: primary actions fit the viewport",
                page.evaluate(
                    """()=>[...document.querySelectorAll('.esh-sh button')].filter(e=>e.textContent.includes('Climb')).every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})"""
                ),
            )
            start(page, True)
            session = ctx.new_cdp_session(page)

            def touch(kind, contacts):
                session.send(
                    "Input.dispatchTouchEvent",
                    {
                        "type": kind,
                        "touchPoints": [
                            {
                                "id": i,
                                "x": x,
                                "y": y,
                                "radiusX": 6,
                                "radiusY": 6,
                                "force": 1,
                            }
                            for i, x, y in contacts
                        ],
                    },
                )

            touch("touchStart", [(0, 70, 560)])
            touch("touchMove", [(0, 110, 560)])
            step(page, 0.48)
            touch("touchEnd", [])
            step(page, 0.06)
            check(
                "real touch stick: reaches the first usable window",
                page.evaluate(
                    'Math.abs(TallTaleApp.state.sim.actors[0].x-88)<10&&TallTaleApp.game.input.lastDevice==="touch"'
                ),
            )
            check(
                "real touch stick: contextual climb affordance appears",
                page.locator("#touch-climb").is_visible(),
            )
            if page.locator("#touch-climb").is_visible():
                b = page.locator("#touch-climb").bounding_box()
                touch(
                    "touchStart",
                    [(2, b["x"] + b["width"] / 2, b["y"] + b["height"] / 2)],
                )
                step(page, 0.8)
                touch("touchEnd", [])
                step(page, 0.02)
            check(
                "real held contextual action: completes normal window ascent",
                page.evaluate(
                    "TallTaleApp.state.sim.coverage.windows===1&&Math.abs(TallTaleApp.state.sim.actors[0].z-64)<.1"
                ),
            )
            page.screenshot(path=str(ROOT / "artifacts/phone-climb-review.png"))
            page.evaluate("TallTaleApp.startRun(1)")
            step(page, 0.4)
            touch("touchStart", [(0, 70, 560)])
            touch("touchMove", [(0, 110, 560)])
            step(page, 0.15)
            before = page.evaluate(
                "({x:TallTaleApp.state.sim.actors[0].x,j:TallTaleApp.state.sim.coverage.jumps})"
            )
            touch("touchStart", [(0, 110, 560), (1, 330, 550)])
            step(page, 0.02)
            # Lift only the jump finger; the left stick remains a real contact.
            touch("touchEnd", [(1, 330, 550)])
            apex = 16
            for _ in range(25):
                step(page, 0.02)
                apex = max(apex, page.evaluate("TallTaleApp.state.sim.actors[0].z"))
            after = page.evaluate(
                "({x:TallTaleApp.state.sim.actors[0].x,j:TallTaleApp.state.sim.coverage.jumps,stick:TallTaleApp.game.input.stickOn})"
            )
            touch("touchEnd", [])
            step(page, 0.03)
            check(
                "real multitouch: brief right tap clears a ground hazard height",
                apex > 25,
                {"apex": apex, "before": before, "after": after},
            )
            check(
                "real multitouch: left movement survives right-finger release",
                after["x"] > before["x"] + 25
                and after["j"] == before["j"] + 1
                and after["stick"],
                after,
            )
            t = page.evaluate("TallTaleApp.visual.time")
            page.evaluate('TallTaleApp.game.settings.set("motion",true)')
            step(page, 0.1)
            check(
                "native Reduce motion actually stops decorative motion",
                page.evaluate("TallTaleApp.game.reduceMotion&&TallTaleApp.visual.time")
                == t,
            )
            page.evaluate('TallTaleApp.game.settings.set("motion",false)')
            step(page, 0.05)
            check(
                "disabling Reduce motion restores decorative motion",
                page.evaluate("TallTaleApp.visual.time") > t,
            )
            page.evaluate(
                'TallTaleApp.game.settings.set("dev_run",130);TallTaleApp.startRun(1)'
            )
            step(page, 0.2)
            check(
                "fresh run: balance sliders match the active configuration",
                page.evaluate(
                    "TallTaleApp.state.sim.config.run===TallTaleApp.game.settings.dev_run&&!TallTaleApp.state.sim.unranked"
                ),
            )
            check(
                "touch scenarios: no native or page errors",
                not errors and not page.evaluate("TallTaleApp.game.errors"),
                errors,
            )
        finally:
            ctx.close()

        ctx, page, errors = open_page(browser)
        try:
            start(page)
            page.keyboard.down("KeyD")
            step(page, 0.25)
            page.keyboard.up("KeyD")
            step(page, 0.08)
            point = window_point(page)
            page.mouse.click(point["x"], point["y"])
            step(page, 1.3)
            check(
                "real mouse context action: approaches and climbs without teleport",
                page.evaluate(
                    "TallTaleApp.state.sim.coverage.windows===1&&Math.abs(TallTaleApp.state.sim.actors[0].z-64)<.1&&!TallTaleApp.state.inputTarget"
                ),
            )
            page.keyboard.press("Escape")
            step(page, 0.03)
            page.get_by_role("button", name="About & credits", exact=True).click()
            panel = page.locator(".esh-mod")
            check(
                "credits initially show metadata from the top",
                panel.evaluate("e=>e.scrollTop") < 1,
            )
            page.keyboard.press("PageDown")
            check(
                "credits: PageDown scrolls long source information",
                panel.evaluate("e=>e.scrollTop") > 10,
            )
            page.keyboard.press("Home")
            page.evaluate(
                "window.__scrollPad={index:0,id:'Scroll pad',connected:true,mapping:'standard',axes:[0,0,0,.85],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};navigator.getGamepads=()=>[window.__scrollPad]"
            )
            step(page, 0.2)
            check(
                "credits: emulated controller right stick scrolls metadata",
                panel.evaluate("e=>e.scrollTop") > 10,
            )
        finally:
            ctx.close()

        pad = """window.__pads=[{index:0,id:'Emulated Pad',connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}];navigator.getGamepads=()=>window.__pads;"""
        ctx, page, errors = open_page(browser, init=pad)
        try:
            page.get_by_role("button", name="Climb together", exact=True).click()
            page.get_by_role("button", name="Keyboard + controller", exact=True).click()
            page.get_by_role("button", name="Let’s climb", exact=False).click()
            step(page, 0.6)
            page.keyboard.down("KeyD")
            step(page, 0.25)
            page.keyboard.up("KeyD")
            step(page, 0.08)
            partner = page.evaluate(
                "({x:TallTaleApp.state.sim.actors[1].x,z:TallTaleApp.state.sim.actors[1].z})"
            )
            point = window_point(page)
            page.mouse.click(point["x"], point["y"])
            step(page, 1.3)
            after = page.evaluate(
                "({x:TallTaleApp.state.sim.actors[1].x,z:TallTaleApp.state.sim.actors[1].z})"
            )
            check(
                "co-op mouse assistance affects only its assigned climber",
                abs(after["x"] - partner["x"]) < 0.01
                and abs(after["z"] - partner["z"]) < 0.01,
                {"before": partner, "after": after},
            )
        finally:
            ctx.close()

        blocked = """Object.defineProperty(Storage.prototype,'getItem',{value(){throw new DOMException('blocked','SecurityError')}});Object.defineProperty(Storage.prototype,'setItem',{value(){throw new DOMException('blocked','SecurityError')}});"""
        ctx, page, errors = open_page(browser, init=blocked)
        try:
            start(page)
            page.evaluate('TallTaleApp.game.settings.set("music",.3)')
            check(
                "blocked storage: normal play and visit-local settings still work",
                page.evaluate(
                    'TallTaleApp.state.mode==="play"&&TallTaleApp.game.audio.musicVolume===.3&&TallTaleApp.game.settings.saved===false'
                )
                and not errors,
                errors,
            )
        finally:
            ctx.close()
        malformed = """localStorage.setItem('my3d2dge:beauty-tall-tale:save:v1',JSON.stringify({checkpoint:{v:1,section:999,score:500000,ledger:{}}}));"""
        ctx, page, errors = open_page(browser, init=malformed)
        try:
            page.get_by_role(
                "button", name="Continue from checkpoint", exact=True
            ).click()
            step(page, 0.4)
            check(
                "malformed persisted checkpoint: safe fresh simulation fallback",
                page.evaluate(
                    'TallTaleApp.state.mode==="play"&&TallTaleApp.state.sim.section===0&&TallTaleApp.state.sim.chances===3&&Number.isFinite(TallTaleApp.state.sim.actors[0].x)'
                )
                and not errors,
                errors,
            )
        finally:
            ctx.close()
        browser.close()
    (ROOT / "artifacts/controls-checks.json").write_text(json.dumps(RESULTS, indent=2))
    return RESULTS


if __name__ == "__main__":
    try:
        run_controls_checks()
    except Exception as exc:  # noqa: BLE001 -- Aggregate verifier records all browser failures.
        check("controls runner", False, repr(exc))
        (ROOT / "artifacts/controls-checks.json").write_text(
            json.dumps(RESULTS, indent=2)
        )
    for r in RESULTS:
        if not r["pass"]:
            print("FAIL " + r["name"] + ": " + r["detail"])
    print(f"{sum(r['pass'] for r in RESULTS)}/{len(RESULTS)} controls checks passed")
    raise SystemExit(0 if all(r["pass"] for r in RESULTS) else 1)
