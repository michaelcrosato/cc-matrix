"""Offline Web Audio verification; prints failures and one count, no listening claim."""

import json
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / "src/audio/audio.js").read_text().replace("export ", "")
failures = []
checks = 0
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    try:
        page = browser.new_page()
        result = page.evaluate(
            "async () => {" + source + "\nreturn await verifyAudioSignals();}"
        )
        for bus in ["music", "effects", "voice"]:
            signal = result[bus]
            for label, ok in [
                ("finite output", signal["finite"]),
                ("nonzero signal", signal["rms"] > 0.00001),
                ("peak below clipping", signal["peak"] < 0.99),
                ("muted bus silent", result[bus + "Muted"] < 0.000001),
            ]:
                checks += 1
                if not ok:
                    failures.append(bus + ": " + label)
        checks += 1
        if result["defaults"]["music"] != 0.1:
            failures.append("music default must be 0.1")
        checks += 1
        if result["terminatedPeak"] > 0.000001:
            failures.append("terminated voice sources continued")
        lifecycle = page.evaluate(
            "async () => {"
            + source
            + """
          const ctx = new OfflineAudioContext(1, 48000, 48000);
          const audio = createAudio({context:ctx});
          audio.event('fire'); audio.speak('Your clock is mine!');
          const before=audio.snapshot(); audio.pause(true); const paused=audio.snapshot();
          audio.event('fire'); audio.speak('No speech'); const silent=audio.snapshot();
          audio.pause(false); audio.setScene('boss'); audio.setVolumes({music:.3,effects:.2,voice:0});
          await audio.destroy(); audio.event('hit'); audio.speak('No speech');
          return {before,paused,silent,after:audio.snapshot()};
        }"""
        )
        for label, ok in [
            ("live sources scheduled", lifecycle["before"]["activeSources"] > 0),
            ("pause cancels sources", lifecycle["paused"]["activeSources"] == 0),
            (
                "paused events skipped",
                lifecycle["silent"]["effects"] == lifecycle["paused"]["effects"],
            ),
            (
                "paused voice skipped",
                lifecycle["silent"]["syllables"] == lifecycle["paused"]["syllables"],
            ),
            ("destroy terminates", lifecycle["after"]["terminated"]),
            ("destroy cancels sources", lifecycle["after"]["activeSources"] == 0),
            (
                "volume changes apply",
                lifecycle["after"]["volumes"]
                == {"music": 0.3, "effects": 0.2, "voice": 0},
            ),
        ]:
            checks += 1
            if not ok:
                failures.append(label)
        page.set_content('<canvas id="screen"></canvas>')
        page.add_script_tag(path=str(ROOT / "vendor/my-3d2dge.js"))
        native = page.evaluate(
            "async () => {"
            + source
            + """
          const context=new OfflineAudioContext(1,96000,48000);
          Object.defineProperty(context,'state',{get(){return 'running';}});
          window.AudioContext=function(){return context;};
          const game=new My3D2dge.Game({canvas:'screen',view:'overhead',menu:false});
          const audio=createAudio({engineAudio:game.audio});
          await audio.unlock(); audio.setScene('combat'); audio.event('fire');
          audio.speak('My time, my rules!'); const active=audio.snapshot();
          const render=await context.startRendering(); let peak=0;
          for(const x of render.getChannelData(0)) peak=Math.max(peak,Math.abs(x));
          const levels=()=>({music:game.audio._musBus.gain.value,
            effects:game.audio._sfxBus.gain.value,voice:game.audio._voiceBus.gain.value});
          const volumes=levels(); await audio.destroy(); const end=levels();
          const next=createAudio({engineAudio:game.audio}); const fresh=levels();
          await next.destroy(); game.dispose();
          return {active,peak,volumes,end,fresh};
        }"""
        )
        for label, ok in [
            ("native synth produces signal", 0.00001 < native["peak"] < 0.99),
            ("native effect dispatched", native["active"]["effects"] == 1),
            ("native voice scheduled", native["active"]["syllables"] > 0),
            (
                "native music default applied",
                abs(native["volumes"]["music"] - 0.1) < 0.00001,
            ),
            (
                "native termination silences every bus",
                all(v == 0 for v in native["end"].values()),
            ),
            (
                "native retry restores saved levels",
                all(
                    abs(native["fresh"][k] - v) < 0.00001
                    for k, v in {"music": 0.1, "effects": 0.7, "voice": 0.65}.items()
                ),
            ),
        ]:
            checks += 1
            if not ok:
                failures.append(label)
        result["native"] = native
        (ROOT / "test-artifacts/audio.json").write_text(json.dumps(result, indent=2))
    except (PlaywrightError, OSError, ValueError) as exc:
        failures.append(str(exc))
    finally:
        browser.close()
for failure in failures:
    print("FAIL audio: " + failure)
print(f"{checks} audio checks, {len(failures)} failures")
raise SystemExit(1 if failures else 0)
