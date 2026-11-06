import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
runtime = root / "tests" / ".runtime"
runtime.mkdir(exist_ok=True)
os.environ["TMPDIR"] = str(runtime)
log = []
count = 0
failures = 0
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=["--disable-dev-shm-usage"])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.goto((root / "index.html").as_uri() + "?test=1&webgl=1&headless=1")
    pg.wait_for_function("window.__dodge?.ready", timeout=60000)

    def record(label):
        s = pg.evaluate("window.__dodge.state")
        log.append(
            {
                "label": label,
                "screen": s["screen"],
                "debug": s["debug"],
                "players": s["players"],
            }
        )

    def action(name):
        pg.evaluate("(n)=>__dodge.action(n)", name)

    def frames(n=2):
        current = pg.evaluate("__dodge.state.debug.inputFrames")
        pg.wait_for_function(
            "(v)=>__dodge.state.debug.inputFrames>=v", arg=current + n, timeout=9000
        )

    def button(n):
        pg.evaluate("(n)=>{__pads[0].buttons[n]={pressed:true,value:1}}", n)
        frames()
        record("button " + str(n) + " down")
        pg.evaluate("(n)=>{__pads[0].buttons[n]={pressed:false,value:0}}", n)
        frames()

    action("solo")
    pg.evaluate("__dodge.advance(4)")
    action("pause")
    record("paused")
    pg.evaluate(
        "window.__pads=[{index:0,id:'test',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}];Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>__pads})"
    )
    button(13)
    record("after down")
    button(0)
    record("after cross")
    if pg.evaluate("__dodge.state.screen") != "settings":
        print("FAIL input probe: menu did not open settings")
        failures += 1
    else:
        count += 1
    pg.evaluate("__pads=[]")
    action("quit")
    action("together")
    action("joinRoom")
    pg.locator("#joinCode").focus()
    record("join focused")
    action("back")
    action("back")
    action("together")
    action("coop")
    pg.evaluate("__dodge.advance(3)")
    record("couch starting")
    pg.keyboard.down("a")
    pg.keyboard.down("ArrowRight")
    frames()
    record("couch held")
    pg.keyboard.up("a")
    pg.keyboard.up("ArrowRight")
    frames()
    record("couch released")
    s = pg.evaluate("__dodge.state")
    if s["players"][0]["queueDir"] != 1 and s["players"][0]["lane"] != 1:
        print("FAIL input probe: keyboard input not applied")
        failures += 1
    else:
        count += 1
    b.close()
(root / "tests/input-probe.json").write_text(json.dumps(log, indent=2))
print(json.dumps({"suite": "input-probe", "count": count, "failures": failures}))
