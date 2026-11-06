#!/usr/bin/env python3
"""One-command headless checks; output is failures and a final count only.
Run: /home/micha/.local/share/pipx/venvs/playwright/bin/python test.py
"""

from __future__ import annotations

import functools
import http.server
import json
import re
import sys
import threading
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
CHECKS: list[dict] = []
ERRORS: list[str] = []
HUB_REPORTS: dict = {}
CONSOLE_ERRORS: list[str] = []


def check(name, passed, detail=""):
    item = {"name": name, "pass": bool(passed), "detail": str(detail)}
    CHECKS.append(item)
    if not passed:
        print(f"FAIL {name}: {detail}", flush=True)
    return bool(passed)


def group(name, fn):
    if "--recovery-only" in sys.argv and name not in {
        "bootstrap",
        "attract mode",
        "keyboard mouse and audio",
        "controller-first menus",
        "graphics device recovery",
    }:
        return
    try:
        fn()
    except Exception as exc:  # noqa: BLE001 - report failed test groups and preserve remaining checks
        check(name, False, str(exc).splitlines()[0])


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


GAMEPAD_STUB = """(() => {
  const buttons=Array.from({length:17},()=>({pressed:false,touched:false,value:0}));
  const pad={id:'DualSense Wireless Controller (STANDARD GAMEPAD)',index:0,
    connected:true,mapping:'standard',axes:[0,0,0,0],buttons,timestamp:0};
  window.__testPad=pad;
  Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>{
    pad.timestamp=performance.now();return [pad,null,null,null];
  }});
})();"""


def install_error_capture(page):
    page.on(
        "pageerror",
        lambda error: ERRORS.append(f"{page.url}: {error!s} {error.stack or ''}"),
    )
    page.on(
        "console",
        lambda message: (
            CONSOLE_ERRORS.append(f"{page.url}: {message.text}")
            if message.type == "error"
            else None
        ),
    )
    page.add_init_script("""(() => {
      window.__testErrorEvents=[];
      addEventListener('error',e=>__testErrorEvents.push({type:'error',message:e.message,stack:e.error?.stack||'',file:e.filename,line:e.lineno}));
      addEventListener('unhandledrejection',e=>__testErrorEvents.push({type:'rejection',message:String(e.reason?.message||e.reason),stack:e.reason?.stack||''}));
    })();""")
    page.on(
        "dialog",
        lambda dialog: (ERRORS.append(f"dialog: {dialog.message}"), dialog.dismiss()),
    )


def loaded(page, url):
    install_error_capture(page)
    page.goto(url, wait_until="domcontentloaded", timeout=90000)
    page.wait_for_function("window.__game?.ready === true", timeout=90000)
    check(
        "page identifies Solaris Detour", "Solaris Detour" in page.title(), page.title()
    )


def state(page):
    return page.evaluate("window.__game.state()")


def diagnostics(page):
    return page.evaluate("window.__game.diagnostics()")


def action(page, name):
    locator = page.locator(f'[data-action="{name}"]:visible').first
    if locator.count():
        locator.click()
        return
    fallback = {
        "start": r"launch patrol|launch|start patrol|begin patrol|play solo|start game",
        "settings": r"settings|options",
        "dev": r"developer|dev mode|flight lab",
        "resume": r"resume|return to flight",
        "back": r"back|close|return",
        "about": r"about|credits",
    }
    page.get_by_role(
        "button", name=re.compile(fallback.get(name, name), re.IGNORECASE)
    ).first.click()


