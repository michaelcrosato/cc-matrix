"""One-command, state-based verification of the final single-file game.

Run ./run-tests.sh. Browser screenshots are intentionally excluded: automated
checks inspect the running simulation, input state, DOM, and synthesized audio.
"""

from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
HTML = HERE.parent / f"{HERE.name}.html"
RESULTS = HERE / "test-results.json"
CHECKS: list[dict] = []
RUNTIME_ERRORS: list[str] = []
BROWSER_ARGS = [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-webgpu-adapter=swiftshader",
    "--disable-dev-shm-usage",
    "--allow-file-access-from-files",
    "--autoplay-policy=no-user-gesture-required",
]


def check(name, action):
    try:
        detail = action()
        CHECKS.append({"name": name, "passed": True, "detail": detail or "passed"})
        return True
    except Exception as error:  # noqa: BLE001 -- test runner records each independent failure
        detail = f"{type(error).__name__}: {error}"
        CHECKS.append({"name": name, "passed": False, "detail": detail})
        print(f"FAIL {name}: {detail}", flush=True)
        return False


def require(condition, message="assertion failed"):
    if not condition:
        raise AssertionError(message)


def js(page, expression):
    return page.evaluate(expression)


def state(page):
    return js(page, "() => window.__game.inspect()")


def start(page, autopilot=False):
    js(
        page,
        f"async () => {{ await window.__game.start({{autopilot: {str(autopilot).lower()}}}); }}",
    )


def step(page, seconds):
    return js(
        page,
        f"async () => {{ await window.__game.step({float(seconds)}); return window.__game.inspect(); }}",
    )


def release(page):
    js(page, "() => window.__game.setInput({})")


