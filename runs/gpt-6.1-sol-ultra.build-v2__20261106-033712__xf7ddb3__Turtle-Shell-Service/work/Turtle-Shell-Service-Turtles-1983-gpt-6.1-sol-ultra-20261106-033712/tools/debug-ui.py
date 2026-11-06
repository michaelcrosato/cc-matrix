import json
from pathlib import Path

from playwright.sync_api import sync_playwright

p = Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True)
    ctx = b.new_context(
        viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True
    )
    page = ctx.new_page()
    page.goto((p / "build/game.html").as_uri())
    page.wait_for_selector('body[data-ready="true"]')
    page.evaluate("__game.stop();__TSS.ui.about()")
    about = []
    for _ in range(15):
        about.append(page.get_by_role("dialog").inner_text())
        button = page.get_by_role("button", name="Next page", exact=True)
        if not button.count():
            break
        button.click()
    print(json.dumps({"about": about}, indent=2))
    page.evaluate(
        '__TSS.ui.shell.hide();__TSS.start("solo");__game.advance(2.6,{draw:false})'
    )
    print(
        page.evaluate(
            """()=>{const I=__game.input;const before=__TSS.sim.state.players[0].x;I.feed('down',250,500,{touch:true,id:1});I.feed('move',190,500,{touch:true,id:1});let a={on:I.stickOn,stick:I.stick,drag:I.drag(),device:I.lastDevice,phase:__TSS.sim.state.phase,map:I.map};__game.advance(.3,{draw:false});return {a,before,after:__TSS.sim.state.players[0],on:I.stickOn,stick:I.stick,hidden:I._stickEl?.style.display,errors:__game.errors}}"""
        )
    )
    ctx.close()
    b.close()
