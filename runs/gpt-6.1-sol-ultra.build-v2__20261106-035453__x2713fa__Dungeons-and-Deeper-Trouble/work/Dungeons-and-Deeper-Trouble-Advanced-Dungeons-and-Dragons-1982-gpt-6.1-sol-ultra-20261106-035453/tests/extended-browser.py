import json
from pathlib import Path

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
config = json.loads((root / "build-config.json").read_text())
url = (root.parent / config["filename"]).as_uri()
passed = []
failures = []


def check(name, value):
    (passed if value else failures).append(name)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1920, "height": 1080})
    page = context.new_page()
    try:
        page.goto(url)
        page.wait_for_function("document.body.dataset.ready==='true'")
        page.evaluate(
            "__DT.game.stop();__DT.start('couch');__DT.app.sim.enterCave('chalk');__DT.app.ui.shell.hide();__DT.game.advance(.1)"
        )
        page.keyboard.press("Escape")
        page.evaluate("__DT.game.advance(.1)")
        result = page.evaluate(
            "(()=>{const t=__DT.state.tick;__DT.game.advance(.5);return __DT.game.paused&&!__DT.game.live&&__DT.state.tick===t})()"
        )
        check(
            "couch menu is a clearly shared pause",
            result and "shared couch pause" in page.locator(".esh-mod").inner_text(),
        )
        page.evaluate(
            "__DT.app.ui.devSliders('Clock');__DT.game.settings.set('dev_timeScale',.5)"
        )
        check(
            "developer speed has one clock multiplier",
            page.evaluate(
                "__DT.game.timeScale===1&&__DT.app.sim.tunables.timeScale===.5"
            ),
        )
        page.evaluate("__DT.game.settings.set('dev_timeScale',0);__DT.app.ui.dev()")
        before = page.evaluate("__DT.state.tick")
        page.get_by_role("button", name="Single fixed step", exact=True).click()
        check(
            "single step works while simulation speed is zero",
            page.evaluate("__DT.state.tick") == before + 1
            and page.evaluate("__DT.app.sim.tunables.timeScale===0"),
        )
        page.evaluate("__DT.app.start('solo');__DT.app.ui.devSliders('Movement')")
        check(
            "new developer page displays actual current defaults",
            page.evaluate(
                "__DT.game.settings.dev_moveSpeed===__DT.app.sim.tunables.moveSpeed"
            ),
        )
        page.evaluate(
            "__DT.app.toTitle();__DT.game.advance(.05);__DT.app.beginAttract();__DT.game.advance(21)"
        )
        check(
            "attract includes a tool-opened wilderness beat",
            page.evaluate(
                "__DT.app.attract&&__DT.state.phase==='map'&&__DT.state.tools.axe&&__DT.state.node==='forest'"
            ),
        )
        page.evaluate("__DT.game.advance(12)")
        check(
            "attract demonstrates a physical successful bank shot",
            page.evaluate("__DT.state.cave==='root'&&__DT.state.flags.bankLesson"),
        )
        page.mouse.click(100, 100)
        page.evaluate("__DT.game.advance(.05)")
        check(
            "pointer dismisses attract without entering game",
            page.evaluate("__DT.app.frontend&&!__DT.app.attract"),
        )
        page.evaluate("__DT.app.ui.about(0)")
        page.screenshot(path=str(root / "reports/about.png"))
        for index in range(6):
            page.evaluate("(i)=>__DT.app.ui.about(i)", index)
            check(
                f"credits page {index + 1} has readable content",
                page.evaluate(
                    "!!document.querySelector('.esh-mod h2')&&document.querySelector('.esh-mod').innerText.length>120"
                ),
            )
        page.evaluate("__DT.app.toTitle();__DT.game.advance(.05)")
        page.screenshot(path=str(root / "reports/title-final.png"))
        check(
            "no extended UI runtime errors",
            page.evaluate("__DT.game.errors.length===0"),
        )
    finally:
        context.close()
    phone = browser.new_context(**p.devices["iPhone 13"])
    page = phone.new_page()
    try:
        page.goto(url)
        page.wait_for_function("document.body.dataset.ready==='true'")
        page.evaluate(
            "__DT.game.stop();__DT.start('solo');__DT.app.sim.enterCave('root');__DT.app.ui.shell.hide();const p=__DT.state.players[0];Object.assign(p,{x:392,y:392,invuln:99});__DT.app.sim.updateVisibility();__DT.game.advance(.1)"
        )
        page.touchscreen.tap(330, 470)
        page.evaluate("__DT.game.advance(1.5,{draw:true})")
        check(
            "touch bank assistance physically opens the mandatory bridge",
            page.evaluate(
                "__DT.state.flags.bankLesson===true&&__DT.state.stats.banks>=1"
            ),
        )
        page.evaluate(
            "__DT.game.settings.set('dodgeAssist',true);const p=__DT.state.players[0],e=__DT.state.enemies.find(e=>e.kind==='snake');Object.assign(e,{x:p.x+20,y:p.y,state:'attack',timer:.1,attackDir:Math.PI});__DT.app.sim.updateVisibility();__DT.game.input.lastDevice='touch';const cmd=__DT.app.inputs.sample(__DT.game.input,p.id);window.__dodgeCommand=cmd;"
        )
        check(
            "touch dodge assist emits a perpendicular quickstep",
            page.evaluate(
                "__dodgeCommand.actions.some(a=>a.type==='dash')&&Math.abs(__dodgeCommand.my)>.9"
            ),
        )
        check(
            "touch remains free of permanent action clusters",
            page.evaluate("document.querySelectorAll('.esh-hb button').length<=1"),
        )
    finally:
        phone.close()
    denied = browser.new_context(viewport={"width": 1280, "height": 720})
    denied.add_init_script(
        "Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage denied','SecurityError')}})"
    )
    page = denied.new_page()
    try:
        page.goto(url)
        page.wait_for_function("document.body.dataset.ready==='true'")
        page.evaluate("__DT.game.stop();__DT.start('solo');__DT.game.advance(.1)")
        check(
            "denied storage gives a visible non-blocking memory-only notice",
            page.evaluate(
                "!__DT.app.store.available&&__DT.app.store.memory!==null&&!document.querySelector('.esh-tut').hidden&&document.querySelector('.esh-tut').textContent.includes('Progress lasts for this visit')&&__DT.state.phase==='map'"
            ),
        )
    finally:
        denied.close()
        browser.close()
(root / "reports/extended-browser.json").write_text(
    json.dumps(
        {"passed": len(passed), "checks": passed, "failures": failures}, indent=2
    )
)
for name in failures:
    print(name)
print(f"{len(passed)} extended input/UI checks passed; {len(failures)} failed")
raise SystemExit(bool(failures))