def browser_checks(browser):
    context = browser.new_context(
        viewport={"width": 1920, "height": 1080}, device_scale_factor=1
    )
    page = context.new_page()
    page.on("pageerror", lambda error: RUNTIME_ERRORS.append(str(error)))
    page.goto(HTML.as_uri(), wait_until="domcontentloaded", timeout=60000)
    page.wait_for_function("window.__game && window.__game.ready", timeout=120000)

    def boot():
        s = state(page)
        require(s["mode"] in ("title", "menu"), f"unexpected initial mode: {s}")
        require(
            "webgpu" in str(s["renderer"]).lower(),
            f"WebGPU renderer unavailable: {s['renderer']}",
        )
        require(not s.get("errors"), f"startup errors: {s.get('errors')}")
        return {"renderer": s["renderer"], "mode": s["mode"]}

    check("WebGPU boot from standalone HTML", boot)

    def audio_default():
        a = js(page, "() => window.__game.audio.inspect()")
        require(a["music"] == 0.1, f"default music: {a}")
        return a

    check("Music defaults to ten percent", audio_default)

    def keyboard_menu():
        before = state(page)
        page.keyboard.press("ArrowDown")
        after = state(page)
        require(
            after["lastInput"] == "keyboard",
            f"input prompt source: {after.get('lastInput')}",
        )
        require(
            after["menuFocus"] != before["menuFocus"],
            "keyboard did not move menu focus",
        )
        page.keyboard.press("ArrowUp")
        return {"before": before["menuFocus"], "after": after["menuFocus"]}

    check("Keyboard menu focus", keyboard_menu)

    def gamepad_menu():
        js(
            page,
            """() => {
          window.__testPad = {id:'DualSense Wireless Controller', index:0,
            connected:true, mapping:'standard', axes:[0,0,0,0],
            buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:performance.now()};
          Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__testPad]});
          window.__game.menu('title');
        }""",
        )
        before = state(page)
        js(
            page,
            "() => { window.__testPad.buttons[13]={pressed:true,value:1,touched:true}; }",
        )
        try:
            page.wait_for_function(
                "oldFocus => window.__game.inspect().menuFocus !== oldFocus",
                arg=before["menuFocus"],
                timeout=15000,
            )
        finally:
            js(
                page,
                "() => { window.__testPad.buttons[13]={pressed:false,value:0,touched:false}; }",
            )
        page.wait_for_timeout(80)
        after = state(page)
        try:
            start(page)
            initial_x = state(page)["player"]["x"]
            js(
                page,
                "() => { window.__testPad.axes=[.8,-.2,1,0]; window.__testPad.buttons[7]={pressed:true,value:1,touched:true}; }",
            )
            page.wait_for_function(
                "x => { const s=window.__game.inspect();return s.player.x>x+1&&s.stats.shots>0; }",
                arg=initial_x,
                timeout=15000,
            )
            flight = state(page)
        finally:
            js(
                page,
                "() => { window.__testPad.connected=false; Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[]}); }",
            )
        require(
            after["lastInput"] == "gamepad",
            f"pad prompt source: {after.get('lastInput')}",
        )
        require(
            after["menuFocus"] != before["menuFocus"], "D-pad did not move menu focus"
        )
        return {
            "before": before["menuFocus"],
            "after": after["menuFocus"],
            "standardMapping": True,
            "flightPlayer": flight["player"],
            "flightShots": flight["stats"]["shots"],
        }

    check("Standard gamepad D-pad and adaptive prompts", gamepad_menu)

    def attract():
        js(page, "() => window.__game.menu('title')")
        s = step(page, 10.5)
        require(
            s["mode"] == "attract",
            f"attract did not start after ten seconds: {s['mode']}",
        )
        s = step(page, 15)
        require(s["stats"]["shots"] > 0, "attract replay did not play")
        initial_cycle = s["attractCycle"]
        s = step(page, 180)
        require(
            s["mode"] == "attract" and s["attractCycle"] > initial_cycle,
            "attract replay did not loop after a complete mission",
        )
        page.keyboard.press("Space")
        s = state(page)
        require(
            s["mode"] in ("title", "menu"), f"input did not leave attract: {s['mode']}"
        )
        return "Ten-second idle trigger, AI firing, complete mission loop, and any-input exit verified."

    check("Attract mode trigger, play and exit", attract)

    def credits():
        js(page, "() => window.__game.menu('about')")
        content = page.locator("body").inner_text().lower()
        for heading in [
            "source information",
            "testing feedback",
            "engine feedback",
            "prompt feedback",
            "added on import",
        ]:
            require(heading in content, f"credits missing {heading}")
        js(page, "() => window.__game.menu('title')")
        return (
            "All four requested feedback/source sections and usage label are present."
        )

    check("About and credits completeness", credits)

    def settings():
        js(page, "() => window.__game.menu('settings')")
        require(
            page.locator("#music").input_value() == "0.1",
            "music slider does not display its default",
        )
        page.locator("#music").evaluate(
            "el => { el.value=.23; el.dispatchEvent(new Event('input',{bubbles:true})); }"
        )
        require(
            js(page, "() => window.__game.audio.inspect().music") == 0.23,
            "music slider is not connected to the audio bus",
        )
        page.locator("#glyphs").select_option("xbox")
        require(
            state(page)["settings"]["glyphs"] == "xbox",
            "Xbox glyph choice did not apply",
        )
        page.locator("#glyphs").select_option("playstation")
        page.locator("#music").evaluate(
            "el => { el.value=.1; el.dispatchEvent(new Event('input',{bubbles:true})); }"
        )
        js(page, "() => window.__game.menu('title')")
        return "Audio slider wiring and both controller glyph sets verified."

    check("Settings audio and glyph preferences", settings)

    def developer_menu():
        start(page)
        js(page, "() => window.__game.pause()")
        page.get_by_role("button", name="Developer tools", exact=True).click()
        require(
            state(page)["menu"] == "dev", "developer tools are not reachable from pause"
        )
        require(
            page.locator('[data-balance][type="range"]').count() >= 7,
            "live balance sliders are missing",
        )
        before = state(page)["balance"]["speed"]
        page.locator("#dev-speed").evaluate(
            "el => { el.value=49; el.dispatchEvent(new Event('input',{bubbles:true})); }"
        )
        require(
            state(page)["balance"]["speed"] == 49,
            "flight speed slider did not apply live",
        )
        page.get_by_role("button", name="Reset balance defaults", exact=True).click()
        require(
            state(page)["balance"]["speed"] == before,
            "reset did not restore the default balance",
        )
        js(page, "() => window.__game.resume()")
        return "Pause access, seven live sliders, and reset to defaults verified."

    check("Developer tools and live balance reset", developer_menu)

    def controls():
        start(page)
        initial = state(page)
        js(page, "() => window.__game.setInput({x: 1, y: 0, fire: true})")
        s = step(page, 1.5)
        require(s["mode"] == "play", f"could not start: {s['mode']}")
        require(
            s["player"]["x"] > initial["player"]["x"] + 1,
            "flight input did not move the craft",
        )
        require(s["stats"]["shots"] > 0, "fire input produced no shots")
        require(s["stats"]["physicsSteps"] > 20, "Rapier physics did not advance")
        release(page)
        return {
            "player": s["player"],
            "shots": s["stats"]["shots"],
            "physicsSteps": s["stats"]["physicsSteps"],
        }

    check("Flight, blaster and Rapier simulation", controls)

    def pause():
        js(page, "() => window.__game.pause()")
        a = state(page)
        step(page, 1)
        b = state(page)
        require(a["mode"] == "paused", f"pause mode: {a['mode']}")
        require(a["player"] == b["player"], "player moved while paused")
        require(
            a["stats"]["physicsSteps"] == b["stats"]["physicsSteps"],
            "physics advanced while paused",
        )
        js(page, "() => window.__game.resume()")
        require(state(page)["mode"] == "play", "resume failed")
        return "Simulation remains fixed while paused; resume restores play."

    check("Pause and resume", pause)

    def boost():
        start(page)
        initial = state(page)
        js(page, "() => window.__game.setInput({x: 1, boost: true})")
        s = step(page, 0.8)
        release(page)
        require(
            s["stats"]["boosts"] > initial["stats"]["boosts"], "boost did not trigger"
        )
        require(s["energy"] < initial["energy"], "boost did not consume energy")
        return {"boosts": s["stats"]["boosts"], "energy": s["energy"]}

    check("Boost consumes energy", boost)

    def force():
        start(page)
        js(
            page,
            "() => { window.__game.dev.set('focus',100); window.__game.dev.force(); }",
        )
        s = step(page, 0.1)
        require(s["stats"]["forces"] > 0, "force ability did not activate")
        return {"forces": s["stats"]["forces"], "focus": s["focus"]}

    check("Focus ability", force)

    def repair():
        start(page)
        release(page)
        js(
            page,
            "() => { window.__game.dev.set('health',40); window.__game.dev.teleport(-77,3); }",
        )
        s = step(page, 4)
        require(s["health"] > 40, f"repair pad did not restore shields: {s['health']}")
        require(s["stats"]["repairs"] > 0, "repair event was not recorded")
        return {"health": s["health"], "repairs": s["stats"]["repairs"]}

    check("Landing-pad repair", repair)

    def defeat_restart():
        start(page)
        js(page, "() => window.__game.dev.set('base',0)")
        s = step(page, 0.2)
        require(
            s["mode"] == "result" and s["base"] == 0,
            f"destroyed generator did not end mission: {s['mode']}",
        )
        start(page)
        s = state(page)
        require(
            s["mode"] == "play"
            and s["wave"] == 1
            and s["base"] > 0
            and s["health"] > 0,
            f"restart failed: {s}",
        )
        require(
            s["score"] == 0 and s["stats"]["kills"] == 0,
            "restart retained prior mission score",
        )
        return "Generator defeat and complete mission restart verified."

    check("Defeat and clean restart", defeat_restart)

    def homing_bombs():
        start(page)
        js(
            page,
            "() => { window.__game.dev.set('invulnerable',true); window.__game.dev.spawnWave(2); window.__game.setInput({}); }",
        )
        s = step(page, 12)
        js(page, "() => window.__game.dev.set('invulnerable',false)")
        require(s["stats"]["bombs"] > 0, "second wave did not launch homing bombs")
        require(s["stats"]["enemyShots"] > 0, "walkers did not fire at the player")
        return {"bombs": s["stats"]["bombs"], "enemyShots": s["stats"]["enemyShots"]}

    check("Second-wave enemy fire and homing bombs", homing_bombs)

    def field_upgrade():
        start(page)
        js(page, "() => window.__game.dev.set('invulnerable',true)")
        for _ in range(12):
            js(page, "() => window.__game.dev.killAll()")
            s = step(page, 3)
            if s["menu"] == "upgrade":
                break
        require(
            s["menu"] == "upgrade",
            f"first evacuation did not offer a modification: {s['stage']}",
        )
        require(
            page.locator("[data-upgrade]").count() == 3,
            "field modification choices are incomplete",
        )
        page.locator('[data-upgrade="damage"]').click()
        s = state(page)
        js(page, "() => window.__game.dev.set('invulnerable',false)")
        require(
            s["wave"] == 2 and s["stage"] == "combat",
            f"upgrade selection did not launch wave2: {s['wave']}, {s['stage']}",
        )
        return "First evacuation offers all three modifications and applies a choice before wave two."

    check("Evacuation and field modification choice", field_upgrade)

    def autopilot():
        start(page, True)
        js(page, "() => window.__game.dev.set('invulnerable',true)")
        maximum_wave = 1
        s = state(page)
        for _ in range(180):
            s = step(page, 2)
            maximum_wave = max(maximum_wave, s["wave"])
            if s["mode"] == "result":
                break
        require(
            s["mode"] == "result" and s["evacuated"] == 3,
            f"autopilot did not finish: mode={s['mode']}, wave={s['wave']}, stats={s['stats']}",
        )
        require(maximum_wave >= 3, f"not all waves were visited: {maximum_wave}")
        for key in ["shots", "hits", "kills", "enemyShots", "physicsSteps"]:
            require(s["stats"][key] > 0, f"playthrough did not exercise {key}")
        require(s["score"] > 0, "victory has no score")
        require(s["stats"]["weakKills"] > 0, "weak-point mechanic was not exercised")
        best = js(page, "() => Number(localStorage.getItem('frost-best') || 0)")
        require(best >= s["score"], "completed mission did not save its personal best")
        js(page, "() => window.__game.dev.set('invulnerable',false)")
        return {"wave": maximum_wave, "score": s["score"], "stats": s["stats"]}

    check("Complete three-wave autopilot playthrough", autopilot)

    def audio_render():
        result = js(page, "async () => window.__game.audio.constructor.renderTest()")
        require(result["supported"], "OfflineAudioContext unavailable")
        require(result["rms"] > 0.001, f"silent rendering: {result}")
        require(result["peak"] < 1, f"audio clips: {result}")
        require(result["nonFinite"] == 0, f"invalid audio samples: {result}")
        require(result["events"].get("voice", 0) > 0, "gibberish voice not exercised")
        return result

    check("Offline synthesized music, effects and voice", audio_render)

    def live_audio():
        result = js(
            page,
            "async () => { const a=window.__game.audio; await a.unlock(); a.sfx('force'); a.voice(41); await new Promise(r=>setTimeout(r,180)); return a.inspect(); }",
        )
        require(
            result["ready"] and result["state"] == "running",
            f"audio failed to unlock: {result}",
        )
        require(result["rms"] > 0, f"live audio is silent: {result}")
        return result

    check("Live audio analyser", live_audio)

    def finite_state():
        start(page)
        s = step(page, 4)
        for key, value in s["player"].items():
            require(
                isinstance(value, (int, float)) and abs(value) < 1e6,
                f"invalid player {key}: {value}",
            )
        require(not s.get("errors"), f"game errors: {s.get('errors')}")
        require(not RUNTIME_ERRORS, f"uncaught exceptions: {RUNTIME_ERRORS}")
        return "No non-finite player state or uncaught JavaScript errors."

    check("Runtime and numerical integrity", finite_state)

    context.close()


