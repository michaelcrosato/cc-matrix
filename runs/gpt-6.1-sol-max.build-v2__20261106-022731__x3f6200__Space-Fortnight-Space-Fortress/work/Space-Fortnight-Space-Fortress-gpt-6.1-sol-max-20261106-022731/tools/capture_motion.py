"""Purposeful native animation filmstrips, driven by the real fixed-step game clock."""

import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ARTIFACT = ROOT.parent / (ROOT.name + ".html")
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    page.goto(ARTIFACT.as_uri())
    page.wait_for_function("window.__fortnight")
    page.locator(".esh-ttl button").first.click()
    page.wait_for_function("__fortnight.world")
    page.evaluate(
        '__game.stop();__game.audio.mute(true);__game.debug.advance(4,{draw:false});__game.input.hold("right");__game.input.tap("boost");__game.input.tap("pulse");__game.input.hold("fire")'
    )
    cases = [
        (
            "pulse-boost",
            [0.01, 0.06, 0.08, 0.1, 0.12, 0.14],
            {"x": 430, "y": 480, "width": 900, "height": 480},
        ),
        (
            "boss-shutters",
            [0.01, 0.5, 0.5, 0.5, 0.5, 0.5],
            {"x": 450, "y": 130, "width": 1400, "height": 620},
        ),
        (
            "docking",
            [0.01, 0.5, 0.5, 0.5, 0.5, 0.5],
            {"x": 350, "y": 430, "width": 1250, "height": 600},
        ),
        (
            "victory",
            [0.01, 0.35, 0.35, 0.35, 0.35, 0.65],
            {"x": 0, "y": 0, "width": 1920, "height": 1080},
        ),
    ]
    for name, steps, clip in cases:
        if len(sys.argv) > 1 and name != sys.argv[1]:
            continue
        if name == "boss-shutters":
            page.evaluate("__game.input.clear();__game.debug.jump(2,2,1)")
        if name == "docking":
            page.evaluate(
                '__fortnight.world.s.boss=null;__fortnight.world.enterAct(2);__fortnight.ui.lastPhase=""'
            )
        if name == "victory":
            page.evaluate(
                "__fortnight.startSolo();__game.advance(.01);__game.debug.advance(750,{bot:true,draw:false})"
            )
        frames = []
        for i, dt in enumerate(steps):
            page.evaluate("(dt)=>__game.advance(dt,{draw:true})", dt)
            path = ROOT / "evidence" / f"{name}-{i:02}.png"
            page.screenshot(path=str(path), clip=clip)
            frames.append(str(path))
        subprocess.run(
            [
                "magick",
                "montage",
                "-font",
                "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
                *frames,
                "-tile",
                "3x2",
                "-geometry",
                "600x338+4+4",
                str(ROOT / "evidence" / f"{name}-filmstrip.png"),
            ],
            check=True,
            capture_output=True,
        )
    errors = page.evaluate("__game.errors")
    browser.close()
    if errors:
        raise RuntimeError(str(errors))
