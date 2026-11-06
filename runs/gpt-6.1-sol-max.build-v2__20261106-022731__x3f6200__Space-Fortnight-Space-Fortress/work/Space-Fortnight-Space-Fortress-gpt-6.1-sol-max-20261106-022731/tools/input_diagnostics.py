from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PAD = "window.testPads=[{id:'DualSense',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}];navigator.getGamepads=()=>testPads"
with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={"width": 1920, "height": 1080})
    c.add_init_script(PAD)
    pg = c.new_page()
    pg.goto((ROOT / "game.html").as_uri())
    pg.wait_for_function("window.__fortnight")
    pg.wait_for_timeout(0)

    print(
        "titlebox",
        pg.locator(".esh-ttl .esh-btns").bounding_box(),
        pg.evaluate('getComputedStyle(document.querySelector(".esh-ttl")).cssText'),
    )

    def press(i, pad=0):
        pg.evaluate("([b,p])=>testPads[p].buttons[b]={pressed:true,value:1}", [i, pad])
        pg.wait_for_timeout(110)
        pg.evaluate("([b,p])=>testPads[p].buttons[b]={pressed:false,value:0}", [i, pad])
        pg.wait_for_timeout(50)

    press(13)
    press(0)
    print(
        "join",
        pg.evaluate(
            "({mode:__fortnight.mode,join:__game._join,paused:__game.paused,screen:__fortnight.ui.shell.screen,pad:__game.input.padIndex,players:__game.players.map(p=>({player:p.player,pad:p.pad}))})"
        ),
    )
    pg.evaluate(
        "for(let i=1;i<4;i++)testPads.push({id:'wing'+i,index:i,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))})"
    )
    for i in [1, 2, 3]:
        press(9, i)
        print(
            "seat",
            i,
            pg.evaluate(
                "({mode:__fortnight.mode,join:__game._join,paused:__game.paused,screen:__fortnight.ui.shell.screen,players:__game.players.map(p=>({player:p.player,pad:p.pad})),err:__game.errors})"
            ),
        )
    c.close()
    c = b.new_context(**p.devices["iPhone 13"])
    pg = c.new_page()
    pg.goto((ROOT / "game.html").as_uri())
    pg.wait_for_function("window.__fortnight")
    pg.locator(".esh-ttl button").first.tap()
    pg.wait_for_function("__fortnight.world")
    pg.evaluate("__game.debug.advance(4,{draw:false})")
    pg.wait_for_timeout(200)
    print(
        "phoneBefore",
        pg.evaluate(
            "({rect:__game.screen.canvas.getBoundingClientRect().toJSON(),screen:__fortnight.ui.shell.screen,paused:__game.paused,phase:__fortnight.world.s.phase,touch:__game.input.touchEnabled,W:__game.W,H:__game.H,top:document.elementFromPoint(80,470).outerHTML.slice(0,300)})"
        ),
    )
    d = c.new_cdp_session(pg)
    d.send(
        "Input.dispatchTouchEvent",
        {
            "type": "touchStart",
            "touchPoints": [
                {"id": 1, "x": 80, "y": 470},
                {"id": 2, "x": 310, "y": 410},
            ],
        },
    )
    pg.wait_for_timeout(50)
    print(
        "phoneStart",
        pg.evaluate(
            "({contacts:[...__fortnight.input.touch],p:__fortnight.world.s.players[0],screen:__fortnight.ui.shell.screen,paused:__game.paused})"
        ),
    )
    d.send(
        "Input.dispatchTouchEvent",
        {
            "type": "touchMove",
            "touchPoints": [
                {"id": 1, "x": 120, "y": 470},
                {"id": 2, "x": 310, "y": 390},
            ],
        },
    )
    pg.wait_for_timeout(150)
    print(
        "phoneMove",
        pg.evaluate(
            "({contacts:[...__fortnight.input.touch],screen:__fortnight.ui.shell.screen,errors:__game.errors})"
        ),
    )
    pg.screenshot(path=str(ROOT / "evidence/touch-diagnostic.png"))
    c.close()
    b.close()