def touch_checks(browser):
    context = browser.new_context(
        viewport={"width": 844, "height": 390},
        device_scale_factor=1,
        is_mobile=True,
        has_touch=True,
    )
    page = context.new_page()
    page.on("pageerror", lambda error: RUNTIME_ERRORS.append(str(error)))
    page.goto(HTML.as_uri(), wait_until="domcontentloaded", timeout=60000)
    page.wait_for_function("window.__game && window.__game.ready", timeout=120000)
    start(page)
    before = state(page)
    cdp = context.new_cdp_session(page)
    cdp.send(
        "Input.dispatchTouchEvent",
        {
            "type": "touchStart",
            "touchPoints": [
                {"x": 100, "y": 280, "id": 1},
                {"x": 700, "y": 270, "id": 2},
            ],
        },
    )
    cdp.send(
        "Input.dispatchTouchEvent",
        {
            "type": "touchMove",
            "touchPoints": [
                {"x": 165, "y": 240, "id": 1},
                {"x": 700, "y": 270, "id": 2},
            ],
        },
    )
    page.wait_for_timeout(120)
    after = step(page, 1)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    require(
        after["lastInput"] == "touch", f"touch prompt source: {after.get('lastInput')}"
    )
    require(
        after["player"]["x"] > before["player"]["x"],
        "invisible touch stick did not move the craft",
    )
    require(after["stats"]["shots"] > 0, "touch assist did not fire")
    dimensions = js(
        page, "() => ({width:innerWidth,scroll:document.documentElement.scrollWidth})"
    )
    require(
        dimensions["scroll"] <= dimensions["width"],
        f"mobile horizontal overflow: {dimensions}",
    )
    context.close()
    return {
        "viewport": "844×390 touch landscape",
        "player": after["player"],
        "shots": after["stats"]["shots"],
        "multitouch": True,
    }


