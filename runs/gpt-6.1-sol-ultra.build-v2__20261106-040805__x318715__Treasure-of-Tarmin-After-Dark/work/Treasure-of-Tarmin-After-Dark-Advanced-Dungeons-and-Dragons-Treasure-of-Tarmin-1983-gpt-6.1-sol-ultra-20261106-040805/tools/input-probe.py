from pathlib import Path

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    b = p.chromium.launch(
        headless=True, args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
    )
    page = b.new_page(viewport={"width": 1280, "height": 720})
    page.goto(Path("build/index.html").resolve().as_uri() + "?test=1&backend=webgl")
    page.wait_for_function("document.body.dataset.ready==='true'", timeout=60000)
    page.locator("[data-ui=new]").click()
    page.wait_for_timeout(1000)

    def read():
        return page.evaluate(
            "({screen:__gameTest.screen,scene:game.sceneName,paused:game.paused,reason:game.pauseReason,shell:game.shell.screen,keys:[...game.input.held],map:game.input.map,clock:game.time,up:game.input.down('up'),move:game.input.move(),x:__gameTest.state.players.solo.x,y:__gameTest.state.players.solo.y,tick:__gameTest.state.tick,errors:game.errors})"
        )

    print("BEFORE", read())
    page.keyboard.down("w")
    page.wait_for_timeout(700)
    print("DURING", read())
    page.keyboard.up("w")
    page.wait_for_timeout(100)
    print("AFTER", read())
    b.close()
