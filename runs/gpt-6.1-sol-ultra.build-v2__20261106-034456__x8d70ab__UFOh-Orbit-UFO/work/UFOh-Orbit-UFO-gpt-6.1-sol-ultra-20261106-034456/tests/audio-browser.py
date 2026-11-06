"""Numerical audio checks using only installed Chromium and the native synth."""

import json
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def run_audio_tests():
    failures = []
    passed = 0

    def check(ok, label):
        nonlocal passed
        if ok:
            passed += 1
        else:
            failures.append(label)

    engine = (ROOT / "vendor/engine/my-3d2dge.js").read_text()
    music = (ROOT / "src/data/music.js").read_text().replace("export const ", "const ")
    code = (ROOT / "src/audio.js").read_text()
    code = re.sub(r"^import .*?;\n", "", code, flags=re.MULTILINE)
    code = (
        code.replace("export const ", "const ")
        .replace("export class ", "class ")
        .replace("export async function ", "async function ")
    )
    setup = """
      window.game = new My3D2dge.Game({canvas:'screen',res:'ps1',view:'overhead',
        menu:false,corner:false,fullscreen:false,autoPause:false});
      window.audio = new OrbitAudio(game);
      window.probe = renderAudioProbe;
      audio.setScene('mission');audio.cue('shot');
      window.locked = {ctx:game.audio.ctx,played:audio.played};
      game.start({update(dt){audio.tick(dt)},draw(){}});
      document.getElementById('unlock').onclick=()=>{audio.unlock();audio.cue('ready');audio.say('HELLO ORBIT',1)};
    """
    source = f"{engine}\n{music}\n{code}\n{setup}".replace("</script", "<\\/script")
    html = (
        '<!doctype html><html><head><meta charset="utf-8"></head><body><canvas id="screen"></canvas><button id="unlock" style="position:fixed;z-index:999;left:10px;top:10px">UNLOCK</button><script>'
        + source
        + "</script></body></html>"
    )
    artifact = ROOT / "artifacts/audio-probe.html"
    artifact.write_text(html)
    report = {"passed": 0, "failed": 0, "failures": [], "probes": {}}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(artifact.as_uri())
            page.wait_for_function("window.audio && window.locked")
            locked = page.evaluate("window.locked")
            check(
                locked["ctx"] is None and locked["played"] == 0,
                "No sound or native AudioContext is created before unlock",
            )
            check(
                page.evaluate("audio.settings.music === .10"),
                "First-run music volume is exactly ten percent",
            )
            page.click("#unlock")
            page.wait_for_function("audio.debug().contextState==='running'")
            d = page.evaluate("audio.debug()")
            check(
                d["unlocked"] and abs(d["buses"]["music"] - 0.10) < 1e-6,
                "Native music bus matches saved ten percent setting",
            )
            check(
                d["gibberishCount"] == 1,
                "Code-generated babble starts through native voice bus",
            )
            probes = page.evaluate("""async () => {
              const names=['shot','shield','charge','ready','damage','drifter','hunter','gunship','merge','hunterCharge','warning','missile','chain','rescue','phase','victory','defeat','focus','confirm','cancel'];
              const out={};for(const n of names)out[n]=await probe(game.audio,n);return out;
            }""")
            report["probes"] = probes
            for name, sample in probes.items():
                check(
                    sample["available"]
                    and sample["finite"]
                    and sample["rms"] > 0.0001
                    and 0 < sample["peak"] < 0.9,
                    f"{name}: finite, audible, bounded exact native cue",
                )
            check(
                abs(
                    probes["ready"]["zeroCrossings"]
                    - probes["warning"]["zeroCrossings"]
                )
                > 50,
                "Shield ready and threat warning have measurably distinct pitches",
            )
            check(
                probes["ready"]["rms"] != probes["damage"]["rms"],
                "Recharge ready and damage signals differ",
            )
            muted = page.evaluate("probe(game.audio,'shot',{muted:true})")
            check(
                muted["peak"] == 0 and muted["rms"] == 0,
                "Muted offline cue is exactly silent",
            )
            before = page.evaluate("audio.played")
            page.evaluate(
                "audio.resetEvents();audio.handle([{id:100,type:'shot',x:300},{id:100,type:'shot',x:300}])"
            )
            check(
                page.evaluate("audio.played") == before + 1,
                "Simulation event IDs deduplicate effects",
            )
            actual_events = page.evaluate("""() => {
              audio.tick(1);audio.resetEvents();const before=audio.played;
              ['shield-spent','shield-ready','hull-hit','fusion-warning','fusion','gunship-warning','boss-phase'].forEach((type,i)=>{audio.tick(.1);audio.handle([{id:i+1,type}])});
              return audio.played-before;
            }""")
            check(
                actual_events == 7,
                "Actual simulation event enum maps to native shield, damage, fusion, warning and phase cues",
            )
            page.evaluate("audio.setSettings({master:.4,music:.27,sfx:.42,voice:.31})")
            levels = page.evaluate("audio.debug().buses")
            check(
                all(
                    abs(levels[k] - v) < 1e-6
                    for k, v in {
                        "master": 0.4,
                        "music": 0.27,
                        "sfx": 0.42,
                        "voice": 0.31,
                    }.items()
                ),
                "All four user-volume buses route correctly",
            )
            page.evaluate("audio.setSettings({muted:true})")
            check(
                page.evaluate("audio.debug().buses.master===0"),
                "Master mute closes every audio bus",
            )
            page.evaluate("audio.setSettings({muted:false});audio.pause(true)")
            check(
                page.evaluate(
                    "game.audio.song===null && audio.voices.size===0 && audio.handles.length===0"
                ),
                "Pause cancels music, babble, and effects",
            )
            page.evaluate('audio.pause(false);audio.setScene("boss")')
            check(
                page.evaluate('audio.scene==="boss" && game.audio.song!==null'),
                "Resume and boss music transition work",
            )
            page.evaluate("audio.stop()")
            check(
                page.evaluate(
                    "audio.stopped && game.audio.song===null && audio.voices.size===0"
                ),
                "Stop/end cleanup leaves no sources or music",
            )
            check(not errors, "No browser audio or draw errors: " + "; ".join(errors))
        finally:
            browser.close()
    report.update(passed=passed, failed=len(failures), failures=failures)
    (ROOT / "artifacts/audio-report.json").write_text(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    try:
        result = run_audio_tests()
    except Exception as exc:  # noqa: BLE001 — the test coordinator reports every failure as JSON
        result = {
            "passed": 0,
            "failed": 1,
            "failures": ["Audio test harness: " + str(exc)],
        }
    print(json.dumps({k: result[k] for k in ["passed", "failed", "failures"]}))
    raise SystemExit(1 if result["failed"] else 0)
