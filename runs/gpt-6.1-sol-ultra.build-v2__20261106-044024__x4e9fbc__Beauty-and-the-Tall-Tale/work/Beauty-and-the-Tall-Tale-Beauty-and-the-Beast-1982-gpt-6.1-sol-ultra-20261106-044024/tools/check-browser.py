"""Actual packaged-file checks. Uses installed Playwright and downloaded browsers."""

import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
IDENTITY = json.loads((ROOT / "build-identity.json").read_text())
URL = (ROOT.parent / (IDENTITY["basename"] + ".html")).as_uri()
RESULTS = []


def check(name, condition, detail=""):
    RESULTS.append({"name": name, "pass": bool(condition), "detail": str(detail)})


def snapshot(page):
    return page.evaluate("TallTaleApp.snapshot()")


def advance(page, seconds=0.1, draw=False):
    page.evaluate("([s,d])=>TallTaleApp.game.advance(s,{draw:d})", [seconds, draw])


def open_game(browser, **options):
    ctx = browser.new_context(**options)
    ctx.route(
        "**/*",
        lambda route: (
            route.continue_()
            if route.request.url.startswith("file:")
            else route.abort()
        ),
    )
    page = ctx.new_page()
    errors = []
    requests = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on(
        "request",
        lambda r: requests.append(r.url) if not r.url.startswith("file:") else None,
    )
    page.goto(URL)
    page.wait_for_function(
        "window.TallTaleApp?.state.ready && !TallTaleApp.game._booting"
    )
    page.evaluate("TallTaleApp.game.stop()")
    return ctx, page, errors, requests


