"""Emulated iPhone touchscreen repair flow and isolated contextual hold probe."""

import json
import pathlib

from playwright.sync_api import sync_playwright

BASE = pathlib.Path(__file__).resolve().parent.parent
PROJECT = json.loads((BASE / "project.json").read_text())
URL = (BASE.parent / (PROJECT["slug"] + ".html")).as_uri()


def run():
    checks = []
    errors = []
    samples = []

    def check(name, passed, detail=""):
        checks.append({"name": name, "pass": bool(passed), "detail": detail})

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for mode in ["direct", "context"]:
            context = browser.new_context(**p.devices["iPhone 13"])
            page = context.new_page()
            page.on("pageerror", lambda e: errors.append(str(e)))
            try:
                page.goto(URL)
                page.wait_for_function(
                    'BU.app.screen==="title" && document.querySelector("#bu-loading").hidden'
                )
                page.get_by_role("button", name="Start your shift", exact=True).tap()
                page.get_by_role(
                    "button", name="TRAINING · First day, last wire", exact=True
                ).tap()
                page.get_by_role("button", name="Open the device", exact=True).tap()
                page.locator('[data-board="B1"]').tap()
                page.wait_for_function('BU.app.screen==="work"')
                page.wait_for_timeout(850)
                check(
                    mode + " portrait instructions reflow below the board",
                    page.evaluate(
                        "document.querySelector('.bu-side').getBoundingClientRect().width > innerWidth*.85"
                    ),
                )
                if mode == "context":
                    # A blank real tap selects the touch input family. Selecting
                    # an isolated presentation target below never mutates repair
                    # state; this probe specifically tests the contextual widget.
                    page.touchscreen.tap(6, 400)
                for index in range(15):
                    if page.evaluate("BU.app.state.boards[0].complete"):
                        break
                    action = page.evaluate('BU.Sim.nextAction(BU.app.state,"B1")')
                    target = (
                        "spare:" + action["spare"]
                        if action["type"] == "pick"
                        else action["component"]
                        + ":"
                        + str(action.get("terminal", "body"))
                    )
                    before = page.evaluate("BU.app.state.boards[0].revision")
                    if mode == "direct":
                        point = page.evaluate(
                            """id=>{const a=BU.app,t=a.game.debug.targets().find(t=>t.id===id),r=document.querySelector('#screen').getBoundingClientRect();return {x:r.left+t.x/a.game.W*r.width,y:r.top+t.y/a.game.H*r.height,hit:document.elementFromPoint(r.left+t.x/a.game.W*r.width,r.top+t.y/a.game.H*r.height)?.className};}""",
                            target,
                        )
                        samples.append(
                            {"mode": mode, "action": action, "target": target, **point}
                        )
                        page.touchscreen.tap(point["x"], point["y"])
                    else:
                        page.evaluate("(id)=>BU.app.focusTarget=id", target)
                        page.wait_for_timeout(150)
                        page.locator(".bu-touch-action").tap()
                    if action["type"] == "begin":
                        page.wait_for_function(
                            "([cid,k])=>BU.app.state.boards[0].components.find(c=>c.id===cid).joints[k]",
                            arg=[action["component"], action["terminal"]],
                            timeout=4000,
                        )
                        check(mode + " touch assisted solder joint", True)
                    else:
                        page.wait_for_function(
                            "(rev)=>BU.app.state.boards[0].revision>rev",
                            arg=before,
                            timeout=3500,
                        )
                    page.wait_for_timeout(140)
                page.wait_for_function(
                    'BU.app.state.boards[0].complete && BU.app.screen==="evidence"'
                )
                check(mode + " touchscreen complete training repair", True)
                digit = page.evaluate("BU.Sim.candidates(BU.app.state.evidence[0])[0]")
                page.get_by_role("button", name="Enter disarm code", exact=True).tap()
                for _ in range(digit):
                    page.locator('[data-digit="0"]').tap()
                page.get_by_role("button", name="Review this code", exact=True).tap()
                page.get_by_role(
                    "button", name=f"CONFIRM · SUBMIT {digit}", exact=True
                ).tap()
                page.wait_for_function(
                    'BU.app.state.status==="won" && BU.app.screen==="results"'
                )
                check(mode + " touch code confirmation and result", True)
            except Exception as error:  # noqa: BLE001 - preserve failed acceptance evidence
                check(mode + " touchscreen flow", False, str(error))
                page.screenshot(
                    path=str(BASE / "evidence" / f"touch-{mode}-failure.png")
                )
                (BASE / "evidence" / f"touch-{mode}-state.json").write_text(
                    json.dumps(
                        page.evaluate(
                            "({screen:BU.app.screen,focus:BU.app.focusTarget,tool:BU.app.tool,input:BU.app.game.input.lastDevice,state:BU.app.state,body:document.body.innerText})"
                        ),
                        indent=2,
                    )
                )
            context.close()
        context = browser.new_context(**p.devices["iPhone 13"])
        page = context.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        try:
            page.goto(URL)
            page.wait_for_function(
                'BU.app.screen==="title" && document.querySelector("#bu-loading").hidden'
            )
            page.get_by_role("button", name="Case files & replay", exact=True).tap()
            page.get_by_role(
                "button", name="CASE 02 · A little power struggle", exact=True
            ).tap()
            page.get_by_role("button", name="Open the device", exact=True).tap()
            page.locator('[data-board="B3"]').tap()
            page.wait_for_function(
                'BU.app.screen==="work" && BU.app.state.boards[2].fire'
            )
            page.wait_for_timeout(800)

            def tap_target(target):
                point = page.evaluate(
                    """id=>{const a=BU.app,t=a.game.debug.targets().find(t=>t.id===id),r=document.querySelector('#screen').getBoundingClientRect();if(!t)throw new Error('missing touch target '+id);return {x:r.left+t.x/a.game.W*r.width,y:r.top+t.y/a.game.H*r.height};}""",
                    target,
                )
                page.touchscreen.tap(point["x"], point["y"])

            tap_target("fire")
            page.wait_for_function("!BU.app.state.boards[2].fire", timeout=7000)
            check("direct touch assisted foam extinguishes authored fire", True)
            spare = page.evaluate(
                "BU.app.state.boards[2].spares.find(p=>p.available).id"
            )
            tap_target("spare:" + spare)
            page.wait_for_function("BU.app.state.boards[2].held!==null")
            before = page.evaluate("BU.app.state.remaining")
            tap_target("test")
            page.wait_for_function("BU.app.state.boards[2].ruleKnown")
            check(
                "touch test socket diagnoses reusable stock",
                page.evaluate("BU.app.state.remaining") <= before - 2
                and page.evaluate("BU.app.state.boards[2].held!==null"),
            )
            page.screenshot(path=str(BASE / "evidence" / "touch-relay-diagnosis.png"))
        except Exception as error:  # noqa: BLE001 - retain exact failed flow
            check("touch hazard and diagnosis flow", False, str(error))
            page.screenshot(path=str(BASE / "evidence" / "touch-hazard-failure.png"))
        context.close()
        check("touchscreen flows have no runtime errors", not errors, "; ".join(errors))
        browser.close()
    (BASE / "evidence" / "touch-play.json").write_text(
        json.dumps(
            {
                "checks": checks,
                "samples": samples,
                "errors": errors,
                "boundary": "Chromium emulated iPhone 13; no physical touch hardware or iOS Safari claim.",
            },
            indent=2,
        )
    )
    for c in checks:
        if not c["pass"]:
            print("FAIL", c["name"], c["detail"])
    print(
        json.dumps(
            {"checks": checks, "failures": [c["name"] for c in checks if not c["pass"]]}
        )
    )
    return int(any(not c["pass"] for c in checks))


if __name__ == "__main__":
    raise SystemExit(run())
