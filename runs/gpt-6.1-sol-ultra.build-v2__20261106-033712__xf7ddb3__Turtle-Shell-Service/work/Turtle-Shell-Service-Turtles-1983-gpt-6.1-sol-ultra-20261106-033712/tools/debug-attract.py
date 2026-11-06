from pathlib import Path

from playwright.sync_api import sync_playwright

p = Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    b = pw.chromium.launch(headless=True)
    page = b.new_page()
    page.add_init_script(
        "window.__pads=[];Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>__pads});window.makePad=()=>({index:0,id:'DualSense',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))});"
    )
    page.goto((p / "build/game.html").as_uri())
    page.wait_for_selector('body[data-ready="true"]')
    page.evaluate("__game.stop();__game.advance(10.2,{draw:false})")
    print(
        "demo",
        page.evaluate(
            "({demo:__TSS.demo,scene:__game.sceneName,menu:__TSS.ui.shell.screen,phase:__TSS.sim.state.phase,pad:__game.input.pad})"
        ),
    )
    page.evaluate("__pads[0]=makePad();__pads[0].buttons[0]={pressed:true,value:1}")
    for i in range(5):
        page.evaluate("__game.advance(1/120,{draw:false})")
        print(
            i,
            page.evaluate(
                "({demo:__TSS.demo,scene:__game.sceneName,menu:__TSS.ui.shell.screen,phase:__TSS.sim.state.phase,pad:__game.input.pad,padIndex:__game.input.padIndex,prev:__game.input.padPrev,held:[...__game.input.held],pending:__game._next})"
            ),
        )
    b.close()
