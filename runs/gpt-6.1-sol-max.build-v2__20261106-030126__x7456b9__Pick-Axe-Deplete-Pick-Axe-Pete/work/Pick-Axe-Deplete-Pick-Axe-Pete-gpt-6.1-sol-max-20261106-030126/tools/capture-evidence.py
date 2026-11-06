"""Inspect normal-input gameplay composition; screenshots supplement state tests."""

from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    try:
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        page.goto((ROOT / "index.html").as_uri())
        page.wait_for_function("window.__pd && document.body.dataset.ready === 'true'")
        page.keyboard.press("Enter")
        page.wait_for_function("__pd.app.state === 'play'")
        page.evaluate("__pd.game.stop();window.visualPilot=new PD.Pilot(0)")
        for stage, filename in [
            ("unarmed", "unarmed-recovery-tv.png"),
            ("doorway", "doorway-tv.png"),
            ("middle", "midgame-tv.png"),
            ("finale", "finale-tv.png"),
        ]:
            result = page.evaluate(
                """stage => {
                const ready = m => stage==='unarmed' ? m.chamber===0&&m.players[0].tool===0&&m.pickups.length>0
                  : stage==='doorway' ? m.status==='transition'
                  : stage==='middle' ? m.chamber===1&&m.age>15&&m.rocks.length>=4
                  : m.room.def.extraction&&m.finale.wave===3&&m.finale.active&&m.rocks.length>=3;
                __pd.app.testing=true;
                for(let n=0;n<120*500;n++) {
                  if(ready(__pd.mine))break;
                  if(__pd.app.state!=='play')throw Error('Visual scenario ended before '+stage);
                  __pd.app.injected={0:visualPilot.intent(__pd.mine)};
                  __pd.game.advance(PD.STEP);
                }
                __pd.app.injected=null;__pd.app.testing=false;
                if(!ready(__pd.mine))throw Error('Visual scenario missed '+stage);
                __pd.advance(0,null,true);
                return {stage,chamber:__pd.mine.chamber,time:__pd.mine.time,status:__pd.mine.status,rocks:__pd.mine.rocks.length};
                }""",
                stage,
            )
            if stage == "doorway":
                page.evaluate("__pd.advance(.45,{},true)")
            page.screenshot(
                path=str(ROOT / "docs/evidence" / filename), animations="disabled"
            )
            print(result)
        page.evaluate(
            "__pd.game.settings.set('motion',true);__pd.game.settings.set('reducedFlashes',true);__pd.advance(.04,{},true)"
        )
        page.screenshot(
            path=str(ROOT / "docs/evidence/finale-reduced-motion-tv.png"),
            animations="disabled",
        )
        assert not page.evaluate("__pd.game.errors")
        page.evaluate("__pd.end()")
    finally:
        browser.close()
