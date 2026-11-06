from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
GAME = ROOT.parent / (ROOT.name + ".html")
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(
        viewport={"width": 1920, "height": 1080}, device_scale_factor=1
    )
    page.goto(GAME.as_uri() + "?visual-qa=1")
    page.wait_for_function("window.Grit", timeout=60000)
    page.wait_for_timeout(400)
    page.screenshot(path=str(ROOT / "title.png"))
    page.evaluate(
        """() => {Grit.start(2);Grit.debug.phase(4);const g=Grit.debug.getGame();g.phaseDelay=999;g.bannerTime=0;Grit.debug.teleport(0,-5,4.65);Grit.debug.teleport(1,5,8.65);g.players[0].hurt=0;g.players[1].hurt=0;g.spawn('crab',-3,8.6);g.spawn('beetle',-9,12.6);g.spawn('fly',8,4.6);let e=g.spawn('crab',3,8.6);e.flipped=true;e.stun=9;g.score=12650;g.combo=4;g.comboTime=4.5;}"""
    )
    page.wait_for_timeout(200)
    page.screenshot(path=str(ROOT / "gameplay.png"))
    page.close()
    browser.close()
