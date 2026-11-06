"""Final standalone package, native WebGPU, attract loop and complete campaign."""

import json
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
GAME = ROOT.parent / (ROOT.name + ".html")
failures = []
count = 0


def check(passed, name):
    global count
    count += 1
    if not passed:
        failures.append(name)


try:
    metadata = json.loads((ROOT.parent / "exit-interview.json").read_text())
    check(
        set(metadata)
        == {
            "sourceInformation",
            "testingFeedback",
            "engineFeedback",
            "promptFeedback",
            "aiHub",
        },
        "Exit interview shape",
    )
    check(
        len(metadata["testingFeedback"]) == 4
        and len(metadata["engineFeedback"]) == 6
        and len(metadata["promptFeedback"]) == 4,
        "Exit interview answer counts",
    )
    check(
        all(metadata["sourceInformation"].values())
        and metadata["sourceInformation"]["usage"] == "added on import",
        "Source metadata is complete",
    )
    text = GAME.read_text()
    check(
        "/*BUNDLE*/" not in text
        and "/*STYLES*/" not in text
        and "<!--HUB_CLIENT-->" not in text,
        "Package contains unresolved build markers",
    )
    check(
        text.index("aihub-session 1.4.0") < text.index('name="viewport"'),
        "Unmodified AI Hub client loads first",
    )
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
            ],
        )
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        errors, requests = [], []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on(
            "request",
            lambda r: (
                requests.append(r.url)
                if r.url.startswith(("http:", "https:"))
                else None
            ),
        )
        page.goto(GAME.as_uri())
        page.wait_for_function("window.Grit", timeout=60000)
        check(page.evaluate("Grit.mode") == "title", "File package reaches title")
        check(
            page.evaluate("Grit.renderer.backend") == "WebGPU",
            "Default renderer uses native WebGPU",
        )
        check(not requests, "Single-file package performs external downloads")
        page.evaluate(
            "() => {window.realUnlock=Grit.audio.unlock.bind(Grit.audio);Grit.audio.unlock=()=>new Promise(()=>{});}"
        )
        page.locator('[data-action="solo"]').click()
        page.wait_for_function('Grit.mode === "play"', timeout=3000)
        check(
            page.evaluate("Grit.mode") == "play",
            "Audio autoplay restrictions hold menu actions hostage",
        )
        page.evaluate("Grit.audio.unlock=window.realUnlock;Grit.showTitle();")
        page.evaluate("Grit.start(1)")
        page.wait_for_timeout(300)
        page.evaluate("Grit.pause()")
        before = page.evaluate("Grit.state.time")
        page.wait_for_timeout(300)
        check(
            page.evaluate("Grit.state.time") == before,
            "Solo pause does not freeze simulation",
        )
        page.locator('[data-action="dev"]').click()
        page.locator('[data-setting="speed"]').fill("9")
        check(
            page.evaluate("Grit.settings.speed") == 9,
            "Live balance setting is not applied",
        )
        page.locator('[data-action="resetdev"]').click()
        check(
            page.evaluate("Grit.settings.speed===6.2 && !Grit.settings.invincible"),
            "Dev reset does not restore defaults",
        )
        page.locator('[data-action="next"]').click()
        check(page.evaluate("Grit.state.phase") == 2, "Dev phase skip fails")
        page.evaluate("Grit.showCredits()")
        check(
            all(
                t in page.locator(".panel").inner_text().lower()
                for t in [
                    "source information",
                    "testing feedback",
                    "engine feedback",
                    "prompt feedback",
                ]
            ),
            "Credits omit required sections",
        )
        page.evaluate("Grit.showTitle()")
        page.wait_for_function('Grit.mode === "attract"', timeout=16000)
        check(
            page.evaluate("Grit.state.attract"), "Ten-second attract demo did not start"
        )
        page.wait_for_timeout(2000)
        check(page.evaluate("Grit.state.time > 1"), "Attract demo is not simulating")
        page.keyboard.press("f")
        check(page.evaluate("Grit.mode") == "title", "Any input does not exit attract")
        result = page.evaluate(
            """() => {Grit.start(1);Grit.debug.demo(9000);return Grit.state;}"""
        )
        check(
            result["ended"] and result["won"] and result["phase"] == 5,
            "Packaged scripted campaign does not reach victory",
        )
        check(
            result["stats"]["kicks"] == 23
            and result["stats"]["bonusCoins"] == 18
            and result["stats"]["bossHits"] == 3
            and result["stats"]["pows"] > 0,
            "Packaged playthrough omits mechanics",
        )
        page.wait_for_function('Grit.mode === "result"')
        check(
            "THAT’S A WRAP!" in page.locator(".panel h1").inner_text(),
            "Victory result screen missing",
        )
        page.wait_for_timeout(100)
        check(
            not page.evaluate("Grit.audio.musicActive"),
            "Result screen keeps music scheduling",
        )
        check(not errors, "Runtime errors: " + "; ".join(errors))
        page.close()
        browser.close()
except (OSError, ValueError, PlaywrightError) as error:
    failures.append(str(error))

for failure in failures:
    print("FAIL " + failure)
print(f"{count} package checks, {len(failures)} failures")
raise SystemExit(bool(failures))
