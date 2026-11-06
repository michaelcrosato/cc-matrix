"""Visual evidence only, against the exact release HTML; no production mutations."""

import hashlib
import json
import signal
import sys
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "build-config.json").read_text())
ARTIFACT = ROOT.parent / CONFIG["html"]
FIXTURE = json.loads((ROOT / "build/route-fixture.json").read_text())
PHONE_ONLY = "--phone-only" in sys.argv
UI_ONLY = "--ui-only" in sys.argv or PHONE_ONLY
EVIDENCE = ROOT / "evidence"
REPORT = {
    "artifact": str(ARTIFACT),
    "sha256": hashlib.sha256(ARTIFACT.read_bytes()).hexdigest(),
    "screens": [],
    "errors": [],
    "engineErrors": [],
    "notes": [],
    "inProgress": True,
}


def terminate(_signal, _frame):
    REPORT["errors"].append("Visual evidence run interrupted by SIGTERM.")
    raise SystemExit(143)


signal.signal(signal.SIGTERM, terminate)


def ready(page):
    page.on("pageerror", lambda e: REPORT["errors"].append(str(e)))
    page.goto(ARTIFACT.as_uri() + "?backend=webgl", wait_until="load", timeout=60000)
    page.wait_for_function(
        "window.__gameReady || window.__bootError", timeout=60000, polling=50
    )
    error = page.evaluate("window.__bootError || null")
    if error:
        raise RuntimeError(error)
    page.evaluate("__app.lastActivity = performance.now() + 1000000")


