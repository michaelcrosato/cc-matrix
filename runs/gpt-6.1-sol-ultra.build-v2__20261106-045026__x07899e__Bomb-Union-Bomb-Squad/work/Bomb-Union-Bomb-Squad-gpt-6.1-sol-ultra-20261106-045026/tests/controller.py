"""Complete an ordinary training disposal using a standard-mapped pad stub."""

import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
P = json.loads((ROOT / "project.json").read_text())
URL = (ROOT.parent / (P["slug"] + ".html")).as_uri()
checks = []


def check(name, ok, detail=""):
    checks.append({"name": name, "pass": bool(ok), "detail": detail})


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1920, "height": 1080})
    ctx.add_init_script(
        "window.__connected=true;window.__pad={id:'Emulated DualSense',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0})),timestamp:0};navigator.getGamepads=()=>window.__connected?[window.__pad]:[];"
    )
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    def pad(i, ms=90):
        page.evaluate(
            "(i)=>{__pad.buttons[i]={pressed:true,touched:true,value:1};__pad.timestamp=performance.now()}",
            i,
        )
        page.wait_for_timeout(ms)
        page.evaluate(
            "(i)=>{__pad.buttons[i]={pressed:false,touched:false,value:0};__pad.timestamp=performance.now()}",
            i,
        )
        page.wait_for_timeout(100)

    def focus():
        return page.evaluate("BU.app.focusTarget")

    def point(tid):
        # Traverse actual focus transitions; the test never writes focus or puzzle state.
        targets = page.evaluate("__game.debug.targets()")
        loc = {t["id"]: (t["x"], t["y"]) for t in targets}
        seen = {}
        for _ in range(30):
            current = focus()
            if current == tid:
                return
            tx, ty = loc[tid]
            cx, cy = loc[current]
            choices = [
                (abs(tx - cx), 15 if tx > cx else 14),
                (abs(ty - cy), 13 if ty > cy else 12),
            ]
            choices.sort(reverse=True)
            chosen = next(
                (button for _, button in choices if (current, button) not in seen), None
            )
            if chosen is None:
                chosen = [12, 13, 14, 15][_ % 4]
            seen[current, chosen] = True
            pad(chosen)
        raise RuntimeError(
            "Controller could not reach " + tid + " from " + str(focus())
        )

    try:
        page.goto(URL)
        page.wait_for_function('BU.app.ui.screen==="title"')
        pad(0)
        pad(0)
        pad(0)
        pad(0)
        page.wait_for_function('BU.app.screen==="work"')
        check(
            "pad alone reaches live training workspace",
            page.evaluate("BU.app.state.caseId") == "training",
        )
        check(
            "last input uses PlayStation Cross glyph",
            page.evaluate('__game.input.label("apply")') == "✕",
        )
        point("C1:0")
        pad(0)
        point("C1:1")
        pad(0)
        check(
            "pad cuts both distinct leads",
            page.evaluate("BU.app.state.boards[0].components[0].cuts.every(Boolean)"),
        )
        pad(5)
        point("C1:body")
        pad(0)
        point("spare:S1")
        pad(0)
        point("C1:body")
        pad(0)
        check(
            "pad shoulders and pliers remove/pick/place",
            page.evaluate("BU.app.state.boards[0].components[0].part") == "S1",
        )
        pad(3)
        check(
            "pad repeats persistent work order",
            "SOLDER" in page.evaluate("BU.app.caption"),
        )
        pad(5)
        point("C1:0")
        pad(0, 690)
        check(
            "pad controlled solder hold finishes joint",
            page.evaluate("BU.app.state.boards[0].components[0].joints[0]"),
        )
        page.evaluate("__connected=false")
        page.wait_for_timeout(150)
        check(
            "controller disconnect safely pauses solo", page.evaluate("__game.paused")
        )
        page.evaluate("__connected=true")
        page.wait_for_timeout(150)
        pad(0)
        page.wait_for_function("!__game.paused")
        check(
            "controller reconnect resumes through native menu",
            page.evaluate("!BU.app.ui.screen"),
        )
        point("C1:1")
        pad(0, 690)
        page.wait_for_function("BU.app.state.boards[0].complete")
        check(
            "pad repair publishes all training evidence",
            page.evaluate("BU.app.state.evidence[0].every(v=>v!==-1)"),
        )
        # The exact visible stencil alphabet determines the code, never the hidden code.
        digit = page.evaluate(
            "BU.GLYPHS.findIndex(g=>g.every((v,i)=>v===BU.app.state.evidence[0][i]))"
        )
        pad(0)
        page.wait_for_function('BU.app.ui.screen==="code"')
        for _ in range(digit):
            pad(15)
        check(
            "pad code dial shows inferred digit",
            page.evaluate("BU.app.codeDraft[0]") == digit,
        )
        pad(13)
        pad(0)
        page.wait_for_function('BU.app.ui.screen==="confirm-code"')
        check(
            "pad final confirmation defaults to checking",
            page.evaluate("document.activeElement.textContent") == "Keep checking",
        )
        pad(13)
        pad(0)
        page.wait_for_function('BU.app.screen==="results"')
        check(
            "pad-only ordinary disposal wins unmodified",
            page.evaluate('BU.app.state.status==="won"&&!BU.app.state.modified'),
        )
        check(
            "pad input path has no runtime errors",
            not errors and not page.evaluate("__game.errors"),
            str(errors),
        )
    except Exception as e:  # noqa: BLE001 - acceptance driver preserves failure evidence
        check("controller playthrough", False, str(e))
        page.screenshot(path=str(ROOT / "evidence/controller-failure.png"))
    browser.close()
(ROOT / "evidence/controller.json").write_text(json.dumps({"checks": checks}, indent=2))
print(json.dumps({"checks": checks}))
raise SystemExit(0 if all(c["pass"] for c in checks) else 1)
