"""Measure actual packaged native sound after real browser activation; no audition."""

import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
IDENTITY = json.loads((ROOT / "build-identity.json").read_text())
URL = (ROOT.parent / (IDENTITY["basename"] + ".html")).as_uri()
RESULTS = []


def check(name, condition, detail=""):
    RESULTS.append({"name": name, "pass": bool(condition), "detail": str(detail)})


def stats(page):
    return page.evaluate("TallTaleApp.sound.stats()")


def wait_for_output(page, duration=1600):
    # Music plays against the actual native RAF clock, rather than a stopped
    # simulation with a separate OfflineAudioContext diagnostic.
    values = []
    for _ in range(duration // 40):
        page.wait_for_timeout(40)
        v = stats(page)
        values.append(v)
        if v["finite"] and v["rms"] > 0.00001:
            return v
    return max(values, key=lambda v: v["rms"], default=stats(page))


def run_audio_checks():
    RESULTS.clear()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = browser.new_context(viewport={"width": 1280, "height": 720})
        ctx.route(
            "**/*",
            lambda r: r.continue_() if r.request.url.startswith("file:") else r.abort(),
        )
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        try:
            page.goto(URL)
            page.wait_for_function("window.TallTaleApp?.state.ready")
            page.evaluate("TallTaleApp.game.stop()")
            check(
                "before activation: no audio context",
                page.evaluate("TallTaleApp.game.audio.ctx===null"),
            )
            check(
                "fresh default: native music is ten percent",
                stats(page)["musicGain"] == 0.1,
            )
            page.get_by_role("button", name="Climb solo", exact=False).click()
            page.get_by_role("button", name="Let’s climb", exact=False).click()
            page.evaluate("TallTaleApp.game.start()")
            audible = wait_for_output(page)
            check(
                "real title action: native music activates and produces finite output",
                audible["activated"]
                and not audible["stopped"]
                and audible["ready"]
                and audible["finite"]
                and audible["rms"] > 0
                and audible["peak"] < 1,
                audible,
            )
            check(
                "music uses the authored score on the native sync clock",
                page.evaluate(
                    "TallTaleApp.game.audio.song?.src===TallTale.Audio.songs.climb && TallTaleApp.game.audio.song.sync"
                ),
            )
            page.evaluate("TallTaleApp.game.settings.set('sound',false)")
            page.wait_for_timeout(150)
            muted = stats(page)
            check(
                "native mute produces zero output",
                muted["muted"] and muted["peak"] == 0 and muted["rms"] == 0,
                muted,
            )
            page.evaluate("TallTaleApp.game.settings.set('sound',true)")
            check("native unmute restores output", wait_for_output(page)["rms"] > 0)

            page.evaluate("TallTaleApp.game.settings.set('music',0)")
            page.wait_for_timeout(200)
            before = page.evaluate("TallTaleApp.state.sim.coverage.jumps")
            page.keyboard.down("Space")
            jump = wait_for_output(page, 350)
            page.keyboard.up("Space")
            check(
                "normal jump: native procedural effect is audible with music at zero",
                page.evaluate("TallTaleApp.state.sim.coverage.jumps") > before
                and jump["finite"]
                and jump["rms"] > 0,
                jump,
            )
            page.evaluate(
                "TallTaleApp.game.settings.set('voice',.2);TallTaleApp.game.settings.set('music',.1)"
            )
            page.wait_for_timeout(80)
            check(
                "voice slider controls the actual native voice bus",
                page.evaluate(
                    "Math.abs(TallTaleApp.game.audio._voiceBus.gain.value-.2)<1e-6"
                ),
            )

            page.evaluate("TallTaleApp.game.pause()")
            tick = page.evaluate("TallTaleApp.state.sim.tick")
            pos = page.evaluate("TallTaleApp.game.audio.pos.step")
            page.wait_for_timeout(450)
            check(
                "pause freezes simulation and native music clock",
                page.evaluate("TallTaleApp.state.sim.tick") == tick
                and abs(page.evaluate("TallTaleApp.game.audio.pos.step") - pos) < 1e-7,
            )
            check(
                "pause leaves no ongoing gibberish voices",
                stats(page)["liveVoices"] == 0,
            )
            page.get_by_role("button", name="Resume", exact=True).click()
            check(
                "resume restores native music output", wait_for_output(page)["rms"] > 0
            )

            page.evaluate(
                "(()=>{const s=TallTaleApp.state.sim,a=s.actors[0];a.recovery=0;a.power=0;s.chances=1;s.hurtActor(a,'audio regression fixture');})()"
            )
            page.wait_for_function("TallTaleApp.state.results")
            check(
                "failure disposes run audio",
                stats(page)["stopped"]
                and stats(page)["liveVoices"] == 0
                and page.evaluate("TallTaleApp.game.audio.song===null"),
            )
            page.get_by_role("button", name="Retry this checkpoint", exact=True).click()
            retry = wait_for_output(page)
            check(
                "checkpoint retry resumes native music",
                retry["activated"] and not retry["stopped"] and retry["rms"] > 0,
                retry,
            )

            page.evaluate("TallTaleApp.game.pause()")
            page.get_by_role("button", name="Quit to title", exact=True).click()
            page.get_by_role("button", name="Quit", exact=True).click()
            page.wait_for_function("TallTaleApp.state.mode==='title'")
            page.get_by_role("button", name="Climb solo", exact=False).click()
            page.get_by_role("button", name="Let’s climb", exact=False).click()
            again = wait_for_output(page)
            check(
                "title return and fresh run restore procedural sound",
                again["activated"] and not again["stopped"] and again["rms"] > 0,
                again,
            )

            server = page.evaluate(
                """()=>{const a=TallTaleApp,Native=a.game.audio.constructor,one=new Native({headless:false,time:0,real:0});const g={headless:false,audio:one,settings:{}};const probe=new TallTale.Audio(My3D2dge,g,{silent:true});const blocked=probe.activate()===false&&one.ctx===null;probe.dispose();const two=new Native({headless:false,time:0,real:0}),probe2=new TallTale.Audio(My3D2dge,{headless:false,audio:two,settings:{}}),old=AIHub.server;AIHub.server=true;const dynamic=probe2.activate()===false&&two.ctx===null;probe2.update(1/120,{section:0,actors:[],events:[{id:1,type:'heart'}]});const none=two.ctx===null;AIHub.server=old;probe2.dispose();return{blocked,dynamic,none};}"""
            )
            check(
                "silent and dynamically identified server never create audio",
                all(server.values()),
                server,
            )

            # This is the application's actual pagehide handler, which owns
            # Audio.dispose and input release when the packaged page leaves.
            page.evaluate("dispatchEvent(new Event('pagehide'))")
            page.wait_for_timeout(100)
            check(
                "page disposal ends voices, music and activation listeners",
                stats(page)["stopped"]
                and stats(page)["liveVoices"] == 0
                and page.evaluate(
                    "TallTaleApp.game.audio.song===null && TallTaleApp.sound.controller.signal.aborted"
                ),
            )
            check(
                "actual sound scenarios produce no page/native errors",
                not errors and not page.evaluate("TallTaleApp.game.errors"),
                errors,
            )
        finally:
            ctx.close()
            browser.close()
    (ROOT / "artifacts/audio-checks.json").write_text(json.dumps(RESULTS, indent=2))
    return RESULTS


if __name__ == "__main__":
    try:
        run_audio_checks()
    except Exception as exc:  # noqa: BLE001 -- Aggregate verifier records all browser failures.
        check("audio runner", False, repr(exc))
        (ROOT / "artifacts/audio-checks.json").write_text(json.dumps(RESULTS, indent=2))
    for r in RESULTS:
        if not r["pass"]:
            print("FAIL " + r["name"] + ": " + r["detail"])
    print(f"{sum(r['pass'] for r in RESULTS)}/{len(RESULTS)} audio checks passed")
    raise SystemExit(0 if all(r["pass"] for r in RESULTS) else 1)