def capture(page, name, delay=1000):
    if UI_ONLY:
        page.evaluate("__app.ui.update()")
    page.wait_for_timeout(delay)
    path = EVIDENCE / ("visual-release-" + name + ".png")
    page.screenshot(path=str(path), timeout=60000)
    data = page.evaluate(
        """()=>{const sh=document.querySelector('.esh-sh'),mod=sh?.querySelector('.esh-mod'),q=e=>{if(!e)return null;const r=e.getBoundingClientRect(),c=getComputedStyle(e);return{x:r.x,y:r.y,width:r.width,height:r.height,opacity:c.opacity,display:c.display,scrollTop:e.scrollTop,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight}};return{screen:__app.ui.shell.screen,stage:__app.stage,view:__app.view.snapshot(),errors:__app.game.errors,geometry:{sh:q(sh),mod:q(mod),focus:document.activeElement?.className,focusType:document.activeElement?.type,focusRect:q(document.activeElement)}}}"""
    )
    REPORT["screens"].append(
        {"name": name, "path": str(path.relative_to(ROOT)), **data}
    )
    REPORT["engineErrors"].extend(data["errors"])
    (EVIDENCE / "visual-release.json").write_text(json.dumps(REPORT, indent=2))
    if (
        data["screen"]
        and data["geometry"]["sh"]
        and float(data["geometry"]["sh"]["opacity"]) < 0.99
    ):
        raise RuntimeError("Modal parent is invisible: " + name)
    print(
        json.dumps(
            {
                "capture": name,
                "screen": data["screen"],
                "view": data["view"],
                "engineErrors": data["errors"],
            }
        ),
        flush=True,
    )


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=[
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
            "--disable-dev-shm-usage",
        ],
    )
    try:
        if not PHONE_ONLY:
            context = browser.new_context(viewport={"width": 1920, "height": 1080})
            page = context.new_page()
            ready(page)
            capture(page, "title-tv")
            page.evaluate("__app.newSolo(false)")
            page.wait_for_function(
                '__app.view.snapshot().floor === "The Lantern Vault"',
                timeout=60000,
                polling=50,
            )
            capture(page, "first-room")
            if UI_ONLY:
                page.evaluate("__app.game.stop()")
            page.evaluate("__app.ui.pack()")
            page.wait_for_function(
                '__app.ui.shell.screen === "pack"', timeout=5000, polling=50
            )
            capture(page, "pack", 400)
            page.evaluate("__app.ui.hide(); __app.game.resume(); __app.ui.map()")
            capture(page, "map", 400)
            page.evaluate("__app.ui.hide(); __app.game.resume(); __app.ui.pause()")
            capture(page, "pause", 400)
            page.get_by_role("button", name="Expedition tools", exact=True).click()
            page.wait_for_function(
                '__app.ui.shell.screen === "dev"', timeout=5000, polling=50
            )
            capture(page, "developer", 400)
            if UI_ONLY:
                page.evaluate("__app.ui.hide(); __app.game.resume(); __app.ui.pause()")
                page.get_by_role("button", name="About / Credits", exact=True).click()
                page.wait_for_function(
                    '__app.ui.shell.screen === "credits"', timeout=5000, polling=50
                )
                capture(page, "credits", 400)
            if not UI_ONLY:
                page.evaluate(
                    "__app.ui.hide(); __app.game.resume(); __app.newSolo(false)"
                )
                run_id = page.evaluate("__app.state.runId")
                actions = json.loads(
                    json.dumps(FIXTURE["actions"]).replace(FIXTURE["run"], run_id)
                )
                replay = page.evaluate(
                    """entries => { __app.game.stop(); let accepted = 0, beforeClaim = false; for (const entry of entries) { const a = entry.action; if (a.type === 'interact' && a.target === 'guardian.treasure') beforeClaim = __app.state.shared.bossDefeated && !__app.state.shared.treasureClaimed && __app.state.phase === 'explore'; const r = __DANGER.send(a); if (!r?.ok) throw Error('Visual route ' + accepted + ': ' + JSON.stringify(a) + ' ' + JSON.stringify(r)); accepted++; } __app.update(0); __app.game.start(); return {accepted, beforeClaim, phase:__app.state.phase, modified:__app.state.modified, stats:__app.state.stats}; }""",
                    actions,
                )
                REPORT["stockVictory"] = replay
                page.wait_for_function(
                    '__app.ui.shell.screen === "victory"', timeout=10000, polling=50
                )
                capture(page, "stock-victory", 1200)
                # Only these two presentation paths changed since the earlier native visual review.
                page.evaluate(
                    "__app.ui.hide(); __app.game.resume(); __app.newSolo(false)"
                )
                for name, enemy in [
                    ("scorpion", "upper.scorpion"),
                    ("wraith", "spirit.wraith"),
                ]:
                    page.evaluate(
                        """enemy => { const a = __app, m = a.net.model; m.state.combat = null; m.state.phase = 'explore'; m.dev({type:'encounter',target:enemy}); const e=m.state.entities[enemy],p=m.state.players['0'],dx=e.x-p.x,dy=e.y-p.y; p.dir=Math.abs(dx)>Math.abs(dy)?dx>0?1:3:dy>0?2:0; a.onState(m.state); a.ui.hide(); a.syncPause(); a.view.resetLook(); }""",
                        enemy,
                    )
                    page.wait_for_function(
                        "(id)=>__app.view.floorKey.includes(__app.state.floor)",
                        arg=enemy,
                        timeout=60000,
                        polling=50,
                    )
                    capture(page, name, 1800)
                REPORT["desktopAudio"] = page.evaluate("__DANGER.audio.offlineProbe()")
            context.close()
        phone_config = {
            **p.devices["iPhone 13"],
            "viewport": {"width": 390, "height": 844},
        }
        phone = browser.new_context(**phone_config)
        page = phone.new_page()
        ready(page)
        page.evaluate("__app.newSolo(false)")
        page.wait_for_function(
            '__app.view.snapshot().floor === "The Lantern Vault"',
            timeout=60000,
            polling=50,
        )
        page.touchscreen.tap(300, 500)
        page.wait_for_function(
            '__app.lastInput === "touch" && document.body.classList.contains("touch-mode")',
            timeout=10000,
            polling=50,
        )
        if UI_ONLY:
            page.evaluate("__app.game.stop();__app.ui.update()")
        capture(page, "phone-hud", 1000)
        page.locator("#menu-button").tap()
        page.wait_for_function(
            '__app.ui.shell.screen === "pause"', timeout=5000, polling=50
        )
        capture(page, "phone-menu", 500)
        if PHONE_ONLY:
            page.get_by_role("button", name="Expedition tools", exact=True).tap()
            page.wait_for_function(
                '__app.ui.shell.screen === "dev"', timeout=5000, polling=50
            )
            capture(page, "phone-developer-focus", 400)
            REPORT["developerFocus"] = page.evaluate(
                """()=>{const e=document.activeElement,r=e.getBoundingClientRect();return{type:e.type,visible:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,rect:{x:r.x,y:r.y,width:r.width,height:r.height},label:e.getAttribute('aria-label')}}"""
            )
            if (
                REPORT["developerFocus"]["type"] != "range"
                or not REPORT["developerFocus"]["visible"]
            ):
                raise RuntimeError(
                    "Initial developer slider focus is outside the viewport."
                )
        phone.close()
    except Exception as exc:
        REPORT["errors"].append(str(exc))
        raise
    finally:
        try:
            browser.close()
        except PlaywrightError as close_error:
            REPORT["notes"].append("Browser already closed: " + str(close_error))
        REPORT["inProgress"] = False
        REPORT["sha256After"] = hashlib.sha256(ARTIFACT.read_bytes()).hexdigest()
        REPORT["artifactUnchanged"] = REPORT["sha256After"] == REPORT["sha256"]
        (EVIDENCE / "visual-release.json").write_text(json.dumps(REPORT, indent=2))
        print(
            json.dumps(
                {
                    "sha256": REPORT["sha256"],
                    "artifactUnchanged": REPORT["artifactUnchanged"],
                    "errors": REPORT["errors"],
                    "engineErrors": REPORT["engineErrors"],
                    "stockVictory": REPORT.get("stockVictory"),
                }
            ),
            flush=True,
        )