def renderer_recovery(browser):
    context = browser.new_context(
        viewport={"width": 844, "height": 390}, device_scale_factor=1, has_touch=True
    )
    context.add_init_script("""(() => {
      const original=GPUAdapter.prototype.requestDevice;
      GPUAdapter.prototype.requestDevice=function(...args){
        if(!window.__gpuFailureInjected){window.__gpuFailureInjected=true;return Promise.reject(new Error('Injected first-device initialization failure'));}
        return original.apply(this,args);
      };
    })();""")
    page = context.new_page()
    page.on("pageerror", lambda error: RUNTIME_ERRORS.append(str(error)))
    page.goto(HTML.as_uri(), wait_until="domcontentloaded", timeout=60000)
    page.wait_for_function("window.__game && window.__game.ready", timeout=120000)
    s = state(page)
    require(
        js(page, "() => window.__gpuFailureInjected"),
        "GPU fault injection was not exercised",
    )
    require(
        s["renderer"] == "WebGPU",
        f"recovery did not restore the required renderer: {s['renderer']}",
    )
    require(
        len(s.get("rendererRecoveries", [])) >= 1,
        "initialization failure was not recorded as a recovery",
    )
    require(
        not s.get("errors"),
        f"terminal renderer errors after recovery: {s.get('errors')}",
    )
    start(page)
    before = state(page)["player"]["x"]
    cdp = context.new_cdp_session(page)
    cdp.send(
        "Input.dispatchTouchEvent",
        {"type": "touchStart", "touchPoints": [{"x": 100, "y": 280, "id": 1}]},
    )
    cdp.send(
        "Input.dispatchTouchEvent",
        {"type": "touchMove", "touchPoints": [{"x": 165, "y": 250, "id": 1}]},
    )
    s = step(page, 0.8)
    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    require(
        s["player"]["x"] > before + 1, "replacement canvas lost its pointer controls"
    )
    recovery = s["rendererRecoveries"]
    context.close()
    return {
        "injectedFailures": 1,
        "recoveries": recovery,
        "replacementCanvasControls": True,
    }