def main():
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}"
    url = base + "/game.html"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                    "--disable-dev-shm-usage",
                    "--autoplay-policy=no-user-gesture-required",
                ],
            )
            context = browser.new_context(viewport={"width": 1600, "height": 900})
            page = context.new_page()

            def bootstrap():
                loaded(page, url)
                d = diagnostics(page)
                check("Three.js r180", str(d.get("version")) == "180", d.get("version"))
                check(
                    "WebGPU rendering backend",
                    d.get("backend") == "WebGPU",
                    d.get("backend"),
                )
                check(
                    "Rapier 0.19.3 physics",
                    "0.19.3" in d.get("physics", ""),
                    d.get("physics"),
                )
                check(
                    "native animation clips",
                    len(d.get("animations", [])) >= 3,
                    d.get("animations"),
                )
                check(
                    "music defaults to ten percent",
                    d.get("audio", {}).get("musicVolume") == 0.1,
                    d.get("audio"),
                )
                check(
                    "title state",
                    state(page).get("mode") == "title",
                    state(page).get("mode"),
                )

            group("bootstrap", bootstrap)

            def attract():
                page.wait_for_function(
                    "window.__game.state().attract === true", timeout=15000
                )
                check("ten-second attract playback", state(page).get("attract") is True)
                page.keyboard.press("ArrowLeft")
                page.wait_for_function(
                    "window.__game.state().attract === false", timeout=3000
                )
                check(
                    "input exits attract playback",
                    state(page).get("mode") == "title",
                    state(page).get("mode"),
                )

            group("attract mode", attract)

            def controls_and_audio():
                action(page, "start")
                page.wait_for_function(
                    "window.__game.state().mode !== 'title'", timeout=3000
                )
                check(
                    "launch opens galactic scanner",
                    state(page).get("mode") == "map",
                    state(page).get("mode"),
                )
                page.locator('[data-sector="0"]').focus()
                page.keyboard.press("Enter")
                page.wait_for_function(
                    "window.__game.state().mode === 'warp'", timeout=5000
                )
                check(
                    "scanner node confirm starts hyperwarp",
                    state(page).get("mode") == "warp",
                )
                page.evaluate("window.__game.advance(3.6,false)")
                check(
                    "warp enters live sector",
                    state(page).get("mode") == "flight",
                    state(page).get("mode"),
                )
                before = state(page)["player"]["x"]
                page.keyboard.down("KeyD")
                page.wait_for_timeout(450)
                page.keyboard.up("KeyD")
                check("WASD steers ship", state(page)["player"]["x"] > before + 0.2)
                page.mouse.move(1050, 330)
                page.mouse.down()
                page.wait_for_timeout(250)
                page.mouse.up()
                page.keyboard.down("KeyE")
                page.wait_for_timeout(90)
                page.keyboard.up("KeyE")
                check("nova pulse responds", state(page).get("usedPulse", 0) >= 1)
                level = 0
                for _ in range(8):
                    page.wait_for_timeout(150)
                    level = max(level, diagnostics(page).get("audio", {}).get("rms", 0))
                d = diagnostics(page).get("audio", {})
                check(
                    "procedural audio context running", d.get("context") == "running", d
                )
                check("procedural audio produces signal", level > 0.00001, level)
                check(
                    "coded music and gibberish voices scheduled",
                    d.get("notes", 0) > 0 and d.get("voices", 0) > 0,
                    d,
                )

            group("keyboard mouse and audio", controls_and_audio)

            def menus():
                page.keyboard.press("Escape")
                action(page, "settings")
                check(
                    "settings screen exposes controls",
                    page.locator('input[type="range"]').count() > 0,
                )
                action(page, "back")
                action(page, "dev")
                sliders = page.locator('input[type="range"]:visible')
                check(
                    "developer live balance sliders",
                    sliders.count() >= 5,
                    sliders.count(),
                )
                setting = page.locator('[data-setting="speed"]')
                if setting.count():
                    setting.evaluate(
                        "e=>{e.value='15';e.dispatchEvent(new Event('input',{bubbles:true}));}"
                    )
                    check(
                        "balance slider updates simulation",
                        diagnostics(page)["settings"]["speed"] == 15,
                    )
                else:
                    check(
                        "speed balance slider identified",
                        False,
                        "missing data-setting=speed",
                    )
                reset = page.get_by_role(
                    "button",
                    name=re.compile(
                        "reset balance|reset.*default|restore.*default", re.IGNORECASE
                    ),
                )
                if reset.count():
                    reset.first.click()
                    check(
                        "developer reset restores defaults",
                        diagnostics(page)["settings"]["speed"] == 11,
                    )
                else:
                    check("developer reset button", False, "missing reset defaults")
                action(page, "back")
                action(page, "resume")
                check(
                    "resume retains campaign",
                    state(page).get("mode") == "flight",
                    state(page).get("mode"),
                )

            group("controller-first menus", menus)

            def renderer_recovery():
                page.keyboard.press("Escape")
                before = state(page)
                fields = [
                    "player",
                    "sector",
                    "hull",
                    "fuel",
                    "lives",
                    "score",
                    "cleared",
                    "kills",
                    "key",
                    "rescued",
                    "pioneers",
                ]
                prior_diagnostics = diagnostics(page)
                attempt = page.evaluate("""async () => {
                  try {await window.__game.dev.recoverGraphics();return {ok:true};}
                  catch(error) {return {ok:false,error:String(error),stack:error.stack||''};}
                }""")
                d = diagnostics(page)
                check(
                    "graphics recovery request completes",
                    attempt.get("ok"),
                    {
                        "attempt": attempt,
                        "before": {
                            k: prior_diagnostics.get(k)
                            for k in [
                                "backend",
                                "recoveryCount",
                                "recoveryReason",
                                "error",
                            ]
                        },
                        "after": {
                            k: d.get(k)
                            for k in [
                                "backend",
                                "recoveryCount",
                                "recoveryReason",
                                "error",
                            ]
                        },
                    },
                )
                if not attempt.get("ok"):
                    return
                check(
                    "graphics recovery selects WebGL 2",
                    "WebGL" in d.get("backend", ""),
                    d.get("backend"),
                )
                check(
                    "graphics recovery is recorded",
                    d.get("recoveryCount", 0) >= 1,
                    d.get("recoveryCount"),
                )
                after = state(page)
                check(
                    "graphics recovery preserves gameplay state",
                    all(before.get(k) == after.get(k) for k in fields),
                )
                count = d.get("recoveryCount")
                page.evaluate(
                    "async()=>{await window.__game.dev.recoverGraphics();return true}"
                )
                check(
                    "graphics recovery is idempotent",
                    diagnostics(page).get("recoveryCount") == count,
                )
                action(page, "resume")
                before_x = state(page)["player"]["x"]
                page.keyboard.down("KeyA")
                page.wait_for_function(
                    "x=>window.__game.state().player.x < x - 0.25",
                    arg=before_x,
                    timeout=5000,
                )
                page.keyboard.up("KeyA")
                check(
                    "controls survive graphics recovery",
                    state(page)["player"]["x"] < before_x - 0.25,
                )

            group("graphics device recovery", renderer_recovery)

            def campaign_playthrough():
                page.evaluate("window.__game.dev.god(true);window.__game.start()")
                observed = set()
                for _ in range(70):
                    page.evaluate("window.__game.advance(12,true)")
                    s = state(page)
                    observed.add(s.get("sector"))
                    if s.get("victory") or s.get("mode") in ("victory", "gameover"):
                        break
                s = state(page)
                d = diagnostics(page)
                events = d.get("events", [])
                kinds = [event["type"] for event in events]
                check(
                    "complete scripted campaign",
                    s.get("victory") is True,
                    {
                        "mode": s.get("mode"),
                        "sector": s.get("sector"),
                        "time": s.get("time"),
                    },
                )
                check(
                    "all six sectors completed",
                    sorted(s.get("cleared", [])) == list(range(6)),
                    s.get("cleared"),
                )
                check(
                    "cadets and pioneers rescued through collisions",
                    kinds.count("rescue") >= 11,
                    kinds.count("rescue"),
                )
                for kind in [
                    "key",
                    "gate",
                    "dock",
                    "boss-phase",
                    "boss-defeated",
                    "victory",
                ]:
                    check(f"campaign mechanic: {kind}", kind in kinds, kinds)
                check("nova pulse used in combat", s.get("usedPulse", 0) > 0)
                check(
                    "campaign score awarded", s.get("score", 0) >= 30000, s.get("score")
                )
                check(
                    "Rapier world remains valid",
                    d.get("bodies", 0) >= 2,
                    d.get("bodies"),
                )

            group("whole-game playthrough", campaign_playthrough)
            page.close()
            context.close()

            def gamepad():
                ctx = browser.new_context(viewport={"width": 1280, "height": 720})
                ctx.add_init_script(GAMEPAD_STUB)
                padpage = ctx.new_page()
                try:
                    loaded(padpage, url)
                    padpage.evaluate(
                        "window.__testPad.buttons[0]={pressed:true,touched:true,value:1}"
                    )
                    padpage.wait_for_function(
                        "window.__game.state().mode !== 'title'", timeout=6000
                    )
                    padpage.evaluate(
                        "window.__testPad.buttons[0]={pressed:false,touched:false,value:0}"
                    )
                    check(
                        "standard gamepad launches from title",
                        state(padpage).get("mode") != "title",
                        state(padpage).get("mode"),
                    )
                    padpage.evaluate(
                        "window.__game.start();window.__game.travel(0);window.__game.advance(3.6,false)"
                    )
                    x = state(padpage)["player"]["x"]
                    padpage.evaluate("window.__testPad.axes[0]=0.9")
                    padpage.wait_for_function(
                        "x=>window.__game.state().player.x > x + 0.25",
                        arg=x,
                        timeout=6000,
                    )
                    padpage.evaluate("window.__testPad.axes[0]=0")
                    check(
                        "standard gamepad axis steers",
                        state(padpage)["player"]["x"] > x + 0.25,
                    )
                    padpage.evaluate(
                        "window.__testPad.buttons[9]={pressed:true,touched:true,value:1}"
                    )
                    padpage.locator('[data-action="resume"]:visible').wait_for(
                        timeout=6000
                    )
                    padpage.evaluate(
                        "window.__testPad.buttons[9]={pressed:false,touched:false,value:0}"
                    )
                    check(
                        "Options opens pause menu",
                        padpage.get_by_role(
                            "button", name=re.compile("resume", re.IGNORECASE)
                        ).count()
                        > 0,
                    )
                finally:
                    ctx.close()

            group("emulated DualSense", gamepad)

            def touch():
                ctx = browser.new_context(**p.devices["iPhone 13"])
                touchpage = ctx.new_page()
                try:
                    loaded(touchpage, url)
                    action(touchpage, "start")
                    touchpage.evaluate(
                        "window.__game.travel(1);window.__game.advance(3.6,false)"
                    )
                    before = state(touchpage)["player"]["x"]
                    session = ctx.new_cdp_session(touchpage)
                    session.send(
                        "Input.dispatchTouchEvent",
                        {"type": "touchStart", "touchPoints": [{"x": 85, "y": 600}]},
                    )
                    session.send(
                        "Input.dispatchTouchEvent",
                        {"type": "touchMove", "touchPoints": [{"x": 145, "y": 600}]},
                    )
                    touchpage.wait_for_timeout(450)
                    session.send(
                        "Input.dispatchTouchEvent",
                        {"type": "touchEnd", "touchPoints": []},
                    )
                    check(
                        "invisible touch stick steers",
                        abs(state(touchpage)["player"]["x"] - before) > 0.1,
                    )
                    check(
                        "touch game fills viewport",
                        touchpage.evaluate(
                            "document.documentElement.scrollWidth <= innerWidth + 1"
                        ),
                    )
                    check(
                        "touch context has assistance",
                        touchpage.evaluate("navigator.maxTouchPoints > 0"),
                    )
                finally:
                    ctx.close()

            group("touch-only controls", touch)

            def standalone_network():
                ctx = browser.new_context(viewport={"width": 1000, "height": 650})
                host, guest = ctx.new_page(), ctx.new_page()
                try:
                    loaded(host, url)
                    loaded(guest, url)
                    action(host, "coop")
                    action(guest, "coop")
                    host.evaluate("window.__game.host()")
                    code = host.evaluate("window.__game.network().code")
                    guest.evaluate("code=>window.__game.join(code)", code)
                    host.wait_for_function(
                        "window.__game.network().connected", timeout=10000
                    )
                    guest.wait_for_function(
                        "window.__game.network().connected", timeout=10000
                    )
                    check(
                        "standalone room links two copies",
                        len(host.evaluate("window.__game.network().players")) == 2,
                    )
                    host.evaluate("window.__game.start();window.__game.travel(0)")
                    guest.wait_for_function(
                        "window.__game.state().mode === 'warp'", timeout=5000
                    )
                    check(
                        "guest lobby closes on captain launch",
                        guest.locator("#coopScreen.active").count() == 0,
                    )
                    check(
                        "guest follows host world",
                        state(guest).get("sector") == state(host).get("sector"),
                    )
                    host.evaluate("window.__game.advance(3.6,false)")
                    guest.wait_for_function(
                        "window.__game.state().mode === 'flight'", timeout=5000
                    )
                    guest.keyboard.press("KeyM")
                    guest.locator("#mapScreen.active").wait_for(timeout=4000)
                    check(
                        "wingmate scanner is a local overlay",
                        state(host).get("mode") == "flight"
                        and state(guest).get("mode") == "flight",
                    )
                    guest.keyboard.press("Escape")
                    guest.wait_for_function(
                        "!document.querySelector('#mapScreen.active')", timeout=4000
                    )
                    check(
                        "wingmate can close scanner",
                        state(guest).get("mode") == "flight",
                    )
                    wing_before = state(host)["ally"]["x"]
                    hero_before = state(host)["player"]["x"]
                    guest.keyboard.down("KeyD")
                    guest.wait_for_timeout(650)
                    guest.keyboard.up("KeyD")
                    guest.wait_for_timeout(150)
                    check(
                        "guest input moves host-authoritative wingmate",
                        state(host)["ally"]["x"] > wing_before + 0.5,
                    )
                    check(
                        "guest input leaves captain steering independent",
                        abs(state(host)["player"]["x"] - hero_before) < 0.2,
                    )
                    check(
                        "wingmate receives shared hull state",
                        abs(state(host)["hull"] - state(guest)["hull"]) < 0.1,
                    )
                    effects_before = (
                        diagnostics(guest).get("audio", {}).get("effects", 0)
                    )
                    host.keyboard.down("Space")
                    guest.wait_for_function(
                        "n=>window.__game.audio().effects > n",
                        arg=effects_before,
                        timeout=5000,
                    )
                    host.keyboard.up("Space")
                    check(
                        "wingmate hears replicated combat effects",
                        diagnostics(guest).get("audio", {}).get("effects", 0)
                        > effects_before,
                    )
                    check(
                        "wingmate music follows shared sector",
                        diagnostics(guest).get("audio", {}).get("scene")
                        == diagnostics(host).get("audio", {}).get("scene"),
                    )
                    guest.evaluate("window.__game.disconnect()")
                    host.wait_for_function(
                        "!window.__game.network().connected", timeout=4000
                    )
                    check(
                        "standalone disconnect recovers host",
                        host.evaluate("window.__game.network().isHost") is True,
                    )
                    guest.evaluate("code=>window.__game.join(code)", code)
                    host.wait_for_function(
                        "window.__game.network().connected", timeout=10000
                    )
                    guest.wait_for_function(
                        "window.__game.network().connected", timeout=10000
                    )
                    host.evaluate("window.__game.disconnect()")
                    guest.wait_for_function(
                        "!window.__game.network().connected", timeout=4000
                    )
                    check(
                        "captain loss returns guest to flight lobby",
                        guest.locator("#coopScreen.active").count() == 1,
                    )
                finally:
                    ctx.close()

            group("standalone co-op", standalone_network)

            for scenario in ["standard", "host-leave", "server"]:

                def hub_scenario(scenario=scenario):
                    ctx = browser.new_context(viewport={"width": 1600, "height": 1000})
                    hubpage = ctx.new_page()
                    install_error_capture(hubpage)
                    try:
                        query = urlencode(
                            {
                                "game": "game.html",
                                "players": 2,
                                "auto": 1,
                                "scenario": scenario,
                                "limit": 14,
                                "play": 2500,
                            }
                        )
                        hubpage.goto(
                            base + "/harness.html?" + query,
                            wait_until="domcontentloaded",
                            timeout=90000,
                        )
                        hubpage.wait_for_function(
                            "document.body.dataset.complete === 'true'", timeout=90000
                        )
                        report = hubpage.evaluate("window.__hubCheck")
                        post_end_results = []
                        for frame in hubpage.frames:
                            if frame == hubpage.main_frame:
                                continue
                            result = frame.evaluate("""async () => {
                              if (!window.__game?.ready) return null;
                              const before=JSON.stringify(window.__game.state());
                              document.dispatchEvent(new KeyboardEvent('keydown',{key:'m',code:'KeyM',bubbles:true}));
                              document.dispatchEvent(new KeyboardEvent('keyup',{key:'m',code:'KeyM',bubbles:true}));
                              const keyboardUnchanged=before===JSON.stringify(window.__game.state());
                              const pad={id:'DualSense test',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},(_,i)=>({pressed:i===3,touched:i===3,value:i===3?1:0}))};
                              Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});
                              await new Promise(resolve=>setTimeout(resolve,450));
                              const gamepadUnchanged=before===JSON.stringify(window.__game.state());
                              pad.buttons[3]={pressed:false,touched:false,value:0};
                              return {keyboardUnchanged,gamepadUnchanged};
                            }""")
                            if result:
                                post_end_results.append(result)
                        check(
                            f"Hub {scenario}: M cannot change ended world",
                            bool(post_end_results)
                            and all(x["keyboardUnchanged"] for x in post_end_results),
                            post_end_results,
                        )
                        check(
                            f"Hub {scenario}: Triangle cannot change ended world",
                            bool(post_end_results)
                            and all(x["gamepadUnchanged"] for x in post_end_results),
                            post_end_results,
                        )
                        report["frames"] = []
                        for frame in hubpage.frames:
                            if frame == hubpage.main_frame:
                                continue
                            try:
                                info = frame.evaluate("""() => {
                                  let diagnostics=null;
                                  try {diagnostics=window.__game?.diagnostics();} catch(error) {diagnostics={error:String(error)};}
                                  return {url:location.href,ready:window.__game?.ready,
                                    loadMessage:document.querySelector('#loadMessage')?.textContent,
                                    errors:window.__testErrorEvents||[],diagnostics};
                                }""")
                                report["frames"].append(info)
                            except Exception as exc:  # noqa: BLE001 - preserve dead-frame diagnostics
                                report["frames"].append({"error": str(exc)})
                        HUB_REPORTS[scenario] = report
                        for item in report.get("checks", []):
                            check(
                                f"Hub {scenario}: {item['name']}",
                                item["pass"],
                                item.get("detail", ""),
                            )
                        check(
                            f"Hub {scenario} conformance",
                            report.get("pass"),
                            "; ".join(
                                c["name"]
                                for c in report.get("checks", [])
                                if not c["pass"]
                            ),
                        )
                    finally:
                        ctx.close()

                group(f"Hub {scenario}", hub_scenario)

            def capture_visuals():
                ctx = browser.new_context(viewport={"width": 1600, "height": 900})
                visual = ctx.new_page()
                try:
                    loaded(visual, url + "?renderer=webgl")
                    for name, setup in [
                        ("title", ""),
                        ("map", "window.__game.dev.god(true);window.__game.start()"),
                        (
                            "surface",
                            "window.__game.travel(1);window.__game.advance(5,false)",
                        ),
                        (
                            "corridor",
                            "window.__game.travel(3);window.__game.advance(5,false)",
                        ),
                    ]:
                        if setup:
                            visual.evaluate(setup)
                        visual.wait_for_timeout(700)
                        target = ROOT / (name + ".png")
                        visual.screenshot(path=str(target))
                        check("visual capture: " + name, target.stat().st_size > 10000)
                    visual.keyboard.press("Escape")
                    action(visual, "dev")
                    visual.locator('[data-dev-sector="5"]').click()
                    visual.evaluate("window.__game.advance(5,false)")
                    visual.wait_for_timeout(700)
                    check(
                        "boss phase and shield readout",
                        visual.locator("#bossHud").is_visible()
                        and "PHASE" in visual.locator("#bossStatus").inner_text(),
                    )
                    target = ROOT / "boss.png"
                    visual.screenshot(path=str(target))
                    check("visual capture: boss", target.stat().st_size > 10000)
                finally:
                    ctx.close()

            group("visual composition captures", capture_visuals)

            def file_package_smoke():
                ctx = browser.new_context(viewport={"width": 1280, "height": 720})
                filepage = ctx.new_page()
                try:
                    loaded(filepage, (ROOT / "game.html").as_uri())
                    check(
                        "file package opens at title",
                        state(filepage).get("mode") == "title",
                    )
                    check(
                        "file package initializes physics",
                        "0.19.3" in diagnostics(filepage).get("physics", ""),
                    )
                finally:
                    ctx.close()

            group("file package smoke", file_package_smoke)

            check(
                "no uncaught JavaScript errors or dialogs",
                not ERRORS,
                " | ".join(dict.fromkeys(ERRORS))[:1200],
            )
            browser.close()
    except Exception as exc:  # noqa: BLE001 - report failed test groups and preserve remaining checks
        check("test runner completed", False, str(exc).splitlines()[0])
    finally:
        server.shutdown()
        server.server_close()
        passed = sum(item["pass"] for item in CHECKS)
        report = {
            "passed": passed,
            "failed": len(CHECKS) - passed,
            "total": len(CHECKS),
            "checks": CHECKS,
            "javascriptErrors": ERRORS,
            "consoleErrors": CONSOLE_ERRORS,
            "hub": HUB_REPORTS,
        }
        (ROOT / "test-report.json").write_text(json.dumps(report, indent=2))
        print(
            f"{passed}/{len(CHECKS)} checks passed; {len(CHECKS) - passed} failures",
            flush=True,
        )
    return 0 if all(item["pass"] for item in CHECKS) else 1


if __name__ == "__main__":
    raise SystemExit(main())