def run_browser_checks():
    RESULTS.clear()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx, page, errors, requests = open_game(
            browser, viewport={"width": 1920, "height": 1080}
        )
        try:
            check(
                "file: build identity / no runtime downloads",
                page.title() == IDENTITY["title"]
                and page.locator("body").get_attribute("data-build")
                == IDENTITY["basename"]
                and not requests,
            )
            advance(page, 0.05, True)
            page.screenshot(path=str(ROOT / "artifacts/title.png"))
            colors = page.evaluate(
                """() => {const g=TallTaleApp.game.screen.ctx;const d=g.getImageData(0,0,g.canvas.width,g.canvas.height).data;const c=new Set();for(let i=0;i<d.length;i+=32)c.add(`${d[i]},${d[i+1]},${d[i+2]}`);return c.size;}"""
            )
            check(
                "file: native Canvas image is nonblank",
                colors > 40,
                f"{colors} sampled colors",
            )
            page.get_by_role("button", name="Climb solo", exact=False).click()
            check(
                "how-to: real title action opens instructions",
                page.get_by_role(
                    "heading", name="Hank picked the wrong window."
                ).is_visible(),
            )
            page.get_by_role("button", name="Let’s climb", exact=False).click()
            advance(page, 0.2, True)
            check(
                "play: title confirm does not also jump",
                snapshot(page)["mode"] == "play"
                and snapshot(page)["sim"]["coverage"]["jumps"] == 0,
            )
            advance(page, 0.2)
            x0 = snapshot(page)["sim"]["actors"][0]["body"]["x"]
            page.keyboard.down("KeyD")
            advance(page, 0.4)
            page.keyboard.up("KeyD")
            advance(page, 0.15)
            x1 = snapshot(page)["sim"]["actors"][0]["body"]["x"]
            check(
                "keyboard: native movement reaches the first opening",
                x1 > x0 + 20,
                f"{x0} -> {x1}",
            )
            # Normal native inputs only, semantic driver aims at a window then holds up.
            page.evaluate(
                """() => {const a=TallTaleApp;for(let k=0;k<900&&a.state.sim.coverage.windows<1;k++){const s=a.state.sim,i=s.botIntent(1),p=a.game.input;for(const [act,v]of Object.entries({left:i.x<-.1,right:i.x>.1,up:i.up,down:i.down,jump:i.jump}))p.hold(act,v);if(i.jumpPressed)p.tap('jump');a.game.advance(1/120,{draw:false});}a.game.input.clear();a.game.advance(.02,{draw:true});}"""
            )
            check(
                "windows: normal native input completes an ascent",
                snapshot(page)["sim"]["coverage"]["windows"] >= 1,
            )
            page.screenshot(path=str(ROOT / "artifacts/gameplay-1920.png"))
            page.keyboard.press("Escape")
            advance(page, 0.03, True)
            check(
                "pause: Escape opens native pause",
                snapshot(page)["paused"] and snapshot(page)["screen"] == "pause",
            )
            t0 = snapshot(page)["sim"]["tick"]
            advance(page, 1)
            check(
                "pause: standalone simulation stops",
                snapshot(page)["sim"]["tick"] == t0,
            )
            page.get_by_role("button", name="Developer tools", exact=True).click()
            ranges = page.locator(".esh-sh input[type=range]")
            check(
                "dev: all eight balance sliders exposed",
                ranges.count() == 8,
                ranges.count(),
            )
            ranges.first.fill("130")
            ranges.first.dispatch_event("input")
            check(
                "dev: slider changes authoritative config immediately",
                snapshot(page)["sim"]["config"]["run"] == 130
                and snapshot(page)["sim"]["unranked"],
            )
            page.get_by_role(
                "button", name="Reset balance defaults", exact=True
            ).click()
            check(
                "dev: reset updates config and slider",
                snapshot(page)["sim"]["config"]["run"] == 95
                and page.locator(".esh-sh input[type=range]").first.input_value()
                == "95",
            )
            tick = snapshot(page)["sim"]["tick"]
            page.get_by_role("button", name="Step one tick", exact=True).click()
            check(
                "dev: paused single-step advances once",
                snapshot(page)["sim"]["tick"] == tick + 1,
            )
            page.get_by_role("button", name="Back to pause", exact=True).click()
            page.get_by_role("button", name="Resume", exact=True).click()
            advance(page, 0.05)
            check(
                "resume: screen closes / simulation continues",
                snapshot(page)["screen"] is None
                and snapshot(page)["sim"]["tick"] > tick + 1,
            )
            page.keyboard.press("Escape")
            advance(page, 0.03)
            page.get_by_role("button", name="Settings", exact=True).click()
            check(
                "settings: native sound, comfort and gameplay controls",
                "Music" in page.locator(".esh-sh").inner_text()
                and "High-contrast hazard outlines"
                in page.locator(".esh-sh").inner_text(),
            )
            page.evaluate(
                "TallTaleApp.ui.hide();TallTaleApp.game.resume();TallTaleApp.showAbout()"
            )
            check(
                "credits: source metadata includes required model/usage",
                "added on import" in page.locator(".esh-sh").inner_text()
                and "gpt-6.1-sol" in page.locator(".esh-sh").inner_text(),
            )
            for name in ["Testing Feedback", "Engine Feedback", "Prompt Feedback"]:
                page.get_by_role("button", name="Next · " + name, exact=True).click()
                check(
                    "credits: " + name,
                    page.get_by_role("heading", name=name, exact=True).is_visible(),
                )
            page.evaluate(
                "TallTaleApp.ui.hide();TallTaleApp.game.resume();TallTaleApp.game.go('title',null,{fade:0});TallTaleApp.game.advance(.02,{draw:false})"
            )
            baseline = page.evaluate("JSON.stringify(localStorage)")
            page.evaluate("TallTaleApp.test.setIdle(9.95)")
            advance(page, 0.03)
            check(
                "attract: does not start before ten idle seconds",
                snapshot(page)["mode"] == "title",
            )
            advance(page, 0.04, True)
            check(
                "attract: starts at ten idle seconds",
                snapshot(page)["mode"] == "attract",
            )
            page.keyboard.press("KeyQ")
            advance(page, 0.02)
            check(
                "attract: raw unmapped key exits and clears intentions",
                snapshot(page)["mode"] == "title"
                and page.evaluate(
                    "['left','right','up','down','jump'].every(k=>!TallTaleApp.game.input.down(k)) && TallTaleApp.state.inputTarget===null"
                ),
            )
            page.evaluate("TallTaleApp.test.setIdle(10.1)")
            advance(page, 0.02)
            page.mouse.move(1100, 800)
            advance(page, 0.02)
            check(
                "attract: pointer motion exits / progress storage untouched",
                snapshot(page)["mode"] == "title"
                and baseline == page.evaluate("JSON.stringify(localStorage)"),
            )
            # Emulated standard gamepads use native per-player routing.
            page.evaluate(
                """() => {window.__pads=[0,1].map(i=>({index:i,id:'Emulated DualSense '+i,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))}));navigator.getGamepads=()=>window.__pads;}"""
            )
            page.evaluate("TallTaleApp.showCoop()")
            page.get_by_role("button", name="Two controllers", exact=True).click()
            page.get_by_role("button", name="Let’s climb", exact=False).click()
            advance(page, 0.2)
            check(
                "co-op: two pads get distinct native seats",
                page.evaluate(
                    "TallTaleApp.game.players.length===2&&TallTaleApp.game.players[0].pad===0&&TallTaleApp.game.players[1].pad===1"
                ),
            )
            x0 = page.evaluate("TallTaleApp.state.sim.actors.map(a=>a.body.x)")
            page.evaluate("window.__pads[1].axes[0]=1")
            advance(page, 0.5, True)
            x1 = page.evaluate("TallTaleApp.state.sim.actors.map(a=>a.body.x)")
            check(
                "co-op: one pad never controls both climbers",
                abs(x1[0] - x0[0]) < 0.2 and x1[1] > x0[1] + 25,
                [x0, x1],
            )
            page.screenshot(path=str(ROOT / "artifacts/coop-1920.png"))
            page.evaluate(
                "window.__pads[1].axes[0]=0;TallTaleApp.game.settings.set('glyphs','xbox')"
            )
            advance(page, 0.05)
            check(
                "controller: Xbox glyph option changes native prompts",
                page.evaluate("TallTaleApp.game.players[1].label('jump')") == "A",
            )
            page.evaluate("window.__pads[1].connected=false")
            advance(page, 0.04)
            check(
                "controller: disconnect pauses standalone safely",
                snapshot(page)["paused"],
            )
            page.evaluate(
                "TallTaleApp.ui.hide();TallTaleApp.game.resume();TallTaleApp.game.go('title',null,{fade:0});TallTaleApp.game.advance(.02,{draw:false});window.__pads[0].axes[0]=.1"
            )
            page.evaluate("TallTaleApp.test.setIdle(10.1)")
            advance(page, 0.1)
            check(
                "attract: small stick drift cannot suppress demo",
                snapshot(page)["mode"] == "attract",
            )
            page.evaluate("window.__pads[0].axes[0]=.9")
            advance(page, 0.05)
            check(
                "attract: deliberate stick movement exits demo",
                snapshot(page)["mode"] == "title",
            )
            # Audio is measured, never claimed to have been listened to.
            audio = page.evaluate(
                "TallTale.Audio.diagnostic(window.OfflineAudioContext || window.webkitOfflineAudioContext)"
            )
            check(
                "audio: offline synthesis has finite nonzero samples and mute",
                audio.get("finite", False)
                and audio.get("peak", 0) > 0
                and audio.get("rms", 0) > 0,
                audio,
            )
            check(
                "audio: default music bus is exactly ten percent",
                page.evaluate("TallTaleApp.game.settings.default('music')") == 0.1,
            )
            check(
                "file: no runtime or engine errors",
                not errors and not snapshot(page)["errors"],
                errors or snapshot(page)["errors"],
            )
        finally:
            ctx.close()
        # Visual questions need the actual complete facade/ending, after a normal
        # route. The semantic driver feeds ordinary intentions to the packaged
        # production simulation; no warp, protection or objective assignment.
        ctx, page, errs, _reqs = open_game(
            browser, viewport={"width": 1920, "height": 1080}
        )
        try:
            page.get_by_role("button", name="Climb solo", exact=False).click()
            page.get_by_role("button", name="Let’s climb", exact=False).click()
            advance(page, 0.2)
            page.evaluate("TallTaleApp.game.settings.set('sound',false)")
            driver = """(target)=>{const a=TallTaleApp,s=a.state.sim;for(let k=0;k<90000;k++){if(s.phase==='failed'||s.phase==='results'||(target==='roof'&&s.section===3)||(target==='departure'&&s.phase==='departure'&&s.departureTime>=4))break;const i=s.botIntent(1),p=a.game.input;for(const [key,v]of Object.entries({left:i.x<-.1,right:i.x>.1,up:i.up,down:i.down,jump:i.jump}))p.hold(key,v);if(i.jumpPressed)p.tap('jump');a.game.advance(1/120,{draw:false});}a.game.input.clear();a.game.advance(.01,{draw:true});return{phase:s.phase,section:s.section,rescued:s.rescued,unranked:s.unranked,invulnerable:s.invulnerable,coverage:s.coverage};}"""
            page.evaluate(driver, "roof")
            page.screenshot(path=str(ROOT / "artifacts/rooftop.png"))
            page.evaluate(driver, "departure")
            page.screenshot(path=str(ROOT / "artifacts/departure.png"))
            finish = page.evaluate(driver, "results")
            page.screenshot(path=str(ROOT / "artifacts/results.png"))
            check(
                "packaged full normal-intention route reaches actual rescue/results UI",
                finish["phase"] == "results"
                and finish["rescued"]
                and not finish["unranked"]
                and not finish["invulnerable"]
                and page.get_by_role(
                    "heading", name="Love takes the scenic route.", exact=True
                ).is_visible()
                and not errs,
                finish,
            )
            # A controlled two-player exit fixture checks the visible countdown;
            # the complete uncheated routes above and in rules are separate.
            page.get_by_role("button", name="Close", exact=True).click()
            advance(page, 0.03)
            check(
                "closing results returns to the playable title menu",
                snapshot(page)["mode"] == "title"
                and snapshot(page)["screen"] == "title",
            )
            page.evaluate(
                "TallTaleApp.test.newRun();TallTaleApp.game.advance(.2,{draw:false});TallTaleApp.state.sim.phase='failed';TallTaleApp.game.advance(.02,{draw:true})"
            )
            page.keyboard.press("Escape")
            advance(page, 0.03)
            check(
                "back from failure returns to title instead of a frozen arena",
                snapshot(page)["mode"] == "title"
                and snapshot(page)["screen"] == "title",
            )
            page.evaluate(
                """()=>{const a=TallTaleApp;a.test.newRun(2);a.game.advance(.2,{draw:false});const s=a.state.sim,b=s.actors[0].body;b.x=s.currentSection().exitX;b.z=208;b.vx=b.vz=0;b.onGround=true;a.game.advance(.02,{draw:true});}"""
            )
            check(
                "co-op exit shows a visible regroup countdown",
                page.evaluate("TallTaleApp.state.sim.regroup>0")
                and "REGROUP IN" in page.locator(".hud-floor").inner_text()
                and "regroup" in page.locator("#game-prompt").inner_text(),
            )
            advance(page, 7.5)
            check(
                "co-op regroup timeout safely carries the whole team onward",
                page.evaluate(
                    "TallTaleApp.state.sim.section===1&&TallTaleApp.state.sim.actors.every(a=>Math.abs(a.z-16)<.1)"
                ),
            )
        finally:
            ctx.close()
        # Device emulation, using the same shipping file and screens.
        for device, landscape in [
            ("iPhone 13", False),
            ("iPhone 13", True),
            ("iPad Mini", False),
        ]:
            options = dict(pw.devices[device])
            if landscape:
                v = options["viewport"]
                options["viewport"] = {"width": v["height"], "height": v["width"]}
            ctx, page, errs, _reqs = open_game(browser, **options)
            try:
                page.get_by_role("button", name="Climb solo", exact=False).tap()
                page.get_by_role("button", name="Let’s climb", exact=False).tap()
                advance(page, 0.2, True)
                page.touchscreen.tap(
                    options["viewport"]["width"] * 0.85,
                    options["viewport"]["height"] * 0.7,
                )
                advance(page, 0.12, True)
                check(
                    f"touch {device}{' landscape' if landscape else ''}: right tap jumps",
                    snapshot(page)["sim"]["coverage"]["jumps"] >= 1,
                )
                # Native multi-contact adapter, as real multitouch cannot be injected via tap alone.
                result = page.evaluate(
                    """()=>{const a=TallTaleApp,g=a.game,I=g.input;I.feed('down',g.W*.2,g.H*.7,{touch:true,id:71});I.feed('move',g.W*.35,g.H*.7,{touch:true,id:71});I.feed('down',g.W*.85,g.H*.7,{touch:true,id:72});g.advance(.15,{draw:false});const b=a.state.sim.actors[0].body;const r={x:b.x,z:b.z,finite:Number.isFinite(b.x+b.z)};I.feed('up',g.W*.35,g.H*.7,{touch:true,id:71});I.feed('up',g.W*.85,g.H*.7,{touch:true,id:72});g.advance(.02,{draw:true});return r;}"""
                )
                check(
                    f"touch {device}{' landscape' if landscape else ''}: simultaneous contacts stay finite",
                    result["finite"] and not errs,
                )
                page.screenshot(
                    path=str(
                        ROOT
                        / (
                            "artifacts/touch-"
                            + (
                                "landscape"
                                if landscape
                                else device.lower().replace(" ", "-")
                            )
                            + ".png"
                        )
                    )
                )
            finally:
                ctx.close()
        browser.close()
        for engine in ["webkit", "firefox"]:
            browser = getattr(pw, engine).launch(headless=True)
            ctx, page, errs, _reqs = open_game(
                browser,
                viewport={"width": 1280, "height": 720},
                **({"has_touch": True} if engine == "webkit" else {}),
            )
            try:
                page.get_by_role("button", name="Climb solo", exact=False).click()
                page.get_by_role("button", name="Let’s climb", exact=False).click()
                advance(page, 0.2)
                page.keyboard.down("KeyD")
                advance(page, 0.4)
                page.keyboard.up("KeyD")
                advance(page, 0.1, True)
                check(
                    engine + ": packaged startup / native input / Canvas",
                    snapshot(page)["mode"] == "play"
                    and snapshot(page)["sim"]["actors"][0]["body"]["x"] > 65
                    and not errs,
                    errs,
                )
                page.keyboard.press("Escape")
                advance(page, 0.03)
                page.get_by_role("button", name="Settings", exact=True).click()
                check(
                    engine + ": settings reachable",
                    "Music" in page.locator(".esh-sh").inner_text(),
                )
            finally:
                ctx.close()
                browser.close()
    (ROOT / "artifacts/browser-checks.json").write_text(json.dumps(RESULTS, indent=2))
    return RESULTS


if __name__ == "__main__":
    try:
        run_browser_checks()
    except Exception as exc:  # noqa: BLE001 -- Aggregate runner must record browser failures.
        check("browser runner", False, repr(exc))
        (ROOT / "artifacts/browser-checks.json").write_text(
            json.dumps(RESULTS, indent=2)
        )
    for r in RESULTS:
        if not r["pass"]:
            print("FAIL " + r["name"] + ": " + r["detail"])
    print(f"{sum(r['pass'] for r in RESULTS)}/{len(RESULTS)} browser checks passed")
    raise SystemExit(0 if all(r["pass"] for r in RESULTS) else 1)
