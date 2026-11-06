"""Run with ~/.local/share/pipx/venvs/playwright/bin/python tests/audio.test.py."""

from __future__ import annotations

import base64
import sys
from contextlib import suppress
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright


def main() -> int:
    failures: list[str] = []
    checked = 0

    def check(name: str, condition: bool, detail: object = "") -> None:
        nonlocal checked
        checked += 1
        if not condition:
            failures.append(f"FAIL audio: {name}: {detail}")

    source = (Path(__file__).resolve().parent.parent / "audio.js").read_bytes()
    module = "data:text/javascript;base64," + base64.b64encode(source).decode()
    browser = None
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            page = browser.new_page()
            errors: list[str] = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.set_content('<button id="unlock">Enable audio</button>')
            page.evaluate(
                """async url => {
                    const { AudioEngine } = await import(url);
                    window.randomCalls = 0;
                    Math.random = () => { randomCalls++; return 0.5; };
                    window.audio = new AudioEngine();
                    document.querySelector('button').onclick = () => audio.unlock();
                }""",
                module,
            )
            defaults = page.evaluate("audio.stats()")
            check(
                "default music volume is ten percent",
                defaults["musicVolume"] == 0.1,
                defaults,
            )
            check("default effects volume", defaults["sfxVolume"] == 0.65, defaults)
            check(
                "audio remains gesture-locked", defaults["state"] == "locked", defaults
            )
            page.click("button")
            page.wait_for_function('audio.ctx?.state === "running"')
            check("gesture unlocks context", page.evaluate("audio.stats().ready"))
            page.evaluate(
                """() => {
                    window.audioTick = setInterval(() => audio.update(0.02, {
                        active: true, throttle: 0.7, danger: 0.9
                    }), 20);
                    const names = ['shoot', 'enemy', 'split', 'hit', 'explode',
                        'pulse', 'pickup', 'wave', 'victory', 'defeat', 'menu'];
                    names.forEach((name, index) => setTimeout(() => audio.play(name), index * 200));
                    audio.voice('test-radio');
                }"""
            )
            page.wait_for_timeout(2900)
            playing = page.evaluate("audio.stats()")
            check("procedural score schedules notes", playing["notes"] > 30, playing)
            check("all effect events synthesize", playing["events"] == 11, playing)
            check("gibberish radio voices synthesize", playing["voices"] >= 4, playing)
            check("analyser measures audible output", playing["rms"] > 0.00001, playing)
            check(
                "output stays below digital clipping", 0 < playing["peak"] < 1, playing
            )
            check("rotor follows active gameplay", playing["rotorRunning"], playing)
            check(
                "audio leaves gameplay RNG untouched", page.evaluate("randomCalls") == 0
            )
            page.evaluate("audio.setMusic(0.25); audio.setSfx(0.4)")
            volumes = page.evaluate("audio.stats()")
            check(
                "live volume controls update",
                volumes["musicVolume"] == 0.25 and volumes["sfxVolume"] == 0.4,
                volumes,
            )
            page.evaluate("audio.stop()")
            page.wait_for_timeout(100)
            stopped = page.evaluate("audio.stats()")
            check(
                "stop silences and suspends sound",
                stopped["rms"] == 0
                and not stopped["active"]
                and stopped["state"] == "suspended"
                and stopped["playingSources"] == 0,
                stopped,
            )
            page.evaluate("audio.resume()")
            page.wait_for_function('audio.stats().state === "running"')
            page.wait_for_timeout(250)
            resumed = page.evaluate("audio.stats()")
            check(
                "resume restores synthesis",
                resumed["notes"] > stopped["notes"] and resumed["active"],
                resumed,
            )
            check("no browser exceptions", not errors, errors)
            page.evaluate("clearInterval(audioTick); audio.stop()")
            browser.close()
            browser = None
    except (PlaywrightError, OSError, ValueError, KeyError, TypeError) as error:
        check("test runner completes", False, str(error))
    finally:
        if browser is not None:
            with suppress(PlaywrightError):
                browser.close()

    for failure in failures:
        print(failure)
    print(f"{checked} audio checks, {len(failures)} failures")
    return int(bool(failures))


if __name__ == "__main__":
    sys.exit(main())
