import importlib.util
import json
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "browser_suite", ROOT / "tests/browser-verify.py"
)
suite = importlib.util.module_from_spec(spec)
spec.loader.exec_module(suite)
OUT = ROOT / "tests/browser-evidence"
records = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--enable-unsafe-swiftshader"])
    try:
        ctx, page, errors, requests = suite.open_game(browser)
        try:
            page.evaluate("__pads=[__makePad(0)]")
            suite.click(page, "Co-op crew")
            suite.click(page, "Keyboard + controller")
            suite.click(page, "Launch sortie")
            suite.advance(page, 22)
            page.keyboard.down("d")
            page.evaluate("__pads[0].axes[2]=.9")
            suite.advance(page, 0.35)
            page.keyboard.up("d")
            page.evaluate("__pads[0].axes[2]=0")
            suite.advance(page, 0.1)
            suite.key(page, "Tab")
            page.get_by_role("button", name=re.compile("12 O’CLOCK.*NOSE")).click()
            suite.advance(page, 0.35)
            page.get_by_role("button", name=re.compile("12 O’CLOCK.*NOSE")).click()
            suite.advance(page, 0.35)
            page.evaluate(
                """()=>{window.__fgs=[];const v=__bomber.view,old=v.foreground.bind(v);v.foreground=(pen,c,pl,a,s)=>{old(pen,c,pl,a,s);const pt=[];pen._p(104,7,-12,pt);window.__fgs.push({i:pl.id,station:pl.station,c:{...c},world:{x:pt[0]*16-131072,y:pt[2]*16-262144,z:pt[1]*16}});if(__fgs.length>4)__fgs.shift();};}"""
            )
            suite.advance(page, 0.2)
            page.screenshot(path=str(OUT / "split-nose-before-pause.png"))
            records.append(
                page.evaluate(
                    '({when:"before",fg:__fgs,players:__bomber.sim.state.players,projections:__fgs.map(f=>({station:f.station,point:__bomber.view.projectFor(f.i-1,f.world.x,f.world.y,f.world.z)}))})'
                )
            )
            suite.pad(page, 0, 9)
            suite.advance(page, 0.3)
            suite.pad(page, 0, 1)
            suite.advance(page, 0.3)
            page.screenshot(path=str(OUT / "split-nose-after-pause.png"))
            records.append(
                page.evaluate(
                    '({when:"after",fg:__fgs,players:__bomber.sim.state.players,projections:__fgs.map(f=>({station:f.station,point:__bomber.view.projectFor(f.i-1,f.world.x,f.world.y,f.world.z)}))})'
                )
            )
            suite.advance(page, 1)
            page.screenshot(path=str(OUT / "split-nose-settled.png"))
            records.append(
                page.evaluate('({when:"settled",fg:__fgs,errors:game.errors})')
            )
            assert not errors and not requests and not page.evaluate("game.errors")
        finally:
            ctx.close()
    finally:
        browser.close()
(OUT / "split-inspect.json").write_text(json.dumps(records, indent=2))
print("Split inspection: 3 captures, 0 errors")
