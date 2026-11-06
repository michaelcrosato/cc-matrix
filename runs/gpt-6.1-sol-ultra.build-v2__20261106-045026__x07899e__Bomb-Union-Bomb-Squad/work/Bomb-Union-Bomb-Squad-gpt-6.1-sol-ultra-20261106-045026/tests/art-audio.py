"""Native presentation and synthesized sound checks on the exported HTML artifact.

Uses a single browser. Hardware listening, physical TV and controller checks are
unavailable; these assertions establish render lifecycle and Web Audio output.
"""

import json
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parent.parent
PROJECT = json.loads((BASE / "project.json").read_text())
ARTIFACT = BASE.parent / (PROJECT["slug"] + ".html")
checks = []
errors = []
probe = {}


def check(name, passed, detail=""):
    checks.append({"name": name, "pass": bool(passed), "detail": detail})


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--allow-file-access-from-files"])
    page = browser.new_page(
        viewport={"width": 1920, "height": 1080}, device_scale_factor=1
    )
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        page.goto(ARTIFACT.as_uri())
        page.wait_for_function("globalThis.BU?.app?.art && globalThis.__game?.time>.1")
        check(
            "Exported native game identifies as Bomb Union",
            page.title().startswith("Bomb Union"),
        )
        page.screenshot(path=str(BASE / "evidence/final-native-title.png"))
        check(
            "Native engine initializes its custom original shapes",
            page.evaluate(
                'Object.keys(My3D2dge.SHAPES).filter(k=>k.startsWith("BU:")).length>=14'
            ),
        )
        for case_id in ["waterfront", "relay", "central"]:
            page.evaluate("(id)=>BU.app.startCase(id,42)", case_id)
            page.wait_for_timeout(200)
            page.screenshot(path=str(BASE / f"evidence/final-native-{case_id}.png"))
            check(
                case_id + " native city scene has no draw errors",
                page.evaluate("!__game.errors.length"),
                str(page.evaluate("__game.errors")),
            )
            page.evaluate('BU.app.openBoard("B1")')
            page.wait_for_timeout(250)
            page.screenshot(
                path=str(BASE / f"evidence/final-native-board-{case_id}.png")
            )
            check(
                case_id + " native PCB and tool render without errors",
                page.evaluate("!__game.errors.length"),
            )
            check(
                case_id + " both terminals and tray are visible targets",
                page.evaluate(
                    '(()=>{const ts=__game.debug.targets();return ts.some(t=>t.kind==="terminal"&&t.terminal===0)&&ts.some(t=>t.kind==="terminal"&&t.terminal===1)&&ts.some(t=>t.kind==="spare")&&ts.every(t=>t.x>0&&t.x<__game.W*.75&&t.y>15&&t.y<__game.H*.9)})()'
                ),
            )
        check(
            "Actual native music setting defaults to 10 percent",
            page.evaluate(
                '__game.settings.default("music")===.1&&BU.app.audio.snapshot().music===.1'
            ),
        )
        page.mouse.click(30, 130)
        page.evaluate("BU.app.audio.unlock()")
        check(
            "User activation unlocks procedural audio",
            page.evaluate('BU.app.audio.snapshot().context==="running"'),
        )
        music_state = page.evaluate("BU.app.audio.snapshot()")
        check(
            "Real native music GainNode starts at 0.1",
            abs(music_state["musicGain"] - 0.1) < 1e-6,
            json.dumps(music_state),
        )
        probe = page.evaluate("""async()=>{
          const ctx=new OfflineAudioContext(1,48000*4,48000),gains=BU.Audio.renderProbe(ctx),buffer=await ctx.startRendering(),samples=buffer.getChannelData(0);
          let sum=0,peak=0,finite=true;for(const s of samples){finite=finite&&Number.isFinite(s);sum+=s*s;peak=Math.max(peak,Math.abs(s));}
          return {finite,rms:Math.sqrt(sum/samples.length),peak,...gains};
        }""")
        check(
            "Code synthesized instruments voices and release are finite and audible",
            probe["finite"] and probe["rms"] > 0.001 and probe["peak"] < 1,
            json.dumps(probe),
        )
        page.evaluate("BU.app.audio.set({music:.25,effects:.4,voice:.6,muted:false})")
        bus_state = page.evaluate("BU.app.audio.snapshot()")
        check(
            "All three native audio buses apply independent values",
            abs(bus_state["musicGain"] - 0.25) < 1e-6
            and abs(bus_state["effectsGain"] - 0.4) < 1e-6
            and abs(bus_state["voiceGain"] - 0.6) < 1e-6,
            json.dumps(bus_state),
        )
        page.evaluate("BU.app.audio.set({muted:true})")
        check(
            "Master mute is applied in the actual native gain graph",
            page.evaluate("BU.app.audio.native._master.gain.value===0"),
        )
        page.evaluate(
            'BU.app.audio.set({muted:false,music:.1,effects:1,voice:1}); BU.app.audio.voice("saboteur","A theatrical interruption.",0,"audio-test-low"); BU.app.audio.voice("partner","Urgent repair instruction.",2,"audio-test-high");'
        )
        check(
            "Urgent procedural voice preempts a taunt",
            page.evaluate(
                "BU.app.audio.voicePriority===2&&BU.app.audio.sources.size>0"
            ),
        )
        page.evaluate("BU.app.audio.suspend(true)")
        check(
            "Pause stops procedural voices effects and native music",
            page.evaluate(
                "BU.app.audio.paused&&BU.app.audio.sources.size===0&&BU.app.audio.queue.length===0&&BU.app.audio.native.song===null"
            ),
        )
        page.evaluate("BU.app.audio.suspend(false)")
        check(
            "Resume restores original native cue system",
            page.evaluate("!BU.app.audio.paused&&BU.app.audio.native.song!==null"),
        )
        page.evaluate(
            'BU.app.command({type:"dev",operation:"fire",board:"B1"}); BU.app.focusTarget="fire";BU.app.tool="extinguish";'
        )
        page.wait_for_timeout(200)
        page.screenshot(path=str(BASE / "evidence/final-native-fire.png"))
        check(
            "Established fire and physical extinguisher are renderable",
            page.evaluate("!__game.errors.length&&BU.app.state.boards[0].fire"),
        )
        check(
            "Exported presentation has no browser exceptions",
            not errors,
            json.dumps(errors),
        )
    except Exception as exc:  # noqa: BLE001 - test runner records failed acceptance evidence
        check("Presentation verification completed", False, str(exc))
    finally:
        try:
            page.evaluate(
                "BU.app.audio.dispose();BU.app.art.dispose();__game.dispose()"
            )
        except Exception:  # noqa: BLE001, S110 - best-effort cleanup after evidence is recorded
            pass
        browser.close()
result = {
    "checks": checks,
    "probe": probe,
    "failures": [c for c in checks if not c["pass"]],
}
(BASE / "evidence/art-audio.json").write_text(json.dumps(result, indent=2))
print(json.dumps(result))
raise SystemExit(bool(result["failures"]))
