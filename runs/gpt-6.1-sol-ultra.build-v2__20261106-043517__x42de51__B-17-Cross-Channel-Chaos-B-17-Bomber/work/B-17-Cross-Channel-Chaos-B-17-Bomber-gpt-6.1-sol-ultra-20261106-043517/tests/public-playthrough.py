"""Complete native E.Game playthrough: real DOM, keys and mouse; no sim commands/teleports."""

import json
import math
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs/public-playthrough.json"
failures = []
count = 0
with sync_playwright() as p:
    b = p.chromium.launch(
        headless=True, args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
    )
    page = b.new_page(viewport={"width": 1920, "height": 1080})
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.goto((ROOT / "game.html").as_uri() + "?backend=webgl", wait_until="load")
    page.wait_for_function("window.__bomber?.ready", timeout=120000)
    page.get_by_role("button", name="Fly a sortie", exact=True).click()
    page.wait_for_timeout(300)
    page.screenshot(path=str(ROOT / "tests/briefing-live.png"))
    page.get_by_role("button", name="Launch sortie", exact=True).click()
    page.wait_for_function('game.sceneName==="play"')
    page.evaluate("game.stop();game.audio.mute(true)")

    def advance(n=0.05):
        page.evaluate("(n)=>game.advance(n)", n)

    def key(code, n=0.05):
        page.keyboard.down(code)
        advance(n)
        page.keyboard.up(code)
        advance(0.02)

    def state():
        return page.evaluate(
            "({t:__bomber.sim.state.t,a:__bomber.sim.state.aircraft,p:__bomber.sim.state.players[0],foes:__bomber.sim.state.enemies.filter(e=>e.alive),pred:__bomber.sim.state.prediction,primary:__bomber.sim.state.primary,phase:__bomber.sim.state.phase,result:__bomber.sim.state.result,flak:__bomber.sim.state.flak,shots:__bomber.sim.state.fired,bombs:__bomber.sim.state.bombsLeft})"
        )

    def check(ok, message):
        global count
        count += 1
        if not ok:
            failures.append(message)

    advance(0.3)
    # Power and route hold are actual native controls.
    key("e", 0.8)
    seen = set()
    released = False
    returning = False
    gunheld = False
    evasion_side = 1
    evasion_count = 0
    for step in range(760):
        s = state()
        if s["result"]:
            break
        if s["phase"] == "landing":
            advance(13)
            continue
        if s["a"]["fire"] and s["a"]["extinguishers"]:
            key("f")
        pending = [f for f in s["flak"] if not f["burst"]]
        if pending and (returning or released or s["a"]["x"] < 302000):
            if gunheld:
                page.mouse.up()
                gunheld = False
            key("1")
            evasion_side *= -1
            evasion_count += 1
            turn = "a" if evasion_side < 0 else "d"
            page.keyboard.down("w")
            page.keyboard.down(turn)
            page.keyboard.down("e")
            advance(max(f["timer"] for f in pending) + 0.3)
            page.keyboard.up("w")
            page.keyboard.up(turn)
            page.keyboard.up("e")
            advance(0.02)
            key("h")
            continue
        if s["primary"] and not returning:
            if gunheld:
                page.mouse.up()
                gunheld = False
            key("m")
            advance(0.05)
            page.get_by_role("button", name="Return: Rookfield", exact=True).click()
            page.get_by_role("button", name="Fly to ROOKFIELD", exact=True).click()
            advance(0.05)
            returning = True
        elif not returning and s["a"]["x"] > 304000 and not released:
            if s["p"]["station"] != "bombs":
                if gunheld:
                    page.mouse.up()
                    gunheld = False
                key("3")
                advance(1)
            target = {"x": 340000, "y": 18000}
            if (
                math.hypot(s["pred"]["x"] - target["x"], s["pred"]["y"] - target["y"])
                < 1200
            ):
                key("Space")
                released = True
                page.evaluate("game.advance(.01,{draw:true})")
                page.screenshot(path=str(ROOT / "tests/bombs-public.png"))
        elif (s["a"]["x"] < 295000 or returning) and s["foes"]:
            foe = s["foes"][0]
            bearing = foe["bearing"]
            seen.add(bearing)
            if s["p"]["station"] != bearing:
                if gunheld:
                    page.mouse.up()
                    gunheld = False
                key("2")
            by = {
                "nose": 0,
                "starboard": math.pi / 2,
                "tail": math.pi,
                "port": -math.pi / 2,
            }[bearing]
            dx = foe["x"] - s["a"]["x"]
            dy = foe["y"] - s["a"]["y"]
            dz = foe["z"] - s["a"]["z"]
            yaw = math.atan2(
                math.sin(math.atan2(dy, dx) - s["a"]["yaw"] - by),
                math.cos(math.atan2(dy, dx) - s["a"]["yaw"] - by),
            )
            pitch = math.atan2(dz, math.hypot(dx, dy))
            page.mouse.move(1920 * (0.5 + yaw / 1.25), 1080 * (0.5 - pitch / 0.85))
            if not gunheld:
                page.mouse.down()
                gunheld = True
        elif s["p"]["station"] not in ("pilot", "bombs"):
            if gunheld:
                page.mouse.up()
                gunheld = False
            key("1")
        advance(0.75 if s["a"]["x"] > 300000 and not released and not returning else 1)
    if gunheld:
        page.mouse.up()
    final = page.evaluate(
        "({state:__bomber.sim.snapshot(),errors:game.errors,screen:__bomber.ui.shell.screen})"
    )
    r = final["state"]["result"]
    check(bool(r), "Public input sortie did not terminate")
    check(
        bool(r and r["win"]), "Public input sortie did not destroy primary and recover"
    )
    check(
        final["state"]["bombsDropped"] == 2,
        "Public input release did not drop exactly two bombs",
    )
    check(
        set(final["state"]["encounters"]) == {"nose", "port", "starboard", "tail"},
        "Not all four bearings encountered",
    )
    check(final["state"]["fired"] > 0, "Public input never fired a gun")
    check(final["state"]["cheated"] is False, "Public input run was marked cheated")
    check(
        not final["errors"] and not errs,
        "Browser/native errors: " + str(final["errors"]) + str(errs),
    )
    check(final["screen"] == "results", "Results screen absent")
    page.evaluate("game.advance(.01,{draw:true})")
    page.wait_for_timeout(300)
    page.screenshot(path=str(ROOT / "tests/debrief-public.png"))
    OUT.write_text(
        json.dumps(
            {
                "checks": count,
                "failures": failures,
                "result": r,
                "encounters": final["state"]["encounters"],
                "inputObservedBearings": list(seen),
                "fired": final["state"]["fired"],
                "cheated": final["state"]["cheated"],
                "browserErrors": errs,
                "evasionCount": evasion_count,
                "historyTail": final["state"]["history"][-30:],
            },
            indent=2,
        )
    )
    b.close()
for f in failures:
    print("FAIL public-playthrough: " + f)
print(f"{count - len(failures)}/{count} public-input checks passed")
sys.exit(bool(failures))
