import json
from pathlib import Path

from playwright.sync_api import sync_playwright

base = Path(__file__).resolve().parents[1]
build = json.loads((base / "artifacts/build.json").read_text())
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    page.goto((base.parent / build["file"]).as_uri())
    page.wait_for_function("window.__game")
    page.get_by_role("button", name="Start climbing", exact=True).click()
    page.evaluate(
        """() => {const g=__game.game;g.stop();g.advance(1);g.input.hold('right');g.advance(.35);g.input.hold('right',false);g.advance(.1,{draw:true});g.input.hold('up');g.advance(1/120,{draw:true});}"""
    )

    def crop(x, z, w, h):
        return page.evaluate(
            """([x,z,w,h])=>{const g=__game.game,[a,b]=g.r.w(x,0,z),s=g.screen.S/g.screen.dpr;return {x:a*s-w/2,y:b*s-h+15,width:w,height:h};}""",
            [x, z, w, h],
        )

    for i in range(8):
        if i:
            page.evaluate("__game.game.advance(.1,{draw:true})")
        page.screenshot(
            path=str(base / f"artifacts/window-frame-{i}.png"),
            clip=crop(104, 16, 190, 260),
        )
    page.evaluate(
        "__game.debug.reset();__game.game.stop();__game.game.advance(4.1,{draw:true})"
    )
    for i in range(9):
        if i:
            page.evaluate("__game.game.advance(.15,{draw:true})")
        page.screenshot(
            path=str(base / f"artifacts/throw-frame-{i}.png"),
            clip=crop(332, 211, 200, 240),
        )
    page.evaluate("__game.debug.reset();__game.game.stop()")
    state = page.evaluate(
        """() => {const g=__game.game,w=__game.debug.world();for(let i=0;i<30000;i++){const a=FF.bot(w,w.actors[0]);for(const[k,v]of Object.entries({left:a.x<-.1,right:a.x>.1,up:a.up,down:a.down,jump:a.jump}))g.input.hold(k,!!v);if(a.jumpPressed)g.input.tap('jump');g.advance(1/120,{draw:i%200===0});if(w.section===3&&w.floor(w.actors[0])>=2){g.advance(0,{draw:true});break;}}return __game.debug.snapshot();}"""
    )
    page.screenshot(path=str(base / "artifacts/rooftop.png"))
    (base / "artifacts/motion-state.json").write_text(json.dumps(state, indent=2))
    assert not page.evaluate("__game.game.errors")
    browser.close()
