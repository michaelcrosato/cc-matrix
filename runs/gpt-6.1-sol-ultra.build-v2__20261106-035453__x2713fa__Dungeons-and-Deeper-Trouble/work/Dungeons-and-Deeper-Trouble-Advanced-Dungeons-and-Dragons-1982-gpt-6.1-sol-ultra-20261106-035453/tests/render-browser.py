import json
from pathlib import Path

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
config = json.loads((root / "build-config.json").read_text())
url = (root.parent / config["filename"]).as_uri()
errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(
        viewport={"width": 1920, "height": 1080}, device_scale_factor=1
    )
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(url)
    page.wait_for_function("window.__DT && __DT.app && __DT.app.ready")
    page.wait_for_timeout(800)
    page.screenshot(path=str(root / "reports/title.png"))
    page.evaluate("__DT.start('solo')")
    page.wait_for_timeout(800)
    page.screenshot(path=str(root / "reports/map.png"))
    page.evaluate("__DT.dev.warp('chalk')")
    page.wait_for_timeout(800)
    page.screenshot(path=str(root / "reports/cave.png"))
    for cave in ["ember", "rime"]:
        page.evaluate("(id)=>__DT.dev.warp(id)", cave)
        page.evaluate(
            """()=>{const a=__DT.app,s=a.sim.state,c=DTContent.caves[s.cave];a.sim.cheats.reveal=true;const e=s.enemies.find(e=>e.kind.startsWith('guardian'));s.players[0].x=e.x-80;s.players[0].y=e.y+60;s.players[0].invuln=99;s.players[0].aim=-.5;}"""
        )
        page.wait_for_timeout(800)
        page.screenshot(path=str(root / f"reports/{cave}.png"))
    state = page.evaluate(
        "({engine:__DT.app.game.errors,state:__DT.app.sim.state.phase,map:!!__DT.app.renderer.map,cave:__DT.app.renderer.caveId})"
    )
    if errors:
        print("Rendered artifact page errors: " + json.dumps(errors))
    if state["engine"]:
        print("Rendered artifact engine errors: " + json.dumps(state["engine"]))
    if not state["map"] or state["cave"] != "rime":
        print("Cave renderer failed to initialize: " + json.dumps(state))
    failures = (
        len(errors)
        + len(state["engine"])
        + (0 if state["map"] and state["cave"] == "rime" else 1)
    )
    (root / "reports/render-review.json").write_text(
        json.dumps(
            {
                "pageErrors": errors,
                "snapshot": state,
                "screenshots": [
                    "title.png",
                    "map.png",
                    "cave.png",
                    "ember.png",
                    "rime.png",
                ],
            },
            indent=2,
        )
    )
    print(f"3 rendered-artifact checks; {failures} failures")
    browser.close()
raise SystemExit(1 if failures else 0)
