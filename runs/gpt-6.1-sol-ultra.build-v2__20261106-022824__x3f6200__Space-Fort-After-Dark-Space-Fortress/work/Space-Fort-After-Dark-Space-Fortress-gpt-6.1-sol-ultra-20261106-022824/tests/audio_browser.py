"""Signal and lifecycle checks on the delivered HTML; uses installed Playwright."""

import argparse
import json
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("artifact", type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    results = []

    def check(name, condition, detail=""):
        results.append({"name": name, "pass": bool(condition), "detail": detail})

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context()
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(args.artifact.resolve().as_uri(), wait_until="load")
            page.wait_for_function(
                "document.body.dataset.ready === 'true' && !!window.__siege?.audio",
                timeout=20000,
            )
            check(
                "fresh-profile music defaults to ten percent",
                page.evaluate("__siege.audio.diagnostics().music === 0.1"),
            )

            signals = page.evaluate(
                """async () => {
                const fake = {headless:false, real:0, time:0};
                fake.audio = new __game.audio.constructor(fake);
                const adapter = new SF.Audio(fake, {});
                const result = {instruments:{},songs:{}};
                const meter = buffer => {
                    const data=buffer.getChannelData(0);
                    let energy=0,peak=0,finite=true;
                    for(const value of data){
                        energy+=value*value;peak=Math.max(peak,Math.abs(value));
                        finite=finite&&Number.isFinite(value);
                    }
                    return {rms:Math.sqrt(energy/data.length),peak,finite};
                };
                for(const name of ['horn','bass','tick','laser','burst','pulse','radio']){
                    const c=new OfflineAudioContext(1,48000,48000),bus=c.createGain();
                    bus.gain.value=.72;bus.connect(c.destination);
                    adapter._instrument(name,c,bus,.01,name==='bass'?110:440,.4,.2);
                    result.instruments[name]=meter(await c.startRendering());
                }
                for(const [name,song] of Object.entries(SF.Audio.songs)){
                    const c=new OfflineAudioContext(1,96000,48000),bus=c.createGain();
                    fake.audio.ctx=c;bus.gain.value=.072;bus.connect(c.destination);
                    const spb=60/song.bpm/song.steps;
                    for(const sourceTrack of song.tracks){
                        const track={...sourceTrack,tokens:sourceTrack.notes.replace(/\\|/g,' ').trim().split(/\\s+/)};
                        for(let i=0;i<Math.min(track.tokens.length,Math.floor(1.8/spb));i++){
                            fake.audio._note(track,i,.01+i*spb,spb,bus);
                        }
                    }
                    result.songs[name]=meter(await c.startRendering());
                }
                fake.audio.ctx=null;adapter.stop();return result;
                }"""
            )
            for group, probes in signals.items():
                for name, signal in probes.items():
                    check(
                        f"finite non-silent bounded {group}: {name}",
                        signal["finite"]
                        and signal["rms"] > 0.00001
                        and signal["peak"] < 1,
                        signal,
                    )

            # Unlock from a real pointer gesture at an empty safe-margin location.
            page.evaluate(
                "addEventListener('pointerdown',()=>__siege.audio.unlock(),{once:true})"
            )
            page.mouse.click(2, 2)
            page.wait_for_timeout(70)
            live = page.evaluate("__siege.audio.diagnostics()")
            check(
                "real gesture unlocks native score",
                live["unlocked"] and live["musicPlaying"] and live["sources"] > 0,
                live,
            )
            muted = page.evaluate(
                "__siege.audio.setSettings({music:0,sfx:0,voice:0});__siege.audio.diagnostics()"
            )
            check(
                "all-bus mute stops all procedural voices and music",
                muted["sources"] == 0 and not muted["musicPlaying"] and muted["muted"],
                muted,
            )
            page.evaluate("__siege.audio.setSettings({music:.1,sfx:.6,voice:.4})")
            check(
                "restoring volume restarts native score",
                page.evaluate("__siege.audio.diagnostics().musicPlaying"),
            )
            paused = page.evaluate(
                "__siege.audio.suspend();__siege.audio.diagnostics()"
            )
            check(
                "pause clears procedural voices and music",
                paused["sleeping"]
                and paused["sources"] == 0
                and not paused["musicPlaying"],
                paused,
            )
            page.evaluate("__siege.audio.resume()")
            page.wait_for_timeout(40)
            check(
                "resume restarts native score",
                page.evaluate("__siege.audio.diagnostics().musicPlaying"),
            )
            ended = page.evaluate("__siege.audio.stop();__siege.audio.diagnostics()")
            check(
                "end leaves no voices or music",
                ended["stopped"]
                and ended["sources"] == 0
                and not ended["musicPlaying"],
                ended,
            )
            check(
                "audio checks leave no page or native engine errors",
                not errors and page.evaluate("__game.errors.length === 0"),
                errors,
            )
            context.close()
            browser.close()
    except (PlaywrightError, OSError, ValueError, KeyError, TypeError) as error:
        check("packaged audio browser run", False, str(error))

    report = {
        "passed": sum(result["pass"] for result in results),
        "failed": sum(not result["pass"] for result in results),
        "results": results,
        "limitations": "Chromium Web Audio signal checks; human listening and physical audio hardware unknown.",
    }
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, indent=2) + "\n")
    for result in results:
        if not result["pass"]:
            print(f"FAIL {result['name']}: {result['detail']}")
    print(f"{report['passed']} passed, {report['failed']} failed")
    raise SystemExit(1 if report["failed"] else 0)


if __name__ == "__main__":
    main()
