"""Final artifact flight, tools and procedural audio checks. No server required."""

import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
BUILD = "FWR-20261106-023037"


def run_checks(game_path):
    results = []

    def check(name, fn):
        try:
            fn()
            results.append({"name": name, "pass": True})
        except Exception as error:  # noqa: BLE001 - the checker reports every test failure.
            results.append({"name": name, "pass": False, "detail": str(error)})

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()
        errors = []
        requests = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("request", lambda request: requests.append(request.url))
        page.goto(Path(game_path).resolve().as_uri(), wait_until="load")
        page.wait_for_function("document.body.dataset.ready==='true'")
        page.evaluate("FWR.debug.externalClock=true")

        def package_boot():
            assert page.evaluate("FWR.debug.identity") == BUILD
            assert not errors, errors
            assert page.evaluate("FWR.debug.snapshot().errors") == []
            assert not [u for u in requests if u.startswith(("http:", "https:"))], (
                requests
            )

        check(
            "file artifact boots without fetched dependencies or runtime errors",
            package_boot,
        )

        def operation():
            result = page.evaluate("""() => {
              const d=FWR.debug;d.start('operation',1982);
              for(let i=0;i<120000&&!d.snapshot().outcome;i++){
                d.inject('local-1',d.botIntent());d.advance(1/120);
              }
              d.release();return {state:d.snapshot(),world:d.world()};
            }""")
            state = result["state"]
            assert state["outcome"] and state["outcome"]["won"], state
            assert len(state["rescued"]) == 13 and not state["lost"], state
            assert not result["world"]["debugModified"]
            assert not result["world"]["dev"]["invulnerable"]
            assert state["screen"] == "results", state
            assert state["errors"] == [], state["errors"]
            (DEV / "artifacts/browser-operation.json").write_text(
                json.dumps(result, indent=2)
            )
            page.screenshot(path=str(DEV / "artifacts/results.png"))

        check(
            "exported HTML action-driven complete operation and real results", operation
        )

        def failure_retry():
            page.evaluate("""() => {
              const d=FWR.debug;d.start('operation',1982);
              d.fixture('ship',{hull:0});d.advance(.02);
            }""")
            state = page.evaluate("FWR.debug.snapshot()")
            assert state["screen"] == "failure" and not state["outcome"]["won"], state
            page.get_by_role("button", name="Retry checkpoint", exact=True).click()
            page.evaluate("FWR.debug.advance(.05)")
            state = page.evaluate("FWR.debug.snapshot()")
            assert state["screen"] is None and state["ship"]["hull"] == 3, state
            assert state["score"] == 0 and len(state["rescued"]) == 0, state

        check(
            "final artifact failure and checkpoint retry restore baseline",
            failure_retry,
        )

        def dev_tools():
            page.evaluate("FWR.debug.action('pause')")
            page.get_by_role("button", name="Developer tools", exact=True).click()
            before = page.evaluate("FWR.debug.snapshot().tick")
            page.get_by_role(
                "button", name="Advance one simulation step", exact=True
            ).click()
            assert page.evaluate("FWR.debug.snapshot().tick") == before + 1
            page.get_by_role("button", name="Flight variables", exact=True).click()
            slider = page.locator('input[type="range"]').first
            slider.evaluate(
                "e=>{e.value='300';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}"
            )
            assert page.evaluate("FWR.debug.snapshot().config.shipSpeed") == 300
            page.get_by_role(
                "button", name="Reset shipped defaults", exact=True
            ).click()
            assert page.evaluate("FWR.debug.snapshot().config.shipSpeed") == 220
            assert page.evaluate("FWR.debug.world().debugModified") is True
            page.screenshot(path=str(DEV / "artifacts/developer-tools.png"))

        check(
            "pause tools step, live slider and authored reset affect same World",
            dev_tools,
        )

        def audio():
            evidence = page.evaluate("""async () => {
              const C=window.OfflineAudioContext||window.webkitOfflineAudioContext;
              const ctx=new C(2,44100*2,44100);
              const fixture=FWR.Audio.renderFixture(ctx);
              const buffer=await ctx.startRendering();
              let peak=0,sum=0,finite=true;
              for(let c=0;c<buffer.numberOfChannels;c++)for(const v of buffer.getChannelData(c)){
                finite=finite&&Number.isFinite(v);peak=Math.max(peak,Math.abs(v));sum+=v*v;
              }
              return {...fixture,finite,peak,rms:Math.sqrt(sum/(buffer.length*buffer.numberOfChannels))};
            }""")
            assert evidence and isinstance(evidence, dict), evidence
            (DEV / "artifacts/audio-final-offline.json").write_text(
                json.dumps(evidence, indent=2)
            )
            # renderFixture returns measurements after rendering its own representative phrases.
            assert evidence.get("finite", True), evidence
            assert evidence.get("peak", 0) > 0, evidence
            assert evidence.get("peak", 2) <= 1.0, evidence
            assert evidence.get("rms", 0) > 0, evidence
            page.evaluate("FWR.debug.ui.hide();FWR.debug.action('resume')")
            page.mouse.click(1100, 600)
            page.wait_for_timeout(500)
            page.evaluate(
                "FWR.debug.audio.init();FWR.debug.audio.pause(false);FWR.debug.audio.update(FWR.debug.net.world||FWR.debug.world(),.1)"
            )
            page.wait_for_timeout(350)
            metrics = page.evaluate("FWR.debug.audio.metrics()")
            assert metrics["musicGain"] == 0.1, metrics
            assert metrics.get("unlocked", True), metrics
            page.evaluate("FWR.debug.audio.pause(true)")
            paused = page.evaluate("FWR.debug.audio.metrics()")
            assert paused.get("activeNodes", paused.get("nodes", 0)) == 0, paused
            page.evaluate("FWR.debug.audio.stop()")
            stopped = page.evaluate("FWR.debug.audio.metrics()")
            assert stopped.get("activeNodes", stopped.get("nodes", 0)) == 0, stopped

        check(
            "synthesized audio renders finite non-silent bounded phrases at 10 percent music",
            audio,
        )

        def clean():
            assert not errors, errors
            assert page.evaluate("FWR.debug.snapshot().errors") == []
            assert not [u for u in requests if u.startswith(("http:", "https:"))], (
                requests
            )

        check("all browser flight/tools/audio paths remain free of errors", clean)
        context.close()
        browser.close()
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("game")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    checks = run_checks(args.game)
    if args.json:
        print(json.dumps(checks))
    else:
        for item in checks:
            if not item["pass"]:
                print("FAIL " + item["name"] + ": " + item.get("detail", ""))
        print(
            f"{sum(x['pass'] for x in checks)}/{len(checks)} artifact browser checks passed"
        )
    raise SystemExit(0 if all(item["pass"] for item in checks) else 1)
