from pathlib import Path

from playwright.sync_api import sync_playwright

failures = []
checks = 0


def check(condition, message):
    global checks
    checks += 1
    if not condition:
        failures.append(message)


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
    )
    page = browser.new_page()
    page.goto("about:blank")
    source = (
        Path(__file__)
        .with_name("audio.js")
        .read_text()
        .replace("export class AudioEngine", "class AudioEngine")
    )
    page.add_script_tag(content=source + "\nwindow.synth = new AudioEngine();")
    result = page.evaluate(
        'async () => { const unlocked = await synth.unlock(); synth.update(0.1, "play"); for (const s of ["jump","bump","kick","coin","hurt","clear","pow","win","lose","select"]) synth.play(s); synth.speak("hello"); return {unlocked,diag:synth.getDiagnostics(),offline:await synth.testOffline()}; }'
    )
    d = result["diag"]
    o = result["offline"]
    check(result["unlocked"], "AudioContext failed to unlock")
    check(d["musicVolume"] == 0.1, "Music default is not 10%")
    check(d["musicActive"] and d["notes"] > 0, "Music transport failed to start")
    check(
        all(
            d["events"].get(s, 0) == 1
            for s in [
                "jump",
                "bump",
                "kick",
                "coin",
                "hurt",
                "clear",
                "pow",
                "win",
                "lose",
                "select",
                "voice",
            ]
        ),
        "SFX or voice dispatch failed",
    )
    check(
        o["supported"] and o["invalidSamples"] == 0,
        "Offline synthesis emitted invalid samples",
    )
    check(
        o["rms"] > 0.005 and o["peak"] > 0.1,
        "Synthesized output is silent or unexpectedly quiet",
    )
    check(
        o["peak"] < 1 and o["channels"] == 2,
        "Offline output clips or has wrong channel count",
    )
    paused = page.evaluate(
        '() => { synth.update(0.1,"pause"); return synth.getDiagnostics(); }'
    )
    check(not paused["musicActive"], "Pause did not stop music scheduling")
    resumed = page.evaluate(
        '() => { synth.update(0.1,"play"); synth.setMusicVolume(0.4); synth.setSfxVolume(0.3); synth.setMuted(true); return synth.getDiagnostics(); }'
    )
    check(
        resumed["musicActive"]
        and resumed["musicVolume"] == 0.4
        and resumed["sfxVolume"] == 0.3
        and resumed["muted"],
        "Volume or mute setters failed",
    )
    page.evaluate("() => synth.dispose()")
    browser.close()

for failure in failures:
    print("FAIL: " + failure)
print(f"{checks} audio checks, {len(failures)} failures")
raise SystemExit(bool(failures))