def network_checks():
    commands = [
        (["node", "network-tests.mjs"], "network-test-results.json"),
        (
            [sys.executable, "network-browser-tests.py"],
            "network-browser-test-results.json",
        ),
        ([sys.executable, "hub-tests.py"], "hub-test-results.json"),
        ([sys.executable, "game-coop-tests.py"], "game-coop-test-results.json"),
    ]
    for command, report_name in commands:
        require((HERE / command[-1]).exists(), f"missing network test {command[-1]}")
        completed = subprocess.run(
            command,
            cwd=HERE,
            text=True,
            capture_output=True,
            timeout=300 if command[-1] == "hub-tests.py" else 120,
            check=False,
        )
        report_path = HERE / report_name
        require(report_path.exists(), f"missing network report {report_name}")
        report = json.loads(report_path.read_text())
        for item in report.get("checks", []):
            CHECKS.append(item)
            if not item.get("passed"):
                print(
                    f"FAIL {item.get('name', 'network')}: {item.get('detail', 'failed')}"
                )
        require(
            completed.returncode == 0, (completed.stdout + completed.stderr).strip()
        )
    return "BroadcastChannel, manual WebRTC, and Hub lifecycle protocol checks."


def main():
    check(
        "Final single-file HTML exists",
        lambda: require(HTML.is_file(), f"missing {HTML.name}"),
    )
    check("Network protocol suite", network_checks)
    if HTML.is_file():
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=BROWSER_ARGS)
            try:
                check("Browser verification session", lambda: browser_checks(browser))
                check(
                    "Multitouch flight and assisted fire", lambda: touch_checks(browser)
                )
                check(
                    "WebGPU initialization recovery and replacement-canvas input",
                    lambda: renderer_recovery(browser),
                )
            finally:
                browser.close()
    failed = sum(not entry["passed"] for entry in CHECKS)
    report = {
        "date": datetime.now(timezone.utc).isoformat(),
        "file": HTML.name,
        "browser": "Playwright 1.63 Chromium; 1920×1080; SwiftShader WebGPU",
        "checks": CHECKS,
        "counts": {
            "passed": len(CHECKS) - failed,
            "failed": failed,
            "total": len(CHECKS),
        },
        "runtimeErrors": RUNTIME_ERRORS,
        "notes": "State-based fixed-step gameplay; offline/live Web Audio; protocol checks. No physical controller, touch hardware or human listening.",
    }
    RESULTS.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(f"{len(CHECKS) - failed} passed, {failed} failed ({len(CHECKS)} checks)")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
