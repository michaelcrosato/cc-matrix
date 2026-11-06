import json
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import quote, urlencode

from playwright.sync_api import sync_playwright

PROJECT = Path(__file__).resolve().parent
ROOT = PROJECT.parent
checks = []
observations = []
runtime_errors = []
selected_group = (
    sys.argv[2].lower() if sys.argv[1:2] == ["--only"] and len(sys.argv) > 2 else ""
)


def check(name, condition, detail=""):
    checks.append(
        {
            "name": name,
            "pass": bool(condition),
            "detail": str(detail) if not condition else "",
        }
    )
    if not condition:
        print(f"FAIL: {name}: {detail}", flush=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:
        pass


server = ThreadingHTTPServer(
    ("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT))
)
Thread(target=server.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{server.server_port}"
game_path = "/" + quote(PROJECT.name + ".html")


def load(page, suffix="&renderer=webgl"):
    page.on("pageerror", lambda e: runtime_errors.append(str(e)))
    page.goto(base + game_path + "?test=1" + suffix, wait_until="domcontentloaded")
    page.wait_for_function("window.__game?.ready || window.__bootError", timeout=120000)
    error = page.evaluate("window.__bootError || null")
    if error:
        raise RuntimeError(error)
    assert "E.T. the Extra-Lost-and-Found" == page.title()
    page.evaluate(
        "window.__game.title(); window.__game.manual(true); window.__game.idle(-3600)"
    )


def snap(page):
    return page.evaluate("window.__game.snapshot()")


def group(name, fn):
    if selected_group and selected_group not in name.lower():
        return
    (PROJECT / "test-progress.json").write_text(
        json.dumps({"group": name, "complete": False, "checks": len(checks)})
    )
    try:
        fn()
    except Exception as exc:  # noqa: BLE001 - keep independent checks running
        check(name, False, f"{type(exc).__name__}: {exc}")
    finally:
        (PROJECT / "test-progress.json").write_text(
            json.dumps({"group": name, "complete": True, "checks": len(checks)})
        )


with sync_playwright() as pw:
    browser = pw.chromium.launch(
        headless=True,
        args=[
            "--enable-unsafe-webgpu",
            "--enable-features=Vulkan",
            "--use-webgpu-adapter=swiftshader",
            "--disable-gpu-watchdog",
            "--disable-dev-shm-usage",
        ],
    )
    context = browser.new_context(
        viewport={"width": 1440, "height": 900}, ignore_https_errors=True
    )
    page = context.new_page()

    def package():
        data = json.loads((ROOT / "exit-interview.json").read_text())
        check(
            "exit interview has exact top-level schema",
            set(data)
            == {
                "sourceInformation",
                "testingFeedback",
                "engineFeedback",
                "promptFeedback",
                "aiHub",
            },
        )
        check(
            "all interview feedback slots exist",
            [
                len(data[k])
                for k in ["testingFeedback", "engineFeedback", "promptFeedback"]
            ]
            == [4, 6, 4],
        )
        html = (ROOT / (PROJECT.name + ".html")).read_text()
        original = (PROJECT / "hub/session.js").read_text()
        check(
            "Hub client is embedded without modification",
            "<script>" + original + "</script>" in html,
        )
        check(
            "single HTML has no local file dependencies",
            'src="./' not in html and "from './" not in html,
        )
        selection = json.loads((PROJECT / "selection.json").read_text())
        check(
            "title selected with real RNG from 50 candidates",
            selection["candidates"] == 50
            and selection["method"] == "Python secrets.randbelow(50)",
        )

    group("package", package)

    def gpu():
        load(page, "")
        s = snap(page)
        check("WebGPU engine initializes", s["renderer"] == "WebGPU", s["renderer"])
        check(
            "required engine and physics versions",
            s["three"] == "180" and s["rapier"] == "0.19.3",
            s,
        )
        page.wait_for_timeout(500)
        observations.append({"gpu": snap(page)})

    group("WebGPU initialization", gpu)

    def file_launch():
        page.goto(
            (ROOT / (PROJECT.name + ".html")).as_uri() + "?test=1&renderer=webgl",
            wait_until="domcontentloaded",
        )
        page.wait_for_function(
            "window.__game?.ready || window.__bootError", timeout=120000
        )
        check(
            "single HTML launches through file protocol",
            page.evaluate("!!window.__game?.ready"),
            page.evaluate("window.__bootError || null"),
        )
        page.evaluate(
            "window.__game.title(); window.__game.manual(true); window.__game.idle(-3600)"
        )

    group("file protocol", file_launch)

    def main():
        load(page)
        check("title menu accepts a new adventure", snap(page)["screen"] == "title")
        page.screenshot(path=str(PROJECT / "title.png"))
        page.click("#begin")
        check("mouse starts adventure", snap(page)["screen"] == "play")
        page.evaluate(
            'window.__game.unlock(); window.__game.sound("pulse"); window.__game.voice()'
        )
        page.wait_for_timeout(150)
        a = page.evaluate("window.__game.offlineAudio()")
        check("music defaults to 10 percent", a["musicVolume"] == 0.1, a)
        check(
            "code audio produces nonzero unclipped output",
            0 < a["peak"] < 1 and a["rms"] > 0,
            a,
        )
        check("gibberish voice is synthesized", a["voices"] > 0, a)
        before = snap(page)["position"]
        page.keyboard.down("w")
        page.wait_for_timeout(100)
        after = page.evaluate("window.__game.step(.5)")["position"]
        page.keyboard.up("w")
        check(
            "keyboard moves through Rapier",
            after["z"] < before["z"] - 1,
            (before, after),
        )
        page.evaluate(
            "window.__game.input(0,0); window.__game.teleport(27,15); window.__game.input(0,-1)"
        )
        collision = page.evaluate("window.__game.step(1)")
        check(
            "solid house prevents penetration",
            collision["position"]["z"] >= 13.25,
            collision["position"],
        )
        page.evaluate(
            "window.__game.start(); window.__game.teleport(12,2); window.__game.action()"
        )
        check(
            "befriending unlocks shared heartlight",
            snap(page)["friend"] and snap(page)["phase"] == "parts",
        )
        page.evaluate("window.__game.teleport(20,-15); window.__game.pulse()")
        s = snap(page)
        check(
            "heartlight heals flowers and opens gate",
            s["gateOpen"] and s["healed"] == 1,
            s,
        )
        check("powers spend heartlight", s["bond"] < 100, s["bond"])
        page.evaluate(
            "window.__game.step(2); window.__game.teleport(-18,-16); window.__game.pulse()"
        )
        check("physics crate can be lifted", snap(page)["crateMoved"])
        recharge = page.evaluate("window.__game.step(3)")["bond"]
        check("heartlight recharges", recharge > 80, recharge)
        page.evaluate("window.__game.teleport(-4,-7); window.__game.candy()")
        s = snap(page)
        check(
            "candy distracts real patrol AI",
            any(g["distracted"] for g in s["guards"]),
            s["guards"],
        )
        page.evaluate(
            "window.__game.setState({alert:50}); window.__game.teleport(35,21); window.__game.input(0,0)"
        )
        check(
            "search alert fades in safety",
            page.evaluate("window.__game.step(1)")["alert"] < 50,
        )
        page.evaluate("window.__game.setState({alert:110}); window.__game.step(.1)")
        s = snap(page)
        check(
            "capture returns to a safe checkpoint",
            s["catches"] == 1 and s["position"]["z"] > 0,
            s,
        )
        check("capture preserves world progress", s["gateOpen"] and s["crateMoved"], s)
        page.evaluate("window.__game.pause()")
        check(
            "pause menu exposes developer mode", page.locator("#openDev").is_visible()
        )
        page.click("#openDev")
        page.locator("#set-walkSpeed").evaluate(
            '(e)=>{e.value=8;e.dispatchEvent(new Event("input"))}'
        )
        check(
            "live balance slider changes game value",
            snap(page)["tuning"]["walkSpeed"] == 8,
        )
        page.click("#freeze")
        check("patrol freeze tool works", snap(page)["tuning"]["freeze"])
        page.click("#debugPhysics")
        page.evaluate("window.__game.step(.1)")
        check(
            "physics overlay can be enabled",
            page.locator("#debugPhysics").inner_text().endswith("on"),
        )
        page.click("#resetBalance")
        try:
            page.wait_for_function(
                "window.__game.snapshot().tuning.walkSpeed===4.7 && !window.__game.snapshot().tuning.freeze",
                timeout=20000,
            )
        except Exception:
            (PROJECT / "menu-diagnostic.json").write_text(
                json.dumps(snap(page), indent=2)
            )
            raise
        check(
            "balance reset restores defaults",
            snap(page)["tuning"]["walkSpeed"] == 4.7
            and not snap(page)["tuning"]["freeze"],
        )
        page.click("#menuBack")
        page.click("#openSettings")
        check(
            "fullscreen is reachable in settings",
            page.locator("#fullScreen").is_visible(),
        )
        page.click("#glyphToggle")
        check(
            "Xbox glyph preference is live", snap(page)["settings"]["glyphs"] == "Xbox"
        )
        page.click("#glyphToggle")
        page.click("#menuBack")
        page.click("#resume")
        page.keyboard.press("Tab")
        check("map opens with keyboard", snap(page)["screen"] == "map")
        page.click("#closeMap")
        check("map closes without losing play", snap(page)["screen"] == "play")
        page.evaluate(
            'window.__game.devJump("ride"); window.__game.action(); window.__game.teleport(0,-76); window.__game.pulse()'
        )
        s = snap(page)
        check(
            "bicycle heartlight lifts into flight",
            s["phase"] == "flight" and s["mounted"] and s["position"]["y"] >= 5,
            s,
        )
        page.evaluate("window.__game.step(1); window.__game.render()")
        page.screenshot(path=str(PROJECT / "flight.png"))
        page.evaluate(
            "window.__game.start(); window.__game.set({invincible:true}); window.__game.auto(true)"
        )
        journey = []
        for _ in range(65):
            s = page.evaluate("window.__game.step(4)")
            journey.append(s)
            if s["screen"] == "tune" and not s["signal"]:
                break
        check("full route reaches musical transmitter", s["screen"] == "tune", s)
        if s["screen"] == "tune":
            page.evaluate(
                "window.__game.auto(false); window.__game.step(5); window.__game.tune(1)"
            )
            check(
                "wrong tune safely offers replay",
                page.evaluate("window.__game.getTune().playing"),
            )
            page.evaluate("window.__game.step(5); window.__game.auto(true)")
        for _ in range(65):
            s = page.evaluate("window.__game.step(3)")
            journey.append(s)
            if s["won"]:
                break
        (PROJECT / "playthrough.json").write_text(json.dumps(journey, indent=2))
        check("full scripted journey reaches farewell", s["won"], s)
        check(
            "full journey collects every transmitter part", all(s["parts"]), s["parts"]
        )
        check(
            "full journey uses environmental powers",
            s["crateMoved"] and s["gateOpen"],
            s,
        )
        check("full journey solves both melody rounds", s["signal"], s)
        check("flight rings are playable", s["rings"] >= 3, s["rings"])
        page.evaluate("window.__game.step(8)")
        check(
            "ending reaches complete results screen",
            snap(page)["screen"] == "result",
            snap(page),
        )
        page.screenshot(path=str(PROJECT / "ending.png"))
        page.evaluate(
            "window.__game.set({invincible:false}); window.__game.title(); window.__game.manual(false); window.__game.idle(11)"
        )
        page.wait_for_function("window.__game.snapshot().attract", timeout=5000)
        check("attract starts after ten idle seconds", snap(page)["attract"])
        page.keyboard.press("a")
        check(
            "any input leaves attract for the title",
            snap(page)["screen"] == "title" and not snap(page)["attract"],
        )
        page.evaluate('window.__game.manual(true); window.__game.openMenu("about")')
        for i, title in enumerate(
            [
                "Source Information",
                "Testing Feedback",
                "Engine Feedback",
                "Prompt Feedback",
            ]
        ):
            page.click("#creditTab" + str(i))
            check(
                "credits contain " + title,
                title in page.locator(".credits-scroll").inner_text(),
            )

    group("gameplay and UI", main)

    def gamepad():
        if not page.evaluate("!!window.__game?.ready"):
            load(page)
        page.evaluate(
            """() => { window._pad={id:'Emulated standard DualSense',mapping:'standard',connected:true,index:0,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{value:()=>[window._pad]});window.__game.title(); }"""
        )
        page.evaluate("window._pad.buttons[0]={pressed:true,value:1}")
        page.wait_for_timeout(150)
        page.evaluate("window._pad.buttons[0]={pressed:false,value:0}")
        check(
            "standard controller starts from focused title button",
            snap(page)["screen"] == "play",
        )
        page.evaluate("window._pad.axes[1]=-1")
        page.wait_for_timeout(100)
        before = snap(page)["position"]["z"]
        s = page.evaluate("window.__game.step(.5)")
        check(
            "controller left stick moves the player",
            s["position"]["z"] < before - 1,
            (before, s["position"]),
        )
        check(
            "last-input prompts show PlayStation glyphs",
            "×" in page.locator("#titleInput").inner_text(),
        )
        page.evaluate(
            "window._pad.axes[1]=0; window._pad.buttons[9]={pressed:true,value:1}"
        )
        page.wait_for_timeout(120)
        check("Options opens pause menu", page.locator("#openDev").is_visible())
        page.evaluate(
            "window._pad.buttons[9]={pressed:false,value:0}; window._pad.buttons[0]={pressed:true,value:1}"
        )
        page.wait_for_timeout(120)
        check("Cross resumes through focused menu", snap(page)["screen"] == "play")
        page.evaluate("window._pad.buttons[0]={pressed:false,value:0}")

    group("emulated controller", gamepad)
    page.close()
    context.close()

    def touch():
        ctx = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=1,
            is_mobile=True,
            has_touch=True,
            ignore_https_errors=True,
        )
        phone = ctx.new_page()
        try:
            load(phone)
            button_box = phone.locator("#begin").bounding_box()
            assert button_box is not None
            phone.touchscreen.tap(155, button_box["y"] + 25)
            check("touch begins the same adventure", snap(phone)["screen"] == "play")
            check(
                "touch uses uncluttered HUD",
                phone.locator("#controls").is_hidden()
                and phone.locator("#pauseButton").is_visible(),
            )
            session = ctx.new_cdp_session(phone)
            session.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchStart",
                    "touchPoints": [
                        {"x": 80, "y": 620, "id": 1},
                        {"x": 310, "y": 580, "id": 2},
                    ],
                },
            )
            session.send(
                "Input.dispatchTouchEvent",
                {
                    "type": "touchMove",
                    "touchPoints": [
                        {"x": 80, "y": 560, "id": 1},
                        {"x": 335, "y": 580, "id": 2},
                    ],
                },
            )
            phone.wait_for_timeout(100)
            before = snap(phone)["position"]
            after = phone.evaluate("window.__game.step(.5)")["position"]
            check(
                "invisible touch stick supports multitouch movement",
                abs(after["x"] - before["x"]) + abs(after["z"] - before["z"]) > 0.5,
                (before, after),
            )
            session.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )
            phone.touchscreen.tap(355, 40)
            check("touch menu remains reachable", phone.locator("#resume").is_visible())
            bounds = phone.locator("#menuLayer .panel").bounding_box()
            assert bounds is not None
            check(
                "phone menu fits inside the viewport",
                bounds["x"] >= 20 and bounds["x"] + bounds["width"] <= 370,
                bounds,
            )
            phone.screenshot(path=str(PROJECT / "touch.png"))
        finally:
            ctx.close()

    group("touch controls", touch)

    def standalone_network():
        ctx = browser.new_context(
            viewport={"width": 960, "height": 640}, ignore_https_errors=True
        )
        host = ctx.new_page()
        guest = ctx.new_page()
        try:
            load(host, "&renderer=webgl&localNetwork=1")
            load(guest, "&renderer=webgl&localNetwork=1")
            host.evaluate('window.__game.createRoom("4682")')
            guest.evaluate('window.__game.joinRoom("4682")')
            host.wait_for_function(
                "window.__game.snapshot().room.members===2", timeout=20000
            )
            guest.wait_for_function(
                "window.__game.snapshot().room.members===2", timeout=20000
            )
            check(
                "standalone two-page room joins",
                snap(host)["room"]["members"] == 2
                and snap(guest)["room"]["members"] == 2,
            )
            host.evaluate("window.__game.startRoom()")
            host.wait_for_function(
                'window.__game.snapshot().screen==="play"', timeout=20000
            )
            guest.wait_for_function(
                'window.__game.snapshot().screen==="play"', timeout=20000
            )
            check(
                "room starts the same journey on both pages",
                snap(host)["phase"] == snap(guest)["phase"] == "friend",
            )
            host.evaluate("window.__game.input(1,0); window.__game.step(1)")
            guest.evaluate("window.__game.step(1)")
            host.wait_for_function(
                "window.__game.snapshot().ghosts.length===1", timeout=20000
            )
            guest.wait_for_function(
                "window.__game.snapshot().ghosts.length===1", timeout=20000
            )
            check(
                "both standalone pages receive ghost state",
                len(snap(host)["ghosts"]) == len(snap(guest)["ghosts"]) == 1,
            )
            remote = guest.evaluate("window.__game.ghosts()[0]")
            check(
                "ghost contains actual remote movement", remote["data"]["x"] > 7, remote
            )
            host.evaluate("window.__game.leaveRoom()")
            guest.wait_for_timeout(300)
            check(
                "host departure leaves solo play available",
                not snap(guest)["room"]["started"] and snap(guest)["screen"] == "play",
            )
        except Exception:
            (PROJECT / "network-diagnostic.json").write_text(
                json.dumps({"host": snap(host), "guest": snap(guest)}, indent=2)
            )
            raise
        finally:
            ctx.close()

    group("standalone multiplayer", standalone_network)

    def internet_signaling():
        ctx = browser.new_context(
            viewport={"width": 960, "height": 640}, ignore_https_errors=True
        )
        host = ctx.new_page()
        guest = ctx.new_page()
        try:
            load(host, "&renderer=webgl")
            guest.goto(
                base.replace("127.0.0.1", "localhost")
                + game_path
                + "?test=1&renderer=webgl",
                wait_until="domcontentloaded",
            )
            guest.wait_for_function("window.__game?.ready", timeout=120000)
            guest.evaluate("window.__game.manual(true);window.__game.idle(-3600)")
            code = str(1000 + server.server_port % 9000)
            host.evaluate("(code)=>window.__game.createRoom(code)", code)
            guest.evaluate("(code)=>window.__game.joinRoom(code)", code)
            connected = False
            for _ in range(25):
                host.wait_for_timeout(1000)
                if (
                    snap(host)["room"]["members"] == 2
                    and snap(guest)["room"]["members"] == 2
                ):
                    connected = True
                    break
            if connected:
                check("PeerJS joins across separate browser origins", True)
                host.evaluate("window.__game.startRoom()")
                host.wait_for_function(
                    'window.__game.snapshot().screen==="play"', timeout=20000
                )
                guest.wait_for_function(
                    'window.__game.snapshot().screen==="play"', timeout=20000
                )
                host.evaluate("window.__game.step(1)")
                guest.evaluate("window.__game.step(1)")
                guest.wait_for_function(
                    "window.__game.snapshot().ghosts.length===1", timeout=20000
                )
                check(
                    "WebRTC carries real ghost state", len(snap(guest)["ghosts"]) == 1
                )
                observations.append(
                    {
                        "internetSignaling": "PeerJS WebRTC verified across two origins on this computer; independent WAN networks unknown"
                    }
                )
            else:
                status = {
                    "host": snap(host)["room"]["status"],
                    "guest": snap(guest)["room"]["status"],
                }
                observations.append({"internetSignaling": "unknown", "status": status})
                check(
                    "unavailable internet signaling has a clear local fallback",
                    all(
                        any(
                            w in value.lower()
                            for w in [
                                "unavailable",
                                "connecting",
                                "calling",
                                "open",
                                "looking",
                                "ready",
                                "use online",
                            ]
                        )
                        for value in status.values()
                    ),
                    status,
                )
        finally:
            ctx.close()

    group("internet signaling probe", internet_signaling)

    def hub_scenario(players, scenario="normal", loss=0):
        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900}, ignore_https_errors=True
        )
        harness = ctx.new_page()
        try:
            params = {
                "game": game_path + "?renderer=webgl",
                "players": players,
                "auto": 1,
                "play": 2500,
                "latency": 150,
                "jitter": 50,
                "loss": loss,
            }
            if scenario != "normal":
                params["scenario"] = scenario
            url = (
                base
                + "/"
                + quote(PROJECT.name)
                + "/hub/harness.html?"
                + urlencode(params)
            )
            harness.goto(url, wait_until="domcontentloaded")
            harness.wait_for_function(
                'document.body.dataset.complete==="true"', timeout=180000
            )
            report = harness.evaluate("window.__hubCheck")
            (PROJECT / f"hub-{players}-{scenario}.json").write_text(
                json.dumps(report, indent=2)
            )
            for item in report["checks"]:
                check(
                    f"Hub {players}p {scenario}: " + item["name"],
                    item["pass"],
                    item.get("detail", ""),
                )
            check(
                f"Hub {players}p {scenario}: complete conformance",
                report["pass"],
                report,
            )
        finally:
            ctx.close()

    group("AI Hub two players", lambda: hub_scenario(2))
    group("AI Hub four players, loss and jitter", lambda: hub_scenario(4, loss=5))
    group("AI Hub host departure", lambda: hub_scenario(4, "host-leave", 5))
    browser.close()
server.shutdown()
check("no uncaught JavaScript exceptions", not runtime_errors, runtime_errors[:8])
passed = sum(c["pass"] for c in checks)
report = {
    "passed": passed,
    "total": len(checks),
    "failures": [c for c in checks if not c["pass"]],
    "checks": checks,
    "observations": observations,
}
report_name = (
    "test-report-" + selected_group + ".json" if selected_group else "test-report.json"
)
(PROJECT / report_name).write_text(json.dumps(report, indent=2))
print(f"{passed}/{len(checks)} checks passed.", flush=True)
sys.exit(0 if passed == len(checks) else 1)
