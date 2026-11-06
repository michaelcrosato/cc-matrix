"""Procedural audio checks; usable alone or from the game's complete test command."""

from pathlib import Path

from playwright.sync_api import Error as PlaywrightError


def test_audio(browser, folder):
    """Return (failure_messages, check_count), sharing a sync Playwright browser."""
    failures = []
    count = 0
    page = browser.new_page()
    browser_errors = []
    page.on("pageerror", lambda error: browser_errors.append(str(error)))

    def check(condition, message):
        nonlocal count
        count += 1
        if not condition:
            failures.append("Audio: " + message)

    try:
        source = (
            (Path(folder) / "audio.js")
            .read_text()
            .replace("export class GameAudio", "class GameAudio", 1)
        )
        page.set_content('<button id="unlock">Start sound</button>')
        page.add_script_tag(
            content=source
            + """
            window.testAudio = new GameAudio();
            window.sampledPeak = 0;
            window.audioSampler = setInterval(() => {
              window.sampledPeak = Math.max(window.sampledPeak, testAudio.inspect().peak);
            }, 12);
            document.querySelector('#unlock').onclick = async () => {
              await testAudio.unlock();
              testAudio.shot();
            };
            """
        )
        initial = page.evaluate("testAudio.inspect()")
        check(initial["state"] == "locked", "created an audio context before a gesture")
        check(initial["musicVolume"] == 0.1, "music must default to 10%")
        check(initial["sfxVolume"] == 0.65, "effects default changed unexpectedly")
        page.click("#unlock")
        page.wait_for_function("testAudio.inspect().rms > 0.0001", timeout=2500)
        check(
            page.evaluate("testAudio.inspect().unlocked"),
            "gesture did not unlock audio",
        )
        check(
            page.evaluate("testAudio.inspect().rms > 0"),
            "shot produced no measured signal",
        )
        page.evaluate(
            """() => {
              testAudio.bounce(); testAudio.boost(); testAudio.hit();
              testAudio.round(true);
              testAudio.update(.016, {moving: 1, flying: true, playing: true});
            }"""
        )
        page.wait_for_timeout(180)
        metrics = page.evaluate("testAudio.inspect()")
        check(
            all(
                metrics["events"][event] > 0
                for event in (
                    "shot",
                    "bounce",
                    "hit",
                    "boost",
                    "round",
                    "voice",
                    "music",
                )
            ),
            "one or more sound events or music failed to schedule",
        )
        check(
            0 < page.evaluate("window.sampledPeak") < 0.98,
            "measured signal was silent or clipped",
        )
        page.evaluate("testAudio.mute(true)")
        page.wait_for_timeout(240)
        check(
            page.evaluate("testAudio.inspect().rms < 0.0001"),
            "mute left an audible signal",
        )
        page.evaluate("testAudio.stop()")
        page.wait_for_timeout(30)
        check(
            page.evaluate("testAudio.inspect().activeVoices === 0"),
            "stop left transient voices live",
        )
        page.evaluate("testAudio.suspend()")
        page.wait_for_function(
            "testAudio.inspect().state === 'suspended'", timeout=2500
        )
        check(
            page.evaluate("testAudio.inspect().state === 'suspended'"),
            "pause failed to suspend audio",
        )
        page.evaluate("clearInterval(window.audioSampler); testAudio.destroy()")
        page.wait_for_function("testAudio.inspect().state === 'closed'", timeout=2500)
        check(
            page.evaluate("testAudio.inspect().state === 'closed'"),
            "cleanup failed to close audio",
        )
        check(not browser_errors, "browser exceptions: " + "; ".join(browser_errors))
    except (PlaywrightError, OSError, KeyError, ValueError) as error:
        count += 1
        failures.append("Audio: " + str(error).splitlines()[0])
    finally:
        page.close()
    return failures, count


if __name__ == "__main__":
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        browser_instance = playwright.chromium.launch(headless=True)
        issues, total = test_audio(browser_instance, Path(__file__).parent)
        browser_instance.close()
    for issue in issues:
        print("FAIL:", issue)
    print(f"{total - len(issues)}/{total} audio checks passed")
    raise SystemExit(bool(issues))
