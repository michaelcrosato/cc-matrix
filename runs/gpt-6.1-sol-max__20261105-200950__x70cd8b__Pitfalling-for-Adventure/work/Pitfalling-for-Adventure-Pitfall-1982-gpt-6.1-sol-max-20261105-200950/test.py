"""One entry point: python test.py [--case core|route|input|hub|visual]."""

import argparse
import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

D = Path(__file__).resolve().parent
ROOT = D.parent
BASE = json.loads((D / "title-selection.json").read_text())["base"]
checks = []


def check(name, condition, detail=""):
    checks.append(
        {
            "name": name,
            "pass": bool(condition),
            "detail": str(detail) if not condition else "",
        }
    )
    if not condition:
        print(f"FAIL {name}: {detail}", flush=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--case", default="all")
    args = parser.parse_args()
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{server.server_port}"
    url = origin + "/" + BASE + ".html?test=1"
    errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
                "--no-sandbox",
            ],
        )
        context = browser.new_context(viewport={"width": 1600, "height": 900})
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))

        def load(extra=""):
            page.goto(url + extra, wait_until="domcontentloaded")
            page.wait_for_function("window.__game || window.__bootError", timeout=90000)
            check(
                "page identity and boot",
                page.title() == "Pitfalling for Adventure"
                and page.evaluate("!!window.__game"),
                page.evaluate("window.__bootError || document.title"),
            )

        def state():
            return page.evaluate("__game.state()")

        def advance(n=1, x=0, y=0, jump=False):
            return page.evaluate(
                "a=>__game.advance(a.n,[a.c])",
                {"n": n, "c": {"x": x, "y": y, "jump": jump}},
            )

        def run_case(name, fn):
            if args.case in ("all", name):
                try:
                    fn()
                except Exception as error:  # noqa: BLE001 - report any failed browser case
                    check(name + " completed", False, str(error).splitlines()[0])

        def core():
            load()
            s = state()
            check(
                "pinned renderer and physics",
                s["three"] == "180"
                and s["rapier"] == "0.19.3"
                and s["backend"] == "WebGPU",
                s,
            )
            check("music defaults to ten percent", s["settings"]["music"] == 10)
            page.locator('[data-act="start"]:visible').click()
            advance(70)
            p = state()["players"][0]
            check("capsule rests on terrain", p["grounded"] and 0.70 < p["y"] < 0.85, p)
            advance(20, jump=True)
            p = state()["players"][0]
            check(
                "jump rises and native jump clip plays",
                p["y"] > 1.8 and p["anim"] == "jump",
                p,
            )
            advance(70)
            check(
                "jump lands", state()["players"][0]["grounded"], state()["players"][0]
            )
            advance(40, x=1)
            check(
                "horizontal controller moves",
                state()["players"][0]["x"] > 7,
                state()["players"][0],
            )
            page.evaluate("__game.warp(16,.8)")
            advance(2)
            check(
                "treasure pickup updates score and pack",
                state()["collected"] == [0] and state()["score"] >= 4000,
                state()["collected"],
            )
            advance(10)
            check("treasure cannot collect twice", state()["collected"] == [0])
            page.evaluate("__game.warp(73,.8)")
            advance(90, y=1)
            check(
                "ladder descends into cave",
                state()["players"][0]["y"] < -4 and state()["metrics"]["climbs"] == 1,
                state()["players"][0],
            )
            page.evaluate("__game.warp(109,-4.23)")
            advance(90, y=-1)
            check(
                "ladder returns to surface",
                state()["players"][0]["y"] > 0.6,
                state()["players"][0],
            )
            page.evaluate(
                "__game.warp(30,2); __game.advance(1); const v=__game.sceneInfo().vines[0]; __game.warp(v.endX,v.endY-.68)"
            )
            advance(1, x=1)
            check(
                "vine catches airborne explorer",
                state()["players"][0]["vine"] == 30,
                state()["players"][0],
            )
            advance(15, x=1)
            advance(1, x=1, jump=True)
            check(
                "jump releases vine with momentum",
                state()["players"][0]["vine"] is None
                and state()["players"][0]["vy"] > 0,
                state()["players"][0],
            )
            page.evaluate("__game.warp(70,.8)")
            advance(5)
            check("camp progress records", state()["camp"] == 2, state()["camp"])
            page.evaluate("__game.damage('Test hazard')")
            check(
                "damage costs life and respawns at camp",
                state()["lives"] == 2 and abs(state()["players"][0]["x"] - 70) < 0.1,
                state(),
            )
            page.evaluate("__game.damage('Second hit')")
            check("respawn grace blocks repeated damage", state()["lives"] == 2)
            page.evaluate("__game.save()")
            check(
                "save has expedition data",
                page.evaluate(
                    "JSON.parse(localStorage.getItem('pitfalling-expedition-v1')).collected.includes(0)"
                ),
            )
            load()
            page.locator('[data-act="continue"]:visible').click()
            check(
                "continue restores pack lives and camp",
                0 in state()["collected"]
                and state()["lives"] == 2
                and state()["camp"] == 2,
                state(),
            )
            page.keyboard.press("Escape")
            check("pause opens", state()["modal"] == "pause")
            elapsed = state()["elapsed"]
            advance(60)
            check("solo pause freezes simulation", state()["elapsed"] == elapsed)
            page.locator('[data-act="dev"]:visible').click()
            page.locator('[data-setting="speed"]').evaluate(
                "e=>{e.value=8;e.dispatchEvent(new Event('input',{bubbles:true}))}"
            )
            check(
                "live balance slider changes simulation",
                state()["settings"]["speed"] == 8,
            )
            page.locator('[data-act="resetDev"]:visible').click()
            check(
                "reset restores balance and cheats",
                state()["settings"]["speed"] == 6.2 and not state()["dev"]["god"],
            )
            page.locator('[data-act="resume"]:visible').click()
            page.keyboard.press("KeyM")
            check(
                "field map opens with eight sections",
                state()["modal"] == "map" and page.locator(".route-card").count() == 8,
            )
            page.keyboard.press("KeyM")
            check("map hotkey closes map", state()["modal"] is None)
            page.keyboard.press("Escape")
            page.locator('[data-act="about"]:visible').click()
            for tab in [
                "sourceInformation",
                "testingFeedback",
                "engineFeedback",
                "promptFeedback",
            ]:
                page.locator(f'[data-credit="{tab}"]').click()
                check(
                    "credits " + tab, len(page.locator("#creditCopy").inner_text()) > 80
                )
            page.keyboard.press("Escape")
            page.keyboard.press("Escape")
            proof = page.evaluate("__game.audioProof()")
            check(
                "offline synth creates audible unclipped signal",
                proof["rms"] > 0.01 and 0.05 < proof["peak"] < 0.99,
                proof,
            )
            page.wait_for_timeout(400)
            levels = page.evaluate("__game.state().audio")
            check(
                "Web Audio unlocked by native input",
                levels["state"] == "running",
                levels,
            )
            check(
                "live music bus produces output",
                page.evaluate("__game.audioMeter()") > 0,
            )
            page.evaluate("__game.start()")
            for _ in range(3):
                advance(150)
                page.evaluate("__game.warp(113,.8)")
                advance(1)
            check(
                "three real hazard hits reach defeat",
                state()["lives"] == 0
                and state()["mode"] == "result"
                and not state()["won"],
                state(),
            )
            page.locator('[data-act="retry"]:visible').click()
            check(
                "retry starts clean expedition",
                state()["lives"] == 3 and state()["collected"] == [],
            )
            page.evaluate("__game.set('daylight',.03)")
            advance(3)
            check(
                "time limit ends expedition",
                state()["mode"] == "result" and not state()["won"],
            )
            check("no browser exceptions", not errors, errors)

        def route():
            load()
            page.evaluate("__game.start();")
            # The route driver never teleports or grants treasure. It samples the
            # world and sends normal motion, jump and ladder controls every tick.
            result = page.evaluate("""() => {
              let phase=0, ticks=0, jumpTicks=0, rest=0, wait=0, stuck=0, lastX=0;
              const trace=[];
              for(ticks=0;ticks<24000;ticks++) {
                const s=__game.state(), p=s.players[0], info=__game.sceneInfo();
                if(s.mode==='result')return {ticks,state:s,phase,trace};
                let x=1,y=0,jump=false;
                if(phase===0 && p.x>71.8)phase=1;
                if(phase===2&&p.y>0&&!p.climbing)phase=1;
                if(phase===6&&p.y>0&&!p.climbing)phase=5;
                if(phase===1){x=Math.abs(p.x-73)<.25?0:Math.sign(73-p.x);y=Math.abs(p.x-73)<.75?1:0;if(p.y<-4&& !p.climbing)phase=2;}
                if(phase===2 && p.x>108.3)phase=3;
                if(phase===3){x=Math.abs(p.x-109)<.25?0:Math.sign(109-p.x);y=Math.abs(p.x-109)<.75?-1:0;if(p.y>.6&&!p.climbing)phase=4;}
                if(phase===4&&p.x>164.4)phase=5;
                if(phase===5){x=Math.abs(p.x-165)<.25?0:Math.sign(165-p.x);y=Math.abs(p.x-165)<.75?1:0;if(p.y<-4&&!p.climbing)phase=6;}
                if(phase===6&&p.x>178.3)phase=7;
                if(phase===7){x=Math.abs(p.x-179)<.25?0:Math.sign(179-p.x);y=Math.abs(p.x-179)<.75?-1:0;if(p.y>.6&&!p.climbing)phase=8;}
                // Ground hazards. Trigger only on approach, allowing the landing
                // phase to complete before the next hop.
                const hy=p.y<-1?-5:0;
                const enemies=info.hazards.filter(h=>Math.abs(h.y-hy)<1);
                const hazard= enemies.some(h=>h.x-p.x>-.2&&h.x-p.x<2.6) || (hy===0&&info.logs.some(l=>l.x-p.x>0&&l.x-p.x<2.5));
                if(p.grounded&&hazard&&rest===0){jumpTicks=30;rest=45;}
                const gap=info.gaps.find(g=>p.x>g.a-4&&p.x<g.b+1);
                if(gap&&hy===0){
                  if(gap.type==='bridge'){
                    if(p.grounded&&rest===0){jumpTicks=29;rest=36;}
                  }else if(p.x<gap.a+.1&&!p.vine){
                    // Wait on the bank until the vine approaches, then leap.
                    const v=info.vines.find(v=>v.x>gap.a&&v.x<gap.b);
                    if(p.x>gap.a-1.1){x=0;if(v&&v.endX<p.x+1.6&&v.endX>p.x-1.0&&v.vel>0){x=1;if(p.grounded){jumpTicks=30;rest=45;}}}
                  }
                  if(p.vine){const v=info.vines.find(v=>v.x===p.vine);if(v&&p.x>gap.b-.6&&v.vel>0){jumpTicks=1;rest=35;}else jumpTicks=0;}
                }
                if(jumpTicks>0){jump=true;jumpTicks--;}if(rest>0)rest--;
                if(p.climbing){jump=false;}
                if(ticks%120===0)trace.push({t:ticks,x:+p.x.toFixed(1),y:+p.y.toFixed(1),phase,lives:s.lives,n:s.collected.length,v:p.vine});
                __game.advance(1,[{x,y,jump}]);
              }
              return {ticks,state:__game.state(),phase,trace};
            }""")
            (D / "route-trace.json").write_text(json.dumps(result, indent=2))
            check(
                "scripted complete route reaches ending",
                result["state"]["won"],
                {
                    "ticks": result["ticks"],
                    "phase": result["phase"],
                    "state": result["state"],
                },
            )
            check(
                "route collects all eight treasures",
                len(result["state"]["collected"]) == 8,
                result["state"]["collected"],
            )
            check(
                "route uses vines and both caves",
                result["state"]["metrics"]["swings"] >= 3
                and result["state"]["metrics"]["climbs"] >= 4,
                result["state"]["metrics"],
            )

        def inputs():
            load()
            page.evaluate("__game.start(true)")
            advance(30)
            page.keyboard.down("KeyD")
            page.keyboard.down("ArrowRight")
            page.evaluate("__game.advance(25)")
            page.keyboard.up("KeyD")
            page.keyboard.up("ArrowRight")
            s = state()
            check(
                "local co-op has independent moving explorers",
                s["coop"] and s["players"][0]["x"] > 5 and s["players"][1]["x"] > 6,
                s["players"],
            )
            page.keyboard.down("ShiftRight")
            page.evaluate("__game.advance(15)")
            page.keyboard.up("ShiftRight")
            check(
                "second explorer jump",
                state()["players"][1]["y"] > 1.7,
                state()["players"][1],
            )
            page.evaluate("__game.title(); __game.manual(false)")
            page.wait_for_function("__game.state().mode==='attract'", timeout=13000)
            check("ten-second idle starts attract", state()["mode"] == "attract")
            x = state()["players"][0]["x"]
            page.wait_for_timeout(500)
            check("attract actively explores", state()["players"][0]["x"] > x)
            page.keyboard.press("Space")
            check("input exits attract to title", state()["mode"] == "title")
            page.evaluate(
                "__game.manual(true); window.padButtons=Array(17).fill(false);window.padAxes=[0,0,0,0]; navigator.getGamepads=()=>[{index:0,id:'Test DualSense',mapping:'standard',axes:padAxes,buttons:padButtons.map(pressed=>({pressed,value:pressed?1:0,touched:pressed})),connected:true}]"
            )
            page.evaluate("padButtons[0]=true")
            page.wait_for_timeout(100)
            page.evaluate("padButtons[0]=false")
            check("standard pad starts game", state()["mode"] == "play", state())
            check(
                "last-device glyph remains PlayStation",
                "✕" in page.locator("#hint").inner_text(),
            )
            page.evaluate(
                "__game.advance(25);padAxes[0]=1;__game.advance(25);padAxes[0]=0"
            )
            check(
                "standard left stick moves player",
                state()["players"][0]["x"] > 5,
                state()["players"][0],
            )
            page.evaluate("padButtons[0]=true;__game.advance(15);padButtons[0]=false")
            check(
                "Cross drives actual jump",
                state()["players"][0]["y"] > 1.7,
                state()["players"][0],
            )
            page.evaluate("__game.advance(70);padButtons[8]=true;padButtons[9]=true")
            page.wait_for_timeout(100)
            check("Create and Options chord is ignored", state()["modal"] is None)
            page.evaluate("padButtons[8]=false;padButtons[9]=false")
            page.wait_for_timeout(100)
            page.evaluate("padButtons[9]=true")
            page.wait_for_timeout(100)
            page.evaluate("padButtons[9]=false")
            check("Options opens pause", state()["modal"] == "pause")
            page.locator('[data-act="settings"]:visible').click()
            page.locator("#glyphSetting").select_option("xbox")
            page.evaluate("padButtons[1]=true")
            page.wait_for_timeout(100)
            page.evaluate("padButtons[1]=false")
            page.evaluate("__game.act('resume')")
            advance(1)
            check(
                "Xbox glyph setting persists", state()["settings"]["glyphs"] == "xbox"
            )
            check(
                "Xbox prompts follow pad",
                page.locator("#hint .glyph").all_text_contents()[1] == "A",
                page.locator("#hint").inner_text(),
            )
            page.evaluate("__game.title(); window.padButtons=Array(17).fill(false)")
            touch = browser.new_context(
                viewport={"width": 844, "height": 390},
                is_mobile=True,
                has_touch=True,
                device_scale_factor=1,
            )
            tp = touch.new_page()
            tp.goto(url, wait_until="domcontentloaded")
            tp.wait_for_function("window.__game", timeout=90000)
            tp.locator('[data-act="start"]:visible').tap()
            tp.evaluate("__game.advance(30)")
            tp.dispatch_event(
                "#world",
                "pointerdown",
                {
                    "pointerType": "touch",
                    "pointerId": 1,
                    "clientX": 100,
                    "clientY": 250,
                    "bubbles": True,
                },
            )
            tp.dispatch_event(
                "#world",
                "pointermove",
                {
                    "pointerType": "touch",
                    "pointerId": 1,
                    "clientX": 150,
                    "clientY": 250,
                    "bubbles": True,
                },
            )
            tp.evaluate("__game.advance(30)")
            check(
                "invisible touch stick moves explorer",
                tp.evaluate("__game.state().players[0].x") > 5,
                tp.evaluate("__game.state()"),
            )
            tp.dispatch_event(
                "#world",
                "pointerup",
                {"pointerType": "touch", "pointerId": 1, "bubbles": True},
            )
            tp.dispatch_event(
                "#world",
                "pointerdown",
                {
                    "pointerType": "touch",
                    "pointerId": 2,
                    "clientX": 750,
                    "clientY": 260,
                    "bubbles": True,
                },
            )
            tp.evaluate("__game.advance(15)")
            check("touch jump works", tp.evaluate("__game.state().players[0].y") > 1.7)
            tp.dispatch_event(
                "#world",
                "pointerup",
                {"pointerType": "touch", "pointerId": 2, "bubbles": True},
            )
            tp.locator("#pauseButton").tap()
            check(
                "touch opens same pause menu",
                tp.evaluate("__game.state().modal") == "pause",
            )
            check(
                "touch keeps only minimal HUD",
                not tp.locator(".chapter").is_visible()
                and not tp.locator(".hintbar").is_visible(),
            )
            tp.set_viewport_size({"width": 390, "height": 844})
            panel_bounds = tp.locator("#panel").bounding_box()
            check(
                "portrait pause fits screen",
                panel_bounds is not None and panel_bounds["width"] < 390,
            )
            tp.evaluate("__game.act('resume');__game.title()")
            title_bounds = tp.locator("h1.title").bounding_box()
            check(
                "portrait title fits screen",
                title_bounds is not None
                and title_bounds["x"] + title_bounds["width"] < 391,
            )
            touch.close()

        def sharing():
            fp = context.new_page()
            fp.goto(
                (ROOT / (BASE + ".html")).as_uri() + "?test=1",
                wait_until="domcontentloaded",
            )
            fp.wait_for_function("window.__game || window.__bootError", timeout=90000)
            check(
                "single HTML opens through file protocol",
                fp.evaluate("!!window.__game")
                and fp.title() == "Pitfalling for Adventure",
                fp.evaluate("window.__bootError"),
            )
            fp.close()

        def hub():
            page.close()
            scenarios = [
                ("two explorers", 2, ""),
                (
                    "four explorers under packet loss",
                    4,
                    "&latency=150&jitter=50&loss=5",
                ),
                (
                    "host departure",
                    4,
                    "&latency=150&jitter=50&loss=5&scenario=host-leave",
                ),
            ]
            for label, n, extra in scenarios:
                hp = context.new_page()
                hp.goto(
                    origin
                    + "/"
                    + D.name
                    + "/harness.html?game=../"
                    + BASE
                    + ".html&players="
                    + str(n)
                    + "&play=3000&auto=1"
                    + extra,
                    wait_until="domcontentloaded",
                )
                if n == 2:
                    hp.wait_for_function(
                        "Array.from(document.querySelectorAll('iframe')).length===2 && Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow.__game?.state().hub.started)",
                        timeout=90000,
                    )
                    frames = [f for f in hp.frames if f != hp.main_frame]
                    frames[0].evaluate("__game.manual(true);__game.warp(14,.8)")
                    frames[1].wait_for_function(
                        "__game.state().ghosts.some(g=>g.id===0&&Math.abs(g.x-14)<.2)",
                        timeout=5000,
                    )
                    check(
                        "hub ghost reproduces remote position",
                        frames[1].evaluate(
                            "__game.state().ghosts.some(g=>g.id===0&&Math.abs(g.x-14)<.2)"
                        ),
                    )
                hp.wait_for_function(
                    "document.body.dataset.complete==='true'", timeout=150000
                )
                result = hp.evaluate("window.__hubCheck")
                (
                    D
                    / (
                        "hub-"
                        + str(n)
                        + ("-leave" if "host-leave" in extra else "")
                        + ".json"
                    )
                ).write_text(json.dumps(result, indent=2))
                check("AI Hub " + label, result.get("pass") is True, result)
                if n == 2:
                    f = hp.frames[1]
                    f.evaluate(
                        "document.dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true}))"
                    )
                    check(
                        "hub end locks input and sound",
                        f.evaluate(
                            "__game.state().hub.ended && __game.state().audio.state!=='running'"
                        ),
                    )
                hp.close()

        def visual():
            load("&renderer=webgl")
            page.screenshot(path=str(D / "title.png"))
            page.evaluate(
                "__game.start(); __game.set('god',true);__game.warp(57,1.5);__game.advance(1)"
            )
            page.wait_for_timeout(1000)
            page.screenshot(path=str(D / "trail.png"))
            page.evaluate("__game.warp(94,-4.23);__game.advance(1)")
            page.wait_for_timeout(500)
            page.screenshot(path=str(D / "tunnel.png"))
            page.keyboard.press("Escape")
            page.locator('[data-act="dev"]:visible').click()
            page.screenshot(path=str(D / "field-lab.png"))
            check(
                "visual captures created",
                all(
                    (D / f).stat().st_size > 10000
                    for f in ["title.png", "trail.png", "tunnel.png", "field-lab.png"]
                ),
            )

        run_case("core", core)
        run_case("route", route)
        run_case("input", inputs)
        run_case("sharing", sharing)
        run_case("visual", visual)
        run_case("hub", hub)
        browser.close()
    server.shutdown()
    output = {
        "checks": checks,
        "passed": sum(c["pass"] for c in checks),
        "failed": sum(not c["pass"] for c in checks),
    }
    (D / ("test-results-" + args.case + ".json")).write_text(
        json.dumps(output, indent=2)
    )
    print(
        f"{output['passed']}/{len(checks)} checks passed; {output['failed']} failures."
    )
    raise SystemExit(1 if output["failed"] else 0)


if __name__ == "__main__":
    main()
